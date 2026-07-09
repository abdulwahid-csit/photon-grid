import type { ColumnDef, ColumnState } from './column.types';
import type { FilterModel, QuickFilterConfig } from './filter.types';
import type { BuiltInThemeName } from './theme.types';
import type { MasterDetailConfig } from './master-detail.types';
import type { PhotonAIConfig } from './photon-ai.types';
import type { TreeDataConfig } from './tree-data.types';
import type { ChartPanelType } from '../chart/chart-panel';
import type { ChartModel, ChartModelPatch } from '../chart/model/chart-model';
import type {
  ChartCreatedEvent,
  ChartRangeSelectionChangedEvent,
  ChartOptionsChangedEvent,
  ChartDestroyedEvent,
} from './event.types';

/** Which configuration tabs the chart tool panel exposes, and the default. */
export interface ChartToolPanelsDef {
  /** Tabs to show, in order. Defaults to all three. */
  panels?: ChartToolPanelName[];
  /** Tab shown first when the tool panel opens. Defaults to `'chart'`. */
  defaultToolPanel?: ChartToolPanelName;
}

/** Identifier of a chart tool-panel tab. */
export type ChartToolPanelName = 'chart' | 'setup' | 'customize';

/** Item in the chart panel's `⋮` toolbar menu. */
export type ChartToolbarItem = 'edit' | 'advancedSettings' | 'unlink' | 'download';

export interface SortConfig {
  colId: string;
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationConfig {
  enabled: boolean;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  serverSide: boolean;
  totalRows?: number;
}

export interface SelectionConfig {
  mode: 'single' | 'multiple' | 'none';
  checkboxSelection: boolean;
  selectAllOnHeaderClick: boolean;
  headerCheckbox: boolean;
  suppressRowDeselection: boolean;
}

/**
 * Configuration for in-cell editing behaviour.
 *
 * @example
 * ```ts
 * editing: {
 *   mode: 'cell',
 *   singleClickEdit: true,
 *   stopEditingWhenCellsLoseFocus: true,
 * }
 * ```
 */
export interface EditingConfig {
  /**
   * Editing mode for the grid.
   * - `'cell'`  — individual cells are edited one at a time (default).
   * - `'row'`   — an entire row enters edit mode together.
   * - `'none'`  — editing is fully disabled.
   */
  mode: 'cell' | 'row' | 'none';
  /**
   * When `true`, a **single click** activates the cell editor.
   * When `false` (default), a **double-click** is required — matching AG Grid default behaviour.
   */
  singleClickEdit: boolean;
  /**
   * When `true` (default), the active editor commits its value and closes when the
   * grid loses focus.  Set to `false` to keep the editor open until the user
   * explicitly confirms (Enter) or cancels (Escape).
   */
  stopEditingWhenCellsLoseFocus: boolean;
}

export interface RowGroupingConfig {
  enabled: boolean;
  groupedColumns: string[];
  showGroupCount: boolean;
  defaultExpanded: boolean;
  suppressAutoSize: boolean;
}

export interface VirtualScrollConfig {
  enabled: boolean;
  rowBuffer: number;
  rowHeight: number;
  dynamicRowHeight: boolean;
}

export interface ExportConfig {
  enabled: boolean;
  fileName: string;
  formats: ('csv' | 'xlsx')[];
  includeHiddenColumns: boolean;
  processCellValue?: (params: { value: unknown; colDef: ColumnDef }) => string;
}

export interface CellRange {
  startRowIndex: number;
  endRowIndex: number;
  startColIndex: number;
  endColIndex: number;
}

/**
 * Options controlling the column-group header system.
 *
 * All properties are optional and layered on top of per-column group defaults
 * specified in {@link ColumnDef}.
 */
export interface ColumnGroupConfig {
  /**
   * When `true`, the multi-row grouped header is rendered.
   * Set this explicitly when column definitions contain `children` arrays.
   * @default auto-detected (true if any ColumnDef has `children`)
   */
  enabled?: boolean;

  /**
   * Default resize strategy applied to every group that does not specify its own.
   * @default ColumnGroupResizeStrategy.PROPORTIONAL
   */
  defaultResizeStrategy?: import('./column.types').ColumnDef['groupResizeStrategy'];

  /**
   * Default collapsed-state pixel width for groups that do not set `collapsedWidth`.
   * @default 26
   */
  defaultCollapsedWidth?: number;

  /**
   * When `true`, column groups open in collapsed state unless `ColumnDef.openByDefault`
   * explicitly overrides.  Defaults match AG Grid convention (open by default).
   * @default false
   */
  suppressOpenByDefault?: boolean;
}

export interface GridOptions {
  columns: ColumnDef[];
  data?: Record<string, unknown>[];

  theme?: BuiltInThemeName | string;

  rowHeight?: number;
  rowHeightMode?: 'fixed' | 'auto';
  headerRowHeight?: number;
  footerRowHeight?: number;
  filterRowHeight?: number;

  showSerialNumber?: boolean;
  showCheckboxes?: boolean;
  showTopBar?: boolean;
  showFooter?: boolean;
  showSidePanel?: boolean;
  showFullScreen?: boolean;
  showColumnMenu?: boolean;
  showVerticalBorders?: boolean;
  showHorizontalBorders?: boolean;
  showFilterRow?: boolean;
  rowShading?: boolean;

  selection?: Partial<SelectionConfig>;
  editing?: Partial<EditingConfig>;
  pagination?: Partial<PaginationConfig>;
  grouping?: Partial<RowGroupingConfig>;
  virtualScroll?: Partial<VirtualScrollConfig>;
  exportConfig?: Partial<ExportConfig>;

  sortConfig?: SortConfig[];
  filterModel?: FilterModel;
  quickFilter?: QuickFilterConfig;

  columnState?: ColumnState[];

  enableCellSelection?: boolean;
  enableRangeSelection?: boolean;
  enableClipboard?: boolean;

  enableRowDrag?: boolean;
  enableColumnDrag?: boolean;

  enableCharts?: boolean;
  enableFullScreen?: boolean;

  /**
   * Chart type pre-selected when a range chart is created without an explicit
   * type. Defaults to `'column-grouped'`.
   */
  defaultChartType?: ChartPanelType;

  /**
   * Default chart configuration merged over every newly created chart's model
   * (titles, legend, axes, series colors, style). Applied once at creation.
   */
  chartThemeOverrides?: ChartModelPatch;

  /**
   * Controls which tabs the chart configuration tool panel exposes and which
   * one opens first. Defaults to all tabs, starting on `'chart'`.
   */
  chartToolPanelsDef?: ChartToolPanelsDef;

  /**
   * Customizes the chart panel's `⋮` toolbar menu. Return the items to show,
   * in order. Return an empty array to hide the menu entirely.
   *
   * @param defaultItems - The items Photon would show by default.
   * @returns The items to render.
   */
  getChartToolbarItems?: (defaultItems: ChartToolbarItem[]) => ChartToolbarItem[];

  showGroupingBar?: boolean;

  /** Column-group header configuration. @see {@link ColumnGroupConfig} */
  columnGroups?: ColumnGroupConfig;

  /**
   * Master/Detail configuration — expandable rows whose detail section is a
   * fully independent nested Photon Grid instance (or custom content).
   * @see {@link MasterDetailConfig}
   */
  masterDetail?: MasterDetailConfig;

  /**
   * Photon AI — a floating, deterministic natural-language command bar for
   * the grid (sort/filter/pin/hide/group/select), with zero external AI
   * services. @see {@link PhotonAIConfig}
   */
  photonAI?: PhotonAIConfig;

  /**
   * Tree Data — self-referential row hierarchy (org charts, file trees,
   * bills of materials) driven by a `parentId`/`id` pair, nested `children`
   * arrays, a `getDataPath()` callback, or a custom hierarchy provider.
   * Mutually exclusive with `grouping` — a grid is either tree-structured or
   * column-value-grouped, never both at once. @see {@link TreeDataConfig}
   */
  treeData?: TreeDataConfig;

  enableStateManagement?: boolean;
  stateKey?: string;

  dateFormat?: string;
  timeZone?: string;
  currencySymbol?: string;
  currencyFormat?: string;
  locale?: string;

  loadingOverlayText?: string;
  noRowsOverlayText?: string;
  noRowsOverlayHtml?: string;

  rowClassFn?: (row: Record<string, unknown>, index: number) => string;
  rowHeightFn?: (row: Record<string, unknown>) => number;

  suppressScrollOnNewData?: boolean;
  suppressColumnVirtualisation?: boolean;

  onReady?: (api: unknown) => void;

  /** Fired once when a range chart is created. */
  onChartCreated?: (event: ChartCreatedEvent) => void;
  /** Fired when a linked chart's grid data range changes and it re-renders. */
  onChartRangeSelectionChanged?: (event: ChartRangeSelectionChangedEvent) => void;
  /** Fired when a chart's configuration changes (type, series, styling…). */
  onChartOptionsChanged?: (event: ChartOptionsChangedEvent) => void;
  /** Fired when a chart is destroyed. */
  onChartDestroyed?: (event: ChartDestroyedEvent) => void;
}

export interface GridState {
  columnStates: ColumnState[];
  sortConfig: SortConfig[];
  filterModel: FilterModel;
  paginationPage: number;
  paginationPageSize: number;
  groupedColumns: string[];
  expandedGroups: string[];
  expandedTreeNodeIds: string[];
  selectedRowIds: string[];
  /**
   * Serialized range-chart models. Present when charts exist at capture time; on
   * restore each model is recreated via the range chart service. Optional so
   * older saved states — and grids without charts — remain valid.
   */
  chartModels?: ChartModel[];
}

export interface GridDimensions {
  containerWidth: number;
  containerHeight: number;
  headerHeight: number;
  bodyHeight: number;
  footerHeight: number;
  totalContentHeight: number;
  totalContentWidth: number;
}
