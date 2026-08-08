/**
 * Photon Grid's validation subsystem.
 *
 * The grid — not the editor — decides whether a value may be committed, so that
 * a built-in editor, a React editor and an Angular editor all reach the same
 * verdict on the same column. This barrel is the whole public surface of that
 * decision:
 *
 * - {@link ValidationEngine} — compiles a column's declaration into an ordered
 *   rule list and runs it, staying synchronous whenever the rules are.
 * - {@link ValidatorRegistry} — the open name → factory lookup that lets an
 *   application add rules the core has never heard of.
 * - {@link createDefaultValidatorFactories} and the individual rule builders —
 *   the thirteen declarative rules Photon Grid ships.
 * - {@link impliedValidationFor} — what a column's `type` validates for free.
 *
 * The contracts themselves (`ValidationResult`, `ValidatorFn`,
 * `ColumnValidation`, …) live in `../types/validation.types` and are re-exported
 * from the editing barrel, not from here, so this module stays "the
 * implementation" and that one stays "the contract".
 *
 * @packageDocumentation
 */

export type { CompiledValidation } from './validation-engine';
export { ValidationEngine } from './validation-engine';

export { ValidatorRegistry } from './validator-registry';

export { TYPE_IMPLIED_VALIDATION, impliedValidationFor } from './type-rules';

export type { PatternRuleConfig } from './rules';
export {
  createDefaultValidatorFactories,
  createRequiredRule,
  createEmailRule,
  createUrlRule,
  createPatternRule,
  createMinRule,
  createMaxRule,
  createMinLengthRule,
  createMaxLengthRule,
  createIntegerRule,
  createDecimalRule,
  createPositiveRule,
  createNegativeRule,
  createDateRule,
} from './rules';
