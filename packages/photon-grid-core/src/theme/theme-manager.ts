import type { Theme, BuiltInThemeName, ThemeMode, ThemeVariant } from '../types/theme.types';
import { THEME_VARIANT_CLASS } from '../types/theme.types';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import { CssVarInjector } from './css-var-injector';
import { lightTheme } from './themes/light-theme';
import { darkTheme } from './themes/dark-theme';

/** Attribute used to scope a grid instance's mode tokens to its container. */
const SCOPE_ATTR = 'data-pg-theme-scope';
/** Matches any `pg-<name>-theme` variant class so it can be swapped cleanly. */
const VARIANT_CLASS_RE = /^pg-[a-z0-9]+-theme$/;

/**
 * Result of normalizing a legacy `theme` string onto the mode/variant axes.
 * Either axis may be absent when the legacy value only addresses one of them.
 */
interface ResolvedLegacyTheme {
  readonly mode?: ThemeMode;
  readonly variant?: ThemeVariant | 'none';
}

/**
 * Coordinates the two independent theming axes:
 *
 * 1. **Mode** (`light` / `dark`) — the full color palette, injected as design
 *    tokens (CSS custom properties) scoped to the grid's container element.
 * 2. **Variant** (`quartz` / `alpine` / …) — a cosmetic skin applied as a CSS
 *    class on that same container. Variant stylesheets only override structural
 *    and accent concerns, so any variant composes with either mode.
 *
 * Mode tokens are additionally mirrored onto `:root` so fixed/portal elements
 * (menus, dropdowns, overlays appended to `<body>`) inherit the palette.
 */
export class ThemeManager {
  /** Per-instance stylesheet carrying the active mode's tokens. */
  private readonly injector = new CssVarInjector();
  /** Mirrors mode tokens onto `:root` for portaled elements. */
  private readonly rootInjector = new CssVarInjector();
  private readonly registry = new Map<string, Theme>();

  private activeMode: Theme;
  private activeVariant: ThemeVariant | 'none' = 'none';
  private scopeEl: HTMLElement | null = null;

  /** Monotonic source for unique per-instance scope ids. */
  private static scopeSeq = 0;

  constructor(private readonly eventBus: EventBus) {
    this.registry.set('light', lightTheme);
    this.registry.set('dark', darkTheme);
    this.activeMode = lightTheme;
  }

  /** Register (or replace) a mode theme so it can be resolved by name. */
  registerTheme(theme: Theme): void {
    this.registry.set(theme.name, theme);
  }

  /**
   * Apply a color mode (light/dark) by injecting its tokens. Colors cascade
   * from the container down to every cell; the same tokens are mirrored to
   * `:root` for portaled UI. Does not touch the active variant.
   */
  applyMode(modeOrTheme: ThemeMode | Theme, scopeEl?: HTMLElement): void {
    const theme = this.resolveModeTheme(modeOrTheme);

    this.activeMode = theme;
    if (scopeEl) this.scopeEl = scopeEl;
    const target = this.scopeEl;

    if (target) {
      const scopeId = this.ensureScopeId(target);
      this.injector.injectAsStylesheet(theme.tokens, `[${SCOPE_ATTR}="${scopeId}"]`);
      target.setAttribute('data-pg-mode', theme.mode);
      // `color-scheme` is inherited, so setting it on the container makes every
      // native control inside (filter inputs/selects, date pickers, native
      // scrollbars) render with the correct light/dark chrome.
      target.style.colorScheme = theme.mode;
    } else {
      this.injector.injectAsStylesheet(theme.tokens, ':root');
      document.documentElement.setAttribute('data-pg-mode', theme.mode);
      document.documentElement.style.colorScheme = theme.mode;
    }

    // Always mirror variables to :root so fixed/portal elements pick them up.
    this.rootInjector.inject(theme.tokens, document.documentElement);

    this.eventBus.emit(GridEventType.THEME_CHANGED, { themeName: theme.name });
  }

  /**
   * Apply (or clear) the cosmetic variant skin. Swaps the `pg-<variant>-theme`
   * class on the scope container; passing `'none'` removes any active variant.
   */
  applyVariant(variant: ThemeVariant | 'none', scopeEl?: HTMLElement): void {
    if (scopeEl) this.scopeEl = scopeEl;
    const target = this.scopeEl ?? document.documentElement;

    // Remove any previously applied variant class before adding the new one.
    for (const cls of Array.from(target.classList)) {
      if (VARIANT_CLASS_RE.test(cls)) target.classList.remove(cls);
    }

    this.activeVariant = variant;
    if (variant !== 'none') {
      target.classList.add(THEME_VARIANT_CLASS[variant]);
      target.setAttribute('data-pg-variant', variant);
    } else {
      target.removeAttribute('data-pg-variant');
    }
  }

  /**
   * Backward-compatible entry point for the deprecated `theme` option / API.
   * Normalizes a legacy value (e.g. `'dark'`, `'quartz'`, `'pg-quartz-theme'`,
   * `'quartz-dark'`) onto the mode/variant axes and applies it.
   *
   * @deprecated Prefer {@link applyMode} + {@link applyVariant}.
   */
  applyTheme(nameOrTheme: BuiltInThemeName | string | Theme, scopeEl?: HTMLElement): void {
    if (typeof nameOrTheme !== 'string') {
      this.registry.set(nameOrTheme.name, nameOrTheme);
      this.applyMode(nameOrTheme, scopeEl);
      return;
    }

    const { mode, variant } = ThemeManager.parseLegacyTheme(nameOrTheme);
    if (scopeEl) this.scopeEl = scopeEl;
    if (mode) this.applyMode(mode, scopeEl);
    if (variant !== undefined) this.applyVariant(variant, scopeEl);
    if (!mode && variant === undefined) {
      console.warn(
        `[PhotonGrid] Theme "${nameOrTheme}" not recognized. Expected a mode ` +
          `('light' | 'dark') or variant ('quartz' | 'alpine' | 'balham' | 'material').`,
      );
    }
  }

  /** The active mode theme (light/dark). Never null after construction. */
  getActiveTheme(): Theme {
    return this.activeMode;
  }

  /** The active mode as a plain string. */
  getActiveMode(): ThemeMode {
    return this.activeMode.mode;
  }

  /** The active variant, or `'none'` when no skin is applied. */
  getActiveVariant(): ThemeVariant | 'none' {
    return this.activeVariant;
  }

  getTheme(name: string): Theme | undefined {
    return this.registry.get(name);
  }

  getAllThemes(): Theme[] {
    return Array.from(this.registry.values());
  }

  /** Toggle between light and dark mode, preserving the active variant. */
  toggleDarkMode(): void {
    this.applyMode(this.activeMode.mode === 'light' ? 'dark' : 'light');
  }

  isDarkMode(): boolean {
    return this.activeMode.mode === 'dark';
  }

  destroy(): void {
    this.injector.remove();
    this.rootInjector.remove();
  }

  // ──────────────────── internals ────────────────────

  /** Resolve a mode name or Theme object to a concrete light/dark Theme. */
  private resolveModeTheme(modeOrTheme: ThemeMode | Theme): Theme {
    if (typeof modeOrTheme !== 'string') return modeOrTheme;
    return this.registry.get(modeOrTheme) ?? lightTheme;
  }

  /** Ensure the scope element carries a stable id used to target its tokens. */
  private ensureScopeId(el: HTMLElement): string {
    let id = el.getAttribute(SCOPE_ATTR);
    if (!id) {
      id = `pg-scope-${(ThemeManager.scopeSeq += 1)}`;
      el.setAttribute(SCOPE_ATTR, id);
    }
    return id;
  }

  /** Map a legacy `theme` string onto the mode/variant axes. */
  private static parseLegacyTheme(name: string): ResolvedLegacyTheme {
    // Strip the historical `pg-…-theme` wrapper so `pg-quartz-theme` → `quartz`.
    const normalized = name
      .trim()
      .toLowerCase()
      .replace(/^pg-/, '')
      .replace(/-theme$/, '');

    if (normalized === 'light' || normalized === 'dark') {
      return { mode: normalized };
    }

    // Split an optional trailing mode suffix, e.g. `quartz-dark`.
    const [base, suffix] = normalized.split('-');
    const mode: ThemeMode | undefined =
      suffix === 'light' || suffix === 'dark' ? suffix : undefined;

    if (base === 'quartz' || base === 'alpine' || base === 'balham' || base === 'material') {
      return { variant: base, mode };
    }

    return {};
  }
}
