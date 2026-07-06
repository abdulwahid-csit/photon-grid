import type { ColumnDef, ColumnState } from './column.types';
import type { ColumnGroupHeaderCollapsedEvent, ColumnGroupHeaderExpandedEvent, ColumnGroupHeaderCreatedEvent, ColumnGroupHeaderRemovedEvent } from '../column-groups/column-group.types';
import type { RowNode, RowDropPayload, RowClickPayload, RowEditPayload } from './row.types';
import type { FilterModel, QuickFilterConfig } from './filter.types';
import type { CellRange } from './grid.types';
import type { TreeNodeToggleClickedPayload, TreeNodeTogglePayload, TreeChildrenLoadedPayload } from './tree-data.types';
export declare const GridEventType: {
    readonly READY: "grid:ready";
    readonly DESTROYED: "grid:destroyed";
    readonly DATA_CHANGED: "grid:dataChanged";
    readonly ROWS_RENDERED: "grid:rowsRendered";
    readonly SCROLL: "grid:scroll";
    readonly ROW_CLICKED: "row:clicked";
    readonly ROW_DOUBLE_CLICKED: "row:doubleClicked";
    readonly ROW_SELECTED: "row:selected";
    readonly ROW_DESELECTED: "row:deselected";
    readonly ALL_ROWS_SELECTED: "row:allSelected";
    readonly ALL_ROWS_DESELECTED: "row:allDeselected";
    readonly ROW_EXPANDED: "row:expanded";
    readonly ROW_COLLAPSED: "row:collapsed";
    readonly ROW_GROUP_OPENED: "row:groupOpened";
    readonly ROW_DROP: "row:drop";
    readonly ROW_EDIT_START: "row:editStart";
    readonly ROW_EDIT_STOP: "row:editStop";
    readonly CELL_CLICKED: "cell:clicked";
    readonly CELL_DOUBLE_CLICKED: "cell:doubleClicked";
    readonly CELL_VALUE_CHANGED: "cell:valueChanged";
    readonly CELL_EDIT_START: "cell:editStart";
    readonly CELL_EDIT_STOP: "cell:editStop";
    readonly CELL_SELECTION_CHANGED: "cell:selectionChanged";
    readonly COLUMN_RESIZED: "column:resized";
    readonly COLUMN_MOVED: "column:moved";
    readonly COLUMN_PINNED: "column:pinned";
    readonly COLUMN_VISIBLE: "column:visible";
    readonly COLUMN_SORTED: "column:sorted";
    readonly COLUMN_FILTER_CHANGED: "column:filterChanged";
    readonly COLUMNS_STATE_CHANGED: "column:stateChanged";
    readonly COLUMN_AUTOSIZE: "column:autoSize";
    readonly COLUMN_GROUP_CHANGED: "column:groupChanged";
    readonly SORT_CHANGED: "sort:changed";
    readonly FILTER_CHANGED: "filter:changed";
    readonly QUICK_FILTER_CHANGED: "filter:quickChanged";
    readonly PAGE_CHANGED: "pagination:pageChanged";
    readonly PAGE_SIZE_CHANGED: "pagination:pageSizeChanged";
    readonly GROUP_EXPANDED: "group:expanded";
    readonly GROUP_COLLAPSED: "group:collapsed";
    readonly THEME_CHANGED: "theme:changed";
    readonly EXPORT_START: "export:start";
    readonly EXPORT_COMPLETE: "export:complete";
    readonly EXPORT_ERROR: "export:error";
    readonly DRAG_STARTED: "drag:started";
    readonly DRAG_OVER: "drag:over";
    readonly DRAG_STOPPED: "drag:stopped";
    readonly CHART_CREATED: "chart:created";
    readonly CHART_DESTROYED: "chart:destroyed";
    readonly CHART_RANGE_SELECTION_CHANGED: "chart:rangeSelectionChanged";
    readonly LOADING_STARTED: "loading:started";
    readonly LOADING_STOPPED: "loading:stopped";
    readonly CELL_CONTEXT_MENU: "cell:contextMenu";
    readonly COLUMN_GROUP_HEADER_COLLAPSED: "columnGroup:collapsed";
    readonly COLUMN_GROUP_HEADER_EXPANDED: "columnGroup:expanded";
    readonly COLUMN_GROUP_HEADER_CREATED: "columnGroup:created";
    readonly COLUMN_GROUP_HEADER_REMOVED: "columnGroup:removed";
    readonly ROW_DETAIL_TOGGLE_CLICKED: "row:detailToggleClicked";
    readonly ROW_DETAIL_OPENED: "row:detailOpened";
    readonly ROW_DETAIL_CLOSED: "row:detailClosed";
    readonly ROW_DETAIL_HEIGHT_CHANGED: "row:detailHeightChanged";
    readonly TREE_NODE_TOGGLE_CLICKED: "tree:nodeToggleClicked";
    readonly TREE_NODE_EXPANDED: "tree:nodeExpanded";
    readonly TREE_NODE_COLLAPSED: "tree:nodeCollapsed";
    readonly TREE_CHILDREN_LOADED: "tree:childrenLoaded";
};
export type GridEventType = (typeof GridEventType)[keyof typeof GridEventType];
export interface GridEvent<T = unknown> {
    type: GridEventType;
    payload: T;
    timestamp: number;
    source: 'user' | 'api' | 'internal';
}
export interface ReadyEvent {
    api: unknown;
}
export interface DataChangedEvent {
    oldCount: number;
    newCount: number;
}
export interface ScrollEvent {
    scrollTop: number;
    scrollLeft: number;
    isAtTop: boolean;
    isAtBottom: boolean;
}
export interface RowSelectedEvent {
    rows: RowNode[];
    selectedCount: number;
    isAllSelected: boolean;
}
export interface CellClickedEvent {
    row: RowNode;
    colDef: ColumnDef;
    value: unknown;
    rowIndex: number;
    colIndex: number;
    event: MouseEvent;
}
export interface CellValueChangedEvent {
    row: RowNode;
    colDef: ColumnDef;
    oldValue: unknown;
    newValue: unknown;
    rowIndex: number;
}
export interface CellSelectionChangedEvent {
    ranges: CellRange[];
}
export interface ColumnResizedEvent {
    colDef: ColumnDef;
    newWidth: number;
    finished: boolean;
}
export interface ColumnMovedEvent {
    colDef: ColumnDef;
    fromIndex: number;
    toIndex: number;
}
export interface ColumnSortedEvent {
    colId: string;
    field: string;
    order: 'asc' | 'desc' | null;
}
export interface FilterChangedEvent {
    model: FilterModel;
}
export interface QuickFilterChangedEvent {
    config: QuickFilterConfig;
}
export interface PageChangedEvent {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
}
export interface ThemeChangedEvent {
    themeName: string;
}
export interface ExportEvent {
    format: 'csv' | 'xlsx';
    fileName: string;
    rowCount: number;
}
export interface ColumnsStateChangedEvent {
    states: ColumnState[];
}
export interface RowDetailToggleClickedEvent {
    row: RowNode;
    colDef: ColumnDef;
}
export interface RowDetailOpenedEvent {
    nodeId: string;
    row: RowNode;
}
export interface RowDetailClosedEvent {
    nodeId: string;
    row: RowNode;
}
export interface RowDetailHeightChangedEvent {
    nodeId: string;
    height: number;
}
export type GridEventMap = {
    [GridEventType.READY]: ReadyEvent;
    [GridEventType.DATA_CHANGED]: DataChangedEvent;
    [GridEventType.SCROLL]: ScrollEvent;
    [GridEventType.ROW_SELECTED]: RowSelectedEvent;
    [GridEventType.ROW_DESELECTED]: RowSelectedEvent;
    [GridEventType.ALL_ROWS_SELECTED]: RowSelectedEvent;
    [GridEventType.ALL_ROWS_DESELECTED]: RowSelectedEvent;
    [GridEventType.ROW_CLICKED]: RowClickPayload;
    [GridEventType.ROW_DOUBLE_CLICKED]: RowClickPayload;
    [GridEventType.ROW_DROP]: RowDropPayload;
    [GridEventType.CELL_CLICKED]: CellClickedEvent;
    [GridEventType.CELL_DOUBLE_CLICKED]: CellClickedEvent;
    [GridEventType.CELL_VALUE_CHANGED]: CellValueChangedEvent;
    [GridEventType.CELL_SELECTION_CHANGED]: CellSelectionChangedEvent;
    [GridEventType.COLUMN_RESIZED]: ColumnResizedEvent;
    [GridEventType.COLUMN_MOVED]: ColumnMovedEvent;
    [GridEventType.COLUMN_SORTED]: ColumnSortedEvent;
    [GridEventType.COLUMN_FILTER_CHANGED]: FilterChangedEvent;
    [GridEventType.COLUMNS_STATE_CHANGED]: ColumnsStateChangedEvent;
    [GridEventType.SORT_CHANGED]: ColumnSortedEvent;
    [GridEventType.FILTER_CHANGED]: FilterChangedEvent;
    [GridEventType.QUICK_FILTER_CHANGED]: QuickFilterChangedEvent;
    [GridEventType.PAGE_CHANGED]: PageChangedEvent;
    [GridEventType.PAGE_SIZE_CHANGED]: PageChangedEvent;
    [GridEventType.THEME_CHANGED]: ThemeChangedEvent;
    [GridEventType.EXPORT_START]: ExportEvent;
    [GridEventType.EXPORT_COMPLETE]: ExportEvent;
    [GridEventType.ROW_EDIT_START]: RowEditPayload;
    [GridEventType.CELL_VALUE_CHANGED]: CellValueChangedEvent;
    [GridEventType.COLUMN_GROUP_HEADER_COLLAPSED]: ColumnGroupHeaderCollapsedEvent;
    [GridEventType.COLUMN_GROUP_HEADER_EXPANDED]: ColumnGroupHeaderExpandedEvent;
    [GridEventType.COLUMN_GROUP_HEADER_CREATED]: ColumnGroupHeaderCreatedEvent;
    [GridEventType.COLUMN_GROUP_HEADER_REMOVED]: ColumnGroupHeaderRemovedEvent;
    [GridEventType.ROW_DETAIL_TOGGLE_CLICKED]: RowDetailToggleClickedEvent;
    [GridEventType.ROW_DETAIL_OPENED]: RowDetailOpenedEvent;
    [GridEventType.TREE_NODE_TOGGLE_CLICKED]: TreeNodeToggleClickedPayload;
    [GridEventType.TREE_NODE_EXPANDED]: TreeNodeTogglePayload;
    [GridEventType.TREE_NODE_COLLAPSED]: TreeNodeTogglePayload;
    [GridEventType.TREE_CHILDREN_LOADED]: TreeChildrenLoadedPayload;
    [GridEventType.ROW_DETAIL_CLOSED]: RowDetailClosedEvent;
    [GridEventType.ROW_DETAIL_HEIGHT_CHANGED]: RowDetailHeightChangedEvent;
};
//# sourceMappingURL=event.types.d.ts.map