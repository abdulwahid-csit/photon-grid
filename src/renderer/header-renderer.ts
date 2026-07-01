import type { ColumnDef } from '../types/column.types';
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
  private centerFilterRowEl: HTMLElement | null = null;
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

  /** Read by grid-renderer's columns-store watcher to skip header destroy during drag */
  get isDraggingCol(): boolean { return this.isDragging; }

  /** True while the user holds the resize handle and is actively moving the mouse. */
  private _isResizingColumn = false;

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
      onAutoSize:         (colId) => this.onAction('autosize', colId),
      onAutoSizeAll:      ()      => this.onAction('autosize-all', ''),
      onFitToGrid:        ()      => this.onAction('fit-to-grid', ''),
      onResetWidth:       (colId) => this.onAction('reset-width', colId),
      onOpenColumnChooser: ()     => this.onAction('column-chooser', ''),
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
      onRename:      (colDef) => this.onAction('rename',       colDef.colId),
      onDuplicate:   (colDef) => this.onAction('duplicate',    colDef.colId),
      onFreezePosition: (colDef) => this.onAction('freeze',    colDef.colId),
      onLockColumn:  (colDef) => this.onAction('lock',         colDef.colId),
      onResetColumn: (colDef) => this.onAction('reset-column', colDef.colId),
      onAggregate:   (colDef, func) => this.onAction(`aggregate-${func}`, colDef.colId),
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
      onOpenColumnChooser: () => this.onAction('column-chooser', ''),
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
          ? (e: MouseEvent, node: import('../column-groups/display-group.types').DisplayGroupNode, el: HTMLElement) =>
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
    if (options.showFilterRow) leftContainer.appendChild(this.buildFilterRow(leftCols, options, true));

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
      if (options.hasGroupedColumns) filterRow.insertBefore(createDiv('pg-filter-cell pg-filter-cell--auto-group'), filterRow.firstChild);
      centerInnerEl.appendChild(filterRow);
    }

    this.rightHeaderRowEl = this.buildHeaderRow(rightCols, options, false);
    rightContainer.appendChild(this.rightHeaderRowEl);
    if (options.showFilterRow) rightContainer.appendChild(this.buildFilterRow(rightCols, options, false));
  }

  updateSortIndicator(colId: string, order: 'asc' | 'desc' | null): void {
    const rows = [this.leftHeaderRowEl, this.centerHeaderRowEl, this.rightHeaderRowEl].filter((r): r is HTMLElement => r !== null);
    for (const row of rows) {
      for (const cell of Array.from(row.querySelectorAll<HTMLElement>('.pg-th[data-col-id]'))) {
        const isTarget = cell.getAttribute('data-col-id') === colId;
        toggleClass(cell, 'pg-th--sort-asc', isTarget && order === 'asc');
        toggleClass(cell, 'pg-th--sort-desc', isTarget && order === 'desc');
        toggleClass(cell, 'pg-th--sorted', isTarget && order !== null);
        if (isTarget) {
          const iconEl = cell.querySelector<HTMLElement>('.pg-th__sort-icon');
          if (iconEl) this.iconRenderer.updateIcon(iconEl, order === 'asc' ? 'sortAsc' : order === 'desc' ? 'sortDesc' : 'sortNone');
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
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    this.columnMenu.destroy();
    this.groupContextMenu?.destroy();
    this.leftHeaderRowEl   = null;
    this.centerHeaderRowEl = null;
    this.rightHeaderRowEl  = null;
    this.centerFilterRowEl = null;
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

    if (!this.centerFilterRowEl) return;
    this.centerFilterRowEl.innerHTML = '';
    if (options.hasGroupedColumns) this.centerFilterRowEl.appendChild(createDiv('pg-filter-cell pg-filter-cell--auto-group'));
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
      if (options.showCheckboxes) row.appendChild(this.buildCheckboxHeaderCell());
      if (options.showSerialNumber) row.appendChild(this.buildSerialHeaderCell());
    }
    for (let i = 0; i < columns.length; i++) row.appendChild(this.buildHeaderCell(columns[i], i, columns, options, row));
    return row;
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
    th.setAttribute('tabindex', '0');
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

    if (col.headerRendererFn) {
      const rendered = col.headerRendererFn({ colDef: col, sortOrder: col.sortOrder ?? null, filterActive: !!col.filterActive, api: null });
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

    // Filter icon — visible on hover; always visible when a filter is active.
    if (col.filterable !== false) {
      const filterBtn = createDiv('pg-th__filter-btn');
      const filterActive = col.filterActive === true;
      if (filterActive) filterBtn.classList.add('pg-th__filter-btn--active');
      filterBtn.innerHTML = this.iconRenderer.renderToString(filterActive ? 'filterActive' : 'filter', 14);
      filterBtn.title = 'Filter column';
      filterBtn.setAttribute('tabindex', '0');
      filterBtn.setAttribute('aria-label', `Filter ${col.header}`);
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openFilterPanelFn?.(col, filterBtn);
      });
      th.appendChild(filterBtn);
    }

    if (options.showColumnMenu !== false) {
      const menuBtn = createDiv('pg-th__menu-btn');
      menuBtn.innerHTML = this.iconRenderer.renderToString('menuHorizontal', 14);
      menuBtn.title = 'Column options';
      menuBtn.setAttribute('tabindex', '0');
      menuBtn.addEventListener('click', (e) => { e.stopPropagation(); this.columnMenu.show(col, menuBtn); });
      th.appendChild(menuBtn);
    }

    // Right-click on the header cell opens the context menu at cursor position.
    th.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.columnMenu.show(col, th, e.clientX, e.clientY);
    });

    if (col.resizable !== false) {
      const resizeHandle = createDiv('pg-th__resize-handle');
      resizeHandle.innerHTML = '|';
      resizeHandle.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); this.startResize(e, col, th); });
      th.appendChild(resizeHandle);
    }

    if (col.sortable !== false) {
      th.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.pg-th__resize-handle, .pg-th__menu-btn, .pg-th__filter-btn')) return;
        const next: 'asc' | 'desc' | null = col.sortOrder === null ? 'asc' : col.sortOrder === 'asc' ? 'desc' : null;
        if (next) this.sortEngine.sort(col.colId, col.field, next);
        else this.sortEngine.clearSort();
        this.columnModel.setColumnSort(col.colId, next);
        this.updateSortIndicator(col.colId, next);
        this.onAction('sort', col.colId);
      });
    }

    this.attachColumnDragListeners(th, col, panelColumns, panelRowEl);
    return th;
  }

  private buildFilterCell(col: ColumnDef): HTMLElement {
    const cell = createDiv('pg-filter-cell');
    cell.setAttribute('data-col-id', col.colId);
    if (col.filterable !== false) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'pg-filter-input';
      input.placeholder = `${col.header}…`;
      input.setAttribute('data-col-id', col.colId);
      input.addEventListener('input', (e) => {
        this.eventBus.emit(GridEventType.COLUMN_FILTER_CHANGED, {
          colId: col.colId, field: col.field, term: (e.target as HTMLInputElement).value,
        });
      });
      cell.appendChild(input);
    }
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
    th.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.pg-th__resize-handle, .pg-th__menu-btn, .pg-th__filter-btn, .pg-checkbox')) return;
      if (col.draggable === false || e.button !== 0) return;
      const startX = e.clientX;
      let moved = false;
      const onMoveCheck = (ev: MouseEvent) => {
        if (!moved && Math.abs(ev.clientX - startX) > 5) {
          moved = true;
          this.startColumnDrag(col, panelRowEl);
          document.removeEventListener('mousemove', onMoveCheck);
          document.addEventListener('mousemove', this.boundMouseMove);
          document.addEventListener('mouseup', this.boundMouseUp);
        }
        if (moved) this.onDragMove(ev.clientX);
      };
      const onUpEarly = () => {
        document.removeEventListener('mousemove', onMoveCheck);
        document.removeEventListener('mouseup', onUpEarly);
      };
      document.addEventListener('mousemove', onMoveCheck);
      document.addEventListener('mouseup', onUpEarly);
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
        ? (e: MouseEvent, node: DisplayGroupNode, el: HTMLElement)             => dragHandler.onHeaderMouseDown(e, node, el)
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
    // Cursor before all columns: snap to leftmost non-source column
    if (effectiveTarget === sourceIdxInPanel && tRects.length > 0 && clientX < tRects[0].left + scrollDelta) {
      effectiveTarget = sourceIdxInPanel === 0 ? 1 : 0;
    }
    // Cursor after all columns: snap to rightmost non-source column
    if (effectiveTarget === sourceIdxInPanel && tRects.length > 0 && clientX >= tRects[tRects.length - 1].right + scrollDelta) {
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
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private startResize(e: MouseEvent, col: ColumnDef, thEl: HTMLElement): void {
    const startX = e.clientX;
    const startWidth = this.colStyles.getWidth(col.colId);
    thEl.classList.add('pg-th--resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    this._isResizingColumn = true;
    const onMove = (ev: MouseEvent) => {
      this.colStyles.setWidth(col.colId, Math.max(col.minWidth ?? 60, startWidth + (ev.clientX - startX)));
      this.onResizeCb?.();
    };
    const onUp = (ev: MouseEvent) => {
      // Clear the flag BEFORE setColumnWidth fires an event so the final
      // post-resize render calls renderRows normally and the body is correct.
      this._isResizingColumn = false;
      const newWidth = Math.max(col.minWidth ?? 60, startWidth + (ev.clientX - startX));
      this.colStyles.setWidth(col.colId, newWidth);
      this.columnModel.setColumnWidth(col.colId, newWidth, true);
      thEl.classList.remove('pg-th--resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
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

  private onAction(action: string, colId: string): void {
    this.eventBus.emit(GridEventType.COLUMNS_STATE_CHANGED, {
      action, colId, states: this.columnModel.getColumnStates(),
    });
  }
}
