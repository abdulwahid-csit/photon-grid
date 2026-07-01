import type { RowNode } from '../../types/row.types';
import type { DimensionInfo, MeasureInfo, AnalyzedChart } from './types';
import { APEX_COLORS, PIE_MAX_SLICES } from './types';
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
export class PieAnalyzer {
  analyze(
    dimensions: DimensionInfo[],
    measures: MeasureInfo[],
    rows: RowNode[],
    agg: AggregationAnalyzer,
  ): AnalyzedChart | null {
    if (!measures.length) return null;

    const dim = dimensions[0] ?? null;
    const measure = measures[0];

    if (!dim) {
      // Dimensionless: show raw values of the first measure
      const sliceRows = rows.filter((r) => r.type === 'data').slice(0, PIE_MAX_SLICES);
      return {
        title: `${measure.column.header} Distribution`,
        data: {
          labels: sliceRows.map((_, i) => `Row ${i + 1}`),
          datasets: [{
            label: measure.column.header,
            data: sliceRows.map((r) => {
              const v = Number(r.data[measure.column.field]);
              return isNaN(v) ? 0 : v;
            }),
            color: APEX_COLORS[0],
          }],
        },
      };
    }

    // Aggregate measure by dimension
    const aggregated = agg.aggregate(dim.column, [measure.column], rows);
    const measureData = aggregated.seriesData.get(measure.column.field) ?? [];

    // Pair labels with values, sort descending
    const pairs = aggregated.labels
      .map((label, i) => ({ label, value: measureData[i] ?? 0 }))
      .sort((a, b) => b.value - a.value);

    let topSlices = pairs.slice(0, PIE_MAX_SLICES);
    const remainder = pairs.slice(PIE_MAX_SLICES);

    if (remainder.length > 0) {
      const otherSum = remainder.reduce((s, p) => s + p.value, 0);
      topSlices.push({ label: `Other (${remainder.length})`, value: otherSum });
    }

    return {
      title: `${measure.column.header} by ${dim.column.header}`,
      data: {
        labels: topSlices.map((s) => s.label),
        datasets: [{
          label: measure.column.header,
          data: topSlices.map((s) => s.value),
          color: APEX_COLORS[0],
        }],
      },
    };
  }
}
