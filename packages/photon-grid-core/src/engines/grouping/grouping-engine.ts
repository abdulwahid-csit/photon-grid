import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import type { AggregationEngine } from '../aggregation/aggregation-engine';
import { GridEventType } from '../../types/event.types';
import {
  GroupTree,
  buildGroupKey,
  resolveField,
  getGroupDisplayValue,
  flattenGroupTree,
} from './group-node';

export class GroupingEngine {
  constructor(
    private store: GridStore,
    private eventBus: EventBus,
    /**
     * Optional aggregation service.  When provided, aggregations are computed
     * bottom-up on the group tree before it is flattened into visible rows.
     */
    private aggregationEngine?: AggregationEngine,
  ) {}

  groupByColumns(groupColIds: string[], columns: ColumnDef[], rows: RowNode[]): RowNode[] {
    if (groupColIds.length === 0) return rows;

    const groupCols = groupColIds
      .map((id) => columns.find((c) => c.colId === id))
      .filter((c): c is ColumnDef => !!c);

    const groupFields = groupCols.map((c) => c.field);
    const groupTree = this.buildGroupTree(groupFields, rows, 0);

    // Compute aggregations bottom-up before flattening so every group node
    // has its aggregatedValues ready when the renderer reads them.
    if (this.aggregationEngine) {
      this.aggregationEngine.compute(groupTree, columns);
    }

    const expandedKeys = this.store.get('expandedGroupKeys');
    return flattenGroupTree(groupTree, expandedKeys);
  }

  addGroupColumn(colId: string): void {
    const current = this.store.get('groupedColumnIds');
    if (current.includes(colId)) return;
    this.store.set('groupedColumnIds', [...current, colId]);
    this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, { groupedColumnIds: [...current, colId] });
  }

  removeGroupColumn(colId: string): void {
    const current = this.store.get('groupedColumnIds');
    this.store.set('groupedColumnIds', current.filter((id) => id !== colId));
    this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, {
      groupedColumnIds: current.filter((id) => id !== colId),
    });
  }

  reorderGroupColumns(orderedIds: string[]): void {
    this.store.set('groupedColumnIds', orderedIds);
    this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, { groupedColumnIds: orderedIds });
  }

  clearGrouping(): void {
    this.store.set('groupedColumnIds', []);
    this.store.set('expandedGroupKeys', new Set());
    this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, { groupedColumnIds: [] });
  }

  expandGroup(groupKey: string): void {
    const keys = new Set(this.store.get('expandedGroupKeys'));
    keys.add(groupKey);
    this.store.set('expandedGroupKeys', keys);
    this.eventBus.emit(GridEventType.GROUP_EXPANDED, { groupKey });
  }

  collapseGroup(groupKey: string): void {
    const keys = new Set(this.store.get('expandedGroupKeys'));
    keys.delete(groupKey);
    this.store.set('expandedGroupKeys', keys);
    this.eventBus.emit(GridEventType.GROUP_COLLAPSED, { groupKey });
  }

  toggleGroup(groupKey: string): void {
    const keys = this.store.get('expandedGroupKeys');
    if (keys.has(groupKey)) {
      this.collapseGroup(groupKey);
    } else {
      this.expandGroup(groupKey);
    }
  }

  expandAllGroups(rows: RowNode[]): void {
    const groupRows = rows.filter((r) => r.type === 'group');
    const keys = new Set(groupRows.map((r) => r.groupKey!));
    this.store.set('expandedGroupKeys', keys);
  }

  collapseAllGroups(): void {
    this.store.set('expandedGroupKeys', new Set());
  }

  isGroupExpanded(groupKey: string): boolean {
    return this.store.get('expandedGroupKeys').has(groupKey);
  }

  private buildGroupTree(
    groupFields: string[],
    rows: RowNode[],
    level: number,
    parentKey = '',
  ): GroupTree[] {
    if (groupFields.length === 0 || rows.length === 0) return [];

    const [currentField, ...remainingFields] = groupFields;
    const buckets = new Map<string, RowNode[]>();

    for (const row of rows) {
      if (row.type !== 'data') continue;
      const rawValue = resolveField(row.data, currentField);
      const displayValue = getGroupDisplayValue(rawValue, currentField);
      const existing = buckets.get(displayValue) ?? [];
      existing.push(row);
      buckets.set(displayValue, existing);
    }

    const groups: GroupTree[] = [];
    for (const [displayValue, bucketRows] of buckets) {
      const key = parentKey ? `${parentKey}||${currentField}::${displayValue}` : `${currentField}::${displayValue}`;
      const children =
        remainingFields.length > 0
          ? this.buildGroupTree(remainingFields, bucketRows, level + 1, key)
          : [];

      groups.push({
        key,
        field: currentField,
        value: displayValue,
        level,
        children,
        rows: remainingFields.length === 0 ? bucketRows : [],
        expanded: this.store.get('expandedGroupKeys').has(key),
      });
    }

    return groups;
  }
}
