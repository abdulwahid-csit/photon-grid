/**
 * Built-in logical functions: IF, IFS, AND, OR, NOT, XOR, plus the error-handling
 * IFERROR/IFNA.
 *
 * Arguments arrive already evaluated (the engine evaluates eagerly, matching
 * Excel's argument semantics), so `IF` selecting a branch simply returns that
 * branch's value and never propagates an error from the untaken branch.
 *
 * @packageDocumentation
 */

import type { FormulaFunction } from './formula-function';
import { FunctionCategory, UNLIMITED_ARGS } from './formula-function';
import type { FormulaArgument, FormulaValue } from '../types/formula.types';
import { FormulaError, FormulaErrorCode, isFormulaError } from '../error/formula-error';
import { forEachValue, scalarArg, toBoolean } from '../evaluator/coerce';

/** `IF(condition, valueIfTrue, [valueIfFalse])`. */
export class IfFunction implements FormulaFunction {
  readonly name = 'IF';
  readonly category = FunctionCategory.Logical;
  readonly minArgs = 2;
  readonly maxArgs = 3;
  readonly description = 'Returns one value if a condition is TRUE and another if FALSE.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const cond = toBoolean(scalarArg(args[0]));
    if (isFormulaError(cond)) return cond;
    if (cond) return scalarArg(args[1]);
    return args.length === 3 ? scalarArg(args[2]) : false;
  }
}

/** `IFS(cond1, val1, cond2, val2, …)` — first truthy condition wins; else `#N/A`. */
export class IfsFunction implements FormulaFunction {
  readonly name = 'IFS';
  readonly category = FunctionCategory.Logical;
  readonly minArgs = 2;
  readonly maxArgs = UNLIMITED_ARGS;
  readonly description = 'Checks multiple conditions and returns the first match.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    if (args.length % 2 !== 0) return FormulaError.na('IFS expects condition/value pairs');
    for (let i = 0; i < args.length; i += 2) {
      const cond = toBoolean(scalarArg(args[i]));
      if (isFormulaError(cond)) return cond;
      if (cond) return scalarArg(args[i + 1]);
    }
    return FormulaError.na('no IFS condition was met');
  }
}

/** `NOT(logical)` — logical negation. */
export class NotFunction implements FormulaFunction {
  readonly name = 'NOT';
  readonly category = FunctionCategory.Logical;
  readonly minArgs = 1;
  readonly maxArgs = 1;
  readonly description = 'Reverses the logic of its argument.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const b = toBoolean(scalarArg(args[0]));
    return isFormulaError(b) ? b : !b;
  }
}

/**
 * Shared reduction for boolean aggregators (AND/OR/XOR). Flattens every
 * argument, ignoring blanks (per Excel), coercing the rest to booleans, and
 * short-circuiting on any error or non-coercible value.
 */
abstract class BooleanAggregateFunction implements FormulaFunction {
  abstract readonly name: string;
  readonly category = FunctionCategory.Logical;
  readonly minArgs = 1;
  readonly maxArgs = UNLIMITED_ARGS;

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    let seen = 0;
    let trueCount = 0;
    let firstError: FormulaError | null = null;

    for (let i = 0; i < args.length && !firstError; i++) {
      forEachValue(args[i], (v) => {
        if (firstError) return;
        if (v === null) return; // blanks are ignored
        const b = toBoolean(v);
        if (isFormulaError(b)) {
          firstError = b;
          return;
        }
        seen++;
        if (b) trueCount++;
      });
    }

    if (firstError) return firstError;
    if (seen === 0) return FormulaError.value(`${this.name} received no logical values`);
    return this.reduce(trueCount, seen);
  }

  /** Derives the result from the count of TRUE values and total values seen. */
  protected abstract reduce(trueCount: number, total: number): boolean;
}

/** `AND(logical1, …)` — TRUE when every value is TRUE. */
export class AndFunction extends BooleanAggregateFunction {
  readonly name = 'AND';
  readonly description = 'Returns TRUE if all arguments are TRUE.';
  protected reduce(trueCount: number, total: number): boolean {
    return trueCount === total;
  }
}

/** `OR(logical1, …)` — TRUE when at least one value is TRUE. */
export class OrFunction extends BooleanAggregateFunction {
  readonly name = 'OR';
  readonly description = 'Returns TRUE if any argument is TRUE.';
  protected reduce(trueCount: number): boolean {
    return trueCount > 0;
  }
}

/** `XOR(logical1, …)` — TRUE when an odd number of values are TRUE. */
export class XorFunction extends BooleanAggregateFunction {
  readonly name = 'XOR';
  readonly description = 'Returns TRUE if an odd number of arguments are TRUE.';
  protected reduce(trueCount: number): boolean {
    return trueCount % 2 === 1;
  }
}

/** `IFERROR(value, valueIfError)` — substitutes a fallback for any error. */
export class IfErrorFunction implements FormulaFunction {
  readonly name = 'IFERROR';
  readonly category = FunctionCategory.Logical;
  readonly minArgs = 2;
  readonly maxArgs = 2;
  readonly description = 'Returns a fallback value if the first argument is an error.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const v = scalarArg(args[0]);
    return isFormulaError(v) ? scalarArg(args[1]) : v;
  }
}

/** `IFNA(value, valueIfNa)` — substitutes a fallback only for `#N/A`. */
export class IfNaFunction implements FormulaFunction {
  readonly name = 'IFNA';
  readonly category = FunctionCategory.Logical;
  readonly minArgs = 2;
  readonly maxArgs = 2;
  readonly description = 'Returns a fallback value only if the first argument is #N/A.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const v = scalarArg(args[0]);
    if (isFormulaError(v) && v.code === FormulaErrorCode.NA) return scalarArg(args[1]);
    return v;
  }
}
