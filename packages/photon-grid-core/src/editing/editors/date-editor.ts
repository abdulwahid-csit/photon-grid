/**
 * Calendar-date entry.
 *
 * @packageDocumentation
 */

import { fromDateInputValue, toDateInputValue } from './base/coercion';
import { InputCellEditor, resolveCommitOnChange } from './base/input-editor';

/** `cellEditorParams` for {@link DateEditor}. */
export interface DateEditorParams {
  /**
   * Earliest selectable date, in any form the column's data uses — a `Date`, an
   * ISO string, or a timestamp.
   *
   * Constrains the native picker, which is a far better experience than
   * accepting a date and rejecting it on commit. Pair it with
   * `validation: { min }` when the rule must also hold for pasted or
   * programmatic values.
   */
  readonly min?: string | number | Date;

  /** Latest selectable date, in any form the column's data uses. */
  readonly max?: string | number | Date;

  /**
   * Commit the edit as soon as a date is picked, instead of waiting for `Enter`.
   *
   * The platform's calendar is an OS-level popup, not part of the page: the
   * `Enter` that dismisses it is consumed by the popup and never dispatched as a
   * `keydown` the grid can see. Without this, the grid's `Enter`-to-commit
   * binding only ever observes the *second* press, so choosing a date takes two
   * `Enter`s — the "it takes two Enters" report. Committing from `change`
   * instead makes one gesture pick *and* close the editor, by mouse or by
   * keyboard, which is what a spreadsheet does.
   *
   * @default true
   */
  readonly commitOnChange?: boolean;
}

/**
 * A native `<input type="date">` that commits an ISO string.
 *
 * ### Round trip
 * Accepts whatever the column stores — a `Date`, an ISO string, an epoch number
 * — and always commits a full ISO string, so a column edited once stops being a
 * mixture of representations. An empty field commits `null`, never the epoch or
 * an `Invalid Date`.
 *
 * ### Why UTC, specifically
 * `<input type="date">` carries a calendar date and no time zone. Reading it
 * back through the *local* calendar and serialising with `toISOString()` shifts
 * the day for every user west of Greenwich: a field showing `15 Mar` commits as
 * `14 Mar` in New York, and the cell then redraws with yesterday's date. Both
 * directions therefore pin to UTC, which makes the conversion lossless — the
 * date the user sees is the date that comes back out. This is the same rule the
 * legacy editor used (`new Date(value).toISOString().split('T')[0]`), stated
 * once in {@link toDateInputValue} and shared with the datetime editor.
 *
 * ### The picker opens with the editor
 * Entering the cell focuses the field *and* drops the calendar open, so picking
 * a date is one interaction rather than two. Guarded and non-fatal — see
 * {@link InputCellEditor.openNativePicker}.
 *
 * ### One `Enter`, not two
 * Because the calendar is an OS popup rather than page content, the `Enter` that
 * chooses a date inside it never reaches the grid. The session therefore closes
 * on the control's `change` event, which the browser fires for a mouse pick and
 * a keyboard pick alike — see {@link DateEditorParams.commitOnChange} for the
 * opt-out.
 *
 * @example
 * ```ts
 * {
 *   field: 'dueDate',
 *   type: 'date',
 *   editable: true,
 *   cellEditor: 'date',
 *   cellEditorParams: { min: '2024-01-01' },
 * }
 * ```
 */
export class DateEditor extends InputCellEditor<string | null, DateEditorParams> {
  protected readonly modifier = 'date';
  protected inputType = 'date';

  /** Carries the shared picker styling and enables {@link openNativePicker}. */
  protected readonly nativePicker = true;

  /**
   * Closes the session the moment a date is chosen — see
   * {@link DateEditorParams.commitOnChange}.
   */
  protected commitsOnChange(): boolean {
    return resolveCommitOnChange(this.editorParams().commitOnChange);
  }

  /**
   * Focuses the field and opens the calendar, now that the element is in the
   * document and the browser has something to anchor the picker to.
   */
  afterGuiAttached(): void {
    this.focus();
    this.openNativePicker();
  }

  protected configureInput(element: HTMLInputElement | HTMLTextAreaElement): void {
    if (!(element instanceof HTMLInputElement)) return;

    const { min, max } = this.editorParams();
    if (min !== undefined) element.min = toDateInputValue(min);
    if (max !== undefined) element.max = toDateInputValue(max);
  }

  /** The cell's value as the `yyyy-MM-dd` text the control requires. */
  protected formatValue(value: string | null): string {
    return toDateInputValue(value);
  }

  /** The selected date as a full ISO string, or `null` for an empty field. */
  protected parseText(text: string): string | null {
    return fromDateInputValue(text);
  }
}
