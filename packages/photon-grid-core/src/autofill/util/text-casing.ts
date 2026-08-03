/**
 * Casing helpers shared by the name-based detectors (month, weekday).
 *
 * Detectors capture the casing of the source text so extrapolated names match
 * the user's style (`JAN → FEB`, `jan → feb`, `Jan → Feb`).
 *
 * @packageDocumentation
 */

/** The three casing styles a name-based detector preserves. */
export enum TextCasing {
  /** First letter upper, rest lower (`January`). */
  Title = 'title',
  /** All upper (`JANUARY`). */
  Upper = 'upper',
  /** All lower (`january`). */
  Lower = 'lower',
}

/**
 * Infers the casing style of a word.
 *
 * @param word - A non-empty word.
 * @returns The detected {@link TextCasing} (defaults to {@link TextCasing.Title}).
 */
export function detectCasing(word: string): TextCasing {
  if (word === word.toUpperCase() && word !== word.toLowerCase()) return TextCasing.Upper;
  if (word === word.toLowerCase() && word !== word.toUpperCase()) return TextCasing.Lower;
  return TextCasing.Title;
}

/**
 * Applies a casing style to a canonical (Title-cased) name.
 *
 * @param name   - The canonical name (as produced by `Intl`).
 * @param casing - The target casing.
 * @returns The re-cased name.
 */
export function applyCasing(name: string, casing: TextCasing): string {
  switch (casing) {
    case TextCasing.Upper: return name.toUpperCase();
    case TextCasing.Lower: return name.toLowerCase();
    case TextCasing.Title: return name;
    default: return name;
  }
}
