/**
 * Detects a single-letter alphabetic sequence (`A, B, C → D`) and extrapolates
 * it, wrapping `Z → A` and preserving case.
 *
 * Multi-letter sequences (`AA, AB, …`) are intentionally out of scope for v1 and
 * fall through to the copy fallback; the detector architecture leaves room to add
 * a bijective base-26 detector later without touching this one.
 *
 * @packageDocumentation
 */

import type { AutoFillPatternDetector, AutoFillSeries } from './pattern-detector';
import { AutoFillDetectorName } from './pattern-detector';
import type { AutoFillValue, DetectContext } from '../types/autofill.types';

/** Letters in the Latin alphabet. */
const ALPHABET_SIZE = 26;
const CHAR_A_UPPER = 65;
const CHAR_A_LOWER = 97;
const SINGLE_LETTER_RE = /^[A-Za-z]$/;

/** Positive remainder, so backward extrapolation wraps correctly (`A → Z`). */
function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}

export class AlphabetDetector implements AutoFillPatternDetector {
  readonly name = AutoFillDetectorName.Alphabet;

  detect(source: readonly AutoFillValue[], _ctx: DetectContext): AutoFillSeries | null {
    const n = source.length;
    const codes = new Array<number>(n);
    let upper = false;

    for (let i = 0; i < n; i++) {
      const v = source[i];
      if (typeof v !== 'string' || !SINGLE_LETTER_RE.test(v)) return null;
      const isUpper = v >= 'A' && v <= 'Z';
      if (i === 0) upper = isUpper;
      else if (isUpper !== upper) return null; // mixed case → not a clean sequence
      codes[i] = v.toUpperCase().charCodeAt(0) - CHAR_A_UPPER; // 0..25
    }

    // Single letter extrapolates with step +1 (Excel behavior); multi derives step.
    let step = 1;
    if (n >= 2) {
      step = mod(codes[1] - codes[0], ALPHABET_SIZE);
      for (let i = 2; i < n; i++) {
        if (mod(codes[i] - codes[i - 1], ALPHABET_SIZE) !== step) return null;
      }
    }

    const base = codes[0];
    const originCharCode = upper ? CHAR_A_UPPER : CHAR_A_LOWER;

    return {
      valueAt: (position: number): string =>
        String.fromCharCode(originCharCode + mod(base + step * position, ALPHABET_SIZE)),
    };
  }
}
