import type { GridPlugin, PluginContext, RenderWindow } from '../plugin.types';
import type { RowNode } from '../../types/row.types';
import { EventIndex } from './data/event-index';
import type { SchedulerEvent, SchedulerResource } from './data/scheduler.types';
import {
  buildTimeline,
  buildTimelineFromView,
  type Timeline,
} from './time/timeline-engine';
import { add, startOf, type TimeRange } from './time/calendar';
import {
  resolveSchedulerConfig,
  type ResolvedSchedulerConfig,
  type SchedulerConfig,
} from './scheduler.config';
import {
  SchedulerEventName,
  type SchedulerModule,
  type SchedulerRuntime,
} from './scheduler-runtime';
import { injectSchedulerStyles } from './theme/scheduler-styles';
import { EventBarRenderer } from './render/event-bar-renderer';
import { SchedulerBackdrop } from './render/scheduler-backdrop';
import { SchedulerHeader } from './render/scheduler-header';
import { EventSelectionService } from './services/event-selection-service';
import { EventDragService } from './services/event-drag-service';
import { EventResizeService } from './services/event-resize-service';
import { SchedulerKeyboardService } from './services/scheduler-keyboard-service';
import { SchedulerApi } from './api/scheduler-api';

/**
 * Timeline scheduler for Photon Grid.
 *
 * Resources are ordinary grid rows — so sorting, filtering, grouping, pinning
 * and row virtualization all come from the grid for free — and the timeline is a
 * plugin-owned layer mounted beside them. Events live in their own index rather
 * than inside row data, because an event is not a property of a resource: one
 * resource has an unbounded, independently-mutating set of them, and nesting
 * would make every event change re-run the grid's row pipeline.
 *
 * ## Why time slots are not columns
 *
 * The obvious design is one `ColumnDef` per time slot. It does not survive
 * contact with the numbers: ten years at daily granularity is ~3,650 columns,
 * and the grid's column path writes one CSS rule per column into a single
 * stylesheet, builds the entire centre header un-virtualized, and runs three
 * separate O(N) passes per frame. So the timeline owns its own axis and its own
 * horizontal virtualization, which is also what lets it reach minute
 * granularity over a decade — 5.26 million slots, at zero allocation.
 *
 * ## How it stays in step with the grid
 *
 * The layer is mounted with `followRowOrigin` and `followScrollX`, which apply
 * the same transforms the grid's own panels use. Bars are positioned in
 * *rebased* row space (`row.top - rowOriginY`) and *absolute* content-x, so a
 * pure scroll moves them via the layer transform and writes no styles at all.
 * That is the design's central claim and the reason it holds at 100k resources.
 *
 * @example
 * ```ts
 * import { SchedulerPlugin } from 'photon-grid-core/plugins/scheduler';
 *
 * new GridCore(el, {
 *   columns: [{ field: 'name', header: 'Employee', pinned: 'left', width: 200 }],
 *   data: resources,
 *   plugins: [new SchedulerPlugin({ resources, events, view: 'month' })],
 * });
 * ```
 */
export class SchedulerPlugin implements GridPlugin {
  readonly id: string;
  readonly name = 'Photon Scheduler';

  private readonly config: ResolvedSchedulerConfig;
  private readonly index = new EventIndex();
  private readonly selection = new Set<string>();
  private readonly resourceById = new Map<string, SchedulerResource>();
  private readonly eventById = new Map<string, SchedulerEvent>();
  /** Every subsystem, torn down in one loop rather than a hand-maintained list. */
  private readonly modules: SchedulerModule[] = [];

  private runtime!: SchedulerRuntime;
  private timeline!: Timeline;
  private ctx!: PluginContext;

  private backdrop: SchedulerBackdrop | null = null;
  private barRenderer: EventBarRenderer | null = null;
  private header: SchedulerHeader | null = null;
  private selectionService: EventSelectionService | null = null;
  /** The plugin public API. Available after `init`. */
  private api: SchedulerApi | null = null;

  private bodyLayerEl: HTMLElement | null = null;
  private headerHostEl: HTMLElement | null = null;

  /** Last window received, so an out-of-band refresh can repaint without waiting for a scroll. */
  private lastWindow: RenderWindow | null = null;

  constructor(private readonly raw: SchedulerConfig = {}, id = 'scheduler') {
    this.id = id;
    this.config = resolveSchedulerConfig(raw);

    for (const resource of raw.resources ?? []) this.resourceById.set(resource.id, resource);
    for (const event of raw.events ?? []) this.eventById.set(event.id, event);
  }

  init(ctx: PluginContext): void {
    this.ctx = ctx;

    // Injected here rather than at module scope so the stylesheet is only
    // reachable from a graph that actually constructs a scheduler.
    injectSchedulerStyles();

    this.timeline = this.buildTimeline();
    this.index.load(this.raw.events ?? []);

    this.runtime = this.createRuntime();

    // Two layers. The body layer follows both axes, so bars need no scroll
    // handling. The header host does NOT follow row origin -- it is pinned to
    // the top and only pans horizontally, which the header manages itself.
    this.bodyLayerEl = ctx.mountLayer('body', {
      followRowOrigin: true,
      followScrollX: true,
      zIndex: 4,
    });
    this.bodyLayerEl.classList.add('pg-scheduler', 'pg-scheduler-body');

    this.headerHostEl = document.createElement('div');
    this.headerHostEl.className = 'pg-scheduler pg-scheduler-header';
    const gridHeader = ctx.containerEl.querySelector<HTMLElement>('.pg-grid__header');
    gridHeader?.appendChild(this.headerHostEl);

    ctx.onDestroy(() => this.headerHostEl?.remove());

    this.buildModules();
  }

  /**
   * Constructs every subsystem and records it for teardown.
   *
   * Order matters in one place only: the keyboard service needs the selection
   * service, so selection is built first. Everything else is independent —
   * services talk to each other through the runtime and through the narrow
   * ports declared at their own boundaries, never by importing one another.
   */
  private buildModules(): void {
    const layer = this.bodyLayerEl;
    if (!layer || !this.headerHostEl) return;

    // Backdrop first, so its canvas is the layer first child and bars paint over it.
    const backdrop = new SchedulerBackdrop(this.runtime, layer);
    this.backdrop = backdrop;
    this.modules.push(backdrop);

    const bars = new EventBarRenderer(this.runtime, layer);
    this.barRenderer = bars;
    this.modules.push(bars);

    const header = new SchedulerHeader(this.runtime, this.headerHostEl);
    this.header = header;
    this.modules.push(header);

    if (this.config.selection.enabled) {
      const selection = new EventSelectionService(this.runtime, layer, bars);
      this.selectionService = selection;
      this.modules.push(selection);

      this.modules.push(new SchedulerKeyboardService(this.runtime, layer, bars, selection));
    }

    if (this.config.drag.enabled) {
      this.modules.push(
        new EventDragService(this.runtime, layer, bars, (clientY) => this.resourceAtY(clientY)),
      );
    }

    if (this.config.resize.enabled) {
      this.modules.push(new EventResizeService(this.runtime, layer, bars));
    }

    this.api = new SchedulerApi(this.runtime, {
      setTimeline: (next) => this.setTimeline(next),
      scrollToPx: (px) => this.ctx.api.scrollToX(px),
      scrollToRowByResourceId: (id) => this.scrollToResource(id),
      selection: {
        select: (ids, additive) => this.selectionService?.select([...ids], additive),
        clear: () => this.selectionService?.clear(),
        getSelected: () => this.selectionService?.getSelected() ?? [],
      },
    });
  }

  /**
   * Resolves the resource under a viewport Y coordinate, for cross-resource drags.
   *
   * Owned by the plugin rather than the drag service because it is the only
   * piece that knows both the render window (which rows are on screen and where)
   * and the grid's rebasing — the service would otherwise need both, and would
   * be untestable without a DOM.
   */
  private resourceAtY(clientY: number): string | null {
    const window = this.lastWindow;
    const layer = this.bodyLayerEl;
    if (!window || !layer) return null;

    // One measurement per drag frame, on the layer itself rather than per row.
    const layerTop = layer.getBoundingClientRect().top;
    const y = clientY - layerTop + window.rowOriginY;

    for (const row of window.rows) {
      const height = row.height ?? window.rowHeight;
      if (y >= row.top && y < row.top + height) return this.resourceIdOfRow(row);
    }
    return null;
  }

  /** Scrolls the grid so a resource's row is visible. */
  private scrollToResource(resourceId: string): void {
    const rows = this.ctx.api.getAllRows();
    const index = rows.findIndex(
      (row) => row.type === 'data' && this.config.resourceIdOf(row.data) === resourceId,
    );
    if (index >= 0) this.ctx.api.ensureIndexVisible(index);
  }

  /**
   * Per-frame entry point.
   *
   * Everything downstream reads its geometry from this window rather than
   * measuring, so the scheduler never forces a layout during a scroll.
   */
  onRenderWindow(window: RenderWindow): void {
    this.lastWindow = window;
    this.layoutRegions(window);

    // Published every frame but guarded inside the renderer, so this is a
    // number comparison unless the timeline actually changed width. Without
    // it the centre panel has no columns, reports 0, and never scrolls.
    this.ctx.setContentWidth(this.timeline.axis.totalPx);

    this.backdrop?.render(window);
    this.barRenderer?.render(window);
    // `render` is the cheap path on almost every frame: it rebuilds only when
    // the timeline reference changed, and re-virtualizes the slot row only when
    // the visible window moved. `setScrollX` then writes one transform.
    this.header?.render();
    this.header?.setScrollX(window.scroll.scrollLeft);
  }

  destroy(): void {
    for (const mod of this.modules.splice(0)) {
      try {
        mod.destroy();
      } catch (err) {
        console.error(`[PhotonScheduler] module teardown failed:`, err);
      }
    }
    this.bodyLayerEl = null;
    this.headerHostEl = null;
    this.lastWindow = null;
  }

  // -- Internals -------------------------------------------------------------

  /**
   * Sizes the header and body regions to the grid's centre area.
   *
   * The plugin layer spans the whole body, so both regions are inset by the
   * pinned panel widths the render window reports. Written every frame but
   * guarded by a value check, because panel widths only change on a resize or a
   * pin, not on a scroll.
   */
  private layoutRegions(window: RenderWindow): void {
    const left = `${window.leftPinnedWidth}px`;
    const right = `${window.rightPinnedWidth}px`;

    for (const el of [this.bodyLayerEl, this.headerHostEl]) {
      if (!el) continue;
      if (el.style.left !== left) el.style.left = left;
      if (el.style.right !== right) el.style.right = right;
    }
  }

  /** Builds the timeline from whichever config form the host supplied. */
  private buildTimeline(): Timeline {
    const range = this.raw.range ?? defaultRange();

    if (this.raw.timeline) {
      return buildTimeline({
        unit: this.raw.timeline.unit,
        step: this.raw.timeline.step,
        headerBands: this.raw.timeline.headerBands,
        range,
        slotWidth: this.config.slotWidth,
        slotWidthMode: this.config.slotWidthMode,
        weekStartsOn: this.config.weekStartsOn,
      });
    }

    return buildTimelineFromView(this.raw.view ?? 'month', range, this.config.slotWidth, {
      slotWidthMode: this.config.slotWidthMode,
      weekStartsOn: this.config.weekStartsOn,
    });
  }

  private createRuntime(): SchedulerRuntime {
    const plugin = this;

    return {
      config: this.config,
      raw: this.raw,
      ctx: this.ctx,
      api: this.ctx.api,

      get timeline(): Timeline {
        return plugin.timeline;
      },
      set timeline(next: Timeline) {
        plugin.timeline = next;
      },

      index: this.index,
      selection: this.selection,

      getResource: (id) => this.resourceById.get(id),
      getEvent: (id) => this.eventById.get(id),
      allEvents: () => Array.from(this.eventById.values()),

      requestRender: () => this.ctx.requestRender(),
      emit: (name, payload) => this.ctx.emit(name, payload),

      renderIcon: (name, size = 12) => {
        // Routed through the grid's icon renderer so scheduler chrome follows
        // the active theme's icon pack like every other glyph.
        const renderer = (this.ctx.api as unknown as {
          ctx?: { iconRenderer?: { renderToString(n: string, s: number): string } };
        }).ctx?.iconRenderer;
        return renderer?.renderToString(name, size) ?? '';
      },
    };
  }

  /** Maps a grid row to a resource id, honouring the host's override. */
  resourceIdOfRow = (row: RowNode): string | null => {
    if (row.type !== 'data') return null;
    return this.config.resourceIdOf(row.data);
  };

  /** The resolved runtime, for the API and for tests. */
  getRuntime(): SchedulerRuntime {
    return this.runtime;
  }

  /** The most recent render window, so an out-of-band refresh can repaint. */
  getLastWindow(): RenderWindow | null {
    return this.lastWindow;
  }

  /**
   * The scheduler public API: events, selection, view, navigation, refresh.
   *
   * Only valid after the grid has initialized the plugin, which happens before
   * `GridEventType.READY` -- so a host reading it from `onReady` is safe.
   */
  getApi(): SchedulerApi {
    if (!this.api) throw new Error('SchedulerPlugin: getApi() called before the grid initialized the plugin');
    return this.api;
  }

  /** Replaces the timeline, rebuilds the header and repaints. */
  setTimeline(next: Timeline): void {
    this.timeline = next;
    this.header?.render();
    this.runtime.emit(SchedulerEventName.TimelineChanged, { timeline: next });
    this.ctx.requestRender();
  }
}

/** The current calendar month, used when the host supplies no range. */
function defaultRange(): TimeRange {
  const start = startOf('month', Date.now());
  return { start, end: add('month', 1, start) };
}
