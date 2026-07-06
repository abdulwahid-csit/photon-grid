import type { RowNode } from '../../types/row.types';
import type { PaginationConfig } from '../../types/grid.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
export declare class PaginationEngine {
    private store;
    private eventBus;
    constructor(store: GridStore, eventBus: EventBus);
    configure(config: Partial<PaginationConfig>): void;
    enable(): void;
    disable(): void;
    goToPage(page: number): void;
    goToFirstPage(): void;
    goToLastPage(): void;
    goToNextPage(): void;
    goToPreviousPage(): void;
    setPageSize(size: number): void;
    setTotalRows(count: number): void;
    applyPagination(rows: RowNode[]): RowNode[];
    getTotalPages(): number;
    getCurrentPage(): number;
    getPageSize(): number;
    getTotalRows(): number;
    getPageRange(): {
        start: number;
        end: number;
    };
    isEnabled(): boolean;
    isFirstPage(): boolean;
    isLastPage(): boolean;
    private emitPageChange;
}
//# sourceMappingURL=pagination-engine.d.ts.map