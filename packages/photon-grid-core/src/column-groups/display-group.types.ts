import type { ColumnDef } from '../types/column.types';

/**
 * Immutable definition of a logical column group.
 * Parsed once from the user-supplied ColumnDef hierarchy and never modified.
 */
export interface LogicalGroupDef {
  /** Unique identifier — defaults to the originating ColumnDef.colId. */
  readonly id: string;
  /** Display label for the group header cell. */
  readonly header: string;
  /** Parent logical group ID; `null` for root groups. */
  readonly parentId: string | null;
  /** Optional CSS class applied to every display instance of this group. */
  readonly headerCssClass?: string;
  /** Whether the group header shows a resize handle. @default true */
  readonly resizable?: boolean;
  /** Minimum pixel width when the group is in the collapsed-peek state. @default 36 */
  readonly collapsedWidth?: number;
  /** When `true`, child columns cannot be individually reordered. @default false */
  readonly marryChildren?: boolean;
  /** Custom renderer for the group header cell. */
  readonly headerRendererFn?: (p: GroupHeaderRendererParams) => string | HTMLElement;
}

/** Parameters passed to a custom group header renderer function. */
export interface GroupHeaderRendererParams {
  readonly logicalGroup: LogicalGroupDef;
  readonly collapsed: boolean;
  readonly api: null;
}

/**
 * A single rendered display instance of a logical group.
 *
 * The same logical group can produce **multiple display instances** when its
 * columns are interleaved with columns from other groups in the current
 * displayed order.
 *
 * @example
 * ```
 * ColumnDef: Personal[Name, Email]
 * Displayed:  [Name, Country, Email]
 * → two display instances: Personal[Name] and Personal[Email]
 * ```
 */
export interface DisplayGroupNode {
  readonly kind: 'group';
  /** Unique per render cycle — must not be persisted across rebuilds. */
  readonly instanceId: string;
  /** References the immutable logical group. */
  readonly logicalGroupId: string;
  readonly header: string;
  /** Zero-based depth: 0 = topmost group row, 1 = nested group row, etc. */
  readonly depth: number;
  /** Ordered child display nodes — groups and/or leaves. */
  readonly children: ReadonlyArray<DisplayNode>;
  /** Left offset in pixels from the panel's scroll origin. */
  left: number;
  /** Sum of visible children widths in pixels. */
  width: number;
  /** `true` when this instance's logical group is in the collapsed-peek state. */
  collapsed: boolean;
  readonly resizable: boolean;
  readonly collapsedWidth: number;
  readonly headerCssClass?: string;
  readonly headerRendererFn?: LogicalGroupDef['headerRendererFn'];
}

/** A single rendered leaf column node in the display tree. */
export interface DisplayLeafNode {
  readonly kind: 'leaf';
  readonly colDef: ColumnDef;
  /** Logical group ID path root-first. Empty array for ungrouped flat columns. */
  readonly groupPath: ReadonlyArray<string>;
  left: number;
  width: number;
}

/** Union of all display tree node types. */
export type DisplayNode = DisplayGroupNode | DisplayLeafNode;

// ── Rendered header cells ────────────────────────────────────────────────────

/** A rendered group header cell — one display group node in a header row. */
export interface RenderedGroupCell {
  readonly kind: 'group';
  readonly node: DisplayGroupNode;
  readonly left: number;
  readonly width: number;
  readonly depth: number;
}

/**
 * A transparent filler cell that occupies group-row space for a column that
 * has no ancestor group at this depth.
 *
 * Styled to match the header background so the column visually spans the
 * full header height — creating a seamless tall-cell appearance.
 */
export interface RenderedFillerCell {
  readonly kind: 'filler';
  /** Unique ID used for keying DOM comparisons. */
  readonly id: string;
  /**
   * The leaf column ID this filler represents.
   * Stamped onto the DOM element as `data-col-id` so that the group-drag
   * CSS-transform path can apply `--pg-drag-x` offsets to both the filler
   * cell (in the group row) and the leaf header / body cell in a single rule.
   */
  readonly colId: string;
  readonly left: number;
  readonly width: number;
  readonly depth: number;
}

/** Union of cell types in a rendered header row. */
export type RenderedHeaderCell = RenderedGroupCell | RenderedFillerCell;

/** One horizontal rendered header row at a specific depth level. */
export interface RenderedHeaderRow {
  readonly depth: number;
  readonly cells: ReadonlyArray<RenderedHeaderCell>;
}

/**
 * The complete display header tree produced by `DisplayGroupBuilder`.
 * Consumed by `DisplayGroupHeaderBuilder` to produce DOM elements.
 */
export interface DisplayHeaderTree {
  /** Root-level display nodes — depth-0 groups and ungrouped flat leaves. */
  readonly roots: ReadonlyArray<DisplayNode>;
  /**
   * Number of group header rows above the leaf row.
   * - `0` — no groups; header has only the leaf row.
   * - `N` — N group rows at depths 0..N-1, plus the leaf row below them.
   */
  readonly maxGroupDepth: number;
  /**
   * Flattened group rows — one per depth level `0..maxGroupDepth-1`.
   * Each row contains group cells and filler cells sorted by `left`.
   */
  readonly groupRows: ReadonlyArray<RenderedHeaderRow>;
  /** Total pixel width of all visible leaf columns. */
  readonly totalWidth: number;
}

/** Serializable collapse state for one logical group. */
export interface GroupCollapseState {
  logicalGroupId: string;
  collapsed: boolean;
}
