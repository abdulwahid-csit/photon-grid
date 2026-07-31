import type { GridOptions } from './grid.types';
import type { GridEventType } from './event.types';
import type { DetailEventHandlerMap, DetailPropsFactory, DetailRenderer } from './detail-component.types';

/**
 * How the toggle column renders for a row that
 * {@link MasterDetailConfig.hasDetail} rejects — a master row with nothing to
 * expand into.
 *
 * The toggle is an inline element occupying real width inside its cell, so
 * simply omitting it pulls that row's text left by the toggle's footprint and
 * breaks the column's left edge wherever detail-less rows are interleaved with
 * expandable ones. The first two modes both keep that edge straight; they
 * differ only in whether the row still offers an affordance.
 */
export enum EmptyDetailToggleMode {
  /**
   * Render the normal, fully interactive chevron. Expanding shows
   * {@link MasterDetailConfig.emptyDetailText} in place of a nested grid.
   */
  Interactive = 'interactive',
  /**
   * Reserve the chevron's exact footprint but render nothing inside it —
   * alignment without an affordance that leads nowhere.
   */
  Placeholder = 'placeholder',
  /** Render nothing at all; the cell's content starts where the chevron would have been. */
  Hidden = 'hidden',
}

/**
 * Parameters passed to a {@link MasterDetailConfig.detailRendererFn} custom
 * detail renderer — the escape hatch used when a detail row should show
 * arbitrary content instead of a nested Photon Grid instance.
 */
export interface DetailRendererParams {
  /** Raw data of the parent (master) row being expanded. */
  rowData: Record<string, unknown>;
  /** Stable node id of the parent row's `RowNode`. */
  nodeId: string;
  /** Empty container the renderer must populate. Its size drives auto-height measurement. */
  containerEl: HTMLElement;
  /**
   * The parent grid's `GridApi`. Typed `unknown` here (mirrors
   * `DisplayRendererParams.api`) to avoid a `types -> core` import cycle —
   * callers cast to `GridApi` themselves.
   */
  parentApi: unknown;
}

/**
 * Master/Detail configuration for a grid instance.
 *
 * Enabling this turns qualifying rows into expandable "master" rows. There are
 * three mutually exclusive sources of detail content, in priority order:
 *
 * 1. {@link renderer} — a custom component (any framework, or none) driven
 *    through the `DetailComponent` lifecycle with typed props and an event
 *    channel.
 * 2. {@link detailRendererFn} — the older one-shot "give me an element"
 *    escape hatch.
 * 3. {@link detailGrid} — the default: a fully independent nested Photon Grid
 *    instance, complete with its own sorting, filtering, selection, editing,
 *    clipboard, undo/redo, context menu, row drag, fill handle, and overlay
 *    layer. Because `detailGrid` is itself a `GridOptions`, nesting is
 *    unlimited — a detail grid may declare its own `masterDetail` config.
 *
 * Everything else here (virtualization, height, expand/collapse, sticky master
 * rows, the `getDetailData` fetch/cache lifecycle, the collapsed-instance LRU)
 * applies identically whichever source is in use.
 *
 * @example
 * ```ts
 * masterDetail: {
 *   enabled: true,
 *   toggleColumnId: 'name',
 *   hasDetail: (row) => row.orderCount > 0,
 *   getDetailData: (row) => fetchOrders(row.id),
 *   detailGrid: (row) => ({ columns: orderColumns, rowHeight: 36 }),
 *   detailMaxHeight: 320,
 * }
 * ```
 */
export interface MasterDetailConfig {
  /** Master/Detail is otherwise fully inert — every consumer must opt in explicitly. */
  enabled: boolean;

  /**
   * `colId` of the column that renders the expand/collapse toggle.
   * Defaults to the first visible column when omitted.
   */
  toggleColumnId?: string;

  /**
   * Determines whether a given row actually has detail content to show.
   * Defaults to "every row has detail".
   *
   * Rejected rows are *not* silently stripped of their toggle —
   * {@link emptyDetailToggle} decides what renders in its place, and defaults
   * to keeping an interactive chevron so the toggle column's left edge stays
   * straight. See {@link EmptyDetailToggleMode}.
   */
  hasDetail?: (rowData: Record<string, unknown>) => boolean;

  /**
   * What the toggle column renders for rows {@link hasDetail} rejects.
   *
   * @default EmptyDetailToggleMode.Interactive
   */
  emptyDetailToggle?: EmptyDetailToggleMode;

  /**
   * Message shown inside the expanded detail section of a row that has no
   * detail content — only reachable under
   * {@link EmptyDetailToggleMode.Interactive}.
   *
   * @default 'No results found'
   */
  emptyDetailText?: string;

  /**
   * Fetches the detail dataset for a row, synchronously or asynchronously.
   * The resolved array becomes the nested grid's `GridOptions.data`.
   * When omitted, the nested grid is built with no data (useful when
   * `detailGrid`/`detailRendererFn` supply data themselves).
   */
  getDetailData?: (
    rowData: Record<string, unknown>,
  ) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>;

  /**
   * Full configuration for the nested Photon Grid instance — a static
   * object shared by every detail row, or a per-row factory. `theme` is
   * inherited from the parent's active theme unless set here explicitly.
   */
  detailGrid?: GridOptions | ((rowData: Record<string, unknown>) => GridOptions);

  /**
   * Escape hatch for non-grid detail content. When supplied, this takes
   * priority over {@link detailGrid} — no nested `GridCore` is created.
   *
   * @deprecated Prefer {@link renderer}, which adds a full component
   * lifecycle, props, and an event channel. `detailRendererFn` remains
   * supported and is used whenever `renderer` is absent.
   */
  detailRendererFn?: (params: DetailRendererParams) => HTMLElement;

  /**
   * Custom detail content. Pass the thing itself — there is no wrapper object
   * and no `kind` discriminator; Photon tells the forms apart at mount time.
   *
   * - a `DetailComponent` class — full lifecycle (`init`/`refresh`/`destroy`)
   * - a function `(ctx) => HTMLElement | string | void`
   * - a static HTML string
   *
   * Framework wrappers widen this with their own native forms, passed exactly
   * the same way: an Angular `TemplateRef` or component, a React component, a
   * Vue component.
   *
   * Highest-priority detail content source: when present, neither
   * {@link detailGrid} nor {@link detailRendererFn} is consulted and no
   * nested `GridCore` is created. The renderer is invoked lazily on first
   * expand and torn down on collapse, subject to the
   * {@link keepDetailGridsCount} reuse cache — everything else about the
   * detail row (virtualization, row height, expand/collapse, sticky master
   * rows, the `getDetailData` fetch/cache lifecycle) behaves exactly as it
   * does for a nested grid.
   *
   * @example
   * ```ts
   * masterDetail: {
   *   enabled: true,
   *   renderer: OrderDetailComponent,
   *   props: (ctx) => ({ orders: ctx.detailData ?? [] }),
   *   events: {
   *     save: (e) => persist(e.payload),
   *     delete: (e) => remove(e.payload),
   *   },
   * }
   * ```
   *
   * @example One-liner
   * ```ts
   * masterDetail: { enabled: true, renderer: (ctx) => `<h2>${ctx.data['name']}</h2>` }
   * ```
   */
  renderer?: DetailRenderer;

  /**
   * Derives the props object exposed to {@link renderer} as
   * `DetailContext.props`. Re-run on every `ctx.refresh()` /
   * `GridApi.refreshDetail`, so it should stay cheap and side-effect free.
   *
   * Ignored when {@link renderer} is absent. Defaults to an empty object.
   */
  props?: DetailPropsFactory;

  /**
   * Handlers for the custom events a {@link renderer} raises via
   * `ctx.emit(name, payload)`. Any event name is valid — there is no
   * registration step and no fixed key set.
   *
   * Every emit is also re-published on the grid's event bus as
   * `GridEventType.ROW_DETAIL_EVENT`, which is what framework wrappers bind
   * to when they need a single stream rather than named callbacks.
   */
  events?: DetailEventHandlerMap;

  /** Whether newly-encountered rows start expanded. Default `false`. */
  defaultExpanded?: boolean;

  /** Lower clamp applied to both auto-measured and manually resized height. */
  detailMinHeight?: number;

  /** Upper clamp applied to both auto-measured and manually resized height. Overflow scrolls. */
  detailMaxHeight?: number;

  /**
   * When `true` (default), the detail row's height tracks the nested grid's
   * rendered content via `ResizeObserver`. When `false`, `detailFixedHeight`
   * (or a `48px` fallback) is used instead.
   */
  detailAutoHeight?: boolean;

  /** Fixed pixel height used when `detailAutoHeight` is `false`. */
  detailFixedHeight?: number;

  /** Shows a drag handle on the detail row's bottom edge letting users resize it manually. Default `false`. */
  detailResizable?: boolean;

  /**
   * When `true` (default), the nested grid is not constructed — and
   * `getDetailData` is not called — until the row is first expanded.
   */
  lazy?: boolean;

  /**
   * Event types re-emitted on the parent grid's event bus whenever the
   * nested grid emits them, or `true` to bubble every event. Payloads are
   * wrapped as `{ sourceNodeId, event: <original payload> }`. Default: none.
   */
  bubbleEvents?: GridEventType[] | boolean;

  /**
   * How many collapsed detail rows keep their content alive — a nested grid
   * instance, or a {@link renderer} component instance — rather than
   * destroying it, so re-expanding restores the live state (sort, column
   * order/width, scroll position, selection; or a component's own internal
   * state and DOM) instead of rebuilding from scratch. Least-recently-collapsed
   * instances beyond this bound are evicted and destroyed to keep memory use
   * constant regardless of how many rows a user expands over a session.
   * Set to `0` to destroy on every collapse. Default `10`.
   */
  keepDetailGridsCount?: number;
}
