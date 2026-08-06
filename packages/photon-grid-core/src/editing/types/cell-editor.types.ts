/**
 * The editor contract every Photon Grid cell editor implements — built-in,
 * hand-written, or wrapped from an Angular / React / Vue component.
 *
 * The grid core knows only this interface. Framework support is added from the
 * outside by registering a {@link FrameworkEditorAdapter}, which is why nothing
 * under `src/` imports a framework, and why an application can ship an editor
 * the core has never heard of.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type { ValidationResult } from './validation.types';

// ─── Editor lifecycle ─────────────────────────────────────────────────────────

/**
 * Why an edit session started.
 *
 * Editors use it to decide their opening state — a `'type'` trigger should
 * replace the cell's content with the typed character, whereas `'dblclick'`
 * should present the existing value selected. Exposed as a union rather than a
 * boolean so a new trigger can be added without changing the shape.
 */
export type EditTrigger =
  /** Mouse activation — double-click, or single-click under `singleClickEdit`. */
  | 'click'
  /** `Enter` or `F2` on the focused cell. */
  | 'key'
  /** A printable character typed on the focused cell, which seeds the editor. */
  | 'type'
  /** `Tab` navigation carried the session into this cell. */
  | 'navigation'
  /** `GridApi.startEditing`, or any other programmatic entry. */
  | 'api';

/**
 * Everything an editor is given when it opens.
 *
 * One frozen bag rather than positional arguments, so adding a capability never
 * breaks an existing editor's signature.
 *
 * @typeParam TValue - Type of the cell value this editor edits.
 * @typeParam TData - Shape of the row's `data` object.
 * @typeParam TParams - Shape of `ColumnDef.cellEditorParams` for this editor.
 */
export interface CellEditorParams<
  TValue = unknown,
  TData = Record<string, unknown>,
  TParams = Record<string, unknown>,
> {
  /** The cell's current value, as the editor should first present it. */
  readonly value: TValue;
  /**
   * The value the cell held when the session opened. Unchanged for the
   * session's lifetime, so an editor can offer its own "revert" affordance.
   */
  readonly initialValue: TValue;
  /** The row's data object. Treat as read-only; commit through {@link onValueChange}. */
  readonly data: Readonly<TData>;
  /** The row node being edited. */
  readonly node: RowNode;
  /** The column being edited. */
  readonly colDef: ColumnDef;
  /** Zero-based index of the row within the currently displayed rows. */
  readonly rowIndex: number;
  /** The `.pg-cell` element the session belongs to, for measuring or anchoring. */
  readonly cellElement: HTMLElement;
  /**
   * Editor-specific configuration from `ColumnDef.cellEditorParams`, already
   * resolved (a function form has been called). `{}` when none was supplied, so
   * an editor never needs a null check.
   */
  readonly params: Readonly<TParams>;
  /** The live grid API, for editors that need to read elsewhere in the grid. */
  readonly api: unknown;
  /** What opened the session. */
  readonly trigger: EditTrigger;
  /**
   * The character that opened a `'type'` session, so the editor can seed itself
   * with it. `null` for every other trigger.
   */
  readonly eventKey: string | null;
  /**
   * Reports a new value to the grid as the user works.
   *
   * Optional to call: the grid reads {@link ICellEditor.getValue} on commit
   * regardless. Call it when live feedback matters — `validateOn: 'change'`
   * validation, or a dependent cell that should update as you type.
   */
  readonly onValueChange: (value: TValue) => void;
  /** Commits the current value and closes the session, as `Enter` would. */
  readonly commit: () => void;
  /** Abandons the session and restores the original value, as `Escape` would. */
  readonly cancel: () => void;
  /**
   * Commits and moves to the next (or, with `backwards`, previous) editable
   * cell — what an editor should call to reproduce `Tab` from a custom control.
   */
  readonly commitAndMove: (backwards?: boolean) => void;
}

/**
 * The one interface every editor implements, whatever built it.
 *
 * ### Contract
 * `init` runs first and may be asynchronous — the grid awaits it before
 * mounting, so an editor may fetch its option list before appearing. `getGui`
 * must return the same element for the session's lifetime. `getValue` is the
 * single source of truth at commit time; a value pushed through
 * `onValueChange` is a convenience, not a substitute.
 *
 * ### What it must not do
 * Write to `data`, or assume it is inline — `isPopup` decides that, and a popup
 * editor is mounted into a portal outside the grid's clipping context.
 *
 * @typeParam TValue - Type of the cell value this editor edits.
 * @typeParam TData - Shape of the row's `data` object.
 * @typeParam TParams - Shape of `ColumnDef.cellEditorParams` for this editor.
 *
 * @example
 * ```ts
 * class UppercaseEditor implements ICellEditor<string> {
 *   private input!: HTMLInputElement;
 *
 *   init(params: CellEditorParams<string>): void {
 *     this.input = document.createElement('input');
 *     this.input.value = String(params.value ?? '');
 *     this.input.addEventListener('input', () => params.onValueChange(this.getValue()));
 *   }
 *   getGui(): HTMLElement { return this.input; }
 *   getValue(): string { return this.input.value.toUpperCase(); }
 *   focus(): void { this.input.focus(); this.input.select(); }
 * }
 * ```
 */
export interface ICellEditor<
  TValue = unknown,
  TData = Record<string, unknown>,
  TParams = Record<string, unknown>,
> {
  /**
   * Prepares the editor. Called exactly once, before {@link getGui}.
   *
   * Returning a promise delays the session opening until it settles, which is
   * the supported way to load options or permissions first. The grid shows the
   * cell unchanged meanwhile and discards the session if it is cancelled while
   * the promise is in flight.
   */
  init(params: CellEditorParams<TValue, TData, TParams>): void | Promise<void>;

  /**
   * The editor's root element. Must be stable for the session — the grid mounts
   * this exact node and never re-reads it.
   */
  getGui(): HTMLElement;

  /** The value to commit. Read once, at commit time. */
  getValue(): TValue;

  /**
   * Moves keyboard focus into the editor. Called after the GUI is attached.
   * Implement it for any editor that is not a bare focusable input — otherwise
   * the grid's fallback focuses the first focusable descendant.
   */
  focus?(): void;

  /**
   * Runs once the GUI is in the document, so measurement, `select()`, and
   * anything else needing layout is safe here (it is not, in {@link init}).
   */
  afterGuiAttached?(): void;

  /**
   * Updates an open editor in place when the underlying value changed beneath
   * it — a streaming feed, or an undo landing mid-edit.
   *
   * @returns `true` when the editor absorbed the change. Returning `false` (or
   *   not implementing this) makes the grid close and reopen the session.
   */
  refresh?(params: CellEditorParams<TValue, TData, TParams>): boolean;

  /** Releases listeners, timers and any DOM mounted outside {@link getGui}. */
  destroy?(): void;

  /**
   * `true` to mount the editor in a portal above the grid instead of inside the
   * cell. Use it whenever the control is larger than a cell — a calendar, a
   * searchable list, a rich-text surface.
   *
   * Read once, immediately after {@link init}.
   */
  isPopup?(): boolean;

  /**
   * Vetoes the session before anything is mounted — a per-row permission check,
   * typically. Read once, immediately after {@link init}.
   *
   * @returns `true` to abandon the session silently.
   */
  isCancelBeforeStart?(): boolean;

  /**
   * Editor-local validation, run *before* the column's declarative rules.
   *
   * For state only the editor knows — a masked input that is half-filled, an
   * autocomplete whose text matches no option. Column-level concerns belong in
   * `ColumnDef.validation`, where every framework's editors share them.
   */
  validate?(): ValidationResult | Promise<ValidationResult>;
}

// ─── Specifying an editor on a column ─────────────────────────────────────────

/**
 * A `new`-able editor class.
 *
 * The preferred form: the grid constructs one instance per session, so an
 * editor may hold per-session state in fields without any reset logic.
 */
export interface CellEditorConstructor<
  TValue = unknown,
  TData = Record<string, unknown>,
  TParams = Record<string, unknown>,
> {
  new (): ICellEditor<TValue, TData, TParams>;
}

/**
 * A factory returning a fresh editor per session — the closure-style
 * alternative to a class, for codebases that prefer functions.
 */
export type CellEditorFactory<
  TValue = unknown,
  TData = Record<string, unknown>,
  TParams = Record<string, unknown>,
> = () => ICellEditor<TValue, TData, TParams>;

/**
 * The built-in editor keys, as a union so `cellEditor: 'sel…'` completes in the
 * editor and a typo is a compile error.
 */
export type BuiltInEditorName =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'password'
  | 'url'
  | 'checkbox'
  | 'switch'
  | 'select'
  | 'autocomplete'
  | 'date'
  | 'datetime'
  | 'time'
  | 'color'
  | 'range';

/**
 * Everything `ColumnDef.cellEditor` accepts.
 *
 * `(string & {})` alongside the literal union is the trick that keeps
 * IntelliSense listing the built-ins while still admitting any key registered
 * through {@link EditorRegistry}. `unknown` covers framework components, which
 * are matched at resolve time by a registered {@link FrameworkEditorAdapter} —
 * that member is what keeps the core free of framework types.
 */
export type CellEditorSpec<
  TValue = unknown,
  TData = Record<string, unknown>,
  TParams = Record<string, unknown>,
> =
  | BuiltInEditorName
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {})
  | CellEditorConstructor<TValue, TData, TParams>
  | CellEditorFactory<TValue, TData, TParams>
  | ICellEditor<TValue, TData, TParams>
  | object;

/**
 * `ColumnDef.cellEditorParams`, either literal or derived per cell.
 *
 * The function form receives the same bag the editor will, minus the params
 * themselves, so option lists can depend on the row being edited.
 */
export type CellEditorParamsSpec<
  TValue = unknown,
  TData = Record<string, unknown>,
  TParams = Record<string, unknown>,
> =
  | TParams
  | ((params: Omit<CellEditorParams<TValue, TData, TParams>, 'params'>) => TParams);

// ─── Editability ──────────────────────────────────────────────────────────────

/**
 * What `ColumnDef.editable` is given when it is a predicate — the row-level
 * facts a per-row permission check needs, and nothing more.
 */
export interface EditableParams<TData = Record<string, unknown>> {
  readonly data: Readonly<TData>;
  readonly node: RowNode;
  readonly colDef: ColumnDef;
  readonly rowIndex: number;
  readonly api: unknown;
}

/**
 * `ColumnDef.editable`: a flat boolean, or a per-row predicate.
 *
 * @example
 * ```ts
 * { field: 'discount', editable: ({ data }) => data.status === 'draft' }
 * ```
 */
export type EditableSpec<TData = Record<string, unknown>> =
  | boolean
  | ((params: EditableParams<TData>) => boolean);

// ─── Framework seam ───────────────────────────────────────────────────────────

/**
 * Teaches the grid to build an {@link ICellEditor} out of something it does not
 * understand — an Angular `@Component`, a React function component, a Vue
 * component-options object.
 *
 * This is the **only** framework seam in the editing system, and it points
 * outwards: the core calls `canHandle` / `create` and never imports anything a
 * framework owns. Each wrapper package registers exactly one of these at grid
 * construction, which is what makes `cellEditor: MyAngularEditorComponent`
 * work without a line of Angular in `photon-grid-core`.
 *
 * @example
 * ```ts
 * gridApi.registerEditorAdapter({
 *   name: 'angular',
 *   canHandle: (spec) => typeof spec === 'function' && 'ɵcmp' in spec,
 *   create: (spec) => new AngularEditorBridge(spec as Type<unknown>, injector),
 * });
 * ```
 */
export interface FrameworkEditorAdapter {
  /** Diagnostic name, surfaced in errors when an adapter throws. */
  readonly name: string;
  /**
   * Whether this adapter recognises `spec` as one of its components.
   *
   * Must be cheap and must not throw: it is called for every registered adapter
   * until one matches. Be specific — a loose predicate will swallow specs meant
   * for another adapter in a mixed-framework page.
   */
  canHandle(spec: unknown): boolean;
  /**
   * Wraps `spec` in an editor. Called once per session, so the returned object
   * may hold session state.
   */
  create(spec: unknown): ICellEditor;
}
