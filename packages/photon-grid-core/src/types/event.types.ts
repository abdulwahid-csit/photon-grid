import type { ColumnDef, ColumnState } from './column.types';
import type { GridAction } from './cell-action.types';
import type {
  ColumnGroupHeaderCollapsedEvent,
  ColumnGroupHeaderExpandedEvent,
  ColumnGroupHeaderCreatedEvent,
  ColumnGroupHeaderRemovedEvent,
} from '../column-groups/column-group.types';
import type { RowNode, RowDropPayload, RowClickPayload, RowEditPayload } from './row.types';
import type { DetailEvent } from './detail-component.types';
import type { RowDragStartPayload, RowDragEndPayload } from './row-drag.types';
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
import type {
  InfiniteCacheEvent,
  InfiniteDataReceivedEvent,
  InfiniteDataRequestEvent,
  InfiniteErrorEvent,
} from './infinite.types';
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
  ROW_DRAG_START: 'row:dragStart',
  ROW_DRAG_END: 'row:dragEnd',
  ROW_EDIT_START: 'row:editStart',
  ROW_EDIT_STOP: 'row:editStop',

  CELL_CLICKED: 'cell:clicked',
  CELL_DOUBLE_CLICKED: 'cell:doubleClicked',
  CELL_VALUE_CHANGED: 'cell:valueChanged',
  CELL_EDIT_START: 'cell:editStart',
  CELL_EDIT_STOP: 'cell:editStop',
  CELL_SELECTION_CHANGED: 'cell:selectionChanged',
  /** A `button` cell renderer's button was activated. @see CellButtonClickedEvent */
  CELL_BUTTON_CLICKED: 'cell:buttonClicked',
  /** A member row in an `avatarGroup` roster was activated. @see AvatarGroupMemberClickedEvent */
  AVATAR_GROUP_MEMBER_CLICKED: 'cell:avatarGroupMemberClicked',
  /** A `longText` cell's expand control opened its panel. @see CellTextExpandedEvent */
  CELL_TEXT_EXPANDED: 'cell:textExpanded',
  /** An `actions` cell's command was activated and confirmed. @see CellActionClickedEvent */
  CELL_ACTION_CLICKED: 'cell:actionClicked',
  /** An `actions` cell's `onClick` threw or rejected. @see CellActionErrorEvent */
  CELL_ACTION_ERROR: 'cell:actionError',

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

  /** A row context-menu item was activated (built-in or custom). */
  ROW_MENU_ITEM_CLICKED: 'rowMenu:itemClicked',

  /** An async row context-menu action rejected. */
  ROW_MENU_ITEM_ERROR: 'rowMenu:itemError',

  /** The row context menu closed — by an action, a dismissal, or Escape. */
  ROW_MENU_CLOSED: 'rowMenu:closed',

  COLUMN_GROUP_HEADER_COLLAPSED: 'columnGroup:collapsed',
  COLUMN_GROUP_HEADER_EXPANDED:  'columnGroup:expanded',
  COLUMN_GROUP_HEADER_CREATED:   'columnGroup:created',
  COLUMN_GROUP_HEADER_REMOVED:   'columnGroup:removed',

  ROW_DETAIL_TOGGLE_CLICKED: 'row:detailToggleClicked',
  ROW_DETAIL_OPENED: 'row:detailOpened',
  ROW_DETAIL_CLOSED: 'row:detailClosed',
  ROW_DETAIL_HEIGHT_CHANGED: 'row:detailHeightChanged',
  ROW_DETAIL_EVENT: 'row:detailEvent',

  TREE_NODE_TOGGLE_CLICKED: 'tree:nodeToggleClicked',
  TREE_NODE_EXPANDED: 'tree:nodeExpanded',
  TREE_NODE_COLLAPSED: 'tree:nodeCollapsed',
  TREE_CHILDREN_LOADED: 'tree:childrenLoaded',

  TOOLBAR_TAB_CHANGED: 'toolbar:tabChanged',
  TOOLBAR_SEARCH_CHANGED: 'toolbar:searchChanged',

  /** Summary row values were recomputed. @see SummaryChangedEvent */
  SUMMARY_CHANGED: 'summary:changed',
  /** The set of summary row *definitions* changed. @see SummaryRowsChangedEvent */
  SUMMARY_ROWS_CHANGED: 'summary:rowsChanged',

  /** A container resize-handle drag began. @see GridResizeStartEvent */
  GRID_RESIZE_START: 'grid:resizeStart',
  /** The grid container's size changed, by drag or by API. @see GridResizedEvent */
  GRID_RESIZED: 'grid:resized',
  /** A container resize-handle drag finished. @see GridResizeEndEvent */
  GRID_RESIZE_END: 'grid:resizeEnd',

  SERVER_REQUEST: 'server:request',
  SERVER_SUCCESS: 'server:success',
  SERVER_ERROR: 'server:error',
  SERVER_REFRESH: 'server:refresh',
  SERVER_RETRY: 'server:retry',

  /** Infinite Row Model — a page is about to be requested. */
  INFINITE_DATA_REQUEST: 'infinite:dataRequest',
  /** Infinite Row Model — a page's rows arrived and were applied. */
  INFINITE_DATA_RECEIVED: 'infinite:dataReceived',
  /** Infinite Row Model — a page failed after exhausting retries. */
  INFINITE_ERROR: 'infinite:error',
  /** Infinite Row Model — a page was served from cache. */
  INFINITE_CACHE_HIT: 'infinite:cacheHit',
  /** Infinite Row Model — a page was absent from cache and had to be fetched. */
  INFINITE_CACHE_MISS: 'infinite:cacheMiss',

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

/**
 * Emitted when a row context-menu entry is activated, for both built-in and
 * custom items.
 *
 * Lets an application handle menu actions centrally through the event bus as an
 * alternative to per-item `action` callbacks; when an item defines `action`,
 * both fire (the callback first).
 */
export interface RowMenuItemClickedEvent {
  /** The item's `id`, or the built-in item id. Empty when a custom item omits one. */
  itemId: string;
  /** The item's rendered label. */
  label: string;
  /** `true` for items supplied through `GridOptions.rowMenu`. */
  custom: boolean;
  /** The row the menu was opened on, or `null` if it could not be resolved. */
  row: RowNode | null;
  /** Display index of that row. */
  rowIndex: number;
  /** The column whose cell was right-clicked, or `null`. */
  colDef: ColumnDef | null;
  /** Which kind of item fired. `'action'` for every built-in entry. */
  itemType?: 'action' | 'submenu' | 'checkbox' | 'radio';
  /** State *after* the activation, for checkbox and radio items only. */
  checked?: boolean;
  /** The selected option's value, for radio items only. */
  value?: string;
}

/**
 * Emitted when the row context menu closes, whichever route closed it: an
 * item's action, `ctx.close()`, a click outside, or Escape.
 *
 * Fires once per open/close cycle. Typical use is restoring focus to the grid
 * or logging dismissals.
 */
export interface RowMenuClosedEvent {
  /** The row the menu had been opened on, or `null`. */
  row: RowNode | null;
  /** Display index of that row. */
  rowIndex: number;
  /** The column whose cell had been right-clicked, or `null`. */
  colDef: ColumnDef | null;
}

/**
 * Emitted when a row context-menu action returns a promise that rejects.
 *
 * The menu stays open so the user can retry; an application typically
 * subscribes to surface a toast.
 */
export interface RowMenuItemErrorEvent {
  /** The failing item's `id`, or empty when it has none. */
  itemId: string;
  /** The failing item's rendered label. */
  label: string;
  /** Whatever the action's promise rejected with. */
  error: unknown;
  /** The row the menu was opened on, or `null`. */
  row: RowNode | null;
  /** Display index of that row. */
  rowIndex: number;
}
export interface CellSelectionChangedEvent {
  ranges: CellRange[];
}

/**
 * Emitted when a `button` cell renderer's button is activated.
 *
 * The grid does nothing with the click beyond reporting it — a button column is
 * an application action, and only the application knows what it means.
 */
/**
 * Emitted when a member row in an `avatarGroup` roster overlay is activated.
 *
 * Only fires when the column's renderer opted into interactive rows; a purely
 * informational roster emits nothing.
 */
export interface AvatarGroupMemberClickedEvent {
  /** The resolved member, including the original item as `source`. */
  member: import('./built-in-renderer.types').AvatarGroupMember;
  row: RowNode;
  colDef: ColumnDef;
  rowIndex: number;
  event: MouseEvent;
}

/**
 * Emitted when a `longText` cell's expand control opens its panel.
 *
 * The grid does nothing with it beyond reporting it — the hook for logging that
 * a value was actually read, or for lazily fetching a fuller version of it.
 * Closing emits nothing: a dismissal is not a decision.
 */
export interface CellTextExpandedEvent {
  /** The untruncated text the panel is showing. */
  text: string;
  /** The `action` declared in the renderer's options, or `''`. */
  action: string;
  row: RowNode;
  colDef: ColumnDef;
  rowIndex: number;
  event: MouseEvent;
}

export interface CellButtonClickedEvent {  /**
   * The `action` declared in the renderer's options, or `''`.
   *
   * Lets one handler serve several button columns without comparing `colDef`.
   */
  action: string;
  row: RowNode;
  colDef: ColumnDef;
  /** Cell value, before any `label` option was applied. */
  value: unknown;
  rowIndex: number;
  event: MouseEvent;
}

/**
 * Emitted when an `actions` cell's command is activated.
 *
 * Fired *after* any declared confirmation is accepted and immediately before
 * the action's own `onClick` runs, so a column can be handled entirely through
 * the event bus — `onClick` is optional precisely because of this. An action
 * the user dismissed at the confirmation emits nothing: a "no" is not a
 * command.
 */
export interface CellActionClickedEvent {
  /** `GridAction.id` of the activated command. */
  actionId: string;
  /** The declaration itself, for a handler that needs more than the id. */
  action: GridAction;
  /**
   * The `group` declared in the renderer's options, or `''`.
   *
   * Lets one handler serve several action columns without comparing `colDef`.
   */
  group: string;
  /** Where it was invoked from — a cell button, or a row in the overflow menu. */
  source: 'button' | 'menu';
  row: RowNode;
  colDef: ColumnDef;
  /** The cell's own value, post `valueGetter`. */
  value: unknown;
  rowIndex: number;
  event: MouseEvent;
}

/**
 * Emitted when an `actions` command's `onClick` throws or rejects.
 *
 * The grid surfaces the failure rather than swallowing it — an action that
 * silently does nothing is indistinguishable from one that worked, which is the
 * worst possible outcome for a Delete button.
 */
export interface CellActionErrorEvent {
  actionId: string;
  action: GridAction;
  group: string;
  /** Whatever was thrown or rejected with. */
  error: unknown;
  row: RowNode;
  colDef: ColumnDef;
  rowIndex: number;
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
  /**
   * The format that was written.
   *
   * Widened from the original `'csv' | 'xlsx'` when the pluggable export system
   * landed: `'json'`, `'excel'`, `'pdf'` and any host-registered format now flow
   * through the same events. The two legacy values still appear — they are what
   * `GridApi.exportCsv()` / `exportXlsx()` emit.
   */
  format: 'csv' | 'xlsx' | (string & {});
  fileName: string;
  rowCount: number;
}

/**
 * Emitted when an export fails — including the common case of asking for Excel
 * or PDF before registering an exporter for it.
 *
 * @see {@link import('../export/export.types').ExportError}
 */
export interface ExportErrorEvent {
  /** The format that was requested. */
  format: string;
  /** Developer-facing explanation, identical to the thrown error's message. */
  message: string;
  /** Machine-readable cause, from `ExportErrorCode`. */
  code: string;
  /** npm packages the host must install, when an exporter was missing. */
  requiredPackages: readonly string[];
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
 * Payload of `SUMMARY_CHANGED` — fired after summary row values are recomputed,
 * whether automatically or via `GridApi.refreshSummary()`.
 *
 * Emitted once per refresh, after the new values are stored and before the
 * bands repaint, so a listener reading `GridApi.getSummary()` sees the values
 * that are about to appear on screen.
 */
export interface SummaryChangedEvent {
  /** The freshly computed snapshots, in row declaration order. */
  readonly summaries: readonly import('../summary/summary.types').SummaryRowSnapshot[];
}

/**
 * Payload of `SUMMARY_ROWS_CHANGED` — fired when the summary row *definitions*
 * change through `setSummaryRows` / `updateSummaryRow` / `removeSummaryRow`.
 *
 * Distinct from `SUMMARY_CHANGED`, which reports new *values* for an unchanged
 * set of rows. A definition change emits both: this one first, then
 * `SUMMARY_CHANGED` once the new definitions have been computed.
 */
export interface SummaryRowsChangedEvent {
  /** What changed the definitions. */
  readonly action: 'set' | 'update' | 'remove';
  /** The affected row's id, or `null` for a wholesale `set`. */
  readonly rowId: string | null;
  /** Number of summary rows now defined. */
  readonly rowCount: number;
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
  [GridEventType.ROW_DRAG_START]: RowDragStartPayload;
  [GridEventType.ROW_DRAG_END]: RowDragEndPayload;
  [GridEventType.CELL_CLICKED]: CellClickedEvent;
  [GridEventType.CELL_DOUBLE_CLICKED]: CellClickedEvent;
  [GridEventType.CELL_VALUE_CHANGED]: CellValueChangedEvent;
  [GridEventType.ROW_MENU_ITEM_CLICKED]: RowMenuItemClickedEvent;
  [GridEventType.ROW_MENU_ITEM_ERROR]: RowMenuItemErrorEvent;
  [GridEventType.ROW_MENU_CLOSED]: RowMenuClosedEvent;
  [GridEventType.CELL_SELECTION_CHANGED]: CellSelectionChangedEvent;
  [GridEventType.CELL_BUTTON_CLICKED]: CellButtonClickedEvent;
  [GridEventType.AVATAR_GROUP_MEMBER_CLICKED]: AvatarGroupMemberClickedEvent;
  [GridEventType.CELL_TEXT_EXPANDED]: CellTextExpandedEvent;
  [GridEventType.CELL_ACTION_CLICKED]: CellActionClickedEvent;
  [GridEventType.CELL_ACTION_ERROR]: CellActionErrorEvent;
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
  [GridEventType.EXPORT_ERROR]: ExportErrorEvent;
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
  [GridEventType.ROW_DETAIL_EVENT]: DetailEvent;
  [GridEventType.CHART_CREATED]: ChartCreatedEvent;
  [GridEventType.CHART_RANGE_SELECTION_CHANGED]: ChartRangeSelectionChangedEvent;
  [GridEventType.CHART_OPTIONS_CHANGED]: ChartOptionsChangedEvent;
  [GridEventType.CHART_DESTROYED]: ChartDestroyedEvent;
  [GridEventType.TOOLBAR_TAB_CHANGED]: ToolbarTabChangedEvent;
  [GridEventType.TOOLBAR_SEARCH_CHANGED]: ToolbarSearchChangedEvent;
  [GridEventType.SUMMARY_CHANGED]: SummaryChangedEvent;
  [GridEventType.SUMMARY_ROWS_CHANGED]: SummaryRowsChangedEvent;
  [GridEventType.GRID_RESIZE_START]: import('./grid-resize.types').GridResizeStartEvent;
  [GridEventType.GRID_RESIZED]: import('./grid-resize.types').GridResizedEvent;
  [GridEventType.GRID_RESIZE_END]: import('./grid-resize.types').GridResizeEndEvent;
  [GridEventType.SERVER_REQUEST]: ServerRequestEvent;
  [GridEventType.SERVER_SUCCESS]: ServerSuccessEvent;
  [GridEventType.SERVER_ERROR]: ServerErrorEvent;
  [GridEventType.SERVER_REFRESH]: ServerRefreshEvent;
  [GridEventType.SERVER_RETRY]: ServerRetryEvent;
  [GridEventType.INFINITE_DATA_REQUEST]: InfiniteDataRequestEvent;
  [GridEventType.INFINITE_DATA_RECEIVED]: InfiniteDataReceivedEvent;
  [GridEventType.INFINITE_ERROR]: InfiniteErrorEvent;
  [GridEventType.INFINITE_CACHE_HIT]: InfiniteCacheEvent;
  [GridEventType.INFINITE_CACHE_MISS]: InfiniteCacheEvent;
  [GridEventType.THEME_AI_APPLIED]: ThemeAiAppliedEvent;
  [GridEventType.THEME_AI_ERROR]: ThemeAiErrorEvent;
  [GridEventType.LOADING_STARTED]: import('./loading.types').LoadingChangedEvent;
  [GridEventType.LOADING_STOPPED]: import('./loading.types').LoadingChangedEvent;
};
