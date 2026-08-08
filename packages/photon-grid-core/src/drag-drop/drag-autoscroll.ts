/**
 * Edge auto-scroll for a drag over a scrollable container.
 *
 * @packageDocumentation
 */

/** Distance from a container edge (px) at which scrolling engages. */
const SCROLL_ZONE = 60;

/** Scroll speed (px/**second**) reached at the very edge of the container. */
const SCROLL_SPEED_MAX = 1080;

/** Upper bound on a single frame's delta time (s), so a backgrounded tab does not jump. */
const MAX_FRAME_DELTA = 0.1;

/**
 * Scrolls a container while a drag hovers near its edges.
 *
 * ### Two deliberate departures from the previous implementation
 *
 * **Time-based, not frame-based.** Speed is expressed in pixels per *second* and
 * multiplied by the real elapsed time each frame. The previous fixed
 * pixels-per-frame model made scroll speed a function of display refresh rate —
 * identical drags scrolled twice as fast on a 120 Hz monitor as on a 60 Hz one.
 * This matches {@link ../renderer/auto-scroller!AutoScroller}, which the body
 * already uses for range selection.
 *
 * **The loop only runs while it has something to do.** The rAF chain starts when
 * the pointer enters an edge zone and stops when it leaves, instead of spinning
 * for the entire drag. Each idle frame previously cost a
 * `getBoundingClientRect()` — a forced layout — to discover it had nothing to do.
 *
 * The container rect is read once and cached; {@link invalidate} marks it stale
 * after anything that could move the container (a resize, a panel change). The
 * scroll itself does not move the container, so scrolling never invalidates.
 */
export class DragAutoscroll {
  private scrollEl: HTMLElement | null = null;
  private rafId: number | null = null;
  private mouseX = 0;
  private mouseY = 0;
  private lastTs = 0;

  // Cached container geometry. Read once per attach/invalidate, never per frame.
  private rectLeft = 0;
  private rectTop = 0;
  private rectWidth = 0;
  private rectHeight = 0;
  private rectValid = false;

  /** Invoked after any frame that actually scrolled, with the live cursor position. */
  private onScrolled: ((x: number, y: number) => void) | null = null;

  /**
   * Binds the scrollable container.
   *
   * @param scrollEl - Element whose `scrollBy` is driven. Its rect is read lazily
   *                   on the first frame that needs it, not here, so attaching
   *                   mid-gesture costs no layout.
   */
  attach(scrollEl: HTMLElement): void {
    if (this.scrollEl !== scrollEl) {
      this.scrollEl = scrollEl;
      this.rectValid = false;
    }
  }

  /**
   * Registers a callback fired after each frame that scrolled, so the caller can
   * re-resolve which drop target now sits under the (unmoved) cursor.
   *
   * @param fn - Receives the current client coordinates, or `null` to unregister.
   */
  setScrolledCallback(fn: ((x: number, y: number) => void) | null): void {
    this.onScrolled = fn;
  }

  /** Stops the loop and releases the container reference. */
  detach(): void {
    this.stop();
    this.scrollEl = null;
    this.rectValid = false;
    this.onScrolled = null;
  }

  /**
   * Marks the cached container rect stale.
   *
   * Call after a resize, a panel layout change, or anything else that moves the
   * container on screen. Not needed for ordinary scrolling, which changes the
   * container's content offset but not its position.
   */
  invalidate(): void {
    this.rectValid = false;
  }

  /**
   * Records the cursor position and starts the loop when the pointer is inside an
   * edge zone.
   *
   * Safe to call at any rate — it is two number stores plus a zone test against
   * cached geometry, with no DOM access.
   *
   * @param x - Client x coordinate.
   * @param y - Client y coordinate.
   */
  onMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    if (this.rafId === null && this.isInEdgeZone()) this.start();
  }

  /**
   * Starts the scroll loop unconditionally.
   *
   * Kept for callers that drive the cursor themselves; {@link onMouseMove} starts
   * the loop on demand, so most callers never need this.
   */
  start(): void {
    if (this.rafId !== null) return;
    this.lastTs = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** Stops the scroll loop immediately. */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTs = 0;
  }

  /** `true` while the scroll loop is running. */
  get isScrolling(): boolean { return this.rafId !== null; }

  private readonly tick = (ts: number): void => {
    this.rafId = null;
    if (!this.scrollEl) return;

    // Clamped so a tab that was backgrounded for a second does not scroll a
    // thousand pixels on its first frame back.
    const dt = this.lastTs === 0 ? 0 : Math.min((ts - this.lastTs) / 1000, MAX_FRAME_DELTA);
    this.lastTs = ts;

    this.ensureRect();

    const relX = this.mouseX - this.rectLeft;
    const relY = this.mouseY - this.rectTop;

    let dx = 0;
    let dy = 0;

    if (relY < SCROLL_ZONE) dy = -this.speedAt(relY);
    else if (relY > this.rectHeight - SCROLL_ZONE) dy = this.speedAt(this.rectHeight - relY);

    if (relX < SCROLL_ZONE) dx = -this.speedAt(relX);
    else if (relX > this.rectWidth - SCROLL_ZONE) dx = this.speedAt(this.rectWidth - relX);

    if (dx === 0 && dy === 0) {
      // Left the edge zone — let the loop die rather than burn a frame (and a
      // layout read) per tick for the rest of the drag.
      return;
    }

    if (dt > 0) {
      this.scrollEl.scrollBy(dx * dt, dy * dt);
      this.onScrolled?.(this.mouseX, this.mouseY);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  /** `true` when the cursor is close enough to an edge to warrant running the loop. */
  private isInEdgeZone(): boolean {
    if (!this.scrollEl) return false;
    this.ensureRect();
    const relX = this.mouseX - this.rectLeft;
    const relY = this.mouseY - this.rectTop;
    return relY < SCROLL_ZONE || relY > this.rectHeight - SCROLL_ZONE
        || relX < SCROLL_ZONE || relX > this.rectWidth - SCROLL_ZONE;
  }

  /** Reads and caches the container rect if it is stale. */
  private ensureRect(): void {
    if (this.rectValid || !this.scrollEl) return;
    const r = this.scrollEl.getBoundingClientRect();
    this.rectLeft = r.left;
    this.rectTop = r.top;
    this.rectWidth = r.width;
    this.rectHeight = r.height;
    this.rectValid = true;
  }

  /**
   * Scroll speed (px/s) as a quadratic ramp: `SCROLL_SPEED_MAX` at the edge,
   * zero at {@link SCROLL_ZONE} away. Quadratic rather than linear so small
   * incursions into the zone creep rather than lurch.
   *
   * @param distanceFromEdge - Pixels from the edge; negative values (cursor past
   *                           the boundary) saturate at maximum speed.
   */
  private speedAt(distanceFromEdge: number): number {
    const ratio = Math.max(0, Math.min(1, 1 - distanceFromEdge / SCROLL_ZONE));
    return ratio * ratio * SCROLL_SPEED_MAX;
  }
}
