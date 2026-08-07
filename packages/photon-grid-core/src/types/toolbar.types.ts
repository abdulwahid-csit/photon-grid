/**
 * Public type surface for the Photon Grid **Toolbar** — the configurable top
 * strip (`GridOptions.toolbar`) that hosts, from left to right: a fully
 * configurable **tab strip** (e.g. Active / Inactive / Final Settlement), an
 * optional **global search** (positionable left or right), and the existing
 * **Filters** and **Import** launchers.
 *
 * These types are free of any DOM or framework dependency so they can be shared
 * across every wrapper (Angular / React / Vue / Vanilla). The tab strip is
 * intentionally **event-only**: selecting a tab emits
 * {@link import('./event.types').GridEventType}`.TOOLBAR_TAB_CHANGED` and the
 * host decides how to react (filter the data set, call an API, …). The grid
 * never applies data filtering on the host's behalf for tabs.
 *
 * @packageDocumentation
 */

/**
 * Which side of the toolbar the global search input docks to.
 *
 * The tab strip always occupies the far left; {@link ToolbarSearchPosition.Left}
 * places search immediately after the tabs, while
 * {@link ToolbarSearchPosition.Right} groups it with the Filters/Import
 * launchers on the right.
 */
export enum ToolbarSearchPosition {
  /** Search sits on the left, just after the tab strip. */
  Left = 'left',
  /** Search sits on the right, before the Filters/Import launchers. */
  Right = 'right',
}

/**
 * A single tab in the toolbar's left-aligned tab strip. Tabs are purely a
 * navigation affordance — selecting one emits an event; it does not mutate grid
 * state on its own.
 */
export interface ToolbarTab {
  /** Stable, unique identifier emitted in {@link ToolbarTabChangedEvent} and used for programmatic selection. */
  readonly id: string;
  /** Human-readable label shown on the tab. */
  readonly label: string;
  /** Optional icon-registry name rendered before the label (e.g. `'check'`, `'filter'`). */
  readonly icon?: string;
  /** Optional count/text badge rendered after the label (e.g. an item count). */
  readonly badge?: string | number;
  /** When `true`, the tab is rendered dimmed and cannot be selected. @default false */
  readonly disabled?: boolean;
}

/**
 * Configuration for the toolbar's tab strip. Omit the whole object (or set
 * {@link enabled} to `false`) to render no tabs.
 */
export interface ToolbarTabsConfig {
  /** Master switch for the tab strip. @default `true` when {@link items} is non-empty. */
  readonly enabled?: boolean;
  /** The tabs to render, in display order. */
  readonly items: readonly ToolbarTab[];
  /** Id of the tab selected on initial render. @default the first non-disabled item's id. */
  readonly activeTabId?: string;
}

/**
 * Configuration for the toolbar's global search input. The input is wired to
 * the grid's quick-filter, so typing filters rows across all columns; it also
 * emits {@link import('./event.types').GridEventType}`.TOOLBAR_SEARCH_CHANGED`.
 */
export interface ToolbarSearchConfig {
  /** Master switch for the search input. @default `true` when the object is present. */
  readonly enabled?: boolean;
  /** Which side of the toolbar the input docks to. @default {@link ToolbarSearchPosition.Right} */
  readonly position?: ToolbarSearchPosition;
  /** Placeholder text shown when the input is empty. @default `'Search...'` */
  readonly placeholder?: string;
  /** Debounce, in milliseconds, before the query is applied/emitted. @default `180` */
  readonly debounceMs?: number;
}

/**
 * Configuration for the **Columns Manager** launcher (`GridOptions.columnsManager`)
 * — an icon button in the tools strip, immediately left of the Filters funnel,
 * that opens the grid's Column Chooser so a user can show and hide columns
 * without going through a header's context menu.
 *
 * The dialog it opens is the *same* {@link import('../renderer/column-chooser').ColumnChooser}
 * the column menu's "Column Chooser…" item uses — one component, one set of
 * behaviours, so the two entry points can never drift apart.
 *
 * The feature is **opt-in**: a launcher that appeared by default would add a
 * tools strip to every grid that has no other launcher, changing the layout of
 * grids that never asked for one.
 *
 * @example
 * ```ts
 * // Shorthand — show it with every default.
 * { columnsManager: true }
 *
 * // Configured.
 * { columnsManager: { enabled: true, tooltip: 'Manage columns', icon: 'settings' } }
 * ```
 */
export interface ColumnsManagerConfig {
  /** Master switch. The launcher is rendered only when this is `true`. */
  readonly enabled: boolean;
  /**
   * Tooltip and accessible name for the button.
   * @default `'Columns Manager'`
   */
  readonly tooltip?: string;
  /**
   * Icon-registry name for the glyph. Any registered icon works, so a host that
   * ships its own pack can point this at one of its own.
   * @default `'columns'`
   */
  readonly icon?: string;
}

/**
 * Configuration for the Photon Grid **Toolbar** (`GridOptions.toolbar`). The
 * feature is disabled unless {@link enabled} is `true`; when omitted entirely,
 * the top strip falls back to legacy behaviour (the Filters/Import launchers
 * appear whenever their own features are enabled).
 */
export interface ToolbarConfig {
  /** Master switch — when `true`, the configurable toolbar owns the top strip. */
  readonly enabled: boolean;
  /**
   * Whether the Filters funnel launcher is shown. Only has effect when the
   * Filters Tool Panel feature is itself enabled (`GridOptions.filtersToolPanel`).
   * @default `true`
   */
  readonly showFilterButton?: boolean;
  /**
   * Whether the Import launcher is shown. Only has effect when the Import
   * feature is itself enabled (`GridOptions.import`). @default `true`
   */
  readonly showImportButton?: boolean;
  /**
   * Whether the **Export ▾** launcher is shown. Only has effect when the Export
   * feature is itself enabled (`GridOptions.export`) — this is the toolbar's
   * veto over it, matching {@link showFilterButton} and {@link showImportButton},
   * so a host can keep the programmatic `GridApi.export()` while hiding the
   * user-facing dropdown. @default `true`
   */
  readonly showExportButton?: boolean;

  /** Global search configuration. Omit to render no search input. */
  readonly search?: ToolbarSearchConfig;
  /** Tab-strip configuration. Omit to render no tabs. */
  readonly tabs?: ToolbarTabsConfig;
  /**
   * Whether the Columns Manager launcher is shown. Only has effect when the
   * feature is itself enabled (`GridOptions.columnsManager`) — this is the
   * toolbar's veto over it, matching {@link showFilterButton} and
   * {@link showImportButton}. @default `true`
   */
  readonly showColumnsButton?: boolean;
}
