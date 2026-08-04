/**
 * `pg-quantum-theme` — **tonal elevated**.
 *
 * The Material register: no border at all, elevation instead; a violet accent
 * carried through *tonal surfaces* rather than lines; state expressed as
 * translucent layers over the row rather than as rails or rules; 12px container
 * radius with fully-round chips; and the loosest density of the four.
 *
 * ## State layers
 *
 * Material's model is that hover, focus and selection are semi-transparent
 * *layers* composited over a component, not replacement colours. Expressed here
 * as `color-mix(… var(--pg-colors-primary) N%, transparent)` at 8% for hover and
 * 12% for selection, the two compose correctly when a hovered row is also
 * selected — which a pair of opaque backgrounds could not do.
 *
 * See `theme-ion.ts` for the shared rules on selector roots (container class vs
 * `[data-pg-variant]` for portaled overlays) and on why row height is not set
 * in CSS.
 */
export const themeQuantumCss = `

/* ── Tokens ───────────────────────────────────────────────────────────────── */

.pg-quantum-theme .pg-grid,
[data-pg-variant="quantum"] .pg-context-menu,
[data-pg-variant="quantum"] .pg-column-context-menu,
[data-pg-variant="quantum"] .pg-col-chooser__overlay,
[data-pg-variant="quantum"] .pg-dropdown-editor__panel,
[data-pg-variant="quantum"] .pg-toast-layer {
  --pg-colors-primary: #6750a4;
  --pg-colors-primary-hover: #5b4691;
  --pg-colors-primary-active: #4f3d7e;
  --pg-colors-primary-subtle: color-mix(in srgb, #6750a4 8%, transparent);
  --pg-colors-primary-subtle-hover: color-mix(in srgb, #6750a4 12%, transparent);
  --pg-colors-primary-soft: color-mix(in srgb, #6750a4 20%, transparent);

  /* Tonal surfaces: chrome is the accent at low saturation over the mode's own
     surface, which is what gives Material its "tinted paper" quality. Mixing
     against a mode token (rather than white) keeps it correct in dark mode. */
  --pg-quantum-tonal: color-mix(in srgb, #6750a4 8%, var(--pg-colors-surface));
  --pg-colors-header-background: var(--pg-quantum-tonal);
  --pg-colors-filter-background: var(--pg-quantum-tonal);
  --pg-colors-footer-background: var(--pg-quantum-tonal);
  --pg-colors-group-row-background: var(--pg-quantum-tonal);
  --pg-colors-group-footer-background: var(--pg-quantum-tonal);
  --pg-colors-scrollbar-bg: transparent;
  --pg-colors-scrollbar-track: transparent;

  /* State layers — see the module doc. */
  --pg-colors-row-hover: var(--pg-colors-primary-subtle);
  --pg-colors-row-selected: var(--pg-colors-primary-subtle-hover);
  --pg-colors-chip-background: color-mix(in srgb, #6750a4 14%, var(--pg-colors-surface));
  --pg-colors-chip-text: var(--pg-colors-primary);
  --pg-colors-group-zone-over: var(--pg-colors-primary-soft);

  --pg-typography-font-family: Roboto, 'Helvetica Neue', system-ui, Arial, sans-serif;
  --pg-typography-font-size-md: 14px;
  --pg-typography-font-size-sm: 12px;
  --pg-typography-font-size-xs: 11px;
  --pg-typography-header-font-weight: 500;
  --pg-typography-letter-spacing-wide: 0.04em;

  --pg-header-row-height: 56px;

  /* Generous, consistently round. */
  --pg-borders-radius-lg: 12px;
  --pg-borders-radius-md: 8px;
  --pg-borders-radius-sm: 4px;
  --pg-borders-radius-pill: 9999px;
  --pg-borders-width-focus: 4px;
  --pg-sizing-checkbox-size: 18px;

  /* Material's standard easing and a deliberately unhurried duration. */
  --pg-transitions-duration-fast: 150ms;
  --pg-transitions-duration-base: 200ms;
  --pg-transitions-easing-base: cubic-bezier(0.2, 0, 0, 1);

  /* Material tonal palette. */
  --pg-chart-series-1: #6750a4;
  --pg-chart-series-2: #7d5260;
  --pg-chart-series-3: #386a20;
  --pg-chart-series-4: #00639b;
  --pg-chart-series-5: #8c4a00;
  --pg-chart-series-6: #6f5b40;
}

/* ── Shell — elevation instead of a border ────────────────────────────────── */

.pg-quantum-theme .pg-grid {
  border: none;
  border-radius: var(--pg-borders-radius-lg);
  overflow: hidden;
  box-shadow: var(--pg-shadows-lg);
}

/* ── Header — tonal fill, sentence case, no rule ──────────────────────────── */

.pg-quantum-theme .pg-th {
  text-transform: none;
  font-size: 12px;
  font-weight: var(--pg-typography-header-font-weight);
  letter-spacing: var(--pg-typography-letter-spacing-wide);
  color: var(--pg-colors-header-text);
}

/* The tonal surface is the separator — a rule under it would be redundant. */
.pg-quantum-theme .pg-grid__header {
  border-bottom: none;
}

.pg-quantum-theme .pg-th--sorted {
  color: var(--pg-colors-primary);
  font-weight: 600;
}

.pg-quantum-theme .pg-th--sortable:hover {
  background: var(--pg-colors-primary-subtle);
}

/* ── Rows and cells ───────────────────────────────────────────────────────── */

/* No dividers at all: rows are separated by rhythm and state layers. */
.pg-quantum-theme .pg-row {
  border-bottom: none;
}

.pg-quantum-theme .pg-cell--v-border {
  border-right-color: transparent;
}

/* Selection is the 12% layer from the token above — no rail, no border. */
.pg-quantum-theme .pg-row--selected {
  box-shadow: none;
}

/* ── Focus — a wide, soft ripple ring ─────────────────────────────────────── */

.pg-quantum-theme .pg-th:focus-visible,
.pg-quantum-theme .pg-cell:focus-visible,
.pg-quantum-theme .pg-pagination__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--pg-borders-width-focus)
    color-mix(in srgb, var(--pg-colors-primary) 20%, transparent);
}

/* ── Checkbox — 18px, ripple halo on hover and focus ──────────────────────── */

.pg-quantum-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: var(--pg-sizing-checkbox-size);
  height: var(--pg-sizing-checkbox-size);
  border: 2px solid var(--pg-colors-checkbox-border);
  border-radius: var(--pg-borders-radius-sm);
  background: transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition:
    background var(--pg-transitions-duration-fast) var(--pg-transitions-easing-base),
    border-color var(--pg-transitions-duration-fast) var(--pg-transitions-easing-base),
    box-shadow var(--pg-transitions-duration-fast) var(--pg-transitions-easing-base);
}
/* The halo is a box-shadow rather than a pseudo-element so it cannot affect
   layout or the row's hit area. */
.pg-quantum-theme .pg-checkbox:hover {
  border-color: var(--pg-colors-primary);
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--pg-colors-primary) 10%, transparent);
}
.pg-quantum-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--pg-colors-primary) 20%, transparent);
}
.pg-quantum-theme .pg-checkbox:checked,
.pg-quantum-theme .pg-checkbox:indeterminate {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-quantum-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: 2px solid var(--pg-colors-on-primary);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-quantum-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 10px;
  height: 2px;
  background: var(--pg-colors-on-primary);
  transform: translateY(-50%);
}

/* ── Grouping bar — fully-round tonal chips ───────────────────────────────── */

.pg-quantum-theme .pg-group-drop-zone {
  background: var(--pg-quantum-tonal);
  border-bottom: none;
}

.pg-quantum-theme .pg-group-chip {
  background: var(--pg-colors-chip-background);
  color: var(--pg-colors-chip-text);
  border: none;
  border-radius: var(--pg-borders-radius-pill);
  font-weight: 500;
  padding-inline: 12px;
}

/* ── Footer / pagination ──────────────────────────────────────────────────── */

.pg-quantum-theme .pg-grid__footer {
  border-top: none;
}

/* Circular buttons with a ripple layer — the Material icon-button idiom. */
.pg-quantum-theme .pg-pagination__btn {
  border-radius: var(--pg-borders-radius-pill);
  transition: background var(--pg-transitions-duration-fast) var(--pg-transitions-easing-base);
}
.pg-quantum-theme .pg-pagination__btn:hover:not(:disabled) {
  background: var(--pg-colors-primary-subtle-hover);
  color: var(--pg-colors-primary);
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

.pg-quantum-theme .pg-icon { color: var(--pg-colors-text-secondary); }
.pg-quantum-theme .pg-th--sorted .pg-icon { color: var(--pg-colors-primary); }
.pg-quantum-theme .pg-row-drag-handle { color: var(--pg-colors-text-disabled); }

/* ── Overlays — elevated cards, matching the shell ────────────────────────── */

[data-pg-variant="quantum"] .pg-context-menu,
[data-pg-variant="quantum"] .pg-column-context-menu,
[data-pg-variant="quantum"] .pg-dropdown-editor__panel {
  border-radius: var(--pg-borders-radius-md);
  border: none;
  box-shadow: var(--pg-shadows-dropdown);
  background: var(--pg-quantum-tonal, var(--pg-colors-surface));
  padding-block: 8px;
}

[data-pg-variant="quantum"] .pg-context-menu__item,
[data-pg-variant="quantum"] .pg-col-ctx-menu__item {
  border-radius: var(--pg-borders-radius-pill);
  margin-inline: 8px;
}
[data-pg-variant="quantum"] .pg-context-menu__item:hover,
[data-pg-variant="quantum"] .pg-col-ctx-menu__item:hover {
  background: var(--pg-colors-primary-subtle-hover);
  color: var(--pg-colors-primary);
}

[data-pg-variant="quantum"] .pg-toast {
  border-radius: var(--pg-borders-radius-md);
  box-shadow: var(--pg-shadows-lg);
}

/* ── Motion ───────────────────────────────────────────────────────────────── */

.pg-quantum-theme .pg-grid--row-dragging .pg-row {
  transition:
    background var(--pg-transitions-duration-base) var(--pg-transitions-easing-base),
    top 200ms var(--pg-transitions-easing-base);
}
`;
