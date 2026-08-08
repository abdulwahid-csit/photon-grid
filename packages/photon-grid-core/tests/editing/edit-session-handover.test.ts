// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { GridCore } from '../../src/core/grid-core';
import type { GridOptions } from '../../src/types/grid.types';

/**
 * Moving an edit from one cell to another, driven the way a user drives it:
 * real mouse events on real cell elements, through the whole grid.
 *
 * The behaviour under test is the spreadsheet one — double-clicking a second
 * cell while a first is open hands the session over: the first commits and
 * closes, the second opens *and stays open*. Every part of that crosses a
 * boundary (`BodyRenderer` → `EditorManager` → `EditorHost` → the repaint
 * `CELL_EDIT_STOP` schedules), which is why it is tested here rather than
 * against the manager alone.
 */

class NoopResizeObserver implements ResizeObserver {
  observe(): void { /* no layout in jsdom to observe */ }
  unobserve(): void { /* no-op */ }
  disconnect(): void { /* no-op */ }
}

(globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
  NoopResizeObserver as unknown as typeof ResizeObserver;

/**
 * jsdom lays nothing out, so every element measures zero and the viewport
 * virtualiser concludes it has room for no rows at all. Fixed dimensions are
 * enough to make it render a window of them.
 */
Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 600 });
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 900 });

const COLUMNS = [
  { field: 'sku', header: 'SKU', editable: true },
  { field: 'name', header: 'Name', editable: true },
];

const ROWS = [
  { sku: 'PG-1002', name: 'Standard' },
  { sku: 'PG-1003', name: 'Standard' },
  { sku: 'PG-1004', name: 'Ships' },
];

let grids: GridCore[] = [];

function mount(options: Partial<GridOptions> = {}): { grid: GridCore; container: HTMLElement } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const grid = new GridCore(container, {
    columns: COLUMNS,
    data: ROWS,
    editing: { mode: 'cell' },
    ...options,
  } as GridOptions);
  grids.push(grid);
  return { grid, container };
}

/** One render pass; the grid paints on an animation frame. */
function flushRender(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** One macrotask, so the deferred focus-out commit gets its turn. */
function flushTasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function cellAt(container: HTMLElement, rowIndex: number, field: string): HTMLElement {
  const rows = container.querySelectorAll<HTMLElement>('.pg-row');
  const cell = rows[rowIndex]?.querySelector<HTMLElement>(`.pg-cell[data-field="${field}"]`);
  if (!cell) throw new Error(`no cell at row ${rowIndex}, column "${field}"`);
  return cell;
}

/**
 * A double-click as the browser delivers one: the full press/release pair twice
 * over, then `dblclick`. jsdom runs no default actions, so the focus a real
 * browser moves to the pressed cell (`.pg-cell` is `tabindex="-1"`) is issued
 * explicitly — without it the editor's focus-out path, which is half of what
 * this test exists to cover, never runs.
 */
function doubleClick(el: HTMLElement): void {
  for (let press = 0; press < 2; press++) {
    singleClick(el);
  }
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
}

/** One press/release pair, with the focus a real browser moves to the cell. */
function singleClick(el: HTMLElement): void {
  // `pointerdown`, because that is the event `BodyRenderer` emits CELL_CLICKED
  // from — a `mousedown` alone reaches nothing. Dispatched as a `MouseEvent`
  // so the helper works on jsdom builds without a `PointerEvent` constructor;
  // the handler reads only `button` and `target`.
  const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
  el.dispatchEvent(down);
  // The browser focuses the pressed cell (`.pg-cell` is `tabindex="-1"`) as the
  // press's *default action* — unless a handler cancelled it. jsdom runs no
  // default actions, so it is modelled here; without it the test cannot see the
  // focus theft that single-click editing has to prevent.
  if (!down.defaultPrevented) el.focus();
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

beforeEach(() => {
  grids = [];
  document.body.innerHTML = '';
});

afterEach(() => {
  for (const grid of grids) grid.destroy();
  grids = [];
  document.body.innerHTML = '';
});

describe('handing an edit session from one cell to the next', () => {
  it('opens the double-clicked cell and leaves it open', async () => {
    const { container } = mount();
    await flushRender();

    const first = cellAt(container, 1, 'sku');
    doubleClick(first);
    expect(first.querySelector('input')).not.toBeNull();

    const second = cellAt(container, 1, 'name');
    doubleClick(second);

    // Settle everything the hand-over schedules: the deferred focus-out commit
    // and the repaint the commit queues.
    await flushTasks();
    await flushRender();
    await flushTasks();

    expect(second.classList.contains('pg-cell--editing')).toBe(true);
    expect(second.querySelector('input')).not.toBeNull();
    expect(first.classList.contains('pg-cell--editing')).toBe(false);
  });

  it('leaves the committed cell rendering its value exactly once', async () => {
    const { container } = mount();
    await flushRender();

    const first = cellAt(container, 1, 'sku');
    doubleClick(first);
    const input = first.querySelector('input')!;
    input.value = 'PG-9999';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    doubleClick(cellAt(container, 1, 'name'));
    await flushTasks();
    await flushRender();
    await flushTasks();

    const inner = first.querySelector<HTMLElement>('.pg-cell__inner')!;
    expect(inner.textContent).toBe('PG-9999');
    expect(inner.childNodes).toHaveLength(1);
  });

  /**
   * The same hand-over, but with the first cell's value actually changed — so
   * the commit fires `CELL_VALUE_CHANGED`, which schedules a full refresh. That
   * repaint lands a frame *after* the second editor has opened, and must not
   * take it down with it.
   */
  it('keeps the second editor open across the repaint the first commit schedules', async () => {
    const { container } = mount();
    await flushRender();

    doubleClick(cellAt(container, 1, 'sku'));
    const input = cellAt(container, 1, 'sku').querySelector('input')!;
    input.value = 'PG-9999';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const second = cellAt(container, 1, 'name');
    doubleClick(second);
    expect(second.querySelector('input')).not.toBeNull();

    await flushTasks();
    await flushRender();
    await flushTasks();

    const stillEditing = cellAt(container, 1, 'name');
    expect(stillEditing.classList.contains('pg-cell--editing')).toBe(true);
    expect(stillEditing.querySelector('input')).not.toBeNull();
    expect(document.activeElement).toBe(stillEditing.querySelector('input'));
  });

  /**
   * A row away rather than a column away: the second cell belongs to a row the
   * commit did not touch, so nothing about it changed — the hand-over still has
   * to leave it open.
   */
  it('hands over to a cell in a different row', async () => {
    const { container } = mount();
    await flushRender();

    doubleClick(cellAt(container, 0, 'sku'));
    const input = cellAt(container, 0, 'sku').querySelector('input')!;
    input.value = 'PG-0001';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    doubleClick(cellAt(container, 2, 'name'));
    await flushTasks();
    await flushRender();
    await flushTasks();

    const second = cellAt(container, 2, 'name');
    expect(second.classList.contains('pg-cell--editing')).toBe(true);
    expect(second.querySelector('input')).not.toBeNull();
  });
});

/**
 * `editing.singleClickEdit: true` — one click opens the editor.
 *
 * The same hand-over questions apply, but the two gestures now collide: the
 * click that opens an editor is also the click that has to close the one before
 * it, and both are handled off the same event.
 */
describe('single-click editing', () => {
  const singleClickOptions = { editing: { mode: 'cell' as const, singleClickEdit: true } };

  it('opens the editor on one click, focused', async () => {
    const { container } = mount(singleClickOptions);
    await flushRender();

    const cell = cellAt(container, 1, 'sku');
    singleClick(cell);
    await flushTasks();

    expect(cell.classList.contains('pg-cell--editing')).toBe(true);
    const input = cell.querySelector('input');
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('opens a numeric editor on one click', async () => {
    const { container } = mount({
      columns: [
        { field: 'sku', header: 'SKU', editable: true },
        { field: 'qty', header: 'Qty', type: 'number' as const, editable: true },
      ],
      data: [{ sku: 'PG-1002', qty: 4 }],
      ...singleClickOptions,
    });
    await flushRender();

    const cell = cellAt(container, 0, 'qty');
    singleClick(cell);
    await flushTasks();

    const input = cell.querySelector('input');
    expect(input?.type).toBe('number');
    expect(document.activeElement).toBe(input);
  });

  it('opens a select editor on one click', async () => {
    const { container } = mount({
      columns: [
        { field: 'sku', header: 'SKU', editable: true },
        {
          field: 'category', header: 'Category', editable: true, cellEditor: 'select',
          dropdownOptions: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
        },
      ],
      data: [{ sku: 'PG-1002', category: 'a' }],
      ...singleClickOptions,
    });
    await flushRender();

    const cell = cellAt(container, 0, 'category');
    singleClick(cell);
    await flushTasks();

    const select = cell.querySelector('select');
    expect(select).not.toBeNull();
    expect(document.activeElement).toBe(select);
  });

  it('moves the session on when a second cell is clicked', async () => {
    const { container } = mount(singleClickOptions);
    await flushRender();

    const first = cellAt(container, 1, 'sku');
    singleClick(first);
    const second = cellAt(container, 1, 'name');
    singleClick(second);
    await flushTasks();
    await flushRender();
    await flushTasks();

    expect(first.classList.contains('pg-cell--editing')).toBe(false);
    expect(second.classList.contains('pg-cell--editing')).toBe(true);
    expect(second.querySelector('input')).not.toBeNull();
  });
});
