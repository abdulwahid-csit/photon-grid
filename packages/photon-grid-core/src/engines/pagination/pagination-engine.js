import { GridEventType } from '../../types/event.types';
export class PaginationEngine {
    constructor(store, eventBus) {
        this.store = store;
        this.eventBus = eventBus;
    }
    configure(config) {
        const current = this.store.get('pagination');
        this.store.set('pagination', { ...current, ...config });
    }
    enable() {
        this.configure({ enabled: true });
    }
    disable() {
        this.configure({ enabled: false });
    }
    goToPage(page) {
        const config = this.store.get('pagination');
        const totalPages = this.getTotalPages();
        const clampedPage = Math.max(1, Math.min(page, totalPages));
        if (clampedPage === config.page)
            return;
        this.configure({ page: clampedPage });
        this.emitPageChange();
    }
    goToFirstPage() {
        this.goToPage(1);
    }
    goToLastPage() {
        this.goToPage(this.getTotalPages());
    }
    goToNextPage() {
        const config = this.store.get('pagination');
        this.goToPage(config.page + 1);
    }
    goToPreviousPage() {
        const config = this.store.get('pagination');
        this.goToPage(config.page - 1);
    }
    setPageSize(size) {
        const config = this.store.get('pagination');
        this.configure({ pageSize: size, page: 1 });
        this.eventBus.emit(GridEventType.PAGE_SIZE_CHANGED, {
            page: 1,
            pageSize: size,
            totalRows: config.totalRows ?? 0,
            totalPages: this.getTotalPages(),
        });
    }
    setTotalRows(count) {
        this.configure({ totalRows: count });
    }
    applyPagination(rows) {
        const config = this.store.get('pagination');
        if (!config.enabled || config.serverSide)
            return rows;
        const totalRows = rows.filter((r) => r.type === 'data' || r.type === 'group').length;
        if (config.totalRows !== totalRows) {
            this.configure({ totalRows });
        }
        const start = (config.page - 1) * config.pageSize;
        const end = start + config.pageSize;
        let count = 0;
        return rows.filter((row) => {
            if (row.type !== 'data' && row.type !== 'group')
                return true;
            count++;
            return count > start && count <= end;
        });
    }
    getTotalPages() {
        const config = this.store.get('pagination');
        const total = config.totalRows ?? 0;
        return Math.max(1, Math.ceil(total / config.pageSize));
    }
    getCurrentPage() {
        return this.store.get('pagination').page;
    }
    getPageSize() {
        return this.store.get('pagination').pageSize;
    }
    getTotalRows() {
        return this.store.get('pagination').totalRows ?? 0;
    }
    getPageRange() {
        const config = this.store.get('pagination');
        const start = (config.page - 1) * config.pageSize + 1;
        const end = Math.min(config.page * config.pageSize, config.totalRows ?? 0);
        return { start, end };
    }
    isEnabled() {
        return this.store.get('pagination').enabled;
    }
    isFirstPage() {
        return this.store.get('pagination').page === 1;
    }
    isLastPage() {
        return this.store.get('pagination').page >= this.getTotalPages();
    }
    emitPageChange() {
        const config = this.store.get('pagination');
        this.eventBus.emit(GridEventType.PAGE_CHANGED, {
            page: config.page,
            pageSize: config.pageSize,
            totalRows: config.totalRows ?? 0,
            totalPages: this.getTotalPages(),
        });
    }
}
//# sourceMappingURL=pagination-engine.js.map