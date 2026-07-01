import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type { GroupTree } from '../grouping/group-node';
import type { AggFunc } from '../../types/column.types';
import { resolveField } from '../grouping/group-node';

// ─── Internal types ───────────────────────────────────────────────────────────

/**
 * Running totals collected bottom-up through a subtree.
 *
 * Storing raw `sum` and `count` separately allows correct weighted-average
 * propagation across nested group levels without re-scanning leaf rows.
 */
interface AggAccumulator {
  sum: number;
  /** Count of leaf rows that contributed a finite numeric value. */
  count: number;
  min: number;
  max: number;
}

/** Narrowed `ColumnDef` guaranteed to have a non-null `aggFunc`. */
type AggColumn = ColumnDef & { aggFunc: AggFunc };

// ─── AggregationEngine ───────────────────────────────────────────────────────

/**
 * Stateless service that computes group-level aggregations in a bottom-up pass
 * over a {@link GroupTree} produced by {@link GroupingEngine}.
 *
 * ### Eligibility
 * Only columns whose {@link ColumnDef.type} is `'currency'` or `'number'` **and** that have
 * {@link ColumnDef.aggFunc} set are processed.  All other columns are skipped,
 * keeping the total work proportional to `(leaf rows) × (agg-eligible columns)`.
 *
 * ### Supported functions
 * | `aggFunc` | Description |
 * |-----------|-------------|
 * | `sum`     | Sum of all leaf values |
 * | `avg`     | True weighted average across all leaf rows |
 * | `min`     | Minimum leaf value |
 * | `max`     | Maximum leaf value |
 * | `count`   | Count of leaf rows with a finite value |
 *
 * ### Usage
 * ```ts
 * const engine = new AggregationEngine();
 * // Called once per pipeline run, before flattenGroupTree:
 * engine.compute(groupTree, allColumns);
 * // Every GroupTree node now has aggregatedValues populated.
 * ```
 */
export class AggregationEngine {
  /**
   * Walk the entire group tree bottom-up and write `aggregatedValues` onto
   * every node.
   *
   * - **Leaf groups** aggregate directly from their raw {@link RowNode} data.
   * - **Interior groups** combine the pre-computed child accumulators, so
   *   averages are correctly weighted and leaf rows are never double-counted.
   *
   * @param tree    - Top-level nodes from `GroupingEngine.buildGroupTree`.
   * @param columns - Full column set; filtered internally to agg-eligible cols.
   */
  compute(tree: GroupTree[], columns: ColumnDef[]): void {
    const aggCols = columns.filter(
      (c): c is AggColumn =>
        (c.type === 'currency' || c.type === 'number') && c.aggFunc != null,
    );
    if (aggCols.length === 0) return;

    for (const group of tree) {
      this.walkGroup(group, aggCols);
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /**
   * Recursively process `group` and return its raw {@link AggAccumulator}s so
   * the parent can combine them without re-scanning leaf rows.
   */
  private walkGroup(
    group: GroupTree,
    aggCols: AggColumn[],
  ): Record<string, AggAccumulator> {
    let accs: Record<string, AggAccumulator>;

    if (group.children.length > 0) {
      const childAccs = group.children.map((child) => this.walkGroup(child, aggCols));
      accs = this.mergeAccumulators(childAccs, aggCols);
    } else {
      accs = this.buildAccumulatorsFromRows(group.rows, aggCols);
    }

    group.aggregatedValues = this.deriveDisplayValues(accs, aggCols);
    return accs;
  }

  /**
   * Scan a flat array of leaf {@link RowNode}s and build one
   * {@link AggAccumulator} per agg-eligible column.
   *
   * Non-numeric values and `NaN`/`Infinity` are silently skipped; they do
   * not increment `count`, ensuring averages remain correct.
   */
  private buildAccumulatorsFromRows(
    rows: RowNode[],
    aggCols: AggColumn[],
  ): Record<string, AggAccumulator> {
    const result: Record<string, AggAccumulator> = {};
    for (const col of aggCols) {
      const acc: AggAccumulator = { sum: 0, count: 0, min: Infinity, max: -Infinity };
      for (const row of rows) {
        const raw = resolveField(row.data, col.field);
        const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
        if (!isFinite(n)) continue;
        acc.sum += n;
        acc.count++;
        if (n < acc.min) acc.min = n;
        if (n > acc.max) acc.max = n;
      }
      result[col.field] = acc;
    }
    return result;
  }

  /**
   * Combine child {@link AggAccumulator}s into a single accumulator for the
   * parent group.  Children with zero count are skipped.
   */
  private mergeAccumulators(
    childAccs: Array<Record<string, AggAccumulator>>,
    aggCols: AggColumn[],
  ): Record<string, AggAccumulator> {
    const result: Record<string, AggAccumulator> = {};
    for (const col of aggCols) {
      const acc: AggAccumulator = { sum: 0, count: 0, min: Infinity, max: -Infinity };
      for (const child of childAccs) {
        const c = child[col.field];
        if (!c || c.count === 0) continue;
        acc.sum += c.sum;
        acc.count += c.count;
        if (c.min < acc.min) acc.min = c.min;
        if (c.max > acc.max) acc.max = c.max;
      }
      result[col.field] = acc;
    }
    return result;
  }

  /**
   * Convert raw {@link AggAccumulator}s into the final display values keyed by
   * `colDef.field`.  Groups with `count === 0` get `null` for that field.
   */
  private deriveDisplayValues(
    accs: Record<string, AggAccumulator>,
    aggCols: AggColumn[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const col of aggCols) {
      const acc = accs[col.field];
      if (!acc || acc.count === 0) {
        result[col.field] = null;
        continue;
      }
      switch (col.aggFunc) {
        case 'sum':
          result[col.field] = acc.sum;
          break;
        case 'avg':
          result[col.field] = acc.sum / acc.count;
          break;
        case 'min':
          result[col.field] = isFinite(acc.min) ? acc.min : null;
          break;
        case 'max':
          result[col.field] = isFinite(acc.max) ? acc.max : null;
          break;
        case 'count':
          result[col.field] = acc.count;
          break;
      }
    }
    return result;
  }
}
