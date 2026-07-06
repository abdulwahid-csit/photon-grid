import type { RowNode } from '../../types/row.types';
import type { DimensionInfo, MeasureInfo, AnalyzedChart } from './types';
/**
 * Maps two numeric columns to an X/Y scatter dataset.
 * When a categorical dimension is present, data points are split into
 * one series per category (up to 6 series to keep the chart readable).
 *
 * The renderer receives X values as string labels and Y values as the
 * data array — no changes to ChartData format are needed.
 */
export declare class ScatterAnalyzer {
    private static readonly MAX_POINTS;
    private static readonly MAX_SERIES;
    analyze(dimensions: DimensionInfo[], measures: MeasureInfo[], rows: RowNode[]): AnalyzedChart | null;
}
//# sourceMappingURL=scatter-analyzer.d.ts.map