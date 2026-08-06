/**
 * Date-and-time entry.
 *
 * @packageDocumentation
 */

import { fromDatetimeInputValue, toDatetimeInputValue } from './base/coercion';
import { InputCellEditor, resolveCommitOnChange } from './base/input-editor';

/** `cellEditorParams` for {@link DatetimeEditor}. */
export interface DatetimeEditorParams {
  /**
   * Earliest selectable moment, in any form the column's data uses — a `Date`,
   * an ISO string, or a timestamp. Constrains the native picker.
   */
  readonly min?: string | number | Date;

  /** Latest selectable moment, in any form the column's data uses. */
  readonly max?: string | number | Date;

  /**
   * Granularity of the seconds field, in seconds.
   *
   * Omitted, the control shows hours and minutes only — which is what a
   * scheduling column wants. Set `1` to expose seconds.
   */
  readonly step?: number;

  /**
   * Commit the edit as soon as a moment is picked, instead of waiting for
   * `Enter`.
   *
   * The platform's date-time picker is an OS-level popup, not part of the page:
   * the `Enter` that dismisses it is consumed by the popup and never dispatched
   * as a `keydown` the grid can see. Without this, the grid's `Enter`-to-commit
   * binding only ever observes the *second* press, so choosing a moment takes
   * two `Enter`s. Committing from `change` instead makes one gesture pick *and*
   * close the editor, by mouse or by keyboard.
   *
   * @default true
   */
  readonly commitOnChange?: boolean;
}

/**
 * A native `<input type="datetime-local">` that commits an ISO string.
 *
 * Shares the date editor's contract exactly: any of `Date` / ISO string /
 * timestamp goes in, a full ISO string (or `null`) comes out, and the
 * conversion is pinned to UTC in both directions so it is lossless — see
 * {@link DateEditor} for why local-calendar handling silently shifts the value.
 *
 * The control's own format is an ISO string minus its seconds and zone suffix
 * (`yyyy-MM-ddTHH:mm`), which is why the seconds are added back on the way out
 * rather than being dropped from the stored value.
 *
 * Entering the cell opens the native picker as well as focusing the field, so
 * choosing a moment is one interaction — see
 * {@link InputCellEditor.openNativePicker} for why that attempt is guarded. It
 * shares the date editor's one-`Enter` rule too: the session closes on `change`,
 * because the popup that produced the value swallowed the keystroke that chose
 * it — see {@link DatetimeEditorParams.commitOnChange}.
 *
 * @example
 * ```ts
 * {
 *   field: 'startsAt',
 *   type: 'datetime',
 *   editable: true,
 *   cellEditor: 'datetime',
 *   cellEditorParams: { min: new Date() },
 * }
 * ```
 */
export class DatetimeEditor extends InputCellEditor<string | null, DatetimeEditorParams> {
  protected readonly modifier = 'datetime';
  protected inputType = 'datetime-local';

  /** Carries the shared picker styling and enables {@link openNativePicker}. */
  protected readonly nativePicker = true;

  /**
   * Closes the session the moment a value is chosen — see
   * {@link DatetimeEditorParams.commitOnChange}.
   */
  protected commitsOnChange(): boolean {
    return resolveCommitOnChange(this.editorParams().commitOnChange);
  }

  /** Focuses the field and opens the picker, once the element is in the document. */
  afterGuiAttached(): void {
    this.focus();
    this.openNativePicker();
  }

  protected configureInput(element: HTMLInputElement | HTMLTextAreaElement): void {
    if (!(element instanceof HTMLInputElement)) return;

    const { min, max, step } = this.editorParams();
    if (min !== undefined) element.min = toDatetimeInputValue(min);
    if (max !== undefined) element.max = toDatetimeInputValue(max);
    if (step !== undefined) element.step = String(step);
  }

  /** The cell's value as the `yyyy-MM-ddTHH:mm` text the control requires. */
  protected formatValue(value: string | null): string {
    return toDatetimeInputValue(value);
  }

  /** The selected moment as a full ISO string, or `null` for an empty field. */
  protected parseText(text: string): string | null {
    return fromDatetimeInputValue(text);
  }
}
