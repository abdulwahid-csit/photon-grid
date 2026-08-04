/**
 * `pg-classic-theme` — **the default skin**.
 *
 * What a data grid should look like before anyone has expressed a preference:
 * a quiet grey chrome around white data, one hairline separating every
 * structural band from the rows, and colour reserved for state. It is applied
 * automatically when a grid names no `variant` and no legacy `theme`, so it is
 * the look most Photon grids will actually ship with — see `GridCore.initialize`.
 *
 * ## The chrome tint
 *
 * Every non-data region — header, filter row, footer, scrollbars, grouping bar,
 * toolbar, tool panels, the serial gutter, both context menus and the filters
 * tool panel — is painted from a single `--pg-classic-chrome` variable rather
 * than from its own token. That is what
 * makes the structure/data boundary re-pitchable from one line, and what stops
 * the eight regions drifting apart as each is edited. `#f8f9fa` in light: warm
 * enough to separate from `#fff` rows, light enough not to compete with them.
 *
 * ## How a variant is built
 *
 * A variant is a *cosmetic skin* layered over the active colour mode, so it must
 * be **mode-agnostic**: every colour below either resolves a mode token
 * (`var(--pg-colors-*)`) or is `color-mix`ed against one. The chrome tint is the
 * one exception, and it carries an explicit dark-mode counterpart for exactly
 * that reason.
 *
 * Two selector roots are in play, and the difference matters:
 *
 * - `.pg-classic-theme .pg-…` — scoped to the grid container. Correct per
 *   instance, so two grids on one page can wear different skins.
 * - `[data-pg-variant="classic"] .pg-…` — matches from the document root.
 *   Required for context menus, dropdown panels, the column chooser and toasts,
 *   which are portaled to `<body>` and are therefore *outside* the container.
 *
 * Body row height is deliberately absent: rows are positioned with inline
 * `top`/`height`, so density comes from `THEME_VARIANT_ROW_HEIGHT` in
 * `types/theme.types.ts` — where classic keeps the grid's existing default, so
 * becoming the default skin changes no layout.
 */
export const themeClassicCss = `

/* ── Tokens ───────────────────────────────────────────────────────────────── */

.pg-classic-theme .pg-grid,
[data-pg-variant="classic"] .pg-context-menu,
[data-pg-variant="classic"] .pg-col-ctx-menu,
[data-pg-variant="classic"] .pg-col-ctx-menu__submenu,
[data-pg-variant="classic"] .pg-col-chooser__overlay,
[data-pg-variant="classic"] .pg-dropdown-editor__panel,
[data-pg-variant="classic"] .pg-actions-menu,
[data-pg-variant="classic"] .pg-long-text-overlay,
[data-pg-variant="classic"] .pg-avatar-overlay,
[data-pg-variant="classic"] .pg-toast-layer {
  /* Accent identity. One hue, re-derived into the whole ramp, so re-pitching
     the theme is a single-line change rather than a search across every rule. */
  --pg-colors-primary: #2563eb;
  --pg-colors-primary-hover: #1d4ed8;
  --pg-colors-primary-active: #1e40af;
  --pg-colors-primary-subtle: color-mix(in srgb, #2563eb 6%, transparent);
  --pg-colors-primary-subtle-hover: color-mix(in srgb, #2563eb 11%, transparent);
  --pg-colors-primary-soft: color-mix(in srgb, #2563eb 16%, transparent);

  /* The chrome surface: one tint shared by every non-data region. */
  --pg-classic-chrome: #f8f9fa;
  --pg-colors-header-background: var(--pg-classic-chrome);
  --pg-colors-filter-background: var(--pg-classic-chrome);
  --pg-colors-footer-background: var(--pg-classic-chrome);
  --pg-colors-scrollbar-bg: var(--pg-classic-chrome);
  --pg-colors-scrollbar-track: var(--pg-classic-chrome);
  --pg-colors-group-row-background: var(--pg-classic-chrome);
  --pg-colors-group-footer-background: var(--pg-classic-chrome);
  /* Toolbar, tool panels and the grouping bar read this one. */
  --pg-colors-background-alt: var(--pg-classic-chrome);

  --pg-colors-row-hover: var(--pg-colors-primary-subtle);
  --pg-colors-row-selected: var(--pg-colors-primary-subtle-hover);
  --pg-colors-group-zone-over: var(--pg-colors-primary-subtle);

  /* Typography — system UI at a readable enterprise scale. */
  --pg-typography-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --pg-typography-font-size-md: 13px;
  --pg-typography-font-size-sm: 12px;
  --pg-typography-font-size-xs: 11px;
  --pg-typography-header-font-weight: 600;

  --pg-header-row-height: 42px;

  --pg-borders-radius-lg: 8px;
  --pg-borders-radius-md: 6px;
  --pg-borders-radius-sm: 4px;
  --pg-borders-width-focus: 2px;
  --pg-sizing-checkbox-size: 16px;

  --pg-transitions-duration-fast: 120ms;
  --pg-transitions-duration-base: 160ms;

  /* Chart palette — evenly spaced hues that hold their ordering in both modes. */
  --pg-chart-series-1: #2563eb;
  --pg-chart-series-2: #0d9488;
  --pg-chart-series-3: #7c3aed;
  --pg-chart-series-4: #ea580c;
  --pg-chart-series-5: #db2777;
  --pg-chart-series-6: #65a30d;
}

/* Dark counterpart of the chrome tint. The literal above is a light-mode value,
   so — unlike every other colour here, which resolves a mode token — it needs an
   explicit dark form or the chrome would stay near-white on a dark grid.
   Written against both roots because the variant class and \`data-pg-mode\` land
   on the same container, while portaled overlays see only the mirrored
   document-root attributes. */
[data-pg-mode="dark"] .pg-classic-theme .pg-grid,
.pg-classic-theme[data-pg-mode="dark"] .pg-grid,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-context-menu,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-col-ctx-menu,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-col-ctx-menu__submenu,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-col-chooser__overlay,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-dropdown-editor__panel,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-actions-menu,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-long-text-overlay,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-avatar-overlay,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-toast-layer {
  /* Mixed from the mode's own surface rather than being a second literal, so a
     re-pitched dark palette carries the chrome with it. */
  --pg-classic-chrome: color-mix(in srgb, var(--pg-colors-surface) 82%, #000 18%);
}

/* ── Shell ────────────────────────────────────────────────────────────────── */

.pg-classic-theme .pg-grid {
  border: 1px solid var(--pg-colors-border);
  border-radius: var(--pg-borders-radius-lg);
  /* Clips the corners of the header band and the horizontal scrollbar so the
     radius reads as the grid's own edge rather than a rectangle behind it. */
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────────────────────── */

/* The rule the whole theme hangs on: one hairline under the header is what
   separates the column names from the first row of data. Sits on the band, not
   on each cell, so it stays unbroken across pinned-panel boundaries. */
.pg-classic-theme .pg-grid__header {
  border-bottom: 1px solid var(--pg-colors-header-border);
}

.pg-classic-theme .pg-th {
  color: var(--pg-colors-header-text);
  font-size: var(--pg-typography-font-size-md);
  font-weight: var(--pg-typography-header-font-weight);
  letter-spacing: 0;
}

/* Column separators inside the header only. The body keeps its own vertical
   border option — a grid that shows none there should not gain them here. */
.pg-classic-theme .pg-th + .pg-th {
  box-shadow: inset 1px 0 0 var(--pg-colors-border);
}

.pg-classic-theme .pg-th--sortable:hover {
  background: var(--pg-colors-header-hover);
}

/* A sorted column is marked on the cell, not only on its icon, so the active
   column reads at a glance. */
.pg-classic-theme .pg-th--sorted {
  color: var(--pg-colors-primary);
}

/* ── Rows and cells ───────────────────────────────────────────────────────── */

.pg-classic-theme .pg-row {
  border-bottom: 1px solid var(--pg-colors-border);
}

/* Selection is a 2px accent rail over the row wash: legible instantly without
   fighting the row's own background, and it survives alternate-row shading. */
.pg-classic-theme .pg-row--selected {
  box-shadow: inset 2px 0 0 var(--pg-colors-primary);
}

/* The number gutter and the group-column header read as chrome, not as data. */
.pg-classic-theme .pg-cell--serial,
.pg-classic-theme .pg-th--serial,
.pg-classic-theme .pg-filter-cell--serial,
.pg-classic-theme .pg-th--no-group {
  background: var(--pg-classic-chrome);
}

/* ── Structural bands ─────────────────────────────────────────────────────── */

/* Each band carries the hairline on the edge that faces the data, so the grid
   reads as bands of chrome around a field of rows however many are enabled. */
.pg-classic-theme .pg-filter-row,
.pg-classic-theme .pg-group-drop-zone {
  border-bottom: 1px solid var(--pg-colors-border);
}

.pg-classic-theme .pg-grid__footer,
.pg-classic-theme .pg-summary--bottom {
  border-top: 1px solid var(--pg-colors-border);
}

/* ── Focus ────────────────────────────────────────────────────────────────── */

/* An inset ring rather than an outline: an outline on a cell at the edge of a
   scroll container is clipped, and on a pinned column it is painted over by the
   neighbouring panel. */
.pg-classic-theme .pg-th:focus-visible,
.pg-classic-theme .pg-cell:focus-visible,
.pg-classic-theme .pg-pagination__btn:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 var(--pg-borders-width-focus) var(--pg-colors-primary);
}

/* ── Menus and the filters tool panel ─────────────────────────────────────── */

/* Both context menus (row cells and column headers) and the filters tool panel
   are painted from the same chrome tint as the header instead of the raised
   surface white. They are grid *chrome*, not data, so they belong on the same
   plane as the header band — and because the tint is --pg-classic-chrome, they
   re-pitch with every other chrome region from that one variable.

   The two menus are portaled to <body>, so they are matched from the document
   root ([data-pg-variant], mirrored there by ThemeManager.applyVariant); the
   filters panel lives inside .pg-grid, so the container-scoped root is enough. */
[data-pg-variant="classic"] .pg-context-menu,
[data-pg-variant="classic"] .pg-col-ctx-menu,
[data-pg-variant="classic"] .pg-col-ctx-menu__submenu,
.pg-classic-theme .pg-filters-panel {
  background: var(--pg-classic-chrome);
}

/* Hover states have to move with the surface. Both menus' default hover reads
   --pg-colors-background-alt / --pg-colors-header-hover, and classic already
   points the former at the chrome tint — on a chrome-tinted menu that hover would
   be invisible. The accent wash is used instead, matching the row hover, so the
   highlight stays legible in light and dark alike. */
[data-pg-variant="classic"] .pg-context-menu__item:hover,
[data-pg-variant="classic"] .pg-col-ctx-menu__item:hover,
[data-pg-variant="classic"] .pg-col-ctx-menu__item:focus,
[data-pg-variant="classic"] .pg-col-ctx-menu__item:focus-visible,
.pg-classic-theme .pg-filters-panel__close:hover {
  background: var(--pg-colors-primary-subtle-hover);
}

/* Inside the panel the relationship inverts: the panel is now the chrome plane,
   so the pieces that used to lift off it with the chrome tint take the raised
   surface instead — otherwise section heads and the add button dissolve into
   their own background. */
.pg-classic-theme .pg-filters-section__header,
.pg-classic-theme .pg-filters-panel__add-btn {
  background: var(--pg-colors-surface);
}

/* ── Checkbox ─────────────────────────────────────────────────────────────── */

.pg-classic-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: var(--pg-sizing-checkbox-size);
  height: var(--pg-sizing-checkbox-size);
  border: 1px solid var(--pg-colors-checkbox-border);
  border-radius: var(--pg-borders-radius-sm);
  background: var(--pg-colors-checkbox-background);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition:
    background var(--pg-transitions-duration-fast) ease,
    border-color var(--pg-transitions-duration-fast) ease;
}
.pg-classic-theme .pg-checkbox:hover { border-color: var(--pg-colors-primary); }
.pg-classic-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pg-colors-primary) 25%, transparent);
}
.pg-classic-theme .pg-checkbox:checked,
.pg-classic-theme .pg-checkbox:indeterminate {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-classic-theme .pg-checkbox:checked::after {
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
.pg-classic-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 6px;
  width: 8px;
  height: 2px;
  background: var(--pg-colors-on-primary);
}
`;
