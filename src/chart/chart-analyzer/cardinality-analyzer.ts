import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type { CardinalityInfo } from './types';

/**
 * Counts distinct values for a single column and classifies cardinality.
 * Used by the RecommendationEngine to choose between pie (low cardinality)
 * and bar charts (high cardinality).
 */
export class CardinalityAnalyzer {
  /** @param topN  Max number of top-frequency values to return */
  analyze(column: ColumnDef, rows: RowNode[], topN = 20): CardinalityInfo {
    const freq = new Map<string, number>();

    for (const row of rows) {
      if (row.type !== 'data') continue;
      const raw = row.data[column.field];
      const key = raw == null ? '' : String(raw);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }

    const topValues = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([k]) => k);

    return {
      uniqueCount: freq.size,
      isHighCardinality: freq.size > 20,
      topValues,
    };
  }
}
