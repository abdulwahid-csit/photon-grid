/**
 * Public type surface for the Photon Grid **Infinite Row Model** — the row model
 * that maps a continuous scroll position onto fixed-size pages, fetching them on
 * demand and caching them under a bound.
 *
 * It reuses the Server-Side Row Model's datasource contract verbatim
 * ({@link ServerSideDatasource} / {@link ServerSideRequest} /
 * {@link ServerSideResult}), so **an application that already wrote a datasource
 * for `rowModel: 'server'` can switch to `'infinite'` without touching it**. The
 * request's `startRow` / `endRow` / `page` / `pageSize` describe the page being
 * fetched; sort, filter and search are carried exactly as before.
 *
 * @packageDocumentation
 */

import type { ServerSideRequest } from './server-side.types';

/** Default rows per page request. */
export const DEFAULT_INFINITE_PAGE_SIZE = 100;
/** Default number of pages fetched ahead of the visible window. */
export const DEFAULT_INFINITE_PRELOAD_PAGES = 1;
/** Default LRU bound on cached pages. */
export const DEFAULT_INFINITE_MAX_CACHED_PAGES = 20;
/** Default cap on simultaneously in-flight page requests. */
export const DEFAULT_INFINITE_MAX_CONCURRENT = 4;
/** Default coalescing window for scroll-driven fetches, in milliseconds. */
export const DEFAULT_INFINITE_DEBOUNCE_MS = 50;
/** Default scrollbar length before the first response reports a real total. */
export const DEFAULT_INFINITE_INITIAL_ROW_COUNT = 100;

/**
 * Why a page was requested — carried on the request event so telemetry can
 * distinguish demand-loading from speculative prefetch.
 */
export type InfiniteRequestReason = 'visible' | 'prefetch' | 'refresh';

/**
 * Configuration for `rowModel: 'infinite'`, supplied as `GridOptions.infinite`.
 *
 * Every field is optional and has a sensible default, so the minimum viable
 * setup is a `rowModel` and a datasource:
 *
 * @example
 * ```ts
 * const options: GridOptions = {
 *   rowModel: 'infinite',
 *   serverSideDatasource: {
 *     async getRows({ request, signal, success, fail }) {
 *       try {
 *         const res = await api.query({
 *           offset: request.startRow,
 *           limit:  request.pageSize,
 *           sort:   request.sortModel,
 *           filter: request.filterModel,
 *           search: request.searchText,
 *         }, { signal });
 *         success({ rows: res.rows, totalRows: res.total });
 *       } catch (e) { fail(e); }
 *     },
 *   },
 *   infinite: { pageSize: 200, preloadPages: 2, maxCachedPages: 30 },
 * };
 * ```
 */
export interface InfiniteScrollConfig {
  /**
   * Rows fetched per request. Larger pages mean fewer round-trips but coarser
   * cache eviction and more work per response.
   * @default 100
   */
  readonly pageSize?: number;

  /**
   * How many pages beyond the visible window to fetch speculatively, in both
   * directions. `0` disables prefetch (pages load only once scrolled into view).
   * @default 1
   */
  readonly preloadPages?: number;

  /**
   * Maximum pages held in the LRU cache. Pages overlapping the visible window
   * are never evicted, so this is effectively a floor of "what is on screen".
   * Set `0` for an unbounded cache.
   * @default 20
   */
  readonly maxCachedPages?: number;

  /**
   * Maximum requests in flight at once. Prevents a fast scroll from opening
   * dozens of connections; excess pages queue and start as slots free.
   * @default 4
   */
  readonly maxConcurrentRequests?: number;

  /**
   * Milliseconds to coalesce scroll-driven fetches. During a fast scroll the
   * window changes every frame; debouncing means only the page the user
   * actually lands near is requested.
   * @default 50
   */
  readonly debounce?: number;

  /**
   * Retry attempts for a failed page before it is reported as an error.
   * @default 2
   */
  readonly maxRetries?: number;

  /** Milliseconds between retry attempts. @default 400 */
  readonly retryDelay?: number;

  /**
   * Row count assumed before the first response reports the real total. Drives
   * the initial scrollbar so the grid has something to scroll while loading.
   * @default 100
   */
  readonly initialRowCount?: number;

  /**
   * Render placeholder cells for rows that are not loaded yet. When `false`,
   * unloaded rows render empty.
   * @default true
   */
  readonly skeletons?: boolean;

  // ── Callbacks ─────────────────────────────────────────────────────────────
  // Mirrors of the five `INFINITE_*` bus events, for applications that prefer
  // options to subscriptions. Both fire; the callback runs first.

  /** A page is about to be requested from the datasource. */
  readonly onDataRequest?: (event: InfiniteDataRequestEvent) => void;
  /** A page's rows arrived and were applied. */
  readonly onDataReceived?: (event: InfiniteDataReceivedEvent) => void;
  /** A page failed after exhausting retries. */
  readonly onError?: (event: InfiniteErrorEvent) => void;
  /** A page was served from cache, with no network round-trip. */
  readonly onCacheHit?: (event: InfiniteCacheEvent) => void;
  /** A page was absent from cache and had to be fetched. */
  readonly onCacheMiss?: (event: InfiniteCacheEvent) => void;
}

/** Payload for `INFINITE_DATA_REQUEST` / {@link InfiniteScrollConfig.onDataRequest}. */
export interface InfiniteDataRequestEvent {
  /** Zero-based page index being fetched. */
  readonly page: number;
  /** First row index the page covers, inclusive. */
  readonly startRow: number;
  /** Row index the page ends at, exclusive. */
  readonly endRow: number;
  /** Whether the page is needed now or fetched speculatively. */
  readonly reason: InfiniteRequestReason;
  /** The full request handed to the datasource. */
  readonly request: ServerSideRequest;
}

/** Payload for `INFINITE_DATA_RECEIVED` / {@link InfiniteScrollConfig.onDataReceived}. */
export interface InfiniteDataReceivedEvent {
  /** Zero-based page index that arrived. */
  readonly page: number;
  /** Number of rows the page contained. */
  readonly rowCount: number;
  /** Total rows reported by the datasource, if any. */
  readonly totalRows?: number;
  /** Milliseconds from request to application. */
  readonly durationMs: number;
}

/** Payload for `INFINITE_ERROR` / {@link InfiniteScrollConfig.onError}. */
export interface InfiniteErrorEvent {
  /** Zero-based page index that failed. */
  readonly page: number;
  /** Whatever the datasource rejected with. */
  readonly error: unknown;
  /** Human-readable summary, safe to surface directly. */
  readonly message: string;
  /** Retry attempts made before giving up. */
  readonly attempts: number;
}

/** Payload for `INFINITE_CACHE_HIT` / `INFINITE_CACHE_MISS`. */
export interface InfiniteCacheEvent {
  /** Zero-based page index that was looked up. */
  readonly page: number;
  /** Pages currently held in the cache. */
  readonly cachedPages: number;
}

/**
 * A snapshot of the engine's runtime state, returned by
 * `GridApi.getInfiniteStats()`.
 *
 * Intended for diagnostics panels and tests: it is the evidence that pages are
 * being cached and de-duplicated rather than refetched.
 */
export interface InfiniteStats {
  /** Total rows reported by the datasource (or the assumed initial count). */
  readonly totalRows: number;
  /** Rows per page. */
  readonly pageSize: number;
  /** Pages currently cached. */
  readonly cachedPages: number;
  /** Pages currently being fetched. */
  readonly inFlight: number;
  /** Pages waiting for a concurrency slot. */
  readonly queued: number;
  /** Cache lookups served without a fetch. */
  readonly cacheHits: number;
  /** Cache lookups that required a fetch. */
  readonly cacheMisses: number;
  /** Pages fetched successfully since the last purge. */
  readonly pagesLoaded: number;
  /** Pages that failed after retries since the last purge. */
  readonly pagesFailed: number;
}

/**
 * Fully-resolved {@link InfiniteScrollConfig} with every default applied —
 * the shape the engine works with internally.
 */
export interface ResolvedInfiniteConfig {
  readonly pageSize: number;
  readonly preloadPages: number;
  readonly maxCachedPages: number;
  readonly maxConcurrentRequests: number;
  readonly debounce: number;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly initialRowCount: number;
  readonly skeletons: boolean;
}

/**
 * Applies defaults to a partial {@link InfiniteScrollConfig}.
 *
 * Values are clamped rather than validated-and-thrown: a grid that renders with
 * a corrected page size is a better failure mode than one that refuses to start
 * because a configuration value arrived as `0` from a settings service.
 *
 * @param config - The application's configuration, if any.
 * @returns Every field resolved and within range.
 */
export function resolveInfiniteConfig(
  config: InfiniteScrollConfig = {},
): ResolvedInfiniteConfig {
  return {
    pageSize: Math.max(1, Math.floor(config.pageSize ?? DEFAULT_INFINITE_PAGE_SIZE)),
    preloadPages: Math.max(0, Math.floor(config.preloadPages ?? DEFAULT_INFINITE_PRELOAD_PAGES)),
    maxCachedPages: Math.max(0, Math.floor(config.maxCachedPages ?? DEFAULT_INFINITE_MAX_CACHED_PAGES)),
    maxConcurrentRequests: Math.max(1, Math.floor(config.maxConcurrentRequests ?? DEFAULT_INFINITE_MAX_CONCURRENT)),
    debounce: Math.max(0, config.debounce ?? DEFAULT_INFINITE_DEBOUNCE_MS),
    maxRetries: Math.max(0, Math.floor(config.maxRetries ?? 2)),
    retryDelay: Math.max(0, config.retryDelay ?? 400),
    initialRowCount: Math.max(0, Math.floor(config.initialRowCount ?? DEFAULT_INFINITE_INITIAL_ROW_COUNT)),
    skeletons: config.skeletons !== false,
  };
}
