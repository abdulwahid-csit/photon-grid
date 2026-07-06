import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { CellRange } from '../../types/grid.types';
import { CardinalityAnalyzer } from './cardinality-analyzer';
import type { AnalyzedChart, ChartRecommendation } from './types';
export type { AnalyzedChart, ChartRecommendation };
/**
 * Top-level orchestrator that mirrors AG Grid's chart-range analysis pipeline:
 *
 *   selection → DimensionAnalyzer + MeasureAnalyzer
 *             → RecommendationEngine (best chart type)
 *             → chart-specific Analyzer (data shaping)
 *             → AnalyzedChart (title + ChartData)
 *
 * Public API
 * ----------
 * analyze(ranges, rows, columns)
 *   Returns the best-fit chart data for the current selection, or null when
 *   the selection contains no numeric columns.
 *
 * analyzeForType(chartType, ranges, rows, columns)
 *   Returns chart data shaped for the explicitly-requested chart type.
 *
 * recommend(ranges, rows, columns)
 *   Returns a ranked list of ChartRecommendation objects so a UI can suggest
 *   chart types to the user (future use / API extension).
 */
export declare class ChartAnalyzer {
    private readonly dimensionAnalyzer;
    private readonly measureAnalyzer;
    readonly cardinalityAnalyzer: CardinalityAnalyzer;
    private readonly aggregationAnalyzer;
    private readonly histogramAnalyzer;
    private readonly scatterAnalyzer;
    private readonly bubbleAnalyzer;
    private readonly pieAnalyzer;
    private readonly barAnalyzer;
    private readonly lineAnalyzer;
    private readonly recommendationEngine;
    /**
     * Analyse a cell selection and return data shaped for the best chart type
     * recommended by the RecommendationEngine, or null if no numeric data.
     */
    analyze(ranges: CellRange[], rows: RowNode[], columns: ColumnDef[]): AnalyzedChart | null;
    /**
     * Analyse a cell selection and return data shaped for the explicitly
     * requested chart type.  Returns null if there are no numeric columns.
     */
    analyzeForType(chartType: string, ranges: CellRange[], rows: RowNode[], columns: ColumnDef[]): AnalyzedChart | null;
    /**
     * Return a ranked list of chart-type recommendations for the current
     * selection. Useful for a "Recommended charts" panel (not yet in the UI).
     */
    recommend(ranges: CellRange[], rows: RowNode[], columns: ColumnDef[]): ChartRecommendation[];
    private buildContext;
    private dispatch;
}
//# sourceMappingURL=index.d.ts.map