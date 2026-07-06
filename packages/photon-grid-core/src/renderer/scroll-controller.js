export class ScrollController {
    constructor() {
        this.scrollTop = 0;
        this.scrollLeft = 0;
        this.totalHeight = 0;
        this.totalCenterWidth = 0;
        this.viewportHeight = 0;
        this.centerViewportWidth = 0;
        this.gridEl = null;
        this.sbVNativeEl = null;
        this.sbVSpacerEl = null;
        this.sbHNativeEl = null;
        this.sbHSpacerEl = null;
        this.sbHRowEl = null;
        this.abortCtrl = null;
        this.resizeObs = null;
        this.scrollYCb = null;
        this.scrollXCb = null;
        /**
         * When `true`, the vertical scrollbar column is never collapsed to 0 width
         * — it stays reserved (a "stable gutter") even while `totalHeight <=
         * viewportHeight`. Set for Master/Detail grids: expanding/collapsing a
         * detail row changes total content height, which can tip whether a
         * scrollbar is needed at all — if the column collapsed and reappeared with
         * it, every flex column would jump to fill/re-cede that space on every
         * toggle. Reserving it unconditionally makes that a non-event.
         */
        this.reserveVerticalGutter = false;
        this.onVNativeScroll = () => {
            const st = this.sbVNativeEl.scrollTop;
            if (Math.abs(st - this.scrollTop) < 0.5)
                return;
            this.scrollTop = st;
            this.syncCSSVars();
            this.scrollYCb?.(st);
        };
        this.onHNativeScroll = () => {
            const sl = this.sbHNativeEl.scrollLeft;
            if (Math.abs(sl - this.scrollLeft) < 0.5)
                return;
            this.scrollLeft = sl;
            this.syncCSSVars();
            this.scrollXCb?.();
        };
        this.onWheel = (e) => {
            if (e.ctrlKey)
                return;
            // The Photon AI panel floats as a sibling overlay inside this same
            // `.pg-grid__body` (see `GridRenderer.buildLayout`/`PhotonAIPanel.mount`),
            // so a wheel event over its own scrollable chat log still bubbles up to
            // this listener. Left unchecked, `preventDefault` below blocks the
            // panel's native scroll entirely and redirects the gesture into scrolling
            // the grid underneath it instead — bail out here so the panel scrolls itself.
            if (e.target?.closest('.pg-ai-panel'))
                return;
            e.preventDefault();
            // A nested Master/Detail grid's body sits inside the parent grid's own
            // `.pg-grid__body` (a sibling of the pinned panels, not a descendant of
            // them — see DetailRowRenderer). Without stopping propagation here, a
            // wheel event this grid already handled keeps bubbling and also reaches
            // the parent grid's own wheel listener on that shared ancestor, scrolling
            // both grids from a single gesture (most visible on horizontal-dominant
            // scrolls, and intermittently on trackpads whose "vertical" gestures emit
            // a small stray deltaX).
            e.stopPropagation();
            let dx = e.deltaX;
            let dy = e.deltaY;
            if (e.deltaMode === 1 /* DOM_DELTA_LINE */) {
                dx *= 32;
                dy *= 32;
            }
            else if (e.deltaMode === 2 /* DOM_DELTA_PAGE */) {
                dx *= this.centerViewportWidth;
                dy *= this.viewportHeight;
            }
            if (e.shiftKey || Math.abs(dx) > Math.abs(dy)) {
                this.scrollToX(this.scrollLeft + (e.deltaX !== 0 ? dx : dy));
            }
            else {
                this.scrollToY(this.scrollTop + dy);
            }
        };
    }
    onScrollY(cb) { this.scrollYCb = cb; }
    onScrollX(cb) { this.scrollXCb = cb; }
    setReserveVerticalGutter(reserve) {
        this.reserveVerticalGutter = reserve;
    }
    mount(gridEl, bodyEl, centerBodyEl, sbVNativeEl, sbVSpacerEl, sbHNativeEl, sbHSpacerEl, sbHRowEl) {
        this.gridEl = gridEl;
        this.sbVNativeEl = sbVNativeEl;
        this.sbVSpacerEl = sbVSpacerEl;
        this.sbHNativeEl = sbHNativeEl;
        this.sbHSpacerEl = sbHSpacerEl;
        this.sbHRowEl = sbHRowEl ?? sbHNativeEl;
        const ac = new AbortController();
        this.abortCtrl = ac;
        const sig = ac.signal;
        bodyEl.addEventListener('wheel', this.onWheel, { passive: false, signal: sig });
        const headerEl = gridEl.querySelector('.pg-grid__header');
        headerEl?.addEventListener('wheel', this.onWheel, { passive: false, signal: sig });
        sbVNativeEl.addEventListener('scroll', this.onVNativeScroll, { signal: sig });
        sbHNativeEl.addEventListener('scroll', this.onHNativeScroll, { signal: sig });
        this.resizeObs = new ResizeObserver(() => {
            this.viewportHeight = bodyEl.clientHeight;
            this.centerViewportWidth = centerBodyEl.clientWidth;
            this.clampScroll();
            this.syncCSSVars();
            this.syncScrollbars();
            this.scrollXCb?.();
        });
        this.resizeObs.observe(bodyEl);
        this.resizeObs.observe(centerBodyEl);
        this.viewportHeight = bodyEl.clientHeight;
        this.centerViewportWidth = centerBodyEl.clientWidth;
    }
    updateSizes(totalHeight, totalCenterWidth) {
        this.totalHeight = totalHeight;
        this.totalCenterWidth = totalCenterWidth;
        if (this.sbVSpacerEl)
            this.sbVSpacerEl.style.height = `${totalHeight}px`;
        if (this.sbHSpacerEl)
            this.sbHSpacerEl.style.width = `${totalCenterWidth}px`;
        this.clampScroll();
        this.syncCSSVars();
        this.syncScrollbars();
    }
    getScrollTop() { return this.scrollTop; }
    getScrollLeft() { return this.scrollLeft; }
    /** Returns the current visible height of the body viewport in pixels. */
    getViewportHeight() { return this.viewportHeight; }
    /** Returns the current visible width of the center body viewport in pixels. */
    getCenterViewportWidth() { return this.centerViewportWidth; }
    canScrollLeft() { return this.scrollLeft > 0; }
    canScrollRight() { return this.scrollLeft < Math.max(0, this.totalCenterWidth - this.centerViewportWidth); }
    canScrollUp() { return this.scrollTop > 0; }
    canScrollDown() { return this.scrollTop < Math.max(0, this.totalHeight - this.viewportHeight); }
    scrollToY(y) {
        const max = Math.max(0, this.totalHeight - this.viewportHeight);
        const next = Math.max(0, Math.min(y, max));
        if (next === this.scrollTop)
            return;
        this.scrollTop = next;
        this.syncCSSVars();
        this.syncScrollbars();
        if (this.sbVNativeEl)
            this.sbVNativeEl.scrollTop = next;
        this.scrollYCb?.(this.scrollTop);
    }
    scrollToX(x) {
        const max = Math.max(0, this.totalCenterWidth - this.centerViewportWidth);
        const next = Math.max(0, Math.min(x, max));
        if (next === this.scrollLeft)
            return;
        this.scrollLeft = next;
        this.syncCSSVars();
        this.syncScrollbars();
        if (this.sbHNativeEl)
            this.sbHNativeEl.scrollLeft = next;
        this.scrollXCb?.();
    }
    scrollToRow(rowIndex, rows) {
        if (rowIndex >= 0 && rowIndex < rows.length)
            this.scrollToY(rows[rowIndex].top);
    }
    scrollToTop() { this.scrollToY(0); }
    destroy() {
        this.abortCtrl?.abort();
        this.abortCtrl = null;
        this.resizeObs?.disconnect();
        this.resizeObs = null;
    }
    clampScroll() {
        this.scrollTop = Math.max(0, Math.min(this.scrollTop, Math.max(0, this.totalHeight - this.viewportHeight)));
        this.scrollLeft = Math.max(0, Math.min(this.scrollLeft, Math.max(0, this.totalCenterWidth - this.centerViewportWidth)));
    }
    syncCSSVars() {
        if (!this.gridEl)
            return;
        this.gridEl.style.setProperty('--pg-scroll-x', `-${this.scrollLeft}px`);
        this.gridEl.style.setProperty('--pg-scroll-y', `-${this.scrollTop}px`);
    }
    syncScrollbars() {
        if (this.sbVNativeEl) {
            const vHidden = !this.reserveVerticalGutter && this.totalHeight <= this.viewportHeight;
            this.sbVNativeEl.classList.toggle('pg-scrollbar--hidden', vHidden);
            // Master/Detail's full-width overlay layer spans the entire body
            // (including the vertical scrollbar's flex-allocated column) so its
            // rows can be positioned with simple `top` offsets. This live var lets
            // it carve out exactly the scrollbar's *current* width — 0 when hidden,
            // matching the real column layout — so it never visually paints over
            // the native scrollbar when one is showing.
            this.gridEl?.style.setProperty('--pg-scrollbar-v-live-width', vHidden ? '0px' : 'var(--pg-scrollbar-v-width, 17px)');
        }
        if (this.sbHRowEl) {
            this.sbHRowEl.classList.toggle('pg-scrollbar--hidden', this.totalCenterWidth <= this.centerViewportWidth);
        }
    }
}
//# sourceMappingURL=scroll-controller.js.map