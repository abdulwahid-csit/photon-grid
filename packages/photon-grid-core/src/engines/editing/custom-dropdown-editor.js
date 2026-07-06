/**
 * Accessible, virtually-scrolled custom dropdown editor for `dropdown` and
 * `object` column types.
 *
 * The list panel is appended to `document.body` with `position: fixed` so it
 * escapes the grid's `overflow: hidden` without requiring a portal container.
 *
 * Keyboard shortcuts:
 * - ArrowDown / ArrowUp  — move highlight one row
 * - PageDown / PageUp    — move highlight one page
 * - Home / End           — jump to first / last option
 * - Enter                — commit the highlighted option
 * - Escape / Tab         — cancel (close without change)
 */
export class CustomDropdownEditor {
    constructor(
    /** The cell's `.pg-cell__inner` element — the trigger is mounted here. */
    container, 
    /** The `.pg-cell` element — used to compute the panel's viewport position. */
    cellEl, options, currentValue, callbacks) {
        this.container = container;
        this.cellEl = cellEl;
        this.options = options;
        this.currentValue = currentValue;
        this.callbacks = callbacks;
        this.instanceId = ++CustomDropdownEditor.instanceCounter;
        this.destroyed = false;
        // ── Event handlers ─────────────────────────────────────────────────────────
        this.handleKeyDown = (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigate(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigate(-1);
                    break;
                case 'PageDown':
                    e.preventDefault();
                    this.navigate(CustomDropdownEditor.MAX_VISIBLE);
                    break;
                case 'PageUp':
                    e.preventDefault();
                    this.navigate(-CustomDropdownEditor.MAX_VISIBLE);
                    break;
                case 'Home':
                    e.preventDefault();
                    this.setHighlight(0);
                    this.scrollToIndex(0, 'start');
                    break;
                case 'End':
                    e.preventDefault();
                    this.setHighlight(this.options.length - 1);
                    this.scrollToIndex(this.options.length - 1, 'end');
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.selectIndex(this.highlightedIndex);
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.callbacks.onStop(false);
                    break;
                case 'Tab':
                    e.preventDefault();
                    this.callbacks.onStop(true);
                    this.callbacks.onTab?.(e.shiftKey);
                    break;
            }
            e.stopPropagation();
        };
        this.handleScroll = () => {
            this.renderVisibleItems(this.scrollEl.scrollTop);
        };
        this.handleOutsideClick = (e) => {
            const target = e.target;
            if (this.panelEl.contains(target) ||
                this.cellEl.contains(target))
                return;
            this.callbacks.onStop(false);
        };
        this.handleResize = () => {
            this.positionPanel();
        };
        /**
         * Closes the dropdown immediately when any element outside the panel scrolls.
         * Catches both vertical and horizontal grid body scroll via capture-phase listener.
         * Scroll events originating inside the virtual-scroll list are excluded.
         */
        this.handleBodyScroll = (e) => {
            if (this.destroyed)
                return;
            const target = e.target;
            if (this.panelEl && this.panelEl.contains(target))
                return;
            this.callbacks.onStop(false);
        };
        this.selectedIndex = this.options.findIndex((o) => String(o.value) === String(currentValue ?? ''));
        this.highlightedIndex = this.selectedIndex >= 0 ? this.selectedIndex : 0;
        this.mount();
    }
    /**
     * Tear down the editor: remove the panel from the DOM and detach all event
     * listeners.  Safe to call multiple times.
     */
    destroy() {
        if (this.destroyed)
            return;
        this.destroyed = true;
        this.scrollEl?.removeEventListener('keydown', this.handleKeyDown);
        this.scrollEl?.removeEventListener('scroll', this.handleScroll);
        document.removeEventListener('mousedown', this.handleOutsideClick);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('scroll', this.handleBodyScroll, true);
        this.panelEl?.remove();
    }
    // ── Mount ──────────────────────────────────────────────────────────────────
    mount() {
        this.buildTrigger();
        this.buildPanel();
        this.positionPanel();
        document.body.appendChild(this.panelEl);
        // Animate in on next frame (so the initial opacity:0 is applied first)
        requestAnimationFrame(() => {
            if (!this.destroyed)
                this.panelEl.classList.add('pg-dropdown-editor__panel--visible');
        });
        // Focus the scroll container for immediate keyboard control
        setTimeout(() => {
            if (this.destroyed)
                return;
            this.scrollEl.focus();
            // Scroll to show the selected / first item
            this.scrollToIndex(this.highlightedIndex, 'center');
        }, 0);
        // Defer outside-click listener to avoid immediate closure from the dblclick
        setTimeout(() => {
            if (this.destroyed)
                return;
            document.addEventListener('mousedown', this.handleOutsideClick);
        }, 0);
        window.addEventListener('resize', this.handleResize, { passive: true });
        document.addEventListener('scroll', this.handleBodyScroll, { passive: true, capture: true });
    }
    // ── Trigger (inside the cell) ──────────────────────────────────────────────
    buildTrigger() {
        this.triggerEl = document.createElement('div');
        this.triggerEl.className = 'pg-dropdown-editor__trigger';
        this.triggerEl.setAttribute('aria-haspopup', 'listbox');
        this.triggerEl.setAttribute('aria-expanded', 'true');
        this.syncTrigger(this.options[this.selectedIndex]);
        this.container.innerHTML = '';
        this.container.appendChild(this.triggerEl);
    }
    syncTrigger(opt) {
        this.triggerEl.innerHTML = '';
        const icon = this.buildIcon(opt, 'pg-dropdown-editor__opt-icon');
        if (icon)
            this.triggerEl.appendChild(icon);
        const label = document.createElement('span');
        label.className = 'pg-dropdown-editor__trigger-label';
        label.textContent = opt?.label ?? '—';
        this.triggerEl.appendChild(label);
        const arrow = document.createElement('span');
        arrow.className = 'pg-dropdown-editor__arrow';
        arrow.setAttribute('aria-hidden', 'true');
        this.triggerEl.appendChild(arrow);
    }
    // ── Panel (appended to document.body) ─────────────────────────────────────
    buildPanel() {
        this.panelEl = document.createElement('div');
        this.panelEl.className = 'pg-dropdown-editor__panel';
        const visibleCount = Math.min(Math.max(this.options.length, 1), CustomDropdownEditor.MAX_VISIBLE);
        const panelH = visibleCount * CustomDropdownEditor.ITEM_HEIGHT;
        this.scrollEl = document.createElement('div');
        this.scrollEl.className = 'pg-dropdown-editor__scroll';
        this.scrollEl.setAttribute('role', 'listbox');
        this.scrollEl.setAttribute('tabindex', '0');
        this.scrollEl.setAttribute('aria-label', 'Select an option');
        this.scrollEl.style.height = `${panelH}px`;
        this.scrollEl.addEventListener('keydown', this.handleKeyDown);
        this.scrollEl.addEventListener('scroll', this.handleScroll, { passive: true });
        if (this.options.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'pg-dropdown-editor__empty';
            empty.textContent = 'No options available';
            this.scrollEl.appendChild(empty);
        }
        else {
            const spacer = document.createElement('div');
            spacer.className = 'pg-dropdown-editor__spacer';
            spacer.style.height = `${this.options.length * CustomDropdownEditor.ITEM_HEIGHT}px`;
            this.itemsEl = document.createElement('div');
            this.itemsEl.className = 'pg-dropdown-editor__items';
            spacer.appendChild(this.itemsEl);
            this.scrollEl.appendChild(spacer);
            this.renderVisibleItems(0);
        }
        this.panelEl.appendChild(this.scrollEl);
    }
    // ── Virtual rendering ──────────────────────────────────────────────────────
    renderVisibleItems(scrollTop) {
        if (!this.itemsEl)
            return;
        const H = CustomDropdownEditor.ITEM_HEIGHT;
        const BUF = CustomDropdownEditor.SCROLL_BUFFER;
        const VIS = CustomDropdownEditor.MAX_VISIBLE;
        const total = this.options.length;
        const startIdx = Math.max(0, Math.floor(scrollTop / H) - BUF);
        const endIdx = Math.min(total, startIdx + VIS + BUF * 2);
        this.itemsEl.innerHTML = '';
        this.itemsEl.style.transform = `translateY(${startIdx * H}px)`;
        for (let i = startIdx; i < endIdx; i++) {
            const opt = this.options[i];
            const isSelected = i === this.selectedIndex;
            const isHighlight = i === this.highlightedIndex;
            const item = document.createElement('div');
            item.className = 'pg-dropdown-editor__option';
            item.id = this.optId(i);
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(isSelected));
            item.setAttribute('data-index', String(i));
            if (isSelected)
                item.classList.add('pg-dropdown-editor__option--selected');
            if (isHighlight)
                item.classList.add('pg-dropdown-editor__option--highlighted');
            if (this.callbacks.renderOption) {
                const rendered = this.callbacks.renderOption(opt, i, isSelected, isHighlight);
                if (typeof rendered === 'string') {
                    item.innerHTML = rendered;
                }
                else {
                    item.appendChild(rendered);
                }
            }
            else {
                const icon = this.buildIcon(opt, 'pg-dropdown-editor__opt-icon');
                if (icon)
                    item.appendChild(icon);
                const label = document.createElement('span');
                label.className = 'pg-dropdown-editor__opt-label';
                label.textContent = opt.label;
                item.appendChild(label);
                if (isSelected) {
                    const check = document.createElement('span');
                    check.className = 'pg-dropdown-editor__opt-check';
                    check.setAttribute('aria-hidden', 'true');
                    item.appendChild(check);
                }
            }
            // mousedown: prevent focus loss from scroll container, then select
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.selectIndex(i);
            });
            // Hover highlight
            item.addEventListener('mouseenter', () => this.setHighlight(i));
            this.itemsEl.appendChild(item);
        }
        // Keep ARIA active descendant in sync
        this.scrollEl.setAttribute('aria-activedescendant', this.optId(this.highlightedIndex));
    }
    // ── Positioning ────────────────────────────────────────────────────────────
    positionPanel() {
        const cellRect = this.cellEl.getBoundingClientRect();
        const H = CustomDropdownEditor.ITEM_HEIGHT;
        const VIS = Math.min(Math.max(this.options.length, 1), CustomDropdownEditor.MAX_VISIBLE);
        const panelH = VIS * H;
        const panelW = cellRect.width;
        const GAP = 4;
        let top = cellRect.bottom + GAP;
        let flipsAbove = false;
        if (window.innerHeight - cellRect.bottom < panelH + GAP && cellRect.top > panelH + GAP) {
            top = cellRect.top - panelH - GAP;
            flipsAbove = true;
        }
        const left = Math.max(GAP, Math.min(cellRect.left, window.innerWidth - panelW - GAP));
        this.panelEl.style.top = `${Math.max(GAP, top)}px`;
        this.panelEl.style.left = `${left}px`;
        this.panelEl.style.width = `${panelW}px`;
        this.panelEl.classList.toggle('pg-dropdown-editor__panel--above', flipsAbove);
    }
    // ── Navigation helpers ─────────────────────────────────────────────────────
    navigate(delta) {
        const newIdx = Math.max(0, Math.min(this.options.length - 1, this.highlightedIndex + delta));
        this.setHighlight(newIdx);
        this.scrollToIndex(newIdx, delta > 0 ? 'end' : 'start');
    }
    setHighlight(index) {
        if (this.highlightedIndex === index)
            return;
        // Remove CSS class from the previously highlighted item without a full
        // re-render — re-rendering would detach the item under the cursor, causing
        // subsequent mousedown events to fire on a detached element and miss.
        const prevEl = this.itemsEl?.querySelector(`[data-index="${this.highlightedIndex}"]`);
        prevEl?.classList.remove('pg-dropdown-editor__option--highlighted');
        this.highlightedIndex = index;
        const nextEl = this.itemsEl?.querySelector(`[data-index="${index}"]`);
        nextEl?.classList.add('pg-dropdown-editor__option--highlighted');
        this.scrollEl?.setAttribute('aria-activedescendant', this.optId(index));
    }
    scrollToIndex(index, align) {
        const H = CustomDropdownEditor.ITEM_HEIGHT;
        const itemTop = index * H;
        const itemBot = itemTop + H;
        const curTop = this.scrollEl.scrollTop;
        const height = this.scrollEl.clientHeight;
        if (align === 'center') {
            this.scrollEl.scrollTop = Math.max(0, itemTop - height / 2 + H / 2);
        }
        else if (itemTop < curTop) {
            this.scrollEl.scrollTop = itemTop;
        }
        else if (itemBot > curTop + height) {
            this.scrollEl.scrollTop = itemBot - height;
        }
    }
    selectIndex(index) {
        if (index < 0 || index >= this.options.length)
            return;
        this.callbacks.onSelect(this.options[index]);
        this.callbacks.onStop(true);
    }
    // ── Utility ────────────────────────────────────────────────────────────────
    buildIcon(opt, cls) {
        if (!opt?.image && !opt?.icon)
            return null;
        const wrapper = document.createElement('span');
        wrapper.className = cls;
        if (opt.image) {
            const img = document.createElement('img');
            img.src = opt.image;
            img.alt = '';
            img.width = 20;
            img.height = 20;
            wrapper.appendChild(img);
        }
        else if (opt.icon) {
            wrapper.innerHTML = opt.icon;
        }
        return wrapper;
    }
    optId(index) {
        return `pg-dd-${this.instanceId}-${index}`;
    }
}
/** Height of each option row in pixels. Keep in sync with CSS. */
CustomDropdownEditor.ITEM_HEIGHT = 34;
/** Maximum number of rows shown before the list scrolls. */
CustomDropdownEditor.MAX_VISIBLE = 8;
/** Extra rows rendered above/below the visible window for smooth scrolling. */
CustomDropdownEditor.SCROLL_BUFFER = 3;
CustomDropdownEditor.instanceCounter = 0;
//# sourceMappingURL=custom-dropdown-editor.js.map