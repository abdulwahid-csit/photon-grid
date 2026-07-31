/**
 * @module SparklineTypes
 *
 * Public type definitions for the PhotonGrid sparkline column type.
 * Import these types when configuring sparkline columns in {@link ColumnDef}.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Chart type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Visual style used when rendering a sparkline cell.
 *
 * | Value         | Description                                           |
 * |---------------|-------------------------------------------------------|
 * | `line`        | Continuous polyline connecting every data point        |
 * | `area`        | Filled area beneath a line (same shape as `line`)      |
 * | `bar`         | Horizontal bars — value determines bar width           |
 * | `column`      | Vertical bars — value determines bar height            |
 * | `win-loss`    | Binary indicator: full-height positive / negative bar  |
 * | `candlestick` | OHLC candlestick bodies with wick lines                |
 * | `ohlc`        | High-low wick with open / close tick marks             |
 *
 * @example
 * ```ts
 * const sparkline: SparklineConfig = { type: 'area', stroke: '#2563eb' };
 * ```
 */
export type SparklineType =
  | 'line'
  | 'area'
  | 'bar'
  | 'column'
  | 'win-loss'
  | 'candlestick'
  | 'ohlc';

/**
 * Where a sparkline's value axis starts.
 *
 * `'auto'` scales to the series' own range (shape-first — the sparkline
 * convention); `'zero'` anchors the axis at zero so magnitudes are comparable.
 *
 * @see {@link SparklineConfig.baseline}
 */
export type SparklineBaseline = 'auto' | 'zero';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration object placed on a `ColumnDef` whose `type` is `'sparkline'`.
 *
 * Every property is optional; sensible, theme-aware defaults are applied when
 * a property is omitted.
 *
 * @example Flat number array — line sparkline
 * ```ts
 * { field: 'history', type: 'sparkline', sparkline: { type: 'line', lineWidth: 2 } }
 * ```
 *
 * @example Object array — column sparkline with tooltip labels
 * ```ts
 * {
 *   field: 'sales',
 *   type: 'sparkline',
 *   sparkline: {
 *     type: 'column',
 *     xKey: 'month',
 *     yKey: 'revenue',
 *     positiveColor: '#22c55e',
 *     negativeColor: '#ef4444',
 *   },
 * }
 * ```
 *
 * @example Candlestick with custom OHLC keys
 * ```ts
 * {
 *   field: 'candles',
 *   type: 'sparkline',
 *   sparkline: {
 *     type: 'candlestick',
 *     openKey: 'o', highKey: 'h', lowKey: 'l', closeKey: 'c',
 *     bullColor: '#22c55e', bearColor: '#ef4444',
 *   },
 * }
 * ```
 */
export interface SparklineConfig {
  /**
   * Visual style of the mini chart.
   * @default 'line'
   */
  type?: SparklineType;

  /**
   * Where the value axis starts.
   *
   * - `'auto'` — the axis spans the series' own min…max, so the chart shows the
   *   **shape** of the data. This is what makes a sparkline readable for series
   *   that never approach zero: a price moving between 300 and 305 fills the
   *   cell with its variation instead of collapsing into a flat line (or, for
   *   `column`, a row of identical full-height bars).
   * - `'zero'` — zero is forced into the domain, so bar heights are
   *   proportional to absolute magnitude and comparable across cells. Choose
   *   this when the reader is meant to compare quantities rather than trends.
   *
   * Ignored when {@link axisMin} / {@link axisMax} pin the domain explicitly,
   * and for `win-loss`, whose baseline is always the centre line.
   *
   * @default 'auto'
   */
  baseline?: SparklineBaseline;

  /**
   * Pins the bottom of the value axis, overriding {@link baseline}.
   *
   * Use to give every row in a column the same scale so cells are directly
   * comparable — with `'auto'`, each cell scales to its own series.
   */
  axisMin?: number;

  /** Pins the top of the value axis, overriding {@link baseline}. */
  axisMax?: number;

  /**
   * Stroke colour for line, area, and OHLC sparklines.
   * Accepts any valid CSS colour string.
   * Falls back to the grid's `--pg-primary` theme variable when omitted.
   */
  stroke?: string;

  /**
   * Fill colour for `area` sparklines.
   * When omitted, a 20 % opacity tint of `stroke` is derived automatically.
   */
  fill?: string;

  /**
   * Stroke width in logical pixels for `line`, `area`, and `ohlc` charts.
   * @default 1.5
   */
  lineWidth?: number;

  /**
   * Render a circular marker at each data point on `line` and `area` charts.
   * @default false
   */
  showMarkers?: boolean;

  /**
   * Radius of each data-point marker in logical pixels.
   * Only relevant when `showMarkers` is `true`.
   * @default 2.5
   */
  markerSize?: number;

  /**
   * Fill colour of markers.
   * Defaults to `stroke` when omitted.
   */
  markerFill?: string;

  /**
   * Uniform inner padding on all four edges in logical pixels.
   * Prevents chart elements from touching the cell boundary.
   * @default 3
   */
  padding?: number;

  /**
   * Gap between adjacent bars or columns as a fraction of the band width.
   * Valid range: `0` (no gap) to `1` (invisible bars).
   * @default 0.15
   */
  barSpacing?: number;

  /**
   * Fill colour for bars / columns with a positive value and for
   * win-loss "win" bars.
   * Falls back to `stroke` when omitted.
   */
  positiveColor?: string;

  /**
   * Fill colour for bars / columns with a negative value and for
   * win-loss "loss" bars.
   * @default '#ef4444'
   */
  negativeColor?: string;

  // ── Object-array field mapping ────────────────────────────────────────────

  /**
   * Object property used as the **x-axis label**.
   * Only relevant when the cell value is an `object[]`.
   * The resolved string is shown in the tooltip; no axis is drawn.
   */
  xKey?: string;

  /**
   * Object property holding the **numeric y-value**.
   * Only relevant when the cell value is an `object[]`.
   * @default 'value'
   */
  yKey?: string;

  // ── OHLC / Candlestick key mapping ────────────────────────────────────────

  /**
   * Object property for the **open** price.
   * Used by `candlestick` and `ohlc` chart types.
   * @default 'open'
   */
  openKey?: string;

  /**
   * Object property for the **high** price.
   * Used by `candlestick` and `ohlc` chart types.
   * @default 'high'
   */
  highKey?: string;

  /**
   * Object property for the **low** price.
   * Used by `candlestick` and `ohlc` chart types.
   * @default 'low'
   */
  lowKey?: string;

  /**
   * Object property for the **close** price.
   * Used by `candlestick` and `ohlc` chart types.
   * @default 'close'
   */
  closeKey?: string;

  /**
   * Colour used for **bullish** candles / ticks (close ≥ open).
   * @default '#22c55e'
   */
  bullColor?: string;

  /**
   * Colour used for **bearish** candles / ticks (close < open).
   * @default '#ef4444'
   */
  bearColor?: string;

  /**
   * Show a floating tooltip when the cursor hovers over a data point.
   * The tooltip displays the x label (for object arrays) and the y value.
   * @default true
   */
  showTooltip?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal normalised data structures (not part of the public API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @internal
 * Normalised single-value data point produced by the data-parsing step.
 * Used for `line`, `area`, `bar`, `column`, and `win-loss` renderers.
 */
export interface SparklinePoint {
  /** Zero-based index within the series — used for x-axis positioning. */
  index: number;
  /** Numeric y-value after coercion. */
  value: number;
  /**
   * Human-readable label shown in the tooltip.
   * Populated from `xKey` when the raw data is an object array;
   * defaults to the stringified index otherwise.
   */
  label?: string;
}

/**
 * @internal
 * Normalised OHLC data point used by `candlestick` and `ohlc` renderers.
 */
export interface OHLCPoint {
  /** Zero-based index within the series. */
  index: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /**
   * Human-readable label shown in the tooltip.
   * Populated from `xKey` when the raw data is an object array.
   */
  label?: string;
}
