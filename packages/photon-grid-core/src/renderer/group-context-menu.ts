import type { IconRenderer } from '../icons/icon-renderer';
import type { DisplayGroupNode } from '../column-groups/display-group.types';
import type { DisplayGroupEngine } from '../column-groups/display-group-engine';
import { createDiv } from './dom-utils';
import { MenuKeyboardController } from './menu-keyboard-controller';
import type { MenuKeyboardHost } from './menu-keyboard-controller';

// ── Interfaces ────────────────────────────────────────────────────────────────

/**
 * Optional callbacks the group context menu delegates to the surrounding
 * grid infrastructure.  All properties are optional — supply only those the
 * grid supports.
 */
export interface GroupContextMenuCallbacks {
  /** Open the column chooser / visibility picker dialog. */
  onOpenColumnChooser?: () => void;
  /** Fired after any menu action with the action name and group ID. */
  onAction?: (action: string, groupId: string) => void;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** A clickable menu item. */
interface GroupMenuItem {
  readonly label:     string;
  readonly icon:      string;
  readonly disabled?: boolean;
  readonly action:    () => void;
}

/** A horizontal divider between item groups. */
interface GroupMenuSeparator {
  readonly kind: 'separator';
}

type GroupMenuEntry = GroupMenuItem | GroupMenuSeparator;

// ── Class ─────────────────────────────────────────────────────────────────────

/**
 * Context menu for column-group header cells.
 *
 * ### Available actions
 * - **Move** — Move Column to Left / to Right / to Start / to End
 * - **Hide Group** — hides all leaf columns in the group
 * - **Choose Columns** — opens the column chooser dialog
 *
 * ### CSS
 * Reuses the `.pg-col-ctx-menu` stylesheet — all visual styling is theme-driven.
 *
 * ### Usage
 * ```ts
 * const menu = new GroupContextMenu(engine, iconRenderer);
 * menu.setCallbacks({ onOpenColumnChooser: () => api.openColumnChooser() });
 *
 * // Trigger from right-click (wired via DisplayGroupCellOptions.onGroupContextMenu):
 * options.onGroupContextMenu = (e, node, el) => {
 *   e.preventDefault();
 *   menu.show(node, el, e.clientX, e.clientY);
 * };
 * ```
 */
export class GroupContextMenu {
  private el:              HTMLElement | null = null;
  private anchorEl:        HTMLElement | null = null;
  private outsideClickFn:  ((e: MouseEvent) => void) | null = null;
  private escKeyFn:        ((e: KeyboardEvent) => void) | null = null;
  private keyboardController: MenuKeyboardController | null = null;
  private callbacks:       GroupContextMenuCallbacks = {};

  constructor(
    private readonly engine:        DisplayGroupEngine,
    private readonly iconRenderer:  IconRenderer,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Register optional callbacks for operations delegated outside this class.
   * Call this once after construction.
   */
  setCallbacks(callbacks: GroupContextMenuCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Show the group context menu for `group`.
   *
   * @param group    - The group header node the menu operates on.
   * @param anchorEl - The element that triggered the menu (the group header cell).
   * @param clientX  - Viewport X for cursor-based positioning.
   * @param clientY  - Viewport Y for cursor-based positioning.
   */
  show(
    group:    DisplayGroupNode,
    anchorEl: HTMLElement,
    clientX?: number,
    clientY?: number,
  ): void {
    this.hide();
    this.anchorEl = anchorEl;
    anchorEl.classList.add('pg-th--ctx-menu-open');

    const menu = this.buildMenu(group);
    document.body.appendChild(menu);
    this.el = menu;

    this.positionMenu(anchorEl, clientX, clientY);

    requestAnimationFrame(() => {
      this.outsideClickFn = (e: MouseEvent) => {
        if (!this.el?.contains(e.target as Node)) this.hide();
      };
      // Fallback Escape for when focus has left the menu; while focus is inside,
      // the keyboard controller (capture phase) handles Escape and stops it.
      this.escKeyFn = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.hide();
      };
      document.addEventListener('mousedown', this.outsideClickFn);
      document.addEventListener('keydown',   this.escKeyFn);

      // Keyboard navigation — focuses the first item and drives arrow/enter/
      // typeahead/escape handling. This menu is flat (no submenus).
      this.keyboardController = new MenuKeyboardController(this.buildKeyboardHost());
      this.keyboardController.attach();
    });
  }

  /** Build the {@link MenuKeyboardHost} adapter — a flat menu with no submenus. */
  private buildKeyboardHost(): MenuKeyboardHost {
    return {
      getRootEl:          () => this.el,
      getActiveSubmenuEl: () => null,
      openSubmenu:        () => null,
      closeSubmenu:       () => { /* no submenus */ },
      getSubmenuParent:   () => null,
      closeAll: (restoreFocus) => {
        const opener = this.anchorEl;
        this.hide();
        if (restoreFocus) opener?.focus();
      },
    };
  }

  /** Hide and remove the menu from the DOM. */
  hide(): void {
    this.keyboardController?.destroy();
    this.keyboardController = null;
    if (this.outsideClickFn) {
      document.removeEventListener('mousedown', this.outsideClickFn);
      this.outsideClickFn = null;
    }
    if (this.escKeyFn) {
      document.removeEventListener('keydown', this.escKeyFn);
      this.escKeyFn = null;
    }
    this.anchorEl?.classList.remove('pg-th--ctx-menu-open');
    this.anchorEl = null;
    this.el?.remove();
    this.el = null;
  }

  /** Destroy the instance and release all resources. */
  destroy(): void {
    this.hide();
  }

  // ── Private: menu construction ────────────────────────────────────────────

  private buildMenu(group: DisplayGroupNode): HTMLElement {
    const menu = createDiv('pg-col-ctx-menu');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('tabindex', '-1');

    const entries = this.buildEntries(group);
    for (const entry of entries) {
      if ('kind' in entry) {
        menu.appendChild(this.createSeparator());
      } else {
        menu.appendChild(this.buildItem(entry));
      }
    }
    return menu;
  }

  /**
   * Build the ordered list of items and separators for the given group.
   * Disables move items when the group is already at the respective edge.
   */
  private buildEntries(group: DisplayGroupNode): GroupMenuEntry[] {
    const id  = group.logicalGroupId;
    const pos = this.engine.getGroupPositionInfo(id);

    const entries: GroupMenuEntry[] = [
      // ── Move ──────────────────────────────────────────────────────────────
      {
        label:    'Move Column to Left',
        icon:     'chevronLeft',
        disabled: pos.isFirst,
        action:   () => {
          this.engine.moveGroupLeft(id);
          this.callbacks.onAction?.('move-left', id);
        },
      },
      {
        label:    'Move Column to Right',
        icon:     'chevronRight',
        disabled: pos.isLast,
        action:   () => {
          this.engine.moveGroupRight(id);
          this.callbacks.onAction?.('move-right', id);
        },
      },
      {
        label:    'Move to Start',
        icon:     'pageFirst',
        disabled: pos.isFirst,
        action:   () => {
          this.engine.moveGroupToStart(id);
          this.callbacks.onAction?.('move-start', id);
        },
      },
      {
        label:    'Move to End',
        icon:     'pageLast',
        disabled: pos.isLast,
        action:   () => {
          this.engine.moveGroupToEnd(id);
          this.callbacks.onAction?.('move-end', id);
        },
      },

      // ── Separator ─────────────────────────────────────────────────────────
      { kind: 'separator' },

      // ── Visibility ────────────────────────────────────────────────────────
      {
        label:  'Hide Group',
        icon:   'eyeOff',
        action: () => {
          this.engine.hideGroupLeaves(id);
          this.callbacks.onAction?.('hide-group', id);
        },
      },
      {
        label:  'Choose Columns…',
        icon:   'columns',
        action: () => {
          this.callbacks.onOpenColumnChooser?.();
          this.callbacks.onAction?.('column-chooser', id);
        },
      },
    ];

    return entries;
  }

  // ── Private: DOM helpers ─────────────────────────────────────────────────

  private buildItem(item: GroupMenuItem): HTMLElement {
    const el = createDiv('pg-col-ctx-menu__item');
    el.setAttribute('role', 'menuitem');
    el.setAttribute('tabindex', '-1');

    if (item.disabled) {
      el.classList.add('pg-col-ctx-menu__item--disabled');
      el.setAttribute('aria-disabled', 'true');
    }

    const iconEl = createDiv('pg-col-ctx-menu__item-icon');
    iconEl.innerHTML = this.iconRenderer.renderToString(item.icon, 14);
    el.appendChild(iconEl);

    const labelEl = createDiv('pg-col-ctx-menu__item-label');
    labelEl.textContent = item.label;
    el.appendChild(labelEl);

    if (!item.disabled) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        item.action();
        this.hide();
      });
    }

    return el;
  }

  private createSeparator(): HTMLElement {
    const sep = createDiv('pg-col-ctx-menu__separator');
    sep.setAttribute('role', 'separator');
    return sep;
  }

  // ── Private: positioning ─────────────────────────────────────────────────

  /**
   * Position the menu at the cursor (right-click) or below the anchor element
   * (button click).  Clamps to the visible viewport with a 4 px gutter.
   */
  private positionMenu(
    anchorEl: HTMLElement,
    clientX?: number,
    clientY?: number,
  ): void {
    const menu = this.el;
    if (!menu) return;

    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    const menuW = menu.offsetWidth  || 220;
    const menuH = menu.scrollHeight || 300;

    let left: number;
    let top: number;

    if (clientX !== undefined && clientY !== undefined) {
      left = clientX;
      top  = clientY;
    } else {
      const rect = anchorEl.getBoundingClientRect();
      left = rect.left;
      top  = rect.bottom + 2;
    }

    if (left + menuW > vw) left = vw - menuW - 4;
    if (left < 4)          left = 4;
    if (top  + menuH > vh) top  = (clientY ?? anchorEl.getBoundingClientRect().top) - menuH - 2;
    if (top  < 4)          top  = 4;

    menu.style.left = `${left}px`;
    menu.style.top  = `${top}px`;
  }
}
