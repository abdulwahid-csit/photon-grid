/**
 * Validation contracts for the editing system.
 *
 * Editors collect values; the **grid** owns validation. That split is the whole
 * point of this module: a React editor, an Angular editor, a `<template>` editor
 * and a built-in editor all hand the same value to the same
 * {@link ValidationEngine} and therefore behave identically. An editor that
 * wants a say implements the optional `ICellEditor.validate`, which runs
 * *before* these rules and can only ever add a failure.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';

// ─── Results ──────────────────────────────────────────────────────────────────

/**
 * How severely a failed rule should be treated.
 *
 * `'error'` blocks the commit. `'warning'` annotates the cell but lets the value
 * through — the shape a "this looks unusual, but it's your data" rule needs, and
 * the reason {@link ValidationResult} carries a severity at all rather than a
 * bare boolean.
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * A passing validation.
 *
 * Split from {@link InvalidResult} as a discriminated union on `valid` so
 * `if (result.valid)` narrows `message` away — a caller cannot read an error
 * message off a success by accident.
 */
export interface ValidResult {
  readonly valid: true;
  /** Present only so `{ valid: true }` and `{ valid: true, message: undefined }` are both assignable. */
  readonly message?: undefined;
}

/** A failed validation, carrying the message shown to the user. */
export interface InvalidResult {
  readonly valid: false;
  /**
   * Human-readable, already localised. Rules build this from
   * {@link ValidationContext.label} so the text names the column the user is
   * actually looking at.
   */
  readonly message: string;
  /**
   * Stable machine-readable identifier of the rule that failed (`'required'`,
   * `'min'`, a custom rule's name). Lets an application style, group or
   * translate failures without string-matching the message.
   */
  readonly code?: string;
  /** @default 'error' */
  readonly severity?: ValidationSeverity;
}

/**
 * The outcome of one rule, or of a whole column's rule set.
 *
 * A discriminated union rather than `{ valid: boolean; message?: string }`
 * precisely so the invalid case cannot be constructed without a message.
 */
export type ValidationResult = ValidResult | InvalidResult;

/** Convenience singleton for the overwhelmingly common passing result. */
export const VALID: ValidResult = Object.freeze({ valid: true });

/**
 * Builds an {@link InvalidResult}.
 *
 * @param message - Text shown to the user.
 * @param code - Rule identifier, for programmatic handling.
 * @param severity - Defaults to `'error'`, which blocks the commit.
 */
export function invalid(
  message: string,
  code?: string,
  severity: ValidationSeverity = 'error',
): InvalidResult {
  return { valid: false, message, code, severity };
}

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * Everything a validator may read about the value under test.
 *
 * Deliberately wider than "the value": a rule such as "discount may not exceed
 * this row's list price" is only expressible with the sibling data, and a rule
 * that wants to name the column in its message needs {@link label}. Passing one
 * frozen context object rather than positional arguments is also what keeps the
 * signature stable as the system grows.
 *
 * @typeParam TValue - The value being validated.
 * @typeParam TData - Shape of the row's `data` object.
 */
export interface ValidationContext<TValue = unknown, TData = Record<string, unknown>> {
  /** The value the editor produced, already parsed to the column's type. */
  readonly value: TValue;
  /** The value the cell held before editing started. */
  readonly previousValue: TValue;
  /** The full row being edited. Mutating it here is not supported. */
  readonly data: Readonly<TData>;
  /** The row node, for identity (`nodeId`) and position (`rowIndex`). */
  readonly node: RowNode | null;
  /** The column being edited. */
  readonly colDef: ColumnDef;
  /**
   * Display name used in generated messages — the column header, falling back to
   * its field. Precomputed so every rule words its message the same way.
   */
  readonly label: string;
  /** The grid's public API, for rules that need to look at other rows. */
  readonly api: unknown;
}

// ─── Validators ───────────────────────────────────────────────────────────────

/**
 * One validation rule.
 *
 * Pure, and cheap enough to run per commit. Returning a promise opts the rule
 * into the asynchronous path — see {@link ValidationEngine.validate}, which
 * keeps an all-synchronous rule set fully synchronous so an ordinary edit never
 * waits a microtask.
 *
 * @typeParam TValue - The value being validated.
 * @typeParam TData - Shape of the row's `data` object.
 */
export type ValidatorFn<TValue = unknown, TData = Record<string, unknown>> = (
  context: ValidationContext<TValue, TData>,
) => ValidationResult | Promise<ValidationResult>;

/**
 * Builds a {@link ValidatorFn} from whatever the column declared for the rule —
 * `true` for `required`, a number for `min`, a `RegExp` for `pattern`.
 *
 * This is the registry's unit of extension: registering a factory under a name
 * makes `validation: { myRule: <config> }` work with no core change.
 *
 * @param config - The value the column gave the rule.
 * @returns A validator, or `null` when the config disables the rule (`required:
 *   false`), so the compiled rule list holds no no-ops.
 */
export type ValidatorFactory<TConfig = unknown> = (
  config: TConfig,
) => ValidatorFn | null;

// ─── Column-level declaration ─────────────────────────────────────────────────

/**
 * The declarative validation a column opts into.
 *
 * Every key is independent and order-stable: rules run in the order listed in
 * this interface, so `required` always reports before `min`, and a user filling
 * a blank cell sees "Price is required" rather than "Price must be at least 10".
 *
 * @example
 * ```ts
 * {
 *   field: 'price', type: 'number', editable: true,
 *   validation: {
 *     required: true,
 *     min: 10,
 *     max: 100,
 *     validate: ({ value, data }) =>
 *       Number(value) > Number(data.cost)
 *         ? { valid: true }
 *         : { valid: false, message: 'Price must exceed cost' },
 *   },
 * }
 * ```
 */
export interface ColumnValidation<TValue = unknown, TData = Record<string, unknown>> {
  /** Value must not be `null`, `undefined`, `''`, or an empty array. */
  readonly required?: boolean;
  /** Value must parse as a valid email address. Implied by `type: 'email'`. */
  readonly email?: boolean;
  /** Value must parse as an absolute URL. Implied by `type: 'url'`. */
  readonly url?: boolean;
  /**
   * Value's string form must match. A `RegExp` is used as-is; a string is
   * compiled once when the rule set is built, never per keystroke.
   */
  readonly pattern?: RegExp | string;
  /** Message used when {@link pattern} fails, in place of the generic wording. */
  readonly patternMessage?: string;
  /** Numeric (or date) lower bound, inclusive. */
  readonly min?: number | Date;
  /** Numeric (or date) upper bound, inclusive. */
  readonly max?: number | Date;
  /** Minimum string length. */
  readonly minLength?: number;
  /** Maximum string length. */
  readonly maxLength?: number;
  /** Value must be a whole number. */
  readonly integer?: boolean;
  /**
   * Value must be a number with at most this many decimal places. `true` means
   * "any decimal" and only asserts numeric-ness.
   */
  readonly decimal?: boolean | number;
  /** Value must be `> 0`. */
  readonly positive?: boolean;
  /** Value must be `< 0`. */
  readonly negative?: boolean;
  /** Value must parse as a real date. Implied by the date-like column types. */
  readonly date?: boolean;
  /**
   * Custom synchronous rule. Runs after every declarative rule above, so it can
   * assume the basics already hold.
   */
  readonly validate?: ValidatorFn<TValue, TData>;
  /**
   * Custom asynchronous rule — a uniqueness check against a server, typically.
   * Runs last, and only when everything before it passed, so a blank field
   * never costs a network round trip.
   *
   * Results are race-guarded: if the user edits on, a late response for a
   * superseded session is discarded rather than applied.
   */
  readonly validateAsync?: (
    context: ValidationContext<TValue, TData>,
  ) => Promise<ValidationResult>;
  /**
   * Additional rules resolved through the {@link ValidatorRegistry} by name.
   * This is what lets an application add `validation: { iban: true }` after
   * registering an `iban` factory, with no change to this interface.
   */
  readonly [rule: string]: unknown;
}

/**
 * Validates a whole row at once, for cross-field rules that no single column can
 * express ("end date must be after start date").
 *
 * Runs on row-mode commit, and through `GridApi.validateRow`.
 *
 * @param data - The row's data, with pending edits already applied.
 * @param node - The row node.
 * @returns A result, or a map of `field -> result` to attribute failures to
 *   individual cells.
 */
export type RowValidatorFn<TData = Record<string, unknown>> = (
  data: Readonly<TData>,
  node: RowNode | null,
) => ValidationResult | Readonly<Record<string, ValidationResult>>
  | Promise<ValidationResult | Readonly<Record<string, ValidationResult>>>;

/**
 * A column's validation state as the grid tracks it, for rendering and for
 * `GridApi.getValidationErrors`.
 */
export interface CellValidationState {
  readonly nodeId: string;
  readonly colId: string;
  readonly result: InvalidResult;
}
