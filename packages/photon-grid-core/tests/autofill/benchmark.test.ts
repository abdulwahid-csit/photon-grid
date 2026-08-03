import { describe, it, expect } from 'vitest';
import { AutoFillEngine } from '../../src/autofill';

/**
 * Performance guard: detection is O(source) once and generation is O(1) per
 * value, so filling 100k rows must complete comfortably. This asserts both
 * correctness at scale and a generous wall-clock budget.
 */
describe('AutoFill — large datasets', () => {
  const engine = new AutoFillEngine();

  it('generates 100k numeric values quickly', () => {
    const start = performance.now();
    const out = engine.generateSeries([1, 2, 3], 100_000, { columnType: 'number' });
    const elapsed = performance.now() - start;

    expect(out.length).toBe(100_000);
    expect(out[0]).toBe(4);
    expect(out[99_999]).toBe(100_003);
    expect(elapsed).toBeLessThan(500);
  });

  it('generates 100k text-number values quickly', () => {
    const start = performance.now();
    const out = engine.generateSeries(['INV-0001', 'INV-0002'], 100_000);
    const elapsed = performance.now() - start;

    expect(out.length).toBe(100_000);
    expect(out[0]).toBe('INV-0003');
    expect(elapsed).toBeLessThan(500);
  });
});
