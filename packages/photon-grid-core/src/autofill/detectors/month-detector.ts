/**
 * Detects a month-name sequence (`January, February → March`, or `Jan, Feb → Mar`)
 * and extrapolates it, wrapping `December → January` and preserving the source's
 * full-vs-abbreviated variant and casing.
 *
 * Locale-aware via `Intl` name tables: a `fr-FR` grid continues
 * `janvier, février → mars`. A single month name extrapolates by one.
 *
 * @packageDocumentation
 */

import type { AutoFillPatternDetector, AutoFillSeries } from './pattern-detector';
import { AutoFillDetectorName } from './pattern-detector';
import type { AutoFillValue, DetectContext } from '../types/autofill.types';
import { getMonthNames, MONTHS_IN_YEAR } from '../util/locale-names';
import { detectCyclicNames } from '../util/cyclic-name-series';

export class MonthDetector implements AutoFillPatternDetector {
  readonly name = AutoFillDetectorName.Month;

  detect(source: readonly AutoFillValue[], ctx: DetectContext): AutoFillSeries | null {
    return detectCyclicNames(source, getMonthNames(ctx.locale), MONTHS_IN_YEAR);
  }
}
