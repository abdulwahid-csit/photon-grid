import type { Theme, BuiltInThemeName } from '../types/theme.types';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import { CssVarInjector } from './css-var-injector';
import { lightTheme } from './themes/light-theme';
import { darkTheme } from './themes/dark-theme';

export class ThemeManager {
  private injector = new CssVarInjector();
  // A second injector always sets variables on :root so that fixed-position
  // elements appended to <body> (menus, dropdowns, overlays) can inherit them.
  private rootInjector = new CssVarInjector();
  private registry = new Map<string, Theme>();
  private activeTheme: Theme | null = null;
  private scopeEl: HTMLElement | null = null;

  constructor(private eventBus: EventBus) {
    this.registry.set('light', lightTheme);
    this.registry.set('dark', darkTheme);
  }

  registerTheme(theme: Theme): void {
    this.registry.set(theme.name, theme);
  }

  applyTheme(
    nameOrTheme: BuiltInThemeName | string | Theme,
    scopeEl?: HTMLElement,
  ): void {
    let theme: Theme | undefined;

    if (typeof nameOrTheme === 'string') {
      theme = this.registry.get(nameOrTheme);
      if (!theme) {
        console.warn(`[PhotonGrid] Theme "${nameOrTheme}" not found. Falling back to "light".`);
        theme = lightTheme;
      }
    } else {
      theme = nameOrTheme;
      this.registry.set(theme.name, theme);
    }

    this.scopeEl = scopeEl ?? null;
    this.activeTheme = theme;

    const selector = scopeEl
      ? `[data-photon-grid-id="${scopeEl.getAttribute('data-photon-grid-id')}"]`
      : ':root';

    this.injector.injectAsStylesheet(theme.tokens, selector);
    // Always mirror variables to :root so fixed/portal elements pick them up.
    this.rootInjector.inject(theme.tokens, document.documentElement);

    if (scopeEl) {
      scopeEl.setAttribute('data-pg-theme', theme.name);
      scopeEl.setAttribute('data-pg-mode', theme.mode);
    } else {
      document.documentElement.setAttribute('data-pg-theme', theme.name);
      document.documentElement.setAttribute('data-pg-mode', theme.mode);
    }

    this.eventBus.emit(GridEventType.THEME_CHANGED, { themeName: theme.name });
  }

  getActiveTheme(): Theme | null {
    return this.activeTheme;
  }

  getTheme(name: string): Theme | undefined {
    return this.registry.get(name);
  }

  getAllThemes(): Theme[] {
    return Array.from(this.registry.values());
  }

  toggleDarkMode(): void {
    const current = this.activeTheme;
    if (!current) return;
    const targetName = current.mode === 'light' ? 'dark' : 'light';
    const target = this.registry.get(targetName);
    if (target) this.applyTheme(target, this.scopeEl ?? undefined);
  }

  isDarkMode(): boolean {
    return this.activeTheme?.mode === 'dark';
  }

  destroy(): void {
    this.injector.remove();
    this.rootInjector.remove();
    this.activeTheme = null;
  }
}
