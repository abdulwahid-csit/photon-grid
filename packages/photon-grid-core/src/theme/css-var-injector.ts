import type { ThemeTokens } from '../types/theme.types';

/** CSS custom-property prefix for every Photon design token. */
export const TOKEN_PREFIX = '--pg';
const PREFIX = TOKEN_PREFIX;

/** Converts a camelCase token key to kebab-case (`headerBackground` → `header-background`). */
export function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Recursively flattens a (possibly nested) token object into a map of full
 * CSS-variable names → string values, e.g. `{ colors: { headerBackground } }`
 * → `--pg-colors-header-background`. Exported so the AI Theme Registry derives
 * the exact same real variable names the injector produces.
 */
export function flattenTokens(
  obj: Record<string, unknown>,
  prefix: string,
  result: Map<string, string>,
): void {
  for (const [key, value] of Object.entries(obj)) {
    const cssKey = `${prefix}-${toKebab(key)}`;
    if (typeof value === 'string' || typeof value === 'number') {
      result.set(cssKey, String(value));
    } else if (typeof value === 'object' && value !== null) {
      flattenTokens(value as Record<string, unknown>, cssKey, result);
    }
  }
}

/** Flattens a full {@link ThemeTokens} tree into a `--pg-*` → value map. */
export function flattenThemeTokens(tokens: ThemeTokens): Map<string, string> {
  const vars = new Map<string, string>();
  flattenTokens(tokens as unknown as Record<string, unknown>, PREFIX, vars);
  return vars;
}

export class CssVarInjector {
  private styleEl: HTMLStyleElement | null = null;
  private scopeEl: HTMLElement | null = null;

  inject(tokens: ThemeTokens, scopeEl?: HTMLElement): void {
    this.scopeEl = scopeEl ?? document.documentElement;

    const vars = new Map<string, string>();
    flattenTokens(tokens as unknown as Record<string, unknown>, PREFIX, vars);

    for (const [key, value] of vars) {
      this.scopeEl.style.setProperty(key, value);
    }
  }

  injectAsStylesheet(tokens: ThemeTokens, selector = ':root'): void {
    if (this.styleEl) {
      this.styleEl.remove();
    }

    const vars = new Map<string, string>();
    flattenTokens(tokens as unknown as Record<string, unknown>, PREFIX, vars);

    const cssLines: string[] = [`${selector} {`];
    for (const [key, value] of vars) {
      cssLines.push(`  ${key}: ${value};`);
    }
    cssLines.push('}');

    this.styleEl = document.createElement('style');
    this.styleEl.setAttribute('data-photon-grid-theme', '');
    this.styleEl.textContent = cssLines.join('\n');
    document.head.appendChild(this.styleEl);
  }

  remove(): void {
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
    if (this.scopeEl) {
      const style = this.scopeEl.style;
      for (let i = style.length - 1; i >= 0; i--) {
        const prop = style.item(i);
        if (prop.startsWith(PREFIX)) style.removeProperty(prop);
      }
    }
  }

  getVar(tokenPath: string): string {
    return `var(${PREFIX}-${toKebab(tokenPath)})`;
  }
}
