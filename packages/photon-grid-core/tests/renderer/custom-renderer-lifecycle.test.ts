// @vitest-environment jsdom

/**
 * The DOM-mutation contract framework wrappers depend on.
 *
 * Angular, React and Vue cell renderers mount a real framework view into the
 * element the core asked them for, and the core has no "this cell is gone"
 * lifecycle hook — so each wrapper watches the grid with a `MutationObserver`
 * and tears its view down when the host element is removed.
 *
 * The trap: **the core moves cells**. Whenever the horizontal virtual window
 * shifts — a column resize that changes how many columns fit, a sideways
 * scroll, a reorder, a pin — `BodyRenderer.reconcilePanelCells` keeps every
 * surviving cell's element and re-anchors it with `insertBefore`. Per the DOM
 * spec that is a removal followed by an insertion, so the observer reports the
 * element in `removedNodes` even though it is still on screen. A wrapper that
 * reads `removedNodes` as "discarded" destroys the framework view inside a live
 * cell, and the custom cells go blank — which is exactly what resizing a column
 * did to Angular component/template renderers before `RendererAdapter`
 * distinguished the two cases.
 *
 * `isConnected` is that distinction: observer callbacks are delivered as a
 * microtask *after* the task that mutated the DOM, so a moved node has already
 * been re-attached by the time a wrapper sees it, while a discarded one has not.
 *
 * These tests pin down both halves — that the core really does move surviving
 * cells (so wrappers cannot simply be told to stop worrying about it), and that
 * connectivity separates a move from a removal.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { BodyRenderer } from '../../src/renderer/body-renderer';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';
import type { GridStore } from '../../src/core/grid-store';
import type { EventBus } from '../../src/event-bus/event-bus';
import type { IconRenderer } from '../../src/icons/icon-renderer';
import type { RowSelectionEngine } from '../../src/engines/selection/row-selection-engine';

const iconRenderer = {
  renderToString: () => '<svg></svg>',
  render: () => document.createElement('span'),
  updateIcon: () => undefined,
} as unknown as IconRenderer;

const store = { get: () => [] } as unknown as GridStore;
const eventBus = { emit: () => undefined } as unknown as EventBus;
const rowSelectionEngine = { toggleRowSelection: () => undefined } as unknown as RowSelectionEngine;

/** Marker class for the element a "framework view" was mounted into. */
const MOUNT_CLASS = 'test-mounted-view';

function col(colId: string): ColumnDef {
  return { colId, field: colId, header: colId, type: 'string' } as ColumnDef;
}

/** A column whose cells are drawn by a custom renderer, as a wrapper would. */
function customCol(colId: string): ColumnDef {
  return {
    ...col(colId),
    renderer: {
      display: () => {
        const el = document.createElement('span');
        el.className = MOUNT_CLASS;
        el.textContent = 'mounted';
        return el;
      },
    },
  } as unknown as ColumnDef;
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

let centerEl: HTMLElement;
let renderer: BodyRenderer;
let rows: RowNode[];
const allCols = [col('a'), customCol('b'), col('c'), col('d')];

/** Renders a window of the center columns, everything else held constant. */
function render(centerCols: ColumnDef[], colStart = 0): void {
  renderer.renderRows(rows, [], centerCols, [], {
    allLeafColumns: allCols,
    centerColStart: colStart,
    totalCenterCols: allCols.length,
  });
}

/** The row element for `r1`. */
function rowEl(): HTMLElement {
  return centerEl.firstElementChild as HTMLElement;
}

function cellFor(colId: string): HTMLElement | null {
  return rowEl().querySelector<HTMLElement>(`[data-col-id="${colId}"]`);
}

/** Collects `removedNodes` across a batch, the way every wrapper's observer does. */
function watchRemovals(target: HTMLElement): { removed: HTMLElement[]; flush: () => Promise<void> } {
  const removed: HTMLElement[] = [];
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.removedNodes.forEach((node) => {
        if (node instanceof HTMLElement) removed.push(node);
      });
    }
  });
  observer.observe(target, { childList: true, subtree: true });
  return {
    removed,
    flush: async () => {
      // One macrotask: long enough for the observer's microtask to have run.
      await new Promise((resolve) => setTimeout(resolve, 0));
      observer.disconnect();
    },
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  centerEl = document.createElement('div');
  document.body.appendChild(centerEl);
  renderer = new BodyRenderer(store, eventBus, iconRenderer, rowSelectionEngine);
  renderer.setPanels(null, centerEl, null);
  rows = [makeRow('r1', 0), makeRow('r2', 1)];
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('custom-renderer output across a column-window change', () => {
  it('mounts the custom element in the first place', () => {
    render([col('a'), customCol('b'), col('c')]);
    expect(cellFor('b')?.querySelector(`.${MOUNT_CLASS}`)).not.toBeNull();
  });

  it('keeps the very same mounted element when the window shrinks', () => {
    // Widening another column until one no longer fits is the resize case the
    // bug was reported against.
    render([col('a'), customCol('b'), col('c')]);
    const mounted = cellFor('b')!.querySelector(`.${MOUNT_CLASS}`);

    render([col('a'), customCol('b')]);

    // Same node — not a re-render that happens to look the same. A framework
    // view mounted into it is therefore still valid, and must not be destroyed.
    expect(cellFor('b')!.querySelector(`.${MOUNT_CLASS}`)).toBe(mounted);
    expect(mounted!.isConnected).toBe(true);
  });

  it('keeps it when the window slides sideways', () => {
    render([col('a'), customCol('b'), col('c')]);
    const mounted = cellFor('b')!.querySelector(`.${MOUNT_CLASS}`);

    render([customCol('b'), col('c'), col('d')], 1);

    expect(cellFor('b')!.querySelector(`.${MOUNT_CLASS}`)).toBe(mounted);
    expect(mounted!.isConnected).toBe(true);
  });
});

describe('what a wrapper observes', () => {
  it('reports a surviving cell as removed — while it stays connected', async () => {
    render([col('a'), customCol('b'), col('c')]);
    const survivor = cellFor('b')!;

    const watch = watchRemovals(centerEl);
    render([col('a'), customCol('b')]);
    await watch.flush();

    // The move that a naive wrapper mistakes for a teardown…
    expect(watch.removed).toContain(survivor);
    // …and the property that tells it apart.
    expect(survivor.isConnected).toBe(true);
  });

  it('reports a discarded cell as removed and disconnected', async () => {
    render([col('a'), customCol('b'), col('c')]);
    const departing = cellFor('c')!;

    const watch = watchRemovals(centerEl);
    render([col('a'), customCol('b')]);
    await watch.flush();

    expect(watch.removed).toContain(departing);
    expect(departing.isConnected).toBe(false);
  });

  it('destroys exactly the discarded views under the connectivity rule', async () => {
    render([col('a'), customCol('b'), col('c')]);
    // What a wrapper's mount map holds: host element → framework view.
    const mounts = new Map<HTMLElement, string>();
    for (const el of Array.from(rowEl().querySelectorAll<HTMLElement>('[data-col-id]'))) {
      mounts.set(el, el.getAttribute('data-col-id')!);
    }

    const watch = watchRemovals(centerEl);
    render([col('a'), customCol('b')]);
    await watch.flush();

    // `RendererAdapter.cleanupRemovedNode`, reduced to its decision.
    const destroyed: string[] = [];
    for (const node of watch.removed) {
      if (node.isConnected) continue;
      const view = mounts.get(node);
      if (view !== undefined) {
        mounts.delete(node);
        destroyed.push(view);
      }
    }

    // Only the column that actually left the layout.
    expect(destroyed).toEqual(['c']);
    // The custom cell's view is untouched — the bug was that it was not.
    expect([...mounts.values()]).toContain('b');
  });

  it('destroys the views inside a row the core evicts wholesale', async () => {
    render([col('a'), customCol('b'), col('c')]);
    const evictedRow = centerEl.children[1] as HTMLElement;
    const mountedInside = evictedRow.querySelector<HTMLElement>(`.${MOUNT_CLASS}`)!;

    const watch = watchRemovals(centerEl);
    // Second row scrolled out of the render window.
    rows = [rows[0]];
    render([col('a'), customCol('b'), col('c')]);
    await watch.flush();

    expect(watch.removed).toContain(evictedRow);
    expect(evictedRow.isConnected).toBe(false);
    // The wrapper's subtree sweep reaches it through the removed ancestor.
    expect(mountedInside.isConnected).toBe(false);
    expect(evictedRow.contains(mountedInside)).toBe(true);
  });
});
