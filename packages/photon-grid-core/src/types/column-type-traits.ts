import type { ColumnDataType } from './column.types';

/**
 * Semantic groupings of {@link ColumnDataType}, in one place.
 *
 * These predicates were previously duplicated as four independent `Set`
 * literals — in `chart/chart-analyzer/types.ts`, `chart/range-chart-service.ts`,
 * `chart/range-chart-controller.ts` and
 * `photon-ai/insight/data-analysis-service.ts`. Adding a column type then meant
 * finding all four, and missing one produced a type that could be charted but
 * not analysed, or the reverse, with nothing to catch it. One export means one
 * edit.
 *
 * Typed as `ReadonlySet<ColumnDataType>` so a typo is a compile error, and read
 * through the helpers below so callers holding a `string` (the chart layer
 * mostly does) do not each write their own cast.
 *
 * @packageDocumentation
 */

/**
 * Types whose values are quantities — summable, averagable, chartable as a
 * measure, and sorted numerically.
 *
 * `duration` is here because it is stored as a number of seconds; that is what
 * makes "average handling time" a meaningful aggregate.
 */
export const NUMERIC_COLUMN_TYPES: ReadonlySet<ColumnDataType> = new Set<ColumnDataType>([
  'number',
  'currency',
  'percentage',
  'duration',
]);

/** Types that carry a point in time. */
export const DATE_COLUMN_TYPES: ReadonlySet<ColumnDataType> = new Set<ColumnDataType>([
  'date',
  'datetime',
  'time',
]);

/**
 * Types suitable as a chart's category axis or an analysis dimension — values
 * you group *by* rather than aggregate.
 *
 * `phone` and `url` are excluded on purpose: both are effectively unique per
 * row, so grouping by one produces a category per record and a useless chart.
 */
export const DIMENSION_COLUMN_TYPES: ReadonlySet<ColumnDataType> = new Set<ColumnDataType>([
  'string',
  'dropdown',
  'object',
  'boolean',
  'email',
  'date',
  'datetime',
]);

/** {@link NUMERIC_COLUMN_TYPES} membership for a loosely-typed column type. */
export function isNumericColumnType(type: string | undefined): boolean {
  return NUMERIC_COLUMN_TYPES.has(type as ColumnDataType);
}

/** {@link DATE_COLUMN_TYPES} membership for a loosely-typed column type. */
export function isDateColumnType(type: string | undefined): boolean {
  return DATE_COLUMN_TYPES.has(type as ColumnDataType);
}

/** {@link DIMENSION_COLUMN_TYPES} membership for a loosely-typed column type. */
export function isDimensionColumnType(type: string | undefined): boolean {
  return DIMENSION_COLUMN_TYPES.has(type as ColumnDataType);
}
