import type { RowNode } from '../types/row.types';
import type { GridApi } from '../core/grid-api';
import type { MasterDetailEngine } from '../engines/master-detail/master-detail-engine';
import type {
  DetailComponent,
  DetailComponentConstructor,
  DetailContext,
  DetailEvent,
  DetailEventHandler,
  DetailRenderOutput,
  DetailRendererFunction,
} from '../types/detail-component.types';
import { clearChildren, createDiv } from './dom-utils';

/** Shared frozen default for `DetailContext.props` when `masterDetail.props` is omitted — avoids allocating an object per mounted component. */
const EMPTY_PROPS: Readonly<Record<string, unknown>> = Object.freeze({});

/**
 * Sub-pixel deadband (px) for auto-height: a measured content height within
 * this much of the one already applied is treated as unchanged.
 *
 * The bound is **inclusive**, and that is load-bearing rather than fussy.
 * {@link DetailComponentHost.measureContentHeight} rounds up, so on a display
 * with fractional device-pixel scaling a height that is really 158.3px reads as
 * 159 — and if anything inside the row echoes the row's own height back (a
 * stretched flex item, `height: 100%`), the next measurement reads 159.3 → 160,
 * then 161, and the panel ratchets a pixel taller per frame instead of
 * settling. An exclusive bound lets that through, because each step *is*
 * exactly one pixel. Nothing a consumer can perceive rides on a single pixel of
 * detail height, so refusing to act on one costs nothing and closes the ratchet.
 */
const HEIGHT_EPSILON_PX = 1;

/**
 * Consecutive automatic height corrections tolerated before auto-height stops
 * and settles on the tallest size it has seen.
 *
 * Auto-height is inherently a feedback loop: Photon assigns the row a height,
 * the content lays out inside it, and Photon measures the result. Content that
 * derives its own height from the row it sits in (anything `height: 100%`)
 * closes that loop, and any mismatch between assigned and measured height then
 * compounds once per frame — each round also running a full pipeline refresh,
 * which is what turns a cosmetic drift into a frozen tab.
 *
 * Content that sizes itself naturally converges in one or two rounds, so a
 * small budget separates "settling" from "diverging" cleanly.
 */
const MAX_AUTO_HEIGHT_CORRECTIONS = 5;

/**
 * Distinguishes a {@link DetailComponentConstructor} from a
 * {@link DetailRendererFunction}, since both are `typeof 'function'` and
 * TypeScript's union is erased by the time the value reaches us.
 *
 * Two independent signals, either of which is conclusive:
 *
 * 1. An ES `class` has a **non-writable** `prototype` property; a `function`
 *    declaration's is writable, and an arrow function has none at all. This
 *    catches every native class, including one that declares no methods.
 * 2. A prototype carrying any {@link DetailComponent} lifecycle method. This
 *    catches classes transpiled down to ES5 functions (whose `prototype` is
 *    writable), which older framework build targets still emit.
 */
function isDetailComponentConstructor(renderer: unknown): renderer is DetailComponentConstructor {
  if (typeof renderer !== 'function') return false;
  const proto = (renderer as { prototype?: object }).prototype;
  if (!proto) return false;
  if (Object.getOwnPropertyDescriptor(renderer, 'prototype')?.writable === false) return true;
  return 'init' in proto || 'getElement' in proto || 'refresh' in proto || 'destroy' in proto;
}

/** Collaborators every {@link DetailComponentHost} needs. Built once by `DetailRowRenderer` and shared by every host it creates. */
export interface DetailComponentHostDeps {
  /** Owns the `masterDetail` config, detail height state, and the `ROW_DETAIL_EVENT` bus channel. */
  readonly engine: MasterDetailEngine;
  /** Parent grid's public API, handed straight to components as `DetailContext.api`. */
  readonly api: GridApi;
  /** Collapses a master row with the same shrink/fade the toggle chevron plays. Backs `DetailContext.collapse`. */
  readonly collapse: (parentNodeId: string) => void;
  /**
   * Vertical space (px) a detail row spends on chrome rather than content —
   * padding on both edges plus the bottom border. Added back to every content
   * height the consumer supplies or the host measures; see
   * `DETAIL_ROW_VERTICAL_CHROME_PX` for why an inexact value is not a cosmetic
   * 1px.
   */
  readonly verticalChrome: number;
}

/**
 * Owns one mounted custom detail component: its instance, its live
 * {@link DetailContext}, its auto-height tracking, and its teardown.
 *
 * One host exists per expanded master row and lives exactly as long as that
 * row's `DetailEntry` — including while the entry sits in `DetailRowRenderer`'s
 * collapsed LRU cache, which is what makes re-expanding a row restore the
 * component's own internal state instead of rebuilding it.
 *
 * ### Why the context is built from accessors
 *
 * `data`, `rowNode` and `props` are getters rather than snapshots. A component
 * holds its context for its whole lifetime, so a snapshot would go stale the
 * moment a row transaction rewrote the master row or a refresh re-resolved
 * props — and the only cure would be re-creating the component, which is
 * precisely what this feature exists to avoid. Getters keep one stable context
 * identity permanently current, at no allocation cost.
 */
export class DetailComponentHost {
  private component: DetailComponent | null = null;
  private context: DetailContext | null = null;

  /**
   * Inner content element the component renders into. Deliberately left
   * without a height of its own (see `.pg-detail-component-host`) so
   * {@link measureContentHeight} reads the component's natural size instead of
   * echoing back the row height Photon just assigned.
   */
  private readonly hostEl: HTMLElement;

  private props: Record<string, unknown> = EMPTY_PROPS;

  /** Live detail `RowNode`. Replaced on every re-expand ({@link setRow}) so lookups never hold a node from a stale pipeline run. */
  private detailRow: RowNode;

  private resizeObserver: ResizeObserver | null = null;
  private measureFrame = 0;

  /** Last content height pushed to the engine — lets a measurement pass bail before touching the height cache. */
  private lastContentHeight = -1;

  /** Tallest content height measured so far. What {@link settleHeight} falls back to, so giving up never clips content. */
  private tallestContentHeight = 0;

  /** Automatic corrections applied since the last explicit refresh. Budgeted by {@link MAX_AUTO_HEIGHT_CORRECTIONS}. */
  private autoCorrections = 0;

  /** Set once a component calls `ctx.updateHeight(px)` with an explicit value, or once auto-height settles: a deliberate size always outranks a measured one, so auto-measurement stands down for the rest of this host's life. */
  private heightPinned = false;

  private destroyed = false;

  /**
   * @param deps - Shared collaborators, see {@link DetailComponentHostDeps}.
   * @param detailRow - The `type: 'detail'` node this host renders into.
   * @param containerEl - The padded `.pg-row--detail-container` element.
   * @param autoHeight - Whether the detail row's height tracks the component's
   *   natural content height. `false` makes the host fill the fixed row height
   *   instead (`detailAutoHeight: false` / `detailResizable`).
   */
  constructor(
    private readonly deps: DetailComponentHostDeps,
    detailRow: RowNode,
    containerEl: HTMLElement,
    private readonly autoHeight: boolean,
  ) {
    this.detailRow = detailRow;
    this.hostEl = createDiv('pg-detail-component-host');
    if (!autoHeight) this.hostEl.classList.add('pg-detail-component-host--fill');
    containerEl.appendChild(this.hostEl);
  }

  /**
   * Builds the context, resolves props, and creates the component. Called once
   * per host; a repeat call is a no-op, so a retried `sync()` can never
   * double-mount.
   */
  mount(): void {
    if (this.destroyed || this.context) return;

    this.context = this.buildContext();
    this.resolveProps();
    this.instantiate();

    if (this.autoHeight) this.observeContentHeight();
  }

  /**
   * Points the host at the current pipeline's detail node after a re-expand
   * from the collapsed cache. The context reads through to `detailRow`, so
   * this is all a reused component needs to see live `data`/`rowNode` again.
   */
  setRow(detailRow: RowNode): void {
    this.detailRow = detailRow;
    // A re-expand is a fresh start: content may legitimately be a different
    // size now, so give auto-height its full correction budget back.
    this.autoCorrections = 0;
  }

  /**
   * Re-resolves props and asks the component to update in place. Falls back to
   * a destroy/re-create only when the component declines — `refresh` absent or
   * returning anything but `true` — which is also the only path a function
   * renderer has, since it exposes no refresh hook.
   */
  refresh(): void {
    if (this.destroyed || !this.context) return;

    this.resolveProps();
    // New props mean new content, which may legitimately be a different size.
    this.autoCorrections = 0;

    if (this.component?.refresh?.(this.context) === true) {
      this.scheduleMeasure();
      return;
    }

    this.teardownComponent();
    clearChildren(this.hostEl);
    this.instantiate();
  }

  /** The mounted component instance, or `null` for a function renderer or a host that has not mounted yet. Backs `GridApi.getDetailComponent`. */
  getComponent(): DetailComponent | null {
    return this.component;
  }

  /** Tears down the component, its observer, and its DOM. Idempotent. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelMeasure();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.teardownComponent();
    this.hostEl.remove();
    this.context = null;
  }

  // ─── Private ────────────────────────────────────────────────────────────

  /**
   * The one context object handed to the component, built from getters for
   * `data`/`rowNode`/`props` — see the class doc for why.
   */
  private buildContext(): DetailContext {
    const parentNodeId = this.parentNodeId();

    const ctx = {
      nodeId: parentNodeId,
      api: this.deps.api,
      containerEl: this.hostEl,
      emit: (eventName: string, payload?: unknown): void => this.emit(eventName, payload),
      refresh: (): void => this.refresh(),
      updateHeight: (height?: number): void => this.updateHeight(height),
      collapse: (): void => this.deps.collapse(parentNodeId),
    };

    Object.defineProperties(ctx, {
      data: { get: (): Record<string, unknown> => this.resolveMasterRow().data, enumerable: true },
      rowNode: { get: (): RowNode => this.resolveMasterRow(), enumerable: true },
      props: { get: (): Record<string, unknown> => this.props, enumerable: true },
      detailData: {
        get: (): readonly Record<string, unknown>[] | undefined => this.deps.engine.getCachedDetailData(parentNodeId),
        enumerable: true,
      },
    });

    return ctx as DetailContext;
  }

  /**
   * Creates the content from the configured renderer and mounts whatever it
   * produced. Shared by {@link mount} and the re-create branch of
   * {@link refresh}.
   *
   * The three forms are told apart here, not by the consumer: a static HTML
   * string, a `DetailComponent` class, or a function returning an element /
   * HTML string / nothing.
   */
  private instantiate(): void {
    const renderer = this.deps.engine.getConfig()?.renderer;
    if (!renderer || !this.context) return;

    if (typeof renderer === 'string') {
      this.attachRoot(renderer);
    } else if (isDetailComponentConstructor(renderer)) {
      const component = new renderer();
      this.component = component;
      this.attachRoot(component.init?.(this.context) ?? component.getElement?.() ?? null);
    } else {
      this.attachRoot((renderer as DetailRendererFunction)(this.context));
    }

    this.scheduleMeasure();
  }

  private resolveProps(): void {
    const propsFactory = this.deps.engine.getConfig()?.props;
    this.props = propsFactory ? propsFactory(this.context!) : EMPTY_PROPS;
  }

  /**
   * Mounts whatever a renderer returned: an element is appended, an HTML
   * string is written in, and `undefined` means the renderer already wrote
   * into `ctx.containerEl` itself.
   */
  private attachRoot(root: DetailRenderOutput | null): void {
    if (typeof root === 'string') {
      this.hostEl.innerHTML = root;
      return;
    }
    if (root && root !== this.hostEl) this.hostEl.appendChild(root);
  }

  /**
   * The master row this detail section belongs to, resolved through the row
   * model on every access so row transactions are picked up without
   * re-creating the component. Falls back to the detail node's captured parent
   * and then to the detail node itself, so the context can never hand a
   * component `undefined` even if the master row was removed mid-render.
   */
  private resolveMasterRow(): RowNode {
    return this.deps.api.getRowNode(this.parentNodeId()) ?? this.detailRow.parent ?? this.detailRow;
  }

  private parentNodeId(): string {
    return this.detailRow.parentNodeId ?? this.detailRow.nodeId;
  }

  /**
   * Routes a `ctx.emit` to its `masterDetail.events` handler and then to the
   * grid's event bus. A throwing handler is contained here: `emit` is normally
   * reached from inside a component's own DOM listener, and letting it escape
   * would abort whatever render or gesture is in flight.
   */
  private emit(eventName: string, payload?: unknown): void {
    if (this.destroyed) return;

    const masterRow = this.resolveMasterRow();
    const event: DetailEvent = {
      type: eventName,
      payload,
      data: masterRow.data,
      nodeId: this.parentNodeId(),
      rowNode: masterRow,
      api: this.deps.api,
    };

    // Cast: the handler map declares `never` payloads purely so handlers
    // annotated with a concrete payload type stay assignable under
    // `strictFunctionTypes` — see `DetailEventHandlerMap`.
    const handler = this.deps.engine.getConfig()?.events?.[eventName] as DetailEventHandler | undefined;
    if (handler) {
      try {
        handler(event);
      } catch (err) {
        console.error(`[PhotonGrid] masterDetail.events.${eventName} threw:`, err);
      }
    }

    this.deps.engine.emitDetailEvent(event);
  }

  /**
   * Applies an explicit or measured **content** height, adding the detail
   * container's chrome so the component gets exactly the space it asked for.
   * Clamping to `detailMinHeight`/`detailMaxHeight` and the change detection
   * that avoids a redundant pipeline run both live in
   * `MasterDetailEngine.setDetailHeight`.
   *
   * An explicit height is honoured to the pixel; only a *measured* one goes
   * through the {@link HEIGHT_EPSILON_PX} deadband, since only a measurement
   * can be off by a rounding step it did not mean.
   */
  private updateHeight(height?: number): void {
    if (this.destroyed) return;

    if (height !== undefined) {
      this.heightPinned = true;
      const explicit = Math.ceil(height);
      if (explicit <= 0 || explicit === this.lastContentHeight) return;
      this.applyContentHeight(explicit);
      return;
    }

    const content = this.measureContentHeight();
    if (!this.isMeaningfulChange(content)) return;
    this.applyContentHeight(content);
  }

  /**
   * Whether a freshly measured content height differs from the applied one by
   * enough to be worth a pipeline run. See {@link HEIGHT_EPSILON_PX} for why
   * a one-pixel difference specifically must not qualify.
   */
  private isMeaningfulChange(content: number): boolean {
    return content > 0 && Math.abs(content - this.lastContentHeight) > HEIGHT_EPSILON_PX;
  }

  private applyContentHeight(content: number): void {
    this.lastContentHeight = content;
    this.tallestContentHeight = Math.max(this.tallestContentHeight, content);
    this.deps.engine.setDetailHeight(this.parentNodeId(), content + this.deps.verticalChrome);
  }

  /**
   * Natural height of the rendered component, rounded up to a whole pixel.
   *
   * `scrollHeight` (not `offsetHeight`) so content overflowing a clamped row
   * still reports its true size; `Math.ceil` because a fractional measurement
   * would never compare equal to itself across frames and every inequality
   * costs a pipeline run.
   */
  private measureContentHeight(): number {
    return Math.ceil(Math.max(this.hostEl.scrollHeight, this.hostEl.getBoundingClientRect().height));
  }

  /**
   * Tracks the component's natural height.
   *
   * Immune to the `ResizeObserver` feedback loop that observing the detail
   * *container* would cause: `.pg-detail-component-host` has no height of its
   * own, so what is measured is the component's content box, which does not
   * change when the row height around it does. The {@link lastContentHeight}
   * guard closes the remaining case — a component that does size itself off
   * the row — by refusing to re-push a height it already pushed.
   */
  private observeContentHeight(): void {
    if (typeof ResizeObserver === 'undefined') return; // measurement still runs once per instantiate/refresh
    this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
    this.resizeObserver.observe(this.hostEl);
  }

  /**
   * Coalesces height measurement into the next frame. Every trigger — the
   * observer, a mount, a refresh — funnels through here, so a burst of
   * mutations costs one layout read and at most one pipeline run.
   *
   * {@link heightPinned} is re-checked inside the callback, not only at
   * scheduling time: a component that pins a height *after* a measurement was
   * already queued must still win, or its deliberate size would be silently
   * overwritten one frame later.
   */
  private scheduleMeasure(): void {
    if (!this.autoHeight || this.heightPinned || this.measureFrame !== 0) return;
    this.measureFrame = requestAnimationFrame(() => {
      this.measureFrame = 0;
      if (this.destroyed || this.heightPinned) return;
      this.measureAndApply();
    });
  }

  /**
   * One auto-height correction, spending from the
   * {@link MAX_AUTO_HEIGHT_CORRECTIONS} budget.
   *
   * The budget is the guard that keeps a misbehaving renderer from spinning the
   * pipeline: content whose height derives from the row it sits in closes the
   * measure → assign → measure loop, and without a bound it would run one full
   * pipeline refresh per frame forever. Naturally-sized content converges in a
   * round or two and never comes close to the limit.
   */
  private measureAndApply(): void {
    const content = this.measureContentHeight();
    if (!this.isMeaningfulChange(content)) {
      this.autoCorrections = 0; // converged
      return;
    }

    if (this.autoCorrections >= MAX_AUTO_HEIGHT_CORRECTIONS) {
      this.settleHeight();
      return;
    }

    this.autoCorrections++;
    this.applyContentHeight(content);
  }

  /**
   * Ends a diverging auto-height loop: pin the tallest height measured so far
   * (so nothing ends up clipped) and stop measuring.
   *
   * Reached only when the content's height depends on the row's, which Photon
   * cannot resolve for the consumer — hence a warning naming both fixes rather
   * than a silent clamp.
   */
  private settleHeight(): void {
    this.heightPinned = true;
    const settled = Math.max(this.tallestContentHeight, this.lastContentHeight);
    if (settled > 0) this.applyContentHeight(settled);

    console.warn(
      `[PhotonGrid] masterDetail auto-height did not converge for row "${this.parentNodeId()}" and was pinned at ${settled}px. `
        + 'This happens when the detail content takes its height from the row it sits in (e.g. `height: 100%`), which makes '
        + 'measurement circular. Give the content a natural height, or set `masterDetail.detailAutoHeight: false` with '
        + '`detailFixedHeight`, or call `ctx.updateHeight(px)` yourself.',
    );
  }

  private cancelMeasure(): void {
    if (this.measureFrame === 0) return;
    cancelAnimationFrame(this.measureFrame);
    this.measureFrame = 0;
  }

  /** Runs the component's own `destroy` hook, containing a throw so teardown of the surrounding entry always completes. */
  private teardownComponent(): void {
    try {
      this.component?.destroy?.();
    } catch (err) {
      console.error('[PhotonGrid] masterDetail.renderer destroy() threw:', err);
    }
    this.component = null;
  }
}
