import { describe, it, expect } from 'vitest';
import { ThemeExporter } from '../../src/photon-ai/theme/theme-exporter';
import type { GeneratedTheme } from '../../src/types/theme-ai.types';

const theme: GeneratedTheme = {
  themeName: 'GitHub Dark',
  description: 'A GitHub-inspired dark theme',
  variables: { '--pg-colors-header-background': '#161B22', '--pg-colors-primary': '#58a6ff' },
};

describe('ThemeExporter', () => {
  const exporter = new ThemeExporter();

  it('exports round-trippable JSON', () => {
    const parsed = JSON.parse(exporter.export(theme, 'json'));
    expect(parsed).toEqual(theme);
  });

  it('exports CSS custom properties under :root', () => {
    const css = exporter.export(theme, 'css');
    expect(css).toContain(':root {');
    expect(css).toContain('--pg-colors-header-background: #161B22;');
    expect(css).toContain('--pg-colors-primary: #58a6ff;');
  });

  it('exports a typed TS module and a JS module', () => {
    const ts = exporter.export(theme, 'ts');
    expect(ts).toContain('GeneratedTheme');
    expect(ts).toMatch(/export const \w+Theme/);

    const js = exporter.export(theme, 'js');
    expect(js).toMatch(/export const \w+Theme = \{/);
    expect(js).not.toContain('GeneratedTheme');
  });
});
