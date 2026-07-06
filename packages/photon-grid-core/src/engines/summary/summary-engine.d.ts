import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
export interface SummaryRow {
    [colId: string]: SummaryCellValue;
}
export interface SummaryCellValue {
    value: number | string | null;
    label: string;
    aggregation: string;
    formatted: string;
}
export declare class SummaryEngine {
    compute(rows: RowNode[], columns: ColumnDef[]): SummaryRow;
    private formatSummaryValue;
    private resolveValue;
}
//# sourceMappingURL=summary-engine.d.ts.map