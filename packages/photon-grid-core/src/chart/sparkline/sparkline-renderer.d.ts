/**
 * @module SparklineRenderer
 *
 * Canvas-based sparkline renderer for PhotonGrid.
 *
 * Supports seven chart types: `line`, `area`, `bar`, `column`, `win-loss`,
 * `candlestick`, and `ohlc`.  Each instance is bound to a single
 * `<canvas>` element and manages its own event listeners.
 *
 * Typical lifecycle (managed by {@link CellRenderer}):
 * ```
 * const renderer = new SparklineRenderer(canvas, rawCellValue, config);
 * // … cell lives in the DOM …
 * renderer.destroy(); // called when the cell is recycled
 * ```
 */
import type { SparklineConfig } from './sparkline.types';
/**
 * Renders a mini chart onto a `<canvas>` element inside a grid cell.
 *
 * The renderer is instantiated once per visible cell by {@link CellRenderer}
 * after the canvas has been mounted to the DOM and has non-zero dimensions.
 * It handles its own mouse events and delegates tooltip display to the
 * shared {@link SparklineTooltip} singleton.
 *
 * @example
 * ```ts
 * const renderer = new SparklineRenderer(canvasEl, row.data.history, {
 *   type: 'line',
 *   stroke: '#2563eb',
 *   showMarkers: true,
 * });
 *
 * // Later, when the cell is recycled:
 * renderer.destroy();
 * ```
 */
export declare class SparklineRenderer {
    private readonly canvas;
    private readonly ctx;
    private readonly cfg;
    /**
     * Reference to the original raw-data object passed at construction time.
     * When the data is a live array mutated in-place (e.g. a real-time ticker),
     * calling {@link redraw} re-parses from this reference without any new
     * allocations at the call site.
     */
    private rawData;
    /** Normalised data for scalar chart types. */
    private points;
    /** Normalised data for OHLC-based chart types. */
    private ohlcPoints;
    /** True when the raw data contains x-label information (object arrays). */
    private readonly hasLabels;
    /** True for `candlestick` and `ohlc` types. */
    private readonly isOHLC;
    /** Bound event handlers — stored so they can be removed on destroy. */
    private readonly _onMouseMove;
    private readonly _onMouseLeave;
    /**
     * Creates a new SparklineRenderer and immediately draws the chart.
     *
     * The canvas **must** already have non-zero CSS dimensions when this
     * constructor is called; the constructor reads `clientWidth` / `clientHeight`
     * to set the backing-buffer resolution for retina displays.
     *
     * @param canvas  - The `<canvas>` element to draw onto.
     * @param rawData - The cell value; a flat `number[]` or `object[]`.
     * @param config  - Sparkline appearance configuration.
     */
    constructor(canvas: HTMLCanvasElement, rawData: unknown, config: SparklineConfig);
    /**
     * Re-parses {@link rawData} and redraws the chart onto the canvas.
     *
     * Designed for real-time use cases where the same array reference is
     * mutated in-place on each tick (e.g. a live stock ticker).  No new data
     * reference is needed — the renderer reads from the same array it received
     * at construction time.
     *
     * @example
     * ```ts
     * // Shift the live array and call redraw — no new SparklineRenderer needed.
     * history.shift();
     * history.push(newPrice);
     * renderer.redraw();
     * ```
     */
    redraw(): void;
    /**
     * Releases all event listeners held by this renderer.
     * Must be called when the host cell element is removed from the DOM to
     * prevent memory leaks.
     */
    destroy(): void;
    /**
     * Sets `canvas.width` / `canvas.height` to the physical pixel resolution
     * (CSS size × device pixel ratio) and resets the transform.
     */
    private _syncSize;
    /**
     * Builds the {@link ResolvedConfig} by merging caller-provided options with
     * theme CSS variables and hard-coded defaults.
     *
     * @param config - Raw user-supplied configuration.
     * @returns Fully resolved configuration object.
     */
    private _resolveConfig;
    /**
     * Returns `true` when the raw cell value is an object array that contains
     * an x-axis label key (from `config.xKey`).
     *
     * @param rawData - The cell value.
     * @param cfg     - Resolved configuration.
     */
    private _rawHasLabels;
    /**
     * Normalises the raw cell value into an array of {@link SparklinePoint}s.
     * Accepts `number[]` or `object[]`; non-numeric / null values become `0`.
     *
     * @param rawData - The cell value.
     * @returns Array of normalised data points.
     */
    private _parsePoints;
    /**
     * Normalises the raw cell value into an array of {@link OHLCPoint}s.
     * Used for `candlestick` and `ohlc` chart types.
     *
     * @param rawData - The cell value.
     * @returns Array of normalised OHLC data points.
     */
    private _parseOHLC;
    /**
     * Clears the canvas and delegates to the type-specific draw method.
     */
    private _draw;
    /**
     * Renders a `line` sparkline: a polyline connecting all data points.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    private _drawLine;
    /**
     * Renders an `area` sparkline: a filled region beneath a line chart.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    private _drawArea;
    /**
     * Renders a `column` sparkline: vertical bars anchored at the zero line.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    private _drawColumn;
    /**
     * Renders a `bar` sparkline: horizontal bars anchored at the zero line.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    private _drawBar;
    /**
     * Renders a `win-loss` sparkline: uniform-height bars indicating
     * positive (win), negative (loss), or zero (neutral) values.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    private _drawWinLoss;
    /**
     * Renders a `candlestick` sparkline: OHLC data as filled bodies with wicks.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    private _drawCandlestick;
    /**
     * Renders an `ohlc` sparkline: high-low wicks with open / close tick marks.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    private _drawOHLC;
    /**
     * Draws circular markers at each data point for `line` and `area` charts.
     *
     * @param pts      - Normalised data points.
     * @param plotLeft - Left edge of the plot area (logical px).
     * @param plotTop  - Top edge of the plot area (logical px).
     * @param plotW    - Width of the plot area (logical px).
     * @param plotH    - Height of the plot area (logical px).
     * @param minV     - Minimum value in the series.
     * @param range    - Value range (maxV - minV).
     */
    private _drawMarkers;
    /**
     * Computes common plot-area metrics for scalar (non-OHLC) chart types.
     *
     * @param w   - Logical canvas width.
     * @param h   - Logical canvas height.
     * @param pts - Data points to compute value domain from.
     * @returns Plot dimensions and domain bounds.
     */
    private _plotMetrics;
    /**
     * Computes common plot-area metrics for OHLC chart types.
     *
     * @param w   - Logical canvas width.
     * @param h   - Logical canvas height.
     * @param pts - OHLC data points.
     * @returns Plot dimensions, domain bounds, and band dimensions.
     */
    private _ohlcMetrics;
    /**
     * Maps an x-index to a canvas x-coordinate within the plot area.
     *
     * For a single point the x is centred; for multiple points, points are
     * distributed linearly from plotLeft to plotLeft + plotW.
     *
     * @param index    - Zero-based data-point index.
     * @param total    - Total number of data points.
     * @param plotLeft - Left edge of the plot area.
     * @param plotW    - Width of the plot area.
     */
    private _xPos;
    /**
     * Maps a data value to a canvas y-coordinate within the plot area.
     * Higher values produce smaller y coordinates (canvas y increases downward).
     *
     * @param value   - Data value to map.
     * @param minV    - Minimum value in the series.
     * @param range   - Value range (maxV - minV).
     * @param plotTop - Top edge of the plot area.
     * @param plotH   - Height of the plot area.
     */
    private _yPos;
    /**
     * Handles `mousemove` on the canvas.
     * Finds the nearest data point by x-position and shows the tooltip.
     *
     * @param e - The native `MouseEvent`.
     */
    private _handleMouseMove;
    /**
     * Locates the nearest scalar data point and shows the shared tooltip.
     *
     * @param logX    - Cursor x in logical canvas coordinates.
     * @param w       - Logical canvas width.
     * @param h       - Logical canvas height.
     * @param clientX - Cursor viewport x.
     * @param clientY - Cursor viewport y.
     */
    private _showPointTooltip;
    /**
     * Locates the nearest OHLC data point and shows the shared OHLC tooltip.
     *
     * @param logX    - Cursor x in logical canvas coordinates.
     * @param w       - Logical canvas width.
     * @param h       - Logical canvas height.
     * @param clientX - Cursor viewport x.
     * @param clientY - Cursor viewport y.
     */
    private _showOHLCTooltip;
    /** Hides the shared tooltip on mouse leave. */
    private _handleMouseLeave;
}
//# sourceMappingURL=sparkline-renderer.d.ts.map