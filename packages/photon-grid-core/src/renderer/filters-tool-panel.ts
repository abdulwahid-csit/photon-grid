import type { ColumnDef } from '../types/column.types';
import type { ColumnFilter, FilterModel, FilterSetOption } from '../types/filter.types';
import type { FiltersToolPanelConfig } from '../types/grid.types';
import type { IconRenderer } from '../icons/icon-renderer';
import { FilterEditor } from '../engines/filter/filter-editor';
import { createDiv, createElement } from './dom-utils';

/**
 * Collaborators the {@link FiltersToolPanel} needs from the grid, injected so
 * the panel stays a pure-UI component that owns no grid state of its own.
 */
export interface FiltersToolPanelDeps {
  /** Renders themed, registry-backed icons (funnel, chevrons, add, close). */
  readonly iconRenderer: IconRenderer;
  /**
   * Live, flat leaf column definitions (groups already flattened by the
   * `ColumnModel`). Used to populate the Add-Filter picker and to resolve a
   * `colId` from the filter model back to its column when reconciling.
   */
  readonly getColumns: () => ColumnDef[];
  /** Current applied filter model — drives the badge count and picker exclusions. */
  readonly getFilterModel: () => FilterModel;
  /**
   * Lazily extracts unique value/label pairs for a set-type column's checkbox
   * list. Called only when a section is first expanded, so unexpanded columns
   * never pay the `allRows` scan.
   */
  readonly getUniqueOptions: (colDef: ColumnDef) => FilterSetOption[];
  /**
   * Write path — applies (or clears with `null`) a column's filter through the
   * grid's single {@link import('../engines/filter/filter-engine').FilterEngine},
   * then re-runs the data pipeline. Keeps this panel, the header funnel and the
   * public API mutually consistent.
   */
  readonly onFilterChange: (colId: string, filter: ColumnFilter | null) => void;
}

/** Internal per-column section view-state. */
interface FilterSection {
  /** Column this section edits. */
  readonly colDef: ColumnDef;
  /** Section wrapper element (header row + body). */
  readonly rootEl: HTMLElement;
  /** Chevron expand/collapse button in the section header. */
  readonly toggleEl: HTMLButtonElement;
  /** Body host the {@link FilterEditor} renders into (hidden while collapsed). */
  readonly bodyEl: HTMLElement;
  /** Lazily-constructed on first expand; `null` until then. */
  editor: FilterEditor | null;
  /** Whether the section body is currently expanded. */
  expanded: boolean;
  /**
   * `true` once this column has had a non-null filter applied. Distinguishes a
   * freshly-added, not-yet-configured section (which an external
   * `clearAllFilters` must not yank) from one that reflects a real applied
   * filter (which it should remove).
   */
  appliedOnce: boolean;
}

/**
 * The **Filters Tool Panel** — a filter funnel button anchored to the grid's
 * top-right corner that opens a floating panel for managing *all* column
 * filters in one place.
 *
 * The panel starts with an **Add Filter** action; choosing a column from its
 * searchable picker adds a collapsible section whose body is the exact same
 * condition/set filter editor used by the per-column header popup (both share
 * {@link FilterEditor}). Sections can be expanded/collapsed via a chevron and
 * removed via an ✕; the funnel button shows a badge with the active-filter
 * count.
 *
 * It is opt-in (`GridOptions.filtersToolPanel.enabled`) and pure UI: it never
 * filters rows itself, only calling {@link FiltersToolPanelDeps.onFilterChange}
 * and reflecting the model back via {@link syncFromModel}. Every visual is
 * class-driven — all colors, spacing, radii and typography come from theme CSS
 * variables (see `filters-tool-panel.css.ts`); the component sets no inline
 * styles.
 */
export class FiltersToolPanel {
  private wrapperEl: HTMLElement | null = null;
  private launcherEl: HTMLButtonElement | null = null;
  private launcherIconEl: HTMLElement | null = null;
  private badgeEl: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;
  private sectionsEl: HTMLElement | null = null;
  private emptyEl: HTMLElement | null = null;
  private addBtnEl: HTMLButtonElement | null = null;
  private addDropdownEl: HTMLElement | null = null;

  private isOpen = false;

  /** colId → section view-state, in insertion order. */
  private readonly sections = new Map<string, FilterSection>();

  /**
   * Guards {@link syncFromModel} against reacting to this panel's *own* writes:
   * while set, sync only refreshes the badge and skips section reconciliation,
   * so a user clearing a set-filter back to "all selected" (which drops the
   * column from the model) does not tear its own section down.
   */
  private selfUpdating = false;

  private readonly boundOutsideDown: (e: MouseEvent) => void;
  private readonly boundKeydown: (e: KeyboardEvent) => void;

  constructor(private readonly deps: FiltersToolPanelDeps) {
    this.boundKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (this.addDropdownEl) {
        this.closeAddDropdown();
      } else if (this.isOpen) {
        this.close();
      }
    };
    // Captured at the document level so it fires regardless of z-index. Closes
    // the add-dropdown when a press lands outside it, and closes the whole panel
    // when a press lands outside both panel and launcher.
    this.boundOutsideDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (
        this.addDropdownEl &&
        !this.addDropdownEl.contains(target) &&
        !this.addBtnEl?.contains(target)
      ) {
        this.closeAddDropdown();
      }
      if (
        this.isOpen &&
        this.panelEl &&
        !this.panelEl.contains(target) &&
        !this.launcherEl?.contains(target)
      ) {
        this.close();
      }
    };
  }

  /**
   * Builds the launcher button + panel and appends them to the grid wrapper.
   * Call once per grid instance.
   *
   * @param wrapperEl  - The `.pg-grid` root element (the panel floats over it).
   * @param toolsBarEl - The shared `.pg-grid__tools` bar the launcher docks into
   *                     so it lays out beside other launchers instead of stacking.
   * @param config     - Feature configuration (`defaultOpen` opens it immediately).
   */
  mount(wrapperEl: HTMLElement, toolsBarEl: HTMLElement, config: FiltersToolPanelConfig): void {
    this.wrapperEl = wrapperEl;
    this.launcherEl = this.buildLauncher();
    this.panelEl = this.buildPanel();
    toolsBarEl.appendChild(this.launcherEl);
    wrapperEl.appendChild(this.panelEl);

    this.syncFromModel(this.deps.getFilterModel());

    if (config.defaultOpen) this.open();
  }

  /** Opens the panel. Idempotent. */
  open(): void {
    if (this.isOpen || !this.panelEl || !this.launcherEl) return;
    this.isOpen = true;
    this.panelEl.classList.add('pg-filters-panel--open');
    this.launcherEl.setAttribute('aria-expanded', 'true');
    // Deferred so the click that opened the panel does not immediately trip the
    // outside-press handler and close it again.
    setTimeout(() => {
      document.addEventListener('mousedown', this.boundOutsideDown, true);
      document.addEventListener('keydown', this.boundKeydown, true);
    }, 0);
  }

  /** Closes the panel (and any open add-dropdown). Idempotent. */
  close(): void {
    if (!this.isOpen || !this.panelEl || !this.launcherEl) return;
    this.isOpen = false;
    this.closeAddDropdown();
    this.panelEl.classList.remove('pg-filters-panel--open');
    this.launcherEl.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', this.boundOutsideDown, true);
    document.removeEventListener('keydown', this.boundKeydown, true);
  }

  /** Toggles the panel open/closed. */
  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  /**
   * Reconciles the panel with an authoritative filter model — the single hook
   * the grid calls from its `store.watch('filterModel')`. Always refreshes the
   * badge/glyph; unless this panel is mid-write ({@link selfUpdating}), it also
   * adds sections for externally-applied filters (header funnel, public API,
   * Photon AI), refreshes any open editor whose value changed, and removes
   * sections whose applied filter was cleared elsewhere.
   *
   * @param model - The current applied filter model.
   */
  syncFromModel(model: FilterModel): void {
    this.updateBadge(model);
    if (this.selfUpdating) return;

    const modelIds = new Set(Object.keys(model));

    // Add / refresh sections for every filtered column.
    for (const colId of modelIds) {
      const existing = this.sections.get(colId);
      if (existing) {
        existing.appliedOnce = true;
        existing.editor?.setFilter(model[colId] ?? null);
      } else {
        const colDef = this.deps.getColumns().find((c) => c.colId === colId);
        if (colDef) this.addSection(colDef, { appliedOnce: true });
      }
    }

    // Remove sections whose applied filter disappeared from the model.
    for (const [colId, section] of this.sections) {
      if (!modelIds.has(colId) && section.appliedOnce) {
        this.disposeSection(colId);
      }
    }

    this.updateEmptyState();
  }

  /** Removes the launcher + panel, disposes every section editor, detaches listeners. */
  destroy(): void {
    document.removeEventListener('mousedown', this.boundOutsideDown, true);
    document.removeEventListener('keydown', this.boundKeydown, true);
    for (const section of this.sections.values()) section.editor?.destroy();
    this.sections.clear();
    this.launcherEl?.remove();
    this.panelEl?.remove();
    this.wrapperEl = null;
    this.launcherEl = null;
    this.launcherIconEl = null;
    this.badgeEl = null;
    this.panelEl = null;
    this.sectionsEl = null;
    this.emptyEl = null;
    this.addBtnEl = null;
    this.addDropdownEl = null;
  }

  // ─── Construction ───────────────────────────────────────────────────────────

  private buildLauncher(): HTMLButtonElement {
    const btn = createElement('button', {
      type: 'button',
      'aria-label': 'Filters',
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
    });
    btn.className = 'pg-filters-launcher';

    const icon = createElement('span', { 'aria-hidden': 'true' });
    icon.className = 'pg-filters-launcher__icon';
    icon.innerHTML = this.deps.iconRenderer.renderToString('filter', 16);
    this.launcherIconEl = icon;

    const badge = createElement('span', { 'aria-hidden': 'true' });
    badge.className = 'pg-filters-launcher__badge';
    this.badgeEl = badge;

    btn.append(icon, badge);
    btn.addEventListener('click', () => this.toggle());
    return btn;
  }

  private buildPanel(): HTMLElement {
    const panel = createDiv('pg-filters-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Filters');

    // Header ────────────────────────────────────────────────────────────────
    const header = createDiv('pg-filters-panel__header');
    const title = createDiv('pg-filters-panel__title');
    title.textContent = 'Filters';
    const closeBtn = createElement('button', { type: 'button', 'aria-label': 'Close' });
    closeBtn.className = 'pg-filters-panel__close';
    closeBtn.innerHTML = this.deps.iconRenderer.renderToString('close', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);
    panel.appendChild(header);

    // Body ─────────────────────────────────────────────────────────────────
    const body = createDiv('pg-filters-panel__body');

    const empty = createDiv('pg-filters-panel__empty');
    empty.textContent = 'No filters applied yet.';
    this.emptyEl = empty;
    body.appendChild(empty);

    const sections = createDiv('pg-filters-panel__sections');
    this.sectionsEl = sections;
    body.appendChild(sections);

    panel.appendChild(body);

    // Footer / Add-Filter action ─────────────────────────────────────────────
    const footer = createDiv('pg-filters-panel__footer');
    const addBtn = createElement('button', { type: 'button' });
    addBtn.className = 'pg-filters-panel__add-btn';
    const addIcon = createElement('span', { 'aria-hidden': 'true' });
    addIcon.className = 'pg-filters-panel__add-icon';
    addIcon.innerHTML = this.deps.iconRenderer.renderToString('add', 16);
    const addLabel = document.createElement('span');
    addLabel.textContent = 'Add Filter';
    addBtn.append(addIcon, addLabel);
    addBtn.addEventListener('click', () => this.toggleAddDropdown());
    this.addBtnEl = addBtn;
    footer.appendChild(addBtn);
    panel.appendChild(footer);

    return panel;
  }

  // ─── Add-Filter dropdown ────────────────────────────────────────────────────

  private toggleAddDropdown(): void {
    if (this.addDropdownEl) this.closeAddDropdown();
    else this.openAddDropdown();
  }

  private openAddDropdown(): void {
    if (this.addDropdownEl || !this.panelEl) return;

    const dropdown = createDiv('pg-filters-panel__add-dropdown');

    // Search box ──────────────────────────────────────────────────────────
    const search = createDiv('pg-filters-panel__search');
    const searchIcon = createElement('span', { 'aria-hidden': 'true' });
    searchIcon.className = 'pg-filters-panel__search-icon';
    searchIcon.innerHTML = this.deps.iconRenderer.renderToString('search', 14);
    const searchInput = createElement('input', {
      type: 'text',
      placeholder: 'Search columns…',
      'aria-label': 'Search columns',
    }) as HTMLInputElement;
    searchInput.className = 'pg-filters-panel__search-input';
    search.append(searchIcon, searchInput);
    dropdown.appendChild(search);

    // Column list ─────────────────────────────────────────────────────────
    const list = createDiv('pg-filters-panel__col-list');
    list.setAttribute('role', 'listbox');
    dropdown.appendChild(list);

    searchInput.addEventListener('input', () => {
      this.renderColumnList(list, searchInput.value.trim().toLowerCase());
    });

    this.addDropdownEl = dropdown;
    this.panelEl.appendChild(dropdown);
    this.renderColumnList(list, '');
    requestAnimationFrame(() => searchInput.focus());
  }

  private closeAddDropdown(): void {
    this.addDropdownEl?.remove();
    this.addDropdownEl = null;
  }

  /** Renders the picker list: filterable columns without an existing section, filtered by `term`. */
  private renderColumnList(list: HTMLElement, term: string): void {
    list.textContent = '';
    const available = this.getAvailableColumns().filter(
      (c) => !term || c.header.toLowerCase().includes(term),
    );

    if (available.length === 0) {
      const empty = createDiv('pg-filters-panel__col-empty');
      empty.textContent = 'No columns available.';
      list.appendChild(empty);
      return;
    }

    for (const colDef of available) {
      const item = createElement('button', { type: 'button', role: 'option' });
      item.className = 'pg-filters-panel__col-item';
      item.textContent = colDef.header;
      item.addEventListener('click', () => {
        this.closeAddDropdown();
        this.addSection(colDef, { expanded: true });
      });
      list.appendChild(item);
    }
  }

  /** Filterable leaf columns that do not already have a section. */
  private getAvailableColumns(): ColumnDef[] {
    return this.deps
      .getColumns()
      .filter((c) => c.filterable !== false && !this.sections.has(c.colId));
  }

  // ─── Sections ───────────────────────────────────────────────────────────────

  private addSection(
    colDef: ColumnDef,
    opts: { expanded?: boolean; appliedOnce?: boolean } = {},
  ): void {
    if (!this.sectionsEl || this.sections.has(colDef.colId)) return;

    const root = createDiv('pg-filters-section');

    // Header row ──────────────────────────────────────────────────────────
    const headerRow = createDiv('pg-filters-section__header');

    const toggle = createElement('button', {
      type: 'button',
      'aria-expanded': 'false',
      'aria-label': `Toggle ${colDef.header} filter`,
    });
    toggle.className = 'pg-filters-section__toggle';
    toggle.innerHTML = this.deps.iconRenderer.renderToString('chevronRight', 14);
    toggle.addEventListener('click', () => this.toggleSection(colDef.colId));

    const label = createDiv('pg-filters-section__label');
    label.textContent = colDef.header;
    label.addEventListener('click', () => this.toggleSection(colDef.colId));

    const remove = createElement('button', {
      type: 'button',
      'aria-label': `Remove ${colDef.header} filter`,
    });
    remove.className = 'pg-filters-section__remove';
    remove.innerHTML = this.deps.iconRenderer.renderToString('close', 14);
    remove.addEventListener('click', () => this.removeSection(colDef.colId));

    headerRow.append(toggle, label, remove);
    root.appendChild(headerRow);

    // Body (editor host) ──────────────────────────────────────────────────
    const body = createDiv('pg-filters-section__body');
    const bodyId = `pg-filters-body-${colDef.colId}`;
    body.id = bodyId;
    toggle.setAttribute('aria-controls', bodyId);
    root.appendChild(body);

    this.sectionsEl.appendChild(root);

    const section: FilterSection = {
      colDef,
      rootEl: root,
      toggleEl: toggle,
      bodyEl: body,
      editor: null,
      expanded: false,
      appliedOnce: opts.appliedOnce ?? false,
    };
    this.sections.set(colDef.colId, section);

    this.updateEmptyState();

    if (opts.expanded) this.expandSection(section);
  }

  private toggleSection(colId: string): void {
    const section = this.sections.get(colId);
    if (!section) return;
    if (section.expanded) this.collapseSection(section);
    else this.expandSection(section);
  }

  private expandSection(section: FilterSection): void {
    section.expanded = true;
    section.rootEl.classList.add('pg-filters-section--expanded');
    section.toggleEl.setAttribute('aria-expanded', 'true');
    section.toggleEl.innerHTML = this.deps.iconRenderer.renderToString('chevronDown', 14);

    // Lazily build the editor on first expand (defers the set-filter unique-value
    // scan until the column is actually opened).
    if (!section.editor) {
      const colId = section.colDef.colId;
      section.editor = new FilterEditor({
        colDef: section.colDef,
        currentFilter: this.deps.getFilterModel()[colId] ?? null,
        uniqueOptions: this.deps.getUniqueOptions(section.colDef),
        onFilterChange: (filter) => this.onSectionFilterChange(section, filter),
      });
      section.editor.render(section.bodyEl);
    }
  }

  private collapseSection(section: FilterSection): void {
    section.expanded = false;
    section.rootEl.classList.remove('pg-filters-section--expanded');
    section.toggleEl.setAttribute('aria-expanded', 'false');
    section.toggleEl.innerHTML = this.deps.iconRenderer.renderToString('chevronRight', 14);
  }

  /** ✕ handler: clears the column's filter through the grid and drops the section. */
  private removeSection(colId: string): void {
    const section = this.sections.get(colId);
    if (!section) return;
    const wasApplied = section.appliedOnce;
    this.disposeSection(colId);
    if (wasApplied) {
      this.selfUpdating = true;
      try {
        this.deps.onFilterChange(colId, null);
      } finally {
        this.selfUpdating = false;
      }
      this.updateBadge(this.deps.getFilterModel());
    }
  }

  /** Tears down a section's DOM + editor without touching the filter model. */
  private disposeSection(colId: string): void {
    const section = this.sections.get(colId);
    if (!section) return;
    section.editor?.destroy();
    section.rootEl.remove();
    this.sections.delete(colId);
    this.updateEmptyState();
  }

  private onSectionFilterChange(section: FilterSection, filter: ColumnFilter | null): void {
    if (filter) section.appliedOnce = true;
    this.selfUpdating = true;
    try {
      this.deps.onFilterChange(section.colDef.colId, filter);
    } finally {
      this.selfUpdating = false;
    }
    this.updateBadge(this.deps.getFilterModel());
  }

  // ─── Indicators ─────────────────────────────────────────────────────────────

  private updateBadge(model: FilterModel): void {
    if (!this.launcherEl || !this.badgeEl || !this.launcherIconEl) return;
    const count = Object.keys(model).length;
    const hasFilters = count > 0;
    this.badgeEl.textContent = hasFilters ? String(count) : '';
    this.launcherEl.classList.toggle('pg-filters-launcher--has-filters', hasFilters);
    this.launcherEl.setAttribute(
      'aria-label',
      hasFilters ? `Filters (${count} active)` : 'Filters',
    );
    this.launcherIconEl.innerHTML = this.deps.iconRenderer.renderToString(
      hasFilters ? 'filterActive' : 'filter',
      16,
    );
  }

  private updateEmptyState(): void {
    if (!this.emptyEl) return;
    this.emptyEl.classList.toggle('pg-filters-panel__empty--hidden', this.sections.size > 0);
  }
}
