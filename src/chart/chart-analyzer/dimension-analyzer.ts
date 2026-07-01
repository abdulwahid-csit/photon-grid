import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import { DIMENSION_TYPES, DATE_TYPES, MAX_CATEGORIES } from './types';
import type { DimensionInfo } from './types';

/**
 * Identifies categorical/ordinal columns in the selection and computes
 * cardinality metadata needed by downstream analyzers and the
 * RecommendationEngine.
 */
export class DimensionAnalyzer {
  analyze(columns: ColumnDef[], rows: RowNode[]): DimensionInfo[] {
    const dimCols = columns.filter((c) => DIMENSION_TYPES.has(c.type as string));

    return dimCols.map((col) => {
      const seen = new Set<string>();

      for (const row of rows) {
        if (row.type !== 'data') continue;
        const raw = row.data[col.field];
        seen.add(raw == null ? '' : String(raw));
      }

      const isDate = DATE_TYPES.has(col.type as string);
      const isBoolean = col.type === 'boolean';
      const isHighCardinality = seen.size > 20;
      const uniqueValues = Array.from(seen).slice(0, MAX_CATEGORIES);

      return {
        column: col,
        role: isDate ? 'date' : isBoolean ? 'boolean' : 'category',
        uniqueValues,
        uniqueCount: seen.size,
        isHighCardinality,
        isDate,
      };
    });
  }
}
