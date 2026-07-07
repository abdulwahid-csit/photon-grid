/**
 * Photon Grid base styles — tooltip section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const tooltipCss = `/* ──────────────────── Custom cell tooltip ────────────────────
 * Only mounted/shown for columns with renderer.tooltip — plain columns keep
 * using the free native title attribute. Positioned via a transform set
 * in JS relative to .pg-grid__body so it never affects grid layout. */
.pg-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: var(--pg-z-index-tooltip, 150);
  max-width: 320px;
  padding: var(--pg-spacing-xs, 6px) var(--pg-spacing-sm, 10px);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-tooltip-bg, #1f2937);
  color: var(--pg-colors-tooltip-text, #ffffff);
  font-family: var(--pg-typography-font-family, sans-serif);
  font-size: var(--pg-typography-font-size-xs, 12px);
  line-height: 1.4;
  box-shadow: var(--pg-shadows-dropdown, 0 4px 12px rgba(0, 0, 0, 0.15));
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity var(--pg-transitions-duration-fast, 100ms),
    visibility var(--pg-transitions-duration-fast, 100ms);
}
.pg-tooltip--visible {
  opacity: 1;
  visibility: visible;
}

`;
