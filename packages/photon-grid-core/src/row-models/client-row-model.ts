/**
 * The **client-side row model** — the default strategy that performs every data
 * operation in-memory. Its {@link buildDisplayedRows} is the exact pipeline that
 * previously lived inline in `GridApi.applyPipeline()`: tree / filter / sort /
 * group / paginate / master-detail inject → layout → publish `visibleRows`.
 *
 * Keeping it behind the {@link RowModelStrategy} interface means the grid's
 * refresh path is identical for client and server modes — only the strategy
 * differs.
 *
 * @packageDocumentation
 */

import type { GridContext } from '../core/grid-context';
import type { RowModelStrategy } from './row-model-strategy';

/** In-memory row model (the historical, default behaviour). */
export class ClientRowModel implements RowModelStrategy {
  readonly type = 'client' as const;

  /**
   * Every row lives in memory and the published array is dense, so the grid can
   * commit a row reorder itself. This is what makes managed row dragging the
   * default here. See {@link RowModelStrategy.rowOrderIsClientOwned}.
   */
  readonly rowOrderIsClientOwned = true;

  constructor(private readonly ctx: GridContext) {}

  /**
   * Recompute displayed rows in-memory and publish them to the `visibleRows`
   * store key. Ordering is significant (see inline notes) and mirrors the
   * historical pipeline exactly.
   */
  buildDisplayedRows(): void {
    const ctx = this.ctx;
    let rows = ctx.store.get('allRows');
    const columns = ctx.columnModel.getAllColumns();

    if (ctx.treeDataService.isEnabled()) {
      // Tree Data and column-value grouping are mutually exclusive — a grid is
      // either hierarchical or grouped by value, never both — so this branch
      // fully replaces the filter/sort/group steps below with their tree-aware
      // equivalents (which internally still call FilterEngine's and SortEngine's
      // own logic; see TreeDataService).
      rows = ctx.treeDataService.getFlatVisibleRows(rows, columns);
    } else {
      rows = ctx.filterEngine.applyFilters(rows, columns);
      rows = ctx.sortEngine.applySorting(rows, columns);

      const groupColIds = ctx.store.get('groupedColumnIds');
      if (groupColIds.length > 0) {
        rows = ctx.groupingEngine.groupByColumns(groupColIds, columns, rows);
      }
    }

    rows = ctx.paginationEngine.applyPagination(rows);
    rows = ctx.masterDetailEngine.injectDetailRows(rows);
    ctx.rowModel.setVisibleRows(rows);
    // Subtree extents depend on `top`/`height`, which `setVisibleRows` just
    // assigned — must run after layout, not from inside `getFlatVisibleRows`.
    if (ctx.treeDataService.isEnabled()) {
      ctx.treeDataService.annotateSubtreeExtents(rows);
    }
    ctx.store.set('visibleRows', rows);
  }

  /** No resources to release for the client strategy. */
  destroy(): void {
    /* no-op */
  }
}
