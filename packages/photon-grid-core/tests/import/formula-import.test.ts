import { describe, it, expect } from 'vitest';
import { WorkbookMapper } from '../../src/engines/import/services/workbook-mapper';
import { matrixToWorkbook } from '../../src/engines/import/model/workbook';
import { FormulaEngine } from '../../src/formula/formula-engine';
import { FormulaInitializer } from '../../src/formula/formula-initializer';
import type { FormulaGridAdapter } from '../../src/formula';
import type { ColumnDefInput } from '../../src/types/column.types';

/**
 * A faithful in-memory adapter over imported rows/columns — the same shape
 * `GridFormulaAdapter` provides — so imported formulas can be exercised through
 * the *real* `FormulaInitializer.onLoad` path that `GridApi.setData` uses.
 */
class ImportedGridAdapter implements FormulaGridAdapter {
  constructor(
    private readonly columns: ColumnDefInput[],
    private readonly rows: Record<string, unknown>[],
  ) {}
  getColumnCount(): number {
    return this.columns.length;
  }
  getRowCount(): number {
    return this.rows.length;
  }
  getColIdAt(i: number): string | null {
    return this.columns[i]?.field ?? null;
  }
  getNodeIdAt(i: number): string | null {
    return i >= 0 && i < this.rows.length ? `r${i}` : null;
  }
  getColIndex(colId: string): number {
    return this.columns.findIndex((c) => c.field === colId);
  }
  getRowIndex(nodeId: string): number {
    return Number(nodeId.slice(1));
  }
  getFieldForCol(colId: string): string | null {
    return colId;
  }
  getColIdForField(field: string): string | null {
    return this.columns.some((c) => c.field === field) ? field : null;
  }
  readCell(nodeId: string, colId: string): unknown {
    return this.rows[this.getRowIndex(nodeId)]?.[colId];
  }
  writeCell(nodeId: string, colId: string, value: unknown): void {
    const row = this.rows[this.getRowIndex(nodeId)];
    if (row) row[colId] = value;
  }
  allowsFormula(colId: string): boolean {
    return this.columns.find((c) => c.field === colId)?.allowFormula === true;
  }
}

describe('Formula import → recalculation', () => {
  it('computes imported =A1+B1 formulas through the standard load path', () => {
    // 1. Import a sheet with a formula column.
    const wb = matrixToWorkbook(
      [
        ['A', 'B', 'Total'],
        ['1', '2', '=A1+B1'],
        ['3', '4', '=A2+B2'],
      ],
      'S',
    );
    const mapped = WorkbookMapper.mapSheet(wb.sheets[0], { hasHeaderRow: true });

    // 2. Register through the real initializer (mirrors GridApi.setData).
    const adapter = new ImportedGridAdapter(mapped.columns, mapped.rows);
    const engine = new FormulaEngine(adapter, { enabled: true });
    const initializer = new FormulaInitializer(engine, {
      markFormulaCapable: () => {},
    });
    initializer.onLoad(
      mapped.columns.map((c) => ({ colId: c.field!, field: c.field!, allowFormula: c.allowFormula })),
      mapped.rows.map((data, i) => ({ nodeId: `r${i}`, data })),
    );

    // 3. The formula cells now hold computed values, not the source strings.
    expect(mapped.rows[0].total).toBe(3);
    expect(mapped.rows[1].total).toBe(7);
  });

  it('leaves formulas as literal text when the engine is disabled', () => {
    const wb = matrixToWorkbook(
      [
        ['A', 'B', 'Total'],
        ['1', '2', '=A1+B1'],
      ],
      'S',
    );
    const mapped = WorkbookMapper.mapSheet(wb.sheets[0], { hasHeaderRow: true });
    const adapter = new ImportedGridAdapter(mapped.columns, mapped.rows);
    const engine = new FormulaEngine(adapter, { enabled: false });
    new FormulaInitializer(engine).onLoad(
      mapped.columns.map((c) => ({ colId: c.field!, field: c.field!, allowFormula: c.allowFormula })),
      mapped.rows.map((data, i) => ({ nodeId: `r${i}`, data })),
    );
    expect(mapped.rows[0].total).toBe('=A1+B1');
  });
});
