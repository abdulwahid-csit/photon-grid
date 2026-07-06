import type { DimensionInfo, MeasureInfo, ChartRecommendation } from './types';
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
export declare class RecommendationEngine {
    private static readonly MIN_CONFIDENCE;
    recommend(dimensions: DimensionInfo[], measures: MeasureInfo[]): ChartRecommendation[];
}
//# sourceMappingURL=recommendation-engine.d.ts.map