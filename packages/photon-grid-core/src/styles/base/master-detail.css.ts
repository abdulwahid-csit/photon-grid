/**
 * Photon Grid base styles — master-detail section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const masterDetailCss = `/* ──────────────────── Master/Detail ────────────────────
   The detail layer is a sibling of the left/center/right body panels, not a
   child of any of them — that is what lets a detail row span the full grid
   width regardless of pinned columns. Its content wrapper receives only the
   vertical scroll transform (never the horizontal one center columns use),
   so it structurally cannot shift when the user scrolls horizontally. */
.pg-detail-layer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  /* Stops short of the vertical scrollbar's *current* column width (0 when
     it's hidden) instead of a blanket inset:0 — otherwise an expanded
     detail row's opaque background paints over the native scrollbar
     whenever one is showing. See ScrollController.syncScrollbars. */
  right: var(--pg-scrollbar-v-live-width, 0px);
  overflow: hidden;
  pointer-events: none;
  /* Tied with .pg-panel--left/--right's z-index (2, base-styles.ts ~line
     335) rather than below it — this layer is a later DOM sibling of the
     panels (mounted after them in GridRenderer.buildLayout), so an equal
     z-index still paints on top per normal stacking-order tie-breaking.
     This is what lets an expanded detail row's opaque background cover the
     pinned panels' own edge box-shadow instead of that shadow bleeding
     across the full-width detail content underneath (the panels are
     full-viewport-height flex items, so their shadow would otherwise span
     every detail row too, not just their own pinned cells). Sticky Master/
     Detail rows are unaffected by this ordering — they live in the
     independent, always-on-top .pg-sticky-layer below, not here. */
  z-index: 2;
}
.pg-detail-layer__content {
  position: relative;
  width: 100%;
  height: 100%;
  transform: translateY(var(--pg-scroll-y, 0px));
}
/* Sticky Master/Detail row layer — a TOP-LEVEL sibling of the left/center/
   right panels and of .pg-detail-layer (not nested inside any of them).
   .pg-panel--left/--right set their own explicit z-index for pinned-column
   elevation, which makes each one its own stacking context — anything
   nested inside is trapped there and can never out-rank a sibling like
   .pg-detail-layer merely by having a higher z-index of its own. Living at
   this same top level lets one z-index correctly out-rank everything, in
   every pinned/non-pinned column, with no stacking-context surprises.
   The container itself is pointer-events:none (so empty space with no
   sticky row never blocks clicks through to what's underneath); the actual
   row element re-enables pointer-events at the default (auto). */
.pg-sticky-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: var(--pg-scrollbar-v-live-width, 0px);
  bottom: 0;
  pointer-events: none;
  z-index: 3;
}
/* Mirrors .pg-panel--left's own pinned-edge shadow. That shadow lives on the
   panel container itself, which a stuck row's own background paints over
   for its own height once moved into this overlay — without repeating it
   here, the pinned-edge shadow has a visible gap wherever a sticky row
   currently sits.
   z-index: 2 (matching .pg-panel--left/--right's own z-index, base-styles.ts
   ~line 334) is required, not optional — this shadow bleeds *rightward*,
   into the center region's own horizontal space, and .pg-sticky-layer__center
   is appended after it in the DOM (see GridRenderer.buildStickyLayer); on
   equal stacking contexts a later sibling paints over an earlier one, so
   without an explicit z-index center's own background silently covers the
   bled-through part of this shadow, while the right shadow (appended last)
   was never affected — z-index makes both sides correct regardless of
   append order instead of depending on it. */
.pg-sticky-layer__left {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--pg-left-panel-width, 0px);
  overflow: hidden;
  box-shadow: 2px 0 4px rgba(0,0,0,0.06);
  z-index: 2;
}
.pg-sticky-layer__center {
  position: absolute;
  top: 0;
  left: var(--pg-left-panel-width, 0px);
  right: var(--pg-right-panel-width, 0px);
  height: 100%;
  overflow: hidden;
  z-index: 1;
}
/* Mirrors .pg-panel--center .pg-panel__content's horizontal-scroll transform
   so a stuck row's center cells track the user's horizontal scroll exactly
   like the real (non-sticky) center panel does. */
.pg-sticky-layer__center-inner {
  position: relative;
  height: 100%;
  width: var(--pg-center-content-width, 100%);
  transform: translateX(var(--pg-scroll-x, 0px));
}
/* Mirrors .pg-panel--right's own pinned-edge shadow — see .pg-sticky-layer__left above. */
.pg-sticky-layer__right {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: var(--pg-right-panel-width, 0px);
  overflow: hidden;
  box-shadow: -2px 0 4px rgba(0,0,0,0.06);
}
.pg-row--sticky {
  /* The sticky layer container above is pointer-events:none (so empty space
     with no sticky row never blocks clicks through to whatever's underneath)
     — pointer-events inherits, so without this the row itself, and every
     interactive thing inside it (cells, the tree/group toggle, checkboxes),
     would silently inherit "none" and stop responding to clicks entirely. */
  pointer-events: auto;
}
.pg-row--detail-container {
  position: absolute;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: auto;
  padding: 20px;
  background: var(--pg-colors-surface, #fff);
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  opacity: 1;
  /* Deliberately not tied to the theme's --pg-transitions-duration-* tokens —
     those are tuned for snappy hover/focus feedback elsewhere; expand/collapse
     reads better slightly slower and more deliberate. */
  transition:
    height 340ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 260ms ease;
}
/* Expand: fades in on first mount; height grows for free once RowPositionSheet
   updates from the initial min/cached height to the auto-measured one. */
.pg-row--detail-container.pg-row--detail-entering {
  opacity: 0;
}
/* Collapse: DetailRowRenderer.beginCollapse freezes top/height as inline
   styles first (the RowPositionSheet rule for this row is about to disappear
   for good), then this class plus height: 0 (set in JS) drives the shrink. */
.pg-row--detail-container.pg-row--detail-collapsing {
  opacity: 0;
  border-bottom-color: transparent;
}
.pg-detail-nested-grid-host {
  width: 100%;
  height: 100%;
}
.pg-detail-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-detail-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--pg-group-toggle-size, 24px);
  height: var(--pg-group-toggle-size, 24px);
  margin-left: 8px;
  margin-right: 4px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms),
    color var(--pg-transitions-duration-fast, 100ms);
}
.pg-detail-toggle:hover {
  background: var(--pg-colors-row-hover, #f0f7ff);
  color: var(--pg-colors-text-primary, #1e293b);
}
.pg-detail-resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  cursor: row-resize;
  background: transparent;
  transition: background var(--pg-transitions-duration-fast, 100ms);
}
.pg-detail-resize-handle:hover {
  background: var(--pg-colors-resize-handle-color, #e2e8f0);
}

`;
