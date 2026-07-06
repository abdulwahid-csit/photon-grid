import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import type { AggregationEngine } from '../aggregation/aggregation-engine';
export declare class GroupingEngine {
    private store;
    private eventBus;
    /**
     * Optional aggregation service.  When provided, aggregations are computed
     * bottom-up on the group tree before it is flattened into visible rows.
     */
    private aggregationEngine?;
    constructor(store: GridStore, eventBus: EventBus, 
    /**
     * Optional aggregation service.  When provided, aggregations are computed
     * bottom-up on the group tree before it is flattened into visible rows.
     */
    aggregationEngine?: AggregationEngine | undefined);
    groupByColumns(groupColIds: string[], columns: ColumnDef[], rows: RowNode[]): RowNode[];
    addGroupColumn(colId: string): void;
    removeGroupColumn(colId: string): void;
    reorderGroupColumns(orderedIds: string[]): void;
    clearGrouping(): void;
    expandGroup(groupKey: string): void;
    collapseGroup(groupKey: string): void;
    toggleGroup(groupKey: string): void;
    expandAllGroups(rows: RowNode[]): void;
    collapseAllGroups(): void;
    isGroupExpanded(groupKey: string): boolean;
    private buildGroupTree;
}
//# sourceMappingURL=grouping-engine.d.ts.map