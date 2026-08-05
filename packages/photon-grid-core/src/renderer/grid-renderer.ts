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
import type { BodyRendererOptions } from './body-renderer';
import { PatchScheduler } from './vdom/patch-scheduler';
import type { VDomStats } from './vdom/vdom.types';
import { RowDragRenderer } from './row-drag-renderer';
import { FooterRenderer } from './footer-renderer';
import { OverlayRenderer } from './overlay-renderer';
import { ColumnStyleManager } from './column-style-manager';
import { ColumnAnimator, computeColumnPositions, type ColumnPosition } from './column-animator';
import {
  ColumnChangeKind,
  EMPTY_COLUMN_LAYOUT,
  captureColumnLayout,
  diffColumnLayout,
  type ColumnLayoutSnapshot,
} from './column-layout-diff';
import { RowPositionSheet } from './row-position-sheet';
import { ScrollController } from './scroll-controller';
import { SummaryRowRenderer, type SummaryBandRow } from '../summary/summary-row-renderer';
import type { SummaryModel } from '../summary/summary-model';
import { SummaryPosition } from '../summary/summary.types';
import { GridResizeController } from './grid-resize-controller';
import { MAX_ELEMENT_HEIGHT_PX } from './scroll-track';
import { AutoScroller } from './auto-scroller';
import { CellSelectionEngine } from '../cell-selection/cell-selection-engine';
import { RowAnimator } from './row-animator';
import { FilterPanel } from '../engines/filter/filter-panel';
import type { FilterSetOption } from '../engines/filter/filter-panel';
import { FiltersToolPanel } from './filters-tool-panel';
import { ImportMenu } from './import-menu';
import { Toolbar } from './toolbar';
import { ThemeManagerPanel } from './theme-manager-panel';
import type { PhotonThemeApi } from '../types/theme-ai.types';
import { ImportSourceType } from '../types/import.types';
import { createDiv } from './dom-utils';
import type { PluginLayerOptions, RenderWindow, ScrollMetrics } from '../plugins/plugin.types';

/**
 * The slice of `PluginHost` the renderer calls back into.
 *
 * Declared structurally rather than importing the class so the renderer keeps no
 * runtime dependency on the plugin subsystem — a grid without plugins never
 * touches it.
 */
export interface PluginHostSeam {
  wantsRenderWindow(): boolean;
  dispatchRenderWindow(window: RenderWindow): void;
}
import type { MasterDetailEngine } from '../engines/master-detail/master-detail-engine';
import type { TreeExpansionService } from '../engines/tree/tree-expansion-service';
import type { ThemeManager } from '../theme/theme-manager';
import { DetailRowRenderer, type NestedGridFactory } from './detail-row-renderer';
import type { DetailComponent } from '../types/detail-component.types';
import { StickyRowTracker } from './sticky-row-tracker';
import { TreeStickyRowTracker, type TreeStickyEntry } from './tree-sticky-row-tracker';
import { PhotonAIPanel } from '../photon-ai/photon-ai-panel';
import { TooltipController } from './tooltip-renderer';
import type { PhotonCommandResult } from '../photon-ai/photon-ai.types';

const CHECKBOX_COL_WIDTH = 44;
const SERIAL_COL_WIDTH = 52;
const ROW_BUFFER = 5;
const COL_BUFFER = 2;
/**
 * Off-screen column buffer used while a column or group drag is in progress.
 *
 * Wider than {@link COL_BUFFER} so drop slots just past the viewport edge stay
 * hit-testable without an auto-scroll round trip, but bounded — the grabbed
 * column itself is pinned into the range separately, so this does not need to
 * cover the whole column set.
 */
const DRAG_COL_BUFFER = 8;
const AUTO_GROUP_COL_WIDTH = 200;

/**
 * Width (px) of the divider a pinned panel draws on the edge facing the data.
 *
 * Published *on top of* the panel's column widths in `--pg-left-panel-width`,
 * because the divider is a real `border-right` and every element inside the
 * grid is `box-sizing: border-box` — so a panel sized to exactly its columns
 * has a content box 1px narrower than them, and the last pinned column loses
 * its rightmost pixel to the clip.
 *
 * That pixel is precisely where a cell paints its right-hand edge: the
 * range-selection outline (`.pg-cell--sel-right::after`), the focused cell's
 * 2px ring, and the fill handle all lose their right side on the last pinned
 * column while rendering fine everywhere else. Carrying the allowance in the
 * variable rather than in the panel rule keeps every other consumer of it —
 * the summary band's left region, the horizontal scrollbar's left spacer, the
 * Master/Detail layer's left offset, the plugin render window — describing the
 * same geometry the panel actually occupies.
 *
 * The right panel reaches the same place from the other direction: it is
 * published at `+2` and the stylesheet takes 1px back with a `calc()`.
 */
const PINNED_DIVIDER_WIDTH = 1;


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

  /**
   * Container resizing — owns the edge/corner handles and is the single place
   * the container's width/height are written, including by the `GridApi` size
   * methods. Always constructed; inert (no handles mounted) unless
   * `GridOptions.resize` enables it.
   */
  private readonly gridResize: GridResizeController;

  // ── Summary Rows ──────────────────────────────────────────────────────────
  /**
   * Definition + value store for summary rows. `null` until `setSummaryModel`,
   * and left `null` for grids that never define any, so the whole feature costs
   * one null check per frame when unused.
   */
  private summaryModel: SummaryModel | null = null;
  /**
   * The four possible bands, keyed `${position}:${sticky}`. Created lazily on
   * first use — a grid with only a bottom total allocates one, not four.
   */
  private readonly summaryBands = new Map<string, SummaryRowRenderer>();
  /** Flex column the sticky bands are inserted into (between header and body / body and h-scrollbar). */
  private summaryHostEl: HTMLElement | null = null;
  /** Absolutely-positioned layer inside the body that hosts the non-sticky (in-content) bands. */
  private summaryLayerEl: HTMLElement | null = null;
  /**
   * Scroll height reserved by the non-sticky bands, split by edge.
   *
   * Non-sticky bands occupy real scroll space rather than overlaying rows: the
   * top band's height shifts every data row down, and both extend the total
   * scrollable height. Cached because `performRender` needs them *before* the
   * row window is sliced, which is earlier than the bands themselves render.
   */
  private summaryInlineTopH = 0;
  private summaryInlineBottomH = 0;
  /** Previous reserved total, so a summary height change re-runs the scroll sizing that is otherwise keyed off the rows array. */
  private _lastSummaryReservedH = -1;

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
  /**
   * Last value written to the `--pg-sticky-block-height` CSS variable, so the
   * per-frame write is skipped while the sticky band's height is unchanged
   * (the common case on most scroll frames).
   */
  private _lastStickyBlockHeight = -1;
  private readonly stickyRowTracker = new StickyRowTracker();
  private readonly treeStickyRowTracker = new TreeStickyRowTracker();

  /** Exposed for {@link DisplayGroupEngine} construction in `GridCore`. */
  readonly colStyles: ColumnStyleManager;

  /**
   * FLIP animator for structural column changes (hide/show/reorder). Owned
   * here rather than by `HeaderRenderer` because the animation spans the header
   * *and* every body cell, and this class is the only one that sees both sides
   * of a rebuild.
   */
  private readonly columnAnimator = new ColumnAnimator();

  /** Column offsets as of the last committed render — the "before" frame every column FLIP inverts against. */
  private lastColumnPositions: ColumnPosition[] = [];

  /** Layout of the last `columns` store value, used to classify the next change. Seeded empty so the first render never animates. */
  private lastColumnLayout: ColumnLayoutSnapshot = EMPTY_COLUMN_LAYOUT;
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
  /** Configurable top toolbar (tabs + global search) — only created when `toolbar.enabled`. */
  private toolbar: Toolbar | null = null;
  /** Top-right Theme Manager launcher — only created when `themeManager` is enabled. */
  private themeManagerPanel: ThemeManagerPanel | null = null;
  /** Lazily resolves the theme API for the Theme Manager (engine exists after this renderer). */
  private themeApiProvider: (() => PhotonThemeApi) | null = null;
  private themeToastProvider: (() => import('../toast/toast-service').ToastService) | null = null;
  /** Whether the Theme Manager launcher should be mounted. */
  private themeManagerEnabled = false;
  /**
   * Shared tools strip (`.pg-grid__tools`) — a dedicated toolbar row above the
   * header hosting every top-right launcher (Filters funnel, Import, …) so they
   * sit side-by-side instead of stacking. Created lazily on first use via
   * {@link getOrCreateToolsBar}; null when no launcher-based feature is enabled.
   */
  private toolsBarEl: HTMLElement | null = null;
  /** Left region of the tools strip (toolbar tabs + left-docked search). */
  private toolsLeftEl: HTMLElement | null = null;
  /** Right region of the tools strip (right-docked search + Filters/Import launchers). */
  private toolsRightEl: HTMLElement | null = null;
  /** Quick-filter seam shared by the group-bar search and the toolbar search. Wired by GridCore. */
  private searchCallback: ((term: string) => void) | null = null;
  /** Host handler run when a file-based import source is chosen. Wired by GridCore. */
  private importFileHandler: ((source: ImportSourceType, file: File) => void) | null = null;
  /** Host handler run when *Paste From Clipboard* is chosen. Wired by GridCore. */
  private importClipboardHandler: (() => void) | null = null;
  /** Shows a custom floating tooltip for columns with `renderer.tooltip`; a no-op for every other column. */
  private tooltipController: TooltipController;

  private rafId: number | null = null;
  /**
   * Whether a same-frame repaint is already queued for the animation frame in
   * progress. See {@link onScrollRepaint}.
   */
  private inlineRenderQueued = false;
  private autoScroller: AutoScroller | null = null;
  private unsubscribers: Array<() => void> = [];
  private headerRendered = false;
  private lastCenterColStart = -1;
  private lastCenterColEnd = -1;
  private rowAnimator = new RowAnimator();

  // ── Real-time cell patching ───────────────────────────────────────────────
  /**
   * The exact options passed to the last `BodyRenderer.renderRows` call.
   *
   * A Virtual DOM patch must format a cell the same way the render did, so it
   * replays this snapshot rather than rebuilding an equivalent one — there is
   * no second source of truth to drift.
   */
  private lastBodyOptions: BodyRendererOptions | null = null;
  /**
   * The row window `[start, end)` the body DOM actually holds — recorded by the
   * last frame that painted rows.
   *
   * Read back on frames that deliberately skip `renderRows` (a live column
   * resize), so every row-geometry write still describes the window on screen
   * rather than one only this frame's arithmetic knows about.
   */
  private lastPaintedWindow: { start: number; end: number } | null = null;
  /**
   * The owning grid's public `GridApi`, once it exists.
   *
   * Late-bound: the API is constructed after the renderer, so this is `null`
   * until {@link setParentApiForDetail} runs. Handed to every cell renderer as
   * `params.api` / `ctx.api`, which is what a renderer reads the grid's shared
   * `context` through.
   *
   * Typed as `unknown` to avoid a renderer → api import cycle.
   */
  private gridApi: unknown = null;
  /** Batches patch requests into one flush per animation frame. */
  private readonly patchScheduler = new PatchScheduler((ids) => this.runCellPatch(ids));
  /** Cells written by the in-progress flush, reported by `flushCellPatches`. */
  private lastPatchedCells = 0;

  // ── Row-model integration ─────────────────────────────────────────────────
  /**
   * Set when the active row-model strategy guarantees every row is exactly
   * `rowHeight` tall. See `RowModelStrategy.uniformRowHeight`.
   */
  private uniformRowHeight = false;
  /**
   * Notified with the row range being painted, so a demand-loading row model
   * can fetch exactly what is on screen. See `RowModelStrategy.onRenderWindow`.
   */
  private renderWindowCallback: ((startRow: number, endRow: number) => void) | null = null;

  /**
   * Whether the grid may rewrite row order itself on a row drop.
   *
   * Defaults to the active row model's `rowOrderIsClientOwned` and can be
   * overridden down (never up) by `GridOptions.rowDrag.managed`. When `false`
   * the drag still runs — only the commit is the application's job.
   */
  private rowReorderManaged = true;

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
  /**
   * Height of the data rows alone, excluding the scroll space reserved by
   * non-sticky summary bands. Needed separately from {@link _cachedTotalHeight}
   * to place the bottom in-content band, which sits exactly after the last row.
   */
  private _cachedRowsHeight = 0;
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
    this.scrollController = new ScrollController(options.scroll);
    // Constructed unconditionally so the `GridApi` size methods always have
    // something to write through — an absent `resize` option only means no
    // handles are mounted, not that the grid cannot be sized programmatically.
    this.gridResize = new GridResizeController(containerEl, eventBus, options.resize ?? { enabled: false });
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
      // Forwarded as the event rather than a raw delta so the parent applies
      // its own delta-mode conversion and wheel smoothing to it, and the
      // hand-off keeps the feel the nested grid just had.
      this.detailRowRenderer.setParentScrollForwarder((event) => {
        this.scrollController.scrollByWheelEvent(event);
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

    if (options.toolbar?.enabled) {
      // Pure-UI strip. `onSearch` reuses the same quick-filter seam as the
      // group-bar search (wired lazily via setSearchCallback), and tab/search
      // events are emitted straight onto the shared event bus.
      this.toolbar = new Toolbar({
        iconRenderer,
        eventBus,
        onSearch: (query) => this.searchCallback?.(query),
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
    this.columnAnimator.mount();
    this.rowPositionSheet.mount();
    this.buildLayout();
    if (this.wrapperEl && this.bodyWrapEl) {
      this.rowDragRenderer = new RowDragRenderer(this.store, this.eventBus, this.iconRenderer);
      this.rowDragRenderer.setManagedReorder(this.rowReorderManaged);
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

  /**
   * Repaints in response to a scroll, on the frame that scroll will be painted
   * on.
   *
   * A wheel or momentum glide publishes its offsets from inside an animation
   * frame. Deferring the repaint with `requestAnimationFrame` from there would
   * book the *next* frame, so the rendered row/column window would trail the
   * panel translate by one frame for the whole glide — briefly exposing
   * unfilled space past the virtualization buffer on a fast spin.
   *
   * The repaint is deferred to a **microtask** rather than run inline, so a
   * frame that moves both axes (a momentum flick, a diagonal glide) still
   * renders once instead of twice. Microtasks drain before the browser's
   * rendering steps, so this is still the same frame — just after both writes
   * have landed.
   *
   * A bound field so both scroll subscriptions share one function reference.
   */
  private readonly onScrollRepaint = (): void => {
    if (!this.scrollController.isInAnimationFrame()) {
      this.scheduleRender();
      return;
    }
    if (this.inlineRenderQueued) return;
    this.inlineRenderQueued = true;
    queueMicrotask(this.flushInlineRender);
  };

  /** Renders the repaint queued by {@link onScrollRepaint} for the current frame. */
  private readonly flushInlineRender = (): void => {
    this.inlineRenderQueued = false;
    // The grid can be torn down between the write and the microtask (a scroll
    // listener that destroys it, a detail row collapsing mid-glide).
    if (!this.wrapperEl) return;
    this.forceRender();
  };

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

  /**
   * Wires the renderer to the active row-model strategy.
   *
   * Three things flow across this seam: whether rows are uniformly tall (which
   * lets the total content height be computed rather than summed), a callback
   * reporting the painted row range (which lets a demand-loading model fetch
   * exactly what is on screen without re-implementing virtualisation), and
   * whether row order may be rewritten client-side.
   *
   * @param uniformRowHeight      - `true` when every row is `GridOptions.rowHeight`.
   * @param onRenderWindow        - Called after each render with the painted range.
   * @param rowOrderIsClientOwned - `true` when the grid may commit a row reorder
   *                                itself; see `RowModelStrategy`.
   */
  setRowModelIntegration(
    uniformRowHeight: boolean,
    onRenderWindow: ((startRow: number, endRow: number) => void) | null,
    rowOrderIsClientOwned = true,
  ): void {
    this.uniformRowHeight = uniformRowHeight;
    this.renderWindowCallback = onRenderWindow;
    this.rowReorderManaged = this.resolveManagedReorder(rowOrderIsClientOwned);
    this.rowDragRenderer?.setManagedReorder(this.rowReorderManaged);
  }

  /**
   * Reconciles `GridOptions.rowDrag.managed` with what the row model can
   * actually deliver.
   *
   * The option may only turn managed reordering *off*. Asking for it on under a
   * server-backed model cannot be honoured — the grid would rewrite an array the
   * datasource re-supplies on the next fetch — so it is refused with an
   * explanation rather than silently half-working.
   */
  private resolveManagedReorder(rowOrderIsClientOwned: boolean): boolean {
    const requested = this.options.rowDrag?.managed;
    if (requested === true && !rowOrderIsClientOwned) {
      console.warn(
        `[PhotonGrid] rowDrag.managed: true is not supported with rowModel: '${this.options.rowModel}' — `
        + 'the datasource owns row order, so a client-side reorder would be discarded on the next '
        + 'fetch. Falling back to unmanaged dragging: listen for the ROW_DROP event, persist the '
        + 'move, then refresh.',
      );
      return false;
    }
    return requested ?? rowOrderIsClientOwned;
  }

  // ── Real-time cell patching (viewport Virtual DOM) ─────────────────────────

  /**
   * Queues a Virtual DOM diff for the given rows, coalesced to one flush per
   * animation frame.
   *
   * This is the real-time update path: it never re-runs the row pipeline, never
   * rebuilds a row, and writes only the cells whose values actually changed. A
   * feed pushing thousands of updates per second therefore produces at most one
   * batched DOM write per frame.
   *
   * @param nodeIds - Rows whose data changed, or `null` to re-diff every
   *                  rendered row.
   */
  patchCells(nodeIds: Iterable<string> | null): void {
    this.patchScheduler.schedule(nodeIds);
  }

  /**
   * Applies any queued cell patches immediately instead of on the next frame.
   *
   * @returns The number of cells written to the DOM by the flush.
   */
  flushCellPatches(): number {
    this.lastPatchedCells = 0;
    this.patchScheduler.flushNow();
    return this.lastPatchedCells;
  }

  /** `true` when the given row is rendered and can be patched in place. */
  isRowRendered(nodeId: string): boolean {
    return this.bodyRenderer.isRowRendered(nodeId);
  }

  /** Virtual DOM counters — see {@link VDomStats}. */
  getVDomStats(): VDomStats {
    return this.bodyRenderer.getVDomStats();
  }

  /** Zeroes the Virtual DOM counters. */
  resetVDomStats(): void {
    this.bodyRenderer.resetVDomStats();
  }

  /**
   * Runs one Virtual DOM flush.
   *
   * Reuses the exact `BodyRendererOptions` from the last paint so a patched
   * cell is formatted identically to a rendered one. A patch before the first
   * render is a no-op — there is no DOM to patch yet.
   */
  private readonly runCellPatch = (nodeIds: Iterable<string> | null): void => {
    if (!this.lastBodyOptions) return;
    this.lastPatchedCells += this.bodyRenderer.patchCells(nodeIds, this.lastBodyOptions);
  };

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
    this.rowAnimator.capture(this.sliceAnimatableRows(rows), type);
  }

  /**
   * Narrows an animation snapshot to the rows the renderer currently has DOM
   * for, before it reaches {@link RowAnimator.capture}.
   *
   * This is a memory guard, not the correctness guard — `RowAnimator` decides
   * what actually animates by testing each row's start and end position against
   * the viewport. The problem this solves is upstream of that: `visibleRows` is
   * the whole current page, and with the large `pageSize` values real grids use
   * (10k–50k, sometimes the entire dataset) `capture()` would build a Map with
   * one entry per page row on every sort keystroke, of which ~30 can possibly
   * matter. Slicing to the rendered window keeps that allocation proportional to
   * what is on screen, which is what makes sorting a million rows cost the same
   * as sorting a hundred.
   *
   * `firstRenderedRowIndex`/`lastRenderedRowIndex` are written at the end of
   * every `performRender`, so at capture time (before the pipeline re-runs) they
   * still describe the window the user is looking at, and they index into the
   * same pre-pipeline `visibleRows` array passed in here.
   */
  private sliceAnimatableRows<T extends { nodeId: string; top: number }>(
    rows: ReadonlyArray<T>,
  ): ReadonlyArray<T> {
    const start = this.store.get('firstRenderedRowIndex') as number;
    const end = this.store.get('lastRenderedRowIndex') as number;
    // Guard against a capture that arrives before the first paint, or indices
    // left stale by a page/dataset swap — a bad slice would silently disable
    // the animation, so fall back to the full set rather than an empty one.
    if (!(end > start) || start < 0 || start >= rows.length) return rows;
    return rows.slice(start, Math.min(end, rows.length));
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
    this.searchCallback = fn;
    this.groupDropZone?.setSearchCallback(fn);
  }

  /**
   * Enable the top-right Theme Manager launcher and wire the (lazy) theme API
   * provider. Must be called before `mount()` so the launcher is built with the
   * tools strip.
   *
   * @param getThemeApi - Lazily resolves the live theme API.
   * @param enabled - Whether the launcher should be built.
   * @param getToasts - Lazily resolves the grid's toast service, used to
   *   surface action feedback (import/export/reset) as transient toasts.
   */
  // ── Plugin seam ───────────────────────────────────────────────────────────
  // The renderer owns the grid's DOM and its virtualization window, so it is
  // the only place a plugin can be given a layer that stays in step with the
  // rows. Kept deliberately narrow: mount a layer, read geometry, and receive
  // the window that was just computed.

  /** Set by `GridCore` when at least one plugin is registered; `null` otherwise. */
  private pluginHost: PluginHostSeam | null = null;
  /** Layers handed out by {@link mountPluginLayer}, keyed by name for idempotency. */
  private pluginLayers = new Map<string, HTMLElement>();
  /**
   * Extra horizontal content width contributed by a plugin layer.
   *
   * The centre panel derives its scrollable width from its columns, but a
   * plugin can own horizontal content the grid knows nothing about -- a
   * scheduler timeline being the motivating case, where every resource column
   * is pinned left and the centre has no columns at all. Without this the
   * content width would be 0 and the timeline would have no scrollbar.
   */
  private pluginContentWidth = 0;

  /** Monotonic frame counter published on the render window. */
  private pluginFrame = 0;
  /** Last resolved left/right pinned panel widths, for the render window. */
  private lastLeftPanelWidth = 0;
  private lastRightPanelWidth = 0;

  /**
   * Declares horizontal content width owned by a plugin layer.
   *
   * Combined with the column width by , so a plugin can only ever
   * widen the scrollable area, never shrink it below what the columns need.
   */
  setPluginContentWidth(px: number): void {
    if (px === this.pluginContentWidth) return;
    this.pluginContentWidth = px;

    // Pushed straight through rather than waiting for the next column pass. The
    // three places that compute centre width all sit inside "the columns
    // changed" branches, and a scheduler grid pins every column to the left --
    // so the centre has none, those branches never run, and the scrollbar would
    // never appear. `Math.max` keeps a real column layout authoritative.
    const width = Math.max(this._cachedCenterW, px);
    this.wrapperEl?.style.setProperty('--pg-center-content-width', `${width}px`);
    this.scrollController.updateSizes(this._cachedTotalHeight, width);

    this.scheduleRender();
  }

  /** Attaches the plugin host. Must run before the first render. */
  setPluginHost(host: PluginHostSeam): void {
    this.pluginHost = host;
  }

  /**
   * Creates (or returns) a plugin-owned layer inside the grid body.
   *
   * Mounted as a **sibling of the pinned/centre panels**, the same position
   * Master/Detail uses for `.pg-detail-layer` — which is what lets the layer
   * span the full body while still sitting inside the scroll-transform
   * coordinate space.
   *
   * The optional `followRowOrigin` / `followScrollX` flags apply the same
   * transforms the grid's own panels use, so a layer that opts in needs no
   * scroll handling of its own: content positioned in rebased row space and
   * absolute content-x simply tracks the grid for free.
   */
  mountPluginLayer(name: string, options: PluginLayerOptions = {}): HTMLElement {
    const existing = this.pluginLayers.get(name);
    if (existing) return existing;

    const layer = createDiv('pg-plugin-layer');
    layer.setAttribute('data-plugin-layer', name);
    layer.style.zIndex = String(options.zIndex ?? 4);
    if (options.transparentToPointer !== false) layer.style.pointerEvents = 'none';

    // Composed rather than either/or: a timeline wants both axes.
    const transforms: string[] = [];
    if (options.followScrollX) transforms.push('translateX(var(--pg-scroll-x, 0px))');
    if (options.followRowOrigin) transforms.push('translateY(var(--pg-row-offset-y, 0px))');
    if (transforms.length) layer.style.transform = transforms.join(' ');

    this.pluginLayers.set(name, layer);
    this.bodyWrapEl?.appendChild(layer);
    return layer;
  }

  /** Current scroll/viewport geometry. Reads cached values only — forces no layout. */
  readScrollMetrics(): ScrollMetrics {
    return {
      scrollTop: this.scrollController.getScrollTop(),
      scrollLeft: this.scrollController.getScrollLeft(),
      viewportHeight: this.centerBodyEl?.clientHeight ?? 0,
      viewportWidth: this.centerBodyEl?.clientWidth ?? 0,
      contentHeight: this._cachedTotalHeight,
      contentWidth: this._cachedCenterW,
    };
  }

  /** Subscribes to scroll on both axes. Returns a single disposer for the pair. */
  addPluginScrollListener(cb: () => void): () => void {
    const offY = this.scrollController.onScrollY(cb);
    const offX = this.scrollController.onScrollX(cb);
    return () => { offY(); offX(); };
  }

  setThemeManager(
    getThemeApi: () => PhotonThemeApi,
    enabled: boolean,
    getToasts: () => import('../toast/toast-service').ToastService,
  ): void {    this.themeApiProvider = getThemeApi;
    this.themeManagerEnabled = enabled;
    this.themeToastProvider = getToasts;
  }

  /**
   * Selects a toolbar tab by id, if the toolbar feature is enabled. Emits
   * {@link import('../types/event.types').GridEventType.TOOLBAR_TAB_CHANGED} on
   * change. No-op when the toolbar is disabled or the id is unknown/disabled.
   */
  setActiveToolbarTab(id: string): void {
    this.toolbar?.setActiveTab(id);
  }

  /** Returns the active toolbar tab id, or `null` when the toolbar is disabled or has no tabs. */
  getActiveToolbarTab(): string | null {
    return this.toolbar?.getActiveTab() ?? null;
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
   * Late-bound once the owning `GridCore`'s `GridApi` exists.
   *
   * Feeds three things that all need the live API and none of which exist at
   * construction time: `masterDetail.detailRendererFn`'s `parentApi`, the
   * column menu's custom-item context, and — through {@link gridApi} —
   * `params.api` on every cell renderer. That last one is why a cell renderer
   * can reach `GridApi.getContext()` at all.
   */
  setParentApiForDetail(api: unknown): void {
    this.gridApi = api;
    this.detailRowRenderer?.setParentApi(api);
    // The same GridApi backs the column menu's custom-item context. Wired here
    // (rather than in buildLayout) because the API is created after mount().
    this.headerRenderer.setMenuApi(api);
  }

  /** The nested grid's `GridApi` for an expanded master row, or `undefined`. Backs `GridApi.getDetailGridApi`. */
  getDetailGridApi(parentNodeId: string): unknown {
    return this.detailRowRenderer?.getNestedInstance(parentNodeId)?.api;
  }

  /** The custom detail component mounted for an expanded master row, or `undefined`. Backs `GridApi.getDetailComponent`. */
  getDetailComponent(parentNodeId: string): DetailComponent | undefined {
    return this.detailRowRenderer?.getDetailComponent(parentNodeId);
  }

  /** Re-resolves props and refreshes an expanded master row's custom detail component. Backs `GridApi.refreshDetail`. */
  refreshDetailComponent(parentNodeId: string): boolean {
    return this.detailRowRenderer?.refreshDetailComponent(parentNodeId) ?? false;
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

  /**
   * Scrolls the centre region to an absolute horizontal offset, in content
   * pixels.
   *
   * The column-oriented counterpart is `ensureColumnVisible`, which is the right
   * call when the target is a column. This one exists for content whose
   * horizontal extent is not columns at all -- a plugin timeline scrolling to a
   * date, for instance -- where the caller already knows the pixel it wants.
   */
  scrollToX(px: number): void {
    this.scrollController.scrollToX(px);
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
    if (rowIndex < 0 || rowIndex >= rows.length) return;

    const row = rows[rowIndex];
    const rowH = row?.height ?? (this.options.rowHeight ?? 48);

    // A demand-loading row model leaves unloaded indices empty, so the target
    // of a jump usually has no node yet — which is exactly when scrolling to it
    // matters most. With a uniform row height the position is pure arithmetic,
    // so the scroll lands correctly and the pages covering it load on arrival.
    const rowTop = row?.top ?? (this.uniformRowHeight ? rowIndex * rowH : undefined);
    if (rowTop === undefined) return;

    const scrollTop = this.scrollController.getScrollTop();
    const vpH = this.scrollController.getViewportHeight();

    let targetY: number;
    switch (position) {
      case 'top':
        targetY = rowTop;
        break;
      case 'bottom':
        targetY = rowTop + rowH - vpH;
        break;
      case 'middle':
        targetY = rowTop - (vpH - rowH) / 2;
        break;
      default:
        if (rowTop < scrollTop) targetY = rowTop;
        else if (rowTop + rowH > scrollTop + vpH) targetY = rowTop + rowH - vpH;
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
    this.destroySummaryBands();
    this.gridResize.destroy();
    this.footerRenderer.destroy();
    this.overlayRenderer.destroy();
    this.detailRowRenderer?.destroy();
    this.photonAIPanel?.destroy();
    this.filtersToolPanel?.destroy();
    this.importMenu?.destroy();
    this.toolbar?.destroy();
    this.themeManagerPanel?.destroy();
    this.toolsBarEl?.remove();
    this.toolsBarEl = null;
    this.toolsLeftEl = null;
    this.toolsRightEl = null;
    this.tooltipController.destroy();
    this.scrollController.destroy();
    this.groupDropZone?.destroy();
    this.rowDragRenderer?.destroy();
    this.groupDragHandler?.destroy();
    this.rowPositionSheet.destroy();
    this.rowAnimator.destroy();
    this.columnAnimator.destroy();
    this.colStyles.destroy();
    this.autoScroller?.stop();
    this.autoScroller = null;
    // Plugin layers are children of the body wrapper, which `wrapperEl.remove()`
    // detaches wholesale. `PluginHost.destroyAll()` has already run by now (it
    // is the first thing `GridCore.destroy()` does); this is the sweep for a
    // plugin that threw during its own teardown and left its layer behind.
    for (const layer of this.pluginLayers.values()) layer.remove();
    this.pluginLayers.clear();
    this.pluginHost = null;

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
    this.columnAnimator.setScopeId(gridId);
    this.columnAnimator.setRoot(this.wrapperEl);
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
    // Sticky summary bands are flex items of this same column, so their DOM
    // order *is* their screen order: a top band is inserted before `bodyWrapEl`,
    // a bottom band after it. Retained here rather than resolved at render time
    // because `buildLayout` runs once and the anchor never moves.
    this.summaryHostEl = mainColEl;

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

    this.scrollController.onScrollY(this.onScrollRepaint);
    this.scrollController.onScrollX(this.onScrollRepaint);

    // Expose horizontal scroll to header renderer for column drag auto-scroll
    this.headerRenderer.setScrollCallback(
      (dx) => this.scrollController.scrollToX(this.scrollController.getScrollLeft() + dx),
      (dir) => dir < 0 ? this.scrollController.canScrollLeft() : this.scrollController.canScrollRight(),
    );

    // Re-render during column resize so the horizontal scrollbar updates in real time
    this.headerRenderer.setResizeCallback(() => this.scheduleRender());

    // Mount overlay on body (spans all panels)
    this.overlayRenderer.mount(bodyWrapEl);

    // Container resize handles. Mounted onto the wrapper (which is
    // `position: relative`, so it is the containing block absolutely-positioned
    // handles need) rather than the container itself, so they sit inside the
    // grid's own border and follow its radius.
    this.gridResize.mount(this.wrapperEl);

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

    // Mount the configurable toolbar first so its tabs/left-search fill the
    // left region and any right-docked search sits *before* the Filters/Import
    // launchers within the right region (DOM order = visual order).
    if (this.toolbar && this.options.toolbar) {
      this.toolbar.mount(this.getToolsLeftRegion(), this.getToolsRightRegion(), this.options.toolbar);
    }

    // Mount the Filters Tool Panel launcher into the tools strip's right region;
    // its floating panel goes on the wrapper. Absolute positioning keeps the
    // panel out of the flex layout, so it never affects virtualization. The
    // toolbar's `showFilterButton` toggle (default true) can hide the launcher.
    const showFilterButton = this.options.toolbar ? this.options.toolbar.showFilterButton !== false : true;
    if (this.filtersToolPanel && this.wrapperEl && showFilterButton) {
      this.filtersToolPanel.mount(this.wrapperEl, this.getToolsRightRegion(), this.options.filtersToolPanel!);
    }

    // Mount the Import menu (launcher + dropdown), and drive the loading overlay
    // from the engine's progress events so the user sees "Parsing… / Mapping… /
    // Rendering…" without this renderer knowing anything about the import
    // pipeline. The toolbar's `showImportButton` toggle (default true) can hide it.
    const showImportButton = this.options.toolbar ? this.options.toolbar.showImportButton !== false : true;
    if (this.importMenu && this.wrapperEl && showImportButton) {
      this.importMenu.mount(this.wrapperEl, this.getToolsRightRegion());
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

    // Mount the Theme Manager launcher (apply saved themes / export / import /
    // reset) into the tools strip when enabled. The theme API is resolved lazily
    // because the engine is constructed after this renderer.
    if (this.themeManagerEnabled && this.themeApiProvider && this.themeToastProvider && this.wrapperEl) {
      this.themeManagerPanel = new ThemeManagerPanel({
        iconRenderer: this.iconRenderer,
        getThemeApi: this.themeApiProvider,
        getToasts: this.themeToastProvider,
      });
      this.themeManagerPanel.mount(this.wrapperEl, this.getToolsRightRegion());
    }

    // Server-Side Row Model: surface a failed fetch as an error overlay. Loading
    // and empty states are already handled by the `loading` store flag + the
    // `rows.length === 0` gating in performRender, so only errors need wiring.
    // Subscribed unconditionally (independent of the toolbar/import launchers).
    this.unsubscribers.push(
      this.eventBus.on<import('../types/event.types').ServerErrorEvent>(
        GridEventType.SERVER_ERROR,
        (e) => this.overlayRenderer.showError(e.message),
      ),
    );

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
    this.columnChooser = new ColumnChooser(this.columnModel, this.iconRenderer, this.containerEl);
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
   * Returns the shared tools strip (`.pg-grid__tools`), creating it once on
   * first use and inserting it as the first child of the grid wrapper so it
   * forms a dedicated toolbar row above the header. The strip is split into a
   * left region (toolbar tabs + left-docked search) and a right region
   * (right-docked search + the Filters/Import launchers).
   */
  private getOrCreateToolsBar(): HTMLElement {
    if (!this.toolsBarEl) {
      this.toolsBarEl = createDiv('pg-grid__tools');
      this.toolsLeftEl = createDiv('pg-grid__tools__left');
      this.toolsRightEl = createDiv('pg-grid__tools__right');
      this.toolsBarEl.appendChild(this.toolsLeftEl);
      this.toolsBarEl.appendChild(this.toolsRightEl);
      // Prepend so the strip sits at the very top of the grid, above the
      // outer row (header + body). insertBefore(el, firstChild) is a safe
      // prepend even when firstChild is null.
      this.wrapperEl?.insertBefore(this.toolsBarEl, this.wrapperEl.firstChild);
    }
    return this.toolsBarEl;
  }

  /** Left region of the tools strip — creates the strip if needed. */
  private getToolsLeftRegion(): HTMLElement {
    this.getOrCreateToolsBar();
    return this.toolsLeftEl!;
  }

  /** Right region of the tools strip — creates the strip if needed. */
  private getToolsRightRegion(): HTMLElement {
    this.getOrCreateToolsBar();
    return this.toolsRightEl!;
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

  // ─── Summary Rows ─────────────────────────────────────────────────────────

  /**
   * Supplies the summary definition/value store.
   *
   * Called once by `GridCore` during initialization. Until it is, and whenever
   * the model holds no rows, every summary code path in the render loop
   * short-circuits on a single null/empty check.
   */
  setSummaryModel(model: SummaryModel): void {
    this.summaryModel = model;
  }

  /**
   * The container-resize controller, so `GridApi` can route its size methods
   * through the same single write path the drag gesture uses.
   */
  get resizeController(): GridResizeController {
    return this.gridResize;
  }

  /**
   * Returns the band for one `(position, sticky)` pair, creating and mounting it
   * on first use.
   *
   * Lazy so a grid with a single bottom total never builds the other three
   * bands' scaffolding, and so a grid with no summary at all builds none.
   */
  private getSummaryBand(
    position: SummaryPosition.Top | SummaryPosition.Bottom,
    sticky: boolean,
  ): SummaryRowRenderer | null {
    const key = `${position}:${sticky ? 1 : 0}`;
    const existing = this.summaryBands.get(key);
    if (existing) return existing;

    const band = new SummaryRowRenderer(position, sticky);

    if (sticky) {
      const host = this.summaryHostEl;
      const body = this.bodyWrapEl;
      if (!host || !body) return null;
      // A top band goes ahead of the body in flex order; a bottom band goes
      // immediately after it, which is before the horizontal scrollbar row.
      band.mount(host, position === SummaryPosition.Top ? body : (body.nextElementSibling as HTMLElement | null));
    } else {
      const layer = this.ensureSummaryLayer();
      if (!layer) return null;
      band.mount(layer);
    }

    this.summaryBands.set(key, band);
    return band;
  }

  /**
   * Creates (once) the absolutely-positioned layer that hosts non-sticky bands.
   *
   * Lives inside `.pg-grid__body` alongside the panels rather than inside one of
   * them: a band spans all three pinned regions, and a panel sets its own
   * `z-index`, which would trap the layer in that panel's stacking context — the
   * same reasoning that puts `.pg-sticky-layer` at this level.
   */
  private ensureSummaryLayer(): HTMLElement | null {
    if (this.summaryLayerEl) return this.summaryLayerEl;
    if (!this.bodyWrapEl) return null;
    const layer = createDiv('pg-summary-layer');
    this.bodyWrapEl.appendChild(layer);
    this.summaryLayerEl = layer;
    return layer;
  }

  /**
   * Pairs each of a band's row definitions with its computed values.
   *
   * Rows whose snapshot is missing are dropped rather than rendered blank: the
   * only way that happens is a definition added since the last compute, and a
   * half-painted row would be worse than one that appears a frame later.
   */
  private collectSummaryBandRows(
    position: SummaryPosition.Top | SummaryPosition.Bottom,
    sticky: boolean,
  ): SummaryBandRow[] {
    const model = this.summaryModel;
    if (!model) return [];

    const rows: SummaryBandRow[] = [];
    for (const def of model.getRowsForBand(position, sticky)) {
      const snapshot = model.getSnapshot(def.id);
      if (snapshot) rows.push({ def, snapshot });
    }
    return rows;
  }

  /**
   * Recomputes the scroll height the non-sticky bands reserve.
   *
   * Must run before the row window is sliced: the top band's height offsets
   * every data row, so slicing against an unadjusted `scrollTop` would render
   * the wrong window.
   *
   * @returns `true` when either reservation changed, so the caller can re-run
   *          the scroll sizing that is otherwise keyed off the rows array.
   */
  private updateSummaryReservedHeights(): boolean {
    let top = 0;
    let bottom = 0;

    const model = this.summaryModel;
    if (model && !model.isEmpty()) {
      for (const def of model.getRows()) {
        if (def.sticky) continue;
        const snapshot = model.getSnapshot(def.id);
        if (!snapshot) continue;
        const inTop = def.position !== SummaryPosition.Bottom;
        const inBottom = def.position !== SummaryPosition.Top;
        if (inTop) top += snapshot.height;
        if (inBottom) bottom += snapshot.height;
      }
    }

    const changed = top !== this.summaryInlineTopH || bottom !== this.summaryInlineBottomH;
    this.summaryInlineTopH = top;
    this.summaryInlineBottomH = bottom;
    return changed;
  }

  /**
   * Renders every summary band for this frame.
   *
   * @param layout      - The shared column layout, mirroring the header's.
   * @param rowsHeight  - Total height of the data rows, for placing the bottom in-content band.
   * @param scrollTop   - Current vertical scroll offset.
   * @param viewportH   - Height of the body viewport.
   */
  private renderSummaryBands(
    layout: Parameters<SummaryRowRenderer['render']>[1],
    rowsHeight: number,
    scrollTop: number,
    viewportH: number,
  ): void {
    const model = this.summaryModel;
    if (!model) return;

    for (const position of [SummaryPosition.Top, SummaryPosition.Bottom] as const) {
      for (const sticky of [true, false] as const) {
        const rows = this.collectSummaryBandRows(position, sticky);
        const key = `${position}:${sticky ? 1 : 0}`;
        const existing = this.summaryBands.get(key);

        // Nothing to draw and nothing drawn before — never build the band at all.
        if (rows.length === 0 && !existing) continue;

        const band = existing ?? this.getSummaryBand(position, sticky);
        if (!band) continue;

        band.render(rows, layout);

        if (!sticky) {
          // Screen-space Y of the band's top edge. Computed here in JS doubles
          // and always within a viewport of zero, so it never reaches the
          // float32 rasterisation limit that forces the data rows through origin
          // rebasing (see `panels.css.ts`).
          const contentY = position === SummaryPosition.Top
            ? 0
            : this.summaryInlineTopH + rowsHeight;
          const offsetY = contentY - scrollTop;
          const height = band.getHeight();
          band.setInlineOffset(offsetY, height > 0 && offsetY < viewportH && offsetY + height > 0);
        }
      }
    }
  }

  /** Detaches every summary band and its host layer. */
  private destroySummaryBands(): void {
    for (const band of this.summaryBands.values()) band.destroy();
    this.summaryBands.clear();
    this.summaryLayerEl?.remove();
    this.summaryLayerEl = null;
    this.summaryHostEl = null;
    this.summaryModel = null;
    this.summaryInlineTopH = 0;
    this.summaryInlineBottomH = 0;
    this._lastSummaryReservedH = -1;
  }

  /**
   * `true` when any summary cell spans more than one column.
   *
   * Such a band renders every center column instead of the virtual window: a
   * span is a single element covering several columns, and the window's edge
   * could fall in the middle of one — leaving a cell sized for columns that are
   * not there, and every column after it misaligned. Rendering all of them keeps
   * the total center width identical (the spacers go to zero), so the band still
   * lines up with the header.
   *
   * The cost is bounded and opt-in: it applies only to grids that use `colSpan`,
   * and only to the handful of rows in a summary band — never to data rows.
   */
  private summaryUsesColSpan(): boolean {
    const model = this.summaryModel;
    if (!model) return false;
    for (const snapshot of model.getSnapshots()) {
      for (const cell of snapshot.cells.values()) {
        if (cell.colSpan > 1) return true;
      }
    }
    return false;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  /**
   * Per-panel column offsets for the current layout, from `colStyles`' resolved
   * widths rather than the DOM — so a column FLIP forces no layout, and center
   * columns outside the virtual window are still positioned correctly.
   */
  private captureColumnPositions(
    leftCols: ColumnDef[],
    centerCols: ColumnDef[],
    rightCols: ColumnDef[],
  ): ColumnPosition[] {
    return computeColumnPositions(
      {
        left: leftCols.map((c) => c.colId),
        center: centerCols.map((c) => c.colId),
        right: rightCols.map((c) => c.colId),
      },
      (colId) => this.colStyles.getWidth(colId),
    );
  }

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
    /**
     * Set when flex columns are re-resolved purely because the container
     * resized — no columns/grouping/rows change to piggyback on. Without it
     * the recomputed width would never reach `ScrollController`; see the
     * branch that sets it below.
     */
    let centerWidthChanged = false;

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
      // Cached for the plugin render window: a plugin layer spans the whole
      // body, so anything that must line up with centre columns needs these.
      // Both carry their panel's divider allowance — see PINNED_DIVIDER_WIDTH.
      this.lastLeftPanelWidth  = hasLeft  ? showCb + showSn + leftPinnedWidth + PINNED_DIVIDER_WIDTH : 0;
      this.lastRightPanelWidth = hasRight ? rightContentWidth + 2 : 0;
      w.style.setProperty('--pg-left-panel-width',  `${this.lastLeftPanelWidth}px`);
      w.style.setProperty('--pg-right-panel-width', `${this.lastRightPanelWidth}px`);

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
        // Flag it so `ScrollController.updateSizes` runs below. It is keyed off
        // rows/columns/grouping changes, none of which happened here — leaving
        // the controller holding the pre-resize content width and therefore
        // still showing a horizontal scrollbar for overflow that no longer
        // exists. The classic repro is expanding a Master/Detail row: the
        // nested grid resolves flex at full width, its own vertical scrollbar
        // then appears and narrows the center panel, and the resulting phantom
        // h-scrollbar (plus the v-scrollbar the lost height provokes) persists
        // until an unrelated sort/resize happens to re-run the columns branch.
        centerWidthChanged = true;
      }
    }

    // ── Row-dependent work ────────────────────────────────────────────────────
    // The total-height O(n) loop and scrollController.updateSizes are skipped
    // when the rows reference hasn't changed (i.e. during scroll-only frames).
    //
    // Non-sticky summary bands occupy real scroll space, so their reservation is
    // resolved first and folded into the height below. It also participates in
    // the change test: adding a summary row changes the scrollable height
    // without touching the rows array, which would otherwise leave the scroll
    // controller sized for a grid one band shorter than it now is.
    const summaryReservedChanged = this.updateSummaryReservedHeights();
    const summaryReservedH = this.summaryInlineTopH + this.summaryInlineBottomH;
    const rowsChanged = rows !== this._lastRowsRef;
    if (rowsChanged || summaryReservedChanged) {
      this._lastRowsRef = rows;
      this._lastSummaryReservedH = summaryReservedH;

      // A strategy that guarantees uniform row heights lets the total be
      // derived arithmetically. That skips an O(n) sum on every data change,
      // and it is what makes a *sparse* row array safe to publish: summing
      // would dereference the holes an on-demand row model deliberately leaves
      // for rows it has not loaded.
      let rowsHeight: number;
      if (this.uniformRowHeight) {
        rowsHeight = rows.length * rowHeight;
      } else {
        rowsHeight = 0;
        for (const row of rows) rowsHeight += row.height ?? rowHeight;
      }
      this._cachedRowsHeight = rowsHeight;
      const totalHeight = rowsHeight + summaryReservedH;
      this._cachedTotalHeight = totalHeight;

      // The scroll controller gets the true height (it owns the mapping onto a
      // capped scrollbar track); the DOM box is clamped, because a browser
      // silently truncates any element taller than its own limit anyway and a
      // nominally 40M-px-tall layer is pure waste. Rows are positioned relative
      // to the render window, so this box's height no longer affects where any
      // of them land.
      w.style.setProperty('--pg-content-height', `${Math.min(totalHeight, MAX_ELEMENT_HEIGHT_PX)}px`);
      this.scrollController.updateSizes(totalHeight, this._cachedCenterW);
    } else if (colsChanged || groupingChanged || centerWidthChanged) {
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
      // Cached for the plugin render window: a plugin layer spans the whole
      // body, so anything that must line up with centre columns needs these.
      this.lastLeftPanelWidth  = hasLeft  ? showCb + showSn + leftPinnedWidth + PINNED_DIVIDER_WIDTH : 0;
      this.lastRightPanelWidth = hasRight ? rightContentWidth + 2 : 0;
      w.style.setProperty('--pg-left-panel-width',  `${this.lastLeftPanelWidth}px`);
      w.style.setProperty('--pg-right-panel-width', `${this.lastRightPanelWidth}px`);

      const centerColIds = centerCols.map((c) => c.colId);
      const liveCenterW = Math.max(
        this.colStyles.getTotalWidth(centerColIds) + (hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0),
        this.pluginContentWidth,
      );
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

    // A column drag must keep the grabbed column and the slots around it in the
    // DOM, but it must not render the entire column set to do so.
    //
    // This previously expanded the buffer to `centerCols.length` — every centre
    // column, header cell and body cell — for the whole gesture. Because a live
    // cross-panel move writes `store.columns` mid-drag, each panel crossing then
    // re-rendered that full set: the cost of a crossing grew with the width of
    // the grid, which is what made cross-panel dragging unusable on wide grids.
    //
    // Instead the normal buffer is widened a little (drop targets just past the
    // viewport edge stay live) and the grabbed column is pinned into the range
    // explicitly below — the same technique `RowDragRenderer` relies on to keep
    // a dragged row painted once auto-scroll carries it out of the window.
    const isDraggingCol = this.headerRenderer.isDraggingCol;
    const isDraggingGroup = this.displayGroupEngine?.isDraggingGroup ?? false;
    const isColDrag = isDraggingCol || isDraggingGroup;
    const colBuf = isColDrag ? DRAG_COL_BUFFER : COL_BUFFER;
    let colStart = Math.max(0, visColStart - colBuf);
    let colEnd   = Math.min(centerCols.length, visColEnd + colBuf);

    // Pin the grabbed column into the rendered range. Auto-scroll can carry its
    // real position outside the viewport while the pointer holds it; without
    // this the cell would be evicted and the drag would lose its subject.
    if (isColDrag) {
      const dragColId = this.headerRenderer.draggingColumnId;
      if (dragColId) {
        const dragIdx = centerCols.findIndex((c) => c.colId === dragColId);
        if (dragIdx !== -1) {
          if (dragIdx < colStart) colStart = dragIdx;
          if (dragIdx >= colEnd)  colEnd   = dragIdx + 1;
        }
      }
    }

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
    /**
     * Scroll offset **in row space**.
     *
     * A non-sticky top summary band occupies the first `summaryInlineTopH`
     * pixels of the scrollable content, so row `top` 0 sits at content offset
     * `summaryInlineTopH`, not 0. Every calculation below slices on row `top`s,
     * so they all work from this shifted origin — otherwise the band's height
     * would offset the rendered window by a row or two. Zero (and therefore
     * free) whenever no in-content top band exists, which is the default.
     */
    const rowScrollTop = scrollTop - this.summaryInlineTopH;
    // During animation, expand the render window by one extra viewport so rows
    // just outside the buffer are already in the DOM and can participate in FLIP.
    const animExtra = this.rowAnimator.hasPending() ? Math.ceil(viewportHeight / rowHeight) : 0;
    const isAutoHeight = this.options.rowHeightMode === 'auto';
    let start: number;
    let end: number;
    if (isAutoHeight) {
      const bufferPx = (buffer + animExtra) * rowHeight;
      const viewStart = rowScrollTop - bufferPx;
      const viewEnd = rowScrollTop + viewportHeight + bufferPx;
      start = 0;
      end = rows.length;
      for (let i = 0; i < rows.length; i++) {
        if ((rows[i].top + (rows[i].height ?? rowHeight)) >= viewStart) { start = i; break; }
      }
      for (let i = start; i < rows.length; i++) {
        if (rows[i].top > viewEnd) { end = i; break; }
      }
    } else {
      start = Math.max(0, Math.floor(rowScrollTop / rowHeight) - buffer - animExtra);
      end = Math.min(rows.length, Math.ceil((rowScrollTop + viewportHeight) / rowHeight) + buffer + animExtra);
    }

    // ── Master/Detail sticky row ────────────────────────────────────────────
    // See `StickyRowTracker` for the full rule. `minStart` widens the render
    // window when needed so the sticky row's cells stay rendered even though
    // virtualization would otherwise have scrolled past its natural position.
    let stickyNodeId: string | null = null;
    let stickyOffsetPx = 0;
    let stickyBlockHeight = 0;
    let treeStickyEntries: TreeStickyEntry[] = [];
    if (this.masterDetailEnabledAtConstruction) {
      const sticky = this.stickyRowTracker.compute(rows, rowScrollTop, rowHeight, start);
      stickyNodeId = sticky.nodeId;
      stickyOffsetPx = sticky.offsetPx;
      stickyBlockHeight = sticky.blockHeight;
      start = sticky.minStart;
    } else if (this.treeExpansionService) {
      // Tree Data's generalization of the same rule — see `TreeStickyRowTracker`:
      // every ancestor of the row currently at the viewport's top stacks as
      // its own sticky row, instead of there only ever being one.
      const sticky = this.treeStickyRowTracker.compute(rows, rowScrollTop, rowHeight, start);
      treeStickyEntries = sticky.entries;
      stickyBlockHeight = sticky.blockHeight;
      start = sticky.minStart;
    }
    this.stickyNodeId = stickyNodeId;

    // Height of the band the sticky overlay currently occupies. The layer's
    // pinned-edge shadow is sized from this so it covers exactly the stuck
    // rows: that layer paints above `.pg-detail-layer`, so a full-height
    // shadow there stripes straight across every expanded Master/Detail row
    // (the full-height divider itself lives on the body panels, one level
    // below the detail layer — see panels.css.ts). Written only on change:
    // `setProperty` invalidates style for the whole subtree, and this runs on
    // every scroll frame.
    if (stickyBlockHeight !== this._lastStickyBlockHeight) {
      this._lastStickyBlockHeight = stickyBlockHeight;
      w.style.setProperty('--pg-sticky-block-height', `${stickyBlockHeight}px`);
    }

    // ── Window pinning during a column resize ───────────────────────────────
    // A live column-width drag deliberately skips `renderRows` (see the branch
    // further down), so the body DOM still holds the rows the previous frame
    // painted. Everything below — the row origin, the position stylesheet, the
    // detail sync, the auto-height measurement — describes "the window", and if
    // that window were recomputed here it would describe one the DOM does not
    // have.
    //
    // `RowPositionSheet` makes the mismatch visible immediately: it replaces the
    // whole stylesheet, so a row still in the DOM but no longer in the window
    // loses its `top` and `height` rules outright. `.pg-row` is absolutely
    // positioned with neither declared anywhere else, so such a row collapses to
    // content height at the panel's static origin — a short, half-height strip
    // sitting under the header.
    //
    // The window genuinely moves between two frames of one resize gesture: a
    // sort widens it by a viewport (`animExtra`) so the FLIP animation has rows
    // to move, and the first resize frame after that animation ends recomputes
    // it back down. Nothing about a column-width drag can legitimately change
    // which rows should be on screen — there is no vertical scroll and no data
    // change — so the painted window is reused for the gesture's duration, and
    // the release repaints normally.
    if (this.headerRenderer.isResizingColumn && this.lastPaintedWindow) {
      start = Math.min(this.lastPaintedWindow.start, rows.length);
      end = Math.min(this.lastPaintedWindow.end, rows.length);
    }

    // Row window for this frame. While a row drag is in progress the dragged
    // row must stay in the DOM even after auto-scroll pushes its *real* position
    // out of the virtual window: the drag preview repositions it via a `top`
    // override near the drop target, but virtualization slices on real tops, so
    // without pinning it here the dragged row (and the visible placeholder that
    // is that row shown translucent) would be evicted, leaving a blank gap.
    // Tell a demand-loading row model what is about to be painted, *before*
    // slicing: such a model publishes a sparse array and fills the requested
    // window synchronously (with cached rows or skeletons), so the slice below
    // is guaranteed to be hole-free. Fetching what is still missing is
    // debounced inside the model, so calling this every render costs nothing.
    this.renderWindowCallback?.(start, end);

    const renderedRows = rows.slice(start, end);
    const draggingNodeId = this.rowDragRenderer?.getDraggingNodeId() ?? null;
    if (draggingNodeId && !renderedRows.some((r) => r.nodeId === draggingNodeId)) {
      // Optional-chained because a sparse row model leaves holes outside the
      // rendered window; a dragged row that is not resident simply isn't found.
      const dragged = rows.find((r) => r?.nodeId === draggingNodeId);
      if (dragged) renderedRows.push(dragged);
    }

    // ── Paint-coordinate rebasing ───────────────────────────────────────────
    // A row's `top` is its absolute offset into the dataset, so a million rows
    // deep it is tens of millions of pixels — and browsers rasterise with
    // 32-bit floats, whose spacing exceeds 1px past 2^24 (~16.7M). At that
    // depth the two edges of a 1px row border round to the same coordinate, the
    // rect collapses to zero height, and the border stops being painted: row
    // separators visibly disappear as you scroll into a large dataset.
    //
    // Positioning rows relative to the top of the render window keeps every
    // painted coordinate within a viewport's worth of zero. The panel transform
    // adds the origin back (ScrollController.setRowOrigin), so nothing moves on
    // screen. The origin and the stylesheet below are written in this same
    // synchronous block, which is what keeps them from ever disagreeing.
    // Optional-chained for the same reason as the dragged-row lookup above: a
    // demand-loading model publishes a sparse array, and an origin of 0 is the
    // correct fallback when the window's first slot is not resident.
    const rowOriginY = renderedRows[0]?.top ?? 0;
    // The origin the panels translate by carries one extra term: the scroll
    // space an in-content top summary band occupies ahead of the first row. The
    // position stylesheet below still writes `top - rowOriginY`, so the two
    // deliberately disagree by exactly that amount — which is what shifts every
    // data row down past the band instead of letting the band overlay them.
    this.scrollController.setRowOrigin(rowOriginY + this.summaryInlineTopH);

    // Update row position stylesheet for visible rows.
    // In auto-height mode always use rowHeight as min-height so that widening a
    // column allows rows to shrink back — the previously measured row.height must
    // not pin min-height or rows can never get shorter.
    this.rowPositionSheet.update(
      renderedRows.map((row) => ({
        nodeId: row.nodeId,
        top: row.top - rowOriginY,
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

    const masterDetailOptions = this.masterDetailEngine?.isEnabled()
      ? {
          toggleColumnId: this.masterDetailEngine.getConfig()?.toggleColumnId ?? allColumns[0]?.colId ?? '',
          isExpandedFn: (nodeId: string) => this.masterDetailEngine!.isExpanded(nodeId),
          hasDetailFn: (rowData: Record<string, unknown>) => this.masterDetailEngine!.hasDetail(rowData),
          emptyToggleMode: this.masterDetailEngine.getEmptyDetailToggleMode(),
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
      // Retained so real-time Virtual DOM patches format cells exactly the way
      // this render did — one source of truth, no drift between the two paths.
      this.lastBodyOptions = {
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
        // The live API, so a cell renderer's `params.api` is the real thing —
        // and `GridApi.getContext()` through it. `null` only in the window
        // before `setParentApiForDetail` runs.
        api: this.gridApi,
        editingEnabled: this.options.editing?.mode !== 'none',
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
      };
      this.bodyRenderer.renderRows(renderedRows, leftCols, visibleCenterCols, rightCols, this.lastBodyOptions);
      // Recorded only here, where rows were actually painted — that is what
      // makes it a description of the DOM rather than of the last arithmetic.
      this.lastPaintedWindow = { start, end };
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
        // Every `top` just moved, so the render window's origin moved with it —
        // re-derive it before restating the sheet (see the rebasing note above).
        // Carries the same in-content summary offset as the first pass.
        const measuredOriginY = renderedRows[0]?.top ?? 0;
        this.scrollController.setRowOrigin(measuredOriginY + this.summaryInlineTopH);
        this.rowPositionSheet.update(
          renderedRows.map((r) => ({ nodeId: r.nodeId, top: r.top - measuredOriginY, height: rowHeight })),
          true,
        );
        // Same reservation the fixed-height path applies: the measured row
        // total is the *rows'* height, and the scrollable content is that plus
        // whatever the in-content summary bands occupy.
        this._cachedRowsHeight = top;
        const measuredTotal = top + summaryReservedH;
        this._cachedTotalHeight = measuredTotal;
        w.style.setProperty('--pg-content-height', `${Math.min(measuredTotal, MAX_ELEMENT_HEIGHT_PX)}px`);
        this.scrollController.updateSizes(measuredTotal, this._cachedCenterW);
      }
    }

    // ── Summary bands ────────────────────────────────────────────────────────
    // Last, and deliberately after the auto-height pass: a non-sticky bottom
    // band is placed immediately after the final row, so it needs the row total
    // that pass may have just rewritten. Uses the same visible column window and
    // spacer widths the header was given, so the two can never disagree about
    // where a column starts.
    if (this.summaryModel) {
      this.renderSummaryBands(
        {
          leftCols,
          centerCols: this.summaryUsesColSpan() ? centerCols : visibleCenterCols,
          rightCols,
          centerLeftSpacerW: this.summaryUsesColSpan() ? 0 : leftSpacerW,
          centerRightSpacerW: this.summaryUsesColSpan() ? 0 : rightSpacerW,
          showCheckboxes: !!this.options.showCheckboxes,
          showSerialNumber: !!this.options.showSerialNumber,
          showVerticalBorders: !!this.options.showVerticalBorders,
          hasGroupColumn: hasGroupedColumns,
          groupColWidth: AUTO_GROUP_COL_WIDTH,
          hasLeftPanel: this.lastLeftPanelWidth > 0,
          hasRightPanel: this.lastRightPanelWidth > 0,
          getColumnWidth: (colId) => this.colStyles.getWidth(colId),
        },
        this._cachedRowsHeight,
        scrollTop,
        viewportHeight,
      );
    }

    this.store.set('firstRenderedRowIndex', start);
    this.store.set('lastRenderedRowIndex', end);

    // ── Row animation (sort / filter / group / detail) ───────────────────────
    // Deliberately the LAST thing this render does that touches row geometry.
    //
    // The auto-height pass above measures rows and, when anything changed,
    // rewrites every `top` in the position stylesheet. Animating before that
    // would invert against positions the very next statement invalidates — the
    // rows would slide toward a layout that no longer exists, then snap. Running
    // here means the DOM already reflects the final order *and* final geometry,
    // which is exactly the ordering the FLIP contract requires.
    //
    // The animator is handed the renderer's live row cache (the same reused
    // elements, no DOM query) and the scroll window, so only rows whose movement
    // is actually on screen animate — sorting 1M rows animates the ~30 rendered
    // ones, and no more.
    if (this.rowAnimator.hasPending()) {
      this.rowAnimator.animate(
        this.bodyRenderer.getRenderedRows(),
        renderedRows,
        { scrollTop, height: viewportHeight },
      );
    }

    // ── Column animation (hide / show / reorder) ─────────────────────────────
    // Same FLIP contract as rows, one axis over: the columns store watcher
    // captured the outgoing offsets before the rebuild, and the DOM now shows
    // the incoming ones. Positions come from `colStyles`' resolved widths, so
    // this reads no layout — see `computeColumnPositions`.
    //
    // The snapshot is refreshed on every render, not only animating ones, so
    // the next structural change always inverts against what is actually on
    // screen (a resize or a flex re-resolve moves columns without animating).
    const columnPositions = this.captureColumnPositions(leftCols, centerCols, rightCols);
    if (this.columnAnimator.hasPending()) this.columnAnimator.animate(columnPositions);
    this.lastColumnPositions = columnPositions;

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

    // Hand plugins the window that was just committed — after every measurement
    // and after the auto-height re-measure, so `rowOriginY` is the value
    // actually baked into this frame's CSS rather than the pre-measure one.
    // Skipped entirely when nothing subscribes, so a plugin-less grid pays a
    // single null check per frame.
    if (this.pluginHost?.wantsRenderWindow()) {
      this.pluginHost.dispatchRenderWindow({
        startIndex: start,
        endIndex: end,
        rowOriginY: this.scrollController.getRowOriginY(),
        rows: renderedRows,
        rowHeight,
        leftPinnedWidth: this.lastLeftPanelWidth,
        rightPinnedWidth: this.lastRightPanelWidth,
        scroll: this.readScrollMetrics(),
        frame: ++this.pluginFrame,
      });
    }

    this.eventBus.emit(GridEventType.ROWS_RENDERED, { renderedCount: renderedRows.length });

  }

  // ─── Store subscriptions ──────────────────────────────────────────────────

  /**
   * Commits a pure column permutation.
   *
   * Every panel still holds exactly the same columns, so no row's DOM needs to
   * be discarded: the header is rebuilt (stateless and cheap — no user cell
   * renderer, no in-flight image) while `BodyRenderer.renderRows` moves the
   * surviving cell elements into their new order. A sparkline keeps its canvas,
   * an `<img>` keeps its decoded bitmap, an open editor keeps its focus — which
   * is exactly what a reorder should cost.
   *
   * The render is forced rather than scheduled. A drop removes the live
   * `--pg-drag-x` transforms synchronously, so deferring the commit to the next
   * animation frame would paint one frame of the *old* order in between — the
   * flash that reads as the column snapping back before jumping into place.
   */
  private applyColumnReorder(): void {
    // Nothing here is an entrance: the columns are already where the user put
    // them, and any snapshot taken for an earlier change is now meaningless.
    this.columnAnimator.cancel();
    this.rebuildHeader();
    this.forceRender();
  }

  private subscribeToStore(): void {
    this.unsubscribers.push(
      this.store.watch('visibleRows', () => this.scheduleRender()),

      this.store.watch('loading', () => this.scheduleRender()),

      this.store.watch('columns', (cols) => {
        // Classify before anything else — a resize writes the columns store on
        // every pointer move, and animating those would fight the drag rather
        // than accompany it.
        const nextLayout = captureColumnLayout(cols as ColumnDef[]);
        const changeKind = diffColumnLayout(this.lastColumnLayout, nextLayout);
        this.lastColumnLayout = nextLayout;

        if (this.headerRenderer.isDraggingCol || this.displayGroupEngine?.isDraggingGroup) {
          // Live drag (leaf column or group): skip header destroy so drag state
          // and live-preview group rows are preserved. Only reset the virtual
          // column range so body cells and panel widths stay in sync — the body
          // itself is reconciled cell-by-cell by `BodyRenderer.renderRows`, not
          // rebuilt, so a cross-panel live move never re-runs a custom cell
          // renderer for a column that merely changed position.
          this.wrapperEl?.classList.add('pg-grid--drag-preview-sync');
          this.lastCenterColStart = -1;
          this.lastCenterColEnd = -1;
          this.scheduleRender();
          requestAnimationFrame(() => {
            this.wrapperEl?.classList.remove('pg-grid--drag-preview-sync');
          });
          return;
        }

        // A drop has already shown the user the movement, frame by frame, via
        // the live `--pg-drag-x` shift. FLIPping the same columns a second time
        // as the model commits would replay a motion that has already finished —
        // so the drop path commits silently and only *structural* changes the
        // user did not watch happen (a hide, a column chooser toggle, a
        // programmatic move) get an entrance animation.
        const isDropCommit = this.headerRenderer.isCommittingColumnDrop;

        if (changeKind === ColumnChangeKind.ORDER_ONLY) {
          this.applyColumnReorder();
          return;
        }

        // Hiding a column from the context menu, dropping one outside the grid,
        // or showing one from the column chooser moves the survivors to new
        // offsets in a single frame. Capturing the outgoing layout lets
        // `performRender` FLIP them across that change on the same 180 ms curve
        // the live drag shift uses.
        //
        // Pinning is deliberately excluded (`ColumnChangeKind.PIN`). A pinned
        // column does not travel to its new home: it leaves the scrollable body
        // and re-appears frozen against the grid's edge, at an offset that means
        // something different in the new panel. FLIPping that sends the column —
        // and every survivor it displaced — sliding the full width of the grid,
        // which reads as the layout sloshing rather than as a column being
        // pinned. The commit is silent instead, exactly like a drop commit.
        if (changeKind === ColumnChangeKind.STRUCTURAL && !isDropCommit) {
          this.columnAnimator.capture(this.lastColumnPositions, 'visibility');
        } else {
          this.columnAnimator.cancel();
        }

        // The body is deliberately NOT cleared. `BodyRenderer.renderRows`
        // reconciles each rendered row's cells against the new layout, so a
        // column that merely moved, got pinned, or scrolled into the horizontal
        // window keeps the exact element it already had — the only cells built
        // are the ones for columns that genuinely appeared. Clearing here would
        // re-run every custom cell renderer in the viewport and is what made
        // images and sparklines blink on every column change.
        this.rebuildHeader();
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
      this.cellSelectionEngine.showContextMenu(p.x, p.y, p.rowIndex, p.colIndex);
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
