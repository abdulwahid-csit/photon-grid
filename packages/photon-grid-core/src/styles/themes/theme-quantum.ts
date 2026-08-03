/**
 * pg-quantum-theme — Quantum Design 3 (indigo accent).
 *
 * Cosmetic variant layered on the active mode (light/dark). Overrides only
 * density, radii, typography, accent, elevation and motion; base colors come
 * from the mode tokens so it works in both light and dark. See
 * {@link themeQuartzCss} for the shared design rationale.
 */
export const themeQuantumCss = `

/* ──────────── pg-quantum-theme: structural + accent tokens ──────────── */
.pg-quantum-theme .pg-grid {
  /* Quantum uses elevation instead of a hard border. */
  border-radius: 4px;
  border-color: transparent;
  box-shadow: 0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px 0 rgba(0,0,0,.14), 0 1px 3px 0 rgba(0,0,0,.12);

  --pg-colors-primary: #1976d2;

  --pg-typography-font-family: Roboto, 'Helvetica Neue', Arial, sans-serif;
  --pg-typography-font-size-sm: 12px;
  --pg-typography-font-size-xs: 11px;
  --pg-typography-font-weight-medium: 400;
  --pg-typography-font-weight-semi-bold: 500;
  --pg-typography-letter-spacing-wide: 0.04em;

  --pg-header-row-height: 56px;
  --pg-row-height: 52px;

  --pg-borders-radius-md: 4px;
  --pg-borders-radius-sm: 2px;
  --pg-borders-radius-pill: 4px;
  --pg-sizing-checkbox-size: 18px;

  --pg-transitions-duration-fast: 200ms;
}

/* Quantum header — no uppercase, medium weight; color follows the mode. */
.pg-quantum-theme .pg-th {
  text-transform: none;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--pg-colors-header-text);
}
.pg-quantum-theme .pg-th--sorted { color: var(--pg-colors-primary); }
.pg-quantum-theme .pg-grid__header { border-bottom: 1px solid var(--pg-colors-header-border); }

/* Quantum rows — thin divider lines */
.pg-quantum-theme .pg-row { border-bottom: 1px solid var(--pg-colors-border); }
.pg-quantum-theme .pg-cell--v-border { border-right-color: var(--pg-colors-border); }

/* Quantum filter row */
.pg-quantum-theme .pg-filter-row { border-top-color: var(--pg-colors-border); }

/* Quantum icon tones — mode-aware */
.pg-quantum-theme .pg-icon { color: var(--pg-colors-text-secondary); }
.pg-quantum-theme .pg-th--sorted .pg-icon { color: var(--pg-colors-primary); }
.pg-quantum-theme .pg-row-drag-handle { color: var(--pg-colors-text-disabled); }

/* Quantum checkbox — 18px, 2px radius, accent, Quantum motion + ripple */
.pg-quantum-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--pg-colors-checkbox-border);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 200ms cubic-bezier(0.4,0,0.2,1),
              border-color 200ms cubic-bezier(0.4,0,0.2,1),
              box-shadow 200ms cubic-bezier(0.4,0,0.2,1);
}
.pg-quantum-theme .pg-checkbox:hover {
  border-color: var(--pg-colors-primary);
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--pg-colors-primary) 10%, transparent);
}
.pg-quantum-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--pg-colors-primary) 20%, transparent);
}
.pg-quantum-theme .pg-checkbox:checked {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-quantum-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 7px;
  height: 11px;
  border: 2px solid var(--pg-colors-primary-text);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-quantum-theme .pg-checkbox:indeterminate {
  background: var(--pg-colors-primary);
  border-color: var(--pg-colors-primary);
}
.pg-quantum-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 10px;
  height: 2px;
  background: var(--pg-colors-primary-text);
  transform: translateY(-50%);
}

/* Quantum selection — no left bar, full-row tint only */
// .pg-quantum-theme .pg-row--selected { box-shadow: none; }

/* Quantum row-drag animation — Quantum motion curve */
.pg-quantum-theme .pg-grid--row-dragging .pg-row {
  transition: background 200ms cubic-bezier(0.4,0,0.2,1),
              top 200ms cubic-bezier(0.4,0,0.2,1);
}
`;
