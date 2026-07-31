import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ViewportVDom } from '../../src/renderer/vdom/viewport-vdom';
import { CellPatcher } from '../../src/renderer/vdom/cell-patcher';
import { PatchScheduler } from '../../src/renderer/vdom/patch-scheduler';
import { isSameCellValue } from '../../src/renderer/vdom/cell-value-equality';
import { CellRenderer } from '../../src/renderer/cell-renderer';
import type { CellRenderContext } from '../../src/renderer/cell-renderer';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';
import type { IconRenderer } from '../../src/icons/icon-renderer';
import type { RenderedRowRef, VDomRenderContext } from '../../src/renderer/vdom/vdom.types';

import {
  installDomStub,
  runFrames,
  resetDomCounters,
  StubElement,
  elementsCreated,
} from './dom-stub';

/**
 * Contract for the viewport Virtual DOM.
 *
 * The guarantees under test are the ones the feature exists for: a data change
 * writes only the cells whose values changed, no row or cell element is ever
 * recreated, and cell state (an open editor above all) is never clobbered.
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); resetDomCounters(); });
afterEach(() => { teardown(); });

/** Icon renderer stub — only the string API is reachable from these paths. */
const iconRenderer = {
  renderToString: () => '<svg></svg>',
  render: () => new StubElement('span') as unknown as HTMLElement,
  updateIcon: () => undefined,
} as unknown as IconRenderer;

function col(colId: string, overrides: Partial<ColumnDef> = {}): ColumnDef {
  return {
    colId,
    field: colId,
    header: colId,
    type: 'string',
    ...overrides,
  } as ColumnDef;
}

function makeRow(nodeId: string, data: Record<string, unknown>, rowIndex = 0): RowNode {
  return {
    nodeId,
    rowIndex,
    data,
    type: 'data',
    selected: false,
    expanded: false,
    editable: false,
    level: 0,
    parent: null,
    children: [],
    height: 32,
    top: rowIndex * 32,
  } as RowNode;
}

function makeContext(columns: ColumnDef[]): VDomRenderContext {
  return {
    columnsById: new Map(columns.map((c) => [c.colId, c])),
    api: null,
  };
}

/**
 * Builds a row's panel element exactly the way `BodyRenderer` does — one
 * `.pg-cell` per column, produced by the real `CellRenderer`.
 */
function renderPanel(row: RowNode, columns: ColumnDef[]): StubElement {
  const panel = new StubElement('div');
  panel.className = 'pg-row';
  columns.forEach((colDef, i) => {
    const ctx: CellRenderContext = {
      row,
      colDef,
      rowIndex: row.rowIndex,
      colIndex: i,
      iconRenderer,
      api: null,
    };
    panel.appendChild(new CellRenderer().renderCell(ctx) as unknown as StubElement);
  });
  return panel;
}

function refFor(row: RowNode, panel: StubElement): RenderedRowRef {
  return {
    row,
    left: null,
    center: panel as unknown as HTMLElement,
    right: null,
  };
}

function newVDom(): ViewportVDom {
  return new ViewportVDom(new CellPatcher(new CellRenderer(), iconRenderer));
}

/** Reads a cell's rendered text through the DOM, as a user would see it. */
function cellText(panel: StubElement, colId: string): string {
  const cell = panel.querySelectorAll('.pg-cell')
    .find((c) => c.getAttribute('data-col-id') === colId);
  return cell?.textContent ?? '';
}

describe('isSameCellValue', () => {
  it('treats null and undefined as the same rendered value', () => {
    expect(isSameCellValue(null, undefined)).toBe(true);
  });

  it('treats NaN as unchanged so a NaN cell does not repaint forever', () => {
    expect(isSameCellValue(NaN, NaN)).toBe(true);
  });

  it('compares dates by instant, not identity', () => {
    expect(isSameCellValue(new Date(1000), new Date(1000))).toBe(true);
    expect(isSameCellValue(new Date(1000), new Date(2000))).toBe(false);
  });

  it('compares arrays shallowly', () => {
    expect(isSameCellValue(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(isSameCellValue(['a', 'b'], ['a', 'c'])).toBe(false);
    expect(isSameCellValue(['a'], ['a', 'b'])).toBe(false);
  });

  it('detects ordinary primitive changes', () => {
    expect(isSameCellValue(1, 2)).toBe(false);
    expect(isSameCellValue('x', 'x')).toBe(true);
  });
});

describe('ViewportVDom', () => {
  const columns = [col('symbol'), col('price', { type: 'number' }), col('qty', { type: 'number' })];

  it('patches only the cells whose values changed', () => {
    const row = makeRow('r1', { symbol: 'AAPL', price: 100, qty: 5 });
    const panel = renderPanel(row, columns);
    const ctx = makeContext(columns);
    const vdom = newVDom();
    vdom.sync([refFor(row, panel)], ctx);

    row.data = { ...row.data, price: 101 };
    const patched = vdom.patchRows(['r1'], ctx);

    expect(patched).toBe(1);
    expect(cellText(panel, 'price')).toBe('101');
    // Untouched columns keep their original text.
    expect(cellText(panel, 'symbol')).toBe('AAPL');
    expect(cellText(panel, 'qty')).toBe('5');

    const stats = vdom.getStats();
    expect(stats.cellsCompared).toBe(3);
    expect(stats.cellsPatched).toBe(1);
  });

  it('performs no DOM write when nothing changed', () => {
    const row = makeRow('r1', { symbol: 'AAPL', price: 100, qty: 5 });
    const panel = renderPanel(row, columns);
    const ctx = makeContext(columns);
    const vdom = newVDom();
    vdom.sync([refFor(row, panel)], ctx);

    expect(vdom.patchRows(['r1'], ctx)).toBe(0);
    expect(vdom.getStats().cellsPatched).toBe(0);
  });

  it('reuses the existing cell elements instead of recreating them', () => {
    const row = makeRow('r1', { symbol: 'AAPL', price: 100, qty: 5 });
    const panel = renderPanel(row, columns);
    const ctx = makeContext(columns);
    const vdom = newVDom();
    vdom.sync([refFor(row, panel)], ctx);

    const before = panel.querySelectorAll('.pg-cell');
    resetDomCounters();

    row.data = { ...row.data, price: 102, qty: 9 };
    vdom.patchRows(['r1'], ctx);

    const after = panel.querySelectorAll('.pg-cell');
    expect(after).toHaveLength(before.length);
    after.forEach((el, i) => expect(el).toBe(before[i]));
    // A text patch creates nothing at all.
    expect(elementsCreated).toBe(0);
  });

  it('never writes into a cell whose editor is open', () => {
    const row = makeRow('r1', { symbol: 'AAPL', price: 100, qty: 5 });
    const panel = renderPanel(row, columns);
    const ctx = makeContext(columns);
    const vdom = newVDom();
    vdom.sync([refFor(row, panel)], ctx);

    const priceCell = panel.querySelectorAll('.pg-cell')
      .find((c) => c.getAttribute('data-col-id') === 'price')!;
    priceCell.classList.add('pg-cell--editing');

    row.data = { ...row.data, price: 999 };
    const patched = vdom.patchRows(['r1'], ctx);

    expect(patched).toBe(0);
    expect(cellText(panel, 'price')).toBe('100');
    expect(vdom.getStats().cellsDeferred).toBe(1);
  });

  it('re-runs a custom renderer only for the cell that changed', () => {
    let renderCount = 0;
    const cols = [
      col('symbol'),
      col('price', {
        type: 'number',
        renderer: {
          display: (p: { value: unknown }) => {
            renderCount++;
            const el = new StubElement('span');
            el.textContent = `$${String(p.value)}`;
            return el as unknown as HTMLElement;
          },
        },
      } as Partial<ColumnDef>),
    ];
    const row = makeRow('r1', { symbol: 'AAPL', price: 100 });
    const panel = renderPanel(row, cols);
    const ctx = makeContext(cols);
    const vdom = newVDom();
    vdom.sync([refFor(row, panel)], ctx);

    const afterInitialRender = renderCount;
    row.data = { ...row.data, price: 150 };
    vdom.patchRows(['r1'], ctx);

    expect(renderCount).toBe(afterInitialRender + 1);
    expect(cellText(panel, 'price')).toBe('$150');
    expect(vdom.getStats().cellsReRendered).toBe(1);
  });

  it('keeps a value-dependent cell class in sync without resetting the class list', () => {
    const cols = [
      col('price', {
        type: 'number',
        cellCssClass: (p: { value: unknown }) => (Number(p.value) > 100 ? 'up' : 'down'),
      } as Partial<ColumnDef>),
    ];
    const row = makeRow('r1', { price: 50 });
    const panel = renderPanel(row, cols);
    const ctx = makeContext(cols);
    const vdom = newVDom();
    vdom.sync([refFor(row, panel)], ctx);

    const cell = panel.querySelectorAll('.pg-cell')[0];
    // Simulate selection applied by another subsystem.
    cell.classList.add('pg-cell--range-selected');
    expect(cell.classList.contains('down')).toBe(true);

    row.data = { price: 250 };
    vdom.patchRows(['r1'], ctx);

    expect(cell.classList.contains('up')).toBe(true);
    expect(cell.classList.contains('down')).toBe(false);
    // The unrelated class survived the patch.
    expect(cell.classList.contains('pg-cell--range-selected')).toBe(true);
  });

  it('drops rows that scrolled out of the window', () => {
    const ctx = makeContext(columns);
    const a = makeRow('r1', { symbol: 'A', price: 1, qty: 1 }, 0);
    const b = makeRow('r2', { symbol: 'B', price: 2, qty: 2 }, 1);
    const vdom = newVDom();

    vdom.sync([refFor(a, renderPanel(a, columns)), refFor(b, renderPanel(b, columns))], ctx);
    expect(vdom.getStats().trackedRows).toBe(2);

    // Next frame renders only the second row.
    vdom.sync([refFor(b, renderPanel(b, columns))], ctx);
    expect(vdom.getStats().trackedRows).toBe(1);
    expect(vdom.has('r1')).toBe(false);
    expect(vdom.has('r2')).toBe(true);
  });

  it('redraws a sparkline into its existing canvas instead of rebuilding it', () => {
    // A new canvas cannot paint until it has been measured, so rebuilding the
    // cell leaves a blank frame on every tick — visible as flicker. The patch
    // must reach the mounted canvas's renderer instead.
    const cols = [col('spark', { type: 'sparkline' } as Partial<ColumnDef>)];
    const row = makeRow('r1', { spark: [1, 2, 3] });
    const ctx = makeContext(cols);

    // Stand in for the canvas + attached renderer that `CellRenderer` creates.
    const panel = new StubElement('div');
    const cell = new StubElement('div');
    cell.className = 'pg-cell';
    cell.setAttribute('data-col-id', 'spark');
    cell.setAttribute('data-col-index', '0');
    const inner = new StubElement('div');
    inner.className = 'pg-cell__inner';
    const canvas = new StubElement('canvas');
    canvas.className = 'pg-sparkline';
    const seen: unknown[] = [];
    (canvas as unknown as { _pgSparkline: unknown })._pgSparkline = {
      setData: (data: unknown) => seen.push(data),
    };
    inner.appendChild(canvas);
    cell.appendChild(inner);
    panel.appendChild(cell);

    const vdom = newVDom();
    vdom.sync([refFor(row, panel)], ctx);

    resetDomCounters();
    row.data = { spark: [2, 3, 4] };
    const patched = vdom.patchRows(['r1'], ctx);

    expect(patched).toBe(1);
    expect(seen).toEqual([[2, 3, 4]]);
    // The canvas survived, and nothing was allocated to update it.
    expect(panel.querySelector('canvas')).toBe(canvas);
    expect(elementsCreated).toBe(0);
    // A canvas redraw is not a content rebuild.
    expect(vdom.getStats().cellsReRendered).toBe(0);
  });

  it('re-adopts a row whose panel element was rebuilt', () => {
    const ctx = makeContext(columns);
    const row = makeRow('r1', { symbol: 'A', price: 1, qty: 1 });
    const vdom = newVDom();
    vdom.sync([refFor(row, renderPanel(row, columns))], ctx);

    // The renderer rebuilt this row (e.g. the virtual column range changed).
    const rebuilt = renderPanel(row, columns);
    vdom.sync([refFor(row, rebuilt)], ctx);

    row.data = { ...row.data, price: 7 };
    expect(vdom.patchRows(['r1'], ctx)).toBe(1);
    expect(cellText(rebuilt, 'price')).toBe('7');
  });

  it('ignores rows that are not rendered', () => {
    const ctx = makeContext(columns);
    const vdom = newVDom();
    expect(vdom.patchRows(['missing'], ctx)).toBe(0);
  });

  it('does not track group or summary rows, whose cells are not data-driven', () => {
    const ctx = makeContext(columns);
    const row = makeRow('g1', { symbol: 'A', price: 1, qty: 1 });
    (row as { type: string }).type = 'group';
    const vdom = newVDom();
    vdom.sync([refFor(row, renderPanel(row, columns))], ctx);
    expect(vdom.getStats().trackedRows).toBe(0);
  });

  it('scales the diff with the viewport, not the dataset', () => {
    const ctx = makeContext(columns);
    const vdom = newVDom();
    const rendered: RenderedRowRef[] = [];
    for (let i = 0; i < 40; i++) {
      const row = makeRow(`r${i}`, { symbol: `S${i}`, price: i, qty: i }, i);
      rendered.push(refFor(row, renderPanel(row, columns)));
    }
    vdom.sync(rendered, ctx);

    // 40 rendered rows × 3 columns, regardless of how many rows exist in total.
    expect(vdom.getStats().trackedCells).toBe(120);
  });
});

describe('PatchScheduler', () => {
  it('coalesces many requests in a frame into a single flush', () => {
    const flushed: string[][] = [];
    const scheduler = new PatchScheduler((ids) => {
      flushed.push(ids === null ? ['<all>'] : [...ids]);
    });

    scheduler.schedule(['r1']);
    scheduler.schedule(['r2']);
    scheduler.schedule(['r1']);
    expect(flushed).toHaveLength(0);

    runFrames();

    expect(flushed).toHaveLength(1);
    expect(flushed[0].sort()).toEqual(['r1', 'r2']);
  });

  it('lets a full-viewport request supersede queued row ids', () => {
    const flushed: (string[] | null)[] = [];
    const scheduler = new PatchScheduler((ids) => flushed.push(ids === null ? null : [...ids]));

    scheduler.schedule(['r1']);
    scheduler.schedule(null);
    runFrames();

    expect(flushed).toEqual([null]);
  });

  it('applies queued work synchronously on demand', () => {
    let flushes = 0;
    const scheduler = new PatchScheduler(() => { flushes++; });

    scheduler.schedule(['r1']);
    scheduler.flushNow();
    expect(flushes).toBe(1);

    // The frame callback must not fire a second time.
    runFrames();
    expect(flushes).toBe(1);
  });

  it('discards queued work when cancelled', () => {
    let flushes = 0;
    const scheduler = new PatchScheduler(() => { flushes++; });
    scheduler.schedule(['r1']);
    scheduler.cancel();
    runFrames();
    expect(flushes).toBe(0);
  });
});
