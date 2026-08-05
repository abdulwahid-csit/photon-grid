/**
 * Photon Grid base styles — root section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const rootCss = `
/* ──────────────────── Root ──────────────────── */

/* Per-grid portal host: the <body>-level element that overlays (context menus,
   dropdown panels, the column chooser, toasts, drag ghosts) are appended into so
   they resolve the theme of the grid that opened them rather than the shared
   document root. See theme/overlay-portal.ts.

   \`display: contents\` is load-bearing, not cosmetic: the host must carry the
   scope id, mode and variant for CSS matching while generating no box at all.
   With no box it adds no layout, establishes no containing block — so a
   \`position: fixed\` overlay inside still resolves against the viewport — and
   cannot clip its children. Custom properties and \`color-scheme\` still inherit
   through it, because inheritance follows the element tree, not the box tree. */
.pg-portal-host { display: contents; }

.pg-grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-row-background, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: var(--pg-typography-font-family, "Inter", system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-md, 0.8rem);
  text-fit: width; 
  font-weight: var(--pg-typography-font-weight-regular, 400);
  box-sizing: border-box;
  position: relative;
  --pg-scroll-x: 0px;
  --pg-scroll-y: 0px;
  --pg-row-origin-y: 0px;
  --pg-row-offset-y: 0px;
  --pg-content-height: 0px;
  --pg-center-content-width: 0px;
  --pg-left-panel-width: auto;
  --pg-right-panel-width: auto;
  /* Height of the band currently occupied by sticky rows (Master/Detail or
     Tree Data ancestors) — published per frame by GridRenderer.performRender,
     0 when nothing is stuck. Bounds the sticky layer's pinned-edge shadow;
     see master-detail.css.ts. */
  --pg-sticky-block-height: 0px;
  --pg-header-row-height: 44px;
  --pg-filter-row-height: 36px;
}
.pg-grid *, .pg-grid *::before, .pg-grid *::after { box-sizing: border-box; }

/* ──────────────────── Outer flex-row / main flex-col wrappers ──────────────────── */
.pg-grid-outer {
  display: flex;
  flex-direction: row;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}
.pg-grid-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

`;
