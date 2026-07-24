import { describe, it, expect } from 'vitest';
import { DelimitedImporter } from '../../src/engines/import/importers/delimited-importer';

/**
 * RFC 4180 CSV/TSV parser tests: quoting, escaping, line endings, BOM and
 * custom delimiters — the cases the naïve split-based clipboard parser cannot
 * handle and a real file importer must.
 */
describe('DelimitedImporter.parseMatrix', () => {
  it('parses a simple CSV grid', () => {
    const m = DelimitedImporter.parseMatrix('a,b,c\n1,2,3');
    expect(m).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields containing the delimiter', () => {
    const m = DelimitedImporter.parseMatrix('name,note\n"Doe, John","hi"');
    expect(m).toEqual([
      ['name', 'note'],
      ['Doe, John', 'hi'],
    ]);
  });

  it('handles escaped quotes inside quoted fields', () => {
    const m = DelimitedImporter.parseMatrix('q\n"She said ""hi"""');
    expect(m).toEqual([['q'], ['She said "hi"']]);
  });

  it('handles embedded newlines inside quoted fields', () => {
    const m = DelimitedImporter.parseMatrix('a,b\n"line1\nline2",x');
    expect(m).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'x'],
    ]);
  });

  it('handles CRLF line endings and a trailing newline', () => {
    const m = DelimitedImporter.parseMatrix('a,b\r\n1,2\r\n');
    expect(m).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('strips a leading UTF-8 BOM', () => {
    const m = DelimitedImporter.parseMatrix('﻿id,name\n1,Ann');
    expect(m[0]).toEqual(['id', 'name']);
  });

  it('supports a custom delimiter (semicolon)', () => {
    const m = DelimitedImporter.parseMatrix('a;b;c\n1;2;3', ';');
    expect(m).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('parses TSV with tabs', () => {
    const m = DelimitedImporter.parseMatrix('a\tb\n1\t2', '\t');
    expect(m).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('preserves empty fields', () => {
    const m = DelimitedImporter.parseMatrix('a,,c');
    expect(m).toEqual([['a', '', 'c']]);
  });
});

describe('DelimitedImporter.parse (workbook)', () => {
  it('captures a leading = as a formula cell', () => {
    const wb = DelimitedImporter.parse('a,b\n1,=A1+B1');
    const cell = wb.sheets[0].rows[1].cells[1];
    expect(cell.formula).toBe('=A1+B1');
    expect(cell.value).toBe('=A1+B1');
  });

  it('produces one sheet with the given name', () => {
    const wb = DelimitedImporter.parse('a\n1', { sheetName: 'Data' });
    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0].name).toBe('Data');
  });
});
