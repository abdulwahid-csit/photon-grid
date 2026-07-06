/**
 * Deterministic `nodeId` for a master row's detail node — shared by
 * `RowModel.createDetailNode` (construction) and `DetailRowRenderer`
 * (lookup) so the two never drift out of sync.
 */
export function detailNodeId(parentNodeId) {
    return `detail_${parentNodeId}`;
}
//# sourceMappingURL=row.types.js.map