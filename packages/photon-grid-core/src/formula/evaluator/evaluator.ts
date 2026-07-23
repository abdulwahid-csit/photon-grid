/**
 * The tree-walking evaluator: given a parsed {@link AstNode} and an
 * {@link EvalContext}, it produces a single {@link FormulaValue}. It is the
 * runtime heart of Phase 3 — operators, references, ranges and function calls
 * all resolve here.
 *
 * ### Design
 * - **Never throws.** Every user-facing error condition becomes a
 *   {@link FormulaError} value that propagates like any other value, so a bad
 *   cell renders `#DIV/0!` instead of crashing a recalculation pass.
 * - **Matrix-aware.** Range references evaluate to a {@link FormulaMatrix};
 *   function arguments receive that matrix intact (so `SUM(A1:A9)` works), while
 *   scalar positions (operator operands, the cell's final result) collapse a
 *   1×1 matrix to its cell and reject larger matrices with `#VALUE!`.
 * - **Error short-circuiting.** Binary/unary operators return the first error
 *   operand unchanged; functions decide their own strictness.
 *
 * The evaluator is stateless between calls; a single shared instance is reused
 * across the whole grid.
 *
 * @packageDocumentation
 */

import { AstNode, AstNodeType, BinaryOperator, UnaryOperator } from '../parser/ast.types';
import type { EvalContext } from '../types/eval-context';
import type { FormulaValue, FormulaArgument } from '../types/formula.types';
import { isRangeRef } from '../reference/reference.types';
import { FormulaError, isFormulaError } from '../error/formula-error';
import { UNLIMITED_ARGS } from '../functions/formula-function';
import { toNumber, toText, compareValues, isMatrix } from './coerce';

export class Evaluator {
  /**
   * Evaluates `node` to a single scalar value, collapsing an incidental 1×1
   * matrix and rejecting wider matrices used in scalar position.
   *
   * @param node - The AST to evaluate.
   * @param ctx  - The evaluation context.
   * @returns The scalar result (possibly a {@link FormulaError}).
   */
  evaluate(node: AstNode, ctx: EvalContext): FormulaValue {
    return this.toScalar(this.evalArg(node, ctx));
  }

  /**
   * Evaluates `node` to an argument value — a scalar, or a {@link FormulaMatrix}
   * when the node is a range reference. This is what function arguments receive.
   *
   * @param node - The AST to evaluate.
   * @param ctx  - The evaluation context.
   */
  private evalArg(node: AstNode, ctx: EvalContext): FormulaArgument {
    switch (node.type) {
      case AstNodeType.Number:
        return node.value;
      case AstNodeType.String:
        return node.value;
      case AstNodeType.Boolean:
        return node.value;
      case AstNodeType.ErrorLiteral:
        return node.error;
      case AstNodeType.CellRef:
        return ctx.resolveCell(node.ref);
      case AstNodeType.RangeRef:
        return ctx.resolveRange(node.ref);
      case AstNodeType.Name:
        return this.evalName(node.name, ctx);
      case AstNodeType.Unary:
        return this.evalUnary(node.op, node.operand, ctx);
      case AstNodeType.Binary:
        return this.evalBinary(node.op, node.left, node.right, ctx);
      case AstNodeType.Function:
        return this.evalFunction(node.name, node.args, ctx);
    }
  }

  /** Collapses a 1×1 matrix to its cell; wider matrices are `#VALUE!`. */
  private toScalar(arg: FormulaArgument): FormulaValue {
    if (isMatrix(arg)) {
      if (arg.length === 1 && arg[0].length === 1) return arg[0][0];
      if (arg.length === 0 || arg[0].length === 0) return FormulaError.ref('empty range');
      return FormulaError.value('a range was used where a single value is expected');
    }
    return arg;
  }

  /** Resolves a bare name to a named range/cell value (or `#NAME?`). */
  private evalName(name: string, ctx: EvalContext): FormulaArgument {
    const ref = ctx.resolveName(name);
    if (ref === null) return FormulaError.nameError(`unknown name '${name}'`);
    return isRangeRef(ref) ? ctx.resolveRange(ref) : ctx.resolveCell(ref);
  }

  // ── Operators ──────────────────────────────────────────────────────────────

  private evalUnary(op: UnaryOperator, operandNode: AstNode, ctx: EvalContext): FormulaValue {
    const operand = this.evaluate(operandNode, ctx);
    if (isFormulaError(operand)) return operand;

    switch (op) {
      case UnaryOperator.Negate: {
        const n = toNumber(operand);
        return isFormulaError(n) ? n : -n;
      }
      case UnaryOperator.Plus:
        return toNumber(operand);
      case UnaryOperator.Percent: {
        const n = toNumber(operand);
        return isFormulaError(n) ? n : n / 100;
      }
    }
  }

  private evalBinary(op: BinaryOperator, leftNode: AstNode, rightNode: AstNode, ctx: EvalContext): FormulaValue {
    const left = this.evaluate(leftNode, ctx);
    if (isFormulaError(left)) return left;
    const right = this.evaluate(rightNode, ctx);
    if (isFormulaError(right)) return right;

    switch (op) {
      case BinaryOperator.Add:
      case BinaryOperator.Subtract:
      case BinaryOperator.Multiply:
      case BinaryOperator.Divide:
      case BinaryOperator.Power:
        return this.arithmetic(op, left, right);

      case BinaryOperator.Concat: {
        const a = toText(left);
        if (isFormulaError(a)) return a;
        const b = toText(right);
        if (isFormulaError(b)) return b;
        return a + b;
      }

      case BinaryOperator.Equal:
      case BinaryOperator.NotEqual:
      case BinaryOperator.LessThan:
      case BinaryOperator.LessThanOrEqual:
      case BinaryOperator.GreaterThan:
      case BinaryOperator.GreaterThanOrEqual:
        return this.comparison(op, left, right);
    }
  }

  private arithmetic(op: BinaryOperator, left: FormulaValue, right: FormulaValue): FormulaValue {
    const a = toNumber(left);
    if (isFormulaError(a)) return a;
    const b = toNumber(right);
    if (isFormulaError(b)) return b;

    switch (op) {
      case BinaryOperator.Add:
        return a + b;
      case BinaryOperator.Subtract:
        return a - b;
      case BinaryOperator.Multiply:
        return a * b;
      case BinaryOperator.Divide:
        return b === 0 ? FormulaError.div0() : a / b;
      case BinaryOperator.Power: {
        const r = Math.pow(a, b);
        return Number.isFinite(r) ? r : FormulaError.num('exponentiation overflow or invalid');
      }
      default:
        return FormulaError.value();
    }
  }

  private comparison(op: BinaryOperator, left: FormulaValue, right: FormulaValue): FormulaValue {
    const c = compareValues(left, right);
    if (isFormulaError(c)) return c;
    switch (op) {
      case BinaryOperator.Equal:
        return c === 0;
      case BinaryOperator.NotEqual:
        return c !== 0;
      case BinaryOperator.LessThan:
        return c < 0;
      case BinaryOperator.LessThanOrEqual:
        return c <= 0;
      case BinaryOperator.GreaterThan:
        return c > 0;
      case BinaryOperator.GreaterThanOrEqual:
        return c >= 0;
      default:
        return FormulaError.value();
    }
  }

  // ── Function calls ─────────────────────────────────────────────────────────

  private evalFunction(name: string, argNodes: readonly AstNode[], ctx: EvalContext): FormulaArgument {
    const fn = ctx.functions.get(name);
    if (!fn) return FormulaError.nameError(`unknown function '${name}'`);

    // Arity check before evaluating arguments would change short-circuit
    // semantics for functions like IF; evaluate lazily only where needed. Here
    // we evaluate all args eagerly except for the short-circuiting built-ins,
    // which are handled by dedicated function classes that re-enter the
    // evaluator via `ctx`. Standard functions get fully-evaluated args.
    const argc = argNodes.length;
    if (argc < fn.minArgs || (fn.maxArgs !== UNLIMITED_ARGS && argc > fn.maxArgs)) {
      return FormulaError.value(`${fn.name} expects ${this.describeArity(fn.minArgs, fn.maxArgs)} arguments, got ${argc}`);
    }

    const args: FormulaArgument[] = new Array(argc);
    for (let i = 0; i < argc; i++) args[i] = this.evalArg(argNodes[i], ctx);
    return fn.evaluate(args, ctx);
  }

  private describeArity(min: number, max: number): string {
    if (max === UNLIMITED_ARGS) return `at least ${min}`;
    if (min === max) return `exactly ${min}`;
    return `${min}–${max}`;
  }
}

/** A process-wide shared evaluator (stateless, safe to reuse). */
export const sharedEvaluator = new Evaluator();
