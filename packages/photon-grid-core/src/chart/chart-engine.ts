import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import { ChartDataTransformer, ChartTransformOptions } from './chart-data-transformer';
import { ChartRenderer, ChartRenderOptions } from './chart-renderer';
import { createDiv } from '../renderer/dom-utils';

export interface ChartConfig {
  chartId: string;
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  labelColId?: string;
  valueColIds?: string[];
  transformOptions?: Partial<ChartTransformOptions>;
  renderOptions?: Partial<ChartRenderOptions>;
  title?: string;
  width?: number;
  height?: number;
}

interface ActiveChart {
  config: ChartConfig;
  containerEl: HTMLElement;
  canvas: HTMLCanvasElement;
  renderer: ChartRenderer;
}

export class ChartEngine {
  private charts = new Map<string, ActiveChart>();
  private transformer = new ChartDataTransformer();

  constructor(private eventBus: EventBus) {}

  createChart(
    parentEl: HTMLElement,
    config: ChartConfig,
    rows: RowNode[],
    columns: ColumnDef[],
  ): string {
    const existing = this.charts.get(config.chartId);
    if (existing) {
      this.destroyChart(config.chartId);
    }

    const containerEl = createDiv('pg-chart');
    containerEl.setAttribute('data-chart-id', config.chartId);

    if (config.title) {
      const titleEl = createDiv('pg-chart__title');
      titleEl.textContent = config.title;
      containerEl.appendChild(titleEl);
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'pg-chart__canvas';
    containerEl.appendChild(canvas);

    parentEl.appendChild(containerEl);

    const chartRenderer = new ChartRenderer(canvas);

    const activeChart: ActiveChart = {
      config,
      containerEl,
      canvas,
      renderer: chartRenderer,
    };
    this.charts.set(config.chartId, activeChart);

    this.renderChart(config.chartId, rows, columns);

    this.eventBus.emit(GridEventType.CHART_CREATED, { chartId: config.chartId });
    return config.chartId;
  }

  renderChart(chartId: string, rows: RowNode[], columns: ColumnDef[]): void {
    const chart = this.charts.get(chartId);
    if (!chart) return;

    const { config } = chart;
    let chartData;

    if (config.labelColId && config.valueColIds) {
      chartData = this.transformer.fromSelectedColumns(
        rows,
        columns,
        config.labelColId,
        config.valueColIds,
      );
    } else {
      const firstLabelCol = columns.find((c) => c.type === 'string' || c.type === 'dropdown');
      const numberCols = columns.filter((c) => c.type === 'number' || c.type === 'currency');

      if (!firstLabelCol || numberCols.length === 0) return;

      chartData = this.transformer.transform(rows, {
        labelField: firstLabelCol.field,
        valueFields: numberCols.slice(0, 3).map((c) => c.field),
        ...config.transformOptions,
      });
    }

    chart.renderer.render(chartData, {
      type: config.type,
      width: config.width ?? 600,
      height: config.height ?? 320,
      ...config.renderOptions,
    });
  }

  updateChartData(chartId: string, rows: RowNode[], columns: ColumnDef[]): void {
    this.renderChart(chartId, rows, columns);
  }

  destroyChart(chartId: string): void {
    const chart = this.charts.get(chartId);
    if (!chart) return;

    chart.renderer.destroy();
    chart.containerEl.remove();
    this.charts.delete(chartId);

    this.eventBus.emit(GridEventType.CHART_DESTROYED, { chartId });
  }

  destroyAll(): void {
    for (const chartId of this.charts.keys()) {
      this.destroyChart(chartId);
    }
  }

  getChart(chartId: string): ActiveChart | undefined {
    return this.charts.get(chartId);
  }

  getAllChartIds(): string[] {
    return Array.from(this.charts.keys());
  }

  exportChartAsImage(chartId: string, format: 'png' | 'jpeg' = 'png'): string | null {
    const chart = this.charts.get(chartId);
    if (!chart) return null;
    return chart.canvas.toDataURL(`image/${format}`, 0.95);
  }
}
