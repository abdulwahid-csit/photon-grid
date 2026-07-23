/**
 * Public configuration surface for the Photon Grid Formula Engine.
 *
 * This type lives in `src/types` (alongside the other subsystem configs such as
 * `master-detail.types.ts` and `photon-ai.types.ts`) so it can be referenced by
 * {@link GridOptions} without pulling the whole formula engine into the grid's
 * type graph. Every field is optional; the engine applies sensible defaults via
 * its `ConfigurationManager`.
 *
 * @packageDocumentation
 */

import type { FormulaFunction } from '../formula/functions/formula-function';

/**
 * Grid-level options controlling the formula engine. Supplied as
 * `GridOptions.formula`.
 */
export interface FormulaConfig {
  /**
   * Master switch. When omitted or `false` the engine is inert (no parsing,
   * evaluation or graph maintenance) and cells behave as plain data.
   * @defaultValue false
   */
  enabled?: boolean;

  /**
   * When `true`, circular references are tolerated (the cycle resolves to the
   * last-known values rather than erroring). When `false`, cells in a cycle
   * resolve to `#CIRC!`.
   * @defaultValue false
   */
  allowCircularReference?: boolean;

  /**
   * When `true`, dependent cells recalculate automatically on any change. When
   * `false`, recalculation is deferred until `api.recalculate()` is called.
   * @defaultValue true
   */
  autoRecalculate?: boolean;

  /**
   * Enables the parsed-AST / value / range caches. Disable only for debugging.
   * @defaultValue true
   */
  enableCaching?: boolean;

  /**
   * Safety bound on dependency-chain depth; chains deeper than this yield
   * `#REF!` to guard against pathological graphs. `0`/omitted means unbounded.
   * @defaultValue 0 (unbounded)
   */
  maxDependencyDepth?: number;

  /**
   * Extra function names to treat as volatile (always recalculated), on top of
   * the built-in volatile set (`RAND`, `RANDBETWEEN`, `NOW`, `TODAY`).
   */
  volatileFunctions?: string[];

  /**
   * BCP-47 locale used by locale-sensitive functions/formatting.
   * @defaultValue 'en-US'
   */
  locale?: string;

  /**
   * Decimal separator recognized in numeric literals.
   * @defaultValue '.'
   */
  decimalSeparator?: string;

  /**
   * Argument separator between function arguments.
   * @defaultValue ','
   */
  argumentSeparator?: string;

  /**
   * When `true`, function names are matched case-sensitively.
   * @defaultValue false
   */
  caseSensitiveFunctions?: boolean;

  /**
   * Developer-supplied custom functions, registered at engine construction.
   * Each must implement {@link FormulaFunction}.
   */
  customFunctions?: FormulaFunction[];

  /**
   * Named ranges: a map of `name` → `A1` reference/range string
   * (e.g. `{ Salaries: 'B2:B100' }`).
   */
  namedRanges?: Record<string, string>;
}
