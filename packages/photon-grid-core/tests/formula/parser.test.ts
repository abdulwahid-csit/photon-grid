import { describe, it, expect } from 'vitest';
import {
  Tokenizer,
  Parser,
  AstNodeType,
  BinaryOperator,
  UnaryOperator,
  DEFAULT_FORMULA_CONFIG,
} from '../../src/formula';
import type { AstNode, BinaryOpNode, UnaryOpNode, FunctionCallNode, RangeRefNode, CellRefNode } from '../../src/formula';

const tk = new Tokenizer();
const parser = new Parser();

/** Tokenize + parse a formula body, asserting a clean parse, and return the AST. */
function parse(src: string): AstNode {
  const { tokens, error: lexErr } = tk.tokenize(src, DEFAULT_FORMULA_CONFIG);
  expect(lexErr, `lex error for "${src}"`).toBeNull();
  const { ast, error } = parser.parse(tokens, DEFAULT_FORMULA_CONFIG);
  expect(error, `parse error for "${src}"`).toBeNull();
  expect(ast).not.toBeNull();
  return ast as AstNode;
}

/** Parse expecting failure; return the error. */
function parseErr(src: string) {
  const { tokens } = tk.tokenize(src, DEFAULT_FORMULA_CONFIG);
  return parser.parse(tokens, DEFAULT_FORMULA_CONFIG).error;
}

describe('Parser — literals & references', () => {
  it('parses number, string and boolean literals', () => {
    expect(parse('42')).toEqual({ type: AstNodeType.Number, value: 42 });
    expect(parse('"hi"')).toEqual({ type: AstNodeType.String, value: 'hi' });
    expect(parse('TRUE')).toEqual({ type: AstNodeType.Boolean, value: true });
    expect(parse('false')).toEqual({ type: AstNodeType.Boolean, value: false });
  });

  it('parses a single-cell reference into 0-based indices', () => {
    const node = parse('B3') as CellRefNode;
    expect(node.type).toBe(AstNodeType.CellRef);
    expect(node.ref.colIndex).toBe(1);
    expect(node.ref.rowIndex).toBe(2);
  });

  it('parses absolute anchors', () => {
    const node = parse('$C$5') as CellRefNode;
    expect(node.ref.colAbsolute).toBe(true);
    expect(node.ref.rowAbsolute).toBe(true);
  });

  it('parses an error literal node', () => {
    const node = parse('#N/A');
    expect(node.type).toBe(AstNodeType.ErrorLiteral);
  });

  it('treats an unknown bare word as a named range', () => {
    expect(parse('TaxRate')).toEqual({ type: AstNodeType.Name, name: 'TaxRate' });
  });
});

describe('Parser — operator precedence', () => {
  it('binds * tighter than +', () => {
    const ast = parse('1+2*3') as BinaryOpNode;
    expect(ast.op).toBe(BinaryOperator.Add);
    expect((ast.right as BinaryOpNode).op).toBe(BinaryOperator.Multiply);
  });

  it('respects grouping parentheses', () => {
    const ast = parse('(1+2)*3') as BinaryOpNode;
    expect(ast.op).toBe(BinaryOperator.Multiply);
    expect((ast.left as BinaryOpNode).op).toBe(BinaryOperator.Add);
  });

  it('is left-associative for subtraction', () => {
    // 1-2-3 → (1-2)-3
    const ast = parse('1-2-3') as BinaryOpNode;
    expect(ast.op).toBe(BinaryOperator.Subtract);
    expect((ast.left as BinaryOpNode).op).toBe(BinaryOperator.Subtract);
    expect((ast.right as { value: number }).value).toBe(3);
  });

  it('is right-associative for exponentiation', () => {
    // 2^3^2 → 2^(3^2)
    const ast = parse('2^3^2') as BinaryOpNode;
    expect(ast.op).toBe(BinaryOperator.Power);
    expect((ast.left as { value: number }).value).toBe(2);
    expect((ast.right as BinaryOpNode).op).toBe(BinaryOperator.Power);
  });

  it('binds unary minus tighter than power (Excel: -2^2 = 4)', () => {
    // (-2)^2, i.e. Power( Negate(2), 2 )
    const ast = parse('-2^2') as BinaryOpNode;
    expect(ast.op).toBe(BinaryOperator.Power);
    const left = ast.left as UnaryOpNode;
    expect(left.type).toBe(AstNodeType.Unary);
    expect(left.op).toBe(UnaryOperator.Negate);
    expect((left.operand as { value: number }).value).toBe(2);
  });

  it('parses postfix percent', () => {
    const ast = parse('50%') as UnaryOpNode;
    expect(ast.type).toBe(AstNodeType.Unary);
    expect(ast.op).toBe(UnaryOperator.Percent);
    expect((ast.operand as { value: number }).value).toBe(50);
  });

  it('parses concatenation below comparison', () => {
    // A1&B1=C1 → (A1&B1)=C1
    const ast = parse('A1&B1=C1') as BinaryOpNode;
    expect(ast.op).toBe(BinaryOperator.Equal);
    expect((ast.left as BinaryOpNode).op).toBe(BinaryOperator.Concat);
  });
});

describe('Parser — functions & ranges', () => {
  it('parses a function call with a range argument', () => {
    const ast = parse('SUM(A1:A10)') as FunctionCallNode;
    expect(ast.type).toBe(AstNodeType.Function);
    expect(ast.name).toBe('SUM');
    expect(ast.args).toHaveLength(1);
    const range = ast.args[0] as RangeRefNode;
    expect(range.type).toBe(AstNodeType.RangeRef);
    expect(range.ref.start.rowIndex).toBe(0);
    expect(range.ref.end.rowIndex).toBe(9);
  });

  it('parses nested function calls with multiple args', () => {
    const ast = parse('IF(A1>5,"Y","N")') as FunctionCallNode;
    expect(ast.name).toBe('IF');
    expect(ast.args).toHaveLength(3);
    expect((ast.args[0] as BinaryOpNode).op).toBe(BinaryOperator.GreaterThan);
  });

  it('parses a whole-column range A:A', () => {
    const ast = parse('A:A') as RangeRefNode;
    expect(ast.type).toBe(AstNodeType.RangeRef);
    expect(ast.ref.wholeColumn).toBe(true);
  });

  it('parses a whole-row range 1:10', () => {
    const ast = parse('1:10') as RangeRefNode;
    expect(ast.type).toBe(AstNodeType.RangeRef);
    expect(ast.ref.wholeRow).toBe(true);
    expect(ast.ref.start.rowIndex).toBe(0);
    expect(ast.ref.end.rowIndex).toBe(9);
  });

  it('parses an empty-argument function call', () => {
    const ast = parse('TODAY()') as FunctionCallNode;
    expect(ast.name).toBe('TODAY');
    expect(ast.args).toHaveLength(0);
  });
});

describe('Parser — error handling', () => {
  it('rejects trailing input', () => {
    expect(parseErr('1 2')).not.toBeNull();
  });

  it('rejects an unclosed parenthesis', () => {
    expect(parseErr('(1+2')).not.toBeNull();
  });

  it('rejects a dangling operator', () => {
    expect(parseErr('1+')).not.toBeNull();
  });
});
