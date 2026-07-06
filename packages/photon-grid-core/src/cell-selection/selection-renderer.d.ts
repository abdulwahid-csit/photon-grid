import type { CellRange } from '../types/grid.types';
export declare class SelectionRenderer {
    private canvas;
    private ctx;
    attach(containerEl: HTMLElement): void;
    detach(): void;
    resize(width: number, height: number): void;
    render(ranges: CellRange[], activeCell: {
        rowIndex: number;
        colIndex: number;
    } | null, getCellRect: (rowIndex: number, colIndex: number) => DOMRect | null, options?: SelectionRenderOptions): void;
    clear(): void;
    private renderRange;
    private renderCorner;
    private renderActiveCell;
}
export interface SelectionRenderOptions {
    fillColor?: string;
    borderColor?: string;
    cornerColor?: string;
    cornerSize?: number;
    borderWidth?: number;
}
//# sourceMappingURL=selection-renderer.d.ts.map