import {
  add,
  hasOffsetChange,
  startOf,
  ticksBetween,
  type CalendarOptions,
  type TimeRange,
  type TimeUnit,
  type WeekStart,
  HOUR_MS,
  MINUTE_MS,
} from './calendar';
import {
  buildPrefixAxis,
  UniformAxis,
  type SlotAxis,
} from './slot-axis';

/**
 * How slot widths relate to slot durations.
 *
 * `'equal'` gives every slot the same width regardless of duration — a February
 * column is as wide as a January one. Reads as a *resource planner*.
 * `'proportional'` scales width with duration, so February is visibly shorter.
 * Reads as a *Gantt chart*. Neither is more correct; they answer different
 * questions.
 */
export type SlotWidthMode = 'equal' | 'proportional';

/** One row of the timeline header, above the slot row. */
export interface HeaderBand {
  readonly unit: TimeUnit;
  readonly step: number;
}

/**
 * Everything that defines a timeline.
 *
 * Note there is no `view` field. A "month view" is not a mode with its own code
 * path — it is this config with `unit: 'day'` and a month header band. That is
 * the whole reason a single engine can serve every view: the views differ in
 * data, not in behaviour.
 */
export interface TimelineConfig {
  /** Granularity of one slot. */
  readonly unit: TimeUnit;
  /** Units per slot. `{ unit: 'minute', step: 15 }` gives quarter-hour slots. */
  readonly step: number;
  /** The span the timeline covers. */
  readonly range: TimeRange;
  /** Width of one slot in pixels (the *typical* width in proportional mode). */
  readonly slotWidth: number;
  /** @default 'equal' */
  readonly slotWidthMode?: SlotWidthMode;
  /** Header rows above the slot row, outermost first. */
  readonly headerBands?: readonly HeaderBand[];
  /** @default 1 (Monday) */
  readonly weekStartsOn?: WeekStart;
}

/** A single header cell: one span of a header band. */
export interface HeaderCell {
  readonly startMs: number;
  readonly endMs: number;
  /** Pixel offset of the cell's left edge. */
  readonly offsetPx: number;
  /** Pixel width of the cell. */
  readonly widthPx: number;
}

/** One resolved header band, with its cells. */
export interface ResolvedHeaderBand {
  readonly unit: TimeUnit;
  readonly step: number;
  readonly cells: readonly HeaderCell[];
}

/**
 * Named view presets.
 *
 * Each is nothing but a `{ unit, step, headerBands }` triple — which is the
 * point. Adding a view is adding a table entry, not a code path, and a host that
 * needs something unusual (six-hour slots over a fortnight) passes a raw
 * {@link TimelineConfig} instead of picking a name.
 *
 * Kept in its own const so it tree-shakes away for a host that only ever uses
 * explicit configs.
 */
export const TIMELINE_PRESETS = {
  /** Hours across one day. */
  day: { unit: 'hour', step: 1, headerBands: [{ unit: 'day', step: 1 }] },
  /** Days across one week. */
  week: { unit: 'day', step: 1, headerBands: [{ unit: 'week', step: 1 }] },
  /** Days across one month — the classic vacation planner. */
  month: { unit: 'day', step: 1, headerBands: [{ unit: 'month', step: 1 }] },
  /** Weeks across a quarter. */
  quarter: { unit: 'week', step: 1, headerBands: [{ unit: 'month', step: 1 }] },
  /** Months across a year. */
  year: { unit: 'month', step: 1, headerBands: [{ unit: 'quarter', step: 1 }] },
} as const satisfies Record<string, { unit: TimeUnit; step: number; headerBands: HeaderBand[] }>;

/** Name of a built-in view preset. */
export type TimelineViewName = keyof typeof TIMELINE_PRESETS;

/**
 * The resolved timeline: an axis, header bands, and the config that produced
 * them.
 *
 * Immutable. Changing the view or range builds a new one rather than mutating,
 * so "did the timeline change?" is a reference comparison — which is what lets
 * the renderer skip work on a pure scroll.
 */
export interface Timeline {
  readonly config: TimelineConfig;
  readonly axis: SlotAxis;
  readonly bands: readonly ResolvedHeaderBand[];
  /** Fence posts of the slot row. `count + 1` entries. */
  readonly ticks: readonly number[];
}

/**
 * Builds a {@link Timeline} from a config.
 *
 * The one interesting decision here is which axis implementation to use, and it
 * is made on two questions:
 *
 * 1. Are slot *widths* equal? (`slotWidthMode !== 'proportional'`)
 * 2. Are slot *durations* equal?
 *
 * Minute and hour are fixed-duration by definition. Day and week are equal
 * *unless* a DST transition falls in range — detected by probing month
 * boundaries, which is ~120 cheap probes for a decade rather than materialising
 * millions of edges. Month, quarter and year are never equal.
 *
 * Both answers yes ⇒ {@link UniformAxis} and no allocation. Otherwise a
 * {@link PrefixAxis}, whose cost is bounded because the units that force it are
 * exactly the coarse ones with few slots.
 */
export function buildTimeline(config: TimelineConfig): Timeline {
  const {
    unit,
    step,
    range,
    slotWidth,
    slotWidthMode = 'equal',
    headerBands = [],
    weekStartsOn = 1,
  } = config;

  const calOpts: CalendarOptions = { weekStartsOn };
  const ticks = ticksBetween(range, unit, step, calOpts);

  const axis = canUseUniformAxis(unit, range, slotWidthMode)
    ? new UniformAxis(ticks[0], uniformSlotMs(unit, step), slotWidth, ticks.length - 1)
    : buildPrefixAxis(ticks, slotWidth, slotWidthMode === 'proportional');

  const bands = headerBands.map((band) => resolveBand(band, axis, calOpts));

  return { config, axis, bands, ticks };
}

/** Builds a timeline from a named preset over a range. */
export function buildTimelineFromView(
  view: TimelineViewName,
  range: TimeRange,
  slotWidth: number,
  overrides: Partial<TimelineConfig> = {},
): Timeline {
  const preset = TIMELINE_PRESETS[view];
  return buildTimeline({
    unit: preset.unit,
    step: preset.step,
    headerBands: preset.headerBands,
    range,
    slotWidth,
    ...overrides,
  });
}

/** Whether slots are equal in both duration and width, allowing the arithmetic axis. */
function canUseUniformAxis(unit: TimeUnit, range: TimeRange, mode: SlotWidthMode): boolean {
  if (mode === 'proportional') return false;

  switch (unit) {
    // Genuinely fixed-duration — unaffected by DST, which shifts wall-clock
    // time but not the length of an hour.
    case 'minute':
    case 'hour':
      return true;

    // Equal only while the UTC offset holds. One transition in range and a
    // day is 23 or 25 hours, so the closed-form projection would drift.
    case 'day':
    case 'week':
      return !hasOffsetChange(range);

    // Never equal: 28-31 days, 90-92 days, 365-366 days.
    default:
      return false;
  }
}

/** Milliseconds per slot, for the fixed-duration units only. */
function uniformSlotMs(unit: TimeUnit, step: number): number {
  switch (unit) {
    case 'minute': return step * MINUTE_MS;
    case 'hour': return step * HOUR_MS;
    case 'day': return step * 24 * HOUR_MS;
    case 'week': return step * 7 * 24 * HOUR_MS;
    default:
      // Unreachable: `canUseUniformAxis` rejects these units.
      throw new RangeError(`uniformSlotMs: ${unit} has no fixed duration`);
  }
}

/**
 * Expands one header band into cells spanning the axis.
 *
 * Cells are clipped to the axis rather than extending past it, so the first and
 * last cell of a band may be partial — a month view starting mid-month should
 * show a narrow first cell, not a full-width one hanging off the edge.
 */
function resolveBand(band: HeaderBand, axis: SlotAxis, calOpts: CalendarOptions): ResolvedHeaderBand {
  const cells: HeaderCell[] = [];

  let cellStart = startOf(band.unit, axis.startMs, calOpts);

  while (cellStart < axis.endMs) {
    const cellEnd = add(band.unit, band.step, cellStart, calOpts);

    const clippedStart = Math.max(cellStart, axis.startMs);
    const clippedEnd = Math.min(cellEnd, axis.endMs);

    const offsetPx = axis.pxAt(clippedStart);
    cells.push({
      startMs: clippedStart,
      endMs: clippedEnd,
      offsetPx,
      widthPx: axis.pxAt(clippedEnd) - offsetPx,
    });

    cellStart = cellEnd;
  }

  return { unit: band.unit, step: band.step, cells };
}
