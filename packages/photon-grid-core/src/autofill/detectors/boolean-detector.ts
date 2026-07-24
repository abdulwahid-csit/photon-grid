/**
 * Detects boolean cells (`true`/`false`, or the strings `TRUE`/`FALSE` in any
 * casing) and continues them as a cyclic sequence — `TRUE, FALSE → TRUE, FALSE`.
 *
 * Values are emitted verbatim from the source so their original type and casing
 * are preserved. Running before the copy fallback lets a boolean column register
 * an explicit pattern rather than an anonymous copy.
 *
 * @packageDocumentation
 */

import type { AutoFillPatternDetector, AutoFillSeries } from './pattern-detector';
import { AutoFillDetectorName } from './pattern-detector';
import type { AutoFillValue, DetectContext } from '../types/autofill.types';

/** Positive remainder so backward fills cycle correctly. */
function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}

/** `true` when the value is a boolean or a case-insensitive `TRUE`/`FALSE` string. */
function isBooleanLike(value: AutoFillValue): boolean {
  if (typeof value === 'boolean') return true;
  if (typeof value !== 'string') return false;
  const lower = value.trim().toLowerCase();
  return lower === 'true' || lower === 'false';
}

export class BooleanDetector implements AutoFillPatternDetector {
  readonly name = AutoFillDetectorName.Boolean;

  detect(source: readonly AutoFillValue[], _ctx: DetectContext): AutoFillSeries | null {
    const n = source.length;
    for (let i = 0; i < n; i++) {
      if (!isBooleanLike(source[i])) return null;
    }
    return {
      valueAt: (position: number): AutoFillValue => source[mod(position, n)],
    };
  }
}
