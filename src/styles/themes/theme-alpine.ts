/* pg-alpine-theme — clean, minimal, emerald green */
export const themeAlpineCss = `

/* ──────────── pg-alpine-theme variables ──────────── */
.pg-alpine-theme .pg-grid {
  --pg-colors-border: #e5e7eb;
  --pg-colors-header-background: #ffffff;
  --pg-colors-header-border: #e5e7eb;
  --pg-colors-header-text: #374151;
  --pg-colors-row-background: #ffffff;
  --pg-colors-row-alt-background: #fafafa;
  --pg-colors-row-hover: #f0fdf4;
  --pg-colors-row-selected: #dcfce7;
  --pg-colors-row-selected-hover: #bbf7d0;
  --pg-colors-text-primary: #111827;
  --pg-colors-text-secondary: #6b7280;
  --pg-colors-text-muted: #9ca3af;
  --pg-colors-text-disabled: #d1d5db;
  --pg-colors-primary: #16a34a;
  --pg-colors-filter-background: #ffffff;
  --pg-colors-scrollbar-bg: #f9fafb;
  --pg-colors-badge-background: #dcfce7;
  --pg-colors-badge-text: #166534;
  --pg-colors-resize-handle-color: #d1d5db;

  --pg-typography-font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  --pg-typography-font-size-md: 13px;
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
  --pg-transitions-duration-fast: 100ms;
  --pg-sizing-checkbox-size: 15px;
}

/* Alpine header — no uppercase, clean weight */
.pg-alpine-theme .pg-th {
  text-transform: none;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0em;
  color: #374151;
}
.pg-alpine-theme .pg-th--sorted { color: #16a34a; }
.pg-alpine-theme .pg-grid__header { border-bottom: 2px solid #e5e7eb; }

/* Alpine rows — thin full-width divider */
.pg-alpine-theme .pg-row { border-bottom: 1px solid #f3f4f6; }

/* Alpine icon tones */
.pg-alpine-theme .pg-icon { color: #6b7280; }
.pg-alpine-theme .pg-th--sorted .pg-icon { color: #16a34a; }
.pg-alpine-theme .pg-row-drag-handle { color: #9ca3af; }

/* Alpine checkbox — 15px, 2px-radius, slim green outline → fill */
.pg-alpine-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 15px;
  height: 15px;
  border: 1.5px solid #d1d5db;
  border-radius: 2px;
  background: #fff;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 100ms linear, border-color 100ms linear;
}
.pg-alpine-theme .pg-checkbox:hover { border-color: #16a34a; }
.pg-alpine-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(22,163,74,0.3);
}
.pg-alpine-theme .pg-checkbox:checked {
  background: #16a34a;
  border-color: #16a34a;
}
.pg-alpine-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 1px;
  width: 5px;
  height: 8px;
  border: 1.5px solid #fff;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-alpine-theme .pg-checkbox:indeterminate {
  background: #16a34a;
  border-color: #16a34a;
}
.pg-alpine-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 7px;
  height: 1.5px;
  background: #fff;
  transform: translateY(-50%);
}

/* Alpine selection — clean green underline */
.pg-alpine-theme .pg-row--selected { box-shadow: inset 2px 0 0 #16a34a; }

/* Alpine row-drag animation — snappy, fast linear */
.pg-alpine-theme .pg-grid--row-dragging .pg-row {
  transition: background 100ms linear, top 100ms ease-out;
}
`;
