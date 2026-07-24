/**
 * Detects a date sequence with a constant calendar step (day, week, month or
 * year) and extrapolates it, preserving the source representation (native `Date`
 * vs ISO `YYYY-MM-DD` string).
 *
 * Step classification is prioritized **year → month → day** (a week is a 7-day
 * step). Monthly/yearly detection requires a stable day-of-month; irregular
 * month-end runs (`Jan 31, Feb 28, Mar 31`) are left to the copy fallback in v1.
 * A single date copies rather than guessing a cadence.
 *
 * @packageDocumentation
 */

import type { AutoFillPatternDetector, AutoFillSeries } from './pattern-detector';
import { AutoFillDetectorName } from './pattern-detector';
import type { AutoFillValue, DetectContext } from '../types/autofill.types';
import {
  parseDate,
  formatDate,
  wholeDaysBetween,
  wholeMonthsBetween,
  wholeYearsBetween,
  addDays,
  addMonths,
  addYears,
  DateShape,
  type ParsedDate,
} from '../util/date-parse';

/** The calendar unit of a detected date step. */
enum DateUnit {
  Day = 'day',
  Month = 'month',
  Year = 'year',
}

/** Returns the constant delta of a classifier across all consecutive pairs, or `null`. */
function constantDelta(
  dates: readonly Date[],
  between: (a: Date, b: Date) => number | null,
  requireNonZero: boolean,
): number | null {
  const first = between(dates[0], dates[1]);
  if (first === null || (requireNonZero && first === 0)) return null;
  for (let i = 2; i < dates.length; i++) {
    if (between(dates[i - 1], dates[i]) !== first) return null;
  }
  return first;
}

export class DateSequenceDetector implements AutoFillPatternDetector {
  readonly name = AutoFillDetectorName.Date;

  detect(source: readonly AutoFillValue[], _ctx: DetectContext): AutoFillSeries | null {
    const n = source.length;
    if (n < 2) return null; // single date → copy fallback

    const parsed = new Array<ParsedDate>(n);
    for (let i = 0; i < n; i++) {
      const p = parseDate(source[i]);
      if (!p) return null;
      parsed[i] = p;
    }

    const dates = parsed.map((p) => p.date);
    const shape: DateShape = parsed[0].shape;

    // Priority: year → month → day (week folds into a 7-day step).
    let unit: DateUnit;
    let step: number | null;
    if ((step = constantDelta(dates, wholeYearsBetween, true)) !== null) {
      unit = DateUnit.Year;
    } else if ((step = constantDelta(dates, wholeMonthsBetween, true)) !== null) {
      unit = DateUnit.Month;
    } else if ((step = constantDelta(dates, wholeDaysBetween, false)) !== null) {
      unit = DateUnit.Day;
    } else {
      return null;
    }

    const base = dates[0];
    const stepValue = step;

    return {
      valueAt: (position: number): AutoFillValue => {
        const offset = stepValue * position;
        const result =
          unit === DateUnit.Year ? addYears(base, offset)
            : unit === DateUnit.Month ? addMonths(base, offset)
              : addDays(base, offset);
        return formatDate(result, shape);
      },
    };
  }
}
