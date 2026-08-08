import type { PluginContext } from '../plugin.types';
import type { GridApi } from '../../core/grid-api';
import type { EventIndex } from './data/event-index';
import type { SchedulerEvent, SchedulerResource } from './data/scheduler.types';
import type { Timeline } from './time/timeline-engine';
import type { ResolvedSchedulerConfig, SchedulerConfig } from './scheduler.config';

/**
 * Shared state handed to every scheduler subsystem.
 *
 * The plugin owns exactly one of these and passes it to the header, the bar
 * renderer and each interaction service. It exists so those pieces can be
 * written and tested independently without importing each other — the runtime
 * is the only thing they share, and it is an interface rather than a class so a
 * test can supply a plain object.
 *
 * Everything mutable on it (`timeline`, `selection`) is owned by the plugin;
 * services read it and call back through {@link requestRender} rather than
 * touching the DOM of another subsystem.
 */
export interface SchedulerRuntime {
  /** Config with every default filled in. */
  readonly config: ResolvedSchedulerConfig;
  /** The host's original config, for hooks and per-type renderers. */
  readonly raw: SchedulerConfig;

  /** The grid plugin context: layers, render window, scroll metrics. */
  readonly ctx: PluginContext;
  /** The grid's public API. */
  readonly api: GridApi;

  /** Current timeline. Replaced wholesale on a view/range change, never mutated. */
  timeline: Timeline;

  /** Range index over all events. */
  readonly index: EventIndex;

  /** Selected event ids. Owned by the selection service; read by the renderer. */
  readonly selection: Set<string>;

  /** Resolves a resource by id, for renderers that show resource context. */
  getResource(id: string): SchedulerResource | undefined;

  /** Resolves an event by id. */
  getEvent(id: string): SchedulerEvent | undefined;

  /** All events currently loaded, for API queries. */
  allEvents(): readonly SchedulerEvent[];

  /** Schedules a repaint, coalesced into the grid's own animation frame. */
  requestRender(): void;

  /** Publishes a scheduler event on the grid bus, namespaced by the plugin id. */
  emit(name: string, payload?: unknown): void;

  /** Renders an icon by registry name to markup, so subsystems follow the theme's icon pack. */
  renderIcon(name: string, size?: number): string;
}

/** Names published through {@link SchedulerRuntime.emit}. */
export const SchedulerEventName = {
  EventsChanged: 'eventsChanged',
  SelectionChanged: 'selectionChanged',
  EventClicked: 'eventClicked',
  EventDoubleClicked: 'eventDoubleClicked',
  BeforeMove: 'beforeMove',
  AfterMove: 'afterMove',
  BeforeResize: 'beforeResize',
  AfterResize: 'afterResize',
  BeforeCreate: 'beforeCreate',
  AfterCreate: 'afterCreate',
  BeforeDelete: 'beforeDelete',
  AfterDelete: 'afterDelete',
  ViewChanged: 'viewChanged',
  TimelineChanged: 'timelineChanged',
} as const;

export type SchedulerEventName = (typeof SchedulerEventName)[keyof typeof SchedulerEventName];

/**
 * A subsystem with a lifetime tied to the plugin's.
 *
 * Services and renderers both implement it, so the plugin's `destroy` is one
 * loop rather than a hand-maintained list of teardown calls.
 */
export interface SchedulerModule {
  destroy(): void;
}
