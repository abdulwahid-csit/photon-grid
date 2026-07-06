import type { IconRenderer } from '../icons/icon-renderer';
import type { DisplayGroupNode } from '../column-groups/display-group.types';
import type { DisplayGroupEngine } from '../column-groups/display-group-engine';
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
export declare class GroupContextMenu {
    private readonly engine;
    private readonly iconRenderer;
    private el;
    private anchorEl;
    private outsideClickFn;
    private escKeyFn;
    private callbacks;
    constructor(engine: DisplayGroupEngine, iconRenderer: IconRenderer);
    /**
     * Register optional callbacks for operations delegated outside this class.
     * Call this once after construction.
     */
    setCallbacks(callbacks: GroupContextMenuCallbacks): void;
    /**
     * Show the group context menu for `group`.
     *
     * @param group    - The group header node the menu operates on.
     * @param anchorEl - The element that triggered the menu (the group header cell).
     * @param clientX  - Viewport X for cursor-based positioning.
     * @param clientY  - Viewport Y for cursor-based positioning.
     */
    show(group: DisplayGroupNode, anchorEl: HTMLElement, clientX?: number, clientY?: number): void;
    /** Hide and remove the menu from the DOM. */
    hide(): void;
    /** Destroy the instance and release all resources. */
    destroy(): void;
    private buildMenu;
    /**
     * Build the ordered list of items and separators for the given group.
     * Disables move items when the group is already at the respective edge.
     */
    private buildEntries;
    private buildItem;
    private createSeparator;
    /**
     * Position the menu at the cursor (right-click) or below the anchor element
     * (button click).  Clamps to the visible viewport with a 4 px gutter.
     */
    private positionMenu;
}
//# sourceMappingURL=group-context-menu.d.ts.map