/**
 * Photon Grid base styles — cells section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const cellsCss = `/* ──────────────────── Cells ──────────────────── */
.pg-cell {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: var(--pg-sizing-column-min-width, 40px);
  border-right: 1px solid transparent;
  padding: 0;
  overflow: hidden;
  position: relative;
}
.pg-cell--v-border { border-right-color: var(--pg-colors-border, #e2e8f0); }
.pg-cell:last-child { border-right: none; }
.pg-cell--align-right  { justify-content: flex-end;  }
.pg-cell--align-center { justify-content: center; }
.pg-cell--align-right  .pg-cell__inner { text-align: right; }
.pg-cell--align-center .pg-cell__inner { text-align: center; }

/* ─── Cell selection (CSS-based, replaces canvas) ─── */
/* Suppress the browser's native focus ring — the grid uses its own blue
   box-shadow indicator on .pg-cell--active-cell instead. */
.pg-cell { user-select: none; outline: none; }

/*
 * Range selection — edge borders drawn via ::after so CSS border corners
 * always connect cleanly (no box-shadow joining artefacts).
 * The JS engine adds sel-top/right/bottom/left only on cells that sit on
 * the outer edge of the range; interior cells carry no edge classes.
 */
.pg-cell--in-selection {
  background-color: var(--pg-colors-selection-background, aliceblue) !important;
  position: relative;
  z-index: 1;
}
.pg-cell--in-selection::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 0 solid var(--pg-colors-primary, #2563eb);
  pointer-events: none;
}
.pg-cell--sel-top::after    { border-top-width:    1px; }
.pg-cell--sel-bottom::after { border-bottom-width: 1px; }
.pg-cell--sel-left::after   { border-left-width:   1px; }
.pg-cell--sel-right::after  { border-right-width:  1px; }

/* Active (focused) cell — solid 2px inset border, no background */
.pg-cell--active-cell {
  background-color: transparent !important;
  box-shadow: inset 0 0 0 2px var(--pg-colors-primary, #2563eb) !important;
  position: relative;
  z-index: 2;
  outline: none;
}
/* Suppress the ::after edge overlay only when the active cell is NOT inside a selection */
.pg-cell--active-cell:not(.pg-cell--in-selection)::after { content: none; }

/* Active cell inside a range — selection wins entirely: no 2px border, full selection look */
.pg-cell--in-selection.pg-cell--active-cell {
  background-color: var(--pg-colors-selection-background, aliceblue) !important;
  box-shadow: none !important;
}

/* Dark-mode overrides */
[data-pg-mode="dark"] .pg-cell--in-selection {
  background-color: rgba(37,99,235,0.18) !important;
}
[data-pg-mode="dark"] .pg-cell--sel-top    { --_t:  2px; }
[data-pg-mode="dark"] .pg-cell--sel-bottom { --_b: -2px; }
[data-pg-mode="dark"] .pg-cell--sel-left   { --_l:  2px; }
[data-pg-mode="dark"] .pg-cell--sel-right  { --_r: -2px; }
[data-pg-mode="dark"] .pg-cell--active-cell {
  background-color: rgba(37,99,235,0.25) !important;
  box-shadow: inset 0 0 0 2px #60a5fa !important;
}
[data-pg-mode="dark"] .pg-cell--in-selection.pg-cell--active-cell {
  background-color: rgba(37,99,235,0.18) !important;
  box-shadow:
    inset 0 var(--_t) 0 0 #60a5fa,
    inset 0 var(--_b) 0 0 #60a5fa,
    inset var(--_l) 0 0 0 #60a5fa,
    inset var(--_r) 0 0 0 #60a5fa !important;
}

/* ─── Group aggregate cells ─── */
/*
 * Aggregate values are displayed inside .pg-cell--agg cells that sit directly
 * under their column headers, aligned with normal data-row cells via the same
 * [data-col-id] width rules managed by ColumnStyleManager.
 */
.pg-cell--agg {
  color: var(--pg-colors-agg-text, var(--pg-colors-text-secondary, #475569));
  font-style: italic;
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
}
[data-pg-mode="dark"] .pg-cell--agg {
  color: var(--pg-colors-agg-text, var(--pg-colors-text-secondary, #94a3b8));
}

/* ─── Copy / Cut flash feedback ─── */
/*
 * background-color: !important on pg-cell--in-selection blocks keyframe bg changes.
 * Use a ::after overlay instead — it's a separate layer, no !important conflict.
 */
@keyframes pg-copy-flash-overlay {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes pg-cut-flash-overlay {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  100% { opacity: 0; }
}
/*
 * Flash overlay uses ::before so it never conflicts with the ::after
 * pseudo-element that draws the selection edge borders.
 */
.pg-cell--copy-flash::before,
.pg-cell--cut-flash::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}
.pg-cell--copy-flash::before {
  background: rgba(59, 130, 246, 0.45);
  animation: pg-copy-flash-overlay 0.75s ease-out forwards;
}
.pg-cell--cut-flash::before {
  background: rgba(239, 68, 68, 0.45);
  animation: pg-cut-flash-overlay 0.75s ease-out forwards;
}
/* Dark mode uses stronger overlay */
[data-pg-mode="dark"] .pg-cell--copy-flash::before {
  background: rgba(99, 165, 253, 0.5);
}
[data-pg-mode="dark"] .pg-cell--cut-flash::before {
  background: rgba(252, 100, 100, 0.5);
}

/* ─── Fill success flash ─── */
/*
 * Applied to the newly filled cells after a fill-handle drag completes.
 * Uses ::before (same as copy/cut flash) so it never conflicts with the
 * selection edge border drawn on ::after.
 */
@keyframes pg-fill-flash-overlay {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  100% { opacity: 0; }
}
.pg-cell--fill-flash::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  background: rgba(34, 197, 94, 0.45);
  animation: pg-fill-flash-overlay 0.75s ease-out forwards;
}
[data-pg-mode="dark"] .pg-cell--fill-flash::before {
  background: rgba(74, 222, 128, 0.5);
}

/* ─── Programmatic cell flash (GridApi.flashCells) ─── */
/*
 * A neutral highlight pulse used to draw attention to cells that changed via
 * the public API (e.g. after a data refresh). Uses ::before like the other
 * flashes so it never conflicts with the selection border drawn on ::after.
 */
.pg-cell--flash::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  background: rgba(59, 130, 246, 0.40);
  animation: pg-fill-flash-overlay 0.75s ease-out forwards;
}
[data-pg-mode="dark"] .pg-cell--flash::before {
  background: rgba(96, 165, 250, 0.45);
}

/* ─── Fill handle ─── */
/*
 * The fill handle is a small drag target at the bottom-right corner of the
 * primary selection range.  It lives inside the corner cell as an absolutely-
 * positioned child so it scrolls with the grid naturally.
 *
 * pg-cell--has-fill-handle lets the handle extend 4 px past the cell edge
 * (standard AG Grid behaviour) by lifting overflow:hidden on that one cell.
 *
 * Dragging from the handle copies the source range into the dragged area in
 * one direction at a time; a dashed overlay (pg-cell--fill-preview) previews
 * the fill area before the mouse button is released.
 */
.pg-cell--has-fill-handle {
  overflow: visible !important;
}
.pg-fill-handle {
  position: absolute;
  right: 0px;
  bottom: 0px;
  width: 6px;
  height: 6px;
  box-sizing: border-box;
  background-color: var(--pg-colors-primary, #2563eb);
  cursor: crosshair;
  z-index: 10;
  pointer-events: auto;
  user-select: none;
}

/* ─── Fill preview — dashed border on cells being hovered during fill drag ─── */
.pg-cell--fill-preview {
  background-color: var(--pg-colors-selection-background, aliceblue) !important;
  position: relative;
  z-index: 1;
}
/*
 * The fill-preview ::after uses a dashed border (vs the solid selection border)
 * to clearly distinguish "about to be filled" from "already selected."
 * These classes are orthogonal to sel-top/bottom/left/right — fill-preview
 * cells are never pg-cell--in-selection, so there is no ::after conflict.
 */
.pg-cell--fill-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 0 dashed var(--pg-colors-primary, #2563eb);
  pointer-events: none;
}
.pg-cell--fp-top::after    { border-top-width:    1px; }
.pg-cell--fp-bottom::after { border-bottom-width: 1px; }
.pg-cell--fp-left::after   { border-left-width:   1px; }
.pg-cell--fp-right::after  { border-right-width:  1px; }

[data-pg-mode="dark"] .pg-cell--fill-preview {
  background-color: rgba(37, 99, 235, 0.12) !important;
}

`;
