/**
 * The directed dependency graph: which formula cells depend on which cells, so a
 * change recomputes only the affected subgraph rather than the whole grid.
 *
 * ### Two kinds of precedent, one reverse lookup
 * - **Single-cell precedents** (`=A1+B1`) are indexed by an exact reverse map
 *   `precedent → dependents`, giving O(1) dependent lookup.
 * - **Range precedents** (`=SUM(A1:A9)`, `=SUM(A:A)`) are stored as rectangular
 *   regions, *not* expanded per cell — so a whole-column dependency costs O(1)
 *   memory instead of O(rowCount). A changed cell tests region containment.
 *
 * This keeps the graph scalable to hundreds of thousands of formulas and
 * whole-column ranges without materializing millions of edges.
 *
 * @packageDocumentation
 */

import type { CellId } from '../types/formula.types';

/**
 * A rectangular precedent region for a range reference. `colEnd`/`rowEnd` are
 * `Number.POSITIVE_INFINITY` for open-ended whole-row/whole-column ranges.
 */
export interface RangeDependency {
  /** The formula cell that depends on this region. */
  readonly dependent: CellId;
  /** Inclusive positional column bounds. */
  readonly colStart: number;
  readonly colEnd: number;
  /** Inclusive positional row bounds. */
  readonly rowStart: number;
  readonly rowEnd: number;
}

/** A formula's forward dependencies, retained so they can be cleanly removed. */
interface ForwardDeps {
  readonly cells: readonly CellId[];
  readonly ranges: readonly RangeDependency[];
}

export class DependencyGraph {
  /** dependent → its precedents (for cleanup on re-set/removal). */
  private readonly forward = new Map<CellId, ForwardDeps>();
  /** precedent cell → set of dependents (single-cell reverse index). */
  private readonly cellReverse = new Map<CellId, Set<CellId>>();
  /** All range-precedent regions, scanned on change (bucketing is a Phase 6 optimization). */
  private rangeDeps: RangeDependency[] = [];

  /**
   * Replaces the dependencies of `dependent`, updating both reverse indexes.
   *
   * @param dependent - The formula cell whose precedents are being (re)declared.
   * @param cells     - Its discrete single-cell precedents.
   * @param ranges    - Its rectangular range precedents.
   */
  setDependencies(dependent: CellId, cells: readonly CellId[], ranges: readonly RangeDependency[]): void {
    this.clearDependencies(dependent);
    this.forward.set(dependent, { cells, ranges });

    for (let i = 0; i < cells.length; i++) {
      let set = this.cellReverse.get(cells[i]);
      if (!set) {
        set = new Set<CellId>();
        this.cellReverse.set(cells[i], set);
      }
      set.add(dependent);
    }
    for (let i = 0; i < ranges.length; i++) this.rangeDeps.push(ranges[i]);
  }

  /**
   * Removes every dependency edge owned by `dependent`.
   *
   * @param dependent - The formula cell to detach.
   */
  clearDependencies(dependent: CellId): void {
    const fwd = this.forward.get(dependent);
    if (!fwd) return;

    for (let i = 0; i < fwd.cells.length; i++) {
      const set = this.cellReverse.get(fwd.cells[i]);
      if (set) {
        set.delete(dependent);
        if (set.size === 0) this.cellReverse.delete(fwd.cells[i]);
      }
    }
    if (fwd.ranges.length > 0) {
      this.rangeDeps = this.rangeDeps.filter((r) => r.dependent !== dependent);
    }
    this.forward.delete(dependent);
  }

  /**
   * Adds every formula cell that directly depends on the changed cell into
   * `out`.
   *
   * @param changedCellId - Stable id of the cell that changed.
   * @param colIndex      - Positional column index of the changed cell.
   * @param rowIndex      - Positional row index of the changed cell.
   * @param out           - Destination set (dependents are added, not replaced).
   */
  collectDependents(changedCellId: CellId, colIndex: number, rowIndex: number, out: Set<CellId>): void {
    const direct = this.cellReverse.get(changedCellId);
    if (direct) {
      for (const d of direct) out.add(d);
    }
    if (colIndex >= 0 && rowIndex >= 0) {
      for (let i = 0; i < this.rangeDeps.length; i++) {
        const r = this.rangeDeps[i];
        if (colIndex >= r.colStart && colIndex <= r.colEnd && rowIndex >= r.rowStart && rowIndex <= r.rowEnd) {
          out.add(r.dependent);
        }
      }
    }
  }

  /** @returns `true` when any formula cell is tracked. */
  get hasDependencies(): boolean {
    return this.forward.size > 0;
  }

  /** @returns The number of formula cells with tracked dependencies. */
  get size(): number {
    return this.forward.size;
  }

  /** Removes every edge in the graph. */
  clear(): void {
    this.forward.clear();
    this.cellReverse.clear();
    this.rangeDeps = [];
  }
}
