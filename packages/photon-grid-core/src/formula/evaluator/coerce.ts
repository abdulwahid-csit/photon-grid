/**
 * Excel-compatible value coercion and error-propagation helpers — the single
 * source of truth for how the evaluator and every {@link FormulaFunction} turn
 * loosely-typed {@link FormulaValue}s into numbers, text and booleans, and how
 * they compare and aggregate them.
 *
 * Centralizing these rules (rather than re-deriving them per function) keeps
 * behavior consistent with Excel/Sheets and avoids duplicated, subtly-divergent
 * coercion logic across ~50 functions.
 *
 * ### Key rules encoded here
 * - **Blanks** (`null`) coerce to `0` / `""` / `false` by context.
 * - **Booleans** coerce to `1`/`0` and `"TRUE"`/`"FALSE"`.
 * - **Errors short-circuit**: any {@link FormulaError} operand is returned
 *   unchanged, so a `#DIV/0!` deep in an expression surfaces at the top.
 * - **Range vs. literal aggregation**: numeric aggregators (SUM, AVERAGE, …)
 *   count only real numbers found *inside ranges*, but coerce *scalar literal*
 *   arguments — matching Excel's long-standing distinction.
 *
 * @packageDocumentation
 */

import { FormulaError, isFormulaError } from '../error/formula-error';
import type { FormulaValue, FormulaScalar, FormulaArgument, FormulaMatrix } from '../types/formula.types';

export { isFormulaError };

/** `true` when `arg` is a range matrix rather than a scalar value. */
export function isMatrix(arg: FormulaArgument): arg is FormulaMatrix {
  return Array.isArray(arg);
}

/**
 * Collapses an argument to a single scalar: a 1×1 matrix becomes its cell, an
 * empty matrix is `#REF!`, and a wider matrix is `#VALUE!`. Scalar arguments
 * pass through unchanged. Used by functions that expect a single value in a
 * given argument position (e.g. `ABS`, `LEFT`).
 *
 * @param arg - A scalar or matrix argument.
 * @returns The scalar value (possibly a {@link FormulaError}).
 */
export function scalarArg(arg: FormulaArgument): FormulaValue {
  if (isMatrix(arg)) {
    if (arg.length === 1 && arg[0].length === 1) return arg[0][0];
    if (arg.length === 0 || arg[0].length === 0) return FormulaError.ref('empty range');
    return FormulaError.value('expected a single value, got a range');
  }
  return arg;
}

/**
 * Scans a scalar or matrix argument for the first {@link FormulaError}.
 *
 * @param arg - A scalar or matrix argument.
 * @returns The first error found, or `null` if the argument is error-free.
 */
export function findError(arg: FormulaArgument): FormulaError | null {
  if (isMatrix(arg)) {
    for (let r = 0; r < arg.length; r++) {
      const row = arg[r];
      for (let c = 0; c < row.length; c++) {
        if (isFormulaError(row[c])) return row[c] as FormulaError;
      }
    }
    return null;
  }
  return isFormulaError(arg) ? arg : null;
}

/**
 * Returns the first error among several arguments (scanning inside matrices),
 * used to short-circuit strict functions before doing any work.
 *
 * @param args - The evaluated arguments.
 * @returns The first {@link FormulaError}, or `null` if none is present.
 */
export function firstErrorIn(args: readonly FormulaArgument[]): FormulaError | null {
  for (let i = 0; i < args.length; i++) {
    const e = findError(args[i]);
    if (e) return e;
  }
  return null;
}

/**
 * Invokes `cb` for every scalar value in an argument, flattening matrices in
 * `[row][col]` order. Allocation-free (no intermediate arrays).
 *
 * @param arg - A scalar or matrix argument.
 * @param cb  - Receiver for each scalar value.
 */
export function forEachValue(arg: FormulaArgument, cb: (v: FormulaValue) => void): void {
  if (isMatrix(arg)) {
    for (let r = 0; r < arg.length; r++) {
      const row = arg[r];
      for (let c = 0; c < row.length; c++) cb(row[c]);
    }
  } else {
    cb(arg);
  }
}

// ── Scalar coercions ─────────────────────────────────────────────────────────

/**
 * Coerces a value to a number using Excel rules.
 *
 * - number → itself
 * - blank (`null`) → `0`
 * - boolean → `1` / `0`
 * - numeric string (trimmed) → its number; empty/non-numeric string → `#VALUE!`
 * - error → propagated unchanged
 *
 * @param v - The value to coerce.
 * @returns The number, or a {@link FormulaError}.
 */
export function toNumber(v: FormulaValue): number | FormulaError {
  if (typeof v === 'number') return v;
  if (v === null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (isFormulaError(v)) return v;
  const s = v.trim();
  if (s === '') return FormulaError.value('empty string is not a number');
  const n = Number(s);
  if (!Number.isFinite(n)) return FormulaError.value(`"${v}" is not a number`);
  return n;
}

/**
 * Coerces a value to display text using Excel rules.
 *
 * - string → itself
 * - blank (`null`) → `""`
 * - boolean → `"TRUE"` / `"FALSE"`
 * - number → its general-format string
 * - error → propagated unchanged
 *
 * @param v - The value to coerce.
 * @returns The text, or a {@link FormulaError}.
 */
export function toText(v: FormulaValue): string | FormulaError {
  if (typeof v === 'string') return v;
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return numberToText(v);
  return v; // FormulaError
}

/**
 * Coerces a value to a boolean using Excel rules.
 *
 * - boolean → itself
 * - blank (`null`) → `false`
 * - number → `v !== 0`
 * - `"TRUE"`/`"FALSE"` (case-insensitive) → the boolean; other strings → `#VALUE!`
 * - error → propagated unchanged
 *
 * @param v - The value to coerce.
 * @returns The boolean, or a {@link FormulaError}.
 */
export function toBoolean(v: FormulaValue): boolean | FormulaError {
  if (typeof v === 'boolean') return v;
  if (v === null) return false;
  if (typeof v === 'number') return v !== 0;
  if (isFormulaError(v)) return v;
  const s = v.trim().toUpperCase();
  if (s === 'TRUE') return true;
  if (s === 'FALSE') return false;
  return FormulaError.value(`"${v}" is not a boolean`);
}

/**
 * Renders a number as Excel's "General" format would: integers plainly, and
 * floats trimmed of binary-float noise (`0.1 + 0.2` → `"0.3"`).
 *
 * @param n - The number to render.
 * @returns The display string.
 */
export function numberToText(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // 15 significant digits mirrors Excel's precision and drops FP artifacts.
  return String(parseFloat(n.toPrecision(15)));
}

// ── Comparison ───────────────────────────────────────────────────────────────

/** Type ordering used for cross-type comparison: number < text < boolean. */
function typeRank(v: FormulaScalar): number {
  if (typeof v === 'number') return 0;
  if (typeof v === 'string') return 1;
  return 2; // boolean
}

/** The value a blank cell assumes when compared against `other`. */
function blankAs(other: FormulaScalar): FormulaScalar {
  if (typeof other === 'number') return 0;
  if (typeof other === 'string') return '';
  return false;
}

function sign(n: number): number {
  return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/**
 * Three-way comparison of two scalar values with Excel semantics.
 *
 * Numbers compare numerically, strings case-insensitively, booleans `false <
 * true`; across types the order is number < text < boolean. Blanks adopt the
 * counterpart's type (so `blank = 0` and `blank = ""` are both true). Any error
 * operand short-circuits.
 *
 * @param a - Left value.
 * @param b - Right value.
 * @returns `-1`, `0`, `1`, or a {@link FormulaError}.
 */
export function compareValues(a: FormulaValue, b: FormulaValue): number | FormulaError {
  if (isFormulaError(a)) return a;
  if (isFormulaError(b)) return b;

  let av: FormulaScalar = a;
  let bv: FormulaScalar = b;
  if (av === null && bv === null) return 0;
  if (av === null) av = blankAs(bv);
  if (bv === null) bv = blankAs(av);

  const ra = typeRank(av);
  const rb = typeRank(bv);
  if (ra !== rb) return ra < rb ? -1 : 1;

  if (typeof av === 'number') return sign(av - (bv as number));
  if (typeof av === 'string') {
    return sign((av as string).toLowerCase().localeCompare((bv as string).toLowerCase()));
  }
  // both boolean
  return av === bv ? 0 : av ? 1 : -1;
}

// ── Numeric aggregation ──────────────────────────────────────────────────────

/**
 * Collects numeric operands for an aggregation into `out`, applying Excel's
 * range-vs-literal rule:
 *
 * - **Inside a range (matrix)**: only genuine numbers are collected; blanks,
 *   text and booleans are ignored (they never turn a SUM into `#VALUE!`).
 * - **A scalar literal argument**: coerced via {@link toNumber}, so `SUM(1,"2",TRUE)`
 *   is `4`; a non-numeric literal string yields `#VALUE!`.
 *
 * Any error encountered (in a range cell or a literal) is returned immediately.
 *
 * @param args - The evaluated arguments.
 * @param out  - Destination array, appended in place (reused to avoid allocation).
 * @returns A {@link FormulaError} on the first error, otherwise `null`.
 */
export function collectNumbers(args: readonly FormulaArgument[], out: number[]): FormulaError | null {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (isMatrix(arg)) {
      for (let r = 0; r < arg.length; r++) {
        const row = arg[r];
        for (let c = 0; c < row.length; c++) {
          const v = row[c];
          if (isFormulaError(v)) return v;
          if (typeof v === 'number') out.push(v);
          // null / string / boolean inside a range are ignored (Excel behavior)
        }
      }
    } else {
      if (isFormulaError(arg)) return arg;
      if (arg === null) continue; // a blank literal contributes nothing
      const n = toNumber(arg);
      if (isFormulaError(n)) return n;
      out.push(n);
    }
  }
  return null;
}
