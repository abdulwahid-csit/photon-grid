import type { GridOptions } from '../types/grid.types';
import type { GridContext } from './grid-context';
import type { RowNode } from '../types/row.types';
import type { ColumnDef, ColumnDropdownOption } from '../types/column.types';
import type { AvatarGroupRendererOptions, LongTextRendererOptions } from '../types/built-in-renderer.types';
import type { CellClickedEvent } from '../types/event.types';
import type { EditorRendererParams } from '../types/renderer.types';
import { injectBaseStyles } from '../styles/base-styles';
import { getCellValue, resolveFieldPath } from '../engines/editing/value-accessor';
import { resolveColumnRenderer, resolveDisplayRenderer } from '../renderer/renderer-resolver';
import { CellRenderer } from '../renderer/cell-renderer';
import { isBooleanCellEditable } from '../renderer/built-in/checkbox-element';
import { CELL_BUTTON_ATTR } from '../renderer/built-in/misc';
import { AVATAR_GROUP_MORE_ATTR, readAvatarGroupMembers } from '../renderer/built-in/avatar-group';
import {
  closeAvatarGroupOverlay,
  destroyAvatarGroupOverlay,
  openAvatarGroupOverlay,
} from '../renderer/built-in/avatar-group-overlay';
import {
  LONG_TEXT_TEXT_CLASS,
  LONG_TEXT_TOGGLE_ATTR,
  LONG_TEXT_VALUE_CLASS,
} from '../renderer/built-in/long-text';
import {
  closeLongTextOverlay,
  destroyLongTextOverlay,
  isLongTextOverlayOpenFor,
  openLongTextOverlay,
} from '../renderer/built-in/long-text-overlay';
import type { ActionsRendererOptions, CellActionController } from '../types/cell-action.types';
import {
  CELL_ACTION_ATTR,
  CELL_ACTION_MENU_ATTR,
} from '../renderer/built-in/actions/actions';
import {
  createActionParams,
  findAction,
  resolveAction,
  resolveActions,
  splitActions,
} from '../renderer/built-in/actions/action-resolver';
import { runCellAction, setActionBusy } from '../renderer/built-in/actions/action-executor';
import {
  closeActionsMenu,
  destroyActionsMenu,
  isActionsMenuOpenFor,
  openActionsMenu,
} from '../renderer/built-in/actions/actions-menu';
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
import { SummaryAggregationEngine } from '../summary/aggregation-engine';
import { SummaryModel } from '../summary/summary-model';
import { SummaryService } from '../summary/summary-service';
import { SummaryScope } from '../summary/summary.types';
import { ExportEngine } from '../engines/export/export-engine';
import { ImportEngine } from '../engines/import/import-engine';
import { ImportSourceType } from '../types/import.types';
import type { ImportCompleteEvent, ImportErrorEvent } from '../types/import.types';
import { ToastService } from '../toast/toast-service';
import { ClipboardEngine } from '../engines/clipboard/clipboard-engine';
import { DragDropEngine } from '../drag-drop/drag-drop-engine';
import { CellSelectionEngine } from '../cell-selection/cell-selection-engine';
import { ThemeManager } from '../theme/theme-manager';
import { PluginHost } from '../plugins/plugin-host';
import { DEFAULT_THEME_VARIANT, resolveVariantRowHeight } from '../types/theme.types';
import { IconRegistry } from '../icons/icon-registry';
import { IconRenderer } from '../icons/icon-renderer';
import { IconThemeController } from '../icons/icon-theme-controller';
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
import { PhotonAIAssistant } from '../photon-ai/photon-ai-assistant';
import { createAIProvider } from '../photon-ai/provider';
import { FormulaEngine } from '../formula/formula-engine';
import { GridFormulaAdapter } from './formula-grid-adapter-impl';
import { FormulaInitializer } from '../formula/formula-initializer';
import { AutoFillEngine } from '../autofill/autofill-engine';
import { ClientRowModel } from '../row-models/client-row-model';
import { ServerRowModel } from '../row-models/server/server-row-model';
import { InfiniteRowModel } from '../row-models/infinite/infinite-row-model';
import { PhotonThemeEngine } from '../photon-ai/theme/photon-theme-engine';

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
  /** New Display Group Engine â€” replaces `columnGroupModel` for group rendering. */
  private displayGroupEngine: DisplayGroupEngine | null = null;
  /** Set in `initialize` when `photonAI.enabled` â€” needs the live `GridApi`, so it cannot be built in `buildContext`. */
  private photonAIService: PhotonAIService | null = null;

  /**
   * Owns registered feature plugins. `null` unless `GridOptions.plugins` was
   * supplied, so a grid without plugins allocates nothing.
   */
  private pluginHost: PluginHost | null = null;

  /** The concrete formula adapter, retained so the clipboard/fill bridge can map ids â†” data-model indices. */
  private formulaAdapter!: GridFormulaAdapter;

  /**
   * The author-supplied columns fully normalized to `ColumnDef` (colId / header
   * / type defaults applied to leaves and groups). Computed once in
   * `buildContext` and reused by `initialize`, so the group tree and the flat
   * leaf list share the same generated colIds.
   */
  private normalizedColumns: ColumnDef[] = [];

  /**
   * Renders a cell's content after an edit commits.
   *
   * The same class the body renderer uses, so a just-edited cell is repainted
   * through the identical code path that drew it — see {@link renderCellValue}
   * for why that matters.
   */
  private readonly editCellRenderer = new CellRenderer();

  constructor(containerEl: HTMLElement, options: GridOptions) {
    this.ctx = this.buildContext(containerEl, options);
    this.api = new GridApi(this.ctx);
    this.initialize();
  }

  private buildContext(containerEl: HTMLElement, hostOptions: GridOptions): GridContext {
    // Body row height is the one density dimension a variant cannot express in
    // CSS (rows are positioned with inline `top`/`height`), so it is resolved
    // here, once, and every downstream reader picks it up from `ctx.options`.
    // The host's own value always wins; this only fills the default. A copy â€”
    // never a mutation of the caller's object.
    const options: GridOptions = {
      ...hostOptions,
      rowHeight: resolveVariantRowHeight(hostOptions.rowHeight, hostOptions.variant),
    };

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

    // ── Summary Rows ────────────────────────────────────────────────────────
    // Always constructed (an absent `summary` option yields an empty model,
    // which every consumer short-circuits on) so nothing downstream needs a
    // null check. The service's data port is an object literal rather than a
    // class: it is pure delegation onto the context, and keeping it here is what
    // lets `src/summary/` stay free of any grid-internal import.
    const summaryAggregationEngine = new SummaryAggregationEngine();
    summaryAggregationEngine.registerAll(options.summary?.aggregations);
    // `{ rows: [] }` rather than `{}` when the option is absent: an empty `rows`
    // array is an *explicit* empty summary, whereas an omitted one opts into
    // deriving a total row from `ColumnDef.showSummary`. A grid that has always
    // set `showSummary` (which did nothing before this feature existed) must not
    // sprout a summary band merely by upgrading — opting in is `summary: {}`.
    const summaryModel = new SummaryModel(options.summary ?? { rows: [] }, options.rowHeight);
    const summaryService = new SummaryService(summaryModel, summaryAggregationEngine, {
      getAllRows: () => store.get('allRows'),
      // `applyFilters` returns its input array unchanged when no filter is
      // active, so the common case costs one predicate call, not a copy.
      getFilteredRows: () =>
        filterEngine.applyFilters(store.get('allRows'), columnModel.getAllColumns()),
      getVisibleRows: () => store.get('visibleRows'),
      getSelectedRows: () => rowSelectionEngine.getSelectedRows(store.get('allRows')),
      getColumns: () => columnModel.getAllColumns(),
      getApi: () => this.api,
      getFormatOptions: () => ({
        locale: options.locale,
        dateFormat: options.dateFormat,
        timeZone: options.timeZone,
        currencySymbol: options.currencySymbol,
        currencyFormat: options.currencyFormat,
      }),
    });

    const exportEngine = new ExportEngine(eventBus);
    const clipboardEngine = new ClipboardEngine();
    // Import Engine mirrors ExportEngine (its inverse). It reads the clipboard
    // through the existing clipboard engine and writes into the grid only via
    // the public GridApi seams (wired as a sink in GridApi), so GridCore never
    // couples to any parser.
    const importEngine = new ImportEngine(eventBus, clipboardEngine);
    const dragDropEngine = new DragDropEngine(eventBus);
    const undoRedoEngine = new UndoRedoEngine();
    // Built before the engines that draw icon-bearing UI (the cell context menu
    // in particular), so every subsystem resolves glyphs through one registry
    // rather than embedding its own markup.
    const iconRegistry = new IconRegistry({ icons: options.icons });
    const iconRenderer = new IconRenderer(iconRegistry);
    const cellSelectionEngine = new CellSelectionEngine(
      store,
      eventBus,
      clipboardEngine,
      undoRedoEngine,
      iconRenderer,
    );
    const masterDetailEngine = new MasterDetailEngine(store, eventBus, rowModel);
    const treeExpansionService = new TreeExpansionService(store, eventBus);
    const treeDataService = new TreeDataService(store, eventBus, filterEngine, sortEngine, treeExpansionService);
    const treeSelectionService = new TreeSelectionService(rowSelectionEngine, treeDataService);
    const formulaAdapter = new GridFormulaAdapter(store, columnModel);
    const formulaEngine = new FormulaEngine(
      formulaAdapter,
      options.formula,
    );
    this.formulaAdapter = formulaAdapter;
    // Declarative-formula discovery (column-level + row-data), framework-independent.
    // `markFormulaCapable` flips `allowFormula` on the live column when a `=`-value
    // is auto-detected in a column that did not explicitly opt in.
    const formulaInitializer = new FormulaInitializer(formulaEngine, {
      autoDetectDataFormulas: options.formula?.autoDetectDataFormulas,
      markFormulaCapable: (colId: string) => {
        const col = columnModel.getColumn(colId);
        if (col) col.allowFormula = true;
      },
    });
    const autoFillEngine = new AutoFillEngine(options.autofill);
    const themeManager = new ThemeManager(eventBus);
    // Binds the icon layer to the theme layer: `applyVariant` fires the handler,
    // which swaps the registry's variant layer and repaints anything already
    // drawn. Registered here so the initial `GridOptions.variant` is honoured on
    // the very first render.
    const iconThemeController = new IconThemeController(
      iconRegistry,
      iconRenderer,
      containerEl,
      options.variantIcons,
    );
    themeManager.setVariantChangeHandler((variant) => iconThemeController.onVariant(variant));
    // Toast notifications — shares the grid's icon renderer; the layer mounts
    // into this grid's portal host so toasts overlay the page while still
    // wearing this grid's mode and variant. Inert until the first toast.
    const toastService = new ToastService(options.toast, { iconRenderer, owner: containerEl });
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

    // â”€â”€ Column-group wiring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Master/Detail wiring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Injects a factory rather than letting the renderer import `GridCore`
    // directly â€” `GridRenderer` must not depend on `GridCore` at the module
    // level, since `GridCore` already imports `GridRenderer`.
    renderer.setMasterDetailConfig(
      masterDetailEngine,
      (el, opts) => new GridCore(el, opts),
      iconRenderer,
      themeManager,
    );
    // Any refresh the engine itself requests (async `getDetailData` resolving,
    // or the auto-height measurement correcting a detail row's placeholder
    // height to its real content height) must ALSO be captured for animation â€”
    // otherwise the sibling-row slide from the initial toggle click is
    // immediately followed by an uncaptured, instantly-snapping correction,
    // which reads as a jerk right after the smooth expand.
    masterDetailEngine.setRefreshCallback(() => {
      const currentRows = store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) renderer.captureRowAnimation(currentRows, 'detail');
      this.api.refresh();
    });

    // â”€â”€ Tree Data wiring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Async lazy-load resolving, or a drag-to-reparent commit, both need a
    // pipeline refresh â€” same DI pattern as `masterDetailEngine` above.
    treeDataService.setRefreshCallback(() => this.api.refresh());
    // Drag-to-reparent is only meaningful for mutable hierarchy sources
    // (`parentId`/`childrenField`) â€” `getDataPath`/`custom` are derived and
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

    const ctx = {
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
      summaryModel,
      summaryService,
      summaryAggregationEngine,
      exportEngine,
      importEngine,
      toastService,
      clipboardEngine,
      dragDropEngine,
      cellSelectionEngine,
      themeManager,
      iconRegistry,
      iconRenderer,
      iconThemeController,
      chartEngine,
      undoRedoEngine,
      masterDetailEngine,
      treeDataService,
      treeExpansionService,
      treeSelectionService,
      formulaEngine,
      formulaInitializer,
      autoFillEngine,
      renderer,
    } as GridContext;

    // The row-model strategy captures `ctx`, so it is assigned after the context
    // literal is built. `applyPipeline()` delegates to it every refresh.
    ctx.rowModelStrategy =
      options.rowModel === 'server'
        ? new ServerRowModel(ctx, options.serverSide, options.serverSideDatasource)
        : options.rowModel === 'infinite'
          ? new InfiniteRowModel(ctx, options.infinite, options.serverSideDatasource)
          : new ClientRowModel(ctx);

    // Hand the renderer whatever the strategy needs from it: uniform-height
    // accounting, the painted row range (for demand-loading models), and
    // whether the row order may be rewritten client-side (managed row drag).
    ctx.renderer.setRowModelIntegration(
      ctx.rowModelStrategy.uniformRowHeight === true,
      ctx.rowModelStrategy.onRenderWindow
        ? (start, end) => ctx.rowModelStrategy.onRenderWindow!(start, end)
        : null,
      ctx.rowModelStrategy.rowOrderIsClientOwned === true,
    );

    // AI Theme Engine (gridApi.photonAI) â€” always present; reuses the configured
    // Photon AI provider (may be null â†’ LLM methods throw, offline methods work).
    ctx.photonThemeEngine = new PhotonThemeEngine(
      createAIProvider(options.photonAI?.provider),
      themeManager,
      containerEl,
      eventBus,
    );

    return ctx;
  }

  private initialize(): void {
    injectBaseStyles();

    const options = this.ctx.options;
    const ctx = this.ctx;

    // Theming resolves along two axes: `mode` (light/dark) drives the color
    // palette via token injection, `variant` (classic/ion/neon/…) layers a
    // cosmetic skin as a container class. The deprecated `theme` option is
    // normalized onto these axes only when neither is set explicitly.
    //
    // A grid that names neither gets `classic`, the default skin — which is why
    // the plain `applyMode` branch below applies it too. `variant: 'none'` is
    // the way to ask for the unskinned base styling; it is a real value here,
    // not the absence of one.
    if (options.mode || options.variant) {
      ctx.themeManager.applyMode(options.mode ?? 'light', ctx.containerEl);
      ctx.themeManager.applyVariant(options.variant ?? DEFAULT_THEME_VARIANT, ctx.containerEl);
    } else if (options.theme) {
      // A legacy named theme carries its own complete look; layering the
      // default skin over it would re-pitch colours the host explicitly chose.
      ctx.themeManager.applyTheme(options.theme, ctx.containerEl);
    } else {
      ctx.themeManager.applyMode('light', ctx.containerEl);
      ctx.themeManager.applyVariant(DEFAULT_THEME_VARIANT, ctx.containerEl);
    }

    if (options.selection) {
      ctx.rowSelectionEngine.configure(options.selection);
      ctx.cellSelectionEngine.setSerialColumnSelection(
        !!options.selection.serialColumnSelection && options.selection.mode !== 'none',
      );
    }

    // Cell / range selection. Deliberately outside the `options.selection`
    // block above — these are top-level `GridOptions` flags and must apply even
    // when no `selection` object is supplied. `!== false` keeps both on by
    // default: they were read nowhere before, so every existing grid has had
    // selection enabled regardless of what it passed, and defaulting them off
    // would silently disable the feature for everyone.
    ctx.cellSelectionEngine.configureSelection({
      cellSelection: options.enableCellSelection !== false,
      rangeSelection: options.enableRangeSelection !== false,
      clearFocusOnClickOutside: options.clearCellSelectionOnClickOutside !== false,
    });

    if (options.editing) {
      ctx.cellEditorEngine.configure(options.editing);
    }

    if (options.pagination) {
      ctx.paginationEngine.configure({
        enabled: options.pagination.enabled ?? false,
        page: options.pagination.page ?? 1,
        pageSize: options.pagination.pageSize ?? 50,
        pageSizeOptions: options.pagination.pageSizeOptions ?? [10, 25, 50, 100],
        // Both server-backed models paginate remotely: the engine must not
        // slice locally â€” the datasource decides which rows exist.
        serverSide: options.rowModel === 'server' || options.rowModel === 'infinite'
          ? true
          : (options.pagination.serverSide ?? false),
        totalRows: options.pagination.totalRows,
      });
    }

    if (this.normalizedColumns.length) {
      if (this.displayGroupEngine) {
        // Groups are a header concept â€” the body operates on leaf columns only.
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

    // Enable the top-right Theme Manager launcher before mount() (it is built
    // with the tools strip). The theme API is resolved lazily via the live api.
    const themeManagerEnabled =
      options.themeManager === true || (typeof options.themeManager === 'object' && options.themeManager.enabled);
    ctx.renderer.setThemeManager(() => this.api.photonAI, !!themeManagerEnabled, () => ctx.toastService);

    // Summary Rows: hand the renderer the definition/value store before mount so
    // the very first paint can already reserve the bands' height. The model is
    // handed over unconditionally — it is empty for grids that define no summary
    // rows, and the render loop short-circuits on that.
    ctx.renderer.setSummaryModel(ctx.summaryModel);

    ctx.renderer.mount();
    ctx.renderer.setParentApiForDetail(this.api);

    // Photon AI needs the live `GridApi` (to resolve columns and execute
    // commands), which does not exist until after `buildContext` returns â€”
    // so, like the Master/Detail parent-api wiring above, it is constructed
    // here rather than in `buildContext`.
    if (options.photonAI?.enabled) {
      const provider = createAIProvider(options.photonAI.provider);
      this.photonAIService = new PhotonAIService(
        this.api,
        undefined,
        provider,
        options.photonAI.provider?.systemInstruction,
      );
      ctx.renderer.setPhotonAISubmitHandler((text) => this.photonAIService!.submit(text));
      // When a generative provider is configured, route the panel through the
      // async streaming path; the deterministic sync handler above stays wired
      // as the fallback used whenever no provider is present.
      if (provider) {
        // Panel dispatch chain, most specific first. Each stage inspects the
        // message and either claims it (`handled`) or passes it on, so adding a
        // capability means adding a link here rather than editing a branch:
        //
        //   1. Theme engine  â€” styling requests, applied live to the grid.
        //   2. Assistant     â€” questions: docs/examples, code generation, data
        //                      analysis, and configuration diagnostics.
        //   3. Command AI    â€” the fallback: anything that operates the grid.
        const assistant = new PhotonAIAssistant(
          this.api,
          options,
          provider,
          ctx.photonThemeEngine.getRegistry(),
        );
        ctx.renderer.setPhotonAIAsyncSubmitHandler(async (text, signal) => {
          const themed = await ctx.photonThemeEngine.handlePanelCommand(text, signal);
          if (themed.handled) return { success: true, message: themed.message };

          const answered = await assistant.handle(text, signal);
          if (answered.handled) return { success: answered.success !== false, message: answered.message };

          return this.photonAIService!.submitAsync(text, signal);
        });
      }
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

    // Row context menu: hand the engine its configuration plus the icon
    // registry and public API its custom items need. Items are rendered on each
    // open, so a later `setRowMenuConfig` call takes effect immediately.
    ctx.cellSelectionEngine.setRowMenuConfig(ctx.options.rowMenu, ctx.iconRenderer, this.api);

    // Import wiring: the Import menu is pure UI â€” GridCore owns the bridge to the
    // engine (via the public GridApi), and fans the engine's completion/error
    // events out to the user-supplied config callbacks.
    if (options.import?.enabled) {
      ctx.renderer.setImportHandlers(
        (source, file) => {
          const run =
            source === ImportSourceType.Excel
              ? this.api.importExcel(file)
              : source === ImportSourceType.Tsv
                ? this.api.importTsv(file)
                : this.api.importCsv(file);
          // Errors are already reported via IMPORT_ERROR + onError; swallow the
          // rejection here so it never surfaces as an unhandled promise.
          void run.catch(() => undefined);
        },
        () => {
          void this.api.importFromClipboard().catch(() => undefined);
        },
      );

      const cfg = options.import;
      // Surface import outcomes as toasts (in addition to any user callbacks).
      ctx.eventBus.on<ImportCompleteEvent>(GridEventType.IMPORT_COMPLETE, (e) => {
        const n = e.result.rowCount;
        ctx.toastService.success(`Imported ${n} row${n === 1 ? '' : 's'} from ${e.source.toUpperCase()}.`);
        cfg.onComplete?.(e.result);
      });
      ctx.eventBus.on<ImportErrorEvent>(GridEventType.IMPORT_ERROR, (e) => {
        ctx.toastService.error(e.message, { title: 'Import failed', duration: 8000 });
        cfg.onError?.(e);
      });
    }

    // Wire column-group model into the public API if groups are present (legacy path)
    if (this.columnGroupModel) {
      this.api.setColumnGroupModel(this.columnGroupModel);
    }

    if (options.rowModel === 'server' || options.rowModel === 'infinite') {
      // Both server-backed models ignore any static `options.data` â€” the
      // datasource is the single source of truth. Kick off the initial load:
      // the first page for `'server'`, the first window for `'infinite'`.
      ctx.rowModelStrategy.start?.();
    } else if (options.data?.length) {
      this.api.setData(options.data);
    }

    if (options.enableStateManagement && options.stateKey) {
      this.loadState(options.stateKey);
    }

    this.wireEventHandlers(ctx);
    this.wireEditing(ctx);

    // Plugins install last, but before READY. Three reasons this position is
    // load-bearing:
    //   • The DOM is mounted, columns are initialized and data is loaded, so a
    //     plugin's `init` sees a fully built grid rather than a half-built one.
    //   • Core's own bus handlers are registered first, so for a given event
    //     they keep the earlier tie-break slot and a plugin observes rather
    //     than pre-empts.
    //   • Firing before READY means a host's `onReady` already sees whatever
    //     the plugin installed.
    if (options.plugins?.length) {
      this.pluginHost = new PluginHost(ctx, this.api, options.plugins, {
        mountPluginLayer: (name, opts) => ctx.renderer.mountPluginLayer(name, opts),
        readScrollMetrics: () => ctx.renderer.readScrollMetrics(),
        scheduleRender: () => ctx.renderer.scheduleRender(),
        setPluginContentWidth: (px) => ctx.renderer.setPluginContentWidth(px),
        addScrollListener: (cb) => ctx.renderer.addPluginScrollListener(cb),
      });
      // Attached before `initAll` because a plugin may call `requestRender()`
      // from its own `init`, and the very next frame must already dispatch to it.
      ctx.renderer.setPluginHost(this.pluginHost);
      this.pluginHost.initAll();
    }

    ctx.eventBus.emit(GridEventType.READY, { api: this.api });
    options.onReady?.(this.api);
  }

  /**
   * Subscribes the Summary Rows feature to the changes that can move its values
   * but do **not** run the row pipeline.
   *
   * The pipeline path is already covered — `GridApi.applyPipeline` recomputes
   * summaries after every refresh, which catches data, filter, sort, group and
   * pagination changes. Two things bypass it:
   *
   * - **Cell edits**, which patch cells in place rather than rebuilding rows.
   * - **Selection changes**, which never touch the displayed row set at all.
   *
   * Selection is subscribed only when a summary row actually scopes to it, so
   * the overwhelmingly common case (no `Selected` scope) pays nothing per click.
   * The check is deferred into the handler because `setSummaryRows` can
   * introduce such a row long after wiring.
   */
  private wireSummary(ctx: GridContext): void {
    const autoRefresh = ctx.options.summary?.autoRefresh !== false;
    if (!autoRefresh) return;

    ctx.eventBus.on(GridEventType.CELL_VALUE_CHANGED, () => {
      if (!ctx.summaryModel.isEmpty()) this.api.refreshSummary();
    });

    const onSelectionChanged = (): void => {
      const usesSelection = ctx.summaryModel
        .getRows()
        .some((row) => row.scope === SummaryScope.Selected);
      if (usesSelection) this.api.refreshSummary();
    };

    ctx.eventBus.on(GridEventType.ROW_SELECTED, onSelectionChanged);
    ctx.eventBus.on(GridEventType.ROW_DESELECTED, onSelectionChanged);
    ctx.eventBus.on(GridEventType.ALL_ROWS_SELECTED, onSelectionChanged);
    ctx.eventBus.on(GridEventType.ALL_ROWS_DESELECTED, onSelectionChanged);
  }

  private wireEventHandlers(ctx: GridContext): void {
    this.wireSummary(ctx);

    // Bridge typed chart events to the GridOptions callbacks (mirrors onReady).
    const o = ctx.options;
    if (o.onChartCreated) ctx.eventBus.on(GridEventType.CHART_CREATED, (p) => o.onChartCreated!(p as import('../types/event.types').ChartCreatedEvent));
    if (o.onChartRangeSelectionChanged) ctx.eventBus.on(GridEventType.CHART_RANGE_SELECTION_CHANGED, (p) => o.onChartRangeSelectionChanged!(p as import('../types/event.types').ChartRangeSelectionChangedEvent));
    if (o.onChartOptionsChanged) ctx.eventBus.on(GridEventType.CHART_OPTIONS_CHANGED, (p) => o.onChartOptionsChanged!(p as import('../types/event.types').ChartOptionsChangedEvent));
    if (o.onChartDestroyed) ctx.eventBus.on(GridEventType.CHART_DESTROYED, (p) => o.onChartDestroyed!(p as import('../types/event.types').ChartDestroyedEvent));

    // Sort changed from header/menu clicks â†’ snapshot positions then re-run pipeline
    ctx.eventBus.on(GridEventType.SORT_CHANGED, () => {
      const currentRows = ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) {
        ctx.renderer.captureRowAnimation(currentRows);
      }
      this.api.refresh();
    });

    // Filter changed â†’ snapshot current row positions so the renderer can FLIP-animate
    // shifted rows and fade-in new rows.  refresh() is called separately by the
    // filter-panel callback, clearAllFilters(), setFilterModel(), etc.
    ctx.eventBus.on(GridEventType.FILTER_CHANGED, () => {
      const currentRows = ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) ctx.renderer.captureRowAnimation(currentRows, 'filter');
    });

    // Pagination nav from footer â†’ re-run pipeline
    ctx.eventBus.on(GridEventType.PAGE_CHANGED, () => this.api.refresh());
    ctx.eventBus.on(GridEventType.PAGE_SIZE_CHANGED, () => this.api.refresh());

    // Group row toggle from body click â†’ smooth expand/collapse animation + re-run pipeline.
    // Capturing row positions before the toggle lets RowAnimator FLIP-slide rows
    // that shift (filter-mode) and fade-in newly revealed child rows.
    ctx.eventBus.on(GridEventType.ROW_GROUP_OPENED, (payload: unknown) => {
      const p = payload as { groupKey: string };
      const currentRows = ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) ctx.renderer.captureRowAnimation(currentRows, 'group');
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

    // Master/Detail toggle click â†’ capture positions so sibling rows FLIP-slide
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
      // shrink/fade before the pipeline drops it â€” must happen before
      // `toggle()`, while `top`/`height` are still valid (see beginDetailCollapse).
      if (ctx.masterDetailEngine.isExpanded(p.row.nodeId)) {
        ctx.renderer.beginDetailCollapse(p.row.nodeId);
      }
      ctx.masterDetailEngine.toggle(p.row);
      this.api.refresh();
    });

    // Tree Data toggle click (from `applyTreeToggle`'s chevron button) â†’
    // same capture-then-toggle-then-refresh shape as the group/detail
    // handlers above, so expand/collapse gets the same FLIP row animation.
    ctx.eventBus.on(GridEventType.TREE_NODE_TOGGLE_CLICKED, (payload: unknown) => {
      const p = payload as TreeNodeToggleClickedPayload;
      const currentRows = ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) ctx.renderer.captureRowAnimation(currentRows, 'group');
      ctx.treeExpansionService.toggle(p.row);
      this.api.refresh();
    });
  }

  /**
   * Backs `CellSelectionEngine.setTreeToggleHandler` â€” ArrowLeft collapses a
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
   * - `singleClickEdit: true`  â†’ edit starts on the first click (CELL_CLICKED)
   * - `singleClickEdit: false` â†’ edit starts on double-click (CELL_DOUBLE_CLICKED, default)
   *
   * On `CELL_EDIT_STOP` the cell's inner DOM is immediately restored with the
   * committed (or cancelled) value â€” no full grid refresh required.
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

      // Aggregate cells in group rows are read-only â€” never start an editor on them.
      if (row.type !== 'data') return;
      if (!colDef.editable) return;
      // A boolean cell's checkbox *is* its editor: it is rendered live in the
      // cell and toggles on click (see `wireBooleanCellToggle`). Opening a second
      // checkbox on top of it would replace the one the user just clicked and
      // swallow the gesture that opened it.
      if (colDef.type === 'boolean') return;
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

      const value = getCellValue(row.data, colDef, this.api);
      // When the cell holds a formula, the editor shows its source (`=A1+B1`)
      // rather than the computed value; committing re-stores/updates the formula.
      const editValue = colDef.allowFormula && ctx.formulaEngine.isEnabled()
        ? ctx.formulaEngine.getFormula(row.nodeId, colDef.colId) ?? value
        : value;

      // Column-supplied custom editor takes priority over every built-in editor.
      const customEditorFn = resolveColumnRenderer(colDef, 'editor');
      if (customEditorFn) {
        const params: EditorRendererParams = {
          value: editValue,
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
      } else if (colDef.allowFormula && ctx.formulaEngine.isEnabled()) {
        // Formula-enabled columns always use a text editor so the user can type a
        // leading `=` (even on a number column) and see an existing formula's
        // source. Literal entries are still parsed against the column's real type
        // at commit time (stopEditing reads the original colDef).
        ctx.cellEditorEngine.buildNativeEditor({ ...colDef, type: 'string' }, editValue, innerEl);
      } else if (colDef.type === 'dropdown' || colDef.type === 'object') {
        // dropdown / object â†’ custom accessible dropdown with virtual scrolling
        // Prefer explicit dropdownOptions; fall back to enumOptions (string array â†’ ColumnDropdownOption[])
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
              // commit=true â†’ stopEditing(false/cancel=false); commit=false â†’ cancel=true
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
        // All other types (text, number, date, time, boolean, array, â€¦) use native editors
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
          colId:  p.colDef.colId,
          oldValue: p.oldValue,
          newValue: p.newValue,
        }],
      });
      // A literal edit on a formula-enabled column drops any prior formula on the
      // cell, then feeds the change through the engine so dependent formula cells
      // (and volatiles) recompute before the repaint.
      if (ctx.formulaEngine.isEnabled()) {
        if (p.colDef.allowFormula) {
          ctx.formulaEngine.clearFormula(p.row.nodeId, p.colDef.colId);
        }
        const { changedNodeIds } = ctx.formulaEngine.onCellsChanged([
          { nodeId: p.row.nodeId, colId: p.colDef.colId },
        ]);
        // Dependent formula cells (e.g. `C1 = A1 + B1` when A1 changes) recompute
        // by mutating their row *data* in place â€” the owning `RowNode` reference is
        // unchanged. `refresh()`'s cached-row path (`updatePanelRow`) only re-stamps
        // row-level attributes, never cell content, so those dependents would keep
        // their stale DOM. Evict exactly the changed rows so their new values
        // repaint on the next frame.
        if (changedNodeIds.size > 0) {
          ctx.renderer.invalidateBodyRowsByIds(new Set(changedNodeIds));
        }
      }
      this.api.refresh();
    });

    // Formula commit: a `=`-prefixed entry on a formula-enabled column is stored
    // as a formula. A fresh row-data object is installed *before* setFormula so
    // the engine's write of the computed value lands on the new reference
    // (preserving the immutable-update contract), then dependents recompute.
    ctx.cellEditorEngine.setFormulaCommitHandler((rowNode: RowNode, colDef: ColumnDef, source: string): boolean => {
      const oldValue = getCellValue(rowNode.data, colDef, this.api);
      const oldFormula = ctx.formulaEngine.getFormula(rowNode.nodeId, colDef.colId);
      const nextData = { ...rowNode.data };
      rowNode.data = nextData;
      const { changedNodeIds } = ctx.formulaEngine.setFormula(rowNode.nodeId, colDef.colId, source);
      const newValue = getCellValue(rowNode.data, colDef, this.api);
      ctx.undoRedoEngine.record({
        type: 'edit',
        changes: [{
          nodeId: rowNode.nodeId,
          field: colDef.field,
          colId: colDef.colId,
          oldValue,
          newValue,
          oldFormula,
          newFormula: source,
        }],
      });
      // The committed cell plus every downstream dependent recomputed in place
      // (row data mutated, `RowNode` reference kept), which `refresh()`'s cached-row
      // path does not repaint. Evict the changed rows so their values render.
      if (changedNodeIds.size > 0) {
        ctx.renderer.invalidateBodyRowsByIds(new Set(changedNodeIds));
      }
      this.api.refresh();
      return true;
    });

    // Wire the formula bridge so copy/paste/fill and undo/redo become
    // formula-aware (transpose relative refs, recompute dependents). A no-op when
    // the engine is disabled.
    ctx.cellSelectionEngine.setFormulaBridge({
      isEnabled: () => ctx.formulaEngine.isEnabled(),
      allowsFormula: (colId) => ctx.columnModel.getColumn(colId)?.allowFormula === true,
      getFormula: (nodeId, colId) => ctx.formulaEngine.getFormula(nodeId, colId),
      setFormula: (nodeId, colId, src) => ctx.formulaEngine.setFormula(nodeId, colId, src).changedNodeIds,
      clearFormula: (nodeId, colId) => ctx.formulaEngine.removeFormula(nodeId, colId).changedNodeIds,
      transpose: (src, dRow, dCol) => ctx.formulaEngine.transposeFormula(src, { deltaRow: dRow, deltaCol: dCol }),
      dataRowIndex: (nodeId) => this.formulaAdapter.getRowIndex(nodeId),
      dataColIndex: (colId) => this.formulaAdapter.getColIndex(colId),
      onCellsChanged: (cells) => ctx.formulaEngine.onCellsChanged(cells).changedNodeIds,
    });

    // Intelligent drag-to-fill: the fill handle asks this engine to continue the
    // source pattern instead of copying. A no-op fallback to copy/cycle when the
    // engine is disabled via `GridOptions.autofill`.
    ctx.cellSelectionEngine.setAutoFillEngine(ctx.autoFillEngine);

    // Tab while editing â†’ commit current edit, move to the adjacent cell, and
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

    this.wireBooleanCellToggle(ctx);
    this.wireCellButtons(ctx);
    this.wireCellActions(ctx);
    this.wireAvatarGroups(ctx);
    this.wireLongText(ctx);

    // Enter key on a focused cell â†’ start editing instead of navigating down.
    // Returns true to absorb the event; false to let the selection engine navigate.
    ctx.cellSelectionEngine.setEnterEditHandler((rowIndex, colIndex) => {
      if (ctx.cellEditorEngine.isEditing()) return false;
      const rows = ctx.store.get('visibleRows') as RowNode[];
      const cols = ctx.columnModel.getVisibleColumns();
      const row = rows[rowIndex];
      const colDef = cols[colIndex];
      // Group rows are read-only â€” fall through to down-navigation.
      if (!row || row.type !== 'data' || !colDef || !colDef.editable) return false;
      startCellEdit({ row, colDef });
      return true;
    });
  }

  /**
   * Wires the inline checkbox a `boolean` column renders in every one of its
   * cells.
   *
   * ### Why one delegated listener
   * A viewport can hold thousands of boolean cells, and every cell rebuild
   * (scroll, sort, column reorder, a Virtual DOM content patch) would have to
   * re-attach a per-cell listener. One listener on the grid root survives all of
   * it and costs nothing per cell â€” the same reason row clicks are delegated.
   *
   * ### Why the commit goes through the editor engine
   * A toggle is an edit. Routing it through `startEditing` â†’ `updateValue` â†’
   * `stopEditing` means it gets the identical treatment a typed edit gets:
   * `editable`/`locked`/`editing.mode` enforcement, `parseValue` +
   * `validateValue`, a column `valueSetter`, the immutable row-data swap,
   * `CELL_EDIT_START` / `CELL_VALUE_CHANGED` / `CELL_EDIT_STOP`, and the commit
   * flash. Writing `row.data` here instead would be a second, quietly divergent
   * commit path.
   *
   * The checkbox is re-synced from the model afterwards, so a rejected edit
   * (failed validation, a `valueSetter` that declined) snaps the box back
   * instead of leaving the DOM claiming a value the row does not hold.
   */
  /**
   * Wires the buttons a `button` cell renderer draws.
   *
   * One delegated listener on the grid root, for the same reason the boolean
   * checkbox uses one: a viewport can hold a button in every visible row, and
   * every cell rebuild would otherwise have to re-attach a handler.
   *
   * The grid does not act on the click — it reports it as
   * `CELL_BUTTON_CLICKED` and stops. A button column is an application action,
   * and only the application knows what it means.
   */
  /**
   * Wires the `+N` counter an `avatarGroup` cell draws.
   *
   * One delegated listener on the grid root, like the cell button and the
   * boolean checkbox — a viewport can hold a counter in every visible row.
   *
   * The roster is resolved at click time rather than being built with the cell.
   * A team of two hundred renders three avatars and a counter; materialising
   * two hundred rows per cell up front, for a panel that is almost never
   * opened, is the cost this design exists to avoid.
   */
  private wireAvatarGroups(ctx: GridContext): void {
    ctx.containerEl.addEventListener('click', (e: MouseEvent) => {
      const target = e.target;
      // `Element`, not `HTMLElement`: these controls hold an icon, and an
      // `<svg>` (or a `<path>` inside it) is an SVGElement — which would fail an
      // HTMLElement test and silently swallow every press that landed on the
      // glyph rather than the padding around it. `closest` is on Element.
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>(`[${AVATAR_GROUP_MORE_ATTR}]`);
      if (!trigger || (trigger as HTMLButtonElement).disabled) return;

      // Master/Detail nests a whole GridCore inside this one's DOM, so this
      // listener also sees a nested grid's counters.
      const ownerWrapper = trigger.closest<HTMLElement>('[data-photon-grid-id]');
      if (!ownerWrapper || ownerWrapper.parentElement !== ctx.containerEl) return;

      const cellEl = trigger.closest<HTMLElement>('[data-col-id]');
      const rowEl = trigger.closest<HTMLElement>('[data-node-id]');
      const colId = cellEl?.getAttribute('data-col-id');
      const nodeId = rowEl?.getAttribute('data-node-id');
      if (!colId || !nodeId) return;

      const colDef = ctx.columnModel.getColumn(colId);
      const row = this.api.getRowNode(nodeId);
      if (!colDef || !row) return;

      // Pressing the counter is a deliberate action, not a request to select
      // the cell around it or open its editor.
      e.stopPropagation();

      // Toggle: a second click on the same counter closes the panel it opened.
      if (trigger.getAttribute('aria-expanded') === 'true') {
        closeAvatarGroupOverlay();
        return;
      }

      const options = (resolveDisplayRenderer(colDef).options ?? {}) as AvatarGroupRendererOptions;
      const members = readAvatarGroupMembers(getCellValue(row.data, colDef, this.api), options);

      openAvatarGroupOverlay({
        trigger,
        members,
        options,
        onSelect: (member, event) => {
          ctx.eventBus.emit(GridEventType.AVATAR_GROUP_MEMBER_CLICKED, {
            member,
            row,
            colDef,
            rowIndex: row.rowIndex,
            event,
          });
        },
      });
    });
  }

  /**
   * Wires the expand control a `longText` cell draws.
   *
   * One delegated listener on the grid root, like the cell button and the
   * avatar group's counter — a viewport can hold a long-text cell in every
   * visible row.
   *
   * The text is read out of the cell's own DOM rather than re-resolved from the
   * row. The renderer already wrote the untruncated value there (the truncation
   * is CSS), so re-deriving it here would mean re-running the column's
   * `valueFormatter` for a second, quietly divergent copy of the same string.
   */
  private wireLongText(ctx: GridContext): void {
    // `pointerdown`, not `click`. A click only fires when press and release land
    // on the *same* element, and this control sits in a cell the grid may
    // re-render, re-position or recycle in between — so a click-driven toggle
    // fails intermittently and for reasons the user cannot see. On pointerdown
    // the hit test has just succeeded, which is the only moment the element is
    // guaranteed to be the one under the cursor. The fill handle and cell
    // selection are wired the same way, for the same reason.
    ctx.containerEl.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target;
      // `Element`, not `HTMLElement`: these controls hold an icon, and an
      // `<svg>` (or a `<path>` inside it) is an SVGElement — which would fail an
      // HTMLElement test and silently swallow every press that landed on the
      // glyph rather than the padding around it. `closest` is on Element.
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>(`[${LONG_TEXT_TOGGLE_ATTR}]`);
      if (!trigger || (trigger as HTMLButtonElement).disabled) return;

      // Master/Detail nests a whole GridCore inside this one's DOM, so this
      // listener also sees a nested grid's toggles.
      const ownerWrapper = trigger.closest<HTMLElement>('[data-photon-grid-id]');
      if (!ownerWrapper || ownerWrapper.parentElement !== ctx.containerEl) return;

      const cellEl = trigger.closest<HTMLElement>('[data-col-id]');
      const rowEl = trigger.closest<HTMLElement>('[data-node-id]');
      const colId = cellEl?.getAttribute('data-col-id');
      const nodeId = rowEl?.getAttribute('data-node-id');
      if (!colId || !nodeId) return;

      const colDef = ctx.columnModel.getColumn(colId);
      const row = this.api.getRowNode(nodeId);
      if (!colDef || !row) return;

      // Pressing the toggle is a deliberate action, not a request to select the
      // cell around it, focus it, or start a text selection.
      e.preventDefault();
      e.stopPropagation();

      // Toggle: a second press on the same control closes the panel it opened.
      // The overlay's own document-level dismissal ignores presses on the active
      // trigger precisely so this stays the one place that decides.
      if (isLongTextOverlayOpenFor(trigger)) {
        closeLongTextOverlay();
        return;
      }

      const text =
        trigger
          .closest<HTMLElement>(`.${LONG_TEXT_VALUE_CLASS}`)
          ?.querySelector<HTMLElement>(`.${LONG_TEXT_TEXT_CLASS}`)?.textContent ?? '';
      if (text === '') return;

      const options = (resolveDisplayRenderer(colDef).options ?? {}) as LongTextRendererOptions;

      openLongTextOverlay({
        trigger,
        // The cell, so the panel lines up with the text it came from rather
        // than with the 16px button in its corner.
        anchor: cellEl ?? trigger,
        text,
        options,
      });

      ctx.eventBus.emit(GridEventType.CELL_TEXT_EXPANDED, {
        text,
        action: trigger.getAttribute(LONG_TEXT_TOGGLE_ATTR) ?? '',
        row,
        colDef,
        rowIndex: row.rowIndex,
        event: e,
      });
    });
  }

  /**
   * Wires the controls an `actions` cell draws.
   *
   * One delegated listener on the grid root, like the cell button and the
   * avatar group's counter — a viewport can hold an actions cell in every
   * visible row, and every cell rebuild would otherwise have to re-attach a
   * handler per action.
   *
   * ### Why the declaration is re-resolved on every click
   * The cell carries only an action's `id`. The definition is looked up again
   * here and every predicate re-run against *current* row data, so a button
   * that became invisible or disabled between paint and click cannot be
   * invoked. A callback parked on the element would also be retained for as
   * long as that element lives, which in a recycled viewport is unbounded.
   *
   * Overflowed actions are resolved the same way when the menu opens, so the
   * two entry points cannot disagree about what a row offers.
   */
  private wireCellActions(ctx: GridContext): void {
    ctx.containerEl.addEventListener('click', (e: MouseEvent) => {
      const target = e.target;
      // `Element`, not `HTMLElement`: these controls hold an icon, and an
      // `<svg>` (or a `<path>` inside it) is an SVGElement — which would fail an
      // HTMLElement test and silently swallow every press that landed on the
      // glyph rather than the padding around it. `closest` is on Element.
      if (!(target instanceof Element)) return;

      const trigger = target.closest<HTMLElement>(
        `[${CELL_ACTION_ATTR}], [${CELL_ACTION_MENU_ATTR}]`,
      );
      if (!trigger || (trigger as HTMLButtonElement).disabled) return;

      // Master/Detail nests a whole GridCore inside this one's DOM, so this
      // listener also sees a nested grid's action cells.
      const ownerWrapper = trigger.closest<HTMLElement>('[data-photon-grid-id]');
      if (!ownerWrapper || ownerWrapper.parentElement !== ctx.containerEl) return;

      const cellEl = trigger.closest<HTMLElement>('[data-col-id]');
      const rowEl = trigger.closest<HTMLElement>('[data-node-id]');
      const colId = cellEl?.getAttribute('data-col-id');
      const nodeId = rowEl?.getAttribute('data-node-id');
      if (!colId || !nodeId) return;

      const colDef = ctx.columnModel.getColumn(colId);
      const row = this.api.getRowNode(nodeId);
      if (!colDef || !row) return;

      // Pressing an action is a deliberate command, not a request to select the
      // cell around it or open its editor.
      e.stopPropagation();

      const options = (resolveDisplayRenderer(colDef).options ?? {}) as ActionsRendererOptions;

      if (trigger.hasAttribute(CELL_ACTION_MENU_ATTR)) {
        this.openCellActionMenu(ctx, trigger, row, colDef, options, e);
        return;
      }

      const id = trigger.getAttribute(CELL_ACTION_ATTR);
      if (id) void this.invokeCellAction(ctx, id, row, colDef, options, trigger, e, 'button');
    });
  }

  /**
   * Opens (or closes) the overflow menu for one actions cell.
   *
   * The actions are resolved at click time rather than being built with the
   * cell: a row offering twelve commands renders the DOM of one offering two,
   * and the menu reflects the row as it is *now* rather than as it was when the
   * cell was last painted.
   */
  private openCellActionMenu(
    ctx: GridContext,
    trigger: HTMLElement,
    row: RowNode,
    colDef: ColumnDef,
    options: ActionsRendererOptions,
    event: MouseEvent,
  ): void {
    // Toggle: a second click on the same trigger closes the menu it opened.
    if (isActionsMenuOpenFor(trigger)) {
      closeActionsMenu();
      return;
    }

    const source = {
      row: row.data,
      node: row,
      rowIndex: row.rowIndex,
      value: getCellValue(row.data, colDef, this.api),
      colDef,
      api: this.api,
      event,
    };

    const { overflow } = splitActions(resolveActions(source, options), options);
    if (overflow.length === 0) return;

    openActionsMenu({
      trigger,
      items: overflow,
      options,
      icons: ctx.iconRenderer,
      onSelect: (item, itemEl, selectEvent) => {
        if (!item.action.keepOpen) closeActionsMenu({ restoreFocus: false });
        void this.invokeCellAction(
          ctx,
          item.id,
          row,
          colDef,
          options,
          itemEl,
          selectEvent,
          'menu',
        );
      },
    });
  }

  /**
   * Confirms and runs one action, then reports the outcome.
   *
   * `CELL_ACTION_CLICKED` fires after any confirmation is accepted and before
   * the action's own `onClick`, so a column can be driven entirely from the
   * event bus. A dismissed confirmation emits nothing — a "no" is not a
   * command.
   */
  private async invokeCellAction(
    ctx: GridContext,
    id: string,
    row: RowNode,
    colDef: ColumnDef,
    options: ActionsRendererOptions,
    trigger: HTMLElement,
    event: MouseEvent,
    source: 'button' | 'menu',
  ): Promise<void> {
    const action = findAction(options, id);
    if (!action) return;

    const value = getCellValue(row.data, colDef, this.api);
    const paramsSource = {
      row: row.data,
      node: row,
      rowIndex: row.rowIndex,
      value,
      colDef,
      api: this.api,
      event,
    };

    // Re-resolved against current data: a control drawn before the row changed
    // must not be able to invoke something the row no longer offers.
    const resolved = resolveAction(action, paramsSource, options);
    if (!resolved || resolved.disabled) return;

    const controller: CellActionController = {
      close: () => closeActionsMenu(),
      refresh: () => this.api.refreshCells({ rowNodes: [row] }),
      setLoading: (loading: boolean) => setActionBusy(trigger, loading),
    };

    const group = options.group ?? '';

    await runCellAction({
      action,
      params: createActionParams({ ...paramsSource, controller }, action),
      confirmHandler: options.confirmHandler,
      trigger,
      onRun: () => {
        ctx.eventBus.emit(GridEventType.CELL_ACTION_CLICKED, {
          actionId: action.id,
          action,
          group,
          source,
          row,
          colDef,
          value,
          rowIndex: row.rowIndex,
          event,
        });
      },
      onError: (error) => {
        ctx.eventBus.emit(GridEventType.CELL_ACTION_ERROR, {
          actionId: action.id,
          action,
          group,
          error,
          row,
          colDef,
          rowIndex: row.rowIndex,
        });
      },
    });
  }

  private wireCellButtons(ctx: GridContext): void {
    ctx.containerEl.addEventListener('click', (e: MouseEvent) => {
      const target = e.target;
      // `Element`, not `HTMLElement`: these controls hold an icon, and an
      // `<svg>` (or a `<path>` inside it) is an SVGElement — which would fail an
      // HTMLElement test and silently swallow every press that landed on the
      // glyph rather than the padding around it. `closest` is on Element.
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>(`button[${CELL_BUTTON_ATTR}]`);
      if (!button || button.disabled) return;

      // Master/Detail nests a whole GridCore inside this one's DOM, so this
      // listener also sees the nested grid's buttons. Only the wrapper this
      // instance built is a direct child of its own container.
      const ownerWrapper = button.closest<HTMLElement>('[data-photon-grid-id]');
      if (!ownerWrapper || ownerWrapper.parentElement !== ctx.containerEl) return;

      const cellEl = button.closest<HTMLElement>('[data-col-id]');
      const rowEl = button.closest<HTMLElement>('[data-node-id]');
      const colId = cellEl?.getAttribute('data-col-id');
      const nodeId = rowEl?.getAttribute('data-node-id');
      if (!colId || !nodeId) return;

      const colDef = ctx.columnModel.getColumn(colId);
      const row = this.api.getRowNode(nodeId);
      if (!colDef || !row) return;

      // The button is inside a cell, so the click would also start a cell
      // selection and — with `singleClickEdit` — an editor. Pressing a button
      // is a deliberate action, not a request to select the cell around it.
      e.stopPropagation();

      ctx.eventBus.emit(GridEventType.CELL_BUTTON_CLICKED, {
        action: button.getAttribute(CELL_BUTTON_ATTR) ?? '',
        row,
        colDef,
        value: getCellValue(row.data, colDef, this.api),
        rowIndex: row.rowIndex,
        event: e,
      });
    });
  }

  private wireBooleanCellToggle(ctx: GridContext): void {    const resolve = (target: EventTarget | null): {
      box: HTMLInputElement;
      row: RowNode;
      colDef: ColumnDef;
      cellEl: HTMLElement;
    } | null => {
      if (!(target instanceof Element)) return null;
      const box = target.closest<HTMLInputElement>('input[data-bool-cell]');
      if (!box) return null;

      // Master/Detail nests a whole GridCore inside this one's DOM, so this
      // listener also sees the nested grid's cells. The nearest grid wrapper
      // identifies the real owner; only the wrapper this instance built is a
      // direct child of its own container.
      const ownerWrapper = box.closest<HTMLElement>('[data-photon-grid-id]');
      if (!ownerWrapper || ownerWrapper.parentElement !== ctx.containerEl) return null;

      const cellEl = box.closest<HTMLElement>('[data-col-id]');
      const rowEl = box.closest<HTMLElement>('[data-node-id]');
      const colId = cellEl?.getAttribute('data-col-id');
      const nodeId = rowEl?.getAttribute('data-node-id');
      if (!cellEl || !colId || !nodeId) return null;

      const colDef = ctx.columnModel.getColumn(colId);
      const row = this.api.getRowNode(nodeId);
      if (!colDef || !row || row.type !== 'data') return null;

      return { box, row, colDef, cellEl };
    };

    ctx.containerEl.addEventListener('change', (e: Event) => {
      const hit = resolve(e.target);
      if (!hit) return;
      const { box, row, colDef, cellEl } = hit;

      // `disabled` already blocks this in every browser; the guard covers a
      // programmatic dispatch and keeps the rule in one readable place.
      if (!isBooleanCellEditable(colDef, ctx.options.editing?.mode !== 'none')) {
        box.checked = !!getCellValue(row.data, colDef, this.api);
        return;
      }

      const next = box.checked;
      if (ctx.cellEditorEngine.startEditing(row, colDef, cellEl)) {
        ctx.cellEditorEngine.updateValue(next);
        ctx.cellEditorEngine.stopEditing(false);
      }

      // Whatever the commit decided is now the truth; the DOM follows it.
      box.checked = !!getCellValue(row.data, colDef, this.api);
    });

    // Space and Enter toggle a focused checkbox natively. Stopping propagation
    // keeps the grid's own key handling (cell navigation, range selection,
    // Enter-to-edit) from acting on the same keystroke.
    ctx.containerEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (!resolve(e.target)) return;
      e.stopPropagation();
    });
  }

  /**
   * Re-renders a cell's inner element after an edit session ends, using the
   * current value from `row.data`.
   *
   * Delegates to `CellRenderer.renderCellContent` — the exact code path the
   * initial render and the Virtual DOM patch take — rather than reproducing the
   * rendering rules here. It used to hold its own copy of that logic, and the
   * copy had drifted: no `image` case, no `sparkline` case, a literal tick where
   * the cell renderer drew a checkbox, and `|| '—'` where the renderer used
   * `?? ''`. A committed edit therefore repainted some cells differently from
   * how they were first drawn, until the next full render put them back.
   */
  private renderCellValue(innerEl: HTMLElement, row: RowNode, colDef: ColumnDef): void {
    const cols = this.ctx.columnModel.getVisibleColumns();
    const value = getCellValue(row.data, colDef, this.api);
    // `rawValue` differs from `value` only when a valueGetter is configured;
    // sharing one read otherwise keeps this off the allocation path.
    const rawValue = colDef.valueGetter ? resolveFieldPath(row.data, colDef.field) : value;
    this.editCellRenderer.renderCellContent(innerEl, value, rawValue, {
      row,
      colDef,
      rowIndex: row.rowIndex,
      colIndex: cols.findIndex((c) => c.colId === colDef.colId),
      iconRenderer: this.ctx.iconRenderer,
      dateFormat: this.ctx.options.dateFormat,
      timeZone: this.ctx.options.timeZone,
      currencySymbol: this.ctx.options.currencySymbol,
      locale: this.ctx.options.locale,
      editingEnabled: this.ctx.options.editing?.mode !== 'none',
      api: this.api,
    });
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
    // The avatar roster lives on `document.body`, outside everything the
    // renderer owns, so it would survive the grid that opened it. Same for the
    // long-text panel.
    destroyAvatarGroupOverlay();
    destroyLongTextOverlay();
    destroyActionsMenu();

    // Plugins go first, and it has to be first. `api.destroy()` below calls
    // `eventBus.clear()` -- which drops every subscription with no per-subscriber
    // teardown -- and `renderer.destroy()`, which removes the grid element and
    // with it any plugin layer. A plugin torn down after either would find its
    // elements orphaned and its unsubscribes already no-ops.
    this.pluginHost?.destroyAll();
    this.pluginHost = null;

    // Breaks the ThemeManager -> IconThemeController -> containerEl cycle before
    // anything else is torn down, so a late variant change cannot repaint into
    // a detached tree.
    this.ctx.themeManager.setVariantChangeHandler(null);
    this.ctx.rowModelStrategy.destroy();
    this.ctx.rangeChartService?.disposeAll();
    this.api.destroy();
  }
}
