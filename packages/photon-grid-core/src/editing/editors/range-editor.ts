/**
 * Bounded numeric entry as a slider.
 *
 * @packageDocumentation
 */

import { AbstractCellEditor } from './base/abstract-editor';
import { clamp, roundTo } from './base/coercion';

/**
 * Source of the `id` linking each slider to its `<output>`.
 *
 * Module-scoped and monotonic so two range editors alive at once — a session
 * closing while the next opens — cannot mint the same id and cross-wire their
 * labels.
 */
let sequence = 0;

/** `cellEditorParams` for {@link RangeEditor}. */
export interface RangeEditorParams {
  /**
   * Lowest selectable value.
   *
   * @default 0
   */
  readonly min?: number;

  /**
   * Highest selectable value.
   *
   * @default 100
   */
  readonly max?: number;

  /**
   * Increment per arrow key and per drag step.
   *
   * @default 1
   */
  readonly step?: number;

  /**
   * Show the live numeric readout beside the slider.
   *
   * @default true. A slider on its own communicates *roughly* — the number is
   *   what makes the value checkable, and it is the only thing a screen reader
   *   user could read back before committing. Turn it off only where the exact
   *   figure genuinely does not matter.
   */
  readonly showValue?: boolean;

  /**
   * Text appended to the readout — `'%'`, `'kg'`, `' pts'`.
   *
   * Presentation only; it is never part of the committed value.
   */
  readonly suffix?: string;
}

/**
 * A slider with a live numeric readout, for a value with known bounds.
 *
 * ### When a slider is the right control
 * Only when the range is small, bounded and meaningful to sweep — a percentage,
 * a rating, a weighting. A slider cannot express "no value", cannot be typed
 * into, and gives coarse control over a wide range, so anything unbounded or
 * precise belongs in `NumberEditor` instead.
 *
 * ### The readout is not decoration
 * `<output>` is the element whose whole purpose is "the result of a control", it
 * is announced as such, and it is linked to the slider by `for` so the
 * association survives the two being styled apart. Its content is the one thing
 * that tells the user, and assistive technology, what a drag actually landed on.
 *
 * ### The slider states its own range
 * `aria-valuemin` / `aria-valuemax` / `aria-valuenow` are written explicitly and
 * kept in step with every move, rather than left to the implicit values a
 * browser derives from `min` / `max` / `value`. Those implicit values are the
 * documented behaviour, but they are the *only* part of this editor a user
 * driving it by keyboard hears, and a mapping that varies by engine is not
 * something to leave to chance. A configured suffix goes into `aria-valuetext`,
 * because "70" and "70%" are different facts and the bare number is the one that
 * gets misread. The slider also carries `aria-label`, since the native thumb has
 * no name of its own and the root is a group the host labels instead.
 *
 * ### Always a number
 * There is no empty state and no `NaN`: a value the column cannot parse opens at
 * the minimum, and every reported value is clamped to the range and rounded to
 * the step, so the committed number is always one the slider could actually
 * produce.
 *
 * @example
 * ```ts
 * {
 *   field: 'completion',
 *   editable: true,
 *   cellEditor: 'range',
 *   cellEditorParams: { min: 0, max: 100, step: 5, suffix: '%' },
 * }
 * ```
 */
export class RangeEditor extends AbstractCellEditor<number, RangeEditorParams> {
  private slider!: HTMLInputElement;
  private readout: HTMLOutputElement | null = null;

  protected buildGui(): HTMLElement {
    const gui = document.createElement('div');
    gui.className = 'pg-editor-group pg-editor-group--range';

    const id = `pg-range-${++sequence}`;
    this.slider = this.buildSlider(id);
    gui.appendChild(this.slider);

    if (this.editorParams().showValue !== false) {
      this.readout = this.buildReadout(id);
      gui.appendChild(this.readout);
    }

    this.on(this.slider, 'input', () => {
      this.renderReadout();
      this.applyValueAria();
      this.emit(this.getValue());
    });

    return gui;
  }

  /** The slider's position, clamped to the range and rounded to the step. */
  getValue(): number {
    const { min = 0, max = 100 } = this.editorParams();
    const parsed = Number(this.slider.value);

    return clamp(Number.isFinite(parsed) ? parsed : min, min, max);
  }

  /** Builds the slider, bounded and labelled. */
  private buildSlider(id: string): HTMLInputElement {
    const { min = 0, max = 100, step = 1 } = this.editorParams();

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'pg-editor pg-editor--range';
    slider.id = id;
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(this.initialValue());
    slider.setAttribute('aria-label', this.accessibleName());
    slider.setAttribute('aria-valuemin', String(min));
    slider.setAttribute('aria-valuemax', String(max));

    this.slider = slider;
    this.applyValueAria();

    return slider;
  }

  /**
   * Mirrors the slider's position into the attributes assistive technology
   * reads back on every move.
   *
   * Only the two that change are written here — the bounds are fixed for the
   * session and set once in {@link buildSlider}, so a drag costs two attribute
   * writes rather than four. `aria-valuetext` is *removed* rather than set to
   * the bare number when no suffix is configured: an `aria-valuetext` that only
   * repeats `aria-valuenow` suppresses the platform's own formatting for no
   * gain.
   */
  private applyValueAria(): void {
    const value = this.getValue();
    this.slider.setAttribute('aria-valuenow', String(value));

    const { suffix } = this.editorParams();
    if (suffix === undefined || suffix === '') {
      this.slider.removeAttribute('aria-valuetext');
      return;
    }
    this.slider.setAttribute('aria-valuetext', `${value}${suffix}`);
  }

  /** Builds the readout and gives it its opening text. */
  private buildReadout(id: string): HTMLOutputElement {
    const readout = document.createElement('output');
    readout.className = 'pg-editor-group__readout';
    readout.setAttribute('for', id);
    this.readout = readout;
    this.renderReadout();

    return readout;
  }

  /** Mirrors the slider's position into the readout. */
  private renderReadout(): void {
    if (!this.readout) return;
    this.readout.textContent = `${this.getValue()}${this.editorParams().suffix ?? ''}`;
  }

  /**
   * The opening position: the cell's value, snapped into the range — or the
   * minimum when the cell holds nothing a slider could represent.
   */
  private initialValue(): number {
    const { min = 0, max = 100, step = 1 } = this.editorParams();
    const parsed = Number(this.params.value);
    if (!Number.isFinite(parsed)) return min;

    // A step of 0.1 must not open on 0.30000000000000004, which is what the
    // browser would then round away silently on the first drag.
    const decimals = String(step).split('.')[1]?.length ?? 0;
    return roundTo(clamp(parsed, min, max), decimals);
  }
}
