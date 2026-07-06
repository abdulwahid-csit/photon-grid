import type { ColumnDef } from '../../types/column.types';
import type { ChartData } from '../chart-data-transformer';
export { ChartData };
export declare const APEX_COLORS: string[];
export declare const DIMENSION_TYPES: Set<string>;
export declare const MEASURE_TYPES: Set<string>;
export declare const DATE_TYPES: Set<string>;
export declare const MAX_CATEGORIES = 50;
export declare const PIE_MAX_SLICES = 10;
export interface DimensionInfo {
    column: ColumnDef;
    /** Semantic role of the dimension */
    role: 'category' | 'date' | 'boolean';
    /** All unique values present in the selection (capped at MAX_CATEGORIES) */
    uniqueValues: string[];
    /** Raw unique count before capping */
    uniqueCount: number;
    /** True when there are more than 20 unique values */
    isHighCardinality: boolean;
    /** True when the column type is 'date' */
    isDate: boolean;
}
export interface MeasureInfo {
    column: ColumnDef;
    min: number;
    max: number;
    sum: number;
    avg: number;
    count: number;
    hasNegatives: boolean;
    /** Raw numeric values for all selected data rows */
    allValues: number[];
}
export interface CardinalityInfo {
    uniqueCount: number;
    isHighCardinality: boolean;
    /** Top values sorted by frequency, descending */
    topValues: string[];
}
export interface ChartRecommendation {
    /** Chart type key, e.g. 'column-grouped', 'pie', 'scatter' */
    chartType: string;
    /** 0–1 confidence score */
    confidence: number;
    /** Human-readable reason for the recommendation */
    reason: string;
}
export interface AnalyzedChart {
    title: string;
    data: ChartData;
}
//# sourceMappingURL=types.d.ts.map