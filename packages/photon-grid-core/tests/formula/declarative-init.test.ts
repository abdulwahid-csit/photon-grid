import { describe, it, expect } from 'vitest';
import { FormulaEngine, FormulaInitializer, isFormulaError, FormulaErrorCode } from '../../src/formula';
import type { FormulaError, FormulaColumnInfo } from '../../src/formula';
import { GridStub } from './grid-stub';

const errCode = (v: unknown): FormulaErrorCode | null =>
  isFormulaError(v) ? (v as FormulaError).code : null;

/** Column metadata handed to the initializer (colId + field + formula/opt-in). */
const COLUMNS: FormulaColumnInfo[] = [
  { colId: 'product', field: 'product' },
  { colId: 'quantity', field: 'quantity' },
  { colId: 'unitPrice', field: 'unitPrice' },
  { colId: 'total', field: 'total', allowFormula: true, formula: '=quantity * unitPrice' },
  { colId: 'taxRate', field: 'taxRate' },
  { colId: 'grandTotal', field: 'grandTotal', allowFormula: true, formula: '=total * (1 + taxRate)' },
];

function makeGrid(rows: { nodeId: string; data: Record<string, unknown> }[]) {
  const stub = new GridStub(
    COLUMNS.map((c) => ({ colId: c.colId, field: c.field, allowFormula: c.allowFormula })),
    rows,
  );
  const engine = new FormulaEngine(stub, { enabled: true });
  const init = new FormulaInitializer(engine, { markFormulaCapable: stub.markFormulaCapable });
  return { stub, engine, init };
}

describe('FormulaInitializer — column formulas', () => {
  it('applies a column formula to every row without any API call', () => {
    const { stub, init } = makeGrid([
      { nodeId: 'n0', data: { quantity: 12, unitPrice: 25, taxRate: 0.08 } },
      { nodeId: 'n1', data: { quantity: 3, unitPrice: 5, taxRate: 0.1 } },
    ]);
    init.onLoad(COLUMNS, stub.rows);
    expect(stub.cell('n0', 'total')).toBe(300);
    expect(stub.cell('n1', 'total')).toBe(15);
    expect(stub.cell('n0', 'grandTotal')).toBeCloseTo(324); // 300 * 1.08
    expect(stub.cell('n1', 'grandTotal')).toBeCloseTo(16.5); // 15 * 1.10
  });

  it('recomputes column-formula cells in realtime when a precedent changes', () => {
    const { stub, engine, init } = makeGrid([
      { nodeId: 'n0', data: { quantity: 12, unitPrice: 25, taxRate: 0 } },
    ]);
    init.onLoad(COLUMNS, stub.rows);
    stub.rows[0].data.quantity = 100;
    const changed = engine.onCellsChanged([{ nodeId: 'n0', colId: 'quantity' }]);
    expect(stub.cell('n0', 'total')).toBe(2500);
    expect(changed.changedNodeIds.has('n0')).toBe(true);
  });
});

describe('FormulaInitializer — row-data formulas & precedence', () => {
  it('detects `=`-prefixed row-data values as formulas', () => {
    const { stub, init } = makeGrid([
      { nodeId: 'n0', data: { quantity: 4, unitPrice: 5, taxRate: 0, grandTotal: '=total + 1' } },
    ]);
    init.onLoad(COLUMNS, stub.rows);
    expect(stub.cell('n0', 'total')).toBe(20); // column formula
    expect(stub.cell('n0', 'grandTotal')).toBe(21); // row-data formula overrides column formula
  });

  it('row-data formula overrides the column formula for that row only', () => {
    const { stub, init } = makeGrid([
      { nodeId: 'n0', data: { quantity: 10, unitPrice: 2, taxRate: 0 } },
      { nodeId: 'n1', data: { quantity: 10, unitPrice: 2, taxRate: 0, total: '=quantity * 5' } },
    ]);
    init.onLoad(COLUMNS, stub.rows);
    expect(stub.cell('n0', 'total')).toBe(20); // column: 10 * 2
    expect(stub.cell('n1', 'total')).toBe(50); // row override: 10 * 5
  });

  it('a runtime setFormula overrides whatever was initialized', () => {
    const { stub, engine, init } = makeGrid([
      { nodeId: 'n0', data: { quantity: 10, unitPrice: 2, taxRate: 0 } },
    ]);
    init.onLoad(COLUMNS, stub.rows);
    expect(stub.cell('n0', 'total')).toBe(20);
    engine.setFormula('n0', 'total', '=quantity * 3');
    expect(stub.cell('n0', 'total')).toBe(30);
  });

  it('auto-detects data formulas on a column that did not opt in (default)', () => {
    const stub = new GridStub(
      [
        { colId: 'quantity', field: 'quantity' },
        { colId: 'note', field: 'note' }, // no allowFormula, no column formula
      ],
      [{ nodeId: 'n0', data: { quantity: 7, note: '=quantity + 1' } }],
    );
    const engine = new FormulaEngine(stub, { enabled: true });
    const init = new FormulaInitializer(engine, { markFormulaCapable: stub.markFormulaCapable });
    const columns: FormulaColumnInfo[] = [
      { colId: 'quantity', field: 'quantity' },
      { colId: 'note', field: 'note' },
    ];
    init.onLoad(columns, stub.rows);
    expect(stub.cell('n0', 'note')).toBe(8);
    expect(stub.cols.find((c) => c.colId === 'note')?.allowFormula).toBe(true);
  });

  it('leaves data formulas inert when autoDetectDataFormulas is off', () => {
    const stub = new GridStub(
      [
        { colId: 'quantity', field: 'quantity' },
        { colId: 'note', field: 'note' },
      ],
      [{ nodeId: 'n0', data: { quantity: 7, note: '=quantity + 1' } }],
    );
    const engine = new FormulaEngine(stub, { enabled: true });
    const init = new FormulaInitializer(engine, {
      autoDetectDataFormulas: false,
      markFormulaCapable: stub.markFormulaCapable,
    });
    init.onLoad(
      [
        { colId: 'quantity', field: 'quantity' },
        { colId: 'note', field: 'note' },
      ],
      stub.rows,
    );
    expect(stub.cell('n0', 'note')).toBe('=quantity + 1'); // untouched string
    expect(engine.hasFormula('n0', 'note')).toBe(false);
  });
});

describe('FormulaInitializer — circular references', () => {
  it('flags mutually-referential column formulas as #CIRC!', () => {
    const stub = new GridStub(
      [
        { colId: 'a', field: 'a', allowFormula: true },
        { colId: 'b', field: 'b', allowFormula: true },
      ],
      [{ nodeId: 'n0', data: {} }],
    );
    const engine = new FormulaEngine(stub, { enabled: true });
    const init = new FormulaInitializer(engine, { markFormulaCapable: stub.markFormulaCapable });
    init.onLoad(
      [
        { colId: 'a', field: 'a', allowFormula: true, formula: '=b' },
        { colId: 'b', field: 'b', allowFormula: true, formula: '=a' },
      ],
      stub.rows,
    );
    expect(errCode(stub.cell('n0', 'a'))).toBe(FormulaErrorCode.CIRC);
    expect(errCode(stub.cell('n0', 'b'))).toBe(FormulaErrorCode.CIRC);
  });
});

describe('FormulaInitializer — structural row changes', () => {
  it('new rows inherit the column formula on insertion', () => {
    const { stub, init } = makeGrid([
      { nodeId: 'n0', data: { quantity: 2, unitPrice: 3, taxRate: 0 } },
    ]);
    init.onLoad(COLUMNS, stub.rows);
    stub.addRows([{ nodeId: 'n1', data: { quantity: 4, unitPrice: 10, taxRate: 0 } }]);
    init.onRowsAdded(COLUMNS, [stub.rows[1]]);
    expect(stub.cell('n1', 'total')).toBe(40);
    expect(stub.cell('n1', 'grandTotal')).toBe(40);
  });

  it('purges formulas for removed rows (no orphans)', () => {
    const { stub, engine, init } = makeGrid([
      { nodeId: 'n0', data: { quantity: 2, unitPrice: 3, taxRate: 0 } },
      { nodeId: 'n1', data: { quantity: 4, unitPrice: 5, taxRate: 0 } },
    ]);
    init.onLoad(COLUMNS, stub.rows);
    expect(engine.hasFormula('n1', 'total')).toBe(true);
    stub.removeRows(['n1']);
    init.onRowsRemoved(new Set(['n1']));
    expect(engine.hasFormula('n1', 'total')).toBe(false);
    expect(engine.hasFormula('n0', 'total')).toBe(true); // survivor kept
  });

  it('re-discovers a formula introduced by an in-place row update', () => {
    const { stub, init } = makeGrid([
      { nodeId: 'n0', data: { quantity: 6, unitPrice: 2, taxRate: 0 } },
    ]);
    init.onLoad(COLUMNS, stub.rows);
    // Grand total starts from the column formula; now override it via a data edit.
    stub.rows[0].data.grandTotal = '=total + 100';
    init.onRowDataChanged(COLUMNS, stub.rows[0], ['grandTotal']);
    expect(stub.cell('n0', 'grandTotal')).toBe(112); // total 12 + 100
  });

  it('drops stale formulas on a full reload (data swap)', () => {
    const { stub, engine, init } = makeGrid([
      { nodeId: 'n0', data: { quantity: 2, unitPrice: 3, taxRate: 0 } },
      { nodeId: 'n1', data: { quantity: 4, unitPrice: 5, taxRate: 0 } },
    ]);
    init.onLoad(COLUMNS, stub.rows);
    // Reload with only n0 present.
    stub.removeRows(['n1']);
    init.onLoad(COLUMNS, stub.rows);
    expect(engine.hasFormula('n1', 'total')).toBe(false);
    expect(engine.hasFormula('n0', 'total')).toBe(true);
  });
});
