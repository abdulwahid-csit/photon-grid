import type { Theme, BuiltInThemeName } from '../types/theme.types';
import type { EventBus } from '../event-bus/event-bus';
export declare class ThemeManager {
    private eventBus;
    private injector;
    private rootInjector;
    private registry;
    private activeTheme;
    private scopeEl;
    constructor(eventBus: EventBus);
    registerTheme(theme: Theme): void;
    applyTheme(nameOrTheme: BuiltInThemeName | string | Theme, scopeEl?: HTMLElement): void;
    getActiveTheme(): Theme | null;
    getTheme(name: string): Theme | undefined;
    getAllThemes(): Theme[];
    toggleDarkMode(): void;
    isDarkMode(): boolean;
    destroy(): void;
}
//# sourceMappingURL=theme-manager.d.ts.map