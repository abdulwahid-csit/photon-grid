/**
 * Deterministic evaluation ordering with cycle detection over a *dirty subgraph*.
 *
 * Given the set of formula cells that must recompute and a function yielding, for
 * a cell, the dirty cells that depend on it, this computes a topological order
 * (precedents before dependents) via Kahn's algorithm. Any cells that cannot be
 * ordered are part of — or downstream of — a circular reference and are returned
 * separately so the caller can flag them `#CIRC!` rather than looping forever.
 *
 * Working over only the dirty subgraph (not the whole graph) is what keeps
 * recalculation proportional to the change, not the sheet size.
 *
 * @packageDocumentation
 */

import type { CellId } from '../types/formula.types';

/** The outcome of ordering a dirty subgraph. */
export interface CalculationOrder {
  /** Cells in a safe precedents-first evaluation order (acyclic part). */
  readonly order: CellId[];
  /** Cells that are in, or downstream of, a cycle (could not be ordered). */
  readonly cyclic: Set<CellId>;
}

/**
 * Computes a precedents-first evaluation order for `dirty`.
 *
 * @param dirty            - The set of formula cells to order.
 * @param dependentsInDirty - Yields the members of `dirty` that directly depend
 *                            on the given cell (its out-edges within the subgraph).
 * @returns The acyclic {@link CalculationOrder.order} plus the {@link
 *          CalculationOrder.cyclic} remainder.
 */
export function computeCalculationOrder(
  dirty: ReadonlySet<CellId>,
  dependentsInDirty: (cell: CellId) => Iterable<CellId>,
): CalculationOrder {
  // In-degree = number of dirty precedents each cell is waiting on.
  const indegree = new Map<CellId, number>();
  for (const c of dirty) indegree.set(c, 0);
  for (const c of dirty) {
    for (const d of dependentsInDirty(c)) {
      // Guard: only count edges that stay inside the dirty set.
      if (indegree.has(d)) indegree.set(d, (indegree.get(d) as number) + 1);
    }
  }

  const queue: CellId[] = [];
  for (const [c, deg] of indegree) if (deg === 0) queue.push(c);

  const order: CellId[] = [];
  let head = 0;
  while (head < queue.length) {
    const c = queue[head++];
    order.push(c);
    for (const d of dependentsInDirty(c)) {
      const deg = indegree.get(d);
      if (deg === undefined) continue;
      const next = deg - 1;
      indegree.set(d, next);
      if (next === 0) queue.push(d);
    }
  }

  // Anything not emitted is stuck behind a cycle.
  let cyclic: Set<CellId>;
  if (order.length === dirty.size) {
    cyclic = new Set<CellId>();
  } else {
    const ordered = new Set(order);
    cyclic = new Set<CellId>();
    for (const c of dirty) if (!ordered.has(c)) cyclic.add(c);
  }
  return { order, cyclic };
}
