import type { RowNode } from '../../types/row.types';
import type { DimensionInfo, MeasureInfo, AnalyzedChart } from './types';
import { APEX_COLORS } from './types';
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
export class LineAnalyzer {
  private static readonly MAX_POINTS_NO_DIM = 50;

  analyze(
    dimensions: DimensionInfo[],
    measures: MeasureInfo[],
    rows: RowNode[],
    agg: AggregationAnalyzer,
  ): AnalyzedChart | null {
    if (!measures.length) return null;

    // Prefer date dimension for a true time-series; fall back to first dimension
    const dim = dimensions.find((d) => d.isDate) ?? dimensions[0] ?? null;

    if (!dim) {
      // Raw row-index series — good for trending visualisation without categories
      const dataRows = rows.filter((r) => r.type === 'data').slice(0, LineAnalyzer.MAX_POINTS_NO_DIM);
      const title = measures.map((m) => m.column.header).join(' & ');

      return {
        title,
        data: {
          labels: dataRows.map((_, i) => String(i + 1)),
          datasets: measures.map((m, i) => ({
            label: m.column.header,
            data: dataRows.map((r) => {
              const v = Number(r.data[m.column.field]);
              return isNaN(v) ? 0 : v;
            }),
            color: APEX_COLORS[i % APEX_COLORS.length],
          })),
        },
      };
    }

    const aggregated = agg.aggregate(
      dim.column,
      measures.map((m) => m.column),
      rows,
    );

    const connector = dim.isDate ? 'over' : 'by';
    const title = measures.length === 1
      ? `${measures[0].column.header} ${connector} ${dim.column.header}`
      : measures.map((m) => m.column.header).join(' & ');

    return {
      title,
      data: {
        labels: aggregated.labels,
        datasets: measures.map((m, i) => ({
          label: m.column.header,
          data: aggregated.seriesData.get(m.column.field) ?? [],
          color: APEX_COLORS[i % APEX_COLORS.length],
        })),
      },
    };
  }
}
