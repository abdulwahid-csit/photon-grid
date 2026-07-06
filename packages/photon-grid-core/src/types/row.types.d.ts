export type RowNodeType = 'data' | 'group' | 'group-footer' | 'summary' | 'detail' | 'loading';
/**
 * Deterministic `nodeId` for a master row's detail node — shared by
 * `RowModel.createDetailNode` (construction) and `DetailRowRenderer`
 * (lookup) so the two never drift out of sync.
 */
export declare function detailNodeId(parentNodeId: string): string;
export interface RowNode {
    nodeId: string;
    rowIndex: number;
    data: Record<string, unknown>;
    type: RowNodeType;
    selected: boolean;
    expanded: boolean;
    editable: boolean;
    level: number;
    parent: RowNode | null;
    children: RowNode[];
    groupKey?: string;
    groupField?: string;
    groupValue?: unknown;
    childCount?: number;
    /**
     * Computed aggregation results for `type === 'group'` nodes.
     * Keyed by `colDef.field`; value is the aggregated number or `null` when no
     * qualifying leaf rows existed.  Populated by {@link AggregationEngine};
     * `undefined` when no columns have {@link ColumnDef.aggFunc} configured.
     */
    aggregatedValues?: Record<string, unknown>;
    height: number;
    top: number;
    cssClass?: string;
    detail?: Record<string, unknown>;
    /**
     * For `type === 'detail'` nodes: the `nodeId` of the master row this
     * detail section belongs to. Enables O(1) lookup without walking `parent`.
     */
    parentNodeId?: string;
    /**
     * Tree Data only (see `TreeDataService`). `true` when the underlying
     * hierarchy has 1+ children for this node — distinguishes a genuine leaf
     * from a node whose children just haven't been lazy-loaded yet, so the
     * renderer knows to draw a toggle even before `children` is populated.
     */
    hasChildren?: boolean;
    /**
     * Tree Data only, for `lazyLoadChildren`. `undefined`/`false` means this
     * node's children haven't been fetched yet — expanding it should trigger
     * `TreeDataService.loadChildren` instead of reading `children` directly.
     */
    childrenLoaded?: boolean;
    /**
     * Tree Data only, for `getDataPath` mode. `true` for a synthetic
     * intermediate node representing a path prefix with no real backing
     * record (e.g. `"Electronics"` in `["Electronics", "Phones", "iPhone"]`)
     * — mirrors how `GroupingEngine` synthesizes group-header rows, so the
     * renderer/selection/drag layers can treat it as non-editable and (for
     * drag-to-reparent) as read-only.
     */
    isTreeFiller?: boolean;
    /**
     * Tree Data only. The `top` pixel position where this node's own subtree
     * ends in the current flattened, laid-out `visibleRows` — i.e. the `top`
     * of whatever row (sibling, or an ancestor's next sibling) immediately
     * follows its last visible descendant. Annotated by
     * `TreeDataService.annotateSubtreeExtents` right after layout, and used by
     * `TreeStickyRowTracker` to decide when a stuck ancestor row should be
     * pushed off by the next block — the same "block end" concept
     * `StickyRowTracker` gets for free from a Master/Detail row's single
     * fixed-position detail row.
     */
    subtreeEndTop?: number;
}
export interface RowGroupNode extends RowNode {
    type: 'group';
    groupKey: string;
    groupField: string;
    groupValue: unknown;
    childCount: number;
    aggregatedValues: Record<string, unknown>;
}
export interface RowDataNode extends RowNode {
    type: 'data';
}
/**
 * A read-only summary row rendered **below** the last leaf of an expanded group.
 * Mirrors the group header's {@link RowNode.aggregatedValues} so the same
 * totals/averages are visible at the bottom of every group — identical to
 * AG Grid's `groupIncludeFooter` behaviour.
 *
 * Cells are fully selectable and copyable; editing is intentionally blocked
 * because the values are computed, not stored in `data`.
 */
export interface RowGroupFooterNode extends RowNode {
    type: 'group-footer';
    groupKey: string;
    groupField: string;
    groupValue: unknown;
    childCount: number;
    aggregatedValues: Record<string, unknown>;
}
export interface RowDetailNode extends RowNode {
    type: 'detail';
    parentRow: RowNode;
    detail: Record<string, unknown>;
}
export interface RowRange {
    startIndex: number;
    endIndex: number;
}
export interface RowDropPayload {
    draggedRows: RowNode[];
    targetRow: RowNode;
    position: 'before' | 'after' | 'inside';
}
export interface RowClickPayload {
    row: RowNode;
    event: MouseEvent;
    rowIndex: number;
}
export interface RowEditPayload {
    row: RowNode;
    field: string;
    oldValue: unknown;
    newValue: unknown;
}
//# sourceMappingURL=row.types.d.ts.map