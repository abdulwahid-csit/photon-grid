import { describe, it, expect } from 'vitest';
import {
  ServerRequestBuilder,
  serverRequestSignature,
} from '../../src/row-models/server/server-request-builder';
import type { GridContext } from '../../src/core/grid-context';

/** Minimal context stub exposing only what ServerRequestBuilder reads. */
function stubContext(): GridContext {
  return {
    sortEngine: { getSortConfig: () => [{ colId: 'name', field: 'name', order: 'asc' as const }] },
    filterEngine: { getFilterModel: () => ({ age: { type: 'number' } }) },
    paginationEngine: { getCurrentPage: () => 3, getPageSize: () => 25 },
    store: {
      get: (key: string) => {
        switch (key) {
          case 'quickFilterConfig':
            return { term: 'joe' };
          case 'expandedGroupKeys':
            return new Set(['g1']);
          case 'selectedRowIds':
            return new Set(['r1']);
          default:
            return undefined;
        }
      },
    },
  } as unknown as GridContext;
}

describe('ServerRequestBuilder', () => {
  it('composes a request from live grid state', () => {
    const req = new ServerRequestBuilder(stubContext()).build(7);
    expect(req.page).toBe(3);
    expect(req.pageSize).toBe(25);
    expect(req.startRow).toBe(50);
    expect(req.endRow).toBe(75);
    expect(req.sortModel).toEqual([{ colId: 'name', sort: 'asc' }]);
    expect(req.searchText).toBe('joe');
    expect(req.selectedRows).toEqual(['r1']);
    expect(req.expandedGroups).toEqual(['g1']);
    expect(req.requestId).toBe(7);
  });

  it('signature ignores requestId so identical fetches share a cache key', () => {
    const builder = new ServerRequestBuilder(stubContext());
    expect(serverRequestSignature(builder.build(1))).toBe(serverRequestSignature(builder.build(2)));
  });
});
