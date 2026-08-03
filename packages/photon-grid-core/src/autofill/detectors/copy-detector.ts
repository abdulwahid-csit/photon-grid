/**
 * The fallback detector: when no smarter pattern applies, values are copied by
 * cycling the source. It always matches, guaranteeing the registry can resolve
 * every input to a series.
 *
 * Using a positive-remainder modulo means the same generator reproduces the
 * grid's historical copy-fill behavior in *both* directions — a forward fill
 * repeats `A, B → A, B, …` and a reverse (upward/leftward) fill mirrors it so the
 * cell nearest the source continues the cycle correctly.
 *
 * @packageDocumentation
 */

import type { AutoFillPatternDetector, AutoFillSeries } from './pattern-detector';
import { AutoFillDetectorName } from './pattern-detector';
import type { AutoFillValue, DetectContext } from '../types/autofill.types';

/** Positive remainder so negative (reverse) positions cycle correctly. */
function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}

export class CopyDetector implements AutoFillPatternDetector {
  readonly name = AutoFillDetectorName.Copy;

  detect(source: readonly AutoFillValue[], _ctx: DetectContext): AutoFillSeries {
    const n = source.length;
    return {
      valueAt: (position: number): AutoFillValue => source[mod(position, n)],
    };
  }
}
