/**
 * Photon Grid — public configuration types for the **`actions` cell renderer**:
 * a column of row-scoped commands (Edit, Archive, Delete, …) rendered as
 * buttons, an overflow menu, or a split of the two.
 *
 * The model is declarative and closed over a single params object: an action
 * describes *what* it is, and every dynamic aspect — label, icon, tone,
 * visibility, enablement, tooltip — may be given either as a literal or as a
 * function of the row it is drawn for. Nothing has to be rebuilt when the data
 * changes; the column re-resolves on every render.
 *
 * The shape deliberately mirrors {@link import('./row-menu.types').RowMenuItem},
 * because a row's commands are the same idea whether they are reached by
 * right-clicking the row or by pressing a button in it. Anything you know about
 * one transfers to the other.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from './column.types';
import type { RowNode } from './row.types';

// ── Dynamic values ──────────────────────────────────────────────────────────

/**
 * A value that may be given directly or derived from the row it is drawn for.
 *
 * The function form is evaluated on every render of the cell, which is what
 * lets one action definition serve every row instead of needing one per row.
 *
 * @typeParam T - The resolved value type.
 */
export type CellActionValue<T> = T | ((params: CellActionParams) => T);

/**
 * Visual tone of an action.
 *
 * Tone carries meaning, so it is a closed set rather than a free colour: a
 * `danger` action looks the same in every grid the application ships, and a
 * theme can restyle all of them at once.
 */
export type ActionVariant =
  /** Filled. The one action a row is normally there for. */
  | 'primary'
  /** Outlined. The default — safe, reversible commands. */
  | 'secondary'
  /** Confirms or completes something (Approve, Restore). */
  | 'success'
  /** Reversible but consequential (Archive, Suspend). */
  | 'warning'
  /** Destructive and hard to undo (Delete, Revoke). */
  | 'danger'
  /** Borderless, for dense icon-only rows. */
  | 'ghost';

/** Where an action's icon sits relative to its label. */
export type ActionIconPosition = 'prefix' | 'suffix';

/**
 * An action's icon.
 *
 * Always a registry name rather than markup, so every icon stays replaceable
 * through the icon registry and inherits the active icon pack.
 */
export interface ActionIconConfig {
  /** Icon-registry name, e.g. `'trash'`, `'edit'`, `'download'`. */
  readonly name: string;
  /** @default 'prefix' */
  readonly position?: ActionIconPosition;
  /** Size in px. Defaults to the size the action's layout uses. */
  readonly size?: number;
  /** Overrides the colour the action's variant would give the icon. */
  readonly color?: string;
}

/**
 * An icon given as a config, as a bare registry name, or resolved per row.
 *
 * Returning `undefined` from the function form draws no icon for that row —
 * the way to give one action an icon only in some states.
 */
export type CellActionIcon =
  | string
  | ActionIconConfig
  | ((params: CellActionParams) => string | ActionIconConfig | undefined);

// ── Params ──────────────────────────────────────────────────────────────────

/**
 * Imperative handle on the cell the action was drawn in.
 *
 * Lets a handler drive the UI it was invoked from rather than guessing at its
 * lifecycle — close the overflow menu, repaint the row after mutating it, or
 * show a busy indicator around work that is not expressed as a returned
 * promise.
 */
export interface CellActionController {
  /** Closes the overflow menu, if the action was invoked from one. */
  close(): void;
  /**
   * Repaints the row, so every action re-resolves its `visible`, `disabled`
   * and `label` against the new data.
   *
   * Call after an action mutates the row in place — an Archive that flips
   * `isDeleted` has to be followed by this, or the row keeps offering Archive.
   */
  refresh(): void;
  /**
   * Shows or clears the busy state on the control that was activated.
   *
   * Applied automatically around an `async` `onClick`; call it manually only
   * when the work is not expressed as the returned promise.
   */
  setLoading(loading: boolean): void;
}

/**
 * Everything an action needs to know about the row it is drawn for.
 *
 * Handed to every dynamic value, to the confirmation resolver, and to
 * `onClick`. Fields that cannot be resolved are `null` rather than absent, so a
 * handler can destructure without guards.
 *
 * @typeParam TData - Shape of the row data, for typed access in handlers.
 */
export interface CellActionParams<TData = Record<string, unknown>> {
  /** The action being resolved or invoked. */
  readonly action: GridAction;
  /** Shorthand for `action.id`. */
  readonly id: string;
  /**
   * The row's data object — what predicates read:
   * `visible: (p) => !p.row.isDeleted`.
   */
  readonly row: TData;
  /**
   * The row node behind {@link row}.
   *
   * `null` while the cell is being *drawn*: rendering is driven by row data,
   * and resolving the node per cell per frame would cost a lookup a predicate
   * almost never needs. Always present when an action is *invoked*, which is
   * where node-level work (selection, expansion, `nodeId`) belongs.
   */
  readonly node: RowNode | null;
  /** Display index of the row within the currently visible rows. */
  readonly rowIndex: number;
  /** The cell's own value, post `valueGetter`. */
  readonly value: unknown;
  /** The column the actions are drawn in. */
  readonly colDef: ColumnDef;
  /**
   * The grid's public `GridApi`. Typed as `unknown` to avoid a
   * renderer → api import cycle; cast to `GridApi` at the call site.
   */
  readonly api: unknown;
  /**
   * Application state shared with the grid, from `GridOptions.context`.
   *
   * The seam for everything an action needs but the row does not carry —
   * permissions, feature flags, the current user:
   * `visible: (p) => p.context.permissions.includes('DELETE')`.
   *
   * Always an object; `{}` when the host set none.
   */
  readonly context: Record<string, unknown>;
  /** The click that invoked the action. `null` while the cell is being drawn. */
  readonly event: MouseEvent | null;
  /** Imperative control over the cell and its menu. */
  readonly actions: CellActionController;
}

// ── Confirmation ────────────────────────────────────────────────────────────

/**
 * Declarative confirmation shown before an action runs.
 *
 * Rendered by the grid's built-in dialog unless
 * {@link ActionsRendererOptions.confirmHandler} replaces it with the
 * application's own.
 */
export interface CellActionConfirmOptions {
  /** Dialog heading. @default 'Are you sure?' */
  readonly title?: CellActionValue<string>;
  /** Body text explaining the consequence. */
  readonly message: CellActionValue<string>;
  /** Label of the confirming button. @default 'Confirm' */
  readonly confirmLabel?: CellActionValue<string>;
  /** Label of the dismissing button. @default 'Cancel' */
  readonly cancelLabel?: CellActionValue<string>;
  /**
   * Styles the confirming button as destructive.
   *
   * Defaults to `true` for a `danger` action, so an irreversible command
   * carries the warning into its dialog without being told to twice.
   */
  readonly danger?: boolean;
}

/** A confirmation with every dynamic value resolved — what a handler receives. */
export interface CellActionConfirmRequest {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly danger: boolean;
  /** Params of the action being confirmed. */
  readonly params: CellActionParams;
}

/**
 * Application-supplied confirmation resolver.
 *
 * Return `true` to proceed with the action, `false` to abandon it. Replaces the
 * built-in dialog for every action in the column, so an application with its
 * own modal system keeps one consistent look.
 */
export type CellActionConfirmHandler = (
  request: CellActionConfirmRequest,
) => boolean | Promise<boolean>;

// ── Action ──────────────────────────────────────────────────────────────────

/**
 * One row-scoped command.
 *
 * @example
 * ```ts
 * {
 *   id: 'delete',
 *   label: 'Delete',
 *   icon: { name: 'trash' },
 *   variant: 'danger',
 *   visible: (p) => p.context.permissions.includes('DELETE'),
 *   confirm: { title: 'Delete item?', message: 'This action cannot be undone' },
 *   onClick: (p) => api.remove(p.node!.nodeId),
 * }
 * ```
 */
export interface GridAction {
  /**
   * Stable identifier. Carried on `CELL_ACTION_CLICKED`, so one handler can
   * serve several action columns, and used to find the definition again when a
   * click arrives.
   *
   * Must be unique within a column: the first match wins.
   */
  readonly id: string;
  /**
   * Text shown for the action.
   *
   * Optional so an icon-only button is expressible, but supply one anyway — it
   * becomes the accessible name, and an icon-only control without it is
   * unreadable to a screen reader. Falls back to {@link id} for the accessible
   * name when omitted.
   */
  readonly label?: CellActionValue<string>;
  readonly icon?: CellActionIcon;
  /** @default 'secondary' */
  readonly variant?: CellActionValue<ActionVariant>;
  /**
   * Whether the action is offered at all. An invisible action is not rendered
   * and cannot be invoked, including through the event bus.
   * @default true
   */
  readonly visible?: CellActionValue<boolean>;
  /**
   * Renders the action greyed out and inert — offered, but not available for
   * this row. Prefer it over `visible: false` when its absence would be
   * confusing.
   * @default false
   */
  readonly disabled?: CellActionValue<boolean>;
  /** Native tooltip. Defaults to the label when the control is icon-only. */
  readonly tooltip?: CellActionValue<string>;
  /**
   * Accessible name, when it should differ from the label — `'Delete invoice
   * #1042'` for a button reading `'Delete'`.
   */
  readonly ariaLabel?: CellActionValue<string>;
  /** Extra class on this action's element, for host-specific styling. */
  readonly cssClass?: string;
  /** Confirmation shown before {@link onClick} runs. Dismissing skips the action. */
  readonly confirm?: CellActionConfirmOptions;
  /**
   * Keeps the overflow menu open after activation. Right for a toggle the user
   * may want to press repeatedly.
   * @default false
   */
  readonly keepOpen?: boolean;
  /**
   * Invoked when the action is activated, after any confirmation.
   *
   * May return a promise: the control shows a busy state and stays inert until
   * it settles, so the user sees the work is in flight and cannot fire it
   * twice. A rejection is reported through `CELL_ACTION_ERROR` rather than
   * being swallowed.
   *
   * Optional — every activation also emits `CELL_ACTION_CLICKED`, so a column
   * can be handled entirely through the event bus instead.
   */
  readonly onClick?: (params: CellActionParams) => void | Promise<void>;
}

// ── Renderer options ────────────────────────────────────────────────────────

/**
 * How a column's actions are laid out.
 *
 * - `'buttons'` — every visible action as a button. Anything past
 *   {@link ActionsRendererOptions.maxVisible} moves into an overflow menu.
 * - `'menu'` — one trigger opening every action in a dropdown. The choice for a
 *   narrow column, or for more than three commands.
 * - `'split'` — the leading action(s) as buttons, the rest behind the trigger.
 *   `'buttons'` with `maxVisible` defaulting to 1.
 */
export type ActionsLayout = 'buttons' | 'menu' | 'split';

/** Control density of an actions column. */
export type ActionsSize = 'sm' | 'md';

/**
 * Options for the `actions` renderer.
 *
 * @example
 * ```ts
 * {
 *   field: 'actions',
 *   header: 'Actions',
 *   width: 180,
 *   sortable: false,
 *   renderer: {
 *     name: 'actions',
 *     options: {
 *       layout: 'buttons',
 *       actions: [
 *         { id: 'archive', label: 'Archive', icon: { name: 'archive' },
 *           variant: 'warning', visible: (p) => !p.row.isDeleted, onClick: archive },
 *         { id: 'delete', label: 'Delete', icon: { name: 'trash' }, variant: 'danger',
 *           confirm: { title: 'Delete item?', message: 'This cannot be undone' },
 *           onClick: remove },
 *       ],
 *     },
 *   },
 * }
 * ```
 */
export interface ActionsRendererOptions {
  /** The commands this column offers. Resolved per row, in declaration order. */
  readonly actions: readonly GridAction[];
  /** @default 'buttons' */
  readonly layout?: ActionsLayout;
  /**
   * How many actions are drawn as buttons before the rest collapse into the
   * overflow menu.
   *
   * Defaults to every visible action for `'buttons'`, `1` for `'split'`, and
   * `0` for `'menu'`. Overflowed actions are not rendered until the menu is
   * opened, so a row offering twelve commands costs the DOM of one offering
   * two.
   */
  readonly maxVisible?: number;
  /** @default 'sm' */
  readonly size?: ActionsSize;
  /** Horizontal placement within the cell. @default 'start' */
  readonly align?: 'start' | 'center' | 'end';
  /**
   * Show labels on buttons. `false` renders icon-only buttons, falling back to
   * the label for any action without an icon.
   * @default true
   */
  readonly showLabels?: boolean;
  /** Icon-registry name for the overflow trigger. @default 'menuHorizontal' */
  readonly menuIcon?: string;
  /** Accessible name for the overflow trigger. @default 'Actions' */
  readonly menuLabel?: string;
  /** Heading shown above the menu's items. Omitted when unset. */
  readonly menuTitle?: string;
  /**
   * Accessible name for the group of buttons, announced before them.
   * @default 'Row actions'
   */
  readonly groupLabel?: string;
  /**
   * Drop disabled actions instead of drawing them greyed out. Applies to the
   * whole column; an individual action still decides with `visible`.
   * @default false
   */
  readonly hideDisabled?: boolean;
  /**
   * Identifier carried on `CELL_ACTION_CLICKED`, so one handler can serve
   * several action columns without comparing `colDef`.
   */
  readonly group?: string;
  /** Replaces the built-in confirmation dialog. @see CellActionConfirmHandler */
  readonly confirmHandler?: CellActionConfirmHandler;
  /** Shown when no action resolves as visible for a row. Defaults to an empty cell. */
  readonly emptyText?: string;
  /** Extra class applied to the renderer's root element. */
  readonly cssClass?: string;
}
