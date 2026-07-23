/**
 * The formula tokenizer: a single left-to-right scan turning a formula source
 * string into a flat {@link Token} array for the parser.
 *
 * Design goals (per Photon Grid's performance rules):
 * - **One pass, no per-token regex.** Scanning is done with `charCodeAt` and
 *   manual classification, so tokenizing a formula never allocates throwaway
 *   regex match objects or backtracks.
 * - **Configurable separators.** The argument separator (`,`) and decimal
 *   separator (`.`) come from {@link ResolvedFormulaConfig}, so locales using
 *   `;`/`,` are supported without code changes.
 * - **Error-tolerant.** An unrecognized character yields a single
 *   {@link FormulaError} rather than throwing, letting the parser surface a
 *   clean `#ERROR!`.
 *
 * The leading `=` (or `+`/`@` lead-in) of a formula is stripped by the caller
 * before tokenizing; this scanner sees only the expression body.
 *
 * @packageDocumentation
 */

import { Token, TokenType } from './token.types';
import type { ResolvedFormulaConfig } from '../config/formula-config';

const CC_0 = 48;
const CC_9 = 57;
const CC_A_UPPER = 65;
const CC_Z_UPPER = 90;
const CC_A_LOWER = 97;
const CC_Z_LOWER = 122;
const CC_DOLLAR = 36;
const CC_UNDERSCORE = 95;
const CC_DOT = 46;
const CC_QUOTE = 34; // "
const CC_SPACE = 32;
const CC_TAB = 9;
const CC_LF = 10;
const CC_CR = 13;
const CC_HASH = 35; // #

/** A tokenizer result: either the tokens, or the position of a scan error. */
export interface TokenizeResult {
  /** The scanned tokens (always terminated by an `EOF` token). */
  readonly tokens: Token[];
  /** Non-null when scanning hit an invalid character; carries its offset. */
  readonly error: { message: string; position: number } | null;
}

/**
 * Converts a formula body into tokens.
 *
 * The tokenizer is stateless between calls; a single shared instance is safe to
 * reuse across the whole grid.
 */
export class Tokenizer {
  /**
   * Scans `input` into tokens using the given configuration for separators.
   *
   * @param input  - The formula body (without the leading `=`).
   * @param config - Resolved config supplying decimal/argument separators.
   * @returns The token list plus an optional scan error.
   */
  tokenize(input: string, config: ResolvedFormulaConfig): TokenizeResult {
    const tokens: Token[] = [];
    const len = input.length;
    const argSep = config.argumentSeparator.charCodeAt(0);
    const decSep = config.decimalSeparator.charCodeAt(0);
    let i = 0;

    while (i < len) {
      const c = input.charCodeAt(i);

      // ── Whitespace (skip) ──────────────────────────────────────────────────
      if (c === CC_SPACE || c === CC_TAB || c === CC_LF || c === CC_CR) {
        i++;
        continue;
      }

      // ── String literal ─────────────────────────────────────────────────────
      if (c === CC_QUOTE) {
        const result = this.scanString(input, i);
        if (result === null) {
          return { tokens, error: { message: 'Unterminated string literal', position: i } };
        }
        tokens.push({ type: TokenType.String, value: result.value, start: i, end: result.end });
        i = result.end;
        continue;
      }

      // ── Number literal ─────────────────────────────────────────────────────
      // A leading decimal separator (e.g. `.5`) also starts a number.
      if (this.isDigit(c) || (c === decSep && i + 1 < len && this.isDigit(input.charCodeAt(i + 1)))) {
        const end = this.scanNumber(input, i, decSep);
        tokens.push({ type: TokenType.Number, value: input.slice(i, end), start: i, end });
        i = end;
        continue;
      }

      // ── Error literal (`#N/A`, `#REF!`, …) ─────────────────────────────────
      if (c === CC_HASH) {
        const end = this.scanErrorLiteral(input, i);
        if (end > i) {
          tokens.push({ type: TokenType.Error, value: input.slice(i, end), start: i, end });
          i = end;
          continue;
        }
      }

      // ── Reference or identifier ────────────────────────────────────────────
      // A run of letters/digits/$/_ . An `A1`-shaped run (optional `$`, letters,
      // optional `$`, digits) becomes a Reference; anything else an Identifier
      // (function name or named range). Sheet-qualified `Sheet1!A1` is handled
      // by keeping the run going across a single `!`.
      if (this.isRefStart(c)) {
        const end = this.scanWord(input, i);
        const raw = input.slice(i, end);
        tokens.push({
          type: this.looksLikeReference(raw) ? TokenType.Reference : TokenType.Identifier,
          value: raw,
          start: i,
          end,
        });
        i = end;
        continue;
      }

      // ── Punctuation & operators ────────────────────────────────────────────
      if (c === argSep) {
        tokens.push({ type: TokenType.Comma, value: ',', start: i, end: i + 1 });
        i++;
        continue;
      }

      switch (c) {
        case 40: // (
          tokens.push({ type: TokenType.LParen, value: '(', start: i, end: i + 1 });
          i++;
          continue;
        case 41: // )
          tokens.push({ type: TokenType.RParen, value: ')', start: i, end: i + 1 });
          i++;
          continue;
        case 58: // :
          tokens.push({ type: TokenType.Colon, value: ':', start: i, end: i + 1 });
          i++;
          continue;
      }

      // Multi/one-char operators: + - * / ^ % & = <> <= >= < >
      const opEnd = this.scanOperator(input, i);
      if (opEnd > i) {
        tokens.push({ type: TokenType.Operator, value: input.slice(i, opEnd), start: i, end: opEnd });
        i = opEnd;
        continue;
      }

      // ── Unrecognized character ─────────────────────────────────────────────
      return {
        tokens,
        error: { message: `Unexpected character '${input[i]}'`, position: i },
      };
    }

    tokens.push({ type: TokenType.EOF, value: '', start: len, end: len });
    return { tokens, error: null };
  }

  // ── Scanners ─────────────────────────────────────────────────────────────

  /** Scans a `"..."` string with `""` → `"` escaping. Returns `null` if unterminated. */
  private scanString(input: string, start: number): { value: string; end: number } | null {
    const len = input.length;
    let i = start + 1; // skip opening quote
    let value = '';
    while (i < len) {
      const c = input.charCodeAt(i);
      if (c === CC_QUOTE) {
        // Doubled quote is an escaped quote.
        if (i + 1 < len && input.charCodeAt(i + 1) === CC_QUOTE) {
          value += '"';
          i += 2;
          continue;
        }
        return { value, end: i + 1 }; // consume closing quote
      }
      value += input[i];
      i++;
    }
    return null;
  }

  /** Scans a numeric literal (digits, one decimal separator, scientific `e` notation). */
  private scanNumber(input: string, start: number, decSep: number): number {
    const len = input.length;
    let i = start;
    let seenDot = false;
    while (i < len) {
      const c = input.charCodeAt(i);
      if (this.isDigit(c)) {
        i++;
      } else if (c === decSep && !seenDot) {
        seenDot = true;
        i++;
      } else if ((c === 101 || c === 69) && i > start) {
        // 'e' / 'E' — scientific notation; allow an optional sign next.
        let j = i + 1;
        if (j < len && (input.charCodeAt(j) === 43 || input.charCodeAt(j) === 45)) j++;
        if (j < len && this.isDigit(input.charCodeAt(j))) {
          i = j;
        } else {
          break; // lone 'e' is not part of the number
        }
      } else {
        break;
      }
    }
    return i;
  }

  /** Scans an Excel error literal such as `#N/A`, `#REF!`, `#DIV/0!`. Returns end (== start if none). */
  private scanErrorLiteral(input: string, start: number): number {
    // Recognize the known tokens explicitly to avoid over-consuming.
    const known = ['#DIV/0!', '#REF!', '#NAME?', '#VALUE!', '#NUM!', '#N/A', '#CIRC!', '#ERROR!'];
    for (const tok of known) {
      if (input.startsWith(tok, start)) return start + tok.length;
    }
    return start;
  }

  /** Scans a word run: letters, digits, `$`, `_`, `.`, and a single `!` sheet separator. */
  private scanWord(input: string, start: number): number {
    const len = input.length;
    let i = start;
    let seenBang = false;
    while (i < len) {
      const c = input.charCodeAt(i);
      if (this.isWordChar(c)) {
        i++;
      } else if (c === 33 /* ! */ && !seenBang) {
        // Sheet separator, only once and only if followed by a ref start.
        if (i + 1 < len && this.isRefStart(input.charCodeAt(i + 1))) {
          seenBang = true;
          i++;
        } else break;
      } else {
        break;
      }
    }
    return i;
  }

  /** Scans a one- or two-character operator; returns end (== start if none). */
  private scanOperator(input: string, start: number): number {
    const c = input.charCodeAt(start);
    const next = start + 1 < input.length ? input.charCodeAt(start + 1) : -1;
    switch (c) {
      case 60: // <
        if (next === 62 || next === 61) return start + 2; // <> or <=
        return start + 1;
      case 62: // >
        if (next === 61) return start + 2; // >=
        return start + 1;
      case 43: // +
      case 45: // -
      case 42: // *
      case 47: // /
      case 94: // ^
      case 37: // %
      case 38: // &
      case 61: // =
        return start + 1;
    }
    return start;
  }

  // ── Character classification ─────────────────────────────────────────────

  private isDigit(c: number): boolean {
    return c >= CC_0 && c <= CC_9;
  }

  private isLetter(c: number): boolean {
    return (c >= CC_A_UPPER && c <= CC_Z_UPPER) || (c >= CC_A_LOWER && c <= CC_Z_LOWER);
  }

  private isRefStart(c: number): boolean {
    return this.isLetter(c) || c === CC_DOLLAR || c === CC_UNDERSCORE;
  }

  private isWordChar(c: number): boolean {
    return this.isLetter(c) || this.isDigit(c) || c === CC_DOLLAR || c === CC_UNDERSCORE || c === CC_DOT;
  }

  /**
   * Heuristic: does `raw` (a scanned word) look like an `A1` cell reference?
   * Accepts optional sheet prefix (`Sheet1!`), optional `$` anchors, one or more
   * letters, then one or more digits. `TRUE`/`FALSE` are excluded (handled as
   * booleans by the parser), as are pure-letter (`SUM`) and word tokens.
   */
  private looksLikeReference(raw: string): boolean {
    let s = raw;
    const bang = s.indexOf('!');
    if (bang !== -1) s = s.slice(bang + 1);
    let i = 0;
    const n = s.length;
    if (i < n && s.charCodeAt(i) === CC_DOLLAR) i++;
    const letterStart = i;
    while (i < n && this.isLetter(s.charCodeAt(i))) i++;
    if (i === letterStart) return false; // needs at least one letter
    if (i < n && s.charCodeAt(i) === CC_DOLLAR) i++;
    const digitStart = i;
    while (i < n && this.isDigit(s.charCodeAt(i))) i++;
    if (i === digitStart) return false; // needs at least one digit
    return i === n; // fully consumed → A1-shaped
  }
}

/** A process-wide shared tokenizer (stateless, safe to reuse). */
export const sharedTokenizer = new Tokenizer();
