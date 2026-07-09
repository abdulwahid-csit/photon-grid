/* pg-balham-theme — compact, professional, amber accent */
export const themeBalhamCss = `

/* ──────────── pg-balham-theme variables ──────────── */
.pg-balham-theme .pg-grid {
  --pg-colors-border: #d1d5db;
  --pg-colors-header-background: #f3f4f6;
  --pg-colors-header-border: #d1d5db;
  --pg-colors-header-text: #374151;
  --pg-colors-row-background: #ffffff;
  --pg-colors-row-alt-background: #f9fafb;
  --pg-colors-row-hover: #fef3c7;
  --pg-colors-row-selected: #fffbeb;
  --pg-colors-row-selected-hover: #fef08a;
  --pg-colors-text-primary: #111827;
  --pg-colors-text-secondary: #6b7280;
  --pg-colors-text-muted: #9ca3af;
  --pg-colors-text-disabled: #d1d5db;
  --pg-colors-primary: #d97706;
  --pg-colors-filter-background: #ffffff;
  --pg-colors-scrollbar-bg: #f3f4f6;
  --pg-colors-badge-background: #fef3c7;
  --pg-colors-badge-text: #92400e;
  --pg-colors-resize-handle-color: #d1d5db;

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
  --pg-transitions-duration-fast: 80ms;
  --pg-sizing-checkbox-size: 14px;
}

/* Balham header — dense, uppercase, pronounced border */
.pg-balham-theme .pg-th {
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #374151;
}
.pg-balham-theme .pg-th--sorted { color: #d97706; }
.pg-balham-theme .pg-grid__header { border-bottom: 2px solid #d1d5db; }

/* Balham rows — full row border, classic spreadsheet look */
.pg-balham-theme .pg-row { border-bottom: 1px solid #e5e7eb; }

/* Balham icon tones — warmer grays */
.pg-balham-theme .pg-icon { color: #6b7280; }
.pg-balham-theme .pg-th--sorted .pg-icon { color: #d97706; }
.pg-balham-theme .pg-row-drag-handle { color: #9ca3af; }

/* Balham checkbox — 14px, square (0 radius), flat amber fill */
.pg-balham-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border: 1px solid #9ca3af;
  border-radius: 0px;
  background: #fff;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 80ms linear, border-color 80ms linear;
}
.pg-balham-theme .pg-checkbox:hover { border-color: #d97706; }
.pg-balham-theme .pg-checkbox:focus-visible {
  outline: 1px solid #d97706;
  outline-offset: 1px;
}
.pg-balham-theme .pg-checkbox:checked {
  background: #d97706;
  border-color: #d97706;
}
.pg-balham-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 1px;
  width: 5px;
  height: 8px;
  border: 2px solid #fff;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-balham-theme .pg-checkbox:indeterminate {
  background: #d97706;
  border-color: #d97706;
}
.pg-balham-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 8px;
  height: 2px;
  background: #fff;
  transform: translateY(-50%);
}

/* Balham selection — amber left accent bar */
.pg-balham-theme .pg-row--selected { box-shadow: inset 3px 0 0 #d97706; }

/* Balham row-drag — very fast, minimal */
.pg-balham-theme .pg-grid--row-dragging .pg-row {
  transition: background 80ms linear, top 80ms linear;
}
`;
