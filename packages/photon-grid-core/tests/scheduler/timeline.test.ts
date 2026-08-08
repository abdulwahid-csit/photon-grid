import { describe, it, expect } from 'vitest';

import {
  buildPrefixAxis,
  UniformAxis,
  visibleSlotWindow,
  visibleTimeRange,
} from '../../src/plugins/scheduler/time/slot-axis';
import {
  buildTimeline,
  buildTimelineFromView,
  TIMELINE_PRESETS,
} from '../../src/plugins/scheduler/time/timeline-engine';
import { HOUR_MS, MINUTE_MS } from '../../src/plugins/scheduler/time/calendar';

const local = (y: number, m: number, d: number, h = 0): number => new Date(y, m, d, h).getTime();

describe('UniformAxis', () => {
  const axis = new UniformAxis(local(2025, 5, 16), HOUR_MS, 60, 24);

  it('projects index, offset and time in closed form', () => {
    expect(axis.count).toBe(24);
    expect(axis.totalPx).toBe(24 * 60);
    expect(axis.offsetOf(5)).toBe(300);
    expect(axis.widthOf(5)).toBe(60);
    expect(axis.timeOf(5)).toBe(local(2025, 5, 16, 5));
  });

  it('round-trips px and time to sub-pixel accuracy', () => {
    for (let i = 0; i < axis.count; i++) {
      const t = axis.timeOf(i);
      expect(Math.abs(axis.timeAt(axis.pxAt(t)) - t)).toBeLessThan(1);
      expect(Math.abs(axis.pxAt(axis.timeAt(i * 60)) - i * 60)).toBeLessThan(0.5);
    }
  });

  it('clamps indexAt outside the axis rather than returning out-of-range', () => {
    expect(axis.indexAt(-500)).toBe(0);
    expect(axis.indexAt(99_999)).toBe(23);
  });

  it('interpolates within a slot', () => {
    const halfway = axis.startMs + HOUR_MS / 2;
    expect(axis.pxAt(halfway)).toBeCloseTo(30, 6);
  });

  it('handles a decade of minute slots without allocating', () => {
    const start = local(2020, 0, 1);
    const count = 10 * 365 * 24 * 60; // ~5.26M slots
    const big = new UniformAxis(start, MINUTE_MS, 2, count);

    expect(big.count).toBe(count);
    // The whole justification for this class: a materialised edge table here
    // would be ~42 MB of Float64Array.
    expect(big.offsetOf(count - 1)).toBe((count - 1) * 2);
    expect(big.indexAt(big.totalPx - 1)).toBe(count - 1);
  });

  it('rejects a degenerate slot size', () => {
    expect(() => new UniformAxis(0, 0, 10, 5)).toThrow(RangeError);
    expect(() => new UniformAxis(0, 1000, 0, 5)).toThrow(RangeError);
  });
});

describe('PrefixAxis', () => {
  // Three slots of deliberately unequal duration: 1h, 2h, 1h.
  const ticks = [0, HOUR_MS, 3 * HOUR_MS, 4 * HOUR_MS];

  it('gives every slot the same width in equal mode', () => {
    const axis = buildPrefixAxis(ticks, 100, false);
    expect(axis.count).toBe(3);
    expect(axis.totalPx).toBe(300);
    expect([0, 1, 2].map((i) => axis.widthOf(i))).toEqual([100, 100, 100]);
  });

  it('scales width with duration in proportional mode', () => {
    const axis = buildPrefixAxis(ticks, 100, true);
    const widths = [0, 1, 2].map((i) => axis.widthOf(i));
    // The 2h slot must be twice the 1h slots.
    expect(widths[1]).toBeCloseTo(widths[0] * 2, 6);
    expect(axis.totalPx).toBeCloseTo(300, 6);
  });

  it('round-trips px and time across unequal slots', () => {
    const axis = buildPrefixAxis(ticks, 100, true);
    for (const t of [0, HOUR_MS, 2 * HOUR_MS, 3.5 * HOUR_MS]) {
      expect(Math.abs(axis.timeAt(axis.pxAt(t)) - t)).toBeLessThan(1);
    }
  });

  it('finds the right slot by binary search', () => {
    const axis = buildPrefixAxis(ticks, 100, false);
    expect(axis.indexAt(0)).toBe(0);
    expect(axis.indexAt(150)).toBe(1);
    expect(axis.indexAt(299)).toBe(2);
    expect(axis.indexAt(-10)).toBe(0);
    expect(axis.indexAt(10_000)).toBe(2);
  });

  it('rejects malformed edge tables', () => {
    expect(() => buildPrefixAxis([0], 10, false)).toThrow(RangeError);
  });
});

describe('visibleSlotWindow', () => {
  const axis = new UniformAxis(0, HOUR_MS, 50, 100);

  it('covers the viewport plus a buffer on each side', () => {
    const w = visibleSlotWindow(axis, 500, 200, 2);
    // Viewport covers slots 10..13; buffer widens to 8..16.
    expect(w.start).toBe(8);
    expect(w.end).toBe(16);
  });

  it('clamps at the axis edges', () => {
    expect(visibleSlotWindow(axis, 0, 200, 2).start).toBe(0);
    expect(visibleSlotWindow(axis, axis.totalPx - 100, 200, 2).end).toBe(100);
  });

  it('returns an empty window for a zero-width viewport', () => {
    expect(visibleSlotWindow(axis, 0, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe('visibleTimeRange', () => {
  it('pads by half a viewport on each side, in pixels not slots', () => {
    const axis = new UniformAxis(0, MINUTE_MS, 2, 10_000);
    const r = visibleTimeRange(axis, 1000, 400);

    // A slot-based buffer would be 2 minutes here; this must be much wider so a
    // bar longer than the viewport does not pop at the edges.
    expect(r.start).toBeLessThan(axis.timeAt(1000));
    expect(r.end).toBeGreaterThan(axis.timeAt(1400));
    expect(axis.pxAt(r.start)).toBeCloseTo(800, 6);
    expect(axis.pxAt(r.end)).toBeCloseTo(1600, 6);
  });
});

describe('buildTimeline — axis selection', () => {
  it('uses the arithmetic axis for hour slots', () => {
    const start = local(2025, 5, 16);
    const t = buildTimeline({
      unit: 'hour', step: 1, slotWidth: 40,
      range: { start, end: local(2025, 5, 17) },
    });
    expect(t.axis).toBeInstanceOf(UniformAxis);
  });

  it('uses a materialised axis for month slots, which are never equal', () => {
    const t = buildTimeline({
      unit: 'month', step: 1, slotWidth: 80,
      range: { start: local(2025, 0, 1), end: local(2026, 0, 1) },
    });
    expect(t.axis).not.toBeInstanceOf(UniformAxis);
    expect(t.axis.count).toBe(12);
  });

  it('uses a materialised axis whenever widths are proportional', () => {
    const t = buildTimeline({
      unit: 'hour', step: 1, slotWidth: 40, slotWidthMode: 'proportional',
      range: { start: local(2025, 5, 16), end: local(2025, 5, 17) },
    });
    expect(t.axis).not.toBeInstanceOf(UniformAxis);
  });

  it('produces one slot per day over a month', () => {
    const t = buildTimeline({
      unit: 'day', step: 1, slotWidth: 32,
      range: { start: local(2025, 0, 1), end: local(2025, 1, 1) },
    });
    expect(t.axis.count).toBe(31);
  });
});

describe('buildTimeline — header bands', () => {
  it('spans the axis with band cells', () => {
    const t = buildTimeline({
      unit: 'day', step: 1, slotWidth: 30,
      range: { start: local(2025, 0, 1), end: local(2025, 3, 1) },
      headerBands: [{ unit: 'month', step: 1 }],
    });

    expect(t.bands).toHaveLength(1);
    expect(t.bands[0].cells).toHaveLength(3); // Jan, Feb, Mar

    // Cells tile the axis with no gap and no overlap.
    const cells = t.bands[0].cells;
    expect(cells[0].offsetPx).toBeCloseTo(0, 6);
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].offsetPx).toBeCloseTo(cells[i - 1].offsetPx + cells[i - 1].widthPx, 6);
    }
    const last = cells[cells.length - 1];
    expect(last.offsetPx + last.widthPx).toBeCloseTo(t.axis.totalPx, 6);
  });

  it('clips a partial first band cell rather than overhanging the axis', () => {
    const t = buildTimeline({
      unit: 'day', step: 1, slotWidth: 30,
      // Starts mid-January.
      range: { start: local(2025, 0, 20), end: local(2025, 2, 1) },
      headerBands: [{ unit: 'month', step: 1 }],
    });

    const first = t.bands[0].cells[0];
    expect(first.offsetPx).toBeCloseTo(0, 6);
    expect(first.startMs).toBe(t.axis.startMs);
    // January's cell is narrower than February's, because it is partial.
    expect(first.widthPx).toBeLessThan(t.bands[0].cells[1].widthPx);
  });

  it('supports multiple stacked bands', () => {
    const t = buildTimeline({
      unit: 'day', step: 1, slotWidth: 30,
      range: { start: local(2025, 0, 1), end: local(2025, 1, 1) },
      headerBands: [{ unit: 'month', step: 1 }, { unit: 'week', step: 1 }],
    });

    expect(t.bands).toHaveLength(2);
    expect(t.bands[0].cells).toHaveLength(1);          // one month
    expect(t.bands[1].cells.length).toBeGreaterThan(4); // ~5 weeks
  });
});

describe('view presets', () => {
  it('are configuration, not code paths', () => {
    // Every preset reduces to the same three fields — that is what lets one
    // engine serve every view.
    for (const preset of Object.values(TIMELINE_PRESETS)) {
      expect(preset).toHaveProperty('unit');
      expect(preset).toHaveProperty('step');
      expect(preset).toHaveProperty('headerBands');
    }
  });

  it('month view is days under a month band', () => {
    const t = buildTimelineFromView(
      'month',
      { start: local(2025, 0, 1), end: local(2025, 1, 1) },
      32,
    );
    expect(t.config.unit).toBe('day');
    expect(t.axis.count).toBe(31);
    expect(t.bands[0].unit).toBe('month');
  });

  it('day view is hours under a day band', () => {
    const t = buildTimelineFromView(
      'day',
      { start: local(2025, 5, 16), end: local(2025, 5, 17) },
      50,
    );
    expect(t.config.unit).toBe('hour');
    expect(t.axis.count).toBe(24);
  });

  it('accepts overrides, so a preset is a starting point not a straitjacket', () => {
    const t = buildTimelineFromView(
      'month',
      { start: local(2025, 0, 1), end: local(2025, 1, 1) },
      32,
      { slotWidthMode: 'proportional' },
    );
    expect(t.config.slotWidthMode).toBe('proportional');
  });
});
