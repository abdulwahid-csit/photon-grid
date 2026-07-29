/**
 * The **Toolbar** — the configurable top strip above the grid header.
 *
 * It owns two layout regions of the shared `.pg-grid__tools` strip:
 *  - a **left region** holding a fully configurable, event-only **tab strip**
 *    (e.g. Active / Inactive / Final Settlement) and, optionally, the global
 *    **search** input when {@link ToolbarSearchPosition.Left} is configured;
 *  - a **right region** holding the search input (when
 *    {@link ToolbarSearchPosition.Right}) alongside the Filters/Import launchers
 *    which dock in independently.
 *
 * Like {@link import('./filters-tool-panel').FiltersToolPanel} and
 * {@link import('./import-menu').ImportMenu} this is a **pure UI** component: it
 * holds no grid state and mutates nothing directly. Tab selection emits
 * {@link GridEventType.TOOLBAR_TAB_CHANGED}; the search input is wired to the
 * grid's quick-filter via {@link ToolbarDeps.onSearch} and additionally emits
 * {@link GridEventType.TOOLBAR_SEARCH_CHANGED}.
 *
 * Every visual is class-driven — all colors, spacing, radii and typography come
 * from theme CSS variables (see `toolbar.css.ts`); the component sets no inline
 * styles.
 *
 * @packageDocumentation
 */

import type { IconRenderer } from '../icons/icon-renderer';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import type { QuickFilterChangedEvent } from '../types/event.types';
import { ToolbarSearchPosition } from '../types/toolbar.types';
import type { ToolbarConfig, ToolbarSearchConfig, ToolbarTab } from '../types/toolbar.types';
import { createDiv, createElement } from './dom-utils';

/** Collaborators the {@link Toolbar} needs from the grid, injected as a DI bag. */
export interface ToolbarDeps {
  /** Renders themed, registry-backed icons. */
  readonly iconRenderer: IconRenderer;
  /** The grid event bus — used to emit toolbar events and observe quick-filter changes. */
  readonly eventBus: EventBus;
  /** Applies the toolbar search query to the grid's quick-filter (the same seam the group-bar search uses). */
  readonly onSearch: (query: string) => void;
}

const DEFAULT_SEARCH_PLACEHOLDER = 'Search...';
const DEFAULT_SEARCH_DEBOUNCE_MS = 180;

/**
 * Configurable top toolbar. Opt-in via `GridOptions.toolbar.enabled`; mounted by
 * {@link import('./grid-renderer').GridRenderer} into the shared tools strip's
 * left/right regions.
 */
export class Toolbar {
  private leftRegion: HTMLElement | null = null;
  private rightRegion: HTMLElement | null = null;

  // ── Tabs ──
  private tabsEl: HTMLElement | null = null;
  private readonly tabButtons = new Map<string, HTMLButtonElement>();
  private readonly tabsById = new Map<string, ToolbarTab>();
  private tabOrder: string[] = [];
  private activeTabId: string | null = null;

  // ── Search ──
  private searchWrapEl: HTMLElement | null = null;
  private searchInputEl: HTMLInputElement | null = null;
  private searchClearEl: HTMLElement | null = null;
  private searchDebounceMs = DEFAULT_SEARCH_DEBOUNCE_MS;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private quickFilterUnsub: (() => void) | null = null;

  private readonly boundTabClick: (e: MouseEvent) => void;
  private readonly boundTabKeydown: (e: KeyboardEvent) => void;

  constructor(private readonly deps: ToolbarDeps) {
    this.boundTabClick = (e: MouseEvent): void => this.onTabClick(e);
    this.boundTabKeydown = (e: KeyboardEvent): void => this.onTabKeydown(e);
  }

  /**
   * Builds the tab strip and/or search input into the supplied regions. Call
   * once per grid instance.
   *
   * @param leftRegion  - `.pg-grid__tools__left` — hosts the tabs and left-docked search.
   * @param rightRegion - `.pg-grid__tools__right` — hosts right-docked search + the Filters/Import launchers.
   * @param config      - The resolved `GridOptions.toolbar` configuration.
   */
  mount(leftRegion: HTMLElement, rightRegion: HTMLElement, config: ToolbarConfig): void {
    this.leftRegion = leftRegion;
    this.rightRegion = rightRegion;

    const tabs = config.tabs;
    if (tabs && (tabs.enabled ?? true) && tabs.items.length > 0) {
      this.buildTabs(tabs.items, tabs.activeTabId);
    }

    const search = config.search;
    if (search && (search.enabled ?? true)) {
      this.buildSearch(search);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Returns the id of the currently active tab, or `null` when no tabs exist. */
  getActiveTab(): string | null {
    return this.activeTabId;
  }

  /**
   * Programmatically selects a tab by id. No-op when the id is unknown, disabled
   * or already active. Emits {@link GridEventType.TOOLBAR_TAB_CHANGED} on change.
   */
  setActiveTab(id: string): void {
    this.selectTab(id);
  }

  /** Tears down DOM, timers and listeners. */
  destroy(): void {
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.quickFilterUnsub?.();
    this.quickFilterUnsub = null;

    if (this.tabsEl) {
      this.tabsEl.removeEventListener('click', this.boundTabClick);
      this.tabsEl.removeEventListener('keydown', this.boundTabKeydown);
      this.tabsEl.remove();
    }
    this.searchWrapEl?.remove();

    this.tabButtons.clear();
    this.tabsById.clear();
    this.tabOrder = [];
    this.activeTabId = null;
    this.tabsEl = null;
    this.searchWrapEl = null;
    this.searchInputEl = null;
    this.searchClearEl = null;
    this.leftRegion = null;
    this.rightRegion = null;
  }

  // ── Tabs construction ──────────────────────────────────────────────────────

  private buildTabs(items: readonly ToolbarTab[], activeTabId?: string): void {
    if (!this.leftRegion) return;

    const list = createDiv('pg-toolbar-tabs');
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', 'Views');
    this.tabsEl = list;

    // Resolve the initial active tab: the configured id if valid & enabled,
    // else the first non-disabled tab.
    const firstEnabled = items.find((t) => !t.disabled)?.id ?? null;
    const configured = activeTabId && items.some((t) => t.id === activeTabId && !t.disabled) ? activeTabId : null;
    this.activeTabId = configured ?? firstEnabled;

    for (const tab of items) {
      this.tabsById.set(tab.id, tab);
      this.tabOrder.push(tab.id);
      const btn = this.buildTab(tab);
      this.tabButtons.set(tab.id, btn);
      list.appendChild(btn);
    }

    list.addEventListener('click', this.boundTabClick);
    list.addEventListener('keydown', this.boundTabKeydown);
    this.leftRegion.appendChild(list);
  }

  private buildTab(tab: ToolbarTab): HTMLButtonElement {
    const isActive = tab.id === this.activeTabId;
    const btn = createElement('button', {
      class: `pg-toolbar-tab${isActive ? ' pg-toolbar-tab--active' : ''}${tab.disabled ? ' pg-toolbar-tab--disabled' : ''}`,
      type: 'button',
      role: 'tab',
      'data-tab-id': tab.id,
      'aria-selected': isActive ? 'true' : 'false',
      // Roving tabindex: only the active tab is in the tab order.
      tabindex: isActive ? 0 : -1,
    });
    if (tab.disabled) btn.setAttribute('aria-disabled', 'true');

    if (tab.icon) {
      const icon = createDiv('pg-toolbar-tab__icon');
      icon.innerHTML = this.deps.iconRenderer.renderToString(tab.icon, 14);
      btn.appendChild(icon);
    }

    const label = createDiv('pg-toolbar-tab__label');
    label.textContent = tab.label;
    btn.appendChild(label);

    if (tab.badge !== undefined && tab.badge !== null && `${tab.badge}` !== '') {
      const badge = createDiv('pg-toolbar-tab__badge');
      badge.textContent = `${tab.badge}`;
      btn.appendChild(badge);
    }

    return btn;
  }

  private onTabClick(e: MouseEvent): void {
    const target = (e.target as HTMLElement).closest('.pg-toolbar-tab') as HTMLElement | null;
    const id = target?.getAttribute('data-tab-id');
    if (!id) return;
    this.selectTab(id);
    // Reveal the tab even when the click was a no-op (already-active tab that is
    // only partially in view because the strip is scrolled).
    this.ensureTabVisible(id);
  }

  private onTabKeydown(e: KeyboardEvent): void {
    const key = e.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;

    const enabled = this.tabOrder.filter((id) => !this.tabsById.get(id)?.disabled);
    if (enabled.length === 0) return;
    e.preventDefault();

    const currentIndex = this.activeTabId ? enabled.indexOf(this.activeTabId) : -1;
    let nextIndex: number;
    switch (key) {
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = enabled.length - 1; break;
      case 'ArrowLeft': nextIndex = (currentIndex - 1 + enabled.length) % enabled.length; break;
      default: nextIndex = (currentIndex + 1) % enabled.length; break; // ArrowRight
    }

    const nextId = enabled[nextIndex];
    this.selectTab(nextId);
    this.tabButtons.get(nextId)?.focus();
  }

  /**
   * Selects a tab, updating roving tabindex + ARIA state and emitting
   * {@link GridEventType.TOOLBAR_TAB_CHANGED}. No-op for unknown, disabled or
   * already-active tabs.
   */
  private selectTab(id: string): void {
    const tab = this.tabsById.get(id);
    if (!tab || tab.disabled || id === this.activeTabId) return;

    const previousTabId = this.activeTabId;
    if (previousTabId) {
      const prevBtn = this.tabButtons.get(previousTabId);
      prevBtn?.classList.remove('pg-toolbar-tab--active');
      prevBtn?.setAttribute('aria-selected', 'false');
      prevBtn?.setAttribute('tabindex', '-1');
    }

    const nextBtn = this.tabButtons.get(id);
    nextBtn?.classList.add('pg-toolbar-tab--active');
    nextBtn?.setAttribute('aria-selected', 'true');
    nextBtn?.setAttribute('tabindex', '0');

    this.activeTabId = id;
    this.deps.eventBus.emit(GridEventType.TOOLBAR_TAB_CHANGED, { tabId: id, previousTabId, tab });

    // Keep the newly-active tab within the scrollable strip (keyboard nav,
    // programmatic setActiveTab, or a click that changes selection).
    this.ensureTabVisible(id);
  }

  /**
   * Scrolls the tab strip so `id`'s button aligns to the leading (left) edge,
   * bringing the tab we acted on **and the tabs after it** into view. A no-op
   * when the strip does not overflow. Only the tab strip is scrolled — never the
   * page — and only along the inline axis. The browser clamps the target scroll
   * position, so aligning a tab near the end simply scrolls to the end.
   */
  private ensureTabVisible(id: string): void {
    const container = this.tabsEl;
    const btn = this.tabButtons.get(id);
    if (!container || !btn) return;
    // Nothing to reveal unless the strip actually overflows its viewport.
    if (container.scrollWidth <= container.clientWidth) return;

    const EDGE_PADDING = 8;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();

    // Bring the button's leading edge to the strip's leading edge (+ padding) so
    // everything from this tab onward becomes visible.
    const delta = bRect.left - (cRect.left + EDGE_PADDING);
    if (delta !== 0) container.scrollBy({ left: delta, behavior: 'smooth' });
  }

  // ── Search construction ────────────────────────────────────────────────────

  private buildSearch(config: ToolbarSearchConfig): void {
    const region = (config.position ?? ToolbarSearchPosition.Right) === ToolbarSearchPosition.Left
      ? this.leftRegion
      : this.rightRegion;
    if (!region) return;

    this.searchDebounceMs = config.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS;

    const wrap = createDiv('pg-toolbar-search');
    const field = createDiv('pg-toolbar-search__field');

    const icon = createDiv('pg-toolbar-search__icon');
    icon.innerHTML = this.deps.iconRenderer.renderToString('search', 14);

    const input = createElement('input', {
      type: 'text',
      class: 'pg-toolbar-search__input',
      placeholder: config.placeholder ?? DEFAULT_SEARCH_PLACEHOLDER,
      autocomplete: 'off',
      'aria-label': config.placeholder ?? DEFAULT_SEARCH_PLACEHOLDER,
    });
    input.spellcheck = false;
    this.searchInputEl = input;

    const clear = createDiv('pg-toolbar-search__clear');
    clear.innerHTML = this.deps.iconRenderer.renderToString('close', 12);
    clear.title = 'Clear search';
    this.searchClearEl = clear;

    input.addEventListener('input', () => this.onSearchInput(input.value));
    clear.addEventListener('pointerdown', (e) => {
      e.preventDefault(); // keep the input focused
      this.clearSearch();
      input.focus();
    });

    field.appendChild(icon);
    field.appendChild(input);
    field.appendChild(clear);
    wrap.appendChild(field);
    region.appendChild(wrap);
    this.searchWrapEl = wrap;

    // Keep the input in sync when the quick-filter is changed elsewhere
    // (e.g. the group-bar search or a programmatic api.setQuickFilter call).
    this.quickFilterUnsub = this.deps.eventBus.on<QuickFilterChangedEvent>(
      GridEventType.QUICK_FILTER_CHANGED,
      (e) => this.syncFromQuickFilter(e.config?.term ?? ''),
    );
  }

  private onSearchInput(rawValue: string): void {
    const hasValue = rawValue.length > 0;
    this.searchClearEl?.classList.toggle('pg-toolbar-search__clear--visible', hasValue);

    if (this.searchDebounceTimer !== null) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.searchDebounceTimer = null;
      const query = rawValue.trim();
      this.deps.onSearch(query);
      this.deps.eventBus.emit(GridEventType.TOOLBAR_SEARCH_CHANGED, { query });
    }, this.searchDebounceMs);
  }

  private clearSearch(): void {
    if (!this.searchInputEl) return;
    this.searchInputEl.value = '';
    this.searchClearEl?.classList.remove('pg-toolbar-search__clear--visible');
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.deps.onSearch('');
    this.deps.eventBus.emit(GridEventType.TOOLBAR_SEARCH_CHANGED, { query: '' });
  }

  /**
   * Reflects an externally-applied quick-filter term into the input, without
   * re-dispatching (so it never loops) and without stomping on the user while
   * they are actively typing in this input.
   */
  private syncFromQuickFilter(term: string): void {
    const input = this.searchInputEl;
    if (!input || input === document.activeElement || input.value === term) return;
    input.value = term;
    this.searchClearEl?.classList.toggle('pg-toolbar-search__clear--visible', term.length > 0);
  }
}
