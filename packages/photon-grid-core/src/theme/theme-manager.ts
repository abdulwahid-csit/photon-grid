import type { Theme, BuiltInThemeName, ThemeMode, ThemeVariant } from '../types/theme.types';
import { THEME_VARIANT_CLASS } from '../types/theme.types';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import { CssVarInjector } from './css-var-injector';
import { TOKEN_PREFIX } from './css-var-injector';
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
 * 2. **Variant** (`ion` / `neon` / …) — a cosmetic skin applied as a CSS
 *    class on that same container. Variant stylesheets only override structural
 *    and accent concerns, so any variant composes with either mode.
 *
 * Mode tokens are additionally mirrored onto `:root` so fixed/portal elements
 * (menus, dropdowns, overlays appended to `<body>`) inherit the palette.
 *
 * The active `data-pg-mode` / `data-pg-variant` attributes are mirrored onto
 * `document.documentElement` for the same reason: overlays are portaled to
 * `<body>`, i.e. **outside** the grid container, so a selector rooted at the
 * container can never reach them. Variant and dark-mode stylesheets target
 * `[data-pg-variant="…"] .pg-context-menu` / `[data-pg-mode="dark"] …` and
 * match from the document root down, covering in-grid and portaled nodes alike.
 *
 * With several grids on one page that mirror is last-writer-wins. This is
 * acceptable because only one overlay is ever open at a time — but it does mean
 * an overlay belonging to grid A can be skinned by grid B's variant if B applied
 * its variant more recently. Per-instance chrome is unaffected: those rules stay
 * scoped to `.pg-<variant>-theme .pg-grid`.
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
  /** Names of inline token overrides applied via {@link applyTokenOverrides}, for clean removal. */
  private readonly tokenOverrideKeys = new Set<string>();
  /**
   * Notified whenever the active variant changes, so subsystems that are not
   * CSS-driven can follow the skin. Currently drives the per-variant icon pack
   * swap (see `IconThemeController`).
   *
   * Injected rather than imported so the theme layer stays free of any
   * dependency on the icon layer.
   */
  private onVariantChange: ((variant: ThemeVariant | 'none') => void) | null = null;

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
   * Registers the callback notified on every variant change, including the
   * initial one applied at construction. Pass `null` to unhook (see
   * `GridCore.destroy`, which must break the cycle).
   */
  setVariantChangeHandler(handler: ((variant: ThemeVariant | 'none') => void) | null): void {
    this.onVariantChange = handler;
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
      document.documentElement.style.colorScheme = theme.mode;
    }

    // Mirror the mode onto the document root unconditionally: `[data-pg-mode]`
    // rules in the base stylesheet (selection tints, flash animations, the
    // loading overlay) have to reach overlays portaled to `<body>`, which sit
    // outside the container the scoped branch above marks.
    document.documentElement.setAttribute('data-pg-mode', theme.mode);

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
      // Mirrored to the document root so variant rules can reach overlays
      // portaled to `<body>` — see the class doc for the multi-grid caveat.
      document.documentElement.setAttribute('data-pg-variant', variant);
    } else {
      target.removeAttribute('data-pg-variant');
      document.documentElement.removeAttribute('data-pg-variant');
    }

    // Fired synchronously, after the class swap, so the CSS skin and anything
    // that follows it (the icon pack) are never out of step for a frame.
    this.onVariantChange?.(variant);
  }

  /**
   * Overlay a subset of design-token CSS variables directly on the scope
   * container as inline properties — used by the AI Theme Engine for instant,
   * rebuild-free preview/apply. Inline properties win over the scoped mode
   * stylesheet in the cascade, so these override the active mode without
   * touching it. The same variables are mirrored onto `document.documentElement`
   * so portaled menus/overlays (appended to `<body>`) pick them up too.
   *
   * @param vars    - Map of full `--pg-*` variable names to values.
   * @param scopeEl - Optional container; defaults to the current scope element.
   */
  applyTokenOverrides(vars: Readonly<Record<string, string>>, scopeEl?: HTMLElement): void {
    if (scopeEl) this.scopeEl = scopeEl;
    const target = this.scopeEl ?? document.documentElement;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(vars)) {
      if (!name.startsWith(TOKEN_PREFIX)) continue;
      this.tokenOverrideKeys.add(name);
      target.style.setProperty(name, value);
      if (root !== target) root.style.setProperty(name, value);
    }
  }

  /**
   * Remove every inline token override applied via {@link applyTokenOverrides},
   * reverting the grid to its active mode/variant styling.
   */
  clearTokenOverrides(scopeEl?: HTMLElement): void {
    const target = scopeEl ?? this.scopeEl ?? document.documentElement;
    const root = document.documentElement;
    for (const name of this.tokenOverrideKeys) {
      target.style.removeProperty(name);
      if (root !== target) root.style.removeProperty(name);
    }
    this.tokenOverrideKeys.clear();
  }

  /**
   * Backward-compatible entry point for the deprecated `theme` option / API.
   * Normalizes a legacy value (e.g. `'dark'`, `'ion'`, `'pg-ion-theme'`,
   * `'ion-dark'`) onto the mode/variant axes and applies it.
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
          `('light' | 'dark') or variant ('ion' | 'neon' | 'photon' | 'quantum').`,
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
    // Strip the historical `pg-…-theme` wrapper so `pg-ion-theme` → `ion`.
    const normalized = name
      .trim()
      .toLowerCase()
      .replace(/^pg-/, '')
      .replace(/-theme$/, '');

    if (normalized === 'light' || normalized === 'dark') {
      return { mode: normalized };
    }

    // Split an optional trailing mode suffix, e.g. `ion-dark`.
    const [base, suffix] = normalized.split('-');
    const mode: ThemeMode | undefined =
      suffix === 'light' || suffix === 'dark' ? suffix : undefined;

    if (base === 'ion' || base === 'neon' || base === 'photon' || base === 'quantum') {
      return { variant: base, mode };
    }

    return {};
  }
}
