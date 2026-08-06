/**
 * Multi-line text entry, in a popup.
 *
 * @packageDocumentation
 */

import { InputCellEditor } from './base/input-editor';

/** `cellEditorParams` for {@link TextareaEditor}. */
export interface TextareaEditorParams {
  /**
   * Visible lines, which is what sizes the popup.
   *
   * @default 3 — tall enough to show that the field is multi-line without
   *   burying the rows underneath it.
   */
  readonly rows?: number;

  /** Hard cap on characters, enforced by the browser (paste included). */
  readonly maxLength?: number;

  /** Hint shown while the field is empty. */
  readonly placeholder?: string;
}

/**
 * A `<textarea>` in a popup, for notes, descriptions and addresses.
 *
 * ### Why it is a popup
 * A row is one line tall. Editing a paragraph inside that box means the user
 * cannot see what they are writing, and growing the cell would reflow every row
 * below it mid-edit. Mounting outside the grid's clipping context lets the
 * field be as tall as it needs to be while the grid underneath stays still.
 *
 * ### Divergence: `Enter` does not commit
 * Every other built-in editor commits on `Enter`, and this one must not — in a
 * multi-line field `Enter` is a newline, and a user pressing it to start a
 * second line would instead find their edit closed. So:
 *
 * - `Enter` inserts a newline (the session stays open).
 * - `Ctrl`/`Cmd` + `Enter` commits, which is the convention every comment box on
 *   the web already teaches.
 * - `Escape` cancels, unchanged.
 *
 * The first case is implemented by stopping the keystroke's propagation before
 * the grid's session controller sees it, rather than by asking the controller to
 * special-case this editor — the divergence belongs to the editor that wants it.
 *
 * @example
 * ```ts
 * {
 *   field: 'notes',
 *   editable: true,
 *   cellEditor: 'textarea',
 *   cellEditorParams: { rows: 6, maxLength: 2000, placeholder: 'Internal notes…' },
 * }
 * ```
 */
export class TextareaEditor extends InputCellEditor<string, TextareaEditorParams> {
  protected readonly modifier = 'textarea';
  protected readonly tag = 'textarea' as const;

  /** Larger than a cell, so it is mounted in a portal above the grid. */
  isPopup(): boolean {
    return true;
  }

  protected configureInput(element: HTMLInputElement | HTMLTextAreaElement): void {
    this.applyTextAttributes(element, this.editorParams());

    if (element instanceof HTMLTextAreaElement) {
      element.rows = this.editorParams().rows ?? 3;
    }

    this.on(element, 'keydown', (event) => this.onKeyDown(event));
  }

  /**
   * Reserves `Enter` for the text and promotes `Ctrl`/`Cmd` + `Enter` to the
   * commit — see the class note.
   */
  private onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      this.params.commit();
      return;
    }

    // Let the browser insert the newline, but keep the grid from reading this
    // as "the user is done".
    event.stopPropagation();
  }

  /** The text exactly as typed — whitespace and line breaks are the content here. */
  protected parseText(text: string): string {
    return text;
  }
}
