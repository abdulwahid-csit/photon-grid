/**
 * Compiles a column's validation declaration into an ordered list of rules, and
 * runs it.
 *
 * Editors collect values; this engine decides whether a value may be committed.
 * Keeping that decision here — rather than in each editor — is what makes a
 * React editor, an Angular editor and a built-in editor behave identically on
 * the same column.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type {
  ColumnValidation,
  RowValidatorFn,
  ValidationContext,
  ValidationResult,
  ValidatorFactory,
  ValidatorFn,
} from '../types/validation.types';
import { VALID, invalid } from '../types/validation.types';
import { impliedValidationFor } from './type-rules';
import { ValidatorRegistry } from './validator-registry';

// ─── Compiled shape ───────────────────────────────────────────────────────────

/**
 * A column's rules, split by how they must be executed.
 *
 * The split is the whole reason an ordinary edit stays synchronous: with the
 * asynchronous rules held separately, {@link ValidationEngine.validate} can see
 * that `async` is empty and return a result directly instead of a promise. A
 * single flat list would force every caller to `await`, which means every cell
 * commit would cost at least a microtask and the grid could no longer close an
 * editor in the same frame the user pressed Enter.
 */
export interface CompiledValidation {
  /** Rules that normally answer immediately, in guaranteed execution order. */
  readonly sync: readonly ValidatorFn[];
  /** Rules that always answer with a promise, run only after `sync` all passed. */
  readonly async: readonly ValidatorFn[];
}

/**
 * The order declarative rules execute in, and therefore the order failures are
 * reported in.
 *
 * This list is a **user-facing guarantee**, not an implementation detail.
 * `required` precedes `min` so a user who clears a mandatory price cell reads
 * "Price is required" rather than "Price must be at least 10" — the second
 * sentence is true but useless, because it describes a value they did not
 * enter. Format rules precede range rules for the same reason: "must be a valid
 * date" beats "must be at least 01/01/2024" when the input is `"tomorrow"`.
 *
 * Rules a column has not declared are simply skipped, so this array is walked
 * once per compile, never per commit.
 */
const RULE_ORDER: readonly string[] = [
  'required',
  'email',
  'url',
  'pattern',
  'min',
  'max',
  'minLength',
  'maxLength',
  'integer',
  'decimal',
  'positive',
  'negative',
  'date',
];

/**
 * Keys of `ColumnValidation` that are not rules resolved through the registry.
 *
 * `patternMessage` configures another rule; `validate` and `validateAsync` are
 * validator functions the engine appends itself, in their documented positions.
 * Without this set the generic pass over unrecognised keys would try to look
 * them up, and an application that registered a rule called `validate` would get
 * surprising double execution.
 */
const NON_RULE_KEYS: ReadonlySet<string> = new Set([
  'patternMessage',
  'validate',
  'validateAsync',
]);

/** Shared empty rule list — a column with no async rules must not allocate one. */
const NO_RULES: readonly ValidatorFn[] = Object.freeze([]);

/** What every column with nothing to validate compiles to. */
const NO_VALIDATION: CompiledValidation = Object.freeze({ sync: NO_RULES, async: NO_RULES });

/**
 * `ColumnDef` as this engine reads it.
 *
 * `ColumnDef` does not (yet) declare `validation`, so it is read through this
 * structural view rather than a cast to `any` — the property is typed, and the
 * day the field lands on `ColumnDef` proper this alias becomes redundant without
 * a single call site changing.
 */
interface ValidatableColumnDef extends ColumnDef {
  readonly validation?: ColumnValidation;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Compiles and runs column validation.
 *
 * ### Compilation is memoised per column
 * Every rule a column declares is turned into a closure exactly once, keyed on
 * the `ColumnDef` **object** in a `WeakMap`. Editing 100,000 rows of a column
 * compiles its rules once, not 100,000 times, and the cache is released with the
 * column definition itself — no disposal call, no leak. Anything that mutates a
 * column's validation in place must call {@link invalidate}.
 *
 * ### Synchronous stays synchronous
 * {@link validate} returns a `ValidationResult` directly whenever every rule
 * answered directly. See {@link CompiledValidation} for why that matters.
 *
 * @example
 * ```ts
 * const engine = new ValidationEngine();
 * engine.registerValidator('iban', (config) =>
 *   config === true ? ({ value, label }) =>
 *     isIban(value) ? { valid: true } : { valid: false, message: `${label} is not an IBAN` }
 *   : null,
 * );
 * const result = engine.validate(context);
 * ```
 */
export class ValidationEngine {
  private readonly registry: ValidatorRegistry;

  /**
   * Compiled rule sets, keyed on the column definition object.
   *
   * A `WeakMap` and not a `Map`: columns are created and discarded with the grid
   * (and with every `setColumnDefs`), and a strong cache would pin every column
   * definition — and every closure over it — for the lifetime of the engine.
   */
  private cache = new WeakMap<ColumnDef, CompiledValidation>();

  /**
   * @param registry - Rule factories to compile through. Defaults to a fresh
   *   registry holding every built-in rule.
   */
  constructor(registry: ValidatorRegistry = new ValidatorRegistry()) {
    this.registry = registry;
  }

  /**
   * The registry this engine compiles through, for inspection or for sharing
   * with a second engine.
   *
   * Mutating it directly bypasses cache invalidation; prefer
   * {@link registerValidator}.
   */
  getRegistry(): ValidatorRegistry {
    return this.registry;
  }

  /**
   * Adds a rule and drops every compiled rule set.
   *
   * The invalidation is the point. Columns that already declared `iban` compiled
   * to "no such rule, ignore it"; without clearing the cache, registering the
   * rule afterwards would silently do nothing for exactly the columns that
   * wanted it most.
   *
   * @param name - Key columns declare the rule under in `validation`.
   * @param factory - Builds the rule from the column's configuration.
   */
  registerValidator(name: string, factory: ValidatorFactory): void {
    this.registry.register(name, factory);
    this.invalidate();
  }

  /**
   * The rules `colDef` validates with, compiled once and cached.
   *
   * ### Sources, weakest first
   * 1. **Type-implied** — `type: 'email'` contributes `email: true`. See
   *    `impliedValidationFor`.
   * 2. **Legacy column fields** — `required`, `min`, `max`, `validatorFn`.
   * 3. **`colDef.validation`** — the declarative form, which wins every key.
   *
   * Later sources overwrite earlier ones key by key, so an author can always
   * override what their column type implied, and the modern `validation` block
   * always beats the legacy field it replaces.
   *
   * @param colDef - The column to compile.
   * @returns The cached compiled rule set. The same object is returned for the
   *   same column until {@link invalidate} is called, so callers may compare it
   *   by identity.
   */
  compile(colDef: ColumnDef): CompiledValidation {
    const cached = this.cache.get(colDef);
    if (cached) return cached;

    const compiled = this.build(colDef);
    this.cache.set(colDef, compiled);
    return compiled;
  }

  /**
   * Drops cached rule sets so the next {@link compile} rebuilds them.
   *
   * Call after mutating a column's `validation` in place, or after changing the
   * registry behind the engine's back.
   *
   * @param colDef - The single column to forget. Omit to forget all of them.
   */
  invalidate(colDef?: ColumnDef): void {
    if (colDef) {
      this.cache.delete(colDef);
      return;
    }
    // `WeakMap` has no `clear()`; replacing it drops every entry at once and
    // lets the old map (and the closures it held) be collected.
    this.cache = new WeakMap<ColumnDef, CompiledValidation>();
  }

  /**
   * Validates one value against its column's rules.
   *
   * Stops at the **first** failure: the user is shown the most specific thing
   * wrong with their input, and the remaining rules — which may include a
   * network round trip — are never run.
   *
   * ### The synchronous fast path
   * When every rule answers directly (the case for all declarative rules), this
   * returns a `ValidationResult`, not a promise. An ordinary keystroke-to-commit
   * must not wait a microtask: the grid closes the editor, writes the cell and
   * moves focus in the same task, and forcing that through `await` would put a
   * visible frame between Enter and the committed cell.
   *
   * A synchronous rule is nevertheless *allowed* to return a promise — the type
   * permits it, and a custom rule may hit a cache that is sometimes warm. The
   * moment one does, execution continues on the asynchronous path from that
   * rule onward, preserving order.
   *
   * @param context - The value under test and everything about its cell.
   * @returns The first failure, or {@link VALID}. Synchronously where possible.
   */
  validate(context: ValidationContext): ValidationResult | Promise<ValidationResult> {
    const compiled = this.compile(context.colDef);
    const sync = compiled.sync;

    for (let index = 0; index < sync.length; index++) {
      const result = sync[index](context);
      if (isThenable(result)) return this.resume(context, compiled, index + 1, result);
      if (!result.valid) return result;
    }

    if (compiled.async.length === 0) return VALID;
    return this.runAll(context, compiled.async);
  }

  /**
   * Runs a whole-row rule, for cross-field constraints no single column can
   * express ("end date must be after start date").
   *
   * Thin by design: row rules are author-supplied and the engine has nothing to
   * add to them. It exists as a seam so every caller — row-mode commit and
   * `GridApi.validateRow` alike — goes through one place, which is where
   * instrumentation or race-guarding will land when it is needed. A missing or
   * malformed validator answers {@link VALID} rather than throwing, because a
   * misconfigured row rule must not make a grid uneditable.
   *
   * @param data - The row's data with pending edits already applied.
   * @param node - The row node, for identity and position.
   * @param validator - The rule to run.
   * @returns One result, or a `field -> result` map attributing failures to
   *   individual cells. Synchronous when the validator is.
   */
  validateRow(
    data: Readonly<Record<string, unknown>>,
    node: RowNode | null,
    validator: RowValidatorFn,
  ):
    | ValidationResult
    | Readonly<Record<string, ValidationResult>>
    | Promise<ValidationResult | Readonly<Record<string, ValidationResult>>> {
    if (typeof validator !== 'function') return VALID;
    return validator(data, node);
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  /**
   * Builds a column's rule list. Called once per column; see {@link compile}.
   *
   * Rules are appended in four phases — the declarative core in
   * {@link RULE_ORDER}, then any registered rules the column declared that the
   * core does not name, then `validate`, then `validateAsync` — which is what
   * makes the reported failure predictable for a given column.
   */
  private build(colDef: ColumnDef): CompiledValidation {
    const declared = mergeDeclarations(colDef);
    const keys = Object.keys(declared);
    if (keys.length === 0) return NO_VALIDATION;

    const sync: ValidatorFn[] = [];

    for (const name of RULE_ORDER) {
      if (!(name in declared)) continue;
      const rule = this.instantiate(name, configFor(name, declared));
      if (rule) sync.push(rule);
    }

    // Extension rules: anything the column declared that the core does not name.
    // Resolved through the registry, and silently ignored when nothing is
    // registered — the key may belong to a plugin that has not loaded, or to a
    // foreign tool reading the same column definitions. Neither justifies
    // failing a user's edit.
    for (const name of keys) {
      if (NON_RULE_KEYS.has(name) || RULE_ORDER.indexOf(name) !== -1) continue;
      const rule = this.instantiate(name, declared[name]);
      if (rule) sync.push(rule);
    }

    const custom = declared['validate'];
    if (typeof custom === 'function') sync.push(custom as ValidatorFn);

    const asyncRule = declared['validateAsync'];
    const async: readonly ValidatorFn[] =
      typeof asyncRule === 'function' ? [asyncRule as ValidatorFn] : NO_RULES;

    if (sync.length === 0 && async.length === 0) return NO_VALIDATION;
    return Object.freeze({ sync: Object.freeze(sync), async });
  }

  /** Resolves one rule name through the registry, or `null` when unknown/disabled. */
  private instantiate(name: string, config: unknown): ValidatorFn | null {
    const factory = this.registry.get(name);
    if (!factory) return null;
    return factory(config);
  }

  /**
   * Finishes a validation that turned asynchronous partway through the
   * synchronous list.
   *
   * Order is preserved exactly as if every rule had been awaited from the start,
   * so a column's reported failure never depends on whether a custom rule
   * happened to hit a warm cache.
   */
  private async resume(
    context: ValidationContext,
    compiled: CompiledValidation,
    from: number,
    pending: Promise<ValidationResult>,
  ): Promise<ValidationResult> {
    const first = await pending;
    if (!first.valid) return first;

    for (let index = from; index < compiled.sync.length; index++) {
      const result = await compiled.sync[index](context);
      if (!result.valid) return result;
    }
    if (compiled.async.length === 0) return VALID;
    return this.runAll(context, compiled.async);
  }

  /** Runs rules in sequence — never in parallel — stopping at the first failure. */
  private async runAll(
    context: ValidationContext,
    rules: readonly ValidatorFn[],
  ): Promise<ValidationResult> {
    for (const rule of rules) {
      const result = await rule(context);
      if (!result.valid) return result;
    }
    return VALID;
  }
}

// ─── Declaration merging ──────────────────────────────────────────────────────

/**
 * Collapses everything a column says about validation into one flat record.
 *
 * Merge order — later wins per key — is: type-implied, legacy fields,
 * `colDef.validation`.
 */
function mergeDeclarations(colDef: ColumnDef): Record<string, unknown> {
  const validation = (colDef as ValidatableColumnDef).validation;
  return {
    ...impliedValidationFor(colDef),
    ...legacyValidation(colDef),
    ...(validation as Record<string, unknown> | undefined),
  };
}

/**
 * The backward-compatibility layer.
 *
 * Before `ColumnValidation` existed, a column expressed validation through four
 * flat fields, interpreted by `validateValue` in
 * `engines/editing/value-parser.ts`:
 *
 * | Legacy field  | Compiles to                                     |
 * |---------------|-------------------------------------------------|
 * | `required`    | `required: true` (only when strictly `true`)    |
 * | `min`         | `min` (only when not `null`/`undefined`)        |
 * | `max`         | `max` (only when not `null`/`undefined`)        |
 * | `validatorFn` | a `validate` rule wrapping the legacy signature |
 *
 * Every one of those columns keeps working, unchanged, through the new engine —
 * which is the entire point: this system replaces `validateValue`, and a
 * replacement that broke existing grids would not be one. Because these sit
 * *under* `colDef.validation` in the merge, a column migrating one field at a
 * time never has the old value fight the new one.
 *
 * Returns a fresh object only when there is something to say; the common case is
 * a column with none of these fields, and it costs one empty literal.
 */
function legacyValidation(colDef: ColumnDef): Record<string, unknown> {
  const legacy: Record<string, unknown> = {};

  if (colDef.required === true) legacy['required'] = true;
  if (colDef.min !== undefined && colDef.min !== null) legacy['min'] = colDef.min;
  if (colDef.max !== undefined && colDef.max !== null) legacy['max'] = colDef.max;
  if (typeof colDef.validatorFn === 'function') {
    legacy['validate'] = adaptLegacyValidator(colDef.validatorFn);
  }

  return legacy;
}

/**
 * Wraps the legacy `(value) => string | null` signature as a {@link ValidatorFn}.
 *
 * A non-`null` string was the legacy way of saying "invalid, and here is the
 * message"; it becomes an `InvalidResult` coded `'validate'` so downstream code
 * cannot tell a migrated rule from a natively-written one.
 */
function adaptLegacyValidator(validatorFn: (value: unknown) => string | null): ValidatorFn {
  return ({ value }: ValidationContext): ValidationResult => {
    const message = validatorFn(value);
    return message === null || message === undefined || message === ''
      ? VALID
      : invalid(message, 'validate');
  };
}

/**
 * The configuration one core rule is compiled with.
 *
 * Exists solely for `pattern`, whose message may be overridden by the sibling
 * `patternMessage` key. Folding the two into the factory's input beats wrapping
 * the compiled rule in a message-rewriting closure, which would add a call frame
 * to every pattern check and allocate on every failure.
 */
function configFor(name: string, declared: Readonly<Record<string, unknown>>): unknown {
  if (name !== 'pattern') return declared[name];
  const message = declared['patternMessage'];
  if (typeof message !== 'string') return declared['pattern'];
  return { pattern: declared['pattern'], message };
}

/**
 * `true` when a rule answered with something promise-like.
 *
 * Duck-typed on `then` rather than `instanceof Promise` so a rule returning a
 * thenable from another realm — or a user-land promise library — still takes the
 * asynchronous path instead of being read as a malformed result.
 */
function isThenable(
  result: ValidationResult | Promise<ValidationResult>,
): result is Promise<ValidationResult> {
  return typeof (result as { then?: unknown }).then === 'function';
}
