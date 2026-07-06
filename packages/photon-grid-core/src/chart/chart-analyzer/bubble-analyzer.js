import { APEX_COLORS } from './types';
/**
 * Maps three numeric columns to X / Y / size data for a bubble-style scatter
 * chart.  The third measure (size) is normalised to [0–1] and encoded by
 * varying the dot radius in the renderer.  When only two measures are supplied
 * it degrades gracefully to standard scatter behaviour.
 *
 * Point counts are capped at 100 to keep rendering performance acceptable.
 */
export class BubbleAnalyzer {
    analyze(dimensions, measures, rows) {
        if (measures.length < 2)
            return null;
        const [xM, yM, sizeM] = measures;
        const seriesDim = dimensions[0] ?? null;
        const dataRows = rows.filter((r) => r.type === 'data').slice(0, BubbleAnalyzer.MAX_POINTS);
        const sizeRange = sizeM ? (sizeM.max - sizeM.min || 1) : 1;
        const getY = (row) => {
            const v = Number(row.data[yM.column.field]);
            return isNaN(v) ? 0 : v;
        };
        const baseTitle = sizeM
            ? `${yM.column.header} vs ${xM.column.header} (size: ${sizeM.column.header})`
            : `${yM.column.header} vs ${xM.column.header}`;
        if (seriesDim) {
            const groups = new Map();
            for (const row of dataRows) {
                const key = String(row.data[seriesDim.column.field] ?? '');
                if (!groups.has(key))
                    groups.set(key, []);
                groups.get(key).push(row);
            }
            const keys = Array.from(groups.keys()).slice(0, BubbleAnalyzer.MAX_SERIES);
            return {
                title: `${baseTitle} by ${seriesDim.column.header}`,
                data: {
                    labels: dataRows.map((r) => String(r.data[xM.column.field] ?? '')),
                    datasets: keys.map((key, i) => ({
                        label: key,
                        data: groups.get(key).map(getY),
                        color: APEX_COLORS[i % APEX_COLORS.length],
                    })),
                },
            };
        }
        return {
            title: baseTitle,
            data: {
                labels: dataRows.map((r) => String(r.data[xM.column.field] ?? '')),
                datasets: [{
                        label: yM.column.header,
                        data: dataRows.map(getY),
                        color: APEX_COLORS[0],
                    }],
            },
        };
    }
}
BubbleAnalyzer.MAX_POINTS = 100;
BubbleAnalyzer.MAX_SERIES = 5;
//# sourceMappingURL=bubble-analyzer.js.map