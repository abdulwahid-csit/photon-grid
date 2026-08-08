// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import { legacySlotStrategy } from '../../src/editing/compat/legacy-editors';
import { GridStore } from '../../src/core/grid-store';
import { EventBus } from '../../src/event-bus/event-bus';
import { GridEventType } from '../../src/types/event.types';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';
import type { ICellEditor, CellEditorParams } from '../../src/editing/types/cell-editor.types';

/**
 * End-to-end behaviour of the editing pipeline: resolve → mount → validate →
 * commit, plus the compatibility guarantees the migration rests on.
 *
 * These drive `EditorManager` directly rather than through `GridCore`, so a
 * failure points at the editing system rather than at grid wiring — but they use
 * the real registry, real resolver, real validation engine and real DOM host, so
 * a break in any of those still surfaces here.
 */

/** Builds a manager wired exactly the way `createEditingServices` wires one. */
function makeManager(overrides: { strategies?: 'with-legacy-slot' } = {}) {
  const eventBus = new EventBus();
  const store = new GridStore(eventBus);
  const registry = new EditorRegistry(createDefaultEditors());
  const adapters = new EditorAdapterRegistry();
  const validation = new ValidationEngine();

  const strategies = createDefaultStrategies();
  if (overrides.strategies === 'with-legacy-slot') {
    const afterEditable = strategies.findIndex((s) => s.name === 'editable');
    strategies.splice(afterEditable + 1, 0, legacySlotStrategy);
  }

  const resolver = new EditorResolver({ registry, adapters }, strategies);
  const host = new EditorHost(new PopupService(), new FocusManager());
  const manager = new EditorManager({
    store,
    eventBus,
    resolver,
    validation,
    host,
    keyboard: new KeyboardManager(),
    getApi: () => null,
  });

  return { manager, eventBus, store, registry, adapters, validation, host };
}

/** A rendered cell, as the grid would have produced it. */
function makeCell(): { cellEl: HTMLElement; innerEl: HTMLElement } {
  const cellEl = document.createElement('div');
  cellEl.className = 'pg-cell';
  const innerEl = document.createElement('div');
  innerEl.className = 'pg-cell__inner';
  innerEl.textContent = 'rendered content';
  cellEl.appendChild(innerEl);
  document.body.appendChild(cellEl);
  return { cellEl, innerEl };
}

function makeRow(data: Record<string, unknown>): RowNode {
  return { nodeId: 'r1', type: 'data', data, rowIndex: 0, top: 0 } as unknown as RowNode;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('EditorManager — session lifecycle', () => {
  const col: ColumnDef = {
    colId: 'name', field: 'name', header: 'Name', type: 'string', editable: true,
  };

  it('resolves, mounts and focuses an editor for an editable cell', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    const row = makeRow({ name: 'Ada' });

    expect(manager.startEdit({ rowNode: row, colDef: col, cellEl, innerEl })).toBe(true);
    expect(manager.isEditing()).toBe(true);
    expect(cellEl.classList.contains('pg-cell--editing')).toBe(true);

    const input = innerEl.querySelector('input');
    expect(input).not.toBeNull();
    expect(input!.value).toBe('Ada');
  });

  /**
   * The spreadsheet opening state. Focus is the grid's job, not each editor's —
   * `select()` on a detached or unfocused control silently does nothing — so
   * this asserts the whole chain: mount put the field in the document, the host
   * focused it, and the editor chose "existing text, selected" because the
   * trigger carried no character of its own.
   */
  it('opens a text editor focused with its existing text selected', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();

    manager.startEdit({ rowNode: makeRow({ name: 'Ada' }), colDef: col, cellEl, innerEl });

    const input = innerEl.querySelector('input')!;
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Ada'.length);
  });

  it('focuses a numeric editor so the first keystroke lands in the field', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    const amount: ColumnDef = {
      colId: 'amount', field: 'amount', header: 'Amount', type: 'number', editable: true,
    };

    manager.startEdit({ rowNode: makeRow({ amount: 42 }), colDef: amount, cellEl, innerEl });

    const input = innerEl.querySelector('input')!;
    expect(input.type).toBe('number');
    expect(document.activeElement).toBe(input);
  });

  /**
   * A session opened by typing must *replace* the value, not extend it: the
   * field opens holding only the typed character, with the caret after it and
   * nothing selected — otherwise the next keystroke would wipe the first.
   */
  it('seeds a typed session with the character and leaves nothing selected', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();

    manager.startEdit({
      rowNode: makeRow({ name: 'Ada' }),
      colDef: col,
      cellEl,
      innerEl,
      trigger: 'type',
      eventKey: 'Z',
    });

    const input = innerEl.querySelector('input')!;
    expect(input.value).toBe('Z');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(1);
  });

  it('refuses a non-editable column and changes nothing', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    const row = makeRow({ name: 'Ada' });

    const readOnly: ColumnDef = { ...col, editable: false };
    expect(manager.startEdit({ rowNode: row, colDef: readOnly, cellEl, innerEl })).toBe(false);
    expect(manager.isEditing()).toBe(false);
    expect(cellEl.classList.contains('pg-cell--editing')).toBe(false);
    expect(innerEl.textContent).toBe('rendered content');
  });

  it('honours a per-row editable predicate', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    const gated: ColumnDef = {
      ...col,
      editable: ({ data }) => (data as { status: string }).status === 'draft',
    };

    expect(
      manager.startEdit({ rowNode: makeRow({ name: 'a', status: 'final' }), colDef: gated, cellEl, innerEl }),
    ).toBe(false);
    expect(
      manager.startEdit({ rowNode: makeRow({ name: 'a', status: 'draft' }), colDef: gated, cellEl, innerEl }),
    ).toBe(true);
  });

  it('commits the edited value onto a fresh data object', () => {
    const { manager, eventBus } = makeManager();
    const { cellEl, innerEl } = makeCell();
    const originalData = { name: 'Ada' };
    const row = makeRow(originalData);

    const changed = vi.fn();
    eventBus.on(GridEventType.CELL_VALUE_CHANGED, changed);

    manager.startEdit({ rowNode: row, colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = 'Grace';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    expect(row.data.name).toBe('Grace');
    // The immutable-update contract: a new reference per committed edit.
    expect(row.data).not.toBe(originalData);
    expect(originalData.name).toBe('Ada');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(manager.isEditing()).toBe(false);
    expect(cellEl.classList.contains('pg-cell--editing')).toBe(false);
  });

  it('restores the original value on cancel and writes nothing', () => {
    const { manager, eventBus } = makeManager();
    const { cellEl, innerEl } = makeCell();
    const row = makeRow({ name: 'Ada' });
    const changed = vi.fn();
    eventBus.on(GridEventType.CELL_VALUE_CHANGED, changed);

    manager.startEdit({ rowNode: row, colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = 'Grace';
    input.dispatchEvent(new Event('input'));
    manager.cancel();

    expect(row.data.name).toBe('Ada');
    expect(changed).not.toHaveBeenCalled();
  });

  it('puts the cell content back after the session ends', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    manager.startEdit({ rowNode: makeRow({ name: 'Ada' }), colDef: col, cellEl, innerEl });
    manager.cancel();
    // The renderer's original nodes are restored, not re-created — which is what
    // keeps an <img> mid-load or a painted <canvas> alive across a cancelled edit.
    expect(innerEl.textContent).toBe('rendered content');
    expect(innerEl.querySelector('input')).toBeNull();
  });

  it('commits the open session when another cell starts editing', () => {
    const { manager } = makeManager();
    const a = makeCell();
    const b = makeCell();
    const row = makeRow({ name: 'Ada', other: 'x' });
    const otherCol: ColumnDef = { ...col, colId: 'other', field: 'other' };

    manager.startEdit({ rowNode: row, colDef: col, cellEl: a.cellEl, innerEl: a.innerEl });
    a.innerEl.querySelector('input')!.value = 'Grace';
    a.innerEl.querySelector('input')!.dispatchEvent(new Event('input'));

    manager.startEdit({ rowNode: row, colDef: otherCol, cellEl: b.cellEl, innerEl: b.innerEl });

    expect(row.data.name).toBe('Grace');
    expect(manager.isCellEditing('r1', 'other')).toBe(true);
  });
});

describe('EditorManager — validation', () => {
  const col: ColumnDef = {
    colId: 'price', field: 'price', header: 'Price', type: 'number', editable: true,
    validation: { required: true, min: 10 },
  };

  it('blocks the commit and keeps the editor open when a rule fails', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    const row = makeRow({ price: 50 });

    manager.startEdit({ rowNode: row, colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    expect(row.data.price).toBe(50);
    expect(manager.isEditing()).toBe(true);
  });

  it('pulses the cell red once rather than leaving a persistent error', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    manager.startEdit({ rowNode: makeRow({ price: 50 }), colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    // Transient: the class drives a one-shot animation and is stripped after it.
    expect(cellEl.classList.contains('pg-cell--invalid-flash')).toBe(true);
    // The old persistent affordances are gone — the reason travels to a toast.
    expect(document.querySelector('.pg-editor-error')).toBeNull();
  });

  it('reports the failure to the configured reporter, for the toast', () => {
    const reported: string[] = [];
    const { manager, host } = makeManager();
    host.setInvalidReporter((r) => reported.push(r.message));

    const { cellEl, innerEl } = makeCell();
    manager.startEdit({ rowNode: makeRow({ price: 50 }), colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    expect(reported).toHaveLength(1);
    expect(reported[0]).toContain('at least 10');
  });

  /**
   * `CELL_EDIT_STOP` is the grid's signal to repaint the edited cell. Emitting
   * it for a failure that *keeps the editor open* repainted the cell out from
   * under the live control, detaching it mid-edit — and the blur that produced
   * ran the whole commit again, for a second toast the user never asked for.
   */
  it('emits no CELL_EDIT_STOP while it holds a rejected value open', () => {
    const { manager, eventBus } = makeManager();
    const stops: unknown[] = [];
    eventBus.on(GridEventType.CELL_EDIT_STOP, (payload: unknown) => stops.push(payload));

    const { cellEl, innerEl } = makeCell();
    manager.startEdit({ rowNode: makeRow({ price: 50 }), colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    // The session has not stopped, so nothing announced that it had …
    expect(stops).toEqual([]);
    expect(manager.isEditing()).toBe(true);
    // … and the editor still owns the cell's DOM.
    expect(innerEl.contains(input)).toBe(true);
  });

  /**
   * The user-visible failure this pair of ordering bugs produced: a cell left
   * rendering its value twice.
   *
   * The repaint listener here is exactly what `GridCore.wireEditing` does on
   * `CELL_EDIT_STOP`. Emitting that event *before* the teardown let the repaint
   * land first and the unmount then append the content it had hidden beside it —
   * two values in one cell.
   */
  it('leaves the cell showing its value once after a rejected Enter then a click away', () => {
    const reported: string[] = [];
    const { manager, eventBus, host } = makeManager();
    host.setInvalidReporter((r) => reported.push(r.message));
    const { cellEl, innerEl } = makeCell();

    eventBus.on(GridEventType.CELL_EDIT_STOP, () => {
      while (innerEl.firstChild) innerEl.removeChild(innerEl.firstChild);
      const span = document.createElement('span');
      span.className = 'pg-cell__value';
      span.textContent = 'repainted';
      innerEl.appendChild(span);
    });

    manager.startEdit({ rowNode: makeRow({ price: 50 }), colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input'));

    manager.commit();           // Enter — rejected, the editor stays open.
    manager.commit('navigate'); // The user clicks another cell.

    expect(manager.isEditing()).toBe(false);
    // One node, not the repaint plus the resurrected original beside it.
    expect(innerEl.childNodes).toHaveLength(1);
    expect(innerEl.textContent).toBe('repainted');
    expect(innerEl.querySelector('input')).toBeNull();
    // One report per attempt — never two for one.
    expect(reported).toHaveLength(2);
  });

  it('marks the editor aria-invalid and announces the failure', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    manager.startEdit({ rowNode: makeRow({ price: 50 }), colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    // `aria-invalid` is the one persistent mark: it is state, and a
    // screen-reader user re-reading the field after the flash and toast have
    // gone must still learn the value is rejected.
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const region = document.querySelector('.pg-editor-live-region');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.textContent).toContain('at least 10');
  });

  it('commits once the value is corrected', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    const row = makeRow({ price: 50 });

    manager.startEdit({ rowNode: row, colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    input.value = '25';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    expect(row.data.price).toBe(25);
    expect(manager.isEditing()).toBe(false);
  });

  it('reverts instead of holding the editor open when configured to', () => {
    const { manager } = makeManager();
    manager.configure({ onInvalid: 'revert' });
    const { cellEl, innerEl } = makeCell();
    const row = makeRow({ price: 50 });

    manager.startEdit({ rowNode: row, colDef: col, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    expect(row.data.price).toBe(50);
    expect(manager.isEditing()).toBe(false);
  });

  it('applies type-implied rules with no configuration', () => {
    const { manager } = makeManager();
    const { cellEl, innerEl } = makeCell();
    const emailCol: ColumnDef = {
      colId: 'email', field: 'email', header: 'Email', type: 'email', editable: true,
    };
    const row = makeRow({ email: 'ada@example.com' });

    manager.startEdit({ rowNode: row, colDef: emailCol, cellEl, innerEl });
    const input = innerEl.querySelector('input')!;
    input.value = 'not-an-email';
    input.dispatchEvent(new Event('input'));
    manager.commit();

    expect(row.data.email).toBe('ada@example.com');
    expect(manager.isEditing()).toBe(true);
  });

  it('validateValue answers the same question without opening an editor', () => {
    const { manager } = makeManager();
    const result = manager.validateValue(makeRow({ price: 1 }), col, 5);
    expect(result).toMatchObject({ valid: false });
  });
});

describe('EditorManager — commitValue (no editor mounted)', () => {
  const boolCol: ColumnDef = {
    colId: 'active', field: 'active', header: 'Active', type: 'boolean', editable: true,
  };

  it('writes through the full pipeline for an in-cell toggle', () => {
    const { manager, eventBus } = makeManager();
    const row = makeRow({ active: false });
    const changed = vi.fn();
    eventBus.on(GridEventType.CELL_VALUE_CHANGED, changed);

    expect(manager.commitValue(row, boolCol, true)).toBe(true);
    expect(row.data.active).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(manager.isEditing()).toBe(false);
  });

  it('refuses a locked column, so a toggle cannot bypass editability', () => {
    const { manager } = makeManager();
    const row = makeRow({ active: false });
    expect(manager.commitValue(row, { ...boolCol, locked: true }, true)).toBe(false);
    expect(row.data.active).toBe(false);
  });

  it('refuses a value that fails validation', () => {
    const { manager } = makeManager();
    const row = makeRow({ qty: 5 });
    const col: ColumnDef = {
      colId: 'qty', field: 'qty', header: 'Qty', type: 'number', editable: true,
      validation: { min: 10 },
    };
    expect(manager.commitValue(row, col, 2)).toBe(false);
    expect(row.data.qty).toBe(5);
  });

  /**
   * A multi-value cell holds an array, and an array is never `Object.is`-equal
   * to the one it was built from. Compared by identity, opening a multi-select
   * and closing it untouched wrote a "new" value, emitted `CELL_VALUE_CHANGED`,
   * flashed the cell and pushed an undo entry — for an edit nobody made.
   */
  it('treats an array of the same values as unchanged', () => {
    const { manager, eventBus } = makeManager();
    const changed = vi.fn();
    eventBus.on(GridEventType.CELL_VALUE_CHANGED, changed);

    const tags: ColumnDef = {
      colId: 'tags', field: 'tags', header: 'Tags', type: 'array', editable: true,
    };
    const row = makeRow({ tags: ['a', 'b'] });

    expect(manager.commitValue(row, tags, ['a', 'b'])).toBe(true);
    expect(changed).not.toHaveBeenCalled();

    // A genuine change still writes — order counts, because the order the user
    // picked options in is the order they are stored.
    expect(manager.commitValue(row, tags, ['b', 'a'])).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(row.data.tags).toEqual(['b', 'a']);
  });
});

describe('EditorManager — custom and registered editors', () => {
  it('uses an editor registered by string key', () => {
    const { manager, registry } = makeManager();

    class ShoutEditor implements ICellEditor<string> {
      private el!: HTMLInputElement;
      init(params: CellEditorParams<string>): void {
        this.el = document.createElement('input');
        this.el.className = 'shout';
        this.el.value = String(params.value ?? '');
      }
      getGui(): HTMLElement { return this.el; }
      getValue(): string { return this.el.value.toUpperCase(); }
    }
    registry.register('shout', ShoutEditor);

    const { cellEl, innerEl } = makeCell();
    const row = makeRow({ name: 'ada' });
    const col: ColumnDef = {
      colId: 'name', field: 'name', header: 'Name', type: 'string',
      editable: true, cellEditor: 'shout',
    };

    manager.startEdit({ rowNode: row, colDef: col, cellEl, innerEl });
    expect(innerEl.querySelector('.shout')).not.toBeNull();
    manager.commit();
    expect(row.data.name).toBe('ADA');
  });

  it('awaits an asynchronous init before mounting', async () => {
    const { manager } = makeManager();
    let resolveInit: () => void = () => {};

    class SlowEditor implements ICellEditor<string> {
      private el!: HTMLInputElement;
      init(): Promise<void> {
        this.el = document.createElement('input');
        this.el.className = 'slow';
        return new Promise<void>((r) => { resolveInit = r; });
      }
      getGui(): HTMLElement { return this.el; }
      getValue(): string { return this.el.value; }
    }

    const { cellEl, innerEl } = makeCell();
    const col: ColumnDef = {
      colId: 'name', field: 'name', header: 'Name', type: 'string',
      editable: true, cellEditor: SlowEditor,
    };

    manager.startEdit({ rowNode: makeRow({ name: 'x' }), colDef: col, cellEl, innerEl });
    expect(innerEl.querySelector('.slow')).toBeNull();
    resolveInit();
    await Promise.resolve();
    expect(innerEl.querySelector('.slow')).not.toBeNull();
  });

  it('honours isCancelBeforeStart', () => {
    const { manager } = makeManager();
    class VetoEditor implements ICellEditor {
      init(): void { /* nothing to prepare */ }
      getGui(): HTMLElement { return document.createElement('div'); }
      getValue(): unknown { return null; }
      isCancelBeforeStart(): boolean { return true; }
    }
    const { cellEl, innerEl } = makeCell();
    const col: ColumnDef = {
      colId: 'name', field: 'name', header: 'Name', type: 'string',
      editable: true, cellEditor: VetoEditor,
    };
    manager.startEdit({ rowNode: makeRow({ name: 'x' }), colDef: col, cellEl, innerEl });
    expect(manager.isEditing()).toBe(false);
    expect(cellEl.classList.contains('pg-cell--editing')).toBe(false);
  });

  it('builds an editor from a registered framework adapter', () => {
    const { manager, adapters } = makeManager();
    const FAKE_COMPONENT = { __framework: 'fake' };

    adapters.register({
      name: 'fake',
      canHandle: (spec) => spec === FAKE_COMPONENT,
      create: () => {
        const el = document.createElement('input');
        el.className = 'from-adapter';
        return {
          init: (p: CellEditorParams) => { el.value = String(p.value ?? ''); },
          getGui: () => el,
          getValue: () => el.value,
        };
      },
    });

    const { cellEl, innerEl } = makeCell();
    const col: ColumnDef = {
      colId: 'name', field: 'name', header: 'Name', type: 'string',
      editable: true, cellEditor: FAKE_COMPONENT,
    };
    manager.startEdit({ rowNode: makeRow({ name: 'Ada' }), colDef: col, cellEl, innerEl });
    expect(innerEl.querySelector('.from-adapter')).not.toBeNull();
  });
});

describe('Backward compatibility', () => {
  it('normalises the legacy required/min/max fields into rules', () => {
    const { manager } = makeManager();
    const legacy: ColumnDef = {
      colId: 'qty', field: 'qty', header: 'Qty', type: 'number', editable: true,
      required: true, min: 10, max: 20,
    };
    expect(manager.validateValue(makeRow({ qty: 15 }), legacy, 5)).toMatchObject({ valid: false });
    expect(manager.validateValue(makeRow({ qty: 15 }), legacy, 25)).toMatchObject({ valid: false });
    expect(manager.validateValue(makeRow({ qty: 15 }), legacy, 15)).toMatchObject({ valid: true });
  });

  it('adapts the legacy validatorFn signature', () => {
    const { manager } = makeManager();
    const legacy: ColumnDef = {
      colId: 'code', field: 'code', header: 'Code', type: 'string', editable: true,
      validatorFn: (v) => (String(v).startsWith('X') ? null : 'Code must start with X'),
    };
    expect(manager.validateValue(makeRow({ code: 'X1' }), legacy, 'X2')).toMatchObject({ valid: true });
    expect(manager.validateValue(makeRow({ code: 'X1' }), legacy, 'Y2')).toMatchObject({
      valid: false,
      message: 'Code must start with X',
    });
  });

  it('keeps a legacy renderer.editor slot at its original priority', () => {
    const { manager } = makeManager({ strategies: 'with-legacy-slot' });
    const { cellEl, innerEl } = makeCell();
    const row = makeRow({ name: 'Ada' });

    const col: ColumnDef = {
      colId: 'name', field: 'name', header: 'Name', type: 'string', editable: true,
      // Set too — the slot must still win, because a column declaring both was
      // written against the old behaviour.
      cellEditor: 'number',
      renderer: {
        editor: (params) => {
          const el = document.createElement('input');
          el.className = 'legacy-slot';
          el.value = String(params.value ?? '');
          el.addEventListener('input', () => params.onValueChange(el.value));
          return el;
        },
      },
    };

    manager.startEdit({ rowNode: row, colDef: col, cellEl, innerEl });
    const el = innerEl.querySelector<HTMLInputElement>('.legacy-slot');
    expect(el).not.toBeNull();

    el!.value = 'Grace';
    el!.dispatchEvent(new Event('input'));
    manager.commit();
    expect(row.data.name).toBe('Grace');
  });
});
