import type { GridOptions } from '../types/grid.types';
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
import type { ColumnGroupModel } from '../column-groups/column-group-model';
import type { ColumnGroupHeaderBuilder } from '../column-groups/column-group-header-builder';
import type { DisplayGroupEngine } from '../column-groups/display-group-engine';
import { ColumnStyleManager } from './column-style-manager';
import { CellSelectionEngine } from '../cell-selection/cell-selection-engine';
import type { MasterDetailEngine } from '../engines/master-detail/master-detail-engine';
import type { TreeExpansionService } from '../engines/tree/tree-expansion-service';
import type { ThemeManager } from '../theme/theme-manager';
import { type NestedGridFactory } from './detail-row-renderer';
import type { PhotonCommandResult } from '../photon-ai/photon-ai.types';
export declare class GridRenderer {
    private containerEl;
    private store;
    private eventBus;
    private columnModel;
    private paginationEngine;
    private iconRenderer;
    private cellSelectionEngine;
    private sortEngine;
    private rowSelectionEngine;
    private groupingEngine;
    private options;
    private wrapperEl;
    private leftHeaderPanelEl;
    private centerHeaderInnerEl;
    private rightHeaderPanelEl;
    private leftBodyPanelEl;
    private centerBodyEl;
    private centerBodyContentEl;
    private rightBodyPanelEl;
    private leftBodyContentEl;
    private rightBodyContentEl;
    private footerContainerEl;
    private bodyWrapEl;
    private leftStickyRowEl;
    private centerStickyRowEl;
    private rightStickyRowEl;
    private readonly masterDetailEnabledAtConstruction;
    private readonly treeDataEnabledAtConstruction;
    /** `nodeId` of the currently-stuck master row, or `null` when none is sticky. */
    private stickyNodeId;
    private readonly stickyRowTracker;
    private readonly treeStickyRowTracker;
    /** Exposed for {@link DisplayGroupEngine} construction in `GridCore`. */
    readonly colStyles: ColumnStyleManager;
    private rowPositionSheet;
    private scrollController;
    private headerRenderer;
    private bodyRenderer;
    private footerRenderer;
    private overlayRenderer;
    private groupDropZone;
    private rowDragRenderer;
    private treeDragConfig;
    private detailRowRenderer;
    private masterDetailEngine;
    private treeExpansionService;
    private treeToggleColumnId;
    /** Floating Photon AI command bar — only created when `photonAI.enabled`. */
    private photonAIPanel;
    /** Shows a custom floating tooltip for columns with `renderer.tooltip`; a no-op for every other column. */
    private tooltipController;
    private rafId;
    private autoScroller;
    private unsubscribers;
    private headerRendered;
    private lastCenterColStart;
    private lastCenterColEnd;
    private rowAnimator;
    private columnGroupModel;
    private groupHeaderBuilder;
    private groupDragHandler;
    /** New Display Group Engine — takes priority over the legacy ColumnGroupModel when set. */
    private displayGroupEngine;
    private filterEngine;
    private filterRefreshFn;
    private activeFilterPanel;
    /** Last `columns` array reference seen — guards column-width recomputation. */
    private _lastColumnsRef;
    /** Last `groupedColumnIds` array reference seen — guards grouping recomputation. */
    private _lastGroupedIdsRef;
    /** Last `visibleRows` array reference seen — guards total-height recomputation. */
    private _lastRowsRef;
    /** Cached total content height in pixels (sum of all visible row heights). */
    private _cachedTotalHeight;
    /** Cached center-panel content width in pixels. */
    private _cachedCenterW;
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
    private _lastFlexResolvedWidth;
    constructor(containerEl: HTMLElement, store: GridStore, eventBus: EventBus, columnModel: ColumnModel, paginationEngine: PaginationEngine, iconRenderer: IconRenderer, cellSelectionEngine: CellSelectionEngine, sortEngine: SortEngine, rowSelectionEngine: RowSelectionEngine, groupingEngine: GroupingEngine, options: GridOptions);
    /**
     * Enables Tree Data drag-to-reparent on the row-drag system. Must be
     * called before `mount()` (mirrors `setMasterDetailConfig`) — `mount()`
     * is when `RowDragRenderer` is actually constructed.
     */
    setTreeDragConfig(active: boolean, reparentHandler: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean): void;
    /** Wires Tree Data's expansion state + toggle column into the body renderer, so `data-level` indentation and the expand/collapse toggle render on the configured column. A no-op (undefined `treeData` on every `renderRows` call) until this is called. */
    setTreeRenderConfig(toggleColumnId: string | undefined, expansionService: TreeExpansionService): void;
    mount(): void;
    scheduleRender(): void;
    forceRender(): void;
    /**
     * Clears the body-renderer's row cache so the next render fully rebuilds every
     * visible row from the data model.  Use this after in-place data mutations
     * (paste, cut) where the `visibleRows` reference is unchanged but cell values
     * have been updated — `updatePanelRow` only refreshes row-level classes, not
     * cell content, so a cache invalidation + re-render is required.
     */
    invalidateBodyRows(): void;
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
    invalidateBodyRowsByIds(nodeIds: Set<string>): void;
    /**
     * Provides the renderer with a `FilterEngine` reference so it can read the
     * current filter model and write column filters when the user interacts with
     * the filter panel.  Called from `GridApi` after construction.
     */
    setFilterEngine(engine: FilterEngine): void;
    /**
     * Registers a callback that runs the full sort/filter pipeline and triggers
     * a render whenever the filter state changes from within the panel.
     * Called from `GridApi` after construction.
     */
    setFilterRefreshCallback(fn: () => void): void;
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
    setColumnGroupModel(model: ColumnGroupModel, builder: ColumnGroupHeaderBuilder): void;
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
    setDisplayGroupEngine(engine: DisplayGroupEngine): void;
    /**
     * Opens (or replaces) the floating filter panel for the given column.
     * Called by `HeaderRenderer` when the user clicks a column's filter icon.
     *
     * @param colDef   - Column definition the filter applies to.
     * @param anchorEl - Filter-icon button element — panel positions below this.
     */
    openFilterPanel(colDef: ColumnDef, anchorEl: HTMLElement): void;
    /**
     * Extracts unique display value/label pairs for set-type (dropdown / array)
     * filter panels.  For `dropdown` columns the predefined `dropdownOptions`
     * are used directly; for other types unique values are scanned from `allRows`.
     */
    private extractUniqueOptions;
    /**
     * Snapshot current row positions so the next render animates the transition.
     * Call this **before** any pipeline that reorders or hides rows.
     *
     * @param rows - Current visible rows before the pipeline runs.
     * @param type - `'sort'` (default) or `'filter'` — controls duration and entrance style.
     */
    captureRowAnimation(rows: ReadonlyArray<{
        nodeId: string;
        top: number;
    }>, type?: import('./row-animator').RowAnimationType): void;
    /** Wire up the group-bar search input to an external handler (e.g. api.setQuickFilter). */
    setSearchCallback(fn: (term: string) => void): void;
    /**
     * Wires the Master/Detail engine and nested-grid factory into the renderer.
     * A no-op when `masterDetail.enabled` was falsy at construction (the
     * `DetailRowRenderer` instance was never created). Called once from
     * `GridCore.buildContext`, before `mount()`.
     */
    setMasterDetailConfig(engine: MasterDetailEngine, nestedGridFactory: NestedGridFactory, iconRenderer: IconRenderer, themeManager: ThemeManager): void;
    /**
     * Late-bound once the owning `GridCore`'s `GridApi` exists — passed through
     * to `masterDetail.detailRendererFn` as `DetailRendererParams.parentApi`.
     */
    setParentApiForDetail(api: unknown): void;
    /** The nested grid's `GridApi` for an expanded master row, or `undefined`. Backs `GridApi.getDetailGridApi`. */
    getDetailGridApi(parentNodeId: string): unknown;
    /**
     * Wires the callback the Photon AI panel's send button/Enter key invokes —
     * late-bound once the owning `GridCore`'s `GridApi` (and therefore its
     * `PhotonAIService`) exists. A no-op when `photonAI.enabled` was falsy at
     * construction (the panel was never created).
     */
    setPhotonAISubmitHandler(fn: (text: string) => PhotonCommandResult): void;
    /** Programmatic entry point mirroring the panel's own UI — backs `GridApi.submitAICommand`. */
    submitAICommand(text: string): PhotonCommandResult;
    /**
     * Starts the shrink/fade-out animation for `parentNodeId`'s detail row.
     * Must be called synchronously **before** the pipeline re-runs and removes
     * the row — see `DetailRowRenderer.beginCollapse` for why the timing matters.
     */
    beginDetailCollapse(parentNodeId: string): void;
    scrollToRow(rowIndex: number): void;
    scrollToTop(): void;
    /** Whether the body can still scroll further up. Used by a Master/Detail parent to chain wheel scroll into this grid before forwarding it further up itself. */
    canScrollUp(): boolean;
    /** Whether the body can still scroll further down. */
    canScrollDown(): boolean;
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
    scrollToCell(rowIndex: number, colIndex: number): void;
    getCellRect(rowIndex: number, colIndex: number): DOMRect | null;
    enterFullScreen(): void;
    exitFullScreen(): void;
    destroy(): void;
    private buildLayout;
    /**
     * Builds the top-level sticky-row layer and its three left/center/right
     * regions, mirroring the pinned-column layout via the same
     * `--pg-left-panel-width` / `--pg-right-panel-width` CSS vars the real
     * panels use — so a stuck row lines up pixel-for-pixel with the columns
     * it belongs to. The center region gets its own horizontal-scroll
     * transform so a stuck row's center cells track the user's horizontal
     * scroll exactly like the real (non-sticky) center panel does.
     */
    private buildStickyLayer;
    private performRender;
    private subscribeToStore;
    /**
     * Called when the user clicks a group collapse/expand toggle.
     *
     * When **collapsing**: hides all leaf columns except the first one (the "peek"
     * column) so the group header continues to show meaningful data.
     * When **expanding**: restores all leaf columns to visible.
     *
     * `setColumnVisible` fires `COLUMNS_STATE_CHANGED` → full rebuild.
     */
    private handleGroupToggle;
    /**
     * Called when the user drags a group resize handle.
     * Distributes the new width proportionally among all visible leaf columns.
     */
    private handleGroupResize;
    /**
     * Re-wires column-group references back into `HeaderRenderer` after
     * `headerRenderer.destroy()` has cleared them.
     */
    private rewireGroupModelIntoHeaderRenderer;
    /**
     * Full header rebuild — clears inner HTML and resets the rendered flag so
     * the next `performRender` call re-runs `renderInPanels` with the current
     * group model state.
     */
    private rebuildHeader;
    private generateId;
}
//# sourceMappingURL=grid-renderer.d.ts.map