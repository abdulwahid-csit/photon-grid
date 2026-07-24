/**
 * The strategy contract for AutoFill pattern detection.
 *
 * Every pattern (numeric sequence, date sequence, month names, …) is an
 * independent {@link AutoFillPatternDetector}. The engine runs registered
 * detectors in priority order and the first one that recognizes the source wins
 * (see {@link import('../autofill-registry').AutoFillDetectorRegistry}). New
 * patterns are added by implementing this interface and registering the detector
 * — existing code never changes (open/closed).
 *
 * @packageDocumentation
 */

import type { AutoFillValue, DetectContext } from '../types/autofill.types';

/**
 * A recognized, infinitely-extrapolatable series.
 *
 * The series is addressed by a **source-relative position**: an integer index
 * into the source's natural order.
 *
 * - `position` `0 … length-1` reproduces the original source values.
 * - `position >= length` extrapolates *forward* (a down / right fill).
 * - `position < 0` extrapolates *backward* (an up / left fill).
 *
 * This single, direction-agnostic addressing scheme lets the facade generate
 * forward and reverse fills from the same generator, and lets the copy fallback
 * reproduce cyclic behavior in both directions via a true modulo.
 *
 * Implementations must be pure and O(1) per call (no allocation, no parsing);
 * all analysis happens once in {@link AutoFillPatternDetector.detect}.
 */
export interface AutoFillSeries {
  /**
   * @param position - Source-relative index (`0` = first source cell).
   * @returns The value at `position`, extrapolated when out of source bounds.
   */
  valueAt(position: number): AutoFillValue;
}

/**
 * Closed set of built-in detector identities. Used as stable config keys
 * (`AutoFillConfig.detectors`) and for diagnostics.
 */
export enum AutoFillDetectorName {
  /** Constant day / week / month / year date deltas. */
  Date = 'date',
  /** Cyclic month names, full or abbreviated (`January…`, `Jan…`). */
  Month = 'month',
  /** Cyclic weekday names, full or abbreviated (`Monday…`, `Mon…`). */
  Weekday = 'weekday',
  /** Arithmetic numeric progression. */
  Numeric = 'numeric',
  /** `prefix + number + suffix` with an incrementing, zero-padded number. */
  TextNumber = 'textNumber',
  /** `TRUE` / `FALSE` (any casing) cyclic continuation. */
  Boolean = 'boolean',
  /** Single-letter alphabet sequence (`A,B,C→D`). */
  Alphabet = 'alphabet',
  /** Fallback: cyclic copy of the source values. Always matches. */
  Copy = 'copy',
}

/**
 * A strategy that inspects the ordered source values of a single fill vector and,
 * if it recognizes its pattern, returns a generator; otherwise `null`.
 */
export interface AutoFillPatternDetector {
  /** Stable identity (config key + diagnostics). */
  readonly name: AutoFillDetectorName;

  /**
   * @param source - Ordered source values for one 1-D vector (length `>= 1`).
   *                 For a vertical fill this is a column slice in row order; for a
   *                 horizontal fill, a row slice in column order.
   * @param ctx    - Resolved detection context (column type, locale).
   * @returns A series generator when the pattern applies, else `null`.
   */
  detect(source: readonly AutoFillValue[], ctx: DetectContext): AutoFillSeries | null;
}
