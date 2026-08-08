/**
 * `pg-ion-theme` — **crisp enterprise**.
 *
 * The register of a dense internal tool: a tinted chrome gutter separating
 * structure from data, hairline rules on every axis, an electric-blue accent
 * that only ever marks state, and 6px radii. Nothing decorative — the grid
 * should read as an instrument.
 *
 * ## How a variant is built
 *
 * A variant is a *cosmetic skin* layered over the active colour mode, so it must
 * be **mode-agnostic**: every colour below either resolves a mode token
 * (`var(--pg-colors-*)`) or is `color-mix`ed against one, and the same rules
 * therefore produce a correct light and dark rendering. The accent hue is the
 * only literal, and it is re-derived into the accent ramp so every tint, state
 * layer and focus ring moves with it.
 *
 * Two selector roots are in play, and the difference matters:
 *
 * - `.pg-ion-theme .pg-…` — scoped to the grid container. Correct per instance,
 *   so two grids on one page can wear different skins.
 * - `[data-pg-variant="ion"] .pg-…` — matches from the document root. Required
 *   for context menus, dropdown panels, the column chooser and toasts, which are
 *   portaled to `<body>` and are therefore *outside* the container. Without it,
 *   overlays keep the unskinned base look.
 *
 * Body row height is deliberately absent: rows are positioned with inline
 * `top`/`height`, so density comes from `THEME_VARIANT_ROW_HEIGHT` in
 * `types/theme.types.ts`. Header height is CSS-driven and does live here.
 */
export const themeIonCss = `

/* ── Tokens ───────────────────────────────────────────────────────────────── */

.pg-ion-theme .pg-grid,
[data-pg-variant="ion"] .pg-context-menu,
[data-pg-variant="ion"] .pg-column-context-menu,
[data-pg-variant="ion"] .pg-col-chooser__overlay,
[data-pg-variant="ion"] .pg-dropdown-editor__panel,
[data-pg-variant="ion"] .pg-toast-layer {
  /* Accent identity. The ramp is derived from one hue, so re-pitching the theme
     is a single-line change rather than a search across every component rule. */
  --pg-colors-primary: #2563eb;
  --pg-colors-primary-hover: #1d4ed8;
  --pg-colors-primary-active: #1e40af;
  --pg-colors-primary-subtle: color-mix(in srgb, #2563eb 7%, transparent);
  --pg-colors-primary-subtle-hover: color-mix(in srgb, #2563eb 12%, transparent);
  --pg-colors-primary-soft: color-mix(in srgb, #2563eb 18%, transparent);

  /* The "chrome" surface: one tint shared by every non-data region — header,
     filter row, footer, scrollbars, grouping bar and the serial gutter. Defined
     once so the structure/data boundary can be re-pitched from a single line. */
  --pg-ion-chrome: var(--pg-colors-background-alt);
  --pg-colors-header-background: var(--pg-ion-chrome);
  --pg-colors-filter-background: var(--pg-ion-chrome);
  --pg-colors-footer-background: var(--pg-ion-chrome);
  --pg-colors-scrollbar-bg: var(--pg-ion-chrome);
  --pg-colors-scrollbar-track: var(--pg-ion-chrome);
  --pg-colors-group-row-background: var(--pg-ion-chrome);
  --pg-colors-group-footer-background: var(--pg-ion-chrome);

  --pg-colors-row-hover: var(--pg-colors-primary-subtle);
  --pg-colors-row-selected: var(--pg-colors-primary-subtle-hover);
  --pg-colors-chip-background: var(--pg-colors-primary-soft);
  --pg-colors-chip-text: var(--pg-colors-primary);
  --pg-colors-group-zone-over: var(--pg-colors-primary-subtle);

  /* Typography — system UI, tight sizes, no tracking games. */
  --pg-typography-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --pg-typography-font-size-md: 13px;
  --pg-typography-font-size-sm: 12px;
  --pg-typography-font-size-xs: 11px;
  --pg-typography-header-font-weight: 600;
  --pg-typography-letter-spacing-wide: 0.01em;

  --pg-header-row-height: 40px;

  --pg-borders-radius-lg: 8px;
  --pg-borders-radius-md: 6px;
  --pg-borders-radius-sm: 4px;
  --pg-borders-radius-pill: 9999px;
  --pg-borders-width-focus: 3px;
  --pg-sizing-checkbox-size: 16px;

  --pg-transitions-duration-fast: 130ms;
  --pg-transitions-duration-base: 160ms;

  /* Chart palette — a cool, evenly-spaced sequence that holds its ordering in
     both modes. Read at runtime by resolveChartTheme(). */
  --pg-chart-series-1: #2563eb;
  --pg-chart-series-2: #0891b2;
  --pg-chart-series-3: #7c3aed;
  --pg-chart-series-4: #0d9488;
  --pg-chart-series-5: #db2777;
  --pg-chart-series-6: #ca8a04;
}

/* ── Shell ────────────────────────────────────────────────────────────────── */

.pg-ion-theme .pg-grid {
  border: 1px solid var(--pg-colors-border);
  border-radius: var(--pg-borders-radius-lg);
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────────────────────── */

.pg-ion-theme .pg-th {
  text-transform: capitalize;
  font-size: 13px;
  font-weight: var(--pg-typography-header-font-weight);
  letter-spacing: 0;
  color: var(--pg-colors-header-text);
}

.pg-ion-theme .pg-grid__header {
  border-bottom: 1px solid var(--pg-colors-header-border);
}

/* A sorted column is marked on the cell, not only its icon — at a glance the
   whole column reads as active. */
.pg-ion-theme .pg-th--sorted {
  color: var(--pg-colors-primary);
  background: var(--pg-colors-primary-subtle);
}

.pg-ion-theme .pg-th--sortable:hover {
  background: var(--pg-colors-header-hover);
}

/* ── Rows and cells ───────────────────────────────────────────────────────── */

.pg-ion-theme .pg-row {
  border-bottom: 1px solid var(--pg-colors-border);
}

/* Selection is a 2px accent rail over the row wash: legible instantly without
   fighting the row's own background, and it survives alternate-row shading. */
.pg-ion-theme .pg-row--selected {
  box-shadow: inset 2px 0 0 var(--pg-colors-primary);
}

/* The number gutter reads as chrome rather than data. */
.pg-ion-theme .pg-cell--serial,
.pg-ion-theme .pg-th--serial,
.pg-ion-theme .pg-filter-cell--serial,
.pg-ion-theme .pg-th--no-group {
  background: var(--pg-ion-chrome);
}

/* ── Focus ────────────────────────────────────────────────────────────────── */

.pg-ion-theme .pg-th:focus-visible,
.pg-ion-theme .pg-cell:focus-visible,
.pg-ion-theme .pg-pagination__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--pg-borders-width-focus)
    color-mix(in srgb, var(--pg-colors-primary) 25%, transparent);
}

/* ── Checkbox — 4px square, solid accent on check ─────────────────────────── */

.pg-ion-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: var(--pg-sizing-checkbox-size);
  height: var(--pg-sizing-checkbox-size);
  border: 2px solid var(--pg-colors-checkbox-border);
  border-radius: var(--pg-borders-radius-sm);
  background: var(--pg-colors-checkbox-background);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition:
    background var(--pg-transitions-duration-fast) ease,
    border-color var(--pg-transitions-duration-fast) ease,
    box-shadow var(--pg-transitions-duration-fast) ease;
}
.pg-ion-theme .pg-checkbox:hover { border-color: var(--pg-colors-primary); }
.pg-ion-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pg-colors-primary) 25%, transparent);
}
.pg-ion-theme .pg-checkbox:checked,
.pg-ion-theme .pg-checkbox:indeterminate {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-ion-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: 2px solid var(--pg-colors-on-primary);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-ion-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 8px;
  height: 2px;
  background: var(--pg-colors-on-primary);
  transform: translateY(-50%);
}

/* ── Grouping bar ─────────────────────────────────────────────────────────── */

.pg-ion-theme .pg-group-drop-zone {
  background: var(--pg-ion-chrome);
  border-bottom: 1px solid var(--pg-colors-border);
}

.pg-ion-theme .pg-group-chip {
  background: var(--pg-colors-chip-background);
  color: var(--pg-colors-chip-text);
  border-radius: var(--pg-borders-radius-pill);
  border: 1px solid color-mix(in srgb, var(--pg-colors-primary) 28%, transparent);
  font-weight: 500;
}

/* ── Footer / pagination ──────────────────────────────────────────────────── */

.pg-ion-theme .pg-grid__footer {
  border-top: 1px solid var(--pg-colors-footer-border);
}

.pg-ion-theme .pg-pagination__btn {
  border-radius: var(--pg-borders-radius-sm);
  transition: background var(--pg-transitions-duration-fast) ease;
}
.pg-ion-theme .pg-pagination__btn:hover:not(:disabled) {
  background: var(--pg-colors-primary-subtle);
  color: var(--pg-colors-primary);
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

.pg-ion-theme .pg-icon { color: var(--pg-colors-text-secondary); }
.pg-ion-theme .pg-th--sorted .pg-icon { color: var(--pg-colors-primary); }
.pg-ion-theme .pg-row-drag-handle { color: var(--pg-colors-text-disabled); }

/* ── Overlays ─────────────────────────────────────────────────────────────────
   Portaled to <body>, so these are rooted at [data-pg-variant] rather than at
   the container class — see the module doc. Without this block the menus keep
   the base look while the grid behind them is skinned. */

[data-pg-variant="ion"] .pg-context-menu,
[data-pg-variant="ion"] .pg-column-context-menu,
[data-pg-variant="ion"] .pg-dropdown-editor__panel {
  border-radius: var(--pg-borders-radius-md);
  border: 1px solid var(--pg-colors-border-ctxt-menu);
  box-shadow: var(--pg-shadows-dropdown);
}

[data-pg-variant="ion"] .pg-context-menu__item,
[data-pg-variant="ion"] .pg-col-ctx-menu__item {
  border-radius: var(--pg-borders-radius-sm);
  margin: 0 4px;
}
[data-pg-variant="ion"] .pg-context-menu__item:hover,
[data-pg-variant="ion"] .pg-col-ctx-menu__item:hover {
  background: var(--pg-colors-primary-subtle);
  color: var(--pg-colors-primary);
}

[data-pg-variant="ion"] .pg-toast {
  border-radius: var(--pg-borders-radius-md);
}

/* ── Motion ───────────────────────────────────────────────────────────────── */

.pg-ion-theme .pg-grid--row-dragging .pg-row {
  transition:
    background var(--pg-transitions-duration-fast) ease,
    top 130ms cubic-bezier(0.2, 0, 0, 1);
}
`;
