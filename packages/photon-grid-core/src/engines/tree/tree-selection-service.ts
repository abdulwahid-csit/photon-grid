import type { RowNode } from '../../types/row.types';
import type { RowSelectionEngine } from '../selection/row-selection-engine';
import type { TreeDataService } from './tree-data-service';

/** Tri-state result for a node whose selection depends on its descendants. */
export type CascadeSelectionState = 'all' | 'some' | 'none';

/**
 * Adds tree-specific cascade selection semantics — selecting a node selects
 * every descendant, and a node with only some descendants selected reports
 * as `'some'` (the checkbox-indeterminate state) — on top of the grid's
 * existing row selection. It never re-implements selection storage: every
 * mutation goes through `RowSelectionEngine`'s own `selectRows`/`deselectRow`,
 * so `selectedRowIds`, the `ROW_SELECTED`/`ROW_DESELECTED` events, and
 * `RowNode.selected` all stay the single source of truth they already are.
 */
export class TreeSelectionService {
  constructor(
    private rowSelectionEngine: RowSelectionEngine,
    private treeDataService: TreeDataService,
  ) {}

  /** Selects `node` and every descendant in its (unfiltered) subtree. */
  selectWithDescendants(node: RowNode, visibleRows: RowNode[]): void {
    const ids = [node.nodeId, ...this.collectDescendantIds(node)];
    this.rowSelectionEngine.selectRows(ids, visibleRows);
  }

  /** Deselects `node` and every descendant in its (unfiltered) subtree. */
  deselectWithDescendants(node: RowNode, visibleRows: RowNode[]): void {
    this.rowSelectionEngine.deselectRow(node.nodeId, visibleRows);
    for (const id of this.collectDescendantIds(node)) {
      this.rowSelectionEngine.deselectRow(id, visibleRows);
    }
  }

  toggleWithDescendants(node: RowNode, visibleRows: RowNode[]): void {
    if (this.rowSelectionEngine.isRowSelected(node.nodeId)) {
      this.deselectWithDescendants(node, visibleRows);
    } else {
      this.selectWithDescendants(node, visibleRows);
    }
  }

  /**
   * Reports whether every, some, or none of `node`'s descendants are
   * selected — the input a checkbox renderer needs to show a filled,
   * indeterminate (`-`), or empty box for a parent row. Walks the *full*
   * unfiltered subtree (via `TreeDataService.getNode`), not just currently
   * visible/expanded rows, so collapsing a partially-selected group never
   * silently changes its reported state.
   */
  getDescendantSelectionState(node: RowNode): CascadeSelectionState {
    const descendantIds = this.collectDescendantIds(node);
    if (descendantIds.length === 0) return this.rowSelectionEngine.isRowSelected(node.nodeId) ? 'all' : 'none';

    let selectedCount = 0;
    for (const id of descendantIds) {
      if (this.rowSelectionEngine.isRowSelected(id)) selectedCount++;
    }
    if (selectedCount === 0) return 'none';
    return selectedCount === descendantIds.length ? 'all' : 'some';
  }

  private collectDescendantIds(node: RowNode): string[] {
    // Prefer the live tree (has every descendant, including currently
    // collapsed/lazy-unloaded ones already fetched) over `node.children`,
    // which may be a filtered copy if called mid-filter.
    const liveNode = this.treeDataService.getNode(node.nodeId) ?? node;
    const ids: string[] = [];
    const collect = (n: RowNode): void => {
      for (const child of n.children) {
        ids.push(child.nodeId);
        collect(child);
      }
    };
    collect(liveNode);
    return ids;
  }
}
