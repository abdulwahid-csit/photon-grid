import type { RowNode } from '../../types/row.types';
import type { DimensionInfo, MeasureInfo, AnalyzedChart } from './types';
import { APEX_COLORS } from './types';
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
export class BarAnalyzer {
  private static readonly MAX_ROWS_NO_DIM = 50;

  analyze(
    dimensions: DimensionInfo[],
    measures: MeasureInfo[],
    rows: RowNode[],
    agg: AggregationAnalyzer,
  ): AnalyzedChart | null {
    if (!measures.length) return null;

    const dim = dimensions[0] ?? null;

    // ── No dimension: use sequential row indices ───────────────────────────
    if (!dim) {
      const dataRows = rows.filter((r) => r.type === 'data').slice(0, BarAnalyzer.MAX_ROWS_NO_DIM);
      const title = measures.map((m) => m.column.header).join(', ');

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

    // ── Dimension present: aggregate ───────────────────────────────────────
    const aggregated = agg.aggregate(
      dim.column,
      measures.map((m) => m.column),
      rows,
    );

    const title = measures.length === 1
      ? `${measures[0].column.header} by ${dim.column.header}`
      : measures.map((m) => m.column.header).join(', ');

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
