import type { ColumnDef } from '../types/column.types';
import type { LogicalGroupDef } from './display-group.types';
/**
 * Parses the user-supplied ColumnDef[] hierarchy **once** and builds an
 * immutable registry of logical groups plus a column-path map.
 *
 * This is the "Original Column Tree" in the Display Group Builder architecture.
 * After `parse()` the registry is effectively frozen — the original column
 * tree is never mutated by drag, collapse, or any other operation.
 *
 * @example
 * ```ts
 * const registry = new LogicalGroupRegistry();
 * registry.parse(options.columns);
 * // registry.getPath('name') → ['grp_personal']
 * // registry.getGroup('grp_personal') → LogicalGroupDef
 * ```
 */
export declare class LogicalGroupRegistry {
    /** Logical group ID → immutable group definition. */
    private readonly _groups;
    /**
     * Leaf column ID → ordered list of ancestor logical group IDs (root → parent).
     * Ungrouped (flat) columns are mapped to an empty array.
     */
    private readonly _paths;
    private _hasGroups;
    /**
     * Parse a ColumnDef[] hierarchy and populate the registry.
     * Clears any previous state before re-parsing — safe to call multiple times.
     *
     * @param columns - Top-level column definitions, which may contain nested
     *   `.children` arrays representing column groups.
     */
    parse(columns: ColumnDef[]): void;
    /**
     * `true` when any ColumnDef in the parsed hierarchy contained `.children`.
     * Used to decide whether group header rows should be rendered.
     */
    get hasGroups(): boolean;
    /** Read-only map from logical group ID to its immutable definition. */
    get groups(): ReadonlyMap<string, LogicalGroupDef>;
    /** Read-only map from leaf `colId` to its group path. */
    get paths(): ReadonlyMap<string, ReadonlyArray<string>>;
    /**
     * Returns the group path for a leaf column — an ordered list of ancestor
     * logical group IDs from root to immediate parent.
     * Returns an empty array for ungrouped (flat) columns.
     *
     * @param colId - Leaf column ID.
     */
    getPath(colId: string): ReadonlyArray<string>;
    /**
     * Returns the `LogicalGroupDef` for the given group ID, or `undefined` if
     * the ID is not registered (e.g., a leaf column ID was passed by mistake).
     *
     * @param groupId - Logical group ID (equals the originating ColumnDef.colId).
     */
    getGroup(groupId: string): LogicalGroupDef | undefined;
    /**
     * Returns all leaf column IDs whose group path **includes** the given
     * logical group ID at any depth.
     *
     * Used by the engine to collect all leaves of a group for drag/resize/collapse.
     *
     * @param logicalGroupId - Logical group ID to search for.
     */
    getLeavesForGroup(logicalGroupId: string): ReadonlyArray<string>;
    /**
     * Depth-first walk through the ColumnDef hierarchy.
     *
     * @param cols         - Column definitions at the current depth.
     * @param ancestorPath - Ordered ancestor group IDs from root to current depth.
     */
    private walk;
}
//# sourceMappingURL=logical-group-registry.d.ts.map