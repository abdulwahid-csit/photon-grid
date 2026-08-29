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
  /* Same rebased offset the data-row panels use — detail containers are
     positioned by RowPositionSheet too, so they must share its origin.
     See the note above .pg-panel__content in panels.css.ts. */
  transform: translateY(var(--pg-row-offset-y, 0px));
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
/* Pinned-edge shadow PATCH for the sticky band only — deliberately NOT a
   full-height divider.
   The real, full-height pinned-edge shadow lives on .pg-grid__body >
   .pg-panel--left/--right (panels.css.ts), one stacking level *below*
   .pg-detail-layer, so an expanded detail row's opaque full-width background
   covers it and the shadow can never stripe across detail content. This layer
   sits *above* the detail layer (z-index 3), so anything painted here would
   punch straight back through a detail row — which is exactly the artefact
   these pseudo-elements are height-bounded to avoid.
   What they patch: a stuck row's own opaque cells sit at z-index 3 and cover
   the panel-level shadow for that row's height, leaving a visible gap in the
   divider wherever a sticky row currently is. --pg-sticky-block-height (see
   GridRenderer.performRender) is exactly the stacked height of the rows
   currently parked in this layer — 0px when none are — so the patch spans the
   stuck band and not one pixel more.
   Drawn as pseudo-elements of the layer itself rather than on the region
   elements below: those set overflow:hidden (to clip their rows), which also
   clips an outward box-shadow, and their height is 100% by structural
   necessity — the two constraints that made the old full-height shadow bleed
   over detail rows in the first place.
   z-index: 2 is required, not cosmetic — this shadow bleeds sideways into
   .pg-sticky-layer__center's own horizontal space, whose row backgrounds are
   opaque; without it, ::before would lose to a later-painted sibling. */
.pg-sticky-layer::before,
.pg-sticky-layer::after {
  content: "";
  position: absolute;
  top: 0;
  height: var(--pg-sticky-block-height, 0px);
  pointer-events: none;
  z-index: 2;
}
.pg-sticky-layer::before {
  left: 0;
  width: var(--pg-left-panel-width, 0px);
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.08);
}

.pg-sticky-layer::after {
  right: 0;
  width: var(--pg-right-panel-width, 0px);
  box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.08);
}
/* z-index: 2 keeps a stuck row's pinned cells above the center region's own
   (z-index: 1) — the same pinned-column elevation .pg-panel--left has. */
.pg-sticky-layer__left {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--pg-left-panel-width, 0px);
  overflow: hidden;
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
/* Right-side twin of .pg-sticky-layer__left — see the note above it. The
   pinned-edge shadow is on .pg-sticky-layer::after, not here. */
.pg-sticky-layer__right {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: var(--pg-right-panel-width, 0px);
  overflow: hidden;
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
/* Content wrapper for a custom detail component (masterDetail.renderer).
   Must have NO height of its own: that is what makes its measured size the
   component's natural content height rather than an echo of the row height
   Photon just assigned it, which is what keeps DetailComponentHost's
   ResizeObserver free of a feedback loop.

   align-self is what actually enforces that. The container also carries
   .pg-row, which is display:flex + align-items:stretch — so without this the
   host would be a stretched flex item with a *definite* cross size equal to
   the row's content box, and every measurement would read back the height
   Photon had just set. Combined with the Math.ceil in measureContentHeight, a
   fractional layout height (device-pixel snapping on a scaled display) then
   ratchets the panel one pixel taller per measurement instead of settling. */
.pg-detail-component-host {
  width: 100%;
  align-self: flex-start;
}
/* Fixed-height / user-resizable rows take their height from somewhere other
   than the content, so the host fills the row instead of measuring it —
   applied when detailAutoHeight is false or detailResizable is on. There is no
   measurement to protect on that path, so the stretch is restored. */
.pg-detail-component-host--fill {
  align-self: stretch;
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
/* Shown in place of a nested grid when an expanded row has no detail content
   (EmptyDetailToggleMode.Interactive) — mirrors the grid's own no-rows overlay
   so both read as the same state at two different scales. */
.pg-detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pg-spacing-xs, 4px);
  width: 100%;
  height: 100%;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-detail-empty__text {
  font-size: var(--pg-typography-font-size-sm, 0.75rem);
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
/* Inert spacer with the toggle's exact box metrics (EmptyDetailToggleMode.
   Placeholder) — keeps the toggle column's left edge straight on rows with no
   detail without offering an affordance that leads nowhere. Every property
   here must track .pg-detail-toggle's box above; nothing else. */
.pg-detail-toggle-placeholder {
  display: inline-flex;
  flex-shrink: 0;
  width: var(--pg-group-toggle-size, 24px);
  height: var(--pg-group-toggle-size, 24px);
  margin-left: 8px;
  margin-right: 4px;
  pointer-events: none;
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
