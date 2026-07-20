/**
 * Shared pointer-input primitives used across every drag/resize/select/scroll
 * interaction in the grid.
 *
 * The grid is built on **Pointer Events** rather than legacy mouse events so a
 * single code path serves mouse, touch, and pen. Because `PointerEvent extends
 * MouseEvent`, every existing `button` / `buttons` / `clientX` / modifier-key
 * check keeps working unchanged — the only additions are the `pointerType`
 * branch (to give touch a different gesture where needed) and the shared
 * thresholds below.
 *
 * Centralizing these constants here keeps gesture behavior consistent (a "drag"
 * starts at the same distance everywhere) and avoids each interaction site
 * re-deriving the same magic numbers.
 */

/** Pointer type reported by the browser for a {@link PointerEvent}. */
export const enum PointerKind {
  Mouse = 'mouse',
  Touch = 'touch',
  Pen = 'pen',
}

/** `true` when the event originates from a touch contact (finger). */
export function isTouchPointer(e: PointerEvent): boolean {
  return e.pointerType === PointerKind.Touch;
}

/** `true` when the event originates from a mouse or trackpad. */
export function isMousePointer(e: PointerEvent): boolean {
  return e.pointerType === PointerKind.Mouse;
}

/**
 * Movement (px) a pointer must travel before a press is treated as a drag.
 *
 * Touch gets a larger threshold than mouse because fingers jitter on contact
 * and the extra slack prevents a stationary tap from being misread as a drag.
 */
export const DRAG_THRESHOLD_MOUSE = 5;
export const DRAG_THRESHOLD_TOUCH = 8;

/** Returns the drag-start threshold appropriate for the pointer's type. */
export function dragThresholdFor(e: PointerEvent): number {
  return isTouchPointer(e) ? DRAG_THRESHOLD_TOUCH : DRAG_THRESHOLD_MOUSE;
}

/**
 * Press duration (ms) after which a stationary touch is promoted to a drag
 * "pick up" — used to disambiguate a horizontal header drag (which should
 * scroll) from a column reorder (which requires intent). Mouse never waits;
 * it starts dragging as soon as it crosses {@link DRAG_THRESHOLD_MOUSE}.
 */
export const LONG_PRESS_MS = 400;

/**
 * Momentum (kinetic) scrolling tuning for touch panning.
 *
 * After the finger lifts, residual velocity is fed to the scroller each frame
 * and multiplied by {@link MOMENTUM_DECAY}; the glide ends once speed drops
 * below {@link MOMENTUM_MIN_VELOCITY} (px/ms).
 */
export const MOMENTUM_DECAY = 0.95;
export const MOMENTUM_MIN_VELOCITY = 0.02;

/**
 * CSS selector matching every element that owns its own pointer gesture and
 * must therefore be excluded from body/header touch-panning (so a press on a
 * resize handle, drag handle, fill handle, open editor, or floating AI panel
 * starts that interaction instead of scrolling the grid underneath it).
 */
export const PAN_EXCLUDE_SELECTOR =
  '.pg-th__resize-handle,[data-row-drag],.pg-fill-handle,.pg-ai-panel,.pg-editor,[data-detail-toggle],[data-detail-resize-handle]';
