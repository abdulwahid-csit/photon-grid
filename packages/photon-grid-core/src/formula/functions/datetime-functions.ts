/**
 * Built-in date/time functions: TODAY, NOW, YEAR, MONTH, DAY.
 *
 * Dates use the **Excel serial-number model**: day 1 is 1900-01-01, so a date is
 * a number of days since the 1899-12-30 epoch and a datetime carries a
 * fractional day. TODAY/NOW read the injected {@link EvalContext.now} clock (not
 * `Date.now()`), keeping them deterministic under test and stable within a
 * single recalculation pass. All arithmetic is done in UTC for determinism.
 *
 * @packageDocumentation
 */

import type { FormulaFunction } from './formula-function';
import { FunctionCategory } from './formula-function';
import type { EvalContext } from '../types/eval-context';
import type { FormulaArgument, FormulaValue } from '../types/formula.types';
import { FormulaError, isFormulaError } from '../error/formula-error';
import { scalarArg } from '../evaluator/coerce';

const DAY_MS = 86_400_000;
/** Excel's serial-date epoch: 1899-12-30 (serial 0). */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

/** Converts epoch milliseconds to an Excel serial number (fractional days). */
function msToSerial(ms: number): number {
  return (ms - EXCEL_EPOCH_MS) / DAY_MS;
}

/**
 * Resolves a date-valued argument to a UTC {@link Date}. Accepts an Excel serial
 * number, a parseable date string, a blank (serial 0) or a boolean (0/1).
 */
function toDate(v: FormulaValue): Date | FormulaError {
  if (isFormulaError(v)) return v;
  if (typeof v === 'number') return new Date(EXCEL_EPOCH_MS + v * DAY_MS);
  if (typeof v === 'boolean') return new Date(EXCEL_EPOCH_MS + (v ? 1 : 0) * DAY_MS);
  if (v === null) return new Date(EXCEL_EPOCH_MS);
  const t = Date.parse(v);
  return Number.isNaN(t) ? FormulaError.value(`"${v}" is not a valid date`) : new Date(t);
}

/** `TODAY()` — today's date as an Excel serial number (integer). Volatile. */
export class TodayFunction implements FormulaFunction {
  readonly name = 'TODAY';
  readonly category = FunctionCategory.DateTime;
  readonly minArgs = 0;
  readonly maxArgs = 0;
  readonly volatile = true;
  readonly description = "Returns today's date as a serial number.";

  evaluate(_args: readonly FormulaArgument[], ctx: EvalContext): FormulaValue {
    return Math.floor(msToSerial(ctx.now()));
  }
}

/** `NOW()` — current date and time as an Excel serial number. Volatile. */
export class NowFunction implements FormulaFunction {
  readonly name = 'NOW';
  readonly category = FunctionCategory.DateTime;
  readonly minArgs = 0;
  readonly maxArgs = 0;
  readonly volatile = true;
  readonly description = 'Returns the current date and time as a serial number.';

  evaluate(_args: readonly FormulaArgument[], ctx: EvalContext): FormulaValue {
    return msToSerial(ctx.now());
  }
}

/** Base for the YEAR/MONTH/DAY extractors. */
abstract class DatePartFunction implements FormulaFunction {
  abstract readonly name: string;
  readonly category = FunctionCategory.DateTime;
  readonly minArgs = 1;
  readonly maxArgs = 1;

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const d = toDate(scalarArg(args[0]));
    return isFormulaError(d) ? d : this.part(d);
  }

  /** Extracts the desired UTC calendar part from `d`. */
  protected abstract part(d: Date): number;
}

/** `YEAR(date)` — the 4-digit year. */
export class YearFunction extends DatePartFunction {
  readonly name = 'YEAR';
  readonly description = 'Returns the year of a date.';
  protected part(d: Date): number {
    return d.getUTCFullYear();
  }
}

/** `MONTH(date)` — the month (1–12). */
export class MonthFunction extends DatePartFunction {
  readonly name = 'MONTH';
  readonly description = 'Returns the month of a date (1–12).';
  protected part(d: Date): number {
    return d.getUTCMonth() + 1;
  }
}

/** `DAY(date)` — the day of the month (1–31). */
export class DayFunction extends DatePartFunction {
  readonly name = 'DAY';
  readonly description = 'Returns the day of the month of a date (1–31).';
  protected part(d: Date): number {
    return d.getUTCDate();
  }
}
