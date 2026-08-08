/**
 * Aggregation service for the Summary Row feature.
 *
 * A stateless registry of named reducers over a flat array of cell values, plus
 * the seven built-ins from {@link SummaryAggregation}. Hosts extend it with
 * their own functions through {@link SummaryConfig.aggregations} or by passing a
 * {@link SummaryAggregateFn} inline on a cell.
 *
 * ### Relationship to `AggregationEngine`
 * Not to be confused with {@link import('../engines/aggregation/aggregation-engine').AggregationEngine},
 * which aggregates a **group tree** bottom-up: that one merges per-node
 * accumulators so a parent group never re-scans its descendants' leaf rows, and
 * its contract is tied to `GroupTree`. This one reduces a **flat, already
 * resolved** value array for one column within one scope, which is the shape a
 * summary row needs. The two solve different problems over different data
 * structures and deliberately share no code path.
 *
 * ### Performance
 * Every built-in is a single pass with no intermediate allocation — no
 * `filter().map()` chains and no `Math.min(...values)` spread (which throws
 * `RangeError` on large arrays once the argument count exceeds the engine's
 * stack limit, at roughly 100k values). Value arrays themselves are built once
 * per `(scope, column)` pair and shared across summary rows by
 * {@link import('./summary-service').SummaryService}, so N summary rows over the
 * same column cost one scan, not N.
 *
 * @packageDocumentation
 */

import {
  SummaryAggregation,
  type SummaryAggregateFn,
  type SummaryCellContext,
} from './summary.types';
import type { ColumnDef } from '../types/column.types';

// ─── Value coercion ──────────────────────────────────────────────────────────

/**
 * Coerces a cell value to a finite number, or returns `null` when it does not
 * represent one.
 *
 * Deliberately stricter than `Number(...)`:
 * - `null` / `undefined` / `''` / whitespace are **not** `0`; they are skipped,
 *   so an empty column averages to `null` rather than to zero.
 * - Booleans are skipped — `true` is not `1` in a numeric total, and silently
 *   treating it as one produces a plausible but wrong sum.
 * - `Date` resolves to its epoch milliseconds, so `min`/`max` work on date
 *   columns and yield a value the column's own formatter can render.
 */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === 'string') {
    // Guard the empty/whitespace case before Number(), which maps both to 0.
    if (value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** `true` when a value counts as "present" for {@link SummaryAggregation.Count}. */
function isPresent(value: unknown): boolean {
  return value != null && value !== '';
}

/** Column types whose values order chronologically rather than numerically. */
function isTemporalColumn(colDef: ColumnDef | null): boolean {
  const type = colDef?.type;
  return type === 'date' || type === 'datetime' || type === 'time';
}

/**
 * Coerces a value to a number that can be *ordered*, which is not the same as a
 * number that can be *summed*.
 *
 * On a `date` / `datetime` / `time` column, values are most often ISO strings —
 * and `Number('2024-05-01')` is `NaN`, so a plain numeric coercion silently
 * skips every one of them and `min`/`max` return `null` over a perfectly good
 * date column. Parsing as a date there yields epoch milliseconds, which the
 * column's own formatter renders back as a date (`formatValue` does
 * `new Date(value)` for these types).
 *
 * Gated on the column's declared type rather than sniffed from the value:
 * `Date.parse` is lenient enough to turn things like `'12'` into a date, so
 * applying it to a numeric column would corrupt ordinary numbers.
 */
function toComparableNumber(value: unknown, temporal: boolean): number | null {
  if (!temporal) return toFiniteNumber(value);

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  // An epoch number on a date column is already comparable.
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// ─── Built-ins ───────────────────────────────────────────────────────────────

const sum: SummaryAggregateFn = ({ values }) => {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    const n = toFiniteNumber(values[i]);
    if (n !== null) total += n;
  }
  return total;
};

const avg: SummaryAggregateFn = ({ values }) => {
  let total = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    const n = toFiniteNumber(values[i]);
    if (n !== null) {
      total += n;
      count++;
    }
  }
  return count === 0 ? null : total / count;
};

const min: SummaryAggregateFn = ({ values, colDef }) => {
  // Hoisted out of the loop: the column cannot change mid-scan.
  const temporal = isTemporalColumn(colDef);
  let result: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const n = toComparableNumber(values[i], temporal);
    if (n !== null && (result === null || n < result)) result = n;
  }
  return result;
};

const max: SummaryAggregateFn = ({ values, colDef }) => {
  const temporal = isTemporalColumn(colDef);
  let result: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const n = toComparableNumber(values[i], temporal);
    if (n !== null && (result === null || n > result)) result = n;
  }
  return result;
};

const count: SummaryAggregateFn = ({ values }) => {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    if (isPresent(values[i])) total++;
  }
  return total;
};

const first: SummaryAggregateFn = ({ values }) => {
  for (let i = 0; i < values.length; i++) {
    if (isPresent(values[i])) return values[i];
  }
  return null;
};

const last: SummaryAggregateFn = ({ values }) => {
  for (let i = values.length - 1; i >= 0; i--) {
    if (isPresent(values[i])) return values[i];
  }
  return null;
};

/**
 * The built-in reducers, keyed by {@link SummaryAggregation} value.
 *
 * Module-level and shared by every grid on the page — they close over nothing,
 * so one instance each is all that is ever needed.
 */
const BUILT_IN_AGGREGATIONS: ReadonlyMap<string, SummaryAggregateFn> = new Map([
  [SummaryAggregation.Sum, sum],
  [SummaryAggregation.Avg, avg],
  [SummaryAggregation.Min, min],
  [SummaryAggregation.Max, max],
  [SummaryAggregation.Count, count],
  [SummaryAggregation.First, first],
  [SummaryAggregation.Last, last],
]);

// ─── Engine ──────────────────────────────────────────────────────────────────

/**
 * Resolves and applies summary aggregations.
 *
 * One instance per grid, so a custom aggregation registered on one grid never
 * leaks into another.
 *
 * @example
 * ```ts
 * const engine = new SummaryAggregationEngine();
 * engine.register('median', ({ values }) => median(values));
 *
 * engine.aggregate('median', context);            // custom, by name
 * engine.aggregate(SummaryAggregation.Sum, ctx);  // built-in
 * engine.aggregate(({ rows }) => rows.length, ctx); // inline
 * ```
 */
export class SummaryAggregationEngine {
  /**
   * Host-registered functions. Consulted **before** the built-ins, so a host may
   * redefine `sum` for a grid whose "sum" means something domain-specific
   * without having to rename every cell that references it.
   */
  private readonly custom = new Map<string, SummaryAggregateFn>();

  /**
   * Registers (or replaces) a named aggregation.
   *
   * @param name - Name referenced from `aggregate` / `defaultAggregate`.
   * @param fn   - The reducer. Must be pure.
   */
  register(name: string, fn: SummaryAggregateFn): void {
    this.custom.set(name, fn);
  }

  /**
   * Registers every entry of a name → function record.
   *
   * @param aggregations - Functions to register; `undefined` is a no-op.
   */
  registerAll(aggregations: Readonly<Record<string, SummaryAggregateFn>> | undefined): void {
    if (!aggregations) return;
    for (const name of Object.keys(aggregations)) {
      this.custom.set(name, aggregations[name]);
    }
  }

  /**
   * Removes a host-registered aggregation. Built-ins cannot be removed; doing
   * this to a name that shadowed one restores the built-in.
   *
   * @param name - Name to unregister.
   * @returns `true` when a custom function was removed.
   */
  unregister(name: string): boolean {
    return this.custom.delete(name);
  }

  /**
   * @param name - Aggregation name to test.
   * @returns `true` when the name resolves to a custom or built-in function.
   */
  has(name: string): boolean {
    return this.custom.has(name) || BUILT_IN_AGGREGATIONS.has(name);
  }

  /** @returns Every resolvable aggregation name, custom first. */
  getRegisteredNames(): string[] {
    const names = new Set<string>(this.custom.keys());
    for (const name of BUILT_IN_AGGREGATIONS.keys()) names.add(name);
    return [...names];
  }

  /**
   * Resolves an aggregation specification to a callable.
   *
   * @param spec - A function (returned as-is), or a name to look up.
   * @returns The reducer, or `null` when a name resolves to nothing.
   */
  resolve(
    spec: SummaryAggregation | string | SummaryAggregateFn | undefined,
  ): SummaryAggregateFn | null {
    if (spec == null) return null;
    if (typeof spec === 'function') return spec;
    return this.custom.get(spec) ?? BUILT_IN_AGGREGATIONS.get(spec) ?? null;
  }

  /**
   * Resolves and applies an aggregation in one step.
   *
   * @param spec    - Aggregation function, or the name of one.
   * @param context - The cell context supplying `values` / `rows`.
   * @returns The aggregate, or `null` when `spec` resolves to nothing.
   */
  aggregate(
    spec: SummaryAggregation | string | SummaryAggregateFn | undefined,
    context: SummaryCellContext,
  ): unknown {
    const fn = this.resolve(spec);
    return fn === null ? null : fn(context);
  }
}
