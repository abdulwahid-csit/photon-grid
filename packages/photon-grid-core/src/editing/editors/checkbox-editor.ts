/**
 * Boolean entry as a native checkbox.
 *
 * @packageDocumentation
 */

import { AbstractCellEditor } from './base/abstract-editor';
import { toBoolean } from './base/coercion';

/** `cellEditorParams` for {@link CheckboxEditor}. */
export interface CheckboxEditorParams {
  /**
   * Accessible label for the control.
   *
   * A checkbox with no label is announced as an unnamed checkbox, which tells a
   * screen-reader user nothing about which column they are in. Defaults to the
   * column header, so the common case needs no configuration and the uncommon
   * one (a header of `"✓"`, or a checkbox meaning something narrower than its
   * column's title) can say what it means.
   */
  readonly label?: string;

  /**
   * Close the session as soon as the box is toggled.
   *
   * @default false. Turning it on makes a boolean column a one-click affair
   *   rather than click-then-`Enter`, which is what users expect of a checkbox
   *   grid; leave it off when the cell participates in a row-level edit that
   *   should stay open while several fields are set.
   */
  readonly commitOnToggle?: boolean;
}

/**
 * A native checkbox that commits a real `boolean`.
 *
 * ### Reading what the data actually holds
 * A "boolean" column is routinely fed `1`, `"true"`, `"Y"` or `""` by a back end
 * with no boolean type. Opening state therefore goes through the shared
 * {@link toBoolean} coercion rather than `!!value`, which would render the string
 * `"false"` as checked. Whatever came in, what goes out is `true` or `false` —
 * so a column edited once stops being a mixture of representations.
 *
 * ### Why `Space` is handled explicitly
 * A checkbox's native activation runs on `keyup`, and the grid's session
 * controller sees the `keydown` first — leaving it alone means either the grid
 * swallows the key or the two both act on it. Handling `keydown` here, and
 * stopping it, makes the editor the single owner of the keystroke while it is
 * open, and gives the same behaviour in every browser.
 *
 * @example
 * ```ts
 * {
 *   field: 'active',
 *   type: 'boolean',
 *   editable: true,
 *   cellEditor: 'checkbox',
 *   cellEditorParams: { commitOnToggle: true },
 * }
 * ```
 */
export class CheckboxEditor extends AbstractCellEditor<boolean, CheckboxEditorParams> {
  private checkbox!: HTMLInputElement;

  protected buildGui(): HTMLElement {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'pg-editor pg-editor--checkbox';
    checkbox.checked = this.initialChecked();
    checkbox.setAttribute('aria-label', this.accessibleLabel());

    this.on(checkbox, 'change', () => this.report());
    this.on(checkbox, 'keydown', (event) => this.onKeyDown(event));

    this.checkbox = checkbox;
    return checkbox;
  }

  getValue(): boolean {
    return this.checkbox.checked;
  }

  /**
   * The opening state: the cell's value, already flipped when the session was
   * opened by typing `Space` over the cell.
   *
   * Typing over a cell replaces its value in every other editor; for a boolean
   * the only replacement that means anything is the opposite one, and a user who
   * pressed `Space` has already committed to the toggle.
   */
  private initialChecked(): boolean {
    const current = toBoolean(this.params.value);
    const toggledOnOpen = this.params.trigger === 'type' && this.params.eventKey === ' ';
    return toggledOnOpen ? !current : current;
  }

  /**
   * Owns `Space` while the editor is open — see the class note.
   *
   * The toggle is performed here rather than left to the browser precisely
   * because the default action is suppressed to keep the grid from scrolling.
   */
  private onKeyDown(event: KeyboardEvent): void {
    if (event.key !== ' ' && event.key !== 'Spacebar') return;

    event.preventDefault();
    event.stopPropagation();
    this.checkbox.checked = !this.checkbox.checked;
    this.report();
  }

  /** Reports the new state, and closes the session when the column asked for it. */
  private report(): void {
    this.emit(this.checkbox.checked);
    if (this.editorParams().commitOnToggle === true) this.params.commit();
  }

  /** The label announced for the control — see {@link CheckboxEditorParams.label}. */
  private accessibleLabel(): string {
    return this.editorParams().label ?? this.accessibleName();
  }
}
