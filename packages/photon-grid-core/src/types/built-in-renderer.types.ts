import type { ColumnDef } from './column.types';
import type { RendererOutput } from './renderer.types';
import type { ActionsRendererOptions } from './cell-action.types';
import type { IconRenderer } from '../icons/icon-renderer';

/**
 * Names of the renderers Photon Grid ships with.
 *
 * A column selects one by name — `renderer: 'currency'` — or by a
 * {@link BuiltInRendererSpec} when it needs to configure it. A column that
 * selects none gets one inferred from its {@link ColumnDef.type}; see
 * `DEFAULT_RENDERER_BY_TYPE`.
 *
 * The names are a closed union rather than a bare `string` so a typo is a
 * compile error and editor completion lists the real options. Registering a
 * renderer under a name outside this union is still supported at runtime — see
 * `BuiltInRendererRegistry` — which is what keeps the set extensible without
 * making the common case untyped.
 */
export type BuiltInRenderer =
  | 'text'
  | 'multiline'
  | 'longText'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'duration'
  | 'link'
  | 'email'
  | 'phone'
  | 'image'
  | 'avatar'
  | 'avatarGroup'
  | 'profile'
  | 'country'
  | 'checkbox'
  | 'switch'
  | 'badge'
  | 'chip'
  | 'tag'
  | 'icon'
  | 'progress'
  | 'rating'
  | 'sparkline'
  | 'list'
  | 'json'
  | 'button'
  | 'actions'
  | 'html';

// ─── Per-renderer options ────────────────────────────────────────────────────

/** Options shared by every built-in renderer. */
export interface BaseRendererOptions {
  /**
   * Shown when the value is `null`, `undefined` or an empty string.
   * Defaults to an empty cell.
   */
  readonly emptyText?: string;
  /** Extra class applied to the renderer's root element. */
  readonly cssClass?: string;
}

/** Options for the `text` renderer. */
export interface TextRendererOptions extends BaseRendererOptions {
  /** Truncate to this many characters, appending an ellipsis. */
  readonly maxLength?: number;
}

/** Options for the `multiline` renderer. */
export interface MultilineRendererOptions extends BaseRendererOptions {
  /** Clamp to this many visual lines (`-webkit-line-clamp`). Unlimited when omitted. */
  readonly maxLines?: number;
}

/** When the `longText` renderer's expand affordance is visible. */
export type LongTextToggleVisibility =
  /** Only while the pointer is over the cell, or the panel it opened is showing. */
  | 'hover'
  /** Permanently. Right for a touch deployment, where there is no hover. */
  | 'always';

/**
 * Options for the `longText` renderer — a truncated cell with an expand control
 * that opens the untruncated value in a panel.
 *
 * The column that holds a support ticket's body, a shipping note or an audit
 * comment: too long for any sensible column width, but the full text still has
 * to be reachable without widening the column, editing the cell, or leaving the
 * grid.
 *
 * ```ts
 * {
 *   field: 'description',
 *   header: 'Description',
 *   renderer: {
 *     name: 'longText',
 *     options: { maxLines: 2, minLength: 60, overlayTitle: 'Description' },
 *   },
 * }
 * ```
 */
export interface LongTextRendererOptions extends BaseRendererOptions {
  /**
   * Visual lines shown in the cell before truncation.
   *
   * `1` (the default) truncates with an ellipsis on a single line. Anything
   * higher clamps to that many lines — pair it with a taller `rowHeight`, or
   * `rowHeightMode: 'auto'`, or the extra lines have nowhere to go.
   *
   * @default 1
   */
  readonly maxLines?: number;
  /** @default 'hover' */
  readonly toggle?: LongTextToggleVisibility;
  /**
   * Skip the toggle for values shorter than this many characters.
   *
   * A cheap stand-in for "only when the text is actually cut off", which cannot
   * be known without measuring the laid-out cell — a forced reflow per cell per
   * render, which is not a cost a grid scrolling millions of rows can pay.
   * Character count is a heuristic; it is also free. Tune it to the column's
   * width rather than leaving every short value wearing an affordance it does
   * not need.
   *
   * @default 0 — every non-empty value gets a toggle
   */
  readonly minLength?: number;
  /** Icon-registry name for the toggle. @default 'expandText' */
  readonly icon?: string;
  /** Toggle icon size, in px. @default 12 */
  readonly iconSize?: number;
  /** Accessible name for the toggle. @default 'Show full text' */
  readonly toggleLabel?: string;
  /** Heading shown above the text in the panel. Omitted when unset. */
  readonly overlayTitle?: string;
  /**
   * Panel width, in px.
   *
   * Defaults to the cell's own width, clamped to a readable range — a panel
   * narrower than the cell it came from looks like a mistake, and one spanning
   * the viewport is a worse reading experience than the cell was.
   */
  readonly overlayWidth?: number;
  /**
   * Draw the toggle at all. `false` leaves a plain truncated cell, which is the
   * right call for a column whose text is long but not worth reading in full.
   * @default true
   */
  readonly expandable?: boolean;
  /**
   * Mirror the full text into the cell's `title`, for a native tooltip.
   *
   * Off by default: the panel already serves that purpose, and a browser
   * tooltip covering the row on the way to the toggle fights it.
   *
   * @default false
   */
  readonly tooltip?: boolean;
  /**
   * Identifier carried on the emitted `CELL_TEXT_EXPANDED` event, so one
   * handler can serve several long-text columns.
   */
  readonly action?: string;
}

/** Options shared by the numeric renderers (`number`, `currency`, `percentage`). */
export interface NumericRendererOptions extends BaseRendererOptions {
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  /** Overrides `GridOptions.locale` for this column. */
  readonly locale?: string;
}

/** Options for the `currency` renderer. */
export interface CurrencyRendererOptions extends NumericRendererOptions {
  /** Overrides `GridOptions.currencySymbol`. */
  readonly symbol?: string;
}

/** Options for the `percentage` renderer. */
export interface PercentageRendererOptions extends NumericRendererOptions {
  /**
   * How the stored value maps to a percentage.
   *
   * - `'ratio'` — `0.42` renders as `42%` (the spreadsheet convention).
   * - `'value'` — `42` renders as `42%`.
   *
   * @default 'value'
   */
  readonly scale?: 'ratio' | 'value';
}

/** Options for the `boolean` renderer — the textual Yes/No one. */
export interface BooleanRendererOptions extends BaseRendererOptions {
  readonly trueText?: string;
  readonly falseText?: string;
}

/** Options shared by `date`, `datetime` and `time`. */
export interface DateRendererOptions extends BaseRendererOptions {
  /** Token format string (`yyyy MM dd HH mm ss`). Overrides `ColumnDef.dateFormat`. */
  readonly format?: string;
  /** Overrides `GridOptions.timeZone`. */
  readonly timeZone?: string;
  /** Overrides `GridOptions.locale`. */
  readonly locale?: string;
}

/** Options for the `duration` renderer. */
export interface DurationRendererOptions extends BaseRendererOptions {
  /** Unit the stored number is in. @default 's' */
  readonly unit?: 's' | 'ms' | 'm';
  /**
   * `'short'` → `2h 15m`; `'clock'` → `02:15:00`.
   * @default 'short'
   */
  readonly style?: 'short' | 'clock';
}

/** Options for the `link` renderer, and the `email` / `phone` specialisations. */
export interface LinkRendererOptions extends BaseRendererOptions {
  /** Builds the `href`. Defaults to the cell value (plus the scheme for email/phone). */
  readonly href?: (value: unknown, row: Record<string, unknown>) => string;
  /** Builds the visible text. Defaults to the cell value. */
  readonly label?: (value: unknown, row: Record<string, unknown>) => string;
  /** @default '_blank' for `link`, unset for `email`/`phone` */
  readonly target?: string;
  /** Applied whenever `target` is `_blank`. @default 'noopener noreferrer' */
  readonly rel?: string;
}

/** Options for the `image` renderer. */
export interface ImageRendererOptions extends BaseRendererOptions {
  readonly width?: number;
  readonly height?: number;
  /** @default 'cover' */
  readonly fit?: 'cover' | 'contain' | 'fill' | 'none';
  readonly alt?: (value: unknown, row: Record<string, unknown>) => string;
}

/** Options for the `avatar` renderer. */
export interface AvatarRendererOptions extends ImageRendererOptions {
  /** Text the initials fallback is derived from when the value is not a URL. */
  readonly name?: (value: unknown, row: Record<string, unknown>) => string;
  /** @default true */
  readonly rounded?: boolean;
}

/**
 * One member of an avatar group, after the renderer has resolved it.
 *
 * The renderer accepts loosely-shaped source data — a bare name, a URL, or an
 * object — and normalises each entry to this before drawing, so the cell code
 * and the overlay code both work against one shape.
 */
export interface AvatarGroupMember {
  /** Display name. Drives the initials fallback, the tooltip and the overlay row. */
  readonly name: string;
  /** Image URL, when the member has one. */
  readonly image?: string;
  /** Secondary line in the overlay — a role, an email, a team. */
  readonly detail?: string;
  /** The original item, handed back on `AVATAR_GROUP_MEMBER_CLICKED`. */
  readonly source: unknown;
}

/** Avatar diameters, as a named scale rather than raw pixels. */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

/** Options for the `avatarGroup` renderer. */
export interface AvatarGroupRendererOptions extends BaseRendererOptions {
  /**
   * How many avatars to draw before collapsing the rest into a `+N` counter.
   *
   * The counter occupies one slot itself, so `maxVisible: 3` over five members
   * shows three avatars and `+2`.
   *
   * @default 3
   */
  readonly maxVisible?: number;
  /** @default 'sm' */
  readonly size?: AvatarSize;
  /**
   * Put each member's name in a `title`, so hovering an avatar identifies it.
   * @default true
   */
  readonly showTooltip?: boolean;
  /**
   * Normalises one raw item into a {@link AvatarGroupMember}.
   *
   * Supply this when the source shape is not covered by {@link nameKey} /
   * {@link imageKey} — a joined row, a nested object, a name that has to be
   * composed from several fields.
   */
  readonly member?: (item: unknown, index: number) => AvatarGroupMember;
  /** Property holding the display name when items are objects. @default 'name' */
  readonly nameKey?: string;
  /** Property holding the image URL when items are objects. @default 'image' */
  readonly imageKey?: string;
  /** Property holding the overlay's secondary line when items are objects. */
  readonly detailKey?: string;
  /**
   * Whether clicking the `+N` counter opens the full roster.
   * @default true
   */
  readonly expandable?: boolean;
  /** Heading shown above the roster. Omitted when unset. */
  readonly overlayTitle?: string;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

/** Silhouette of a profile avatar. */
export type ProfileAvatarShape = 'circle' | 'rounded' | 'square';

/**
 * What a profile avatar falls back to when the row has no usable image.
 *
 * - `'initials'` (default) — coloured initials, the state most rows in a real
 *   user table are in.
 * - `'icon'` — a glyph from the icon registry, named by
 *   {@link ProfileAvatarOptions.icon}. Degrades to initials when no icon
 *   renderer or name is available, rather than leaving a hole.
 * - `'none'` — no avatar element at all; the cell becomes text-only.
 */
export type ProfileAvatarFallback = 'initials' | 'icon' | 'none';

/**
 * How the two text lines of a profile are arranged.
 *
 * - `'stacked'` (default) — title above subtitle. Needs roughly 40px of row
 *   height to breathe.
 * - `'inline'` — title and subtitle on one line, separated by
 *   {@link ProfileRendererOptions.separator}. The choice for a dense grid whose
 *   `rowHeight` is at the default.
 */
export type ProfileLayout = 'stacked' | 'inline';

/**
 * Where one piece of a profile is read from.
 *
 * Both members are optional and {@link value} wins. A part that declares
 * neither falls back to the column's own cell value — which is what makes
 * `renderer: 'profile'` useful with no configuration at all.
 */
export interface ProfileSource {
  /**
   * Row field holding this part, dot-notation supported
   * (`'manager.avatarUrl'`).
   *
   * Read straight off the row rather than through the column's value pipeline,
   * because a profile is assembled from *sibling* fields the column itself does
   * not point at.
   */
  readonly field?: string;
  /**
   * Resolver, for a part that has to be composed rather than read — a full name
   * from `firstName`/`lastName`, a signed avatar URL, a department looked up by
   * id.
   *
   * Runs once per rendered cell, so keep it allocation-light and free of I/O.
   *
   * @param row   - The row's data object.
   * @param value - The column's own cell value, post `valueGetter`.
   */
  readonly value?: (row: Record<string, unknown>, value: unknown) => unknown;
}

/** Avatar half of the `profile` renderer. */
export interface ProfileAvatarOptions extends ProfileSource {
  /** @default 'circle' */
  readonly shape?: ProfileAvatarShape;
  /**
   * Diameter in px. Applied as a CSS custom property on the profile root, so a
   * theme can still restyle everything built on top of it.
   * @default 32
   */
  readonly size?: number;
  /** How an image fills its box. @default 'cover' */
  readonly fit?: 'cover' | 'contain' | 'fill' | 'none';
  /**
   * Builds the image's `alt`.
   *
   * Defaults to empty — the title line names the person immediately after, and
   * announcing it twice is noise for a screen reader, not detail.
   */
  readonly alt?: (row: Record<string, unknown>, value: unknown) => string;
  /** @default 'initials' */
  readonly fallback?: ProfileAvatarFallback;
  /** Icon-registry name used when {@link fallback} is `'icon'`. */
  readonly icon?: string;
  /**
   * Overrides the initials. Defaults to those derived from the title line, so
   * the same person is the same two letters everywhere.
   */
  readonly initials?: (row: Record<string, unknown>, value: unknown) => string;
  /**
   * Background of the initials fallback. Defaults to a colour derived from the
   * name, which keeps a person the same colour on every screen without anything
   * being stored.
   */
  readonly color?: string | ((row: Record<string, unknown>, value: unknown) => string | undefined);
}

/** One text line of the `profile` renderer. */
export interface ProfileTextOptions extends ProfileSource {
  /** Formats the resolved value. Defaults to `String(value)`. */
  readonly format?: (value: unknown, row: Record<string, unknown>) => string;
  /** Truncate to this many characters, appending an ellipsis. */
  readonly maxLength?: number;
  /**
   * Mirror the full text into a `title`, so a line clipped by the column width
   * is still readable on hover.
   * @default true
   */
  readonly tooltip?: boolean;
  /** Extra class on this line's element. */
  readonly cssClass?: string;
}

/**
 * Options for the `profile` renderer — an avatar beside a title and an optional
 * subtitle, the "who is this row about" cell.
 *
 * Each part names its own source, so one column presents fields the column does
 * not itself point at:
 *
 * ```ts
 * {
 *   field: 'employee',
 *   header: 'Employee',
 *   renderer: 'profile',
 *   rendererParams: {
 *     avatar: { field: 'avatar', shape: 'circle', size: 36 },
 *     title: { field: 'name' },
 *     subtitle: { field: 'department' },
 *   },
 * }
 * ```
 */
export interface ProfileRendererOptions extends BaseRendererOptions {
  /** Avatar configuration. Defaults are applied when omitted. */
  readonly avatar?: ProfileAvatarOptions;
  /** Primary line. Defaults to the column's own formatted value. */
  readonly title?: ProfileTextOptions;
  /** Secondary line. Omitted from the DOM entirely when it resolves to nothing. */
  readonly subtitle?: ProfileTextOptions;
  /**
   * Draw the avatar at all. Set `false` for a text-only profile — a column that
   * repeats a person already pictured elsewhere in the row.
   * @default true
   */
  readonly showAvatar?: boolean;
  /** @default 'stacked' */
  readonly layout?: ProfileLayout;
  /** Separator between the lines when {@link layout} is `'inline'`. @default '·' */
  readonly separator?: string;
}

/**
 * One entry in the country lookup table.
 *
 * @see `country-registry.ts`
 */
export interface CountryEntry {
  /** ISO 3166-1 alpha-2, upper case. */
  readonly alpha2: string;
  /** ISO 3166-1 alpha-3, upper case. */
  readonly alpha3: string;
  /** Common English name. */
  readonly name: string;
}

/** Options for the `country` renderer. */
export interface CountryRendererOptions extends BaseRendererOptions {
  /** @default true */
  readonly showFlag?: boolean;
  /** @default true */
  readonly showName?: boolean;
  /** Which form of the name to display. @default 'common' */
  readonly nameFormat?: 'common' | 'alpha2' | 'alpha3';
  /**
   * How the flag is drawn.
   *
   * - `'image'` (default) — a flag image from flagcdn, keyed on the resolved
   *   alpha-2 code. Renders identically on every platform.
   * - `'emoji'` — the Regional Indicator pair derived from the code. No
   *   network at all, but Windows ships no flag glyphs, so it degrades to two
   *   letters there. Right choice for an offline or air-gapped deployment.
   */
  readonly flagStyle?: 'image' | 'emoji';
  /**
   * flagcdn size segment for `flagStyle: 'image'`, e.g. `'24x18'`, `'w40'`.
   * @default '24x18'
   */
  readonly flagSize?: string;
  /**
   * Replaces the flag image URL, keeping the rest of the image handling.
   *
   * The hook for self-hosting or mirroring the flag set — point it at your own
   * path and nothing else about the renderer changes.
   */
  readonly flagUrl?: (alpha2: string, entry: CountryEntry) => string;
  /**
   * Replaces the flag element outright, for a sprite sheet or an inline SVG
   * set. Outranks {@link flagStyle} and {@link flagUrl}.
   */
  readonly flag?: (entry: CountryEntry) => RendererOutput;
  /**
   * Shown when the value cannot be resolved to a country. Receives the original
   * value. Defaults to displaying that value verbatim.
   */
  readonly fallback?: string | ((value: unknown) => RendererOutput);
}

/** Options for the `checkbox` and `switch` renderers. */
export interface CheckboxRendererOptions extends BaseRendererOptions {
  /** Forces the control read-only regardless of `ColumnDef.editable`. */
  readonly readOnly?: boolean;
}

/** Options shared by the pill renderers (`badge`, `chip`, `tag`). */
export interface BadgeRendererOptions extends BaseRendererOptions {
  /** Overrides the colour resolved from `ColumnDef.dropdownOptions`. */
  readonly color?: string | ((value: unknown) => string | undefined);
  /** Overrides the pill's text. */
  readonly label?: (value: unknown) => string;
}

/** Options for the `chip` renderer. */
export interface ChipRendererOptions extends BadgeRendererOptions {
  /** Icon-registry name shown before the label. */
  readonly icon?: string | ((value: unknown) => string | undefined);
}

/** Options for the `tag` renderer. */
export interface TagRendererOptions extends BadgeRendererOptions {
  /**
   * Derive a stable colour from the value so the same text is always the same
   * colour without the author enumerating options.
   * @default true
   */
  readonly autoColor?: boolean;
}

/** Options for the `icon` renderer. */
export interface IconRendererOptions extends BaseRendererOptions {
  /** Icon-registry name, or a resolver keyed off the value. */
  readonly icon?: string | ((value: unknown) => string | undefined);
  readonly size?: number;
  readonly color?: string | ((value: unknown) => string | undefined);
  /** Text shown next to the icon. Icon-only when omitted. */
  readonly label?: (value: unknown) => string;
}

/** Options for the `progress` renderer. */
export interface ProgressRendererOptions extends BaseRendererOptions {
  /** Falls back to `ColumnDef.min`, then `0`. */
  readonly min?: number;
  /** Falls back to `ColumnDef.max`, then `100`. */
  readonly max?: number;
  /** @default true */
  readonly showLabel?: boolean;
  /** Bar colour; a function receives the fraction filled (0–1). */
  readonly color?: string | ((fraction: number, value: unknown) => string | undefined);
}

/** Options for the `rating` renderer. */
export interface RatingRendererOptions extends BaseRendererOptions {
  /** Number of symbols. @default 5 */
  readonly max?: number;
  /** Icon-registry name for a filled symbol. @default 'sparkle' */
  readonly icon?: string;
  /** @default false */
  readonly showValue?: boolean;
}

/** Options for the `list` renderer. */
export interface ListRendererOptions extends BaseRendererOptions {
  /** How many entries to show before collapsing the rest into `+N`. @default 3 */
  readonly maxVisible?: number;
  /** Separator used when `variant` is `'text'`. @default ', ' */
  readonly separator?: string;
  /** @default 'badge' */
  readonly variant?: 'badge' | 'text';
}

/** Options for the `json` renderer. */
export interface JsonRendererOptions extends BaseRendererOptions {
  /** Indentation used for the `title` tooltip's pretty-printed form. @default 2 */
  readonly indent?: number;
}

/** Options for the `button` renderer. */
export interface ButtonRendererOptions extends BaseRendererOptions {
  /** Button text. Defaults to the cell value. */
  readonly label?: string | ((value: unknown, row: Record<string, unknown>) => string);
  /** Icon-registry name shown before the label. */
  readonly icon?: string;
  /** @default 'secondary' */
  readonly variant?: 'primary' | 'secondary' | 'danger';
  /**
   * Identifier carried on the emitted `CELL_BUTTON_CLICKED` event, so one
   * handler can serve several button columns.
   */
  readonly action?: string;
  readonly disabled?: (value: unknown, row: Record<string, unknown>) => boolean;
}

/** Options for the `html` renderer. */
export interface HtmlRendererOptions extends BaseRendererOptions {
  /**
   * The value is written with `innerHTML`. Only point this at markup you
   * control — the grid performs no sanitisation, exactly as `renderHtml` does.
   */
  readonly trusted?: true;
}

/** Options for the `sparkline` renderer. Configuration lives on `ColumnDef.sparkline`. */
export type SparklineRendererOptions = BaseRendererOptions;

/**
 * Maps each built-in renderer name to the options it accepts, so
 * `{ name: 'progress', options: { … } }` is checked against
 * {@link ProgressRendererOptions} and nothing else.
 */
export interface BuiltInRendererOptionsMap {
  text: TextRendererOptions;
  multiline: MultilineRendererOptions;
  longText: LongTextRendererOptions;
  number: NumericRendererOptions;
  currency: CurrencyRendererOptions;
  percentage: PercentageRendererOptions;
  boolean: BooleanRendererOptions;
  date: DateRendererOptions;
  datetime: DateRendererOptions;
  time: DateRendererOptions;
  duration: DurationRendererOptions;
  link: LinkRendererOptions;
  email: LinkRendererOptions;
  phone: LinkRendererOptions;
  image: ImageRendererOptions;
  avatar: AvatarRendererOptions;
  avatarGroup: AvatarGroupRendererOptions;
  profile: ProfileRendererOptions;
  country: CountryRendererOptions;
  checkbox: CheckboxRendererOptions;
  switch: CheckboxRendererOptions;
  badge: BadgeRendererOptions;
  chip: ChipRendererOptions;
  tag: TagRendererOptions;
  icon: IconRendererOptions;
  progress: ProgressRendererOptions;
  rating: RatingRendererOptions;
  sparkline: SparklineRendererOptions;
  list: ListRendererOptions;
  json: JsonRendererOptions;
  button: ButtonRendererOptions;
  actions: ActionsRendererOptions;
  html: HtmlRendererOptions;
}

/** Any built-in renderer's options, for code that handles them generically. */
export type AnyBuiltInRendererOptions =
  BuiltInRendererOptionsMap[keyof BuiltInRendererOptionsMap];

/**
 * A built-in renderer plus its configuration.
 *
 * The `name` property is what tells this apart from a {@link ColumnRendererMap}
 * at runtime — the slot map has no `name` key, and the framework wrappers'
 * component/template specs discriminate on `kind` instead.
 *
 * @example
 * ```ts
 * { colId: 'score', field: 'score', type: 'number',
 *   renderer: { name: 'progress', options: { max: 10, showLabel: false } } }
 * ```
 */
export interface BuiltInRendererSpec<N extends BuiltInRenderer = BuiltInRenderer> {
  readonly name: N;
  readonly options?: BuiltInRendererOptionsMap[N];
}

/** Union of every `{ name, options }` pair, so each name checks against its own options type. */
export type AnyBuiltInRendererSpec = {
  [N in BuiltInRenderer]: BuiltInRendererSpec<N>;
}[BuiltInRenderer];

/**
 * Everything a built-in renderer needs to draw one cell.
 *
 * Renderers write into {@link inner} and never touch the `.pg-cell` element
 * itself: selection, editing and hover classes belong to the grid, not to the
 * renderer.
 *
 * @typeParam O - The renderer's own options type, so a renderer reads
 *   `ctx.options.max` without casting. See {@link BuiltInRendererDefinition}.
 */
export interface BuiltInRenderContext<O extends BaseRendererOptions = BaseRendererOptions> {
  /** The `.pg-cell__inner` element to fill. Already emptied by the caller. */
  readonly inner: HTMLElement;
  /** Logical value (post `valueGetter`). */
  readonly value: unknown;
  /** Underlying field value; differs from {@link value} only when a `valueGetter` is set. */
  readonly rawValue: unknown;
  /**
   * Text this cell would show as a plain text column.
   *
   * Produced by `formatCellValue`, so a column `valueFormatter` has already won
   * over the type's default formatting. A renderer that shows text should start
   * from this rather than re-deriving it, which is what keeps an author's
   * formatter honoured no matter which renderer they picked.
   */
  readonly formattedValue: string;
  readonly row: Record<string, unknown>;
  readonly colDef: ColumnDef;
  readonly rowIndex: number;
  readonly colIndex: number;
  /** Options declared on the column's renderer spec, or `{}`. */
  readonly options: O;
  /** Icon registry renderer, for renderers that draw icons rather than inline SVG. */
  readonly icons: IconRenderer | null;
  readonly locale?: string;
  readonly dateFormat?: string;
  readonly timeZone?: string;
  readonly currencySymbol?: string;
  /** `false` when the grid has editing switched off; read by `checkbox`/`switch`. */
  readonly editingEnabled?: boolean;
  /** The public `GridApi`, typed as `unknown` to keep the core free of circular type references. */
  readonly api: unknown;
}

/**
 * A renderer implementation.
 *
 * Built-in renderers are registered exactly the way a user-defined one is —
 * there is no special-casing between the two.
 *
 * @typeParam O - Options this renderer accepts. Declaring it makes
 *   `ctx.options` concrete inside `render`, so no renderer needs a cast. The
 *   registry stores the erased form; TypeScript's bivariant method parameters
 *   make that assignment legal, which is the one place bivariance is what we
 *   actually want.
 */
export interface BuiltInRendererDefinition<O extends BaseRendererOptions = BaseRendererOptions> {
  /** Lookup key. One of {@link BuiltInRenderer}, or any string for a custom registration. */
  readonly name: string;
  /**
   * `true` when this renderer emits a single `<span class="pg-cell__value">`
   * holding the whole display string and nothing else.
   *
   * That is what lets the Virtual DOM patch the cell with one `textContent`
   * write instead of rebuilding it (`CellPatcher.patch`). It is a promise about
   * DOM shape with real conditions attached — a `textOnly` renderer must not:
   *
   * - emit child elements (the `textContent` write destroys them);
   * - put a **value-dependent class or attribute** on the span (the text path
   *   never re-syncs either, so it would stay stale forever once the value
   *   changes — use `ColumnDef.cellCssClass`, which *is* re-synced);
   * - set a `title` that differs from the displayed text (the patcher
   *   overwrites `title` with it).
   *
   * When any of those is needed, declare `false` and supply {@link patch}.
   */
  readonly textOnly: boolean;
  /** Fills `ctx.inner`. Must not throw — a renderer error would blank the row. */
  render(ctx: BuiltInRenderContext<O>): void;
  /**
   * The plain-text form of what {@link render} puts on screen.
   *
   * Implement this whenever the renderer *transforms* its value rather than
   * merely decorating it — `country` turning `"US"` into `"United States"` is
   * the canonical case. Everything that has to reason about a cell as text
   * rather than as pixels routes through here, so one method keeps them all
   * agreeing with the cell:
   *
   * - **Clipboard** — copying gives the user the text they can see, not an
   *   internal code they never asked about.
   * - **Filtering** — text conditions, the quick filter and the set-filter
   *   checkbox list all match on the displayed text, so a column that shows
   *   "United States" is filtered by typing "United States".
   *
   * Leave it unimplemented when the rendered text is already the value's normal
   * string form (`text`, `number`, `badge`, …). Those columns keep the grid's
   * default type formatting, which is what their callers expect.
   *
   * @param value - The cell's logical value, exactly as `render` receives it.
   * @param options - The renderer's resolved options, as `ctx.options`.
   * @returns The displayed text, or `null` when this value has no special text
   *   form and the caller should fall back to its own formatting. Must be pure
   *   and cheap: filtering calls it once per row per filtered column.
   */
  readonly toText?: (value: unknown, options: O) => string | null;
  /**
   * Updates an already-rendered cell in place, instead of rebuilding it.
   *
   * The extensibility seam for the Virtual DOM: a renderer whose element holds
   * state the DOM cannot cheaply recreate — an `<img>` that would re-fetch, an
   * `<input>` mid-click, a `<canvas>` that repaints a frame late — implements
   * this and keeps that state across value changes. Without it the cell takes
   * the full rebuild path, which is correct but throws the state away.
   *
   * @param cellEl - The `.pg-cell` element.
   * @param ctx - The same context `render` would receive, with the new value.
   * @returns `true` when the cell was updated and no rebuild is needed.
   */
  patch?(cellEl: HTMLElement, ctx: BuiltInRenderContext<O>): boolean;
}

