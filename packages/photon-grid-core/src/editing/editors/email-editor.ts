/**
 * Email address entry.
 *
 * @packageDocumentation
 */

import { TextEditor, type TextEditorParams } from './text-editor';

/**
 * `cellEditorParams` for {@link EmailEditor}.
 *
 * Identical to {@link TextEditorParams} — an email field is a text field with a
 * stricter keyboard, not a different control — but named separately so a column
 * typed against it keeps documenting which editor it configures, and so the two
 * can diverge later without a breaking change.
 */
export interface EmailEditorParams extends TextEditorParams {}

/**
 * A text field declared as `type="email"`.
 *
 * The type attribute is the whole feature, and it earns its place: a phone
 * raises the `@`-bearing keyboard, the browser offers saved addresses through
 * autofill, and the field participates in native validity styling — none of
 * which the grid could provide by hand, and all of which are lost the moment the
 * column falls back to a plain text editor.
 *
 * Format checking stays with the column (`validation: { email: true }`, implied
 * by `type: 'email'`) rather than living here, so an Angular or React email
 * editor rejects exactly the same addresses as this one.
 *
 * Trimming is inherited and on by default: a trailing space copied in with an
 * address is never intentional and breaks every subsequent equality check.
 *
 * @example
 * ```ts
 * { field: 'contactEmail', type: 'email', editable: true, cellEditor: 'email' }
 * ```
 */
export class EmailEditor extends TextEditor {
  protected readonly modifier: string = 'email';
  protected inputType = 'email';
}
