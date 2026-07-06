import type { RowNode } from '../../types/row.types';
import type { DimensionInfo, MeasureInfo, AnalyzedChart } from './types';
import type { AggregationAnalyzer } from './aggregation-analyzer';
/**
 * Builds pie / doughnut chart data.
 *
 * Strategy:
 *  • 1 dimension + 1 measure  →  aggregate measure by dimension, top-N slices
 *    with an "Other (n)" remainder slice when the category count exceeds
 *    PIE_MAX_SLICES.
 *  • No dimension  →  treat the first PIE_MAX_SLICES rows as individual slices.
 *
 * Slices are sorted by value (descending) so the largest segment always
 * appears first at the 12-o'clock position in the renderer.
 */
export declare class PieAnalyzer {
    analyze(dimensions: DimensionInfo[], measures: MeasureInfo[], rows: RowNode[], agg: AggregationAnalyzer): AnalyzedChart | null;
}
//# sourceMappingURL=pie-analyzer.d.ts.map