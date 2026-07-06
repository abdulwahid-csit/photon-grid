import type { GridContext } from './grid-context';
import type { ColumnDef, ColumnState, ColumnPinPosition } from '../types/column.types';
import type { RowNode } from '../types/row.types';
import type { FilterModel, ColumnFilter } from '../types/filter.types';
import type { SortConfig, GridState, CellRange } from '../types/grid.types';
import type { GridEventType } from '../types/event.types';
import type { EventHandler } from '../event-bus/event-bus';
import type { ChartConfig } from '../chart/chart-engine';
import type { ColumnGroupModel } from '../column-groups/column-group-model';
import type { ColumnGroupSerialState, ColumnGroupSystemState, ColumnTreeNode } from '../column-groups/column-group.types';
import { ColumnGroupStateManager } from '../column-groups/column-group-state-manager';
import type { PhotonCommandResult } from '../photon-ai/photon-ai.types';

export class GridApi {
  private _columnGroupModel: ColumnGroupModel | null = null;
  private _groupStateManager: ColumnGroupStateManager | null = null;

  constructor(private ctx: GridContext) {
    // Wire the filter panel so the renderer can read/write filter state and
    // trigger the sort/filter pipeline after each user interaction.
    this.ctx.renderer.setFilterEngine(this.ctx.filterEngine);
    this.ctx.renderer.setFilterRefreshCallback(() => this.refresh());
  }

  /**
   * Wire the live {@link ColumnGroupModel} into the API.
   * Called by {@link GridCore} after `buildContext` when column groups are present.
   *
   * @param model - The live group tree model.
   */
  setColumnGroupModel(model: ColumnGroupModel): void {
    this._columnGroupModel = model;
    this._groupStateManager = new ColumnGroupStateManager(this.ctx.columnModel, model);
  }

  // ──────────────────── Data ────────────────────

  setData(data: Record<string, unknown>[]): void {
    const rowHeight = this.ctx.options.rowHeight ?? 48;
    this.ctx.rowModel.setRowData(data, rowHeight);
    // History from the old dataset is meaningless after a full data swap.
    this.ctx.undoRedoEngine.clear();
    this.refresh();
  }

  appendData(data: Record<string, unknown>[]): void {
    this.ctx.rowModel.appendRowData(data);
    this.refresh();
  }

  updateRow(nodeId: string, data: Partial<Record<string, unknown>>): void {
    this.ctx.rowModel.updateRow(nodeId, data);
    this.refresh();
  }

  removeRows(nodeIds: string[]): void {
    this.ctx.rowModel.removeRows(nodeIds);
    this.refresh();
  }

  getRowNode(nodeId: string): RowNode | undefined {
    return this.ctx.rowModel.getRowNode(nodeId);
  }

  getRowByIndex(index: number): RowNode | undefined {
    return this.ctx.rowModel.getRowByIndex(index);
  }

  getAllRows(): RowNode[] {
    return this.ctx.store.get('allRows');
  }

  getVisibleRows(): RowNode[] {
    return this.ctx.store.get('visibleRows');
  }

  // ──────────────────── Columns ────────────────────

  setColumns(defs: ColumnDef[]): void {
    this.ctx.columnModel.initColumns(defs);
    this.refresh();
  }

  getColumn(colId: string): ColumnDef | undefined {
    return this.ctx.columnModel.getColumn(colId);
  }

  getAllColumns(): ColumnDef[] {
    return this.ctx.columnModel.getAllColumns();
  }

  getVisibleColumns(): ColumnDef[] {
    return this.ctx.columnModel.getVisibleColumns();
  }

  setColumnWidth(colId: string, width: number): void {
    this.ctx.columnModel.setColumnWidth(colId, width, true);
  }

  setColumnVisible(colId: string, visible: boolean): void {
    this.ctx.columnModel.setColumnVisible(colId, visible);
  }

  setColumnPin(colId: string, pinned: ColumnPinPosition): void {
    this.ctx.columnModel.setColumnPin(colId, pinned);
  }

  moveColumn(fromIndex: number, toIndex: number): void {
    this.ctx.columnModel.moveColumn(fromIndex, toIndex);
  }

  autoSizeColumn(colId: string): void {
    this.ctx.columnModel.autoSizeColumn(colId, this.ctx.containerEl);
  }

  autoSizeAllColumns(): void {
    for (const col of this.ctx.columnModel.getVisibleColumns()) {
      this.ctx.columnModel.autoSizeColumn(col.colId, this.ctx.containerEl);
    }
  }

  getColumnStates(): ColumnState[] {
    return this.ctx.columnModel.getColumnStates();
  }

  applyColumnStates(states: ColumnState[]): void {
    this.ctx.columnModel.applyColumnStates(states);
  }

  // ──────────────────── Sort ────────────────────

  sortColumn(colId: string, order: 'asc' | 'desc'): void {
    const col = this.ctx.columnModel.getColumn(colId);
    if (!col) return;
    this.ctx.sortEngine.sort(colId, col.field, order);
    this.ctx.columnModel.setColumnSort(colId, order);
    this.refresh();
  }

  clearSort(): void {
    this.ctx.sortEngine.clearSort();
    this.ctx.columnModel.clearAllSort();
    this.refresh();
  }

  getSortConfig(): SortConfig[] {
    return this.ctx.sortEngine.getSortConfig();
  }

  // ──────────────────── Filter ────────────────────

  setFilterModel(model: FilterModel): void {
    this.ctx.filterEngine.setFilterModel(model);
    this.refresh();
  }

  setColumnFilter(colId: string, filter: ColumnFilter | null): void {
    this.ctx.filterEngine.setColumnFilter(colId, filter);
    this.refresh();
  }

  clearAllFilters(): void {
    this.ctx.filterEngine.clearAllFilters();
    this.refresh();
  }

  setQuickFilter(term: string, fields?: string[]): void {
    const currentRows = this.ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
    if (currentRows.length > 0) this.ctx.renderer.captureRowAnimation(currentRows, 'filter');
    this.ctx.filterEngine.setQuickFilter({ term, fields });
    this.refresh();
  }

  getFilterModel(): FilterModel {
    return this.ctx.filterEngine.getFilterModel();
  }

  // ──────────────────── Selection ────────────────────

  selectRow(nodeId: string): void {
    const rows = this.ctx.store.get('visibleRows');
    this.ctx.rowSelectionEngine.selectRow(nodeId, rows);
  }

  deselectRow(nodeId: string): void {
    const rows = this.ctx.store.get('visibleRows');
    this.ctx.rowSelectionEngine.deselectRow(nodeId, rows);
  }

  selectAll(): void {
    const rows = this.ctx.store.get('visibleRows');
    this.ctx.rowSelectionEngine.selectAll(rows);
  }

  deselectAll(): void {
    const rows = this.ctx.store.get('visibleRows');
    this.ctx.rowSelectionEngine.deselectAll(rows);
  }

  getSelectedRows(): RowNode[] {
    const rows = this.ctx.store.get('visibleRows');
    return this.ctx.rowSelectionEngine.getSelectedRows(rows);
  }

  getSelectedCount(): number {
    return this.ctx.rowSelectionEngine.getSelectedCount();
  }

  isRowSelected(nodeId: string): boolean {
    return this.ctx.rowSelectionEngine.isRowSelected(nodeId);
  }

  // ──────────────────── Cell Selection ────────────────────

  setCellRange(range: CellRange): void {
    this.ctx.store.set('cellRanges', [range]);
    this.ctx.cellSelectionEngine.startSelection(range.startRowIndex, range.startColIndex);
    this.ctx.cellSelectionEngine.extendSelection(range.endRowIndex, range.endColIndex);
  }

  clearCellSelection(): void {
    this.ctx.cellSelectionEngine.clearSelection();
  }

  getCellRanges(): CellRange[] {
    return this.ctx.store.get('cellRanges');
  }

  // ──────────────────── Editing ────────────────────

  startCellEditing(rowNodeId: string, colId: string): void {
    const row = this.ctx.rowModel.getRowNode(rowNodeId);
    const col = this.ctx.columnModel.getColumn(colId);
    if (!row || !col) return;
    const cellEl = this.ctx.containerEl.querySelector<HTMLElement>(
      `[data-node-id="${rowNodeId}"] [data-col-id="${colId}"]`,
    );
    if (cellEl) this.ctx.cellEditorEngine.startEditing(row, col, cellEl);
  }

  stopEditing(cancel = false): void {
    this.ctx.cellEditorEngine.stopEditing(cancel);
  }

  // ──────────────────── Pagination ────────────────────

  goToPage(page: number): void {
    this.ctx.paginationEngine.goToPage(page);
    this.refresh();
  }

  setPageSize(size: number): void {
    this.ctx.paginationEngine.setPageSize(size);
    this.refresh();
  }

  getCurrentPage(): number {
    return this.ctx.paginationEngine.getCurrentPage();
  }

  getTotalPages(): number {
    return this.ctx.paginationEngine.getTotalPages();
  }

  // ──────────────────── Grouping ────────────────────

  groupByColumn(colId: string): void {
    this.ctx.groupingEngine.addGroupColumn(colId);
    this.refresh();
  }

  removeGroupColumn(colId: string): void {
    this.ctx.groupingEngine.removeGroupColumn(colId);
    this.refresh();
  }

  clearGrouping(): void {
    this.ctx.groupingEngine.clearGrouping();
    this.refresh();
  }

  expandGroup(groupKey: string): void {
    this.ctx.groupingEngine.expandGroup(groupKey);
    this.refresh();
  }

  collapseGroup(groupKey: string): void {
    this.ctx.groupingEngine.collapseGroup(groupKey);
    this.refresh();
  }

  expandAllGroups(): void {
    this.ctx.groupingEngine.expandAllGroups(this.ctx.store.get('visibleRows'));
    this.refresh();
  }

  collapseAllGroups(): void {
    this.ctx.groupingEngine.collapseAllGroups();
    this.refresh();
  }

  // ──────────────────── Tree Data ────────────────────

  expandTreeNode(nodeId: string): void {
    const node = this.ctx.treeDataService.getNode(nodeId);
    if (!node) return;
    this.ctx.treeExpansionService.expand(node);
    this.refresh();
  }

  collapseTreeNode(nodeId: string): void {
    const node = this.ctx.treeDataService.getNode(nodeId);
    if (!node) return;
    this.ctx.treeExpansionService.collapse(node);
    this.refresh();
  }

  toggleTreeNode(nodeId: string): void {
    const node = this.ctx.treeDataService.getNode(nodeId);
    if (!node) return;
    this.ctx.treeExpansionService.toggle(node);
    this.refresh();
  }

  expandAllTreeNodes(): void {
    this.ctx.treeExpansionService.expandAll(this.ctx.treeDataService.getRoots());
    this.refresh();
  }

  collapseAllTreeNodes(): void {
    this.ctx.treeExpansionService.collapseAll();
    this.refresh();
  }

  isTreeNodeExpanded(nodeId: string): boolean {
    return this.ctx.treeExpansionService.isExpanded(nodeId);
  }

  /** The full set of children for `nodeId` (not just currently expanded/visible ones), or `[]` if the node doesn't exist, has none, or Tree Data isn't enabled. */
  getTreeNodeChildren(nodeId: string): RowNode[] {
    return this.ctx.treeDataService.getNode(nodeId)?.children ?? [];
  }

  /**
   * Triggers `TreeDataConfig.lazyLoadChildren` for `nodeId` if configured and
   * not already loaded/in-flight. Refreshes automatically once the fetch
   * resolves — no need to call `refresh()` yourself afterward.
   */
  loadTreeNodeChildren(nodeId: string): void {
    this.ctx.treeDataService.loadChildren(nodeId);
  }

  // ──────────────────── Master/Detail ────────────────────

  /** Expands `nodeId`'s detail row (a no-op if the row has no detail or is already expanded). */
  expandDetail(nodeId: string): void {
    const row = this.ctx.rowModel.getRowNode(nodeId);
    if (!row) return;
    this.ctx.masterDetailEngine.expand(row);
    this.refresh();
  }

  /** Collapses `nodeId`'s detail row, destroying its nested grid instance (if any). */
  collapseDetail(nodeId: string): void {
    const row = this.ctx.rowModel.getRowNode(nodeId);
    if (!row) return;
    this.ctx.masterDetailEngine.collapse(row);
    this.refresh();
  }

  toggleDetail(nodeId: string): void {
    const row = this.ctx.rowModel.getRowNode(nodeId);
    if (!row) return;
    this.ctx.masterDetailEngine.toggle(row);
    this.refresh();
  }

  isDetailExpanded(nodeId: string): boolean {
    return this.ctx.masterDetailEngine.isExpanded(nodeId);
  }

  /** Collapses every currently-expanded detail row. */
  collapseAllDetails(): void {
    this.ctx.masterDetailEngine.collapseAll(this.ctx.store.get('allRows'));
    this.refresh();
  }

  /**
   * Returns the nested `GridApi` for `nodeId`'s expanded detail row, enabling
   * programmatic control of the nested grid (sort, filter, selection, etc.).
   * `undefined` when the row is not expanded or its nested grid has not been
   * built yet (e.g. still loading, or scrolled outside the render window on
   * first expand).
   */
  getDetailGridApi(nodeId: string): unknown {
    return this.ctx.renderer.getDetailGridApi(nodeId);
  }

  // ──────────────────── Photon AI ────────────────────

  /**
   * Programmatic equivalent of typing `text` into the Photon AI panel and
   * pressing send — runs the same normalize → parse → resolve → build →
   * execute pipeline. Useful for tests or a custom trigger UI. Returns a
   * graceful failure result (never throws) when `photonAI.enabled` is falsy.
   */
  submitAICommand(text: string): PhotonCommandResult {
    return this.ctx.renderer.submitAICommand(text);
  }

  // ──────────────────── Column Groups ────────────────────

  /**
   * Collapse a column header group, hiding all its leaf columns.
   *
   * @param groupId - The `groupId` of the group to collapse.
   */
  collapseColumnGroup(groupId: string): void {
    if (!this._columnGroupModel) return;
    this._columnGroupModel.collapseGroup(groupId);
    const leaves = this._columnGroupModel.getLeavesInGroup(groupId);
    for (const leaf of leaves) this.ctx.columnModel.setColumnVisible(leaf.colId, false);
  }

  /**
   * Expand a column header group, showing all its leaf columns.
   *
   * @param groupId - The `groupId` of the group to expand.
   */
  expandColumnGroup(groupId: string): void {
    if (!this._columnGroupModel) return;
    this._columnGroupModel.expandGroup(groupId);
    const leaves = this._columnGroupModel.getLeavesInGroup(groupId);
    for (const leaf of leaves) this.ctx.columnModel.setColumnVisible(leaf.colId, true);
  }

  /**
   * Toggle a column header group between collapsed and expanded.
   *
   * @param groupId - The `groupId` of the group to toggle.
   */
  toggleColumnGroup(groupId: string): void {
    if (!this._columnGroupModel) return;
    const group = this._columnGroupModel.getGroup(groupId);
    if (!group) return;
    if (group.collapsed) this.expandColumnGroup(groupId);
    else this.collapseColumnGroup(groupId);
  }

  /**
   * Move an entire column group to a new position in the tree.
   *
   * @param groupId        - ID of the group to move.
   * @param newParentId    - Target parent group ID, or `null` for root level.
   * @param insertBeforeId - Sibling ID to insert before, or `null` to append.
   */
  moveColumnGroup(groupId: string, newParentId: string | null, insertBeforeId: string | null): void {
    if (!this._columnGroupModel) return;
    this._columnGroupModel.moveGroup(groupId, newParentId, insertBeforeId);
    this.refresh();
  }

  /**
   * Serialize the complete column-group system state (groups + leaf columns).
   *
   * @returns A {@link ColumnGroupSystemState} snapshot safe for `JSON.stringify`.
   */
  getColumnGroupState(): ColumnGroupSystemState | null {
    return this._groupStateManager?.getState() ?? null;
  }

  /**
   * Restore a previously serialized column-group system state.
   *
   * @param state - Partial or full {@link ColumnGroupSystemState}.
   */
  applyColumnGroupState(state: Partial<ColumnGroupSystemState>): void {
    if (!this._groupStateManager) return;
    this._groupStateManager.applyState(state);
    this.refresh();
  }

  /**
   * Return the serialized expand/collapse states for all groups.
   */
  getColumnGroupStates(): ColumnGroupSerialState[] {
    return this._groupStateManager?.getGroupStates() ?? [];
  }

  /**
   * Return the root nodes of the column tree (groups and leaves at the top level).
   * Returns `null` when no column groups are configured.
   */
  getColumnTree(): ColumnTreeNode[] | null {
    return this._columnGroupModel?.getRootNodes() ?? null;
  }

  // ──────────────────── Export ────────────────────

  exportCsv(fileName?: string): void {
    this.ctx.exportEngine.exportToCsv(
      this.ctx.store.get('visibleRows'),
      this.ctx.columnModel.getVisibleColumns(),
      { fileName: fileName ?? this.ctx.options.exportConfig?.fileName ?? 'export' },
    );
  }

  exportXlsx(fileName?: string): void {
    this.ctx.exportEngine.exportToXlsx(
      this.ctx.store.get('visibleRows'),
      this.ctx.columnModel.getVisibleColumns(),
      { fileName: fileName ?? this.ctx.options.exportConfig?.fileName ?? 'export' },
    );
  }

  // ──────────────────── Clipboard ────────────────────

  copySelectedRowsToClipboard(): Promise<void> {
    const rows = this.getSelectedRows();
    const cols = this.ctx.columnModel.getVisibleColumns();
    return this.ctx.clipboardEngine.copyRowsToClipboard(rows, cols);
  }

  /** Copies the active cell range(s) — not row selection — to the clipboard as tab-separated text, with a header row. A no-op when no cell range is active. */
  copySelectedCellsToClipboard(): Promise<void> {
    const ranges = this.getCellRanges();
    if (ranges.length === 0) return Promise.resolve();
    const rows = this.getVisibleRows();
    const cols = this.ctx.columnModel.getVisibleColumns();
    return this.ctx.clipboardEngine.copyRangesToClipboard(ranges, rows, cols, true);
  }

  // ──────────────────── Scroll ────────────────────

  scrollToRow(rowIndex: number): void {
    this.ctx.renderer.scrollToRow(rowIndex);
  }

  scrollToTop(): void {
    this.ctx.renderer.scrollToTop();
  }

  /** Whether the grid body can still scroll further up. Used by a Master/Detail parent to chain wheel scroll into a nested grid before forwarding it further up itself. */
  canScrollUp(): boolean {
    return this.ctx.renderer.canScrollUp();
  }

  /** Whether the grid body can still scroll further down. */
  canScrollDown(): boolean {
    return this.ctx.renderer.canScrollDown();
  }

  // ──────────────────── Theme ────────────────────

  setTheme(nameOrTheme: string): void {
    this.ctx.themeManager.applyTheme(nameOrTheme, this.ctx.containerEl);
  }

  toggleDarkMode(): void {
    this.ctx.themeManager.toggleDarkMode();
  }

  // ──────────────────── Full Screen ────────────────────

  enterFullScreen(): void {
    this.ctx.renderer.enterFullScreen();
  }

  exitFullScreen(): void {
    this.ctx.renderer.exitFullScreen();
  }

  // ──────────────────── Charts ────────────────────

  createChart(parentEl: HTMLElement, config: ChartConfig): string {
    const rows = this.ctx.store.get('visibleRows');
    const cols = this.ctx.columnModel.getVisibleColumns();
    return this.ctx.chartEngine.createChart(parentEl, config, rows, cols);
  }

  destroyChart(chartId: string): void {
    this.ctx.chartEngine.destroyChart(chartId);
  }

  exportChartAsImage(chartId: string, format: 'png' | 'jpeg' = 'png'): string | null {
    return this.ctx.chartEngine.exportChartAsImage(chartId, format);
  }

  // ──────────────────── State ────────────────────

  getGridState(): GridState {
    return {
      columnStates: this.ctx.columnModel.getColumnStates(),
      sortConfig: this.ctx.sortEngine.getSortConfig(),
      filterModel: this.ctx.filterEngine.getFilterModel(),
      paginationPage: this.ctx.paginationEngine.getCurrentPage(),
      paginationPageSize: this.ctx.paginationEngine.getPageSize(),
      groupedColumns: this.ctx.store.get('groupedColumnIds'),
      expandedGroups: Array.from(this.ctx.store.get('expandedGroupKeys')),
      expandedTreeNodeIds: Array.from(this.ctx.store.get('expandedTreeNodeIds')),
      selectedRowIds: Array.from(this.ctx.store.get('selectedRowIds')),
    };
  }

  applyGridState(state: GridState): void {
    if (state.columnStates) this.applyColumnStates(state.columnStates);
    if (state.sortConfig?.length) this.ctx.sortEngine.multiSort(state.sortConfig);
    if (state.filterModel) this.ctx.filterEngine.setFilterModel(state.filterModel);
    if (state.paginationPage) this.ctx.paginationEngine.goToPage(state.paginationPage);
    if (state.paginationPageSize) this.ctx.paginationEngine.setPageSize(state.paginationPageSize);
    if (state.expandedTreeNodeIds?.length) {
      this.ctx.store.set('expandedTreeNodeIds', new Set(state.expandedTreeNodeIds));
    }
    this.refresh();
  }

  // ──────────────────── Events ────────────────────

  on<T>(event: GridEventType, handler: EventHandler<T>): () => void {
    return this.ctx.eventBus.on(event, handler);
  }

  off(event: GridEventType, handler: EventHandler): void {
    this.ctx.eventBus.off(event, handler);
  }

  // ──────────────────── Summary ────────────────────

  getSummaryRow(): Record<string, unknown> {
    const rows = this.ctx.store.get('visibleRows');
    const cols = this.ctx.columnModel.getVisibleColumns();
    return this.ctx.summaryEngine.compute(rows, cols);
  }

  // ──────────────────── Lifecycle ────────────────────

  refresh(): void {
    this.applyPipeline();
    this.ctx.renderer.scheduleRender();
  }

  forceRefresh(): void {
    this.applyPipeline();
    this.ctx.renderer.forceRender();
  }

  destroy(): void {
    this.ctx.renderer.destroy();
    this.ctx.chartEngine.destroyAll();
    this.ctx.cellSelectionEngine.detach();
    this.ctx.dragDropEngine.destroy();
    this.ctx.themeManager.destroy();
    this.ctx.eventBus.clear();
    this.ctx.store.destroy();
  }

  private applyPipeline(): void {
    let rows = this.ctx.store.get('allRows');
    const columns = this.ctx.columnModel.getAllColumns();

    if (this.ctx.treeDataService.isEnabled()) {
      // Tree Data and column-value grouping are mutually exclusive — a grid
      // is either hierarchical or grouped by value, never both — so this
      // branch fully replaces the filter/sort/group steps below with their
      // tree-aware equivalents (which internally still call FilterEngine's
      // and SortEngine's own logic; see TreeDataService).
      rows = this.ctx.treeDataService.getFlatVisibleRows(rows, columns);
    } else {
      rows = this.ctx.filterEngine.applyFilters(rows, columns);
      rows = this.ctx.sortEngine.applySorting(rows, columns);

      const groupColIds = this.ctx.store.get('groupedColumnIds');
      if (groupColIds.length > 0) {
        rows = this.ctx.groupingEngine.groupByColumns(groupColIds, columns, rows);
      }
    }

    rows = this.ctx.paginationEngine.applyPagination(rows);
    rows = this.ctx.masterDetailEngine.injectDetailRows(rows);
    this.ctx.rowModel.setVisibleRows(rows);
    // Subtree extents depend on `top`/`height`, which `setVisibleRows` just
    // assigned — must run after layout, not from inside `getFlatVisibleRows`.
    if (this.ctx.treeDataService.isEnabled()) {
      this.ctx.treeDataService.annotateSubtreeExtents(rows);
    }
    this.ctx.store.set('visibleRows', rows);
  }
}
