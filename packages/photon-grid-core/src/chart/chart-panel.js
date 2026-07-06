import { ChartRenderer } from './chart-renderer';
const ICON_EMPTY_CHART = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/><line x1="7" y1="15" x2="7" y2="17"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="17" y1="14" x2="17" y2="17"/></svg>`;
const ICON_CLOSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_FULLSCREEN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
const ICON_FULLSCREEN_EXIT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
const ICON_DOTS = `<svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/></svg>`;
const ICON_DOWNLOAD = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
export class ChartPanel {
    constructor(containerEl) {
        this.containerEl = containerEl;
        this.backdropEl = null;
        this.cardEl = null;
        this.canvasEl = null;
        this.dotsMenuEl = null;
        this.dotsBtnEl = null;
        this.fullscreenBtnEl = null;
        this.legendEl = null;
        this.renderer = null;
        this.resizeObserver = null;
        this.isFullscreen = false;
        this.currentData = null;
        this.currentType = 'column-grouped';
        this.currentTitle = '';
        /** Dataset indices the user has toggled off via the legend. */
        this.hiddenSeries = new Set();
        /** Current top-left position of the card within the backdrop. */
        this.panelX = 0;
        this.panelY = 0;
    }
    open(type, title, data) {
        this.close();
        this.currentType = type;
        this.currentTitle = title;
        this.currentData = data;
        this.isFullscreen = false;
        this.hiddenSeries = new Set();
        this.buildDom(title, data === null);
        if (data !== null) {
            if (data.datasets.length > 1)
                this.buildLegend(data);
            this.renderChart();
        }
    }
    close() {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.renderer?.destroy();
        this.renderer = null;
        this.backdropEl?.remove();
        this.backdropEl = null;
        this.cardEl = null;
        this.canvasEl = null;
        this.dotsMenuEl = null;
        this.dotsBtnEl = null;
        this.fullscreenBtnEl = null;
        this.legendEl = null;
        this.currentData = null;
    }
    buildDom(title, isEmpty) {
        const backdrop = document.createElement('div');
        backdrop.className = 'pg-chart-panel-backdrop pg-chart-panel-backdrop--open';
        backdrop.addEventListener('mousedown', (e) => {
            if (e.target === backdrop)
                this.close();
        });
        const card = document.createElement('div');
        card.className = 'pg-chart-panel';
        backdrop.appendChild(card);
        // Header
        const header = document.createElement('div');
        header.className = 'pg-chart-panel__header';
        const titleEl = document.createElement('div');
        titleEl.className = 'pg-chart-panel__title';
        titleEl.textContent = isEmpty ? 'Chart Range' : title;
        const actions = document.createElement('div');
        actions.className = 'pg-chart-panel__actions';
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'pg-chart-panel__action-btn';
        fullscreenBtn.title = 'Toggle fullscreen';
        fullscreenBtn.innerHTML = ICON_FULLSCREEN;
        fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        const closeBtn = document.createElement('button');
        closeBtn.className = 'pg-chart-panel__action-btn';
        closeBtn.title = 'Close';
        closeBtn.innerHTML = ICON_CLOSE;
        closeBtn.addEventListener('click', () => this.close());
        actions.appendChild(fullscreenBtn);
        actions.appendChild(closeBtn);
        header.appendChild(titleEl);
        header.appendChild(actions);
        card.appendChild(header);
        // Body
        const body = document.createElement('div');
        body.className = 'pg-chart-panel__body';
        if (isEmpty) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'pg-chart-panel__empty';
            emptyEl.innerHTML = `
        <span class="pg-chart-panel__empty-icon">${ICON_EMPTY_CHART}</span>
        <span class="pg-chart-panel__empty-text">No chart data available</span>
        <span class="pg-chart-panel__empty-sub">Select cells that include Number, Currency, or Percentage columns</span>
      `;
            body.appendChild(emptyEl);
        }
        else {
            const canvas = document.createElement('canvas');
            canvas.className = 'pg-chart-panel__canvas';
            body.appendChild(canvas);
            const dotsBtn = document.createElement('button');
            dotsBtn.className = 'pg-chart-panel__dots-btn';
            dotsBtn.title = 'Download';
            dotsBtn.innerHTML = ICON_DOTS;
            const dotsMenu = document.createElement('div');
            dotsMenu.className = 'pg-chart-panel__dots-menu';
            const pngItem = document.createElement('button');
            pngItem.className = 'pg-chart-panel__dots-item';
            pngItem.innerHTML = `${ICON_DOWNLOAD} Download PNG`;
            pngItem.addEventListener('click', () => { this.downloadChart('png'); this.closeDotsMenu(); });
            const jpegItem = document.createElement('button');
            jpegItem.className = 'pg-chart-panel__dots-item';
            jpegItem.innerHTML = `${ICON_DOWNLOAD} Download JPEG`;
            jpegItem.addEventListener('click', () => { this.downloadChart('jpeg'); this.closeDotsMenu(); });
            dotsMenu.appendChild(pngItem);
            dotsMenu.appendChild(jpegItem);
            dotsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dotsMenu.classList.contains('pg-chart-panel__dots-menu--open');
                if (isOpen) {
                    this.closeDotsMenu();
                }
                else {
                    dotsMenu.classList.add('pg-chart-panel__dots-menu--open');
                    dotsBtn.classList.add('pg-chart-panel__dots-btn--active');
                    setTimeout(() => {
                        document.addEventListener('mousedown', () => this.closeDotsMenu(), { once: true });
                    });
                }
            });
            body.appendChild(dotsBtn);
            body.appendChild(dotsMenu);
            this.canvasEl = canvas;
            this.dotsMenuEl = dotsMenu;
            this.dotsBtnEl = dotsBtn;
            this.resizeObserver = new ResizeObserver(() => { this.renderChart(); });
            this.resizeObserver.observe(body);
        }
        card.appendChild(body);
        // Legend sits below the body in the card's flex column; height is 0 when
        // empty (single-series chart) so it never wastes space.
        const legend = document.createElement('div');
        legend.className = 'pg-chart-panel__legend';
        card.appendChild(legend);
        this.legendEl = legend;
        this.containerEl.appendChild(backdrop);
        this.backdropEl = backdrop;
        this.cardEl = card;
        this.fullscreenBtnEl = fullscreenBtn;
        this.centerPanel();
        this.attachDrag(header);
    }
    /**
     * Position the card at the center of the backdrop.
     * Called once after building the DOM and on fullscreen exit.
     */
    centerPanel() {
        if (!this.backdropEl || !this.cardEl)
            return;
        const bw = this.backdropEl.offsetWidth;
        const bh = this.backdropEl.offsetHeight;
        const cw = this.cardEl.offsetWidth;
        const ch = this.cardEl.offsetHeight;
        this.panelX = Math.max(0, (bw - cw) / 2);
        this.panelY = Math.max(0, (bh - ch) / 2);
        this.applyPosition();
    }
    applyPosition() {
        if (!this.cardEl)
            return;
        this.cardEl.style.left = `${this.panelX}px`;
        this.cardEl.style.top = `${this.panelY}px`;
    }
    /**
     * Wire drag-to-move onto the header bar.
     * Clamped strictly within the backdrop bounds so the panel never escapes the grid.
     */
    attachDrag(header) {
        header.addEventListener('mousedown', (e) => {
            if (this.isFullscreen)
                return;
            if (e.target.closest('button'))
                return;
            e.preventDefault();
            const startMX = e.clientX;
            const startMY = e.clientY;
            const startPX = this.panelX;
            const startPY = this.panelY;
            header.classList.add('pg-chart-panel__header--dragging');
            this.cardEl?.classList.add('pg-chart-panel--dragging');
            const onMove = (mv) => {
                if (!this.backdropEl || !this.cardEl)
                    return;
                const maxX = this.backdropEl.offsetWidth - this.cardEl.offsetWidth;
                const maxY = this.backdropEl.offsetHeight - this.cardEl.offsetHeight;
                this.panelX = Math.max(0, Math.min(startPX + mv.clientX - startMX, maxX));
                this.panelY = Math.max(0, Math.min(startPY + mv.clientY - startMY, maxY));
                this.applyPosition();
            };
            const onUp = () => {
                header.classList.remove('pg-chart-panel__header--dragging');
                this.cardEl?.classList.remove('pg-chart-panel--dragging');
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }
    closeDotsMenu() {
        this.dotsMenuEl?.classList.remove('pg-chart-panel__dots-menu--open');
        this.dotsBtnEl?.classList.remove('pg-chart-panel__dots-btn--active');
    }
    toggleFullscreen() {
        if (!this.cardEl || !this.fullscreenBtnEl)
            return;
        this.isFullscreen = !this.isFullscreen;
        this.cardEl.classList.toggle('pg-chart-panel--fullscreen', this.isFullscreen);
        this.fullscreenBtnEl.innerHTML = this.isFullscreen ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN;
        this.fullscreenBtnEl.title = this.isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen';
        if (this.isFullscreen) {
            // Inset 16px from each edge to match calc(100% - 32px) dimensions
            this.panelX = 0;
            this.panelY = 0;
            this.applyPosition();
        }
        else {
            // Re-centre after layout recalculates the shrunk card dimensions
            setTimeout(() => { this.centerPanel(); this.renderChart(); }, 50);
            return;
        }
        setTimeout(() => this.renderChart(), 50);
    }
    renderChart() {
        if (!this.canvasEl || !this.currentData || !this.cardEl)
            return;
        const body = this.canvasEl.parentElement;
        if (!body)
            return;
        const w = body.clientWidth - 16;
        const h = body.clientHeight - 16;
        if (w <= 0 || h <= 0)
            return;
        if (!this.renderer) {
            this.renderer = new ChartRenderer(this.canvasEl);
        }
        this.renderer.render(this.currentData, {
            type: this.currentType,
            width: w,
            height: h,
            showLegend: false,
            showGrid: true,
            animationDuration: 400,
        });
    }
    /**
     * Populates the HTML legend bar with one clickable button per dataset.
     * Each button acts as a toggle: clicking animates the corresponding bars
     * in or out and dims the legend entry to signal its state.
     */
    buildLegend(data) {
        if (!this.legendEl)
            return;
        this.legendEl.innerHTML = '';
        data.datasets.forEach((ds, i) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'pg-chart-panel__legend-item';
            const swatch = document.createElement('span');
            swatch.className = 'pg-chart-panel__legend-swatch';
            swatch.style.background = ds.color ?? '#008FFB';
            const label = document.createElement('span');
            label.className = 'pg-chart-panel__legend-label';
            label.textContent = ds.label;
            item.appendChild(swatch);
            item.appendChild(label);
            item.addEventListener('click', () => this.handleLegendToggle(i));
            this.legendEl.appendChild(item);
        });
    }
    /**
     * Toggles a dataset's visibility with a smooth bar-height animation.
     * The legend item is dimmed while its series is hidden.
     */
    handleLegendToggle(index) {
        if (!this.renderer || !this.currentData || !this.canvasEl)
            return;
        const body = this.canvasEl.parentElement;
        if (!body)
            return;
        const w = body.clientWidth - 16;
        const h = body.clientHeight - 16;
        if (w <= 0 || h <= 0)
            return;
        const nowVisible = this.hiddenSeries.has(index); // toggling TO visible if currently hidden
        if (nowVisible) {
            this.hiddenSeries.delete(index);
        }
        else {
            this.hiddenSeries.add(index);
        }
        const item = this.legendEl?.children[index];
        item?.classList.toggle('pg-chart-panel__legend-item--hidden', !nowVisible);
        this.renderer.toggleSeries(index, nowVisible, this.currentData, {
            type: this.currentType,
            width: w,
            height: h,
            showLegend: false,
            showGrid: true,
            animationDuration: 400,
        });
    }
    downloadChart(format) {
        if (!this.canvasEl)
            return;
        let sourceCanvas = this.canvasEl;
        // JPEG has no alpha channel — composite onto a white background so
        // transparent areas don't render as solid black.
        if (format === 'jpeg') {
            const offscreen = document.createElement('canvas');
            offscreen.width = this.canvasEl.width;
            offscreen.height = this.canvasEl.height;
            const ctx = offscreen.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, offscreen.width, offscreen.height);
                ctx.drawImage(this.canvasEl, 0, 0);
                sourceCanvas = offscreen;
            }
        }
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = sourceCanvas.toDataURL(mimeType, 0.95);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${this.currentTitle || 'chart'}.${format}`;
        // Must be in the DOM for the click to trigger a download in all browsers.
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
//# sourceMappingURL=chart-panel.js.map