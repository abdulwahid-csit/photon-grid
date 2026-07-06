import type { IconRenderer } from '../icons/icon-renderer';
import type { DisplayHeaderTree, DisplayGroupNode } from './display-group.types';
/**
 * Options passed to DOM-building methods of {@link DisplayGroupHeaderBuilder}.
 */
export interface DisplayGroupCellOptions {
    /** Height of a single header row in pixels — reserved for future row-height customization. */
    rowHeight: number;
    /** Called when the user clicks a group header cell to toggle collapsed state. */
    onCollapseToggle?: (logicalGroupId: string) => void;
    /** Called when the user finishes dragging a group resize handle. */
    onGroupResize?: (logicalGroupId: string, newWidth: number) => void;
    /**
     * Called on `mousedown` of a group header cell (before the drag threshold check).
     * The drag handler uses this to attach its own listeners to each new cell.
     */
    onGroupHeaderMouseDown?: (e: MouseEvent, node: DisplayGroupNode, el: HTMLElement) => void;
    /**
     * Guard function — returns `true` when a group drag just completed.
     * Used to suppress the residual `click` event that fires after mouseup.
     */
    didJustDragFn?: () => boolean;
    /**
     * Called when the user right-clicks a group header cell.
     * The consumer (e.g. `HeaderRenderer`) opens a `GroupContextMenu` from here.
     */
    onGroupContextMenu?: (e: MouseEvent, node: DisplayGroupNode, el: HTMLElement) => void;
}
/**
 * Builds the multi-row grouped header DOM from a {@link DisplayHeaderTree}.
 *
 * ### Layout model
 * ```
 * pg-header-group-row depth-0  ← group cells (position: absolute)
 * pg-header-group-row depth-1  ← deeper group cells (if nested)
 * pg-header-row                ← leaf headers (built by HeaderRenderer)
 * ```
 *
 * Group rows use `position: relative` with absolutely-positioned cells,
 * allowing arbitrary column widths and nesting depths without flex constraints.
 * Filler cells occupy the group-row space of flat/shallow columns, making them
 * appear to span the full header height.
 *
 * ### Responsibilities
 * - Build one `HTMLElement` per group depth row (`buildGroupRows`).
 * - Rebuild existing rows in place without re-mounting (`updateGroupRows`).
 * - Render group cells: label, collapse button, resize handle.
 * - Render filler cells for flat/shallow columns.
 */
export declare class DisplayGroupHeaderBuilder {
    private readonly iconRenderer;
    constructor(iconRenderer: IconRenderer);
    /**
     * Build one `HTMLElement` per group depth row from the given display tree.
     * Returns an empty array when `maxGroupDepth === 0` (no groups present).
     *
     * @param tree    - Fully-computed display header tree.
     * @param options - Callbacks and configuration for interactive cells.
     */
    buildGroupRows(tree: DisplayHeaderTree, options: DisplayGroupCellOptions): HTMLElement[];
    /**
     * Rebuild the contents of existing group-row elements in place.
     * Called when column widths change or collapse state is toggled.
     *
     * @param rowEls  - Previously built row elements (from `buildGroupRows`).
     * @param tree    - Updated display header tree.
     * @param options - Callbacks and configuration.
     */
    updateGroupRows(rowEls: HTMLElement[], tree: DisplayHeaderTree, options: DisplayGroupCellOptions): void;
    private buildRow;
    private populateRow;
    private buildCell;
    /**
     * Build a single interactive group header cell.
     *
     * @param group   - Display group node supplying all rendering data.
     * @param left    - Pixel left offset within the row.
     * @param width   - Pixel width of the cell.
     * @param options - Interactive callbacks.
     */
    private buildGroupCell;
    private buildDefaultContent;
    /**
     * Start a group-header resize drag.
     * Computes the new width on each mousemove and fires `onGroupResize`.
     *
     * @param e          - Initiating mousedown event.
     * @param group      - The group being resized.
     * @param startWidth - Pixel width at drag start.
     * @param options    - Contains the `onGroupResize` callback.
     */
    private startGroupResize;
}
//# sourceMappingURL=display-group-header-builder.d.ts.map