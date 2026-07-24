import { describe, it, expect } from 'vitest';
import {
  AutoFillDetectorRegistry,
  AutoFillDetectorName,
  createDefaultDetectors,
  type AutoFillPatternDetector,
  type AutoFillSeries,
} from '../../src/autofill';

const ctx = { locale: 'en-US' } as const;

describe('AutoFillDetectorRegistry', () => {
  it('resolves the first matching detector (numeric beats copy)', () => {
    const registry = new AutoFillDetectorRegistry();
    const series = registry.resolve([1, 2, 3], ctx);
    expect(series.valueAt(3)).toBe(4);
  });

  it('always resolves to a series, even when empty (copy fallback)', () => {
    const registry = new AutoFillDetectorRegistry([]);
    const series = registry.resolve(['x', 'y'], ctx);
    expect(series.valueAt(2)).toBe('x'); // cyclic copy
  });

  it('withEnabled retains the copy fallback regardless of the filter', () => {
    const registry = new AutoFillDetectorRegistry().withEnabled(new Set()); // nothing enabled
    const series = registry.resolve([1, 2, 3], ctx);
    expect(series.valueAt(3)).toBe(1); // numeric filtered out → copy cycles
  });

  it('accepts a custom detector without modifying existing code (open/closed)', () => {
    const constantX: AutoFillPatternDetector = {
      name: AutoFillDetectorName.Numeric,
      detect(): AutoFillSeries {
        return { valueAt: () => 'X' };
      },
    };
    const registry = new AutoFillDetectorRegistry([constantX, ...createDefaultDetectors()]);
    expect(registry.resolve([1, 2, 3], ctx).valueAt(3)).toBe('X');
  });
});
