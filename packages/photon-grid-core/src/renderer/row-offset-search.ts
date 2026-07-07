import type { RowNode } from '../types/row.types';

/**
 * Binary search (rows are laid out sequentially by `top`) for the row whose
 * `[top, top + height)` span contains `offset`. Shared by `StickyRowTracker`
 * (Master/Detail) and `TreeStickyRowTracker` (Tree Data) — both need the same
 * "which row is the scroll position currently inside" lookup before applying
 * their own sticky-block rules.
 *
 * `loIndex`/`hiIndex` (inclusive) restrict the search to a sub-range —
 * `TreeStickyRowTracker` uses this to search only *within* a resolved
 * ancestor's own subtree when cascading to the next nesting level, so it
 * can never accidentally resolve to a row outside that ancestor.
 *
 * @returns the row's index, or -1 if `offset` is before the first / after the last row in range.
 */
export function findRowAtOffset(
  rows: RowNode[],
  offset: number,
  fallbackHeight: number,
  loIndex = 0,
  hiIndex = rows.length - 1,
): number {
  let lo = loIndex;
  let hi = hiIndex;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const top = rows[mid].top;
    const bottom = top + (rows[mid].height ?? fallbackHeight);
    if (offset < top) hi = mid - 1;
    else if (offset >= bottom) lo = mid + 1;
    else return mid;
  }
  return -1;
}
