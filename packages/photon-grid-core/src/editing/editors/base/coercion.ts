/**
 * The value coercions the built-in editors share.
 *
 * Editors sit at the boundary between the application's data — which holds
 * whatever the API it came from happened to send: a `Date`, an ISO string, an
 * epoch number, `"true"`, `"1"` — and the DOM, which speaks only strings and a
 * handful of rigid input formats. Every editor needs the same handful of
 * translations across that boundary, so they live here once rather than being
 * re-derived (and subtly diverging) in six files.
 *
 * ### Why the date helpers are UTC
 * `<input type="date">` and `<input type="datetime-local">` carry no time zone.
 * Reading one back through the local calendar (`new Date(2024, 2, 15)`) and then
 * serialising with `toISOString()` shifts the day for every user west of
 * Greenwich, so a cell showing `15 Mar` commits as `14 Mar` in New York. Both
 * directions therefore pin to UTC: what the user sees in the field is exactly
 * the calendar date that round-trips back out of {@link fromDateInputValue}.
 *
 * @packageDocumentation
 */

/** Matches a bare calendar date, which must be read as UTC rather than local. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Matches the `HH:mm` / `HH:mm:ss` text `<input type="time">` exchanges. */
const CLOCK_TIME = /^(\d{2}:\d{2})(:\d{2})?/;

/** Matches `#rgb` / `#rrggbb`, with or without the leading hash. */
const HEX_COLOUR = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** The value `<input type="color">` shows when a cell holds no colour. */
export const DEFAULT_COLOUR = '#000000';

/**
 * Interprets any of the shapes a "boolean" column actually stores.
 *
 * A checkbox column is routinely fed `1`, `"true"`, `"Y"` or `"yes"` by a
 * back end that has no boolean type, and an editor that used a bare `!!value`
 * would render `"false"` as checked — the string is truthy. Recognising the
 * textual negatives explicitly is the only way that column behaves.
 */
export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === '' || text === 'false' || text === '0' || text === 'no' || text === 'n') {
      return false;
    }
    return true;
  }
  return value !== null && value !== undefined;
}

/**
 * Parses whatever a date-like column stores into a `Date`, or `null` when the
 * value is absent or unparseable.
 *
 * A bare `yyyy-MM-dd` string is read as UTC midnight — see the module note.
 * Anything the platform cannot parse yields `null` rather than an `Invalid
 * Date`, so no caller has to remember to test `isNaN` on the result.
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'number') {
    const fromEpoch = new Date(value);
    return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    const parsed = new Date(DATE_ONLY.test(text) ? `${text}T00:00:00.000Z` : text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/** Formats a cell value as the `yyyy-MM-dd` text `<input type="date">` requires. */
export function toDateInputValue(value: unknown): string {
  const date = toDate(value);
  return date === null ? '' : date.toISOString().slice(0, 10);
}

/**
 * Formats a cell value as the `yyyy-MM-ddTHH:mm` text
 * `<input type="datetime-local">` requires — an ISO string minus its seconds
 * and zone suffix.
 */
export function toDatetimeInputValue(value: unknown): string {
  const date = toDate(value);
  return date === null ? '' : date.toISOString().slice(0, 16);
}

/**
 * Formats a cell value as the `HH:mm` text `<input type="time">` requires.
 *
 * A time column commonly stores clock text already, which is passed through
 * untouched; a `Date` or timestamp is read for its UTC clock reading, matching
 * the date helpers.
 */
export function toTimeInputValue(value: unknown): string {
  if (typeof value === 'string') {
    const match = CLOCK_TIME.exec(value.trim());
    if (match) return match[0];
  }
  const date = toDate(value);
  return date === null ? '' : date.toISOString().slice(11, 16);
}

/** Converts `yyyy-MM-dd` back to a full ISO string, or `null` for an empty field. */
export function fromDateInputValue(text: string): string | null {
  if (text === '') return null;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Converts `yyyy-MM-ddTHH:mm` back to a full ISO string, or `null` when empty. */
export function fromDatetimeInputValue(text: string): string | null {
  if (text === '') return null;
  const withSeconds = text.length === 16 ? `${text}:00` : text;
  const parsed = new Date(`${withSeconds}.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Constrains `value` to `[min, max]`, ignoring a bound that was not supplied. */
export function clamp(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

/**
 * Rounds to `precision` decimal places.
 *
 * Goes through `toFixed` rather than `Math.round(v * 10 ** p) / 10 ** p` because
 * the latter reintroduces the binary-float error it is meant to remove
 * (`1.005` at two places). The extra `Number()` strips the trailing zeros
 * `toFixed` adds, which would otherwise turn a number into a string.
 */
export function roundTo(value: number, precision?: number): number {
  if (precision === undefined || !Number.isFinite(value)) return value;
  return Number(value.toFixed(Math.max(0, Math.trunc(precision))));
}

/**
 * Normalises colour text to the `#rrggbb` form `<input type="color">` accepts,
 * or `null` when the text is not a hex colour.
 *
 * The shorthand `#abc` is expanded rather than rejected: users type it, and the
 * native colour input silently ignores anything it does not recognise, which
 * would leave the swatch and the text field disagreeing.
 */
export function normalizeHex(text: string): string | null {
  const match = HEX_COLOUR.exec(text.trim());
  if (!match) return null;

  const digits = match[1].toLowerCase();
  const expanded =
    digits.length === 3
      ? `${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
      : digits;
  return `#${expanded}`;
}
