import type { SchedulerEvent, SchedulerResource } from '../data/scheduler.types';
import type { SchedulerMoveIntent, SchedulerResizeIntent } from '../scheduler.config';
import type { SchedulerEventName } from '../scheduler-runtime';
import type { TimeRange } from '../time/calendar';
import type { Timeline, TimelineViewName } from '../time/timeline-engine';

/**
 * Payload contracts for everything the scheduler publishes.
 *
 * ## How these reach a listener
 *
 * `GridEventType` is a **closed union**, and a plugin cannot add a member to it
 * without editing core - which is exactly what the plugin seam exists to avoid.
 * So every name in {@link SchedulerEventName} is republished on the grid bus
 * under the single `GridEventType.PLUGIN` member, with the real identity moved
 * into the payload as {@link SchedulerPluginEventEnvelope}:
 *
 * ```ts
 * gridApi.addEventListener(GridEventType.PLUGIN, (e) => {
 *   const envelope = e.payload as SchedulerPluginEventEnvelope;
 *   if (envelope.pluginId !== 'scheduler') return;
 *   if (envelope.name === 'afterMove') {
 *     const payload = envelope.payload as SchedulerMovePayload;
 *   }
 * });
 * ```
 *
 * That indirection is the same one `DetailContext.emit` uses, so a host that has
 * already wired Master/Detail events needs no new listener shape.
 *
 * ## Why the before/after pairs share one payload
 *
 * `beforeMove` and `afterMove` describe the *same* intent at two moments, and
 * splitting them into two interfaces would duplicate five fields to express a
 * difference that is one enum. A {@link SchedulerLifecyclePhase} discriminant
 * instead lets a host register one handler and branch, and keeps a log or an
 * audit trail able to store both under one type.
 *
 * ## Why the bus never vetoes
 *
 * Only the `onBefore*` config hooks can cancel an action, because a bus is
 * fan-out: with two listeners there is no defensible answer to "which one wins",
 * and an event that is sometimes advisory and sometimes authoritative is the
 * kind of ambiguity that produces bugs nobody can reproduce. The bus therefore
 * always reports, and the config hook always decides. A `before*` payload is
 * emitted even for an action that is about to be vetoed, so telemetry sees the
 * attempt.
 */

/** Whether a payload describes an action about to happen or one that has. */
export type SchedulerLifecyclePhase = 'before' | 'after';

/** What originated a mutation, so a listener can ignore its own writes. */
export type SchedulerMutationSource = 'api' | 'interaction';

/** Why the event collection changed, for listeners that react selectively. */
export type SchedulerEventsChangeReason =
  | 'add'
  | 'remove'
  | 'update'
  | 'move'
  | 'resize'
  | 'replace'
  | 'refresh';

/**
 * The wrapper every scheduler event arrives in on the grid bus.
 *
 * `pluginId` is checked first by any host running more than one plugin: two
 * plugins publishing `selectionChanged` is not a collision to be designed away,
 * it is the normal case, and the id is what disambiguates them.
 */
export interface SchedulerPluginEventEnvelope<K extends SchedulerEventName = SchedulerEventName> {
  /** The emitting plugin's `GridPlugin.id`. */
  readonly pluginId: string;
  /** The scheduler-level event name. */
  readonly name: K;
  /** The payload for `name`, per {@link SchedulerEventPayloadMap}. */
  readonly payload: SchedulerEventPayloadMap[K];
}

/**
 * The event collection changed.
 *
 * `events` carries only the events actually touched, never the whole set: a
 * transaction of one on a hundred thousand rows should cost a one-element array,
 * and a listener that wants everything already has `getEvents()`. For
 * `'replace'` and `'refresh'` it is empty, since naming every event would defeat
 * that.
 */
export interface SchedulerEventsChangedPayload {
  readonly reason: SchedulerEventsChangeReason;
  /** The events this change touched. Empty for wholesale replacement. */
  readonly events: readonly SchedulerEvent[];
  /** Total event count after the change, for status bars and diagnostics. */
  readonly total: number;
  readonly source: SchedulerMutationSource;
}

/**
 * The selected set changed.
 *
 * Both the resolved events and their bare ids are carried: a host persisting a
 * selection wants the ids and should not have to map, and a host rendering a
 * side panel wants the events and should not have to look them up.
 */
export interface SchedulerSelectionChangedPayload {
  readonly selected: readonly SchedulerEvent[];
  readonly ids: readonly string[];
  /** `true` when this selection extended the previous one rather than replacing it. */
  readonly additive: boolean;
}

/**
 * A bar was clicked or double-clicked.
 *
 * `native` is optional because the same payload serves a click synthesised from
 * the keyboard, where there is no `MouseEvent` to report and inventing one would
 * be a lie a host could not distinguish from the real thing.
 */
export interface SchedulerEventClickedPayload {
  readonly event: SchedulerEvent;
  readonly resource: SchedulerResource | undefined;
  /** The originating pointer event, absent for keyboard activation. */
  readonly native: MouseEvent | undefined;
  /** `true` for `eventDoubleClicked`. */
  readonly doubleClick: boolean;
}

/**
 * An event is moving, or has moved.
 *
 * Extends the intent the config hooks receive rather than restating it, so the
 * bus and the hooks can never drift apart in what a move *is*.
 */
export interface SchedulerMovePayload extends SchedulerMoveIntent {
  readonly phase: SchedulerLifecyclePhase;
  readonly source: SchedulerMutationSource;
}

/** An event is resizing, or has resized. */
export interface SchedulerResizePayload extends SchedulerResizeIntent {
  readonly phase: SchedulerLifecyclePhase;
  readonly source: SchedulerMutationSource;
}

/**
 * An event is being created, or has been.
 *
 * The `before` payload is emitted before `onBeforeCreate` runs, so a listener
 * observes attempts that the host then vetoes - which is the only way to build a
 * "why did nothing happen?" diagnostic.
 */
export interface SchedulerCreatePayload {
  readonly event: SchedulerEvent;
  readonly phase: SchedulerLifecyclePhase;
  readonly source: SchedulerMutationSource;
}

/** An event is being deleted, or has been. */
export interface SchedulerDeletePayload {
  readonly event: SchedulerEvent;
  readonly phase: SchedulerLifecyclePhase;
  readonly source: SchedulerMutationSource;
}

/**
 * The timeline was rebuilt: a view change, a range change, a zoom, or a raw
 * config override.
 *
 * `view` is `undefined` when the timeline came from an explicit
 * {@link TimelineConfig} rather than a named preset - there is no preset name to
 * report, and returning a nearest match would be a guess a host might persist.
 */
export interface SchedulerViewChangedPayload {
  readonly view: TimelineViewName | undefined;
  /** The span the new timeline covers. */
  readonly range: TimeRange;
  /** The new timeline. Immutable, so holding it is safe. */
  readonly timeline: Timeline;
  /** Effective slot width, which a zoom changes without changing the view. */
  readonly slotWidth: number;
}

/**
 * Maps every {@link SchedulerEventName} member to the payload it carries.
 *
 * Written with literal keys rather than computed `[SchedulerEventName.X]` ones
 * so the map is readable in editor hovers and in generated documentation;
 * {@link SchedulerEventPayload} enforces that the two stay in step.
 *
 * `timelineChanged` shares `viewChanged`'s payload deliberately: they differ in
 * *cause* (a preset switch versus a zoom or range pan), not in what a listener
 * needs to know, and a separate near-identical interface would only invite the
 * two to drift.
 */
export interface SchedulerEventPayloadMap {
  readonly eventsChanged: SchedulerEventsChangedPayload;
  readonly selectionChanged: SchedulerSelectionChangedPayload;
  readonly eventClicked: SchedulerEventClickedPayload;
  readonly eventDoubleClicked: SchedulerEventClickedPayload;
  readonly beforeMove: SchedulerMovePayload;
  readonly afterMove: SchedulerMovePayload;
  readonly beforeResize: SchedulerResizePayload;
  readonly afterResize: SchedulerResizePayload;
  readonly beforeCreate: SchedulerCreatePayload;
  readonly afterCreate: SchedulerCreatePayload;
  readonly beforeDelete: SchedulerDeletePayload;
  readonly afterDelete: SchedulerDeletePayload;
  readonly viewChanged: SchedulerViewChangedPayload;
  readonly timelineChanged: SchedulerViewChangedPayload;
}

/**
 * The payload for one event name.
 *
 * Doubles as the exhaustiveness guard: the `K extends SchedulerEventName`
 * constraint only compiles while every member of that union is a key of
 * {@link SchedulerEventPayloadMap}, so adding a name to
 * {@link SchedulerEventName} without a payload is a compile error here rather
 * than an `unknown` at some distant call site.
 */
export type SchedulerEventPayload<K extends SchedulerEventName> = SchedulerEventPayloadMap[K];
