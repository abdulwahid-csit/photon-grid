import { describe, it, expect } from 'vitest';
import { FormulaEngine } from '../../src/formula';
import type { FormulaGridAdapter, FormulaClock } from '../../src/formula';

/**
 * Performance benchmarks. Thresholds are deliberately generous (correctness at
 * scale + rough timing), not micro-benchmarks — they guard against accidental
 * O(n) regressions in what must be O(dirty) operations. Timings are logged for
 * visibility.
 */

class BenchAdapter implements FormulaGridAdapter {
  readonly cells: unknown[][];
  writes = 0;
  constructor(rows: number, cols: number) {
    this.cells = Array.from({ length: rows }, () => new Array<unknown>(cols).fill(null));
  }
  getColumnCount(): number { return this.cells[0]?.length ?? 0; }
  getRowCount(): number { return this.cells.length; }
  getColIdAt(c: number): string | null { return c >= 0 && c < this.getColumnCount() ? `c${c}` : null; }
  getNodeIdAt(r: number): string | null { return r >= 0 && r < this.getRowCount() ? `r${r}` : null; }
  getColIndex(colId: string): number { return colId.startsWith('c') ? Number(colId.slice(1)) : -1; }
  getRowIndex(nodeId: string): number { return nodeId.startsWith('r') ? Number(nodeId.slice(1)) : -1; }
  getFieldForCol(colId: string): string | null { return colId; }
  readCell(nodeId: string, colId: string): unknown {
    return this.cells[this.getRowIndex(nodeId)]?.[this.getColIndex(colId)] ?? null;
  }
  writeCell(nodeId: string, colId: string, value: unknown): void {
    this.writes++;
    this.cells[this.getRowIndex(nodeId)][this.getColIndex(colId)] = value;
  }
  allowsFormula(): boolean { return true; }
}

const CLOCK: FormulaClock = { now: () => 0, random: () => 0 };

describe('Formula engine — performance', () => {
  it('recomputes only the affected cell among 50,000 independent formulas', () => {
    const N = 50_000;
    const adapter = new BenchAdapter(N, 2);
    const engine = new FormulaEngine(adapter, { enabled: true }, CLOCK);

    for (let r = 0; r < N; r++) adapter.cells[r][0] = r; // A{r} literal
    const t0 = performance.now();
    for (let r = 0; r < N; r++) engine.setFormula(`r${r}`, 'c1', '=A' + (r + 1) + '*2'); // B{r} = A{r}*2
    const buildMs = performance.now() - t0;

    expect(adapter.cells[12345][1]).toBe(24690);

    // Change one literal → exactly one formula must recompute.
    adapter.cells[9999][0] = 1000;
    adapter.writes = 0;
    const t1 = performance.now();
    const result = engine.onCellsChanged([{ nodeId: 'r9999', colId: 'c0' }]);
    const recalcMs = performance.now() - t1;

    expect(result.changedNodeIds.size).toBe(1);
    expect(adapter.writes).toBe(1);
    expect(adapter.cells[9999][1]).toBe(2000);
    // A single-cell recompute must be effectively instant regardless of N.
    expect(recalcMs).toBeLessThan(20);

    // eslint-disable-next-line no-console
    console.log(`[bench] build ${N} formulas: ${buildMs.toFixed(0)}ms | 1-cell recalc: ${recalcMs.toFixed(3)}ms`);
  });

  it('propagates a change through a 5,000-deep dependency chain', () => {
    const N = 5_000;
    const adapter = new BenchAdapter(N, 1);
    const engine = new FormulaEngine(adapter, { enabled: true }, CLOCK);

    adapter.cells[0][0] = 1; // A1 literal seed
    // A2 = A1+1, A3 = A2+1, … each depends on the one above.
    for (let r = 1; r < N; r++) engine.setFormula(`r${r}`, 'c0', '=A' + r + '+1');
    expect(adapter.cells[N - 1][0]).toBe(N); // A{N} = 1 + (N-1) steps = N

    adapter.cells[0][0] = 1001;
    const t0 = performance.now();
    const result = engine.onCellsChanged([{ nodeId: 'r0', colId: 'c0' }]);
    const ms = performance.now() - t0;

    expect(adapter.cells[N - 1][0]).toBe(1001 + (N - 1));
    expect(result.changedNodeIds.size).toBe(N - 1); // every downstream cell changed

    // eslint-disable-next-line no-console
    console.log(`[bench] ${N}-deep chain propagation: ${ms.toFixed(1)}ms`);
  });

  it('benefits from the AST cache when filling an identical formula down', () => {
    const N = 20_000;
    const adapter = new BenchAdapter(N, 2);
    const engine = new FormulaEngine(adapter, { enabled: true }, CLOCK);
    for (let r = 0; r < N; r++) adapter.cells[r][0] = r;

    // Same source string on every row → after the first compile, all are cache hits.
    const t0 = performance.now();
    for (let r = 0; r < N; r++) engine.setFormula(`r${r}`, 'c1', '=A1*2');
    const ms = performance.now() - t0;

    // eslint-disable-next-line no-console
    console.log(`[bench] ${N} identical-source formulas (cached): ${ms.toFixed(0)}ms`);
    expect(adapter.cells[0][1]).toBe(0); // A1 = 0 → *2 = 0
  });
});
