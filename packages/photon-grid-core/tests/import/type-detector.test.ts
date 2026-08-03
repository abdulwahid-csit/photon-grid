import { describe, it, expect } from 'vitest';
import { TypeDetector } from '../../src/engines/import/services/type-detector';
import { ImportCellType } from '../../src/types/import.types';
import type { WorkbookCell } from '../../src/engines/import/model/workbook';

const cell = (value: WorkbookCell['value'], formula?: string): WorkbookCell =>
  formula ? { value, formula } : { value };

describe('TypeDetector.classifyCell', () => {
  it('classifies primitives and formatted strings', () => {
    expect(TypeDetector.classifyCell(cell(null))).toBe(ImportCellType.Empty);
    expect(TypeDetector.classifyCell(cell(''))).toBe(ImportCellType.Empty);
    expect(TypeDetector.classifyCell(cell(42))).toBe(ImportCellType.Number);
    expect(TypeDetector.classifyCell(cell('1,234.5'))).toBe(ImportCellType.Number);
    expect(TypeDetector.classifyCell(cell('$1,200'))).toBe(ImportCellType.Currency);
    expect(TypeDetector.classifyCell(cell('45%'))).toBe(ImportCellType.Percentage);
    expect(TypeDetector.classifyCell(cell('true'))).toBe(ImportCellType.Boolean);
    expect(TypeDetector.classifyCell(cell('no'))).toBe(ImportCellType.Boolean);
    expect(TypeDetector.classifyCell(cell('a@b.com'))).toBe(ImportCellType.Email);
    expect(TypeDetector.classifyCell(cell('2024-01-15'))).toBe(ImportCellType.Date);
    expect(TypeDetector.classifyCell(cell('hello'))).toBe(ImportCellType.String);
  });

  it('classifies formula cells regardless of value', () => {
    expect(TypeDetector.classifyCell(cell(5, '=A1+B1'))).toBe(ImportCellType.Formula);
  });
});

describe('TypeDetector.detectColumn', () => {
  it('detects a numeric column', () => {
    const r = TypeDetector.detectColumn([cell('1'), cell('2'), cell('3')]);
    expect(r.type).toBe('number');
    expect(r.hasFormula).toBe(false);
  });

  it('detects currency and percentage columns', () => {
    expect(TypeDetector.detectColumn([cell('$1'), cell('$2')]).type).toBe('currency');
    expect(TypeDetector.detectColumn([cell('10%'), cell('20%')]).type).toBe('percentage');
  });

  it('unifies plain numbers with currency to currency', () => {
    expect(TypeDetector.detectColumn([cell('1'), cell('$2')]).type).toBe('currency');
  });

  it('ignores blanks when inferring type', () => {
    expect(TypeDetector.detectColumn([cell('1'), cell(null), cell('2')]).type).toBe('number');
  });

  it('falls back to string on mixed content', () => {
    expect(TypeDetector.detectColumn([cell('1'), cell('abc')]).type).toBe('string');
  });

  it('reports formulas and defaults an all-formula column to number', () => {
    const r = TypeDetector.detectColumn([cell(0, '=A1'), cell(0, '=A2')]);
    expect(r.hasFormula).toBe(true);
    expect(r.type).toBe('number');
  });

  it('detects boolean and date columns', () => {
    expect(TypeDetector.detectColumn([cell('true'), cell('false')]).type).toBe('boolean');
    expect(TypeDetector.detectColumn([cell('2024-01-01'), cell('2024-02-01')]).type).toBe('date');
  });
});
