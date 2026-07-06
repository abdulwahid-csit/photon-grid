/**
 * Pure hierarchy-construction functions for Tree Data. No class, no store
 * access, no side effects — `TreeDataService` is the only caller, and it
 * owns everything stateful (expansion, filtering, sorting). Kept separate so
 * the O(n) construction algorithms are trivially unit-testable in isolation.
 *
 * All four {@link TreeDataConfig.mode} values reduce to two algorithms:
 *
 * 1. **Flat array + a per-record `(id, parentId)` resolver** — `'parentId'`,
 *    `'dataPath'`, and `'custom'` are all this, differing only in how the
 *    pair is derived (see {@link resolveEdges}).
 * 2. **Nested `children` arrays** — `'childrenField'` alone, since the input
 *    isn't flat; {@link flattenNestedChildren} walks it once into the same
 *    `TreeEdge[]` shape algorithm 1 produces, so {@link buildTree} never
 *    needs to know which mode produced its input.
 */
/** Default field names, mirroring every other Photon config's "sensible default, fully overridable" convention. */
const DEFAULT_ID_FIELD = 'id';
const DEFAULT_PARENT_ID_FIELD = 'parentId';
const DEFAULT_CHILDREN_FIELD = 'children';
/**
 * Resolves raw row data into `{id, parentId, record}` edges, ready for
 * {@link buildTree}. Dispatches on `config.mode` — this is the only place
 * that branches on hierarchy source; everything downstream is source-agnostic.
 */
export function resolveEdges(config, rawRecords) {
    switch (config.mode) {
        case 'parentId':
            return resolveParentIdEdges(rawRecords, config.idField ?? DEFAULT_ID_FIELD, config.parentIdField ?? DEFAULT_PARENT_ID_FIELD);
        case 'dataPath':
            return resolveDataPathEdges(rawRecords, config.getDataPath);
        case 'custom':
            return resolveCustomEdges(rawRecords, config.hierarchyProvider);
        case 'childrenField':
            return flattenNestedChildren(rawRecords, config.childrenField ?? DEFAULT_CHILDREN_FIELD, config.idField ?? DEFAULT_ID_FIELD);
        default:
            return [];
    }
}
function resolveParentIdEdges(records, idField, parentIdField) {
    const edges = new Array(records.length);
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rawId = record[idField];
        const rawParentId = record[parentIdField];
        edges[i] = {
            id: rawId != null ? String(rawId) : `pos_${i}`,
            parentId: rawParentId != null ? String(rawParentId) : null,
            record,
        };
    }
    return edges;
}
/**
 * `getDataPath` mode: each record's full ancestor path (e.g.
 * `['Electronics', 'Phones', 'iPhone 15']`) implies both its own id (the
 * full path, joined) and its parent's id (the path minus its last segment).
 * Path prefixes with no record of their own (`'Electronics'`,
 * `'Electronics/Phones'` above, if only the leaf was ever supplied) are
 * synthesized as filler edges — the same idea as `GroupingEngine`'s
 * synthetic group-header rows, just keyed by path instead of column value.
 */
function resolveDataPathEdges(records, getDataPath) {
    const edges = new Map();
    for (const record of records) {
        const path = getDataPath(record);
        for (let depth = 0; depth < path.length; depth++) {
            const id = path.slice(0, depth + 1).join('/');
            const isLeaf = depth === path.length - 1;
            if (isLeaf) {
                // A real record always wins over/replaces a same-path filler that an
                // earlier record's ancestor path may have already synthesized.
                edges.set(id, { id, parentId: depth > 0 ? path.slice(0, depth).join('/') : null, record });
            }
            else if (!edges.has(id)) {
                edges.set(id, {
                    id,
                    parentId: depth > 0 ? path.slice(0, depth).join('/') : null,
                    record: { [path[depth]]: path[depth] },
                    isFiller: true,
                });
            }
        }
    }
    return Array.from(edges.values());
}
function resolveCustomEdges(records, provider) {
    return records.map((record) => ({
        id: provider.getId(record),
        parentId: provider.getParentKey(record) ?? null,
        record,
    }));
}
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
export function flattenNestedChildren(rootsRaw, childrenField, idField) {
    const edges = [];
    function walk(records, parentId, positionalPrefix) {
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const positionalId = positionalPrefix ? `${positionalPrefix}.${i}` : String(i);
            const rawId = record[idField];
            const id = rawId != null ? String(rawId) : positionalId;
            edges.push({ id, parentId, record });
            const rawChildren = record[childrenField];
            if (Array.isArray(rawChildren) && rawChildren.length > 0) {
                walk(rawChildren, id, positionalId);
            }
        }
    }
    walk(rootsRaw, null, '');
    return edges;
}
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
export function buildTree(edges, defaultRowHeight = 50) {
    const nodesById = new Map();
    for (const edge of edges) {
        nodesById.set(edge.id, {
            nodeId: edge.id,
            rowIndex: -1,
            data: edge.record,
            type: 'data',
            selected: false,
            expanded: false,
            editable: !edge.isFiller,
            level: 0,
            parent: null,
            children: [],
            hasChildren: false,
            isTreeFiller: edge.isFiller,
            height: defaultRowHeight,
            top: 0,
        });
    }
    const roots = [];
    for (const edge of edges) {
        const node = nodesById.get(edge.id);
        const parent = edge.parentId != null ? nodesById.get(edge.parentId) : undefined;
        if (parent) {
            parent.children.push(node);
            parent.hasChildren = true;
            node.parent = parent;
        }
        else {
            roots.push(node);
        }
    }
    // Levels can only be assigned once every parent link exists (a record can
    // reference a parent that appears later in `edges`), so this is a
    // deliberate third O(n) pass rather than folded into the wiring pass above.
    const assignLevels = (nodes, level) => {
        for (const node of nodes) {
            node.level = level;
            if (node.children.length > 0)
                assignLevels(node.children, level + 1);
        }
    };
    assignLevels(roots, 0);
    return roots;
}
/**
 * Flattens an expanded subset of the tree into the flat `RowNode[]` every
 * downstream consumer (pagination, Master/Detail injection, virtualization)
 * already expects — mirrors `flattenGroupTree` (`group-node.ts`) exactly:
 * push a node, recurse into its children only if it's expanded.
 */
export function flattenTree(roots, expandedIds) {
    const result = [];
    const visit = (nodes) => {
        for (const node of nodes) {
            node.expanded = expandedIds.has(node.nodeId);
            result.push(node);
            if (node.expanded && node.children.length > 0)
                visit(node.children);
        }
    };
    visit(roots);
    return result;
}
//# sourceMappingURL=tree-node.js.map