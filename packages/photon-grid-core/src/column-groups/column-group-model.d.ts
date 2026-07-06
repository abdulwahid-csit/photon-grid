import type { ColumnDef } from '../types/column.types';
import type { ColumnStyleManager } from '../renderer/column-style-manager';
import type { EventBus } from '../event-bus/event-bus';
import { type IColumnGroupNode, type IColumnLeafNode, type ColumnTreeNode, type ColumnGroupSerialState } from './column-group.types';
/**
 * Central model for the column-group tree.
 *
 * Responsibilities:
 * - Build and maintain the column tree from a `ColumnDef[]` hierarchy.
 * - Provide flat leaf arrays for {@link ColumnModel} initialization.
 * - Answer width and position queries for {@link ColumnGroupHeaderBuilder}.
 * - Manage group collapse / expand state.
 * - Handle ordered mutations: move leaf, move group, set visibility/pin/width.
 *
 * The model fires grid events on all state changes so that {@link GridRenderer}
 * can schedule a re-render without having to poll the model directly.
 */
export declare class ColumnGroupModel {
    private readonly eventBus;
    /** Ordered root-level nodes of the full column tree. */
    private rootNodes;
    /** Quick O(1) lookup by groupId → IColumnGroupNode. */
    private readonly groupMap;
    /** Quick O(1) lookup by colId → IColumnLeafNode. */
    private readonly leafMap;
    /**
     * Maps any node identifier (groupId or colId) to its immediate parent group.
     * `null` means the node is at the root level.
     */
    private readonly parentMap;
    constructor(eventBus: EventBus);
    /**
     * Build the column tree from a `ColumnDef[]`.
     *
     * A `ColumnDef` with a non-empty `children` array becomes an
     * {@link IColumnGroupNode}; all others become {@link IColumnLeafNode}s.
     * Nesting is unlimited.
     *
     * @param defs - Top-level column definitions (may contain nested children).
     */
    init(defs: ColumnDef[]): void;
    /** `true` when at least one group (a `ColumnDef` with `children`) exists. */
    hasGroups(): boolean;
    /**
     * Maximum nesting depth across the entire column tree.
     *
     * | Tree shape          | Result |
     * |---------------------|--------|
     * | Pure flat columns   | `0`    |
     * | One level of groups | `1`    |
     * | Groups within groups| `2`    |
     */
    getMaxDepth(): number;
    /**
     * Returns root-level tree nodes, optionally filtered by pinned panel.
     *
     * @param panel - `'left'`, `'center'`, `'right'`, or `undefined` for all panels.
     */
    getRootNodes(panel?: 'left' | 'center' | 'right'): ColumnTreeNode[];
    /**
     * Return the {@link IColumnGroupNode} for a given `groupId`, or `undefined`
     * when not found.
     */
    getGroup(groupId: string): IColumnGroupNode | undefined;
    /**
     * Return the {@link IColumnLeafNode} for a given `colId`, or `undefined`
     * when not found.
     */
    getLeafNode(colId: string): IColumnLeafNode | undefined;
    /**
     * Return the immediate parent group of any node (group or leaf).
     * Returns `null` for root-level nodes.
     */
    getParent(nodeId: string): IColumnGroupNode | null;
    /**
     * Return the ordered ancestor path from the root group down to (but not
     * including) the node identified by `nodeId`.
     * Returns `[]` for root-level nodes.
     */
    getAncestors(nodeId: string): IColumnGroupNode[];
    /**
     * Returns **all** leaf columns in document order (depth-first, left-to-right),
     * regardless of their visibility or their parent group's collapsed state.
     * Used to initialize {@link ColumnModel} with the full flat leaf list.
     */
    getAllLeaves(): ColumnDef[];
    /**
     * Returns **visible** leaf columns in document order, skipping:
     * - Columns whose `visible` flag is `false`.
     * - Children of collapsed groups (`collapsed === true`).
     *
     * @param panel - Optional filter for a specific pinned panel.
     */
    getVisibleLeaves(panel?: 'left' | 'center' | 'right'): ColumnDef[];
    /**
     * Returns all leaf {@link ColumnDef}s that are direct or indirect children
     * of the group identified by `groupId`.
     * Returns an empty array when the group is not found.
     */
    getLeavesInGroup(groupId: string): ColumnDef[];
    /** `true` when the group with `groupId` is currently collapsed. */
    isGroupCollapsed(groupId: string): boolean;
    /**
     * Collapse a group, visually hiding all its children in the header.
     * Emits {@link GridEventType.COLUMN_GROUP_HEADER_COLLAPSED} when the state changes.
     */
    collapseGroup(groupId: string): void;
    /**
     * Expand a collapsed group, revealing its children in the header.
     * Emits {@link GridEventType.COLUMN_GROUP_HEADER_EXPANDED} when the state changes.
     */
    expandGroup(groupId: string): void;
    /**
     * Toggle the collapsed state of a group.
     * Internally calls either {@link collapseGroup} or {@link expandGroup}.
     */
    toggleGroup(groupId: string): void;
    /**
     * Compute the pixel width of a group header cell by summing all visible
     * leaf column widths within the group's subtree.
     *
     * When the group is collapsed the width equals the first visible leaf's
     * width (the "peek" column), falling back to `collapsedWidth` only when no
     * visible leaf exists.
     *
     * @param groupId   - The group to measure.
     * @param colStyles - Authoritative column-width source.
     */
    computeGroupWidth(groupId: string, colStyles: ColumnStyleManager): number;
    /**
     * Returns the first visible leaf `ColumnDef` directly inside a group.
     * Used to determine the "peek" column width when the group is collapsed.
     *
     * @param groupId - Target group identifier.
     */
    getFirstLeaf(groupId: string): ColumnDef | null;
    /**
     * Compute the total pixel width of all visible leaves in an arbitrary
     * subtree.  Respects collapsed groups.
     *
     * @param nodes     - Root nodes of the subtree to measure.
     * @param colStyles - Authoritative column-width source.
     */
    computeSubtreeWidth(nodes: ColumnTreeNode[], colStyles: ColumnStyleManager): number;
    /**
     * Return the zero-based index of a leaf column within the ordered
     * visible-leaf sequence for a panel.
     *
     * Used to locate the column within the virtual center column window.
     * Returns `-1` when the column is invisible or not found.
     *
     * @param colId - Target leaf column identifier.
     * @param panel - Optional panel filter.
     */
    getVisibleLeafIndex(colId: string, panel?: 'left' | 'center' | 'right'): number;
    /**
     * Update the `visible` flag on a leaf column.
     * Does **not** fire a grid event — the caller (typically {@link HeaderRenderer}
     * or {@link GridApi}) is responsible for propagating the change to
     * {@link ColumnModel} which fires the relevant events.
     */
    setLeafVisible(colId: string, visible: boolean): void;
    /**
     * Move a **leaf** column within the tree.
     *
     * @param colId          - The leaf column to move.
     * @param newParentId    - Target group's `groupId`, or `null` to move to root.
     * @param insertBeforeId - `colId` or `groupId` to insert before; `null` appends.
     */
    moveLeaf(colId: string, newParentId: string | null, insertBeforeId: string | null): void;
    /**
     * Move an **entire group** (with all its children) within the tree.
     *
     * Moving a group into one of its own descendants is silently ignored.
     *
     * @param groupId        - The group to move.
     * @param newParentId    - Target group's `groupId`, or `null` to move to root.
     * @param insertBeforeId - `colId` or `groupId` to insert before; `null` appends.
     */
    moveGroup(groupId: string, newParentId: string | null, insertBeforeId: string | null): void;
    /**
     * Distribute a resize `delta` (positive = grow, negative = shrink) across
     * the sibling columns of `colId` according to the group's
     * {@link IColumnGroupNode.resizeStrategy}.
     *
     * @param colId     - The column being resized.
     * @param delta     - Pixel delta to distribute among siblings.
     * @param colStyles - Width manager; widths are updated in-place via `setWidth`.
     * @returns Map of `colId → newWidth` for all affected siblings.
     */
    distributeResizeDelta(colId: string, delta: number, colStyles: ColumnStyleManager): Map<string, number>;
    /**
     * Extract a leaf from its current parent and wrap it in a new **solo group**
     * — a one-child group that acts as a draggable clone of the original parent.
     *
     * The new group is inserted at the root level immediately after the leaf's
     * old parent group position, or at the end when the old parent is null.
     *
     * @param colId - Leaf column identifier to extract.
     * @returns The generated `groupId` of the new solo group, or `null` when
     *   the leaf is not found.
     */
    createSoloGroupForLeaf(colId: string): string | null;
    /**
     * Dissolve a solo group: remove the wrapper group from the tree and move its
     * single leaf into the `targetGroupId`.  If the target is `null`, the leaf
     * is promoted to the root level at the original position.
     *
     * A no-op when the group is not a solo group or when the group is not found.
     *
     * @param soloGroupId   - The solo group to dissolve.
     * @param targetGroupId - Group to receive the leaf, or `null` for root level.
     * @param insertBeforeId - Optional sibling ID to insert before inside target.
     */
    dissolveGroupIfSolo(soloGroupId: string, targetGroupId: string | null, insertBeforeId?: string | null): void;
    /**
     * Prune any groups in the tree that have no children.
     * Called after drag-drop operations to clean up empty parents.
     */
    cleanEmptyGroups(): void;
    /**
     * Serialize all group expand/collapse states into a portable array.
     * Pair with {@link deserialize} for state persistence.
     */
    serialize(): ColumnGroupSerialState[];
    /**
     * Restore group states from a previously serialized snapshot.
     * Unknown group IDs are silently ignored.
     */
    deserialize(states: ColumnGroupSerialState[]): void;
    private buildTree;
    private computeDepth;
    private collectLeaves;
    private sumLeafWidths;
    /**
     * Walk a subtree depth-first and return the first leaf whose `visible`
     * flag is not `false`.  Returns `null` when the subtree is empty or all
     * leaves are hidden.
     */
    private findFirstVisibleLeaf;
    private nodeId;
    /**
     * Returns `true` when `potentialAncestor` is a direct or indirect ancestor
     * of `groupId` — prevents moving a group into its own subtree.
     */
    private isAncestorOf;
}
//# sourceMappingURL=column-group-model.d.ts.map