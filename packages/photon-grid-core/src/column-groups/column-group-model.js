import { GridEventType } from '../types/event.types';
import { ColumnGroupResizeStrategy, } from './column-group.types';
/** Internal counter used to generate unique solo-group IDs without `Date.now()`. */
let _soloGroupSeq = 0;
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
export class ColumnGroupModel {
    constructor(eventBus) {
        this.eventBus = eventBus;
        /** Ordered root-level nodes of the full column tree. */
        this.rootNodes = [];
        /** Quick O(1) lookup by groupId → IColumnGroupNode. */
        this.groupMap = new Map();
        /** Quick O(1) lookup by colId → IColumnLeafNode. */
        this.leafMap = new Map();
        /**
         * Maps any node identifier (groupId or colId) to its immediate parent group.
         * `null` means the node is at the root level.
         */
        this.parentMap = new Map();
    }
    // ── Initialization ───────────────────────────────────────────────────────
    /**
     * Build the column tree from a `ColumnDef[]`.
     *
     * A `ColumnDef` with a non-empty `children` array becomes an
     * {@link IColumnGroupNode}; all others become {@link IColumnLeafNode}s.
     * Nesting is unlimited.
     *
     * @param defs - Top-level column definitions (may contain nested children).
     */
    init(defs) {
        this.groupMap.clear();
        this.leafMap.clear();
        this.parentMap.clear();
        this.rootNodes = this.buildTree(defs, null);
        for (const [groupId, group] of this.groupMap) {
            this.eventBus.emit(GridEventType.COLUMN_GROUP_HEADER_CREATED, {
                groupId,
                header: group.header,
                childCount: group.children.length,
            });
        }
    }
    /** `true` when at least one group (a `ColumnDef` with `children`) exists. */
    hasGroups() {
        return this.groupMap.size > 0;
    }
    // ── Tree queries ─────────────────────────────────────────────────────────
    /**
     * Maximum nesting depth across the entire column tree.
     *
     * | Tree shape          | Result |
     * |---------------------|--------|
     * | Pure flat columns   | `0`    |
     * | One level of groups | `1`    |
     * | Groups within groups| `2`    |
     */
    getMaxDepth() {
        return this.computeDepth(this.rootNodes);
    }
    /**
     * Returns root-level tree nodes, optionally filtered by pinned panel.
     *
     * @param panel - `'left'`, `'center'`, `'right'`, or `undefined` for all panels.
     */
    getRootNodes(panel) {
        if (!panel)
            return this.rootNodes;
        return this.rootNodes.filter((node) => {
            const pin = node.nodeType === "group" /* ColumnGroupNodeType.GROUP */
                ? (node.pinned ?? null)
                : (node.colDef.pinned ?? null);
            if (panel === 'left')
                return pin === 'left';
            if (panel === 'right')
                return pin === 'right';
            return pin !== 'left' && pin !== 'right';
        });
    }
    /**
     * Return the {@link IColumnGroupNode} for a given `groupId`, or `undefined`
     * when not found.
     */
    getGroup(groupId) {
        return this.groupMap.get(groupId);
    }
    /**
     * Return the {@link IColumnLeafNode} for a given `colId`, or `undefined`
     * when not found.
     */
    getLeafNode(colId) {
        return this.leafMap.get(colId);
    }
    /**
     * Return the immediate parent group of any node (group or leaf).
     * Returns `null` for root-level nodes.
     */
    getParent(nodeId) {
        return this.parentMap.get(nodeId) ?? null;
    }
    /**
     * Return the ordered ancestor path from the root group down to (but not
     * including) the node identified by `nodeId`.
     * Returns `[]` for root-level nodes.
     */
    getAncestors(nodeId) {
        const path = [];
        let current = this.parentMap.get(nodeId) ?? null;
        while (current !== null) {
            path.unshift(current);
            current = this.parentMap.get(current.groupId) ?? null;
        }
        return path;
    }
    // ── Leaf column queries ──────────────────────────────────────────────────
    /**
     * Returns **all** leaf columns in document order (depth-first, left-to-right),
     * regardless of their visibility or their parent group's collapsed state.
     * Used to initialize {@link ColumnModel} with the full flat leaf list.
     */
    getAllLeaves() {
        const result = [];
        this.collectLeaves(this.rootNodes, result, false);
        return result;
    }
    /**
     * Returns **visible** leaf columns in document order, skipping:
     * - Columns whose `visible` flag is `false`.
     * - Children of collapsed groups (`collapsed === true`).
     *
     * @param panel - Optional filter for a specific pinned panel.
     */
    getVisibleLeaves(panel) {
        const result = [];
        const nodes = panel ? this.getRootNodes(panel) : this.rootNodes;
        this.collectLeaves(nodes, result, true);
        return result;
    }
    /**
     * Returns all leaf {@link ColumnDef}s that are direct or indirect children
     * of the group identified by `groupId`.
     * Returns an empty array when the group is not found.
     */
    getLeavesInGroup(groupId) {
        const group = this.groupMap.get(groupId);
        if (!group)
            return [];
        const result = [];
        this.collectLeaves(group.children, result, false);
        return result;
    }
    // ── Collapse / expand ────────────────────────────────────────────────────
    /** `true` when the group with `groupId` is currently collapsed. */
    isGroupCollapsed(groupId) {
        return this.groupMap.get(groupId)?.collapsed ?? false;
    }
    /**
     * Collapse a group, visually hiding all its children in the header.
     * Emits {@link GridEventType.COLUMN_GROUP_HEADER_COLLAPSED} when the state changes.
     */
    collapseGroup(groupId) {
        const group = this.groupMap.get(groupId);
        if (!group || group.collapsed)
            return;
        group.collapsed = true;
        this.eventBus.emit(GridEventType.COLUMN_GROUP_HEADER_COLLAPSED, {
            groupId,
            header: group.header,
        });
    }
    /**
     * Expand a collapsed group, revealing its children in the header.
     * Emits {@link GridEventType.COLUMN_GROUP_HEADER_EXPANDED} when the state changes.
     */
    expandGroup(groupId) {
        const group = this.groupMap.get(groupId);
        if (!group || !group.collapsed)
            return;
        group.collapsed = false;
        this.eventBus.emit(GridEventType.COLUMN_GROUP_HEADER_EXPANDED, {
            groupId,
            header: group.header,
        });
    }
    /**
     * Toggle the collapsed state of a group.
     * Internally calls either {@link collapseGroup} or {@link expandGroup}.
     */
    toggleGroup(groupId) {
        const group = this.groupMap.get(groupId);
        if (!group)
            return;
        if (group.collapsed)
            this.expandGroup(groupId);
        else
            this.collapseGroup(groupId);
    }
    // ── Width computation ────────────────────────────────────────────────────
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
    computeGroupWidth(groupId, colStyles) {
        const group = this.groupMap.get(groupId);
        if (!group)
            return 0;
        if (group.collapsed) {
            const first = this.findFirstVisibleLeaf(group.children);
            if (first)
                return colStyles.getWidth(first.colDef.colId);
            return group.collapsedWidth;
        }
        return this.sumLeafWidths(group.children, colStyles);
    }
    /**
     * Returns the first visible leaf `ColumnDef` directly inside a group.
     * Used to determine the "peek" column width when the group is collapsed.
     *
     * @param groupId - Target group identifier.
     */
    getFirstLeaf(groupId) {
        const group = this.groupMap.get(groupId);
        if (!group)
            return null;
        return this.findFirstVisibleLeaf(group.children)?.colDef ?? null;
    }
    /**
     * Compute the total pixel width of all visible leaves in an arbitrary
     * subtree.  Respects collapsed groups.
     *
     * @param nodes     - Root nodes of the subtree to measure.
     * @param colStyles - Authoritative column-width source.
     */
    computeSubtreeWidth(nodes, colStyles) {
        return this.sumLeafWidths(nodes, colStyles);
    }
    // ── Ordered leaf index ───────────────────────────────────────────────────
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
    getVisibleLeafIndex(colId, panel) {
        return this.getVisibleLeaves(panel).findIndex((c) => c.colId === colId);
    }
    // ── Leaf mutations ───────────────────────────────────────────────────────
    /**
     * Update the `visible` flag on a leaf column.
     * Does **not** fire a grid event — the caller (typically {@link HeaderRenderer}
     * or {@link GridApi}) is responsible for propagating the change to
     * {@link ColumnModel} which fires the relevant events.
     */
    setLeafVisible(colId, visible) {
        const leaf = this.leafMap.get(colId);
        if (leaf)
            leaf.colDef.visible = visible;
    }
    // ── Ordering ─────────────────────────────────────────────────────────────
    /**
     * Move a **leaf** column within the tree.
     *
     * @param colId          - The leaf column to move.
     * @param newParentId    - Target group's `groupId`, or `null` to move to root.
     * @param insertBeforeId - `colId` or `groupId` to insert before; `null` appends.
     */
    moveLeaf(colId, newParentId, insertBeforeId) {
        const leaf = this.leafMap.get(colId);
        if (!leaf)
            return;
        const oldParent = this.parentMap.get(colId) ?? null;
        const newParent = newParentId ? (this.groupMap.get(newParentId) ?? null) : null;
        const oldList = oldParent ? oldParent.children : this.rootNodes;
        const oldIdx = oldList.findIndex((n) => this.nodeId(n) === colId);
        if (oldIdx !== -1)
            oldList.splice(oldIdx, 1);
        const newList = newParent ? newParent.children : this.rootNodes;
        const insertIdx = insertBeforeId !== null
            ? newList.findIndex((n) => this.nodeId(n) === insertBeforeId)
            : -1;
        if (insertIdx !== -1)
            newList.splice(insertIdx, 0, leaf);
        else
            newList.push(leaf);
        this.parentMap.set(colId, newParent);
        this.eventBus.emit(GridEventType.COLUMN_MOVED, {
            colDef: leaf.colDef,
            fromIndex: oldIdx,
            toIndex: insertIdx >= 0 ? insertIdx : newList.length - 1,
        });
    }
    /**
     * Move an **entire group** (with all its children) within the tree.
     *
     * Moving a group into one of its own descendants is silently ignored.
     *
     * @param groupId        - The group to move.
     * @param newParentId    - Target group's `groupId`, or `null` to move to root.
     * @param insertBeforeId - `colId` or `groupId` to insert before; `null` appends.
     */
    moveGroup(groupId, newParentId, insertBeforeId) {
        const group = this.groupMap.get(groupId);
        if (!group)
            return;
        const newParent = newParentId ? (this.groupMap.get(newParentId) ?? null) : null;
        if (newParent && this.isAncestorOf(groupId, newParent.groupId))
            return;
        const oldParent = this.parentMap.get(groupId) ?? null;
        const oldList = oldParent ? oldParent.children : this.rootNodes;
        const oldIdx = oldList.findIndex((n) => this.nodeId(n) === groupId);
        if (oldIdx !== -1)
            oldList.splice(oldIdx, 1);
        const newList = newParent ? newParent.children : this.rootNodes;
        const insertIdx = insertBeforeId !== null
            ? newList.findIndex((n) => this.nodeId(n) === insertBeforeId)
            : -1;
        if (insertIdx !== -1)
            newList.splice(insertIdx, 0, group);
        else
            newList.push(group);
        this.parentMap.set(groupId, newParent);
    }
    // ── Resize ───────────────────────────────────────────────────────────────
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
    distributeResizeDelta(colId, delta, colStyles) {
        const result = new Map();
        const parent = this.parentMap.get(colId);
        if (!parent)
            return result;
        const siblings = parent.children
            .filter((n) => n.nodeType === "leaf" /* ColumnGroupNodeType.LEAF */ &&
            n.colDef.colId !== colId &&
            n.colDef.visible !== false)
            .map((n) => n.colDef);
        if (siblings.length === 0)
            return result;
        const strategy = parent.resizeStrategy;
        if (strategy === ColumnGroupResizeStrategy.PROPORTIONAL) {
            const totalW = siblings.reduce((s, c) => s + colStyles.getWidth(c.colId), 0);
            for (const sibling of siblings) {
                const w = colStyles.getWidth(sibling.colId);
                const share = totalW > 0 ? (w / totalW) : (1 / siblings.length);
                const newW = Math.max(sibling.minWidth ?? 40, w - delta * share);
                result.set(sibling.colId, newW);
            }
        }
        else if (strategy === ColumnGroupResizeStrategy.EQUAL) {
            const perSibling = delta / siblings.length;
            for (const sibling of siblings) {
                const newW = Math.max(sibling.minWidth ?? 40, colStyles.getWidth(sibling.colId) - perSibling);
                result.set(sibling.colId, newW);
            }
        }
        else if (strategy === ColumnGroupResizeStrategy.FIRST_FIXED) {
            // Last sibling absorbs all delta
            const last = siblings[siblings.length - 1];
            const newW = Math.max(last.minWidth ?? 40, colStyles.getWidth(last.colId) - delta);
            result.set(last.colId, newW);
        }
        else {
            // LAST_FIXED: first sibling absorbs all delta
            const first = siblings[0];
            const newW = Math.max(first.minWidth ?? 40, colStyles.getWidth(first.colId) - delta);
            result.set(first.colId, newW);
        }
        return result;
    }
    // ── Solo-group (clone) management ────────────────────────────────────────
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
    createSoloGroupForLeaf(colId) {
        const leaf = this.leafMap.get(colId);
        if (!leaf)
            return null;
        const oldParent = this.parentMap.get(colId) ?? null;
        // Remove leaf from its current parent
        const oldList = oldParent ? oldParent.children : this.rootNodes;
        const oldIdx = oldList.findIndex((n) => this.nodeId(n) === colId);
        if (oldIdx !== -1)
            oldList.splice(oldIdx, 1);
        // Build solo group inheriting the original parent's identity
        const soloGroupId = `grp_solo_${colId}_${++_soloGroupSeq}`;
        const soloGroup = {
            nodeType: "group" /* ColumnGroupNodeType.GROUP */,
            groupId: soloGroupId,
            header: oldParent?.header ?? leaf.colDef.header,
            children: [leaf],
            collapsed: false,
            collapsedWidth: 36,
            resizable: true,
            marryChildren: false,
            openByDefault: true,
            resizeStrategy: ColumnGroupResizeStrategy.PROPORTIONAL,
            isSoloGroup: true,
            originalParentGroupId: oldParent?.groupId ?? undefined,
        };
        this.groupMap.set(soloGroupId, soloGroup);
        this.parentMap.set(soloGroupId, null);
        this.parentMap.set(colId, soloGroup);
        // Insert into root right after the old parent
        const insertAfter = oldParent
            ? this.rootNodes.findIndex((n) => this.nodeId(n) === oldParent.groupId)
            : -1;
        if (insertAfter >= 0) {
            this.rootNodes.splice(insertAfter + 1, 0, soloGroup);
        }
        else {
            this.rootNodes.push(soloGroup);
        }
        this.eventBus.emit(GridEventType.COLUMN_GROUP_HEADER_CREATED, {
            groupId: soloGroupId,
            header: soloGroup.header,
            childCount: 1,
        });
        return soloGroupId;
    }
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
    dissolveGroupIfSolo(soloGroupId, targetGroupId, insertBeforeId = null) {
        const group = this.groupMap.get(soloGroupId);
        if (!group?.isSoloGroup || group.children.length !== 1)
            return;
        const leaf = group.children[0];
        if (leaf.nodeType !== "leaf" /* ColumnGroupNodeType.LEAF */)
            return;
        // Remove solo group from root
        const rootIdx = this.rootNodes.findIndex((n) => this.nodeId(n) === soloGroupId);
        if (rootIdx !== -1)
            this.rootNodes.splice(rootIdx, 1);
        this.groupMap.delete(soloGroupId);
        this.parentMap.delete(soloGroupId);
        // Re-parent the leaf
        const targetGroup = targetGroupId ? (this.groupMap.get(targetGroupId) ?? null) : null;
        const targetList = targetGroup ? targetGroup.children : this.rootNodes;
        const insertIdx = insertBeforeId !== null
            ? targetList.findIndex((n) => this.nodeId(n) === insertBeforeId)
            : -1;
        if (insertIdx !== -1)
            targetList.splice(insertIdx, 0, leaf);
        else
            targetList.push(leaf);
        this.parentMap.set(leaf.colDef.colId, targetGroup);
        this.eventBus.emit(GridEventType.COLUMN_GROUP_HEADER_REMOVED, {
            groupId: soloGroupId,
            header: group.header,
        });
    }
    /**
     * Prune any groups in the tree that have no children.
     * Called after drag-drop operations to clean up empty parents.
     */
    cleanEmptyGroups() {
        const toRemove = [];
        for (const [id, group] of this.groupMap) {
            if (group.children.length === 0)
                toRemove.push(id);
        }
        for (const id of toRemove) {
            const parent = this.parentMap.get(id) ?? null;
            const list = parent ? parent.children : this.rootNodes;
            const idx = list.findIndex((n) => this.nodeId(n) === id);
            if (idx !== -1)
                list.splice(idx, 1);
            this.groupMap.delete(id);
            this.parentMap.delete(id);
            this.eventBus.emit(GridEventType.COLUMN_GROUP_HEADER_REMOVED, {
                groupId: id,
                header: this.groupMap.get(id)?.header ?? id,
            });
        }
    }
    // ── Serialisation ────────────────────────────────────────────────────────
    /**
     * Serialize all group expand/collapse states into a portable array.
     * Pair with {@link deserialize} for state persistence.
     */
    serialize() {
        const result = [];
        for (const [groupId, group] of this.groupMap) {
            result.push({ groupId, collapsed: group.collapsed });
        }
        return result;
    }
    /**
     * Restore group states from a previously serialized snapshot.
     * Unknown group IDs are silently ignored.
     */
    deserialize(states) {
        for (const { groupId, collapsed } of states) {
            const group = this.groupMap.get(groupId);
            if (group)
                group.collapsed = collapsed;
        }
    }
    // ── Private: tree construction ───────────────────────────────────────────
    buildTree(defs, parent) {
        return defs.map((def) => {
            if (def.children && def.children.length > 0) {
                const groupId = def.colId
                    ?? `grp_${def.header.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
                const group = {
                    nodeType: "group" /* ColumnGroupNodeType.GROUP */,
                    groupId,
                    header: def.header,
                    children: [],
                    pinned: def.pinned,
                    collapsed: def.openByDefault === false,
                    collapsedWidth: def.collapsedWidth ?? 26,
                    resizable: def.resizable !== false,
                    marryChildren: def.marryChildren === true,
                    openByDefault: def.openByDefault !== false,
                    resizeStrategy: def.resizeStrategy
                        ?? ColumnGroupResizeStrategy.PROPORTIONAL,
                    headerCssClass: def.headerCssClass,
                    headerRendererFn: def.groupHeaderRendererFn,
                };
                group.children = this.buildTree(def.children, group);
                this.groupMap.set(groupId, group);
                this.parentMap.set(groupId, parent);
                return group;
            }
            const leaf = {
                nodeType: "leaf" /* ColumnGroupNodeType.LEAF */,
                colDef: def,
            };
            this.leafMap.set(def.colId, leaf);
            this.parentMap.set(def.colId, parent);
            return leaf;
        });
    }
    // ── Private: tree traversal ───────────────────────────────────────────────
    computeDepth(nodes) {
        let max = 0;
        for (const node of nodes) {
            if (node.nodeType === "group" /* ColumnGroupNodeType.GROUP */) {
                const d = this.computeDepth(node.children);
                if (d + 1 > max)
                    max = d + 1;
            }
        }
        return max;
    }
    collectLeaves(nodes, result, respectCollapse) {
        for (const node of nodes) {
            if (node.nodeType === "leaf" /* ColumnGroupNodeType.LEAF */) {
                if (!respectCollapse || node.colDef.visible !== false) {
                    result.push(node.colDef);
                }
            }
            else if (!respectCollapse || !node.collapsed) {
                this.collectLeaves(node.children, result, respectCollapse);
            }
            else {
                // Collapsed: include only the first visible leaf ("peek" column)
                const first = this.findFirstVisibleLeaf(node.children);
                if (first && first.colDef.visible !== false)
                    result.push(first.colDef);
            }
        }
    }
    sumLeafWidths(nodes, colStyles) {
        let total = 0;
        for (const node of nodes) {
            if (node.nodeType === "leaf" /* ColumnGroupNodeType.LEAF */) {
                if (node.colDef.visible !== false) {
                    total += colStyles.getWidth(node.colDef.colId);
                }
            }
            else if (!node.collapsed) {
                total += this.sumLeafWidths(node.children, colStyles);
            }
            else {
                // Collapsed: count only the first visible leaf's width
                const first = this.findFirstVisibleLeaf(node.children);
                if (first)
                    total += colStyles.getWidth(first.colDef.colId);
            }
        }
        return total;
    }
    /**
     * Walk a subtree depth-first and return the first leaf whose `visible`
     * flag is not `false`.  Returns `null` when the subtree is empty or all
     * leaves are hidden.
     */
    findFirstVisibleLeaf(nodes) {
        for (const node of nodes) {
            if (node.nodeType === "leaf" /* ColumnGroupNodeType.LEAF */) {
                if (node.colDef.visible !== false)
                    return node;
            }
            else {
                const found = this.findFirstVisibleLeaf(node.children);
                if (found)
                    return found;
            }
        }
        return null;
    }
    nodeId(node) {
        return node.nodeType === "group" /* ColumnGroupNodeType.GROUP */ ? node.groupId : node.colDef.colId;
    }
    /**
     * Returns `true` when `potentialAncestor` is a direct or indirect ancestor
     * of `groupId` — prevents moving a group into its own subtree.
     */
    isAncestorOf(groupId, potentialAncestor) {
        let current = potentialAncestor;
        while (current !== null) {
            if (current === groupId)
                return true;
            const parent = this.parentMap.get(current);
            current = parent ? parent.groupId : null;
        }
        return false;
    }
}
//# sourceMappingURL=column-group-model.js.map