import { describe, it, expect } from 'vitest';
import { SheetJsWorkbookParser } from '../../src/engines/import/adapters/sheetjs-workbook-parser';

/**
 * The adapter is validated against a fake SheetJS module so the suite runs
 * without the optional `xlsx` peer dependency installed. It exercises the
 * conversion logic — range walking, value mapping and formula preservation.
 */

const decode = (a1: string): { r: number; c: number } => {
  const m = /^([A-Z]+)(\d+)$/.exec(a1)!;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { r: Number(m[2]) - 1, c: col - 1 };
};

const fakeXlsx = {
  read: () => ({
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {
        '!ref': 'A1:C2',
        A1: { v: 'Name', t: 's' },
        B1: { v: 'Qty', t: 's' },
        C1: { v: 'Total', t: 's' },
        A2: { v: 'Widget', t: 's' },
        B2: { v: 3, t: 'n' },
        C2: { v: 6, t: 'n', f: 'B2*2' },
      },
    },
  }),
  utils: {
    decode_range: (ref: string) => {
      const [s, e] = ref.split(':');
      return { s: decode(s), e: decode(e) };
    },
    encode_cell: ({ r, c }: { r: number; c: number }) => String.fromCharCode(65 + c) + (r + 1),
  },
};

describe('SheetJsWorkbookParser', () => {
  it('converts a worksheet, preserving formulas with a leading =', async () => {
    const parser = new SheetJsWorkbookParser(fakeXlsx);
    const wb = await parser.parse(new ArrayBuffer(0));

    expect(wb.sheets).toHaveLength(1);
    const rows = wb.sheets[0].rows;
    expect(rows[0].cells.map((c) => c.value)).toEqual(['Name', 'Qty', 'Total']);
    expect(rows[1].cells[0].value).toBe('Widget');
    expect(rows[1].cells[1].value).toBe(3);
    // Formula preserved (SheetJS omits the leading '='), cached value kept.
    expect(rows[1].cells[2].formula).toBe('=B2*2');
    expect(rows[1].cells[2].value).toBe(6);
  });
});
