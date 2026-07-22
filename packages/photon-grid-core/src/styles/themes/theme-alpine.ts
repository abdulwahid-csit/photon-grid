/**
 * pg-alpine-theme — clean, minimal (emerald accent).
 *
 * Cosmetic variant layered on the active mode (light/dark). Overrides only
 * density, radii, typography, accent and motion; base colors come from the
 * mode tokens so it works in both light and dark. See {@link themeQuartzCss}
 * for the shared design rationale.
 */
export const themeAlpineCss = `

/* ──────────── pg-alpine-theme: structural + accent tokens ──────────── */
.pg-alpine-theme .pg-grid {
  --pg-colors-primary: #16a34a;

  --pg-typography-font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  --pg-typography-font-size-md: 0.8rem;
  --pg-typography-font-size-sm: 12px;
  --pg-typography-font-size-xs: 11px;
  --pg-typography-font-weight-medium: 400;
  --pg-typography-font-weight-semi-bold: 600;
  --pg-typography-letter-spacing-wide: 0em;

  --pg-header-row-height: 42px;
  --pg-row-height: 40px;

  --pg-borders-radius-md: 4px;
  --pg-borders-radius-sm: 2px;
  --pg-borders-radius-pill: 9999px;
  --pg-sizing-checkbox-size: 15px;

  --pg-transitions-duration-fast: 100ms;
}

/* Alpine header — no uppercase, clean weight; color follows the mode. */
.pg-alpine-theme .pg-th {
  text-transform: none;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0em;
  color: var(--pg-colors-header-text);
}
.pg-alpine-theme .pg-th--sorted { color: var(--pg-colors-primary); }
.pg-alpine-theme .pg-grid__header { border-bottom: 2px solid var(--pg-colors-header-border); }

/* Alpine rows — thin full-width divider */
.pg-alpine-theme .pg-row { border-bottom: 1px solid var(--pg-colors-border); }

/* Alpine icon tones — mode-aware */
.pg-alpine-theme .pg-icon { color: var(--pg-colors-text-secondary); }
.pg-alpine-theme .pg-th--sorted .pg-icon { color: var(--pg-colors-primary); }
.pg-alpine-theme .pg-row-drag-handle { color: var(--pg-colors-text-disabled); }

/* Alpine checkbox — 15px, 2px-radius, slim accent outline → fill */
.pg-alpine-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 15px;
  height: 15px;
  border: 1.5px solid var(--pg-colors-checkbox-border);
  border-radius: 2px;
  background: var(--pg-colors-checkbox-background);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 100ms linear, border-color 100ms linear;
}
.pg-alpine-theme .pg-checkbox:hover { border-color: var(--pg-colors-primary); }
.pg-alpine-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pg-colors-primary) 30%, transparent);
}
.pg-alpine-theme .pg-checkbox:checked {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-alpine-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 1px;
  width: 5px;
  height: 8px;
  border: 1.5px solid var(--pg-colors-primary-text);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-alpine-theme .pg-checkbox:indeterminate {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-alpine-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 7px;
  height: 1.5px;
  background: var(--pg-colors-primary-text);
  transform: translateY(-50%);
}

/* Alpine selection — clean accent left bar */
// .pg-alpine-theme .pg-row--selected { box-shadow: inset 2px 0 0 var(--pg-colors-primary); }

/* Alpine row-drag animation — snappy, fast linear */
.pg-alpine-theme .pg-grid--row-dragging .pg-row {
  transition: background 100ms linear, top 100ms ease-out;
}
`;
