/**
 * Photon Grid base styles — root section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const rootCss = `
/* ──────────────────── Root ──────────────────── */
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
  font-size: var(--pg-typography-font-size-md, 13px);
  box-sizing: border-box;
  position: relative;
  --pg-scroll-x: 0px;
  --pg-scroll-y: 0px;
  --pg-content-height: 0px;
  --pg-center-content-width: 0px;
  --pg-left-panel-width: auto;
  --pg-right-panel-width: auto;
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
