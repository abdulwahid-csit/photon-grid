/**
 * The evaluation context handed to the evaluator and to every
 * {@link FormulaFunction}. It is the *only* channel through which formula code
 * reaches grid state (cell/range/name resolution) and environment
 * (config, volatile clocks) — keeping functions pure and the engine
 * dependency-injected rather than reaching for globals.
 *
 * @packageDocumentation
 */

import type { FormulaValue, FormulaMatrix } from './formula.types';
import type { CellRef, RangeRef, Reference } from '../reference/reference.types';
import type { ResolvedFormulaConfig } from '../config/formula-config';
import type { FunctionRegistry } from '../functions/function-registry';

/**
 * Read-only view of the grid + environment used during a single recalculation
 * pass. Implemented by the calculation engine and passed down through the
 * evaluator into functions.
 */
export interface EvalContext {
  /** The fully-resolved, defaults-applied engine configuration. */
  readonly config: ResolvedFormulaConfig;
  /** Registry used to look up nested/among-argument functions. */
  readonly functions: FunctionRegistry;

  /**
   * Resolves a single-cell reference to its current value.
   *
   * Returns `null` for a blank cell and a {@link FormulaError} (`#REF!`) when
   * the reference falls outside the live data bounds.
   *
   * @param ref - The parsed cell reference (positional, data-model bound).
   */
  resolveCell(ref: CellRef): FormulaValue;

  /**
   * Resolves a range reference to a dense `[row][col]` matrix of values.
   *
   * Whole-column/row ranges are clamped to the current data bounds.
   *
   * @param ref - The parsed range reference.
   */
  resolveRange(ref: RangeRef): FormulaMatrix;

  /**
   * Resolves a named range/cell to its underlying reference, or `null` when the
   * name is unknown (the caller then yields `#NAME?`).
   *
   * @param name - The name as written in the formula (case-insensitive).
   */
  resolveName(name: string): Reference | null;

  /**
   * Current wall-clock time as epoch milliseconds. Injected (not `Date.now()`)
   * so `NOW`/`TODAY` are deterministic under test and consistent within a pass.
   */
  now(): number;

  /**
   * A uniform random number in `[0, 1)`. Injected so `RAND`/`RANDBETWEEN` are
   * controllable under test.
   */
  random(): number;
}
