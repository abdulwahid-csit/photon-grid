import { describe, it, expect } from 'vitest';
import { Tokenizer, TokenType, DEFAULT_FORMULA_CONFIG } from '../../src/formula';
import type { Token } from '../../src/formula';

const tk = new Tokenizer();

/** Tokenize and return `[type, value]` pairs excluding the trailing EOF. */
function lex(input: string): Array<[TokenType, string]> {
  const { tokens, error } = tk.tokenize(input, DEFAULT_FORMULA_CONFIG);
  expect(error).toBeNull();
  return tokens.filter((t: Token) => t.type !== TokenType.EOF).map((t) => [t.type, t.value]);
}

describe('Tokenizer', () => {
  it('scans integer, decimal, and leading-dot numbers', () => {
    expect(lex('42')).toEqual([[TokenType.Number, '42']]);
    expect(lex('3.14')).toEqual([[TokenType.Number, '3.14']]);
    expect(lex('.5')).toEqual([[TokenType.Number, '.5']]);
  });

  it('scans scientific notation', () => {
    expect(lex('1.5e3')).toEqual([[TokenType.Number, '1.5e3']]);
    expect(lex('2E-4')).toEqual([[TokenType.Number, '2E-4']]);
  });

  it('scans string literals with doubled-quote escaping', () => {
    expect(lex('"hello"')).toEqual([[TokenType.String, 'hello']]);
    expect(lex('"a""b"')).toEqual([[TokenType.String, 'a"b']]);
  });

  it('distinguishes cell references from identifiers', () => {
    expect(lex('A1')).toEqual([[TokenType.Reference, 'A1']]);
    expect(lex('$AA$500')).toEqual([[TokenType.Reference, '$AA$500']]);
    expect(lex('SUM')).toEqual([[TokenType.Identifier, 'SUM']]);
    // A bare column letter is an identifier (the parser folds it into A:A).
    expect(lex('A')).toEqual([[TokenType.Identifier, 'A']]);
  });

  it('scans a function call with a range argument', () => {
    expect(lex('SUM(A1:A10)')).toEqual([
      [TokenType.Identifier, 'SUM'],
      [TokenType.LParen, '('],
      [TokenType.Reference, 'A1'],
      [TokenType.Colon, ':'],
      [TokenType.Reference, 'A10'],
      [TokenType.RParen, ')'],
    ]);
  });

  it('scans one- and two-character operators', () => {
    expect(lex('1+2*3^4')).toEqual([
      [TokenType.Number, '1'],
      [TokenType.Operator, '+'],
      [TokenType.Number, '2'],
      [TokenType.Operator, '*'],
      [TokenType.Number, '3'],
      [TokenType.Operator, '^'],
      [TokenType.Number, '4'],
    ]);
    expect(lex('A1<=B1').map((t) => t[1])).toContain('<=');
    expect(lex('A1<>B1').map((t) => t[1])).toContain('<>');
    expect(lex('A1>=B1').map((t) => t[1])).toContain('>=');
  });

  it('scans the concatenation operator', () => {
    expect(lex('A1&B1')).toEqual([
      [TokenType.Reference, 'A1'],
      [TokenType.Operator, '&'],
      [TokenType.Reference, 'B1'],
    ]);
  });

  it('scans Excel error literals as single tokens', () => {
    expect(lex('#N/A')).toEqual([[TokenType.Error, '#N/A']]);
    expect(lex('#DIV/0!')).toEqual([[TokenType.Error, '#DIV/0!']]);
    expect(lex('#REF!')).toEqual([[TokenType.Error, '#REF!']]);
  });

  it('scans sheet-qualified references as one reference token', () => {
    expect(lex('Sheet1!A1')).toEqual([[TokenType.Reference, 'Sheet1!A1']]);
  });

  it('skips insignificant whitespace', () => {
    expect(lex('  1  +  2 ')).toEqual([
      [TokenType.Number, '1'],
      [TokenType.Operator, '+'],
      [TokenType.Number, '2'],
    ]);
  });

  it('honours a locale argument separator', () => {
    const cfg = { ...DEFAULT_FORMULA_CONFIG, argumentSeparator: ';' };
    const { tokens, error } = tk.tokenize('SUM(1;2)', cfg);
    expect(error).toBeNull();
    // ';' fills the comma role and normalizes to a Comma token.
    expect(tokens.map((t) => t.type)).toContain(TokenType.Comma);
  });

  it('always terminates the stream with an EOF token', () => {
    const { tokens } = tk.tokenize('1', DEFAULT_FORMULA_CONFIG);
    expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
  });

  it('reports an unterminated string with its start offset', () => {
    const { error } = tk.tokenize('"abc', DEFAULT_FORMULA_CONFIG);
    expect(error).not.toBeNull();
    expect(error!.position).toBe(0);
  });

  it('reports an unexpected character with its offset', () => {
    const { error } = tk.tokenize('1 ~ 2', DEFAULT_FORMULA_CONFIG);
    expect(error).not.toBeNull();
    expect(error!.position).toBe(2);
  });
});
