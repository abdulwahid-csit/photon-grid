/**
 * Tolerant date parsing and calendar-delta helpers for the date detector.
 *
 * The detector needs to (a) recognize whether source values are dates, (b) keep
 * the *input shape* so output matches (a `Date` column emits `Date`s, an
 * ISO-string column emits ISO strings), and (c) classify the step between
 * consecutive dates as a whole number of days, months or years.
 *
 * @packageDocumentation
 */

/** Milliseconds in one calendar day. */
export const DAY_MS = 86_400_000;

/** How a parsed date was represented in the source, so output can match it. */
export enum DateShape {
  /** A native `Date` object. */
  DateObject = 'date',
  /** An ISO `YYYY-MM-DD` string. */
  IsoDate = 'iso-date',
}

/** A source value parsed into a date plus the shape it arrived in. */
export interface ParsedDate {
  /** Local-time date (time component zeroed for date-only shapes). */
  readonly date: Date;
  /** The representation to emit back. */
  readonly shape: DateShape;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a source value into a {@link ParsedDate}, or `null` when it is not a
 * date this detector handles (native `Date` or ISO `YYYY-MM-DD` string).
 *
 * @param value - The source value.
 * @returns The parsed date + shape, or `null`.
 */
export function parseDate(value: unknown): ParsedDate | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : { date: new Date(value.getTime()), shape: DateShape.DateObject };
  }
  if (typeof value === 'string') {
    const m = ISO_DATE_RE.exec(value.trim());
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const date = new Date(year, month, day);
    // Reject impossible dates that JS rolled over (e.g. 2024-02-31).
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return { date, shape: DateShape.IsoDate };
  }
  return null;
}

/**
 * Formats a `Date` back into the requested shape.
 *
 * @param date  - The date to emit.
 * @param shape - The representation to produce.
 * @returns A `Date` or an ISO `YYYY-MM-DD` string.
 */
export function formatDate(date: Date, shape: DateShape): Date | string {
  if (shape === DateShape.DateObject) return date;
  const y = date.getFullYear().toString().padStart(4, '0');
  const mo = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** Whole-calendar-months between two dates when day-of-month is preserved, else `null`. */
export function wholeMonthsBetween(a: Date, b: Date): number | null {
  if (a.getDate() !== b.getDate()) return null;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** Whole-calendar-years between two dates when month/day are preserved, else `null`. */
export function wholeYearsBetween(a: Date, b: Date): number | null {
  if (a.getMonth() !== b.getMonth() || a.getDate() !== b.getDate()) return null;
  return b.getFullYear() - a.getFullYear();
}

/** Whole days between two local dates when the gap is an exact day multiple, else `null`. */
export function wholeDaysBetween(a: Date, b: Date): number | null {
  const diff = b.getTime() - a.getTime();
  return diff % DAY_MS === 0 ? diff / DAY_MS : null;
}

/**
 * Adds `n` calendar months to a date, clamping the day to the target month's
 * length (Jan 31 + 1mo → Feb 28/29), matching spreadsheet behavior.
 */
export function addMonths(date: Date, n: number): Date {
  const result = new Date(date.getTime());
  const targetMonth = date.getMonth() + n;
  result.setDate(1);
  result.setFullYear(date.getFullYear(), targetMonth, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

/** Adds `n` calendar years, clamping Feb 29 to Feb 28 on non-leap targets. */
export function addYears(date: Date, n: number): Date {
  return addMonths(date, n * 12);
}

/** Adds `n` days (may be negative) to a date. */
export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS);
}
