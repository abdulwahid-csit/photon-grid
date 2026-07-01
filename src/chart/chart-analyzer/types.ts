import type { ColumnDef } from '../../types/column.types';
import type { ChartData } from '../chart-data-transformer';

export { ChartData };

export const APEX_COLORS = [
  '#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0',
  '#3F51B5', '#03A9F4', '#4CAF50', '#F9CE1D', '#FF9800',
];

export const DIMENSION_TYPES = new Set<string>(['string', 'dropdown', 'date', 'boolean', 'email']);
export const MEASURE_TYPES   = new Set<string>(['number', 'currency', 'percentage']);
export const DATE_TYPES      = new Set<string>(['date']);

export const MAX_CATEGORIES = 50;
export const PIE_MAX_SLICES = 10;

// ────────────────────────────────────────────────────────────

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
