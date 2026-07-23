/**
 * Abstract Syntax Tree node declarations for parsed formulas.
 *
 * The parser (Phase 2) produces a tree of these immutable nodes; the evaluator
 * (Phase 3) walks it. Nodes are plain data (a discriminated union on
 * {@link AstNodeType}) so they cache and serialize cleanly and carry no behavior.
 *
 * @packageDocumentation
 */

import type { CellRef, RangeRef } from '../reference/reference.types';
import type { FormulaError } from '../error/formula-error';

/** Discriminant tag for every {@link AstNode}. */
export enum AstNodeType {
  Number = 'number',
  String = 'string',
  Boolean = 'boolean',
  ErrorLiteral = 'error',
  CellRef = 'cellRef',
  RangeRef = 'rangeRef',
  Name = 'name',
  Unary = 'unary',
  Binary = 'binary',
  Function = 'function',
}

/** Binary operators, in the grid's precedence model. */
export enum BinaryOperator {
  /** `+` */ Add = '+',
  /** `-` */ Subtract = '-',
  /** `*` */ Multiply = '*',
  /** `/` */ Divide = '/',
  /** `^` */ Power = '^',
  /** `&` string concatenation */ Concat = '&',
  /** `=` */ Equal = '=',
  /** `<>` */ NotEqual = '<>',
  /** `<` */ LessThan = '<',
  /** `<=` */ LessThanOrEqual = '<=',
  /** `>` */ GreaterThan = '>',
  /** `>=` */ GreaterThanOrEqual = '>=',
}

/** Unary operators. `Percent` is a postfix operator (`50%`). */
export enum UnaryOperator {
  /** prefix `-` */ Negate = '-',
  /** prefix `+` */ Plus = '+',
  /** postfix `%` */ Percent = '%',
}

/** A numeric literal node. */
export interface NumberLiteralNode {
  readonly type: AstNodeType.Number;
  readonly value: number;
}

/** A string literal node. */
export interface StringLiteralNode {
  readonly type: AstNodeType.String;
  readonly value: string;
}

/** A boolean literal node. */
export interface BooleanLiteralNode {
  readonly type: AstNodeType.Boolean;
  readonly value: boolean;
}

/** An error literal typed directly into the formula (e.g. `#N/A`). */
export interface ErrorLiteralNode {
  readonly type: AstNodeType.ErrorLiteral;
  readonly error: FormulaError;
}

/** A single-cell reference node. */
export interface CellRefNode {
  readonly type: AstNodeType.CellRef;
  readonly ref: CellRef;
}

/** A range reference node. */
export interface RangeRefNode {
  readonly type: AstNodeType.RangeRef;
  readonly ref: RangeRef;
}

/** A bare name node — resolved at eval time as a named range/cell. */
export interface NameNode {
  readonly type: AstNodeType.Name;
  readonly name: string;
}

/** A unary operation (prefix `+`/`-`, postfix `%`). */
export interface UnaryOpNode {
  readonly type: AstNodeType.Unary;
  readonly op: UnaryOperator;
  readonly operand: AstNode;
}

/** A binary operation. */
export interface BinaryOpNode {
  readonly type: AstNodeType.Binary;
  readonly op: BinaryOperator;
  readonly left: AstNode;
  readonly right: AstNode;
}

/** A function call `NAME(arg, ...)`. */
export interface FunctionCallNode {
  readonly type: AstNodeType.Function;
  /** The function name exactly as written (case-normalized at lookup time). */
  readonly name: string;
  /** Argument expressions in source order. */
  readonly args: readonly AstNode[];
}

/** The discriminated union of every AST node. */
export type AstNode =
  | NumberLiteralNode
  | StringLiteralNode
  | BooleanLiteralNode
  | ErrorLiteralNode
  | CellRefNode
  | RangeRefNode
  | NameNode
  | UnaryOpNode
  | BinaryOpNode
  | FunctionCallNode;
