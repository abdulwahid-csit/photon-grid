import { describe, it, expect } from 'vitest';

import { EventIndex } from '../../src/plugins/scheduler/data/event-index';
import type { SchedulerEvent } from '../../src/plugins/scheduler/data/scheduler.types';
import { layoutLanes } from '../../src/plugins/scheduler/layout/lane-layout';
import {
  computeBarLayout,
  createBarLayoutScratch,
} from '../../src/plugins/scheduler/layout/bar-layout';
import { UniformAxis } from '../../src/plugins/scheduler/time/slot-axis';
import type { RenderWindow } from '../../src/plugins/plugin.types';
import type { RowNode } from '../../src/types/row.types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function ev(id: string, resourceId: string, start: number, end: number): SchedulerEvent {
  return { id, resourceId, start, end };
}

describe('EventIndex — queries', () => {
  const index = new EventIndex();
  index.load([
    ev('a', 'r1', 0, HOUR),
    ev('b', 'r1', 2 * HOUR, 3 * HOUR),
    ev('c', 'r1', 5 * HOUR, 6 * HOUR),
    ev('x', 'r2', 0, HOUR),
  ]);

  const q = (resource: string, t0: number, t1: number): string[] => {
    const out: number[] = [];
    index.query(resource, t0, t1, out);
    return out.map((h) => index.get(h)!.id).sort();
  };

  it('returns only events overlapping the range', () => {
    expect(q('r1', 0, 4 * HOUR)).toEqual(['a', 'b']);
  });

  it('partitions strictly by resource', () => {
    expect(q('r2', 0, 10 * HOUR)).toEqual(['x']);
    expect(q('r3', 0, 10 * HOUR)).toEqual([]);
  });

  it('treats intervals as half-open', () => {
    // An event ending exactly at t0 does not overlap [t0, t1).
    expect(q('r1', HOUR, 2 * HOUR)).toEqual([]);
    // An event starting exactly at t1 does not overlap either.
    expect(q('r1', HOUR, 2 * HOUR + 1)).toEqual(['b']);
  });

  it('finds a long event that started far before the window', () => {
    const long = new EventIndex();
    long.load([
      ev('short', 'r', 0, HOUR),
      // A year-long booking beginning at the very start of the timeline.
      ev('year', 'r', 0, 365 * DAY),
      ev('later', 'r', 300 * DAY, 300 * DAY + HOUR),
    ]);

    const out: number[] = [];
    long.query('r', 200 * DAY, 201 * DAY, out);

    // This is the max-end augmentation earning its keep: without it the scan
    // would have to start at index 0 to discover 'year'.
    expect(out.map((h) => long.get(h)!.id)).toEqual(['year']);
  });

  it('appends into the caller buffer without allocating', () => {
    const out: number[] = [];
    index.query('r1', 0, 4 * HOUR, out);
    const firstLength = out.length;
    index.query('r1', 0, 4 * HOUR, out);

    // Append semantics are what let the renderer reuse one scratch array.
    expect(out).toHaveLength(firstLength * 2);
  });
});

describe('EventIndex — mutation', () => {
  it('keeps queries correct after an in-place move', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r', 0, HOUR), ev('b', 'r', 5 * HOUR, 6 * HOUR)]);

    index.update({ ...ev('a', 'r', 2 * HOUR, 3 * HOUR) });

    const out: number[] = [];
    index.query('r', 0, HOUR, out);
    expect(out).toHaveLength(0);

    out.length = 0;
    index.query('r', 2 * HOUR, 3 * HOUR, out);
    expect(out.map((h) => index.get(h)!.id)).toEqual(['a']);
  });

  it('re-sorts when a move changes the ordering', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r', 0, HOUR), ev('b', 'r', HOUR, 2 * HOUR)]);

    // Move 'a' past 'b'.
    index.update({ ...ev('a', 'r', 10 * HOUR, 11 * HOUR) });

    const out: number[] = [];
    index.query('r', 0, 20 * HOUR, out);
    expect(out.map((h) => index.get(h)!.id).sort()).toEqual(['a', 'b']);
  });

  it('moves an event between resources', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r1', 0, HOUR)]);

    index.update({ ...ev('a', 'r2', 0, HOUR) });

    const from: number[] = [];
    index.query('r1', 0, HOUR, from);
    expect(from).toHaveLength(0);

    const to: number[] = [];
    index.query('r2', 0, HOUR, to);
    expect(to).toHaveLength(1);
  });

  it('adds and removes', () => {
    const index = new EventIndex();
    index.load([]);

    index.add(ev('a', 'r', 0, HOUR));
    expect(index.size).toBe(1);

    index.remove('a');
    const out: number[] = [];
    index.query('r', 0, HOUR, out);
    expect(out).toHaveLength(0);
  });

  it('bumps the resource epoch on mutation, so lane layouts can memoize', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r', 0, HOUR)]);

    const before = index.epochOf('r');
    index.update({ ...ev('a', 'r', HOUR, 2 * HOUR) });

    expect(index.epochOf('r')).toBeGreaterThan(before);
  });

  it('suppresses dragged events from queries without re-indexing', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r', 0, HOUR), ev('b', 'r', 0, HOUR)]);

    index.suppress([index.handleOf('a')]);

    const out: number[] = [];
    index.query('r', 0, HOUR, out);
    expect(out.map((h) => index.get(h)!.id)).toEqual(['b']);

    index.suppress([]);
    out.length = 0;
    index.query('r', 0, HOUR, out);
    expect(out).toHaveLength(2);
  });
});

describe('EventIndex — scale', () => {
  it('indexes 500k events and answers 60 queries well inside a frame', () => {
    const events: SchedulerEvent[] = [];
    const resources = 5000;
    const perResource = 100;

    for (let r = 0; r < resources; r++) {
      for (let i = 0; i < perResource; i++) {
        const start = i * 4 * HOUR;
        events.push(ev(`e${r}-${i}`, `r${r}`, start, start + 2 * HOUR));
      }
    }

    const index = new EventIndex();
    index.load(events);
    expect(index.size).toBe(resources * perResource);

    const out: number[] = [];
    const t0 = performance.now();
    // One frame's worth: the ~60 resources in a render window.
    for (let r = 0; r < 60; r++) {
      out.length = 0;
      index.query(`r${r}`, 40 * HOUR, 64 * HOUR, out);
    }
    const elapsed = performance.now() - t0;

    // Generous bound — the point is that it is nowhere near a 16ms frame, not
    // to pin an exact number on variable CI hardware.
    expect(elapsed).toBeLessThan(16);
  });
});

describe('layoutLanes', () => {
  const lanes = (input: Array<[number, number]>): ReturnType<typeof layoutLanes> =>
    layoutLanes(input.map(([start, end], i) => ({ id: i, start, end })));

  it('puts disjoint events all in lane 0', () => {
    const out = lanes([[0, 1], [2, 3], [4, 5]]);
    expect(out.map((p) => p.lane)).toEqual([0, 0, 0]);
    expect(out.map((p) => p.laneCount)).toEqual([1, 1, 1]);
  });

  it('stacks fully overlapping events', () => {
    const out = lanes([[0, 10], [0, 10], [0, 10]]);
    expect(out.map((p) => p.lane).sort()).toEqual([0, 1, 2]);
    expect(out.every((p) => p.laneCount === 3)).toBe(true);
  });

  it('does not overlap events that merely touch', () => {
    // Half-open: [0,5) and [5,10) are adjacent, not overlapping.
    const out = lanes([[0, 5], [5, 10]]);
    expect(out.map((p) => p.lane)).toEqual([0, 0]);
    expect(out.map((p) => p.laneCount)).toEqual([1, 1]);
  });

  it('gives a longer event the lower lane when starts tie', () => {
    const out = lanes([[0, 2], [0, 10]]);
    // The long one sorts first and takes lane 0, so it stays put as shorter
    // neighbours come and go during a scroll.
    expect(out[1].lane).toBe(0);
    expect(out[0].lane).toBe(1);
  });

  it('scopes laneCount to a cluster, not the whole row', () => {
    // A busy morning (3 concurrent) and a lone afternoon event.
    const out = lanes([[0, 10], [0, 10], [0, 10], [100, 110]]);

    expect(out[0].laneCount).toBe(3);
    // The afternoon event must render full height, not one third.
    expect(out[3].laneCount).toBe(1);
    expect(out[3].lane).toBe(0);
  });

  it('reuses a lane once its occupant has finished', () => {
    const out = lanes([[0, 10], [0, 5], [5, 10]]);
    // Third event fits in the lane the second one vacated at t=5.
    expect(out[2].lane).toBe(out[1].lane);
  });

  it('handles the empty and single cases', () => {
    expect(layoutLanes([])).toEqual([]);
    expect(lanes([[0, 1]])).toEqual([{ id: 0, lane: 0, laneCount: 1 }]);
  });

  it('handles zero-duration events without collapsing the row', () => {
    const out = lanes([[5, 5], [5, 5]]);
    expect(out.every((p) => p.laneCount >= 1)).toBe(true);
  });

  it('returns placements in input order', () => {
    const out = lanes([[100, 110], [0, 10]]);
    expect(out.map((p) => p.id)).toEqual([0, 1]);
  });
});

describe('computeBarLayout', () => {
  const axis = new UniformAxis(0, HOUR, 60, 48); // 48 hourly slots, 60px each

  function makeWindow(rows: RowNode[], rowOriginY: number, scrollLeft = 0): RenderWindow {
    return {
      startIndex: 0,
      endIndex: rows.length,
      rowOriginY,
      rows,
      rowHeight: 40,
      leftPinnedWidth: 200,
      rightPinnedWidth: 0,
      scroll: {
        scrollTop: 0, scrollLeft, viewportHeight: 400,
        viewportWidth: 600, contentHeight: 4000, contentWidth: axis.totalPx,
      },
      frame: 1,
    };
  }

  const row = (nodeId: string, top: number): RowNode =>
    ({ nodeId, top, type: 'data', data: {} } as unknown as RowNode);

  const resourceIdOf = (r: RowNode): string | null => r.nodeId;

  it('rebases tops against rowOriginY, not scrollTop', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r1', 0, 2 * HOUR)]);

    // The row sits at absolute y=5240 while the render window starts at 5000.
    const w = makeWindow([row('r1', 5240)], 5000);
    const { bars } = computeBarLayout(w, axis, index, resourceIdOf, createBarLayoutScratch());

    expect(bars).toHaveLength(1);
    // 240 (rebased) + 2 (row padding). Using raw row.top would give 5242 and
    // the bar would be a full render-window away from its row.
    expect(bars[0].top).toBe(242);
  });

  it('places left/width in absolute content space', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r1', 2 * HOUR, 4 * HOUR)]);

    const w = makeWindow([row('r1', 0)], 0);
    const { bars } = computeBarLayout(w, axis, index, resourceIdOf, createBarLayoutScratch());

    expect(bars[0].left).toBeCloseTo(120, 6); // 2 slots x 60px
    expect(bars[0].width).toBeCloseTo(120, 6);
  });

  it('produces identical geometry as the viewport scrolls horizontally', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r1', 2 * HOUR, 4 * HOUR)]);
    const scratch = createBarLayoutScratch();

    const atZero = computeBarLayout(makeWindow([row('r1', 0)], 0, 0), axis, index, resourceIdOf, scratch);
    const scrolled = computeBarLayout(makeWindow([row('r1', 0)], 0, 300), axis, index, resourceIdOf, scratch);

    // The acceptance criterion for "scrolling writes no styles": the layer's own
    // transform pans, so the bar's geometry must not change.
    expect(scrolled.bars[0].left).toBe(atZero.bars[0].left);
    expect(scrolled.bars[0].top).toBe(atZero.bars[0].top);
  });

  it('splits row height across lanes', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r1', 0, 2 * HOUR), ev('b', 'r1', 0, 2 * HOUR)]);

    const w = makeWindow([row('r1', 0)], 0);
    const { bars } = computeBarLayout(w, axis, index, resourceIdOf, createBarLayoutScratch());

    expect(bars).toHaveLength(2);
    expect(bars.every((b) => b.laneCount === 2)).toBe(true);
    // Second lane sits below the first.
    const tops = bars.map((b) => b.top).sort((x, y) => x - y);
    expect(tops[1]).toBeGreaterThan(tops[0]);
  });

  it('skips rows that are not resources', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r1', 0, HOUR)]);

    const w = makeWindow([row('group-1', 0), row('r1', 40)], 0);
    const { bars } = computeBarLayout(
      w, axis, index,
      (r) => (r.nodeId.startsWith('group') ? null : r.nodeId),
      createBarLayoutScratch(),
    );

    expect(bars).toHaveLength(1);
    expect(bars[0].resourceId).toBe('r1');
  });

  it('floors width so a tiny event stays visible', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r1', 0, 1000)]); // one second in an hourly view

    const w = makeWindow([row('r1', 0)], 0);
    const { bars } = computeBarLayout(
      w, axis, index, resourceIdOf, createBarLayoutScratch(), { minWidth: 3 },
    );

    expect(bars[0].width).toBe(3);
  });

  it('caps output and reports truncation', () => {
    const events: SchedulerEvent[] = [];
    const rows: RowNode[] = [];
    for (let r = 0; r < 50; r++) {
      rows.push(row(`r${r}`, r * 40));
      for (let i = 0; i < 20; i++) events.push(ev(`e${r}-${i}`, `r${r}`, i * HOUR, i * HOUR + HOUR));
    }

    const index = new EventIndex();
    index.load(events);

    const result = computeBarLayout(
      makeWindow(rows, 0), axis, index, resourceIdOf, createBarLayoutScratch(), { maxBars: 100 },
    );

    expect(result.bars.length).toBeLessThanOrEqual(100);
    expect(result.truncated).toBe(true);
  });

  it('keys bars by resource and event, so recycling cannot cross rows', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r1', 0, HOUR), ev('a2', 'r2', 0, HOUR)]);

    const w = makeWindow([row('r1', 0), row('r2', 40)], 0);
    const { bars } = computeBarLayout(w, axis, index, resourceIdOf, createBarLayoutScratch());

    expect(new Set(bars.map((b) => b.key)).size).toBe(2);
  });

  it('reuses scratch buffers across frames', () => {
    const index = new EventIndex();
    index.load([ev('a', 'r1', 0, HOUR)]);
    const scratch = createBarLayoutScratch();

    const w = makeWindow([row('r1', 0)], 0);
    for (let i = 0; i < 5; i++) {
      const { bars } = computeBarLayout(w, axis, index, resourceIdOf, scratch);
      // Stable output despite the shared buffers — no leakage between frames.
      expect(bars).toHaveLength(1);
    }
  });
});
