/**
 * The declarative validation rules Photon Grid ships with.
 *
 * Every export here is a {@link ValidatorFactory}: it receives whatever the
 * column declared for the rule (`true`, a number, a `RegExp`, …) and returns a
 * {@link ValidatorFn} — or `null` when that configuration disables the rule, so
 * the compiled rule list for a column holds no no-ops to step over on every
 * commit.
 *
 * ### Why factories rather than plain validators
 * All of the per-column work — compiling a pattern, coercing a bound to a
 * comparable primitive, rendering the bound into display text — happens **once**
 * inside the factory, at compile time, and is closed over by the returned
 * function. A 100k-row grid therefore never recompiles a `RegExp` or re-formats
 * a `Date` while the user types. See {@link ValidationEngine.compile}, which
 * memoises the whole compiled set per `ColumnDef`.
 *
 * ### The blank-value contract
 * Every rule except {@link createRequiredRule} returns {@link VALID} for
 * `null`, `undefined` and `''`. `required` owns emptiness, exclusively. Without
 * that split an optional column carrying a `min` could never be left blank —
 * clearing the cell would trip the range rule — and the user would be told
 * "Price must be at least 10" about a field they are allowed to omit.
 *
 * ### Message wording
 * Messages are built from {@link ValidationContext.label} (the column header,
 * falling back to its field) so the text names the column the user is looking
 * at, and the wording deliberately matches the legacy `validateValue` in
 * `engines/editing/value-parser.ts` — a grid migrating to this engine must not
 * see its copy change. Each failure carries the rule name as its `code`, so an
 * application can style, group or translate failures without string-matching.
 *
 * @packageDocumentation
 */

import type {
  ValidationContext,
  ValidationResult,
  ValidatorFactory,
  ValidatorFn,
} from '../../types/validation.types';
import { VALID, invalid } from '../../types/validation.types';

// ─── Shared predicates and coercions ──────────────────────────────────────────

/**
 * `true` when a value carries no content a non-`required` rule could judge.
 *
 * Deliberately narrower than {@link isMissing}: an empty array is a legitimate
 * value for `minLength` or a custom rule to inspect, but is nothing at all as
 * far as `required` is concerned.
 */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * `true` when a value counts as "not filled in" for {@link createRequiredRule}.
 *
 * Includes the empty array because a multi-select or tag column reports "no
 * selection" as `[]`, and a user staring at an empty cell would not accept
 * being told it is filled.
 */
function isMissing(value: unknown): boolean {
  return isEmpty(value) || (Array.isArray(value) && value.length === 0);
}

/**
 * Numeric view of a value, or `NaN` when it has none.
 *
 * `Date` is mapped to its epoch milliseconds so a single comparison path serves
 * both numeric and temporal bounds.
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'boolean') return Number(value);
  return NaN;
}

/**
 * Temporal view of a value in epoch milliseconds, or `NaN`.
 *
 * Used only when the declared bound is itself a `Date`, which is what stops a
 * year-like string (`'2024'`) being read as the number 2024 and compared
 * against a millisecond timestamp.
 */
function toTime(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value);
  return NaN;
}

/** The string form a length rule measures. */
function toText(value: unknown): string {
  return typeof value === 'string' ? value : String(value);
}

/** Renders a bound for display: dates as a locale date, everything else verbatim. */
function formatBound(bound: number | Date): string {
  return bound instanceof Date ? bound.toLocaleDateString() : String(bound);
}

/** `"1 character"` / `"3 characters"` — messages that read like prose, not like output. */
function pluralise(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

/**
 * Number of decimal places in a value's written form.
 *
 * Scientific notation reports `0`: `1e-7` is inside any declared limit, because
 * the limit expresses what a user may type into the cell and nobody types an
 * exponent into a currency column.
 */
function decimalPlacesOf(value: unknown): number {
  const text = typeof value === 'number' ? String(value) : toText(value).trim();
  if (text.indexOf('e') !== -1 || text.indexOf('E') !== -1) return 0;
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** `true` when a flag-shaped config (`required: true`) actually switches the rule on. */
function isEnabled(config: unknown): boolean {
  return config === true;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

/**
 * Value must be filled in.
 *
 * The one rule that judges emptiness, and therefore the one rule that must run
 * first — see the ordering note on {@link ValidationEngine.compile}.
 *
 * @param config - `true` to enable. Anything else disables the rule.
 */
export function createRequiredRule(config: unknown): ValidatorFn | null {
  if (!isEnabled(config)) return null;
  return ({ value, label }: ValidationContext): ValidationResult =>
    isMissing(value) ? invalid(`${label} is required`, 'required') : VALID;
}

// ─── Format ───────────────────────────────────────────────────────────────────

/**
 * Pragmatic email shape, carried over verbatim from the legacy `validateValue`
 * so no column changes verdict on migration.
 *
 * Intentionally not RFC 5322: a fully conformant expression accepts addresses
 * no mail server would deliver to and is a well-known catastrophic-backtracking
 * hazard. Real verification is a round trip, which is what `validateAsync` is
 * for.
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Absolute URL with a scheme and an authority (`https://example.com/x`).
 *
 * A regular expression rather than `new URL()` because the failing case is the
 * one that matters here, and a constructor that signals failure by throwing
 * costs orders of magnitude more than a test that returns `false` — this runs on
 * every commit of every URL cell.
 */
const URL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\/[^\s/?#]+[^\s]*$/i;

/**
 * Value must look like an email address.
 *
 * Implied for free by `type: 'email'` — see `impliedValidationFor`.
 *
 * @param config - `true` to enable.
 */
export function createEmailRule(config: unknown): ValidatorFn | null {
  if (!isEnabled(config)) return null;
  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    return EMAIL_PATTERN.test(toText(value))
      ? VALID
      : invalid(`${label} must be a valid email address`, 'email');
  };
}

/**
 * Value must be an absolute URL.
 *
 * Implied for free by `type: 'url'`.
 *
 * @param config - `true` to enable.
 */
export function createUrlRule(config: unknown): ValidatorFn | null {
  if (!isEnabled(config)) return null;
  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    return URL_PATTERN.test(toText(value))
      ? VALID
      : invalid(`${label} must be a valid URL`, 'url');
  };
}

/**
 * A pattern rule's configuration.
 *
 * The object form exists so `ColumnValidation.patternMessage` can be folded into
 * the rule at compile time instead of wrapping the validator in a
 * message-rewriting closure that would allocate on every failure.
 */
export interface PatternRuleConfig {
  /** The expression to match, as a `RegExp` or an uncompiled source string. */
  readonly pattern: RegExp | string;
  /** Replaces the generic wording. */
  readonly message?: string;
}

/**
 * Strips the stateful flags from a caller-supplied expression.
 *
 * `RegExp.test` on a `/g` or `/y` expression advances `lastIndex`, so the same
 * validator would answer `true`, `false`, `true` for identical input. Rebuilding
 * without those flags is what keeps a compiled rule a pure function — a
 * correctness fix, not a micro-optimisation.
 */
function stableRegExp(source: RegExp): RegExp {
  const flags = source.flags.replace(/[gy]/g, '');
  return flags === source.flags ? source : new RegExp(source.source, flags);
}

/**
 * Value's string form must match an expression.
 *
 * The expression is compiled **once**, here, never per keystroke.
 *
 * @param config - A `RegExp`, a source string, or a {@link PatternRuleConfig}
 *   carrying a custom message.
 */
export function createPatternRule(config: unknown): ValidatorFn | null {
  const spec: PatternRuleConfig | null =
    typeof config === 'string' || config instanceof RegExp
      ? { pattern: config }
      : isPatternConfig(config)
        ? config
        : null;
  if (spec === null) return null;

  const source = spec.pattern;
  if (typeof source === 'string' && source.length === 0) return null;
  const expression = source instanceof RegExp ? stableRegExp(source) : new RegExp(source);
  const message = spec.message;

  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    return expression.test(toText(value))
      ? VALID
      : invalid(message ?? `${label} is not in the expected format`, 'pattern');
  };
}

/** Structural test for the object form of a pattern configuration. */
function isPatternConfig(config: unknown): config is PatternRuleConfig {
  if (typeof config !== 'object' || config === null) return false;
  const pattern = (config as { pattern?: unknown }).pattern;
  return typeof pattern === 'string' || pattern instanceof RegExp;
}

// ─── Range ────────────────────────────────────────────────────────────────────

/**
 * Reads a `min`/`max` configuration, or `null` when there is none.
 *
 * `null` and `undefined` disable the rule; `0` and the epoch do not, which is
 * why this is an explicit narrowing rather than a truthiness test.
 */
function toBound(config: unknown): number | Date | null {
  if (typeof config === 'number' && !Number.isNaN(config)) return config;
  if (config instanceof Date && !Number.isNaN(config.getTime())) return config;
  return null;
}

/**
 * Value must be at least `config`.
 *
 * A value with no numeric (or temporal) reading passes: type-correctness is the
 * business of the `decimal`/`date` rules, which a typed column already implies,
 * and the legacy `validateValue` skipped its range check on `NaN` for exactly
 * this reason. Reporting "must be at least 10" about the text `"abc"` would be
 * the wrong sentence anyway.
 *
 * @param config - Inclusive lower bound, `number` or `Date`.
 */
export function createMinRule(config: unknown): ValidatorFn | null {
  const bound = toBound(config);
  if (bound === null) return null;

  const coerce = bound instanceof Date ? toTime : toNumber;
  const threshold = bound instanceof Date ? bound.getTime() : bound;
  const boundText = formatBound(bound);

  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    const actual = coerce(value);
    if (Number.isNaN(actual) || actual >= threshold) return VALID;
    return invalid(`${label} must be at least ${boundText}`, 'min');
  };
}

/**
 * Value must be at most `config`.
 *
 * Mirrors {@link createMinRule}, including its deference to the type rules on
 * un-coercible values.
 *
 * @param config - Inclusive upper bound, `number` or `Date`.
 */
export function createMaxRule(config: unknown): ValidatorFn | null {
  const bound = toBound(config);
  if (bound === null) return null;

  const coerce = bound instanceof Date ? toTime : toNumber;
  const threshold = bound instanceof Date ? bound.getTime() : bound;
  const boundText = formatBound(bound);

  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    const actual = coerce(value);
    if (Number.isNaN(actual) || actual <= threshold) return VALID;
    return invalid(`${label} must be at most ${boundText}`, 'max');
  };
}

/** Reads a non-negative integer configuration (`minLength`, `maxLength`), or `null`. */
function toLength(config: unknown): number | null {
  if (typeof config !== 'number' || !Number.isFinite(config) || config < 0) return null;
  return Math.floor(config);
}

/**
 * Value's string form must be at least `config` characters.
 *
 * @param config - Minimum length. A blank value is exempt — that is `required`'s
 *   call to make.
 */
export function createMinLengthRule(config: unknown): ValidatorFn | null {
  const limit = toLength(config);
  if (limit === null || limit === 0) return null;
  const limitText = pluralise(limit, 'character');

  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    return toText(value).length >= limit
      ? VALID
      : invalid(`${label} must be at least ${limitText}`, 'minLength');
  };
}

/**
 * Value's string form must be at most `config` characters.
 *
 * @param config - Maximum length.
 */
export function createMaxLengthRule(config: unknown): ValidatorFn | null {
  const limit = toLength(config);
  if (limit === null) return null;
  const limitText = pluralise(limit, 'character');

  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    return toText(value).length <= limit
      ? VALID
      : invalid(`${label} must be at most ${limitText}`, 'maxLength');
  };
}

// ─── Numeric shape ────────────────────────────────────────────────────────────

/**
 * Value must be a whole number.
 *
 * Non-numeric input fails as `"must be a number"` rather than
 * `"must be a whole number"`: the first sentence is the one that describes what
 * the user actually did wrong.
 *
 * @param config - `true` to enable.
 */
export function createIntegerRule(config: unknown): ValidatorFn | null {
  if (!isEnabled(config)) return null;
  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    const numeric = toNumber(value);
    if (Number.isNaN(numeric)) return invalid(`${label} must be a number`, 'integer');
    return Number.isInteger(numeric)
      ? VALID
      : invalid(`${label} must be a whole number`, 'integer');
  };
}

/**
 * Value must be a number, optionally with a bounded number of decimal places.
 *
 * This is the rule the numeric column types imply, which is why it — and not
 * `min`/`max` — is what reports `"must be a number"` for a `type: 'number'`
 * column, matching the legacy `validateValue` wording exactly.
 *
 * @param config - `true` to assert numeric-ness only, or a number giving the
 *   maximum decimal places.
 */
export function createDecimalRule(config: unknown): ValidatorFn | null {
  const places =
    typeof config === 'number' && Number.isFinite(config) && config >= 0
      ? Math.floor(config)
      : null;
  if (places === null && !isEnabled(config)) return null;
  const placesText = places === null ? '' : pluralise(places, 'decimal place');

  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    if (Number.isNaN(toNumber(value))) return invalid(`${label} must be a number`, 'decimal');
    if (places === null || decimalPlacesOf(value) <= places) return VALID;
    return invalid(`${label} must have at most ${placesText}`, 'decimal');
  };
}

/**
 * Value must be greater than zero.
 *
 * @param config - `true` to enable.
 */
export function createPositiveRule(config: unknown): ValidatorFn | null {
  if (!isEnabled(config)) return null;
  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    const numeric = toNumber(value);
    if (Number.isNaN(numeric)) return invalid(`${label} must be a number`, 'positive');
    return numeric > 0 ? VALID : invalid(`${label} must be greater than zero`, 'positive');
  };
}

/**
 * Value must be less than zero.
 *
 * @param config - `true` to enable.
 */
export function createNegativeRule(config: unknown): ValidatorFn | null {
  if (!isEnabled(config)) return null;
  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    const numeric = toNumber(value);
    if (Number.isNaN(numeric)) return invalid(`${label} must be a number`, 'negative');
    return numeric < 0 ? VALID : invalid(`${label} must be less than zero`, 'negative');
  };
}

// ─── Temporal ─────────────────────────────────────────────────────────────────

/**
 * Value must resolve to a real date.
 *
 * Implied by the date-like column types. Accepts a `Date`, an epoch number, or
 * anything `Date.parse` understands — which is what the grid's own
 * `parseValue` produces for those types (an ISO string).
 *
 * @param config - `true` to enable.
 */
export function createDateRule(config: unknown): ValidatorFn | null {
  if (!isEnabled(config)) return null;
  return ({ value, label }: ValidationContext): ValidationResult => {
    if (isEmpty(value)) return VALID;
    return Number.isNaN(toTime(value))
      ? invalid(`${label} must be a valid date`, 'date')
      : VALID;
  };
}

// ─── Default set ──────────────────────────────────────────────────────────────

/**
 * Every rule Photon Grid ships with, keyed by the name a column declares it
 * under (`validation: { min: 10 }` resolves `'min'` here).
 *
 * A function rather than a module-scope constant, following the house registry
 * style: a consumer assembling a slim {@link ValidatorRegistry} of their own
 * never references the built-ins, and each call hands back a fresh record so one
 * registry's `clear()` cannot strip another's defaults.
 *
 * The order of the keys is documentation only — {@link ValidationEngine.compile}
 * owns the order rules actually execute in, because "required before min" is a
 * guarantee about the message the user reads and must not depend on object key
 * ordering.
 */
export function createDefaultValidatorFactories(): Record<string, ValidatorFactory> {
  return {
    required: createRequiredRule,
    email: createEmailRule,
    url: createUrlRule,
    pattern: createPatternRule,
    min: createMinRule,
    max: createMaxRule,
    minLength: createMinLengthRule,
    maxLength: createMaxLengthRule,
    integer: createIntegerRule,
    decimal: createDecimalRule,
    positive: createPositiveRule,
    negative: createNegativeRule,
    date: createDateRule,
  };
}
