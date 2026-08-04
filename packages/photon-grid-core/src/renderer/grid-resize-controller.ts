/**
 * Grid container resizing — drag the grid's own edges and corners.
 *
 * Owns the handle elements, the pointer gesture, and the single place the
 * container's width/height are written. The `GridApi` size methods write
 * through this same controller, so a programmatic resize and a dragged one
 * cannot disagree about the current size or skip an event.
 *
 * ### What gets sized
 * The **container element** the host handed to `GridCore`, not the internal
 * `.pg-grid` wrapper. The wrapper is `width: 100%; height: 100%`, so it follows
 * the container automatically, and sizing the container is what "resize the
 * whole grid" means from the outside.
 *
 * ### Why nothing here re-renders
 * `ScrollController` already observes the body panels with a `ResizeObserver`
 * and fires its scroll callbacks when they change, which schedules a render and
 * re-resolves flex columns. A resize therefore propagates through the existing
 * path; this controller only changes the box.
 *
 * ### Top / left handles
 * Growing from the top or left edge has to keep the *opposite* edge visually
 * fixed, which a height/width change alone does not do — the element's origin
 * stays put and it grows the wrong way. Those handles therefore also shift
 * `margin-top` / `margin-left` by the negated delta. See
 * {@link GridResizeConfig.handles}.
 *
 * @packageDocumentation
 */

import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import {
  DEFAULT_GRID_RESIZE_HANDLES,
  GridResizeHandle,
  GridResizeSource,
  type GridResizeConfig,
  type GridSize,
} from '../types/grid-resize.types';
import { createDiv } from './dom-utils';

/** Fallback bounds, used when the config omits them. */
const DEFAULT_MIN_WIDTH = 240;
const DEFAULT_MIN_HEIGHT = 120;
const DEFAULT_HANDLE_SIZE = 6;

/** Which axes a handle drives, and in which direction. */
interface HandleAxes {
  /** `-1` when dragging left grows the grid, `1` when dragging right does, `0` for no width change. */
  readonly x: -1 | 0 | 1;
  /** `-1` when dragging up grows the grid, `1` when dragging down does, `0` for no height change. */
  readonly y: -1 | 0 | 1;
  /** `true` when the horizontal change must be compensated by `margin-left`. */
  readonly anchorRight: boolean;
  /** `true` when the vertical change must be compensated by `margin-top`. */
  readonly anchorBottom: boolean;
}

/**
 * Per-handle geometry. Static, so it lives outside the class — there is exactly
 * one correct answer per handle and it never depends on configuration.
 */
const HANDLE_AXES: Readonly<Record<GridResizeHandle, HandleAxes>> = {
  [GridResizeHandle.Top]: { x: 0, y: -1, anchorRight: false, anchorBottom: true },
  [GridResizeHandle.Right]: { x: 1, y: 0, anchorRight: false, anchorBottom: false },
  [GridResizeHandle.Bottom]: { x: 0, y: 1, anchorRight: false, anchorBottom: false },
  [GridResizeHandle.Left]: { x: -1, y: 0, anchorRight: true, anchorBottom: false },
  [GridResizeHandle.TopLeft]: { x: -1, y: -1, anchorRight: true, anchorBottom: true },
  [GridResizeHandle.TopRight]: { x: 1, y: -1, anchorRight: false, anchorBottom: true },
  [GridResizeHandle.BottomLeft]: { x: -1, y: 1, anchorRight: true, anchorBottom: false },
  [GridResizeHandle.BottomRight]: { x: 1, y: 1, anchorRight: false, anchorBottom: false },
};

/** State captured at pointer-down and read for the duration of the gesture. */
interface DragState {
  readonly handle: GridResizeHandle;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly startWidth: number;
  readonly startHeight: number;
  readonly startMarginLeft: number;
  readonly startMarginTop: number;
  readonly axes: HandleAxes;
}

/**
 * Drives grid container resizing.
 *
 * One instance per grid, created by `GridRenderer` and mounted onto the grid
 * wrapper.
 */
export class GridResizeController {
  /** Handle elements by handle id, so a config change can add/remove individually. */
  private readonly handleEls = new Map<GridResizeHandle, HTMLElement>();

  private wrapperEl: HTMLElement | null = null;
  private drag: DragState | null = null;
  private config: GridResizeConfig;

  /** Bound once so add/removeEventListener see the same reference. */
  private readonly onPointerMove = (e: PointerEvent): void => this.handlePointerMove(e);
  private readonly onPointerUp = (e: PointerEvent): void => this.handlePointerUp(e);

  /**
   * @param containerEl - The element the host passed to `GridCore`; the box this resizes.
   * @param eventBus    - Emits the three resize lifecycle events.
   * @param config      - Initial configuration.
   */
  constructor(
    private readonly containerEl: HTMLElement,
    private readonly eventBus: EventBus,
    config: GridResizeConfig = {},
  ) {
    this.config = config;
  }

  /**
   * Builds the handles into the grid wrapper.
   *
   * @param wrapperEl - `.pg-grid`, which is `position: relative` and therefore
   *                    the containing block the absolutely-positioned handles need.
   */
  mount(wrapperEl: HTMLElement): void {
    this.wrapperEl = wrapperEl;
    this.syncHandles();
  }

  /** @returns The container's current outer size, measured from the DOM. */
  getSize(): GridSize {
    const rect = this.containerEl.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  /**
   * Writes a width and/or height onto the container and announces the change.
   *
   * The single write path: dragging calls it, and so does every `GridApi` size
   * method. `undefined` leaves a dimension alone; `null` removes the override so
   * the stylesheet's value applies again.
   *
   * @param size   - Dimensions to apply.
   * @param source - What caused the change, forwarded to `GRID_RESIZED`.
   * @param handle - The handle responsible, for a drag.
   */
  setSize(
    size: { width?: number | string | null; height?: number | string | null },
    source: GridResizeSource = GridResizeSource.Api,
    handle: GridResizeHandle | null = null,
  ): void {
    const previousSize = this.getSize();

    if (size.width !== undefined) {
      if (size.width === null) this.containerEl.style.removeProperty('width');
      else this.containerEl.style.width = toCssLength(size.width);
    }
    if (size.height !== undefined) {
      if (size.height === null) this.containerEl.style.removeProperty('height');
      else this.containerEl.style.height = toCssLength(size.height);
    }

    const nextSize = this.getSize();
    // A no-op write (setting the size it already has, or clamping into the same
    // value twice during a drag) should not produce an event — a listener that
    // persists the size would otherwise write on every pointermove frame.
    if (nextSize.width === previousSize.width && nextSize.height === previousSize.height) return;

    this.eventBus.emit(GridEventType.GRID_RESIZED, {
      size: nextSize,
      previousSize,
      source,
      handle,
    });
  }

  /** Drops both overrides and the margin compensation a top/left drag applied. */
  reset(): void {
    this.containerEl.style.removeProperty('margin-top');
    this.containerEl.style.removeProperty('margin-left');
    this.setSize({ width: null, height: null });
  }

  /**
   * Replaces the configuration and rebuilds the handles to match.
   *
   * @param config - Merged over the current configuration.
   */
  updateConfig(config: GridResizeConfig): void {
    this.config = { ...this.config, ...config };
    this.syncHandles();
  }

  /** Turns dragging on or off without discarding the configuration. */
  setEnabled(enabled: boolean): void {
    this.updateConfig({ enabled });
  }

  /** `true` when handles are currently mounted. */
  get isEnabled(): boolean {
    return this.config.enabled !== false;
  }

  /** `true` while a handle drag is in progress. */
  get isResizing(): boolean {
    return this.drag !== null;
  }

  /** Removes every handle and any in-flight listener. */
  destroy(): void {
    this.releasePointer();
    for (const el of this.handleEls.values()) el.remove();
    this.handleEls.clear();
    this.wrapperEl = null;
  }

  // ─── Handles ───────────────────────────────────────────────────────────────

  /**
   * Brings the mounted handles in line with the configuration — adding those
   * that appeared, removing those that went, and leaving untouched ones alone
   * so a config change mid-hover does not flicker.
   */
  private syncHandles(): void {
    const wrapper = this.wrapperEl;
    if (!wrapper) return;

    const wanted = new Set<GridResizeHandle>(
      this.isEnabled ? this.resolveHandles() : [],
    );

    for (const [handle, el] of this.handleEls) {
      if (!wanted.has(handle)) {
        el.remove();
        this.handleEls.delete(handle);
      }
    }

    const size = this.config.handleSize ?? DEFAULT_HANDLE_SIZE;
    wrapper.style.setProperty('--pg-resize-handle-size', `${size}px`);
    wrapper.classList.toggle('pg-grid--resizable', wanted.size > 0);

    for (const handle of wanted) {
      if (this.handleEls.has(handle)) continue;
      const el = this.buildHandle(handle);
      wrapper.appendChild(el);
      this.handleEls.set(handle, el);
    }
  }

  /**
   * The configured handles, minus any the axis locks rule out.
   *
   * A locked axis drops the edge handles for it outright, and demotes corners
   * to their still-free axis — dragging the bottom-right corner of a
   * width-locked grid should still change the height rather than do nothing.
   */
  private resolveHandles(): GridResizeHandle[] {
    const configured = this.config.handles ?? DEFAULT_GRID_RESIZE_HANDLES;
    const { lockWidth, lockHeight } = this.config;
    if (!lockWidth && !lockHeight) return [...configured];

    const result: GridResizeHandle[] = [];
    for (const handle of configured) {
      const axes = HANDLE_AXES[handle];
      const drivesX = axes.x !== 0 && !lockWidth;
      const drivesY = axes.y !== 0 && !lockHeight;
      if (drivesX || drivesY) result.push(handle);
    }
    return result;
  }

  /** Builds one handle element, wired to start a drag. */
  private buildHandle(handle: GridResizeHandle): HTMLElement {
    const el = createDiv(`pg-resize-handle pg-resize-handle--${handle}`);
    // Presentational: a resize affordance is a mouse gesture with a keyboard
    // equivalent already available through the GridApi size methods, so exposing
    // it to assistive technology as an interactive control would be noise.
    el.setAttribute('role', 'presentation');
    el.setAttribute('data-pg-resize-handle', handle);
    el.addEventListener('pointerdown', (e) => this.handlePointerDown(e, handle));
    return el;
  }

  // ─── Gesture ───────────────────────────────────────────────────────────────

  private handlePointerDown(e: PointerEvent, handle: GridResizeHandle): void {
    if (e.button !== 0 || this.drag !== null) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = this.containerEl.getBoundingClientRect();
    const computed = getComputedStyle(this.containerEl);

    this.drag = {
      handle,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startMarginLeft: parseFloat(computed.marginLeft) || 0,
      startMarginTop: parseFloat(computed.marginTop) || 0,
      axes: HANDLE_AXES[handle],
    };

    // Listeners on `window`, not the handle: a fast drag outruns a 6px-wide
    // element, and pointer capture alone would not deliver moves that leave the
    // document during a drag over an iframe or devtools.
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    // Suppresses text selection and pointer events on the grid's contents for
    // the duration, so a drag across the body never selects cell text.
    this.wrapperEl?.classList.add('pg-grid--resizing');

    this.eventBus.emit(GridEventType.GRID_RESIZE_START, {
      handle,
      size: { width: rect.width, height: rect.height },
    });
  }

  private handlePointerMove(e: PointerEvent): void {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;

    const { axes } = drag;
    const dx = (e.clientX - drag.startX) * axes.x;
    const dy = (e.clientY - drag.startY) * axes.y;

    const width = axes.x !== 0 && !this.config.lockWidth
      ? this.clampWidth(drag.startWidth + dx)
      : null;
    const height = axes.y !== 0 && !this.config.lockHeight
      ? this.clampHeight(drag.startHeight + dy)
      : null;

    // Compensate the origin so the anchored edge stays put. Applied from the
    // gesture's start values rather than incrementally, so rounding never
    // accumulates across a long drag.
    if (width !== null && axes.anchorRight) {
      this.containerEl.style.marginLeft = `${drag.startMarginLeft - (width - drag.startWidth)}px`;
    }
    if (height !== null && axes.anchorBottom) {
      this.containerEl.style.marginTop = `${drag.startMarginTop - (height - drag.startHeight)}px`;
    }

    this.setSize(
      { width: width ?? undefined, height: height ?? undefined },
      GridResizeSource.Drag,
      drag.handle,
    );
  }

  private handlePointerUp(e: PointerEvent): void {
    const drag = this.drag;
    if (!drag || e.pointerId !== drag.pointerId) return;

    this.releasePointer();
    this.eventBus.emit(GridEventType.GRID_RESIZE_END, {
      handle: drag.handle,
      size: this.getSize(),
      initialSize: { width: drag.startWidth, height: drag.startHeight },
    });
  }

  /** Ends the gesture and detaches its listeners. Safe to call when idle. */
  private releasePointer(): void {
    if (this.drag === null) return;
    this.drag = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.wrapperEl?.classList.remove('pg-grid--resizing');
  }

  // ─── Bounds ────────────────────────────────────────────────────────────────

  private clampWidth(width: number): number {
    return clamp(
      snap(width, this.config.step),
      this.config.minWidth ?? DEFAULT_MIN_WIDTH,
      this.config.maxWidth,
    );
  }

  private clampHeight(height: number): number {
    return clamp(
      snap(height, this.config.step),
      this.config.minHeight ?? DEFAULT_MIN_HEIGHT,
      this.config.maxHeight,
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Rounds to the nearest multiple of `step`. A step of `1` or less is free resizing. */
function snap(value: number, step: number | undefined): number {
  if (step == null || step <= 1) return Math.round(value);
  return Math.round(value / step) * step;
}

/** Clamps to `[min, max]`; an omitted `max` is unbounded. */
function clamp(value: number, min: number, max: number | undefined): number {
  const lower = Math.max(value, min);
  return max == null ? lower : Math.min(lower, max);
}

/**
 * Renders a size as a CSS length.
 *
 * Numbers are pixels — the overwhelmingly common case, and writing `40` when
 * `'40px'` was meant is the mistake this exists to prevent. Strings pass
 * through, so `'60%'`, `'40rem'` and `calc()` all work.
 */
function toCssLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
}
