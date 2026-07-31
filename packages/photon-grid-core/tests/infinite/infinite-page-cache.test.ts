import { describe, it, expect } from 'vitest';

import { InfinitePageCache } from '../../src/row-models/infinite/infinite-page-cache';

/**
 * Contract for the Infinite Row Model's page cache.
 *
 * Three behaviours carry real risk and are pinned here: LRU order (so the cache
 * keeps what is being used), generation scoping (so a sort or filter cannot
 * leave rows from the previous query at an index they no longer occupy), and
 * pin protection (so eviction cannot blank the rows on screen and trigger an
 * immediate refetch — a loop that gets worse the smaller the cache).
 */

/** Distinct row payloads, so identity checks are meaningful. */
const rowsFor = (page: number) => [{ page }];

describe('InfinitePageCache', () => {
  it('stores and returns a page', () => {
    const cache = new InfinitePageCache(10);
    cache.set(1, rowsFor(1), cache.generation);

    expect(cache.has(1)).toBe(true);
    expect(cache.get(1)).toEqual([{ page: 1 }]);
  });

  it('reports a miss for an absent page', () => {
    const cache = new InfinitePageCache(10);
    expect(cache.get(4)).toBeUndefined();
    expect(cache.has(4)).toBe(false);
  });

  it('does not count a hit or miss for has()', () => {
    const cache = new InfinitePageCache(10);
    cache.set(1, rowsFor(1), cache.generation);

    cache.has(1);
    cache.has(2);

    expect(cache.stats()).toMatchObject({ hits: 0, misses: 0 });
  });

  it('counts hits and misses on get()', () => {
    const cache = new InfinitePageCache(10);
    cache.set(1, rowsFor(1), cache.generation);

    cache.get(1);
    cache.get(1);
    cache.get(9);

    expect(cache.stats()).toMatchObject({ hits: 2, misses: 1 });
  });

  describe('eviction', () => {
    it('evicts the least recently used page past the bound', () => {
      const cache = new InfinitePageCache(2);
      cache.set(0, rowsFor(0), cache.generation);
      cache.set(1, rowsFor(1), cache.generation);
      cache.set(2, rowsFor(2), cache.generation);

      expect(cache.has(0)).toBe(false);
      expect(cache.has(1)).toBe(true);
      expect(cache.has(2)).toBe(true);
      expect(cache.size).toBe(2);
    });

    it('treats a read as a use, sparing the page from eviction', () => {
      const cache = new InfinitePageCache(2);
      cache.set(0, rowsFor(0), cache.generation);
      cache.set(1, rowsFor(1), cache.generation);

      cache.get(0);                                  // 0 is now most recent
      cache.set(2, rowsFor(2), cache.generation);    // evicts 1, not 0

      expect(cache.has(0)).toBe(true);
      expect(cache.has(1)).toBe(false);
    });

    it('never evicts a pinned page', () => {
      const cache = new InfinitePageCache(2);
      cache.setPinned([0]);
      cache.set(0, rowsFor(0), cache.generation);
      cache.set(1, rowsFor(1), cache.generation);
      cache.set(2, rowsFor(2), cache.generation);

      // Page 0 is on screen: evicting it would blank visible rows and refetch.
      expect(cache.has(0)).toBe(true);
      expect(cache.has(1)).toBe(false);
      expect(cache.has(2)).toBe(true);
    });

    it('exceeds its bound rather than evicting the viewport', () => {
      const cache = new InfinitePageCache(1);
      cache.setPinned([0, 1, 2]);
      cache.set(0, rowsFor(0), cache.generation);
      cache.set(1, rowsFor(1), cache.generation);
      cache.set(2, rowsFor(2), cache.generation);

      // A viewport larger than the configured cache is a misconfiguration to
      // absorb, not a reason to thrash.
      expect(cache.size).toBe(3);
    });

    it('does not evict at all when unbounded', () => {
      const cache = new InfinitePageCache(0);
      for (let page = 0; page < 50; page++) cache.set(page, rowsFor(page), cache.generation);
      expect(cache.size).toBe(50);
    });
  });

  describe('generation scoping', () => {
    it('clears everything when the query signature changes', () => {
      const cache = new InfinitePageCache(10);
      cache.set(0, rowsFor(0), cache.generation);
      cache.setSignature('sort=name');

      expect(cache.size).toBe(0);
      expect(cache.has(0)).toBe(false);
    });

    it('reports whether the signature actually changed', () => {
      const cache = new InfinitePageCache(10);
      expect(cache.setSignature('a')).toBe(true);
      expect(cache.setSignature('a')).toBe(false);
      expect(cache.setSignature('b')).toBe(true);
    });

    it('keeps pages when the signature is unchanged', () => {
      const cache = new InfinitePageCache(10);
      cache.setSignature('a');
      cache.set(0, rowsFor(0), cache.generation);
      cache.setSignature('a');

      expect(cache.has(0)).toBe(true);
    });

    it('discards a response stamped with a superseded generation', () => {
      const cache = new InfinitePageCache(10);
      const stale = cache.generation;
      cache.setSignature('new-query');

      // This is the in-flight response of the previous query arriving late.
      expect(cache.set(0, rowsFor(0), stale)).toBe(false);
      expect(cache.has(0)).toBe(false);
    });

    it('accepts a response stamped with the current generation', () => {
      const cache = new InfinitePageCache(10);
      cache.setSignature('q');
      expect(cache.set(0, rowsFor(0), cache.generation)).toBe(true);
    });
  });

  describe('invalidation', () => {
    it('drops a page range', () => {
      const cache = new InfinitePageCache(10);
      for (let page = 0; page < 5; page++) cache.set(page, rowsFor(page), cache.generation);

      cache.invalidate(1, 3);

      expect(cache.has(0)).toBe(true);
      expect(cache.has(1)).toBe(false);
      expect(cache.has(3)).toBe(false);
      expect(cache.has(4)).toBe(true);
    });

    it('drops everything when given no bounds', () => {
      const cache = new InfinitePageCache(10);
      for (let page = 0; page < 5; page++) cache.set(page, rowsFor(page), cache.generation);

      cache.invalidate();

      expect(cache.size).toBe(0);
    });

    it('drops from a lower bound to the end', () => {
      const cache = new InfinitePageCache(10);
      for (let page = 0; page < 5; page++) cache.set(page, rowsFor(page), cache.generation);

      cache.invalidate(3);

      expect(cache.has(2)).toBe(true);
      expect(cache.has(3)).toBe(false);
      expect(cache.has(4)).toBe(false);
    });
  });
});
