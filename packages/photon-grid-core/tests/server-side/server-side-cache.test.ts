import { describe, it, expect } from 'vitest';
import { ServerSideCache } from '../../src/row-models/server/server-side-cache';
import type { ServerSideResult } from '../../src/types/server-side.types';

const result = (n: number): ServerSideResult => ({ rows: [{ id: n }], totalRows: n });

describe('ServerSideCache', () => {
  it('stores and retrieves by signature', () => {
    const cache = new ServerSideCache(3);
    cache.set('a', result(1));
    expect(cache.get('a')).toEqual(result(1));
    expect(cache.stats().hits).toBe(1);
  });

  it('returns undefined and counts a miss on absent key', () => {
    const cache = new ServerSideCache(3);
    expect(cache.get('nope')).toBeUndefined();
    expect(cache.stats().misses).toBe(1);
  });

  it('evicts the least-recently-used entry past capacity', () => {
    const cache = new ServerSideCache(2);
    cache.set('a', result(1));
    cache.set('b', result(2));
    cache.get('a'); // touch 'a' → 'b' is now LRU
    cache.set('c', result(3)); // evicts 'b'
    expect(cache.get('a')).toEqual(result(1));
    expect(cache.get('c')).toEqual(result(3));
    expect(cache.get('b')).toBeUndefined();
    expect(cache.stats().size).toBe(2);
  });

  it('clear() empties the cache', () => {
    const cache = new ServerSideCache(3);
    cache.set('a', result(1));
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.stats().size).toBe(0);
  });
});
