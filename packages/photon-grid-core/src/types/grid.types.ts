import type { ColumnDef, ColumnDefInput, ColumnState, HeaderIconDisplay } from './column.types';
import type { RowNode } from './row.types';
import type { FilterModel, QuickFilterConfig } from './filter.types';
import type { BuiltInThemeName, ThemeMode, ThemeVariant } from './theme.types';
import type { IconSet, VariantIconSets } from './icon.types';
// Type-only: keeps the plugin module out of core's runtime import graph, so a
// grid without plugins pulls in no plugin code at all.
import type { GridPlugin } from '../plugins/plugin.types';
import type { MasterDetailConfig } from './master-detail.types';
import type { PhotonAIConfig } from './photon-ai.types';
import type { TreeDataConfig } from './tree-data.types';
import type { FormulaConfig } from './formula.types';
import type { AutoFillConfig } from './autofill.types';
import type { RowMenuConfig } from './row-menu.types';
import type { RowDragOptions } from './row-drag.types';
import type { ImportConfig } from './import.types';
import type { ToolbarConfig } from './toolbar.types';
import type { RowModelType, ServerSideConfig, ServerSideDatasource } from './server-side.types';
import type { InfiniteScrollConfig } from './infinite.types';
import type { ScrollConfig } from './scroll.types';
import type { ToastServiceConfigInput } from '../toast/toast.types';
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

/**
 * Grid-wide visibility policy for the header action icons — the filter funnel
 * and the column-menu "⋯" button.
 *
 * These are the defaults applied to every eligible column (filterable columns
 * for {@link HeaderIconsConfig.filter}; all columns when the menu is enabled
 * for {@link HeaderIconsConfig.menu}). Any column may override the grid default
 * via {@link ColumnDef.filterIconDisplay} / {@link ColumnDef.menuIconDisplay}.
 *
 * @example
 * ```ts
 * // Reveal the filter funnel only on hover, and hide the "⋯" menu icon entirely.
 * headerIcons: {
 *   filter: HeaderIconDisplay.HOVER,
 *   menu:   HeaderIconDisplay.HIDDEN,
 * }
 * ```
 */
export interface HeaderIconsConfig {
  /**
   * Default display mode for the filter funnel icon on filterable columns.
   * `HIDDEN` suppresses the funnel entirely (filtering remains available via
   * the filter row).
   * @default HeaderIconDisplay.ALWAYS
   */
  filter?: HeaderIconDisplay;
  /**
   * Default display mode for the column-menu "⋯" icon. `HIDDEN` removes the
   * three-dots button (the header right-click menu still works).
   * @default HeaderIconDisplay.ALWAYS
   */
  menu?: HeaderIconDisplay;
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
  /**
   * When `true`, the serial-number (`#`) column acts as an AG Grid–style
   * selection column: mouse-down on a serial cell selects the row, dragging
   * extends a contiguous row range (with edge auto-scroll), Ctrl/Cmd toggles
   * individual rows, and Shift selects a range from the anchor. With a row
   * selection active, Ctrl+C copies the selected rows (values-only TSV) and
   * Delete/Backspace/Ctrl+X remove them.
   *
   * Requires {@link GridOptions.showSerialNumber} and a non-`'none'`
   * {@link SelectionConfig.mode}. Ignored otherwise.
   *
   * @default false
   */
  serialColumnSelection: boolean;
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
  /** Column definitions. Only `field` is required per column — see {@link ColumnDefInput}. */
  columns?: ColumnDefInput[];
  data?: Record<string, unknown>[];

  /**
   * Application state shared with everything the grid calls back into.
   *
   * The seam for what a callback needs but the row does not carry —
   * permissions, feature flags, the current user, a service handle. Reached as
   * `params.context` in an `actions` column, and through `GridApi.getContext()`
   * anywhere else:
   *
   * ```ts
   * const grid = createGrid(el, { columns, context: { permissions } });
   * // …
   * visible: (params) => params.context.permissions.includes('DELETE')
   * ```
   *
   * Held by reference and never copied, so mutating it is visible immediately;
   * replace it wholesale with `GridApi.setContext()` when the change should be
   * atomic. The grid never writes to it.
   */
  context?: Record<string, unknown>;

  /**
   * Base color mode — drives the entire color palette (light or dark).
   * Defaults to `'light'`. This is the primary theming axis.
   *
   * @example
   * ```ts
   * new GridCore(el, { columns, mode: 'dark', variant: 'ion' });
   * ```
   */
  mode?: ThemeMode;

  /**
   * Cosmetic skin layered on top of {@link GridOptions.mode}. Changes density,
   * border radii, typography, checkbox shape, motion and accent color while the
   * base surface/text colors continue to come from the active mode — so every
   * variant works in both light and dark.
   *
   * Defaults to `'classic'`, the skin Photon ships with: a grey chrome around
   * white data, one hairline under the header, and colour reserved for state.
   * Pass `'none'` for the bare base styling with no skin at all.
   */
  variant?: ThemeVariant | 'none';

  /**
   * @deprecated Use {@link GridOptions.mode} and {@link GridOptions.variant}
   * instead. Retained for backward compatibility: legacy values such as
   * `'dark'`, `'ion'` or `'pg-ion-theme'` are mapped onto the mode/variant
   * axes at runtime.
   */
  theme?: BuiltInThemeName | string;

  /**
   * Icon overrides, keyed by registry name.
   *
   * Highest precedence: these survive a theme change, so an application's own
   * glyphs are never replaced by a variant's pack. Names not listed here resolve
   * through the active variant's pack, then the shared default set.
   *
   * @example Replace one glyph everywhere
   * ```ts
   * icons: { check: '<svg viewBox="0 0 16 16">…</svg>' }
   * ```
   */
  icons?: IconSet;

  /**
   * Per-variant icon packs, merged over the built-in pack for that variant.
   *
   * Use this to give one theme its own family without touching the others.
   * Partial at both levels — an unlisted variant keeps its built-in pack, and an
   * unlisted name inside a pack falls through to the default set.
   *
   * @example Give Neon a custom sort indicator
   * ```ts
   * variantIcons: { neon: { sortAsc: '<svg viewBox="0 0 16 16">…</svg>' } }
   * ```
   */
  variantIcons?: VariantIconSets;

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

  /**
   * Enables the FLIP/slide row animations played when rows reorder (sort),
   * appear/disappear (filter), or a group / master-detail row expands.
   *
   * Set to `false` to disable all row animations entirely — useful for
   * reduced-motion preferences or very high-frequency data updates.
   *
   * @default true
   */
  animateRows?: boolean;

  /**
   * When the header action icons (filter funnel + column-menu "⋯") appear —
   * on hover (default) or always. Set grid-wide here; override per column with
   * {@link ColumnDef.filterIconDisplay} / {@link ColumnDef.menuIconDisplay}.
   *
   * @see {@link HeaderIconsConfig}
   */
  headerIcons?: HeaderIconsConfig;

  /**
   * Grid-wide default configuration for the column header context menu — the
   * sections and items shown, items to suppress, custom items, and whether
   * right-click opens the menu. Override or extend per column via
   * {@link ColumnDef.menu}.
   *
   * @see {@link import('./column-menu.types').ColumnMenuConfig}
   */
  columnMenu?: import('./column-menu.types').ColumnMenuConfig;

  /**
   * AG-Grid-style hook to fully control the column menu's item list. Receives
   * the resolved, post-suppression list of built-in item ids for the column and
   * the column definition, and returns the exact ordered items to render (built-in
   * ids, `'separator'`, or custom items). Return an empty array to hide the menu.
   *
   * Runs once per menu open — never during hover, scroll, or drag.
   *
   * @param defaultItems - The built-in item ids Photon would show, in order.
   * @param colDef        - The column the menu is opening for.
   * @returns The items to render.
   */
  getColumnMenuItems?: import('./column-menu.types').GetColumnMenuItems;

  selection?: Partial<SelectionConfig>;
  editing?: Partial<EditingConfig>;
  pagination?: Partial<PaginationConfig>;
  grouping?: Partial<RowGroupingConfig>;
  virtualScroll?: Partial<VirtualScrollConfig>;
  exportConfig?: Partial<ExportConfig>;

  /**
   * How input gestures are translated into scroll motion.
   *
   * The defaults need no configuration: a notched mouse wheel is eased into
   * continuous motion (so each detent no longer teleports the viewport by a
   * couple of rows), while precision-touchpad gestures — already smooth, and
   * steered by the user's own finger — are applied 1:1 with no added lag.
   *
   * @example Snappier, shorter mouse-wheel steps
   * ```ts
   * scroll: { smoothWheelDuration: 90, wheelStepScale: 0.75 }
   * ```
   *
   * @example Opt out entirely
   * ```ts
   * scroll: { wheelMode: WheelScrollMode.Instant }
   * ```
   *
   * @see {@link ScrollConfig}
   */
  scroll?: ScrollConfig;

  /**
   * Which row model backs the grid. `'client'` (default) keeps all data
   * operations in-memory. `'server'` turns the grid into a rendering engine and
   * delegates sorting/filtering/searching/pagination to
   * {@link serverSideDatasource}. @default `'client'` @see {@link RowModelType}
   */
  rowModel?: RowModelType;
  /**
   * Row-drag behaviour. The grab handle itself is opted into per column with
   * {@link ColumnDef.rowDrag}; this controls whether the grid applies the
   * reorder on drop or leaves it to the application.
   *
   * Defaults to managed under `rowModel: 'client'` and unmanaged under the
   * server-backed models. @see {@link RowDragOptions}
   */
  rowDrag?: RowDragOptions;
  /**
   * Tuning for the Server-Side Row Model (debounce, response cache, retries).
   * Only used when `rowModel: 'server'`. @see {@link ServerSideConfig}
   */
  serverSide?: Partial<ServerSideConfig>;
  /**
   * Tuning for the Infinite Row Model (page size, prefetch, cache bound,
   * concurrency, retries) plus its five lifecycle callbacks. Only used when
   * `rowModel: 'infinite'`. Uses the same {@link serverSideDatasource}, so a
   * datasource written for `'server'` works unchanged.
   * @see {@link InfiniteScrollConfig}
   */
  infinite?: InfiniteScrollConfig;
  /**
   * The datasource the grid calls to fetch each slice of rows in server mode.
   * Required when `rowModel: 'server'`. @see {@link ServerSideDatasource}
   */
  serverSideDatasource?: ServerSideDatasource;

  /**
   * Theme Manager — mounts a "Theme" launcher in the top-right tools strip for
   * applying saved themes, exporting/importing, and resetting the AI-generated
   * theme (see `gridApi.photonAI`). Set `true` (or `{ enabled: true }`) to show it.
   */
  themeManager?: boolean | { enabled: boolean };

  sortConfig?: SortConfig[];
  filterModel?: FilterModel;
  quickFilter?: QuickFilterConfig;

  columnState?: ColumnState[];

  enableCellSelection?: boolean;
  enableRangeSelection?: boolean;
  enableClipboard?: boolean;

  /**
   * Whether clicking outside the grid clears the focused cell and any cell
   * ranges. Defaults to `true`.
   *
   * "Outside" means outside the grid container *and* outside the menus, panels
   * and overlays Photon portals to `<body>` on the grid's behalf — picking
   * "Copy" from a cell context menu, choosing a value in a dropdown editor, or
   * scrolling the column chooser all keep the selection they act on. A host that
   * portals its own popup out of a custom cell renderer can opt it in the same
   * way with the `data-pg-keep-focus` attribute.
   *
   * Row selection (checkboxes / the serial column) is untouched either way; only
   * the cell focus ring and cell ranges are cleared.
   *
   * Set `false` when something outside the grid — an application toolbar, a
   * detail form — acts on the current cell selection and must not lose it when
   * the user clicks it.
   */
  clearCellSelectionOnClickOutside?: boolean;

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
   * Filters Tool Panel — an opt-in filter funnel button at the grid's
   * top-right corner that opens a floating panel for managing every column
   * filter in one place (add via a searchable column picker, expand/collapse
   * each filter, remove with ✕). Writes through the same filter engine as the
   * header funnel, so both entry points stay consistent.
   * @see {@link FiltersToolPanelConfig}
   */
  filtersToolPanel?: FiltersToolPanelConfig;

  /**
   * Tree Data — self-referential row hierarchy (org charts, file trees,
   * bills of materials) driven by a `parentId`/`id` pair, nested `children`
   * arrays, a `getDataPath()` callback, or a custom hierarchy provider.
   * Mutually exclusive with `grouping` — a grid is either tree-structured or
   * column-value-grouped, never both at once. @see {@link TreeDataConfig}
   */
  treeData?: TreeDataConfig;

  /**
   * Formula Engine — Excel/Sheets-style expressions in opt-in columns
   * (`ColumnDef.allowFormula`). Enables cells like `=SUM(A1:A10)` or
   * `=IF(B1>5,"Yes","No")`, with incremental recalculation, circular-reference
   * detection and an extensible function registry. References are positional
   * (`A1` = first column, first data row) and bound to the data model, so they
   * stay correct across sort/filter/pagination. @see {@link FormulaConfig}
   */
  formula?: FormulaConfig;

  /**
   * AutoFill Engine — intelligent drag-to-fill. When the user drags a range's
   * fill handle, the engine continues the detected pattern instead of copying:
   * numeric/date series, month & weekday names, `Item001 → Item002`, alphabet,
   * booleans, and a copy fallback. Pure and framework-independent; the fill
   * handle is the only integration point. @see {@link AutoFillConfig}
   */
  autofill?: AutoFillConfig;

  /**
   * Row context menu — the menu opened by right-clicking a data row.
   *
   * Adds host-authored actions alongside (or instead of) the built-in
   * clipboard, chart and export entries. Items accept an icon from the grid's
   * icon registry, an optional keyboard hint, and `children` for a hover
   * fly-out submenu; `disabled` / `hidden` may be predicates evaluated against
   * the clicked row. Activations invoke the item's `action` and emit
   * `ROW_MENU_ITEM_CLICKED`. @see {@link RowMenuConfig}
   */
  rowMenu?: RowMenuConfig;

  /**
   * Import Engine — an opt-in **Import ▾** button at the grid's top-right
   * corner that ingests Excel / CSV / TSV / Clipboard data through a single
   * unified pipeline and feeds it in via the same public seams as
   * {@link GridApi.setData}/{@link GridApi.setColumns}. `.xlsx` support requires
   * registering a workbook parser (the optional SheetJS adapter). Formulas in
   * imported cells are registered with the Formula Engine, never evaluated by
   * the importer. @see {@link ImportConfig}
   */
  import?: ImportConfig;

  /**
   * Toolbar — the configurable top strip above the header. Hosts a fully
   * configurable, event-only **tab strip** (e.g. Active / Inactive / Final
   * Settlement) on the left, an optional **global search** (positionable left or
   * right, wired to the quick-filter), and visibility toggles for the Filters
   * funnel and Import launchers on the right. When omitted, the strip falls back
   * to legacy behaviour (launchers appear whenever their own features are
   * enabled). @see {@link ToolbarConfig}
   */
  toolbar?: ToolbarConfig;

  /**
   * Toast notifications — configures the grid's built-in transient message
   * system (position, duration, max visible, animation…). Access the live
   * service via `GridApi.toasts` to show success/error/warning/info toasts.
   * @see {@link ToastServiceConfigInput}
   */
  toast?: ToastServiceConfigInput;

  /**
   * Summary Rows — one or more aggregate rows docked above and/or below the
   * grid body.
   *
   * Each row aggregates a configurable scope (all / filtered / visible /
   * selected rows) with built-in or custom functions, and each of its cells can
   * override value, aggregation, formatting, rendering, styling, span and
   * tooltip independently. Rows recompute automatically as data, filters,
   * sorting, pagination and selection change unless
   * {@link SummaryConfig.autoRefresh} is turned off.
   *
   * With no `rows` supplied, a single total row is derived from any columns
   * declaring `ColumnDef.showSummary`.
   *
   * @example
   * ```ts
   * summary: {
   *   position: SummaryPosition.Bottom,
   *   rows: [{ label: 'Total', cells: { amount: { aggregate: SummaryAggregation.Sum } } }],
   * }
   * ```
   *
   * @see {@link SummaryConfig}
   */
  summary?: import('../summary/summary.types').SummaryConfig;

  /**
   * Container resizing — drag the grid's own edges and corners to resize the
   * whole component.
   *
   * Sizes the container element the grid was constructed into, so everything
   * inside follows automatically. Defaults to the bottom-right L of handles
   * (like a native `<textarea>`); opt into the top/left edges explicitly, since
   * those also shift the container's margin to keep the opposite edge fixed.
   *
   * The same size is settable imperatively — see `GridApi.setGridSize` and
   * friends, which write through the same path so the two can never disagree.
   *
   * @example
   * ```ts
   * resize: { minWidth: 480, minHeight: 240, step: 8 }
   * ```
   *
   * @see {@link GridResizeConfig}
   */
  resize?: import('./grid-resize.types').GridResizeConfig;

  enableStateManagement?: boolean;
  stateKey?: string;

  dateFormat?: string;
  timeZone?: string;
  currencySymbol?: string;
  currencyFormat?: string;
  locale?: string;

  /**
   * Whether the grid starts in — or is held in — its loading state.
   *
   * While set, a loading indicator covers the body (the header stays visible
   * and interactive) and row rendering is skipped entirely, so a grid that is
   * waiting on a fetch costs nothing to paint.
   *
   * This is the *initial* value only; the live flag lives in the grid store.
   * Toggle it at runtime with `GridApi.setLoading()` — the framework wrappers
   * expose it as a dedicated `loading` input/prop that routes there, so
   * flipping it never recreates the grid.
   *
   * The Server-Side and Infinite row models drive the same flag themselves; a
   * grid using one of those does not need to set this.
   *
   * @default false
   * @see {@link loadingOverlay}
   */
  loading?: boolean;

  /**
   * Appearance of the loading indicator — spinner (default) or skeleton
   * placeholder rows, plus caption, backdrop and anti-flicker delay.
   *
   * @example
   * ```ts
   * loadingOverlay: {
   *   indicator: LoadingIndicator.Skeleton,
   *   delay: 150,
   * }
   * ```
   *
   * @see {@link import('./loading.types').LoadingOverlayConfig}
   */
  loadingOverlay?: import('./loading.types').LoadingOverlayConfig;

  /**
   * Caption shown under the loading spinner.
   *
   * @deprecated Use `loadingOverlay.text`, which sits alongside the rest of the
   * overlay configuration. Still honoured when `loadingOverlay.text` is absent.
   */
  loadingOverlayText?: string;
  noRowsOverlayText?: string;
  noRowsOverlayHtml?: string;

  rowClassFn?: (row: Record<string, unknown>, index: number) => string;
  rowHeightFn?: (row: Record<string, unknown>) => number;

  suppressScrollOnNewData?: boolean;
  suppressColumnVirtualisation?: boolean;

  /**
   * Optional feature plugins to install into this grid.
   *
   * A plugin owns DOM inside the grid and follows its virtualization, without
   * shipping in the core bundle — core never imports a plugin implementation.
   * Omitting this (the default) costs nothing beyond one `undefined` check.
   *
   * Plugins initialize after the grid is fully built and before
   * `GridEventType.READY`, and are torn down first on destroy. One plugin
   * failing cannot break the grid or its siblings — see {@link GridPlugin}.
   *
   * @example
   * ```ts
   * import { SchedulerPlugin } from 'photon-grid-core/plugins/scheduler';
   *
   * new GridCore(el, { columns, data, plugins: [new SchedulerPlugin({ ... })] });
   * ```
   */
  plugins?: GridPlugin[];

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

/**
 * Configuration for the Filters Tool Panel (`GridOptions.filtersToolPanel`).
 * The feature is disabled unless {@link enabled} is `true`.
 */
export interface FiltersToolPanelConfig {
  /** Master switch — when `true`, the top-right filter button and panel are mounted. */
  enabled: boolean;
  /** When `true`, the panel starts open on grid initialization. @default false */
  defaultOpen?: boolean;
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

/**
 * A batch of row mutations applied in a single pipeline pass — the input to
 * {@link GridApi.applyTransaction} and {@link GridApi.applyTransactionAsync}.
 *
 * `add` and `update` carry raw row-data objects; `remove` carries `nodeId`s.
 * An update object is matched to an existing row by its `nodeId` (the value of
 * the row's id field when one was supplied at `setData` time), so updates only
 * apply to rows that carry a stable identifier.
 */
export interface RowTransaction {
  /** New rows to append to the data set. */
  add?: Record<string, unknown>[];
  /** Existing rows to shallow-merge, matched by `nodeId`. */
  update?: Record<string, unknown>[];
  /** `nodeId`s of rows to remove. */
  remove?: string[];
}

/**
 * The set of {@link RowNode}s actually affected by a {@link RowTransaction},
 * returned by the row model so callers can react to precise changes.
 */
export interface RowTransactionResult {
  /** Newly created nodes, in the order supplied. */
  add: RowNode[];
  /** Nodes whose `data` was merged. */
  update: RowNode[];
  /** Nodes that were removed. */
  remove: RowNode[];
}

/**
 * Where a row should sit in the viewport after a scroll-into-view request.
 * `undefined` performs the minimal scroll needed to reveal the row.
 */
export type RowVerticalScrollPosition = 'top' | 'middle' | 'bottom';

/** Parameters for {@link GridApi.refreshCells}. */
export interface RefreshCellsParams {
  /** Rows to repaint. Omit (or pass empty) to repaint every rendered row. */
  rowNodes?: RowNode[];
  /**
   * Restrict the repaint to these column ids. Reserved for future per-cell
   * granularity; the current renderer repaints whole rows, so this is advisory.
   */
  colIds?: string[];
  /** Force a full render-cache clear instead of an incremental row eviction. */
  force?: boolean;
}

/** Parameters for {@link GridApi.flashCells}. */
export interface FlashCellsParams {
  /** Rows to flash. Omit to flash all currently displayed rows. */
  rowNodes?: RowNode[];
  /** Restrict the flash to these column ids. Omit to flash the whole row. */
  colIds?: string[];
  /** How long the flash highlight persists, in milliseconds. Defaults to `700`. */
  flashDelay?: number;
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
