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
export declare class AutoScroller {
    private readonly getRect;
    private readonly scrollY;
    private readonly scrollX;
    private readonly onScrolled?;
    private readonly threshold;
    private readonly maxSpeed;
    private rafId;
    private lastTs;
    private clientX;
    private clientY;
    private running;
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
    constructor(getRect: () => DOMRect | null, scrollY: (delta: number) => void, scrollX: (delta: number) => void, onScrolled?: ((clientX: number, clientY: number) => void) | undefined, threshold?: number, maxSpeed?: number);
    /**
     * Updates the tracked cursor position and starts the RAF loop if it is not
     * already running.  Safe to call on every `mousemove` — has no overhead
     * when the cursor is away from the edges.
     *
     * @param x - `MouseEvent.clientX`
     * @param y - `MouseEvent.clientY`
     */
    updateMouse(x: number, y: number): void;
    /**
     * Stops the RAF loop immediately.  Call on `mouseup` or when the drag
     * interaction ends to prevent ghost scrolling after the pointer is released.
     */
    stop(): void;
    /**
     * RAF tick — computes scroll deltas from edge proximity and fires callbacks.
     * Bound as an arrow field so it can be passed directly to `requestAnimationFrame`
     * without a wrapper.
     */
    private readonly tick;
    /**
     * Computes scroll speed (px/s) as a linear ramp:
     * `maxSpeed` at the edge (dist = 0), `0` at `threshold` distance.
     *
     * @param distFromEdge - Distance from the viewport edge in pixels.
     */
    private speedAt;
}
//# sourceMappingURL=auto-scroller.d.ts.map