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
export declare function buildGroupKey(groupFields: string[], data: Record<string, unknown>): string;
export declare function resolveField(data: Record<string, unknown>, path: string): unknown;
export declare function getGroupDisplayValue(value: unknown, field: string): string;
export declare function flattenGroupTree(tree: GroupTree[], expandedGroupKeys: Set<string>): RowNode[];
//# sourceMappingURL=group-node.d.ts.map