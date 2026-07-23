/**
 * Resolves parsed, positional {@link Reference}s against the live grid (via the
 * {@link FormulaGridAdapter}) into:
 *
 * 1. **Values** — {@link resolveCell}/{@link resolveRange} back the evaluator's
 *    {@link EvalContext}, reading the grid's current cell values.
 * 2. **Dependencies** — {@link resolveDependencies} turns a formula's references
 *    into stable {@link CellId} precedents and rectangular {@link RangeDependency}
 *    regions for the {@link DependencyGraph}.
 *
 * Positional (`A1`) coordinates are data-model indices (see the adapter's
 * addressing contract), so they are stable across sort/filter/scroll; the
 * adapter maps them to stable `nodeId`/`colId` identities here.
 *
 * @packageDocumentation
 */

import type { FormulaGridAdapter } from '../formula-grid-adapter';
import type { CellId, FormulaValue, FormulaMatrix } from '../types/formula.types';
import { makeCellId } from '../types/formula.types';
import type { CellRef, RangeRef, Reference } from './reference.types';
import { isRangeRef, } from './reference.types';
import { parseCellRef } from './cell-reference';
import { FormulaError, isFormulaError } from '../error/formula-error';
import type { RangeDependency } from '../graph/dependency-graph';

const DAY_MS = 86_400_000;
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

/** The resolved precedents of a single formula: discrete cells plus range regions. */
export interface ResolvedDependencies {
  /** Stable ids of every single-cell precedent. */
  readonly cells: CellId[];
  /** Rectangular precedent regions (for range references). */
  readonly ranges: RangeDependency[];
}

/**
 * Coerces an arbitrary grid-stored value into a {@link FormulaValue}.
 *
 * Numbers/strings/booleans pass through; `null`/`undefined` become blank
 * (`null`); `Date`s become Excel serial numbers; existing {@link FormulaError}s
 * propagate; anything else is stringified.
 *
 * @param v - The raw stored cell value.
 * @returns The normalized formula value.
 */
export function coerceGridValue(v: unknown): FormulaValue {
  if (v === null || v === undefined) return null;
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v as number) ? (v as number) : FormulaError.num();
  if (t === 'string') return v as string;
  if (t === 'boolean') return v as boolean;
  if (isFormulaError(v)) return v;
  if (v instanceof Date) return (v.getTime() - EXCEL_EPOCH_MS) / DAY_MS;
  return String(v);
}

/**
 * Resolver bound to one grid adapter. Stateless beyond the adapter reference, so
 * a single instance serves the whole engine.
 */
export class ReferenceResolver {
  constructor(private readonly adapter: FormulaGridAdapter) {}

  /**
   * Resolves a single-cell reference to its current value, or `#REF!` when it
   * falls outside the live data bounds.
   */
  resolveCell = (ref: CellRef): FormulaValue => {
    const nodeId = this.adapter.getNodeIdAt(ref.rowIndex);
    const colId = this.adapter.getColIdAt(ref.colIndex);
    if (nodeId === null || colId === null) return FormulaError.ref();
    return coerceGridValue(this.adapter.readCell(nodeId, colId));
  };

  /**
   * Resolves a range reference to a dense `[row][col]` matrix, clamping
   * whole-column/row ranges to the current data bounds.
   */
  resolveRange = (ref: RangeRef): FormulaMatrix => {
    const rowCount = this.adapter.getRowCount();
    const colCount = this.adapter.getColumnCount();

    const rowStart = ref.wholeColumn ? 0 : Math.min(ref.start.rowIndex, ref.end.rowIndex);
    const rowEnd = ref.wholeColumn ? rowCount - 1 : Math.max(ref.start.rowIndex, ref.end.rowIndex);
    const colStart = ref.wholeRow ? 0 : Math.min(ref.start.colIndex, ref.end.colIndex);
    const colEnd = ref.wholeRow ? colCount - 1 : Math.max(ref.start.colIndex, ref.end.colIndex);

    const out: FormulaMatrix = [];
    for (let r = rowStart; r <= rowEnd; r++) {
      const row: FormulaValue[] = [];
      const nodeId = this.adapter.getNodeIdAt(r);
      for (let c = colStart; c <= colEnd; c++) {
        const colId = this.adapter.getColIdAt(c);
        row.push(nodeId === null || colId === null ? FormulaError.ref() : coerceGridValue(this.adapter.readCell(nodeId, colId)));
      }
      out.push(row);
    }
    return out;
  };

  /**
   * Resolves a named range/cell string (e.g. `"B2"`, `"A1:C3"`, `"A:A"`) to a
   * {@link Reference}, or `null` when unparseable.
   *
   * @param a1 - The A1-notation target the name points at.
   */
  parseNamedTarget(a1: string): Reference | null {
    const colon = a1.indexOf(':');
    if (colon === -1) return parseCellRef(a1.trim());
    const start = parseCellRef(a1.slice(0, colon).trim());
    const end = parseCellRef(a1.slice(colon + 1).trim());
    if (!start || !end) return null;
    return { start, end, wholeColumn: false, wholeRow: false };
  }

  /**
   * Converts a formula's references into dependency-graph inputs: discrete
   * precedent {@link CellId}s and rectangular {@link RangeDependency} regions.
   *
   * @param dependent - The stable id of the formula cell owning these references.
   * @param refs      - The references extracted from its AST.
   */
  resolveDependencies(dependent: CellId, refs: readonly Reference[]): ResolvedDependencies {
    const cells: CellId[] = [];
    const ranges: RangeDependency[] = [];
    const rowCount = this.adapter.getRowCount();
    const colCount = this.adapter.getColumnCount();

    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      if (isRangeRef(ref)) {
        const rowStart = ref.wholeColumn ? 0 : Math.min(ref.start.rowIndex, ref.end.rowIndex);
        const rowEnd = ref.wholeColumn ? Number.POSITIVE_INFINITY : Math.max(ref.start.rowIndex, ref.end.rowIndex);
        const colStart = ref.wholeRow ? 0 : Math.min(ref.start.colIndex, ref.end.colIndex);
        const colEnd = ref.wholeRow ? Number.POSITIVE_INFINITY : Math.max(ref.start.colIndex, ref.end.colIndex);
        ranges.push({ dependent, colStart, colEnd, rowStart, rowEnd });
      } else {
        // Single cell: record a stable precedent id when it is in bounds.
        if (ref.rowIndex < 0 || ref.rowIndex >= rowCount || ref.colIndex < 0 || ref.colIndex >= colCount) continue;
        const nodeId = this.adapter.getNodeIdAt(ref.rowIndex);
        const colId = this.adapter.getColIdAt(ref.colIndex);
        if (nodeId !== null && colId !== null) cells.push(makeCellId(nodeId, colId));
      }
    }
    return { cells, ranges };
  }
}
