/**
 * Excel-style error value type for the Photon Grid Formula Engine.
 *
 * Formula evaluation **never throws** for user-facing error conditions —
 * instead an immutable {@link FormulaError} value flows through the evaluator
 * exactly like a number or string, so downstream operations can short-circuit
 * and the offending cell can render the familiar `#DIV/0!`-style token.
 *
 * @packageDocumentation
 */

/**
 * The canonical set of Excel/Sheets-compatible error codes surfaced by the
 * engine. Each maps 1:1 to a display token (its enum value).
 */
export enum FormulaErrorCode {
  /** Division by zero. */
  DIV0 = '#DIV/0!',
  /** A reference is invalid (e.g. points at a deleted row/column). */
  REF = '#REF!',
  /** An unrecognized name — unknown function or named range. */
  NAME = '#NAME?',
  /** A value is of the wrong type for the operation. */
  VALUE = '#VALUE!',
  /** A numeric operation produced an invalid/out-of-range number. */
  NUM = '#NUM!',
  /** A value is not available (e.g. a failed lookup). */
  NA = '#N/A',
  /** A circular reference was detected. */
  CIRC = '#CIRC!',
  /** A syntax error in the formula source (parse failure). */
  ERROR = '#ERROR!',
}

/**
 * An immutable error value produced during tokenizing, parsing or evaluation.
 *
 * It is a distinct class (not a bare string) so it can be reliably
 * distinguished from a legitimate cell string that merely *looks* like an error
 * token, and so it can carry an optional human-readable {@link message} for
 * tooltips/diagnostics without affecting equality by {@link code}.
 *
 * Instances are cheap and effectively singletons for the message-less common
 * case (see the static factories), keeping error propagation allocation-free on
 * the hot path.
 */
export class FormulaError {
  /**
   * @param code    - The machine-readable error code (and display token).
   * @param message - Optional human-readable detail for diagnostics/tooltips.
   */
  private constructor(
    readonly code: FormulaErrorCode,
    readonly message?: string,
  ) {}

  // ── Cached message-less singletons (hot-path, allocation-free) ────────────
  private static readonly SINGLETONS: Record<FormulaErrorCode, FormulaError> = {
    [FormulaErrorCode.DIV0]: new FormulaError(FormulaErrorCode.DIV0),
    [FormulaErrorCode.REF]: new FormulaError(FormulaErrorCode.REF),
    [FormulaErrorCode.NAME]: new FormulaError(FormulaErrorCode.NAME),
    [FormulaErrorCode.VALUE]: new FormulaError(FormulaErrorCode.VALUE),
    [FormulaErrorCode.NUM]: new FormulaError(FormulaErrorCode.NUM),
    [FormulaErrorCode.NA]: new FormulaError(FormulaErrorCode.NA),
    [FormulaErrorCode.CIRC]: new FormulaError(FormulaErrorCode.CIRC),
    [FormulaErrorCode.ERROR]: new FormulaError(FormulaErrorCode.ERROR),
  };

  /**
   * Returns a {@link FormulaError} for `code`. Without a `message` a shared
   * singleton is returned (no allocation); with one, a fresh instance is made.
   *
   * @param code    - The error code.
   * @param message - Optional diagnostic detail.
   */
  static of(code: FormulaErrorCode, message?: string): FormulaError {
    return message === undefined ? FormulaError.SINGLETONS[code] : new FormulaError(code, message);
  }

  /** `#DIV/0!` — division by zero. */
  static div0(message?: string): FormulaError { return FormulaError.of(FormulaErrorCode.DIV0, message); }
  /** `#REF!` — invalid reference. */
  static ref(message?: string): FormulaError { return FormulaError.of(FormulaErrorCode.REF, message); }
  /** `#NAME?` — unknown function or name. */
  static nameError(message?: string): FormulaError { return FormulaError.of(FormulaErrorCode.NAME, message); }
  /** `#VALUE!` — wrong value type. */
  static value(message?: string): FormulaError { return FormulaError.of(FormulaErrorCode.VALUE, message); }
  /** `#NUM!` — invalid number. */
  static num(message?: string): FormulaError { return FormulaError.of(FormulaErrorCode.NUM, message); }
  /** `#N/A` — value not available. */
  static na(message?: string): FormulaError { return FormulaError.of(FormulaErrorCode.NA, message); }
  /** `#CIRC!` — circular reference. */
  static circular(message?: string): FormulaError { return FormulaError.of(FormulaErrorCode.CIRC, message); }
  /** `#ERROR!` — syntax/parse error. */
  static syntax(message?: string): FormulaError { return FormulaError.of(FormulaErrorCode.ERROR, message); }

  /** The display token (e.g. `#DIV/0!`). */
  toString(): string {
    return this.code;
  }
}

/**
 * Type guard: `true` when `value` is a {@link FormulaError}.
 *
 * Used pervasively for error short-circuiting — most operators/functions return
 * the first error argument unchanged.
 *
 * @param value - Any candidate value.
 */
export function isFormulaError(value: unknown): value is FormulaError {
  return value instanceof FormulaError;
}
