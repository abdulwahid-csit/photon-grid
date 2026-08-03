import type { SchedulerEvent } from '../data/scheduler.types';
import type {
  SchedulerCreatePayload,
  SchedulerDeletePayload,
  SchedulerEventsChangedPayload,
  SchedulerEventsChangeReason,
  SchedulerMovePayload,
  SchedulerResizePayload,
  SchedulerViewChangedPayload,
} from '../events/scheduler-events';
import type { SchedulerMoveIntent, SchedulerResizeIntent } from '../scheduler.config';
import type { SchedulerRuntime } from '../scheduler-runtime';
import { SchedulerEventName } from '../scheduler-runtime';
import type { TimeRange } from '../time/calendar';
import type { Timeline, TimelineConfig, TimelineViewName } from '../time/timeline-engine';
import { buildTimeline, buildTimelineFromView } from '../time/timeline-engine';

/**
 * Callback the plugin injects so the API can hand back a rebuilt timeline.
 *
 * The API owns the *decision* to rebuild - a view switch, a zoom, a range pan -
 * but not the consequences of one: swapping `runtime.timeline`, re-rendering the
 * header bands, resetting horizontal scroll extents. Inverting it this way keeps
 * the API free of DOM and lets it be unit-tested against a plain object, which
 * is the same reason {@link SchedulerRuntime} is an interface rather than a class.
 */
export type SchedulerViewChangeHandler = (next: Timeline) => void;

/**
 * The plugin capabilities the API cannot implement itself.
 *
 * Everything here needs either DOM or state the API deliberately does not own.
 * Scrolling is the grid's, selection is the selection service's, and the
 * timeline swap is the plugin's. Passing them in as one object rather than
 * reaching into the plugin is what keeps the dependency one-directional: the
 * plugin knows the API, the API knows only these four function shapes.
 */
export interface SchedulerApiHooks {
  /** Installs a freshly built timeline. See {@link SchedulerViewChangeHandler}. */
  readonly setTimeline: SchedulerViewChangeHandler;
  /** Scrolls the timeline horizontally to a content-space pixel offset. */
  readonly scrollToPx: (px: number) => void;
  /** Scrolls vertically to the grid row backing a resource, if it is displayed. */
  readonly scrollToRowByResourceId: (id: string) => void;
  /** The selection service, which owns the selected set and its change event. */
  readonly selection: {
    select(ids: readonly string[], additive?: boolean): void;
    clear(): void;
    getSelected(): readonly SchedulerEvent[];
  };
}

/** Smallest slot width a zoom will produce. Below this the header cannot render a label. */
const MIN_SLOT_WIDTH = 4;
/** Largest slot width a zoom will produce. Above this a day view scrolls for minutes. */
const MAX_SLOT_WIDTH = 400;
/** Multiplier per {@link SchedulerApi.zoomIn} step. */
const ZOOM_IN_FACTOR = 1.25;
/** Multiplier per {@link SchedulerApi.zoomOut} step. Not `1/1.25`, so the steps are asymmetric by design - zooming out reveals context faster than zooming in commits to detail. */
const ZOOM_OUT_FACTOR = 0.8;

/**
 * The scheduler's public API.
 *
 * ## What this is for
 *
 * Everything a host can do to a scheduler from code: mutate events, drive
 * selection, change the view, navigate. It is the *only* supported surface -
 * {@link SchedulerRuntime} is shared internal state and the event index is a
 * data structure, and a host reaching into either would be writing against
 * implementation details that carry no compatibility promise.
 *
 * ## Veto and hook semantics
 *
 * Mutating methods run the matching `onBefore*` config hook and abort when it
 * returns `false`, returning `false` themselves. Programmatic and interactive
 * mutations therefore go through exactly one veto path, which is what stops a
 * host's validation from being enforced on drag but bypassed by
 * `api.moveEvent()`. The bus events fire either way, `before` even for a vetoed
 * action, so telemetry sees attempts.
 *
 * ## Managed mode does not apply here
 *
 * `draggable.managed: false` and `resizable.managed: false` mean "the pointer
 * gesture is a *request*; the host persists and confirms it". That contract is
 * about gestures the user makes. A call to {@link moveEvent} is not a request -
 * it *is* the host acting - so these methods always apply their change, and the
 * intent they pass to hooks reports `managed: true`. A host in unmanaged mode
 * typically handles `beforeMove`, persists, and then calls {@link moveEvent} to
 * commit; if this method deferred as well, nothing would ever move.
 *
 * ## `locked` does not apply here either
 *
 * `SchedulerEventTypeConfig.locked` suppresses the drag and resize affordances
 * on a bar. It is an interaction affordance, not an authorisation rule - the API
 * is the escape hatch a host uses to move a locked event from its own UI, and a
 * check here would leave no way to do that at all.
 *
 * ## Rendering
 *
 * No method paints. Each requests a frame through
 * {@link SchedulerRuntime.requestRender}, which coalesces into the grid's own
 * animation frame - so a loop of a thousand `updateEvent` calls costs one
 * render, not a thousand.
 */
export class SchedulerApi {
  /**
   * The active preset, or `null` once a raw {@link TimelineConfig} supersedes it.
   *
   * Tracked rather than derived because a `TimelineConfig` cannot be reduced
   * back to a preset name: several presets share `{ unit: 'day', step: 1 }` and
   * differ only in header bands, so a reverse lookup would report the wrong view
   * and a host persisting it would restore the wrong one.
   */
  private view: TimelineViewName | null;

  /** The span the timeline covers. Kept here so a zoom can rebuild without re-deriving it. */
  private range: TimeRange;

  /** Effective slot width, which zoom changes independently of the view. */
  private slotWidth: number;

  /**
   * @param runtime - Shared scheduler state. Read for events, hooks and config;
   *   its event index is the single source of truth this API mutates.
   * @param hooks - Plugin capabilities the API delegates to. See
   *   {@link SchedulerApiHooks}.
   */
  constructor(
    private readonly runtime: SchedulerRuntime,
    private readonly hooks: SchedulerApiHooks,
  ) {
    const config = runtime.timeline.config;
    // A host that passed an explicit `timeline` block has no preset in force,
    // so the initial view is null and `setView` is the only way to acquire one.
    this.view = runtime.raw.timeline ? null : (runtime.raw.view ?? 'month');
    this.range = config.range;
    this.slotWidth = config.slotWidth;
  }

  // -- Events ---------------------------------------------------------------

  /**
   * Adds one event.
   *
   * Emits `beforeCreate`, then consults `onBeforeCreate`; returning `false` from
   * that hook aborts before the index is touched, so a rejected event leaves no
   * trace. On success the index is updated, `onAfterCreate` and `afterCreate`
   * fire, and a frame is requested.
   *
   * Adding an event whose id already exists is *not* rejected here - the index
   * treats it as an insert and the duplicate would shadow the original in
   * lookups. Hosts generating ids should ensure uniqueness; this method does not
   * pay an id existence check on every add to catch a caller bug.
   *
   * @returns `false` when `onBeforeCreate` vetoed, otherwise `true`.
   */
  addEvent(event: SchedulerEvent): boolean {
    this.emitCreate(event, 'before');
    if (this.runtime.raw.onBeforeCreate?.(event) === false) return false;

    this.runtime.index.add(event);

    this.runtime.raw.onAfterCreate?.(event);
    this.emitCreate(event, 'after');
    this.notifyChanged('add', [event]);
    return true;
  }

  /**
   * Adds many events, vetoing per event.
   *
   * Per-event rather than all-or-nothing because a bulk import where one record
   * is invalid should land the other nine hundred and ninety-nine; a host that
   * wants transactional semantics validates first and calls this once.
   *
   * Cheaper than a loop of {@link addEvent} only in the number of render
   * requests, which is the cost that actually matters: one frame, not one per
   * event.
   *
   * @returns How many events were accepted.
   */
  addEvents(events: readonly SchedulerEvent[]): number {
    const accepted: SchedulerEvent[] = [];

    for (const event of events) {
      this.emitCreate(event, 'before');
      if (this.runtime.raw.onBeforeCreate?.(event) === false) continue;

      this.runtime.index.add(event);
      this.runtime.raw.onAfterCreate?.(event);
      this.emitCreate(event, 'after');
      accepted.push(event);
    }

    if (accepted.length > 0) this.notifyChanged('add', accepted);
    return accepted.length;
  }

  /**
   * Removes an event by id.
   *
   * Emits `beforeDelete`, then consults `onBeforeDelete`; `false` aborts. The
   * event is also dropped from the selection, because a selected id with no
   * event behind it would make `getSelectedEvents()` shorter than the selection
   * and every consumer of that pair inconsistent.
   *
   * @returns `false` when the id is unknown or `onBeforeDelete` vetoed.
   */
  removeEvent(id: string): boolean {
    const event = this.runtime.getEvent(id);
    if (!event) return false;

    this.emitDelete(event, 'before');
    if (this.runtime.raw.onBeforeDelete?.(event) === false) return false;

    if (this.runtime.selection.has(id)) {
      const remaining = this.hooks.selection
        .getSelected()
        .filter((candidate) => candidate.id !== id)
        .map((candidate) => candidate.id);
      this.hooks.selection.select(remaining, false);
    }

    this.runtime.index.remove(id);

    this.runtime.raw.onAfterDelete?.(event);
    this.emitDelete(event, 'after');
    this.notifyChanged('remove', [event]);
    return true;
  }

  /**
   * Replaces an event in place, matched by id.
   *
   * Has no veto hook by design: `onBeforeCreate` and `onBeforeDelete` guard the
   * *existence* of events, and an update changes only their content, which a
   * host is free to validate before calling. Adding a third hook here would also
   * put a host callback on the drag-commit path twice, since a move already
   * fires `onBeforeMove`.
   *
   * An unknown id is treated as an insert by the index, matching the "upsert"
   * behaviour hosts expect when replaying a server delta.
   */
  updateEvent(event: SchedulerEvent): void {
    this.runtime.index.update(event);
    this.notifyChanged('update', [event]);
  }

  /**
   * Moves an event to another resource and/or start time, preserving duration.
   *
   * Duration preservation is what makes this a *move* rather than a reschedule:
   * `end` is recomputed as `toStart + (end - start)`, so a two-hour meeting
   * dropped on a new day is still two hours. Use {@link resizeEvent} to change
   * duration.
   *
   * Emits `beforeMove`, consults `onBeforeMove`, and on success bumps
   * `SchedulerEvent.version` so the bar renderer can skip untouched bars by
   * comparison rather than by deep equality.
   *
   * @returns `false` when the id is unknown or `onBeforeMove` vetoed.
   */
  moveEvent(id: string, toResourceId: string, toStart: number): boolean {
    const event = this.runtime.getEvent(id);
    if (!event) return false;

    const duration = event.end - event.start;
    const intent: SchedulerMoveIntent = {
      event,
      fromResourceId: event.resourceId,
      toResourceId,
      fromStart: event.start,
      toStart,
      toEnd: toStart + duration,
      // Always managed: see the class doc. The API performs the mutation, so
      // there is nothing for the host to confirm.
      managed: true,
    };

    this.emitMove(intent, 'before');
    if (this.runtime.raw.onBeforeMove?.(intent) === false) return false;

    const next: SchedulerEvent = {
      ...event,
      resourceId: toResourceId,
      start: toStart,
      end: intent.toEnd,
      version: (event.version ?? 0) + 1,
    };
    this.runtime.index.update(next);

    this.runtime.raw.onAfterMove?.(intent);
    this.emitMove(intent, 'after');
    this.notifyChanged('move', [next]);
    return true;
  }

  /**
   * Changes an event's bounds.
   *
   * Rejects an inverted or zero-length span outright, and anything shorter than
   * `resizable.minDuration`, before any hook runs - an event with `end <= start`
   * would be invisible to the index's half-open overlap query and would appear
   * to have vanished, which is far worse than a refused call.
   *
   * The resized `edge` reported to hooks is inferred: `'start'` when the start
   * moved, `'end'` otherwise. A call that moves both is reported as `'start'`,
   * since that is the edge whose movement a host is most likely to be guarding.
   *
   * @returns `false` when the id is unknown, the span is invalid, or
   *   `onBeforeResize` vetoed.
   */
  resizeEvent(id: string, start: number, end: number): boolean {
    const event = this.runtime.getEvent(id);
    if (!event) return false;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;

    const duration = end - start;
    if (duration <= 0) return false;
    if (duration < this.runtime.config.resize.minDuration) return false;

    const intent: SchedulerResizeIntent = {
      event,
      edge: start !== event.start ? 'start' : 'end',
      fromStart: event.start,
      fromEnd: event.end,
      toStart: start,
      toEnd: end,
      managed: true,
    };

    this.emitResize(intent, 'before');
    if (this.runtime.raw.onBeforeResize?.(intent) === false) return false;

    const next: SchedulerEvent = { ...event, start, end, version: (event.version ?? 0) + 1 };
    this.runtime.index.update(next);

    this.runtime.raw.onAfterResize?.(intent);
    this.emitResize(intent, 'after');
    this.notifyChanged('resize', [next]);
    return true;
  }

  /** Resolves one event by id, or `undefined`. O(1). */
  getEvent(id: string): SchedulerEvent | undefined {
    return this.runtime.getEvent(id);
  }

  /**
   * Every loaded event.
   *
   * Returned `readonly` and **by reference** - copying is not a safety measure
   * here, it is a per-call allocation proportional to the dataset, and a host
   * calling this in a change handler on half a million events would allocate
   * megabytes per frame. Mutating the array or its events corrupts the index.
   */
  getEvents(): readonly SchedulerEvent[] {
    return this.runtime.allEvents();
  }

  /**
   * Events overlapping `range`, half-open on both sides.
   *
   * With `resourceId` this goes through the index and costs O(log n + k) - the
   * query the whole data structure exists for. Without one it is a linear scan,
   * because the index is partitioned by resource and a cross-resource range
   * query has no better path through it; that asymmetry is deliberate (see
   * `EventIndex`) and callers on the render path should always pass a resource.
   *
   * "Overlapping" follows the model's half-open convention: an event ending
   * exactly at `range.start` is excluded, and one starting exactly at
   * `range.end` is too.
   */
  getEventsInRange(range: TimeRange, resourceId?: string): readonly SchedulerEvent[] {
    const result: SchedulerEvent[] = [];

    if (resourceId !== undefined) {
      const handles: number[] = [];
      this.runtime.index.query(resourceId, range.start, range.end, handles);
      for (const handle of handles) {
        const event = this.runtime.index.get(handle);
        if (event) result.push(event);
      }
      return result;
    }

    for (const event of this.runtime.allEvents()) {
      if (event.start < range.end && event.end > range.start) result.push(event);
    }
    return result;
  }

  /**
   * Replaces the entire event set.
   *
   * Rebuilds the index in one O(n log n) pass rather than n inserts, so this is
   * the right call for a datasource response and the wrong one for a delta.
   *
   * Selection is cleared, not filtered: after a wholesale replacement the
   * surviving ids are a coincidence of the new payload, and silently keeping
   * some of a user's selection is more surprising than keeping none.
   *
   * The `onBefore*` hooks are **not** consulted - they veto individual actions,
   * and running them n times over a bulk load would turn a data refresh into an
   * n-call host callback storm.
   */
  setEvents(events: readonly SchedulerEvent[]): void {
    this.runtime.index.load(events);
    this.hooks.selection.clear();
    this.notifyChanged('replace', []);
  }

  // -- Selection ------------------------------------------------------------

  /**
   * Selects one event.
   *
   * Delegated to the selection service rather than implemented here, so
   * programmatic and pointer selection share one path - including the
   * single/multiple mode check and the `selectionChanged` emit, which is why
   * this method does not fire that event itself.
   *
   * @param additive - When `true`, adds to the current selection instead of
   *   replacing it, mirroring a Ctrl-click. Ignored in `'single'` mode.
   */
  selectEvent(id: string, additive = false): void {
    this.hooks.selection.select([id], additive);
  }

  /**
   * Replaces the selection with `ids`.
   *
   * Always replacing - there is no additive form - because a caller that wants
   * to extend can concatenate, whereas a caller that wants to replace cannot
   * un-extend without first clearing, which would emit twice.
   */
  selectEvents(ids: readonly string[]): void {
    this.hooks.selection.select(ids, false);
  }

  /**
   * The selected events, resolved.
   *
   * Ids whose events have since been removed are not reported, so the result can
   * be shorter than the selected id set during a transaction.
   */
  getSelectedEvents(): readonly SchedulerEvent[] {
    return this.hooks.selection.getSelected();
  }

  /** Clears the selection. A no-op emitting nothing when it is already empty. */
  clearSelection(): void {
    this.hooks.selection.clear();
  }

  // -- View and timeline ----------------------------------------------------

  /**
   * Switches to a named view preset, keeping the current range and slot width.
   *
   * Keeping the range is what makes view switching feel like a zoom rather than
   * a navigation: a user looking at March who picks `'week'` expects to still be
   * looking at March, not to be thrown to the current week.
   *
   * Emits `viewChanged` in addition to the `timelineChanged` every rebuild
   * emits, so a host can persist the preset name without having to infer that a
   * rebuild was a view switch.
   */
  setView(view: TimelineViewName): void {
    this.view = view;
    const timeline = this.rebuild();
    this.runtime.emit(SchedulerEventName.ViewChanged, this.viewPayload(timeline));
  }

  /**
   * Changes the span the timeline covers, keeping the view.
   *
   * The range is snapped outward to whole slots by the timeline builder, so a
   * range starting mid-day still produces aligned slots - passing exact
   * boundaries is not required.
   */
  setRange(range: TimeRange): void {
    this.range = range;
    this.rebuild();
  }

  /**
   * Overrides the timeline config directly, for views the presets do not cover.
   *
   * Merged over the current config, so `{ step: 15 }` changes only the step.
   * Supplying `unit`, `step` or `headerBands` clears the active preset: the
   * timeline is no longer the thing the preset describes, and continuing to
   * report a view name would make {@link getTimeline} and a persisted view
   * disagree.
   */
  setTimelineConfig(partial: Partial<TimelineConfig>): void {
    if (partial.range) this.range = partial.range;
    if (partial.slotWidth !== undefined) this.slotWidth = partial.slotWidth;

    const supersedesPreset =
      partial.unit !== undefined || partial.step !== undefined || partial.headerBands !== undefined;
    if (supersedesPreset) this.view = null;

    this.rebuild(partial);
  }

  /**
   * The time span currently on screen.
   *
   * Derived from live scroll geometry, not from the timeline's configured range
   * - that is what {@link getTimeline}`().config.range` reports. This is the
   * range a host needs to lazy-load data for, or to label a "showing 3-9 March"
   * caption, and it changes on every scroll without the timeline changing at all.
   *
   * Clamped to the axis, so an over-scrolled or rubber-banded viewport never
   * reports times outside the timeline.
   */
  getVisibleRange(): TimeRange {
    const { axis } = this.runtime.timeline;
    const { scrollLeft, viewportWidth } = this.runtime.ctx.getScrollMetrics();

    const start = axis.timeAt(scrollLeft);
    const end = axis.timeAt(scrollLeft + viewportWidth);

    return {
      start: start < axis.startMs ? axis.startMs : start,
      end: end > axis.endMs ? axis.endMs : end,
    };
  }

  /**
   * The current timeline: axis, header bands and the config that produced them.
   *
   * Immutable, so holding the reference is safe - and comparing it by identity
   * is the supported way to ask "did the timeline change?", which is exactly how
   * the renderer skips work on a pure scroll.
   */
  getTimeline(): Timeline {
    return this.runtime.timeline;
  }

  /**
   * Widens slots by 25%, clamped to {@link MAX_SLOT_WIDTH}.
   *
   * The time under the centre of the viewport is held fixed across the rebuild.
   * Anchoring on the centre rather than the left edge is what makes repeated
   * zooming feel like a magnifier over the thing being examined; anchoring left
   * would walk whatever the user was looking at off the right of the screen.
   *
   * A no-op at the clamp, emitting nothing.
   */
  zoomIn(): void {
    this.zoomBy(ZOOM_IN_FACTOR);
  }

  /** Narrows slots by 20%, clamped to {@link MIN_SLOT_WIDTH}. See {@link zoomIn}. */
  zoomOut(): void {
    this.zoomBy(ZOOM_OUT_FACTOR);
  }

  // -- Navigation -----------------------------------------------------------

  /**
   * Scrolls horizontally so `t` is at the left edge of the viewport.
   *
   * Projected through the axis, so this is correct in both slot-width modes and
   * across DST and uneven months - which arithmetic on the range would not be.
   * Times outside the timeline project outside it too and are clamped by the
   * scroll container, not here.
   */
  scrollToDate(t: number): void {
    this.hooks.scrollToPx(this.runtime.timeline.axis.pxAt(t));
  }

  /**
   * Scrolls vertically to a resource's row.
   *
   * A no-op when the resource is filtered out or collapsed under a group: it has
   * no displayed row to scroll to, and forcing one into view would mean undoing
   * the user's own filter.
   */
  scrollToResource(id: string): void {
    this.hooks.scrollToRowByResourceId(id);
  }

  /**
   * Scrolls to the current time.
   *
   * Reads the clock at call time rather than caching a "now", so a page left
   * open overnight still lands on today.
   */
  scrollToNow(): void {
    this.scrollToDate(Date.now());
  }

  // -- Refresh --------------------------------------------------------------

  /**
   * Rebuilds the timeline and repaints everything.
   *
   * The blunt instrument, for a host that changed something the scheduler has no
   * way to observe - a theme swap, a locale change, a container resize the
   * observer missed. Prefer {@link refreshEvents} or {@link refreshTimeline}: a
   * full rebuild reallocates the axis and header cells, which the other two do
   * not.
   */
  refresh(): void {
    this.rebuild();
  }

  /**
   * Repaints bars from the current index, without rebuilding the timeline.
   *
   * For a host that mutated event objects in place - the one thing this API
   * cannot detect, because the index stores positions rather than watching
   * objects. Note that in-place edits to `start`, `end` or `resourceId` are
   * **not** picked up by this: those change an event's indexed position and must
   * go through {@link updateEvent}.
   */
  refreshEvents(): void {
    this.notifyChanged('refresh', []);
  }

  /**
   * Rebuilds the timeline from the current view, range and slot width.
   *
   * The case this exists for is a container resize in `'proportional'` mode,
   * where nothing about the config changed but the pixel projection must be
   * recomputed.
   */
  refreshTimeline(): void {
    this.rebuild();
  }

  // -- Internals ------------------------------------------------------------

  /**
   * Builds the next timeline, installs it, and announces it.
   *
   * The single funnel every view/range/zoom change passes through, so
   * "rebuilt but forgot to emit" and "emitted but forgot to re-render" are not
   * states this class can reach.
   */
  private rebuild(overrides: Partial<TimelineConfig> = {}): Timeline {
    const base = this.runtime.timeline.config;

    const next = this.view !== null
      // Only the mode/week-start carry over from the old config: forwarding
      // `headerBands` would override the preset's own bands with the previous
      // view's, which is precisely what switching view is meant to change.
      ? buildTimelineFromView(this.view, this.range, this.slotWidth, {
        slotWidthMode: base.slotWidthMode,
        weekStartsOn: base.weekStartsOn,
        ...overrides,
      })
      : buildTimeline({
        ...base,
        range: this.range,
        slotWidth: this.slotWidth,
        ...overrides,
      });

    this.hooks.setTimeline(next);
    this.runtime.requestRender();
    this.runtime.emit(SchedulerEventName.TimelineChanged, this.viewPayload(next));

    return next;
  }

  /**
   * Applies a zoom factor while holding the viewport's centre time fixed.
   *
   * The centre is sampled *before* the rebuild because the old axis is the only
   * thing that can convert the current scroll offset back into a time; once
   * `setTimeline` has run, that mapping is gone.
   */
  private zoomBy(factor: number): void {
    const next = clamp(this.slotWidth * factor, MIN_SLOT_WIDTH, MAX_SLOT_WIDTH);
    if (next === this.slotWidth) return;

    const { scrollLeft, viewportWidth } = this.runtime.ctx.getScrollMetrics();
    const centreMs = this.runtime.timeline.axis.timeAt(scrollLeft + viewportWidth / 2);

    this.slotWidth = next;
    const timeline = this.rebuild();

    this.hooks.scrollToPx(timeline.axis.pxAt(centreMs) - viewportWidth / 2);
  }

  /** Requests a frame and announces an event-collection change in one place. */
  private notifyChanged(
    reason: SchedulerEventsChangeReason,
    events: readonly SchedulerEvent[],
  ): void {
    this.runtime.requestRender();

    const payload: SchedulerEventsChangedPayload = {
      reason,
      events,
      total: this.runtime.index.size,
      source: 'api',
    };
    this.runtime.emit(SchedulerEventName.EventsChanged, payload);
  }

  private emitCreate(event: SchedulerEvent, phase: 'before' | 'after'): void {
    const payload: SchedulerCreatePayload = { event, phase, source: 'api' };
    this.runtime.emit(
      phase === 'before' ? SchedulerEventName.BeforeCreate : SchedulerEventName.AfterCreate,
      payload,
    );
  }

  private emitDelete(event: SchedulerEvent, phase: 'before' | 'after'): void {
    const payload: SchedulerDeletePayload = { event, phase, source: 'api' };
    this.runtime.emit(
      phase === 'before' ? SchedulerEventName.BeforeDelete : SchedulerEventName.AfterDelete,
      payload,
    );
  }

  private emitMove(intent: SchedulerMoveIntent, phase: 'before' | 'after'): void {
    const payload: SchedulerMovePayload = { ...intent, phase, source: 'api' };
    this.runtime.emit(
      phase === 'before' ? SchedulerEventName.BeforeMove : SchedulerEventName.AfterMove,
      payload,
    );
  }

  private emitResize(intent: SchedulerResizeIntent, phase: 'before' | 'after'): void {
    const payload: SchedulerResizePayload = { ...intent, phase, source: 'api' };
    this.runtime.emit(
      phase === 'before' ? SchedulerEventName.BeforeResize : SchedulerEventName.AfterResize,
      payload,
    );
  }

  /** The payload shared by `viewChanged` and `timelineChanged`. */
  private viewPayload(timeline: Timeline): SchedulerViewChangedPayload {
    return {
      view: this.view ?? undefined,
      range: this.range,
      timeline,
      slotWidth: this.slotWidth,
    };
  }
}

/** Constrains `value` to `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
