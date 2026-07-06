import type { RowNode } from '../../types/row.types';
import type { PaginationConfig } from '../../types/grid.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import { GridEventType } from '../../types/event.types';

export class PaginationEngine {
  constructor(
    private store: GridStore,
    private eventBus: EventBus,
  ) {}

  configure(config: Partial<PaginationConfig>): void {
    const current = this.store.get('pagination');
    this.store.set('pagination', { ...current, ...config });
  }

  enable(): void {
    this.configure({ enabled: true });
  }

  disable(): void {
    this.configure({ enabled: false });
  }

  goToPage(page: number): void {
    const config = this.store.get('pagination');
    const totalPages = this.getTotalPages();
    const clampedPage = Math.max(1, Math.min(page, totalPages));

    if (clampedPage === config.page) return;
    this.configure({ page: clampedPage });
    this.emitPageChange();
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.getTotalPages());
  }

  goToNextPage(): void {
    const config = this.store.get('pagination');
    this.goToPage(config.page + 1);
  }

  goToPreviousPage(): void {
    const config = this.store.get('pagination');
    this.goToPage(config.page - 1);
  }

  setPageSize(size: number): void {
    const config = this.store.get('pagination');
    this.configure({ pageSize: size, page: 1 });
    this.eventBus.emit(GridEventType.PAGE_SIZE_CHANGED, {
      page: 1,
      pageSize: size,
      totalRows: config.totalRows ?? 0,
      totalPages: this.getTotalPages(),
    });
  }

  setTotalRows(count: number): void {
    this.configure({ totalRows: count });
  }

  applyPagination(rows: RowNode[]): RowNode[] {
    const config = this.store.get('pagination');
    if (!config.enabled || config.serverSide) return rows;

    const totalRows = rows.filter((r) => r.type === 'data' || r.type === 'group').length;
    if (config.totalRows !== totalRows) {
      this.configure({ totalRows });
    }

    const start = (config.page - 1) * config.pageSize;
    const end = start + config.pageSize;

    let count = 0;
    return rows.filter((row) => {
      if (row.type !== 'data' && row.type !== 'group') return true;
      count++;
      return count > start && count <= end;
    });
  }

  getTotalPages(): number {
    const config = this.store.get('pagination');
    const total = config.totalRows ?? 0;
    return Math.max(1, Math.ceil(total / config.pageSize));
  }

  getCurrentPage(): number {
    return this.store.get('pagination').page;
  }

  getPageSize(): number {
    return this.store.get('pagination').pageSize;
  }

  getTotalRows(): number {
    return this.store.get('pagination').totalRows ?? 0;
  }

  getPageRange(): { start: number; end: number } {
    const config = this.store.get('pagination');
    const start = (config.page - 1) * config.pageSize + 1;
    const end = Math.min(config.page * config.pageSize, config.totalRows ?? 0);
    return { start, end };
  }

  isEnabled(): boolean {
    return this.store.get('pagination').enabled;
  }

  isFirstPage(): boolean {
    return this.store.get('pagination').page === 1;
  }

  isLastPage(): boolean {
    return this.store.get('pagination').page >= this.getTotalPages();
  }

  private emitPageChange(): void {
    const config = this.store.get('pagination');
    this.eventBus.emit(GridEventType.PAGE_CHANGED, {
      page: config.page,
      pageSize: config.pageSize,
      totalRows: config.totalRows ?? 0,
      totalPages: this.getTotalPages(),
    });
  }
}
