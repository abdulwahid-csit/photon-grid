import type { GridContext } from './grid-context';
import type { ColumnDef, ColumnState, ColumnPinPosition } from '../types/column.types';
import type { RowNode } from '../types/row.types';
import type { FilterModel, ColumnFilter } from '../types/filter.types';
import type { SortConfig, GridState, CellRange } from '../types/grid.types';
import type { GridEventType } from '../types/event.types';
import type { EventHandler } from '../event-bus/event-bus';
import type { ChartConfig } from '../chart/chart-engine';
import type { ColumnGroupModel } from '../column-groups/column-group-model';
import type { ColumnGroupSerialState, ColumnGroupSystemState, ColumnTreeNode } from '../column-groups/column-group.types';
import type { PhotonCommandResult } from '../photon-ai/photon-ai.types';
export declare class GridApi {
    private ctx;
    private _columnGroupModel;
    private _groupStateManager;
    constructor(ctx: GridContext);
    /**
     * Wire the live {@link ColumnGroupModel} into the API.
     * Called by {@link GridCore} after `buildContext` when column groups are present.
     *
     * @param model - The live group tree model.
     */
    setColumnGroupModel(model: ColumnGroupModel): void;
    setData(data: Record<string, unknown>[]): void;
    appendData(data: Record<string, unknown>[]): void;
    updateRow(nodeId: string, data: Partial<Record<string, unknown>>): void;
    removeRows(nodeIds: string[]): void;
    getRowNode(nodeId: string): RowNode | undefined;
    getRowByIndex(index: number): RowNode | undefined;
    getAllRows(): RowNode[];
    getVisibleRows(): RowNode[];
    setColumns(defs: ColumnDef[]): void;
    getColumn(colId: string): ColumnDef | undefined;
    getAllColumns(): ColumnDef[];
    getVisibleColumns(): ColumnDef[];
    setColumnWidth(colId: string, width: number): void;
    setColumnVisible(colId: string, visible: boolean): void;
    setColumnPin(colId: string, pinned: ColumnPinPosition): void;
    moveColumn(fromIndex: number, toIndex: number): void;
    autoSizeColumn(colId: string): void;
    autoSizeAllColumns(): void;
    getColumnStates(): ColumnState[];
    applyColumnStates(states: ColumnState[]): void;
    sortColumn(colId: string, order: 'asc' | 'desc'): void;
    clearSort(): void;
    getSortConfig(): SortConfig[];
    setFilterModel(model: FilterModel): void;
    setColumnFilter(colId: string, filter: ColumnFilter | null): void;
    clearAllFilters(): void;
    setQuickFilter(term: string, fields?: string[]): void;
    getFilterModel(): FilterModel;
    selectRow(nodeId: string): void;
    deselectRow(nodeId: string): void;
    selectAll(): void;
    deselectAll(): void;
    getSelectedRows(): RowNode[];
    getSelectedCount(): number;
    isRowSelected(nodeId: string): boolean;
    setCellRange(range: CellRange): void;
    clearCellSelection(): void;
    getCellRanges(): CellRange[];
    startCellEditing(rowNodeId: string, colId: string): void;
    stopEditing(cancel?: boolean): void;
    goToPage(page: number): void;
    setPageSize(size: number): void;
    getCurrentPage(): number;
    getTotalPages(): number;
    groupByColumn(colId: string): void;
    removeGroupColumn(colId: string): void;
    clearGrouping(): void;
    expandGroup(groupKey: string): void;
    collapseGroup(groupKey: string): void;
    expandAllGroups(): void;
    collapseAllGroups(): void;
    expandTreeNode(nodeId: string): void;
    collapseTreeNode(nodeId: string): void;
    toggleTreeNode(nodeId: string): void;
    expandAllTreeNodes(): void;
    collapseAllTreeNodes(): void;
    isTreeNodeExpanded(nodeId: string): boolean;
    /** The full set of children for `nodeId` (not just currently expanded/visible ones), or `[]` if the node doesn't exist, has none, or Tree Data isn't enabled. */
    getTreeNodeChildren(nodeId: string): RowNode[];
    /**
     * Triggers `TreeDataConfig.lazyLoadChildren` for `nodeId` if configured and
     * not already loaded/in-flight. Refreshes automatically once the fetch
     * resolves — no need to call `refresh()` yourself afterward.
     */
    loadTreeNodeChildren(nodeId: string): void;
    /** Expands `nodeId`'s detail row (a no-op if the row has no detail or is already expanded). */
    expandDetail(nodeId: string): void;
    /** Collapses `nodeId`'s detail row, destroying its nested grid instance (if any). */
    collapseDetail(nodeId: string): void;
    toggleDetail(nodeId: string): void;
    isDetailExpanded(nodeId: string): boolean;
    /** Collapses every currently-expanded detail row. */
    collapseAllDetails(): void;
    /**
     * Returns the nested `GridApi` for `nodeId`'s expanded detail row, enabling
     * programmatic control of the nested grid (sort, filter, selection, etc.).
     * `undefined` when the row is not expanded or its nested grid has not been
     * built yet (e.g. still loading, or scrolled outside the render window on
     * first expand).
     */
    getDetailGridApi(nodeId: string): unknown;
    /**
     * Programmatic equivalent of typing `text` into the Photon AI panel and
     * pressing send — runs the same normalize → parse → resolve → build →
     * execute pipeline. Useful for tests or a custom trigger UI. Returns a
     * graceful failure result (never throws) when `photonAI.enabled` is falsy.
     */
    submitAICommand(text: string): PhotonCommandResult;
    /**
     * Collapse a column header group, hiding all its leaf columns.
     *
     * @param groupId - The `groupId` of the group to collapse.
     */
    collapseColumnGroup(groupId: string): void;
    /**
     * Expand a column header group, showing all its leaf columns.
     *
     * @param groupId - The `groupId` of the group to expand.
     */
    expandColumnGroup(groupId: string): void;
    /**
     * Toggle a column header group between collapsed and expanded.
     *
     * @param groupId - The `groupId` of the group to toggle.
     */
    toggleColumnGroup(groupId: string): void;
    /**
     * Move an entire column group to a new position in the tree.
     *
     * @param groupId        - ID of the group to move.
     * @param newParentId    - Target parent group ID, or `null` for root level.
     * @param insertBeforeId - Sibling ID to insert before, or `null` to append.
     */
    moveColumnGroup(groupId: string, newParentId: string | null, insertBeforeId: string | null): void;
    /**
     * Serialize the complete column-group system state (groups + leaf columns).
     *
     * @returns A {@link ColumnGroupSystemState} snapshot safe for `JSON.stringify`.
     */
    getColumnGroupState(): ColumnGroupSystemState | null;
    /**
     * Restore a previously serialized column-group system state.
     *
     * @param state - Partial or full {@link ColumnGroupSystemState}.
     */
    applyColumnGroupState(state: Partial<ColumnGroupSystemState>): void;
    /**
     * Return the serialized expand/collapse states for all groups.
     */
    getColumnGroupStates(): ColumnGroupSerialState[];
    /**
     * Return the root nodes of the column tree (groups and leaves at the top level).
     * Returns `null` when no column groups are configured.
     */
    getColumnTree(): ColumnTreeNode[] | null;
    exportCsv(fileName?: string): void;
    exportXlsx(fileName?: string): void;
    copySelectedRowsToClipboard(): Promise<void>;
    /** Copies the active cell range(s) — not row selection — to the clipboard as tab-separated text, with a header row. A no-op when no cell range is active. */
    copySelectedCellsToClipboard(): Promise<void>;
    scrollToRow(rowIndex: number): void;
    scrollToTop(): void;
    /** Whether the grid body can still scroll further up. Used by a Master/Detail parent to chain wheel scroll into a nested grid before forwarding it further up itself. */
    canScrollUp(): boolean;
    /** Whether the grid body can still scroll further down. */
    canScrollDown(): boolean;
    setTheme(nameOrTheme: string): void;
    toggleDarkMode(): void;
    enterFullScreen(): void;
    exitFullScreen(): void;
    createChart(parentEl: HTMLElement, config: ChartConfig): string;
    destroyChart(chartId: string): void;
    exportChartAsImage(chartId: string, format?: 'png' | 'jpeg'): string | null;
    getGridState(): GridState;
    applyGridState(state: GridState): void;
    on<T>(event: GridEventType, handler: EventHandler<T>): () => void;
    off(event: GridEventType, handler: EventHandler): void;
    getSummaryRow(): Record<string, unknown>;
    refresh(): void;
    forceRefresh(): void;
    destroy(): void;
    private applyPipeline;
}
//# sourceMappingURL=grid-api.d.ts.map