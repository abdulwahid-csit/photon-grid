/**
 * `pg-classic-theme` — **the default skin**, pitched to match AG Grid's Quartz.
 *
 * Applied automatically when a grid names no `variant` and no legacy `theme`
 * (see `GridCore.initialize`), so it is the look most Photon grids ship with.
 *
 * ## How Quartz is built, and why this mirrors it
 *
 * Quartz derives its entire palette from **three literals** — a background, a
 * foreground and an accent — and `color-mix`es everything else out of them.
 * That is why the theme holds together: borders, chrome, disabled text and
 * every state wash are all the same two hues at different strengths, so nothing
 * can drift out of tune when one value is edited.
 *
 * This file reproduces that construction exactly:
 *
 * - `--pg-classic-bg` / `--pg-classic-fg` / `--pg-classic-accent` are the only
 *   literals. Every other colour below is a `color-mix` against one of them.
 * - Dark mode re-pitches **only those three** (plus the handful Quartz itself
 *   overrides), and the whole skin follows. See the `[data-pg-mode="dark"]`
 *   block.
 *
 * Values are taken from `ag-theme-quartz.css` (ag-grid-community 32.3.3) rather
 * than eyeballed, including the mix percentages. The notable ones:
 *
 * | Quartz variable                   | Value                                  |
 * |-----------------------------------|----------------------------------------|
 * | `--ag-active-color`               | `#2196f3`                              |
 * | `--ag-background-color`           | `#fff`                                 |
 * | `--ag-foreground-color`           | `#181d1f`                              |
 * | `--ag-border-color`               | fg at 15%                              |
 * | `--ag-header-background-color`    | bg mixed with fg at 2%                 |
 * | `--ag-menu-background-color`      | bg mixed with fg at 3%                 |
 * | `--ag-menu-border-color`          | fg at 20%                              |
 * | `--ag-row-hover-color`            | accent at 12%                          |
 * | `--ag-selected-row-background-color` | accent at 8%                        |
 * | `--ag-range-selection-background-color` | accent at 20%                    |
 * | `--ag-border-radius`              | `4px` (controls)                       |
 * | `--ag-wrapper-border-radius`      | `8px` (the grid's own edge)            |
 * | `--ag-font-size`                  | `14px`                                 |
 * | `--ag-header-height`              | `48px` (`font-size + grid-size * 4.25`)|
 * | `--ag-row-height`                 | `42px` (`font-size + grid-size * 3.5`) |
 *
 * ## Three things Quartz deliberately does *not* do
 *
 * 1. **No header hover.** Quartz defines no hover state on header cells; the
 *    only affordances that light up are the menu and filter buttons. There is
 *    no `.pg-th:hover` rule below, and the base stylesheet's equivalents are
 *    already commented out — leave both that way.
 * 2. **No vertical column separators.** Quartz leaves
 *    `--ag-header-column-separator-display` at its `none` default, so the header
 *    reads as one band ruled off from the data by a single bottom border.
 * 3. **No zebra striping.** Quartz defines no odd-row colour at all. Photon's
 *    `rowShading` is opt-in, so the alt-row token is kept but pitched at the
 *    same 2% as the header — a stripe the host asked for, in Quartz's own key.
 *
 * ## How a variant is built
 *
 * A variant is a *cosmetic skin* layered over the active colour mode. Two
 * selector roots are in play, and the difference matters:
 *
 * - `.pg-classic-theme .pg-…` — scoped to the grid container. Correct per
 *   instance, so two grids on one page can wear different skins.
 * - `[data-pg-variant="classic"] .pg-…` — matches the per-grid **portal host**
 *   (`theme/overlay-portal.ts`), a `display: contents` element in `<body>` that
 *   carries this grid's scope, mode and variant. Required for context menus,
 *   dropdown panels, the column chooser and toasts, which are portaled out of
 *   the container and would otherwise resolve whichever grid last wrote to the
 *   document root.
 *
 * Body row height is deliberately absent from the CSS: rows are positioned with
 * inline `top`/`height`, so density comes from `THEME_VARIANT_ROW_HEIGHT` in
 * `types/theme.types.ts`, where classic carries Quartz's 42px.
 */
export const themeClassicCss = `

/* ── Tokens ───────────────────────────────────────────────────────────────── */

.pg-classic-theme .pg-grid,
[data-pg-variant="classic"] .pg-context-menu,
[data-pg-variant="classic"] .pg-col-ctx-menu,
[data-pg-variant="classic"] .pg-col-ctx-menu__submenu,
[data-pg-variant="classic"] .pg-actions-menu,
[data-pg-variant="classic"] .pg-col-chooser__overlay,
[data-pg-variant="classic"] .pg-dropdown-editor__panel,
[data-pg-variant="classic"] .pg-long-text-overlay,
[data-pg-variant="classic"] .pg-avatar-overlay,
[data-pg-variant="classic"] .pg-toast-layer,
[data-pg-variant="classic"] .pg-confirm-backdrop,
[data-pg-variant="classic"] .pg-drag-preview,
[data-pg-variant="classic"] .pg-col-drag-ghost {
  /* ── The three literals everything else is mixed from ── */
  --pg-classic-bg: #fff;
  --pg-classic-fg: #181d1f;
  --pg-classic-accent: #2196f3;

  /* Two chrome planes, exactly Quartz's: the header band sits 2% toward the
     foreground, menus and floating panels 3%. Named so both stay re-pitchable
     from one place and cannot drift apart as regions are added. */
  --pg-classic-chrome: color-mix(in srgb, var(--pg-classic-bg), var(--pg-classic-fg) 2%);
  --pg-classic-menu: color-mix(in srgb, var(--pg-classic-bg), var(--pg-classic-fg) 3%);
  /* Menus and panels carry a heavier edge than the grid's interior hairlines. */
  --pg-classic-menu-border: color-mix(in srgb, transparent, var(--pg-classic-fg) 20%);

  /* Interaction washes for the small chrome controls that sit *on* the chrome
     planes — the header's funnel and overflow buttons today, anything similar
     added later. They are foreground tints rather than a flat colour on purpose:
     mixed against transparent they compose over whichever plane the control
     happens to sit on (header band, filter row, a pinned panel) instead of
     stamping one plane's colour onto another, and because --pg-classic-fg
     flips with the mode they re-pitch themselves in dark without a second
     definition.

     They cannot resolve --pg-colors-background-alt, which is what the base
     stylesheet uses: in this skin that token *is* the header band, so a hover
     drawn from it repaints the header in the header's own colour and nothing
     appears to happen. */
  --pg-classic-control-hover: color-mix(in srgb, transparent, var(--pg-classic-fg) 9%);
  --pg-classic-control-pressed: color-mix(in srgb, transparent, var(--pg-classic-fg) 16%);

  /* ── Accent ── */
  --pg-colors-primary: var(--pg-classic-accent);
  --pg-colors-primary-hover: color-mix(in srgb, var(--pg-classic-accent), #000 12%);
  --pg-colors-primary-active: color-mix(in srgb, var(--pg-classic-accent), #000 24%);
  --pg-colors-primary-light: color-mix(in srgb, transparent, var(--pg-classic-accent) 20%);
  --pg-colors-primary-contrast: #fff;
  --pg-colors-on-primary: #fff;
  --pg-colors-primary-text: #fff;
  /* The three accent washes Quartz actually ships: selection 8%, hover 12%,
     range 20%. Every state tint below resolves one of these. */
  --pg-colors-primary-subtle: color-mix(in srgb, transparent, var(--pg-classic-accent) 8%);
  --pg-colors-primary-subtle-hover: color-mix(in srgb, transparent, var(--pg-classic-accent) 12%);
  --pg-colors-primary-soft: color-mix(in srgb, transparent, var(--pg-classic-accent) 20%);

  --pg-colors-secondary: color-mix(in srgb, transparent, var(--pg-classic-fg) 70%);
  --pg-colors-secondary-hover: color-mix(in srgb, transparent, var(--pg-classic-fg) 85%);

  /* ── Surfaces ── */
  /* Pitched at the chrome plane, i.e. the same colour as the header band
     (--pg-colors-header-background below), so panels and sections that paint
     themselves with --pg-colors-surface read as one continuous piece of chrome
     with the header instead of punching the grid's ground colour through it.
     Re-pitches itself in dark mode with --pg-classic-chrome. */
  --pg-colors-surface: var(--pg-classic-chrome);
  --pg-colors-surface-raised: var(--pg-classic-bg);
  --pg-colors-surface-overlay: var(--pg-classic-menu);
  --pg-colors-surface-sunken: var(--pg-classic-chrome);
  --pg-colors-background: var(--pg-classic-bg);
  /* Toolbar, tool panels and the grouping bar read this one. */
  --pg-colors-background-alt: var(--pg-classic-chrome);

  /* ── Borders ── */
  --pg-colors-border: color-mix(in srgb, transparent, var(--pg-classic-fg) 15%);
  --pg-colors-border-strong: var(--pg-classic-menu-border);
  --pg-colors-border-focus: var(--pg-classic-accent);
  --pg-colors-border-ctxt-menu: var(--pg-colors-border);

  /* ── Text ── */
  --pg-colors-text-primary: var(--pg-classic-fg);
  --pg-colors-text-secondary: color-mix(in srgb, transparent, var(--pg-classic-fg) 70%);
  --pg-colors-text-disabled: color-mix(in srgb, transparent, var(--pg-classic-fg) 50%);
  --pg-colors-text-inverse: var(--pg-classic-bg);

  /* ── Header ── */
  --pg-colors-header-background: var(--pg-classic-chrome);
  --pg-colors-header-text: var(--pg-classic-fg);
  --pg-colors-header-border: var(--pg-colors-border);
  /* Quartz has no header hover. This token is *not* pointed at the header
     background, because it is also the hover for column-menu items and the
     serial-selection gutter, where a highlight is correct. The header simply
     ships no :hover rule — see the note in this file's header. */
  --pg-colors-header-hover: var(--pg-colors-primary-subtle-hover);

  /* ── Rows and cells ── */
  --pg-colors-row-background: var(--pg-classic-bg);
  /* Quartz defines no odd-row colour; Photon's shading is opt-in, so this is
     pitched at the header's 2% rather than switched off. */
  --pg-colors-row-background-alt: var(--pg-classic-chrome);
  --pg-colors-row-hover: var(--pg-colors-primary-subtle-hover);
  --pg-colors-row-selected: var(--pg-colors-primary-subtle);
  --pg-colors-row-selected-border: color-mix(in srgb, transparent, var(--pg-classic-accent) 40%);
  --pg-colors-cell-edit-background: var(--pg-classic-bg);
  --pg-colors-cell-edit-border: var(--pg-classic-accent);
  --pg-colors-selection-background: var(--pg-colors-primary-soft);
  --pg-colors-selection-border: var(--pg-classic-accent);
  --pg-colors-selection-corner: var(--pg-classic-accent);
  --pg-colors-pinned-background: var(--pg-classic-bg);
  --pg-colors-pinned-border: var(--pg-colors-border);

  /* ── Structural bands ── */
  --pg-colors-filter-background: var(--pg-classic-chrome);
  --pg-colors-filter-border: var(--pg-colors-border);
  --pg-colors-filter-active-background: var(--pg-colors-primary-subtle);
  --pg-colors-filter-active-border: var(--pg-classic-accent);
  --pg-colors-footer-background: var(--pg-classic-chrome);
  --pg-colors-footer-text: var(--pg-classic-fg);
  --pg-colors-footer-border: var(--pg-colors-border);
  --pg-colors-group-row-background: var(--pg-classic-chrome);
  --pg-colors-group-row-border: var(--pg-colors-border);
  --pg-colors-group-row-hover: var(--pg-colors-primary-subtle);
  --pg-colors-group-row-text: var(--pg-classic-fg);
  --pg-colors-group-footer-background: var(--pg-classic-chrome);
  --pg-colors-group-footer-hover: var(--pg-colors-primary-subtle);
  --pg-colors-group-zone-over: var(--pg-colors-primary-subtle);
  --pg-colors-group-toggle-hover: color-mix(in srgb, transparent, var(--pg-classic-fg) 7%);
  --pg-colors-agg-text: var(--pg-colors-text-secondary);

  /* ── Scrollbars ── */
  --pg-colors-scrollbar-bg: var(--pg-classic-chrome);
  --pg-colors-scrollbar-track: var(--pg-classic-chrome);
  --pg-colors-scrollbar-thumb: color-mix(in srgb, transparent, var(--pg-classic-fg) 25%);
  --pg-colors-scrollbar-thumb-hover: color-mix(in srgb, transparent, var(--pg-classic-fg) 40%);

  /* ── Controls ── */
  /* Quartz's unchecked box is the background mixed 30% toward the foreground —
     a solid edge rather than a tint, so an empty checkbox is unmistakable. */
  --pg-colors-checkbox-border: color-mix(in srgb, var(--pg-classic-bg), var(--pg-classic-fg) 30%);
  --pg-colors-checkbox-background: var(--pg-classic-bg);
  --pg-colors-checkbox-checked-background: var(--pg-classic-accent);
  --pg-colors-resize-handle-color: var(--pg-colors-border);
  --pg-colors-resize-handle-active-color: var(--pg-classic-accent);

  /* ── Chips and badges ── */
  --pg-colors-chip-background: color-mix(in srgb, transparent, var(--pg-classic-fg) 7%);
  --pg-colors-chip-text: var(--pg-classic-fg);
  --pg-colors-badge-background: var(--pg-colors-primary-subtle-hover);
  --pg-colors-badge-text: var(--pg-colors-primary-active);

  /* ── Drag ── */
  --pg-colors-drag-preview-background: var(--pg-classic-menu);
  --pg-colors-drag-preview-border: var(--pg-classic-menu-border);
  --pg-colors-drag-over-highlight: var(--pg-colors-primary-subtle);
  --pg-colors-drag-ghost-background: var(--pg-classic-menu);
  --pg-colors-drag-ghost-border-color: var(--pg-classic-menu-border);
  --pg-colors-row-drag-ghost: var(--pg-classic-menu);

  /* ── Overlays and feedback ── */
  --pg-colors-tooltip-background: var(--pg-classic-chrome);
  --pg-colors-tooltip-text: var(--pg-classic-fg);
  --pg-colors-overlay: color-mix(in srgb, transparent, var(--pg-classic-fg) 45%);
  --pg-colors-overlay-loading: color-mix(in srgb, transparent, var(--pg-classic-bg) 66%);
  --pg-colors-skeleton: color-mix(in srgb, transparent, var(--pg-classic-fg) 12%);
  --pg-colors-skeleton-highlight: color-mix(in srgb, transparent, var(--pg-classic-fg) 6%);

  /* ── Status ── */
  /* Quartz names only an invalid colour; the rest hold its saturation level. */
  --pg-colors-error: #e02525;
  --pg-colors-danger: #e02525;
  --pg-colors-success: #24a148;
  --pg-colors-warning: #f1c21b;
  --pg-colors-info: var(--pg-classic-accent);
  --pg-colors-error-subtle: color-mix(in srgb, transparent, #e02525 8%);
  --pg-colors-danger-soft: color-mix(in srgb, transparent, #e02525 12%);

  /* ── Typography ── */
  /* Quartz's own stack. IBM Plex Sans is not bundled — it is listed first so a
     host that loads it gets an exact match, and the system fallbacks (which are
     Quartz's too) carry every other host. */
  --pg-typography-font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  --pg-typography-font-size-md: 14px;
  --pg-typography-font-size-sm: 13px;
  --pg-typography-font-size-xs: 12px;
  --pg-typography-font-size-lg: 15px;
  --pg-typography-header-font-weight: 500;

  /* ── Geometry ── */
  /* font-size + grid-size * 4.25 = 14 + 34. */
  --pg-header-row-height: 48px;
  --pg-filter-row-height: 40px;
  /* Quartz separates the grid's own edge (8px) from every control inside it
     (4px); collapsing the two is what makes a lookalike read as "not quite". */
  --pg-borders-radius-lg: 8px;
  --pg-borders-radius-md: 4px;
  --pg-borders-radius-sm: 4px;
  --pg-borders-width-focus: 2px;
  --pg-sizing-checkbox-size: 16px;
  --pg-sizing-icon-size-md: 16px;
  --pg-spacing-md: 16px;

  /* ── Shadows ── */
  --pg-shadows-dropdown: 0 0 16px 0 rgba(0, 0, 0, 0.15);
  --pg-shadows-dialog: 0 0 16px 0 rgba(0, 0, 0, 0.15);
  --pg-shadows-lg: 0 1px 4px 1px rgba(186, 191, 199, 0.4);
  --pg-shadows-md: 0 1px 4px 1px rgba(186, 191, 199, 0.4);
  --pg-shadows-sm: 0 1px 4px 1px rgba(186, 191, 199, 0.4);
  --pg-shadows-tooltip: 0 1px 4px 1px rgba(186, 191, 199, 0.4);

  --pg-transitions-duration-fast: 120ms;
  --pg-transitions-duration-base: 160ms;

  /* ── Charts ── */
  /* Quartz's accent leads; the rest are evenly spaced hues at the same
     saturation so ordering survives both modes. */
  --pg-chart-series-1: #2196f3;
  --pg-chart-series-2: #009688;
  --pg-chart-series-3: #7e57c2;
  --pg-chart-series-4: #ff7043;
  --pg-chart-series-5: #ec407a;
  --pg-chart-series-6: #9ccc65;
}

/* Dark counterpart. Quartz re-pitches only the literals and the handful of
   values whose mix direction has to invert, and the derived palette above
   follows on its own — which is the whole point of deriving it.

   Written against the container and the portal host, and never against an
   arbitrary ancestor: \`[data-pg-mode="dark"] .pg-classic-theme .pg-grid\` would
   also match a light classic grid nested inside a dark one (Master/Detail
   mounts a full grid per expanded row), and used to match every grid on the
   page back when the mode was mirrored onto \`<html>\`. \`ThemeManager\` puts the
   mode attribute and the variant class on the same container, so the compound
   selector is both sufficient and safe. */
.pg-classic-theme[data-pg-mode="dark"] .pg-grid,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-context-menu,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-col-ctx-menu,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-col-ctx-menu__submenu,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-actions-menu,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-col-chooser__overlay,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-dropdown-editor__panel,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-long-text-overlay,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-avatar-overlay,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-toast-layer,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-confirm-backdrop,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-drag-preview,
[data-pg-mode="dark"][data-pg-variant="classic"] .pg-col-drag-ghost {
  /* Quartz's dark ground is a desaturated navy, not neutral black. */
  --pg-classic-bg: color-mix(in srgb, #fff, #182230 97%);
  --pg-classic-fg: #fff;

  /* Chrome now lifts *away* from the ground rather than sinking into it, so
     these two cannot be the light mixes read in reverse. */
  --pg-classic-chrome: color-mix(in srgb, #fff, #182230 93%);
  --pg-classic-menu: color-mix(in srgb, var(--pg-classic-bg), #fff 10%);
  --pg-classic-menu-border: color-mix(in srgb, transparent, #fff 10%);

  /* Flat white at 15% reads heavier on a dark ground than on a light one. */
  --pg-colors-border: rgba(255, 255, 255, 0.16);

  /* Quartz lifts both washes in dark mode and collapses selected onto hover:
     an 8% tint is invisible over a dark ground. */
  --pg-colors-row-hover: color-mix(in srgb, transparent, var(--pg-classic-accent) 20%);
  --pg-colors-row-selected: var(--pg-colors-row-hover);
  --pg-colors-header-hover: var(--pg-colors-row-hover);

  --pg-colors-checkbox-border: color-mix(in srgb, var(--pg-classic-bg), var(--pg-classic-fg) 40%);
  --pg-colors-tooltip-background: color-mix(in srgb, #fff, #182230 96%);

  --pg-shadows-dropdown: 0 0 20px rgba(0, 0, 0, 0.3);
  --pg-shadows-dialog: 0 0 20px rgba(0, 0, 0, 0.3);
  --pg-shadows-lg: 0 1px 20px 1px #000;
  --pg-shadows-md: 0 1px 20px 1px #000;
  --pg-shadows-sm: 0 1px 20px 1px #000;
  --pg-shadows-tooltip: 0 1px 20px 1px #000;

  --pg-colors-skeleton: rgba(202, 203, 204, 0.4);
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

/* Header labels read as words, not as a shouted band. The base sheet uppercases
   every .pg-th; Quartz does not, and neither does this skin — a column called
   "Full Name" is drawn "Full Name".

   Nothing is transformed on the way in: an omitted header is already derived in
   Title Case by ColumnModel (fullName → "Full Name"), so "none" gives Title Case
   for the default and leaves an explicit header exactly as the author wrote it —
   which "capitalize" would not, mangling "eBay ID" into "EBay ID".

   Also lands on the grouping column's own header and on column-group headers,
   both of which carry .pg-th. */
.pg-classic-theme .pg-th {
  color: var(--pg-colors-header-text);
  font-size: var(--pg-typography-font-size-md);
  font-weight: var(--pg-typography-header-font-weight);
  letter-spacing: 0;
  text-transform: none;
}

/* Two rules are deliberately absent here: a hover state on header cells, and an
   adjacent-sibling separator between them. Quartz ships neither. See the "three
   things Quartz deliberately does not do" note at the top of this file before
   adding either back. */

/* ── Applied sort / filter: shape, never colour ─────────────────────────────
   A sorted or filtered column announces itself with a *glyph* — the direction
   arrow appears, the funnel fills in — and nothing else moves. The header text
   stays the same colour as every other header, and both icons keep the muted
   tone they wear at rest.

   This is what AG Grid does, and the reason is legibility rather than taste: an
   accent-coloured header label reads as a link, so on a grid sorted by three
   columns the eye is drawn to the chrome instead of to the data. The state is
   still fully conveyed — by an icon that is either there or not, which also
   survives greyscale printing and does not depend on colour perception.

   These override the base stylesheet's accent rules for the same states. Equal
   specificity, and the variant sheet is concatenated after the base one (see
   styles/base-styles.ts), so later-wins settles it without !important. */
.pg-classic-theme .pg-th--sorted {
  color: var(--pg-colors-header-text);
}

/* Opacity is deliberately left at the base rule's 1: the arrow is the entire
   state indicator, so it has to be visible — it just isn't accented. */
.pg-classic-theme .pg-th.pg-th--sort-asc .pg-th__sort-icon,
.pg-classic-theme .pg-th.pg-th--sort-desc .pg-th__sort-icon {
  color: var(--pg-colors-text-secondary);
}

/* The label of a filtered column, which the base sheet also accents. */
.pg-classic-theme .pg-th.pg-th--filter-active .pg-th__label {
  color: inherit;
}

/* Same for both funnels — the header button and the filter row's own icon.
   Full opacity (they are applied, so they stay legible and permanently
   visible) at the colour they wear when they are not. */
.pg-classic-theme .pg-th__filter-btn--active,
.pg-classic-theme .pg-filter-cell__icon--active {
  color: var(--pg-colors-text-secondary);
}

/* ── Header affordances: the funnel and the overflow button ─────────────────
   These two are the only things in a classic header that light up (see the "no
   header hover" note at the top), so they have to do it convincingly.

   One box for both. The base sheet pads them differently — 4px on the funnel,
   6px on the "⋮" — which is invisible while they are transparent and obvious the
   moment a hover wash is painted behind them: two pills of different sizes,
   vertically off-centre against each other. A fixed square at the control radius
   makes them read as a pair and gives each a 20px target, comfortably above the
   14px glyph it holds.

   The resting tone is unified for the same reason: the base sheet parts them at
   0.7 and 0.6, a difference that is visible at this size and justified by
   nothing. */
.pg-classic-theme .pg-th__filter-btn,
.pg-classic-theme .pg-th__menu-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  align-items: center;
  justify-content: center;
  border-radius: var(--pg-borders-radius-sm);
  opacity: 0.75;
  color: var(--pg-colors-text-secondary);
  /* The base rule transitions opacity and background but not colour on the
     overflow button; restated here as one shorthand so both buttons resolve the
     same three properties and neither can snap while the other fades. */
  transition:
    background var(--pg-transitions-duration-fast) ease,
    color var(--pg-transitions-duration-fast) ease,
    opacity var(--pg-transitions-duration-fast) ease;
}

/* An applied funnel stays fully legible at rest — it is the entire indicator
   that the column is filtered. Restated because the rule above pitches the
   resting opacity for both buttons at equal specificity and would otherwise dim
   it back down. */
.pg-classic-theme .pg-th__filter-btn--active {
  opacity: 1;
}

/* Hover: the wash carries the state and the glyph goes to full foreground.
   Colour is deliberately *not* the accent — an accent-tinted funnel reads as
   "filter applied" rather than "the pointer is here", and applied state in this
   skin is carried by the glyph alone (see the section above). */
.pg-classic-theme .pg-th__filter-btn:hover,
.pg-classic-theme .pg-th__menu-btn:hover {
  opacity: 1;
  color: var(--pg-colors-text-primary);
  background: var(--pg-classic-control-hover);
}

/* Pressed, and — for the overflow button — held open. --active on the menu
   button means "its menu is on screen", so it keeps the pressed wash for as long
   as the menu is up, which is what ties the popup to the button that opened it.
   (On the funnel, --active means "this column is filtered", a different thing
   entirely, handled above.) */
.pg-classic-theme .pg-th__filter-btn:active,
.pg-classic-theme .pg-th__menu-btn:active,
.pg-classic-theme .pg-th__menu-btn--active {
  opacity: 1;
  color: var(--pg-colors-text-primary);
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

/* Quartz's cell padding is grid-size * 2. */
.pg-classic-theme .pg-cell__inner {
  padding: 0 12px;
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

/* An inset ring rather than an outline: an outline on an element at the edge of
   a scroll container is clipped, and on a pinned column it is painted over by
   the neighbouring panel.

   .pg-cell is deliberately absent. Cells are not focus-ringed by the theme —
   the grid draws its own indicator on .pg-cell--active-cell (see
   base/cells.css.ts, which sets "outline: none" on .pg-cell for exactly this
   reason) and that class is what moves with the arrow keys.

   A .pg-cell:focus-visible rule here does not merely duplicate it, it strands
   it: CellSelectionEngine.moveActiveCell moves the active-cell *class* without
   moving DOM focus, so focus stays on whichever cell was first clicked. Add the
   rule back and that cell keeps a ring for the rest of the navigation — two
   ringed cells at once, one of them wrong. If cells should ever carry a real
   focus ring, the engine has to move focus with the active cell first. */
.pg-classic-theme .pg-th:focus-visible,
.pg-classic-theme .pg-pagination__btn:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 var(--pg-borders-width-focus) var(--pg-colors-primary);
}

/* Quartz's input focus: the accent border plus a 47% halo, on every control the
   grid owns. One rule rather than per-control, so a control added later is
   already correct. */
.pg-classic-theme .pg-filter-input:focus,
.pg-classic-theme .pg-filter-cond__input:focus,
.pg-classic-theme .pg-filter-cond__select:focus,
.pg-classic-theme .pg-filter-set__search-input:focus,
[data-pg-variant="classic"] .pg-col-ctx-menu input:focus,
[data-pg-variant="classic"] .pg-col-ctx-menu select:focus {
  outline: none;
  border-color: var(--pg-colors-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, transparent, var(--pg-colors-primary) 47%);
}

/* ── Menus, panels and the filters tool panel ─────────────────────────────── */

/* Quartz paints every floating surface from one colour — menus, popups, tool
   panels and the column chooser all sit on --ag-menu-background-color, 3% toward
   the foreground, with a heavier 20% border than the grid's interior hairlines.
   That single plane is what makes its overlays read as one system, so classic
   reproduces it rather than splitting menus from panels.
 *
 * Portaled nodes live in a per-grid portal host outside .pg-grid, so they are
 * matched from [data-pg-variant] (carried by that host — see
 * theme/overlay-portal.ts). The in-grid panels take the container-scoped root. */
[data-pg-variant="classic"] .pg-context-menu,
[data-pg-variant="classic"] .pg-context-menu__sub,
[data-pg-variant="classic"] .pg-col-ctx-menu,
[data-pg-variant="classic"] .pg-col-ctx-menu__submenu,
[data-pg-variant="classic"] .pg-actions-menu,
[data-pg-variant="classic"] .pg-col-chooser,
[data-pg-variant="classic"] .pg-dropdown-editor__panel,
[data-pg-variant="classic"] .pg-long-text-overlay,
[data-pg-variant="classic"] .pg-avatar-overlay,
[data-pg-variant="classic"] .pg-toast,
.pg-classic-theme .pg-filters-panel,
.pg-classic-theme .pg-filter-panel,
.pg-classic-theme .pg-import-menu {
  background: var(--pg-classic-menu);
  border-color: var(--pg-classic-menu-border);
  box-shadow: var(--pg-shadows-dropdown);
}

/* Hover states have to move with the surface. The menus' defaults read
   --pg-colors-background-alt / --pg-colors-header-hover, and on the menu plane
   a chrome-tinted hover would be invisible. The accent wash is used instead,
   matching the row hover, so the highlight stays legible in both modes. */
[data-pg-variant="classic"] .pg-context-menu__item:hover,
[data-pg-variant="classic"] .pg-col-ctx-menu__item:hover,
[data-pg-variant="classic"] .pg-col-ctx-menu__item:focus,
[data-pg-variant="classic"] .pg-col-ctx-menu__item:focus-visible,
[data-pg-variant="classic"] .pg-actions-menu__item:hover:not(:disabled),
.pg-classic-theme .pg-filters-panel__close:hover {
  background: var(--pg-colors-primary-subtle-hover);
}

/* Separators inside a menu: --pg-colors-border is pitched to divide rows against
   the grid background and all but vanishes on the raised menu plane. */
[data-pg-variant="classic"] .pg-context-menu__sep,
[data-pg-variant="classic"] .pg-col-ctx-menu__separator {
  background: var(--pg-classic-menu-border);
  border-top-color: var(--pg-classic-menu-border);
}

/* Any control the user types into or picks from, wherever it lands inside a
   menu, takes the plain background so it reads as an input rather than as more
   chrome. Scoped to the menus rather than written per-control: the column menu
   embeds filter controls, and this keeps a control added later correct. */
[data-pg-variant="classic"] .pg-col-ctx-menu input:not([type='checkbox']):not([type='radio']),
[data-pg-variant="classic"] .pg-col-ctx-menu select,
[data-pg-variant="classic"] .pg-context-menu input:not([type='checkbox']):not([type='radio']),
[data-pg-variant="classic"] .pg-context-menu select,
.pg-classic-theme .pg-filter-panel input:not([type='checkbox']):not([type='radio']),
.pg-classic-theme .pg-filter-panel select {
  background: var(--pg-colors-surface);
  border-color: var(--pg-colors-border);
  border-radius: var(--pg-borders-radius-md);
}

/* Inside the filters tool panel the relationship inverts: the panel is now the
   raised plane, so the pieces that used to lift off it take the grid background
   instead — otherwise section heads and the add button dissolve into their own
   background. */
.pg-classic-theme .pg-filters-section__header,
.pg-classic-theme .pg-filters-panel__add-btn {
  background: var(--pg-colors-surface);
}

/* ── Menu anatomy ─────────────────────────────────────────────────────────── */

/* The grid ships two menu implementations — the row/range menu
   (.pg-context-menu, nested submenus) and the column menu (.pg-col-ctx-menu,
   portaled fly-outs) — which grew separate item metrics, separate icon muting
   (colour vs opacity) and separate chevrons. Side by side in the same grid the
   difference reads as sloppiness, so classic re-states both from one set of
   rules. Everything below is deliberately paired: whatever is said about one
   menu is said about the other. */

/* A floating menu takes the wrapper radius, not the control radius: at 4px a
   192px-wide popup reads as a rectangle with the corners filed off. */
[data-pg-variant="classic"] .pg-context-menu,
[data-pg-variant="classic"] .pg-context-menu__sub,
[data-pg-variant="classic"] .pg-col-ctx-menu,
[data-pg-variant="classic"] .pg-col-ctx-menu__submenu,
[data-pg-variant="classic"] .pg-actions-menu {
  padding: 6px;
  border-radius: var(--pg-borders-radius-sm);
}

/* One item shape for both menus: a pill that the hover wash fills, inset from
   the menu edge by the padding above. Without the radius the wash runs corner
   to corner and fights the menu's own rounding. */
[data-pg-variant="classic"] .pg-context-menu__item,
[data-pg-variant="classic"] .pg-col-ctx-menu__item,
[data-pg-variant="classic"] .pg-actions-menu__item {
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--pg-borders-radius-sm);
  font-size: var(--pg-typography-font-size-sm);
  font-weight: 500;
  line-height: 1.4;
  color: var(--pg-colors-text-primary);
  transition:
    background var(--pg-transitions-duration-fast) ease,
    color var(--pg-transitions-duration-fast) ease;
}

/* Fly-out items are the *same* text as the menu that opened them — same family,
   same size, same weight — and are separated from it by plane alone: their own
   surface, their own border, their own shadow, offset to the right.

   Weight is restated rather than left to inherit because the column menu's
   fly-out is portaled (see below): it is not a descendant of the menu it belongs
   to, so nothing about the parent's text reaches it by inheritance. A weight
   step here would also fight the reading order — the leaf is a refinement of the
   row above it ("Resize › Auto Size"), not a heading.

   The row menu nests its fly-out (.pg-context-menu__sub) while the column menu
   portals its own (.pg-col-ctx-menu__submenu); the descendant selector covers
   both, since a portaled submenu still lands inside the same portal host. */
[data-pg-variant="classic"] .pg-context-menu__sub .pg-context-menu__item,
[data-pg-variant="classic"] .pg-col-ctx-menu__submenu .pg-col-ctx-menu__item {
  font-size: var(--pg-typography-font-size-sm);
  font-weight: 500;
}

/* Icons are muted by *colour*, not opacity. Opacity fades the glyph toward the
   menu plane and makes a 16px stroke look broken up; a colour mix keeps it
   solid and lets the icon lift cleanly to the accent on hover. */
[data-pg-variant="classic"] .pg-context-menu__icon,
[data-pg-variant="classic"] .pg-col-ctx-menu__item-icon,
[data-pg-variant="classic"] .pg-actions-menu__icon {
  width: 16px;
  height: 16px;
  opacity: 1;
  color: color-mix(in srgb, transparent, var(--pg-classic-fg) 62%);
  transition: color var(--pg-transitions-duration-fast) ease;
}
[data-pg-variant="classic"] .pg-context-menu__icon svg,
[data-pg-variant="classic"] .pg-col-ctx-menu__item-icon svg,
[data-pg-variant="classic"] .pg-actions-menu__icon svg {
  width: 16px;
  height: 16px;
  display: block;
}

/* The icon carries the hover, not the label: colouring the text as well makes
   the whole row jump, while an accent glyph beside steady text reads as a
   pointer. */
[data-pg-variant="classic"] .pg-context-menu__item:hover > .pg-context-menu__icon,
[data-pg-variant="classic"] .pg-col-ctx-menu__item:hover .pg-col-ctx-menu__item-icon,
[data-pg-variant="classic"] .pg-col-ctx-menu__item:focus .pg-col-ctx-menu__item-icon,
[data-pg-variant="classic"] .pg-actions-menu__item:hover:not(:disabled) .pg-actions-menu__icon {
  color: var(--pg-colors-primary);
}

/* An applied state (the active sort, the chosen aggregate) is the one place the
   label itself takes the accent. 500 rather than 600 — at 13px the heavier
   weight sets the row apart more than "currently applied" warrants. */
[data-pg-variant="classic"] .pg-col-ctx-menu__item--active {
  color: var(--pg-colors-primary);
  font-weight: 500;
}
[data-pg-variant="classic"] .pg-col-ctx-menu__item--active .pg-col-ctx-menu__item-icon,
[data-pg-variant="classic"] .pg-col-ctx-menu__item-check {
  color: var(--pg-colors-primary);
  opacity: 1;
}

/* Shortcut hints sit right-aligned against the label. Tabular figures stop
   "Ctrl+X" and "Ctrl+C" from shifting width against each other down the list. */
[data-pg-variant="classic"] .pg-context-menu__kbd {
  font-size: var(--pg-typography-font-size-xs);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, transparent, var(--pg-classic-fg) 45%);
}

/* Both chevrons drawn the same way. The row menu's default is a "›" text glyph
   whose weight and vertical centring follow whatever font is loaded; a
   border-drawn caret matches the column menu's registry icon at any font, and
   holds its stroke on a HiDPI screen. */
[data-pg-variant="classic"] .pg-context-menu__item--has-sub::after {
  content: '';
  right: 11px;
  width: 6px;
  height: 6px;
  border: 0;
  border-right: 1.5px solid color-mix(in srgb, transparent, var(--pg-classic-fg) 45%);
  border-bottom: 1.5px solid color-mix(in srgb, transparent, var(--pg-classic-fg) 45%);
  transform: translateY(-50%) rotate(-45deg);
  transition: border-color var(--pg-transitions-duration-fast) ease;
}
[data-pg-variant="classic"] .pg-context-menu__item--has-sub:hover::after {
  border-right-color: var(--pg-colors-primary);
  border-bottom-color: var(--pg-colors-primary);
}
[data-pg-variant="classic"] .pg-col-ctx-menu__item-chevron {
  opacity: 1;
  color: color-mix(in srgb, transparent, var(--pg-classic-fg) 45%);
}
[data-pg-variant="classic"] .pg-col-ctx-menu__item--has-submenu:hover .pg-col-ctx-menu__item-chevron {
  opacity: 1;
  color: var(--pg-colors-primary);
}

/* Separators are inset to the pill's edges rather than run full-bleed, so they
   divide the items rather than cutting the menu in half. */
[data-pg-variant="classic"] .pg-context-menu__sep,
[data-pg-variant="classic"] .pg-col-ctx-menu__separator {
  height: 1px;
  margin: 5px 6px;
  border: 0;
}

/* One disabled treatment for both menus, matching Quartz's 50% disabled text. */
[data-pg-variant="classic"] .pg-context-menu__item--disabled,
[data-pg-variant="classic"] .pg-col-ctx-menu__item--disabled {
  opacity: 1;
  color: var(--pg-colors-text-disabled);
}
[data-pg-variant="classic"] .pg-context-menu__item--disabled .pg-context-menu__icon,
[data-pg-variant="classic"] .pg-col-ctx-menu__item--disabled .pg-col-ctx-menu__item-icon {
  color: var(--pg-colors-text-disabled);
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
  box-shadow: 0 0 0 3px color-mix(in srgb, transparent, var(--pg-colors-primary) 47%);
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
.pg-scrollbar-h-row{
  border-top: none;
}
  .pg-row-drag-ghost {
  // set the body text color to it
   color: var(--pg-classic-fg);
  }
`;
