/**
 * pg-quartz-theme — clean, modern (blue accent).
 *
 * A cosmetic *variant* layered on top of the active color mode (light/dark).
 * It only overrides structural / appearance concerns — density, radii,
 * typography, accent color, checkbox shape, motion, and the distinctive quartz
 * "chrome" tint. All base surface, text and border colors are inherited from
 * the mode tokens (`var(--pg-colors-*)`), so this variant renders correctly in
 * both light and dark.
 *
 * The container carries the `.pg-quartz-theme` class; `.pg-grid` is its child,
 * hence the descendant selectors below.
 */
export const themeQuartzCss = `

/* ──────────── pg-quartz-theme: structural + accent tokens ──────────── */
.pg-quartz-theme .pg-grid {
  /* Accent identity — drives sorted headers, selection, checkboxes, links. */
  --pg-colors-primary: #2563eb;

  /* Quartz "chrome" surface — the flat tint shared by every non-data surface
     (header, footer/pagination, top grouping row, scrollbars, serial-number
     column). Derived from the mode's alt background so it tints correctly in
     both light and dark; defined once here so the look changes in one place. */
  --pg-quartz-chrome-background: var(--pg-colors-background-alt);
  --pg-colors-header-background: var(--pg-quartz-chrome-background);
  --pg-colors-footer-background: var(--pg-quartz-chrome-background);
  --pg-colors-scrollbar-bg: var(--pg-quartz-chrome-background);
  --pg-colors-scrollbar-track: var(--pg-quartz-chrome-background);

  /* Typography identity */
  --pg-typography-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --pg-typography-font-size-md: 0.8rem;
  --pg-typography-font-size-sm: 12px;
  --pg-typography-font-size-xs: 11px;
  --pg-typography-font-weight-medium: 400;
  --pg-typography-font-weight-semi-bold: 600;
  --pg-typography-letter-spacing-wide: 0.06em;

  /* Density */
  --pg-header-row-height: 40px;
  --pg-row-height: 44px;

  /* Shape */
  --pg-borders-radius-md: 6px;
  --pg-borders-radius-sm: 4px;
  --pg-borders-radius-pill: 9999px;
  --pg-sizing-checkbox-size: 16px;

  /* Motion */
  --pg-transitions-duration-fast: 150ms;
}

/* Quartz header — capitalized, semi-bold; color follows the mode. */
.pg-quartz-theme .pg-th {
  text-transform: capitalize;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--pg-colors-header-text);
}

/* Quartz row — bottom divider uses the mode border color */
.pg-quartz-theme .pg-row { border-bottom: 1px solid var(--pg-colors-border); }

/* Quartz icon tones — mode-aware */
.pg-quartz-theme .pg-icon { color: var(--pg-colors-text-secondary); }
.pg-quartz-theme .pg-th--sorted .pg-icon { color: var(--pg-colors-primary); }
.pg-quartz-theme .pg-row-drag-handle { color: var(--pg-colors-text-disabled); }
.pg-quartz-theme .pg-th--no-group { background: var(--pg-quartz-chrome-background); }

/* Quartz checkbox — 16px, 4px-radius square, solid accent on check */
.pg-quartz-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid var(--pg-colors-checkbox-border);
  border-radius: 4px;
  background: var(--pg-colors-checkbox-background);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
}
.pg-quartz-theme .pg-checkbox:hover { border-color: var(--pg-colors-primary); }
.pg-quartz-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pg-colors-primary) 25%, transparent);
}
.pg-quartz-theme .pg-checkbox:checked {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-quartz-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: 2px solid var(--pg-colors-primary-text);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-quartz-theme .pg-checkbox:indeterminate {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-quartz-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 8px;
  height: 2px;
  background: var(--pg-colors-primary-text);
  transform: translateY(-50%);
}

/* Quartz row selection highlight — accent left bar */
.pg-quartz-theme .pg-row--selected { box-shadow: inset 3px 0 0 var(--pg-colors-primary); }

/* Quartz row-drag animation — smooth cubic-bezier */
.pg-quartz-theme .pg-grid--row-dragging .pg-row {
  transition: background 150ms ease, top 130ms cubic-bezier(0.2, 0, 0, 1);
}

/* ──────────── Quartz chrome tint — serial (row number) column ────────────
   Header, filter and body cells of the serial column share the chrome surface
   so the number gutter reads as grid chrome rather than data. (Scrollbars and
   the header/footer/grouping surfaces are driven by the tokens above.) */
.pg-quartz-theme .pg-th--serial,
.pg-quartz-theme .pg-filter-cell--serial,
.pg-quartz-theme .pg-cell--serial {
  background: var(--pg-quartz-chrome-background);
}
`;
