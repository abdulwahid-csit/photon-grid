/**
 * Built-in mathematical & statistical functions.
 *
 * Two small abstract bases remove repeated arity/coercion boilerplate while
 * still giving every function its own class (per the engine's extension model):
 * {@link NumericAggregateFunction} for range-consuming reducers (SUM, AVERAGE, …)
 * and {@link UnaryMathFunction} for single-number transforms (ABS, SQRT, …).
 *
 * @packageDocumentation
 */

import type { FormulaFunction } from './formula-function';
import { FunctionCategory, UNLIMITED_ARGS } from './formula-function';
import type { EvalContext } from '../types/eval-context';
import type { FormulaArgument, FormulaValue } from '../types/formula.types';
import { FormulaError, isFormulaError } from '../error/formula-error';
import { collectNumbers, forEachValue, scalarArg, toNumber } from '../evaluator/coerce';

/**
 * Base for functions that reduce all numeric operands (flattening ranges, per
 * Excel's range-vs-literal rule) to a single value.
 */
abstract class NumericAggregateFunction implements FormulaFunction {
  abstract readonly name: string;
  readonly category = FunctionCategory.Math;
  readonly minArgs = 1;
  readonly maxArgs = UNLIMITED_ARGS;

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const nums: number[] = [];
    const err = collectNumbers(args, nums);
    if (err) return err;
    return this.reduce(nums);
  }

  /** Combines the collected numbers into the result. */
  protected abstract reduce(nums: readonly number[]): FormulaValue;
}

/** Base for single-argument numeric transforms. */
abstract class UnaryMathFunction implements FormulaFunction {
  abstract readonly name: string;
  readonly category = FunctionCategory.Math;
  readonly minArgs = 1;
  readonly maxArgs = 1;

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const n = toNumber(scalarArg(args[0]));
    return isFormulaError(n) ? n : this.compute(n);
  }

  /** Transforms the coerced numeric input. */
  protected abstract compute(n: number): FormulaValue;
}

/** Rounds `n` to `digits` decimal places, away from zero on ties (Excel). */
function roundHalfAwayFromZero(n: number, digits: number): number {
  const factor = Math.pow(10, digits);
  const scaled = n * factor;
  // Nudge to counter binary-float representation error before rounding.
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled) + 1e-10);
  return rounded / factor;
}

// ── Aggregates ───────────────────────────────────────────────────────────────

/** `SUM(number1, [number2], …)` — adds all numeric operands. */
export class SumFunction extends NumericAggregateFunction {
  readonly name = 'SUM';
  readonly description = 'Adds all numbers in the given range(s) and/or values.';
  protected reduce(nums: readonly number[]): FormulaValue {
    let total = 0;
    for (let i = 0; i < nums.length; i++) total += nums[i];
    return total;
  }
}

/** `AVERAGE(number1, …)` — arithmetic mean; `#DIV/0!` when there are no numbers. */
export class AverageFunction extends NumericAggregateFunction {
  readonly name = 'AVERAGE';
  readonly description = 'Returns the average (arithmetic mean) of the numbers.';
  protected reduce(nums: readonly number[]): FormulaValue {
    if (nums.length === 0) return FormulaError.div0('AVERAGE of no numbers');
    let total = 0;
    for (let i = 0; i < nums.length; i++) total += nums[i];
    return total / nums.length;
  }
}

/** `MIN(number1, …)` — smallest number, or `0` when there are none (Excel). */
export class MinFunction extends NumericAggregateFunction {
  readonly name = 'MIN';
  readonly description = 'Returns the smallest number in a set of values.';
  protected reduce(nums: readonly number[]): FormulaValue {
    if (nums.length === 0) return 0;
    let m = nums[0];
    for (let i = 1; i < nums.length; i++) if (nums[i] < m) m = nums[i];
    return m;
  }
}

/** `MAX(number1, …)` — largest number, or `0` when there are none (Excel). */
export class MaxFunction extends NumericAggregateFunction {
  readonly name = 'MAX';
  readonly description = 'Returns the largest number in a set of values.';
  protected reduce(nums: readonly number[]): FormulaValue {
    if (nums.length === 0) return 0;
    let m = nums[0];
    for (let i = 1; i < nums.length; i++) if (nums[i] > m) m = nums[i];
    return m;
  }
}

/** `COUNT(value1, …)` — counts how many operands are numbers. */
export class CountFunction extends NumericAggregateFunction {
  readonly name = 'COUNT';
  readonly description = 'Counts how many of the given values are numbers.';
  protected reduce(nums: readonly number[]): FormulaValue {
    return nums.length;
  }
}

/** `COUNTA(value1, …)` — counts non-blank operands (any type, including errors). */
export class CountAFunction implements FormulaFunction {
  readonly name = 'COUNTA';
  readonly category = FunctionCategory.Math;
  readonly minArgs = 1;
  readonly maxArgs = UNLIMITED_ARGS;
  readonly description = 'Counts the number of non-empty values.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    let count = 0;
    for (let i = 0; i < args.length; i++) {
      forEachValue(args[i], (v) => {
        if (v !== null) count++;
      });
    }
    return count;
  }
}

// ── Unary transforms ─────────────────────────────────────────────────────────

/** `ABS(number)` — absolute value. */
export class AbsFunction extends UnaryMathFunction {
  readonly name = 'ABS';
  readonly description = 'Returns the absolute value of a number.';
  protected compute(n: number): FormulaValue {
    return Math.abs(n);
  }
}

/** `SQRT(number)` — square root; `#NUM!` for negatives. */
export class SqrtFunction extends UnaryMathFunction {
  readonly name = 'SQRT';
  readonly description = 'Returns the positive square root of a number.';
  protected compute(n: number): FormulaValue {
    return n < 0 ? FormulaError.num('SQRT of a negative number') : Math.sqrt(n);
  }
}

// ── Rounding ─────────────────────────────────────────────────────────────────

/** Shared arity/coercion for the `ROUND*` family (number, [digits]). */
abstract class RoundingFunction implements FormulaFunction {
  abstract readonly name: string;
  readonly category = FunctionCategory.Math;
  readonly minArgs = 1;
  readonly maxArgs = 2;

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const n = toNumber(scalarArg(args[0]));
    if (isFormulaError(n)) return n;
    let digits = 0;
    if (args.length === 2) {
      const d = toNumber(scalarArg(args[1]));
      if (isFormulaError(d)) return d;
      digits = Math.trunc(d);
    }
    return this.round(n, digits);
  }

  protected abstract round(n: number, digits: number): FormulaValue;
}

/** `ROUND(number, [digits])` — round half away from zero. */
export class RoundFunction extends RoundingFunction {
  readonly name = 'ROUND';
  readonly description = 'Rounds a number to a specified number of digits.';
  protected round(n: number, digits: number): FormulaValue {
    return roundHalfAwayFromZero(n, digits);
  }
}

/** `ROUNDUP(number, [digits])` — round away from zero. */
export class RoundUpFunction extends RoundingFunction {
  readonly name = 'ROUNDUP';
  readonly description = 'Rounds a number up, away from zero.';
  protected round(n: number, digits: number): FormulaValue {
    const factor = Math.pow(10, digits);
    return (Math.sign(n) * Math.ceil(Math.abs(n) * factor)) / factor;
  }
}

/** `ROUNDDOWN(number, [digits])` — round toward zero. */
export class RoundDownFunction extends RoundingFunction {
  readonly name = 'ROUNDDOWN';
  readonly description = 'Rounds a number down, toward zero.';
  protected round(n: number, digits: number): FormulaValue {
    const factor = Math.pow(10, digits);
    return (Math.sign(n) * Math.floor(Math.abs(n) * factor)) / factor;
  }
}

// ── Power ────────────────────────────────────────────────────────────────────

/** `POWER(base, exponent)` — `base` raised to `exponent`. */
export class PowerFunction implements FormulaFunction {
  readonly name = 'POWER';
  readonly category = FunctionCategory.Math;
  readonly minArgs = 2;
  readonly maxArgs = 2;
  readonly description = 'Returns the result of a number raised to a power.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const base = toNumber(scalarArg(args[0]));
    if (isFormulaError(base)) return base;
    const exp = toNumber(scalarArg(args[1]));
    if (isFormulaError(exp)) return exp;
    const r = Math.pow(base, exp);
    return Number.isFinite(r) ? r : FormulaError.num('POWER overflow or invalid');
  }
}

// ── Random (volatile) ────────────────────────────────────────────────────────

/** `RAND()` — a uniform random number in `[0, 1)`. Volatile. */
export class RandFunction implements FormulaFunction {
  readonly name = 'RAND';
  readonly category = FunctionCategory.Math;
  readonly minArgs = 0;
  readonly maxArgs = 0;
  readonly volatile = true;
  readonly description = 'Returns a random number between 0 and 1.';

  evaluate(_args: readonly FormulaArgument[], ctx: EvalContext): FormulaValue {
    return ctx.random();
  }
}

/** `RANDBETWEEN(low, high)` — a random integer in `[low, high]`. Volatile. */
export class RandBetweenFunction implements FormulaFunction {
  readonly name = 'RANDBETWEEN';
  readonly category = FunctionCategory.Math;
  readonly minArgs = 2;
  readonly maxArgs = 2;
  readonly volatile = true;
  readonly description = 'Returns a random integer between two values (inclusive).';

  evaluate(args: readonly FormulaArgument[], ctx: EvalContext): FormulaValue {
    const low = toNumber(scalarArg(args[0]));
    if (isFormulaError(low)) return low;
    const high = toNumber(scalarArg(args[1]));
    if (isFormulaError(high)) return high;
    const lo = Math.ceil(low);
    const hi = Math.floor(high);
    if (lo > hi) return FormulaError.num('RANDBETWEEN: low is greater than high');
    return lo + Math.floor(ctx.random() * (hi - lo + 1));
  }
}
