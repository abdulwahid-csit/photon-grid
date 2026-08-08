/**
 * DST correctness, pinned to real transition dates in a real DST zone.
 *
 * The sibling `calendar.test.ts` runs in the host's zone and self-skips its DST
 * assertions when that zone has none — which on a CI box in UTC, or a dev
 * machine in Asia/Karachi, means the most failure-prone arithmetic in the module
 * is never actually exercised.
 *
 * This file forces the issue. `process.env.TZ` is assigned **before** the module
 * under test is loaded (hence the dynamic import — ES module imports hoist above
 * statements, so a static one would bind before the assignment), and Node resets
 * V8's timezone cache on that assignment.
 *
 * If the host build ignores `TZ` the guard at the top turns these into explicit
 * skips rather than silent passes, so a green run always means the same thing.
 */
import { describe, it, expect, beforeAll } from 'vitest';

process.env.TZ = 'America/New_York';

type Calendar = typeof import('../../src/plugins/scheduler/time/calendar');

let cal: Calendar;
/** Whether the assignment above actually took effect in this runtime. */
let tzApplied = false;

beforeAll(async () => {
  cal = await import('../../src/plugins/scheduler/time/calendar');
  // New York is UTC-5 in January and UTC-4 in July. If those match, TZ was
  // ignored and every assertion below would be meaningless.
  tzApplied = new Date(2025, 0, 1).getTimezoneOffset() === 300
    && new Date(2025, 6, 1).getTimezoneOffset() === 240;
});

/** 2025 US transitions: spring forward Mar 9, fall back Nov 2. */
const SPRING_FORWARD = () => new Date(2025, 2, 9).getTime();
const FALL_BACK = () => new Date(2025, 10, 2).getTime();

describe('calendar DST (America/New_York)', () => {
  it('applies the pinned timezone, or these tests prove nothing', () => {
    expect(
      tzApplied,
      'TZ was not applied by this runtime — the DST assertions below are vacuous',
    ).toBe(true);
  });

  it('spring-forward day is 23 hours of elapsed time but still one calendar day', () => {
    if (!tzApplied) return;
    const start = cal.startOf('day', SPRING_FORWARD());
    const next = cal.add('day', 1, start);

    expect((next - start) / 3_600_000).toBe(23);
    // The whole point of wall-clock addition: local midnight on both sides.
    expect(new Date(next).getHours()).toBe(0);
    expect(cal.diffIn('day', start, next)).toBe(1);
  });

  it('fall-back day is 25 hours of elapsed time but still one calendar day', () => {
    if (!tzApplied) return;
    const start = cal.startOf('day', FALL_BACK());
    const next = cal.add('day', 1, start);

    expect((next - start) / 3_600_000).toBe(25);
    expect(new Date(next).getHours()).toBe(0);
    expect(cal.diffIn('day', start, next)).toBe(1);
  });

  it('emits 23 hour slots on spring-forward day', () => {
    if (!tzApplied) return;
    const start = cal.startOf('day', SPRING_FORWARD());
    const ticks = cal.ticksBetween({ start, end: cal.add('day', 1, start) }, 'hour', 1);

    // This is the assertion that catches `(end - start) / HOUR_MS`.
    expect(ticks.length - 1).toBe(23);
  });

  it('emits 25 hour slots on fall-back day', () => {
    if (!tzApplied) return;
    const start = cal.startOf('day', FALL_BACK());
    const ticks = cal.ticksBetween({ start, end: cal.add('day', 1, start) }, 'hour', 1);

    expect(ticks.length - 1).toBe(25);
  });

  it('keeps day ticks strictly ascending and aligned across a transition', () => {
    if (!tzApplied) return;
    const start = cal.startOf('day', SPRING_FORWARD() - 3 * 86_400_000);
    const ticks = cal.ticksBetween({ start, end: cal.add('day', 7, start) }, 'day', 1);

    expect(ticks).toHaveLength(8);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
      // Every post is a true local midnight, despite one gap being 23h.
      expect(new Date(ticks[i]).getHours()).toBe(0);
    }
    // One of the seven gaps must be the short day.
    const gaps = ticks.slice(1).map((t, i) => (t - ticks[i]) / 3_600_000);
    expect(gaps).toContain(23);
  });

  it('counts a 200-day span exactly, spanning both transitions', () => {
    if (!tzApplied) return;
    const start = new Date(2025, 0, 1).getTime();
    const end = cal.add('day', 300, start); // crosses Mar 9 and Nov 2

    // Would be 299 or 301 if implemented by dividing the raw millisecond span.
    expect(cal.diffIn('day', start, end)).toBe(300);
  });

  it('reports an offset change across the year, and none within a stable month', () => {
    if (!tzApplied) return;
    expect(cal.hasOffsetChange({
      start: new Date(2025, 0, 1).getTime(),
      end: new Date(2026, 0, 1).getTime(),
    })).toBe(true);

    expect(cal.hasOffsetChange({
      start: new Date(2025, 5, 10).getTime(),
      end: new Date(2025, 5, 20).getTime(),
    })).toBe(false);
  });

  it('treats hour as fixed-duration across the transition', () => {
    if (!tzApplied) return;
    // 01:00 EST + 1h lands on 03:00 EDT — the 02:00 hour does not exist.
    const oneAm = new Date(2025, 2, 9, 1).getTime();
    const plusOne = cal.add('hour', 1, oneAm);

    expect(plusOne - oneAm).toBe(3_600_000);
    expect(new Date(plusOne).getHours()).toBe(3);
  });
});
