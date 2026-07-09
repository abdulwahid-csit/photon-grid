/**
 * Photon Grid base styles — panels section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const panelsCss = `/* ──────────────────── Three-panel header ──────────────────── */
.pg-grid__header {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  border-bottom: 1px solid var(--pg-colors-header-border, #e2e8f0);
  background: var(--pg-colors-header-background, #f8fafc);
  overflow: hidden;
  z-index: 10;
  position: relative;
}
/* Mirrors the vertical-scrollbar flex item that lives in the body row so that
   the center header panel is exactly as wide as the center body panel.
   Without this spacer the header center is scrollbar_width wider and the right
   pinned-column header is shifted right relative to the body cells.
   Uses the *live* scrollbar width (--pg-scrollbar-v-live-width: 0 when the body
   has no scrollbar showing, the real width when it does — kept in sync every
   scroll/resize by ScrollController.syncScrollbars) rather than the constant
   --pg-scrollbar-v-width, so header↔body alignment stays exact whether or not a
   vertical scrollbar is currently present. */
.pg-header-vscroll-spacer {
  flex-shrink: 0;
  width: var(--pg-scrollbar-v-live-width, 0px);
  background: var(--pg-colors-header-background, #f8fafc);
}

/* ──────────────────── Three-panel body ──────────────────── */
.pg-grid__body {
  display: flex;
  flex-direction: row;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
  transform: translateZ(10px)
}

/* ──────────────────── Panel base ──────────────────── */
.pg-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
}
.pg-panel--left {
  z-index: 2;
  width: var(--pg-left-panel-width, auto);
}
.pg-panel--center {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}
.pg-panel--right {
  z-index: 2;
  width: var(--pg-right-panel-width, auto);
  padding-inline: 1px
}
/* ── Pinned-region divider ──────────────────────────────────────────────
   Structural boundary between a frozen (pinned) column region and the
   scrollable center. Deliberately independent of showVerticalBorders (which
   only governs interior column grid-lines) — the frozen edge must stay visible
   even when interior lines are off, otherwise pinned columns visually merge
   into the scrolling area.
   Implemented as an absolutely-positioned 1px overlay (::after) rather than a
   real border or an inset shadow:
     • a real border would consume 1px of the border-box width and clip the
       last pinned column;
     • an inset box-shadow paints behind the panel's descendant rows, whose
       opaque backgrounds (--pg-colors-row-background) would hide it.
   The overlay adds no layout box (zero reflow, no width shift) and paints above
   the rows. It only renders while the panel is displayed, i.e. that side
   actually has pinned columns (empty panels are display:none). */
.pg-panel--left::after,
.pg-panel--right::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--pg-colors-pinned-border, var(--pg-colors-border, #e2e8f0));
  z-index: 4;
  pointer-events: none;
}
.pg-panel--left::after  { right: 0; }
.pg-panel--right::after { left: 0; }

/* ──────────────────── Panel header ──────────────────── */
.pg-panel__header {
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  z-index: 2;
}
/* Center panel header sits behind pinned-panel headers so that center
   content translated by the scroll transform cannot visually overlap the
   left / right pinned column headers when scrolled near their edges. */
.pg-panel--center .pg-panel__header {
  z-index: 1;
}
.pg-panel__header-inner {
  display: flex;
  flex-direction: column;
}
.pg-panel--center .pg-panel__header-inner {
  transform: translateX(var(--pg-scroll-x, 0px));
  width: var(--pg-center-content-width, 100%);
}

/* ──────────────────── Panel body ──────────────────── */
.pg-panel__body {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* ──────────────────── Panel content (virtual scroll) ──────────────────── */
.pg-panel__content {
  position: relative;
  height: var(--pg-content-height, 0px);
  will-change: transform;
}
.pg-panel--left .pg-panel__content,
.pg-panel--right .pg-panel__content {
  transform: translateY(var(--pg-scroll-y, 0px));
}
.pg-panel--center .pg-panel__content {
  transform: translate(var(--pg-scroll-x, 0px), var(--pg-scroll-y, 0px));
  width: var(--pg-center-content-width, 100%);
}
/* Master/Detail only (see GridRenderer's pg-grid--has-master-detail class):
   a BODY panel (left/center/right — scoped via .pg-grid__body so the
   *header* panels, which share the same .pg-panel classes, are untouched
   and stay fully interactive for sort/resize/filter) is a full-height block
   regardless of whether it has a row at a given Y — including the Y range
   where the full-width detail/nested grid layer shows through underneath.
   Without this, empty panel space (there is no row there — a detail row
   renders nothing in these panels by design) still geometrically blocks
   clicks meant for whatever is showing through from that layer.
   pointer-events is inherited, so every actual row must explicitly opt
   back in — scoped to Master/Detail grids only, this has no effect on the
   vast majority of grids that never use it. */
.pg-grid--has-master-detail .pg-grid__body > .pg-panel,
.pg-grid--has-master-detail .pg-panel__body,
.pg-grid--has-master-detail .pg-panel__content {
  pointer-events: none;
}
.pg-grid--has-master-detail .pg-row {
  pointer-events: auto;
}

`;
