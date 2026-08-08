import type { TimeUnit } from './calendar';

/**
 * Projection between time, slot index and pixel offset along the timeline.
 *
 * Two implementations sit behind this interface and the choice is purely a
 * performance trade, invisible to callers:
 *
 * - {@link UniformAxis} — closed-form arithmetic, **zero allocation**. Used when
 *   slots are equal in both duration and width. Ten years at minute granularity
 *   is 5.26 million slots and costs nothing; a materialised edge array for the
 *   same range would be ~42 MB.
 * - {@link PrefixAxis} — two `Float64Array` edge tables with binary search. Used
 *   when slots are unequal: months (28–31 days), quarters, years, proportional
 *   widths, or day/week slots across a DST transition. Ten years of days is
 *   ~58 KB, which is negligible — the array only becomes untenable at sub-hour
 *   granularity, which is exactly where the uniform path applies.
 *
 * All methods are hot: they run per visible slot per frame. None allocates.
 */
export interface SlotAxis {
  /** Number of slots. */
  readonly count: number;
  /** Total width of all slots, in pixels. */
  readonly totalPx: number;
  /** Time at the very start of the axis. */
  readonly startMs: number;
  /** Time at the very end of the axis (exclusive). */
  readonly endMs: number;

  /** Left edge of slot `i`, in pixels from the axis origin. */
  offsetOf(index: number): number;
  /** Width of slot `i`, in pixels. */
  widthOf(index: number): number;
  /** Start time of slot `i`. */
  timeOf(index: number): number;

  /** Slot containing pixel `px`, clamped to `[0, count - 1]`. */
  indexAt(px: number): number;
  /** Pixel offset of time `t`. Interpolates within a slot; may fall outside the axis. */
  pxAt(t: number): number;
  /** Time at pixel `px`. Inverse of {@link pxAt}. */
  timeAt(px: number): number;
}

/**
 * Equal-duration, equal-width slots. Every operation is closed-form.
 *
 * The absence of any backing array is the point — it is what makes a decade of
 * minute slots feasible.
 */
export class UniformAxis implements SlotAxis {
  readonly totalPx: number;
  readonly endMs: number;

  /**
   * @param startMs - Time at slot 0.
   * @param slotMs - Duration of one slot. Must be > 0.
   * @param slotPx - Width of one slot. Must be > 0.
   * @param count - Number of slots.
   */
  constructor(
    readonly startMs: number,
    private readonly slotMs: number,
    private readonly slotPx: number,
    readonly count: number,
  ) {
    if (slotMs <= 0) throw new RangeError('UniformAxis: slotMs must be positive');
    if (slotPx <= 0) throw new RangeError('UniformAxis: slotPx must be positive');
    this.totalPx = count * slotPx;
    this.endMs = startMs + count * slotMs;
  }

  offsetOf(index: number): number { return index * this.slotPx; }
  widthOf(): number { return this.slotPx; }
  timeOf(index: number): number { return this.startMs + index * this.slotMs; }

  indexAt(px: number): number {
    const i = Math.floor(px / this.slotPx);
    return i < 0 ? 0 : i >= this.count ? this.count - 1 : i;
  }

  pxAt(t: number): number {
    return ((t - this.startMs) / this.slotMs) * this.slotPx;
  }

  timeAt(px: number): number {
    return this.startMs + (px / this.slotPx) * this.slotMs;
  }
}

/**
 * Unequal slots, backed by edge tables.
 *
 * `edgesMs` comes straight from `ticksBetween`'s fence posts and `edgesPx` is
 * its prefix sum, so both have `count + 1` entries and slot `i` spans
 * `[edgesMs[i], edgesMs[i+1])` / `[edgesPx[i], edgesPx[i+1])`. Storing widths
 * explicitly means equal-width and proportional-width modes share one
 * implementation — the difference is only how `edgesPx` was built.
 */
export class PrefixAxis implements SlotAxis {
  readonly count: number;
  readonly totalPx: number;
  readonly startMs: number;
  readonly endMs: number;

  /**
   * @param edgesMs - Fence posts, strictly ascending, length `count + 1`.
   * @param edgesPx - Cumulative pixel offsets, ascending, length `count + 1`.
   */
  constructor(
    private readonly edgesMs: Float64Array,
    private readonly edgesPx: Float64Array,
  ) {
    if (edgesMs.length !== edgesPx.length) {
      throw new RangeError('PrefixAxis: edge arrays must be the same length');
    }
    if (edgesMs.length < 2) {
      throw new RangeError('PrefixAxis: need at least two fence posts');
    }
    this.count = edgesMs.length - 1;
    this.startMs = edgesMs[0];
    this.endMs = edgesMs[this.count];
    this.totalPx = edgesPx[this.count];
  }

  offsetOf(index: number): number { return this.edgesPx[index]; }
  widthOf(index: number): number { return this.edgesPx[index + 1] - this.edgesPx[index]; }
  timeOf(index: number): number { return this.edgesMs[index]; }

  indexAt(px: number): number {
    return clampIndex(upperBound(this.edgesPx, px) - 1, this.count);
  }

  pxAt(t: number): number {
    const i = clampIndex(upperBound(this.edgesMs, t) - 1, this.count);
    const spanMs = this.edgesMs[i + 1] - this.edgesMs[i];
    const spanPx = this.edgesPx[i + 1] - this.edgesPx[i];
    // Linear interpolation inside the slot, so a mid-month event lands
    // proportionally rather than snapping to the month edge.
    return this.edgesPx[i] + (spanMs === 0 ? 0 : ((t - this.edgesMs[i]) / spanMs) * spanPx);
  }

  timeAt(px: number): number {
    const i = this.indexAt(px);
    const spanPx = this.edgesPx[i + 1] - this.edgesPx[i];
    const spanMs = this.edgesMs[i + 1] - this.edgesMs[i];
    return this.edgesMs[i] + (spanPx === 0 ? 0 : ((px - this.edgesPx[i]) / spanPx) * spanMs);
  }
}

/** Clamps a slot index into `[0, count - 1]`. */
function clampIndex(i: number, count: number): number {
  return i < 0 ? 0 : i >= count ? count - 1 : i;
}

/**
 * First index whose value is strictly greater than `target`.
 *
 * Hand-rolled rather than using `findIndex` because this runs per visible slot
 * per frame and must not allocate a closure.
 */
function upperBound(arr: Float64Array, target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Builds a {@link PrefixAxis} from fence posts.
 *
 * @param ticks - Ascending fence posts from `ticksBetween` (`count + 1` entries).
 * @param slotPx - Fixed width per slot, for `'equal'` mode.
 * @param proportional - When `true`, slot widths scale with duration, so a
 *   31-day month is wider than a 28-day one. Reads as a Gantt/duration view.
 *   When `false`, every slot gets `slotPx` and the timeline reads as columns.
 */
export function buildPrefixAxis(
  ticks: readonly number[],
  slotPx: number,
  proportional: boolean,
): PrefixAxis {
  const n = ticks.length;
  const edgesMs = new Float64Array(n);
  const edgesPx = new Float64Array(n);

  for (let i = 0; i < n; i++) edgesMs[i] = ticks[i];

  if (!proportional) {
    for (let i = 1; i < n; i++) edgesPx[i] = i * slotPx;
    return new PrefixAxis(edgesMs, edgesPx);
  }

  // Proportional: pixels-per-millisecond is normalised against the mean slot
  // duration, so `slotPx` still means "width of a typical slot" and switching
  // modes does not change the overall timeline scale.
  const totalMs = ticks[n - 1] - ticks[0];
  const pxPerMs = totalMs > 0 ? ((n - 1) * slotPx) / totalMs : 0;
  for (let i = 1; i < n; i++) {
    edgesPx[i] = (ticks[i] - ticks[0]) * pxPerMs;
  }

  return new PrefixAxis(edgesMs, edgesPx);
}

/** The slot window to render, in slot indices. */
export interface SlotWindow {
  /** First slot to render, inclusive. */
  readonly start: number;
  /** Last slot to render, exclusive. */
  readonly end: number;
}

/**
 * Computes the visible slot range for a horizontal scroll position.
 *
 * @param buffer - Extra slots rendered either side, so a scroll of a few pixels
 *   does not expose an unpainted edge. Defaults to 2, matching the grid's own
 *   `COL_BUFFER`, so the timeline header and the grid's column virtualization
 *   shift on the same frames.
 */
export function visibleSlotWindow(
  axis: SlotAxis,
  scrollLeft: number,
  viewportWidth: number,
  buffer = 2,
): SlotWindow {
  if (axis.count === 0 || viewportWidth <= 0) return { start: 0, end: 0 };

  const first = axis.indexAt(scrollLeft);
  const last = axis.indexAt(scrollLeft + viewportWidth - 1) + 1;

  return {
    start: Math.max(0, first - buffer),
    end: Math.min(axis.count, last + buffer),
  };
}

/**
 * Time range to query events for, given a scroll position.
 *
 * Deliberately **not** derived from {@link visibleSlotWindow}: a slot buffer is
 * the wrong unit for events. At minute granularity two slots is two minutes, so
 * a bar wider than the viewport would pop in and out at its edges. This instead
 * pads by half a viewport on each side, in pixels, which is scale-invariant.
 *
 * Long events that begin far to the left are *not* handled here — that is the
 * job of the event index's max-end augmentation, which finds them regardless of
 * how far back they start.
 */
export function visibleTimeRange(
  axis: SlotAxis,
  scrollLeft: number,
  viewportWidth: number,
): { start: number; end: number } {
  const pad = viewportWidth / 2;
  return {
    start: axis.timeAt(scrollLeft - pad),
    end: axis.timeAt(scrollLeft + viewportWidth + pad),
  };
}
