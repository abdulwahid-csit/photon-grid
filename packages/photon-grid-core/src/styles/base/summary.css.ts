/**
 * Photon Grid base styles — summary rows section.
 *
 * Concatenated (in order) by base-styles.ts; edit here, not there. Registered
 * immediately after `panels.css.ts` because a summary band mirrors the panel
 * structure and must be able to override panel-level rules it inherits.
 *
 * Every colour, spacing, font and radius resolves through a `--pg-*` theme
 * token, so summary rows follow light/dark, every variant, and any host token
 * override with no code here. The only literal dimensions are the two gutter
 * widths, which MUST stay byte-identical to `.pg-th--checkbox` / `.pg-th--serial`
 * in `header.css.ts` — they are the same physical column, and a mismatch shifts
 * every summary cell out of alignment with its header.
 */
export const summaryCss = `/* ──────────────────── Summary band ──────────────────── */
/* One horizontal strip of summary rows anchored to an edge of the body.
   Mirrors .pg-grid__header's three-panel flex row so a summary cell lines up
   with its column through the same --pg-left/right-panel-width variables the
   header and body already publish — no measurement, no per-frame sync. */
.pg-summary {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  z-index: 6;
  background: var(--pg-colors-summary-background, var(--pg-colors-header-background, #f8fafc));
  color: var(--pg-colors-summary-text, var(--pg-colors-text-primary, #0f172a));
  font-weight: var(--pg-typography-font-weight-semibold, 600);
}
/* A band with no rows must not reserve its border or background. */
.pg-summary--empty {
  display: none;
}
/* Docked above the first data row: the divider belongs on its underside. */
.pg-summary--top {
  border-bottom: 1px solid var(--pg-colors-summary-border, var(--pg-colors-border, #e2e8f0));
}
/* Docked below the last data row: divider on top, and a lift so the band reads
   as floating above content scrolling underneath it. */
.pg-summary--bottom {
  border-top: 1px solid var(--pg-colors-summary-border, var(--pg-colors-border, #e2e8f0));
}
.pg-summary--sticky.pg-summary--bottom {
  box-shadow: var(--pg-shadows-summary-bottom, 0 -2px 4px rgba(0, 0, 0, 0.04));
}
.pg-summary--sticky.pg-summary--top {
  box-shadow: var(--pg-shadows-summary-top, 0 2px 4px rgba(0, 0, 0, 0.04));
}

/* ── In-content (non-sticky) bands ──────────────────────────────────────────
   These scroll with the data instead of docking. They live in an absolutely
   positioned layer inside .pg-grid__body and are moved by --pg-summary-offset-y,
   which GridRenderer computes in JS doubles every frame.
   Deliberately NOT a CSS calc() of scroll position: the value is always within a
   viewport's worth of zero, which keeps it clear of the float32 rasterisation
   limit that forces the data rows through origin rebasing (see the note above
   .pg-panel__content in panels.css.ts).
   No box-shadow here — an in-content band is part of the content, and a lift
   would make it read as pinned. */
.pg-summary-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: var(--pg-scrollbar-v-live-width, 0px);
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 2;
}
.pg-summary--inline {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  transform: translateY(var(--pg-summary-offset-y, 0px));
  pointer-events: auto;
  box-shadow: none;
}

/* ──────────────────── Regions ──────────────────── */
/* Left / center / right, sized exactly like the body panels they sit above or
   below. The center region clips, and its inner strip carries the same
   translateX the center header inner uses — so horizontal scrolling is free. */
.pg-summary__region {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
}
.pg-summary__region--left {
  width: var(--pg-left-panel-width, 0px);
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  z-index: 2;
}
.pg-summary__region--center {
  flex: 1 1 0;
  min-width: 0;
}
.pg-summary__region--right {
  width: calc(var(--pg-right-panel-width, 0px) - 1px);
  border-left: 1px solid var(--pg-colors-border, #e2e8f0);
  z-index: 2;
}
.pg-summary__region-inner {
  display: flex;
  flex-direction: column;
  width: var(--pg-center-content-width, 100%);
  transform: translateX(var(--pg-scroll-x, 0px));
}
/* Mirrors the vertical scrollbar's flex item in the body row, exactly as
   .pg-header-vscroll-spacer does — without it the band's center region is one
   scrollbar wider than the body's and right-pinned cells shift. */
.pg-summary__vscroll-spacer {
  flex-shrink: 0;
  width: var(--pg-scrollbar-v-live-width, 0px);
}

/* ──────────────────── Rows ──────────────────── */
/* Height is written inline per row (each summary row may set its own), so it is
   deliberately absent here. */
.pg-summary__row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex-shrink: 0;
  box-sizing: border-box;
}
.pg-summary__row + .pg-summary__row {
  border-top: 1px solid var(--pg-colors-summary-row-border, var(--pg-colors-border, #e2e8f0));
}

/* ──────────────────── Cells ──────────────────── */
/* Width comes from ColumnStyleManager's generated [data-col-id] rule, which is
   what makes a column resize update summary cells in the same frame as the
   header and body. Only spanned cells and spacers override it inline. */
.pg-summary__cell {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
  padding: 0 var(--pg-spacing-sm, 8px);
  font-size: var(--pg-typography-font-size-sm, 13px);
  line-height: var(--pg-typography-line-height-normal, 1.5);
}
.pg-summary__cell--v-border {
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-summary__cell--align-right  { justify-content: flex-end;  text-align: right; }
.pg-summary__cell--align-center { justify-content: center;    text-align: center; }
/* Gutter widths: see the file header — these MUST match header.css.ts. */
.pg-summary__cell--checkbox {
  width: 44px;
  min-width: 44px;
  max-width: 44px;
  padding: 0;
}
.pg-summary__cell--serial {
  width: 52px;
  min-width: 52px;
  max-width: 52px;
  padding: 0;
}
.pg-summary__cell--group {
  padding: 0 var(--pg-spacing-sm, 8px);
}
/* Filler for columns outside the horizontal virtual window. Never painted, so
   it carries no border or padding that could show through. */
.pg-summary__spacer {
  flex-shrink: 0;
  pointer-events: none;
}
.pg-summary__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

`;
