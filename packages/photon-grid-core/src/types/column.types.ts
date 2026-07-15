import type { SparklineConfig } from '../chart/sparkline/sparkline.types';
import type { ColumnGroupResizeStrategy } from '../column-groups/column-group.types';
import type { ColumnRendererMap, DisplayRendererParams } from './renderer.types';

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
  groupable?: boolean;
  rowDrag?: boolean;
  alwaysVisible?: boolean;
  visible?: boolean;

  renderHtml?: boolean;

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
