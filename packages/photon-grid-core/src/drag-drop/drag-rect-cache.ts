/**
 * Cached, batch-read element geometry for drag hit-testing.
 *
 * `getBoundingClientRect()` is a *forced synchronous layout* whenever styles have
 * been written since the last frame — which, during a drag, they always have.
 * Calling it inside a `pointermove` handler (worse, in a loop over every drop
 * candidate) makes the browser flush layout several times per frame for geometry
 * that has not moved.
 *
 * `DragRectCache` reads every rect once, in a single uninterrupted read phase, and
 * answers all subsequent hit tests from plain numbers. Callers invalidate it only
 * at the moments geometry genuinely changes — drag start, an auto-scroll step, a
 * live panel move, a resize — never per pointer event.
 *
 * Storage is flat `Float64Array`s reused across captures, so a drag that
 * re-captures on every scroll frame allocates nothing after the first capture
 * large enough to hold the slot count.
 *
 * @packageDocumentation
 */

/**
 * The subset of `DOMRect` this cache reads.
 *
 * Deliberately structural rather than `DOMRect`: `right` / `bottom` are derived
 * here instead of read, which keeps the cache usable against any object exposing
 * the four primary values.
 */
export interface DragRectLike {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/** Sentinel returned by every lookup that matches no slot. */
export const NO_SLOT = -1;

/**
 * A batch of element rects captured at one instant, with hit tests that touch no
 * layout.
 *
 * ### Complexity
 * - {@link capture} — O(n), one layout flush total.
 * - {@link hitTestX}, {@link firstSlotPastMidpointX} — O(log n) when
 *   {@link capture} was given left-ordered elements (the common case: a header
 *   row); the binary search degrades gracefully to a miss otherwise, so callers
 *   with unordered slots should use {@link sortByLeft} first.
 * - {@link hitTestPoint}, {@link nearestByMidpointX} — O(n) float comparisons,
 *   zero layout.
 *
 * @example
 * ```ts
 * const cache = new DragRectCache();
 * cache.capture(headerCells);              // one layout flush, at drag start
 *
 * // per frame — no layout:
 * const slot = cache.hitTestX(pointerX);
 * if (slot !== NO_SLOT) highlight(headerCells[slot]);
 *
 * onAutoScrollStep(() => cache.invalidate());
 * ```
 */
export class DragRectCache {
  private lefts   = new Float64Array(0);
  private rights  = new Float64Array(0);
  private tops    = new Float64Array(0);
  private bottoms = new Float64Array(0);
  private els: HTMLElement[] = [];
  private len = 0;
  private valid = false;

  /** Number of captured slots. `0` when empty or invalidated. */
  get length(): number { return this.valid ? this.len : 0; }

  /** `true` when the cache holds geometry that has not been invalidated. */
  get isValid(): boolean { return this.valid && this.len > 0; }

  /**
   * The elements backing the current capture, in slot order.
   *
   * Exposed so callers can read `data-col-id` / `data-group-id` off a hit slot
   * without maintaining a parallel array. Do not mutate.
   */
  get elements(): readonly HTMLElement[] { return this.els; }

  /**
   * Reads every element's rect in one pass and replaces the cache contents.
   *
   * All reads happen consecutively with no interleaved writes, so the browser
   * flushes layout at most once for the whole batch rather than once per element.
   *
   * @param elements - Slots to capture, in the order callers will index them.
   *                   Pass left-ordered elements to enable the binary-search
   *                   lookups, or follow with {@link sortByLeft}.
   */
  capture(elements: readonly HTMLElement[]): void {
    const n = elements.length;
    this.ensureCapacity(n);

    // Single read phase — no style writes may occur between these calls or the
    // browser re-flushes layout for each one, defeating the whole cache.
    for (let i = 0; i < n; i++) {
      const el = elements[i];
      const r: DragRectLike = el.getBoundingClientRect();
      this.lefts[i]   = r.left;
      this.rights[i]  = r.left + r.width;
      this.tops[i]    = r.top;
      this.bottoms[i] = r.top + r.height;
      this.els[i]     = el;
    }

    if (this.els.length > n) this.els.length = n;
    this.len = n;
    this.valid = n > 0;
  }

  /**
   * Re-orders the captured slots by ascending left edge.
   *
   * Absolutely-positioned header cells (group rows, depth fillers) appear in
   * arbitrary DOM order, so sorting is required before the binary-search lookups
   * are meaningful. O(n log n) on a captured batch — never called per frame.
   */
  sortByLeft(): void {
    if (!this.valid || this.len < 2) return;

    const order = new Array<number>(this.len);
    for (let i = 0; i < this.len; i++) order[i] = i;
    order.sort((a, b) => this.lefts[a] - this.lefts[b]);

    const l = new Float64Array(this.len);
    const r = new Float64Array(this.len);
    const t = new Float64Array(this.len);
    const b = new Float64Array(this.len);
    const e = new Array<HTMLElement>(this.len);
    for (let i = 0; i < this.len; i++) {
      const src = order[i];
      l[i] = this.lefts[src];
      r[i] = this.rights[src];
      t[i] = this.tops[src];
      b[i] = this.bottoms[src];
      e[i] = this.els[src];
    }
    this.lefts.set(l);
    this.rights.set(r);
    this.tops.set(t);
    this.bottoms.set(b);
    this.els = e;
  }

  /**
   * Marks the cached geometry stale without releasing its storage.
   *
   * Call at every event that actually moves the captured elements. The next
   * {@link capture} reuses the existing arrays, so invalidating on a scroll frame
   * costs nothing in allocation.
   */
  invalidate(): void {
    this.valid = false;
  }

  /** Releases element references so a finished drag cannot retain detached DOM. */
  clear(): void {
    this.valid = false;
    this.len = 0;
    this.els.length = 0;
  }

  /**
   * Slot whose horizontal span contains `x`, or {@link NO_SLOT}.
   *
   * Spans are treated as half-open (`left <= x < right`) so adjacent columns
   * never both claim a boundary pixel.
   *
   * @param x      - Client x coordinate.
   * @param offset - Value added to every stored edge before comparison. Used to
   *                 correct for horizontal scrolling that has occurred since the
   *                 capture, avoiding a re-read.
   */
  hitTestX(x: number, offset = 0): number {
    if (!this.valid) return NO_SLOT;
    const p = x - offset;

    // Last slot whose left edge is at or before the pointer.
    let lo = 0;
    let hi = this.len - 1;
    let found = NO_SLOT;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.lefts[mid] <= p) { found = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    if (found === NO_SLOT) return NO_SLOT;
    return p < this.rights[found] ? found : NO_SLOT;
  }

  /**
   * First slot whose horizontal midpoint lies to the right of `x`, or
   * {@link length} when the pointer is past every midpoint.
   *
   * This is the "insert before" question every reorder drag asks: the returned
   * index is the slot the dragged item would take.
   *
   * @param x      - Client x coordinate.
   * @param offset - Scroll correction, as in {@link hitTestX}.
   */
  firstSlotPastMidpointX(x: number, offset = 0): number {
    if (!this.valid) return 0;
    const p = x - offset;

    let lo = 0;
    let hi = this.len;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const midpoint = (this.lefts[mid] + this.rights[mid]) * 0.5;
      if (midpoint <= p) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * Slot containing the point, or {@link NO_SLOT}.
   *
   * Later slots win on overlap, matching the topmost-wins convention of the
   * previous `findDropTarget` implementation.
   *
   * @param x - Client x coordinate.
   * @param y - Client y coordinate.
   */
  hitTestPoint(x: number, y: number): number {
    if (!this.valid) return NO_SLOT;
    let found = NO_SLOT;
    for (let i = 0; i < this.len; i++) {
      if (x >= this.lefts[i] && x <= this.rights[i] && y >= this.tops[i] && y <= this.bottoms[i]) {
        found = i;
      }
    }
    return found;
  }

  /**
   * Slot whose horizontal midpoint is nearest `x`, restricted to slots whose
   * vertical span contains `y` (within `yTolerance`). Returns {@link NO_SLOT}
   * when no slot qualifies.
   *
   * @param x          - Client x coordinate.
   * @param y          - Client y coordinate.
   * @param yTolerance - Slack added above and below each slot's vertical span.
   * @param skip       - Slot index to ignore, typically the dragged item itself.
   */
  nearestByMidpointX(x: number, y: number, yTolerance = 0, skip = NO_SLOT): number {
    if (!this.valid) return NO_SLOT;
    let best = NO_SLOT;
    let bestDist = Infinity;
    for (let i = 0; i < this.len; i++) {
      if (i === skip) continue;
      if (y < this.tops[i] - yTolerance || y > this.bottoms[i] + yTolerance) continue;
      const dist = Math.abs(x - (this.lefts[i] + this.rights[i]) * 0.5);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  }

  /** Left edge of a slot, or `0` when the index is out of range. */
  leftOf(i: number): number {
    return this.valid && i >= 0 && i < this.len ? this.lefts[i] : 0;
  }

  /** Right edge of a slot, or `0` when the index is out of range. */
  rightOf(i: number): number {
    return this.valid && i >= 0 && i < this.len ? this.rights[i] : 0;
  }

  /** Top edge of a slot, or `0` when the index is out of range. */
  topOf(i: number): number {
    return this.valid && i >= 0 && i < this.len ? this.tops[i] : 0;
  }

  /** Height of a slot, or `0` when the index is out of range. */
  heightOf(i: number): number {
    return this.valid && i >= 0 && i < this.len ? this.bottoms[i] - this.tops[i] : 0;
  }

  /** Width of a slot, or `0` when the index is out of range. */
  widthOf(i: number): number {
    return this.valid && i >= 0 && i < this.len ? this.rights[i] - this.lefts[i] : 0;
  }

  /** Index of `el` among the captured slots, or {@link NO_SLOT}. */
  indexOfElement(el: HTMLElement | null): number {
    if (!this.valid || !el) return NO_SLOT;
    for (let i = 0; i < this.len; i++) if (this.els[i] === el) return i;
    return NO_SLOT;
  }

  /**
   * Grows the flat arrays to hold at least `n` slots.
   *
   * Capacity is never shrunk: a drag re-captures the same panel repeatedly, so
   * keeping the high-water mark avoids reallocating on every scroll frame.
   */
  private ensureCapacity(n: number): void {
    if (this.lefts.length >= n) return;
    // Round up to reduce reallocation when a capture grows by one or two slots.
    const cap = Math.max(n, this.lefts.length * 2, 16);
    this.lefts   = new Float64Array(cap);
    this.rights  = new Float64Array(cap);
    this.tops    = new Float64Array(cap);
    this.bottoms = new Float64Array(cap);
  }
}
