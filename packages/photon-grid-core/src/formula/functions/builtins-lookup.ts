/**
 * Built-in lookup & reference functions: VLOOKUP, HLOOKUP, INDEX, MATCH, CHOOSE.
 *
 * These operate on {@link FormulaMatrix} arguments (produced by range
 * references). Positions are Excel **1-based**. Comparisons route through the
 * shared {@link compareValues} so lookup ordering matches the rest of the engine.
 *
 * @packageDocumentation
 */

import type { FormulaFunction } from './formula-function';
import { FunctionCategory, UNLIMITED_ARGS } from './formula-function';
import type { FormulaArgument, FormulaValue, FormulaMatrix } from '../types/formula.types';
import { FormulaError, isFormulaError } from '../error/formula-error';
import { compareValues, isMatrix, scalarArg, toBoolean, toNumber } from '../evaluator/coerce';

/** Widens a scalar-or-matrix argument to a matrix (`[[v]]` for a scalar). */
function asMatrix(arg: FormulaArgument): FormulaMatrix {
  return isMatrix(arg) ? arg : [[arg]];
}

/** Coerces an argument position to a 1-based integer. */
function intArg(arg: FormulaArgument): number | FormulaError {
  const n = toNumber(scalarArg(arg));
  return isFormulaError(n) ? n : Math.trunc(n);
}

/**
 * Flattens a single-row or single-column matrix to a 1-D vector for MATCH.
 * Returns `#N/A` for a 2-D matrix (MATCH requires a vector).
 */
function toVector(m: FormulaMatrix): FormulaValue[] | FormulaError {
  if (m.length === 1) return m[0].slice();
  if (m.length > 0 && m[0].length === 1) {
    const out: FormulaValue[] = new Array(m.length);
    for (let r = 0; r < m.length; r++) out[r] = m[r][0];
    return out;
  }
  return FormulaError.na('MATCH requires a single row or column');
}

/** `VLOOKUP(lookup, table, colIndex, [approx])`. */
export class VLookupFunction implements FormulaFunction {
  readonly name = 'VLOOKUP';
  readonly category = FunctionCategory.Lookup;
  readonly minArgs = 3;
  readonly maxArgs = 4;
  readonly description = 'Looks up a value in the first column of a table.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const lookup = scalarArg(args[0]);
    if (isFormulaError(lookup)) return lookup;
    const table = asMatrix(args[1]);
    const colIndex = intArg(args[2]);
    if (isFormulaError(colIndex)) return colIndex;
    let approx = true;
    if (args.length === 4) {
      const a = toBoolean(scalarArg(args[3]));
      if (isFormulaError(a)) return a;
      approx = a;
    }
    if (table.length === 0 || colIndex < 1 || colIndex > table[0].length) {
      return FormulaError.ref('VLOOKUP column index out of range');
    }
    const row = findRow(table, lookup, approx);
    if (isFormulaError(row)) return row;
    return row === -1 ? FormulaError.na('VLOOKUP: value not found') : table[row][colIndex - 1];
  }
}

/** `HLOOKUP(lookup, table, rowIndex, [approx])`. */
export class HLookupFunction implements FormulaFunction {
  readonly name = 'HLOOKUP';
  readonly category = FunctionCategory.Lookup;
  readonly minArgs = 3;
  readonly maxArgs = 4;
  readonly description = 'Looks up a value in the first row of a table.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const lookup = scalarArg(args[0]);
    if (isFormulaError(lookup)) return lookup;
    const table = asMatrix(args[1]);
    const rowIndex = intArg(args[2]);
    if (isFormulaError(rowIndex)) return rowIndex;
    let approx = true;
    if (args.length === 4) {
      const a = toBoolean(scalarArg(args[3]));
      if (isFormulaError(a)) return a;
      approx = a;
    }
    if (table.length === 0 || rowIndex < 1 || rowIndex > table.length) {
      return FormulaError.ref('HLOOKUP row index out of range');
    }
    const header = table[0];
    const col = findInVector(header, lookup, approx);
    if (isFormulaError(col)) return col;
    return col === -1 ? FormulaError.na('HLOOKUP: value not found') : table[rowIndex - 1][col];
  }
}

/** `INDEX(array, rowNum, [colNum])`. */
export class IndexFunction implements FormulaFunction {
  readonly name = 'INDEX';
  readonly category = FunctionCategory.Lookup;
  readonly minArgs = 2;
  readonly maxArgs = 3;
  readonly description = 'Returns a value from an array by row/column position.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const m = asMatrix(args[0]);
    if (m.length === 0) return FormulaError.ref('INDEX of an empty array');
    const rowNum = intArg(args[1]);
    if (isFormulaError(rowNum)) return rowNum;

    // Single-row or single-column arrays let the position index along the
    // available axis when the second index is omitted.
    if (args.length === 2) {
      if (m.length === 1) return this.pick(m, 1, rowNum);
      if (m[0].length === 1) return this.pick(m, rowNum, 1);
      return FormulaError.ref('INDEX requires a column number for a 2-D array');
    }
    const colNum = intArg(args[2]);
    if (isFormulaError(colNum)) return colNum;
    return this.pick(m, rowNum, colNum);
  }

  /** Bounds-checked (1-based) element access. */
  private pick(m: FormulaMatrix, rowNum: number, colNum: number): FormulaValue {
    if (rowNum < 1 || rowNum > m.length) return FormulaError.ref('INDEX row out of range');
    const row = m[rowNum - 1];
    if (colNum < 1 || colNum > row.length) return FormulaError.ref('INDEX column out of range');
    return row[colNum - 1];
  }
}

/** `MATCH(lookup, vector, [matchType])` — 1 (asc), 0 (exact), -1 (desc). */
export class MatchFunction implements FormulaFunction {
  readonly name = 'MATCH';
  readonly category = FunctionCategory.Lookup;
  readonly minArgs = 2;
  readonly maxArgs = 3;
  readonly description = 'Returns the relative position of a value in a vector.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const lookup = scalarArg(args[0]);
    if (isFormulaError(lookup)) return lookup;
    const vec = toVector(asMatrix(args[1]));
    if (isFormulaError(vec)) return vec;
    let matchType = 1;
    if (args.length === 3) {
      const t = intArg(args[2]);
      if (isFormulaError(t)) return t;
      matchType = t;
    }

    if (matchType === 0) {
      for (let i = 0; i < vec.length; i++) {
        const c = compareValues(vec[i], lookup);
        if (!isFormulaError(c) && c === 0) return i + 1;
      }
      return FormulaError.na('MATCH: value not found');
    }

    // Ascending (1): largest value <= lookup. Descending (-1): smallest >= lookup.
    let best = -1;
    for (let i = 0; i < vec.length; i++) {
      const c = compareValues(vec[i], lookup);
      if (isFormulaError(c)) continue;
      if (matchType === 1 && c <= 0) best = i;
      else if (matchType === -1 && c >= 0) best = i;
    }
    return best === -1 ? FormulaError.na('MATCH: value not found') : best + 1;
  }
}

/** `CHOOSE(index, value1, value2, …)` — returns the index-th value (1-based). */
export class ChooseFunction implements FormulaFunction {
  readonly name = 'CHOOSE';
  readonly category = FunctionCategory.Lookup;
  readonly minArgs = 2;
  readonly maxArgs = UNLIMITED_ARGS;
  readonly description = 'Returns one of a list of values by numeric index.';

  evaluate(args: readonly FormulaArgument[]): FormulaValue {
    const index = intArg(args[0]);
    if (isFormulaError(index)) return index;
    if (index < 1 || index > args.length - 1) return FormulaError.value('CHOOSE index out of range');
    return scalarArg(args[index]);
  }
}

// ── Shared search helpers ────────────────────────────────────────────────────

/** Finds the matching row in `table` by its first column. */
function findRow(table: FormulaMatrix, lookup: FormulaValue, approx: boolean): number | FormulaError {
  if (!approx) {
    for (let r = 0; r < table.length; r++) {
      const c = compareValues(table[r][0], lookup);
      if (!isFormulaError(c) && c === 0) return r;
    }
    return -1;
  }
  // Approximate: assume ascending; take the last row whose key is <= lookup.
  let best = -1;
  for (let r = 0; r < table.length; r++) {
    const c = compareValues(table[r][0], lookup);
    if (isFormulaError(c)) continue;
    if (c <= 0) best = r;
    else break;
  }
  return best;
}

/** Finds the matching index in a 1-D vector (used by HLOOKUP header search). */
function findInVector(vec: readonly FormulaValue[], lookup: FormulaValue, approx: boolean): number | FormulaError {
  if (!approx) {
    for (let i = 0; i < vec.length; i++) {
      const c = compareValues(vec[i], lookup);
      if (!isFormulaError(c) && c === 0) return i;
    }
    return -1;
  }
  let best = -1;
  for (let i = 0; i < vec.length; i++) {
    const c = compareValues(vec[i], lookup);
    if (isFormulaError(c)) continue;
    if (c <= 0) best = i;
    else break;
  }
  return best;
}
