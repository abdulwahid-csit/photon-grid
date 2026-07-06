import type { RowNode } from '../../types/row.types';
import type { DimensionInfo, MeasureInfo, AnalyzedChart } from './types';
import type { AggregationAnalyzer } from './aggregation-analyzer';
/**
 * Builds data for all column / bar / funnel / polar chart variants.
 *
 * Strategy:
 *  • dimension + measures   →  aggregate each measure by the primary dimension
 *  • measures only          →  use row-index labels (1, 2, 3…)
 *
 * Title logic:
 *  • single measure  →  "Salary by Department"
 *  • multi measure   →  "Salary, Bonus, Commission"
 */
export declare class BarAnalyzer {
    private static readonly MAX_ROWS_NO_DIM;
    analyze(dimensions: DimensionInfo[], measures: MeasureInfo[], rows: RowNode[], agg: AggregationAnalyzer): AnalyzedChart | null;
}
//# sourceMappingURL=bar-analyzer.d.ts.map