const DEFAULT_COLORS = [
    '#2563eb', '#16a34a', '#d97706', '#dc2626',
    '#7c3aed', '#0284c7', '#db2777', '#65a30d',
    '#c2410c', '#0891b2',
];
export class ChartDataTransformer {
    transform(rows, options) {
        const dataRows = rows.filter((r) => r.type === 'data');
        const { labelField, valueFields, aggregation = 'sum', limit, sortByValue, colors = DEFAULT_COLORS } = options;
        const grouped = new Map();
        for (const row of dataRows) {
            const label = String(this.resolveValue(row.data, labelField) ?? 'Unknown');
            if (!grouped.has(label)) {
                const entry = {};
                for (const field of valueFields)
                    entry[field] = [];
                grouped.set(label, entry);
            }
            const entry = grouped.get(label);
            for (const field of valueFields) {
                const val = Number(this.resolveValue(row.data, field));
                if (!isNaN(val))
                    entry[field].push(val);
            }
        }
        let labels = Array.from(grouped.keys());
        const datasets = valueFields.map((field, fi) => {
            const data = labels.map((label) => {
                const values = grouped.get(label)[field] ?? [];
                return this.aggregate(values, aggregation);
            });
            return {
                label: field,
                data,
                color: colors[fi % colors.length],
            };
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
    fromSelectedColumns(rows, columns, labelColId, valueColIds) {
        const labelCol = columns.find((c) => c.colId === labelColId);
        const valueCols = columns.filter((c) => valueColIds.includes(c.colId));
        if (!labelCol || valueCols.length === 0)
            return { labels: [], datasets: [] };
        return this.transform(rows, {
            labelField: labelCol.field,
            valueFields: valueCols.map((c) => c.field),
        });
    }
    aggregate(values, fn) {
        if (values.length === 0)
            return 0;
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
    resolveValue(data, path) {
        const parts = path.split('.');
        let current = data;
        for (const part of parts) {
            if (current == null)
                return undefined;
            current = current[part];
        }
        return current;
    }
}
//# sourceMappingURL=chart-data-transformer.js.map