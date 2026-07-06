import { MAX_CATEGORIES } from './types';
/**
 * Groups rows by a dimension column and aggregates one or more measure columns
 * per group. Insertion order of labels is preserved (first-seen wins), so the
 * output order matches the data order in the grid.
 */
export class AggregationAnalyzer {
    aggregate(dimensionCol, measureCols, rows, strategy = 'sum') {
        const labelOrder = [];
        const labelSeen = new Set();
        // fieldKey → labelValue → accumulator
        const acc = new Map();
        for (const mc of measureCols)
            acc.set(mc.field, new Map());
        for (const row of rows) {
            if (row.type !== 'data')
                continue;
            const raw = row.data[dimensionCol.field];
            const label = raw == null ? '' : String(raw);
            if (!labelSeen.has(label)) {
                labelSeen.add(label);
                labelOrder.push(label);
            }
            for (const mc of measureCols) {
                const v = Number(row.data[mc.field]);
                const safeV = isNaN(v) ? 0 : v;
                const colMap = acc.get(mc.field);
                const existing = colMap.get(label);
                if (existing) {
                    existing.sum += safeV;
                    existing.count++;
                    if (safeV < existing.min)
                        existing.min = safeV;
                    if (safeV > existing.max)
                        existing.max = safeV;
                }
                else {
                    colMap.set(label, { sum: safeV, count: 1, first: safeV, min: safeV, max: safeV });
                }
            }
        }
        const labels = labelOrder.slice(0, MAX_CATEGORIES);
        const seriesData = new Map();
        for (const mc of measureCols) {
            const colMap = acc.get(mc.field);
            seriesData.set(mc.field, labels.map((l) => {
                const e = colMap.get(l);
                if (!e)
                    return 0;
                switch (strategy) {
                    case 'avg': return e.count > 0 ? e.sum / e.count : 0;
                    case 'count': return e.count;
                    case 'first': return e.first;
                    case 'min': return e.min;
                    case 'max': return e.max;
                    default: return e.sum;
                }
            }));
        }
        return { labels, seriesData };
    }
}
//# sourceMappingURL=aggregation-analyzer.js.map