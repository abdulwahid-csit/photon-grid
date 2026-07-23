/**
 * Compilation front-end: `source string → AST`.
 *
 * Combines the {@link Tokenizer} and {@link Parser} behind one call, strips the
 * leading `=` that marks a formula, and normalizes both scan and parse failures
 * into a single {@link CompileResult}. This is the boundary the rest of the
 * engine (and the {@link ExpressionCache}) compiles through.
 *
 * @packageDocumentation
 */

import { sharedTokenizer } from './tokenizer/tokenizer';
import { sharedParser } from './parser/parser';
import type { AstNode } from './parser/ast.types';
import type { ResolvedFormulaConfig } from './config/formula-config';

/** The result of compiling a formula source string. */
export interface CompileResult {
  /** The parsed AST, or `null` on failure. */
  readonly ast: AstNode | null;
  /** Non-null on failure: a message and the source offset of the problem. */
  readonly error: { message: string; position: number } | null;
}

/**
 * Returns the expression body of a formula — everything after a single leading
 * `=`. Leading whitespace before the `=` is tolerated. A source without `=` is
 * returned unchanged (callers should have already decided it is a formula).
 *
 * @param source - The raw cell source (e.g. `"=SUM(A1:A2)"`).
 * @returns The body (`"SUM(A1:A2)"`).
 */
export function stripFormulaPrefix(source: string): string {
  let i = 0;
  while (i < source.length && (source.charCodeAt(i) === 32 || source.charCodeAt(i) === 9)) i++;
  if (source.charCodeAt(i) === 61 /* = */) return source.slice(i + 1);
  return source;
}

/**
 * `true` when `source` should be treated as a formula (starts, ignoring leading
 * whitespace, with `=`).
 *
 * @param source - The raw cell source.
 */
export function isFormulaSource(source: unknown): source is string {
  if (typeof source !== 'string') return false;
  let i = 0;
  while (i < source.length && (source.charCodeAt(i) === 32 || source.charCodeAt(i) === 9)) i++;
  return source.charCodeAt(i) === 61; // '='
}

/**
 * Tokenizes and parses a formula source into an AST.
 *
 * @param source - The raw formula source, including the leading `=`.
 * @param config - Resolved engine configuration (separators).
 * @returns The AST or a positioned error.
 */
export function compileFormula(source: string, config: ResolvedFormulaConfig): CompileResult {
  const body = stripFormulaPrefix(source);
  const scan = sharedTokenizer.tokenize(body, config);
  if (scan.error) return { ast: null, error: scan.error };
  return sharedParser.parse(scan.tokens, config);
}
