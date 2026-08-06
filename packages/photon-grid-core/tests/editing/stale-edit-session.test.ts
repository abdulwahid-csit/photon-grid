// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { EditorManager } from '../../src/editing/session/editor-manager';
import { EditorRegistry } from '../../src/editing/registry/editor-registry';
import { EditorAdapterRegistry } from '../../src/editing/registry/editor-adapter-registry';
import {
  EditorResolver,
  createDefaultStrategies,
} from '../../src/editing/registry/default-editor-resolver';
import { ValidationEngine } from '../../src/editing/validation/validation-engine';
import { EditorHost } from '../../src/editing/services/editor-host';
import { FocusManager } from '../../src/editing/services/focus-manager';
import { KeyboardManager } from '../../src/editing/services/keyboard-manager';
import { PopupService } from '../../src/editing/services/popup-service';
import { createDefaultEditors } from '../../src/editing/editors';
import { GridStore } from '../../src/core/grid-store';
import { EventBus } from '../../src/event-bus/event-bus';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';

/**
 * Reproduction: leaving a cell whose value is still being validated.
 *
 * `commit()` closes the session synchronously only when every rule answers
 * synchronously. A column carrying an async rule — a server-side uniqueness
 * check, the case the editing showcase demonstrates — leaves the session open
 * while the promise settles, and every caller that treats `commit()` as "the
 * editor is now closed" is wrong for the duration.
 *
 * That window is user-visible: the cell keeps `pg-cell--editing` while the cell
 * the user just clicked takes the active-cell border, so two cells are outlined
 * at once. Start a second edit inside the window and the first session is
 * orphaned outright — its editor is never unmounted, its class never removed and
 * its listeners never released.
 */

const EDITING_CLASS = 'pg-cell--editing';

function makeManager() {
  const eventBus = new EventBus();
  const store = new GridStore(eventBus);
  const manager = new EditorManager({
    store,
    eventBus,
    resolver: new EditorResolver(
      { registry: new EditorRegistry(createDefaultEditors()), adapters: new EditorAdapterRegistry() },
      createDefaultStrategies(),
    ),
    validation: new ValidationEngine(),
    host: new EditorHost(new PopupService(), new FocusManager()),
    keyboard: new KeyboardManager(),
    getApi: () => null,
  });
  return { manager, store };
}

function makeCell(): HTMLElement {
  const cellEl = document.createElement('div');
  cellEl.className = 'pg-cell';
  const innerEl = document.createElement('div');
  innerEl.className = 'pg-cell__inner';
  cellEl.appendChild(innerEl);
  document.body.appendChild(cellEl);
  return cellEl;
}

function makeRow(nodeId: string, data: Record<string, unknown>): RowNode {
  return { nodeId, type: 'data', data, rowIndex: 0, top: 0 } as unknown as RowNode;
}

/** A column whose value is checked by a server-style asynchronous rule. */
const ASYNC_COL: ColumnDef = {
  colId: 'sku',
  field: 'sku',
  header: 'SKU',
  type: 'string',
  editable: true,
  validation: {
    validateAsync: async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { valid: true };
    },
  },
} as unknown as ColumnDef;

/** An ordinary synchronously-validated column. */
const PLAIN_COL: ColumnDef = {
  colId: 'name', field: 'name', header: 'Name', type: 'string', editable: true,
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('leaving a cell mid-async-validation', () => {
  it('closes the editor without waiting for the server round trip', async () => {
    const { manager } = makeManager();
    const cellEl = makeCell();
    const row = makeRow('r1', { sku: 'PG-1000' });

    manager.startEdit({ rowNode: row, colDef: ASYNC_COL, cellEl, trigger: 'key' });
    expect(cellEl.classList.contains(EDITING_CLASS)).toBe(true);

    // The user clicks another cell. GridCore's CELL_CLICKED handler calls this.
    manager.commit('navigate');

    // The cell the user has visibly left must not still be wearing the editing
    // border while an HTTP request completes.
    expect(manager.isEditing()).toBe(false);
    expect(cellEl.classList.contains(EDITING_CLASS)).toBe(false);
  });

  it('still waits for the verdict when the user pressed Enter', async () => {
    // 'explicit' means "finish here": the user has not gone anywhere, so
    // holding the editor open until the rule answers is the right behaviour.
    const { manager } = makeManager();
    const cellEl = makeCell();

    manager.startEdit({
      rowNode: makeRow('r1', { sku: 'PG-1000' }), colDef: ASYNC_COL, cellEl, trigger: 'key',
    });
    manager.commit();

    expect(manager.isEditing()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(manager.isEditing()).toBe(false);
  });

  it('writes a value that passes after the editor has already closed', async () => {
    const { manager } = makeManager();
    const cellEl = makeCell();
    const row = makeRow('r1', { sku: 'PG-1000' });

    manager.startEdit({ rowNode: row, colDef: ASYNC_COL, cellEl, trigger: 'key' });
    const input = cellEl.querySelector('input')!;
    input.value = 'PG-2000';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    manager.commit('navigate');
    // Not written yet — the rule has not answered.
    expect(row.data['sku']).toBe('PG-1000');

    await new Promise((resolve) => setTimeout(resolve, 40));
    // The user's edit is not lost just because they moved on.
    expect(row.data['sku']).toBe('PG-2000');
  });

  it('does not orphan the first session when a second edit starts inside the window', async () => {
    const { manager, store } = makeManager();
    const first = makeCell();
    const second = makeCell();

    manager.startEdit({
      rowNode: makeRow('r1', { sku: 'PG-1000' }), colDef: ASYNC_COL, cellEl: first, trigger: 'key',
    });
    expect(first.classList.contains(EDITING_CLASS)).toBe(true);

    // Double-clicking another cell while the first is still validating.
    manager.startEdit({
      rowNode: makeRow('r2', { name: 'Widget' }), colDef: PLAIN_COL, cellEl: second, trigger: 'click',
    });

    // Exactly one cell may be in the editing state at a time.
    expect(first.classList.contains(EDITING_CLASS)).toBe(false);
    expect(second.classList.contains(EDITING_CLASS)).toBe(true);
    expect(document.querySelectorAll(`.${EDITING_CLASS}`).length).toBe(1);

    // The abandoned editor's DOM must be gone from the first cell.
    expect(first.querySelector('.pg-editor-root')).toBeNull();

    // And the store must describe the session that is actually open.
    expect(store.get('editingCellId')).toBe('r2__name');

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(document.querySelectorAll(`.${EDITING_CLASS}`).length).toBe(1);
  });
});

/** A column that rejects everything, synchronously. */
const INVALID_COL: ColumnDef = {
  colId: 'qty',
  field: 'qty',
  header: 'Qty',
  type: 'number',
  editable: true,
  validation: { min: 100 },
} as unknown as ColumnDef;

describe('leaving a cell whose value is invalid', () => {
  it('closes and reverts under keep-open, rather than stranding the grid', async () => {
    const { manager, store } = makeManager();
    const cellEl = makeCell();
    const row = makeRow('r1', { qty: 500 });

    manager.configure({ onInvalid: 'keep-open' });
    manager.startEdit({ rowNode: row, colDef: INVALID_COL, cellEl, trigger: 'key' });

    const input = cellEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    manager.commit('navigate');

    expect(manager.isEditing()).toBe(false);
    expect(cellEl.classList.contains(EDITING_CLASS)).toBe(false);
    expect(store.get('editingCellId')).toBeNull();
    // Reverted: the rejected value never reaches the row.
    expect(row.data['qty']).toBe(500);
  });

  it('still holds the editor open under keep-open when the user pressed Enter', () => {
    // The distinction the fix rests on: Enter means the user is still on the
    // cell and wants to correct it in place.
    const { manager } = makeManager();
    const cellEl = makeCell();

    manager.configure({ onInvalid: 'keep-open' });
    manager.startEdit({
      rowNode: makeRow('r1', { qty: 500 }), colDef: INVALID_COL, cellEl, trigger: 'key',
    });

    const input = cellEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    manager.commit();

    expect(manager.isEditing()).toBe(true);
    expect(cellEl.classList.contains(EDITING_CLASS)).toBe(true);
  });

  it('still writes under accept, whichever way the user left', () => {
    const { manager } = makeManager();
    const cellEl = makeCell();
    const row = makeRow('r1', { qty: 500 });

    manager.configure({ onInvalid: 'accept' });
    manager.startEdit({ rowNode: row, colDef: INVALID_COL, cellEl, trigger: 'key' });

    const input = cellEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    manager.commit('navigate');

    expect(manager.isEditing()).toBe(false);
    expect(row.data['qty']).toBe(5);
  });
});
