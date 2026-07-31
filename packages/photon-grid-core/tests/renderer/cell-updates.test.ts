import { describe, it, expect, beforeEach } from 'vitest';

import { GridApi } from '../../src/core/grid-api';
import type { GridContext } from '../../src/core/grid-context';
import type { CellUpdate } from '../../src/renderer/vdom/vdom.types';

/**
 * Contract for the real-time cell-update path (`GridApi.applyCellUpdates`).
 *
 * Two guarantees are load-bearing and easy to regress:
 *
 * 1. **Cells always repaint.** Re-running the row pipeline reorders rows but
 *    reuses their DOM, and a reused row's cells are never re-rendered. If the
 *    structural path skipped the Virtual DOM patch, a row would slide to the
 *    position its *new* value earns while still showing its *old* one — the
 *    ordering and the visible numbers would disagree.
 *
 * 2. **Only ordering-relevant changes run the pipeline.** A change to a column
 *    the grid neither sorts, filters nor groups by must stay a cell patch, or
 *    a high-frequency feed collapses into a full pipeline run per batch.
 *
 * The API is exercised against a minimal context stub: `applyCellUpdates`
 * touches only the row model, the store, the column model and the renderer, so
 * stubbing exactly those keeps the test about the decision logic rather than
 * about grid construction.
 */

interface Recorder {
  patched: string[][];
  captures: Array<{ type: string; rowCount: number }>;
  refreshes: number;
}

interface StubState {
  sortConfig: Array<{ colId: string; field: string; order: 'asc' | 'desc' }>;
  groupedColumnIds: string[];
  filterModel: Record<string, unknown>;
  quickFilterConfig: { term?: string } | null;
  visibleRows: Array<{ nodeId: string; top: number }>;
}

/** A `GridApi` whose pipeline is replaced by a counter. */
class TestApi extends GridApi {
  constructor(ctx: GridContext, private readonly rec: Recorder) {
    super(ctx);
  }

  override refresh(): void {
    this.rec.refreshes++;
  }
}

function makeApi(overrides: Partial<StubState> = {}): {
  api: GridApi;
  rec: Recorder;
  data: Map<string, Record<string, unknown>>;
} {
  const state: StubState = {
    sortConfig: [],
    groupedColumnIds: [],
    filterModel: {},
    quickFilterConfig: null,
    visibleRows: [
      { nodeId: 'r1', top: 0 },
      { nodeId: 'r2', top: 40 },
    ],
    ...overrides,
  };

  const data = new Map<string, Record<string, unknown>>([
    ['r1', { symbol: 'AAPL', change: 1, volume: 10 }],
    ['r2', { symbol: 'MSFT', change: 2, volume: 20 }],
  ]);

  const rec: Recorder = { patched: [], captures: [], refreshes: 0 };

  const ctx = {
    store: {
      get: (key: keyof StubState) => state[key],
    },
    rowModel: {
      mergeRowValues: (nodeId: string, values: Record<string, unknown>) => {
        const row = data.get(nodeId);
        if (!row) return undefined;
        data.set(nodeId, { ...row, ...values });
        return { nodeId, data: data.get(nodeId) };
      },
    },
    columnModel: {
      // Column ids and field names match one-to-one in this fixture.
      getColumn: (colId: string) => ({ colId, field: colId }),
    },
    renderer: {
      setFilterEngine: () => undefined,
      setFilterRefreshCallback: () => undefined,
      patchCells: (ids: Iterable<string> | null) => {
        rec.patched.push(ids === null ? ['<all>'] : [...ids]);
      },
      captureRowAnimation: (
        rows: ReadonlyArray<{ nodeId: string }>,
        type: string,
      ) => {
        rec.captures.push({ type, rowCount: rows.length });
      },
    },
    filterEngine: {},
  } as unknown as GridContext;

  return { api: new TestApi(ctx, rec), rec, data };
}

const tick = (nodeId: string, values: Record<string, unknown>): CellUpdate => ({ nodeId, values });

describe('GridApi.applyCellUpdates', () => {
  let fixture: ReturnType<typeof makeApi>;

  beforeEach(() => { fixture = makeApi(); });

  it('patches cells without running the pipeline for a cosmetic change', () => {
    const result = fixture.api.applyCellUpdates([tick('r1', { volume: 99 })]);

    expect(result.pipelineRan).toBe(false);
    expect(result.rowsUpdated).toBe(1);
    expect(fixture.rec.refreshes).toBe(0);
    expect(fixture.rec.patched).toEqual([['r1']]);
  });

  it('merges the new values into the row data', () => {
    fixture.api.applyCellUpdates([tick('r1', { volume: 99 })]);
    expect(fixture.data.get('r1')).toMatchObject({ symbol: 'AAPL', change: 1, volume: 99 });
  });

  it('ignores updates addressed to rows that do not exist', () => {
    const result = fixture.api.applyCellUpdates([tick('nope', { volume: 1 })]);
    expect(result.rowsUpdated).toBe(0);
    expect(fixture.rec.patched).toEqual([]);
  });

  it('is a no-op for an empty batch', () => {
    const result = fixture.api.applyCellUpdates([]);
    expect(result).toEqual({ rowsUpdated: 0, cellsPatched: 0, pipelineRan: false });
    expect(fixture.rec.refreshes).toBe(0);
  });

  describe('with a sort active on the changed field', () => {
    beforeEach(() => {
      fixture = makeApi({ sortConfig: [{ colId: 'change', field: 'change', order: 'desc' }] });
    });

    it('runs the pipeline so the row lands in its sorted position', () => {
      const result = fixture.api.applyCellUpdates([tick('r1', { change: 9 })]);
      expect(result.pipelineRan).toBe(true);
      expect(fixture.rec.refreshes).toBe(1);
    });

    it('still patches the cells, so the value matches the new position', () => {
      // The regression this guards: the pipeline reorders rows but reuses their
      // DOM, so a row would otherwise move according to its new value while
      // still rendering the old one.
      fixture.api.applyCellUpdates([tick('r1', { change: 9 })]);
      expect(fixture.rec.patched).toEqual([['r1']]);
    });

    it('captures a sort animation before the pipeline runs', () => {
      fixture.api.applyCellUpdates([tick('r1', { change: 9 })]);
      expect(fixture.rec.captures).toEqual([{ type: 'sort', rowCount: 2 }]);
    });

    it('leaves an unrelated field on the patch-only path', () => {
      const result = fixture.api.applyCellUpdates([tick('r1', { volume: 5 })]);
      expect(result.pipelineRan).toBe(false);
      expect(fixture.rec.refreshes).toBe(0);
      expect(fixture.rec.captures).toEqual([]);
    });
  });

  it('treats a filtered field as structural, entering with a filter animation', () => {
    const f = makeApi({ filterModel: { change: { type: 'greaterThan', value: 0 } } });
    const result = f.api.applyCellUpdates([tick('r1', { change: 9 })]);

    expect(result.pipelineRan).toBe(true);
    expect(f.rec.captures).toEqual([{ type: 'filter', rowCount: 2 }]);
    expect(f.rec.patched).toEqual([['r1']]);
  });

  it('treats a grouped field as structural', () => {
    const f = makeApi({ groupedColumnIds: ['change'] });
    expect(f.api.applyCellUpdates([tick('r1', { change: 9 })]).pipelineRan).toBe(true);
  });

  it('treats any change as structural while a quick filter is active', () => {
    // A quick filter searches every column, so nothing is safely cosmetic.
    const f = makeApi({ quickFilterConfig: { term: 'aap' } });
    expect(f.api.applyCellUpdates([tick('r1', { volume: 5 })]).pipelineRan).toBe(true);
  });

  it('runs the pipeline once for a batch spanning many rows', () => {
    const f = makeApi({ sortConfig: [{ colId: 'change', field: 'change', order: 'desc' }] });
    f.api.applyCellUpdates([tick('r1', { change: 9 }), tick('r2', { change: 3 })]);

    expect(f.rec.refreshes).toBe(1);
    expect(f.rec.captures).toHaveLength(1);
    expect(f.rec.patched).toEqual([['r1', 'r2']]);
  });
});
