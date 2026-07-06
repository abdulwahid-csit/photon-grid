import type { RowNode } from '../../types/row.types';
import type { DimensionInfo, MeasureInfo, AnalyzedChart } from './types';
import { APEX_COLORS } from './types';

/**
 * Maps two numeric columns to an X/Y scatter dataset.
 * When a categorical dimension is present, data points are split into
 * one series per category (up to 6 series to keep the chart readable).
 *
 * The renderer receives X values as string labels and Y values as the
 * data array — no changes to ChartData format are needed.
 */
export class ScatterAnalyzer {
  private static readonly MAX_POINTS = 200;
  private static readonly MAX_SERIES = 6;

  analyze(
    dimensions: DimensionInfo[],
    measures: MeasureInfo[],
    rows: RowNode[],
  ): AnalyzedChart | null {
    if (measures.length < 2) return null;

    const [xMeasure, yMeasure] = measures;
    const seriesDim = dimensions[0] ?? null;
    const dataRows = rows.filter((r) => r.type === 'data').slice(0, ScatterAnalyzer.MAX_POINTS);

    const title = `${yMeasure.column.header} vs ${xMeasure.column.header}`;

    if (seriesDim) {
      // Group by dimension — up to MAX_SERIES groups
      const groups = new Map<string, { xs: number[]; ys: number[] }>();
      for (const row of dataRows) {
        const key = String(row.data[seriesDim.column.field] ?? '');
        const x = Number(row.data[xMeasure.column.field]);
        const y = Number(row.data[yMeasure.column.field]);
        if (isNaN(x) || isNaN(y)) continue;
        if (!groups.has(key)) groups.set(key, { xs: [], ys: [] });
        groups.get(key)!.xs.push(x);
        groups.get(key)!.ys.push(y);
      }

      const keys = Array.from(groups.keys()).slice(0, ScatterAnalyzer.MAX_SERIES);
      const allXs = dataRows
        .map((r) => Number(r.data[xMeasure.column.field]))
        .filter((v) => !isNaN(v));

      return {
        title: `${title} by ${seriesDim.column.header}`,
        data: {
          labels: allXs.map(String),
          datasets: keys.map((key, i) => ({
            label: key,
            data: groups.get(key)!.ys,
            color: APEX_COLORS[i % APEX_COLORS.length],
          })),
        },
      };
    }

    // No dimension — single series
    return {
      title,
      data: {
        labels: dataRows.map((r) => {
          const x = Number(r.data[xMeasure.column.field]);
          return isNaN(x) ? '' : String(x);
        }),
        datasets: [{
          label: yMeasure.column.header,
          data: dataRows.map((r) => {
            const y = Number(r.data[yMeasure.column.field]);
            return isNaN(y) ? 0 : y;
          }),
          color: APEX_COLORS[0],
        }],
      },
    };
  }
}
