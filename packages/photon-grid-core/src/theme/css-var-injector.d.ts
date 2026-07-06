import type { ThemeTokens } from '../types/theme.types';
export declare class CssVarInjector {
    private styleEl;
    private scopeEl;
    inject(tokens: ThemeTokens, scopeEl?: HTMLElement): void;
    injectAsStylesheet(tokens: ThemeTokens, selector?: string): void;
    remove(): void;
    getVar(tokenPath: string): string;
}
//# sourceMappingURL=css-var-injector.d.ts.map