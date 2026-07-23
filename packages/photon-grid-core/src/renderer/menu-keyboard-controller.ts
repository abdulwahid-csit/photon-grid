import { scrollIntoViewIfNeeded } from './dom-utils';

/**
 * Bridge between a menu widget and the shared {@link MenuKeyboardController}.
 *
 * The controller is intentionally decoupled from any specific menu's internals:
 * it drives navigation purely through this host, so both {@link import('./column-menu').ColumnMenu}
 * (with fly-out submenus) and {@link import('./group-context-menu').GroupContextMenu}
 * (flat) can share one implementation.
 */
export interface MenuKeyboardHost {
  /** The menu's root `[role="menu"]` element, or `null` when the menu is closed. */
  getRootEl(): HTMLElement | null;
  /**
   * The currently-open fly-out submenu (portaled to `document.body`), or `null`.
   * Menus without submenus always return `null`.
   */
  getActiveSubmenuEl(): HTMLElement | null;
  /**
   * Open the submenu owned by `parentItem` (portals + positions it) and return
   * it, or `null` when the item has no submenu.
   */
  openSubmenu(parentItem: HTMLElement): HTMLElement | null;
  /** Close a submenu previously returned by {@link openSubmenu}. */
  closeSubmenu(submenuEl: HTMLElement): void;
  /** Resolve the parent item that owns `submenuEl`, or `null`. */
  getSubmenuParent(submenuEl: HTMLElement): HTMLElement | null;
  /**
   * Close the entire menu. When `restoreFocus` is `true`, focus is returned to
   * the element that opened the menu (the header cell or trigger button).
   */
  closeAll(restoreFocus: boolean): void;
}

/** Milliseconds the typeahead buffer persists between keystrokes. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * Reusable keyboard-navigation controller implementing the WAI-ARIA
 * *menu / menubar* pattern for Photon Grid's portaled context menus.
 *
 * ### Behaviour
 * - **ArrowDown / ArrowUp** — move focus between enabled items (skipping
 *   separators and disabled items), wrapping at the ends.
 * - **Home / End** — focus the first / last enabled item.
 * - **ArrowRight / Enter / Space** on a submenu parent — open its fly-out and
 *   focus the first child.
 * - **ArrowLeft** — close the current submenu and return focus to its parent.
 * - **Enter / Space** on a leaf — activate it (dispatches a synthetic click, so
 *   the item's existing handler runs and the menu closes).
 * - **Escape** — close the current submenu, or the whole menu (restoring focus
 *   to the opener) at the root level.
 * - **Printable keys** — type-ahead: focus the first enabled item whose label
 *   starts with the buffered characters.
 *
 * ### Focus model
 * Items are `tabindex="-1"` and moved with `.focus()` (not
 * `aria-activedescendant`). Fly-out submenus are portaled to `document.body`, so
 * the active item is not a DOM descendant of the root menu — `.focus()` crosses
 * that boundary correctly where `aria-activedescendant` would not.
 *
 * ### Lifecycle
 * A single capture-phase `keydown` listener is added in {@link attach} and
 * removed in {@link destroy}; no per-item listeners are created. The type-ahead
 * timer is always cleared on {@link destroy}. Safe to attach/detach on every
 * menu open/close with no listener accumulation.
 */
export class MenuKeyboardController {
  private readonly boundKeydown: (e: KeyboardEvent) => void;
  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  private attached = false;

  constructor(private readonly host: MenuKeyboardHost) {
    this.boundKeydown = this.onKeydown.bind(this);
  }

  /**
   * Begin handling keyboard navigation and move focus to the first enabled item
   * of the root menu. Call once, immediately after the menu DOM is shown.
   */
  attach(): void {
    if (this.attached) return;
    this.attached = true;
    document.addEventListener('keydown', this.boundKeydown, true);
    const root = this.host.getRootEl();
    if (root) this.focusFirst(root);
  }

  /** Stop handling keyboard navigation and release the type-ahead timer. */
  destroy(): void {
    if (!this.attached) return;
    this.attached = false;
    document.removeEventListener('keydown', this.boundKeydown, true);
    this.clearTypeahead();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private onKeydown(e: KeyboardEvent): void {
    const root = this.host.getRootEl();
    if (!root) return;

    const active  = document.activeElement as HTMLElement | null;
    const submenu = this.host.getActiveSubmenuEl();
    const inMenu  = !!active && (root.contains(active) || (!!submenu && submenu.contains(active)));
    if (!inMenu) return;

    switch (e.key) {
      case 'ArrowDown': this.consume(e); this.move(1);  break;
      case 'ArrowUp':   this.consume(e); this.move(-1); break;
      case 'Home':      this.consume(e); this.focusEdge(true);  break;
      case 'End':       this.consume(e); this.focusEdge(false); break;
      case 'ArrowRight': this.consume(e); this.openActiveSubmenu(); break;
      case 'ArrowLeft':  this.consume(e); this.closeCurrentSubmenu(); break;
      case 'Enter':
      case ' ':
        this.consume(e);
        this.activate();
        break;
      case 'Escape':
        this.consume(e);
        this.onEscape();
        break;
      default:
        if (this.isPrintable(e)) {
          this.consume(e);
          this.typeahead(e.key);
        }
    }
  }

  /** Prevent scrolling / other handlers from also acting on a handled key. */
  private consume(e: KeyboardEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  /** The menu level (root or open submenu) that currently owns focus. */
  private currentLevel(): HTMLElement | null {
    const active  = document.activeElement as HTMLElement | null;
    const submenu = this.host.getActiveSubmenuEl();
    if (submenu && active && submenu.contains(active)) return submenu;
    return this.host.getRootEl();
  }

  /** Enabled, focusable items within a menu level, in DOM order. */
  private getItems(level: HTMLElement): HTMLElement[] {
    return Array.from(level.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .filter((el) => el.getAttribute('aria-disabled') !== 'true');
  }

  private move(dir: 1 | -1): void {
    const level = this.currentLevel();
    if (!level) return;
    const items = this.getItems(level);
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    let idx = active ? items.indexOf(active) : -1;
    idx = idx === -1
      ? (dir === 1 ? 0 : items.length - 1)
      : (idx + dir + items.length) % items.length;
    this.focusAt(items, idx, level);
  }

  private focusEdge(first: boolean): void {
    const level = this.currentLevel();
    if (!level) return;
    const items = this.getItems(level);
    if (items.length === 0) return;
    this.focusAt(items, first ? 0 : items.length - 1, level);
  }

  private focusFirst(level: HTMLElement): void {
    const items = this.getItems(level);
    if (items.length > 0) this.focusAt(items, 0, level);
  }

  private focusAt(items: HTMLElement[], index: number, level: HTMLElement): void {
    const el = items[index];
    if (!el) return;
    el.focus();
    scrollIntoViewIfNeeded(el, level);
  }

  /** `true` when the focused item opens a submenu. */
  private isParent(el: HTMLElement | null): boolean {
    return el?.getAttribute('aria-haspopup') === 'true';
  }

  private openActiveSubmenu(): void {
    const active = document.activeElement as HTMLElement | null;
    if (!active || !this.isParent(active)) return;
    const submenu = this.host.openSubmenu(active);
    if (submenu) this.focusFirst(submenu);
  }

  private closeCurrentSubmenu(): void {
    const submenu = this.host.getActiveSubmenuEl();
    const active  = document.activeElement as HTMLElement | null;
    if (!submenu || !active || !submenu.contains(active)) return;
    const parent = this.host.getSubmenuParent(submenu);
    this.host.closeSubmenu(submenu);
    parent?.focus();
  }

  private activate(): void {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return;
    if (this.isParent(active)) { this.openActiveSubmenu(); return; }
    // Leaf: dispatch the item's own click handler (runs the action + closes).
    active.click();
  }

  private onEscape(): void {
    const submenu = this.host.getActiveSubmenuEl();
    const active  = document.activeElement as HTMLElement | null;
    if (submenu && active && submenu.contains(active)) {
      this.closeCurrentSubmenu();
      return;
    }
    this.host.closeAll(true);
  }

  // ── Type-ahead ──────────────────────────────────────────────────────────────

  private isPrintable(e: KeyboardEvent): boolean {
    return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
  }

  private typeahead(key: string): void {
    const level = this.currentLevel();
    if (!level) return;
    this.typeaheadBuffer += key.toLowerCase();
    if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer);
    this.typeaheadTimer = setTimeout(() => this.clearTypeahead(), TYPEAHEAD_RESET_MS);

    const items = this.getItems(level);
    const match = items.find(
      (el) => (el.textContent ?? '').trim().toLowerCase().startsWith(this.typeaheadBuffer),
    );
    if (match) {
      match.focus();
      scrollIntoViewIfNeeded(match, level);
    }
  }

  private clearTypeahead(): void {
    this.typeaheadBuffer = '';
    if (this.typeaheadTimer) { clearTimeout(this.typeaheadTimer); this.typeaheadTimer = null; }
  }
}
