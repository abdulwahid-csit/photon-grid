/**
 * URL entry.
 *
 * @packageDocumentation
 */

import { TextEditor, type TextEditorParams } from './text-editor';

/**
 * `cellEditorParams` for {@link UrlEditor}.
 *
 * Identical to {@link TextEditorParams} today; named separately so a column
 * documents which editor it configures and so the two can diverge without a
 * breaking change.
 */
export interface UrlEditorParams extends TextEditorParams {}

/**
 * A text field declared as `type="url"`.
 *
 * Buys the URL-oriented mobile keyboard (a visible `/` and `.com`), autofill of
 * previously entered addresses, and native validity state, for the cost of one
 * attribute. Whether the address is *acceptable* remains the column's decision
 * (`validation: { url: true }`, implied by `type: 'url'`), so every framework's
 * editors agree on it.
 *
 * @example
 * ```ts
 * {
 *   field: 'website',
 *   type: 'url',
 *   editable: true,
 *   cellEditor: 'url',
 *   cellEditorParams: { placeholder: 'https://…' },
 * }
 * ```
 */
export class UrlEditor extends TextEditor {
  protected readonly modifier: string = 'url';
  protected inputType = 'url';
}
