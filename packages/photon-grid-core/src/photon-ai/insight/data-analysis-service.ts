import { NUMERIC_COLUMN_TYPES } from '../../types/column-type-traits';
/**
 * The **Data Analysis Service** â€” computes statistics over the grid's live rows
 * so Photon AI can answer analytical questions ("what sells best?", "why is
 * revenue falling?", "show unusual values") with real numbers.
 *
 * ### Privacy is the point
 * Every statistic here is computed **in the browser, from `GridApi`**. Only the
 * resulting compact summary â€” counts, sums, a handful of top categories â€” is
 * ever sent to the language model, which does nothing but phrase it. Raw
 * customer rows never leave the page.
 *
 * That choice also makes this work at scale: a million-row dataset costs one
 * linear local pass and a few hundred tokens, where shipping rows to a model
 * would cost far more than any context window allows and still yield wrong
 * totals from a sample.
 *
 * ### Scope
 * These are descriptive statistics, deliberately. Correlation is linear
 * (Pearson) and the trend is a least-squares slope over an ordered measure;
 * neither is a forecast. When a user asks Photon AI to "predict next month",
 * the honest answer is the observed trend plus its direction, and the prompt
 * instructs the model to present it that way rather than inventing a forecast.
 *
 * @packageDocumentation
 */

import type { GridApi } from '../../core/grid-api';
import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';

/** Column types treated as numeric measures. */
const NUMERIC_TYPES: ReadonlySet<string> = NUMERIC_COLUMN_TYPES;

/** How many entries a top-N breakdown returns. */
const TOP_N = 5;

/** Maximum distinct values for a column to count as a category rather than free text. */
const MAX_CATEGORY_CARDINALITY = 50;

/** Z-score beyond which a value is reported as an outlier. */
const OUTLIER_Z = 3;

/** Descriptive statistics for one numeric column. */
export interface NumericSummary {
  readonly colId: string;
  readonly header: string;
  readonly count: number;
  readonly sum: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly stdDev: number;
  /** Least-squares slope per row in the current order â€” positive means rising. */
  readonly trendPerRow: number;
  /** Values further than {@link OUTLIER_Z} standard deviations from the mean. */
  readonly outliers: readonly number[];
}

/** One category's share of a measure. */
export interface CategoryBreakdown {
  readonly value: string;
  readonly count: number;
  readonly total: number;
  readonly share: number;
}

/** A breakdown of one measure across one dimension. */
export interface DimensionSummary {
  readonly dimensionColId: string;
  readonly dimensionHeader: string;
  readonly measureColId: string;
  readonly measureHeader: string;
  readonly distinctCount: number;
  readonly top: readonly CategoryBreakdown[];
  readonly bottom: readonly CategoryBreakdown[];
}

/** A linear relationship between two numeric columns. */
export interface CorrelationPair {
  readonly aColId: string;
  readonly bColId: string;
  /** Pearson coefficient in [-1, 1]. */
  readonly r: number;
}

/** The complete local analysis handed to the model. */
export interface DatasetAnalysis {
  readonly totalRows: number;
  readonly visibleRows: number;
  readonly columnCount: number;
  readonly numeric: readonly NumericSummary[];
  readonly dimensions: readonly DimensionSummary[];
  readonly correlations: readonly CorrelationPair[];
  /** Columns where some rows have no value, as `colId` â†’ missing count. */
  readonly missing: Readonly<Record<string, number>>;
}

/** Computes descriptive statistics over the grid's currently visible rows. */
export class DataAnalysisService {
  constructor(private readonly api: GridApi) {}

  /**
   * Analyses the rows the user is currently looking at â€” i.e. after filters.
   * That is almost always what an analytical question means: "what sells best"
   * asked with a region filter applied is a question about that region.
   */
  analyze(): DatasetAnalysis {
    const rows = this.api.getVisibleRows().filter((r) => r.type === 'data');
    const columns = this.api.getAllColumns();

    const numericCols = columns.filter((c) => NUMERIC_TYPES.has(String(c.type)));
    const numeric = numericCols
      .map((col) => this.summarizeNumeric(col, rows))
      .filter((s): s is NumericSummary => s !== null);

    return {
      totalRows: this.api.getAllRows().filter((r) => r.type === 'data').length,
      visibleRows: rows.length,
      columnCount: columns.length,
      numeric,
      dimensions: this.buildDimensions(columns, numericCols, rows),
      correlations: this.buildCorrelations(numericCols, rows),
      missing: this.countMissing(columns, rows),
    };
  }

  /** Descriptive stats for one numeric column, or `null` when it has no usable values. */
  private summarizeNumeric(col: ColumnDef, rows: readonly RowNode[]): NumericSummary | null {
    const values: number[] = [];
    for (const row of rows) {
      const n = toNumber(row.data?.[col.field]);
      if (n !== null) values.push(n);
    }
    if (values.length === 0) return null;

    const count = values.length;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const mean = sum / count;

    let variance = 0;
    for (const v of values) variance += (v - mean) ** 2;
    const stdDev = Math.sqrt(variance / count);

    // Sorted copy for the median â€” the original order carries the trend.
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    const outliers = stdDev > 0
      ? values.filter((v) => Math.abs((v - mean) / stdDev) > OUTLIER_Z).slice(0, TOP_N)
      : [];

    return {
      colId: col.colId,
      header: col.header,
      count,
      sum,
      mean,
      min,
      max,
      median,
      stdDev,
      trendPerRow: leastSquaresSlope(values),
      outliers,
    };
  }

  /**
   * Breaks each numeric measure down by each low-cardinality dimension.
   *
   * This is what answers "best selling product" and "which customers spend the
   * most": the top entries of (product Ã— revenue) and (customer Ã— spend).
   * Capped so a wide grid cannot produce a combinatorial explosion of pairs.
   */
  private buildDimensions(
    columns: readonly ColumnDef[],
    numericCols: readonly ColumnDef[],
    rows: readonly RowNode[],
  ): DimensionSummary[] {
    const dimensions = columns.filter((c) => !NUMERIC_TYPES.has(String(c.type)) && c.type !== 'date');
    const summaries: DimensionSummary[] = [];

    for (const dim of dimensions.slice(0, 4)) {
      for (const measure of numericCols.slice(0, 3)) {
        const totals = new Map<string, { count: number; total: number }>();
        let grandTotal = 0;

        for (const row of rows) {
          const key = row.data?.[dim.field];
          if (key === null || key === undefined || key === '') continue;
          const label = String(key);
          const value = toNumber(row.data?.[measure.field]) ?? 0;

          const entry = totals.get(label) ?? { count: 0, total: 0 };
          entry.count++;
          entry.total += value;
          totals.set(label, entry);
          grandTotal += value;
        }

        // Too many distinct values means free text (names, ids, notes), where a
        // "top 5" is noise rather than insight.
        if (totals.size === 0 || totals.size > MAX_CATEGORY_CARDINALITY) continue;

        const ranked = Array.from(totals, ([value, e]) => ({
          value,
          count: e.count,
          total: e.total,
          share: grandTotal === 0 ? 0 : e.total / grandTotal,
        })).sort((a, b) => b.total - a.total);

        summaries.push({
          dimensionColId: dim.colId,
          dimensionHeader: dim.header,
          measureColId: measure.colId,
          measureHeader: measure.header,
          distinctCount: ranked.length,
          top: ranked.slice(0, TOP_N),
          bottom: ranked.slice(-TOP_N).reverse(),
        });
      }
    }

    return summaries;
  }

  /** Pearson correlation for every numeric pair, strongest first. */
  private buildCorrelations(
    numericCols: readonly ColumnDef[],
    rows: readonly RowNode[],
  ): CorrelationPair[] {
    const pairs: CorrelationPair[] = [];
    const cols = numericCols.slice(0, 6);

    for (let i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        const xs: number[] = [];
        const ys: number[] = [];
        for (const row of rows) {
          const x = toNumber(row.data?.[cols[i].field]);
          const y = toNumber(row.data?.[cols[j].field]);
          // Both must be present, or the pairing is meaningless.
          if (x !== null && y !== null) { xs.push(x); ys.push(y); }
        }
        const r = pearson(xs, ys);
        if (r !== null) pairs.push({ aColId: cols[i].colId, bColId: cols[j].colId, r });
      }
    }

    return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 5);
  }

  /** Counts empty values per column, omitting fully-populated ones. */
  private countMissing(
    columns: readonly ColumnDef[],
    rows: readonly RowNode[],
  ): Record<string, number> {
    const missing: Record<string, number> = {};
    for (const col of columns) {
      let count = 0;
      for (const row of rows) {
        const v = row.data?.[col.field];
        if (v === null || v === undefined || v === '') count++;
      }
      if (count > 0) missing[col.colId] = count;
    }
    return missing;
  }
}

/** Coerces a cell value to a finite number, or `null` when it isn't one. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    // Tolerate formatted values ("$1,234.50") â€” common in imported data.
    const cleaned = Number(value.replace(/[^0-9.eE+-]/g, ''));
    return Number.isFinite(cleaned) ? cleaned : null;
  }
  return null;
}

/**
 * Least-squares slope of `values` against their index.
 *
 * Interpreting this as a time trend assumes the current row order is
 * meaningful â€” true when the user has sorted by date, which is exactly when
 * they ask "why is revenue decreasing". The prompt tells the model to hedge
 * accordingly rather than assert causation.
 */
function leastSquaresSlope(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  let meanY = 0;
  for (const v of values) meanY += v;
  meanY /= n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    num += dx * (values[i] - meanY);
    den += dx * dx;
  }
  return den === 0 ? 0 : num / den;
}

/** Pearson correlation coefficient, or `null` when undefined (n < 2 or zero variance). */
function pearson(xs: readonly number[], ys: readonly number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;

  let meanX = 0;
  let meanY = 0;
  for (let i = 0; i < n; i++) { meanX += xs[i]; meanY += ys[i]; }
  meanX /= n;
  meanY /= n;

  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }

  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? null : num / den;
}
