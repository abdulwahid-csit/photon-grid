import { describe, it, expect } from 'vitest';
import { WorkbookMapper } from '../../src/engines/import/services/workbook-mapper';
import { matrixToWorkbook } from '../../src/engines/import/model/workbook';

describe('WorkbookMapper.mapSheet', () => {
  it('infers columns and typed rows from a header row', () => {
    const wb = matrixToWorkbook(
      [
        ['Name', 'Qty', 'Price'],
        ['Widget', '3', '$1,200'],
        ['Gadget', '5', '$800'],
      ],
      'S',
    );
    const mapped = WorkbookMapper.mapSheet(wb.sheets[0], { hasHeaderRow: true });

    expect(mapped.headers).toEqual(['Name', 'Qty', 'Price']);
    expect(mapped.fields).toEqual(['name', 'qty', 'price']);
    expect(mapped.columns.map((c) => c.type)).toEqual(['string', 'number', 'currency']);
    expect(mapped.rows[0]).toEqual({ name: 'Widget', qty: 3, price: 1200 });
    expect(mapped.rows[1]).toEqual({ name: 'Gadget', qty: 5, price: 800 });
  });

  it('synthesizes headers when hasHeaderRow is false', () => {
    const wb = matrixToWorkbook(
      [
        ['a', '1'],
        ['b', '2'],
      ],
      'S',
    );
    const mapped = WorkbookMapper.mapSheet(wb.sheets[0], { hasHeaderRow: false });
    expect(mapped.headers).toEqual(['Column 1', 'Column 2']);
    expect(mapped.rows).toHaveLength(2);
  });

  it('preserves formula source and flags the column allowFormula', () => {
    const wb = matrixToWorkbook(
      [
        ['A', 'B', 'Total'],
        ['1', '2', '=A1+B1'],
        ['3', '4', '=A2+B2'],
      ],
      'S',
    );
    const mapped = WorkbookMapper.mapSheet(wb.sheets[0], { hasHeaderRow: true });

    expect(mapped.formulaCount).toBe(2);
    expect(mapped.rows[0].total).toBe('=A1+B1');
    const totalCol = mapped.columns.find((c) => c.field === 'total');
    expect(totalCol?.allowFormula).toBe(true);
  });

  it('coerces booleans, dates and blank cells', () => {
    const wb = matrixToWorkbook(
      [
        ['Active', 'When'],
        ['yes', '2024-03-01'],
        ['', ''],
      ],
      'S',
    );
    const mapped = WorkbookMapper.mapSheet(wb.sheets[0], { hasHeaderRow: true });
    expect(mapped.columns[0].type).toBe('boolean');
    expect(mapped.rows[0].active).toBe(true);
    expect(typeof mapped.rows[0].when).toBe('string');
    expect(mapped.rows[1].active).toBeNull();
  });
});
