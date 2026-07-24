/**
 * Shared cyclic-name series detection for the month and weekday detectors.
 *
 * Both patterns are "a rotating list of localized names" — only the table and
 * modulus differ — so the recognition and extrapolation logic lives here once.
 * It matches long or short names case-insensitively, preserves the source's
 * variant (full vs abbreviated) and casing, and wraps around the cycle.
 *
 * @packageDocumentation
 */

import type { AutoFillSeries } from '../detectors/pattern-detector';
import type { AutoFillValue } from '../types/autofill.types';
import type { NameTable } from './locale-names';
import { detectCasing, applyCasing, type TextCasing } from './text-casing';

/** Positive remainder so backward extrapolation wraps (`Jan → Dec`). */
function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}

/** Normalizes a candidate name the same way {@link NameTable} keys are normalized. */
function normalize(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\.$/, '')
    .trim()
    .toLowerCase();
}

/**
 * Attempts to read `source` as a cyclic sequence of names from `table`.
 *
 * @param source  - Ordered source values (length `>= 1`).
 * @param table   - The locale's {@link NameTable}.
 * @param modulus - Cycle length (12 for months, 7 for weekdays).
 * @returns A series that emits localized names, or `null` if not all cells are
 *          recognized names or the index step is not constant.
 */
export function detectCyclicNames(
  source: readonly AutoFillValue[],
  table: NameTable,
  modulus: number,
): AutoFillSeries | null {
  const n = source.length;
  const indices = new Array<number>(n);
  let useShort = false;
  let casing: TextCasing | null = null;

  for (let i = 0; i < n; i++) {
    const v = source[i];
    if (typeof v !== 'string' || v.trim() === '') return null;
    const key = normalize(v);
    const idx = table.index.get(key);
    if (idx === undefined) return null;
    indices[i] = idx;

    // Determine long-vs-short and casing from the first cell; the rest may vary
    // in casing but the variant (full/abbrev) is fixed by the first for output.
    if (i === 0) {
      useShort = key !== normalize(table.long[idx]);
      casing = detectCasing(v.trim());
    }
  }

  let step = 1; // single name → advance by one (Excel behavior)
  if (n >= 2) {
    step = mod(indices[1] - indices[0], modulus);
    for (let i = 2; i < n; i++) {
      if (mod(indices[i] - indices[i - 1], modulus) !== step) return null;
    }
  }

  const base = indices[0];
  const names = useShort ? table.short : table.long;
  const resolvedCasing = casing ?? undefined;

  return {
    valueAt: (position: number): string => {
      const name = names[mod(base + step * position, modulus)];
      return resolvedCasing ? applyCasing(name, resolvedCasing) : name;
    },
  };
}
