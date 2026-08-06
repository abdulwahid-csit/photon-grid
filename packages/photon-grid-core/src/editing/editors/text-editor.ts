/**
 * The default editor: a single-line text field.
 *
 * @packageDocumentation
 */

import { InputCellEditor } from './base/input-editor';

/**
 * `cellEditorParams` for {@link TextEditor}.
 *
 * Every member is optional — a text column that declares nothing gets sensible
 * behaviour, which is why this is the editor the grid falls back to.
 */
export interface TextEditorParams {
  /**
   * Hard cap on the number of characters, enforced by the browser so a paste
   * cannot exceed it either.
   *
   * Prefer this over `validation.maxLength` when the limit is a storage
   * constraint: refusing the keystroke is friendlier than accepting the text and
   * rejecting it at commit. Use both when you want the field to stop *and* the
   * message to explain why.
   */
  readonly maxLength?: number;

  /** Hint shown while the field is empty. */
  readonly placeholder?: string;

  /**
   * Strip leading and trailing whitespace from the committed value.
   *
   * @default true — invisible whitespace is almost always an accident of
   *   copy-paste, and it silently breaks grouping, sorting and equality checks
   *   later on. Set `false` for a column where whitespace is data (fixed-width
   *   codes, deliberate indentation).
   */
  readonly trim?: boolean;

  /**
   * Present the existing text selected when the editor opens, so the first
   * keystroke replaces it.
   *
   * @default true — the spreadsheet convention. Set `false` for a long value the
   *   user usually amends rather than rewrites, where an accidental keystroke
   *   wiping the field is the worse failure.
   */
  readonly selectOnFocus?: boolean;
}

/**
 * A single-line text field, and the editor every column gets unless it asks for
 * another.
 *
 * Deliberately thin: it is a native `<input type="text">`, which means the
 * platform contributes spellcheck, autofill, IME composition, mobile keyboards
 * and text selection without the grid re-implementing any of them. The only
 * behaviour added on top is the opening state described in
 * {@link InputCellEditor} and the trim.
 *
 * @example
 * ```ts
 * {
 *   field: 'sku',
 *   editable: true,
 *   cellEditor: 'text',
 *   cellEditorParams: { maxLength: 32, placeholder: 'ABC-0000', trim: true },
 * }
 * ```
 */
export class TextEditor extends InputCellEditor<string, TextEditorParams> {
  /**
   * Annotated `string` rather than left to infer `'text'`, so the typed-input
   * editors that specialise this class can re-declare it.
   */
  protected readonly modifier: string = 'text';

  protected configureInput(element: HTMLInputElement | HTMLTextAreaElement): void {
    this.applyTextAttributes(element, this.editorParams());
  }

  /**
   * The text, trimmed unless the column opted out.
   *
   * Trimming here rather than in a validation rule means the *stored* value is
   * clean, not merely accepted — a rule can only reject, it cannot correct.
   */
  protected parseText(text: string): string {
    return this.editorParams().trim === false ? text : text.trim();
  }

  protected selectsOnFocus(): boolean {
    return this.editorParams().selectOnFocus !== false;
  }
}
