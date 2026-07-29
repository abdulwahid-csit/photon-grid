/**
 * The **Server-Side Row Model** — the strategy that makes the grid a pure
 * rendering engine and delegates every data operation to a
 * {@link ServerSideDatasource}. In this phase it implements **page-at-a-time**
 * pagination: each state change (sort / filter / search / page) triggers a
 * debounced, abortable, race-safe, optionally-cached fetch of exactly one page,
 * whose rows are published straight into `visibleRows`.
 *
 * Responsibilities are split into focused collaborators:
 *  - {@link ServerRequestBuilder} — snapshots grid state into a typed request.
 *  - {@link ServerRequestController} — abort / latest-wins / retry.
 *  - {@link ServerSideCache} — optional LRU of responses.
 *
 * This orchestrator owns only sequencing, loading/overlay state, and lifecycle
 * events; it never sorts/filters/paginates locally.
 *
 * @packageDocumentation
 */

import type { GridContext } from '../../core/grid-context';
import { GridEventType } from '../../types/event.types';
import type {
  ServerSideConfig,
  ServerSideDatasource,
  ServerSideRequest,
  ServerSideResult,
} from '../../types/server-side.types';
import type { RowModelStrategy } from '../row-model-strategy';
import { ServerRequestBuilder, serverRequestSignature } from './server-request-builder';
import { ServerRequestController } from './server-request-controller';
import { ServerSideCache, DEFAULT_SERVER_CACHE_MAX_ENTRIES } from './server-side-cache';

/** Delegates all data operations to a {@link ServerSideDatasource} (pagination mode). */
export class ServerRowModel implements RowModelStrategy {
  readonly type = 'server' as const;

  private readonly builder: ServerRequestBuilder;
  private readonly controller: ServerRequestController;
  private readonly cache: ServerSideCache | null;

  private datasource: ServerSideDatasource | null;
  private readonly debounceMs: number;
  private fetchTimer: ReturnType<typeof setTimeout> | null = null;
  private requestSeq = 0;
  private destroyed = false;

  constructor(
    private readonly ctx: GridContext,
    config: Partial<ServerSideConfig> = {},
    datasource?: ServerSideDatasource,
  ) {
    this.builder = new ServerRequestBuilder(ctx);
    this.controller = new ServerRequestController(config.maxRetries ?? 0, config.retryDelay ?? 400);
    this.cache = this.createCache(config.cache);
    this.datasource = datasource ?? ctx.options.serverSideDatasource ?? null;
    this.debounceMs = Math.max(0, config.debounce ?? 0);
  }

  // ── RowModelStrategy ────────────────────────────────────────────────────────

  /** Debounced entry point invoked on every `refresh()` — coalesces bursts into one fetch. */
  buildDisplayedRows(): void {
    this.scheduleFetch();
  }

  /** Initial kick-off after grid initialisation. */
  start(): void {
    this.scheduleFetch();
  }

  /** Aborts in-flight work, cancels timers, and releases the datasource. */
  destroy(): void {
    this.destroyed = true;
    if (this.fetchTimer !== null) {
      clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }
    this.controller.destroy();
    this.datasource?.destroy?.();
    this.cache?.clear();
  }

  // ── Public API (surfaced via GridApi) ────────────────────────────────────────

  /** Replaces the datasource and immediately refetches the current view. */
  setDatasource(datasource: ServerSideDatasource | null): void {
    this.datasource = datasource;
    this.scheduleFetch();
  }

  /**
   * Forces a refetch of the current view. When `purge` is `true` the response
   * cache is cleared first so fresh data is fetched even for a cached signature.
   */
  refresh(params: { purge?: boolean } = {}): void {
    const purge = params.purge ?? false;
    if (purge) this.cache?.clear();
    this.ctx.eventBus.emit(GridEventType.SERVER_REFRESH, { purge });
    this.scheduleFetch();
  }

  // ── Fetch lifecycle ──────────────────────────────────────────────────────────

  private scheduleFetch(): void {
    if (this.destroyed) return;
    if (this.fetchTimer !== null) clearTimeout(this.fetchTimer);
    this.fetchTimer = setTimeout(() => {
      this.fetchTimer = null;
      void this.fetch();
    }, this.debounceMs);
  }

  private async fetch(): Promise<void> {
    if (this.destroyed) return;

    if (!this.datasource) {
      // No datasource yet → present an empty grid (no-rows overlay).
      this.publishEmpty();
      return;
    }

    const request = this.builder.build(++this.requestSeq);

    // Cache hit → apply synchronously, no network round-trip.
    const signature = serverRequestSignature(request);
    const cached = this.cache?.get(signature);
    if (cached) {
      this.ctx.eventBus.emit(GridEventType.SERVER_REQUEST, { request, fromCache: true });
      this.applyResult(request, cached, true);
      return;
    }

    this.ctx.eventBus.emit(GridEventType.SERVER_REQUEST, { request, fromCache: false });
    this.setLoading(true);

    try {
      const result = await this.controller.execute(request, this.datasource, {
        onRetry: (attempt, error) =>
          this.ctx.eventBus.emit(GridEventType.SERVER_RETRY, { request, attempt, error }),
      });
      // `null` = superseded/aborted: a newer request owns the view + loading state.
      if (result === null || this.destroyed) return;

      this.cache?.set(signature, result);
      this.setLoading(false);
      this.applyResult(request, result, false);
    } catch (error) {
      if (this.destroyed) return;
      this.setLoading(false);
      this.ctx.eventBus.emit(GridEventType.SERVER_ERROR, {
        request,
        error,
        message: this.toMessage(error),
      });
    }
  }

  // ── Result application ───────────────────────────────────────────────────────

  private applyResult(request: ServerSideRequest, result: ServerSideResult, fromCache: boolean): void {
    const ctx = this.ctx;
    const rows = (result.rows ?? []) as Record<string, unknown>[];
    const total = result.totalRows ?? rows.length;

    // Build nodes for this page WITHOUT the setRowData side effects
    // (DATA_CHANGED / formula / undo), then lay them out + publish.
    const nodes = ctx.rowModel.buildNodes(rows, ctx.options.rowHeight);
    ctx.rowModel.setVisibleRows(nodes);
    ctx.store.set('allRows', nodes);
    ctx.store.set('totalRowCount', total);
    ctx.paginationEngine.setTotalRows(total);
    ctx.renderer.scheduleRender();

    ctx.eventBus.emit(GridEventType.SERVER_SUCCESS, {
      request,
      rowCount: nodes.length,
      totalRows: result.totalRows,
      fromCache,
    });
  }

  private publishEmpty(): void {
    const ctx = this.ctx;
    const nodes = ctx.rowModel.buildNodes([], ctx.options.rowHeight);
    ctx.rowModel.setVisibleRows(nodes);
    ctx.store.set('allRows', nodes);
    ctx.store.set('totalRowCount', 0);
    ctx.paginationEngine.setTotalRows(0);
    this.setLoading(false);
    ctx.renderer.scheduleRender();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private setLoading(loading: boolean): void {
    this.ctx.store.set('loading', loading);
    this.ctx.eventBus.emit(
      loading ? GridEventType.LOADING_STARTED : GridEventType.LOADING_STOPPED,
      {},
    );
  }

  private createCache(cache: ServerSideConfig['cache']): ServerSideCache | null {
    if (!cache) return null;
    const maxEntries =
      typeof cache === 'object' ? cache.maxEntries ?? DEFAULT_SERVER_CACHE_MAX_ENTRIES : undefined;
    return new ServerSideCache(maxEntries);
  }

  private toMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Failed to load data from the server.';
  }
}
