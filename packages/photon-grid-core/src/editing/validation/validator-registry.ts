/**
 * The name → {@link ValidatorFactory} lookup the validation engine compiles
 * through.
 *
 * @packageDocumentation
 */

import type { ValidatorFactory } from '../types/validation.types';
import { createDefaultValidatorFactories } from './rules';

/**
 * Lookup table of validation rule factories, keyed by the name a column declares
 * the rule under.
 *
 * Built-in rules register themselves through exactly the same call a
 * user-defined one would, so there is no special-casing between the two:
 * `registry.register('iban', (config) => …)` makes
 * `validation: { iban: true }` work on any column, indistinguishable from
 * `min` at every downstream point. That openness is the reason
 * `ColumnValidation` carries an index signature — the interface cannot enumerate
 * rules an application has not written yet.
 *
 * ### Registration is open at any time
 * `register()` is callable before or after the grid has rendered. Because the
 * engine memoises compiled rule sets per column, though, registering a rule an
 * existing column already declares takes effect only after
 * {@link ValidationEngine.invalidate} — which is why
 * {@link ValidationEngine.registerValidator} exists and should be preferred over
 * reaching for this class directly.
 *
 * ### Unknown names are not errors
 * A column may declare a rule this registry has never heard of. The engine
 * ignores it rather than throwing: the key may belong to a plugin that has not
 * loaded yet, or to a foreign tool reading the same column definitions, and
 * neither is a reason to fail a user's edit.
 *
 * Follows the shape of `BuiltInRendererRegistry` and `IconRegistry`; method
 * names match them (`remove`, not `unregister`).
 */
export class ValidatorRegistry {
  private readonly factories = new Map<string, ValidatorFactory>();

  /**
   * @param factories - Rules to seed the registry with. Defaults to every rule
   *   Photon Grid ships; pass your own record to opt out of the rest.
   */
  constructor(
    factories: Readonly<Record<string, ValidatorFactory>> = createDefaultValidatorFactories(),
  ) {
    this.registerAll(factories);
  }

  /**
   * Adds a rule factory, replacing any existing one with the same name.
   *
   * Last-in wins, deliberately: it is what lets an application override a
   * built-in — a stricter house `email`, say — without the grid needing an
   * override mechanism of its own.
   */
  register(name: string, factory: ValidatorFactory): void {
    this.factories.set(name, factory);
  }

  /** Registers several rules, in the record's key order — later duplicates win. */
  registerAll(factories: Readonly<Record<string, ValidatorFactory>>): void {
    for (const name of Object.keys(factories)) {
      const factory = factories[name];
      if (factory) this.register(name, factory);
    }
  }

  /** The factory registered under `name`, or `undefined`. */
  get(name: string): ValidatorFactory | undefined {
    return this.factories.get(name);
  }

  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * Removes a rule. Columns declaring it fall back to being unvalidated on that
   * key rather than failing — see the class note on unknown names.
   */
  remove(name: string): void {
    this.factories.delete(name);
  }

  /** Registered names, in registration order. */
  names(): string[] {
    return [...this.factories.keys()];
  }

  /** A copy of the registry, so callers cannot mutate it by holding the map. */
  getAll(): Map<string, ValidatorFactory> {
    return new Map(this.factories);
  }

  clear(): void {
    this.factories.clear();
  }
}
