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
// ─────────────────────────────────────────────────────────────────────────────
// Singleton tooltip manager
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @internal
 * Lazily-created singleton tooltip `<div>` that floats above sparkline cells.
 * Only one tooltip is ever in the DOM; each hovered sparkline repositions it.
 */
const SparklineTooltip = {
    _el: null,
    /** Returns the shared tooltip element, creating it on first access. */
    get() {
        if (!SparklineTooltip._el) {
            const el = document.createElement('div');
            el.className = 'pg-sparkline-tooltip';
            el.setAttribute('role', 'tooltip');
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
            SparklineTooltip._el = el;
        }
        return SparklineTooltip._el;
    },
    /**
     * Shows the tooltip with a single numeric value, optionally preceded by a
     * label row (from `xKey`).
     *
     * @param clientX - Cursor x in viewport coordinates.
     * @param clientY - Cursor y in viewport coordinates.
     * @param label   - Optional x-axis label (only shown when `hasLabel` is true).
     * @param value   - Numeric y-value to display.
     * @param hasLabel - Whether a label row should be rendered.
     */
    show(clientX, clientY, label, value, hasLabel) {
        const el = SparklineTooltip.get();
        el.innerHTML = '';
        if (hasLabel && label !== undefined) {
            const labelEl = document.createElement('div');
            labelEl.className = 'pg-sparkline-tooltip__label';
            labelEl.textContent = label;
            el.appendChild(labelEl);
        }
        const valueEl = document.createElement('div');
        valueEl.className = 'pg-sparkline-tooltip__value';
        valueEl.textContent = formatNumber(value);
        el.appendChild(valueEl);
        SparklineTooltip._position(el, clientX, clientY);
    },
    /**
     * Shows the tooltip with four OHLC values.
     *
     * @param clientX - Cursor x in viewport coordinates.
     * @param clientY - Cursor y in viewport coordinates.
     * @param pt      - Normalised OHLC data point.
     * @param hasLabel - Whether a label row should be rendered.
     */
    showOHLC(clientX, clientY, pt, hasLabel) {
        const el = SparklineTooltip.get();
        el.innerHTML = '';
        if (hasLabel && pt.label !== undefined) {
            const labelEl = document.createElement('div');
            labelEl.className = 'pg-sparkline-tooltip__label';
            labelEl.textContent = pt.label;
            el.appendChild(labelEl);
        }
        const rows = [
            ['O', pt.open],
            ['H', pt.high],
            ['L', pt.low],
            ['C', pt.close],
        ];
        for (const [key, val] of rows) {
            const row = document.createElement('div');
            row.className = 'pg-sparkline-tooltip__ohlc-row';
            const keyEl = document.createElement('span');
            keyEl.className = 'pg-sparkline-tooltip__ohlc-key';
            keyEl.textContent = key;
            const valEl = document.createElement('span');
            valEl.className = 'pg-sparkline-tooltip__value';
            valEl.textContent = formatNumber(val);
            row.appendChild(keyEl);
            row.appendChild(valEl);
            el.appendChild(row);
        }
        SparklineTooltip._position(el, clientX, clientY);
    },
    /** Hides the tooltip without removing it from the DOM. */
    hide() {
        if (SparklineTooltip._el) {
            SparklineTooltip._el.className = 'pg-sparkline-tooltip pg-sparkline-tooltip--hidden';
        }
    },
    /** @internal Positions and reveals the tooltip near the cursor. */
    _position(el, cx, cy) {
        el.className = 'pg-sparkline-tooltip';
        // Force a layout pass to get real dimensions after innerHTML change
        const ew = el.offsetWidth || 80;
        const eh = el.offsetHeight || 40;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let left = cx + 14;
        if (left + ew > vw - 8)
            left = cx - ew - 14;
        let top = cy - Math.round(eh / 2);
        if (top < 4)
            top = 4;
        if (top + eh > vh - 4)
            top = vh - eh - 4;
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    },
};
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Formats a number for tooltip display.
 * Large values use K / M suffixes; decimals are truncated to two places.
 *
 * @param n - The value to format.
 * @returns A compact, human-readable string.
 */
function formatNumber(n) {
    if (!isFinite(n))
        return '—';
    const abs = Math.abs(n);
    if (abs >= 1000000)
        return (n / 1000000).toFixed(1) + 'M';
    if (abs >= 1000)
        return (n / 1000).toFixed(1) + 'K';
    if (n !== Math.floor(n))
        return n.toFixed(2);
    return String(n);
}
/**
 * Reads a CSS custom property from the computed style of an element.
 * Returns `fallback` when the property is absent or empty.
 *
 * @param el       - Reference element for `getComputedStyle`.
 * @param varName  - CSS variable name including leading `--`.
 * @param fallback - Value to use when the variable is not found.
 */
function cssVar(el, varName, fallback) {
    const raw = getComputedStyle(el).getPropertyValue(varName).trim();
    return raw || fallback;
}
/**
 * Converts a hex colour string to an `rgba(…)` string with the given opacity.
 *
 * @param hex     - Six-digit hex colour, e.g. `'#2563eb'`.
 * @param opacity - Opacity fraction (0–1).
 * @returns An `rgba(…)` colour string.
 */
function hexToRgba(hex, opacity) {
    const clean = hex.replace('#', '');
    if (clean.length !== 6)
        return hex;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
}
// ─────────────────────────────────────────────────────────────────────────────
// SparklineRenderer
// ─────────────────────────────────────────────────────────────────────────────
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
export class SparklineRenderer {
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
    constructor(canvas, rawData, config) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('[PhotonGrid] SparklineRenderer: failed to get 2D context');
        }
        this.canvas = canvas;
        this.ctx = ctx;
        this.cfg = this._resolveConfig(config);
        this.rawData = rawData;
        this.isOHLC = this.cfg.type === 'candlestick' || this.cfg.type === 'ohlc';
        this.hasLabels = this._rawHasLabels(rawData, this.cfg);
        if (this.isOHLC) {
            this.ohlcPoints = this._parseOHLC(rawData);
            this.points = [];
        }
        else {
            this.points = this._parsePoints(rawData);
            this.ohlcPoints = [];
        }
        // Scale canvas buffer for device pixel ratio
        this._syncSize();
        this._onMouseMove = this._handleMouseMove.bind(this);
        this._onMouseLeave = this._handleMouseLeave.bind(this);
        if (this.cfg.showTooltip) {
            this.canvas.addEventListener('mousemove', this._onMouseMove);
            this.canvas.addEventListener('mouseleave', this._onMouseLeave);
        }
        this._draw();
    }
    // ─── Public API ────────────────────────────────────────────────────────────
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
    redraw() {
        if (this.isOHLC) {
            this.ohlcPoints = this._parseOHLC(this.rawData);
        }
        else {
            this.points = this._parsePoints(this.rawData);
        }
        this._syncSize();
        this._draw();
    }
    /**
     * Releases all event listeners held by this renderer.
     * Must be called when the host cell element is removed from the DOM to
     * prevent memory leaks.
     */
    destroy() {
        this.canvas.removeEventListener('mousemove', this._onMouseMove);
        this.canvas.removeEventListener('mouseleave', this._onMouseLeave);
        SparklineTooltip.hide();
    }
    // ─── Initialisation helpers ────────────────────────────────────────────────
    /**
     * Sets `canvas.width` / `canvas.height` to the physical pixel resolution
     * (CSS size × device pixel ratio) and resets the transform.
     */
    _syncSize() {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    /**
     * Builds the {@link ResolvedConfig} by merging caller-provided options with
     * theme CSS variables and hard-coded defaults.
     *
     * @param config - Raw user-supplied configuration.
     * @returns Fully resolved configuration object.
     */
    _resolveConfig(config) {
        const el = this.canvas;
        const primaryColor = cssVar(el, '--pg-primary', '#2563eb');
        const errorColor = cssVar(el, '--pg-colors-error', '#ef4444');
        const successColor = cssVar(el, '--pg-colors-success', '#22c55e');
        const stroke = config.stroke ?? primaryColor;
        const positiveColor = config.positiveColor ?? stroke;
        let fillColor = config.fill ?? '';
        if (!fillColor) {
            if (stroke.startsWith('#') && stroke.length === 7) {
                fillColor = hexToRgba(stroke, 0.18);
            }
            else {
                fillColor = stroke;
            }
        }
        return {
            type: config.type ?? 'line',
            stroke,
            fill: fillColor,
            lineWidth: config.lineWidth ?? 1.5,
            showMarkers: config.showMarkers ?? false,
            markerSize: config.markerSize ?? 2.5,
            markerFill: config.markerFill ?? stroke,
            padding: config.padding ?? 3,
            barSpacing: config.barSpacing ?? 0.15,
            positiveColor,
            negativeColor: config.negativeColor ?? errorColor,
            bullColor: config.bullColor ?? successColor,
            bearColor: config.bearColor ?? errorColor,
            showTooltip: config.showTooltip ?? true,
            xKey: config.xKey ?? '',
            yKey: config.yKey ?? 'value',
            openKey: config.openKey ?? 'open',
            highKey: config.highKey ?? 'high',
            lowKey: config.lowKey ?? 'low',
            closeKey: config.closeKey ?? 'close',
        };
    }
    /**
     * Returns `true` when the raw cell value is an object array that contains
     * an x-axis label key (from `config.xKey`).
     *
     * @param rawData - The cell value.
     * @param cfg     - Resolved configuration.
     */
    _rawHasLabels(rawData, cfg) {
        if (!Array.isArray(rawData) || rawData.length === 0)
            return false;
        return typeof rawData[0] === 'object' && rawData[0] !== null && !!cfg.xKey;
    }
    /**
     * Normalises the raw cell value into an array of {@link SparklinePoint}s.
     * Accepts `number[]` or `object[]`; non-numeric / null values become `0`.
     *
     * @param rawData - The cell value.
     * @returns Array of normalised data points.
     */
    _parsePoints(rawData) {
        if (!Array.isArray(rawData) || rawData.length === 0)
            return [];
        return rawData.map((item, index) => {
            if (typeof item === 'number') {
                return { index, value: item };
            }
            if (typeof item === 'object' && item !== null) {
                const obj = item;
                const value = Number(obj[this.cfg.yKey] ?? 0);
                const label = this.cfg.xKey ? String(obj[this.cfg.xKey] ?? index) : undefined;
                return { index, value: isFinite(value) ? value : 0, label };
            }
            return { index, value: Number(item) || 0 };
        });
    }
    /**
     * Normalises the raw cell value into an array of {@link OHLCPoint}s.
     * Used for `candlestick` and `ohlc` chart types.
     *
     * @param rawData - The cell value.
     * @returns Array of normalised OHLC data points.
     */
    _parseOHLC(rawData) {
        if (!Array.isArray(rawData) || rawData.length === 0)
            return [];
        return rawData.map((item, index) => {
            const obj = (typeof item === 'object' && item !== null)
                ? item
                : {};
            const num = (key) => {
                const v = Number(obj[key] ?? 0);
                return isFinite(v) ? v : 0;
            };
            const label = this.cfg.xKey ? String(obj[this.cfg.xKey] ?? index) : undefined;
            return {
                index,
                open: num(this.cfg.openKey),
                high: num(this.cfg.highKey),
                low: num(this.cfg.lowKey),
                close: num(this.cfg.closeKey),
                label,
            };
        });
    }
    // ─── Drawing dispatch ──────────────────────────────────────────────────────
    /**
     * Clears the canvas and delegates to the type-specific draw method.
     */
    _draw() {
        const { ctx } = this;
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        switch (this.cfg.type) {
            case 'line':
                this._drawLine(w, h);
                break;
            case 'area':
                this._drawArea(w, h);
                break;
            case 'column':
                this._drawColumn(w, h);
                break;
            case 'bar':
                this._drawBar(w, h);
                break;
            case 'win-loss':
                this._drawWinLoss(w, h);
                break;
            case 'candlestick':
                this._drawCandlestick(w, h);
                break;
            case 'ohlc':
                this._drawOHLC(w, h);
                break;
        }
    }
    // ─── Type-specific renderers ───────────────────────────────────────────────
    /**
     * Renders a `line` sparkline: a polyline connecting all data points.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawLine(w, h) {
        const pts = this.points;
        if (pts.length < 2)
            return;
        const { ctx, cfg } = this;
        const { pad, plotW, plotH, plotLeft, plotTop, minV, range } = this._plotMetrics(w, h, pts);
        ctx.beginPath();
        ctx.strokeStyle = cfg.stroke;
        ctx.lineWidth = cfg.lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (let i = 0; i < pts.length; i++) {
            const x = this._xPos(i, pts.length, plotLeft, plotW);
            const y = this._yPos(pts[i].value, minV, range, plotTop, plotH);
            if (i === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (cfg.showMarkers)
            this._drawMarkers(pts, plotLeft, plotTop, plotW, plotH, minV, range);
        void pad; // suppress unused-variable lint for symmetry with other methods
    }
    /**
     * Renders an `area` sparkline: a filled region beneath a line chart.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawArea(w, h) {
        const pts = this.points;
        if (pts.length < 2)
            return;
        const { ctx, cfg } = this;
        const { plotW, plotH, plotLeft, plotTop, plotBottom, minV, range } = this._plotMetrics(w, h, pts);
        // Filled area
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const x = this._xPos(i, pts.length, plotLeft, plotW);
            const y = this._yPos(pts[i].value, minV, range, plotTop, plotH);
            if (i === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        const lastX = this._xPos(pts.length - 1, pts.length, plotLeft, plotW);
        const firstX = this._xPos(0, pts.length, plotLeft, plotW);
        ctx.lineTo(lastX, plotBottom);
        ctx.lineTo(firstX, plotBottom);
        ctx.closePath();
        ctx.fillStyle = cfg.fill;
        ctx.fill();
        // Stroke on top
        ctx.beginPath();
        ctx.strokeStyle = cfg.stroke;
        ctx.lineWidth = cfg.lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (let i = 0; i < pts.length; i++) {
            const x = this._xPos(i, pts.length, plotLeft, plotW);
            const y = this._yPos(pts[i].value, minV, range, plotTop, plotH);
            if (i === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (cfg.showMarkers)
            this._drawMarkers(pts, plotLeft, plotTop, plotW, plotH, minV, range);
    }
    /**
     * Renders a `column` sparkline: vertical bars anchored at the zero line.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawColumn(w, h) {
        const pts = this.points;
        if (pts.length === 0)
            return;
        const { ctx, cfg } = this;
        const { plotW, plotH, plotLeft, plotTop, minV, range } = this._plotMetrics(w, h, pts);
        const n = pts.length;
        const bandW = plotW / n;
        const gap = bandW * cfg.barSpacing;
        const barW = Math.max(1, bandW - gap);
        const zeroY = this._yPos(0, minV, range, plotTop, plotH);
        for (const pt of pts) {
            const x = plotLeft + pt.index * bandW + gap / 2;
            const yVal = this._yPos(pt.value, minV, range, plotTop, plotH);
            const top = Math.min(yVal, zeroY);
            const barH = Math.max(1, Math.abs(yVal - zeroY));
            ctx.fillStyle = pt.value >= 0 ? cfg.positiveColor : cfg.negativeColor;
            ctx.fillRect(x, top, barW, barH);
        }
    }
    /**
     * Renders a `bar` sparkline: horizontal bars anchored at the zero line.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawBar(w, h) {
        const pts = this.points;
        if (pts.length === 0)
            return;
        const { ctx, cfg } = this;
        const pad = cfg.padding;
        const plotH = h - pad * 2;
        const plotW = w - pad * 2;
        const plotTop = pad;
        const plotLeft = pad;
        const minV = Math.min(...pts.map((p) => p.value), 0);
        const maxV = Math.max(...pts.map((p) => p.value), 0);
        const range = maxV - minV || 1;
        const n = pts.length;
        const bandH = plotH / n;
        const gap = bandH * cfg.barSpacing;
        const barH = Math.max(1, bandH - gap);
        const zeroX = plotLeft + ((0 - minV) / range) * plotW;
        for (const pt of pts) {
            const y = plotTop + pt.index * bandH + gap / 2;
            const xVal = plotLeft + ((pt.value - minV) / range) * plotW;
            const left = Math.min(xVal, zeroX);
            const barW = Math.max(1, Math.abs(xVal - zeroX));
            ctx.fillStyle = pt.value >= 0 ? cfg.positiveColor : cfg.negativeColor;
            ctx.fillRect(left, y, barW, barH);
        }
    }
    /**
     * Renders a `win-loss` sparkline: uniform-height bars indicating
     * positive (win), negative (loss), or zero (neutral) values.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawWinLoss(w, h) {
        const pts = this.points;
        if (pts.length === 0)
            return;
        const { ctx, cfg } = this;
        const pad = cfg.padding;
        const plotTop = pad;
        const plotH = h - pad * 2;
        const plotLeft = pad;
        const plotW = w - pad * 2;
        const n = pts.length;
        const bandW = plotW / n;
        const gap = bandW * cfg.barSpacing;
        const barW = Math.max(1, bandW - gap);
        const midY = plotTop + plotH / 2;
        const halfH = Math.max(1, plotH / 2 - 1);
        for (const pt of pts) {
            const x = plotLeft + pt.index * bandW + gap / 2;
            if (pt.value > 0) {
                ctx.fillStyle = cfg.positiveColor;
                ctx.fillRect(x, midY - halfH, barW, halfH);
            }
            else if (pt.value < 0) {
                ctx.fillStyle = cfg.negativeColor;
                ctx.fillRect(x, midY, barW, halfH);
            }
            else {
                // Neutral — draw a thin line at midpoint
                ctx.fillStyle = cssVar(this.canvas, '--pg-colors-border', '#e2e8f0');
                ctx.fillRect(x, midY - 1, barW, 2);
            }
        }
    }
    /**
     * Renders a `candlestick` sparkline: OHLC data as filled bodies with wicks.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawCandlestick(w, h) {
        const pts = this.ohlcPoints;
        if (pts.length === 0)
            return;
        const { ctx, cfg } = this;
        const metrics = this._ohlcMetrics(w, h, pts);
        const { plotLeft, plotTop, plotW, plotH, minV, range, bandW, gap } = metrics;
        for (const pt of pts) {
            const isBull = pt.close >= pt.open;
            const color = isBull ? cfg.bullColor : cfg.bearColor;
            const cx = plotLeft + pt.index * bandW + bandW / 2;
            const highY = this._yPos(pt.high, minV, range, plotTop, plotH);
            const lowY = this._yPos(pt.low, minV, range, plotTop, plotH);
            const openY = this._yPos(pt.open, minV, range, plotTop, plotH);
            const closeY = this._yPos(pt.close, minV, range, plotTop, plotH);
            const bodyTop = Math.min(openY, closeY);
            const bodyH = Math.max(1, Math.abs(closeY - openY));
            const barW = Math.max(2, bandW - gap);
            // Wick
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, highY);
            ctx.lineTo(cx, lowY);
            ctx.stroke();
            // Body
            ctx.fillStyle = color;
            ctx.fillRect(cx - barW / 2, bodyTop, barW, bodyH);
        }
    }
    /**
     * Renders an `ohlc` sparkline: high-low wicks with open / close tick marks.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawOHLC(w, h) {
        const pts = this.ohlcPoints;
        if (pts.length === 0)
            return;
        const { ctx, cfg } = this;
        const metrics = this._ohlcMetrics(w, h, pts);
        const { plotLeft, plotTop, plotW, plotH, minV, range, bandW } = metrics;
        const tickLen = Math.max(2, Math.min(4, bandW * 0.35));
        for (const pt of pts) {
            const isBull = pt.close >= pt.open;
            const color = isBull ? cfg.bullColor : cfg.bearColor;
            const cx = plotLeft + pt.index * bandW + bandW / 2;
            const highY = this._yPos(pt.high, minV, range, plotTop, plotH);
            const lowY = this._yPos(pt.low, minV, range, plotTop, plotH);
            const openY = this._yPos(pt.open, minV, range, plotTop, plotH);
            const closeY = this._yPos(pt.close, minV, range, plotTop, plotH);
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1, bandW * 0.15);
            ctx.lineCap = 'square';
            // High-low wick
            ctx.beginPath();
            ctx.moveTo(cx, highY);
            ctx.lineTo(cx, lowY);
            ctx.stroke();
            // Open tick (left)
            ctx.beginPath();
            ctx.moveTo(cx - tickLen, openY);
            ctx.lineTo(cx, openY);
            ctx.stroke();
            // Close tick (right)
            ctx.beginPath();
            ctx.moveTo(cx, closeY);
            ctx.lineTo(cx + tickLen, closeY);
            ctx.stroke();
        }
        void plotW; // referenced indirectly through plotLeft / metrics
    }
    // ─── Shared drawing utilities ──────────────────────────────────────────────
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
    _drawMarkers(pts, plotLeft, plotTop, plotW, plotH, minV, range) {
        const { ctx, cfg } = this;
        ctx.fillStyle = cfg.markerFill;
        for (let i = 0; i < pts.length; i++) {
            const x = this._xPos(i, pts.length, plotLeft, plotW);
            const y = this._yPos(pts[i].value, minV, range, plotTop, plotH);
            ctx.beginPath();
            ctx.arc(x, y, cfg.markerSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // ─── Coordinate helpers ────────────────────────────────────────────────────
    /**
     * Computes common plot-area metrics for scalar (non-OHLC) chart types.
     *
     * @param w   - Logical canvas width.
     * @param h   - Logical canvas height.
     * @param pts - Data points to compute value domain from.
     * @returns Plot dimensions and domain bounds.
     */
    _plotMetrics(w, h, pts) {
        const pad = this.cfg.padding;
        const plotLeft = pad;
        const plotTop = pad;
        const plotRight = w - pad;
        const plotBottom = h - pad;
        const plotW = plotRight - plotLeft;
        const plotH = plotBottom - plotTop;
        const values = pts.map((p) => p.value);
        const minV = Math.min(...values, 0);
        const maxV = Math.max(...values, 0);
        const range = maxV - minV || 1;
        return { pad, plotLeft, plotTop, plotRight, plotBottom, plotW, plotH, minV, maxV, range };
    }
    /**
     * Computes common plot-area metrics for OHLC chart types.
     *
     * @param w   - Logical canvas width.
     * @param h   - Logical canvas height.
     * @param pts - OHLC data points.
     * @returns Plot dimensions, domain bounds, and band dimensions.
     */
    _ohlcMetrics(w, h, pts) {
        const pad = this.cfg.padding;
        const plotLeft = pad;
        const plotTop = pad;
        const plotRight = w - pad;
        const plotBottom = h - pad;
        const plotW = plotRight - plotLeft;
        const plotH = plotBottom - plotTop;
        const highs = pts.map((p) => p.high);
        const lows = pts.map((p) => p.low);
        const minV = Math.min(...lows);
        const maxV = Math.max(...highs);
        const range = maxV - minV || 1;
        const n = pts.length;
        const bandW = plotW / Math.max(n, 1);
        const gap = bandW * this.cfg.barSpacing;
        return { plotLeft, plotTop, plotRight, plotBottom, plotW, plotH, minV, maxV, range, bandW, gap };
    }
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
    _xPos(index, total, plotLeft, plotW) {
        if (total === 1)
            return plotLeft + plotW / 2;
        return plotLeft + (index / (total - 1)) * plotW;
    }
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
    _yPos(value, minV, range, plotTop, plotH) {
        return plotTop + (1 - (value - minV) / range) * plotH;
    }
    // ─── Hover / tooltip ───────────────────────────────────────────────────────
    /**
     * Handles `mousemove` on the canvas.
     * Finds the nearest data point by x-position and shows the tooltip.
     *
     * @param e - The native `MouseEvent`.
     */
    _handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        // Convert to logical (CSS) coordinates
        const logicalX = (e.clientX - rect.left);
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        void dpr;
        if (this.isOHLC) {
            this._showOHLCTooltip(logicalX, w, h, e.clientX, e.clientY);
        }
        else {
            this._showPointTooltip(logicalX, w, h, e.clientX, e.clientY);
        }
    }
    /**
     * Locates the nearest scalar data point and shows the shared tooltip.
     *
     * @param logX    - Cursor x in logical canvas coordinates.
     * @param w       - Logical canvas width.
     * @param h       - Logical canvas height.
     * @param clientX - Cursor viewport x.
     * @param clientY - Cursor viewport y.
     */
    _showPointTooltip(logX, w, h, clientX, clientY) {
        const pts = this.points;
        if (pts.length === 0)
            return;
        const pad = this.cfg.padding;
        const plotLeft = pad;
        const plotW = w - pad * 2;
        void h;
        let idx;
        if (pts.length === 1) {
            idx = 0;
        }
        else {
            const xStep = plotW / (pts.length - 1);
            const raw = Math.round((logX - plotLeft) / xStep);
            idx = Math.max(0, Math.min(pts.length - 1, raw));
        }
        const pt = pts[idx];
        if (pt) {
            SparklineTooltip.show(clientX, clientY, pt.label, pt.value, this.hasLabels);
        }
    }
    /**
     * Locates the nearest OHLC data point and shows the shared OHLC tooltip.
     *
     * @param logX    - Cursor x in logical canvas coordinates.
     * @param w       - Logical canvas width.
     * @param h       - Logical canvas height.
     * @param clientX - Cursor viewport x.
     * @param clientY - Cursor viewport y.
     */
    _showOHLCTooltip(logX, w, h, clientX, clientY) {
        const pts = this.ohlcPoints;
        if (pts.length === 0)
            return;
        const pad = this.cfg.padding;
        const plotLeft = pad;
        const plotW = w - pad * 2;
        void h;
        const bandW = plotW / pts.length;
        const raw = Math.floor((logX - plotLeft) / bandW);
        const idx = Math.max(0, Math.min(pts.length - 1, raw));
        const pt = pts[idx];
        if (pt) {
            SparklineTooltip.showOHLC(clientX, clientY, pt, this.hasLabels);
        }
    }
    /** Hides the shared tooltip on mouse leave. */
    _handleMouseLeave() {
        SparklineTooltip.hide();
    }
}
//# sourceMappingURL=sparkline-renderer.js.map