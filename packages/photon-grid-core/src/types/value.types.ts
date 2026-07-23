import type { ColumnDef } from './column.types';

/**
 * Value pipeline contracts for Photon Grid.
 *
 * A column's *value* flows through three optional, independently overridable
 * hooks — mirroring the model used by AG Grid and other enterprise grids:
 *
 * ```text
 *            ┌──────────────┐   read for sorting / filtering /
 *   data ──▶ │ valueGetter  │──▶ grouping / export / rendering
 *            └──────────────┘
 *            ┌──────────────┐
 *   display  │valueFormatter│──▶ human-readable string (cell text, tooltips)
 *            └──────────────┘
 *            ┌──────────────┐
 *   editing  │ valueSetter  │──▶ writes the edited value back into `data`
 *            └──────────────┘
 * ```
 *
 * All three are pure, framework-agnostic function contracts: they receive plain
 * data and return plain values, so Photon Core never needs a DOM or a UI
 * framework to evaluate them. When a hook is omitted the grid falls back to
 * direct (dot-notation aware) field access on the row's `data` object.
 *
 * @see {@link ColumnDef.valueGetter}
 * @see {@link ColumnDef.valueSetter}
 * @see {@link ColumnDef.valueFormatter}
 */

/**
 * Parameters passed to {@link ColumnDef.valueGetter}.
 *
 * A value getter derives a cell's logical value from the row's raw `data`.
 * It is invoked wherever the grid needs the *value* of a cell — rendering,
 * sorting, filtering, grouping, aggregation and export — so the derived value
 * stays consistent across every feature.
 */
export interface ValueGetterParams {
  /** The raw, un-transformed row data object backing this cell. */
  readonly data: Record<string, unknown>;
  /** The fully-normalized column definition the value is being read for. */
  readonly colDef: ColumnDef;
  /** Convenience alias for `colDef.field`. */
  readonly field: string;
  /**
   * Helper to read another field off the same row using Photon Grid's
   * dot-notation resolver (e.g. `getValue('address.city')`). Useful for
   * getters that combine several source fields.
   */
  readonly getValue: (field: string) => unknown;
  /**
   * The public {@link GridApi} instance, typed as `unknown` to keep the core
   * framework-agnostic and free of circular type references. Cast to `GridApi`
   * at the call site when needed.
   */
  readonly api: unknown;
}

/**
 * Parameters passed to {@link ColumnDef.valueSetter}.
 *
 * A value setter commits an edited value back into the row's `data`. It owns
 * the write entirely, enabling derived, nested or multi-field targets that a
 * plain `data[field] = value` assignment cannot express.
 */
export interface ValueSetterParams {
  /**
   * The row data object to mutate. The setter is expected to write the new
   * value into this object (directly or into a nested path).
   */
  readonly data: Record<string, unknown>;
  /** The parsed, validated value produced by the editor. */
  readonly newValue: unknown;
  /** The value immediately prior to the edit (as read by the value getter). */
  readonly oldValue: unknown;
  /** The fully-normalized column definition being edited. */
  readonly colDef: ColumnDef;
  /** Convenience alias for `colDef.field`. */
  readonly field: string;
  /** The public {@link GridApi} instance, typed as `unknown`. See {@link ValueGetterParams.api}. */
  readonly api: unknown;
}

/**
 * Parameters passed to {@link ColumnDef.valueFormatter}.
 *
 * A value formatter turns a cell's logical value (the output of the value
 * getter, or the raw field value) into the human-readable string shown to the
 * user. It affects presentation only — it never changes the stored value used
 * for sorting, filtering or editing.
 */
export interface ValueFormatterParams {
  /** The logical value to format (getter output, or raw field value). */
  readonly value: unknown;
  /** The raw row data object backing this cell. */
  readonly data: Record<string, unknown>;
  /** The fully-normalized column definition being formatted. */
  readonly colDef: ColumnDef;
  /** Convenience alias for `colDef.field`. */
  readonly field: string;
  /** The public {@link GridApi} instance, typed as `unknown`. See {@link ValueGetterParams.api}. */
  readonly api: unknown;
}

/**
 * Derives a cell's logical value from raw row data.
 *
 * @returns The value used by every downstream feature (render / sort / filter /
 *          group / export).
 * @see {@link ColumnDef.valueGetter}
 */
export type ValueGetterFn = (params: ValueGetterParams) => unknown;

/**
 * Writes an edited value back into the row's `data`.
 *
 * @returns `true` when the value was applied (the grid then emits a change
 *          event and refreshes), or `false` to signal that nothing changed and
 *          the grid should skip the update. Returning `undefined`/`void` is
 *          treated as `true` for author convenience.
 * @see {@link ColumnDef.valueSetter}
 */
export type ValueSetterFn = (params: ValueSetterParams) => boolean | void;

/**
 * Produces the display string for a cell's value.
 *
 * @returns The text rendered in the cell (and used as the default tooltip).
 * @see {@link ColumnDef.valueFormatter}
 */
export type ValueFormatterFn = (params: ValueFormatterParams) => string;
