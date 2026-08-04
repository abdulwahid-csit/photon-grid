import type { SchedulerEvent } from '../data/scheduler.types';
import type { SchedulerResizeIntent } from '../scheduler.config';
import type { SchedulerModule, SchedulerRuntime } from '../scheduler-runtime';
import { SchedulerEventName } from '../scheduler-runtime';
import type { SlotAxis } from '../time/slot-axis';
import { barEventId, closestBar, type BarSource } from './event-selection-service';
import {
  createPreview,
  DRAG_THRESHOLD,
  HANDLE_SELECTOR,
  isEventLocked,
  placementOf,
  positionPreview,
  snapTime,
} from './event-drag-service';

/** Which end of a bar a gesture is dragging. */
export type ResizeEdge = 'start' | 'end';

/** Class marking the leading handle. Mirrors `theme/scheduler-styles.ts`. */
export const HANDLE_START_CLASS = 'pg-scheduler-bar__handle--start';

/**
 * Duration of one slot on an axis, used as the fallback minimum resize.
 *
 * Slot 0 is sampled rather than averaged: on a prefix axis slots genuinely
 * differ (28 to 31 days), so no single number is *the* slot duration, and the
 * first slot is both cheap to read and representative of the view's
 * granularity. Degenerate single-slot axes fall back to the whole span, and the
 * result is floored at 1 ms so a caller can never derive a zero-length minimum.
 */
export function slotDurationOf(axis: SlotAxis): number {
  const span = axis.count >= 2 ? axis.timeOf(1) - axis.timeOf(0) : axis.endMs - axis.startMs;
  return Math.max(1, span);
}

/** State of an in-flight resize. Exists only between pointerdown and pointerup. */
interface ResizeSession {
  readonly event: SchedulerEvent;
  readonly handle: number;
  readonly pointerId: number;
  readonly edge: ResizeEdge;
  readonly startX: number;
  readonly startY: number;
  /** Pixel offset of the edge being dragged, the origin every delta is measured from. */
  readonly originPx: number;
  /** Ghost geometry, taken from the frame the gesture started on. */
  readonly top: number;
  readonly height: number;
  /** `false` until the pointer clears {@link DRAG_THRESHOLD}. */
  started: boolean;
  toStart: number;
  toEnd: number;
}

/**
 * Pointer-driven resizing of event bars from either edge.
 *
 * Shares its mechanics with {@link EventDragService} by importing them rather
 * than restating them -- the threshold, the snap projection, the ghost and the
 * suppress-then-commit-once model are identical, and the only real differences
 * are that a resize is anchored to one edge, never changes resource, and must
 * respect a minimum duration.
 *
 * ## Why the minimum duration is enforced after snapping
 *
 * Snapping can pull an edge past its opposite -- dragging the start handle right
 * across a short event lands it beyond the end, producing a negative duration
 * that would corrupt the index's sort invariants. Clamping after the snap means
 * the edge stops at the last legal position instead, so the worst outcome is a
 * bar that refuses to shrink further rather than one that inverts.
 */
export class EventResizeService implements SchedulerModule {
  private readonly abort = new AbortController();
  private readonly bars: BarSource;
  private readonly layerEl: HTMLElement;

  private session: ResizeSession | null = null;
  private preview: HTMLElement | null = null;

  /**
   * @param runtime - Shared scheduler state; the index is written on drop.
   * @param layerEl - Layer holding the bars. Listeners are delegated here and
   *   the ghost is appended here so it inherits the layer's transforms.
   * @param bars - Renderer accessor, used to read the committed geometry of the
   *   bar being resized so the ghost starts aligned with it.
   */
  constructor(
    private readonly runtime: SchedulerRuntime,
    layerEl: HTMLElement,
    bars: BarSource,
  ) {
    this.layerEl = layerEl;
    this.bars = bars;

    const { signal } = this.abort;
    layerEl.addEventListener('pointerdown', this.onPointerDown, { signal });
    layerEl.addEventListener('pointermove', this.onPointerMove, { signal });
    layerEl.addEventListener('pointerup', this.onPointerUp, { signal });
    layerEl.addEventListener('pointercancel', this.onPointerCancel, { signal });

    const keyTarget: EventTarget = layerEl.ownerDocument ?? layerEl;
    keyTarget.addEventListener('keydown', this.onKeyDown as EventListener, { signal });
  }

  /** Whether a resize gesture has passed the threshold and is currently previewing. */
  isResizing(): boolean {
    return this.session !== null && this.session.started;
  }

  /**
   * Aborts any in-flight resize and removes every listener.
   *
   * As with the drag service, cancelling first is what stops a destroy during a
   * gesture from leaving the resized event permanently suppressed.
   */
  destroy(): void {
    this.cancel();
    this.abort.abort();
  }

  // -- Pointer lifecycle -----------------------------------------------------

  /** Arms a potential resize when the press lands on a handle. */
  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.session !== null) return;
    if (!this.runtime.config.resize.enabled) return;
    if (e.button !== 0) return;

    const target = e.target as Element | null;
    if (target === null || typeof target.closest !== 'function') return;

    const handleEl = target.closest(HANDLE_SELECTOR) as HTMLElement | null;
    if (handleEl === null) return;

    const barEl = closestBar(handleEl);
    if (barEl === null) return;

    const id = barEventId(barEl);
    if (id === null) return;

    const event = this.runtime.getEvent(id);
    if (event === undefined || isEventLocked(this.runtime, event)) return;

    const poolHandle = this.runtime.index.handleOf(id);
    if (poolHandle < 0) return;

    const placement = placementOf(this.bars, poolHandle);
    if (placement === undefined) return;

    const edge: ResizeEdge = handleEl.classList.contains(HANDLE_START_CLASS) ? 'start' : 'end';

    this.session = {
      event,
      handle: poolHandle,
      pointerId: e.pointerId,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      originPx: this.runtime.timeline.axis.pxAt(edge === 'start' ? event.start : event.end),
      top: placement.top,
      height: placement.height,
      started: false,
      toStart: event.start,
      toEnd: event.end,
    };

    // Keeps the press away from the grid beneath the layer, whose scroll
    // controller would otherwise read a horizontal drag on a handle as a pan.
    // The drag service is unaffected -- it listens on this same element and
    // ignores handles by selector, which is why that guard exists there.
    e.stopPropagation();
  };

  /** Promotes the press to a resize once it clears the threshold, then tracks the pointer. */
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

  /** Commits the resize, or does nothing if the press never became a gesture. */
  private readonly onPointerUp = (e: PointerEvent): void => {
    const session = this.session;
    if (session === null || e.pointerId !== session.pointerId) return;

    if (!session.started) {
      this.session = null;
      return;
    }

    this.commit(session);
    this.finish(session);
  };

  private readonly onPointerCancel = (e: PointerEvent): void => {
    if (this.session === null || e.pointerId !== this.session.pointerId) return;
    this.cancel();
  };

  /** Escape aborts, restoring the original start and end. */
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.session === null || e.key !== 'Escape') return;
    e.preventDefault();
    this.cancel();
  };

  // -- Internals -------------------------------------------------------------

  /** Hides the original, creates the ghost and captures the pointer. */
  private begin(session: ResizeSession, e: PointerEvent): void {
    session.started = true;

    this.runtime.index.suppress([session.handle]);
    this.preview = createPreview(this.layerEl);

    if (typeof this.layerEl.setPointerCapture === 'function') {
      try {
        this.layerEl.setPointerCapture(e.pointerId);
      } catch {
        /* not capturable -- fall back to layer-relative tracking */
      }
    }

    this.runtime.requestRender();
  }

  /** Recomputes the dragged edge from the pointer and repaints the ghost. */
  private track(session: ResizeSession, e: PointerEvent): void {
    const axis = this.runtime.timeline.axis;
    const resize = this.runtime.config.resize;
    const minDuration = this.minDuration();

    const dx = e.clientX - session.startX;
    // Same origin-relative projection as the move gesture: on an axis with
    // unequal slots a scaled pixel delta would drift.
    const deltaMs = axis.timeAt(session.originPx + dx) - axis.timeAt(session.originPx);

    if (session.edge === 'start') {
      let start = session.event.start + deltaMs;
      if (resize.snap) start = snapTime(axis, start);
      session.toStart = Math.min(start, session.event.end - minDuration);
      session.toEnd = session.event.end;
    } else {
      let end = session.event.end + deltaMs;
      if (resize.snap) end = snapTime(axis, end);
      session.toEnd = Math.max(end, session.event.start + minDuration);
      session.toStart = session.event.start;
    }

    const left = axis.pxAt(session.toStart);
    const width = Math.max(1, axis.pxAt(session.toEnd) - left);

    if (this.preview !== null) {
      // A resize has no rejection state of its own -- the minimum duration is a
      // clamp, not a veto -- so the ghost is always drawn valid.
      positionPreview(this.preview, left, session.top, width, session.height, true);
    }
  }

  /**
   * The smallest duration a resize may produce.
   *
   * A configured `0` means "unset" rather than "no minimum", because a genuine
   * zero would let a bar collapse to a zero-width sliver the user can no longer
   * grab -- unrecoverable through the UI. It therefore resolves to one slot,
   * read live so the floor tracks a view change.
   */
  private minDuration(): number {
    const configured = this.runtime.config.resize.minDuration;
    return configured > 0 ? configured : slotDurationOf(this.runtime.timeline.axis);
  }

  /**
   * Applies the resize, subject to the host's veto.
   *
   * Mirrors the move commit exactly -- emit, veto, mutate, emit -- so the two
   * gestures are indistinguishable to a listener that only cares about ordering.
   */
  private commit(session: ResizeSession): void {
    const event = session.event;
    if (session.toStart === event.start && session.toEnd === event.end) return;

    const intent: SchedulerResizeIntent = {
      event,
      edge: session.edge,
      fromStart: event.start,
      fromEnd: event.end,
      toStart: session.toStart,
      toEnd: session.toEnd,
      managed: this.runtime.config.resize.managed,
    };

    this.runtime.emit(SchedulerEventName.BeforeResize, intent);
    if (this.runtime.raw.onBeforeResize?.(intent) === false) return;

    if (intent.managed) {
      this.runtime.index.update({
        ...event,
        start: intent.toStart,
        end: intent.toEnd,
        version: (event.version ?? 0) + 1,
      });
    }

    this.runtime.emit(SchedulerEventName.AfterResize, intent);
    this.runtime.raw.onAfterResize?.(intent);
  }

  /** Aborts an in-flight gesture without committing anything. */
  private cancel(): void {
    const session = this.session;
    if (session === null) return;
    this.finish(session);
  }

  /** Tears the gesture down, always clearing suppression. See the drag service's note. */
  private finish(session: ResizeSession): void {
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
