import type { CellRange } from '../../types/grid.types';
import type { ChartPanelType } from '../chart-panel';

/**
 * How multiple grid rows sharing a category value are collapsed into a single
 * chart data point.
 *
 * - `sum` / `avg` / `count` / `min` / `max` — standard reductions.
 * - `none` — no aggregation: every selected data row becomes its own category
 *   (matches AG Grid's "Aggregate" toggle in the off position).
 */
export type ChartAggregation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';

/** Placement of the series legend relative to the plot area. */
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

/** Horizontal text alignment used by titles and subtitles. */
export type TextAlign = 'left' | 'center' | 'right';

/**
 * Title / subtitle configuration. All fields are optional; an empty or absent
 * {@link TitleOptions.text} suppresses the band entirely and reclaims its space.
 */
export interface TitleOptions {
  readonly text?: string;
  readonly color?: string;
  readonly fontSize?: number;
  readonly align?: TextAlign;
}

/** Legend visibility and placement. */
export interface LegendOptions {
  readonly enabled: boolean;
  readonly position: LegendPosition;
}

/** Per-axis presentation. Colors are optional so they can fall back to theme tokens. */
export interface AxisOptions {
  readonly title?: string;
  readonly titleColor?: string;
  readonly labelColor?: string;
  readonly lineColor?: string;
  readonly showGridLines?: boolean;
  readonly showTicks?: boolean;
  readonly showLabels?: boolean;
}

/**
 * Series styling. {@link SeriesStyle.colorByKey} maps a series' column id (or
 * label) to an explicit color override; unmapped series fall back to the theme
 * palette. Stroke / fill apply to line and area series.
 */
export interface SeriesStyle {
  readonly colorByKey: Readonly<Record<string, string>>;
  readonly strokeWidth?: number;
  readonly fillOpacity?: number;
}

/** Chart-wide presentation not tied to a specific axis or series. */
export interface ChartStyleOptions {
  readonly backgroundColor?: string;
  readonly fontFamily?: string;
  readonly fontSize?: number;
}

/**
 * The complete, serializable definition of a range chart. This is the single
 * source of truth a {@link RangeChartController} renders from — it can be read
 * via `api.getChartModels()` and re-applied via `api.restoreChart(model)`.
 *
 * The model is treated as immutable: mutations go through {@link applyModelChange},
 * which returns a new frozen instance rather than editing in place.
 */
export interface ChartModel {
  /** Stable identifier, unique within a grid. */
  readonly chartId: string;
  /** Concrete chart type drawn by the renderer. */
  readonly chartType: ChartPanelType;
  /** The grid cell range the chart was created from. */
  readonly cellRange: CellRange;

  /**
   * Column ids that form the chart's candidate pool — the union of every source
   * cell range's columns, in visible order. Drives which columns the Set Up tab
   * offers for the category and series roles, so non-contiguous multi-range
   * selections are represented faithfully (not just the bounding {@link cellRange}).
   */
  readonly chartColIds: readonly string[];

  /** Column id whose values form the category (x) axis. */
  readonly categoryColId: string;
  /** Column ids plotted as series (one dataset each). */
  readonly seriesColIds: readonly string[];
  /** Aggregation applied when rows share a category value. */
  readonly aggregation: ChartAggregation;
  /** When `true`, categories and series are transposed. */
  readonly switchCategorySeries: boolean;

  /**
   * When `true` the chart is detached from the grid: it no longer re-renders on
   * data / sort / filter changes and keeps its last-built snapshot.
   */
  readonly unlinked: boolean;

  readonly title: TitleOptions;
  readonly subtitle: TitleOptions;
  readonly legend: LegendOptions;
  readonly xAxis: AxisOptions;
  readonly yAxis: AxisOptions;
  readonly series: SeriesStyle;
  readonly style: ChartStyleOptions;
}

/** The subset of {@link ChartModel} a caller must supply to build a default. */
export interface ChartModelSeed {
  readonly chartId: string;
  readonly chartType: ChartPanelType;
  readonly cellRange: CellRange;
  readonly categoryColId: string;
  readonly seriesColIds: readonly string[];
  /** Candidate column pool. Defaults to the category plus every series column. */
  readonly chartColIds?: readonly string[];
  readonly aggregation?: ChartAggregation;
  readonly title?: string;
}

/**
 * Builds a fully-populated {@link ChartModel} from the minimal information
 * available at creation time, filling every optional section with sensible
 * defaults. The returned model is deep-frozen.
 *
 * @param seed - Identity, type, range and column roles for the new chart.
 * @returns A frozen, ready-to-render chart model.
 */
export function createDefaultChartModel(seed: ChartModelSeed): ChartModel {
  const model: ChartModel = {
    chartId: seed.chartId,
    chartType: seed.chartType,
    cellRange: seed.cellRange,
    chartColIds: seed.chartColIds
      ? [...seed.chartColIds]
      : [seed.categoryColId, ...seed.seriesColIds],
    categoryColId: seed.categoryColId,
    seriesColIds: [...seed.seriesColIds],
    aggregation: seed.aggregation ?? 'sum',
    switchCategorySeries: false,
    unlinked: false,
    title: { text: seed.title ?? '', align: 'left' },
    subtitle: { text: '', align: 'left' },
    legend: { enabled: seed.seriesColIds.length > 1, position: 'bottom' },
    xAxis: { showGridLines: false, showTicks: true, showLabels: true },
    yAxis: { showGridLines: true, showTicks: true, showLabels: true },
    series: { colorByKey: {} },
    style: {},
  };
  return deepFreeze(model);
}

/**
 * Produces a new {@link ChartModel} with `patch` applied over `model`. Nested
 * object sections (title, legend, axes, series, style) are shallow-merged so a
 * caller can patch a single field without restating the whole section. The
 * result is deep-frozen; the input is never mutated.
 *
 * @param model - The current model.
 * @param patch - Partial fields to overlay. Nested sections merge; scalars replace.
 * @returns A new frozen model.
 */
export function applyModelChange(model: ChartModel, patch: ChartModelPatch): ChartModel {
  const next: ChartModel = {
    ...model,
    ...patch,
    chartColIds: patch.chartColIds ? [...patch.chartColIds] : model.chartColIds,
    seriesColIds: patch.seriesColIds ? [...patch.seriesColIds] : model.seriesColIds,
    title: patch.title ? { ...model.title, ...patch.title } : model.title,
    subtitle: patch.subtitle ? { ...model.subtitle, ...patch.subtitle } : model.subtitle,
    legend: patch.legend ? { ...model.legend, ...patch.legend } : model.legend,
    xAxis: patch.xAxis ? { ...model.xAxis, ...patch.xAxis } : model.xAxis,
    yAxis: patch.yAxis ? { ...model.yAxis, ...patch.yAxis } : model.yAxis,
    series: patch.series ? mergeSeries(model.series, patch.series) : model.series,
    style: patch.style ? { ...model.style, ...patch.style } : model.style,
  };
  return deepFreeze(next);
}

/**
 * A partial chart model used by {@link applyModelChange}. Every top-level field
 * and nested section is optional and independently patchable.
 */
export interface ChartModelPatch {
  readonly chartType?: ChartPanelType;
  readonly cellRange?: CellRange;
  readonly chartColIds?: readonly string[];
  readonly categoryColId?: string;
  readonly seriesColIds?: readonly string[];
  readonly aggregation?: ChartAggregation;
  readonly switchCategorySeries?: boolean;
  readonly unlinked?: boolean;
  readonly title?: Partial<TitleOptions>;
  readonly subtitle?: Partial<TitleOptions>;
  readonly legend?: Partial<LegendOptions>;
  readonly xAxis?: Partial<AxisOptions>;
  readonly yAxis?: Partial<AxisOptions>;
  readonly series?: Partial<SeriesStyle>;
  readonly style?: Partial<ChartStyleOptions>;
}

/** Merges a series patch, deep-merging the {@link SeriesStyle.colorByKey} map. */
function mergeSeries(current: SeriesStyle, patch: Partial<SeriesStyle>): SeriesStyle {
  return {
    ...current,
    ...patch,
    colorByKey: patch.colorByKey ? { ...current.colorByKey, ...patch.colorByKey } : current.colorByKey,
  };
}

/**
 * Recursively freezes an object graph so a model cannot be mutated after
 * construction. Arrays and plain nested objects are frozen; primitives are
 * returned as-is.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
}
