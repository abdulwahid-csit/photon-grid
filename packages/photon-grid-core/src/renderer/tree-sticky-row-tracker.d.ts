import type { RowNode } from '../types/row.types';
/** One ancestor row pinned to the viewport's top, stacked below any shallower ancestor also currently stuck. */
export interface TreeStickyEntry {
    nodeId: string;
    /** Pixel `top` to apply within the sticky layer — a stacked position, already including this level's own push-off offset. */
    top: number;
}
export interface TreeStickyResult {
    entries: TreeStickyEntry[];
    /** The virtualization window's `start` index, widened so every sticky ancestor's cells stay rendered even though virtualization would otherwise have scrolled past them. */
    minStart: number;
}
/**
 * Computes Tree Data's sticky-ancestor-row state for the current scroll
 * position — the generalization of `StickyRowTracker`'s single Master/Detail
 * sticky row to a *stack* of simultaneously-stuck rows, one per nesting
 * level currently active at the top of the viewport.
 *
 * Three things have to all be true, and no one alone is sufficient:
 *
 * 1. **Level 0 must be found by walking up to the true root ancestor, not by
 *    re-searching `scrollTop` against the whole array.** Once `scrollTop`
 *    scrolls past the root row's own height, a raw "which row is at
 *    `scrollTop`" search stops finding the root at all — it finds whatever
 *    descendant is genuinely there — which would wrongly treat that
 *    descendant as a *new* level-0 occupant and drop the real root, even
 *    though the root's own subtree is nowhere near ending.
 * 2. **Every level below 0 must be found via an *effective* offset of
 *    `scrollTop + stackedTop`** (the stack height already committed by
 *    shallower levels), not the level's own raw `top` — otherwise a deeper
 *    level only joins the stack once `scrollTop` has passed its *entire*
 *    height into a further descendant, leaving a window where it's
 *    scrolling normally (clipping behind the already-stuck levels above it)
 *    before "popping" into its slot instead of pinning immediately.
 * 3. **Cascading to the next level must search within the current
 *    candidate's own `children`, matched by subtree extent (see
 *    `findChildAtOffset`) — never a fresh `findRowAtOffset` over the whole
 *    row array.** A whole-array search matches by each row's own single
 *    height, so it "sees through" a still-active branch child into one of
 *    *its* descendants the moment the effective offset passes that child's
 *    own row — misidentifying a grandchild as the next level's occupant (or
 *    finding a non-branch grandchild and aborting the cascade entirely) and
 *    making the branch child's sticky row disappear outright instead of
 *    sliding smoothly through its own push-off zone.
 *
 * So: find the row genuinely at `scrollTop`, walk it up to its root (rule 1)
 * to seed level 0, then cascade downward by descending into each level's own
 * `children` using effective offsets (rules 2 and 3).
 *
 * The push-off math per level is identical to `StickyRowTracker`'s (slide up
 * as the level's own subtree end approaches, handing off to whatever comes
 * next), lower-bounded at `-height` so a deeper level's push-off can never
 * overshoot into the slot of the shallower level stacked above it.
 *
 * Depends on `RowNode.subtreeEndTop` (set by
 * `TreeDataService.annotateSubtreeExtents` after layout) and `RowNode.top`/
 * `height`/`rowIndex` (set by `RowModel`'s normal layout pass).
 */
export declare class TreeStickyRowTracker {
    compute(rows: RowNode[], scrollTop: number, rowHeight: number, windowStart: number): TreeStickyResult;
}
//# sourceMappingURL=tree-sticky-row-tracker.d.ts.map