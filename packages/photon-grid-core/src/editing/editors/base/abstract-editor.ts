/**
 * The base every built-in editor is built on.
 *
 * @packageDocumentation
 */

import type { CellEditorParams, ICellEditor } from '../../types/cell-editor.types';

/**
 * `CellEditorParams` with the row-data type pinned to the core's default.
 *
 * The built-in editors are generic over the *value* they edit and the *params*
 * they accept, but never over the row shape — they read `colDef` and `value`,
 * never `data.someField`. Fixing `TData` here keeps three type arguments from
 * appearing on every built-in editor's signature for no benefit.
 */
export type EditorParams<TValue, TParams> = CellEditorParams<
  TValue,
  Record<string, unknown>,
  TParams
>;

/**
 * Everything the browser will move focus to, in document order.
 *
 * `[tabindex="-1"]` is excluded deliberately: a composite editor gives its
 * wrapper `tabindex="-1"` so the wrapper can be focused programmatically, and
 * matching it here would park focus on the wrapper instead of on the control
 * the user actually types into.
 */
const FOCUSABLE_SELECTOR =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
  'button:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/**
 * The shared foundation for Photon Grid's editors: params capture, one stable
 * GUI element, and listener bookkeeping that cannot leak.
 *
 * ### Why the GUI is built in `init`, not the constructor
 * The grid constructs an editor with `new Editor()` and only then calls `init`,
 * so at construction time an editor knows nothing — not its value, not its
 * column, not its params. Deferring {@link buildGui} to `init` also means a
 * subclass's own field initialisers (`protected readonly modifier = 'text'`)
 * have already run by the time the template method fires, which a
 * constructor-time build could not guarantee.
 *
 * ### Why listeners are recorded rather than removed by hand
 * An editor is created and thrown away on every cell the user edits — thousands
 * of times in a session. A single listener left attached to an element the grid
 * still owns keeps the whole editor, its params, its row node and its cell alive
 * for as long as that element lives. {@link on} makes registration and removal a
 * single act, so "did I remember to detach it?" stops being a question anyone
 * has to answer per editor.
 *
 * @typeParam TValue - The cell value this editor reads and produces.
 * @typeParam TParams - The `cellEditorParams` shape this editor accepts.
 *
 * @example
 * ```ts
 * class StarRatingEditor extends AbstractCellEditor<number, { max?: number }> {
 *   private stars!: readonly HTMLElement[];
 *   private rating = 0;
 *
 *   protected buildGui(): HTMLElement {
 *     const gui = document.createElement('div');
 *     gui.className = 'pg-editor pg-editor--stars';
 *     this.rating = Number(this.params.value) || 0;
 *     this.stars = Array.from({ length: this.editorParams().max ?? 5 }, (_, i) => {
 *       const star = document.createElement('button');
 *       star.type = 'button';
 *       this.on(star, 'click', () => { this.rating = i + 1; this.emit(this.rating); });
 *       gui.appendChild(star);
 *       return star;
 *     });
 *     return gui;
 *   }
 *
 *   getValue(): number { return this.rating; }
 * }
 * ```
 */
export abstract class AbstractCellEditor<TValue, TParams>
  implements ICellEditor<TValue, Record<string, unknown>, TParams>
{
  /**
   * The session's parameters, assigned before {@link buildGui} runs.
   *
   * Definitely-assigned rather than optional because the grid guarantees `init`
   * precedes every other call; a subclass that null-checked it would be writing
   * dead code.
   */
  protected params!: EditorParams<TValue, TParams>;

  /** The root element, built once by {@link buildGui} and never replaced. */
  protected gui!: HTMLElement;

  /**
   * Teardown callbacks, run in registration order by {@link destroy}.
   *
   * `readonly` on the array (not its contents) so a subclass can add to it —
   * for a timer or an observer {@link on} does not cover — but can never swap it
   * out and orphan what is already registered.
   */
  protected readonly disposers: Array<() => void> = [];

  /**
   * Whether {@link requestCommit} has already asked the grid to close this
   * session.
   *
   * An editor that commits from a DOM event rather than from the grid's own
   * `Enter` binding can be re-entered while the commit is still unwinding: the
   * grid tears the editor down, the browser fires a trailing `change` or `blur`
   * at the element on its way out, and the handler runs a second time against a
   * session that no longer exists. The session manager does guard this, but a
   * guard the editor owns means the editor is correct on its own terms and stays
   * correct if it is ever driven by something other than that manager.
   */
  private commitRequested = false;

  /**
   * Captures the session and builds the GUI. Subclasses override
   * {@link buildGui} rather than this, so the ordering guarantee holds; an
   * override that needs asynchronous setup should call `super.init(params)`
   * first and await afterwards.
   */
  init(params: EditorParams<TValue, TParams>): void | Promise<void> {
    this.params = params;
    this.gui = this.buildGui();
  }

  /**
   * Builds the editor's DOM. Called exactly once, from {@link init}, with
   * {@link params} already populated.
   *
   * @returns The root element — stable for the session, as `getGui` promises.
   */
  protected abstract buildGui(): HTMLElement;

  getGui(): HTMLElement {
    return this.gui;
  }

  /** The value to commit. Read once, at commit time. */
  abstract getValue(): TValue;

  /**
   * Moves focus to the first focusable element in the editor — the root itself
   * when it is focusable, otherwise the first focusable descendant.
   *
   * Correct for a bare input and for a wrapper whose control is nested one level
   * down, which covers every built-in. An editor that opens with focus somewhere
   * other than its first control overrides this.
   */
  focus(): void {
    const root = this.gui;
    if (!root) return;

    const target = root.matches(FOCUSABLE_SELECTOR)
      ? root
      : root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    target?.focus();
  }

  /**
   * Adds a listener and records its removal in one step.
   *
   * Always prefer this to `addEventListener`: the handler reference needed to
   * detach is captured here, so a subclass never has to hold one in a field.
   *
   * @param element - Target. May be outside {@link gui} (a popup's document-level
   *   dismissal listener, say) — {@link destroy} still detaches it.
   * @param type - A DOM event name, constrained to the standard map so a typo is
   *   a compile error rather than a listener that never fires.
   * @param handler - Receives the correctly-typed event for `type`.
   * @param options - Passed through, and repeated on removal so a `capture`
   *   listener is actually detached.
   */
  protected on<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void {
    const listener = handler as EventListener;
    element.addEventListener(type, listener, options);
    this.disposers.push(() => element.removeEventListener(type, listener, options));
  }

  /**
   * Registers teardown for something {@link on} does not cover — a pending
   * timer, an abort controller, an observer.
   */
  protected addDisposer(dispose: () => void): void {
    this.disposers.push(dispose);
  }

  /**
   * Detaches every listener and runs every registered teardown.
   *
   * The list is emptied afterwards so a double `destroy` — which a cancelled
   * session racing a commit can produce — is a no-op rather than a second
   * teardown of the same resources.
   */
  destroy(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
  }

  /**
   * Reports a value to the grid as the user works, driving live validation and
   * any cell that derives from this one.
   *
   * A convenience, not a commit: the grid still reads {@link getValue} when the
   * session closes.
   */
  protected emit(value: TValue): void {
    this.params.onValueChange(value);
  }

  /**
   * Closes the session with the current value, at most once per editor.
   *
   * The commit-once path for every editor that closes itself from a DOM event —
   * a checkbox toggled, an option picked from a native popup, `Enter` on a
   * combobox's active option. Prefer it to calling `params.commit()` directly:
   * the second call is swallowed here rather than reaching a session that is
   * already closing, which is exactly the re-entrancy a browser produces when it
   * fires a trailing `change` at an element the commit is in the middle of
   * removing. See {@link commitRequested}.
   */
  protected requestCommit(): void {
    if (this.commitRequested) return;
    this.commitRequested = true;
    this.params.commit();
  }

  /**
   * This editor's `cellEditorParams`, already resolved by the grid — a function
   * form has been called, and `{}` stands in when the column supplied none, so
   * a subclass reads `this.editorParams().min` without a null check.
   */
  protected editorParams(): Readonly<TParams> {
    return this.params.params;
  }

  /**
   * The name assistive technology should announce for this editor's control.
   *
   * ### Why every editor needs this, even though the host labels the root
   * `EditorHost.mount` puts `aria-label` on the editor's *root* element, which is
   * enough while the root and the control are the same node — a bare `<input>`.
   * The moment an editor is composite (a colour group, a slider and its readout,
   * a combobox and its listbox) the root is a `<div>` and the thing the user
   * focuses is a descendant, so a screen reader announces the group's name and
   * then an *unnamed* control. Labelling the inner control here closes that gap,
   * and because the value is identical to the host's it can never contradict it.
   *
   * ### Why `header` first, and `||` rather than `??`
   * The header is the visible name of the column, so it is the name the user
   * would use to describe the cell out loud. A column with an icon-only or empty
   * header falls through to its field name — an imperfect but real name — where
   * `??` would have kept the empty string and produced an unnamed control.
   *
   * @returns The column's header, its field as a fallback, or `''` when a
   *   partially-built column definition supplies neither. Never `undefined`, so
   *   callers can pass the result straight to `setAttribute`.
   */
  protected accessibleName(): string {
    const { header, field } = this.params.colDef;
    return header || field || '';
  }
}
