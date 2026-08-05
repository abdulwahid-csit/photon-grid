import type { Theme, BuiltInThemeName, ThemeMode, ThemeVariant } from '../types/theme.types';
import { THEME_VARIANT_CLASS } from '../types/theme.types';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import { CssVarInjector } from './css-var-injector';
import { TOKEN_PREFIX } from './css-var-injector';
import { lightTheme } from './themes/light-theme';
import { darkTheme } from './themes/dark-theme';
import {
  SCOPE_ATTR,
  PORTAL_HOST_CLASS,
  registerPortalHost,
  disposePortalHost,
} from './overlay-portal';
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
 * Mode tokens are additionally mirrored onto `:root` so any element outside both
 * the container and the portal host still resolves a sensible palette.
 *
 * The `data-pg-mode` / `data-pg-variant` **attributes** are not mirrored there
 * when the instance has a container. Both are used ancestor-rooted in CSS —
 * `[data-pg-mode="dark"] .pg-cell--in-selection`,
 * `[data-pg-variant="quantum"] .pg-context-menu` — so a copy on
 * `<html>` makes every such rule match *every* grid on the page instead of the
 * one it belongs to. A light grid beside a dark one took the dark selection
 * tints and flash colours; a classic grid's menu was skinned by whichever
 * variant stylesheet was concatenated last. Only a manager driving the document
 * root itself (no container) still mirrors, where there is nothing else to hang
 * the attributes on and no second grid to mis-target.
 *
 * What overlays resolve instead is the **portal host**: a `display: contents`
 * element in `<body>`, one per grid, carrying that grid's scope id, mode,
 * variant and variant class. Built-in overlays are appended into their owner's
 * host (see `overlay-portal.ts`), so both the ancestor-rooted rules above and
 * the scoped token stylesheet reach them, per instance.
 *
 * Per-instance chrome is unaffected either way: those rules stay scoped to
 * `.pg-<variant>-theme .pg-grid`.
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
  /**
   * This instance's portal host in `<body>`, created with the scope id and kept
   * in step with the active mode/variant. Null until a scope element is known,
   * since the host is identified by that scope. See `overlay-portal.ts`.
   */
  private portalHost: HTMLElement | null = null;
  /** Scope id stamped on {@link scopeEl} and {@link portalHost}; needed to unregister. */
  private scopeId: string | null = null;
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

      // The host shares the scope id, so the stylesheet injected above matches it
      // too and portaled overlays resolve this grid's palette rather than the
      // last-writer-wins one on `<html>`.
      const host = this.ensurePortalHost(scopeId);
      host.setAttribute('data-pg-mode', theme.mode);
      host.style.colorScheme = theme.mode;
    } else {
      this.injector.injectAsStylesheet(theme.tokens, ':root');
      document.documentElement.style.colorScheme = theme.mode;
      // Only the unscoped case mirrors the mode attribute to the root. With a
      // container there is deliberately no mirror: roughly fifteen base rules
      // are written as `[data-pg-mode="dark"] .pg-cell--…` — ancestor-rooted, so
      // an attribute on `<html>` makes every one of them match *every* grid on
      // the page. A light grid beside a dark one would take the dark selection
      // tints, flash colours and serial-gutter fill, and a light grid nested in
      // a dark Master/Detail parent would do the same. The container and the
      // portal host each carry the attribute themselves, which is what those
      // rules match through, so nothing needs the root copy.
      document.documentElement.setAttribute('data-pg-mode', theme.mode);
    }

    // Tokens are still mirrored to `:root`: unlike the attribute they cannot
    // mis-target a rule, and they remain the fallback for any host-authored
    // element outside both the container and the portal host.
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

    // The portal host wears the same skin as the container, so overlays match the
    // grid that opened them. Resolved before the swap so both are updated in one
    // pass; null when no scope element has been seen yet (mode not applied).
    const host = this.scopeEl ? this.ensurePortalHost(this.ensureScopeId(this.scopeEl)) : null;

    // Remove any previously applied variant class before adding the new one.
    for (const el of host ? [target, host] : [target]) {
      for (const cls of Array.from(el.classList)) {
        if (VARIANT_CLASS_RE.test(cls)) el.classList.remove(cls);
      }
    }

    this.activeVariant = variant;
    if (variant !== 'none') {
      const variantClass = THEME_VARIANT_CLASS[variant];
      target.classList.add(variantClass);
      target.setAttribute('data-pg-variant', variant);
      host?.classList.add(variantClass);
      host?.setAttribute('data-pg-variant', variant);
    } else {
      target.removeAttribute('data-pg-variant');
      host?.removeAttribute('data-pg-variant');
    }

    // The document root is deliberately *not* mirrored when this instance has a
    // container of its own. Variant rules are ancestor-rooted
    // (`[data-pg-variant="quantum"] .pg-context-menu`), so an attribute on
    // `<html>` matches every grid's overlays, not just that variant's — and
    // since the variant stylesheets are concatenated in a fixed order, the
    // last-declared skin silently wins for all of them. The container and the
    // portal host each carry the attribute, which is what those rules match
    // through. Only a manager driving the document root itself still mirrors.
    if (!this.scopeEl) {
      if (variant !== 'none') document.documentElement.setAttribute('data-pg-variant', variant);
      else document.documentElement.removeAttribute('data-pg-variant');
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
   * so portaled menus/overlays (appended to `<body>`) pick them up too, and onto
   * this instance's portal host so overlays that *are* scoped to it — which win
   * over the root mirror — preview the override as well.
   *
   * @param vars    - Map of full `--pg-*` variable names to values.
   * @param scopeEl - Optional container; defaults to the current scope element.
   */
  applyTokenOverrides(vars: Readonly<Record<string, string>>, scopeEl?: HTMLElement): void {
    if (scopeEl) this.scopeEl = scopeEl;
    const target = this.scopeEl ?? document.documentElement;
    const root = document.documentElement;
    const host = this.portalHost;
    for (const [name, value] of Object.entries(vars)) {
      if (!name.startsWith(TOKEN_PREFIX)) continue;
      this.tokenOverrideKeys.add(name);
      target.style.setProperty(name, value);
      if (root !== target) root.style.setProperty(name, value);
      host?.style.setProperty(name, value);
    }
  }

  /**
   * Remove every inline token override applied via {@link applyTokenOverrides},
   * reverting the grid to its active mode/variant styling.
   */
  clearTokenOverrides(scopeEl?: HTMLElement): void {
    const target = scopeEl ?? this.scopeEl ?? document.documentElement;
    const root = document.documentElement;
    const host = this.portalHost;
    for (const name of this.tokenOverrideKeys) {
      target.style.removeProperty(name);
      if (root !== target) root.style.removeProperty(name);
      host?.style.removeProperty(name);
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

  /**
   * This grid's portal host — the `<body>`-level element carrying its scope id,
   * mode and variant, into which overlays should be appended so they resolve
   * this instance's theme rather than the shared document root.
   *
   * Prefer `portalHostFor(anchorEl)` from `overlay-portal.ts` at call sites that
   * have a triggering element: it resolves the owner from the DOM and needs no
   * reference to the manager. Use this accessor for long-lived layers that have
   * no per-open anchor, such as the toast layer.
   *
   * Returns `null` until a mode has been applied, since the host is keyed by the
   * scope id minted at that point.
   */
  getPortalHost(): HTMLElement | null {
    return this.portalHost;
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
    // Takes any overlay still parented to the host down with it, so a destroyed
    // grid cannot leave a menu or toast stranded on the page.
    if (this.scopeId) disposePortalHost(this.scopeId);
    this.portalHost = null;
    this.scopeId = null;
  }

  // ──────────────────── internals ────────────────────

  /**
   * Resolve a mode name or Theme object to a concrete light/dark Theme.
   */
  private resolveModeTheme(modeOrTheme: ThemeMode | Theme): Theme {
    if (typeof modeOrTheme !== 'string') return modeOrTheme;
    return this.registry.get(modeOrTheme) ?? lightTheme;
  }

  /**
   * Lazily creates this instance's portal host and registers it under `scopeId`.
   * Idempotent — subsequent calls return the existing host.
   *
   * The host carries the scope id so the mode-token stylesheet injected by
   * {@link applyMode} matches it, and is styled `display: contents` so it adds no
   * box, no layout and no containing block. See `overlay-portal.ts`.
   */
  private ensurePortalHost(scopeId: string): HTMLElement {
    if (this.portalHost) return this.portalHost;

    const host = document.createElement('div');
    host.className = PORTAL_HOST_CLASS;
    host.setAttribute(SCOPE_ATTR, scopeId);
    document.body.appendChild(host);

    this.portalHost = host;
    this.scopeId = scopeId;
    registerPortalHost(scopeId, host);
    return host;
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
