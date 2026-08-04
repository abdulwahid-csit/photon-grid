/**
 * Frame-aligned coalescing for pointer-driven drag gestures.
 *
 * A pointing device delivers `pointermove` on its own schedule, not the
 * compositor's: a plain USB mouse polls at 125 Hz, a gaming mouse at 500–1000 Hz,
 * and a trackpad emits bursts. Against a 60 Hz display that is 2–16 events per
 * painted frame. Doing a drag's real work on each of them recomputes hit tests,
 * rewrites styles, and forces layout for frames the user never sees.
 *
 * `DragFrameScheduler` collapses every sample that arrives within one frame into
 * a single callback carrying the **newest** coordinates, so the DOM is touched at
 * most once per frame no matter how fast the device runs. The per-event cost
 * becomes two number stores.
 *
 * @packageDocumentation
 */

/**
 * Receives the most recent pointer sample once per animation frame.
 *
 * @param x - Latest `clientX`.
 * @param y - Latest `clientY`.
 */
export type DragFrameCallback = (x: number, y: number) => void;

/**
 * Coalesces high-frequency pointer samples into one animation-frame flush.
 *
 * Modelled on {@link ../renderer/vdom/patch-scheduler!PatchScheduler} — the same
 * "queue, request one frame, run the newest state" shape the grid already uses
 * for VDOM patches. No object is allocated per sample; only two numbers and a
 * boolean are written.
 *
 * @example
 * ```ts
 * const scheduler = new DragFrameScheduler((x, y) => this.applyDragFrame(x, y));
 *
 * onPointerMove(e: PointerEvent): void {
 *   scheduler.sample(e.clientX, e.clientY);   // O(1), no DOM access
 * }
 *
 * onPointerUp(): void {
 *   scheduler.flushNow();                     // honour the final position
 *   this.commitDrop();
 * }
 * ```
 *
 * @remarks
 * **Always call {@link flushNow} before drop logic.** A `pointerup` can arrive
 * while a sample is still queued; without the flush the drop would be resolved
 * against a pointer position up to one frame stale.
 */
export class DragFrameScheduler {
  private handle = 0;
  private x = 0;
  private y = 0;
  /** `true` once a sample has been recorded and not yet delivered. */
  private hasSample = false;

  /**
   * @param callback - Invoked at most once per animation frame with the newest
   *                   sample. Exceptions propagate to the frame callback, matching
   *                   `requestAnimationFrame` semantics.
   */
  constructor(private readonly callback: DragFrameCallback) {}

  /** The most recently recorded `clientX`, whether or not it has been delivered. */
  get lastX(): number { return this.x; }

  /** The most recently recorded `clientY`, whether or not it has been delivered. */
  get lastY(): number { return this.y; }

  /** `true` when a sample is queued for the next frame. */
  get isPending(): boolean { return this.handle !== 0; }

  /**
   * Records a pointer position and requests a frame if one is not already
   * queued. Safe to call at any rate — later samples overwrite earlier ones, so
   * only the newest is ever delivered.
   *
   * @param x - `PointerEvent.clientX`.
   * @param y - `PointerEvent.clientY`.
   */
  sample(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.hasSample = true;
    if (this.handle !== 0) return;
    this.handle = requestAnimationFrame(this.run);
  }

  /**
   * Delivers any queued sample immediately instead of waiting for the frame, and
   * cancels the pending frame.
   *
   * Call this from `pointerup` before resolving the drop, and anywhere the drag
   * state must be consistent synchronously (a measurement, a test assertion).
   * No-op when nothing is queued.
   */
  flushNow(): void {
    if (this.handle !== 0) {
      cancelAnimationFrame(this.handle);
      this.handle = 0;
    }
    if (!this.hasSample) return;
    this.hasSample = false;
    this.callback(this.x, this.y);
  }

  /**
   * Discards the queued sample without delivering it and cancels the pending
   * frame. Used when a gesture is aborted — a cancelled drag must not apply one
   * last move after its state has been torn down.
   */
  cancel(): void {
    if (this.handle !== 0) {
      cancelAnimationFrame(this.handle);
      this.handle = 0;
    }
    this.hasSample = false;
  }

  /**
   * Clears the retained coordinates in addition to cancelling. Call at the end
   * of a gesture so {@link lastX} / {@link lastY} do not report a previous
   * drag's position to the next one.
   */
  reset(): void {
    this.cancel();
    this.x = 0;
    this.y = 0;
  }

  private readonly run = (): void => {
    this.handle = 0;
    if (!this.hasSample) return;
    this.hasSample = false;
    this.callback(this.x, this.y);
  };
}
