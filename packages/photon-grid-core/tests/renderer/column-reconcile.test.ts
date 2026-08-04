import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { BodyRenderer } from '../../src/renderer/body-renderer';
import type { BodyRendererOptions } from '../../src/renderer/body-renderer';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';
import type { GridStore } from '../../src/core/grid-store';
import type { EventBus } from '../../src/event-bus/event-bus';
import type { IconRenderer } from '../../src/icons/icon-renderer';
import type { RowSelectionEngine } from '../../src/engines/selection/row-selection-engine';

import { installDomStub, StubElement } from './dom-stub';

/**
 * Contract for `BodyRenderer`'s in-place column reconciliation.
 *
 * Reordering a column, pinning one, or scrolling the horizontal virtual window
 * used to discard every rendered row and build it again. That is invisible for
 * a text cell and very visible for anything with state: an `<img>` still
 * fetching from the server restarts and flashes, a sparkline's canvas is
 * repainted from scratch. The guarantees below are what stop that:
 *
 * 1. A pure reorder moves the **same** cell elements — nothing is recreated.
 * 2. Cells are restamped with their new `data-col-index`, because that is the
 *    coordinate selection, keyboard navigation and the clipboard key off.
 * 3. Only columns that genuinely entered the layout produce new elements, and
 *    only columns that genuinely left it are detached.
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); });
afterEach(() => { teardown(); });

const iconRenderer = {
  renderToString: () => '<svg></svg>',
  render: () => new StubElement('span') as unknown as HTMLElement,
  updateIcon: () => undefined,
} as unknown as IconRenderer;

const store = { get: () => [] } as unknown as GridStore;
const eventBus = { emit: () => undefined } as unknown as EventBus;
const rowSelectionEngine = { toggleRowSelection: () => undefined } as unknown as RowSelectionEngine;

function col(colId: string): ColumnDef {
  return { colId, field: colId, header: colId, type: 'string' } as ColumnDef;
}

function makeRow(nodeId: string, rowIndex: number): RowNode {
  return {
    nodeId,
    rowIndex,
    data: { a: 'a-value', b: 'b-value', c: 'c-value', d: 'd-value' },
    type: 'data',
    selected: false,
    expanded: false,
    editable: false,
    level: 0,
    parent: null,
    children: [],
    height: 32,
    top: rowIndex * 32,
  } as unknown as RowNode;
}

interface Harness {
  renderer: BodyRenderer;
  center: StubElement;
  rows: RowNode[];
  /** Renders the given center columns, with everything else held constant. */
  render: (centerCols: ColumnDef[], extra?: Partial<BodyRendererOptions>) => void;
}

function makeHarness(allCols: ColumnDef[]): Harness {
  const renderer = new BodyRenderer(store, eventBus, iconRenderer, rowSelectionEngine);
  const center = new StubElement('div');
  renderer.setPanels(null, center as unknown as HTMLElement, null);

  const rows = [makeRow('r1', 0), makeRow('r2', 1)];

  return {
    renderer,
    center,
    rows,
    render(centerCols, extra = {}) {
      renderer.renderRows(rows, [], centerCols, [], {
        allLeafColumns: allCols,
        centerColStart: 0,
        totalCenterCols: allCols.length,
        ...extra,
      });
    },
  };
}

/** Ordered `data-col-id`s of a row's data cells, spacers excluded. */
function cellOrder(rowEl: StubElement): string[] {
  return rowEl.children
    .map((c) => c.getAttribute('data-col-id'))
    .filter((id): id is string => id !== null);
}

/** `data-col-id` → `data-col-index` for a row's data cells. */
function cellIndexes(rowEl: StubElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of rowEl.children) {
    const colId = c.getAttribute('data-col-id');
    if (colId !== null) out[colId] = c.getAttribute('data-col-index') ?? '';
  }
  return out;
}

describe('BodyRenderer — column reconciliation', () => {
  it('reorders columns by moving the existing cell elements, not rebuilding them', () => {
    const cols = [col('a'), col('b'), col('c')];
    const h = makeHarness(cols);

    h.render(cols);
    const rowEl = h.center.children[0];
    expect(cellOrder(rowEl)).toEqual(['a', 'b', 'c']);

    // Identity of every cell before the reorder — this is the thing that must
    // survive, since it is what a custom renderer's DOM hangs off.
    const before = new Map(
      rowEl.children
        .filter((c) => c.getAttribute('data-col-id') !== null)
        .map((c) => [c.getAttribute('data-col-id')!, c]),
    );

    // Drag 'c' to the front.
    h.render([col('c'), col('a'), col('b')]);

    const afterRowEl = h.center.children[0];
    expect(afterRowEl).toBe(rowEl);
    expect(cellOrder(afterRowEl)).toEqual(['c', 'a', 'b']);
    for (const [colId, el] of before) {
      expect(afterRowEl.children).toContain(el);
      expect(el.getAttribute('data-col-id')).toBe(colId);
    }
  });

  it('restamps data-col-index so a moved cell reports its new position', () => {
    const cols = [col('a'), col('b'), col('c')];
    const h = makeHarness(cols);

    h.render(cols);
    expect(cellIndexes(h.center.children[0])).toEqual({ a: '0', b: '1', c: '2' });

    h.render([col('c'), col('a'), col('b')]);
    expect(cellIndexes(h.center.children[0])).toEqual({ c: '0', a: '1', b: '2' });
  });

  it('reconciles every rendered row, not just the first', () => {
    const cols = [col('a'), col('b'), col('c')];
    const h = makeHarness(cols);

    h.render(cols);
    h.render([col('b'), col('c'), col('a')]);

    for (const rowEl of h.center.children) {
      expect(cellOrder(rowEl)).toEqual(['b', 'c', 'a']);
    }
  });

  it('builds cells only for columns that entered, and detaches only those that left', () => {
    const all = [col('a'), col('b'), col('c'), col('d')];
    const h = makeHarness(all);

    h.render([all[0], all[1]]);
    const rowEl = h.center.children[0];
    const keptA = rowEl.children.find((c) => c.getAttribute('data-col-id') === 'a');
    const droppedB = rowEl.children.find((c) => c.getAttribute('data-col-id') === 'b');
    expect(keptA).toBeDefined();
    expect(droppedB).toBeDefined();

    // The horizontal window slides: 'b' scrolls out, 'c' scrolls in.
    h.render([all[0], all[2]]);

    expect(cellOrder(rowEl)).toEqual(['a', 'c']);
    // 'a' survived untouched; 'b' was detached rather than left orphaned.
    expect(rowEl.children).toContain(keptA);
    expect(droppedB!.parentNode).toBeNull();
  });

  it('keeps the trailing virtual-scroll spacer last and re-sizes both spacers', () => {
    const all = [col('a'), col('b'), col('c')];
    const h = makeHarness(all);

    h.render([all[1]], { centerColStart: 1, centerLeftSpacerW: 100, centerRightSpacerW: 100 });
    const rowEl = h.center.children[0];

    h.render([all[1], all[2]], { centerColStart: 1, centerLeftSpacerW: 100, centerRightSpacerW: 0 });

    const classes = rowEl.children.map((c) => c.className);
    expect(classes[0]).toContain('pg-cell--h-spacer-start');
    expect(classes[classes.length - 1]).toContain('pg-cell--h-spacer-end');
    expect(cellOrder(rowEl)).toEqual(['b', 'c']);

    const startSpacer = rowEl.children[0];
    const endSpacer = rowEl.children[rowEl.children.length - 1];
    expect(startSpacer.style['width']).toBe('100px');
    expect(endSpacer.style['width']).toBe('0px');
  });

  it('rebuilds rows outright when a non-column cell is switched on', () => {
    const all = [col('a'), col('b')];
    const h = makeHarness(all);

    h.render(all);
    const rowEl = h.center.children[0];

    // Turning grouping on inserts the auto-group cell, which sits outside the
    // reconciler's contract — the row has to be rebuilt or the panels end up
    // misaligned by exactly one cell.
    h.render(all, { showGroupsColumn: true, autoGroupColWidth: 200, leafGroupColDef: all[0] });

    expect(h.center.children[0]).not.toBe(rowEl);
    expect(cellOrder(h.center.children[0])).toEqual(['__group__', 'a', 'b']);
  });

  it('leaves the auto-group cell in place across a reorder', () => {
    const all = [col('a'), col('b'), col('c')];
    const h = makeHarness(all);
    const grouped = { showGroupsColumn: true, autoGroupColWidth: 200, leafGroupColDef: all[0] };

    h.render(all, grouped);
    const rowEl = h.center.children[0];
    const groupCell = rowEl.children.find((c) => c.getAttribute('data-col-id') === '__group__');

    h.render([all[2], all[0], all[1]], grouped);

    // It is not a member of any panel's column list, so it must be neither
    // moved by the reorder nor mistaken for a column that left the layout.
    expect(rowEl.children).toContain(groupCell);
    expect(cellOrder(rowEl)).toEqual(['__group__', 'c', 'a', 'b']);
  });
});
