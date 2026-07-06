import type { ChartData } from './chart-data-transformer';
import type { ChartPanelType } from './chart-panel';
export interface ChartRenderOptions {
    type: ChartPanelType | 'bar' | 'line' | 'pie' | 'doughnut';
    width?: number;
    height?: number;
    padding?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    showValues?: boolean;
    barWidth?: number;
    lineWidth?: number;
    smooth?: boolean;
    fontFamily?: string;
    fontSize?: number;
    textColor?: string;
    gridColor?: string;
    backgroundColor?: string;
    animationDuration?: number;
}
export declare class ChartRenderer {
    private canvas;
    private ctx;
    private animProgress;
    private rafId;
    private hoverX;
    private hoverY;
    private hoverRafId;
    /** Smoothly lerped cursor-Y used to animate the tooltip like ApexCharts. */
    private tooltipSmoothedY;
    private lastData;
    private lastOptions;
    /** Per-dataset scale multiplier used by toggle animations (0 = hidden, 1 = full). */
    private seriesScales;
    /** Active RAF IDs for per-series toggle animations, keyed by dataset index. */
    private seriesToggleRafs;
    constructor(canvas: HTMLCanvasElement);
    render(data: ChartData, opts?: ChartRenderOptions): void;
    destroy(): void;
    /**
     * Animate a single dataset in or out without re-running the full chart animation.
     * Each dataset's bar heights are multiplied by a per-series scale factor that is
     * smoothly interpolated from its current value to 0 (hide) or 1 (show).
     *
     * @param index     - Index in `data.datasets` to animate.
     * @param toVisible - `true` = grow bars into view; `false` = shrink bars to zero.
     * @param data      - Full chart data including the toggled series.
     * @param opts      - Render options matching the current chart configuration.
     */
    toggleSeries(index: number, toVisible: boolean, data: ChartData, opts?: ChartRenderOptions): void;
    private attachEvents;
    private scheduleHoverRedraw;
    /**
     * Eases `tooltipSmoothedY` toward the raw cursor Y (`hoverY`) by a lerp
     * factor that produces an ApexCharts-style lag behind fast movement.
     *
     * @returns `true` when another frame is still required to complete the easing.
     */
    private stepTooltipLerp;
    private drawHover;
    private drawCartesianHover;
    private drawBarHover;
    private drawTooltip;
    private animate;
    private getPlotArea;
    private draw;
    private drawColumnGrouped;
    private drawColumnStacked;
    private drawColumn100Stacked;
    private drawBarGrouped;
    private drawBarStacked;
    private drawBar100Stacked;
    private drawLine;
    private drawArea;
    private drawPie;
    private drawScatter;
    private drawPolar;
    private drawFunnel;
    private drawGridLines;
    /**
     * Draws relative (0–100 %) Y-axis gridlines for multi-series charts where each
     * dataset is normalised to its own maximum, making the shared axis unitless.
     */
    private drawGridLinesRelative;
    private drawLegend;
    private drawAxes;
    private niceMax;
    private getLabelStep;
    private easeOutQuart;
    private truncate;
    private formatNum;
}
//# sourceMappingURL=chart-renderer.d.ts.map