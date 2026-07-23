import { describe, it, expect } from 'vitest';
import { ExpressionCache, DEFAULT_FORMULA_CONFIG } from '../../src/formula';

describe('ExpressionCache', () => {
  it('returns a cached AST for a repeated source and counts hits', () => {
    const cache = new ExpressionCache();
    const a = cache.compile('=A1+B1', DEFAULT_FORMULA_CONFIG);
    const b = cache.compile('=A1+B1', DEFAULT_FORMULA_CONFIG);
    expect(b.ast).toBe(a.ast); // identical shared AST instance
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5);
  });

  it('caches compile errors too (no repeated parse work)', () => {
    const cache = new ExpressionCache();
    const a = cache.compile('=1+', DEFAULT_FORMULA_CONFIG);
    const b = cache.compile('=1+', DEFAULT_FORMULA_CONFIG);
    expect(a.error).not.toBeNull();
    expect(b).toBe(a);
    expect(cache.stats().hits).toBe(1);
  });

  it('keys on separators so a locale change does not return a stale parse', () => {
    const cache = new ExpressionCache();
    const en = cache.compile('=SUM(1,2)', DEFAULT_FORMULA_CONFIG);
    const de = cache.compile('=SUM(1;2)', { ...DEFAULT_FORMULA_CONFIG, argumentSeparator: ';' });
    expect(en.ast).not.toBe(de.ast);
    expect(cache.stats().misses).toBe(2);
  });

  it('evicts least-recently-used entries beyond capacity', () => {
    const cache = new ExpressionCache(2);
    cache.compile('=1', DEFAULT_FORMULA_CONFIG); // A
    cache.compile('=2', DEFAULT_FORMULA_CONFIG); // B
    cache.compile('=1', DEFAULT_FORMULA_CONFIG); // touch A → A is MRU, B is LRU
    cache.compile('=3', DEFAULT_FORMULA_CONFIG); // C → evicts B
    expect(cache.size).toBe(2);

    // '=2' was evicted → recompiling it is a miss; '=1' is still a hit.
    const missesBefore = cache.stats().misses;
    cache.compile('=2', DEFAULT_FORMULA_CONFIG);
    expect(cache.stats().misses).toBe(missesBefore + 1);
  });

  it('rejects a capacity below 1', () => {
    expect(() => new ExpressionCache(0)).toThrow(RangeError);
  });
});
