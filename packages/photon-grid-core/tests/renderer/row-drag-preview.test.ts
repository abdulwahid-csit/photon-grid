/**
 * Row-drag preview geometry.
 *
 * Every case is cross-checked against a reference implementation that actually
 * splices the array and re-accumulates tops — the O(n) approach this module
 * replaced. The constant-time result must be identical to it, because the drop
 * commit still uses a real splice: any divergence would show up as rows visibly
 * snapping the moment the drag ends.
 */

import { describe, expect, it } from 'vitest';
import {
  type RowMetrics,
  computeRowDragPreview,
  previewTopFor,
} from '../../src/renderer/row-drag-preview';

interface TestRow extends RowMetrics {
  readonly id: string;
}

/** Builds `n` stacked rows; `heights` may vary them individually. */
function makeRows(n: number, heights?: readonly number[]): TestRow[] {
  const rows: TestRow[] = [];
  let top = 0;
  for (let i = 0; i < n; i++) {
    const height = heights?.[i] ?? 40;
    rows.push({ id: `r${i}`, top, height });
    top += height;
  }
  return rows;
}

/**
 * The old splice-and-re-accumulate implementation, kept as the oracle.
 * Returns the post-drop `top` of every row, keyed by id.
 */
function referenceTops(
  rows: readonly TestRow[],
  fromIndex: number,
  targetIndex: number,
  position: 'before' | 'after',
): Map<string, number> {
  const virtual = [...rows];
  const [dragged] = virtual.splice(fromIndex, 1);
  let insertIdx = virtual.findIndex((r) => r.id === rows[targetIndex].id);
  if (position === 'after') insertIdx++;
  virtual.splice(Math.max(0, insertIdx), 0, dragged);

  const tops = new Map<string, number>();
  let top = 0;
  for (const row of virtual) {
    tops.set(row.id, top);
    top += row.height;
  }
  return tops;
}

/** Applies a preview to every row and returns the resulting tops by id. */
function previewTops(
  rows: readonly TestRow[],
  fromIndex: number,
  targetIndex: number,
  position: 'before' | 'after',
): Map<string, number> | null {
  const preview = computeRowDragPreview(
    fromIndex,
    targetIndex,
    position,
    rows.length,
    (i) => rows[i] ?? null,
  );
  if (!preview) return null;

  const tops = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const next = previewTopFor(preview, i, fromIndex, rows[i].top);
    tops.set(rows[i].id, next ?? rows[i].top);
  }
  return tops;
}

describe('computeRowDragPreview', () => {
  it('moves a row down past its neighbours', () => {
    const rows = makeRows(5);
    // Drag r0 to after r2 → order becomes r1, r2, r0, r3, r4.
    const tops = previewTops(rows, 0, 2, 'after')!;
    expect(tops.get('r1')).toBe(0);
    expect(tops.get('r2')).toBe(40);
    expect(tops.get('r0')).toBe(80);
    expect(tops.get('r3')).toBe(120);
    expect(tops.get('r4')).toBe(160);
  });

  it('moves a row up past its neighbours', () => {
    const rows = makeRows(5);
    // Drag r4 to before r1 → order becomes r0, r4, r1, r2, r3.
    const tops = previewTops(rows, 4, 1, 'before')!;
    expect(tops.get('r0')).toBe(0);
    expect(tops.get('r4')).toBe(40);
    expect(tops.get('r1')).toBe(80);
    expect(tops.get('r2')).toBe(120);
    expect(tops.get('r3')).toBe(160);
  });

  it('leaves rows outside the moved span untouched', () => {
    const rows = makeRows(10);
    const preview = computeRowDragPreview(3, 6, 'after', rows.length, (i) => rows[i])!;
    // Only 4..6 shift; 0..2 and 7..9 keep their tops (null = no override).
    for (const i of [0, 1, 2, 7, 8, 9]) {
      expect(previewTopFor(preview, i, 3, rows[i].top)).toBeNull();
    }
    for (const i of [4, 5, 6]) {
      expect(previewTopFor(preview, i, 3, rows[i].top)).toBe(rows[i].top - 40);
    }
  });

  it('handles variable row heights', () => {
    const rows = makeRows(5, [20, 60, 30, 80, 50]);
    const tops = previewTops(rows, 1, 3, 'after')!;
    // r1 (60 tall) moves down past r2 and r3, which each rise by 60.
    expect(tops.get('r0')).toBe(0);
    expect(tops.get('r2')).toBe(20);
    expect(tops.get('r3')).toBe(50);
    expect(tops.get('r1')).toBe(130);
    expect(tops.get('r4')).toBe(190);
  });

  it('returns null for drops that would not change the order', () => {
    const rows = makeRows(5);
    // Onto itself.
    expect(computeRowDragPreview(2, 2, 'before', 5, (i) => rows[i])).toBeNull();
    // Immediately before the next row is where it already is.
    expect(computeRowDragPreview(2, 3, 'before', 5, (i) => rows[i])).toBeNull();
    // Immediately after the previous row, likewise.
    expect(computeRowDragPreview(2, 1, 'after', 5, (i) => rows[i])).toBeNull();
  });

  it('returns null for out-of-range indices and degenerate arrays', () => {
    const rows = makeRows(3);
    expect(computeRowDragPreview(-1, 1, 'before', 3, (i) => rows[i])).toBeNull();
    expect(computeRowDragPreview(0, 5, 'before', 3, (i) => rows[i])).toBeNull();
    expect(computeRowDragPreview(0, 1, 'before', 1, (i) => rows[i])).toBeNull();
  });

  it('returns null when a row it depends on is not loaded', () => {
    // A demand-loading model leaves holes; the preview must decline rather than
    // dereference one.
    const rows = makeRows(5);
    const sparse = (i: number): RowMetrics | null => (i === 3 ? null : rows[i]);
    expect(computeRowDragPreview(0, 3, 'after', 5, sparse)).toBeNull();
    expect(computeRowDragPreview(3, 0, 'before', 5, sparse)).toBeNull();
  });

  it('matches the splice-based reference for every drop in a uniform grid', () => {
    const rows = makeRows(8);
    for (let from = 0; from < rows.length; from++) {
      for (let target = 0; target < rows.length; target++) {
        for (const position of ['before', 'after'] as const) {
          const mine = previewTops(rows, from, target, position);
          if (mine === null) continue; // declared a no-op; reference agrees below
          const reference = referenceTops(rows, from, target, position);
          for (const row of rows) {
            expect(mine.get(row.id)).toBe(reference.get(row.id));
          }
        }
      }
    }
  });

  it('matches the reference for every drop with variable heights', () => {
    const rows = makeRows(7, [30, 55, 40, 25, 70, 45, 60]);
    for (let from = 0; from < rows.length; from++) {
      for (let target = 0; target < rows.length; target++) {
        for (const position of ['before', 'after'] as const) {
          const mine = previewTops(rows, from, target, position);
          if (mine === null) continue;
          const reference = referenceTops(rows, from, target, position);
          for (const row of rows) {
            expect(mine.get(row.id)).toBe(reference.get(row.id));
          }
        }
      }
    }
  });

  it('agrees with the reference that a null preview means no movement', () => {
    const rows = makeRows(6);
    for (let from = 0; from < rows.length; from++) {
      for (let target = 0; target < rows.length; target++) {
        // A row dropped onto itself is not a case the reference models: the
        // splice removes it before the target lookup, so `findIndex` misses and
        // it lands at index 0. Hit-testing never offers the dragged row as a
        // target, so only the preview's own no-op check matters here.
        if (from === target) continue;
        for (const position of ['before', 'after'] as const) {
          if (previewTops(rows, from, target, position) !== null) continue;
          const reference = referenceTops(rows, from, target, position);
          for (const row of rows) {
            expect(reference.get(row.id)).toBe(row.top);
          }
        }
      }
    }
  });

  it('reports the index the dragged row ends up at', () => {
    // `insertIndex` is what ROW_DROP publishes as `toIndex`, so an application
    // persisting the move server-side depends on it being the final position.
    const rows = makeRows(8);
    for (let from = 0; from < rows.length; from++) {
      for (let target = 0; target < rows.length; target++) {
        if (from === target) continue;
        for (const position of ['before', 'after'] as const) {
          const preview = computeRowDragPreview(from, target, position, rows.length, (i) => rows[i]);
          if (!preview) continue;

          const virtual = [...rows];
          const [dragged] = virtual.splice(from, 1);
          let insertIdx = virtual.findIndex((r) => r.id === rows[target].id);
          if (position === 'after') insertIdx++;
          virtual.splice(insertIdx, 0, dragged);

          expect(preview.insertIndex).toBe(virtual.findIndex((r) => r.id === dragged.id));
        }
      }
    }
  });

  it('reads only a constant number of rows regardless of dataset size', () => {
    // The point of the module: a million-row drag must not walk a million rows.
    const rows = makeRows(1_000_000);
    let reads = 0;
    const preview = computeRowDragPreview(10, 800_000, 'after', rows.length, (i) => {
      reads++;
      return rows[i];
    });
    expect(preview).not.toBeNull();
    expect(reads).toBeLessThanOrEqual(2);
  });
});
