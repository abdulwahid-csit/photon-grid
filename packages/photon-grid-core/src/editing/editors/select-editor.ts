/**
 * Single-choice entry from a fixed list.
 *
 * @packageDocumentation
 */

import type { ColumnDropdownOption } from '../../types/column.types';
import { AbstractCellEditor, type EditorParams } from './base/abstract-editor';
import { resolveCommitOnChange, showNativePicker } from './base/input-editor';

/**
 * Label for the blank choice when the column supplied none.
 *
 * An `<option>` with empty text is announced as nothing at all: the user hears
 * the option count, hears silence, and cannot tell whether the list is broken or
 * the entry is deliberate. A word — even an untranslated one — is strictly more
 * informative, and a column that cares supplies its own through
 * {@link SelectEditorParams.placeholder}.
 */
const DEFAULT_PLACEHOLDER = 'Select…';


/**
 * The bag the {@link SelectEditorParams.options} function form receives — the
 * full editor params, so an option list can depend on the row being edited
 * ("which warehouses stock *this* product").
 */
export type SelectOptionsContext = EditorParams<unknown, SelectEditorParams>;

/** `cellEditorParams` for {@link SelectEditor}. */
export interface SelectEditorParams {
  /**
   * The choices, either literal or computed per cell.
   *
   * Omit it and the editor falls back to `ColumnDef.dropdownOptions`, then to
   * `ColumnDef.enumOptions` — the two places a column already declares its
   * domain. A column that has either of those needs no `cellEditorParams` at
   * all, and the same list drives the cell's badge renderer and its set filter,
   * so the three cannot drift apart.
   */
  readonly options?:
    | readonly ColumnDropdownOption[]
    | ((context: SelectOptionsContext) => readonly ColumnDropdownOption[]);

  /**
   * For a column whose cells hold objects: the property that identifies the
   * option. Defaults to `ColumnDef.objectValueKey`, then to `'value'`.
   *
   * When the cell value is an object, the *option object* is committed rather
   * than its key, so the cell keeps whatever else it carried (a label, a colour,
   * an id) instead of collapsing to a bare string.
   */
  readonly valueKey?: string;

  /**
   * Label for the blank choice. Shown only when a blank choice is present — see
   * {@link allowEmpty}.
   *
   * @default 'Select…' — a blank choice with no text is announced as an empty
   *   option, which is indistinguishable from a rendering fault. Supply your own
   *   wording here; the core ships no translation layer.
   */
  readonly placeholder?: string;

  /**
   * Offer a blank choice, letting the user clear the cell.
   *
   * @default false, but a blank choice is added regardless when the cell's
   *   current value matches no option — see the class note on why that matters.
   */
  readonly allowEmpty?: boolean;

  /**
   * Commit the edit as soon as an option is picked, instead of waiting for
   * `Enter`.
   *
   * A `<select>`'s dropped-open list is an OS-level popup, not part of the page:
   * the `Enter` that chooses an option is consumed by the popup and never
   * dispatched as a `keydown` the grid can see. Without this, the grid's
   * `Enter`-to-commit binding only ever observes the *second* press, so choosing
   * an option takes two `Enter`s — the "it takes two Enters" report. Committing
   * from `change` instead makes one gesture pick *and* close the editor, by
   * mouse or by keyboard, which is what a spreadsheet does.
   *
   * Turn it off for a cell that participates in a row-level edit which should
   * stay open while several fields are set — or on the platforms noted on
   * {@link SelectEditor}, if the picker never opens there.
   *
   * @default true
   */
  readonly commitOnChange?: boolean;
}

/**
 * A native `<select>` over a column's option list.
 *
 * ### Why native
 * A custom listbox would be prettier and would cost keyboard support, type-ahead,
 * screen-reader semantics, and — on a phone — the platform's own wheel picker,
 * all of which would then have to be rebuilt and maintained. The native control
 * gets those right by construction, and a column that genuinely needs search or
 * remote options has {@link AutocompleteEditor} instead.
 *
 * ### The unmatched-value trap
 * A `<select>` cannot represent a value that is not one of its options: assigning
 * one leaves the first option selected. Opening such a cell and pressing `Enter`
 * would then rewrite the data to that first option — a silent corruption caused
 * purely by looking at the cell. This editor therefore prepends a blank choice
 * whenever the current value matches nothing, so the unmatched state is visible
 * and committing changes only what the user actually picked. That choice carries
 * real text ({@link DEFAULT_PLACEHOLDER}) rather than an empty string, because an
 * unlabelled option is announced as silence.
 *
 * ### The list opens with the editor
 * Entering the cell drops the list open, so choosing is one interaction rather
 * than "click to edit, click to open". The attempt is feature-detected and
 * guarded — see {@link showNativePicker} — because a browser without
 * `showPicker` must still give a focused, keyboard-operable `<select>`.
 *
 * ### One `Enter`, not two
 * The dropped-open list is drawn by the operating system, so the `Enter` that
 * chooses an option inside it is consumed there and never reaches the page. The
 * session therefore closes on the control's `change` event, which fires for a
 * mouse pick and a keyboard pick alike — see
 * {@link SelectEditorParams.commitOnChange}.
 *
 * The one platform caveat: where arrowing a *closed* `<select>` changes its
 * value, each arrow keystroke fires `change`, and this editor would commit on
 * the first of them. That path is not the normal one here precisely because
 * {@link afterGuiAttached} opens the picker — an open list arrows without firing
 * `change` until a choice is made. A column that must tolerate the closed-list
 * case anyway sets `commitOnChange: false`.
 *
 * ### Width comes from the stylesheet
 * The control carries no inline width and no `size` attribute, so it takes the
 * `width: 100%` the theme gives `.pg-editor--select` and fills its cell. Setting
 * either here would pin the editor to its longest option's intrinsic width and
 * make it disagree with the column it is sitting in.
 *
 * @example
 * ```ts
 * {
 *   field: 'status',
 *   editable: true,
 *   cellEditor: 'select',
 *   dropdownOptions: [
 *     { value: 'draft', label: 'Draft' },
 *     { value: 'live', label: 'Live' },
 *   ],
 *   cellEditorParams: { allowEmpty: true, placeholder: '— none —' },
 * }
 * ```
 */
export class SelectEditor extends AbstractCellEditor<unknown, SelectEditorParams> {
  private select!: HTMLSelectElement;

  /** The resolved choices, in display order. Fixed for the session. */
  private options: readonly ColumnDropdownOption[] = [];

  /**
   * Whether the cell holds an object, in which case the whole option object is
   * committed rather than its key. Decided once, from the incoming value and the
   * column's type, so it cannot change midway through a session.
   */
  private objectValued = false;

  protected buildGui(): HTMLElement {
    this.options = this.resolveOptions();
    this.objectValued = this.isObjectValued();

    const select = document.createElement('select');
    // No `pg-editor--picker` here: that modifier is the *input* editors' shared
    // treatment, and a `<select>` draws its own indicator that must not be
    // restyled to match theirs.
    select.className = 'pg-editor pg-editor--select';
    select.setAttribute('aria-label', this.accessibleName());

    const currentKey = this.currentKey();
    const matched = this.options.some((option) => String(option.value) === currentKey);

    if (this.editorParams().allowEmpty === true || !matched) {
      select.appendChild(
        this.buildOption('', this.editorParams().placeholder ?? DEFAULT_PLACEHOLDER, !matched),
      );
    }
    for (const option of this.options) {
      select.appendChild(
        this.buildOption(String(option.value), option.label, String(option.value) === currentKey),
      );
    }

    this.on(select, 'change', () => this.onChange());

    this.select = select;
    return select;
  }

  /**
   * Reports the picked option and, unless the column opted out, closes the
   * session with it.
   *
   * Both halves live on `change` and nowhere else: it is the only event the
   * native popup emits for a choice, and it is emitted for a mouse pick and a
   * keyboard pick alike. Committing here is safe re-entrantly because
   * {@link AbstractCellEditor.requestCommit} is one-shot — a trailing `change`
   * dispatched at the element while the commit is tearing the editor down
   * cannot start a second one.
   */
  private onChange(): void {
    this.emit(this.getValue());
    if (resolveCommitOnChange(this.editorParams().commitOnChange)) this.requestCommit();
  }

  /**
   * Focuses the control and drops the list open, so the choices are on screen
   * without a second click.
   *
   * Deferred to this hook rather than done in `init` because a `<select>` that is
   * not yet in the document has nowhere to anchor its list, and `showPicker`
   * rejects a disconnected element outright.
   */
  afterGuiAttached(): void {
    this.focus();
    showNativePicker(this.select);
  }

  /**
   * The chosen option's value — or the option object itself for an
   * object-valued column, and `null` when the blank choice is selected.
   */
  getValue(): unknown {
    const chosen = this.select.value;
    if (chosen === '') return null;

    const option = this.options.find((candidate) => String(candidate.value) === chosen);
    if (!option) return chosen;

    return this.objectValued ? option : option.value;
  }

  /** Builds one `<option>`. */
  private buildOption(value: string, label: string, selected: boolean): HTMLOptionElement {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = selected;
    return option;
  }

  /**
   * Resolves the option list from the editor's params, then the column's
   * `dropdownOptions`, then its `enumOptions` — see
   * {@link SelectEditorParams.options}.
   */
  private resolveOptions(): readonly ColumnDropdownOption[] {
    const declared = this.editorParams().options;
    if (typeof declared === 'function') return declared(this.params);
    if (declared) return declared;

    const { dropdownOptions, enumOptions } = this.params.colDef;
    if (dropdownOptions && dropdownOptions.length > 0) return dropdownOptions;
    if (enumOptions) return enumOptions.map((value) => ({ value, label: value }));

    return [];
  }

  /** The cell's value reduced to the string key an `<option>` can carry. */
  private currentKey(): string {
    const { value } = this.params;
    if (value === null || value === undefined) return '';

    if (typeof value === 'object') {
      const key = this.editorParams().valueKey ?? this.params.colDef.objectValueKey ?? 'value';
      const identifier = (value as Record<string, unknown>)[key];
      return identifier === null || identifier === undefined ? '' : String(identifier);
    }

    return String(value);
  }

  /** Whether this column stores option objects rather than bare keys. */
  private isObjectValued(): boolean {
    if (this.params.colDef.type === 'object') return true;
    const { value } = this.params;
    return typeof value === 'object' && value !== null;
  }
}
