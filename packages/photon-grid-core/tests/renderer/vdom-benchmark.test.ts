import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ViewportVDom } from '../../src/renderer/vdom/viewport-vdom';
import { CellPatcher } from '../../src/renderer/vdom/cell-patcher';
import { CellRenderer } from '../../src/renderer/cell-renderer';
import type { CellRenderContext } from '../../src/renderer/cell-renderer';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';
import type { IconRenderer } from '../../src/icons/icon-renderer';
import type { RenderedRowRef, VDomRenderContext } from '../../src/renderer/vdom/vdom.types';

import { installDomStub, resetDomCounters, StubElement, elementsCreated } from './dom-stub';

/**
 * Benchmark: Virtual DOM patching vs. the pre-existing repaint strategy.
 *
 * Before the Virtual DOM, the only way to reflect changed row data was to evict
 * the row from the render cache (`BodyRenderer.invalidateRowsByNodeId`) and let
 * the next frame rebuild it — every cell of every affected row re-created and
 * every custom renderer re-executed, regardless of how many values actually
 * changed. This suite reproduces both strategies over the same workload.
 *
 * The assertions are on **work done**, not wall-clock time: elements created,
 * renderer invocations and DOM writes are deterministic and reproduce on any
 * machine, whereas timings under a stubbed DOM in CI are not. Wall-clock is
 * still printed for context.
 *
 * Workload: a 60-row viewport of 12 columns (720 cells) — a realistic
 * full-screen grid — receiving 500 update batches that each touch 2 fields on
 * 10 rows, i.e. the shape of a market-data feed.
 */

const VIEWPORT_ROWS = 60;
const COLUMN_COUNT = 12;
const BATCHES = 200;
const ROWS_PER_BATCH = 10;
const FIELDS_PER_UPDATE = 2;

let teardown: () => void;
beforeEach(() => { teardown = installDomStub(); resetDomCounters(); });
afterEach(() => { teardown(); });

/** Counts how often the instrumented custom renderer runs. */
let rendererCalls = 0;

const iconRenderer = {
  renderToString: () => '<svg></svg>',
  render: () => new StubElement('span') as unknown as HTMLElement,
  updateIcon: () => undefined,
} as unknown as IconRenderer;

function buildColumns(): ColumnDef[] {
  const cols: ColumnDef[] = [
    { colId: 'symbol', field: 'symbol', header: 'Symbol', type: 'string' } as ColumnDef,
    // One custom renderer, as any real grid has — the expensive thing a
    // rebuild re-runs for every row whether or not its value moved.
    {
      colId: 'price',
      field: 'price',
      header: 'Price',
      type: 'number',
      renderer: {
        display: (p: { value: unknown }) => {
          rendererCalls++;
          const el = new StubElement('span');
          el.textContent = Number(p.value).toFixed(2);
          return el as unknown as HTMLElement;
        },
      },
    } as unknown as ColumnDef,
  ];
  for (let i = cols.length; i < COLUMN_COUNT; i++) {
    cols.push({ colId: `f${i}`, field: `f${i}`, header: `F${i}`, type: 'number' } as ColumnDef);
  }
  return cols;
}

function buildRows(columns: ColumnDef[]): RowNode[] {
  const rows: RowNode[] = [];
  for (let r = 0; r < VIEWPORT_ROWS; r++) {
    const data: Record<string, unknown> = {};
    for (const c of columns) data[c.field] = c.field === 'symbol' ? `SYM${r}` : r + 1;
    rows.push({
      nodeId: `r${r}`,
      rowIndex: r,
      data,
      type: 'data',
      selected: false,
      expanded: false,
      editable: false,
      level: 0,
      parent: null,
      children: [],
      height: 32,
      top: r * 32,
    } as RowNode);
  }
  return rows;
}

function renderPanel(row: RowNode, columns: ColumnDef[], renderer: CellRenderer): StubElement {
  const panel = new StubElement('div');
  panel.className = 'pg-row';
  columns.forEach((colDef, i) => {
    const ctx: CellRenderContext = {
      row, colDef, rowIndex: row.rowIndex, colIndex: i, iconRenderer, api: null,
    };
    panel.appendChild(renderer.renderCell(ctx) as unknown as StubElement);
  });
  return panel;
}

/**
 * Deterministic update stream: batch `b` touches a fixed, repeatable slice of
 * rows so both strategies process byte-for-byte identical work.
 */
function batchRows(batch: number, rows: RowNode[]): RowNode[] {
  const out: RowNode[] = [];
  for (let i = 0; i < ROWS_PER_BATCH; i++) {
    out.push(rows[(batch * ROWS_PER_BATCH + i) % rows.length]);
  }
  return out;
}

function applyBatch(batch: number, targets: RowNode[]): void {
  // Offsets keep every written value distinct from both the seed data and the
  // previous batch's value for the same row, so each update is a genuine
  // change. (Without that, the diff correctly skips the coincidental no-ops —
  // right behaviour, but it makes the benchmark's arithmetic misleading.)
  for (const row of targets) {
    row.data = { ...row.data, price: 1000 + batch, f2: 5000 + batch };
  }
}

describe('Virtual DOM benchmark vs. row-rebuild repaint', () => {
  it('patches only changed cells where a rebuild recreates whole rows', () => {
    const columns = buildColumns();
    const ctx: VDomRenderContext = { columnsById: new Map(columns.map((c) => [c.colId, c])), api: null };

    // ── Strategy A: the previous behaviour — evict and rebuild each row ──────
    const rebuildRenderer = new CellRenderer();
    const rebuildRows = buildRows(columns);
    const rebuildPanels = new Map<string, StubElement>();
    for (const row of rebuildRows) rebuildPanels.set(row.nodeId, renderPanel(row, columns, rebuildRenderer));

    resetDomCounters();
    rendererCalls = 0;
    const rebuildStart = performance.now();
    for (let b = 0; b < BATCHES; b++) {
      const targets = batchRows(b, rebuildRows);
      applyBatch(b, targets);
      // What `invalidateRowsByNodeId` + the next render pass amount to.
      for (const row of targets) rebuildPanels.set(row.nodeId, renderPanel(row, columns, rebuildRenderer));
    }
    const rebuildMs = performance.now() - rebuildStart;
    const rebuildElements = elementsCreated;
    const rebuildRendererCalls = rendererCalls;

    // ── Strategy B: viewport Virtual DOM patching ───────────────────────────
    const patchRenderer = new CellRenderer();
    const patchRows = buildRows(columns);
    const refs: RenderedRowRef[] = patchRows.map((row) => ({
      row,
      left: null,
      center: renderPanel(row, columns, patchRenderer) as unknown as HTMLElement,
      right: null,
    }));
    const vdom = new ViewportVDom(new CellPatcher(patchRenderer, iconRenderer));
    vdom.sync(refs, ctx);

    resetDomCounters();
    rendererCalls = 0;
    const patchStart = performance.now();
    for (let b = 0; b < BATCHES; b++) {
      const targets = batchRows(b, patchRows);
      applyBatch(b, targets);
      vdom.patchRows(targets.map((r) => r.nodeId), ctx);
    }
    const patchMs = performance.now() - patchStart;
    const patchElements = elementsCreated;
    const patchRendererCalls = rendererCalls;
    const stats = vdom.getStats();

    const totalUpdatedCells = BATCHES * ROWS_PER_BATCH * FIELDS_PER_UPDATE;

    // ── Correctness: exactly the changed cells were written ─────────────────
    expect(stats.cellsPatched).toBe(totalUpdatedCells);
    expect(stats.cellsCompared).toBe(BATCHES * ROWS_PER_BATCH * COLUMN_COUNT);

    // ── The core claim: no row or cell element is recreated ─────────────────
    // A rebuild allocates a cell (plus its inner and value elements) for every
    // column of every touched row; patching allocates only inside the single
    // custom-rendered cell that changed.
    const rebuiltCellsPerRow = COLUMN_COUNT;
    expect(rebuildElements).toBeGreaterThan(BATCHES * ROWS_PER_BATCH * rebuiltCellsPerRow);
    expect(patchElements).toBeLessThan(rebuildElements / 10);

    // ── Custom renderers run only for cells that actually changed ───────────
    expect(rebuildRendererCalls).toBe(BATCHES * ROWS_PER_BATCH);
    expect(patchRendererCalls).toBe(BATCHES * ROWS_PER_BATCH);

    // ── Frame budget ────────────────────────────────────────────────────────
    // Asserted as work, not milliseconds: a flush diffs one batch, so it can
    // never touch more than `ROWS_PER_BATCH × COLUMN_COUNT` cells no matter how
    // fast the feed runs. Wall-clock is reported below but not asserted — under
    // parallel CI load it measures the machine, not the code.
    expect(stats.cellsCompared / BATCHES).toBe(ROWS_PER_BATCH * COLUMN_COUNT);

    // eslint-disable-next-line no-console
    console.log(
      `\n  viewport ${VIEWPORT_ROWS}×${COLUMN_COUNT} · ${BATCHES} batches × ${ROWS_PER_BATCH} rows\n` +
      `  rebuild : ${rebuildMs.toFixed(1)} ms · ${rebuildElements} elements created\n` +
      `  patch   : ${patchMs.toFixed(1)} ms · ${patchElements} elements created\n` +
      `  speedup : ${(rebuildMs / patchMs).toFixed(1)}× time · ` +
      `${(rebuildElements / Math.max(1, patchElements)).toFixed(1)}× fewer allocations\n` +
      `  cells   : ${stats.cellsCompared} compared → ${stats.cellsPatched} written ` +
      `(${((stats.cellsPatched / stats.cellsCompared) * 100).toFixed(1)}%)\n` +
      `  last flush: ${stats.lastFlushMs.toFixed(3)} ms\n`,
    );
  }, 120_000);

  it('keeps the per-frame diff bounded by the viewport, not the dataset', () => {
    const columns = buildColumns();
    const ctx: VDomRenderContext = { columnsById: new Map(columns.map((c) => [c.colId, c])), api: null };
    const renderer = new CellRenderer();
    const rows = buildRows(columns);
    const refs: RenderedRowRef[] = rows.map((row) => ({
      row,
      left: null,
      center: renderPanel(row, columns, renderer) as unknown as HTMLElement,
      right: null,
    }));
    const vdom = new ViewportVDom(new CellPatcher(renderer, iconRenderer));
    vdom.sync(refs, ctx);

    // A full-viewport diff with nothing changed — the cost floor of a frame in
    // which the feed delivered updates for rows that are all off-screen.
    vdom.resetStats();
    const start = performance.now();
    const FRAMES = 60;
    for (let i = 0; i < FRAMES; i++) vdom.patchRows(null, ctx);
    const ms = performance.now() - start;
    const stats = vdom.getStats();

    // The guarantee is structural: each frame compares exactly the rendered
    // cells and writes none of them, whatever the dataset behind them holds.
    expect(stats.cellsCompared).toBe(FRAMES * VIEWPORT_ROWS * COLUMN_COUNT);
    expect(stats.cellsPatched).toBe(0);

    // eslint-disable-next-line no-console
    console.log(
      `  idle diff: ${FRAMES} full-viewport frames in ${ms.toFixed(1)} ms ` +
      `(${(ms / FRAMES).toFixed(3)} ms/frame, ${VIEWPORT_ROWS * COLUMN_COUNT} cells each)\n`,
    );
  }, 120_000);
});
