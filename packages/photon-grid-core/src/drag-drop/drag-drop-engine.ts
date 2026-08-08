import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import { DragPreview, DragPreviewOptions } from './drag-preview';
import { DragAutoscroll } from './drag-autoscroll';
import { DragFrameScheduler } from './drag-frame-scheduler';
import { DragRectCache, NO_SLOT } from './drag-rect-cache';

/** Kinds of item a drag can carry. */
export type DragType = 'row' | 'column' | 'group';

/** Where a drop lands relative to the target it was released over. */
export type DropPosition = 'before' | 'after' | 'inside';

/** The payload of an in-flight drag. */
export interface DragItem {
  type: DragType;
  id: string;
  data: unknown;
  sourceIndex: number;
}

/** A registered region that can receive a drop. */
export interface DropTarget {
  el: HTMLElement;
  type: DragType;
  id: string;
  index: number;
  acceptsTypes: DragType[];
  onDragEnter?: (item: DragItem) => void;
  onDragLeave?: (item: DragItem) => void;
  onDrop?: (item: DragItem, position: DropPosition) => void;
}

/** Mutable state of the gesture currently in progress. */
export interface DragSession {
  item: DragItem;
  sourceEl: HTMLElement;
  currentTarget: DropTarget | null;
  position: DropPosition | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  startTime: number;
}

/** Movement (px) before a press is promoted to a drag. */
const DRAG_THRESHOLD = 4;

/** Class marking an element as draggable; the cursor affordance is themed, not inline. */
const DRAGGABLE_CLASS = 'pg-draggable';

/** Fraction of a target's height that counts as its leading / trailing edge. */
const EDGE_RATIO = 0.25;

/**
 * Generic pointer-driven drag-and-drop coordinator.
 *
 * ### Performance model
 *
 * The gesture is split into a **sampling** path and a **frame** path. Every
 * `pointermove` does nothing but hand two numbers to a
 * {@link DragFrameScheduler}; all hit-testing, class toggling, and event
 * emission happens once per animation frame with the newest sample. On a
 * 1000 Hz pointer against a 60 Hz display that is a ~16× reduction in work,
 * and it removes the write→read layout thrash that a per-event handler
 * necessarily creates.
 *
 * Drop-target geometry is captured once into a {@link DragRectCache} at drag
 * start and re-read only when something actually moves it — a scroll step, a
 * window resize. The previous implementation called `getBoundingClientRect()`
 * once per registered target *per pointer event*, forcing a full layout flush
 * for each.
 *
 * `DRAG_OVER` is emitted only when the resolved target or position changes, so a
 * pointer travelling across one wide target no longer allocates a payload and
 * fans out to listeners on every frame.
 *
 * @example
 * ```ts
 * const engine = new DragDropEngine(eventBus);
 *
 * const releaseTarget = engine.registerDropTarget({
 *   el: rowEl, type: 'row', id: 'r1', index: 0, acceptsTypes: ['row'],
 *   onDrop: (item, position) => reorder(item.id, 'r1', position),
 * });
 *
 * const releaseHandle = engine.makeDraggable(
 *   handleEl,
 *   { type: 'row', id: 'r1', data: row, sourceIndex: 0 },
 *   viewportEl,
 *   { label: row.name },
 * );
 * ```
 */
export class DragDropEngine {
  private readonly dropTargets = new Map<string, DropTarget>();
  private readonly preview = new DragPreview();
  private readonly autoscroll = new DragAutoscroll();
  private readonly frames: DragFrameScheduler;
  private readonly rects = new DragRectCache();

  /**
   * Preview options per draggable element.
   *
   * Previously a single shared field, which meant the last element to call
   * {@link makeDraggable} silently dictated the chip for every other draggable.
   * A `WeakMap` keyed by the element keeps them independent and lets entries be
   * collected with the DOM node.
   */
  private readonly previewOptionsByEl = new WeakMap<HTMLElement, DragPreviewOptions>();

  /** Targets in the same order as {@link rects}, so a slot index maps back in O(1). */
  private candidates: DropTarget[] = [];

  private currentSession: DragSession | null = null;
  private readonly boundPointerMove: (e: PointerEvent) => void;
  private readonly boundPointerUp: (e: PointerEvent) => void;
  private readonly boundInvalidate: () => void;
  /** Element that captured the pointer, so capture can be released on any exit path. */
  private capturedEl: HTMLElement | null = null;
  private capturedPointerId = -1;

  constructor(private eventBus: EventBus) {
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.boundInvalidate = () => this.rects.invalidate();
    this.frames = new DragFrameScheduler((x, y) => this.applyFrame(x, y));
  }

  /**
   * Registers a region that can receive drops.
   *
   * @param target - The drop target. Its `id` is the map key, so re-registering
   *                 the same id replaces the previous entry.
   * @returns A disposer that unregisters the target.
   */
  registerDropTarget(target: DropTarget): () => void {
    this.dropTargets.set(target.id, target);
    return () => { this.dropTargets.delete(target.id); };
  }

  /**
   * Makes an element initiate drags for `item`.
   *
   * @param el              - The grab handle.
   * @param item            - Payload carried by the drag.
   * @param scrollContainer - Optional container to auto-scroll at its edges.
   * @param previewOpts     - Chip content for this element specifically.
   * @returns A disposer that detaches the listener and its DOM markers.
   */
  makeDraggable(
    el: HTMLElement,
    item: DragItem,
    scrollContainer?: HTMLElement,
    previewOpts?: DragPreviewOptions,
  ): () => void {
    if (previewOpts) this.previewOptionsByEl.set(el, previewOpts);

    const onPointerDown = (e: PointerEvent): void => {
      if (e.button !== 0) return;
      e.preventDefault();

      // A previous gesture that never saw its pointerup (element removed
      // mid-drag, for instance) must not leak listeners into this one.
      if (this.currentSession) this.cleanupDrag(true);

      this.currentSession = {
        item,
        sourceEl: el,
        currentTarget: null,
        position: null,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        isDragging: false,
        startTime: Date.now(),
      };

      if (scrollContainer) this.autoscroll.attach(scrollContainer);

      // Pointer capture keeps the gesture alive across iframes, disabled
      // regions, and elements that swallow pointer events, and guarantees the
      // pointerup arrives even if the cursor leaves the window.
      if (typeof el.setPointerCapture === 'function') {
        try {
          el.setPointerCapture(e.pointerId);
          this.capturedEl = el;
          this.capturedPointerId = e.pointerId;
        } catch {
          // Capture is an optimisation; document listeners below still work.
        }
      }

      // `passive` because the move handler never calls preventDefault — it only
      // records coordinates — which lets the browser skip its cancellation check.
      document.addEventListener('pointermove', this.boundPointerMove, { passive: true });
      document.addEventListener('pointerup', this.boundPointerUp);
      document.addEventListener('pointercancel', this.boundPointerUp);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.classList.add(DRAGGABLE_CLASS);
    el.setAttribute('data-draggable', item.type);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.classList.remove(DRAGGABLE_CLASS);
      el.removeAttribute('data-draggable');
      this.previewOptionsByEl.delete(el);
    };
  }

  /**
   * Binds the container auto-scrolled at its edges during a drag.
   *
   * @param el - The scrollable viewport.
   */
  setScrollContainer(el: HTMLElement): void {
    this.autoscroll.attach(el);
  }

  /**
   * Marks cached drop-target geometry stale.
   *
   * Call after anything that moves targets on screen but is not a scroll of the
   * registered container — a layout change, a panel resize. The engine already
   * invalidates on window `scroll` and `resize` while a drag is live.
   */
  invalidateGeometry(): void {
    this.rects.invalidate();
    this.autoscroll.invalidate();
  }

  /** Aborts the drag in progress, if any, without firing a drop. */
  cancelDrag(): void {
    if (this.currentSession) this.cleanupDrag(true);
  }

  /** Tears down all engine state and global listeners. */
  destroy(): void {
    this.cancelDrag();
    this.autoscroll.detach();
    this.frames.reset();
    this.rects.clear();
    this.dropTargets.clear();
    this.candidates.length = 0;
    this.detachGlobalListeners();
  }

  // ── Pointer path (per event — must stay O(1) and DOM-free) ─────────────────

  private onPointerMove(e: PointerEvent): void {
    if (!this.currentSession) return;
    this.frames.sample(e.clientX, e.clientY);
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.currentSession) return;

    // Apply any sample still queued so the drop resolves against the pointer's
    // final position rather than one up to a frame stale.
    this.frames.sample(e.clientX, e.clientY);
    this.frames.flushNow();

    const session = this.currentSession;

    if (session.isDragging && session.currentTarget && session.position) {
      session.currentTarget.onDrop?.(session.item, session.position);
      this.eventBus.emit(GridEventType.DRAG_STOPPED, {
        item: session.item,
        targetId: session.currentTarget.id,
        position: session.position,
        accepted: true,
      });
    } else {
      this.eventBus.emit(GridEventType.DRAG_STOPPED, {
        item: session.item,
        targetId: null,
        position: null,
        accepted: false,
      });
    }

    this.cleanupDrag(false);
  }

  // ── Frame path (at most once per painted frame) ────────────────────────────

  /**
   * The whole drag workload, run once per frame with the newest pointer sample.
   *
   * Ordering matters: all reads (hit tests) come off the cache, and all writes
   * (chip transform, class toggles) happen after them, so no write→read pair
   * inside this function can force a synchronous layout.
   */
  private applyFrame(x: number, y: number): void {
    const session = this.currentSession;
    if (!session) return;

    session.currentX = x;
    session.currentY = y;

    if (!session.isDragging) {
      const dx = Math.abs(x - session.startX);
      const dy = Math.abs(y - session.startY);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
      this.beginDrag(session);
    }

    this.preview.moveTo(x, y);
    this.autoscroll.onMouseMove(x, y);

    const hitSlot = this.findDropSlot(x, y, session.item);
    const hitTarget = hitSlot === NO_SLOT ? null : (this.candidates[hitSlot] ?? null);
    const targetChanged = hitTarget !== session.currentTarget;

    if (targetChanged) {
      if (session.currentTarget) {
        session.currentTarget.el.classList.remove('pg-drop-over');
        this.clearDropIndicator(session.currentTarget.el);
        session.currentTarget.onDragLeave?.(session.item);
      }
      session.currentTarget = hitTarget;
      if (hitTarget) {
        hitTarget.el.classList.add('pg-drop-over');
        hitTarget.onDragEnter?.(session.item);
      }
    }

    const prevPosition = session.position;
    if (hitTarget) {
      session.position = this.calcDropPosition(y, hitSlot);
      if (targetChanged || session.position !== prevPosition) {
        this.updateDropIndicator(hitTarget.el, session.position);
      }
    } else {
      session.position = null;
    }

    // Emitting only on change keeps a pointer crossing one wide target from
    // allocating a payload and fanning out to every listener each frame.
    if (targetChanged || session.position !== prevPosition) {
      this.eventBus.emit(GridEventType.DRAG_OVER, {
        item: session.item,
        targetId: hitTarget?.id ?? null,
        position: session.position,
      });
    }
  }

  /** Promotes a press past the threshold into a live drag. */
  private beginDrag(session: DragSession): void {
    session.isDragging = true;
    session.sourceEl.classList.add('pg-dragging');
    this.preview.create(
      this.previewOptionsByEl.get(session.sourceEl) ?? {},
      session.sourceEl,
    );
    this.captureTargets(session.item);

    // Anything that scrolls or resizes moves the captured rects; a drag is
    // short-lived, so these listeners exist only for its duration.
    window.addEventListener('scroll', this.boundInvalidate, true);
    window.addEventListener('resize', this.boundInvalidate);

    this.eventBus.emit(GridEventType.DRAG_STARTED, { item: session.item });
  }

  /**
   * Snapshots the geometry of every target that accepts the dragged item.
   *
   * Filtering here rather than per frame means the hot path never re-evaluates
   * `acceptsTypes`, and the cache holds only rects that can actually match.
   */
  private captureTargets(item: DragItem): void {
    this.candidates.length = 0;
    const els: HTMLElement[] = [];
    for (const target of this.dropTargets.values()) {
      if (!target.acceptsTypes.includes(item.type)) continue;
      if (target.id === item.id) continue;
      this.candidates.push(target);
      els.push(target.el);
    }
    this.rects.capture(els);
  }

  /**
   * Resolves the slot index under the cursor from cached geometry.
   *
   * Re-captures only when the cache has been invalidated (a scroll or resize
   * since the last frame), so a stationary layout costs zero layout flushes.
   *
   * @returns The index into {@link candidates}, or {@link NO_SLOT}.
   */
  private findDropSlot(x: number, y: number, dragItem: DragItem): number {
    if (!this.rects.isValid) this.captureTargets(dragItem);
    return this.rects.hitTestPoint(x, y);
  }

  /**
   * Classifies where within a target the cursor sits.
   *
   * Reads the target's cached vertical span rather than calling
   * `getBoundingClientRect()` a second time on an element whose rect was already
   * measured this drag.
   *
   * @param mouseY - Client y coordinate.
   * @param slot   - Index of the hit target in {@link candidates}.
   */
  private calcDropPosition(mouseY: number, slot: number): DropPosition {
    const height = this.rects.heightOf(slot);
    if (height <= 0) return 'inside';
    const ratio = (mouseY - this.rects.topOf(slot)) / height;
    if (ratio < EDGE_RATIO) return 'before';
    if (ratio > 1 - EDGE_RATIO) return 'after';
    return 'inside';
  }

  private updateDropIndicator(el: HTMLElement, position: DropPosition): void {
    el.classList.remove('pg-drop-before', 'pg-drop-after', 'pg-drop-inside');
    el.classList.add(`pg-drop-${position}`);
  }

  private clearDropIndicator(el: HTMLElement): void {
    el.classList.remove('pg-drop-before', 'pg-drop-after', 'pg-drop-inside');
  }

  // ── Teardown ───────────────────────────────────────────────────────────────

  private cleanupDrag(_cancelled: boolean): void {
    const session = this.currentSession;
    if (!session) return;

    // Cleared first so a frame that fires between here and the listener removal
    // finds no session and returns immediately.
    this.currentSession = null;
    this.frames.reset();

    session.sourceEl.classList.remove('pg-dragging');
    if (session.currentTarget) {
      session.currentTarget.el.classList.remove('pg-drop-over');
      this.clearDropIndicator(session.currentTarget.el);
    }

    this.preview.destroy();
    this.autoscroll.stop();
    this.rects.clear();
    this.candidates.length = 0;
    this.detachGlobalListeners();
  }

  private detachGlobalListeners(): void {
    document.removeEventListener('pointermove', this.boundPointerMove);
    document.removeEventListener('pointerup', this.boundPointerUp);
    document.removeEventListener('pointercancel', this.boundPointerUp);
    window.removeEventListener('scroll', this.boundInvalidate, true);
    window.removeEventListener('resize', this.boundInvalidate);

    if (this.capturedEl && this.capturedPointerId !== -1) {
      try { this.capturedEl.releasePointerCapture(this.capturedPointerId); } catch { /* already released */ }
    }
    this.capturedEl = null;
    this.capturedPointerId = -1;
  }
}
