import type { RowNode } from '../../types/row.types';
import type { ColumnFilter, FilterCondition, FilterModel, QuickFilterConfig } from '../../types/filter.types';
import type { ColumnDef } from '../../types/column.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import { GridEventType } from '../../types/event.types';
import {
  evaluateStringCondition,
  evaluateNumberCondition,
  evaluateDateCondition,
  evaluateSetCondition,
  evaluateBooleanCondition,
} from './filter-condition';

function resolveValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export class FilterEngine {
  private filterModel: FilterModel = {};
  private quickFilter: QuickFilterConfig | null = null;

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
  ) {}

  setFilterModel(model: FilterModel): void {
    this.filterModel = { ...model };
    this.store.set('filterModel', this.filterModel);
    this.store.set('filterActive', Object.keys(model).length > 0);
    this.eventBus.emit(GridEventType.FILTER_CHANGED, { model: this.filterModel });
  }

  setColumnFilter(colId: string, filter: ColumnFilter | null): void {
    if (filter === null) {
      delete this.filterModel[colId];
    } else {
      this.filterModel[colId] = filter;
    }
    this.store.set('filterModel', { ...this.filterModel });
    this.store.set('filterActive', Object.keys(this.filterModel).length > 0);
    this.eventBus.emit(GridEventType.COLUMN_FILTER_CHANGED, { model: this.filterModel });
    this.eventBus.emit(GridEventType.FILTER_CHANGED, { model: this.filterModel });
  }

  clearColumnFilter(colId: string): void {
    this.setColumnFilter(colId, null);
  }

  clearAllFilters(): void {
    this.filterModel = {};
    this.quickFilter = null;
    this.store.set('filterModel', {});
    this.store.set('quickFilterConfig', null);
    this.store.set('filterActive', false);
    this.eventBus.emit(GridEventType.FILTER_CHANGED, { model: {} });
    this.eventBus.emit(GridEventType.QUICK_FILTER_CHANGED, { config: { term: '' } });
  }

  setQuickFilter(config: QuickFilterConfig): void {
    this.quickFilter = config;
    this.store.set('quickFilterConfig', config);
    this.eventBus.emit(GridEventType.QUICK_FILTER_CHANGED, { config });
  }

  applyFilters(rows: RowNode[], columns: ColumnDef[]): RowNode[] {
    const colMap = new Map(columns.map((c) => [c.colId, c]));
    const filterEntries = Object.entries(this.filterModel);
    const hasFilters = filterEntries.length > 0;
    const hasQuick = !!this.quickFilter?.term;

    if (!hasFilters && !hasQuick) return rows;

    return rows.filter((row) => {
      if (row.type !== 'data') return true;

      if (hasFilters && !this.passesColumnFilters(row, filterEntries, colMap)) return false;
      if (hasQuick && !this.passesQuickFilter(row, columns)) return false;
      return true;
    });
  }

  getFilterModel(): FilterModel {
    return { ...this.filterModel };
  }

  isColumnFiltered(colId: string): boolean {
    return colId in this.filterModel;
  }

  private passesColumnFilters(
    row: RowNode,
    filterEntries: [string, ColumnFilter][],
    colMap: Map<string, ColumnDef>,
  ): boolean {
    for (const [colId, filter] of filterEntries) {
      const col = colMap.get(colId);
      if (!col) continue;
      const cellValue = resolveValue(row.data, filter.field);

      if (filter.selectedIds && filter.selectedIds.length > 0) {
        if (!evaluateSetCondition('in', filter.selectedIds, cellValue)) return false;
        continue;
      }

      if (!filter.conditions || (filter.conditions as FilterCondition[]).length === 0) continue;

      const [c1, c2] = filter.conditions;
      const pass1 = this.evaluateCondition(filter.type, c1, cellValue, col);

      if (!c2 || filter.logic === 'and') {
        if (!pass1) return false;
        if (c2) {
          const pass2 = this.evaluateCondition(filter.type, c2, cellValue, col);
          if (!pass2) return false;
        }
      } else {
        const pass2 = this.evaluateCondition(filter.type, c2, cellValue, col);
        if (!pass1 && !pass2) return false;
      }
    }
    return true;
  }

  private evaluateCondition(
    type: string,
    condition: NonNullable<ColumnFilter['conditions'][number]>,
    cellValue: unknown,
    col: ColumnDef,
  ): boolean {
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

  private passesQuickFilter(row: RowNode, columns: ColumnDef[]): boolean {
    if (!this.quickFilter) return true;
    const { term, caseSensitive, fields } = this.quickFilter;
    const searchTerm = caseSensitive ? term : term.toLowerCase();
    const searchFields = fields ?? columns.map((c) => c.field);

    for (const field of searchFields) {
      const val = resolveValue(row.data, field);
      const str = caseSensitive ? String(val ?? '') : String(val ?? '').toLowerCase();
      if (str.includes(searchTerm)) return true;
    }
    return false;
  }
}
