import { describe, it, expect } from 'vitest';
import { AutoFillEngine } from '../../src/autofill';

/**
 * Date-sequence detection: constant day / week / month / year steps, preserving
 * the source representation (native `Date` vs ISO string), with calendar-aware
 * month/year arithmetic.
 */
describe('AutoFill — date sequences', () => {
  const engine = new AutoFillEngine();
  const d = (y: number, m: number, day: number): Date => new Date(y, m, day);
  const ymd = (v: unknown): string => {
    const dt = v as Date;
    return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
  };

  it('continues a daily series (Date objects)', () => {
    const out = engine.generateSeries([d(2024, 0, 1), d(2024, 0, 2)], 2, { columnType: 'date' });
    expect(out.map(ymd)).toEqual(['2024-1-3', '2024-1-4']);
  });

  it('continues a weekly (7-day) series', () => {
    const out = engine.generateSeries([d(2024, 0, 1), d(2024, 0, 8)], 2, { columnType: 'date' });
    expect(out.map(ymd)).toEqual(['2024-1-15', '2024-1-22']);
  });

  it('continues a monthly series with a stable day-of-month', () => {
    const out = engine.generateSeries([d(2024, 0, 15), d(2024, 1, 15)], 2, { columnType: 'date' });
    expect(out.map(ymd)).toEqual(['2024-3-15', '2024-4-15']);
  });

  it('continues a yearly series', () => {
    const out = engine.generateSeries([d(2022, 5, 1), d(2023, 5, 1)], 2, { columnType: 'date' });
    expect(out.map(ymd)).toEqual(['2024-6-1', '2025-6-1']);
  });

  it('preserves ISO string representation', () => {
    expect(engine.generateSeries(['2024-01-01', '2024-01-02'], 1)).toEqual(['2024-01-03']);
  });

  it('extrapolates backward (reverse fill)', () => {
    const out = engine.generateSeries([d(2024, 0, 10), d(2024, 0, 11)], 2, { columnType: 'date', reverse: true });
    expect(out.map(ymd)).toEqual(['2024-1-8', '2024-1-9']);
  });

  it('copies a single date rather than guessing a cadence', () => {
    const out = engine.generateSeries([d(2024, 0, 1)], 2, { columnType: 'date' });
    expect(out.map(ymd)).toEqual(['2024-1-1', '2024-1-1']);
  });
});
