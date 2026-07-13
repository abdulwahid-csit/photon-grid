import type { RowNode, RowNodeType } from '../types/row.types';
import { detailNodeId } from '../types/row.types';
import type { RowTransaction, RowTransactionResult } from '../types/grid.types';
import type { GridStore } from './grid-store';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';

let nodeIdCounter = 0;

function generateNodeId(): string {
  return `rn_${++nodeIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

export class RowModel {
  private rawData: Record<string, unknown>[] = [];
  private idField = '__photon_id__';
  private defaultRowHeight = 50;

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
  ) {}

  setRowData(data: Record<string, unknown>[], rowHeight = 50): void {
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

  appendRowData(data: Record<string, unknown>[]): void {
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

  updateRow(nodeId: string, newData: Partial<Record<string, unknown>>): void {
    const rows = this.store.get('allRows');
    const node = rows.find((r) => r.nodeId === nodeId);
    if (!node) return;
    node.data = { ...node.data, ...newData };
    this.store.set('allRows', [...rows]);
  }

  removeRows(nodeIds: string[]): void {
    const idSet = new Set(nodeIds);
    const remaining = this.store.get('allRows').filter((r) => !idSet.has(r.nodeId));
    this.layoutNodes(remaining);
    this.store.set('allRows', remaining);
    this.store.set('totalRowCount', remaining.length);
  }

  getRowNode(nodeId: string): RowNode | undefined {
    return this.store.get('allRows').find((r) => r.nodeId === nodeId);
  }

  getRowByIndex(index: number): RowNode | undefined {
    return this.store.get('allRows')[index];
  }

  setVisibleRows(nodes: RowNode[]): void {
    this.layoutNodes(nodes);
    this.store.set('visibleRows', nodes);
  }

  setRenderedRows(nodes: RowNode[]): void {
    this.store.set('renderedRows', nodes);
  }

  setRowHeight(nodeId: string, height: number): void {
    const rows = this.store.get('visibleRows');
    const nodeIndex = rows.findIndex((r) => r.nodeId === nodeId);
    if (nodeIndex === -1) return;
    rows[nodeIndex].height = height;
    for (let i = nodeIndex + 1; i < rows.length; i++) {
      rows[i].top = rows[i - 1].top + rows[i - 1].height;
    }
    this.store.set('visibleRows', [...rows]);
  }

  buildGroupHeaderNode(
    groupKey: string,
    groupField: string,
    groupValue: unknown,
    children: RowNode[],
    level: number,
  ): RowNode {
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
  createDetailNode(parentRow: RowNode, detail: Record<string, unknown>, height = 200): RowNode {
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

  getRawData(): Record<string, unknown>[] {
    return this.rawData;
  }

  /**
   * Applies an add / update / remove {@link RowTransaction} against `allRows`
   * in a single pass, re-lays-out the surviving rows, and returns the exact
   * nodes affected. Unlike {@link setRowData}, undo history is preserved — a
   * transaction is a surgical delta, not a full data swap.
   *
   * Semantics:
   * - **remove** first (by `nodeId`), so an updated-then-removed row nets out.
   * - **update** merges each object's fields into the matching node's `data`
   *   (matched by `nodeId`, i.e. the row's id field). Objects with no matching
   *   node are ignored.
   * - **add** appends freshly built nodes; their `selected` flag is seeded from
   *   the current selection set, exactly like {@link setRowData}.
   *
   * The caller is responsible for invoking the render pipeline afterward — the
   * model only mutates the data store, never the DOM.
   *
   * @param txn - The batch of mutations to apply.
   * @returns The `{ add, update, remove }` nodes that were actually affected.
   */
  applyTransaction(txn: RowTransaction): RowTransactionResult {
    const rows = this.store.get('allRows');
    const byId = new Map(rows.map((r) => [r.nodeId, r]));

    const removed: RowNode[] = [];
    if (txn.remove?.length) {
      for (const id of txn.remove) {
        const node = byId.get(id);
        if (node) {
          removed.push(node);
          byId.delete(id);
        }
      }
    }

    const updated: RowNode[] = [];
    if (txn.update?.length) {
      for (const item of txn.update) {
        const id = item[this.idField] as string | undefined;
        const node = id !== undefined ? byId.get(id) : undefined;
        if (node) {
          node.data = { ...node.data, ...item };
          updated.push(node);
        }
      }
    }

    // Rebuild the row list: survivors in original order, then appended adds.
    let next = removed.length > 0 ? rows.filter((r) => byId.has(r.nodeId)) : rows.slice();

    const added: RowNode[] = [];
    if (txn.add?.length) {
      const addedNodes = this.buildRowNodes(txn.add);
      added.push(...addedNodes);
      next = next.concat(addedNodes);
    }

    this.layoutNodes(next);
    this.rawData = next.map((n) => n.data);
    this.store.set('allRows', next);
    this.store.set('totalRowCount', next.length);

    return { add: added, update: updated, remove: removed };
  }

  private buildRowNodes(
    data: Record<string, unknown>[],
    startIndex = 0,
  ): RowNode[] {
    return data.map((row, i) => ({
      nodeId: (row[this.idField] as string) ?? generateNodeId(),
      rowIndex: startIndex + i,
      data: { ...row },
      type: 'data' as RowNodeType,
      selected: this.store.get('selectedRowIds').has(row[this.idField] as string ?? ''),
      expanded: false,
      editable: false,
      level: 0,
      parent: null,
      children: [],
      height: this.defaultRowHeight,
      top: 0,
    }));
  }

  private layoutNodes(nodes: RowNode[], startOffset = 0): void {
    let top = startOffset;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].rowIndex = i;
      nodes[i].top = top;
      top += nodes[i].height;
    }
  }
}
