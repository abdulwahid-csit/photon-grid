import type { GridApi } from '../core/grid-api';
import type { GridContext } from '../core/grid-context';
import type {
  GridPlugin,
  PluginContext,
  PluginLayerOptions,
  RenderWindow,
  ScrollMetrics,
} from './plugin.types';

/** What a host needs from the renderer, kept narrow so the coupling is visible. */
export interface PluginRendererSeam {
  mountPluginLayer(name: string, options?: PluginLayerOptions): HTMLElement;
  readScrollMetrics(): ScrollMetrics;
  scheduleRender(): void;
  setPluginContentWidth(px: number): void;
  addScrollListener(cb: () => void): () => void;
}

/**
 * Owns the lifecycle of a grid's registered plugins.
 *
 * Constructed only when `GridOptions.plugins` is non-empty, so a grid without
 * plugins never allocates one. Its whole job is ordering and blast-radius
 * containment: plugins run late enough to see a fully built grid, early enough
 * to be visible to `onReady`, and are torn down before anything they depend on
 * disappears.
 *
 * **Failure policy**, mirroring `EventBus.dispatch` and going one step further:
 *
 * - A throw in `init` **quarantines** the plugin. It receives no frames and no
 *   `destroy()` — its constructor ran only partway, so calling teardown on it is
 *   more likely to compound the failure than to clean up.
 * - A throw in `onRenderWindow` logs **once** and detaches that subscription. At
 *   60 fps the alternative is an unbounded console flood plus a throw per frame.
 * - A throw in `destroy` is logged and swallowed, so one plugin cannot prevent
 *   the rest of the grid from tearing down.
 *
 * In every case the grid itself keeps working. A plugin is an optional add-on;
 * it must not be able to take the grid down with it.
 */
export class PluginHost {
  /** Plugins that initialized cleanly and may receive frames. */
  private readonly active: GridPlugin[] = [];
  /** Ids that threw during `init` — excluded from frames and teardown. */
  private readonly quarantined = new Set<string>();
  /** Ids that have already reported a render-window failure, so we log once. */
  private readonly reportedFrameFailures = new Set<string>();

  private readonly windowSubs: Array<(w: RenderWindow) => void> = [];
  private readonly teardowns: Array<() => void> = [];

  private destroyed = false;

  constructor(
    private readonly ctx: GridContext,
    private readonly api: GridApi,
    private readonly plugins: readonly GridPlugin[],
    private readonly renderer: PluginRendererSeam,
  ) {}

  /**
   * Initializes every registered plugin, in declaration order.
   *
   * Duplicate ids are rejected rather than silently tolerated: layers are keyed
   * by id, so two plugins sharing one would fight over the same element.
   */
  initAll(): void {
    const seen = new Set<string>();

    for (const plugin of this.plugins) {
      if (seen.has(plugin.id)) {
        console.error(
          `[PhotonGrid] Duplicate plugin id "${plugin.id}" — the second registration was ignored.`,
        );
        continue;
      }
      seen.add(plugin.id);

      const ok = this.guard(plugin, 'init', () => plugin.init(this.createContext(plugin)));

      if (!ok) {
        this.quarantined.add(plugin.id);
        continue;
      }

      this.active.push(plugin);
      // Registered after a successful init so a plugin that threw never receives
      // frames, and so the subscription order matches the declaration order.
      if (plugin.onRenderWindow) {
        const bound = (w: RenderWindow): void => plugin.onRenderWindow!(w);
        this.windowSubs.push(bound);
      }
    }
  }

  /** `true` when at least one subscriber exists, so the renderer can skip building a window. */
  wantsRenderWindow(): boolean {
    return this.windowSubs.length > 0;
  }

  /**
   * Delivers one frame's window to every subscriber.
   *
   * Iterates a snapshot: a subscriber may unsubscribe during dispatch (its own
   * or a sibling's), and a failing subscriber is removed mid-walk.
   */
  dispatchRenderWindow(window: RenderWindow): void {
    if (this.destroyed) return;

    for (const sub of [...this.windowSubs]) {
      try {
        sub(window);
      } catch (err) {
        this.detachFrameSub(sub, err);
      }
    }
  }

  /** Tears down every active plugin, in reverse declaration order. */
  destroyAll(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Reverse order so a plugin that installed something another depends on is
    // the last to go — the same convention as nested resource release.
    for (let i = this.active.length - 1; i >= 0; i--) {
      const plugin = this.active[i];
      this.guard(plugin, 'destroy', () => plugin.destroy());
    }

    for (const fn of this.teardowns.splice(0).reverse()) {
      try {
        fn();
      } catch (err) {
        console.error('[PhotonGrid] Plugin teardown callback failed:', err);
      }
    }

    this.active.length = 0;
    this.windowSubs.length = 0;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Builds the façade handed to one plugin. */
  private createContext(plugin: GridPlugin): PluginContext {
    const { ctx, api, renderer } = this;

    return {
      api,
      eventBus: ctx.eventBus,
      containerEl: ctx.containerEl,
      gridId: ctx.containerEl.getAttribute('data-photon-grid-id') ?? plugin.id,

      mountLayer: (name, options) => renderer.mountPluginLayer(`${plugin.id}--${name}`, options),

      onRenderWindow: (cb) => {
        this.windowSubs.push(cb);
        return () => {
          const i = this.windowSubs.indexOf(cb);
          if (i !== -1) this.windowSubs.splice(i, 1);
        };
      },

      addScrollListener: (cb) => renderer.addScrollListener(() => cb(renderer.readScrollMetrics())),

      getScrollMetrics: () => renderer.readScrollMetrics(),
      setContentWidth: (px) => renderer.setPluginContentWidth(px),
      requestRender: () => renderer.scheduleRender(),
      onDestroy: (fn) => { this.teardowns.push(fn); },

      emit: (name, payload) => {
        // `GridEventType` is a closed union, so plugin events travel under one
        // shared member — the same indirection detail-component events use.
        ctx.eventBus.emit('plugin:event' as never, {
          pluginId: plugin.id,
          name,
          payload,
        } as never);
      },
    };
  }

  /** Runs `fn`, reporting and containing any throw. Returns whether it succeeded. */
  private guard(plugin: GridPlugin, phase: string, fn: () => void): boolean {
    try {
      fn();
      return true;
    } catch (err) {
      console.error(
        `[PhotonGrid] Plugin "${plugin.name ?? plugin.id}" failed during ${phase}:`,
        err,
      );
      return false;
    }
  }

  /** Removes a failing per-frame subscriber, logging only the first failure. */
  private detachFrameSub(sub: (w: RenderWindow) => void, err: unknown): void {
    const i = this.windowSubs.indexOf(sub);
    if (i !== -1) this.windowSubs.splice(i, 1);

    // Keyed on the subscriber, not the plugin, because a plugin may hold several.
    const key = String(this.windowSubs.length) + String(err);
    if (!this.reportedFrameFailures.has(key)) {
      this.reportedFrameFailures.add(key);
      console.error(
        '[PhotonGrid] A plugin threw while handling a render window and was detached '
        + 'from further frames:',
        err,
      );
    }
  }
}
