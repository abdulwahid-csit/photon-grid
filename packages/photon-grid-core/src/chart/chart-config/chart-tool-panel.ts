import type { ChartPanelType } from '../chart-panel';
import type { ChartModel, ChartModelPatch, LegendPosition, TextAlign } from '../model/chart-model';
import type { ChartToolPanelName } from '../../types/grid.types';
import type { ChartData } from '../chart-data-transformer';
import { ChartRenderer } from '../chart-renderer';
import { AGGREGATION_OPTIONS } from '../model/chart-model-mapper';
import {
  createCollapsibleSection,
  createColorInput,
  createDropdown,
  createNumberInput,
  createReorderableList,
  createSegmented,
  createTextInput,
  createToggle,
} from './chart-controls';

/** A column offered to the Set Up tab for category / series roles. */
export interface ChartColumnOption {
  readonly colId: string;
  readonly header: string;
  readonly isMeasure: boolean;
  readonly isDimension: boolean;
}

/**
 * Controller behind a {@link ChartToolPanel}. Supplies the current model and the
 * available columns, and applies model patches produced by the controls.
 */
export interface ChartToolPanelHost {
  getModel(): ChartModel;
  updateModel(patch: ChartModelPatch): void;
  getColumnOptions(): ChartColumnOption[];
  getPanels(): ChartToolPanelName[];
  getDefaultPanel(): ChartToolPanelName;
}

/** A selectable chart type in the Chart tab gallery. */
interface GalleryEntry {
  readonly type: ChartPanelType;
  readonly label: string;
}

/** Gallery groups mirroring AG Grid's Chart tab. */
const GALLERY: ReadonlyArray<{ group: string; entries: readonly GalleryEntry[] }> = [
  {
    group: 'Column',
    entries: [
      { type: 'column-grouped', label: 'Grouped' },
      { type: 'column-stacked', label: 'Stacked' },
      { type: 'column-100stacked', label: '100% Stacked' },
    ],
  },
  {
    group: 'Bar',
    entries: [
      { type: 'bar-grouped', label: 'Grouped' },
      { type: 'bar-stacked', label: 'Stacked' },
      { type: 'bar-100stacked', label: '100% Stacked' },
    ],
  },
  {
    group: 'Pie',
    entries: [
      { type: 'pie', label: 'Pie' },
      { type: 'doughnut', label: 'Doughnut' },
      { type: 'polar', label: 'Polar' },
    ],
  },
  {
    group: 'Line & Area',
    entries: [
      { type: 'line', label: 'Line' },
      { type: 'area', label: 'Area' },
      { type: 'scatter', label: 'Scatter' },
    ],
  },
  {
    group: 'Other',
    entries: [{ type: 'funnel', label: 'Funnel' }],
  },
];

/**
 * Fixed sample data used to draw each gallery thumbnail. Two short series give
 * every chart family a representative silhouette (grouped vs. stacked columns,
 * multi-slice pies, two-line charts). Labels are intentionally empty so previews
 * render as pure, full-bleed charts with no category text.
 */
const PREVIEW_DATA: ChartData = {
  labels: ['', '', '', ''],
  datasets: [
    { label: 'Series 1', data: [6, 9, 5, 8] },
    { label: 'Series 2', data: [4, 6, 8, 5] },
  ],
};

/** Fallback thumbnail resolution used before the canvas has been laid out. */
const THUMB_W = 132;
const THUMB_H = 64;

/** Drawer slide duration; must match the CSS `transition` on `.pg-chart-config`. */
const DRAWER_TRANSITION_MS = 240;

const LEGEND_POSITIONS: ReadonlyArray<{ value: LegendPosition; label: string }> = [
  { value: 'top', label: 'Top' },
  { value: 'right', label: 'Right' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
];

const ALIGNMENTS: ReadonlyArray<{ value: TextAlign; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

/** Font-family presets offered in the Customize tab. Empty value inherits the theme font. */
const FONT_FAMILIES: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Theme default' },
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Roboto, Arial, sans-serif', label: 'Roboto' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
  { value: '"Courier New", monospace', label: 'Monospace' },
];

const ICON_CLOSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

const TAB_LABELS: Record<ChartToolPanelName, string> = {
  chart: 'Chart',
  setup: 'Set Up',
  customize: 'Customize',
};

/**
 * The docked chart configuration panel. Renders the Chart / Set Up / Customize
 * tabs from the current {@link ChartModel} and forwards every edit back to the
 * host as a model patch. Purely presentational — it holds no chart state.
 */
export class ChartToolPanel {
  private rootEl: HTMLElement | null = null;
  private tabsEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private activeTab: ChartToolPanelName;
  /** Live renderers backing the Chart-tab preview thumbnails; disposed on rebuild. */
  private thumbRenderers: ChartRenderer[] = [];
  /** Pending slide-in RAF handle, so an immediate destroy can cancel it. */
  private openRaf: number | null = null;
  /** Pending slide-out timer, cleared if the panel is reopened or destroyed. */
  private closeTimer: number | null = null;

  constructor(
    private readonly containerEl: HTMLElement,
    private readonly host: ChartToolPanelHost,
    /** Notified with the drawer's width on open and 0 on close, so the host can
     * reflow the chart beside the drawer instead of behind it. */
    private readonly onReserveChange?: (px: number) => void,
  ) {
    this.activeTab = host.getDefaultPanel();
  }

  /** Whether the panel is currently mounted. */
  isOpen(): boolean {
    return this.rootEl !== null;
  }

  /** Mounts the drawer (optionally on a specific tab), rendering and sliding it in. */
  open(tab?: ChartToolPanelName): void {
    if (tab) this.activeTab = tab;
    // A pending slide-out is aborted so a reopen resolves to the open state.
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    if (!this.rootEl) this.build();
    else this.render();
    this.slideIn();
    // Reserve the chart space for the drawer's width so the chart reflows beside it.
    this.onReserveChange?.(this.rootEl ? this.rootEl.offsetWidth : 0);
  }

  /**
   * Slides the drawer out (left → right) and unmounts it once the transition
   * ends. The instance is retained so a later {@link open} rebuilds cleanly.
   */
  close(): void {
    if (!this.rootEl) return;
    if (this.openRaf !== null) {
      cancelAnimationFrame(this.openRaf);
      this.openRaf = null;
    }
    this.rootEl.classList.remove('pg-chart-config--open');
    this.onReserveChange?.(0);
    const root = this.rootEl;
    this.closeTimer = window.setTimeout(() => {
      this.closeTimer = null;
      if (this.rootEl === root) this.teardown();
    }, DRAWER_TRANSITION_MS);
  }

  /** Immediately unmounts and disposes the drawer with no exit animation. */
  destroy(): void {
    if (this.openRaf !== null) {
      cancelAnimationFrame(this.openRaf);
      this.openRaf = null;
    }
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.onReserveChange?.(0);
    this.teardown();
  }

  /** Removes the DOM and releases the preview renderers. */
  private teardown(): void {
    this.disposeThumbnails();
    this.rootEl?.remove();
    this.rootEl = null;
    this.tabsEl = null;
    this.bodyEl = null;
  }

  /** Adds the open modifier on the next frame so the slide-in transition runs. */
  private slideIn(): void {
    if (!this.rootEl) return;
    const root = this.rootEl;
    if (root.classList.contains('pg-chart-config--open')) return;
    this.openRaf = requestAnimationFrame(() => {
      this.openRaf = null;
      root.classList.add('pg-chart-config--open');
    });
  }

  /** Rebuilds the tab strip and active tab body from the current model. */
  render(): void {
    if (!this.tabsEl || !this.bodyEl) return;
    this.renderTabs();
    this.renderBody();
  }

  private build(): void {
    const root = document.createElement('div');
    root.className = 'pg-chart-config';

    const header = document.createElement('div');
    header.className = 'pg-chart-config__header';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pg-chart-config__close';
    closeBtn.title = 'Close settings';
    closeBtn.innerHTML = ICON_CLOSE;
    closeBtn.addEventListener('click', () => this.close());
    const tabs = document.createElement('div');
    tabs.className = 'pg-chart-config__tabs';
    header.appendChild(closeBtn);
    header.appendChild(tabs);

    const body = document.createElement('div');
    body.className = 'pg-chart-config__body';

    root.appendChild(header);
    root.appendChild(body);
    this.containerEl.appendChild(root);

    this.rootEl = root;
    this.tabsEl = tabs;
    this.bodyEl = body;
    this.render();
  }

  private renderTabs(): void {
    const tabs = this.tabsEl!;
    tabs.innerHTML = '';
    for (const name of this.host.getPanels()) {
      const btn = document.createElement('button');
      btn.className = 'pg-chart-config__tab';
      btn.classList.toggle('pg-chart-config__tab--active', name === this.activeTab);
      btn.textContent = TAB_LABELS[name];
      btn.addEventListener('click', () => {
        this.activeTab = name;
        this.render();
      });
      tabs.appendChild(btn);
    }
  }

  private renderBody(): void {
    // Preview renderers only exist on the Chart tab; release them before any
    // rebuild so switching tabs or editing never leaks canvases/animation RAFs.
    this.disposeThumbnails();
    const body = this.bodyEl!;
    body.innerHTML = '';
    const model = this.host.getModel();
    switch (this.activeTab) {
      case 'chart':     this.renderChartTab(body, model); break;
      case 'setup':     this.renderSetupTab(body, model); break;
      case 'customize': this.renderCustomizeTab(body, model); break;
    }
  }

  // ── Chart tab: type gallery with live previews ─────────────────────────────

  private renderChartTab(body: HTMLElement, model: ChartModel): void {
    // Collect (canvas, type) pairs while building, then render in a second pass
    // once every canvas is attached to the DOM — the renderer resolves theme
    // tokens via getComputedStyle, which only works on connected elements.
    const pending: Array<{ canvas: HTMLCanvasElement; type: ChartPanelType }> = [];

    for (const { group, entries } of GALLERY) {
      const heading = document.createElement('div');
      heading.className = 'pg-chart-config__group-title';
      heading.textContent = group;
      body.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'pg-chart-config__gallery';
      for (const entry of entries) {
        grid.appendChild(this.buildGalleryItem(entry, entry.type === model.chartType, pending));
      }
      body.appendChild(grid);
    }

    for (const { canvas, type } of pending) this.renderThumbnail(canvas, type);
  }

  /**
   * Builds one gallery cell: a real, full-bleed mini-chart of {@link PREVIEW_DATA}
   * rendered in the entry's type. Clicking applies the type to the model, which
   * updates the live chart in real time. The canvas is queued in `pending` for
   * rendering after DOM insertion (so it has a measured size and theme tokens).
   */
  private buildGalleryItem(
    entry: GalleryEntry,
    active: boolean,
    pending: Array<{ canvas: HTMLCanvasElement; type: ChartPanelType }>,
  ): HTMLElement {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'pg-chart-config__gallery-item';
    cell.classList.toggle('pg-chart-config__gallery-item--active', active);
    cell.title = entry.label;
    cell.setAttribute('aria-label', entry.label);

    const canvas = document.createElement('canvas');
    canvas.className = 'pg-chart-config__gallery-canvas';

    cell.appendChild(canvas);
    // Structural change: apply the type, then re-render the tab so the active
    // highlight moves. Safe to rebuild here — a gallery click has no open input.
    cell.addEventListener('click', () => { this.host.updateModel({ chartType: entry.type }); this.render(); });

    pending.push({ canvas, type: entry.type });
    return cell;
  }

  /**
   * Draws a static, full-bleed preview of a chart type into a thumbnail canvas.
   * The backing store is sized to the canvas's measured display size × DPR for a
   * crisp, undistorted image; `compact` collapses the axis gutters so the chart
   * fills the cell edge-to-edge.
   */
  private renderThumbnail(canvas: HTMLCanvasElement, type: ChartPanelType): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || THUMB_W;
    const cssH = canvas.clientHeight || THUMB_H;
    const renderer = new ChartRenderer(canvas);
    renderer.render(PREVIEW_DATA, {
      type,
      width: Math.round(cssW * dpr),
      height: Math.round(cssH * dpr),
      padding: Math.round(6 * dpr),
      compact: true,
      animationDuration: 0,
      showGrid: false,
      showLegend: false,
    });
    this.thumbRenderers.push(renderer);
  }

  /** Disposes every preview renderer created for the Chart tab. */
  private disposeThumbnails(): void {
    for (const renderer of this.thumbRenderers) renderer.destroy();
    this.thumbRenderers = [];
  }

  // ── Set Up tab: category / series / aggregate / switch ─────────────────────

  private renderSetupTab(body: HTMLElement, model: ChartModel): void {
    const columns = this.host.getColumnOptions();

    const catSection = createCollapsibleSection('Categories', true);
    const dimOptions = columns
      .filter((c) => c.isDimension || !c.isMeasure)
      .map((c) => ({ value: c.colId, label: c.header }));
    catSection.body.appendChild(
      createDropdown(
        dimOptions.length > 0 ? dimOptions : columns.map((c) => ({ value: c.colId, label: c.header })),
        model.categoryColId,
        (colId) => this.host.updateModel({ categoryColId: colId }),
      ),
    );
    catSection.body.appendChild(
      createToggle(
        model.aggregation !== 'none',
        (on) => this.host.updateModel({ aggregation: on ? 'sum' : 'none' }),
        'Aggregate',
      ),
    );
    body.appendChild(catSection.section);

    const seriesSection = createCollapsibleSection('Series', true);
    const seriesItems = model.seriesColIds.map((id) => {
      const col = columns.find((c) => c.colId === id);
      return { id, label: col?.header ?? id, color: model.series.colorByKey[col?.header ?? id] };
    });
    seriesSection.body.appendChild(
      createReorderableList(
        seriesItems,
        (orderedIds) => this.host.updateModel({ seriesColIds: orderedIds }),
        // Removing a series changes the list structure → refresh the tab.
        (id) => { this.host.updateModel({ seriesColIds: model.seriesColIds.filter((s) => s !== id) }); this.render(); },
      ),
    );

    // "Add series" dropdown of measure columns not already plotted.
    const addable = columns.filter((c) => c.isMeasure && !model.seriesColIds.includes(c.colId));
    if (addable.length > 0) {
      seriesSection.body.appendChild(
        createDropdown(
          [{ value: '', label: '+ Add series…' }, ...addable.map((c) => ({ value: c.colId, label: c.header }))],
          '',
          (colId) => {
            if (colId) { this.host.updateModel({ seriesColIds: [...model.seriesColIds, colId] }); this.render(); }
          },
        ),
      );
    }
    body.appendChild(seriesSection.section);

    const optSection = createCollapsibleSection('Aggregation', false);
    optSection.body.appendChild(
      createDropdown(
        AGGREGATION_OPTIONS.map((a) => ({ value: a, label: a === 'none' ? 'None' : a.toUpperCase() })),
        model.aggregation,
        (agg) => this.host.updateModel({ aggregation: agg as ChartModel['aggregation'] }),
        'Function',
      ),
    );
    optSection.body.appendChild(
      createToggle(
        model.switchCategorySeries,
        (on) => this.host.updateModel({ switchCategorySeries: on }),
        'Switch Category / Series',
      ),
    );
    body.appendChild(optSection.section);
  }

  // ── Customize tab: style / titles / legend / series / axes ─────────────────

  private renderCustomizeTab(body: HTMLElement, model: ChartModel): void {
    const style = createCollapsibleSection('Chart Style', true);
    style.body.appendChild(
      createColorInput(model.style.backgroundColor ?? '#ffffff', (c) => this.host.updateModel({ style: { backgroundColor: c } }), 'Background'),
    );
    style.body.appendChild(
      createDropdown(FONT_FAMILIES, model.style.fontFamily ?? '', (f) => this.host.updateModel({ style: { fontFamily: f } }), 'Font family'),
    );
    style.body.appendChild(
      createNumberInput(model.style.fontSize ?? 12, (n) => this.host.updateModel({ style: { fontSize: n } }), 'Font size', 8, 32),
    );
    body.appendChild(style.section);

    const titles = createCollapsibleSection('Titles', false);
    titles.body.appendChild(createTextInput(model.title.text ?? '', (t) => this.host.updateModel({ title: { text: t } }), 'Title', 'Chart title'));
    titles.body.appendChild(createColorInput(model.title.color ?? '#0f172a', (c) => this.host.updateModel({ title: { color: c } }), 'Title color'));
    titles.body.appendChild(createSegmented(ALIGNMENTS, model.title.align ?? 'left', (a) => this.host.updateModel({ title: { align: a as TextAlign } }), 'Title align'));
    titles.body.appendChild(createTextInput(model.subtitle.text ?? '', (t) => this.host.updateModel({ subtitle: { text: t } }), 'Subtitle', 'Subtitle'));
    titles.body.appendChild(createColorInput(model.subtitle.color ?? '#64748b', (c) => this.host.updateModel({ subtitle: { color: c } }), 'Subtitle color'));
    titles.body.appendChild(createSegmented(ALIGNMENTS, model.subtitle.align ?? 'left', (a) => this.host.updateModel({ subtitle: { align: a as TextAlign } }), 'Subtitle align'));
    body.appendChild(titles.section);

    const legend = createCollapsibleSection('Legend', false);
    legend.body.appendChild(createToggle(model.legend.enabled, (on) => this.host.updateModel({ legend: { enabled: on } }), 'Show legend'));
    legend.body.appendChild(createSegmented(LEGEND_POSITIONS, model.legend.position, (p) => this.host.updateModel({ legend: { position: p as LegendPosition } }), 'Position'));
    body.appendChild(legend.section);

    const series = createCollapsibleSection('Series', false);
    const columns = this.host.getColumnOptions();
    for (const id of model.seriesColIds) {
      const header = columns.find((c) => c.colId === id)?.header ?? id;
      series.body.appendChild(
        createColorInput(
          model.series.colorByKey[header] ?? '#008ffb',
          (c) => this.host.updateModel({ series: { colorByKey: { [header]: c } } }),
          header,
        ),
      );
    }
    // Stroke width and fill opacity apply to line/area series across the chart.
    series.body.appendChild(
      createNumberInput(model.series.strokeWidth ?? 2, (n) => this.host.updateModel({ series: { strokeWidth: n } }), 'Stroke width', 0, 10, 0.5),
    );
    series.body.appendChild(
      createNumberInput(model.series.fillOpacity ?? 0.4, (n) => this.host.updateModel({ series: { fillOpacity: n } }), 'Fill opacity', 0, 1, 0.05),
    );
    body.appendChild(series.section);

    const xAxis = createCollapsibleSection('Horizontal Axis', false);
    xAxis.body.appendChild(createTextInput(model.xAxis.title ?? '', (t) => this.host.updateModel({ xAxis: { title: t } }), 'Title', 'X-axis title'));
    xAxis.body.appendChild(createColorInput(model.xAxis.labelColor ?? '#64748b', (c) => this.host.updateModel({ xAxis: { labelColor: c } }), 'Label color'));
    xAxis.body.appendChild(createColorInput(model.xAxis.lineColor ?? '#e2e8f0', (c) => this.host.updateModel({ xAxis: { lineColor: c } }), 'Line color'));
    xAxis.body.appendChild(createToggle(model.xAxis.showGridLines ?? false, (on) => this.host.updateModel({ xAxis: { showGridLines: on } }), 'Show grid lines'));
    xAxis.body.appendChild(createToggle(model.xAxis.showLabels ?? true, (on) => this.host.updateModel({ xAxis: { showLabels: on } }), 'Show labels'));
    body.appendChild(xAxis.section);

    const yAxis = createCollapsibleSection('Vertical Axis', false);
    yAxis.body.appendChild(createTextInput(model.yAxis.title ?? '', (t) => this.host.updateModel({ yAxis: { title: t } }), 'Title', 'Y-axis title'));
    yAxis.body.appendChild(createColorInput(model.yAxis.labelColor ?? '#64748b', (c) => this.host.updateModel({ yAxis: { labelColor: c } }), 'Label color'));
    yAxis.body.appendChild(createColorInput(model.yAxis.lineColor ?? '#e2e8f0', (c) => this.host.updateModel({ yAxis: { lineColor: c } }), 'Line color'));
    yAxis.body.appendChild(createToggle(model.yAxis.showGridLines ?? true, (on) => this.host.updateModel({ yAxis: { showGridLines: on } }), 'Show grid lines'));
    yAxis.body.appendChild(createToggle(model.yAxis.showLabels ?? true, (on) => this.host.updateModel({ yAxis: { showLabels: on } }), 'Show labels'));
    body.appendChild(yAxis.section);
  }
}
