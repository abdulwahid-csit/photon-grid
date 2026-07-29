/**
 * Builds a {@link ServerSideRequest} from the grid's current state and derives a
 * stable cache signature for it. Pure and side-effect free — it only *reads*
 * from the context's engines and store, so it is trivially unit-testable.
 *
 * @packageDocumentation
 */

import type { GridContext } from '../../core/grid-context';
import type { QuickFilterConfig } from '../../types/filter.types';
import type { ServerSideRequest, SortModelItem } from '../../types/server-side.types';

/** Composes a {@link ServerSideRequest} from live grid state. */
export class ServerRequestBuilder {
  constructor(private readonly ctx: GridContext) {}

  /**
   * Reads the active sort/filter/search/pagination/selection state and produces
   * an immutable request stamped with {@link requestId}.
   */
  build(requestId: number): ServerSideRequest {
    const ctx = this.ctx;

    const sortModel: SortModelItem[] = ctx.sortEngine
      .getSortConfig()
      .map((s) => ({ colId: s.colId, sort: s.order }));

    const filterModel = ctx.filterEngine.getFilterModel();

    const quick = ctx.store.get('quickFilterConfig') as QuickFilterConfig | null;
    const searchText = quick?.term ?? '';

    const page = ctx.paginationEngine.getCurrentPage();
    const pageSize = ctx.paginationEngine.getPageSize();
    const startRow = Math.max(0, (page - 1) * pageSize);
    const endRow = startRow + pageSize;

    return {
      startRow,
      endRow,
      page,
      pageSize,
      sortModel,
      filterModel,
      searchText,
      groupKeys: [],
      pivotColumns: [],
      valueColumns: [],
      expandedGroups: Array.from(ctx.store.get('expandedGroupKeys') as Set<string>),
      selectedRows: Array.from(ctx.store.get('selectedRowIds') as Set<string>),
      requestId,
    };
  }
}

/**
 * A deterministic cache key for a request. Excludes {@link ServerSideRequest.requestId}
 * (and selection/expansion, which don't change the page's rows) so two logically
 * identical fetches share a cache entry.
 */
export function serverRequestSignature(request: ServerSideRequest): string {
  return JSON.stringify({
    sortModel: request.sortModel,
    filterModel: request.filterModel,
    searchText: request.searchText,
    groupKeys: request.groupKeys,
    page: request.page,
    pageSize: request.pageSize,
  });
}
