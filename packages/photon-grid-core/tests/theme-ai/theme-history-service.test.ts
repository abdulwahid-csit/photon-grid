import { describe, it, expect } from 'vitest';
import { ThemeHistoryService } from '../../src/photon-ai/theme/theme-history-service';
import type { GeneratedTheme } from '../../src/types/theme-ai.types';

const theme = (n: string): GeneratedTheme => ({ themeName: n, description: '', variables: {} });

describe('ThemeHistoryService', () => {
  it('undo/redo navigate the stack; undo past the start returns null (base)', () => {
    const h = new ThemeHistoryService();
    h.push(theme('A'));
    h.push(theme('B'));
    expect(h.current()?.themeName).toBe('B');
    expect(h.undo()?.themeName).toBe('A');
    expect(h.undo()).toBeNull();       // back to base
    expect(h.redo()?.themeName).toBe('A');
    expect(h.redo()?.themeName).toBe('B');
    expect(h.redo()).toBeNull();       // already newest
  });

  it('pushing after an undo truncates the redo tail', () => {
    const h = new ThemeHistoryService();
    h.push(theme('A'));
    h.push(theme('B'));
    h.undo();                          // current A
    h.push(theme('C'));                // drops B
    expect(h.getAll().map((e) => e.theme.themeName)).toEqual(['A', 'C']);
    expect(h.redo()).toBeNull();
  });

  it('restore by index and reset', () => {
    const h = new ThemeHistoryService();
    h.push(theme('A'));
    h.push(theme('B'));
    const firstIndex = h.getAll()[0].index;
    expect(h.restore(firstIndex)?.themeName).toBe('A');
    h.reset();
    expect(h.getAll()).toHaveLength(0);
    expect(h.current()).toBeNull();
  });

  it('respects the size limit', () => {
    const h = new ThemeHistoryService(3);
    for (const n of ['A', 'B', 'C', 'D']) h.push(theme(n));
    expect(h.getAll().map((e) => e.theme.themeName)).toEqual(['B', 'C', 'D']);
  });
});
