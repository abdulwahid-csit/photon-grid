import type { RowNode } from '../../types/row.types';
import type { DimensionInfo, MeasureInfo, AnalyzedChart } from './types';
import type { AggregationAnalyzer } from './aggregation-analyzer';
/**
 * Builds data for line and area charts.
 *
 * Strategy:
 *  • date dimension present  →  aggregate measures over the date axis;
 *    produces a proper time-series with X labels from the date column.
 *  • category dimension      →  same aggregation, labels from the dimension.
 *  • no dimension            →  use row-index labels (1, 2, 3…), each row
 *    is a separate data point with no aggregation.
 *
 * Titles:
 *  • one measure + date dim  →  "Revenue over Date"
 *  • one measure + category  →  "Revenue by Category"
 *  • multiple measures       →  "Revenue & Profit"
 */
export declare class LineAnalyzer {
    private static readonly MAX_POINTS_NO_DIM;
    analyze(dimensions: DimensionInfo[], measures: MeasureInfo[], rows: RowNode[], agg: AggregationAnalyzer): AnalyzedChart | null;
}
//# sourceMappingURL=line-analyzer.d.ts.map