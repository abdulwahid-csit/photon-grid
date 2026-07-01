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
  };

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
  ) {}

  configure(config: Partial<SelectionConfig>): void {
    this.config = { ...this.config, ...config };
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
