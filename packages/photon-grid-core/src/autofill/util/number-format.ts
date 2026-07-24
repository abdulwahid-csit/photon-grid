/**
 * Numeric-string helpers for AutoFill detectors.
 *
 * Centralizes the two subtle numeric concerns detectors share: recognizing a
 * *canonical* numeric string (so `"001"` is left to the text-number detector),
 * and formatting an integer back to a fixed width to preserve leading zeros.
 *
 * @packageDocumentation
 */

/** Relative tolerance for treating floating-point diffs as equal. */
export const FLOAT_EPSILON = 1e-9;

/**
 * Parses a value to a finite number when it is a JS number or a *canonical*
 * numeric string (one that round-trips through `Number` → `String`). Canonical
 * matching deliberately rejects leading-zero forms like `"001"` and thousands
 * separators, leaving those to the text-number detector.
 *
 * @param value - The source value.
 * @returns The finite number, or `null` when not canonically numeric.
 */
export function parseCanonicalNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  // Canonical round-trip: rejects "001", "1.", "+1", "1e3" vs "1000", etc.
  return String(n) === trimmed ? n : null;
}

/**
 * Counts the decimal places in a numeric value's canonical string form, used to
 * round extrapolated values and avoid floating-point drift (`0.1 + 0.2`).
 *
 * @param value - A finite number.
 * @returns The number of fractional digits (`0` for integers).
 */
export function decimalPlaces(value: number): number {
  if (Number.isInteger(value)) return 0;
  const s = String(value);
  const dot = s.indexOf('.');
  if (dot === -1) {
    // Exponential form (e.g. 1e-7): derive from the exponent.
    const exp = s.indexOf('e-');
    return exp === -1 ? 0 : Number(s.slice(exp + 2));
  }
  return s.length - dot - 1;
}

/**
 * Rounds a number to a fixed number of decimal places, returning a clean value
 * free of binary floating-point noise.
 *
 * @param value    - The value to round.
 * @param decimals - Fractional digits to keep (`0`–`15`).
 * @returns The rounded number.
 */
export function roundTo(value: number, decimals: number): number {
  if (decimals <= 0) return Math.round(value);
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Formats a non-negative integer to at least `width` digits, left-padding with
 * zeros. Values that need more digits than `width` are emitted in full (natural
 * widening, e.g. `099 → 100`).
 *
 * @param value - The integer magnitude to format (already sign-stripped).
 * @param width - Minimum digit count.
 * @returns The zero-padded string.
 */
export function padInteger(value: number, width: number): string {
  const digits = String(value);
  return digits.length >= width ? digits : '0'.repeat(width - digits.length) + digits;
}
