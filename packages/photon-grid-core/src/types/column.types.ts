import type { SparklineConfig } from '../chart/sparkline/sparkline.types';
import type { ColumnGroupResizeStrategy } from '../column-groups/column-group.types';
import type { ColumnRendererMap, DisplayRendererParams } from './renderer.types';
import type { ValueGetterFn, ValueSetterFn, ValueFormatterFn } from './value.types';

export type ColumnPinPosition = 'left' | 'right' | null;

/**
 * Supported data types for a column.
 *
 * | Value        | Cell rendering                                         |
 * |--------------|--------------------------------------------------------|
 * | `string`     | Plain text                                             |
 * | `number`     | Locale-formatted number                                |
 * | `boolean`    | Check-mark icon                                        |
 * | `date`       | Formatted date string                                  |
 * | `time`       | Formatted time string                                  |
 * | `dropdown`   | Badge from `dropdownOptions`                           |
 * | `object`     | Badge resolved via `objectValueKey`                    |
 * | `array`      | Tag badges (up to 3 visible)                           |
 * | `image`      | `<img>` thumbnail                                      |
 * | `currency`   | Currency-formatted number                              |
 * | `percentage` | Percentage-formatted number                            |
 * | `email`      | Plain email text                                       |
 * | `sparkline`  | Mini chart — requires `ColumnDef.sparkline` config     |
 * | `custom`     | Delegated to `renderer.display`                        |
 */
export type ColumnDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'time'
  | 'dropdown'
  | 'object'
  | 'array'
  | 'image'
  | 'currency'
  | 'percentage'
  | 'email'
  | 'sparkline'
  | 'custom';

export type ColumnSummaryAggregation = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';

/**
 * Aggregation function applied to a column's values when rows are grouped.
 *
 * | Value   | Description                              |
 * |---------|------------------------------------------|
 * | `sum`   | Sum of all leaf row values               |
 * | `avg`   | True weighted average across leaf rows   |
 * | `min`   | Minimum leaf row value                   |
 * | `max`   | Maximum leaf row value                   |
 * | `count` | Count of leaf rows with a finite value   |
 *
 * Only honoured on columns whose {@link ColumnDef.type} is `'currency'` or `'number'`.
 */
export type AggFunc = 'sum' | 'avg' | 'min' | 'max' | 'count';

/**
 * Visibility strategy for a header action icon — the filter funnel and the
 * column-menu "⋯" button.
 *
 * Applied grid-wide via {@link HeaderIconsConfig}, and overridable per column
 * through {@link ColumnDef.filterIconDisplay} / {@link ColumnDef.menuIconDisplay}.
 */
export enum HeaderIconDisplay {
  /**
   * Icon stays hidden until the pointer hovers the header cell (or the icon is
   * otherwise activated — e.g. a column with an active filter always shows its
   * funnel). This is the default and matches the classic "reveal on hover"
   * behaviour.
   */
  HOVER = 'hover',
  /** Icon is permanently rendered, regardless of hover state. */
  ALWAYS = 'always',
  /**
   * Icon is never rendered. The underlying feature remains available through
   * other affordances (e.g. the filter row, or right-clicking the header for
   * the column menu) — only the header button is suppressed. Use this to hide
   * the filter funnel and/or the "⋯" menu icon entirely.
   */
  HIDDEN = 'hidden',
}

export interface ColumnDropdownOption {
  /** The stored value — must be unique within the option list. */
  value: string | number;
  /** Display label shown in the dropdown and cell. */
  label: string;
  /** Optional hex/css colour; used for badge background tint. */
  color?: string;
  /**
   * Optional SVG string or HTML markup rendered as an icon before the label.
   * For emoji flags or inline SVG.  Use `image` for URL-based images instead.
   */
  icon?: string;
  /**
   * Optional URL or data-URI for an image rendered before the label.
   * Takes precedence over `icon` when both are provided.
   */
  image?: string;
}

export interface ColumnDef {
  colId: string;
  field: string;
  header: string;
  type: ColumnDataType;

  /**
   * Derives this column's logical value from the raw row `data`, instead of
   * reading `data[field]` directly. The returned value is what every downstream
   * feature sees — cell rendering, sorting, filtering, grouping, aggregation and
   * export — so a single getter keeps the derived value consistent everywhere.
   *
   * Leave unset to read the field directly (dot-notation paths such as
   * `"address.city"` are supported out of the box).
   *
   * @example
   * ```ts
   * // Combine first + last name into a single "Full Name" column.
   * {
   *   colId: 'fullName', field: 'fullName', header: 'Full Name', type: 'string',
   *   valueGetter: ({ data }) => `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
   * }
   * ```
   *
   * @remarks
   * Invoked once per cell per read on the hot render/sort path — keep it pure and
   * cheap (no I/O, no allocations in tight loops) to preserve scroll performance.
   *
   * @see {@link ValueGetterParams}
   */
  valueGetter?: ValueGetterFn;

  /**
   * Commits an edited value back into the row `data`, instead of the grid's
   * default `data[field] = newValue` assignment. Use it to write derived,
   * nested or multi-field targets — for example splitting an edited full name
   * back into `firstName`/`lastName`.
   *
   * Mutate the provided `data` object and (optionally) return `false` to signal
   * that nothing effectively changed, which suppresses the change event and
   * refresh. Returning `true`/`undefined` applies the edit normally.
   *
   * Leave unset to write the field directly (dot-notation paths supported).
   *
   * @example
   * ```ts
   * {
   *   colId: 'fullName', field: 'fullName', header: 'Full Name', type: 'string',
   *   editable: true,
   *   valueSetter: ({ data, newValue }) => {
   *     const [first, ...rest] = String(newValue).trim().split(' ');
   *     data.firstName = first ?? '';
   *     data.lastName = rest.join(' ');
   *     return true;
   *   },
   * }
   * ```
   *
   * @see {@link ValueSetterParams}
   */
  valueSetter?: ValueSetterFn;

  /**
   * Formats this column's value into the string shown to the user. Applied to
   * the logical value ({@link valueGetter} output, or the raw field value) and
   * takes precedence over the grid's built-in type formatting for display.
   *
   * Presentation only: the formatted string is never used for sorting,
   * filtering or editing — those always operate on the underlying value.
   *
   * @example
   * ```ts
   * {
   *   colId: 'salary', field: 'salary', header: 'Salary', type: 'number',
   *   valueFormatter: ({ value }) =>
   *     value == null ? '—' : `$${Number(value).toLocaleString('en-US')}`,
   * }
   * ```
   *
   * @see {@link ValueFormatterParams}
   */
  valueFormatter?: ValueFormatterFn;

  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;

  pinned?: ColumnPinPosition;

  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  editable?: boolean;
  /**
   * When `true`, the column is "locked": its cells cannot be edited regardless
   * of {@link ColumnDef.editable}. Toggled by the column menu's "Lock Column".
   */
  locked?: boolean;
  /**
   * Opts this column into the Formula Engine. When `true`, a cell value typed
   * with a leading `=` (e.g. `=SUM(A1:A10)`) is stored as a formula: the editor
   * shows the formula source, while the cell displays the evaluated result and
   * `data[field]` holds the computed value. Typed columns (date/dropdown/number)
   * that leave this unset keep their normal editors and treat a leading `=` as
   * literal text. Requires `GridOptions.formula.enabled`.
   *
   * @default false
   */
  allowFormula?: boolean;
  /**
   * Declares a formula applied to **every row** of this column, so the column's
   * cells compute automatically without any `GridApi.setCellFormula` call. The
   * formula is row-relative: references resolve against the row each cell lives
   * in. Both field-name syntax (`'=quantity * unitPrice'`) and spreadsheet
   * column-letter syntax (`'=B * C'`) are accepted and normalized internally.
   *
   * Precedence: a `=`-prefixed value embedded in a row's data overrides this
   * column formula for that row, and a later `GridApi.setCellFormula` overrides
   * both. Declaring `formula` implicitly opts the column into the Formula Engine
   * (sets {@link ColumnDef.allowFormula} to `true` unless explicitly `false`).
   * Requires `GridOptions.formula.enabled`.
   *
   * @example
   * { field: 'total', type: 'currency', formula: '=quantity * unitPrice' }
   */
  formula?: string;
  groupable?: boolean;
  rowDrag?: boolean;
  alwaysVisible?: boolean;
  visible?: boolean;

  /**
   * Controls when this column's filter funnel icon appears in the header.
   * Only relevant while the column is filterable ({@link ColumnDef.filterable}
   * is not `false`). Overrides the grid-level {@link HeaderIconsConfig.filter}
   * default.
   *
   * @default HeaderIconDisplay.HOVER
   */
  filterIconDisplay?: HeaderIconDisplay;

  /**
   * Controls when this column's column-menu "⋯" icon appears in the header.
   * Only relevant while the column menu is enabled for the grid. Overrides the
   * grid-level {@link HeaderIconsConfig.menu} default.
   *
   * @default HeaderIconDisplay.HOVER
   */
  menuIconDisplay?: HeaderIconDisplay;

  renderHtml?: boolean;

  /**
   * Per-column overrides for the column header context menu — which sections and
   * items appear, items to suppress, and custom items to inject. Layered over the
   * grid-wide `GridOptions.columnMenu`: `sections`/`enableRightClick` from the
   * column win, `suppressItems` sets are unioned, and `customItems` are
   * concatenated (grid first) and de-duplicated by `id`.
   *
   * @see {@link import('./column-menu.types').ColumnMenuConfig}
   */
  menu?: import('./column-menu.types').ColumnMenuConfig;

  /**
   * Per-column rendering overrides, grouped by concern (display, editor,
   * option, filter, tooltip, group, header, summary). Any slot left unset
   * falls back to Photon Grid's built-in rendering for that concern.
   *
   * @see {@link ColumnRendererMap}
   */
  renderer?: ColumnRendererMap;

  dropdownOptions?: ColumnDropdownOption[];
  enumOptions?: string[];
  /**
   * For `object` type columns: the property name on the value object used to match
   * against `dropdownOptions[].value`. Defaults to `"value"` when omitted.
   */
  objectValueKey?: string;

  required?: boolean;
  min?: number | null;
  max?: number | null;
  validatorFn?: (value: unknown) => string | null;

  showSummary?: boolean;
  summaryAggregation?: ColumnSummaryAggregation;
  summaryLabel?: string;

  /**
   * Aggregation function to apply when this column appears inside a group row.
   * Only honoured when {@link ColumnDef.type} is `'currency'` or `'number'`.
   *
   * @example
   * ```ts
   * { colId: 'salary', field: 'salary', type: 'currency', aggFunc: 'sum' }
   * ```
   */
  aggFunc?: AggFunc;

  isCurrency?: boolean;
  dateFormat?: string;

  textAlign?: 'left' | 'center' | 'right';

  headerCssClass?: string;
  cellCssClass?: string | ((params: DisplayRendererParams) => string);

  /**
   * Child column definitions.  When present, this `ColumnDef` acts as a
   * **column group** in the header rather than a data column.
   *
   * Groups can be nested to any depth — children may themselves have children.
   * The grid builds an `IColumnGroupNode` for each `ColumnDef` that has this
   * property, and renders a multi-row grouped header automatically.
   */
  children?: ColumnDef[];

  // ── Column-group-specific props (only relevant when `children` is set) ──

  /**
   * When `true`, the group renders in its expanded state on first load.
   * Has no effect on leaf columns.
   * @default true
   */
  openByDefault?: boolean;

  /**
   * When `true`, child columns cannot be dragged out of this group
   * individually.  Dragging any child moves the whole group instead.
   * @default false
   */
  marryChildren?: boolean;

  /**
   * Pixel width of the group header cell when the group is collapsed.
   * @default 26
   */
  collapsedWidth?: number;

  /**
   * Strategy used to distribute resize-delta pixels among sibling leaf columns
   * when the user resizes a group header.
   * @default ColumnGroupResizeStrategy.PROPORTIONAL
   */
  groupResizeStrategy?: ColumnGroupResizeStrategy;

  /**
   * Custom renderer function for the group header cell.
   * When supplied, the default label + collapse-button markup is skipped.
   *
   * @example
   * ```ts
   * groupHeaderRendererFn: ({ group, collapsed }) =>
   *   `<span class="acme-group">${group.header}${collapsed ? ' ▶' : ''}</span>`,
   * ```
   */
  groupHeaderRendererFn?: (params: import('../column-groups/column-group.types').GroupHeaderRendererParams) => HTMLElement | string;

  /**
   * Sparkline configuration.
   * Only used when `type` is `'sparkline'`.
   *
   * The cell value must be a `number[]` or an `object[]`.  For object arrays,
   * use `yKey` to specify the numeric property and `xKey` for the tooltip label.
   *
   * @example
   * ```ts
   * {
   *   field: 'history',
   *   type: 'sparkline',
   *   sparkline: { type: 'line', stroke: '#2563eb', showMarkers: true },
   * }
   * ```
   *
   * @see {@link SparklineConfig}
   */
  sparkline?: SparklineConfig;

  sortOrder?: 'asc' | 'desc' | null;
  filterActive?: boolean;
}

/**
 * A fully-normalized column as held internally by the grid after
 * {@link ColumnDef} defaults are applied. `colId`, `header` and `type` are
 * always present (defaulted from `field` / `'string'` when omitted on input),
 * so internal code never has to null-check them. Consumers reading columns from
 * the store or `ColumnModel` receive this type.
 */
export interface Column extends ColumnDef {
  colId: string;
  header: string;
  type: ColumnDataType;
}

/**
 * The public, author-friendly column definition. Only {@link ColumnDef.field}
 * is required; `colId`, `header` and `type` (and everything else) are optional
 * and filled in with defaults during normalization:
 *
 * - `colId`  → `col_<field>_<index>`
 * - `header` → the `field` rendered in Title Case
 * - `type`   → `'string'`
 *
 * This is what `GridOptions.columns` and {@link GridApi.setColumns} accept.
 * Internally the grid works with the fully-normalized {@link ColumnDef}.
 */
export interface ColumnDefInput extends Omit<ColumnDef, 'colId' | 'header' | 'type' | 'children'> {
  colId?: string;
  header?: string;
  type?: ColumnDataType;
  /** Nested child columns (also author-friendly). Presence makes this a group. */
  children?: ColumnDefInput[];
}

export interface ColumnState {
  colId: string;
  width: number;
  visible: boolean;
  pinned: ColumnPinPosition;
  sortOrder: 'asc' | 'desc' | null;
  index: number;
}

export interface ColumnGroup {
  groupId: string;
  header: string;
  children: ColumnDef[];
  pinned?: ColumnPinPosition;
}
