import type { ColumnDef, ColumnState, ColumnPinPosition } from '../types/column.types';
import type { GridStore } from './grid-store';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';

export class ColumnModel {
  private columns: ColumnDef[] = [];

  /**
   * Snapshot of the column state captured at the last {@link initColumns} call,
   * so {@link resetColumnState} can restore the original widths, visibility,
   * pin positions, sort, and order after the user has rearranged the grid.
   */
  private initialColumnStates: ColumnState[] = [];

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
  ) {}

  initColumns(defs: ColumnDef[]): void {
    this.columns = defs.map((col, i) => this.normalizeColumn(col, i));
    this.rebuildPinnedSections();
    this.store.set('columns', this.columns);
    // Capture the pristine layout so it can be restored via resetColumnState().
    this.initialColumnStates = this.getColumnStates();
    this.emitStatesChanged();
  }

  getColumn(colId: string): ColumnDef | undefined {
    return this.columns.find((c) => c.colId === colId);
  }

  getAllColumns(): ColumnDef[] {
    return this.columns;
  }

  getVisibleColumns(): ColumnDef[] {
    return this.columns.filter((c) => c.visible !== false);
  }

  setColumnWidth(colId: string, width: number, finished = false): void {
    const col = this.getColumn(colId);
    if (!col) return;
    const min = col.minWidth ?? 40;
    const max = col.maxWidth ?? Infinity;
    col.width = Math.min(max, Math.max(min, width));
    this.store.set('columns', [...this.columns]);
    this.eventBus.emit(GridEventType.COLUMN_RESIZED, { colDef: col, newWidth: col.width, finished });
    if (finished) this.emitStatesChanged();
  }

  setColumnVisible(colId: string, visible: boolean): void {
    const col = this.getColumn(colId);
    if (!col || col.alwaysVisible) return;
    col.visible = visible;
    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.eventBus.emit(GridEventType.COLUMN_VISIBLE, { colDef: col, visible });
    this.emitStatesChanged();
  }

  setColumnPin(colId: string, pinned: ColumnPinPosition): void {
    const col = this.getColumn(colId);
    if (!col) return;
    col.pinned = pinned;
    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.eventBus.emit(GridEventType.COLUMN_PINNED, { colDef: col, pinned });
    this.emitStatesChanged();
  }

  moveColumn(fromIndex: number, toIndex: number): void {
    const visibleCols = this.getVisibleColumns();
    if (
      fromIndex < 0 ||
      fromIndex >= visibleCols.length ||
      toIndex < 0 ||
      toIndex >= visibleCols.length
    )
      return;

    const moving = visibleCols[fromIndex];
    visibleCols.splice(fromIndex, 1);
    visibleCols.splice(toIndex, 0, moving);

    this.columns = this.syncColumnOrder(visibleCols);
    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.eventBus.emit(GridEventType.COLUMN_MOVED, { colDef: moving, fromIndex, toIndex });
    this.emitStatesChanged();
  }

  /** Move a column to a different panel (changing its pinned state) and insert it at a specific position. */
  moveAndPin(colId: string, newPin: ColumnPinPosition, insertBeforeColId: string | null): void {
    const col = this.getColumn(colId);
    if (!col) return;
    col.pinned = newPin;

    const visibleCols = this.getVisibleColumns();
    const fromIdx = visibleCols.findIndex((c) => c.colId === colId);
    if (fromIdx === -1) {
      this.rebuildPinnedSections();
      this.store.set('columns', [...this.columns]);
      return;
    }

    let toIdx: number;
    if (insertBeforeColId) {
      toIdx = visibleCols.findIndex((c) => c.colId === insertBeforeColId);
      if (toIdx === -1) toIdx = visibleCols.length;
    } else {
      const lastInPanel = [...visibleCols].reverse().find(
        (c) => (c.pinned ?? null) === (newPin ?? null) && c.colId !== colId,
      );
      toIdx = lastInPanel ? visibleCols.findIndex((c) => c.colId === lastInPanel.colId) + 1 : visibleCols.length;
    }

    visibleCols.splice(fromIdx, 1);
    const adjustedTo = Math.min(fromIdx < toIdx ? toIdx - 1 : toIdx, visibleCols.length);
    visibleCols.splice(adjustedTo, 0, col);

    this.columns = this.syncColumnOrder(visibleCols);
    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.eventBus.emit(GridEventType.COLUMN_MOVED, { colDef: col, fromIndex: fromIdx, toIndex: adjustedTo });
    this.eventBus.emit(GridEventType.COLUMN_PINNED, { colDef: col, pinned: newPin });
    this.emitStatesChanged();
  }

  setColumnSort(colId: string, order: 'asc' | 'desc' | null): void {
    for (const col of this.columns) {
      col.sortOrder = col.colId === colId ? order : null;
    }
    this.store.set('columns', [...this.columns]);
    const col = this.getColumn(colId);
    if (col) {
      this.eventBus.emit(GridEventType.COLUMN_SORTED, { colId, field: col.field, order });
    }
  }

  /** Clears the sort indicator from every column (the header-arrow counterpart to `SortEngine.clearSort`). */
  clearAllSort(): void {
    for (const col of this.columns) col.sortOrder = null;
    this.store.set('columns', [...this.columns]);
    this.eventBus.emit(GridEventType.COLUMN_SORTED, { colId: '', field: '', order: null });
  }

  autoSizeColumn(colId: string, containerEl: HTMLElement): void {
    const col = this.getColumn(colId);
    if (!col) return;

    const measurer = containerEl.ownerDocument.createElement('span');
    measurer.style.cssText =
      'position:absolute;visibility:hidden;white-space:nowrap;font-size:inherit;padding:0 12px;pointer-events:none;';
    containerEl.appendChild(measurer);

    measurer.textContent = col.header;
    let maxWidth = measurer.offsetWidth + 24;

    const cells = containerEl.querySelectorAll<HTMLElement>(`[data-col-id="${colId}"]`);
    for (const cell of Array.from(cells)) {
      measurer.textContent = cell.textContent ?? '';
      maxWidth = Math.max(maxWidth, measurer.offsetWidth + 24);
    }

    containerEl.removeChild(measurer);
    this.setColumnWidth(colId, maxWidth, true);
    this.eventBus.emit(GridEventType.COLUMN_AUTOSIZE, { colId, newWidth: maxWidth });
  }

  /**
   * Reorders a block of columns so they sit consecutively starting at
   * `toIndex` within the visible-column order, preserving their relative order.
   * Hidden columns keep their positions. The batch equivalent of
   * {@link moveColumn} (which moves a single column by index).
   *
   * @param colIds  - Ids of the columns to move, in the order they should end up.
   * @param toIndex - Target insertion index in the remaining visible columns.
   */
  moveColumns(colIds: string[], toIndex: number): void {
    const visibleCols = this.getVisibleColumns();
    const movingSet = new Set(colIds);
    // Collect movers in the requested order (skip unknown/hidden ids).
    const moving = colIds
      .map((id) => visibleCols.find((c) => c.colId === id))
      .filter((c): c is ColumnDef => !!c);
    if (moving.length === 0) return;

    const remaining = visibleCols.filter((c) => !movingSet.has(c.colId));
    const clampedTo = Math.max(0, Math.min(toIndex, remaining.length));
    const reordered = [...remaining.slice(0, clampedTo), ...moving, ...remaining.slice(clampedTo)];

    this.columns = this.syncColumnOrder(reordered);
    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
  }

  /**
   * Distributes `availableWidth` proportionally across all visible columns so
   * they exactly fill the given width, clamping each to its `minWidth`/`maxWidth`.
   * Any rounding remainder is absorbed by the last column (also clamped).
   *
   * @param availableWidth - Target total width, in pixels (typically the grid
   *                         viewport width). No-op when non-positive.
   */
  sizeColumnsToFit(availableWidth: number): void {
    const cols = this.getVisibleColumns();
    if (cols.length === 0 || availableWidth <= 0) return;

    const totalWidth = cols.reduce((sum, c) => sum + (c.width ?? 150), 0) || 1;

    let allocated = 0;
    for (const col of cols) {
      const min = col.minWidth ?? 40;
      const max = col.maxWidth ?? Infinity;
      const proportional = Math.round(((col.width ?? 150) / totalWidth) * availableWidth);
      col.width = Math.min(max, Math.max(min, proportional));
      allocated += col.width;
    }

    // Absorb any rounding/clamping drift into the last column.
    const diff = availableWidth - allocated;
    if (diff !== 0) {
      const last = cols[cols.length - 1];
      const min = last.minWidth ?? 40;
      const max = last.maxWidth ?? Infinity;
      last.width = Math.min(max, Math.max(min, (last.width ?? 150) + diff));
    }

    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
  }

  /**
   * Restores every column's width, visibility, pin position, sort, and order to
   * the snapshot captured at the last {@link initColumns} call — the counterpart
   * to a user having resized/hidden/reordered columns.
   */
  resetColumnState(): void {
    if (this.initialColumnStates.length === 0) return;
    this.applyColumnStates(this.initialColumnStates);
  }

  applyColumnStates(states: ColumnState[]): void {
    const stateMap = new Map(states.map((s) => [s.colId, s]));
    for (const col of this.columns) {
      const state = stateMap.get(col.colId);
      if (!state) continue;
      col.width = state.width;
      col.visible = state.visible;
      col.pinned = state.pinned;
      col.sortOrder = state.sortOrder;
    }
    this.columns.sort((a, b) => {
      const ai = stateMap.get(a.colId)?.index ?? 9999;
      const bi = stateMap.get(b.colId)?.index ?? 9999;
      return ai - bi;
    });
    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
  }

  getColumnStates(): ColumnState[] {
    return this.columns.map((col, index) => ({
      colId: col.colId,
      width: col.width ?? 150,
      visible: col.visible !== false,
      pinned: col.pinned ?? null,
      sortOrder: col.sortOrder ?? null,
      index,
    }));
  }

  private rebuildPinnedSections(): void {
    const visible = this.columns.filter((c) => c.visible !== false);
    this.store.set(
      'pinnedLeftColumns',
      visible.filter((c) => c.pinned === 'left'),
    );
    this.store.set(
      'pinnedRightColumns',
      visible.filter((c) => c.pinned === 'right'),
    );
    this.store.set(
      'centerColumns',
      visible.filter((c) => !c.pinned),
    );
  }

  private syncColumnOrder(orderedVisible: ColumnDef[]): ColumnDef[] {
    const hiddenCols = this.columns.filter((c) => c.visible === false);
    return [...orderedVisible, ...hiddenCols];
  }

  private normalizeColumn(col: ColumnDef, index: number): ColumnDef {
    return {
      width: 150,
      minWidth: 40,
      visible: true,
      sortable: true,
      filterable: true,
      resizable: true,
      draggable: true,
      editable: false,
      groupable: false,
      sortOrder: null,
      filterActive: false,
      ...col,
      colId: col.colId ?? `col_${col.field}_${index}`,
    };
  }

  private emitStatesChanged(): void {
    this.eventBus.emit(GridEventType.COLUMNS_STATE_CHANGED, {
      states: this.getColumnStates(),
    });
  }
}
