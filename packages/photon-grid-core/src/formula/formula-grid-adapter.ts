/**
 * The port (in the hexagonal-architecture sense) through which the formula
 * engine reads and writes grid state **without** depending on any concrete grid,
 * DOM or framework type.
 *
 * `GridCore` provides the concrete implementation (backed by `GridStore`,
 * `ColumnModel` and `RowModel`); unit tests provide a trivial in-memory stub.
 * This is what keeps the engine framework-independent and testable in isolation,
 * per Photon Core's architecture rules.
 *
 * ### Addressing contract
 * All indices are **positional against the data model** — column index follows
 * `ColumnModel`'s canonical order and row index follows the original
 * (unsorted/unfiltered) `allRows` order — so `A1` maps to the first column of
 * the first data row regardless of the current sort/filter/scroll state.
 *
 * @packageDocumentation
 */

/**
 * Read/write access to the grid's cell values and its column/row coordinate
 * spaces, expressed only in primitives.
 */
export interface FormulaGridAdapter {
  /** @returns The number of columns in canonical order. */
  getColumnCount(): number;

  /** @returns The number of rows in data-model order. */
  getRowCount(): number;

  /**
   * @param colIndex - Zero-based canonical column index.
   * @returns The immutable `colId` at that position, or `null` if out of range.
   */
  getColIdAt(colIndex: number): string | null;

  /**
   * @param rowIndex - Zero-based data-model row index.
   * @returns The stable `nodeId` at that position, or `null` if out of range.
   */
  getNodeIdAt(rowIndex: number): string | null;

  /**
   * @param colId - Immutable column identity.
   * @returns The canonical column index, or `-1` if unknown.
   */
  getColIndex(colId: string): number;

  /**
   * @param nodeId - Stable row identity.
   * @returns The data-model row index, or `-1` if unknown.
   */
  getRowIndex(nodeId: string): number;

  /**
   * @param colId - Immutable column identity.
   * @returns The column's data `field`, or `null` if unknown.
   */
  getFieldForCol(colId: string): string | null;

  /**
   * Reads a cell's current stored value from the row data (the computed value
   * for a formula cell, or the literal value otherwise).
   *
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @returns The raw value, or `undefined` when absent.
   */
  readCell(nodeId: string, colId: string): unknown;

  /**
   * Writes a computed value back into the row data so every downstream feature
   * (render/sort/filter/export/aggregation) observes it.
   *
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @param value  - The computed value to store.
   */
  writeCell(nodeId: string, colId: string, value: unknown): void;

  /**
   * @param colId - Immutable column identity.
   * @returns `true` when the column opted in to formulas (`colDef.allowFormula`).
   */
  allowsFormula(colId: string): boolean;
}
