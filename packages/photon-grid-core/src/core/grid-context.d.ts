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
import type { ClipboardEngine } from '../engines/clipboard/clipboard-engine';
import type { DragDropEngine } from '../drag-drop/drag-drop-engine';
import type { CellSelectionEngine } from '../cell-selection/cell-selection-engine';
import type { ThemeManager } from '../theme/theme-manager';
import type { IconRegistry } from '../icons/icon-registry';
import type { ChartEngine } from '../chart/chart-engine';
import type { AggregationEngine } from '../engines/aggregation/aggregation-engine';
import type { GridRenderer } from '../renderer/grid-renderer';
import type { UndoRedoEngine } from '../engines/undo-redo/undo-redo-engine';
import type { MasterDetailEngine } from '../engines/master-detail/master-detail-engine';
import type { TreeDataService } from '../engines/tree/tree-data-service';
import type { TreeExpansionService } from '../engines/tree/tree-expansion-service';
import type { TreeSelectionService } from '../engines/tree/tree-selection-service';
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
    clipboardEngine: ClipboardEngine;
    dragDropEngine: DragDropEngine;
    cellSelectionEngine: CellSelectionEngine;
    themeManager: ThemeManager;
    iconRegistry: IconRegistry;
    chartEngine: ChartEngine;
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
    renderer: GridRenderer;
}
//# sourceMappingURL=grid-context.d.ts.map