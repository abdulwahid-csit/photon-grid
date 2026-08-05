// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { GridCore } from '../../src/core/grid-core';
import { GridEventType } from '../../src/types/event.types';
import type { LoadingChangedEvent } from '../../src/types/loading.types';
import type { GridOptions } from '../../src/types/grid.types';
import type { ServerSideDatasource } from '../../src/types/server-side.types';

/**
 * Regression guard for the loading-event de-duplication.
 *
 * `ServerRowModel` and `InfiniteRowModel` used to write `store.loading` *and*
 * emit `LOADING_STARTED` / `LOADING_STOPPED` themselves. Now that `GridCore`
 * emits from a single `store.watch('loading')`, an emit left in either model
 * would double-fire on every fetch — which is exactly the kind of bug that
 * survives a green suite unless something counts the events.
 *
 * Counting also proves the flag is change-gated end to end: a refresh issued
 * while a fetch is already in flight must not re-announce a state the host is
 * already in.
 */

const COLUMNS = [
  { field: 'name', header: 'Name' },
  { field: 'age', header: 'Age', type: 'number' as const },
];

class NoopResizeObserver implements ResizeObserver {
  observe(): void { /* no layout in jsdom to observe */ }
  unobserve(): void { /* no-op */ }
  disconnect(): void { /* no-op */ }
}

function installResizeObserver(): void {
  const stub = NoopResizeObserver as unknown as typeof ResizeObserver;
  (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = stub;
  if (typeof window !== 'undefined') {
    (window as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = stub;
  }
}

installResizeObserver();

let grids: GridCore[] = [];

/** A datasource that resolves on the microtask queue, one page of rows. */
function createDatasource(): ServerSideDatasource & { calls: number } {
  const datasource = {
    calls: 0,
    getRows(params: Parameters<ServerSideDatasource['getRows']>[0]): void {
      datasource.calls++;
      queueMicrotask(() => {
        if (params.signal.aborted) return;
        params.success({
          rows: [{ name: 'Ada', age: 36 }, { name: 'Grace', age: 45 }],
          totalRows: 2,
        });
      });
    },
  };
  return datasource;
}

/** Lets queued microtasks and one animation frame settle. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(() => requestAnimationFrame(() => resolve()), 0));
}

beforeEach(() => {
  grids = [];
  installResizeObserver();
  document.body.innerHTML = '';
});

afterEach(() => {
  for (const g of grids) {
    try { g.destroy(); } catch { /* teardown is best-effort */ }
  }
  document.body.innerHTML = '';
});

describe('server-side row model loading events', () => {
  it('emits exactly one started/stopped pair per fetch cycle', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const datasource = createDatasource();
    const grid = new GridCore(container, {
      columns: COLUMNS,
      rowModel: 'server',
      serverSideDatasource: datasource,
    } as unknown as GridOptions);
    grids.push(grid);

    const started: LoadingChangedEvent[] = [];
    const stopped: LoadingChangedEvent[] = [];
    grid.api.on<LoadingChangedEvent>(GridEventType.LOADING_STARTED, (e) => started.push(e));
    grid.api.on<LoadingChangedEvent>(GridEventType.LOADING_STOPPED, (e) => stopped.push(e));

    grid.api.refreshServerSide({ purge: true });
    await settle();

    expect(datasource.calls).toBeGreaterThan(0);
    expect(started).toHaveLength(1);
    expect(stopped).toHaveLength(1);
    expect(grid.api.isLoading()).toBe(false);
  });

  it('does not re-announce a load that is already in flight', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const grid = new GridCore(container, {
      columns: COLUMNS,
      rowModel: 'server',
      serverSideDatasource: createDatasource(),
    } as unknown as GridOptions);
    grids.push(grid);
    await settle();

    const started: LoadingChangedEvent[] = [];
    grid.api.on<LoadingChangedEvent>(GridEventType.LOADING_STARTED, (e) => started.push(e));

    // Two refreshes back to back: the second lands while the first still owns
    // the loading flag, so it must not emit a second start.
    grid.api.refreshServerSide({ purge: true });
    grid.api.refreshServerSide({ purge: true });
    await settle();

    expect(started).toHaveLength(1);
  });
});
