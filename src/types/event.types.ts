import type { ColumnDef, ColumnState } from './column.types';
import type {
  ColumnGroupHeaderCollapsedEvent,
  ColumnGroupHeaderExpandedEvent,
  ColumnGroupHeaderCreatedEvent,
  ColumnGroupHeaderRemovedEvent,
} from '../column-groups/column-group.types';
import type { RowNode, RowDropPayload, RowClickPayload, RowEditPayload } from './row.types';
import type { FilterModel, QuickFilterConfig } from './filter.types';
import type { CellRange } from './grid.types';

export const GridEventType = {
  READY: 'grid:ready',
  DESTROYED: 'grid:destroyed',
  DATA_CHANGED: 'grid:dataChanged',
  ROWS_RENDERED: 'grid:rowsRendered',
  SCROLL: 'grid:scroll',

  ROW_CLICKED: 'row:clicked',
  ROW_DOUBLE_CLICKED: 'row:doubleClicked',
  ROW_SELECTED: 'row:selected',
  ROW_DESELECTED: 'row:deselected',
  ALL_ROWS_SELECTED: 'row:allSelected',
  ALL_ROWS_DESELECTED: 'row:allDeselected',
  ROW_EXPANDED: 'row:expanded',
  ROW_COLLAPSED: 'row:collapsed',
  ROW_GROUP_OPENED: 'row:groupOpened',
  ROW_DROP: 'row:drop',
  ROW_EDIT_START: 'row:editStart',
  ROW_EDIT_STOP: 'row:editStop',

  CELL_CLICKED: 'cell:clicked',
  CELL_DOUBLE_CLICKED: 'cell:doubleClicked',
  CELL_VALUE_CHANGED: 'cell:valueChanged',
  CELL_EDIT_START: 'cell:editStart',
  CELL_EDIT_STOP: 'cell:editStop',
  CELL_SELECTION_CHANGED: 'cell:selectionChanged',

  COLUMN_RESIZED: 'column:resized',
  COLUMN_MOVED: 'column:moved',
  COLUMN_PINNED: 'column:pinned',
  COLUMN_VISIBLE: 'column:visible',
  COLUMN_SORTED: 'column:sorted',
  COLUMN_FILTER_CHANGED: 'column:filterChanged',
  COLUMNS_STATE_CHANGED: 'column:stateChanged',
  COLUMN_AUTOSIZE: 'column:autoSize',
  COLUMN_GROUP_CHANGED: 'column:groupChanged',

  SORT_CHANGED: 'sort:changed',
  FILTER_CHANGED: 'filter:changed',
  QUICK_FILTER_CHANGED: 'filter:quickChanged',

  PAGE_CHANGED: 'pagination:pageChanged',
  PAGE_SIZE_CHANGED: 'pagination:pageSizeChanged',

  GROUP_EXPANDED: 'group:expanded',
  GROUP_COLLAPSED: 'group:collapsed',

  THEME_CHANGED: 'theme:changed',

  EXPORT_START: 'export:start',
  EXPORT_COMPLETE: 'export:complete',
  EXPORT_ERROR: 'export:error',

  DRAG_STARTED: 'drag:started',
  DRAG_OVER: 'drag:over',
  DRAG_STOPPED: 'drag:stopped',

  CHART_CREATED: 'chart:created',
  CHART_DESTROYED: 'chart:destroyed',
  CHART_RANGE_SELECTION_CHANGED: 'chart:rangeSelectionChanged',

  LOADING_STARTED: 'loading:started',
  LOADING_STOPPED: 'loading:stopped',

  CELL_CONTEXT_MENU: 'cell:contextMenu',

  COLUMN_GROUP_HEADER_COLLAPSED: 'columnGroup:collapsed',
  COLUMN_GROUP_HEADER_EXPANDED:  'columnGroup:expanded',
  COLUMN_GROUP_HEADER_CREATED:   'columnGroup:created',
  COLUMN_GROUP_HEADER_REMOVED:   'columnGroup:removed',

  ROW_DETAIL_TOGGLE_CLICKED: 'row:detailToggleClicked',
  ROW_DETAIL_OPENED: 'row:detailOpened',
  ROW_DETAIL_CLOSED: 'row:detailClosed',
  ROW_DETAIL_HEIGHT_CHANGED: 'row:detailHeightChanged',
} as const;

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
  [GridEventType.COLUMN_GROUP_HEADER_EXPANDED]:  ColumnGroupHeaderExpandedEvent;
  [GridEventType.COLUMN_GROUP_HEADER_CREATED]:   ColumnGroupHeaderCreatedEvent;
  [GridEventType.COLUMN_GROUP_HEADER_REMOVED]:   ColumnGroupHeaderRemovedEvent;
  [GridEventType.ROW_DETAIL_TOGGLE_CLICKED]: RowDetailToggleClickedEvent;
  [GridEventType.ROW_DETAIL_OPENED]: RowDetailOpenedEvent;
  [GridEventType.ROW_DETAIL_CLOSED]: RowDetailClosedEvent;
  [GridEventType.ROW_DETAIL_HEIGHT_CHANGED]: RowDetailHeightChangedEvent;
};
