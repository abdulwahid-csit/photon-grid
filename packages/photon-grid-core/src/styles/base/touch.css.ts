/**
 * Photon Grid base styles — touch / coarse-pointer section.
 *
 * Auto-split style module (see base-styles.ts). Everything here supports touch
 * input:
 *
 *  1. `touch-action` declarations that let the JS pointer handlers own their
 *     gestures instead of the browser's native scroll/zoom. The grid scrolls via
 *     transform (not native overflow), so finger panning is synthesized in
 *     `ScrollController`; `touch-action: none` on the scroll surfaces stops the
 *     browser from hijacking the drag and cancelling the pointer stream.
 *  2. `@media (pointer: coarse)` overrides that grow the resize / drag / fill
 *     handles from mouse-sized (2–6px) targets to finger-sized ones.
 *
 * `touch-action` is intentionally scoped to the header and the cell panel bodies
 * (`.pg-panel__body`) — NOT the whole `.pg-grid__body`. Overlay children that
 * scroll natively (the AI panel, editor dropdowns) are siblings of the panels,
 * so this leaves their native scrolling intact.
 *
 * All colors come from theme tokens; no hardcoded palette values.
 */
export const touchCss = `/* ──────────────────── Touch / coarse pointer ──────────────────── */

/* Scroll surfaces: suppress native pan/zoom so JS panning owns the gesture. */
.pg-grid__header,
.pg-panel__body { touch-action: none; }

/* Interactive handles own their own drag — never let a touch on them scroll. */
.pg-th__resize-handle,
.pg-th__resize-handle--group,
[data-row-drag],
[data-detail-resize-handle],
.pg-fill-handle { touch-action: none; }

/* Column header "picked up" via long-press (touch reorder). */
.pg-th--drag-armed {
  background: var(--pg-colors-row-selected, rgba(37, 99, 235, 0.08));
  cursor: grabbing;
}

/* ── Finger-sized hit targets ─────────────────────────────────────────────
   Coarse pointers (touch) get enlarged, transparent hit areas; the visible
   affordance (a thin line / small square) is preserved via ::after or the
   existing box so the look is unchanged on desktop. */
@media (pointer: coarse) {
  /* Column resize handle: a finger needs more than a mouse. One token drives
     the width, the offset that keeps the line centred, and the right-pinned
     variant — they are all derived from it in header.css. The visible line is
     unchanged; only the grab zone grows. */
  .pg-th__resize-handle {
    --pg-sizing-resize-grab-width: 18px;
  }

  /* Row drag handle: larger and more visible for fingers. */
  .pg-row-drag-handle {
    width: 32px;
    opacity: 0.6;
  }

  /* Fill handle: grow the corner target so it can be grabbed with a finger. */
  .pg-fill-handle {
    width: 14px;
    height: 14px;
  }

  /* Master/Detail bottom-edge resize handle: taller grab strip. */
  [data-detail-resize-handle] {
    min-height: 16px;
  }
}
`;
