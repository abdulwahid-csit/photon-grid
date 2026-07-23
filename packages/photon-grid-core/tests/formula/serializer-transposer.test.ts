import { describe, it, expect } from 'vitest';
import {
  Tokenizer,
  Parser,
  serializeFormula,
  transposeFormula,
  NamedRangeManager,
  DEFAULT_FORMULA_CONFIG,
} from '../../src/formula';
import type { AstNode } from '../../src/formula';

const tk = new Tokenizer();
const parser = new Parser();

/** Parse a formula body to an AST. */
function parse(src: string): AstNode {
  const { tokens } = tk.tokenize(src, DEFAULT_FORMULA_CONFIG);
  const { ast, error } = parser.parse(tokens, DEFAULT_FORMULA_CONFIG);
  expect(error, `parse error for "${src}"`).toBeNull();
  return ast as AstNode;
}

/** Round-trip: parse → serialize, asserting the canonical form. */
function reserialize(src: string): string {
  return serializeFormula(parse(src));
}

describe('FormulaSerializer', () => {
  it('round-trips simple references and literals', () => {
    expect(reserialize('A1')).toBe('A1');
    expect(reserialize('$B$2')).toBe('$B$2');
    expect(reserialize('42')).toBe('42');
    expect(reserialize('"hi"')).toBe('"hi"');
    expect(reserialize('TRUE')).toBe('TRUE');
  });

  it('preserves precedence with minimal parentheses', () => {
    expect(reserialize('1+2*3')).toBe('1+2*3');
    expect(reserialize('(1+2)*3')).toBe('(1+2)*3');
    expect(reserialize('1-2-3')).toBe('1-2-3');
    expect(reserialize('1-(2-3)')).toBe('1-(2-3)');
    expect(reserialize('2^3^2')).toBe('2^3^2');
  });

  it('round-trips ranges and functions', () => {
    expect(reserialize('SUM(A1:A10)')).toBe('SUM(A1:A10)');
    expect(reserialize('A:A')).toBe('A:A');
    expect(reserialize('IF(A1>5,"Y","N")')).toBe('IF(A1>5,"Y","N")');
  });

  it('escapes embedded quotes', () => {
    expect(reserialize('"a""b"')).toBe('"a""b"');
  });
});

describe('FormulaTransposer — relative reference offsetting', () => {
  const cfg = DEFAULT_FORMULA_CONFIG;

  it('shifts relative references by the fill offset', () => {
    expect(transposeFormula('=A1+B1', { deltaRow: 1, deltaCol: 0 }, cfg)).toBe('=A2+B2');
    expect(transposeFormula('=A1', { deltaRow: 0, deltaCol: 1 }, cfg)).toBe('=B1');
    expect(transposeFormula('=A1', { deltaRow: 2, deltaCol: 2 }, cfg)).toBe('=C3');
  });

  it('keeps absolute components fixed', () => {
    expect(transposeFormula('=$A$1', { deltaRow: 3, deltaCol: 3 }, cfg)).toBe('=$A$1');
    expect(transposeFormula('=$A1', { deltaRow: 1, deltaCol: 1 }, cfg)).toBe('=$A2');
    expect(transposeFormula('=A$1', { deltaRow: 1, deltaCol: 1 }, cfg)).toBe('=B$1');
  });

  it('offsets both endpoints of a range', () => {
    expect(transposeFormula('=SUM(A1:A3)', { deltaRow: 1, deltaCol: 0 }, cfg)).toBe('=SUM(A2:A4)');
    expect(transposeFormula('=SUM($A$1:$A$3)', { deltaRow: 5, deltaCol: 0 }, cfg)).toBe('=SUM($A$1:$A$3)');
  });

  it('only shifts the column axis of a whole-column range', () => {
    expect(transposeFormula('=SUM(A:A)', { deltaRow: 5, deltaCol: 1 }, cfg)).toBe('=SUM(B:B)');
  });

  it('collapses references pushed off-grid to #REF!', () => {
    expect(transposeFormula('=A1', { deltaRow: -5, deltaCol: 0 }, cfg)).toBe('=#REF!');
  });

  it('is a no-op for a zero offset', () => {
    expect(transposeFormula('=A1+B2', { deltaRow: 0, deltaCol: 0 }, cfg)).toBe('=A1+B2');
  });

  it('leaves an unparseable formula unchanged', () => {
    expect(transposeFormula('=1+', { deltaRow: 1, deltaCol: 0 }, cfg)).toBe('=1+');
  });
});

describe('NamedRangeManager', () => {
  it('is case-insensitive and preserves display casing', () => {
    const m = new NamedRangeManager();
    m.set('TaxRate', 'B1');
    expect(m.getTarget('taxrate')).toBe('B1');
    expect(m.getTarget('TAXRATE')).toBe('B1');
    expect(m.has('TaxRate')).toBe(true);
    expect(m.list()[0].name).toBe('TaxRate');
  });

  it('seeds from a config map and supports removal', () => {
    const m = new NamedRangeManager({ Region: 'A1:A10' });
    expect(m.getTarget('region')).toBe('A1:A10');
    expect(m.delete('REGION')).toBe(true);
    expect(m.has('region')).toBe(false);
  });
});
