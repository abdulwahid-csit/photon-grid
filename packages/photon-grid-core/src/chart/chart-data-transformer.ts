import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartTransformOptions {
  labelField: string;
  valueFields: string[];
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  limit?: number;
  sortByValue?: boolean;
}

export class ChartDataTransformer {
  transform(
    rows: RowNode[],
    options: ChartTransformOptions,
  ): ChartData {
    const dataRows = rows.filter((r) => r.type === 'data');
    const { labelField, valueFields, aggregation = 'sum', limit, sortByValue } = options;

    const grouped = new Map<string, Record<string, number[]>>();

    for (const row of dataRows) {
      const label = String(this.resolveValue(row.data, labelField) ?? 'Unknown');
      if (!grouped.has(label)) {
        const entry: Record<string, number[]> = {};
        for (const field of valueFields) entry[field] = [];
        grouped.set(label, entry);
      }
      const entry = grouped.get(label)!;
      for (const field of valueFields) {
        const val = Number(this.resolveValue(row.data, field));
        if (!isNaN(val)) entry[field].push(val);
      }
    }

    let labels = Array.from(grouped.keys());
    // Datasets intentionally carry NO color here: color is assigned centrally by
    // the renderer from the resolved theme palette, so every chart type (bars,
    // lines, pie slices) draws from one coherent, theme-aware set. Pre-coloring
    // here would shadow the theme palette and desync bar colors from pie colors.
    const datasets: ChartDataset[] = valueFields.map((field) => {
      const data = labels.map((label) => {
        const values = grouped.get(label)![field] ?? [];
        return this.aggregate(values, aggregation);
      });

      return { label: field, data };
    });

    if (sortByValue && datasets.length > 0) {
      const primaryData = datasets[0].data;
      const indices = labels.map((_, i) => i).sort((a, b) => primaryData[b] - primaryData[a]);
      labels = indices.map((i) => labels[i]);
      for (const ds of datasets) {
        ds.data = indices.map((i) => ds.data[i]);
      }
    }

    if (limit && limit > 0) {
      labels = labels.slice(0, limit);
      for (const ds of datasets) {
        ds.data = ds.data.slice(0, limit);
      }
    }

    return { labels, datasets };
  }

  fromSelectedColumns(
    rows: RowNode[],
    columns: ColumnDef[],
    labelColId: string,
    valueColIds: string[],
  ): ChartData {
    const labelCol = columns.find((c) => c.colId === labelColId);
    const valueCols = columns.filter((c) => valueColIds.includes(c.colId));

    if (!labelCol || valueCols.length === 0) return { labels: [], datasets: [] };

    return this.transform(rows, {
      labelField: labelCol.field,
      valueFields: valueCols.map((c) => c.field),
    });
  }

  private aggregate(values: number[], fn: string): number {
    if (values.length === 0) return 0;
    switch (fn) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return values.reduce((a, b) => a + b, 0);
    }
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
