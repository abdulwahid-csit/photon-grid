/**
 * Colour entry: a native swatch, and optionally a free-text colour field beside
 * it.
 *
 * @packageDocumentation
 */

import type { ColorNotation, ParsedColor } from '../../color';
import { formatColor, parseColor } from '../../color';
import { AbstractCellEditor } from './base/abstract-editor';
import { DEFAULT_COLOUR } from './base/coercion';

/**
 * The notation an edited colour is written back in.
 *
 * @see {@link ColorEditorParams.outputFormat}
 */
export type ColorOutputFormat = ColorNotation | 'preserve';

/** `cellEditorParams` for {@link ColorEditor}. */
export interface ColorEditorParams {
  /**
   * Pair the swatch with a text field for the colour code.
   *
   * @default false. The swatch alone is what a colour cell needs: it shows the
   *   value, opens the platform picker, and is the whole control in one square.
   *   The paired field made the editor read as a *form* inside a row — two
   *   controls, a caret and a placeholder where the rest of the grid has one
   *   value — so it is now opt-in. Turn it on for a column where the exact code
   *   is the point: one a designer pastes from a brand guide, quotes in a ticket,
   *   or copies out to use elsewhere. When it is on the two controls stay in
   *   step, and a half-typed code never reaches the data.
   *
   *   The field accepts every notation the grid parses — `#f00`, `rgb(255 0 0)`,
   *   `hsl(0 100% 50%)`, `red` — not hex alone, so a value can be pasted in
   *   whatever form the user copied it.
   */
  readonly showHex?: boolean;

  /**
   * Colours offered as one-click swatches beneath the picker.
   *
   * The reason to supply them is consistency: left to the full picker, a
   * "brand colour" column accumulates a dozen near-identical blues. Values may
   * be written in any supported notation — each is parsed before it is used, so
   * a palette copied out of a design document works as pasted.
   */
  readonly presets?: readonly string[];

  /**
   * How the committed value is written.
   *
   * @default 'preserve' — the cell keeps the notation it already had, so editing
   *   one row of an `hsl()` column does not leave a single hex code sitting in
   *   the middle of it. A cell that was empty, or held something unparseable,
   *   falls back to hex.
   *
   *   Name a notation to normalise instead: `'hex'` for a column that feeds a
   *   `<input type="color">` elsewhere, `'rgb'` or `'hsl'` to match an API's
   *   expectations, `'name'` for a palette column that should read as keywords
   *   where one exists.
   */
  readonly outputFormat?: ColorOutputFormat;
}

/**
 * A colour swatch — plus, on request, a colour-code field and a preset row.
 *
 * ### The default is one control
 * `<input type="color">` is the platform's own picker: eyedropper, recent
 * colours, system palette, and a keyboard-reachable square that already shows
 * the cell's value. That is the entire editor a colour column needs, and it is
 * what an unconfigured column now gets. The two optional additions each answer a
 * specific need rather than being on by default:
 *
 * - {@link ColorEditorParams.showHex} for a column where the *code* matters and
 *   has to be typed, read back or pasted.
 * - {@link ColorEditorParams.presets} for a column that should converge on a
 *   fixed palette instead of the full spectrum.
 *
 * ### Every notation in, one notation out
 * Input is parsed through the shared colour parser, so the editor opens on the
 * right colour whether the cell holds `#f00`, `rgb(255 0 0)`, `hsl(0 100% 50%)`
 * or `red`. Output is governed by {@link ColorEditorParams.outputFormat}, which
 * preserves the cell's existing notation by default rather than rewriting the
 * column as hex one edit at a time.
 *
 * ### Alpha survives the picker
 * The native control has no alpha channel, so choosing a colour in it would
 * ordinarily flatten `rgba(255, 0, 0, 0.5)` to opaque red. The previous value's
 * alpha is carried onto the new colour instead — the user changed the hue, not
 * the transparency. Typing into the text field *does* set alpha, because there
 * the user wrote the whole value.
 *
 * ### Two views of one value
 * With the text field present the two controls are kept in step: any change to
 * either is written to the other, so they can never disagree about what the cell
 * holds.
 *
 * Text that is not yet a colour — `#ab` mid-typing — never reaches the data: the
 * committed value falls back to the last complete colour, so an interrupted edit
 * cannot blank a cell by accident. Clearing the field outright *does* commit
 * `null`, because that is an unambiguous instruction. Without the text field
 * there is no partial state to guard against, and an untouched empty cell still
 * commits `null` rather than the swatch's placeholder black.
 *
 * @example
 * ```ts
 * // The default: a single swatch.
 * { field: 'labelColor', type: 'color', editable: true }
 *
 * // A design-token column, where the code is the value.
 * {
 *   field: 'brandColor',
 *   type: 'color',
 *   editable: true,
 *   cellEditorParams: {
 *     showHex: true,
 *     outputFormat: 'hex',
 *     presets: ['#2563eb', '#16a34a', '#dc2626', '#f59e0b'],
 *   },
 * }
 * ```
 */
export class ColorEditor extends AbstractCellEditor<string | null, ColorEditorParams> {
  private swatch!: HTMLInputElement;

  /**
   * The colour-code field, or `null` when the column did not ask for one.
   *
   * Nullable rather than always-built-and-hidden: an input the user cannot see
   * is still in the tab order and still announced, so hiding one would trade a
   * visual problem for an accessibility one.
   */
  private field: HTMLInputElement | null = null;

  /**
   * The last complete colour seen, used while the text field holds a partial
   * one — and, with no text field, the whole of the editor's state.
   */
  private lastValid: ParsedColor | null = null;

  /**
   * The notation the cell arrived in, for `outputFormat: 'preserve'`.
   *
   * Captured once at `init` rather than tracked as the user types: the question
   * it answers is "what does this column store?", and the answer must not change
   * because somebody happened to paste a hex code into an `hsl()` column.
   */
  private sourceNotation: ColorNotation = 'hex';

  protected buildGui(): HTMLElement {
    const initial = parseColor(this.params.value);
    this.lastValid = initial;
    if (initial) this.sourceNotation = initial.notation;

    const gui = document.createElement('div');
    gui.className = 'pg-editor-group pg-editor-group--color';

    this.swatch = this.buildSwatch();
    gui.appendChild(this.swatch);

    if (this.editorParams().showHex === true) {
      this.field = this.buildField();
      gui.appendChild(this.field);
    }

    const presets = this.buildPresets();
    if (presets) gui.appendChild(presets);

    return gui;
  }

  /**
   * The colour in the column's notation, or `null` when the cell is empty.
   *
   * With a text field the field's text is the source of truth, so clearing it
   * clears the cell. Without one the answer is the last colour actually chosen —
   * *not* the swatch's own value, which the browser initialises to black for an
   * empty cell and which would otherwise write a colour the user never picked
   * into every empty row they merely looked at.
   */
  getValue(): string | null {
    if (!this.field) return this.write(this.lastValid);

    const text = this.field.value.trim();
    if (text === '') return null;

    return this.write(parseColor(text) ?? this.lastValid);
  }

  /**
   * Focuses the text field when there is one, so the colour can be typed
   * immediately; otherwise the swatch, which is the only control there is.
   */
  focus(): void {
    if (this.field) {
      this.field.focus();
      this.field.select();
      return;
    }

    this.swatch.focus();
  }

  /** Renders a colour in the notation this column commits. */
  private write(color: ParsedColor | null): string | null {
    if (!color) return null;

    const format = this.editorParams().outputFormat ?? 'preserve';
    return formatColor(color, format === 'preserve' ? this.sourceNotation : format);
  }

  /** The native picker. Reports through the same path as every other source. */
  private buildSwatch(): HTMLInputElement {
    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'pg-editor pg-editor--color';
    swatch.value = this.lastValid?.hex ?? DEFAULT_COLOUR;
    // The root is a group element, which the host labels; without its own name
    // this control is announced after the group's as an unnamed colour picker.
    swatch.setAttribute('aria-label', this.accessibleName());

    this.on(swatch, 'input', () => this.apply(swatch.value, 'swatch'));
    return swatch;
  }

  /**
   * The colour-code field.
   *
   * Long enough for the longest notation a user might paste —
   * `rgba(255, 255, 255, 0.999)` — rather than the seven characters hex needs,
   * which would silently truncate anything else.
   */
  private buildField(): HTMLInputElement {
    const field = document.createElement('input');
    field.type = 'text';
    field.className = 'pg-editor pg-editor--color-hex';
    field.value = this.write(this.lastValid) ?? '';
    field.maxLength = 32;
    field.placeholder = '#rrggbb';
    field.spellcheck = false;
    field.autocomplete = 'off';
    // Distinct from the swatch's name: two controls sharing one label are
    // announced identically and the user cannot tell which they are in. Named
    // for what it accepts, which since this editor started parsing every CSS
    // notation is a colour in any form — not a hex code specifically.
    field.setAttribute('aria-label', `${this.accessibleName()} colour value`);

    this.on(field, 'input', () => this.apply(field.value, 'text'));
    return field;
  }

  /**
   * The preset row, or `null` when the column supplied none.
   *
   * One delegated listener covers every swatch, and its `mousedown` default is
   * suppressed so clicking a preset never pulls focus out of the editor — which
   * would close the session before the click landed.
   */
  private buildPresets(): HTMLElement | null {
    const { presets } = this.editorParams();
    if (!presets || presets.length === 0) return null;

    const row = document.createElement('div');
    row.className = 'pg-editor__color-presets';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Colour presets');

    for (const preset of presets) {
      const colour = parseColor(preset);
      if (!colour) continue;

      const button = document.createElement('button');
      // Never `submit`: an editor mounted inside a host application's <form>
      // would otherwise submit it on the first preset click.
      button.type = 'button';
      button.className = 'pg-editor__color-preset';
      button.tabIndex = -1;
      button.setAttribute('data-color', colour.css);
      button.setAttribute('aria-label', preset);
      row.appendChild(button);
    }

    this.on(row, 'mousedown', (event) => event.preventDefault());
    this.on(row, 'click', (event) => {
      const button = (event.target as HTMLElement | null)?.closest('[data-color]');
      const colour = button?.getAttribute('data-color');
      if (colour) this.apply(colour, 'preset');
    });

    return row;
  }

  /**
   * Writes a colour to whichever controls did not originate it, then reports.
   *
   * The originating control is skipped deliberately: assigning to an input the
   * user is typing in would move their caret to the end of the field.
   */
  private apply(raw: string, source: 'swatch' | 'text' | 'preset'): void {
    const parsed = parseColor(raw);
    const colour = source === 'swatch' ? this.withPreviousAlpha(parsed) : parsed;

    if (colour) {
      this.lastValid = colour;
      if (source !== 'swatch') this.swatch.value = colour.hex;
      if (this.field && source !== 'text') this.field.value = this.write(colour) ?? '';
    } else if (raw.trim() === '') {
      this.lastValid = null;
    }

    this.emit(this.getValue());
  }

  /**
   * Re-applies the previous value's alpha to a colour chosen in the native
   * picker, which has no alpha channel of its own.
   *
   * Without this, opening the picker on a translucent cell and picking any
   * colour would silently make it opaque — a change the user never asked for and
   * cannot see until they leave the cell.
   */
  private withPreviousAlpha(colour: ParsedColor | null): ParsedColor | null {
    const previous = this.lastValid;
    if (!colour || !previous || previous.a >= 1) return colour;

    // Round-tripped through the parser rather than hand-built, so the result is
    // a fully-derived ParsedColor (css, hex and notation all consistent) and
    // comes from the same memo every other colour in the grid does.
    return parseColor(`rgba(${colour.r}, ${colour.g}, ${colour.b}, ${previous.a})`) ?? colour;
  }
}
