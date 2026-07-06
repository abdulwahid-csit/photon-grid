import { MEASURE_TYPES } from './types';
/**
 * Identifies numeric columns (number, currency, percentage) and computes
 * descriptive statistics used by chart-specific analyzers.
 */
export class MeasureAnalyzer {
    analyze(columns, rows) {
        const measCols = columns.filter((c) => MEASURE_TYPES.has(c.type));
        return measCols.map((col) => {
            const allValues = [];
            for (const row of rows) {
                if (row.type !== 'data')
                    continue;
                const v = Number(row.data[col.field]);
                if (!isNaN(v))
                    allValues.push(v);
            }
            if (!allValues.length) {
                return { column: col, min: 0, max: 0, sum: 0, avg: 0, count: 0, hasNegatives: false, allValues };
            }
            let min = allValues[0];
            let max = allValues[0];
            let sum = 0;
            for (const v of allValues) {
                if (v < min)
                    min = v;
                if (v > max)
                    max = v;
                sum += v;
            }
            return {
                column: col,
                min,
                max,
                sum,
                avg: sum / allValues.length,
                count: allValues.length,
                hasNegatives: min < 0,
                allValues,
            };
        });
    }
}
//# sourceMappingURL=measure-analyzer.js.map