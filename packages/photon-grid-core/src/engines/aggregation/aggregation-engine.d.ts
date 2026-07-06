import type { ColumnDef } from '../../types/column.types';
import type { GroupTree } from '../grouping/group-node';
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
export declare class AggregationEngine {
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
    compute(tree: GroupTree[], columns: ColumnDef[]): void;
    /**
     * Recursively process `group` and return its raw {@link AggAccumulator}s so
     * the parent can combine them without re-scanning leaf rows.
     */
    private walkGroup;
    /**
     * Scan a flat array of leaf {@link RowNode}s and build one
     * {@link AggAccumulator} per agg-eligible column.
     *
     * Non-numeric values and `NaN`/`Infinity` are silently skipped; they do
     * not increment `count`, ensuring averages remain correct.
     */
    private buildAccumulatorsFromRows;
    /**
     * Combine child {@link AggAccumulator}s into a single accumulator for the
     * parent group.  Children with zero count are skipped.
     */
    private mergeAccumulators;
    /**
     * Convert raw {@link AggAccumulator}s into the final display values keyed by
     * `colDef.field`.  Groups with `count === 0` get `null` for that field.
     */
    private deriveDisplayValues;
}
//# sourceMappingURL=aggregation-engine.d.ts.map