import type { ColumnDef } from '../../types/column.types';
import type { ColumnFilter, FilterSetOption } from '../../types/filter.types';
import { FilterEditor } from './filter-editor';

export type { FilterSetOption } from '../../types/filter.types';

// ─── Public interfaces ────────────────────────────────────────────────────────

/**
 * Full configuration object passed to {@link FilterPanel} on construction.
 * The caller is responsible for supplying the unique-value list and wiring the
 * change and close callbacks.
 */
export interface FilterPanelConfig {
  /** Column definition for which the filter is being applied. */
  colDef: ColumnDef;
  /**
   * Element the panel anchors to (the filter-icon button in the column header).
   * Used for positioning the panel directly below the clicked button.
   */
  anchorEl: HTMLElement;
  /**
   * Grid wrapper element (`pg-grid`).  The panel is appended here so it clips
   * to the grid boundary and participates in its z-index stacking context.
   */
  containerEl: HTMLElement;
  /** Currently-applied filter, or `null` when no filter is active on this column. */
  currentFilter: ColumnFilter | null;
  /**
   * Pre-extracted unique value/label pairs for set-type (dropdown / array)
   * columns.  Passed in rather than derived here so the caller can cache or
   * sort them once instead of on every panel open.
   */
  uniqueOptions: FilterSetOption[];
  /** Called immediately when the user changes any filter state. */
  onFilterChange: (filter: ColumnFilter | null) => void;
  /** Called when the panel is closed by any means (click-outside, Escape, Clear). */
  onClose: () => void;
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────

/**
 * Floating filter panel rendered below a column header cell.
 *
 * The panel is appended to the grid's wrapper element (`pg-grid`) so that it
 * clips correctly and participates in the grid's z-index context. It is a thin
 * *shell* around {@link FilterEditor}: it owns positioning, the default footer
 * and dismissal (click-outside / Escape), while the actual condition/set filter
 * editing UI — and the assembly of a {@link ColumnFilter} from it — is delegated
 * to the shared editor so the header popup and the Filters Tool Panel stay
 * byte-for-byte consistent.
 *
 * ### Lifecycle
 * ```
 * const panel = new FilterPanel(config);
 * panel.open();       // renders + positions + attaches global listeners
 * // ... user interacts, onFilterChange is called in real-time ...
 * panel.destroy();    // unmounts and calls onClose
 * ```
 *
 * The caller should keep track of the open panel instance and call `destroy()`
 * before opening a new panel for another column.
 */
export class FilterPanel {
  private panelEl: HTMLElement | null = null;
  /** Shared, embeddable filter-editing body. Built in {@link open}. */
  private editor: FilterEditor | null = null;

  private readonly boundClickOutside: (e: MouseEvent) => void;
  private readonly boundEscapeKey: (e: KeyboardEvent) => void;
  private readonly boundTrapKey: (e: KeyboardEvent) => void;

  constructor(private readonly config: FilterPanelConfig) {
    this.boundClickOutside = this.handleClickOutside.bind(this);
    this.boundEscapeKey = this.handleEscapeKey.bind(this);
    this.boundTrapKey = this.handleTrapKey.bind(this);
  }

  /**
   * Renders the panel DOM, appends it to the container, positions it below the
   * anchor element, and attaches global click-outside / Escape listeners.
   */
  open(): void {
    const panel = document.createElement('div');
    panel.className = 'pg-filter-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', `Filter: ${this.config.colDef.header}`);

    this.editor = new FilterEditor({
      colDef: this.config.colDef,
      currentFilter: this.config.currentFilter,
      uniqueOptions: this.config.uniqueOptions,
      onFilterChange: this.config.onFilterChange,
      anchorEl: this.config.anchorEl,
      onRequestClose: () => this.destroy(),
    });

    this.panelEl = panel;
    this.config.containerEl.appendChild(panel);

    // The editor's set-filter virtual list reads client dimensions, so the host
    // must be attached before render — hence render after appendChild.
    this.editor.render(panel);

    // A custom filter renderer owns its own apply/clear affordances via the
    // callbacks it already received — the default footer only applies to
    // Photon Grid's own condition/set filter UI.
    if (this.editor.hasDefaultFooter) {
      panel.appendChild(this.buildFooter());
    }

    this.position();

    // Trap Tab within the dialog so keyboard focus cannot escape into the grid
    // behind it (WAI-ARIA dialog pattern).
    panel.addEventListener('keydown', this.boundTrapKey);

    // Defer global listeners so the click that opened the panel is not caught
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', this.boundClickOutside, true);
      document.addEventListener('keydown', this.boundEscapeKey, true);
      // Move focus into the panel so keyboard users land on the first field.
      this.focusFirstField();
    });
  }

  /** Removes the panel from the DOM and fires the `onClose` callback. */
  destroy(): void {
    document.removeEventListener('mousedown', this.boundClickOutside, true);
    document.removeEventListener('keydown', this.boundEscapeKey, true);
    this.editor?.destroy();
    this.editor = null;
    this.panelEl?.remove();
    this.panelEl = null;
    this.config.onClose();
  }

  // ─── Footer ───────────────────────────────────────────────────────────────

  private buildFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'pg-filter-panel__footer';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'pg-filter-panel__clear-btn';
    clearBtn.textContent = 'Clear Filter';
    clearBtn.addEventListener('click', () => {
      this.config.onFilterChange(null);
      this.destroy();
    });

    footer.appendChild(clearBtn);
    return footer;
  }

  // ─── Positioning ──────────────────────────────────────────────────────────

  private position(): void {
    if (!this.panelEl) return;

    const anchorRect = this.config.anchorEl.getBoundingClientRect();
    const containerRect = this.config.containerEl.getBoundingClientRect();

    let top = anchorRect.bottom - containerRect.top;
    let left = anchorRect.left - containerRect.left;

    // Force a layout so we can read dimensions
    const panelW = this.panelEl.offsetWidth || 280;
    const containerW = containerRect.width;

    // Clamp right edge
    if (left + panelW > containerW) {
      left = Math.max(0, containerW - panelW);
    }
    // Clamp bottom edge — flip upward if needed
    const panelH = this.panelEl.offsetHeight || 300;
    const remainingH = containerRect.height - top;
    if (remainingH < panelH && top > panelH) {
      top = anchorRect.top - containerRect.top - panelH;
    }

    this.panelEl.style.top = `${Math.max(0, top)}px`;
    this.panelEl.style.left = `${Math.max(0, left)}px`;
  }

  // ─── Global event handlers ────────────────────────────────────────────────

  private handleClickOutside(e: MouseEvent): void {
    const target = e.target as Node;
    if (this.panelEl?.contains(target) || this.config.anchorEl?.contains(target)) return;
    this.destroy();
  }

  private handleEscapeKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      // Return focus to the funnel button that opened the panel.
      const anchor = this.config.anchorEl;
      this.destroy();
      anchor?.focus();
    }
  }

  /**
   * Focus-trap handler: keeps Tab / Shift+Tab cycling within the panel's own
   * focusable elements, wrapping at the ends. Attached to the panel element.
   */
  private handleTrapKey(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const items = this.getFocusableElements();
    if (items.length === 0) return;
    const first  = items[0];
    const last   = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inPanel = !!active && this.panelEl?.contains(active);

    if (e.shiftKey) {
      if (!inPanel || active === first) { e.preventDefault(); last.focus(); }
    } else if (!inPanel || active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /** Focus the first focusable field when the panel opens. */
  private focusFirstField(): void {
    this.getFocusableElements()[0]?.focus();
  }

  /** All tabbable elements within the panel, in DOM order. */
  private getFocusableElements(): HTMLElement[] {
    if (!this.panelEl) return [];
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(this.panelEl.querySelectorAll<HTMLElement>(selector));
  }
}
