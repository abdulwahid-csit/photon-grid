import type { RowNode } from '../types/row.types';

/** Result of a single `StickyRowTracker.compute` call. */
export interface StickyRowResult {
  /** `nodeId` of the master row that should render pinned at the panel's top, or `null` when nothing is sticky. */
  nodeId: string | null;
  /** Pixel offset (always `<= 0`) to apply as the sticky row's `top` — `0` while fully pinned, negative while being pushed off-screen by the next block taking over. */
  offsetPx: number;
  /** The virtualization window's `start` index, widened if needed so the sticky row's cells stay rendered even though it has scrolled past its natural position. */
  minStart: number;
}

/**
 * Computes Master/Detail sticky-row state for one grid instance's current
 * scroll position — the sole responsibility of this class, kept separate
 * from `GridRenderer` so the sticky math is independently readable/testable
 * and easy to extend (e.g. sticky group headers could reuse the same shape).
 *
 * A row R (`type: 'data'`, expanded, with an immediately-following `'detail'`
 * row D) defines a "block" spanning `[R.top, D.top + D.height)`. Whenever the
 * current `scrollTop` falls inside that range — including while merely
 * scrolling through R's own height, before D even starts — R should render
 * pinned at the viewport's top instead of scrolling normally.
 *
 * The returned `offsetPx` implements the classic "push-off" handoff used by
 * native `position: sticky` with sequential sticky siblings: it stays `0`
 * (fully pinned) until the block's end approaches, then slides negative so R
 * appears to be covered/pushed away by the next row arriving from below,
 * reaching exactly `-R.height` right as the block ends and control passes to
 * whatever comes next — rather than R abruptly vanishing.
 */
export class StickyRowTracker {
  compute(rows: RowNode[], scrollTop: number, rowHeight: number, windowStart: number): StickyRowResult {
    const none: StickyRowResult = { nodeId: null, offsetPx: 0, minStart: windowStart };
    if (rows.length === 0) return none;

    const idx = this.findRowAtOffset(rows, scrollTop, rowHeight);
    if (idx < 0) return none;

    const masterIdx = this.resolveMasterIndex(rows, idx);
    if (masterIdx < 0) return none;

    const master = rows[masterIdx];
    const detail = rows[masterIdx + 1];
    if (!detail || detail.type !== 'detail') return none;

    const masterHeight = master.height ?? rowHeight;
    const blockBottom = detail.top + (detail.height ?? rowHeight);
    const offsetPx = Math.min(0, blockBottom - scrollTop - masterHeight);

    return {
      nodeId: master.nodeId,
      offsetPx,
      minStart: Math.min(windowStart, masterIdx),
    };
  }

  /**
   * Given the row whose span contains `scrollTop`, resolves the index of the
   * "master" row that should be sticky — itself if it's an expanded master
   * still within its own height, or its parent if it's the detail row.
   * Returns -1 when the row at `idx` isn't part of a master/detail block.
   */
  private resolveMasterIndex(rows: RowNode[], idx: number): number {
    const row = rows[idx];
    if (row.type === 'detail') {
      const parentIdx = idx - 1;
      return rows[parentIdx]?.type === 'data' ? parentIdx : -1;
    }
    if (row.type === 'data' && rows[idx + 1]?.type === 'detail' && rows[idx + 1].parentNodeId === row.nodeId) {
      return idx;
    }
    return -1;
  }

  /**
   * Binary search (rows are laid out sequentially by `top`) for the row
   * whose `[top, top + height)` span contains `offset`.
   *
   * @returns the row's index, or -1 if `offset` is before the first / after the last row.
   */
  private findRowAtOffset(rows: RowNode[], offset: number, fallbackHeight: number): number {
    let lo = 0;
    let hi = rows.length - 1;
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
}
