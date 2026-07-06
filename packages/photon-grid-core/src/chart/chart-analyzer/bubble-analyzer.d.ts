import type { RowNode } from '../../types/row.types';
import type { DimensionInfo, MeasureInfo, AnalyzedChart } from './types';
/**
 * Maps three numeric columns to X / Y / size data for a bubble-style scatter
 * chart.  The third measure (size) is normalised to [0–1] and encoded by
 * varying the dot radius in the renderer.  When only two measures are supplied
 * it degrades gracefully to standard scatter behaviour.
 *
 * Point counts are capped at 100 to keep rendering performance acceptable.
 */
export declare class BubbleAnalyzer {
    private static readonly MAX_POINTS;
    private static readonly MAX_SERIES;
    analyze(dimensions: DimensionInfo[], measures: MeasureInfo[], rows: RowNode[]): AnalyzedChart | null;
}
//# sourceMappingURL=bubble-analyzer.d.ts.map