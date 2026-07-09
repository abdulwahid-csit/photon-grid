import type { GridContext } from '../core/grid-context';
import type { CellRange } from '../types/grid.types';
import type { ColumnDef } from '../types/column.types';
import { GridEventType } from '../types/event.types';
import type { ChartPanelType } from './chart-panel';
import {
  applyModelChange,
  createDefaultChartModel,
  type ChartAggregation,
  type ChartModel,
} from './model/chart-model';
import { RangeChartController } from './range-chart-controller';

/** Column data types that can be plotted as chart series. */
const MEASURE_TYPES = new Set<string>(['number', 'currency', 'percentage']);
/** Column data types usable as a category axis. */
const DIMENSION_TYPES = new Set<string>(['string', 'dropdown', 'date', 'boolean', 'email']);

/** Parameters for {@link RangeChartService.createRangeChart}. */
export interface CreateRangeChartParams {
  /**
   * Grid cell range the chart is built from. For a single-range selection this
   * is the range; for a multi-range selection it should be the primary range,
   * with the full set passed via {@link CreateRangeChartParams.cellRanges}.
   */
  readonly cellRange: CellRange;
  /**
   * All selected cell ranges when charting a multi-range (e.g. non-contiguous
   * column) selection. Their columns are unioned into the candidate pool. When
   * omitted, only {@link CreateRangeChartParams.cellRange} is used.
   */
  readonly cellRanges?: readonly CellRange[];
  /** Chart type. Defaults to the grid's `defaultChartType`, then `column-grouped`. */
  readonly chartType?: ChartPanelType;
  /** Category (x-axis) column id. Auto-detected from the range when omitted. */
  readonly categoryColId?: string;
  /** Series column ids. Auto-detected (numeric columns) when omitted. */
  readonly seriesColIds?: readonly string[];
  /** Aggregation for rows sharing a category. Defaults to `sum`. */
  readonly aggregation?: ChartAggregation;
  /** When `true`, the floating panel is not opened (headless model only). */
  readonly suppressPanel?: boolean;
}

/**
 * Owns every range chart in a grid. Seeds serializable {@link ChartModel}s from
 * cell ranges, constructs a {@link RangeChartController} per chart, routes the
 * GridApi chart surface, and disposes everything on grid teardown.
 */
export class RangeChartService {
  private readonly charts = new Map<string, RangeChartController>();
  private readonly hostEl: HTMLElement;
  private nextId = 1;

  constructor(private readonly ctx: GridContext) {
    this.hostEl = ctx.containerEl.querySelector<HTMLElement>('.pg-grid') ?? ctx.containerEl;
  }

  /**
   * Creates a range chart from a cell range and opens its panel.
   *
   * @param params - Range, type, and optional column roles.
   * @returns The new chart id, or an empty string when the range has no numeric
   *          columns to plot.
   */
  createRangeChart(params: CreateRangeChartParams): string {
    const model = this.seedModel(params);
    if (model === null) return '';

    const controller = new RangeChartController(this.ctx, this.hostEl, model, (id) => {
      this.charts.delete(id);
    });
    this.charts.set(model.chartId, controller);

    this.ctx.eventBus.emit(GridEventType.CHART_CREATED, {
      chartId: model.chartId,
      chartType: model.chartType,
      cellRange: model.cellRange,
      chartModel: model,
    });

    if (!params.suppressPanel) controller.start();
    return model.chartId;
  }

  /** Serializable models for every live chart (for save / restore). */
  getChartModels(): ChartModel[] {
    return Array.from(this.charts.values(), (c) => c.getModel());
  }

  /** Applies a full model to an existing chart, matched by `chartId`. */
  updateChart(model: ChartModel): void {
    const controller = this.charts.get(model.chartId);
    if (!controller) return;
    controller.updateModel({
      chartType: model.chartType,
      cellRange: model.cellRange,
      chartColIds: model.chartColIds,
      categoryColId: model.categoryColId,
      seriesColIds: model.seriesColIds,
      aggregation: model.aggregation,
      switchCategorySeries: model.switchCategorySeries,
      unlinked: model.unlinked,
      title: model.title,
      subtitle: model.subtitle,
      legend: model.legend,
      xAxis: model.xAxis,
      yAxis: model.yAxis,
      series: model.series,
      style: model.style,
    });
  }

  /** Recreates a chart from a previously saved model, opening its panel. */
  restoreChart(model: ChartModel): string {
    const controller = new RangeChartController(this.ctx, this.hostEl, model, (id) => {
      this.charts.delete(id);
    });
    this.charts.set(model.chartId, controller);
    this.ctx.eventBus.emit(GridEventType.CHART_CREATED, {
      chartId: model.chartId,
      chartType: model.chartType,
      cellRange: model.cellRange,
      chartModel: model,
    });
    controller.start();
    return model.chartId;
  }

  /** A data-URL image of a chart, or null if unknown. */
  getChartImageDataURL(chartId: string, format: 'png' | 'jpeg' = 'png'): string | null {
    return this.charts.get(chartId)?.getImageDataURL(format) ?? null;
  }

  /** Triggers a browser download of a chart. */
  downloadChart(chartId: string, format: 'png' | 'jpeg' = 'png'): void {
    this.charts.get(chartId)?.downloadImage(format);
  }

  /** Destroys a single chart. */
  destroyChart(chartId: string): void {
    this.charts.get(chartId)?.dispose();
  }

  /** Destroys every chart. Called on grid teardown. */
  disposeAll(): void {
    for (const controller of Array.from(this.charts.values())) controller.dispose();
    this.charts.clear();
  }

  /**
   * Builds a default model from the params, auto-detecting the category and
   * series columns from the range when the caller didn't specify them. Returns
   * `null` when the range contains no numeric column to plot.
   */
  private seedModel(params: CreateRangeChartParams): ChartModel | null {
    const visible = this.ctx.columnModel.getVisibleColumns() as ColumnDef[];
    const { startColIndex, endColIndex } = params.cellRange;
    const lo = Math.min(startColIndex, endColIndex);
    const hi = Math.max(startColIndex, endColIndex);
    const rangeCols = visible.slice(lo, hi + 1);
    const cols = rangeCols.length > 0 ? rangeCols : visible;

    const categoryColId = params.categoryColId
      ?? cols.find((c) => DIMENSION_TYPES.has(c.type))?.colId
      ?? cols[0]?.colId;

    const seriesColIds = params.seriesColIds
      ?? cols.filter((c) => MEASURE_TYPES.has(c.type)).map((c) => c.colId);

    if (!categoryColId || seriesColIds.length === 0) return null;

    const chartType = params.chartType ?? this.ctx.options.defaultChartType ?? 'column-grouped';
    const categoryHeader = cols.find((c) => c.colId === categoryColId)?.header ?? 'Category';

    let model = createDefaultChartModel({
      chartId: `chart-${this.nextId++}`,
      chartType,
      cellRange: params.cellRange,
      categoryColId,
      seriesColIds,
      aggregation: params.aggregation,
      title: `${categoryHeader} Chart`,
    });

    const overrides = this.ctx.options.chartThemeOverrides;
    if (overrides) model = applyModelChange(model, overrides);
    return model;
  }
}
