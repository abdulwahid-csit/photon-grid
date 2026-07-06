import type { RowNode } from '../../types/row.types';
import type { TreeDataConfig, TreeEdge } from '../../types/tree-data.types';
/**
 * Resolves raw row data into `{id, parentId, record}` edges, ready for
 * {@link buildTree}. Dispatches on `config.mode` — this is the only place
 * that branches on hierarchy source; everything downstream is source-agnostic.
 */
export declare function resolveEdges(config: TreeDataConfig, rawRecords: Record<string, unknown>[]): TreeEdge[];
/**
 * `childrenField` mode: input is already nested (`data[i][childrenField]` is
 * an array of raw child records, not `RowNode`s), so it needs one O(n) DFS
 * walk before it can be treated like every other mode's flat edge list.
 *
 * Ids fall back to a positional path (`"0"`, `"0.1"`, `"0.1.2"`, ...) when a
 * record has no `idField` value — stable across rebuilds as long as the
 * caller's array order/shape doesn't change between pipeline runs, which is
 * what keeps `expandedTreeNodeIds` (keyed by these ids) from losing state on
 * every `refresh()`.
 */
export declare function flattenNestedChildren(rootsRaw: Record<string, unknown>[], childrenField: string, idField: string): TreeEdge[];
/**
 * Builds the `RowNode` tree from resolved edges — classic two-pass O(n)
 * construction (no O(n²) parent scanning): pass 1 creates every node keyed
 * by id, pass 2 wires `children`/`parent`/`level` by looking up each edge's
 * `parentId`. An edge whose `parentId` doesn't resolve to a known id (a
 * dangling reference, or a genuine root) becomes a root.
 *
 * `expanded` is intentionally left `false` here — it's set per-node by
 * {@link flattenTree} at flatten time, since expansion state is external,
 * mutable, and this function is called fresh on every pipeline run.
 */
export declare function buildTree(edges: TreeEdge[], defaultRowHeight?: number): RowNode[];
/**
 * Flattens an expanded subset of the tree into the flat `RowNode[]` every
 * downstream consumer (pagination, Master/Detail injection, virtualization)
 * already expects — mirrors `flattenGroupTree` (`group-node.ts`) exactly:
 * push a node, recurse into its children only if it's expanded.
 */
export declare function flattenTree(roots: RowNode[], expandedIds: ReadonlySet<string>): RowNode[];
//# sourceMappingURL=tree-node.d.ts.map