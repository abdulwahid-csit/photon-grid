import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type { DimensionInfo } from './types';
/**
 * Identifies categorical/ordinal columns in the selection and computes
 * cardinality metadata needed by downstream analyzers and the
 * RecommendationEngine.
 */
export declare class DimensionAnalyzer {
    analyze(columns: ColumnDef[], rows: RowNode[]): DimensionInfo[];
}
//# sourceMappingURL=dimension-analyzer.d.ts.map