/**
 * Wheel-device classification.
 *
 * The decision that separates "a notched wheel jumped the viewport 100px, ease
 * it" from "a finger is dragging the surface, do not touch it". Fixtures below
 * are the delta/tick shapes real engines emit, so a regression here shows up as
 * a failing device rather than as an abstract number.
 */

import { describe, expect, it } from 'vitest';
import {
  CONTINUOUS_MAX_STEP_PX,
  GESTURE_IDLE_MS,
  LEGACY_WHEEL_NOTCH,
  WheelDeltaMode,
  WheelInputType,
  WheelSourceDetector,
  classifyWheelSample,
  type WheelSample,
} from '../../src/renderer/wheel-source';

/** Builds a sample with pixel deltas, defaulting the fields a test does not care about. */
const sample = (over: Partial<WheelSample> = {}): WheelSample => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: WheelDeltaMode.Pixel,
  timeStamp: 0,
  ...over,
});

describe('classifyWheelSample — notched wheels', () => {
  it('classifies Gecko line-mode deltas as stepped', () => {
    // Firefox reports a mouse detent as three lines; touchpads never use this mode.
    expect(classifyWheelSample(sample({ deltaY: 3, deltaMode: WheelDeltaMode.Line })))
      .toBe(WheelInputType.Stepped);
  });

  it('classifies page-mode deltas as stepped', () => {
    expect(classifyWheelSample(sample({ deltaY: 1, deltaMode: WheelDeltaMode.Page })))
      .toBe(WheelInputType.Stepped);
  });

  it('classifies a Blink detent by its legacy tick count', () => {
    // Chrome/Edge: 100px per detent, wheelDeltaY = -120.
    expect(classifyWheelSample(sample({ deltaY: 100, legacyWheelDelta: 120 })))
      .toBe(WheelInputType.Stepped);
  });

  it('follows the ticks, not the pixels, at fractional page zoom', () => {
    // At 125% zoom Blink scales deltaY but not the device tick count — the
    // whole reason the legacy field is consulted first.
    expect(classifyWheelSample(sample({ deltaY: 125.5, legacyWheelDelta: 120 })))
      .toBe(WheelInputType.Stepped);
  });

  it('classifies a fast spin that coalesces several detents', () => {
    expect(classifyWheelSample(sample({ deltaY: 300, legacyWheelDelta: 360 })))
      .toBe(WheelInputType.Stepped);
  });

  it('classifies a horizontal detent, whose vertical ticks read zero', () => {
    expect(classifyWheelSample(sample({ deltaX: 100, legacyWheelDelta: 120 })))
      .toBe(WheelInputType.Stepped);
  });

  it('falls back on magnitude when no legacy ticks are reported', () => {
    expect(classifyWheelSample(sample({ deltaY: 100 }))).toBe(WheelInputType.Stepped);
  });
});

describe('classifyWheelSample — continuous devices', () => {
  it('classifies a touchpad by its unaligned tick count', () => {
    expect(classifyWheelSample(sample({ deltaY: 16, legacyWheelDelta: 48 })))
      .toBe(WheelInputType.Continuous);
  });

  it('classifies an accelerated touchpad flick, however large its delta', () => {
    // The case magnitude alone gets wrong: a flick can out-scroll a detent.
    expect(classifyWheelSample(sample({ deltaY: 240, legacyWheelDelta: 720 - 1 })))
      .toBe(WheelInputType.Continuous);
  });

  it('classifies sub-notch deltas as continuous without any tick data', () => {
    expect(classifyWheelSample(sample({ deltaY: CONTINUOUS_MAX_STEP_PX - 1 })))
      .toBe(WheelInputType.Continuous);
  });

  it('classifies fractional deltas as continuous without any tick data', () => {
    // Gecko's touchpad path: pixel mode, no legacy field, fractional deltas.
    expect(classifyWheelSample(sample({ deltaY: 42.75 }))).toBe(WheelInputType.Continuous);
  });

  it('classifies a high-resolution free-spin wheel as continuous', () => {
    // Hyper-scroll wheels emit a dense stream of small deltas — already smooth.
    expect(classifyWheelSample(sample({ deltaY: 7, legacyWheelDelta: 21 })))
      .toBe(WheelInputType.Continuous);
  });

  it('treats an unaligned tick count as continuous even at notch magnitude', () => {
    expect(classifyWheelSample(sample({ deltaY: 100, legacyWheelDelta: LEGACY_WHEEL_NOTCH - 1 })))
      .toBe(WheelInputType.Continuous);
  });
});

describe('WheelSourceDetector', () => {
  it('latches a gesture to continuous once any event looks continuous', () => {
    const detector = new WheelSourceDetector();
    // A touchpad flick: ramps up from small deltas into detent-sized ones.
    expect(detector.classify(sample({ deltaY: 3, legacyWheelDelta: 9, timeStamp: 0 })))
      .toBe(WheelInputType.Continuous);
    // Mid-flick this event is indistinguishable from a detent in isolation…
    expect(detector.classify(sample({ deltaY: 100, legacyWheelDelta: 120, timeStamp: 16 })))
      // …but the gesture it belongs to has already identified itself.
      .toBe(WheelInputType.Continuous);
  });

  it('never latches the other way — a wheel gesture stays classifiable per event', () => {
    const detector = new WheelSourceDetector();
    expect(detector.classify(sample({ deltaY: 100, legacyWheelDelta: 120, timeStamp: 0 })))
      .toBe(WheelInputType.Stepped);
    expect(detector.classify(sample({ deltaY: 4, legacyWheelDelta: 12, timeStamp: 16 })))
      .toBe(WheelInputType.Continuous);
  });

  it('starts a fresh gesture after an idle gap', () => {
    const detector = new WheelSourceDetector();
    detector.classify(sample({ deltaY: 3, legacyWheelDelta: 9, timeStamp: 0 }));
    // Hand moves from the touchpad to the mouse: the first detent after the
    // pause must be smoothed, not inherit the swipe's classification.
    expect(detector.classify(sample({
      deltaY: 100,
      legacyWheelDelta: 120,
      timeStamp: GESTURE_IDLE_MS + 1,
    }))).toBe(WheelInputType.Stepped);
  });

  it('keeps the gesture alive across events inside the idle window', () => {
    const detector = new WheelSourceDetector();
    detector.classify(sample({ deltaY: 3, legacyWheelDelta: 9, timeStamp: 0 }));
    expect(detector.classify(sample({
      deltaY: 100,
      legacyWheelDelta: 120,
      timeStamp: GESTURE_IDLE_MS - 1,
    }))).toBe(WheelInputType.Continuous);
  });

  it('classifies a sustained wheel spin as stepped throughout', () => {
    const detector = new WheelSourceDetector();
    for (let i = 0; i < 20; i++) {
      expect(detector.classify(sample({
        deltaY: 100,
        legacyWheelDelta: 120,
        timeStamp: i * 40,
      }))).toBe(WheelInputType.Stepped);
    }
  });

  it('classifies a sustained touchpad drag as continuous throughout', () => {
    const detector = new WheelSourceDetector();
    // Deltas typical of a two-finger drag: small, fractional, frame-paced.
    for (let i = 0; i < 20; i++) {
      expect(detector.classify(sample({
        deltaY: 2.5 + i * 0.75,
        legacyWheelDelta: (2.5 + i * 0.75) * 3,
        timeStamp: i * 8,
      }))).toBe(WheelInputType.Continuous);
    }
  });

  it('reset() forgets the gesture in progress', () => {
    const detector = new WheelSourceDetector();
    detector.classify(sample({ deltaY: 3, legacyWheelDelta: 9, timeStamp: 0 }));
    detector.reset();
    expect(detector.classify(sample({ deltaY: 100, legacyWheelDelta: 120, timeStamp: 8 })))
      .toBe(WheelInputType.Stepped);
  });

  it('lets a zero-delta filler event pass without latching anything', () => {
    const detector = new WheelSourceDetector();
    detector.classify(sample({ timeStamp: 0 }));
    expect(detector.classify(sample({ deltaY: 100, legacyWheelDelta: 120, timeStamp: 8 })))
      .toBe(WheelInputType.Stepped);
  });
});
