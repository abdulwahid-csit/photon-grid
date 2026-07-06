/**
 * Rules-based engine that scores chart types for a given selection.
 *
 * Rules are evaluated independently — multiple recommendations can have high
 * confidence.  The caller should display a ranked list and let the user pick.
 *
 * Confidence scale:
 *  0.90+  → best fit, recommend prominently
 *  0.70–0.89 → good fit
 *  0.50–0.69 → acceptable / fallback
 *  < 0.50   → not recommended (omitted from output)
 */
export class RecommendationEngine {
    recommend(dimensions, measures) {
        const recs = [];
        const push = (chartType, confidence, reason) => {
            if (confidence >= RecommendationEngine.MIN_CONFIDENCE) {
                recs.push({ chartType, confidence, reason });
            }
        };
        const nDims = dimensions.length;
        const nMeasures = measures.length;
        const primDim = dimensions[0] ?? null;
        const dateDim = dimensions.find((d) => d.isDate) ?? null;
        const hasNeg = measures.some((m) => m.hasNegatives);
        const highCardinality = primDim?.isHighCardinality ?? false;
        const lowCardinality = primDim ? primDim.uniqueCount <= 8 : false;
        // ── Time series ───────────────────────────────────────────────────────────
        if (dateDim && nMeasures >= 1) {
            const head = measures[0].column.header;
            push('line', 0.95, `Date column "${dateDim.column.header}" makes this ideal for a line time-series of ${head}`);
            push('area', 0.82, `Area chart emphasises cumulative change of ${head} over time`);
            push('column-grouped', 0.65, `Column chart also works for period-over-period comparison`);
        }
        // ── Scatter / Bubble ─────────────────────────────────────────────────────
        if (nDims === 0 && nMeasures === 2) {
            push('scatter', 0.93, `Two numeric columns — scatter is the best way to visualise the correlation between "${measures[0].column.header}" and "${measures[1].column.header}"`);
        }
        if (nMeasures >= 3 && nDims <= 1) {
            push('scatter', 0.78, `Three+ numeric columns — use the first two as X/Y axes; the third encodes point size`);
        }
        // ── Pie / Doughnut ───────────────────────────────────────────────────────
        if (nDims === 1 && nMeasures === 1 && lowCardinality && !hasNeg) {
            push('pie', 0.88, `${primDim.uniqueCount} categories with one measure — ideal part-to-whole view`);
            push('doughnut', 0.80, `Doughnut variant leaves room for a centre summary label`);
        }
        // ── Horizontal Bar (many categories) ─────────────────────────────────────
        if (nDims === 1 && nMeasures >= 1 && highCardinality) {
            push('bar-grouped', 0.90, `${primDim.uniqueCount} categories — horizontal bars are easier to read than tall column charts`);
            if (nMeasures > 1) {
                push('bar-stacked', 0.72, `Stacked horizontal bar shows part-to-whole across many categories`);
                push('bar-100stacked', 0.60, `100 % stacked horizontal bar normalises proportions across categories`);
            }
        }
        // ── Column (standard) ────────────────────────────────────────────────────
        if (nDims >= 1 && nMeasures >= 1 && !dateDim) {
            const baseLine = highCardinality ? 0.62 : 0.84;
            const multiHint = nMeasures > 1 ? ` (${nMeasures} measures grouped together)` : '';
            push('column-grouped', baseLine, `${measures[0].column.header} by ${primDim.column.header}${multiHint}`);
            if (nMeasures > 1) {
                push('column-stacked', baseLine - 0.10, `Stacked column reveals part-to-whole and total at a glance`);
                push('column-100stacked', baseLine - 0.22, `100 % stacked column focuses on proportional share, not absolute values`);
            }
        }
        // ── Funnel ───────────────────────────────────────────────────────────────
        if (nDims === 1 && nMeasures === 1) {
            push('funnel', 0.54, `Funnel works well for sequential stage / conversion data`);
        }
        // ── Polar / Radar ────────────────────────────────────────────────────────
        if (nDims === 1 && nMeasures >= 3) {
            push('polar', 0.66, `Polar/radar shows multi-dimensional performance across ${nMeasures} measures`);
        }
        // ── Dimensionless single measure → histogram ──────────────────────────────
        if (nDims === 0 && nMeasures === 1) {
            push('column-grouped', 0.80, `Single numeric column — histogram reveals the frequency distribution of "${measures[0].column.header}"`);
        }
        // Sort by confidence descending, then by name for stability
        return recs.sort((a, b) => b.confidence - a.confidence || a.chartType.localeCompare(b.chartType));
    }
}
RecommendationEngine.MIN_CONFIDENCE = 0.50;
//# sourceMappingURL=recommendation-engine.js.map