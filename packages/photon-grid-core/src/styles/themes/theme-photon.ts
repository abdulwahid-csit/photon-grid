/**
 * `pg-photon-theme` — **airy editorial**.
 *
 * The document register: no grid border, no vertical rules, hairline row
 * dividers at low opacity, micro-caps column headings with wide tracking, and
 * the most generous density of the four. A warm amber accent marks state
 * without ever filling a region.
 *
 * The organising idea is *restraint*: this theme removes lines rather than
 * adding them, so the data is the only thing with weight on the page. That is
 * why selection is a rail with no fill, why the header has a hairline rule and
 * no background, and why radii are near-zero — a rounded chip would be the most
 * decorative object on screen.
 *
 * See `theme-ion.ts` for the shared rules on selector roots (container class vs
 * `[data-pg-variant]` for portaled overlays) and on why row height is not set
 * in CSS.
 */
export const themePhotonCss = `

/* ── Tokens ───────────────────────────────────────────────────────────────── */

.pg-photon-theme .pg-grid,
[data-pg-variant="photon"] .pg-context-menu,
[data-pg-variant="photon"] .pg-column-context-menu,
[data-pg-variant="photon"] .pg-col-chooser__overlay,
[data-pg-variant="photon"] .pg-dropdown-editor__panel,
[data-pg-variant="photon"] .pg-toast-layer {
  --pg-colors-primary: #b45309;
  --pg-colors-primary-hover: #92400e;
  --pg-colors-primary-active: #78350f;
  --pg-colors-primary-subtle: color-mix(in srgb, #b45309 5%, transparent);
  --pg-colors-primary-subtle-hover: color-mix(in srgb, #b45309 9%, transparent);
  --pg-colors-primary-soft: color-mix(in srgb, #b45309 16%, transparent);

  /* Chrome is the same surface as the data — the theme has no gutter. */
  --pg-colors-header-background: transparent;
  --pg-colors-filter-background: transparent;
  --pg-colors-footer-background: transparent;
  --pg-colors-group-row-background: transparent;
  --pg-colors-scrollbar-bg: transparent;
  --pg-colors-scrollbar-track: transparent;

  /* A neutral wash for hover, so the accent is reserved for real state. */
  --pg-colors-row-hover: color-mix(in srgb, var(--pg-colors-text-primary) 4%, transparent);
  --pg-colors-row-selected: var(--pg-colors-primary-subtle);
  --pg-colors-chip-background: transparent;
  --pg-colors-chip-text: var(--pg-colors-text-secondary);
  --pg-colors-group-zone-over: var(--pg-colors-primary-subtle);

  /* Larger body text than any other variant — this theme trades rows for
     legibility on purpose. */
  --pg-typography-font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  --pg-typography-font-size-md: 14px;
  --pg-typography-font-size-sm: 13px;
  --pg-typography-font-size-xs: 11px;
  --pg-typography-header-font-weight: 600;
  --pg-typography-letter-spacing-wide: 0.1em;
  --pg-typography-line-height-base: 1.6;

  --pg-header-row-height: 48px;

  /* Near-square: a rounded corner would read as ornament here. */
  --pg-borders-radius-lg: 2px;
  --pg-borders-radius-md: 2px;
  --pg-borders-radius-sm: 0px;
  --pg-borders-radius-pill: 2px;
  --pg-borders-width-focus: 1px;
  --pg-sizing-checkbox-size: 15px;

  --pg-transitions-duration-fast: 120ms;
  --pg-transitions-duration-base: 180ms;

  /* Muted earth tones — chart marks should sit *in* the page, not on top of it. */
  --pg-chart-series-1: #b45309;
  --pg-chart-series-2: #4d7c0f;
  --pg-chart-series-3: #0f766e;
  --pg-chart-series-4: #9f1239;
  --pg-chart-series-5: #4338ca;
  --pg-chart-series-6: #78716c;
}

/* ── Shell — borderless ───────────────────────────────────────────────────── */

.pg-photon-theme .pg-grid {
  border: none;
  border-radius: 0;
  background: var(--pg-colors-surface);
}

/* Vertical rules off, whatever the grid option says: this theme separates
   columns with whitespace, and a single vertical line would undo that. */
.pg-photon-theme .pg-cell--v-border {
  border-right-color: transparent;
}

/* ── Header — micro-caps over a hairline ──────────────────────────────────── */

.pg-photon-theme .pg-th {
  text-transform: uppercase;
  font-size: 10px;
  font-weight: var(--pg-typography-header-font-weight);
  letter-spacing: var(--pg-typography-letter-spacing-wide);
  color: var(--pg-colors-text-secondary);
}

.pg-photon-theme .pg-grid__header {
  border-bottom: 1px solid var(--pg-colors-border-strong);
}

.pg-photon-theme .pg-th--sorted { color: var(--pg-colors-primary); }

.pg-photon-theme .pg-th--sortable:hover { color: var(--pg-colors-text-primary); }

/* ── Rows and cells ───────────────────────────────────────────────────────── */

/* Hairline dividers at a third strength — present enough to track a row across
   the page, faint enough not to draw the eye. */
.pg-photon-theme .pg-row {
  border-bottom: 1px solid color-mix(in srgb, var(--pg-colors-border) 40%, transparent);
}

.pg-photon-theme .pg-cell {
  line-height: var(--pg-typography-line-height-base);
}

/* Selection is a rail and nothing else — no fill, because a filled band would
   be the heaviest object in a theme built on whitespace. */
.pg-photon-theme .pg-row--selected {
  box-shadow: inset 2px 0 0 var(--pg-colors-primary);
}

/* ── Focus — an outline with breathing room, not a filled ring ────────────── */

.pg-photon-theme .pg-th:focus-visible,
.pg-photon-theme .pg-cell:focus-visible,
.pg-photon-theme .pg-pagination__btn:focus-visible {
  outline: 1px solid var(--pg-colors-primary);
  outline-offset: 2px;
  box-shadow: none;
}

/* ── Checkbox — hairline square, accent tick on a light fill ──────────────── */

.pg-photon-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: var(--pg-sizing-checkbox-size);
  height: var(--pg-sizing-checkbox-size);
  border: 1px solid var(--pg-colors-border-strong);
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition:
    background var(--pg-transitions-duration-fast) ease,
    border-color var(--pg-transitions-duration-fast) ease;
}
.pg-photon-theme .pg-checkbox:hover { border-color: var(--pg-colors-primary); }
.pg-photon-theme .pg-checkbox:focus-visible {
  outline: 1px solid var(--pg-colors-primary);
  outline-offset: 2px;
}
.pg-photon-theme .pg-checkbox:checked,
.pg-photon-theme .pg-checkbox:indeterminate {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-photon-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4.5px;
  top: 1.5px;
  width: 4px;
  height: 8px;
  border: 1.5px solid var(--pg-colors-on-primary);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-photon-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 50%;
  width: 7px;
  height: 1.5px;
  background: var(--pg-colors-on-primary);
  transform: translateY(-50%);
}

/* ── Grouping bar — underlined labels, no chip fill ───────────────────────── */

.pg-photon-theme .pg-group-drop-zone {
  border-bottom: 1px solid color-mix(in srgb, var(--pg-colors-border) 40%, transparent);
}

.pg-photon-theme .pg-group-chip {
  background: transparent;
  color: var(--pg-colors-text-primary);
  border: none;
  border-bottom: 1px solid var(--pg-colors-primary);
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 0.04em;
}

/* ── Footer / pagination ──────────────────────────────────────────────────── */

.pg-photon-theme .pg-grid__footer {
  border-top: 1px solid color-mix(in srgb, var(--pg-colors-border) 40%, transparent);
}

.pg-photon-theme .pg-pagination__btn {
  border-radius: 0;
}
.pg-photon-theme .pg-pagination__btn:hover:not(:disabled) {
  color: var(--pg-colors-primary);
  background: transparent;
  box-shadow: inset 0 -1px 0 var(--pg-colors-primary);
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

.pg-photon-theme .pg-icon { color: var(--pg-colors-text-disabled); }
.pg-photon-theme .pg-th--sorted .pg-icon { color: var(--pg-colors-primary); }
.pg-photon-theme .pg-row-drag-handle { color: var(--pg-colors-text-disabled); }

/* ── Overlays — the only place this theme allows a shadow ─────────────────── */

[data-pg-variant="photon"] .pg-context-menu,
[data-pg-variant="photon"] .pg-column-context-menu,
[data-pg-variant="photon"] .pg-dropdown-editor__panel {
  border-radius: var(--pg-borders-radius-md);
  border: 1px solid var(--pg-colors-border);
  box-shadow: var(--pg-shadows-dropdown);
}

[data-pg-variant="photon"] .pg-context-menu__item:hover,
[data-pg-variant="photon"] .pg-col-ctx-menu__item:hover {
  background: color-mix(in srgb, var(--pg-colors-text-primary) 4%, transparent);
  color: var(--pg-colors-primary);
}

[data-pg-variant="photon"] .pg-toast {
  border-radius: var(--pg-borders-radius-md);
}

/* ── Motion — the slowest of the four; nothing snaps ──────────────────────── */

.pg-photon-theme .pg-grid--row-dragging .pg-row {
  transition:
    background var(--pg-transitions-duration-base) ease,
    top 180ms cubic-bezier(0.25, 0.1, 0.25, 1);
}
`;
