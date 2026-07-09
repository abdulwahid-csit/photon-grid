import type { GridContext } from '../core/grid-context';
import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { ChartToolbarItem, ChartToolPanelName } from '../types/grid.types';
import { GridEventType } from '../types/event.types';
import { ChartPanel, type ChartPanelHost, type ChartPanelType } from './chart-panel';
import type { ChartRenderOptions } from './chart-renderer';
import { ChartToolPanel, type ChartColumnOption, type ChartToolPanelHost } from './chart-config/chart-tool-panel';
import { applyModelChange, type ChartModel, type ChartModelPatch } from './model/chart-model';
import { buildChartData, toRenderOptions } from './model/chart-model-mapper';

/** Column data types treated as measures (plottable series). */
const MEASURE_TYPES = new Set<string>(['number', 'currency', 'percentage']);
/** Column data types treated as dimensions (category candidates). */
const DIMENSION_TYPES = new Set<string>(['string', 'dropdown', 'date', 'boolean', 'email']);

/** Default `⋮` toolbar items in display order. */
const DEFAULT_TOOLBAR_ITEMS: readonly ChartToolbarItem[] = ['edit', 'advancedSettings', 'unlink', 'download'];

/**
 * Owns a single range chart: its serializable {@link ChartModel}, the floating
 * {@link ChartPanel} view, the docked {@link ChartToolPanel}, and the grid
 * subscription that keeps a linked chart in sync with the data.
 *
 * Implements both {@link ChartPanelHost} (render options + toolbar actions) and
 * {@link ChartToolPanelHost} (model + column options for the config tabs), so
 * the two views can be pure and stateless.
 */
export class RangeChartController implements ChartPanelHost, ChartToolPanelHost {
  private model: ChartModel;
  private readonly panel: ChartPanel;
  private toolPanel: ChartToolPanel | null = null;
  private unsubscribeRows: (() => void) | null = null;
  private refreshRaf: number | null = null;
  private disposed = false;

  constructor(
    private readonly ctx: GridContext,
    private readonly hostEl: HTMLElement,
    model: ChartModel,
    private readonly onDestroyed: (chartId: string) => void,
  ) {
    this.model = model;
    this.panel = new ChartPanel(hostEl);
  }

  /** Opens the chart and, for a linked chart, subscribes to grid data changes. */
  start(): void {
    this.panel.setHost(this);
    this.panel.setChartType(this.model.chartType);
    this.panel.open(this.model.chartType, this.model.title.text || 'Range Chart', this.buildData());
    if (!this.model.unlinked) this.subscribe();
  }

  /** The current chart model (a frozen snapshot). */
  getModel(): ChartModel {
    return this.model;
  }

  /**
   * Applies a model patch, rebuilds the chart, and notifies listeners. Central
   * mutation path for every config control and API `updateChart` call.
   */
  updateModel(patch: ChartModelPatch): void {
    if (this.disposed) return;
    const wasLinked = !this.model.unlinked;
    this.model = applyModelChange(this.model, patch);

    if (patch.unlinked === true && wasLinked) this.teardownSubscription();
    else if (patch.unlinked === false && !wasLinked) this.subscribe();

    this.panel.setChartType(this.model.chartType);
    this.panel.update(this.buildData());
    this.toolPanel?.render();

    this.ctx.eventBus.emit(GridEventType.CHART_OPTIONS_CHANGED, {
      chartId: this.model.chartId,
      chartType: this.model.chartType,
      chartModel: this.model,
    });
  }

  /** Rebuilds chart data from the latest grid rows. No-op when unlinked. */
  refreshFromGrid(): void {
    if (this.disposed || this.model.unlinked) return;
    this.panel.update(this.buildData());
    this.ctx.eventBus.emit(GridEventType.CHART_RANGE_SELECTION_CHANGED, {
      chartId: this.model.chartId,
      cellRange: this.model.cellRange,
    });
  }

  /** Opens the configuration tool panel, optionally on a specific tab. */
  openToolPanel(tab?: ChartToolPanelName): void {
    if (!this.toolPanel) this.toolPanel = new ChartToolPanel(this.hostEl, this);
    this.toolPanel.open(tab);
    const rect = this.panel.getCardElement()?.getBoundingClientRect();
    if (rect) this.toolPanel.dock(rect);
  }

  /** Detaches the chart from the grid, freezing its current snapshot. */
  unlink(): void {
    if (this.model.unlinked) return;
    this.updateModel({ unlinked: true });
  }

  /** A data-URL snapshot of the chart. */
  getImageDataURL(format: 'png' | 'jpeg' = 'png'): string | null {
    return this.panel.getImageDataURL(format);
  }

  /** Triggers a browser download of the chart. */
  downloadImage(format: 'png' | 'jpeg' = 'png'): void {
    this.panel.download(format);
  }

  /** Tears down the chart, its views, and its subscription. Idempotent. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.teardownSubscription();
    if (this.refreshRaf !== null) {
      cancelAnimationFrame(this.refreshRaf);
      this.refreshRaf = null;
    }
    this.toolPanel?.destroy();
    this.toolPanel = null;
    this.panel.close();
    this.ctx.eventBus.emit(GridEventType.CHART_DESTROYED, {
      chartId: this.model.chartId,
      chartType: this.model.chartType,
    });
    this.onDestroyed(this.model.chartId);
  }

  // ── ChartPanelHost ─────────────────────────────────────────────────────────

  getRenderOptions(size: { width: number; height: number }): ChartRenderOptions {
    return toRenderOptions(this.model, size);
  }

  getToolbarItems(): ChartToolbarItem[] {
    const custom = this.ctx.options.getChartToolbarItems;
    const base = [...DEFAULT_TOOLBAR_ITEMS];
    return custom ? custom(base) : base;
  }

  isUnlinked(): boolean {
    return this.model.unlinked;
  }

  onEditChart(): void {
    this.openToolPanel();
  }

  onAdvancedSettings(): void {
    this.openToolPanel('customize');
  }

  onUnlink(): void {
    this.unlink();
  }

  onMove(rect: DOMRect): void {
    this.toolPanel?.dock(rect);
  }

  onClose(): void {
    this.dispose();
  }

  // ── ChartToolPanelHost ─────────────────────────────────────────────────────

  getColumnOptions(): ChartColumnOption[] {
    const visible = this.ctx.columnModel.getVisibleColumns();
    const { startColIndex, endColIndex } = this.model.cellRange;
    const lo = Math.min(startColIndex, endColIndex);
    const hi = Math.max(startColIndex, endColIndex);
    const inRange = visible.slice(lo, hi + 1);
    const cols = inRange.length > 0 ? inRange : visible;
    return cols.map((c) => ({
      colId: c.colId,
      header: c.header,
      isMeasure: MEASURE_TYPES.has(c.type),
      isDimension: DIMENSION_TYPES.has(c.type),
    }));
  }

  getPanels(): ChartToolPanelName[] {
    return this.ctx.options.chartToolPanelsDef?.panels ?? ['chart', 'setup', 'customize'];
  }

  getDefaultPanel(): ChartToolPanelName {
    return this.ctx.options.chartToolPanelsDef?.defaultToolPanel ?? 'chart';
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private buildData() {
    const rows = this.ctx.store.get('visibleRows') as RowNode[];
    const columns = this.ctx.columnModel.getAllColumns() as ColumnDef[];
    return buildChartData(this.model, rows, columns);
  }

  private subscribe(): void {
    if (this.unsubscribeRows) return;
    this.unsubscribeRows = this.ctx.store.watch('visibleRows', () => this.scheduleRefresh());
  }

  private teardownSubscription(): void {
    this.unsubscribeRows?.();
    this.unsubscribeRows = null;
  }

  /** Coalesces multiple grid updates in a frame into a single rebuild. */
  private scheduleRefresh(): void {
    if (this.refreshRaf !== null || this.disposed) return;
    this.refreshRaf = requestAnimationFrame(() => {
      this.refreshRaf = null;
      this.refreshFromGrid();
    });
  }
}
