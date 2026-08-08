import type { GridOptions } from '../types/grid.types';
import type { EventBus } from '../event-bus/event-bus';
import type { GridStore } from './grid-store';
import type { ColumnModel } from './column-model';
import type { RowModel } from './row-model';
import type { SortEngine } from '../engines/sort/sort-engine';
import type { FilterEngine } from '../engines/filter/filter-engine';
import type { PaginationEngine } from '../engines/pagination/pagination-engine';
import type { GroupingEngine } from '../engines/grouping/grouping-engine';
import type { RowSelectionEngine } from '../engines/selection/row-selection-engine';
import type { CellEditorEngine } from '../engines/editing/cell-editor-engine';
import type { EditorManager } from '../editing/session/editor-manager';
import type { EditorRegistry } from '../editing/registry/editor-registry';
import type { EditorAdapterRegistry } from '../editing/registry/editor-adapter-registry';
import type { ValidationEngine } from '../editing/validation/validation-engine';
import type { SummaryEngine } from '../engines/summary/summary-engine';
import type { ExportEngine } from '../engines/export/export-engine';
import type { ExportService } from '../export/export-service';

import type { ImportEngine } from '../engines/import/import-engine';
import type { ToastService } from '../toast/toast-service';
import type { ClipboardEngine } from '../engines/clipboard/clipboard-engine';
import type { DragDropEngine } from '../drag-drop/drag-drop-engine';
import type { CellSelectionEngine } from '../cell-selection/cell-selection-engine';
import type { ThemeManager } from '../theme/theme-manager';
import type { IconRegistry } from '../icons/icon-registry';
import type { IconRenderer } from '../icons/icon-renderer';
import type { IconThemeController } from '../icons/icon-theme-controller';
import type { ChartEngine } from '../chart/chart-engine';
import type { RangeChartService } from '../chart/range-chart-service';
import type { AggregationEngine } from '../engines/aggregation/aggregation-engine';
import type { GridRenderer } from '../renderer/grid-renderer';
import type { UndoRedoEngine } from '../engines/undo-redo/undo-redo-engine';
import type { MasterDetailEngine } from '../engines/master-detail/master-detail-engine';
import type { TreeDataService } from '../engines/tree/tree-data-service';
import type { TreeExpansionService } from '../engines/tree/tree-expansion-service';
import type { TreeSelectionService } from '../engines/tree/tree-selection-service';
import type { FormulaEngine } from '../formula/formula-engine';
import type { FormulaInitializer } from '../formula/formula-initializer';
import type { AutoFillEngine } from '../autofill/autofill-engine';
import type { SummaryAggregationEngine } from '../summary/aggregation-engine';
import type { SummaryModel } from '../summary/summary-model';
import type { SummaryService } from '../summary/summary-service';
import type { RowModelStrategy } from '../row-models/row-model-strategy';
import type { PhotonThemeEngine } from '../photon-ai/theme/photon-theme-engine';

export interface GridContext {
  options: GridOptions;
  containerEl: HTMLElement;
  eventBus: EventBus;
  store: GridStore;
  columnModel: ColumnModel;
  rowModel: RowModel;
  /**
   * The active row-model strategy behind `GridOptions.rowModel`. `applyPipeline()`
   * delegates to this to produce the displayed rows: {@link import('../row-models/client-row-model').ClientRowModel}
   * (in-memory, default) or {@link import('../row-models/server/server-row-model').ServerRowModel}
   * (delegates to a datasource). Assigned in `GridCore.buildContext`.
   */
  rowModelStrategy: RowModelStrategy;
  sortEngine: SortEngine;
  filterEngine: FilterEngine;
  paginationEngine: PaginationEngine;
  groupingEngine: GroupingEngine;
  aggregationEngine: AggregationEngine;
  rowSelectionEngine: RowSelectionEngine;
  /**
   * @deprecated Retained as a thin facade over {@link editorManager} so existing
   * code keeps compiling. New work should use `editorManager` directly.
   */
  cellEditorEngine: CellEditorEngine;
  /**
   * Owns the lifetime of an edit: resolving an editor for a cell, mounting it,
   * validating on the way out, and writing the value through the value pipeline.
   * The orchestrator of `src/editing/`.
   */
  editorManager: EditorManager;
  /**
   * Editors available by string key. Seeded with the built-ins; an application
   * adds its own through `GridApi.registerEditor`, which is what makes
   * `cellEditor: 'currency'` resolvable without any core change.
   */
  editorRegistry: EditorRegistry;
  /**
   * Framework component adapters. Empty in a vanilla grid; the Angular / React /
   * Vue wrappers each register one, and that is the *only* place the editing
   * system learns about a framework.
   */
  editorAdapters: EditorAdapterRegistry;
  /**
   * Compiles and runs column validation. Shared by the commit path and by
   * `GridApi.validateCell`, so an API check and a real edit can never disagree.
   */
  validationEngine: ValidationEngine;
  summaryEngine: SummaryEngine;
  /**
   * Summary Rows — holds the row *definitions* (which rows exist, where each is
   * anchored, what scope it aggregates) and the values computed for them.
   * Always present; inert when `GridOptions.summary` is absent and no column
   * declares `showSummary`. @see {@link summaryService}
   */
  summaryModel: SummaryModel;
  /**
   * Turns {@link summaryModel}'s definitions into computed values, reading the
   * grid only through a `SummaryDataPort`. Invoked after every pipeline run
   * unless `GridOptions.summary.autoRefresh` is `false`.
   */
  summaryService: SummaryService;
  /**
   * Resolves summary aggregations by name — the seven built-ins plus anything
   * registered through `GridOptions.summary.aggregations`. Per-grid, so a custom
   * function never leaks between grids.
   */
  summaryAggregationEngine: SummaryAggregationEngine;
  exportEngine: ExportEngine;
  /**
   * Export Service — the pluggable export system behind `GridApi.export()` and
   * the toolbar's *Export ▾* dropdown.
   *
   * Owns the shared data-preparation layer, so CSV, JSON, Excel and PDF exports
   * of the same grid always agree on rows, columns and cell text. CSV and JSON
   * are built in; Excel and PDF resolve through this grid's exporter registry
   * (chained to the global one), which is how the core stays zero-dependency.
   */
  exportService: ExportService;

  /**
   * Import Engine — ingests Excel/CSV/TSV/Clipboard data through one unified
   * pipeline and feeds the grid via the public `setColumns`/`setData` seams.
   * Inert unless `GridOptions.import.enabled`. `.xlsx` requires a registered
   * workbook parser (the optional SheetJS adapter).
   */
  importEngine: ImportEngine;
  /**
   * Toast notification system — transient success/error/warning/info messages.
   * Framework-agnostic and theme-driven; also used to surface import outcomes.
   * Exposed publicly via `GridApi.toasts`.
   */
  toastService: ToastService;
  clipboardEngine: ClipboardEngine;
  dragDropEngine: DragDropEngine;
  cellSelectionEngine: CellSelectionEngine;
  themeManager: ThemeManager;
  iconRegistry: IconRegistry;
  /**
   * Shared renderer over {@link iconRegistry}. Exposed on the context so
   * subsystems that build icon-bearing UI outside the render tree — the row
   * context menu's custom items, for example — resolve icon names through the
   * same registry the rest of the grid uses, instead of embedding markup.
   */
  iconRenderer: IconRenderer;
  /**
   * Keeps {@link iconRegistry} in step with the active theme variant, and
   * repaints icons already in the DOM when the pack changes. Internal — hosts
   * reach it through the icon methods on `GridApi`.
   */
  iconThemeController: IconThemeController;
  chartEngine: ChartEngine;
  /**
   * Manages AG-Grid-style range charts (configurable, live-linked). Assigned in
   * `GridCore.initialize` once the grid DOM exists, so it is optional on the
   * context type but always present by the time chart APIs run.
   */
  rangeChartService?: RangeChartService;
  /** Manages undo/redo history for cell edits, cut, and paste operations. */
  undoRedoEngine: UndoRedoEngine;
  /** Drives Master/Detail row expansion state, detail-data caching, and height tracking. */
  masterDetailEngine: MasterDetailEngine;
  /** Builds/filters/sorts/flattens self-referential row hierarchies (Tree Data). */
  treeDataService: TreeDataService;
  /** Owns Tree Data's expand/collapse state, separate from `treeDataService` per its own single responsibility. */
  treeExpansionService: TreeExpansionService;
  /** Cascade select/deselect over `RowSelectionEngine` for Tree Data's parent/descendant selection semantics. */
  treeSelectionService: TreeSelectionService;
  /**
   * Excel/Sheets-style Formula Engine. Evaluates `=`-prefixed expressions in
   * columns opted in via `ColumnDef.allowFormula`, maintains the dependency
   * graph, and writes computed values back into row data. Inert unless
   * `GridOptions.formula.enabled`.
   */
  formulaEngine: FormulaEngine;
  /**
   * Discovers declarative formulas (column-level `ColumnDef.formula` and
   * `=`-prefixed row-data values) and registers them with `formulaEngine` on
   * load and on structural row changes — so no `setCellFormula` seeding is needed.
   */
  formulaInitializer: FormulaInitializer;
  /**
   * Intelligent AutoFill (drag-to-fill) engine. Continues the source pattern —
   * numeric/date series, month & weekday names, `Item001 → Item002`, alphabet,
   * booleans — instead of copying. Pure and framework-independent; consumed by
   * the cell-selection engine's fill handle. Inert unless `GridOptions.autofill`
   * keeps it enabled (enabled by default).
   */
  autoFillEngine: AutoFillEngine;
  renderer: GridRenderer;
  /**
   * AI Theme Engine — natural-language theme generation/modification over the
   * real design-token registry, exposed publicly as `gridApi.photonAI`. Always
   * present; LLM-backed methods are inert (throw) unless a provider is
   * configured via `GridOptions.photonAI.provider`. Assigned in `initialize()`.
   */
  photonThemeEngine: PhotonThemeEngine;
}
