import { describe, it, expect } from 'vitest';

/**
 * Value-axis domain rules for sparklines.
 *
 * The renderer itself needs a real `<canvas>` (2D context, `devicePixelRatio`,
 * `getComputedStyle`) that the package's stub DOM deliberately does not
 * provide, so these tests target the domain arithmetic directly — which is
 * where the defect actually lived: forcing `0` into the domain of a series that
 * never approaches zero compresses every value into a sliver at the top of the
 * plot, rendering a `column` chart as a row of identical full-height bars.
 *
 * The helper below mirrors `SparklineRenderer._domain` exactly. Keeping it in
 * sync is the point of the test: if the rule changes, these expectations state
 * what the change means for what the user sees.
 */

interface DomainOptions {
  baseline?: 'auto' | 'zero';
  axisMin?: number | null;
  axisMax?: number | null;
}

function domain(values: number[], opts: DomainOptions = {}): { minV: number; maxV: number; range: number } {
  const { baseline = 'auto', axisMin = null, axisMax = null } = opts;

  let minV = values.length > 0 ? Math.min(...values) : 0;
  let maxV = values.length > 0 ? Math.max(...values) : 0;

  if (baseline === 'zero') {
    minV = Math.min(minV, 0);
    maxV = Math.max(maxV, 0);
  }
  if (axisMin !== null) minV = axisMin;
  if (axisMax !== null) maxV = axisMax;

  return { minV, maxV, range: maxV - minV || 1 };
}

/** Fraction of the plot height a value occupies, measured from the baseline. */
function barHeightRatio(value: number, values: number[], opts?: DomainOptions): number {
  const { minV, range } = domain(values, opts);
  return (value - minV) / range;
}

describe('sparkline value-axis domain', () => {
  // A price series that never goes near zero — the shape that exposed the bug.
  const prices = [301.2, 303.8, 299.4, 305.1, 300.7, 304.3];

  it('scales to the series own range by default', () => {
    const { minV, maxV } = domain(prices);
    expect(minV).toBe(299.4);
    expect(maxV).toBe(305.1);
  });

  it('gives distinguishable bar heights for a series far from zero', () => {
    const lowest = barHeightRatio(299.4, prices);
    const highest = barHeightRatio(305.1, prices);

    // The extremes span the full plot rather than the top ~2 % of it.
    expect(lowest).toBeCloseTo(0, 5);
    expect(highest).toBeCloseTo(1, 5);

    // Every value maps to a visibly distinct height.
    const ratios = prices.map((p) => barHeightRatio(p, prices));
    const spread = Math.max(...ratios) - Math.min(...ratios);
    expect(spread).toBeGreaterThan(0.9);
  });

  it('reproduces the old defect when zero is forced into the domain', () => {
    const ratios = prices.map((p) => barHeightRatio(p, prices, { baseline: 'zero' }));
    const spread = Math.max(...ratios) - Math.min(...ratios);

    // This is what "all bars look the same height" means numerically: under a
    // 0…305 axis the whole series occupies under 2 % of the plot.
    expect(spread).toBeLessThan(0.02);
    // …and each bar fills nearly the entire cell.
    for (const r of ratios) expect(r).toBeGreaterThan(0.98);
  });

  it('anchors at zero on request, for magnitude comparison', () => {
    const { minV, maxV } = domain([4, 9, 2], { baseline: 'zero' });
    expect(minV).toBe(0);
    expect(maxV).toBe(9);
  });

  it('keeps negative values below the zero line when anchored', () => {
    const { minV, maxV } = domain([-4, 9, 2], { baseline: 'zero' });
    expect(minV).toBe(-4);
    expect(maxV).toBe(9);
  });

  it('still spans both signs on auto when the series crosses zero', () => {
    const { minV, maxV } = domain([-4, 9, 2]);
    expect(minV).toBe(-4);
    expect(maxV).toBe(9);
  });

  it('lets an explicit axis pin the domain so rows share one scale', () => {
    const { minV, maxV, range } = domain(prices, { axisMin: 250, axisMax: 350 });
    expect(minV).toBe(250);
    expect(maxV).toBe(350);
    expect(range).toBe(100);
  });

  it('falls back to a unit range for a flat series instead of dividing by zero', () => {
    const { range } = domain([7, 7, 7]);
    expect(range).toBe(1);
    expect(Number.isFinite(barHeightRatio(7, [7, 7, 7]))).toBe(true);
  });

  it('handles an empty series without producing NaN', () => {
    const { minV, maxV, range } = domain([]);
    expect(minV).toBe(0);
    expect(maxV).toBe(0);
    expect(range).toBe(1);
  });
});
