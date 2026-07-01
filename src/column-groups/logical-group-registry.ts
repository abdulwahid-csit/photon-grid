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
export class LogicalGroupRegistry {
  /** Logical group ID → immutable group definition. */
  private readonly _groups = new Map<string, LogicalGroupDef>();

  /**
   * Leaf column ID → ordered list of ancestor logical group IDs (root → parent).
   * Ungrouped (flat) columns are mapped to an empty array.
   */
  private readonly _paths = new Map<string, ReadonlyArray<string>>();

  private _hasGroups = false;

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Parse a ColumnDef[] hierarchy and populate the registry.
   * Clears any previous state before re-parsing — safe to call multiple times.
   *
   * @param columns - Top-level column definitions, which may contain nested
   *   `.children` arrays representing column groups.
   */
  parse(columns: ColumnDef[]): void {
    this._groups.clear();
    this._paths.clear();
    this._hasGroups = false;
    this.walk(columns, []);
  }

  /**
   * `true` when any ColumnDef in the parsed hierarchy contained `.children`.
   * Used to decide whether group header rows should be rendered.
   */
  get hasGroups(): boolean { return this._hasGroups; }

  /** Read-only map from logical group ID to its immutable definition. */
  get groups(): ReadonlyMap<string, LogicalGroupDef> { return this._groups; }

  /** Read-only map from leaf `colId` to its group path. */
  get paths(): ReadonlyMap<string, ReadonlyArray<string>> { return this._paths; }

  /**
   * Returns the group path for a leaf column — an ordered list of ancestor
   * logical group IDs from root to immediate parent.
   * Returns an empty array for ungrouped (flat) columns.
   *
   * @param colId - Leaf column ID.
   */
  getPath(colId: string): ReadonlyArray<string> {
    return this._paths.get(colId) ?? [];
  }

  /**
   * Returns the `LogicalGroupDef` for the given group ID, or `undefined` if
   * the ID is not registered (e.g., a leaf column ID was passed by mistake).
   *
   * @param groupId - Logical group ID (equals the originating ColumnDef.colId).
   */
  getGroup(groupId: string): LogicalGroupDef | undefined {
    return this._groups.get(groupId);
  }

  /**
   * Returns all leaf column IDs whose group path **includes** the given
   * logical group ID at any depth.
   *
   * Used by the engine to collect all leaves of a group for drag/resize/collapse.
   *
   * @param logicalGroupId - Logical group ID to search for.
   */
  getLeavesForGroup(logicalGroupId: string): ReadonlyArray<string> {
    const result: string[] = [];
    for (const [colId, path] of this._paths) {
      if (path.includes(logicalGroupId)) result.push(colId);
    }
    return result;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Depth-first walk through the ColumnDef hierarchy.
   *
   * @param cols         - Column definitions at the current depth.
   * @param ancestorPath - Ordered ancestor group IDs from root to current depth.
   */
  private walk(cols: ColumnDef[], ancestorPath: string[]): void {
    for (const col of cols) {
      const children = col.children;
      if (Array.isArray(children) && children.length > 0) {
        this._hasGroups = true;

        const parentId =
          ancestorPath.length > 0 ? ancestorPath[ancestorPath.length - 1] : null;

        this._groups.set(col.colId, {
          id:               col.colId,
          header:           col.header ?? '',
          parentId,
          headerCssClass:   col.headerCssClass,
          resizable:        col.resizable,
          collapsedWidth:   col.collapsedWidth ?? 36,
          marryChildren:    col.marryChildren,
          headerRendererFn: col.groupHeaderRendererFn as LogicalGroupDef['headerRendererFn'],
        });

        this.walk(children, [...ancestorPath, col.colId]);
      } else {
        // Leaf column — record its full group path
        this._paths.set(col.colId, [...ancestorPath]);
      }
    }
  }
}
