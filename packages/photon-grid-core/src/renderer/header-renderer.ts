import type { ColumnDef, AggFunc, ColumnDataType } from '../types/column.types';
import { HeaderIconDisplay } from '../types/column.types';
import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
import type { ColumnModel } from '../core/column-model';
import type { SortEngine } from '../engines/sort/sort-engine';
import type { GroupDropZone } from './group-drop-zone';
import type { ColumnGroupModel } from '../column-groups/column-group-model';
import type { ColumnGroupHeaderBuilder, GroupCellBuildOptions } from '../column-groups/column-group-header-builder';
import type { ColumnGroupDragHandler } from '../column-groups/column-group-drag-handler';
import type { DisplayGroupEngine } from '../column-groups/display-group-engine';
import type { DisplayGroupNode } from '../column-groups/display-group.types';
import { GridEventType } from '../types/event.types';
import { ColumnMenu } from './column-menu';
import { GroupContextMenu } from './group-context-menu';
import { ColumnStyleManager } from './column-style-manager';
import { createDiv, toggleClass } from './dom-utils';
import { resolveColumnRenderer } from './renderer-resolver';
import {
  isTouchPointer,
  DRAG_THRESHOLD_MOUSE,
  DRAG_THRESHOLD_TOUCH,
  LONG_PRESS_MS,
} from '../core/pointer-utils';

export interface HeaderRendererOptions {
  showCheckboxes?: boolean;
  showSerialNumber?: boolean;
  showFilterRow?: boolean;
  showColumnMenu?: boolean;
  headerRowHeight?: number;
  filterRowHeight?: number;
  hasGroupedColumns?: boolean;
  autoGroupColWidth?: number;
  /** Grid-wide default display mode for the filter funnel icon. @default HeaderIconDisplay.HOVER */
  filterIconDisplay?: HeaderIconDisplay;
  /** Grid-wide default display mode for the column-menu "⋯" icon. @default HeaderIconDisplay.HOVER */
  menuIconDisplay?: HeaderIconDisplay;
}

interface PanelDragEntry {
  panel: 'left' | 'center' | 'right';
  rects: DOMRect[];
  colIds: string[];
  bounds: DOMRect | null;
}

export class HeaderRenderer {
  private leftHeaderRowEl: HTMLElement | null = null;
  private centerHeaderRowEl: HTMLElement | null = null;
  private rightHeaderRowEl: HTMLElement | null = null;
  private leftFilterRowEl: HTMLElement | null = null;
  private centerFilterRowEl: HTMLElement | null = null;
  private rightFilterRowEl: HTMLElement | null = null;
  private headerCheckbox: HTMLInputElement | null = null;
  private columnMenu: ColumnMenu;
  private groupContextMenu: GroupContextMenu | null = null;
  private groupDropZone: GroupDropZone | null = null;

  // ── Column-group header support ───────────────────────────────────────────

  /** Tree model for the column group hierarchy. `null` until wired via `setColumnGroupModel`. */
  private groupModel:         ColumnGroupModel | null = null;
  /** DOM builder for multi-row grouped header rows. `null` until wired. */
  private groupHeaderBuilder: ColumnGroupHeaderBuilder | null = null;
  /** Group header row elements per panel — indexed 0..maxDepth-1. */
  private leftGroupRowEls:    HTMLElement[] = [];
  private centerGroupRowEls:  HTMLElement[] = [];
  private rightGroupRowEls:   HTMLElement[] = [];
  /**
   * Callback invoked when the user clicks a group collapse/expand toggle.
   * Provided by `GridRenderer` so it can coordinate header + body rebuild.
   */
  private onGroupToggleFn: ((groupId: string) => void) | null = null;
  /**
   * Callback invoked when the user finishes dragging a group resize handle.
   * `GridRenderer` wires this to distribute the delta and trigger reflow.
   */
  private onGroupResizeFn: ((groupId: string, newWidth: number) => void) | null = null;
  /**
   * Wired by `GridRenderer` after group model setup — used in `onGlobalMouseUp`
   * to create a clone group when a leaf is dropped onto a different group header.
   */
  private groupDragHandler: ColumnGroupDragHandler | null = null;

  /**
   * Display Group Engine — the new architecture that replaces ColumnGroupModel.
   * When set, `renderInPanels` uses this engine instead of the legacy model.
   */
  private displayGroupEngine: DisplayGroupEngine | null = null;

  /**
   * Cached header row height from the last `renderInPanels` / `updateCenterVisibleCols`
   * call.  Used by `rebuildGroupRowsForPanel` which is called during drag when
   * `HeaderRendererOptions` is not available on the call stack.
   */
  private lastGroupRowHeight = 44;

  // Drag state
  private draggingColId: string | null = null;
  private isDragging = false;
  private draggingPanelRowEl: HTMLElement | null = null;
  private draggingIsGroupable = false;
  private isOverGroupZone = false;
  private ghostEl: HTMLElement | null = null;
  private dragStyleEl: HTMLStyleElement | null = null;
  private draggingGridEl: HTMLElement | null = null;
  private draggedColWidth = 0;
  private dragStartScrollX = 0;
  private dragIsHideMode = false;
  private dragSourcePanel: 'left' | 'center' | 'right' = 'center';
  private dragTargetPanel: 'left' | 'center' | 'right' = 'center';
  private dragTargetLocalIdx = -1;
  private panelDragData: PanelDragEntry[] = [];

  // Live cross-panel move state
  private livePanelMoveInProgress = false;

  // Auto-scroll state
  private scrollByX: ((dx: number) => void) | null = null;
  private canScrollX: ((dir: 1 | -1) => boolean) | null = null;
  private onResizeCb: (() => void) | null = null;
  private autoScrollRAF = 0;
  private autoScrollSpeed = 0;
  private centerPanelRect: DOMRect | null = null;
  /** Last known cursor X during column drag — used to replay `onDragMove` after auto-scroll ticks. */
  private lastDragClientX = 0;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  /** Callback wired by GridRenderer to open a filter panel for a column. */
  private openFilterPanelFn: ((colDef: ColumnDef, anchorEl: HTMLElement) => void) | null = null;

  /**
   * Callback wired by GridRenderer to apply a live, per-column text filter as the
   * user types in an inline filter-row input. Receives the empty string when the
   * input is cleared so the column filter can be removed.
   */
  private applyInlineFilterFn: ((colDef: ColumnDef, term: string) => void) | null = null;

  /** Callback wired by GridRenderer to open the Column Chooser dialog. */
  private openColumnChooserFn: (() => void) | null = null;

  /** Callback wired by GridRenderer to re-run the data pipeline (e.g. after an aggregate change). */
  private columnDataRefreshFn: (() => void) | null = null;

  /**
   * Callback wired by GridRenderer to scroll a (possibly virtualized) center
   * column into view so keyboard header navigation can focus it.
   */
  private ensureColumnVisibleFn: ((colId: string) => void) | null = null;

  /**
   * Column id of the header cell that participates in the tab order (roving
   * tabindex). All other header cells are `tabindex="-1"`. `null` until the
   * first render resolves it to the first visible data column. See
   * {@link setRovingCell} and {@link buildHeaderCell}.
   */
  private rovingColId: string | null = null;

  /** Read by grid-renderer's columns-store watcher to skip header destroy during drag */
  get isDraggingCol(): boolean { return this.isDragging; }

  /**
   * `true` while the header owns the pointer for a column reorder or resize.
   * The ScrollController's touch-pan yields to this (see `setGestureGuard`) so a
   * long-press reorder or an edge resize is never fought by kinetic scrolling.
   */
  get isBusy(): boolean { return this.isDragging || this._isResizingColumn; }

  /** True while the user holds the resize handle and is actively moving the mouse. */
  private _isResizingColumn = false;

  /** Column id and timestamp of the last resize-handle press, for double-click (auto-size) detection. */
  private lastResizeDownColId = '';
  private lastResizeDownAt = 0;

  /**
   * `true` between the resize-handle `mousedown` and the corresponding `mouseup`.
   * Grid-renderer uses this to suppress body `renderRows` during resize — column
   * widths are driven by CSS rules from `ColumnStyleManager`, so the body DOM
   * never needs to be rebuilt while the user is dragging a resize handle.
   */
  get isResizingColumn(): boolean { return this._isResizingColumn; }

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
    private iconRenderer: IconRenderer,
    private columnModel: ColumnModel,
    private sortEngine: SortEngine,
    private colStyles: ColumnStyleManager,
  ) {
    this.columnMenu = new ColumnMenu(
      columnModel, sortEngine, eventBus, iconRenderer,
      (action, colId) => this.onAction(action, colId),
    );
    this.columnMenu.setMenuCallbacks({
      onAutoSize:         (colId) => { this.autoSizeColumns([colId]); this.onAction('autosize', colId); },
      onAutoSizeAll:      ()      => { this.autoSizeColumns(this.columnModel.getVisibleColumns().map((c) => c.colId)); this.onAction('autosize-all', ''); },
      onFitToGrid:        ()      => { this.fitColumnsToGrid(); this.onAction('fit-to-grid', ''); },
      onResetWidth:       (colId) => { this.resetColumnWidth(colId); this.onAction('reset-width', colId); },
      onOpenColumnChooser: ()     => { this.openColumnChooserFn?.(); this.onAction('column-chooser', ''); },
      onOpenAdvancedFilter: (colDef, anchorEl) => {
        this.openFilterPanelFn?.(colDef, anchorEl);
        this.onAction('advanced-filter', colDef.colId);
      },
      onQuickFilter: (colId) => this.onAction('quick-filter', colId),
      onCopyHeader:  (colDef) => {
        navigator.clipboard?.writeText(colDef.header).catch(() => {});
        this.onAction('copy-header', colDef.colId);
      },
      onCopyColumn:  (colDef) => this.onAction('copy-column',  colDef.colId),
      onCopyValues:  (colDef) => this.onAction('copy-values',  colDef.colId),
      onRename:      (colDef) => { this.startHeaderRename(colDef.colId); this.onAction('rename', colDef.colId); },
      onDuplicate:   (colDef) => { this.columnModel.duplicateColumn(colDef.colId); this.onAction('duplicate', colDef.colId); },
      onFreezePosition: (colDef) => { this.columnModel.toggleColumnFrozen(colDef.colId); this.onAction('freeze', colDef.colId); },
      onLockColumn:  (colDef) => { this.columnModel.toggleColumnLocked(colDef.colId); this.onAction('lock', colDef.colId); },
      onResetColumn: (colDef) => { this.colStyles.clearUserWidth(colDef.colId); this.columnModel.resetColumn(colDef.colId); this.onAction('reset-column', colDef.colId); },
      onAggregate:   (colDef, func) => {
        // Toggle: re-selecting the current function clears it.
        const f = func as AggFunc;
        const current = this.columnModel.getColumn(colDef.colId)?.aggFunc;
        this.columnModel.setColumnAggFunc(colDef.colId, current === f ? null : f);
        // aggFunc only affects the *grouped* aggregation display, so a data
        // pipeline refresh is only needed when grouping is active. When it isn't,
        // the change has no visible effect yet (it applies the next time rows are
        // grouped) — so we skip refresh() to avoid rebuilding unrelated live
        // views such as linked range charts, which watch `visibleRows`.
        if ((this.store.get('groupedColumnIds') as string[]).length > 0) {
          this.columnDataRefreshFn?.();
        }
        this.onAction(`aggregate-${func}`, colDef.colId);
      },
      onMoveLeft: (colId) => {
        const cols = columnModel.getVisibleColumns();
        const idx  = cols.findIndex((c) => c.colId === colId);
        if (idx > 0) { columnModel.moveColumn(idx, idx - 1); this.onAction('move', colId); }
      },
      onMoveRight: (colId) => {
        const cols = columnModel.getVisibleColumns();
        const idx  = cols.findIndex((c) => c.colId === colId);
        if (idx < cols.length - 1) { columnModel.moveColumn(idx, idx + 1); this.onAction('move', colId); }
      },
      onMoveStart: (colId) => {
        const cols = columnModel.getVisibleColumns();
        const idx  = cols.findIndex((c) => c.colId === colId);
        if (idx > 0) { columnModel.moveColumn(idx, 0); this.onAction('move', colId); }
      },
      onMoveEnd: (colId) => {
        const cols = columnModel.getVisibleColumns();
        const idx  = cols.findIndex((c) => c.colId === colId);
        if (idx < cols.length - 1) { columnModel.moveColumn(idx, cols.length - 1); this.onAction('move', colId); }
      },
    });
    this.boundMouseMove = this.onGlobalMouseMove.bind(this);
    this.boundMouseUp = this.onGlobalMouseUp.bind(this);

    // Keep the sort arrows in sync in place. Sorting no longer rebuilds the
    // header (that teardown fought the row animation), so the indicator is
    // updated directly here — covering both header clicks and programmatic
    // sorts. `colId === ''` (clear-all) clears every arrow.
    this.eventBus.on(GridEventType.COLUMN_SORTED, (payload: unknown) => {
      const p = payload as { colId: string; order: 'asc' | 'desc' | null };
      this.updateSortIndicator(p.colId, p.order);
    });
  }

  setScrollCallback(fn: (dx: number) => void, canScrollX?: (dir: 1 | -1) => boolean): void {
    this.scrollByX = fn;
    this.canScrollX = canScrollX ?? null;
  }

  setResizeCallback(cb: () => void): void {
    this.onResizeCb = cb;
  }

  /**
   * Register the callback invoked when the user clicks the filter icon on a
   * filterable column header.  Wired by `GridRenderer.buildLayout()`.
   *
   * @param fn - Opens/positions a `FilterPanel` for the given column.
   */
  setOpenFilterPanelCallback(fn: (colDef: ColumnDef, anchorEl: HTMLElement) => void): void {
    this.openFilterPanelFn = fn;
  }

  /**
   * Register the callback invoked as the user types in an inline filter-row
   * input, applying a live per-column text filter. Wired by
   * `GridRenderer.buildLayout()`. Only fires for free-text (non set-type) columns
   * — set-type columns (see {@link SET_FILTER_TYPES}) filter through the panel.
   *
   * @param fn - Applies (or clears, on empty term) the column's text filter.
   */
  setInlineFilterCallback(fn: (colDef: ColumnDef, term: string) => void): void {
    this.applyInlineFilterFn = fn;
  }

  /**
   * Registers the callback that opens the Column Chooser dialog, invoked from
   * the column menu's and group menu's "Column Chooser…" items.
   *
   * @param fn - Opens the chooser (owned by `GridRenderer`).
   */
  setColumnChooserCallback(fn: () => void): void {
    this.openColumnChooserFn = fn;
  }

  /**
   * Registers a callback that re-runs the grid's data pipeline (filter → sort →
   * group → aggregate). Invoked after a column aggregate function changes so
   * group aggregations recompute immediately when grouping is active.
   *
   * @param fn - Runs the pipeline + render (typically `GridApi.refresh`).
   */
  setColumnDataRefreshCallback(fn: () => void): void {
    this.columnDataRefreshFn = fn;
  }

  /**
   * Register the callback that scrolls a center column into view. Invoked during
   * keyboard header navigation before focusing a column that may currently be
   * virtualized out of the DOM.
   *
   * @param fn - Reveals the column (typically `GridRenderer.ensureColumnVisible`).
   */
  setEnsureColumnVisibleCallback(fn: (colId: string) => void): void {
    this.ensureColumnVisibleFn = fn;
  }

  /**
   * Configure the column context menu (sections, suppressed items, custom items,
   * right-click behaviour). Forwarded to the internal {@link ColumnMenu}.
   *
   * @param cfg - Grid-wide column-menu configuration.
   */
  setMenuOptions(cfg: import('../types/column-menu.types').ColumnMenuConfig): void {
    this.columnMenu.setMenuOptions(cfg);
  }

  /**
   * Register the AG-Grid-style `getColumnMenuItems` transform. Forwarded to the
   * internal {@link ColumnMenu}.
   *
   * @param fn - Final item-list transform, or `undefined` to clear.
   */
  setColumnMenuItemsCallback(
    fn: import('../types/column-menu.types').GetColumnMenuItems | undefined,
  ): void {
    this.columnMenu.setColumnMenuItemsCallback(fn);
  }

  /**
   * Provide the grid's public API to the column menu, forwarded to custom-item
   * actions via {@link import('../types/column-menu.types').ColumnMenuItemContext}.
   *
   * @param api - The owning grid's `GridApi` (typed `unknown` to avoid a cycle).
   */
  setMenuApi(api: unknown): void {
    this.columnMenu.setMenuApi(api);
  }

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
  setColumnGroupModel(model: ColumnGroupModel, builder: ColumnGroupHeaderBuilder): void {
    this.groupModel         = model;
    this.groupHeaderBuilder = builder;
  }

  /**
   * Wire the new Display Group Engine into the header renderer.
   * When set, `renderInPanels` uses the engine's builder instead of the legacy
   * `ColumnGroupModel` + `ColumnGroupHeaderBuilder`.
   *
   * @param engine - The fully-initialised `DisplayGroupEngine` instance.
   */
  setDisplayGroupEngine(engine: DisplayGroupEngine): void {
    this.displayGroupEngine = engine;
    this.groupContextMenu = new GroupContextMenu(engine, this.iconRenderer);
    this.groupContextMenu.setCallbacks({
      onOpenColumnChooser: () => { this.openColumnChooserFn?.(); this.onAction('column-chooser', ''); },
      onAction: (action, groupId) => this.onAction(action, groupId),
    });
  }

  /**
   * Register the callback fired when a user toggles a group's collapse state.
   *
   * `GridRenderer` wires this to coordinate header rebuild + leaf-column
   * visibility update in `ColumnModel`.
   *
   * @param fn - Receives the `groupId` of the toggled group.
   */
  setGroupToggleCallback(fn: (groupId: string) => void): void {
    this.onGroupToggleFn = fn;
  }

  /**
   * Register the callback fired when a user finishes dragging a group resize handle.
   *
   * `GridRenderer` wires this to call {@link ColumnGroupModel.distributeResizeDelta}
   * and flush the updated widths to `ColumnStyleManager`.
   *
   * @param fn - Receives `groupId` and the new desired total group width.
   */
  setGroupResizeCallback(fn: (groupId: string, newWidth: number) => void): void {
    this.onGroupResizeFn = fn;
  }

  /**
   * Wire the group drag handler so that leaf drops on foreign group header cells
   * create solo clone groups instead of doing a plain column reorder.
   *
   * @param handler - The active `ColumnGroupDragHandler` instance.
   */
  setGroupDragHandler(handler: ColumnGroupDragHandler): void {
    this.groupDragHandler = handler;
  }

  /**
   * Rebuild only the group-header rows for all panels without touching the leaf
   * row or filter row.  Call this after a group collapse/expand event has already
   * been processed by the model (i.e. `group.collapsed` flag is up to date).
   *
   * @param options - Header renderer options (passed from last `renderInPanels` call).
   */
  rebuildGroupRows(options: HeaderRendererOptions): void {
    if (!this.groupModel || !this.groupHeaderBuilder) return;
    if (!this.groupModel.hasGroups()) return;

    const maxDepth   = this.groupModel.getMaxDepth();
    const rowHeight  = options.headerRowHeight ?? 44;
    const cellOpts   = this.buildGroupCellOptions(rowHeight);

    const rebuildPanel = (
      rowEls:  HTMLElement[],
      panel:   'left' | 'center' | 'right',
    ) => {
      const nodes = this.groupModel!.getRootNodes(panel);
      this.groupHeaderBuilder!.updateGroupRows(rowEls, nodes, this.colStyles, maxDepth, cellOpts);
    };

    rebuildPanel(this.leftGroupRowEls,   'left');
    rebuildPanel(this.centerGroupRowEls, 'center');
    rebuildPanel(this.rightGroupRowEls,  'right');
  }

  /**
   * Updates the filter-active indicator (`pg-th--filter-active` class and icon
   * swap) on every rendered header cell based on the current `FilterModel`.
   * Called from the renderer's `filterModel` store watcher.
   *
   * @param activeColIds - Set of `colId` strings that currently have an active filter.
   */
  updateFilterIndicators(activeColIds: Set<string>): void {
    const rows = [
      this.leftHeaderRowEl,
      this.centerHeaderRowEl,
      this.rightHeaderRowEl,
    ].filter((r): r is HTMLElement => r !== null);

    for (const row of rows) {
      for (const cell of Array.from(row.querySelectorAll<HTMLElement>('.pg-th[data-col-id]'))) {
        const colId = cell.getAttribute('data-col-id') ?? '';
        const active = activeColIds.has(colId);
        cell.classList.toggle('pg-th--filter-active', active);
        const btn = cell.querySelector<HTMLElement>('.pg-th__filter-btn');
        if (btn) {
          btn.classList.toggle('pg-th__filter-btn--active', active);
          const iconName = active ? 'filterActive' : 'filter';
          const iconEl = btn.querySelector<HTMLElement>('.pg-icon');
          if (iconEl) this.iconRenderer.updateIcon(iconEl, iconName);
        }
      }
    }

    // Keep the inline filter-row icons in sync with header state.
    const filterRows = [
      this.leftFilterRowEl,
      this.centerFilterRowEl,
      this.rightFilterRowEl,
    ].filter((r): r is HTMLElement => r !== null);

    for (const row of filterRows) {
      for (const cell of Array.from(row.querySelectorAll<HTMLElement>('.pg-filter-cell[data-col-id]'))) {
        const colId = cell.getAttribute('data-col-id') ?? '';
        const active = activeColIds.has(colId);
        const icon = cell.querySelector<HTMLElement>('.pg-filter-cell__icon');
        if (!icon) continue;
        icon.classList.toggle('pg-filter-cell__icon--active', active);
        this.iconRenderer.updateIcon(icon, active ? 'filterActive' : 'filter', { size: 14 });
      }
    }
  }

  // ── Private: group-cell option builder ───────────────────────────────────

  /**
   * Build the {@link GroupCellBuildOptions} object forwarded to the DOM builder.
   * Wires the toggle and resize callbacks registered by `GridRenderer`.
   */
  private buildGroupCellOptions(rowHeight: number): GroupCellBuildOptions {
    return {
      rowHeight,
      onCollapseToggle: (groupId: string) => {
        this.onGroupToggleFn?.(groupId);
      },
      onGroupResize: (groupId: string, newWidth: number) => {
        this.onGroupResizeFn?.(groupId, newWidth);
      },
    };
  }

  renderInPanels(
    leftContainer: HTMLElement,
    centerInnerEl: HTMLElement,
    rightContainer: HTMLElement,
    allColumns: ColumnDef[],
    options: HeaderRendererOptions = {},
  ): void {
    const leftCols   = allColumns.filter((c) => c.pinned === 'left');
    const centerCols = allColumns.filter((c) => c.pinned !== 'left' && c.pinned !== 'right');
    const rightCols  = allColumns.filter((c) => c.pinned === 'right');

    this.lastGroupRowHeight = options.headerRowHeight ?? this.lastGroupRowHeight;

    // ── Group header rows (must be inserted BEFORE leaf row) ──────────────
    this.leftGroupRowEls   = [];
    this.centerGroupRowEls = [];
    this.rightGroupRowEls  = [];

    if (this.displayGroupEngine?.hasGroups) {
      // ── New Display Group Engine path ─────────────────────────────────────
      const engine     = this.displayGroupEngine;
      const rowHeight  = options.headerRowHeight ?? 44;
      const dragHandler = engine.getDragHandler();
      const cellOpts = {
        rowHeight,
        onCollapseToggle:    (id: string)              => this.onGroupToggleFn?.(id),
        onGroupResize:       (id: string, w: number)   => this.onGroupResizeFn?.(id, w),
        onGroupHeaderMouseDown: dragHandler
          ? (e: PointerEvent, node: import('../column-groups/display-group.types').DisplayGroupNode, el: HTMLElement) =>
              dragHandler.onHeaderMouseDown(e, node, el)
          : undefined,
        didJustDragFn:       dragHandler ? () => dragHandler.didJustDrag : undefined,
        onGroupContextMenu:  (e: MouseEvent, node: DisplayGroupNode, el: HTMLElement) =>
          this.groupContextMenu?.show(node, el, e.clientX, e.clientY),
      };

      this.leftGroupRowEls = engine.headerBuilder.buildGroupRows(
        engine.buildTree(leftCols), cellOpts,
      );
      this.centerGroupRowEls = engine.headerBuilder.buildGroupRows(
        engine.buildTree(centerCols), cellOpts,
      );
      this.rightGroupRowEls = engine.headerBuilder.buildGroupRows(
        engine.buildTree(rightCols), cellOpts,
      );

      for (const el of this.leftGroupRowEls)   leftContainer.appendChild(el);
      for (const el of this.centerGroupRowEls) centerInnerEl.appendChild(el);
      for (const el of this.rightGroupRowEls)  rightContainer.appendChild(el);

      // Flat column cells use this to compute their full-height transform.
      leftContainer.style.setProperty('--pg-group-rows-count', String(this.leftGroupRowEls.length));
      centerInnerEl.style.setProperty('--pg-group-rows-count', String(this.centerGroupRowEls.length));
      rightContainer.style.setProperty('--pg-group-rows-count', String(this.rightGroupRowEls.length));

    } else if (this.groupModel?.hasGroups() && this.groupHeaderBuilder) {
      // ── Legacy ColumnGroupModel path (kept for compatibility) ─────────────
      const maxDepth  = this.groupModel.getMaxDepth();
      const rowHeight = options.headerRowHeight ?? 44;
      const cellOpts  = this.buildGroupCellOptions(rowHeight);

      this.leftGroupRowEls = this.groupHeaderBuilder.buildGroupRows(
        this.groupModel.getRootNodes('left'), this.colStyles, maxDepth, cellOpts,
      );
      this.centerGroupRowEls = this.groupHeaderBuilder.buildGroupRows(
        this.groupModel.getRootNodes('center'), this.colStyles, maxDepth, cellOpts,
      );
      this.rightGroupRowEls = this.groupHeaderBuilder.buildGroupRows(
        this.groupModel.getRootNodes('right'), this.colStyles, maxDepth, cellOpts,
      );

      for (const el of this.leftGroupRowEls)   leftContainer.appendChild(el);
      for (const el of this.centerGroupRowEls) centerInnerEl.appendChild(el);
      for (const el of this.rightGroupRowEls)  rightContainer.appendChild(el);
    }

    // ── Leaf header rows ──────────────────────────────────────────────────
    this.leftHeaderRowEl = this.buildHeaderRow(leftCols, options, true);
    leftContainer.appendChild(this.leftHeaderRowEl);
    if (options.showFilterRow) {
      this.leftFilterRowEl = this.buildFilterRow(leftCols, options, true);
      leftContainer.appendChild(this.leftFilterRowEl);
    }

    this.centerHeaderRowEl = this.buildHeaderRow(centerCols, options, false);
    if (options.hasGroupedColumns) {
      this.centerHeaderRowEl.insertBefore(
        this.buildAutoGroupTh(options.autoGroupColWidth ?? 200),
        this.centerHeaderRowEl.firstChild,
      );
    }
    centerInnerEl.appendChild(this.centerHeaderRowEl);
    if (options.showFilterRow) {
      const filterRow = this.buildFilterRow(centerCols, options, false);
      this.centerFilterRowEl = filterRow;
      if (options.hasGroupedColumns) filterRow.insertBefore(this.buildAutoGroupFilterCell(options.autoGroupColWidth ?? 200), filterRow.firstChild);
      centerInnerEl.appendChild(filterRow);
    }

    this.rightHeaderRowEl = this.buildHeaderRow(rightCols, options, false);
    rightContainer.appendChild(this.rightHeaderRowEl);
    if (options.showFilterRow) {
      this.rightFilterRowEl = this.buildFilterRow(rightCols, options, false);
      rightContainer.appendChild(this.rightFilterRowEl);
    }

    // Guarantee exactly one header cell remains keyboard-reachable via Tab.
    this.ensureRovingTabstop();
  }

  updateSortIndicator(colId: string, order: 'asc' | 'desc' | null): void {
    const rows = [this.leftHeaderRowEl, this.centerHeaderRowEl, this.rightHeaderRowEl].filter((r): r is HTMLElement => r !== null);
    for (const row of rows) {
      for (const cell of Array.from(row.querySelectorAll<HTMLElement>('.pg-th[data-col-id]'))) {
        const isTarget = cell.getAttribute('data-col-id') === colId;
        const wasSorted = cell.classList.contains('pg-th--sorted');
        toggleClass(cell, 'pg-th--sort-asc', isTarget && order === 'asc');
        toggleClass(cell, 'pg-th--sort-desc', isTarget && order === 'desc');
        toggleClass(cell, 'pg-th--sorted', isTarget && order !== null);
        const iconEl = cell.querySelector<HTMLElement>('.pg-th__sort-icon');
        if (!iconEl) continue;
        if (isTarget) {
          this.iconRenderer.updateIcon(iconEl, order === 'asc' ? 'sortAsc' : order === 'desc' ? 'sortDesc' : 'sortNone');
        } else if (wasSorted) {
          // A different column just became the sort target — clear this one's arrow.
          this.iconRenderer.updateIcon(iconEl, 'sortNone');
        }
      }
    }
  }

  updateAllChecked(isAll: boolean, isIndeterminate: boolean): void {
    if (!this.headerCheckbox) return;
    this.headerCheckbox.checked = isAll;
    this.headerCheckbox.indeterminate = isIndeterminate && !isAll;
  }

  setGroupDropZone(zone: GroupDropZone): void {
    this.groupDropZone = zone;
    this.columnMenu.setGroupCallbacks({
      isGrouped: (colId) => zone.isGrouped(colId),
      addGroup: (colId) => zone.dropColumn(colId),
      removeGroup: (colId) => zone.removeColumn(colId),
    });
  }

  destroy(): void {
    document.removeEventListener('pointermove', this.boundMouseMove);
    document.removeEventListener('pointerup', this.boundMouseUp);
    this.columnMenu.destroy();
    this.groupContextMenu?.destroy();
    this.leftHeaderRowEl   = null;
    this.centerHeaderRowEl = null;
    this.rightHeaderRowEl  = null;
    this.leftFilterRowEl   = null;
    this.centerFilterRowEl = null;
    this.rightFilterRowEl  = null;
    this.headerCheckbox    = null;
    this.leftGroupRowEls   = [];
    this.centerGroupRowEls = [];
    this.rightGroupRowEls  = [];
  }

  updateCenterVisibleCols(
    visibleCols: ColumnDef[],
    leftSpacerW: number,
    rightSpacerW: number,
    options: HeaderRendererOptions,
  ): void {
    if (!this.centerHeaderRowEl) return;

    this.lastGroupRowHeight = options.headerRowHeight ?? this.lastGroupRowHeight;

    // ── displayGroupEngine: rebuild group rows live during drag ──────────────
    // Called when store.columns changes mid-drag (cross-panel move via moveToPanelLive).
    // Same-panel drag rebuilds are handled directly in onDragMove.
    if (this.displayGroupEngine?.hasGroups) {
      const allCols = this.store.get('columns') as ColumnDef[];

      const centerCols = allCols.filter(
        (c) => c.pinned !== 'left' && c.pinned !== 'right' && c.visible !== false,
      );
      this.rebuildGroupRowsForPanel('center', centerCols);

      // When dragging cross-panel, left/right group spans change too.
      if (this.isDragging) {
        this.rebuildGroupRowsForPanel('left',
          allCols.filter((c) => c.pinned === 'left'  && c.visible !== false));
        this.rebuildGroupRowsForPanel('right',
          allCols.filter((c) => c.pinned === 'right' && c.visible !== false));
      }
    }

    // ── Legacy ColumnGroupModel: in-place update ─────────────────────────────
    if (this.groupModel?.hasGroups() && this.groupHeaderBuilder && this.centerGroupRowEls.length > 0) {
      const maxDepth  = this.groupModel.getMaxDepth();
      const rowHeight = options.headerRowHeight ?? 44;
      const cellOpts  = this.buildGroupCellOptions(rowHeight);
      this.groupHeaderBuilder.updateGroupRows(
        this.centerGroupRowEls,
        this.groupModel.getRootNodes('center'),
        this.colStyles,
        maxDepth,
        cellOpts,
      );
    }

    // During a column drag, detach the dragging TH before clearing innerHTML so
    // the element survives the rebuild.  Re-inserting the live element (rather than
    // recreating it) preserves pg-th--dragging, event listeners, and drag CSS state.
    const dragColId = this.isDragging ? this.draggingColId : null;
    let dragThEl: HTMLElement | null = null;
    if (dragColId) {
      dragThEl = this.centerHeaderRowEl.querySelector<HTMLElement>(`.pg-th[data-col-id="${dragColId}"]`);
      dragThEl?.remove();
    }

    this.centerHeaderRowEl.innerHTML = '';
    if (options.hasGroupedColumns) this.centerHeaderRowEl.appendChild(this.buildAutoGroupTh(options.autoGroupColWidth ?? 200));
    if (leftSpacerW > 0) this.centerHeaderRowEl.appendChild(this.makeSpacer('pg-th pg-th--h-spacer', leftSpacerW));
    for (let i = 0; i < visibleCols.length; i++) {
      const col = visibleCols[i];
      if (dragThEl && col.colId === dragColId) {
        // Re-insert the live element — preserves class, listeners, and drag state.
        this.centerHeaderRowEl.appendChild(dragThEl);
      } else {
        this.centerHeaderRowEl.appendChild(this.buildHeaderCell(col, i, visibleCols, options, this.centerHeaderRowEl));
      }
    }
    if (rightSpacerW > 0) this.centerHeaderRowEl.appendChild(this.makeSpacer('pg-th pg-th--h-spacer', rightSpacerW));

    // Keep a single keyboard-reachable header cell after the virtual rebuild.
    this.ensureRovingTabstop();

    if (!this.centerFilterRowEl) return;
    this.centerFilterRowEl.innerHTML = '';
    if (options.hasGroupedColumns) this.centerFilterRowEl.appendChild(this.buildAutoGroupFilterCell(options.autoGroupColWidth ?? 200));
    if (leftSpacerW > 0) this.centerFilterRowEl.appendChild(this.makeSpacer('pg-filter-cell pg-filter-cell--h-spacer', leftSpacerW));
    for (const col of visibleCols) this.centerFilterRowEl.appendChild(this.buildFilterCell(col));
    if (rightSpacerW > 0) this.centerFilterRowEl.appendChild(this.makeSpacer('pg-filter-cell pg-filter-cell--h-spacer', rightSpacerW));
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private makeSpacer(cls: string, w: number): HTMLElement {
    const sp = createDiv(cls);
    sp.style.cssText = `width:${w}px;min-width:${w}px;flex-shrink:0;`;
    return sp;
  }

  private capturePanelDragData(): PanelDragEntry[] {
    const gatherPD = (panel: 'left' | 'center' | 'right', rowEl: HTMLElement | null): PanelDragEntry | null => {
      if (!rowEl) return null;
      const ths = Array.from(rowEl.querySelectorAll<HTMLElement>('.pg-th[data-col-id]'));
      const headerPanel = rowEl.closest<HTMLElement>('.pg-panel__header');
      const bounds = headerPanel?.getBoundingClientRect() ?? null;
      if (!bounds || bounds.width === 0) return null;
      return {
        panel,
        rects: ths.map((t) => t.getBoundingClientRect()),
        colIds: ths.map((t) => t.getAttribute('data-col-id') ?? ''),
        bounds,
      };
    };
    return [
      gatherPD('left', this.leftHeaderRowEl),
      gatherPD('center', this.centerHeaderRowEl),
      gatherPD('right', this.rightHeaderRowEl),
    ].filter((pd): pd is PanelDragEntry => pd !== null);
  }

  private buildHeaderRow(columns: ColumnDef[], options: HeaderRendererOptions, isLeft: boolean): HTMLElement {
    const row = createDiv('pg-header-row');
    row.setAttribute('role', 'row');
    if (isLeft) {
      if (options.showSerialNumber) row.appendChild(this.buildSerialHeaderCell());
      if (options.showCheckboxes) row.appendChild(this.buildCheckboxHeaderCell());
    }
    for (let i = 0; i < columns.length; i++) row.appendChild(this.buildHeaderCell(columns[i], i, columns, options, row));
    // One delegated keydown per panel row (not per cell). The center row element
    // persists across virtual `updateCenterVisibleCols` rebuilds, so this stays
    // bound once and never accumulates listeners during horizontal scroll.
    this.attachHeaderKeydown(row);
    return row;
  }

  /**
   * Attach the delegated keyboard handler for a panel's header row. Implements
   * the WAI-ARIA grid-header keyboard model:
   *
   * - **ArrowLeft / ArrowRight** — move the roving focus to the previous / next
   *   visible column (spanning left → center → right panels).
   * - **Home / End** — move to the first / last visible column.
   * - **Enter / Space** — toggle the column's sort (when sortable).
   * - **Alt + ArrowDown** — open the column's filter panel.
   * - **Shift + F10** or the **ContextMenu** key — open the column context menu.
   *
   * Tab is intentionally not intercepted — the roving tabindex makes Tab exit the
   * header after a single stop.
   *
   * @param row - The panel header row element to delegate from.
   */
  private attachHeaderKeydown(row: HTMLElement): void {
    row.addEventListener('keydown', (e: KeyboardEvent) => this.onHeaderKeydown(e));
  }

  private onHeaderKeydown(e: KeyboardEvent): void {
    const th = (e.target as HTMLElement).closest<HTMLElement>('.pg-th[data-col-id]');
    if (!th) return;
    const colId = th.getAttribute('data-col-id');
    if (!colId) return;
    const col = this.columnModel.getColumn(colId);
    if (!col) return;

    // Shift+F10 / ContextMenu key — open the column menu anchored at the cell.
    if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
      e.preventDefault();
      this.columnMenu.show(col, th);
      return;
    }

    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); this.moveRoving(colId, 1);  break;
      case 'ArrowLeft':  e.preventDefault(); this.moveRoving(colId, -1); break;
      case 'Home':       e.preventDefault(); this.moveRovingToEdge(true);  break;
      case 'End':        e.preventDefault(); this.moveRovingToEdge(false); break;
      case 'ArrowDown':
        // Alt+ArrowDown opens the filter panel (WAI-ARIA "open popup" gesture).
        if (e.altKey) { e.preventDefault(); this.openFilterPanelFn?.(col, th); }
        break;
      case 'Enter':
      case ' ':
        if (col.sortable !== false) { e.preventDefault(); this.toggleSort(col); }
        break;
    }
  }

  /**
   * Move the roving header focus by `dir` columns from `fromColId`, in the grid's
   * visible-column order (which spans the pinned-left, center, and pinned-right
   * panels). Clamped at both ends.
   */
  private moveRoving(fromColId: string, dir: 1 | -1): void {
    const cols = this.columnModel.getVisibleColumns();
    const idx  = cols.findIndex((c) => c.colId === fromColId);
    if (idx === -1) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= cols.length) return;
    this.setRovingCell(cols[nextIdx].colId);
  }

  /** Move the roving header focus to the first or last visible column. */
  private moveRovingToEdge(first: boolean): void {
    const cols = this.columnModel.getVisibleColumns();
    if (cols.length === 0) return;
    this.setRovingCell(cols[first ? 0 : cols.length - 1].colId);
  }

  /**
   * Make `colId` the roving header cell (the single tab stop) and move DOM focus
   * to it. Updates every rendered header cell's tabindex across the three panels.
   * When the target is a virtualized center column not currently in the DOM, it
   * is first scrolled into view via the ensure-visible callback, then focused on
   * the next frame.
   *
   * @param colId - The column whose header cell should receive focus.
   */
  setRovingCell(colId: string): void {
    this.rovingColId = colId;
    const rows = [this.leftHeaderRowEl, this.centerHeaderRowEl, this.rightHeaderRowEl];
    for (const row of rows) {
      if (!row) continue;
      for (const cell of Array.from(row.querySelectorAll<HTMLElement>('.pg-th[data-col-id]'))) {
        cell.setAttribute('tabindex', cell.getAttribute('data-col-id') === colId ? '0' : '-1');
      }
    }

    const target = this.findHeaderCell(colId);
    if (target) {
      target.focus();
      return;
    }
    // Virtualized out of the DOM — reveal it, then focus once re-rendered.
    this.ensureColumnVisibleFn?.(colId);
    requestAnimationFrame(() => {
      const revealed = this.findHeaderCell(colId);
      if (revealed) {
        revealed.setAttribute('tabindex', '0');
        revealed.focus();
      }
    });
  }

  /** Locate a rendered header cell by column id across all three panels. */
  private findHeaderCell(colId: string): HTMLElement | null {
    const rows = [this.leftHeaderRowEl, this.centerHeaderRowEl, this.rightHeaderRowEl];
    for (const row of rows) {
      const cell = row?.querySelector<HTMLElement>(`.pg-th[data-col-id="${colId}"]`);
      if (cell) return cell;
    }
    return null;
  }

  /**
   * Guarantee exactly one header cell is in the tab order after a (re)render.
   * If the roving column is not currently rendered (e.g. virtualized out during
   * horizontal scroll), promote the first rendered data cell so Tab can always
   * reach the header.
   */
  private ensureRovingTabstop(): void {
    if (this.rovingColId && this.findHeaderCell(this.rovingColId)) return;
    // Roving column not currently rendered — promote the first rendered data
    // cell (scanning left → center → right) so Tab can always reach the header.
    const rows = [this.leftHeaderRowEl, this.centerHeaderRowEl, this.rightHeaderRowEl];
    let first: HTMLElement | null = null;
    for (const row of rows) {
      first = row?.querySelector<HTMLElement>('.pg-th[data-col-id]') ?? null;
      if (first) break;
    }
    if (!first) return;
    this.rovingColId = first.getAttribute('data-col-id');
    first.setAttribute('tabindex', '0');
  }

  private buildAutoGroupTh(width: number): HTMLElement {
    const th = createDiv('pg-th pg-th--auto-group');
    th.setAttribute('role', 'columnheader');
    th.style.width = `${width}px`;
    th.style.minWidth = `${width}px`;
    const content = createDiv('pg-th__content');
    const labelEl = createDiv('pg-th__label');
    labelEl.textContent = 'Groups';
    content.appendChild(labelEl);
    th.appendChild(content);
    return th;
  }

  /**
   * Build the leading spacer cell for the filter row that reserves the same
   * horizontal space as the auto-group header column ({@link buildAutoGroupTh}).
   *
   * The width must be applied explicitly — with no width the flex cell collapses
   * to its content, pushing every subsequent filter input out of alignment with
   * its header. Mirrors the header cell's inline sizing so the two rows track the
   * same `autoGroupColWidth`.
   *
   * @param width - The auto-group column width in pixels.
   * @returns A zero-content filter cell sized to the group column.
   */
  private buildAutoGroupFilterCell(width: number): HTMLElement {
    const cell = createDiv('pg-filter-cell pg-filter-cell--auto-group');
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    return cell;
  }

  private buildCheckboxHeaderCell(): HTMLElement {
    const cell = createDiv('pg-th pg-th--checkbox');
    cell.setAttribute('role', 'columnheader');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'pg-checkbox pg-header-checkbox';
    checkbox.setAttribute('aria-label', 'Select all rows');
    this.headerCheckbox = checkbox;
    const isAll = this.store.get('isAllSelected');
    const isInd = this.store.get('isIndeterminate');
    checkbox.checked = isAll as boolean;
    checkbox.indeterminate = (isInd as boolean) && !(isAll as boolean);
    checkbox.addEventListener('change', () => {
      this.eventBus.emit(GridEventType.ALL_ROWS_SELECTED, { action: checkbox.checked ? 'selectAll' : 'deselectAll' });
    });
    cell.appendChild(checkbox);
    return cell;
  }

  private buildSerialHeaderCell(): HTMLElement {
    const cell = createDiv('pg-th pg-th--serial');
    cell.setAttribute('role', 'columnheader');
    const label = document.createElement('span');
    label.className = 'pg-th__serial-label';
    label.textContent = '#';
    cell.appendChild(label);
    return cell;
  }

  private buildHeaderCell(
    col: ColumnDef,
    index: number,
    panelColumns: ColumnDef[],
    options: HeaderRendererOptions,
    panelRowEl: HTMLElement,
  ): HTMLElement {
    const th = createDiv('pg-th');
    th.setAttribute('role', 'columnheader');
    th.setAttribute('data-col-id', col.colId);
    th.setAttribute('data-col-index', String(index));
    // Roving tabindex: exactly one header cell is in the tab order at a time;
    // Arrow keys move the roving cell (see onHeaderKeydown / setRovingCell). The
    // first cell built becomes the default roving cell until the user navigates.
    if (this.rovingColId === null) this.rovingColId = col.colId;
    th.setAttribute('tabindex', col.colId === this.rovingColId ? '0' : '-1');
    // When a grouped header is present, flat columns must visually span the
    // full header height (group rows + leaf row).  The CSS handles the actual
    // translate + height expansion; this class is the hook.
    if (this.displayGroupEngine?.hasGroups && this.displayGroupEngine.isFlat(col.colId)) {
      th.classList.add('pg-th--no-group');
    }
    if (col.headerCssClass) th.className += ` ${col.headerCssClass}`;
    toggleClass(th, 'pg-th--sortable', col.sortable !== false);
    toggleClass(th, 'pg-th--sorted', !!col.sortOrder);
    toggleClass(th, 'pg-th--sort-asc', col.sortOrder === 'asc');
    toggleClass(th, 'pg-th--sort-desc', col.sortOrder === 'desc');
    const align = col.textAlign ?? (col.type === 'number' || col.type === 'currency' ? 'right' : 'left');
    if (align !== 'left') th.classList.add(`pg-th--align-${align}`);
    if (align === 'right') th.classList.add('pg-th--reverse');
    // Marks a right-pinned header so its resize handle can move to the inner
    // (left) edge — the only edge free to move when the right edge is anchored
    // to the grid border. See `.pg-th--pinned-right .pg-th__resize-handle`.
    if (col.pinned === 'right') th.classList.add('pg-th--pinned-right');

    const headerFn = resolveColumnRenderer(col, 'header');
    if (headerFn) {
      const rendered = headerFn({ colDef: col, sortOrder: col.sortOrder ?? null, filterActive: !!col.filterActive, api: null });
      if (typeof rendered === 'string') th.innerHTML = rendered;
      else th.appendChild(rendered);
    } else {
      const content = createDiv('pg-th__content');
      const labelEl = createDiv('pg-th__label');
      labelEl.textContent = col.header;
      labelEl.title = col.header;
      content.appendChild(labelEl);
      if (col.sortable !== false) {
        content.appendChild(this.iconRenderer.render(
          col.sortOrder === 'asc' ? 'sortAsc' : col.sortOrder === 'desc' ? 'sortDesc' : 'sortNone',
          { size: 14, className: 'pg-th__sort-icon' },
        ));
      }
      th.appendChild(content);
    }

    // Filter icon — reveal-on-hover by default; always visible when a filter is
    // active, or when the column/grid opts into `HeaderIconDisplay.ALWAYS`.
    // Skipped entirely when the mode is `HeaderIconDisplay.HIDDEN`.
    const filterMode = col.filterIconDisplay ?? options.filterIconDisplay ?? HeaderIconDisplay.HOVER;
    if (col.filterable !== false && filterMode !== HeaderIconDisplay.HIDDEN) {
      const filterBtn = createDiv('pg-th__filter-btn');
      const filterActive = col.filterActive === true;
      if (filterActive) filterBtn.classList.add('pg-th__filter-btn--active');
      if (filterMode === HeaderIconDisplay.ALWAYS) filterBtn.classList.add('pg-th__filter-btn--always');
      filterBtn.innerHTML = this.iconRenderer.renderToString(filterActive ? 'filterActive' : 'filter', 14);
      filterBtn.title = 'Filter column';
      // Not individually tabbable — the header cell is the single tab stop
      // (roving tabindex). Keyboard users open the filter via Alt+ArrowDown on
      // the cell (see onHeaderKeydown).
      filterBtn.setAttribute('tabindex', '-1');
      filterBtn.setAttribute('aria-label', `Filter ${col.header}`);
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openFilterPanelFn?.(col, filterBtn);
      });
      th.appendChild(filterBtn);
    }

    // Column-menu "⋯" icon — hidden entirely when the mode is
    // `HeaderIconDisplay.HIDDEN` (the header right-click menu still works).
    const menuMode = col.menuIconDisplay ?? options.menuIconDisplay ?? HeaderIconDisplay.HOVER;
    if (options.showColumnMenu !== false && menuMode !== HeaderIconDisplay.HIDDEN) {
      const menuBtn = createDiv('pg-th__menu-btn');
      if (menuMode === HeaderIconDisplay.ALWAYS) menuBtn.classList.add('pg-th__menu-btn--always');
      menuBtn.innerHTML = this.iconRenderer.renderToString('menuHorizontal', 14);
      menuBtn.title = 'Column options';
      menuBtn.setAttribute('aria-label', `${col.header} column menu`);
      menuBtn.setAttribute('aria-haspopup', 'menu');
      // Not individually tabbable — keyboard users open the menu via Shift+F10
      // or the ContextMenu key on the header cell (see onHeaderKeydown).
      menuBtn.setAttribute('tabindex', '-1');
      menuBtn.addEventListener('click', (e) => { e.stopPropagation(); this.columnMenu.show(col, menuBtn); });
      th.appendChild(menuBtn);
    }

    // Right-click on the header cell opens the context menu at cursor position,
    // unless disabled via ColumnMenuConfig.enableRightClick.
    th.addEventListener('contextmenu', (e) => {
      if (!this.columnMenu.isRightClickEnabled(col)) return;
      e.preventDefault();
      e.stopPropagation();
      this.columnMenu.show(col, th, e.clientX, e.clientY);
    });

    if (col.resizable !== false) {
      const resizeHandle = createDiv('pg-th__resize-handle');
      // resizeHandle.innerHTML = '|';
      resizeHandle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        // Double-press on the same handle → auto-size the column (AG Grid
        // convention). Detected by timing rather than the native `dblclick`
        // event: the first press's mouseup can rebuild the header
        // (COLUMNS_STATE_CHANGED) and replace this element, so a native dblclick
        // would never fire on the original node. Keying on colId survives that.
        if (this.lastResizeDownColId === col.colId && e.timeStamp - this.lastResizeDownAt < 350) {
          this.lastResizeDownColId = '';
          this.lastResizeDownAt = 0;
          this.autoSizeColumns([col.colId]);
          this.onAction('autosize', col.colId);
          return;
        }
        this.lastResizeDownColId = col.colId;
        this.lastResizeDownAt = e.timeStamp;
        this.startResize(e, col, th);
      });
      th.appendChild(resizeHandle);
    }

    if (col.sortable !== false) {
      th.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.pg-th__resize-handle, .pg-th__menu-btn, .pg-th__filter-btn')) return;
        this.toggleSort(col);
      });
    }

    // Keyboard navigation is delegated at the panel-row level (see
    // attachHeaderKeydown). `focusin` keeps the roving cell in sync when the user
    // Tabs into a header cell or clicks it, so a subsequent Arrow key moves from
    // the right place.
    th.addEventListener('focusin', () => { this.rovingColId = col.colId; });

    this.attachColumnDragListeners(th, col, panelColumns, panelRowEl);
    return th;
  }

  /**
   * Advance a column's sort through the asc → desc → none cycle and update the
   * model, engine, and header indicator. Shared by the header-cell click handler
   * and keyboard activation (Enter / Space).
   *
   * @param col - The column to (re)sort. A no-op when `col.sortable === false`.
   */
  private toggleSort(col: ColumnDef): void {
    if (col.sortable === false) return;
    const current = this.columnModel.getColumn(col.colId)?.sortOrder ?? col.sortOrder ?? null;
    const next: 'asc' | 'desc' | null =
      current === null ? 'asc' : current === 'asc' ? 'desc' : null;
    if (next) this.sortEngine.sort(col.colId, col.field, next);
    else this.sortEngine.clearSort();
    this.columnModel.setColumnSort(col.colId, next);
    this.updateSortIndicator(col.colId, next);
    this.onAction('sort', col.colId);
  }

  /**
   * Column data types whose inline filter is a checkbox **set** dropdown rather
   * than a free-text term. Their filter-row input is rendered read-only (with a
   * disabled appearance) and opens the set-filter panel on click; free-text
   * columns instead filter live as the user types.
   */
  private static readonly SET_FILTER_TYPES: ReadonlySet<ColumnDataType> = new Set<ColumnDataType>([
    'object',
    'array',
    'dropdown',
  ]);

  /** `true` when a column's inline filter should be a set (checkbox) dropdown. */
  private isSetFilterColumn(col: ColumnDef): boolean {
    return col.type != null && HeaderRenderer.SET_FILTER_TYPES.has(col.type);
  }

  private buildFilterCell(col: ColumnDef): HTMLElement {
    const cell = createDiv('pg-filter-cell');
    cell.setAttribute('data-col-id', col.colId);
    if (col.filterable === false) return cell;

    const isSet = this.isSetFilterColumn(col);
    const filterActive = col.filterActive === true;

    // ── Filter input ────────────────────────────────────────────────────────
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pg-filter-input';
    // NOTE: the input deliberately carries no `data-col-id` — the per-column
    // width rules emitted by ColumnStyleManager target `[data-col-id]` with a
    // fixed width + `flex-shrink: 0`, which would stop the input from shrinking
    // and push the trailing icon out of narrow cells. Only the cell (below)
    // carries the id, so the input stays free to flex beside the icon.

    // ── Trailing filter icon — anchors the (set / advanced) filter panel ─────
    const iconBtn = createDiv('pg-filter-cell__icon');
    iconBtn.setAttribute('role', 'button');
    iconBtn.setAttribute('tabindex', '0');
    iconBtn.setAttribute('aria-label', `Filter ${col.header}`);
    if (filterActive) iconBtn.classList.add('pg-filter-cell__icon--active');
    iconBtn.innerHTML = this.iconRenderer.renderToString(filterActive ? 'filterActive' : 'filter', 14);
    const openPanel = (): void => this.openFilterPanelFn?.(col, iconBtn);
    iconBtn.addEventListener('click', openPanel);
    iconBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPanel();
      }
    });

    if (isSet) {
      // Set-type columns (object / array / dropdown) filter via the checkbox
      // panel — the inline input is non-editable and acts as a button that opens
      // the dropdown anchored below the trailing filter icon.
      input.readOnly = true;
      // input.placeholder = 'Select…';
      input.setAttribute('aria-disabled', 'true');
      input.setAttribute('aria-haspopup', 'listbox');
      input.classList.add('pg-filter-input--set');
      cell.classList.add('pg-filter-cell--set');
      input.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep focus off the read-only field
        openPanel();
      });
    } else {
      // Free-text columns filter live as the user types.
      // input.placeholder = `${col.header}…`;
      input.addEventListener('input', (e) => {
        this.applyInlineFilterFn?.(col, (e.target as HTMLInputElement).value);
      });
    }

    cell.appendChild(input);
    cell.appendChild(iconBtn);
    return cell;
  }

  private buildFilterRow(columns: ColumnDef[], options: HeaderRendererOptions, isLeft: boolean): HTMLElement {
    const row = createDiv('pg-filter-row');
    row.setAttribute('role', 'row');
    if (isLeft) {
      if (options.showCheckboxes) row.appendChild(createDiv('pg-filter-cell pg-filter-cell--checkbox'));
      if (options.showSerialNumber) row.appendChild(createDiv('pg-filter-cell pg-filter-cell--serial'));
    }
    for (const col of columns) row.appendChild(this.buildFilterCell(col));
    return row;
  }

  private attachColumnDragListeners(
    th: HTMLElement,
    col: ColumnDef,
    _panelColumns: ColumnDef[],
    panelRowEl: HTMLElement,
  ): void {
    th.addEventListener('pointerdown', (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.pg-th__resize-handle, .pg-th__menu-btn, .pg-th__filter-btn, .pg-checkbox')) return;
      if (col.draggable === false || e.button !== 0) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const touch = isTouchPointer(e);
      let started = false;       // actual column drag engaged
      let longPressTimer = 0;

      // Tear down the pre-drag probe listeners + long-press timer + affordance.
      const cleanupProbe = (): void => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = 0; }
        th.classList.remove('pg-th--drag-armed');
        document.removeEventListener('pointermove', onMoveCheck);
        document.removeEventListener('pointerup', onUpEarly);
      };

      // Promote the press to a live column drag and hand movement over to the
      // global drag handlers. Called by the mouse threshold or the touch
      // long-press timer.
      const beginDrag = (): void => {
        if (started) return;
        started = true;
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = 0; }
        th.classList.remove('pg-th--drag-armed');
        this.startColumnDrag(col, panelRowEl);
        document.removeEventListener('pointermove', onMoveCheck);
        document.addEventListener('pointermove', this.boundMouseMove);
        document.addEventListener('pointerup', this.boundMouseUp);
        this.onDragMove(startX);
      };

      const onMoveCheck = (ev: PointerEvent): void => {
        if (started) return; // global handlers own movement now
        const dx = Math.abs(ev.clientX - startX);
        const dy = Math.abs(ev.clientY - startY);
        if (touch) {
          // Movement before the long-press fires means the user is swiping to
          // scroll, not reordering — abandon so the ScrollController pans.
          if (dx > DRAG_THRESHOLD_TOUCH || dy > DRAG_THRESHOLD_TOUCH) cleanupProbe();
        } else if (dx > DRAG_THRESHOLD_MOUSE) {
          beginDrag();
        }
      };

      const onUpEarly = (): void => { if (!started) cleanupProbe(); };

      document.addEventListener('pointermove', onMoveCheck);
      document.addEventListener('pointerup', onUpEarly);

      if (touch) {
        // Arm a long-press: hold ~400ms without swiping to pick the column up.
        th.classList.add('pg-th--drag-armed');
        longPressTimer = window.setTimeout(() => {
          longPressTimer = 0;
          beginDrag();
        }, LONG_PRESS_MS);
      }
    });
  }

  private startColumnDrag(col: ColumnDef, panelRowEl: HTMLElement): void {
    this.draggingColId = col.colId;
    this.isDragging = true;
    this.draggingPanelRowEl = panelRowEl;
    this.draggingIsGroupable = col.groupable === true && this.groupDropZone !== null;
    this.isOverGroupZone = false;
    this.dragIsHideMode = false;
    this.livePanelMoveInProgress = false;

    this.dragSourcePanel = panelRowEl === this.leftHeaderRowEl ? 'left'
      : panelRowEl === this.rightHeaderRowEl ? 'right' : 'center';
    this.dragTargetPanel = this.dragSourcePanel;
    this.dragTargetLocalIdx = -1;

    // Build ghost chip
    const ghost = createDiv('pg-col-drag-ghost');
    const mkIcon = (cls: string, name: string) => {
      const s = document.createElement('span');
      s.className = `pg-col-drag-ghost__icon ${cls}`;
      s.innerHTML = this.iconRenderer.renderToString(name, 14);
      return s;
    };
    ghost.appendChild(mkIcon('pg-col-drag-ghost__icon--arrow-left', 'chevronLeft'));
    ghost.appendChild(mkIcon('pg-col-drag-ghost__icon--move', 'drag'));
    ghost.appendChild(mkIcon('pg-col-drag-ghost__icon--ban', 'ban'));
    ghost.appendChild(mkIcon('pg-col-drag-ghost__icon--hide', 'eyeOff'));
    const ghostLabel = document.createElement('span');
    ghostLabel.className = 'pg-col-drag-ghost__label';
    ghostLabel.textContent = col.header;
    ghost.appendChild(ghostLabel);
    ghost.appendChild(mkIcon('pg-col-drag-ghost__icon--arrow-right', 'chevronRight'));
    document.body.appendChild(ghost);
    this.ghostEl = ghost;

    const srcPD = this.panelDragData.find((pd) => pd.panel === this.dragSourcePanel);
    const srcThEl = panelRowEl.querySelector<HTMLElement>(`[data-col-id="${col.colId}"]`);
    srcThEl?.classList.add('pg-th--dragging');

    const gridEl = panelRowEl.closest<HTMLElement>('.pg-grid');
    this.draggingGridEl = gridEl;

    // Capture all panel rects before any transforms
    this.panelDragData = this.capturePanelDragData();
    const freshSrcPD = this.panelDragData.find((pd) => pd.panel === this.dragSourcePanel);
    const srcIdx = freshSrcPD?.colIds.indexOf(col.colId) ?? -1;
    this.draggedColWidth = (srcIdx >= 0 && freshSrcPD ? freshSrcPD.rects[srcIdx].width : 0)
      || srcThEl?.getBoundingClientRect().width || 0;
    void srcPD;

    this.dragStartScrollX = parseFloat(gridEl?.style.getPropertyValue('--pg-scroll-x') ?? '0');
    const centerPD = this.panelDragData.find((pd) => pd.panel === 'center');
    this.centerPanelRect = centerPD?.bounds ?? null;

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-pg-drag', '');
    document.head.appendChild(styleEl);
    this.dragStyleEl = styleEl;

    gridEl?.classList.add('pg-grid--col-dragging');
    // Suppress the 180 ms drag-shift transition while the virtual column range
    // expands to all columns on the first performRender after drag start.
    // Without this guard, newly-added body cells animate in from transform:0.
    // The class is removed 2 frames later so smooth transitions resume for
    // ordinary mouse movement.
    gridEl?.classList.add('pg-grid--col-autoscrolling');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.isDragging) this.draggingGridEl?.classList.remove('pg-grid--col-autoscrolling');
    }));
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }

  // ─── Live cross-panel move ─────────────────────────────────────────────────

  /**
   * When the cursor crosses into a new panel:
   * 1. Immediately DOM-move the source TH into the target panel header row
   * 2. Call moveAndPin() so body cells and panel widths update via the guarded re-render
   * 3. After 2 frames (re-render complete), re-capture rects and continue drag
   */
  private moveToPanelLive(newPanel: 'left' | 'center' | 'right', insertIdx: number): void {
    if (this.livePanelMoveInProgress) return;
    this.livePanelMoveInProgress = true;

    const colId = this.draggingColId!;
    const targetPD = this.panelDragData.find((pd) => pd.panel === newPanel);
    const insertBeforeColId = targetPD?.colIds[insertIdx] ?? null;
    const newPin = newPanel === 'left' ? ('left' as const) : newPanel === 'right' ? ('right' as const) : null;

    // Step 1: immediately DOM-move the TH for instant visual feedback in the header
    const targetRowEl = newPanel === 'left' ? this.leftHeaderRowEl
      : newPanel === 'right' ? this.rightHeaderRowEl
      : this.centerHeaderRowEl;

    const srcThEl = this.draggingGridEl?.querySelector<HTMLElement>(`.pg-th[data-col-id="${colId}"]`);
    if (srcThEl && targetRowEl) {
      const realThs = Array.from(targetRowEl.querySelectorAll<HTMLElement>('.pg-th[data-col-id]'));
      const refEl = insertIdx < realThs.length ? realThs[insertIdx] : null;
      if (refEl) targetRowEl.insertBefore(srcThEl, refEl);
      else {
        const lastTh = realThs[realThs.length - 1];
        if (lastTh?.nextSibling) targetRowEl.insertBefore(srcThEl, lastTh.nextSibling);
        else targetRowEl.appendChild(srcThEl);
      }
    }

    // Clear any drag transforms during the transition
    if (this.dragStyleEl) this.dragStyleEl.textContent = '';

    // Update drag source state immediately
    this.dragSourcePanel = newPanel;
    this.dragTargetPanel = newPanel;
    this.dragTargetLocalIdx = -1;

    // Step 2: update column model → body cells re-render + panel width CSS var updates
    // The grid-renderer columns watcher checks isDraggingCol and skips header.destroy()
    this.columnModel.moveAndPin(colId, newPin, insertBeforeColId);

    // Step 3: after re-render (2 frames), re-capture rects and re-apply dragging state
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.isDragging || this.draggingColId !== colId) {
          this.livePanelMoveInProgress = false;
          return;
        }
        // Re-apply pg-th--dragging (the TH may have been rebuilt by updateCenterVisibleCols)
        this.draggingGridEl?.querySelector<HTMLElement>(`.pg-th[data-col-id="${colId}"]`)
          ?.classList.add('pg-th--dragging');

        // Re-capture rects with the new panel layout
        this.panelDragData = this.capturePanelDragData();
        this.dragStartScrollX = parseFloat(this.draggingGridEl?.style.getPropertyValue('--pg-scroll-x') ?? '0');
        const centerPD = this.panelDragData.find((pd) => pd.panel === 'center');
        this.centerPanelRect = centerPD?.bounds ?? null;

        this.livePanelMoveInProgress = false;
      });
    });
  }

  // ─── Auto-scroll ──────────────────────────────────────────────────────────

  private readonly tickAutoScroll = (): void => {
    if (!this.isDragging || this.autoScrollSpeed === 0) return;
    if (this.autoScrollSpeed < 0 && !(this.canScrollX?.(-1) ?? true)) { this.stopAutoScroll(); return; }
    if (this.autoScrollSpeed > 0 && !(this.canScrollX?.(1) ?? true)) { this.stopAutoScroll(); return; }
    this.scrollByX?.(this.autoScrollSpeed);
    // Immediately re-evaluate drag position using the updated --pg-scroll-x so
    // header and body cell transforms stay in sync with the scroll on this frame.
    // scrollDelta inside onDragMove reads the CSS var synchronously.
    this.onDragMove(this.lastDragClientX);
    this.autoScrollRAF = requestAnimationFrame(this.tickAutoScroll);
  };

  private updateAutoScroll(clientX: number): void {
    if (!this.centerPanelRect || !this.scrollByX) return;
    const EDGE = 80;
    const { left, right } = this.centerPanelRect;
    let speed = 0;
    if (clientX < left + EDGE) {
      const raw = -Math.round(((left + EDGE - clientX) / EDGE) * 10);
      speed = (this.canScrollX?.(-1) ?? true) ? raw : 0;
    } else if (clientX > right - EDGE) {
      const raw = Math.round(((clientX - right + EDGE) / EDGE) * 10);
      speed = (this.canScrollX?.(1) ?? true) ? raw : 0;
    }
    const wasScrolling = this.autoScrollSpeed !== 0;
    this.autoScrollSpeed = speed;
    if (speed !== 0 && !wasScrolling) this.autoScrollRAF = requestAnimationFrame(this.tickAutoScroll);
    else if (speed === 0 && wasScrolling) this.stopAutoScroll();
    this.ghostEl?.classList.toggle('pg-col-drag-ghost--scroll-left', speed < 0);
    this.ghostEl?.classList.toggle('pg-col-drag-ghost--scroll-right', speed > 0);
  }

  private stopAutoScroll(): void {
    cancelAnimationFrame(this.autoScrollRAF);
    this.autoScrollRAF = 0;
    this.autoScrollSpeed = 0;
    if (this.isDragging && !this.livePanelMoveInProgress && this.dragStyleEl) {
      // Temporarily suppress all column transitions while resetting the drag baseline.
      // Without this guard, sibling columns animate back to zero when their transforms
      // are cleared, then re-animate forward — a visible snap-and-reanimate sequence.
      this.draggingGridEl?.classList.add('pg-grid--col-autoscrolling');
      this.refreshDragAfterScroll();
      this.draggingGridEl?.classList.remove('pg-grid--col-autoscrolling');
    }
    this.ghostEl?.classList.remove('pg-col-drag-ghost--scroll-left', 'pg-col-drag-ghost--scroll-right');
  }

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
  private refreshDragAfterScroll(): void {
    if (!this.isDragging || this.livePanelMoveInProgress) return;

    // CRITICAL: clear drag transforms before calling getBoundingClientRect.
    // capturePanelDragData reads viewport positions via getBoundingClientRect.
    // If dragStyleEl still has transforms applied, the captured rects include
    // those offsets — the next onDragMove then compounds transforms on top of
    // already-transformed positions, creating an oscillating feedback loop that
    // causes blinking and column misalignment.
    // getBoundingClientRect forces a synchronous layout flush, so clearing first
    // and recapturing immediately gives clean baseline positions.  The clear and
    // re-apply are both in the same JS task, so the browser never paints a
    // transform-less frame.
    if (this.dragStyleEl) this.dragStyleEl.textContent = '';

    // Re-apply dragging class — updateCenterVisibleCols may have rebuilt the TH element.
    this.draggingGridEl
      ?.querySelector<HTMLElement>(`.pg-th[data-col-id="${this.draggingColId}"]`)
      ?.classList.add('pg-th--dragging');

    // Re-capture clean baseline rects (no transforms) for all currently rendered columns.
    this.panelDragData = this.capturePanelDragData();
    this.dragStartScrollX = parseFloat(
      this.draggingGridEl?.style.getPropertyValue('--pg-scroll-x') ?? '0',
    );
    const centerPD = this.panelDragData.find((pd) => pd.panel === 'center');
    this.centerPanelRect = centerPD?.bounds ?? null;

    // Re-apply correct transforms from the fresh baseline rects.
    this.onDragMove(this.lastDragClientX);
  }

  // ─── Live group row preview (DisplayGroupEngine) ─────────────────────────

  /**
   * Rebuild the group header rows for one panel using a new (possibly preview)
   * column order.  Safe to call during drag — only the group row `<div>`s are
   * replaced; the leaf row `<tr>` that carries the live drag element is untouched.
   *
   * @param panel - Which panel's group rows to refresh.
   * @param cols  - Ordered visible columns for this panel (preview or committed).
   */
  private rebuildGroupRowsForPanel(
    panel: 'left' | 'center' | 'right',
    cols:  ColumnDef[],
  ): void {
    if (!this.displayGroupEngine?.hasGroups) return;

    const leafRowEl = panel === 'left'  ? this.leftHeaderRowEl
      : panel === 'right' ? this.rightHeaderRowEl
      : this.centerHeaderRowEl;
    if (!leafRowEl) return;

    const container = leafRowEl.parentElement;
    if (!container) return;

    const oldRows = panel === 'left'  ? this.leftGroupRowEls
      : panel === 'right' ? this.rightGroupRowEls
      : this.centerGroupRowEls;

    for (const el of oldRows) el.remove();

    const engine      = this.displayGroupEngine;
    const dragHandler = engine.getDragHandler();
    const cellOpts    = {
      rowHeight:              this.lastGroupRowHeight,
      onCollapseToggle:       (id: string)                                     => this.onGroupToggleFn?.(id),
      onGroupResize:          (id: string, w: number)                          => this.onGroupResizeFn?.(id, w),
      onGroupHeaderMouseDown: dragHandler
        ? (e: PointerEvent, node: DisplayGroupNode, el: HTMLElement)             => dragHandler.onHeaderMouseDown(e, node, el)
        : undefined,
      didJustDragFn:          dragHandler ? () => dragHandler.didJustDrag : undefined,
      onGroupContextMenu:     (e: MouseEvent, node: DisplayGroupNode, el: HTMLElement) =>
        this.groupContextMenu?.show(node, el, e.clientX, e.clientY),
    };

    const newRows = engine.headerBuilder.buildGroupRows(engine.buildTree(cols), cellOpts);
    for (const el of newRows) container.insertBefore(el, leafRowEl);

    if (panel === 'left')       this.leftGroupRowEls   = newRows;
    else if (panel === 'right') this.rightGroupRowEls  = newRows;
    else                        this.centerGroupRowEls = newRows;

    // Keep the flat-column height variable in sync whenever group rows change.
    container.style.setProperty('--pg-group-rows-count', String(newRows.length));
  }

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
  private rebuildGroupRowsWithPreview(
    targetIdx: number,
    sourceIdx: number,
    pd:        { colIds: string[] },
  ): void {
    // Build preview colId order: move dragged column from sourceIdx to targetIdx.
    const previewIds = [...pd.colIds];
    const [movedId]  = previewIds.splice(sourceIdx, 1);
    previewIds.splice(targetIdx, 0, movedId);

    // Map to ColumnDef[] using store (live source of truth for metadata).
    const allCols  = this.store.get('columns') as ColumnDef[];
    const colMap   = new Map(allCols.map((c) => [c.colId, c]));
    const previewCols = previewIds
      .map((id) => colMap.get(id))
      .filter((c): c is ColumnDef => c !== undefined);

    this.rebuildGroupRowsForPanel(this.dragSourcePanel, previewCols);
  }

  // ─── Drag move ────────────────────────────────────────────────────────────

  private onDragMove(clientX: number): void {
    if (!this.isDragging || !this.draggingColId || !this.panelDragData.length || !this.dragStyleEl) return;
    if (this.livePanelMoveInProgress) { this.dragStyleEl.textContent = ''; return; }

    // Which panel is the cursor over?
    let targetPD = this.panelDragData.find((pd) => {
      if (!pd.bounds) return false;
      return clientX >= pd.bounds.left && clientX <= pd.bounds.right;
    });
    if (!targetPD) targetPD = this.panelDragData.find((pd) => pd.panel === this.dragSourcePanel);
    if (!targetPD) return;

    this.dragTargetPanel = targetPD.panel;
    const crossPanel = targetPD.panel !== this.dragSourcePanel;

    // Scroll correction for center panel
    const scrollDelta = targetPD.panel === 'center'
      ? parseFloat(this.draggingGridEl?.style.getPropertyValue('--pg-scroll-x') ?? '0') - this.dragStartScrollX
      : 0;

    const { rects: tRects, colIds: tIds } = targetPD;
    const srcPD = this.panelDragData.find((pd) => pd.panel === this.dragSourcePanel)!;
    const sourceIdxInPanel = srcPD.colIds.indexOf(this.draggingColId);

    if (crossPanel) {
      // Zone-entry: insert before the first column whose right edge the cursor hasn't passed
      let insertIdx = tIds.length;
      for (let i = 0; i < tRects.length; i++) {
        if (clientX < tRects[i].right + scrollDelta) { insertIdx = i; break; }
      }
      this.moveToPanelLive(targetPD.panel, insertIdx);
      this.dragStyleEl.textContent = '';
      return;
    }

    // Same-panel: find which non-source column zone the cursor is directly over
    let effectiveTarget = sourceIdxInPanel;
    for (let i = 0; i < tRects.length; i++) {
      if (i === sourceIdxInPanel) continue;
      const colLeft = tRects[i].left + scrollDelta;
      const colRight = tRects[i].right + scrollDelta;
      if (clientX >= colLeft && clientX < colRight) { effectiveTarget = i; break; }
    }
    // Snapping to an *adjacent* column is only meaningful when the panel holds at
    // least two real (draggable) columns AND the source is one of them. A panel
    // that contains only the dragged column — e.g. a center column just pinned
    // into the left region that otherwise holds only the checkbox/serial cells —
    // has nowhere to reorder to, so the snaps below must not run (they would
    // produce an out-of-range index such as 1 or -1 and dereference undefined).
    const canSnap = tRects.length > 1 && sourceIdxInPanel >= 0 && sourceIdxInPanel < tRects.length;
    // Cursor before all columns: snap to leftmost non-source column
    if (canSnap && effectiveTarget === sourceIdxInPanel && clientX < tRects[0].left + scrollDelta) {
      effectiveTarget = sourceIdxInPanel === 0 ? 1 : 0;
    }
    // Cursor after all columns: snap to rightmost non-source column
    if (canSnap && effectiveTarget === sourceIdxInPanel && clientX >= tRects[tRects.length - 1].right + scrollDelta) {
      const lastIdx = tRects.length - 1;
      effectiveTarget = sourceIdxInPanel === lastIdx ? lastIdx - 1 : lastIdx;
    }
    const prevSlot = this.dragTargetLocalIdx;
    this.dragTargetLocalIdx = effectiveTarget;

    // Rebuild group rows whenever the effective drop slot changes so group spans
    // reflect the pending position in real time — identical to AG Grid behaviour.
    if (this.displayGroupEngine?.hasGroups && effectiveTarget !== prevSlot) {
      this.rebuildGroupRowsWithPreview(effectiveTarget, sourceIdxInPanel, srcPD);
    }

    // Same-panel: apply CSS transforms
    const gridId = this.draggingGridEl?.getAttribute('data-photon-grid-id') ?? '';
    const scope = gridId ? `[data-photon-grid-id="${gridId}"] ` : '';
    let css = '';

    if (effectiveTarget === sourceIdxInPanel) { this.dragStyleEl.textContent = ''; return; }

    const srcRect = srcPD.rects[sourceIdxInPanel];
    const tgtRect = tRects[effectiveTarget];
    // Defensive: if either rect is missing (e.g. panelDragData captured a frame
    // out of step with the DOM during a live cross-panel move), abort this frame's
    // transform rather than dereferencing undefined. The next mouse move recovers.
    if (!srcRect || !tgtRect) { this.dragStyleEl.textContent = ''; return; }
    const srcOffset = effectiveTarget > sourceIdxInPanel ? tgtRect.right - srcRect.right : tgtRect.left - srcRect.left;
    css += `${scope}[data-col-id="${tIds[sourceIdxInPanel]}"] { --pg-drag-x: ${srcOffset}px; z-index: 10; position: relative; transition: none; }\n`;

    for (let i = 0; i < tRects.length; i++) {
      if (i === sourceIdxInPanel) continue;
      let offset = 0;
      if (effectiveTarget > sourceIdxInPanel && i > sourceIdxInPanel && i <= effectiveTarget) offset = -this.draggedColWidth;
      else if (effectiveTarget < sourceIdxInPanel && i >= effectiveTarget && i < sourceIdxInPanel) offset = this.draggedColWidth;
      if (offset !== 0) css += `${scope}[data-col-id="${tIds[i]}"] { --pg-drag-x: ${offset}px; }\n`;
    }

    this.dragStyleEl.textContent = css;
  }

  private onGlobalMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.draggingPanelRowEl) return;

    if (this.ghostEl) {
      this.ghostEl.style.left = `${e.clientX + 14}px`;
      this.ghostEl.style.top = `${e.clientY}px`;
    }

    // Outside grid → hide-column mode
    const gridBounds = this.draggingGridEl?.getBoundingClientRect();
    const isOutside = !!gridBounds && (
      e.clientX < gridBounds.left || e.clientX > gridBounds.right ||
      e.clientY < gridBounds.top || e.clientY > gridBounds.bottom
    );
    if (isOutside) {
      this.dragIsHideMode = true;
      this.stopAutoScroll();
      this.ghostEl?.classList.add('pg-col-drag-ghost--hide');
      this.ghostEl?.classList.remove('pg-col-drag-ghost--no-drop', 'pg-col-drag-ghost--scroll-left', 'pg-col-drag-ghost--scroll-right');
      if (this.dragStyleEl) this.dragStyleEl.textContent = '';
      return;
    }
    this.dragIsHideMode = false;
    this.ghostEl?.classList.remove('pg-col-drag-ghost--hide');

    // Group zone
    const overGroupZone = this.groupDropZone?.isOver(e.clientX, e.clientY) ?? false;
    if (overGroupZone && !this.draggingIsGroupable) {
      this.stopAutoScroll();
      this.ghostEl?.classList.add('pg-col-drag-ghost--no-drop');
      document.body.style.cursor = 'no-drop';
      if (this.dragStyleEl) this.dragStyleEl.textContent = '';
      return;
    }
    this.ghostEl?.classList.remove('pg-col-drag-ghost--no-drop');
    document.body.style.cursor = 'grabbing';

    if (this.draggingIsGroupable && this.groupDropZone) {
      this.groupDropZone.highlight(overGroupZone);
      this.isOverGroupZone = overGroupZone;
      if (overGroupZone) {
        this.stopAutoScroll();
        if (this.dragStyleEl) this.dragStyleEl.textContent = '';
        return;
      }
    }

    this.lastDragClientX = e.clientX;
    this.updateAutoScroll(e.clientX);
    this.onDragMove(e.clientX);
  }

  private onGlobalMouseUp(_e: MouseEvent): void {
    if (!this.isDragging) { this.cleanupDrag(); return; }
    const colId = this.draggingColId;
    if (!colId) { this.cleanupDrag(); return; }

    // Capture state before cleanup resets everything
    const sourcePanel = this.dragSourcePanel;
    const targetPanel = this.dragTargetPanel;
    const targetLocalIdx = this.dragTargetLocalIdx;
    const targetPD = this.panelDragData.find((pd) => pd.panel === targetPanel);
    const srcPD = this.panelDragData.find((pd) => pd.panel === sourcePanel);
    const srcLocalIdx = srcPD?.colIds.indexOf(colId) ?? -1;
    const isHide = this.dragIsHideMode;
    const isGroup = this.draggingIsGroupable && this.isOverGroupZone;

    // Capture the element under the cursor BEFORE cleanupDrag removes the ghost —
    // this is used below to detect drops on group header cells.
    const dropEl = document.elementFromPoint(_e.clientX, _e.clientY) as HTMLElement | null;
    const droppedOnGroupId = dropEl?.closest<HTMLElement>('[data-group-id]')
      ?.getAttribute('data-group-id') ?? null;

    // Cleanup first → sets isDragging = false → next model change triggers full header rebuild
    this.cleanupDrag();

    if (isHide) { this.columnModel.setColumnVisible(colId, false); return; }
    if (isGroup && this.groupDropZone) { this.groupDropZone.dropColumn(colId); return; }

    // When a grouped leaf is dropped onto a DIFFERENT group's header cell, create a
    // solo clone group rather than doing a plain column reorder.  Dropping on the
    // leaf's own parent group header is treated as a no-op clone check (no action).
    if (droppedOnGroupId && this.groupModel && this.groupDragHandler) {
      const parentGroup = this.groupModel.getParent(colId);
      if (parentGroup) {
        // Dropped on its own parent → leave in place (within-group reorder already done)
        if (droppedOnGroupId !== parentGroup.groupId) {
          this.groupDragHandler.createLeafClone(colId, droppedOnGroupId);
          return;
        }
        return; // same parent — no clone needed
      }
    }

    if (sourcePanel === targetPanel) {
      // Same-panel (or live-moved, then fine-tuned within new panel)
      const visibleCols = this.columnModel.getVisibleColumns();
      const globalFrom = visibleCols.findIndex((c) => c.colId === colId);
      if (globalFrom === -1) return;
      const targetColId = targetLocalIdx !== -1 && targetPD ? targetPD.colIds[targetLocalIdx] : null;
      const globalTo = targetColId ? visibleCols.findIndex((c) => c.colId === targetColId) : globalFrom;
      // Always call moveColumn to trigger the full header rebuild (even if same position)
      this.columnModel.moveColumn(globalFrom, globalTo !== -1 ? globalTo : globalFrom);

      // If the leaf left its parent group's contiguous span, extract it into a
      // solo clone group so a group header appears at the new position.
      if (this.groupModel && this.groupDragHandler) {
        const parent = this.groupModel.getParent(colId);
        if (parent) {
          const updatedCols = (this.store.get('columns') as ColumnDef[]).filter((c) => c.visible !== false);
          const newIdx      = updatedCols.findIndex((c) => c.colId === colId);
          if (newIdx !== -1 && this.isLeafOutsideGroup(colId, newIdx, updatedCols)) {
            // insertBeforeId: the column that now follows the leaf in the flat list
            const insertBeforeId = updatedCols[newIdx + 1]?.colId ?? null;
            this.groupDragHandler.extractLeafToSoloGroup(colId, insertBeforeId);
          }
        }
      }
    } else {
      // Cursor dropped in a different panel than dragSourcePanel (fast move before live rects update)
      const targetPin          = targetPanel === 'left' ? ('left' as const) : targetPanel === 'right' ? ('right' as const) : null;
      const insertBeforeColId  = targetPD ? (targetPD.colIds[targetLocalIdx] ?? null) : null;
      this.columnModel.moveAndPin(colId, targetPin, insertBeforeColId);

      // Moving a grouped leaf cross-panel always places it outside its original
      // group — create a solo clone group in the target panel so the group
      // header follows the column.
      if (this.groupModel && this.groupDragHandler) {
        const parent = this.groupModel.getParent(colId);
        if (parent) {
          this.groupDragHandler.extractLeafToSoloGroup(colId, insertBeforeColId);
        }
      }
    }
    void srcLocalIdx;
  }

  private cleanupDrag(): void {
    this.isDragging = false;
    this.livePanelMoveInProgress = false;
    this.draggingIsGroupable = false;
    this.isOverGroupZone = false;
    this.dragIsHideMode = false;
    this.groupDropZone?.highlight(false);
    this.draggingPanelRowEl?.querySelector<HTMLElement>('.pg-th--dragging')?.classList.remove('pg-th--dragging');
    this.ghostEl?.remove();
    this.ghostEl = null;
    this.dragStyleEl?.remove();
    this.dragStyleEl = null;
    this.draggingGridEl?.classList.remove('pg-grid--col-dragging', 'pg-grid--col-autoscrolling');
    this.draggingGridEl = null;
    this.draggedColWidth = 0;
    this.panelDragData = [];
    this.dragStartScrollX = 0;
    this.stopAutoScroll();
    this.centerPanelRect = null;
    this.draggingColId = null;
    this.dragTargetLocalIdx = -1;
    this.draggingPanelRowEl = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('pointermove', this.boundMouseMove);
    document.removeEventListener('pointerup', this.boundMouseUp);
  }

  private startResize(e: PointerEvent, col: ColumnDef, thEl: HTMLElement): void {
    const startX = e.clientX;
    const startWidth = this.colStyles.getWidth(col.colId);
    // Right-pinned columns anchor their right edge to the grid border, so their
    // resize handle sits on the *left* (inner) edge — the only edge free to move.
    // Dragging that edge left must therefore widen the column, so the pointer
    // delta is inverted for them (matching AG Grid). Left/center columns keep
    // their right-edge handle: dragging right widens.
    const dir = col.pinned === 'right' ? -1 : 1;
    const minWidth = col.minWidth ?? 60;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    this._isResizingColumn = true;

    // Only treat this as a resize once the pointer actually moves past a small
    // threshold. A bare click (e.g. the first press of a double-click) must not
    // resize, rebuild the header, or freeze flex columns — otherwise the handle
    // element is replaced mid-gesture and the double-click auto-size is lost.
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      if (!moved) {
        if (Math.abs(ev.clientX - startX) <= 2) return;
        moved = true;
        thEl.classList.add('pg-th--resizing');
        // Lock every flex column to its current pixel width so dragging this one
        // resizes only it — the others keep their widths (the total may overflow
        // into a horizontal scrollbar) instead of flex redistributing and
        // collapsing them to minWidth. Done here (not on mousedown) so a plain
        // click never silently converts flex columns to fixed.
        this.colStyles.freezeFlexWidths();
      }
      this.colStyles.setWidth(col.colId, Math.max(minWidth, startWidth + (ev.clientX - startX) * dir));
      this.onResizeCb?.();
    };
    const onUp = (ev: PointerEvent) => {
      // Clear the flag BEFORE setColumnWidth fires an event so the final
      // post-resize render calls renderRows normally and the body is correct.
      this._isResizingColumn = false;
      thEl.classList.remove('pg-th--resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!moved) return; // no drag occurred — leave widths untouched
      const newWidth = Math.max(minWidth, startWidth + (ev.clientX - startX) * dir);
      this.colStyles.setWidth(col.colId, newWidth);
      this.columnModel.setColumnWidth(col.colId, newWidth, true);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  /**
   * Returns `true` when `colId` (at its new position `newIdx` in the visible
   * columns array) is no longer adjacent to any sibling leaf from its parent
   * group — meaning it has been dragged outside the group's contiguous span.
   *
   * @param colId  - The moved leaf column.
   * @param newIdx - Its new index in `cols`.
   * @param cols   - Current flat visible-column array (after the move).
   */
  private isLeafOutsideGroup(colId: string, newIdx: number, cols: ColumnDef[]): boolean {
    if (!this.groupModel) return false;
    const parent = this.groupModel.getParent(colId);
    if (!parent) return false;
    const siblings = new Set(
      this.groupModel.getLeavesInGroup(parent.groupId)
        .map((l) => l.colId)
        .filter((id) => id !== colId),
    );
    const left  = cols[newIdx - 1];
    const right = cols[newIdx + 1];
    return !(left && siblings.has(left.colId)) && !(right && siblings.has(right.colId));
  }

  // ──────────────────── Column menu: resize operations ────────────────────

  /** Resolves the owning `.pg-grid` element from any live header row, or `null`. */
  private getGridEl(): HTMLElement | null {
    return (this.centerHeaderRowEl ?? this.leftHeaderRowEl ?? this.rightHeaderRowEl)
      ?.closest<HTMLElement>('.pg-grid') ?? null;
  }

  /**
   * Starts an inline rename of a column: replaces the header label with a text
   * input, committing on Enter/blur and cancelling on Escape. Committing calls
   * {@link ColumnModel.setColumnHeader}, which rebuilds the header with the new
   * text. A no-op when the header cell can't be found.
   */
  private startHeaderRename(colId: string): void {
    const gridEl = this.getGridEl();
    const th = gridEl?.querySelector<HTMLElement>(`.pg-th[data-col-id="${colId}"]`);
    const label = th?.querySelector<HTMLElement>('.pg-th__label');
    const col = this.columnModel.getColumn(colId);
    if (!th || !label || !col) return;

    const input = document.createElement('input');
    input.className = 'pg-th__rename-input';
    input.type = 'text';
    input.value = col.header;
    input.setAttribute('aria-label', 'Rename column');

    let done = false;
    const commit = (): void => {
      if (done) return;
      done = true;
      const value = input.value.trim();
      if (value && value !== col.header) {
        this.columnModel.setColumnHeader(colId, value); // triggers header rebuild
      } else {
        input.replaceWith(label); // unchanged → restore original label
      }
    };
    const cancel = (): void => {
      if (done) return;
      done = true;
      input.replaceWith(label);
    };

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', commit);
    // Don't let the input's own clicks reach the header's sort/drag handlers.
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('click', (e) => e.stopPropagation());

    label.replaceWith(input);
    input.focus();
    input.select();
  }

  /**
   * Measures the pixel width needed to show a column's header plus every
   * currently-rendered cell without truncation, clamped to the column's
   * min/max. Only virtualized (on-screen) rows are measured, so the cost scales
   * with the viewport, not the dataset. Uses one reused off-screen `<span>` so
   * cell fonts/metrics match the grid.
   */
  private measureColumnContentWidth(gridEl: HTMLElement, col: ColumnDef): number {
    const measurer = gridEl.ownerDocument.createElement('span');
    measurer.style.cssText =
      'position:absolute;top:-9999px;left:-9999px;visibility:hidden;white-space:nowrap;pointer-events:none;padding:0 12px;';
    gridEl.appendChild(measurer);

    measurer.textContent = col.header ?? '';
    let maxWidth = measurer.offsetWidth + 24; // header text + sort/menu affordance headroom

    const cells = gridEl.querySelectorAll<HTMLElement>(`.pg-cell[data-col-id="${col.colId}"]`);
    for (let i = 0; i < cells.length; i++) {
      measurer.textContent = cells[i].textContent ?? '';
      const w = measurer.offsetWidth + 24;
      if (w > maxWidth) maxWidth = w;
    }

    measurer.remove();
    const min = col.minWidth ?? 40;
    const max = col.maxWidth ?? Infinity;
    return Math.round(Math.min(max, Math.max(min, maxWidth)));
  }

  /**
   * Auto-sizes the given columns to their content width. Measures each, then
   * commits all widths in a single style flush + single render (via the batch
   * setters), so "Auto Size All" stays cheap. A no-op if the grid DOM or the
   * columns cannot be resolved.
   */
  private autoSizeColumns(colIds: string[]): void {
    const gridEl = this.getGridEl();
    if (!gridEl) return;

    const entries: Array<[string, number]> = [];
    for (const colId of colIds) {
      const col = this.columnModel.getColumn(colId);
      if (!col) continue;
      entries.push([colId, this.measureColumnContentWidth(gridEl, col)]);
    }
    if (entries.length === 0) return;

    // Style manager first (immediate CSS width + marks fixed so flex can't
    // override), then the model (persisted state + one COLUMNS_STATE_CHANGED
    // that drives the re-render and scrollbar/content-width recompute).
    this.colStyles.setWidths(entries);
    this.columnModel.setColumnWidths(entries);
  }

  /**
   * Distributes the center viewport width across the visible unpinned columns
   * so they exactly fill the grid with no horizontal scroll (proportional to
   * current widths, clamped to each column's min/max). Pinned columns keep
   * their widths. A no-op when the center viewport can't be measured.
   */
  private fitColumnsToGrid(): void {
    const gridEl = this.getGridEl();
    if (!gridEl) return;
    const centerBody = gridEl.querySelector<HTMLElement>('.pg-panel--center .pg-panel__body');
    const available = centerBody?.clientWidth ?? 0;
    if (available <= 0) return;

    const centerCols = this.columnModel
      .getVisibleColumns()
      .filter((c) => c.pinned !== 'left' && c.pinned !== 'right');
    if (centerCols.length === 0) return;

    const totalCurrent = centerCols.reduce((sum, c) => sum + this.colStyles.getWidth(c.colId), 0) || 1;

    const entries: Array<[string, number]> = [];
    let allocated = 0;
    for (const c of centerCols) {
      const min = c.minWidth ?? 40;
      const max = c.maxWidth ?? Infinity;
      const w = Math.min(max, Math.max(min, Math.round((this.colStyles.getWidth(c.colId) / totalCurrent) * available)));
      entries.push([c.colId, w]);
      allocated += w;
    }

    // Absorb rounding/clamping drift into the last column so the total is exact.
    const diff = available - allocated;
    if (diff !== 0) {
      const lastCol = centerCols[centerCols.length - 1];
      const min = lastCol.minWidth ?? 40;
      const max = lastCol.maxWidth ?? Infinity;
      const last = entries[entries.length - 1];
      entries[entries.length - 1] = [last[0], Math.min(max, Math.max(min, last[1] + diff))];
    }

    this.colStyles.setWidths(entries);
    this.columnModel.setColumnWidths(entries);
  }

  /**
   * Resets a column's width to its original definition. Clears the user-fixed
   * override in the style manager (so a `flex` column resumes flexing) and
   * restores the model's width, which re-renders via `COLUMNS_STATE_CHANGED`.
   */
  private resetColumnWidth(colId: string): void {
    this.colStyles.clearUserWidth(colId);
    this.columnModel.resetColumnWidth(colId);
  }

  private onAction(action: string, colId: string): void {
    this.eventBus.emit(GridEventType.COLUMNS_STATE_CHANGED, {
      action, colId, states: this.columnModel.getColumnStates(),
    });
  }
}
