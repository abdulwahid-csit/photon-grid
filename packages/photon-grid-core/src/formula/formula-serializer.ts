/**
 * Serializes an {@link AstNode} tree back to canonical formula source.
 *
 * This is the inverse of the parser and the foundation for copy/fill: the
 * {@link FormulaTransposer} offsets relative references in the AST, then this
 * module re-emits the source. Serialization is **precedence-aware** — it inserts
 * the minimum parentheses needed to preserve the tree's meaning, so a
 * round-trip never changes semantics.
 *
 * @packageDocumentation
 */

import { AstNode, AstNodeType, BinaryOperator, UnaryOperator } from './parser/ast.types';
import { encodeCellRef } from './reference/cell-reference';
import type { CellRef, RangeRef } from './reference/reference.types';
import { numberToText } from './evaluator/coerce';

/** Binding power per binary operator (mirrors the parser's precedence table). */
const BINARY_PRECEDENCE: Readonly<Record<BinaryOperator, number>> = {
  [BinaryOperator.Equal]: 1,
  [BinaryOperator.NotEqual]: 1,
  [BinaryOperator.LessThan]: 1,
  [BinaryOperator.LessThanOrEqual]: 1,
  [BinaryOperator.GreaterThan]: 1,
  [BinaryOperator.GreaterThanOrEqual]: 1,
  [BinaryOperator.Concat]: 2,
  [BinaryOperator.Add]: 3,
  [BinaryOperator.Subtract]: 3,
  [BinaryOperator.Multiply]: 4,
  [BinaryOperator.Divide]: 4,
  [BinaryOperator.Power]: 6,
};

/** Precedence assigned to atoms (references, literals, calls) — binds tightest. */
const ATOM_PRECEDENCE = 100;

/**
 * Serializes an AST to formula source (without the leading `=`).
 *
 * @param node - The AST root.
 * @returns The canonical source string.
 */
export function serializeFormula(node: AstNode): string {
  return emit(node);
}

/**
 * Serializes an AST to a complete formula source including the leading `=`.
 *
 * @param node - The AST root.
 * @returns The source string prefixed with `=`.
 */
export function serializeFormulaWithEquals(node: AstNode): string {
  return '=' + emit(node);
}

/** The precedence of a node for parenthesization decisions. */
function precedenceOf(node: AstNode): number {
  switch (node.type) {
    case AstNodeType.Binary:
      return BINARY_PRECEDENCE[node.op];
    case AstNodeType.Unary:
      return node.op === UnaryOperator.Percent ? 7 : 5;
    default:
      return ATOM_PRECEDENCE;
  }
}

/** Emits a child, wrapping in parens when its precedence is below `minPrec`. */
function emitChild(node: AstNode, minPrec: number): string {
  const s = emit(node);
  return precedenceOf(node) < minPrec ? `(${s})` : s;
}

function emit(node: AstNode): string {
  switch (node.type) {
    case AstNodeType.Number:
      return numberToText(node.value);
    case AstNodeType.String:
      return `"${node.value.replace(/"/g, '""')}"`;
    case AstNodeType.Boolean:
      return node.value ? 'TRUE' : 'FALSE';
    case AstNodeType.ErrorLiteral:
      return node.error.code;
    case AstNodeType.Name:
      return node.name;
    case AstNodeType.CellRef:
      return encodeCell(node.ref);
    case AstNodeType.RangeRef:
      return encodeRange(node.ref);
    case AstNodeType.Unary:
      return emitUnary(node.op, node.operand);
    case AstNodeType.Binary: {
      const prec = BINARY_PRECEDENCE[node.op];
      const rightAssoc = node.op === BinaryOperator.Power;
      // For left-assoc ops the right child needs prec+1 to force parens on equal
      // precedence (and vice-versa for right-assoc).
      const left = emitChild(node.left, rightAssoc ? prec + 1 : prec);
      const right = emitChild(node.right, rightAssoc ? prec : prec + 1);
      return `${left}${node.op}${right}`;
    }
    case AstNodeType.Function:
      return `${node.name}(${node.args.map((a) => emit(a)).join(',')})`;
  }
}

function emitUnary(op: UnaryOperator, operand: AstNode): string {
  if (op === UnaryOperator.Percent) {
    return `${emitChild(operand, 7)}%`;
  }
  // Prefix +/-: operand binds at unary precedence (5).
  return `${op}${emitChild(operand, 5)}`;
}

/** Encodes a cell ref including any sheet prefix. */
function encodeCell(ref: CellRef): string {
  const core = encodeCellRef(ref);
  return ref.sheet !== undefined ? `${ref.sheet}!${core}` : core;
}

/** Encodes a range ref, handling whole-column/row forms. */
function encodeRange(ref: RangeRef): string {
  const sheet = ref.sheet !== undefined ? `${ref.sheet}!` : '';
  if (ref.wholeColumn) {
    const a = (ref.start.colAbsolute ? '$' : '') + columnPart(ref.start);
    const b = (ref.end.colAbsolute ? '$' : '') + columnPart(ref.end);
    return `${sheet}${a}:${b}`;
  }
  if (ref.wholeRow) {
    const a = (ref.start.rowAbsolute ? '$' : '') + String(ref.start.rowIndex + 1);
    const b = (ref.end.rowAbsolute ? '$' : '') + String(ref.end.rowIndex + 1);
    return `${sheet}${a}:${b}`;
  }
  return `${sheet}${encodeCellRef(ref.start)}:${encodeCellRef(ref.end)}`;
}

/** The column-letter portion of a ref (used for whole-column ranges). */
function columnPart(ref: CellRef): string {
  return encodeCellRef({ ...ref, rowIndex: 0, rowAbsolute: false }).replace(/\d+$/, '');
}
