/**
 * `pg-neon-theme` — **high-contrast glow**.
 *
 * The technical/terminal register: a cyan accent that *emits* rather than
 * merely tints, sharp 2px corners, tabular numerals, an uppercase tracked
 * header, and a glow that marks focus, selection and the sorted column. Where
 * Ion whispers state with a 7% wash, Neon announces it.
 *
 * ## Making a glow mode-agnostic
 *
 * A bloom that reads as light against a dark surface reads as a *smudge*
 * against a white one. So the glow is expressed in two parts: an always-on
 * inner ring at full accent, which is crisp in both modes, plus an outer bloom
 * that is `color-mix`ed toward transparency and only opened up in dark mode via
 * `[data-pg-mode="dark"]`. Light mode gets a saturated ring; dark mode gets the
 * ring *and* the halo. Both are legible; neither is muddy.
 *
 * See `theme-ion.ts` for the shared rules on selector roots (container class vs
 * `[data-pg-variant]` for portaled overlays) and on why row height is not set
 * in CSS.
 */
export const themeNeonCss = `

/* ── Tokens ───────────────────────────────────────────────────────────────── */

.pg-neon-theme .pg-grid,
[data-pg-variant="neon"] .pg-context-menu,
[data-pg-variant="neon"] .pg-column-context-menu,
[data-pg-variant="neon"] .pg-col-chooser__overlay,
[data-pg-variant="neon"] .pg-dropdown-editor__panel,
[data-pg-variant="neon"] .pg-toast-layer {
  --pg-colors-primary: #06b6d4;
  --pg-colors-primary-hover: #0891b2;
  --pg-colors-primary-active: #0e7490;
  --pg-colors-primary-subtle: color-mix(in srgb, #06b6d4 10%, transparent);
  --pg-colors-primary-subtle-hover: color-mix(in srgb, #06b6d4 18%, transparent);
  --pg-colors-primary-soft: color-mix(in srgb, #06b6d4 26%, transparent);

  /* Glow, in two parts — see the module doc. The ring is opaque accent and
     works everywhere; the bloom stays a tint in light mode and is re-opened
     for dark mode below. */
  --pg-neon-ring: var(--pg-colors-primary);
  --pg-neon-bloom: color-mix(in srgb, #06b6d4 22%, transparent);

  --pg-colors-row-hover: var(--pg-colors-primary-subtle);
  --pg-colors-row-selected: var(--pg-colors-primary-subtle-hover);
  --pg-colors-chip-background: transparent;
  --pg-colors-chip-text: var(--pg-colors-primary);
  --pg-colors-scrollbar-thumb: color-mix(in srgb, #06b6d4 45%, transparent);
  --pg-colors-scrollbar-thumb-hover: var(--pg-colors-primary);
  --pg-colors-group-zone-over: var(--pg-colors-primary-soft);

  --pg-typography-font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --pg-typography-font-size-md: 12px;
  --pg-typography-font-size-sm: 11px;
  --pg-typography-font-size-xs: 10px;
  --pg-typography-header-font-weight: 700;
  --pg-typography-letter-spacing-wide: 0.1em;

  --pg-header-row-height: 38px;

  /* Sharp: this theme has no round corners anywhere. */
  --pg-borders-radius-lg: 3px;
  --pg-borders-radius-md: 2px;
  --pg-borders-radius-sm: 2px;
  --pg-borders-radius-pill: 2px;
  --pg-borders-width-focus: 1px;
  --pg-sizing-checkbox-size: 15px;

  --pg-transitions-duration-fast: 90ms;
  --pg-transitions-duration-base: 120ms;

  /* Saturated, high-chroma, maximally separated around the wheel. */
  --pg-chart-series-1: #06b6d4;
  --pg-chart-series-2: #d946ef;
  --pg-chart-series-3: #84cc16;
  --pg-chart-series-4: #f59e0b;
  --pg-chart-series-5: #3b82f6;
  --pg-chart-series-6: #f43f5e;
}

/* Dark mode has a dark field for the bloom to sit on, so it can open up. */
[data-pg-mode="dark"] .pg-neon-theme .pg-grid,
[data-pg-mode="dark"][data-pg-variant="neon"] .pg-context-menu,
[data-pg-mode="dark"][data-pg-variant="neon"] .pg-column-context-menu {
  --pg-neon-bloom: color-mix(in srgb, #06b6d4 45%, transparent);
}

/* ── Shell ────────────────────────────────────────────────────────────────── */

.pg-neon-theme .pg-grid {
  border: 1px solid var(--pg-colors-border-strong);
  border-radius: var(--pg-borders-radius-lg);
  overflow: hidden;
}

/* ── Header — uppercase, tracked, accent rule beneath ─────────────────────── */

.pg-neon-theme .pg-th {
  text-transform: uppercase;
  font-size: 10px;
  font-weight: var(--pg-typography-header-font-weight);
  letter-spacing: var(--pg-typography-letter-spacing-wide);
  color: var(--pg-colors-text-secondary);
}

.pg-neon-theme .pg-grid__header {
  border-bottom: 2px solid color-mix(in srgb, var(--pg-colors-primary) 40%, var(--pg-colors-header-border));
}

/* The sorted column is underlined in accent and lit — the strongest signal in
   the theme, because sort state is what you look for first. */
.pg-neon-theme .pg-th--sorted {
  color: var(--pg-colors-primary);
  box-shadow: inset 0 -2px 0 var(--pg-neon-ring);
}

.pg-neon-theme .pg-th--sortable:hover {
  color: var(--pg-colors-text-primary);
  background: var(--pg-colors-primary-subtle);
}

/* ── Rows and cells ───────────────────────────────────────────────────────── */

/* Faint dividers only: the glow does the separating, so full-strength rules
   would compete with it. */
.pg-neon-theme .pg-row {
  border-bottom: 1px solid color-mix(in srgb, var(--pg-colors-border) 55%, transparent);
}

/* Tabular figures across the body — the point of a terminal register. */
.pg-neon-theme .pg-cell {
  font-variant-numeric: tabular-nums;
}

.pg-neon-theme .pg-row--selected {
  box-shadow:
    inset 2px 0 0 var(--pg-neon-ring),
    inset 0 0 24px -8px var(--pg-neon-bloom);
}

/* ── Focus — ring plus bloom ──────────────────────────────────────────────── */

.pg-neon-theme .pg-th:focus-visible,
.pg-neon-theme .pg-cell:focus-visible,
.pg-neon-theme .pg-pagination__btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 1px var(--pg-neon-ring),
    0 0 12px var(--pg-neon-bloom);
}

/* ── Checkbox — hollow until checked, lit when active ─────────────────────── */

.pg-neon-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: var(--pg-sizing-checkbox-size);
  height: var(--pg-sizing-checkbox-size);
  border: 1.5px solid var(--pg-colors-checkbox-border);
  border-radius: var(--pg-borders-radius-sm);
  background: transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition:
    background var(--pg-transitions-duration-fast) linear,
    border-color var(--pg-transitions-duration-fast) linear,
    box-shadow var(--pg-transitions-duration-fast) linear;
}
.pg-neon-theme .pg-checkbox:hover {
  border-color: var(--pg-colors-primary);
  box-shadow: 0 0 8px var(--pg-neon-bloom);
}
.pg-neon-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--pg-neon-ring), 0 0 10px var(--pg-neon-bloom);
}
.pg-neon-theme .pg-checkbox:checked,
.pg-neon-theme .pg-checkbox:indeterminate {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
  box-shadow: 0 0 10px var(--pg-neon-bloom);
}
.pg-neon-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: 2px solid var(--pg-colors-on-primary);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-neon-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2.5px;
  top: 50%;
  width: 8px;
  height: 2px;
  background: var(--pg-colors-on-primary);
  transform: translateY(-50%);
}

/* ── Grouping bar — hollow bracketed chips ────────────────────────────────── */

.pg-neon-theme .pg-group-drop-zone {
  border-bottom: 1px solid var(--pg-colors-border);
}

.pg-neon-theme .pg-group-chip {
  background: transparent;
  color: var(--pg-colors-primary);
  border: 1px solid var(--pg-colors-primary);
  border-radius: var(--pg-borders-radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10px;
  font-weight: 700;
}

/* ── Footer / pagination ──────────────────────────────────────────────────── */

.pg-neon-theme .pg-grid__footer {
  border-top: 1px solid var(--pg-colors-footer-border);
}

.pg-neon-theme .pg-footer,
.pg-neon-theme .pg-pagination__info {
  font-variant-numeric: tabular-nums;
}

.pg-neon-theme .pg-pagination__btn {
  border-radius: var(--pg-borders-radius-sm);
}
.pg-neon-theme .pg-pagination__btn:hover:not(:disabled) {
  color: var(--pg-colors-primary);
  box-shadow: 0 0 0 1px var(--pg-neon-ring);
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

.pg-neon-theme .pg-icon { color: var(--pg-colors-text-secondary); }
.pg-neon-theme .pg-th--sorted .pg-icon {
  color: var(--pg-colors-primary);
  filter: drop-shadow(0 0 4px var(--pg-neon-bloom));
}
.pg-neon-theme .pg-row-drag-handle { color: var(--pg-colors-text-disabled); }

/* ── Overlays ─────────────────────────────────────────────────────────────── */

[data-pg-variant="neon"] .pg-context-menu,
[data-pg-variant="neon"] .pg-column-context-menu,
[data-pg-variant="neon"] .pg-dropdown-editor__panel {
  border-radius: var(--pg-borders-radius-md);
  border: 1px solid color-mix(in srgb, var(--pg-colors-primary) 35%, var(--pg-colors-border-ctxt-menu));
  box-shadow: var(--pg-shadows-dropdown), 0 0 24px -12px var(--pg-neon-bloom);
}

[data-pg-variant="neon"] .pg-context-menu__item:hover,
[data-pg-variant="neon"] .pg-col-ctx-menu__item:hover {
  background: var(--pg-colors-primary-subtle);
  color: var(--pg-colors-primary);
  box-shadow: inset 2px 0 0 var(--pg-neon-ring);
}

[data-pg-variant="neon"] .pg-toast {
  border-radius: var(--pg-borders-radius-md);
}

/* ── Motion — the fastest of the four; nothing eases ──────────────────────── */

.pg-neon-theme .pg-grid--row-dragging .pg-row {
  transition:
    background var(--pg-transitions-duration-fast) linear,
    top 90ms linear;
}

@media (prefers-reduced-motion: reduce) {
  .pg-neon-theme .pg-grid--row-dragging .pg-row { transition: none; }
}
`;
