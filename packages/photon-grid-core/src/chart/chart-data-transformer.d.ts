import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
export interface ChartDataset {
    label: string;
    data: number[];
    color?: string;
}
export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}
export interface ChartTransformOptions {
    labelField: string;
    valueFields: string[];
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    limit?: number;
    sortByValue?: boolean;
    colors?: string[];
}
export declare class ChartDataTransformer {
    transform(rows: RowNode[], options: ChartTransformOptions): ChartData;
    fromSelectedColumns(rows: RowNode[], columns: ColumnDef[], labelColId: string, valueColIds: string[]): ChartData;
    private aggregate;
    private resolveValue;
}
//# sourceMappingURL=chart-data-transformer.d.ts.map