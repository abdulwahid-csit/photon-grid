import { describe, it, expect } from 'vitest';
import { FormulaEngine, isFormulaError, FormulaErrorCode } from '../../src/formula';
import type { FormulaError } from '../../src/formula';
import { GridStub } from './grid-stub';

/**
 * Columns are laid out so spreadsheet letters line up with fields:
 *   A=product  B=quantity  C=unitPrice  D=total  E=taxRate  F=grandTotal
 * `total` and `grandTotal` opt into formulas.
 */
function makeGrid() {
  const stub = new GridStub(
    [
      { colId: 'product', field: 'product' },
      { colId: 'quantity', field: 'quantity' },
      { colId: 'unitPrice', field: 'unitPrice' },
      { colId: 'total', field: 'total', allowFormula: true },
      { colId: 'taxRate', field: 'taxRate' },
      { colId: 'grandTotal', field: 'grandTotal', allowFormula: true },
    ],
    [
      { nodeId: 'n0', data: { product: 'Mouse', quantity: 12, unitPrice: 25, taxRate: 0.08 } },
      { nodeId: 'n1', data: { product: 'Cable', quantity: 3, unitPrice: 5, taxRate: 0.1 } },
    ],
  );
  const engine = new FormulaEngine(stub, { enabled: true });
  return { stub, engine };
}

const errCode = (v: unknown): FormulaErrorCode | null =>
  isFormulaError(v) ? (v as FormulaError).code : null;

describe('Row-relative references — field-name syntax', () => {
  it('resolves `=quantity * unitPrice` against the formula cell\'s own row', () => {
    const { stub, engine } = makeGrid();
    engine.setFormula('n0', 'total', '=quantity * unitPrice');
    engine.setFormula('n1', 'total', '=quantity * unitPrice');
    expect(stub.cell('n0', 'total')).toBe(300); // 12 * 25
    expect(stub.cell('n1', 'total')).toBe(15); //  3 *  5
  });

  it('chains field-name formulas (grandTotal depends on total)', () => {
    const { stub, engine } = makeGrid();
    engine.setFormula('n0', 'total', '=quantity * unitPrice');
    engine.setFormula('n0', 'grandTotal', '=total * (1 + taxRate)');
    expect(stub.cell('n0', 'grandTotal')).toBeCloseTo(324); // 300 * 1.08
  });

  it('recomputes dependents when a precedent literal changes (realtime)', () => {
    const { stub, engine } = makeGrid();
    engine.setFormula('n0', 'total', '=quantity * unitPrice');
    // Edit quantity, then notify the engine as the grid would on commit.
    stub.rows[0].data.quantity = 100;
    const result = engine.onCellsChanged([{ nodeId: 'n0', colId: 'quantity' }]);
    expect(stub.cell('n0', 'total')).toBe(2500); // 100 * 25
    expect(result.changedNodeIds.has('n0')).toBe(true);
  });

  it('does not cross rows — editing row 0 leaves row 1 untouched', () => {
    const { stub, engine } = makeGrid();
    engine.setFormula('n0', 'total', '=quantity * unitPrice');
    engine.setFormula('n1', 'total', '=quantity * unitPrice');
    stub.rows[0].data.quantity = 1;
    engine.onCellsChanged([{ nodeId: 'n0', colId: 'quantity' }]);
    expect(stub.cell('n0', 'total')).toBe(25);
    expect(stub.cell('n1', 'total')).toBe(15); // unchanged
  });

  it('yields #NAME? for an unknown field/column', () => {
    const { stub, engine } = makeGrid();
    engine.setFormula('n0', 'total', '=quantity * nonsense');
    expect(errCode(stub.cell('n0', 'total'))).toBe(FormulaErrorCode.NAME);
  });
});

describe('Row-relative references — spreadsheet column-letter syntax', () => {
  it('resolves `=B * C` to the current row\'s columns B and C', () => {
    const { stub, engine } = makeGrid();
    engine.setFormula('n0', 'total', '=B * C'); // quantity * unitPrice
    engine.setFormula('n1', 'total', '=B * C');
    expect(stub.cell('n0', 'total')).toBe(300);
    expect(stub.cell('n1', 'total')).toBe(15);
  });

  it('normalizes both syntaxes to the same dependency (field-name and letter agree)', () => {
    const { stub, engine } = makeGrid();
    engine.setFormula('n0', 'total', '=B * C');
    stub.rows[0].data.quantity = 2;
    engine.onCellsChanged([{ nodeId: 'n0', colId: 'quantity' }]); // B changed
    expect(stub.cell('n0', 'total')).toBe(50); // 2 * 25 — letter ref tracked B as a precedent
  });
});

describe('Row-relative references — precedence & limitations', () => {
  it('a named range wins over a same-named field (backward compatible)', () => {
    const { stub, engine } = makeGrid();
    stub.rows[0].data.product = 'X';
    // Point a named range "quantity" at A1 (=product of row 0). It must win.
    engine.setNamedRange('quantity', 'A1');
    engine.setFormula('n0', 'total', '=quantity');
    expect(stub.cell('n0', 'total')).toBe('X'); // A1's product, not the quantity field (12)
  });

  it('a field whose name is A1-shaped (e.g. `q1`) is read as an absolute ref, not a field', () => {
    const stub = new GridStub(
      [
        { colId: 'q1', field: 'q1' },
        { colId: 'out', field: 'out', allowFormula: true },
      ],
      [{ nodeId: 'n0', data: { q1: 42 } }],
    );
    const engine = new FormulaEngine(stub, { enabled: true });
    engine.setFormula('n0', 'out', '=q1');
    // `q1` tokenizes as column Q (index 16), row 1 → out of bounds → #REF!, NOT 42.
    expect(errCode(stub.cell('n0', 'out'))).toBe(FormulaErrorCode.REF);
  });

  it('mixes absolute A1 refs with row-relative field refs', () => {
    const { stub, engine } = makeGrid();
    // A1 = product (string) of row 0; quantity is row-relative.
    engine.setFormula('n0', 'total', '=quantity + B2'); // B2 = quantity of row 1 (3)
    expect(stub.cell('n0', 'total')).toBe(15); // 12 + 3
  });
});
