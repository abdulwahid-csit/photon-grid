import type { ThemeTokens } from '../types/theme.types';

const PREFIX = '--pg';

function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
}

function flattenTokens(
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
