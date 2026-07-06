import type { RowNode } from '../../types/row.types';
import type { ColumnFilter, FilterModel, QuickFilterConfig } from '../../types/filter.types';
import type { ColumnDef } from '../../types/column.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
export declare class FilterEngine {
    private store;
    private eventBus;
    private filterModel;
    private quickFilter;
    constructor(store: GridStore, eventBus: EventBus);
    setFilterModel(model: FilterModel): void;
    setColumnFilter(colId: string, filter: ColumnFilter | null): void;
    clearColumnFilter(colId: string): void;
    clearAllFilters(): void;
    setQuickFilter(config: QuickFilterConfig): void;
    applyFilters(rows: RowNode[], columns: ColumnDef[]): RowNode[];
    /** `true` when at least one column filter or a quick filter is currently active — lets callers (e.g. `TreeDataService`) skip filtering work entirely when there's nothing to filter by. */
    hasActiveFilters(): boolean;
    /**
     * The single row-level predicate `applyFilters` runs for every row —
     * extracted as a public method so tree-aware filtering (`TreeDataService`)
     * can reuse the exact same column-filter/quick-filter logic per node
     * instead of re-implementing condition matching against a hierarchy.
     * Non-`'data'` rows (group headers, footers, etc.) always pass, matching
     * `applyFilters`'s prior inline behavior.
     */
    matchesRow(row: RowNode, columns: ColumnDef[]): boolean;
    getFilterModel(): FilterModel;
    isColumnFiltered(colId: string): boolean;
    private passesColumnFilters;
    private evaluateCondition;
    private passesQuickFilter;
}
//# sourceMappingURL=filter-engine.d.ts.map