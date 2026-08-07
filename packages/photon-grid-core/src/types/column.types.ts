import type { SparklineConfig } from '../chart/sparkline/sparkline.types';
import type { ColumnGroupResizeStrategy } from '../column-groups/column-group.types';
import type { ColumnRenderer, ColumnRendererMap, DisplayRendererParams } from './renderer.types';
import type { AnyBuiltInRendererOptions, BuiltInRenderer } from './built-in-renderer.types';
import type { ValueGetterFn, ValueSetterFn, ValueFormatterFn } from './value.types';
// Type-only, so the cycle with `editing/types/*` (which reads `ColumnDef`) is
// erased at compile time and never reaches the emitted JavaScript.
import type {
  CellEditorParamsSpec,
  CellEditorSpec,
  EditableSpec,
} from '../editing/types/cell-editor.types';
import type { ColumnValidation } from '../editing/types/validation.types';

export type ColumnPinPosition = 'left' | 'right' | null;

/**
 * Supported data types for a column.
 *
 * The type drives sorting, filtering, editing and export. It also picks the
 * column's **default renderer** when {@link ColumnDef.renderer} is not set —
 * see `DEFAULT_RENDERER_BY_TYPE`, which is the authoritative mapping.
 *
 * | Value        | Default renderer | Cell rendering                          |
 * |--------------|------------------|-----------------------------------------|
 * | `string`     | `text`           | Plain text                              |
 * | `number`     | `number`         | Locale-formatted number                 |
 * | `boolean`    | `checkbox`       | Interactive checkbox                    |
 * | `date`       | `date`           | Formatted date                          |
 * | `datetime`   | `datetime`       | Formatted date + time                   |
 * | `time`       | `time`           | Formatted time                          |
 * | `duration`   | `duration`       | Elapsed time, e.g. `2h 15m`             |
 * | `dropdown`   | `badge`          | Badge from `dropdownOptions`            |
 * | `object`     | `badge`          | Badge resolved via `objectValueKey`     |
 * | `array`      | `list`           | Tag badges (up to 3 visible)            |
 * | `image`      | `image`          | `<img>` thumbnail                       |
 * | `currency`   | `currency`       | Currency-formatted number               |
 * | `percentage` | `percentage`     | Percentage-formatted number             |
 * | `email`      | `email`          | `mailto:` link                          |
 * | `phone`      | `phone`          | `tel:` link                             |
 * | `url`        | `link`           | Anchor                                  |
 * | `sparkline`  | `sparkline`      | Mini chart — requires `ColumnDef.sparkline` |
 * | `custom`     | `text`           | Delegated to `renderer`                 |
 */
export type ColumnDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'duration'
  | 'dropdown'
  | 'object'
  | 'array'
  | 'image'
  | 'currency'
  | 'percentage'
  | 'email'
  | 'phone'
  | 'url'
  | 'color'
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
   * funnel). This is the classic "reveal on hover" behaviour; opt in when a
   * denser, quieter header is preferred over discoverability.
   */
  HOVER = 'hover',
  /**
   * Icon is permanently rendered, regardless of hover state. This is the
   * default — header actions stay discoverable without requiring a hover, and
   * the header layout does not shift as the pointer moves across columns.
   */
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
  /**
   * Whether the column participates in filtering.
   *
   * Two distinct effects, deliberately separated:
   * - **Capability** — filtering works unless this is `false`. The inline
   *   filter row, the Filters tool panel and Photon AI all treat an omitted
   *   value as filterable.
   * - **Header affordance** — the funnel icon is rendered only when this is
   *   explicitly `true`. Leaving it unset keeps the header clean while the
   *   column remains filterable through the filter row and tool panel.
   *
   * So: omit for "filterable, no icon", set `true` for "filterable, show the
   * funnel", set `false` to opt out of filtering entirely.
   */
  filterable?: boolean;
  /**
   * Whether the column exposes its configuration menu button.
   *
   * The "⋯" button in the header is rendered only when this is `true`, so a
   * grid does not sprout a menu affordance on every column by default. The
   * menu's *contents* are controlled by {@link ColumnDef.menu} and
   * `GridOptions.columnMenu`, and right-click access is governed independently
   * by `ColumnMenuConfig.enableRightClick` — a column can therefore stay
   * right-clickable without showing the button.
   *
   * @default false
   */
  configurable?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  /**
   * Whether this column's cells can be edited.
   *
   * A predicate is evaluated per cell, so editability can depend on the row —
   * the usual reason being a status or permission field.
   *
   * Editing also requires `GridOptions.editing.mode` to be something other than
   * `'none'`, and is refused outright when {@link ColumnDef.locked} is `true`.
   *
   * @default false
   *
   * @example
   * ```ts
   * { field: 'discount', editable: ({ data }) => data.status === 'draft' }
   * ```
   */
  editable?: EditableSpec;
  /**
   * Which editor opens for this column's cells.
   *
   * Everything is optional: a column that sets only `editable: true` gets the
   * right editor for its {@link ColumnDef.type} automatically. Reach for this
   * when the default is not what you want.
   *
   * Accepts a built-in name, a key registered through `GridApi.registerEditor`,
   * an editor class or factory, or — with the matching framework wrapper
   * installed — an Angular / React / Vue component.
   *
   * Resolution order is: `editable` → this → registered key → the
   * {@link ColumnDef.type} default → the text editor.
   *
   * @example
   * ```ts
   * { field: 'status',   editable: true, cellEditor: 'select' }
   * { field: 'currency', editable: true, cellEditor: CurrencyEditor }
   * { field: 'owner',    editable: true, cellEditor: OwnerPickerComponent }
   * ```
   */
  cellEditor?: CellEditorSpec;
  /**
   * Configuration handed to the editor as `params.params`.
   *
   * The function form is evaluated per cell, so an option list can depend on the
   * row being edited.
   *
   * @example
   * ```ts
   * { field: 'score', editable: true, cellEditorParams: { min: 0, max: 100, step: 5 } }
   * ```
   */
  cellEditorParams?: CellEditorParamsSpec;
  /**
   * Declarative validation applied when an edit is committed.
   *
   * Rules run in a fixed order (emptiness before range, so a blank required
   * cell says "is required" rather than "must be at least 10") and apply
   * identically to built-in, custom, and framework editors — the grid owns
   * validation, not the editor.
   *
   * Some rules are implied by {@link ColumnDef.type}: an `email` column
   * validates as an email address with no configuration at all.
   *
   * @example
   * ```ts
   * {
   *   field: 'price', type: 'number', editable: true,
   *   validation: {
   *     required: true,
   *     min: 10,
   *     validate: ({ value, data }) =>
   *       Number(value) > Number(data.cost)
   *         ? { valid: true }
   *         : { valid: false, message: 'Price must exceed cost' },
   *   },
   * }
   * ```
   */
  validation?: ColumnValidation;
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
   * Excludes this column from every export (CSV / JSON / Excel / PDF), whatever
   * its visibility.
   *
   * For columns that exist to drive the UI rather than to carry data — a row
   * handle, an internal key, a column of buttons. An explicit
   * {@link ExportOptions.columns} list still wins: naming a column *is* the
   * decision to export it.
   *
   * Columns rendered with the built-in `actions` renderer are excluded
   * automatically and need no flag.
   *
   * @default false
   */
  suppressExport?: boolean;

  /**
   * Controls when this column's filter funnel icon appears in the header.
   * Only relevant while the column is filterable ({@link ColumnDef.filterable}
   * is not `false`). Overrides the grid-level {@link HeaderIconsConfig.filter}
   * default.
   *
   * @default HeaderIconDisplay.ALWAYS
   */
  filterIconDisplay?: HeaderIconDisplay;

  /**
   * Controls when this column's column-menu "⋯" icon appears in the header.
   * Only relevant while the column menu is enabled for the grid. Overrides the
   * grid-level {@link HeaderIconsConfig.menu} default.
   *
   * @default HeaderIconDisplay.ALWAYS
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
   * How this column's cells are drawn.
   *
   * Four forms, all optional — a column that sets none gets a renderer inferred
   * from its {@link ColumnDef.type}:
   *
   * ```ts
   * renderer: 'country'                                   // built-in, by name
   * renderer: { name: 'progress', options: { max: 10 } }  // built-in, configured
   * renderer: ({ value }) => `<b>${value}</b>`            // custom display fn
   * renderer: { display: fn, editor: fn, filter: fn }     // per-slot overrides
   * ```
   *
   * The last form is the original API and is unchanged: any slot left unset
   * falls back to Photon Grid's built-in rendering for that concern.
   *
   * A built-in selected by name is configured through
   * {@link ColumnDef.rendererParams}.
   *
   * @see {@link ColumnRenderer}
   * @see {@link ColumnRendererMap}
   * @see {@link BuiltInRenderer}
   */
  renderer?: ColumnRenderer;

  /**
   * Options for whichever built-in renderer this column uses.
   *
   * The flat alternative to the `{ name, options }` spec, and the form to reach
   * for when the renderer is named as a string — or not named at all, since
   * these apply just as well to the renderer inferred from
   * {@link ColumnDef.type}:
   *
   * ```ts
   * { field: 'employee', renderer: 'profile', rendererParams: {
   *     avatar: { field: 'avatar', shape: 'circle', size: 36 },
   *     title: { field: 'name' },
   *     subtitle: { field: 'department' },
   * } }
   * ```
   *
   * Ignored by a column whose `renderer` is a function or a slot map — those
   * render through the author's own code, which takes its configuration from
   * the closure it was written in.
   *
   * When a column declares both this and a `{ name, options }` spec, `options`
   * wins key by key; nothing is silently dropped.
   *
   * @see {@link BuiltInRendererOptionsMap} for the options each renderer takes.
   */
  rendererParams?: AnyBuiltInRendererOptions;

  dropdownOptions?: ColumnDropdownOption[];
  enumOptions?: string[];
  /**
   * For `object` type columns: the property name on the value object used to match
   * against `dropdownOptions[].value`. Defaults to `"value"` when omitted.
   */
  objectValueKey?: string;

  /**
   * @deprecated Use `validation: { required: true }`. Still honoured — the
   * validation engine normalises it into the equivalent rule — but the
   * `validation` object is the documented home for every rule, and only it
   * supports messages, codes, async and cross-field checks.
   */
  required?: boolean;
  /**
   * @deprecated Use `validation: { min }`. Still honoured. Note that
   * `cellEditorParams.min` is a separate, complementary thing: it constrains the
   * *input control*, while validation constrains the *value*.
   */
  min?: number | null;
  /** @deprecated Use `validation: { max }`. Still honoured. See {@link ColumnDef.min}. */
  max?: number | null;
  /**
   * @deprecated Use `validation: { validate }`, which returns a structured
   * {@link ValidationResult} instead of a bare message string and receives the
   * whole row rather than only the value. Still honoured; the engine adapts the
   * old signature.
   */
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
  /**
   * The column this one sat immediately after when it was pinned, so unpinning
   * can put it back there.
   *
   * Pinning is a move — the column leaves its block and joins a panel's — which
   * means the position it came from is lost unless something remembers it.
   * Without this, unpinning dropped the column at the end of the unpinned block:
   * a user who pinned the third of twenty columns to glance at it got it back
   * as the twentieth.
   *
   * Holds `null` when the column was first in the order (nothing to sit after),
   * and `undefined` while the column is unpinned. Internal: set and cleared by
   * `ColumnModel`, never authored, and deliberately absent from
   * {@link ColumnState} — it describes an in-flight pin, not saved layout.
   */
  unpinAnchorColId?: string | null;
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
