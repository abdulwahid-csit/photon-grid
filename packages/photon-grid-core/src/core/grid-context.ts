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
import type { SummaryEngine } from '../engines/summary/summary-engine';
import type { ExportEngine } from '../engines/export/export-engine';
import type { ImportEngine } from '../engines/import/import-engine';
import type { ToastService } from '../toast/toast-service';
import type { ClipboardEngine } from '../engines/clipboard/clipboard-engine';
import type { DragDropEngine } from '../drag-drop/drag-drop-engine';
import type { CellSelectionEngine } from '../cell-selection/cell-selection-engine';
import type { ThemeManager } from '../theme/theme-manager';
import type { IconRegistry } from '../icons/icon-registry';
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

export interface GridContext {
  options: GridOptions;
  containerEl: HTMLElement;
  eventBus: EventBus;
  store: GridStore;
  columnModel: ColumnModel;
  rowModel: RowModel;
  sortEngine: SortEngine;
  filterEngine: FilterEngine;
  paginationEngine: PaginationEngine;
  groupingEngine: GroupingEngine;
  aggregationEngine: AggregationEngine;
  rowSelectionEngine: RowSelectionEngine;
  cellEditorEngine: CellEditorEngine;
  summaryEngine: SummaryEngine;
  exportEngine: ExportEngine;
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
}
