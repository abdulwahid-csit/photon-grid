/* pg-quartz-theme — clean, modern blue (default look) */
export const themeQuartzCss = `

/* ──────────── pg-quartz-theme variables ──────────── */
.pg-quartz-theme .pg-grid {
  --pg-colors-border: #ddddde;
  --pg-colors-header-background: #f8fafc;
  --pg-colors-header-border: #ddddde;
  --pg-colors-header-text: #475569;
  --pg-colors-row-background: #ffffff;
  --pg-colors-row-alt-background: #f8fafc;
  --pg-colors-row-hover: #f1f5f9;
  --pg-colors-row-selected: #eff6ff;
  --pg-colors-row-selected-hover: #dbeafe;
  --pg-colors-text-primary: #0f172a;
  --pg-colors-text-secondary: #64748b;
  --pg-colors-text-muted: #94a3b8;
  --pg-colors-text-disabled: #cbd5e1;
  --pg-colors-primary: #2563eb;
  --pg-colors-filter-background: #ffffff;
  --pg-colors-scrollbar-bg: #f8fafc;
  --pg-colors-badge-background: #dbeafe;
  --pg-colors-badge-text: #1e40af;

  --pg-typography-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --pg-typography-font-size-md: 13px;
  --pg-typography-font-size-sm: 12px;
  --pg-typography-font-size-xs: 11px;
  --pg-typography-font-weight-medium: 400;
  --pg-typography-font-weight-semi-bold: 600;
  --pg-typography-letter-spacing-wide: 0.06em;

  --pg-header-row-height: 40px;
  --pg-row-height: 44px;
  --pg-borders-radius-md: 6px;
  --pg-borders-radius-sm: 4px;
  --pg-borders-radius-pill: 9999px;
  --pg-transitions-duration-fast: 150ms;
  --pg-sizing-checkbox-size: 16px;
  --pg-colors-resize-handle-color: #ddddde;
}

/* Quartz header — title case, semi-bold */
.pg-quartz-theme .pg-th {
  text-transform: capitalize;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  color: #475569;
}
// .pg-quartz-theme .pg-th--sorted { color: #2563eb; }

/* Quartz row — bottom divider uses the theme border color */
.pg-quartz-theme .pg-row { border-bottom: 1px solid var(--pg-colors-border); }

/* Quartz icon tones */
.pg-quartz-theme .pg-icon { color: #64748b; }
.pg-quartz-theme .pg-th--sorted .pg-icon { color: #2563eb; }
.pg-quartz-theme .pg-row-drag-handle { color: #94a3b8; }
.pg-quartz-theme .pg-th--no-group { background-color: #f8fafc; }

/* Quartz checkbox — 16px, 4px-radius square, solid blue on check */
.pg-quartz-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
}
.pg-quartz-theme .pg-checkbox:hover { border-color: #2563eb; }
.pg-quartz-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.25);
}
.pg-quartz-theme .pg-checkbox:checked {
  background: #2563eb;
  border-color: #2563eb;
}
.pg-quartz-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: 2px solid #fff;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-quartz-theme .pg-checkbox:indeterminate {
  background: #2563eb;
  border-color: #2563eb;
}
.pg-quartz-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 8px;
  height: 2px;
  background: #fff;
  transform: translateY(-50%);
}

/* Quartz row selection highlight — blue left bar */
.pg-quartz-theme .pg-row--selected { box-shadow: inset 3px 0 0 #2563eb; }

/* Quartz row-drag animation — smooth cubic-bezier */
.pg-quartz-theme .pg-grid--row-dragging .pg-row {
  transition: background 150ms ease, top 130ms cubic-bezier(0.2, 0, 0, 1);
}
`;
