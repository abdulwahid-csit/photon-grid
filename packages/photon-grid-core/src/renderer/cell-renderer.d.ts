import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { IconRenderer } from '../icons/icon-renderer';
export interface CellRenderContext {
    row: RowNode;
    colDef: ColumnDef;
    rowIndex: number;
    colIndex: number;
    iconRenderer: IconRenderer;
    dateFormat?: string;
    timeZone?: string;
    currencySymbol?: string;
    locale?: string;
    api: unknown;
}
export declare class CellRenderer {
    renderCell(ctx: CellRenderContext): HTMLElement;
    renderCheckboxCell(row: RowNode, rowIndex: number): HTMLElement;
    renderSerialNumberCell(rowIndex: number, displayIndex: number): HTMLElement;
    updateCellSelection(cell: HTMLElement, selected: boolean): void;
    updateCellActive(cell: HTMLElement, active: boolean): void;
    private renderDefaultCell;
    private resolveValue;
    private resolveObjectKey;
}
//# sourceMappingURL=cell-renderer.d.ts.map