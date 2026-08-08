/**
 * The **Infinite Row Model** — the strategy that maps a continuous scroll
 * position onto fixed-size pages, fetching them on demand and rendering
 * not-yet-loaded rows as skeletons.
 *
 * Where the Server-Side Row Model refetches the whole viewport on every state
 * change and keeps one request in flight, this model keeps a *window* of pages
 * resident, fetches several concurrently, and never re-requests a page it
 * already holds. The scrollbar spans the full dataset from the first response,
 * so any row is reachable immediately.
 *
 * Responsibilities are split into focused collaborators, mirroring the SSRM
 * layout:
 *  - {@link ServerRequestBuilder} — snapshots grid state into a typed request.
 *  - {@link InfinitePageCache} — generation-scoped LRU with viewport pinning.
 *  - {@link InfiniteRequestQueue} — dedup, concurrency, per-page abort, retry.
 *  - {@link computePageWindow} — pure row-range → page-range geometry.
 *
 * This orchestrator owns only sequencing, the sparse row array and lifecycle
 * events; it never sorts, filters or paginates locally.
 *
 * ### Memory
 * Row nodes exist only for cached pages and the rendered window; every other
 * index in the row array is a hole. Memory therefore scales with
 * `maxCachedPages × pageSize`, not with the dataset — ten million rows cost the
 * same as ten thousand. This is safe because the renderer, told that the model
 * has a uniform row height, derives its window arithmetically and never
 * iterates the array.
 *
 * @packageDocumentation
 */

import type { GridContext } from '../../core/grid-context';
import { GridEventType } from '../../types/event.types';
import type { RowNode } from '../../types/row.types';
import type {
  InfiniteScrollConfig,
  InfiniteStats,
  ResolvedInfiniteConfig,
  InfiniteRequestReason,
} from '../../types/infinite.types';
import { resolveInfiniteConfig } from '../../types/infinite.types';
import type { ServerSideDatasource, ServerSideRequest } from '../../types/server-side.types';
import type { RowModelStrategy } from '../row-model-strategy';
import { ServerRequestBuilder } from '../server/server-request-builder';
import { InfinitePageCache } from './infinite-page-cache';
import { InfiniteRequestQueue } from './infinite-request-queue';
import { computePageWindow, pageOfRow, pageStartRow, pagesInRange } from './infinite-window';

/** Loads pages on demand as the user scrolls, caching them under an LRU bound. */
export class InfiniteRowModel implements RowModelStrategy {
  readonly type = 'infinite' as const;
  /**
   * Every row is the configured height, so the renderer may compute the total
   * content height arithmetically instead of summing the array — which is both
   * faster and what makes the sparse array safe to publish.
   */
  readonly uniformRowHeight = true;

  private readonly cfg: ResolvedInfiniteConfig;
  private readonly builder: ServerRequestBuilder;
  private readonly cache: InfinitePageCache;
  private readonly queue: InfiniteRequestQueue;

  private datasource: ServerSideDatasource | null;

  /**
   * The published row array. Sparse by design: only indices inside a cached
   * page or the rendered window hold a node.
   */
  private rows: RowNode[] = [];
  /** Rows the dataset reports, or the configured assumption before we know. */
  private totalRows: number;
  /** `true` once a response has told us the real total. */
  private totalKnown = false;

  /** Last row range the renderer asked for, so refreshes can re-target it. */
  private renderStart = 0;
  private renderEnd = 0;

  private requestSeq = 0;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private firstLoadPending = true;

  private pagesLoaded = 0;
  private pagesFailed = 0;

  constructor(
    private readonly ctx: GridContext,
    config: InfiniteScrollConfig = {},
    datasource?: ServerSideDatasource,
  ) {
    this.cfg = resolveInfiniteConfig(config);
    this.builder = new ServerRequestBuilder(ctx);
    this.cache = new InfinitePageCache(this.cfg.maxCachedPages);
    this.queue = new InfiniteRequestQueue(
      this.cfg.maxConcurrentRequests,
      this.cfg.maxRetries,
      this.cfg.retryDelay,
    );
    this.datasource = datasource ?? ctx.options.serverSideDatasource ?? null;
    this.totalRows = this.cfg.initialRowCount;
  }

  // ── RowModelStrategy ───────────────────────────────────────────────────────

  /**
   * Invoked by `applyPipeline()` on every refresh.
   *
   * A sort, filter or search change rewrites which rows live at which index, so
   * the cached pages describe a dataset that no longer exists: the signature
   * check drops them, cancels in-flight work and re-fetches from the top.
   */
  buildDisplayedRows(): void {
    if (this.destroyed) return;

    const request = this.builder.build(++this.requestSeq);
    const signature = querySignature(request);

    if (this.cache.setSignature(signature)) {
      // New query: everything in flight describes the old one.
      this.queue.abortAll();
      this.rows = [];
      this.totalKnown = false;
      this.totalRows = this.cfg.initialRowCount;
      this.firstLoadPending = true;
      this.publishRows(true);
    }

    this.scheduleSync();
  }

  /** Initial kick-off after grid initialisation. */
  start(): void {
    this.publishRows(true);
    this.scheduleSync();
  }

  /**
   * The renderer's report of which rows it is about to paint.
   *
   * This, rather than a scroll listener, is what drives loading: the renderer
   * already owns virtualisation, so taking its row range keeps one copy of that
   * maths in the codebase and guarantees the model serves exactly what is being
   * painted.
   *
   * The window is filled **synchronously** — from cache where possible, with
   * skeletons otherwise — because the renderer slices the row array immediately
   * after this returns and a sparse array must have no holes inside that slice.
   * Fetching what is still missing is debounced separately.
   *
   * @param startRow - First row index to be painted, inclusive.
   * @param endRow   - Row index painting stops at, exclusive.
   */
  onRenderWindow(startRow: number, endRow: number): void {
    if (this.destroyed) return;

    const rangeChanged = startRow !== this.renderStart || endRow !== this.renderEnd;
    this.renderStart = startRow;
    this.renderEnd = endRow;

    this.ensureWindow(startRow, endRow);
    if (rangeChanged) this.scheduleSync();
  }

  /**
   * Guarantees every index in a range holds a node.
   *
   * Cached rows are materialised; anything still missing becomes a skeleton.
   * O(window), and it allocates only for indices that are actually empty, so a
   * stationary viewport does no work at all after the first pass.
   */
  private ensureWindow(startRow: number, endRow: number): void {
    const end = Math.min(endRow, this.totalRows);
    for (let index = Math.max(0, startRow); index < end; index++) {
      if (this.rows[index]) continue;

      const page = pageOfRow(index, this.cfg.pageSize);
      const rows = this.cache.has(page) ? this.cache.get(page) : undefined;
      const offset = index - pageStartRow(page, this.cfg.pageSize);
      const data = rows?.[offset];

      this.rows[index] = data
        ? this.createNode(index, data)
        : this.createSkeleton(index);
    }
  }

  /** Aborts in-flight work, cancels timers and releases the datasource. */
  destroy(): void {
    this.destroyed = true;
    if (this.syncTimer !== null) { clearTimeout(this.syncTimer); this.syncTimer = null; }
    this.queue.destroy();
    this.datasource?.destroy?.();
    this.cache.clear();
    this.rows = [];
  }

  // ── Public API (surfaced via GridApi) ──────────────────────────────────────

  /** Replaces the datasource and reloads from the current position. */
  setDatasource(datasource: ServerSideDatasource | null): void {
    this.datasource = datasource;
    this.refresh({ purge: true });
  }

  /**
   * Reloads the resident pages. `purge` also empties the cache, so previously
   * loaded pages are fetched fresh rather than served from memory.
   */
  refresh(params: { purge?: boolean } = {}): void {
    if (this.destroyed) return;
    this.queue.abortAll();
    if (params.purge ?? false) {
      this.cache.clear();
      this.rows = [];
      this.publishRows(true);
    }
    this.scheduleSync();
  }

  /**
   * Drops a range of cached pages so they reload on next sight.
   *
   * @param from - First page index, inclusive. Omit for the whole cache.
   * @param to   - Last page index, inclusive. Omit to run to the end.
   */
  invalidatePages(from?: number, to?: number): void {
    this.cache.invalidate(from, to);
    this.scheduleSync();
  }

  /** A snapshot of cache and request state, for diagnostics. */
  getStats(): InfiniteStats {
    const cacheStats = this.cache.stats();
    return {
      totalRows: this.totalRows,
      pageSize: this.cfg.pageSize,
      cachedPages: cacheStats.size,
      inFlight: this.queue.inFlightCount,
      queued: this.queue.queuedCount,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      pagesLoaded: this.pagesLoaded,
      pagesFailed: this.pagesFailed,
    };
  }

  // ── Sync loop ──────────────────────────────────────────────────────────────

  /**
   * Coalesces bursts of window changes into one pass.
   *
   * During a fast scroll the render window changes every frame; without this a
   * flick through a million rows would request every page it passed over. Only
   * the range the user actually settles near survives the debounce.
   */
  private scheduleSync(): void {
    if (this.destroyed || this.syncTimer !== null) return;
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      this.sync();
    }, this.cfg.debounce);
  }

  /** Materialises what is cached and requests what is missing. */
  private sync(): void {
    if (this.destroyed) return;

    if (!this.datasource) {
      this.totalRows = 0;
      this.publishRows(true);
      this.setLoading(false);
      return;
    }

    const window = computePageWindow({
      startRow: this.renderStart,
      endRow: this.renderEnd,
      totalRows: this.totalRows,
      pageSize: this.cfg.pageSize,
      preloadPages: this.cfg.preloadPages,
    });

    // Pages on screen must never be evicted: doing so would blank rows the user
    // is reading and immediately refetch them.
    this.cache.setPinned(pagesInRange(window.firstVisiblePage, window.lastVisiblePage));

    const resident = pagesInRange(window.firstPage, window.lastPage);
    let materialised = false;

    for (const page of resident) {
      if (this.cache.has(page)) {
        this.ctx.eventBus.emit(GridEventType.INFINITE_CACHE_HIT, {
          page, cachedPages: this.cache.size,
        });
        this.ctx.options.infinite?.onCacheHit?.({ page, cachedPages: this.cache.size });
        materialised = this.materialisePage(page) || materialised;
        continue;
      }

      if (this.queue.isInFlight(page)) continue;

      this.ctx.eventBus.emit(GridEventType.INFINITE_CACHE_MISS, {
        page, cachedPages: this.cache.size,
      });
      this.ctx.options.infinite?.onCacheMiss?.({ page, cachedPages: this.cache.size });

      const visible = page >= window.firstVisiblePage && page <= window.lastVisiblePage;
      if (visible) materialised = this.fillSkeletons(page) || materialised;
      void this.loadPage(page, visible ? 'visible' : 'prefetch');
    }

    if (materialised) this.ctx.renderer.scheduleRender();
  }

  /** Issues one page request and applies its result. */
  private async loadPage(page: number, reason: InfiniteRequestReason): Promise<void> {
    const datasource = this.datasource;
    if (!datasource) return;

    const generation = this.cache.generation;
    const startRow = pageStartRow(page, this.cfg.pageSize);
    const request = this.buildPageRequest(page, startRow);

    this.ctx.eventBus.emit(GridEventType.INFINITE_DATA_REQUEST, {
      page, startRow, endRow: startRow + this.cfg.pageSize, reason, request,
    });
    this.ctx.options.infinite?.onDataRequest?.({
      page, startRow, endRow: startRow + this.cfg.pageSize, reason, request,
    });

    if (this.firstLoadPending) this.setLoading(true);
    const startedAt = Date.now();

    const outcome = await this.queue.fetch(
      { page, request, generation },
      datasource,
      (gen) => !this.destroyed && gen === this.cache.generation,
    );

    if (this.destroyed || outcome.discarded) return;

    if (outcome.error !== undefined || outcome.result === null) {
      this.pagesFailed++;
      this.finishFirstLoad();
      const message = toMessage(outcome.error);
      this.ctx.eventBus.emit(GridEventType.INFINITE_ERROR, {
        page, error: outcome.error, message, attempts: outcome.attempts,
      });
      this.ctx.options.infinite?.onError?.({
        page, error: outcome.error, message, attempts: outcome.attempts,
      });
      return;
    }

    const rows = (outcome.result.rows ?? []) as Record<string, unknown>[];
    this.cache.set(page, rows, generation);
    this.pagesLoaded++;

    const lengthChanged = this.adoptTotalRows(outcome.result.totalRows, page, rows.length);
    this.materialisePage(page);
    this.finishFirstLoad();

    this.ctx.eventBus.emit(GridEventType.INFINITE_DATA_RECEIVED, {
      page, rowCount: rows.length, totalRows: outcome.result.totalRows,
      durationMs: Date.now() - startedAt,
    });
    this.ctx.options.infinite?.onDataReceived?.({
      page, rowCount: rows.length, totalRows: outcome.result.totalRows,
      durationMs: Date.now() - startedAt,
    });

    this.publishRows(lengthChanged);
    // A changed total can widen the resident window; re-run to fill it.
    if (lengthChanged) this.scheduleSync();
  }

  // ── Row array ──────────────────────────────────────────────────────────────

  /**
   * Reconciles the dataset size with what the response reported.
   *
   * A datasource that omits `totalRows` still terminates the list correctly: a
   * short page means the end has been reached, so the total is pinned to that
   * page's last row.
   *
   * @returns `true` when the row array's length changed.
   */
  private adoptTotalRows(reported: number | undefined, page: number, rowCount: number): boolean {
    let next = this.totalRows;

    if (typeof reported === 'number' && reported >= 0) {
      next = reported;
      this.totalKnown = true;
    } else if (rowCount < this.cfg.pageSize) {
      // Short page → this is the last one.
      next = pageStartRow(page, this.cfg.pageSize) + rowCount;
      this.totalKnown = true;
    } else if (!this.totalKnown) {
      // Full page and no total: assume at least one more page exists so the
      // scrollbar keeps room to reach it.
      next = Math.max(next, pageStartRow(page + 1, this.cfg.pageSize) + 1);
    }

    if (next === this.totalRows) return false;
    this.totalRows = next;
    return true;
  }

  /**
   * Writes a cached page's rows into the row array.
   *
   * Nodes are only created where one is missing or its data changed, so a
   * re-materialised page reuses its existing nodes and the renderer's row cache
   * (and any selection on those rows) survives.
   *
   * @returns `true` when anything changed.
   */
  private materialisePage(page: number): boolean {
    const rows = this.cache.get(page);
    if (!rows) return false;

    const start = pageStartRow(page, this.cfg.pageSize);
    let changed = false;

    for (let i = 0; i < rows.length; i++) {
      const index = start + i;
      if (index >= this.totalRows) break;
      const existing = this.rows[index];
      if (existing && existing.type === 'data' && existing.data === rows[i]) continue;
      this.rows[index] = this.createNode(index, rows[i]);
      changed = true;
    }

    return changed;
  }

  /**
   * Puts placeholder nodes in a page's slots so unloaded rows render as
   * skeletons rather than as holes the renderer would trip over.
   *
   * @returns `true` when anything changed.
   */
  private fillSkeletons(page: number): boolean {
    const start = pageStartRow(page, this.cfg.pageSize);
    const end = Math.min(start + this.cfg.pageSize, this.totalRows);
    let changed = false;

    for (let index = start; index < end; index++) {
      if (this.rows[index]) continue;
      this.rows[index] = this.createSkeleton(index);
      changed = true;
    }

    return changed;
  }

  /**
   * Publishes the row array to the store.
   *
   * The array is mutated in place while its length is stable, because the
   * renderer keys total-height and scrollbar recomputation off the array
   * *reference* — reusing it means a page arriving repaints the window without
   * touching layout, which is what keeps the scroll position rock-steady. Only
   * a length change hands over a fresh reference.
   *
   * @param lengthChanged - Whether the dataset size changed.
   */
  private publishRows(lengthChanged: boolean): void {
    if (lengthChanged) {
      const next: RowNode[] = new Array<RowNode>(this.totalRows);
      // Carry over nodes that are still in range; the rest stay holes.
      const carry = Math.min(this.rows.length, this.totalRows);
      for (let i = 0; i < carry; i++) {
        const node = this.rows[i];
        if (node) next[i] = node;
      }
      this.rows = next;
      this.ctx.store.set('visibleRows', this.rows);
      this.ctx.store.set('allRows', this.rows);
      this.ctx.store.set('totalRowCount', this.totalRows);
      this.ctx.paginationEngine.setTotalRows(this.totalRows);
    }
    this.ctx.renderer.scheduleRender();
  }

  /** Builds a data node for a loaded row. */
  private createNode(index: number, data: Record<string, unknown>): RowNode {
    const rowHeight = this.ctx.options.rowHeight ?? 48;
    return {
      nodeId: this.nodeIdFor(index, data),
      rowIndex: index,
      data,
      type: 'data',
      selected: (this.ctx.store.get('selectedRowIds') as Set<string>).has(this.nodeIdFor(index, data)),
      expanded: false,
      editable: false,
      level: 0,
      parent: null,
      children: [],
      height: rowHeight,
      top: index * rowHeight,
    };
  }

  /** Builds a placeholder node for a row that has not loaded yet. */
  private createSkeleton(index: number): RowNode {
    const rowHeight = this.ctx.options.rowHeight ?? 48;
    return {
      nodeId: `__pg_skeleton_${index}`,
      rowIndex: index,
      data: {},
      type: this.cfg.skeletons ? 'loading' : 'data',
      selected: false,
      expanded: false,
      editable: false,
      level: 0,
      parent: null,
      children: [],
      height: rowHeight,
      top: index * rowHeight,
    };
  }

  /**
   * Stable identity for a row.
   *
   * Prefers the application's own id field so a row keeps its identity across
   * refetches — selection, and the renderer's DOM reuse, both key off it. Falls
   * back to the absolute row index, which is stable for as long as the query is.
   */
  private nodeIdFor(index: number, data: Record<string, unknown>): string {
    const id = data['__photon_id__'];
    if (typeof id === 'string' && id.length > 0) return id;
    if (typeof id === 'number') return String(id);
    return `__pg_row_${index}`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Builds the request for one page, overriding the pager-derived row range. */
  private buildPageRequest(page: number, startRow: number): ServerSideRequest {
    const base = this.builder.build(++this.requestSeq);
    return {
      ...base,
      startRow,
      endRow: startRow + this.cfg.pageSize,
      page: page + 1, // the request's `page` is 1-based, matching SSRM
      pageSize: this.cfg.pageSize,
    };
  }

  /** Clears the initial loading overlay once the first page settles. */
  private finishFirstLoad(): void {
    if (!this.firstLoadPending) return;
    this.firstLoadPending = false;
    this.setLoading(false);
  }

  /**
   * Writes the shared loading flag. `GridCore` watches this store key and is
   * the single emitter of `LOADING_STARTED` / `LOADING_STOPPED`, so this must
   * not emit them itself — doing so would double-fire for every page load.
   */
  private setLoading(loading: boolean): void {
    this.ctx.store.set('loading', loading);
  }
}

/**
 * Deterministic key for the *query* a request describes.
 *
 * Excludes everything positional (page, row range, request id) so every page of
 * one query shares a signature — the cache generation must change when the
 * dataset changes, not when the user scrolls.
 */
function querySignature(request: ServerSideRequest): string {
  return JSON.stringify({
    sortModel: request.sortModel,
    filterModel: request.filterModel,
    searchText: request.searchText,
    groupKeys: request.groupKeys,
  });
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Failed to load rows.';
}
