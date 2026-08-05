import { describe, it, expect, beforeEach } from 'vitest';

import { ColumnModel } from '../../src/core/column-model';
import { GridStore } from '../../src/core/grid-store';
import { EventBus } from '../../src/event-bus/event-bus';
import { GridEventType } from '../../src/types/event.types';

/**
 * Pinning is a **move**, not a flag.
 *
 * `columns` is the grid's logical order, and it is what every order-sensitive
 * consumer walks: `getVisibleColumns()` drives the header's roving keyboard
 * focus, range selection and export column order — none of them read the
 * rendered panels. So a pin that changes where a column *appears* without
 * changing where it *sits* leaves those consumers working from an order the
 * user cannot see.
 *
 * The symptom that produced these tests: pinning a middle column left from the
 * column menu moved it to the far left visually, but Arrow keys in the header
 * still walked the old order and jumped to whatever used to sit beside it.
 * Drag-to-pin (`moveAndPin`) had always reordered; the menu path
 * (`setColumnPin`) had not.
 */

function makeModel(): { model: ColumnModel; bus: EventBus } {
  const bus = new EventBus();
  const model = new ColumnModel(new GridStore(bus), bus);
  // Explicit colIds: the model would otherwise synthesise `col_<field>_<index>`,
  // and the index in that name goes stale the moment a column is reordered.
  model.initColumns([
    { colId: 'a', field: 'a', header: 'A' },
    { colId: 'b', field: 'b', header: 'B' },
    { colId: 'c', field: 'c', header: 'C' },
    { colId: 'd', field: 'd', header: 'D' },
  ]);
  return { model, bus };
}

/** Visible order as plain ids — what `getVisibleColumns()` consumers see. */
function order(model: ColumnModel): string[] {
  return model.getVisibleColumns().map((c) => c.colId);
}

let model: ColumnModel;
let bus: EventBus;

beforeEach(() => {
  ({ model, bus } = makeModel());
});

describe('setColumnPin reorders, so logical order matches the panels', () => {
  it('moves a middle column to the front of the order when pinned left', () => {
    model.setColumnPin('c', 'left');
    expect(order(model)[0]).toBe('c');
  });

  it('moves a middle column to the end of the order when pinned right', () => {
    model.setColumnPin('b', 'right');
    expect(order(model)[order(model).length - 1]).toBe('b');
  });

  it('keeps successively pinned columns in the order they were pinned', () => {
    model.setColumnPin('c', 'left');
    model.setColumnPin('d', 'left');
    // 'd' joins the end of the left block, not the front of the grid.
    expect(order(model).slice(0, 2)).toEqual(['c', 'd']);
  });

  it('leaves the unpinned columns in their relative order', () => {
    model.setColumnPin('c', 'left');
    expect(order(model).filter((id) => id !== 'c')).toEqual(['a', 'b', 'd']);
  });

  it('lands a menu pin in the same place a drag pin would', () => {
    // The two entry points share reorderIntoPanel precisely so they cannot
    // diverge; this is the assertion that would catch them drifting.
    const dragged = makeModel().model;
    dragged.moveAndPin('c', 'left', null);
    model.setColumnPin('c', 'left');
    expect(order(model)).toEqual(order(dragged));
  });

  it('still records the new pin on the column', () => {
    model.setColumnPin('c', 'left');
    expect(model.getColumn('c')?.pinned).toBe('left');
  });

  it('restores a column to the unpinned block when unpinned', () => {
    model.setColumnPin('c', 'left');
    model.setColumnPin('c', null);
    expect(model.getColumn('c')?.pinned).toBeNull();
    // Back among the unpinned columns rather than stranded at the left edge.
    expect(order(model)[0]).toBe('a');
  });

  it('emits COLUMN_PINNED, which the previous implementation also did', () => {
    const seen: unknown[] = [];
    bus.on(GridEventType.COLUMN_PINNED, (e) => seen.push(e));
    model.setColumnPin('c', 'left');
    expect(seen).toHaveLength(1);
  });

  it('is a no-op for an unknown column', () => {
    const before = order(model);
    model.setColumnPin('nope', 'left');
    expect(order(model)).toEqual(before);
  });

  it('leaves a hidden column alone rather than reordering it into view', () => {
    // A hidden column has no position in the visible order to move, so the pin
    // is recorded and the order of everything else is untouched.
    model.setColumnVisible('c', false);
    const before = order(model);
    model.setColumnPin('c', 'left');
    expect(model.getColumn('c')?.pinned).toBe('left');
    expect(order(model)).toEqual(before);
  });
});
