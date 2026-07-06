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
export declare function findRowAtOffset(rows: RowNode[], offset: number, fallbackHeight: number, loIndex?: number, hiIndex?: number): number;
//# sourceMappingURL=row-offset-search.d.ts.map