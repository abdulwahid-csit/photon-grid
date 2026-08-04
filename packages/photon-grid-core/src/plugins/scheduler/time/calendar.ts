/**
 * Calendar arithmetic for the scheduler's time axis.
 *
 * Pure and DOM-free, so it runs under the package's `node` test environment.
 *
 * ## Why epoch milliseconds, not `Date`
 *
 * Every time in the scheduler's model, index and axes is a `number`. `Date`
 * appears only inside this module and in formatting. Four reasons:
 *
 * - The event index performs hundreds of thousands of comparisons; `number`
 *   compares are a single machine op and pack into `Float64Array`, where `Date`
 *   would mean a heap object and a `.getTime()` call per comparison.
 * - "Did the visible range change?" memoizes as `===`.
 * - `Date` is mutable. An event's `start` handed to a host callback could be
 *   mutated in place and silently corrupt the index; a `number` cannot.
 * - Datasources deliver ISO strings, which are parsed exactly once at ingest.
 *
 * ## Why iteration, never division
 *
 * It is tempting to compute slot counts as `(end - start) / slotDuration`. That
 * is wrong for every unit except minute and hour:
 *
 * - A calendar day is 23 or 25 hours across a DST transition, not 24.
 * - Months are 28–31 days; quarters 90–92; years 365 or 366.
 *
 * {@link ticksBetween} therefore *walks* the range using {@link add}, which is
 * wall-clock correct. This is the single most important correctness rule here:
 * a scheduler that divides will drift by an hour twice a year and by whole days
 * across month boundaries.
 */

/** Granularity of one timeline slot. */
export type TimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

/** A half-open time interval `[start, end)`, in epoch milliseconds. */
export interface TimeRange {
  readonly start: number;
  readonly end: number;
}

/** Day index a week starts on: `0` Sunday, `1` Monday (ISO). */
export type WeekStart = 0 | 1;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;

/**
 * Options threaded through every calendar operation.
 *
 * Kept as one object rather than positional arguments because `weekStartsOn`
 * silently changes `startOf('week', …)` by up to six days, and a bare boolean
 * or number at a call site is exactly the kind of argument that gets passed
 * wrong.
 */
export interface CalendarOptions {
  /** @default 1 (Monday, ISO 8601) */
  readonly weekStartsOn?: WeekStart;
}

const DEFAULT_WEEK_START: WeekStart = 1;

/**
 * Truncates `t` to the start of the containing `unit`, in local wall-clock time.
 *
 * Uses the `Date` constructor's local-time component form throughout, so the
 * result is the true local midnight/hour boundary even across a DST transition
 * — where naive millisecond flooring would land an hour off.
 *
 * @param unit - Granularity to truncate to.
 * @param t - Epoch milliseconds.
 * @returns Epoch milliseconds of the unit boundary at or before `t`.
 */
export function startOf(unit: TimeUnit, t: number, options: CalendarOptions = {}): number {
  const d = new Date(t);

  switch (unit) {
    case 'minute':
      d.setSeconds(0, 0);
      return d.getTime();

    case 'hour':
      d.setMinutes(0, 0, 0);
      return d.getTime();

    case 'day':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    case 'week': {
      const weekStartsOn = options.weekStartsOn ?? DEFAULT_WEEK_START;
      // `+ 7` before the modulo keeps the result non-negative when the week
      // starts on Monday and the date falls on a Sunday.
      const delta = (d.getDay() - weekStartsOn + 7) % 7;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - delta).getTime();
    }

    case 'month':
      return new Date(d.getFullYear(), d.getMonth(), 1).getTime();

    case 'quarter':
      return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime();

    case 'year':
      return new Date(d.getFullYear(), 0, 1).getTime();
  }
}

/**
 * Adds `n` whole units to `t`, in local wall-clock time.
 *
 * `minute` and `hour` are genuinely fixed-duration and use plain arithmetic.
 * Everything from `day` upward goes through the `Date` component setters, which
 * is what makes the result correct across DST (adding one day at a spring-forward
 * boundary advances 23 hours, landing on the same local clock time) and across
 * uneven month lengths (Jan 31 + 1 month clamps to Feb 28/29 rather than
 * overflowing into March).
 *
 * @param n - May be negative.
 */
export function add(unit: TimeUnit, n: number, t: number, options: CalendarOptions = {}): number {
  if (n === 0) return t;

  switch (unit) {
    // Fixed-duration units. Note this is *deliberately* not wall-clock: adding
    // an hour across spring-forward should skip the non-existent local hour.
    case 'minute':
      return t + n * MINUTE_MS;
    case 'hour':
      return t + n * HOUR_MS;

    case 'day': {
      const d = new Date(t);
      d.setDate(d.getDate() + n);
      return d.getTime();
    }

    case 'week':
      return add('day', n * 7, t, options);

    case 'month':
      return addMonthsClamped(t, n);

    case 'quarter':
      return addMonthsClamped(t, n * 3);

    case 'year':
      return addMonthsClamped(t, n * 12);
  }
}

/**
 * Adds whole months, clamping the day to the target month's length.
 *
 * The clamp is what makes `Jan 31 + 1 month` land on Feb 28 (or 29) rather than
 * rolling over into March, which is what `setMonth` alone would do.
 */
function addMonthsClamped(t: number, months: number): number {
  const d = new Date(t);
  const day = d.getDate();

  // Move to the 1st before shifting the month, so an out-of-range day cannot
  // cause a rollover mid-operation.
  d.setDate(1);
  d.setMonth(d.getMonth() + months);

  const lastDay = daysInMonth(d.getFullYear(), d.getMonth());
  d.setDate(Math.min(day, lastDay));
  return d.getTime();
}

/** Number of days in a given month. Day 0 of the next month is the last of this one. */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Whole units between `a` and `b`, truncated toward zero.
 *
 * For calendar units this counts *boundaries crossed*, not elapsed duration —
 * so two timestamps an hour apart that straddle midnight are one day apart, and
 * a DST-shortened day still counts as one.
 */
export function diffIn(unit: TimeUnit, a: number, b: number, options: CalendarOptions = {}): number {
  switch (unit) {
    case 'minute':
      return Math.trunc((b - a) / MINUTE_MS);
    case 'hour':
      return Math.trunc((b - a) / HOUR_MS);

    case 'day':
    case 'week': {
      // Truncate both ends to local day boundaries first, then divide. Dividing
      // the raw difference would be off by one whenever a DST transition falls
      // between them.
      const da = startOf('day', a, options);
      const db = startOf('day', b, options);
      // Rounding absorbs the 23/25-hour days that make the quotient non-integral.
      const days = Math.round((db - da) / (24 * HOUR_MS));
      return unit === 'day' ? days : Math.trunc(days / 7);
    }

    case 'month':
    case 'quarter':
    case 'year': {
      const da = new Date(a);
      const db = new Date(b);
      let months = (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
      // A partial final month does not count: Jan 31 -> Feb 1 is zero months.
      if (db.getDate() < da.getDate()) months -= Math.sign(months) > 0 ? 1 : 0;

      if (unit === 'month') return months;
      return Math.trunc(months / (unit === 'quarter' ? 3 : 12));
    }
  }
}

/**
 * Generates the slot boundaries covering `range`, as **fence posts**.
 *
 * The returned array has `slotCount + 1` entries: slot `i` spans
 * `[ticks[i], ticks[i + 1])`. Returning posts rather than slot starts is what
 * removes the off-by-one from every downstream consumer — the axis gets its
 * widths by differencing adjacent entries, and the header gets its labels from
 * all but the last.
 *
 * The first post is truncated to the unit boundary at or before `range.start`,
 * so a range beginning mid-day still yields whole, aligned slots. The last post
 * is the first boundary at or after `range.end`, so the range is always fully
 * covered.
 *
 * Walks with {@link add} rather than dividing — see the module doc.
 *
 * @param step - Units per slot; `{ unit: 'minute', step: 15 }` gives quarter-hour
 *   slots. Must be a positive integer.
 * @returns Ascending epoch milliseconds, length ≥ 2 for any non-empty range.
 */
export function ticksBetween(
  range: TimeRange,
  unit: TimeUnit,
  step: number,
  options: CalendarOptions = {},
): number[] {
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) {
    throw new RangeError('ticksBetween: range bounds must be finite');
  }
  if (!Number.isInteger(step) || step < 1) {
    throw new RangeError(`ticksBetween: step must be a positive integer, got ${step}`);
  }

  const ticks: number[] = [];
  let t = startOf(unit, range.start, options);

  if (range.end <= t) return [t, add(unit, step, t, options)];

  while (t < range.end) {
    ticks.push(t);
    const next = add(unit, step, t, options);
    // Defensive: a unit/step combination that fails to advance would spin
    // forever. Cannot happen with the units above, but this is a hot loop over
    // host-supplied config.
    if (next <= t) throw new RangeError(`ticksBetween: step did not advance (${unit} x${step})`);
    t = next;
  }

  ticks.push(t); // closing fence post
  return ticks;
}

/**
 * `true` when the local UTC offset differs anywhere in `range` — i.e. a DST
 * transition falls inside it.
 *
 * The timeline uses this to decide whether day/week slots are uniform (allowing
 * the allocation-free arithmetic axis) or must be materialised. Probing is far
 * cheaper than generating ticks: it samples the endpoints plus each month
 * boundary, which is ~120 probes for a decade and cannot miss a transition,
 * since no jurisdiction changes offset more than twice per month.
 */
export function hasOffsetChange(range: TimeRange): boolean {
  const first = new Date(range.start).getTimezoneOffset();

  if (new Date(range.end).getTimezoneOffset() !== first) return true;

  let t = startOf('month', range.start);
  while (t < range.end) {
    if (new Date(t).getTimezoneOffset() !== first) return true;
    t = add('month', 1, t);
  }

  return false;
}
