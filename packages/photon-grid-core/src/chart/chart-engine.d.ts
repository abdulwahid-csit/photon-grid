import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { EventBus } from '../event-bus/event-bus';
import { ChartTransformOptions } from './chart-data-transformer';
import { ChartRenderer, ChartRenderOptions } from './chart-renderer';
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
export declare class ChartEngine {
    private eventBus;
    private charts;
    private transformer;
    constructor(eventBus: EventBus);
    createChart(parentEl: HTMLElement, config: ChartConfig, rows: RowNode[], columns: ColumnDef[]): string;
    renderChart(chartId: string, rows: RowNode[], columns: ColumnDef[]): void;
    updateChartData(chartId: string, rows: RowNode[], columns: ColumnDef[]): void;
    destroyChart(chartId: string): void;
    destroyAll(): void;
    getChart(chartId: string): ActiveChart | undefined;
    getAllChartIds(): string[];
    exportChartAsImage(chartId: string, format?: 'png' | 'jpeg'): string | null;
}
export {};
//# sourceMappingURL=chart-engine.d.ts.map