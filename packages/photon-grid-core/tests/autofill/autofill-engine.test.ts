import { describe, it, expect } from 'vitest';
import { AutoFillEngine, AutoFillDetectorName } from '../../src/autofill';

/**
 * Facade behavior: detector priority, forward/reverse ordering, degenerate
 * inputs, and configuration (enable/disable, detector subset, locale default).
 */
describe('AutoFillEngine — facade', () => {
  it('returns [] for a non-positive count or empty source', () => {
    const engine = new AutoFillEngine();
    expect(engine.generateSeries([1, 2, 3], 0)).toEqual([]);
    expect(engine.generateSeries([1, 2, 3], -2)).toEqual([]);
    expect(engine.generateSeries([], 3)).toEqual([]);
  });

  it('treats years-as-numbers with the numeric detector, not the date detector', () => {
    // 2024, 2025 are plain numbers (no Date/ISO), so this is an integer series.
    expect(new AutoFillEngine().generateSeries([2024, 2025], 1)).toEqual([2026]);
  });

  it('prefers the month detector over text/number for name tokens', () => {
    expect(new AutoFillEngine().generateSeries(['Jan', 'Feb'], 1)).toEqual(['Mar']);
  });

  it('falls back to copy/cycle when disabled', () => {
    const engine = new AutoFillEngine({ enabled: false });
    expect(engine.isEnabled()).toBe(false);
    expect(engine.generateSeries([1, 2, 3], 2)).toEqual([1, 2]); // copy, not 4,5
  });

  it('honors a restricted detector set (copy always remains)', () => {
    const engine = new AutoFillEngine({ detectors: [AutoFillDetectorName.Copy] });
    expect(engine.generateSeries([1, 2, 3], 2)).toEqual([1, 2]); // numeric disabled → copy
  });

  it('applies runtime configuration updates', () => {
    const engine = new AutoFillEngine();
    expect(engine.generateSeries([1, 2, 3], 1)).toEqual([4]);
    engine.configure({ enabled: false });
    expect(engine.generateSeries([1, 2, 3], 1)).toEqual([1]);
    engine.configure({ enabled: true });
    expect(engine.generateSeries([1, 2, 3], 1)).toEqual([4]);
  });

  it('orders reverse fills in grid order (furthest-from-source first)', () => {
    // Source 3,4,5 filled up by 2 → grid rows above read 1,2 (top-to-bottom).
    expect(new AutoFillEngine().generateSeries([3, 4, 5], 2, { reverse: true })).toEqual([1, 2]);
  });
});
