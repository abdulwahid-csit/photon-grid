import type { ChartData } from './chart-data-transformer';
import type { ChartPanelType } from './chart-panel';
import type { LegendPosition, TextAlign } from './model/chart-model';
import { resolveChartTheme, type ResolvedChartTheme } from './chart-theme';

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
  /**
   * Axis-label / body text color. Empty string means "resolve from the active
   * theme token" — the renderer fills it in per render.
   */
  textColor?: string;
  /** Grid-line / axis-line color. Empty string means "resolve from theme". */
  gridColor?: string;
  backgroundColor?: string;
  animationDuration?: number;

  // ── Titles ────────────────────────────────────────────────────────────────
  /** Main chart title drawn above the plot. Empty string hides the band. */
  title?: string;
  titleColor?: string;
  titleFontSize?: number;
  titleAlign?: TextAlign;
  /** Subtitle drawn beneath the title. Empty string hides it. */
  subtitle?: string;
  subtitleColor?: string;
  subtitleFontSize?: number;
  subtitleAlign?: TextAlign;

  // ── Legend ──────────────────────────────────────────────────────────────
  /** Placement of the legend relative to the plot. */
  legendPosition?: LegendPosition;

  // ── Axes ────────────────────────────────────────────────────────────────
  /** Horizontal (category) axis title. Empty string hides it. */
  xAxisTitle?: string;
  /** Vertical (value) axis title. Empty string hides it. */
  yAxisTitle?: string;
  axisTitleColor?: string;
  /** Overrides {@link textColor} for axis tick labels when non-empty. */
  axisLabelColor?: string;
  /** Overrides {@link gridColor} for axis lines when non-empty. */
  axisLineColor?: string;
  showXTicks?: boolean;
  showYTicks?: boolean;
  showXLabels?: boolean;
  showYLabels?: boolean;

  // ── Series ──────────────────────────────────────────────────────────────
  /** Explicit color per series label; unmapped series use the theme palette. */
  seriesColors?: Readonly<Record<string, string>>;
  strokeWidth?: number;
  /** 0–1 fill opacity for area / polar fills. */
  fillOpacity?: number;
}

const DEFAULTS: Required<ChartRenderOptions> = {
  type: 'column-grouped',
  width: 600,
  height: 320,
  padding: 40,
  showLegend: true,
  showGrid: true,
  showValues: false,
  barWidth: 0.75,
  lineWidth: 2,
  smooth: false,
  fontFamily: '',
  fontSize: 12,
  textColor: '',
  gridColor: '',
  backgroundColor: 'transparent',
  animationDuration: 400,

  title: '',
  titleColor: '',
  titleFontSize: 15,
  titleAlign: 'left',
  subtitle: '',
  subtitleColor: '',
  subtitleFontSize: 12,
  subtitleAlign: 'left',

  legendPosition: 'bottom',

  xAxisTitle: '',
  yAxisTitle: '',
  axisTitleColor: '',
  axisLabelColor: '',
  axisLineColor: '',
  showXTicks: true,
  showYTicks: true,
  showXLabels: true,
  showYLabels: true,

  seriesColors: {},
  strokeWidth: 0,
  fillOpacity: 0,
};

const APEX_COLORS = [
  '#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0',
  '#3F51B5', '#03A9F4', '#4CAF50', '#F9CE1D', '#FF9800',
];

/**
 * Assigns a concrete color to every dataset. Precedence: an explicit override
 * in `seriesColors` (keyed by the dataset label), then a color already on the
 * dataset, then the theme `palette` cycled by index.
 *
 * @param data - Source chart data (datasets may lack colors).
 * @param palette - Theme-resolved series palette.
 * @param seriesColors - Per-label color overrides from the chart model.
 */
function assignColors(
  data: ChartData,
  palette: readonly string[],
  seriesColors: Readonly<Record<string, string>>,
): ChartData {
  const pal = palette.length > 0 ? palette : APEX_COLORS;
  return {
    labels: data.labels,
    datasets: data.datasets.map((ds, i) => ({
      ...ds,
      color: seriesColors[ds.label] ?? ds.color ?? pal[i % pal.length],
    })),
  };
}


export class ChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animProgress = 1;
  private rafId: number | null = null;

  // Hover state
  private hoverX: number | null = null;
  private hoverY: number | null = null;
  private hoverRafId: number | null = null;
  /** Smoothly lerped cursor-Y used to animate the tooltip like ApexCharts. */
  private tooltipSmoothedY: number | null = null;
  private lastData: ChartData | null = null;
  private lastOptions: Required<ChartRenderOptions> | null = null;

  /** Per-dataset scale multiplier used by toggle animations (0 = hidden, 1 = full). */
  private seriesScales: number[] = [];
  /** Active RAF IDs for per-series toggle animations, keyed by dataset index. */
  private seriesToggleRafs = new Map<number, number>();

  /**
   * Theme colors/palette resolved once per {@link render} / {@link toggleSeries}
   * call and reused across every animation and hover frame — never re-resolved
   * per frame (that would force layout via `getComputedStyle`).
   */
  private theme: ResolvedChartTheme | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('[PhotonGrid] ChartRenderer: could not get 2d context');
    this.ctx = ctx;
    this.attachEvents();
  }

  /**
   * Resolves theme tokens once and back-fills any color/font option the caller
   * left blank (empty string) with the theme value. Explicit overrides win over
   * theme defaults. Mutates `options` in place and caches the resolved theme.
   */
  private prepareOptions(options: Required<ChartRenderOptions>): void {
    const theme = resolveChartTheme(this.canvas);
    this.theme = theme;
    if (!options.fontFamily) options.fontFamily = theme.fontFamily;
    options.textColor = options.axisLabelColor || options.textColor || theme.textColor;
    options.gridColor = options.axisLineColor || options.gridColor || theme.gridColor;
  }

  /** Theme palette color for a given series/slice index, cycling as needed. */
  private paletteColor(i: number): string {
    const pal = this.theme?.palette ?? APEX_COLORS;
    return pal[i % pal.length];
  }

  render(data: ChartData, opts: ChartRenderOptions = { type: 'column-grouped' }): void {
    const options = { ...DEFAULTS, ...opts };
    this.canvas.width = options.width;
    this.canvas.height = options.height;

    this.prepareOptions(options);
    const coloredData = assignColors(data, this.theme!.palette, options.seriesColors);
    this.lastData = coloredData;
    this.lastOptions = options;
    // Full re-render: reset every series to fully visible
    this.seriesScales = coloredData.datasets.map(() => 1);

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (options.animationDuration > 0) {
      this.animate(coloredData, options);
    } else {
      this.animProgress = 1;
      this.draw(coloredData, options, 1);
    }
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.hoverRafId !== null) {
      cancelAnimationFrame(this.hoverRafId);
      this.hoverRafId = null;
    }
    for (const rafId of this.seriesToggleRafs.values()) cancelAnimationFrame(rafId);
    this.seriesToggleRafs.clear();
  }

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
  toggleSeries(index: number, toVisible: boolean, data: ChartData, opts: ChartRenderOptions = { type: 'column-grouped' }): void {
    const options = { ...DEFAULTS, ...opts };
    this.prepareOptions(options);
    const coloredData = assignColors(data, this.theme!.palette, options.seriesColors);
    this.lastData = coloredData;
    this.lastOptions = options;

    while (this.seriesScales.length < coloredData.datasets.length) this.seriesScales.push(1);

    const existing = this.seriesToggleRafs.get(index);
    if (existing !== undefined) { cancelAnimationFrame(existing); this.seriesToggleRafs.delete(index); }

    const from = this.seriesScales[index] ?? (toVisible ? 0 : 1);
    const to   = toVisible ? 1 : 0;
    const duration = 280;
    const start = performance.now();

    const tick = (now: number) => {
      const t     = Math.min(1, (now - start) / duration);
      const eased = toVisible ? this.easeOutQuart(t) : 1 - this.easeOutQuart(1 - t);
      this.seriesScales[index] = from + (to - from) * eased;
      this.draw(coloredData, options, 1);
      if (t < 1) {
        this.seriesToggleRafs.set(index, requestAnimationFrame(tick));
      } else {
        this.seriesScales[index] = to;
        this.seriesToggleRafs.delete(index);
        this.draw(coloredData, options, 1);
      }
    };
    this.seriesToggleRafs.set(index, requestAnimationFrame(tick));
  }

  // ── Hover event handling ─────────────────────────────────────────────────

  private attachEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / rect.width;
      const sy = this.canvas.height / rect.height;
      this.hoverX = (e.clientX - rect.left) * sx;
      this.hoverY = (e.clientY - rect.top) * sy;
      this.canvas.style.cursor = 'crosshair';
      this.scheduleHoverRedraw();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverX = null;
      this.hoverY = null;
      this.tooltipSmoothedY = null; // snap reset so next entry starts fresh
      this.canvas.style.cursor = 'default';
      this.scheduleHoverRedraw();
    });
  }

  private scheduleHoverRedraw(): void {
    if (this.hoverRafId !== null) cancelAnimationFrame(this.hoverRafId);
    this.hoverRafId = requestAnimationFrame(() => {
      this.hoverRafId = null;
      if (!this.lastData || !this.lastOptions || this.animProgress < 1) return;

      const needsMore = this.stepTooltipLerp();

      this.draw(this.lastData, this.lastOptions, 1);
      if (this.hoverX !== null) {
        this.drawHover(this.lastData, this.lastOptions);
      }

      // Keep firing frames until the tooltip has fully caught up to the cursor
      if (needsMore && this.hoverX !== null) this.scheduleHoverRedraw();
    });
  }

  /**
   * Eases `tooltipSmoothedY` toward the raw cursor Y (`hoverY`) by a lerp
   * factor that produces an ApexCharts-style lag behind fast movement.
   *
   * @returns `true` when another frame is still required to complete the easing.
   */
  private stepTooltipLerp(): boolean {
    if (this.hoverY === null) { this.tooltipSmoothedY = null; return false; }
    if (this.tooltipSmoothedY === null) {
      // Snap on the very first frame of a new hover so there is no initial delay
      this.tooltipSmoothedY = this.hoverY;
      return false;
    }
    const diff = this.hoverY - this.tooltipSmoothedY;
    if (Math.abs(diff) < 0.5) { this.tooltipSmoothedY = this.hoverY; return false; }
    this.tooltipSmoothedY += diff * 0.14; // ~0.14 ≈ ApexCharts tooltip easing feel
    return true;
  }

  // ── Hover overlay dispatcher ──────────────────────────────────────────────

  private drawHover(data: ChartData, opts: Required<ChartRenderOptions>): void {
    const type = opts.type as string;
    const isHBar = type.startsWith('bar-') || type === 'bar';
    const skip = ['pie', 'doughnut', 'polar', 'funnel'];
    if (skip.includes(type)) return;

    if (isHBar) {
      this.drawBarHover(data, opts);
    } else {
      this.drawCartesianHover(data, opts);
    }
  }

  // ── Cartesian hover (column, line, area, scatter) ─────────────────────────

  private drawCartesianHover(data: ChartData, opts: Required<ChartRenderOptions>): void {
    const { ctx } = this;
    const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);
    const hx = this.hoverX!;
    if (hx < plotLeft || hx > plotRight) return;

    const nPoints = data.labels.length;
    if (!nPoints) return;

    const type = opts.type as string;
    const isColumn = type.startsWith('column');

    // Find nearest index
    let idx: number;
    let crosshairX: number;

    if (isColumn) {
      const groupW = plotW / Math.max(nPoints, 1);
      idx = Math.min(Math.floor((hx - plotLeft) / groupW), nPoints - 1);
      crosshairX = plotLeft + idx * groupW + groupW / 2;
    } else {
      const xStep = nPoints > 1 ? plotW / (nPoints - 1) : 0;
      idx = xStep > 0 ? Math.round((hx - plotLeft) / xStep) : 0;
      idx = Math.max(0, Math.min(idx, nPoints - 1));
      crosshairX = nPoints > 1 ? plotLeft + (idx / (nPoints - 1)) * plotW : plotLeft + plotW / 2;
    }

    // ── Vertical crosshair ──
    ctx.save();
    ctx.strokeStyle = 'rgba(100,116,139,0.30)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(crosshairX, plotTop);
    ctx.lineTo(crosshairX, plotBottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── Highlight dots for line / area / scatter ──
    if (['line', 'area', 'scatter'].includes(type)) {
      const rawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
      const maxVal = this.niceMax(rawMax);
      const getY = (v: number) => plotBottom - (v / maxVal) * plotH;

      for (const ds of data.datasets) {
        const val = ds.data[idx] ?? 0;
        const dotX = crosshairX;
        const dotY = getY(val);
        ctx.save();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
        ctx.fillStyle = ds.color ?? APEX_COLORS[0];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Column: highlight the hovered group with a faint backdrop ──
    if (isColumn) {
      const groupW = plotW / Math.max(nPoints, 1);
      const bx = plotLeft + idx * groupW;
      ctx.save();
      ctx.fillStyle = 'rgba(100,116,139,0.06)';
      ctx.fillRect(bx, plotTop, groupW, plotBottom - plotTop);
      ctx.restore();
    }

    // ── Tooltip ── anchor Y to the smoothly interpolated cursor position
    this.drawTooltip(data, opts, idx, crosshairX, this.tooltipSmoothedY, plotTop, plotBottom, false);
  }

  // ── Horizontal bar hover ──────────────────────────────────────────────────

  private drawBarHover(data: ChartData, opts: Required<ChartRenderOptions>): void {
    const { ctx } = this;
    const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
    const plotLeft = 80;
    const plotTop = 10 + this.titleBandHeight(opts);
    const plotRight = opts.width - 20;
    const plotBottom = opts.height - legendH - 30;
    const plotH = plotBottom - plotTop;
    const hy = this.hoverY!;

    if (hy < plotTop || hy > plotBottom) return;

    const nGroups = data.labels.length;
    if (!nGroups) return;

    const groupH = plotH / Math.max(nGroups, 1);
    const idx = Math.min(Math.floor((hy - plotTop) / groupH), nGroups - 1);
    const crosshairY = plotTop + idx * groupH + groupH / 2;

    // Horizontal crosshair
    ctx.save();
    ctx.strokeStyle = 'rgba(100,116,139,0.30)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(plotLeft, crosshairY);
    ctx.lineTo(plotRight, crosshairY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Row highlight
    ctx.save();
    ctx.fillStyle = 'rgba(100,116,139,0.06)';
    ctx.fillRect(plotLeft, plotTop + idx * groupH, plotRight - plotLeft, groupH);
    ctx.restore();

    // Tooltip (position to the right of the plot)
    this.drawTooltip(data, opts, idx, plotRight - 10, crosshairY, plotTop, plotBottom, true);
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────

  private drawTooltip(
    data: ChartData,
    opts: Required<ChartRenderOptions>,
    idx: number,
    anchorX: number,
    anchorY: number | null,
    plotTop: number,
    plotBottom: number,
    fromRight: boolean,
  ): void {
    const { ctx } = this;

    const xLabel = data.labels[idx] ?? '';
    type Row = { color: string; label: string; value: string };
    const rows: Row[] = data.datasets
      .filter((_, i) => (this.seriesScales[i] ?? 1) > 0.05)
      .map((ds) => ({
        color: ds.color ?? APEX_COLORS[0],
        label: ds.label,
        value: this.formatNum(ds.data[idx] ?? 0),
      }));

    const PAD  = 10;
    const LINE = 18;
    const SW   = 8;   // swatch width
    const GAP  = 7;   // gap between swatch and label

    ctx.font = `600 ${opts.fontSize}px ${opts.fontFamily}`;
    const headerW = ctx.measureText(xLabel).width;

    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    const maxValueW = Math.max(...rows.map((r) => {
      ctx.font = `600 ${opts.fontSize}px ${opts.fontFamily}`;
      const vw = ctx.measureText(r.value).width;
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      const lw = ctx.measureText(this.truncate(r.label, 16)).width;
      return SW + GAP + lw + 16 + vw;
    }), 0);

    const tooltipW = Math.max(headerW, maxValueW) + PAD * 2;
    const tooltipH = PAD * 2 + LINE + rows.length * LINE + (rows.length > 0 ? 4 : 0);

    // Position: right of anchor, flip if too close to right edge
    let tx: number;
    if (fromRight) {
      tx = anchorX - tooltipW - 14;
    } else {
      tx = anchorX + 14;
      if (tx + tooltipW > opts.width - 8) tx = anchorX - tooltipW - 14;
    }
    tx = Math.max(4, tx);

    // Vertical: center on anchor or mid-plot
    const midY = anchorY !== null ? anchorY : (plotTop + plotBottom) / 2;
    let ty = midY - tooltipH / 2;
    ty = Math.max(plotTop, Math.min(ty, plotBottom - tooltipH));
    ty = Math.max(4, ty);

    // ── Shadow + background ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = opts.backgroundColor === 'transparent' ? '#fff' : opts.backgroundColor;
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tooltipW, tooltipH, 6);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();

    // ── Header (X label) ──
    ctx.save();
    ctx.font = `600 ${opts.fontSize}px ${opts.fontFamily}`;
    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(xLabel, tx + PAD, ty + PAD + LINE / 2);

    // ── Separator ──
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx + PAD, ty + PAD + LINE);
    ctx.lineTo(tx + tooltipW - PAD, ty + PAD + LINE);
    ctx.stroke();

    // ── Dataset rows ──
    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    for (let i = 0; i < rows.length; i++) {
      const ry = ty + PAD + LINE + 4 + i * LINE + LINE / 2;

      // Color swatch (rounded)
      ctx.fillStyle = rows[i].color;
      ctx.beginPath();
      ctx.roundRect(tx + PAD, ry - SW / 2, SW, SW, 2);
      ctx.fill();

      // Series label
      ctx.fillStyle = opts.textColor;
      ctx.textAlign = 'left';
      ctx.fillText(this.truncate(rows[i].label, 16), tx + PAD + SW + GAP, ry);

      // Value — bold, right-aligned
      ctx.font = `600 ${opts.fontSize}px ${opts.fontFamily}`;
      ctx.fillStyle = rows[i].color;
      ctx.textAlign = 'right';
      ctx.fillText(rows[i].value, tx + tooltipW - PAD, ry);
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    }

    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Animation ────────────────────────────────────────────────────────────

  private animate(data: ChartData, options: Required<ChartRenderOptions>): void {
    this.animProgress = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      this.animProgress = Math.min(1, elapsed / options.animationDuration);
      const eased = this.easeOutQuart(this.animProgress);
      this.draw(data, options, eased);
      if (this.animProgress < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Vertical space (px) reserved at the top of the canvas for the title and
   * subtitle bands. Returns 0 when neither is set so no space is wasted.
   */
  private titleBandHeight(opts: Required<ChartRenderOptions>): number {
    let h = 0;
    if (opts.title) h += opts.titleFontSize + 8;
    if (opts.subtitle) h += opts.subtitleFontSize + 6;
    return h > 0 ? h + 6 : 0;
  }

  /** Whether a shared series legend should be drawn. */
  private legendActive(opts: Required<ChartRenderOptions>, data: ChartData): boolean {
    return opts.showLegend && data.datasets.length > 1;
  }

  /**
   * Whether the legend may be placed on a side (left/right). Only cartesian
   * charts (which route layout through {@link getPlotArea}) reserve side space;
   * pie/polar/funnel/bar keep the legend on the bottom to avoid overlap.
   */
  private supportsSideLegend(opts: Required<ChartRenderOptions>): boolean {
    const type = opts.type as string;
    return type.startsWith('column') || type === 'line' || type === 'area' || type === 'scatter';
  }

  /** Effective legend position, clamped to bottom for non-cartesian charts. */
  private effectiveLegendPosition(opts: Required<ChartRenderOptions>): LegendPosition {
    if (!this.supportsSideLegend(opts)) return 'bottom';
    return opts.legendPosition;
  }

  private static readonly LEGEND_BAND = 40;
  private static readonly LEGEND_SIDE = 120;

  private getPlotArea(opts: Required<ChartRenderOptions>, data: ChartData) {
    const legendOn = this.legendActive(opts, data);
    const pos = this.effectiveLegendPosition(opts);
    const band = ChartRenderer.LEGEND_BAND;
    const side = ChartRenderer.LEGEND_SIDE;

    const titleH = this.titleBandHeight(opts);
    const xTitleH = opts.xAxisTitle ? opts.fontSize + 10 : 0;
    const yTitleW = opts.yAxisTitle ? opts.fontSize + 12 : 0;

    let plotTop = 20 + titleH;
    let plotBottom = opts.height - 36 - xTitleH;
    let plotLeft = 65 + yTitleW;
    let plotRight = opts.width - 20;

    if (legendOn) {
      if (pos === 'top') plotTop += band;
      else if (pos === 'bottom') plotBottom -= band;
      else if (pos === 'left') plotLeft += side;
      else if (pos === 'right') plotRight -= side;
    }

    return {
      plotLeft,
      plotTop,
      plotRight,
      plotBottom,
      plotW: plotRight - plotLeft,
      plotH: plotBottom - plotTop,
      legendH: legendOn && (pos === 'top' || pos === 'bottom') ? band : 0,
    };
  }

  private draw(data: ChartData, options: Required<ChartRenderOptions>, progress = 1): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (options.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = options.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    let type = options.type as string;
    if (type === 'bar') type = 'column-grouped';

    switch (type) {
      case 'column-grouped':    this.drawColumnGrouped(data, options, progress); break;
      case 'column-stacked':    this.drawColumnStacked(data, options, progress); break;
      case 'column-100stacked': this.drawColumn100Stacked(data, options, progress); break;
      case 'bar-grouped':       this.drawBarGrouped(data, options, progress); break;
      case 'bar-stacked':       this.drawBarStacked(data, options, progress); break;
      case 'bar-100stacked':    this.drawBar100Stacked(data, options, progress); break;
      case 'line':              this.drawLine(data, options, progress); break;
      case 'area':              this.drawArea(data, options, progress); break;
      case 'pie':               this.drawPie(data, options, progress, false); break;
      case 'doughnut':          this.drawPie(data, options, progress, true); break;
      case 'scatter':           this.drawScatter(data, options, progress); break;
      case 'polar':             this.drawPolar(data, options, progress); break;
      case 'funnel':            this.drawFunnel(data, options, progress); break;
      default:                  this.drawColumnGrouped(data, options, progress); break;
    }

    if (this.supportsSideLegend(options)) {
      this.drawAxisTitles(options);
    }
    this.drawTitleBlock(options);

    if (this.legendActive(options, data)) {
      this.drawLegend(data, options);
    }
  }

  /**
   * Draws the chart title and subtitle in the reserved top band, honoring the
   * configured color (falling back to theme) and alignment. No-op when both are
   * empty.
   */
  private drawTitleBlock(opts: Required<ChartRenderOptions>): void {
    if (!opts.title && !opts.subtitle) return;
    const { ctx } = this;
    const theme = this.theme;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    let y = 20;
    if (opts.title) {
      ctx.font = `600 ${opts.titleFontSize}px ${opts.fontFamily}`;
      ctx.fillStyle = opts.titleColor || theme?.textColor || opts.textColor;
      const x = this.alignedX(opts.titleAlign, opts.width);
      ctx.textAlign = opts.titleAlign;
      ctx.fillText(opts.title, x, y);
      y += opts.titleFontSize + 4;
    }
    if (opts.subtitle) {
      ctx.font = `${opts.subtitleFontSize}px ${opts.fontFamily}`;
      ctx.fillStyle = opts.subtitleColor || theme?.mutedColor || opts.textColor;
      const x = this.alignedX(opts.subtitleAlign, opts.width);
      ctx.textAlign = opts.subtitleAlign;
      ctx.fillText(opts.subtitle, x, y + opts.subtitleFontSize);
    }
    ctx.restore();
  }

  /** X coordinate for a given horizontal alignment across the canvas width. */
  private alignedX(align: TextAlign, width: number): number {
    if (align === 'center') return width / 2;
    if (align === 'right') return width - 20;
    return 20;
  }

  /**
   * Draws the x- and y-axis titles (cartesian charts only). The y-axis title is
   * rotated −90° and centered along the left margin; the x-axis title sits below
   * the category labels.
   */
  private drawAxisTitles(opts: Required<ChartRenderOptions>): void {
    if (!opts.xAxisTitle && !opts.yAxisTitle) return;
    const { ctx } = this;
    const color = opts.axisTitleColor || this.theme?.textColor || opts.textColor;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `600 ${opts.fontSize}px ${opts.fontFamily}`;
    if (opts.xAxisTitle) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(opts.xAxisTitle, opts.width / 2, opts.height - 4);
    }
    if (opts.yAxisTitle) {
      ctx.save();
      ctx.translate(14, opts.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.yAxisTitle, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Column Grouped ──────────────────────────────────────────────────────────

  private drawColumnGrouped(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);

    const nDatasets = data.datasets.length;
    const usePerSeries = nDatasets > 1;

    // When datasets have very different magnitudes each series is normalised to
    // its own maximum so every bar group is visually represented.  The Y-axis
    // switches to a relative (0–100 %) scale in that case.
    const seriesMaxes = data.datasets.map((ds) => this.niceMax(Math.max(...ds.data, 0)));
    const globalRawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
    const globalMax = this.niceMax(globalRawMax);

    if (opts.showGrid) {
      if (usePerSeries) this.drawGridLinesRelative(plotLeft, plotTop, plotW, plotH, opts);
      else this.drawGridLines(plotLeft, plotTop, plotW, plotH, globalMax, opts);
    } else {
      this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
    }

    const nGroups = data.labels.length;
    const groupWidth = plotW / Math.max(nGroups, 1);
    const barW = (groupWidth * opts.barWidth) / nDatasets;
    const labelStep = this.getLabelStep(nGroups, plotW, opts.fontSize);
    const rotateLabels = nGroups > 8;
    const labelAlpha = Math.min(1, progress * 2.5);

    for (let gi = 0; gi < nGroups; gi++) {
      const groupX = plotLeft + gi * groupWidth + (groupWidth * (1 - opts.barWidth)) / 2;

      for (let di = 0; di < nDatasets; di++) {
        const value = data.datasets[di].data[gi] ?? 0;
        const maxForSeries = usePerSeries ? (seriesMaxes[di] || 1) : globalMax;
        const seriesScale = this.seriesScales[di] ?? 1;
        const barH = (value / maxForSeries) * plotH * progress * seriesScale;
        const barX = groupX + di * barW;
        const barY = plotBottom - barH;

        ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
        ctx.beginPath();
        ctx.roundRect(barX, barY, Math.max(barW - 1, 1), Math.max(barH, 0), [3, 3, 0, 0]);
        ctx.fill();
      }

      if (gi % labelStep === 0) {
        ctx.save();
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        const labelX = groupX + groupWidth * opts.barWidth * 0.5;
        const labelY = plotBottom + 14;
        if (rotateLabels) {
          ctx.translate(labelX, labelY);
          ctx.rotate(Math.PI / 4);
          ctx.textAlign = 'left';
          ctx.fillText(this.truncate(data.labels[gi], 12), 0, 0);
        } else {
          ctx.textAlign = 'center';
          ctx.fillText(this.truncate(data.labels[gi], 12), labelX, labelY);
        }
        ctx.restore();
      }
    }
  }

  // ── Column Stacked ──────────────────────────────────────────────────────────

  private drawColumnStacked(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);

    const stackTotals = data.labels.map((_, gi) =>
      data.datasets.reduce((sum, ds) => sum + (ds.data[gi] ?? 0), 0),
    );
    const rawMax = Math.max(...stackTotals, 0);
    const maxVal = this.niceMax(rawMax);

    if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, maxVal, opts);
    else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);

    const nGroups = data.labels.length;
    const groupWidth = plotW / Math.max(nGroups, 1);
    const barW = groupWidth * opts.barWidth;
    const labelStep = this.getLabelStep(nGroups, plotW, opts.fontSize);
    const labelAlpha = Math.min(1, progress * 2.5);

    for (let gi = 0; gi < nGroups; gi++) {
      const barX = plotLeft + gi * groupWidth + (groupWidth - barW) / 2;
      let currentY = plotBottom;

      for (let di = 0; di < data.datasets.length; di++) {
        const value = data.datasets[di].data[gi] ?? 0;
        const segH = (value / maxVal) * plotH * progress;
        const segY = currentY - segH;

        ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
        ctx.beginPath();
        if (di === data.datasets.length - 1) {
          ctx.roundRect(barX, segY, Math.max(barW, 1), Math.max(segH, 0), [3, 3, 0, 0]);
        } else {
          ctx.rect(barX, segY, Math.max(barW, 1), Math.max(segH, 0));
        }
        ctx.fill();
        currentY -= segH;
      }

      if (gi % labelStep === 0) {
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(this.truncate(data.labels[gi], 12), barX + barW / 2, plotBottom + 14);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Column 100% Stacked ─────────────────────────────────────────────────────

  private drawColumn100Stacked(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);

    if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, 100, opts);
    else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);

    const nGroups = data.labels.length;
    const groupWidth = plotW / Math.max(nGroups, 1);
    const barW = groupWidth * opts.barWidth;
    const labelStep = this.getLabelStep(nGroups, plotW, opts.fontSize);
    const labelAlpha = Math.min(1, progress * 2.5);

    for (let gi = 0; gi < nGroups; gi++) {
      const total = data.datasets.reduce((sum, ds) => sum + (ds.data[gi] ?? 0), 0) || 1;
      const barX = plotLeft + gi * groupWidth + (groupWidth - barW) / 2;
      let currentY = plotBottom;

      for (let di = 0; di < data.datasets.length; di++) {
        const value = data.datasets[di].data[gi] ?? 0;
        const segH = (value / total) * plotH * progress;
        const segY = currentY - segH;

        ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
        ctx.beginPath();
        if (di === data.datasets.length - 1) {
          ctx.roundRect(barX, segY, Math.max(barW, 1), Math.max(segH, 0), [3, 3, 0, 0]);
        } else {
          ctx.rect(barX, segY, Math.max(barW, 1), Math.max(segH, 0));
        }
        ctx.fill();
        currentY -= segH;
      }

      if (gi % labelStep === 0) {
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(this.truncate(data.labels[gi], 12), barX + barW / 2, plotBottom + 14);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Bar Grouped (horizontal) ────────────────────────────────────────────────

  private drawBarGrouped(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
    const labelAreaW = 80;
    const plotLeft = labelAreaW;
    const plotTop = 10 + this.titleBandHeight(opts);
    const plotRight = opts.width - 20;
    const plotBottom = opts.height - legendH - 30;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    const nDatasets = data.datasets.length;
    const usePerSeries = nDatasets > 1;
    const seriesMaxes = data.datasets.map((ds) => this.niceMax(Math.max(...ds.data, 0)));
    const globalRawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
    const globalMax = this.niceMax(globalRawMax);
    const labelAlpha = Math.min(1, progress * 2.5);

    if (opts.showGrid) {
      const steps = 5;
      ctx.strokeStyle = opts.gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i <= steps; i++) {
        const x = plotLeft + (i / steps) * plotW;
        ctx.beginPath(); ctx.moveTo(x, plotTop); ctx.lineTo(x, plotBottom); ctx.stroke();
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'center';
        const xLabel = usePerSeries
          ? `${Math.round((100 * i) / steps)}%`
          : this.formatNum((globalMax * i) / steps);
        ctx.fillText(xLabel, x, plotBottom + 14);
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(plotLeft, plotTop); ctx.lineTo(plotLeft, plotBottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(plotLeft, plotBottom); ctx.lineTo(plotRight, plotBottom); ctx.stroke();
    } else {
      this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
    }

    const nGroups = data.labels.length;
    const groupH = plotH / Math.max(nGroups, 1);
    const barH = (groupH * opts.barWidth) / nDatasets;
    const labelStep = this.getLabelStep(nGroups, plotH, opts.fontSize);

    for (let gi = 0; gi < nGroups; gi++) {
      const groupY = plotTop + gi * groupH + (groupH * (1 - opts.barWidth)) / 2;
      for (let di = 0; di < nDatasets; di++) {
        const value = data.datasets[di].data[gi] ?? 0;
        const maxForSeries = usePerSeries ? (seriesMaxes[di] || 1) : globalMax;
        const seriesScale = this.seriesScales[di] ?? 1;
        const barW = (value / maxForSeries) * plotW * progress * seriesScale;
        const barY = groupY + di * barH;
        ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
        ctx.beginPath();
        ctx.roundRect(plotLeft, barY, Math.max(barW, 0), Math.max(barH - 1, 1), [0, 3, 3, 0]);
        ctx.fill();
      }
      if (gi % labelStep === 0) {
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.fillText(this.truncate(data.labels[gi], 10), labelAreaW - 6, groupY + groupH * opts.barWidth * 0.5 + opts.fontSize / 3);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Bar Stacked (horizontal) ────────────────────────────────────────────────

  private drawBarStacked(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
    const labelAreaW = 80;
    const plotLeft = labelAreaW;
    const plotTop = 10 + this.titleBandHeight(opts);
    const plotRight = opts.width - 20;
    const plotBottom = opts.height - legendH - 30;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    const stackTotals = data.labels.map((_, gi) =>
      data.datasets.reduce((sum, ds) => sum + (ds.data[gi] ?? 0), 0),
    );
    const rawMax = Math.max(...stackTotals, 0);
    const maxVal = this.niceMax(rawMax);
    const labelAlpha = Math.min(1, progress * 2.5);

    if (opts.showGrid) {
      const steps = 5;
      ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i <= steps; i++) {
        const x = plotLeft + (i / steps) * plotW;
        ctx.beginPath(); ctx.moveTo(x, plotTop); ctx.lineTo(x, plotBottom); ctx.stroke();
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(this.formatNum((maxVal * i) / steps), x, plotBottom + 14);
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(plotLeft, plotTop); ctx.lineTo(plotLeft, plotBottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(plotLeft, plotBottom); ctx.lineTo(plotRight, plotBottom); ctx.stroke();
    } else {
      this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
    }

    const nGroups = data.labels.length;
    const groupH = plotH / Math.max(nGroups, 1);
    const barH = groupH * opts.barWidth;
    const labelStep = this.getLabelStep(nGroups, plotH, opts.fontSize);

    for (let gi = 0; gi < nGroups; gi++) {
      const barY = plotTop + gi * groupH + (groupH - barH) / 2;
      let currentX = plotLeft;
      for (let di = 0; di < data.datasets.length; di++) {
        const value = data.datasets[di].data[gi] ?? 0;
        const segW = (value / maxVal) * plotW * progress;
        ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
        ctx.beginPath();
        if (di === data.datasets.length - 1) {
          ctx.roundRect(currentX, barY, Math.max(segW, 0), Math.max(barH, 1), [0, 3, 3, 0]);
        } else {
          ctx.rect(currentX, barY, Math.max(segW, 0), Math.max(barH, 1));
        }
        ctx.fill();
        currentX += segW;
      }
      if (gi % labelStep === 0) {
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.fillText(this.truncate(data.labels[gi], 10), labelAreaW - 6, barY + barH / 2 + opts.fontSize / 3);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Bar 100% Stacked (horizontal) ──────────────────────────────────────────

  private drawBar100Stacked(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
    const labelAreaW = 80;
    const plotLeft = labelAreaW;
    const plotTop = 10 + this.titleBandHeight(opts);
    const plotRight = opts.width - 20;
    const plotBottom = opts.height - legendH - 30;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;
    const labelAlpha = Math.min(1, progress * 2.5);

    if (opts.showGrid) {
      const steps = 5;
      ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i <= steps; i++) {
        const x = plotLeft + (i / steps) * plotW;
        ctx.beginPath(); ctx.moveTo(x, plotTop); ctx.lineTo(x, plotBottom); ctx.stroke();
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${(100 * i) / steps}%`, x, plotBottom + 14);
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(plotLeft, plotTop); ctx.lineTo(plotLeft, plotBottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(plotLeft, plotBottom); ctx.lineTo(plotRight, plotBottom); ctx.stroke();
    } else {
      this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
    }

    const nGroups = data.labels.length;
    const groupH = plotH / Math.max(nGroups, 1);
    const barH = groupH * opts.barWidth;
    const labelStep = this.getLabelStep(nGroups, plotH, opts.fontSize);

    for (let gi = 0; gi < nGroups; gi++) {
      const total = data.datasets.reduce((sum, ds) => sum + (ds.data[gi] ?? 0), 0) || 1;
      const barY = plotTop + gi * groupH + (groupH - barH) / 2;
      let currentX = plotLeft;
      for (let di = 0; di < data.datasets.length; di++) {
        const value = data.datasets[di].data[gi] ?? 0;
        const segW = (value / total) * plotW * progress;
        ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
        ctx.beginPath();
        if (di === data.datasets.length - 1) {
          ctx.roundRect(currentX, barY, Math.max(segW, 0), Math.max(barH, 1), [0, 3, 3, 0]);
        } else {
          ctx.rect(currentX, barY, Math.max(segW, 0), Math.max(barH, 1));
        }
        ctx.fill();
        currentX += segW;
      }
      if (gi % labelStep === 0) {
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.fillText(this.truncate(data.labels[gi], 10), labelAreaW - 6, barY + barH / 2 + opts.fontSize / 3);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Line ────────────────────────────────────────────────────────────────────

  private drawLine(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);

    const rawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
    const maxVal = this.niceMax(rawMax);
    const nPoints = data.labels.length;
    const labelAlpha = Math.min(1, progress * 2.5);

    if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, maxVal, opts);
    else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);

    const getX = (i: number) => plotLeft + (i / Math.max(1, nPoints - 1)) * plotW;
    const getY = (v: number) => plotBottom - (v / maxVal) * plotH;
    const visibleCount = Math.max(2, Math.round(nPoints * progress));

    for (const ds of data.datasets) {
      ctx.save();
      ctx.beginPath(); ctx.rect(plotLeft, plotTop, plotW, plotH + 1); ctx.clip();
      ctx.strokeStyle = ds.color ?? APEX_COLORS[0];
      ctx.lineWidth = opts.lineWidth;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
        const x = getX(i); const y = getY(ds.data[i] ?? 0);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
        ctx.beginPath();
        ctx.arc(getX(i), getY(ds.data[i] ?? 0), 3, 0, Math.PI * 2);
        ctx.fillStyle = ds.color ?? APEX_COLORS[0];
        ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.restore();
    }

    const labelStep = this.getLabelStep(nPoints, plotW, opts.fontSize);
    ctx.globalAlpha = labelAlpha;
    ctx.fillStyle = opts.textColor;
    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    ctx.textAlign = 'center';
    for (let i = 0; i < nPoints; i++) {
      if (i % labelStep === 0) ctx.fillText(this.truncate(data.labels[i], 10), getX(i), plotBottom + 16);
    }
    ctx.globalAlpha = 1;
  }

  // ── Area ────────────────────────────────────────────────────────────────────

  private drawArea(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);

    const rawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
    const maxVal = this.niceMax(rawMax);
    const nPoints = data.labels.length;
    const labelAlpha = Math.min(1, progress * 2.5);

    if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, maxVal, opts);
    else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);

    const getX = (i: number) => plotLeft + (i / Math.max(1, nPoints - 1)) * plotW;
    const getY = (v: number) => plotBottom - (v / maxVal) * plotH;
    const visibleCount = Math.max(2, Math.round(nPoints * progress));

    for (const ds of data.datasets) {
      ctx.save();
      ctx.beginPath(); ctx.rect(plotLeft, plotTop, plotW, plotH + 1); ctx.clip();
      const color = ds.color ?? APEX_COLORS[0];
      ctx.beginPath();
      for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
        const x = getX(i); const y = getY(ds.data[i] ?? 0);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineTo(getX(Math.min(visibleCount, nPoints) - 1), plotBottom);
      ctx.lineTo(getX(0), plotBottom);
      ctx.closePath();
      ctx.fillStyle = color + '26'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = opts.lineWidth;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
        const x = getX(i); const y = getY(ds.data[i] ?? 0);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    const labelStep = this.getLabelStep(nPoints, plotW, opts.fontSize);
    ctx.globalAlpha = labelAlpha;
    ctx.fillStyle = opts.textColor;
    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    ctx.textAlign = 'center';
    for (let i = 0; i < nPoints; i++) {
      if (i % labelStep === 0) ctx.fillText(this.truncate(data.labels[i], 10), getX(i), plotBottom + 16);
    }
    ctx.globalAlpha = 1;
  }

  // ── Pie / Doughnut ──────────────────────────────────────────────────────────

  private drawPie(data: ChartData, opts: Required<ChartRenderOptions>, progress: number, isDoughnut: boolean): void {
    const { ctx } = this;
    const legendH = opts.showLegend ? 40 : 0;
    const cx = opts.width / 2;
    const cy = this.titleBandHeight(opts) + (opts.height - legendH - this.titleBandHeight(opts)) / 2;
    const radius = Math.min(opts.width, opts.height - legendH - this.titleBandHeight(opts)) / 2 - 20;
    const innerRadius = isDoughnut ? radius * 0.5 : 0;
    const values = data.datasets[0]?.data ?? [];
    const total = values.reduce((a, b) => a + b, 0) || 1;

    let startAngle = -Math.PI / 2;
    for (let i = 0; i < values.length; i++) {
      const sliceAngle = (values[i] / total) * Math.PI * 2 * progress;
      const color = this.paletteColor(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      if (innerRadius > 0) ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      if (progress === 1 && values[i] / total > 0.05) {
        const mid = startAngle + sliceAngle / 2;
        const lr = isDoughnut ? (radius + innerRadius) / 2 : radius * 0.65;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round((values[i] / total) * 100)}%`, cx + Math.cos(mid) * lr, cy + Math.sin(mid) * lr);
        ctx.textBaseline = 'alphabetic';
      }
      startAngle += sliceAngle;
    }

    if (progress > 0.9 && opts.showLegend && data.labels.length <= 8) {
      const alpha = (progress - 0.9) / 0.1;
      ctx.globalAlpha = alpha;
      startAngle = -Math.PI / 2;
      for (let i = 0; i < values.length; i++) {
        const sliceAngle = (values[i] / total) * Math.PI * 2;
        const mid = startAngle + sliceAngle / 2;
        const lx = cx + Math.cos(mid) * (radius + 16);
        const ly = cy + Math.sin(mid) * (radius + 16);
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = Math.cos(mid) > 0 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.truncate(data.labels[i], 12), lx, ly);
        ctx.textBaseline = 'alphabetic';
        startAngle += sliceAngle;
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── Scatter ─────────────────────────────────────────────────────────────────

  private drawScatter(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);

    const rawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
    const maxVal = this.niceMax(rawMax);
    const nPoints = data.labels.length;
    const labelAlpha = Math.min(1, progress * 2.5);

    if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, maxVal, opts);
    else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);

    const getX = (i: number) => plotLeft + (i / Math.max(1, nPoints - 1)) * plotW;
    const getY = (v: number) => plotBottom - (v / maxVal) * plotH;
    const visibleCount = Math.round(nPoints * progress);

    for (let di = 0; di < data.datasets.length; di++) {
      const ds = data.datasets[di];
      const color = ds.color ?? APEX_COLORS[di % APEX_COLORS.length];
      for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
        ctx.beginPath();
        ctx.arc(getX(i), getY(ds.data[i] ?? 0), 5, 0, Math.PI * 2);
        ctx.fillStyle = color + 'CC'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    const labelStep = this.getLabelStep(nPoints, plotW, opts.fontSize);
    ctx.globalAlpha = labelAlpha;
    ctx.fillStyle = opts.textColor;
    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    ctx.textAlign = 'center';
    for (let i = 0; i < nPoints; i++) {
      if (i % labelStep === 0) ctx.fillText(this.truncate(data.labels[i], 10), getX(i), plotBottom + 16);
    }
    ctx.globalAlpha = 1;
  }

  // ── Polar / Radar ────────────────────────────────────────────────────────────

  private drawPolar(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
    const cx = opts.width / 2;
    const cy = this.titleBandHeight(opts) + (opts.height - legendH - this.titleBandHeight(opts)) / 2;
    const radius = Math.min(opts.width, opts.height - legendH - this.titleBandHeight(opts)) / 2 - 30;
    const labels = data.labels;
    const nSpokes = labels.length;
    if (nSpokes < 3) return;

    const allValues = data.datasets.flatMap((d) => d.data);
    const maxVal = this.niceMax(Math.max(...allValues, 0));

    ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      const r = (ring / 4) * radius;
      for (let i = 0; i < nSpokes; i++) {
        const angle = (i / nSpokes) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r; const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.setLineDash([]);

    for (let i = 0; i < nSpokes; i++) {
      const angle = (i / nSpokes) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius); ctx.stroke();
      ctx.globalAlpha = Math.min(1, progress * 2.5);
      ctx.fillStyle = opts.textColor;
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.truncate(labels[i], 10), cx + Math.cos(angle) * (radius + 14), cy + Math.sin(angle) * (radius + 14));
      ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
    }

    for (let di = 0; di < data.datasets.length; di++) {
      const ds = data.datasets[di];
      const color = ds.color ?? APEX_COLORS[di % APEX_COLORS.length];
      ctx.beginPath();
      for (let i = 0; i < nSpokes; i++) {
        const angle = (i / nSpokes) * Math.PI * 2 - Math.PI / 2;
        const val = ((ds.data[i] ?? 0) / maxVal) * radius * progress;
        const x = cx + Math.cos(angle) * val; const y = cy + Math.sin(angle) * val;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = color + '33'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  // ── Funnel ──────────────────────────────────────────────────────────────────

  private drawFunnel(data: ChartData, opts: Required<ChartRenderOptions>, progress: number): void {
    const { ctx } = this;
    const labels = data.labels;
    const values = data.datasets[0]?.data ?? [];
    const maxVal = Math.max(...values, 0) || 1;
    const n = labels.length;
    const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
    const labelAreaW = 90;
    const plotLeft = labelAreaW;
    const plotRight = opts.width - 20;
    const plotWidth = plotRight - plotLeft;
    const plotTop = 10 + this.titleBandHeight(opts);
    const plotBottom = opts.height - legendH - 10;
    const plotH = plotBottom - plotTop;
    const itemH = Math.max((plotH / Math.max(n, 1)) - 2, 1);
    const cx = plotLeft + plotWidth / 2;
    const labelAlpha = Math.min(1, progress * 2.5);

    for (let i = 0; i < n; i++) {
      const pct = (values[i] ?? 0) / maxVal;
      const barW = pct * plotWidth * progress;
      const barX = cx - barW / 2;
      const barY = plotTop + i * (itemH + 2);
      const color = this.paletteColor(i);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(barW, 0), itemH, 3); ctx.fill();
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = opts.textColor;
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.fillText(this.truncate(labels[i], 12), labelAreaW - 6, barY + itemH / 2 + opts.fontSize / 3);
      ctx.globalAlpha = 1;
      if (progress === 1 && barW > 50) {
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(this.formatNum(values[i] ?? 0), cx, barY + itemH / 2 + opts.fontSize / 3);
      }
    }
  }

  // ── Grid Lines ──────────────────────────────────────────────────────────────

  private drawGridLines(left: number, top: number, width: number, height: number, maxVal: number, opts: Required<ChartRenderOptions>): void {
    const { ctx } = this;
    const steps = 5;
    ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= steps; i++) {
      const y = top + height - (i / steps) * height;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + width, y); ctx.stroke();
      if (opts.showYLabels) {
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.fillText(this.formatNum((maxVal * i) / steps), left - 6, y + 4);
      }
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, top + height); ctx.lineTo(left + width, top + height); ctx.stroke();
  }

  /**
   * Draws relative (0–100 %) Y-axis gridlines for multi-series charts where each
   * dataset is normalised to its own maximum, making the shared axis unitless.
   */
  private drawGridLinesRelative(left: number, top: number, width: number, height: number, opts: Required<ChartRenderOptions>): void {
    const { ctx } = this;
    const steps = 4;
    ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= steps; i++) {
      const y = top + height - (i / steps) * height;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + width, y); ctx.stroke();
      if (opts.showYLabels) {
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round((100 * i) / steps)}%`, left - 6, y + 4);
      }
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, top + height); ctx.lineTo(left + width, top + height); ctx.stroke();
  }

  // ── Legend ──────────────────────────────────────────────────────────────────

  private drawLegend(data: ChartData, opts: Required<ChartRenderOptions>): void {
    const position = this.effectiveLegendPosition(opts);
    if (position === 'left' || position === 'right') {
      this.drawLegendVertical(data, opts, position);
    } else {
      this.drawLegendHorizontal(data, opts, position);
    }
  }

  /** Horizontal legend row along the top or bottom edge. */
  private drawLegendHorizontal(
    data: ChartData,
    opts: Required<ChartRenderOptions>,
    position: 'top' | 'bottom',
  ): void {
    const { ctx } = this;
    const y = position === 'top' ? this.titleBandHeight(opts) + 22 : opts.height - 16;
    const totalItems = data.datasets.length;
    const itemWidth = opts.width / totalItems;
    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let i = 0; i < totalItems; i++) {
      const x = i * itemWidth + (itemWidth - 80) / 2;
      ctx.fillStyle = data.datasets[i].color ?? this.paletteColor(i);
      ctx.beginPath(); ctx.roundRect(x, y - 5, 12, 10, 2); ctx.fill();
      ctx.fillStyle = opts.textColor;
      ctx.fillText(this.truncate(data.datasets[i].label, 14), x + 16, y);
    }
    ctx.textBaseline = 'alphabetic';
  }

  /** Vertical legend stack along the left or right edge (cartesian charts only). */
  private drawLegendVertical(
    data: ChartData,
    opts: Required<ChartRenderOptions>,
    position: 'left' | 'right',
  ): void {
    const { ctx } = this;
    const rowH = opts.fontSize + 10;
    const totalItems = data.datasets.length;
    const blockH = totalItems * rowH;
    const startY = Math.max(this.titleBandHeight(opts) + 24, (opts.height - blockH) / 2);
    const x = position === 'left' ? 12 : opts.width - ChartRenderer.LEGEND_SIDE + 12;
    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let i = 0; i < totalItems; i++) {
      const y = startY + i * rowH + rowH / 2;
      ctx.fillStyle = data.datasets[i].color ?? this.paletteColor(i);
      ctx.beginPath(); ctx.roundRect(x, y - 5, 12, 10, 2); ctx.fill();
      ctx.fillStyle = opts.textColor;
      ctx.fillText(this.truncate(data.datasets[i].label, 14), x + 16, y);
    }
    ctx.textBaseline = 'alphabetic';
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private drawAxes(left: number, top: number, right: number, bottom: number, opts: Required<ChartRenderOptions>): void {
    const { ctx } = this;
    ctx.setLineDash([]);
    ctx.strokeStyle = opts.gridColor; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
  }

  private niceMax(rawMax: number): number {
    if (rawMax <= 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const s of steps) {
      if (s * magnitude >= rawMax) return s * magnitude;
    }
    return 10 * magnitude;
  }

  private getLabelStep(count: number, availablePixels: number, fontSize: number): number {
    const approxLabelW = fontSize * 5.5;
    return Math.max(1, Math.ceil((count * approxLabelW) / availablePixels));
  }

  private easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  private truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }

  private formatNum(n: number): string {
    if (n >= 1e6)  return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
    if (n >= 1e3)  return (n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1) + 'K';
    if (n !== Math.floor(n)) return n.toFixed(1);
    return String(Math.round(n));
  }
}
