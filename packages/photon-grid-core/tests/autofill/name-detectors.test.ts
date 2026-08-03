import { describe, it, expect } from 'vitest';
import { AutoFillEngine } from '../../src/autofill';

/**
 * Month and weekday name detection: full/abbreviated variants, casing
 * preservation, cyclic wraparound, locale awareness (via `Intl`), and
 * single-name extrapolation.
 */
describe('AutoFill — month names', () => {
  const engine = new AutoFillEngine();

  it('continues full month names', () => {
    expect(engine.generateSeries(['January', 'February'], 2)).toEqual(['March', 'April']);
  });

  it('continues abbreviated month names', () => {
    expect(engine.generateSeries(['Jan', 'Feb'], 1)).toEqual(['Mar']);
  });

  it('wraps December → January', () => {
    expect(engine.generateSeries(['Nov', 'Dec'], 2)).toEqual(['Jan', 'Feb']);
  });

  it('preserves upper casing', () => {
    expect(engine.generateSeries(['JAN', 'FEB'], 1)).toEqual(['MAR']);
  });

  it('extrapolates a single month name by one', () => {
    expect(engine.generateSeries(['March'], 1)).toEqual(['April']);
  });

  it('is locale-aware (fr-FR)', () => {
    expect(engine.generateSeries(['janvier', 'février'], 1, { locale: 'fr-FR' })).toEqual(['mars']);
  });

  it('extrapolates backward (reverse)', () => {
    expect(engine.generateSeries(['March', 'April'], 2, { reverse: true })).toEqual(['January', 'February']);
  });
});

describe('AutoFill — weekday names', () => {
  const engine = new AutoFillEngine();

  it('continues full weekday names', () => {
    expect(engine.generateSeries(['Monday', 'Tuesday'], 1)).toEqual(['Wednesday']);
  });

  it('continues abbreviated weekday names', () => {
    expect(engine.generateSeries(['Mon', 'Tue'], 1)).toEqual(['Wed']);
  });

  it('wraps Saturday → Sunday → Monday', () => {
    expect(engine.generateSeries(['Saturday', 'Sunday'], 1)).toEqual(['Monday']);
  });
});
