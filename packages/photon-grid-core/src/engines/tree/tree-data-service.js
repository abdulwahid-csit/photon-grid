import { GridEventType } from '../../types/event.types';
import { resolveEdges, buildTree, flattenTree } from './tree-node';
/**
 * Orchestrates Tree Data end to end: builds the hierarchy from raw row data,
 * filters it, sorts it, and flattens it into the plain `RowNode[]` the rest
 * of the pipeline already expects. Plays the same role for self-referential
 * hierarchies that `GroupingEngine` plays for column-value grouping —
 * expansion state lives in the separate `TreeExpansionService`, and
 * filtering/sorting are done by *calling* `FilterEngine`/`SortEngine`, never
 * by re-implementing condition matching or comparison here.
 */
export class TreeDataService {
    constructor(store, eventBus, filterEngine, sortEngine, expansionService) {
        this.store = store;
        this.eventBus = eventBus;
        this.filterEngine = filterEngine;
        this.sortEngine = sortEngine;
        this.expansionService = expansionService;
        this.config = null;
        /** The last-built, unfiltered/unsorted tree — kept so `moveNode`/`loadChildren`/selection cascades can resolve a node by id without re-walking raw data. */
        this.lastRoots = [];
        this.lastNodesById = new Map();
        /** Node ids already evaluated against `defaultExpanded` — mirrors `MasterDetailEngine.defaultAppliedNodeIds` so a user-collapsed node is never silently re-expanded on the next pipeline run. */
        this.defaultAppliedNodeIds = new Set();
        this.pendingLoadNodeIds = new Set();
        this.refreshCallback = null;
    }
    /** Applies the grid's `treeData` option block. Called once from `GridCore.initialize`. */
    configure(config) {
        this.config = config?.enabled ? config : null;
    }
    isEnabled() {
        return this.config !== null;
    }
    getConfig() {
        return this.config;
    }
    /** Registers the callback used to re-run the pipeline after an async lazy-load resolves or a reparent commits. Wired from `GridCore`. */
    setRefreshCallback(fn) {
        this.refreshCallback = fn;
    }
    /** `'parentId'`/`'childrenField'` hierarchies are stored data and can be mutated by drag-to-reparent; `'dataPath'`/`'custom'` are derived and read-only. */
    supportsReparenting() {
        return this.config?.mode === 'parentId' || this.config?.mode === 'childrenField';
    }
    /**
     * The full build → filter → sort → flatten sequence `GridApi.applyPipeline`
     * calls when Tree Data is enabled, replacing the flat filter/sort/group
     * steps for this pipeline run.
     */
    getFlatVisibleRows(allRows, columns) {
        if (!this.config)
            return allRows;
        let roots = this.buildRoots(allRows);
        this.applyDefaultExpansion(roots);
        roots = this.filterTree(roots, columns);
        roots = this.sortTree(roots, columns);
        return flattenTree(roots, this.expansionService.getExpandedIds());
    }
    /** O(n) hierarchy construction from the grid's raw (flat, un-treed) row data. Caches the result for `moveNode`/`loadChildren`/selection-cascade lookups. */
    buildRoots(allRows) {
        if (!this.config)
            return [];
        const rawRecords = allRows.map((r) => r.data);
        const edges = resolveEdges(this.config, rawRecords);
        const roots = buildTree(edges, allRows[0]?.height ?? 50);
        this.lastRoots = roots;
        this.lastNodesById = new Map();
        const index = (nodes) => {
            for (const node of nodes) {
                this.lastNodesById.set(node.nodeId, node);
                if (node.children.length > 0)
                    index(node.children);
            }
        };
        index(roots);
        return roots;
    }
    /**
     * Tree-aware filtering: a node survives if it matches the active filters
     * itself (via `FilterEngine.matchesRow` — the exact predicate the flat
     * path uses) **or** any descendant does, so a matching leaf's ancestor
     * chain stays visible. Builds filtered node copies rather than mutating
     * the cached hierarchy, so `lastRoots`/`lastNodesById` stay the true,
     * unfiltered tree for reparenting/selection.
     */
    filterTree(roots, columns) {
        if (!this.filterEngine.hasActiveFilters())
            return roots;
        const filterNode = (node) => {
            const filteredChildren = node.children
                .map(filterNode)
                .filter((n) => n !== null);
            const selfMatches = this.filterEngine.matchesRow(node, columns);
            if (!selfMatches && filteredChildren.length === 0)
                return null;
            return { ...node, children: filteredChildren, hasChildren: filteredChildren.length > 0 || node.hasChildren };
        };
        return roots.map(filterNode).filter((n) => n !== null);
    }
    /**
     * Tree-aware sorting: reuses `SortEngine.applySorting` completely
     * unchanged, once per sibling array (including the roots array itself).
     * `applySorting` already no-ops when no sort is configured, so an
     * unsorted tree walk costs one cheap pass with zero allocation.
     */
    sortTree(roots, columns) {
        const sortChildren = (nodes) => {
            const sorted = this.sortEngine.applySorting(nodes, columns);
            for (const node of sorted) {
                if (node.children.length > 0)
                    node.children = sortChildren(node.children);
            }
            return sorted;
        };
        return sortChildren(roots);
    }
    /**
     * Computes `RowNode.subtreeEndTop` for every tree row in the final,
     * laid-out `visibleRows` array. Must run *after* `RowModel.setVisibleRows`
     * assigns `top`/`height` — subtree extents can't be known before layout —
     * so `GridApi.applyPipeline` calls this as a separate step, not from
     * `getFlatVisibleRows`. One O(n) stack-based pass: whenever a row appears
     * whose `level` is <= an open ancestor's level, that ancestor's subtree
     * just ended at the new row's `top`.
     */
    annotateSubtreeExtents(rows) {
        if (!this.config || rows.length === 0)
            return;
        const stack = [];
        for (const row of rows) {
            if (row.type !== 'data')
                continue;
            while (stack.length > 0 && stack[stack.length - 1].level >= row.level) {
                stack.pop().subtreeEndTop = row.top;
            }
            stack.push(row);
        }
        const lastRow = rows[rows.length - 1];
        const end = lastRow.top + lastRow.height;
        for (const open of stack)
            open.subtreeEndTop = end;
    }
    getNode(nodeId) {
        return this.lastNodesById.get(nodeId);
    }
    /** The full, unfiltered/unsorted hierarchy from the most recent `getFlatVisibleRows`/`buildRoots` call — what `expandAllTreeNodes`/`collapseAllTreeNodes` walk. */
    getRoots() {
        return this.lastRoots;
    }
    /**
     * Mutates the underlying raw hierarchy so a subsequent pipeline run
     * rebuilds the tree with `draggedId` under its new parent, then requests a
     * refresh — never hand-splices `visibleRows`, since tree mode always
     * rebuilds it from raw data on every pipeline run anyway.
     *
     * `position: 'before'/'after'` reparents onto the *same parent as*
     * `targetId`; precise sibling ordering within that parent is not yet
     * tracked (a follow-up — see plan notes), so the node lands as that
     * parent's last child rather than at the exact hover position.
     */
    moveNode(draggedId, targetId, position) {
        if (!this.config || !this.supportsReparenting()) {
            console.warn(`[PhotonGrid] Tree Data drag-to-reparent isn't supported for mode "${this.config?.mode}" (only "parentId"/"childrenField" have a mutable hierarchy).`);
            return false;
        }
        const dragged = this.lastNodesById.get(draggedId);
        const target = this.lastNodesById.get(targetId);
        if (!dragged || !target || dragged.isTreeFiller || target.isTreeFiller)
            return false;
        const newParent = position === 'inside' ? target : target.parent;
        if (newParent === dragged || this.isDescendantOf(newParent, dragged))
            return false; // never drop a node inside its own subtree
        if (this.config.mode === 'parentId') {
            const idField = this.config.idField ?? 'id';
            const parentIdField = this.config.parentIdField ?? 'parentId';
            dragged.data[parentIdField] = newParent ? newParent.data[idField] : null;
        }
        else {
            this.reparentChildrenField(dragged, newParent);
        }
        this.refreshCallback?.();
        return true;
    }
    /** `'childrenField'` mode: splice the raw record out of its old parent's `children` array and into the new one — both are live references shared with `RowModel`'s raw data, so this mutation is visible on the next pipeline run. */
    reparentChildrenField(dragged, newParent) {
        const childrenField = this.config.childrenField ?? 'children';
        const oldParentChildren = dragged.parent
            ? (dragged.parent.data[childrenField] ?? [])
            : null;
        if (oldParentChildren) {
            const idx = oldParentChildren.indexOf(dragged.data);
            if (idx !== -1)
                oldParentChildren.splice(idx, 1);
        }
        if (newParent) {
            const newSiblings = newParent.data[childrenField] ?? [];
            newSiblings.push(dragged.data);
            newParent.data[childrenField] = newSiblings;
        }
    }
    isDescendantOf(candidate, ancestor) {
        let node = candidate;
        while (node) {
            if (node === ancestor)
                return true;
            node = node.parent;
        }
        return false;
    }
    /**
     * Lazy-loads a node's children via `TreeDataConfig.lazyLoadChildren`.
     * No-ops if lazy loading isn't configured, children are already loaded, or
     * a fetch for this node is already in flight. On resolve, appends the
     * fetched raw records as children of `node.data` (mode-appropriate: sets
     * `parentId` for `'parentId'` mode, pushes into the `children` array for
     * `'childrenField'` mode) and refreshes.
     */
    loadChildren(nodeId) {
        const fn = this.config?.lazyLoadChildren;
        const node = this.lastNodesById.get(nodeId);
        if (!fn || !node || node.childrenLoaded || this.pendingLoadNodeIds.has(nodeId))
            return;
        this.pendingLoadNodeIds.add(nodeId);
        fn(node)
            .then((children) => {
            this.attachLoadedChildren(node, children);
            node.childrenLoaded = true;
            this.eventBus.emit(GridEventType.TREE_CHILDREN_LOADED, { nodeId, children });
        })
            .catch((err) => {
            console.error(`[PhotonGrid] treeData.lazyLoadChildren failed for node "${nodeId}":`, err);
        })
            .finally(() => {
            this.pendingLoadNodeIds.delete(nodeId);
            this.refreshCallback?.();
        });
    }
    isLoadPending(nodeId) {
        return this.pendingLoadNodeIds.has(nodeId);
    }
    attachLoadedChildren(node, children) {
        if (!this.config)
            return;
        if (this.config.mode === 'parentId') {
            const idField = this.config.idField ?? 'id';
            const parentIdField = this.config.parentIdField ?? 'parentId';
            const parentId = node.data[idField];
            for (const child of children)
                child[parentIdField] = parentId;
        }
        else if (this.config.mode === 'childrenField') {
            const childrenField = this.config.childrenField ?? 'children';
            node.data[childrenField] = children;
        }
    }
    /**
     * Applies `TreeDataConfig.defaultExpanded` — but only to nodes never seen
     * before (tracked in `defaultAppliedNodeIds`, mirroring
     * `MasterDetailEngine.defaultAppliedNodeIds`). This runs on *every*
     * pipeline refresh (including the one right after a user collapses a
     * node), so re-evaluating already-seen nodes here would immediately
     * stomp a manual collapse back open — the exact bug this guard prevents.
     * `maxLevel` is `Infinity` for `defaultExpanded: true` (expand everything)
     * or the configured depth for a number.
     */
    applyDefaultExpansion(roots) {
        const { defaultExpanded } = this.config ?? {};
        if (!defaultExpanded)
            return;
        const maxLevel = defaultExpanded === true ? Infinity : defaultExpanded;
        const toExpand = [];
        const collect = (nodes) => {
            for (const node of nodes) {
                const isEligible = node.level < maxLevel && (node.children.length > 0 || node.hasChildren);
                if (isEligible && !this.defaultAppliedNodeIds.has(node.nodeId)) {
                    this.defaultAppliedNodeIds.add(node.nodeId);
                    toExpand.push(node);
                }
                if (node.children.length > 0)
                    collect(node.children);
            }
        };
        collect(roots);
        for (const node of toExpand)
            this.expansionService.expand(node);
    }
    destroy() {
        this.lastRoots = [];
        this.lastNodesById.clear();
        this.defaultAppliedNodeIds.clear();
        this.pendingLoadNodeIds.clear();
        this.refreshCallback = null;
    }
}
//# sourceMappingURL=tree-data-service.js.map