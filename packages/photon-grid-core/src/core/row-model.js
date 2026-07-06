import { detailNodeId } from '../types/row.types';
import { GridEventType } from '../types/event.types';
let nodeIdCounter = 0;
function generateNodeId() {
    return `rn_${++nodeIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
}
export class RowModel {
    constructor(store, eventBus) {
        this.store = store;
        this.eventBus = eventBus;
        this.rawData = [];
        this.idField = '__photon_id__';
        this.defaultRowHeight = 50;
    }
    setRowData(data, rowHeight = 50) {
        this.rawData = data;
        this.defaultRowHeight = rowHeight;
        const nodes = this.buildRowNodes(data);
        this.layoutNodes(nodes);
        this.store.set('allRows', nodes);
        this.store.set('totalRowCount', nodes.length);
        this.eventBus.emit(GridEventType.DATA_CHANGED, {
            oldCount: this.store.get('totalRowCount'),
            newCount: nodes.length,
        });
    }
    appendRowData(data) {
        const existingNodes = this.store.get('allRows');
        const newNodes = this.buildRowNodes(data, existingNodes.length);
        const offset = existingNodes.length > 0
            ? (existingNodes[existingNodes.length - 1].top + existingNodes[existingNodes.length - 1].height)
            : 0;
        this.layoutNodes(newNodes, offset);
        const combined = [...existingNodes, ...newNodes];
        this.rawData = [...this.rawData, ...data];
        this.store.set('allRows', combined);
        this.store.set('totalRowCount', combined.length);
    }
    updateRow(nodeId, newData) {
        const rows = this.store.get('allRows');
        const node = rows.find((r) => r.nodeId === nodeId);
        if (!node)
            return;
        node.data = { ...node.data, ...newData };
        this.store.set('allRows', [...rows]);
    }
    removeRows(nodeIds) {
        const idSet = new Set(nodeIds);
        const remaining = this.store.get('allRows').filter((r) => !idSet.has(r.nodeId));
        this.layoutNodes(remaining);
        this.store.set('allRows', remaining);
        this.store.set('totalRowCount', remaining.length);
    }
    getRowNode(nodeId) {
        return this.store.get('allRows').find((r) => r.nodeId === nodeId);
    }
    getRowByIndex(index) {
        return this.store.get('allRows')[index];
    }
    setVisibleRows(nodes) {
        this.layoutNodes(nodes);
        this.store.set('visibleRows', nodes);
    }
    setRenderedRows(nodes) {
        this.store.set('renderedRows', nodes);
    }
    setRowHeight(nodeId, height) {
        const rows = this.store.get('visibleRows');
        const nodeIndex = rows.findIndex((r) => r.nodeId === nodeId);
        if (nodeIndex === -1)
            return;
        rows[nodeIndex].height = height;
        for (let i = nodeIndex + 1; i < rows.length; i++) {
            rows[i].top = rows[i - 1].top + rows[i - 1].height;
        }
        this.store.set('visibleRows', [...rows]);
    }
    buildGroupHeaderNode(groupKey, groupField, groupValue, children, level) {
        return {
            nodeId: generateNodeId(),
            rowIndex: -1,
            data: { [groupField]: groupValue },
            type: 'group',
            selected: false,
            expanded: this.store.get('expandedGroupKeys').has(groupKey),
            editable: false,
            level,
            parent: null,
            children,
            groupKey,
            groupField,
            groupValue,
            childCount: children.length,
            height: this.defaultRowHeight,
            top: 0,
        };
    }
    /**
     * Builds a `type: 'detail'` `RowNode` rendered directly beneath `parentRow`.
     * Used by `MasterDetailEngine.injectDetailRows` — `height` should come from
     * the engine's per-parent height cache (auto-measured or manually resized)
     * so repeated pipeline runs don't reset an already-known detail height.
     */
    createDetailNode(parentRow, detail, height = 200) {
        return {
            nodeId: detailNodeId(parentRow.nodeId),
            rowIndex: -1,
            data: detail,
            type: 'detail',
            selected: false,
            expanded: false,
            editable: false,
            level: parentRow.level + 1,
            parent: parentRow,
            children: [],
            height,
            top: 0,
            detail,
            parentNodeId: parentRow.nodeId,
        };
    }
    getRawData() {
        return this.rawData;
    }
    buildRowNodes(data, startIndex = 0) {
        return data.map((row, i) => ({
            nodeId: row[this.idField] ?? generateNodeId(),
            rowIndex: startIndex + i,
            data: { ...row },
            type: 'data',
            selected: this.store.get('selectedRowIds').has(row[this.idField] ?? ''),
            expanded: false,
            editable: false,
            level: 0,
            parent: null,
            children: [],
            height: this.defaultRowHeight,
            top: 0,
        }));
    }
    layoutNodes(nodes, startOffset = 0) {
        let top = startOffset;
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].rowIndex = i;
            nodes[i].top = top;
            top += nodes[i].height;
        }
    }
}
//# sourceMappingURL=row-model.js.map