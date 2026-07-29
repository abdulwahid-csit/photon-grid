import { describe, it, expect } from 'vitest';
import { ThemeVariableRegistry } from '../../src/photon-ai/theme/theme-variable-registry';
import { ThemeCategory, ThemeVariableType } from '../../src/types/theme-ai.types';

describe('ThemeVariableRegistry', () => {
  const registry = new ThemeVariableRegistry();

  it('seeds from real tokens — every variable is a --pg-* property with a default', () => {
    const all = registry.getAll();
    expect(all.length).toBeGreaterThan(80);
    for (const v of all) {
      expect(v.cssVar.startsWith('--pg-')).toBe(true);
      expect(v.defaultValue.length).toBeGreaterThan(0);
    }
  });

  it('maps known tokens to sensible category + type', () => {
    const header = registry.getByName('--pg-colors-header-background');
    expect(header?.category).toBe(ThemeCategory.Header);
    expect(header?.type).toBe(ThemeVariableType.Color);

    const rowHeight = registry.getByName('--pg-sizing-header-row-height');
    expect(rowHeight?.type).toBe(ThemeVariableType.Size);

    expect(registry.getByName('--pg-shadows-dropdown')?.type).toBe(ThemeVariableType.Shadow);
  });

  it('getByCategory and has work', () => {
    expect(registry.getByCategory(ThemeCategory.Header).length).toBeGreaterThan(0);
    expect(registry.has('--pg-colors-primary')).toBe(true);
    expect(registry.has('--pg-not-a-token')).toBe(false);
  });

  it('allows registering custom variables', () => {
    const r = new ThemeVariableRegistry([]);
    expect(r.getAll()).toHaveLength(0);
    r.register({
      cssVar: '--pg-custom-x', name: 'Custom', category: ThemeCategory.Accent,
      type: ThemeVariableType.Color, defaultValue: '#000', description: 'x',
    });
    expect(r.has('--pg-custom-x')).toBe(true);
  });
});
