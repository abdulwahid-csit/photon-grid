import { GridEventType } from '../../types/event.types';
/**
 * Owns Tree Data's expand/collapse state — `expandedTreeNodeIds` on
 * `GridStore` — and nothing else. Deliberately kept separate from
 * `TreeDataService` (which builds/filters/sorts the hierarchy) even though
 * `GroupingEngine` inlines this exact same responsibility for column-value
 * groups; splitting it out here is what the tree feature asked for, and
 * doesn't require touching grouping's already-working code to match.
 *
 * Method shapes mirror `GroupingEngine.expandGroup`/`collapseGroup`/
 * `toggleGroup`/`isGroupExpanded` (`grouping-engine.ts:72-107`) almost
 * verbatim — same pattern, different key namespace.
 */
export class TreeExpansionService {
    constructor(store, eventBus) {
        this.store = store;
        this.eventBus = eventBus;
    }
    expand(node) {
        const ids = new Set(this.store.get('expandedTreeNodeIds'));
        ids.add(node.nodeId);
        this.store.set('expandedTreeNodeIds', ids);
        this.eventBus.emit(GridEventType.TREE_NODE_EXPANDED, { nodeId: node.nodeId, row: node });
    }
    collapse(node) {
        const ids = new Set(this.store.get('expandedTreeNodeIds'));
        ids.delete(node.nodeId);
        this.store.set('expandedTreeNodeIds', ids);
        this.eventBus.emit(GridEventType.TREE_NODE_COLLAPSED, { nodeId: node.nodeId, row: node });
    }
    toggle(node) {
        if (this.isExpanded(node.nodeId))
            this.collapse(node);
        else
            this.expand(node);
    }
    isExpanded(nodeId) {
        return this.store.get('expandedTreeNodeIds').has(nodeId);
    }
    /** Expands every node in `roots` (and their descendants) — "expand all". */
    expandAll(roots) {
        const ids = new Set();
        const collect = (nodes) => {
            for (const node of nodes) {
                if (node.children.length > 0 || node.hasChildren)
                    ids.add(node.nodeId);
                if (node.children.length > 0)
                    collect(node.children);
            }
        };
        collect(roots);
        this.store.set('expandedTreeNodeIds', ids);
    }
    collapseAll() {
        this.store.set('expandedTreeNodeIds', new Set());
    }
    /**
     * Expands every node whose depth is less than `maxLevel` — backs
     * `TreeDataConfig.defaultExpanded` when it's a number (e.g. `1` expands
     * just the roots). `maxLevel <= 0` leaves everything collapsed.
     */
    expandToLevel(roots, maxLevel) {
        if (maxLevel <= 0) {
            this.collapseAll();
            return;
        }
        const ids = new Set();
        const collect = (nodes) => {
            for (const node of nodes) {
                if (node.level < maxLevel && (node.children.length > 0 || node.hasChildren)) {
                    ids.add(node.nodeId);
                    if (node.children.length > 0)
                        collect(node.children);
                }
            }
        };
        collect(roots);
        this.store.set('expandedTreeNodeIds', ids);
    }
    getExpandedIds() {
        return this.store.get('expandedTreeNodeIds');
    }
}
//# sourceMappingURL=tree-expansion-service.js.map