/**
 * Token type declarations for the formula tokenizer.
 *
 * These describe the lexical units the tokenizer (Phase 2) emits from a formula
 * source string. Keeping them here — separate from the scanning logic — lets the
 * parser depend only on the token *shape*.
 *
 * @packageDocumentation
 */

/** The lexical category of a {@link Token}. */
export enum TokenType {
  /** A numeric literal, e.g. `42`, `3.14`. */
  Number = 'number',
  /** A quoted string literal (quotes stripped, escapes resolved). */
  String = 'string',
  /** A boolean literal `TRUE` / `FALSE`. */
  Boolean = 'boolean',
  /** A bare identifier: a function name or a named range. */
  Identifier = 'identifier',
  /** An `A1`-style cell reference token (possibly with `$` and sheet prefix). */
  Reference = 'reference',
  /** An arithmetic/comparison/text operator (`+ - * / ^ % & = <> < <= > >=`). */
  Operator = 'operator',
  /** `(` */
  LParen = 'lparen',
  /** `)` */
  RParen = 'rparen',
  /** `,` (or the configured argument separator). */
  Comma = 'comma',
  /** `:` range delimiter. */
  Colon = 'colon',
  /** An error literal typed directly into a formula, e.g. `#N/A`. */
  Error = 'error',
  /** End-of-input sentinel. */
  EOF = 'eof',
}

/**
 * A single lexical token with source-position metadata for precise error
 * reporting.
 */
export interface Token {
  /** The token category. */
  readonly type: TokenType;
  /** The raw matched text (for strings: the unescaped content). */
  readonly value: string;
  /** Zero-based start offset of the token in the source string. */
  readonly start: number;
  /** Zero-based end offset (exclusive) of the token in the source string. */
  readonly end: number;
}
