import { GridEventType } from '../../types/event.types';
import { evaluateStringCondition, evaluateNumberCondition, evaluateDateCondition, evaluateSetCondition, evaluateBooleanCondition, } from './filter-condition';
function resolveValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current == null)
            return undefined;
        current = current[part];
    }
    return current;
}
export class FilterEngine {
    constructor(store, eventBus) {
        this.store = store;
        this.eventBus = eventBus;
        this.filterModel = {};
        this.quickFilter = null;
    }
    setFilterModel(model) {
        this.filterModel = { ...model };
        this.store.set('filterModel', this.filterModel);
        this.store.set('filterActive', Object.keys(model).length > 0);
        this.eventBus.emit(GridEventType.FILTER_CHANGED, { model: this.filterModel });
    }
    setColumnFilter(colId, filter) {
        if (filter === null) {
            delete this.filterModel[colId];
        }
        else {
            this.filterModel[colId] = filter;
        }
        this.store.set('filterModel', { ...this.filterModel });
        this.store.set('filterActive', Object.keys(this.filterModel).length > 0);
        this.eventBus.emit(GridEventType.COLUMN_FILTER_CHANGED, { model: this.filterModel });
        this.eventBus.emit(GridEventType.FILTER_CHANGED, { model: this.filterModel });
    }
    clearColumnFilter(colId) {
        this.setColumnFilter(colId, null);
    }
    clearAllFilters() {
        this.filterModel = {};
        this.quickFilter = null;
        this.store.set('filterModel', {});
        this.store.set('quickFilterConfig', null);
        this.store.set('filterActive', false);
        this.eventBus.emit(GridEventType.FILTER_CHANGED, { model: {} });
        this.eventBus.emit(GridEventType.QUICK_FILTER_CHANGED, { config: { term: '' } });
    }
    setQuickFilter(config) {
        this.quickFilter = config;
        this.store.set('quickFilterConfig', config);
        this.eventBus.emit(GridEventType.QUICK_FILTER_CHANGED, { config });
    }
    applyFilters(rows, columns) {
        if (!this.hasActiveFilters())
            return rows;
        return rows.filter((row) => this.matchesRow(row, columns));
    }
    /** `true` when at least one column filter or a quick filter is currently active — lets callers (e.g. `TreeDataService`) skip filtering work entirely when there's nothing to filter by. */
    hasActiveFilters() {
        return Object.keys(this.filterModel).length > 0 || !!this.quickFilter?.term;
    }
    /**
     * The single row-level predicate `applyFilters` runs for every row —
     * extracted as a public method so tree-aware filtering (`TreeDataService`)
     * can reuse the exact same column-filter/quick-filter logic per node
     * instead of re-implementing condition matching against a hierarchy.
     * Non-`'data'` rows (group headers, footers, etc.) always pass, matching
     * `applyFilters`'s prior inline behavior.
     */
    matchesRow(row, columns) {
        if (row.type !== 'data')
            return true;
        const colMap = new Map(columns.map((c) => [c.colId, c]));
        const filterEntries = Object.entries(this.filterModel);
        if (filterEntries.length > 0 && !this.passesColumnFilters(row, filterEntries, colMap))
            return false;
        if (this.quickFilter?.term && !this.passesQuickFilter(row, columns))
            return false;
        return true;
    }
    getFilterModel() {
        return { ...this.filterModel };
    }
    isColumnFiltered(colId) {
        return colId in this.filterModel;
    }
    passesColumnFilters(row, filterEntries, colMap) {
        for (const [colId, filter] of filterEntries) {
            const col = colMap.get(colId);
            if (!col)
                continue;
            const cellValue = resolveValue(row.data, filter.field);
            if (filter.selectedIds && filter.selectedIds.length > 0) {
                if (!evaluateSetCondition('in', filter.selectedIds, cellValue))
                    return false;
                continue;
            }
            if (!filter.conditions || filter.conditions.length === 0)
                continue;
            const [c1, c2] = filter.conditions;
            const pass1 = this.evaluateCondition(filter.type, c1, cellValue, col);
            if (!c2 || filter.logic === 'and') {
                if (!pass1)
                    return false;
                if (c2) {
                    const pass2 = this.evaluateCondition(filter.type, c2, cellValue, col);
                    if (!pass2)
                        return false;
                }
            }
            else {
                const pass2 = this.evaluateCondition(filter.type, c2, cellValue, col);
                if (!pass1 && !pass2)
                    return false;
            }
        }
        return true;
    }
    evaluateCondition(type, condition, cellValue, col) {
        switch (type) {
            case 'number':
            case 'currency':
                return evaluateNumberCondition(condition, cellValue);
            case 'date':
            case 'time':
                return evaluateDateCondition(condition, cellValue);
            case 'boolean':
                return evaluateBooleanCondition(condition, cellValue);
            default:
                return evaluateStringCondition(condition, cellValue);
        }
    }
    passesQuickFilter(row, columns) {
        if (!this.quickFilter)
            return true;
        const { term, caseSensitive, fields } = this.quickFilter;
        const searchTerm = caseSensitive ? term : term.toLowerCase();
        const searchFields = fields ?? columns.map((c) => c.field);
        for (const field of searchFields) {
            const val = resolveValue(row.data, field);
            const str = caseSensitive ? String(val ?? '') : String(val ?? '').toLowerCase();
            if (str.includes(searchTerm))
                return true;
        }
        return false;
    }
}
//# sourceMappingURL=filter-engine.js.map