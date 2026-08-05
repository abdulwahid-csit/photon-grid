/**
 * Frame-rate-independent smoothing for discrete scroll steps.
 *
 * A notched mouse wheel hands the grid one large jump per detent. This turns
 * each jump into a short, decelerating glide: the delta is added to a *target*
 * offset, and every animation frame moves the live offset a fixed fraction of
 * the way toward it. The result is exponential ease-out — fast at the start
 * (so the grid still feels immediate), slowing as it lands.
 *
 * Why exponential rather than a timed easing curve: wheel notches arrive
 * *during* the glide they retarget. A duration-based tween would have to
 * restart, re-time, or queue each one; approaching a mutable target has no
 * such seam — a second notch simply moves the target and the same glide
 * absorbs it, so a fast spin reads as one continuous acceleration instead of a
 * chain of restarted animations.
 *
 * The module is DOM-free: axes are supplied as accessor triples and the frame
 * scheduler is injectable, so the motion can be driven deterministically in
 * tests. Allocation-free per frame — the step callback is a bound field, not a
 * closure created per gesture.
 *
 * @packageDocumentation
 */

/**
 * Multiples of the time constant used to define "settled".
 *
 * With `tau = duration / 3`, exponential approach covers ~95% of the distance
 * in `duration` ms, which is what makes the configured duration mean what a
 * user would expect it to mean.
 */
const SETTLE_TAU_COUNT = 3;

/**
 * Longest frame delta fed to the integrator, in ms (~4 frames at 60Hz).
 *
 * A background tab, a long paint, or a breakpoint can produce a multi-second
 * gap. Clamping keeps that from collapsing the glide into a single teleporting
 * jump on the frame the page resumes.
 */
const MAX_FRAME_DELTA_MS = 64;

/** Frame delta assumed for the first frame of a glide, before two timestamps exist. */
const ASSUMED_FRAME_MS = 16.7;

/**
 * Distance (px) at which the remaining glide is not worth another frame — half
 * a CSS pixel, below what any display can resolve.
 */
const SNAP_EPSILON_PX = 0.5;

/**
 * One scrollable axis, as the accessors the animator needs to drive it.
 *
 * Kept as functions rather than a value so the animator never holds a stale
 * copy of an offset that the scrollbar, keyboard navigation, or a programmatic
 * `scrollToRow` may have moved underneath it.
 */
export interface SmoothScrollAxis {
  /** Current offset in content pixels. */
  readonly get: () => number;
  /** Writes an offset. Implementations are expected to clamp to their own range. */
  readonly set: (value: number) => void;
  /** Clamps a candidate offset into the scrollable range, without writing it. */
  readonly clamp: (value: number) => number;
}

/** Schedules `cb` for the next animation frame and returns a cancellable handle. */
export type FrameScheduler = (cb: (timeMs: number) => void) => number;

/** Cancels a frame previously booked by a {@link FrameScheduler}. */
export type FrameCanceller = (handle: number) => void;

/** Collaborators handed to a {@link SmoothScrollAnimator}. */
export interface SmoothScrollAnimatorDeps {
  readonly x: SmoothScrollAxis;
  readonly y: SmoothScrollAxis;
  /** Defaults to `requestAnimationFrame`. Injected in tests. */
  readonly requestFrame?: FrameScheduler;
  /** Defaults to `cancelAnimationFrame`. Injected in tests. */
  readonly cancelFrame?: FrameCanceller;
}

/**
 * Fraction of the remaining distance to cover in a frame of `dtMs`.
 *
 * Derived from the exponential decay `1 - e^(-t/tau)` so the motion is
 * identical at 30, 60, 120 or 144Hz: two 8ms frames advance exactly as far as
 * one 16ms frame. A per-frame constant (`remaining *= 0.8`) would instead make
 * the grid scroll twice as fast on a 120Hz display.
 *
 * @param dtMs       - Elapsed time since the previous frame.
 * @param durationMs - Time in which ~95% of the distance should be covered.
 * @returns A factor in `(0, 1]`; `1` means "land on the target now".
 */
export function approachFactor(dtMs: number, durationMs: number): number {
  if (durationMs <= 0 || dtMs <= 0) return 1;
  return 1 - Math.exp((-SETTLE_TAU_COUNT * dtMs) / durationMs);
}

/**
 * Drives both scroll axes toward a target offset with exponential ease-out.
 *
 * Idle by default and idle again the moment both axes land, so a grid that is
 * not being wheel-scrolled schedules no frames at all.
 */
export class SmoothScrollAnimator {
  private readonly requestFrame: FrameScheduler;
  private readonly cancelFrame: FrameCanceller;

  /** Offsets being glided toward. Meaningful only while the matching axis is active. */
  private targetX = 0;
  private targetY = 0;
  private activeX = false;
  private activeY = false;

  private frameHandle: number | null = null;
  /** Timestamp of the previous frame; `-1` until the glide's second frame. */
  private lastFrameMs = -1;
  private durationMs: number;

  /**
   * @param deps       - Axis accessors and (optionally) a frame scheduler.
   * @param durationMs - Initial settle duration; see {@link setDuration}.
   */
  constructor(private readonly deps: SmoothScrollAnimatorDeps, durationMs: number) {
    this.durationMs = durationMs;
    this.requestFrame = deps.requestFrame ?? ((cb) => requestAnimationFrame(cb));
    this.cancelFrame = deps.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
  }

  /**
   * Sets the time in which a glide covers ~95% of its distance.
   *
   * Takes effect on the next frame, including mid-glide. `0` disables
   * smoothing: every step lands immediately.
   */
  setDuration(durationMs: number): void {
    this.durationMs = Math.max(0, durationMs);
  }

  /** `true` while a glide is in flight on either axis. */
  isActive(): boolean {
    return this.activeX || this.activeY;
  }

  /**
   * Offset the X axis is heading for — the live offset when no glide is in
   * flight.
   *
   * Callers deciding whether they can still scroll (and therefore whether to
   * consume a gesture) must test against this rather than the live offset: at
   * the tail of a glide the live offset is still short of the end, but the
   * remaining distance is already spoken for.
   */
  getTargetX(): number {
    return this.activeX ? this.targetX : this.deps.x.get();
  }

  /** Offset the Y axis is heading for. See {@link getTargetX}. */
  getTargetY(): number {
    return this.activeY ? this.targetY : this.deps.y.get();
  }

  /**
   * Extends the glide by a signed delta on each axis.
   *
   * Deltas accumulate onto the current target, so notches arriving mid-glide
   * add distance rather than restarting the motion. Each target is clamped to
   * its axis's scrollable range on the way in, so a burst of notches at the
   * end of the dataset cannot bank distance that would have to be unwound
   * before scrolling back the other way.
   *
   * @param dx - Horizontal delta in content pixels.
   * @param dy - Vertical delta in content pixels.
   */
  glideBy(dx: number, dy: number): void {
    if (dx !== 0) {
      const target = this.deps.x.clamp(this.getTargetX() + dx);
      this.targetX = target;
      this.activeX = Math.abs(target - this.deps.x.get()) > SNAP_EPSILON_PX;
    }
    if (dy !== 0) {
      const target = this.deps.y.clamp(this.getTargetY() + dy);
      this.targetY = target;
      this.activeY = Math.abs(target - this.deps.y.get()) > SNAP_EPSILON_PX;
    }
    if (this.isActive()) this.ensureRunning();
    else this.stop();
  }

  /**
   * Abandons any glide in flight, leaving the scroll offsets where they are.
   *
   * Called whenever something other than the wheel moves the view — a
   * scrollbar drag, a touch pan, keyboard navigation, `scrollToRow` — so the
   * animation can never fight, or silently undo, a more recent intent.
   */
  cancel(): void {
    this.activeX = false;
    this.activeY = false;
    this.stop();
  }

  /** Releases the pending frame. Equivalent to {@link cancel}. */
  destroy(): void {
    this.cancel();
  }

  /** Books the next frame if one is not already pending. */
  private ensureRunning(): void {
    if (this.frameHandle !== null) return;
    this.lastFrameMs = -1;
    this.frameHandle = this.requestFrame(this.step);
  }

  private stop(): void {
    if (this.frameHandle === null) return;
    this.cancelFrame(this.frameHandle);
    this.frameHandle = null;
  }

  /**
   * Advances both axes by one frame.
   *
   * A bound field rather than a method so the same function reference is
   * handed to every `requestAnimationFrame` call — no closure is allocated per
   * gesture, and none per frame.
   */
  private readonly step = (timeMs: number): void => {
    this.frameHandle = null;

    const dt = this.lastFrameMs < 0
      ? ASSUMED_FRAME_MS
      : Math.min(Math.max(timeMs - this.lastFrameMs, 0), MAX_FRAME_DELTA_MS);
    this.lastFrameMs = timeMs;

    const alpha = approachFactor(dt, this.durationMs);
    if (this.activeX) this.activeX = this.advance(this.deps.x, this.targetX, alpha);
    if (this.activeY) this.activeY = this.advance(this.deps.y, this.targetY, alpha);

    if (this.isActive()) this.frameHandle = this.requestFrame(this.step);
  };

  /**
   * Moves one axis a fraction of the way to its target.
   *
   * @returns `true` while the axis still has distance left to cover. `false`
   *   once it has landed — or once a write produced no movement at all, which
   *   means the axis clamped at an edge and there is nothing left to glide
   *   into.
   */
  private advance(axis: SmoothScrollAxis, target: number, alpha: number): boolean {
    const current = axis.get();
    const remaining = target - current;
    if (Math.abs(remaining) <= SNAP_EPSILON_PX) {
      if (remaining !== 0) axis.set(target);
      return false;
    }
    axis.set(current + remaining * alpha);
    return axis.get() !== current;
  }
}
