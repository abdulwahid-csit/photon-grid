import type { ColumnDef, ColumnDefInput, Column, ColumnState, ColumnPinPosition, AggFunc } from '../types/column.types';
import type { GridStore } from './grid-store';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';

/**
 * Orders the three column panels the way they are rendered: pinned-left, then
 * unpinned, then pinned-right.
 *
 * Used to find where a newly-pinned column belongs in the logical column order
 * when no explicit drop target was given. Comparing ranks rather than matching
 * the pin value exactly is what makes the empty-panel cases fall out for free:
 * the first column pinned left has no left-block sibling to land after, and
 * must still end up before every unpinned column rather than at the end.
 */
function panelRank(pinned: ColumnPinPosition): number {
  if (pinned === 'left') return 0;
  if (pinned === 'right') return 2;
  return 1;
}

/**
 * Converts a field path to a human-readable Title Case header, used as the
 * default header when a column omits one. Handles camelCase, snake_case,
 * kebab-case and dotted paths, e.g. `firstName` → `First Name`,
 * `user_id` → `User Id`, `address.city` → `Address City`.
 */
function toTitleCase(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase
    .replace(/[._-]+/g, ' ')                // separators → spaces
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * Recursively normalizes an author-supplied {@link ColumnDefInput} tree into a
 * fully-typed {@link ColumnDef} tree — filling `colId`, `header` and `type`
 * defaults on every node (leaves and groups) so downstream consumers, including
 * the column-group engine, never see missing fields. `colId`s are assigned from
 * a single running counter so the group tree and the flattened leaf list agree.
 */
export function normalizeColumnTree(input: ReadonlyArray<ColumnDefInput>): ColumnDef[] {
  let counter = 0;
  const walk = (defs: ReadonlyArray<ColumnDefInput>): ColumnDef[] =>
    defs.map((def): ColumnDef => {
      const colId = def.colId ?? `col_${def.field}_${counter++}`;
      return {
        ...def,
        colId,
        header: def.header ?? toTitleCase(def.field),
        type: def.type ?? 'string',
        children: def.children ? walk(def.children) : undefined,
      };
    });
  return walk(input);
}

export class ColumnModel {
  private columns: Column[] = [];

  /**
   * Snapshot of the column state captured at the last {@link initColumns} call,
   * so {@link resetColumnState} can restore the original widths, visibility,
   * pin positions, sort, and order after the user has rearranged the grid.
   */
  private initialColumnStates: ColumnState[] = [];

  /**
   * Deep-ish clones of each column's definition captured at the last
   * {@link initColumns} call, keyed by `colId`. Lets {@link resetColumn} restore
   * a single column's full definition (header, width, pin, flags, aggFunc, …).
   */
  private initialColumnDefs = new Map<string, Column>();

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
  ) {}

  initColumns(defs: ReadonlyArray<ColumnDefInput>): void {
    this.columns = defs.map((col, i) => this.normalizeColumn(col, i));
    this.rebuildPinnedSections();
    this.store.set('columns', this.columns);
    // Capture the pristine layout so it can be restored via resetColumnState().
    this.initialColumnStates = this.getColumnStates();
    this.initialColumnDefs = new Map(this.columns.map((c) => [c.colId, { ...c }]));
    this.emitStatesChanged();
  }

  getColumn(colId: string): Column | undefined {
    return this.columns.find((c) => c.colId === colId);
  }

  getAllColumns(): Column[] {
    return this.columns;
  }

  getVisibleColumns(): Column[] {
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

  /**
   * Applies several column widths in one operation, clamping each to its
   * min/max, then emits a single `COLUMNS_STATE_CHANGED`. The batch counterpart
   * to {@link setColumnWidth}, used by Auto Size All / Fit to Grid so N columns
   * cost one store update and one render instead of N.
   *
   * @param entries - `[colId, width]` pairs to apply.
   */
  setColumnWidths(entries: ReadonlyArray<readonly [string, number]>): void {
    let changed = false;
    for (const [colId, width] of entries) {
      const col = this.getColumn(colId);
      if (!col) continue;
      const min = col.minWidth ?? 40;
      const max = col.maxWidth ?? Infinity;
      col.width = Math.min(max, Math.max(min, width));
      changed = true;
    }
    if (!changed) return;
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
  }

  /**
   * Restores a single column's width to the value captured at the last
   * {@link initColumns} call (the "Reset Width" action). For a column defined
   * with `flex`, this seed is overridden by flex re-resolution on the next
   * render — the caller should also clear any user-fixed width so flex resumes.
   *
   * @param colId - Column whose width should be reset.
   */
  resetColumnWidth(colId: string): void {
    const col = this.getColumn(colId);
    if (!col) return;
    const initial = this.initialColumnStates.find((s) => s.colId === colId);
    col.width = initial?.width ?? 150;
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
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

  /**
   * Pins a column to a panel, or unpins it.
   *
   * Pinning is a **move**, not just a flag: the column leaves the block it sat
   * in and joins the end of the target panel's block. `columns` is reordered to
   * match, because definition order is what every order-sensitive consumer
   * walks — `getVisibleColumns()` feeds the header's roving keyboard focus,
   * range selection, and export column order, none of which read the rendered
   * panels. Leaving the order alone made those disagree with what the user can
   * see: after pinning a middle column left from the column menu, Arrow keys in
   * the header jumped to whatever still sat beside it in the *old* order.
   *
   * ### Unpinning puts it back
   * Because pinning moves the column, its old position has to be remembered or
   * it is gone: unpinning used to drop the column at the end of the unpinned
   * block, so pinning the third of twenty columns to glance at it and unpinning
   * again returned it as the twentieth. The slot it came from is recorded on the
   * way in (see {@link Column.unpinAnchorColId}) and restored on the way out.
   *
   * Drag-to-pin has always reordered (see {@link moveAndPin}); this is the same
   * operation with the insertion point left implicit.
   */
  setColumnPin(colId: string, pinned: ColumnPinPosition): void {
    const col = this.getColumn(colId);
    if (!col) return;

    const wasPinned = col.pinned ?? null;
    const nextPin = pinned ?? null;

    // Captured on the way in only. Pinning left and then right must not forget
    // where the column started, and re-pinning an already-pinned column would
    // otherwise record a slot inside a pinned panel.
    if (wasPinned === null && nextPin !== null) {
      col.unpinAnchorColId = this.columnBefore(col.colId);
    }

    col.pinned = nextPin;

    if (nextPin === null) {
      this.restoreUnpinned(col);
      col.unpinAnchorColId = undefined;
    } else {
      this.reorderIntoPanel(col, nextPin, null);
    }

    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.eventBus.emit(GridEventType.COLUMN_PINNED, { colDef: col, pinned });
    this.emitStatesChanged();
  }

  /**
   * The colId of the visible column immediately *before* `colId`, or `null` when
   * it is the first one.
   *
   * A neighbour rather than an index, because indices go stale the moment any
   * other column is moved, hidden or pinned — and a column can sit pinned for
   * the whole time the user spends rearranging the rest of the grid.
   *
   * The column *before* rather than after, because it degrades better. When the
   * remembered neighbour has itself been pinned away in the meantime, "just
   * after A" still puts the column back on A's side of the grid; "just before C"
   * collapses to the front of the block and silently swaps the column past
   * everything that used to precede it.
   */
  private columnBefore(colId: string): string | null {
    const visibleCols = this.getVisibleColumns();
    const index = visibleCols.findIndex((c) => c.colId === colId);
    if (index <= 0) return null;
    return visibleCols[index - 1].colId;
  }

  /**
   * Puts a just-unpinned column back where it was, or as close as the layout
   * still allows.
   *
   * The remembered neighbour may since have been hidden, removed, or pinned
   * itself, and the result must stay inside the unpinned block either way —
   * definition order has to keep matching panel order, or the consumers listed
   * on {@link setColumnPin} start disagreeing with the screen. So the target is
   * clamped to the block's bounds: a stale anchor degrades to the end of the
   * unpinned block, which is exactly the old behaviour, rather than to a
   * corrupt order.
   *
   * @returns The from/to indices within the visible-column order, or `null` when
   *          the column is hidden and has no position to move — the same
   *          contract as {@link reorderIntoPanel}, so `moveAndPin` can use
   *          either interchangeably.
   */
  private restoreUnpinned(col: Column): { from: number; to: number } | null {
    const visibleCols = this.getVisibleColumns();
    const fromIdx = visibleCols.findIndex((c) => c.colId === col.colId);
    if (fromIdx === -1) return null;

    // Removed first so every index below is in the final coordinate space.
    visibleCols.splice(fromIdx, 1);

    // Bounds of the unpinned block: after the last left-pinned column, up to
    // the last column that is not right-pinned.
    let blockStart = 0;
    let blockEnd = 0;
    for (let i = 0; i < visibleCols.length; i++) {
      const rank = panelRank(visibleCols[i].pinned ?? null);
      if (rank === 0) blockStart = i + 1;
      if (rank <= 1) blockEnd = i + 1;
    }
    blockEnd = Math.max(blockEnd, blockStart);

    const anchor = col.unpinAnchorColId ?? null;
    // `null` means the column was first in the order, so it goes back to the
    // front of the block. A named anchor that is still visible puts it directly
    // after that column; one that has since been hidden or removed falls back to
    // the end of the block, which is the behaviour this replaced.
    const anchorIdx = anchor === null ? -1 : visibleCols.findIndex((c) => c.colId === anchor);
    const desired =
      anchor === null ? blockStart : anchorIdx === -1 ? blockEnd : anchorIdx + 1;
    const toIdx = Math.min(Math.max(desired, blockStart), blockEnd);

    visibleCols.splice(toIdx, 0, col);
    this.columns = this.syncColumnOrder(visibleCols);
    return { from: fromIdx, to: toIdx };
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

  /**
   * Splices `col` into the block of visible columns that belongs to `newPin`,
   * rewriting `this.columns` so definition order matches the rendered panel
   * order. Shared by {@link setColumnPin} and {@link moveAndPin} so the two
   * entry points into pinning can never drift apart.
   *
   * `col.pinned` must already be set to `newPin` — the target block is found by
   * scanning for the column's new panel siblings.
   *
   * @param col               - The column to reposition.
   * @param newPin            - Panel it now belongs to.
   * @param insertBeforeColId - Drop target, or `null` to append to the panel's
   *                            end (what a menu "Pin left" means).
   * @returns The from/to indices within the visible-column order, or `null`
   *          when the column is hidden and therefore has no position to move.
   */
  private reorderIntoPanel(
    col: Column,
    newPin: ColumnPinPosition,
    insertBeforeColId: string | null,
  ): { from: number; to: number } | null {
    const visibleCols = this.getVisibleColumns();
    const fromIdx = visibleCols.findIndex((c) => c.colId === col.colId);
    if (fromIdx === -1) return null;

    // Remove first so every index below is in the final coordinate space and
    // needs no off-by-one adjustment.
    visibleCols.splice(fromIdx, 1);

    let toIdx: number;
    if (insertBeforeColId) {
      const before = visibleCols.findIndex((c) => c.colId === insertBeforeColId);
      toIdx = before === -1 ? visibleCols.length : before;
    } else {
      // No drop target: land at the end of the target panel's own block. Panels
      // always run left → centre → right, so ranking the pins and walking to the
      // last column at or before the target rank finds that boundary for all
      // three cases at once — including the empty ones, where a left pin has to
      // land at index 0 and a right pin at the end.
      const target = panelRank(newPin);
      toIdx = 0;
      for (let i = 0; i < visibleCols.length; i++) {
        if (panelRank(visibleCols[i].pinned ?? null) <= target) toIdx = i + 1;
      }
    }

    visibleCols.splice(toIdx, 0, col);

    this.columns = this.syncColumnOrder(visibleCols);
    return { from: fromIdx, to: toIdx };
  }

  /** Move a column to a different panel (changing its pinned state) and insert it at a specific position. */
  moveAndPin(colId: string, newPin: ColumnPinPosition, insertBeforeColId: string | null): void {
    const col = this.getColumn(colId);
    if (!col) return;

    const wasPinned = col.pinned ?? null;
    const nextPin = newPin ?? null;
    // Same bookkeeping as the menu path, so dragging a column into a pinned
    // panel and dragging it back out is not a one-way trip either. Only the
    // implicit case restores: a drag that names a drop target has already said
    // where the column goes.
    if (wasPinned === null && nextPin !== null) {
      col.unpinAnchorColId = this.columnBefore(col.colId);
    }

    col.pinned = newPin;

    const moved =
      nextPin === null && insertBeforeColId === null
        ? this.restoreUnpinned(col)
        : this.reorderIntoPanel(col, newPin, insertBeforeColId);
    if (nextPin === null) col.unpinAnchorColId = undefined;
    if (!moved) {
      this.rebuildPinnedSections();
      this.store.set('columns', [...this.columns]);
      return;
    }

    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.eventBus.emit(GridEventType.COLUMN_MOVED, {
      colDef: col,
      fromIndex: moved.from,
      toIndex: moved.to,
    });
    this.eventBus.emit(GridEventType.COLUMN_PINNED, { colDef: col, pinned: newPin });
    this.emitStatesChanged();
  }

  /**
   * Sets (or clears) the aggregation function for a column — the function used
   * to summarize the column's values on group rows when row grouping is active.
   * Aggregation itself only applies to `number`/`currency` columns (see
   * `AggregationEngine`); this setter does not enforce that, leaving the menu to
   * decide where it is offered.
   *
   * @param colId   - Target column.
   * @param aggFunc - Aggregation function, or `null` to clear it.
   */
  setColumnAggFunc(colId: string, aggFunc: AggFunc | null): void {
    const col = this.getColumn(colId);
    if (!col) return;
    col.aggFunc = aggFunc ?? undefined;
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
  }

  // ──────────────────── Column menu operations ────────────────────

  /**
   * Renames a column (its header text). Used by the column menu's "Rename".
   *
   * @param colId  - Target column.
   * @param header - New header text; ignored when empty.
   */
  setColumnHeader(colId: string, header: string): void {
    const col = this.getColumn(colId);
    if (!col || !header) return;
    col.header = header;
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
  }

  /**
   * Inserts a copy of a column immediately after it. The duplicate shares the
   * source `field` (so it shows the same data) but gets a fresh, unique `colId`.
   * Used by the column menu's "Duplicate".
   *
   * @param colId - Column to duplicate.
   * @returns The new column's `colId`, or `null` if the source was not found.
   */
  duplicateColumn(colId: string): string | null {
    const idx = this.columns.findIndex((c) => c.colId === colId);
    if (idx === -1) return null;
    const source = this.columns[idx];

    let n = 2;
    let newColId = `${colId}_copy`;
    const taken = new Set(this.columns.map((c) => c.colId));
    while (taken.has(newColId)) newColId = `${colId}_copy_${n++}`;

    const clone: Column = { ...source, colId: newColId, sortOrder: null };
    this.columns.splice(idx + 1, 0, clone);
    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
    return newColId;
  }

  /**
   * Toggles "Freeze Position" — whether the column can be dragged/reordered.
   * Frozen columns have `draggable === false`. Used by "Freeze Position".
   *
   * @param colId - Target column.
   */
  toggleColumnFrozen(colId: string): void {
    const col = this.getColumn(colId);
    if (!col) return;
    col.draggable = col.draggable === false; // false → true (unfreeze), else → false (freeze)
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
  }

  /**
   * Toggles "Lock Column" — whether the column's cells can be edited. Locked
   * columns are never editable regardless of {@link ColumnDef.editable}.
   *
   * @param colId - Target column.
   */
  toggleColumnLocked(colId: string): void {
    const col = this.getColumn(colId);
    if (!col) return;
    col.locked = !col.locked;
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
  }

  /**
   * Restores a single column to the definition captured at {@link initColumns}
   * (header, width, pin, visibility, sort, flags, aggFunc, …) and moves it back
   * to its original position. The single-column counterpart to
   * {@link resetColumnState}. Callers should also clear any user-fixed width in
   * the style manager so a `flex` column resumes flexing.
   *
   * @param colId - Column to reset.
   */
  resetColumn(colId: string): void {
    const initial = this.initialColumnDefs.get(colId);
    const col = this.getColumn(colId);
    if (!initial || !col) return;

    // Restore properties in place so existing references stay valid.
    Object.assign(col, { ...initial });

    // Restore original position among the columns.
    const initialIndex = this.initialColumnStates.findIndex((s) => s.colId === colId);
    if (initialIndex >= 0) {
      const current = this.columns.filter((c) => c.colId !== colId);
      current.splice(Math.min(initialIndex, current.length), 0, col);
      this.columns = current;
    }

    this.rebuildPinnedSections();
    this.store.set('columns', [...this.columns]);
    this.emitStatesChanged();
  }

  setColumnSort(colId: string, order: 'asc' | 'desc' | null): void {
    for (const col of this.columns) {
      col.sortOrder = col.colId === colId ? order : null;
    }
    // NOTE: intentionally does NOT `store.set('columns', …)`. Sort order only
    // drives the header arrow (updated in place via the COLUMN_SORTED handler),
    // and the body re-sorts through the visibleRows pipeline. Writing `columns`
    // here would trigger the columns-watch full header/body teardown, which
    // fights the RowAnimator's FLIP and makes sorting stutter. The sortOrder
    // mutation above is still visible to the store (same object references).
    const col = this.getColumn(colId);
    if (col) {
      this.eventBus.emit(GridEventType.COLUMN_SORTED, { colId, field: col.field, order });
    }
  }

  /** Clears the sort indicator from every column (the header-arrow counterpart to `SortEngine.clearSort`). */
  clearAllSort(): void {
    for (const col of this.columns) col.sortOrder = null;
    // See setColumnSort — deliberately no `store.set('columns')` to avoid the
    // teardown; the empty-colId event clears every arrow.
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
      .filter((c): c is Column => !!c);
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

  private syncColumnOrder(orderedVisible: Column[]): Column[] {
    const hiddenCols = this.columns.filter((c) => c.visible === false);
    return [...orderedVisible, ...hiddenCols];
  }

  private normalizeColumn(col: ColumnDefInput, index: number): Column {
    // `children` is a ColumnDefInput[] on the input; leaves reaching the model
    // never have one (they were flattened), so drop it to keep the type a
    // fully-normalized Column with ColumnDef[] children.
    const { children: _children, ...leaf } = col;
    return {
      width: 150,
      minWidth: 40,
      visible: true,
      sortable: true,
      // `filterable` is deliberately NOT defaulted. Every consumer tests it as
      // `!== false`, so an omitted value already means "filterable" — and
      // leaving it absent is what lets the header distinguish an explicit
      // `filterable: true` (show the funnel) from a column that merely inherits
      // the capability. Defaulting it here would erase that distinction.
      resizable: true,
      draggable: true,
      editable: false,
      groupable: false,
      sortOrder: null,
      filterActive: false,
      ...leaf,
      colId: col.colId ?? `col_${col.field}_${index}`,
      // Sensible defaults so a column can be declared with just a `field`:
      // type falls back to plain text, header to the field in Title Case.
      type: col.type ?? 'string',
      header: col.header ?? toTitleCase(col.field),
      // A declared column formula implicitly opts the column into the Formula
      // Engine, unless the author explicitly opted out with `allowFormula: false`.
      allowFormula: col.allowFormula ?? (col.formula != null ? true : undefined),
    };
  }

  private emitStatesChanged(): void {
    this.eventBus.emit(GridEventType.COLUMNS_STATE_CHANGED, {
      states: this.getColumnStates(),
    });
  }
}
