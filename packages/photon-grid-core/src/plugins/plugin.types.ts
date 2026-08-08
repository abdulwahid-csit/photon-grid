import type { GridApi } from '../core/grid-api';
import type { EventBus } from '../event-bus/event-bus';
import type { RowNode } from '../types/row.types';

/**
 * A feature that installs itself into a grid instance from the outside.
 *
 * Plugins exist so large, optional subsystems (a scheduler timeline, a Gantt
 * layer, a pivot surface) can own DOM inside the grid and follow its
 * virtualization **without shipping in the core bundle**. Core never imports a
 * plugin implementation; a host that registers none pays nothing beyond an
 * `undefined` check.
 *
 * Lifecycle, all driven by `GridCore`:
 *
 * 1. `init(ctx)` — after the grid's DOM is mounted, columns and data are
 *    loaded, and the `GridApi` is live, but **before** `GridEventType.READY`,
 *    so a host's `onReady` already sees whatever the plugin installed.
 * 2. `onRenderWindow(w)` — once per rendered frame, if implemented.
 * 3. `destroy()` — **first** thing in `GridCore.destroy()`, ahead of the event
 *    bus being cleared and the grid element being removed.
 *
 * A plugin that throws from `init` is quarantined: it receives no frames and no
 * `destroy()`, because a half-constructed object is more dangerous to tear down
 * than to leak.
 *
 * @example
 * ```ts
 * class RulerPlugin implements GridPlugin {
 *   readonly id = 'ruler';
 *   private layer!: HTMLElement;
 *
 *   init(ctx: PluginContext): void {
 *     this.layer = ctx.mountLayer('ruler', { followRowOrigin: true });
 *   }
 *
 *   onRenderWindow(w: RenderWindow): void {
 *     // Row tops are rebased — see RenderWindow.rowOriginY.
 *     for (const row of w.rows) paint(row.top - w.rowOriginY);
 *   }
 *
 *   destroy(): void { this.layer.remove(); }
 * }
 *
 * new GridCore(el, { columns, data, plugins: [new RulerPlugin()] });
 * ```
 */
export interface GridPlugin {
  /** Stable identifier, used for layer naming and error reporting. Must be unique per grid. */
  readonly id: string;
  /** Human-readable name for diagnostics. Defaults to {@link id}. */
  readonly name?: string;

  /** Installs the plugin. See the lifecycle note on {@link GridPlugin}. */
  init(ctx: PluginContext): void;

  /**
   * Releases everything the plugin owns: DOM, listeners, observers, timers.
   * Not called if {@link init} threw.
   */
  destroy(): void;

  /**
   * Called once per rendered frame with the window the grid just computed.
   *
   * This is the hot path — it runs inside the grid's own render, synchronously,
   * so it must not force layout or allocate per row. Equivalent to subscribing
   * via {@link PluginContext.onRenderWindow}; use that instead when a
   * sub-component needs its own independent teardown.
   */
  onRenderWindow?(window: RenderWindow): void;
}

/**
 * The surface a plugin is given at {@link GridPlugin.init}.
 *
 * Deliberately a **curated façade rather than the internal `GridContext`**:
 * that context holds ~40 concrete engine classes, most of which are not part of
 * the public API, and handing it out would freeze every internal against
 * refactoring. Anything genuinely missing belongs on {@link GridApi} — the
 * surface that already carries a compatibility contract — not here.
 */
export interface PluginContext {
  /** The grid's public API. The escape hatch for anything not on this façade. */
  readonly api: GridApi;
  /**
   * The grid's event bus.
   *
   * Note `GridEventType` is a closed union, so a plugin cannot add its own
   * members. Use {@link emit} to publish plugin-specific events instead.
   */
  readonly eventBus: EventBus;
  /** The element the grid was constructed into. Plugin chrome outside the body goes here. */
  readonly containerEl: HTMLElement;
  /**
   * This grid's `data-photon-grid-id`. Scope any injected `<style>` with it —
   * stylesheets are document-global, and two grids on a page will collide
   * otherwise.
   */
  readonly gridId: string;

  /**
   * Creates (or returns) an absolutely-positioned layer inside the grid body,
   * as a sibling of the pinned/centre panels — the same position Master/Detail
   * mounts its own layer.
   *
   * Idempotent per `name`: calling twice returns the same element. The layer is
   * removed automatically when the grid is destroyed.
   *
   * The layer spans the whole body and is **not** clipped to the centre panel.
   * Content that must align with centre columns should sit in an inner element
   * inset by {@link RenderWindow.leftPinnedWidth} / `rightPinnedWidth`.
   */
  mountLayer(name: string, options?: PluginLayerOptions): HTMLElement;

  /**
   * Subscribes to the per-frame render window.
   *
   * @returns Unsubscribe.
   */
  onRenderWindow(cb: (window: RenderWindow) => void): () => void;

  /**
   * Subscribes to scroll on both axes.
   *
   * Fires **synchronously during the scroll**, before the animation frame the
   * grid books to re-render — so cheap CSS-variable writes belong here and
   * structural DOM work belongs in {@link onRenderWindow}.
   *
   * @returns Unsubscribe.
   */
  addScrollListener(cb: (metrics: ScrollMetrics) => void): () => void;

  /** Current scroll/viewport geometry. Reads cached numbers; forces no layout. */
  getScrollMetrics(): ScrollMetrics;

  /**
   * Declares horizontal content the plugin owns, in pixels.
   *
   * The centre panel sizes its scrollable width from its columns. A plugin
   * whose content is wider -- or which has no columns at all, as a timeline
   * beside fully-pinned resource columns does not -- must publish that width
   * or the grid will never show a horizontal scrollbar for it. Combined with
   * the column width by `Math.max`, so it can only widen, never shrink.
   */
  setContentWidth(px: number): void;

  /** Requests a re-render, coalesced into the grid's own animation frame. */
  requestRender(): void;

  /** Registers a teardown callback, run just before {@link GridPlugin.destroy}. */
  onDestroy(fn: () => void): void;

  /**
   * Publishes a plugin-specific event on the grid's bus.
   *
   * `GridEventType` is a closed union that a plugin cannot extend, so this
   * re-emits under the single `GridEventType.PLUGIN` member with a payload of
   * `{ pluginId, name, payload }` — the same indirection `DetailContext.emit`
   * uses for detail-component events.
   */
  emit(name: string, payload?: unknown): void;
}

/** Options for {@link PluginContext.mountLayer}. */
export interface PluginLayerOptions {
  /**
   * Stacking order within the grid body.
   * @default 4 — above the sticky layer (3) and the column panels (2).
   */
  zIndex?: number;
  /**
   * Applies `translateY(var(--pg-row-offset-y))`, putting children in the same
   * rebased row space the grid's own rows use. With this on, children position
   * by `row.top - rowOriginY` and need **no** repositioning on vertical scroll.
   * @default false
   */
  followRowOrigin?: boolean;
  /**
   * Applies `translateX(var(--pg-scroll-x))`, so children position in absolute
   * content space and need no repositioning on horizontal scroll.
   * @default false
   */
  followScrollX?: boolean;
  /**
   * Lets pointer events through to the grid beneath. Individual children can
   * opt back in with `pointer-events: auto`.
   * @default true
   */
  transparentToPointer?: boolean;
}

/** Scroll and viewport geometry, in CSS pixels. */
export interface ScrollMetrics {
  readonly scrollTop: number;
  readonly scrollLeft: number;
  /** Height of the scrollable body viewport. */
  readonly viewportHeight: number;
  /** Width of the centre (non-pinned) viewport. */
  readonly viewportWidth: number;
  /** Total height of all rows. */
  readonly contentHeight: number;
  /** Total width of the centre columns. */
  readonly contentWidth: number;
}

/**
 * The virtualization window the grid computed for one frame.
 *
 * Handed to plugins at the end of the render, so a plugin positions against
 * exactly the geometry the grid just committed — no second measurement, no
 * frame of desync.
 *
 * Not emitted on frames where the grid short-circuits to a loading overlay;
 * plugins should keep using their last window.
 */
export interface RenderWindow {
  /** Index of the first rendered row, into the full row array. */
  readonly startIndex: number;
  /** Exclusive end index of the rendered range. */
  readonly endIndex: number;

  /**
   * The offset rendered rows are positioned relative to — **the single most
   * important field here**.
   *
   * Row `top` values are absolute content-space, but the grid writes
   * `top - rowOriginY` into its position stylesheet and translates the panels by
   * `--pg-row-offset-y`. A plugin that positions by raw `row.top`, or by
   * `scrollTop`, is wrong on every scrolled frame. Always use
   * `row.top - rowOriginY`.
   *
   * This is read back from the scroll controller *after* auto-height
   * re-measurement, so it is the value actually baked into this frame's CSS.
   */
  readonly rowOriginY: number;

  /**
   * The rendered rows, **by reference — do not retain or mutate**.
   *
   * Passed live rather than copied because mapping ~60 rows at 60 fps would
   * generate thousands of throwaway objects per second. Note `top` is absolute
   * (see {@link rowOriginY}) and `height` may be `undefined`, in which case
   * {@link rowHeight} applies.
   */
  readonly rows: readonly RowNode[];

  /** Default row height, for rows that do not carry their own. */
  readonly rowHeight: number;

  /** Width of the left pinned panel, for insetting centre-aligned content. */
  readonly leftPinnedWidth: number;
  /** Width of the right pinned panel. */
  readonly rightPinnedWidth: number;

  readonly scroll: ScrollMetrics;

  /** Monotonic frame counter, for cheap change detection and diagnostics. */
  readonly frame: number;
}
