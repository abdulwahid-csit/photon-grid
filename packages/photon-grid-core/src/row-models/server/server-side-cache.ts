/**
 * A small, bounded **LRU cache** for Server-Side Row Model responses, keyed by a
 * request signature (sort + filter + search + page + size). Serving a repeat
 * request from cache makes revisiting a page instant and cancels a network
 * round-trip.
 *
 * The implementation mirrors the grid's other bounded caches (e.g. the formula
 * ExpressionCache): a `Map` preserves insertion order, a hit re-inserts the key
 * to mark it most-recently-used, and inserting past capacity evicts the oldest
 * key. All operations are O(1).
 *
 * @packageDocumentation
 */

import type { ServerSideResult } from '../../types/server-side.types';

/** Default maximum number of cached responses. */
export const DEFAULT_SERVER_CACHE_MAX_ENTRIES = 50;

/** LRU cache of {@link ServerSideResult}s keyed by request signature. */
export class ServerSideCache {
  private readonly store = new Map<string, ServerSideResult>();
  private hits = 0;
  private misses = 0;

  constructor(private readonly maxEntries: number = DEFAULT_SERVER_CACHE_MAX_ENTRIES) {}

  /** Returns the cached result for a signature, marking it most-recently-used, or `undefined` on a miss. */
  get(signature: string): ServerSideResult | undefined {
    const hit = this.store.get(signature);
    if (hit === undefined) {
      this.misses++;
      return undefined;
    }
    // Touch: delete + re-insert moves the key to the most-recent end.
    this.store.delete(signature);
    this.store.set(signature, hit);
    this.hits++;
    return hit;
  }

  /** Stores a result, evicting the least-recently-used entry when over capacity. */
  set(signature: string, result: ServerSideResult): void {
    if (this.store.has(signature)) this.store.delete(signature);
    this.store.set(signature, result);
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  /** Empties the cache (used by `refreshServerSide({ purge: true })`). */
  clear(): void {
    this.store.clear();
  }

  /** Hit/miss/size diagnostics. */
  stats(): { hits: number; misses: number; size: number } {
    return { hits: this.hits, misses: this.misses, size: this.store.size };
  }
}
