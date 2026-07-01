/**
 * RAF-based edge auto-scroller for drag interactions.
 *
 * When the cursor is within `threshold` pixels of the viewport edges, a scroll
 * delta proportional to proximity is applied every animation frame via the
 * `scrollY` / `scrollX` delta callbacks.  After each scrolled frame the
 * optional `onScrolled` callback is invoked with the current cursor coordinates
 * so the caller can re-evaluate which cell lies under the cursor.
 *
 * ### Usage
 * 1. Call `updateMouse(x, y)` on every drag `mousemove` event.
 * 2. Call `stop()` on `mouseup` or when the drag interaction ends.
 * 3. Wire `onScrolled` to re-extend the selection or re-process the fill
 *    position after the grid has scrolled.
 *
 * ### Performance
 * The RAF loop only executes when at least one edge is within threshold range.
 * No timers or intervals are created; a single `requestAnimationFrame` chain
 * drives the loop and `cancelAnimationFrame` terminates it instantly.
 */
export class AutoScroller {
  private rafId: number | null = null;
  private lastTs = 0;
  private clientX = 0;
  private clientY = 0;
  private running = false;

  /**
   * @param getRect    - Returns the bounding rect of the scrollable viewport
   *                     element, or `null` when the grid is unmounted.
   * @param scrollY    - Called with a **signed pixel delta** to scroll
   *                     vertically.  Positive = down, negative = up.
   * @param scrollX    - Called with a **signed pixel delta** to scroll
   *                     horizontally.  Positive = right, negative = left.
   * @param onScrolled - Optional callback invoked after any frame that
   *                     actually scrolled.  Receives the most-recent client
   *                     coordinates so the caller can re-evaluate the drag
   *                     target under the (now-scrolled) grid.
   * @param threshold  - Distance from the viewport edge (px) at which
   *                     scrolling starts.  Defaults to `60`.
   * @param maxSpeed   - Maximum scroll speed in px/s reached at the edge
   *                     (dist = 0).  Defaults to `500`.
   */
  constructor(
    private readonly getRect: () => DOMRect | null,
    private readonly scrollY: (delta: number) => void,
    private readonly scrollX: (delta: number) => void,
    private readonly onScrolled?: (clientX: number, clientY: number) => void,
    private readonly threshold = 60,
    private readonly maxSpeed = 500,
  ) {}

  /**
   * Updates the tracked cursor position and starts the RAF loop if it is not
   * already running.  Safe to call on every `mousemove` — has no overhead
   * when the cursor is away from the edges.
   *
   * @param x - `MouseEvent.clientX`
   * @param y - `MouseEvent.clientY`
   */
  updateMouse(x: number, y: number): void {
    this.clientX = x;
    this.clientY = y;
    if (!this.running) {
      this.running = true;
      this.lastTs  = 0;
      this.rafId   = requestAnimationFrame(this.tick);
    }
  }

  /**
   * Stops the RAF loop immediately.  Call on `mouseup` or when the drag
   * interaction ends to prevent ghost scrolling after the pointer is released.
   */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * RAF tick — computes scroll deltas from edge proximity and fires callbacks.
   * Bound as an arrow field so it can be passed directly to `requestAnimationFrame`
   * without a wrapper.
   */
  private readonly tick = (ts: number): void => {
    if (!this.running) return;

    const rect = this.getRect();
    if (!rect) { this.stop(); return; }

    // `dt` = elapsed seconds since last frame; clamped to avoid large jumps
    // after a tab switch or visibility change.
    const dt = this.lastTs === 0 ? 0 : Math.min((ts - this.lastTs) / 1000, 0.1);
    this.lastTs = ts;

    let scrolled = false;

    if (dt > 0) {
      const { clientX: x, clientY: y } = this;

      // ── Vertical ────────────────────────────────────────────────────────────
      // `dist` can be negative when the cursor has moved past the viewport
      // boundary (common during fill-handle drag).  Clamp to 0 so being
      // outside the edge triggers max-speed scrolling rather than no scroll.
      const distTop    = y - rect.top;
      const distBottom = rect.bottom - y;

      if (distTop < this.threshold) {
        this.scrollY(-this.speedAt(Math.max(0, distTop)) * dt);
        scrolled = true;
      } else if (distBottom < this.threshold) {
        this.scrollY(this.speedAt(Math.max(0, distBottom)) * dt);
        scrolled = true;
      }

      // ── Horizontal ──────────────────────────────────────────────────────────
      const distLeft  = x - rect.left;
      const distRight = rect.right - x;

      if (distLeft < this.threshold) {
        this.scrollX(-this.speedAt(Math.max(0, distLeft)) * dt);
        scrolled = true;
      } else if (distRight < this.threshold) {
        this.scrollX(this.speedAt(Math.max(0, distRight)) * dt);
        scrolled = true;
      }
    }

    if (scrolled) {
      this.onScrolled?.(this.clientX, this.clientY);
    }

    // Keep the loop alive as long as `running` is true — stop() terminates it.
    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Computes scroll speed (px/s) as a linear ramp:
   * `maxSpeed` at the edge (dist = 0), `0` at `threshold` distance.
   *
   * @param distFromEdge - Distance from the viewport edge in pixels.
   */
  private speedAt(distFromEdge: number): number {
    return this.maxSpeed * (1 - distFromEdge / this.threshold);
  }
}
