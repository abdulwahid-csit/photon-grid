/**
 * Locale-aware month and weekday name tables, backed by `Intl.DateTimeFormat`
 * and memoized per locale.
 *
 * Building an `Intl.DateTimeFormat` is comparatively expensive, so each locale's
 * long/short name arrays are computed once and cached. Detectors call
 * {@link getMonthNames} / {@link getWeekdayNames} freely without per-cell cost.
 *
 * @packageDocumentation
 */

/** Number of months in the Gregorian calendar. */
export const MONTHS_IN_YEAR = 12;
/** Number of days in a week. */
export const DAYS_IN_WEEK = 7;

/** A locale's long and short name variants for a cyclic name set. */
export interface NameTable {
  /** Full names in canonical (locale-default) casing, index-aligned. */
  readonly long: readonly string[];
  /** Abbreviated names in canonical casing, index-aligned. */
  readonly short: readonly string[];
  /** Case-insensitive lookup: normalized name → index (covers long + short). */
  readonly index: ReadonlyMap<string, number>;
}

const monthCache = new Map<string, NameTable>();
const weekdayCache = new Map<string, NameTable>();

/** A fixed non-DST reference year/month/day the formatter samples from. */
const REFERENCE_YEAR = 2021;

/**
 * Normalizes a name for case- and diacritic-insensitive matching, and strips a
 * trailing period some locales append to abbreviations (e.g. German `Jan.`).
 */
function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\.$/, '')
    .trim()
    .toLowerCase();
}

/** Builds a {@link NameTable} from long/short arrays, indexing both. */
function buildTable(long: string[], short: string[]): NameTable {
  const index = new Map<string, number>();
  for (let i = 0; i < long.length; i++) {
    // Long names take precedence on collision; short names fill remaining keys.
    index.set(normalizeName(long[i]), i);
  }
  for (let i = 0; i < short.length; i++) {
    const key = normalizeName(short[i]);
    if (!index.has(key)) index.set(key, i);
  }
  return { long, short, index };
}

/**
 * Returns the memoized month name table for a locale.
 *
 * @param locale - BCP-47 locale tag.
 * @returns The locale's month {@link NameTable} (indices `0`–`11`).
 */
export function getMonthNames(locale: string): NameTable {
  const cached = monthCache.get(locale);
  if (cached) return cached;

  const long = new Array<string>(MONTHS_IN_YEAR);
  const short = new Array<string>(MONTHS_IN_YEAR);
  const longFmt = new Intl.DateTimeFormat(locale, { month: 'long' });
  const shortFmt = new Intl.DateTimeFormat(locale, { month: 'short' });
  for (let m = 0; m < MONTHS_IN_YEAR; m++) {
    const d = new Date(REFERENCE_YEAR, m, 15);
    long[m] = longFmt.format(d);
    short[m] = shortFmt.format(d);
  }
  const table = buildTable(long, short);
  monthCache.set(locale, table);
  return table;
}

/**
 * Returns the memoized weekday name table for a locale, indexed `0` = Sunday …
 * `6` = Saturday (matching `Date.prototype.getDay`).
 *
 * @param locale - BCP-47 locale tag.
 * @returns The locale's weekday {@link NameTable}.
 */
export function getWeekdayNames(locale: string): NameTable {
  const cached = weekdayCache.get(locale);
  if (cached) return cached;

  const long = new Array<string>(DAYS_IN_WEEK);
  const short = new Array<string>(DAYS_IN_WEEK);
  const longFmt = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const shortFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2021-08-01 is a Sunday; step one day at a time to cover the week.
  for (let d = 0; d < DAYS_IN_WEEK; d++) {
    const date = new Date(REFERENCE_YEAR, 7, 1 + d);
    long[d] = longFmt.format(date);
    short[d] = shortFmt.format(date);
  }
  const table = buildTable(long, short);
  weekdayCache.set(locale, table);
  return table;
}

/** Clears the locale name caches. Exposed for tests and hot config reloads. */
export function clearNameCaches(): void {
  monthCache.clear();
  weekdayCache.clear();
}
