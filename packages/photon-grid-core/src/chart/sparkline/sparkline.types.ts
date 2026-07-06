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
