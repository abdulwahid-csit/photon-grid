/**
 * Built-in text functions: LEFT, RIGHT, MID, LEN, TRIM, LOWER, UPPER, CONCAT,
 * CONCATENATE, TEXTJOIN, FIND, SEARCH, REPLACE, SUBSTITUTE.
 *
 * All indices follow Excel's **1-based** convention at the formula surface; the
 * implementations convert to 0-based JS string offsets internally.
 *
 * @packageDocumentation
 */

import type { FormulaFunction } from './formula-function';
import { FunctionCategory, UNLIMITED_ARGS } from './formula-function';
import type { FormulaArgument, FormulaValue } from '../types/formula.types';
import { FormulaError, isFormulaError } from '../error/formula-error';
import { forEachValue, scalarArg, toBoolean, toNumber, toText } from '../evaluator/coerce';

/** Coerces one argument position to text, short-circuiting on error. */
function textArg(arg: FormulaArgument): string | FormulaError {
  return toText(scalarArg(arg));
}

/** Coerces one argument position to an integer, short-circuiting on error. */
function intArg(arg: FormulaArgument): number | FormulaError {
  const n = toNumber(scalarArg(arg));
  return isFormulaError(n) ? n : Math.trunc(n);
}

/** `LEN(text)` — number of characters. */
export class LenFunction implements FormulaFunction {
  readonly name = 'LEN';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 1;
  readonly maxArgs = 1;
  readonly description = 'Returns the number of characters in a text string.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const s = textArg(args[0]);
    return isFormulaError(s) ? s : s.length;
  }
}

/** `LEFT(text, [count])` — leading characters (default 1). */
export class LeftFunction implements FormulaFunction {
  readonly name = 'LEFT';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 1;
  readonly maxArgs = 2;
  readonly description = 'Returns the first characters of a text string.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const s = textArg(args[0]);
    if (isFormulaError(s)) return s;
    let count = 1;
    if (args.length === 2) {
      const n = intArg(args[1]);
      if (isFormulaError(n)) return n;
      count = n;
    }
    if (count < 0) return FormulaError.value('LEFT count is negative');
    return s.slice(0, count);
  }
}

/** `RIGHT(text, [count])` — trailing characters (default 1). */
export class RightFunction implements FormulaFunction {
  readonly name = 'RIGHT';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 1;
  readonly maxArgs = 2;
  readonly description = 'Returns the last characters of a text string.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const s = textArg(args[0]);
    if (isFormulaError(s)) return s;
    let count = 1;
    if (args.length === 2) {
      const n = intArg(args[1]);
      if (isFormulaError(n)) return n;
      count = n;
    }
    if (count < 0) return FormulaError.value('RIGHT count is negative');
    return count >= s.length ? s : s.slice(s.length - count);
  }
}

/** `MID(text, start, count)` — `count` characters from 1-based `start`. */
export class MidFunction implements FormulaFunction {
  readonly name = 'MID';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 3;
  readonly maxArgs = 3;
  readonly description = 'Returns characters from the middle of a text string.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const s = textArg(args[0]);
    if (isFormulaError(s)) return s;
    const start = intArg(args[1]);
    if (isFormulaError(start)) return start;
    const count = intArg(args[2]);
    if (isFormulaError(count)) return count;
    if (start < 1) return FormulaError.value('MID start must be >= 1');
    if (count < 0) return FormulaError.value('MID count is negative');
    return s.slice(start - 1, start - 1 + count);
  }
}

/** `TRIM(text)` — collapses runs of spaces and trims ends (Excel semantics). */
export class TrimFunction implements FormulaFunction {
  readonly name = 'TRIM';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 1;
  readonly maxArgs = 1;
  readonly description = 'Removes leading, trailing and repeated spaces from text.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const s = textArg(args[0]);
    if (isFormulaError(s)) return s;
    return s.replace(/ +/g, ' ').trim();
  }
}

/** `LOWER(text)` — lowercase. */
export class LowerFunction implements FormulaFunction {
  readonly name = 'LOWER';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 1;
  readonly maxArgs = 1;
  readonly description = 'Converts text to lowercase.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const s = textArg(args[0]);
    return isFormulaError(s) ? s : s.toLowerCase();
  }
}

/** `UPPER(text)` — uppercase. */
export class UpperFunction implements FormulaFunction {
  readonly name = 'UPPER';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 1;
  readonly maxArgs = 1;
  readonly description = 'Converts text to uppercase.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const s = textArg(args[0]);
    return isFormulaError(s) ? s : s.toUpperCase();
  }
}

/**
 * Shared concatenation for CONCAT/CONCATENATE — flattens every argument
 * (including ranges) to text and joins with no separator.
 */
abstract class ConcatBaseFunction implements FormulaFunction {
  abstract readonly name: string;
  readonly category = FunctionCategory.Text;
  readonly minArgs = 1;
  readonly maxArgs = UNLIMITED_ARGS;

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    let out = '';
    let err: FormulaError | null = null;
    for (let i = 0; i < args.length && !err; i++) {
      forEachValue(args[i], (v) => {
        if (err) return;
        const t = toText(v);
        if (isFormulaError(t)) err = t;
        else out += t;
      });
    }
    return err ?? out;
  }
}

/** `CONCAT(text1, …)` — joins text, flattening ranges. */
export class ConcatFunction extends ConcatBaseFunction {
  readonly name = 'CONCAT';
  readonly description = 'Joins several text strings (and ranges) into one.';
}

/** `CONCATENATE(text1, …)` — legacy alias of CONCAT. */
export class ConcatenateFunction extends ConcatBaseFunction {
  readonly name = 'CONCATENATE';
  readonly description = 'Joins several text strings into one (legacy).';
}

/** `TEXTJOIN(delimiter, ignoreEmpty, text1, …)`. */
export class TextJoinFunction implements FormulaFunction {
  readonly name = 'TEXTJOIN';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 3;
  readonly maxArgs = UNLIMITED_ARGS;
  readonly description = 'Joins text with a delimiter, optionally skipping empties.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const delim = textArg(args[0]);
    if (isFormulaError(delim)) return delim;
    const ignoreEmpty = toBoolean(scalarArg(args[1]));
    if (isFormulaError(ignoreEmpty)) return ignoreEmpty;

    const parts: string[] = [];
    let err: FormulaError | null = null;
    for (let i = 2; i < args.length && !err; i++) {
      forEachValue(args[i], (v) => {
        if (err) return;
        if (ignoreEmpty && (v === null || v === '')) return;
        const t = toText(v);
        if (isFormulaError(t)) err = t;
        else parts.push(t);
      });
    }
    return err ?? parts.join(delim);
  }
}

/** `FIND(needle, haystack, [start])` — case-sensitive; `#VALUE!` when not found. */
export class FindFunction implements FormulaFunction {
  readonly name = 'FIND';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 2;
  readonly maxArgs = 3;
  readonly description = 'Finds one text string within another (case-sensitive).';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const needle = textArg(args[0]);
    if (isFormulaError(needle)) return needle;
    const haystack = textArg(args[1]);
    if (isFormulaError(haystack)) return haystack;
    let start = 1;
    if (args.length === 3) {
      const s = intArg(args[2]);
      if (isFormulaError(s)) return s;
      start = s;
    }
    if (start < 1) return FormulaError.value('FIND start must be >= 1');
    const idx = haystack.indexOf(needle, start - 1);
    return idx === -1 ? FormulaError.value('FIND: text not found') : idx + 1;
  }
}

/** `SEARCH(needle, haystack, [start])` — case-insensitive; `#VALUE!` when not found. */
export class SearchFunction implements FormulaFunction {
  readonly name = 'SEARCH';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 2;
  readonly maxArgs = 3;
  readonly description = 'Finds one text string within another (case-insensitive).';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const needle = textArg(args[0]);
    if (isFormulaError(needle)) return needle;
    const haystack = textArg(args[1]);
    if (isFormulaError(haystack)) return haystack;
    let start = 1;
    if (args.length === 3) {
      const s = intArg(args[2]);
      if (isFormulaError(s)) return s;
      start = s;
    }
    if (start < 1) return FormulaError.value('SEARCH start must be >= 1');
    const idx = haystack.toLowerCase().indexOf(needle.toLowerCase(), start - 1);
    return idx === -1 ? FormulaError.value('SEARCH: text not found') : idx + 1;
  }
}

/** `REPLACE(text, start, count, newText)` — positional replacement. */
export class ReplaceFunction implements FormulaFunction {
  readonly name = 'REPLACE';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 4;
  readonly maxArgs = 4;
  readonly description = 'Replaces part of a text string with different text.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const s = textArg(args[0]);
    if (isFormulaError(s)) return s;
    const start = intArg(args[1]);
    if (isFormulaError(start)) return start;
    const count = intArg(args[2]);
    if (isFormulaError(count)) return count;
    const replacement = textArg(args[3]);
    if (isFormulaError(replacement)) return replacement;
    if (start < 1) return FormulaError.value('REPLACE start must be >= 1');
    if (count < 0) return FormulaError.value('REPLACE count is negative');
    const from = start - 1;
    return s.slice(0, from) + replacement + s.slice(from + count);
  }
}

/** `SUBSTITUTE(text, oldText, newText, [instance])` — text-matched replacement. */
export class SubstituteFunction implements FormulaFunction {
  readonly name = 'SUBSTITUTE';
  readonly category = FunctionCategory.Text;
  readonly minArgs = 3;
  readonly maxArgs = 4;
  readonly description = 'Substitutes new text for old text in a string.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const s = textArg(args[0]);
    if (isFormulaError(s)) return s;
    const oldText = textArg(args[1]);
    if (isFormulaError(oldText)) return oldText;
    const newText = textArg(args[2]);
    if (isFormulaError(newText)) return newText;

    if (oldText === '') return s; // nothing to match

    if (args.length === 4) {
      const instance = intArg(args[3]);
      if (isFormulaError(instance)) return instance;
      if (instance < 1) return FormulaError.value('SUBSTITUTE instance must be >= 1');
      return this.replaceNth(s, oldText, newText, instance);
    }
    return s.split(oldText).join(newText);
  }

  /** Replaces only the `n`-th (1-based) occurrence of `oldText`. */
  private replaceNth(s: string, oldText: string, newText: string, n: number): string {
    let idx = -1;
    let count = 0;
    do {
      idx = s.indexOf(oldText, idx + 1);
      if (idx === -1) return s; // fewer than n occurrences
      count++;
    } while (count < n);
    return s.slice(0, idx) + newText + s.slice(idx + oldText.length);
  }
}
