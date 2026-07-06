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
export declare class TreeSelectionService {
    private rowSelectionEngine;
    private treeDataService;
    constructor(rowSelectionEngine: RowSelectionEngine, treeDataService: TreeDataService);
    /** Selects `node` and every descendant in its (unfiltered) subtree. */
    selectWithDescendants(node: RowNode, visibleRows: RowNode[]): void;
    /** Deselects `node` and every descendant in its (unfiltered) subtree. */
    deselectWithDescendants(node: RowNode, visibleRows: RowNode[]): void;
    toggleWithDescendants(node: RowNode, visibleRows: RowNode[]): void;
    /**
     * Reports whether every, some, or none of `node`'s descendants are
     * selected — the input a checkbox renderer needs to show a filled,
     * indeterminate (`-`), or empty box for a parent row. Walks the *full*
     * unfiltered subtree (via `TreeDataService.getNode`), not just currently
     * visible/expanded rows, so collapsing a partially-selected group never
     * silently changes its reported state.
     */
    getDescendantSelectionState(node: RowNode): CascadeSelectionState;
    private collectDescendantIds;
}
//# sourceMappingURL=tree-selection-service.d.ts.map