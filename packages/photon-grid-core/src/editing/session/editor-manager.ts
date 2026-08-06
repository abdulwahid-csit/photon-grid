/**
 * The editing orchestrator.
 *
 * Owns the lifetime of an edit: resolve an editor for the cell, build it, mount
 * it, run validation on the way out, and write the value through the grid's
 * normal value pipeline. Every collaborator arrives through the constructor —
 * resolver, validation engine, host, keyboard, store, event bus — so this class
 * composes services rather than reaching for globals, and a test can drive it
 * with stubs.
 *
 * ### Why one place
 * The behaviours that used to be scattered across `CellEditorEngine` and
 * `GridCore.wireEditing` — the `editingCellId` store key, the `pg-cell--editing`
 * class, the commit flash, the formula delegate, Tab navigation — are all
 * transitions of the same state machine. Keeping them together is what makes it
 * possible to reason about "what happens when the user presses Escape during an
 * async validation".
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import { GridEventType } from '../../types/event.types';
import { getCellValue, setCellValue } from '../../engines/editing/value-accessor';
import { parseValue } from '../../engines/editing/value-parser';
import { isFormulaSource } from '../../formula/compile';

import type {
  CellEditorParams,
  EditTrigger,
  ICellEditor,
} from '../types/cell-editor.types';
import type {
  InvalidResult,
  ValidationContext,
  ValidationResult,
} from '../types/validation.types';
import { VALID } from '../types/validation.types';
import {
  resolveEditingConfig,
  type EditingConfig,
  type ResolvedEditingConfig,
} from '../types/editing-config.types';
import type { EditorResolver } from '../registry/default-editor-resolver';
import type { ValidationEngine } from '../validation/validation-engine';
import type { EditorHost } from '../services/editor-host';
import type { KeyboardManager } from '../services/keyboard-manager';
import { allocateSessionId, type EditSession } from './edit-session';

/** Collaborators an {@link EditorManager} is composed from. */
export interface EditorManagerDeps {
  readonly store: GridStore;
  readonly eventBus: EventBus;
  readonly resolver: EditorResolver;
  readonly validation: ValidationEngine;
  readonly host: EditorHost;
  readonly keyboard: KeyboardManager;
  /** Supplies the live `GridApi`, which does not exist yet at construction time. */
  readonly getApi: () => unknown;
}

/** A request to open an editor. */
export interface StartEditRequest {
  readonly rowNode: RowNode;
  readonly colDef: ColumnDef;
  readonly cellEl: HTMLElement;
  /** Defaults to the cell's `.pg-cell__inner`, which is where inline editors go. */
  readonly innerEl?: HTMLElement;
  /** @default 'api' */
  readonly trigger?: EditTrigger;
  /** The character that opened a `'type'` session. */
  readonly eventKey?: string | null;
  /**
   * Value the editor opens with, when it differs from the cell's stored value.
   *
   * The one real use is a formula cell: the grid stores the *computed* result but
   * the editor must show the *source* (`=A1+B1`), or editing a formula would
   * silently replace it with its own output.
   */
  readonly editValue?: unknown;
  /**
   * Column definition used for **editor resolution only**, when it differs from
   * the column being edited.
   *
   * Again, formulas: a formula-enabled number column has to open a text editor so
   * a leading `=` can be typed at all. The commit path deliberately keeps using
   * the real {@link colDef}, so the value is still parsed as a number.
   */
  readonly resolveAs?: ColumnDef;
}

/** `true` for a thenable, so the synchronous validation path can stay synchronous. */
function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof (value as { then?: unknown } | null)?.then === 'function';
}

/**
 * Whether a committed value is the one the cell already held.
 *
 * `Object.is` alone is wrong for the multi-value editors: an array is never
 * identical to the array it was built from, so a multi-select opened and closed
 * without a single change would write a "new" value, emit `CELL_VALUE_CHANGED`,
 * flash the cell and push an undo entry — for an edit the user did not make.
 *
 * One level deep on purpose. The values inside a cell's array are primitives
 * (option values, tags, ids); a deep walk would buy nothing and would turn a
 * check that runs on every commit into an unbounded traversal of whatever a
 * `valueSetter` happens to store.
 */
function isSameValue(next: unknown, previous: unknown): boolean {
  if (Object.is(next, previous)) return true;
  if (!Array.isArray(next) || !Array.isArray(previous)) return false;
  return next.length === previous.length && next.every((entry, i) => Object.is(entry, previous[i]));
}

/**
 * Why a session is being closed.
 *
 * The distinction exists because "the user pressed Enter" and "the user clicked
 * a different cell" are different instructions, and treating them alike is what
 * used to leave a grid with two cells outlined at once:
 *
 * - `'explicit'` — the user asked to finish *here*: Enter, Tab, or an editor
 *   calling `params.commit()`. They are still on the cell, so an editor may
 *   legitimately stay open — that is what `onInvalid: 'keep-open'` is for — and
 *   waiting for an asynchronous rule to answer is reasonable.
 * - `'navigate'` — the user has already left: a click on another cell, focus
 *   moving out, a column being resized or moved. The editor must come down
 *   *now*, whatever validation is still doing, because the cell it belongs to is
 *   no longer the cell the user is looking at.
 */
export type CommitReason = 'explicit' | 'navigate';

export class EditorManager {
  private session: EditSession | null = null;
  private config: ResolvedEditingConfig = resolveEditingConfig();

  /**
   * Delegate that owns committing a formula on a formula-enabled column.
   * Registered by `GridCore` only when the Formula Engine is switched on.
   */
  private formulaCommit:
    | ((rowNode: RowNode, colDef: ColumnDef, source: string) => boolean)
    | null = null;

  /** Moves the selection to the adjacent editable cell; registered by `GridCore`. */
  private tabHandler: ((shiftKey: boolean) => void) | null = null;

  constructor(private readonly deps: EditorManagerDeps) {}

  // ── Configuration ──────────────────────────────────────────────────────────

  /** Applies `GridOptions.editing`, filling in every documented default. */
  configure(config: Partial<EditingConfig>): void {
    // Merged field by field rather than spread: the resolved form models "no row
    // validator" as `null` while the input form uses `undefined`, and a blind
    // spread would widen the resolved type back into the input type.
    const current = this.config;
    this.config = resolveEditingConfig({
      mode: config.mode ?? current.mode,
      singleClickEdit: config.singleClickEdit ?? current.singleClickEdit,
      stopEditingWhenCellsLoseFocus:
        config.stopEditingWhenCellsLoseFocus ?? current.stopEditingWhenCellsLoseFocus,
      validateOn: config.validateOn ?? current.validateOn,
      onInvalid: config.onInvalid ?? current.onInvalid,
      enterStartsEditing: config.enterStartsEditing ?? current.enterStartsEditing,
      validationDebounceMs: config.validationDebounceMs ?? current.validationDebounceMs,
      rowValidator: config.rowValidator ?? current.rowValidator ?? undefined,
    });
  }

  /** The configuration currently in force. */
  getConfig(): ResolvedEditingConfig {
    return this.config;
  }

  /** Registers the Tab-navigation delegate. @see tabHandler */
  setTabHandler(fn: (shiftKey: boolean) => void): void {
    this.tabHandler = fn;
  }

  /** Registers the formula-commit delegate. @see formulaCommit */
  setFormulaCommitHandler(
    fn: (rowNode: RowNode, colDef: ColumnDef, source: string) => boolean,
  ): void {
    this.formulaCommit = fn;
  }

  // ── State ──────────────────────────────────────────────────────────────────

  /** `true` while any cell is being edited. */
  isEditing(): boolean {
    return this.session !== null;
  }

  /** `true` when this specific cell is the one being edited. */
  isCellEditing(nodeId: string, colId: string): boolean {
    return this.session?.rowNode.nodeId === nodeId && this.session.colDef.colId === colId;
  }

  /** The open session, or `null`. Exposed for the deprecated compatibility facade. */
  getActiveSession(): EditSession | null {
    return this.session;
  }

  /**
   * Records a value reported by the editor.
   *
   * Advisory — {@link ICellEditor.getValue} still wins at commit. Under
   * `validateOn: 'change'` this also schedules a debounced validation pass so
   * the user sees the failure as they type rather than only when they leave.
   */
  updateValue(value: unknown): void {
    const session = this.session;
    if (!session || session.closing) return;
    session.currentValue = value;
    if (this.config.validateOn !== 'change') return;

    if (session.validationTimer !== null) clearTimeout(session.validationTimer);
    session.validationTimer = setTimeout(() => {
      session.validationTimer = null;
      if (this.session?.id !== session.id) return;
      const outcome = this.runValidation(session, value);
      if (isPromise(outcome)) {
        void outcome.then((result) => {
          if (this.session?.id !== session.id) return;
          this.applyValidity(session, result);
        });
      } else {
        this.applyValidity(session, outcome);
      }
    }, this.config.validationDebounceMs);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Opens an editor on a cell.
   *
   * Returns `false` — having changed nothing — when the grid is not editable,
   * when the resolver declines the column, or when the editor vetoes itself
   * through `isCancelBeforeStart`. An already-open session is committed first,
   * which is what makes clicking straight from one cell to another behave the
   * way a spreadsheet does.
   *
   * The editor's `init` may be asynchronous; the session is registered
   * immediately so a cancel arriving mid-`init` is honoured, and the mount is
   * abandoned if the session was superseded while awaiting.
   *
   * @returns `true` when a session was opened (or is opening, for an async editor).
   */
  startEdit(request: StartEditRequest): boolean {
    if (this.config.mode === 'none') return false;
    const { rowNode, colDef, cellEl } = request;

    if (this.session) {
      if (this.isCellEditing(rowNode.nodeId, colDef.colId)) return true;
      this.commit('navigate');
      // Never overwrite a session that is somehow still standing. `commit`
      // closes on every 'navigate' path, but a host strategy or a throwing
      // `valueSetter` could in principle leave one behind — and assigning over
      // it orphans the editor outright: its DOM stays in the old cell, its
      // `pg-cell--editing` border stays lit, and its listeners are never
      // released. That is precisely the "two cells outlined at once" failure.
      if (this.session) this.teardown(this.session);
    }

    const innerEl =
      request.innerEl ?? cellEl.querySelector<HTMLElement>('.pg-cell__inner') ?? cellEl;

    const resolution = this.deps.resolver.resolve({
      colDef: request.resolveAs ?? colDef,
      node: rowNode,
      data: rowNode.data,
      rowIndex: rowNode.rowIndex,
      api: this.deps.getApi(),
    });
    if (resolution.kind === 'none') return false;

    // The stored value is what a cancel restores and what the change test
    // compares against; `editValue` only changes what the editor is *shown*.
    const originalValue = getCellValue(rowNode.data, colDef);
    const openingValue = request.editValue !== undefined ? request.editValue : originalValue;
    const session: EditSession = {
      id: allocateSessionId(),
      rowNode,
      colDef,
      label: colDef.header || colDef.field,
      trigger: request.trigger ?? 'api',
      originalValue,
      currentValue: openingValue,
      editor: null,
      mounted: null,
      cellEl,
      innerEl,
      disposers: [],
      closing: false,
      validationTimer: null,
    };
    this.session = session;
    this.deps.store.set('editingCellId', `${rowNode.nodeId}__${colDef.colId}`);

    let editor: ICellEditor;
    try {
      editor = resolution.create();
    } catch (err) {
      console.error('[PhotonGrid] cell editor failed to construct:', err);
      this.session = null;
      this.deps.store.set('editingCellId', null);
      return false;
    }
    session.editor = editor;

    const params = this.buildParams(session, editor, request.eventKey ?? null);
    const started = editor.init(params);

    if (isPromise(started)) {
      void started.then(
        () => {
          // Superseded or cancelled while `init` was in flight: the value the
          // editor would present is for a cell the user has already left.
          if (this.session?.id !== session.id) {
            editor.destroy?.();
            return;
          }
          this.finishStart(session, editor);
        },
        (err: unknown) => {
          console.error('[PhotonGrid] cell editor init failed:', err);
          if (this.session?.id === session.id) this.cancel();
        },
      );
      return true;
    }

    this.finishStart(session, editor);
    return true;
  }

  /**
   * Mounts a successfully-initialised editor and announces the session.
   *
   * Split from {@link startEdit} so the synchronous and asynchronous `init`
   * paths converge on exactly one implementation.
   */
  private finishStart(session: EditSession, editor: ICellEditor): void {
    if (editor.isCancelBeforeStart?.() === true) {
      this.session = null;
      this.deps.store.set('editingCellId', null);
      editor.destroy?.();
      return;
    }

    const mounted = this.deps.host.mount({
      editor,
      cellEl: session.cellEl,
      innerEl: session.innerEl,
      label: session.label,
      // Dismissing a popup by clicking outside it is navigation, not an Enter.
      onDismiss: () => this.commit('navigate'),
    });
    session.mounted = mounted;

    session.disposers.push(
      this.deps.keyboard.attach(mounted.gui, {
        commit: () => this.commit(),
        cancel: () => this.cancel(),
        commitAndMove: (backwards) => {
          this.commit();
          this.tabHandler?.(backwards);
        },
      }),
    );

    if (this.config.stopEditingWhenCellsLoseFocus && !mounted.isPopup) {
      const onFocusOut = (event: FocusEvent): void => {
        const next = event.relatedTarget as Node | null;
        if (next && mounted.gui.contains(next)) return;
        // Deferred a task so a click that lands on another part of the same
        // editor (a select's option list, a colour swatch) does not read as
        // leaving it.
        setTimeout(() => {
          if (this.session?.id !== session.id) return;
          if (mounted.gui.contains(document.activeElement)) return;
          // Focus left the editor entirely — the user is elsewhere, so this is
          // navigation and the editor must not survive it.
          this.commit('navigate');
        }, 0);
      };
      mounted.gui.addEventListener('focusout', onFocusOut);
      session.disposers.push(() => mounted.gui.removeEventListener('focusout', onFocusOut));
    }

    editor.afterGuiAttached?.();

    this.deps.eventBus.emit(GridEventType.CELL_EDIT_START, {
      row: session.rowNode,
      colDef: session.colDef,
      oldValue: session.originalValue,
      newValue: session.originalValue,
      rowIndex: session.rowNode.rowIndex,
    });
    this.deps.eventBus.emit(GridEventType.ROW_EDIT_START, {
      row: session.rowNode,
      field: session.colDef.field,
      oldValue: session.originalValue,
      newValue: session.originalValue,
    });
  }

  /**
   * Validates and writes the open editor's value.
   *
   * ### Closing is not negotiable when the user has left
   * On `'navigate'` the session always ends, synchronously, before this returns.
   * Asynchronous rules keep running and their answer is applied when it lands
   * (see {@link applyDeferredCommit}); a failure reverts the cell and is
   * reported, rather than pinning an error to an editor that is no longer on
   * screen. This is what stops a cell keeping its editing border for the length
   * of a server round trip while the cell the user actually clicked already has
   * the active-cell border — two outlined cells at once.
   *
   * ### On `'explicit'` the editor may stay
   * Enter means "finish here", so waiting for an async rule and holding an
   * invalid value open for correction — see `EditingConfig.onInvalid` — are both
   * the right answer. The user has not gone anywhere.
   *
   * @param reason - Why the session is closing. @default 'explicit'
   */
  commit(reason: CommitReason = 'explicit'): void {
    const session = this.session;
    if (!session || session.closing || !session.editor) return;

    const value = this.readValue(session);
    const outcome = this.validateForCommit(session, value);

    if (!isPromise(outcome)) {
      this.settleCommit(session, value, outcome, reason);
      return;
    }

    if (reason === 'navigate') {
      // The editor comes down first and the verdict is applied afterwards. The
      // teardown is deliberately *before* the await rather than inside the
      // continuation: anything else leaves a window in which a second edit can
      // start while this session is still mounted.
      this.teardown(session);
      void outcome.then((result) => this.applyDeferredCommit(session, value, result));
      return;
    }

    void outcome.then((result) => this.settleCommit(session, value, result, reason));
  }

  /**
   * Runs the editor's own check and then the column's rules.
   *
   * Short-circuits: a column rule never runs against a value the editor itself
   * rejected, and an async editor check chains into the column rules so the
   * caller sees one settled answer either way.
   */
  private validateForCommit(
    session: EditSession,
    value: unknown,
  ): ValidationResult | Promise<ValidationResult> {
    const editorResult = session.editor?.validate?.() ?? VALID;

    if (isPromise(editorResult)) {
      return editorResult.then((result) =>
        result.valid ? this.runValidation(session, value) : result,
      );
    }
    if (!editorResult.valid) return editorResult;
    return this.runValidation(session, value);
  }

  /** Applies a settled verdict to a session that is still the open one. */
  private settleCommit(
    session: EditSession,
    value: unknown,
    result: ValidationResult,
    reason: CommitReason,
  ): void {
    // Superseded while an async rule was in flight — the verdict belongs to a
    // cell the user has since left, and a later session now owns the DOM.
    if (this.session?.id !== session.id) return;
    if (result.valid) {
      this.writeAndClose(session, value);
      return;
    }
    this.handleInvalid(session, result, reason);
  }

  /**
   * Applies an async verdict that arrived after the editor was already taken
   * down, because the user navigated away mid-validation.
   *
   * A passing value is written exactly as a synchronous commit would have
   * written it. A failing one is not: the cell keeps what it had, the failure is
   * flashed and reported, and `CELL_EDIT_STOP` carries the message so an
   * application can react.
   */
  private applyDeferredCommit(
    session: EditSession,
    value: unknown,
    result: ValidationResult,
  ): void {
    if (!result.valid) {
      this.reportInvalid(session, result);
      this.emitEditStop(session, session.currentValue, { error: result.message });
      return;
    }

    // Something else wrote to this cell while the rule was in flight — another
    // user's update, a paste, a recalculation. Landing a value validated against
    // state that no longer exists would silently undo that write.
    const current = getCellValue(session.rowNode.data, session.colDef);
    if (!isSameValue(current, session.originalValue)) {
      console.warn(
        `[PhotonGrid] the deferred edit to "${session.colDef.colId}" was dropped: ` +
          'the cell changed while its validation was still running.',
      );
      return;
    }

    const written = this.writeValue(session, value);
    this.emitEditStop(session, written);
  }

  /** Abandons the session; the cell keeps the value it had before editing. */
  cancel(): void {
    const session = this.session;
    if (!session || session.closing) return;
    this.teardown(session);
    this.emitEditStop(session, session.originalValue, { cancelled: true });
  }

  /**
   * Announces that an edit session has ended.
   *
   * The one place `CELL_EDIT_STOP` is emitted, because every caller has to obey
   * the same two rules: emit it once, and emit it only once the editor is
   * already unmounted. The grid repaints the edited cell on this event, so an
   * emit that races the teardown leaves the cell rendering its value twice.
   *
   * @param newValue - What the cell ended up with: the written value, or the
   *   original one for a cancel or a rejection.
   * @param extra - `error` for a rejected value, `cancelled` for an abandoned
   *   session. Omitted entirely for an ordinary successful commit.
   */
  private emitEditStop(
    session: EditSession,
    newValue: unknown,
    extra?: { readonly error?: string; readonly cancelled?: true },
  ): void {
    this.deps.eventBus.emit(GridEventType.CELL_EDIT_STOP, {
      row: session.rowNode,
      field: session.colDef.field,
      oldValue: session.originalValue,
      newValue,
      ...extra,
    });
  }

  /**
   * Closes the session, committing unless `cancel` is `true`.
   *
   * The signature the legacy `CellEditorEngine.stopEditing` had, so the
   * compatibility facade is a straight delegation.
   */
  stopEditing(cancel = false): void {
    if (cancel) this.cancel();
    else this.commit();
  }

  /**
   * Validates and writes a value without ever opening an editor.
   *
   * The path for edits whose "editor" is the rendered cell itself — a checkbox
   * or switch that toggles in place — and for programmatic writes that should
   * still behave like a user edit. It runs the identical validation, parsing,
   * value-setter, event and flash sequence a committed session runs, which is
   * what stops in-cell toggles from quietly bypassing a column's rules.
   *
   * Refuses when the grid is not editable, the column is locked or read-only, or
   * validation fails.
   *
   * @returns `true` when the value was written.
   */
  commitValue(rowNode: RowNode, colDef: ColumnDef, value: unknown, cellEl?: HTMLElement): boolean {
    if (this.config.mode === 'none') return false;

    const resolution = this.deps.resolver.resolve({
      colDef,
      node: rowNode,
      data: rowNode.data,
      rowIndex: rowNode.rowIndex,
      api: this.deps.getApi(),
    });
    // Reuses the resolver purely as the editability oracle: `editable: false`,
    // `locked`, and a per-row `editable` predicate all surface as `'none'`, so
    // this cannot drift from what opening an editor would have allowed.
    if (resolution.kind === 'none') return false;

    const parsed = parseValue(value, colDef);
    const outcome = this.deps.validation.validate(
      this.buildValidationContext(rowNode, colDef, parsed),
    );
    // Deliberately synchronous-only: an in-cell toggle has no editor to keep
    // open while an async rule settles, and silently applying the value later
    // would be worse than declining it now.
    if (isPromise(outcome)) {
      console.warn(
        '[PhotonGrid] async validation is not supported for in-cell commits; ' +
          `the change to "${colDef.colId}" was not applied.`,
      );
      return false;
    }
    if (!outcome.valid) return false;

    const originalValue = getCellValue(rowNode.data, colDef);
    if (isSameValue(parsed, originalValue)) return true;

    const nextData = { ...rowNode.data };
    if (!setCellValue(nextData, colDef, parsed, undefined)) return false;
    rowNode.data = nextData;

    this.deps.eventBus.emit(GridEventType.CELL_VALUE_CHANGED, {
      row: rowNode,
      colDef,
      oldValue: originalValue,
      newValue: parsed,
      rowIndex: rowNode.rowIndex,
    });
    this.flashCell(cellEl ?? null);
    return true;
  }

  /** Releases every resource the manager owns. Called when the grid is destroyed. */
  destroy(): void {
    if (this.session) this.teardown(this.session);
    this.deps.host.destroy();
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  /**
   * Runs the column's rules against a candidate value.
   *
   * Public so `GridApi.validateCell` can ask the same question without opening
   * an editor — one implementation, so an API check and a real commit can never
   * disagree.
   */
  validateValue(
    rowNode: RowNode,
    colDef: ColumnDef,
    value: unknown,
  ): ValidationResult | Promise<ValidationResult> {
    return this.deps.validation.validate(this.buildValidationContext(rowNode, colDef, value));
  }

  /** Builds the context and defers to the engine. */
  private runValidation(
    session: EditSession,
    value: unknown,
  ): ValidationResult | Promise<ValidationResult> {
    const parsed = parseValue(value, session.colDef);
    return this.deps.validation.validate(
      this.buildValidationContext(session.rowNode, session.colDef, parsed, session.originalValue),
    );
  }

  private buildValidationContext(
    rowNode: RowNode,
    colDef: ColumnDef,
    value: unknown,
    previousValue: unknown = getCellValue(rowNode.data, colDef),
  ): ValidationContext {
    return {
      value,
      previousValue,
      data: rowNode.data,
      node: rowNode,
      colDef,
      label: colDef.header || colDef.field,
      api: this.deps.getApi(),
    };
  }

  /** Reflects a validation outcome on the open editor without closing it. */
  private applyValidity(session: EditSession, result: ValidationResult): void {
    session.mounted?.setInvalid(result.valid ? null : result);
  }

  /**
   * Applies the configured reaction to a failed commit.
   *
   * `'keep-open'` (the default) annotates and waits — but only while the user is
   * still on the cell. Once they have navigated away there is nothing to keep
   * open: holding a rejected editor on a cell the user has left is what stranded
   * the grid in edit mode, so a `'navigate'` failure always closes and reverts,
   * and says why through the toast and the live region instead.
   *
   * `'revert'` discards the value. `'accept'` writes it anyway and leaves the
   * cell flagged, for flows that would rather capture bad data than block the
   * operator — and that stays true whichever way the user left.
   *
   * ### `CELL_EDIT_STOP` follows the session, not the failure
   * The event fires only on the paths that actually end the session, and always
   * after the editor has come down. A `'keep-open'` failure emits nothing: the
   * edit is still in progress, and the failure reaches the user through the
   * cell's red pulse, the live region and the toast instead.
   */
  private handleInvalid(
    session: EditSession,
    result: InvalidResult,
    reason: CommitReason,
  ): void {
    if (this.config.onInvalid === 'accept') {
      // The rejected value is written anyway, so the single `CELL_EDIT_STOP`
      // that closing emits carries the message rather than a second event
      // preceding it.
      this.writeAndClose(session, this.readValue(session), result.message);
      return;
    }

    if (this.config.onInvalid === 'revert' || reason === 'navigate') {
      // Teardown *before* the event. `CELL_EDIT_STOP` is what makes the grid
      // repaint the cell, and `unmount` puts back the rendered nodes the editor
      // hid — so emitting first means the repaint happens, then the unmount
      // appends the stale nodes next to it and the cell shows its value twice.
      this.teardown(session);
      this.emitEditStop(session, session.originalValue, { error: result.message });
      // Reported *after* teardown: `unmount` cancels any pending cell flash, so
      // flashing first would erase the very signal being raised.
      this.reportInvalid(session, result);
      return;
    }

    // `'keep-open'`: the session has *not* stopped. Deliberately no
    // `CELL_EDIT_STOP` — the editor is still mounted and still owns the cell's
    // DOM, and the grid repaints the cell on that event. Emitting it here tore
    // the live control out of the document mid-edit; the blur that produced
    // then ran the whole commit a second time, for a second toast and a cell
    // left showing its value twice.
    this.applyValidity(session, result);
  }

  /**
   * Surfaces a failure on a cell whose editor has already gone: the red pulse,
   * the toast and the screen-reader announcement, without the `aria-invalid`
   * that belongs to a live control.
   */
  private reportInvalid(session: EditSession, result: InvalidResult): void {
    session.mounted?.setInvalid(result);
  }

  // ── Commit ────────────────────────────────────────────────────────────────

  /** Reads the authoritative value from the editor, falling back to the reported one. */
  private readValue(session: EditSession): unknown {
    try {
      return session.editor ? session.editor.getValue() : session.currentValue;
    } catch (err) {
      console.error('[PhotonGrid] cell editor getValue failed:', err);
      return session.currentValue;
    }
  }

  /**
   * Writes a committed value through the grid's value pipeline.
   *
   * Split from {@link writeAndClose} because a value validated asynchronously is
   * written *after* its editor has already been taken down — the session is over
   * by the time the verdict arrives, but the write still has to happen exactly
   * the way a synchronous one would.
   *
   * The write goes through `setCellValue`, so a column `valueSetter` still owns
   * the assignment, and onto a fresh `data` object, preserving the grid's
   * one-new-reference-per-edit contract.
   *
   * @returns The value that was written — the formula source for a formula
   *   cell, the parsed value otherwise.
   */
  private writeValue(session: EditSession, raw: unknown): unknown {
    const { rowNode, colDef, originalValue, cellEl } = session;

    // Formula entry short-circuits the literal path entirely: the delegate owns
    // the write, the recalculation and its own change event.
    if (
      typeof raw === 'string' &&
      colDef.allowFormula === true &&
      this.formulaCommit &&
      isFormulaSource(raw) &&
      this.formulaCommit(rowNode, colDef, raw)
    ) {
      this.flashCell(cellEl);
      return raw;
    }

    const parsed = parseValue(raw, colDef);

    if (!isSameValue(parsed, originalValue)) {
      const nextData = { ...rowNode.data };
      if (setCellValue(nextData, colDef, parsed, undefined)) {
        rowNode.data = nextData;
        this.deps.eventBus.emit(GridEventType.CELL_VALUE_CHANGED, {
          row: rowNode,
          colDef,
          oldValue: originalValue,
          newValue: parsed,
          rowIndex: rowNode.rowIndex,
        });
        this.flashCell(cellEl);
      }
    }

    return parsed;
  }

  /**
   * Writes the committed value and ends the session.
   *
   * @param error - Set only on the `onInvalid: 'accept'` path, where a rejected
   *   value is written deliberately and the message travels with the one event
   *   that closing emits.
   */
  private writeAndClose(session: EditSession, raw: unknown, error?: string): void {
    const written = this.writeValue(session, raw);

    this.teardown(session);
    this.emitEditStop(session, written, error === undefined ? undefined : { error });
  }

  /** Unmounts the editor and clears every trace of the session. */
  private teardown(session: EditSession): void {
    session.closing = true;
    if (session.validationTimer !== null) clearTimeout(session.validationTimer);
    for (const dispose of session.disposers) {
      try {
        dispose();
      } catch (err) {
        console.error('[PhotonGrid] editor teardown failed:', err);
      }
    }
    session.disposers.length = 0;
    session.mounted?.unmount();
    if (this.session?.id === session.id) {
      this.session = null;
      this.deps.store.set('editingCellId', null);
    }
  }

  /**
   * Plays the fill-flash confirmation on a committed cell.
   *
   * Deferred a task and restarted by removing the class first, so two edits in
   * quick succession each get their own visible flash rather than the second
   * being swallowed by the first animation still running.
   */
  private flashCell(cellEl: HTMLElement | null): void {
    if (!cellEl) return;
    setTimeout(() => {
      cellEl.classList.remove('pg-cell--fill-flash');
      void cellEl.offsetWidth;
      cellEl.classList.add('pg-cell--fill-flash');
      setTimeout(() => cellEl.classList.remove('pg-cell--fill-flash'), 700);
    }, 0);
  }

  // ── Params ────────────────────────────────────────────────────────────────

  /** Assembles the frozen bag handed to `ICellEditor.init`. */
  private buildParams(
    session: EditSession,
    editor: ICellEditor,
    eventKey: string | null,
  ): CellEditorParams {
    const base = {
      // `currentValue` rather than `originalValue`: they differ only when the
      // caller supplied an `editValue`, and in that case it is the one the
      // editor must present. See `StartEditRequest.editValue`.
      value: session.currentValue,
      initialValue: session.currentValue,
      data: session.rowNode.data,
      node: session.rowNode,
      colDef: session.colDef,
      rowIndex: session.rowNode.rowIndex,
      cellElement: session.cellEl,
      api: this.deps.getApi(),
      trigger: session.trigger,
      eventKey,
      onValueChange: (value: unknown) => this.updateValue(value),
      commit: () => this.commit(),
      cancel: () => this.cancel(),
      commitAndMove: (backwards = false) => {
        this.commit();
        this.tabHandler?.(backwards);
      },
    };
    return { ...base, params: this.resolveEditorParams(session, base) };
  }

  /**
   * Resolves `ColumnDef.cellEditorParams`, calling the function form.
   *
   * A throwing params function degrades to `{}` rather than killing the session:
   * an editor with default options is far better than a cell that refuses to
   * open.
   */
  private resolveEditorParams(
    session: EditSession,
    base: Omit<CellEditorParams, 'params'>,
  ): Readonly<Record<string, unknown>> {
    const spec = session.colDef.cellEditorParams;
    if (spec === undefined || spec === null) return {};
    if (typeof spec !== 'function') return spec as Readonly<Record<string, unknown>>;
    try {
      return (spec as (p: Omit<CellEditorParams, 'params'>) => Record<string, unknown>)(base) ?? {};
    } catch (err) {
      console.error('[PhotonGrid] cellEditorParams threw; using defaults:', err);
      return {};
    }
  }
}
