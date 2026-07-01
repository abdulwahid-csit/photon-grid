export type RowNodeType = 'data' | 'group' | 'group-footer' | 'summary' | 'detail' | 'loading';

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
