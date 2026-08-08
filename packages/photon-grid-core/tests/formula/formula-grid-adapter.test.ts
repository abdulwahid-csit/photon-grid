// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

import { GridFormulaAdapter } from '../../src/core/formula-grid-adapter-impl';
import { GridStore } from '../../src/core/grid-store';
import { ColumnModel } from '../../src/core/column-model';
import { EventBus } from '../../src/event-bus/event-bus';
import type { RowNode } from '../../src/types/row.types';
import type { ColumnDefInput } from '../../src/types/column.types';

/**
 * What the formula engine sees when it follows an `A1` reference.
 *
 * The engine addresses cells by coordinates and asks the adapter to turn them
 * into values, so this is the seam where "the formula's idea of a cell" and
 * "the cell on screen" can drift apart. They must not: a formula reading a
 * blank over a cell that visibly holds a number is indistinguishable from a
 * broken formula, and no amount of correct evaluation downstream recovers it.
 */

function makeAdapter(
  columns: ColumnDefInput[],
  rows: Record<string, unknown>[],
): GridFormulaAdapter {
  const eventBus = new EventBus();
  const store = new GridStore(eventBus);
  const columnModel = new ColumnModel(store, eventBus);
  columnModel.initColumns(columns);

  const nodes: RowNode[] = rows.map((data, i) => ({
    nodeId: `n${i}`, type: 'data', data, rowIndex: i, top: 0,
  } as unknown as RowNode));
  store.set('allRows', nodes);

  return new GridFormulaAdapter(store, columnModel);
}

/** The colId the model assigned to a field, since ids are generated. */
function colIdFor(adapter: GridFormulaAdapter, index: number): string {
  const colId = adapter.getColIdAt(index);
  if (colId === null) throw new Error(`no column at index ${index}`);
  return colId;
}

describe('GridFormulaAdapter — reading cells', () => {
  it('reads a plain column straight from its field', () => {
    const adapter = makeAdapter(
      [{ field: 'qty', header: 'Qty' }],
      [{ qty: 7 }, { qty: 9 }],
    );

    expect(adapter.readCell('n0', colIdFor(adapter, 0))).toBe(7);
    expect(adapter.readCell('n1', colIdFor(adapter, 0))).toBe(9);
  });

  /**
   * The case a generated sheet depends on: a column whose values are computed
   * on read and never stored. Reading the raw field there yields `undefined`
   * for every cell, so `=A1+B1` would quietly sum blanks over a screen full of
   * numbers.
   */
  it('reads a valueGetter column as the grid displays it', () => {
    const adapter = makeAdapter(
      [
        { field: 'A', header: 'A', valueGetter: ({ data }) => (data['r'] as number) * 10 },
        { field: 'B', header: 'B', valueGetter: ({ data }) => (data['r'] as number) + 1 },
      ],
      [{ r: 1 }, { r: 2 }],
    );

    expect(adapter.readCell('n0', colIdFor(adapter, 0))).toBe(10);
    expect(adapter.readCell('n1', colIdFor(adapter, 0))).toBe(20);
    expect(adapter.readCell('n1', colIdFor(adapter, 1))).toBe(3);
  });

  it('lets a stored value win over the generated one, as an edit must', () => {
    const adapter = makeAdapter(
      [{
        field: 'A',
        header: 'A',
        // The pattern a generated sheet uses: prefer what was typed, fall back
        // to what can be derived.
        valueGetter: ({ data }) => data['A'] ?? (data['r'] as number) * 10,
      }],
      [{ r: 1 }, { r: 2, A: 999 }],
    );

    expect(adapter.readCell('n0', colIdFor(adapter, 0))).toBe(10);
    expect(adapter.readCell('n1', colIdFor(adapter, 0))).toBe(999);
  });

  it('returns undefined for a row or column that does not exist', () => {
    const adapter = makeAdapter([{ field: 'qty', header: 'Qty' }], [{ qty: 7 }]);

    expect(adapter.readCell('nope', colIdFor(adapter, 0))).toBeUndefined();
    expect(adapter.readCell('n0', 'no_such_column')).toBeUndefined();
  });

  it('writes to the field, so a computed column and its store agree', () => {
    const adapter = makeAdapter(
      [{ field: 'A', header: 'A', valueGetter: ({ data }) => data['A'] ?? 0 }],
      [{ }],
    );
    const colId = colIdFor(adapter, 0);

    adapter.writeCell('n0', colId, 42);

    // The engine writes the raw field; the getter must then see it, or a
    // computed cell would keep showing its old value after recalculation.
    expect(adapter.readCell('n0', colId)).toBe(42);
  });
});
