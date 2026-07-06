import type { MeasureInfo, AnalyzedChart } from './types';
/**
 * Produces a frequency-distribution dataset from a single numeric column.
 * Bin count is determined by Sturges' formula: ceil(log2(n) + 1).
 * The output is consumed by a column-grouped chart in the renderer.
 */
export declare class HistogramAnalyzer {
    analyze(measures: MeasureInfo[]): AnalyzedChart | null;
    private fmtRange;
}
//# sourceMappingURL=histogram-analyzer.d.ts.map