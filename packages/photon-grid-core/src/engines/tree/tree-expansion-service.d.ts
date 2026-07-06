import type { RowNode } from '../../types/row.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
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
export declare class TreeExpansionService {
    private store;
    private eventBus;
    constructor(store: GridStore, eventBus: EventBus);
    expand(node: RowNode): void;
    collapse(node: RowNode): void;
    toggle(node: RowNode): void;
    isExpanded(nodeId: string): boolean;
    /** Expands every node in `roots` (and their descendants) — "expand all". */
    expandAll(roots: RowNode[]): void;
    collapseAll(): void;
    /**
     * Expands every node whose depth is less than `maxLevel` — backs
     * `TreeDataConfig.defaultExpanded` when it's a number (e.g. `1` expands
     * just the roots). `maxLevel <= 0` leaves everything collapsed.
     */
    expandToLevel(roots: RowNode[], maxLevel: number): void;
    getExpandedIds(): ReadonlySet<string>;
}
//# sourceMappingURL=tree-expansion-service.d.ts.map