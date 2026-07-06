import type { ColumnDef, ColumnState, ColumnPinPosition } from '../types/column.types';
import type { GridStore } from './grid-store';
import type { EventBus } from '../event-bus/event-bus';
export declare class ColumnModel {
    private store;
    private eventBus;
    private columns;
    constructor(store: GridStore, eventBus: EventBus);
    initColumns(defs: ColumnDef[]): void;
    getColumn(colId: string): ColumnDef | undefined;
    getAllColumns(): ColumnDef[];
    getVisibleColumns(): ColumnDef[];
    setColumnWidth(colId: string, width: number, finished?: boolean): void;
    setColumnVisible(colId: string, visible: boolean): void;
    setColumnPin(colId: string, pinned: ColumnPinPosition): void;
    moveColumn(fromIndex: number, toIndex: number): void;
    /** Move a column to a different panel (changing its pinned state) and insert it at a specific position. */
    moveAndPin(colId: string, newPin: ColumnPinPosition, insertBeforeColId: string | null): void;
    setColumnSort(colId: string, order: 'asc' | 'desc' | null): void;
    /** Clears the sort indicator from every column (the header-arrow counterpart to `SortEngine.clearSort`). */
    clearAllSort(): void;
    autoSizeColumn(colId: string, containerEl: HTMLElement): void;
    applyColumnStates(states: ColumnState[]): void;
    getColumnStates(): ColumnState[];
    private rebuildPinnedSections;
    private syncColumnOrder;
    private normalizeColumn;
    private emitStatesChanged;
}
//# sourceMappingURL=column-model.d.ts.map