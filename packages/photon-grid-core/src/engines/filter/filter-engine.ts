import type { RowNode } from '../../types/row.types';
import type { ColumnFilter, FilterCondition, FilterModel, QuickFilterConfig } from '../../types/filter.types';
import type { ColumnDef } from '../../types/column.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import { GridEventType } from '../../types/event.types';
import { compileDisplayText, type DisplayTextFn } from '../../renderer/renderer-resolver';
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

/**
 * The per-column work that is identical for every row, hoisted out of the row
 * loop.
 *
 * `matchesRow` used to build a fresh `Map` of every column on each call, so
 * filtering N rows allocated N maps and walked the column list N times. It now
 * takes one of these instead, built once per pipeline run. Compiling the
 * display-text resolvers here rather than per cell is what keeps the new
 * "filter on what the cell shows" behaviour free for columns that do not use it.
 */
interface FilterContext {
  /** Every column by `colId`, for resolving a filter entry to its definition. */
  readonly byId: ReadonlyMap<string, ColumnDef>;
  /**
   * Display-text resolvers by `colId`, present only for columns whose renderer
   * transforms its value. Absent for everything else, so an ordinary column's
   * filtering path is exactly what it was.
   *
   * @see BuiltInRendererDefinition.toText
   */
  readonly text: ReadonlyMap<string, DisplayTextFn>;
  /** Fields the quick filter scans, paired with their display-text resolver. */
  readonly quickFields: ReadonlyArray<{ field: string; toText: DisplayTextFn | null }>;
}

/**
 * Compiles the per-column state {@link FilterContext} describes.
 *
 * @param columns - The columns filtering runs against.
 * @param quickFields - Explicit `QuickFilterConfig.fields`, when set; otherwise
 *   every column's field is scanned.
 */
function buildFilterContext(columns: ColumnDef[], quickFields?: readonly string[]): FilterContext {
  const byId = new Map<string, ColumnDef>();
  const text = new Map<string, DisplayTextFn>();
  const byField = new Map<string, DisplayTextFn>();

  for (const col of columns) {
    byId.set(col.colId, col);
    const toText = compileDisplayText(col);
    if (toText) {
      text.set(col.colId, toText);
      byField.set(col.field, toText);
    }
  }

  const fields = quickFields ?? columns.map((c) => c.field);
  return {
    byId,
    text,
    quickFields: fields.map((field) => ({ field, toText: byField.get(field) ?? null })),
  };
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
    if (!this.hasActiveFilters()) return rows;
    return rows.filter((row) => this.matchesRow(row, columns));
  }

  /** `true` when at least one column filter or a quick filter is currently active — lets callers (e.g. `TreeDataService`) skip filtering work entirely when there's nothing to filter by. */
  hasActiveFilters(): boolean {
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
  matchesRow(row: RowNode, columns: ColumnDef[]): boolean {
    if (row.type !== 'data') return true;

    const colMap = new Map(columns.map((c) => [c.colId, c]));
    const filterEntries = Object.entries(this.filterModel);
    if (filterEntries.length > 0 && !this.passesColumnFilters(row, filterEntries, colMap)) return false;
    if (this.quickFilter?.term && !this.passesQuickFilter(row, columns)) return false;
    return true;
  }

  /**
   * Tests a single `data` row against one *ad-hoc* {@link ColumnFilter} using the
   * exact same operator logic the display pipeline runs — but without touching
   * the active filter model or hiding anything. This is the matcher behind
   * predicate-based **row selection** (e.g. Photon AI's "select all rows where
   * status is active"): it lets callers highlight matching rows while every row
   * stays visible.
   *
   * Non-`'data'` rows (group headers, footers) never match. Pure and stateless.
   *
   * @param row    - The row to test.
   * @param filter - The column filter (operator + value) to evaluate.
   * @param col    - The column definition `filter` targets.
   * @returns `true` when the row's cell value satisfies the filter.
   */
  matchesColumnFilter(row: RowNode, filter: ColumnFilter, col: ColumnDef): boolean {
    if (row.type !== 'data') return false;
    return this.passesColumnFilters(row, [[filter.colId, filter]], new Map([[col.colId, col]]));
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
