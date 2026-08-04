import { describe, it, expect } from 'vitest';
import {
  SummaryAggregation,
  SummaryAggregationEngine,
  SummaryScope,
  type SummaryCellContext,
} from '../../src/summary';
import type { ColumnDef } from '../../src/types/column.types';

/** Minimal context: only `values` and `rows` matter to the built-ins. */
function ctx(values: readonly unknown[]): SummaryCellContext {
  return {
    rowId: 'r',
    colId: 'c',
    colDef: null,
    rows: [],
    values,
    scope: SummaryScope.All,
    api: null,
  };
}

describe('SummaryAggregationEngine — built-ins', () => {
  const engine = new SummaryAggregationEngine();
  const agg = (name: SummaryAggregation, values: readonly unknown[]): unknown =>
    engine.aggregate(name, ctx(values));

  it('sums finite numbers and numeric strings', () => {
    expect(agg(SummaryAggregation.Sum, [1, 2, 3])).toBe(6);
    expect(agg(SummaryAggregation.Sum, ['1.5', 2])).toBe(3.5);
  });

  it('averages only the values that are actually numeric', () => {
    // 3 of 5 entries are numeric → (10+20+30)/3, not /5.
    expect(agg(SummaryAggregation.Avg, [10, null, 20, '', 30])).toBe(20);
  });

  it('returns null (not 0 or NaN) for avg/min/max over an empty scope', () => {
    expect(agg(SummaryAggregation.Avg, [])).toBeNull();
    expect(agg(SummaryAggregation.Min, [])).toBeNull();
    expect(agg(SummaryAggregation.Max, [])).toBeNull();
  });

  it('sums an empty scope to 0', () => {
    expect(agg(SummaryAggregation.Sum, [])).toBe(0);
  });

  it('finds min/max ignoring non-numeric entries', () => {
    expect(agg(SummaryAggregation.Min, [5, 'x', -2, null])).toBe(-2);
    expect(agg(SummaryAggregation.Max, [5, 'x', -2, null])).toBe(5);
  });

  it('handles negative-only ranges (a zero-seeded accumulator would report 0)', () => {
    expect(agg(SummaryAggregation.Max, [-5, -2, -9])).toBe(-2);
    expect(agg(SummaryAggregation.Min, [-5, -2, -9])).toBe(-9);
  });

  it('counts present values, treating null/undefined/empty-string as absent', () => {
    expect(agg(SummaryAggregation.Count, [1, null, 'a', undefined, '', 0])).toBe(3);
  });

  it('takes first/last present values, skipping leading and trailing gaps', () => {
    expect(agg(SummaryAggregation.First, [null, '', 'a', 'b'])).toBe('a');
    expect(agg(SummaryAggregation.Last, ['a', 'b', null, ''])).toBe('b');
    expect(agg(SummaryAggregation.First, [])).toBeNull();
    expect(agg(SummaryAggregation.Last, [null])).toBeNull();
  });

  it('does not coerce booleans into numbers', () => {
    // `Number(true)` is 1, which would silently make a boolean column sum to a
    // count. Skipping them means an all-boolean column sums to 0, not 3.
    expect(agg(SummaryAggregation.Sum, [true, true, true])).toBe(0);
  });

  it('does not treat empty or whitespace strings as zero', () => {
    // `Number('')` and `Number('  ')` are both 0; counting them would drag an
    // average toward zero for every blank cell.
    expect(agg(SummaryAggregation.Avg, ['', '   ', 10])).toBe(10);
  });

  it('skips NaN and Infinity', () => {
    expect(agg(SummaryAggregation.Sum, [1, NaN, Infinity, -Infinity, 2])).toBe(3);
  });

  it('reduces Dates to epoch milliseconds so min/max work on date columns', () => {
    const early = new Date('2020-01-01T00:00:00Z');
    const late = new Date('2024-06-01T00:00:00Z');
    expect(agg(SummaryAggregation.Min, [late, early])).toBe(early.getTime());
    expect(agg(SummaryAggregation.Max, [late, early])).toBe(late.getTime());
  });

  it('orders ISO date strings chronologically on a date-typed column', () => {
    // `Number('2024-05-01')` is NaN, so a purely numeric coercion would skip
    // every value here and return null. The column's declared type is what
    // opts these into date parsing.
    const dateCol = { colId: 'closed', field: 'closed', header: 'Closed', type: 'date' } as ColumnDef;
    const values = ['2024-05-01', '2022-11-30', '2025-01-15'];
    const context = { ...ctx(values), colDef: dateCol };

    expect(engine.aggregate(SummaryAggregation.Min, context)).toBe(Date.parse('2022-11-30'));
    expect(engine.aggregate(SummaryAggregation.Max, context)).toBe(Date.parse('2025-01-15'));
  });

  it('applies the same date ordering to datetime and time columns', () => {
    for (const type of ['datetime', 'time'] as const) {
      const column = { colId: 'at', field: 'at', header: 'At', type } as ColumnDef;
      const context = {
        ...ctx(['2024-05-01T10:00:00Z', '2024-05-01T08:00:00Z']),
        colDef: column,
      };
      expect(engine.aggregate(SummaryAggregation.Max, context)).toBe(
        Date.parse('2024-05-01T10:00:00Z'),
      );
    }
  });

  it('does not date-parse values on a non-temporal column', () => {
    // `Date.parse('12')` is a valid date in most engines. Gating on the column
    // type is what stops an ordinary numeric column being reinterpreted.
    const numberCol = { colId: 'n', field: 'n', header: 'N', type: 'number' } as ColumnDef;
    const context = { ...ctx(['12', '3']), colDef: numberCol };
    expect(engine.aggregate(SummaryAggregation.Max, context)).toBe(12);
    expect(engine.aggregate(SummaryAggregation.Min, context)).toBe(3);
  });

  it('skips unparseable values on a date column rather than returning NaN', () => {
    const dateCol = { colId: 'd', field: 'd', header: 'D', type: 'date' } as ColumnDef;
    const context = { ...ctx(['not a date', null, '', '2024-03-03']), colDef: dateCol };
    expect(engine.aggregate(SummaryAggregation.Max, context)).toBe(Date.parse('2024-03-03'));
    expect(engine.aggregate(SummaryAggregation.Min, { ...ctx(['nope']), colDef: dateCol })).toBeNull();
  });

  it('handles arrays far larger than the argument-spread limit', () => {
    // `Math.min(...values)` throws RangeError past ~100k arguments; the engine
    // loops instead, so this must simply work.
    const values = new Array<number>(500_000);
    for (let i = 0; i < values.length; i++) values[i] = i;
    expect(agg(SummaryAggregation.Max, values)).toBe(499_999);
    expect(agg(SummaryAggregation.Min, values)).toBe(0);
  });
});

describe('SummaryAggregationEngine — registry', () => {
  it('resolves a custom function by name', () => {
    const engine = new SummaryAggregationEngine();
    engine.register('median', ({ values }) => {
      const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
      const mid = nums.length >> 1;
      return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    });
    expect(engine.aggregate('median', ctx([1, 3, 100]))).toBe(3);
  });

  it('accepts an inline function without registering it', () => {
    const engine = new SummaryAggregationEngine();
    expect(engine.aggregate(({ values }) => values.length, ctx([1, 2]))).toBe(2);
  });

  it('lets a custom name shadow a built-in, and unregistering restores it', () => {
    const engine = new SummaryAggregationEngine();
    engine.register(SummaryAggregation.Sum, () => 'shadowed');
    expect(engine.aggregate(SummaryAggregation.Sum, ctx([1, 2]))).toBe('shadowed');

    expect(engine.unregister(SummaryAggregation.Sum)).toBe(true);
    expect(engine.aggregate(SummaryAggregation.Sum, ctx([1, 2]))).toBe(3);
  });

  it('registerAll tolerates undefined and registers every entry', () => {
    const engine = new SummaryAggregationEngine();
    engine.registerAll(undefined);
    engine.registerAll({ two: () => 2, three: () => 3 });
    expect(engine.aggregate('two', ctx([]))).toBe(2);
    expect(engine.aggregate('three', ctx([]))).toBe(3);
  });

  it('returns null for an unknown name rather than throwing', () => {
    const engine = new SummaryAggregationEngine();
    expect(engine.resolve('nope')).toBeNull();
    expect(engine.aggregate('nope', ctx([1]))).toBeNull();
    expect(engine.has('nope')).toBe(false);
  });

  it('reports every built-in as registered', () => {
    const engine = new SummaryAggregationEngine();
    for (const name of Object.values(SummaryAggregation)) {
      expect(engine.has(name)).toBe(true);
    }
    expect(engine.getRegisteredNames()).toContain(SummaryAggregation.Count);
  });

  it('keeps custom functions per-instance (no cross-grid leakage)', () => {
    const a = new SummaryAggregationEngine();
    const b = new SummaryAggregationEngine();
    a.register('only-on-a', () => 1);
    expect(a.has('only-on-a')).toBe(true);
    expect(b.has('only-on-a')).toBe(false);
  });
});
