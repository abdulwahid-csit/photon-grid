/**
 * Boolean entry as an ARIA switch.
 *
 * @packageDocumentation
 */

import { AbstractCellEditor } from './base/abstract-editor';
import { toBoolean } from './base/coercion';

/** `cellEditorParams` for {@link SwitchEditor}. */
export interface SwitchEditorParams {
  /**
   * Accessible label for the control.
   *
   * Defaults to the column header. A switch with no name is announced as "on,
   * switch" and nothing else, which does not identify the setting being changed.
   */
  readonly label?: string;

  /**
   * Close the session as soon as the switch is thrown.
   *
   * @default false. A switch reads as an immediate action, so turning this on
   *   usually matches the user's expectation; leave it off inside a row-level
   *   edit that should stay open across several fields.
   */
  readonly commitOnToggle?: boolean;
}

/**
 * A two-state switch that commits a real `boolean`.
 *
 * ### Switch, not checkbox
 * The distinction is not decorative. A checkbox means "this item is selected";
 * a switch means "this setting is on", takes effect immediately, and is
 * announced as `"on"` / `"off"` rather than `"checked"` / `"not checked"`. That
 * is exactly what `role="switch"` plus `aria-checked` conveys, and it is the
 * reason this is a separate editor rather than a skin over
 * {@link CheckboxEditor}.
 *
 * ### Built on a `<button>`
 * A `<div role="switch">` would need `tabindex`, its own key handling and its own
 * disabled semantics reinvented. A `<button type="button">` is focusable,
 * operable and disable-able already; only the state attribute is added. The
 * track and thumb are empty spans the theme draws — no icon and no colour is
 * decided here.
 *
 * ### Keys
 * `Space` and `Enter` both toggle, and both are consumed. That pairing is what
 * the ARIA switch pattern specifies, and it is what a `<button>` does natively —
 * so leaving `Enter` to the grid did not make it mean "commit and move on", it
 * made it mean *both*: the browser's own activation fired the toggle while the
 * grid, seeing the same keystroke, closed the session on top of it. Owning the
 * key here makes the outcome one thing instead of a race, and `Tab` remains the
 * unambiguous way out of the cell.
 *
 * @example
 * ```ts
 * {
 *   field: 'notificationsEnabled',
 *   type: 'boolean',
 *   editable: true,
 *   cellEditor: 'switch',
 *   cellEditorParams: { commitOnToggle: true },
 * }
 * ```
 */
export class SwitchEditor extends AbstractCellEditor<boolean, SwitchEditorParams> {
  private button!: HTMLButtonElement;

  /**
   * The live state.
   *
   * Held in a field rather than read back off `aria-checked` so the value is a
   * boolean at all times; an attribute round trip through `'true'` / `'false'`
   * is one string comparison away from a bug.
   */
  private checked = false;

  protected buildGui(): HTMLElement {
    this.checked = this.initialChecked();

    const button = document.createElement('button');
    // Never `submit`: an editor mounted inside a host application's <form> would
    // otherwise submit it every time the switch is thrown.
    button.type = 'button';
    button.className = 'pg-editor pg-editor--switch';
    button.setAttribute('role', 'switch');
    button.setAttribute('aria-label', this.accessibleLabel());

    const track = document.createElement('span');
    track.className = 'pg-editor__switch-track';
    const thumb = document.createElement('span');
    thumb.className = 'pg-editor__switch-thumb';
    track.appendChild(thumb);
    button.appendChild(track);

    this.on(button, 'click', () => this.toggle());
    this.on(button, 'keydown', (event) => this.onKeyDown(event));

    this.button = button;
    this.applyState();
    return button;
  }

  getValue(): boolean {
    return this.checked;
  }

  /**
   * The opening state: the cell's value, flipped when the session was opened by
   * typing `Space` over the cell — the user has already asked for the toggle.
   */
  private initialChecked(): boolean {
    const current = toBoolean(this.params.value);
    const toggledOnOpen = this.params.trigger === 'type' && this.params.eventKey === ' ';
    return toggledOnOpen ? !current : current;
  }

  /**
   * Consumes the two keys the ARIA switch pattern assigns to activation, and
   * leaves everything else — `Tab`, `Escape`, the arrows — to the grid.
   *
   * `preventDefault` matters for both: it stops `Space` scrolling the viewport,
   * and it suppresses the `<button>`'s own activation on `Enter`, which would
   * otherwise fire a `click` and toggle the switch a second time.
   */
  private onKeyDown(event: KeyboardEvent): void {
    const isSpace = event.key === ' ' || event.key === 'Spacebar';
    if (!isSpace && event.key !== 'Enter') return;

    event.preventDefault();
    event.stopPropagation();
    this.toggle();
  }

  /** Flips the switch, republishes its state, and commits when asked to. */
  private toggle(): void {
    this.checked = !this.checked;
    this.applyState();
    this.emit(this.checked);
    if (this.editorParams().commitOnToggle === true) this.params.commit();
  }

  /**
   * Mirrors the state into the attribute assistive technology reads and the
   * class the theme draws from — the two must never disagree, so they are
   * written together.
   */
  private applyState(): void {
    this.button.setAttribute('aria-checked', String(this.checked));
    this.button.classList.toggle('pg-editor--switch-on', this.checked);
  }

  /** The label announced for the control — see {@link SwitchEditorParams.label}. */
  private accessibleLabel(): string {
    return this.editorParams().label ?? this.accessibleName();
  }
}
