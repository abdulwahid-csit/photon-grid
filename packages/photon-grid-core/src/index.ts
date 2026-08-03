export { GridCore } from './core/grid-core';
export { createGrid, renderGrid } from './core/create-grid';
export type { GridContainer } from './core/create-grid';
export { injectBaseStyles, removeBaseStyles } from './styles/base-styles';
export { GridApi } from './core/grid-api';
export { GridStore } from './core/grid-store';
export { ColumnModel } from './core/column-model';
export { RowModel } from './core/row-model';

export { EventBus } from './event-bus/event-bus';
export { GridEventType } from './types/event.types';

// ── Column Groups ────────────────────────────────────────────────────────────
export { ColumnGroupModel } from './column-groups/column-group-model';
export { ColumnGroupHeaderBuilder } from './column-groups/column-group-header-builder';
export { ColumnGroupDragHandler } from './column-groups/column-group-drag-handler';
export { ColumnGroupStateManager } from './column-groups/column-group-state-manager';
export { ColumnGroupNodeType, ColumnGroupResizeStrategy } from './column-groups/column-group.types';

export { SortEngine } from './engines/sort/sort-engine';
export { FilterEngine } from './engines/filter/filter-engine';
export { FilterEditor } from './engines/filter/filter-editor';
export type { FilterEditorConfig } from './engines/filter/filter-editor';
export { FilterPanel } from './engines/filter/filter-panel';
export type { FilterPanelConfig } from './engines/filter/filter-panel';
export { PaginationEngine } from './engines/pagination/pagination-engine';
export { GroupingEngine } from './engines/grouping/grouping-engine';
export { AggregationEngine } from './engines/aggregation/aggregation-engine';
export { RowSelectionEngine } from './engines/selection/row-selection-engine';
export { CellEditorEngine } from './engines/editing/cell-editor-engine';
export { SummaryEngine } from './engines/summary/summary-engine';
export { ExportEngine } from './engines/export/export-engine';

// ── Import Engine ────────────────────────────────────────────────────────────
export { ImportEngine } from './engines/import/import-engine';
export {
  ImportPipeline,
  DelimitedImporter,
  ClipboardImporter,
  ExcelImporter,
  ExcelParserUnavailableError,
  TypeDetector,
  ColumnMapper,
  ImportValidator,
  WorkbookMapper,
  makeCell,
  matrixToWorkbook,
  selectSheet,
} from './engines/import';
export type {
  Workbook,
  WorkbookSheet,
  WorkbookRow,
  WorkbookCell,
  WorkbookCellFormat,
  WorkbookMergeRegion,
  WorkbookParser,
  WorkbookParseOptions,
  DetectedColumnType,
  MappedWorkbook,
  WorkbookMapOptions,
  ClipboardTextReader,
  DelimitedParseOptions,
  ImportPipelineInput,
  ProgressEmitter,
} from './engines/import';
export {
  ImportSourceType,
  ImportMode,
  ImportCellType,
  ImportStage,
  ImportValidationSeverity,
  ImportValidationCode,
} from './types/import.types';
export type {
  ImportConfig,
  ImportOptions,
  ImportResult,
  ImportMapping,
  ImportValidationIssue,
  ImportValidationResult,
  ImportStartEvent,
  ImportProgressEvent,
  ImportCompleteEvent,
  ImportErrorEvent,
  GridImportSink,
} from './types/import.types';

export { ToolbarSearchPosition } from './types/toolbar.types';
export { EmptyDetailToggleMode } from './types/master-detail.types';
export type { MasterDetailConfig, DetailRendererParams } from './types/master-detail.types';
export type {
  DetailComponent,
  DetailComponentConstructor,
  DetailContext,
  DetailContextBase,
  DetailEvent,
  DetailEventHandler,
  DetailEventHandlerMap,
  DetailPropsFactory,
  DetailRenderer,
  DetailRendererFunction,
  DetailRenderOutput,
} from './types/detail-component.types';
export type {
  ToolbarConfig,
  ToolbarTab,
  ToolbarTabsConfig,
  ToolbarSearchConfig,
} from './types/toolbar.types';
export type { ToolbarTabChangedEvent, ToolbarSearchChangedEvent } from './types/event.types';

export type {
  RowModelType,
  SortModelItem,
  ServerSideRequest,
  ServerSideResult,
  ServerSideGetRowsParams,
  ServerSideDatasource,
  ServerSideConfig,
  ServerSideCacheConfig,
} from './types/server-side.types';
export type {
  ServerRequestEvent,
  ServerSuccessEvent,
  ServerErrorEvent,
  ServerRefreshEvent,
  ServerRetryEvent,
} from './types/event.types';

export { ThemeCategory, ThemeVariableType } from './types/theme-ai.types';
export type {
  ThemeVariable,
  ThemeVariableRegistryReader,
  GeneratedTheme,
  ThemeGenerationResult,
  ThemeValidationResult,
  RejectedThemeVariable,
  ThemeGenerateParams,
  ThemeModifyParams,
  ThemeOptimizeOptions,
  ThemeExplanation,
  ThemeHistoryEntry,
  ThemeExportFormat,
  PhotonThemeApi,
} from './types/theme-ai.types';
export type { ThemeAiAppliedEvent, ThemeAiErrorEvent } from './types/event.types';
export { ThemeVariableRegistry, buildDefaultThemeVariables } from './photon-ai/theme/theme-variable-registry';
export { PhotonThemeError } from './photon-ai/theme/photon-theme-engine';

export { ClipboardEngine } from './engines/clipboard/clipboard-engine';
export { UndoRedoEngine } from './engines/undo-redo/undo-redo-engine';
export type { CellChange, UndoRedoAction, UndoRedoActionType } from './engines/undo-redo/undo-redo-engine';

export { DragDropEngine } from './drag-drop/drag-drop-engine';
export { DragPreview } from './drag-drop/drag-preview';
export { DragAutoscroll } from './drag-drop/drag-autoscroll';

export { CellSelectionEngine } from './cell-selection/cell-selection-engine';
export { SelectionRenderer } from './cell-selection/selection-renderer';

export { ThemeManager } from './theme/theme-manager';
export { CssVarInjector } from './theme/css-var-injector';
export { lightTheme } from './theme/themes/light-theme';
export { darkTheme } from './theme/themes/dark-theme';

// ── Icons ────────────────────────────────────────────────────────────────────
// Icon resolution is layered: host overrides → the active variant's pack →
// `coreIcons`. Hosts supply their own through `GridOptions.icons` /
// `GridOptions.variantIcons`, or at runtime via the icon methods on `GridApi`.
export { IconRegistry } from './icons/icon-registry';
export type { IconRegistryOptions } from './icons/icon-registry';
export { IconRenderer } from './icons/icon-renderer';
export type { IconOptions } from './icons/icon-renderer';
export { coreIcons } from './icons/icon-sets/core-icons';
export { variantIconSets } from './icons/icon-sets/variant-icon-sets';
export { ionIcons } from './icons/icon-sets/ion-icons';
export { neonIcons } from './icons/icon-sets/neon-icons';
export { photonIcons } from './icons/icon-sets/photon-icons';
export { quantumIcons } from './icons/icon-sets/quantum-icons';
export { repaintIcons, iconRepaintRoots } from './icons/icon-repainter';
export type { IconSet, VariantIconSets } from './types/icon.types';

// ── Plugins ──────────────────────────────────────────────────────────────────
// The extension seam for optional feature subsystems. Only the *contract* is
// exported here; plugin implementations ship behind their own subpath entries
// (e.g. `photon-grid-core/plugins/scheduler`) so they stay out of the default
// module graph and out of bundles that never register them.
export type {
  GridPlugin,
  PluginContext,
  PluginLayerOptions,
  RenderWindow,
  ScrollMetrics,
} from './plugins/plugin.types';

// -- Scheduler --
// Types only, deliberately. The framework wrappers need the event-renderer
// contract to compile their component factories against, but a value export
// here would pull the scheduler's module graph into the default bundle for every
// consumer, which is exactly what the subpath entry exists to prevent.
export type {
  SchedulerEventComponent,
  SchedulerEventComponentConstructor,
  SchedulerEventRenderParams,
} from './plugins/scheduler/scheduler.config';

export { GridRenderer } from './renderer/grid-renderer';
export { ColumnChooser } from './renderer/column-chooser';
export { FiltersToolPanel } from './renderer/filters-tool-panel';
export type { FiltersToolPanelDeps } from './renderer/filters-tool-panel';
export { HeaderRenderer } from './renderer/header-renderer';
export { BodyRenderer } from './renderer/body-renderer';
export { FooterRenderer } from './renderer/footer-renderer';
export { OverlayRenderer } from './renderer/overlay-renderer';
export { VirtualScrollRenderer } from './renderer/virtual-scroll-renderer';
export { CellRenderer } from './renderer/cell-renderer';

export { ChartEngine } from './chart/chart-engine';
export { ChartRenderer } from './chart/chart-renderer';
export { ChartDataTransformer } from './chart/chart-data-transformer';
export { SparklineRenderer } from './chart/sparkline/sparkline-renderer';

export { formatValue, parseValue, validateValue } from './engines/editing/value-parser';
export {
  getCellValue,
  setCellValue,
  formatCellValue,
  resolveFieldPath,
  assignFieldPath,
} from './engines/editing/value-accessor';
export { getComparator, stringComparator, numberComparator, dateComparator } from './engines/sort/sort-comparator';

// ── Photon AI ────────────────────────────────────────────────────────────────
export {
  PhotonAIService,
  PhotonAICommandRegistry,
  IntentParser,
  EntityResolver,
  CommandBuilder,
  CommandExecutor,
  registerBuiltinCommands,
  normalizeInput,
  tokenize,
  createAIProvider,
  HttpAIProvider,
  GridContextBuilder,
  ContextRouter,
  CommandNormalizer,
  buildSystemInstruction,
  PhotonAIErrorKind,
  PhotonAIProviderError,
  PhotonAIDomain,
} from './photon-ai';
export type { PhotonCommand, PhotonCommandResult, ResolvedEntities, IntentDefinition, ParsedIntentMatch } from './photon-ai';
export type {
  PhotonAIProvider,
  PhotonAIProviderRequest,
  PhotonAIRequest,
  PhotonAIResponse,
  PhotonAIGeneration,
  PhotonAIAction,
  PhotonGridContext,
  PhotonAIColumnContext,
  PhotonAICapability,
  PhotonAIGridState,
  PhotonAIContextScope,
} from './photon-ai';
export type { PhotonAIConfig, PhotonAIProviderConfig } from './types/photon-ai.types';
export { PhotonAIProviderType } from './types/photon-ai.types';

// ── Formula Engine ─────────────────────────────────────────────────────────────
export {
  FormulaEngine,
  FormulaError,
  FormulaErrorCode,
  isFormulaError,
  FunctionRegistry,
  FunctionCategory,
  UNLIMITED_ARGS,
  ConfigurationManager,
  FormulaStore,
  AstNodeType,
  BinaryOperator,
  UnaryOperator,
  TokenType,
  makeCellId,
  splitCellId,
  columnLabelToIndex,
  columnIndexToLabel,
  parseCellRef,
  encodeCellRef,
  isRangeRef,
} from './formula';
export type {
  FormulaFunction,
  FormulaGridAdapter,
  FormulaCellChange,
  RecalculationResult,
  ResolvedFormulaConfig,
  EvalContext,
  FormulaCell,
  CellId,
  FormulaScalar,
  FormulaValue,
  FormulaMatrix,
  FormulaArgument,
  FormulaState,
  FormulaStateEntry,
  CellRef,
  RangeRef,
  Reference,
  AstNode,
  Token,
} from './formula';
export type { FormulaConfig } from './types/formula.types';

// ── AutoFill Engine ────────────────────────────────────────────────────────────
export {
  AutoFillEngine,
  AutoFillDetectorRegistry,
  AutoFillDetectorName,
  AutoFillConfigurationManager,
  createDefaultDetectors,
  NumericSequenceDetector,
  DateSequenceDetector,
  MonthDetector,
  WeekdayDetector,
  BooleanDetector,
  TextNumberDetector,
  AlphabetDetector,
  CopyDetector,
} from './autofill';
export type {
  AutoFillValue,
  AutoFillOptions,
  AutoFillPatternDetector,
  AutoFillSeries,
  ResolvedAutoFillConfig,
} from './autofill';
export type { AutoFillConfig } from './types/autofill.types';

// ── Infinite Row Model ──────────────────────────────────────────────────────
// `rowModel: 'infinite'` — scroll-driven page loading with prefetch, an LRU
// page cache, per-page cancellation and skeleton placeholders. Reuses the
// Server-Side Row Model's `ServerSideDatasource` contract unchanged.
export { InfiniteRowModel } from './row-models/infinite/infinite-row-model';
export { InfinitePageCache } from './row-models/infinite/infinite-page-cache';
export { InfiniteRequestQueue } from './row-models/infinite/infinite-request-queue';
export {
  computePageWindow,
  pageCount,
  pageOfRow,
  pageStartRow,
  pagesInRange,
} from './row-models/infinite/infinite-window';
export type { PageWindow, PageWindowParams } from './row-models/infinite/infinite-window';
export type { CachedPage } from './row-models/infinite/infinite-page-cache';
export type {
  PageFetchHooks,
  PageFetchOutcome,
  PageFetchTask,
} from './row-models/infinite/infinite-request-queue';
export { resolveInfiniteConfig } from './types/infinite.types';
export type {
  InfiniteCacheEvent,
  InfiniteDataReceivedEvent,
  InfiniteDataRequestEvent,
  InfiniteErrorEvent,
  InfiniteRequestReason,
  InfiniteScrollConfig,
  InfiniteStats,
  ResolvedInfiniteConfig,
} from './types/infinite.types';

// ── Row context menu ────────────────────────────────────────────────────────
// Host-authored actions for the row right-click menu: registry or custom
// icons, dynamic labels, checkbox/radio items, confirmation, async actions
// with a busy state, and unbounded nested submenus.
export type {
  RowMenuActionItem,
  RowMenuCheckboxItem,
  RowMenuConfig,
  RowMenuConfirmHandler,
  RowMenuConfirmOptions,
  RowMenuConfirmRequest,
  RowMenuController,
  RowMenuCustomItem,
  RowMenuIcon,
  RowMenuInteractiveItem,
  RowMenuItem,
  RowMenuItemCommon,
  RowMenuItemContext,
  RowMenuItemId,
  RowMenuItemPredicate,
  RowMenuRadioItem,
  RowMenuSeparatorItem,
  RowMenuSubmenuItem,
  RowMenuValue,
} from './types/row-menu.types';
export { buildRowMenuItems, resolvePredicate, resolveValue } from './renderer/row-menu-builder';
export type { RowMenuActivateHandler } from './renderer/row-menu-builder';
export { openConfirmDialog } from './renderer/confirm-dialog';
export type { ConfirmDialogOptions } from './renderer/confirm-dialog';

// ── Viewport Virtual DOM ────────────────────────────────────────────────────
// The real-time update path: `GridApi.applyCellUpdates` diffs the rendered
// window and writes only the cells whose values changed. See src/renderer/vdom.
export { CellPatchKind } from './renderer/vdom/vdom.types';
export type {
  CellUpdate,
  CellUpdateResult,
  VDomStats,
  VirtualCell,
  VirtualRow,
} from './renderer/vdom/vdom.types';

// ── Toast Notification System ───────────────────────────────────────────────
// Configured through `GridOptions.toast` and driven at runtime through
// `GridApi.toasts`. Both reference the enums and types below, so they are part
// of the public surface: `toast: { position: ToastPosition.TopRight }` cannot
// be written without them.
export { ToastService, DEFAULT_TOAST_CONFIG } from './toast/toast-service';
export {
  ToastAnimation,
  ToastDismissReason,
  ToastPosition,
  ToastType,
} from './toast/toast.types';
export type {
  Toast,
  ToastAction,
  ToastHandle,
  ToastOptions,
  ToastServiceConfig,
  ToastServiceConfigInput,
  ToastUpdate,
} from './toast/toast.types';

export type { GridOptions, GridState, GridDimensions, SortConfig, PaginationConfig, SelectionConfig, EditingConfig, CellRange, ColumnGroupConfig, HeaderIconsConfig, FiltersToolPanelConfig } from './types/grid.types';
export type { ColumnDef, ColumnDefInput, Column, ColumnState, ColumnGroup, ColumnDropdownOption, ColumnDataType, ColumnPinPosition, AggFunc } from './types/column.types';
export { HeaderIconDisplay } from './types/column.types';
export { ColumnMenuSection, AggregateFunction } from './types/column-menu.types';
export type {
  ColumnMenuConfig,
  ColumnMenuCustomItem,
  ColumnMenuItem,
  ColumnMenuItemId,
  ColumnMenuItemContext,
  GetColumnMenuItems,
} from './types/column-menu.types';
export type {
  ValueGetterParams,
  ValueSetterParams,
  ValueFormatterParams,
  ValueGetterFn,
  ValueSetterFn,
  ValueFormatterFn,
} from './types/value.types';
export { RendererSlot } from './types/renderer.types';
export type {
  RendererOutput,
  ColumnRendererMap,
  DisplayRendererParams,
  EditorRendererParams,
  OptionRendererParams,
  FilterRendererParams,
  TooltipRendererParams,
  GroupRendererParams,
  HeaderRendererParams,
  SummaryRendererParams,
  ColumnRenderer,
  DisplayRendererFn,
} from './types/renderer.types';

// ── Built-in cell renderers ─────────────────────────────────────────────────
export {
  BuiltInRendererRegistry,
  createDefaultRenderers,
  cellRenderers,
} from './renderer/built-in/registry';
export { DEFAULT_RENDERER_BY_TYPE } from './renderer/built-in/default-renderer-map';
export {
  normalizeCountry,
  registerCountries,
  getCountry,
  getAllCountries,
  flagEmoji,
  flagImageUrl,
  FLAG_CDN_HOST,
  DEFAULT_FLAG_SIZE,
} from './renderer/built-in/country/country-registry';
export type {
  BuiltInRenderer,
  BuiltInRendererSpec,
  BuiltInRendererDefinition,
  BuiltInRenderContext,
  BuiltInRendererOptionsMap,
  BaseRendererOptions,
  CountryEntry,
  CountryRendererOptions,
  TextRendererOptions,
  MultilineRendererOptions,
  NumericRendererOptions,
  CurrencyRendererOptions,
  PercentageRendererOptions,
  BooleanRendererOptions,
  DateRendererOptions,
  DurationRendererOptions,
  LinkRendererOptions,
  ImageRendererOptions,
  AvatarRendererOptions,
  CheckboxRendererOptions,
  BadgeRendererOptions,
  ChipRendererOptions,
  TagRendererOptions,
  IconRendererOptions,
  ProgressRendererOptions,
  RatingRendererOptions,
  ListRendererOptions,
  JsonRendererOptions,
  ButtonRendererOptions,
  HtmlRendererOptions,
} from './types/built-in-renderer.types';

export type {
  IColumnGroupNode,
  IColumnLeafNode,
  ColumnTreeNode,
  HeaderGroupCell,
  HeaderGroupRow,
  HeaderGroupLayoutOptions,
  GroupHeaderRendererParams,
  ColumnGroupSerialState,
  ColumnGroupSystemState,
  ColumnGroupHeaderCollapsedEvent,
  ColumnGroupHeaderExpandedEvent,
  ColumnGroupHeaderCreatedEvent,
  ColumnGroupHeaderRemovedEvent,
} from './column-groups/column-group.types';
export type { GroupCellBuildOptions } from './column-groups/column-group-header-builder';
export type { GroupDropPosition, GroupDropTarget } from './column-groups/column-group-drag-handler';
export type { ColumnGroupStateDiff } from './column-groups/column-group-state-manager';
export type { RowNode, RowGroupNode, RowGroupFooterNode, RowDataNode, RowDropPayload, RowClickPayload, RowEditPayload } from './types/row.types';
export type { RowDragOptions, RowDragStartPayload, RowDragEndPayload } from './types/row-drag.types';
export type { FilterModel, ColumnFilter, FilterCondition, FilterOperator, QuickFilterConfig, FilterSetOption } from './types/filter.types';
// `ThemeMode` / `ThemeVariant` name the two theming axes: `GridOptions.mode` /
// `GridOptions.variant` and `GridApi.setMode` / `GridApi.setVariant` are all
// typed by them, so a host cannot write a theme switcher without them.
export type { Theme, ThemeTokens, ColorTokens, BuiltInThemeName, ThemeMode, ThemeVariant } from './types/theme.types';
export type { GridEvent, GridEventMap } from './types/event.types';
export type {
  ReadyEvent,
  DataChangedEvent,
  ScrollEvent,
  RowSelectedEvent,
  CellClickedEvent,
  CellValueChangedEvent,
  RowMenuItemClickedEvent,
  RowMenuItemErrorEvent,
  RowMenuClosedEvent,
  CellSelectionChangedEvent,
  CellButtonClickedEvent,
  ColumnResizedEvent,
  ColumnMovedEvent,
  ColumnSortedEvent,
  FilterChangedEvent,
  QuickFilterChangedEvent,
  PageChangedEvent,
  ThemeChangedEvent,
  ExportEvent,
  ColumnsStateChangedEvent,
  RowDetailToggleClickedEvent,
  RowDetailOpenedEvent,
  RowDetailClosedEvent,
  RowDetailHeightChangedEvent,
} from './types/event.types';
export type { ChartConfig } from './chart/chart-engine';
export type { ChartData, ChartDataset, ChartTransformOptions } from './chart/chart-data-transformer';
export type { SparklineType, SparklineConfig, SparklinePoint, OHLCPoint } from './chart/sparkline/sparkline.types';
export type { DragItem, DragType, DropTarget as DropTargetConfig, DragSession } from './drag-drop/drag-drop-engine';
export type { EditSession } from './engines/editing/cell-editor-engine';
export type { SummaryRow } from './engines/summary/summary-engine';
