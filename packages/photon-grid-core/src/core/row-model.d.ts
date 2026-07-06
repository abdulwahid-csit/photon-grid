import type { RowNode } from '../types/row.types';
import type { GridStore } from './grid-store';
import type { EventBus } from '../event-bus/event-bus';
export declare class RowModel {
    private store;
    private eventBus;
    private rawData;
    private idField;
    private defaultRowHeight;
    constructor(store: GridStore, eventBus: EventBus);
    setRowData(data: Record<string, unknown>[], rowHeight?: number): void;
    appendRowData(data: Record<string, unknown>[]): void;
    updateRow(nodeId: string, newData: Partial<Record<string, unknown>>): void;
    removeRows(nodeIds: string[]): void;
    getRowNode(nodeId: string): RowNode | undefined;
    getRowByIndex(index: number): RowNode | undefined;
    setVisibleRows(nodes: RowNode[]): void;
    setRenderedRows(nodes: RowNode[]): void;
    setRowHeight(nodeId: string, height: number): void;
    buildGroupHeaderNode(groupKey: string, groupField: string, groupValue: unknown, children: RowNode[], level: number): RowNode;
    /**
     * Builds a `type: 'detail'` `RowNode` rendered directly beneath `parentRow`.
     * Used by `MasterDetailEngine.injectDetailRows` — `height` should come from
     * the engine's per-parent height cache (auto-measured or manually resized)
     * so repeated pipeline runs don't reset an already-known detail height.
     */
    createDetailNode(parentRow: RowNode, detail: Record<string, unknown>, height?: number): RowNode;
    getRawData(): Record<string, unknown>[];
    private buildRowNodes;
    private layoutNodes;
}
//# sourceMappingURL=row-model.d.ts.map