import type { GridOptions } from '../types/grid.types';
import type { GridContext } from './grid-context';
import type { RowNode } from '../types/row.types';
import type { ColumnDef, ColumnDropdownOption } from '../types/column.types';
import type { CellClickedEvent } from '../types/event.types';
import type { DisplayRendererParams, EditorRendererParams } from '../types/renderer.types';
import { injectBaseStyles } from '../styles/base-styles';
import { formatValue } from '../engines/editing/value-parser';
import { resolveColumnRenderer } from '../renderer/renderer-resolver';
import { CustomDropdownEditor } from '../engines/editing/custom-dropdown-editor';
import { EventBus } from '../event-bus/event-bus';
import { GridStore } from './grid-store';
import { ColumnModel, normalizeColumnTree } from './column-model';
import { RowModel } from './row-model';
import { SortEngine } from '../engines/sort/sort-engine';
import { FilterEngine } from '../engines/filter/filter-engine';
import { PaginationEngine } from '../engines/pagination/pagination-engine';
import { GroupingEngine } from '../engines/grouping/grouping-engine';
import { AggregationEngine } from '../engines/aggregation/aggregation-engine';
import { RowSelectionEngine } from '../engines/selection/row-selection-engine';
import { CellEditorEngine } from '../engines/editing/cell-editor-engine';
import { SummaryEngine } from '../engines/summary/summary-engine';
import { ExportEngine } from '../engines/export/export-engine';
import { ClipboardEngine } from '../engines/clipboard/clipboard-engine';
import { DragDropEngine } from '../drag-drop/drag-drop-engine';
import { CellSelectionEngine } from '../cell-selection/cell-selection-engine';
import { ThemeManager } from '../theme/theme-manager';
import { IconRegistry } from '../icons/icon-registry';
import { IconRenderer } from '../icons/icon-renderer';
import { ChartEngine } from '../chart/chart-engine';
import { RangeChartService } from '../chart/range-chart-service';
import { GridRenderer } from '../renderer/grid-renderer';
import { GridApi } from './grid-api';
import { GridEventType } from '../types/event.types';
import { UndoRedoEngine } from '../engines/undo-redo/undo-redo-engine';
import { MasterDetailEngine } from '../engines/master-detail/master-detail-engine';
import { TreeDataService } from '../engines/tree/tree-data-service';
import { TreeExpansionService } from '../engines/tree/tree-expansion-service';
import { TreeSelectionService } from '../engines/tree/tree-selection-service';
import type { RowDetailToggleClickedEvent } from '../types/event.types';
import type { TreeNodeToggleClickedPayload } from '../types/tree-data.types';
import { ColumnGroupModel } from '../column-groups/column-group-model';
import { ColumnGroupHeaderBuilder } from '../column-groups/column-group-header-builder';
import { DisplayGroupEngine } from '../column-groups/display-group-engine';
import type { CellValueChangedEvent } from '../types/event.types';
import { PhotonAIService } from '../photon-ai/photon-ai-service';

/** Recursively collects leaf `ColumnDef` entries, skipping group wrappers. */
function collectLeaves(cols: ColumnDef[]): ColumnDef[] {
  const result: ColumnDef[] = [];
  for (const col of cols) {
    if (Array.isArray(col.children) && col.children.length > 0) {
      result.push(...collectLeaves(col.children));
    } else {
      result.push(col);
    }
  }
  return result;
}

export class GridCore {
  readonly api: GridApi;
  private ctx: GridContext;
  /** Set during `buildContext` when any top-level `ColumnDef` has `children`. */
  private columnGroupModel: ColumnGroupModel | null = null;
  private groupHeaderBuilder: ColumnGroupHeaderBuilder | null = null;
  /** New Display Group Engine — replaces `columnGroupModel` for group rendering. */
  private displayGroupEngine: DisplayGroupEngine | null = null;
  /** Set in `initialize` when `photonAI.enabled` — needs the live `GridApi`, so it cannot be built in `buildContext`. */
  private photonAIService: PhotonAIService | null = null;

  /**
   * The author-supplied columns fully normalized to `ColumnDef` (colId / header
   * / type defaults applied to leaves and groups). Computed once in
   * `buildContext` and reused by `initialize`, so the group tree and the flat
   * leaf list share the same generated colIds.
   */
  private normalizedColumns: ColumnDef[] = [];

  constructor(containerEl: HTMLElement, options: GridOptions) {
    this.ctx = this.buildContext(containerEl, options);
    this.api = new GridApi(this.ctx);
    this.initialize();
  }

  private buildContext(containerEl: HTMLElement, options: GridOptions): GridContext {
    const eventBus = new EventBus();
    const store = new GridStore(eventBus);
    const columnModel = new ColumnModel(store, eventBus);
    const rowModel = new RowModel(store, eventBus);
    const sortEngine = new SortEngine(store, eventBus);
    const filterEngine = new FilterEngine(store, eventBus);
    const paginationEngine = new PaginationEngine(store, eventBus);
    const aggregationEngine = new AggregationEngine();
    const groupingEngine = new GroupingEngine(store, eventBus, aggregationEngine);
    const rowSelectionEngine = new RowSelectionEngine(store, eventBus);
    const cellEditorEngine = new CellEditorEngine(store, eventBus);
    const summaryEngine = new SummaryEngine();
    const exportEngine = new ExportEngine(eventBus);
    const clipboardEngine = new ClipboardEngine();
    const dragDropEngine = new DragDropEngine(eventBus);
    const undoRedoEngine = new UndoRedoEngine();
    const cellSelectionEngine = new CellSelectionEngine(store, eventBus, clipboardEngine, undoRedoEngine);
    const masterDetailEngine = new MasterDetailEngine(store, eventBus, rowModel);
    const treeExpansionService = new TreeExpansionService(store, eventBus);
    const treeDataService = new TreeDataService(store, eventBus, filterEngine, sortEngine, treeExpansionService);
    const treeSelectionService = new TreeSelectionService(rowSelectionEngine, treeDataService);
    const themeManager = new ThemeManager(eventBus);
    const iconRegistry = new IconRegistry();
    const iconRenderer = new IconRenderer(iconRegistry);
    const chartEngine = new ChartEngine(eventBus);

    const renderer = new GridRenderer(
      containerEl,
      store,
      eventBus,
      columnModel,
      paginationEngine,
      iconRenderer,
      cellSelectionEngine,
      sortEngine,
      rowSelectionEngine,
      groupingEngine,
      options,
    );

    // ── Column-group wiring ────────────────────────────────────────────────
    // Author-supplied columns are ColumnDefInput (only `field` required); fully
    // normalize the tree once (filling colId/header/type on leaves AND groups)
    // so the group engine and leaf model both work with complete ColumnDefs and
    // share the same generated colIds.
    const normalizedColumns: ColumnDef[] = options.columns ? normalizeColumnTree(options.columns) : [];
    this.normalizedColumns = normalizedColumns;

    // Detect whether any top-level ColumnDef uses the `children` property.
    // When present, create the DisplayGroupEngine and wire it into the renderer.
    // The engine parses the logical group tree once; all subsequent renders use
    // a stateless builder to produce fresh display trees from the current column order.
    const hasGroups = normalizedColumns.some((c) => Array.isArray(c.children) && c.children.length > 0);
    if (hasGroups) {
      const engine = new DisplayGroupEngine(
        renderer.colStyles,
        eventBus,
        columnModel,
        store,
        iconRenderer,
      );
      engine.parse(normalizedColumns);
      this.displayGroupEngine = engine;
      renderer.setDisplayGroupEngine(engine);
    }

    // ── Master/Detail wiring ────────────────────────────────────────────────
    // Injects a factory rather than letting the renderer import `GridCore`
    // directly — `GridRenderer` must not depend on `GridCore` at the module
    // level, since `GridCore` already imports `GridRenderer`.
    renderer.setMasterDetailConfig(
      masterDetailEngine,
      (el, opts) => new GridCore(el, opts),
      iconRenderer,
      themeManager,
    );
    // Any refresh the engine itself requests (async `getDetailData` resolving,
    // or the auto-height measurement correcting a detail row's placeholder
    // height to its real content height) must ALSO be captured for animation —
    // otherwise the sibling-row slide from the initial toggle click is
    // immediately followed by an uncaptured, instantly-snapping correction,
    // which reads as a jerk right after the smooth expand.
    masterDetailEngine.setRefreshCallback(() => {
      const currentRows = store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) renderer.captureRowAnimation(currentRows, 'detail');
      this.api.refresh();
    });

    // ── Tree Data wiring ────────────────────────────────────────────────────
    // Async lazy-load resolving, or a drag-to-reparent commit, both need a
    // pipeline refresh — same DI pattern as `masterDetailEngine` above.
    treeDataService.setRefreshCallback(() => this.api.refresh());
    // Drag-to-reparent is only meaningful for mutable hierarchy sources
    // (`parentId`/`childrenField`) — `getDataPath`/`custom` are derived and
    // read-only, so `TreeDataService.moveNode` itself refuses those modes;
    // gating drag detection here too avoids even showing 3-way drop zones
    // for a drag that can never commit.
    renderer.setTreeDragConfig(
      !!options.treeData?.enabled && (options.treeData.mode === 'parentId' || options.treeData.mode === 'childrenField'),
      (draggedId, targetId, position) => treeDataService.moveNode(draggedId, targetId, position),
    );
    if (options.treeData?.enabled) {
      renderer.setTreeRenderConfig(options.treeData.toggleColumnId, treeExpansionService);
    }

    return {
      options,
      containerEl,
      eventBus,
      store,
      columnModel,
      rowModel,
      sortEngine,
      filterEngine,
      paginationEngine,
      groupingEngine,
      aggregationEngine,
      rowSelectionEngine,
      cellEditorEngine,
      summaryEngine,
      exportEngine,
      clipboardEngine,
      dragDropEngine,
      cellSelectionEngine,
      themeManager,
      iconRegistry,
      chartEngine,
      undoRedoEngine,
      masterDetailEngine,
      treeDataService,
      treeExpansionService,
      treeSelectionService,
      renderer,
    };
  }

  private initialize(): void {
    injectBaseStyles();

    const options = this.ctx.options;
    const ctx = this.ctx;

    if (options.theme) {
      ctx.themeManager.applyTheme(options.theme, ctx.containerEl);
    } else {
      ctx.themeManager.applyTheme('light', ctx.containerEl);
    }

    if (options.selection) {
      ctx.rowSelectionEngine.configure(options.selection);
    }

    if (options.editing) {
      ctx.cellEditorEngine.configure(options.editing);
    }

    if (options.pagination) {
      ctx.paginationEngine.configure({
        enabled: options.pagination.enabled ?? false,
        page: options.pagination.page ?? 1,
        pageSize: options.pagination.pageSize ?? 50,
        pageSizeOptions: options.pagination.pageSizeOptions ?? [10, 25, 50, 100],
        serverSide: options.pagination.serverSide ?? false,
        totalRows: options.pagination.totalRows,
      });
    }

    if (this.normalizedColumns.length) {
      if (this.displayGroupEngine) {
        // Groups are a header concept — the body operates on leaf columns only.
        ctx.columnModel.initColumns(collectLeaves(this.normalizedColumns));
      } else if (this.columnGroupModel) {
        this.columnGroupModel.init(this.normalizedColumns);
        ctx.columnModel.initColumns(this.columnGroupModel.getAllLeaves());
      } else {
        ctx.columnModel.initColumns(this.normalizedColumns);
      }
    }

    if (options.columnState) {
      ctx.columnModel.applyColumnStates(options.columnState);
    }

    if (options.sortConfig?.length) {
      ctx.sortEngine.multiSort(options.sortConfig);
    }

    if (options.filterModel) {
      ctx.filterEngine.setFilterModel(options.filterModel);
    }

    if (options.grouping?.groupedColumns?.length) {
      for (const colId of options.grouping.groupedColumns) {
        ctx.groupingEngine.addGroupColumn(colId);
      }
    }

    ctx.masterDetailEngine.configure(options.masterDetail);
    ctx.treeDataService.configure(options.treeData);
    ctx.cellSelectionEngine.setTreeToggleHandler((row, direction) => this.handleTreeToggleKey(ctx, row, direction));

    ctx.renderer.mount();
    ctx.renderer.setParentApiForDetail(this.api);

    // Photon AI needs the live `GridApi` (to resolve columns and execute
    // commands), which does not exist until after `buildContext` returns —
    // so, like the Master/Detail parent-api wiring above, it is constructed
    // here rather than in `buildContext`.
    if (options.photonAI?.enabled) {
      this.photonAIService = new PhotonAIService(this.api);
      ctx.renderer.setPhotonAISubmitHandler((text) => this.photonAIService!.submit(text));
    }

    const rangeChartService = new RangeChartService(ctx);
    ctx.rangeChartService = rangeChartService;
    ctx.cellSelectionEngine.setChartOpenCallback((type) => {
      const ranges = ctx.store.get('cellRanges') as import('../types/grid.types').CellRange[];
      if (ranges.length === 0) return;
      rangeChartService.createRangeChart({
        cellRange: ranges[0],
        cellRanges: ranges,
        chartType: type as import('../chart/chart-panel').ChartPanelType,
      });
    });

    ctx.renderer.setSearchCallback((term) => this.api.setQuickFilter(term));

    // Wire column-group model into the public API if groups are present (legacy path)
    if (this.columnGroupModel) {
      this.api.setColumnGroupModel(this.columnGroupModel);
    }

    if (options.data?.length) {
      this.api.setData(options.data);
    }

    if (options.enableStateManagement && options.stateKey) {
      this.loadState(options.stateKey);
    }

    this.wireEventHandlers(ctx);
    this.wireEditing(ctx);

    ctx.eventBus.emit(GridEventType.READY, { api: this.api });
    options.onReady?.(this.api);
  }

  private wireEventHandlers(ctx: GridContext): void {
    // Bridge typed chart events to the GridOptions callbacks (mirrors onReady).
    const o = ctx.options;
    if (o.onChartCreated) ctx.eventBus.on(GridEventType.CHART_CREATED, (p) => o.onChartCreated!(p as import('../types/event.types').ChartCreatedEvent));
    if (o.onChartRangeSelectionChanged) ctx.eventBus.on(GridEventType.CHART_RANGE_SELECTION_CHANGED, (p) => o.onChartRangeSelectionChanged!(p as import('../types/event.types').ChartRangeSelectionChangedEvent));
    if (o.onChartOptionsChanged) ctx.eventBus.on(GridEventType.CHART_OPTIONS_CHANGED, (p) => o.onChartOptionsChanged!(p as import('../types/event.types').ChartOptionsChangedEvent));
    if (o.onChartDestroyed) ctx.eventBus.on(GridEventType.CHART_DESTROYED, (p) => o.onChartDestroyed!(p as import('../types/event.types').ChartDestroyedEvent));

    // Sort changed from header/menu clicks → snapshot positions then re-run pipeline
    ctx.eventBus.on(GridEventType.SORT_CHANGED, () => {
      const currentRows = ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) {
        ctx.renderer.captureRowAnimation(currentRows);
      }
      this.api.refresh();
    });

    // Filter changed → snapshot current row positions so the renderer can FLIP-animate
    // shifted rows and fade-in new rows.  refresh() is called separately by the
    // filter-panel callback, clearAllFilters(), setFilterModel(), etc.
    ctx.eventBus.on(GridEventType.FILTER_CHANGED, () => {
      const currentRows = ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) ctx.renderer.captureRowAnimation(currentRows, 'filter');
    });

    // Pagination nav from footer → re-run pipeline
    ctx.eventBus.on(GridEventType.PAGE_CHANGED, () => this.api.refresh());
    ctx.eventBus.on(GridEventType.PAGE_SIZE_CHANGED, () => this.api.refresh());

    // Group row toggle from body click → smooth expand/collapse animation + re-run pipeline.
    // Capturing row positions before the toggle lets RowAnimator FLIP-slide rows
    // that shift (filter-mode) and fade-in newly revealed child rows.
    ctx.eventBus.on(GridEventType.ROW_GROUP_OPENED, (payload: unknown) => {
      const p = payload as { groupKey: string };
      const currentRows = ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) ctx.renderer.captureRowAnimation(currentRows, 'filter');
      ctx.groupingEngine.toggleGroup(p.groupKey);
      this.api.refresh();
    });

    let prevGroupedIds: string[] = [];
    ctx.eventBus.on(GridEventType.COLUMN_GROUP_CHANGED, () => {
      const newIds: string[] = ctx.store.get('groupedColumnIds');
      for (const id of newIds) {
        if (!prevGroupedIds.includes(id)) ctx.columnModel.setColumnVisible(id, false);
      }
      for (const id of prevGroupedIds) {
        if (!newIds.includes(id)) ctx.columnModel.setColumnVisible(id, true);
      }
      prevGroupedIds = [...newIds];
      this.api.refresh();
    });

    // Master/Detail toggle click → capture positions so sibling rows FLIP-slide
    // into their new place (same mechanism as ROW_GROUP_OPENED above), flip
    // expanded state, then re-run the pipeline so `MasterDetailEngine.
    // injectDetailRows` inserts/removes the detail row on the next render.
    // The detail row's own grow/shrink + fade is handled separately by
    // `DetailRowRenderer`, since it has no panel DOM for `RowAnimator` to see.
    ctx.eventBus.on(GridEventType.ROW_DETAIL_TOGGLE_CLICKED, (payload: unknown) => {
      const p = payload as RowDetailToggleClickedEvent;
      const currentRows = ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) ctx.renderer.captureRowAnimation(currentRows, 'detail');
      // Collapsing: freeze the detail row's current position and start its
      // shrink/fade before the pipeline drops it — must happen before
      // `toggle()`, while `top`/`height` are still valid (see beginDetailCollapse).
      if (ctx.masterDetailEngine.isExpanded(p.row.nodeId)) {
        ctx.renderer.beginDetailCollapse(p.row.nodeId);
      }
      ctx.masterDetailEngine.toggle(p.row);
      this.api.refresh();
    });

    // Tree Data toggle click (from `applyTreeToggle`'s chevron button) →
    // same capture-then-toggle-then-refresh shape as the group/detail
    // handlers above, so expand/collapse gets the same FLIP row animation.
    ctx.eventBus.on(GridEventType.TREE_NODE_TOGGLE_CLICKED, (payload: unknown) => {
      const p = payload as TreeNodeToggleClickedPayload;
      const currentRows = ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) ctx.renderer.captureRowAnimation(currentRows, 'filter');
      ctx.treeExpansionService.toggle(p.row);
      this.api.refresh();
    });
  }

  /**
   * Backs `CellSelectionEngine.setTreeToggleHandler` — ArrowLeft collapses a
   * node (or jumps focus to its parent if already collapsed/leaf), ArrowRight
   * expands a node (or jumps focus to its first child if already expanded).
   * Returns `false` when Tree Data isn't enabled or the row has no children,
   * letting normal column navigation take over.
   */
  private handleTreeToggleKey(ctx: GridContext, row: RowNode, direction: 'left' | 'right'): boolean {
    if (!ctx.treeDataService.isEnabled()) return false;
    const hasChildren = row.hasChildren || row.children.length > 0;
    const rows = ctx.store.get('visibleRows') as RowNode[];
    const activeCell = ctx.store.get('activeCell');
    if (!activeCell) return false;

    if (direction === 'left') {
      if (hasChildren && ctx.treeExpansionService.isExpanded(row.nodeId)) {
        ctx.treeExpansionService.collapse(row);
        this.api.refresh();
        return true;
      }
      if (row.parent) {
        const parentIndex = rows.findIndex((r) => r.nodeId === row.parent!.nodeId);
        if (parentIndex !== -1) {
          ctx.cellSelectionEngine.startSelection(parentIndex, activeCell.colIndex);
          return true;
        }
      }
      return false;
    }

    // direction === 'right'
    if (!hasChildren) return false;
    if (!ctx.treeExpansionService.isExpanded(row.nodeId)) {
      if (!row.childrenLoaded && ctx.treeDataService.getConfig()?.lazyLoadChildren) {
        ctx.treeDataService.loadChildren(row.nodeId);
      }
      ctx.treeExpansionService.expand(row);
      this.api.refresh();
      return true;
    }
    const rowIndex = rows.findIndex((r) => r.nodeId === row.nodeId);
    const next = rowIndex !== -1 ? rows[rowIndex + 1] : undefined;
    if (next && next.level > row.level) {
      ctx.cellSelectionEngine.startSelection(rowIndex + 1, activeCell.colIndex);
      return true;
    }
    return false;
  }

  /**
   * Wires cell-editing activation and teardown based on the configured
   * `editing.singleClickEdit` flag.
   *
   * - `singleClickEdit: true`  → edit starts on the first click (CELL_CLICKED)
   * - `singleClickEdit: false` → edit starts on double-click (CELL_DOUBLE_CLICKED, default)
   *
   * On `CELL_EDIT_STOP` the cell's inner DOM is immediately restored with the
   * committed (or cancelled) value — no full grid refresh required.
   */
  private wireEditing(ctx: GridContext): void {
    if (ctx.options.editing?.mode === 'none') return;

    let activeInnerEl:  HTMLElement | null          = null;
    let activeRow:      RowNode     | null          = null;
    let activeColDef:   ColumnDef   | null          = null;
    let activeDropdown: CustomDropdownEditor | null = null;

    const startCellEdit = (payload: unknown) => {
      const p = payload as CellClickedEvent;
      const { row, colDef } = p;

      // Aggregate cells in group rows are read-only — never start an editor on them.
      if (row.type !== 'data') return;
      if (!colDef.editable) return;
      if (ctx.cellEditorEngine.isCellEditing(row.nodeId, colDef.colId)) return;

      // Find the cell and its inner element in the DOM
      const cellEl = ctx.containerEl.querySelector<HTMLElement>(
        `[data-node-id="${row.nodeId}"] [data-col-id="${colDef.colId}"]`,
      );
      if (!cellEl) return;

      const innerEl = cellEl.querySelector<HTMLElement>('.pg-cell__inner');
      if (!innerEl) return;

      // Commit any currently active edit; CELL_EDIT_STOP fires synchronously
      // and its handler restores that cell's DOM + clears activeDropdown
      if (ctx.cellEditorEngine.isEditing()) {
        ctx.cellEditorEngine.stopEditing(false);
      }

      activeInnerEl = innerEl;
      activeRow     = row;
      activeColDef  = colDef;

      innerEl.innerHTML = '';
      const started = ctx.cellEditorEngine.startEditing(row, colDef, cellEl);
      if (!started) {
        this.renderCellValue(innerEl, row, colDef);
        activeInnerEl = activeRow = activeColDef = null;
        return;
      }

      const value = row.data[colDef.field];

      // Column-supplied custom editor takes priority over every built-in editor.
      const customEditorFn = resolveColumnRenderer(colDef, 'editor');
      if (customEditorFn) {
        const params: EditorRendererParams = {
          value,
          row: row.data,
          colDef,
          rowIndex: row.rowIndex,
          onValueChange: (v) => ctx.cellEditorEngine.updateValue(v),
          onEditStop: () => ctx.cellEditorEngine.stopEditing(false),
        };
        const editorEl = customEditorFn(params);
        innerEl.appendChild(editorEl);
        const session = ctx.cellEditorEngine.getActiveSession();
        if (session) session.editorEl = editorEl;
      } else if (colDef.type === 'dropdown' || colDef.type === 'object') {
        // dropdown / object → custom accessible dropdown with virtual scrolling
        // Prefer explicit dropdownOptions; fall back to enumOptions (string array → ColumnDropdownOption[])
        const resolvedOpts: ColumnDropdownOption[] =
          colDef.dropdownOptions ??
          (colDef.enumOptions?.map((v) => ({ value: v, label: v })) ?? []);

        const renderOption = resolveColumnRenderer(colDef, 'option');

        activeDropdown = new CustomDropdownEditor(
          innerEl,
          cellEl,
          resolvedOpts,
          value,
          {
            onSelect: (opt) => {
              // For 'object' columns store the full option; for 'dropdown' store just the value
              ctx.cellEditorEngine.updateValue(
                colDef.type === 'object' ? opt : opt.value,
              );
            },
            onStop: (commit) => {
              // commit=true → stopEditing(false/cancel=false); commit=false → cancel=true
              ctx.cellEditorEngine.stopEditing(!commit);
            },
            onTab: handleTabEdit,
            ...(renderOption
              ? {
                  renderOption: (option, index, selected, highlighted) =>
                    renderOption({ option, index, selected, highlighted, colDef, api: this.api }),
                }
              : {}),
          },
        );
      } else {
        // All other types (text, number, date, time, boolean, array, …) use native editors
        ctx.cellEditorEngine.buildNativeEditor(colDef, value, innerEl);
      }
    };

    // Close the active editor immediately when a column is resized or moved so
    // the floating panel does not drift away from its anchor cell.
    const closeEditorOnColumnChange = () => {
      if (ctx.cellEditorEngine.isEditing()) ctx.cellEditorEngine.stopEditing(false);
    };
    ctx.eventBus.on(GridEventType.COLUMN_RESIZED, closeEditorOnColumnChange);
    ctx.eventBus.on(GridEventType.COLUMN_MOVED, closeEditorOnColumnChange);

    // On edit stop: destroy any open dropdown panel, then restore the cell's display value
    ctx.eventBus.on(GridEventType.CELL_EDIT_STOP, () => {
      activeDropdown?.destroy();
      activeDropdown = null;

      if (!activeInnerEl || !activeRow || !activeColDef) return;
      const innerEl = activeInnerEl;
      const row     = activeRow;
      const colDef  = activeColDef;
      activeInnerEl = activeRow = activeColDef = null;
      this.renderCellValue(innerEl, row, colDef);
    });

    // When a cell value actually changes (new !== old):
    //  1. Record the change in the undo/redo engine so Ctrl+Z can revert it.
    //  2. Re-run the sort/filter/group+aggregation pipeline so group header and
    //     footer rows immediately reflect the updated aggregate values.
    //  CELL_VALUE_CHANGED fires before CELL_EDIT_STOP, so scheduleRender() queues
    //  a next-frame repaint; by then CELL_EDIT_STOP has already restored the
    //  edited cell's DOM and group rows are rebuilt with the correct aggregations.
    ctx.eventBus.on(GridEventType.CELL_VALUE_CHANGED, (payload: unknown) => {
      const p = payload as CellValueChangedEvent;
      ctx.undoRedoEngine.record({
        type: 'edit',
        changes: [{
          nodeId: p.row.nodeId,
          field:  p.colDef.field,
          oldValue: p.oldValue,
          newValue: p.newValue,
        }],
      });
      this.api.refresh();
    });

    // Tab while editing → commit current edit, move to the adjacent cell, and
    // start editing it (dropdown cells open the dropdown directly).
    const handleTabEdit = (shiftKey: boolean): void => {
      const rows = ctx.store.get('visibleRows') as RowNode[];
      const cols = ctx.columnModel.getVisibleColumns();
      const activeCell = ctx.store.get('activeCell') as { rowIndex: number; colIndex: number } | null;
      if (!activeCell) return;

      ctx.cellSelectionEngine.moveActiveCell(
        0,
        shiftKey ? -1 : 1,
        rows.length,
        cols.length,
        false,
      );

      const newActive = ctx.store.get('activeCell') as { rowIndex: number; colIndex: number } | null;
      if (!newActive) return;

      const row = rows[newActive.rowIndex];
      const col  = cols[newActive.colIndex];
      if (!row || !col || !col.editable) return;

      startCellEdit({ row, colDef: col });
    };

    ctx.cellEditorEngine.setTabHandler(handleTabEdit);

    const trigger = ctx.options.editing?.singleClickEdit
      ? GridEventType.CELL_CLICKED
      : GridEventType.CELL_DOUBLE_CLICKED;

    ctx.eventBus.on(trigger, startCellEdit);

    // Enter key on a focused cell → start editing instead of navigating down.
    // Returns true to absorb the event; false to let the selection engine navigate.
    ctx.cellSelectionEngine.setEnterEditHandler((rowIndex, colIndex) => {
      if (ctx.cellEditorEngine.isEditing()) return false;
      const rows = ctx.store.get('visibleRows') as RowNode[];
      const cols = ctx.columnModel.getVisibleColumns();
      const row = rows[rowIndex];
      const colDef = cols[colIndex];
      // Group rows are read-only — fall through to down-navigation.
      if (!row || row.type !== 'data' || !colDef || !colDef.editable) return false;
      startCellEdit({ row, colDef });
      return true;
    });
  }

  /**
   * Re-renders the display content of a cell's inner element after an edit
   * session ends, using the current value from `row.data`.
   *
   * Rendering priority:
   * 1. `colDef.renderer.display` — custom renderer function (e.g. flag icons)
   * 2. `colDef.renderHtml`       — raw HTML string
   * 3. Built-in type rendering   — boolean, dropdown, array, formatted text
   */
  private renderCellValue(innerEl: HTMLElement, row: RowNode, colDef: ColumnDef): void {
    innerEl.innerHTML = '';
    const value = row.data[colDef.field];

    const displayFn = resolveColumnRenderer(colDef, 'display');
    if (displayFn) {
      const cols     = this.ctx.columnModel.getVisibleColumns();
      const colIndex = cols.findIndex((c) => c.colId === colDef.colId);
      const params: DisplayRendererParams = {
        value,
        rawValue: value,
        row: row.data,
        colDef,
        rowIndex: row.rowIndex,
        colIndex,
        api: this.api,
      };
      const rendered = displayFn(params);
      if (typeof rendered === 'string') {
        innerEl.innerHTML = rendered;
      } else {
        innerEl.appendChild(rendered);
      }
      return;
    }

    if (colDef.renderHtml) {
      innerEl.innerHTML = String(value ?? '');
      return;
    }

    const span  = document.createElement('span');
    span.className = 'pg-cell__value';

    switch (colDef.type) {
      case 'boolean': {
        span.textContent = value ? '✓' : '';
        span.classList.add(value ? 'pg-cell--bool-true' : 'pg-cell--bool-false');
        break;
      }

      case 'dropdown':
      case 'object': {
        const key = colDef.type === 'object' && typeof value === 'object' && value !== null
          ? (value as Record<string, unknown>)[colDef.objectValueKey ?? 'value']
          : value;
        const opt = colDef.dropdownOptions?.find((o) => String(o.value) === String(key ?? ''));
        if (opt?.color) {
          const badge = document.createElement('div');
          badge.className = 'pg-badge';
          badge.style.backgroundColor = opt.color + '20';
          badge.style.color = opt.color;
          badge.textContent = opt.label;
          span.appendChild(badge);
        } else {
          span.textContent = opt?.label ?? String(key ?? '');
        }
        break;
      }

      case 'array': {
        span.className = 'pg-cell__value pg-cell__value--tags';
        const vals = Array.isArray(value) ? value.map(String) : [];
        const visible = vals.slice(0, 3);
        for (const v of visible) {
          const opt = colDef.dropdownOptions?.find((o) => String(o.value) === v);
          const badge = document.createElement('div');
          badge.className = 'pg-badge';
          badge.textContent = opt?.label ?? v;
          if (opt?.color) {
            badge.style.backgroundColor = opt.color + '20';
            badge.style.color = opt.color;
          }
          span.appendChild(badge);
        }
        if (vals.length > visible.length) {
          const more = document.createElement('div');
          more.className = 'pg-badge pg-badge--overflow';
          more.textContent = `+${vals.length - visible.length}`;
          span.appendChild(more);
        }
        break;
      }

      default: {
        const formatted = formatValue(value, colDef, {
          locale: this.ctx.options.locale,
          dateFormat: this.ctx.options.dateFormat,
          timeZone: this.ctx.options.timeZone,
          currencySymbol: this.ctx.options.currencySymbol,
        });
        span.textContent = formatted || '—';
        span.title = formatted || '';
      }
    }

    innerEl.appendChild(span);
  }

  private loadState(stateKey: string): void {
    try {
      const raw = localStorage.getItem(`photon_grid_${stateKey}`);
      if (raw) {
        const state = JSON.parse(raw);
        this.api.applyGridState(state);
      }

      this.ctx.eventBus.on(GridEventType.COLUMNS_STATE_CHANGED, () => {
        const state = this.api.getGridState();
        localStorage.setItem(`photon_grid_${stateKey}`, JSON.stringify(state));
      });
    } catch {
      // localStorage may not be available
    }
  }

  destroy(): void {
    this.ctx.rangeChartService?.disposeAll();
    this.api.destroy();
  }
}
