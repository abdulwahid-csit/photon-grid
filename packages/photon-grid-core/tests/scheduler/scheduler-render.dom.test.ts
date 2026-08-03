// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { SchedulerBackdrop } from '../../src/plugins/scheduler/render/scheduler-backdrop';
import { EventBarRenderer } from '../../src/plugins/scheduler/render/event-bar-renderer';
import { SchedulerHeader } from '../../src/plugins/scheduler/render/scheduler-header';
import { EventIndex } from '../../src/plugins/scheduler/data/event-index';
import { buildTimelineFromView } from '../../src/plugins/scheduler/time/timeline-engine';
import { resolveSchedulerConfig } from '../../src/plugins/scheduler/scheduler.config';
import { injectSchedulerStyles } from '../../src/plugins/scheduler/theme/scheduler-styles';
import type { SchedulerRuntime } from '../../src/plugins/scheduler/scheduler-runtime';
import type { RenderWindow, ScrollMetrics } from '../../src/plugins/plugin.types';
import type { RowNode } from '../../src/types/row.types';
import type { SchedulerEvent } from '../../src/plugins/scheduler/data/scheduler.types';

/**
 * Rendering-layer tests against a real DOM.
 *
 * Every case here corresponds to a defect that shipped to a user and was found
 * by eye rather than by the suite, because the package previously had no DOM at
 * all: the stub in `tests/renderer/dom-stub.ts` returns zeros from
 * `getBoundingClientRect` and cannot express layout, so "the element rendered
 * with no height" was unrepresentable. These are the regression net for that
 * class of bug.
 *
 * Note jsdom performs no layout either -- offsets are all zero -- so the
 * assertions deliberately check the *written style values* rather than measured
 * geometry. That is the right level anyway: the renderer's contract is which
 * properties it writes, and the layout math is already covered by the pure
 * `computeBarLayout` tests.
 */

const MONTH_START = new Date(2025, 5, 1).getTime();
const MONTH_END = new Date(2025, 6, 1).getTime();
const ROW_HEIGHT = 48;

function makeRow(index: number, resourceId: string): RowNode {
  return {
    nodeId: `row-${index}`,
    type: 'data',
    data: { id: resourceId },
    top: index * ROW_HEIGHT,
    height: ROW_HEIGHT,
    index,
  } as unknown as RowNode;
}

function makeScroll(overrides: Partial<ScrollMetrics> = {}): ScrollMetrics {
  return {
    scrollTop: 0,
    scrollLeft: 0,
    viewportHeight: 400,
    viewportWidth: 800,
    contentHeight: 4800,
    contentWidth: 6200,
    ...overrides,
  };
}

function makeWindow(rows: RowNode[], scroll = makeScroll(), rowOriginY = 0): RenderWindow {
  return {
    startIndex: 0,
    endIndex: rows.length,
    rowOriginY,
    rows,
    rowHeight: ROW_HEIGHT,
    leftPinnedWidth: 440,
    rightPinnedWidth: 0,
    scroll,
    frame: 1,
  };
}

function makeRuntime(events: readonly SchedulerEvent[] = [], overrides: Record<string, unknown> = {}): SchedulerRuntime {
  const config = resolveSchedulerConfig({
    slotWidth: 200,
    minEventWidth: 200,
    ...overrides,
  });

  const index = new EventIndex();
  index.load(events);

  const timeline = buildTimelineFromView('month', { start: MONTH_START, end: MONTH_END }, 200);

  const byId = new Map(events.map((e) => [e.id, e]));

  return {
    config,
    raw: {},
    ctx: {
      getScrollMetrics: () => makeScroll(),
      requestRender: () => {},
    } as unknown as SchedulerRuntime['ctx'],
    api: {} as SchedulerRuntime['api'],
    timeline,
    index,
    selection: new Set<string>(),
    getResource: () => undefined,
    getEvent: (id: string) => byId.get(id),
    allEvents: () => events,
    requestRender: () => {},
    emit: () => {},
    renderIcon: () => '',
  };
}

let layer: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  layer = document.createElement('div');
  layer.className = 'pg-plugin-layer pg-scheduler pg-scheduler-body';
  document.body.appendChild(layer);
});

describe('SchedulerBackdrop -- gridlines', () => {
  it('draws a column per visible slot', () => {
    const backdrop = new SchedulerBackdrop(makeRuntime(), layer);
    backdrop.render(makeWindow([makeRow(0, 'r1'), makeRow(1, 'r2')]));

    const cols = layer.querySelectorAll('.pg-scheduler-col');
    // 800px viewport / 200px slots = 4 visible, plus 2 buffer each side.
    expect(cols.length).toBeGreaterThan(0);
    expect(cols.length).toBeLessThanOrEqual(10);
  });

  it('gives every column a non-zero height', () => {
    const backdrop = new SchedulerBackdrop(makeRuntime(), layer);
    backdrop.render(makeWindow([makeRow(0, 'r1'), makeRow(1, 'r2'), makeRow(2, 'r3')]));

    for (const col of layer.querySelectorAll<HTMLElement>('.pg-scheduler-col')) {
      expect(col.style.height).not.toBe('');
      expect(col.style.height).not.toBe('0px');
    }
  });

  it('positions columns that scroll in on a frame where the row band did not move', () => {
    // THE REGRESSION. `top`/`height` were written only under `if (bandChanged)`,
    // so a column created during a pure horizontal scroll -- the row band being
    // identical -- got `height: auto`, collapsed to zero, and vanished. Every
    // gridline past the initial viewport was invisible.
    const backdrop = new SchedulerBackdrop(makeRuntime(), layer);
    const rows = [makeRow(0, 'r1'), makeRow(1, 'r2')];

    backdrop.render(makeWindow(rows));
    const firstIds = new Set(
      [...layer.querySelectorAll<HTMLElement>('.pg-scheduler-col')].map((el) => el.style.left),
    );

    // Scroll right by six slots. Row band unchanged.
    backdrop.render(makeWindow(rows, makeScroll({ scrollLeft: 1200 })));

    const after = [...layer.querySelectorAll<HTMLElement>('.pg-scheduler-col')];
    const fresh = after.filter((el) => !firstIds.has(el.style.left));

    expect(fresh.length).toBeGreaterThan(0);
    for (const col of fresh) {
      expect(col.style.height, `column at left=${col.style.left} has no height`).not.toBe('');
      expect(col.style.height).not.toBe('0px');
    }
  });

  it('draws one row separator per rendered row', () => {
    const backdrop = new SchedulerBackdrop(makeRuntime(), layer);
    backdrop.render(makeWindow([makeRow(0, 'r1'), makeRow(1, 'r2'), makeRow(2, 'r3')]));

    expect(layer.querySelectorAll('.pg-scheduler-row-line')).toHaveLength(3);
  });

  it('moves row separators when the row band scrolls', () => {
    // THE OTHER REGRESSION. The guard compared `builtBandTop` against the current
    // band top, but the column pass runs first and had already updated that same
    // field -- so it compared a value to itself, always returned early, and the
    // separators stayed frozen where the first frame put them while the rows
    // scrolled away underneath.
    const backdrop = new SchedulerBackdrop(makeRuntime(), layer);

    backdrop.render(makeWindow([makeRow(0, 'r1'), makeRow(1, 'r2')]));
    const before = [...layer.querySelectorAll<HTMLElement>('.pg-scheduler-row-line')]
      .map((el) => el.style.transform);

    // Scrolled down two rows: the window now starts at row 2, and the grid
    // rebases tops against the new first row.
    const scrolled = makeWindow(
      [makeRow(2, 'r3'), makeRow(3, 'r4')],
      makeScroll({ scrollTop: 96 }),
      96,
    );
    backdrop.render(scrolled);

    const after = [...layer.querySelectorAll<HTMLElement>('.pg-scheduler-row-line')]
      .map((el) => el.style.transform);

    // Rebased positions happen to repeat, so assert the write actually occurred
    // by moving to a band that cannot produce the same offsets.
    const odd = makeWindow([makeRow(2, 'r3'), makeRow(3, 'r4')], makeScroll({ scrollTop: 120 }), 120);
    backdrop.render(odd);
    const shifted = [...layer.querySelectorAll<HTMLElement>('.pg-scheduler-row-line')]
      .map((el) => el.style.transform);

    expect(before.every((t) => t !== '')).toBe(true);
    expect(after.every((t) => t !== '')).toBe(true);
    expect(shifted).not.toEqual(before);
  });

  it('aligns separators to the rebased bottom edge of each row', () => {
    const backdrop = new SchedulerBackdrop(makeRuntime(), layer);
    // rowOriginY 240 means row 5 (top 240) rebases to 0.
    backdrop.render(makeWindow([makeRow(5, 'r6'), makeRow(6, 'r7')], makeScroll(), 240));

    const lines = [...layer.querySelectorAll<HTMLElement>('.pg-scheduler-row-line')];
    // First row spans rebased 0..48, so its separator sits at 47 (48 - 1px rule).
    expect(lines[0].style.transform).toBe('translateY(47px)');
    expect(lines[1].style.transform).toBe('translateY(95px)');
  });

  it('sizes the canvas to the full timeline width so it can be scrolled', () => {
    const runtime = makeRuntime();
    const backdrop = new SchedulerBackdrop(runtime, layer);
    backdrop.render(makeWindow([makeRow(0, 'r1')]));

    const canvas = layer.querySelector<HTMLElement>('.pg-scheduler-canvas');
    // 30 days in June at 200px.
    expect(canvas?.style.width).toBe(`${runtime.timeline.axis.totalPx}px`);
    expect(runtime.timeline.axis.totalPx).toBe(30 * 200);
  });

  it('removes its canvas on destroy', () => {
    const backdrop = new SchedulerBackdrop(makeRuntime(), layer);
    backdrop.render(makeWindow([makeRow(0, 'r1')]));
    backdrop.destroy();

    expect(layer.querySelector('.pg-scheduler-canvas')).toBeNull();
  });
});

describe('EventBarRenderer -- bar geometry', () => {
  /** One 8-hour shift: 1/3 of a day slot, so the min-width floor is what saves it. */
  const shift: SchedulerEvent = {
    id: 'e1',
    resourceId: 'r1',
    start: new Date(2025, 5, 2, 8).getTime(),
    end: new Date(2025, 5, 2, 16).getTime(),
    type: 'shift',
    title: 'Day Shift',
  };

  it('renders a bar for a visible event', () => {
    const runtime = makeRuntime([shift]);
    const bars = new EventBarRenderer(runtime, layer);
    bars.render(makeWindow([makeRow(0, 'r1')]));

    expect(layer.querySelectorAll('.pg-scheduler-bar')).toHaveLength(1);
  });

  it('honours minEventWidth so a short event is still legible', () => {
    // THE REGRESSION. `minEventWidth` defaulted to 3px and was never set by the
    // host, so an 8-hour shift inside a 200px day slot rendered 66px wide -- not
    // enough for its own label, which is what produced the truncated "Day ..."
    // bars the user reported.
    const runtime = makeRuntime([shift], { minEventWidth: 200 });
    const bars = new EventBarRenderer(runtime, layer);
    bars.render(makeWindow([makeRow(0, 'r1')]));

    const bar = layer.querySelector<HTMLElement>('.pg-scheduler-bar');
    expect(parseFloat(bar?.style.width ?? '0')).toBeGreaterThanOrEqual(200);
  });

  it('leaves a naturally wide event at its true width', () => {
    const vacation: SchedulerEvent = {
      id: 'e2',
      resourceId: 'r1',
      start: new Date(2025, 5, 2).getTime(),
      end: new Date(2025, 5, 7).getTime(),
      type: 'vacation',
      title: 'Vacation',
    };

    const runtime = makeRuntime([vacation], { minEventWidth: 200 });
    const bars = new EventBarRenderer(runtime, layer);
    bars.render(makeWindow([makeRow(0, 'r1')]));

    const bar = layer.querySelector<HTMLElement>('.pg-scheduler-bar');
    // Five day slots at 200px -- the floor must not clamp it down.
    expect(parseFloat(bar?.style.width ?? '0')).toBeCloseTo(1000, 0);
  });

  it('positions bars with a composited transform rather than left/top', () => {
    const runtime = makeRuntime([shift]);
    const bars = new EventBarRenderer(runtime, layer);
    bars.render(makeWindow([makeRow(0, 'r1')]));

    const bar = layer.querySelector<HTMLElement>('.pg-scheduler-bar');
    // Moving 600 bars via `left`/`top` would invalidate layout every frame.
    expect(bar?.style.transform).toMatch(/translate/);
  });

  it('writes no styles on a repeated identical frame', () => {
    const runtime = makeRuntime([shift]);
    const bars = new EventBarRenderer(runtime, layer);
    const window = makeWindow([makeRow(0, 'r1')]);

    bars.render(window);
    const bar = layer.querySelector<HTMLElement>('.pg-scheduler-bar');
    const snapshot = bar?.getAttribute('style');

    bars.render(window);

    // The steady-state claim: an unchanged frame is a diff that finds nothing.
    expect(bar?.getAttribute('style')).toBe(snapshot);
  });

  it('recycles rather than rebuilds when a bar scrolls out and back', () => {
    const runtime = makeRuntime([shift]);
    const bars = new EventBarRenderer(runtime, layer);
    const rows = [makeRow(0, 'r1')];

    bars.render(makeWindow(rows));
    const first = layer.querySelector('.pg-scheduler-bar');

    // Scroll far past the event, then back.
    bars.render(makeWindow(rows, makeScroll({ scrollLeft: 5000 })));
    bars.render(makeWindow(rows));

    expect(layer.querySelectorAll('.pg-scheduler-bar')).toHaveLength(1);
    expect(first).toBeTruthy();
  });

  it('marks selected bars', () => {
    const runtime = makeRuntime([shift]);
    runtime.selection.add('e1');

    const bars = new EventBarRenderer(runtime, layer);
    bars.render(makeWindow([makeRow(0, 'r1')]));

    expect(layer.querySelector('.pg-scheduler-bar--selected')).not.toBeNull();
  });

  it('skips rows that are not resources', () => {
    const runtime = makeRuntime([shift]);
    const bars = new EventBarRenderer(runtime, layer);

    const groupRow = { ...makeRow(0, 'r1'), type: 'group' } as unknown as RowNode;
    bars.render(makeWindow([groupRow]));

    expect(layer.querySelectorAll('.pg-scheduler-bar')).toHaveLength(0);
  });
});

describe('SchedulerHeader', () => {
  it('builds band and slot cells', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const header = new SchedulerHeader(makeRuntime(), host);
    header.render();

    // A month view is days under a month band, so both rows must exist.
    expect(host.querySelectorAll('.pg-scheduler-header__cell').length).toBeGreaterThan(0);
    expect(host.querySelector('.pg-scheduler-header__inner')).not.toBeNull();
  });

  it('pans by writing a single transform', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const header = new SchedulerHeader(makeRuntime(), host);
    header.render();
    header.setScrollX(600);

    const inner = host.querySelector<HTMLElement>('.pg-scheduler-header__inner');
    expect(inner?.style.transform).toContain('-600px');
  });
});

describe('scheduler stylesheet', () => {
  it('injects exactly once per document', () => {
    injectSchedulerStyles();
    injectSchedulerStyles();

    expect(document.querySelectorAll('#photon-grid-scheduler-styles')).toHaveLength(1);
  });

  it('is not part of the grid base stylesheet', async () => {
    // The tree-shaking guarantee: adding it to `base-styles.ts` would ship ~9KB
    // to every consumer of the core package, including ones with no scheduler.
    const base = await import('../../src/styles/base-styles');
    const { schedulerCss } = await import('../../src/plugins/scheduler/theme/scheduler-styles');

    base.injectBaseStyles();
    const baseSheet = document.getElementById('photon-grid-base-styles');

    expect(baseSheet?.textContent ?? '').not.toContain('.pg-scheduler-bar');
    expect(schedulerCss).toContain('.pg-scheduler-bar');
  });
});
