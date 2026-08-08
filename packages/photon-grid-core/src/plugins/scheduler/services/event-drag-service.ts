import type { BarPlacement } from '../layout/bar-layout';
import type { SchedulerEvent } from '../data/scheduler.types';
import type { SchedulerMoveIntent } from '../scheduler.config';
import type { SchedulerModule, SchedulerRuntime } from '../scheduler-runtime';
import { SchedulerEventName } from '../scheduler-runtime';
import type { SlotAxis } from '../time/slot-axis';
import { barEventId, closestBar, type BarSource } from './event-selection-service';

/**
 * Pixels the pointer must travel before a press becomes a drag.
 *
 * Matches `DRAG_THRESHOLD` in `drag-drop/drag-drop-engine.ts` on purpose: a user
 * who has learned how much slack a row drag allows should find the same slack on
 * an event bar. It is duplicated as a literal rather than imported because that
 * module keeps it private and importing it would drag the whole drag-drop engine
 * into the scheduler's module graph for one number.
 */
export const DRAG_THRESHOLD = 4;

/** Selector for the resize affordances, which this service must not react to. */
export const HANDLE_SELECTOR = '.pg-scheduler-bar__handle';

/** Class of the drag/resize ghost. Mirrors `theme/scheduler-styles.ts`. */
export const PREVIEW_CLASS = 'pg-scheduler-preview';

/** Modifier applied to the ghost when dropping would be rejected. */
export const PREVIEW_INVALID_CLASS = 'pg-scheduler-preview--invalid';

/**
 * Resolves the resource under a viewport Y coordinate.
 *
 * Passed in rather than computed here because row hit-testing needs the grid's
 * render window and its `rowOriginY` rebasing, both of which the plugin already
 * holds and neither of which belongs in an interaction service. Keeping it a
 * callback also means the service stays testable with a stub that returns a
 * fixed id, and never touches `elementFromPoint` -- which would hit the ghost
 * itself and force a style recalculation on every pointer move.
 *
 * @returns The resource id under the pointer, or `null` when the pointer is over
 *   a non-resource row (group header, detail row, summary) or outside the body.
 */
export type ResolveResourceAt = (clientY: number) => string | null;

/**
 * Whether an event's type forbids interaction.
 *
 * Resolved from config rather than from the bar's `--locked` class so a drag
 * cannot be started against an event whose bar is not currently rendered, and so
 * the answer does not depend on the renderer having painted yet. The per-type
 * value wins over the global default, matching how the renderer layers the two.
 */
export function isEventLocked(runtime: SchedulerRuntime, event: SchedulerEvent): boolean {
  const type = typeof event.type === 'string' ? runtime.config.eventTypes[event.type] : undefined;
  return type?.locked ?? runtime.config.eventDefaults.locked ?? false;
}

/**
 * Finds this frame's placement for a pool handle.
 *
 * A linear scan over the placements is deliberate: the array is capped at the
 * layout's `maxBars` (800 by default) and this runs once per gesture start, not
 * per pointer move. An id-to-placement map would have to be rebuilt every frame
 * to stay correct, which is a per-frame cost paid for a per-gesture lookup.
 */
export function placementOf(bars: BarSource, handle: number): BarPlacement | undefined {
  const placements = bars.getPlacements();
  for (let i = 0; i < placements.length; i++) {
    if (placements[i].handle === handle) return placements[i];
  }
  return undefined;
}

/**
 * Snaps a time to the boundary of the slot containing it.
 *
 * Goes through pixels (`pxAt` then `indexAt` then `timeOf`) rather than dividing
 * by a slot duration because slots are not equal in general -- months, quarters,
 * years and any day/week range crossing a DST transition all produce unequal
 * slots, and dividing would drift. The axis already owns that arithmetic in both
 * its uniform and prefix forms, so routing through it is correct for every view.
 */
export function snapTime(axis: SlotAxis, t: number): number {
  return axis.timeOf(axis.indexAt(axis.pxAt(t)));
}

/**
 * Creates the ghost element inside a layer.
 *
 * Uses the layer's own document so the scheduler works inside a popped-out
 * window or an iframe, where the global `document` is the wrong one.
 */
export function createPreview(layerEl: HTMLElement): HTMLElement {
  const doc = layerEl.ownerDocument;
  const el = doc.createElement('div');
  el.className = PREVIEW_CLASS;
  el.setAttribute('aria-hidden', 'true');
  layerEl.appendChild(el);
  return el;
}

/**
 * Positions the ghost.
 *
 * Only geometry is written here -- every colour, border and radius comes from the
 * `.pg-scheduler-preview` rule and therefore from theme tokens. `transform` is
 * used for the offset rather than `left`/`top` because it is composited: moving
 * the ghost 60 times a second then costs no layout, matching how the renderer
 * positions the bars themselves.
 */
export function positionPreview(
  el: HTMLElement,
  left: number,
  top: number,
  width: number,
  height: number,
  valid: boolean,
): void {
  el.style.transform = `translate(${left}px, ${top}px)`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.classList.toggle(PREVIEW_INVALID_CLASS, !valid);
}

/** State of an in-flight move gesture. Exists only between pointerdown and pointerup. */
interface DragSession {
  readonly event: SchedulerEvent;
  /** Pool handle, for suppression and overlap queries. */
  readonly handle: number;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  /** Pixel offset of the event's start on the axis, the origin every delta is measured from. */
  readonly originPx: number;
  /** Ghost's vertical origin, in the layer's rebased row space. */
  readonly originTop: number;
  readonly height: number;
  /** Preserved across the move; a drag never changes duration. */
  readonly durationMs: number;
  /** `false` until the pointer clears {@link DRAG_THRESHOLD}. */
  started: boolean;
  toResourceId: string;
  toStart: number;
  toEnd: number;
  /** `false` when overlap validation rejects the current position. */
  valid: boolean;
}

/**
 * Pointer-driven moving of event bars.
 *
 * ## Why the index is suppressed instead of updated during the drag
 *
 * The obvious implementation mutates the event on every pointer move and lets
 * the renderer follow. That re-sorts the resource's columns up to sixty times a
 * second, invalidates the lane layout on every frame, and leaves the model in a
 * state the user has not committed to -- so an abort has to be undone. Instead
 * the dragged event is hidden from queries with
 * {@link EventIndex.suppress}, a single ghost element tracks the pointer, and
 * the index is written exactly once on drop. Cancelling is then free: drop the
 * ghost and clear the suppression.
 *
 * ## Why the time delta is not a simple scale of the pixel delta
 *
 * On a prefix axis, milliseconds-per-pixel varies from slot to slot (February is
 * not January), so `dx * msPerPx` drifts. Asking the axis for the time at the
 * origin and at the origin plus `dx` gives the correct delta on every axis type,
 * which is why the origin pixel is captured at gesture start.
 */
export class EventDragService implements SchedulerModule {
  private readonly abort = new AbortController();
  private readonly bars: BarSource;
  private readonly layerEl: HTMLElement;
  private readonly resolveResourceAt: ResolveResourceAt;

  private session: DragSession | null = null;
  private preview: HTMLElement | null = null;

  /** Reused between overlap checks so a pointer move allocates nothing. */
  private readonly overlapScratch: number[] = [];

  /**
   * @param runtime - Shared scheduler state; the index is written on drop.
   * @param layerEl - Layer holding the bars. Pointer listeners are delegated
   *   here, and the ghost is appended here so it shares the layer's scroll and
   *   row-origin transforms.
   * @param bars - Renderer accessor, used to read the dragged bar's committed
   *   geometry so the ghost starts exactly on top of it.
   * @param resolveResourceAt - Row hit-test owned by the plugin. See
   *   {@link ResolveResourceAt}.
   */
  constructor(
    private readonly runtime: SchedulerRuntime,
    layerEl: HTMLElement,
    bars: BarSource,
    resolveResourceAt: ResolveResourceAt,
  ) {
    this.layerEl = layerEl;
    this.bars = bars;
    this.resolveResourceAt = resolveResourceAt;

    const { signal } = this.abort;
    layerEl.addEventListener('pointerdown', this.onPointerDown, { signal });
    layerEl.addEventListener('pointermove', this.onPointerMove, { signal });
    layerEl.addEventListener('pointerup', this.onPointerUp, { signal });
    layerEl.addEventListener('pointercancel', this.onPointerCancel, { signal });

    // Escape must work regardless of what holds focus mid-drag, so the key
    // listener goes on the document when there is one. The layer is the
    // fallback for environments (and tests) without an owner document.
    const keyTarget: EventTarget = layerEl.ownerDocument ?? layerEl;
    keyTarget.addEventListener('keydown', this.onKeyDown as EventListener, { signal });
  }

  /** Whether a move gesture has passed the threshold and is currently previewing. */
  isDragging(): boolean {
    return this.session !== null && this.session.started;
  }

  /**
   * Aborts any in-flight drag and removes every listener.
   *
   * Cancelling first matters: a destroy mid-drag would otherwise leave the
   * dragged event suppressed and therefore invisible for the rest of the grid's
   * life.
   */
  destroy(): void {
    this.cancel();
    this.abort.abort();
  }

  // -- Pointer lifecycle -----------------------------------------------------

  /**
   * Arms a potential drag.
   *
   * Nothing is suppressed and no ghost exists yet -- this only records the
   * origin, so a press that turns out to be a click costs one object and no DOM
   * work at all.
   */
  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.session !== null) return;
    if (!this.runtime.config.drag.enabled) return;
    // Primary button only: a right-click opens a context menu and a middle
    // click is an auto-scroll gesture in most browsers.
    if (e.button !== 0) return;

    const target = e.target as Element | null;
    // Resize owns the handles. Checking here rather than relying on event order
    // keeps the two services independent of which one was constructed first.
    if (target !== null && typeof target.closest === 'function' && target.closest(HANDLE_SELECTOR) !== null) {
      return;
    }

    const barEl = closestBar(e.target);
    if (barEl === null) return;

    const id = barEventId(barEl);
    if (id === null) return;

    const event = this.runtime.getEvent(id);
    if (event === undefined || isEventLocked(this.runtime, event)) return;

    const handle = this.runtime.index.handleOf(id);
    if (handle < 0) return;

    // Geometry comes from the layout rather than the DOM: `getBoundingClientRect`
    // would force a synchronous layout at the start of every gesture, and the
    // placement is already the exact box the renderer committed.
    const placement = placementOf(this.bars, handle);
    if (placement === undefined) return;

    this.session = {
      event,
      handle,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originPx: this.runtime.timeline.axis.pxAt(event.start),
      originTop: placement.top,
      height: placement.height,
      durationMs: event.end - event.start,
      started: false,
      toResourceId: event.resourceId,
      toStart: event.start,
      toEnd: event.end,
      valid: true,
    };
  };

  /** Promotes the press to a drag once it clears the threshold, then tracks the pointer. */
  private readonly onPointerMove = (e: PointerEvent): void => {
    const session = this.session;
    if (session === null || e.pointerId !== session.pointerId) return;

    if (!session.started) {
      const dx = Math.abs(e.clientX - session.startX);
      const dy = Math.abs(e.clientY - session.startY);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
      this.begin(session, e);
    }

    this.track(session, e);
  };

  /** Commits the move, or does nothing if the press never became a drag. */
  private readonly onPointerUp = (e: PointerEvent): void => {
    const session = this.session;
    if (session === null || e.pointerId !== session.pointerId) return;

    if (!session.started) {
      // A plain click. The selection service handles it from its own listener.
      this.session = null;
      return;
    }

    this.commit(session);
    this.finish(session);
  };

  /** A cancelled pointer (browser gesture, lost capture) aborts rather than commits. */
  private readonly onPointerCancel = (e: PointerEvent): void => {
    if (this.session === null || e.pointerId !== this.session.pointerId) return;
    this.cancel();
  };

  /** Escape aborts the drag, leaving the event exactly where it was. */
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.session === null || e.key !== 'Escape') return;
    e.preventDefault();
    this.cancel();
  };

  // -- Internals -------------------------------------------------------------

  /**
   * Starts previewing: hides the original, creates the ghost, captures the
   * pointer.
   *
   * Pointer capture is taken here rather than at pointerdown so a simple click
   * keeps its normal event target -- capturing early would retarget the
   * subsequent `click` at the layer and break selection.
   */
  private begin(session: DragSession, e: PointerEvent): void {
    session.started = true;

    this.runtime.index.suppress([session.handle]);
    this.preview = createPreview(this.layerEl);

    if (typeof this.layerEl.setPointerCapture === 'function') {
      // Capture can throw if the pointer has already been released between the
      // move event and this call; losing capture only degrades tracking outside
      // the layer, so it is not worth failing the gesture over.
      try {
        this.layerEl.setPointerCapture(e.pointerId);
      } catch {
        /* not capturable -- fall back to layer-relative tracking */
      }
    }

    this.runtime.requestRender();
  }

  /** Recomputes the proposed position from the pointer and repaints the ghost. */
  private track(session: DragSession, e: PointerEvent): void {
    const axis = this.runtime.timeline.axis;
    const drag = this.runtime.config.drag;

    const dx = e.clientX - session.startX;
    const deltaMs = axis.timeAt(session.originPx + dx) - axis.timeAt(session.originPx);

    let toStart = session.event.start + deltaMs;
    if (drag.snap) toStart = snapTime(axis, toStart);
    const toEnd = toStart + session.durationMs;

    const toResourceId = drag.crossResource
      ? (this.resolveResourceAt(e.clientY) ?? session.event.resourceId)
      : session.event.resourceId;

    session.toStart = toStart;
    session.toEnd = toEnd;
    session.toResourceId = toResourceId;
    session.valid = this.isDropAllowed(session);

    const left = axis.pxAt(toStart);
    // Width is recomputed rather than carried over: on a prefix axis the same
    // duration occupies a different number of pixels in a different month.
    const width = Math.max(1, axis.pxAt(toEnd) - left);
    // The ghost follows the pointer vertically instead of snapping to the target
    // row band. Snapping would need row geometry, which is deliberately not part
    // of the `resolveResourceAt` contract -- the plugin answers "which resource",
    // not "where is it", so this service never depends on row layout.
    const top = drag.crossResource ? session.originTop + (e.clientY - session.startY) : session.originTop;

    if (this.preview !== null) {
      positionPreview(this.preview, left, top, width, session.height, session.valid);
    }
  }

  /**
   * Overlap validation for the proposed position.
   *
   * The dragged event is already suppressed from the index, so it cannot match
   * itself and no exclusion filter is needed -- which is a second reason
   * suppression is the right mechanism rather than a convenience.
   */
  private isDropAllowed(session: DragSession): boolean {
    if (!this.runtime.config.drag.preventOverlap) return true;

    const hits = this.overlapScratch;
    hits.length = 0;
    this.runtime.index.query(session.toResourceId, session.toStart, session.toEnd, hits);
    return hits.length === 0;
  }

  /**
   * Applies the move, subject to the host's veto.
   *
   * The order -- emit `beforeMove`, run the veto, mutate, emit `afterMove` -- is
   * fixed so a listener on the bus sees the same sequence a hook does. When
   * `managed` is `false` nothing is mutated and `afterMove` is a *request*: the
   * host persists it and pushes new data back, exactly like the grid's unmanaged
   * row drag.
   */
  private commit(session: DragSession): void {
    const event = session.event;
    const unchanged = session.toStart === event.start && session.toResourceId === event.resourceId;
    if (unchanged || !session.valid) return;

    const intent: SchedulerMoveIntent = {
      event,
      fromResourceId: event.resourceId,
      toResourceId: session.toResourceId,
      fromStart: event.start,
      toStart: session.toStart,
      toEnd: session.toEnd,
      managed: this.runtime.config.drag.managed,
    };

    this.runtime.emit(SchedulerEventName.BeforeMove, intent);
    if (this.runtime.raw.onBeforeMove?.(intent) === false) return;

    if (intent.managed) {
      // `version` is bumped so the renderer's per-bar change detection repaints
      // this event; without it a bar whose geometry changed could be skipped as
      // untouched.
      this.runtime.index.update({
        ...event,
        resourceId: intent.toResourceId,
        start: intent.toStart,
        end: intent.toEnd,
        version: (event.version ?? 0) + 1,
      });
    }

    this.runtime.emit(SchedulerEventName.AfterMove, intent);
    this.runtime.raw.onAfterMove?.(intent);
  }

  /** Aborts an in-flight gesture without committing anything. */
  private cancel(): void {
    const session = this.session;
    if (session === null) return;
    this.finish(session);
  }

  /**
   * Tears the gesture down.
   *
   * Suppression is cleared unconditionally -- including on the veto and cancel
   * paths -- because an event left suppressed is invisible with no way for the
   * user to recover it.
   */
  private finish(session: DragSession): void {
    if (session.started) {
      this.runtime.index.suppress([]);

      this.preview?.remove();
      this.preview = null;

      if (typeof this.layerEl.releasePointerCapture === 'function') {
        try {
          this.layerEl.releasePointerCapture(session.pointerId);
        } catch {
          /* already released with the pointer */
        }
      }

      this.runtime.requestRender();
    }

    this.session = null;
  }
}
