/**
 * pg-balham-theme — compact, professional (amber accent).
 *
 * Cosmetic variant layered on the active mode (light/dark). Overrides only
 * density, radii, typography, accent and motion; base colors come from the
 * mode tokens so it works in both light and dark. See {@link themeQuartzCss}
 * for the shared design rationale.
 */
export const themeBalhamCss = `

/* ──────────── pg-balham-theme: structural + accent tokens ──────────── */
.pg-balham-theme .pg-grid {
  --pg-colors-primary: #d97706;

  --pg-typography-font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  --pg-typography-font-size-sm: 11px;
  --pg-typography-font-size-xs: 10px;
  --pg-typography-font-weight-medium: 400;
  --pg-typography-font-weight-semi-bold: 600;
  --pg-typography-letter-spacing-wide: 0.04em;

  --pg-header-row-height: 36px;
  --pg-row-height: 32px;

  --pg-borders-radius-md: 2px;
  --pg-borders-radius-sm: 0px;
  --pg-borders-radius-pill: 2px;
  --pg-sizing-checkbox-size: 14px;

  --pg-transitions-duration-fast: 80ms;
}

/* Balham header — dense, uppercase, pronounced border; color follows the mode. */
.pg-balham-theme .pg-th {
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--pg-colors-header-text);
}
.pg-balham-theme .pg-th--sorted { color: var(--pg-colors-primary); }
.pg-balham-theme .pg-grid__header { border-bottom: 2px solid var(--pg-colors-header-border); }

/* Balham rows — full row border, classic spreadsheet look */
.pg-balham-theme .pg-row { border-bottom: 1px solid var(--pg-colors-border); }

/* Balham icon tones — mode-aware */
.pg-balham-theme .pg-icon { color: var(--pg-colors-text-secondary); }
.pg-balham-theme .pg-th--sorted .pg-icon { color: var(--pg-colors-primary); }
.pg-balham-theme .pg-row-drag-handle { color: var(--pg-colors-text-disabled); }

/* Balham checkbox — 14px, square (0 radius), flat accent fill */
.pg-balham-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border: 1px solid var(--pg-colors-checkbox-border);
  border-radius: 0px;
  background: var(--pg-colors-checkbox-background);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 80ms linear, border-color 80ms linear;
}
.pg-balham-theme .pg-checkbox:hover { border-color: var(--pg-colors-primary); }
.pg-balham-theme .pg-checkbox:focus-visible {
  outline: 1px solid var(--pg-colors-primary);
  outline-offset: 1px;
}
.pg-balham-theme .pg-checkbox:checked {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-balham-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 1px;
  width: 5px;
  height: 8px;
  border: 2px solid var(--pg-colors-primary-text);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-balham-theme .pg-checkbox:indeterminate {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-balham-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 8px;
  height: 2px;
  background: var(--pg-colors-primary-text);
  transform: translateY(-50%);
}

/* Balham selection — amber left accent bar */
// .pg-balham-theme .pg-row--selected { box-shadow: inset 3px 0 0 var(--pg-colors-primary); }

/* Balham row-drag — very fast, minimal */
.pg-balham-theme .pg-grid--row-dragging .pg-row {
  transition: background 80ms linear, top 80ms linear;
}
`;
