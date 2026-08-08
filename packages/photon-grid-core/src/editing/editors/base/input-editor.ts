/**
 * The base for every editor that is a single native text-entry control.
 *
 * @packageDocumentation
 */

import { AbstractCellEditor } from './abstract-editor';

/**
 * Input types whose content `select()` can highlight.
 *
 * Calling it on anything else (a date, a colour, a range) is harmless but
 * pointless, and skipping it keeps the intent of "select the text" honest.
 */
const SELECTABLE_TYPES: ReadonlySet<string> = new Set([
  'text',
  'search',
  'url',
  'tel',
  'password',
  'email',
  'number',
]);

/**
 * The subset that also accepts an explicit caret position.
 *
 * `setSelectionRange` throws `InvalidStateError` on `number`, `email`, `date`
 * and friends — per spec they have no text entry cursor — so seeding an editor
 * with a typed character must consult this before placing the caret.
 */
const CARET_TYPES: ReadonlySet<string> = new Set([
  'text',
  'search',
  'url',
  'tel',
  'password',
]);

/**
 * The shared modifier every native-picker control carries in addition to its own.
 *
 * A date, a datetime, a time and a select are four different controls with one
 * thing in common: the browser draws an indicator the user clicks to open a
 * platform picker, and that indicator has to be sized, coloured and positioned
 * consistently or the column looks assembled from different kits. One class lets
 * the stylesheet say that once, instead of repeating the same rule under four
 * type-specific selectors and forgetting the fifth when it is added.
 */
export const NATIVE_PICKER_CLASS = 'pg-editor--picker';

/**
 * An element that may implement the `showPicker` half of the HTML forms spec.
 *
 * Declared here rather than relying on the DOM lib because the method is newer
 * than several of the TypeScript DOM typings this package is built against, and
 * an optional member is exactly how a feature-detected API should be typed —
 * `typeof el.showPicker === 'function'` then narrows it without a cast to `any`.
 */
interface PickerCapableElement {
  showPicker?: () => void;
}

/**
 * Asks a native control to drop its picker open, and does nothing at all if it
 * cannot.
 *
 * Shared by every editor whose value is chosen from a platform surface — the
 * date, datetime, time and select editors — so entering a cell shows the
 * calendar, the clock or the option list without the user having to click a
 * second time on an indicator they may not have noticed.
 *
 * `showPicker` is unsupported in older Safari/Firefox and throws a
 * SecurityError unless called from a user gesture. Both are non-fatal — the
 * select is focused and fully keyboard-operable either way — so a failure
 * must degrade silently rather than break the edit session.
 *
 * @param element - The focused control. Left untouched when it does not
 *   implement the method.
 */
export function showNativePicker(element: HTMLElement): void {
  const candidate = element as HTMLElement & PickerCapableElement;
  if (typeof candidate.showPicker !== 'function') return;

  try {
    candidate.showPicker();
  } catch {
    // Deliberately swallowed — see the note above. The control is already
    // focused, so the user can still type or arrow through its values.
  }
}

/**
 * Resolves the `commitOnChange` param the picker editors share, defaulting it
 * to `true`.
 *
 * A single resolver rather than `params.commitOnChange !== false` repeated in
 * four editors: the default is a behavioural contract users will rely on, and
 * four independent copies of it are four chances for one to drift when the
 * option is next touched. `!== false` rather than `=== true` because the
 * default is on — an omitted param must behave like an enabled one.
 *
 * @param flag - The editor's `commitOnChange` param, or `undefined` when the
 *   column supplied none.
 * @returns Whether a native `change` on the control should close the session.
 */
export function resolveCommitOnChange(flag: boolean | undefined): boolean {
  return flag !== false;
}

/**
 * A single `<input>` (or `<textarea>`) wired to the grid's editing contract.
 *
 * Nine of the fifteen built-in editors are exactly this control plus a value
 * translation, so the shared behaviour — class naming, seeding, live reporting,
 * focus and selection — is written once here and each subclass supplies only
 * what makes it different: a {@link modifier} for the stylesheet, an
 * {@link inputType}, and the {@link parseText} / {@link formatValue} pair that
 * moves between the cell's value and the field's text.
 *
 * ### Opening state is what makes typing feel native
 * In a spreadsheet, typing a character over a selected cell *replaces* its
 * contents and leaves the caret after what you typed; pressing `F2` or
 * double-clicking *keeps* the contents, selected, so the next keystroke replaces
 * them but the arrow keys do not. Reproducing that is the entire reason
 * `CellEditorParams` carries `trigger` and `eventKey`, and it is handled here so
 * that no subclass — or third-party editor copying one — has to remember it.
 *
 * ### Live value reporting
 * The `input` event, not `change`: `change` on a text field does not fire until
 * blur, which is far too late for `validateOn: 'change'` or for a summary cell
 * that should track what is being typed.
 *
 * @typeParam TValue - The cell value this editor reads and produces.
 * @typeParam TParams - The `cellEditorParams` shape this editor accepts.
 */
export abstract class InputCellEditor<TValue, TParams> extends AbstractCellEditor<
  TValue,
  TParams
> {
  /**
   * BEM modifier for the root class — `'text'` produces
   * `class="pg-editor pg-editor--text"`.
   *
   * Abstract so every subclass is themeable in its own right, and so a new
   * editor cannot silently inherit another's styling.
   */
  protected abstract readonly modifier: string;

  /**
   * Which element to build. `'textarea'` for multi-line entry; everything else
   * is an `<input>`.
   */
  protected readonly tag: 'input' | 'textarea' = 'input';

  /**
   * The native `type` attribute.
   *
   * Not cosmetic: it decides which keyboard a phone raises, which validation
   * and stepping the browser contributes for free, and — for `date`, `time`,
   * `color`, `range` — which native picker the user gets.
   */
  protected inputType: string = 'text';

  /**
   * Whether this control opens a platform picker — a calendar, a clock, a colour
   * wheel — rather than being typed into freely.
   *
   * Set by the subclass, and the single switch behind both halves of the picker
   * treatment: {@link buildGui} adds {@link NATIVE_PICKER_CLASS} so the
   * stylesheet can style every such control alike, and the subclass calls
   * {@link openNativePicker} from `afterGuiAttached` so the picker is already
   * open when the session starts.
   */
  protected readonly nativePicker: boolean = false;

  /** The control itself. Populated by {@link buildGui}. */
  protected input!: HTMLInputElement | HTMLTextAreaElement;

  /**
   * Builds the control, seeds it, and starts reporting changes.
   *
   * Subclasses that need a richer root (a reveal button beside the field, say)
   * call `super.buildGui()` for the input and return their own wrapper — the
   * input is already stored in {@link input}, so focus and value handling keep
   * working unchanged.
   */
  protected buildGui(): HTMLElement {
    const element = document.createElement(this.tag);
    if (element instanceof HTMLInputElement) element.type = this.inputType;
    element.className = this.nativePicker
      ? `pg-editor pg-editor--${this.modifier} ${NATIVE_PICKER_CLASS}`
      : `pg-editor pg-editor--${this.modifier}`;
    element.value = this.seedText();
    // Named here rather than left to `EditorHost`, which can only label the
    // *root* — for a composite editor (the password field with its reveal
    // button) the root is a wrapper and this control would otherwise be
    // announced as an unnamed text box. Identical to the host's label, so the
    // two can never disagree when the root and the control are the same node.
    element.setAttribute('aria-label', this.accessibleName());

    this.input = element;
    this.configureInput(element);
    this.on(element, 'input', () => this.emit(this.getValue()));
    // Only ever one of the two closes the session: `input` reports, `change`
    // commits. Wiring a commit into both would fire twice for every picker
    // (browsers emit `input` then `change` when a value is chosen) and would
    // make a plain text field commit on every keystroke.
    if (this.commitsOnChange()) {
      this.on(element, 'change', () => this.requestCommit());
    }

    return element;
  }

  /**
   * Whether a native `change` on this control should close the edit session.
   *
   * ### Why this is off by default
   * For a text-like field `change` fires on blur, long after the user has
   * finished typing and at a moment the grid is already handling — committing
   * there would duplicate the grid's own blur handling and would fight `Escape`.
   * Only the controls whose value arrives from a platform popup override this —
   * the date, datetime and time editors — because that popup swallows the first
   * `Enter` and never lets it reach the page.
   *
   * @returns `false` unless a subclass opts in, typically by resolving its own
   *   `commitOnChange` param through {@link resolveCommitOnChange}.
   */
  protected commitsOnChange(): boolean {
    return false;
  }

  /**
   * Opens this control's native picker, once the GUI is in the document.
   *
   * Call it from `afterGuiAttached` — never from `init`, where the element is
   * not yet in the document and the browser has nothing to anchor the picker to.
   * Silently does nothing where the platform has no `showPicker`, so an editor
   * may call it unconditionally; see {@link showNativePicker}.
   */
  protected openNativePicker(): void {
    if (this.input instanceof HTMLInputElement) showNativePicker(this.input);
  }

  /**
   * Hook for attributes that depend on the column or the editor's params —
   * `min`, `max`, `step`, `placeholder`, `maxLength`, ARIA.
   *
   * Runs after the element exists and is seeded, and before any listener is
   * attached, so setting a value here cannot spuriously report a change.
   */
  protected configureInput(_element: HTMLInputElement | HTMLTextAreaElement): void {
    // Nothing by default.
  }

  /**
   * Applies the attributes shared by the text-like editors.
   *
   * These are layout-neutral hints, not styling: `maxLength` is enforced by the
   * browser (so a paste cannot exceed the column's limit) and `placeholder` is
   * the accessible way to hint at a format.
   */
  protected applyTextAttributes(
    element: HTMLInputElement | HTMLTextAreaElement,
    options: { readonly maxLength?: number; readonly placeholder?: string },
  ): void {
    if (options.maxLength !== undefined && options.maxLength > 0) {
      element.maxLength = options.maxLength;
    }
    if (options.placeholder !== undefined) element.placeholder = options.placeholder;
  }

  /** The value to commit, parsed out of the field's current text. */
  getValue(): TValue {
    return this.parseText(this.input.value);
  }

  /**
   * Turns the field's text into the value the cell will store.
   *
   * The one place a subclass decides its type — trimming for text, a `number |
   * null` for numeric entry, an ISO string for dates.
   */
  protected abstract parseText(text: string): TValue;

  /**
   * Turns the cell's value into the field's initial text.
   *
   * Defaults to `String(value)`, with `null` and `undefined` becoming an empty
   * field rather than the words "null" and "undefined" — which is what a naive
   * template produces, and what users report as a bug.
   */
  protected formatValue(value: TValue): string {
    return value === null || value === undefined ? '' : String(value);
  }

  /**
   * Focuses the control, then either places the caret after a typed character
   * or selects the existing text — see the class note on opening state.
   */
  focus(): void {
    const element = this.input;
    if (!element) {
      super.focus();
      return;
    }

    element.focus();

    if (this.isSeededByTyping()) {
      if (this.supportsCaret()) {
        const end = element.value.length;
        element.setSelectionRange(end, end);
      }
      return;
    }

    if (this.selectsOnFocus() && this.supportsSelection()) element.select();
  }

  /**
   * Whether opening the editor should present the existing text selected, so
   * the next keystroke replaces it.
   *
   * `true` for every trigger that carries no character of its own — a click, a
   * double-click, `Enter`/`F2`, `Tab` navigation, and a programmatic
   * `startEditing`. A subclass overrides this to honour an opt-out param.
   */
  protected selectsOnFocus(): boolean {
    return true;
  }

  /**
   * The text the field opens with: the character that started a `'type'`
   * session, or the cell's formatted value for every other trigger.
   */
  private seedText(): string {
    return this.isSeededByTyping()
      ? (this.params.eventKey as string)
      : this.formatValue(this.params.value);
  }

  /** Whether this session was opened by typing a printable character over the cell. */
  private isSeededByTyping(): boolean {
    return this.params.trigger === 'type' && this.params.eventKey !== null;
  }

  /** Whether `select()` does anything for this control. */
  private supportsSelection(): boolean {
    return this.tag === 'textarea' || SELECTABLE_TYPES.has(this.inputType);
  }

  /** Whether `setSelectionRange` is legal for this control — see {@link CARET_TYPES}. */
  private supportsCaret(): boolean {
    return this.tag === 'textarea' || CARET_TYPES.has(this.inputType);
  }
}
