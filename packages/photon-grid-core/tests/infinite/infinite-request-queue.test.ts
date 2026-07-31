import { describe, it, expect } from 'vitest';

import { InfiniteRequestQueue } from '../../src/row-models/infinite/infinite-request-queue';
import type {
  ServerSideDatasource,
  ServerSideGetRowsParams,
  ServerSideRequest,
} from '../../src/types/server-side.types';

/**
 * Contract for the Infinite Row Model's request queue.
 *
 * This is the piece the Server-Side Row Model cannot supply: SSRM guarantees
 * *one* in-flight request and aborts the previous on every new one, whereas
 * infinite scrolling needs several pages in flight that must not cancel each
 * other. The guarantees pinned here are the ones that keep data correct under
 * concurrency — no duplicate requests, no cross-cancellation, and no stale
 * response ever reported as fresh.
 */

/** A request stub; only the fields the queue passes through matter. */
function requestFor(page: number): ServerSideRequest {
  return {
    startRow: page * 100,
    endRow: (page + 1) * 100,
    page: page + 1,
    pageSize: 100,
    sortModel: [],
    filterModel: {},
    searchText: '',
    groupKeys: [],
    pivotColumns: [],
    valueColumns: [],
    expandedGroups: [],
    selectedRows: [],
    requestId: page,
  };
}

/** Records calls and lets each be settled by hand. */
function makeDatasource(): {
  datasource: ServerSideDatasource;
  calls: number[];
  settle(page: number, rows?: Record<string, unknown>[]): void;
  reject(page: number, error: unknown): void;
  pending(): number;
  isOpen(page: number): boolean;
  signalFor(page: number): AbortSignal | undefined;
} {
  const calls: number[] = [];
  const open = new Map<number, ServerSideGetRowsParams>();

  return {
    calls,
    datasource: {
      getRows(params) {
        const page = params.request.page - 1;
        calls.push(page);
        open.set(page, params);
      },
    },
    settle(page, rows = [{ page }]) {
      open.get(page)?.success({ rows, totalRows: 1000 });
      open.delete(page);
    },
    reject(page, error) {
      open.get(page)?.fail(error);
      open.delete(page);
    },
    pending: () => open.size,
    isOpen: (page) => open.has(page),
    signalFor: (page) => open.get(page)?.signal,
  };
}

const always = () => true;
/** Lets queued microtasks and timers run so the queue can advance. */
const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * Waits until the datasource has an open request for a page.
 *
 * A retry is scheduled from inside a promise continuation, so its timer is
 * registered *after* the one a bare `tick()` would create — waiting a fixed
 * number of ticks makes a test that passes or fails on scheduling order rather
 * than on behaviour. Polling removes that coupling entirely.
 */
async function untilOpen(
  ds: { isOpen(page: number): boolean },
  page: number,
  maxTicks = 50,
): Promise<void> {
  for (let i = 0; i < maxTicks; i++) {
    if (ds.isOpen(page)) return;
    await tick();
  }
  throw new Error(`datasource never opened a request for page ${page}`);
}

describe('InfiniteRequestQueue', () => {
  it('fetches a page and reports its rows', async () => {
    const queue = new InfiniteRequestQueue(4, 0, 0);
    const ds = makeDatasource();

    const promise = queue.fetch({ page: 0, request: requestFor(0), generation: 1 }, ds.datasource, always);
    await tick();
    ds.settle(0);

    const outcome = await promise;
    expect(outcome.discarded).toBe(false);
    expect(outcome.result?.rows).toEqual([{ page: 0 }]);
  });

  it('never issues a duplicate request for a page already in flight', async () => {
    const queue = new InfiniteRequestQueue(4, 0, 0);
    const ds = makeDatasource();

    const a = queue.fetch({ page: 2, request: requestFor(2), generation: 1 }, ds.datasource, always);
    const b = queue.fetch({ page: 2, request: requestFor(2), generation: 1 }, ds.datasource, always);
    await tick();

    // The second caller joined the first request rather than opening another.
    expect(ds.calls).toEqual([2]);
    expect(a).toBe(b);

    ds.settle(2);
    await a;
  });

  it('reports whether a page is in flight', async () => {
    const queue = new InfiniteRequestQueue(4, 0, 0);
    const ds = makeDatasource();

    expect(queue.isInFlight(1)).toBe(false);
    const promise = queue.fetch({ page: 1, request: requestFor(1), generation: 1 }, ds.datasource, always);
    expect(queue.isInFlight(1)).toBe(true);

    await tick();
    ds.settle(1);
    await promise;
    expect(queue.isInFlight(1)).toBe(false);
  });

  describe('concurrency', () => {
    it('caps requests in flight and starts queued pages as slots free', async () => {
      const queue = new InfiniteRequestQueue(2, 0, 0);
      const ds = makeDatasource();

      const promises = [0, 1, 2, 3].map((page) =>
        queue.fetch({ page, request: requestFor(page), generation: 1 }, ds.datasource, always),
      );
      await untilOpen(ds, 1);

      expect(ds.calls).toEqual([0, 1]);
      expect(queue.inFlightCount).toBe(2);
      expect(queue.queuedCount).toBe(2);

      ds.settle(0);
      await untilOpen(ds, 2);
      expect(ds.calls).toContain(2);

      ds.settle(1);
      await untilOpen(ds, 3);
      ds.settle(2);
      ds.settle(3);
      await Promise.all(promises);
    });
  });

  describe('cancellation', () => {
    it('aborts a single page without disturbing the others', async () => {
      const queue = new InfiniteRequestQueue(4, 0, 0);
      const ds = makeDatasource();

      const a = queue.fetch({ page: 0, request: requestFor(0), generation: 1 }, ds.datasource, always);
      const b = queue.fetch({ page: 1, request: requestFor(1), generation: 1 }, ds.datasource, always);
      await tick();

      queue.abortPage(0);
      const outcomeA = await a;

      expect(outcomeA.discarded).toBe(true);
      expect(ds.signalFor(1)?.aborted).not.toBe(true);

      ds.settle(1);
      expect((await b).discarded).toBe(false);
    });

    it('forwards an abort signal the datasource can honour', async () => {
      const queue = new InfiniteRequestQueue(4, 0, 0);
      const ds = makeDatasource();

      const promise = queue.fetch({ page: 0, request: requestFor(0), generation: 1 }, ds.datasource, always);
      await tick();
      expect(ds.signalFor(0)?.aborted).toBe(false);

      queue.abortPage(0);
      expect(ds.signalFor(0)?.aborted).toBe(true);
      await promise;
    });

    it('discards everything on abortAll', async () => {
      const queue = new InfiniteRequestQueue(4, 0, 0);
      const ds = makeDatasource();

      const promises = [0, 1].map((page) =>
        queue.fetch({ page, request: requestFor(page), generation: 1 }, ds.datasource, always),
      );
      await tick();

      queue.abortAll();
      const outcomes = await Promise.all(promises);
      expect(outcomes.every((o) => o.discarded)).toBe(true);
    });
  });

  describe('staleness', () => {
    it('discards a response whose generation was superseded', async () => {
      const queue = new InfiniteRequestQueue(4, 0, 0);
      const ds = makeDatasource();
      let current = 1;

      const promise = queue.fetch(
        { page: 0, request: requestFor(0), generation: 1 },
        ds.datasource,
        (gen) => gen === current,
      );
      await tick();

      // A sort landed while the page was in flight: these rows belong to a
      // dataset that is no longer displayed.
      current = 2;
      ds.settle(0);

      const outcome = await promise;
      expect(outcome.discarded).toBe(true);
      expect(outcome.result).toBeNull();
    });

    it('never starts a request whose generation is already stale', async () => {
      const queue = new InfiniteRequestQueue(4, 0, 0);
      const ds = makeDatasource();

      const outcome = await queue.fetch(
        { page: 0, request: requestFor(0), generation: 1 },
        ds.datasource,
        () => false,
      );

      expect(outcome.discarded).toBe(true);
      expect(ds.calls).toEqual([]);
    });
  });

  describe('retry', () => {
    it('retries a failing page up to the limit, then reports the error', async () => {
      const queue = new InfiniteRequestQueue(4, 2, 0);
      const ds = makeDatasource();

      const promise = queue.fetch({ page: 0, request: requestFor(0), generation: 1 }, ds.datasource, always);

      // Initial attempt plus two retries.
      for (let attempt = 0; attempt < 3; attempt++) {
        await untilOpen(ds, 0);
        ds.reject(0, new Error('boom'));
      }

      const outcome = await promise;
      expect(ds.calls).toHaveLength(3);
      expect(outcome.attempts).toBe(2);
      expect(outcome.discarded).toBe(false);
      expect((outcome.error as Error).message).toBe('boom');
    });

    it('succeeds on a retry without reporting an error', async () => {
      const queue = new InfiniteRequestQueue(4, 1, 0);
      const ds = makeDatasource();

      const promise = queue.fetch({ page: 0, request: requestFor(0), generation: 1 }, ds.datasource, always);
      await untilOpen(ds, 0);
      ds.reject(0, new Error('transient'));
      await untilOpen(ds, 0);
      ds.settle(0);

      const outcome = await promise;
      expect(outcome.error).toBeUndefined();
      expect(outcome.result?.rows).toEqual([{ page: 0 }]);
    });

    it('does not retry a page whose generation went stale mid-flight', async () => {
      const queue = new InfiniteRequestQueue(4, 3, 0);
      const ds = makeDatasource();
      let current = 1;

      const promise = queue.fetch(
        { page: 0, request: requestFor(0), generation: 1 },
        ds.datasource,
        (gen) => gen === current,
      );
      await untilOpen(ds, 0);

      current = 2;
      ds.reject(0, new Error('boom'));

      expect((await promise).discarded).toBe(true);
      expect(ds.calls).toHaveLength(1);
    });
  });

  it('normalises a datasource that throws synchronously', async () => {
    const queue = new InfiniteRequestQueue(4, 0, 0);
    const datasource: ServerSideDatasource = {
      getRows() { throw new Error('sync failure'); },
    };

    const outcome = await queue.fetch(
      { page: 0, request: requestFor(0), generation: 1 },
      datasource,
      always,
    );
    expect((outcome.error as Error).message).toBe('sync failure');
  });

  it('normalises a datasource whose promise rejects', async () => {
    const queue = new InfiniteRequestQueue(4, 0, 0);
    const datasource: ServerSideDatasource = {
      getRows: () => Promise.reject(new Error('async failure')),
    };

    const outcome = await queue.fetch(
      { page: 0, request: requestFor(0), generation: 1 },
      datasource,
      always,
    );
    expect((outcome.error as Error).message).toBe('async failure');
  });
});
