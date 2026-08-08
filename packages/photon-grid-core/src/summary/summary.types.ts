/**
 * Public contracts for the Summary Row feature.
 *
 * Everything here is plain data or a pure function signature — no DOM, no
 * framework types — so the Angular / React / Vue wrappers can accept the exact
 * same configuration object the core does, and a summary definition can be
 * serialized, diffed or produced on a server.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../types/column.types';
import type { RendererOutput } from '../types/renderer.types';
import type { RowNode } from '../types/row.types';

// ─── Enums ───────────────────────────────────────────────────────────────────

/**
 * Where a summary row is anchored relative to the grid body.
 *
 * Set grid-wide via {@link SummaryConfig.position} and overridable per row via
 * {@link SummaryRowDef.position}. A row using {@link SummaryPosition.Both} is
 * rendered once in each band — the same definition, computed once, painted
 * twice.
 */
export enum SummaryPosition {
  /** Above the first data row, directly beneath the column headers. */
  Top = 'top',
  /** Below the last data row. */
  Bottom = 'bottom',
  /** Rendered in both the top and the bottom band. */
  Both = 'both',
}

/**
 * Which rows feed a summary row's aggregations.
 *
 * The scope is resolved once per refresh and shared by every summary row that
 * requests it, so mixing scopes across rows costs one row-set resolution per
 * *distinct* scope rather than one per row.
 */
export enum SummaryScope {
  /** Every row in the data set, ignoring filters, pagination and grouping. */
  All = 'all',
  /**
   * Rows surviving the active column filters and quick filter, before
   * pagination and grouping. This is the scope most users expect from a grand
   * total, and is the default.
   */
  Filtered = 'filtered',
  /**
   * Only the rows currently in the displayed row set — i.e. after pagination
   * and grouping. Use this for a "total of what you can see" footer.
   */
  Visible = 'visible',
  /** Only the currently selected rows. Yields empty aggregates when nothing is selected. */
  Selected = 'selected',
}

/**
 * Built-in aggregation functions.
 *
 * Register additional ones by name through {@link SummaryConfig.aggregations},
 * or pass a {@link SummaryAggregateFn} inline as {@link SummaryCellDef.aggregate}.
 *
 * | Value   | Result                                                              |
 * |---------|---------------------------------------------------------------------|
 * | `sum`   | Sum of every finite numeric value. Empty scope → `0`.               |
 * | `avg`   | Arithmetic mean of every finite numeric value. Empty scope → `null`. |
 * | `min`   | Smallest finite numeric value. Empty scope → `null`.                |
 * | `max`   | Largest finite numeric value. Empty scope → `null`.                 |
 * | `count` | Number of rows carrying a non-nullish, non-empty value.             |
 * | `first` | First non-nullish value in scope order. Empty scope → `null`.       |
 * | `last`  | Last non-nullish value in scope order. Empty scope → `null`.        |
 *
 * `sum`, `avg`, `min` and `max` coerce values with `Number(...)` and skip
 * anything that is not finite, so a column mixing numbers with `'—'` or `null`
 * aggregates the numbers and ignores the rest rather than producing `NaN`.
 */
export enum SummaryAggregation {
  Sum = 'sum',
  Avg = 'avg',
  Min = 'min',
  Max = 'max',
  Count = 'count',
  First = 'first',
  Last = 'last',
}

// ─── Function contracts ──────────────────────────────────────────────────────

/**
 * Everything an aggregation, value, formatter, renderer or tooltip callback
 * receives about the cell it is producing.
 *
 * `values` is **lazy**: the backing array for a `(scope, column)` pair is
 * materialized on first access and then shared by every summary cell that reads
 * it during the same refresh. A cell that supplies a static
 * {@link SummaryCellDef.value} therefore costs no row scan at all.
 */
export interface SummaryCellContext {
  /** Id of the summary row this cell belongs to. */
  readonly rowId: string;
  /** Column id this cell is aligned with. */
  readonly colId: string;
  /**
   * The column definition, or `null` when the cell targets an id that is not a
   * real column (for example a label placed in the serial-number gutter).
   */
  readonly colDef: ColumnDef | null;
  /** Rows in the cell's {@link SummaryScope}, in display order. */
  readonly rows: readonly RowNode[];
  /**
   * Logical cell values for {@link colId} across {@link rows}, resolved through
   * the column's `valueGetter` when it has one. Materialized on first read.
   */
  readonly values: readonly unknown[];
  /** The scope the cell was computed against. */
  readonly scope: SummaryScope;
  /** The public grid API, typed as `unknown` to keep the core framework-agnostic. */
  readonly api: unknown;
}

/**
 * A custom aggregation.
 *
 * Must be pure and side-effect free — it may be invoked on any refresh, and its
 * result is cached only until the next one.
 *
 * @example Median
 * ```ts
 * const median: SummaryAggregateFn = ({ values }) => {
 *   const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
 *   if (nums.length === 0) return null;
 *   const mid = nums.length >> 1;
 *   return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
 * };
 * ```
 */
export type SummaryAggregateFn = (context: SummaryCellContext) => unknown;

/** Produces a cell's value directly, bypassing aggregation entirely. */
export type SummaryValueFn = (context: SummaryCellContext) => unknown;

/**
 * A {@link SummaryCellContext} extended with the cell's computed value and the
 * string the grid would render for it on its own.
 *
 * Handed to formatters and tooltip functions so they can *decorate* the grid's
 * column-aware formatting (currency symbol, locale, precision, the column's own
 * `valueFormatter`) instead of having to reimplement it.
 */
export interface SummaryComputedCellContext extends SummaryCellContext {
  /** The computed value, before any {@link SummaryCellDef.formatter} runs. */
  readonly value: unknown;
  /**
   * What the cell would display without a custom formatter — the value put
   * through the column's `valueFormatter`, or the grid's type-aware formatting
   * when the column has none.
   */
  readonly defaultFormattedValue: string;
}

/**
 * Turns a computed value into its display string.
 *
 * @example Prefix the column's own formatting with a label
 * ```ts
 * formatter: ({ defaultFormattedValue }) => `Total: ${defaultFormattedValue}`
 * ```
 */
export type SummaryFormatterFn = (params: SummaryComputedCellContext) => string;

/** Builds custom cell content. Returning a string assigns it as HTML. */
export type SummaryRendererFn = (
  params: SummaryCellRendererParams,
) => RendererOutput;

/** Produces a cell's hover tooltip text. */
export type SummaryTooltipFn = (params: SummaryComputedCellContext) => string;

/** Params handed to a {@link SummaryCellDef.renderer}. */
export interface SummaryCellRendererParams extends SummaryCellContext {
  /** The computed (pre-format) value for this cell. */
  readonly value: unknown;
  /** The value after {@link SummaryCellDef.formatter} / the column's formatting rules. */
  readonly formattedValue: string;
}

// ─── Definitions ─────────────────────────────────────────────────────────────

/**
 * How one summary cell is computed and drawn.
 *
 * Precedence for the cell's value is: {@link value} → {@link aggregate} →
 * the row's {@link SummaryRowDef.defaultAggregate} → nothing (the cell renders
 * empty). The first one present wins, so a static label and an aggregation
 * never fight.
 *
 * `ColumnDef.summaryAggregation` is deliberately **not** in that chain: it only
 * drives the row derived from `ColumnDef.showSummary` when no explicit rows are
 * configured. An explicitly configured summary row therefore shows exactly the
 * cells it declares, and never picks up extra columns from column-level
 * settings.
 *
 * @example A right-aligned currency total with a custom label above it
 * ```ts
 * cells: {
 *   region: { value: 'Grand total', className: 'my-total-label' },
 *   revenue: { aggregate: SummaryAggregation.Sum, tooltip: 'Sum of all regions' },
 * }
 * ```
 */
export interface SummaryCellDef {
  /**
   * A fixed value, or a function producing one. Takes precedence over
   * {@link aggregate} — use it for labels, ratios of other cells, or anything
   * that is not a straight column aggregation.
   */
  value?: unknown | SummaryValueFn;

  /**
   * The aggregation to apply to this column's values within the row's scope.
   *
   * Accepts a {@link SummaryAggregation} member, the name of an aggregation
   * registered via {@link SummaryConfig.aggregations}, or an inline
   * {@link SummaryAggregateFn}.
   */
  aggregate?: SummaryAggregation | string | SummaryAggregateFn;

  /**
   * Formats the computed value for display. When omitted the value is rendered
   * through the column's own `valueFormatter` / type-aware formatting, so a
   * currency column's total is formatted exactly like its cells.
   */
  formatter?: SummaryFormatterFn;

  /**
   * Takes over the cell's content entirely. Receives both the raw and the
   * formatted value, so a renderer can decorate rather than reimplement
   * formatting. Framework wrappers mount components through this slot.
   */
  renderer?: SummaryRendererFn;

  /** Extra class name(s) applied to the cell element, for theme-driven styling. */
  className?: string;

  /**
   * Inline CSS declarations applied to the cell, as an escape hatch for values
   * that cannot be known ahead of time (a data-driven bar width, say).
   *
   * Prefer {@link className} plus a theme rule for anything static — inline
   * declarations bypass the theme system and cannot be restyled by a consumer.
   * Custom properties (`--pg-…`) are accepted and are the recommended way to
   * feed a value into a themed rule.
   */
  style?: Readonly<Record<string, string>>;

  /**
   * How many columns this cell spans, starting at its own. Clamped to the end
   * of the cell's pinned region — a span never crosses from the left pinned
   * panel into the center, or from the center into the right panel.
   *
   * Any `colSpan > 1` in a band disables that band's horizontal column
   * virtualization (every center column is rendered) so a span can never be
   * cut in half by the virtual window.
   *
   * @default 1
   */
  colSpan?: number;

  /** Hover tooltip, as fixed text or a function of the computed value. */
  tooltip?: string | SummaryTooltipFn;
}

/**
 * One summary row.
 *
 * A row is a set of per-column {@link SummaryCellDef}s plus the policy —
 * position, stickiness, scope, height — governing how and where it is drawn.
 *
 * @example
 * ```ts
 * {
 *   id: 'grand-total',
 *   label: 'Total',
 *   scope: SummaryScope.Filtered,
 *   cells: {
 *     quantity: { aggregate: SummaryAggregation.Sum },
 *     price:    { aggregate: SummaryAggregation.Avg },
 *   },
 * }
 * ```
 */
export interface SummaryRowDef {
  /**
   * Stable identifier, used by {@link SummaryApi.updateSummaryRow} and
   * {@link SummaryApi.removeSummaryRow}. Auto-generated when omitted, but an
   * explicit id is required to address the row later.
   */
  id?: string;

  /** Overrides {@link SummaryConfig.position} for this row. */
  position?: SummaryPosition;

  /**
   * Overrides {@link SummaryConfig.sticky} for this row.
   *
   * `true` docks the row outside the scrolling viewport so it is always
   * visible. `false` places it at the very start (top band) or end (bottom
   * band) of the scrollable content, where it scrolls out of view like a
   * regular row.
   */
  sticky?: boolean;

  /** Overrides {@link SummaryConfig.scope} for this row. */
  scope?: SummaryScope;

  /**
   * Convenience label rendered in the row's first available cell — the
   * serial-number gutter when one is shown, otherwise the first column that has
   * no explicit {@link cells} entry. Ignored when that cell is explicitly
   * defined.
   */
  label?: string;

  /** Row height in pixels. Defaults to {@link SummaryConfig.height}. */
  height?: number;

  /** Extra class name(s) applied to the row element. */
  className?: string;

  /**
   * Aggregation applied to every column that has no explicit {@link cells}
   * entry. Leave unset to render those columns empty.
   */
  defaultAggregate?: SummaryAggregation | string | SummaryAggregateFn;

  /**
   * Per-column cell definitions, keyed by `colId`.
   *
   * A column absent from this map falls back to {@link defaultAggregate}, and
   * renders empty when that is unset too.
   */
  cells?: Readonly<Record<string, SummaryCellDef>>;
}

/**
 * `GridOptions.summary` — the Summary Row feature's configuration.
 *
 * Present-but-empty is a valid configuration: with no {@link rows}, the grid
 * derives a single total row from any columns declaring
 * `ColumnDef.showSummary`, which makes the long-standing per-column summary
 * properties functional without any extra setup.
 *
 * @example Two rows, one docked and one that scrolls with the content
 * ```ts
 * summary: {
 *   position: SummaryPosition.Bottom,
 *   scope: SummaryScope.Filtered,
 *   rows: [
 *     { id: 'page',  label: 'Page',  scope: SummaryScope.Visible, sticky: false,
 *       cells: { amount: { aggregate: SummaryAggregation.Sum } } },
 *     { id: 'total', label: 'Total', sticky: true,
 *       cells: { amount: { aggregate: SummaryAggregation.Sum } } },
 *   ],
 * }
 * ```
 */
export interface SummaryConfig {
  /**
   * Master switch. Defaults to `true` whenever a `summary` object is supplied,
   * so `summary: { rows: [...] }` is enough to turn the feature on.
   * @default true
   */
  enabled?: boolean;

  /** Default band for rows that do not set their own. @default SummaryPosition.Bottom */
  position?: SummaryPosition;

  /** Default stickiness for rows that do not set their own. @default true */
  sticky?: boolean;

  /** Default scope for rows that do not set their own. @default SummaryScope.Filtered */
  scope?: SummaryScope;

  /** Default row height in pixels. Falls back to `GridOptions.rowHeight`. */
  height?: number;

  /**
   * When `true` (the default) summaries recompute automatically after any
   * change that can affect them — data, filters, sorting, grouping, pagination,
   * cell edits, and selection (for rows scoped to {@link SummaryScope.Selected}).
   *
   * Set to `false` to take manual control: values then change only in response
   * to {@link SummaryApi.refreshSummary}. Useful when a very large data set is
   * mutated in bursts and a single recompute at the end is enough.
   *
   * @default true
   */
  autoRefresh?: boolean;

  /**
   * Named custom aggregations, resolvable by name from
   * {@link SummaryCellDef.aggregate} and {@link SummaryRowDef.defaultAggregate}.
   *
   * A name matching a {@link SummaryAggregation} member overrides that built-in
   * for this grid.
   *
   * @example
   * ```ts
   * aggregations: {
   *   distinct: ({ values }) => new Set(values.filter((v) => v != null)).size,
   * }
   * ```
   */
  aggregations?: Readonly<Record<string, SummaryAggregateFn>>;

  /** The summary rows. Omit to derive one total row from `ColumnDef.showSummary`. */
  rows?: readonly SummaryRowDef[];
}

// ─── Computed results ────────────────────────────────────────────────────────

/**
 * One computed summary cell — the read model behind
 * {@link SummaryApi.getSummary} and the input the renderer paints from.
 */
export interface SummaryCellSnapshot {
  /** Column this cell is aligned with. */
  readonly colId: string;
  /** The computed value, before formatting. `null` when nothing was produced. */
  readonly value: unknown;
  /** The display string the cell renders (empty when the cell has no value). */
  readonly formattedValue: string;
  /** Resolved tooltip text, or `null` when the cell has none. */
  readonly tooltip: string | null;
  /** Columns covered by this cell, including its own. Always `>= 1`. */
  readonly colSpan: number;
  /**
   * Builds the params for this cell's {@link SummaryCellDef.renderer}, or `null`
   * when the cell has no custom renderer.
   *
   * A factory rather than a plain object so nothing is constructed for the
   * overwhelming majority of cells that render as text, and so the returned
   * params' `values` array is materialized only if the renderer actually reads
   * it — a renderer that only needs `value` costs no row scan, and no scan's
   * result is retained between frames.
   */
  readonly createRendererParams: (() => SummaryCellRendererParams) | null;
}

/** One computed summary row, as returned by {@link SummaryApi.getSummary}. */
export interface SummaryRowSnapshot {
  /** The row's resolved id. */
  readonly id: string;
  /**
   * The row's resolved band. {@link SummaryPosition.Both} means this one
   * snapshot is painted in the top *and* the bottom band — values are computed
   * once and shared, so a `Both` row never costs two aggregation passes.
   */
  readonly position: SummaryPosition;
  /** Whether the row is docked outside the scrolling viewport. */
  readonly sticky: boolean;
  /** The scope its values were computed against. */
  readonly scope: SummaryScope;
  /** Number of rows that were in scope at compute time. */
  readonly rowCount: number;
  /** Resolved row height in pixels. */
  readonly height: number;
  /** Extra class name(s) for the row element, or `null`. */
  readonly className: string | null;
  /** Computed cells, keyed by `colId`. */
  readonly cells: ReadonlyMap<string, SummaryCellSnapshot>;
}

// ─── Public API surface ──────────────────────────────────────────────────────

/**
 * The Summary Row methods on `GridApi`.
 *
 * Declared as its own interface so the framework wrappers can re-export the
 * exact surface without restating each signature.
 */
export interface SummaryApi {
  /**
   * Recomputes every summary row immediately and repaints the bands.
   *
   * Only needed when {@link SummaryConfig.autoRefresh} is `false`, or after
   * mutating row data in place through a path the grid cannot observe.
   */
  refreshSummary(): void;

  /**
   * Returns the most recently computed summary rows.
   *
   * @param rowId - Restrict the result to one row's snapshot.
   * @returns All snapshots, or the single matching one (`null` if no such row).
   */
  getSummary(): readonly SummaryRowSnapshot[];
  getSummary(rowId: string): SummaryRowSnapshot | null;

  /**
   * Replaces the entire set of summary row definitions and recomputes.
   *
   * @param rows - The new definitions. Pass `[]` to remove every summary row.
   */
  setSummaryRows(rows: readonly SummaryRowDef[]): void;

  /**
   * Shallow-merges a patch into one summary row definition and recomputes.
   *
   * `cells` is merged one level deep, so patching a single column's cell leaves
   * the other columns' definitions intact.
   *
   * @param rowId - Id of the row to patch.
   * @param patch - Properties to overwrite.
   * @returns `true` when a row with that id existed and was updated.
   */
  updateSummaryRow(rowId: string, patch: Partial<SummaryRowDef>): boolean;

  /**
   * Removes one summary row definition and recomputes.
   *
   * @param rowId - Id of the row to remove.
   * @returns `true` when a row with that id existed and was removed.
   */
  removeSummaryRow(rowId: string): boolean;
}
