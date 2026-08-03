/**
 * Public type surface for the Photon Grid **Server-Side Row Model (SSRM)** — the
 * row model that turns the grid into a pure rendering engine and delegates every
 * data operation (sorting, filtering, searching, pagination, and — in later
 * phases — grouping, tree and pivot) to a backend.
 *
 * These types are free of any DOM or framework dependency so they can be shared
 * across every wrapper (Angular / React / Vue / Vanilla) and unit-tested in
 * isolation. The design mirrors familiar enterprise grids (a `getRows` datasource
 * with a typed request + `success`/`fail` callbacks) while keeping the surface
 * intentionally minimal.
 *
 * @packageDocumentation
 */

import type { FilterModel } from './filter.types';

/**
 * Which row model backs a grid.
 *
 * - `'client'` — the default. All data operations happen in-memory inside the
 *   grid (sort, filter, group, paginate, aggregate, formulas…).
 * - `'server'` — the grid renders only; every data operation is delegated to a
 *   {@link ServerSideDatasource}, one page at a time, driven by the pager.
 * - `'infinite'` — like `'server'`, but driven by *scroll position* rather than
 *   the pager: pages load on demand as they come into view, are prefetched
 *   ahead, and are cached under an LRU bound. Uses the same
 *   {@link ServerSideDatasource}, so switching between the two costs nothing.
 *   See `GridOptions.infinite`.
 */
export type RowModelType = 'client' | 'server' | 'infinite';

/** A single column's sort directive within a {@link ServerSideRequest.sortModel}. */
export interface SortModelItem {
  /** The column id being sorted. */
  readonly colId: string;
  /** Sort direction. */
  readonly sort: 'asc' | 'desc';
}

/**
 * The strongly-typed request handed to {@link ServerSideDatasource.getRows}. It
 * is a complete, serialisable description of the data slice the grid needs, so
 * a backend can translate it directly into a query. New optional fields may be
 * added over time; treat unknown fields defensively. Use {@link context} to
 * carry app-specific parameters without widening the core contract.
 */
export interface ServerSideRequest {
  /** First row index requested, inclusive (0-based). For pagination: `(page-1)*pageSize`. */
  readonly startRow: number;
  /** Row index the request ends at, exclusive. For pagination: `startRow + pageSize`. */
  readonly endRow: number;
  /** 1-based page number (pagination mode). */
  readonly page: number;
  /** Rows per page (pagination mode). */
  readonly pageSize: number;
  /** Active sorts, in priority order (empty when unsorted). */
  readonly sortModel: readonly SortModelItem[];
  /** Active column filter model (empty object when no column filters). */
  readonly filterModel: FilterModel;
  /** Global quick-filter / search text (empty string when none). */
  readonly searchText: string;
  /** Open group keys path (reserved for server grouping; empty in this phase). */
  readonly groupKeys: readonly string[];
  /** Columns to pivot on (reserved for server pivot; empty in this phase). */
  readonly pivotColumns: readonly string[];
  /** Value/aggregation columns (reserved; empty in this phase). */
  readonly valueColumns: readonly string[];
  /** Currently expanded group keys (reserved; empty in this phase). */
  readonly expandedGroups: readonly string[];
  /** Currently selected row ids (for selection-aware queries). */
  readonly selectedRows: readonly string[];
  /** Monotonic id identifying this request; the grid only applies the latest. */
  readonly requestId: number;
  /** Optional app-specific parameters, passed through verbatim. */
  readonly context?: Record<string, unknown>;
}

/**
 * The result a {@link ServerSideDatasource} returns via `params.success`. Only
 * {@link rows} is required; {@link totalRows} drives the pager's "of N" and page
 * count. {@link metadata} is an open extension point for future features.
 */
export interface ServerSideResult<T = Record<string, unknown>> {
  /** The rows for the requested slice. */
  readonly rows: readonly T[];
  /** Total number of rows matching the current query across all pages (drives pagination). */
  readonly totalRows?: number;
  /** Optional explicit success flag; success is implied by calling `params.success`. */
  readonly success?: boolean;
  /** Optional error detail (prefer `params.fail(error)` for failures). */
  readonly error?: unknown;
  /** Open extension bag for future capabilities (e.g. group counts, pivot columns). */
  readonly metadata?: Record<string, unknown>;
}

/**
 * The object passed to {@link ServerSideDatasource.getRows}. The datasource does
 * its work (typically an async fetch honouring {@link signal}) and calls exactly
 * one of {@link success} / {@link fail}.
 */
export interface ServerSideGetRowsParams<T = Record<string, unknown>> {
  /** The fully-described request to fulfil. */
  readonly request: ServerSideRequest;
  /**
   * Aborts when this request is superseded (rapid sort/filter/page/scroll) or
   * the grid is destroyed. Forward it to `fetch(url, { signal })` so stale work
   * is cancelled and never rendered.
   */
  readonly signal: AbortSignal;
  /** Call with the fetched rows (and ideally `totalRows`) on success. */
  success(result: ServerSideResult<T>): void;
  /** Call on failure; triggers the error state and any configured retry. */
  fail(error?: unknown): void;
}

/**
 * The datasource contract an application implements to feed a server-side grid.
 * Kept deliberately tiny — one method — so it is trivial to wire to any backend.
 *
 * @example
 * ```ts
 * const gridOptions: GridOptions = {
 *   rowModel: 'server',
 *   serverSideDatasource: {
 *     async getRows(params) {
 *       const res = await api.getEmployees(params.request, { signal: params.signal });
 *       params.success({ rows: res.rows, totalRows: res.total });
 *     },
 *   },
 * };
 * ```
 */
export interface ServerSideDatasource<T = Record<string, unknown>> {
  /** Fetch one slice of rows described by {@link ServerSideGetRowsParams.request}. */
  getRows(params: ServerSideGetRowsParams<T>): void | Promise<void>;
  /** Optional cleanup invoked when the datasource is replaced or the grid is destroyed. */
  destroy?(): void;
}

/** Options for the optional server-side response cache (LRU by request signature). */
export interface ServerSideCacheConfig {
  /** Maximum number of cached responses before least-recently-used eviction. @default 50 */
  readonly maxEntries?: number;
}

/**
 * Tuning for the Server-Side Row Model (`GridOptions.serverSide`). All fields are
 * optional with sensible defaults; the feature works with an empty object.
 */
export interface ServerSideConfig {
  /**
   * Debounce, in ms, applied before a request is issued — coalesces bursts of
   * state changes (e.g. typing in a filter). `0` still coalesces multiple
   * synchronous `refresh()` calls into one request. @default 0
   */
  readonly debounce?: number;
  /**
   * Response cache. `false`/omitted disables it; `true` enables it with defaults;
   * an object enables it with a custom size. Cache is keyed by the request
   * signature (sort + filter + search + page + size). @default disabled
   */
  readonly cache?: boolean | ServerSideCacheConfig;
  /** How many times to retry a failed request before surfacing the error. @default 0 */
  readonly maxRetries?: number;
  /** Delay, in ms, between retries. @default 400 */
  readonly retryDelay?: number;
  /**
   * Rows per block for infinite/virtual mode. Reserved for a later phase; ignored
   * in pagination mode. @default the page size
   */
  readonly blockSize?: number;
}
