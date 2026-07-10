import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { ChartData } from '../chart-data-transformer';
import { ChartDataTransformer } from '../chart-data-transformer';
import type { ChartRenderOptions } from '../chart-renderer';
import type { ChartAggregation, ChartModel } from './chart-model';

/** Pixel size a chart is rendered at. */
export interface ChartSize {
  readonly width: number;
  readonly height: number;
}

const transformer = new ChartDataTransformer();

/**
 * Translates a {@link ChartModel} plus the current grid rows/columns into the
 * `ChartData` the {@link ChartRenderer} consumes.
 *
 * Bridges the model's column-id roles (category / series) and aggregation to the
 * existing {@link ChartDataTransformer}, then applies the model's
 * `switchCategorySeries` transpose. When aggregation is `'none'` each data row
 * becomes its own category (no grouping), matching AG Grid's Aggregate-off mode.
 *
 * @param model - The chart definition.
 * @param rows - Current grid rows (data rows are filtered internally).
 * @param columns - Column definitions used to resolve ids to field paths.
 * @returns Labels + datasets ready to render.
 */
export function buildChartData(model: ChartModel, rows: RowNode[], columns: ColumnDef[]): ChartData {
  const categoryCol = columns.find((c) => c.colId === model.categoryColId);
  const seriesCols = model.seriesColIds
    .map((id) => columns.find((c) => c.colId === id))
    .filter((c): c is ColumnDef => c !== undefined);

  if (!categoryCol || seriesCols.length === 0) return { labels: [], datasets: [] };

  const base: ChartData =
    model.aggregation === 'none'
      ? buildUnaggregated(rows, categoryCol, seriesCols)
      : transformer.transform(rows, {
          labelField: categoryCol.field,
          valueFields: seriesCols.map((c) => c.field),
          aggregation: model.aggregation,
        });

  // Label the datasets by their column header rather than raw field name.
  const labeled: ChartData = {
    labels: base.labels,
    datasets: base.datasets.map((ds, i) => ({ ...ds, label: seriesCols[i]?.header ?? ds.label })),
  };

  return model.switchCategorySeries ? transposeChartData(labeled) : labeled;
}

/**
 * Builds chart data without aggregation: every data row is one category. When
 * two rows share a category value their labels are de-duplicated with a numeric
 * suffix so no points collapse.
 */
function buildUnaggregated(rows: RowNode[], categoryCol: ColumnDef, seriesCols: ColumnDef[]): ChartData {
  const dataRows = rows.filter((r) => r.type === 'data');
  const labels: string[] = [];
  const seen = new Map<string, number>();

  for (const row of dataRows) {
    const raw = String(resolveField(row.data, categoryCol.field) ?? 'Unknown');
    const count = seen.get(raw) ?? 0;
    seen.set(raw, count + 1);
    labels.push(count === 0 ? raw : `${raw} (${count + 1})`);
  }

  const datasets = seriesCols.map((col) => ({
    label: col.header,
    data: dataRows.map((row) => {
      const val = Number(resolveField(row.data, col.field));
      return Number.isNaN(val) ? 0 : val;
    }),
  }));

  return { labels, datasets };
}

/**
 * Transposes chart data so categories and series swap roles: the old dataset
 * labels become the new categories, and each old category becomes a new series.
 */
function transposeChartData(data: ChartData): ChartData {
  const labels = data.datasets.map((ds) => ds.label);
  const datasets = data.labels.map((label, li) => ({
    label,
    data: data.datasets.map((ds) => ds.data[li] ?? 0),
  }));
  return { labels, datasets };
}

/**
 * Maps a {@link ChartModel}'s presentation sections onto {@link ChartRenderOptions}.
 * Empty strings are passed through deliberately — the renderer treats them as
 * "resolve from the active theme token".
 *
 * @param model - The chart definition.
 * @param size - The pixel size to render at.
 * @returns Fully-specified render options.
 */
export function toRenderOptions(model: ChartModel, size: ChartSize): ChartRenderOptions {
  return {
    type: model.chartType,
    width: size.width,
    height: size.height,
    animationDuration: 400,
    showGrid: model.yAxis.showGridLines ?? true,
    showLegend: model.legend.enabled,
    legendPosition: model.legend.position,

    title: model.title.text ?? '',
    titleColor: model.title.color ?? '',
    titleAlign: model.title.align ?? 'left',
    subtitle: model.subtitle.text ?? '',
    subtitleColor: model.subtitle.color ?? '',
    subtitleAlign: model.subtitle.align ?? 'left',

    xAxisTitle: model.xAxis.title ?? '',
    yAxisTitle: model.yAxis.title ?? '',
    axisTitleColor: model.xAxis.titleColor ?? model.yAxis.titleColor ?? '',
    axisLabelColor: model.yAxis.labelColor ?? model.xAxis.labelColor ?? '',
    axisLineColor: model.yAxis.lineColor ?? model.xAxis.lineColor ?? '',
    showXLabels: model.xAxis.showLabels ?? true,
    showYLabels: model.yAxis.showLabels ?? true,
    showXTicks: model.xAxis.showTicks ?? true,
    showYTicks: model.yAxis.showTicks ?? true,

    seriesColors: model.series.colorByKey,
    strokeWidth: model.series.strokeWidth ?? 0,
    fillOpacity: model.series.fillOpacity ?? 0,

    backgroundColor: model.style.backgroundColor ?? 'transparent',
    fontFamily: model.style.fontFamily ?? '',
    fontSize: model.style.fontSize ?? 12,
  };
}

/** Aggregation strategies the model exposes to the Set Up tab, in display order. */
export const AGGREGATION_OPTIONS: readonly ChartAggregation[] = ['sum', 'avg', 'count', 'min', 'max', 'none'];

/** Dotted-path lookup into a row's data object. */
function resolveField(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
