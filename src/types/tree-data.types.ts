import type { RowNode } from './row.types';
import type { ColumnDef } from './column.types';

/**
 * How raw row data maps onto a hierarchy. All four map onto one of two
 * construction algorithms internally (see `tree-node.ts`):
 *
 * - `'parentId'`, `'dataPath'`, and `'custom'` are all "flat array + a way to
 *   compute a per-record `(id, parentId)` pair" — they share the exact same
 *   two-pass O(n) tree builder, differing only in how that pair is derived.
 * - `'childrenField'` is the one genuinely different shape (already-nested
 *   input), needing a single O(n) flattening walk before the same builder
 *   runs.
 */
export type TreeDataMode = 'parentId' | 'childrenField' | 'dataPath' | 'custom';

/**
 * Pluggable hierarchy resolver for `mode: 'custom'` — an escape hatch for
 * shapes `parentId`/`childrenField`/`dataPath` don't cover (e.g. deriving a
 * parent from two composite fields, or from a lookup table external to the
 * row itself).
 */
export interface TreeHierarchyProvider {
  /** Returns a stable, unique identifier for `data`. */
  getId(data: Record<string, unknown>): string;
  /** Returns the identifier of `data`'s parent, or `null`/`undefined` for a root. */
  getParentKey(data: Record<string, unknown>): string | null | undefined;
}

/**
 * Configures Tree Data for one grid instance, supplied via
 * `GridOptions.treeData`. Exactly one `mode` is active at a time; the
 * fields relevant to the other three modes are ignored.
 */
export interface TreeDataConfig {
  /** Master switch — `false`/omitted leaves the grid in normal flat/grouped mode. */
  enabled: boolean;
  mode: TreeDataMode;

  /** `'parentId'` mode: field holding each record's own id. Default `'id'`. */
  idField?: string;
  /** `'parentId'` mode: field holding the parent's id (`null`/absent = root). Default `'parentId'`. */
  parentIdField?: string;

  /** `'childrenField'` mode: field holding a record's nested child records. Default `'children'`. */
  childrenField?: string;

  /**
   * `'dataPath'` mode: returns the full ancestor path for a record, e.g.
   * `['Electronics', 'Phones', 'iPhone 15']`. Intermediate path segments
   * with no record of their own are synthesized as `isTreeFiller` nodes.
   */
  getDataPath?: (data: Record<string, unknown>) => string[];

  /** `'custom'` mode: supplies id/parent resolution directly. */
  hierarchyProvider?: TreeHierarchyProvider;

  /**
   * Which column shows the expand/collapse toggle and indentation.
   * Defaults to the first visible column, mirroring Master/Detail's
   * `toggleColumnId` convention.
   */
  toggleColumnId?: string;

  /**
   * Initial expansion: `true` expands every node, a `number` expands every
   * node whose `level` is less than it (e.g. `1` expands just the roots),
   * omitted/`false` starts fully collapsed.
   */
  defaultExpanded?: boolean | number;

  /**
   * When provided, a node's children are fetched on first expand instead of
   * being derived up front — a single `type: 'loading'` placeholder child is
   * shown until the promise resolves. Only meaningful for `'parentId'` and
   * `'childrenField'` modes (the other two derive the full hierarchy from
   * data already in hand).
   */
  lazyLoadChildren?: (node: RowNode) => Promise<Record<string, unknown>[]>;
}

/** Emitted on `TREE_NODE_TOGGLE_CLICKED` — the raw click, before expansion state changes. */
export interface TreeNodeToggleClickedPayload {
  row: RowNode;
  colDef: ColumnDef;
}

/** Emitted on `TREE_NODE_EXPANDED` / `TREE_NODE_COLLAPSED`, after expansion state has changed. */
export interface TreeNodeTogglePayload {
  nodeId: string;
  row: RowNode;
}

/** Emitted on `TREE_CHILDREN_LOADED` once a `lazyLoadChildren` promise resolves. */
export interface TreeChildrenLoadedPayload {
  nodeId: string;
  children: Record<string, unknown>[];
}

/** One resolved `(id, parentId)` edge — the shared intermediate shape both hierarchy-source algorithms converge on before `buildTree` runs. */
export interface TreeEdge {
  id: string;
  parentId: string | null;
  record: Record<string, unknown>;
  /** `true` for a `getDataPath` filler segment with no real backing record. */
  isFiller?: boolean;
}
