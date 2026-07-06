import type { ColumnDef } from '../types/column.types';
import type { ColumnStyleManager } from '../renderer/column-style-manager';
import type { LogicalGroupRegistry } from './logical-group-registry';
import type {
  DisplayGroupNode,
  DisplayLeafNode,
  DisplayNode,
  RenderedGroupCell,
  RenderedFillerCell,
  RenderedHeaderCell,
  RenderedHeaderRow,
  DisplayHeaderTree,
} from './display-group.types';


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
export class DisplayGroupBuilder {
  /**
   * Build the display header tree for a single panel's visible column list.
   *
   * @param columns       - Visible columns in display order (left to right).
   * @param registry      - Logical group registry supplying paths and definitions.
   * @param collapseState - Per-logical-group collapse flags (from the engine).
   * @param colStyles     - Column width resolver.
   * @returns A fully-computed `DisplayHeaderTree` ready for DOM building.
   */
  build(
    columns:       ColumnDef[],
    registry:      LogicalGroupRegistry,
    collapseState: ReadonlyMap<string, boolean>,
    colStyles:     ColumnStyleManager,
  ): DisplayHeaderTree {
    const roots:     DisplayNode[]      = [];
    const openStack: DisplayGroupNode[] = [];
    let   cursor = 0;

    /**
     * Close groups until the stack depth reaches `targetDepth`.
     * Each closed group is attached to its parent or to `roots`, with its
     * final width computed as `cursor - node.left`.
     */
    const closeDown = (targetDepth: number): void => {
      while (openStack.length > targetDepth) {
        const closing = openStack.pop()!;
        // Finalise width: everything between its left edge and the cursor
        (closing as { width: number }).width = cursor - closing.left;
        const parent = openStack.length > 0 ? openStack[openStack.length - 1] : null;
        if (parent) {
          (parent.children as DisplayNode[]).push(closing);
        } else {
          roots.push(closing);
        }
      }
    };

    for (const col of columns) {
      if (col.visible === false) continue;

      const path     = registry.getPath(col.colId);
      const colWidth = colStyles.getWidth(col.colId);

      // Longest common prefix between the current open stack and this column's path
      const common = this.commonPrefixLen(openStack, path);
      closeDown(common);

      // Open new group nodes for depths from `common` to `path.length - 1`.
      // The stable instanceId uses the FIRST column that opens each group instance
      // so that collapse/resize state persists across header rebuilds.
      // Format: "${logicalGroupId}:${firstLeafColId}"
      for (let d = common; d < path.length; d++) {
        const groupId    = path[d];
        const def        = registry.getGroup(groupId);
        // col.colId is always the first leaf of a newly-opened instance because
        // we walk columns left-to-right and a group is only opened once per run.
        const instanceId = `${groupId}:${col.colId}`;
        const node: DisplayGroupNode = {
          kind:            'group',
          instanceId,
          logicalGroupId:  groupId,
          header:          def?.header ?? groupId,
          depth:           d,
          children:        [],
          left:            cursor,
          width:           0,          // finalised on close
          collapsed:       collapseState.get(instanceId) ?? false,
          resizable:       def?.resizable !== false,
          collapsedWidth:  def?.collapsedWidth ?? 36,
          headerCssClass:  def?.headerCssClass,
          headerRendererFn: def?.headerRendererFn,
        };
        openStack.push(node);
      }

      // Create and attach the leaf node
      const leaf: DisplayLeafNode = {
        kind:      'leaf',
        colDef:    col,
        groupPath: path,
        left:      cursor,
        width:     colWidth,
      };

      const parent = openStack.length > 0 ? openStack[openStack.length - 1] : null;
      if (parent) {
        (parent.children as DisplayNode[]).push(leaf);
      } else {
        roots.push(leaf);
      }

      cursor += colWidth;
    }

    // Close any groups still open after the last column
    closeDown(0);

    const maxGroupDepth = this.computeMaxGroupDepth(roots);
    const groupRows = maxGroupDepth > 0 ? this.buildGroupRows(roots, maxGroupDepth) : [];

    return { roots, maxGroupDepth, groupRows, totalWidth: cursor };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Find the longest common prefix length between the current open stack's
   * logical group IDs and the incoming column's group path.
   *
   * @param stack - Currently open group nodes.
   * @param path  - Group path for the incoming column.
   */
  private commonPrefixLen(
    stack: DisplayGroupNode[],
    path:  ReadonlyArray<string>,
  ): number {
    const len = Math.min(stack.length, path.length);
    for (let i = 0; i < len; i++) {
      if (stack[i].logicalGroupId !== path[i]) return i;
    }
    return len;
  }

  /**
   * Recursively compute the maximum group nesting depth across all nodes.
   * Returns `0` when there are no group nodes (all columns are flat).
   *
   * @param nodes - Display nodes to inspect.
   */
  private computeMaxGroupDepth(nodes: ReadonlyArray<DisplayNode>): number {
    let max = 0;
    for (const n of nodes) {
      if (n.kind === 'group') {
        const childMax = this.computeMaxGroupDepth(n.children);
        // This group occupies depth n.depth, contributing 1 group row
        max = Math.max(max, n.depth + 1, childMax);
      }
    }
    return max;
  }

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
  private buildGroupRows(
    roots:         ReadonlyArray<DisplayNode>,
    maxGroupDepth: number,
  ): RenderedHeaderRow[] {
    const rows: RenderedHeaderCell[][] = Array.from({ length: maxGroupDepth }, () => []);
    this.fillRows(roots, rows, 0);
    return rows.map((cells, depth) => ({
      depth,
      cells: cells.slice().sort((a, b) => a.left - b.left),
    }));
  }

  /**
   * Recursively fill the rows array from display tree nodes.
   *
   * @param nodes      - Nodes at the current recursion level.
   * @param rows       - Output rows array, mutated in place.
   * @param startDepth - The group-row depth these nodes contribute to.
   *   Root nodes → `startDepth = 0`.
   *   Children of a depth-0 group → `startDepth = 1`, etc.
   */
  private fillRows(
    nodes:      ReadonlyArray<DisplayNode>,
    rows:       RenderedHeaderCell[][],
    startDepth: number,
  ): void {
    for (const node of nodes) {
      if (node.kind === 'leaf') {
        // Leaf at `startDepth` has no ancestor group from `startDepth` onward.
        // Add filler cells from startDepth to the last group row so the column
        // visually spans the full multi-row header height.
        for (let d = startDepth; d < rows.length; d++) {
          const filler: RenderedFillerCell = {
            kind:  'filler',
            id:    `_filler_${node.colDef.colId}_d${d}`,
            colId: node.colDef.colId,
            left:  node.left,
            width: node.width,
            depth: d,
          };
          rows[d].push(filler);
        }
        continue;
      }

      // Group node — add a cell at its designated depth row
      if (node.depth < rows.length) {
        const cell: RenderedGroupCell = {
          kind:  'group',
          node,
          left:  node.left,
          width: node.width,
          depth: node.depth,
        };
        rows[node.depth].push(cell);
      }

      // Recurse into children; they live at depth node.depth + 1
      this.fillRows(node.children, rows, node.depth + 1);
    }
  }
}
