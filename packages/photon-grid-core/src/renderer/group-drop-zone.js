import { createDiv } from './dom-utils';
export class GroupDropZone {
    constructor(store, groupingEngine, iconRenderer) {
        this.store = store;
        this.groupingEngine = groupingEngine;
        this.iconRenderer = iconRenderer;
        this.el = null;
        this.chipsEl = null;
        this.dockPos = 'top';
        this.outerRowEl = null;
        this.mainColEl = null;
        this.isDockDragging = false;
        this.dockIndicatorEl = null;
        this._onDockMove = null;
        this._onDockUp = null;
        this.draggingChipId = null;
        this.chipGhostEl = null;
        this.chipDropIndex = -1;
        this._onChipMove = null;
        this._onChipUp = null;
        this.isResizing = false;
        this.resizeStartSize = 0;
        this.resizeStartPos = 0;
        this._onResizeMove = null;
        this._onResizeUp = null;
        this.searchCallback = null;
        this.searchInputEl = null;
        this.searchClearEl = null;
        this.searchDebounceTimer = null;
    }
    mount(outerRowEl, mainColEl) {
        this.outerRowEl = outerRowEl;
        this.mainColEl = mainColEl;
        this.el = createDiv('pg-group-drop-zone pg-group-drop-zone--top');
        mainColEl.insertBefore(this.el, mainColEl.firstChild);
        this.buildStructure();
        this.render();
    }
    update() {
        this.render();
    }
    highlight(on) {
        this.chipsEl?.classList.toggle('pg-group-zone-chips--over', on);
    }
    isOver(x, y) {
        const rect = this.el?.getBoundingClientRect();
        if (!rect)
            return false;
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }
    isGrouped(colId) {
        return this.store.get('groupedColumnIds').includes(colId);
    }
    dropColumn(colId) {
        this.groupingEngine.addGroupColumn(colId);
    }
    removeColumn(colId) {
        this.groupingEngine.removeGroupColumn(colId);
    }
    setSearchCallback(fn) {
        this.searchCallback = fn;
    }
    destroy() {
        if (this.searchDebounceTimer !== null) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = null;
        }
        this.cleanupDockDrag();
        this.cleanupChipDrag();
        this.cleanupResize();
        this.el?.remove();
        this.el = null;
        this.chipsEl = null;
        this.searchInputEl = null;
        this.searchClearEl = null;
    }
    // ─── Build ──────────────────────────────────────────────────────────────────
    buildStructure() {
        if (!this.el)
            return;
        this.chipsEl = createDiv('pg-group-zone-chips');
        this.el.appendChild(this.chipsEl);
        // Search box — right side of the bar, hidden in left/right dock via CSS
        const searchWrap = createDiv('pg-group-search');
        const fieldEl = createDiv('pg-group-search__field');
        const iconEl = createDiv('pg-group-search__icon');
        iconEl.innerHTML = this.iconRenderer.renderToString('search', 14);
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'pg-group-search__input';
        input.placeholder = 'Search...';
        input.spellcheck = false;
        input.setAttribute('autocomplete', 'off');
        this.searchInputEl = input;
        const clearBtn = createDiv('pg-group-search__clear');
        clearBtn.innerHTML = this.iconRenderer.renderToString('close', 12);
        clearBtn.title = 'Clear search';
        this.searchClearEl = clearBtn;
        input.addEventListener('input', () => {
            const val = input.value;
            clearBtn.classList.toggle('pg-group-search__clear--visible', val.length > 0);
            if (this.searchDebounceTimer !== null)
                clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => {
                this.searchDebounceTimer = null;
                this.searchCallback?.(val);
            }, 180);
        });
        clearBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // keep input focused
            input.value = '';
            clearBtn.classList.remove('pg-group-search__clear--visible');
            if (this.searchDebounceTimer !== null) {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = null;
            }
            this.searchCallback?.('');
            input.focus();
        });
        fieldEl.appendChild(iconEl);
        fieldEl.appendChild(input);
        fieldEl.appendChild(clearBtn);
        searchWrap.appendChild(fieldEl);
        this.el.appendChild(searchWrap);
    }
    render() {
        if (!this.chipsEl)
            return;
        this.chipsEl.innerHTML = '';
        const groupedIds = this.store.get('groupedColumnIds');
        const allColumns = this.store.get('columns');
        const isVertical = this.dockPos === 'left' || this.dockPos === 'right';
        if (groupedIds.length === 0) {
            const hint = createDiv('pg-group-drop-zone__hint');
            hint.textContent = 'Drag a column here to group rows';
            this.chipsEl.appendChild(hint);
            return;
        }
        for (let i = 0; i < groupedIds.length; i++) {
            const colId = groupedIds[i];
            const col = allColumns.find((c) => c.colId === colId);
            if (!col)
                continue;
            if (i > 0 && !isVertical) {
                const sep = createDiv('pg-group-chip__sep');
                sep.innerHTML = this.iconRenderer.renderToString('chevronRight', 12);
                this.chipsEl.appendChild(sep);
            }
            const chip = createDiv('pg-group-chip');
            chip.setAttribute('data-col-id', colId);
            chip.setAttribute('data-chip-index', String(i));
            chip.style.cursor = 'grab';
            const labelEl = createDiv('pg-group-chip__label');
            labelEl.textContent = col.header;
            chip.appendChild(labelEl);
            const closeBtn = createDiv('pg-group-chip__close');
            closeBtn.innerHTML = this.iconRenderer.renderToString('close', 11);
            closeBtn.title = 'Remove grouping';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeColumn(colId);
            });
            chip.appendChild(closeBtn);
            chip.addEventListener('mousedown', (e) => {
                if (e.target.closest('.pg-group-chip__close'))
                    return;
                e.preventDefault();
                this.startChipDrag(e, colId, i);
            });
            this.chipsEl.appendChild(chip);
        }
    }
    // ─── Dock drag ─────────────────────────────────────────────────────────────
    startDockDrag(e) {
        this.isDockDragging = true;
        this.dockIndicatorEl = document.createElement('div');
        this.dockIndicatorEl.style.cssText =
            'position:fixed;pointer-events:none;z-index:99999;border:2px dashed var(--pg-colors-primary,#2563eb);background:var(--pg-colors-group-zone-over,rgba(37,99,235,0.1));border-radius:var(--pg-borders-radius-sm,4px);';
        document.body.appendChild(this.dockIndicatorEl);
        this._onDockMove = (ev) => this.onDockMove(ev);
        this._onDockUp = (ev) => this.onDockUp(ev);
        document.addEventListener('mousemove', this._onDockMove);
        document.addEventListener('mouseup', this._onDockUp);
        this.onDockMove(e);
    }
    onDockMove(e) {
        if (!this.isDockDragging || !this.el || !this.dockIndicatorEl)
            return;
        const gridEl = this.el.closest('.pg-grid');
        if (!gridEl)
            return;
        const gr = gridEl.getBoundingClientRect();
        const pct = (e.clientX - gr.left) / gr.width;
        if (pct < 0.2) {
            Object.assign(this.dockIndicatorEl.style, {
                left: `${gr.left}px`, top: `${gr.top}px`,
                width: '160px', height: `${gr.height}px`,
                borderRadius: '4px 0 0 4px',
            });
        }
        else if (pct > 0.8) {
            Object.assign(this.dockIndicatorEl.style, {
                left: `${gr.right - 160}px`, top: `${gr.top}px`,
                width: '160px', height: `${gr.height}px`,
                borderRadius: '0 4px 4px 0',
            });
        }
        else {
            Object.assign(this.dockIndicatorEl.style, {
                left: `${gr.left}px`, top: `${gr.top}px`,
                width: `${gr.width}px`, height: '48px',
                borderRadius: '4px 4px 0 0',
            });
        }
    }
    onDockUp(e) {
        if (!this.isDockDragging || !this.el) {
            this.cleanupDockDrag();
            return;
        }
        const gridEl = this.el.closest('.pg-grid');
        if (gridEl) {
            const gr = gridEl.getBoundingClientRect();
            const pct = (e.clientX - gr.left) / gr.width;
            const newDock = pct < 0.2 ? 'left' : pct > 0.8 ? 'right' : 'top';
            this.setDock(newDock);
        }
        this.cleanupDockDrag();
    }
    setDock(pos) {
        if (pos === this.dockPos || !this.el || !this.outerRowEl || !this.mainColEl)
            return;
        this.dockPos = pos;
        this.el.remove();
        this.el.classList.remove('pg-group-drop-zone--top', 'pg-group-drop-zone--left', 'pg-group-drop-zone--right');
        this.el.classList.add(`pg-group-drop-zone--${pos}`);
        this.el.style.height = '';
        this.el.style.width = '';
        if (pos === 'top') {
            this.mainColEl.insertBefore(this.el, this.mainColEl.firstChild);
        }
        else if (pos === 'left') {
            this.outerRowEl.insertBefore(this.el, this.mainColEl);
        }
        else {
            this.outerRowEl.appendChild(this.el);
        }
        this.render();
    }
    cleanupDockDrag() {
        this.isDockDragging = false;
        this.dockIndicatorEl?.remove();
        this.dockIndicatorEl = null;
        if (this._onDockMove)
            document.removeEventListener('mousemove', this._onDockMove);
        if (this._onDockUp)
            document.removeEventListener('mouseup', this._onDockUp);
        this._onDockMove = null;
        this._onDockUp = null;
    }
    // ─── Chip drag-reorder ─────────────────────────────────────────────────────
    startChipDrag(e, colId, index) {
        this.draggingChipId = colId;
        this.chipDropIndex = index;
        const col = this.store.get('columns').find((c) => c.colId === colId);
        const ghost = createDiv('pg-group-chip pg-group-chip--ghost');
        const ghostLabel = createDiv('pg-group-chip__label');
        ghostLabel.textContent = col?.header ?? colId;
        ghost.appendChild(ghostLabel);
        ghost.style.cssText = `position:fixed;pointer-events:none;z-index:99999;opacity:0.85;left:${e.clientX + 8}px;top:${e.clientY - 14}px;`;
        document.body.appendChild(ghost);
        this.chipGhostEl = ghost;
        this._onChipMove = (ev) => this.onChipMove(ev);
        this._onChipUp = (ev) => this.onChipUp(ev);
        document.addEventListener('mousemove', this._onChipMove);
        document.addEventListener('mouseup', this._onChipUp);
    }
    onChipMove(e) {
        if (!this.chipGhostEl || !this.chipsEl)
            return;
        this.chipGhostEl.style.left = `${e.clientX + 8}px`;
        this.chipGhostEl.style.top = `${e.clientY - 14}px`;
        const isVertical = this.dockPos === 'left' || this.dockPos === 'right';
        const chips = Array.from(this.chipsEl.querySelectorAll('.pg-group-chip:not(.pg-group-chip--ghost)'));
        let newIndex = chips.length;
        for (let i = 0; i < chips.length; i++) {
            const r = chips[i].getBoundingClientRect();
            const mid = isVertical ? (r.top + r.bottom) / 2 : (r.left + r.right) / 2;
            const pos = isVertical ? e.clientY : e.clientX;
            if (pos < mid) {
                newIndex = i;
                break;
            }
        }
        this.chipDropIndex = newIndex;
        for (const chip of chips) {
            chip.style.opacity = chip.getAttribute('data-col-id') === this.draggingChipId ? '0.3' : '';
        }
    }
    onChipUp(_e) {
        const fromId = this.draggingChipId;
        const toIndex = this.chipDropIndex;
        this.cleanupChipDrag();
        if (!fromId)
            return;
        const groupedIds = [...this.store.get('groupedColumnIds')];
        const fromIndex = groupedIds.indexOf(fromId);
        if (fromIndex === -1 || fromIndex === toIndex)
            return;
        groupedIds.splice(fromIndex, 1);
        const insertAt = toIndex > fromIndex ? Math.max(0, toIndex - 1) : toIndex;
        groupedIds.splice(insertAt, 0, fromId);
        this.groupingEngine.reorderGroupColumns(groupedIds);
    }
    cleanupChipDrag() {
        this.draggingChipId = null;
        this.chipDropIndex = -1;
        if (this.chipsEl) {
            for (const chip of Array.from(this.chipsEl.querySelectorAll('.pg-group-chip'))) {
                chip.style.opacity = '';
            }
        }
        this.chipGhostEl?.remove();
        this.chipGhostEl = null;
        if (this._onChipMove)
            document.removeEventListener('mousemove', this._onChipMove);
        if (this._onChipUp)
            document.removeEventListener('mouseup', this._onChipUp);
        this._onChipMove = null;
        this._onChipUp = null;
    }
    // ─── Resize ─────────────────────────────────────────────────────────────────
    startResize(e) {
        if (!this.el)
            return;
        this.isResizing = true;
        if (this.dockPos === 'top') {
            this.resizeStartSize = this.el.offsetHeight;
            this.resizeStartPos = e.clientY;
        }
        else {
            this.resizeStartSize = this.el.offsetWidth;
            this.resizeStartPos = e.clientX;
        }
        this._onResizeMove = (ev) => this.onResizeMove(ev);
        this._onResizeUp = () => this.cleanupResize();
        document.addEventListener('mousemove', this._onResizeMove);
        document.addEventListener('mouseup', this._onResizeUp);
    }
    onResizeMove(e) {
        if (!this.isResizing || !this.el)
            return;
        if (this.dockPos === 'top') {
            const delta = e.clientY - this.resizeStartPos;
            this.el.style.height = `${Math.max(48, this.resizeStartSize + delta)}px`;
        }
        else if (this.dockPos === 'left') {
            const delta = e.clientX - this.resizeStartPos;
            this.el.style.width = `${Math.max(80, this.resizeStartSize + delta)}px`;
        }
        else {
            const delta = this.resizeStartPos - e.clientX;
            this.el.style.width = `${Math.max(80, this.resizeStartSize + delta)}px`;
        }
    }
    cleanupResize() {
        this.isResizing = false;
        if (this._onResizeMove)
            document.removeEventListener('mousemove', this._onResizeMove);
        if (this._onResizeUp)
            document.removeEventListener('mouseup', this._onResizeUp);
        this._onResizeMove = null;
        this._onResizeUp = null;
    }
}
//# sourceMappingURL=group-drop-zone.js.map