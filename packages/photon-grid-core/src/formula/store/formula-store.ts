/**
 * In-memory store of every formula cell, keyed by stable {@link CellId}.
 *
 * It is the single source of truth for "which cells hold a formula, and what did
 * each last evaluate to". The dependency graph, calculation engine and
 * serializer all read/write through it. It holds only data — no evaluation or
 * grid logic — so it stays trivially testable.
 *
 * @packageDocumentation
 */

import type { CellId, FormulaValue, FormulaState } from '../types/formula.types';
import { makeCellId, splitCellId } from '../types/formula.types';
import type { AstNode } from '../parser/ast.types';
import type { Reference } from '../reference/reference.types';
import type { FormulaError } from '../error/formula-error';

/**
 * A single formula-bearing cell: its source, parsed AST, last computed value,
 * error state, and the references it depends on (resolved at parse time).
 */
export interface FormulaCell {
  /** Stable composite identity (`nodeId::colId`). */
  readonly cellId: CellId;
  /** Row identity. */
  readonly nodeId: string;
  /** Column identity. */
  readonly colId: string;
  /** Raw formula source including the leading `=`. */
  source: string;
  /** Parsed AST, or `null` if the source failed to parse. */
  ast: AstNode | null;
  /** Last computed value (`null` before first evaluation). */
  value: FormulaValue;
  /** Current error, or `null` when the cell evaluated cleanly. */
  error: FormulaError | null;
  /** Positional references the formula reads (its direct precedents). */
  references: readonly Reference[];
  /** `true` when the formula uses a volatile function (always recomputed). */
  volatile: boolean;
}

/**
 * Map-backed collection of {@link FormulaCell}s.
 */
export class FormulaStore {
  private readonly cells = new Map<CellId, FormulaCell>();

  /**
   * Inserts or replaces a formula cell.
   *
   * @param cell - The cell record to store.
   */
  set(cell: FormulaCell): void {
    this.cells.set(cell.cellId, cell);
  }

  /**
   * @param cellId - Composite cell identity.
   * @returns The stored cell, or `undefined`.
   */
  get(cellId: CellId): FormulaCell | undefined {
    return this.cells.get(cellId);
  }

  /**
   * @param nodeId - Row identity.
   * @param colId  - Column identity.
   * @returns The stored cell, or `undefined`.
   */
  getAt(nodeId: string, colId: string): FormulaCell | undefined {
    return this.cells.get(makeCellId(nodeId, colId));
  }

  /**
   * @param cellId - Composite cell identity.
   * @returns `true` when a formula is stored for this cell.
   */
  has(cellId: CellId): boolean {
    return this.cells.has(cellId);
  }

  /**
   * Removes a formula cell.
   *
   * @param cellId - Composite cell identity.
   * @returns `true` if a cell was removed.
   */
  delete(cellId: CellId): boolean {
    return this.cells.delete(cellId);
  }

  /** Removes every formula cell. */
  clear(): void {
    this.cells.clear();
  }

  /** @returns The number of formula cells. */
  get size(): number {
    return this.cells.size;
  }

  /** @returns An iterator over every stored cell. */
  values(): IterableIterator<FormulaCell> {
    return this.cells.values();
  }

  /** @returns An iterator over every stored {@link CellId}. */
  keys(): IterableIterator<CellId> {
    return this.cells.keys();
  }

  /**
   * Serializes the store to a plain, persistable {@link FormulaState}. Only the
   * source of each cell is captured — ASTs/values are rebuilt on load.
   *
   * @returns The serializable state snapshot.
   */
  toState(): FormulaState {
    const cells = [] as Array<{ nodeId: string; colId: string; source: string }>;
    for (const cell of this.cells.values()) {
      cells.push({ nodeId: cell.nodeId, colId: cell.colId, source: cell.source });
    }
    return { version: 1, cells };
  }

  /**
   * Convenience helper to split a stored {@link CellId} into its parts.
   *
   * @param cellId - Composite cell identity.
   */
  static parseId(cellId: CellId): { nodeId: string; colId: string } {
    return splitCellId(cellId);
  }
}
