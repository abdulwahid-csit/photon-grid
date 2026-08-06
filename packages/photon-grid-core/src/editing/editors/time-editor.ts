/**
 * Clock-time entry.
 *
 * @packageDocumentation
 */

import { toTimeInputValue } from './base/coercion';
import { InputCellEditor, resolveCommitOnChange } from './base/input-editor';

/** `cellEditorParams` for {@link TimeEditor}. */
export interface TimeEditorParams {
  /** Earliest selectable time, as `HH:mm` — constrains the native picker. */
  readonly min?: string;

  /** Latest selectable time, as `HH:mm`. */
  readonly max?: string;

  /**
   * Granularity in seconds.
   *
   * The control shows hours and minutes by default; `1` exposes seconds, `60`
   * pins entry to whole minutes, `900` to quarter hours.
   */
  readonly step?: number;

  /**
   * Commit the edit as soon as a time is picked, instead of waiting for `Enter`.
   *
   * The platform's clock is an OS-level popup, not part of the page: the `Enter`
   * that dismisses it is consumed by the popup and never dispatched as a
   * `keydown` the grid can see. Without this, the grid's `Enter`-to-commit
   * binding only ever observes the *second* press, so choosing a time takes two
   * `Enter`s. Committing from `change` instead makes one gesture pick *and*
   * close the editor, by mouse or by keyboard.
   *
   * @default true
   */
  readonly commitOnChange?: boolean;
}

/**
 * A native `<input type="time">` that commits clock text.
 *
 * ### Why it commits a string, not a `Date`
 * A time of day is not a moment. "The shop opens at 09:00" is true on every
 * date and in every zone; storing it as a `Date` forces an arbitrary day and an
 * arbitrary offset onto it, and the value then shifts when it crosses a time
 * zone or a daylight-saving boundary. So `HH:mm` (or `HH:mm:ss`, with a
 * {@link TimeEditorParams.step} that exposes seconds) goes in and comes back out
 * unchanged, and an empty field commits `null`.
 *
 * A column that genuinely stores an instant is a `datetime` column, and has
 * {@link DatetimeEditor}. Given one anyway — a `Date` or an ISO string — this
 * editor reads its UTC clock reading, matching the date editors rather than
 * silently disagreeing with them.
 *
 * Entering the cell opens the platform's clock as well as focusing the field —
 * see {@link InputCellEditor.openNativePicker} for why that attempt is guarded.
 * The session then closes on `change`, because the popup that produced the value
 * swallowed the keystroke that chose it — see
 * {@link TimeEditorParams.commitOnChange}.
 *
 * @example
 * ```ts
 * {
 *   field: 'opensAt',
 *   type: 'time',
 *   editable: true,
 *   cellEditor: 'time',
 *   cellEditorParams: { min: '06:00', max: '23:00', step: 900 },
 * }
 * ```
 */
export class TimeEditor extends InputCellEditor<string | null, TimeEditorParams> {
  protected readonly modifier = 'time';
  protected inputType = 'time';

  /** Carries the shared picker styling and enables {@link openNativePicker}. */
  protected readonly nativePicker = true;

  /**
   * Closes the session the moment a time is chosen — see
   * {@link TimeEditorParams.commitOnChange}.
   */
  protected commitsOnChange(): boolean {
    return resolveCommitOnChange(this.editorParams().commitOnChange);
  }

  /** Focuses the field and opens the clock, once the element is in the document. */
  afterGuiAttached(): void {
    this.focus();
    this.openNativePicker();
  }

  protected configureInput(element: HTMLInputElement | HTMLTextAreaElement): void {
    if (!(element instanceof HTMLInputElement)) return;

    const { min, max, step } = this.editorParams();
    if (min !== undefined) element.min = min;
    if (max !== undefined) element.max = max;
    if (step !== undefined) element.step = String(step);
  }

  /** The cell's value as the `HH:mm` text the control requires. */
  protected formatValue(value: string | null): string {
    return toTimeInputValue(value);
  }

  /** The clock text as shown, or `null` for an empty field. */
  protected parseText(text: string): string | null {
    return text === '' ? null : text;
  }
}
