import type { ColumnStyleManager } from '../renderer/column-style-manager';
import type { IconRenderer } from '../icons/icon-renderer';
import type { ColumnGroupDragHandler } from './column-group-drag-handler';
import { type ColumnTreeNode, type HeaderGroupRow } from './column-group.types';
/**
 * Options for building the DOM cells in a group header row.
 */
export interface GroupCellBuildOptions {
    /** Height of a single header row in pixels — used for span calculation. */
    rowHeight: number;
    /** Callback fired when the user clicks or presses Enter/Space on a group cell. */
    onCollapseToggle?: (groupId: string) => void;
    /** Callback fired when the user drags the group resize handle. */
    onGroupResize?: (groupId: string, newWidth: number) => void;
}
/**
 * Builds the multi-row grouped header DOM for a single panel.
 *
 * ### Layout model
 *
 * ```
 * pg-header-group-row depth-0  ← group cells (position: absolute)
 * pg-header-group-row depth-1  ← deeper group cells (if nested)
 * pg-header-row                ← existing leaf row (built by HeaderRenderer)
 * pg-filter-row                ← optional filter row
 * ```
 *
 * Group rows use `position: relative` with absolutely-positioned cells so that
 * any arbitrary column width and nesting depth can be expressed without
 * flex-layout constraints.  The rows are direct children of the panel's
 * `pg-panel__header-inner` element, which means they scroll together with the
 * leaf row via the same `translateX` CSS transform.
 *
 * ### Virtualization
 *
 * Group rows render **all** group cells (not just the virtual window slice).
 * Because groups span many leaf columns, the number of group cells is small
 * compared to the number of leaf cells — the perf overhead is negligible.
 * The visible portion is automatically clipped by the panel's `overflow: hidden`.
 */
export declare class ColumnGroupHeaderBuilder {
    private readonly iconRenderer;
    /** Optional drag handler — wired after construction via {@link setDragConfig}. */
    private dragHandler;
    /** Getter returning the root `.pg-grid` element for drag boundary checks. */
    private gridElGetter;
    constructor(iconRenderer: IconRenderer);
    /**
     * Wire a {@link ColumnGroupDragHandler} into the builder so that each
     * group header cell receives drag-and-drop listeners at build time.
     *
     * Must be called before the first `buildGroupRows` invocation if drag
     * support is needed.
     *
     * @param handler    - Fully-constructed drag handler instance.
     * @param gridElGetter - Returns the root `.pg-grid` element (may be `null`
     *   before mount).
     */
    setDragConfig(handler: ColumnGroupDragHandler, gridElGetter: () => HTMLElement | null): void;
    /**
     * Build one `HTMLElement` per depth level for the given panel tree.
     *
     * Returns an ordered array of group-row elements (depth 0 first).
     * The leaf row is **not** included — it is built by {@link HeaderRenderer}.
     * Returns an empty array when `maxDepth === 0` (no groups).
     *
     * @param panelNodes  - Root-level tree nodes for this panel.
     * @param colStyles   - Width manager for resolving leaf column widths.
     * @param maxDepth    - Global tree depth (from `ColumnGroupModel.getMaxDepth()`).
     * @param cellOptions - DOM build options (row height, callbacks).
     */
    buildGroupRows(panelNodes: ColumnTreeNode[], colStyles: ColumnStyleManager, maxDepth: number, cellOptions: GroupCellBuildOptions): HTMLElement[];
    /**
     * Rebuild the cells of existing group-row elements in place.
     * Called after a virtual-column-window change or width update.
     *
     * @param groupRowEls - Previously built group-row elements (from `buildGroupRows`).
     * @param panelNodes  - Current root nodes for this panel.
     * @param colStyles   - Current column widths.
     * @param maxDepth    - Global tree depth.
     * @param cellOptions - DOM build options.
     */
    updateGroupRows(groupRowEls: HTMLElement[], panelNodes: ColumnTreeNode[], colStyles: ColumnStyleManager, maxDepth: number, cellOptions: GroupCellBuildOptions): void;
    /**
     * Compute the header layout data without constructing any DOM.
     * Returns one {@link HeaderGroupRow} per depth level (0 to `maxDepth - 1`).
     * Used for testing and by the drag handler for hit-testing.
     *
     * @param panelNodes - Root-level tree nodes for this panel.
     * @param colStyles  - Width manager for leaf column widths.
     * @param maxDepth   - Maximum nesting depth across the full tree.
     */
    computeLayout(panelNodes: ColumnTreeNode[], colStyles: ColumnStyleManager, maxDepth: number): HeaderGroupRow[];
    private walk;
    /**
     * Walk a subtree and return the `colId` of the first non-hidden leaf.
     * Returns `null` when no visible leaf is found.
     */
    private getFirstVisibleLeafColId;
    private buildGroupRow;
    private populateGroupRow;
    private buildGroupCell;
    private buildDefaultContent;
    private startGroupResize;
}
//# sourceMappingURL=column-group-header-builder.d.ts.map