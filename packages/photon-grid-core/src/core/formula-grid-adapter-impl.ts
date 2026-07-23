/**
 * Concrete {@link FormulaGridAdapter} backed by the grid's {@link GridStore} and
 * {@link ColumnModel}. This is the single place that couples the
 * framework-independent formula engine to Photon Grid's data model, honouring
 * the engine's addressing contract: column index follows the canonical column
 * order and row index follows the original (unsorted/unfiltered) `allRows`
 * order, so `A1` is stable across sort/filter/pagination.
 *
 * @packageDocumentation
 */

import type { GridStore } from './grid-store';
import type { ColumnModel } from './column-model';
import type { RowNode } from '../types/row.types';
import type { FormulaGridAdapter } from '../formula/formula-grid-adapter';
import { resolveFieldPath, assignFieldPath } from '../engines/editing/value-accessor';

/**
 * Adapts {@link GridStore}/{@link ColumnModel} to the formula engine's port.
 *
 * A `nodeId → RowNode` index is memoized and rebuilt only when the `allRows`
 * array reference changes (the store always re-sets a fresh reference on
 * mutation), giving O(1) row lookups without stale entries.
 */
export class GridFormulaAdapter implements FormulaGridAdapter {
  private rowIndexCache = new Map<string, number>();
  private cachedAllRows: readonly RowNode[] | null = null;

  constructor(
    private readonly store: GridStore,
    private readonly columnModel: ColumnModel,
  ) {}

  /** Returns the current `allRows`, refreshing the nodeId index if it changed. */
  private allRows(): readonly RowNode[] {
    const rows = this.store.get('allRows') as RowNode[];
    if (rows !== this.cachedAllRows) {
      this.cachedAllRows = rows;
      this.rowIndexCache.clear();
      for (let i = 0; i < rows.length; i++) this.rowIndexCache.set(rows[i].nodeId, i);
    }
    return rows;
  }

  getColumnCount(): number {
    return this.columnModel.getAllColumns().length;
  }

  getRowCount(): number {
    return this.allRows().length;
  }

  getColIdAt(colIndex: number): string | null {
    const cols = this.columnModel.getAllColumns();
    return colIndex >= 0 && colIndex < cols.length ? cols[colIndex].colId : null;
  }

  getNodeIdAt(rowIndex: number): string | null {
    const rows = this.allRows();
    return rowIndex >= 0 && rowIndex < rows.length ? rows[rowIndex].nodeId : null;
  }

  getColIndex(colId: string): number {
    const cols = this.columnModel.getAllColumns();
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].colId === colId) return i;
    }
    return -1;
  }

  getRowIndex(nodeId: string): number {
    this.allRows(); // ensure cache is fresh
    const idx = this.rowIndexCache.get(nodeId);
    return idx === undefined ? -1 : idx;
  }

  getFieldForCol(colId: string): string | null {
    return this.columnModel.getColumn(colId)?.field ?? null;
  }

  readCell(nodeId: string, colId: string): unknown {
    const row = this.findRow(nodeId);
    if (!row) return undefined;
    const field = this.getFieldForCol(colId);
    if (field === null) return undefined;
    return resolveFieldPath(row.data, field);
  }

  writeCell(nodeId: string, colId: string, value: unknown): void {
    const row = this.findRow(nodeId);
    if (!row) return;
    const field = this.getFieldForCol(colId);
    if (field === null) return;
    assignFieldPath(row.data, field, value);
  }

  allowsFormula(colId: string): boolean {
    return this.columnModel.getColumn(colId)?.allowFormula === true;
  }

  private findRow(nodeId: string): RowNode | undefined {
    const rows = this.allRows();
    const idx = this.getRowIndex(nodeId);
    return idx === -1 ? undefined : rows[idx];
  }
}
