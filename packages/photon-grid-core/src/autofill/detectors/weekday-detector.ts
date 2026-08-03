/**
 * Detects a weekday-name sequence (`Monday, Tuesday → Wednesday`, or
 * `Mon, Tue → Wed`) and extrapolates it, wrapping `Saturday → Sunday`/`Sunday →
 * Monday` and preserving the source's full-vs-abbreviated variant and casing.
 *
 * Locale-aware via `Intl` name tables. A single weekday name extrapolates by one.
 *
 * @packageDocumentation
 */

import type { AutoFillPatternDetector, AutoFillSeries } from './pattern-detector';
import { AutoFillDetectorName } from './pattern-detector';
import type { AutoFillValue, DetectContext } from '../types/autofill.types';
import { getWeekdayNames, DAYS_IN_WEEK } from '../util/locale-names';
import { detectCyclicNames } from '../util/cyclic-name-series';

export class WeekdayDetector implements AutoFillPatternDetector {
  readonly name = AutoFillDetectorName.Weekday;

  detect(source: readonly AutoFillValue[], ctx: DetectContext): AutoFillSeries | null {
    return detectCyclicNames(source, getWeekdayNames(ctx.locale), DAYS_IN_WEEK);
  }
}
