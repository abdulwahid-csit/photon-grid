import type { RowNode } from '../../types/row.types';
import type { SelectionConfig } from '../../types/grid.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
export declare class RowSelectionEngine {
    private store;
    private eventBus;
    private config;
    constructor(store: GridStore, eventBus: EventBus);
    configure(config: Partial<SelectionConfig>): void;
    selectRow(nodeId: string, rows: RowNode[]): void;
    deselectRow(nodeId: string, rows: RowNode[]): void;
    toggleRowSelection(nodeId: string, rows: RowNode[]): void;
    selectRows(nodeIds: string[], rows: RowNode[]): void;
    selectAll(rows: RowNode[]): void;
    deselectAll(rows: RowNode[]): void;
    selectRange(fromIndex: number, toIndex: number, rows: RowNode[]): void;
    isRowSelected(nodeId: string): boolean;
    getSelectedRows(rows: RowNode[]): RowNode[];
    getSelectedCount(): number;
    clearSelection(rows: RowNode[]): void;
    private isAllSelected;
    private updateSelectionState;
    private applySelectionToRows;
}
//# sourceMappingURL=row-selection-engine.d.ts.map