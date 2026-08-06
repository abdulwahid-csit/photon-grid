/**
 * Masked entry for secrets.
 *
 * @packageDocumentation
 */

import { InputCellEditor } from './base/input-editor';

/** `cellEditorParams` for {@link PasswordEditor}. */
export interface PasswordEditorParams {
  /**
   * Add a button that unmasks the field while the user checks what they typed.
   *
   * @default false. Worth turning on wherever the value is typed rather than
   *   pasted — masked entry is the largest single source of typos, and the user
   *   gets no chance to notice one. Leave it off for a shared screen, or where
   *   the surrounding rules forbid revealing the value at all.
   */
  readonly revealToggle?: boolean;

  /**
   * Accessible label for the reveal button while the value is masked.
   *
   * @default 'Show value'. The core ships no translation layer, so this is how a
   *   localised application supplies its own wording.
   */
  readonly revealLabel?: string;

  /**
   * Accessible label for the reveal button while the value is visible.
   *
   * @default 'Hide value'.
   */
  readonly hideLabel?: string;

  /** Hard cap on characters, enforced by the browser (paste included). */
  readonly maxLength?: number;

  /** Hint shown while the field is empty. */
  readonly placeholder?: string;
}

/**
 * A masked field, optionally with a reveal button.
 *
 * ### Never trimmed
 * Unlike every other text-like editor, this one commits the characters exactly
 * as typed. Whitespace is legal inside a secret, and stripping it produces the
 * worst possible failure: a value that looks correct on screen and is rejected
 * by whatever consumes it, with nothing visible to explain why.
 *
 * ### DOM shape
 * Without the toggle the root *is* the input, carrying
 * `pg-editor pg-editor--password`. With it, the root is a `pg-editor-group` row
 * — the same composite layout the range and colour editors use — holding the
 * input and a `pg-editor__reveal` button. Either way the input carries its own
 * `aria-label` (from {@link InputCellEditor}), because in the composite case the
 * host's label lands on the wrapper and the field itself would be unnamed.
 *
 * The button carries no markup of its own: its affordance comes from the
 * stylesheet, which keeps icon choice with the theme instead of baking an SVG
 * into the core, and it exposes `aria-pressed` plus a label so its state is
 * announced rather than merely drawn. It is `tabindex="-1"` and suppresses the
 * default action of `mousedown`, because moving focus out of the field would
 * close the session under `stopEditingWhenCellsLoseFocus` before the click ever
 * landed — the toggle is a mouse affordance, and keyboard users have no need to
 * tab through it on the way out of the cell.
 *
 * @example
 * ```ts
 * {
 *   field: 'apiKey',
 *   editable: true,
 *   cellEditor: 'password',
 *   cellEditorParams: { revealToggle: true, maxLength: 64 },
 * }
 * ```
 */
export class PasswordEditor extends InputCellEditor<string, PasswordEditorParams> {
  protected readonly modifier = 'password';
  protected inputType = 'password';

  /** The reveal button, when one was requested. */
  private toggle: HTMLButtonElement | null = null;

  protected configureInput(element: HTMLInputElement | HTMLTextAreaElement): void {
    this.applyTextAttributes(element, this.editorParams());
    // A password manager offering to fill a grid cell is noise at best, and at
    // worst writes an unrelated vault entry into the user's data.
    element.autocomplete = 'off';
    element.spellcheck = false;
    element.setAttribute('autocapitalize', 'off');
  }

  protected buildGui(): HTMLElement {
    const input = super.buildGui();
    if (this.editorParams().revealToggle !== true) return input;

    const wrapper = document.createElement('div');
    wrapper.className = 'pg-editor-group pg-editor-group--password';

    const toggle = document.createElement('button');
    // Never `submit`: an editor mounted inside a host application's <form> would
    // otherwise submit it the first time the user peeked at the value.
    toggle.type = 'button';
    toggle.className = 'pg-editor__reveal';
    toggle.tabIndex = -1;
    this.applyToggleState(toggle, false);

    this.on(toggle, 'mousedown', (event) => event.preventDefault());
    this.on(toggle, 'click', () => this.toggleReveal());

    wrapper.appendChild(input);
    wrapper.appendChild(toggle);
    this.toggle = toggle;

    return wrapper;
  }

  /** The secret exactly as typed — see the class note on trimming. */
  protected parseText(text: string): string {
    return text;
  }

  /** Flips masking, keeping the button's pressed state and label in step. */
  private toggleReveal(): void {
    const revealed = this.input.getAttribute('type') !== 'password';
    const next = !revealed;

    this.input.setAttribute('type', next ? 'text' : 'password');
    if (this.toggle) this.applyToggleState(this.toggle, next);
  }

  /** Writes the button's accessible state for the given reveal state. */
  private applyToggleState(toggle: HTMLButtonElement, revealed: boolean): void {
    const { revealLabel = 'Show value', hideLabel = 'Hide value' } = this.editorParams();

    toggle.setAttribute('aria-pressed', String(revealed));
    toggle.setAttribute('aria-label', revealed ? hideLabel : revealLabel);
    toggle.classList.toggle('pg-editor__reveal--active', revealed);
  }
}
