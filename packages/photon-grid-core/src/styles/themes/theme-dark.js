/* pg-dark-theme — dark slate, light-blue accent */
export const themeDarkCss = `

/* ──────────── pg-dark-theme variables ──────────── */
.pg-dark-theme .pg-grid {
  --pg-colors-border: #334155;
  --pg-colors-header-background: #0f172a;
  --pg-colors-header-border: #334155;
  --pg-colors-header-text: #94a3b8;
  --pg-colors-row-background: #1e293b;
  --pg-colors-row-alt-background: #1a2436;
  --pg-colors-row-hover: #334155;
  --pg-colors-row-selected: rgba(96,165,250,.15);
  --pg-colors-row-selected-hover: rgba(96,165,250,.25);
  --pg-colors-text-primary: #e2e8f0;
  --pg-colors-text-secondary: #94a3b8;
  --pg-colors-text-muted: #64748b;
  --pg-colors-text-disabled: #475569;
  --pg-colors-primary: #60a5fa;
  --pg-colors-filter-background: #1e293b;
  --pg-colors-scrollbar-bg: #0f172a;
  --pg-colors-badge-background: rgba(96,165,250,.2);
  --pg-colors-badge-text: #93c5fd;
  --pg-colors-group-row-text: #cbd5e1;
  --pg-colors-group-row-background: #1a2840;
  --pg-colors-group-row-hover: rgba(96,165,250,.08);
  --pg-colors-group-toggle-hover: rgba(96,165,250,.15);
  --pg-colors-chip-background: rgba(96,165,250,.15);
  --pg-colors-chip-text: #93c5fd;
  --pg-colors-group-zone-over: rgba(96,165,250,.12);
  --pg-colors-cell-edit-background: #0f172a;
  --pg-colors-footer-background: #0f172a;
  --pg-colors-footer-border: #334155;
  --pg-colors-surface: #1e293b;
  --pg-colors-background-alt: #334155;
  --pg-colors-border-strong: #475569;
  --pg-colors-border-focus: #60a5fa;
  --pg-colors-resize-handle-color: #475569;

  --pg-typography-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --pg-typography-font-size-md: 13px;
  --pg-typography-font-size-sm: 12px;
  --pg-typography-font-size-xs: 11px;
  --pg-typography-font-weight-medium: 400;
  --pg-typography-font-weight-semi-bold: 600;
  --pg-typography-letter-spacing-wide: 0.06em;

  --pg-header-row-height: 48px;
  --pg-row-height: 44px;
  --pg-borders-radius-md: 6px;
  --pg-borders-radius-sm: 4px;
  --pg-borders-radius-pill: 9999px;
  --pg-transitions-duration-fast: 200ms;
  --pg-sizing-checkbox-size: 16px;
}

/* Dark: override the grid border itself */
.pg-dark-theme .pg-grid {
  border-color: #334155;
  background: #1e293b;
}

/* Dark header */
.pg-dark-theme .pg-th {
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #94a3b8;
}
.pg-dark-theme .pg-th--sorted { color: #60a5fa; }
.pg-dark-theme .pg-grid__header { border-bottom: 1px solid #334155; }

/* Dark rows — subtle divider on dark bg */
.pg-dark-theme .pg-row { border-bottom: 1px solid #263347; }

/* Dark cell vertical border */
.pg-dark-theme .pg-cell--v-border { border-right-color: #2d3f56; }

/* Dark filter row */
.pg-dark-theme .pg-filter-row { border-top-color: #334155; }
.pg-dark-theme input[type="text"], .pg-dark-theme select {
  background: #0f172a;
  color: #e2e8f0;
  border-color: #475569;
}
.pg-dark-theme input[type="text"]::placeholder { color: #64748b; }

/* Dark filter panel */
.pg-dark-theme .pg-filter-panel {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
  color: #e2e8f0;
}
.pg-dark-theme .pg-filter-cond__select,
.pg-dark-theme .pg-filter-cond__input,
.pg-dark-theme .pg-filter-set__search-input {
  background: #0f172a;
  color: #e2e8f0;
  border-color: #475569;
}
.pg-dark-theme .pg-filter-logic__btn {
  background: #1e293b;
  border-color: #475569;
  color: #94a3b8;
}
.pg-dark-theme .pg-filter-logic__btn:hover { background: #263347; }
.pg-dark-theme .pg-filter-logic__btn--active { background: #2563eb; color: #fff; border-color: #2563eb; }
.pg-dark-theme .pg-filter-set__item:hover { background: #263347; }
.pg-dark-theme .pg-filter-set__divider { background: #334155; }
.pg-dark-theme .pg-filter-panel__footer { background: #1e293b; border-top-color: #334155; }
.pg-dark-theme .pg-filter-panel__clear-btn {
  background: #1e293b;
  border-color: #475569;
  color: #94a3b8;
}
.pg-dark-theme .pg-filter-panel__clear-btn:hover { background: #263347; color: #e2e8f0; }

/* Dark icon tones */
.pg-dark-theme .pg-icon { color: #64748b; }
.pg-dark-theme .pg-th--sorted .pg-icon { color: #60a5fa; }
.pg-dark-theme .pg-row-drag-handle { color: #475569; }

/* Dark checkbox — 16px, 4px radius, glowing blue fill */
.pg-dark-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid #475569;
  border-radius: 4px;
  background: #0f172a;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}
.pg-dark-theme .pg-checkbox:hover { border-color: #60a5fa; }
.pg-dark-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(96,165,250,.35);
}
.pg-dark-theme .pg-checkbox:checked {
  background: #2563eb;
  border-color: #60a5fa;
  box-shadow: 0 0 6px rgba(96,165,250,.4);
}
.pg-dark-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: 2px solid #e2e8f0;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-dark-theme .pg-checkbox:indeterminate {
  background: #2563eb;
  border-color: #60a5fa;
  box-shadow: 0 0 6px rgba(96,165,250,.4);
}
.pg-dark-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 8px;
  height: 2px;
  background: #e2e8f0;
  transform: translateY(-50%);
}

/* Dark selection — glowing blue left bar */
.pg-dark-theme .pg-row--selected { box-shadow: inset 3px 0 0 #60a5fa; }

/* Dark scrollbar — dark track + styled thumb via scrollbar-color (Firefox/Chromium) */
.pg-dark-theme .pg-scrollbar-h-spacer,
.pg-dark-theme .pg-scrollbar-v-native,
.pg-dark-theme .pg-scrollbar-h-native { background: #0f172a; }
.pg-dark-theme .pg-scrollbar-v-native,
.pg-dark-theme .pg-scrollbar-h-native,
.pg-dark-theme .pg-scrollbar-h-spacer { scrollbar-color: #475569 #0f172a; }

/* Dark overlay — override hardcoded white loading tint */
.pg-dark-theme .pg-overlay { background: #1e293b; }
.pg-dark-theme .pg-overlay--loading { background: rgba(15,23,42,0.85); }

/* Dark group drop zone areas */
.pg-dark-theme .pg-group-drop-zone--top,
.pg-dark-theme .pg-group-drop-zone--left,
.pg-dark-theme .pg-group-drop-zone--right {
  background: #0f172a;
  border-color: #334155;
}
/* Group zone grip hover — override hardcoded rgba(0,0,0,.06) */
.pg-dark-theme .pg-group-zone-grip:hover { background: rgba(255,255,255,.08); }
/* Group chip close hover — override hardcoded indigo tint */
.pg-dark-theme .pg-group-chip__close:hover { background: rgba(96,165,250,.2); }

/* Dark column menu */
.pg-dark-theme .pg-column-menu {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

/* Dark row-drag animation — smooth ease */
.pg-dark-theme .pg-grid--row-dragging .pg-row {
  transition: background 200ms ease, top 160ms cubic-bezier(0.2, 0, 0, 1);
}
`;
//# sourceMappingURL=theme-dark.js.map