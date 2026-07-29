/**
 * The **Theme Exporter** — serializes a theme to JSON, CSS custom properties,
 * TypeScript, or JavaScript, so applications can persist/share generated themes.
 *
 * @packageDocumentation
 */

import type { GeneratedTheme, ThemeExportFormat } from '../../types/theme-ai.types';

/** Serializes {@link GeneratedTheme}s to the supported export formats. */
export class ThemeExporter {
  /** Serialize a theme to the requested format (defaults to JSON). */
  export(theme: GeneratedTheme, format: ThemeExportFormat = 'json'): string {
    switch (format) {
      case 'css':
        return this.toCss(theme);
      case 'ts':
        return this.toTs(theme);
      case 'js':
        return this.toJs(theme);
      case 'json':
      default:
        return JSON.stringify(theme, null, 2);
    }
  }

  private toCss(theme: GeneratedTheme): string {
    const lines = Object.entries(theme.variables).map(([k, v]) => `  ${k}: ${v};`);
    return `/* ${theme.themeName}${theme.description ? ` — ${theme.description}` : ''} */\n:root {\n${lines.join('\n')}\n}\n`;
  }

  private toTs(theme: GeneratedTheme): string {
    return (
      `import type { GeneratedTheme } from 'photon-grid';\n\n` +
      `export const ${toIdentifier(theme.themeName)}: GeneratedTheme = ${JSON.stringify(theme, null, 2)};\n`
    );
  }

  private toJs(theme: GeneratedTheme): string {
    return `export const ${toIdentifier(theme.themeName)} = ${JSON.stringify(theme, null, 2)};\n`;
  }
}

/** Turns a theme name into a safe JS identifier: "GitHub Dark" → "gitHubDarkTheme". */
function toIdentifier(name: string): string {
  const camel = name
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
  const base = camel.charAt(0).toLowerCase() + camel.slice(1);
  const safe = /^[a-zA-Z_$]/.test(base) ? base : `theme${camel}`;
  return `${safe || 'theme'}Theme`;
}
