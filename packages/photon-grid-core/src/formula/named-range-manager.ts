/**
 * Runtime registry of named ranges/cells (`TaxRate` → `Sheet1!$B$1`).
 *
 * Names are stored case-insensitively (Excel semantics) and resolved to
 * {@link Reference}s lazily by the {@link ReferenceResolver} at evaluation time.
 * Seeded from {@link ResolvedFormulaConfig.namedRanges} and mutable at runtime
 * through the public API, so a developer can define names without a full
 * reconfigure.
 *
 * @packageDocumentation
 */

/** A read-only view of a named range: its name and A1-notation target. */
export interface NamedRangeEntry {
  /** The name as originally registered (display casing preserved). */
  readonly name: string;
  /** The A1-notation target (e.g. `"B1"`, `"A1:C3"`). */
  readonly target: string;
}

export class NamedRangeManager {
  /** upper-cased name → { display name, A1 target }. */
  private readonly entries = new Map<string, NamedRangeEntry>();

  /**
   * @param seed - Initial name → A1 target map (from configuration).
   */
  constructor(seed?: Readonly<Record<string, string>>) {
    if (seed) {
      for (const name of Object.keys(seed)) this.set(name, seed[name]);
    }
  }

  /**
   * Defines or replaces a named range.
   *
   * @param name   - The name (case-insensitive).
   * @param target - The A1-notation target it points at.
   */
  set(name: string, target: string): void {
    this.entries.set(name.toUpperCase(), { name, target });
  }

  /**
   * Resolves a name to its A1 target.
   *
   * @param name - The name as written in a formula (case-insensitive).
   * @returns The target string, or `null` if undefined.
   */
  getTarget(name: string): string | null {
    return this.entries.get(name.toUpperCase())?.target ?? null;
  }

  /**
   * @param name - The name (case-insensitive).
   * @returns `true` if the name is defined.
   */
  has(name: string): boolean {
    return this.entries.has(name.toUpperCase());
  }

  /**
   * Removes a named range.
   *
   * @param name - The name (case-insensitive).
   * @returns `true` if a name was removed.
   */
  delete(name: string): boolean {
    return this.entries.delete(name.toUpperCase());
  }

  /** @returns All defined named ranges (display casing preserved). */
  list(): NamedRangeEntry[] {
    return [...this.entries.values()];
  }

  /** Removes every named range. */
  clear(): void {
    this.entries.clear();
  }
}
