import { GridEventType } from '../types/event.types';
import { createDiv } from './dom-utils';
export class FooterRenderer {
    constructor(eventBus, iconRenderer, paginationEngine) {
        this.eventBus = eventBus;
        this.iconRenderer = iconRenderer;
        this.paginationEngine = paginationEngine;
        this.footerEl = null;
        this.pageInfoEl = null;
        this.pageInputEl = null;
    }
    render(containerEl, options = {}) {
        this.footerEl = createDiv('pg-footer');
        const h = options.footerHeight ?? 44;
        this.footerEl.style.height = `${h}px`;
        if (options.showPagination) {
            this.footerEl.appendChild(this.buildPaginationControls());
        }
        if (options.showRowCount) {
            const rowCount = createDiv('pg-footer__row-count');
            this.pageInfoEl = rowCount;
            this.footerEl.appendChild(rowCount);
        }
        this.updatePaginationState();
        containerEl.appendChild(this.footerEl);
        return this.footerEl;
    }
    updatePaginationState() {
        if (!this.footerEl)
            return;
        const config = this.getConfig();
        const totalPages = this.paginationEngine.getTotalPages();
        const { start, end } = this.paginationEngine.getPageRange();
        const pageInfo = this.footerEl.querySelector('.pg-pagination__info');
        if (pageInfo) {
            pageInfo.textContent = `${start}–${end} of ${config.totalRows ?? 0}`;
        }
        if (this.pageInputEl) {
            this.pageInputEl.value = String(config.page);
            this.pageInputEl.max = String(totalPages);
        }
        const firstBtn = this.footerEl.querySelector('[data-action="first"]');
        const prevBtn = this.footerEl.querySelector('[data-action="prev"]');
        const nextBtn = this.footerEl.querySelector('[data-action="next"]');
        const lastBtn = this.footerEl.querySelector('[data-action="last"]');
        const isFirst = this.paginationEngine.isFirstPage();
        const isLast = this.paginationEngine.isLastPage();
        if (firstBtn)
            firstBtn.disabled = isFirst;
        if (prevBtn)
            prevBtn.disabled = isFirst;
        if (nextBtn)
            nextBtn.disabled = isLast;
        if (lastBtn)
            lastBtn.disabled = isLast;
    }
    destroy() {
        this.footerEl?.remove();
        this.footerEl = null;
        this.pageInfoEl = null;
        this.pageInputEl = null;
    }
    buildPaginationControls() {
        const pagination = createDiv('pg-pagination');
        const firstBtn = this.buildNavButton('first', 'pageFirst', 'First page');
        const prevBtn = this.buildNavButton('prev', 'pagePrev', 'Previous page');
        const pageInfo = createDiv('pg-pagination__info');
        pageInfo.textContent = '—';
        const pageInput = document.createElement('input');
        pageInput.type = 'number';
        pageInput.min = '1';
        pageInput.className = 'pg-pagination__page-input';
        pageInput.setAttribute('aria-label', 'Page number');
        this.pageInputEl = pageInput;
        pageInput.addEventListener('change', () => {
            const page = parseInt(pageInput.value, 10);
            if (!isNaN(page)) {
                this.paginationEngine.goToPage(page);
                this.updatePaginationState();
                this.eventBus.emit(GridEventType.PAGE_CHANGED, {
                    page,
                    pageSize: this.getConfig().pageSize,
                    totalRows: this.getConfig().totalRows ?? 0,
                    totalPages: this.paginationEngine.getTotalPages(),
                });
            }
        });
        const nextBtn = this.buildNavButton('next', 'pageNext', 'Next page');
        const lastBtn = this.buildNavButton('last', 'pageLast', 'Last page');
        const pageSizeSelect = this.buildPageSizeSelect();
        pagination.appendChild(pageSizeSelect);
        pagination.appendChild(firstBtn);
        pagination.appendChild(prevBtn);
        pagination.appendChild(pageInfo);
        pagination.appendChild(pageInput);
        pagination.appendChild(nextBtn);
        pagination.appendChild(lastBtn);
        return pagination;
    }
    buildNavButton(action, iconName, label) {
        const btn = document.createElement('button');
        btn.className = `pg-pagination__btn pg-pagination__btn--${action}`;
        btn.setAttribute('data-action', action);
        btn.setAttribute('aria-label', label);
        btn.setAttribute('type', 'button');
        btn.appendChild(this.iconRenderer.render(iconName, { size: 16 }));
        btn.addEventListener('click', () => {
            switch (action) {
                case 'first':
                    this.paginationEngine.goToFirstPage();
                    break;
                case 'prev':
                    this.paginationEngine.goToPreviousPage();
                    break;
                case 'next':
                    this.paginationEngine.goToNextPage();
                    break;
                case 'last':
                    this.paginationEngine.goToLastPage();
                    break;
            }
            this.updatePaginationState();
            const config = this.getConfig();
            this.eventBus.emit(GridEventType.PAGE_CHANGED, {
                page: config.page,
                pageSize: config.pageSize,
                totalRows: config.totalRows ?? 0,
                totalPages: this.paginationEngine.getTotalPages(),
            });
        });
        return btn;
    }
    buildPageSizeSelect() {
        const wrapper = createDiv('pg-pagination__size');
        const label = document.createElement('span');
        label.textContent = 'Rows per page:';
        label.className = 'pg-pagination__size-label';
        const select = document.createElement('select');
        select.className = 'pg-pagination__size-select';
        const config = this.getConfig();
        for (const size of config.pageSizeOptions) {
            const opt = document.createElement('option');
            opt.value = String(size);
            opt.textContent = String(size);
            opt.selected = size === config.pageSize;
            select.appendChild(opt);
        }
        select.addEventListener('change', () => {
            const size = parseInt(select.value, 10);
            this.paginationEngine.setPageSize(size);
            this.updatePaginationState();
        });
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        return wrapper;
    }
    getConfig() {
        return {
            enabled: true,
            page: this.paginationEngine.getCurrentPage(),
            pageSize: this.paginationEngine.getPageSize(),
            pageSizeOptions: [10, 25, 50, 100, 1000, 10000, 100000],
            serverSide: false,
            totalRows: this.paginationEngine.getTotalRows(),
        };
    }
}
//# sourceMappingURL=footer-renderer.js.map