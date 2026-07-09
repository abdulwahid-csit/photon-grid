import type { ChartPanelType } from '../chart-panel';
import type { ChartModel, ChartModelPatch, LegendPosition, TextAlign } from '../model/chart-model';
import type { ChartToolPanelName } from '../../types/grid.types';
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
  readonly icon: string;
}

/** Gallery groups mirroring AG Grid's Chart tab. */
const GALLERY: ReadonlyArray<{ group: string; entries: readonly GalleryEntry[] }> = [
  {
    group: 'Column',
    entries: [
      { type: 'column-grouped', label: 'Grouped', icon: barsIcon(false) },
      { type: 'column-stacked', label: 'Stacked', icon: stackedIcon(false) },
      { type: 'column-100stacked', label: '100% Stacked', icon: stackedIcon(false) },
    ],
  },
  {
    group: 'Bar',
    entries: [
      { type: 'bar-grouped', label: 'Grouped', icon: barsIcon(true) },
      { type: 'bar-stacked', label: 'Stacked', icon: stackedIcon(true) },
      { type: 'bar-100stacked', label: '100% Stacked', icon: stackedIcon(true) },
    ],
  },
  {
    group: 'Pie',
    entries: [
      { type: 'pie', label: 'Pie', icon: pieIcon(false) },
      { type: 'doughnut', label: 'Doughnut', icon: pieIcon(true) },
      { type: 'polar', label: 'Polar', icon: pieIcon(false) },
    ],
  },
  {
    group: 'Line & Area',
    entries: [
      { type: 'line', label: 'Line', icon: lineIcon(false) },
      { type: 'area', label: 'Area', icon: lineIcon(true) },
      { type: 'scatter', label: 'Scatter', icon: scatterIcon() },
    ],
  },
  {
    group: 'Other',
    entries: [{ type: 'funnel', label: 'Funnel', icon: funnelIcon() }],
  },
];

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

  constructor(
    private readonly containerEl: HTMLElement,
    private readonly host: ChartToolPanelHost,
  ) {
    this.activeTab = host.getDefaultPanel();
  }

  /** Whether the panel is currently mounted. */
  isOpen(): boolean {
    return this.rootEl !== null;
  }

  /** Mounts the panel (optionally on a specific tab) and renders it. */
  open(tab?: ChartToolPanelName): void {
    if (tab) this.activeTab = tab;
    if (!this.rootEl) this.build();
    else this.render();
  }

  /** Unmounts and destroys the panel. */
  destroy(): void {
    this.rootEl?.remove();
    this.rootEl = null;
    this.tabsEl = null;
    this.bodyEl = null;
  }

  /**
   * Docks the panel flush against the right edge of the chart card. Uses fixed
   * positioning against the card's viewport rect while remaining a DOM child of
   * the themed grid container so theme tokens still resolve.
   */
  dock(cardRect: DOMRect): void {
    if (!this.rootEl) return;
    const gap = 8;
    const width = this.rootEl.offsetWidth;
    let left = cardRect.right + gap;
    // Flip to the left of the card if it would overflow the viewport.
    if (left + width > window.innerWidth - 8) left = Math.max(8, cardRect.left - width - gap);
    this.rootEl.style.left = `${left}px`;
    this.rootEl.style.top = `${cardRect.top}px`;
    this.rootEl.style.height = `${cardRect.height}px`;
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
    closeBtn.innerHTML = ICON_CLOSE;
    closeBtn.addEventListener('click', () => this.destroy());
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
    const body = this.bodyEl!;
    body.innerHTML = '';
    const model = this.host.getModel();
    switch (this.activeTab) {
      case 'chart':     this.renderChartTab(body, model); break;
      case 'setup':     this.renderSetupTab(body, model); break;
      case 'customize': this.renderCustomizeTab(body, model); break;
    }
  }

  // ── Chart tab: type gallery ────────────────────────────────────────────────

  private renderChartTab(body: HTMLElement, model: ChartModel): void {
    for (const { group, entries } of GALLERY) {
      const heading = document.createElement('div');
      heading.className = 'pg-chart-config__group-title';
      heading.textContent = group;
      body.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'pg-chart-config__gallery';
      for (const entry of entries) {
        const cell = document.createElement('button');
        cell.className = 'pg-chart-config__gallery-item';
        cell.classList.toggle('pg-chart-config__gallery-item--active', entry.type === model.chartType);
        cell.innerHTML = `<span class="pg-chart-config__gallery-icon">${entry.icon}</span><span class="pg-chart-config__gallery-label">${entry.label}</span>`;
        cell.addEventListener('click', () => this.host.updateModel({ chartType: entry.type }));
        grid.appendChild(cell);
      }
      body.appendChild(grid);
    }
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
        (id) => this.host.updateModel({ seriesColIds: model.seriesColIds.filter((s) => s !== id) }),
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
            if (colId) this.host.updateModel({ seriesColIds: [...model.seriesColIds, colId] });
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
      createNumberInput(model.style.fontSize ?? 12, (n) => this.host.updateModel({ style: { fontSize: n } }), 'Font size', 8, 32),
    );
    body.appendChild(style.section);

    const titles = createCollapsibleSection('Titles', false);
    titles.body.appendChild(createTextInput(model.title.text ?? '', (t) => this.host.updateModel({ title: { text: t } }), 'Title', 'Chart title'));
    titles.body.appendChild(createColorInput(model.title.color ?? '#0f172a', (c) => this.host.updateModel({ title: { color: c } }), 'Title color'));
    titles.body.appendChild(createSegmented(ALIGNMENTS, model.title.align ?? 'left', (a) => this.host.updateModel({ title: { align: a as TextAlign } }), 'Title align'));
    titles.body.appendChild(createTextInput(model.subtitle.text ?? '', (t) => this.host.updateModel({ subtitle: { text: t } }), 'Subtitle', 'Subtitle'));
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
    body.appendChild(series.section);

    const xAxis = createCollapsibleSection('Horizontal Axis', false);
    xAxis.body.appendChild(createTextInput(model.xAxis.title ?? '', (t) => this.host.updateModel({ xAxis: { title: t } }), 'Title', 'X-axis title'));
    xAxis.body.appendChild(createToggle(model.xAxis.showLabels ?? true, (on) => this.host.updateModel({ xAxis: { showLabels: on } }), 'Show labels'));
    body.appendChild(xAxis.section);

    const yAxis = createCollapsibleSection('Vertical Axis', false);
    yAxis.body.appendChild(createTextInput(model.yAxis.title ?? '', (t) => this.host.updateModel({ yAxis: { title: t } }), 'Title', 'Y-axis title'));
    yAxis.body.appendChild(createToggle(model.yAxis.showGridLines ?? true, (on) => this.host.updateModel({ yAxis: { showGridLines: on } }), 'Show grid lines'));
    yAxis.body.appendChild(createToggle(model.yAxis.showLabels ?? true, (on) => this.host.updateModel({ yAxis: { showLabels: on } }), 'Show labels'));
    body.appendChild(yAxis.section);
  }
}

// ── Gallery icons (theme-inheriting via currentColor) ────────────────────────

function barsIcon(horizontal: boolean): string {
  return horizontal
    ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="14" height="3" rx="1"/><rect x="3" y="10" width="9" height="3" rx="1"/><rect x="3" y="16" width="18" height="3" rx="1"/></svg>`
    : `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="8" width="3" height="12" rx="1"/><rect x="10" y="4" width="3" height="16" rx="1"/><rect x="16" y="12" width="3" height="8" rx="1"/></svg>`;
}
function stackedIcon(horizontal: boolean): string {
  return horizontal
    ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="8" height="4" rx="1"/><rect x="11" y="5" width="9" height="4" rx="1" opacity="0.55"/><rect x="3" y="12" width="12" height="4" rx="1"/><rect x="15" y="12" width="5" height="4" rx="1" opacity="0.55"/></svg>`
    : `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="10" width="4" height="10" rx="1"/><rect x="5" y="5" width="4" height="4" rx="1" opacity="0.55"/><rect x="15" y="8" width="4" height="12" rx="1"/><rect x="15" y="4" width="4" height="3" rx="1" opacity="0.55"/></svg>`;
}
function pieIcon(doughnut: boolean): string {
  return doughnut
    ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><circle cx="12" cy="12" r="7"/></svg>`
    : `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M11 3a9 9 0 0 0-8 8h8z" opacity="0.55"/></svg>`;
}
function lineIcon(area: boolean): string {
  return area
    ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17l5-6 4 3 6-8v11z" opacity="0.6"/><path d="M3 17l5-6 4 3 6-8" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
    : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 8 11 12 14 18 6"/></svg>`;
}
function scatterIcon(): string {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="15" r="2"/><circle cx="11" cy="8" r="2"/><circle cx="16" cy="14" r="2"/><circle cx="19" cy="6" r="2"/></svg>`;
}
function funnelIcon(): string {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18l-6 7v6l-6 2v-8z"/></svg>`;
}
