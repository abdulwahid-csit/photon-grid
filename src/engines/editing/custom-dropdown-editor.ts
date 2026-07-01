import type { ColumnDropdownOption } from '../../types/column.types';

export interface CustomDropdownCallbacks {
  /**
   * Called when the user highlights and commits an option.
   * Update the cell's pending value here before calling `onStop(true)`.
   */
  onSelect: (option: ColumnDropdownOption) => void;
  /**
   * Called when editing should end.
   * @param commit `true`  → apply the selected value (Enter / option click)
   *               `false` → discard (Escape / outside click)
   */
  onStop: (commit: boolean) => void;
  /**
   * Optional. Called when the user presses Tab (or Shift+Tab) to commit the
   * current selection and move editing focus to the adjacent cell.
   * @param shiftKey `true` → move backwards (Shift+Tab)
   */
  onTab?: (shiftKey: boolean) => void;
}

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
  /** Height of each option row in pixels. Keep in sync with CSS. */
  static readonly ITEM_HEIGHT   = 34;
  /** Maximum number of rows shown before the list scrolls. */
  static readonly MAX_VISIBLE   = 8;
  /** Extra rows rendered above/below the visible window for smooth scrolling. */
  static readonly SCROLL_BUFFER = 3;

  private static instanceCounter = 0;
  private readonly instanceId = ++CustomDropdownEditor.instanceCounter;

  private triggerEl!: HTMLElement;
  private panelEl!: HTMLElement;
  private scrollEl!: HTMLElement;
  private itemsEl!: HTMLElement;

  private highlightedIndex: number;
  private readonly selectedIndex: number;
  private destroyed = false;

  constructor(
    /** The cell's `.pg-cell__inner` element — the trigger is mounted here. */
    private readonly container: HTMLElement,
    /** The `.pg-cell` element — used to compute the panel's viewport position. */
    private readonly cellEl: HTMLElement,
    private readonly options: ColumnDropdownOption[],
    private readonly currentValue: unknown,
    private readonly callbacks: CustomDropdownCallbacks,
  ) {
    this.selectedIndex = this.options.findIndex(
      (o) => String(o.value) === String(currentValue ?? ''),
    );
    this.highlightedIndex = this.selectedIndex >= 0 ? this.selectedIndex : 0;
    this.mount();
  }

  /**
   * Tear down the editor: remove the panel from the DOM and detach all event
   * listeners.  Safe to call multiple times.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scrollEl?.removeEventListener('keydown', this.handleKeyDown);
    this.scrollEl?.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('mousedown', this.handleOutsideClick);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('scroll', this.handleBodyScroll, true);
    this.panelEl?.remove();
  }

  // ── Mount ──────────────────────────────────────────────────────────────────

  private mount(): void {
    this.buildTrigger();
    this.buildPanel();
    this.positionPanel();

    document.body.appendChild(this.panelEl);

    // Animate in on next frame (so the initial opacity:0 is applied first)
    requestAnimationFrame(() => {
      if (!this.destroyed) this.panelEl.classList.add('pg-dropdown-editor__panel--visible');
    });

    // Focus the scroll container for immediate keyboard control
    setTimeout(() => {
      if (this.destroyed) return;
      this.scrollEl.focus();
      // Scroll to show the selected / first item
      this.scrollToIndex(this.highlightedIndex, 'center');
    }, 0);

    // Defer outside-click listener to avoid immediate closure from the dblclick
    setTimeout(() => {
      if (this.destroyed) return;
      document.addEventListener('mousedown', this.handleOutsideClick);
    }, 0);

    window.addEventListener('resize', this.handleResize, { passive: true });
    document.addEventListener('scroll', this.handleBodyScroll, { passive: true, capture: true });
  }

  // ── Trigger (inside the cell) ──────────────────────────────────────────────

  private buildTrigger(): void {
    this.triggerEl = document.createElement('div');
    this.triggerEl.className = 'pg-dropdown-editor__trigger';
    this.triggerEl.setAttribute('aria-haspopup', 'listbox');
    this.triggerEl.setAttribute('aria-expanded', 'true');

    this.syncTrigger(this.options[this.selectedIndex]);

    this.container.innerHTML = '';
    this.container.appendChild(this.triggerEl);
  }

  private syncTrigger(opt?: ColumnDropdownOption): void {
    this.triggerEl.innerHTML = '';

    const icon = this.buildIcon(opt, 'pg-dropdown-editor__opt-icon');
    if (icon) this.triggerEl.appendChild(icon);

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

  private buildPanel(): void {
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
    } else {
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

  private renderVisibleItems(scrollTop: number): void {
    if (!this.itemsEl) return;

    const H     = CustomDropdownEditor.ITEM_HEIGHT;
    const BUF   = CustomDropdownEditor.SCROLL_BUFFER;
    const VIS   = CustomDropdownEditor.MAX_VISIBLE;
    const total = this.options.length;

    const startIdx = Math.max(0, Math.floor(scrollTop / H) - BUF);
    const endIdx   = Math.min(total, startIdx + VIS + BUF * 2);

    this.itemsEl.innerHTML = '';
    this.itemsEl.style.transform = `translateY(${startIdx * H}px)`;

    for (let i = startIdx; i < endIdx; i++) {
      const opt         = this.options[i];
      const isSelected  = i === this.selectedIndex;
      const isHighlight = i === this.highlightedIndex;

      const item = document.createElement('div');
      item.className = 'pg-dropdown-editor__option';
      item.id = this.optId(i);
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(isSelected));
      item.setAttribute('data-index', String(i));

      if (isSelected)  item.classList.add('pg-dropdown-editor__option--selected');
      if (isHighlight) item.classList.add('pg-dropdown-editor__option--highlighted');

      const icon = this.buildIcon(opt, 'pg-dropdown-editor__opt-icon');
      if (icon) item.appendChild(icon);

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

  private positionPanel(): void {
    const cellRect = this.cellEl.getBoundingClientRect();
    const H        = CustomDropdownEditor.ITEM_HEIGHT;
    const VIS      = Math.min(Math.max(this.options.length, 1), CustomDropdownEditor.MAX_VISIBLE);
    const panelH   = VIS * H;
    const panelW   = cellRect.width;
    const GAP      = 4;

    let top        = cellRect.bottom + GAP;
    let flipsAbove = false;

    if (window.innerHeight - cellRect.bottom < panelH + GAP && cellRect.top > panelH + GAP) {
      top        = cellRect.top - panelH - GAP;
      flipsAbove = true;
    }

    const left = Math.max(GAP, Math.min(cellRect.left, window.innerWidth - panelW - GAP));

    this.panelEl.style.top    = `${Math.max(GAP, top)}px`;
    this.panelEl.style.left   = `${left}px`;
    this.panelEl.style.width  = `${panelW}px`;

    this.panelEl.classList.toggle('pg-dropdown-editor__panel--above', flipsAbove);
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  private handleKeyDown = (e: KeyboardEvent): void => {
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

  private handleScroll = (): void => {
    this.renderVisibleItems(this.scrollEl.scrollTop);
  };

  private handleOutsideClick = (e: MouseEvent): void => {
    const target = e.target as Node;
    if (
      this.panelEl.contains(target) ||
      this.cellEl.contains(target)
    ) return;
    this.callbacks.onStop(false);
  };

  private handleResize = (): void => {
    this.positionPanel();
  };

  /**
   * Closes the dropdown immediately when any element outside the panel scrolls.
   * Catches both vertical and horizontal grid body scroll via capture-phase listener.
   * Scroll events originating inside the virtual-scroll list are excluded.
   */
  private handleBodyScroll = (e: Event): void => {
    if (this.destroyed) return;
    const target = e.target as Node;
    if (this.panelEl && this.panelEl.contains(target)) return;
    this.callbacks.onStop(false);
  };

  // ── Navigation helpers ─────────────────────────────────────────────────────

  private navigate(delta: number): void {
    const newIdx = Math.max(0, Math.min(this.options.length - 1, this.highlightedIndex + delta));
    this.setHighlight(newIdx);
    this.scrollToIndex(newIdx, delta > 0 ? 'end' : 'start');
  }

  private setHighlight(index: number): void {
    if (this.highlightedIndex === index) return;

    // Remove CSS class from the previously highlighted item without a full
    // re-render — re-rendering would detach the item under the cursor, causing
    // subsequent mousedown events to fire on a detached element and miss.
    const prevEl = this.itemsEl?.querySelector<HTMLElement>(
      `[data-index="${this.highlightedIndex}"]`,
    );
    prevEl?.classList.remove('pg-dropdown-editor__option--highlighted');

    this.highlightedIndex = index;

    const nextEl = this.itemsEl?.querySelector<HTMLElement>(
      `[data-index="${index}"]`,
    );
    nextEl?.classList.add('pg-dropdown-editor__option--highlighted');

    this.scrollEl?.setAttribute('aria-activedescendant', this.optId(index));
  }

  private scrollToIndex(index: number, align: 'start' | 'end' | 'center'): void {
    const H       = CustomDropdownEditor.ITEM_HEIGHT;
    const itemTop = index * H;
    const itemBot = itemTop + H;
    const curTop  = this.scrollEl.scrollTop;
    const height  = this.scrollEl.clientHeight;

    if (align === 'center') {
      this.scrollEl.scrollTop = Math.max(0, itemTop - height / 2 + H / 2);
    } else if (itemTop < curTop) {
      this.scrollEl.scrollTop = itemTop;
    } else if (itemBot > curTop + height) {
      this.scrollEl.scrollTop = itemBot - height;
    }
  }

  private selectIndex(index: number): void {
    if (index < 0 || index >= this.options.length) return;
    this.callbacks.onSelect(this.options[index]);
    this.callbacks.onStop(true);
  }

  // ── Utility ────────────────────────────────────────────────────────────────

  private buildIcon(opt: ColumnDropdownOption | undefined, cls: string): HTMLElement | null {
    if (!opt?.image && !opt?.icon) return null;

    const wrapper = document.createElement('span');
    wrapper.className = cls;

    if (opt.image) {
      const img  = document.createElement('img');
      img.src    = opt.image;
      img.alt    = '';
      img.width  = 20;
      img.height = 20;
      wrapper.appendChild(img);
    } else if (opt.icon) {
      wrapper.innerHTML = opt.icon;
    }

    return wrapper;
  }

  private optId(index: number): string {
    return `pg-dd-${this.instanceId}-${index}`;
  }
}
