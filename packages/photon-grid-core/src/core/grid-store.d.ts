import type { EventBus } from '../event-bus/event-bus';
import type { ColumnDef, ColumnState } from '../types/column.types';
import type { RowNode } from '../types/row.types';
import type { FilterModel, QuickFilterConfig } from '../types/filter.types';
import type { SortConfig, PaginationConfig, CellRange } from '../types/grid.types';
export interface GridStoreState {
    allRows: RowNode[];
    visibleRows: RowNode[];
    renderedRows: RowNode[];
    totalRowCount: number;
    columns: ColumnDef[];
    columnStates: Map<string, ColumnState>;
    pinnedLeftColumns: ColumnDef[];
    pinnedRightColumns: ColumnDef[];
    centerColumns: ColumnDef[];
    sortConfig: SortConfig[];
    filterModel: FilterModel;
    quickFilterConfig: QuickFilterConfig | null;
    filterActive: boolean;
    pagination: PaginationConfig;
    groupedColumnIds: string[];
    expandedGroupKeys: Set<string>;
    expandedRowIds: Set<string>;
    expandedTreeNodeIds: Set<string>;
    selectedRowIds: Set<string>;
    activeRowId: string | null;
    isAllSelected: boolean;
    isIndeterminate: boolean;
    cellRanges: CellRange[];
    activeCell: {
        rowIndex: number;
        colIndex: number;
    } | null;
    loading: boolean;
    error: string | null;
    scrollTop: number;
    scrollLeft: number;
    viewportHeight: number;
    viewportWidth: number;
    firstRenderedRowIndex: number;
    lastRenderedRowIndex: number;
    fullScreen: boolean;
    editingCellId: string | null;
}
type Subscriber<K extends keyof GridStoreState> = (value: GridStoreState[K], prev: GridStoreState[K]) => void;
export declare class GridStore {
    private eventBus;
    private state;
    private subscribers;
    constructor(eventBus: EventBus);
    get<K extends keyof GridStoreState>(key: K): GridStoreState[K];
    set<K extends keyof GridStoreState>(key: K, value: GridStoreState[K]): void;
    update<K extends keyof GridStoreState>(key: K, updater: (current: GridStoreState[K]) => GridStoreState[K]): void;
    batch(updates: Partial<GridStoreState>): void;
    watch<K extends keyof GridStoreState>(key: K, subscriber: Subscriber<K>): () => void;
    snapshot(): Readonly<GridStoreState>;
    private notifySubscribers;
    private createInitialState;
    destroy(): void;
}
export {};
//# sourceMappingURL=grid-store.d.ts.map