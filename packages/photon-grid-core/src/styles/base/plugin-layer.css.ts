/**
 * Structural CSS for plugin-owned layers.
 *
 * Lives in the base sheet rather than in any plugin because it is *structure*,
 * not appearance — every plugin layer needs the same absolute positioning and
 * the same scrollbar inset, and duplicating it per plugin would let them drift.
 * It is ~10 lines and matches no elements unless a plugin mounts a layer.
 *
 * Appearance is entirely the plugin's own: this sets no colour, no font, and no
 * background. See `.pg-detail-layer` in `master-detail.css.ts` — the layer this
 * one generalises.
 */
export const pluginLayerCss = `
/* ──────────── Plugin layers ────────────
   A sibling of the pinned/centre panels, spanning the full grid body. The
   right inset keeps the layer clear of the live vertical scrollbar, matching
   .pg-detail-layer; without it a layer paints underneath the scrollbar and its
   right-most content becomes unreachable.

   pointer-events: none by default so empty regions of the layer never steal
   clicks from the rows beneath -- individual children opt back in with
   pointer-events: auto. */
.pg-plugin-layer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: var(--pg-scrollbar-v-live-width, 0px);
  overflow: hidden;
  /* Transform origin must be the layer's own box so followRowOrigin /
     followScrollX translate in the same space the panels do. */
  transform-origin: 0 0;
  will-change: transform;
}
`;
