import { describe, it, expect } from 'vitest';
import { AutoFillEngine } from '../../src/autofill';

/**
 * Numeric arithmetic-progression detection, driven through the engine facade
 * (its real public contract). Covers positive/negative/decimal/large/constant
 * steps, single-cell copy fallback, and reverse extrapolation.
 */
describe('AutoFill — numeric sequences', () => {
  const engine = new AutoFillEngine();
  const fill = (source: number[], count: number, reverse = false): unknown[] =>
    engine.generateSeries(source, count, { columnType: 'number', reverse });

  it('continues a simple +1 run', () => {
    expect(fill([1, 2, 3], 4)).toEqual([4, 5, 6, 7]);
  });

  it('detects an arbitrary step', () => {
    expect(fill([2, 4, 6], 3)).toEqual([8, 10, 12]);
    expect(fill([10, 20, 30], 2)).toEqual([40, 50]);
  });

  it('handles negative / descending steps', () => {
    expect(fill([100, 90, 80], 2)).toEqual([70, 60]);
    expect(fill([10, 8], 2)).toEqual([6, 4]);
  });

  it('handles decimals without floating-point drift', () => {
    expect(fill([0.1, 0.2, 0.3], 3)).toEqual([0.4, 0.5, 0.6]);
  });

  it('handles large numbers', () => {
    expect(fill([1_000_000, 2_000_000], 2)).toEqual([3_000_000, 4_000_000]);
  });

  it('treats a constant run as a repeated value', () => {
    expect(fill([5, 5, 5], 3)).toEqual([5, 5, 5]);
  });

  it('parses canonical numeric strings', () => {
    expect(engine.generateSeries(['1', '2', '3'], 2)).toEqual([4, 5]);
  });

  it('copies a single numeric cell (no guessed step)', () => {
    expect(fill([7], 3)).toEqual([7, 7, 7]);
  });

  it('extrapolates backward for a reverse (upward) fill', () => {
    // 5,6,7 dragged up → 4,3,2 (grid order, top-to-bottom: 2,3,4)
    expect(fill([5, 6, 7], 3, true)).toEqual([2, 3, 4]);
  });
});
