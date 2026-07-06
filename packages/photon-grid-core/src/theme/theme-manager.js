import { GridEventType } from '../types/event.types';
import { CssVarInjector } from './css-var-injector';
import { lightTheme } from './themes/light-theme';
import { darkTheme } from './themes/dark-theme';
export class ThemeManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.injector = new CssVarInjector();
        // A second injector always sets variables on :root so that fixed-position
        // elements appended to <body> (menus, dropdowns, overlays) can inherit them.
        this.rootInjector = new CssVarInjector();
        this.registry = new Map();
        this.activeTheme = null;
        this.scopeEl = null;
        this.registry.set('light', lightTheme);
        this.registry.set('dark', darkTheme);
    }
    registerTheme(theme) {
        this.registry.set(theme.name, theme);
    }
    applyTheme(nameOrTheme, scopeEl) {
        let theme;
        if (typeof nameOrTheme === 'string') {
            theme = this.registry.get(nameOrTheme);
            if (!theme) {
                console.warn(`[PhotonGrid] Theme "${nameOrTheme}" not found. Falling back to "light".`);
                theme = lightTheme;
            }
        }
        else {
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
        }
        else {
            document.documentElement.setAttribute('data-pg-theme', theme.name);
            document.documentElement.setAttribute('data-pg-mode', theme.mode);
        }
        this.eventBus.emit(GridEventType.THEME_CHANGED, { themeName: theme.name });
    }
    getActiveTheme() {
        return this.activeTheme;
    }
    getTheme(name) {
        return this.registry.get(name);
    }
    getAllThemes() {
        return Array.from(this.registry.values());
    }
    toggleDarkMode() {
        const current = this.activeTheme;
        if (!current)
            return;
        const targetName = current.mode === 'light' ? 'dark' : 'light';
        const target = this.registry.get(targetName);
        if (target)
            this.applyTheme(target, this.scopeEl ?? undefined);
    }
    isDarkMode() {
        return this.activeTheme?.mode === 'dark';
    }
    destroy() {
        this.injector.remove();
        this.rootInjector.remove();
        this.activeTheme = null;
    }
}
//# sourceMappingURL=theme-manager.js.map