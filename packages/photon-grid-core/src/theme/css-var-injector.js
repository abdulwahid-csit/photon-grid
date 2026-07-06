const PREFIX = '--pg';
function toKebab(str) {
    return str.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
}
function flattenTokens(obj, prefix, result) {
    for (const [key, value] of Object.entries(obj)) {
        const cssKey = `${prefix}-${toKebab(key)}`;
        if (typeof value === 'string' || typeof value === 'number') {
            result.set(cssKey, String(value));
        }
        else if (typeof value === 'object' && value !== null) {
            flattenTokens(value, cssKey, result);
        }
    }
}
export class CssVarInjector {
    constructor() {
        this.styleEl = null;
        this.scopeEl = null;
    }
    inject(tokens, scopeEl) {
        this.scopeEl = scopeEl ?? document.documentElement;
        const vars = new Map();
        flattenTokens(tokens, PREFIX, vars);
        for (const [key, value] of vars) {
            this.scopeEl.style.setProperty(key, value);
        }
    }
    injectAsStylesheet(tokens, selector = ':root') {
        if (this.styleEl) {
            this.styleEl.remove();
        }
        const vars = new Map();
        flattenTokens(tokens, PREFIX, vars);
        const cssLines = [`${selector} {`];
        for (const [key, value] of vars) {
            cssLines.push(`  ${key}: ${value};`);
        }
        cssLines.push('}');
        this.styleEl = document.createElement('style');
        this.styleEl.setAttribute('data-photon-grid-theme', '');
        this.styleEl.textContent = cssLines.join('\n');
        document.head.appendChild(this.styleEl);
    }
    remove() {
        if (this.styleEl) {
            this.styleEl.remove();
            this.styleEl = null;
        }
        if (this.scopeEl) {
            const style = this.scopeEl.style;
            for (let i = style.length - 1; i >= 0; i--) {
                const prop = style.item(i);
                if (prop.startsWith(PREFIX))
                    style.removeProperty(prop);
            }
        }
    }
    getVar(tokenPath) {
        return `var(${PREFIX}-${toKebab(tokenPath)})`;
    }
}
//# sourceMappingURL=css-var-injector.js.map