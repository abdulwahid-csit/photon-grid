/**
 * Core value and option types shared across the AutoFill engine.
 *
 * These types are deliberately primitive and framework-independent — the engine
 * operates on plain cell values and never imports `GridStore`, DOM, `RowNode` or
 * `ColumnModel`. The grid integration layer is responsible for mapping row/column
 * data into {@link AutoFillValue}s and back.
 *
 * @packageDocumentation
 */

/**
 * A single cell value the AutoFill engine can read as source or emit as output.
 *
 * `Date` is passed through for date columns so calendar-aware detectors can
 * extrapolate without lossy string round-trips. `null` represents an empty cell.
 */
export type AutoFillValue = string | number | boolean | Date | null;

/**
 * Optional hints supplied by the grid integration layer that bias or
 * short-circuit pattern detection.
 */
export interface AutoFillOptions {
  /**
   * The destination column's {@link import('../../types/column.types').ColumnDataType}
   * (e.g. `'date'`, `'number'`, `'boolean'`). Lets detectors fast-path or prefer
   * a representation (for instance, emitting `Date` objects for a `'date'` column).
   */
  readonly columnType?: string;

  /**
   * When `true`, values are generated *before* the source head (an up/left fill)
   * rather than after its tail. The facade handles the ordering; detectors remain
   * direction-agnostic.
   * @defaultValue false
   */
  readonly reverse?: boolean;

  /**
   * BCP-47 locale used to match and emit month / weekday names.
   * @defaultValue the engine's configured locale (`'en-US'`).
   */
  readonly locale?: string;
}

/**
 * Resolved, `undefined`-free context handed to every detector's
 * {@link import('../detectors/pattern-detector').AutoFillPatternDetector.detect}
 * call. Direction and count are intentionally absent — detectors describe an
 * infinite series via `valueAt(position)` and never reason about fill geometry.
 */
export interface DetectContext {
  /** Destination column data type, or `undefined` when unknown. */
  readonly columnType?: string;
  /** BCP-47 locale for name-based detectors. Always populated. */
  readonly locale: string;
}
