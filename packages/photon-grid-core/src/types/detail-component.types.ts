import type { GridApi } from '../core/grid-api';
import type { RowNode } from './row.types';

/**
 * Everything a custom detail component receives except its resolved
 * {@link DetailContext.props} — the shape handed to
 * {@link DetailPropsFactory}, which runs *before* props exist.
 *
 * Split out from {@link DetailContext} rather than expressed as an
 * `Omit<...>` so both sides stay readable in editor tooltips and so the props
 * factory can never accidentally read a half-built context.
 *
 * @typeParam TData - Shape of the master row's backing record.
 */
export interface DetailContextBase<TData extends Record<string, unknown> = Record<string, unknown>> {
  /** Backing record of the **master** row this detail section belongs to. Always current — re-read on every access, so row transactions are visible without re-creating the component. */
  readonly data: TData;

  /** The master row's live `RowNode`. Falls back to the detail node itself if the master row has been removed from the model. */
  readonly rowNode: RowNode;

  /** Stable `nodeId` of the master row — the key accepted by `GridApi.expandDetail` / `collapseDetail` / `getDetailComponent`. */
  readonly nodeId: string;

  /** The parent grid's `GridApi`. Fully typed: detail components routinely need to read selection, push transactions, or open another row. */
  readonly api: GridApi;

  /**
   * Element the component must render into (or append its own root to).
   *
   * This is the host's inner content element, **not** the padded detail row
   * container — its natural height is what
   * {@link DetailContext.updateHeight} measures, so components that leave it
   * unstyled get correct auto-height for free.
   */
  readonly containerEl: HTMLElement;

  /**
   * Resolved output of `masterDetail.getDetailData` for this row, or
   * `undefined` when that option is not configured.
   *
   * The same cache a nested detail grid is fed from, so a custom component
   * inherits the existing async fetch/cache/loading-indicator lifecycle
   * instead of re-implementing it — Photon only builds the component once the
   * fetch has settled.
   */
  readonly detailData: readonly Record<string, unknown>[] | undefined;

  /**
   * Raises a custom event, invoking the matching handler in
   * `masterDetail.events` and re-emitting it on the grid's event bus as
   * `GridEventType.ROW_DETAIL_EVENT`. Any event name is valid — there is no
   * registration step.
   *
   * A handler that throws is caught and logged; it can never break a render.
   */
  emit(eventName: string, payload?: unknown): void;

  /**
   * Re-resolves `masterDetail.props` and asks the component to update in
   * place via {@link DetailComponent.refresh}. The component is re-created
   * only if that method returns `false` (or does not exist).
   */
  refresh(): void;

  /**
   * Sets the detail row's **content** height in pixels; the container's own
   * padding is added on top. Omit `height` to measure the rendered content
   * instead — the right call after a component grows or shrinks itself
   * outside Photon's knowledge.
   *
   * Clamped by `masterDetail.detailMinHeight` / `detailMaxHeight`.
   */
  updateHeight(height?: number): void;

  /** Collapses the owning master row, with the same shrink/fade the toggle chevron plays. */
  collapse(): void;
}

/**
 * The single argument every custom detail renderer receives.
 *
 * @typeParam TData - Shape of the master row's backing record.
 * @typeParam TProps - Return type of {@link MasterDetailConfig.props}.
 *
 * @example
 * ```ts
 * class OrderDetailComponent implements DetailComponent<Account, OrderProps> {
 *   private el!: HTMLElement;
 *
 *   init(ctx: DetailContext<Account, OrderProps>): HTMLElement {
 *     this.el = document.createElement('div');
 *     this.el.textContent = `${ctx.props.orders.length} orders`;
 *     this.el.addEventListener('click', () => ctx.emit('save', ctx.props.orders[0]));
 *     return this.el;
 *   }
 *
 *   refresh(ctx: DetailContext<Account, OrderProps>): boolean {
 *     this.el.textContent = `${ctx.props.orders.length} orders`;
 *     return true; // handled in place — do not re-create me
 *   }
 *
 *   destroy(): void {
 *     this.el.remove();
 *   }
 * }
 * ```
 */
export interface DetailContext<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TProps = Record<string, unknown>,
> extends DetailContextBase<TData> {
  /** Resolved output of `masterDetail.props`, or an empty object when that option is omitted. Re-read on every access, so it is always the latest resolution. */
  readonly props: TProps;
}

/**
 * Derives the props object handed to a detail component. Called once on
 * mount and again on every {@link DetailContextBase.refresh}, so it should
 * stay cheap and side-effect free.
 */
export type DetailPropsFactory<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TProps = Record<string, unknown>,
> = (ctx: DetailContextBase<TData>) => TProps;

/**
 * Envelope delivered to a `masterDetail.events` handler and to
 * `GridEventType.ROW_DETAIL_EVENT` subscribers.
 *
 * The raw value passed to `ctx.emit` is on {@link payload}; everything else
 * is the master-row context the emitting component would otherwise have to
 * thread through by hand.
 *
 * @typeParam TPayload - Type of the emitted payload.
 */
export interface DetailEvent<TPayload = unknown> {
  /** Event name exactly as passed to `ctx.emit`. */
  readonly type: string;
  /** Value passed as `ctx.emit`'s second argument; `undefined` when omitted. */
  readonly payload: TPayload;
  /** Backing record of the master row that emitted this event. */
  readonly data: Record<string, unknown>;
  /** `nodeId` of the master row that emitted this event. */
  readonly nodeId: string;
  /** Live `RowNode` of the master row that emitted this event. */
  readonly rowNode: RowNode;
  /** The parent grid's `GridApi`. */
  readonly api: GridApi;
}

/**
 * Handler for one custom detail event.
 *
 * @typeParam TPayload - Payload type this handler expects. Annotate it to get
 * a fully typed `event.payload` without any cast at the call site.
 */
export type DetailEventHandler<TPayload = unknown> = (event: DetailEvent<TPayload>) => void;

/**
 * `masterDetail.events` — an open map from event name to handler. There is no
 * fixed key set: a component may emit any name, and the matching entry (if
 * any) is invoked.
 *
 * The declared payload is `never` purely for assignability. Parameter
 * positions are contravariant under `strictFunctionTypes`, so a `never`
 * payload is what lets a handler annotated with a concrete type
 * (`(e: DetailEvent<Order>) => void`) sit in this map without a cast. Photon
 * always invokes handlers with a real, fully-populated {@link DetailEvent}.
 *
 * @example
 * ```ts
 * events: {
 *   save: (e: DetailEvent<Order>) => saveOrder(e.payload),
 *   delete: (e: DetailEvent<Order>) => removeOrder(e.payload, e.nodeId),
 *   export: (e) => exportAll(e.data),
 * }
 * ```
 */
export interface DetailEventHandlerMap {
  readonly [eventName: string]: DetailEventHandler<never> | undefined;
}

/**
 * What a renderer may hand back for Photon to mount.
 *
 * An `HTMLElement` is appended as-is; a `string` is treated as HTML and
 * written into the content host (the same contract cell renderers use); `void`
 * means the renderer wrote into `ctx.containerEl` itself.
 */
export type DetailRenderOutput = HTMLElement | string | void;

/**
 * Instance contract for a class-based custom detail component.
 *
 * Every member is optional so the smallest useful component is a class with
 * a single `init` that returns an element. Framework wrappers (Angular,
 * React, Vue) implement this interface as a thin adapter around their own
 * component instance — Photon Core itself stays framework-agnostic.
 *
 * @typeParam TData - Shape of the master row's backing record.
 * @typeParam TProps - Return type of `masterDetail.props`.
 */
export interface DetailComponent<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TProps = Record<string, unknown>,
> {
  /**
   * Called exactly once, immediately after construction.
   *
   * Return the component's root element (or an HTML string) to have Photon
   * mount it, or render directly into `ctx.containerEl` and return nothing.
   */
  init?(ctx: DetailContext<TData, TProps>): DetailRenderOutput;

  /** Root element, when `init` did not return one. Consulted only if `init` returned nothing. */
  getElement?(): HTMLElement | null;

  /**
   * Called on every `ctx.refresh()` (and on `GridApi.refreshDetail`) with the
   * freshly-resolved props.
   *
   * Return `true` to signal the update was handled in place. Returning
   * `false` — or not implementing this method — makes Photon destroy and
   * re-create the component instead.
   */
  refresh?(ctx: DetailContext<TData, TProps>): boolean | void;

  /** Release listeners, timers, subscriptions, and framework views here. Photon removes the DOM itself. */
  destroy?(): void;
}

/**
 * Class form of {@link MasterDetailConfig.renderer} — constructed with no
 * arguments, then driven through the {@link DetailComponent} lifecycle.
 */
export type DetailComponentConstructor<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TProps = Record<string, unknown>,
> = new () => DetailComponent<TData, TProps>;

/**
 * Function form of {@link MasterDetailConfig.renderer} — the zero-ceremony
 * option for stateless detail content.
 *
 * Return an element or an HTML string to have Photon mount it, or render into
 * `ctx.containerEl` and return nothing. Because there is no `refresh` hook to
 * call, a `ctx.refresh()` on a function renderer re-runs the function.
 */
export type DetailRendererFunction<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TProps = Record<string, unknown>,
> = (ctx: DetailContext<TData, TProps>) => DetailRenderOutput;

/**
 * `masterDetail.renderer` — pass the thing itself, never a wrapper object.
 * Photon tells the forms apart at mount time (see
 * `isDetailComponentConstructor`):
 *
 * ```ts
 * renderer: OrderDetailComponent               // a DetailComponent class
 * renderer: (ctx) => `<h2>${ctx.data['name']}</h2>`  // a function returning HTML
 * renderer: (ctx) => buildElement(ctx)         // a function returning an element
 * renderer: '<h2>Details</h2>'                 // a static HTML string
 * ```
 *
 * Framework wrappers widen this union with their own native forms — an Angular
 * `TemplateRef`/component, a React component, a Vue component — all passed the
 * same way, directly.
 */
export type DetailRenderer<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TProps = Record<string, unknown>,
> =
  | DetailComponentConstructor<TData, TProps>
  | DetailRendererFunction<TData, TProps>
  | string;
