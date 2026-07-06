import type { ColumnDef, ColumnPinPosition, ColumnState } from '../types/column.types';
/**
 * Discriminated-union tag for nodes in the column tree.
 *
 * Every node is either a **group** (branch with children) or a **leaf** (a
 * renderable data column).  Use the `nodeType` property to narrow the type.
 *
 * @example
 * ```ts
 * if (node.nodeType === ColumnGroupNodeType.GROUP) {
 *   // IColumnGroupNode — has groupId, children, collapsed, …
 * } else {
 *   // IColumnLeafNode — has colDef
 * }
 * ```
 */
export declare const enum ColumnGroupNodeType {
    GROUP = "group",
    LEAF = "leaf"
}
/**
 * Strategy controlling how pixel delta is distributed among sibling columns
 * when a leaf column inside a group is resized.
 *
 * | Strategy        | Description                                                   |
 * |-----------------|---------------------------------------------------------------|
 * | `PROPORTIONAL`  | Siblings absorb delta proportional to their current width.    |
 * | `EQUAL`         | Siblings each gain / lose an equal number of pixels.          |
 * | `FIRST_FIXED`   | Only the **last** sibling absorbs the delta; first is fixed.  |
 * | `LAST_FIXED`    | Only the **first** sibling absorbs the delta; last is fixed.  |
 */
export declare enum ColumnGroupResizeStrategy {
    PROPORTIONAL = "proportional",
    EQUAL = "equal",
    FIRST_FIXED = "firstFixed",
    LAST_FIXED = "lastFixed"
}
/**
 * Parameters passed to a custom group-header cell renderer function.
 *
 * @example
 * ```ts
 * const def: ColumnDef = {
 *   colId: 'grp_personal',
 *   header: 'Personal Info',
 *   children: [...],
 *   groupHeaderRendererFn: ({ group, collapsed }) =>
 *     `<span class="my-group-header">${group.header} ${collapsed ? '▶' : '▼'}</span>`,
 * };
 * ```
 */
export interface GroupHeaderRendererParams {
    /** The group node being rendered. */
    group: IColumnGroupNode;
    /** `true` when the group is currently collapsed (all children hidden). */
    collapsed: boolean;
    /** Reference to the public grid API (cast to `GridApi` as needed). */
    api: unknown;
}
/**
 * A **group** (branch) node in the column tree.
 *
 * A group's pixel width is always the sum of its visible children's widths.
 * When collapsed, its width equals {@link collapsedWidth}.
 */
export interface IColumnGroupNode {
    readonly nodeType: ColumnGroupNodeType.GROUP;
    /** Unique identifier for this group. Defaults to the originating `ColumnDef.colId`. */
    groupId: string;
    /** Display label rendered in the group header cell. */
    header: string;
    /** Ordered list of child nodes (may be groups or leaves). */
    children: ColumnTreeNode[];
    /** Pinned panel this group belongs to, inherited from its first child. */
    pinned?: ColumnPinPosition;
    /** `true` when the group is currently collapsed (all children hidden except the first leaf). */
    collapsed: boolean;
    /**
     * Minimum width (px) of the group header cell.  Used as the floor during resize.
     * @default 26
     */
    collapsedWidth: number;
    /** Allow the user to resize this group header, distributing pixels among children. */
    resizable: boolean;
    /**
     * When `true`, child columns cannot be individually dragged out of this group.
     * Dragging a child moves the entire group instead.
     */
    marryChildren: boolean;
    /**
     * The group is **expanded** when first rendered.
     * @default true
     */
    openByDefault: boolean;
    /** Strategy for distributing resize deltas among sibling columns. */
    resizeStrategy: ColumnGroupResizeStrategy;
    /** Additional CSS class(es) applied to the group header cell element. */
    headerCssClass?: string;
    /**
     * Custom renderer function for the group header cell.
     * When provided, the default label + collapse button are not rendered.
     */
    headerRendererFn?: (params: GroupHeaderRendererParams) => HTMLElement | string;
    /**
     * `true` when this group was programmatically created to wrap a single leaf
     * that was dragged out of its original parent group (a "solo clone group").
     * Solo groups auto-dissolve when their leaf is dragged back to its origin.
     */
    isSoloGroup?: boolean;
    /**
     * Stores the groupId of the group this solo group's leaf was extracted from.
     * Used to detect "merge back" drops so the clone group is dissolved cleanly.
     */
    originalParentGroupId?: string;
}
/**
 * A **leaf** node in the column tree.  Wraps a {@link ColumnDef} and provides
 * uniform tree-traversal behaviour alongside {@link IColumnGroupNode}.
 */
export interface IColumnLeafNode {
    readonly nodeType: ColumnGroupNodeType.LEAF;
    /** The underlying column definition. */
    colDef: ColumnDef;
}
/**
 * A node in the column tree — either an {@link IColumnGroupNode} or an
 * {@link IColumnLeafNode}.
 */
export type ColumnTreeNode = IColumnGroupNode | IColumnLeafNode;
/**
 * Descriptor for a single cell in the multi-row grouped header layout.
 *
 * Produced by {@link ColumnGroupHeaderBuilder.computeLayout} and consumed
 * by the DOM-building phase in the same builder.
 */
export interface HeaderGroupCell {
    /**
     * Semantic role of the cell.
     * - `'group'` — a spanning group header cell.
     * - `'leaf'`  — a regular leaf-column header cell (rendered by `HeaderRenderer`).
     * - `'filler'` — transparent spacer preserving layout for standalone leaves.
     */
    type: 'group' | 'leaf' | 'filler';
    /**
     * Node identifier.
     * - Group cells: `groupId`.
     * - Leaf cells:  `colId`.
     * - Filler cells: `'_filler_<colId>_d<depth>'`.
     */
    id: string;
    /** Display label (empty for fillers). */
    label: string;
    /** Pixel left offset from the panel content's origin (before virtualization). */
    left: number;
    /** Pixel width of the cell. */
    width: number;
    /**
     * Depth row in which this cell is first rendered.
     * - Top-level group → `0`.
     * - Leaf at root (no groups) → `0` with `rowSpan = maxDepth + 1`.
     */
    depth: number;
    /**
     * Number of depth rows this cell spans downward.
     * - Standard group or leaf-row cell: `1`.
     * - Standalone leaf above all group rows: `maxDepth + 1`.
     */
    rowSpan: number;
    /** Populated when `type === 'leaf'`. */
    colDef?: ColumnDef;
    /** Populated when `type === 'group'`. */
    groupNode?: IColumnGroupNode;
}
/**
 * One horizontal row in the multi-row grouped-header area.
 *
 * The first `maxDepth` rows contain group cells; the last row is the leaf row
 * (which is rendered separately by {@link HeaderRenderer}).
 */
export interface HeaderGroupRow {
    /** 0 = topmost group row, `maxDepth - 1` = deepest group row. */
    depth: number;
    cells: HeaderGroupCell[];
}
/** Persisted expand/collapse snapshot for a single column group. */
export interface ColumnGroupSerialState {
    groupId: string;
    collapsed: boolean;
}
/**
 * Complete serializable snapshot of the column-group system.
 * Returned by {@link ColumnGroupStateManager.getState} and accepted by
 * {@link ColumnGroupStateManager.applyState}.
 */
export interface ColumnGroupSystemState {
    /** Expand/collapse state for each group in the tree. */
    groups: ColumnGroupSerialState[];
    /**
     * Flat column states (width, visibility, pin, order) for all leaf columns.
     * Compatible with {@link ColumnModel.applyColumnStates}.
     */
    columnStates: ColumnState[];
}
/**
 * Options controlling the header-group layout computation in
 * {@link ColumnGroupHeaderBuilder.computeLayout}.
 */
export interface HeaderGroupLayoutOptions {
    /**
     * Maximum nesting depth across the **entire** column tree (≥ 0).
     * `0` means no groups; `1` means one level of groups, etc.
     */
    maxDepth: number;
    /** Height of a single header row in pixels. */
    rowHeight: number;
    /**
     * Index of the first visible leaf in the virtual column window.
     * Pass `0` to render from the first column.
     */
    virtualStartIdx: number;
    /**
     * Exclusive end index of the visible leaf window.
     * Pass `Number.MAX_SAFE_INTEGER` to render to the last column.
     */
    virtualEndIdx: number;
    /** Pixel width of the left spacer (off-screen left columns). */
    leftSpacerWidth: number;
}
/** Payload emitted when a column group is collapsed. */
export interface ColumnGroupHeaderCollapsedEvent {
    groupId: string;
    header: string;
}
/** Payload emitted when a column group is expanded. */
export interface ColumnGroupHeaderExpandedEvent {
    groupId: string;
    header: string;
}
/** Payload emitted when a new column group is registered in the model. */
export interface ColumnGroupHeaderCreatedEvent {
    groupId: string;
    header: string;
    childCount: number;
}
/** Payload emitted when a column group is removed from the model. */
export interface ColumnGroupHeaderRemovedEvent {
    groupId: string;
    header: string;
}
//# sourceMappingURL=column-group.types.d.ts.map