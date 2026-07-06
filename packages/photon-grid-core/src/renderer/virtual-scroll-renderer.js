import { createDiv } from './dom-utils';
const DEFAULT_BUFFER = 5;
export class VirtualScrollRenderer {
    constructor(store, options = {}) {
        this.store = store;
        this.viewportEl = null;
        this.spacerTopEl = null;
        this.spacerBottomEl = null;
        this.contentEl = null;
        this.rowHeightCache = new Map();
        this.scrollListener = null;
        this.resizeObserver = null;
        this.options = {
            rowBuffer: DEFAULT_BUFFER,
            estimatedRowHeight: 48,
            dynamicRowHeight: false,
            ...options,
        };
    }
    mount(viewportEl, contentEl) {
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
    unmount() {
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
    computeVisibleRange(rows) {
        if (!this.viewportEl || rows.length === 0)
            return { start: 0, end: rows.length };
        const scrollTop = this.viewportEl.scrollTop;
        const viewportHeight = this.viewportEl.clientHeight;
        const buffer = this.options.rowBuffer;
        if (!this.options.dynamicRowHeight) {
            const rowHeight = this.options.estimatedRowHeight;
            const start = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
            const end = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer);
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
    updateSpacers(rows, start, end) {
        if (!this.spacerTopEl || !this.spacerBottomEl)
            return;
        const topHeight = this.sumHeights(rows, 0, start);
        const bottomHeight = this.sumHeights(rows, end, rows.length);
        this.spacerTopEl.style.height = `${topHeight}px`;
        this.spacerBottomEl.style.height = `${bottomHeight}px`;
    }
    getTotalHeight(rows) {
        return this.sumHeights(rows, 0, rows.length);
    }
    cacheRowHeight(nodeId, height) {
        this.rowHeightCache.set(nodeId, height);
    }
    getRowHeight(row) {
        if (this.rowHeightCache.has(row.nodeId)) {
            return this.rowHeightCache.get(row.nodeId);
        }
        return row.height || this.options.estimatedRowHeight;
    }
    scrollToRow(rowIndex, rows) {
        if (!this.viewportEl || rowIndex < 0 || rowIndex >= rows.length)
            return;
        const top = this.sumHeights(rows, 0, rowIndex);
        this.viewportEl.scrollTop = top;
    }
    scrollToTop() {
        if (this.viewportEl)
            this.viewportEl.scrollTop = 0;
    }
    getScrollTop() {
        return this.viewportEl?.scrollTop ?? 0;
    }
    getScrollLeft() {
        return this.viewportEl?.scrollLeft ?? 0;
    }
    sumHeights(rows, from, to) {
        let total = 0;
        for (let i = from; i < to && i < rows.length; i++) {
            total += this.getRowHeight(rows[i]);
        }
        return total;
    }
    onScroll() {
        if (!this.viewportEl)
            return;
        const scrollTop = this.viewportEl.scrollTop;
        const scrollLeft = this.viewportEl.scrollLeft;
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + this.viewportEl.clientHeight >= this.viewportEl.scrollHeight - 2;
        this.store.set('scrollTop', scrollTop);
        this.store.set('scrollLeft', scrollLeft);
    }
    onViewportResize() {
        if (!this.viewportEl)
            return;
        this.store.set('viewportHeight', this.viewportEl.clientHeight);
        this.store.set('viewportWidth', this.viewportEl.clientWidth);
    }
}
//# sourceMappingURL=virtual-scroll-renderer.js.map