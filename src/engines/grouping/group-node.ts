import type { RowNode } from '../../types/row.types';

export interface GroupTree {
  key: string;
  field: string;
  value: unknown;
  level: number;
  children: GroupTree[];
  rows: RowNode[];
  expanded: boolean;
  /**
   * Populated by {@link AggregationEngine} after the tree is built.
   * Keyed by `colDef.field`; only present when at least one column has an
   * `aggFunc` configured.
   */
  aggregatedValues?: Record<string, unknown>;
}

export function buildGroupKey(
  groupFields: string[],
  data: Record<string, unknown>,
): string {
  return groupFields
    .map((field) => {
      const val = resolveField(data, field);
      return `${field}::${String(val ?? '_Blank')}`;
    })
    .join('||');
}

export function resolveField(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function getGroupDisplayValue(value: unknown, field: string): string {
  if (value === null || value === undefined || value === '') return '_Blank';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return String(obj.label ?? obj.name ?? obj.value ?? obj.id ?? JSON.stringify(value));
  }
  if (field === 'is_deleted' || field === 'deleted') {
    return value ? 'Archived' : 'Active';
  }
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function flattenGroupTree(
  tree: GroupTree[],
  expandedGroupKeys: Set<string>,
): RowNode[] {
  const result: RowNode[] = [];
  for (const group of tree) {
    const isExpanded = expandedGroupKeys.has(group.key);
    const groupNode: RowNode = {
      nodeId: `group_${group.key}`,
      rowIndex: -1,
      data: { [group.field]: group.value },
      type: 'group',
      selected: false,
      expanded: isExpanded,
      editable: false,
      level: group.level,
      parent: null,
      children: [],
      groupKey: group.key,
      groupField: group.field,
      groupValue: group.value,
      childCount: countLeafRows(group),
      aggregatedValues: group.aggregatedValues,
      height: 50,
      top: 0,
    };
    result.push(groupNode);

    if (isExpanded) {
      if (group.children.length > 0) {
        result.push(...flattenGroupTree(group.children, expandedGroupKeys));
      } else {
        result.push(...group.rows);
      }

      // Footer row: mirrors the group header's aggregate values below the last
      // leaf.  Only emitted when at least one column has aggFunc configured so
      // the row has meaningful content to display.
      if (group.aggregatedValues) {
        result.push({
          nodeId: `group_footer_${group.key}`,
          rowIndex: -1,
          data: { [group.field]: group.value },
          type: 'group-footer',
          selected: false,
          expanded: false,
          editable: false,
          level: group.level,
          parent: null,
          children: [],
          groupKey: group.key,
          groupField: group.field,
          groupValue: group.value,
          childCount: countLeafRows(group),
          aggregatedValues: group.aggregatedValues,
          height: 50,
          top: 0,
        });
      }
    }
  }
  return result;
}

function countLeafRows(group: GroupTree): number {
  if (group.children.length === 0) return group.rows.length;
  return group.children.reduce((sum, child) => sum + countLeafRows(child), 0);
}
