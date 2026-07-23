/**
 * The formula parser: turns the tokenizer's flat {@link Token} stream into an
 * immutable {@link AstNode} tree with correct operator precedence.
 *
 * ### Precedence (lowest → highest), Excel-compatible
 * 1. comparison `=` `<>` `<` `<=` `>` `>=`
 * 2. concatenation `&`
 * 3. addition/subtraction `+` `-`
 * 4. multiplication/division `*` `/`
 * 5. unary prefix `+` `-`     ← binds tighter than `^` (Excel quirk: `-2^2 = 4`)
 * 6. exponentiation `^` (right-associative)
 * 7. postfix percent `%`
 * 8. range `:` and grouping `( )` / references / literals (atoms)
 *
 * Implemented with precedence climbing for binary operators plus explicit
 * unary/postfix handling — no recursion-per-precedence-level table walking, so
 * the hot path stays shallow. Parsing never throws: a malformed formula yields a
 * `{ ast: null, error }` result the engine surfaces as `#ERROR!`.
 *
 * @packageDocumentation
 */

import { Token, TokenType } from '../tokenizer/token.types';
import {
  AstNode,
  AstNodeType,
  BinaryOperator,
  UnaryOperator,
} from './ast.types';
import type { CellRef, RangeRef } from '../reference/reference.types';
import { parseCellRef, columnLabelToIndex } from '../reference/cell-reference';
import { FormulaError, FormulaErrorCode } from '../error/formula-error';
import type { ResolvedFormulaConfig } from '../config/formula-config';

/** Outcome of a parse: the root node, or a positioned error. */
export interface ParseResult {
  /** The parsed AST, or `null` when parsing failed. */
  readonly ast: AstNode | null;
  /** Non-null on failure; carries a message and source offset. */
  readonly error: { message: string; position: number } | null;
}

/** Binary operator metadata: precedence level and associativity. */
interface BinOpInfo {
  readonly op: BinaryOperator;
  readonly prec: number;
  readonly rightAssoc: boolean;
}

/** Precedence table (higher number = binds tighter). */
const BINARY_OPERATORS: Readonly<Record<string, BinOpInfo>> = {
  '=': { op: BinaryOperator.Equal, prec: 1, rightAssoc: false },
  '<>': { op: BinaryOperator.NotEqual, prec: 1, rightAssoc: false },
  '<': { op: BinaryOperator.LessThan, prec: 1, rightAssoc: false },
  '<=': { op: BinaryOperator.LessThanOrEqual, prec: 1, rightAssoc: false },
  '>': { op: BinaryOperator.GreaterThan, prec: 1, rightAssoc: false },
  '>=': { op: BinaryOperator.GreaterThanOrEqual, prec: 1, rightAssoc: false },
  '&': { op: BinaryOperator.Concat, prec: 2, rightAssoc: false },
  '+': { op: BinaryOperator.Add, prec: 3, rightAssoc: false },
  '-': { op: BinaryOperator.Subtract, prec: 3, rightAssoc: false },
  '*': { op: BinaryOperator.Multiply, prec: 4, rightAssoc: false },
  '/': { op: BinaryOperator.Divide, prec: 4, rightAssoc: false },
  '^': { op: BinaryOperator.Power, prec: 6, rightAssoc: true },
};

/**
 * Precedence of unary prefix operators. Set *above* every binary operator —
 * including exponentiation (prec 6) — so a prefix sign binds tighter than `^`.
 * This reproduces Excel's well-known quirk where `-2^2 = 4` (the negation
 * applies to `2` first, yielding `(-2)^2`), rather than the mathematical
 * `-(2^2) = -4`.
 */
const UNARY_PREC = 7;

/** A range endpoint, before it is combined (or not) with a `:` partner. */
type Endpoint =
  | { kind: 'cell'; ref: CellRef; sheet?: string }
  | { kind: 'col'; colIndex: number; colAbsolute: boolean; raw: string; sheet?: string }
  | { kind: 'row'; rowIndex: number; rowAbsolute: boolean }
  | { kind: 'expr'; node: AstNode };

export class Parser {
  private tokens: Token[] = [];
  private pos = 0;
  private config!: ResolvedFormulaConfig;

  /**
   * Parses a token stream into an AST.
   *
   * @param tokens - Tokens produced by the tokenizer (must end with `EOF`).
   * @param config - Resolved config (decimal separator for number literals).
   * @returns The AST or a positioned error.
   */
  parse(tokens: Token[], config: ResolvedFormulaConfig): ParseResult {
    this.tokens = tokens;
    this.pos = 0;
    this.config = config;

    try {
      const node = this.parseExpression(0);
      if (this.peek().type !== TokenType.EOF) {
        return { ast: null, error: { message: 'Unexpected trailing input', position: this.peek().start } };
      }
      return { ast: node, error: null };
    } catch (e) {
      const err = e as ParseError;
      return { ast: null, error: { message: err.message, position: err.position } };
    }
  }

  // ── Grammar ────────────────────────────────────────────────────────────────

  /** Precedence-climbing binary-operator parse. */
  private parseExpression(minPrec: number): AstNode {
    let left = this.parseUnary();

    for (;;) {
      const tok = this.peek();
      if (tok.type !== TokenType.Operator) break;
      const info = BINARY_OPERATORS[tok.value];
      if (!info || info.prec < minPrec) break;
      this.advance();
      const nextMin = info.rightAssoc ? info.prec : info.prec + 1;
      const right = this.parseExpression(nextMin);
      left = { type: AstNodeType.Binary, op: info.op, left, right };
    }
    return left;
  }

  /** Unary prefix `+`/`-`, then postfix `%`. */
  private parseUnary(): AstNode {
    const tok = this.peek();
    if (tok.type === TokenType.Operator && (tok.value === '-' || tok.value === '+')) {
      this.advance();
      const operand = this.parseExpression(UNARY_PREC);
      const op = tok.value === '-' ? UnaryOperator.Negate : UnaryOperator.Plus;
      return this.parsePostfix({ type: AstNodeType.Unary, op, operand });
    }
    return this.parsePostfix(this.parseRangeable());
  }

  /** Applies any postfix `%` operators to an already-parsed node. */
  private parsePostfix(node: AstNode): AstNode {
    let result = node;
    while (this.peek().type === TokenType.Operator && this.peek().value === '%') {
      this.advance();
      result = { type: AstNodeType.Unary, op: UnaryOperator.Percent, operand: result };
    }
    return result;
  }

  /** Parses an atom, optionally combined with a `:` partner into a range. */
  private parseRangeable(): AstNode {
    const left = this.parseEndpoint();
    if (this.peek().type === TokenType.Colon) {
      this.advance();
      const right = this.parseEndpoint();
      return this.buildRange(left, right);
    }
    return this.endpointToNode(left);
  }

  /** Parses a single atomic operand into an {@link Endpoint}. */
  private parseEndpoint(): Endpoint {
    const tok = this.peek();
    switch (tok.type) {
      case TokenType.Number: {
        this.advance();
        // A bare integer may be a whole-row endpoint; keep the numeric value too.
        const num = this.parseNumber(tok.value);
        if (Number.isInteger(num) && num >= 1 && tok.value.indexOf(this.config.decimalSeparator) === -1) {
          return { kind: 'row', rowIndex: num - 1, rowAbsolute: false };
        }
        return { kind: 'expr', node: { type: AstNodeType.Number, value: num } };
      }
      case TokenType.String:
        this.advance();
        return { kind: 'expr', node: { type: AstNodeType.String, value: tok.value } };
      case TokenType.Error:
        this.advance();
        return { kind: 'expr', node: { type: AstNodeType.ErrorLiteral, error: this.errorFromLiteral(tok.value) } };
      case TokenType.Reference: {
        this.advance();
        const { sheet, rest } = splitSheet(tok.value);
        const ref = parseCellRef(rest);
        if (!ref) this.fail(`Invalid reference '${tok.value}'`, tok.start);
        return { kind: 'cell', ref: ref as CellRef, sheet };
      }
      case TokenType.Identifier: {
        // Booleans
        const upper = tok.value.toUpperCase();
        if (upper === 'TRUE' || upper === 'FALSE') {
          this.advance();
          return { kind: 'expr', node: { type: AstNodeType.Boolean, value: upper === 'TRUE' } };
        }
        // Function call
        if (this.peekAhead(1).type === TokenType.LParen) {
          return { kind: 'expr', node: this.parseFunctionCall() };
        }
        // Whole-column label (e.g. `A`, `$AA`). Returned as a `col` endpoint so a
        // following `:` forms a whole-column range (`A:A`); used standalone it is
        // folded back to a Name by `endpointToNode`, so this is safe on both the
        // left and right side of a `:` (the right side has no trailing colon).
        const col = parseColumnLabelEndpoint(tok.value);
        if (col) {
          this.advance();
          return col;
        }
        // Otherwise a named range/name.
        this.advance();
        return { kind: 'expr', node: { type: AstNodeType.Name, name: tok.value } };
      }
      case TokenType.LParen: {
        this.advance();
        const inner = this.parseExpression(0);
        this.expect(TokenType.RParen, ')');
        return { kind: 'expr', node: inner };
      }
      default:
        this.fail(`Unexpected token '${tok.value || tok.type}'`, tok.start);
        // Unreachable (fail throws), but satisfies the type checker:
        return { kind: 'expr', node: { type: AstNodeType.Number, value: 0 } };
    }
  }

  /** Parses `NAME( arg, arg, ... )`. Assumes the identifier is current. */
  private parseFunctionCall(): AstNode {
    const nameTok = this.advance(); // identifier
    this.expect(TokenType.LParen, '(');
    const args: AstNode[] = [];
    if (this.peek().type !== TokenType.RParen) {
      args.push(this.parseExpression(0));
      while (this.peek().type === TokenType.Comma) {
        this.advance();
        args.push(this.parseExpression(0));
      }
    }
    this.expect(TokenType.RParen, ')');
    return { type: AstNodeType.Function, name: nameTok.value, args };
  }

  // ── Endpoint → node / range assembly ─────────────────────────────────────

  private endpointToNode(ep: Endpoint): AstNode {
    switch (ep.kind) {
      case 'expr':
        return ep.node;
      case 'cell':
        return { type: AstNodeType.CellRef, ref: ep.ref };
      case 'row':
        // A lone integer is just a number literal.
        return { type: AstNodeType.Number, value: ep.rowIndex + 1 };
      case 'col':
        // A lone column label is a named reference.
        return { type: AstNodeType.Name, name: ep.raw };
    }
  }

  /** Combines two endpoints around a `:` into a {@link RangeRef} node. */
  private buildRange(left: Endpoint, right: Endpoint): AstNode {
    // Cell : Cell → rectangular range
    if (left.kind === 'cell' && right.kind === 'cell') {
      const ref: RangeRef = {
        start: left.ref,
        end: right.ref,
        wholeColumn: false,
        wholeRow: false,
        ...(left.sheet !== undefined ? { sheet: left.sheet } : {}),
      };
      return { type: AstNodeType.RangeRef, ref };
    }
    // Col : Col → whole-column range (A:A)
    if (left.kind === 'col' && right.kind === 'col') {
      const ref: RangeRef = {
        start: { colIndex: left.colIndex, rowIndex: -1, colAbsolute: left.colAbsolute, rowAbsolute: false },
        end: { colIndex: right.colIndex, rowIndex: -1, colAbsolute: right.colAbsolute, rowAbsolute: false },
        wholeColumn: true,
        wholeRow: false,
        ...(left.sheet !== undefined ? { sheet: left.sheet } : {}),
      };
      return { type: AstNodeType.RangeRef, ref };
    }
    // Row : Row → whole-row range (1:10)
    if (left.kind === 'row' && right.kind === 'row') {
      const ref: RangeRef = {
        start: { colIndex: -1, rowIndex: left.rowIndex, colAbsolute: false, rowAbsolute: left.rowAbsolute },
        end: { colIndex: -1, rowIndex: right.rowIndex, colAbsolute: false, rowAbsolute: right.rowAbsolute },
        wholeColumn: false,
        wholeRow: true,
      };
      return { type: AstNodeType.RangeRef, ref };
    }
    // Anything else is not a valid range.
    return { type: AstNodeType.ErrorLiteral, error: FormulaError.ref('Invalid range operands') };
  }

  // ── Numeric literal parsing (locale decimal separator) ──────────────────────

  private parseNumber(raw: string): number {
    const sep = this.config.decimalSeparator;
    const normalized = sep === '.' ? raw : raw.split(sep).join('.');
    return parseFloat(normalized);
  }

  private errorFromLiteral(text: string): FormulaError {
    const match = (Object.values(FormulaErrorCode) as string[]).includes(text)
      ? (text as FormulaErrorCode)
      : FormulaErrorCode.ERROR;
    return FormulaError.of(match);
  }

  // ── Token cursor helpers ────────────────────────────────────────────────────

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private peekAhead(n: number): Token {
    const idx = this.pos + n;
    return idx < this.tokens.length ? this.tokens[idx] : this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) this.pos++;
    return tok;
  }

  private expect(type: TokenType, label: string): Token {
    const tok = this.peek();
    if (tok.type !== type) this.fail(`Expected '${label}'`, tok.start);
    return this.advance();
  }

  private fail(message: string, position: number): never {
    throw new ParseError(message, position);
  }
}

/** Internal control-flow error; converted to a `ParseResult.error`. */
class ParseError extends Error {
  constructor(message: string, readonly position: number) {
    super(message);
    this.name = 'ParseError';
  }
}

// ── Standalone helpers ─────────────────────────────────────────────────────

/** Splits an optional `Sheet1!` prefix off a raw reference token. */
function splitSheet(raw: string): { sheet?: string; rest: string } {
  const bang = raw.indexOf('!');
  if (bang === -1) return { rest: raw };
  return { sheet: raw.slice(0, bang), rest: raw.slice(bang + 1) };
}

/** Parses a whole-column label endpoint (`A`, `$AA`, `Sheet1!C`), or `null`. */
function parseColumnLabelEndpoint(raw: string): Extract<Endpoint, { kind: 'col' }> | null {
  const { sheet, rest } = splitSheet(raw);
  let i = 0;
  const colAbsolute = rest.charCodeAt(0) === 36; // '$'
  if (colAbsolute) i++;
  const label = rest.slice(i);
  if (label.length === 0) return null;
  // Must be letters only.
  for (let k = 0; k < label.length; k++) {
    const c = label.charCodeAt(k);
    const isLetter = (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
    if (!isLetter) return null;
  }
  const colIndex = columnLabelToIndex(label);
  if (colIndex < 0) return null;
  return sheet !== undefined
    ? { kind: 'col', colIndex, colAbsolute, raw, sheet }
    : { kind: 'col', colIndex, colAbsolute, raw };
}

/** A process-wide shared parser (reset per call, safe to reuse single-threaded). */
export const sharedParser = new Parser();
