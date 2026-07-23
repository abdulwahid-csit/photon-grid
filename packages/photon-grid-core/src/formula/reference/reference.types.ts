/**
 * Structural types describing parsed cell/range references, independent of any
 * grid state. Resolution of these positional references to stable
 * {@link CellId}s happens later in `ReferenceResolver`; these types only
 * describe the *shape* of a reference as parsed from `A1` syntax.
 *
 * @packageDocumentation
 */

/**
 * A parsed single-cell reference such as `A1`, `$B$2`, `Sheet1!C3`.
 *
 * Indices are **zero-based**: `A1` → `{ colIndex: 0, rowIndex: 0 }`. The two
 * `*Absolute` flags capture the `$` anchors, which govern how the reference is
 * shifted when a formula is copied/filled (absolute parts do not move).
 */
export interface CellRef {
  /** Zero-based column index (`A` → 0, `Z` → 25, `AA` → 26). */
  readonly colIndex: number;
  /** Zero-based row index (`1` → 0). */
  readonly rowIndex: number;
  /** `true` when the column was written with a `$` anchor (`$A`). */
  readonly colAbsolute: boolean;
  /** `true` when the row was written with a `$` anchor (`A$1`). */
  readonly rowAbsolute: boolean;
  /** Optional sheet name for `Sheet1!A1` syntax (future multi-sheet support). */
  readonly sheet?: string;
}

/**
 * A parsed rectangular range reference such as `A1:B10`, whole columns `A:A`,
 * or whole rows `1:10`.
 *
 * For whole-column ranges `rowIndex` on the endpoints is `-1` and
 * {@link wholeColumn} is `true`; for whole-row ranges `colIndex` is `-1` and
 * {@link wholeRow} is `true`. The engine clamps these to the live data bounds
 * at resolution time.
 */
export interface RangeRef {
  /** Top-left endpoint. */
  readonly start: CellRef;
  /** Bottom-right endpoint. */
  readonly end: CellRef;
  /** `true` for `A:A`-style whole-column ranges (row bounds are open). */
  readonly wholeColumn: boolean;
  /** `true` for `1:10`-style whole-row ranges (column bounds are open). */
  readonly wholeRow: boolean;
  /** Optional sheet name for `Sheet1!A1:B2` syntax. */
  readonly sheet?: string;
}

/** A reference is either a single cell or a rectangular range. */
export type Reference = CellRef | RangeRef;

/**
 * Type guard distinguishing a {@link RangeRef} from a {@link CellRef}.
 *
 * @param ref - Any parsed reference.
 */
export function isRangeRef(ref: Reference): ref is RangeRef {
  return (ref as RangeRef).start !== undefined && (ref as RangeRef).end !== undefined;
}
