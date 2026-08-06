/**
 * Numeric entry.
 *
 * @packageDocumentation
 */

import { clamp, roundTo } from './base/coercion';
import { InputCellEditor } from './base/input-editor';

/** `cellEditorParams` for {@link NumberEditor}. */
export interface NumberEditorParams {
  /**
   * Inclusive lower bound. Falls back to `ColumnDef.min` when omitted, so a
   * column that already declared its range does not repeat itself.
   */
  readonly min?: number;

  /** Inclusive upper bound. Falls back to `ColumnDef.max`. */
  readonly max?: number;

  /**
   * Granularity of the native stepper and of the browser's own validity check.
   *
   * Left unset, it is derived from {@link precision}; with neither, the field
   * uses `step="any"` so a decimal is not flagged invalid by a stepper that
   * defaults to whole numbers.
   */
  readonly step?: number;

  /**
   * Decimal places the committed value is rounded to.
   *
   * Applied to the value, not merely to its display: a currency column with
   * `precision: 2` stores `10.24`, never `10.235999999999999`.
   */
  readonly precision?: number;

  /**
   * Allow values below zero.
   *
   * @default true. Setting `false` is equivalent to a lower bound of zero, and
   *   is the clearer way to say "a quantity" or "an amount".
   */
  readonly allowNegative?: boolean;

  /** Hint shown while the field is empty. */
  readonly placeholder?: string;
}

/**
 * A native numeric field that commits a `number` — or `null`, never `NaN`.
 *
 * ### The `NaN` guarantee
 * `Number('')` is `0`, `Number('abc')` is `NaN`, and `parseFloat('12abc')` is
 * `12`. Any of those reaching the data is a bug the user cannot see until a
 * total is wrong or a sort puts the row somewhere impossible — `NaN` compares
 * false against everything, including itself, so it poisons sorting, grouping,
 * filtering and every aggregation at once. This editor therefore has exactly two
 * possible outcomes: a finite number, or `null` for "no value". `getValue()`
 * cannot return anything else.
 *
 * ### Bounds and precision are applied, not just advertised
 * `min`, `max` and `step` go onto the element so the browser contributes its
 * stepper and its validity state, but they are also enforced in
 * {@link parseText}: the attributes are advisory (a paste or a programmatic set
 * bypasses them), and a grid that promises a range must keep it. Clamping
 * rather than rejecting is the deliberate choice — an out-of-range entry is
 * almost always a typo whose nearest legal value is what was meant, and a column
 * that would rather refuse the commit outright says so with
 * `validation: { min, max }`.
 *
 * @example
 * ```ts
 * {
 *   field: 'discount',
 *   editable: true,
 *   cellEditor: 'number',
 *   cellEditorParams: { min: 0, max: 100, precision: 2, allowNegative: false },
 * }
 * ```
 */
export class NumberEditor extends InputCellEditor<number | null, NumberEditorParams> {
  protected readonly modifier = 'number';
  protected inputType = 'number';

  protected configureInput(element: HTMLInputElement | HTMLTextAreaElement): void {
    if (!(element instanceof HTMLInputElement)) return;

    const { placeholder } = this.editorParams();
    if (placeholder !== undefined) element.placeholder = placeholder;

    const min = this.effectiveMin();
    const max = this.effectiveMax();
    if (min !== undefined) element.min = String(min);
    if (max !== undefined) element.max = String(max);
    element.step = this.effectiveStep();
  }

  /**
   * Parses the field, then rounds and clamps — see the class note on why both
   * happen here rather than being left to the element's attributes.
   *
   * @returns A finite number, or `null` for an empty or unparseable field.
   */
  protected parseText(text: string): number | null {
    const trimmed = text.trim();
    if (trimmed === '') return null;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;

    const rounded = roundTo(parsed, this.editorParams().precision);
    return clamp(rounded, this.effectiveMin(), this.effectiveMax());
  }

  protected formatValue(value: number | null): string {
    return value === null || value === undefined || !Number.isFinite(Number(value))
      ? ''
      : String(value);
  }

  /**
   * The lower bound actually in force: the editor's, the column's, or zero when
   * negatives are disallowed — whichever is highest.
   */
  private effectiveMin(): number | undefined {
    const { min, allowNegative } = this.editorParams();
    const declared = min ?? this.columnBound('min');

    if (allowNegative === false) return declared === undefined ? 0 : Math.max(declared, 0);
    return declared;
  }

  /** The upper bound actually in force: the editor's, else the column's. */
  private effectiveMax(): number | undefined {
    return this.editorParams().max ?? this.columnBound('max');
  }

  /**
   * `ColumnDef.min` / `ColumnDef.max`, which the legacy editor honoured and
   * existing columns still declare. `null` there means "unbounded", so it is
   * normalised away rather than passed on as a bound of zero.
   */
  private columnBound(key: 'min' | 'max'): number | undefined {
    const bound = this.params.colDef[key];
    return bound === null || bound === undefined ? undefined : bound;
  }

  /**
   * The stepper's granularity.
   *
   * `'any'` when nothing was declared: the HTML default of `1` marks every
   * decimal invalid, which paints a legitimate `10.50` as an error in a currency
   * column that simply never mentioned a step.
   */
  private effectiveStep(): string {
    const { step, precision } = this.editorParams();
    if (step !== undefined) return String(step);
    if (precision !== undefined) return String(10 ** -Math.max(0, Math.trunc(precision)));
    return 'any';
  }
}
