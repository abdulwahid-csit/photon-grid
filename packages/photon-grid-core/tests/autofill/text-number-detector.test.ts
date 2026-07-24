import { describe, it, expect } from 'vitest';
import { AutoFillEngine } from '../../src/autofill';

/**
 * Text + number detection: prefix/suffix preservation, leading-zero width,
 * width widening, arbitrary steps, and single-cell +1 extrapolation.
 */
describe('AutoFill — text + number', () => {
  const engine = new AutoFillEngine();
  const fill = (source: string[], count: number): unknown[] => engine.generateSeries(source, count);

  it('increments preserving leading zeros', () => {
    expect(fill(['Item001', 'Item002'], 1)).toEqual(['Item003']);
  });

  it('preserves a prefix with a separator', () => {
    expect(fill(['INV-001', 'INV-002'], 2)).toEqual(['INV-003', 'INV-004']);
  });

  it('increments a spaced counter', () => {
    expect(fill(['Employee 10', 'Employee 11'], 1)).toEqual(['Employee 12']);
  });

  it('preserves a suffix (number in the middle)', () => {
    expect(fill(['A1B', 'A2B'], 1)).toEqual(['A3B']);
  });

  it('widens the width naturally (099 → 100)', () => {
    expect(fill(['098', '099'], 1)).toEqual(['100']);
  });

  it('extrapolates a single text-number by +1', () => {
    expect(fill(['SKU-007'], 2)).toEqual(['SKU-008', 'SKU-009']);
  });

  it('returns copy fallback when prefixes differ', () => {
    expect(fill(['A1', 'B2'], 2)).toEqual(['A1', 'B2']);
  });
});
