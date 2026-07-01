import type { RowNode } from '../types/row.types';
import type { GridStore } from '../core/grid-store';
import { createDiv } from './dom-utils';

export interface VirtualScrollOptions {
  rowBuffer: number;
  estimatedRowHeight: number;
  dynamicRowHeight: boolean;
}

const DEFAULT_BUFFER = 5;

export class VirtualScrollRenderer {
  private viewportEl: HTMLElement | null = null;
  private spacerTopEl: HTMLElement | null = null;
  private spacerBottomEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private rowHeightCache = new Map<string, number>();
  private options: VirtualScrollOptions;
  private scrollListener: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private store: GridStore,
    options: Partial<VirtualScrollOptions> = {},
  ) {
    this.options = {
      rowBuffer: DEFAULT_BUFFER,
      estimatedRowHeight: 48,
      dynamicRowHeight: false,
      ...options,
    };
  }

  mount(viewportEl: HTMLElement, contentEl: HTMLElement): void {
    this.viewportEl = viewportEl;
    this.contentEl = contentEl;

    this.spacerTopEl = createDiv('pg-vscroll-spacer-top');
    this.spacerBottomEl = createDiv('pg-vscroll-spacer-bottom');
    contentEl.insertBefore(this.spacerTopEl, contentEl.firstChild);
    contentEl.appendChild(this.spacerBottomEl);

    this.scrollListener = () => this.onScroll();
    viewportEl.addEventListener('scroll', this.scrollListener, { passive: true });

    this.resizeObserver = new ResizeObserver(() => this.onViewportResize());
    this.resizeObserver.observe(viewportEl);
  }

  unmount(): void {
    if (this.viewportEl && this.scrollListener) {
      this.viewportEl.removeEventListener('scroll', this.scrollListener);
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.spacerTopEl?.remove();
    this.spacerBottomEl?.remove();
    this.viewportEl = null;
    this.contentEl = null;
  }

  computeVisibleRange(rows: RowNode[]): { start: number; end: number } {
    if (!this.viewportEl || rows.length === 0) return { start: 0, end: rows.length };

    const scrollTop = this.viewportEl.scrollTop;
    const viewportHeight = this.viewportEl.clientHeight;
    const buffer = this.options.rowBuffer;

    if (!this.options.dynamicRowHeight) {
      const rowHeight = this.options.estimatedRowHeight;
      const start = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
      const end = Math.min(
        rows.length,
        Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer,
      );
      return { start, end };
    }

    let start = 0;
    let end = rows.length;
    let cumulativeTop = 0;
    let foundStart = false;

    for (let i = 0; i < rows.length; i++) {
      const h = this.getRowHeight(rows[i]);
      if (!foundStart && cumulativeTop + h > scrollTop) {
        start = Math.max(0, i - buffer);
        foundStart = true;
      }
      if (cumulativeTop > scrollTop + viewportHeight) {
        end = Math.min(rows.length, i + buffer);
        break;
      }
      cumulativeTop += h;
    }

    return { start, end };
  }

  updateSpacers(
    rows: RowNode[],
    start: number,
    end: number,
  ): void {
    if (!this.spacerTopEl || !this.spacerBottomEl) return;

    const topHeight = this.sumHeights(rows, 0, start);
    const bottomHeight = this.sumHeights(rows, end, rows.length);

    this.spacerTopEl.style.height = `${topHeight}px`;
    this.spacerBottomEl.style.height = `${bottomHeight}px`;
  }

  getTotalHeight(rows: RowNode[]): number {
    return this.sumHeights(rows, 0, rows.length);
  }

  cacheRowHeight(nodeId: string, height: number): void {
    this.rowHeightCache.set(nodeId, height);
  }

  getRowHeight(row: RowNode): number {
    if (this.rowHeightCache.has(row.nodeId)) {
      return this.rowHeightCache.get(row.nodeId)!;
    }
    return row.height || this.options.estimatedRowHeight;
  }

  scrollToRow(rowIndex: number, rows: RowNode[]): void {
    if (!this.viewportEl || rowIndex < 0 || rowIndex >= rows.length) return;
    const top = this.sumHeights(rows, 0, rowIndex);
    this.viewportEl.scrollTop = top;
  }

  scrollToTop(): void {
    if (this.viewportEl) this.viewportEl.scrollTop = 0;
  }

  getScrollTop(): number {
    return this.viewportEl?.scrollTop ?? 0;
  }

  getScrollLeft(): number {
    return this.viewportEl?.scrollLeft ?? 0;
  }

  private sumHeights(rows: RowNode[], from: number, to: number): number {
    let total = 0;
    for (let i = from; i < to && i < rows.length; i++) {
      total += this.getRowHeight(rows[i]);
    }
    return total;
  }

  private onScroll(): void {
    if (!this.viewportEl) return;
    const scrollTop = this.viewportEl.scrollTop;
    const scrollLeft = this.viewportEl.scrollLeft;
    const isAtTop = scrollTop === 0;
    const isAtBottom =
      scrollTop + this.viewportEl.clientHeight >= this.viewportEl.scrollHeight - 2;

    this.store.set('scrollTop', scrollTop);
    this.store.set('scrollLeft', scrollLeft);
  }

  private onViewportResize(): void {
    if (!this.viewportEl) return;
    this.store.set('viewportHeight', this.viewportEl.clientHeight);
    this.store.set('viewportWidth', this.viewportEl.clientWidth);
  }
}
