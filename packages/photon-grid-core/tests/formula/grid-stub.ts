import type { FormulaGridAdapter } from '../../src/formula';

/** A column in the {@link GridStub}: positional identity + data field + opt-in. */
export interface StubColumn {
  readonly colId: string;
  readonly field: string;
  allowFormula?: boolean;
}

/** A row in the {@link GridStub}. */
export interface StubRow {
  readonly nodeId: string;
  readonly data: Record<string, unknown>;
}

/**
 * A faithful in-memory grid adapter for declarative-formula and row-relative
 * tests. Unlike the dense-array `TestAdapter`, it models real columns (with a
 * `field` distinct from `colId` and a per-column `allowFormula` flag) and mutable
 * rows, so field-name references and row insert/remove can be exercised.
 */
export class GridStub implements FormulaGridAdapter {
  writes = 0;

  constructor(
    public cols: StubColumn[],
    public rows: StubRow[],
  ) {}

  getColumnCount(): number {
    return this.cols.length;
  }
  getRowCount(): number {
    return this.rows.length;
  }
  getColIdAt(colIndex: number): string | null {
    return this.cols[colIndex]?.colId ?? null;
  }
  getNodeIdAt(rowIndex: number): string | null {
    return this.rows[rowIndex]?.nodeId ?? null;
  }
  getColIndex(colId: string): number {
    return this.cols.findIndex((c) => c.colId === colId);
  }
  getRowIndex(nodeId: string): number {
    return this.rows.findIndex((r) => r.nodeId === nodeId);
  }
  getFieldForCol(colId: string): string | null {
    return this.cols.find((c) => c.colId === colId)?.field ?? null;
  }
  getColIdForField(field: string): string | null {
    return this.cols.find((c) => c.field === field)?.colId ?? null;
  }
  readCell(nodeId: string, colId: string): unknown {
    const row = this.rows.find((r) => r.nodeId === nodeId);
    const field = this.getFieldForCol(colId);
    if (!row || field === null) return undefined;
    return row.data[field] ?? null;
  }
  writeCell(nodeId: string, colId: string, value: unknown): void {
    this.writes++;
    const row = this.rows.find((r) => r.nodeId === nodeId);
    const field = this.getFieldForCol(colId);
    if (!row || field === null) return;
    row.data[field] = value;
  }
  allowsFormula(colId: string): boolean {
    return this.cols.find((c) => c.colId === colId)?.allowFormula === true;
  }

  // ── Test helpers ────────────────────────────────────────────────────────────

  /** Reads a cell value by data field. */
  cell(nodeId: string, field: string): unknown {
    return this.rows.find((r) => r.nodeId === nodeId)?.data[field] ?? null;
  }
  /** Appends rows (row insertion). */
  addRows(rows: StubRow[]): void {
    this.rows.push(...rows);
  }
  /** Removes rows by nodeId (row removal). */
  removeRows(nodeIds: readonly string[]): void {
    const drop = new Set(nodeIds);
    this.rows = this.rows.filter((r) => !drop.has(r.nodeId));
  }
  /** Marks a column formula-capable (mirrors the grid's `markFormulaCapable`). */
  markFormulaCapable = (colId: string): void => {
    const col = this.cols.find((c) => c.colId === colId);
    if (col) col.allowFormula = true;
  };
}
