import type { ColumnDef } from '../types/column.types';
import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
import type { ColumnModel } from '../core/column-model';
import type { SortEngine } from '../engines/sort/sort-engine';
import type { GroupDropZone } from './group-drop-zone';
import type { ColumnGroupModel } from '../column-groups/column-group-model';
import type { ColumnGroupHeaderBuilder } from '../column-groups/column-group-header-builder';
import type { ColumnGroupDragHandler } from '../column-groups/column-group-drag-handler';
import type { DisplayGroupEngine } from '../column-groups/display-group-engine';
import { ColumnStyleManager } from './column-style-manager';
export interface HeaderRendererOptions {
    showCheckboxes?: boolean;
    showSerialNumber?: boolean;
    showFilterRow?: boolean;
    showColumnMenu?: boolean;
    headerRowHeight?: number;
    filterRowHeight?: number;
    hasGroupedColumns?: boolean;
    autoGroupColWidth?: number;
}
export declare class HeaderRenderer {
    private store;
    private eventBus;
    private iconRenderer;
    private columnModel;
    private sortEngine;
    private colStyles;
    private leftHeaderRowEl;
    private centerHeaderRowEl;
    private rightHeaderRowEl;
    private centerFilterRowEl;
    private headerCheckbox;
    private columnMenu;
    private groupContextMenu;
    private groupDropZone;
    /** Tree model for the column group hierarchy. `null` until wired via `setColumnGroupModel`. */
    private groupModel;
    /** DOM builder for multi-row grouped header rows. `null` until wired. */
    private groupHeaderBuilder;
    /** Group header row elements per panel — indexed 0..maxDepth-1. */
    private leftGroupRowEls;
    private centerGroupRowEls;
    private rightGroupRowEls;
    /**
     * Callback invoked when the user clicks a group collapse/expand toggle.
     * Provided by `GridRenderer` so it can coordinate header + body rebuild.
     */
    private onGroupToggleFn;
    /**
     * Callback invoked when the user finishes dragging a group resize handle.
     * `GridRenderer` wires this to distribute the delta and trigger reflow.
     */
    private onGroupResizeFn;
    /**
     * Wired by `GridRenderer` after group model setup — used in `onGlobalMouseUp`
     * to create a clone group when a leaf is dropped onto a different group header.
     */
    private groupDragHandler;
    /**
     * Display Group Engine — the new architecture that replaces ColumnGroupModel.
     * When set, `renderInPanels` uses this engine instead of the legacy model.
     */
    private displayGroupEngine;
    /**
     * Cached header row height from the last `renderInPanels` / `updateCenterVisibleCols`
     * call.  Used by `rebuildGroupRowsForPanel` which is called during drag when
     * `HeaderRendererOptions` is not available on the call stack.
     */
    private lastGroupRowHeight;
    private draggingColId;
    private isDragging;
    private draggingPanelRowEl;
    private draggingIsGroupable;
    private isOverGroupZone;
    private ghostEl;
    private dragStyleEl;
    private draggingGridEl;
    private draggedColWidth;
    private dragStartScrollX;
    private dragIsHideMode;
    private dragSourcePanel;
    private dragTargetPanel;
    private dragTargetLocalIdx;
    private panelDragData;
    private livePanelMoveInProgress;
    private scrollByX;
    private canScrollX;
    private onResizeCb;
    private autoScrollRAF;
    private autoScrollSpeed;
    private centerPanelRect;
    /** Last known cursor X during column drag — used to replay `onDragMove` after auto-scroll ticks. */
    private lastDragClientX;
    private boundMouseMove;
    private boundMouseUp;
    /** Callback wired by GridRenderer to open a filter panel for a column. */
    private openFilterPanelFn;
    /** Read by grid-renderer's columns-store watcher to skip header destroy during drag */
    get isDraggingCol(): boolean;
    /** True while the user holds the resize handle and is actively moving the mouse. */
    private _isResizingColumn;
    /**
     * `true` between the resize-handle `mousedown` and the corresponding `mouseup`.
     * Grid-renderer uses this to suppress body `renderRows` during resize — column
     * widths are driven by CSS rules from `ColumnStyleManager`, so the body DOM
     * never needs to be rebuilt while the user is dragging a resize handle.
     */
    get isResizingColumn(): boolean;
    constructor(store: GridStore, eventBus: EventBus, iconRenderer: IconRenderer, columnModel: ColumnModel, sortEngine: SortEngine, colStyles: ColumnStyleManager);
    setScrollCallback(fn: (dx: number) => void, canScrollX?: (dir: 1 | -1) => boolean): void;
    setResizeCallback(cb: () => void): void;
    /**
     * Register the callback invoked when the user clicks the filter icon on a
     * filterable column header.  Wired by `GridRenderer.buildLayout()`.
     *
     * @param fn - Opens/positions a `FilterPanel` for the given column.
     */
    setOpenFilterPanelCallback(fn: (colDef: ColumnDef, anchorEl: HTMLElement) => void): void;
    /**
     * Wire the column-group model and DOM builder into the header renderer.
     *
     * Call this before the first `renderInPanels` when the grid's column
     * definitions contain groups (i.e. `ColumnDef.children` is present on any
     * top-level column).  Once wired, `renderInPanels` and `updateCenterVisibleCols`
     * automatically insert and update the multi-row grouped header rows.
     *
     * @param model   - The live {@link ColumnGroupModel} for the grid.
     * @param builder - The {@link ColumnGroupHeaderBuilder} instance.
     */
    setColumnGroupModel(model: ColumnGroupModel, builder: ColumnGroupHeaderBuilder): void;
    /**
     * Wire the new Display Group Engine into the header renderer.
     * When set, `renderInPanels` uses the engine's builder instead of the legacy
     * `ColumnGroupModel` + `ColumnGroupHeaderBuilder`.
     *
     * @param engine - The fully-initialised `DisplayGroupEngine` instance.
     */
    setDisplayGroupEngine(engine: DisplayGroupEngine): void;
    /**
     * Register the callback fired when a user toggles a group's collapse state.
     *
     * `GridRenderer` wires this to coordinate header rebuild + leaf-column
     * visibility update in `ColumnModel`.
     *
     * @param fn - Receives the `groupId` of the toggled group.
     */
    setGroupToggleCallback(fn: (groupId: string) => void): void;
    /**
     * Register the callback fired when a user finishes dragging a group resize handle.
     *
     * `GridRenderer` wires this to call {@link ColumnGroupModel.distributeResizeDelta}
     * and flush the updated widths to `ColumnStyleManager`.
     *
     * @param fn - Receives `groupId` and the new desired total group width.
     */
    setGroupResizeCallback(fn: (groupId: string, newWidth: number) => void): void;
    /**
     * Wire the group drag handler so that leaf drops on foreign group header cells
     * create solo clone groups instead of doing a plain column reorder.
     *
     * @param handler - The active `ColumnGroupDragHandler` instance.
     */
    setGroupDragHandler(handler: ColumnGroupDragHandler): void;
    /**
     * Rebuild only the group-header rows for all panels without touching the leaf
     * row or filter row.  Call this after a group collapse/expand event has already
     * been processed by the model (i.e. `group.collapsed` flag is up to date).
     *
     * @param options - Header renderer options (passed from last `renderInPanels` call).
     */
    rebuildGroupRows(options: HeaderRendererOptions): void;
    /**
     * Updates the filter-active indicator (`pg-th--filter-active` class and icon
     * swap) on every rendered header cell based on the current `FilterModel`.
     * Called from the renderer's `filterModel` store watcher.
     *
     * @param activeColIds - Set of `colId` strings that currently have an active filter.
     */
    updateFilterIndicators(activeColIds: Set<string>): void;
    /**
     * Build the {@link GroupCellBuildOptions} object forwarded to the DOM builder.
     * Wires the toggle and resize callbacks registered by `GridRenderer`.
     */
    private buildGroupCellOptions;
    renderInPanels(leftContainer: HTMLElement, centerInnerEl: HTMLElement, rightContainer: HTMLElement, allColumns: ColumnDef[], options?: HeaderRendererOptions): void;
    updateSortIndicator(colId: string, order: 'asc' | 'desc' | null): void;
    updateAllChecked(isAll: boolean, isIndeterminate: boolean): void;
    setGroupDropZone(zone: GroupDropZone): void;
    destroy(): void;
    updateCenterVisibleCols(visibleCols: ColumnDef[], leftSpacerW: number, rightSpacerW: number, options: HeaderRendererOptions): void;
    private makeSpacer;
    private capturePanelDragData;
    private buildHeaderRow;
    private buildAutoGroupTh;
    private buildCheckboxHeaderCell;
    private buildSerialHeaderCell;
    private buildHeaderCell;
    private buildFilterCell;
    private buildFilterRow;
    private attachColumnDragListeners;
    private startColumnDrag;
    /**
     * When the cursor crosses into a new panel:
     * 1. Immediately DOM-move the source TH into the target panel header row
     * 2. Call moveAndPin() so body cells and panel widths update via the guarded re-render
     * 3. After 2 frames (re-render complete), re-capture rects and continue drag
     */
    private moveToPanelLive;
    private readonly tickAutoScroll;
    private updateAutoScroll;
    private stopAutoScroll;
    /**
     * Re-captures header column rects and re-applies drag transforms after each
     * auto-scroll step.  Runs 2 animation frames after the scroll so the grid's
     * virtual column render (`updateCenterVisibleCols`) has completed and the DOM
     * reflects any newly visible columns before `getBoundingClientRect` is called.
     *
     * This mirrors the 2-frame pattern used by `moveToPanelLive` and ensures the
     * dragged-column ghost and sibling transforms stay accurate even when the
     * mouse is stationary at the viewport edge while auto-scroll is running.
     */
    private refreshDragAfterScroll;
    /**
     * Rebuild the group header rows for one panel using a new (possibly preview)
     * column order.  Safe to call during drag — only the group row `<div>`s are
     * replaced; the leaf row `<tr>` that carries the live drag element is untouched.
     *
     * @param panel - Which panel's group rows to refresh.
     * @param cols  - Ordered visible columns for this panel (preview or committed).
     */
    private rebuildGroupRowsForPanel;
    /**
     * Compute the preview column order for the drag source panel (same-panel drag)
     * and rebuild its group rows.
     *
     * Called from `onDragMove` whenever the effective drop slot changes.  Always
     * derives the preview from the captured `panelDragData` colIds so the
     * `LogicalGroupRegistry` sees the exact order the column would land in on drop.
     *
     * @param targetIdx   - Effective slot index the dragged column is hovering over.
     * @param sourceIdx   - Original slot index of the dragged column in its panel.
     * @param pd          - Panel drag data for the source panel.
     */
    private rebuildGroupRowsWithPreview;
    private onDragMove;
    private onGlobalMouseMove;
    private onGlobalMouseUp;
    private cleanupDrag;
    private startResize;
    /**
     * Returns `true` when `colId` (at its new position `newIdx` in the visible
     * columns array) is no longer adjacent to any sibling leaf from its parent
     * group — meaning it has been dragged outside the group's contiguous span.
     *
     * @param colId  - The moved leaf column.
     * @param newIdx - Its new index in `cols`.
     * @param cols   - Current flat visible-column array (after the move).
     */
    private isLeafOutsideGroup;
    private onAction;
}
//# sourceMappingURL=header-renderer.d.ts.map