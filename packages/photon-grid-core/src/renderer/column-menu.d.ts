import type { ColumnDef } from '../types/column.types';
import type { ColumnModel } from '../core/column-model';
import type { SortEngine } from '../engines/sort/sort-engine';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
/**
 * Identifiers for the nine sections of the column context menu.
 *
 * Pass a subset to {@link ColumnMenuOptions.sections} to restrict which sections
 * are rendered — for example, `[ColumnMenuSection.SORT, ColumnMenuSection.PIN]`.
 */
export declare enum ColumnMenuSection {
    /** Sort Ascending / Sort Descending / Clear Sort */
    SORT = "sort",
    /** Quick Filter / Advanced Filter / Clear Filter */
    FILTER = "filter",
    /** Pin submenu: Pin Left / Pin Right / Unpin */
    PIN = "pin",
    /** Move Left / Move Right / Move to Start / Move to End */
    MOVE = "move",
    /** Resize submenu: Auto Size / Auto Size All / Fit to Grid / Reset Width */
    RESIZE = "resize",
    /** Visibility submenu: Hide Column / Column Chooser */
    VISIBILITY = "visibility",
    /** Group by Column + Aggregate submenu */
    DATA = "data",
    /** Clipboard submenu: Copy Header / Copy Column / Copy Values */
    CLIPBOARD = "clipboard",
    /** Column submenu: Rename / Duplicate / Freeze / Lock / Reset */
    COLUMN = "column"
}
/**
 * Aggregate functions available in the Data → Aggregate submenu.
 */
export declare enum AggregateFunction {
    SUM = "sum",
    AVG = "avg",
    MIN = "min",
    MAX = "max",
    COUNT = "count"
}
/**
 * Options controlling which sections appear in the column context menu
 * and global behaviour flags.
 */
export interface ColumnMenuOptions {
    /**
     * Sections to display, in the given order.
     * Omit (or pass `undefined`) to show all nine sections in their default order.
     */
    sections?: ColumnMenuSection[];
    /**
     * When `true`, right-clicking a column header cell opens this menu at the
     * cursor position in addition to the ⋯ button.
     * @default true
     */
    enableRightClick?: boolean;
}
/**
 * Callbacks for operations that the column context menu delegates to the
 * surrounding grid infrastructure (auto-size, clipboard, filter panel, etc.).
 *
 * All properties are optional — supply only those the grid supports.
 */
export interface ColumnMenuCallbacks {
    /** Auto-size the column to fit its content. */
    onAutoSize: (colId: string) => void;
    /** Auto-size every visible column. */
    onAutoSizeAll: () => void;
    /** Fit all visible columns proportionally to the grid's available width. */
    onFitToGrid: () => void;
    /** Reset this column's width to its original `ColumnDef.width` value. */
    onResetWidth: (colId: string) => void;
    /** Open the column chooser / visibility picker dialog. */
    onOpenColumnChooser: () => void;
    /**
     * Open the advanced filter panel for this column.
     * The second argument is a suggested anchor element for positioning — may be
     * a menu button or the column header itself.
     */
    onOpenAdvancedFilter: (colDef: ColumnDef, anchorEl: HTMLElement) => void;
    /** Focus the quick-filter input row cell for this column. */
    onQuickFilter: (colId: string) => void;
    /** Copy the column's header text to the system clipboard. */
    onCopyHeader: (colDef: ColumnDef) => void;
    /** Copy all visible cell values in this column to the system clipboard. */
    onCopyColumn: (colDef: ColumnDef) => void;
    /** Copy the unique cell values of this column to the system clipboard. */
    onCopyValues: (colDef: ColumnDef) => void;
    /** Initiate an inline rename of this column header. */
    onRename: (colDef: ColumnDef) => void;
    /** Insert a duplicate of this column directly after it. */
    onDuplicate: (colDef: ColumnDef) => void;
    /** Toggle "frozen position" — the column cannot be dragged. */
    onFreezePosition: (colDef: ColumnDef) => void;
    /** Toggle "locked" — the column's cells cannot be edited. */
    onLockColumn: (colDef: ColumnDef) => void;
    /** Reset all column state (width, sort, filter, pin) back to the original definition. */
    onResetColumn: (colDef: ColumnDef) => void;
    /** Apply an aggregate function to this column. */
    onAggregate: (colDef: ColumnDef, func: AggregateFunction) => void;
    /** Move this column one position to the left. */
    onMoveLeft: (colId: string) => void;
    /** Move this column one position to the right. */
    onMoveRight: (colId: string) => void;
    /** Move this column to the first position. */
    onMoveStart: (colId: string) => void;
    /** Move this column to the last position. */
    onMoveEnd: (colId: string) => void;
}
/**
 * Callbacks for row-grouping integration.
 * Optional — pass to {@link ColumnMenu.setGroupCallbacks} only when the grid
 * uses row grouping.
 */
export interface GroupCallbacks {
    /** Returns `true` when the given column is currently part of the row grouping. */
    isGrouped: (colId: string) => boolean;
    /** Add this column to the active row grouping. */
    addGroup: (colId: string) => void;
    /** Remove this column from the active row grouping. */
    removeGroup: (colId: string) => void;
}
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
export declare class ColumnMenu {
    private readonly columnModel;
    private readonly sortEngine;
    private readonly eventBus;
    private readonly iconRenderer;
    private readonly onAction;
    private el;
    private anchorEl;
    private outsideClickFn;
    private escKeyFn;
    private openSubmenuTimer;
    private closeSubmenuTimer;
    private activeSubmenuEl;
    /**
     * Maps each submenu to the parent item that opens it. Needed because
     * submenus are portaled to `document.body` (see {@link openSubmenu}) rather
     * than left nested inside their parent item, so `.closest()` can no longer
     * find the owning item once a submenu is detached.
     */
    private submenuParents;
    private groupCallbacks;
    private menuCallbacks;
    private menuOptions;
    constructor(columnModel: ColumnModel, sortEngine: SortEngine, eventBus: EventBus, iconRenderer: IconRenderer, onAction: (action: string, colId: string) => void);
    /**
     * Register callbacks for operations that are delegated outside the menu class.
     * Call this once after construction — all callbacks are optional.
     */
    setMenuCallbacks(callbacks: Partial<ColumnMenuCallbacks>): void;
    /**
     * Configure which sections appear and whether right-click is supported.
     * Call this once after construction or whenever options change.
     */
    setMenuOptions(options: ColumnMenuOptions): void;
    /**
     * Register row-grouping integration callbacks.
     * Required to enable the "Group by Column" item in the Data section.
     */
    setGroupCallbacks(callbacks: GroupCallbacks): void;
    /**
     * Show the context menu for `colDef`.
     *
     * @param colDef   - Column the menu operates on.
     * @param anchorEl - Element that triggered the menu (⋯ button or column header).
     * @param clientX  - Viewport X for right-click positioning; omit for button positioning.
     * @param clientY  - Viewport Y for right-click positioning; omit for button positioning.
     */
    show(colDef: ColumnDef, anchorEl: HTMLElement, clientX?: number, clientY?: number): void;
    /** Hide and remove the menu from the DOM. */
    hide(): void;
    /** Destroy the instance and release all resources. */
    destroy(): void;
    private buildMenu;
    private buildLeafItem;
    private buildParentItem;
    private buildSubmenu;
    /**
     * Wire the open/close hover behaviour for a parent item + its submenu.
     * Uses a short open delay (60 ms) and a close grace period (150 ms) to
     * prevent flicker when the mouse transitions between the item and the submenu.
     */
    private attachSubmenuListeners;
    /**
     * Portal a submenu into document.body and position it in viewport
     * coordinates. Portaling (rather than nesting it under its parent item)
     * keeps it clear of the parent menu's `overflow-y: auto` clipping, so a
     * fly-out can render correctly even while the menu body is scrolled.
     */
    private openSubmenu;
    /** Close and detach a portaled submenu opened via {@link openSubmenu}. */
    private closeSubmenu;
    private clearSubmenuTimers;
    private buildAllSections;
    /**
     * Sort section — three flat items: Sort Ascending, Sort Descending, Clear Sort.
     */
    private buildSortSection;
    /**
     * Filter section — three flat items: Quick Filter, Advanced Filter, Clear Filter.
     */
    private buildFilterSection;
    /**
     * Pin section — a single parent item whose submenu has Pin Left / Pin Right / Unpin.
     */
    private buildPinSection;
    /**
     * Move section — four flat items.  Shares a separator group with Pin.
     * Items are disabled when the column is already at the respective edge.
     */
    private buildMoveSection;
    /**
     * Resize section — a single parent item whose submenu has four resize operations.
     */
    private buildResizeSection;
    /**
     * Visibility section — a single parent item: Hide Column + Column Chooser.
     */
    private buildVisibilitySection;
    /**
     * Data section — Group by Column (flat leaf) + Aggregate (parent with submenu).
     * "Group by Column" is omitted when the column is not `groupable` or when no
     * {@link GroupCallbacks} have been registered.
     */
    private buildDataSection;
    /**
     * Clipboard section — a single parent item: Copy Header / Copy Column / Copy Values.
     */
    private buildClipboardSection;
    /**
     * Column section — a single parent item: Rename / Duplicate / Freeze / Lock / Reset.
     */
    private buildColumnSection;
    private createSeparator;
    private createIcon;
    private createLabel;
    /**
     * Position the menu relative to the anchor element (button click) or at the
     * cursor (right-click).  The menu is clamped to the visible viewport.
     */
    private positionMenu;
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
    private adjustSubmenuPosition;
}
//# sourceMappingURL=column-menu.d.ts.map