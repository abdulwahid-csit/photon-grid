/**
 * Smooth-scroll motion model.
 *
 * Covers the two properties the feel of mouse-wheel scrolling depends on: that
 * a step lands where it was aimed (no drift, no overshoot) and that it takes
 * the same wall-clock time regardless of the display's refresh rate.
 */

import { describe, expect, it } from 'vitest';
import { SmoothScrollAnimator, approachFactor, type SmoothScrollAxis } from '../../src/renderer/smooth-scroll-animator';

/** A scrollable axis backed by a plain number, clamped to `[0, max]`. */
class FakeAxis implements SmoothScrollAxis {
  value = 0;
  writes = 0;
  constructor(private readonly max: number) {}
  readonly get = (): number => this.value;
  readonly set = (v: number): void => { this.writes++; this.value = Math.max(0, Math.min(v, this.max)); };
  readonly clamp = (v: number): number => Math.max(0, Math.min(v, this.max));
}

/**
 * Deterministic stand-in for `requestAnimationFrame`.
 *
 * Frames only advance when a test says so, so the motion is examined
 * step-by-step instead of raced against a real clock.
 */
class FakeClock {
  private pending: ((t: number) => void) | null = null;
  private handle = 0;
  private cancelled = 0;
  now = 0;

  readonly request = (cb: (t: number) => void): number => {
    this.pending = cb;
    return ++this.handle;
  };

  readonly cancel = (): void => {
    if (this.pending) this.cancelled++;
    this.pending = null;
  };

  /** Runs one frame `dtMs` later. Returns `false` when nothing was scheduled. */
  tick(dtMs = 16.7): boolean {
    const cb = this.pending;
    if (!cb) return false;
    this.pending = null;
    this.now += dtMs;
    cb(this.now);
    return true;
  }

  /** Runs frames until the animation stops or `limit` frames elapse. */
  drain(dtMs = 16.7, limit = 600): number {
    let frames = 0;
    while (this.tick(dtMs) && frames < limit) frames++;
    return frames;
  }

  get isScheduled(): boolean { return this.pending !== null; }
  get cancelCount(): number { return this.cancelled; }
}

/** Builds an animator over two fake axes and a fake clock. */
const build = (durationMs = 130, maxX = 5_000, maxY = 5_000) => {
  const clock = new FakeClock();
  const x = new FakeAxis(maxX);
  const y = new FakeAxis(maxY);
  const animator = new SmoothScrollAnimator(
    { x, y, requestFrame: clock.request, cancelFrame: clock.cancel },
    durationMs,
  );
  return { animator, clock, x, y };
};

describe('approachFactor', () => {
  it('covers ~95% of the distance in one duration', () => {
    expect(approachFactor(130, 130)).toBeCloseTo(0.95, 2);
  });

  it('is frame-rate independent — two half-frames equal one whole frame', () => {
    // The property that keeps a 120Hz display from scrolling twice as fast.
    const whole = approachFactor(16, 130);
    const half = approachFactor(8, 130);
    const twice = 1 - (1 - half) * (1 - half);
    expect(twice).toBeCloseTo(whole, 12);
  });

  it('lands immediately when smoothing is disabled', () => {
    expect(approachFactor(16, 0)).toBe(1);
  });

  it('never exceeds the remaining distance', () => {
    for (const dt of [1, 16, 100, 10_000]) {
      const f = approachFactor(dt, 130);
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });
});

describe('SmoothScrollAnimator — a single step', () => {
  it('does not move the offset synchronously', () => {
    const { animator, y } = build();
    animator.glideBy(0, 100);
    // The whole point: the jump becomes motion across frames, not an instant write.
    expect(y.value).toBe(0);
    expect(animator.isActive()).toBe(true);
  });

  it('lands exactly on the target', () => {
    const { animator, clock, y } = build();
    animator.glideBy(0, 100);
    clock.drain();
    expect(y.value).toBe(100);
    expect(animator.isActive()).toBe(false);
  });

  it('never overshoots on the way there', () => {
    const { animator, clock, y } = build();
    animator.glideBy(0, 100);
    let previous = -1;
    while (clock.tick()) {
      expect(y.value).toBeGreaterThanOrEqual(previous);
      expect(y.value).toBeLessThanOrEqual(100);
      previous = y.value;
    }
  });

  it('decelerates — each frame covers less ground than the last', () => {
    const { animator, clock, y } = build();
    animator.glideBy(0, 400);
    const steps: number[] = [];
    let previous = 0;
    while (clock.tick()) {
      steps.push(y.value - previous);
      previous = y.value;
    }
    expect(steps.length).toBeGreaterThan(2);
    // Ease-out: the first frame is the biggest, and it only shrinks from there.
    for (let i = 1; i < steps.length - 1; i++) {
      expect(steps[i]).toBeLessThanOrEqual(steps[i - 1] + 1e-9);
    }
  });

  it('covers most of the distance within the configured duration', () => {
    const { animator, clock, y } = build(130);
    animator.glideBy(0, 300);
    while (clock.now < 130 && clock.tick()) { /* advance to the duration mark */ }
    // ~95% by definition of the settle constant; the remainder is a sub-pixel
    // tail that takes a few frames more to snap.
    expect(y.value).toBeGreaterThan(300 * 0.9);
    clock.drain();
    expect(clock.now).toBeLessThan(400);
  });

  it('reaches the same place at 30Hz and at 144Hz', () => {
    const slow = build();
    const fast = build();
    slow.animator.glideBy(0, 500);
    fast.animator.glideBy(0, 500);
    slow.clock.drain(33.3);
    fast.clock.drain(6.9);
    expect(slow.y.value).toBe(500);
    expect(fast.y.value).toBe(500);
    // And in comparable wall-clock time. Without frame-rate independence the
    // 144Hz glide would finish ~5x sooner, i.e. hundreds of ms apart.
    expect(Math.abs(slow.clock.now - fast.clock.now)).toBeLessThan(120);
  });

  it('runs both axes off one frame loop', () => {
    const { animator, clock, x, y } = build();
    animator.glideBy(120, 240);
    clock.drain();
    expect(x.value).toBe(120);
    expect(y.value).toBe(240);
  });
});

describe('SmoothScrollAnimator — steps arriving mid-glide', () => {
  it('accumulates onto the target instead of restarting', () => {
    const { animator, clock, y } = build();
    animator.glideBy(0, 100);
    clock.tick();
    animator.glideBy(0, 100);
    expect(animator.getTargetY()).toBe(200);
    clock.drain();
    // A fast spin must land on the sum of its notches, never on a subset.
    expect(y.value).toBe(200);
  });

  it('reverses cleanly when the user scrolls back', () => {
    const { animator, clock, y } = build();
    animator.glideBy(0, 400);
    clock.tick();
    clock.tick();
    animator.glideBy(0, -400);
    clock.drain();
    expect(y.value).toBeCloseTo(0, 6);
  });

  it('does not book a second frame loop for a second step', () => {
    const { animator, clock } = build();
    animator.glideBy(0, 100);
    animator.glideBy(0, 100);
    animator.glideBy(0, 100);
    expect(clock.cancelCount).toBe(0);
    expect(clock.isScheduled).toBe(true);
  });
});

describe('SmoothScrollAnimator — boundaries', () => {
  it('clamps the target to the scrollable range', () => {
    const { animator, clock, y } = build(130, 5_000, 1_000);
    animator.glideBy(0, 4_000);
    expect(animator.getTargetY()).toBe(1_000);
    clock.drain();
    expect(y.value).toBe(1_000);
  });

  it('does not bank distance past the end that would have to be unwound', () => {
    const { animator, clock, y } = build(130, 5_000, 1_000);
    // Ten notches into the last screen of the dataset…
    for (let i = 0; i < 10; i++) animator.glideBy(0, 500);
    clock.drain();
    expect(y.value).toBe(1_000);
    // …then one notch back up must move the view, not just spend banked credit.
    animator.glideBy(0, -100);
    clock.drain();
    expect(y.value).toBe(900);
  });

  it('stops scheduling frames once an axis pins at an edge', () => {
    const { animator, clock, y } = build(130, 5_000, 0);
    animator.glideBy(0, 400);
    clock.drain();
    expect(y.value).toBe(0);
    expect(animator.isActive()).toBe(false);
    expect(clock.isScheduled).toBe(false);
  });

  it('reports the live offset as the target when idle', () => {
    const { animator, y } = build();
    y.value = 640;
    expect(animator.getTargetY()).toBe(640);
  });
});

describe('SmoothScrollAnimator — yielding to other input', () => {
  it('cancel() stops the glide where it stands', () => {
    const { animator, clock, y } = build();
    animator.glideBy(0, 1_000);
    clock.tick();
    const interrupted = y.value;
    animator.cancel();
    expect(clock.isScheduled).toBe(false);
    expect(animator.isActive()).toBe(false);
    clock.drain();
    // Whatever moved the view instead keeps it — no snap back to the target.
    expect(y.value).toBe(interrupted);
  });

  it('cancel() releases the pending frame rather than leaking it', () => {
    const { animator, clock } = build();
    animator.glideBy(0, 1_000);
    animator.cancel();
    expect(clock.cancelCount).toBe(1);
  });

  it('is reusable after a cancel', () => {
    const { animator, clock, y } = build();
    animator.glideBy(0, 1_000);
    clock.tick();
    animator.cancel();
    const expected = y.value + 100;
    animator.glideBy(0, 100);
    clock.drain();
    expect(y.value).toBeCloseTo(expected, 6);
  });

  it('destroy() is cancel', () => {
    const { animator, clock } = build();
    animator.glideBy(0, 1_000);
    animator.destroy();
    expect(clock.isScheduled).toBe(false);
  });
});

describe('SmoothScrollAnimator — resilience', () => {
  it('does not teleport after a long frame gap', () => {
    const { animator, clock, y } = build();
    animator.glideBy(0, 1_000);
    clock.tick();
    const afterFirst = y.value;
    // Tab backgrounded for two seconds, then resumed.
    clock.tick(2_000);
    // The clamp keeps that from collapsing the whole glide into one jump…
    expect(y.value).toBeLessThan(1_000);
    // …while still making real progress.
    expect(y.value).toBeGreaterThan(afterFirst);
  });

  it('honours a duration change mid-glide', () => {
    const { animator, clock, y } = build(500);
    animator.glideBy(0, 100);
    animator.setDuration(0);
    clock.tick();
    expect(y.value).toBe(100);
  });

  it('writes nothing and schedules nothing for a zero delta', () => {
    const { animator, clock, y } = build();
    animator.glideBy(0, 0);
    expect(y.writes).toBe(0);
    expect(clock.isScheduled).toBe(false);
  });

  it('falls back to the platform animation-frame API when none is injected', () => {
    // The suite runs in the `node` environment, which has no rAF — stand one up
    // to prove the default wiring reaches the platform rather than nothing.
    const g = globalThis as unknown as {
      requestAnimationFrame?: (cb: (t: number) => void) => number;
      cancelAnimationFrame?: (handle: number) => void;
    };
    const previousRequest = g.requestAnimationFrame;
    const previousCancel = g.cancelAnimationFrame;
    let requested = 0;
    g.requestAnimationFrame = () => { requested++; return 1; };
    g.cancelAnimationFrame = () => { /* not exercised here */ };
    try {
      const axis = new FakeAxis(1_000);
      new SmoothScrollAnimator({ x: axis, y: axis }, 130).glideBy(0, 100);
      expect(requested).toBe(1);
    } finally {
      g.requestAnimationFrame = previousRequest;
      g.cancelAnimationFrame = previousCancel;
    }
  });
});
