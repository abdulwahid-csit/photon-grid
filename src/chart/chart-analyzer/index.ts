import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { CellRange } from '../../types/grid.types';
import { normalizeRange } from '../../cell-selection/selection-range';

import { DimensionAnalyzer }    from './dimension-analyzer';
import { MeasureAnalyzer }      from './measure-analyzer';
import { CardinalityAnalyzer }  from './cardinality-analyzer';
import { AggregationAnalyzer }  from './aggregation-analyzer';
import { HistogramAnalyzer }    from './histogram-analyzer';
import { ScatterAnalyzer }      from './scatter-analyzer';
import { BubbleAnalyzer }       from './bubble-analyzer';
import { PieAnalyzer }          from './pie-analyzer';
import { BarAnalyzer }          from './bar-analyzer';
import { LineAnalyzer }         from './line-analyzer';
import { RecommendationEngine } from './recommendation-engine';

import type { AnalyzedChart, ChartRecommendation, DimensionInfo, MeasureInfo } from './types';

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
export class ChartAnalyzer {
  // ── Sub-analyzers ────────────────────────────────────────────────────────
  private readonly dimensionAnalyzer    = new DimensionAnalyzer();
  private readonly measureAnalyzer      = new MeasureAnalyzer();
  readonly         cardinalityAnalyzer  = new CardinalityAnalyzer();   // public for potential external use
  private readonly aggregationAnalyzer  = new AggregationAnalyzer();
  private readonly histogramAnalyzer    = new HistogramAnalyzer();
  private readonly scatterAnalyzer      = new ScatterAnalyzer();
  private readonly bubbleAnalyzer       = new BubbleAnalyzer();
  private readonly pieAnalyzer          = new PieAnalyzer();
  private readonly barAnalyzer          = new BarAnalyzer();
  private readonly lineAnalyzer         = new LineAnalyzer();
  private readonly recommendationEngine = new RecommendationEngine();

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Analyse a cell selection and return data shaped for the best chart type
   * recommended by the RecommendationEngine, or null if no numeric data.
   */
  analyze(ranges: CellRange[], rows: RowNode[], columns: ColumnDef[]): AnalyzedChart | null {
    const ctx = this.buildContext(ranges, rows, columns);
    if (!ctx) return null;

    const { dimensions, measures, selectedRows } = ctx;
    if (!measures.length) return null;

    const recs = this.recommendationEngine.recommend(dimensions, measures);
    const bestType = recs[0]?.chartType ?? 'column-grouped';
    return this.dispatch(bestType, dimensions, measures, selectedRows);
  }

  /**
   * Analyse a cell selection and return data shaped for the explicitly
   * requested chart type.  Returns null if there are no numeric columns.
   */
  analyzeForType(chartType: string, ranges: CellRange[], rows: RowNode[], columns: ColumnDef[]): AnalyzedChart | null {
    const ctx = this.buildContext(ranges, rows, columns);
    if (!ctx) return null;

    const { dimensions, measures, selectedRows } = ctx;
    if (!measures.length) return null;

    return this.dispatch(chartType, dimensions, measures, selectedRows);
  }

  /**
   * Return a ranked list of chart-type recommendations for the current
   * selection. Useful for a "Recommended charts" panel (not yet in the UI).
   */
  recommend(ranges: CellRange[], rows: RowNode[], columns: ColumnDef[]): ChartRecommendation[] {
    const ctx = this.buildContext(ranges, rows, columns);
    if (!ctx) return [];
    return this.recommendationEngine.recommend(ctx.dimensions, ctx.measures);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildContext(ranges: CellRange[], rows: RowNode[], columns: ColumnDef[]) {
    if (!ranges.length || !rows.length || !columns.length) return null;

    const norm = normalizeRange(ranges[0]);
    const selectedCols = columns.slice(norm.startColIndex, norm.endColIndex + 1);
    const selectedRows = rows
      .slice(norm.startRowIndex, norm.endRowIndex + 1)
      .filter((r) => r.type === 'data');

    if (!selectedRows.length || !selectedCols.length) return null;

    const dimensions = this.dimensionAnalyzer.analyze(selectedCols, selectedRows);
    const measures   = this.measureAnalyzer.analyze(selectedCols, selectedRows);

    return { dimensions, measures, selectedRows, selectedCols };
  }

  private dispatch(
    chartType: string,
    dimensions: DimensionInfo[],
    measures: MeasureInfo[],
    rows: RowNode[],
  ): AnalyzedChart | null {
    switch (chartType) {
      case 'pie':
      case 'doughnut':
        return this.pieAnalyzer.analyze(dimensions, measures, rows, this.aggregationAnalyzer);

      case 'scatter':
        return this.scatterAnalyzer.analyze(dimensions, measures, rows);

      case 'bubble':
        return this.bubbleAnalyzer.analyze(dimensions, measures, rows);

      case 'line':
      case 'area':
        return this.lineAnalyzer.analyze(dimensions, measures, rows, this.aggregationAnalyzer);

      case 'column-grouped':
      case 'column-stacked':
      case 'column-100stacked': {
        // Single measure + no dimension → histogram (frequency distribution)
        if (dimensions.length === 0 && measures.length === 1) {
          return this.histogramAnalyzer.analyze(measures);
        }
        return this.barAnalyzer.analyze(dimensions, measures, rows, this.aggregationAnalyzer);
      }

      default:
        // bar-grouped, bar-stacked, bar-100stacked, funnel, polar
        return this.barAnalyzer.analyze(dimensions, measures, rows, this.aggregationAnalyzer);
    }
  }
}
