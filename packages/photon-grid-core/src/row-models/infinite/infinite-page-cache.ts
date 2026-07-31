/**
 * Bounded **page cache** for the Infinite Row Model.
 *
 * Keyed by page index rather than by request signature (the Server-Side Row
 * Model's scheme), because infinite scrolling looks pages up by position on
 * every scroll frame and must answer in O(1) without rebuilding a key.
 *
 * Two behaviours distinguish it from the SSRM cache
 * ({@link import('../server/server-side-cache').ServerSideCache}):
 *
 * - **Generation scoping.** Sort, filter and search change *which rows live at
 *   which index*, so a cached page 3 from the previous query is not page 3 of
 *   the new one. Rather than prefixing every key, the cache carries a
 *   generation counter that {@link setSignature} bumps; the whole map is
 *   dropped in one step and stale in-flight responses can be rejected by
 *   comparing generations.
 *
 * - **Pinning.** Eviction must never discard a page that is on screen. If it
 *   did, those rows would revert to skeletons and be refetched immediately —
 *   a loop that gets worse the smaller the cache. {@link setPinned} marks the
 *   pages overlapping the viewport, and eviction skips them.
 *
 * @packageDocumentation
 */

/** One cached page: the rows the datasource returned for a page index. */
export interface CachedPage {
  /** Rows in page order. May be shorter than `pageSize` for the final page. */
  readonly rows: readonly Record<string, unknown>[];
  /** Generation the page was fetched under; stale pages are never served. */
  readonly generation: number;
}

/** LRU cache of fetched pages, scoped to a query generation. */
export class InfinitePageCache {
  /** Insertion order is LRU order: the first key is the least recently used. */
  private readonly pages = new Map<number, CachedPage>();
  /** Page indices currently on screen, which eviction must preserve. */
  private pinned = new Set<number>();
  private signature = '';
  private generationCounter = 0;

  private hits = 0;
  private misses = 0;

  /**
   * @param maxPages - LRU bound. `0` means unbounded.
   */
  constructor(private readonly maxPages: number) {}

  /** The current query generation. Stamped onto responses to detect staleness. */
  get generation(): number {
    return this.generationCounter;
  }

  /** Pages currently held. */
  get size(): number {
    return this.pages.size;
  }

  /**
   * Points the cache at a query signature, clearing it when the query changed.
   *
   * @param signature - Deterministic key for the active sort/filter/search.
   * @returns `true` when the signature changed and the cache was dropped.
   */
  setSignature(signature: string): boolean {
    if (signature === this.signature) return false;
    this.signature = signature;
    this.generationCounter++;
    this.pages.clear();
    return true;
  }

  /**
   * Records which pages overlap the viewport so eviction can spare them.
   *
   * @param pages - Page indices currently rendered.
   */
  setPinned(pages: Iterable<number>): void {
    this.pinned = new Set(pages);
  }

  /**
   * Reads a page, marking it most-recently-used.
   *
   * @param page - Zero-based page index.
   * @returns The page's rows, or `undefined` on a miss.
   */
  get(page: number): readonly Record<string, unknown>[] | undefined {
    const hit = this.pages.get(page);
    if (hit === undefined || hit.generation !== this.generationCounter) {
      this.misses++;
      return undefined;
    }
    // Touch: delete + re-insert moves the key to the most-recent end.
    this.pages.delete(page);
    this.pages.set(page, hit);
    this.hits++;
    return hit.rows;
  }

  /** `true` when the page is cached under the current generation, without counting a hit or miss. */
  has(page: number): boolean {
    const entry = this.pages.get(page);
    return entry !== undefined && entry.generation === this.generationCounter;
  }

  /**
   * Stores a page, evicting least-recently-used entries past the bound.
   *
   * A page stamped with a superseded generation is discarded rather than
   * stored: it belongs to a query the user has already moved on from.
   *
   * @param page       - Zero-based page index.
   * @param rows       - Rows returned for it.
   * @param generation - Generation the request was issued under.
   * @returns `true` when the page was stored.
   */
  set(page: number, rows: readonly Record<string, unknown>[], generation: number): boolean {
    if (generation !== this.generationCounter) return false;

    if (this.pages.has(page)) this.pages.delete(page);
    this.pages.set(page, { rows, generation });
    this.evict();
    return true;
  }

  /**
   * Drops a range of pages, forcing them to be refetched.
   *
   * @param from - First page index, inclusive. Omit to start at 0.
   * @param to   - Last page index, inclusive. Omit to run to the end.
   */
  invalidate(from?: number, to?: number): void {
    if (from === undefined && to === undefined) {
      this.pages.clear();
      return;
    }
    const start = from ?? 0;
    const end = to ?? Number.MAX_SAFE_INTEGER;
    for (const page of [...this.pages.keys()]) {
      if (page >= start && page <= end) this.pages.delete(page);
    }
  }

  /** Empties the cache and resets hit/miss counters. */
  clear(): void {
    this.pages.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /** Hit/miss/size diagnostics. */
  stats(): { hits: number; misses: number; size: number } {
    return { hits: this.hits, misses: this.misses, size: this.pages.size };
  }

  /**
   * Trims the cache to its bound, oldest first, skipping pinned pages.
   *
   * When every remaining candidate is pinned the cache is allowed to exceed its
   * bound: honouring the limit would mean evicting rows the user is looking at,
   * and a viewport larger than the configured cache is a misconfiguration to
   * absorb, not a reason to thrash.
   */
  private evict(): void {
    if (this.maxPages <= 0) return;

    for (const page of this.pages.keys()) {
      if (this.pages.size <= this.maxPages) return;
      if (this.pinned.has(page)) continue;
      this.pages.delete(page);
    }
  }
}
