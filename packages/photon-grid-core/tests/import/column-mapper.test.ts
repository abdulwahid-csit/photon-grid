import { describe, it, expect } from 'vitest';
import { ColumnMapper } from '../../src/engines/import/services/column-mapper';
import type { ColumnDef } from '../../src/types/column.types';

const col = (colId: string, field: string, header: string): ColumnDef =>
  ({ colId, field, header, type: 'string' }) as ColumnDef;

describe('ColumnMapper.toFieldName', () => {
  it('camelCases multi-word headers', () => {
    expect(ColumnMapper.toFieldName('Unit Price', 0)).toBe('unitPrice');
    expect(ColumnMapper.toFieldName('First Name', 1)).toBe('firstName');
  });

  it('falls back for blank/symbol/leading-digit headers', () => {
    expect(ColumnMapper.toFieldName('', 0)).toBe('column1');
    expect(ColumnMapper.toFieldName('***', 2)).toBe('column3');
    expect(ColumnMapper.toFieldName('2024', 4)).toBe('column5');
  });
});

describe('ColumnMapper.synthesizeFields', () => {
  it('disambiguates colliding fields', () => {
    expect(ColumnMapper.synthesizeFields(['Total', 'total', 'TOTAL'])).toEqual([
      'total',
      'total2',
      'total3',
    ]);
  });
});

describe('ColumnMapper.autoMap', () => {
  const columns = [col('c1', 'quantity', 'Quantity'), col('c2', 'unitPrice', 'Unit Price')];

  it('matches by normalized header', () => {
    const m = ColumnMapper.autoMap(['Quantity', 'Unit Price'], columns);
    expect(m.headerToField).toEqual({ Quantity: 'quantity', 'Unit Price': 'unitPrice' });
    expect(m.unmapped).toEqual([]);
  });

  it('matches by field when header differs in punctuation/case', () => {
    const m = ColumnMapper.autoMap(['unit_price'], columns);
    expect(m.headerToField['unit_price']).toBe('unitPrice');
  });

  it('reports unmapped headers', () => {
    const m = ColumnMapper.autoMap(['Nope'], columns);
    expect(m.unmapped).toEqual(['Nope']);
  });

  it('honors a remembered override', () => {
    const m = ColumnMapper.autoMap(['Qty'], columns, { Qty: 'quantity' });
    expect(m.headerToField['Qty']).toBe('quantity');
  });
});
