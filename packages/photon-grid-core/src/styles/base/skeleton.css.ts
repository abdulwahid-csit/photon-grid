/**
 * Photon Grid base styles — skeleton placeholder rows.
 *
 * Rendered by demand-loading row models (`rowModel: 'infinite'`) for rows whose
 * data has not arrived. The placeholder occupies the *exact* geometry of the
 * real row it will become — same height, same cell padding — so when the data
 * lands the swap changes only the ink, never the layout.
 *
 * Every value comes from theme tokens, so skeletons follow the active mode and
 * variant without configuration.
 */
export const skeletonCss = `/* ─── Skeleton (placeholder) rows ─── */

/* The bar is drawn on the cell's inner box rather than as an extra element, so
   a placeholder row allocates no DOM beyond an ordinary empty row. */
.pg-row--skeleton .pg-cell__inner::before {
  content: '';
  display: block;
  width: var(--pg-skeleton-width, 68%);
  height: var(--pg-skeleton-height, 10px);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-skeleton, var(--pg-colors-background-alt, #e2e8f0));
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    var(--pg-colors-skeleton-highlight, var(--pg-colors-surface, #f8fafc)) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: pg-skeleton-shimmer 1.2s ease-in-out infinite;
}

/* Vary the bar widths across columns so a screen of placeholders reads as
   "content loading" rather than as a rigid striped pattern. The cycle is short
   and deterministic, so rows do not appear to reshuffle as they scroll. */
.pg-row--skeleton .pg-cell:nth-child(3n)   .pg-cell__inner::before { width: 45%; }
.pg-row--skeleton .pg-cell:nth-child(3n+1) .pg-cell__inner::before { width: 80%; }

/* Placeholders are not interactive: no hover feedback, no text selection, and
   the pointer stays default so nothing invites a click that cannot work. */
.pg-row--skeleton {
  cursor: default;
  user-select: none;
}
.pg-row--skeleton:hover { background: inherit; }

@keyframes pg-skeleton-shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

/* Reduced motion: keep the placeholder legible as a static block rather than
   removing it, so the "not loaded yet" signal survives. */
@media (prefers-reduced-motion: reduce) {
  .pg-row--skeleton .pg-cell__inner::before {
    animation: none;
    background-image: none;
  }
}
`;
