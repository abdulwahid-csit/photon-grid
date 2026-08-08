import type { GridContext } from './grid-context';
import type {
  CellEditorConstructor,
  CellEditorFactory,
  FrameworkEditorAdapter,
} from '../editing/types/cell-editor.types';
import type { ValidationResult, ValidatorFactory } from '../editing/types/validation.types';
import { getCellValue } from '../engines/editing/value-accessor';
import type { ColumnDef, ColumnDefInput, ColumnState, ColumnPinPosition } from '../types/column.types';
import type { RowNode } from '../types/row.types';
import type { FilterModel, ColumnFilter } from '../types/filter.types';
import type { SortConfig, GridState, CellRange } from '../types/grid.types';
import { normalizeRange } from '../cell-selection/selection-range';
import type {
  RowTransaction,
  RowVerticalScrollPosition,
  RefreshCellsParams,
  FlashCellsParams,
} from '../types/grid.types';
import { GridEventType } from '../types/event.types';
import type {
  SummaryAggregateFn,
  SummaryRowDef,
  SummaryRowSnapshot,
} from '../summary/summary.types';
import type { GridResizeConfig, GridSize } from '../types/grid-resize.types';
import type {
  GridImportSink,
  ImportOptions,
  ImportResult,
} from '../types/import.types';
import { ImportSourceType } from '../types/import.types';
import type { Workbook } from '../engines/import/model/workbook';
import type { WorkbookParser } from '../engines/import/parser/workbook-parser';
import type { ToastService } from '../toast/toast-service';
import type {
  ExportFormat,
  ExportOptions,
  GridExporter,
  PreparedExportData,
} from '../export/export.types';

import type { EventHandler } from '../event-bus/event-bus';
import type { ChartConfig } from '../chart/chart-engine';
import type { ChartModel } from '../chart/model/chart-model';
import type { CreateRangeChartParams } from '../chart/range-chart-service';
import type { ColumnGroupModel } from '../column-groups/column-group-model';
import type { ColumnGroupSerialState, ColumnGroupSystemState, ColumnTreeNode } from '../column-groups/column-group.types';
import { ColumnGroupStateManager } from '../column-groups/column-group-state-manager';
import type { PhotonCommandResult } from '../photon-ai/photon-ai.types';
import type { ThemeMode, ThemeVariant } from '../types/theme.types';
import type { IconSet } from '../types/icon.types';
import type { ServerSideDatasource } from '../types/server-side.types';
import type {
  LoadingOverlayConfig,
  ResolvedLoadingOverlayConfig,
} from '../types/loading.types';
import { ServerRowModel } from '../row-models/server/server-row-model';
import { InfiniteRowModel } from '../row-models/infinite/infinite-row-model';
import type { InfiniteStats } from '../types/infinite.types';
import type { PhotonThemeApi } from '../types/theme-ai.types';
import type { CellUpdate, CellUpdateResult, VDomStats } from '../renderer/vdom/vdom.types';
import type { DetailComponent } from '../types/detail-component.types';
import { DETAIL_ROW_VERTICAL_CHROME_PX } from '../renderer/detail-row-renderer';

export class GridApi {
  private _columnGroupModel: ColumnGroupModel | null = null;
  private _groupStateManager: ColumnGroupStateManager | null = null;

  /** Buffered transactions awaiting the next animation-frame flush (see {@link applyTransactionAsync}). */
  private _pendingTransactions: RowTransaction[] = [];
  /** Handle for the pending `requestAnimationFrame` flush, or `null` when none is scheduled. */
  private _txnFlushHandle: number | null = null;

  /**
   * Whether the previous summary computation produced any rows.
   *
   * Lets {@link computeSummaries} stay silent for the vast majority of grids
   * (which define no summary rows) while still emitting the one final
   * `SUMMARY_CHANGED` that reports the transition to empty when the last row is
   * removed.
   */
  private _hadSummaries = false;

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

  // ──────────────────── Context ────────────────────

  /**
   * The application state shared with the grid, from `GridOptions.context`.
   *
   * Read by everything the grid calls back into — an `actions` column's
   * predicates reach it as `params.context` — so it is the seam for what a
   * callback needs but a row does not carry: permissions, feature flags, the
   * current user.
   *
   * Returns the live object, not a copy; never `undefined`, so a caller can
   * read through it without a guard.
   */
  getContext(): Record<string, unknown> {
    return (this.ctx.options.context ??= {});
  }

  /**
   * Replaces the shared context wholesale.
   *
   * Use when the change should be atomic — a permission set arriving after
   * login, say. Mutating the object from {@link getContext} works too and is
   * visible immediately; this exists so a caller does not have to mutate to be
   * seen.
   *
   * Callbacks read the context when they run, so already-rendered cells pick
   * the new value up on their next paint. Follow with
   * `refreshCells({ force: true })` when the change must be visible now.
   */
  setContext(context: Record<string, unknown>): void {
    this.ctx.options.context = context;
  }

  // ──────────────────── Data ────────────────────

  setData(data: Record<string, unknown>[]): void {
    const rowHeight = this.ctx.options.rowHeight ?? 48;
    this.ctx.rowModel.setRowData(data, rowHeight);
    // History from the old dataset is meaningless after a full data swap.
    this.ctx.undoRedoEngine.clear();
    // Discover declarative formulas (column-level + row-data) for the new rows;
    // computed values are written into row data before the first paint, so a
    // plain refresh renders them (rows are freshly built, nothing cached).
    this.ctx.formulaInitializer.onLoad(
      this.ctx.columnModel.getAllColumns(),
      this.ctx.store.get('allRows') as RowNode[],
    );
    this.refresh();
  }

  appendData(data: Record<string, unknown>[]): void {
    const before = (this.ctx.store.get('allRows') as RowNode[]).length;
    this.ctx.rowModel.appendRowData(data);
    const all = this.ctx.store.get('allRows') as RowNode[];
    const changed = this.ctx.formulaInitializer.onRowsAdded(
      this.ctx.columnModel.getAllColumns(),
      all.slice(before),
    );
    if (changed.size > 0) this.ctx.renderer.invalidateBodyRowsByIds(new Set(changed));
    this.refresh();
  }

  updateRow(nodeId: string, data: Partial<Record<string, unknown>>): void {
    this.ctx.rowModel.updateRow(nodeId, data);
    const row = this.ctx.rowModel.getRowNode(nodeId);
    if (row) {
      const changed = this.ctx.formulaInitializer.onRowDataChanged(
        this.ctx.columnModel.getAllColumns(),
        row,
        Object.keys(data),
      );
      if (changed.size > 0) this.ctx.renderer.invalidateBodyRowsByIds(new Set(changed));
    }
    this.refresh();
  }

  removeRows(nodeIds: string[]): void {
    this.ctx.rowModel.removeRows(nodeIds);
    const changed = this.ctx.formulaInitializer.onRowsRemoved(new Set(nodeIds));
    if (changed.size > 0) this.ctx.renderer.invalidateBodyRowsByIds(new Set(changed));
    this.refresh();
  }

  // ──────────────────── Real-time cell updates ────────────────────

  /**
   * Applies a batch of field-level updates and repaints **only the cells whose
   * values actually changed**.
   *
   * This is the high-frequency path. Unlike {@link updateRow} or
   * {@link applyTransaction}, it does not re-run the row pipeline and does not
   * rebuild any row DOM: values are merged into the row data in place, and the
   * renderer's viewport Virtual DOM diffs the rendered window and writes just
   * the changed cells. Every piece of cell state survives — DOM focus, an open
   * editor, range selection, hover, and the DOM produced by custom renderers.
   *
   * Patches are coalesced to one flush per animation frame, so a feed pushing
   * thousands of updates per second still touches the DOM at most 60 times.
   *
   * **Automatic structural fallback.** If a changed field participates in the
   * active sort, an active filter, or the current grouping, the update can
   * change which rows are displayed or in what order — a structural change that
   * a cell patch cannot express. Those batches transparently fall back to a
   * full pipeline run, so correctness never depends on the caller knowing the
   * grid's current state.
   *
   * @example
   * ```ts
   * // Streaming price ticks — patches ~2 cells per visible row, no re-render.
   * socket.onmessage = (e) => {
   *   const ticks = JSON.parse(e.data);
   *   api.applyCellUpdates(ticks.map((t) => ({
   *     nodeId: t.symbol,
   *     values: { price: t.price, change: t.change },
   *   })));
   * };
   * ```
   *
   * @param updates - Per-row field updates, matched by `RowNode.nodeId`.
   * @returns What the batch did — see {@link CellUpdateResult}.
   */
  applyCellUpdates(updates: readonly CellUpdate[]): CellUpdateResult {
    if (updates.length === 0) {
      return { rowsUpdated: 0, cellsPatched: 0, pipelineRan: false };
    }

    const touchedFields = new Set<string>();
    const touchedRows: string[] = [];

    for (const update of updates) {
      const node = this.ctx.rowModel.mergeRowValues(update.nodeId, update.values);
      if (!node) continue;
      touchedRows.push(update.nodeId);
      for (const field in update.values) touchedFields.add(field);
    }

    if (touchedRows.length === 0) {
      return { rowsUpdated: 0, cellsPatched: 0, pipelineRan: false };
    }

    // A value the grid orders, filters or groups by is structural: the row's
    // position, not just its text, has to change. Re-run the pipeline for the
    // ordering — but the cells still repaint through the Virtual DOM below,
    // because the pipeline does not touch cell content.
    const structural = this.structuralReason(touchedFields);
    if (structural !== null) {
      // Snapshot row positions before the pipeline re-runs so the reorder plays
      // as a FLIP slide rather than rows teleporting. The sort/filter event
      // handlers do this for user-driven changes; a data-driven reorder needs
      // the same treatment, and is in fact where it matters most — the user did
      // not initiate the move and has no other cue that a row travelled.
      //
      // Every batch captures, including while a previous slide is still in
      // flight: `RowAnimator.animate` finalises in-flight elements before it
      // measures, so a restart re-targets from the row's committed position
      // instead of fighting the transform already on it. Skipping the capture
      // instead would be worse than no animation — the pipeline still moves the
      // rows, so they would jump silently *and* disturb the slide already
      // playing.
      const currentRows = this.ctx.store.get('visibleRows') as Array<{ nodeId: string; top: number }>;
      if (currentRows.length > 0) {
        this.ctx.renderer.captureRowAnimation(currentRows, structural);
      }
      this.refresh();
    }

    // Always patch the changed cells — including on the structural path.
    // Re-running the pipeline reorders rows but *reuses their DOM*, and a reused
    // row's cells are never re-rendered, so without this a row would slide to
    // the position its new value earns while still displaying its old one.
    // Render and patch are both frame-coalesced and converge in either order:
    // a row rebuilt by the render already carries current values (the diff then
    // finds nothing), and a row patched first keeps them when the render merely
    // repositions it.
    this.ctx.renderer.patchCells(touchedRows);

    return {
      rowsUpdated: touchedRows.length,
      cellsPatched: 0,
      pipelineRan: structural !== null,
    };
  }

  /**
   * Applies queued cell patches immediately rather than on the next frame.
   *
   * Needed when the DOM must be consistent synchronously — before measuring,
   * exporting, or asserting in a test.
   *
   * @returns The number of cells written to the DOM.
   */
  flushCellUpdates(): number {
    return this.ctx.renderer.flushCellPatches();
  }

  /**
   * Counters describing what the viewport Virtual DOM has done — how many cells
   * it compared, how many it actually wrote, and how long the last flush took.
   *
   * Useful for verifying that a real-time feed patches only what changed.
   */
  getVDomStats(): VDomStats {
    return this.ctx.renderer.getVDomStats();
  }

  /** Zeroes the Virtual DOM counters returned by {@link getVDomStats}. */
  resetVDomStats(): void {
    this.ctx.renderer.resetVDomStats();
  }

  /**
   * Classifies why a set of changed fields cannot be expressed as an in-place
   * cell patch, and therefore how the resulting re-layout should animate.
   *
   * @param fields - Fields whose values just changed.
   * @returns `'sort'` when the change reorders rows, `'filter'` when it can add
   *          or remove them, or `null` when the change is purely cosmetic and a
   *          cell patch is sufficient.
   */
  private structuralReason(fields: ReadonlySet<string>): 'sort' | 'filter' | null {
    const sorts = this.ctx.store.get('sortConfig') as SortConfig[];
    for (const sort of sorts) {
      if (fields.has(sort.field)) return 'sort';
    }

    // Grouping re-buckets rows, which reads as rows entering and leaving their
    // groups rather than sliding — the filter entrance is the right cue.
    const grouped = this.ctx.store.get('groupedColumnIds') as string[];
    for (const colId of grouped) {
      const col = this.ctx.columnModel.getColumn(colId);
      if (col && fields.has(col.field)) return 'filter';
    }

    const filterModel = this.ctx.store.get('filterModel') as FilterModel;
    for (const colId in filterModel) {
      const col = this.ctx.columnModel.getColumn(colId);
      if (col && fields.has(col.field)) return 'filter';
    }

    // A quick filter searches every column, so any change can affect matching.
    const quickFilter = this.ctx.store.get('quickFilterConfig');
    if (quickFilter && (quickFilter as { term?: string }).term) return 'filter';

    return null;
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

  setColumns(defs: ColumnDefInput[]): void {
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

  /**
   * Opens the Filters Tool Panel (the top-right filter funnel panel). Requires
   * `GridOptions.filtersToolPanel.enabled`; a no-op when the feature is off.
   */
  openFiltersToolPanel(): void {
    this.ctx.renderer.openFiltersToolPanel();
  }

  /** Closes the Filters Tool Panel. A no-op when the feature is off. */
  closeFiltersToolPanel(): void {
    this.ctx.renderer.closeFiltersToolPanel();
  }

  /** Toggles the Filters Tool Panel open/closed. A no-op when the feature is off. */
  toggleFiltersToolPanel(): void {
    this.ctx.renderer.toggleFiltersToolPanel();
  }

  /**
   * Selects a toolbar tab by id. Requires `GridOptions.toolbar.enabled` with a
   * matching tab; a no-op otherwise. Emits `TOOLBAR_TAB_CHANGED` on change.
   */
  setActiveToolbarTab(id: string): void {
    this.ctx.renderer.setActiveToolbarTab(id);
  }

  /** Returns the active toolbar tab id, or `null` when the toolbar is disabled or has no tabs. */
  getActiveToolbarTab(): string | null {
    return this.ctx.renderer.getActiveToolbarTab();
  }

  // ──────────────────── Server-Side Row Model ────────────────────

  /**
   * Sets (or replaces) the datasource used in server mode and immediately
   * refetches the current view. A no-op unless `GridOptions.rowModel === 'server'`.
   * @param datasource - The datasource, or `null` to detach (shows the empty state).
   */
  setServerSideDatasource(datasource: ServerSideDatasource | null): void {
    const strategy = this.ctx.rowModelStrategy;
    if (strategy instanceof ServerRowModel) strategy.setDatasource(datasource);
  }

  /**
   * Forces the Server-Side Row Model to refetch the current view. Pass
   * `{ purge: true }` to also clear the response cache (fetch fresh even for a
   * previously-cached page). A no-op unless `rowModel === 'server'`.
   */
  refreshServerSide(params: { purge?: boolean } = {}): void {
    const strategy = this.ctx.rowModelStrategy;
    if (strategy instanceof ServerRowModel) strategy.refresh(params);
  }

  // ──────────────────── Infinite Row Model ────────────────────

  /**
   * Sets (or replaces) the datasource used in infinite mode and reloads from
   * the current scroll position. A no-op unless `rowModel === 'infinite'`.
   *
   * The datasource contract is the same one the Server-Side Row Model uses, so
   * an implementation can be shared between the two models verbatim.
   *
   * @param datasource - The datasource, or `null` to detach (shows the empty state).
   */
  setInfiniteDatasource(datasource: ServerSideDatasource | null): void {
    const strategy = this.ctx.rowModelStrategy;
    if (strategy instanceof InfiniteRowModel) strategy.setDatasource(datasource);
  }

  /**
   * Reloads the pages currently resident. Pass `{ purge: true }` to empty the
   * page cache first, so previously loaded pages are fetched fresh rather than
   * served from memory. A no-op unless `rowModel === 'infinite'`.
   */
  refreshInfinite(params: { purge?: boolean } = {}): void {
    const strategy = this.ctx.rowModelStrategy;
    if (strategy instanceof InfiniteRowModel) strategy.refresh(params);
  }

  /**
   * Drops a range of cached pages so they reload when next seen — the targeted
   * alternative to {@link refreshInfinite} when only part of the dataset went
   * stale. Omit both bounds to invalidate everything.
   *
   * @param from - First page index, inclusive (0-based).
   * @param to   - Last page index, inclusive.
   */
  invalidateInfinitePages(from?: number, to?: number): void {
    const strategy = this.ctx.rowModelStrategy;
    if (strategy instanceof InfiniteRowModel) strategy.invalidatePages(from, to);
  }

  /**
   * Cache and request diagnostics for the Infinite Row Model — cached pages,
   * in-flight and queued requests, hit/miss counts and load totals.
   *
   * @returns The stats, or `null` when another row model is active.
   */
  getInfiniteStats(): InfiniteStats | null {
    const strategy = this.ctx.rowModelStrategy;
    return strategy instanceof InfiniteRowModel ? strategy.getStats() : null;
  }

  // ──────────────────── State ────────────────────

  /**
   * Returns a serialisable snapshot of grid state (columns — order / width /
   * visibility / pinning, sort, filter, pagination, grouping, expansion,
   * selection) suitable for persisting on your own server. Alias of
   * {@link getGridState}.
   */
  getState(): GridState {
    return this.getGridState();
  }

  /** Restores a snapshot produced by {@link getState}. Alias of {@link applyGridState}. */
  setState(state: GridState): void {
    this.applyGridState(state);
  }

  // ──────────────────── Selection ────────────────────

  /**
   * Selects a single row by its node id. In `single` selection mode this
   * replaces any existing selection; in `multiple` mode it adds to it. A no-op
   * when selection is disabled (`mode: 'none'`). Emits `ROW_SELECTED`.
   *
   * @param nodeId - The row's node id (see {@link RowNode.nodeId}).
   */
  selectRow(nodeId: string): void {
    const rows = this.ctx.store.get('visibleRows');
    this.ctx.rowSelectionEngine.selectRow(nodeId, rows);
  }

  /**
   * Removes a single row from the selection. Honors `suppressRowDeselection`.
   * Emits `ROW_DESELECTED`.
   *
   * @param nodeId - The row's node id.
   */
  deselectRow(nodeId: string): void {
    const rows = this.ctx.store.get('visibleRows');
    this.ctx.rowSelectionEngine.deselectRow(nodeId, rows);
  }

  /**
   * Toggles a single row's selection — selects it if unselected, deselects it if
   * selected. Mirrors a Ctrl/Cmd-click on the row.
   *
   * @param nodeId - The row's node id.
   */
  toggleRowSelection(nodeId: string): void {
    const rows = this.ctx.store.get('visibleRows');
    this.ctx.rowSelectionEngine.toggleRowSelection(nodeId, rows);
  }

  /** Selects every data row (only meaningful in `multiple` mode). Emits `ALL_ROWS_SELECTED`. */
  selectAll(): void {
    const rows = this.ctx.store.get('visibleRows');
    this.ctx.rowSelectionEngine.selectAll(rows);
  }

  /** Clears the entire row selection. Emits `ALL_ROWS_DESELECTED`. */
  deselectAll(): void {
    const rows = this.ctx.store.get('visibleRows');
    this.ctx.rowSelectionEngine.deselectAll(rows);
  }

  /** The currently selected rows, in display order. */
  getSelectedRows(): RowNode[] {
    const rows = this.ctx.store.get('visibleRows');
    return this.ctx.rowSelectionEngine.getSelectedRows(rows);
  }

  /** The node ids of the currently selected rows (includes ids selected off-page/filtered-out). */
  getSelectedRowIds(): string[] {
    return Array.from(this.ctx.store.get('selectedRowIds') as Set<string>);
  }

  /** How many rows are currently selected. */
  getSelectedCount(): number {
    return this.ctx.rowSelectionEngine.getSelectedCount();
  }

  /** Whether the row with `nodeId` is currently selected. */
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

  /**
   * Runs an intelligent AutoFill from a source range, continuing its detected
   * pattern (numeric/date/name series, `Item001 → Item002`, alphabet, booleans,
   * or a copy fallback) — the programmatic equivalent of dragging the fill
   * handle. Formula cells transpose their relative references.
   *
   * @param params.range     - The source range whose pattern is continued.
   * @param params.direction - Fill direction (`'down' | 'up' | 'left' | 'right'`).
   * @param params.count     - Number of cells to extend beyond the source
   *                           (`>= 1`).
   *
   * @example
   * // Continue A1:A3 (1,2,3) down four more rows → 4,5,6,7
   * api.fill({ range: { startRowIndex: 0, endRowIndex: 2, startColIndex: 0, endColIndex: 0 }, direction: 'down', count: 4 });
   */
  fill(params: {
    range: CellRange;
    direction: 'down' | 'up' | 'left' | 'right';
    count: number;
  }): void {
    const { range, direction, count } = params;
    if (count < 1) return;
    const src = normalizeRange(range);
    let target: number;
    switch (direction) {
      case 'down':  target = src.endRowIndex + count; break;
      case 'up':    target = src.startRowIndex - count; break;
      case 'right': target = src.endColIndex + count; break;
      case 'left':  target = src.startColIndex - count; break;
      default: return;
    }
    this.ctx.cellSelectionEngine.fillRange(range, direction, target);
  }

  // ──────────────────── Editing ────────────────────

  /**
   * Opens the editor on a cell, as a double-click would.
   *
   * No-op when the row or column does not exist, the cell is not currently
   * rendered, or the column resolves to no editor (`editable: false`, `locked`,
   * or a per-row `editable` predicate returning `false`).
   *
   * @param rowNodeId - Stable row identity.
   * @param colId - Column identity.
   */
  startCellEditing(rowNodeId: string, colId: string): void {
    const row = this.ctx.rowModel.getRowNode(rowNodeId);
    const col = this.ctx.columnModel.getColumn(colId);
    if (!row || !col) return;
    const cellEl = this.ctx.containerEl.querySelector<HTMLElement>(
      `[data-node-id="${rowNodeId}"] [data-col-id="${colId}"]`,
    );
    if (cellEl) this.ctx.editorManager.startEdit({ rowNode: row, colDef: col, cellEl, trigger: 'api' });
  }

  /**
   * Closes the open editor.
   *
   * @param cancel - `true` restores the original value; `false` (default)
   *   validates and commits, exactly as pressing Enter would.
   */
  stopEditing(cancel = false): void {
    this.ctx.editorManager.stopEditing(cancel);
  }

  /**
   * Registers a cell editor under a key, so columns can select it by name.
   *
   * Registering a key that already exists replaces it — which is how an
   * application restyles a built-in (`registerEditor('text', MyTextEditor)`)
   * without the grid needing an override mechanism.
   *
   * Callable at any time: a column already declaring the key picks the editor up
   * on its next edit, which is the hook a lazily-loaded editor bundle uses.
   *
   * @param name - Key used by `ColumnDef.cellEditor`.
   * @param editor - An editor class, or a factory returning a fresh instance.
   *
   * @example
   * ```ts
   * gridApi.registerEditor('currency', CurrencyEditor);
   * // then:  { field: 'total', editable: true, cellEditor: 'currency' }
   * ```
   */
  registerEditor<
    TValue = unknown,
    TData = Record<string, unknown>,
    TParams = Record<string, unknown>,
  >(
    name: string,
    editor: CellEditorConstructor<TValue, TData, TParams> | CellEditorFactory<TValue, TData, TParams>,
  ): void {
    this.ctx.editorRegistry.register(name, editor);
  }

  /**
   * Registers a framework adapter, teaching the grid to build editors out of
   * components it otherwise knows nothing about.
   *
   * The Angular, React and Vue wrappers each call this during setup; a plain
   * application never needs it.
   *
   * @returns Unregister function.
   */
  registerEditorAdapter(adapter: FrameworkEditorAdapter): () => void {
    return this.ctx.editorAdapters.register(adapter);
  }

  /**
   * Registers a named validation rule, usable as `validation: { <name>: config }`
   * on any column.
   *
   * @param name - Rule name.
   * @param factory - Builds the validator from whatever the column declared;
   *   return `null` to mean "this config disables the rule".
   *
   * @example
   * ```ts
   * gridApi.registerValidator('iban', (enabled) =>
   *   enabled === false ? null : ({ value, label }) =>
   *     isValidIban(String(value))
   *       ? { valid: true }
   *       : { valid: false, message: `${label} is not a valid IBAN`, code: 'iban' });
   * // then:  { field: 'account', editable: true, validation: { iban: true } }
   * ```
   */
  registerValidator(name: string, factory: ValidatorFactory): void {
    this.ctx.validationEngine.registerValidator(name, factory);
  }

  /**
   * Runs a column's validation rules against a value without opening an editor.
   *
   * The same engine, rules and ordering a real commit uses, so an API check and
   * an edit can never disagree. Returns a promise only when the column declares
   * an asynchronous rule.
   *
   * @param rowNodeId - Row to validate against (rules may read sibling fields).
   * @param colId - Column whose rules to run.
   * @param value - Candidate value. Defaults to the cell's current value.
   */
  validateCell(
    rowNodeId: string,
    colId: string,
    value?: unknown,
  ): ValidationResult | Promise<ValidationResult> {
    const row = this.ctx.rowModel.getRowNode(rowNodeId);
    const col = this.ctx.columnModel.getColumn(colId);
    if (!row || !col) {
      return { valid: false, message: `Unknown cell ${rowNodeId}/${colId}`, code: 'unknown-cell' };
    }
    const candidate = value === undefined ? getCellValue(row.data, col, this) : value;
    return this.ctx.editorManager.validateValue(row, col, candidate);
  }

  /**
   * Runs the configured row validator (`GridOptions.editing.rowValidator`)
   * against a row.
   *
   * For cross-field rules no single column can express — "end date must be after
   * start date". Returns `{ valid: true }` when no row validator is configured.
   *
   * @param rowNodeId - Row to validate.
   */
  validateRow(
    rowNodeId: string,
  ): ValidationResult | Readonly<Record<string, ValidationResult>>
    | Promise<ValidationResult | Readonly<Record<string, ValidationResult>>> {
    const row = this.ctx.rowModel.getRowNode(rowNodeId);
    if (!row) return { valid: false, message: `Unknown row ${rowNodeId}`, code: 'unknown-row' };
    const validator = this.ctx.editorManager.getConfig().rowValidator;
    if (!validator) return { valid: true };
    return this.ctx.validationEngine.validateRow(row.data, row, validator);
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

  /**
   * Returns the custom detail component instance mounted for `nodeId`'s
   * expanded detail row — the object created from `masterDetail.renderer`.
   *
   * `undefined` when the row is not expanded, its content has not been built
   * yet (still loading, or scrolled outside the render window on first
   * expand), or `masterDetail.renderer` is a plain function rather than a
   * class (a function renderer has no instance to hand back).
   *
   * @example
   * ```ts
   * const detail = api.getDetailComponent('row-42') as OrderDetailComponent | undefined;
   * detail?.scrollToOrder('ORD-1001');
   * ```
   */
  getDetailComponent(nodeId: string): DetailComponent | undefined {
    return this.ctx.renderer.getDetailComponent(nodeId);
  }

  /**
   * Re-resolves `masterDetail.props` for `nodeId`'s mounted detail component
   * and asks it to update in place via `DetailComponent.refresh`. The
   * component is re-created only if it declines.
   *
   * The programmatic twin of `DetailContext.refresh()` — reach for it when the
   * data behind a detail section changed outside the component's knowledge.
   *
   * @returns `true` if a mounted component was refreshed, `false` if the row
   * has no custom detail component currently mounted.
   */
  refreshDetail(nodeId: string): boolean {
    return this.ctx.renderer.refreshDetailComponent(nodeId);
  }

  /**
   * Sets the detail row height (in **content** pixels — the container's own
   * padding is added on top) for `nodeId`, clamped by
   * `masterDetail.detailMinHeight`/`detailMaxHeight`.
   *
   * The programmatic twin of `DetailContext.updateHeight(px)`, for callers
   * that hold a `GridApi` rather than a detail context.
   */
  setDetailHeight(nodeId: string, height: number): void {
    this.ctx.masterDetailEngine.setDetailHeight(nodeId, height + DETAIL_ROW_VERTICAL_CHROME_PX);
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

  /**
   * Async counterpart to {@link submitAICommand}. When a generative provider
   * (e.g. Gemini) is configured via `photonAI.provider`, the prompt is
   * interpreted by the model and the panel streams the reply; otherwise this
   * resolves with the same deterministic result {@link submitAICommand}
   * returns. Never rejects — failures come back as `{ success: false }`.
   */
  submitAICommandAsync(text: string): Promise<PhotonCommandResult> {
    return this.ctx.renderer.submitAICommandAsync(text);
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

  /**
   * Exports the grid as CSV using the original export engine.
   *
   * Unchanged and fully supported. `export('csv')` produces the same document
   * through the pluggable system and additionally honours row/column scope
   * options — prefer it in new code.
   *
   * @param fileName - Base name without the extension.
   */
  exportCsv(fileName?: string): void {
    this.ctx.exportEngine.exportToCsv(
      this.ctx.store.get('visibleRows'),
      this.ctx.columnModel.getVisibleColumns(),
      { fileName: fileName ?? this.ctx.options.exportConfig?.fileName ?? 'export' },
    );
  }

  /**
   * Exports the grid as a SpreadsheetML `.xlsx` file using the original export
   * engine.
   *
   * This writes the legacy XML spreadsheet format, which Excel opens but which
   * is not a real OOXML workbook. For a genuine `.xlsx`, register the SheetJS
   * exporter and call {@link export}`('excel')`.
   *
   * @param fileName - Base name without the extension.
   */
  exportXlsx(fileName?: string): void {
    this.ctx.exportEngine.exportToXlsx(
      this.ctx.store.get('visibleRows'),
      this.ctx.columnModel.getVisibleColumns(),
      { fileName: fileName ?? this.ctx.options.exportConfig?.fileName ?? 'export' },
    );
  }

  /**
   * Exports the grid in any registered format.
   *
   * `'csv'` and `'json'` always work — Photon Grid Core implements them itself.
   * `'excel'` and `'pdf'` require a one-time exporter registration, because the
   * core is zero-dependency by contract and will not bundle `xlsx` or `jspdf`:
   *
   * ```ts
   * import * as XLSX from 'xlsx';
   * import { createExcelExporter } from 'photon-grid-core/export/excel';
   * api.registerExporter('excel', createExcelExporter(XLSX));
   * ```
   *
   * Asking for an unregistered format shows a toast naming the packages to
   * install and rejects with a typed {@link ExportError} — it never fails
   * silently or with an opaque library error.
   *
   * @param format  - `'csv'`, `'json'`, `'excel'`, `'pdf'`, or any registered format.
   * @param options - Per-call options, merged over `GridOptions.export`.
   * @returns Resolves once the file has been produced.
   *
   * @example
   * ```ts
   * await api.export('json', { fileName: 'employees.json', pretty: true });
   * await api.export('excel', { onlySelectedRows: true });
   * await api.export('pdf', { fileName: 'employees.pdf', orientation: 'landscape' });
   * ```
   */
  export(format: ExportFormat, options?: ExportOptions): Promise<void> {
    return this.ctx.exportService.export(format, options);
  }

  /**
   * Registers an exporter for **this grid only**, outranking any global
   * registration for the same format.
   *
   * Use the module-level `registerExporter` instead to enable a format for
   * every grid on the page — the usual choice, made once at app bootstrap.
   *
   * @param format   - The format key, e.g. `'excel'`, `'pdf'`, `'xml'`.
   * @param exporter - The implementation.
   */
  registerExporter(format: ExportFormat, exporter: GridExporter): void {
    this.ctx.exportService.registerExporter(format, exporter);
  }

  /**
   * Removes a grid-local exporter registration, revealing any global one again.
   *
   * @returns `true` when a registration was removed.
   */
  unregisterExporter(format: ExportFormat): boolean {
    return this.ctx.exportService.unregisterExporter(format);
  }

  /** Whether this grid can currently export the format (grid-local, then global). */
  hasExporter(format: ExportFormat): boolean {
    return this.ctx.exportService.hasExporter(format);
  }

  /** Resolves the exporter this grid would use for a format, or `undefined`. */
  getExporter(format: ExportFormat): GridExporter | undefined {
    return this.ctx.exportService.getExporter(format);
  }

  /** Every format this grid can export, sorted. */
  getExportFormats(): ExportFormat[] {
    return this.ctx.exportService.getFormats();
  }

  /**
   * Builds the export payload — columns, headers and normalised cells — without
   * writing a file.
   *
   * The seam for hosts that upload rather than download, and the easiest way to
   * unit-test what an export *would* contain.
   *
   * @param options - The same scope options {@link export} accepts.
   */
  prepareExportData(options?: ExportOptions): PreparedExportData {
    return this.ctx.exportService.prepare(options);
  }

  /** Opens the toolbar's Export dropdown, if the feature is enabled. */
  openExportMenu(): void {
    this.ctx.renderer.openExportMenu();
  }


  // ──────────────────── Import ────────────────────
  /**
   * The grid write/read port handed to the {@link import('../engines/import/import-engine').ImportEngine}.
   * Thin adapter over the public data seams so the engine never touches
   * `GridCore` internals. Lazily built and cached on first import.
   */
  private _importSink: GridImportSink | null = null;

  /** Returns (building once) the import sink over this API. */
  private getImportSink(): GridImportSink {
    if (!this._importSink) {
      this._importSink = {
        getColumns: () => this.ctx.columnModel.getAllColumns(),
        getRowData: () => (this.ctx.store.get('allRows') as RowNode[]).map((r) => r.data),
        setColumns: (defs) => this.setColumns(defs),
        setData: (rows) => this.setData(rows),
        appendData: (rows) => this.appendData(rows),
      };
    }
    return this._importSink;
  }

  /** Merges per-call import options over the grid-level `GridOptions.import` defaults. */
  private resolveImportOptions(options?: ImportOptions): ImportOptions {
    const cfg = this.ctx.options.import;
    return {
      mode: options?.mode ?? cfg?.mode,
      defineColumns: options?.defineColumns ?? cfg?.defineColumns,
      ...options,
    };
  }

  /**
   * Registers the workbook parser used for binary Excel files (e.g. the optional
   * SheetJS adapter). Additive — call once before importing `.xlsx`/`.xls`.
   *
   * @param parser - The parser implementation.
   */
  registerImportParser(parser: WorkbookParser): void {
    this.ctx.importEngine.registerWorkbookParser(parser);
  }

  /**
   * Imports a file, inferring the source from its extension
   * (`.xlsx`/`.xls` → Excel, `.tsv` → TSV, else CSV).
   *
   * @param file    - The file to import.
   * @param options - Optional per-call overrides.
   * @returns The import result.
   */
  importFile(file: File, options?: ImportOptions): Promise<ImportResult> {
    return this.ctx.importEngine.importFile(file, this.getImportSink(), this.resolveImportOptions(options));
  }

  /**
   * Imports a binary Excel workbook. Requires a parser registered via
   * {@link registerImportParser}.
   *
   * @param file    - The `.xlsx`/`.xls` file.
   * @param options - Optional per-call overrides.
   * @returns The import result.
   */
  importExcel(file: File, options?: ImportOptions): Promise<ImportResult> {
    return this.ctx.importEngine.importFileAs(
      file,
      ImportSourceType.Excel,
      this.getImportSink(),
      this.resolveImportOptions(options),
    );
  }

  /**
   * Imports a CSV file.
   *
   * @param file    - The `.csv` file.
   * @param options - Optional per-call overrides.
   * @returns The import result.
   */
  importCsv(file: File, options?: ImportOptions): Promise<ImportResult> {
    return this.ctx.importEngine.importFileAs(
      file,
      ImportSourceType.Csv,
      this.getImportSink(),
      this.resolveImportOptions(options),
    );
  }

  /**
   * Imports a TSV file.
   *
   * @param file    - The `.tsv` file.
   * @param options - Optional per-call overrides.
   * @returns The import result.
   */
  importTsv(file: File, options?: ImportOptions): Promise<ImportResult> {
    return this.ctx.importEngine.importFileAs(
      file,
      ImportSourceType.Tsv,
      this.getImportSink(),
      this.resolveImportOptions(options),
    );
  }

  /**
   * Imports the current clipboard contents (TSV, as emitted by Excel/Sheets).
   *
   * @param options - Optional per-call overrides.
   * @returns The import result.
   */
  importFromClipboard(options?: ImportOptions): Promise<ImportResult> {
    return this.ctx.importEngine.importFromClipboard(this.getImportSink(), this.resolveImportOptions(options));
  }

  /**
   * Imports an already-parsed {@link Workbook} (from a custom importer).
   *
   * @param workbook - The workbook to import.
   * @param options  - Optional per-call overrides.
   * @returns The import result.
   */
  importWorkbook(workbook: Workbook, options?: ImportOptions): Promise<ImportResult> {
    return this.ctx.importEngine.importWorkbook(workbook, this.getImportSink(), this.resolveImportOptions(options));
  }

  // ──────────────────── Toasts ────────────────────

  /**
   * The grid's toast notification service — show transient success/error/
   * warning/info messages.
   *
   * @example
   * ```ts
   * api.toasts.success('Saved!');
   * api.toasts.error('Upload failed', { action: { label: 'Retry', onClick: retry } });
   * ```
   */
  get toasts(): ToastService {
    return this.ctx.toastService;
  }

  // ──────────────────── Clipboard ────────────────────

  copySelectedRowsToClipboard(): Promise<void> {
    const rows = this.getSelectedRows();
    const cols = this.ctx.columnModel.getVisibleColumns();
    // Preserve this API's original behaviour of including a header row.
    return this.ctx.clipboardEngine.copyRowsToClipboard(rows, cols, true);
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

  /**
   * Scrolls the centre region to an absolute horizontal offset, in content
   * pixels.
   *
   * Use {@link ensureColumnVisible} when the target is a column. This is for
   * content whose horizontal extent is not columns -- a plugin timeline
   * scrolling to a date, say -- where the caller has already computed the pixel.
   */
  scrollToX(px: number): void {
    this.ctx.renderer.scrollToX(px);
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

  /**
   * Set the color mode (light/dark). Preserves the active variant.
   */
  setMode(mode: ThemeMode): void {
    this.ctx.themeManager.applyMode(mode, this.ctx.containerEl);
  }

  /**
   * Set (or clear with `'none'`) the cosmetic variant skin. Preserves the
   * active mode.
   */
  setVariant(variant: ThemeVariant | 'none'): void {
    this.ctx.themeManager.applyVariant(variant, this.ctx.containerEl);
  }

  /**
   * @deprecated Use {@link GridApi.setMode} / {@link GridApi.setVariant}.
   * Accepts legacy theme strings (`'dark'`, `'ion'`, `'pg-ion-theme'`, …)
   * and maps them onto the mode/variant axes.
   */
  setTheme(nameOrTheme: string): void {
    this.ctx.themeManager.applyTheme(nameOrTheme, this.ctx.containerEl);
  }

  toggleDarkMode(): void {
    this.ctx.themeManager.toggleDarkMode();
  }

  // ── Icons ──────────────────────────────────────────────────────────────────

  /**
   * Registers host icon overrides and repaints anything already on screen.
   *
   * These sit at the **top** of the resolution stack, so they survive a theme
   * change — a variant's pack can never replace a glyph the application
   * supplied. Names not registered here still follow the active theme.
   *
   * @example
   * ```ts
   * gridApi.registerIcons({ check: '<svg viewBox="0 0 16 16">…</svg>' });
   * ```
   */
  registerIcons(icons: IconSet): void {
    this.ctx.iconRegistry.registerAll(icons);
    this.ctx.iconThemeController.repaint();
  }

  /**
   * Replaces (or clears, with `null`) one variant's icon pack at runtime.
   *
   * Repaints only when that variant is the one currently applied — editing an
   * inactive pack changes nothing on screen until it is selected.
   */
  setVariantIcons(variant: ThemeVariant, icons: IconSet | null): void {
    this.ctx.iconThemeController.setVariantIcons(variant, icons);
  }

  /**
   * Re-renders every registry-drawn icon in the grid and its portaled overlays.
   *
   * An escape hatch: icon swaps that go through {@link registerIcons},
   * {@link setVariantIcons} or {@link setVariant} repaint themselves. Reach for
   * this only after mutating the registry directly.
   *
   * @returns How many icons were repainted.
   */
  repaintIcons(): number {
    return this.ctx.iconThemeController.repaint();
  }

  /**
   * The **AI Theme Engine** — generate, modify, optimize, explain, preview,
   * export and import Photon Grid themes from natural language, constrained to
   * the real design-token registry (never arbitrary CSS). LLM-backed methods
   * require `GridOptions.photonAI.provider`; preview/apply/export/import/history
   * work offline.
   *
   * @example
   * ```ts
   * await gridApi.photonAI.generateTheme({ prompt: 'Create a modern dark dashboard theme', preview: true });
   * await gridApi.photonAI.modifyTheme({ prompt: 'Make the header emerald green', preview: true });
   * await gridApi.photonAI.optimizeTheme({ accessibility: true, preview: true });
   * const json = gridApi.photonAI.exportTheme('json');
   * ```
   * @see {@link PhotonThemeApi}
   */
  get photonAI(): PhotonThemeApi {
    return this.ctx.photonThemeEngine;
  }

  // ──────────────────── Row animation ────────────────────

  /**
   * Enable or disable row animations (sort reorder, filter appear/disappear,
   * group / master-detail expand) at runtime, overriding the initial
   * `GridOptions.animateRows`.
   *
   * @param enabled - `true` to animate, `false` to disable. Defaults to enabled
   *                  when `animateRows` is omitted from the grid options.
   */
  setRowAnimation(enabled: boolean): void {
    this.ctx.renderer.setRowAnimationEnabled(enabled);
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

  // ──────────────────── Range Charts (configurable) ────────────────────

  /**
   * Creates an AG-Grid-style configurable range chart from a cell range and
   * opens its floating panel.
   *
   * @param params - Range, chart type, and optional category/series roles.
   * @returns The new chart id, or an empty string if the range has no numeric data.
   */
  createRangeChart(params: CreateRangeChartParams): string {
    return this.ctx.rangeChartService?.createRangeChart(params) ?? '';
  }

  /** Serializable models for every live range chart (for save / restore). */
  getChartModels(): ChartModel[] {
    return this.ctx.rangeChartService?.getChartModels() ?? [];
  }

  /** Applies a full model to an existing chart (matched by `chartId`). */
  updateChart(model: ChartModel): void {
    this.ctx.rangeChartService?.updateChart(model);
  }

  /** Recreates a chart from a previously saved model, returning its id. */
  restoreChart(model: ChartModel): string {
    return this.ctx.rangeChartService?.restoreChart(model) ?? '';
  }

  /** A data-URL image of a range chart, or null if unknown. */
  getChartImageDataURL(chartId: string, format: 'png' | 'jpeg' = 'png'): string | null {
    return this.ctx.rangeChartService?.getChartImageDataURL(chartId, format) ?? null;
  }

  /** Triggers a browser download of a range chart. */
  downloadChart(chartId: string, format: 'png' | 'jpeg' = 'png'): void {
    this.ctx.rangeChartService?.downloadChart(chartId, format);
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
      chartModels: this.ctx.rangeChartService?.getChartModels() ?? [],
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
    // Restore charts only when the key is present, so partial states leave
    // existing charts untouched. Done after refresh() so linked charts build
    // from the restored rows. Existing charts are cleared first to avoid
    // duplicate ids.
    if (state.chartModels) {
      this.ctx.rangeChartService?.disposeAll();
      for (const model of state.chartModels) this.ctx.rangeChartService?.restoreChart(model);
    }
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

  // ──────────────────── Loading state ────────────────────

  /**
   * Puts the grid into — or takes it out of — its loading state.
   *
   * While loading, the configured indicator (spinner by default, or skeleton
   * placeholder rows) covers the body; the header stays visible and
   * interactive, and row rendering is skipped entirely, so a grid waiting on a
   * fetch costs nothing to paint.
   *
   * Idempotent: setting the value it already has does nothing and emits
   * nothing. Each real transition emits exactly one `LOADING_STARTED` or
   * `LOADING_STOPPED`, whoever caused it.
   *
   * Grids on the Server-Side or Infinite row model drive this flag themselves;
   * calling it manually there will be overwritten by the next fetch.
   *
   * @param loading - `true` to show the loading indicator, `false` to hide it.
   *
   * @example
   * ```ts
   * api.setLoading(true);
   * const rows = await fetchRows();
   * api.setData(rows);
   * api.setLoading(false);
   * ```
   *
   * @see {@link isLoading}
   * @see {@link updateLoadingOverlay}
   */
  setLoading(loading: boolean): void {
    // The store de-duplicates unchanged writes, and `GridCore` watches this key
    // to emit the events and schedule the repaint — so this is the whole
    // implementation, not a shortcut.
    this.ctx.store.set('loading', loading);
  }

  /**
   * Whether the grid is currently in its loading state.
   *
   * @returns `true` while the loading indicator is showing.
   * @see {@link setLoading}
   */
  isLoading(): boolean {
    return this.ctx.store.get('loading');
  }

  /** Shows the loading indicator. Equivalent to `setLoading(true)`. */
  showLoadingOverlay(): void {
    this.setLoading(true);
  }

  /** Hides the loading indicator. Equivalent to `setLoading(false)`. */
  hideLoadingOverlay(): void {
    this.setLoading(false);
  }

  /**
   * The loading overlay configuration currently in force, with every default
   * applied.
   *
   * @returns The resolved configuration.
   * @see {@link updateLoadingOverlay}
   */
  getLoadingOverlayConfig(): ResolvedLoadingOverlayConfig {
    return this.ctx.renderer.getLoadingOverlayConfig();
  }

  /**
   * Changes the loading overlay's appearance at runtime — swapping the spinner
   * for skeleton placeholders mid-session, for example.
   *
   * The patch merges onto the configuration the host originally supplied, so
   * omitted keys fall back to their documented defaults rather than sticking at
   * whatever an earlier patch resolved them to. Repaints immediately when the
   * overlay is on screen.
   *
   * @param config - Partial configuration to merge over the current one.
   *
   * @example
   * ```ts
   * api.updateLoadingOverlay({ indicator: LoadingIndicator.Skeleton });
   * ```
   *
   * @see {@link LoadingOverlayConfig}
   */
  updateLoadingOverlay(config: LoadingOverlayConfig): void {
    this.ctx.renderer.setLoadingOverlayConfig(config);
    if (this.isLoading()) this.ctx.renderer.forceRender();
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

  // ── Formula Engine ─────────────────────────────────────────────────────────

  /**
   * Assigns a formula to a cell (e.g. `"=SUM(A1:A10)"`), recomputes it and
   * everything downstream, and repaints. No-op unless the engine is enabled and
   * the column opted in via `ColumnDef.allowFormula`.
   *
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @param source - The formula source, including the leading `=`.
   */
  setCellFormula(nodeId: string, colId: string, source: string): void {
    const result = this.ctx.formulaEngine.setFormula(nodeId, colId, source);
    this.repaintFormulaChanges(result.changedNodeIds);
  }

  /**
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @returns The cell's formula source (including `=`), or `null` if it has none.
   */
  getCellFormula(nodeId: string, colId: string): string | null {
    return this.ctx.formulaEngine.getFormula(nodeId, colId);
  }

  /**
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @returns `true` when the cell currently holds a formula.
   */
  hasCellFormula(nodeId: string, colId: string): boolean {
    return this.ctx.formulaEngine.hasFormula(nodeId, colId);
  }

  /**
   * Removes a cell's formula (leaving its last computed value) and recomputes
   * dependents.
   *
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @returns `true` if a formula was removed.
   */
  clearCellFormula(nodeId: string, colId: string): boolean {
    const had = this.ctx.formulaEngine.hasFormula(nodeId, colId);
    const result = this.ctx.formulaEngine.removeFormula(nodeId, colId);
    this.repaintFormulaChanges(result.changedNodeIds);
    return had;
  }

  /**
   * Repaints exactly the rows a formula operation recomputed.
   *
   * Formula recomputation writes new values into the existing row *data* objects
   * without swapping the `RowNode` reference, so `refresh()`'s cached-row path
   * (`BodyRenderer.updatePanelRow`) re-stamps row-level attributes but never
   * repaints cell content — the dependents would keep their stale DOM. Evicting
   * the changed rows from the body-render cache forces a full rebuild so their
   * new values render on the next frame; the subsequent `refresh()` re-runs the
   * data pipeline so group aggregations reflect the change too.
   *
   * @param changedNodeIds - Row node ids whose values the engine just changed.
   */
  private repaintFormulaChanges(changedNodeIds: ReadonlySet<string>): void {
    if (changedNodeIds.size === 0) return;
    this.ctx.renderer.invalidateBodyRowsByIds(new Set(changedNodeIds));
    this.refresh();
  }

  /**
   * Recomputes formula cells (volatile cells always; all cells when `force`).
   *
   * @param force - Recompute every formula cell, not just volatile ones.
   */
  recalculateFormulas(force = false): void {
    const result = this.ctx.formulaEngine.recalculate(force);
    this.repaintFormulaChanges(result.changedNodeIds);
  }

  /**
   * Defines (or replaces) a named range usable in formulas, then recalculates.
   *
   * @param name   - The name (case-insensitive).
   * @param target - Its A1-notation target (e.g. `"B1"`, `"A1:C3"`).
   */
  setNamedRange(name: string, target: string): void {
    const result = this.ctx.formulaEngine.setNamedRange(name, target);
    this.repaintFormulaChanges(result.changedNodeIds);
  }

  /**
   * Removes a named range, then recalculates.
   *
   * @param name - The name (case-insensitive).
   */
  removeNamedRange(name: string): void {
    const result = this.ctx.formulaEngine.removeNamedRange(name);
    this.repaintFormulaChanges(result.changedNodeIds);
  }

  /** @returns The registered custom + built-in formula function names. */
  getFormulaFunctionNames(): string[] {
    return this.ctx.formulaEngine.getRegistry().names();
  }

  destroy(): void {
    if (this._txnFlushHandle !== null) {
      cancelAnimationFrame(this._txnFlushHandle);
      this._txnFlushHandle = null;
    }
    this.ctx.renderer.destroy();
    this.ctx.chartEngine.destroyAll();
    this.ctx.cellSelectionEngine.detach();
    this.ctx.dragDropEngine.destroy();
    this.ctx.themeManager.destroy();
    this.ctx.formulaEngine.destroy();
    this.ctx.eventBus.clear();
    this.ctx.store.destroy();
  }

  private applyPipeline(): void {
    // Delegates to the active row-model strategy (client = in-memory pipeline;
    // server = datasource fetch). See RowModelStrategy / ClientRowModel /
    // ServerRowModel.
    this.ctx.rowModelStrategy.buildDisplayedRows();

    // Summaries last: every scope they can read (`all` / `filtered` / `visible`
    // / `selected`) is settled only once the displayed rows have been rebuilt,
    // so computing earlier would total the previous pipeline's output.
    if (this.ctx.options.summary?.autoRefresh !== false) this.computeSummaries();
  }

  // ──────────────────── Container size ────────────────────

  /**
   * Sets the grid container's width.
   *
   * Writes through the same controller the resize handles use, so a
   * programmatic size and a dragged one cannot disagree, and both emit
   * `GRID_RESIZED`. The change propagates to the columns automatically: the
   * scroll controller observes the body panels and re-resolves `flex` widths on
   * the next frame.
   *
   * @param width - A pixel number, any CSS length (`'60%'`, `'40rem'`,
   *                `'calc(100% - 2rem)'`), or `null` to drop the override and
   *                return to the stylesheet's width.
   */
  setGridWidth(width: number | string | null): void {
    this.ctx.renderer.resizeController.setSize({ width });
  }

  /**
   * Sets the grid container's height.
   *
   * @param height - A pixel number, any CSS length, or `null` to drop the override.
   */
  setGridHeight(height: number | string | null): void {
    this.ctx.renderer.resizeController.setSize({ height });
  }

  /**
   * Sets both dimensions in a single write.
   *
   * Preferred over calling {@link setGridWidth} then {@link setGridHeight}:
   * those are two style mutations and two `GRID_RESIZED` events, this is one of
   * each — which matters when a listener persists the size or re-lays out
   * around the grid.
   *
   * @param size - Omitted properties are left unchanged; `null` clears that override.
   */
  setGridSize(size: { width?: number | string | null; height?: number | string | null }): void {
    this.ctx.renderer.resizeController.setSize(size);
  }

  /**
   * @returns The container's current outer size in CSS pixels, measured from
   *          the DOM — so it reflects percentage and `calc()` widths, not just
   *          explicitly set ones.
   */
  getGridSize(): GridSize {
    return this.ctx.renderer.resizeController.getSize();
  }

  /**
   * Drops both size overrides, returning the grid to whatever size its
   * stylesheet and surrounding layout give it.
   *
   * Also clears the margin compensation a top/left handle drag applied, so a
   * reset really does restore the original box rather than leaving the grid
   * offset by however far it was dragged.
   */
  resetGridSize(): void {
    this.ctx.renderer.resizeController.reset();
  }

  /**
   * Turns handle dragging on or off at runtime, keeping the rest of the resize
   * configuration intact.
   *
   * @param enabled - `false` removes the handles; `true` restores them.
   */
  setGridResizeEnabled(enabled: boolean): void {
    this.ctx.renderer.resizeController.setEnabled(enabled);
  }

  /**
   * Merges a patch into the active resize configuration — which handles are
   * shown, the min/max bounds, the snap step — and rebuilds the handles.
   *
   * @param config - Merged over the current configuration.
   */
  updateGridResizeConfig(config: GridResizeConfig): void {
    this.ctx.renderer.resizeController.updateConfig(config);
  }

  /** `true` while the user is dragging a container resize handle. */
  isGridResizing(): boolean {
    return this.ctx.renderer.resizeController.isResizing;
  }

  // ──────────────────── Summary Rows ────────────────────

  /**
   * Recomputes every summary row immediately and repaints the bands.
   *
   * Only needed when `GridOptions.summary.autoRefresh` is `false`, or after
   * mutating row data in place through a path the grid cannot observe (a direct
   * write to a `RowNode.data` object, say). Every ordinary change — data,
   * filters, sorting, grouping, pagination, cell edits, selection — already
   * refreshes summaries on its own.
   */
  refreshSummary(): void {
    this.computeSummaries();
    this.ctx.renderer.scheduleRender();
  }

  /**
   * Returns the most recently computed summary rows.
   *
   * Values are read from the last refresh rather than recomputed, so this is a
   * cheap read that can safely be called from a render loop. Call
   * {@link refreshSummary} first if you need to force a recompute.
   *
   * @param rowId - Restrict the result to one row's snapshot.
   * @returns All snapshots in declaration order, or the single matching one
   *          (`null` when no row has that id).
   */
  getSummary(): readonly SummaryRowSnapshot[];
  getSummary(rowId: string): SummaryRowSnapshot | null;
  getSummary(rowId?: string): readonly SummaryRowSnapshot[] | SummaryRowSnapshot | null {
    return rowId === undefined
      ? this.ctx.summaryModel.getSnapshots()
      : this.ctx.summaryModel.getSnapshot(rowId);
  }

  /**
   * Replaces the entire set of summary row definitions, recomputes, and
   * repaints.
   *
   * Takes permanent ownership of the definitions: a grid that was deriving its
   * summary from `ColumnDef.showSummary` stops doing so, so a later column
   * change can never overwrite what was set here.
   *
   * @param rows - The new definitions. Pass `[]` to remove every summary row.
   */
  setSummaryRows(rows: readonly SummaryRowDef[]): void {
    this.ctx.summaryModel.setRows(rows);
    this.emitSummaryRowsChanged('set', null);
    this.refreshSummary();
  }

  /**
   * Shallow-merges a patch into one summary row definition, recomputes, and
   * repaints.
   *
   * `cells` merges one level deep, so patching a single column's cell leaves
   * every other column's definition intact. The row's `id` is never changed by a
   * patch.
   *
   * @param rowId - Id of the row to patch.
   * @param patch - Properties to overwrite.
   * @returns `true` when a row with that id existed and was updated.
   */
  updateSummaryRow(rowId: string, patch: Partial<SummaryRowDef>): boolean {
    if (!this.ctx.summaryModel.updateRow(rowId, patch)) return false;
    this.emitSummaryRowsChanged('update', rowId);
    this.refreshSummary();
    return true;
  }

  /**
   * Removes one summary row definition, recomputes, and repaints.
   *
   * @param rowId - Id of the row to remove.
   * @returns `true` when a row with that id existed and was removed.
   */
  removeSummaryRow(rowId: string): boolean {
    if (!this.ctx.summaryModel.removeRow(rowId)) return false;
    this.emitSummaryRowsChanged('remove', rowId);
    this.refreshSummary();
    return true;
  }

  /**
   * Registers a named summary aggregation at runtime, resolvable from any
   * cell's `aggregate` / `defaultAggregate` by that name.
   *
   * The counterpart to `GridOptions.summary.aggregations` for functions that are
   * not known at construction time. Does **not** recompute on its own — call
   * {@link refreshSummary}, or register before the rows that use it.
   *
   * @param name - Name to register under. Shadows a built-in of the same name.
   * @param fn   - The reducer. Must be pure.
   */
  registerSummaryAggregation(name: string, fn: SummaryAggregateFn): void {
    this.ctx.summaryAggregationEngine.register(name, fn);
  }

  /**
   * Recomputes summaries and announces the result.
   *
   * `SUMMARY_CHANGED` is emitted only when there is (or was) something to
   * report, so a grid with no summary rows — the vast majority — never emits it
   * despite this running on every single pipeline pass. `_hadSummaries` is what
   * makes the *last* refresh after the rows are removed still fire, so a
   * listener sees the transition to empty.
   */
  private computeSummaries(): void {
    if (this.ctx.options.summary?.enabled === false) {
      if (this._hadSummaries) {
        this._hadSummaries = false;
        this.ctx.summaryModel.setSnapshots([]);
        this.ctx.eventBus.emit(GridEventType.SUMMARY_CHANGED, { summaries: [] });
      }
      return;
    }

    const summaries = this.ctx.summaryService.compute();
    if (summaries.length === 0 && !this._hadSummaries) return;

    this._hadSummaries = summaries.length > 0;
    this.ctx.eventBus.emit(GridEventType.SUMMARY_CHANGED, { summaries });
  }

  /** Announces a change to the summary row *definitions* (not their values). */
  private emitSummaryRowsChanged(action: 'set' | 'update' | 'remove', rowId: string | null): void {
    this.ctx.eventBus.emit(GridEventType.SUMMARY_ROWS_CHANGED, {
      action,
      rowId,
      rowCount: this.ctx.summaryModel.getRows().length,
    });
  }


  undo(): void {
    this.ctx.undoRedoEngine.undo();
    this.refresh();
  }

  redo(): void {
    this.ctx.undoRedoEngine.redo();
    this.refresh();
  }

  getUndoSize(): number {
    return this.ctx.undoRedoEngine.getUndoSize();
  }

  getRedoSize(): number {
    return this.ctx.undoRedoEngine.getRedoSize();
  }

  // ──────────────────── Transactions ────────────────────

  /**
   * Applies an add / update / remove {@link RowTransaction} as a surgical delta
   * against the current data set, then runs the render pipeline once. Unlike
   * {@link setData}, undo history is preserved.
   *
   * Updates are matched to existing rows by `nodeId` (the row's id field), so an
   * update object must carry that identifier to take effect.
   *
   * @param txn - The batch of row mutations to apply.
   * @returns The nodes that were added or updated (removed nodes are detached).
   */ 
  applyTransaction(txn: RowTransaction): RowNode[] {
    const result = this.ctx.rowModel.applyTransaction(txn);
    this.discoverTransactionFormulas(result);
    this.refresh();
    return [...result.add, ...result.update];
  }

  /**
   * Queues a {@link RowTransaction} and flushes all queued transactions together
   * on the next animation frame, coalescing many rapid mutations into a single
   * pipeline run and render — ideal for high-frequency streaming updates.
   *
   * @param txn - The batch of row mutations to enqueue.
   */
  applyTransactionAsync(txn: RowTransaction): void {
    this._pendingTransactions.push(txn);
    if (this._txnFlushHandle !== null) return;

    this._txnFlushHandle = requestAnimationFrame(() => {
      this._txnFlushHandle = null;
      const merged = this.mergeTransactions(this._pendingTransactions);
      this._pendingTransactions = [];
      const result = this.ctx.rowModel.applyTransaction(merged);
      this.discoverTransactionFormulas(result);
      this.refresh();
    });
  }

  /**
   * Runs declarative formula discovery for a transaction's result: purges removed
   * rows, seeds added rows, and re-discovers/recomputes updated rows, then evicts
   * exactly the changed rows so their new values repaint.
   */
  private discoverTransactionFormulas(result: {
    add: RowNode[];
    update: RowNode[];
    remove: RowNode[];
  }): void {
    const init = this.ctx.formulaInitializer;
    const cols = this.ctx.columnModel.getAllColumns();
    const changed = new Set<string>();

    if (result.remove.length > 0) {
      for (const id of init.onRowsRemoved(new Set(result.remove.map((r) => r.nodeId)))) changed.add(id);
    }
    if (result.add.length > 0) {
      for (const id of init.onRowsAdded(cols, result.add)) changed.add(id);
    }
    if (result.update.length > 0) {
      // Field-level diffs aren't retained per row, so recompute each updated row
      // conservatively across all its columns (idempotent for formulas).
      const allFields = cols.map((c) => c.field);
      for (const node of result.update) {
        for (const id of init.onRowDataChanged(cols, node, allFields)) changed.add(id);
      }
    }
    if (changed.size > 0) this.ctx.renderer.invalidateBodyRowsByIds(new Set(changed));
  }

  /** Concatenates several transactions into one, preserving operation order. */
  private mergeTransactions(txns: RowTransaction[]): RowTransaction {
    const add: Record<string, unknown>[] = [];
    const update: Record<string, unknown>[] = [];
    const remove: string[] = [];
    for (const txn of txns) {
      if (txn.add) add.push(...txn.add);
      if (txn.update) update.push(...txn.update);
      if (txn.remove) remove.push(...txn.remove);
    }
    return { add, update, remove };
  }

  // ──────────────────── Node Iteration ────────────────────

  /** Invokes `callback` for every row node in the underlying data set (unfiltered, unsorted). */
  forEachNode(callback: (row: RowNode, index: number) => void): void {
    const rows = this.getAllRows();
    for (let i = 0; i < rows.length; i++) callback(rows[i], i);
  }

  /** Invokes `callback` for every row that passes the current filter model, in data order. */
  forEachNodeAfterFilter(callback: (row: RowNode, index: number) => void): void {
    const columns = this.ctx.columnModel.getAllColumns();
    const filtered = this.ctx.filterEngine.applyFilters(this.getAllRows(), columns);
    for (let i = 0; i < filtered.length; i++) callback(filtered[i], i);
  }

  /** Invokes `callback` for every row after the current filter and sort are applied (before grouping/pagination). */
  forEachNodeAfterFilterAndSort(callback: (row: RowNode, index: number) => void): void {
    const columns = this.ctx.columnModel.getAllColumns();
    let rows = this.ctx.filterEngine.applyFilters(this.getAllRows(), columns);
    rows = this.ctx.sortEngine.applySorting(rows, columns);
    for (let i = 0; i < rows.length; i++) callback(rows[i], i);
  }

  /** The number of rows currently displayed (post filter/sort/group/pagination). */
  getDisplayedRowCount(): number {
    return this.getVisibleRows().length;
  }

  // ──────────────────── Cell Refresh & Flash ────────────────────

  /**
   * Repaints displayed rows from the data model — use after mutating row data
   * in place, where the `visibleRows` reference is unchanged but cell content
   * must be rebuilt.
   *
   * `colIds` is advisory (the renderer repaints whole rows). Passing `force`, or
   * omitting `rowNodes`, clears the entire render cache.
   *
   * @param params - Which rows to repaint and whether to force a full clear.
   */
  refreshCells(params: RefreshCellsParams = {}): void {
    const { rowNodes, force } = params;
    if (force || !rowNodes || rowNodes.length === 0) {
      this.ctx.renderer.invalidateBodyRows();
      return;
    }
    this.ctx.renderer.invalidateBodyRowsByIds(new Set(rowNodes.map((r) => r.nodeId)));
  }

  /**
   * Briefly flashes a highlight over the given cells to draw the user's eye to a
   * change. A purely visual effect — it never mutates data.
   *
   * @param params - Rows/columns to flash and how long the highlight lasts.
   */
  flashCells(params: FlashCellsParams = {}): void {
    const { rowNodes, colIds, flashDelay = 700 } = params;
    const nodes = rowNodes ?? this.getVisibleRows();
    if (nodes.length === 0) return;

    const idSet = new Set(nodes.map((n) => n.nodeId));
    const colSet = colIds && colIds.length > 0 ? new Set(colIds) : null;
    const cells: HTMLElement[] = [];

    // Query by attribute presence and match ids in JS to avoid selector-injection
    // issues with data-derived node ids that may contain quotes or brackets.
    for (const rowEl of this.ctx.containerEl.querySelectorAll<HTMLElement>('[data-node-id]')) {
      if (!idSet.has(rowEl.getAttribute('data-node-id') ?? '')) continue;
      for (const cell of rowEl.querySelectorAll<HTMLElement>('[data-col-id]')) {
        const cid = cell.getAttribute('data-col-id');
        if (colSet && (!cid || !colSet.has(cid))) continue;
        cells.push(cell);
      }
    }

    for (const el of cells) {
      el.classList.remove('pg-cell--flash');
      void el.offsetWidth; // force reflow so the animation restarts if re-triggered
      el.classList.add('pg-cell--flash');
    }
    if (cells.length > 0) {
      setTimeout(() => {
        for (const el of cells) el.classList.remove('pg-cell--flash');
      }, flashDelay);
    }
  }

  // ──────────────────── Column Sizing & Layout ────────────────────

  /**
   * Resizes all visible columns to exactly fill the available width, clamped to
   * each column's min/max. Defaults to the grid container's current width.
   *
   * @param containerWidth - Target width in pixels; defaults to the container width.
   */
  sizeColumnsToFit(containerWidth?: number): void {
    const width = containerWidth ?? this.ctx.containerEl.clientWidth;
    this.ctx.columnModel.sizeColumnsToFit(width);
    this.refresh();
  }

  /** Restores columns (width, visibility, pin, sort, order) to their initial state. */
  resetColumnState(): void {
    this.ctx.columnModel.resetColumnState();
    this.refresh();
  }

  /**
   * Shows or hides several columns in one call.
   *
   * @param colIds  - Ids of the columns to update.
   * @param visible - `true` to show, `false` to hide.
   */
  setColumnsVisible(colIds: string[], visible: boolean): void {
    for (const colId of colIds) this.ctx.columnModel.setColumnVisible(colId, visible);
    this.refresh();
  }

  /**
   * Moves a block of columns so they sit consecutively at `toIndex` within the
   * visible-column order. The batch counterpart to {@link moveColumn}.
   *
   * @param colIds  - Ids of the columns to move, in target order.
   * @param toIndex - Insertion index among the remaining visible columns.
   */
  moveColumns(colIds: string[], toIndex: number): void {
    this.ctx.columnModel.moveColumns(colIds, toIndex);
    this.refresh();
  }

  // ──────────────────── Multi-Sort ────────────────────

  /**
   * Applies a multi-column sort, replacing any existing sort configuration.
   *
   * @param configs - Ordered sort descriptors (primary → secondary → …).
   */
  multiSort(configs: SortConfig[]): void {
    this.ctx.sortEngine.multiSort(configs);
    this.refresh();
  }

  // ──────────────────── Focused Cell ────────────────────

  /**
   * Focuses (and starts a single-cell selection at) the cell at `rowIndex` in
   * the given column, scrolling it into view. A no-op if the column is hidden
   * or unknown.
   *
   * @param rowIndex - Index into the current `visibleRows`.
   * @param colId    - Id of the target column.
   */
  setFocusedCell(rowIndex: number, colId: string): void {
    const colIndex = this.ctx.columnModel.getVisibleColumns().findIndex((c) => c.colId === colId);
    if (colIndex < 0) return;
    this.ctx.cellSelectionEngine.startSelection(rowIndex, colIndex);
  }

  /** The currently focused cell as `{ rowIndex, colId }`, or `null` when none is focused. */
  getFocusedCell(): { rowIndex: number; colId: string } | null {
    const active = this.ctx.store.get('activeCell');
    if (!active) return null;
    const col = this.ctx.columnModel.getVisibleColumns()[active.colIndex];
    if (!col) return null;
    return { rowIndex: active.rowIndex, colId: col.colId };
  }

  // ──────────────────── Ensure Visible ────────────────────

  /**
   * Scrolls the row with `nodeId` into view. A no-op if the row is not currently
   * displayed (e.g. filtered out or on another page).
   *
   * @param nodeId   - The row's node id.
   * @param position - Where to place the row; omit for the minimal scroll.
   */
  ensureNodeVisible(nodeId: string, position?: RowVerticalScrollPosition): void {
    // Optional-chained because a demand-loading row model publishes a sparse
    // array; an index outside the loaded window simply holds nothing.
    const rowIndex = this.getVisibleRows().findIndex((r) => r?.nodeId === nodeId);
    if (rowIndex < 0) return;
    this.ctx.renderer.ensureRowVisible(rowIndex, position);
  }

  /**
   * Scrolls the row at a display index into view.
   *
   * Unlike {@link ensureNodeVisible} this needs no loaded row, so it is the way
   * to jump anywhere in an infinite-scrolling grid: the target position is
   * derived from the index, and the pages covering it load once they are on
   * screen.
   *
   * @param rowIndex - Display index, 0-based. Out-of-range values are ignored.
   * @param position - Where to place the row; omit for the minimal scroll.
   */
  ensureIndexVisible(rowIndex: number, position?: RowVerticalScrollPosition): void {
    if (rowIndex < 0 || rowIndex >= this.getVisibleRows().length) return;
    this.ctx.renderer.ensureRowVisible(rowIndex, position);
  }

  /** Scrolls the given center column horizontally into view (pinned columns are always visible). */
  ensureColumnVisible(colId: string): void {
    this.ctx.renderer.ensureColumnVisible(colId);
  }

  // ──────────────────── Filter State ────────────────────

  /** Whether any column filter or the quick filter is currently active. */
  isAnyFilterActive(): boolean {
    return this.ctx.filterEngine.hasActiveFilters();
  }

  /** Whether the given column has an active filter. */
  isColumnFilterActive(colId: string): boolean {
    return this.ctx.filterEngine.isColumnFiltered(colId);
  }

  // ──────────────────── Batch Selection ────────────────────

  /** Selects several rows in one operation (single `ROW_SELECTED` emission). */
  selectRows(nodeIds: string[]): void {
    this.ctx.rowSelectionEngine.selectRows(nodeIds, this.getVisibleRows());
  }

  /** Deselects several rows in one operation (single `ROW_DESELECTED` emission). */
  deselectRows(nodeIds: string[]): void {
    this.ctx.rowSelectionEngine.deselectRows(nodeIds, this.getVisibleRows());
  }

  /**
   * Selects rows by their **display index** (0-based, into the currently
   * displayed rows after filter/sort/group/pagination). Indices out of range or
   * pointing at non-data rows (group headers, detail rows) are ignored.
   *
   * @param indexes - Zero-based display indices to select.
   */
  selectRowsByIndex(indexes: number[]): void {
    const visible = this.getVisibleRows();
    const ids: string[] = [];
    for (const i of indexes) {
      const row = visible[i];
      if (row && row.type === 'data') ids.push(row.nodeId);
    }
    if (ids.length > 0) this.ctx.rowSelectionEngine.selectRows(ids, visible);
  }

  /**
   * Selects a contiguous, inclusive block of rows between two **display
   * indices** (0-based, order-independent). Non-data rows in the span are
   * skipped. Only meaningful in `multiple` selection mode.
   *
   * @param fromIndex - One end of the range (inclusive).
   * @param toIndex   - The other end of the range (inclusive).
   */
  selectRowRange(fromIndex: number, toIndex: number): void {
    this.ctx.rowSelectionEngine.selectRange(fromIndex, toIndex, this.getVisibleRows());
  }

  /**
   * Selects every data row for which `predicate` returns `true`. The predicate
   * is evaluated against all rows, so rows outside the current page/filter can
   * still be selected.
   *
   * @param predicate - Returns `true` for rows that should be selected.
   */
  selectRowsByFilter(predicate: (row: RowNode) => boolean): void {
    const nodeIds = this.getAllRows()
      .filter((r) => r.type === 'data' && predicate(r))
      .map((r) => r.nodeId);
    this.ctx.rowSelectionEngine.selectRows(nodeIds, this.getVisibleRows());
  }

  /**
   * Selects every data row whose value in `colId` satisfies `filter`, **without
   * hiding** the non-matching rows (unlike {@link setColumnFilter}). This is the
   * programmatic counterpart to Photon AI's "select all rows where …" — the
   * matching rows are highlighted while the full data set stays visible.
   *
   * Matching reuses the grid's own filter-operator logic, so every operator a
   * column filter supports (contains, greaterThan, inRange, before, …) works
   * here too. Rows on other pages or currently filtered out can still match.
   *
   * @param colId  - Id of the column to test.
   * @param filter - The column filter (operator + typed value) to evaluate.
   * @returns The number of rows selected.
   */
  selectRowsMatchingFilter(colId: string, filter: ColumnFilter): number {
    const col = this.ctx.columnModel.getColumn(colId);
    if (!col) return 0;
    const ids = this.getAllRows()
      .filter((r) => r.type === 'data' && this.ctx.filterEngine.matchesColumnFilter(r, filter, col))
      .map((r) => r.nodeId);
    if (ids.length > 0) this.ctx.rowSelectionEngine.selectRows(ids, this.getVisibleRows());
    return ids.length;
  }

  // ──────────────────── Row Grouping ────────────────────

  /**
   * Sets the exact set (and order) of row-group columns, replacing any existing
   * grouping.
   *
   * @param colIds - Column ids to group by, outermost first. Empty clears grouping.
   */
  setRowGroupColumns(colIds: string[]): void {
    this.ctx.groupingEngine.reorderGroupColumns(colIds);
    this.refresh();
  }

  /** Whether the group with the given key is currently expanded. */
  isGroupExpanded(groupKey: string): boolean {
    return this.ctx.groupingEngine.isGroupExpanded(groupKey);
  }

  // ──────────────────── Grid State Reset ────────────────────

  /**
   * Resets the grid to its initial state: clears sort, filters, grouping, row
   * and cell selection, returns to the first page, and restores the original
   * column layout. Row data itself is left untouched.
   */
  resetGridState(): void {
    this.ctx.sortEngine.clearSort();
    this.ctx.columnModel.clearAllSort();
    this.ctx.filterEngine.clearAllFilters();
    this.ctx.groupingEngine.clearGrouping();
    this.ctx.rowSelectionEngine.deselectAll(this.getVisibleRows());
    this.ctx.cellSelectionEngine.clearSelection();
    this.ctx.paginationEngine.goToPage(1);
    this.ctx.columnModel.resetColumnState();
    this.refresh();
  }
}
