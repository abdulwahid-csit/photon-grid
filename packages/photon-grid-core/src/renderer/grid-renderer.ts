import type { GridOptions, CellRange } from '../types/grid.types';
import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import type { ColumnModel } from '../core/column-model';
import type { PaginationEngine } from '../engines/pagination/pagination-engine';
import type { IconRenderer } from '../icons/icon-renderer';
import type { SortEngine } from '../engines/sort/sort-engine';
import type { RowSelectionEngine } from '../engines/selection/row-selection-engine';
import type { GroupingEngine } from '../engines/grouping/grouping-engine';
import type { FilterEngine } from '../engines/filter/filter-engine';
import type { FilterModel, ColumnFilter } from '../types/filter.types';
import type { ColumnGroupModel } from '../column-groups/column-group-model';
import type { ColumnGroupHeaderBuilder } from '../column-groups/column-group-header-builder';
import { ColumnGroupDragHandler } from '../column-groups/column-group-drag-handler';
import type { DisplayGroupEngine } from '../column-groups/display-group-engine';
import { GridEventType } from '../types/event.types';
import { GroupDropZone } from './group-drop-zone';
import { HeaderRenderer } from './header-renderer';
import { isTouchPointer } from '../core/pointer-utils';
import { ColumnChooser } from './column-chooser';
import { BodyRenderer } from './body-renderer';
import { RowDragRenderer } from './row-drag-renderer';
import { FooterRenderer } from './footer-renderer';
import { OverlayRenderer } from './overlay-renderer';
import { ColumnStyleManager } from './column-style-manager';
import { RowPositionSheet } from './row-position-sheet';
import { ScrollController } from './scroll-controller';
import { AutoScroller } from './auto-scroller';
import { CellSelectionEngine } from '../cell-selection/cell-selection-engine';
import { RowAnimator } from './row-animator';
import { FilterPanel } from '../engines/filter/filter-panel';
import type { FilterSetOption } from '../engines/filter/filter-panel';
import { FiltersToolPanel } from './filters-tool-panel';
import { ImportMenu } from './import-menu';
import { ImportSourceType } from '../types/import.types';
import { createDiv } from './dom-utils';
import type { MasterDetailEngine } from '../engines/master-detail/master-detail-engine';
import type { TreeExpansionService } from '../engines/tree/tree-expansion-service';
import type { ThemeManager } from '../theme/theme-manager';
import { DetailRowRenderer, type NestedGridFactory } from './detail-row-renderer';
import { StickyRowTracker } from './sticky-row-tracker';
import { TreeStickyRowTracker, type TreeStickyEntry } from './tree-sticky-row-tracker';
import { PhotonAIPanel } from '../photon-ai/photon-ai-panel';
import { TooltipController } from './tooltip-renderer';
import type { PhotonCommandResult } from '../photon-ai/photon-ai.types';

const CHECKBOX_COL_WIDTH = 44;
const SERIAL_COL_WIDTH = 52;
const ROW_BUFFER = 5;
const COL_BUFFER = 2;
const AUTO_GROUP_COL_WIDTH = 200;

export class GridRenderer {
  private wrapperEl: HTMLElement | null = null;

  // Header panel elements
  private leftHeaderPanelEl: HTMLElement | null = null;
  private centerHeaderInnerEl: HTMLElement | null = null;
  private rightHeaderPanelEl: HTMLElement | null = null;

  // Body panel elements
  private leftBodyPanelEl: HTMLElement | null = null;
  private centerBodyEl: HTMLElement | null = null;      // the .pg-panel__body for viewport size
  private centerBodyContentEl: HTMLElement | null = null;
  private rightBodyPanelEl: HTMLElement | null = null;
  private leftBodyContentEl: HTMLElement | null = null;
  private rightBodyContentEl: HTMLElement | null = null;

  private footerContainerEl: HTMLElement | null = null;
  private bodyWrapEl: HTMLElement | null = null;

  // Sticky-row overlay layers — one per panel, siblings of `*ContentEl` (not
  // children), so a stuck Master/Detail row ignores the scroll transform.
  // Only created when `masterDetail.enabled`, per `masterDetailEnabledAtConstruction`.
  private leftStickyRowEl: HTMLElement | null = null;
  private centerStickyRowEl: HTMLElement | null = null;
  private rightStickyRowEl: HTMLElement | null = null;
  private readonly masterDetailEnabledAtConstruction: boolean;
  // Only relevant for building the shared sticky-row layer, per `treeDataEnabledAtConstruction`.
  private readonly treeDataEnabledAtConstruction: boolean;
  /** `nodeId` of the currently-stuck master row, or `null` when none is sticky. */
  private stickyNodeId: string | null = null;
  private readonly stickyRowTracker = new StickyRowTracker();
  private readonly treeStickyRowTracker = new TreeStickyRowTracker();

  /** Exposed for {@link DisplayGroupEngine} construction in `GridCore`. */
  readonly colStyles: ColumnStyleManager;
  private rowPositionSheet: RowPositionSheet;
  private scrollController: ScrollController;
  private headerRenderer: HeaderRenderer;
  /** Lazily-opened "Choose Columns" dialog. Created once, reused across opens. */
  private columnChooser: ColumnChooser | null = null;
  private bodyRenderer: BodyRenderer;
  private footerRenderer: FooterRenderer;
  private overlayRenderer: OverlayRenderer;
  private groupDropZone: GroupDropZone | null = null;
  private rowDragRenderer: RowDragRenderer | null = null;
  private treeDragConfig: { active: boolean; reparentHandler: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean } | null = null;
  private detailRowRenderer: DetailRowRenderer | null = null;
  private masterDetailEngine: MasterDetailEngine | null = null;
  private treeExpansionService: TreeExpansionService | null = null;
  private treeToggleColumnId: string | null = null;
  /** Floating Photon AI command bar — only created when `photonAI.enabled`. */
  private photonAIPanel: PhotonAIPanel | null = null;
  /** Floating Filters Tool Panel — only created when `filtersToolPanel.enabled`. */
  private filtersToolPanel: FiltersToolPanel | null = null;
  /** Floating Import menu (launcher + dropdown) — only created when `import.enabled`. */
  private importMenu: ImportMenu | null = null;
  /** Host handler run when a file-based import source is chosen. Wired by GridCore. */
  private importFileHandler: ((source: ImportSourceType, file: File) => void) | null = null;
  /** Host handler run when *Paste From Clipboard* is chosen. Wired by GridCore. */
  private importClipboardHandler: (() => void) | null = null;
  /** Shows a custom floating tooltip for columns with `renderer.tooltip`; a no-op for every other column. */
  private tooltipController: TooltipController;

  private rafId: number | null = null;
  private autoScroller: AutoScroller | null = null;
  private unsubscribers: Array<() => void> = [];
  private headerRendered = false;
  private lastCenterColStart = -1;
  private lastCenterColEnd = -1;
  private rowAnimator = new RowAnimator();

  // ── Column-group support ──────────────────────────────────────────────────
  private columnGroupModel:   ColumnGroupModel | null = null;
  private groupHeaderBuilder: ColumnGroupHeaderBuilder | null = null;
  private groupDragHandler:   ColumnGroupDragHandler | null = null;
  /** New Display Group Engine — takes priority over the legacy ColumnGroupModel when set. */
  private displayGroupEngine: DisplayGroupEngine | null = null;

  // ── Filter panel management ────────────────────────────────────────────────
  private filterEngine: FilterEngine | null = null;
  private filterRefreshFn: (() => void) | null = null;
  private activeFilterPanel: FilterPanel | null = null;

  // ── Render caches ─────────────────────────────────────────────────────────
  // Column/row computation is skipped on scroll-only frames by comparing the
  // store array reference — a new reference means data/columns actually changed.
  /** Last `columns` array reference seen — guards column-width recomputation. */
  private _lastColumnsRef: ColumnDef[] | null = null;
  /** Last `groupedColumnIds` array reference seen — guards grouping recomputation. */
  private _lastGroupedIdsRef: string[] | null = null;
  /** Last `visibleRows` array reference seen — guards total-height recomputation. */
  private _lastRowsRef: RowNode[] | null = null;
  /** Cached total content height in pixels (sum of all visible row heights). */
  private _cachedTotalHeight = 0;
  /** Cached center-panel content width in pixels. */
  private _cachedCenterW = 0;
  /**
   * Center-panel `clientWidth` last used to resolve `flex` columns. Flex
   * widths are normally only re-resolved when the columns array itself
   * changes (cheap, guards the 60fps scroll path) — but the container can
   * also resize with the columns reference untouched, e.g. a vertical
   * scrollbar transiently appearing/disappearing as a Master/Detail row is
   * inserted. Comparing against this on every render (a single cheap
   * `clientWidth` read, only paid by grids that actually use `flex` columns)
   * catches that case so flex columns don't get stuck sized for a stale width.
   */
  private _lastFlexResolvedWidth = -1;

  constructor(
    private containerEl: HTMLElement,
    private store: GridStore,
    private eventBus: EventBus,
    private columnModel: ColumnModel,
    private paginationEngine: PaginationEngine,
    private iconRenderer: IconRenderer,
    private cellSelectionEngine: CellSelectionEngine,
    private sortEngine: SortEngine,
    private rowSelectionEngine: RowSelectionEngine,
    private groupingEngine: GroupingEngine,
    private options: GridOptions,
  ) {
    this.colStyles = new ColumnStyleManager();
    this.rowPositionSheet = new RowPositionSheet();
    this.scrollController = new ScrollController();
    this.masterDetailEnabledAtConstruction = options.masterDetail?.enabled ?? false;
    this.treeDataEnabledAtConstruction = options.treeData?.enabled ?? false;
    if (this.masterDetailEnabledAtConstruction) {
      this.scrollController.setReserveVerticalGutter(true);
    }

    this.headerRenderer = new HeaderRenderer(
      store, eventBus, iconRenderer, columnModel, sortEngine, this.colStyles,
    );

    if (options.showGroupingBar) {
      this.groupDropZone = new GroupDropZone(store, groupingEngine, iconRenderer);
      this.headerRenderer.setGroupDropZone(this.groupDropZone);
    }
    this.bodyRenderer = new BodyRenderer(
      store, eventBus, iconRenderer, rowSelectionEngine,
    );
    this.footerRenderer = new FooterRenderer(eventBus, iconRenderer, paginationEngine);
    this.overlayRenderer = new OverlayRenderer(iconRenderer);

    if (options.masterDetail?.enabled) {
      this.detailRowRenderer = new DetailRowRenderer();
      // Nested grids never scroll themselves via mouse wheel — every wheel
      // gesture over one drives the parent's own scroll instead, so the
      // parent + detail sections read as one continuous scrollable surface.
      this.detailRowRenderer.setParentScrollForwarder((delta) => {
        this.scrollController.scrollToY(this.scrollController.getScrollTop() + delta);
      });
    }

    if (options.photonAI?.enabled) {
      this.photonAIPanel = new PhotonAIPanel(iconRenderer);
    }

    if (options.filtersToolPanel?.enabled) {
      // Deps read `this.filterEngine`/`this.filterRefreshFn` lazily because both
      // are wired after construction (via setFilterEngine / setFilterRefreshCallback).
      this.filtersToolPanel = new FiltersToolPanel({
        iconRenderer,
        getColumns: () => this.columnModel.getAllColumns(),
        getFilterModel: () => this.filterEngine?.getFilterModel() ?? {},
        getUniqueOptions: (colDef) => this.extractUniqueOptions(colDef),
        onFilterChange: (colId, filter) => {
          this.filterEngine?.setColumnFilter(colId, filter);
          this.filterRefreshFn?.();
        },
      });
    }

    if (options.import?.enabled) {
      // Pure-UI launcher + dropdown. The actual import runs in the host handlers
      // (wired via setImportHandlers by GridCore), keeping this renderer free of
      // any parser/engine dependency.
      this.importMenu = new ImportMenu({
        iconRenderer,
        getFormats: () =>
          options.import?.formats ?? [
            ImportSourceType.Excel,
            ImportSourceType.Csv,
            ImportSourceType.Tsv,
            ImportSourceType.Clipboard,
          ],
        onSelectFile: (source, file) => this.importFileHandler?.(source, file),
        onSelectClipboard: () => this.importClipboardHandler?.(),
      });
    }

    this.tooltipController = new TooltipController(store, columnModel, null);
  }

  /**
   * Enables Tree Data drag-to-reparent on the row-drag system. Must be
   * called before `mount()` (mirrors `setMasterDetailConfig`) — `mount()`
   * is when `RowDragRenderer` is actually constructed.
   */
  setTreeDragConfig(active: boolean, reparentHandler: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean): void {
    this.treeDragConfig = { active, reparentHandler };
  }

  /** Wires Tree Data's expansion state + toggle column into the body renderer, so `data-level` indentation and the expand/collapse toggle render on the configured column. A no-op (undefined `treeData` on every `renderRows` call) until this is called. */
  setTreeRenderConfig(toggleColumnId: string | undefined, expansionService: TreeExpansionService): void {
    this.treeToggleColumnId = toggleColumnId ?? null;
    this.treeExpansionService = expansionService;
  }

  mount(): void {
    this.colStyles.mount();
    this.rowPositionSheet.mount();
    this.buildLayout();
    if (this.wrapperEl && this.bodyWrapEl) {
      this.rowDragRenderer = new RowDragRenderer(this.store, this.eventBus, this.iconRenderer);
      this.rowDragRenderer.mount(
        this.wrapperEl,
        this.bodyWrapEl,
        (dy) => this.scrollController.scrollToY(this.scrollController.getScrollTop() + dy),
      );
      if (this.treeDragConfig) {
        this.rowDragRenderer.setTreeMode(this.treeDragConfig.active, this.treeDragConfig.reparentHandler);
      }
    }
    this.subscribeToStore();
    this.scheduleRender();
  }

  scheduleRender(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.performRender();
    });
  }

  forceRender(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.performRender();
  }

  /**
   * Clears the body-renderer's row cache so the next render fully rebuilds every
   * visible row from the data model.  Use this after in-place data mutations
   * (paste, cut) where the `visibleRows` reference is unchanged but cell values
   * have been updated — `updatePanelRow` only refreshes row-level classes, not
   * cell content, so a cache invalidation + re-render is required.
   */
  invalidateBodyRows(): void {
    this.bodyRenderer.clear();
    this.scheduleRender();
  }

  /**
   * Evicts only the rows with the given node IDs from the render cache and
   * schedules a repaint.  All other rows keep their cached DOM elements so
   * custom cell renderers (images, flags, etc.) are not needlessly re-executed.
   *
   * Prefer this over `invalidateBodyRows` whenever the set of mutated rows is
   * known (fill, cut, paste, undo/redo).
   *
   * @param nodeIds - Node IDs of the rows whose cache entries should be evicted.
   */
  invalidateBodyRowsByIds(nodeIds: Set<string>): void {
    this.bodyRenderer.invalidateRowsByNodeId(nodeIds);
    this.scheduleRender();
  }

  // ── Filter panel public API ────────────────────────────────────────────────

  /**
   * Provides the renderer with a `FilterEngine` reference so it can read the
   * current filter model and write column filters when the user interacts with
   * the filter panel.  Called from `GridApi` after construction.
   */
  setFilterEngine(engine: FilterEngine): void {
    this.filterEngine = engine;
  }

  /**
   * Registers a callback that runs the full sort/filter pipeline and triggers
   * a render whenever the filter state changes from within the panel.
   * Called from `GridApi` after construction.
   */
  setFilterRefreshCallback(fn: () => void): void {
    this.filterRefreshFn = fn;
  }

  /**
   * Wire the column-group model and header builder into the renderer.
   *
   * Must be called **before** the first `mount()` so that `renderInPanels`
   * can insert group header rows above the leaf row.  Called by `GridCore`
   * when any top-level `ColumnDef` has a `children` array.
   *
   * @param model   - The live tree model.
   * @param builder - The DOM builder instance.
   */
  setColumnGroupModel(model: ColumnGroupModel, builder: ColumnGroupHeaderBuilder): void {
    this.columnGroupModel   = model;
    this.groupHeaderBuilder = builder;

    // Create the drag handler — gridElGetter returns wrapperEl which is set
    // during mount(); drag can only start after mount so it is always non-null.
    this.groupDragHandler = new ColumnGroupDragHandler(
      this.columnModel,
      model,
      builder,
      this.colStyles,
      this.eventBus,
      () => this.wrapperEl,
    );

    // Wire drag handler into builder so every group cell gets drag listeners
    builder.setDragConfig(this.groupDragHandler, () => this.wrapperEl);

    // Forward references into HeaderRenderer
    this.headerRenderer.setColumnGroupModel(model, builder);
    this.headerRenderer.setGroupDragHandler(this.groupDragHandler);

    // Wire collapse/expand: toggle model state, sync leaf visibility, rebuild header
    this.headerRenderer.setGroupToggleCallback((groupId: string) => {
      this.handleGroupToggle(groupId);
    });

    // Wire group resize: distribute delta proportionally across all leaf columns
    this.headerRenderer.setGroupResizeCallback((groupId: string, newWidth: number) => {
      this.handleGroupResize(groupId, newWidth);
    });
  }

  /**
   * Wire the new Display Group Engine into the renderer.
   *
   * Creates the drag handler, forwards the engine into `HeaderRenderer`, and
   * subscribes to the events that trigger header rebuilds.  Must be called
   * before `mount()` when the grid's column definitions contain groups.
   *
   * Takes priority over the legacy `setColumnGroupModel` path.
   *
   * @param engine - Fully-initialised `DisplayGroupEngine` instance.
   */
  setDisplayGroupEngine(engine: DisplayGroupEngine): void {
    this.displayGroupEngine = engine;

    // Create the drag handler bound to this engine
    engine.createDragHandler(() => this.wrapperEl);

    // Forward engine into HeaderRenderer
    this.headerRenderer.setDisplayGroupEngine(engine);

    // Wire toggle/resize callbacks (HeaderRenderer fires these on user interaction)
    this.headerRenderer.setGroupToggleCallback((groupId: string) => {
      this.handleGroupToggle(groupId);
    });
    this.headerRenderer.setGroupResizeCallback((groupId: string, newWidth: number) => {
      this.handleGroupResize(groupId, newWidth);
    });

    // Subscribe to group collapse/expand events from the event bus
    this.unsubscribers.push(
      this.eventBus.on(GridEventType.COLUMN_GROUP_HEADER_COLLAPSED, () => {
        this.rebuildHeader();
      }),
      this.eventBus.on(GridEventType.COLUMN_GROUP_HEADER_EXPANDED, () => {
        this.rebuildHeader();
      }),
      // Group drag-drop (and leaf clone) completion fires COLUMN_MOVED with
      // fromIndex === -1 as a sentinel.  Sync the flat store.columns order from
      // the group tree so body rows reflect the new column sequence, then rebuild.
      this.eventBus.on(GridEventType.COLUMN_MOVED, (payload: unknown) => {
        const p = payload as { fromIndex: number };
        if (p?.fromIndex === -1) {
          if (this.columnGroupModel) {
            const newLeaves    = this.columnGroupModel.getAllLeaves();
            const storeColumns = this.store.get('columns') as ColumnDef[];
            const colMap       = new Map(storeColumns.map((c: ColumnDef) => [c.colId, c]));
            const reordered    = newLeaves
              .map((l) => colMap.get(l.colId))
              .filter((c): c is ColumnDef => c !== undefined);
            // Only update the store when the order actually changed so we don't
            // trigger an unnecessary store.watch('columns') rebuild cycle.
            const orderChanged = reordered.some((c, i) => c.colId !== storeColumns[i]?.colId);
            if (orderChanged) {
              this.store.set('columns', reordered);
            }
          }
          this.bodyRenderer.clear();
          this.rebuildHeader();
        }
      }),
    );
  }

  /**
   * Opens (or replaces) the floating filter panel for the given column.
   * Called by `HeaderRenderer` when the user clicks a column's filter icon.
   *
   * @param colDef   - Column definition the filter applies to.
   * @param anchorEl - Filter-icon button element — panel positions below this.
   */
  openFilterPanel(colDef: ColumnDef, anchorEl: HTMLElement): void {
    if (!this.filterEngine || !this.wrapperEl) return;

    // If the same column's panel is already open, close it (toggle behaviour)
    if (this.activeFilterPanel) {
      this.activeFilterPanel.destroy();
      this.activeFilterPanel = null;
      return;
    }

    const currentFilter = this.filterEngine.getFilterModel()[colDef.colId] ?? null;
    const uniqueOptions = this.extractUniqueOptions(colDef);

    this.activeFilterPanel = new FilterPanel({
      colDef,
      anchorEl,
      containerEl: this.wrapperEl,
      currentFilter,
      uniqueOptions,
      onFilterChange: (filter) => {
        this.filterEngine!.setColumnFilter(colDef.colId, filter);
        this.filterRefreshFn?.();
      },
      onClose: () => {
        this.activeFilterPanel = null;
      },
    });

    this.activeFilterPanel.open();
  }

  /** Opens the Filters Tool Panel, if the feature is enabled. No-op otherwise. */
  openFiltersToolPanel(): void {
    this.filtersToolPanel?.open();
  }

  /** Closes the Filters Tool Panel, if the feature is enabled. No-op otherwise. */
  closeFiltersToolPanel(): void {
    this.filtersToolPanel?.close();
  }

  /** Toggles the Filters Tool Panel open/closed, if the feature is enabled. No-op otherwise. */
  toggleFiltersToolPanel(): void {
    this.filtersToolPanel?.toggle();
  }

  /**
   * Wires the host handlers the Import menu invokes when a source is chosen.
   * Called by {@link import('../core/grid-core').GridCore} once the live
   * {@link import('../core/grid-api').GridApi} exists — the menu itself carries
   * no import logic.
   *
   * @param onFile      - Runs an import for a picked file + inferred source.
   * @param onClipboard - Runs a clipboard import.
   */
  setImportHandlers(
    onFile: (source: ImportSourceType, file: File) => void,
    onClipboard: () => void,
  ): void {
    this.importFileHandler = onFile;
    this.importClipboardHandler = onClipboard;
  }

  /**
   * Applies a live, per-column text filter from an inline filter-row input.
   *
   * Builds a single `contains` condition against the column's field so typing
   * substring-matches every column type (numbers/dates are matched on their
   * string form, mirroring the quick-filter behaviour). An empty term removes
   * the column's filter entirely. Reuses the same {@link FilterEngine} pathway
   * as the filter panel so both entry points stay consistent, then re-runs the
   * data pipeline via {@link filterRefreshFn}.
   *
   * @param colDef - Column whose filter is being edited.
   * @param term   - Current input value; empty/whitespace clears the filter.
   */
  private applyInlineTextFilter(colDef: ColumnDef, term: string): void {
    if (!this.filterEngine) return;
    const trimmed = term.trim();
    if (trimmed === '') {
      this.filterEngine.setColumnFilter(colDef.colId, null);
    } else {
      const filter: ColumnFilter = {
        colId: colDef.colId,
        field: colDef.field,
        type: 'string',
        logic: 'and',
        conditions: [{ operator: 'contains', value: trimmed }],
        searchTerm: trimmed,
      };
      this.filterEngine.setColumnFilter(colDef.colId, filter);
    }
    this.filterRefreshFn?.();
  }

  /**
   * Extracts unique display value/label pairs for set-type (dropdown / array)
   * filter panels.  For `dropdown` columns the predefined `dropdownOptions`
   * are used directly; for other types unique values are scanned from `allRows`.
   */
  private extractUniqueOptions(colDef: ColumnDef): FilterSetOption[] {
    // Dropdown: use predefined options list
    if (colDef.type === 'dropdown' && colDef.dropdownOptions?.length) {
      return colDef.dropdownOptions.map((o) => ({
        value: String(o.value),
        label: o.label ?? String(o.value),
      }));
    }

    const allRows = this.store.get('allRows') as RowNode[];
    const field = colDef.field;
    const parts = field.split('.');
    const nested = field.includes('.');
    const seen = new Set<string>();

    for (const row of allRows) {
      if (row.type !== 'data') continue;
      let val: unknown;
      if (nested) {
        val = row.data;
        for (const part of parts) {
          if (val == null) break;
          val = (val as Record<string, unknown>)[part];
        }
      } else {
        val = row.data[field];
      }

      if (Array.isArray(val)) {
        for (const v of val) { if (v != null && v !== '') seen.add(String(v)); }
      } else if (val != null && val !== '') {
        seen.add(String(val));
      }
    }

    return Array.from(seen)
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));
  }

  /**
   * Snapshot current row positions so the next render animates the transition.
   * Call this **before** any pipeline that reorders or hides rows.
   *
   * No-ops when row animations are disabled via `GridOptions.animateRows === false`
   * (or {@link setRowAnimationEnabled}); with no snapshot captured, the next
   * render simply skips the animation.
   *
   * @param rows - Current visible rows before the pipeline runs.
   * @param type - `'sort'` (default), `'filter'` or `'detail'` — controls duration and entrance style.
   */
  captureRowAnimation(
    rows: ReadonlyArray<{ nodeId: string; top: number }>,
    type: import('./row-animator').RowAnimationType = 'sort',
  ): void {
    if (this.options.animateRows === false) return;
    this.rowAnimator.capture(rows, type);
  }

  /**
   * Enable or disable row animations at runtime, overriding the initial
   * `GridOptions.animateRows` value. Disabling clears any pending capture so an
   * in-flight transition does not play on the next render.
   *
   * @param enabled - `true` to animate row reorders/appearance, `false` to disable.
   */
  setRowAnimationEnabled(enabled: boolean): void {
    this.options.animateRows = enabled;
    if (!enabled) this.rowAnimator.destroy();
  }

  /** Wire up the group-bar search input to an external handler (e.g. api.setQuickFilter). */
  setSearchCallback(fn: (term: string) => void): void {
    this.groupDropZone?.setSearchCallback(fn);
  }

  /**
   * Wires the Master/Detail engine and nested-grid factory into the renderer.
   * A no-op when `masterDetail.enabled` was falsy at construction (the
   * `DetailRowRenderer` instance was never created). Called once from
   * `GridCore.buildContext`, before `mount()`.
   */
  setMasterDetailConfig(
    engine: MasterDetailEngine,
    nestedGridFactory: NestedGridFactory,
    iconRenderer: IconRenderer,
    themeManager: ThemeManager,
  ): void {
    this.masterDetailEngine = engine;
    this.detailRowRenderer?.setDependencies(engine, nestedGridFactory, iconRenderer, themeManager);
  }

  /**
   * Late-bound once the owning `GridCore`'s `GridApi` exists — passed through
   * to `masterDetail.detailRendererFn` as `DetailRendererParams.parentApi`.
   */
  setParentApiForDetail(api: unknown): void {
    this.detailRowRenderer?.setParentApi(api);
    // The same GridApi backs the column menu's custom-item context. Wired here
    // (rather than in buildLayout) because the API is created after mount().
    this.headerRenderer.setMenuApi(api);
  }

  /** The nested grid's `GridApi` for an expanded master row, or `undefined`. Backs `GridApi.getDetailGridApi`. */
  getDetailGridApi(parentNodeId: string): unknown {
    return this.detailRowRenderer?.getNestedInstance(parentNodeId)?.api;
  }

  /**
   * Wires the callback the Photon AI panel's send button/Enter key invokes —
   * late-bound once the owning `GridCore`'s `GridApi` (and therefore its
   * `PhotonAIService`) exists. A no-op when `photonAI.enabled` was falsy at
   * construction (the panel was never created).
   */
  setPhotonAISubmitHandler(fn: (text: string) => PhotonCommandResult): void {
    this.photonAIPanel?.setSubmitHandler(fn);
  }

  /**
   * Wires the async (generative provider) handler for the Photon AI panel.
   * When set, the panel streams the reply with a loading + typewriter effect
   * instead of rendering it synchronously. A no-op when the panel doesn't exist.
   */
  setPhotonAIAsyncSubmitHandler(fn: (text: string, signal: AbortSignal) => Promise<PhotonCommandResult>): void {
    this.photonAIPanel?.setAsyncSubmitHandler(fn);
  }

  /** Programmatic entry point mirroring the panel's own UI — backs `GridApi.submitAICommand`. */
  submitAICommand(text: string): PhotonCommandResult {
    return this.photonAIPanel?.invoke(text)
      ?? { success: false, message: 'Photon AI is not enabled on this grid.' };
  }

  /** Async, streaming programmatic entry point — backs `GridApi.submitAICommandAsync`. Falls back to the sync path when no provider is configured. */
  submitAICommandAsync(text: string): Promise<PhotonCommandResult> {
    return this.photonAIPanel?.invokeAsync(text)
      ?? Promise.resolve({ success: false, message: 'Photon AI is not enabled on this grid.' });
  }

  /**
   * Starts the shrink/fade-out animation for `parentNodeId`'s detail row.
   * Must be called synchronously **before** the pipeline re-runs and removes
   * the row — see `DetailRowRenderer.beginCollapse` for why the timing matters.
   */
  beginDetailCollapse(parentNodeId: string): void {
    this.detailRowRenderer?.beginCollapse(parentNodeId);
  }

  scrollToRow(rowIndex: number): void {
    const rows = this.store.get('allRows');
    this.scrollController.scrollToRow(rowIndex, rows);
  }

  scrollToTop(): void {
    this.scrollController.scrollToTop();
  }

  /** Whether the body can still scroll further up. Used by a Master/Detail parent to chain wheel scroll into this grid before forwarding it further up itself. */
  canScrollUp(): boolean {
    return this.scrollController.canScrollUp();
  }

  /** Whether the body can still scroll further down. */
  canScrollDown(): boolean {
    return this.scrollController.canScrollDown();
  }

  /**
   * Scrolls the grid body (vertically and horizontally) so that the cell at
   * `rowIndex` / `colIndex` is fully visible — mirrors AG Grid's auto-scroll
   * behaviour on keyboard navigation.
   *
   * - For pinned-left/right columns only vertical scrolling is applied.
   * - For center columns both axes are adjusted when the cell is out of view.
   *
   * @param rowIndex - Index into `visibleRows`
   * @param colIndex - Index in the flat visible-columns array (left + center + right)
   */
  scrollToCell(rowIndex: number, colIndex: number): void {
    const rows    = this.store.get('visibleRows') as RowNode[];
    const allCols = (this.store.get('columns') as ColumnDef[]).filter((c) => c.visible !== false);

    const row = rows[rowIndex];
    if (!row) return;
    // colIndex −1 is the virtual auto-group label column — vertical scroll is
    // still needed, but there is no horizontal column descriptor for it.
    const col = colIndex >= 0 ? allCols[colIndex] : null;

    // ── Vertical ──────────────────────────────────────────────────────────────
    // A Master/Detail sticky row is already fully visible — pinned at the
    // viewport's top — even though its logical `row.top` sits above the current
    // scroll position. Auto-scrolling it into view would scroll UP to reveal
    // its real (non-sticky) position, un-sticking it and jarringly jumping the
    // grid (and its nested detail) on a mere cell click. Skip vertical scroll
    // for it; horizontal scroll below still applies normally.
    if (row.nodeId !== this.stickyNodeId) {
      const rowH      = row.height ?? (this.options.rowHeight ?? 48);
      const scrollTop = this.scrollController.getScrollTop();
      const vpH       = this.scrollController.getViewportHeight();

      if (row.top < scrollTop) {
        this.scrollController.scrollToY(row.top);
      } else if (row.top + rowH > scrollTop + vpH) {
        this.scrollController.scrollToY(row.top + rowH - vpH);
      }
    }

    // ── Horizontal (center columns only) ──────────────────────────────────────
    // col is null for the virtual auto-group label column — it is always visible
    // within the fixed-width group column area, so no horizontal scroll is needed.
    if (!col || col.pinned === 'left' || col.pinned === 'right') return;

    const leftCols   = allCols.filter((c) => c.pinned === 'left');
    const centerCols = allCols.filter((c) => c.pinned !== 'left' && c.pinned !== 'right');
    const centerIdx  = colIndex - leftCols.length;
    if (centerIdx < 0 || centerIdx >= centerCols.length) return;

    const groupedIds  = this.store.get('groupedColumnIds') as string[];
    const groupOffset = groupedIds.length > 0 ? AUTO_GROUP_COL_WIDTH : 0;
    const colX = groupOffset + this.colStyles.getTotalWidth(centerCols.slice(0, centerIdx).map((c) => c.colId));
    const colW = this.colStyles.getWidth(centerCols[centerIdx].colId);

    const scrollLeft = this.scrollController.getScrollLeft();
    const vpW        = this.scrollController.getCenterViewportWidth();

    if (colX < scrollLeft) {
      this.scrollController.scrollToX(colX);
    } else if (colX + colW > scrollLeft + vpW) {
      this.scrollController.scrollToX(colX + colW - vpW);
    }
  }

  getCellRect(rowIndex: number, colIndex: number): DOMRect | null {
    for (const content of [this.leftBodyContentEl, this.centerBodyContentEl, this.rightBodyContentEl]) {
      if (!content) continue;
      const cellEl = content.querySelector<HTMLElement>(
        `[data-row-index="${rowIndex}"][data-col-index="${colIndex}"]`,
      );
      if (cellEl) return cellEl.getBoundingClientRect();
    }
    return null;
  }

  /**
   * Scrolls the body vertically so the row at `rowIndex` (index into
   * `visibleRows`) sits at the requested position. With no `position`, performs
   * the minimal scroll needed to bring the row fully into view (no-op if it
   * already is). The horizontal axis is left untouched — see
   * {@link ensureColumnVisible}.
   *
   * @param rowIndex - Index into the current `visibleRows`.
   * @param position - `'top' | 'middle' | 'bottom'`, or omit for minimal scroll.
   */
  ensureRowVisible(rowIndex: number, position?: 'top' | 'middle' | 'bottom'): void {
    const rows = this.store.get('visibleRows') as RowNode[];
    const row = rows[rowIndex];
    if (!row) return;

    const rowH = row.height ?? (this.options.rowHeight ?? 48);
    const scrollTop = this.scrollController.getScrollTop();
    const vpH = this.scrollController.getViewportHeight();

    let targetY: number;
    switch (position) {
      case 'top':
        targetY = row.top;
        break;
      case 'bottom':
        targetY = row.top + rowH - vpH;
        break;
      case 'middle':
        targetY = row.top - (vpH - rowH) / 2;
        break;
      default:
        if (row.top < scrollTop) targetY = row.top;
        else if (row.top + rowH > scrollTop + vpH) targetY = row.top + rowH - vpH;
        else return; // already fully visible
    }

    this.scrollController.scrollToY(Math.max(0, targetY));
  }

  /**
   * Scrolls the body horizontally so the center column `colId` is fully
   * visible. Pinned columns are always on-screen, so this is a no-op for them.
   *
   * @param colId - Id of the column to reveal.
   */
  ensureColumnVisible(colId: string): void {
    const allCols = (this.store.get('columns') as ColumnDef[]).filter((c) => c.visible !== false);
    const col = allCols.find((c) => c.colId === colId);
    if (!col || col.pinned === 'left' || col.pinned === 'right') return;

    const centerCols = allCols.filter((c) => c.pinned !== 'left' && c.pinned !== 'right');
    const centerIdx = centerCols.findIndex((c) => c.colId === colId);
    if (centerIdx < 0) return;

    const groupedIds = this.store.get('groupedColumnIds') as string[];
    const groupOffset = groupedIds.length > 0 ? AUTO_GROUP_COL_WIDTH : 0;
    const colX = groupOffset + this.colStyles.getTotalWidth(centerCols.slice(0, centerIdx).map((c) => c.colId));
    const colW = this.colStyles.getWidth(colId);

    const scrollLeft = this.scrollController.getScrollLeft();
    const vpW = this.scrollController.getCenterViewportWidth();

    if (colX < scrollLeft) {
      this.scrollController.scrollToX(colX);
    } else if (colX + colW > scrollLeft + vpW) {
      this.scrollController.scrollToX(colX + colW - vpW);
    }
  }

  enterFullScreen(): void {
    if (!this.wrapperEl) return;
    this.wrapperEl.requestFullscreen?.();
    this.wrapperEl.classList.add('pg-grid--fullscreen');
    this.store.set('fullScreen', true);
  }

  exitFullScreen(): void {
    if (document.fullscreenElement === this.wrapperEl) {
      document.exitFullscreen?.();
    }
    this.wrapperEl?.classList.remove('pg-grid--fullscreen');
    this.store.set('fullScreen', false);
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];

    this.headerRenderer.destroy();
    this.columnChooser?.destroy();
    this.bodyRenderer.destroy();
    this.footerRenderer.destroy();
    this.overlayRenderer.destroy();
    this.detailRowRenderer?.destroy();
    this.photonAIPanel?.destroy();
    this.filtersToolPanel?.destroy();
    this.importMenu?.destroy();
    this.tooltipController.destroy();
    this.scrollController.destroy();
    this.groupDropZone?.destroy();
    this.rowDragRenderer?.destroy();
    this.groupDragHandler?.destroy();
    this.rowPositionSheet.destroy();
    this.rowAnimator.destroy();
    this.colStyles.destroy();
    this.autoScroller?.stop();
    this.autoScroller = null;
    this.wrapperEl?.remove();
    this.wrapperEl = null;
  }

  /**
   * Re-hit-tests the serial cell under the given viewport point and extends the
   * active row drag-selection to it. Invoked by the auto-scroller after each
   * scrolled frame so a drag past the top/bottom edge keeps selecting rows.
   */
  private extendRowDragAtPoint(cx: number, cy: number): void {
    const el = document.elementFromPoint(cx, cy) as HTMLElement | null;
    const rowCell = el?.closest<HTMLElement>('[data-row-index]');
    if (!rowCell) return;
    const ri = Number(rowCell.getAttribute('data-row-index'));
    if (!isNaN(ri)) {
      this.rowSelectionEngine.extendRowDrag(ri, this.store.get('visibleRows') as RowNode[]);
    }
  }

  // ─── Layout ──────────────────────────────────────────────────────────────

  private buildLayout(): void {
    this.wrapperEl = createDiv('pg-grid');
    this.wrapperEl.setAttribute('role', 'grid');
    const gridId = this.generateId();
    this.wrapperEl.setAttribute('data-photon-grid-id', gridId);
    // Scopes ColumnStyleManager's generated width rules to this instance —
    // without it, two GridCore instances on the same page (e.g. a Master/Detail
    // parent and its nested grid) sharing a user-provided colId like "year"
    // would resize each other via the same unscoped [data-col-id] selector.
    this.colStyles.setScopeId(gridId);
    if (this.masterDetailEnabledAtConstruction) {
      // Pinned left/right panels are full-height, `pointer-events: auto`
      // (default) blocks regardless of whether they have a row at a given Y
      // — including the Y range where a full-width detail/nested grid is
      // showing underneath. Scoped to master-detail grids only: see the
      // paired `.pg-grid--has-master-detail` rule in base-styles.ts, which
      // makes empty panel space pass clicks through while individual rows
      // (which do have real content) explicitly opt back into receiving them.
      this.wrapperEl.classList.add('pg-grid--has-master-detail');
    }
    if (!this.options.showVerticalBorders) {
      this.wrapperEl.classList.add('pg-grid--no-v-borders');
    }
    if (this.options.rowHeightMode === 'auto') {
      this.wrapperEl.classList.add('pg-grid--auto-row-height');
    }
    this.containerEl.appendChild(this.wrapperEl);

    // Apply custom row heights as CSS vars
    if (this.options.headerRowHeight) {
      this.wrapperEl.style.setProperty('--pg-header-row-height', `${this.options.headerRowHeight}px`);
    }
    if (this.options.filterRowHeight) {
      this.wrapperEl.style.setProperty('--pg-filter-row-height', `${this.options.filterRowHeight}px`);
    }

    // ── Outer flex-row (contains group zone when left/right docked + main col) ─
    const outerRowEl = createDiv('pg-grid-outer');
    this.wrapperEl.appendChild(outerRowEl);

    // ── Main flex-col (header + body + scrollbar) ────────────────────────────
    const mainColEl = createDiv('pg-grid-main');
    outerRowEl.appendChild(mainColEl);

    // ── Group drop zone (defaults to top of mainColEl) ───────────────────────
    if (this.groupDropZone) {
      this.groupDropZone.mount(outerRowEl, mainColEl);
    }

    // ── Header ──────────────────────────────────────────────────────────────
    const headerWrapEl = createDiv('pg-grid__header');
    mainColEl.appendChild(headerWrapEl);

    // Left header panel
    const leftHeaderPanelEl = createDiv('pg-panel pg-panel--left');
    const leftHeaderInner = createDiv('pg-panel__header');
    leftHeaderPanelEl.appendChild(leftHeaderInner);
    headerWrapEl.appendChild(leftHeaderPanelEl);
    this.leftHeaderPanelEl = leftHeaderInner;

    // Center header panel
    const centerHeaderPanelEl = createDiv('pg-panel pg-panel--center');
    const centerHeaderOuter = createDiv('pg-panel__header');
    const centerHeaderInnerEl = createDiv('pg-panel__header-inner');
    centerHeaderOuter.appendChild(centerHeaderInnerEl);
    centerHeaderPanelEl.appendChild(centerHeaderOuter);
    headerWrapEl.appendChild(centerHeaderPanelEl);
    this.centerHeaderInnerEl = centerHeaderInnerEl;

    // Right header panel
    const rightHeaderPanelEl = createDiv('pg-panel pg-panel--right');
    const rightHeaderInner = createDiv('pg-panel__header');
    rightHeaderPanelEl.appendChild(rightHeaderInner);
    headerWrapEl.appendChild(rightHeaderPanelEl);
    this.rightHeaderPanelEl = rightHeaderInner;

    // Spacer that mirrors the vertical scrollbar flex item in the body row so
    // the center header panel is exactly as wide as the center body panel.
    // Without this the header center is scrollbar_width wider and the right
    // pinned-column header is shifted right relative to the body cells.
    const headerVScrollSpacerEl = createDiv('pg-header-vscroll-spacer');
    headerWrapEl.appendChild(headerVScrollSpacerEl);

    // ── Body ─────────────────────────────────────────────────────────────────
    const bodyWrapEl = createDiv('pg-grid__body');
    mainColEl.appendChild(bodyWrapEl);
    this.bodyWrapEl = bodyWrapEl;

    // Left body panel
    const leftBodyPanelEl = createDiv('pg-panel pg-panel--left');
    const leftBodyEl = createDiv('pg-panel__body');
    const leftBodyContentEl = createDiv('pg-panel__content');
    leftBodyEl.appendChild(leftBodyContentEl);
    leftBodyPanelEl.appendChild(leftBodyEl);
    bodyWrapEl.appendChild(leftBodyPanelEl);
    this.leftBodyPanelEl = leftBodyPanelEl;
    this.leftBodyContentEl = leftBodyContentEl;

    // Center body panel
    const centerBodyPanelEl = createDiv('pg-panel pg-panel--center');
    const centerBodyEl = createDiv('pg-panel__body');
    const centerBodyContentEl = createDiv('pg-panel__content');
    centerBodyEl.appendChild(centerBodyContentEl);
    centerBodyPanelEl.appendChild(centerBodyEl);
    bodyWrapEl.appendChild(centerBodyPanelEl);
    this.centerBodyEl = centerBodyEl;
    this.centerBodyContentEl = centerBodyContentEl;

    // Right body panel
    const rightBodyPanelEl = createDiv('pg-panel pg-panel--right');
    const rightBodyEl = createDiv('pg-panel__body');
    const rightBodyContentEl = createDiv('pg-panel__content');
    rightBodyEl.appendChild(rightBodyContentEl);
    rightBodyPanelEl.appendChild(rightBodyEl);
    bodyWrapEl.appendChild(rightBodyPanelEl);
    this.rightBodyPanelEl = rightBodyPanelEl;
    this.rightBodyContentEl = rightBodyContentEl;

    // Native vertical scrollbar: a flex item beside the panels (not absolutely
    // positioned) so it never overlaps cell content.  The height is governed by
    // the flex container; the scroll range by the inner height spacer.
    const sbVNative = createDiv('pg-scrollbar-v-native');
    const sbVSpacer = createDiv('pg-scrollbar-v-spacer');
    sbVNative.appendChild(sbVSpacer);
    bodyWrapEl.appendChild(sbVNative);

    // Read the actual rendered width of the scrollbar element itself — this is
    // always exact because it is the same element whose width we need to mirror.
    // Accessing offsetWidth forces a synchronous reflow; safe here because
    // sbVNative is already attached to the live DOM tree.
    const sbVWidth = sbVNative.offsetWidth;
    this.wrapperEl!.style.setProperty('--pg-scrollbar-v-width', `${sbVWidth}px`);

    // Horizontal scrollbar row: left spacer | native scroll container | right spacer | v-scroll spacer
    const sbHRowEl = createDiv('pg-scrollbar-h-row');
    const sbHLeftEl = createDiv('pg-scrollbar-h-spacer pg-scrollbar-h-spacer--left');
    const sbHNative = createDiv('pg-scrollbar-h-native');
    const sbHSpacer = createDiv('pg-scrollbar-h-content');
    sbHNative.appendChild(sbHSpacer);
    const sbHRightEl = createDiv('pg-scrollbar-h-spacer pg-scrollbar-h-spacer--right');
    // Mirrors the vertical scrollbar column so the h-scroll track aligns with the center panel
    const sbHVScrollEl = createDiv('pg-scrollbar-h-spacer pg-scrollbar-h-spacer--vscroll');
    sbHRowEl.appendChild(sbHLeftEl);
    sbHRowEl.appendChild(sbHNative);
    sbHRowEl.appendChild(sbHRightEl);
    sbHRowEl.appendChild(sbHVScrollEl);
    mainColEl.appendChild(sbHRowEl);

    // Footer
    if (this.options.showFooter !== false && this.options.pagination?.enabled) {
      this.footerContainerEl = createDiv('pg-grid__footer');
      this.wrapperEl.appendChild(this.footerContainerEl);
    }

    // Mount scroll controller — both V and H use native browser scrollbars
    this.scrollController.mount(this.wrapperEl, bodyWrapEl, centerBodyEl, sbVNative, sbVSpacer, sbHNative, sbHSpacer, sbHRowEl);

    // Suspend touch-panning while a column reorder/resize or a column-group drag
    // owns the pointer, so a long-press pick-up or an edge resize is never fought
    // by kinetic scrolling.
    this.scrollController.setGestureGuard(
      () => this.headerRenderer.isBusy
        || (this.groupDragHandler?.isDragging ?? false)
        || (this.displayGroupEngine?.isDraggingGroup ?? false),
    );

    this.scrollController.onScrollY(() => this.scheduleRender());
    this.scrollController.onScrollX(() => this.scheduleRender());

    // Expose horizontal scroll to header renderer for column drag auto-scroll
    this.headerRenderer.setScrollCallback(
      (dx) => this.scrollController.scrollToX(this.scrollController.getScrollLeft() + dx),
      (dir) => dir < 0 ? this.scrollController.canScrollLeft() : this.scrollController.canScrollRight(),
    );

    // Re-render during column resize so the horizontal scrollbar updates in real time
    this.headerRenderer.setResizeCallback(() => this.scheduleRender());

    // Mount overlay on body (spans all panels)
    this.overlayRenderer.mount(bodyWrapEl);

    // Mount the Master/Detail full-width layer as a sibling of the
    // left/center/right panels — see `DetailRowRenderer` for why detail rows
    // must live outside the pinned-column panel structure entirely.
    if (this.detailRowRenderer) this.detailRowRenderer.mount(bodyWrapEl);

    // Sticky-row layer: a TOP-LEVEL sibling of the panels and the detail
    // layer — deliberately NOT nested inside `.pg-panel--left/right`.
    // Those panels set their own explicit z-index (for pinned-column
    // elevation), which makes each one its own stacking context; anything
    // nested inside — including an earlier version of this layer — is
    // trapped there and can never out-rank `.pg-detail-layer` merely by
    // having a higher z-index of its own. Living at the same level as both
    // lets a single z-index correctly out-rank everything at once, in every
    // pinned/non-pinned column, with no stacking-context surprises.
    if (this.masterDetailEnabledAtConstruction || this.treeDataEnabledAtConstruction) {
      this.buildStickyLayer(bodyWrapEl);
    }

    // Mount the Photon AI command bar — a floating overlay anchored to the
    // body's bottom-right corner. `bodyWrapEl`'s own `overflow: hidden` keeps
    // it inside the grid container; position: absolute keeps it out of the
    // flex layout entirely, so it never affects row/column virtualization.
    if (this.photonAIPanel) {
      this.photonAIPanel.mount(bodyWrapEl, this.options.photonAI!);
    }

    // Mount the Filters Tool Panel into the grid wrapper (not the body) so its
    // launcher floats over the top-right of the header band. Absolute
    // positioning keeps it out of the flex layout, so it never affects
    // row/column virtualization or the header measurements.
    if (this.filtersToolPanel && this.wrapperEl) {
      this.filtersToolPanel.mount(this.wrapperEl, this.options.filtersToolPanel!);
    }

    // Mount the Import menu (launcher + dropdown) into the grid wrapper, and
    // drive the loading overlay from the engine's progress events so the user
    // sees "Parsing… / Mapping… / Rendering…" without this renderer knowing
    // anything about the import pipeline.
    if (this.importMenu && this.wrapperEl) {
      this.importMenu.mount(this.wrapperEl);
      this.unsubscribers.push(
        this.eventBus.on<import('../types/import.types').ImportProgressEvent>(
          GridEventType.IMPORT_PROGRESS,
          (e) => this.overlayRenderer.showLoading(e.message),
        ),
        this.eventBus.on(GridEventType.IMPORT_COMPLETE, () => this.overlayRenderer.hideLoading()),
        this.eventBus.on<import('../types/import.types').ImportErrorEvent>(GridEventType.IMPORT_ERROR, (e) => {
          this.overlayRenderer.hideLoading();
          this.overlayRenderer.showError(e.message);
        }),
      );
    }

    this.tooltipController.mount(bodyWrapEl);

    // Attach cell selection to center content
    this.cellSelectionEngine.attach(centerBodyContentEl);

    // Pass panels to body renderer
    this.bodyRenderer.setPanels(leftBodyContentEl, centerBodyContentEl, rightBodyContentEl);

    // Pass body content panels to cell selection engine for CSS class-based
    // highlighting. The Master/Detail sticky-row containers are included too:
    // a stuck row's cells are physically re-parented out of the normal content
    // panels into the sticky layer, so without scanning those containers
    // `applySelectionClasses` could never highlight the active/selected cell
    // while its row is pinned at the top. A cell only ever lives in one place
    // at a time, so there is no double-processing.
    const selectionPanels: HTMLElement[] = [leftBodyContentEl, centerBodyContentEl, rightBodyContentEl];
    if (this.leftStickyRowEl) selectionPanels.push(this.leftStickyRowEl);
    if (this.centerStickyRowEl) selectionPanels.push(this.centerStickyRowEl);
    if (this.rightStickyRowEl) selectionPanels.push(this.rightStickyRowEl);
    this.cellSelectionEngine.setBodyPanels(selectionPanels);

    // Wire auto-scroll: whenever the active cell changes, scroll it into view
    this.cellSelectionEngine.setScrollToCellCallback((r, c) => this.scrollToCell(r, c));

    // Lets a serial-column row cut clear the row selection before converting the
    // cut region into a cell range.
    this.cellSelectionEngine.setClearRowSelectionCallback(() =>
      this.rowSelectionEngine.deselectAll(this.store.get('visibleRows') as RowNode[]));

    // Wire PageUp/PageDown: return the number of fully visible rows so the
    // engine can jump by exactly one viewport height worth of rows.
    this.cellSelectionEngine.setGetViewportRowCountCallback(() => {
      const vpH    = this.scrollController.getViewportHeight();
      const rowH   = this.options.rowHeight ?? 48;
      return Math.max(1, Math.floor(vpH / rowH));
    });

    // Wire paste/fill/cut invalidation: evict only the mutated rows from the
    // cache so custom cell renderers in unchanged rows are not re-executed.
    this.cellSelectionEngine.setDataChangedCallback((nodeIds) => {
      if (nodeIds && nodeIds.size > 0) {
        this.invalidateBodyRowsByIds(nodeIds);
      } else {
        this.invalidateBodyRows();
      }
    });

    // Wire filter-panel opening: header filter icon click → open panel overlay
    this.headerRenderer.setOpenFilterPanelCallback((col, anchor) => this.openFilterPanel(col, anchor));

    // Wire the inline filter-row text inputs: live per-column filtering as the
    // user types (set-type columns filter through the panel instead).
    this.headerRenderer.setInlineFilterCallback((col, term) => this.applyInlineTextFilter(col, term));

    // Wire the Column Chooser: the column/group menu "Column Chooser…" item opens
    // a themed dialog built from the original (nested) column definitions, with
    // live visibility driven through the ColumnModel.
    this.columnChooser = new ColumnChooser(this.columnModel, this.iconRenderer);
    this.headerRenderer.setColumnChooserCallback(() => {
      this.columnChooser?.open(this.options.columns ?? []);
    });

    // Re-run the pipeline after an aggregate function change so grouped
    // aggregations recompute. filterRefreshFn is GridApi.refresh (set post-construction).
    this.headerRenderer.setColumnDataRefreshCallback(() => this.filterRefreshFn?.());

    // Column context-menu configuration + keyboard header navigation support.
    this.headerRenderer.setMenuOptions(this.options.columnMenu ?? {});
    this.headerRenderer.setColumnMenuItemsCallback(this.options.getColumnMenuItems);
    this.headerRenderer.setEnsureColumnVisibleCallback((colId) => this.ensureColumnVisible(colId));

    // ── Edge auto-scroller ───────────────────────────────────────────────────
    // A single RAF-based AutoScroller handles both cell-range selection drag
    // and fill-handle drag.  When the cursor is within 60 px of the body
    // viewport edges it applies a proportional scroll delta each frame.
    // After each scrolled frame `onScrolled` re-evaluates which cell lies
    // under the cursor so the selection or fill preview stays accurate.
    this.autoScroller = new AutoScroller(
      () => this.bodyWrapEl?.getBoundingClientRect() ?? null,
      (dy) => this.scrollController.scrollToY(this.scrollController.getScrollTop() + dy),
      (dx) => this.scrollController.scrollToX(this.scrollController.getScrollLeft() + dx),
      (cx, cy) => {
        if (this.rowSelectionEngine.isRowDragging) {
          // Row drag: re-hit-test the serial cell under the cursor after scroll.
          this.extendRowDragAtPoint(cx, cy);
        } else if (this.cellSelectionEngine.isSelecting) {
          // Re-hit-test after the grid scrolled so the selection follows.
          const el = document.elementFromPoint(cx, cy) as HTMLElement | null;
          const cellEl = el?.closest<HTMLElement>('[data-row-index][data-col-index]');
          if (!cellEl || !cellEl.hasAttribute('data-col-id')) return;
          const ri = Number(cellEl.getAttribute('data-row-index'));
          const ci = Number(cellEl.getAttribute('data-col-index'));
          if (!isNaN(ri) && !isNaN(ci)) this.cellSelectionEngine.extendSelection(ri, ci);
        } else {
          // Fill-handle drag: re-process fill position after scroll.
          this.cellSelectionEngine.updateFillPosition(cx, cy);
        }
      },
    );

    // Wire fill-handle drag into the auto-scroller via CellSelectionEngine callbacks.
    this.cellSelectionEngine.setFillDragScrollCallback((cx, cy) => this.autoScroller!.updateMouse(cx, cy));
    this.cellSelectionEngine.setFillDragEndCallback(() => this.autoScroller?.stop());

    // Provide the body viewport rect so fill drag can clamp its hit-test
    // coordinates when the cursor exits the grid boundary.
    this.cellSelectionEngine.setDragViewportRectCallback(() => this.bodyWrapEl?.getBoundingClientRect() ?? null);

    // Mouse/pen down on a serial (row-number) cell begins an AG Grid–style row
    // drag-selection. Touch is excluded (a finger-drag pans the grid); only the
    // primary button starts a selection.
    bodyWrapEl.addEventListener('pointerdown', (e) => {
      if (!this.rowSelectionEngine.serialColumnSelection) return;
      if (isTouchPointer(e) || e.button !== 0) return;
      const serial = (e.target as HTMLElement).closest<HTMLElement>('.pg-cell--serial-select');
      if (!serial) return;
      const ri = Number(serial.getAttribute('data-row-index'));
      const nodeId = serial.getAttribute('data-node-id');
      if (isNaN(ri) || !nodeId) return;
      e.preventDefault(); // suppress text selection / focus side-effects
      // Row selection and cell-range selection are mutually exclusive.
      this.cellSelectionEngine.clearSelection();
      this.rowSelectionEngine.beginRowDrag(ri, nodeId, this.store.get('visibleRows') as RowNode[], {
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
      });
      // Row drag scrolls vertically only — the serial anchor cell hugs the left
      // edge, so allowing horizontal auto-scroll would pan the body sideways.
      this.autoScroller?.updateMouse(e.clientX, e.clientY, 'y');
    });

    // Mouse/pen drag to extend selection. Touch is excluded: a finger-drag on
    // the body pans the grid (ScrollController), so range selection stays a
    // mouse/pen affordance — a touch user taps a cell, then shift-taps to extend.
    // Guard on e.buttons: if no button is held (e.g. touchpad hover after
    // keyboard navigation left _isSelecting true), cancel the drag immediately
    // instead of extending the selection on every pointer movement.
    bodyWrapEl.addEventListener('pointermove', (e) => {
      // Serial-column row drag takes priority over cell-range drag.
      if (this.rowSelectionEngine.isRowDragging) {
        if (isTouchPointer(e)) return;
        if (e.buttons === 0) {
          this.rowSelectionEngine.endRowDrag();
          this.autoScroller?.stop();
          return;
        }
        this.autoScroller?.updateMouse(e.clientX, e.clientY, 'y');
        // Once a row drag is underway, hovering anywhere on a row extends the
        // selection to it — not just over the serial cell.
        const rowCell = (e.target as HTMLElement).closest<HTMLElement>('[data-row-index]');
        if (rowCell) {
          const ri = Number(rowCell.getAttribute('data-row-index'));
          if (!isNaN(ri)) this.rowSelectionEngine.extendRowDrag(ri, this.store.get('visibleRows') as RowNode[]);
        }
        return;
      }
      if (!this.cellSelectionEngine.isSelecting) return;
      if (isTouchPointer(e)) return;
      if (e.buttons === 0) {
        this.cellSelectionEngine.endSelection();
        this.autoScroller?.stop();
        return;
      }
      // Feed cursor position to the auto-scroller — triggers edge scrolling
      // when the cursor is within the threshold of the viewport boundary.
      this.autoScroller?.updateMouse(e.clientX, e.clientY);
      const cellEl = (e.target as HTMLElement).closest<HTMLElement>('[data-row-index][data-col-index]');
      if (!cellEl || !cellEl.hasAttribute('data-col-id')) return;
      const ri = Number(cellEl.getAttribute('data-row-index'));
      const ci = Number(cellEl.getAttribute('data-col-index'));
      if (!isNaN(ri) && !isNaN(ci)) this.cellSelectionEngine.extendSelection(ri, ci);
    });

    bodyWrapEl.addEventListener('pointerup', () => {
      this.cellSelectionEngine.endSelection();
      this.rowSelectionEngine.endRowDrag();
      this.autoScroller?.stop();
    });

    // The bodyWrapEl pointerup only fires when the pointer is released inside the
    // grid.  When the auto-scroller is running the user's cursor is outside the
    // viewport edge — releasing there fires no bodyWrapEl event, so scrolling
    // never stops.  A document-level listener catches the release everywhere and
    // is removed in destroy() to prevent leaks.
    const docMouseUp = () => {
      if (this.cellSelectionEngine.isSelecting) {
        this.cellSelectionEngine.endSelection();
      }
      if (this.rowSelectionEngine.isRowDragging) {
        this.rowSelectionEngine.endRowDrag();
      }
      this.autoScroller?.stop();
    };
    document.addEventListener('pointerup', docMouseUp);
    this.unsubscribers.push(() => document.removeEventListener('pointerup', docMouseUp));
  }

  /**
   * Builds the top-level sticky-row layer and its three left/center/right
   * regions, mirroring the pinned-column layout via the same
   * `--pg-left-panel-width` / `--pg-right-panel-width` CSS vars the real
   * panels use — so a stuck row lines up pixel-for-pixel with the columns
   * it belongs to. The center region gets its own horizontal-scroll
   * transform so a stuck row's center cells track the user's horizontal
   * scroll exactly like the real (non-sticky) center panel does.
   */
  private buildStickyLayer(bodyWrapEl: HTMLElement): void {
    const layer = createDiv('pg-sticky-layer');

    this.leftStickyRowEl = createDiv('pg-sticky-layer__left');
    layer.appendChild(this.leftStickyRowEl);

    const centerRegion = createDiv('pg-sticky-layer__center');
    this.centerStickyRowEl = createDiv('pg-sticky-layer__center-inner');
    centerRegion.appendChild(this.centerStickyRowEl);
    layer.appendChild(centerRegion);

    this.rightStickyRowEl = createDiv('pg-sticky-layer__right');
    layer.appendChild(this.rightStickyRowEl);

    bodyWrapEl.appendChild(layer);
    this.bodyRenderer.setStickyContainers(this.leftStickyRowEl, this.centerStickyRowEl, this.rightStickyRowEl);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  private performRender(): void {
    const rows       = this.store.get('visibleRows') as RowNode[];
    const rawCols    = this.store.get('columns') as ColumnDef[];
    const groupedIds = this.store.get('groupedColumnIds') as string[];
    const loading    = this.store.get('loading') as boolean;

    const allColumns = rawCols.filter((c) => c.visible !== false);
    const leftCols   = allColumns.filter((c) => c.pinned === 'left');
    const centerCols = allColumns.filter((c) => c.pinned !== 'left' && c.pinned !== 'right');
    const rightCols  = allColumns.filter((c) => c.pinned === 'right');

    const rowHeight = this.options.rowHeight ?? 48;
    const w = this.wrapperEl!;

    // ── Column / grouping-dependent work ──────────────────────────────────────
    // Skipped on scroll-only frames: columns and grouping never change during
    // a scroll event, so the store returns the same array reference each time.
    // initFromColumns calls flush() which rewrites the entire column <style> tag —
    // running it at 60 fps wastes ~1 ms/frame for nothing.
    const colsChanged     = rawCols    !== this._lastColumnsRef;
    const groupingChanged = groupedIds !== this._lastGroupedIdsRef;

    // Derived from groupedIds — always available for the horizontal scroll logic below.
    const hasGroupedColumns = groupedIds.length > 0;

    // ColumnDef for the deepest grouping field — used by leaf data rows in the
    // auto-group column.  Looked up in rawCols (all columns, including hidden
    // ones) so that grouping by a hidden column still shows leaf values.
    const leafGroupColDef = hasGroupedColumns
      ? (rawCols.find((c) => c.colId === groupedIds[groupedIds.length - 1]) ?? null)
      : null;

    if (colsChanged || groupingChanged) {
      this._lastColumnsRef    = rawCols;
      this._lastGroupedIdsRef = groupedIds;

      this.colStyles.initFromColumns(allColumns);

      const showCb = this.options.showCheckboxes ? CHECKBOX_COL_WIDTH : 0;
      const showSn = this.options.showSerialNumber ? SERIAL_COL_WIDTH : 0;
      const leftPinnedWidth   = this.colStyles.getTotalWidth(leftCols.map((c) => c.colId));
      const rightContentWidth = this.colStyles.getTotalWidth(rightCols.map((c) => c.colId));

      const hasLeft  = showCb > 0 || showSn > 0 || leftCols.length > 0;
      const hasRight = rightCols.length > 0;

      // Set left/right panel CSS vars BEFORE resolving flex so that
      // centerBodyEl.clientWidth reflects the true center panel width.
      w.style.setProperty('--pg-left-panel-width',  hasLeft  ? `${showCb + showSn + leftPinnedWidth}px` : '0px');
      w.style.setProperty('--pg-right-panel-width', hasRight ? `${rightContentWidth + 2}px`                 : '0px');

      // Show/hide left/right panels BEFORE the flex measurement below. A panel
      // toggling from display:none to visible (e.g. the first time a column is
      // pinned to that side) changes the center panel's width; doing it after
      // the clientWidth read would resolve flex against the stale, pre-pin
      // center width, leaving the center columns mis-sized until the next
      // column change happens to re-measure. Setting display first means the
      // forced reflow from reading clientWidth sees the correct layout.
      if (this.leftBodyPanelEl) {
        this.leftBodyPanelEl.style.setProperty('display', hasLeft ? '' : 'none');
        if (this.leftHeaderPanelEl?.parentElement) {
          this.leftHeaderPanelEl.parentElement.style.setProperty('display', hasLeft ? '' : 'none');
        }
      }
      if (this.rightBodyPanelEl) {
        this.rightBodyPanelEl.style.setProperty('display', hasRight ? '' : 'none');
        if (this.rightHeaderPanelEl?.parentElement) {
          this.rightHeaderPanelEl.parentElement.style.setProperty('display', hasRight ? '' : 'none');
        }
      }

      // Resolve flex columns — clientWidth read forces a layout reflow;
      // done here so it only happens when column definitions change.
      const centerColIds = centerCols.map((c) => c.colId);
      if (this.colStyles.hasFlex(centerColIds)) {
        const centerPanelW = this.centerBodyEl?.clientWidth ?? 0;
        if (centerPanelW > 0) {
          this.colStyles.resolveFlex(centerColIds, centerPanelW);
          this._lastFlexResolvedWidth = centerPanelW;
        }
      }

      const centerContentWidth = this.colStyles.getTotalWidth(centerColIds)
        + (hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0);
      this._cachedCenterW = centerContentWidth;

      w.style.setProperty('--pg-center-content-width', `${centerContentWidth}px`);
    } else if (this.colStyles.hasFlex(centerCols.map((c) => c.colId))) {
      // Columns didn't change, but the container may have resized with no
      // columns-array change to signal it — e.g. a vertical scrollbar
      // transiently appearing/disappearing as a Master/Detail row is
      // inserted, or a plain window resize. Flex columns must track that,
      // or they stay sized for a stale width and show a spurious scrollbar
      // (or an unfilled gap) until something else happens to touch the
      // columns array (resize/sort/pin) and incidentally re-resolves them.
      const centerColIds = centerCols.map((c) => c.colId);
      const centerPanelW = this.centerBodyEl?.clientWidth ?? 0;
      if (centerPanelW > 0 && Math.abs(centerPanelW - this._lastFlexResolvedWidth) > 1) {
        this.colStyles.resolveFlex(centerColIds, centerPanelW);
        this._lastFlexResolvedWidth = centerPanelW;
        const centerContentWidth = this.colStyles.getTotalWidth(centerColIds)
          + (hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0);
        this._cachedCenterW = centerContentWidth;
        w.style.setProperty('--pg-center-content-width', `${centerContentWidth}px`);
      }
    }

    // ── Row-dependent work ────────────────────────────────────────────────────
    // The total-height O(n) loop and scrollController.updateSizes are skipped
    // when the rows reference hasn't changed (i.e. during scroll-only frames).
    const rowsChanged = rows !== this._lastRowsRef;
    if (rowsChanged) {
      this._lastRowsRef = rows;

      let totalHeight = 0;
      for (const row of rows) totalHeight += row.height ?? rowHeight;
      this._cachedTotalHeight = totalHeight;

      w.style.setProperty('--pg-content-height', `${totalHeight}px`);
      this.scrollController.updateSizes(totalHeight, this._cachedCenterW);
    } else if (colsChanged || groupingChanged) {
      // Center width changed but row count did not — update the horizontal size only.
      this.scrollController.updateSizes(this._cachedTotalHeight, this._cachedCenterW);
    } else if (this.headerRenderer.isResizingColumn) {
      // A live column-width drag never touches the `columns` store reference
      // (ColumnModel.setColumnWidth only fires on mouseup) — `colsChanged`
      // stays false for the whole gesture, so the block above never runs.
      // Recompute the panel widths straight from the already-known column
      // widths (no DOM measurement needed) so the pinned-left/right container
      // widths AND the horizontal scrollbar spacer track the resize in real
      // time instead of jumping only once the mouse is released.
      //
      // Mirrors the `--pg-left/right-panel-width` computation in the
      // colsChanged branch above so a left/right pinned column resize keeps its
      // panel exactly as wide as its columns at every frame of the drag.
      const showCb = this.options.showCheckboxes ? CHECKBOX_COL_WIDTH : 0;
      const showSn = this.options.showSerialNumber ? SERIAL_COL_WIDTH : 0;
      const leftPinnedWidth   = this.colStyles.getTotalWidth(leftCols.map((c) => c.colId));
      const rightContentWidth = this.colStyles.getTotalWidth(rightCols.map((c) => c.colId));
      const hasLeft  = showCb > 0 || showSn > 0 || leftCols.length > 0;
      const hasRight = rightCols.length > 0;
      w.style.setProperty('--pg-left-panel-width',  hasLeft  ? `${showCb + showSn + leftPinnedWidth}px` : '0px');
      w.style.setProperty('--pg-right-panel-width', hasRight ? `${rightContentWidth + 2}px`             : '0px');

      const centerColIds = centerCols.map((c) => c.colId);
      const liveCenterW = this.colStyles.getTotalWidth(centerColIds) + (hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0);
      this._cachedCenterW = liveCenterW;
      w.style.setProperty('--pg-center-content-width', `${liveCenterW}px`);
      this.scrollController.updateSizes(this._cachedTotalHeight, liveCenterW);
    }

    if (loading) {
      this.overlayRenderer.showLoading(this.options.loadingOverlayText);
      return;
    }
    this.overlayRenderer.hideLoading();

    if (rows.length === 0) {
      this.overlayRenderer.showNoRows(this.options.noRowsOverlayHtml, this.options.noRowsOverlayText);
    } else {
      this.overlayRenderer.hideNoRows();
    }

    // ── Horizontal virtual scroll: compute visible center col range ───────────
    const scrollLeft = this.scrollController.getScrollLeft();
    const centerViewportW = this.centerBodyEl?.clientWidth ?? 800;

    // Accumulate column positions to find the first/last visible col
    let accumX = hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0;
    let visColStart = centerCols.length; // pessimistic
    let visColEnd = 0;
    for (let i = 0; i < centerCols.length; i++) {
      const cw = this.colStyles.getWidth(centerCols[i].colId);
      const colLeft = accumX;
      const colRight = accumX + cw;
      if (colRight > scrollLeft && visColStart > i) visColStart = i;
      if (colLeft < scrollLeft + centerViewportW) visColEnd = i + 1;
      accumX += cw;
    }
    if (visColStart === centerCols.length) { visColStart = 0; visColEnd = 0; }

    // During a column drag, expand the virtual column range to all center columns
    // so the dragged column and every potential drop target remain in the DOM for
    // both header and body.  The pg-grid--col-autoscrolling class added at drag
    // start suppresses the 180 ms transition during this initial range expansion,
    // preventing newly-added body cells from animating in from transform:0.
    const isDraggingCol = this.headerRenderer.isDraggingCol;
    const isDraggingGroup = this.displayGroupEngine?.isDraggingGroup ?? false;
    const colBuf = (isDraggingCol || isDraggingGroup) ? centerCols.length : COL_BUFFER;
    const colStart = Math.max(0, visColStart - colBuf);
    const colEnd   = Math.min(centerCols.length, visColEnd + colBuf);

    // Spacer widths represent off-screen columns
    const leftSpacerW  = this.colStyles.getTotalWidth(centerCols.slice(0, colStart).map((c) => c.colId));
    const rightSpacerW = this.colStyles.getTotalWidth(centerCols.slice(colEnd).map((c) => c.colId));
    const visibleCenterCols = centerCols.slice(colStart, colEnd);

    // Build header once (rebuilt when columns change)
    const headerOptions = {
      showCheckboxes: this.options.showCheckboxes,
      showSerialNumber: this.options.showSerialNumber,
      showColumnMenu: this.options.showColumnMenu !== false,
      showFilterRow: this.options.showFilterRow,
      headerRowHeight: this.options.headerRowHeight,
      filterRowHeight: this.options.filterRowHeight,
      hasGroupedColumns,
      autoGroupColWidth: AUTO_GROUP_COL_WIDTH,
      filterIconDisplay: this.options.headerIcons?.filter,
      menuIconDisplay: this.options.headerIcons?.menu,
    };
    if (!this.headerRendered && this.leftHeaderPanelEl && this.centerHeaderInnerEl && this.rightHeaderPanelEl) {
      this.headerRenderer.renderInPanels(
        this.leftHeaderPanelEl,
        this.centerHeaderInnerEl,
        this.rightHeaderPanelEl,
        allColumns,
        headerOptions,
      );
      this.headerRendered = true;
    }

    // Update center header when the column range changes.
    if (colStart !== this.lastCenterColStart || colEnd !== this.lastCenterColEnd) {
      this.headerRenderer.updateCenterVisibleCols(visibleCenterCols, leftSpacerW, rightSpacerW, headerOptions);
      this.lastCenterColStart = colStart;
      this.lastCenterColEnd = colEnd;
    }

    // Vertical virtual scroll range
    const scrollTop = this.scrollController.getScrollTop();
    const viewportHeight = this.centerBodyEl?.clientHeight ?? 400;
    const buffer = this.options.virtualScroll?.rowBuffer ?? ROW_BUFFER;
    // During animation, expand the render window by one extra viewport so rows
    // just outside the buffer are already in the DOM and can participate in FLIP.
    const animExtra = this.rowAnimator.hasPending() ? Math.ceil(viewportHeight / rowHeight) : 0;
    const isAutoHeight = this.options.rowHeightMode === 'auto';
    let start: number;
    let end: number;
    if (isAutoHeight) {
      const bufferPx = (buffer + animExtra) * rowHeight;
      const viewStart = scrollTop - bufferPx;
      const viewEnd = scrollTop + viewportHeight + bufferPx;
      start = 0;
      end = rows.length;
      for (let i = 0; i < rows.length; i++) {
        if ((rows[i].top + (rows[i].height ?? rowHeight)) >= viewStart) { start = i; break; }
      }
      for (let i = start; i < rows.length; i++) {
        if (rows[i].top > viewEnd) { end = i; break; }
      }
    } else {
      start = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer - animExtra);
      end = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer + animExtra);
    }

    // ── Master/Detail sticky row ────────────────────────────────────────────
    // See `StickyRowTracker` for the full rule. `minStart` widens the render
    // window when needed so the sticky row's cells stay rendered even though
    // virtualization would otherwise have scrolled past its natural position.
    let stickyNodeId: string | null = null;
    let stickyOffsetPx = 0;
    let treeStickyEntries: TreeStickyEntry[] = [];
    if (this.masterDetailEnabledAtConstruction) {
      const sticky = this.stickyRowTracker.compute(rows, scrollTop, rowHeight, start);
      stickyNodeId = sticky.nodeId;
      stickyOffsetPx = sticky.offsetPx;
      start = sticky.minStart;
    } else if (this.treeExpansionService) {
      // Tree Data's generalization of the same rule — see `TreeStickyRowTracker`:
      // every ancestor of the row currently at the viewport's top stacks as
      // its own sticky row, instead of there only ever being one.
      const sticky = this.treeStickyRowTracker.compute(rows, scrollTop, rowHeight, start);
      treeStickyEntries = sticky.entries;
      start = sticky.minStart;
    }
    this.stickyNodeId = stickyNodeId;

    // Update row position stylesheet for visible rows.
    // In auto-height mode always use rowHeight as min-height so that widening a
    // column allows rows to shrink back — the previously measured row.height must
    // not pin min-height or rows can never get shorter.
    this.rowPositionSheet.update(
      rows.slice(start, end).map((row) => ({
        nodeId: row.nodeId,
        top: row.top,
        height: isAutoHeight ? rowHeight : (row.height ?? rowHeight),
      })),
      isAutoHeight,
    );

    // Render body rows with visible center col slice + spacer info.
    // During an active column resize the CSS style tag (ColumnStyleManager) has
    // already updated every [data-col-id] element's width, so the body DOM is
    // visually correct without a full renderRows pass.  Calling renderRows on
    // every mousemove would wipe and rebuild all center panels whenever the
    // virtual column range shifts by even 1 column — destroying and re-creating
    // custom cell renderers (images, flags, etc.) and causing visible blinking.
    // We skip renderRows while resizing and instead only advance the tracked
    // range so the next normal paint (after mouseup) does not see a stale range.
    const renderedRows = rows.slice(start, end);

    const masterDetailOptions = this.masterDetailEngine?.isEnabled()
      ? {
          toggleColumnId: this.masterDetailEngine.getConfig()?.toggleColumnId ?? allColumns[0]?.colId ?? '',
          isExpandedFn: (nodeId: string) => this.masterDetailEngine!.isExpanded(nodeId),
          hasDetailFn: (rowData: Record<string, unknown>) => this.masterDetailEngine!.hasDetail(rowData),
        }
      : undefined;

    const treeDataOptions = this.treeExpansionService
      ? {
          toggleColumnId: this.treeToggleColumnId ?? allColumns[0]?.colId ?? '',
          isExpandedFn: (nodeId: string) => this.treeExpansionService!.isExpanded(nodeId),
        }
      : undefined;

    if (this.headerRenderer.isResizingColumn) {
      this.bodyRenderer.syncCenterRange(colStart, colStart + visibleCenterCols.length);
    } else {
      this.bodyRenderer.renderRows(renderedRows, leftCols, visibleCenterCols, rightCols, {
        showCheckboxes: this.options.showCheckboxes,
        showSerialNumber: this.options.showSerialNumber,
        serialColumnSelection: this.rowSelectionEngine.serialColumnSelection,
        showVerticalBorders: this.options.showVerticalBorders,
        rowShading: this.options.rowShading,
        rowHeight: this.options.rowHeight,
        dateFormat: this.options.dateFormat,
        timeZone: this.options.timeZone,
        currencySymbol: this.options.currencySymbol,
        locale: this.options.locale,
        api: null,
        showGroupsColumn: hasGroupedColumns,
        autoGroupColWidth: AUTO_GROUP_COL_WIDTH,
        leafGroupColDef,
        // Unfiltered (includes columns hidden because they're currently
        // grouped by) so a group row's `groupField` always resolves to its
        // ColumnDef, even though that column itself isn't rendered as a cell.
        allLeafColumns: rawCols,
        centerColStart: colStart,
        centerLeftSpacerW: leftSpacerW,
        centerRightSpacerW: rightSpacerW,
        totalCenterCols: centerCols.length,
        masterDetail: masterDetailOptions,
        treeData: treeDataOptions,
      });
    }

    if (this.detailRowRenderer) {
      const allDetailNodeIds = new Set(rows.filter((r) => r.type === 'detail').map((r) => r.nodeId));
      const windowedDetailRows = renderedRows.filter((r) => r.type === 'detail');
      this.detailRowRenderer.sync(windowedDetailRows, allDetailNodeIds);
    }

    if (this.masterDetailEnabledAtConstruction) {
      this.bodyRenderer.setStickyRows(stickyNodeId ? [{ nodeId: stickyNodeId, top: stickyOffsetPx }] : []);
    } else if (this.treeExpansionService) {
      this.bodyRenderer.setStickyRows(treeStickyEntries);
    }

    // Animate rows after sort (FLIP slide) or filter (FLIP slide + fade-in for new rows)
    if (this.rowAnimator.hasPending()) {
      const animContainers = [
        this.leftBodyContentEl,
        this.centerBodyContentEl,
        this.rightBodyContentEl,
      ].filter(Boolean) as HTMLElement[];
      this.rowAnimator.animate(animContainers, renderedRows, viewportHeight);
    }

    // Auto-height measurement pass: read actual row heights and sync all panels
    if (isAutoHeight) {
      const nodeIdToRow = new Map(renderedRows.map((r) => [r.nodeId, r]));
      const measured = new Map<string, number>();

      for (const panel of [this.leftBodyContentEl, this.centerBodyContentEl, this.rightBodyContentEl]) {
        if (!panel) continue;
        for (const el of panel.querySelectorAll<HTMLElement>('[data-node-id]')) {
          const nodeId = el.getAttribute('data-node-id');
          if (!nodeId) continue;
          const h = el.offsetHeight;
          if (h > 0) measured.set(nodeId, Math.max(measured.get(nodeId) ?? 0, h));
        }
      }

      let anyChanged = false;
      for (const [nodeId, h] of measured) {
        const row = nodeIdToRow.get(nodeId);
        if (row && h !== row.height) { row.height = h; anyChanged = true; }
      }

      if (anyChanged) {
        let top = 0;
        for (const row of rows) { row.top = top; top += row.height ?? rowHeight; }
        this.rowPositionSheet.update(
          renderedRows.map((r) => ({ nodeId: r.nodeId, top: r.top, height: rowHeight })),
          true,
        );
        this._cachedTotalHeight = top;
        w.style.setProperty('--pg-content-height', `${top}px`);
        this.scrollController.updateSizes(top, this._cachedCenterW);
      }
    }

    this.store.set('firstRenderedRowIndex', start);
    this.store.set('lastRenderedRowIndex', end);

    // Footer
    if (this.footerContainerEl) {
      if (!this.footerContainerEl.hasChildNodes()) {
        this.footerRenderer.render(this.footerContainerEl, {
          showPagination: this.options.pagination?.enabled,
          showRowCount: true,
          footerHeight: this.options.footerRowHeight,
        });
      } else {
        this.footerRenderer.updatePaginationState();
      }
    }

    // Only query-select and re-classify cells when there is an active selection.
    // During unselected scroll this querySelectorAll over ~600 cells is pure waste.
    const hasSelection = (this.store.get('cellRanges') as CellRange[]).length > 0
      || this.store.get('activeCell') !== null;
    if (hasSelection) {
      this.cellSelectionEngine.applySelectionClasses();
    }

    this.eventBus.emit(GridEventType.ROWS_RENDERED, { renderedCount: renderedRows.length });

  }

  // ─── Store subscriptions ──────────────────────────────────────────────────

  private subscribeToStore(): void {
    this.unsubscribers.push(
      this.store.watch('visibleRows', () => this.scheduleRender()),

      this.store.watch('loading', () => this.scheduleRender()),

      this.store.watch('columns', () => {
        if (this.headerRenderer.isDraggingCol || this.displayGroupEngine?.isDraggingGroup) {
          // Live drag (leaf column or group): skip header destroy so drag state
          // and live-preview group rows are preserved. Only reset body + virtual
          // column range so body cells and panel widths stay in sync.
          this.wrapperEl?.classList.add('pg-grid--drag-preview-sync');
          this.lastCenterColStart = -1;
          this.lastCenterColEnd = -1;
          this.bodyRenderer.clear();
          this.scheduleRender();
          requestAnimationFrame(() => {
            this.wrapperEl?.classList.remove('pg-grid--drag-preview-sync');
          });
          return;
        }
        this.headerRendered = false;
        this.lastCenterColStart = -1;
        this.lastCenterColEnd = -1;
        if (this.leftHeaderPanelEl) this.leftHeaderPanelEl.innerHTML = '';
        if (this.centerHeaderInnerEl) this.centerHeaderInnerEl.innerHTML = '';
        if (this.rightHeaderPanelEl) this.rightHeaderPanelEl.innerHTML = '';
        this.headerRenderer.destroy();
        // Re-wire group model references cleared by destroy() — this is required
        // whenever columns change due to collapse/expand (setColumnVisible fires
        // COLUMNS_STATE_CHANGED which updates the store, triggering this watcher).
        // Without re-wiring here, the next renderInPanels call would build no group rows.
        this.rewireGroupModelIntoHeaderRenderer();
        this.bodyRenderer.clear();
        this.scheduleRender();
      }),

      this.store.watch('groupedColumnIds', () => {
        this.groupDropZone?.update();
      }),

      this.store.watch('filterModel', (model) => {
        const activeColIds = new Set(Object.keys(model as FilterModel));
        this.headerRenderer.updateFilterIndicators(activeColIds);
        this.filtersToolPanel?.syncFromModel(model as FilterModel);
      }),

      this.store.watch('scrollTop', () => this.scheduleRender()),

      this.store.watch('selectedRowIds', (ids) => {
        const rows = this.store.get('visibleRows') as RowNode[];
        for (const row of rows) {
          this.bodyRenderer.updateRowSelection(row.nodeId, (ids as Set<string>).has(row.nodeId));
        }
        // Redraw the block outline around the (new) contiguous selected runs.
        this.bodyRenderer.refreshRowSelectionEdges();
      }),

      this.store.watch('isAllSelected', (isAll) => {
        const isInd = this.store.get('isIndeterminate') as boolean;
        this.headerRenderer.updateAllChecked(isAll as boolean, isInd);
      }),

      this.store.watch('cellRanges', () => {
        this.cellSelectionEngine.applySelectionClasses();
      }),

      this.store.watch('activeCell', () => {
        this.cellSelectionEngine.applySelectionClasses();
      }),
    );

    this.eventBus.on(GridEventType.ALL_ROWS_SELECTED, (payload: unknown) => {
      const p = payload as { action?: string };
      if (p?.action === 'selectAll') {
        this.rowSelectionEngine.selectAll(this.store.get('allRows') as RowNode[]);
      } else if (p?.action === 'deselectAll') {
        this.rowSelectionEngine.deselectAll(this.store.get('allRows') as RowNode[]);
      }
    });

    // Cell click → start, extend, or multi-range selection
    this.eventBus.on(GridEventType.CELL_CLICKED, (payload: unknown) => {
      const p = payload as { rowIndex: number; colIndex: number; event: MouseEvent };
      // Row selection and cell-range selection are mutually exclusive: clicking
      // into cells clears any serial-column row selection (and vice-versa).
      if (this.rowSelectionEngine.serialColumnSelection && this.store.get('selectedRowIds').size > 0) {
        this.rowSelectionEngine.deselectAll(this.store.get('visibleRows') as RowNode[]);
      }
      if (p.event.shiftKey) {
        // Shift+Click: extend range from existing anchor to clicked cell
        this.cellSelectionEngine.extendSelection(p.rowIndex, p.colIndex);
      } else if (p.event.ctrlKey || p.event.metaKey) {
        // Ctrl/Cmd+Click: add or remove a single cell from multi-range selection
        this.cellSelectionEngine.addRangeCell(p.rowIndex, p.colIndex);
      } else {
        this.cellSelectionEngine.startSelection(p.rowIndex, p.colIndex);
      }
    });

    // Right-click → show context menu (select cell if not already in range)
    this.eventBus.on(GridEventType.CELL_CONTEXT_MENU, (payload: unknown) => {
      const p = payload as { rowIndex: number; colIndex: number; x: number; y: number };
      if (!this.cellSelectionEngine.isCellSelected(p.rowIndex, p.colIndex)) {
        this.cellSelectionEngine.startSelection(p.rowIndex, p.colIndex);
      }
      this.cellSelectionEngine.showContextMenu(p.x, p.y);
    });
  } 

  // ── Column-group handlers ─────────────────────────────────────────────────

  /**
   * Called when the user clicks a group collapse/expand toggle.
   *
   * When **collapsing**: hides all leaf columns except the first one (the "peek"
   * column) so the group header continues to show meaningful data.
   * When **expanding**: restores all leaf columns to visible.
   *
   * `setColumnVisible` fires `COLUMNS_STATE_CHANGED` → full rebuild.
   */
  private handleGroupToggle(groupId: string): void {
    // New Display Group Engine path
    if (this.displayGroupEngine) {
      this.displayGroupEngine.toggleGroup(groupId);
      return;
    }
    // Legacy ColumnGroupModel path
    if (!this.columnGroupModel) return;
    const group = this.columnGroupModel.getGroup(groupId);
    if (!group) return;
    const wasCollapsed = group.collapsed;
    this.columnGroupModel.toggleGroup(groupId);
    const isNowCollapsed = !wasCollapsed;
    const leaves = this.columnGroupModel.getLeavesInGroup(groupId);
    for (let i = 0; i < leaves.length; i++) {
      const visible = !isNowCollapsed || i === 0;
      this.columnModel.setColumnVisible(leaves[i].colId, visible);
    }
  }

  /**
   * Called when the user drags a group resize handle.
   * Distributes the new width proportionally among all visible leaf columns.
   */
  private handleGroupResize(groupId: string, newWidth: number): void {
    // New Display Group Engine path — instanceId resolves leaves internally
    if (this.displayGroupEngine) {
      this.displayGroupEngine.resizeGroup(groupId, newWidth);
      this.scheduleRender();
      return;
    }
    // Legacy ColumnGroupModel path
    if (!this.columnGroupModel) return;
    const group = this.columnGroupModel.getGroup(groupId);
    if (!group) return;
    const currentWidth = this.columnGroupModel.computeGroupWidth(groupId, this.colStyles);
    if (currentWidth <= 0 || Math.abs(newWidth - currentWidth) < 1) return;
    const ratio  = newWidth / currentWidth;
    const leaves = this.columnGroupModel.getLeavesInGroup(groupId);
    for (const leaf of leaves) {
      const oldW = this.colStyles.getWidth(leaf.colId);
      const newW = Math.max(leaf.minWidth ?? 40, Math.round(oldW * ratio));
      this.colStyles.setWidth(leaf.colId, newW);
      this.columnModel.setColumnWidth(leaf.colId, newW, false);
    }
    this.scheduleRender();
  }

  /**
   * Re-wires column-group references back into `HeaderRenderer` after
   * `headerRenderer.destroy()` has cleared them.
   */
  private rewireGroupModelIntoHeaderRenderer(): void {
    // New Display Group Engine path takes priority
    if (this.displayGroupEngine) {
      this.headerRenderer.setDisplayGroupEngine(this.displayGroupEngine);
      this.headerRenderer.setGroupToggleCallback((gid) => this.handleGroupToggle(gid));
      this.headerRenderer.setGroupResizeCallback((gid, w) => this.handleGroupResize(gid, w));
      return;
    }
    // Legacy ColumnGroupModel path
    if (!this.columnGroupModel || !this.groupHeaderBuilder) return;
    this.headerRenderer.setColumnGroupModel(this.columnGroupModel, this.groupHeaderBuilder);
    this.headerRenderer.setGroupToggleCallback((gid) => this.handleGroupToggle(gid));
    this.headerRenderer.setGroupResizeCallback((gid, w) => this.handleGroupResize(gid, w));
    if (this.groupDragHandler) {
      this.groupHeaderBuilder.setDragConfig(this.groupDragHandler, () => this.wrapperEl);
      this.headerRenderer.setGroupDragHandler(this.groupDragHandler);
    }
  }

  /**
   * Full header rebuild — clears inner HTML and resets the rendered flag so
   * the next `performRender` call re-runs `renderInPanels` with the current
   * group model state.
   */
  private rebuildHeader(): void {
    this.headerRendered = false;
    this.lastCenterColStart = -1;
    this.lastCenterColEnd = -1;
    if (this.leftHeaderPanelEl)   this.leftHeaderPanelEl.innerHTML = '';
    if (this.centerHeaderInnerEl) this.centerHeaderInnerEl.innerHTML = '';
    if (this.rightHeaderPanelEl)  this.rightHeaderPanelEl.innerHTML = '';
    this.headerRenderer.destroy();
    this.rewireGroupModelIntoHeaderRenderer();
    this.scheduleRender();
  }

  private generateId(): string {
    return `pg_${Math.random().toString(36).slice(2, 9)}`;
  }

}
