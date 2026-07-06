export type FilterOperator = 'contains' | 'notContains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith' | 'lessThan' | 'lessThanOrEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'inRange' | 'blank' | 'notBlank' | 'before' | 'after' | 'in' | 'notIn';
export type FilterLogic = 'and' | 'or';
export type FilterDataType = 'string' | 'number' | 'date' | 'boolean' | 'dropdown' | 'array';
export interface FilterCondition {
    operator: FilterOperator;
    value: unknown;
    valueTo?: unknown;
}
export interface ColumnFilter {
    colId: string;
    field: string;
    type: FilterDataType;
    logic: FilterLogic;
    conditions: [FilterCondition] | [FilterCondition, FilterCondition];
    selectedIds?: (string | number)[];
    searchTerm?: string;
}
export interface FilterModel {
    [colId: string]: ColumnFilter;
}
export interface QuickFilterConfig {
    term: string;
    caseSensitive?: boolean;
    fields?: string[];
}
export interface FilterResult<T = Record<string, unknown>> {
    data: T[];
    filteredCount: number;
    totalCount: number;
}
/**
 * A value/label pair used to populate a set-filter checkbox list.
 * For `dropdown` columns the `value` is the raw option value and `label` is the
 * display label. For all other set-type columns `value === label`.
 */
export interface FilterSetOption {
    /** Raw cell value used when building the {@link ColumnFilter.selectedIds} array. */
    value: string;
    /** Human-readable label rendered in the checkbox list. */
    label: string;
}
//# sourceMappingURL=filter.types.d.ts.map