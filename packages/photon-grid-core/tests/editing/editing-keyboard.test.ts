// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CellSelectionEngine } from '../../src/cell-selection/cell-selection-engine';
import { ClipboardEngine } from '../../src/engines/clipboard/clipboard-engine';
import { GridStore } from '../../src/core/grid-store';
import { EventBus } from '../../src/event-bus/event-bus';

/**
 * While a cell is being edited, the editor owns the keyboard — completely.
 *
 * The selection engine listens on `document`, so without an explicit stand-down
 * it also acts on keys destined for an open editor. It used to rely on the
 * editor calling `stopPropagation` plus a tag-name test for `INPUT`/`TEXTAREA`,
 * which covered a plain text editor and nothing else: a `<select>`, a
 * `<button>`-based switch, a `<div>`-rooted composite editor and every framework
 * component fell straight through to grid navigation.
 *
 * The visible bugs that produced — arrows moving the selection out from under an
 * open dropdown, and Enter both closing the editor and advancing a cell — are
 * what these specs pin shut.
 */

function makeEngine(): { engine: CellSelectionEngine; store: GridStore; container: HTMLElement } {
  const eventBus = new EventBus();
  const store = new GridStore(eventBus);
  const container = document.createElement('div');
  container.className = 'pg-grid';
  document.body.appendChild(container);

  const engine = new CellSelectionEngine(store, eventBus, new ClipboardEngine());
  engine.attach(container);
  return { engine, store, container };
}

/** Dispatches a keydown from `target`, the way a real editor's control would. */
function press(key: string, target: EventTarget): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

let engine: CellSelectionEngine;
let store: GridStore;
let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  ({ engine, store, container } = makeEngine());
  // Navigation bails without a focused cell, rows and columns, so give it all
  // three — otherwise every key looks "ignored" and the specs below would pass
  // for the wrong reason.
  store.set('visibleRows', [
    { nodeId: 'r1', type: 'data', data: {}, rowIndex: 0, top: 0 },
    { nodeId: 'r2', type: 'data', data: {}, rowIndex: 1, top: 40 },
  ] as never);
  store.set('columns', [
    { colId: 'a', field: 'a', header: 'A', type: 'string' },
    { colId: 'b', field: 'b', header: 'B', type: 'string' },
  ] as never);
  // Through the real entry point rather than by writing `activeCell` directly:
  // `startSelection` is also what claims this grid in the page-level active-grid
  // registry, and the keyboard handler ignores a grid that has not claimed it.
  engine.startSelection(0, 0);
});

afterEach(() => {
  engine.detach();
  document.body.innerHTML = '';
});

describe('CellSelectionEngine — keyboard while editing', () => {
  /** Stands in for an editor whose root is not an <input>. */
  function selectEditor(): HTMLSelectElement {
    const select = document.createElement('select');
    container.appendChild(select);
    return select;
  }

  it('acts on arrow keys when nothing is being edited', () => {
    // The baseline the rest of this suite inverts: with no editor open the
    // engine consumes navigation keys, from any target.
    expect(press('ArrowDown', selectEditor())).toBe(true);
  });

  it('stands down entirely once an editor is open', () => {
    engine.setEditingPredicate(() => true);
    const select = selectEditor();

    // Every navigation key, from a target the old tag-name test did not cover.
    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab', 'Home', 'End']) {
      expect(press(key, select)).toBe(false);
    }
  });

  it('stands down for a <button>-rooted editor too', () => {
    engine.setEditingPredicate(() => true);
    const button = document.createElement('button');
    container.appendChild(button);
    expect(press('Enter', button)).toBe(false);
    expect(press('ArrowDown', button)).toBe(false);
  });

  it('stands down for a <div>-rooted composite editor', () => {
    engine.setEditingPredicate(() => true);
    const div = document.createElement('div');
    container.appendChild(div);
    expect(press('ArrowRight', div)).toBe(false);
  });

  it('resumes as soon as the editor closes', () => {
    let editing = true;
    engine.setEditingPredicate(() => editing);
    const select = selectEditor();

    expect(press('ArrowDown', select)).toBe(false);

    editing = false;
    // With no editor open the engine is back in charge; the assertion is simply
    // that the predicate is consulted per event rather than latched.
    const handled = press('ArrowDown', select);
    expect(handled).toBe(true);
  });

  it('treats an unset predicate as "never editing"', () => {
    // A grid with editing switched off never calls `setEditingPredicate`, and
    // must keep full keyboard navigation.
    const select = selectEditor();
    expect(press('ArrowDown', select)).toBe(true);
  });
});
