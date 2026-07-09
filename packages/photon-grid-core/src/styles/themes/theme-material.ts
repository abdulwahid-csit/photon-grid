/* pg-material-theme — Material Design 3, indigo blue */
export const themeMaterialCss = `

/* ──────────── pg-material-theme variables ──────────── */
.pg-material-theme .pg-grid {
  border-radius: 4px;
  border-color: transparent;
  box-shadow: 0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px 0 rgba(0,0,0,.14), 0 1px 3px 0 rgba(0,0,0,.12);

  --pg-colors-border: rgba(0,0,0,.12);
  --pg-colors-header-background: #ffffff;
  --pg-colors-header-border: transparent;
  --pg-colors-header-text: rgba(0,0,0,.54);
  --pg-colors-row-background: #ffffff;
  --pg-colors-row-alt-background: #fafafa;
  --pg-colors-row-hover: rgba(0,0,0,.04);
  --pg-colors-row-selected: rgba(25,118,210,.10);
  --pg-colors-row-selected-hover: rgba(25,118,210,.16);
  --pg-colors-text-primary: rgba(0,0,0,.87);
  --pg-colors-text-secondary: rgba(0,0,0,.54);
  --pg-colors-text-muted: rgba(0,0,0,.38);
  --pg-colors-text-disabled: rgba(0,0,0,.26);
  --pg-colors-primary: #1976d2;
  --pg-colors-filter-background: #ffffff;
  --pg-colors-scrollbar-bg: #fafafa;
  --pg-colors-badge-background: #e3f2fd;
  --pg-colors-badge-text: #0d47a1;
  --pg-colors-resize-handle-color: rgba(0,0,0,.20);

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
  --pg-transitions-duration-fast: 200ms;
  --pg-sizing-checkbox-size: 18px;
}

/* Material header — no uppercase, medium weight, subdued */
.pg-material-theme .pg-th {
  text-transform: none;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(0,0,0,.54);
}
.pg-material-theme .pg-th--sorted { color: #1976d2; }
.pg-material-theme .pg-grid__header { border-bottom: 1px solid rgba(0,0,0,.12); }

/* Material rows — thin divider lines */
.pg-material-theme .pg-row { border-bottom: 1px solid rgba(0,0,0,.06); }
.pg-material-theme .pg-cell--v-border { border-right-color: rgba(0,0,0,.06); }

/* Material filter row */
.pg-material-theme .pg-filter-row { border-top-color: rgba(0,0,0,.08); }

/* Material icon tones */
.pg-material-theme .pg-icon { color: rgba(0,0,0,.54); }
.pg-material-theme .pg-th--sorted .pg-icon { color: #1976d2; }
.pg-material-theme .pg-row-drag-handle { color: rgba(0,0,0,.38); }

/* Material checkbox — 18px, 2px radius, blue, Material motion */
.pg-material-theme .pg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0,0,0,.38);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 200ms cubic-bezier(0.4,0,0.2,1),
              border-color 200ms cubic-bezier(0.4,0,0.2,1),
              box-shadow 200ms cubic-bezier(0.4,0,0.2,1);
}
.pg-material-theme .pg-checkbox:hover {
  border-color: #1976d2;
  box-shadow: 0 0 0 8px rgba(25,118,210,.1);
}
.pg-material-theme .pg-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 8px rgba(25,118,210,.2);
}
.pg-material-theme .pg-checkbox:checked {
  background: #1976d2;
  border-color: #1976d2;
}
.pg-material-theme .pg-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 7px;
  height: 11px;
  border: 2px solid #fff;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.pg-material-theme .pg-checkbox:indeterminate {
  background: #1976d2;
  border-color: #1976d2;
}
.pg-material-theme .pg-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  width: 10px;
  height: 2px;
  background: #fff;
  transform: translateY(-50%);
}

/* Material selection — no left bar, full-row tint only */
.pg-material-theme .pg-row--selected { box-shadow: none; }

/* Material row-drag animation — Material motion curve */
.pg-material-theme .pg-grid--row-dragging .pg-row {
  transition: background 200ms cubic-bezier(0.4,0,0.2,1),
              top 200ms cubic-bezier(0.4,0,0.2,1);
}
`;
