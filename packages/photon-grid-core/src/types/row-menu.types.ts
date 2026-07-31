/**
 * Photon Grid — public configuration types for the **row context menu**
 * (right-click on a data row).
 *
 * The model is declarative and closed over a single context object: an item
 * describes *what* it is, and every dynamic aspect — label, icon, enablement,
 * visibility, checked state — may be supplied either as a literal or as a
 * function of the row the menu was opened on. Nothing needs to be rebuilt when
 * the data changes; the menu re-resolves on every open.
 *
 * Consumed by {@link import('../renderer/row-menu-builder').buildRowMenuItems}
 * and surfaced on the public API through `GridOptions.rowMenu`.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from './column.types';
import type { RowNode } from './row.types';
import type { CellRange } from './grid.types';

// ── Dynamic values ──────────────────────────────────────────────────────────

/**
 * A value that may be given directly or derived from the clicked row.
 *
 * The function form is evaluated each time the menu opens, which is what lets
 * one item definition serve every row instead of needing one per row.
 *
 * @typeParam T - The resolved value type.
 */
export type RowMenuValue<T> = T | ((ctx: RowMenuItemContext) => T);

/**
 * A boolean that may be given directly or derived from the clicked row.
 *
 * Retained as a distinct name because it predates {@link RowMenuValue} and is
 * part of the public API.
 */
export type RowMenuItemPredicate = RowMenuValue<boolean>;

/**
 * An item's icon.
 *
 * A **string** is a name resolved through the grid's icon registry — the same
 * names the column menu accepts (`'copy'`, `'trash'`, `'download'`, …).
 *
 * A **function** is a custom renderer: return an `HTMLElement` to mount, or an
 * HTML string to set as markup. Use it for avatars, status dots, or icons from
 * a design system the registry does not carry.
 *
 * @example
 * ```ts
 * icon: 'trash'                                     // registry
 * icon: (ctx) => ctx.data?.['ok'] ? 'check' : 'warning'   // registry, per row
 * icon: (ctx) => myIconEl(ctx.data)                 // custom element
 * ```
 */
export type RowMenuIcon = string | ((ctx: RowMenuItemContext) => string | HTMLElement);

// ── Built-in items ──────────────────────────────────────────────────────────

/**
 * Stable identifier for every built-in row-menu item.
 *
 * Pass these to {@link RowMenuConfig.suppressItems} to hide individual entries.
 * `chartRange` and `export` are submenu parents; suppressing a parent removes
 * its whole fly-out.
 */
export type RowMenuItemId =
  | 'cut'
  | 'copy'
  | 'copyWithHeaders'
  | 'paste'
  | 'chartRange'
  | 'export'
  | 'exportCsv';

// ── Context ─────────────────────────────────────────────────────────────────

/**
 * Imperative handle on the open menu, handed to every item handler.
 *
 * Lets an action drive the menu itself rather than guessing at its lifecycle —
 * keep it open while a multi-step flow runs, re-resolve labels after mutating
 * data, or close it early.
 */
export interface RowMenuController {
  /** Closes the menu immediately. */
  close(): void;
  /**
   * Re-resolves and re-renders every item against current data.
   *
   * Call after an action mutates state the menu displays (a checkbox's
   * `checked`, a dynamic label) while keeping the menu open.
   */
  refresh(): void;
  /**
   * Shows or clears the busy indicator on the item being activated.
   *
   * Applied automatically around an `async` action; call it manually only when
   * the work is not expressed as the returned promise.
   */
  setLoading(loading: boolean): void;
}

/**
 * Everything a handler needs to know about the click that opened the menu.
 *
 * Handed to `action`, to every dynamic value, and to the confirmation
 * resolver. Fields that cannot be resolved are `null` rather than absent, so a
 * handler can destructure without guards.
 */
export interface RowMenuItemContext {
  /**
   * The grid's public `GridApi`. Typed as `unknown` to avoid a
   * renderer → api import cycle; cast to `GridApi` at the call site.
   */
  readonly api: unknown;
  /** The row the menu was opened on, or `null` if it could not be resolved. */
  readonly row: RowNode | null;
  /** Display index of that row within the currently visible rows. */
  readonly rowIndex: number;
  /** Convenience accessor equal to `row?.data`, or `null`. */
  readonly data: Record<string, unknown> | null;
  /** The column whose cell was right-clicked, or `null` outside a data cell. */
  readonly colDef: ColumnDef | null;
  /** Convenience accessor equal to `colDef?.colId`, or `null`. */
  readonly colId: string | null;
  /** The clicked cell's value, or `undefined` when there is no cell. */
  readonly value: unknown;
  /**
   * Every currently selected row, in display order. Empty when nothing is
   * selected — an action can serve both "the clicked row" and "the selection"
   * without querying the grid itself.
   */
  readonly selectedRows: readonly RowNode[];
  /** The active cell ranges, for actions that operate on a selected block. */
  readonly selectedRanges: readonly CellRange[];
  /** The `contextmenu` event that opened the menu, or `null`. */
  readonly event: MouseEvent | null;
  /**
   * Closes the menu.
   *
   * Shorthand for `menu.close()` — hoisted onto the context because closing is
   * by far the most common thing an action does to the menu, and it reads
   * cleanly inline:
   *
   * ```ts
   * action: (ctx) => { toggleWatch(ctx.data); ctx.close(); }
   * ```
   *
   * Useful mainly on checkbox and radio items, which stay open by default so
   * several options can be set in one visit; a plain action already closes the
   * menu unless it sets `keepOpen`.
   */
  readonly close: () => void;
  /** Imperative control over the open menu. */
  readonly menu: RowMenuController;
}

// ── Confirmation ────────────────────────────────────────────────────────────

/**
 * Declarative confirmation shown before an item's action runs.
 *
 * Rendered by the grid's built-in dialog unless
 * {@link RowMenuConfig.confirmHandler} replaces it with the application's own.
 */
export interface RowMenuConfirmOptions {
  /** Dialog heading. Defaults to `'Are you sure?'`. */
  readonly title?: RowMenuValue<string>;
  /** Body text explaining the consequence. */
  readonly message: RowMenuValue<string>;
  /** Label of the confirming button. Defaults to `'Confirm'`. */
  readonly confirmLabel?: RowMenuValue<string>;
  /** Label of the dismissing button. Defaults to `'Cancel'`. */
  readonly cancelLabel?: RowMenuValue<string>;
  /**
   * Styles the confirming button as destructive. Set for irreversible actions
   * so the dialog itself carries the warning.
   */
  readonly danger?: boolean;
}

/**
 * A confirmation request with every dynamic value already resolved — the shape
 * handed to {@link RowMenuConfig.confirmHandler}.
 */
export interface RowMenuConfirmRequest {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly danger: boolean;
  /** The context of the item being confirmed. */
  readonly ctx: RowMenuItemContext;
}

/**
 * Application-supplied confirmation resolver.
 *
 * Return `true` to proceed with the action, `false` to abandon it. Replaces
 * the built-in dialog everywhere in the menu, so an application with its own
 * modal system keeps one consistent look.
 */
export type RowMenuConfirmHandler = (request: RowMenuConfirmRequest) => boolean | Promise<boolean>;

// ── Items ───────────────────────────────────────────────────────────────────

/**
 * Fields shared by every interactive item.
 *
 * `label`, `icon`, `disabled`, `hidden` and `tooltip` all accept the function
 * form, so a single definition adapts to the row it is opened on.
 */
export interface RowMenuItemCommon {
  /**
   * Stable id. Included in the `ROW_MENU_ITEM_CLICKED` event payload, so give
   * items an id when handling them through the event bus rather than `action`.
   */
  readonly id?: string;
  /** Text shown for the item. */
  readonly label: RowMenuValue<string>;
  /** Leading icon — a registry name or a custom renderer. */
  readonly icon?: RowMenuIcon;
  /** Keyboard hint rendered right-aligned, e.g. `'Ctrl+K'`. Display only. */
  readonly kbd?: string;
  /** Native tooltip text. */
  readonly tooltip?: RowMenuValue<string>;
  /** Extra class applied to the item element, for host-specific styling. */
  readonly cssClass?: string;
  /** Renders the item greyed out and non-interactive. */
  readonly disabled?: RowMenuItemPredicate;
  /** Omits the item entirely. Evaluated each time the menu opens. */
  readonly hidden?: RowMenuItemPredicate;
  /**
   * Draws a separator immediately above this item.
   *
   * @deprecated Prefer a standalone `{ type: 'separator' }` entry, which makes
   * the menu's structure visible in the item list itself. Still honoured.
   */
  readonly separatorBefore?: boolean;
  /**
   * Confirmation shown before `action` runs. The action is skipped when the
   * user dismisses it.
   */
  readonly confirm?: RowMenuConfirmOptions;
  /**
   * Keeps the menu open after activation.
   *
   * Defaults to `false` for actions and `true` for checkbox and radio items,
   * where toggling several options in one visit is the normal interaction.
   */
  readonly keepOpen?: boolean;
  /**
   * Invoked when the item is activated.
   *
   * May return a promise: the item shows a busy indicator and the menu stays
   * open until it settles, so the user sees that the work is in flight. A
   * rejection is reported through `ROW_MENU_ITEM_ERROR` and leaves the menu
   * open.
   */
  readonly action?: (ctx: RowMenuItemContext) => void | Promise<void>;
  /** Child items, rendered as a hover fly-out. Nesting is unbounded. */
  readonly children?: ReadonlyArray<RowMenuItem>;
}

/**
 * A plain command.
 *
 * The default kind: an item with no `type` is an action (or a submenu, when it
 * has `children`), which is what keeps pre-`type` definitions valid.
 */
export interface RowMenuActionItem extends RowMenuItemCommon {
  readonly type?: 'action';
}

/**
 * A grouping parent that opens its children on hover.
 *
 * Declaring `type: 'submenu'` is optional — any item with `children` behaves as
 * one — but stating it makes intent explicit in long definitions.
 */
export interface RowMenuSubmenuItem extends RowMenuItemCommon {
  readonly type?: 'submenu';
  readonly children: ReadonlyArray<RowMenuItem>;
}

/**
 * A toggle showing a check mark when on.
 *
 * @example
 * ```ts
 * {
 *   type: 'checkbox',
 *   label: 'Watch instrument',
 *   checked: (ctx) => ctx.data?.['watched'] === true,
 *   action: (ctx) => toggleWatch(ctx.data),
 * }
 * ```
 */
export interface RowMenuCheckboxItem extends RowMenuItemCommon {
  readonly type: 'checkbox';
  /** Current state. Re-resolved on open and on `menu.refresh()`. */
  readonly checked?: RowMenuItemPredicate;
}

/**
 * One option of a mutually exclusive set, showing a dot when selected.
 *
 * Items sharing a `group` form the set. The grid does not own the selection —
 * `checked` reads it from application state, exactly like a checkbox — so the
 * group is only used for accessibility semantics and visual grouping.
 *
 * @example
 * ```ts
 * { type: 'radio', group: 'density', label: 'Compact', value: 'compact',
 *   checked: (ctx) => density(ctx) === 'compact', action: () => setDensity('compact') }
 * ```
 */
export interface RowMenuRadioItem extends RowMenuItemCommon {
  readonly type: 'radio';
  /** Name of the mutually exclusive set this option belongs to. */
  readonly group: string;
  /** This option's value, surfaced in the click event payload. */
  readonly value?: string;
  /** `true` when this option is the selected one. */
  readonly checked?: RowMenuItemPredicate;
}

/**
 * A horizontal rule.
 *
 * A first-class item so a menu's structure is visible in its definition,
 * rather than inferred from flags on neighbouring entries. Leading, trailing
 * and consecutive separators are collapsed automatically, so a separator
 * beside a hidden item never leaves a stray line.
 */
export interface RowMenuSeparatorItem {
  readonly type: 'separator';
  /** Optional id, for parity with other items. */
  readonly id?: string;
  /** Omits the separator entirely. */
  readonly hidden?: RowMenuItemPredicate;
}

/**
 * Any item the user can interact with — everything except a separator.
 *
 * Named because it is the shape handlers and renderers actually work with:
 * separating it out is what lets `label`, `icon` and `action` be accessed
 * without a cast once a separator has been ruled out.
 */
export type RowMenuInteractiveItem =
  | RowMenuActionItem
  | RowMenuSubmenuItem
  | RowMenuCheckboxItem
  | RowMenuRadioItem;

/** Any entry in a row menu. */
export type RowMenuItem = RowMenuInteractiveItem | RowMenuSeparatorItem;

/**
 * @deprecated Renamed to {@link RowMenuItem}, which now covers separators,
 * checkboxes and radios as well as plain actions. The old name remains a valid
 * alias.
 */
export type RowMenuCustomItem = RowMenuItem;

// ── Config ──────────────────────────────────────────────────────────────────

/**
 * Row context-menu configuration, supplied as `GridOptions.rowMenu`.
 *
 * @example
 * ```ts
 * rowMenu: {
 *   position: 'top',
 *   suppressItems: ['paste'],
 *   items: [
 *     { id: 'open', label: 'Open record', icon: 'externalLink', action: open },
 *     { type: 'separator' },
 *     {
 *       id: 'delete', label: 'Delete', icon: 'trash',
 *       confirm: { message: (c) => `Delete ${c.data?.['name']}?`, danger: true },
 *       action: async (c) => { await api.remove(c.row!.nodeId); },
 *     },
 *   ],
 * }
 * ```
 */
export interface RowMenuConfig {
  /** Items shown alongside (or instead of) the built-in entries. */
  readonly items?: ReadonlyArray<RowMenuItem>;

  /**
   * Builds items for the row the menu was just opened on.
   *
   * Called on every open, after {@link items}, and its result is appended.
   * Use when the *set* of items varies by row; prefer the function forms of
   * `label` / `disabled` / `hidden` when only their state varies.
   */
  readonly getItems?: (ctx: RowMenuItemContext) => ReadonlyArray<RowMenuItem>;

  /**
   * Replaces the built-in confirmation dialog with the application's own.
   *
   * @see {@link RowMenuConfirmHandler}
   */
  readonly confirmHandler?: RowMenuConfirmHandler;

  /**
   * Where custom items sit relative to the built-in ones.
   * @default 'bottom'
   */
  readonly position?: 'top' | 'bottom';

  /** Built-in item ids to hide. */
  readonly suppressItems?: ReadonlyArray<RowMenuItemId>;

  /**
   * Set to `false` to drop every built-in entry and show only custom items.
   * @default true
   */
  readonly showBuiltInItems?: boolean;

  /**
   * Set to `false` to disable the row context menu entirely; right-click then
   * falls through to the browser's own menu.
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * @deprecated Renamed to {@link items}. Both are honoured and concatenated,
   * `items` first.
   */
  readonly customItems?: ReadonlyArray<RowMenuItem>;

  /** @deprecated Renamed to {@link getItems}. Both are honoured. */
  readonly getCustomItems?: (ctx: RowMenuItemContext) => ReadonlyArray<RowMenuItem>;
}
