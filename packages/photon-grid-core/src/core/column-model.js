import { GridEventType } from '../types/event.types';
export class ColumnModel {
    constructor(store, eventBus) {
        this.store = store;
        this.eventBus = eventBus;
        this.columns = [];
    }
    initColumns(defs) {
        this.columns = defs.map((col, i) => this.normalizeColumn(col, i));
        this.rebuildPinnedSections();
        this.store.set('columns', this.columns);
        this.emitStatesChanged();
    }
    getColumn(colId) {
        return this.columns.find((c) => c.colId === colId);
    }
    getAllColumns() {
        return this.columns;
    }
    getVisibleColumns() {
        return this.columns.filter((c) => c.visible !== false);
    }
    setColumnWidth(colId, width, finished = false) {
        const col = this.getColumn(colId);
        if (!col)
            return;
        const min = col.minWidth ?? 40;
        const max = col.maxWidth ?? Infinity;
        col.width = Math.min(max, Math.max(min, width));
        this.store.set('columns', [...this.columns]);
        this.eventBus.emit(GridEventType.COLUMN_RESIZED, { colDef: col, newWidth: col.width, finished });
        if (finished)
            this.emitStatesChanged();
    }
    setColumnVisible(colId, visible) {
        const col = this.getColumn(colId);
        if (!col || col.alwaysVisible)
            return;
        col.visible = visible;
        this.rebuildPinnedSections();
        this.store.set('columns', [...this.columns]);
        this.eventBus.emit(GridEventType.COLUMN_VISIBLE, { colDef: col, visible });
        this.emitStatesChanged();
    }
    setColumnPin(colId, pinned) {
        const col = this.getColumn(colId);
        if (!col)
            return;
        col.pinned = pinned;
        this.rebuildPinnedSections();
        this.store.set('columns', [...this.columns]);
        this.eventBus.emit(GridEventType.COLUMN_PINNED, { colDef: col, pinned });
        this.emitStatesChanged();
    }
    moveColumn(fromIndex, toIndex) {
        const visibleCols = this.getVisibleColumns();
        if (fromIndex < 0 ||
            fromIndex >= visibleCols.length ||
            toIndex < 0 ||
            toIndex >= visibleCols.length)
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
    moveAndPin(colId, newPin, insertBeforeColId) {
        const col = this.getColumn(colId);
        if (!col)
            return;
        col.pinned = newPin;
        const visibleCols = this.getVisibleColumns();
        const fromIdx = visibleCols.findIndex((c) => c.colId === colId);
        if (fromIdx === -1) {
            this.rebuildPinnedSections();
            this.store.set('columns', [...this.columns]);
            return;
        }
        let toIdx;
        if (insertBeforeColId) {
            toIdx = visibleCols.findIndex((c) => c.colId === insertBeforeColId);
            if (toIdx === -1)
                toIdx = visibleCols.length;
        }
        else {
            const lastInPanel = [...visibleCols].reverse().find((c) => (c.pinned ?? null) === (newPin ?? null) && c.colId !== colId);
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
    setColumnSort(colId, order) {
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
    clearAllSort() {
        for (const col of this.columns)
            col.sortOrder = null;
        this.store.set('columns', [...this.columns]);
        this.eventBus.emit(GridEventType.COLUMN_SORTED, { colId: '', field: '', order: null });
    }
    autoSizeColumn(colId, containerEl) {
        const col = this.getColumn(colId);
        if (!col)
            return;
        const measurer = containerEl.ownerDocument.createElement('span');
        measurer.style.cssText =
            'position:absolute;visibility:hidden;white-space:nowrap;font-size:inherit;padding:0 12px;pointer-events:none;';
        containerEl.appendChild(measurer);
        measurer.textContent = col.header;
        let maxWidth = measurer.offsetWidth + 24;
        const cells = containerEl.querySelectorAll(`[data-col-id="${colId}"]`);
        for (const cell of Array.from(cells)) {
            measurer.textContent = cell.textContent ?? '';
            maxWidth = Math.max(maxWidth, measurer.offsetWidth + 24);
        }
        containerEl.removeChild(measurer);
        this.setColumnWidth(colId, maxWidth, true);
        this.eventBus.emit(GridEventType.COLUMN_AUTOSIZE, { colId, newWidth: maxWidth });
    }
    applyColumnStates(states) {
        const stateMap = new Map(states.map((s) => [s.colId, s]));
        for (const col of this.columns) {
            const state = stateMap.get(col.colId);
            if (!state)
                continue;
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
    getColumnStates() {
        return this.columns.map((col, index) => ({
            colId: col.colId,
            width: col.width ?? 150,
            visible: col.visible !== false,
            pinned: col.pinned ?? null,
            sortOrder: col.sortOrder ?? null,
            index,
        }));
    }
    rebuildPinnedSections() {
        const visible = this.columns.filter((c) => c.visible !== false);
        this.store.set('pinnedLeftColumns', visible.filter((c) => c.pinned === 'left'));
        this.store.set('pinnedRightColumns', visible.filter((c) => c.pinned === 'right'));
        this.store.set('centerColumns', visible.filter((c) => !c.pinned));
    }
    syncColumnOrder(orderedVisible) {
        const hiddenCols = this.columns.filter((c) => c.visible === false);
        return [...orderedVisible, ...hiddenCols];
    }
    normalizeColumn(col, index) {
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
    emitStatesChanged() {
        this.eventBus.emit(GridEventType.COLUMNS_STATE_CHANGED, {
            states: this.getColumnStates(),
        });
    }
}
//# sourceMappingURL=column-model.js.map