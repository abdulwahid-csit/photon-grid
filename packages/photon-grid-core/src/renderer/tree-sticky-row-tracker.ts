import type { RowNode } from '../types/row.types';
import { findRowAtOffset } from './row-offset-search';

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
 * Binary search `children` (a `RowNode`'s direct children, in on-screen
 * order) for the one whose **subtree** — `[top, subtreeEndTop)`, not just
 * its own single row — contains `offset`.
 *
 * This is the piece that makes a branch row's own stickiness stable while
 * scrolling through *its* descendants: searching by each child's own row
 * height alone (like `findRowAtOffset` does, correctly, for "which literal
 * row is at this pixel") would stop matching a branch child the instant
 * `offset` moves past its single row into its grandchildren — "seeing
 * through" it to a grandchild and treating that grandchild as if it were
 * the next level's occupant. Matching by subtree extent instead means the
 * branch child stays "found" for its entire subtree's lifetime, exactly
 * mirroring how long its own sticky row should stay in that slot.
 */
function findChildAtOffset(children: readonly RowNode[], offset: number, fallbackHeight: number): RowNode | null {
  let lo = 0;
  let hi = children.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const child = children[mid];
    const end = child.subtreeEndTop ?? child.top + (child.height ?? fallbackHeight);
    if (offset < child.top) hi = mid - 1;
    else if (offset >= end) lo = mid + 1;
    else return child;
  }
  return null;
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
export class TreeStickyRowTracker {
  compute(rows: RowNode[], scrollTop: number, rowHeight: number, windowStart: number): TreeStickyResult {
    const none: TreeStickyResult = { entries: [], minStart: windowStart };
    if (rows.length === 0) return none;

    const idx = findRowAtOffset(rows, scrollTop, rowHeight);
    if (idx < 0) return none;

    // Rule 1: seed level 0 from the true root ancestor, never from a direct
    // re-search — see the class doc for why a direct search breaks once
    // scrollTop passes the root's own row height.
    let candidate: RowNode = rows[idx];
    while (candidate.parent) candidate = candidate.parent;
    if (!(candidate.hasChildren || candidate.children.length > 0)) return none;

    let minStart = windowStart;
    let stackedTop = 0;
    const entries: TreeStickyEntry[] = [];

    for (;;) {
      const effectiveOffset = scrollTop + stackedTop;
      const height = candidate.height ?? rowHeight;
      const subtreeEnd = candidate.subtreeEndTop ?? Infinity;
      const offsetPx = Math.max(-height, Math.min(0, subtreeEnd - effectiveOffset - height));
      entries.push({ nodeId: candidate.nodeId, top: stackedTop + offsetPx });
      minStart = Math.min(minStart, candidate.rowIndex);

      if (effectiveOffset >= subtreeEnd) break; // exhausted this level's subtree — nothing deeper to cascade into

      // Rules 2 + 3: descend into `candidate`'s own children (not a fresh
      // whole-array search) at the next level's effective offset.
      stackedTop += height;
      const child = findChildAtOffset(candidate.children, scrollTop + stackedTop, rowHeight);
      if (!child) break;
      if (!(child.hasChildren || child.children.length > 0)) break; // leaf: no sticky slot here or deeper
      candidate = child;
    }

    return { entries, minStart };
  }
}
