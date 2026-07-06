import { createDiv } from './dom-utils';
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
    constructor(engine, iconRenderer) {
        this.engine = engine;
        this.iconRenderer = iconRenderer;
        this.el = null;
        this.anchorEl = null;
        this.outsideClickFn = null;
        this.escKeyFn = null;
        this.callbacks = {};
    }
    // ── Public API ────────────────────────────────────────────────────────────
    /**
     * Register optional callbacks for operations delegated outside this class.
     * Call this once after construction.
     */
    setCallbacks(callbacks) {
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
    show(group, anchorEl, clientX, clientY) {
        this.hide();
        this.anchorEl = anchorEl;
        anchorEl.classList.add('pg-th--ctx-menu-open');
        const menu = this.buildMenu(group);
        document.body.appendChild(menu);
        this.el = menu;
        this.positionMenu(anchorEl, clientX, clientY);
        requestAnimationFrame(() => {
            this.outsideClickFn = (e) => {
                if (!this.el?.contains(e.target))
                    this.hide();
            };
            this.escKeyFn = (e) => {
                if (e.key === 'Escape')
                    this.hide();
            };
            document.addEventListener('mousedown', this.outsideClickFn);
            document.addEventListener('keydown', this.escKeyFn);
        });
    }
    /** Hide and remove the menu from the DOM. */
    hide() {
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
    destroy() {
        this.hide();
    }
    // ── Private: menu construction ────────────────────────────────────────────
    buildMenu(group) {
        const menu = createDiv('pg-col-ctx-menu');
        menu.setAttribute('role', 'menu');
        menu.setAttribute('tabindex', '-1');
        const entries = this.buildEntries(group);
        for (const entry of entries) {
            if ('kind' in entry) {
                menu.appendChild(this.createSeparator());
            }
            else {
                menu.appendChild(this.buildItem(entry));
            }
        }
        return menu;
    }
    /**
     * Build the ordered list of items and separators for the given group.
     * Disables move items when the group is already at the respective edge.
     */
    buildEntries(group) {
        const id = group.logicalGroupId;
        const pos = this.engine.getGroupPositionInfo(id);
        const entries = [
            // ── Move ──────────────────────────────────────────────────────────────
            {
                label: 'Move Column to Left',
                icon: 'chevronLeft',
                disabled: pos.isFirst,
                action: () => {
                    this.engine.moveGroupLeft(id);
                    this.callbacks.onAction?.('move-left', id);
                },
            },
            {
                label: 'Move Column to Right',
                icon: 'chevronRight',
                disabled: pos.isLast,
                action: () => {
                    this.engine.moveGroupRight(id);
                    this.callbacks.onAction?.('move-right', id);
                },
            },
            {
                label: 'Move to Start',
                icon: 'pageFirst',
                disabled: pos.isFirst,
                action: () => {
                    this.engine.moveGroupToStart(id);
                    this.callbacks.onAction?.('move-start', id);
                },
            },
            {
                label: 'Move to End',
                icon: 'pageLast',
                disabled: pos.isLast,
                action: () => {
                    this.engine.moveGroupToEnd(id);
                    this.callbacks.onAction?.('move-end', id);
                },
            },
            // ── Separator ─────────────────────────────────────────────────────────
            { kind: 'separator' },
            // ── Visibility ────────────────────────────────────────────────────────
            {
                label: 'Hide Group',
                icon: 'eyeOff',
                action: () => {
                    this.engine.hideGroupLeaves(id);
                    this.callbacks.onAction?.('hide-group', id);
                },
            },
            {
                label: 'Choose Columns…',
                icon: 'columns',
                action: () => {
                    this.callbacks.onOpenColumnChooser?.();
                    this.callbacks.onAction?.('column-chooser', id);
                },
            },
        ];
        return entries;
    }
    // ── Private: DOM helpers ─────────────────────────────────────────────────
    buildItem(item) {
        const el = createDiv('pg-col-ctx-menu__item');
        el.setAttribute('role', 'menuitem');
        el.setAttribute('tabindex', '-1');
        if (item.disabled)
            el.classList.add('pg-col-ctx-menu__item--disabled');
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
    createSeparator() {
        const sep = createDiv('pg-col-ctx-menu__separator');
        sep.setAttribute('role', 'separator');
        return sep;
    }
    // ── Private: positioning ─────────────────────────────────────────────────
    /**
     * Position the menu at the cursor (right-click) or below the anchor element
     * (button click).  Clamps to the visible viewport with a 4 px gutter.
     */
    positionMenu(anchorEl, clientX, clientY) {
        const menu = this.el;
        if (!menu)
            return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const menuW = menu.offsetWidth || 220;
        const menuH = menu.scrollHeight || 300;
        let left;
        let top;
        if (clientX !== undefined && clientY !== undefined) {
            left = clientX;
            top = clientY;
        }
        else {
            const rect = anchorEl.getBoundingClientRect();
            left = rect.left;
            top = rect.bottom + 2;
        }
        if (left + menuW > vw)
            left = vw - menuW - 4;
        if (left < 4)
            left = 4;
        if (top + menuH > vh)
            top = (clientY ?? anchorEl.getBoundingClientRect().top) - menuH - 2;
        if (top < 4)
            top = 4;
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }
}
//# sourceMappingURL=group-context-menu.js.map