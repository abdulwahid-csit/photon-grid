import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type { CardinalityInfo } from './types';
/**
 * Counts distinct values for a single column and classifies cardinality.
 * Used by the RecommendationEngine to choose between pie (low cardinality)
 * and bar charts (high cardinality).
 */
export declare class CardinalityAnalyzer {
    /** @param topN  Max number of top-frequency values to return */
    analyze(column: ColumnDef, rows: RowNode[], topN?: number): CardinalityInfo;
}
//# sourceMappingURL=cardinality-analyzer.d.ts.map