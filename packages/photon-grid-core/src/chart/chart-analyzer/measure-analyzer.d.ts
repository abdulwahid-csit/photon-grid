import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type { MeasureInfo } from './types';
/**
 * Identifies numeric columns (number, currency, percentage) and computes
 * descriptive statistics used by chart-specific analyzers.
 */
export declare class MeasureAnalyzer {
    analyze(columns: ColumnDef[], rows: RowNode[]): MeasureInfo[];
}
//# sourceMappingURL=measure-analyzer.d.ts.map