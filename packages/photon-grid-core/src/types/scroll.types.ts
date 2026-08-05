/**
 * Configuration for how input gestures are translated into scroll motion.
 *
 * Only the wheel needs configuring: touch panning is driven by the finger and
 * already continuous, and scrollbar drags are absolute. See
 * `renderer/wheel-source.ts` for why a mouse wheel and a touchpad are treated
 * as two different devices, and `renderer/smooth-scroll-animator.ts` for the
 * motion model these values tune.
 *
 * @packageDocumentation
 */

/** How a wheel gesture is applied to the grid's scroll offset. */
export enum WheelScrollMode {
  /**
   * Smooth a notched mouse wheel, apply a precision touchpad 1:1. The default,
   * and what a native scroll container does.
   */
  Auto = 'auto',
  /**
   * Smooth every wheel gesture, including touchpad ones. Adds input lag to
   * touchpad scrolling; use only when a host application deliberately wants
   * uniform motion.
   */
  Smooth = 'smooth',
  /**
   * Never smooth: every gesture is applied to the scroll offset the frame it
   * arrives. The pre-v2 behaviour.
   */
  Instant = 'instant',
}

/** Wheel-scrolling options. All fields optional; see {@link resolveScrollConfig}. */
export interface ScrollConfig {
  /**
   * Which gestures are animated.
   * @default WheelScrollMode.Auto
   */
  readonly wheelMode?: WheelScrollMode;

  /**
   * Time (ms) in which a smoothed wheel step covers ~95% of its distance.
   *
   * Low values feel snappier and closer to an instant jump; high values feel
   * heavier and add perceptible lag between the notch and the motion settling.
   * Clamped to `[0, `{@link MAX_SMOOTH_WHEEL_DURATION_MS}`]`; `0` is
   * equivalent to {@link WheelScrollMode.Instant}.
   *
   * @default 130
   */
  readonly smoothWheelDuration?: number;

  /**
   * Multiplier applied to the distance one mouse-wheel notch scrolls.
   *
   * `1` (the default) keeps the browser's own notch distance, so scrolling the
   * grid covers the same ground as scrolling the page around it. Lower it for
   * finer control over dense data; raise it to cross large datasets faster.
   * Only affects gestures classified as a notched wheel — touchpad deltas are
   * always applied 1:1, since the user is steering those directly. Clamped to
   * `[0.1, 5]`.
   *
   * @default 1
   */
  readonly wheelStepScale?: number;

  /**
   * When `true` (the default), `prefers-reduced-motion: reduce` turns wheel
   * smoothing off, matching how the OS setting suppresses smooth scrolling
   * natively. {@link WheelScrollMode.Smooth} is an explicit opt-in and is
   * honoured regardless.
   *
   * @default true
   */
  readonly respectReducedMotion?: boolean;
}

/** Default settle duration for a smoothed wheel step, in ms. */
export const DEFAULT_SMOOTH_WHEEL_DURATION_MS = 130;

/**
 * Upper bound on {@link ScrollConfig.smoothWheelDuration}.
 *
 * Past roughly a second the view is still visibly moving long after the user
 * has stopped scrolling, which reads as the grid being unresponsive rather
 * than as smoothness.
 */
export const MAX_SMOOTH_WHEEL_DURATION_MS = 1_000;

/** Bounds on {@link ScrollConfig.wheelStepScale}. */
export const MIN_WHEEL_STEP_SCALE = 0.1;
export const MAX_WHEEL_STEP_SCALE = 5;

/** A {@link ScrollConfig} with every field resolved. */
export interface ResolvedScrollConfig {
  readonly wheelMode: WheelScrollMode;
  readonly smoothWheelDuration: number;
  readonly wheelStepScale: number;
  readonly respectReducedMotion: boolean;
}

/**
 * Applies defaults to a partial {@link ScrollConfig}.
 *
 * Values are clamped rather than rejected: a grid that scrolls with a
 * corrected duration is a better failure mode than one that throws because a
 * settings service supplied `-1`.
 *
 * @param config - The application's configuration, if any.
 * @returns Every field resolved and within range.
 */
export function resolveScrollConfig(config: ScrollConfig = {}): ResolvedScrollConfig {
  const duration = config.smoothWheelDuration ?? DEFAULT_SMOOTH_WHEEL_DURATION_MS;
  const scale = config.wheelStepScale ?? 1;
  return {
    wheelMode: config.wheelMode ?? WheelScrollMode.Auto,
    smoothWheelDuration: Number.isFinite(duration)
      ? Math.min(Math.max(duration, 0), MAX_SMOOTH_WHEEL_DURATION_MS)
      : DEFAULT_SMOOTH_WHEEL_DURATION_MS,
    wheelStepScale: Number.isFinite(scale)
      ? Math.min(Math.max(scale, MIN_WHEEL_STEP_SCALE), MAX_WHEEL_STEP_SCALE)
      : 1,
    respectReducedMotion: config.respectReducedMotion !== false,
  };
}
