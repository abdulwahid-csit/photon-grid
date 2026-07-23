/**
 * Configuration resolution for the formula engine.
 *
 * Turns the sparse, all-optional public {@link FormulaConfig} into a dense
 * {@link ResolvedFormulaConfig} with every field populated, so the rest of the
 * engine never has to reason about `undefined`. Centralizing defaults here (one
 * place, one source of truth) keeps behavior consistent and configurable at
 * runtime via {@link ConfigurationManager.update}.
 *
 * @packageDocumentation
 */

import type { FormulaConfig } from '../../types/formula.types';
import type { FormulaFunction } from '../functions/formula-function';

/**
 * Fully-populated configuration — the internal, `undefined`-free counterpart of
 * {@link FormulaConfig}. Read-only; produce a new one via
 * {@link ConfigurationManager.update}.
 */
export interface ResolvedFormulaConfig {
  readonly enabled: boolean;
  readonly allowCircularReference: boolean;
  readonly autoRecalculate: boolean;
  readonly enableCaching: boolean;
  /** `0` means unbounded. */
  readonly maxDependencyDepth: number;
  /** Upper-cased set of volatile function names (built-ins + user additions). */
  readonly volatileFunctions: ReadonlySet<string>;
  readonly locale: string;
  readonly decimalSeparator: string;
  readonly argumentSeparator: string;
  readonly caseSensitiveFunctions: boolean;
  readonly customFunctions: readonly FormulaFunction[];
  readonly namedRanges: Readonly<Record<string, string>>;
}

/** Function names that are always volatile regardless of configuration. */
export const BUILTIN_VOLATILE_FUNCTIONS: readonly string[] = [
  'RAND',
  'RANDBETWEEN',
  'NOW',
  'TODAY',
];

/**
 * The immutable default configuration, used as the base for every merge. Kept
 * as a factory-free frozen object; {@link ConfigurationManager} clones fields it
 * needs to widen (e.g. the volatile set).
 */
export const DEFAULT_FORMULA_CONFIG: ResolvedFormulaConfig = Object.freeze({
  enabled: false,
  allowCircularReference: false,
  autoRecalculate: true,
  enableCaching: true,
  maxDependencyDepth: 0,
  volatileFunctions: new Set(BUILTIN_VOLATILE_FUNCTIONS),
  locale: 'en-US',
  decimalSeparator: '.',
  argumentSeparator: ',',
  caseSensitiveFunctions: false,
  customFunctions: [],
  namedRanges: {},
});

/**
 * Owns the engine's resolved configuration and applies partial updates against
 * the defaults. A single instance is held by the {@link FormulaEngine}.
 */
export class ConfigurationManager {
  private config: ResolvedFormulaConfig = DEFAULT_FORMULA_CONFIG;

  /**
   * @param initial - Optional initial public config; merged over defaults.
   */
  constructor(initial?: FormulaConfig) {
    if (initial) this.update(initial);
  }

  /** @returns The current fully-resolved configuration. */
  get(): ResolvedFormulaConfig {
    return this.config;
  }

  /**
   * Merges `patch` over the current configuration and returns the new resolved
   * config. Volatile-function names are unioned with the built-in set and
   * upper-cased; all other fields overwrite when present.
   *
   * @param patch - Partial public config to apply.
   * @returns The updated resolved configuration.
   */
  update(patch: FormulaConfig): ResolvedFormulaConfig {
    const prev = this.config;

    const volatile = new Set<string>(BUILTIN_VOLATILE_FUNCTIONS);
    // Preserve any previously-added volatile names, then layer the patch's.
    for (const name of prev.volatileFunctions) volatile.add(name);
    if (patch.volatileFunctions) {
      for (const name of patch.volatileFunctions) volatile.add(name.toUpperCase());
    }

    this.config = {
      enabled: patch.enabled ?? prev.enabled,
      allowCircularReference: patch.allowCircularReference ?? prev.allowCircularReference,
      autoRecalculate: patch.autoRecalculate ?? prev.autoRecalculate,
      enableCaching: patch.enableCaching ?? prev.enableCaching,
      maxDependencyDepth: patch.maxDependencyDepth ?? prev.maxDependencyDepth,
      volatileFunctions: volatile,
      locale: patch.locale ?? prev.locale,
      decimalSeparator: patch.decimalSeparator ?? prev.decimalSeparator,
      argumentSeparator: patch.argumentSeparator ?? prev.argumentSeparator,
      caseSensitiveFunctions: patch.caseSensitiveFunctions ?? prev.caseSensitiveFunctions,
      customFunctions: patch.customFunctions ?? prev.customFunctions,
      namedRanges: patch.namedRanges ? { ...prev.namedRanges, ...patch.namedRanges } : prev.namedRanges,
    };
    return this.config;
  }
}
