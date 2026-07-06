import { GridEventType } from '../../types/event.types';
import { resolveField, getGroupDisplayValue, flattenGroupTree, } from './group-node';
export class GroupingEngine {
    constructor(store, eventBus, 
    /**
     * Optional aggregation service.  When provided, aggregations are computed
     * bottom-up on the group tree before it is flattened into visible rows.
     */
    aggregationEngine) {
        this.store = store;
        this.eventBus = eventBus;
        this.aggregationEngine = aggregationEngine;
    }
    groupByColumns(groupColIds, columns, rows) {
        if (groupColIds.length === 0)
            return rows;
        const groupCols = groupColIds
            .map((id) => columns.find((c) => c.colId === id))
            .filter((c) => !!c);
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
    addGroupColumn(colId) {
        const current = this.store.get('groupedColumnIds');
        if (current.includes(colId))
            return;
        this.store.set('groupedColumnIds', [...current, colId]);
        this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, { groupedColumnIds: [...current, colId] });
    }
    removeGroupColumn(colId) {
        const current = this.store.get('groupedColumnIds');
        this.store.set('groupedColumnIds', current.filter((id) => id !== colId));
        this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, {
            groupedColumnIds: current.filter((id) => id !== colId),
        });
    }
    reorderGroupColumns(orderedIds) {
        this.store.set('groupedColumnIds', orderedIds);
        this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, { groupedColumnIds: orderedIds });
    }
    clearGrouping() {
        this.store.set('groupedColumnIds', []);
        this.store.set('expandedGroupKeys', new Set());
        this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, { groupedColumnIds: [] });
    }
    expandGroup(groupKey) {
        const keys = new Set(this.store.get('expandedGroupKeys'));
        keys.add(groupKey);
        this.store.set('expandedGroupKeys', keys);
        this.eventBus.emit(GridEventType.GROUP_EXPANDED, { groupKey });
    }
    collapseGroup(groupKey) {
        const keys = new Set(this.store.get('expandedGroupKeys'));
        keys.delete(groupKey);
        this.store.set('expandedGroupKeys', keys);
        this.eventBus.emit(GridEventType.GROUP_COLLAPSED, { groupKey });
    }
    toggleGroup(groupKey) {
        const keys = this.store.get('expandedGroupKeys');
        if (keys.has(groupKey)) {
            this.collapseGroup(groupKey);
        }
        else {
            this.expandGroup(groupKey);
        }
    }
    expandAllGroups(rows) {
        const groupRows = rows.filter((r) => r.type === 'group');
        const keys = new Set(groupRows.map((r) => r.groupKey));
        this.store.set('expandedGroupKeys', keys);
    }
    collapseAllGroups() {
        this.store.set('expandedGroupKeys', new Set());
    }
    isGroupExpanded(groupKey) {
        return this.store.get('expandedGroupKeys').has(groupKey);
    }
    buildGroupTree(groupFields, rows, level, parentKey = '') {
        if (groupFields.length === 0 || rows.length === 0)
            return [];
        const [currentField, ...remainingFields] = groupFields;
        const buckets = new Map();
        for (const row of rows) {
            if (row.type !== 'data')
                continue;
            const rawValue = resolveField(row.data, currentField);
            const displayValue = getGroupDisplayValue(rawValue, currentField);
            const existing = buckets.get(displayValue) ?? [];
            existing.push(row);
            buckets.set(displayValue, existing);
        }
        const groups = [];
        for (const [displayValue, bucketRows] of buckets) {
            const key = parentKey ? `${parentKey}||${currentField}::${displayValue}` : `${currentField}::${displayValue}`;
            const children = remainingFields.length > 0
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
//# sourceMappingURL=grouping-engine.js.map