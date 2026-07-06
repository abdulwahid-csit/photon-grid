import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { TreeDataConfig } from '../../types/tree-data.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import type { FilterEngine } from '../filter/filter-engine';
import type { SortEngine } from '../sort/sort-engine';
import type { TreeExpansionService } from './tree-expansion-service';
/**
 * Orchestrates Tree Data end to end: builds the hierarchy from raw row data,
 * filters it, sorts it, and flattens it into the plain `RowNode[]` the rest
 * of the pipeline already expects. Plays the same role for self-referential
 * hierarchies that `GroupingEngine` plays for column-value grouping —
 * expansion state lives in the separate `TreeExpansionService`, and
 * filtering/sorting are done by *calling* `FilterEngine`/`SortEngine`, never
 * by re-implementing condition matching or comparison here.
 */
export declare class TreeDataService {
    private store;
    private eventBus;
    private filterEngine;
    private sortEngine;
    private expansionService;
    private config;
    /** The last-built, unfiltered/unsorted tree — kept so `moveNode`/`loadChildren`/selection cascades can resolve a node by id without re-walking raw data. */
    private lastRoots;
    private lastNodesById;
    /** Node ids already evaluated against `defaultExpanded` — mirrors `MasterDetailEngine.defaultAppliedNodeIds` so a user-collapsed node is never silently re-expanded on the next pipeline run. */
    private defaultAppliedNodeIds;
    private pendingLoadNodeIds;
    private refreshCallback;
    constructor(store: GridStore, eventBus: EventBus, filterEngine: FilterEngine, sortEngine: SortEngine, expansionService: TreeExpansionService);
    /** Applies the grid's `treeData` option block. Called once from `GridCore.initialize`. */
    configure(config: TreeDataConfig | undefined): void;
    isEnabled(): boolean;
    getConfig(): TreeDataConfig | null;
    /** Registers the callback used to re-run the pipeline after an async lazy-load resolves or a reparent commits. Wired from `GridCore`. */
    setRefreshCallback(fn: () => void): void;
    /** `'parentId'`/`'childrenField'` hierarchies are stored data and can be mutated by drag-to-reparent; `'dataPath'`/`'custom'` are derived and read-only. */
    supportsReparenting(): boolean;
    /**
     * The full build → filter → sort → flatten sequence `GridApi.applyPipeline`
     * calls when Tree Data is enabled, replacing the flat filter/sort/group
     * steps for this pipeline run.
     */
    getFlatVisibleRows(allRows: RowNode[], columns: ColumnDef[]): RowNode[];
    /** O(n) hierarchy construction from the grid's raw (flat, un-treed) row data. Caches the result for `moveNode`/`loadChildren`/selection-cascade lookups. */
    buildRoots(allRows: RowNode[]): RowNode[];
    /**
     * Tree-aware filtering: a node survives if it matches the active filters
     * itself (via `FilterEngine.matchesRow` — the exact predicate the flat
     * path uses) **or** any descendant does, so a matching leaf's ancestor
     * chain stays visible. Builds filtered node copies rather than mutating
     * the cached hierarchy, so `lastRoots`/`lastNodesById` stay the true,
     * unfiltered tree for reparenting/selection.
     */
    filterTree(roots: RowNode[], columns: ColumnDef[]): RowNode[];
    /**
     * Tree-aware sorting: reuses `SortEngine.applySorting` completely
     * unchanged, once per sibling array (including the roots array itself).
     * `applySorting` already no-ops when no sort is configured, so an
     * unsorted tree walk costs one cheap pass with zero allocation.
     */
    sortTree(roots: RowNode[], columns: ColumnDef[]): RowNode[];
    /**
     * Computes `RowNode.subtreeEndTop` for every tree row in the final,
     * laid-out `visibleRows` array. Must run *after* `RowModel.setVisibleRows`
     * assigns `top`/`height` — subtree extents can't be known before layout —
     * so `GridApi.applyPipeline` calls this as a separate step, not from
     * `getFlatVisibleRows`. One O(n) stack-based pass: whenever a row appears
     * whose `level` is <= an open ancestor's level, that ancestor's subtree
     * just ended at the new row's `top`.
     */
    annotateSubtreeExtents(rows: RowNode[]): void;
    getNode(nodeId: string): RowNode | undefined;
    /** The full, unfiltered/unsorted hierarchy from the most recent `getFlatVisibleRows`/`buildRoots` call — what `expandAllTreeNodes`/`collapseAllTreeNodes` walk. */
    getRoots(): RowNode[];
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
    moveNode(draggedId: string, targetId: string, position: 'before' | 'after' | 'inside'): boolean;
    /** `'childrenField'` mode: splice the raw record out of its old parent's `children` array and into the new one — both are live references shared with `RowModel`'s raw data, so this mutation is visible on the next pipeline run. */
    private reparentChildrenField;
    private isDescendantOf;
    /**
     * Lazy-loads a node's children via `TreeDataConfig.lazyLoadChildren`.
     * No-ops if lazy loading isn't configured, children are already loaded, or
     * a fetch for this node is already in flight. On resolve, appends the
     * fetched raw records as children of `node.data` (mode-appropriate: sets
     * `parentId` for `'parentId'` mode, pushes into the `children` array for
     * `'childrenField'` mode) and refreshes.
     */
    loadChildren(nodeId: string): void;
    isLoadPending(nodeId: string): boolean;
    private attachLoadedChildren;
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
    private applyDefaultExpansion;
    destroy(): void;
}
//# sourceMappingURL=tree-data-service.d.ts.map