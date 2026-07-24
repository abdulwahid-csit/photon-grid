/**
 * The ordered detector registry — the strategy dispatcher at the heart of the
 * AutoFill engine.
 *
 * Detectors are tried in priority order; the first that recognizes the source
 * wins. A copy fallback is always available internally, so {@link
 * AutoFillDetectorRegistry.resolve} never returns `null` even if every
 * configurable detector is disabled. New detectors are added by passing them to
 * the constructor — no existing code changes (open/closed).
 *
 * @packageDocumentation
 */

import type { AutoFillPatternDetector, AutoFillSeries } from './detectors/pattern-detector';
import { AutoFillDetectorName } from './detectors/pattern-detector';
import type { AutoFillValue, DetectContext } from './types/autofill.types';
import { DateSequenceDetector } from './detectors/date-sequence-detector';
import { MonthDetector } from './detectors/month-detector';
import { WeekdayDetector } from './detectors/weekday-detector';
import { NumericSequenceDetector } from './detectors/numeric-sequence-detector';
import { TextNumberDetector } from './detectors/text-number-detector';
import { BooleanDetector } from './detectors/boolean-detector';
import { AlphabetDetector } from './detectors/alphabet-detector';
import { CopyDetector } from './detectors/copy-detector';

/**
 * Builds the built-in detectors in canonical priority order:
 * Date → Month → Weekday → Numeric → TextNumber → Boolean → Alphabet → Copy.
 *
 * @returns A fresh, ordered array of detector instances.
 */
export function createDefaultDetectors(): AutoFillPatternDetector[] {
  return [
    new DateSequenceDetector(),
    new MonthDetector(),
    new WeekdayDetector(),
    new NumericSequenceDetector(),
    new TextNumberDetector(),
    new BooleanDetector(),
    new AlphabetDetector(),
    new CopyDetector(),
  ];
}

export class AutoFillDetectorRegistry {
  private readonly detectors: readonly AutoFillPatternDetector[];
  /** Guaranteed fallback so `resolve` is always total, even with an empty list. */
  private readonly fallback: CopyDetector = new CopyDetector();

  /**
   * @param detectors - Detectors in priority order. Defaults to the built-ins.
   */
  constructor(detectors: readonly AutoFillPatternDetector[] = createDefaultDetectors()) {
    this.detectors = detectors;
  }

  /**
   * Runs detectors in order and returns the first non-null series, falling back
   * to a cyclic copy. Never returns `null`.
   *
   * @param source - Ordered source values for one fill vector.
   * @param ctx    - Detection context.
   */
  resolve(source: readonly AutoFillValue[], ctx: DetectContext): AutoFillSeries {
    for (let i = 0; i < this.detectors.length; i++) {
      const series = this.detectors[i].detect(source, ctx);
      if (series) return series;
    }
    return this.fallback.detect(source, ctx);
  }

  /**
   * Returns a new registry containing only the named detectors (original order
   * preserved). The copy fallback is always retained regardless of the filter.
   *
   * @param enabled - Detector names to keep.
   */
  withEnabled(enabled: ReadonlySet<AutoFillDetectorName>): AutoFillDetectorRegistry {
    return new AutoFillDetectorRegistry(
      this.detectors.filter((d) => d.name === AutoFillDetectorName.Copy || enabled.has(d.name)),
    );
  }
}
