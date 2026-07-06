import { GridEventType } from '../types/event.types';
import { createDiv } from './dom-utils';
// ── Enums ────────────────────────────────────────────────────────────────────
/**
 * Identifiers for the nine sections of the column context menu.
 *
 * Pass a subset to {@link ColumnMenuOptions.sections} to restrict which sections
 * are rendered — for example, `[ColumnMenuSection.SORT, ColumnMenuSection.PIN]`.
 */
export var ColumnMenuSection;
(function (ColumnMenuSection) {
    /** Sort Ascending / Sort Descending / Clear Sort */
    ColumnMenuSection["SORT"] = "sort";
    /** Quick Filter / Advanced Filter / Clear Filter */
    ColumnMenuSection["FILTER"] = "filter";
    /** Pin submenu: Pin Left / Pin Right / Unpin */
    ColumnMenuSection["PIN"] = "pin";
    /** Move Left / Move Right / Move to Start / Move to End */
    ColumnMenuSection["MOVE"] = "move";
    /** Resize submenu: Auto Size / Auto Size All / Fit to Grid / Reset Width */
    ColumnMenuSection["RESIZE"] = "resize";
    /** Visibility submenu: Hide Column / Column Chooser */
    ColumnMenuSection["VISIBILITY"] = "visibility";
    /** Group by Column + Aggregate submenu */
    ColumnMenuSection["DATA"] = "data";
    /** Clipboard submenu: Copy Header / Copy Column / Copy Values */
    ColumnMenuSection["CLIPBOARD"] = "clipboard";
    /** Column submenu: Rename / Duplicate / Freeze / Lock / Reset */
    ColumnMenuSection["COLUMN"] = "column";
})(ColumnMenuSection || (ColumnMenuSection = {}));
/**
 * Aggregate functions available in the Data → Aggregate submenu.
 */
export var AggregateFunction;
(function (AggregateFunction) {
    AggregateFunction["SUM"] = "sum";
    AggregateFunction["AVG"] = "avg";
    AggregateFunction["MIN"] = "min";
    AggregateFunction["MAX"] = "max";
    AggregateFunction["COUNT"] = "count";
})(AggregateFunction || (AggregateFunction = {}));
// ── Section group layout ─────────────────────────────────────────────────────
/**
 * Sections that share the same separator group.  A horizontal divider is
 * inserted between groups but **not** between sections within the same group.
 *
 * Grouping: Sort | Filter | Pin+Move | Resize | Visibility | Data | Clipboard | Column
 */
const SECTION_GROUPS = [
    [ColumnMenuSection.SORT],
    [ColumnMenuSection.FILTER],
    [ColumnMenuSection.PIN, ColumnMenuSection.MOVE],
    [ColumnMenuSection.RESIZE],
    [ColumnMenuSection.VISIBILITY],
    [ColumnMenuSection.DATA],
    [ColumnMenuSection.CLIPBOARD],
    [ColumnMenuSection.COLUMN],
];
// ── Class ────────────────────────────────────────────────────────────────────
/**
 * Full-featured column context menu for PhotonGrid flat column headers.
 *
 * ### Sections
 * Nine configurable sections are supported (see {@link ColumnMenuSection}):
 * Sort, Filter, Pin (submenu), Move, Resize (submenu), Visibility (submenu),
 * Data (Group by + Aggregate submenu), Clipboard (submenu), Column (submenu).
 *
 * ### Submenus
 * Parent items (Pin, Resize, Visibility, Clipboard, Column, and Aggregate)
 * reveal fly-out submenus on hover.  Submenus are automatically flipped
 * horizontally when they would overflow the viewport's right edge.
 *
 * ### CSS
 * All visual styling is driven by theme CSS variables (`--pg-colors-*`,
 * `--pg-typography-*`, etc.) — no inline style declarations.
 *
 * ### Usage
 * ```ts
 * const menu = new ColumnMenu(columnModel, sortEngine, eventBus, iconRenderer, onAction);
 * menu.setMenuCallbacks({ onAutoSize: (id) => api.autoSizeColumn(id), … });
 * menu.setMenuOptions({ sections: [ColumnMenuSection.SORT, ColumnMenuSection.PIN] });
 *
 * // Trigger from ⋯ button
 * menuBtn.addEventListener('click', () => menu.show(colDef, menuBtn));
 * // Trigger from right-click
 * th.addEventListener('contextmenu', (e) => { e.preventDefault(); menu.show(colDef, th, e.clientX, e.clientY); });
 * ```
 */
export class ColumnMenu {
    constructor(columnModel, sortEngine, eventBus, iconRenderer, onAction) {
        this.columnModel = columnModel;
        this.sortEngine = sortEngine;
        this.eventBus = eventBus;
        this.iconRenderer = iconRenderer;
        this.onAction = onAction;
        this.el = null;
        this.anchorEl = null;
        this.outsideClickFn = null;
        this.escKeyFn = null;
        this.openSubmenuTimer = null;
        this.closeSubmenuTimer = null;
        this.activeSubmenuEl = null;
        /**
         * Maps each submenu to the parent item that opens it. Needed because
         * submenus are portaled to `document.body` (see {@link openSubmenu}) rather
         * than left nested inside their parent item, so `.closest()` can no longer
         * find the owning item once a submenu is detached.
         */
        this.submenuParents = new Map();
        this.groupCallbacks = null;
        this.menuCallbacks = {};
        this.menuOptions = {};
    }
    // ── Public API ────────────────────────────────────────────────────────────
    /**
     * Register callbacks for operations that are delegated outside the menu class.
     * Call this once after construction — all callbacks are optional.
     */
    setMenuCallbacks(callbacks) {
        this.menuCallbacks = callbacks;
    }
    /**
     * Configure which sections appear and whether right-click is supported.
     * Call this once after construction or whenever options change.
     */
    setMenuOptions(options) {
        this.menuOptions = options;
    }
    /**
     * Register row-grouping integration callbacks.
     * Required to enable the "Group by Column" item in the Data section.
     */
    setGroupCallbacks(callbacks) {
        this.groupCallbacks = callbacks;
    }
    /**
     * Show the context menu for `colDef`.
     *
     * @param colDef   - Column the menu operates on.
     * @param anchorEl - Element that triggered the menu (⋯ button or column header).
     * @param clientX  - Viewport X for right-click positioning; omit for button positioning.
     * @param clientY  - Viewport Y for right-click positioning; omit for button positioning.
     */
    show(colDef, anchorEl, clientX, clientY) {
        this.hide();
        this.anchorEl = anchorEl;
        anchorEl.classList.add('pg-th__menu-btn--active');
        const menu = this.buildMenu(colDef);
        document.body.appendChild(menu);
        this.el = menu;
        this.positionMenu(anchorEl, clientX, clientY);
        requestAnimationFrame(() => {
            this.outsideClickFn = (e) => {
                const target = e.target;
                // A portaled-open submenu (see openSubmenu) lives outside `this.el`
                // in the DOM, so it must be checked separately or clicks inside it
                // would be misread as "outside the menu" and close everything.
                if (this.el?.contains(target))
                    return;
                if (this.activeSubmenuEl?.contains(target))
                    return;
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
        this.clearSubmenuTimers();
        // The active submenu, if any, is a portaled child of document.body (not
        // of this.el), so it must be removed explicitly or it would leak.
        this.activeSubmenuEl?.remove();
        this.activeSubmenuEl = null;
        this.submenuParents.clear();
        this.anchorEl?.classList.remove('pg-th__menu-btn--active');
        this.anchorEl = null;
        this.el?.remove();
        this.el = null;
    }
    /** Destroy the instance and release all resources. */
    destroy() {
        this.hide();
    }
    // ── Private: menu construction ────────────────────────────────────────────
    buildMenu(colDef) {
        const menu = createDiv('pg-col-ctx-menu');
        menu.setAttribute('role', 'menu');
        menu.setAttribute('tabindex', '-1');
        const enabledSections = new Set(this.menuOptions.sections ?? Object.values(ColumnMenuSection));
        const allSections = this.buildAllSections(colDef);
        const sectionMap = new Map(allSections.map((s) => [s.key, s]));
        let firstGroupRendered = true;
        for (const group of SECTION_GROUPS) {
            const visibleInGroup = group.filter((key) => enabledSections.has(key) && (sectionMap.get(key)?.items.length ?? 0) > 0);
            if (visibleInGroup.length === 0)
                continue;
            if (!firstGroupRendered) {
                menu.appendChild(this.createSeparator());
            }
            firstGroupRendered = false;
            for (const key of visibleInGroup) {
                const section = sectionMap.get(key);
                for (const item of section.items) {
                    menu.appendChild(item.kind === 'parent'
                        ? this.buildParentItem(item, colDef)
                        : this.buildLeafItem(item));
                }
            }
        }
        return menu;
    }
    // ── Private: item DOM builders ────────────────────────────────────────────
    buildLeafItem(item) {
        const el = createDiv('pg-col-ctx-menu__item');
        el.setAttribute('role', 'menuitem');
        el.setAttribute('tabindex', '-1');
        if (item.active)
            el.classList.add('pg-col-ctx-menu__item--active');
        if (item.disabled)
            el.classList.add('pg-col-ctx-menu__item--disabled');
        el.appendChild(this.createIcon(item.icon));
        el.appendChild(this.createLabel(item.label));
        if (!item.disabled) {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                item.action();
                this.hide();
            });
        }
        return el;
    }
    buildParentItem(item, colDef) {
        const el = createDiv('pg-col-ctx-menu__item pg-col-ctx-menu__item--has-submenu');
        el.setAttribute('role', 'menuitem');
        el.setAttribute('aria-haspopup', 'true');
        el.setAttribute('aria-expanded', 'false');
        el.setAttribute('tabindex', '-1');
        el.appendChild(this.createIcon(item.icon));
        el.appendChild(this.createLabel(item.label));
        const chevron = createDiv('pg-col-ctx-menu__item-chevron');
        chevron.innerHTML = this.iconRenderer.renderToString('chevronRight', 12);
        el.appendChild(chevron);
        // The submenu is intentionally NOT appended to `el` here — it is portaled
        // to document.body only while open (see openSubmenu), so it can render
        // outside the scroll-clipped menu body without being cut off on the X
        // axis. It is still built eagerly so hover has no construction delay.
        const submenu = this.buildSubmenu(item.children, colDef);
        this.submenuParents.set(submenu, el);
        this.attachSubmenuListeners(el, submenu);
        return el;
    }
    buildSubmenu(children, _colDef) {
        const submenu = createDiv('pg-col-ctx-menu__submenu');
        submenu.setAttribute('role', 'menu');
        for (const child of children) {
            submenu.appendChild(this.buildLeafItem(child));
        }
        return submenu;
    }
    // ── Private: submenu hover logic ─────────────────────────────────────────
    /**
     * Wire the open/close hover behaviour for a parent item + its submenu.
     * Uses a short open delay (60 ms) and a close grace period (150 ms) to
     * prevent flicker when the mouse transitions between the item and the submenu.
     */
    attachSubmenuListeners(el, submenu) {
        el.addEventListener('mouseenter', () => {
            this.clearSubmenuTimers();
            if (this.activeSubmenuEl && this.activeSubmenuEl !== submenu) {
                this.closeSubmenu(this.activeSubmenuEl);
            }
            this.openSubmenuTimer = setTimeout(() => this.openSubmenu(submenu, el), 60);
        });
        el.addEventListener('mouseleave', (e) => {
            if (this.activeSubmenuEl === submenu && submenu.contains(e.relatedTarget))
                return;
            this.clearSubmenuTimers();
            this.closeSubmenuTimer = setTimeout(() => {
                if (!submenu.matches(':hover') && !el.matches(':hover'))
                    this.closeSubmenu(submenu);
            }, 150);
        });
        submenu.addEventListener('mouseenter', () => {
            this.clearSubmenuTimers();
        });
        submenu.addEventListener('mouseleave', (e) => {
            if (el.contains(e.relatedTarget))
                return;
            this.clearSubmenuTimers();
            this.closeSubmenuTimer = setTimeout(() => {
                if (!submenu.matches(':hover') && !el.matches(':hover'))
                    this.closeSubmenu(submenu);
            }, 150);
        });
    }
    /**
     * Portal a submenu into document.body and position it in viewport
     * coordinates. Portaling (rather than nesting it under its parent item)
     * keeps it clear of the parent menu's `overflow-y: auto` clipping, so a
     * fly-out can render correctly even while the menu body is scrolled.
     */
    openSubmenu(submenu, parentItem) {
        document.body.appendChild(submenu);
        this.activeSubmenuEl = submenu;
        submenu.classList.add('pg-col-ctx-menu__submenu--open');
        parentItem.setAttribute('aria-expanded', 'true');
        this.adjustSubmenuPosition(submenu, parentItem);
    }
    /** Close and detach a portaled submenu opened via {@link openSubmenu}. */
    closeSubmenu(submenu) {
        submenu.classList.remove('pg-col-ctx-menu__submenu--open');
        submenu.remove();
        this.submenuParents.get(submenu)?.setAttribute('aria-expanded', 'false');
        if (this.activeSubmenuEl === submenu)
            this.activeSubmenuEl = null;
    }
    clearSubmenuTimers() {
        if (this.openSubmenuTimer !== null) {
            clearTimeout(this.openSubmenuTimer);
            this.openSubmenuTimer = null;
        }
        if (this.closeSubmenuTimer !== null) {
            clearTimeout(this.closeSubmenuTimer);
            this.closeSubmenuTimer = null;
        }
    }
    // ── Private: section builders ─────────────────────────────────────────────
    buildAllSections(colDef) {
        return [
            this.buildSortSection(colDef),
            this.buildFilterSection(colDef),
            this.buildPinSection(colDef),
            this.buildMoveSection(colDef),
            this.buildResizeSection(colDef),
            this.buildVisibilitySection(colDef),
            this.buildDataSection(colDef),
            this.buildClipboardSection(colDef),
            this.buildColumnSection(colDef),
        ];
    }
    /**
     * Sort section — three flat items: Sort Ascending, Sort Descending, Clear Sort.
     */
    buildSortSection(colDef) {
        const currentSort = this.sortEngine.isSorted(colDef.colId);
        return {
            key: ColumnMenuSection.SORT,
            items: colDef.sortable === false ? [] : [
                {
                    kind: 'leaf',
                    label: 'Sort Ascending',
                    icon: 'sortAsc',
                    active: currentSort === 'asc',
                    action: () => {
                        this.sortEngine.sort(colDef.colId, colDef.field, 'asc');
                        this.columnModel.setColumnSort(colDef.colId, 'asc');
                        this.onAction('sort', colDef.colId);
                    },
                },
                {
                    kind: 'leaf',
                    label: 'Sort Descending',
                    icon: 'sortDesc',
                    active: currentSort === 'desc',
                    action: () => {
                        this.sortEngine.sort(colDef.colId, colDef.field, 'desc');
                        this.columnModel.setColumnSort(colDef.colId, 'desc');
                        this.onAction('sort', colDef.colId);
                    },
                },
                {
                    kind: 'leaf',
                    label: 'Clear Sort',
                    icon: 'close',
                    disabled: !currentSort,
                    action: () => {
                        this.sortEngine.clearColumnSort(colDef.colId);
                        this.columnModel.setColumnSort(colDef.colId, null);
                        this.onAction('sort', colDef.colId);
                    },
                },
            ],
        };
    }
    /**
     * Filter section — three flat items: Quick Filter, Advanced Filter, Clear Filter.
     */
    buildFilterSection(colDef) {
        const filterActive = colDef.filterActive === true;
        return {
            key: ColumnMenuSection.FILTER,
            items: colDef.filterable === false ? [] : [
                {
                    kind: 'leaf',
                    label: 'Quick Filter…',
                    icon: 'search',
                    action: () => {
                        this.menuCallbacks.onQuickFilter?.(colDef.colId);
                        this.onAction('quick-filter', colDef.colId);
                    },
                },
                {
                    kind: 'leaf',
                    label: 'Advanced Filter…',
                    icon: 'filter',
                    action: () => {
                        const anchor = this.anchorEl ?? document.createElement('div');
                        this.menuCallbacks.onOpenAdvancedFilter?.(colDef, anchor);
                        this.onAction('advanced-filter', colDef.colId);
                    },
                },
                {
                    kind: 'leaf',
                    label: 'Clear Filter',
                    icon: 'close',
                    disabled: !filterActive,
                    action: () => {
                        this.eventBus.emit(GridEventType.COLUMN_FILTER_CHANGED, {
                            colId: colDef.colId,
                            field: colDef.field,
                            term: '',
                        });
                        this.onAction('clear-filter', colDef.colId);
                    },
                },
            ],
        };
    }
    /**
     * Pin section — a single parent item whose submenu has Pin Left / Pin Right / Unpin.
     */
    buildPinSection(colDef) {
        return {
            key: ColumnMenuSection.PIN,
            items: [
                {
                    kind: 'parent',
                    label: 'Pin',
                    icon: 'pin',
                    children: [
                        {
                            kind: 'leaf',
                            label: 'Pin Left',
                            icon: 'pin',
                            active: colDef.pinned === 'left',
                            action: () => {
                                this.columnModel.setColumnPin(colDef.colId, 'left');
                                this.onAction('pin', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Pin Right',
                            icon: 'pin',
                            active: colDef.pinned === 'right',
                            action: () => {
                                this.columnModel.setColumnPin(colDef.colId, 'right');
                                this.onAction('pin', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Unpin',
                            icon: 'unpin',
                            active: !colDef.pinned,
                            action: () => {
                                this.columnModel.setColumnPin(colDef.colId, null);
                                this.onAction('pin', colDef.colId);
                            },
                        },
                    ],
                },
            ],
        };
    }
    /**
     * Move section — four flat items.  Shares a separator group with Pin.
     * Items are disabled when the column is already at the respective edge.
     */
    buildMoveSection(colDef) {
        const cols = this.columnModel.getVisibleColumns();
        const idx = cols.findIndex((c) => c.colId === colDef.colId);
        const isFirst = idx <= 0;
        const isLast = idx >= cols.length - 1;
        return {
            key: ColumnMenuSection.MOVE,
            items: [
                {
                    kind: 'leaf',
                    label: 'Move Column to Left',
                    icon: 'chevronLeft',
                    disabled: isFirst,
                    action: () => {
                        this.menuCallbacks.onMoveLeft?.(colDef.colId);
                        this.onAction('move-left', colDef.colId);
                    },
                },
                {
                    kind: 'leaf',
                    label: 'Move Column to Right',
                    icon: 'chevronRight',
                    disabled: isLast,
                    action: () => {
                        this.menuCallbacks.onMoveRight?.(colDef.colId);
                        this.onAction('move-right', colDef.colId);
                    },
                },
                {
                    kind: 'leaf',
                    label: 'Move to Start',
                    icon: 'pageFirst',
                    disabled: isFirst,
                    action: () => {
                        this.menuCallbacks.onMoveStart?.(colDef.colId);
                        this.onAction('move-start', colDef.colId);
                    },
                },
                {
                    kind: 'leaf',
                    label: 'Move to End',
                    icon: 'pageLast',
                    disabled: isLast,
                    action: () => {
                        this.menuCallbacks.onMoveEnd?.(colDef.colId);
                        this.onAction('move-end', colDef.colId);
                    },
                },
            ],
        };
    }
    /**
     * Resize section — a single parent item whose submenu has four resize operations.
     */
    buildResizeSection(colDef) {
        return {
            key: ColumnMenuSection.RESIZE,
            items: [
                {
                    kind: 'parent',
                    label: 'Resize',
                    icon: 'expand',
                    children: [
                        {
                            kind: 'leaf',
                            label: 'Auto Size',
                            icon: 'columns',
                            action: () => {
                                this.menuCallbacks.onAutoSize?.(colDef.colId);
                                this.onAction('autosize', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Auto Size All',
                            icon: 'columns',
                            action: () => {
                                this.menuCallbacks.onAutoSizeAll?.();
                                this.onAction('autosize-all', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Fit to Grid',
                            icon: 'expand',
                            action: () => {
                                this.menuCallbacks.onFitToGrid?.();
                                this.onAction('fit-to-grid', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Reset Width',
                            icon: 'refresh',
                            action: () => {
                                this.menuCallbacks.onResetWidth?.(colDef.colId);
                                this.onAction('reset-width', colDef.colId);
                            },
                        },
                    ],
                },
            ],
        };
    }
    /**
     * Visibility section — a single parent item: Hide Column + Column Chooser.
     */
    buildVisibilitySection(colDef) {
        return {
            key: ColumnMenuSection.VISIBILITY,
            items: [
                {
                    kind: 'parent',
                    label: 'Visibility',
                    icon: 'eye',
                    children: [
                        {
                            kind: 'leaf',
                            label: 'Hide Column',
                            icon: 'eyeOff',
                            action: () => {
                                this.columnModel.setColumnVisible(colDef.colId, false);
                                this.onAction('hide', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Column Chooser…',
                            icon: 'columns',
                            action: () => {
                                this.menuCallbacks.onOpenColumnChooser?.();
                                this.onAction('column-chooser', colDef.colId);
                            },
                        },
                    ],
                },
            ],
        };
    }
    /**
     * Data section — Group by Column (flat leaf) + Aggregate (parent with submenu).
     * "Group by Column" is omitted when the column is not `groupable` or when no
     * {@link GroupCallbacks} have been registered.
     */
    buildDataSection(colDef) {
        const items = [];
        if (colDef.groupable !== false && this.groupCallbacks) {
            const grouped = this.groupCallbacks.isGrouped(colDef.colId);
            items.push({
                kind: 'leaf',
                label: grouped ? 'Remove Grouping' : 'Group by Column',
                icon: 'group',
                active: grouped,
                action: () => {
                    if (grouped)
                        this.groupCallbacks.removeGroup(colDef.colId);
                    else
                        this.groupCallbacks.addGroup(colDef.colId);
                    this.onAction('group', colDef.colId);
                },
            });
        }
        items.push({
            kind: 'parent',
            label: 'Aggregate',
            icon: 'sigma',
            children: [
                AggregateFunction.SUM,
                AggregateFunction.AVG,
                AggregateFunction.MIN,
                AggregateFunction.MAX,
                AggregateFunction.COUNT,
            ].map((func) => ({
                kind: 'leaf',
                label: func.charAt(0).toUpperCase() + func.slice(1),
                icon: 'sigma',
                active: colDef.aggFunc === func,
                action: () => {
                    this.menuCallbacks.onAggregate?.(colDef, func);
                    this.onAction(`aggregate-${func}`, colDef.colId);
                },
            })),
        });
        return { key: ColumnMenuSection.DATA, items };
    }
    /**
     * Clipboard section — a single parent item: Copy Header / Copy Column / Copy Values.
     */
    buildClipboardSection(colDef) {
        return {
            key: ColumnMenuSection.CLIPBOARD,
            items: [
                {
                    kind: 'parent',
                    label: 'Clipboard',
                    icon: 'copy',
                    children: [
                        {
                            kind: 'leaf',
                            label: 'Copy Header',
                            icon: 'copy',
                            action: () => {
                                this.menuCallbacks.onCopyHeader?.(colDef);
                                this.onAction('copy-header', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Copy Column',
                            icon: 'copy',
                            action: () => {
                                this.menuCallbacks.onCopyColumn?.(colDef);
                                this.onAction('copy-column', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Copy Values',
                            icon: 'copy',
                            action: () => {
                                this.menuCallbacks.onCopyValues?.(colDef);
                                this.onAction('copy-values', colDef.colId);
                            },
                        },
                    ],
                },
            ],
        };
    }
    /**
     * Column section — a single parent item: Rename / Duplicate / Freeze / Lock / Reset.
     */
    buildColumnSection(colDef) {
        return {
            key: ColumnMenuSection.COLUMN,
            items: [
                {
                    kind: 'parent',
                    label: 'Column',
                    icon: 'settings',
                    children: [
                        {
                            kind: 'leaf',
                            label: 'Rename',
                            icon: 'edit',
                            action: () => {
                                this.menuCallbacks.onRename?.(colDef);
                                this.onAction('rename', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Duplicate',
                            icon: 'copy',
                            action: () => {
                                this.menuCallbacks.onDuplicate?.(colDef);
                                this.onAction('duplicate', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Freeze Position',
                            icon: 'pin',
                            action: () => {
                                this.menuCallbacks.onFreezePosition?.(colDef);
                                this.onAction('freeze', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Lock Column',
                            icon: 'lock',
                            action: () => {
                                this.menuCallbacks.onLockColumn?.(colDef);
                                this.onAction('lock', colDef.colId);
                            },
                        },
                        {
                            kind: 'leaf',
                            label: 'Reset Column',
                            icon: 'refresh',
                            action: () => {
                                this.menuCallbacks.onResetColumn?.(colDef);
                                this.onAction('reset-column', colDef.colId);
                            },
                        },
                    ],
                },
            ],
        };
    }
    // ── Private: DOM helpers ─────────────────────────────────────────────────
    createSeparator() {
        const sep = createDiv('pg-col-ctx-menu__separator');
        sep.setAttribute('role', 'separator');
        return sep;
    }
    createIcon(iconName) {
        const el = createDiv('pg-col-ctx-menu__item-icon');
        el.innerHTML = this.iconRenderer.renderToString(iconName, 14);
        return el;
    }
    createLabel(text) {
        const el = createDiv('pg-col-ctx-menu__item-label');
        el.textContent = text;
        return el;
    }
    // ── Private: positioning ─────────────────────────────────────────────────
    /**
     * Position the menu relative to the anchor element (button click) or at the
     * cursor (right-click).  The menu is clamped to the visible viewport.
     */
    positionMenu(anchorEl, clientX, clientY) {
        const menu = this.el;
        if (!menu)
            return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const menuW = menu.offsetWidth || 220;
        // Clamp against the menu's own max-height (calc(100% - 200px), see
        // base-styles.ts) rather than its unclamped scrollHeight — content past
        // that cap scrolls internally instead of needing the menu to flip above
        // the anchor to "fit".
        const menuH = Math.min(menu.scrollHeight || 400, vh - 200);
        let left;
        let top;
        if (clientX !== undefined && clientY !== undefined) {
            left = clientX;
            top = clientY;
        }
        else {
            const rect = anchorEl.getBoundingClientRect();
            left = rect.right - menuW;
            top = rect.bottom + 2;
        }
        // Clamp to viewport with 4px gutters
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
    /**
     * Position a fly-out submenu in viewport coordinates: opens to the right of
     * the parent item, flipping to the left when it would overflow the
     * viewport's right edge, and clamped upward when it would overflow the
     * bottom. Called once each time the submenu becomes visible.
     *
     * The submenu is a `position: fixed` element portaled to document.body
     * (see {@link openSubmenu}), so coordinates are absolute viewport
     * positions rather than offsets relative to the parent item.
     */
    adjustSubmenuPosition(submenu, parentItem) {
        const parentRect = parentItem.getBoundingClientRect();
        const submenuW = submenu.offsetWidth || 180;
        const submenuH = submenu.scrollHeight || 200;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Default: open to the right of the parent item, top-aligned with it.
        let left = parentRect.right;
        let top = parentRect.top - 4;
        if (left + submenuW > vw) {
            // Not enough room on the right — open to the left instead.
            left = parentRect.left - submenuW;
        }
        if (left < 4)
            left = 4;
        if (top + submenuH > vh)
            top = vh - submenuH - 4;
        if (top < 4)
            top = 4;
        submenu.style.left = `${left}px`;
        submenu.style.top = `${top}px`;
    }
}
//# sourceMappingURL=column-menu.js.map