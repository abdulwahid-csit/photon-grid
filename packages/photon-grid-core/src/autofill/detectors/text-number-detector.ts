/**
 * Detects `prefix + number + suffix` patterns and increments the numeric part,
 * preserving the prefix, suffix and zero-padded width.
 *
 * Examples: `Item001 → Item002`, `INV-001 → INV-002`, `Employee 10 → Employee 11`,
 * `A1B → A2B`. The *last* run of digits is treated as the counter, so trailing
 * suffixes are preserved. Widening is natural (`099 → 100`).
 *
 * Canonical plain numbers (`1, 2, 3`) are handled earlier by the numeric detector;
 * this detector deliberately runs after it and picks up the leading-zero and
 * affixed forms it leaves behind.
 *
 * @packageDocumentation
 */

import type { AutoFillPatternDetector, AutoFillSeries } from './pattern-detector';
import { AutoFillDetectorName } from './pattern-detector';
import type { AutoFillValue, DetectContext } from '../types/autofill.types';
import { padInteger } from '../util/number-format';

/** Splits a string into `prefix`, the last digit run, and `suffix`. Compiled once. */
const TEXT_NUMBER_RE = /^(.*?)(\d+)(\D*)$/;

/** The parsed parts of one source cell. */
interface Parts {
  readonly prefix: string;
  readonly value: number;
  readonly digits: number;
  readonly suffix: string;
}

function parseParts(value: AutoFillValue): Parts | null {
  if (typeof value !== 'string') return null;
  const m = TEXT_NUMBER_RE.exec(value);
  if (!m) return null;
  return { prefix: m[1], value: Number(m[2]), digits: m[2].length, suffix: m[3] };
}

export class TextNumberDetector implements AutoFillPatternDetector {
  readonly name = AutoFillDetectorName.TextNumber;

  detect(source: readonly AutoFillValue[], _ctx: DetectContext): AutoFillSeries | null {
    const n = source.length;
    const first = parseParts(source[0]);
    if (!first) return null;

    const { prefix, suffix } = first;
    let width = first.digits;

    // Derive the step and confirm every cell shares the prefix/suffix.
    let step = 1; // single source → +1 (Excel behavior)
    let prevValue = first.value;
    for (let i = 1; i < n; i++) {
      const p = parseParts(source[i]);
      if (!p || p.prefix !== prefix || p.suffix !== suffix) return null;
      const diff = p.value - prevValue;
      if (i === 1) step = diff;
      else if (diff !== step) return null;
      if (p.digits > width) width = p.digits;
      prevValue = p.value;
    }

    const base = first.value;

    return {
      valueAt: (position: number): string => {
        const num = base + step * position;
        return num < 0
          ? `${prefix}-${padInteger(-num, width)}${suffix}`
          : `${prefix}${padInteger(num, width)}${suffix}`;
      },
    };
  }
}
