import type { RowNode } from '../types/row.types';
import type { GridStore } from '../core/grid-store';
export interface VirtualScrollOptions {
    rowBuffer: number;
    estimatedRowHeight: number;
    dynamicRowHeight: boolean;
}
export declare class VirtualScrollRenderer {
    private store;
    private viewportEl;
    private spacerTopEl;
    private spacerBottomEl;
    private contentEl;
    private rowHeightCache;
    private options;
    private scrollListener;
    private resizeObserver;
    constructor(store: GridStore, options?: Partial<VirtualScrollOptions>);
    mount(viewportEl: HTMLElement, contentEl: HTMLElement): void;
    unmount(): void;
    computeVisibleRange(rows: RowNode[]): {
        start: number;
        end: number;
    };
    updateSpacers(rows: RowNode[], start: number, end: number): void;
    getTotalHeight(rows: RowNode[]): number;
    cacheRowHeight(nodeId: string, height: number): void;
    getRowHeight(row: RowNode): number;
    scrollToRow(rowIndex: number, rows: RowNode[]): void;
    scrollToTop(): void;
    getScrollTop(): number;
    getScrollLeft(): number;
    private sumHeights;
    private onScroll;
    private onViewportResize;
}
//# sourceMappingURL=virtual-scroll-renderer.d.ts.map