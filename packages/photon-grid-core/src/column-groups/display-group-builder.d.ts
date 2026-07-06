import type { ColumnDef } from '../types/column.types';
import type { ColumnStyleManager } from '../renderer/column-style-manager';
import type { LogicalGroupRegistry } from './logical-group-registry';
import type { DisplayHeaderTree } from './display-group.types';
/**
 * Stateless builder that produces a {@link DisplayHeaderTree} from the current
 * displayed column order.
 *
 * The same builder instance can be reused — call `build()` whenever the
 * displayed column order, column widths, or collapse state changes.
 * Because the builder is stateless, `build()` always returns a fresh tree
 * without any shared mutable state.
 *
 * ### Algorithm — O(n) per column
 *
 * Walk through visible columns **left to right**, maintaining an `openStack`
 * of currently-open `DisplayGroupNode` instances:
 *
 * 1. Get the column's group path from the registry.
 * 2. Find the **longest common prefix** between the open stack IDs and the path.
 * 3. **Close** every group above the common-prefix depth — attach each closed
 *    node to its parent (or to `roots`), finalising its width.
 * 4. **Open** new group instances from `commonLen` to `path.length - 1`.
 * 5. Attach a `DisplayLeafNode` to the deepest open group (or `roots`).
 * 6. Advance `cursor` by the column's pixel width.
 *
 * After the last column, close any remaining open groups.
 *
 * Then: compute `maxGroupDepth`, flatten the tree into `RenderedHeaderRow[]`
 * (one per depth), and return the completed `DisplayHeaderTree`.
 *
 * ### Split groups
 *
 * When the same logical group's columns are interleaved with another group's
 * columns in the displayed order, the algorithm naturally creates **multiple
 * display instances** of that logical group — one per consecutive run.
 * Each instance has a unique `instanceId` and an independently computed width.
 */
export declare class DisplayGroupBuilder {
    /**
     * Build the display header tree for a single panel's visible column list.
     *
     * @param columns       - Visible columns in display order (left to right).
     * @param registry      - Logical group registry supplying paths and definitions.
     * @param collapseState - Per-logical-group collapse flags (from the engine).
     * @param colStyles     - Column width resolver.
     * @returns A fully-computed `DisplayHeaderTree` ready for DOM building.
     */
    build(columns: ColumnDef[], registry: LogicalGroupRegistry, collapseState: ReadonlyMap<string, boolean>, colStyles: ColumnStyleManager): DisplayHeaderTree;
    /**
     * Find the longest common prefix length between the current open stack's
     * logical group IDs and the incoming column's group path.
     *
     * @param stack - Currently open group nodes.
     * @param path  - Group path for the incoming column.
     */
    private commonPrefixLen;
    /**
     * Recursively compute the maximum group nesting depth across all nodes.
     * Returns `0` when there are no group nodes (all columns are flat).
     *
     * @param nodes - Display nodes to inspect.
     */
    private computeMaxGroupDepth;
    /**
     * Flatten the display tree into one {@link RenderedHeaderRow} per group
     * depth level (rows `0..maxGroupDepth-1`).
     *
     * - Group nodes produce `RenderedGroupCell` entries in their depth row.
     * - Leaf nodes at any level produce `RenderedFillerCell` entries for every
     *   group-row depth where they have no ancestor group.  This makes flat and
     *   shallow columns appear to span the full header height.
     *
     * Cells within each row are sorted by `left` position before returning.
     *
     * @param roots         - Root-level display nodes.
     * @param maxGroupDepth - Total number of group header rows to produce.
     */
    private buildGroupRows;
    /**
     * Recursively fill the rows array from display tree nodes.
     *
     * @param nodes      - Nodes at the current recursion level.
     * @param rows       - Output rows array, mutated in place.
     * @param startDepth - The group-row depth these nodes contribute to.
     *   Root nodes → `startDepth = 0`.
     *   Children of a depth-0 group → `startDepth = 1`, etc.
     */
    private fillRows;
}
//# sourceMappingURL=display-group-builder.d.ts.map