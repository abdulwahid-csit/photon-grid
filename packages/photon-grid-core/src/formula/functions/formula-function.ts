/**
 * The extension contract every formula function implements, plus its category
 * taxonomy. Built-in functions (SUM, IF, VLOOKUP, …) and developer-registered
 * custom functions share this single interface, so the evaluator treats them
 * uniformly and the {@link FunctionRegistry} can be extended at runtime with no
 * engine changes.
 *
 * @packageDocumentation
 */

import type { FormulaArgument, FormulaValue } from '../types/formula.types';
import type { EvalContext } from '../types/eval-context';

/** Sentinel for a function that accepts an unbounded number of arguments. */
export const UNLIMITED_ARGS = Number.POSITIVE_INFINITY;

/**
 * Broad grouping used for documentation, the function picker UI and registry
 * organization. Purely descriptive — it does not affect evaluation.
 */
export enum FunctionCategory {
  Math = 'math',
  Text = 'text',
  Logical = 'logical',
  Lookup = 'lookup',
  Info = 'info',
  DateTime = 'datetime',
  Custom = 'custom',
}

/**
 * A single formula function.
 *
 * Implementations are **pure with respect to their arguments** (aside from
 * declared {@link volatile} functions, which may read `ctx.now()`/`ctx.random()`):
 * given the same `args` and grid state they must return the same value, and they
 * must never throw for user-facing error conditions — return a
 * {@link FormulaError} instead so it propagates like any other value.
 *
 * @example
 * ```ts
 * class SumFunction implements FormulaFunction {
 *   readonly name = 'SUM';
 *   readonly category = FunctionCategory.Math;
 *   readonly minArgs = 1;
 *   readonly maxArgs = UNLIMITED_ARGS;
 *   evaluate(args: readonly FormulaArgument[]): FormulaValue { ... }
 * }
 * ```
 */
export interface FormulaFunction {
  /** Upper-case canonical name used in formulas (e.g. `"SUM"`). */
  readonly name: string;
  /** Descriptive category (does not affect evaluation). */
  readonly category: FunctionCategory;
  /** Minimum number of arguments (inclusive). */
  readonly minArgs: number;
  /** Maximum number of arguments (inclusive); use {@link UNLIMITED_ARGS} for variadic. */
  readonly maxArgs: number;
  /**
   * When `true` the function is re-evaluated on every recalculation pass
   * regardless of dependency changes (e.g. `RAND`, `NOW`, `TODAY`). Volatile
   * cells are always treated as dirty.
   */
  readonly volatile?: boolean;
  /** Optional one-line description for docs/UI. */
  readonly description?: string;
  /**
   * Computes the function's result.
   *
   * @param args - Evaluated arguments in source order. Each is either a scalar
   *               {@link FormulaValue} or a {@link FormulaMatrix} (from a range).
   *               Arity has already been validated against
   *               {@link minArgs}/{@link maxArgs} by the evaluator.
   * @param ctx  - The evaluation context (config, sibling function lookup,
   *               reference resolution, volatile clocks).
   * @returns The scalar result value (or a {@link FormulaError}).
   */
  evaluate(args: readonly FormulaArgument[], ctx: EvalContext): FormulaValue;
}
