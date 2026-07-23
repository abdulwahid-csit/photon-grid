import type { ColumnDef } from './column.types';

/**
 * Photon Grid — public configuration types for the column header context menu.
 *
 * These types drive which built-in actions appear in the column menu (per column
 * and grid-wide), let hosts suppress individual items, and let hosts inject fully
 * custom items and actions. They are consumed by
 * {@link import('../renderer/column-menu').ColumnMenu} and surfaced on the public
 * API through {@link import('./column.types').ColumnDef.menu} and
 * `GridOptions.columnMenu` / `GridOptions.getColumnMenuItems`.
 *
 * @packageDocumentation
 */

// ── Enums ──────────────────────────────────────────────────────────────────────

/**
 * Identifiers for the nine logical sections of the column context menu.
 *
 * Pass a subset to {@link ColumnMenuConfig.sections} to restrict which sections
 * are rendered — for example, `[ColumnMenuSection.SORT, ColumnMenuSection.PIN]`.
 * Sections render in the order they appear in the array.
 */
export enum ColumnMenuSection {
  /** Sort Ascending / Sort Descending / Clear Sort. */
  SORT = 'sort',
  /** Filter entry point (opens the advanced filter panel). */
  FILTER = 'filter',
  /** Pin submenu: Pin Left / Pin Right / Unpin. */
  PIN = 'pin',
  /** Move Left / Move Right / Move to Start / Move to End. */
  MOVE = 'move',
  /** Resize submenu: Auto Size / Auto Size All / Fit to Grid / Reset Width. */
  RESIZE = 'resize',
  /** Visibility submenu: Hide Column / Column Chooser. */
  VISIBILITY = 'visibility',
  /** Group by Column + Aggregate submenu. */
  DATA = 'data',
  /** Clipboard submenu: Copy Header / Copy Column / Copy Values. */
  CLIPBOARD = 'clipboard',
  /** Column submenu: Rename / Duplicate / Freeze / Lock / Reset. */
  COLUMN = 'column',
}

/**
 * Aggregate functions available in the Data → Aggregate submenu.
 * Only offered on columns whose {@link ColumnDef.type} is `'number'` or `'currency'`.
 */
export enum AggregateFunction {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
}

// ── Item identifiers ────────────────────────────────────────────────────────────

/**
 * Stable identifier for every built-in column-menu item.
 *
 * These ids are the units of configuration: pass them to
 * {@link ColumnMenuConfig.suppressItems} to hide individual items, and receive
 * them (in render order) as the first argument to `GridOptions.getColumnMenuItems`.
 *
 * The ids are grouped by section for readability. Submenu **parent** items carry
 * their own id (e.g. `'pinSubmenu'`); suppressing a parent hides the whole submenu.
 */
export type ColumnMenuItemId =
  // Sort
  | 'sortAsc' | 'sortDesc' | 'sortClear'
  // Filter
  | 'filter'
  // Pin
  | 'pinSubmenu' | 'pinLeft' | 'pinRight' | 'unpin'
  // Move
  | 'moveLeft' | 'moveRight' | 'moveStart' | 'moveEnd'
  // Resize
  | 'resizeSubmenu' | 'autoSize' | 'autoSizeAll' | 'fitToGrid' | 'resetWidth'
  // Visibility
  | 'visibilitySubmenu' | 'hideColumn' | 'columnChooser'
  // Data
  | 'groupBy'
  | 'aggregateSubmenu' | 'aggSum' | 'aggAvg' | 'aggMin' | 'aggMax' | 'aggCount'
  // Clipboard
  | 'clipboardSubmenu' | 'copyHeader' | 'copyColumn' | 'copyValues'
  // Column
  | 'columnSubmenu' | 'rename' | 'duplicate' | 'freeze' | 'lock' | 'resetColumn';

// ── Custom items ────────────────────────────────────────────────────────────────

/**
 * Context handed to a {@link ColumnMenuCustomItem.action} when the item is
 * activated (by click or keyboard).
 */
export interface ColumnMenuItemContext {
  /** The column definition the menu was opened for. */
  readonly colDef: ColumnDef;
  /** Convenience accessor equal to `colDef.colId`. */
  readonly colId: string;
  /**
   * The grid's public `GridApi`. Typed as `unknown` to avoid a
   * renderer → api import cycle; cast to `GridApi` at the call site.
   */
  readonly api: unknown;
}

/**
 * A host-authored custom menu item, injected via
 * {@link ColumnMenuConfig.customItems} or returned from `getColumnMenuItems`.
 *
 * Provide `action` for a clickable leaf, or `children` for a fly-out submenu
 * (one level of nesting is supported). A stable `id` enables de-duplication when
 * the same item is supplied both grid-wide and per column.
 *
 * @example
 * ```ts
 * {
 *   id: 'export-col',
 *   label: 'Export column…',
 *   icon: 'download',
 *   action: (ctx) => (ctx.api as GridApi).exportColumn(ctx.colId),
 * }
 * ```
 */
export interface ColumnMenuCustomItem {
  /**
   * Optional stable id. When the same id is supplied both grid-wide and on a
   * column, the column's item wins and the grid's copy is dropped.
   */
  readonly id?: string;
  /** Text shown for the item. */
  readonly label: string;
  /** Optional icon name resolved through the grid's {@link import('../icons/icon-registry').IconRegistry}. */
  readonly icon?: string;
  /** When `true`, the item is rendered but not interactive. */
  readonly disabled?: boolean;
  /** Invoked when the item is activated. Omit for a pure submenu parent. */
  readonly action?: (ctx: ColumnMenuItemContext) => void;
  /** Child items, rendered as a fly-out submenu. One level of nesting only. */
  readonly children?: ReadonlyArray<ColumnMenuCustomItem>;
}

/**
 * A single entry in a resolved menu model: a built-in item id, a visual
 * separator, or a custom item. This is the element type returned by
 * `GridOptions.getColumnMenuItems`.
 */
export type ColumnMenuItem = ColumnMenuItemId | 'separator' | ColumnMenuCustomItem;

// ── Config ──────────────────────────────────────────────────────────────────────

/**
 * Column context-menu configuration. Used both grid-wide
 * (`GridOptions.columnMenu`) and per column ({@link ColumnDef.menu}).
 *
 * Resolution precedence when both are present:
 * - `sections` / `enableRightClick` — the column value overrides the grid value.
 * - `suppressItems` — the grid and column sets are **unioned** (either can hide an item).
 * - `customItems` — concatenated (grid items first, then column items), de-duplicated by `id`.
 *
 * @example
 * ```ts
 * // Grid-wide default
 * columnMenu: {
 *   sections: [ColumnMenuSection.SORT, ColumnMenuSection.FILTER, ColumnMenuSection.PIN],
 *   suppressItems: ['duplicate'],
 * }
 * // Per column
 * { field: 'salary', menu: { customItems: [{ label: 'Analyze', action: myFn }] } }
 * ```
 */
export interface ColumnMenuConfig {
  /**
   * Sections to display, in order. Omit to show every applicable section in the
   * default order. Sections that are not applicable to a column (e.g. Sort on a
   * non-sortable column) are always omitted regardless of this list.
   */
  readonly sections?: ColumnMenuSection[];
  /**
   * Built-in item ids to hide. When set both grid-wide and per column, the two
   * sets are unioned — either can suppress an item.
   */
  readonly suppressItems?: ColumnMenuItemId[];
  /**
   * Custom items appended after the built-in sections. Grid-wide items are placed
   * before per-column items; entries sharing an `id` are de-duplicated (column wins).
   */
  readonly customItems?: ColumnMenuCustomItem[];
  /**
   * When `true`, right-clicking a column header cell opens the menu at the cursor.
   * @default true
   */
  readonly enableRightClick?: boolean;
}

/**
 * AG-Grid-style final transform over the resolved built-in item list.
 *
 * Receives the post-suppression, ordered list of built-in item ids for the
 * column plus the column definition, and returns the exact ordered items to
 * render. Return an empty array to render no menu. Mirrors the signature style
 * of `GridOptions.getChartToolbarItems`.
 */
export type GetColumnMenuItems = (
  defaultItems: ColumnMenuItemId[],
  colDef: ColumnDef,
) => ColumnMenuItem[];
