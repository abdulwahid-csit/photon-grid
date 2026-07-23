/**
 * Core value & identity types for the Photon Grid Formula Engine.
 *
 * These are the framework-agnostic primitives shared by every formula module
 * (tokenizer, parser, evaluator, dependency graph, calculation engine). They
 * intentionally contain **no** DOM or grid types so the engine stays portable
 * and unit-testable in isolation.
 *
 * @packageDocumentation
 */

import type { FormulaError } from '../error/formula-error';

/**
 * A stable, position-independent identity for a single grid cell used as the
 * key of the dependency graph, the {@link FormulaStore} and every cache.
 *
 * Encoded as `` `${nodeId}::${colId}` `` — built from a {@link RowNode.nodeId}
 * (stable across sort/filter/pagination) and an immutable `colId` (never the
 * mutable column array index). Using a stable id — rather than the positional
 * `A1` address — is what keeps formulas correct when the user sorts, filters,
 * paginates or scrolls (virtualization).
 *
 * @see makeCellId
 * @see splitCellId
 */
export type CellId = string & { readonly __brand: 'FormulaCellId' };

/** Delimiter separating the `nodeId` and `colId` halves of a {@link CellId}. */
export const CELL_ID_DELIMITER = '::';

/**
 * Builds a {@link CellId} from a row `nodeId` and a column `colId`.
 *
 * @param nodeId - Stable row identity (`RowNode.nodeId`).
 * @param colId  - Immutable column identity (`Column.colId`).
 * @returns The composite, branded cell id.
 */
export function makeCellId(nodeId: string, colId: string): CellId {
  return `${nodeId}${CELL_ID_DELIMITER}${colId}` as CellId;
}

/**
 * Splits a {@link CellId} back into its `nodeId` / `colId` halves.
 *
 * Splits on the **first** delimiter only, so a `colId` that itself contains
 * `::` is preserved intact.
 *
 * @param cellId - A cell id produced by {@link makeCellId}.
 * @returns The `{ nodeId, colId }` pair.
 */
export function splitCellId(cellId: CellId): { nodeId: string; colId: string } {
  const idx = cellId.indexOf(CELL_ID_DELIMITER);
  if (idx === -1) return { nodeId: cellId, colId: '' };
  return {
    nodeId: cellId.slice(0, idx),
    colId: cellId.slice(idx + CELL_ID_DELIMITER.length),
  };
}

/**
 * A scalar value a formula can hold or produce.
 *
 * `null` represents an empty/blank cell (distinct from the string `""`).
 * Errors are represented by the {@link FormulaError} value type rather than by
 * throwing, so they propagate through evaluation like any other value.
 */
export type FormulaScalar = number | string | boolean | null;

/**
 * The value of a single evaluated (scalar) expression or cell — a
 * {@link FormulaScalar} or a {@link FormulaError}.
 */
export type FormulaValue = FormulaScalar | FormulaError;

/**
 * The value of a range expression: a dense 2-D matrix in `[row][col]` order.
 * Blank cells are `null`. Functions decide whether/how to flatten it.
 */
export type FormulaMatrix = FormulaValue[][];

/**
 * A single argument passed to a {@link FormulaFunction}: either a scalar value
 * or a matrix produced by a range reference.
 */
export type FormulaArgument = FormulaValue | FormulaMatrix;

/**
 * A serialized formula-cell entry, used by {@link FormulaSerializer} for
 * save/reload. Only the source is persisted; the AST and computed value are
 * always rebuilt on load so stored state can never drift from evaluation.
 */
export interface FormulaStateEntry {
  /** Row identity the formula belongs to. */
  readonly nodeId: string;
  /** Column identity the formula belongs to. */
  readonly colId: string;
  /** The raw formula source, including the leading `=`. */
  readonly source: string;
}

/**
 * The full serializable state of the formula engine — an ordered list of every
 * formula cell. Produced by `getFormulaState()`, consumed by `setFormulaState()`.
 */
export interface FormulaState {
  /** Schema version, to allow forward-compatible migrations. */
  readonly version: 1;
  /** Every formula cell, in insertion order. */
  readonly cells: readonly FormulaStateEntry[];
}
