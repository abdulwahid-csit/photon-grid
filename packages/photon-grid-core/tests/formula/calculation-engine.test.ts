import { describe, it, expect } from 'vitest';
import { FormulaEngine, isFormulaError, FormulaErrorCode } from '../../src/formula';
import type { FormulaGridAdapter, FormulaClock } from '../../src/formula';

/**
 * In-memory grid adapter for engine tests. Cells live in a dense 2-D array;
 * stable identities are `r{row}` / `c{col}`, and every column allows formulas.
 * `writeCell` invocations are counted so tests can assert dirty-set minimality.
 */
class TestAdapter implements FormulaGridAdapter {
  readonly cells: unknown[][];
  writes = 0;

  constructor(rows: number, cols: number) {
    this.cells = Array.from({ length: rows }, () => new Array<unknown>(cols).fill(null));
  }

  getColumnCount(): number {
    return this.cells[0]?.length ?? 0;
  }
  getRowCount(): number {
    return this.cells.length;
  }
  getColIdAt(colIndex: number): string | null {
    return colIndex >= 0 && colIndex < this.getColumnCount() ? `c${colIndex}` : null;
  }
  getNodeIdAt(rowIndex: number): string | null {
    return rowIndex >= 0 && rowIndex < this.getRowCount() ? `r${rowIndex}` : null;
  }
  getColIndex(colId: string): number {
    return colId.startsWith('c') ? Number(colId.slice(1)) : -1;
  }
  getRowIndex(nodeId: string): number {
    return nodeId.startsWith('r') ? Number(nodeId.slice(1)) : -1;
  }
  getFieldForCol(colId: string): string | null {
    return colId;
  }
  getColIdForField(field: string): string | null {
    const idx = this.getColIndex(field);
    return idx >= 0 && idx < this.getColumnCount() ? field : null;
  }
  readCell(nodeId: string, colId: string): unknown {
    return this.cells[this.getRowIndex(nodeId)]?.[this.getColIndex(colId)] ?? null;
  }
  writeCell(nodeId: string, colId: string, value: unknown): void {
    this.writes++;
    this.cells[this.getRowIndex(nodeId)][this.getColIndex(colId)] = value;
  }
  allowsFormula(): boolean {
    return true;
  }

  /** Test helper: read a value by 0-based row/col. */
  at(row: number, col: number): unknown {
    return this.cells[row][col];
  }
  /** Test helper: set a literal value by 0-based row/col. */
  setLiteral(row: number, col: number, value: unknown): void {
    this.cells[row][col] = value;
  }
}

const FIXED_CLOCK: FormulaClock = { now: () => Date.UTC(2021, 0, 1), random: () => 0.5 };

/** Builds an enabled engine over a fresh adapter. */
function makeEngine(rows = 5, cols = 5) {
  const adapter = new TestAdapter(rows, cols);
  const engine = new FormulaEngine(adapter, { enabled: true }, FIXED_CLOCK);
  return { adapter, engine };
}

describe('CalculationEngine — basic evaluation', () => {
  it('computes a formula and writes the value back to the grid', () => {
    const { adapter, engine } = makeEngine();
    adapter.setLiteral(0, 0, 1); // A1
    adapter.setLiteral(0, 1, 2); // B1
    engine.setFormula('r0', 'c2', '=A1+B1'); // C1
    expect(adapter.at(0, 2)).toBe(3);
  });

  it('stores a parse error as #ERROR!', () => {
    const { adapter, engine } = makeEngine();
    engine.setFormula('r0', 'c0', '=1+');
    expect(isFormulaError(adapter.at(0, 0))).toBe(true);
  });

  it('is a no-op when the engine is disabled', () => {
    const adapter = new TestAdapter(3, 3);
    const engine = new FormulaEngine(adapter, { enabled: false }, FIXED_CLOCK);
    engine.setFormula('r0', 'c0', '=1+1');
    expect(adapter.at(0, 0)).toBeNull();
  });
});

describe('CalculationEngine — incremental recalculation', () => {
  it('recomputes dependents when a precedent literal changes', () => {
    const { adapter, engine } = makeEngine();
    adapter.setLiteral(0, 0, 10); // A1
    engine.setFormula('r0', 'c1', '=A1*2'); // B1 = 20
    expect(adapter.at(0, 1)).toBe(20);

    adapter.setLiteral(0, 0, 100);
    const result = engine.onCellsChanged([{ nodeId: 'r0', colId: 'c0' }]);
    expect(adapter.at(0, 1)).toBe(200);
    expect(result.changedNodeIds.has('r0')).toBe(true);
  });

  it('propagates through a multi-level chain in dependency order', () => {
    const { adapter, engine } = makeEngine();
    adapter.setLiteral(0, 0, 5); // A1
    engine.setFormula('r1', 'c0', '=A1*2'); // A2 = 10
    engine.setFormula('r2', 'c0', '=A2+1'); // A3 = 11
    expect(adapter.at(2, 0)).toBe(11);

    adapter.setLiteral(0, 0, 20);
    engine.onCellsChanged([{ nodeId: 'r0', colId: 'c0' }]);
    expect(adapter.at(1, 0)).toBe(40); // A2
    expect(adapter.at(2, 0)).toBe(41); // A3
  });

  it('only recomputes the affected subgraph', () => {
    const { adapter, engine } = makeEngine();
    adapter.setLiteral(0, 0, 1); // A1
    adapter.setLiteral(1, 0, 100); // A2 (unrelated)
    engine.setFormula('r0', 'c1', '=A1+1'); // B1 depends on A1
    engine.setFormula('r1', 'c1', '=A2+1'); // B2 depends on A2

    adapter.writes = 0;
    adapter.setLiteral(0, 0, 2);
    engine.onCellsChanged([{ nodeId: 'r0', colId: 'c0' }]);
    // Only B1 should be rewritten, not B2.
    expect(adapter.writes).toBe(1);
    expect(adapter.at(0, 1)).toBe(3);
  });
});

describe('CalculationEngine — ranges', () => {
  it('depends on every cell of a bounded range', () => {
    const { adapter, engine } = makeEngine();
    adapter.setLiteral(0, 0, 1);
    adapter.setLiteral(1, 0, 2);
    adapter.setLiteral(2, 0, 3);
    engine.setFormula('r0', 'c1', '=SUM(A1:A3)'); // B1 = 6
    expect(adapter.at(0, 1)).toBe(6);

    adapter.setLiteral(1, 0, 20);
    engine.onCellsChanged([{ nodeId: 'r1', colId: 'c0' }]);
    expect(adapter.at(0, 1)).toBe(24);
  });

  it('tracks whole-column ranges without expanding them', () => {
    const { adapter, engine } = makeEngine();
    adapter.setLiteral(0, 0, 5);
    adapter.setLiteral(3, 0, 7);
    engine.setFormula('r0', 'c1', '=SUM(A:A)'); // B1 = 12
    expect(adapter.at(0, 1)).toBe(12);

    adapter.setLiteral(4, 0, 100);
    engine.onCellsChanged([{ nodeId: 'r4', colId: 'c0' }]);
    expect(adapter.at(0, 1)).toBe(112);
  });
});

describe('CalculationEngine — circular references', () => {
  it('flags a direct cycle as #CIRC! instead of looping', () => {
    const { adapter, engine } = makeEngine();
    engine.setFormula('r0', 'c0', '=B1'); // A1 = B1
    engine.setFormula('r0', 'c1', '=A1'); // B1 = A1 → cycle
    const a1 = adapter.at(0, 0);
    const b1 = adapter.at(0, 1);
    expect(isFormulaError(b1) && (b1 as import('../../src/formula').FormulaError).code).toBe(FormulaErrorCode.CIRC);
    expect(isFormulaError(a1)).toBe(true);
  });

  it('flags a self-reference as #CIRC!', () => {
    const { adapter, engine } = makeEngine();
    engine.setFormula('r0', 'c0', '=A1+1');
    const a1 = adapter.at(0, 0);
    expect(isFormulaError(a1) && (a1 as import('../../src/formula').FormulaError).code).toBe(FormulaErrorCode.CIRC);
  });
});

describe('CalculationEngine — clear & volatile', () => {
  it('clearing a formula leaves its value and recomputes dependents', () => {
    const { adapter, engine } = makeEngine();
    adapter.setLiteral(0, 0, 4); // A1
    engine.setFormula('r0', 'c1', '=A1*2'); // B1 = 8
    engine.setFormula('r0', 'c2', '=B1+1'); // C1 = 9
    expect(adapter.at(0, 2)).toBe(9);

    const removed = engine.clearFormula('r0', 'c1'); // B1 keeps 8
    expect(removed).toBe(true);
    expect(adapter.at(0, 1)).toBe(8);
    // Change A1: B1 is no longer a formula, so C1 stays 9 (reads retained B1=8).
    adapter.setLiteral(0, 0, 40);
    engine.onCellsChanged([{ nodeId: 'r0', colId: 'c0' }]);
    expect(adapter.at(0, 2)).toBe(9);
  });

  it('recomputes volatile cells on recalculate', () => {
    const { adapter, engine } = makeEngine();
    engine.setFormula('r0', 'c0', '=RANDBETWEEN(1,10)'); // 6 with rand 0.5
    expect(adapter.at(0, 0)).toBe(6);
    // A volatile cell is always part of a recalc pass.
    adapter.setLiteral(0, 0, 999);
    engine.recalculate(false);
    expect(adapter.at(0, 0)).toBe(6);
  });
});

describe('CalculationEngine — state serialization', () => {
  it('round-trips formulas through get/set state', () => {
    const { adapter, engine } = makeEngine();
    adapter.setLiteral(0, 0, 3);
    engine.setFormula('r0', 'c1', '=A1*A1'); // B1 = 9
    const state = engine.getState();
    expect(state.cells).toHaveLength(1);

    const { adapter: a2, engine: e2 } = makeEngine();
    a2.setLiteral(0, 0, 3);
    e2.setState(state);
    expect(a2.at(0, 1)).toBe(9);
  });
});
