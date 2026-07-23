/**
 * Built-in information/type-test functions: ISBLANK, ISNUMBER, ISTEXT,
 * ISLOGICAL, ISERROR, ISERR, ISNA.
 *
 * These inspect a value's *type* and therefore must **not** short-circuit on
 * errors — `ISERROR(1/0)` is `TRUE`, not `#DIV/0!`. Each reads the raw value via
 * {@link scalarArg} and tests it directly.
 *
 * @packageDocumentation
 */

import type { FormulaFunction } from './formula-function';
import { FunctionCategory } from './formula-function';
import type { FormulaArgument, FormulaValue } from '../types/formula.types';
import { FormulaError, FormulaErrorCode, isFormulaError } from '../error/formula-error';
import { scalarArg } from '../evaluator/coerce';

/** `NA()` — returns the `#N/A` error value (used to mark missing data). */
export class NaFunction implements FormulaFunction {
  readonly name = 'NA';
  readonly category = FunctionCategory.Info;
  readonly minArgs = 0;
  readonly maxArgs = 0;
  readonly description = 'Returns the #N/A error value.';

  evaluate(): FormulaValue {
    return FormulaError.na();
  }
}

/** Base for single-argument type predicates that do not propagate errors. */
abstract class TypeTestFunction implements FormulaFunction {
  abstract readonly name: string;
  readonly category = FunctionCategory.Info;
  readonly minArgs = 1;
  readonly maxArgs = 1;

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    return this.test(scalarArg(args[0]));
  }

  /** Returns the boolean predicate result for `v`. */
  protected abstract test(v: FormulaValue): boolean;
}

/** `ISBLANK(value)` — TRUE for an empty cell (`null`). */
export class IsBlankFunction extends TypeTestFunction {
  readonly name = 'ISBLANK';
  readonly description = 'Returns TRUE if the value is an empty cell.';
  protected test(v: FormulaValue): boolean {
    return v === null;
  }
}

/** `ISNUMBER(value)` — TRUE for a number. */
export class IsNumberFunction extends TypeTestFunction {
  readonly name = 'ISNUMBER';
  readonly description = 'Returns TRUE if the value is a number.';
  protected test(v: FormulaValue): boolean {
    return typeof v === 'number';
  }
}

/** `ISTEXT(value)` — TRUE for text. */
export class IsTextFunction extends TypeTestFunction {
  readonly name = 'ISTEXT';
  readonly description = 'Returns TRUE if the value is text.';
  protected test(v: FormulaValue): boolean {
    return typeof v === 'string';
  }
}

/** `ISLOGICAL(value)` — TRUE for a boolean. */
export class IsLogicalFunction extends TypeTestFunction {
  readonly name = 'ISLOGICAL';
  readonly description = 'Returns TRUE if the value is a logical (boolean) value.';
  protected test(v: FormulaValue): boolean {
    return typeof v === 'boolean';
  }
}

/** `ISERROR(value)` — TRUE for any error value. */
export class IsErrorFunction extends TypeTestFunction {
  readonly name = 'ISERROR';
  readonly description = 'Returns TRUE if the value is any error.';
  protected test(v: FormulaValue): boolean {
    return isFormulaError(v);
  }
}

/** `ISERR(value)` — TRUE for any error except `#N/A`. */
export class IsErrFunction extends TypeTestFunction {
  readonly name = 'ISERR';
  readonly description = 'Returns TRUE if the value is an error other than #N/A.';
  protected test(v: FormulaValue): boolean {
    return isFormulaError(v) && v.code !== FormulaErrorCode.NA;
  }
}

/** `ISNA(value)` — TRUE only for `#N/A`. */
export class IsNaFunction extends TypeTestFunction {
  readonly name = 'ISNA';
  readonly description = 'Returns TRUE only if the value is the #N/A error.';
  protected test(v: FormulaValue): boolean {
    return isFormulaError(v) && v.code === FormulaErrorCode.NA;
  }
}
