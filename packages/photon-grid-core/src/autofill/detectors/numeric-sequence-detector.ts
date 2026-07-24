/**
 * Detects an arithmetic numeric progression and extrapolates it.
 *
 * Handles positive, negative, decimal, large and constant steps. Extrapolated
 * values are rounded to the maximum decimal precision seen in the source, so
 * `0.1, 0.2, 0.3` continues to `0.4` rather than `0.30000000000000004`.
 *
 * A single numeric cell is intentionally *not* matched here — it falls through
 * to the copy fallback (Excel copies a lone number rather than guessing a step).
 *
 * @packageDocumentation
 */

import type { AutoFillPatternDetector, AutoFillSeries } from './pattern-detector';
import { AutoFillDetectorName } from './pattern-detector';
import type { AutoFillValue, DetectContext } from '../types/autofill.types';
import { parseCanonicalNumber, decimalPlaces, roundTo, FLOAT_EPSILON } from '../util/number-format';

export class NumericSequenceDetector implements AutoFillPatternDetector {
  readonly name = AutoFillDetectorName.Numeric;

  detect(source: readonly AutoFillValue[], _ctx: DetectContext): AutoFillSeries | null {
    const n = source.length;
    if (n < 2) return null; // single number → copy fallback

    const nums = new Array<number>(n);
    let maxDecimals = 0;
    for (let i = 0; i < n; i++) {
      const parsed = parseCanonicalNumber(source[i]);
      if (parsed === null) return null;
      nums[i] = parsed;
      const dp = decimalPlaces(parsed);
      if (dp > maxDecimals) maxDecimals = dp;
    }

    const step = nums[1] - nums[0];
    const tolerance = FLOAT_EPSILON * Math.max(1, Math.abs(step));
    for (let i = 2; i < n; i++) {
      if (Math.abs(nums[i] - nums[i - 1] - step) > tolerance) return null;
    }

    // Account for a step that introduces more precision than any single source
    // value (e.g. integers 1,1 → step 0, but 1, 1.5 → step 0.5).
    const stepDecimals = decimalPlaces(roundTo(step, 12));
    const decimals = Math.max(maxDecimals, stepDecimals);
    const base = nums[0];

    return {
      valueAt: (position: number): number => roundTo(base + step * position, decimals),
    };
  }
}
