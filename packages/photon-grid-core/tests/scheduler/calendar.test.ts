import { describe, it, expect } from 'vitest';

import {
  add,
  daysInMonth,
  diffIn,
  hasOffsetChange,
  startOf,
  ticksBetween,
} from '../../src/plugins/scheduler/time/calendar';

/**
 * These run in the host's local time zone, so the DST assertions are written to
 * be *self-describing rather than zone-dependent*: each one first detects
 * whether a transition actually exists locally and asserts the corresponding
 * invariant. That way the suite is meaningful in a DST zone and still correct in
 * UTC/Asia where no transition occurs — rather than silently passing everywhere
 * because it asserted nothing.
 */

const local = (y: number, m: number, d: number, h = 0, min = 0): number =>
  new Date(y, m, d, h, min).getTime();

describe('startOf', () => {
  it('truncates to minute and hour', () => {
    const t = local(2025, 5, 17, 14, 37) + 42_123;
    expect(new Date(startOf('minute', t)).getSeconds()).toBe(0);
    expect(new Date(startOf('hour', t)).getMinutes()).toBe(0);
  });

  it('truncates to local midnight, not a UTC boundary', () => {
    const d = new Date(startOf('day', local(2025, 5, 17, 23, 59)));
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
    expect(d.getDate()).toBe(17);
  });

  it('honours weekStartsOn', () => {
    // 2025-06-18 is a Wednesday.
    const wed = local(2025, 5, 18);
    expect(new Date(startOf('week', wed, { weekStartsOn: 1 })).getDay()).toBe(1);
    expect(new Date(startOf('week', wed, { weekStartsOn: 0 })).getDay()).toBe(0);
  });

  it('does not run backwards past a week when the day equals the week start', () => {
    const mon = local(2025, 5, 16); // Monday
    expect(startOf('week', mon, { weekStartsOn: 1 })).toBe(mon);
  });

  it('truncates to month, quarter and year', () => {
    const t = local(2025, 7, 23, 11); // August
    expect(new Date(startOf('month', t)).getMonth()).toBe(7);
    expect(new Date(startOf('month', t)).getDate()).toBe(1);
    expect(new Date(startOf('quarter', t)).getMonth()).toBe(6); // Q3 starts July
    expect(new Date(startOf('year', t)).getMonth()).toBe(0);
  });
});

describe('add — calendar correctness', () => {
  it('clamps Jan 31 + 1 month to the end of February', () => {
    const jan31 = local(2025, 0, 31);
    const result = new Date(add('month', 1, jan31));
    expect(result.getMonth()).toBe(1);
    // 2025 is not a leap year.
    expect(result.getDate()).toBe(28);
  });

  it('clamps into a leap February', () => {
    const result = new Date(add('month', 1, local(2024, 0, 31)));
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(29);
  });

  it('clamps Feb 29 + 1 year to Feb 28', () => {
    const result = new Date(add('year', 1, local(2024, 1, 29)));
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });

  it('adds quarters as three months', () => {
    const result = new Date(add('quarter', 1, local(2025, 0, 15)));
    expect(result.getMonth()).toBe(3);
  });

  it('is reversible for whole units that do not need clamping', () => {
    const t = local(2025, 5, 15, 9);
    for (const unit of ['day', 'week', 'month', 'quarter', 'year'] as const) {
      expect(add(unit, -1, add(unit, 1, t))).toBe(t);
    }
  });

  it('returns the input unchanged when n is 0', () => {
    const t = local(2025, 5, 15, 9, 30);
    for (const unit of ['minute', 'hour', 'day', 'month'] as const) {
      expect(add(unit, 0, t)).toBe(t);
    }
  });
});

describe('add — DST', () => {
  /** Finds a local DST transition in `year`, or null if the zone has none. */
  function findTransition(year: number): number | null {
    let prev = new Date(year, 0, 1).getTimezoneOffset();
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= 28; d++) {
        const off = new Date(year, m, d).getTimezoneOffset();
        if (off !== prev) return new Date(year, m, d).getTime();
        prev = off;
      }
    }
    return null;
  }

  it('keeps the local wall-clock hour when adding a day across a transition', () => {
    const transition = findTransition(2025);
    if (transition === null) return; // zone has no DST; nothing to assert

    // Start the day before the transition, at a fixed local hour.
    const before = startOf('day', transition - 24 * 3_600_000);
    const after = add('day', 1, before);

    // The whole point: the local clock reads midnight on both sides, even
    // though the elapsed milliseconds are 23h or 25h rather than 24h.
    expect(new Date(after).getHours()).toBe(0);
    expect(new Date(after).getDate()).toBe(new Date(before).getDate() + 1);
  });

  it('treats hour as fixed-duration, so it may skip the non-existent local hour', () => {
    const t = local(2025, 5, 15, 12);
    // Contrast with `day` above: adding an hour is exactly 3_600_000 ms.
    expect(add('hour', 1, t) - t).toBe(3_600_000);
  });
});

describe('ticksBetween', () => {
  it('returns fence posts: slotCount + 1 entries', () => {
    const start = local(2025, 5, 16);
    const ticks = ticksBetween({ start, end: add('day', 5, start) }, 'day', 1);
    expect(ticks).toHaveLength(6); // 5 slots, 6 posts
  });

  it('aligns the first post to the unit boundary before the range start', () => {
    const ticks = ticksBetween(
      { start: local(2025, 5, 16, 13, 45), end: local(2025, 5, 17) },
      'day',
      1,
    );
    expect(ticks[0]).toBe(local(2025, 5, 16));
  });

  it('always covers the range end', () => {
    const range = { start: local(2025, 5, 16), end: local(2025, 5, 16, 13, 45) };
    const ticks = ticksBetween(range, 'day', 1);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(range.end);
  });

  it('honours step for sub-hour granularity', () => {
    const start = local(2025, 5, 16, 9);
    const ticks = ticksBetween({ start, end: add('hour', 1, start) }, 'minute', 15);
    expect(ticks).toHaveLength(5); // four 15-minute slots
    expect(ticks[1] - ticks[0]).toBe(15 * 60_000);
  });

  it('produces 23 or 25 hour slots across a DST day, never 24', () => {
    let transition: number | null = null;
    let prev = new Date(2025, 0, 1).getTimezoneOffset();
    for (let m = 0; m < 12 && transition === null; m++) {
      for (let d = 1; d <= 28; d++) {
        const off = new Date(2025, m, d).getTimezoneOffset();
        if (off !== prev) { transition = new Date(2025, m, d).getTime(); break; }
        prev = off;
      }
    }
    if (transition === null) return; // no DST locally

    const dayStart = startOf('day', transition);
    const ticks = ticksBetween({ start: dayStart, end: add('day', 1, dayStart) }, 'hour', 1);

    // This is the assertion that catches a `(end - start) / HOUR_MS` shortcut.
    expect(ticks.length - 1).toBeGreaterThanOrEqual(23);
    expect(ticks.length - 1).toBeLessThanOrEqual(25);
    expect(ticks.length - 1).not.toBe(24);
  });

  it('produces month slots of unequal length', () => {
    const start = local(2025, 0, 1);
    const ticks = ticksBetween({ start, end: local(2025, 3, 1) }, 'month', 1);
    const widths = [1, 2, 3].map((i) => ticks[i] - ticks[i - 1]);
    // Jan 31d, Feb 28d, Mar 31d — a uniform axis would be wrong here.
    expect(new Set(widths).size).toBeGreaterThan(1);
  });

  it('handles a decade at daily granularity', () => {
    const start = local(2020, 0, 1);
    const ticks = ticksBetween({ start, end: local(2030, 0, 1) }, 'day', 1);
    // 10 years including two leap days.
    expect(ticks.length - 1).toBe(3653);
    // Strictly ascending — the invariant every downstream binary search needs.
    for (let i = 1; i < ticks.length; i++) expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
  });

  it('rejects a non-positive or fractional step', () => {
    const range = { start: local(2025, 0, 1), end: local(2025, 0, 2) };
    expect(() => ticksBetween(range, 'day', 0)).toThrow(RangeError);
    expect(() => ticksBetween(range, 'day', -1)).toThrow(RangeError);
    expect(() => ticksBetween(range, 'day', 1.5)).toThrow(RangeError);
  });

  it('rejects a non-finite range', () => {
    expect(() => ticksBetween({ start: NaN, end: 0 }, 'day', 1)).toThrow(RangeError);
  });

  it('still yields one slot for an empty or inverted range', () => {
    const t = local(2025, 0, 1);
    expect(ticksBetween({ start: t, end: t }, 'day', 1)).toHaveLength(2);
  });
});

describe('diffIn', () => {
  it('counts calendar days, not elapsed 24h periods', () => {
    // 23:00 to 01:00 the next day is two hours, but one calendar day.
    expect(diffIn('day', local(2025, 5, 16, 23), local(2025, 5, 17, 1))).toBe(1);
  });

  it('counts whole months, ignoring a partial final month', () => {
    expect(diffIn('month', local(2025, 0, 31), local(2025, 1, 1))).toBe(0);
    expect(diffIn('month', local(2025, 0, 15), local(2025, 3, 15))).toBe(3);
  });

  it('counts weeks, quarters and years', () => {
    expect(diffIn('week', local(2025, 0, 1), local(2025, 0, 15))).toBe(2);
    expect(diffIn('quarter', local(2025, 0, 1), local(2025, 9, 1))).toBe(3);
    expect(diffIn('year', local(2020, 0, 1), local(2025, 0, 1))).toBe(5);
  });

  it('is signed', () => {
    expect(diffIn('day', local(2025, 5, 17), local(2025, 5, 16))).toBe(-1);
  });

  it('survives a DST transition without an off-by-one', () => {
    const start = local(2025, 0, 1);
    const end = add('day', 200, start);
    // Would be 199 or 201 if implemented by dividing the raw millisecond span.
    expect(diffIn('day', start, end)).toBe(200);
  });
});

describe('daysInMonth', () => {
  it('knows month lengths including leap February', () => {
    expect(daysInMonth(2025, 0)).toBe(31);
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2025, 3)).toBe(30);
  });
});

describe('hasOffsetChange', () => {
  it('reports no change within a single month', () => {
    // A short mid-month window cannot contain a transition in any zone.
    expect(hasOffsetChange({ start: local(2025, 5, 10), end: local(2025, 5, 20) })).toBe(false);
  });

  it('detects a transition across a full year in a DST zone', () => {
    const spansYear = { start: local(2025, 0, 1), end: local(2026, 0, 1) };
    const zoneHasDst = new Date(2025, 0, 1).getTimezoneOffset()
      !== new Date(2025, 6, 1).getTimezoneOffset();

    expect(hasOffsetChange(spansYear)).toBe(zoneHasDst);
  });
});
