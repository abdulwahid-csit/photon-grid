import { GridEventType } from '../types/event.types';
import { ChartDataTransformer } from './chart-data-transformer';
import { ChartRenderer } from './chart-renderer';
import { createDiv } from '../renderer/dom-utils';
export class ChartEngine {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.charts = new Map();
        this.transformer = new ChartDataTransformer();
    }
    createChart(parentEl, config, rows, columns) {
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
        const activeChart = {
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
    renderChart(chartId, rows, columns) {
        const chart = this.charts.get(chartId);
        if (!chart)
            return;
        const { config } = chart;
        let chartData;
        if (config.labelColId && config.valueColIds) {
            chartData = this.transformer.fromSelectedColumns(rows, columns, config.labelColId, config.valueColIds);
        }
        else {
            const firstLabelCol = columns.find((c) => c.type === 'string' || c.type === 'dropdown');
            const numberCols = columns.filter((c) => c.type === 'number' || c.type === 'currency');
            if (!firstLabelCol || numberCols.length === 0)
                return;
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
    updateChartData(chartId, rows, columns) {
        this.renderChart(chartId, rows, columns);
    }
    destroyChart(chartId) {
        const chart = this.charts.get(chartId);
        if (!chart)
            return;
        chart.renderer.destroy();
        chart.containerEl.remove();
        this.charts.delete(chartId);
        this.eventBus.emit(GridEventType.CHART_DESTROYED, { chartId });
    }
    destroyAll() {
        for (const chartId of this.charts.keys()) {
            this.destroyChart(chartId);
        }
    }
    getChart(chartId) {
        return this.charts.get(chartId);
    }
    getAllChartIds() {
        return Array.from(this.charts.keys());
    }
    exportChartAsImage(chartId, format = 'png') {
        const chart = this.charts.get(chartId);
        if (!chart)
            return null;
        return chart.canvas.toDataURL(`image/${format}`, 0.95);
    }
}
//# sourceMappingURL=chart-engine.js.map