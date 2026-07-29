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
import type { ChartModel } from '../chart/model/chart-model';
import type { TreeNodeToggleClickedPayload, TreeNodeTogglePayload, TreeChildrenLoadedPayload } from './tree-data.types';
import type {
  ImportStartEvent,
  ImportProgressEvent,
  ImportCompleteEvent,
  ImportErrorEvent,
} from './import.types';
import type { ToolbarTab } from './toolbar.types';
import type { ServerSideRequest } from './server-side.types';
import type { GeneratedTheme } from './theme-ai.types';

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

  IMPORT_START: 'import:start',
  IMPORT_PROGRESS: 'import:progress',
  IMPORT_COMPLETE: 'import:complete',
  IMPORT_ERROR: 'import:error',

  DRAG_STARTED: 'drag:started',
  DRAG_OVER: 'drag:over',
  DRAG_STOPPED: 'drag:stopped',

  CHART_CREATED: 'chart:created',
  CHART_DESTROYED: 'chart:destroyed',
  CHART_RANGE_SELECTION_CHANGED: 'chart:rangeSelectionChanged',
  CHART_OPTIONS_CHANGED: 'chart:optionsChanged',

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

  TREE_NODE_TOGGLE_CLICKED: 'tree:nodeToggleClicked',
  TREE_NODE_EXPANDED: 'tree:nodeExpanded',
  TREE_NODE_COLLAPSED: 'tree:nodeCollapsed',
  TREE_CHILDREN_LOADED: 'tree:childrenLoaded',

  TOOLBAR_TAB_CHANGED: 'toolbar:tabChanged',
  TOOLBAR_SEARCH_CHANGED: 'toolbar:searchChanged',

  SERVER_REQUEST: 'server:request',
  SERVER_SUCCESS: 'server:success',
  SERVER_ERROR: 'server:error',
  SERVER_REFRESH: 'server:refresh',
  SERVER_RETRY: 'server:retry',

  THEME_AI_APPLIED: 'themeAI:applied',
  THEME_AI_ERROR: 'themeAI:error',
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

/** Fired once when a range chart is first created. */
export interface ChartCreatedEvent {
  chartId: string;
  chartType: string;
  cellRange: CellRange;
  chartModel: ChartModel;
}
/** Fired when the grid data range backing a linked chart changes (re-render). */
export interface ChartRangeSelectionChangedEvent {
  chartId: string;
  cellRange: CellRange;
}
/** Fired whenever the chart's configuration (type, series, styling…) changes. */
export interface ChartOptionsChangedEvent {
  chartId: string;
  chartType: string;
  chartModel: ChartModel;
}
/** Fired when a chart is destroyed. */
export interface ChartDestroyedEvent {
  chartId: string;
  chartType: string;
}

/**
 * Payload of `TOOLBAR_TAB_CHANGED` — fired when the user (or `setActiveToolbarTab`)
 * selects a different toolbar tab. Purely informational: the grid does not
 * filter data on the host's behalf.
 */
export interface ToolbarTabChangedEvent {
  /** Id of the newly selected tab. */
  readonly tabId: string;
  /** Id of the previously selected tab, or `null` if none was selected. */
  readonly previousTabId: string | null;
  /** The full definition of the newly selected tab. */
  readonly tab: ToolbarTab;
}

/** Payload of `TOOLBAR_SEARCH_CHANGED` — fired (debounced) as the toolbar's global search query changes. */
export interface ToolbarSearchChangedEvent {
  /** The current, trimmed search query (empty string when cleared). */
  readonly query: string;
}

/**
 * Payload of `SERVER_REQUEST` — fired when the Server-Side Row Model is about to
 * fetch a slice (before the datasource's `getRows` is invoked).
 */
export interface ServerRequestEvent {
  /** The request being issued. */
  readonly request: ServerSideRequest;
  /** `true` when served synchronously from cache (no datasource call will follow). */
  readonly fromCache: boolean;
}

/** Payload of `SERVER_SUCCESS` — fired after a fetched (or cached) slice is applied to the grid. */
export interface ServerSuccessEvent {
  /** The request that produced this result. */
  readonly request: ServerSideRequest;
  /** Number of rows returned for this slice. */
  readonly rowCount: number;
  /** Total rows across all pages, when the datasource supplied it. */
  readonly totalRows?: number;
  /** `true` when the result came from the response cache. */
  readonly fromCache: boolean;
}

/** Payload of `SERVER_ERROR` — fired when a request ultimately fails (after any retries). */
export interface ServerErrorEvent {
  /** The request that failed. */
  readonly request: ServerSideRequest;
  /** The error thrown/passed to `params.fail`. */
  readonly error: unknown;
  /** A user-facing message derived from {@link error}. */
  readonly message: string;
}

/** Payload of `SERVER_REFRESH` — fired when `api.refreshServerSide()` is called. */
export interface ServerRefreshEvent {
  /** `true` when the response cache was purged as part of the refresh. */
  readonly purge: boolean;
}

/** Payload of `SERVER_RETRY` — fired before each retry attempt of a failed request. */
export interface ServerRetryEvent {
  /** The request being retried. */
  readonly request: ServerSideRequest;
  /** 1-based attempt number about to run. */
  readonly attempt: number;
  /** The error from the previous attempt. */
  readonly error: unknown;
}

/** Payload of `THEME_AI_APPLIED` — fired when the AI Theme Engine applies (or clears) a theme. */
export interface ThemeAiAppliedEvent {
  /** The applied theme, or `null` when reverting to the base mode/variant. */
  readonly theme: GeneratedTheme | null;
}

/** Payload of `THEME_AI_ERROR` — fired when an AI theme request fails. */
export interface ThemeAiErrorEvent {
  /** A user-facing error message. */
  readonly message: string;
  /** The underlying error. */
  readonly error: unknown;
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
  [GridEventType.IMPORT_START]: ImportStartEvent;
  [GridEventType.IMPORT_PROGRESS]: ImportProgressEvent;
  [GridEventType.IMPORT_COMPLETE]: ImportCompleteEvent;
  [GridEventType.IMPORT_ERROR]: ImportErrorEvent;
  [GridEventType.ROW_EDIT_START]: RowEditPayload;
  [GridEventType.CELL_VALUE_CHANGED]: CellValueChangedEvent;
  [GridEventType.COLUMN_GROUP_HEADER_COLLAPSED]: ColumnGroupHeaderCollapsedEvent;
  [GridEventType.COLUMN_GROUP_HEADER_EXPANDED]:  ColumnGroupHeaderExpandedEvent;
  [GridEventType.COLUMN_GROUP_HEADER_CREATED]:   ColumnGroupHeaderCreatedEvent;
  [GridEventType.COLUMN_GROUP_HEADER_REMOVED]:   ColumnGroupHeaderRemovedEvent;
  [GridEventType.ROW_DETAIL_TOGGLE_CLICKED]: RowDetailToggleClickedEvent;
  [GridEventType.ROW_DETAIL_OPENED]: RowDetailOpenedEvent;
  [GridEventType.TREE_NODE_TOGGLE_CLICKED]: TreeNodeToggleClickedPayload;
  [GridEventType.TREE_NODE_EXPANDED]: TreeNodeTogglePayload;
  [GridEventType.TREE_NODE_COLLAPSED]: TreeNodeTogglePayload;
  [GridEventType.TREE_CHILDREN_LOADED]: TreeChildrenLoadedPayload;
  [GridEventType.ROW_DETAIL_CLOSED]: RowDetailClosedEvent;
  [GridEventType.ROW_DETAIL_HEIGHT_CHANGED]: RowDetailHeightChangedEvent;
  [GridEventType.CHART_CREATED]: ChartCreatedEvent;
  [GridEventType.CHART_RANGE_SELECTION_CHANGED]: ChartRangeSelectionChangedEvent;
  [GridEventType.CHART_OPTIONS_CHANGED]: ChartOptionsChangedEvent;
  [GridEventType.CHART_DESTROYED]: ChartDestroyedEvent;
  [GridEventType.TOOLBAR_TAB_CHANGED]: ToolbarTabChangedEvent;
  [GridEventType.TOOLBAR_SEARCH_CHANGED]: ToolbarSearchChangedEvent;
  [GridEventType.SERVER_REQUEST]: ServerRequestEvent;
  [GridEventType.SERVER_SUCCESS]: ServerSuccessEvent;
  [GridEventType.SERVER_ERROR]: ServerErrorEvent;
  [GridEventType.SERVER_REFRESH]: ServerRefreshEvent;
  [GridEventType.SERVER_RETRY]: ServerRetryEvent;
  [GridEventType.THEME_AI_APPLIED]: ThemeAiAppliedEvent;
  [GridEventType.THEME_AI_ERROR]: ThemeAiErrorEvent;
};
