import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';

export interface SummaryRow {
  [colId: string]: SummaryCellValue;
}

export interface SummaryCellValue {
  value: number | string | null;
  label: string;
  aggregation: string;
  formatted: string;
}

export class SummaryEngine {
  compute(rows: RowNode[], columns: ColumnDef[]): SummaryRow {
    const dataRows = rows.filter((r) => r.type === 'data');
    const result: SummaryRow = {};

    for (const col of columns) {
      if (!col.showSummary) continue;

      const aggregation = col.summaryAggregation ?? 'sum';
      const values = dataRows
        .map((r) => this.resolveValue(r.data, col.field))
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));

      let value: number | null = null;
      let label = col.summaryLabel ?? '';

      switch (aggregation) {
        case 'sum':
          value = values.reduce((acc, v) => acc + v, 0);
          label = label || 'Sum';
          break;
        case 'avg':
          value = values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : null;
          label = label || 'Avg';
          break;
        case 'min':
          value = values.length > 0 ? Math.min(...values) : null;
          label = label || 'Min';
          break;
        case 'max':
          value = values.length > 0 ? Math.max(...values) : null;
          label = label || 'Max';
          break;
        case 'count':
          value = dataRows.length;
          label = label || 'Count';
          break;
        case 'none':
          value = null;
          break;
      }

      result[col.colId] = {
        value,
        label,
        aggregation,
        formatted: this.formatSummaryValue(value, col, aggregation),
      };
    }

    return result;
  }

  private formatSummaryValue(
    value: number | string | null,
    col: ColumnDef,
    aggregation: string,
  ): string {
    if (value === null || value === undefined) return '';
    if (aggregation === 'count') return String(value);

    const n = Number(value);
    if (isNaN(n)) return String(value);

    if (col.isCurrency) {
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  private resolveValue(data: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = data;
    for (const part of parts) {
      if (current == null) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}
