import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
export type AggregationStrategy = 'sum' | 'avg' | 'count' | 'first' | 'min' | 'max';
export interface AggregatedData {
    /** Ordered list of dimension labels (capped at MAX_CATEGORIES) */
    labels: string[];
    /** measureField → aggregated value per label (same order as labels) */
    seriesData: Map<string, number[]>;
}
/**
 * Groups rows by a dimension column and aggregates one or more measure columns
 * per group. Insertion order of labels is preserved (first-seen wins), so the
 * output order matches the data order in the grid.
 */
export declare class AggregationAnalyzer {
    aggregate(dimensionCol: ColumnDef, measureCols: ColumnDef[], rows: RowNode[], strategy?: AggregationStrategy): AggregatedData;
}
//# sourceMappingURL=aggregation-analyzer.d.ts.map