import { GridEventType } from '../../types/event.types';
export class RowSelectionEngine {
    constructor(store, eventBus) {
        this.store = store;
        this.eventBus = eventBus;
        this.config = {
            mode: 'multiple',
            checkboxSelection: true,
            selectAllOnHeaderClick: true,
            headerCheckbox: true,
            suppressRowDeselection: false,
        };
    }
    configure(config) {
        this.config = { ...this.config, ...config };
    }
    selectRow(nodeId, rows) {
        if (this.config.mode === 'none')
            return;
        const selectedIds = new Set(this.store.get('selectedRowIds'));
        if (this.config.mode === 'single') {
            selectedIds.clear();
            selectedIds.add(nodeId);
        }
        else {
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
    deselectRow(nodeId, rows) {
        if (this.config.suppressRowDeselection)
            return;
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
    toggleRowSelection(nodeId, rows) {
        const selectedIds = this.store.get('selectedRowIds');
        if (selectedIds.has(nodeId)) {
            this.deselectRow(nodeId, rows);
        }
        else {
            this.selectRow(nodeId, rows);
        }
    }
    selectRows(nodeIds, rows) {
        if (this.config.mode === 'none')
            return;
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
    selectAll(rows) {
        if (this.config.mode !== 'multiple')
            return;
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
    deselectAll(rows) {
        const emptySet = new Set();
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
    selectRange(fromIndex, toIndex, rows) {
        if (this.config.mode !== 'multiple')
            return;
        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);
        const rangeIds = rows
            .filter((r) => r.type === 'data' && r.rowIndex >= start && r.rowIndex <= end)
            .map((r) => r.nodeId);
        this.selectRows(rangeIds, rows);
    }
    isRowSelected(nodeId) {
        return this.store.get('selectedRowIds').has(nodeId);
    }
    getSelectedRows(rows) {
        const selectedIds = this.store.get('selectedRowIds');
        return rows.filter((r) => selectedIds.has(r.nodeId));
    }
    getSelectedCount() {
        return this.store.get('selectedRowIds').size;
    }
    clearSelection(rows) {
        this.deselectAll(rows);
    }
    isAllSelected(rows, selectedIds) {
        const dataRows = rows.filter((r) => r.type === 'data');
        return dataRows.length > 0 && dataRows.every((r) => selectedIds.has(r.nodeId));
    }
    updateSelectionState(rows, selectedIds) {
        const dataRows = rows.filter((r) => r.type === 'data');
        const allSelected = dataRows.length > 0 && dataRows.every((r) => selectedIds.has(r.nodeId));
        const someSelected = !allSelected && dataRows.some((r) => selectedIds.has(r.nodeId));
        this.store.set('isAllSelected', allSelected);
        this.store.set('isIndeterminate', someSelected);
    }
    applySelectionToRows(rows, selectedIds) {
        for (const row of rows) {
            row.selected = selectedIds.has(row.nodeId);
        }
    }
}
//# sourceMappingURL=row-selection-engine.js.map