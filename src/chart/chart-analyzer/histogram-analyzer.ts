import type { MeasureInfo, AnalyzedChart } from './types';
import { APEX_COLORS } from './types';

/**
 * Produces a frequency-distribution dataset from a single numeric column.
 * Bin count is determined by Sturges' formula: ceil(log2(n) + 1).
 * The output is consumed by a column-grouped chart in the renderer.
 */
export class HistogramAnalyzer {
  analyze(measures: MeasureInfo[]): AnalyzedChart | null {
    if (!measures.length) return null;

    const measure = measures[0];
    const values = measure.allValues.filter((v) => !isNaN(v));
    if (!values.length) return null;

    // Sturges' formula, clamped between 5 and 20 bins
    const binCount = Math.min(Math.max(Math.ceil(Math.log2(values.length) + 1), 5), 20);
    const range = measure.max - measure.min || 1;
    const binSize = range / binCount;

    const bins: { start: number; end: number; count: number }[] = [];
    for (let i = 0; i < binCount; i++) {
      bins.push({ start: measure.min + i * binSize, end: measure.min + (i + 1) * binSize, count: 0 });
    }

    for (const v of values) {
      const idx = Math.min(Math.floor((v - measure.min) / binSize), binCount - 1);
      if (idx >= 0) bins[idx].count++;
    }

    return {
      title: `${measure.column.header} Distribution`,
      data: {
        labels: bins.map((b) => this.fmtRange(b.start, b.end)),
        datasets: [{ label: 'Frequency', data: bins.map((b) => b.count), color: APEX_COLORS[0] }],
      },
    };
  }

  private fmtRange(start: number, end: number): string {
    const f = (n: number) =>
      n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000    ? `${(n / 1_000).toFixed(1)}K`
      : Number.isInteger(n) ? String(n) : n.toFixed(1);
    return `${f(start)}–${f(end)}`;
  }
}
