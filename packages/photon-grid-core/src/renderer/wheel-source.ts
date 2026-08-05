/**
 * Classification of a `wheel` gesture's input device.
 *
 * The two devices that produce `wheel` events behave nothing alike:
 *
 * - A **notched mouse wheel** fires one large delta per detent — 100px in
 *   Blink, three *lines* in Gecko, one full notch in WebKit — with nothing in
 *   between. Applied straight to a scroll offset, each notch teleports the
 *   viewport by ~2-3 rows. The eye reads that as the grid stuttering, because
 *   there are no intermediate frames for it to track.
 * - A **precision touchpad** (and a high-resolution free-spin wheel) fires a
 *   continuous stream of small, often fractional deltas at frame rate. Applied
 *   straight to a scroll offset that is already smooth motion: it must be left
 *   exactly as it is, since re-animating it would only add input lag to a
 *   gesture the user is already steering by hand.
 *
 * So the smoothing in {@link SmoothScrollAnimator} has to be applied to one and
 * withheld from the other, and this module is where that decision is made. It
 * is deliberately DOM-free — the classification is pure arithmetic over the
 * numbers a `WheelEvent` carries, which makes the heuristics directly testable
 * against captured device traces.
 *
 * @packageDocumentation
 */

/** `WheelEvent.deltaMode` — the unit the event's deltas are expressed in. */
export enum WheelDeltaMode {
  /** Deltas are CSS pixels. Every touchpad, and Blink/WebKit mouse wheels. */
  Pixel = 0,
  /** Deltas are text lines. Gecko reports mouse wheels this way. */
  Line = 1,
  /** Deltas are viewport pages. Rare; some accessibility devices. */
  Page = 2,
}

/** The kind of device a wheel gesture came from. */
export enum WheelInputType {
  /**
   * A notched wheel: discrete, evenly-sized jumps with gaps between them.
   * Benefits from smoothing.
   */
  Stepped = 'stepped',
  /**
   * A precision touchpad or high-resolution wheel: a dense stream of small
   * deltas that is already smooth. Must be applied 1:1.
   */
  Continuous = 'continuous',
}

/**
 * The subset of a `WheelEvent` classification depends on.
 *
 * Passed as plain numbers rather than the event itself so the heuristics stay
 * testable without a DOM.
 */
export interface WheelSample {
  readonly deltaX: number;
  readonly deltaY: number;
  /** @see {@link WheelDeltaMode} */
  readonly deltaMode: number;
  /** Event timestamp in ms; used only to tell one gesture from the next. */
  readonly timeStamp: number;
  /**
   * Legacy `WheelEvent.wheelDeltaY`, when the engine exposes it.
   *
   * Deprecated in the spec but implemented by every Blink and WebKit build,
   * and by far the strongest signal available: those engines derive it from
   * the *device's* tick count (`ticks * 120`), before any page-zoom or
   * acceleration scaling is applied to `deltaY`. A physical detent therefore
   * lands on an exact multiple of {@link LEGACY_WHEEL_NOTCH} at any zoom
   * level, while a touchpad's fractional ticks essentially never do.
   *
   * `undefined` in Gecko (which does not implement it) — see
   * {@link classifyWheelSample} for the magnitude-based fallback used there.
   */
  readonly legacyWheelDelta?: number;
}

/**
 * Gap (ms) after which the next wheel event is treated as a new gesture.
 *
 * A touchpad emits at frame rate (~8-16ms apart) and a wheel spin at roughly
 * one detent per 30-80ms, so anything past this is a genuine pause — long
 * enough that the user could have switched hands from the touchpad to the
 * mouse, which is exactly the case this resets for.
 */
export const GESTURE_IDLE_MS = 180;

/** Legacy `wheelDelta` units per physical detent, on every engine that reports it. */
export const LEGACY_WHEEL_NOTCH = 120;

/**
 * Largest per-event pixel delta that can only have come from a continuous
 * device.
 *
 * No engine emits a notch smaller than ~40px (Blink 100, WebKit ~40, Gecko
 * 3 lines), so a step below this is a touchpad or a high-resolution wheel —
 * both of which are already smooth.
 */
export const CONTINUOUS_MAX_STEP_PX = 24;

/**
 * Smallest per-event pixel delta accepted as a notch when no legacy
 * `wheelDelta` is available to confirm it. Sits above the largest step a
 * touchpad produces at rest and below the smallest real detent.
 */
export const STEPPED_MIN_STEP_PX = 40;

/**
 * Classifies a single wheel event in isolation.
 *
 * Pure, and stateless by design — {@link WheelSourceDetector} adds the
 * per-gesture memory around it. Ordered from the most reliable signal to the
 * least:
 *
 * 1. **Non-pixel delta mode.** Only a notched wheel reports lines or pages.
 * 2. **Legacy tick alignment.** On Blink/WebKit, `wheelDeltaY` is a whole
 *    multiple of 120 for a detent and almost never for a touchpad swipe.
 * 3. **Magnitude.** Gecko's fallback: a sub-notch step is continuous by
 *    definition, and a full-size integral step is a notch.
 *
 * @param sample - The event's deltas, mode, and (optionally) legacy tick value.
 * @returns Which device the event most likely came from.
 */
export function classifyWheelSample(sample: WheelSample): WheelInputType {
  if (sample.deltaMode !== WheelDeltaMode.Pixel) return WheelInputType.Stepped;

  const step = Math.max(Math.abs(sample.deltaX), Math.abs(sample.deltaY));
  // A zero-delta event (gesture start/end filler) carries no evidence either
  // way. Reported as stepped so it cannot latch a gesture to continuous; the
  // caller discards zero deltas before they reach the scroller regardless.
  if (step === 0) return WheelInputType.Stepped;

  const ticks = sample.legacyWheelDelta === undefined ? 0 : Math.abs(sample.legacyWheelDelta);
  if (ticks > 0) {
    return ticks % LEGACY_WHEEL_NOTCH === 0 ? WheelInputType.Stepped : WheelInputType.Continuous;
  }

  if (step < CONTINUOUS_MAX_STEP_PX || !Number.isInteger(step)) return WheelInputType.Continuous;
  return step >= STEPPED_MIN_STEP_PX ? WheelInputType.Stepped : WheelInputType.Continuous;
}

/**
 * Per-gesture wheel-device classifier.
 *
 * Wraps {@link classifyWheelSample} with one piece of memory: once any event
 * in a gesture looks continuous, the rest of that gesture is continuous too.
 *
 * That asymmetry is deliberate. A touchpad flick accelerates, and its fastest
 * events can be as large and as evenly-spaced as a detent — so mid-gesture it
 * can look stepped. A notched wheel, by contrast, can never produce the small
 * fractional deltas that mark a gesture as continuous in the first place. Only
 * one direction of misclassification is therefore possible, and latching in
 * that direction removes it: a gesture is smoothed only while nothing about it
 * has contradicted "this is a mouse".
 *
 * One instance per {@link ScrollController}; a gesture ends after
 * {@link GESTURE_IDLE_MS} of silence, which is what lets a user move from the
 * touchpad to the mouse and get the right behaviour from the first notch.
 */
export class WheelSourceDetector {
  /** Timestamp of the last classified event; `-Infinity` before the first. */
  private lastEventAt = Number.NEGATIVE_INFINITY;
  /** Whether the gesture in progress has shown continuous-device behaviour. */
  private continuousGesture = false;

  /**
   * Classifies one event, in the context of the gesture it belongs to.
   *
   * @param sample - The event's deltas, mode, timestamp, and legacy tick value.
   * @returns The device driving the current gesture.
   */
  classify(sample: WheelSample): WheelInputType {
    if (sample.timeStamp - this.lastEventAt > GESTURE_IDLE_MS) this.continuousGesture = false;
    this.lastEventAt = sample.timeStamp;

    if (this.continuousGesture) return WheelInputType.Continuous;

    const kind = classifyWheelSample(sample);
    if (kind === WheelInputType.Continuous) this.continuousGesture = true;
    return kind;
  }

  /** Forgets the gesture in progress, so the next event is classified fresh. */
  reset(): void {
    this.lastEventAt = Number.NEGATIVE_INFINITY;
    this.continuousGesture = false;
  }
}
