/**
 * Scroll-configuration resolution.
 *
 * Every field is clamped rather than rejected: a grid that scrolls with a
 * corrected value beats one that refuses to start because a settings service
 * handed it a `-1`.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SMOOTH_WHEEL_DURATION_MS,
  MAX_SMOOTH_WHEEL_DURATION_MS,
  MAX_WHEEL_STEP_SCALE,
  MIN_WHEEL_STEP_SCALE,
  WheelScrollMode,
  resolveScrollConfig,
} from '../../src/types/scroll.types';

describe('resolveScrollConfig — defaults', () => {
  it('smooths a notched wheel and leaves touchpads alone, with no configuration', () => {
    expect(resolveScrollConfig()).toEqual({
      wheelMode: WheelScrollMode.Auto,
      smoothWheelDuration: DEFAULT_SMOOTH_WHEEL_DURATION_MS,
      wheelStepScale: 1,
      respectReducedMotion: true,
    });
  });

  it('resolves an empty object the same way as no argument at all', () => {
    expect(resolveScrollConfig({})).toEqual(resolveScrollConfig());
  });

  it('keeps the browser notch distance by default', () => {
    // A grid must cover the same ground per detent as the page around it.
    expect(resolveScrollConfig().wheelStepScale).toBe(1);
  });
});

describe('resolveScrollConfig — overrides', () => {
  it('takes an explicit mode', () => {
    expect(resolveScrollConfig({ wheelMode: WheelScrollMode.Instant }).wheelMode)
      .toBe(WheelScrollMode.Instant);
  });

  it('takes an explicit duration', () => {
    expect(resolveScrollConfig({ smoothWheelDuration: 90 }).smoothWheelDuration).toBe(90);
  });

  it('accepts zero duration as an instant-scroll opt-out', () => {
    expect(resolveScrollConfig({ smoothWheelDuration: 0 }).smoothWheelDuration).toBe(0);
  });

  it('takes an explicit step scale', () => {
    expect(resolveScrollConfig({ wheelStepScale: 0.5 }).wheelStepScale).toBe(0.5);
  });

  it('turns off the reduced-motion opt-out only for an explicit false', () => {
    expect(resolveScrollConfig({ respectReducedMotion: false }).respectReducedMotion).toBe(false);
    expect(resolveScrollConfig({ respectReducedMotion: true }).respectReducedMotion).toBe(true);
  });
});

describe('resolveScrollConfig — clamping', () => {
  it('clamps a negative duration to zero', () => {
    expect(resolveScrollConfig({ smoothWheelDuration: -50 }).smoothWheelDuration).toBe(0);
  });

  it('clamps an absurd duration to the ceiling', () => {
    expect(resolveScrollConfig({ smoothWheelDuration: 60_000 }).smoothWheelDuration)
      .toBe(MAX_SMOOTH_WHEEL_DURATION_MS);
  });

  it('clamps the step scale into its usable range', () => {
    expect(resolveScrollConfig({ wheelStepScale: 0 }).wheelStepScale).toBe(MIN_WHEEL_STEP_SCALE);
    expect(resolveScrollConfig({ wheelStepScale: -3 }).wheelStepScale).toBe(MIN_WHEEL_STEP_SCALE);
    expect(resolveScrollConfig({ wheelStepScale: 50 }).wheelStepScale).toBe(MAX_WHEEL_STEP_SCALE);
  });

  it('falls back to the defaults for non-finite numbers', () => {
    // NaN survives every comparison, so it would otherwise poison the
    // integrator and freeze the view permanently.
    expect(resolveScrollConfig({ smoothWheelDuration: Number.NaN }).smoothWheelDuration)
      .toBe(DEFAULT_SMOOTH_WHEEL_DURATION_MS);
    expect(resolveScrollConfig({ wheelStepScale: Number.POSITIVE_INFINITY }).wheelStepScale).toBe(1);
  });
});
