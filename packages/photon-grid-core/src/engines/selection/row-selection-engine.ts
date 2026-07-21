import type { RowNode } from '../../types/row.types';
import type { SelectionConfig } from '../../types/grid.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import { GridEventType } from '../../types/event.types';

export class RowSelectionEngine {
  private config: SelectionConfig = {
    mode: 'multiple',
    checkboxSelection: true,
    selectAllOnHeaderClick: true,
    headerCheckbox: true,
    suppressRowDeselection: false,
    serialColumnSelection: false,
  };

  // ── Serial-column drag state ──────────────────────────────────────────────
  /** Row index the current drag/range anchors from; null when idle. */
  private dragAnchorIndex: number | null = null;
  /**
   * Selection that existed when a Ctrl/Cmd drag began. The live range is unioned
   * onto this each `extendRowDrag`, so a modifier-drag adds to the prior
   * selection while a plain drag (empty base) replaces it.
   */
  private dragBaseIds = new Set<string>();
  private _isRowDragging = false;

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
  ) {}

  configure(config: Partial<SelectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Whether the serial column is configured to drive row selection. */
  get serialColumnSelection(): boolean {
    return this.config.serialColumnSelection && this.config.mode !== 'none';
  }

  /** Whether a serial-column drag selection is in progress. */
  get isRowDragging(): boolean {
    return this._isRowDragging;
  }

  selectRow(nodeId: string, rows: RowNode[]): void {
    if (this.config.mode === 'none') return;

    const selectedIds = new Set(this.store.get('selectedRowIds'));

    if (this.config.mode === 'single') {
      selectedIds.clear();
      selectedIds.add(nodeId);
    } else {
      selectedIds.add(nodeId);
    }

    this.applySelectionToRows(rows, selectedIds);
    this.store.set('selectedRowIds', selectedIds);
    this.updateSelectionState(rows, selectedIds);

    const selectedRows = rows.filter((r) => selectedIds.has(r.nodeId));
    this.eventBus.emit(GridEventType.ROW_SELECTED, {
      rows: selectedRows,
      selectedCount: selectedIds.size,
      isAllSelected: this.isAllSelected(rows, selectedIds),
    });
  }

  deselectRow(nodeId: string, rows: RowNode[]): void {
    if (this.config.suppressRowDeselection) return;

    const selectedIds = new Set(this.store.get('selectedRowIds'));
    selectedIds.delete(nodeId);

    this.applySelectionToRows(rows, selectedIds);
    this.store.set('selectedRowIds', selectedIds);
    this.updateSelectionState(rows, selectedIds);

    const selectedRows = rows.filter((r) => selectedIds.has(r.nodeId));
    this.eventBus.emit(GridEventType.ROW_DESELECTED, {
      rows: selectedRows,
      selectedCount: selectedIds.size,
      isAllSelected: false,
    });
  }

  toggleRowSelection(nodeId: string, rows: RowNode[]): void {
    const selectedIds = this.store.get('selectedRowIds');
    if (selectedIds.has(nodeId)) {
      this.deselectRow(nodeId, rows);
    } else {
      this.selectRow(nodeId, rows);
    }
  }

  selectRows(nodeIds: string[], rows: RowNode[]): void {
    if (this.config.mode === 'none') return;
    const selectedIds = this.config.mode === 'single'
      ? new Set([nodeIds[nodeIds.length - 1]])
      : new Set([...this.store.get('selectedRowIds'), ...nodeIds]);

    this.applySelectionToRows(rows, selectedIds);
    this.store.set('selectedRowIds', selectedIds);
    this.updateSelectionState(rows, selectedIds);

    const selectedRows = rows.filter((r) => selectedIds.has(r.nodeId));
    this.eventBus.emit(GridEventType.ROW_SELECTED, {
      rows: selectedRows,
      selectedCount: selectedIds.size,
      isAllSelected: this.isAllSelected(rows, selectedIds),
    });
  }

  /**
   * Deselects several rows in one operation, emitting a single
   * `ROW_DESELECTED` event rather than one per id. Mirrors {@link selectRows}.
   * Honors `suppressRowDeselection`.
   *
   * @param nodeIds - Node ids to remove from the selection.
   * @param rows    - The current row set used to recompute selection flags/state.
   */
  deselectRows(nodeIds: string[], rows: RowNode[]): void {
    if (this.config.suppressRowDeselection) return;

    const selectedIds = new Set(this.store.get('selectedRowIds'));
    for (const id of nodeIds) selectedIds.delete(id);

    this.applySelectionToRows(rows, selectedIds);
    this.store.set('selectedRowIds', selectedIds);
    this.updateSelectionState(rows, selectedIds);

    const selectedRows = rows.filter((r) => selectedIds.has(r.nodeId));
    this.eventBus.emit(GridEventType.ROW_DESELECTED, {
      rows: selectedRows,
      selectedCount: selectedIds.size,
      isAllSelected: false,
    });
  }

  selectAll(rows: RowNode[]): void {
    if (this.config.mode !== 'multiple') return;
    const dataRows = rows.filter((r) => r.type === 'data');
    const selectedIds = new Set(dataRows.map((r) => r.nodeId));

    this.applySelectionToRows(rows, selectedIds);
    this.store.set('selectedRowIds', selectedIds);
    this.store.set('isAllSelected', true);
    this.store.set('isIndeterminate', false);

    this.eventBus.emit(GridEventType.ALL_ROWS_SELECTED, {
      rows: dataRows,
      selectedCount: selectedIds.size,
      isAllSelected: true,
    });
  }

  deselectAll(rows: RowNode[]): void {
    const emptySet = new Set<string>();
    this.applySelectionToRows(rows, emptySet);
    this.store.set('selectedRowIds', emptySet);
    this.store.set('isAllSelected', false);
    this.store.set('isIndeterminate', false);

    this.eventBus.emit(GridEventType.ALL_ROWS_DESELECTED, {
      rows: [],
      selectedCount: 0,
      isAllSelected: false,
    });
  }

  selectRange(fromIndex: number, toIndex: number, rows: RowNode[]): void {
    if (this.config.mode !== 'multiple') return;
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const rangeIds = rows
      .filter((r) => r.type === 'data' && r.rowIndex >= start && r.rowIndex <= end)
      .map((r) => r.nodeId);
    this.selectRows(rangeIds, rows);
  }

  // ── Serial-column drag selection ──────────────────────────────────────────

  /**
   * Begin a serial-column drag/range selection at `rowIndex`.
   *
   * - **Shift** (with an existing anchor): replace the selection with the range
   *   anchor→rowIndex; the anchor is preserved for further shift-clicks.
   * - **Ctrl/Cmd**: toggle this row while preserving the rest — that becomes the
   *   drag "base" onto which the live range is unioned.
   * - **Plain**: replace the selection with just this row.
   *
   * The pointer wiring in `GridRenderer` then feeds {@link extendRowDrag} on
   * move and {@link endRowDrag} on release.
   */
  beginRowDrag(
    rowIndex: number,
    nodeId: string,
    rows: RowNode[],
    mods: { ctrl: boolean; shift: boolean },
  ): void {
    if (this.config.mode === 'none') return;

    if (this.config.mode === 'single') {
      // Single-select: modifiers are meaningless — select just this row.
      this.setSelection(new Set([nodeId]), rows);
      this.dragAnchorIndex = rowIndex;
      this.dragBaseIds = new Set();
      this._isRowDragging = true;
      return;
    }

    if (mods.shift && this.dragAnchorIndex !== null) {
      this.dragBaseIds = new Set();
      this.setSelection(new Set(this.rangeIds(this.dragAnchorIndex, rowIndex, rows)), rows);
    } else if (mods.ctrl) {
      const current = new Set(this.store.get('selectedRowIds'));
      if (current.has(nodeId)) current.delete(nodeId);
      else current.add(nodeId);
      this.dragBaseIds = new Set(current);
      this.dragAnchorIndex = rowIndex;
      this.setSelection(current, rows);
    } else {
      this.dragBaseIds = new Set();
      this.dragAnchorIndex = rowIndex;
      this.setSelection(new Set([nodeId]), rows);
    }
    this._isRowDragging = true;
  }

  /** Extend an in-progress drag to `rowIndex` (drag base ∪ live range). */
  extendRowDrag(rowIndex: number, rows: RowNode[]): void {
    if (!this._isRowDragging || this.dragAnchorIndex === null) return;
    if (this.config.mode !== 'multiple') return;
    const ids = new Set(this.dragBaseIds);
    for (const id of this.rangeIds(this.dragAnchorIndex, rowIndex, rows)) ids.add(id);
    this.setSelection(ids, rows);
  }

  /** End the current serial-column drag (selection is left intact). */
  endRowDrag(): void {
    this._isRowDragging = false;
  }

  /** Node ids of `data` rows whose `rowIndex` falls within `[a, b]` inclusive. */
  private rangeIds(a: number, b: number, rows: RowNode[]): string[] {
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    return rows
      .filter((r) => r.type === 'data' && r.rowIndex >= start && r.rowIndex <= end)
      .map((r) => r.nodeId);
  }

  /**
   * Replace the selection with exactly `selectedIds`, apply per-row flags,
   * refresh all/indeterminate state and emit `ROW_SELECTED`. Shared by the
   * drag path; {@link selectRows} keeps its additive (union) semantics.
   */
  private setSelection(selectedIds: Set<string>, rows: RowNode[]): void {
    this.applySelectionToRows(rows, selectedIds);
    this.store.set('selectedRowIds', selectedIds);
    this.updateSelectionState(rows, selectedIds);
    const selectedRows = rows.filter((r) => selectedIds.has(r.nodeId));
    this.eventBus.emit(GridEventType.ROW_SELECTED, {
      rows: selectedRows,
      selectedCount: selectedIds.size,
      isAllSelected: this.isAllSelected(rows, selectedIds),
    });
  }

  isRowSelected(nodeId: string): boolean {
    return this.store.get('selectedRowIds').has(nodeId);
  }

  getSelectedRows(rows: RowNode[]): RowNode[] {
    const selectedIds = this.store.get('selectedRowIds');
    return rows.filter((r) => selectedIds.has(r.nodeId));
  }

  getSelectedCount(): number {
    return this.store.get('selectedRowIds').size;
  }

  clearSelection(rows: RowNode[]): void {
    this.deselectAll(rows);
  }

  private isAllSelected(rows: RowNode[], selectedIds: Set<string>): boolean {
    const dataRows = rows.filter((r) => r.type === 'data');
    return dataRows.length > 0 && dataRows.every((r) => selectedIds.has(r.nodeId));
  }

  private updateSelectionState(rows: RowNode[], selectedIds: Set<string>): void {
    const dataRows = rows.filter((r) => r.type === 'data');
    const allSelected = dataRows.length > 0 && dataRows.every((r) => selectedIds.has(r.nodeId));
    const someSelected = !allSelected && dataRows.some((r) => selectedIds.has(r.nodeId));
    this.store.set('isAllSelected', allSelected);
    this.store.set('isIndeterminate', someSelected);
  }

  private applySelectionToRows(rows: RowNode[], selectedIds: Set<string>): void {
    for (const row of rows) {
      row.selected = selectedIds.has(row.nodeId);
    }
  }
}
