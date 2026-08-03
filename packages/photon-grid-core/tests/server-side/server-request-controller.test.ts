import { describe, it, expect } from 'vitest';
import { ServerRequestController } from '../../src/row-models/server/server-request-controller';
import type {
  ServerSideDatasource,
  ServerSideRequest,
} from '../../src/types/server-side.types';

/** Builds a request with only the fields the controller cares about (requestId). */
function req(requestId: number): ServerSideRequest {
  return {
    startRow: 0, endRow: 10, page: 1, pageSize: 10,
    sortModel: [], filterModel: {}, searchText: '',
    groupKeys: [], pivotColumns: [], valueColumns: [],
    expandedGroups: [], selectedRows: [], requestId,
  };
}

describe('ServerRequestController', () => {
  it('applies only the latest request and discards the superseded one', async () => {
    const controller = new ServerRequestController(0, 1);
    // Resolves after a tick so the second request can supersede the first.
    const ds: ServerSideDatasource = {
      getRows: (p) => {
        setTimeout(() => p.success({ rows: [{ id: p.request.requestId }] }), 20);
      },
    };

    const p1 = controller.execute(req(1), ds);
    const p2 = controller.execute(req(2), ds);

    expect(await p1).toBeNull();               // superseded → discarded
    const r2 = await p2;
    expect(r2?.rows[0]).toEqual({ id: 2 });    // latest wins
  });

  it('aborts the in-flight request when a newer one starts', async () => {
    const controller = new ServerRequestController(0, 1);
    let firstAborted = false;
    const ds: ServerSideDatasource = {
      getRows: (p) => {
        p.signal.addEventListener('abort', () => { firstAborted = true; });
        if (p.request.requestId === 2) p.success({ rows: [] });
      },
    };
    const p1 = controller.execute(req(1), ds);
    const p2 = controller.execute(req(2), ds);
    await Promise.all([p1, p2]);
    expect(firstAborted).toBe(true);
  });

  it('retries a failing request up to maxRetries then succeeds', async () => {
    const controller = new ServerRequestController(3, 1);
    let calls = 0;
    const ds: ServerSideDatasource = {
      getRows: (p) => {
        calls += 1;
        if (calls <= 2) p.fail(new Error('boom'));
        else p.success({ rows: [{ id: 1 }] });
      },
    };
    const attempts: number[] = [];
    const result = await controller.execute(req(1), ds, {
      onRetry: (attempt) => attempts.push(attempt),
    });
    expect(calls).toBe(3);
    expect(attempts).toEqual([1, 2]);
    expect(result?.rows).toEqual([{ id: 1 }]);
  });

  it('rejects when retries are exhausted', async () => {
    const controller = new ServerRequestController(1, 1);
    const ds: ServerSideDatasource = { getRows: (p) => p.fail(new Error('always')) };
    await expect(controller.execute(req(1), ds)).rejects.toThrow('always');
  });
});
