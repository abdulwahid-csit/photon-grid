import { coreIcons } from './icon-sets/core-icons';
import type { IconSet } from '../types/icon.types';

export interface IconRegistryOptions {
  /** Default edge length, in px, for icons rendered without an explicit size. */
  defaultSize?: number;
  /** Default CSS colour for rendered icons. `currentColor` lets themes tint them. */
  defaultColor?: string;
  /** Host icons applied at construction. Highest precedence — see the class doc. */
  icons?: IconSet;
}

/**
 * Resolves icon names to SVG markup, in three layers.
 *
 * ```
 * overrides  (host)          ← register() / registerAll() / GridOptions.icons
 *     ↓ falls through to
 * variant    (active theme)  ← setVariantIcons(), swapped on every theme change
 *     ↓ falls through to
 * base       (coreIcons)     ← the shared default set
 * ```
 *
 * **Host outranks theme, deliberately.** A variant pack is replaced wholesale
 * whenever the theme changes; if host registrations lived below it, switching
 * theme would silently discard an application's own icons. Putting them on top
 * means a host that overrides `check` keeps that glyph in every theme, while
 * every name it did *not* override still follows the theme.
 *
 * Because a variant pack is partial, an icon it omits falls through to `base`
 * — so a pack only has to draw the glyphs that carry the theme's identity.
 *
 * Note that {@link loadCoreIcons} and `registerAll(coreIcons)` are **not**
 * interchangeable: the former refills the base layer (the reset), while the
 * latter would pin the entire core set as host overrides and permanently defeat
 * every variant pack.
 */
export class IconRegistry {
  /** Shared defaults. Lowest precedence. */
  private base = new Map<string, string>(Object.entries(coreIcons));
  /** Active variant's pack, or `null` when no variant is applied. */
  private variant: Map<string, string> | null = null;
  /** Host registrations. Highest precedence; never touched by a theme change. */
  private readonly overrides = new Map<string, string>();

  private readonly options: IconRegistryOptions;

  constructor(options: IconRegistryOptions = {}) {
    this.options = { defaultSize: 16, defaultColor: 'currentColor', ...options };
    if (options.icons) this.registerAll(options.icons);
  }

  /** Default edge length for icons rendered without an explicit size. */
  get defaultSize(): number {
    return this.options.defaultSize ?? 16;
  }

  /** Default CSS colour applied to rendered icons. */
  get defaultColor(): string {
    return this.options.defaultColor ?? 'currentColor';
  }

  /** Registers a host icon. Outranks the active variant and the base set. */
  register(name: string, svgContent: string): void {
    this.overrides.set(name, svgContent);
  }

  /** Registers host icons in bulk. Outranks the active variant and the base set. */
  registerAll(iconSet: IconSet): void {
    for (const [name, svg] of Object.entries(iconSet)) {
      this.overrides.set(name, svg);
    }
  }

  /**
   * Swaps the active variant layer. Pass `null` to clear it (variant `'none'`).
   *
   * Replaces the layer wholesale rather than merging, so switching themes never
   * leaves glyphs behind from the previous one.
   */
  setVariantIcons(icons: IconSet | null): void {
    this.variant = icons ? new Map(Object.entries(icons)) : null;
  }

  has(name: string): boolean {
    return this.overrides.has(name) || (this.variant?.has(name) ?? false) || this.base.has(name);
  }

  /** Resolves a name through the layer stack: overrides → variant → base. */
  get(name: string): string | undefined {
    return this.overrides.get(name) ?? this.variant?.get(name) ?? this.base.get(name);
  }

  /** A flattened snapshot with the same precedence the lookup uses. */
  getAll(): Map<string, string> {
    const merged = new Map(this.base);
    if (this.variant) for (const [k, v] of this.variant) merged.set(k, v);
    for (const [k, v] of this.overrides) merged.set(k, v);
    return merged;
  }

  /** Removes a name from every layer — "gone" means gone, whichever layer supplied it. */
  remove(name: string): void {
    this.overrides.delete(name);
    this.variant?.delete(name);
    this.base.delete(name);
  }

  /** Empties every layer. {@link loadCoreIcons} restores the defaults. */
  clear(): void {
    this.overrides.clear();
    this.variant = null;
    this.base.clear();
  }

  /** Restores the shared default set into the base layer. The documented reset. */
  loadCoreIcons(): void {
    this.base = new Map<string, string>(Object.entries(coreIcons));
  }

  /** Every resolvable name, across all three layers. */
  getNames(): string[] {
    const names = new Set<string>(this.base.keys());
    if (this.variant) for (const k of this.variant.keys()) names.add(k);
    for (const k of this.overrides.keys()) names.add(k);
    return Array.from(names);
  }
}
