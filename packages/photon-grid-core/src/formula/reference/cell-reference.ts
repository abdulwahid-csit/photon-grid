/**
 * Pure `A1`-notation ⇄ index conversion primitives.
 *
 * This module is deliberately free of any grid, DOM or engine state: it only
 * converts between the textual `A1` address space and zero-based
 * `{ colIndex, rowIndex }` coordinates. Resolving those coordinates to concrete
 * grid cells is the job of `ReferenceResolver` (a later phase).
 *
 * All conversions are allocation-light and regex-free on the hot path, keeping
 * them safe to call for every reference in every formula at scale.
 *
 * @packageDocumentation
 */

import type { CellRef } from './reference.types';

const CHAR_CODE_A = 65; // 'A'
const CHAR_CODE_Z = 90; // 'Z'
const ALPHABET_SIZE = 26;

/**
 * Converts a column label (`"A"`, `"Z"`, `"AA"`, `"AA500"`'s letter part) to a
 * zero-based column index using bijective base-26.
 *
 * @param label - One or more ASCII letters (case-insensitive). Must be non-empty.
 * @returns The zero-based column index (`"A"` → 0, `"AA"` → 26), or `-1` if the
 *          label contains a non-letter character.
 */
export function columnLabelToIndex(label: string): number {
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    let code = label.charCodeAt(i);
    // Normalize lowercase a-z to uppercase.
    if (code >= 97 && code <= 122) code -= 32;
    if (code < CHAR_CODE_A || code > CHAR_CODE_Z) return -1;
    index = index * ALPHABET_SIZE + (code - CHAR_CODE_A + 1);
  }
  return index - 1;
}

/**
 * Converts a zero-based column index to its `A1` column label.
 *
 * @param index - Zero-based column index (`0` → `"A"`, `26` → `"AA"`).
 * @returns The column label, or `""` for a negative index.
 */
export function columnIndexToLabel(index: number): string {
  if (index < 0) return '';
  let n = index + 1;
  let label = '';
  while (n > 0) {
    const rem = (n - 1) % ALPHABET_SIZE;
    label = String.fromCharCode(CHAR_CODE_A + rem) + label;
    n = Math.floor((n - 1) / ALPHABET_SIZE);
  }
  return label;
}

/**
 * Parses a single `A1`-style cell address into a {@link CellRef}.
 *
 * Supports `$` anchors on either axis (`$A1`, `A$1`, `$A$1`). Does **not**
 * accept sheet prefixes or ranges — those are handled by the parser/range
 * resolver. Returns `null` when the text is not a well-formed single-cell
 * address.
 *
 * @param text - The raw address, e.g. `"AA500"` or `"$B$2"`.
 * @returns The parsed {@link CellRef}, or `null` if malformed.
 */
export function parseCellRef(text: string): CellRef | null {
  let i = 0;
  const len = text.length;
  if (len === 0) return null;

  const colAbsolute = text.charCodeAt(i) === 36; // '$'
  if (colAbsolute) i++;

  const letterStart = i;
  while (i < len) {
    const c = text.charCodeAt(i);
    const isLetter = (c >= CHAR_CODE_A && c <= CHAR_CODE_Z) || (c >= 97 && c <= 122);
    if (!isLetter) break;
    i++;
  }
  if (i === letterStart) return null; // no column letters
  const colIndex = columnLabelToIndex(text.slice(letterStart, i));
  if (colIndex < 0) return null;

  const rowAbsolute = i < len && text.charCodeAt(i) === 36; // '$'
  if (rowAbsolute) i++;

  const digitStart = i;
  while (i < len) {
    const c = text.charCodeAt(i);
    if (c < 48 || c > 57) break; // not 0-9
    i++;
  }
  if (i === digitStart) return null; // no row digits
  if (i !== len) return null; // trailing garbage

  const rowNumber = parseInt(text.slice(digitStart, i), 10);
  if (rowNumber < 1) return null; // A1 rows are 1-based

  return {
    colIndex,
    rowIndex: rowNumber - 1,
    colAbsolute,
    rowAbsolute,
  };
}

/**
 * Encodes a {@link CellRef} back to its `A1` string (with `$` anchors).
 *
 * @param ref - The cell reference to encode.
 * @returns The `A1` address, e.g. `"$B$2"`.
 */
export function encodeCellRef(ref: CellRef): string {
  const col = (ref.colAbsolute ? '$' : '') + columnIndexToLabel(ref.colIndex);
  const row = (ref.rowAbsolute ? '$' : '') + String(ref.rowIndex + 1);
  return col + row;
}
