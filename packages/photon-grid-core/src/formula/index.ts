/**
 * Public barrel for the Photon Grid Formula Engine subsystem.
 *
 * Re-exported from the package root (`src/index.ts`) so consumers get the engine
 * facade, its extension contracts, error types and configuration surface without
 * reaching into internal module paths.
 *
 * @packageDocumentation
 */

// ── Facade ───────────────────────────────────────────────────────────────────
export { FormulaEngine } from './formula-engine';
export type { FormulaCellChange, RecalculationResult } from './formula-engine';
export type { FormulaGridAdapter } from './formula-grid-adapter';

// ── Declarative discovery (column-level + row-data formulas) ──────────────────
export { FormulaInitializer } from './formula-initializer';
export type {
  FormulaColumnInfo,
  FormulaRowInfo,
  FormulaInitializerOptions,
} from './formula-initializer';

// ── Calculation pipeline (dependency graph, ordering, recompute) ──────────────
export { CalculationEngine, SYSTEM_CLOCK } from './calc/calculation-engine';
export type { FormulaClock } from './calc/calculation-engine';
export { DependencyGraph } from './graph/dependency-graph';
export type { RangeDependency } from './graph/dependency-graph';
export { computeCalculationOrder } from './graph/cycle-detector';
export type { CalculationOrder } from './graph/cycle-detector';
export { ReferenceResolver, coerceGridValue } from './reference/reference-resolver';
export type { ResolvedDependencies } from './reference/reference-resolver';

// ── Configuration ────────────────────────────────────────────────────────────
export {
  ConfigurationManager,
  DEFAULT_FORMULA_CONFIG,
  BUILTIN_VOLATILE_FUNCTIONS,
} from './config/formula-config';
export type { ResolvedFormulaConfig } from './config/formula-config';

// ── Errors ───────────────────────────────────────────────────────────────────
export { FormulaError, FormulaErrorCode, isFormulaError } from './error/formula-error';

// ── Function extension contract ──────────────────────────────────────────────
export { FunctionCategory, UNLIMITED_ARGS } from './functions/formula-function';
export type { FormulaFunction } from './functions/formula-function';
export { FunctionRegistry } from './functions/function-registry';
export { createBuiltinFunctions, registerBuiltinFunctions } from './functions/builtins';
export type { EvalContext } from './types/eval-context';

// ── Evaluator & coercion ─────────────────────────────────────────────────────
export { Evaluator, sharedEvaluator } from './evaluator/evaluator';
export {
  toNumber,
  toText,
  toBoolean,
  numberToText,
  compareValues,
  scalarArg,
  isMatrix,
  forEachValue,
  collectNumbers,
} from './evaluator/coerce';

// ── Store ────────────────────────────────────────────────────────────────────
export { FormulaStore } from './store/formula-store';
export type { FormulaCell } from './store/formula-store';

// ── References ───────────────────────────────────────────────────────────────
export {
  columnLabelToIndex,
  columnIndexToLabel,
  parseCellRef,
  encodeCellRef,
} from './reference/cell-reference';
export type { CellRef, RangeRef, Reference } from './reference/reference.types';
export { isRangeRef } from './reference/reference.types';

// ── AST & tokens ─────────────────────────────────────────────────────────────
export { AstNodeType, BinaryOperator, UnaryOperator } from './parser/ast.types';
export type {
  AstNode,
  NumberLiteralNode,
  StringLiteralNode,
  BooleanLiteralNode,
  ErrorLiteralNode,
  CellRefNode,
  RangeRefNode,
  NameNode,
  UnaryOpNode,
  BinaryOpNode,
  FunctionCallNode,
} from './parser/ast.types';
export { TokenType } from './tokenizer/token.types';
export type { Token } from './tokenizer/token.types';

// ── Tokenizer / parser / compile ─────────────────────────────────────────────
export { Tokenizer, sharedTokenizer } from './tokenizer/tokenizer';
export type { TokenizeResult } from './tokenizer/tokenizer';
export { Parser, sharedParser } from './parser/parser';
export type { ParseResult } from './parser/parser';
export {
  compileFormula,
  stripFormulaPrefix,
  isFormulaSource,
} from './compile';
export type { CompileResult } from './compile';
export { extractReferences, containsVolatileFunction, extractNames } from './reference-extractor';

// ── Serialization / copy / fill / named ranges ───────────────────────────────
export { serializeFormula, serializeFormulaWithEquals } from './formula-serializer';
export { transposeFormula, transposeAst } from './formula-transposer';
export type { Offset } from './formula-transposer';
export { NamedRangeManager } from './named-range-manager';
export type { NamedRangeEntry } from './named-range-manager';

// ── Caching ──────────────────────────────────────────────────────────────────
export { ExpressionCache, DEFAULT_EXPRESSION_CACHE_CAPACITY } from './cache/expression-cache';

// ── Core value & identity types ──────────────────────────────────────────────
export {
  makeCellId,
  splitCellId,
  CELL_ID_DELIMITER,
} from './types/formula.types';
export type {
  CellId,
  FormulaScalar,
  FormulaValue,
  FormulaMatrix,
  FormulaArgument,
  FormulaState,
  FormulaStateEntry,
} from './types/formula.types';
