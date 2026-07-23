/**
 * Runtime registry mapping function names to their {@link FormulaFunction}
 * implementations. It is the single extension point for adding functions —
 * built-ins are registered at construction, and developers register custom
 * functions through the same API with no engine changes.
 *
 * @packageDocumentation
 */

import type { FormulaFunction } from './formula-function';

/**
 * A name → {@link FormulaFunction} lookup table.
 *
 * Lookup is case-insensitive by default (Excel semantics): names are stored
 * upper-cased. When constructed with `caseSensitive = true`, names are stored
 * verbatim and matched exactly.
 *
 * Registration is last-wins, so a custom function may deliberately override a
 * built-in of the same name.
 */
export class FunctionRegistry {
  private readonly functions = new Map<string, FormulaFunction>();

  /**
   * @param caseSensitive - When `true`, function names are matched exactly;
   *                        otherwise they are normalized to upper-case.
   */
  constructor(private readonly caseSensitive = false) {}

  /** Normalizes a name to its lookup key per the case-sensitivity setting. */
  private key(name: string): string {
    return this.caseSensitive ? name : name.toUpperCase();
  }

  /**
   * Registers (or overrides) a function.
   *
   * @param fn - The function implementation. Its {@link FormulaFunction.name}
   *             is used as the key.
   */
  register(fn: FormulaFunction): void {
    this.functions.set(this.key(fn.name), fn);
  }

  /**
   * Registers many functions in one call.
   *
   * @param fns - The function implementations to register.
   */
  registerAll(fns: Iterable<FormulaFunction>): void {
    for (const fn of fns) this.register(fn);
  }

  /**
   * Removes a function by name.
   *
   * @param name - The function name (case-normalized per settings).
   * @returns `true` if a function was removed.
   */
  unregister(name: string): boolean {
    return this.functions.delete(this.key(name));
  }

  /**
   * Looks up a function by name.
   *
   * @param name - The function name as written in a formula.
   * @returns The implementation, or `undefined` if not registered.
   */
  get(name: string): FormulaFunction | undefined {
    return this.functions.get(this.key(name));
  }

  /**
   * @param name - The function name as written in a formula.
   * @returns `true` if a function with this name is registered.
   */
  has(name: string): boolean {
    return this.functions.has(this.key(name));
  }

  /** @returns The number of registered functions. */
  get size(): number {
    return this.functions.size;
  }

  /** @returns All registered function names (normalized). */
  names(): string[] {
    return [...this.functions.keys()];
  }
}
