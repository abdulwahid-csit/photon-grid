"use strict";
var PhotonGridDemo = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // demo/demo.ts
  var demo_exports = {};
  __export(demo_exports, {
    generatePlayerData: () => generatePlayerData,
    playerColumns: () => playerColumns
  });

  // src/styles/themes/theme-quartz.ts
  var themeQuartzCss = `

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 pg-quartz-theme variables \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* Quartz header \u2014 title case, semi-bold */
.pg-quartz-theme .pg-th {
  text-transform: capitalize;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  color: #475569;
}
// .pg-quartz-theme .pg-th--sorted { color: #2563eb; }

/* Quartz row \u2014 bottom divider uses the theme border color */
.pg-quartz-theme .pg-row { border-bottom: 1px solid var(--pg-colors-border); }

/* Quartz icon tones */
.pg-quartz-theme .pg-icon { color: #64748b; }
.pg-quartz-theme .pg-th--sorted .pg-icon { color: #2563eb; }
.pg-quartz-theme .pg-row-drag-handle { color: #94a3b8; }
.pg-quartz-theme .pg-th--no-group { background-color: #f8fafc; }

/* Quartz checkbox \u2014 16px, 4px-radius square, solid blue on check */
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

/* Quartz row selection highlight \u2014 blue left bar */
.pg-quartz-theme .pg-row--selected { box-shadow: inset 3px 0 0 #2563eb; }

/* Quartz row-drag animation \u2014 smooth cubic-bezier */
.pg-quartz-theme .pg-grid--row-dragging .pg-row {
  transition: background 150ms ease, top 130ms cubic-bezier(0.2, 0, 0, 1);
}
`;

  // src/styles/themes/theme-alpine.ts
  var themeAlpineCss = `

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 pg-alpine-theme variables \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* Alpine header \u2014 no uppercase, clean weight */
.pg-alpine-theme .pg-th {
  text-transform: none;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0em;
  color: #374151;
}
.pg-alpine-theme .pg-th--sorted { color: #16a34a; }
.pg-alpine-theme .pg-grid__header { border-bottom: 2px solid #e5e7eb; }

/* Alpine rows \u2014 thin full-width divider */
.pg-alpine-theme .pg-row { border-bottom: 1px solid #f3f4f6; }

/* Alpine icon tones */
.pg-alpine-theme .pg-icon { color: #6b7280; }
.pg-alpine-theme .pg-th--sorted .pg-icon { color: #16a34a; }
.pg-alpine-theme .pg-row-drag-handle { color: #9ca3af; }

/* Alpine checkbox \u2014 15px, 2px-radius, slim green outline \u2192 fill */
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

/* Alpine selection \u2014 clean green underline */
.pg-alpine-theme .pg-row--selected { box-shadow: inset 2px 0 0 #16a34a; }

/* Alpine row-drag animation \u2014 snappy, fast linear */
.pg-alpine-theme .pg-grid--row-dragging .pg-row {
  transition: background 100ms linear, top 100ms ease-out;
}
`;

  // src/styles/themes/theme-balham.ts
  var themeBalhamCss = `

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 pg-balham-theme variables \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
  --pg-typography-font-size-md: 12px;
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

/* Balham header \u2014 dense, uppercase, pronounced border */
.pg-balham-theme .pg-th {
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #374151;
}
.pg-balham-theme .pg-th--sorted { color: #d97706; }
.pg-balham-theme .pg-grid__header { border-bottom: 2px solid #d1d5db; }

/* Balham rows \u2014 full row border, classic spreadsheet look */
.pg-balham-theme .pg-row { border-bottom: 1px solid #e5e7eb; }

/* Balham icon tones \u2014 warmer grays */
.pg-balham-theme .pg-icon { color: #6b7280; }
.pg-balham-theme .pg-th--sorted .pg-icon { color: #d97706; }
.pg-balham-theme .pg-row-drag-handle { color: #9ca3af; }

/* Balham checkbox \u2014 14px, square (0 radius), flat amber fill */
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

/* Balham selection \u2014 amber left accent bar */
.pg-balham-theme .pg-row--selected { box-shadow: inset 3px 0 0 #d97706; }

/* Balham row-drag \u2014 very fast, minimal */
.pg-balham-theme .pg-grid--row-dragging .pg-row {
  transition: background 80ms linear, top 80ms linear;
}
`;

  // src/styles/themes/theme-material.ts
  var themeMaterialCss = `

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 pg-material-theme variables \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
  --pg-typography-font-size-md: 14px;
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

/* Material header \u2014 no uppercase, medium weight, subdued */
.pg-material-theme .pg-th {
  text-transform: none;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(0,0,0,.54);
}
.pg-material-theme .pg-th--sorted { color: #1976d2; }
.pg-material-theme .pg-grid__header { border-bottom: 1px solid rgba(0,0,0,.12); }

/* Material rows \u2014 thin divider lines */
.pg-material-theme .pg-row { border-bottom: 1px solid rgba(0,0,0,.06); }
.pg-material-theme .pg-cell--v-border { border-right-color: rgba(0,0,0,.06); }

/* Material filter row */
.pg-material-theme .pg-filter-row { border-top-color: rgba(0,0,0,.08); }

/* Material icon tones */
.pg-material-theme .pg-icon { color: rgba(0,0,0,.54); }
.pg-material-theme .pg-th--sorted .pg-icon { color: #1976d2; }
.pg-material-theme .pg-row-drag-handle { color: rgba(0,0,0,.38); }

/* Material checkbox \u2014 18px, 2px radius, blue, Material motion */
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

/* Material selection \u2014 no left bar, full-row tint only */
.pg-material-theme .pg-row--selected { box-shadow: none; }

/* Material row-drag animation \u2014 Material motion curve */
.pg-material-theme .pg-grid--row-dragging .pg-row {
  transition: background 200ms cubic-bezier(0.4,0,0.2,1),
              top 200ms cubic-bezier(0.4,0,0.2,1);
}
`;

  // src/styles/themes/theme-dark.ts
  var themeDarkCss = `

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 pg-dark-theme variables \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* Dark rows \u2014 subtle divider on dark bg */
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

/* Dark checkbox \u2014 16px, 4px radius, glowing blue fill */
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

/* Dark selection \u2014 glowing blue left bar */
.pg-dark-theme .pg-row--selected { box-shadow: inset 3px 0 0 #60a5fa; }

/* Dark scrollbar \u2014 dark track + styled thumb via scrollbar-color (Firefox/Chromium) */
.pg-dark-theme .pg-scrollbar-h-spacer,
.pg-dark-theme .pg-scrollbar-v-native,
.pg-dark-theme .pg-scrollbar-h-native { background: #0f172a; }
.pg-dark-theme .pg-scrollbar-v-native,
.pg-dark-theme .pg-scrollbar-h-native,
.pg-dark-theme .pg-scrollbar-h-spacer { scrollbar-color: #475569 #0f172a; }

/* Dark overlay \u2014 override hardcoded white loading tint */
.pg-dark-theme .pg-overlay { background: #1e293b; }
.pg-dark-theme .pg-overlay--loading { background: rgba(15,23,42,0.85); }

/* Dark group drop zone areas */
.pg-dark-theme .pg-group-drop-zone--top,
.pg-dark-theme .pg-group-drop-zone--left,
.pg-dark-theme .pg-group-drop-zone--right {
  background: #0f172a;
  border-color: #334155;
}
/* Group zone grip hover \u2014 override hardcoded rgba(0,0,0,.06) */
.pg-dark-theme .pg-group-zone-grip:hover { background: rgba(255,255,255,.08); }
/* Group chip close hover \u2014 override hardcoded indigo tint */
.pg-dark-theme .pg-group-chip__close:hover { background: rgba(96,165,250,.2); }

/* Dark column menu */
.pg-dark-theme .pg-column-menu {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

/* Dark row-drag animation \u2014 smooth ease */
.pg-dark-theme .pg-grid--row-dragging .pg-row {
  transition: background 200ms ease, top 160ms cubic-bezier(0.2, 0, 0, 1);
}
`;

  // src/styles/base-styles.ts
  var STYLE_ID = "photon-grid-base-styles";
  var baseCss = `
/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Root \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-row-background, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-md, 13px);
  box-sizing: border-box;
  position: relative;
  --pg-scroll-x: 0px;
  --pg-scroll-y: 0px;
  --pg-content-height: 0px;
  --pg-center-content-width: 0px;
  --pg-left-panel-width: auto;
  --pg-right-panel-width: auto;
  --pg-header-row-height: 44px;
  --pg-filter-row-height: 36px;
}
.pg-grid *, .pg-grid *::before, .pg-grid *::after { box-sizing: border-box; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Outer flex-row / main flex-col wrappers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-grid-outer {
  display: flex;
  flex-direction: row;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}
.pg-grid-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Group drop zone \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-group-drop-zone--top {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  height: var(--pg-header-row-height, 44px);
  background: var(--pg-colors-header-background, #f8fafc);
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  overflow: hidden;
}
.pg-group-drop-zone--left {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 160px;
  background: var(--pg-colors-header-background, #f8fafc);
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  overflow: hidden;
  position: relative;
}
.pg-group-drop-zone--right {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 160px;
  background: var(--pg-colors-header-background, #f8fafc);
  border-left: 1px solid var(--pg-colors-border, #e2e8f0);
  overflow: hidden;
  position: relative;
}

/* Zone header row (grip + "Groups" label) */
.pg-group-zone-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  user-select: none;
}
.pg-group-zone-grip {
  display: flex;
  align-items: center;
  cursor: grab;
  opacity: 0.45;
  padding: 2px 3px;
  border-radius: 3px;
  color: var(--pg-colors-text-secondary, #64748b);
  flex-shrink: 0;
  transition: opacity 100ms, background 100ms;
}
.pg-group-zone-grip:hover { opacity: 0.85; background: rgba(0,0,0,0.06); }
.pg-group-zone-grip:active { cursor: grabbing; }
.pg-group-zone-label {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pg-colors-text-secondary, #64748b);
  user-select: none;
}

/* Chips area (the actual drop target) */
.pg-group-zone-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
  min-height: 38px;
  flex: 1;
  overflow: auto;
}
.pg-group-drop-zone--left .pg-group-zone-chips,
.pg-group-drop-zone--right .pg-group-zone-chips {
  flex-direction: column;
  align-items: flex-start;
  overflow-y: auto;
  overflow-x: hidden;
}
.pg-group-zone-chips--over {
  background: var(--pg-colors-group-zone-over, #eff6ff);
  outline: 1px dashed var(--pg-colors-primary, #2563eb);
  outline-offset: -2px;
}

/* Resize handle */
.pg-group-drop-zone--top .pg-group-zone-resize {
  height: 4px;
  flex-shrink: 0;
  cursor: ns-resize;
  background: transparent;
  transition: background 100ms;
}
.pg-group-drop-zone--top .pg-group-zone-resize:hover { background: var(--pg-colors-primary, #2563eb); opacity: 0.35; }
.pg-group-drop-zone--left .pg-group-zone-resize {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 100ms;
}
.pg-group-drop-zone--right .pg-group-zone-resize {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 100ms;
}
.pg-group-drop-zone--left .pg-group-zone-resize:hover,
.pg-group-drop-zone--right .pg-group-zone-resize:hover { background: var(--pg-colors-primary, #2563eb); opacity: 0.35; }

/* Hint text */
.pg-group-drop-zone__hint {
  font-size: var(--pg-typography-font-size-sm, 12px);
  color: var(--pg-colors-text-disabled, #94a3b8);
  pointer-events: none;
  user-select: none;
}

/* Chips */
.pg-group-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px 3px 10px;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-chip-background, #e0e7ff);
  color: var(--pg-colors-chip-text, #1e40af);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  user-select: none;
  white-space: nowrap;
  transition: opacity 120ms;
}
.pg-group-chip--ghost {
  cursor: grabbing;
}
.pg-group-chip__label { line-height: 1.2; }
.pg-group-chip__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 100ms, background 100ms;
  flex-shrink: 0;
}
.pg-group-chip__close:hover { opacity: 1; background: rgba(30,64,175,0.18); }
.pg-group-chip__sep {
  display: inline-flex;
  align-items: center;
  color: var(--pg-colors-text-disabled, #94a3b8);
  flex-shrink: 0;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Group bar quick-filter search \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-group-search {
  display: flex;
  align-items: center;
  padding: 0 10px;
  flex-shrink: 0;
  height: 100%;
}
.pg-group-drop-zone--left .pg-group-search,
.pg-group-drop-zone--right .pg-group-search { display: none; }

/* Field wrapper: position:relative so icon + clear button can overlay the input */
.pg-group-search__field {
  position: relative;
  display: flex;
  align-items: center;
}
.pg-group-search__icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  color: var(--pg-colors-text-disabled, #94a3b8);
  pointer-events: none;
  transition: color 150ms;
  z-index: 1;
}
.pg-group-search__field:focus-within .pg-group-search__icon {
  color: var(--pg-colors-primary, #2563eb);
}
.pg-group-search__input {
  width: 210px;
  height: 32px;
  padding: 0 28px 0 30px;
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-family: inherit;
  color: var(--pg-colors-text-primary, #0f172a);
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
  appearance: none;
}
.pg-group-search__input::placeholder { color: var(--pg-colors-text-disabled, #94a3b8); }
.pg-group-search__input:focus {
  border-color: var(--pg-colors-border-focus, #2563eb);
  box-shadow: 0 0 0 3px var(--pg-colors-selection-background, rgba(37, 99, 235, 0.12));
}
.pg-group-search__clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--pg-colors-text-secondary, #64748b);
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms, background 100ms;
}
.pg-group-search__clear--visible {
  opacity: 0.55;
  pointer-events: auto;
}
.pg-group-search__clear--visible:hover {
  opacity: 1;
  background: var(--pg-colors-background-alt, #f1f5f9);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Three-panel header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-grid__header {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  border-bottom: 1px solid var(--pg-colors-header-border, #e2e8f0);
  background: var(--pg-colors-header-background, #f8fafc);
  overflow: hidden;
  z-index: 10;
  position: relative;
}
/* Mirrors the vertical-scrollbar flex item that lives in the body row so that
   the center header panel is exactly as wide as the center body panel.
   Without this spacer the header center is scrollbar_width wider and the right
   pinned-column header is shifted right relative to the body cells. */
.pg-header-vscroll-spacer {
  flex-shrink: 0;
  width: var(--pg-scrollbar-v-width, 0px);
  background: var(--pg-colors-header-background, #f8fafc);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Three-panel body \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-grid__body {
  display: flex;
  flex-direction: row;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Panel base \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
}
.pg-panel--left {
  z-index: 2;
  box-shadow: 2px 0 4px rgba(0,0,0,0.06);
  width: var(--pg-left-panel-width, auto);
}
.pg-panel--center {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}
.pg-panel--right {
  z-index: 2;
  box-shadow: -2px 0 4px rgba(0,0,0,0.06);
  width: var(--pg-right-panel-width, auto);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Panel header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-panel__header {
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  z-index: 2;
}
/* Center panel header sits behind pinned-panel headers so that center
   content translated by the scroll transform cannot visually overlap the
   left / right pinned column headers when scrolled near their edges. */
.pg-panel--center .pg-panel__header {
  z-index: 1;
}
.pg-panel__header-inner {
  display: flex;
  flex-direction: column;
}
.pg-panel--center .pg-panel__header-inner {
  transform: translateX(var(--pg-scroll-x, 0px));
  width: var(--pg-center-content-width, 100%);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Panel body \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-panel__body {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Panel content (virtual scroll) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-panel__content {
  position: relative;
  height: var(--pg-content-height, 0px);
  will-change: transform;
}
.pg-panel--left .pg-panel__content,
.pg-panel--right .pg-panel__content {
  transform: translateY(var(--pg-scroll-y, 0px));
}
.pg-panel--center .pg-panel__content {
  transform: translate(var(--pg-scroll-x, 0px), var(--pg-scroll-y, 0px));
  width: var(--pg-center-content-width, 100%);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Header rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-header-row, .pg-filter-row {
  display: flex;
  align-items: stretch;
}
.pg-header-row { height: var(--pg-header-row-height, 44px); }
.pg-filter-row {
  height: var(--pg-filter-row-height, 36px);
  border-top: 1px solid var(--pg-colors-border, #e2e8f0);
  background: var(--pg-colors-filter-background, #fff);
}
.pg-th {
  display: flex;
  align-items: center;
  position: relative;
  flex-shrink: 0;
  padding: 0;
  color: var(--pg-colors-header-text, #374151);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  font-size: var(--pg-typography-font-size-sm, 12px);
  letter-spacing: var(--pg-typography-letter-spacing-wide, 0.025em);
  text-transform: uppercase;
  border-right: 1px solid var(--pg-colors-header-border, #e2e8f0);
  user-select: none;
  cursor: default;
  transition: background var(--pg-transitions-duration-fast, 100ms);
  overflow: hidden;
  min-width: var(--pg-sizing-column-min-width, 40px);
}
.pg-th:last-child { border-right: none; }
.pg-th--sortable { cursor: pointer; }
// .pg-th:hover, .pg-th.pg-th--sortable:hover { background: var(--pg-colors-header-hover, #f1f5f9); }
// .pg-th.pg-th--sorted { background: var(--pg-colors-header-hover, #f1f5f9); }
.pg-th.pg-th--sort-asc .pg-th__sort-icon,
.pg-th.pg-th--sort-desc .pg-th__sort-icon { color: var(--pg-colors-primary, #2563eb); }
.pg-th.pg-th--filter-active .pg-th__label { color: var(--pg-colors-primary, #2563eb); }
.pg-th--checkbox {
  width: 44px;
  min-width: 44px;
  max-width: 44px;
  justify-content: center;
  flex-shrink: 0;
}
.pg-th--serial {
  width: 52px;
  min-width: 52px;
  max-width: 52px;
  justify-content: center;
  flex-shrink: 0;
}
.pg-th--auto-group {
  flex-shrink: 0;
  background: var(--pg-colors-header-background, #f8fafc);
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  font-size: var(--pg-typography-font-size-xs, 11px);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-cell--auto-group-spacer {
  flex-shrink: 0;
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  background: transparent;
}
.pg-th__content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 0 10px 0 12px;
  height: 100%;
}
.pg-th__label {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-th__sort-icon { flex-shrink: 0; opacity: 0; color: var(--pg-colors-text-secondary, #475569); }
/* Aligned column headers */
.pg-th--align-right .pg-th__label  { text-align: right; }
.pg-th--align-center .pg-th__label { text-align: center; }
.pg-th--align-center .pg-th__content,
.pg-th--no-group .pg-th__content {
  justify-content: center;
}
.pg-th--no-group .pg-th__label {
  text-align: center;
}
/* Reversed header layout for numeric/currency columns: icons LEFT, text RIGHT */
.pg-th--reverse { flex-direction: row-reverse; }
.pg-th--reverse .pg-th__content { flex-direction: row-reverse; padding: 0 12px 0 10px; }
.pg-th--reverse .pg-th__label { flex: 1 1 auto; }
.pg-th--reverse .pg-th__filter-btn { margin-right: 0; margin-left: 2px; }
.pg-th--reverse .pg-th__menu-btn { margin-right: 0; margin-left: 4px; }
.pg-th--sort-asc .pg-th__sort-icon,
.pg-th--sort-desc .pg-th__sort-icon { opacity: 1; color: var(--pg-colors-primary, #2563eb); }
/* \u2500\u2500\u2500 Column header filter button \u2500\u2500\u2500 */
.pg-th__filter-btn {
  flex-shrink: 0;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  margin-right: 2px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  color: var(--pg-colors-text-secondary, #475569);
  opacity: 0.7;
  transition: opacity var(--pg-transitions-duration-fast, 100ms),
              color var(--pg-transitions-duration-fast, 100ms),
              background var(--pg-transitions-duration-fast, 100ms);
}
.pg-th:hover .pg-th__filter-btn,
.pg-th__filter-btn--active { display: flex; }
.pg-th__filter-btn:hover { opacity: 1; background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-th__filter-btn--active {
  opacity: 1;
  color: var(--pg-colors-primary, #2563eb);
}
.pg-th__filter-icon { flex-shrink: 0; color: var(--pg-colors-primary, #2563eb); }
.pg-th__menu-btn {
  flex-shrink: 0;
  display: none;
  cursor: pointer;
  padding: 6px;
  margin-right: 4px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  color: var(--pg-colors-text-secondary, #475569);
  opacity: 0.6;
  transition: opacity var(--pg-transitions-duration-fast, 100ms);
}
.pg-th:hover .pg-th__menu-btn,
.pg-th__menu-btn--active { display: flex; }
.pg-th__menu-btn:hover { opacity: 1; background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-th__menu-btn--active { opacity: 1; background: var(--pg-colors-border, #e2e8f0); }
.pg-th__resize-handle {
 position: absolute;
    right: -1px;
    top: 0;
    width: 6px;
    height: 50%;
    top: 25%;
    cursor: ew-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--pg-colors-resize-handle-color, #d9d9db);
    background: transparent;
    transition: background var(--pg-transitions-duration-fast, 100ms);
    z-index: 5;
    font-size: 10px;
    user-select: none;
    background: #d6d6d6;
    width: 2px;
}
.pg-th__resize-handle:hover,
.pg-th.pg-resizing .pg-th__resize-handle,
.pg-th--resizing .pg-th__resize-handle {
  // background: var(--pg-colors-resize-handle-active-color, #2563eb);
}

/* No vertical-borders mode: completely remove the 1px border slot from both headers and cells */
.pg-grid--no-v-borders .pg-th { border-right: none; }
.pg-grid--no-v-borders .pg-cell { border-right: none; }
// .pg-grid--no-v-borders .pg-th__resize-handle {
//   background: var(--pg-colors-resize-handle-color, #e2e8f0);
// }
.pg-grid--no-v-borders .pg-th__resize-handle:hover,
.pg-grid--no-v-borders .pg-th.pg-resizing .pg-th__resize-handle,
.pg-grid--no-v-borders .pg-th--resizing .pg-th__resize-handle {
  // background: var(--pg-colors-resize-handle-active-color, #2563eb);
}
.pg-th__drag-handle {
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  display: none;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 24px;
  cursor: grab;
  color: var(--pg-colors-text-secondary, #475569);
  z-index: 2;
  border-radius: 3px;
}
.pg-th:hover .pg-th__drag-handle { display: flex; opacity: 0.5; }
.pg-th__drag-handle:hover { opacity: 1 !important; background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-th--dragging { opacity: 0.72; cursor: grabbing !important; }
.pg-th__serial-label { font-size: 11px; opacity: 0.45; }
.pg-header-checkbox { cursor: pointer; width: 16px; height: 16px; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Column group header rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-header-group-row {
  position: relative;
  flex-shrink: 0;
  height: var(--pg-header-row-height, 44px);
  background: var(--pg-colors-header-background, #f8fafc);
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-th--group {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  background: var(--pg-colors-header-background, #f8fafc);
  cursor: pointer;
  outline: none;
  transition: background var(--pg-transitions-duration-fast, 100ms);
  font-weight: var(--pg-typography-header-font-weight, 600);
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #1e293b);
  user-select: none;
}
.pg-th--group:hover,
.pg-th--group:focus-visible { background: var(--pg-colors-header-hover, #f1f5f9); }
.pg-th--group--collapsed {
  background: var(--pg-colors-background-alt, #f1f5f9);
  justify-content: center;
}
// .pg-th--group--collapsed .pg-th__label { display: none; }
.pg-th__collapse-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 4px;
  border-radius: var(--pg-sizing-border-radius, 4px);
  color: var(--pg-colors-text-secondary, #475569);
  transition: background var(--pg-transitions-duration-fast, 100ms),
              color var(--pg-transitions-duration-fast, 100ms);
}
.pg-th--group:hover .pg-th__collapse-btn,
.pg-th--group:focus-visible .pg-th__collapse-btn {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-primary, #2563eb);
}
.pg-th__resize-handle--group {
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  color: var(--pg-colors-resize-handle-color, #e2e8f0);
  z-index: 6;
  transition: opacity var(--pg-transitions-duration-fast, 100ms);
}
.pg-th--group:hover .pg-th__resize-handle--group { opacity: 1; }

/* \u2500\u2500 Flat columns alongside grouped headers \u2500\u2500 */
/* A flat (ungrouped) leaf column in a grid that has grouped columns must span
   the full header height (group rows + leaf row) so it does not appear as a
   short stub next to taller group header cells.
   Strategy: keep the cell in normal flex flow (preserves horizontal layout),
   give it the combined height, and translateY it upward so its visual top
   aligns with the top of the header area.  The panel header overflow:hidden
   clips exactly at the combined height, so nothing leaks outside the header.
   --pg-group-rows-count is set in JS by HeaderRenderer. */
.pg-th--no-group {
  align-self: flex-start;
  position: relative;
  z-index: 2;
  height: calc((var(--pg-group-rows-count, 0) + 1) * var(--pg-header-row-height, 44px));
  transform: translate(var(--pg-drag-x, 0px), calc(var(--pg-group-rows-count, 0) * -1 * var(--pg-header-row-height, 44px)));
}

.pg-group-drop-indicator {
  position: absolute;
  top: 0;
  width: 2px;
  height: var(--pg-header-row-height, 44px);
  background: var(--pg-colors-primary, #2563eb);
  z-index: 20;
  pointer-events: none;
  border-radius: 1px;
}
.pg-th-group-filler { position: absolute; top: 0; height: 100%; }
.pg-th--standalone-filler {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--pg-colors-header-background, #f8fafc);
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  pointer-events: none;
  cursor: default;
}
/* Filler cell in a group row for columns with no ancestor group at this depth.
   Blends with the header background \u2014 makes flat/shallow columns appear to span
   the full header height.  No interactive elements, no bottom border. */
.pg-th--depth-filler {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--pg-colors-header-background, #f8fafc);
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  pointer-events: none;
  cursor: default;
  z-index: 0;
}

@keyframes pg-drag-indicator-in { from { opacity: 0; } to { opacity: 1; } }

/* Smooth column-shift animation \u2014 enabled ONLY while actively dragging a column */
.pg-grid--col-dragging .pg-th[data-col-id],
.pg-grid--col-dragging .pg-cell[data-col-id] {
  transform: translateX(var(--pg-drag-x, 0px));
  transition: transform 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
}
.pg-grid--col-dragging .pg-th--no-group[data-col-id] {
  transform: translate(var(--pg-drag-x, 0px), calc(var(--pg-group-rows-count, 0) * -1 * var(--pg-header-row-height, 44px)));
}

/* During header auto-scroll the transforms update every RAF tick \u2014 disable the
   transition so cells snap instantly rather than endlessly chasing a moving target */
.pg-grid--col-autoscrolling .pg-th[data-col-id],
.pg-grid--col-autoscrolling .pg-cell[data-col-id] {
  transition: none;
}
/* Live-preview path (store mutations during drag): suppress all transitions */
.pg-grid--drag-preview-sync .pg-th[data-col-id],
.pg-grid--drag-preview-sync .pg-cell[data-col-id] {
  transition: none !important;
}

/* \u2500\u2500 Group-header CSS-transform drag \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
 * Cells shift via --pg-drag-x.  The --pg-drag-transition variable is 0ms for
 * the actively-dragged group (injected by display-group-drag-handler.ts) and
 * falls back to the default 180ms for displaced neighbours \u2014 giving AG Grid-
 * style smooth animation for everything except the grabbed group itself.
 * body cells use the same variable so leaf columns and data rows stay in sync.
 */
.pg-grid--group-dragging .pg-th--group {
  transform: translateX(var(--pg-drag-x, 0px));
  transition: transform var(--pg-drag-transition, 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94));
  will-change: transform;
}
.pg-grid--group-dragging .pg-th[data-col-id] {
  transform: translateX(var(--pg-drag-x, 0px));
  transition: transform var(--pg-drag-transition, 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94));
}
.pg-grid--group-dragging .pg-cell[data-col-id] {
  transform: translateX(var(--pg-drag-x, 0px));
  transition: transform var(--pg-drag-transition, 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94));
}
.pg-grid--group-dragging .pg-th--depth-filler {
  transform: translateX(var(--pg-drag-x, 0px));
}
.pg-grid--group-dragging .pg-th--no-group[data-col-id] {
  transform: translate(var(--pg-drag-x, 0px), calc(var(--pg-group-rows-count, 0) * -1 * var(--pg-header-row-height, 44px)));
  transition: transform var(--pg-drag-transition, 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94));
}

/* Column drag ghost (floating preview chip that follows the cursor) */
.pg-col-drag-ghost {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: var(--pg-drag-ghost-gap, 8px);
  padding: 5px 12px 5px 10px;
  background: var(--pg-colors-drag-ghost-background, #fff);
  border: 1.5px solid var(--pg-colors-primary, #2563eb);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: 0 6px 24px rgba(0,0,0,0.13), 0 2px 8px rgba(37, 99, 235, 0.12);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  color: var(--pg-colors-header-text, #374151);
  white-space: nowrap;
  user-select: none;
  transform: translateY(-50%);
  transition:
    border-color var(--pg-transitions-duration-fast, 100ms),
    box-shadow var(--pg-transitions-duration-fast, 100ms);
}
.pg-col-drag-ghost__icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--pg-colors-primary, #2563eb);
  opacity: 0.7;
}
.pg-col-drag-ghost__label {
  flex: 1;
  min-width: 0;
}

/* Default icon visibility */
.pg-col-drag-ghost__icon--move        { display: inline-flex; }
.pg-col-drag-ghost__icon--ban         { display: none; }
.pg-col-drag-ghost__icon--arrow-left  { display: none; }
.pg-col-drag-ghost__icon--arrow-right { display: none; }

/* Hide-column state: amber ghost + eyeOff icon */
.pg-col-drag-ghost__icon--hide { display: none; }
.pg-col-drag-ghost--hide .pg-col-drag-ghost__icon--move { display: none; }
.pg-col-drag-ghost--hide .pg-col-drag-ghost__icon--hide { display: inline-flex; color: var(--pg-colors-warning, #f59e0b); }
.pg-col-drag-ghost--hide {
  border-color: var(--pg-colors-warning, #f59e0b);
  box-shadow: 0 6px 24px rgba(245,158,11,0.13), 0 2px 8px rgba(245,158,11,0.12);
  color: var(--pg-colors-warning, #f59e0b);
}

/* No-drop state: red ghost + ban icon */
.pg-col-drag-ghost--no-drop {
  border-color: var(--pg-colors-danger, #ef4444);
  box-shadow: 0 6px 24px rgba(239,68,68,0.13), 0 2px 8px rgba(239,68,68,0.12);
  color: var(--pg-colors-danger, #ef4444);
}
.pg-col-drag-ghost--no-drop .pg-col-drag-ghost__icon { color: var(--pg-colors-danger, #ef4444); }
.pg-col-drag-ghost--no-drop .pg-col-drag-ghost__icon--move { display: none; }
.pg-col-drag-ghost--no-drop .pg-col-drag-ghost__icon--ban  { display: inline-flex; }

/* Outside-grid drop state: red ghost signals "drop = hide all columns in group" */
.pg-col-drag-ghost--outside {
  border-color: var(--pg-colors-danger, #ef4444);
  box-shadow: 0 6px 24px rgba(239,68,68,0.18), 0 2px 8px rgba(239,68,68,0.14);
  color: var(--pg-colors-danger, #ef4444);
  opacity: 0.85;
}
.pg-col-drag-ghost--outside .pg-col-drag-ghost__label::after {
  content: ' (hide)';
  font-size: 10px;
  opacity: 0.7;
}

/* Auto-scroll state: directional arrow replaces move icon */
@keyframes pg-scroll-arrow-left  { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-4px); } }
@keyframes pg-scroll-arrow-right { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }

.pg-col-drag-ghost--scroll-left .pg-col-drag-ghost__icon--move,
.pg-col-drag-ghost--scroll-right .pg-col-drag-ghost__icon--move { display: none; }
.pg-col-drag-ghost--scroll-left .pg-col-drag-ghost__icon--arrow-left {
  display: inline-flex;
  animation: pg-scroll-arrow-left 700ms ease-in-out infinite;
}
.pg-col-drag-ghost--scroll-right .pg-col-drag-ghost__icon--arrow-right {
  display: inline-flex;
  animation: pg-scroll-arrow-right 700ms ease-in-out infinite;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Filter Row \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-drag-preview {
  position: fixed;
  pointer-events: none;
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: var(--pg-drag-preview-gap, 8px);
  padding: var(--pg-drag-preview-padding, 6px 12px);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-drag-preview, 0 4px 16px rgba(0,0,0,0.18));
  font-size: var(--pg-typography-font-size-md, 13px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  white-space: nowrap;
  will-change: transform;
  background: var(--pg-colors-drag-preview-background, var(--pg-drag-preview-bg, #fff));
  border: 1px solid var(--pg-colors-drag-preview-border, var(--pg-drag-preview-border, #e0e0e0));
  color: var(--pg-colors-text-primary, var(--pg-text-primary, #222));
  top: 0;
  left: 0;
  transform: translate(-9999px, -9999px);
}
.pg-drag-preview__avatar {
  width: var(--pg-drag-preview-avatar-size, 24px);
  height: var(--pg-drag-preview-avatar-size, 24px);
  background: var(--pg-colors-primary, var(--pg-primary, #2563eb));
  overflow: hidden;
  flex-shrink: 0;
}
.pg-drag-preview__avatar--circle { border-radius: 50%; }
.pg-drag-preview__avatar--square { border-radius: var(--pg-borders-radius-sm, 4px); }
.pg-drag-preview__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pg-drag-preview__label {
  flex: 1;
  min-width: 0;
}
.pg-drag-preview__badge {
  background: var(--pg-colors-primary, var(--pg-primary, #2563eb));
  color: var(--pg-colors-primary-contrast, #fff);
  border-radius: var(--pg-borders-radius-pill, 999px);
  padding: 1px 7px;
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  min-width: 20px;
  text-align: center;
}

.pg-filter-cell {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 6px;
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-filter-cell:last-child { border-right: none; }
.pg-filter-cell--checkbox {
  width: 44px;
  min-width: 44px;
  max-width: 44px;
  flex-shrink: 0;
}
.pg-filter-cell--serial {
  width: 52px;
  min-width: 52px;
  max-width: 52px;
  flex-shrink: 0;
}
.pg-filter-input {
  width: 100%;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-family: inherit;
  background: var(--pg-colors-surface, #fff);
  color: inherit;
  outline: none;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-input:focus { border-color: var(--pg-colors-border-focus, #2563eb); }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Filter Panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-filter-panel {
  position: absolute;
  z-index: var(--pg-z-index-filter-panel, 200);
  min-width: 270px;
  max-width: 320px;
  width: max-content;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-lg, 0 8px 24px rgba(0,0,0,.12));
  overflow: hidden;
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text, #1e293b);
  user-select: none;
}

/* \u2500\u2500 Condition filter \u2500\u2500 */
.pg-filter-cond-wrap { padding: 10px; display: flex; flex-direction: column; gap: 6px; }

.pg-filter-cond__row { display: flex; flex-direction: column; gap: 4px; }
.pg-filter-cond__row--hidden { display: none; }

.pg-filter-cond__select {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text, #1e293b);
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-cond__select:focus { border-color: var(--pg-colors-border-focus, #2563eb); }

.pg-filter-cond__inputs { display: flex; align-items: center; gap: 4px; }
.pg-filter-cond__inputs--hidden { display: none; }
/* Stack inputs vertically in range (Between) mode so the panel never overflows horizontally */
.pg-filter-cond__inputs--range { flex-direction: column; align-items: stretch; gap: 4px; }
.pg-filter-cond__inputs--range .pg-filter-cond__range-sep {
  text-align: center;
  padding: 2px 0;
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: 500;
}

.pg-filter-cond__input {
  flex: 1;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text, #1e293b);
  font-size: inherit;
  font-family: inherit;
  outline: none;
  padding: 6px;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-cond__input:focus { border-color: var(--pg-colors-border-focus, #2563eb); }
.pg-filter-cond__input--hidden { display: none; }

.pg-filter-cond__range-sep {
  flex-shrink: 0;
  font-size: var(--pg-typography-font-size-xs, 11px);
  color: var(--pg-colors-text-secondary, #475569);
  padding: 0 2px;
}
.pg-filter-cond__range-sep--hidden { display: none; }

/* \u2500\u2500 Logic toggle row (AND / OR / None) \u2500\u2500 */
.pg-filter-logic {
  display: flex;
  gap: 4px;
  padding: 4px 0 2px;
}
.pg-filter-logic--hidden { display: none; }

.pg-filter-logic__btn {
  flex: 1;
  height: 26px;
  padding: 0 6px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-secondary, #475569);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: background var(--pg-transitions-duration-fast, 100ms),
              color var(--pg-transitions-duration-fast, 100ms),
              border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-logic__btn:hover { background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-filter-logic__btn--active {
  background: var(--pg-colors-primary, #2563eb);
  color: #fff;
  border-color: var(--pg-colors-primary, #2563eb);
}

/* \u2500\u2500 Set filter (dropdown / array) \u2500\u2500 */
.pg-filter-set { display: flex; flex-direction: column; }

.pg-filter-set__search {
  padding: 8px 10px 4px;
}
.pg-filter-set__search-input {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text, #1e293b);
  font-size: inherit;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-set__search-input:focus { border-color: var(--pg-colors-border-focus, #2563eb); }

.pg-filter-set__divider {
  height: 1px;
  background: var(--pg-colors-border, #e2e8f0);
  margin: 2px 0;
}

/* Select All item */
.pg-filter-set__item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 10px;
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms);
  box-sizing: border-box;
  position: absolute;
  left: 0;
  right: 0;
}
.pg-filter-set__item:hover { background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-filter-set__item--select-all {
  position: static;
  font-weight: 500;
  color: var(--pg-colors-text, #1e293b);
}
.pg-filter-set__item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-filter-set__item-label--blank { color: var(--pg-colors-text-disabled, #94a3b8); font-style: italic; }

.pg-filter-set__checkbox {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--pg-colors-primary, #2563eb);
}

/* Virtual scroll containers */
.pg-filter-set__list {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: var(--pg-colors-border, #e2e8f0) transparent;
}
.pg-filter-set__list::-webkit-scrollbar { width: 6px; }
.pg-filter-set__list::-webkit-scrollbar-track { background: transparent; }
.pg-filter-set__list::-webkit-scrollbar-thumb {
  background: var(--pg-colors-border, #e2e8f0);
  border-radius: 3px;
}
.pg-filter-set__list-inner { position: relative; width: 100%; }

/* \u2500\u2500 Panel footer \u2500\u2500 */
.pg-filter-panel__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px;
  // border-top: 1px solid var(--pg-colors-border, #e2e8f0);
  // background: var(--pg-colors-background, #f8fafc);
}

.pg-filter-panel__clear-btn {
  height: 28px;
  padding: 0 14px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-secondary, #475569);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms),
              border-color var(--pg-transitions-duration-fast, 100ms),
              color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-panel__clear-btn:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  border-color: var(--pg-colors-text-secondary, #475569);
  color: var(--pg-colors-text, #1e293b);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-row {
  display: flex;
  align-items: stretch;
  position: absolute;
  left: 0;
  width: 100%;
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  background: var(--pg-colors-row-background, #fff);
  transition: background var(--pg-transitions-duration-fast, 100ms);
}
.pg-row--hover { background: var(--pg-colors-row-hover, #f0f7ff) !important; }
.pg-row--alt { background: var(--pg-colors-row-background-alt, #f8fafc); }
.pg-row--selected {
  background: var(--pg-colors-row-selected, #eff6ff) !important;
  outline: none;
}
.pg-row--selected .pg-cell { color: inherit; }
.pg-row--group {
  background: var(--pg-colors-group-row-background, #f8fafc);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  // border-left: var(--pg-group-row-border-width, 3px) solid var(--pg-colors-primary, #2563eb);
  cursor: pointer;
}
.pg-row--group:hover,
.pg-row--group.pg-row--hover {
  background: var(--pg-colors-group-row-hover, #eff2ff) !important;
}
.pg-row--group:hover .pg-row-group__toggle,
.pg-row--group.pg-row--hover .pg-row-group__toggle {
  background: var(--pg-colors-group-toggle-hover, rgba(37, 99, 235, 0.1));
  color: var(--pg-colors-primary, #2563eb);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Group footer row \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/*
 * Appears below the last leaf child of each expanded group.
 * Shows the same aggregate values as the group header row (AG Grid groupIncludeFooter).
 * Cells are fully selectable and copyable; editing is blocked because values are computed.
 */
.pg-row--group-footer {
  background: var(--pg-colors-group-footer-background, #eef2fa);
  font-style: italic;
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  border-bottom: 2px solid var(--pg-colors-primary-light, #bfdbfe);
  cursor: default;
}
.pg-row--group-footer:hover,
.pg-row--group-footer.pg-row--hover {
  background: var(--pg-colors-group-footer-hover, #e0e9f8) !important;
}
/* Level-based indentation mirrors the group header rules */
.pg-row--group-footer[data-level="0"] .pg-row-group__cell { padding-left: var(--pg-group-indent-0, 8px); }
.pg-row--group-footer[data-level="1"] .pg-row-group__cell { padding-left: var(--pg-group-indent-1, 28px); }
.pg-row--group-footer[data-level="2"] .pg-row-group__cell { padding-left: var(--pg-group-indent-2, 48px); }
.pg-row--group-footer[data-level="3"] .pg-row-group__cell { padding-left: var(--pg-group-indent-3, 68px); }
.pg-row--group-footer[data-level="4"] .pg-row-group__cell { padding-left: var(--pg-group-indent-4, 88px); }
.pg-row--group-footer[data-level="5"] .pg-row-group__cell { padding-left: var(--pg-group-indent-5, 108px); }
.pg-row--group-footer .pg-row-group__label {
  color: var(--pg-colors-text-secondary, #475569);
}
/* Dark-mode overrides */
.pg-grid[data-theme="dark"] .pg-row--group-footer {
  background: var(--pg-colors-group-footer-background, rgba(37, 99, 235, 0.06));
  border-bottom-color: rgba(96, 165, 250, 0.28);
}
.pg-grid[data-theme="dark"] .pg-row--group-footer:hover,
.pg-grid[data-theme="dark"] .pg-row--group-footer.pg-row--hover {
  background: var(--pg-colors-group-footer-hover, rgba(37, 99, 235, 0.11)) !important;
}
.pg-grid[data-theme="dark"] .pg-row--group-footer .pg-row-group__label {
  color: var(--pg-colors-text-secondary, #94a3b8);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Cells \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-cell {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: var(--pg-sizing-column-min-width, 40px);
  border-right: 1px solid transparent;
  padding: 0;
  overflow: hidden;
  position: relative;
}
.pg-cell--v-border { border-right-color: var(--pg-colors-border, #e2e8f0); }
.pg-cell:last-child { border-right: none; }
.pg-cell--align-right  { justify-content: flex-end;  }
.pg-cell--align-center { justify-content: center; }
.pg-cell--align-right  .pg-cell__inner { text-align: right; }
.pg-cell--align-center .pg-cell__inner { text-align: center; }

/* \u2500\u2500\u2500 Cell selection (CSS-based, replaces canvas) \u2500\u2500\u2500 */
/* Suppress the browser's native focus ring \u2014 the grid uses its own blue
   box-shadow indicator on .pg-cell--active-cell instead. */
.pg-cell { user-select: none; outline: none; }

/*
 * Range selection \u2014 edge borders drawn via ::after so CSS border corners
 * always connect cleanly (no box-shadow joining artefacts).
 * The JS engine adds sel-top/right/bottom/left only on cells that sit on
 * the outer edge of the range; interior cells carry no edge classes.
 */
.pg-cell--in-selection {
  background-color: var(--pg-colors-selection-background, aliceblue) !important;
  position: relative;
  z-index: 1;
}
.pg-cell--in-selection::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 0 solid var(--pg-colors-primary, #2563eb);
  pointer-events: none;
}
.pg-cell--sel-top::after    { border-top-width:    1px; }
.pg-cell--sel-bottom::after { border-bottom-width: 1px; }
.pg-cell--sel-left::after   { border-left-width:   1px; }
.pg-cell--sel-right::after  { border-right-width:  1px; }

/* Active (focused) cell \u2014 solid 2px inset border, no background */
.pg-cell--active-cell {
  background-color: transparent !important;
  box-shadow: inset 0 0 0 2px var(--pg-colors-primary, #2563eb) !important;
  position: relative;
  z-index: 2;
  outline: none;
}
/* Suppress the ::after edge overlay only when the active cell is NOT inside a selection */
.pg-cell--active-cell:not(.pg-cell--in-selection)::after { content: none; }

/* Active cell inside a range \u2014 selection wins entirely: no 2px border, full selection look */
.pg-cell--in-selection.pg-cell--active-cell {
  background-color: var(--pg-colors-selection-background, aliceblue) !important;
  box-shadow: none !important;
}

/* Dark-mode overrides */
.pg-grid[data-theme="dark"] .pg-cell--in-selection {
  background-color: rgba(37,99,235,0.18) !important;
}
.pg-grid[data-theme="dark"] .pg-cell--sel-top    { --_t:  2px; }
.pg-grid[data-theme="dark"] .pg-cell--sel-bottom { --_b: -2px; }
.pg-grid[data-theme="dark"] .pg-cell--sel-left   { --_l:  2px; }
.pg-grid[data-theme="dark"] .pg-cell--sel-right  { --_r: -2px; }
.pg-grid[data-theme="dark"] .pg-cell--active-cell {
  background-color: rgba(37,99,235,0.25) !important;
  box-shadow: inset 0 0 0 2px #60a5fa !important;
}
.pg-grid[data-theme="dark"] .pg-cell--in-selection.pg-cell--active-cell {
  background-color: rgba(37,99,235,0.18) !important;
  box-shadow:
    inset 0 var(--_t) 0 0 #60a5fa,
    inset 0 var(--_b) 0 0 #60a5fa,
    inset var(--_l) 0 0 0 #60a5fa,
    inset var(--_r) 0 0 0 #60a5fa !important;
}

/* \u2500\u2500\u2500 Group aggregate cells \u2500\u2500\u2500 */
/*
 * Aggregate values are displayed inside .pg-cell--agg cells that sit directly
 * under their column headers, aligned with normal data-row cells via the same
 * [data-col-id] width rules managed by ColumnStyleManager.
 */
.pg-cell--agg {
  color: var(--pg-colors-agg-text, var(--pg-colors-text-secondary, #475569));
  font-style: italic;
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
}
.pg-grid[data-theme="dark"] .pg-cell--agg {
  color: var(--pg-colors-agg-text, var(--pg-colors-text-secondary, #94a3b8));
}

/* \u2500\u2500\u2500 Copy / Cut flash feedback \u2500\u2500\u2500 */
/*
 * background-color: !important on pg-cell--in-selection blocks keyframe bg changes.
 * Use a ::after overlay instead \u2014 it's a separate layer, no !important conflict.
 */
@keyframes pg-copy-flash-overlay {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes pg-cut-flash-overlay {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  100% { opacity: 0; }
}
/*
 * Flash overlay uses ::before so it never conflicts with the ::after
 * pseudo-element that draws the selection edge borders.
 */
.pg-cell--copy-flash::before,
.pg-cell--cut-flash::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}
.pg-cell--copy-flash::before {
  background: rgba(59, 130, 246, 0.45);
  animation: pg-copy-flash-overlay 0.75s ease-out forwards;
}
.pg-cell--cut-flash::before {
  background: rgba(239, 68, 68, 0.45);
  animation: pg-cut-flash-overlay 0.75s ease-out forwards;
}
/* Dark mode uses stronger overlay */
.pg-grid[data-theme="dark"] .pg-cell--copy-flash::before {
  background: rgba(99, 165, 253, 0.5);
}
.pg-grid[data-theme="dark"] .pg-cell--cut-flash::before {
  background: rgba(252, 100, 100, 0.5);
}

/* \u2500\u2500\u2500 Fill success flash \u2500\u2500\u2500 */
/*
 * Applied to the newly filled cells after a fill-handle drag completes.
 * Uses ::before (same as copy/cut flash) so it never conflicts with the
 * selection edge border drawn on ::after.
 */
@keyframes pg-fill-flash-overlay {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  100% { opacity: 0; }
}
.pg-cell--fill-flash::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  background: rgba(34, 197, 94, 0.45);
  animation: pg-fill-flash-overlay 0.75s ease-out forwards;
}
.pg-grid[data-theme="dark"] .pg-cell--fill-flash::before {
  background: rgba(74, 222, 128, 0.5);
}

/* \u2500\u2500\u2500 Fill handle \u2500\u2500\u2500 */
/*
 * The fill handle is a small drag target at the bottom-right corner of the
 * primary selection range.  It lives inside the corner cell as an absolutely-
 * positioned child so it scrolls with the grid naturally.
 *
 * pg-cell--has-fill-handle lets the handle extend 4 px past the cell edge
 * (standard AG Grid behaviour) by lifting overflow:hidden on that one cell.
 *
 * Dragging from the handle copies the source range into the dragged area in
 * one direction at a time; a dashed overlay (pg-cell--fill-preview) previews
 * the fill area before the mouse button is released.
 */
.pg-cell--has-fill-handle {
  overflow: visible !important;
}
.pg-fill-handle {
  position: absolute;
  right: 0px;
  bottom: 0px;
  width: 6px;
  height: 6px;
  box-sizing: border-box;
  background-color: var(--pg-colors-primary, #2563eb);
  cursor: crosshair;
  z-index: 10;
  pointer-events: auto;
  user-select: none;
}

/* \u2500\u2500\u2500 Fill preview \u2014 dashed border on cells being hovered during fill drag \u2500\u2500\u2500 */
.pg-cell--fill-preview {
  background-color: var(--pg-colors-selection-background, aliceblue) !important;
  position: relative;
  z-index: 1;
}
/*
 * The fill-preview ::after uses a dashed border (vs the solid selection border)
 * to clearly distinguish "about to be filled" from "already selected."
 * These classes are orthogonal to sel-top/bottom/left/right \u2014 fill-preview
 * cells are never pg-cell--in-selection, so there is no ::after conflict.
 */
.pg-cell--fill-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 0 dashed var(--pg-colors-primary, #2563eb);
  pointer-events: none;
}
.pg-cell--fp-top::after    { border-top-width:    1px; }
.pg-cell--fp-bottom::after { border-bottom-width: 1px; }
.pg-cell--fp-left::after   { border-left-width:   1px; }
.pg-cell--fp-right::after  { border-right-width:  1px; }

.pg-grid[data-theme="dark"] .pg-cell--fill-preview {
  background-color: rgba(37, 99, 235, 0.12) !important;
}

/* \u2500\u2500\u2500 Context menu \u2500\u2500\u2500 */
.pg-context-menu {
  position: fixed;
  z-index: 999999;
  display: none;
  min-width: 192px;
  padding: 4px 0;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-dropdown, 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.07));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-md, 13px);
}
.pg-context-menu--visible { display: block; }
.pg-context-menu__item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 7px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--pg-colors-text-primary, #0f172a);
  gap: 0;
  transition: background 80ms;
}
.pg-context-menu__item:hover { background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-context-menu__item:active { background: var(--pg-colors-border, #e2e8f0); }
.pg-context-menu__label { flex: 1; }
.pg-context-menu__kbd {
  font-size: var(--pg-typography-font-size-sm, 11px);
  color: var(--pg-colors-text-disabled, #94a3b8);
  letter-spacing: 0.01em;
}
.pg-context-menu__sep {
  height: 1px;
  margin: 4px 0;
  background: var(--pg-colors-border, #e2e8f0);
}

.pg-cell__inner {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 12px;
  overflow: hidden;
}
.pg-cell__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: var(--pg-typography-line-height-base, 1.5);
}
.pg-cell--checkbox {
  width: 44px;
  min-width: 44px;
  max-width: 44px;
  justify-content: center;
  flex-shrink: 0;
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-cell--serial {
  width: 52px;
  min-width: 52px;
  max-width: 52px;
  justify-content: center;
  flex-shrink: 0;
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  color: var(--pg-colors-text-secondary, #475569);
  font-size: var(--pg-typography-font-size-sm, 12px);
}
.pg-cell__serial { font-variant-numeric: tabular-nums; }
.pg-cell--bool-true { color: var(--pg-colors-success, #16a34a); }
.pg-cell--bool-false { color: var(--pg-colors-text-disabled, #94a3b8); }
.pg-cell__image { border-radius: var(--pg-borders-radius-sm, 4px); object-fit: cover; }
.pg-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  white-space: nowrap;
}
.pg-cell--range-selected { background: var(--pg-colors-selection-background, rgba(37,99,235,0.08)); }
.pg-cell--editing { padding: 0;border-radius: 4px }
.pg-cell--editing .pg-cell__inner { padding: 0; overflow: visible; }
.pg-selection-canvas { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 10; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Checkbox \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-checkbox {
  width: var(--pg-sizing-checkbox-size, 16px);
  height: var(--pg-sizing-checkbox-size, 16px);
  accent-color: var(--pg-colors-primary, #2563eb);
  cursor: pointer;
  flex-shrink: 0;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Row Group \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* Inner layout cell \u2014 carries level-based left padding */
.pg-row-group__cell {
  display: flex;
  align-items: center;
  gap: var(--pg-group-row-gap, 6px);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding-right: var(--pg-group-row-padding-right, 16px);
}

/* Level-based indentation (data-level set by the renderer, no inline style) */
.pg-row--group[data-level="0"] .pg-row-group__cell { padding-left: var(--pg-group-indent-0, 8px); }
.pg-row--group[data-level="1"] .pg-row-group__cell { padding-left: var(--pg-group-indent-1, 28px); }
.pg-row--group[data-level="2"] .pg-row-group__cell { padding-left: var(--pg-group-indent-2, 48px); }
.pg-row--group[data-level="3"] .pg-row-group__cell { padding-left: var(--pg-group-indent-3, 68px); }
.pg-row--group[data-level="4"] .pg-row-group__cell { padding-left: var(--pg-group-indent-4, 88px); }
.pg-row--group[data-level="5"] .pg-row-group__cell { padding-left: var(--pg-group-indent-5, 108px); }

/* Toggle button \u2014 a themed wrapper, not the raw icon element */
.pg-row-group__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--pg-group-toggle-size, 24px);
  height: var(--pg-group-toggle-size, 24px);
  border-radius: var(--pg-borders-radius-sm, 4px);
  color: var(--pg-colors-text-secondary, #64748b);
  background: transparent;
  transition:
    background var(--pg-transitions-duration-fast, 100ms),
    color var(--pg-transitions-duration-fast, 100ms);
}

.pg-row-group__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--pg-colors-group-row-text, inherit);
}

.pg-row-group__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--pg-group-count-min-width, 24px);
  padding: var(--pg-group-count-padding, 1px 8px);
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-badge-background, #dbeafe);
  color: var(--pg-colors-badge-text, #1e40af);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Scrollbars \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* Native vertical scrollbar \u2014 flex item that lives beside the center panel.
   It is NOT absolutely positioned so it never overlaps cell content; the center
   panel shrinks to make room for it, keeping every cell border fully visible. */
.pg-scrollbar-v-native {
  flex-shrink: 0;
  overflow-y: scroll;
  overflow-x: hidden;
  background: var(--pg-colors-scrollbar-bg, #fff);
}
.pg-scrollbar-v-spacer {
  width: 1px;
  pointer-events: none;
}
/* Horizontal row: sits below the body */
.pg-scrollbar-h-row {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  border-top: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-scrollbar-h-spacer { flex-shrink: 0; background: var(--pg-colors-scrollbar-bg, #fff); }
.pg-scrollbar-h-spacer--left  { width: var(--pg-left-panel-width, 0px); overflow: scroll; }
.pg-scrollbar-h-spacer--right { width: var(--pg-right-panel-width, 0px); overflow: scroll; }
/* Aligns the h-scroll track with the narrowed center panel (which is now
   offset by the vertical scrollbar width captured in --pg-scrollbar-v-width). */
.pg-scrollbar-h-spacer--vscroll {
  flex-shrink: 0;
  width: var(--pg-scrollbar-v-width, 0px);
  background: var(--pg-colors-scrollbar-bg, #fff);
}
/* Native horizontal scrollbar container */
.pg-scrollbar-h-native {
  flex: 1 1 0;
  min-width: 0;
  overflow-x: scroll;
  overflow-y: hidden;
  background: var(--pg-colors-scrollbar-bg, #fff);
}
.pg-scrollbar-h-content {
  height: 1px;
  pointer-events: none;
}
/* Hidden state \u2014 applied to wraps */
.pg-scrollbar--hidden { display: none; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Editors \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-editor {
  width: 100%;
  height: 100%;
  padding: 0 12px;
  border: none;
  outline: none;
  font-size: inherit;
  font-family: inherit;
  background: var(--pg-colors-cell-edit-background, #fff);
  color: inherit;
  box-sizing: border-box;
}
.pg-editor:focus { outline: none; box-shadow: inset 0 0 0 2px var(--pg-colors-primary, #2563eb); }
.pg-editor--select { cursor: pointer; padding-right: 8px; }
.pg-editor--checkbox { width: auto; height: auto; margin: auto; cursor: pointer; }

/* \u2500\u2500 Multi-select (array) editor \u2500\u2500 */
.pg-editor--multiselect {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0;
  cursor: pointer;
  background: var(--pg-colors-cell-edit-background, #fff);
}
.pg-editor__ms-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 0 8px 0 12px;
  user-select: none;
  gap: 6px;
}
.pg-editor__ms-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: inherit;
  color: inherit;
}
.pg-editor__ms-arrow {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-editor__ms-arrow::after {
  content: '';
  display: block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}
.pg-editor__ms-panel {
  display: none;
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  min-width: 100%;
  max-height: 220px;
  overflow-y: auto;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
  z-index: 9999;
  padding: 4px;
}
.pg-editor__ms-panel--open { display: block; }
.pg-editor__ms-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 80ms;
  font-size: inherit;
  font-family: inherit;
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-editor__ms-option:hover { background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-editor__ms-check {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--pg-colors-primary, #2563eb);
}
.pg-editor__ms-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* \u2500\u2500 Custom dropdown editor \u2500\u2500 */
.pg-dropdown-editor__trigger {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 6px 0 12px;
  gap: 6px;
  cursor: default;
}
.pg-dropdown-editor__trigger-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: inherit;
  color: inherit;
}
.pg-dropdown-editor__arrow {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-dropdown-editor__arrow::after {
  content: '';
  display: block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}
/* Panel \u2014 position:fixed, appended to document.body */
.pg-dropdown-editor__panel {
  position: fixed;
  z-index: 99999;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07);
  overflow: hidden;
  opacity: 0;
  transform: scaleY(0.94) translateY(-4px);
  transform-origin: top center;
  transition: opacity 130ms ease, transform 130ms ease;
}
.pg-dropdown-editor__panel--visible {
  opacity: 1;
  transform: scaleY(1) translateY(0);
}
.pg-dropdown-editor__panel--above {
  transform-origin: bottom center;
  transform: scaleY(0.94) translateY(4px);
}
.pg-dropdown-editor__panel--above.pg-dropdown-editor__panel--visible {
  transform: scaleY(1) translateY(0);
}
/* Scrollable list */
.pg-dropdown-editor__scroll {
  overflow-y: auto;
  overflow-x: hidden;
  outline: none;
}
.pg-dropdown-editor__scroll::-webkit-scrollbar { width: 5px; }
.pg-dropdown-editor__scroll::-webkit-scrollbar-track { background: transparent; }
.pg-dropdown-editor__scroll::-webkit-scrollbar-thumb {
  background: var(--pg-colors-border, #e2e8f0);
  border-radius: 3px;
}
/* Virtual scroll layout */
.pg-dropdown-editor__spacer { position: relative; }
.pg-dropdown-editor__items  { position: absolute; left: 0; right: 0; top: 0; }
/* Option rows \u2014 height must equal CustomDropdownEditor.ITEM_HEIGHT (34px) */
.pg-dropdown-editor__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  height: 34px;
  cursor: pointer;
  transition: background 60ms;
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: 13px;
}
.pg-dropdown-editor__option:hover,
.pg-dropdown-editor__option--highlighted {
  background: var(--pg-colors-background-alt, #f1f5f9);
}
.pg-dropdown-editor__option--selected {
  background: var(--pg-colors-primary-subtle, #eff6ff);
  color: var(--pg-colors-primary, #2563eb);
  font-weight: 500;
}
.pg-dropdown-editor__option--selected.pg-dropdown-editor__option--highlighted {
  background: var(--pg-colors-primary-subtle-hover, #dbeafe);
}
/* Icon / image before label */
.pg-dropdown-editor__opt-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 3px;
}
.pg-dropdown-editor__opt-icon img {
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 2px;
  display: block;
}
.pg-dropdown-editor__opt-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Checkmark for the currently selected option */
.pg-dropdown-editor__opt-check {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-colors-primary, #2563eb);
}
.pg-dropdown-editor__opt-check::after {
  content: '';
  display: block;
  width: 5px;
  height: 9px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg) translate(-1px, -1px);
}
/* Empty state */
.pg-dropdown-editor__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: 13px;
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
}

/* \u2500\u2500 Array cell tag display \u2500\u2500 */
.pg-cell__value--tags {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}
.pg-badge--overflow {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: 10px;
  flex-shrink: 0;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Footer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-grid__footer {
  flex-shrink: 0;
  border-top: 1px solid var(--pg-colors-footer-border, #e2e8f0);
  background: var(--pg-colors-footer-background, #f8fafc);
}
.pg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  gap: 16px;
}
.pg-pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}
.pg-pagination__info {
  font-size: var(--pg-typography-font-size-sm, 12px);
  color: var(--pg-colors-text-secondary, #475569);
  min-width: 100px;
  text-align: center;
}
.pg-pagination__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
  cursor: pointer;
  transition: all var(--pg-transitions-duration-fast, 100ms);
}
.pg-pagination__btn:hover:not(:disabled) { background: var(--pg-colors-background-alt, #f1f5f9); border-color: var(--pg-colors-border-strong, #cbd5e1); }
.pg-pagination__btn:disabled { opacity: 0.38; cursor: not-allowed; }
.pg-pagination__page-input {
  width: 54px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-family: inherit;
  background: var(--pg-colors-surface, #fff);
  color: inherit;
  text-align: center;
  outline: none;
}
.pg-pagination__page-input:focus { border-color: var(--pg-colors-border-focus, #2563eb); }
.pg-pagination__size { display: flex; align-items: center; gap: 8px; }
.pg-pagination__size-label { font-size: var(--pg-typography-font-size-sm, 12px); color: var(--pg-colors-text-secondary, #475569); white-space: nowrap; }
.pg-pagination__size-select {
  height: 30px;
  padding: 0 6px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-family: inherit;
  background: var(--pg-colors-surface, #fff);
  color: inherit;
  cursor: pointer;
  outline: none;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Overlay \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--pg-colors-surface, #fff);
  z-index: 20;
}
.pg-overlay--loading { background: rgba(255,255,255,0.85); }
.pg-overlay__text { color: var(--pg-colors-text-secondary, #475569); font-size: var(--pg-typography-font-size-md, 13px); }
.pg-overlay__icon { color: var(--pg-colors-text-disabled, #94a3b8); }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Drag \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-dragging { opacity: 0.5; }
.pg-drop-before { box-shadow: 0 -2px 0 0 var(--pg-colors-primary, #2563eb); }
.pg-drop-after  { box-shadow: 0 2px 0 0 var(--pg-colors-primary, #2563eb); }
.pg-drop-over   { background: var(--pg-colors-drag-over-highlight, rgba(37,99,235,0.06)) !important; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Fullscreen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-grid--fullscreen { position: fixed; inset: 0; z-index: 9999; border-radius: 0; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Chart \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-chart { display: flex; flex-direction: column; gap: 8px; }
.pg-chart__title { font-size: var(--pg-typography-font-size-lg, 14px); font-weight: var(--pg-typography-font-weight-semi-bold, 600); color: var(--pg-colors-text-primary); padding: 4px 0; }
.pg-chart__canvas { display: block; max-width: 100%; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Icon \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pg-icon svg { display: block; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Auto Row Height \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-grid--auto-row-height .pg-row {
  height: auto;
}
.pg-grid--auto-row-height .pg-cell {
  overflow: visible;
}
.pg-grid--auto-row-height .pg-cell__inner {
  height: auto;
  overflow: visible;
  align-items: flex-start;
  padding-top: 10px;
  padding-bottom: 10px;
}
.pg-grid--auto-row-height .pg-cell__value {
  white-space: normal;
  overflow: visible;
  text-overflow: initial;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Row Drag \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-grid__body { position: relative; }

.pg-row-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 100%;
  flex-shrink: 0;
  cursor: grab;
  opacity: 0.35;
  color: var(--pg-colors-text-secondary, #475569);
  margin-right: 4px;
}
.pg-row-drag-handle:hover { opacity: 0.7; }
.pg-row-drag-handle:active { cursor: grabbing; }

.pg-row-drag-ghost {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: var(--pg-borders-radius-md, 6px);
  border: 1.5px solid var(--pg-colors-primary, #2563eb);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-primary, #2563eb);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-weight: 500;
  box-shadow: 0 6px 24px rgba(37,99,235,0.13), 0 2px 8px rgba(37,99,235,0.12);
  transform: translate(12px, -50%);
  white-space: nowrap;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pg-row-drag-ghost__icon { display: inline-flex; align-items: center; opacity: 0.8; }
.pg-row-drag-ghost__icon--block { display: none; }
.pg-row-drag-ghost__label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }

.pg-row-drag-ghost--outside {
  border-color: var(--pg-colors-danger, #ef4444);
  box-shadow: 0 6px 24px rgba(239,68,68,0.13), 0 2px 8px rgba(239,68,68,0.12);
  color: var(--pg-colors-danger, #ef4444);
}
.pg-row-drag-ghost--outside .pg-row-drag-ghost__icon--drag { display: none; }
.pg-row-drag-ghost--outside .pg-row-drag-ghost__icon--block { display: inline-flex; }

.pg-row-drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--pg-colors-primary, #2563eb);
  pointer-events: none;
  z-index: 100;
  border-radius: 1px;
}
.pg-row-drop-indicator::before {
  content: '';
  position: absolute;
  left: -3px;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pg-colors-primary, #2563eb);
}

/* The dragged row: semi-transparent, moves to virtual landing position */
.pg-row--row-dragging { opacity: 0.4; }

/* During row drag: kill hover/click on all rows; animate top changes.
   Uses top (not transform) so rows stay within panel overflow:hidden bounds. */
.pg-grid--row-dragging .pg-row {
  pointer-events: none;
  will-change: top;
  transition: background var(--pg-transitions-duration-fast, 100ms),
              top 130ms cubic-bezier(0.2, 0, 0, 1);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Chart Panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-chart-panel-backdrop {
  position: absolute; inset: 0; z-index: 9990;
  background: transparent;
  overflow: hidden;
  pointer-events: none;
}
.pg-chart-panel-backdrop--open {
  pointer-events: auto;
}
.pg-chart-panel-backdrop--fullscreen {
  position: fixed !important;
  background: rgba(0,0,0,0.40) !important;
}
.pg-chart-panel {
  position: absolute;
  background: var(--pg-colors-surface,#fff);
  border-radius: 4px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18),0 2px 12px rgba(0,0,0,0.10);
  display: flex; flex-direction: column;
  width: min(720px, 88%); height: min(520px, 85%);
  overflow: hidden;
  pointer-events: auto;
}
.pg-chart-panel--fullscreen {
  width: calc(100%) !important; height: calc(100%) !important;
}
.pg-chart-panel__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--pg-colors-border,#e2e8f0);
  flex-shrink: 0;
  cursor: grab; user-select: none;
}
.pg-chart-panel__header--dragging { cursor: grabbing; }
.pg-chart-panel--dragging .pg-chart-panel__body { pointer-events: none; }
.pg-chart-panel__title {
  font-size: 15px; font-weight: 600;
  color: var(--pg-colors-text-primary,#0f172a);
  font-family: var(--pg-typography-font-family,system-ui,sans-serif);
}
.pg-chart-panel__actions { display: flex; align-items: center; gap: 4px; }
.pg-chart-panel__action-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 4px;
  border: none; background: transparent;
  color: var(--pg-colors-text-secondary,#64748b); cursor: pointer;
  transition: background 80ms, color 80ms;
}
.pg-chart-panel__action-btn:hover {
  background: var(--pg-colors-background-alt,#f1f5f9);
  color: var(--pg-colors-text-primary,#0f172a);
}
.pg-chart-panel__body {
  flex: 1; min-height: 0; position: relative; padding: 8px; overflow: hidden;
}
.pg-chart-panel__canvas { display: block; }
.pg-chart-panel__dots-btn {
  position: absolute; top: 12px; right: 12px; z-index: 10;
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 4px;
  border: none; background: transparent;
  color: var(--pg-colors-text-secondary,#64748b); cursor: pointer;
  transition: background 80ms;
}
.pg-chart-panel__dots-btn:hover, .pg-chart-panel__dots-btn--active {
  background: var(--pg-colors-background-alt,#f1f5f9);
  color: var(--pg-colors-text-primary,#0f172a);
}
.pg-chart-panel__dots-menu {
  display: none; position: absolute; top: 40px; right: 8px; z-index: 20;
  background: var(--pg-colors-surface,#fff);
  border: 1px solid var(--pg-colors-border,#e2e8f0);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  min-width: 160px; padding: 4px;
}
.pg-chart-panel__dots-menu--open { display: block; }
.pg-chart-panel__dots-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 7px 10px;
  border: none; border-radius: 4px; background: transparent;
  cursor: pointer; text-align: left;
  font-size: 13px; color: var(--pg-colors-text-primary,#0f172a);
  font-family: var(--pg-typography-font-family,system-ui,sans-serif);
  transition: background 80ms;
}
.pg-chart-panel__dots-item:hover { background: var(--pg-colors-background-alt,#f1f5f9); }
.pg-chart-panel__empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 10px; padding: 24px;
  color: var(--pg-colors-text-secondary,#64748b);
  font-family: var(--pg-typography-font-family,system-ui,sans-serif);
}
.pg-chart-panel__empty-icon { opacity: 0.35; color: var(--pg-colors-text-secondary,#64748b); }
.pg-chart-panel__empty-text {
  font-size: 15px; font-weight: 600;
  color: var(--pg-colors-text-primary,#0f172a);
}
.pg-chart-panel__empty-sub {
  font-size: 12px; text-align: center; max-width: 280px;
  color: var(--pg-colors-text-secondary,#64748b);
}
.pg-chart-panel__legend {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
  gap: 2px 4px; padding: 5px 12px 8px;
  flex-shrink: 0;
  border-top: 1px solid var(--pg-colors-border,#e2e8f0);
}
.pg-chart-panel__legend:empty { border-top: none; padding: 0; }
.pg-chart-panel__legend-item {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 8px; border-radius: 5px;
  border: none; background: transparent; cursor: pointer;
  font-size: 12px; color: var(--pg-colors-text-secondary,#64748b);
  font-family: var(--pg-typography-font-family,system-ui,sans-serif);
  user-select: none;
  transition: background 80ms, opacity 220ms;
}
.pg-chart-panel__legend-item:hover {
  background: var(--pg-colors-background-alt,#f1f5f9);
  color: var(--pg-colors-text-primary,#0f172a);
}
.pg-chart-panel__legend-item--hidden { opacity: 0.35; }
.pg-chart-panel__legend-swatch {
  width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0;
}
.pg-chart-panel__legend-label {
  max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Context menu submenu \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.pg-context-menu__item { display: flex; align-items: center; gap: 8px; }
.pg-context-menu__item--has-sub { position: relative; padding-right: 28px; }
.pg-context-menu__item--has-sub > .pg-context-menu__sub { display: none; }
.pg-context-menu__item--has-sub:hover > .pg-context-menu__sub { display: block; }
.pg-context-menu__sub {
  position: absolute; left: 100%; top: -4px; z-index: 10001;
  background: var(--pg-colors-surface,#fff);
  border: 1px solid var(--pg-colors-border,#e2e8f0);
  border-radius: var(--pg-borders-radius-md,6px);
  box-shadow: var(--pg-shadows-dropdown,0 8px 24px rgba(0,0,0,0.12));
  min-width: 175px; padding: 4px;
  white-space: nowrap;
}
.pg-context-menu__item--has-sub::after {
  content: '\u203A'; position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  font-size: 16px; color: var(--pg-colors-text-secondary,#64748b); line-height: 1;
}
.pg-context-menu__icon {
  display: inline-flex; align-items: center; width: 16px; flex-shrink: 0;
  color: var(--pg-colors-text-secondary,#64748b);
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Sparkline cell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* Cell value wrapper \u2014 fills the inner cell area as a flex row */
.pg-cell__value--sparkline {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  padding: 0;
}

/* Wrapper div that stretches canvas to fill the cell */
.pg-sparkline-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
}

/* Canvas element \u2014 fills wrapper, no border or background */
.pg-sparkline {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  cursor: crosshair;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Sparkline tooltip \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* Singleton floating tooltip attached to document.body */
.pg-sparkline-tooltip {
  position: fixed;
  z-index: 99999;
  pointer-events: none;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-tooltip, 0 4px 14px rgba(0,0,0,0.12));
  padding: 6px 10px;
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  color: var(--pg-colors-text-primary, #0f172a);
  white-space: nowrap;
  line-height: 1.5;
  min-width: 60px;
}
.pg-sparkline-tooltip--hidden {
  display: none;
}

/* x-axis label row (shown when data is an object array with xKey) */
.pg-sparkline-tooltip__label {
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
  margin-bottom: 2px;
}

/* Numeric value row */
.pg-sparkline-tooltip__value {
  font-weight: 600;
  color: var(--pg-colors-text-primary, #0f172a);
}

/* OHLC four-row layout */
.pg-sparkline-tooltip__ohlc-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.pg-sparkline-tooltip__ohlc-key {
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
  min-width: 12px;
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Column Context Menu \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* Menu container \u2014 fixed-position dropdown attached to document.body */
.pg-col-ctx-menu {
  position: fixed;
  z-index: 9999;
  min-width: 220px;
  max-width: 300px;
  padding: 4px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-dropdown, 0 8px 24px rgba(15, 23, 42, 0.12));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #0f172a);
  user-select: none;
  outline: none;
}

/* Horizontal divider between section groups */
.pg-col-ctx-menu__separator {
  height: 1px;
  background: var(--pg-colors-border, #e2e8f0);
  margin: 4px 0;
}

/* \u2500\u2500 Menu items \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* Base item \u2014 covers both leaf items and parent (submenu-trigger) items */
.pg-col-ctx-menu__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  cursor: pointer;
  transition: background var(--pg-transitions-fast, 80ms ease);
  outline: none;
  white-space: nowrap;
}

.pg-col-ctx-menu__item:hover,
.pg-col-ctx-menu__item:focus-visible {
  background: var(--pg-colors-background-alt, #f1f5f9);
}

/* Highlighted / "currently applied" item (e.g. active sort direction) */
.pg-col-ctx-menu__item--active {
  color: var(--pg-colors-primary, #2563eb);
  font-weight: 600;
}

/* Disabled item \u2014 rendered but not interactive */
.pg-col-ctx-menu__item--disabled {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
}

/* \u2500\u2500 Item anatomy \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* Leading icon */
.pg-col-ctx-menu__item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  opacity: 0.6;
}

.pg-col-ctx-menu__item--active .pg-col-ctx-menu__item-icon {
  opacity: 1;
}

/* Text label \u2014 fills remaining space */
.pg-col-ctx-menu__item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Trailing chevron indicating a fly-out submenu */
.pg-col-ctx-menu__item-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  opacity: 0.4;
  margin-left: 4px;
  transition: opacity var(--pg-transitions-fast, 80ms ease);
}

.pg-col-ctx-menu__item--has-submenu:hover .pg-col-ctx-menu__item-chevron {
  opacity: 0.75;
}

/* \u2500\u2500 Fly-out submenu \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* Hidden by default; shown when JS adds --open or on CSS :hover */
.pg-col-ctx-menu__submenu {
  display: none;
  position: absolute;
  left: 100%;
  top: -4px;
  min-width: 180px;
  padding: 4px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-dropdown, 0 8px 24px rgba(15, 23, 42, 0.12));
  z-index: 10000;
}

/* JS-controlled open state */
.pg-col-ctx-menu__submenu--open {
  display: block;
}

/* Invisible hover bridge \u2014 prevents flicker when mouse crosses from
   parent item edge into the submenu. Extends 6px to the left of the submenu. */
.pg-col-ctx-menu__submenu--open::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 0;
  width: 8px;
  height: 100%;
}

`;
  var css = [baseCss, themeQuartzCss, themeAlpineCss, themeBalhamCss, themeMaterialCss, themeDarkCss].join("\n");
  function injectBaseStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // src/engines/editing/value-parser.ts
  function parseValue(raw, col) {
    if (raw === null || raw === void 0 || raw === "") {
      return col.required ? null : null;
    }
    switch (col.type) {
      case "number":
      case "currency": {
        const n = Number(raw);
        return isNaN(n) ? null : n;
      }
      case "boolean":
        if (typeof raw === "boolean") return raw;
        if (typeof raw === "string") return raw.toLowerCase() === "true" || raw === "1";
        return Boolean(raw);
      case "date":
      case "time": {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
      case "array":
        return Array.isArray(raw) ? raw : [raw];
      default:
        return String(raw);
    }
  }
  function formatValue(value, col, options) {
    if (value === null || value === void 0) return "";
    switch (col.type) {
      case "number": {
        const n = Number(value);
        if (isNaN(n)) return String(value);
        const locale = options?.locale ?? "en-US";
        return n.toLocaleString(locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
      }
      case "currency": {
        const n = Number(value);
        if (isNaN(n)) return String(value);
        const symbol = options?.currencySymbol ?? "$";
        return `${symbol}${n.toLocaleString(options?.locale ?? "en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
      case "date": {
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        return formatDate(d, options?.dateFormat ?? "dd/MM/yyyy", options?.timeZone);
      }
      case "time": {
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        return d.toLocaleTimeString(options?.locale ?? "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: options?.timeZone
        });
      }
      case "boolean":
        return value ? "Yes" : "No";
      case "array":
        return Array.isArray(value) ? value.join(", ") : String(value);
      case "dropdown": {
        const opt = col.dropdownOptions?.find((o) => String(o.value) === String(value));
        return opt ? opt.label : String(value);
      }
      default: {
        const str = String(value);
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
    }
  }
  function validateValue(value, col) {
    if (col.required && (value === null || value === void 0 || value === "")) {
      return `${col.header} is required`;
    }
    if (col.type === "number" || col.type === "currency") {
      const n = Number(value);
      if (value !== null && value !== void 0 && value !== "" && isNaN(n)) {
        return `${col.header} must be a number`;
      }
      if (!isNaN(n)) {
        if (col.min !== void 0 && col.min !== null && n < col.min) {
          return `${col.header} must be at least ${col.min}`;
        }
        if (col.max !== void 0 && col.max !== null && n > col.max) {
          return `${col.header} must be at most ${col.max}`;
        }
      }
    }
    if (col.type === "email" && value) {
      const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRe.test(String(value))) {
        return `${col.header} must be a valid email address`;
      }
    }
    if (col.validatorFn) {
      return col.validatorFn(value);
    }
    return null;
  }
  function formatDate(date, format, timeZone) {
    const opts = {};
    if (timeZone) opts.timeZone = timeZone;
    const pad = (n) => String(n).padStart(2, "0");
    const d = new Date(date.toLocaleString("en-US", opts));
    return format.replace("yyyy", String(d.getFullYear())).replace("MM", pad(d.getMonth() + 1)).replace("dd", pad(d.getDate())).replace("HH", pad(d.getHours())).replace("mm", pad(d.getMinutes())).replace("ss", pad(d.getSeconds()));
  }

  // src/engines/editing/custom-dropdown-editor.ts
  var _CustomDropdownEditor = class _CustomDropdownEditor {
    constructor(container, cellEl, options, currentValue, callbacks) {
      this.container = container;
      this.cellEl = cellEl;
      this.options = options;
      this.currentValue = currentValue;
      this.callbacks = callbacks;
      this.instanceId = ++_CustomDropdownEditor.instanceCounter;
      this.destroyed = false;
      // ── Event handlers ─────────────────────────────────────────────────────────
      this.handleKeyDown = (e) => {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            this.navigate(1);
            break;
          case "ArrowUp":
            e.preventDefault();
            this.navigate(-1);
            break;
          case "PageDown":
            e.preventDefault();
            this.navigate(_CustomDropdownEditor.MAX_VISIBLE);
            break;
          case "PageUp":
            e.preventDefault();
            this.navigate(-_CustomDropdownEditor.MAX_VISIBLE);
            break;
          case "Home":
            e.preventDefault();
            this.setHighlight(0);
            this.scrollToIndex(0, "start");
            break;
          case "End":
            e.preventDefault();
            this.setHighlight(this.options.length - 1);
            this.scrollToIndex(this.options.length - 1, "end");
            break;
          case "Enter":
            e.preventDefault();
            this.selectIndex(this.highlightedIndex);
            break;
          case "Escape":
            e.preventDefault();
            this.callbacks.onStop(false);
            break;
          case "Tab":
            e.preventDefault();
            this.callbacks.onStop(true);
            this.callbacks.onTab?.(e.shiftKey);
            break;
        }
        e.stopPropagation();
      };
      this.handleScroll = () => {
        this.renderVisibleItems(this.scrollEl.scrollTop);
      };
      this.handleOutsideClick = (e) => {
        const target = e.target;
        if (this.panelEl.contains(target) || this.cellEl.contains(target)) return;
        this.callbacks.onStop(false);
      };
      this.handleResize = () => {
        this.positionPanel();
      };
      /**
       * Closes the dropdown immediately when any element outside the panel scrolls.
       * Catches both vertical and horizontal grid body scroll via capture-phase listener.
       * Scroll events originating inside the virtual-scroll list are excluded.
       */
      this.handleBodyScroll = (e) => {
        if (this.destroyed) return;
        const target = e.target;
        if (this.panelEl && this.panelEl.contains(target)) return;
        this.callbacks.onStop(false);
      };
      this.selectedIndex = this.options.findIndex(
        (o) => String(o.value) === String(currentValue ?? "")
      );
      this.highlightedIndex = this.selectedIndex >= 0 ? this.selectedIndex : 0;
      this.mount();
    }
    /**
     * Tear down the editor: remove the panel from the DOM and detach all event
     * listeners.  Safe to call multiple times.
     */
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.scrollEl?.removeEventListener("keydown", this.handleKeyDown);
      this.scrollEl?.removeEventListener("scroll", this.handleScroll);
      document.removeEventListener("mousedown", this.handleOutsideClick);
      window.removeEventListener("resize", this.handleResize);
      document.removeEventListener("scroll", this.handleBodyScroll, true);
      this.panelEl?.remove();
    }
    // ── Mount ──────────────────────────────────────────────────────────────────
    mount() {
      this.buildTrigger();
      this.buildPanel();
      this.positionPanel();
      document.body.appendChild(this.panelEl);
      requestAnimationFrame(() => {
        if (!this.destroyed) this.panelEl.classList.add("pg-dropdown-editor__panel--visible");
      });
      setTimeout(() => {
        if (this.destroyed) return;
        this.scrollEl.focus();
        this.scrollToIndex(this.highlightedIndex, "center");
      }, 0);
      setTimeout(() => {
        if (this.destroyed) return;
        document.addEventListener("mousedown", this.handleOutsideClick);
      }, 0);
      window.addEventListener("resize", this.handleResize, { passive: true });
      document.addEventListener("scroll", this.handleBodyScroll, { passive: true, capture: true });
    }
    // ── Trigger (inside the cell) ──────────────────────────────────────────────
    buildTrigger() {
      this.triggerEl = document.createElement("div");
      this.triggerEl.className = "pg-dropdown-editor__trigger";
      this.triggerEl.setAttribute("aria-haspopup", "listbox");
      this.triggerEl.setAttribute("aria-expanded", "true");
      this.syncTrigger(this.options[this.selectedIndex]);
      this.container.innerHTML = "";
      this.container.appendChild(this.triggerEl);
    }
    syncTrigger(opt) {
      this.triggerEl.innerHTML = "";
      const icon = this.buildIcon(opt, "pg-dropdown-editor__opt-icon");
      if (icon) this.triggerEl.appendChild(icon);
      const label = document.createElement("span");
      label.className = "pg-dropdown-editor__trigger-label";
      label.textContent = opt?.label ?? "\u2014";
      this.triggerEl.appendChild(label);
      const arrow = document.createElement("span");
      arrow.className = "pg-dropdown-editor__arrow";
      arrow.setAttribute("aria-hidden", "true");
      this.triggerEl.appendChild(arrow);
    }
    // ── Panel (appended to document.body) ─────────────────────────────────────
    buildPanel() {
      this.panelEl = document.createElement("div");
      this.panelEl.className = "pg-dropdown-editor__panel";
      const visibleCount = Math.min(Math.max(this.options.length, 1), _CustomDropdownEditor.MAX_VISIBLE);
      const panelH = visibleCount * _CustomDropdownEditor.ITEM_HEIGHT;
      this.scrollEl = document.createElement("div");
      this.scrollEl.className = "pg-dropdown-editor__scroll";
      this.scrollEl.setAttribute("role", "listbox");
      this.scrollEl.setAttribute("tabindex", "0");
      this.scrollEl.setAttribute("aria-label", "Select an option");
      this.scrollEl.style.height = `${panelH}px`;
      this.scrollEl.addEventListener("keydown", this.handleKeyDown);
      this.scrollEl.addEventListener("scroll", this.handleScroll, { passive: true });
      if (this.options.length === 0) {
        const empty = document.createElement("div");
        empty.className = "pg-dropdown-editor__empty";
        empty.textContent = "No options available";
        this.scrollEl.appendChild(empty);
      } else {
        const spacer = document.createElement("div");
        spacer.className = "pg-dropdown-editor__spacer";
        spacer.style.height = `${this.options.length * _CustomDropdownEditor.ITEM_HEIGHT}px`;
        this.itemsEl = document.createElement("div");
        this.itemsEl.className = "pg-dropdown-editor__items";
        spacer.appendChild(this.itemsEl);
        this.scrollEl.appendChild(spacer);
        this.renderVisibleItems(0);
      }
      this.panelEl.appendChild(this.scrollEl);
    }
    // ── Virtual rendering ──────────────────────────────────────────────────────
    renderVisibleItems(scrollTop) {
      if (!this.itemsEl) return;
      const H = _CustomDropdownEditor.ITEM_HEIGHT;
      const BUF = _CustomDropdownEditor.SCROLL_BUFFER;
      const VIS = _CustomDropdownEditor.MAX_VISIBLE;
      const total = this.options.length;
      const startIdx = Math.max(0, Math.floor(scrollTop / H) - BUF);
      const endIdx = Math.min(total, startIdx + VIS + BUF * 2);
      this.itemsEl.innerHTML = "";
      this.itemsEl.style.transform = `translateY(${startIdx * H}px)`;
      for (let i = startIdx; i < endIdx; i++) {
        const opt = this.options[i];
        const isSelected = i === this.selectedIndex;
        const isHighlight = i === this.highlightedIndex;
        const item = document.createElement("div");
        item.className = "pg-dropdown-editor__option";
        item.id = this.optId(i);
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(isSelected));
        item.setAttribute("data-index", String(i));
        if (isSelected) item.classList.add("pg-dropdown-editor__option--selected");
        if (isHighlight) item.classList.add("pg-dropdown-editor__option--highlighted");
        const icon = this.buildIcon(opt, "pg-dropdown-editor__opt-icon");
        if (icon) item.appendChild(icon);
        const label = document.createElement("span");
        label.className = "pg-dropdown-editor__opt-label";
        label.textContent = opt.label;
        item.appendChild(label);
        if (isSelected) {
          const check = document.createElement("span");
          check.className = "pg-dropdown-editor__opt-check";
          check.setAttribute("aria-hidden", "true");
          item.appendChild(check);
        }
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.selectIndex(i);
        });
        item.addEventListener("mouseenter", () => this.setHighlight(i));
        this.itemsEl.appendChild(item);
      }
      this.scrollEl.setAttribute("aria-activedescendant", this.optId(this.highlightedIndex));
    }
    // ── Positioning ────────────────────────────────────────────────────────────
    positionPanel() {
      const cellRect = this.cellEl.getBoundingClientRect();
      const H = _CustomDropdownEditor.ITEM_HEIGHT;
      const VIS = Math.min(Math.max(this.options.length, 1), _CustomDropdownEditor.MAX_VISIBLE);
      const panelH = VIS * H;
      const panelW = cellRect.width;
      const GAP = 4;
      let top = cellRect.bottom + GAP;
      let flipsAbove = false;
      if (window.innerHeight - cellRect.bottom < panelH + GAP && cellRect.top > panelH + GAP) {
        top = cellRect.top - panelH - GAP;
        flipsAbove = true;
      }
      const left = Math.max(GAP, Math.min(cellRect.left, window.innerWidth - panelW - GAP));
      this.panelEl.style.top = `${Math.max(GAP, top)}px`;
      this.panelEl.style.left = `${left}px`;
      this.panelEl.style.width = `${panelW}px`;
      this.panelEl.classList.toggle("pg-dropdown-editor__panel--above", flipsAbove);
    }
    // ── Navigation helpers ─────────────────────────────────────────────────────
    navigate(delta) {
      const newIdx = Math.max(0, Math.min(this.options.length - 1, this.highlightedIndex + delta));
      this.setHighlight(newIdx);
      this.scrollToIndex(newIdx, delta > 0 ? "end" : "start");
    }
    setHighlight(index) {
      if (this.highlightedIndex === index) return;
      const prevEl = this.itemsEl?.querySelector(
        `[data-index="${this.highlightedIndex}"]`
      );
      prevEl?.classList.remove("pg-dropdown-editor__option--highlighted");
      this.highlightedIndex = index;
      const nextEl = this.itemsEl?.querySelector(
        `[data-index="${index}"]`
      );
      nextEl?.classList.add("pg-dropdown-editor__option--highlighted");
      this.scrollEl?.setAttribute("aria-activedescendant", this.optId(index));
    }
    scrollToIndex(index, align) {
      const H = _CustomDropdownEditor.ITEM_HEIGHT;
      const itemTop = index * H;
      const itemBot = itemTop + H;
      const curTop = this.scrollEl.scrollTop;
      const height = this.scrollEl.clientHeight;
      if (align === "center") {
        this.scrollEl.scrollTop = Math.max(0, itemTop - height / 2 + H / 2);
      } else if (itemTop < curTop) {
        this.scrollEl.scrollTop = itemTop;
      } else if (itemBot > curTop + height) {
        this.scrollEl.scrollTop = itemBot - height;
      }
    }
    selectIndex(index) {
      if (index < 0 || index >= this.options.length) return;
      this.callbacks.onSelect(this.options[index]);
      this.callbacks.onStop(true);
    }
    // ── Utility ────────────────────────────────────────────────────────────────
    buildIcon(opt, cls) {
      if (!opt?.image && !opt?.icon) return null;
      const wrapper = document.createElement("span");
      wrapper.className = cls;
      if (opt.image) {
        const img = document.createElement("img");
        img.src = opt.image;
        img.alt = "";
        img.width = 20;
        img.height = 20;
        wrapper.appendChild(img);
      } else if (opt.icon) {
        wrapper.innerHTML = opt.icon;
      }
      return wrapper;
    }
    optId(index) {
      return `pg-dd-${this.instanceId}-${index}`;
    }
  };
  /** Height of each option row in pixels. Keep in sync with CSS. */
  _CustomDropdownEditor.ITEM_HEIGHT = 34;
  /** Maximum number of rows shown before the list scrolls. */
  _CustomDropdownEditor.MAX_VISIBLE = 8;
  /** Extra rows rendered above/below the visible window for smooth scrolling. */
  _CustomDropdownEditor.SCROLL_BUFFER = 3;
  _CustomDropdownEditor.instanceCounter = 0;
  var CustomDropdownEditor = _CustomDropdownEditor;

  // src/event-bus/event-bus.ts
  var EventBus = class {
    constructor() {
      this.subscriptions = /* @__PURE__ */ new Map();
      this.nextId = 1;
      this.paused = false;
      this.pendingQueue = [];
    }
    on(type, handler, priority = 0) {
      const sub = {
        id: this.nextId++,
        type,
        handler,
        once: false,
        priority
      };
      this.addSubscription(sub);
      return () => this.removeSubscription(type, sub.id);
    }
    once(type, handler) {
      const sub = {
        id: this.nextId++,
        type,
        handler,
        once: true,
        priority: 0
      };
      this.addSubscription(sub);
      return () => this.removeSubscription(type, sub.id);
    }
    off(type, handler) {
      const subs = this.subscriptions.get(type);
      if (!subs) return;
      const index = subs.findIndex((s) => s.handler === handler);
      if (index !== -1) subs.splice(index, 1);
    }
    emit(type, payload) {
      if (this.paused) {
        this.pendingQueue.push({ type, payload });
        return;
      }
      this.dispatch(type, payload);
    }
    emitAsync(type, payload) {
      return Promise.resolve().then(() => this.emit(type, payload));
    }
    pause() {
      this.paused = true;
    }
    resume() {
      this.paused = false;
      const queue = this.pendingQueue.splice(0);
      for (const { type, payload } of queue) {
        this.dispatch(type, payload);
      }
    }
    clear(type) {
      if (type) {
        this.subscriptions.delete(type);
      } else {
        this.subscriptions.clear();
      }
    }
    hasListeners(type) {
      const subs = this.subscriptions.get(type);
      return !!subs && subs.length > 0;
    }
    addSubscription(sub) {
      let subs = this.subscriptions.get(sub.type);
      if (!subs) {
        subs = [];
        this.subscriptions.set(sub.type, subs);
      }
      subs.push(sub);
      subs.sort((a, b) => b.priority - a.priority);
    }
    removeSubscription(type, id) {
      const subs = this.subscriptions.get(type);
      if (!subs) return;
      const index = subs.findIndex((s) => s.id === id);
      if (index !== -1) subs.splice(index, 1);
    }
    dispatch(type, payload) {
      const subs = this.subscriptions.get(type);
      if (!subs || subs.length === 0) return;
      const toRemove = [];
      for (const sub of [...subs]) {
        try {
          sub.handler(payload);
        } catch (err) {
          console.error(`[PhotonGrid] EventBus handler error for "${type}":`, err);
        }
        if (sub.once) toRemove.push(sub.id);
      }
      for (const id of toRemove) this.removeSubscription(type, id);
    }
  };

  // src/core/grid-store.ts
  var GridStore = class {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.subscribers = /* @__PURE__ */ new Map();
      this.state = this.createInitialState();
    }
    get(key) {
      return this.state[key];
    }
    set(key, value) {
      const prev = this.state[key];
      if (prev === value) return;
      this.state[key] = value;
      this.notifySubscribers(key, value, prev);
    }
    update(key, updater) {
      this.set(key, updater(this.state[key]));
    }
    batch(updates) {
      this.eventBus.pause();
      for (const [key, value] of Object.entries(updates)) {
        this.set(key, value);
      }
      this.eventBus.resume();
    }
    watch(key, subscriber) {
      let set = this.subscribers.get(key);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        this.subscribers.set(key, set);
      }
      set.add(subscriber);
      return () => {
        const s = this.subscribers.get(key);
        s?.delete(subscriber);
      };
    }
    snapshot() {
      return Object.freeze({ ...this.state });
    }
    notifySubscribers(key, value, prev) {
      const set = this.subscribers.get(key);
      if (!set) return;
      for (const subscriber of set) {
        try {
          subscriber(value, prev);
        } catch (err) {
          console.error(`[PhotonGrid] GridStore subscriber error for "${String(key)}":`, err);
        }
      }
    }
    createInitialState() {
      return {
        allRows: [],
        visibleRows: [],
        renderedRows: [],
        totalRowCount: 0,
        columns: [],
        columnStates: /* @__PURE__ */ new Map(),
        pinnedLeftColumns: [],
        pinnedRightColumns: [],
        centerColumns: [],
        sortConfig: [],
        filterModel: {},
        quickFilterConfig: null,
        filterActive: false,
        pagination: {
          enabled: false,
          page: 1,
          pageSize: 50,
          pageSizeOptions: [10, 25, 50, 100, 200],
          serverSide: false,
          totalRows: 0
        },
        groupedColumnIds: [],
        expandedGroupKeys: /* @__PURE__ */ new Set(),
        expandedRowIds: /* @__PURE__ */ new Set(),
        selectedRowIds: /* @__PURE__ */ new Set(),
        activeRowId: null,
        isAllSelected: false,
        isIndeterminate: false,
        cellRanges: [],
        activeCell: null,
        loading: false,
        error: null,
        scrollTop: 0,
        scrollLeft: 0,
        viewportHeight: 0,
        viewportWidth: 0,
        firstRenderedRowIndex: 0,
        lastRenderedRowIndex: 0,
        fullScreen: false,
        editingCellId: null
      };
    }
    destroy() {
      this.subscribers.clear();
    }
  };

  // src/types/event.types.ts
  var GridEventType = {
    READY: "grid:ready",
    DESTROYED: "grid:destroyed",
    DATA_CHANGED: "grid:dataChanged",
    ROWS_RENDERED: "grid:rowsRendered",
    SCROLL: "grid:scroll",
    ROW_CLICKED: "row:clicked",
    ROW_DOUBLE_CLICKED: "row:doubleClicked",
    ROW_SELECTED: "row:selected",
    ROW_DESELECTED: "row:deselected",
    ALL_ROWS_SELECTED: "row:allSelected",
    ALL_ROWS_DESELECTED: "row:allDeselected",
    ROW_EXPANDED: "row:expanded",
    ROW_COLLAPSED: "row:collapsed",
    ROW_GROUP_OPENED: "row:groupOpened",
    ROW_DROP: "row:drop",
    ROW_EDIT_START: "row:editStart",
    ROW_EDIT_STOP: "row:editStop",
    CELL_CLICKED: "cell:clicked",
    CELL_DOUBLE_CLICKED: "cell:doubleClicked",
    CELL_VALUE_CHANGED: "cell:valueChanged",
    CELL_EDIT_START: "cell:editStart",
    CELL_EDIT_STOP: "cell:editStop",
    CELL_SELECTION_CHANGED: "cell:selectionChanged",
    COLUMN_RESIZED: "column:resized",
    COLUMN_MOVED: "column:moved",
    COLUMN_PINNED: "column:pinned",
    COLUMN_VISIBLE: "column:visible",
    COLUMN_SORTED: "column:sorted",
    COLUMN_FILTER_CHANGED: "column:filterChanged",
    COLUMNS_STATE_CHANGED: "column:stateChanged",
    COLUMN_AUTOSIZE: "column:autoSize",
    COLUMN_GROUP_CHANGED: "column:groupChanged",
    SORT_CHANGED: "sort:changed",
    FILTER_CHANGED: "filter:changed",
    QUICK_FILTER_CHANGED: "filter:quickChanged",
    PAGE_CHANGED: "pagination:pageChanged",
    PAGE_SIZE_CHANGED: "pagination:pageSizeChanged",
    GROUP_EXPANDED: "group:expanded",
    GROUP_COLLAPSED: "group:collapsed",
    THEME_CHANGED: "theme:changed",
    EXPORT_START: "export:start",
    EXPORT_COMPLETE: "export:complete",
    EXPORT_ERROR: "export:error",
    DRAG_STARTED: "drag:started",
    DRAG_OVER: "drag:over",
    DRAG_STOPPED: "drag:stopped",
    CHART_CREATED: "chart:created",
    CHART_DESTROYED: "chart:destroyed",
    CHART_RANGE_SELECTION_CHANGED: "chart:rangeSelectionChanged",
    LOADING_STARTED: "loading:started",
    LOADING_STOPPED: "loading:stopped",
    CELL_CONTEXT_MENU: "cell:contextMenu",
    COLUMN_GROUP_HEADER_COLLAPSED: "columnGroup:collapsed",
    COLUMN_GROUP_HEADER_EXPANDED: "columnGroup:expanded",
    COLUMN_GROUP_HEADER_CREATED: "columnGroup:created",
    COLUMN_GROUP_HEADER_REMOVED: "columnGroup:removed"
  };

  // src/core/column-model.ts
  var ColumnModel = class {
    constructor(store, eventBus) {
      this.store = store;
      this.eventBus = eventBus;
      this.columns = [];
    }
    initColumns(defs) {
      this.columns = defs.map((col, i) => this.normalizeColumn(col, i));
      this.rebuildPinnedSections();
      this.store.set("columns", this.columns);
      this.emitStatesChanged();
    }
    getColumn(colId) {
      return this.columns.find((c) => c.colId === colId);
    }
    getAllColumns() {
      return this.columns;
    }
    getVisibleColumns() {
      return this.columns.filter((c) => c.visible !== false);
    }
    setColumnWidth(colId, width, finished = false) {
      const col = this.getColumn(colId);
      if (!col) return;
      const min = col.minWidth ?? 40;
      const max = col.maxWidth ?? Infinity;
      col.width = Math.min(max, Math.max(min, width));
      this.store.set("columns", [...this.columns]);
      this.eventBus.emit(GridEventType.COLUMN_RESIZED, { colDef: col, newWidth: col.width, finished });
      if (finished) this.emitStatesChanged();
    }
    setColumnVisible(colId, visible) {
      const col = this.getColumn(colId);
      if (!col || col.alwaysVisible) return;
      col.visible = visible;
      this.rebuildPinnedSections();
      this.store.set("columns", [...this.columns]);
      this.eventBus.emit(GridEventType.COLUMN_VISIBLE, { colDef: col, visible });
      this.emitStatesChanged();
    }
    setColumnPin(colId, pinned) {
      const col = this.getColumn(colId);
      if (!col) return;
      col.pinned = pinned;
      this.rebuildPinnedSections();
      this.store.set("columns", [...this.columns]);
      this.eventBus.emit(GridEventType.COLUMN_PINNED, { colDef: col, pinned });
      this.emitStatesChanged();
    }
    moveColumn(fromIndex, toIndex) {
      const visibleCols = this.getVisibleColumns();
      if (fromIndex < 0 || fromIndex >= visibleCols.length || toIndex < 0 || toIndex >= visibleCols.length)
        return;
      const moving = visibleCols[fromIndex];
      visibleCols.splice(fromIndex, 1);
      visibleCols.splice(toIndex, 0, moving);
      this.columns = this.syncColumnOrder(visibleCols);
      this.rebuildPinnedSections();
      this.store.set("columns", [...this.columns]);
      this.eventBus.emit(GridEventType.COLUMN_MOVED, { colDef: moving, fromIndex, toIndex });
      this.emitStatesChanged();
    }
    /** Move a column to a different panel (changing its pinned state) and insert it at a specific position. */
    moveAndPin(colId, newPin, insertBeforeColId) {
      const col = this.getColumn(colId);
      if (!col) return;
      col.pinned = newPin;
      const visibleCols = this.getVisibleColumns();
      const fromIdx = visibleCols.findIndex((c) => c.colId === colId);
      if (fromIdx === -1) {
        this.rebuildPinnedSections();
        this.store.set("columns", [...this.columns]);
        return;
      }
      let toIdx;
      if (insertBeforeColId) {
        toIdx = visibleCols.findIndex((c) => c.colId === insertBeforeColId);
        if (toIdx === -1) toIdx = visibleCols.length;
      } else {
        const lastInPanel = [...visibleCols].reverse().find(
          (c) => (c.pinned ?? null) === (newPin ?? null) && c.colId !== colId
        );
        toIdx = lastInPanel ? visibleCols.findIndex((c) => c.colId === lastInPanel.colId) + 1 : visibleCols.length;
      }
      visibleCols.splice(fromIdx, 1);
      const adjustedTo = Math.min(fromIdx < toIdx ? toIdx - 1 : toIdx, visibleCols.length);
      visibleCols.splice(adjustedTo, 0, col);
      this.columns = this.syncColumnOrder(visibleCols);
      this.rebuildPinnedSections();
      this.store.set("columns", [...this.columns]);
      this.eventBus.emit(GridEventType.COLUMN_MOVED, { colDef: col, fromIndex: fromIdx, toIndex: adjustedTo });
      this.eventBus.emit(GridEventType.COLUMN_PINNED, { colDef: col, pinned: newPin });
      this.emitStatesChanged();
    }
    setColumnSort(colId, order) {
      for (const col2 of this.columns) {
        col2.sortOrder = col2.colId === colId ? order : null;
      }
      this.store.set("columns", [...this.columns]);
      const col = this.getColumn(colId);
      if (col) {
        this.eventBus.emit(GridEventType.COLUMN_SORTED, { colId, field: col.field, order });
      }
    }
    autoSizeColumn(colId, containerEl) {
      const col = this.getColumn(colId);
      if (!col) return;
      const measurer = containerEl.ownerDocument.createElement("span");
      measurer.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-size:inherit;padding:0 12px;pointer-events:none;";
      containerEl.appendChild(measurer);
      measurer.textContent = col.header;
      let maxWidth = measurer.offsetWidth + 24;
      const cells = containerEl.querySelectorAll(`[data-col-id="${colId}"]`);
      for (const cell of Array.from(cells)) {
        measurer.textContent = cell.textContent ?? "";
        maxWidth = Math.max(maxWidth, measurer.offsetWidth + 24);
      }
      containerEl.removeChild(measurer);
      this.setColumnWidth(colId, maxWidth, true);
      this.eventBus.emit(GridEventType.COLUMN_AUTOSIZE, { colId, newWidth: maxWidth });
    }
    applyColumnStates(states) {
      const stateMap = new Map(states.map((s) => [s.colId, s]));
      for (const col of this.columns) {
        const state = stateMap.get(col.colId);
        if (!state) continue;
        col.width = state.width;
        col.visible = state.visible;
        col.pinned = state.pinned;
        col.sortOrder = state.sortOrder;
      }
      this.columns.sort((a, b) => {
        const ai = stateMap.get(a.colId)?.index ?? 9999;
        const bi = stateMap.get(b.colId)?.index ?? 9999;
        return ai - bi;
      });
      this.rebuildPinnedSections();
      this.store.set("columns", [...this.columns]);
      this.emitStatesChanged();
    }
    getColumnStates() {
      return this.columns.map((col, index) => ({
        colId: col.colId,
        width: col.width ?? 150,
        visible: col.visible !== false,
        pinned: col.pinned ?? null,
        sortOrder: col.sortOrder ?? null,
        index
      }));
    }
    rebuildPinnedSections() {
      const visible = this.columns.filter((c) => c.visible !== false);
      this.store.set(
        "pinnedLeftColumns",
        visible.filter((c) => c.pinned === "left")
      );
      this.store.set(
        "pinnedRightColumns",
        visible.filter((c) => c.pinned === "right")
      );
      this.store.set(
        "centerColumns",
        visible.filter((c) => !c.pinned)
      );
    }
    syncColumnOrder(orderedVisible) {
      const hiddenCols = this.columns.filter((c) => c.visible === false);
      return [...orderedVisible, ...hiddenCols];
    }
    normalizeColumn(col, index) {
      return {
        width: 150,
        minWidth: 40,
        visible: true,
        sortable: true,
        filterable: true,
        resizable: true,
        draggable: true,
        editable: false,
        groupable: false,
        sortOrder: null,
        filterActive: false,
        ...col,
        colId: col.colId ?? `col_${col.field}_${index}`
      };
    }
    emitStatesChanged() {
      this.eventBus.emit(GridEventType.COLUMNS_STATE_CHANGED, {
        states: this.getColumnStates()
      });
    }
  };

  // src/core/row-model.ts
  var nodeIdCounter = 0;
  function generateNodeId() {
    return `rn_${++nodeIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
  }
  var RowModel = class {
    constructor(store, eventBus) {
      this.store = store;
      this.eventBus = eventBus;
      this.rawData = [];
      this.idField = "__photon_id__";
      this.defaultRowHeight = 50;
    }
    setRowData(data, rowHeight = 50) {
      this.rawData = data;
      this.defaultRowHeight = rowHeight;
      const nodes = this.buildRowNodes(data);
      this.layoutNodes(nodes);
      this.store.set("allRows", nodes);
      this.store.set("totalRowCount", nodes.length);
      this.eventBus.emit(GridEventType.DATA_CHANGED, {
        oldCount: this.store.get("totalRowCount"),
        newCount: nodes.length
      });
    }
    appendRowData(data) {
      const existingNodes = this.store.get("allRows");
      const newNodes = this.buildRowNodes(data, existingNodes.length);
      const offset = existingNodes.length > 0 ? existingNodes[existingNodes.length - 1].top + existingNodes[existingNodes.length - 1].height : 0;
      this.layoutNodes(newNodes, offset);
      const combined = [...existingNodes, ...newNodes];
      this.rawData = [...this.rawData, ...data];
      this.store.set("allRows", combined);
      this.store.set("totalRowCount", combined.length);
    }
    updateRow(nodeId, newData) {
      const rows = this.store.get("allRows");
      const node = rows.find((r) => r.nodeId === nodeId);
      if (!node) return;
      node.data = { ...node.data, ...newData };
      this.store.set("allRows", [...rows]);
    }
    removeRows(nodeIds) {
      const idSet = new Set(nodeIds);
      const remaining = this.store.get("allRows").filter((r) => !idSet.has(r.nodeId));
      this.layoutNodes(remaining);
      this.store.set("allRows", remaining);
      this.store.set("totalRowCount", remaining.length);
    }
    getRowNode(nodeId) {
      return this.store.get("allRows").find((r) => r.nodeId === nodeId);
    }
    getRowByIndex(index) {
      return this.store.get("allRows")[index];
    }
    setVisibleRows(nodes) {
      this.layoutNodes(nodes);
      this.store.set("visibleRows", nodes);
    }
    setRenderedRows(nodes) {
      this.store.set("renderedRows", nodes);
    }
    setRowHeight(nodeId, height) {
      const rows = this.store.get("visibleRows");
      const nodeIndex = rows.findIndex((r) => r.nodeId === nodeId);
      if (nodeIndex === -1) return;
      rows[nodeIndex].height = height;
      for (let i = nodeIndex + 1; i < rows.length; i++) {
        rows[i].top = rows[i - 1].top + rows[i - 1].height;
      }
      this.store.set("visibleRows", [...rows]);
    }
    buildGroupHeaderNode(groupKey, groupField, groupValue, children, level) {
      return {
        nodeId: generateNodeId(),
        rowIndex: -1,
        data: { [groupField]: groupValue },
        type: "group",
        selected: false,
        expanded: this.store.get("expandedGroupKeys").has(groupKey),
        editable: false,
        level,
        parent: null,
        children,
        groupKey,
        groupField,
        groupValue,
        childCount: children.length,
        height: this.defaultRowHeight,
        top: 0
      };
    }
    createDetailNode(parentRow, detail) {
      return {
        nodeId: generateNodeId(),
        rowIndex: -1,
        data: detail,
        type: "detail",
        selected: false,
        expanded: false,
        editable: false,
        level: parentRow.level + 1,
        parent: parentRow,
        children: [],
        height: 200,
        top: 0,
        detail
      };
    }
    getRawData() {
      return this.rawData;
    }
    buildRowNodes(data, startIndex = 0) {
      return data.map((row, i) => ({
        nodeId: row[this.idField] ?? generateNodeId(),
        rowIndex: startIndex + i,
        data: { ...row },
        type: "data",
        selected: this.store.get("selectedRowIds").has(row[this.idField] ?? ""),
        expanded: false,
        editable: false,
        level: 0,
        parent: null,
        children: [],
        height: this.defaultRowHeight,
        top: 0
      }));
    }
    layoutNodes(nodes, startOffset = 0) {
      let top = startOffset;
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].rowIndex = i;
        nodes[i].top = top;
        top += nodes[i].height;
      }
    }
  };

  // src/engines/sort/sort-comparator.ts
  var COLLATOR = new Intl.Collator(void 0, { numeric: true, sensitivity: "base" });
  function toNumber(value) {
    if (value == null || value === "") return NaN;
    const n = Number(value);
    return isNaN(n) ? NaN : n;
  }
  function toDate(value) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? NaN : d.getTime();
    }
    return NaN;
  }
  var stringComparator = (a, b) => {
    const sa = a == null ? "" : String(a);
    const sb = b == null ? "" : String(b);
    if (sa === sb) return 0;
    if (sa === "") return 1;
    if (sb === "") return -1;
    return COLLATOR.compare(sa, sb);
  };
  var numberComparator = (a, b) => {
    const na = toNumber(a);
    const nb = toNumber(b);
    if (isNaN(na) && isNaN(nb)) return 0;
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
  };
  var dateComparator = (a, b) => {
    const da = toDate(a);
    const db = toDate(b);
    if (isNaN(da) && isNaN(db)) return 0;
    if (isNaN(da)) return 1;
    if (isNaN(db)) return -1;
    return da - db;
  };
  var booleanComparator = (a, b) => (a ? 1 : 0) - (b ? 1 : 0);
  function getComparator(type) {
    switch (type) {
      case "number":
      case "currency":
      case "percentage":
        return numberComparator;
      case "date":
      case "time":
        return dateComparator;
      case "boolean":
        return booleanComparator;
      default:
        return stringComparator;
    }
  }

  // src/engines/sort/sort-engine.ts
  function resolveNestedValue(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current == null) return void 0;
      current = current[part];
    }
    return current;
  }
  var SortEngine = class {
    constructor(store, eventBus) {
      this.store = store;
      this.eventBus = eventBus;
      this.sortConfig = [];
    }
    /**
     * Sets a single-column sort and emits `SORT_CHANGED`.
     *
     * @param colId - Column identifier
     * @param field - Data field path (dot-notation supported)
     * @param order - `'asc'` or `'desc'`
     */
    sort(colId, field, order) {
      this.sortConfig = [{ colId, field, order }];
      this.store.set("sortConfig", [...this.sortConfig]);
      this.eventBus.emit(GridEventType.SORT_CHANGED, { colId, field, order });
    }
    /**
     * Replaces the entire sort configuration with a multi-column spec and emits
     * `SORT_CHANGED` using the last entry as the "active" column.
     *
     * @param configs - Ordered sort descriptors (primary → secondary → …)
     */
    multiSort(configs) {
      this.sortConfig = [...configs];
      this.store.set("sortConfig", [...this.sortConfig]);
      const last = configs[configs.length - 1];
      if (last) {
        this.eventBus.emit(GridEventType.SORT_CHANGED, {
          colId: last.colId,
          field: last.field,
          order: last.order
        });
      }
    }
    /** Removes all active sort columns. */
    clearSort() {
      this.sortConfig = [];
      this.store.set("sortConfig", []);
      this.eventBus.emit(GridEventType.SORT_CHANGED, { colId: "", field: "", order: null });
    }
    /**
     * Removes the sort configuration for a single column without affecting others.
     *
     * @param colId - Column to remove from the sort config
     */
    clearColumnSort(colId) {
      this.sortConfig = this.sortConfig.filter((s) => s.colId !== colId);
      this.store.set("sortConfig", [...this.sortConfig]);
    }
    /**
     * Sorts `rows` according to the current sort configuration and returns a new
     * sorted array.  Returns the original array reference when no sort is active.
     *
     * ### Performance strategy (Schwartzian transform + index sort)
     * For large datasets the naive approach of resolving nested field paths inside
     * the comparator function is O(n log n × pathDepth × keyCount).  Instead:
     *
     * 1. **Extract** all sort-key values for every row in a single O(n) pass into
     *    a flat 2-D array `vals[rowIdx][keyIdx]`.  No objects are created here —
     *    just raw value reads.
     * 2. **Sort** a compact `Int32Array` of row indices.  The comparator reads
     *    pre-extracted values by index — zero allocation, zero property resolution.
     * 3. **Reconstruct** the final array by mapping sorted indices back to rows.
     *
     * This reduces per-comparison cost from O(pathDepth × keyCount) to O(keyCount)
     * pure comparisons, giving roughly 20–50× speedup on 1M rows for typical
     * single-column sorts.
     *
     * @param rows    - Input rows (filtered, not yet paged)
     * @param columns - All visible column definitions (used to resolve comparators)
     * @returns New sorted array; original is not mutated.
     */
    applySorting(rows, columns) {
      if (this.sortConfig.length === 0) return rows;
      const colMap = new Map(columns.map((c) => [c.colId, c]));
      const keys = this.sortConfig.map(({ colId, field, order }) => {
        const col = colMap.get(colId);
        return {
          field,
          nested: field.includes("."),
          compareFn: getComparator(col?.type ?? "string"),
          direction: order === "asc" ? 1 : -1
        };
      });
      const dataRows = [];
      const otherRows = [];
      for (const row of rows) {
        if (row.type === "data") dataRows.push(row);
        else otherRows.push(row);
      }
      const n = dataRows.length;
      if (n === 0) return rows;
      const keyCount = keys.length;
      const vals = new Array(n);
      for (let i = 0; i < n; i++) {
        const data = dataRows[i].data;
        const v = new Array(keyCount);
        for (let k = 0; k < keyCount; k++) {
          const key = keys[k];
          v[k] = key.nested ? resolveNestedValue(data, key.field) : data[key.field];
        }
        vals[i] = v;
      }
      const indices = new Int32Array(n);
      for (let i = 0; i < n; i++) indices[i] = i;
      if (keyCount === 1) {
        const { compareFn, direction } = keys[0];
        indices.sort((ai, bi) => compareFn(vals[ai][0], vals[bi][0]) * direction);
      } else {
        indices.sort((ai, bi) => {
          const av = vals[ai];
          const bv = vals[bi];
          for (let k = 0; k < keyCount; k++) {
            const r = keys[k].compareFn(av[k], bv[k]) * keys[k].direction;
            if (r !== 0) return r;
          }
          return 0;
        });
      }
      const sortedData = new Array(n);
      for (let i = 0; i < n; i++) sortedData[i] = dataRows[indices[i]];
      return otherRows.length === 0 ? sortedData : sortedData.concat(otherRows);
    }
    /** Returns a copy of the current sort configuration. */
    getSortConfig() {
      return [...this.sortConfig];
    }
    /**
     * Returns the current sort direction for a column, or `null` if unsorted.
     *
     * @param colId - Column identifier to query
     */
    isSorted(colId) {
      return this.sortConfig.find((s) => s.colId === colId)?.order ?? null;
    }
  };

  // src/engines/filter/filter-condition.ts
  function normalizeString(value) {
    if (value === null || value === void 0) return "";
    return String(value).toLowerCase().trim();
  }
  function toNumber2(value) {
    return Number(value);
  }
  function toDate2(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  function isBlank(value) {
    return value === null || value === void 0 || String(value).trim() === "";
  }
  function evaluateStringCondition(condition, cellValue) {
    const cell = normalizeString(cellValue);
    const cond = normalizeString(condition.value);
    switch (condition.operator) {
      case "contains":
        return cell.includes(cond);
      case "notContains":
        return !cell.includes(cond);
      case "equals":
        return cell === cond;
      case "notEquals":
        return cell !== cond;
      case "startsWith":
        return cell.startsWith(cond);
      case "endsWith":
        return cell.endsWith(cond);
      case "blank":
        return isBlank(cellValue);
      case "notBlank":
        return !isBlank(cellValue);
      default:
        return true;
    }
  }
  function evaluateNumberCondition(condition, cellValue) {
    const cell = toNumber2(cellValue);
    const cond = toNumber2(condition.value);
    if (isNaN(cell)) {
      return condition.operator === "blank";
    }
    switch (condition.operator) {
      case "equals":
        return cell === cond;
      case "notEquals":
        return cell !== cond;
      case "lessThan":
        return cell < cond;
      case "lessThanOrEqual":
        return cell <= cond;
      case "greaterThan":
        return cell > cond;
      case "greaterThanOrEqual":
        return cell >= cond;
      case "inRange": {
        const to = toNumber2(condition.valueTo);
        return cell >= cond && cell <= to;
      }
      case "blank":
        return isBlank(cellValue);
      case "notBlank":
        return !isBlank(cellValue);
      default:
        return true;
    }
  }
  function evaluateDateCondition(condition, cellValue) {
    const cellDate = toDate2(cellValue);
    const condDate = toDate2(condition.value);
    if (!cellDate) return condition.operator === "blank";
    if (!condDate && condition.operator !== "blank" && condition.operator !== "notBlank")
      return true;
    switch (condition.operator) {
      case "equals":
        return cellDate.toDateString() === condDate.toDateString();
      case "notEquals":
        return cellDate.toDateString() !== condDate.toDateString();
      case "before":
      case "lessThan":
        return cellDate < condDate;
      case "after":
      case "greaterThan":
        return cellDate > condDate;
      case "inRange": {
        const toDate22 = toDate2(condition.valueTo);
        return !!toDate22 && cellDate >= condDate && cellDate <= toDate22;
      }
      case "blank":
        return isBlank(cellValue);
      case "notBlank":
        return !isBlank(cellValue);
      default:
        return true;
    }
  }
  function evaluateSetCondition(operator, selectedIds, cellValue) {
    const idSet = new Set(selectedIds.map(String));
    const cellStr = String(cellValue);
    if (Array.isArray(cellValue)) {
      const hasMatch = cellValue.some((v) => idSet.has(String(v)));
      return operator === "in" ? hasMatch : !hasMatch;
    }
    return operator === "in" ? idSet.has(cellStr) : !idSet.has(cellStr);
  }
  function evaluateBooleanCondition(condition, cellValue) {
    switch (condition.operator) {
      case "equals":
        return !!cellValue === !!condition.value;
      case "notEquals":
        return !!cellValue !== !!condition.value;
      case "blank":
        return isBlank(cellValue);
      case "notBlank":
        return !isBlank(cellValue);
      default:
        return true;
    }
  }

  // src/engines/filter/filter-engine.ts
  function resolveValue(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current == null) return void 0;
      current = current[part];
    }
    return current;
  }
  var FilterEngine = class {
    constructor(store, eventBus) {
      this.store = store;
      this.eventBus = eventBus;
      this.filterModel = {};
      this.quickFilter = null;
    }
    setFilterModel(model) {
      this.filterModel = { ...model };
      this.store.set("filterModel", this.filterModel);
      this.store.set("filterActive", Object.keys(model).length > 0);
      this.eventBus.emit(GridEventType.FILTER_CHANGED, { model: this.filterModel });
    }
    setColumnFilter(colId, filter) {
      if (filter === null) {
        delete this.filterModel[colId];
      } else {
        this.filterModel[colId] = filter;
      }
      this.store.set("filterModel", { ...this.filterModel });
      this.store.set("filterActive", Object.keys(this.filterModel).length > 0);
      this.eventBus.emit(GridEventType.COLUMN_FILTER_CHANGED, { model: this.filterModel });
      this.eventBus.emit(GridEventType.FILTER_CHANGED, { model: this.filterModel });
    }
    clearColumnFilter(colId) {
      this.setColumnFilter(colId, null);
    }
    clearAllFilters() {
      this.filterModel = {};
      this.quickFilter = null;
      this.store.set("filterModel", {});
      this.store.set("quickFilterConfig", null);
      this.store.set("filterActive", false);
      this.eventBus.emit(GridEventType.FILTER_CHANGED, { model: {} });
      this.eventBus.emit(GridEventType.QUICK_FILTER_CHANGED, { config: { term: "" } });
    }
    setQuickFilter(config) {
      this.quickFilter = config;
      this.store.set("quickFilterConfig", config);
      this.eventBus.emit(GridEventType.QUICK_FILTER_CHANGED, { config });
    }
    applyFilters(rows, columns) {
      const colMap = new Map(columns.map((c) => [c.colId, c]));
      const filterEntries = Object.entries(this.filterModel);
      const hasFilters = filterEntries.length > 0;
      const hasQuick = !!this.quickFilter?.term;
      if (!hasFilters && !hasQuick) return rows;
      return rows.filter((row) => {
        if (row.type !== "data") return true;
        if (hasFilters && !this.passesColumnFilters(row, filterEntries, colMap)) return false;
        if (hasQuick && !this.passesQuickFilter(row, columns)) return false;
        return true;
      });
    }
    getFilterModel() {
      return { ...this.filterModel };
    }
    isColumnFiltered(colId) {
      return colId in this.filterModel;
    }
    passesColumnFilters(row, filterEntries, colMap) {
      for (const [colId, filter] of filterEntries) {
        const col = colMap.get(colId);
        if (!col) continue;
        const cellValue = resolveValue(row.data, filter.field);
        if (filter.selectedIds && filter.selectedIds.length > 0) {
          if (!evaluateSetCondition("in", filter.selectedIds, cellValue)) return false;
          continue;
        }
        if (!filter.conditions || filter.conditions.length === 0) continue;
        const [c1, c2] = filter.conditions;
        const pass1 = this.evaluateCondition(filter.type, c1, cellValue, col);
        if (!c2 || filter.logic === "and") {
          if (!pass1) return false;
          if (c2) {
            const pass2 = this.evaluateCondition(filter.type, c2, cellValue, col);
            if (!pass2) return false;
          }
        } else {
          const pass2 = this.evaluateCondition(filter.type, c2, cellValue, col);
          if (!pass1 && !pass2) return false;
        }
      }
      return true;
    }
    evaluateCondition(type, condition, cellValue, col) {
      switch (type) {
        case "number":
        case "currency":
          return evaluateNumberCondition(condition, cellValue);
        case "date":
        case "time":
          return evaluateDateCondition(condition, cellValue);
        case "boolean":
          return evaluateBooleanCondition(condition, cellValue);
        default:
          return evaluateStringCondition(condition, cellValue);
      }
    }
    passesQuickFilter(row, columns) {
      if (!this.quickFilter) return true;
      const { term, caseSensitive, fields } = this.quickFilter;
      const searchTerm = caseSensitive ? term : term.toLowerCase();
      const searchFields = fields ?? columns.map((c) => c.field);
      for (const field of searchFields) {
        const val = resolveValue(row.data, field);
        const str = caseSensitive ? String(val ?? "") : String(val ?? "").toLowerCase();
        if (str.includes(searchTerm)) return true;
      }
      return false;
    }
  };

  // src/engines/pagination/pagination-engine.ts
  var PaginationEngine = class {
    constructor(store, eventBus) {
      this.store = store;
      this.eventBus = eventBus;
    }
    configure(config) {
      const current = this.store.get("pagination");
      this.store.set("pagination", { ...current, ...config });
    }
    enable() {
      this.configure({ enabled: true });
    }
    disable() {
      this.configure({ enabled: false });
    }
    goToPage(page) {
      const config = this.store.get("pagination");
      const totalPages = this.getTotalPages();
      const clampedPage = Math.max(1, Math.min(page, totalPages));
      if (clampedPage === config.page) return;
      this.configure({ page: clampedPage });
      this.emitPageChange();
    }
    goToFirstPage() {
      this.goToPage(1);
    }
    goToLastPage() {
      this.goToPage(this.getTotalPages());
    }
    goToNextPage() {
      const config = this.store.get("pagination");
      this.goToPage(config.page + 1);
    }
    goToPreviousPage() {
      const config = this.store.get("pagination");
      this.goToPage(config.page - 1);
    }
    setPageSize(size) {
      const config = this.store.get("pagination");
      this.configure({ pageSize: size, page: 1 });
      this.eventBus.emit(GridEventType.PAGE_SIZE_CHANGED, {
        page: 1,
        pageSize: size,
        totalRows: config.totalRows ?? 0,
        totalPages: this.getTotalPages()
      });
    }
    setTotalRows(count) {
      this.configure({ totalRows: count });
    }
    applyPagination(rows) {
      const config = this.store.get("pagination");
      if (!config.enabled || config.serverSide) return rows;
      const totalRows = rows.filter((r) => r.type === "data" || r.type === "group").length;
      if (config.totalRows !== totalRows) {
        this.configure({ totalRows });
      }
      const start = (config.page - 1) * config.pageSize;
      const end = start + config.pageSize;
      let count = 0;
      return rows.filter((row) => {
        if (row.type !== "data" && row.type !== "group") return true;
        count++;
        return count > start && count <= end;
      });
    }
    getTotalPages() {
      const config = this.store.get("pagination");
      const total = config.totalRows ?? 0;
      return Math.max(1, Math.ceil(total / config.pageSize));
    }
    getCurrentPage() {
      return this.store.get("pagination").page;
    }
    getPageSize() {
      return this.store.get("pagination").pageSize;
    }
    getTotalRows() {
      return this.store.get("pagination").totalRows ?? 0;
    }
    getPageRange() {
      const config = this.store.get("pagination");
      const start = (config.page - 1) * config.pageSize + 1;
      const end = Math.min(config.page * config.pageSize, config.totalRows ?? 0);
      return { start, end };
    }
    isEnabled() {
      return this.store.get("pagination").enabled;
    }
    isFirstPage() {
      return this.store.get("pagination").page === 1;
    }
    isLastPage() {
      return this.store.get("pagination").page >= this.getTotalPages();
    }
    emitPageChange() {
      const config = this.store.get("pagination");
      this.eventBus.emit(GridEventType.PAGE_CHANGED, {
        page: config.page,
        pageSize: config.pageSize,
        totalRows: config.totalRows ?? 0,
        totalPages: this.getTotalPages()
      });
    }
  };

  // src/engines/grouping/group-node.ts
  function resolveField(data, path) {
    const parts = path.split(".");
    let current = data;
    for (const part of parts) {
      if (current == null) return void 0;
      current = current[part];
    }
    return current;
  }
  function getGroupDisplayValue(value, field) {
    if (value === null || value === void 0 || value === "") return "_Blank";
    if (typeof value === "object") {
      const obj = value;
      return String(obj.label ?? obj.name ?? obj.value ?? obj.id ?? JSON.stringify(value));
    }
    if (field === "is_deleted" || field === "deleted") {
      return value ? "Archived" : "Active";
    }
    const str = String(value);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function flattenGroupTree(tree, expandedGroupKeys) {
    const result = [];
    for (const group of tree) {
      const isExpanded = expandedGroupKeys.has(group.key);
      const groupNode = {
        nodeId: `group_${group.key}`,
        rowIndex: -1,
        data: { [group.field]: group.value },
        type: "group",
        selected: false,
        expanded: isExpanded,
        editable: false,
        level: group.level,
        parent: null,
        children: [],
        groupKey: group.key,
        groupField: group.field,
        groupValue: group.value,
        childCount: countLeafRows(group),
        aggregatedValues: group.aggregatedValues,
        height: 50,
        top: 0
      };
      result.push(groupNode);
      if (isExpanded) {
        if (group.children.length > 0) {
          result.push(...flattenGroupTree(group.children, expandedGroupKeys));
        } else {
          result.push(...group.rows);
        }
        if (group.aggregatedValues) {
          result.push({
            nodeId: `group_footer_${group.key}`,
            rowIndex: -1,
            data: { [group.field]: group.value },
            type: "group-footer",
            selected: false,
            expanded: false,
            editable: false,
            level: group.level,
            parent: null,
            children: [],
            groupKey: group.key,
            groupField: group.field,
            groupValue: group.value,
            childCount: countLeafRows(group),
            aggregatedValues: group.aggregatedValues,
            height: 50,
            top: 0
          });
        }
      }
    }
    return result;
  }
  function countLeafRows(group) {
    if (group.children.length === 0) return group.rows.length;
    return group.children.reduce((sum, child) => sum + countLeafRows(child), 0);
  }

  // src/engines/grouping/grouping-engine.ts
  var GroupingEngine = class {
    constructor(store, eventBus, aggregationEngine) {
      this.store = store;
      this.eventBus = eventBus;
      this.aggregationEngine = aggregationEngine;
    }
    groupByColumns(groupColIds, columns, rows) {
      if (groupColIds.length === 0) return rows;
      const groupCols = groupColIds.map((id) => columns.find((c) => c.colId === id)).filter((c) => !!c);
      const groupFields = groupCols.map((c) => c.field);
      const groupTree = this.buildGroupTree(groupFields, rows, 0);
      if (this.aggregationEngine) {
        this.aggregationEngine.compute(groupTree, columns);
      }
      const expandedKeys = this.store.get("expandedGroupKeys");
      return flattenGroupTree(groupTree, expandedKeys);
    }
    addGroupColumn(colId) {
      const current = this.store.get("groupedColumnIds");
      if (current.includes(colId)) return;
      this.store.set("groupedColumnIds", [...current, colId]);
      this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, { groupedColumnIds: [...current, colId] });
    }
    removeGroupColumn(colId) {
      const current = this.store.get("groupedColumnIds");
      this.store.set("groupedColumnIds", current.filter((id) => id !== colId));
      this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, {
        groupedColumnIds: current.filter((id) => id !== colId)
      });
    }
    reorderGroupColumns(orderedIds) {
      this.store.set("groupedColumnIds", orderedIds);
      this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, { groupedColumnIds: orderedIds });
    }
    clearGrouping() {
      this.store.set("groupedColumnIds", []);
      this.store.set("expandedGroupKeys", /* @__PURE__ */ new Set());
      this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, { groupedColumnIds: [] });
    }
    expandGroup(groupKey) {
      const keys = new Set(this.store.get("expandedGroupKeys"));
      keys.add(groupKey);
      this.store.set("expandedGroupKeys", keys);
      this.eventBus.emit(GridEventType.GROUP_EXPANDED, { groupKey });
    }
    collapseGroup(groupKey) {
      const keys = new Set(this.store.get("expandedGroupKeys"));
      keys.delete(groupKey);
      this.store.set("expandedGroupKeys", keys);
      this.eventBus.emit(GridEventType.GROUP_COLLAPSED, { groupKey });
    }
    toggleGroup(groupKey) {
      const keys = this.store.get("expandedGroupKeys");
      if (keys.has(groupKey)) {
        this.collapseGroup(groupKey);
      } else {
        this.expandGroup(groupKey);
      }
    }
    expandAllGroups(rows) {
      const groupRows = rows.filter((r) => r.type === "group");
      const keys = new Set(groupRows.map((r) => r.groupKey));
      this.store.set("expandedGroupKeys", keys);
    }
    collapseAllGroups() {
      this.store.set("expandedGroupKeys", /* @__PURE__ */ new Set());
    }
    isGroupExpanded(groupKey) {
      return this.store.get("expandedGroupKeys").has(groupKey);
    }
    buildGroupTree(groupFields, rows, level, parentKey = "") {
      if (groupFields.length === 0 || rows.length === 0) return [];
      const [currentField, ...remainingFields] = groupFields;
      const buckets = /* @__PURE__ */ new Map();
      for (const row of rows) {
        if (row.type !== "data") continue;
        const rawValue = resolveField(row.data, currentField);
        const displayValue = getGroupDisplayValue(rawValue, currentField);
        const existing = buckets.get(displayValue) ?? [];
        existing.push(row);
        buckets.set(displayValue, existing);
      }
      const groups = [];
      for (const [displayValue, bucketRows] of buckets) {
        const key = parentKey ? `${parentKey}||${currentField}::${displayValue}` : `${currentField}::${displayValue}`;
        const children = remainingFields.length > 0 ? this.buildGroupTree(remainingFields, bucketRows, level + 1, key) : [];
        groups.push({
          key,
          field: currentField,
          value: displayValue,
          level,
          children,
          rows: remainingFields.length === 0 ? bucketRows : [],
          expanded: this.store.get("expandedGroupKeys").has(key)
        });
      }
      return groups;
    }
  };

  // src/engines/aggregation/aggregation-engine.ts
  var AggregationEngine = class {
    /**
     * Walk the entire group tree bottom-up and write `aggregatedValues` onto
     * every node.
     *
     * - **Leaf groups** aggregate directly from their raw {@link RowNode} data.
     * - **Interior groups** combine the pre-computed child accumulators, so
     *   averages are correctly weighted and leaf rows are never double-counted.
     *
     * @param tree    - Top-level nodes from `GroupingEngine.buildGroupTree`.
     * @param columns - Full column set; filtered internally to agg-eligible cols.
     */
    compute(tree, columns) {
      const aggCols = columns.filter(
        (c) => (c.type === "currency" || c.type === "number") && c.aggFunc != null
      );
      if (aggCols.length === 0) return;
      for (const group of tree) {
        this.walkGroup(group, aggCols);
      }
    }
    // ─── Private ──────────────────────────────────────────────────────────────
    /**
     * Recursively process `group` and return its raw {@link AggAccumulator}s so
     * the parent can combine them without re-scanning leaf rows.
     */
    walkGroup(group, aggCols) {
      let accs;
      if (group.children.length > 0) {
        const childAccs = group.children.map((child) => this.walkGroup(child, aggCols));
        accs = this.mergeAccumulators(childAccs, aggCols);
      } else {
        accs = this.buildAccumulatorsFromRows(group.rows, aggCols);
      }
      group.aggregatedValues = this.deriveDisplayValues(accs, aggCols);
      return accs;
    }
    /**
     * Scan a flat array of leaf {@link RowNode}s and build one
     * {@link AggAccumulator} per agg-eligible column.
     *
     * Non-numeric values and `NaN`/`Infinity` are silently skipped; they do
     * not increment `count`, ensuring averages remain correct.
     */
    buildAccumulatorsFromRows(rows, aggCols) {
      const result = {};
      for (const col of aggCols) {
        const acc = { sum: 0, count: 0, min: Infinity, max: -Infinity };
        for (const row of rows) {
          const raw = resolveField(row.data, col.field);
          const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
          if (!isFinite(n)) continue;
          acc.sum += n;
          acc.count++;
          if (n < acc.min) acc.min = n;
          if (n > acc.max) acc.max = n;
        }
        result[col.field] = acc;
      }
      return result;
    }
    /**
     * Combine child {@link AggAccumulator}s into a single accumulator for the
     * parent group.  Children with zero count are skipped.
     */
    mergeAccumulators(childAccs, aggCols) {
      const result = {};
      for (const col of aggCols) {
        const acc = { sum: 0, count: 0, min: Infinity, max: -Infinity };
        for (const child of childAccs) {
          const c = child[col.field];
          if (!c || c.count === 0) continue;
          acc.sum += c.sum;
          acc.count += c.count;
          if (c.min < acc.min) acc.min = c.min;
          if (c.max > acc.max) acc.max = c.max;
        }
        result[col.field] = acc;
      }
      return result;
    }
    /**
     * Convert raw {@link AggAccumulator}s into the final display values keyed by
     * `colDef.field`.  Groups with `count === 0` get `null` for that field.
     */
    deriveDisplayValues(accs, aggCols) {
      const result = {};
      for (const col of aggCols) {
        const acc = accs[col.field];
        if (!acc || acc.count === 0) {
          result[col.field] = null;
          continue;
        }
        switch (col.aggFunc) {
          case "sum":
            result[col.field] = acc.sum;
            break;
          case "avg":
            result[col.field] = acc.sum / acc.count;
            break;
          case "min":
            result[col.field] = isFinite(acc.min) ? acc.min : null;
            break;
          case "max":
            result[col.field] = isFinite(acc.max) ? acc.max : null;
            break;
          case "count":
            result[col.field] = acc.count;
            break;
        }
      }
      return result;
    }
  };

  // src/engines/selection/row-selection-engine.ts
  var RowSelectionEngine = class {
    constructor(store, eventBus) {
      this.store = store;
      this.eventBus = eventBus;
      this.config = {
        mode: "multiple",
        checkboxSelection: true,
        selectAllOnHeaderClick: true,
        headerCheckbox: true,
        suppressRowDeselection: false
      };
    }
    configure(config) {
      this.config = { ...this.config, ...config };
    }
    selectRow(nodeId, rows) {
      if (this.config.mode === "none") return;
      const selectedIds = new Set(this.store.get("selectedRowIds"));
      if (this.config.mode === "single") {
        selectedIds.clear();
        selectedIds.add(nodeId);
      } else {
        selectedIds.add(nodeId);
      }
      this.applySelectionToRows(rows, selectedIds);
      this.store.set("selectedRowIds", selectedIds);
      this.updateSelectionState(rows, selectedIds);
      const selectedRows = rows.filter((r) => selectedIds.has(r.nodeId));
      this.eventBus.emit(GridEventType.ROW_SELECTED, {
        rows: selectedRows,
        selectedCount: selectedIds.size,
        isAllSelected: this.isAllSelected(rows, selectedIds)
      });
    }
    deselectRow(nodeId, rows) {
      if (this.config.suppressRowDeselection) return;
      const selectedIds = new Set(this.store.get("selectedRowIds"));
      selectedIds.delete(nodeId);
      this.applySelectionToRows(rows, selectedIds);
      this.store.set("selectedRowIds", selectedIds);
      this.updateSelectionState(rows, selectedIds);
      const selectedRows = rows.filter((r) => selectedIds.has(r.nodeId));
      this.eventBus.emit(GridEventType.ROW_DESELECTED, {
        rows: selectedRows,
        selectedCount: selectedIds.size,
        isAllSelected: false
      });
    }
    toggleRowSelection(nodeId, rows) {
      const selectedIds = this.store.get("selectedRowIds");
      if (selectedIds.has(nodeId)) {
        this.deselectRow(nodeId, rows);
      } else {
        this.selectRow(nodeId, rows);
      }
    }
    selectRows(nodeIds, rows) {
      if (this.config.mode === "none") return;
      const selectedIds = this.config.mode === "single" ? /* @__PURE__ */ new Set([nodeIds[nodeIds.length - 1]]) : /* @__PURE__ */ new Set([...this.store.get("selectedRowIds"), ...nodeIds]);
      this.applySelectionToRows(rows, selectedIds);
      this.store.set("selectedRowIds", selectedIds);
      this.updateSelectionState(rows, selectedIds);
      const selectedRows = rows.filter((r) => selectedIds.has(r.nodeId));
      this.eventBus.emit(GridEventType.ROW_SELECTED, {
        rows: selectedRows,
        selectedCount: selectedIds.size,
        isAllSelected: this.isAllSelected(rows, selectedIds)
      });
    }
    selectAll(rows) {
      if (this.config.mode !== "multiple") return;
      const dataRows = rows.filter((r) => r.type === "data");
      const selectedIds = new Set(dataRows.map((r) => r.nodeId));
      this.applySelectionToRows(rows, selectedIds);
      this.store.set("selectedRowIds", selectedIds);
      this.store.set("isAllSelected", true);
      this.store.set("isIndeterminate", false);
      this.eventBus.emit(GridEventType.ALL_ROWS_SELECTED, {
        rows: dataRows,
        selectedCount: selectedIds.size,
        isAllSelected: true
      });
    }
    deselectAll(rows) {
      const emptySet = /* @__PURE__ */ new Set();
      this.applySelectionToRows(rows, emptySet);
      this.store.set("selectedRowIds", emptySet);
      this.store.set("isAllSelected", false);
      this.store.set("isIndeterminate", false);
      this.eventBus.emit(GridEventType.ALL_ROWS_DESELECTED, {
        rows: [],
        selectedCount: 0,
        isAllSelected: false
      });
    }
    selectRange(fromIndex, toIndex, rows) {
      if (this.config.mode !== "multiple") return;
      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);
      const rangeIds = rows.filter((r) => r.type === "data" && r.rowIndex >= start && r.rowIndex <= end).map((r) => r.nodeId);
      this.selectRows(rangeIds, rows);
    }
    isRowSelected(nodeId) {
      return this.store.get("selectedRowIds").has(nodeId);
    }
    getSelectedRows(rows) {
      const selectedIds = this.store.get("selectedRowIds");
      return rows.filter((r) => selectedIds.has(r.nodeId));
    }
    getSelectedCount() {
      return this.store.get("selectedRowIds").size;
    }
    clearSelection(rows) {
      this.deselectAll(rows);
    }
    isAllSelected(rows, selectedIds) {
      const dataRows = rows.filter((r) => r.type === "data");
      return dataRows.length > 0 && dataRows.every((r) => selectedIds.has(r.nodeId));
    }
    updateSelectionState(rows, selectedIds) {
      const dataRows = rows.filter((r) => r.type === "data");
      const allSelected = dataRows.length > 0 && dataRows.every((r) => selectedIds.has(r.nodeId));
      const someSelected = !allSelected && dataRows.some((r) => selectedIds.has(r.nodeId));
      this.store.set("isAllSelected", allSelected);
      this.store.set("isIndeterminate", someSelected);
    }
    applySelectionToRows(rows, selectedIds) {
      for (const row of rows) {
        row.selected = selectedIds.has(row.nodeId);
      }
    }
  };

  // src/engines/editing/cell-editor-engine.ts
  var CellEditorEngine = class {
    constructor(store, eventBus) {
      this.store = store;
      this.eventBus = eventBus;
      this.activeSession = null;
      this.config = {
        mode: "cell",
        singleClickEdit: false,
        stopEditingWhenCellsLoseFocus: true
      };
      /**
       * Optional callback invoked when Tab is pressed while a native editor is
       * active.  Receives `shiftKey` so the caller can navigate forwards or
       * backwards.  Registered by `wireEditing` in `GridCore`.
       */
      this.tabHandler = null;
    }
    /** Register a callback to be called when Tab is pressed inside a native editor. */
    setTabHandler(fn) {
      this.tabHandler = fn;
    }
    configure(config) {
      this.config = { ...this.config, ...config };
    }
    startEditing(rowNode, colDef, cellEl) {
      if (this.config.mode === "none") return false;
      if (!colDef.editable) return false;
      if (this.activeSession) this.stopEditing(true);
      const originalValue = rowNode.data[colDef.field];
      this.activeSession = {
        rowNode,
        colDef,
        originalValue,
        currentValue: originalValue,
        editorEl: null,
        cellEl
      };
      this.store.set("editingCellId", `${rowNode.nodeId}__${colDef.colId}`);
      cellEl.classList.add("pg-cell--editing");
      this.eventBus.emit(GridEventType.CELL_EDIT_START, {
        row: rowNode,
        colDef,
        oldValue: originalValue,
        newValue: originalValue,
        rowIndex: rowNode.rowIndex
      });
      this.eventBus.emit(GridEventType.ROW_EDIT_START, {
        row: rowNode,
        field: colDef.field,
        oldValue: originalValue,
        newValue: originalValue
      });
      return true;
    }
    updateValue(value) {
      if (!this.activeSession) return;
      this.activeSession.currentValue = value;
    }
    stopEditing(cancel = false) {
      if (!this.activeSession) return;
      const { rowNode, colDef, originalValue, currentValue, cellEl } = this.activeSession;
      cellEl?.classList.remove("pg-cell--editing");
      this.store.set("editingCellId", null);
      if (!cancel) {
        const parsed = parseValue(currentValue, colDef);
        const error = validateValue(parsed, colDef);
        if (error) {
          this.eventBus.emit(GridEventType.CELL_EDIT_STOP, {
            row: rowNode,
            field: colDef.field,
            oldValue: originalValue,
            newValue: parsed,
            error
          });
          this.activeSession = null;
          return;
        }
        if (parsed !== originalValue) {
          rowNode.data = { ...rowNode.data, [colDef.field]: parsed };
          this.eventBus.emit(GridEventType.CELL_VALUE_CHANGED, {
            row: rowNode,
            colDef,
            oldValue: originalValue,
            newValue: parsed,
            rowIndex: rowNode.rowIndex
          });
          if (cellEl) {
            setTimeout(() => {
              cellEl.classList.remove("pg-cell--fill-flash");
              void cellEl.offsetWidth;
              cellEl.classList.add("pg-cell--fill-flash");
              setTimeout(() => cellEl.classList.remove("pg-cell--fill-flash"), 700);
            }, 0);
          }
        }
      }
      this.eventBus.emit(GridEventType.CELL_EDIT_STOP, {
        row: rowNode,
        field: colDef.field,
        oldValue: originalValue,
        newValue: cancel ? originalValue : currentValue
      });
      this.activeSession = null;
    }
    isEditing() {
      return this.activeSession !== null;
    }
    getActiveSession() {
      return this.activeSession;
    }
    isCellEditing(rowNodeId, colId) {
      const editId = this.store.get("editingCellId");
      return editId === `${rowNodeId}__${colId}`;
    }
    /**
     * Builds and mounts the appropriate native editor widget into `container` based
     * on `colDef.type`.  Returns the root editor element.
     *
     * Editor types:
     * - `boolean`            → styled checkbox
     * - `dropdown` / `object`→ single-select `<select>` from `dropdownOptions`
     * - `array`              → custom multi-select panel with checkboxes
     * - `number` / `currency`/ `percentage` → number `<input>`
     * - `date`               → date `<input>`
     * - `time`               → time `<input>`
     * - default              → text `<input>`
     */
    buildNativeEditor(colDef, value, container) {
      if (colDef.type === "array") {
        return this.buildMultiSelectEditor(colDef, value, container);
      }
      let input;
      switch (colDef.type) {
        case "boolean": {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = !!value;
          checkbox.className = "pg-editor pg-editor--checkbox";
          checkbox.addEventListener("change", () => this.updateValue(checkbox.checked));
          input = checkbox;
          break;
        }
        case "dropdown":
        case "object": {
          const select = document.createElement("select");
          select.className = "pg-editor pg-editor--select";
          const currentKey = this.resolveObjectKey(value, colDef);
          for (const opt of colDef.dropdownOptions ?? []) {
            const option = document.createElement("option");
            option.value = String(opt.value);
            option.textContent = opt.label;
            option.selected = String(opt.value) === String(currentKey ?? "");
            select.appendChild(option);
          }
          select.addEventListener("change", () => {
            if (colDef.type === "object") {
              const picked = colDef.dropdownOptions?.find((o) => String(o.value) === select.value);
              this.updateValue(picked ?? select.value);
            } else {
              this.updateValue(select.value);
            }
          });
          input = select;
          break;
        }
        case "number":
        case "currency":
        case "percentage": {
          const numInput = document.createElement("input");
          numInput.type = "number";
          numInput.value = String(value ?? "");
          numInput.className = "pg-editor pg-editor--number";
          if (colDef.min !== void 0 && colDef.min !== null) numInput.min = String(colDef.min);
          if (colDef.max !== void 0 && colDef.max !== null) numInput.max = String(colDef.max);
          numInput.addEventListener("input", () => this.updateValue(numInput.value));
          input = numInput;
          break;
        }
        case "date": {
          const dateInput = document.createElement("input");
          dateInput.type = "date";
          dateInput.value = value ? new Date(value).toISOString().split("T")[0] : "";
          dateInput.className = "pg-editor pg-editor--date";
          dateInput.addEventListener("change", () => this.updateValue(dateInput.value));
          input = dateInput;
          break;
        }
        case "time": {
          const timeInput = document.createElement("input");
          timeInput.type = "time";
          timeInput.value = String(value ?? "");
          timeInput.className = "pg-editor pg-editor--time";
          timeInput.addEventListener("change", () => this.updateValue(timeInput.value));
          input = timeInput;
          break;
        }
        default: {
          const textInput = document.createElement("input");
          textInput.type = colDef.type === "email" ? "email" : "text";
          textInput.value = String(value ?? "");
          textInput.className = "pg-editor pg-editor--text";
          textInput.addEventListener("input", () => this.updateValue(textInput.value));
          input = textInput;
        }
      }
      if (this.config.stopEditingWhenCellsLoseFocus) {
        input.addEventListener("blur", () => this.stopEditing(false));
      }
      input.addEventListener("keydown", (e) => {
        const ke = e;
        ke.stopPropagation();
        if (ke.key === "Enter") {
          ke.preventDefault();
          this.stopEditing(false);
        } else if (ke.key === "Escape") {
          ke.preventDefault();
          this.stopEditing(true);
        } else if (ke.key === "Tab") {
          ke.preventDefault();
          this.stopEditing(false);
          this.tabHandler?.(ke.shiftKey);
        }
      });
      container.appendChild(input);
      if (this.activeSession) this.activeSession.editorEl = input;
      setTimeout(() => input.focus?.(), 0);
      return input;
    }
    /**
     * Builds a custom multi-select dropdown panel for `array` column type.
     * The stored value is always `string[]` of selected option values.
     */
    buildMultiSelectEditor(colDef, value, container) {
      const currentValues = new Set(Array.isArray(value) ? value.map(String) : []);
      const options = colDef.dropdownOptions ?? [];
      const wrapper = document.createElement("div");
      wrapper.className = "pg-editor pg-editor--multiselect";
      wrapper.setAttribute("tabindex", "-1");
      const trigger = document.createElement("div");
      trigger.className = "pg-editor__ms-trigger";
      const triggerText = document.createElement("span");
      triggerText.className = "pg-editor__ms-text";
      const triggerArrow = document.createElement("span");
      triggerArrow.className = "pg-editor__ms-arrow";
      trigger.appendChild(triggerText);
      trigger.appendChild(triggerArrow);
      const panel = document.createElement("div");
      panel.className = "pg-editor__ms-panel";
      const refreshTriggerText = () => {
        const labels = options.filter((o) => currentValues.has(String(o.value))).map((o) => o.label);
        triggerText.textContent = labels.length > 0 ? labels.join(", ") : "\u2014";
      };
      for (const opt of options) {
        const label = document.createElement("label");
        label.className = "pg-editor__ms-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "pg-editor__ms-check";
        checkbox.value = String(opt.value);
        checkbox.checked = currentValues.has(String(opt.value));
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) currentValues.add(checkbox.value);
          else currentValues.delete(checkbox.value);
          refreshTriggerText();
          this.updateValue([...currentValues]);
        });
        const labelText = document.createElement("span");
        labelText.className = "pg-editor__ms-label";
        labelText.textContent = opt.label;
        label.appendChild(checkbox);
        label.appendChild(labelText);
        panel.appendChild(label);
      }
      refreshTriggerText();
      trigger.addEventListener("mousedown", (e) => {
        e.preventDefault();
        panel.classList.toggle("pg-editor__ms-panel--open");
      });
      wrapper.appendChild(trigger);
      wrapper.appendChild(panel);
      container.appendChild(wrapper);
      setTimeout(() => {
        wrapper.focus();
        panel.classList.add("pg-editor__ms-panel--open");
      }, 0);
      let blurTimer = null;
      wrapper.addEventListener("focusout", () => {
        blurTimer = setTimeout(() => {
          if (!wrapper.contains(document.activeElement)) {
            this.stopEditing(false);
          }
        }, 150);
      });
      wrapper.addEventListener("focusin", () => {
        if (blurTimer !== null) {
          clearTimeout(blurTimer);
          blurTimer = null;
        }
      });
      wrapper.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          this.stopEditing(false);
        } else if (e.key === "Escape") {
          e.preventDefault();
          this.stopEditing(true);
        } else if (e.key === "Tab") {
          e.preventDefault();
          this.stopEditing(false);
          this.tabHandler?.(e.shiftKey);
        }
      });
      if (this.activeSession) this.activeSession.editorEl = wrapper;
      return wrapper;
    }
    /**
     * Resolves the key used to match a cell value against `dropdownOptions`
     * for `object` type columns.  Supports primitive values and plain objects.
     */
    resolveObjectKey(value, colDef) {
      if (typeof value === "object" && value !== null) {
        const key = colDef.objectValueKey ?? "value";
        return value[key];
      }
      return value;
    }
    /** Returns the active `EditingConfig` (read-only). */
    getConfig() {
      return this.config;
    }
  };

  // src/engines/summary/summary-engine.ts
  var SummaryEngine = class {
    compute(rows, columns) {
      const dataRows = rows.filter((r) => r.type === "data");
      const result = {};
      for (const col of columns) {
        if (!col.showSummary) continue;
        const aggregation = col.summaryAggregation ?? "sum";
        const values = dataRows.map((r) => this.resolveValue(r.data, col.field)).filter((v) => typeof v === "number" && !isNaN(v));
        let value = null;
        let label = col.summaryLabel ?? "";
        switch (aggregation) {
          case "sum":
            value = values.reduce((acc, v) => acc + v, 0);
            label = label || "Sum";
            break;
          case "avg":
            value = values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : null;
            label = label || "Avg";
            break;
          case "min":
            value = values.length > 0 ? Math.min(...values) : null;
            label = label || "Min";
            break;
          case "max":
            value = values.length > 0 ? Math.max(...values) : null;
            label = label || "Max";
            break;
          case "count":
            value = dataRows.length;
            label = label || "Count";
            break;
          case "none":
            value = null;
            break;
        }
        result[col.colId] = {
          value,
          label,
          aggregation,
          formatted: this.formatSummaryValue(value, col, aggregation)
        };
      }
      return result;
    }
    formatSummaryValue(value, col, aggregation) {
      if (value === null || value === void 0) return "";
      if (aggregation === "count") return String(value);
      const n = Number(value);
      if (isNaN(n)) return String(value);
      if (col.isCurrency) {
        return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    }
    resolveValue(data, path) {
      const parts = path.split(".");
      let current = data;
      for (const part of parts) {
        if (current == null) return void 0;
        current = current[part];
      }
      return current;
    }
  };

  // src/engines/export/export-engine.ts
  var ExportEngine = class {
    constructor(eventBus) {
      this.eventBus = eventBus;
    }
    exportToCsv(rows, columns, config = {}) {
      const fileName = (config.fileName ?? "export") + ".csv";
      const exportCols = this.getExportColumns(columns, config);
      const dataRows = rows.filter((r) => r.type === "data");
      this.eventBus.emit(GridEventType.EXPORT_START, { format: "csv", fileName, rowCount: dataRows.length });
      const headerRow = exportCols.map((c) => this.escapeCsvCell(c.header)).join(",");
      const bodyRows = dataRows.map(
        (row) => exportCols.map((col) => {
          const raw = this.resolveValue(row.data, col.field);
          const formatted = config.processCellValue ? config.processCellValue({ value: raw, colDef: col }) : formatValue(raw, col);
          return this.escapeCsvCell(formatted);
        }).join(",")
      );
      const csv = [headerRow, ...bodyRows].join("\r\n");
      this.downloadFile(csv, fileName, "text/csv;charset=utf-8;");
      this.eventBus.emit(GridEventType.EXPORT_COMPLETE, { format: "csv", fileName, rowCount: dataRows.length });
    }
    exportToXlsx(rows, columns, config = {}) {
      const fileName = (config.fileName ?? "export") + ".xlsx";
      const exportCols = this.getExportColumns(columns, config);
      const dataRows = rows.filter((r) => r.type === "data");
      this.eventBus.emit(GridEventType.EXPORT_START, { format: "xlsx", fileName, rowCount: dataRows.length });
      const xmlRows = [];
      const headers = exportCols.map((c) => `<Cell><Data ss:Type="String">${this.escapeXml(c.header)}</Data></Cell>`).join("");
      xmlRows.push(`<Row>${headers}</Row>`);
      for (const row of dataRows) {
        const cells = exportCols.map((col) => {
          const raw = this.resolveValue(row.data, col.field);
          const formatted = config.processCellValue ? config.processCellValue({ value: raw, colDef: col }) : formatValue(raw, col);
          const type = col.type === "number" || col.type === "currency" ? "Number" : "String";
          return `<Cell><Data ss:Type="${type}">${this.escapeXml(formatted)}</Data></Cell>`;
        });
        xmlRows.push(`<Row>${cells.join("")}</Row>`);
      }
      const xmlContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1">
    <Table>${xmlRows.join("")}</Table>
  </Worksheet>
</Workbook>`;
      this.downloadFile(xmlContent, fileName, "application/vnd.ms-excel");
      this.eventBus.emit(GridEventType.EXPORT_COMPLETE, { format: "xlsx", fileName, rowCount: dataRows.length });
    }
    getExportColumns(columns, config) {
      return columns.filter((col) => {
        if (!config.includeHiddenColumns && col.visible === false) return false;
        return true;
      });
    }
    escapeCsvCell(value) {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }
    escapeXml(value) {
      return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    }
    downloadFile(content, fileName, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    resolveValue(data, path) {
      const parts = path.split(".");
      let current = data;
      for (const part of parts) {
        if (current == null) return void 0;
        current = current[part];
      }
      return current;
    }
  };

  // src/engines/clipboard/clipboard-engine.ts
  function fmt(val, desc) {
    if (val == null) return "";
    switch (desc.type) {
      case "number":
      case "currency":
      case "percentage":
        return String(val);
      case "boolean":
        return val ? "Yes" : "No";
      case "array":
        return Array.isArray(val) ? val.join(", ") : String(val);
      case "dropdown": {
        const label = desc.dropdownMap?.get(String(val));
        return label != null ? label : String(val);
      }
      default:
        return String(val);
    }
  }
  function resolve(data, desc) {
    if (!desc.nested) return data[desc.field];
    let cur = data;
    for (const part of desc.parts) {
      if (cur == null) return void 0;
      cur = cur[part];
    }
    return cur;
  }
  var ClipboardEngine = class {
    constructor() {
      /** Internal fallback buffer used when clipboard-read permission is denied. */
      this.clipboardBuffer = [];
    }
    /**
     * Copies the first cell range to the system clipboard as tab-separated text.
     * Also populates the internal buffer so paste works even when the browser
     * clipboard-read permission is denied.
     *
     * @param ranges          - Active cell ranges (only the first is used for copy)
     * @param rows            - All visible rows
     * @param columns         - All visible column definitions
     * @param withHeaders     - Include a header row in the copied text
     * @param leafGroupField  - Field name of the deepest grouping column; when
     *                          provided, leaf data rows include their group-field
     *                          value in the first (auto-group label) clipboard column
     */
    copyRangesToClipboard(ranges, rows, columns, withHeaders = false, leafGroupField) {
      const { text, buffer } = this.buildRangeData(ranges, rows, columns, withHeaders, leafGroupField);
      this.clipboardBuffer = buffer;
      return this.writeToClipboard(text);
    }
    /**
     * Reads text from the system clipboard and returns it as a 2D string array.
     * Falls back to the internal buffer when clipboard-read is denied.
     */
    async pasteFromClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        return this.parseClipboardText(text);
      } catch {
        return this.clipboardBuffer;
      }
    }
    /**
     * Copies selected rows (with headers) to the clipboard.
     * Used by row-selection mode rather than cell-range mode.
     *
     * @param selectedRows - Rows to copy
     * @param columns      - Column definitions
     */
    copyRowsToClipboard(selectedRows, columns) {
      const descs = this.buildDescriptors(columns, 0, columns.length - 1);
      const lines = [columns.map((c) => c.header).join("	")];
      for (const row of selectedRows) {
        const cells = new Array(descs.length);
        for (let i = 0; i < descs.length; i++) {
          cells[i] = fmt(resolve(row.data, descs[i]), descs[i]);
        }
        lines.push(cells.join("	"));
      }
      return this.writeToClipboard(lines.join("\n"));
    }
    /**
     * Copies a single cell value to the clipboard.
     *
     * @param value - Cell value
     * @param col   - Column definition for type-aware formatting
     */
    copyCellValue(value, col) {
      const desc = this.buildDescriptors([col], 0, 0)[0];
      return this.writeToClipboard(fmt(value, desc));
    }
    // ── Core build ──────────────────────────────────────────────────────────────
    /**
     * Builds the tab-separated clipboard text and the raw 2D string buffer in a
     * **single pass** over the row/column range.
     *
     * ### Performance strategy
     * - **Pre-compiled descriptors** — `ColDesc[]` is built once before the loop;
     *   each descriptor caches the split field path, column type, and a
     *   `Map<value→label>` for dropdown columns.  No `field.split('.')` or
     *   option-list `.find()` inside the hot cell loop.
     * - **Single pass** — text and 2D buffer are produced together, eliminating
     *   the previous approach of building text then calling `parseClipboardText`
     *   to re-split it back.
     * - **Fast formatter** — `String(n)` instead of `n.toLocaleString({…})`;
     *   the latter creates a temporary `Intl.NumberFormat` on every call.
     *
     * @param ranges      - Cell selection ranges
     * @param rows        - Visible rows
     * @param columns     - Visible column definitions
     * @param withHeaders - Include a header row
     */
    buildRangeData(ranges, rows, columns, withHeaders, leafGroupField) {
      if (ranges.length === 0) return { text: "", buffer: [] };
      if (ranges.length > 1) {
        return this.buildMultiRangeData(ranges, rows, columns, withHeaders);
      }
      const range = ranges[0];
      const startRow = Math.min(range.startRowIndex, range.endRowIndex);
      const endRow = Math.max(range.startRowIndex, range.endRowIndex);
      const startCol = Math.min(range.startColIndex, range.endColIndex);
      const endCol = Math.max(range.startColIndex, range.endColIndex);
      const hasGroupLabel = startCol < 0;
      const dataStartCol = hasGroupLabel ? 0 : startCol;
      const descs = endCol >= 0 ? this.buildDescriptors(columns, dataStartCol, endCol) : [];
      const dataCols = descs.length;
      const colCount = hasGroupLabel ? dataCols + 1 : dataCols;
      const lines = [];
      const buffer = [];
      if (withHeaders && colCount > 0) {
        const hdr = new Array(colCount);
        const hdrOffset = hasGroupLabel ? 1 : 0;
        if (hasGroupLabel) hdr[0] = "Group";
        for (let i = 0; i < dataCols; i++) {
          hdr[i + hdrOffset] = columns[dataStartCol + i]?.header ?? "";
        }
        lines.push(hdr.join("	"));
      }
      for (let r = startRow; r <= endRow; r++) {
        const row = rows[r];
        if (!row) continue;
        const isGroupLike = row.type === "group" || row.type === "group-footer";
        if (isGroupLike && !hasGroupLabel && !row.aggregatedValues) continue;
        if (!isGroupLike && row.type !== "data") continue;
        const cells = new Array(colCount).fill("");
        const offset = hasGroupLabel ? 1 : 0;
        if (hasGroupLabel) {
          if (isGroupLike) {
            cells[0] = String(row.groupValue ?? "");
          } else if (row.type === "data" && leafGroupField) {
            const v = row.data[leafGroupField];
            cells[0] = v != null ? String(v) : "";
          }
        }
        if (row.type === "data") {
          const data = row.data;
          for (let i = 0; i < dataCols; i++) {
            cells[i + offset] = fmt(resolve(data, descs[i]), descs[i]);
          }
        } else if (isGroupLike && row.aggregatedValues) {
          const aggVals = row.aggregatedValues;
          for (let i = 0; i < dataCols; i++) {
            const col = columns[dataStartCol + i];
            if (col && (col.type === "currency" || col.type === "number") && col.aggFunc != null) {
              const v = aggVals[col.field];
              cells[i + offset] = v != null ? String(v) : "";
            }
          }
        }
        lines.push(cells.join("	"));
        buffer.push(cells);
      }
      return { text: lines.join("\n"), buffer };
    }
    /**
     * Builds clipboard data for Ctrl+Click multi-range selections.
     *
     * The output spans the bounding box of all ranges; cells that fall inside
     * the bounding box but belong to no range get an empty string.  Rows that
     * have no selected cell in any range are skipped entirely so the clipboard
     * stays compact.
     *
     * @param ranges      - Two or more cell ranges (Ctrl+Click selections).
     * @param rows        - Visible rows.
     * @param columns     - Visible column definitions.
     * @param withHeaders - Include a header row.
     */
    buildMultiRangeData(ranges, rows, columns, withHeaders) {
      const norms = ranges.map((r) => ({
        startRowIndex: Math.min(r.startRowIndex, r.endRowIndex),
        endRowIndex: Math.max(r.startRowIndex, r.endRowIndex),
        startColIndex: Math.max(0, Math.min(r.startColIndex, r.endColIndex)),
        endColIndex: Math.max(r.startColIndex, r.endColIndex)
      }));
      const startRow = Math.min(...norms.map((n) => n.startRowIndex));
      const endRow = Math.max(...norms.map((n) => n.endRowIndex));
      const startCol = Math.max(0, Math.min(...norms.map((n) => n.startColIndex)));
      const endCol = Math.max(...norms.map((n) => n.endColIndex));
      if (endCol < 0) return { text: "", buffer: [] };
      const descs = this.buildDescriptors(columns, startCol, endCol);
      const colCount = descs.length;
      const lines = [];
      const buffer = [];
      if (withHeaders && colCount > 0) {
        lines.push(descs.map((_, i) => columns[startCol + i]?.header ?? "").join("	"));
      }
      for (let r = startRow; r <= endRow; r++) {
        const row = rows[r];
        if (!row || row.type !== "data") continue;
        const rowSelected = norms.some((n) => r >= n.startRowIndex && r <= n.endRowIndex);
        if (!rowSelected) continue;
        const cells = new Array(colCount).fill("");
        for (let ci = 0; ci < colCount; ci++) {
          const c = startCol + ci;
          const inRange = norms.some(
            (n) => r >= n.startRowIndex && r <= n.endRowIndex && c >= n.startColIndex && c <= n.endColIndex
          );
          if (inRange) cells[ci] = fmt(resolve(row.data, descs[ci]), descs[ci]);
        }
        lines.push(cells.join("	"));
        buffer.push(cells);
      }
      return { text: lines.join("\n"), buffer };
    }
    // ── Descriptor builder ─────────────────────────────────────────────────────
    /**
     * Compiles `ColDesc` objects for columns `[startCol, endCol]` inclusive.
     * Called once per copy operation — never inside the row loop.
     */
    buildDescriptors(columns, startCol, endCol) {
      const descs = [];
      for (let c = startCol; c <= endCol; c++) {
        const col = columns[c];
        if (!col) continue;
        let dropdownMap = null;
        if (col.type === "dropdown" && col.dropdownOptions?.length) {
          dropdownMap = new Map(col.dropdownOptions.map((o) => [String(o.value), o.label]));
        }
        descs.push({
          field: col.field,
          parts: col.field.split("."),
          nested: col.field.includes("."),
          type: col.type ?? "string",
          dropdownMap
        });
      }
      return descs;
    }
    // ── Paste helper ───────────────────────────────────────────────────────────
    /**
     * Splits tab-separated clipboard text into a 2D string array.
     * Used only on paste (not on copy — the buffer is built directly).
     */
    parseClipboardText(text) {
      return text.split("\n").map((line) => line.split("	").map((cell) => cell.trim()));
    }
    // ── Write ───────────────────────────────────────────────────────────────────
    writeToClipboard(text) {
      if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text).catch(() => this.execCommandCopy(text));
      }
      return Promise.resolve(this.execCommandCopy(text));
    }
    execCommandCopy(text) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
      }
      document.body.removeChild(ta);
    }
  };

  // src/drag-drop/drag-preview.ts
  var DragPreview = class {
    constructor() {
      this.el = null;
      this.offsetX = 12;
      this.offsetY = 12;
    }
    /**
     * Create a theme-styled floating drag preview.
     *
     * Visual styling belongs to `.pg-drag-preview` CSS rules; this method only
     * builds semantic children and data-driven classes.
     *
     * @param options - Label, icon, count badge, and optional avatar metadata.
     */
    create(options = {}) {
      this.destroy();
      const preview = document.createElement("div");
      preview.className = "pg-drag-preview";
      if (options.avatarUrl || options.shape) {
        const avatar = document.createElement("div");
        const shape = options.shape ?? "circle";
        avatar.className = `pg-drag-preview__avatar pg-drag-preview__avatar--${shape}`;
        if (options.avatarUrl) {
          const img = document.createElement("img");
          img.className = "pg-drag-preview__avatar-img";
          img.src = options.avatarUrl;
          avatar.appendChild(img);
        }
        preview.appendChild(avatar);
      }
      if (options.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "pg-drag-preview__icon";
        iconSpan.innerHTML = options.icon;
        preview.appendChild(iconSpan);
      }
      const labelSpan = document.createElement("span");
      labelSpan.className = "pg-drag-preview__label";
      labelSpan.textContent = options.label ?? "Dragging";
      preview.appendChild(labelSpan);
      if (options.count && options.count > 1) {
        const badge = document.createElement("span");
        badge.className = "pg-drag-preview__badge";
        badge.textContent = String(options.count);
        preview.appendChild(badge);
      }
      document.body.appendChild(preview);
      this.el = preview;
      return preview;
    }
    moveTo(x, y) {
      if (!this.el) return;
      this.el.style.transform = `translate(${x + this.offsetX}px, ${y + this.offsetY}px)`;
    }
    /**
     * Set the cursor-relative offset used by {@link moveTo}.
     *
     * @param x - Horizontal offset in CSS pixels.
     * @param y - Vertical offset in CSS pixels.
     */
    setOffset(x, y) {
      this.offsetX = x;
      this.offsetY = y;
    }
    /** Remove the current preview element from the DOM. */
    destroy() {
      if (this.el) {
        this.el.remove();
        this.el = null;
      }
    }
  };

  // src/drag-drop/drag-autoscroll.ts
  var SCROLL_ZONE = 60;
  var SCROLL_SPEED_MAX = 18;
  var DragAutoscroll = class {
    constructor() {
      this.scrollEl = null;
      this.rafId = null;
      this.mouseX = 0;
      this.mouseY = 0;
    }
    attach(scrollEl) {
      this.scrollEl = scrollEl;
    }
    detach() {
      this.stop();
      this.scrollEl = null;
    }
    onMouseMove(x, y) {
      this.mouseX = x;
      this.mouseY = y;
    }
    start() {
      if (this.rafId !== null) return;
      const tick = () => {
        this.scroll();
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    }
    stop() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
    scroll() {
      if (!this.scrollEl) return;
      const rect = this.scrollEl.getBoundingClientRect();
      const relX = this.mouseX - rect.left;
      const relY = this.mouseY - rect.top;
      let dx = 0;
      let dy = 0;
      if (relY < SCROLL_ZONE) {
        dy = -this.calcSpeed(relY);
      } else if (relY > rect.height - SCROLL_ZONE) {
        dy = this.calcSpeed(rect.height - relY);
      }
      if (relX < SCROLL_ZONE) {
        dx = -this.calcSpeed(relX);
      } else if (relX > rect.width - SCROLL_ZONE) {
        dx = this.calcSpeed(rect.width - relX);
      }
      if (dx !== 0 || dy !== 0) {
        this.scrollEl.scrollBy(dx, dy);
      }
    }
    calcSpeed(distanceFromEdge) {
      const ratio = Math.max(0, Math.min(1, 1 - distanceFromEdge / SCROLL_ZONE));
      return Math.round(ratio * ratio * SCROLL_SPEED_MAX);
    }
  };

  // src/drag-drop/drag-drop-engine.ts
  var DRAG_THRESHOLD = 4;
  var DragDropEngine = class {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.dropTargets = /* @__PURE__ */ new Map();
      this.currentSession = null;
      this.preview = new DragPreview();
      this.autoscroll = new DragAutoscroll();
      this.previewOptions = {};
      this.boundMouseMove = this.onMouseMove.bind(this);
      this.boundMouseUp = this.onMouseUp.bind(this);
    }
    registerDropTarget(target) {
      this.dropTargets.set(target.id, target);
      return () => this.dropTargets.delete(target.id);
    }
    makeDraggable(el, item, scrollContainer, previewOpts) {
      if (previewOpts) this.previewOptions = previewOpts;
      const onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.currentSession = {
          item,
          sourceEl: el,
          currentTarget: null,
          position: null,
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
          isDragging: false,
          startTime: Date.now()
        };
        if (scrollContainer) this.autoscroll.attach(scrollContainer);
        document.addEventListener("mousemove", this.boundMouseMove);
        document.addEventListener("mouseup", this.boundMouseUp);
      };
      el.addEventListener("mousedown", onMouseDown);
      el.style.cursor = "grab";
      el.setAttribute("data-draggable", item.type);
      return () => {
        el.removeEventListener("mousedown", onMouseDown);
        el.style.cursor = "";
        el.removeAttribute("data-draggable");
      };
    }
    setScrollContainer(el) {
      this.autoscroll.attach(el);
    }
    cancelDrag() {
      if (this.currentSession) {
        this.cleanupDrag(true);
      }
    }
    destroy() {
      this.cancelDrag();
      this.autoscroll.detach();
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("mouseup", this.boundMouseUp);
    }
    onMouseMove(e) {
      if (!this.currentSession) return;
      const session = this.currentSession;
      session.currentX = e.clientX;
      session.currentY = e.clientY;
      if (!session.isDragging) {
        const dx = Math.abs(e.clientX - session.startX);
        const dy = Math.abs(e.clientY - session.startY);
        if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
        session.isDragging = true;
        session.sourceEl.classList.add("pg-dragging");
        this.preview.create(this.previewOptions);
        this.autoscroll.start();
        this.eventBus.emit(GridEventType.DRAG_STARTED, { item: session.item });
      }
      this.preview.moveTo(e.clientX, e.clientY);
      this.autoscroll.onMouseMove(e.clientX, e.clientY);
      const hitTarget = this.findDropTarget(e.clientX, e.clientY, session.item);
      if (hitTarget !== session.currentTarget) {
        if (session.currentTarget) {
          session.currentTarget.el.classList.remove("pg-drop-over");
          session.currentTarget.onDragLeave?.(session.item);
        }
        session.currentTarget = hitTarget;
        if (hitTarget) {
          hitTarget.el.classList.add("pg-drop-over");
          hitTarget.onDragEnter?.(session.item);
        }
      }
      if (hitTarget) {
        session.position = this.calcDropPosition(e.clientY, hitTarget.el);
        this.updateDropIndicator(hitTarget.el, session.position);
      }
      this.eventBus.emit(GridEventType.DRAG_OVER, {
        item: session.item,
        targetId: hitTarget?.id ?? null,
        position: session.position
      });
    }
    onMouseUp(e) {
      if (!this.currentSession) return;
      const session = this.currentSession;
      if (session.isDragging && session.currentTarget && session.position) {
        session.currentTarget.onDrop?.(session.item, session.position);
        this.eventBus.emit(GridEventType.DRAG_STOPPED, {
          item: session.item,
          targetId: session.currentTarget.id,
          position: session.position,
          accepted: true
        });
      } else {
        this.eventBus.emit(GridEventType.DRAG_STOPPED, {
          item: session.item,
          targetId: null,
          position: null,
          accepted: false
        });
      }
      this.cleanupDrag(false);
    }
    cleanupDrag(cancelled) {
      if (!this.currentSession) return;
      const session = this.currentSession;
      session.sourceEl.classList.remove("pg-dragging");
      if (session.currentTarget) {
        session.currentTarget.el.classList.remove("pg-drop-over");
        this.clearDropIndicator(session.currentTarget.el);
      }
      this.preview.destroy();
      this.autoscroll.stop();
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("mouseup", this.boundMouseUp);
      this.currentSession = null;
    }
    findDropTarget(x, y, dragItem) {
      let best = null;
      for (const target of this.dropTargets.values()) {
        if (!target.acceptsTypes.includes(dragItem.type)) continue;
        if (target.id === dragItem.id) continue;
        const rect = target.el.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          best = target;
        }
      }
      return best;
    }
    calcDropPosition(mouseY, el) {
      const rect = el.getBoundingClientRect();
      const relY = mouseY - rect.top;
      const ratio = relY / rect.height;
      if (ratio < 0.25) return "before";
      if (ratio > 0.75) return "after";
      return "inside";
    }
    updateDropIndicator(el, position) {
      el.classList.remove("pg-drop-before", "pg-drop-after", "pg-drop-inside");
      el.classList.add(`pg-drop-${position}`);
    }
    clearDropIndicator(el) {
      el.classList.remove("pg-drop-before", "pg-drop-after", "pg-drop-inside");
    }
  };

  // src/cell-selection/selection-range.ts
  function normalizeRange(range) {
    return {
      startRowIndex: Math.min(range.startRowIndex, range.endRowIndex),
      endRowIndex: Math.max(range.startRowIndex, range.endRowIndex),
      startColIndex: Math.min(range.startColIndex, range.endColIndex),
      endColIndex: Math.max(range.startColIndex, range.endColIndex)
    };
  }
  function isCellInRanges(rowIndex, colIndex, ranges) {
    for (const range of ranges) {
      const n = normalizeRange(range);
      if (rowIndex >= n.startRowIndex && rowIndex <= n.endRowIndex && colIndex >= n.startColIndex && colIndex <= n.endColIndex) {
        return true;
      }
    }
    return false;
  }

  // src/cell-selection/cell-selection-engine.ts
  var CellSelectionEngine = class {
    constructor(store, eventBus, clipboardEngine, undoRedoEngine) {
      this.store = store;
      this.eventBus = eventBus;
      this.clipboardEngine = clipboardEngine;
      this.undoRedoEngine = undoRedoEngine;
      this._isSelecting = false;
      this.anchorCell = null;
      this.bodyPanels = [];
      this.contextMenuEl = null;
      this.chartOpenCallback = null;
      /**
       * Optional callback invoked when the user presses Enter on a focused (non-editing) cell.
       * Return `true` to absorb the event (editing started); `false` to fall through to
       * the default down-navigation behavior.
       */
      this.enterEditHandler = null;
      /**
       * Optional callback invoked after every active-cell change so the grid body
       * can scroll the newly active cell into view (AG Grid-style auto-scroll).
       */
      this.scrollToCellCallback = null;
      /**
       * Returns the number of rows that fit in the visible body viewport.
       * Used by PageUp / PageDown to determine how far to jump.
       */
      this.getViewportRowCountCallback = null;
      /**
       * Optional callback invoked after a data mutation (fill, cut, paste, undo/redo).
       * When `nodeIds` is provided the renderer evicts only those rows from its cache
       * so custom cell renderers in untouched rows are NOT re-executed.
       * Omitting `nodeIds` falls back to a full cache clear (safe but unoptimised).
       */
      this.dataChangedCallback = null;
      // ─── Fill handle state ────────────────────────────────────────────────────
      /** DOM element for the interactive fill handle corner square. */
      this.fillHandleEl = null;
      /** The `.pg-cell` element that currently hosts the fill handle as a child. */
      this.fillHandleParentCell = null;
      /** `true` while the user is dragging the fill handle. */
      this.isFillDragging = false;
      /** Normalised source range captured at the start of a fill drag. */
      this.fillSourceRange = null;
      /** DOM cells currently showing the dashed fill-preview overlay. */
      this.fillPreviewCells = [];
      /** Locked fill direction; null until the user moves far enough in one axis. */
      this.fillDirection = null;
      /** Target row index for up/down fills; null when direction is horizontal. */
      this.fillTargetRow = null;
      /** Target column index for left/right fills; null when direction is vertical. */
      this.fillTargetCol = null;
      /** Callback invoked on every fill-drag mousemove to drive the edge auto-scroller. */
      this.fillDragScrollCallback = null;
      /** Callback invoked when the fill drag ends to stop the edge auto-scroller. */
      this.fillDragEndCallback = null;
      /**
       * Returns the bounding rect of the grid's scroll viewport.  Used by
       * `processFillPosition` to clamp the hit-test coordinates when the cursor
       * has moved outside the body area so edge cells are always reachable.
       */
      this.dragViewportRectFn = null;
      this.boundKeydown = this.onKeydown.bind(this);
      this.boundHideCtx = () => this.hideContextMenu();
      this.boundFillMouseMove = this.onFillMouseMove.bind(this);
      this.boundFillMouseUp = this.onFillMouseUp.bind(this);
    }
    get isSelecting() {
      return this._isSelecting;
    }
    attach(containerEl) {
      void containerEl;
      document.addEventListener("keydown", this.boundKeydown);
      this.buildContextMenu();
    }
    setBodyPanels(panels) {
      this.bodyPanels = panels.filter(Boolean);
    }
    /**
     * Register a callback that is invoked when the user presses Enter on a focused
     * cell that is not in edit mode.  Return `true` to absorb the event (editing
     * started); return `false` to fall through to the default down-navigation.
     */
    setEnterEditHandler(fn) {
      this.enterEditHandler = fn;
    }
    /**
     * Register a callback invoked after every active-cell change so the grid body
     * can scroll the newly active cell into view (AG Grid-style auto-scroll).
     * The renderer wires this in `buildLayout`.
     *
     * @param fn - Called with the new `rowIndex` and `colIndex` after each navigation.
     */
    setScrollToCellCallback(fn) {
      this.scrollToCellCallback = fn;
    }
    /**
     * Registers a callback that returns the number of data rows currently
     * visible in the body viewport.  Used by PageUp / PageDown to compute the
     * jump distance.  Wired by `GridRenderer` via the scroll controller.
     *
     * @param fn - Returns the visible row count (≥ 1).
     */
    setGetViewportRowCountCallback(fn) {
      this.getViewportRowCountCallback = fn;
    }
    /**
     * Register a callback invoked after a data mutation (fill, cut, paste, undo/redo).
     * Pass `nodeIds` to evict only the mutated rows from the renderer cache;
     * omit to fall back to a full cache clear.
     *
     * @param fn - Called with an optional set of mutated row node IDs.
     */
    setDataChangedCallback(fn) {
      this.dataChangedCallback = fn;
    }
    /**
     * Registers a callback invoked on every fill-drag `mousemove` with the
     * current cursor coordinates.  Wire this to `AutoScroller.updateMouse` in
     * the grid renderer to enable edge auto-scrolling during fill-handle drags.
     *
     * @param fn - Called with `clientX` and `clientY` of each mousemove event.
     */
    setFillDragScrollCallback(fn) {
      this.fillDragScrollCallback = fn;
    }
    /**
     * Registers a callback invoked when the fill drag ends (mouseup).
     * Wire this to `AutoScroller.stop` in the grid renderer so the RAF loop
     * terminates as soon as the user releases the fill handle.
     *
     * @param fn - Called with no arguments when the fill drag terminates.
     */
    setFillDragEndCallback(fn) {
      this.fillDragEndCallback = fn;
    }
    /**
     * Registers a callback that returns the bounding rect of the grid's scroll
     * viewport (`bodyWrapEl`).  When set, `processFillPosition` clamps its
     * hit-test coordinates to just inside this rect so edge cells are always
     * found even when the cursor has moved outside the grid boundary.
     *
     * @param fn - Returns the current viewport `DOMRect`, or `null` when unmounted.
     */
    setDragViewportRectCallback(fn) {
      this.dragViewportRectFn = fn;
    }
    /**
     * Re-evaluates which cell lies at `(clientX, clientY)` and updates the fill
     * direction and dashed preview accordingly.  Called by the auto-scroller's
     * `onScrolled` callback so the preview stays current after the grid has
     * scrolled under a stationary cursor.
     *
     * No-op when no fill drag is currently active.
     *
     * @param clientX - Viewport X coordinate of the drag cursor.
     * @param clientY - Viewport Y coordinate of the drag cursor.
     */
    updateFillPosition(clientX, clientY) {
      this.processFillPosition(clientX, clientY);
    }
    detach() {
      document.removeEventListener("keydown", this.boundKeydown);
      document.removeEventListener("mousemove", this.boundFillMouseMove);
      document.removeEventListener("mouseup", this.boundFillMouseUp);
      this.fillHandleParentCell?.classList.remove("pg-cell--has-fill-handle");
      this.fillHandleParentCell = null;
      this.fillHandleEl?.remove();
      this.fillHandleEl = null;
      this.fillDragScrollCallback = null;
      this.fillDragEndCallback = null;
      this.dragViewportRectFn = null;
      this.contextMenuEl?.remove();
      this.contextMenuEl = null;
    }
    // ─── Selection API ────────────────────────────────────────────────────────
    startSelection(rowIndex, colIndex, extend = false) {
      if (!extend) {
        this.anchorCell = { rowIndex, colIndex };
        this.store.set("cellRanges", [{
          startRowIndex: rowIndex,
          endRowIndex: rowIndex,
          startColIndex: colIndex,
          endColIndex: colIndex
        }]);
      }
      this._isSelecting = true;
      this.store.set("activeCell", { rowIndex, colIndex });
      this.emitSelectionChanged();
      this.scrollToCellCallback?.(rowIndex, colIndex);
    }
    extendSelection(rowIndex, colIndex) {
      if (!this.anchorCell) {
        this.startSelection(rowIndex, colIndex);
        return;
      }
      this.store.set("cellRanges", [{
        startRowIndex: this.anchorCell.rowIndex,
        endRowIndex: rowIndex,
        startColIndex: this.anchorCell.colIndex,
        endColIndex: colIndex
      }]);
      this.store.set("activeCell", { rowIndex, colIndex });
      this.emitSelectionChanged();
      this.scrollToCellCallback?.(rowIndex, colIndex);
    }
    endSelection() {
      this._isSelecting = false;
    }
    clearSelection() {
      this.anchorCell = null;
      this._isSelecting = false;
      this.store.set("cellRanges", []);
      this.store.set("activeCell", null);
      this.applySelectionClasses();
      this.emitSelectionChanged();
    }
    isCellSelected(rowIndex, colIndex) {
      return isCellInRanges(rowIndex, colIndex, this.store.get("cellRanges"));
    }
    /**
     * Adds the given cell as a new independent 1×1 range to the selection
     * (Ctrl+Click multi-range).  If the cell is already the sole member of a
     * 1×1 range it is deselected instead (toggle behaviour matching AG Grid).
     *
     * @param rowIndex - Row index of the clicked cell.
     * @param colIndex - Column index of the clicked cell.
     */
    addRangeCell(rowIndex, colIndex) {
      const existing = this.store.get("cellRanges");
      const dupeIdx = existing.findIndex(
        (r) => r.startRowIndex === rowIndex && r.endRowIndex === rowIndex && r.startColIndex === colIndex && r.endColIndex === colIndex
      );
      const ranges = dupeIdx >= 0 ? existing.filter((_, i) => i !== dupeIdx) : [...existing, {
        startRowIndex: rowIndex,
        endRowIndex: rowIndex,
        startColIndex: colIndex,
        endColIndex: colIndex
      }];
      this.anchorCell = { rowIndex, colIndex };
      this.store.set("cellRanges", ranges);
      this.store.set("activeCell", ranges.length > 0 ? { rowIndex, colIndex } : null);
      this.applySelectionClasses();
      this.emitSelectionChanged();
    }
    // ─── CSS-based rendering (replaces canvas) ────────────────────────────────
    /**
     * Applies selection CSS classes to every visible cell DOM element.
     *
     * For multi-range selections (Ctrl+Click) edge classes are unioned across
     * all ranges a cell belongs to, so each range always renders a complete
     * closed border regardless of how many ranges share a cell.
     *
     * After updating classes, repositions the fill handle at the primary
     * range's bottom-right corner.
     */
    applySelectionClasses() {
      const ranges = this.store.get("cellRanges");
      const activeCell = this.store.get("activeCell");
      const hasRanges = ranges.length > 0;
      const norms = hasRanges ? ranges.map(normalizeRange) : [];
      for (const panel of this.bodyPanels) {
        for (const el of panel.querySelectorAll(".pg-cell[data-row-index][data-col-index]")) {
          const ri = Number(el.getAttribute("data-row-index"));
          const ci = Number(el.getAttribute("data-col-index"));
          const inRange = hasRanges && isCellInRanges(ri, ci, ranges);
          const isActive = !!activeCell && activeCell.rowIndex === ri && activeCell.colIndex === ci;
          el.classList.toggle("pg-cell--in-selection", inRange);
          el.classList.toggle("pg-cell--active-cell", isActive);
          if (inRange) {
            let isTop = false, isBottom = false, isLeft = false, isRight = false;
            for (const n of norms) {
              if (ri >= n.startRowIndex && ri <= n.endRowIndex && ci >= n.startColIndex && ci <= n.endColIndex) {
                if (ri === n.startRowIndex) isTop = true;
                if (ri === n.endRowIndex) isBottom = true;
                if (ci === n.startColIndex) isLeft = true;
                if (ci === n.endColIndex) isRight = true;
              }
            }
            el.classList.toggle("pg-cell--sel-top", isTop);
            el.classList.toggle("pg-cell--sel-bottom", isBottom);
            el.classList.toggle("pg-cell--sel-left", isLeft);
            el.classList.toggle("pg-cell--sel-right", isRight);
          } else {
            el.classList.remove(
              "pg-cell--sel-top",
              "pg-cell--sel-bottom",
              "pg-cell--sel-left",
              "pg-cell--sel-right"
            );
          }
        }
      }
      this.updateFillHandle();
    }
    /** @deprecated Use `applySelectionClasses` directly. Kept for caller compatibility. */
    renderSelection(_getCellRect) {
      this.applySelectionClasses();
    }
    // ─── Fill handle ──────────────────────────────────────────────────────────
    /**
     * Creates (once) or repositions the fill handle at the bottom-right corner
     * of the primary selection range.  Hidden during an active fill drag or when
     * there are multiple ranges (Ctrl+Click mode).
     *
     * The element uses `position: fixed` so it always sits above the grid
     * regardless of overflow or scroll state.
     */
    updateFillHandle() {
      if (this.isFillDragging) return;
      const ranges = this.store.get("cellRanges");
      if (ranges.length !== 1) {
        this.hideFillHandle();
        return;
      }
      const n = normalizeRange(ranges[0]);
      let cornerCell = null;
      for (const panel of this.bodyPanels) {
        const el = panel.querySelector(
          `[data-row-index="${n.endRowIndex}"][data-col-index="${n.endColIndex}"]`
        );
        if (el) {
          cornerCell = el;
          break;
        }
      }
      if (!cornerCell) {
        this.hideFillHandle();
        return;
      }
      if (!this.fillHandleEl) {
        const handle = document.createElement("div");
        handle.className = "pg-fill-handle";
        handle.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.startFillDrag();
        });
        this.fillHandleEl = handle;
      }
      if (this.fillHandleParentCell !== cornerCell) {
        this.fillHandleParentCell?.classList.remove("pg-cell--has-fill-handle");
        this.fillHandleParentCell = cornerCell;
        cornerCell.classList.add("pg-cell--has-fill-handle");
        cornerCell.appendChild(this.fillHandleEl);
      }
      this.fillHandleEl.style.display = "";
    }
    /** Hides the fill handle and clears the overflow-visible class from its host cell. */
    hideFillHandle() {
      if (this.fillHandleEl) this.fillHandleEl.style.display = "none";
      this.fillHandleParentCell?.classList.remove("pg-cell--has-fill-handle");
      this.fillHandleParentCell = null;
    }
    /**
     * Begins a fill-handle drag operation.  Captures the current selection as
     * the fill source and attaches document-level mouse event listeners.
     */
    startFillDrag() {
      const ranges = this.store.get("cellRanges");
      if (!ranges.length) return;
      this.fillSourceRange = normalizeRange(ranges[0]);
      this.isFillDragging = true;
      this.fillDirection = null;
      this.fillTargetRow = null;
      this.fillTargetCol = null;
      document.addEventListener("mousemove", this.boundFillMouseMove);
      document.addEventListener("mouseup", this.boundFillMouseUp);
    }
    /**
     * Handles fill-drag `mousemove` by delegating position processing and
     * notifying the auto-scroller callback so edge scrolling can be triggered.
     */
    onFillMouseMove(e) {
      if (!this.isFillDragging || !this.fillSourceRange) return;
      this.processFillPosition(e.clientX, e.clientY);
      this.fillDragScrollCallback?.(e.clientX, e.clientY);
    }
    /**
     * Core fill-drag position logic: resolves the fill direction and target
     * cell from a viewport coordinate pair, then refreshes the dashed preview.
     *
     * Separated from `onFillMouseMove` so it can also be called by the
     * auto-scroller's `onScrolled` callback — keeping the preview accurate
     * after the grid has scrolled under a stationary cursor.
     *
     * @param clientX - Viewport X coordinate of the drag cursor.
     * @param clientY - Viewport Y coordinate of the drag cursor.
     */
    processFillPosition(clientX, clientY) {
      if (!this.isFillDragging || !this.fillSourceRange) return;
      let target = document.elementFromPoint(clientX, clientY);
      let cellEl = target?.closest("[data-row-index][data-col-index]");
      if (!cellEl) {
        const vr = this.dragViewportRectFn?.();
        if (vr) {
          const cx2 = Math.max(vr.left + 1, Math.min(vr.right - 1, clientX));
          const cy2 = Math.max(vr.top + 1, Math.min(vr.bottom - 1, clientY));
          const t2 = document.elementFromPoint(cx2, cy2);
          cellEl = t2?.closest("[data-row-index][data-col-index]");
        }
      }
      if (!cellEl) return;
      const ri = Number(cellEl.getAttribute("data-row-index"));
      const ci = Number(cellEl.getAttribute("data-col-index"));
      if (isNaN(ri) || isNaN(ci)) return;
      const src = this.fillSourceRange;
      const dRow = ri < src.startRowIndex ? ri - src.startRowIndex : ri > src.endRowIndex ? ri - src.endRowIndex : 0;
      const dCol = ci < src.startColIndex ? ci - src.startColIndex : ci > src.endColIndex ? ci - src.endColIndex : 0;
      if (Math.abs(dRow) >= Math.abs(dCol)) {
        this.fillDirection = dRow >= 0 ? "down" : "up";
        this.fillTargetRow = ri;
        this.fillTargetCol = null;
      } else {
        this.fillDirection = dCol >= 0 ? "right" : "left";
        this.fillTargetRow = null;
        this.fillTargetCol = ci;
      }
      this.updateFillPreview();
    }
    /**
     * Applies `pg-cell--fill-preview` and its directional edge classes to
     * cells in the fill target area, replacing any previous preview.
     */
    updateFillPreview() {
      for (const el of this.fillPreviewCells) {
        el.classList.remove(
          "pg-cell--fill-preview",
          "pg-cell--fp-top",
          "pg-cell--fp-bottom",
          "pg-cell--fp-left",
          "pg-cell--fp-right"
        );
      }
      this.fillPreviewCells = [];
      if (!this.fillSourceRange || !this.fillDirection) return;
      const src = this.fillSourceRange;
      let startRow, endRow, startCol, endCol;
      switch (this.fillDirection) {
        case "down":
          if (this.fillTargetRow === null || this.fillTargetRow <= src.endRowIndex) return;
          startRow = src.endRowIndex + 1;
          endRow = this.fillTargetRow;
          startCol = src.startColIndex;
          endCol = src.endColIndex;
          break;
        case "up":
          if (this.fillTargetRow === null || this.fillTargetRow >= src.startRowIndex) return;
          startRow = this.fillTargetRow;
          endRow = src.startRowIndex - 1;
          startCol = src.startColIndex;
          endCol = src.endColIndex;
          break;
        case "right":
          if (this.fillTargetCol === null || this.fillTargetCol <= src.endColIndex) return;
          startRow = src.startRowIndex;
          endRow = src.endRowIndex;
          startCol = src.endColIndex + 1;
          endCol = this.fillTargetCol;
          break;
        case "left":
          if (this.fillTargetCol === null || this.fillTargetCol >= src.startColIndex) return;
          startRow = src.startRowIndex;
          endRow = src.endRowIndex;
          startCol = this.fillTargetCol;
          endCol = src.startColIndex - 1;
          break;
        default:
          return;
      }
      for (const panel of this.bodyPanels) {
        for (const el of panel.querySelectorAll(".pg-cell[data-row-index][data-col-index]")) {
          const ri = Number(el.getAttribute("data-row-index"));
          const ci = Number(el.getAttribute("data-col-index"));
          if (ri >= startRow && ri <= endRow && ci >= startCol && ci <= endCol) {
            el.classList.add("pg-cell--fill-preview");
            if (ri === startRow) el.classList.add("pg-cell--fp-top");
            if (ri === endRow) el.classList.add("pg-cell--fp-bottom");
            if (ci === startCol) el.classList.add("pg-cell--fp-left");
            if (ci === endCol) el.classList.add("pg-cell--fp-right");
            this.fillPreviewCells.push(el);
          }
        }
      }
    }
    /**
     * Finalises the fill drag: applies data, clears preview classes, and
     * restores the fill handle to its resting position.
     */
    onFillMouseUp() {
      document.removeEventListener("mousemove", this.boundFillMouseMove);
      document.removeEventListener("mouseup", this.boundFillMouseUp);
      this.fillDragEndCallback?.();
      if (this.fillSourceRange && this.fillDirection) {
        this.applyFill();
      }
      for (const el of this.fillPreviewCells) {
        el.classList.remove(
          "pg-cell--fill-preview",
          "pg-cell--fp-top",
          "pg-cell--fp-bottom",
          "pg-cell--fp-left",
          "pg-cell--fp-right"
        );
      }
      this.fillPreviewCells = [];
      this.isFillDragging = false;
      this.fillSourceRange = null;
      this.fillDirection = null;
      this.fillTargetRow = null;
      this.fillTargetCol = null;
      this.applySelectionClasses();
    }
    /**
     * Copies source cell values into the fill target area.
     *
     * Cycling semantics:
     * - Vertical fill: each column in the fill area copies from the same
     *   column in the source range, cycling rows (`srcH` modulo).
     * - Horizontal fill: each row copies from the same row in the source
     *   range, cycling columns (`srcW` modulo).
     *
     * The operation is recorded in the undo/redo engine and triggers an
     * immediate renderer refresh via `dataChangedCallback`.
     */
    applyFill() {
      if (!this.fillSourceRange || !this.fillDirection) return;
      const src = this.fillSourceRange;
      const srcH = src.endRowIndex - src.startRowIndex + 1;
      const srcW = src.endColIndex - src.startColIndex + 1;
      let fillStartRow, fillEndRow, fillStartCol, fillEndCol;
      switch (this.fillDirection) {
        case "down":
          if (this.fillTargetRow === null || this.fillTargetRow <= src.endRowIndex) return;
          fillStartRow = src.endRowIndex + 1;
          fillEndRow = this.fillTargetRow;
          fillStartCol = src.startColIndex;
          fillEndCol = src.endColIndex;
          break;
        case "up":
          if (this.fillTargetRow === null || this.fillTargetRow >= src.startRowIndex) return;
          fillStartRow = this.fillTargetRow;
          fillEndRow = src.startRowIndex - 1;
          fillStartCol = src.startColIndex;
          fillEndCol = src.endColIndex;
          break;
        case "right":
          if (this.fillTargetCol === null || this.fillTargetCol <= src.endColIndex) return;
          fillStartRow = src.startRowIndex;
          fillEndRow = src.endRowIndex;
          fillStartCol = src.endColIndex + 1;
          fillEndCol = this.fillTargetCol;
          break;
        case "left":
          if (this.fillTargetCol === null || this.fillTargetCol >= src.startColIndex) return;
          fillStartRow = src.startRowIndex;
          fillEndRow = src.endRowIndex;
          fillStartCol = this.fillTargetCol;
          fillEndCol = src.startColIndex - 1;
          break;
        default:
          return;
      }
      if (fillStartRow > fillEndRow || fillStartCol > fillEndCol) return;
      const visRows = this.store.get("visibleRows");
      const columns = this.getVisibleColumns();
      const changes = [];
      for (let r = fillStartRow; r <= fillEndRow; r++) {
        const row = visRows[r];
        if (!row || row.type !== "data") continue;
        for (let c = fillStartCol; c <= fillEndCol; c++) {
          const col = columns[c];
          if (!col) continue;
          let srcR, srcC;
          const dir = this.fillDirection;
          if (dir === "down") {
            srcR = src.startRowIndex + (r - fillStartRow) % srcH;
            srcC = c;
          } else if (dir === "up") {
            srcR = src.endRowIndex - (fillEndRow - r) % srcH;
            srcC = c;
          } else if (dir === "right") {
            srcR = r;
            srcC = src.startColIndex + (c - fillStartCol) % srcW;
          } else {
            srcR = r;
            srcC = src.endColIndex - (fillEndCol - c) % srcW;
          }
          const srcRow = visRows[srcR];
          if (!srcRow || srcRow.type !== "data") continue;
          const srcCol = columns[srcC];
          if (!srcCol) continue;
          const rawValue = srcRow.data[srcCol.field];
          const srcType = srcCol.type ?? "string";
          const dstType = col.type ?? "string";
          const newValue = srcType !== dstType ? this.coerceToColumnType(rawValue, dstType) : rawValue;
          const oldValue = row.data[col.field];
          if (!Object.is(oldValue, newValue)) {
            changes.push({ nodeId: row.nodeId, field: col.field, oldValue, newValue });
            row.data[col.field] = newValue;
          }
        }
      }
      if (changes.length > 0) {
        this.undoRedoEngine?.record({ type: "paste", changes });
        this.store.set("allRows", [...this.store.get("allRows")]);
        this.dataChangedCallback?.(new Set(changes.map((c) => c.nodeId)));
        const newRange = {
          startRowIndex: Math.min(src.startRowIndex, fillStartRow),
          endRowIndex: Math.max(src.endRowIndex, fillEndRow),
          startColIndex: Math.min(src.startColIndex, fillStartCol),
          endColIndex: Math.max(src.endColIndex, fillEndCol)
        };
        this.anchorCell = { rowIndex: newRange.startRowIndex, colIndex: newRange.startColIndex };
        this.store.set("cellRanges", [newRange]);
        this.store.set("activeCell", { rowIndex: newRange.startRowIndex, colIndex: newRange.startColIndex });
        this.emitSelectionChanged();
        const fsr = fillStartRow, fer = fillEndRow, fsc = fillStartCol, fec = fillEndCol;
        setTimeout(() => this.flashFillArea(fsr, fer, fsc, fec), 0);
      }
    }
    /**
     * Flashes the cells in the filled area with a success colour overlay,
     * giving clear visual feedback that the fill operation succeeded.
     *
     * Uses `::before` so it never conflicts with the selection `::after` border.
     *
     * @param startRow - First row of the fill target area.
     * @param endRow   - Last row of the fill target area.
     * @param startCol - First column of the fill target area.
     * @param endCol   - Last column of the fill target area.
     */
    /**
     * Applies a flash animation to all visible cells within the given row/column
     * bounding box.
     *
     * @param startRow   - First row index (inclusive).
     * @param endRow     - Last row index (inclusive).
     * @param startCol   - First column index (inclusive, ≥ 0).
     * @param endCol     - Last column index (inclusive).
     * @param flashClass - CSS class that carries the animation keyframe.
     *                     Defaults to `'pg-cell--fill-flash'` (green success).
     *                     Pass `'pg-cell--cut-flash'` for the red danger flash.
     */
    flashFillArea(startRow, endRow, startCol, endCol, flashClass = "pg-cell--fill-flash") {
      const cells = [];
      for (const panel of this.bodyPanels) {
        for (const el of panel.querySelectorAll(".pg-cell[data-row-index][data-col-index]")) {
          const ri = Number(el.getAttribute("data-row-index"));
          const ci = Number(el.getAttribute("data-col-index"));
          if (ri >= startRow && ri <= endRow && ci >= startCol && ci <= endCol) {
            cells.push(el);
          }
        }
      }
      for (const el of cells) {
        el.classList.remove("pg-cell--fill-flash", "pg-cell--cut-flash");
        void el.offsetWidth;
        el.classList.add(flashClass);
      }
      setTimeout(() => {
        for (const el of cells) el.classList.remove(flashClass);
      }, 700);
    }
    // ─── Navigation ──────────────────────────────────────────────────────────
    moveActiveCell(dRow, dCol, rowCount, colCount, extend = false) {
      const active = this.store.get("activeCell");
      if (!active) return;
      const newRow = Math.max(0, Math.min(rowCount - 1, active.rowIndex + dRow));
      const newCol = Math.max(0, Math.min(colCount - 1, active.colIndex + dCol));
      if (extend) this.extendSelection(newRow, newCol);
      else this.startSelection(newRow, newCol);
    }
    jumpToEdge(direction, rowCount, colCount, extend = false) {
      const active = this.store.get("activeCell");
      if (!active) return;
      let newRow = active.rowIndex;
      let newCol = active.colIndex;
      switch (direction) {
        case "up":
          newRow = 0;
          break;
        case "down":
          newRow = rowCount - 1;
          break;
        case "left":
          newCol = 0;
          break;
        case "right":
          newCol = colCount - 1;
          break;
      }
      if (extend) this.extendSelection(newRow, newCol);
      else this.startSelection(newRow, newCol);
    }
    setChartOpenCallback(fn) {
      this.chartOpenCallback = fn;
    }
    // ─── Clipboard ───────────────────────────────────────────────────────────
    async copySelection(rows, columns) {
      this.flashSelection("copy");
      return this.clipboardEngine.copyRangesToClipboard(
        this.store.get("cellRanges"),
        rows,
        columns,
        false,
        this.getLeafGroupField()
      );
    }
    async copySelectionWithHeaders(rows, columns) {
      this.flashSelection("copy");
      return this.clipboardEngine.copyRangesToClipboard(
        this.store.get("cellRanges"),
        rows,
        columns,
        true,
        this.getLeafGroupField()
      );
    }
    async cutSelection(rows, columns) {
      const ranges = this.store.get("cellRanges");
      const leafGroupField = this.getLeafGroupField();
      await this.clipboardEngine.copyRangesToClipboard(ranges, rows, columns, false, leafGroupField);
      const changes = [];
      for (const range of ranges) {
        const n = normalizeRange(range);
        const hasGroupLabel = n.startColIndex < 0;
        for (let r = n.startRowIndex; r <= n.endRowIndex; r++) {
          const row = rows[r];
          if (!row || row.type !== "data") continue;
          if (hasGroupLabel && leafGroupField) {
            const oldVal = row.data[leafGroupField];
            changes.push({ nodeId: row.nodeId, field: leafGroupField, oldValue: oldVal, newValue: null });
            row.data[leafGroupField] = null;
          }
          const dataStart = hasGroupLabel ? 0 : n.startColIndex;
          for (let c = dataStart; c <= n.endColIndex; c++) {
            const col = columns[c];
            if (!col) continue;
            const oldVal = row.data[col.field];
            changes.push({ nodeId: row.nodeId, field: col.field, oldValue: oldVal, newValue: null });
            row.data[col.field] = null;
          }
        }
      }
      this.undoRedoEngine?.record({ type: "cut", changes });
      this.clearCutCellsInDom(ranges);
      this.store.set("allRows", [...this.store.get("allRows")]);
      const cutNodeIds = new Set(changes.map((c) => c.nodeId));
      this.dataChangedCallback?.(cutNodeIds);
      let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
      for (const range of ranges) {
        const n = normalizeRange(range);
        if (n.startRowIndex < minRow) minRow = n.startRowIndex;
        if (n.endRowIndex > maxRow) maxRow = n.endRowIndex;
        if (n.startColIndex < minCol) minCol = n.startColIndex;
        if (n.endColIndex > maxCol) maxCol = n.endColIndex;
      }
      if (minRow !== Infinity) {
        const fsr = minRow, fer = maxRow, fsc = Math.max(0, minCol), fec = maxCol;
        requestAnimationFrame(() => requestAnimationFrame(() => this.flashFillArea(fsr, fer, fsc, fec, "pg-cell--cut-flash")));
      }
    }
    async pasteSelection(rows, columns) {
      const activeCell = this.store.get("activeCell");
      if (!activeCell) return;
      const clipData = await this.clipboardEngine.pasteFromClipboard();
      if (!clipData.length) return;
      const startRow = activeCell.rowIndex;
      const startCol = activeCell.colIndex;
      const leafGroupField = this.getLeafGroupField();
      const hasGroupLabel = startCol < 0 && !!leafGroupField;
      const changes = [];
      let actualEndRow = startRow;
      let maxClipCols = 0;
      let pastedRows = 0;
      for (let ri = startRow; pastedRows < clipData.length && ri < rows.length; ri++) {
        const row = rows[ri];
        if (!row || row.type !== "data") continue;
        const clipRow = clipData[pastedRows++];
        actualEndRow = ri;
        if (clipRow.length > maxClipCols) maxClipCols = clipRow.length;
        for (let ci = 0; ci < clipRow.length; ci++) {
          const colIdx = startCol + ci;
          if (hasGroupLabel && colIdx < 0) {
            const field = leafGroupField;
            changes.push({ nodeId: row.nodeId, field, oldValue: row.data[field], newValue: clipRow[ci] });
            row.data[field] = clipRow[ci];
          } else {
            const col = columns[colIdx];
            if (col) {
              const coerced = this.coerceToColumnType(clipRow[ci], col.type ?? "string");
              changes.push({ nodeId: row.nodeId, field: col.field, oldValue: row.data[col.field], newValue: coerced });
              row.data[col.field] = coerced;
            }
          }
        }
      }
      this.undoRedoEngine?.record({ type: "paste", changes });
      this.store.set("allRows", [...this.store.get("allRows")]);
      this.dataChangedCallback?.(new Set(changes.map((c) => c.nodeId)));
      if (changes.length > 0 && maxClipCols > 0) {
        const flashStartCol = hasGroupLabel ? 0 : Math.max(0, startCol);
        const flashEndCol = hasGroupLabel ? maxClipCols - 2 : startCol + maxClipCols - 1;
        if (flashEndCol >= flashStartCol) {
          const fsr = startRow, fer = actualEndRow, fsc = flashStartCol, fec = flashEndCol;
          requestAnimationFrame(() => requestAnimationFrame(() => this.flashFillArea(fsr, fer, fsc, fec)));
        }
      }
    }
    // ─── Undo / Redo ─────────────────────────────────────────────────────────
    /**
     * Reverts the most recent recorded action (edit / cut / paste) by applying
     * the inverse cell changes and triggering a re-render.
     * No-op when the undo stack is empty or no engine is wired up.
     */
    performUndo() {
      const changes = this.undoRedoEngine?.undo();
      if (changes) this.applyUndoRedoChanges(changes);
    }
    /**
     * Re-applies the most recently undone action and triggers a re-render.
     * No-op when the redo stack is empty or no engine is wired up.
     */
    performRedo() {
      const changes = this.undoRedoEngine?.redo();
      if (changes) this.applyUndoRedoChanges(changes);
    }
    /**
     * Writes the given cell changes into `allRows`, triggers a renderer refresh,
     * scrolls the first affected cell into view, and flashes the affected region.
     *
     * Used by both `performUndo` and `performRedo`.
     *
     * A `Map<nodeId, RowNode>` is built once before the change loop so each row
     * lookup is O(1) instead of O(n) — important for large paste undo operations.
     *
     * @param changes - Ordered list of `{ nodeId, field, newValue }` to apply.
     */
    applyUndoRedoChanges(changes) {
      const allRows = this.store.get("allRows");
      const nodeMap = /* @__PURE__ */ new Map();
      for (const row of allRows) nodeMap.set(row.nodeId, row);
      for (const change of changes) {
        const row = nodeMap.get(change.nodeId);
        if (row) row.data[change.field] = change.newValue;
      }
      this.store.set("allRows", [...allRows]);
      this.dataChangedCallback?.(new Set(changes.map((c) => c.nodeId)));
      if (changes.length === 0) return;
      const visibleRows = this.store.get("visibleRows");
      const columns = this.getVisibleColumns();
      const nodeIdToRowIndex = /* @__PURE__ */ new Map();
      for (let i = 0; i < visibleRows.length; i++) nodeIdToRowIndex.set(visibleRows[i].nodeId, i);
      const fieldToColIndex = /* @__PURE__ */ new Map();
      for (let i = 0; i < columns.length; i++) fieldToColIndex.set(columns[i].field, i);
      let minRow = Infinity, maxRow = -Infinity;
      let minCol = Infinity, maxCol = -Infinity;
      for (const change of changes) {
        const ri = nodeIdToRowIndex.get(change.nodeId);
        const ci = fieldToColIndex.get(change.field);
        if (ri !== void 0) {
          if (ri < minRow) minRow = ri;
          if (ri > maxRow) maxRow = ri;
        }
        if (ci !== void 0) {
          if (ci < minCol) minCol = ci;
          if (ci > maxCol) maxCol = ci;
        }
      }
      if (minRow === Infinity) return;
      const effectiveMinCol = minCol !== Infinity ? minCol : 0;
      const effectiveMaxCol = maxCol !== Infinity ? maxCol : 0;
      const newRange = {
        startRowIndex: minRow,
        endRowIndex: maxRow,
        startColIndex: effectiveMinCol,
        endColIndex: effectiveMaxCol
      };
      this.anchorCell = { rowIndex: minRow, colIndex: effectiveMinCol };
      this.store.set("cellRanges", [newRange]);
      this.store.set("activeCell", { rowIndex: minRow, colIndex: effectiveMinCol });
      this.emitSelectionChanged();
      this.scrollToCellCallback?.(minRow, effectiveMinCol);
      const fsr = minRow, fer = maxRow;
      const fsc = Math.max(0, effectiveMinCol), fec = Math.max(0, effectiveMaxCol);
      requestAnimationFrame(() => requestAnimationFrame(() => this.flashFillArea(fsr, fer, fsc, fec)));
    }
    // ─── Grouping helpers ─────────────────────────────────────────────────────
    /**
     * Returns the `field` name of the innermost (deepest) grouping column, or
     * `undefined` when no grouping is active.
     *
     * Reads from the store's full column list (including hidden columns) rather
     * than the visible-columns slice passed to copy/cut/paste methods — the
     * grouped column is often hidden from the regular column display (visible: false)
     * but the leaf group cell must still be able to copy its value.
     */
    getLeafGroupField() {
      const groupedIds = this.store.get("groupedColumnIds");
      if (groupedIds.length === 0) return void 0;
      const leafColId = groupedIds[groupedIds.length - 1];
      const allCols = this.store.get("columns");
      return allCols.find((c) => c.colId === leafColId)?.field;
    }
    // ─── Context menu ─────────────────────────────────────────────────────────
    showContextMenu(x, y) {
      if (!this.contextMenuEl) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const mw = 200, mh = 300;
      const left = x + mw > vw ? vw - mw - 4 : x;
      const top = y + mh > vh ? vh - mh - 4 : y;
      this.contextMenuEl.style.left = `${left}px`;
      this.contextMenuEl.style.top = `${top}px`;
      this.contextMenuEl.classList.add("pg-context-menu--visible");
      requestAnimationFrame(() => {
        document.addEventListener("mousedown", this.boundHideCtx, { once: true });
      });
    }
    hideContextMenu() {
      this.contextMenuEl?.classList.remove("pg-context-menu--visible");
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    flashSelection(type) {
      const cls = type === "copy" ? "pg-cell--copy-flash" : "pg-cell--cut-flash";
      const cells = [];
      for (const panel of this.bodyPanels) {
        for (const el of panel.querySelectorAll(".pg-cell--in-selection, .pg-cell--active-cell")) {
          cells.push(el);
        }
      }
      for (const el of cells) {
        el.classList.remove("pg-cell--copy-flash", "pg-cell--cut-flash");
        void el.offsetWidth;
        el.classList.add(cls);
      }
      setTimeout(() => {
        for (const el of cells) el.classList.remove(cls);
      }, 700);
    }
    clearCutCellsInDom(ranges) {
      const norms = ranges.map(normalizeRange);
      for (const panel of this.bodyPanels) {
        for (const el of panel.querySelectorAll(".pg-cell[data-row-index][data-col-index]")) {
          const ri = Number(el.getAttribute("data-row-index"));
          const ci = Number(el.getAttribute("data-col-index"));
          const hit = norms.some(
            (n) => ri >= n.startRowIndex && ri <= n.endRowIndex && ci >= n.startColIndex && ci <= n.endColIndex
          );
          if (hit) {
            const inner = el.querySelector(".pg-cell__inner");
            if (inner) inner.textContent = "";
          }
        }
      }
    }
    getVisibleColumns() {
      return this.store.get("columns").filter((c) => c.visible !== false);
    }
    /**
     * Coerces `value` to the primitive type expected by `targetType`.
     *
     * Called by `applyFill` whenever the source column type differs from the
     * destination column type so that data remains correctly typed after a
     * cross-type fill — even if the result is `NaN` or an `Invalid Date`.
     *
     * | `targetType`                    | Conversion                          |
     * |---------------------------------|-------------------------------------|
     * | `'number'` / `'currency'` /     | `Number(value)` — may produce `NaN` |
     * | `'percentage'`                  |                                     |
     * | `'date'`                        | `new Date(String(value))` — may     |
     * |                                 | produce `Invalid Date`              |
     * | `'boolean'`                     | `Boolean(value)`                    |
     * | `'string'`                      | `String(value)` if not already      |
     * | anything else                   | unchanged                           |
     *
     * @param value      - Raw value from the source cell.
     * @param targetType - `ColumnDef.type` of the destination column.
     */
    coerceToColumnType(value, targetType) {
      if (value == null) return value;
      switch (targetType) {
        case "number":
        case "currency":
        case "percentage":
          return Number(value);
        case "date":
          return value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
        case "boolean":
          return Boolean(value);
        case "string":
          return typeof value === "string" ? value : String(value);
        default:
          return value;
      }
    }
    onKeydown(e) {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") return;
      const active = this.store.get("activeCell");
      if (!active) return;
      const jump = e.ctrlKey || e.metaKey;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (jump && key === "z") {
        e.preventDefault();
        this.performUndo();
        return;
      }
      if (jump && key === "y") {
        e.preventDefault();
        this.performRedo();
        return;
      }
      const rows = this.store.get("visibleRows");
      const columns = this.getVisibleColumns();
      if (rows.length === 0 || columns.length === 0) return;
      const extend = e.shiftKey;
      switch (key) {
        case "ArrowUp":
          e.preventDefault();
          jump ? this.jumpToEdge("up", rows.length, columns.length, extend) : this.moveActiveCell(-1, 0, rows.length, columns.length, extend);
          break;
        case "ArrowDown":
          e.preventDefault();
          jump ? this.jumpToEdge("down", rows.length, columns.length, extend) : this.moveActiveCell(1, 0, rows.length, columns.length, extend);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (jump) {
            this.jumpToEdge("left", rows.length, columns.length, extend);
          } else if (!extend) {
            const ac = active;
            if (ac.colIndex === 0 && ac.rowIndex > 0) {
              this.startSelection(ac.rowIndex - 1, columns.length - 1);
            } else {
              this.moveActiveCell(0, -1, rows.length, columns.length, false);
            }
          } else {
            this.moveActiveCell(0, -1, rows.length, columns.length, true);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (jump) {
            this.jumpToEdge("right", rows.length, columns.length, extend);
          } else if (!extend) {
            const ac = active;
            if (ac.colIndex >= columns.length - 1 && ac.rowIndex < rows.length - 1) {
              this.startSelection(ac.rowIndex + 1, 0);
            } else {
              this.moveActiveCell(0, 1, rows.length, columns.length, false);
            }
          } else {
            this.moveActiveCell(0, 1, rows.length, columns.length, true);
          }
          break;
        case "PageDown": {
          e.preventDefault();
          const pageDownSize = this.getViewportRowCountCallback?.() ?? 10;
          this.moveActiveCell(pageDownSize, 0, rows.length, columns.length, extend);
          break;
        }
        case "PageUp": {
          e.preventDefault();
          const pageUpSize = this.getViewportRowCountCallback?.() ?? 10;
          this.moveActiveCell(-pageUpSize, 0, rows.length, columns.length, extend);
          break;
        }
        case "Home":
          e.preventDefault();
          if (jump) {
            this.startSelection(0, 0, extend);
          } else {
            this.moveActiveCell(0, -active.colIndex, rows.length, columns.length, extend);
          }
          break;
        case "End":
          e.preventDefault();
          if (jump) {
            this.startSelection(rows.length - 1, columns.length - 1, extend);
          } else {
            this.moveActiveCell(0, columns.length - 1 - active.colIndex, rows.length, columns.length, extend);
          }
          break;
        case "Tab": {
          e.preventDefault();
          const ac = active;
          if (e.shiftKey) {
            if (ac.colIndex === 0 && ac.rowIndex > 0) {
              this.startSelection(ac.rowIndex - 1, columns.length - 1);
            } else {
              this.moveActiveCell(0, -1, rows.length, columns.length, false);
            }
          } else {
            if (ac.colIndex >= columns.length - 1 && ac.rowIndex < rows.length - 1) {
              this.startSelection(ac.rowIndex + 1, 0);
            } else {
              this.moveActiveCell(0, 1, rows.length, columns.length, false);
            }
          }
          break;
        }
        case "Enter":
          e.preventDefault();
          if (!e.shiftKey && this.enterEditHandler) {
            const ac = active;
            if (this.enterEditHandler(ac.rowIndex, ac.colIndex)) break;
          }
          this.moveActiveCell(e.shiftKey ? -1 : 1, 0, rows.length, columns.length, false);
          break;
        case "c":
          if (jump) {
            e.preventDefault();
            this.copySelection(rows, columns);
          }
          break;
        case "x":
          if (jump) {
            e.preventDefault();
            this.cutSelection(rows, columns);
          }
          break;
        case "v":
          if (jump) {
            e.preventDefault();
            this.pasteSelection(rows, columns);
          }
          break;
        case "a":
          if (jump) {
            e.preventDefault();
            this.selectAll(rows.length, columns.length);
          }
          break;
        case "Delete":
        case "Backspace":
          if (this.store.get("cellRanges").length > 0) {
            e.preventDefault();
            this.cutSelection(rows, columns);
          }
          break;
        case "Escape":
          this.clearSelection();
          break;
      }
    }
    selectAll(rowCount, colCount) {
      const groupedIds = this.store.get("groupedColumnIds");
      const startCol = groupedIds.length > 0 ? -1 : 0;
      this.anchorCell = { rowIndex: 0, colIndex: startCol };
      this.store.set("cellRanges", [{
        startRowIndex: 0,
        endRowIndex: rowCount - 1,
        startColIndex: startCol,
        endColIndex: colCount - 1
      }]);
      this.store.set("activeCell", { rowIndex: 0, colIndex: startCol });
      this.emitSelectionChanged();
    }
    buildContextMenu() {
      const ICON_CUT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`;
      const ICON_COPY = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      const ICON_PASTE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`;
      const ICON_CHART = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
      const ICON_EXPORT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
      const el = document.createElement("div");
      el.className = "pg-context-menu";
      el.setAttribute("role", "menu");
      const makeItem = (action, icon, label, kbd) => {
        const btn = document.createElement("button");
        btn.className = "pg-context-menu__item";
        btn.setAttribute("role", "menuitem");
        btn.setAttribute("data-action", action);
        const iconSpan = document.createElement("span");
        iconSpan.className = "pg-context-menu__icon";
        iconSpan.innerHTML = icon;
        const labelSpan = document.createElement("span");
        labelSpan.className = "pg-context-menu__label";
        labelSpan.textContent = label;
        btn.appendChild(iconSpan);
        btn.appendChild(labelSpan);
        if (kbd) {
          const kbdSpan = document.createElement("span");
          kbdSpan.className = "pg-context-menu__kbd";
          kbdSpan.textContent = kbd;
          btn.appendChild(kbdSpan);
        }
        return btn;
      };
      const makeSep = () => {
        const sep = document.createElement("div");
        sep.className = "pg-context-menu__sep";
        sep.setAttribute("role", "separator");
        return sep;
      };
      const makeChartSubItem = (type, label) => {
        const btn = document.createElement("button");
        btn.className = "pg-context-menu__item";
        btn.setAttribute("role", "menuitem");
        btn.setAttribute("data-chart-type", type);
        const labelSpan = document.createElement("span");
        labelSpan.className = "pg-context-menu__label";
        labelSpan.textContent = label;
        btn.appendChild(labelSpan);
        return btn;
      };
      const makeSubGroup = (label, items) => {
        const wrapper = document.createElement("div");
        wrapper.className = "pg-context-menu__item pg-context-menu__item--has-sub";
        wrapper.setAttribute("role", "menuitem");
        const labelSpan = document.createElement("span");
        labelSpan.className = "pg-context-menu__label";
        labelSpan.textContent = label;
        wrapper.appendChild(labelSpan);
        const sub = document.createElement("div");
        sub.className = "pg-context-menu__sub";
        for (const item of items) sub.appendChild(item);
        wrapper.appendChild(sub);
        return wrapper;
      };
      el.appendChild(makeItem("cut", ICON_CUT, "Cut", "Ctrl+X"));
      el.appendChild(makeItem("copy", ICON_COPY, "Copy", "Ctrl+C"));
      el.appendChild(makeItem("copy-headers", ICON_COPY, "Copy with Headers"));
      el.appendChild(makeItem("paste", ICON_PASTE, "Paste", "Ctrl+V"));
      el.appendChild(makeSep());
      const chartItem = document.createElement("div");
      chartItem.className = "pg-context-menu__item pg-context-menu__item--has-sub";
      chartItem.setAttribute("role", "menuitem");
      const chartIcon = document.createElement("span");
      chartIcon.className = "pg-context-menu__icon";
      chartIcon.innerHTML = ICON_CHART;
      const chartLabel = document.createElement("span");
      chartLabel.className = "pg-context-menu__label";
      chartLabel.textContent = "Chart Range";
      chartItem.appendChild(chartIcon);
      chartItem.appendChild(chartLabel);
      const chartSub = document.createElement("div");
      chartSub.className = "pg-context-menu__sub";
      chartSub.appendChild(makeSubGroup("Column", [
        makeChartSubItem("column-grouped", "Grouped"),
        makeChartSubItem("column-stacked", "Stacked"),
        makeChartSubItem("column-100stacked", "100% Stacked")
      ]));
      chartSub.appendChild(makeSubGroup("Bar", [
        makeChartSubItem("bar-grouped", "Grouped"),
        makeChartSubItem("bar-stacked", "Stacked"),
        makeChartSubItem("bar-100stacked", "100% Stacked")
      ]));
      chartSub.appendChild(makeChartSubItem("pie", "Pie"));
      chartSub.appendChild(makeChartSubItem("line", "Line"));
      chartSub.appendChild(makeChartSubItem("area", "Area"));
      chartSub.appendChild(makeChartSubItem("scatter", "X Y (Scatter)"));
      chartSub.appendChild(makeChartSubItem("polar", "Polar"));
      chartSub.appendChild(makeChartSubItem("funnel", "Funnel"));
      chartItem.appendChild(chartSub);
      el.appendChild(chartItem);
      el.appendChild(makeSep());
      const exportItem = document.createElement("div");
      exportItem.className = "pg-context-menu__item pg-context-menu__item--has-sub";
      exportItem.setAttribute("role", "menuitem");
      const exportIcon = document.createElement("span");
      exportIcon.className = "pg-context-menu__icon";
      exportIcon.innerHTML = ICON_EXPORT;
      const exportLabel = document.createElement("span");
      exportLabel.className = "pg-context-menu__label";
      exportLabel.textContent = "Export";
      exportItem.appendChild(exportIcon);
      exportItem.appendChild(exportLabel);
      const exportSub = document.createElement("div");
      exportSub.className = "pg-context-menu__sub";
      const csvBtn = document.createElement("button");
      csvBtn.className = "pg-context-menu__item";
      csvBtn.setAttribute("role", "menuitem");
      csvBtn.setAttribute("data-action", "export-csv");
      const csvLabel = document.createElement("span");
      csvLabel.className = "pg-context-menu__label";
      csvLabel.textContent = "Export as CSV";
      csvBtn.appendChild(csvLabel);
      exportSub.appendChild(csvBtn);
      exportItem.appendChild(exportSub);
      el.appendChild(exportItem);
      el.addEventListener("mousedown", (e) => e.stopPropagation());
      el.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action],[data-chart-type]");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        const chartType = btn.getAttribute("data-chart-type");
        if (!action && !chartType) return;
        this.hideContextMenu();
        const rows = this.store.get("visibleRows");
        const columns = this.getVisibleColumns();
        if (chartType) {
          this.chartOpenCallback?.(chartType);
          return;
        }
        switch (action) {
          case "cut":
            this.cutSelection(rows, columns);
            break;
          case "copy":
            this.copySelection(rows, columns);
            break;
          case "copy-headers":
            this.copySelectionWithHeaders(rows, columns);
            break;
          case "paste":
            this.pasteSelection(rows, columns);
            break;
          case "selectAll":
            this.selectAll(rows.length, columns.length);
            break;
          case "export-csv":
            this.exportAsCsv(rows, columns);
            break;
        }
      });
      document.body.appendChild(el);
      this.contextMenuEl = el;
    }
    exportAsCsv(rows, columns) {
      const header = columns.map((c) => `"${c.header}"`).join(",");
      const body = rows.filter((r) => r.type === "data").map(
        (row) => columns.map((col) => {
          const v = row.data[col.field];
          const s = v == null ? "" : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        }).join(",")
      ).join("\n");
      const csv = `${header}
${body}`;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "export.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
    emitSelectionChanged() {
      this.eventBus.emit(GridEventType.CELL_SELECTION_CHANGED, {
        ranges: this.store.get("cellRanges")
      });
    }
  };

  // src/theme/css-var-injector.ts
  var PREFIX = "--pg";
  function toKebab(str) {
    return str.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
  }
  function flattenTokens(obj, prefix, result) {
    for (const [key, value] of Object.entries(obj)) {
      const cssKey = `${prefix}-${toKebab(key)}`;
      if (typeof value === "string" || typeof value === "number") {
        result.set(cssKey, String(value));
      } else if (typeof value === "object" && value !== null) {
        flattenTokens(value, cssKey, result);
      }
    }
  }
  var CssVarInjector = class {
    constructor() {
      this.styleEl = null;
      this.scopeEl = null;
    }
    inject(tokens, scopeEl) {
      this.scopeEl = scopeEl ?? document.documentElement;
      const vars = /* @__PURE__ */ new Map();
      flattenTokens(tokens, PREFIX, vars);
      for (const [key, value] of vars) {
        this.scopeEl.style.setProperty(key, value);
      }
    }
    injectAsStylesheet(tokens, selector = ":root") {
      if (this.styleEl) {
        this.styleEl.remove();
      }
      const vars = /* @__PURE__ */ new Map();
      flattenTokens(tokens, PREFIX, vars);
      const cssLines = [`${selector} {`];
      for (const [key, value] of vars) {
        cssLines.push(`  ${key}: ${value};`);
      }
      cssLines.push("}");
      this.styleEl = document.createElement("style");
      this.styleEl.setAttribute("data-photon-grid-theme", "");
      this.styleEl.textContent = cssLines.join("\n");
      document.head.appendChild(this.styleEl);
    }
    remove() {
      if (this.styleEl) {
        this.styleEl.remove();
        this.styleEl = null;
      }
      if (this.scopeEl) {
        const style = this.scopeEl.style;
        for (let i = style.length - 1; i >= 0; i--) {
          const prop = style.item(i);
          if (prop.startsWith(PREFIX)) style.removeProperty(prop);
        }
      }
    }
    getVar(tokenPath) {
      return `var(${PREFIX}-${toKebab(tokenPath)})`;
    }
  };

  // src/theme/themes/light-theme.ts
  var lightTheme = {
    name: "light",
    displayName: "Light",
    mode: "light",
    tokens: {
      colors: {
        primary: "#2563eb",
        primaryHover: "#1d4ed8",
        primaryActive: "#1e40af",
        primaryText: "#ffffff",
        secondary: "#64748b",
        secondaryHover: "#475569",
        surface: "#ffffff",
        surfaceRaised: "#ffffff",
        surfaceOverlay: "#ffffff",
        surfaceSunken: "#f8fafc",
        background: "#f8fafc",
        backgroundAlt: "#f1f5f9",
        border: "#e2e8f0",
        borderStrong: "#cbd5e1",
        borderFocus: "#2563eb",
        textPrimary: "#0f172a",
        textSecondary: "#475569",
        textDisabled: "#94a3b8",
        textInverse: "#ffffff",
        headerBackground: "#f8fafc",
        headerText: "#374151",
        headerBorder: "#e2e8f0",
        headerHover: "#f1f5f9",
        rowBackground: "#ffffff",
        rowBackgroundAlt: "#f8fafc",
        rowHover: "#f0f7ff",
        rowSelected: "#eff6ff",
        rowSelectedBorder: "#bfdbfe",
        cellEditBackground: "#ffffff",
        cellEditBorder: "#2563eb",
        selectionBackground: "rgba(37, 99, 235, 0.08)",
        selectionBorder: "rgba(37, 99, 235, 0.85)",
        selectionCorner: "#2563eb",
        footerBackground: "#f8fafc",
        footerText: "#374151",
        footerBorder: "#e2e8f0",
        pinnedBackground: "#ffffff",
        pinnedShadow: "4px 0 6px -2px rgba(15,23,42,0.08)",
        filterBackground: "#ffffff",
        filterBorder: "#e2e8f0",
        filterActiveBackground: "#eff6ff",
        filterActiveBorder: "#93c5fd",
        scrollbarTrack: "#f1f5f9",
        scrollbarThumb: "#cbd5e1",
        scrollbarThumbHover: "#94a3b8",
        resizeHandleColor: "#e2e8f0",
        resizeHandleActiveColor: "#2563eb",
        dragPreviewBackground: "#ffffff",
        dragPreviewBorder: "#e2e8f0",
        dragOverHighlight: "rgba(37, 99, 235, 0.06)",
        checkboxBackground: "#ffffff",
        checkboxCheckedBackground: "#2563eb",
        checkboxBorder: "#cbd5e1",
        badgeBackground: "#eff6ff",
        badgeText: "#1d4ed8",
        groupRowBackground: "#f8fafc",
        groupRowBorder: "#e2e8f0",
        tooltipBackground: "#1e293b",
        tooltipText: "#f1f5f9",
        success: "#16a34a",
        warning: "#d97706",
        error: "#dc2626",
        info: "#0284c7",
        successLight: "#dcfce7",
        warningLight: "#fef3c7",
        errorLight: "#fee2e2",
        infoLight: "#e0f2fe"
      },
      typography: {
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        fontFamilyMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSizeXs: "11px",
        fontSizeSm: "12px",
        fontSizeMd: "13px",
        fontSizeLg: "14px",
        fontSizeXl: "16px",
        fontWeightRegular: "400",
        fontWeightMedium: "500",
        fontWeightSemiBold: "600",
        fontWeightBold: "700",
        lineHeightTight: "1.2",
        lineHeightBase: "1.5",
        lineHeightRelaxed: "1.75",
        letterSpacingTight: "-0.01em",
        letterSpacingBase: "0",
        letterSpacingWide: "0.025em"
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        xxl: "32px"
      },
      sizing: {
        rowHeightSm: "36px",
        rowHeightMd: "48px",
        rowHeightLg: "60px",
        headerRowHeight: "42px",
        footerRowHeight: "44px",
        filterRowHeight: "36px",
        scrollbarWidth: "8px",
        resizeHandleWidth: "4px",
        columnMinWidth: "40px",
        checkboxSize: "16px",
        iconSizeSm: "14px",
        iconSizeMd: "16px",
        iconSizeLg: "20px"
      },
      borders: {
        radiusSm: "4px",
        radiusMd: "6px",
        radiusLg: "8px",
        radiusPill: "9999px",
        widthThin: "1px",
        widthBase: "1px",
        widthThick: "2px",
        styleBase: "solid"
      },
      shadows: {
        none: "none",
        xs: "0 1px 2px rgba(15,23,42,0.05)",
        sm: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)",
        md: "0 4px 6px -1px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.05)",
        lg: "0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.05)",
        pinnedLeft: "4px 0 8px -2px rgba(15,23,42,0.10)",
        pinnedRight: "-4px 0 8px -2px rgba(15,23,42,0.10)",
        dropdown: "0 8px 24px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.08)",
        tooltip: "0 4px 12px rgba(15,23,42,0.15)",
        dragPreview: "0 8px 24px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.10)"
      },
      transitions: {
        durationFast: "100ms",
        durationBase: "150ms",
        durationSlow: "250ms",
        easingBase: "cubic-bezier(0.4, 0, 0.2, 1)",
        easingDecelerate: "cubic-bezier(0, 0, 0.2, 1)",
        easingAccelerate: "cubic-bezier(0.4, 0, 1, 1)"
      }
    }
  };

  // src/theme/themes/dark-theme.ts
  var darkTheme = {
    name: "dark",
    displayName: "Dark",
    mode: "dark",
    tokens: {
      colors: {
        primary: "#3b82f6",
        primaryHover: "#60a5fa",
        primaryActive: "#93c5fd",
        primaryText: "#ffffff",
        secondary: "#94a3b8",
        secondaryHover: "#cbd5e1",
        surface: "#1e293b",
        surfaceRaised: "#263347",
        surfaceOverlay: "#1e293b",
        surfaceSunken: "#0f172a",
        background: "#0f172a",
        backgroundAlt: "#1e293b",
        border: "#334155",
        borderStrong: "#475569",
        borderFocus: "#3b82f6",
        textPrimary: "#f1f5f9",
        textSecondary: "#94a3b8",
        textDisabled: "#475569",
        textInverse: "#0f172a",
        headerBackground: "#1e293b",
        headerText: "#cbd5e1",
        headerBorder: "#334155",
        headerHover: "#263347",
        rowBackground: "#0f172a",
        rowBackgroundAlt: "#1a2540",
        rowHover: "#1e3a5f",
        rowSelected: "#1e3a5f",
        rowSelectedBorder: "#3b82f6",
        cellEditBackground: "#1e293b",
        cellEditBorder: "#3b82f6",
        selectionBackground: "rgba(59, 130, 246, 0.15)",
        selectionBorder: "rgba(59, 130, 246, 0.8)",
        selectionCorner: "#3b82f6",
        footerBackground: "#1e293b",
        footerText: "#94a3b8",
        footerBorder: "#334155",
        pinnedBackground: "#0f172a",
        pinnedShadow: "4px 0 6px -2px rgba(0,0,0,0.4)",
        filterBackground: "#1e293b",
        filterBorder: "#334155",
        filterActiveBackground: "#1e3a5f",
        filterActiveBorder: "#3b82f6",
        scrollbarTrack: "#1e293b",
        scrollbarThumb: "#475569",
        scrollbarThumbHover: "#64748b",
        resizeHandleColor: "#334155",
        resizeHandleActiveColor: "#3b82f6",
        dragPreviewBackground: "#1e293b",
        dragPreviewBorder: "#475569",
        dragOverHighlight: "rgba(59, 130, 246, 0.1)",
        checkboxBackground: "#1e293b",
        checkboxCheckedBackground: "#3b82f6",
        checkboxBorder: "#475569",
        badgeBackground: "#1e3a5f",
        badgeText: "#93c5fd",
        groupRowBackground: "#1e293b",
        groupRowBorder: "#334155",
        tooltipBackground: "#f1f5f9",
        tooltipText: "#0f172a",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#38bdf8",
        successLight: "#052e16",
        warningLight: "#1c1007",
        errorLight: "#1f0909",
        infoLight: "#082f49"
      },
      typography: {
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        fontFamilyMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSizeXs: "11px",
        fontSizeSm: "12px",
        fontSizeMd: "13px",
        fontSizeLg: "14px",
        fontSizeXl: "16px",
        fontWeightRegular: "400",
        fontWeightMedium: "500",
        fontWeightSemiBold: "600",
        fontWeightBold: "700",
        lineHeightTight: "1.2",
        lineHeightBase: "1.5",
        lineHeightRelaxed: "1.75",
        letterSpacingTight: "-0.01em",
        letterSpacingBase: "0",
        letterSpacingWide: "0.025em"
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        xxl: "32px"
      },
      sizing: {
        rowHeightSm: "36px",
        rowHeightMd: "48px",
        rowHeightLg: "60px",
        headerRowHeight: "42px",
        footerRowHeight: "44px",
        filterRowHeight: "36px",
        scrollbarWidth: "8px",
        resizeHandleWidth: "4px",
        columnMinWidth: "40px",
        checkboxSize: "16px",
        iconSizeSm: "14px",
        iconSizeMd: "16px",
        iconSizeLg: "20px"
      },
      borders: {
        radiusSm: "4px",
        radiusMd: "6px",
        radiusLg: "8px",
        radiusPill: "9999px",
        widthThin: "1px",
        widthBase: "1px",
        widthThick: "2px",
        styleBase: "solid"
      },
      shadows: {
        none: "none",
        xs: "0 1px 2px rgba(0,0,0,0.3)",
        sm: "0 1px 3px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)",
        md: "0 4px 6px -1px rgba(0,0,0,0.35), 0 2px 4px -2px rgba(0,0,0,0.25)",
        lg: "0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3)",
        pinnedLeft: "4px 0 8px -2px rgba(0,0,0,0.4)",
        pinnedRight: "-4px 0 8px -2px rgba(0,0,0,0.4)",
        dropdown: "0 8px 24px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)",
        tooltip: "0 4px 12px rgba(0,0,0,0.5)",
        dragPreview: "0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35)"
      },
      transitions: {
        durationFast: "100ms",
        durationBase: "150ms",
        durationSlow: "250ms",
        easingBase: "cubic-bezier(0.4, 0, 0.2, 1)",
        easingDecelerate: "cubic-bezier(0, 0, 0.2, 1)",
        easingAccelerate: "cubic-bezier(0.4, 0, 1, 1)"
      }
    }
  };

  // src/theme/theme-manager.ts
  var ThemeManager = class {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.injector = new CssVarInjector();
      // A second injector always sets variables on :root so that fixed-position
      // elements appended to <body> (menus, dropdowns, overlays) can inherit them.
      this.rootInjector = new CssVarInjector();
      this.registry = /* @__PURE__ */ new Map();
      this.activeTheme = null;
      this.scopeEl = null;
      this.registry.set("light", lightTheme);
      this.registry.set("dark", darkTheme);
    }
    registerTheme(theme) {
      this.registry.set(theme.name, theme);
    }
    applyTheme(nameOrTheme, scopeEl) {
      let theme;
      if (typeof nameOrTheme === "string") {
        theme = this.registry.get(nameOrTheme);
        if (!theme) {
          console.warn(`[PhotonGrid] Theme "${nameOrTheme}" not found. Falling back to "light".`);
          theme = lightTheme;
        }
      } else {
        theme = nameOrTheme;
        this.registry.set(theme.name, theme);
      }
      this.scopeEl = scopeEl ?? null;
      this.activeTheme = theme;
      const selector = scopeEl ? `[data-photon-grid-id="${scopeEl.getAttribute("data-photon-grid-id")}"]` : ":root";
      this.injector.injectAsStylesheet(theme.tokens, selector);
      this.rootInjector.inject(theme.tokens, document.documentElement);
      if (scopeEl) {
        scopeEl.setAttribute("data-pg-theme", theme.name);
        scopeEl.setAttribute("data-pg-mode", theme.mode);
      } else {
        document.documentElement.setAttribute("data-pg-theme", theme.name);
        document.documentElement.setAttribute("data-pg-mode", theme.mode);
      }
      this.eventBus.emit(GridEventType.THEME_CHANGED, { themeName: theme.name });
    }
    getActiveTheme() {
      return this.activeTheme;
    }
    getTheme(name) {
      return this.registry.get(name);
    }
    getAllThemes() {
      return Array.from(this.registry.values());
    }
    toggleDarkMode() {
      const current = this.activeTheme;
      if (!current) return;
      const targetName = current.mode === "light" ? "dark" : "light";
      const target = this.registry.get(targetName);
      if (target) this.applyTheme(target, this.scopeEl ?? void 0);
    }
    isDarkMode() {
      return this.activeTheme?.mode === "dark";
    }
    destroy() {
      this.injector.remove();
      this.rootInjector.remove();
      this.activeTheme = null;
    }
  };

  // src/icons/icon-sets/core-icons.ts
  var coreIcons = {
    sortAsc: `<svg data-component="Octicon" aria-hidden="true" focusable="false" class="octicon octicon-sort-asc" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="m12.927 2.573 3 3A.25.25 0 0 1 15.75 6H13.5v6.75a.75.75 0 0 1-1.5 0V6H9.75a.25.25 0 0 1-.177-.427l3-3a.25.25 0 0 1 .354 0ZM0 12.25a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75Zm0-4a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 8.25Zm0-4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 4.25Z"></path></svg>`,
    sortDesc: `<svg data-component="Octicon" aria-hidden="true" focusable="false" class="octicon octicon-sort-desc" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M0 4.25a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 4.25Zm0 4a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 8.25Zm0 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75ZM13.5 10h2.25a.25.25 0 0 1 .177.427l-3 3a.25.25 0 0 1-.354 0l-3-3A.25.25 0 0 1 9.75 10H12V3.75a.75.75 0 0 1 1.5 0V10Z"></path></svg>`,
    sortNone: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 3L11 7H5L8 3Z" fill="currentColor" opacity="0.4"/><path d="M8 13L5 9H11L8 13Z" fill="currentColor" opacity="0.4"/></svg>`,
    filter: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4H14M5 8H11M7 12H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    filterActive: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4H14M5 8H11M7 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="4" r="3" fill="currentColor"/></svg>`,
    menu: `<svg data-component="Octicon" aria-hidden="true" focusable="false" class="octicon octicon-kebab-horizontal" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path></svg>`,
    menuHorizontal: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="13" cy="8" r="1.5" fill="currentColor"/></svg>`,
    chevronRight: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    chevronDown: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    chevronUp: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 10L8 6L12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    chevronLeft: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 4L6 8L10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    expand: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 6V2H6M10 2H14V6M14 10V14H10M6 14H2V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    collapse: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 2V6H2M14 6H10V2M10 14V10H14M2 10H6V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    fullscreen: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 6V2H6M10 2H14V6M14 10V14H10M6 14H2V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    close: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    check: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8L6.5 11.5L13 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    minus: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    drag: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5.5" cy="4" r="1.2" fill="currentColor"/><circle cx="10.5" cy="4" r="1.2" fill="currentColor"/><circle cx="5.5" cy="8" r="1.2" fill="currentColor"/><circle cx="10.5" cy="8" r="1.2" fill="currentColor"/><circle cx="5.5" cy="12" r="1.2" fill="currentColor"/><circle cx="10.5" cy="12" r="1.2" fill="currentColor"/></svg>`,
    ban: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M3.76 3.76l8.48 8.48" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    pin: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2L14 6L10 10H8V8L4 12L3 11L7 7H5L1 3L5 2H10Z" fill="currentColor"/></svg>`,
    unpin: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L14 14M10 2L14 6L10 10H8V8L4 12L3 11L7 7H5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    columns: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="4" height="14" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="7" y="1" width="2" height="14" rx="0.5" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="1" width="4" height="14" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>`,
    download: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V10M5 7L8 10L11 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 13H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    search: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M10 10L13.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    eye: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 8C1 8 3 3 8 3C13 3 15 8 15 8C15 8 13 13 8 13C3 13 1 8 1 8Z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/></svg>`,
    eyeOff: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L15 15M6.5 5.5A2 2 0 0 1 10.5 9.5M3 3.5C1.7 5 1 8 1 8S3 13 8 13C9.5 13 10.8 12.5 11.8 11.8M6 2.3C6.6 2.1 7.3 2 8 2C13 2 15 8 15 8C15 8 14.5 9.5 13.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    group: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="7" width="10" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="12" width="6" height="2" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>`,
    settings: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 1V3M8 13V15M1 8H3M13 8H15M3.1 3.1L4.5 4.5M11.5 11.5L12.9 12.9M12.9 3.1L11.5 4.5M4.5 11.5L3.1 12.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    refresh: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 8A6 6 0 1 1 8 2V1M11 1H8V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    pagePrev: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 4L5 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    pageNext: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 4L11 8L7 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    pageFirst: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4V12M7 4L3 8L7 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    pageLast: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4V12M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    loading: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="20 10" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.8s" repeatCount="indefinite"/></circle></svg>`,
    chart: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="8" width="3" height="6" rx="0.5" fill="currentColor"/><rect x="6.5" y="4" width="3" height="10" rx="0.5" fill="currentColor"/><rect x="11" y="2" width="3" height="12" rx="0.5" fill="currentColor"/></svg>`,
    edit: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    trash: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4H14M5 4V2H11V4M6 7V12M10 7V12M3 4L4 14H12L13 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    copy: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M11 5V3H2V12H5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    info: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 7V11M8 5V5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    warning: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6V9M8 11V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    success: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    lock: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="10.5" r="1" fill="currentColor"/></svg>`,
    sigma: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 3H5L8.5 8L5 13H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  };

  // src/icons/icon-registry.ts
  var IconRegistry = class {
    constructor(options = {}) {
      this.icons = new Map(Object.entries(coreIcons));
      this.options = { defaultSize: 16, defaultColor: "currentColor", ...options };
    }
    register(name, svgContent) {
      this.icons.set(name, svgContent);
    }
    registerAll(iconSet) {
      for (const [name, svg] of Object.entries(iconSet)) {
        this.icons.set(name, svg);
      }
    }
    has(name) {
      return this.icons.has(name);
    }
    get(name) {
      return this.icons.get(name);
    }
    getAll() {
      return new Map(this.icons);
    }
    remove(name) {
      this.icons.delete(name);
    }
    clear() {
      this.icons.clear();
    }
    loadCoreIcons() {
      this.registerAll(coreIcons);
    }
    getNames() {
      return Array.from(this.icons.keys());
    }
  };

  // src/icons/icon-renderer.ts
  var IconRenderer = class {
    constructor(registry) {
      this.registry = registry;
    }
    render(name, options = {}) {
      const wrapper = document.createElement("span");
      wrapper.className = `pg-icon pg-icon--${name}${options.className ? ` ${options.className}` : ""}`;
      wrapper.setAttribute("aria-hidden", "true");
      wrapper.setAttribute("data-icon", name);
      const size = options.size ?? 16;
      wrapper.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      flex-shrink: 0;
      color: ${options.color ?? "currentColor"};
      ${options.rotate ? `transform: rotate(${options.rotate}deg);` : ""}
      ${options.spin ? "animation: pg-spin 0.8s linear infinite;" : ""}
      transition: transform var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base);
    `;
      const svgContent = this.registry.get(name);
      if (svgContent) {
        wrapper.innerHTML = svgContent;
        const svg = wrapper.querySelector("svg");
        if (svg) {
          svg.setAttribute("width", String(size));
          svg.setAttribute("height", String(size));
          svg.style.display = "block";
        }
      } else {
        wrapper.style.background = "currentColor";
        wrapper.style.borderRadius = "2px";
        wrapper.style.opacity = "0.3";
      }
      if (options.title) {
        wrapper.setAttribute("title", options.title);
        wrapper.setAttribute("aria-label", options.title);
        wrapper.removeAttribute("aria-hidden");
      }
      return wrapper;
    }
    renderToString(name, size = 16) {
      const svg = this.registry.get(name);
      if (!svg) return "";
      return svg.replace("<svg", `<svg width="${size}" height="${size}" style="display:block;"`).replace(/currentColor/g, "currentColor");
    }
    updateIcon(el, name, options = {}) {
      el.setAttribute("data-icon", name);
      const size = options.size ?? 16;
      const svgContent = this.registry.get(name);
      if (svgContent) {
        el.innerHTML = svgContent;
        const svg = el.querySelector("svg");
        if (svg) {
          svg.setAttribute("width", String(size));
          svg.setAttribute("height", String(size));
        }
      }
    }
    injectSpinKeyframes() {
      if (document.getElementById("pg-icon-keyframes")) return;
      const style = document.createElement("style");
      style.id = "pg-icon-keyframes";
      style.textContent = `@keyframes pg-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
  };

  // src/chart/chart-data-transformer.ts
  var DEFAULT_COLORS = [
    "#2563eb",
    "#16a34a",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0284c7",
    "#db2777",
    "#65a30d",
    "#c2410c",
    "#0891b2"
  ];
  var ChartDataTransformer = class {
    transform(rows, options) {
      const dataRows = rows.filter((r) => r.type === "data");
      const { labelField, valueFields, aggregation = "sum", limit, sortByValue, colors = DEFAULT_COLORS } = options;
      const grouped = /* @__PURE__ */ new Map();
      for (const row of dataRows) {
        const label = String(this.resolveValue(row.data, labelField) ?? "Unknown");
        if (!grouped.has(label)) {
          const entry2 = {};
          for (const field of valueFields) entry2[field] = [];
          grouped.set(label, entry2);
        }
        const entry = grouped.get(label);
        for (const field of valueFields) {
          const val = Number(this.resolveValue(row.data, field));
          if (!isNaN(val)) entry[field].push(val);
        }
      }
      let labels = Array.from(grouped.keys());
      const datasets = valueFields.map((field, fi) => {
        const data = labels.map((label) => {
          const values = grouped.get(label)[field] ?? [];
          return this.aggregate(values, aggregation);
        });
        return {
          label: field,
          data,
          color: colors[fi % colors.length]
        };
      });
      if (sortByValue && datasets.length > 0) {
        const primaryData = datasets[0].data;
        const indices = labels.map((_, i) => i).sort((a, b) => primaryData[b] - primaryData[a]);
        labels = indices.map((i) => labels[i]);
        for (const ds of datasets) {
          ds.data = indices.map((i) => ds.data[i]);
        }
      }
      if (limit && limit > 0) {
        labels = labels.slice(0, limit);
        for (const ds of datasets) {
          ds.data = ds.data.slice(0, limit);
        }
      }
      return { labels, datasets };
    }
    fromSelectedColumns(rows, columns, labelColId, valueColIds) {
      const labelCol = columns.find((c) => c.colId === labelColId);
      const valueCols = columns.filter((c) => valueColIds.includes(c.colId));
      if (!labelCol || valueCols.length === 0) return { labels: [], datasets: [] };
      return this.transform(rows, {
        labelField: labelCol.field,
        valueFields: valueCols.map((c) => c.field)
      });
    }
    aggregate(values, fn) {
      if (values.length === 0) return 0;
      switch (fn) {
        case "sum":
          return values.reduce((a, b) => a + b, 0);
        case "avg":
          return values.reduce((a, b) => a + b, 0) / values.length;
        case "min":
          return Math.min(...values);
        case "max":
          return Math.max(...values);
        case "count":
          return values.length;
        default:
          return values.reduce((a, b) => a + b, 0);
      }
    }
    resolveValue(data, path) {
      const parts = path.split(".");
      let current = data;
      for (const part of parts) {
        if (current == null) return void 0;
        current = current[part];
      }
      return current;
    }
  };

  // src/chart/chart-renderer.ts
  var DEFAULTS = {
    type: "column-grouped",
    width: 600,
    height: 320,
    padding: 40,
    showLegend: true,
    showGrid: true,
    showValues: false,
    barWidth: 0.75,
    lineWidth: 2,
    smooth: false,
    fontFamily: "system-ui, sans-serif",
    fontSize: 12,
    textColor: "#374151",
    gridColor: "#e5e7eb",
    backgroundColor: "transparent",
    animationDuration: 400
  };
  var APEX_COLORS = [
    "#008FFB",
    "#00E396",
    "#FEB019",
    "#FF4560",
    "#775DD0",
    "#3F51B5",
    "#03A9F4",
    "#4CAF50",
    "#F9CE1D",
    "#FF9800"
  ];
  function assignColors(data) {
    return {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => ({
        ...ds,
        color: ds.color ?? APEX_COLORS[i % APEX_COLORS.length]
      }))
    };
  }
  var ChartRenderer = class {
    constructor(canvas) {
      this.animProgress = 1;
      this.rafId = null;
      // Hover state
      this.hoverX = null;
      this.hoverY = null;
      this.hoverRafId = null;
      /** Smoothly lerped cursor-Y used to animate the tooltip like ApexCharts. */
      this.tooltipSmoothedY = null;
      this.lastData = null;
      this.lastOptions = null;
      /** Per-dataset scale multiplier used by toggle animations (0 = hidden, 1 = full). */
      this.seriesScales = [];
      /** Active RAF IDs for per-series toggle animations, keyed by dataset index. */
      this.seriesToggleRafs = /* @__PURE__ */ new Map();
      this.canvas = canvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("[PhotonGrid] ChartRenderer: could not get 2d context");
      this.ctx = ctx;
      this.attachEvents();
    }
    render(data, opts = { type: "column-grouped" }) {
      const options = { ...DEFAULTS, ...opts };
      this.canvas.width = options.width;
      this.canvas.height = options.height;
      const coloredData = assignColors(data);
      this.lastData = coloredData;
      this.lastOptions = options;
      this.seriesScales = coloredData.datasets.map(() => 1);
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (options.animationDuration > 0) {
        this.animate(coloredData, options);
      } else {
        this.animProgress = 1;
        this.draw(coloredData, options, 1);
      }
    }
    destroy() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.hoverRafId !== null) {
        cancelAnimationFrame(this.hoverRafId);
        this.hoverRafId = null;
      }
      for (const rafId of this.seriesToggleRafs.values()) cancelAnimationFrame(rafId);
      this.seriesToggleRafs.clear();
    }
    /**
     * Animate a single dataset in or out without re-running the full chart animation.
     * Each dataset's bar heights are multiplied by a per-series scale factor that is
     * smoothly interpolated from its current value to 0 (hide) or 1 (show).
     *
     * @param index     - Index in `data.datasets` to animate.
     * @param toVisible - `true` = grow bars into view; `false` = shrink bars to zero.
     * @param data      - Full chart data including the toggled series.
     * @param opts      - Render options matching the current chart configuration.
     */
    toggleSeries(index, toVisible, data, opts = { type: "column-grouped" }) {
      const options = { ...DEFAULTS, ...opts };
      const coloredData = assignColors(data);
      this.lastData = coloredData;
      this.lastOptions = options;
      while (this.seriesScales.length < coloredData.datasets.length) this.seriesScales.push(1);
      const existing = this.seriesToggleRafs.get(index);
      if (existing !== void 0) {
        cancelAnimationFrame(existing);
        this.seriesToggleRafs.delete(index);
      }
      const from = this.seriesScales[index] ?? (toVisible ? 0 : 1);
      const to = toVisible ? 1 : 0;
      const duration = 280;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = toVisible ? this.easeOutQuart(t) : 1 - this.easeOutQuart(1 - t);
        this.seriesScales[index] = from + (to - from) * eased;
        this.draw(coloredData, options, 1);
        if (t < 1) {
          this.seriesToggleRafs.set(index, requestAnimationFrame(tick));
        } else {
          this.seriesScales[index] = to;
          this.seriesToggleRafs.delete(index);
          this.draw(coloredData, options, 1);
        }
      };
      this.seriesToggleRafs.set(index, requestAnimationFrame(tick));
    }
    // ── Hover event handling ─────────────────────────────────────────────────
    attachEvents() {
      this.canvas.addEventListener("mousemove", (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const sx = this.canvas.width / rect.width;
        const sy = this.canvas.height / rect.height;
        this.hoverX = (e.clientX - rect.left) * sx;
        this.hoverY = (e.clientY - rect.top) * sy;
        this.canvas.style.cursor = "crosshair";
        this.scheduleHoverRedraw();
      });
      this.canvas.addEventListener("mouseleave", () => {
        this.hoverX = null;
        this.hoverY = null;
        this.tooltipSmoothedY = null;
        this.canvas.style.cursor = "default";
        this.scheduleHoverRedraw();
      });
    }
    scheduleHoverRedraw() {
      if (this.hoverRafId !== null) cancelAnimationFrame(this.hoverRafId);
      this.hoverRafId = requestAnimationFrame(() => {
        this.hoverRafId = null;
        if (!this.lastData || !this.lastOptions || this.animProgress < 1) return;
        const needsMore = this.stepTooltipLerp();
        this.draw(this.lastData, this.lastOptions, 1);
        if (this.hoverX !== null) {
          this.drawHover(this.lastData, this.lastOptions);
        }
        if (needsMore && this.hoverX !== null) this.scheduleHoverRedraw();
      });
    }
    /**
     * Eases `tooltipSmoothedY` toward the raw cursor Y (`hoverY`) by a lerp
     * factor that produces an ApexCharts-style lag behind fast movement.
     *
     * @returns `true` when another frame is still required to complete the easing.
     */
    stepTooltipLerp() {
      if (this.hoverY === null) {
        this.tooltipSmoothedY = null;
        return false;
      }
      if (this.tooltipSmoothedY === null) {
        this.tooltipSmoothedY = this.hoverY;
        return false;
      }
      const diff = this.hoverY - this.tooltipSmoothedY;
      if (Math.abs(diff) < 0.5) {
        this.tooltipSmoothedY = this.hoverY;
        return false;
      }
      this.tooltipSmoothedY += diff * 0.14;
      return true;
    }
    // ── Hover overlay dispatcher ──────────────────────────────────────────────
    drawHover(data, opts) {
      const type = opts.type;
      const isHBar = type.startsWith("bar-") || type === "bar";
      const skip = ["pie", "doughnut", "polar", "funnel"];
      if (skip.includes(type)) return;
      if (isHBar) {
        this.drawBarHover(data, opts);
      } else {
        this.drawCartesianHover(data, opts);
      }
    }
    // ── Cartesian hover (column, line, area, scatter) ─────────────────────────
    drawCartesianHover(data, opts) {
      const { ctx } = this;
      const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);
      const hx = this.hoverX;
      if (hx < plotLeft || hx > plotRight) return;
      const nPoints = data.labels.length;
      if (!nPoints) return;
      const type = opts.type;
      const isColumn = type.startsWith("column");
      let idx;
      let crosshairX;
      if (isColumn) {
        const groupW = plotW / Math.max(nPoints, 1);
        idx = Math.min(Math.floor((hx - plotLeft) / groupW), nPoints - 1);
        crosshairX = plotLeft + idx * groupW + groupW / 2;
      } else {
        const xStep = nPoints > 1 ? plotW / (nPoints - 1) : 0;
        idx = xStep > 0 ? Math.round((hx - plotLeft) / xStep) : 0;
        idx = Math.max(0, Math.min(idx, nPoints - 1));
        crosshairX = nPoints > 1 ? plotLeft + idx / (nPoints - 1) * plotW : plotLeft + plotW / 2;
      }
      ctx.save();
      ctx.strokeStyle = "rgba(100,116,139,0.30)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(crosshairX, plotTop);
      ctx.lineTo(crosshairX, plotBottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      if (["line", "area", "scatter"].includes(type)) {
        const rawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
        const maxVal = this.niceMax(rawMax);
        const getY = (v) => plotBottom - v / maxVal * plotH;
        for (const ds of data.datasets) {
          const val = ds.data[idx] ?? 0;
          const dotX = crosshairX;
          const dotY = getY(val);
          ctx.save();
          ctx.beginPath();
          ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
          ctx.fillStyle = ds.color ?? APEX_COLORS[0];
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.restore();
        }
      }
      if (isColumn) {
        const groupW = plotW / Math.max(nPoints, 1);
        const bx = plotLeft + idx * groupW;
        ctx.save();
        ctx.fillStyle = "rgba(100,116,139,0.06)";
        ctx.fillRect(bx, plotTop, groupW, plotBottom - plotTop);
        ctx.restore();
      }
      this.drawTooltip(data, opts, idx, crosshairX, this.tooltipSmoothedY, plotTop, plotBottom, false);
    }
    // ── Horizontal bar hover ──────────────────────────────────────────────────
    drawBarHover(data, opts) {
      const { ctx } = this;
      const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
      const plotLeft = 80;
      const plotTop = 10;
      const plotRight = opts.width - 20;
      const plotBottom = opts.height - legendH - 30;
      const plotH = plotBottom - plotTop;
      const hy = this.hoverY;
      if (hy < plotTop || hy > plotBottom) return;
      const nGroups = data.labels.length;
      if (!nGroups) return;
      const groupH = plotH / Math.max(nGroups, 1);
      const idx = Math.min(Math.floor((hy - plotTop) / groupH), nGroups - 1);
      const crosshairY = plotTop + idx * groupH + groupH / 2;
      ctx.save();
      ctx.strokeStyle = "rgba(100,116,139,0.30)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(plotLeft, crosshairY);
      ctx.lineTo(plotRight, crosshairY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.save();
      ctx.fillStyle = "rgba(100,116,139,0.06)";
      ctx.fillRect(plotLeft, plotTop + idx * groupH, plotRight - plotLeft, groupH);
      ctx.restore();
      this.drawTooltip(data, opts, idx, plotRight - 10, crosshairY, plotTop, plotBottom, true);
    }
    // ── Tooltip ───────────────────────────────────────────────────────────────
    drawTooltip(data, opts, idx, anchorX, anchorY, plotTop, plotBottom, fromRight) {
      const { ctx } = this;
      const xLabel = data.labels[idx] ?? "";
      const rows = data.datasets.filter((_, i) => (this.seriesScales[i] ?? 1) > 0.05).map((ds) => ({
        color: ds.color ?? APEX_COLORS[0],
        label: ds.label,
        value: this.formatNum(ds.data[idx] ?? 0)
      }));
      const PAD = 10;
      const LINE = 18;
      const SW = 8;
      const GAP = 7;
      ctx.font = `600 ${opts.fontSize}px ${opts.fontFamily}`;
      const headerW = ctx.measureText(xLabel).width;
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      const maxValueW = Math.max(...rows.map((r) => {
        ctx.font = `600 ${opts.fontSize}px ${opts.fontFamily}`;
        const vw = ctx.measureText(r.value).width;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        const lw = ctx.measureText(this.truncate(r.label, 16)).width;
        return SW + GAP + lw + 16 + vw;
      }), 0);
      const tooltipW = Math.max(headerW, maxValueW) + PAD * 2;
      const tooltipH = PAD * 2 + LINE + rows.length * LINE + (rows.length > 0 ? 4 : 0);
      let tx;
      if (fromRight) {
        tx = anchorX - tooltipW - 14;
      } else {
        tx = anchorX + 14;
        if (tx + tooltipW > opts.width - 8) tx = anchorX - tooltipW - 14;
      }
      tx = Math.max(4, tx);
      const midY = anchorY !== null ? anchorY : (plotTop + plotBottom) / 2;
      let ty = midY - tooltipH / 2;
      ty = Math.max(plotTop, Math.min(ty, plotBottom - tooltipH));
      ty = Math.max(4, ty);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = opts.backgroundColor === "transparent" ? "#fff" : opts.backgroundColor;
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tooltipW, tooltipH, 6);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = `600 ${opts.fontSize}px ${opts.fontFamily}`;
      ctx.fillStyle = opts.textColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(xLabel, tx + PAD, ty + PAD + LINE / 2);
      ctx.strokeStyle = "rgba(0,0,0,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + PAD, ty + PAD + LINE);
      ctx.lineTo(tx + tooltipW - PAD, ty + PAD + LINE);
      ctx.stroke();
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      for (let i = 0; i < rows.length; i++) {
        const ry = ty + PAD + LINE + 4 + i * LINE + LINE / 2;
        ctx.fillStyle = rows[i].color;
        ctx.beginPath();
        ctx.roundRect(tx + PAD, ry - SW / 2, SW, SW, 2);
        ctx.fill();
        ctx.fillStyle = opts.textColor;
        ctx.textAlign = "left";
        ctx.fillText(this.truncate(rows[i].label, 16), tx + PAD + SW + GAP, ry);
        ctx.font = `600 ${opts.fontSize}px ${opts.fontFamily}`;
        ctx.fillStyle = rows[i].color;
        ctx.textAlign = "right";
        ctx.fillText(rows[i].value, tx + tooltipW - PAD, ry);
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      }
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }
    // ── Animation ────────────────────────────────────────────────────────────
    animate(data, options) {
      this.animProgress = 0;
      const start = performance.now();
      const tick = (now) => {
        const elapsed = now - start;
        this.animProgress = Math.min(1, elapsed / options.animationDuration);
        const eased = this.easeOutQuart(this.animProgress);
        this.draw(data, options, eased);
        if (this.animProgress < 1) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.rafId = null;
        }
      };
      this.rafId = requestAnimationFrame(tick);
    }
    getPlotArea(opts, data) {
      const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
      const plotLeft = 65;
      const plotTop = 20;
      const plotRight = opts.width - 20;
      const plotBottom = opts.height - legendH - 36;
      return {
        plotLeft,
        plotTop,
        plotRight,
        plotBottom,
        plotW: plotRight - plotLeft,
        plotH: plotBottom - plotTop,
        legendH
      };
    }
    draw(data, options, progress = 1) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (options.backgroundColor !== "transparent") {
        this.ctx.fillStyle = options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      let type = options.type;
      if (type === "bar") type = "column-grouped";
      switch (type) {
        case "column-grouped":
          this.drawColumnGrouped(data, options, progress);
          break;
        case "column-stacked":
          this.drawColumnStacked(data, options, progress);
          break;
        case "column-100stacked":
          this.drawColumn100Stacked(data, options, progress);
          break;
        case "bar-grouped":
          this.drawBarGrouped(data, options, progress);
          break;
        case "bar-stacked":
          this.drawBarStacked(data, options, progress);
          break;
        case "bar-100stacked":
          this.drawBar100Stacked(data, options, progress);
          break;
        case "line":
          this.drawLine(data, options, progress);
          break;
        case "area":
          this.drawArea(data, options, progress);
          break;
        case "pie":
          this.drawPie(data, options, progress, false);
          break;
        case "doughnut":
          this.drawPie(data, options, progress, true);
          break;
        case "scatter":
          this.drawScatter(data, options, progress);
          break;
        case "polar":
          this.drawPolar(data, options, progress);
          break;
        case "funnel":
          this.drawFunnel(data, options, progress);
          break;
        default:
          this.drawColumnGrouped(data, options, progress);
          break;
      }
      if (options.showLegend && data.datasets.length > 1) {
        this.drawLegend(data, options);
      }
    }
    // ── Column Grouped ──────────────────────────────────────────────────────────
    drawColumnGrouped(data, opts, progress) {
      const { ctx } = this;
      const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);
      const nDatasets = data.datasets.length;
      const usePerSeries = nDatasets > 1;
      const seriesMaxes = data.datasets.map((ds) => this.niceMax(Math.max(...ds.data, 0)));
      const globalRawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
      const globalMax = this.niceMax(globalRawMax);
      if (opts.showGrid) {
        if (usePerSeries) this.drawGridLinesRelative(plotLeft, plotTop, plotW, plotH, opts);
        else this.drawGridLines(plotLeft, plotTop, plotW, plotH, globalMax, opts);
      } else {
        this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
      }
      const nGroups = data.labels.length;
      const groupWidth = plotW / Math.max(nGroups, 1);
      const barW = groupWidth * opts.barWidth / nDatasets;
      const labelStep = this.getLabelStep(nGroups, plotW, opts.fontSize);
      const rotateLabels = nGroups > 8;
      const labelAlpha = Math.min(1, progress * 2.5);
      for (let gi = 0; gi < nGroups; gi++) {
        const groupX = plotLeft + gi * groupWidth + groupWidth * (1 - opts.barWidth) / 2;
        for (let di = 0; di < nDatasets; di++) {
          const value = data.datasets[di].data[gi] ?? 0;
          const maxForSeries = usePerSeries ? seriesMaxes[di] || 1 : globalMax;
          const seriesScale = this.seriesScales[di] ?? 1;
          const barH = value / maxForSeries * plotH * progress * seriesScale;
          const barX = groupX + di * barW;
          const barY = plotBottom - barH;
          ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
          ctx.beginPath();
          ctx.roundRect(barX, barY, Math.max(barW - 1, 1), Math.max(barH, 0), [3, 3, 0, 0]);
          ctx.fill();
        }
        if (gi % labelStep === 0) {
          ctx.save();
          ctx.globalAlpha = labelAlpha;
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          const labelX = groupX + groupWidth * opts.barWidth * 0.5;
          const labelY = plotBottom + 14;
          if (rotateLabels) {
            ctx.translate(labelX, labelY);
            ctx.rotate(Math.PI / 4);
            ctx.textAlign = "left";
            ctx.fillText(this.truncate(data.labels[gi], 12), 0, 0);
          } else {
            ctx.textAlign = "center";
            ctx.fillText(this.truncate(data.labels[gi], 12), labelX, labelY);
          }
          ctx.restore();
        }
      }
    }
    // ── Column Stacked ──────────────────────────────────────────────────────────
    drawColumnStacked(data, opts, progress) {
      const { ctx } = this;
      const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);
      const stackTotals = data.labels.map(
        (_, gi) => data.datasets.reduce((sum, ds) => sum + (ds.data[gi] ?? 0), 0)
      );
      const rawMax = Math.max(...stackTotals, 0);
      const maxVal = this.niceMax(rawMax);
      if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, maxVal, opts);
      else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
      const nGroups = data.labels.length;
      const groupWidth = plotW / Math.max(nGroups, 1);
      const barW = groupWidth * opts.barWidth;
      const labelStep = this.getLabelStep(nGroups, plotW, opts.fontSize);
      const labelAlpha = Math.min(1, progress * 2.5);
      for (let gi = 0; gi < nGroups; gi++) {
        const barX = plotLeft + gi * groupWidth + (groupWidth - barW) / 2;
        let currentY = plotBottom;
        for (let di = 0; di < data.datasets.length; di++) {
          const value = data.datasets[di].data[gi] ?? 0;
          const segH = value / maxVal * plotH * progress;
          const segY = currentY - segH;
          ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
          ctx.beginPath();
          if (di === data.datasets.length - 1) {
            ctx.roundRect(barX, segY, Math.max(barW, 1), Math.max(segH, 0), [3, 3, 0, 0]);
          } else {
            ctx.rect(barX, segY, Math.max(barW, 1), Math.max(segH, 0));
          }
          ctx.fill();
          currentY -= segH;
        }
        if (gi % labelStep === 0) {
          ctx.globalAlpha = labelAlpha;
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = "center";
          ctx.fillText(this.truncate(data.labels[gi], 12), barX + barW / 2, plotBottom + 14);
          ctx.globalAlpha = 1;
        }
      }
    }
    // ── Column 100% Stacked ─────────────────────────────────────────────────────
    drawColumn100Stacked(data, opts, progress) {
      const { ctx } = this;
      const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);
      if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, 100, opts);
      else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
      const nGroups = data.labels.length;
      const groupWidth = plotW / Math.max(nGroups, 1);
      const barW = groupWidth * opts.barWidth;
      const labelStep = this.getLabelStep(nGroups, plotW, opts.fontSize);
      const labelAlpha = Math.min(1, progress * 2.5);
      for (let gi = 0; gi < nGroups; gi++) {
        const total = data.datasets.reduce((sum, ds) => sum + (ds.data[gi] ?? 0), 0) || 1;
        const barX = plotLeft + gi * groupWidth + (groupWidth - barW) / 2;
        let currentY = plotBottom;
        for (let di = 0; di < data.datasets.length; di++) {
          const value = data.datasets[di].data[gi] ?? 0;
          const segH = value / total * plotH * progress;
          const segY = currentY - segH;
          ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
          ctx.beginPath();
          if (di === data.datasets.length - 1) {
            ctx.roundRect(barX, segY, Math.max(barW, 1), Math.max(segH, 0), [3, 3, 0, 0]);
          } else {
            ctx.rect(barX, segY, Math.max(barW, 1), Math.max(segH, 0));
          }
          ctx.fill();
          currentY -= segH;
        }
        if (gi % labelStep === 0) {
          ctx.globalAlpha = labelAlpha;
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = "center";
          ctx.fillText(this.truncate(data.labels[gi], 12), barX + barW / 2, plotBottom + 14);
          ctx.globalAlpha = 1;
        }
      }
    }
    // ── Bar Grouped (horizontal) ────────────────────────────────────────────────
    drawBarGrouped(data, opts, progress) {
      const { ctx } = this;
      const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
      const labelAreaW = 80;
      const plotLeft = labelAreaW;
      const plotTop = 10;
      const plotRight = opts.width - 20;
      const plotBottom = opts.height - legendH - 30;
      const plotW = plotRight - plotLeft;
      const plotH = plotBottom - plotTop;
      const nDatasets = data.datasets.length;
      const usePerSeries = nDatasets > 1;
      const seriesMaxes = data.datasets.map((ds) => this.niceMax(Math.max(...ds.data, 0)));
      const globalRawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
      const globalMax = this.niceMax(globalRawMax);
      const labelAlpha = Math.min(1, progress * 2.5);
      if (opts.showGrid) {
        const steps = 5;
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (let i = 0; i <= steps; i++) {
          const x = plotLeft + i / steps * plotW;
          ctx.beginPath();
          ctx.moveTo(x, plotTop);
          ctx.lineTo(x, plotBottom);
          ctx.stroke();
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = "center";
          const xLabel = usePerSeries ? `${Math.round(100 * i / steps)}%` : this.formatNum(globalMax * i / steps);
          ctx.fillText(xLabel, x, plotBottom + 14);
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(plotLeft, plotTop);
        ctx.lineTo(plotLeft, plotBottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(plotLeft, plotBottom);
        ctx.lineTo(plotRight, plotBottom);
        ctx.stroke();
      } else {
        this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
      }
      const nGroups = data.labels.length;
      const groupH = plotH / Math.max(nGroups, 1);
      const barH = groupH * opts.barWidth / nDatasets;
      const labelStep = this.getLabelStep(nGroups, plotH, opts.fontSize);
      for (let gi = 0; gi < nGroups; gi++) {
        const groupY = plotTop + gi * groupH + groupH * (1 - opts.barWidth) / 2;
        for (let di = 0; di < nDatasets; di++) {
          const value = data.datasets[di].data[gi] ?? 0;
          const maxForSeries = usePerSeries ? seriesMaxes[di] || 1 : globalMax;
          const seriesScale = this.seriesScales[di] ?? 1;
          const barW = value / maxForSeries * plotW * progress * seriesScale;
          const barY = groupY + di * barH;
          ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
          ctx.beginPath();
          ctx.roundRect(plotLeft, barY, Math.max(barW, 0), Math.max(barH - 1, 1), [0, 3, 3, 0]);
          ctx.fill();
        }
        if (gi % labelStep === 0) {
          ctx.globalAlpha = labelAlpha;
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = "right";
          ctx.fillText(this.truncate(data.labels[gi], 10), labelAreaW - 6, groupY + groupH * opts.barWidth * 0.5 + opts.fontSize / 3);
          ctx.globalAlpha = 1;
        }
      }
    }
    // ── Bar Stacked (horizontal) ────────────────────────────────────────────────
    drawBarStacked(data, opts, progress) {
      const { ctx } = this;
      const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
      const labelAreaW = 80;
      const plotLeft = labelAreaW;
      const plotTop = 10;
      const plotRight = opts.width - 20;
      const plotBottom = opts.height - legendH - 30;
      const plotW = plotRight - plotLeft;
      const plotH = plotBottom - plotTop;
      const stackTotals = data.labels.map(
        (_, gi) => data.datasets.reduce((sum, ds) => sum + (ds.data[gi] ?? 0), 0)
      );
      const rawMax = Math.max(...stackTotals, 0);
      const maxVal = this.niceMax(rawMax);
      const labelAlpha = Math.min(1, progress * 2.5);
      if (opts.showGrid) {
        const steps = 5;
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (let i = 0; i <= steps; i++) {
          const x = plotLeft + i / steps * plotW;
          ctx.beginPath();
          ctx.moveTo(x, plotTop);
          ctx.lineTo(x, plotBottom);
          ctx.stroke();
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = "center";
          ctx.fillText(this.formatNum(maxVal * i / steps), x, plotBottom + 14);
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(plotLeft, plotTop);
        ctx.lineTo(plotLeft, plotBottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(plotLeft, plotBottom);
        ctx.lineTo(plotRight, plotBottom);
        ctx.stroke();
      } else {
        this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
      }
      const nGroups = data.labels.length;
      const groupH = plotH / Math.max(nGroups, 1);
      const barH = groupH * opts.barWidth;
      const labelStep = this.getLabelStep(nGroups, plotH, opts.fontSize);
      for (let gi = 0; gi < nGroups; gi++) {
        const barY = plotTop + gi * groupH + (groupH - barH) / 2;
        let currentX = plotLeft;
        for (let di = 0; di < data.datasets.length; di++) {
          const value = data.datasets[di].data[gi] ?? 0;
          const segW = value / maxVal * plotW * progress;
          ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
          ctx.beginPath();
          if (di === data.datasets.length - 1) {
            ctx.roundRect(currentX, barY, Math.max(segW, 0), Math.max(barH, 1), [0, 3, 3, 0]);
          } else {
            ctx.rect(currentX, barY, Math.max(segW, 0), Math.max(barH, 1));
          }
          ctx.fill();
          currentX += segW;
        }
        if (gi % labelStep === 0) {
          ctx.globalAlpha = labelAlpha;
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = "right";
          ctx.fillText(this.truncate(data.labels[gi], 10), labelAreaW - 6, barY + barH / 2 + opts.fontSize / 3);
          ctx.globalAlpha = 1;
        }
      }
    }
    // ── Bar 100% Stacked (horizontal) ──────────────────────────────────────────
    drawBar100Stacked(data, opts, progress) {
      const { ctx } = this;
      const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
      const labelAreaW = 80;
      const plotLeft = labelAreaW;
      const plotTop = 10;
      const plotRight = opts.width - 20;
      const plotBottom = opts.height - legendH - 30;
      const plotW = plotRight - plotLeft;
      const plotH = plotBottom - plotTop;
      const labelAlpha = Math.min(1, progress * 2.5);
      if (opts.showGrid) {
        const steps = 5;
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (let i = 0; i <= steps; i++) {
          const x = plotLeft + i / steps * plotW;
          ctx.beginPath();
          ctx.moveTo(x, plotTop);
          ctx.lineTo(x, plotBottom);
          ctx.stroke();
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = "center";
          ctx.fillText(`${100 * i / steps}%`, x, plotBottom + 14);
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(plotLeft, plotTop);
        ctx.lineTo(plotLeft, plotBottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(plotLeft, plotBottom);
        ctx.lineTo(plotRight, plotBottom);
        ctx.stroke();
      } else {
        this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
      }
      const nGroups = data.labels.length;
      const groupH = plotH / Math.max(nGroups, 1);
      const barH = groupH * opts.barWidth;
      const labelStep = this.getLabelStep(nGroups, plotH, opts.fontSize);
      for (let gi = 0; gi < nGroups; gi++) {
        const total = data.datasets.reduce((sum, ds) => sum + (ds.data[gi] ?? 0), 0) || 1;
        const barY = plotTop + gi * groupH + (groupH - barH) / 2;
        let currentX = plotLeft;
        for (let di = 0; di < data.datasets.length; di++) {
          const value = data.datasets[di].data[gi] ?? 0;
          const segW = value / total * plotW * progress;
          ctx.fillStyle = data.datasets[di].color ?? APEX_COLORS[di % APEX_COLORS.length];
          ctx.beginPath();
          if (di === data.datasets.length - 1) {
            ctx.roundRect(currentX, barY, Math.max(segW, 0), Math.max(barH, 1), [0, 3, 3, 0]);
          } else {
            ctx.rect(currentX, barY, Math.max(segW, 0), Math.max(barH, 1));
          }
          ctx.fill();
          currentX += segW;
        }
        if (gi % labelStep === 0) {
          ctx.globalAlpha = labelAlpha;
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = "right";
          ctx.fillText(this.truncate(data.labels[gi], 10), labelAreaW - 6, barY + barH / 2 + opts.fontSize / 3);
          ctx.globalAlpha = 1;
        }
      }
    }
    // ── Line ────────────────────────────────────────────────────────────────────
    drawLine(data, opts, progress) {
      const { ctx } = this;
      const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);
      const rawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
      const maxVal = this.niceMax(rawMax);
      const nPoints = data.labels.length;
      const labelAlpha = Math.min(1, progress * 2.5);
      if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, maxVal, opts);
      else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
      const getX = (i) => plotLeft + i / Math.max(1, nPoints - 1) * plotW;
      const getY = (v) => plotBottom - v / maxVal * plotH;
      const visibleCount = Math.max(2, Math.round(nPoints * progress));
      for (const ds of data.datasets) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(plotLeft, plotTop, plotW, plotH + 1);
        ctx.clip();
        ctx.strokeStyle = ds.color ?? APEX_COLORS[0];
        ctx.lineWidth = opts.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
          const x = getX(i);
          const y = getY(ds.data[i] ?? 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
          ctx.beginPath();
          ctx.arc(getX(i), getY(ds.data[i] ?? 0), 3, 0, Math.PI * 2);
          ctx.fillStyle = ds.color ?? APEX_COLORS[0];
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      }
      const labelStep = this.getLabelStep(nPoints, plotW, opts.fontSize);
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = opts.textColor;
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      ctx.textAlign = "center";
      for (let i = 0; i < nPoints; i++) {
        if (i % labelStep === 0) ctx.fillText(this.truncate(data.labels[i], 10), getX(i), plotBottom + 16);
      }
      ctx.globalAlpha = 1;
    }
    // ── Area ────────────────────────────────────────────────────────────────────
    drawArea(data, opts, progress) {
      const { ctx } = this;
      const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);
      const rawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
      const maxVal = this.niceMax(rawMax);
      const nPoints = data.labels.length;
      const labelAlpha = Math.min(1, progress * 2.5);
      if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, maxVal, opts);
      else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
      const getX = (i) => plotLeft + i / Math.max(1, nPoints - 1) * plotW;
      const getY = (v) => plotBottom - v / maxVal * plotH;
      const visibleCount = Math.max(2, Math.round(nPoints * progress));
      for (const ds of data.datasets) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(plotLeft, plotTop, plotW, plotH + 1);
        ctx.clip();
        const color = ds.color ?? APEX_COLORS[0];
        ctx.beginPath();
        for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
          const x = getX(i);
          const y = getY(ds.data[i] ?? 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(getX(Math.min(visibleCount, nPoints) - 1), plotBottom);
        ctx.lineTo(getX(0), plotBottom);
        ctx.closePath();
        ctx.fillStyle = color + "26";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = opts.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
          const x = getX(i);
          const y = getY(ds.data[i] ?? 0);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
      const labelStep = this.getLabelStep(nPoints, plotW, opts.fontSize);
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = opts.textColor;
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      ctx.textAlign = "center";
      for (let i = 0; i < nPoints; i++) {
        if (i % labelStep === 0) ctx.fillText(this.truncate(data.labels[i], 10), getX(i), plotBottom + 16);
      }
      ctx.globalAlpha = 1;
    }
    // ── Pie / Doughnut ──────────────────────────────────────────────────────────
    drawPie(data, opts, progress, isDoughnut) {
      const { ctx } = this;
      const legendH = opts.showLegend ? 40 : 0;
      const cx = opts.width / 2;
      const cy = (opts.height - legendH) / 2;
      const radius = Math.min(opts.width, opts.height - legendH) / 2 - 20;
      const innerRadius = isDoughnut ? radius * 0.5 : 0;
      const values = data.datasets[0]?.data ?? [];
      const total = values.reduce((a, b) => a + b, 0) || 1;
      let startAngle = -Math.PI / 2;
      for (let i = 0; i < values.length; i++) {
        const sliceAngle = values[i] / total * Math.PI * 2 * progress;
        const color = APEX_COLORS[i % APEX_COLORS.length];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        if (innerRadius > 0) ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (progress === 1 && values[i] / total > 0.05) {
          const mid = startAngle + sliceAngle / 2;
          const lr = isDoughnut ? (radius + innerRadius) / 2 : radius * 0.65;
          ctx.fillStyle = "#fff";
          ctx.font = `bold ${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${Math.round(values[i] / total * 100)}%`, cx + Math.cos(mid) * lr, cy + Math.sin(mid) * lr);
          ctx.textBaseline = "alphabetic";
        }
        startAngle += sliceAngle;
      }
      if (progress > 0.9 && opts.showLegend && data.labels.length <= 8) {
        const alpha = (progress - 0.9) / 0.1;
        ctx.globalAlpha = alpha;
        startAngle = -Math.PI / 2;
        for (let i = 0; i < values.length; i++) {
          const sliceAngle = values[i] / total * Math.PI * 2;
          const mid = startAngle + sliceAngle / 2;
          const lx = cx + Math.cos(mid) * (radius + 16);
          const ly = cy + Math.sin(mid) * (radius + 16);
          ctx.fillStyle = opts.textColor;
          ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
          ctx.textAlign = Math.cos(mid) > 0 ? "left" : "right";
          ctx.textBaseline = "middle";
          ctx.fillText(this.truncate(data.labels[i], 12), lx, ly);
          ctx.textBaseline = "alphabetic";
          startAngle += sliceAngle;
        }
        ctx.globalAlpha = 1;
      }
    }
    // ── Scatter ─────────────────────────────────────────────────────────────────
    drawScatter(data, opts, progress) {
      const { ctx } = this;
      const { plotLeft, plotTop, plotBottom, plotRight, plotW, plotH } = this.getPlotArea(opts, data);
      const rawMax = Math.max(...data.datasets.flatMap((d) => d.data), 0);
      const maxVal = this.niceMax(rawMax);
      const nPoints = data.labels.length;
      const labelAlpha = Math.min(1, progress * 2.5);
      if (opts.showGrid) this.drawGridLines(plotLeft, plotTop, plotW, plotH, maxVal, opts);
      else this.drawAxes(plotLeft, plotTop, plotRight, plotBottom, opts);
      const getX = (i) => plotLeft + i / Math.max(1, nPoints - 1) * plotW;
      const getY = (v) => plotBottom - v / maxVal * plotH;
      const visibleCount = Math.round(nPoints * progress);
      for (let di = 0; di < data.datasets.length; di++) {
        const ds = data.datasets[di];
        const color = ds.color ?? APEX_COLORS[di % APEX_COLORS.length];
        for (let i = 0; i < Math.min(visibleCount, nPoints); i++) {
          ctx.beginPath();
          ctx.arc(getX(i), getY(ds.data[i] ?? 0), 5, 0, Math.PI * 2);
          ctx.fillStyle = color + "CC";
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      const labelStep = this.getLabelStep(nPoints, plotW, opts.fontSize);
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = opts.textColor;
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      ctx.textAlign = "center";
      for (let i = 0; i < nPoints; i++) {
        if (i % labelStep === 0) ctx.fillText(this.truncate(data.labels[i], 10), getX(i), plotBottom + 16);
      }
      ctx.globalAlpha = 1;
    }
    // ── Polar / Radar ────────────────────────────────────────────────────────────
    drawPolar(data, opts, progress) {
      const { ctx } = this;
      const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
      const cx = opts.width / 2;
      const cy = (opts.height - legendH) / 2;
      const radius = Math.min(opts.width, opts.height - legendH) / 2 - 30;
      const labels = data.labels;
      const nSpokes = labels.length;
      if (nSpokes < 3) return;
      const allValues = data.datasets.flatMap((d) => d.data);
      const maxVal = this.niceMax(Math.max(...allValues, 0));
      ctx.strokeStyle = opts.gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        const r = ring / 4 * radius;
        for (let i = 0; i < nSpokes; i++) {
          const angle = i / nSpokes * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let i = 0; i < nSpokes; i++) {
        const angle = i / nSpokes * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.stroke();
        ctx.globalAlpha = Math.min(1, progress * 2.5);
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.truncate(labels[i], 10), cx + Math.cos(angle) * (radius + 14), cy + Math.sin(angle) * (radius + 14));
        ctx.textBaseline = "alphabetic";
        ctx.globalAlpha = 1;
      }
      for (let di = 0; di < data.datasets.length; di++) {
        const ds = data.datasets[di];
        const color = ds.color ?? APEX_COLORS[di % APEX_COLORS.length];
        ctx.beginPath();
        for (let i = 0; i < nSpokes; i++) {
          const angle = i / nSpokes * Math.PI * 2 - Math.PI / 2;
          const val = (ds.data[i] ?? 0) / maxVal * radius * progress;
          const x = cx + Math.cos(angle) * val;
          const y = cy + Math.sin(angle) * val;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = color + "33";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    // ── Funnel ──────────────────────────────────────────────────────────────────
    drawFunnel(data, opts, progress) {
      const { ctx } = this;
      const labels = data.labels;
      const values = data.datasets[0]?.data ?? [];
      const maxVal = Math.max(...values, 0) || 1;
      const n = labels.length;
      const legendH = opts.showLegend && data.datasets.length > 1 ? 40 : 0;
      const labelAreaW = 90;
      const plotLeft = labelAreaW;
      const plotRight = opts.width - 20;
      const plotWidth = plotRight - plotLeft;
      const plotTop = 10;
      const plotBottom = opts.height - legendH - 10;
      const plotH = plotBottom - plotTop;
      const itemH = Math.max(plotH / Math.max(n, 1) - 2, 1);
      const cx = plotLeft + plotWidth / 2;
      const labelAlpha = Math.min(1, progress * 2.5);
      for (let i = 0; i < n; i++) {
        const pct = (values[i] ?? 0) / maxVal;
        const barW = pct * plotWidth * progress;
        const barX = cx - barW / 2;
        const barY = plotTop + i * (itemH + 2);
        const color = APEX_COLORS[i % APEX_COLORS.length];
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(barX, barY, Math.max(barW, 0), itemH, 3);
        ctx.fill();
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = "right";
        ctx.fillText(this.truncate(labels[i], 12), labelAreaW - 6, barY + itemH / 2 + opts.fontSize / 3);
        ctx.globalAlpha = 1;
        if (progress === 1 && barW > 50) {
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(this.formatNum(values[i] ?? 0), cx, barY + itemH / 2 + opts.fontSize / 3);
        }
      }
    }
    // ── Grid Lines ──────────────────────────────────────────────────────────────
    drawGridLines(left, top, width, height, maxVal, opts) {
      const { ctx } = this;
      const steps = 5;
      ctx.strokeStyle = opts.gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i <= steps; i++) {
        const y = top + height - i / steps * height;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + width, y);
        ctx.stroke();
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = "right";
        ctx.fillText(this.formatNum(maxVal * i / steps), left - 6, y + 4);
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = opts.gridColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, top + height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left, top + height);
      ctx.lineTo(left + width, top + height);
      ctx.stroke();
    }
    /**
     * Draws relative (0–100 %) Y-axis gridlines for multi-series charts where each
     * dataset is normalised to its own maximum, making the shared axis unitless.
     */
    drawGridLinesRelative(left, top, width, height, opts) {
      const { ctx } = this;
      const steps = 4;
      ctx.strokeStyle = opts.gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i <= steps; i++) {
        const y = top + height - i / steps * height;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + width, y);
        ctx.stroke();
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = "right";
        ctx.fillText(`${Math.round(100 * i / steps)}%`, left - 6, y + 4);
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = opts.gridColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, top + height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left, top + height);
      ctx.lineTo(left + width, top + height);
      ctx.stroke();
    }
    // ── Legend ──────────────────────────────────────────────────────────────────
    drawLegend(data, opts) {
      const { ctx } = this;
      const y = opts.height - 20;
      const totalItems = data.datasets.length;
      const itemWidth = opts.width / totalItems;
      ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (let i = 0; i < totalItems; i++) {
        const x = i * itemWidth + (itemWidth - 80) / 2;
        const color = data.datasets[i].color ?? APEX_COLORS[i % APEX_COLORS.length];
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y - 5, 12, 10, 2);
        ctx.fill();
        ctx.fillStyle = opts.textColor;
        ctx.fillText(this.truncate(data.datasets[i].label, 14), x + 16, y);
      }
      ctx.textBaseline = "alphabetic";
    }
    // ── Helpers ─────────────────────────────────────────────────────────────────
    drawAxes(left, top, right, bottom, opts) {
      const { ctx } = this;
      ctx.setLineDash([]);
      ctx.strokeStyle = opts.gridColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      ctx.lineTo(right, bottom);
      ctx.stroke();
    }
    niceMax(rawMax) {
      if (rawMax <= 0) return 10;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
      const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];
      for (const s of steps) {
        if (s * magnitude >= rawMax) return s * magnitude;
      }
      return 10 * magnitude;
    }
    getLabelStep(count, availablePixels, fontSize) {
      const approxLabelW = fontSize * 5.5;
      return Math.max(1, Math.ceil(count * approxLabelW / availablePixels));
    }
    easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }
    truncate(str, max) {
      return str.length > max ? str.slice(0, max - 1) + "\u2026" : str;
    }
    formatNum(n) {
      if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + "M";
      if (n >= 1e3) return (n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1) + "K";
      if (n !== Math.floor(n)) return n.toFixed(1);
      return String(Math.round(n));
    }
  };

  // src/renderer/dom-utils.ts
  function createDiv(className, cssText) {
    const el = document.createElement("div");
    if (className) el.className = className;
    if (cssText) el.style.cssText = cssText;
    return el;
  }
  function toggleClass(el, cls, condition) {
    if (condition) {
      el.classList.add(cls);
    } else {
      el.classList.remove(cls);
    }
  }

  // src/chart/chart-engine.ts
  var ChartEngine = class {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.charts = /* @__PURE__ */ new Map();
      this.transformer = new ChartDataTransformer();
    }
    createChart(parentEl, config, rows, columns) {
      const existing = this.charts.get(config.chartId);
      if (existing) {
        this.destroyChart(config.chartId);
      }
      const containerEl = createDiv("pg-chart");
      containerEl.setAttribute("data-chart-id", config.chartId);
      if (config.title) {
        const titleEl = createDiv("pg-chart__title");
        titleEl.textContent = config.title;
        containerEl.appendChild(titleEl);
      }
      const canvas = document.createElement("canvas");
      canvas.className = "pg-chart__canvas";
      containerEl.appendChild(canvas);
      parentEl.appendChild(containerEl);
      const chartRenderer = new ChartRenderer(canvas);
      const activeChart = {
        config,
        containerEl,
        canvas,
        renderer: chartRenderer
      };
      this.charts.set(config.chartId, activeChart);
      this.renderChart(config.chartId, rows, columns);
      this.eventBus.emit(GridEventType.CHART_CREATED, { chartId: config.chartId });
      return config.chartId;
    }
    renderChart(chartId, rows, columns) {
      const chart = this.charts.get(chartId);
      if (!chart) return;
      const { config } = chart;
      let chartData;
      if (config.labelColId && config.valueColIds) {
        chartData = this.transformer.fromSelectedColumns(
          rows,
          columns,
          config.labelColId,
          config.valueColIds
        );
      } else {
        const firstLabelCol = columns.find((c) => c.type === "string" || c.type === "dropdown");
        const numberCols = columns.filter((c) => c.type === "number" || c.type === "currency");
        if (!firstLabelCol || numberCols.length === 0) return;
        chartData = this.transformer.transform(rows, {
          labelField: firstLabelCol.field,
          valueFields: numberCols.slice(0, 3).map((c) => c.field),
          ...config.transformOptions
        });
      }
      chart.renderer.render(chartData, {
        type: config.type,
        width: config.width ?? 600,
        height: config.height ?? 320,
        ...config.renderOptions
      });
    }
    updateChartData(chartId, rows, columns) {
      this.renderChart(chartId, rows, columns);
    }
    destroyChart(chartId) {
      const chart = this.charts.get(chartId);
      if (!chart) return;
      chart.renderer.destroy();
      chart.containerEl.remove();
      this.charts.delete(chartId);
      this.eventBus.emit(GridEventType.CHART_DESTROYED, { chartId });
    }
    destroyAll() {
      for (const chartId of this.charts.keys()) {
        this.destroyChart(chartId);
      }
    }
    getChart(chartId) {
      return this.charts.get(chartId);
    }
    getAllChartIds() {
      return Array.from(this.charts.keys());
    }
    exportChartAsImage(chartId, format = "png") {
      const chart = this.charts.get(chartId);
      if (!chart) return null;
      return chart.canvas.toDataURL(`image/${format}`, 0.95);
    }
  };

  // src/chart/chart-panel.ts
  var ICON_EMPTY_CHART = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/><line x1="7" y1="15" x2="7" y2="17"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="17" y1="14" x2="17" y2="17"/></svg>`;
  var ICON_CLOSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  var ICON_FULLSCREEN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
  var ICON_FULLSCREEN_EXIT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
  var ICON_DOTS = `<svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/></svg>`;
  var ICON_DOWNLOAD = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  var ChartPanel = class {
    constructor(containerEl) {
      this.containerEl = containerEl;
      this.backdropEl = null;
      this.cardEl = null;
      this.canvasEl = null;
      this.dotsMenuEl = null;
      this.dotsBtnEl = null;
      this.fullscreenBtnEl = null;
      this.legendEl = null;
      this.renderer = null;
      this.resizeObserver = null;
      this.isFullscreen = false;
      this.currentData = null;
      this.currentType = "column-grouped";
      this.currentTitle = "";
      /** Dataset indices the user has toggled off via the legend. */
      this.hiddenSeries = /* @__PURE__ */ new Set();
      /** Current top-left position of the card within the backdrop. */
      this.panelX = 0;
      this.panelY = 0;
    }
    open(type, title, data) {
      this.close();
      this.currentType = type;
      this.currentTitle = title;
      this.currentData = data;
      this.isFullscreen = false;
      this.hiddenSeries = /* @__PURE__ */ new Set();
      this.buildDom(title, data === null);
      if (data !== null) {
        if (data.datasets.length > 1) this.buildLegend(data);
        this.renderChart();
      }
    }
    close() {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.renderer?.destroy();
      this.renderer = null;
      this.backdropEl?.remove();
      this.backdropEl = null;
      this.cardEl = null;
      this.canvasEl = null;
      this.dotsMenuEl = null;
      this.dotsBtnEl = null;
      this.fullscreenBtnEl = null;
      this.legendEl = null;
      this.currentData = null;
    }
    buildDom(title, isEmpty) {
      const backdrop = document.createElement("div");
      backdrop.className = "pg-chart-panel-backdrop pg-chart-panel-backdrop--open";
      backdrop.addEventListener("mousedown", (e) => {
        if (e.target === backdrop) this.close();
      });
      const card = document.createElement("div");
      card.className = "pg-chart-panel";
      backdrop.appendChild(card);
      const header = document.createElement("div");
      header.className = "pg-chart-panel__header";
      const titleEl = document.createElement("div");
      titleEl.className = "pg-chart-panel__title";
      titleEl.textContent = isEmpty ? "Chart Range" : title;
      const actions = document.createElement("div");
      actions.className = "pg-chart-panel__actions";
      const fullscreenBtn = document.createElement("button");
      fullscreenBtn.className = "pg-chart-panel__action-btn";
      fullscreenBtn.title = "Toggle fullscreen";
      fullscreenBtn.innerHTML = ICON_FULLSCREEN;
      fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());
      const closeBtn = document.createElement("button");
      closeBtn.className = "pg-chart-panel__action-btn";
      closeBtn.title = "Close";
      closeBtn.innerHTML = ICON_CLOSE;
      closeBtn.addEventListener("click", () => this.close());
      actions.appendChild(fullscreenBtn);
      actions.appendChild(closeBtn);
      header.appendChild(titleEl);
      header.appendChild(actions);
      card.appendChild(header);
      const body = document.createElement("div");
      body.className = "pg-chart-panel__body";
      if (isEmpty) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "pg-chart-panel__empty";
        emptyEl.innerHTML = `
        <span class="pg-chart-panel__empty-icon">${ICON_EMPTY_CHART}</span>
        <span class="pg-chart-panel__empty-text">No chart data available</span>
        <span class="pg-chart-panel__empty-sub">Select cells that include Number, Currency, or Percentage columns</span>
      `;
        body.appendChild(emptyEl);
      } else {
        const canvas = document.createElement("canvas");
        canvas.className = "pg-chart-panel__canvas";
        body.appendChild(canvas);
        const dotsBtn = document.createElement("button");
        dotsBtn.className = "pg-chart-panel__dots-btn";
        dotsBtn.title = "Download";
        dotsBtn.innerHTML = ICON_DOTS;
        const dotsMenu = document.createElement("div");
        dotsMenu.className = "pg-chart-panel__dots-menu";
        const pngItem = document.createElement("button");
        pngItem.className = "pg-chart-panel__dots-item";
        pngItem.innerHTML = `${ICON_DOWNLOAD} Download PNG`;
        pngItem.addEventListener("click", () => {
          this.downloadChart("png");
          this.closeDotsMenu();
        });
        const jpegItem = document.createElement("button");
        jpegItem.className = "pg-chart-panel__dots-item";
        jpegItem.innerHTML = `${ICON_DOWNLOAD} Download JPEG`;
        jpegItem.addEventListener("click", () => {
          this.downloadChart("jpeg");
          this.closeDotsMenu();
        });
        dotsMenu.appendChild(pngItem);
        dotsMenu.appendChild(jpegItem);
        dotsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const isOpen = dotsMenu.classList.contains("pg-chart-panel__dots-menu--open");
          if (isOpen) {
            this.closeDotsMenu();
          } else {
            dotsMenu.classList.add("pg-chart-panel__dots-menu--open");
            dotsBtn.classList.add("pg-chart-panel__dots-btn--active");
            setTimeout(() => {
              document.addEventListener("mousedown", () => this.closeDotsMenu(), { once: true });
            });
          }
        });
        body.appendChild(dotsBtn);
        body.appendChild(dotsMenu);
        this.canvasEl = canvas;
        this.dotsMenuEl = dotsMenu;
        this.dotsBtnEl = dotsBtn;
        this.resizeObserver = new ResizeObserver(() => {
          this.renderChart();
        });
        this.resizeObserver.observe(body);
      }
      card.appendChild(body);
      const legend = document.createElement("div");
      legend.className = "pg-chart-panel__legend";
      card.appendChild(legend);
      this.legendEl = legend;
      this.containerEl.appendChild(backdrop);
      this.backdropEl = backdrop;
      this.cardEl = card;
      this.fullscreenBtnEl = fullscreenBtn;
      this.centerPanel();
      this.attachDrag(header);
    }
    /**
     * Position the card at the center of the backdrop.
     * Called once after building the DOM and on fullscreen exit.
     */
    centerPanel() {
      if (!this.backdropEl || !this.cardEl) return;
      const bw = this.backdropEl.offsetWidth;
      const bh = this.backdropEl.offsetHeight;
      const cw = this.cardEl.offsetWidth;
      const ch = this.cardEl.offsetHeight;
      this.panelX = Math.max(0, (bw - cw) / 2);
      this.panelY = Math.max(0, (bh - ch) / 2);
      this.applyPosition();
    }
    applyPosition() {
      if (!this.cardEl) return;
      this.cardEl.style.left = `${this.panelX}px`;
      this.cardEl.style.top = `${this.panelY}px`;
    }
    /**
     * Wire drag-to-move onto the header bar.
     * Clamped strictly within the backdrop bounds so the panel never escapes the grid.
     */
    attachDrag(header) {
      header.addEventListener("mousedown", (e) => {
        if (this.isFullscreen) return;
        if (e.target.closest("button")) return;
        e.preventDefault();
        const startMX = e.clientX;
        const startMY = e.clientY;
        const startPX = this.panelX;
        const startPY = this.panelY;
        header.classList.add("pg-chart-panel__header--dragging");
        this.cardEl?.classList.add("pg-chart-panel--dragging");
        const onMove = (mv) => {
          if (!this.backdropEl || !this.cardEl) return;
          const maxX = this.backdropEl.offsetWidth - this.cardEl.offsetWidth;
          const maxY = this.backdropEl.offsetHeight - this.cardEl.offsetHeight;
          this.panelX = Math.max(0, Math.min(startPX + mv.clientX - startMX, maxX));
          this.panelY = Math.max(0, Math.min(startPY + mv.clientY - startMY, maxY));
          this.applyPosition();
        };
        const onUp = () => {
          header.classList.remove("pg-chart-panel__header--dragging");
          this.cardEl?.classList.remove("pg-chart-panel--dragging");
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    }
    closeDotsMenu() {
      this.dotsMenuEl?.classList.remove("pg-chart-panel__dots-menu--open");
      this.dotsBtnEl?.classList.remove("pg-chart-panel__dots-btn--active");
    }
    toggleFullscreen() {
      if (!this.cardEl || !this.fullscreenBtnEl) return;
      this.isFullscreen = !this.isFullscreen;
      this.cardEl.classList.toggle("pg-chart-panel--fullscreen", this.isFullscreen);
      this.fullscreenBtnEl.innerHTML = this.isFullscreen ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN;
      this.fullscreenBtnEl.title = this.isFullscreen ? "Exit fullscreen" : "Toggle fullscreen";
      if (this.isFullscreen) {
        this.panelX = 0;
        this.panelY = 0;
        this.applyPosition();
      } else {
        setTimeout(() => {
          this.centerPanel();
          this.renderChart();
        }, 50);
        return;
      }
      setTimeout(() => this.renderChart(), 50);
    }
    renderChart() {
      if (!this.canvasEl || !this.currentData || !this.cardEl) return;
      const body = this.canvasEl.parentElement;
      if (!body) return;
      const w = body.clientWidth - 16;
      const h = body.clientHeight - 16;
      if (w <= 0 || h <= 0) return;
      if (!this.renderer) {
        this.renderer = new ChartRenderer(this.canvasEl);
      }
      this.renderer.render(this.currentData, {
        type: this.currentType,
        width: w,
        height: h,
        showLegend: false,
        showGrid: true,
        animationDuration: 400
      });
    }
    /**
     * Populates the HTML legend bar with one clickable button per dataset.
     * Each button acts as a toggle: clicking animates the corresponding bars
     * in or out and dims the legend entry to signal its state.
     */
    buildLegend(data) {
      if (!this.legendEl) return;
      this.legendEl.innerHTML = "";
      data.datasets.forEach((ds, i) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "pg-chart-panel__legend-item";
        const swatch = document.createElement("span");
        swatch.className = "pg-chart-panel__legend-swatch";
        swatch.style.background = ds.color ?? "#008FFB";
        const label = document.createElement("span");
        label.className = "pg-chart-panel__legend-label";
        label.textContent = ds.label;
        item.appendChild(swatch);
        item.appendChild(label);
        item.addEventListener("click", () => this.handleLegendToggle(i));
        this.legendEl.appendChild(item);
      });
    }
    /**
     * Toggles a dataset's visibility with a smooth bar-height animation.
     * The legend item is dimmed while its series is hidden.
     */
    handleLegendToggle(index) {
      if (!this.renderer || !this.currentData || !this.canvasEl) return;
      const body = this.canvasEl.parentElement;
      if (!body) return;
      const w = body.clientWidth - 16;
      const h = body.clientHeight - 16;
      if (w <= 0 || h <= 0) return;
      const nowVisible = this.hiddenSeries.has(index);
      if (nowVisible) {
        this.hiddenSeries.delete(index);
      } else {
        this.hiddenSeries.add(index);
      }
      const item = this.legendEl?.children[index];
      item?.classList.toggle("pg-chart-panel__legend-item--hidden", !nowVisible);
      this.renderer.toggleSeries(index, nowVisible, this.currentData, {
        type: this.currentType,
        width: w,
        height: h,
        showLegend: false,
        showGrid: true,
        animationDuration: 400
      });
    }
    downloadChart(format) {
      if (!this.canvasEl) return;
      let sourceCanvas = this.canvasEl;
      if (format === "jpeg") {
        const offscreen = document.createElement("canvas");
        offscreen.width = this.canvasEl.width;
        offscreen.height = this.canvasEl.height;
        const ctx = offscreen.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, offscreen.width, offscreen.height);
          ctx.drawImage(this.canvasEl, 0, 0);
          sourceCanvas = offscreen;
        }
      }
      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const dataUrl = sourceCanvas.toDataURL(mimeType, 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${this.currentTitle || "chart"}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // src/chart/chart-analyzer/types.ts
  var APEX_COLORS2 = [
    "#008FFB",
    "#00E396",
    "#FEB019",
    "#FF4560",
    "#775DD0",
    "#3F51B5",
    "#03A9F4",
    "#4CAF50",
    "#F9CE1D",
    "#FF9800"
  ];
  var DIMENSION_TYPES = /* @__PURE__ */ new Set(["string", "dropdown", "date", "boolean", "email"]);
  var MEASURE_TYPES = /* @__PURE__ */ new Set(["number", "currency", "percentage"]);
  var DATE_TYPES = /* @__PURE__ */ new Set(["date"]);
  var MAX_CATEGORIES = 50;
  var PIE_MAX_SLICES = 10;

  // src/chart/chart-analyzer/dimension-analyzer.ts
  var DimensionAnalyzer = class {
    analyze(columns, rows) {
      const dimCols = columns.filter((c) => DIMENSION_TYPES.has(c.type));
      return dimCols.map((col) => {
        const seen = /* @__PURE__ */ new Set();
        for (const row of rows) {
          if (row.type !== "data") continue;
          const raw = row.data[col.field];
          seen.add(raw == null ? "" : String(raw));
        }
        const isDate = DATE_TYPES.has(col.type);
        const isBoolean = col.type === "boolean";
        const isHighCardinality = seen.size > 20;
        const uniqueValues = Array.from(seen).slice(0, MAX_CATEGORIES);
        return {
          column: col,
          role: isDate ? "date" : isBoolean ? "boolean" : "category",
          uniqueValues,
          uniqueCount: seen.size,
          isHighCardinality,
          isDate
        };
      });
    }
  };

  // src/chart/chart-analyzer/measure-analyzer.ts
  var MeasureAnalyzer = class {
    analyze(columns, rows) {
      const measCols = columns.filter((c) => MEASURE_TYPES.has(c.type));
      return measCols.map((col) => {
        const allValues = [];
        for (const row of rows) {
          if (row.type !== "data") continue;
          const v = Number(row.data[col.field]);
          if (!isNaN(v)) allValues.push(v);
        }
        if (!allValues.length) {
          return { column: col, min: 0, max: 0, sum: 0, avg: 0, count: 0, hasNegatives: false, allValues };
        }
        let min = allValues[0];
        let max = allValues[0];
        let sum = 0;
        for (const v of allValues) {
          if (v < min) min = v;
          if (v > max) max = v;
          sum += v;
        }
        return {
          column: col,
          min,
          max,
          sum,
          avg: sum / allValues.length,
          count: allValues.length,
          hasNegatives: min < 0,
          allValues
        };
      });
    }
  };

  // src/chart/chart-analyzer/cardinality-analyzer.ts
  var CardinalityAnalyzer = class {
    /** @param topN  Max number of top-frequency values to return */
    analyze(column, rows, topN = 20) {
      const freq = /* @__PURE__ */ new Map();
      for (const row of rows) {
        if (row.type !== "data") continue;
        const raw = row.data[column.field];
        const key = raw == null ? "" : String(raw);
        freq.set(key, (freq.get(key) ?? 0) + 1);
      }
      const topValues = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([k]) => k);
      return {
        uniqueCount: freq.size,
        isHighCardinality: freq.size > 20,
        topValues
      };
    }
  };

  // src/chart/chart-analyzer/aggregation-analyzer.ts
  var AggregationAnalyzer = class {
    aggregate(dimensionCol, measureCols, rows, strategy = "sum") {
      const labelOrder = [];
      const labelSeen = /* @__PURE__ */ new Set();
      const acc = /* @__PURE__ */ new Map();
      for (const mc of measureCols) acc.set(mc.field, /* @__PURE__ */ new Map());
      for (const row of rows) {
        if (row.type !== "data") continue;
        const raw = row.data[dimensionCol.field];
        const label = raw == null ? "" : String(raw);
        if (!labelSeen.has(label)) {
          labelSeen.add(label);
          labelOrder.push(label);
        }
        for (const mc of measureCols) {
          const v = Number(row.data[mc.field]);
          const safeV = isNaN(v) ? 0 : v;
          const colMap = acc.get(mc.field);
          const existing = colMap.get(label);
          if (existing) {
            existing.sum += safeV;
            existing.count++;
            if (safeV < existing.min) existing.min = safeV;
            if (safeV > existing.max) existing.max = safeV;
          } else {
            colMap.set(label, { sum: safeV, count: 1, first: safeV, min: safeV, max: safeV });
          }
        }
      }
      const labels = labelOrder.slice(0, MAX_CATEGORIES);
      const seriesData = /* @__PURE__ */ new Map();
      for (const mc of measureCols) {
        const colMap = acc.get(mc.field);
        seriesData.set(
          mc.field,
          labels.map((l) => {
            const e = colMap.get(l);
            if (!e) return 0;
            switch (strategy) {
              case "avg":
                return e.count > 0 ? e.sum / e.count : 0;
              case "count":
                return e.count;
              case "first":
                return e.first;
              case "min":
                return e.min;
              case "max":
                return e.max;
              default:
                return e.sum;
            }
          })
        );
      }
      return { labels, seriesData };
    }
  };

  // src/chart/chart-analyzer/histogram-analyzer.ts
  var HistogramAnalyzer = class {
    analyze(measures) {
      if (!measures.length) return null;
      const measure = measures[0];
      const values = measure.allValues.filter((v) => !isNaN(v));
      if (!values.length) return null;
      const binCount = Math.min(Math.max(Math.ceil(Math.log2(values.length) + 1), 5), 20);
      const range = measure.max - measure.min || 1;
      const binSize = range / binCount;
      const bins = [];
      for (let i = 0; i < binCount; i++) {
        bins.push({ start: measure.min + i * binSize, end: measure.min + (i + 1) * binSize, count: 0 });
      }
      for (const v of values) {
        const idx = Math.min(Math.floor((v - measure.min) / binSize), binCount - 1);
        if (idx >= 0) bins[idx].count++;
      }
      return {
        title: `${measure.column.header} Distribution`,
        data: {
          labels: bins.map((b) => this.fmtRange(b.start, b.end)),
          datasets: [{ label: "Frequency", data: bins.map((b) => b.count), color: APEX_COLORS2[0] }]
        }
      };
    }
    fmtRange(start, end) {
      const f = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : Number.isInteger(n) ? String(n) : n.toFixed(1);
      return `${f(start)}\u2013${f(end)}`;
    }
  };

  // src/chart/chart-analyzer/scatter-analyzer.ts
  var _ScatterAnalyzer = class _ScatterAnalyzer {
    analyze(dimensions, measures, rows) {
      if (measures.length < 2) return null;
      const [xMeasure, yMeasure] = measures;
      const seriesDim = dimensions[0] ?? null;
      const dataRows = rows.filter((r) => r.type === "data").slice(0, _ScatterAnalyzer.MAX_POINTS);
      const title = `${yMeasure.column.header} vs ${xMeasure.column.header}`;
      if (seriesDim) {
        const groups = /* @__PURE__ */ new Map();
        for (const row of dataRows) {
          const key = String(row.data[seriesDim.column.field] ?? "");
          const x = Number(row.data[xMeasure.column.field]);
          const y = Number(row.data[yMeasure.column.field]);
          if (isNaN(x) || isNaN(y)) continue;
          if (!groups.has(key)) groups.set(key, { xs: [], ys: [] });
          groups.get(key).xs.push(x);
          groups.get(key).ys.push(y);
        }
        const keys = Array.from(groups.keys()).slice(0, _ScatterAnalyzer.MAX_SERIES);
        const allXs = dataRows.map((r) => Number(r.data[xMeasure.column.field])).filter((v) => !isNaN(v));
        return {
          title: `${title} by ${seriesDim.column.header}`,
          data: {
            labels: allXs.map(String),
            datasets: keys.map((key, i) => ({
              label: key,
              data: groups.get(key).ys,
              color: APEX_COLORS2[i % APEX_COLORS2.length]
            }))
          }
        };
      }
      return {
        title,
        data: {
          labels: dataRows.map((r) => {
            const x = Number(r.data[xMeasure.column.field]);
            return isNaN(x) ? "" : String(x);
          }),
          datasets: [{
            label: yMeasure.column.header,
            data: dataRows.map((r) => {
              const y = Number(r.data[yMeasure.column.field]);
              return isNaN(y) ? 0 : y;
            }),
            color: APEX_COLORS2[0]
          }]
        }
      };
    }
  };
  _ScatterAnalyzer.MAX_POINTS = 200;
  _ScatterAnalyzer.MAX_SERIES = 6;
  var ScatterAnalyzer = _ScatterAnalyzer;

  // src/chart/chart-analyzer/bubble-analyzer.ts
  var _BubbleAnalyzer = class _BubbleAnalyzer {
    analyze(dimensions, measures, rows) {
      if (measures.length < 2) return null;
      const [xM, yM, sizeM] = measures;
      const seriesDim = dimensions[0] ?? null;
      const dataRows = rows.filter((r) => r.type === "data").slice(0, _BubbleAnalyzer.MAX_POINTS);
      const sizeRange = sizeM ? sizeM.max - sizeM.min || 1 : 1;
      const getY = (row) => {
        const v = Number(row.data[yM.column.field]);
        return isNaN(v) ? 0 : v;
      };
      const baseTitle = sizeM ? `${yM.column.header} vs ${xM.column.header} (size: ${sizeM.column.header})` : `${yM.column.header} vs ${xM.column.header}`;
      if (seriesDim) {
        const groups = /* @__PURE__ */ new Map();
        for (const row of dataRows) {
          const key = String(row.data[seriesDim.column.field] ?? "");
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(row);
        }
        const keys = Array.from(groups.keys()).slice(0, _BubbleAnalyzer.MAX_SERIES);
        return {
          title: `${baseTitle} by ${seriesDim.column.header}`,
          data: {
            labels: dataRows.map((r) => String(r.data[xM.column.field] ?? "")),
            datasets: keys.map((key, i) => ({
              label: key,
              data: groups.get(key).map(getY),
              color: APEX_COLORS2[i % APEX_COLORS2.length]
            }))
          }
        };
      }
      return {
        title: baseTitle,
        data: {
          labels: dataRows.map((r) => String(r.data[xM.column.field] ?? "")),
          datasets: [{
            label: yM.column.header,
            data: dataRows.map(getY),
            color: APEX_COLORS2[0]
          }]
        }
      };
    }
  };
  _BubbleAnalyzer.MAX_POINTS = 100;
  _BubbleAnalyzer.MAX_SERIES = 5;
  var BubbleAnalyzer = _BubbleAnalyzer;

  // src/chart/chart-analyzer/pie-analyzer.ts
  var PieAnalyzer = class {
    analyze(dimensions, measures, rows, agg) {
      if (!measures.length) return null;
      const dim = dimensions[0] ?? null;
      const measure = measures[0];
      if (!dim) {
        const sliceRows = rows.filter((r) => r.type === "data").slice(0, PIE_MAX_SLICES);
        return {
          title: `${measure.column.header} Distribution`,
          data: {
            labels: sliceRows.map((_, i) => `Row ${i + 1}`),
            datasets: [{
              label: measure.column.header,
              data: sliceRows.map((r) => {
                const v = Number(r.data[measure.column.field]);
                return isNaN(v) ? 0 : v;
              }),
              color: APEX_COLORS2[0]
            }]
          }
        };
      }
      const aggregated = agg.aggregate(dim.column, [measure.column], rows);
      const measureData = aggregated.seriesData.get(measure.column.field) ?? [];
      const pairs = aggregated.labels.map((label, i) => ({ label, value: measureData[i] ?? 0 })).sort((a, b) => b.value - a.value);
      let topSlices = pairs.slice(0, PIE_MAX_SLICES);
      const remainder = pairs.slice(PIE_MAX_SLICES);
      if (remainder.length > 0) {
        const otherSum = remainder.reduce((s, p) => s + p.value, 0);
        topSlices.push({ label: `Other (${remainder.length})`, value: otherSum });
      }
      return {
        title: `${measure.column.header} by ${dim.column.header}`,
        data: {
          labels: topSlices.map((s) => s.label),
          datasets: [{
            label: measure.column.header,
            data: topSlices.map((s) => s.value),
            color: APEX_COLORS2[0]
          }]
        }
      };
    }
  };

  // src/chart/chart-analyzer/bar-analyzer.ts
  var _BarAnalyzer = class _BarAnalyzer {
    analyze(dimensions, measures, rows, agg) {
      if (!measures.length) return null;
      const dim = dimensions[0] ?? null;
      if (!dim) {
        const dataRows = rows.filter((r) => r.type === "data").slice(0, _BarAnalyzer.MAX_ROWS_NO_DIM);
        const title2 = measures.map((m) => m.column.header).join(", ");
        return {
          title: title2,
          data: {
            labels: dataRows.map((_, i) => String(i + 1)),
            datasets: measures.map((m, i) => ({
              label: m.column.header,
              data: dataRows.map((r) => {
                const v = Number(r.data[m.column.field]);
                return isNaN(v) ? 0 : v;
              }),
              color: APEX_COLORS2[i % APEX_COLORS2.length]
            }))
          }
        };
      }
      const aggregated = agg.aggregate(
        dim.column,
        measures.map((m) => m.column),
        rows
      );
      const title = measures.length === 1 ? `${measures[0].column.header} by ${dim.column.header}` : measures.map((m) => m.column.header).join(", ");
      return {
        title,
        data: {
          labels: aggregated.labels,
          datasets: measures.map((m, i) => ({
            label: m.column.header,
            data: aggregated.seriesData.get(m.column.field) ?? [],
            color: APEX_COLORS2[i % APEX_COLORS2.length]
          }))
        }
      };
    }
  };
  _BarAnalyzer.MAX_ROWS_NO_DIM = 50;
  var BarAnalyzer = _BarAnalyzer;

  // src/chart/chart-analyzer/line-analyzer.ts
  var _LineAnalyzer = class _LineAnalyzer {
    analyze(dimensions, measures, rows, agg) {
      if (!measures.length) return null;
      const dim = dimensions.find((d) => d.isDate) ?? dimensions[0] ?? null;
      if (!dim) {
        const dataRows = rows.filter((r) => r.type === "data").slice(0, _LineAnalyzer.MAX_POINTS_NO_DIM);
        const title2 = measures.map((m) => m.column.header).join(" & ");
        return {
          title: title2,
          data: {
            labels: dataRows.map((_, i) => String(i + 1)),
            datasets: measures.map((m, i) => ({
              label: m.column.header,
              data: dataRows.map((r) => {
                const v = Number(r.data[m.column.field]);
                return isNaN(v) ? 0 : v;
              }),
              color: APEX_COLORS2[i % APEX_COLORS2.length]
            }))
          }
        };
      }
      const aggregated = agg.aggregate(
        dim.column,
        measures.map((m) => m.column),
        rows
      );
      const connector = dim.isDate ? "over" : "by";
      const title = measures.length === 1 ? `${measures[0].column.header} ${connector} ${dim.column.header}` : measures.map((m) => m.column.header).join(" & ");
      return {
        title,
        data: {
          labels: aggregated.labels,
          datasets: measures.map((m, i) => ({
            label: m.column.header,
            data: aggregated.seriesData.get(m.column.field) ?? [],
            color: APEX_COLORS2[i % APEX_COLORS2.length]
          }))
        }
      };
    }
  };
  _LineAnalyzer.MAX_POINTS_NO_DIM = 50;
  var LineAnalyzer = _LineAnalyzer;

  // src/chart/chart-analyzer/recommendation-engine.ts
  var _RecommendationEngine = class _RecommendationEngine {
    recommend(dimensions, measures) {
      const recs = [];
      const push = (chartType, confidence, reason) => {
        if (confidence >= _RecommendationEngine.MIN_CONFIDENCE) {
          recs.push({ chartType, confidence, reason });
        }
      };
      const nDims = dimensions.length;
      const nMeasures = measures.length;
      const primDim = dimensions[0] ?? null;
      const dateDim = dimensions.find((d) => d.isDate) ?? null;
      const hasNeg = measures.some((m) => m.hasNegatives);
      const highCardinality = primDim?.isHighCardinality ?? false;
      const lowCardinality = primDim ? primDim.uniqueCount <= 8 : false;
      if (dateDim && nMeasures >= 1) {
        const head = measures[0].column.header;
        push("line", 0.95, `Date column "${dateDim.column.header}" makes this ideal for a line time-series of ${head}`);
        push("area", 0.82, `Area chart emphasises cumulative change of ${head} over time`);
        push("column-grouped", 0.65, `Column chart also works for period-over-period comparison`);
      }
      if (nDims === 0 && nMeasures === 2) {
        push("scatter", 0.93, `Two numeric columns \u2014 scatter is the best way to visualise the correlation between "${measures[0].column.header}" and "${measures[1].column.header}"`);
      }
      if (nMeasures >= 3 && nDims <= 1) {
        push("scatter", 0.78, `Three+ numeric columns \u2014 use the first two as X/Y axes; the third encodes point size`);
      }
      if (nDims === 1 && nMeasures === 1 && lowCardinality && !hasNeg) {
        push("pie", 0.88, `${primDim.uniqueCount} categories with one measure \u2014 ideal part-to-whole view`);
        push("doughnut", 0.8, `Doughnut variant leaves room for a centre summary label`);
      }
      if (nDims === 1 && nMeasures >= 1 && highCardinality) {
        push("bar-grouped", 0.9, `${primDim.uniqueCount} categories \u2014 horizontal bars are easier to read than tall column charts`);
        if (nMeasures > 1) {
          push("bar-stacked", 0.72, `Stacked horizontal bar shows part-to-whole across many categories`);
          push("bar-100stacked", 0.6, `100 % stacked horizontal bar normalises proportions across categories`);
        }
      }
      if (nDims >= 1 && nMeasures >= 1 && !dateDim) {
        const baseLine = highCardinality ? 0.62 : 0.84;
        const multiHint = nMeasures > 1 ? ` (${nMeasures} measures grouped together)` : "";
        push("column-grouped", baseLine, `${measures[0].column.header} by ${primDim.column.header}${multiHint}`);
        if (nMeasures > 1) {
          push("column-stacked", baseLine - 0.1, `Stacked column reveals part-to-whole and total at a glance`);
          push("column-100stacked", baseLine - 0.22, `100 % stacked column focuses on proportional share, not absolute values`);
        }
      }
      if (nDims === 1 && nMeasures === 1) {
        push("funnel", 0.54, `Funnel works well for sequential stage / conversion data`);
      }
      if (nDims === 1 && nMeasures >= 3) {
        push("polar", 0.66, `Polar/radar shows multi-dimensional performance across ${nMeasures} measures`);
      }
      if (nDims === 0 && nMeasures === 1) {
        push("column-grouped", 0.8, `Single numeric column \u2014 histogram reveals the frequency distribution of "${measures[0].column.header}"`);
      }
      return recs.sort((a, b) => b.confidence - a.confidence || a.chartType.localeCompare(b.chartType));
    }
  };
  _RecommendationEngine.MIN_CONFIDENCE = 0.5;
  var RecommendationEngine = _RecommendationEngine;

  // src/chart/chart-analyzer/index.ts
  var ChartAnalyzer = class {
    constructor() {
      // ── Sub-analyzers ────────────────────────────────────────────────────────
      this.dimensionAnalyzer = new DimensionAnalyzer();
      this.measureAnalyzer = new MeasureAnalyzer();
      this.cardinalityAnalyzer = new CardinalityAnalyzer();
      // public for potential external use
      this.aggregationAnalyzer = new AggregationAnalyzer();
      this.histogramAnalyzer = new HistogramAnalyzer();
      this.scatterAnalyzer = new ScatterAnalyzer();
      this.bubbleAnalyzer = new BubbleAnalyzer();
      this.pieAnalyzer = new PieAnalyzer();
      this.barAnalyzer = new BarAnalyzer();
      this.lineAnalyzer = new LineAnalyzer();
      this.recommendationEngine = new RecommendationEngine();
    }
    // ── Public API ───────────────────────────────────────────────────────────
    /**
     * Analyse a cell selection and return data shaped for the best chart type
     * recommended by the RecommendationEngine, or null if no numeric data.
     */
    analyze(ranges, rows, columns) {
      const ctx = this.buildContext(ranges, rows, columns);
      if (!ctx) return null;
      const { dimensions, measures, selectedRows } = ctx;
      if (!measures.length) return null;
      const recs = this.recommendationEngine.recommend(dimensions, measures);
      const bestType = recs[0]?.chartType ?? "column-grouped";
      return this.dispatch(bestType, dimensions, measures, selectedRows);
    }
    /**
     * Analyse a cell selection and return data shaped for the explicitly
     * requested chart type.  Returns null if there are no numeric columns.
     */
    analyzeForType(chartType, ranges, rows, columns) {
      const ctx = this.buildContext(ranges, rows, columns);
      if (!ctx) return null;
      const { dimensions, measures, selectedRows } = ctx;
      if (!measures.length) return null;
      return this.dispatch(chartType, dimensions, measures, selectedRows);
    }
    /**
     * Return a ranked list of chart-type recommendations for the current
     * selection. Useful for a "Recommended charts" panel (not yet in the UI).
     */
    recommend(ranges, rows, columns) {
      const ctx = this.buildContext(ranges, rows, columns);
      if (!ctx) return [];
      return this.recommendationEngine.recommend(ctx.dimensions, ctx.measures);
    }
    // ── Private helpers ──────────────────────────────────────────────────────
    buildContext(ranges, rows, columns) {
      if (!ranges.length || !rows.length || !columns.length) return null;
      const norm = normalizeRange(ranges[0]);
      const selectedCols = columns.slice(norm.startColIndex, norm.endColIndex + 1);
      const selectedRows = rows.slice(norm.startRowIndex, norm.endRowIndex + 1).filter((r) => r.type === "data");
      if (!selectedRows.length || !selectedCols.length) return null;
      const dimensions = this.dimensionAnalyzer.analyze(selectedCols, selectedRows);
      const measures = this.measureAnalyzer.analyze(selectedCols, selectedRows);
      return { dimensions, measures, selectedRows, selectedCols };
    }
    dispatch(chartType, dimensions, measures, rows) {
      switch (chartType) {
        case "pie":
        case "doughnut":
          return this.pieAnalyzer.analyze(dimensions, measures, rows, this.aggregationAnalyzer);
        case "scatter":
          return this.scatterAnalyzer.analyze(dimensions, measures, rows);
        case "bubble":
          return this.bubbleAnalyzer.analyze(dimensions, measures, rows);
        case "line":
        case "area":
          return this.lineAnalyzer.analyze(dimensions, measures, rows, this.aggregationAnalyzer);
        case "column-grouped":
        case "column-stacked":
        case "column-100stacked": {
          if (dimensions.length === 0 && measures.length === 1) {
            return this.histogramAnalyzer.analyze(measures);
          }
          return this.barAnalyzer.analyze(dimensions, measures, rows, this.aggregationAnalyzer);
        }
        default:
          return this.barAnalyzer.analyze(dimensions, measures, rows, this.aggregationAnalyzer);
      }
    }
  };

  // src/column-groups/column-group-drag-handler.ts
  var INVALID_TARGET = {
    valid: false,
    targetId: "",
    position: "before",
    indicatorX: 0
  };
  var ColumnGroupDragHandler = class {
    constructor(columnModel, groupModel, headerBuilder, colStyles, eventBus, gridElGetter) {
      this.columnModel = columnModel;
      this.groupModel = groupModel;
      this.headerBuilder = headerBuilder;
      this.colStyles = colStyles;
      this.eventBus = eventBus;
      this.gridElGetter = gridElGetter;
      /** Currently dragged group ID, `null` when not dragging. */
      this.draggingId = null;
      /** `true` when the dragged node is a group (vs. a leaf). */
      this.draggingIsGroup = false;
      /** Ghost element following the cursor. */
      this.ghostEl = null;
      /** Vertical indicator line shown at the drop target. */
      this.indicatorEl = null;
      /** The grid `.pg-grid` element, captured at drag-start from the getter. */
      this.gridEl = null;
      /** Last computed drop target. */
      this.currentTarget = null;
      /** `true` for the remainder of the current event loop after a drag completes. */
      this._didJustDrag = false;
      // ── Live drag transform state ────────────────────────────────────────────
      /** Injected `<style>` element holding CSS transforms during a drag. */
      this.dragStyleEl = null;
      /** Captured group-cell positions (at drag-start) for the same depth level. */
      this.dragCells = [];
      /** Width of the dragged group cell (pixels). */
      this.dragCellWidth = 0;
      /** Index of the dragged group cell within `dragCells`. */
      this.dragSourceIdx = -1;
      /** Current effective drop index (updated each mousemove). */
      this.dragEffectiveIdx = -1;
      this.boundMouseMove = this.onMouseMove.bind(this);
      this.boundMouseUp = this.onMouseUp.bind(this);
    }
    // ── Public ───────────────────────────────────────────────────────────────
    /**
     * `true` immediately after a drag session ends (cleared after one tick).
     * Used by the header builder to suppress the collapse-toggle click that
     * fires after a drag completes.
     */
    get didJustDrag() {
      return this._didJustDrag;
    }
    /**
     * Attach drag listeners to a group header cell element.
     * Drag starts only after the pointer has moved more than 5 px so that a
     * short click still fires the collapse-toggle handler.
     *
     * @param el    - The group header `<div>` element.
     * @param group - The group node this cell represents.
     */
    attachGroupDragListeners(el, group) {
      el.addEventListener("mousedown", (e) => {
        if (e.target.closest(".pg-th__resize-handle, .pg-th__collapse-btn")) return;
        if (e.button !== 0) return;
        const startX = e.clientX;
        let moved = false;
        const onMoveStart = (ev) => {
          if (!moved && Math.abs(ev.clientX - startX) > 5) {
            moved = true;
            document.removeEventListener("mousemove", onMoveStart);
            document.removeEventListener("mouseup", onUpEarly);
            this.startGroupDrag(group, ev.clientX, ev.clientY);
            document.addEventListener("mousemove", this.boundMouseMove);
            document.addEventListener("mouseup", this.boundMouseUp);
            const blockClick = (ce) => {
              ce.stopPropagation();
              document.removeEventListener("click", blockClick, true);
            };
            document.addEventListener("click", blockClick, true);
          }
        };
        const onUpEarly = () => {
          document.removeEventListener("mousemove", onMoveStart);
          document.removeEventListener("mouseup", onUpEarly);
        };
        document.addEventListener("mousemove", onMoveStart);
        document.addEventListener("mouseup", onUpEarly);
      });
    }
    /**
     * Attach drag listeners to a leaf header cell, respecting `marryChildren`.
     *
     * When the leaf's parent group has `marryChildren === true`, dragging the
     * leaf starts a group drag instead of a leaf drag.
     *
     * @param el     - The leaf header `<div>` element.
     * @param colDef - The column definition.
     */
    attachLeafDragListeners(el, colDef) {
      const parent = this.groupModel.getParent(colDef.colId);
      if (parent?.marryChildren) {
        const group = this.groupModel.getGroup(parent.groupId);
        if (group) this.attachGroupDragListeners(el, group);
      }
    }
    /** `true` while a drag session is in progress. */
    get isDragging() {
      return this.draggingId !== null;
    }
    /** Release all event listeners and remove DOM artefacts. */
    destroy() {
      this.cleanupDrag();
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("mouseup", this.boundMouseUp);
    }
    // ── Private: drag lifecycle ───────────────────────────────────────────────
    startGroupDrag(group, clientX, clientY) {
      const gridEl = this.gridElGetter();
      if (!gridEl) return;
      this.draggingId = group.groupId;
      this.draggingIsGroup = true;
      this.gridEl = gridEl;
      const ghost = createDiv("pg-col-drag-ghost");
      const label = document.createElement("span");
      label.className = "pg-col-drag-ghost__label";
      label.textContent = group.header;
      ghost.appendChild(label);
      ghost.style.left = `${clientX + 14}px`;
      ghost.style.top = `${clientY}px`;
      document.body.appendChild(ghost);
      this.ghostEl = ghost;
      const indicator = createDiv("pg-group-drop-indicator");
      gridEl.appendChild(indicator);
      this.indicatorEl = indicator;
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      gridEl.classList.add("pg-grid--col-dragging");
      const draggedCell = gridEl.querySelector(`[data-group-id="${group.groupId}"]`);
      const depth = parseInt(
        draggedCell?.closest("[data-group-depth]")?.getAttribute("data-group-depth") ?? "0",
        10
      );
      const cells = [];
      for (const row of gridEl.querySelectorAll(`[data-group-depth="${depth}"]`)) {
        for (const cell of row.querySelectorAll("[data-group-id]")) {
          cells.push({ groupId: cell.getAttribute("data-group-id") ?? "", rect: cell.getBoundingClientRect() });
        }
      }
      cells.sort((a, b) => a.rect.left - b.rect.left);
      this.dragCells = cells;
      this.dragSourceIdx = cells.findIndex((c) => c.groupId === group.groupId);
      this.dragCellWidth = cells[this.dragSourceIdx]?.rect.width ?? 0;
      this.dragEffectiveIdx = this.dragSourceIdx;
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-pg-group-drag", "");
      document.head.appendChild(styleEl);
      this.dragStyleEl = styleEl;
    }
    onMouseMove(e) {
      if (!this.draggingId || !this.ghostEl) return;
      this.ghostEl.style.left = `${e.clientX + 14}px`;
      this.ghostEl.style.top = `${e.clientY}px`;
      const outside = this.isOutsideGrid(e.clientX, e.clientY);
      this.ghostEl.classList.toggle("pg-col-drag-ghost--outside", outside);
      if (outside) {
        this.currentTarget = null;
        this.updateIndicator(null);
        this.applyDragTransforms(-1);
        return;
      }
      const target = this.hitTest(e.clientX, e.clientY);
      this.currentTarget = target;
      this.updateIndicator(target);
      if (this.dragCells.length > 0) {
        let effectiveIdx = this.dragSourceIdx;
        for (let i = 0; i < this.dragCells.length; i++) {
          if (i === this.dragSourceIdx) continue;
          const r = this.dragCells[i].rect;
          if (e.clientX >= r.left && e.clientX < r.right) {
            effectiveIdx = i;
            break;
          }
        }
        if (e.clientX < (this.dragCells[0]?.rect.left ?? 0)) effectiveIdx = 0;
        if (e.clientX >= (this.dragCells[this.dragCells.length - 1]?.rect.right ?? 0)) {
          effectiveIdx = this.dragCells.length - 1;
        }
        this.dragEffectiveIdx = effectiveIdx;
        this.applyDragTransforms(effectiveIdx);
      }
    }
    /**
     * Write CSS `transform: translateX()` rules for the live drag preview.
     * Pass `-1` to clear all transforms.
     */
    applyDragTransforms(effectiveIdx) {
      if (!this.dragStyleEl || !this.gridEl) return;
      if (effectiveIdx === -1 || effectiveIdx === this.dragSourceIdx) {
        this.dragStyleEl.textContent = "";
        return;
      }
      const gridId = this.gridEl.getAttribute("data-photon-grid-id") ?? "";
      const scope = gridId ? `[data-photon-grid-id="${gridId}"] ` : "";
      const src = this.dragSourceIdx;
      const src_rect = this.dragCells[src]?.rect;
      const tgt_rect = this.dragCells[effectiveIdx]?.rect;
      if (!src_rect || !tgt_rect) return;
      const srcOffset = effectiveIdx > src ? tgt_rect.right - src_rect.right : tgt_rect.left - src_rect.left;
      let css2 = `${scope}[data-group-id="${this.draggingId}"] { transform: translateX(${srcOffset}px); z-index: 10; position: relative; transition: none; }
`;
      for (let i = 0; i < this.dragCells.length; i++) {
        if (i === src) continue;
        let offset = 0;
        if (effectiveIdx > src && i > src && i <= effectiveIdx) offset = -this.dragCellWidth;
        else if (effectiveIdx < src && i >= effectiveIdx && i < src) offset = this.dragCellWidth;
        if (offset !== 0) {
          css2 += `${scope}[data-group-id="${this.dragCells[i].groupId}"] { transform: translateX(${offset}px); }
`;
        }
      }
      this.dragStyleEl.textContent = css2;
    }
    onMouseUp(e) {
      const target = this.currentTarget;
      const id = this.draggingId;
      const isGroup = this.draggingIsGroup;
      const gridEl = this.gridEl;
      const outside = gridEl ? this.isOutsideGrid(e.clientX, e.clientY) : false;
      const onGroupBar = gridEl ? this.isOverGroupingBar(e.clientX, e.clientY) : false;
      this.cleanupDrag();
      this._didJustDrag = true;
      Promise.resolve().then(() => {
        this._didJustDrag = false;
      });
      if (!id) return;
      if (outside) {
        if (isGroup) {
          const leaves = this.groupModel.getLeavesInGroup(id);
          for (const leaf of leaves) {
            this.columnModel.setColumnVisible(leaf.colId, false);
          }
        }
        return;
      }
      if (onGroupBar) {
        if (isGroup) {
          const leaves = this.groupModel.getLeavesInGroup(id);
          const groupableIds = leaves.filter((l) => l.groupable).map((l) => l.colId);
          if (groupableIds.length > 0) {
            this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, {
              action: "add",
              colIds: groupableIds
            });
          }
        }
        return;
      }
      const effectiveIdx = this.dragEffectiveIdx;
      const useLiveIdx = effectiveIdx !== -1 && effectiveIdx !== this.dragSourceIdx && effectiveIdx < this.dragCells.length;
      const resolvedTarget = useLiveIdx ? {
        valid: true,
        targetId: this.dragCells[effectiveIdx].groupId,
        position: effectiveIdx > this.dragSourceIdx ? "after" : "before",
        indicatorX: 0
      } : target;
      if (!resolvedTarget?.valid) return;
      if (isGroup) {
        const targetGroup = this.groupModel.getGroup(resolvedTarget.targetId);
        if (!targetGroup) return;
        const targetParent = this.groupModel.getParent(resolvedTarget.targetId);
        const targetParentId = targetParent?.groupId ?? null;
        const insertBeforeId = resolvedTarget.position === "before" ? resolvedTarget.targetId : null;
        const insertBeforeNext = resolvedTarget.position === "after" ? this.nextSiblingId(resolvedTarget.targetId) : null;
        const finalInsertBefore = insertBeforeId ?? insertBeforeNext;
        const draggedGroup = this.groupModel.getGroup(id);
        if (draggedGroup?.isSoloGroup && draggedGroup.originalParentGroupId === targetParentId) {
          const leafNode = draggedGroup.children[0];
          if (leafNode?.nodeType === "leaf" /* LEAF */) {
            this.groupModel.dissolveGroupIfSolo(id, targetParentId, finalInsertBefore);
            this.columnModel.setColumnVisible(leafNode.colDef.colId, true);
            this.triggerRebuild();
            return;
          }
        }
        this.groupModel.moveGroup(id, targetParentId, finalInsertBefore);
      }
      this.triggerRebuild();
    }
    cleanupDrag() {
      this.draggingId = null;
      this.draggingIsGroup = false;
      this.currentTarget = null;
      this.dragCells = [];
      this.dragCellWidth = 0;
      this.dragSourceIdx = -1;
      this.dragEffectiveIdx = -1;
      this.ghostEl?.remove();
      this.ghostEl = null;
      this.indicatorEl?.remove();
      this.indicatorEl = null;
      this.dragStyleEl?.remove();
      this.dragStyleEl = null;
      this.gridEl?.classList.remove("pg-grid--col-dragging");
      this.gridEl = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("mouseup", this.boundMouseUp);
    }
    // ── Private: drop-target hit test ────────────────────────────────────────
    /**
     * Locate the nearest group header cell to the cursor using
     * `getBoundingClientRect` on all visible `[data-group-id]` elements within
     * the grid.  Excludes the element being dragged.
     */
    hitTest(clientX, clientY) {
      if (!this.gridEl) return INVALID_TARGET;
      const cells = this.gridEl.querySelectorAll("[data-group-id]");
      const gridRect = this.gridEl.getBoundingClientRect();
      let closest = null;
      let minDist = Infinity;
      for (const cell of cells) {
        const gid = cell.getAttribute("data-group-id") ?? "";
        if (gid === this.draggingId) continue;
        const rect = cell.getBoundingClientRect();
        if (clientY < rect.top - 4 || clientY > rect.bottom + 4) continue;
        const midX = rect.left + rect.width / 2;
        const dist = Math.abs(clientX - midX);
        if (dist < minDist) {
          minDist = dist;
          const position = clientX < midX ? "before" : "after";
          closest = {
            valid: true,
            targetId: gid,
            position,
            // indicatorX is relative to the grid's left edge
            indicatorX: (position === "before" ? rect.left : rect.right) - gridRect.left
          };
        }
      }
      return closest ?? INVALID_TARGET;
    }
    updateIndicator(target) {
      if (!this.indicatorEl) return;
      if (!target?.valid) {
        this.indicatorEl.style.display = "none";
        return;
      }
      this.indicatorEl.style.display = "block";
      this.indicatorEl.style.left = `${target.indicatorX}px`;
    }
    /** `true` when the cursor is more than 40 px outside the grid boundary. */
    isOutsideGrid(clientX, clientY) {
      if (!this.gridEl) return false;
      const rect = this.gridEl.getBoundingClientRect();
      const margin = 40;
      return clientX < rect.left - margin || clientX > rect.right + margin || clientY < rect.top - margin || clientY > rect.bottom + margin;
    }
    /** `true` when the cursor is over the row-grouping bar. */
    isOverGroupingBar(clientX, clientY) {
      if (!this.gridEl) return false;
      const bar = this.gridEl.querySelector(".pg-group-drop-zone--top");
      if (!bar) return false;
      const rect = bar.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }
    /**
     * Return the ID of the node immediately after `nodeId` among its siblings.
     * Returns `null` when `nodeId` is the last sibling or is not found.
     */
    nextSiblingId(nodeId) {
      const parent = this.groupModel.getParent(nodeId);
      const list = parent ? parent.children : this.groupModel.rootNodes;
      const idx = list.findIndex((n) => (n.nodeType === "group" /* GROUP */ ? n.groupId : n.colDef?.colId) === nodeId);
      if (idx === -1 || idx >= list.length - 1) return null;
      const next = list[idx + 1];
      return next.nodeType === "group" /* GROUP */ ? next.groupId ?? null : next.colDef?.colId ?? null;
    }
    // ── Public: leaf clone / extract API ────────────────────────────────────
    /**
     * Extract a leaf from its parent group into a solo clone group WITHOUT
     * reordering `store.columns` via `getAllLeaves()`.
     *
     * Use this when the column has already been repositioned by `moveColumn` or
     * `moveAndPin` — the store order is correct; only the group tree and header
     * need to be updated.
     *
     * The solo group is repositioned to be immediately before `insertBeforeId` in
     * the root node list so that a subsequent `getAllLeaves()` tree sync (triggered
     * by the `-1` sentinel) produces the same order as the flat store.
     *
     * @param colId          - The `colId` of the leaf to extract.
     * @param insertBeforeId - Root-level sibling node ID to insert the solo group
     *   before.  Pass `null` to append at the end of the root list.
     */
    extractLeafToSoloGroup(colId, insertBeforeId) {
      const parent = this.groupModel.getParent(colId);
      if (!parent) return;
      const soloId = this.groupModel.createSoloGroupForLeaf(colId);
      if (!soloId) return;
      this.groupModel.moveGroup(soloId, null, insertBeforeId);
      this.triggerRebuild();
    }
    /**
     * Called by `HeaderRenderer.onGlobalMouseUp` when a leaf column that belongs
     * to a group is dropped onto a different group's header cell.
     *
     * **Merge-back**: if the leaf is currently in a solo-clone group whose
     * `originalParentGroupId` matches `targetGroupId`, the clone is dissolved and
     * the leaf is returned to its original group.
     *
     * **Clone**: otherwise a new solo-clone wrapper group (same header as the
     * leaf's current parent) is created and positioned next to the target group.
     *
     * @param colId         - The `colId` of the dragged leaf column.
     * @param targetGroupId - The group header the leaf was dropped on.
     */
    createLeafClone(colId, targetGroupId) {
      const parentGroup = this.groupModel.getParent(colId);
      if (!parentGroup) return;
      if (parentGroup.isSoloGroup && parentGroup.originalParentGroupId === targetGroupId) {
        this.groupModel.dissolveGroupIfSolo(parentGroup.groupId, targetGroupId, null);
        this.columnModel.setColumnVisible(colId, true);
        this.triggerRebuild();
        return;
      }
      if (parentGroup.groupId === targetGroupId) return;
      const soloGroupId = this.groupModel.createSoloGroupForLeaf(colId);
      if (!soloGroupId) return;
      const targetParent = this.groupModel.getParent(targetGroupId);
      this.groupModel.moveGroup(soloGroupId, targetParent?.groupId ?? null, targetGroupId);
      this.triggerRebuild();
    }
    /** Emit an event that tells the grid renderer to do a full header rebuild. */
    triggerRebuild() {
      this.eventBus.emit(GridEventType.COLUMN_MOVED, {
        colDef: null,
        fromIndex: -1,
        toIndex: -1
      });
    }
  };

  // src/renderer/group-drop-zone.ts
  var GroupDropZone = class {
    constructor(store, groupingEngine, iconRenderer) {
      this.store = store;
      this.groupingEngine = groupingEngine;
      this.iconRenderer = iconRenderer;
      this.el = null;
      this.chipsEl = null;
      this.dockPos = "top";
      this.outerRowEl = null;
      this.mainColEl = null;
      this.isDockDragging = false;
      this.dockIndicatorEl = null;
      this._onDockMove = null;
      this._onDockUp = null;
      this.draggingChipId = null;
      this.chipGhostEl = null;
      this.chipDropIndex = -1;
      this._onChipMove = null;
      this._onChipUp = null;
      this.isResizing = false;
      this.resizeStartSize = 0;
      this.resizeStartPos = 0;
      this._onResizeMove = null;
      this._onResizeUp = null;
      this.searchCallback = null;
      this.searchInputEl = null;
      this.searchClearEl = null;
      this.searchDebounceTimer = null;
    }
    mount(outerRowEl, mainColEl) {
      this.outerRowEl = outerRowEl;
      this.mainColEl = mainColEl;
      this.el = createDiv("pg-group-drop-zone pg-group-drop-zone--top");
      mainColEl.insertBefore(this.el, mainColEl.firstChild);
      this.buildStructure();
      this.render();
    }
    update() {
      this.render();
    }
    highlight(on) {
      this.chipsEl?.classList.toggle("pg-group-zone-chips--over", on);
    }
    isOver(x, y) {
      const rect = this.el?.getBoundingClientRect();
      if (!rect) return false;
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }
    isGrouped(colId) {
      return this.store.get("groupedColumnIds").includes(colId);
    }
    dropColumn(colId) {
      this.groupingEngine.addGroupColumn(colId);
    }
    removeColumn(colId) {
      this.groupingEngine.removeGroupColumn(colId);
    }
    setSearchCallback(fn) {
      this.searchCallback = fn;
    }
    destroy() {
      if (this.searchDebounceTimer !== null) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }
      this.cleanupDockDrag();
      this.cleanupChipDrag();
      this.cleanupResize();
      this.el?.remove();
      this.el = null;
      this.chipsEl = null;
      this.searchInputEl = null;
      this.searchClearEl = null;
    }
    // ─── Build ──────────────────────────────────────────────────────────────────
    buildStructure() {
      if (!this.el) return;
      this.chipsEl = createDiv("pg-group-zone-chips");
      this.el.appendChild(this.chipsEl);
      const searchWrap = createDiv("pg-group-search");
      const fieldEl = createDiv("pg-group-search__field");
      const iconEl = createDiv("pg-group-search__icon");
      iconEl.innerHTML = this.iconRenderer.renderToString("search", 14);
      const input = document.createElement("input");
      input.type = "text";
      input.className = "pg-group-search__input";
      input.placeholder = "Search...";
      input.spellcheck = false;
      input.setAttribute("autocomplete", "off");
      this.searchInputEl = input;
      const clearBtn = createDiv("pg-group-search__clear");
      clearBtn.innerHTML = this.iconRenderer.renderToString("close", 12);
      clearBtn.title = "Clear search";
      this.searchClearEl = clearBtn;
      input.addEventListener("input", () => {
        const val = input.value;
        clearBtn.classList.toggle("pg-group-search__clear--visible", val.length > 0);
        if (this.searchDebounceTimer !== null) clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.searchDebounceTimer = null;
          this.searchCallback?.(val);
        }, 180);
      });
      clearBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = "";
        clearBtn.classList.remove("pg-group-search__clear--visible");
        if (this.searchDebounceTimer !== null) {
          clearTimeout(this.searchDebounceTimer);
          this.searchDebounceTimer = null;
        }
        this.searchCallback?.("");
        input.focus();
      });
      fieldEl.appendChild(iconEl);
      fieldEl.appendChild(input);
      fieldEl.appendChild(clearBtn);
      searchWrap.appendChild(fieldEl);
      this.el.appendChild(searchWrap);
    }
    render() {
      if (!this.chipsEl) return;
      this.chipsEl.innerHTML = "";
      const groupedIds = this.store.get("groupedColumnIds");
      const allColumns = this.store.get("columns");
      const isVertical = this.dockPos === "left" || this.dockPos === "right";
      if (groupedIds.length === 0) {
        const hint = createDiv("pg-group-drop-zone__hint");
        hint.textContent = "Drag a column here to group rows";
        this.chipsEl.appendChild(hint);
        return;
      }
      for (let i = 0; i < groupedIds.length; i++) {
        const colId = groupedIds[i];
        const col = allColumns.find((c) => c.colId === colId);
        if (!col) continue;
        if (i > 0 && !isVertical) {
          const sep = createDiv("pg-group-chip__sep");
          sep.innerHTML = this.iconRenderer.renderToString("chevronRight", 12);
          this.chipsEl.appendChild(sep);
        }
        const chip = createDiv("pg-group-chip");
        chip.setAttribute("data-col-id", colId);
        chip.setAttribute("data-chip-index", String(i));
        chip.style.cursor = "grab";
        const labelEl = createDiv("pg-group-chip__label");
        labelEl.textContent = col.header;
        chip.appendChild(labelEl);
        const closeBtn = createDiv("pg-group-chip__close");
        closeBtn.innerHTML = this.iconRenderer.renderToString("close", 11);
        closeBtn.title = "Remove grouping";
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.removeColumn(colId);
        });
        chip.appendChild(closeBtn);
        chip.addEventListener("mousedown", (e) => {
          if (e.target.closest(".pg-group-chip__close")) return;
          e.preventDefault();
          this.startChipDrag(e, colId, i);
        });
        this.chipsEl.appendChild(chip);
      }
    }
    // ─── Dock drag ─────────────────────────────────────────────────────────────
    startDockDrag(e) {
      this.isDockDragging = true;
      this.dockIndicatorEl = document.createElement("div");
      this.dockIndicatorEl.style.cssText = "position:fixed;pointer-events:none;z-index:99999;border:2px dashed var(--pg-colors-primary,#2563eb);background:var(--pg-colors-group-zone-over,rgba(37,99,235,0.1));border-radius:var(--pg-borders-radius-sm,4px);";
      document.body.appendChild(this.dockIndicatorEl);
      this._onDockMove = (ev) => this.onDockMove(ev);
      this._onDockUp = (ev) => this.onDockUp(ev);
      document.addEventListener("mousemove", this._onDockMove);
      document.addEventListener("mouseup", this._onDockUp);
      this.onDockMove(e);
    }
    onDockMove(e) {
      if (!this.isDockDragging || !this.el || !this.dockIndicatorEl) return;
      const gridEl = this.el.closest(".pg-grid");
      if (!gridEl) return;
      const gr = gridEl.getBoundingClientRect();
      const pct = (e.clientX - gr.left) / gr.width;
      if (pct < 0.2) {
        Object.assign(this.dockIndicatorEl.style, {
          left: `${gr.left}px`,
          top: `${gr.top}px`,
          width: "160px",
          height: `${gr.height}px`,
          borderRadius: "4px 0 0 4px"
        });
      } else if (pct > 0.8) {
        Object.assign(this.dockIndicatorEl.style, {
          left: `${gr.right - 160}px`,
          top: `${gr.top}px`,
          width: "160px",
          height: `${gr.height}px`,
          borderRadius: "0 4px 4px 0"
        });
      } else {
        Object.assign(this.dockIndicatorEl.style, {
          left: `${gr.left}px`,
          top: `${gr.top}px`,
          width: `${gr.width}px`,
          height: "48px",
          borderRadius: "4px 4px 0 0"
        });
      }
    }
    onDockUp(e) {
      if (!this.isDockDragging || !this.el) {
        this.cleanupDockDrag();
        return;
      }
      const gridEl = this.el.closest(".pg-grid");
      if (gridEl) {
        const gr = gridEl.getBoundingClientRect();
        const pct = (e.clientX - gr.left) / gr.width;
        const newDock = pct < 0.2 ? "left" : pct > 0.8 ? "right" : "top";
        this.setDock(newDock);
      }
      this.cleanupDockDrag();
    }
    setDock(pos) {
      if (pos === this.dockPos || !this.el || !this.outerRowEl || !this.mainColEl) return;
      this.dockPos = pos;
      this.el.remove();
      this.el.classList.remove("pg-group-drop-zone--top", "pg-group-drop-zone--left", "pg-group-drop-zone--right");
      this.el.classList.add(`pg-group-drop-zone--${pos}`);
      this.el.style.height = "";
      this.el.style.width = "";
      if (pos === "top") {
        this.mainColEl.insertBefore(this.el, this.mainColEl.firstChild);
      } else if (pos === "left") {
        this.outerRowEl.insertBefore(this.el, this.mainColEl);
      } else {
        this.outerRowEl.appendChild(this.el);
      }
      this.render();
    }
    cleanupDockDrag() {
      this.isDockDragging = false;
      this.dockIndicatorEl?.remove();
      this.dockIndicatorEl = null;
      if (this._onDockMove) document.removeEventListener("mousemove", this._onDockMove);
      if (this._onDockUp) document.removeEventListener("mouseup", this._onDockUp);
      this._onDockMove = null;
      this._onDockUp = null;
    }
    // ─── Chip drag-reorder ─────────────────────────────────────────────────────
    startChipDrag(e, colId, index) {
      this.draggingChipId = colId;
      this.chipDropIndex = index;
      const col = this.store.get("columns").find((c) => c.colId === colId);
      const ghost = createDiv("pg-group-chip pg-group-chip--ghost");
      const ghostLabel = createDiv("pg-group-chip__label");
      ghostLabel.textContent = col?.header ?? colId;
      ghost.appendChild(ghostLabel);
      ghost.style.cssText = `position:fixed;pointer-events:none;z-index:99999;opacity:0.85;left:${e.clientX + 8}px;top:${e.clientY - 14}px;`;
      document.body.appendChild(ghost);
      this.chipGhostEl = ghost;
      this._onChipMove = (ev) => this.onChipMove(ev);
      this._onChipUp = (ev) => this.onChipUp(ev);
      document.addEventListener("mousemove", this._onChipMove);
      document.addEventListener("mouseup", this._onChipUp);
    }
    onChipMove(e) {
      if (!this.chipGhostEl || !this.chipsEl) return;
      this.chipGhostEl.style.left = `${e.clientX + 8}px`;
      this.chipGhostEl.style.top = `${e.clientY - 14}px`;
      const isVertical = this.dockPos === "left" || this.dockPos === "right";
      const chips = Array.from(
        this.chipsEl.querySelectorAll(".pg-group-chip:not(.pg-group-chip--ghost)")
      );
      let newIndex = chips.length;
      for (let i = 0; i < chips.length; i++) {
        const r = chips[i].getBoundingClientRect();
        const mid = isVertical ? (r.top + r.bottom) / 2 : (r.left + r.right) / 2;
        const pos = isVertical ? e.clientY : e.clientX;
        if (pos < mid) {
          newIndex = i;
          break;
        }
      }
      this.chipDropIndex = newIndex;
      for (const chip of chips) {
        chip.style.opacity = chip.getAttribute("data-col-id") === this.draggingChipId ? "0.3" : "";
      }
    }
    onChipUp(_e) {
      const fromId = this.draggingChipId;
      const toIndex = this.chipDropIndex;
      this.cleanupChipDrag();
      if (!fromId) return;
      const groupedIds = [...this.store.get("groupedColumnIds")];
      const fromIndex = groupedIds.indexOf(fromId);
      if (fromIndex === -1 || fromIndex === toIndex) return;
      groupedIds.splice(fromIndex, 1);
      const insertAt = toIndex > fromIndex ? Math.max(0, toIndex - 1) : toIndex;
      groupedIds.splice(insertAt, 0, fromId);
      this.groupingEngine.reorderGroupColumns(groupedIds);
    }
    cleanupChipDrag() {
      this.draggingChipId = null;
      this.chipDropIndex = -1;
      if (this.chipsEl) {
        for (const chip of Array.from(this.chipsEl.querySelectorAll(".pg-group-chip"))) {
          chip.style.opacity = "";
        }
      }
      this.chipGhostEl?.remove();
      this.chipGhostEl = null;
      if (this._onChipMove) document.removeEventListener("mousemove", this._onChipMove);
      if (this._onChipUp) document.removeEventListener("mouseup", this._onChipUp);
      this._onChipMove = null;
      this._onChipUp = null;
    }
    // ─── Resize ─────────────────────────────────────────────────────────────────
    startResize(e) {
      if (!this.el) return;
      this.isResizing = true;
      if (this.dockPos === "top") {
        this.resizeStartSize = this.el.offsetHeight;
        this.resizeStartPos = e.clientY;
      } else {
        this.resizeStartSize = this.el.offsetWidth;
        this.resizeStartPos = e.clientX;
      }
      this._onResizeMove = (ev) => this.onResizeMove(ev);
      this._onResizeUp = () => this.cleanupResize();
      document.addEventListener("mousemove", this._onResizeMove);
      document.addEventListener("mouseup", this._onResizeUp);
    }
    onResizeMove(e) {
      if (!this.isResizing || !this.el) return;
      if (this.dockPos === "top") {
        const delta = e.clientY - this.resizeStartPos;
        this.el.style.height = `${Math.max(48, this.resizeStartSize + delta)}px`;
      } else if (this.dockPos === "left") {
        const delta = e.clientX - this.resizeStartPos;
        this.el.style.width = `${Math.max(80, this.resizeStartSize + delta)}px`;
      } else {
        const delta = this.resizeStartPos - e.clientX;
        this.el.style.width = `${Math.max(80, this.resizeStartSize + delta)}px`;
      }
    }
    cleanupResize() {
      this.isResizing = false;
      if (this._onResizeMove) document.removeEventListener("mousemove", this._onResizeMove);
      if (this._onResizeUp) document.removeEventListener("mouseup", this._onResizeUp);
      this._onResizeMove = null;
      this._onResizeUp = null;
    }
  };

  // src/renderer/column-menu.ts
  var ColumnMenuSection = /* @__PURE__ */ ((ColumnMenuSection2) => {
    ColumnMenuSection2["SORT"] = "sort";
    ColumnMenuSection2["FILTER"] = "filter";
    ColumnMenuSection2["PIN"] = "pin";
    ColumnMenuSection2["MOVE"] = "move";
    ColumnMenuSection2["RESIZE"] = "resize";
    ColumnMenuSection2["VISIBILITY"] = "visibility";
    ColumnMenuSection2["DATA"] = "data";
    ColumnMenuSection2["CLIPBOARD"] = "clipboard";
    ColumnMenuSection2["COLUMN"] = "column";
    return ColumnMenuSection2;
  })(ColumnMenuSection || {});
  var SECTION_GROUPS = [
    ["sort" /* SORT */],
    ["filter" /* FILTER */],
    ["pin" /* PIN */, "move" /* MOVE */],
    ["resize" /* RESIZE */],
    ["visibility" /* VISIBILITY */],
    ["data" /* DATA */],
    ["clipboard" /* CLIPBOARD */],
    ["column" /* COLUMN */]
  ];
  var ColumnMenu = class {
    constructor(columnModel, sortEngine, eventBus, iconRenderer, onAction) {
      this.columnModel = columnModel;
      this.sortEngine = sortEngine;
      this.eventBus = eventBus;
      this.iconRenderer = iconRenderer;
      this.onAction = onAction;
      this.el = null;
      this.anchorEl = null;
      this.outsideClickFn = null;
      this.escKeyFn = null;
      this.openSubmenuTimer = null;
      this.closeSubmenuTimer = null;
      this.activeSubmenuEl = null;
      this.groupCallbacks = null;
      this.menuCallbacks = {};
      this.menuOptions = {};
    }
    // ── Public API ────────────────────────────────────────────────────────────
    /**
     * Register callbacks for operations that are delegated outside the menu class.
     * Call this once after construction — all callbacks are optional.
     */
    setMenuCallbacks(callbacks) {
      this.menuCallbacks = callbacks;
    }
    /**
     * Configure which sections appear and whether right-click is supported.
     * Call this once after construction or whenever options change.
     */
    setMenuOptions(options) {
      this.menuOptions = options;
    }
    /**
     * Register row-grouping integration callbacks.
     * Required to enable the "Group by Column" item in the Data section.
     */
    setGroupCallbacks(callbacks) {
      this.groupCallbacks = callbacks;
    }
    /**
     * Show the context menu for `colDef`.
     *
     * @param colDef   - Column the menu operates on.
     * @param anchorEl - Element that triggered the menu (⋯ button or column header).
     * @param clientX  - Viewport X for right-click positioning; omit for button positioning.
     * @param clientY  - Viewport Y for right-click positioning; omit for button positioning.
     */
    show(colDef, anchorEl, clientX, clientY) {
      this.hide();
      this.anchorEl = anchorEl;
      anchorEl.classList.add("pg-th__menu-btn--active");
      const menu = this.buildMenu(colDef);
      document.body.appendChild(menu);
      this.el = menu;
      this.positionMenu(anchorEl, clientX, clientY);
      requestAnimationFrame(() => {
        this.outsideClickFn = (e) => {
          if (!this.el?.contains(e.target)) this.hide();
        };
        this.escKeyFn = (e) => {
          if (e.key === "Escape") this.hide();
        };
        document.addEventListener("mousedown", this.outsideClickFn);
        document.addEventListener("keydown", this.escKeyFn);
      });
    }
    /** Hide and remove the menu from the DOM. */
    hide() {
      if (this.outsideClickFn) {
        document.removeEventListener("mousedown", this.outsideClickFn);
        this.outsideClickFn = null;
      }
      if (this.escKeyFn) {
        document.removeEventListener("keydown", this.escKeyFn);
        this.escKeyFn = null;
      }
      this.clearSubmenuTimers();
      this.anchorEl?.classList.remove("pg-th__menu-btn--active");
      this.anchorEl = null;
      this.activeSubmenuEl = null;
      this.el?.remove();
      this.el = null;
    }
    /** Destroy the instance and release all resources. */
    destroy() {
      this.hide();
    }
    // ── Private: menu construction ────────────────────────────────────────────
    buildMenu(colDef) {
      const menu = createDiv("pg-col-ctx-menu");
      menu.setAttribute("role", "menu");
      menu.setAttribute("tabindex", "-1");
      const enabledSections = new Set(this.menuOptions.sections ?? Object.values(ColumnMenuSection));
      const allSections = this.buildAllSections(colDef);
      const sectionMap = new Map(allSections.map((s) => [s.key, s]));
      let firstGroupRendered = true;
      for (const group of SECTION_GROUPS) {
        const visibleInGroup = group.filter(
          (key) => enabledSections.has(key) && (sectionMap.get(key)?.items.length ?? 0) > 0
        );
        if (visibleInGroup.length === 0) continue;
        if (!firstGroupRendered) {
          menu.appendChild(this.createSeparator());
        }
        firstGroupRendered = false;
        for (const key of visibleInGroup) {
          const section = sectionMap.get(key);
          for (const item of section.items) {
            menu.appendChild(
              item.kind === "parent" ? this.buildParentItem(item, colDef) : this.buildLeafItem(item)
            );
          }
        }
      }
      return menu;
    }
    // ── Private: item DOM builders ────────────────────────────────────────────
    buildLeafItem(item) {
      const el = createDiv("pg-col-ctx-menu__item");
      el.setAttribute("role", "menuitem");
      el.setAttribute("tabindex", "-1");
      if (item.active) el.classList.add("pg-col-ctx-menu__item--active");
      if (item.disabled) el.classList.add("pg-col-ctx-menu__item--disabled");
      el.appendChild(this.createIcon(item.icon));
      el.appendChild(this.createLabel(item.label));
      if (!item.disabled) {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          item.action();
          this.hide();
        });
      }
      return el;
    }
    buildParentItem(item, colDef) {
      const el = createDiv("pg-col-ctx-menu__item pg-col-ctx-menu__item--has-submenu");
      el.setAttribute("role", "menuitem");
      el.setAttribute("aria-haspopup", "true");
      el.setAttribute("aria-expanded", "false");
      el.setAttribute("tabindex", "-1");
      el.appendChild(this.createIcon(item.icon));
      el.appendChild(this.createLabel(item.label));
      const chevron = createDiv("pg-col-ctx-menu__item-chevron");
      chevron.innerHTML = this.iconRenderer.renderToString("chevronRight", 12);
      el.appendChild(chevron);
      const submenu = this.buildSubmenu(item.children, colDef);
      el.appendChild(submenu);
      this.attachSubmenuListeners(el, submenu);
      return el;
    }
    buildSubmenu(children, _colDef) {
      const submenu = createDiv("pg-col-ctx-menu__submenu");
      submenu.setAttribute("role", "menu");
      for (const child of children) {
        submenu.appendChild(this.buildLeafItem(child));
      }
      return submenu;
    }
    // ── Private: submenu hover logic ─────────────────────────────────────────
    /**
     * Wire the open/close hover behaviour for a parent item + its submenu.
     * Uses a short open delay (60 ms) and a close grace period (150 ms) to
     * prevent flicker when the mouse transitions between the item and the submenu.
     */
    attachSubmenuListeners(el, submenu) {
      el.addEventListener("mouseenter", () => {
        this.clearSubmenuTimers();
        if (this.activeSubmenuEl && this.activeSubmenuEl !== submenu) {
          this.activeSubmenuEl.classList.remove("pg-col-ctx-menu__submenu--open");
          this.activeSubmenuEl.closest(".pg-col-ctx-menu__item--has-submenu")?.setAttribute("aria-expanded", "false");
        }
        this.openSubmenuTimer = setTimeout(() => {
          this.activeSubmenuEl = submenu;
          submenu.classList.add("pg-col-ctx-menu__submenu--open");
          el.setAttribute("aria-expanded", "true");
          this.adjustSubmenuPosition(submenu, el);
        }, 60);
      });
      el.addEventListener("mouseleave", (e) => {
        if (submenu.contains(e.relatedTarget)) return;
        this.clearSubmenuTimers();
        this.closeSubmenuTimer = setTimeout(() => {
          if (!submenu.matches(":hover") && !el.matches(":hover")) {
            submenu.classList.remove("pg-col-ctx-menu__submenu--open");
            el.setAttribute("aria-expanded", "false");
          }
        }, 150);
      });
      submenu.addEventListener("mouseenter", () => {
        this.clearSubmenuTimers();
      });
      submenu.addEventListener("mouseleave", (e) => {
        if (el.contains(e.relatedTarget)) return;
        this.clearSubmenuTimers();
        this.closeSubmenuTimer = setTimeout(() => {
          if (!submenu.matches(":hover") && !el.matches(":hover")) {
            submenu.classList.remove("pg-col-ctx-menu__submenu--open");
            el.setAttribute("aria-expanded", "false");
          }
        }, 150);
      });
    }
    clearSubmenuTimers() {
      if (this.openSubmenuTimer !== null) {
        clearTimeout(this.openSubmenuTimer);
        this.openSubmenuTimer = null;
      }
      if (this.closeSubmenuTimer !== null) {
        clearTimeout(this.closeSubmenuTimer);
        this.closeSubmenuTimer = null;
      }
    }
    // ── Private: section builders ─────────────────────────────────────────────
    buildAllSections(colDef) {
      return [
        this.buildSortSection(colDef),
        this.buildFilterSection(colDef),
        this.buildPinSection(colDef),
        this.buildMoveSection(colDef),
        this.buildResizeSection(colDef),
        this.buildVisibilitySection(colDef),
        this.buildDataSection(colDef),
        this.buildClipboardSection(colDef),
        this.buildColumnSection(colDef)
      ];
    }
    /**
     * Sort section — three flat items: Sort Ascending, Sort Descending, Clear Sort.
     */
    buildSortSection(colDef) {
      const currentSort = this.sortEngine.isSorted(colDef.colId);
      return {
        key: "sort" /* SORT */,
        items: colDef.sortable === false ? [] : [
          {
            kind: "leaf",
            label: "Sort Ascending",
            icon: "sortAsc",
            active: currentSort === "asc",
            action: () => {
              this.sortEngine.sort(colDef.colId, colDef.field, "asc");
              this.columnModel.setColumnSort(colDef.colId, "asc");
              this.onAction("sort", colDef.colId);
            }
          },
          {
            kind: "leaf",
            label: "Sort Descending",
            icon: "sortDesc",
            active: currentSort === "desc",
            action: () => {
              this.sortEngine.sort(colDef.colId, colDef.field, "desc");
              this.columnModel.setColumnSort(colDef.colId, "desc");
              this.onAction("sort", colDef.colId);
            }
          },
          {
            kind: "leaf",
            label: "Clear Sort",
            icon: "close",
            disabled: !currentSort,
            action: () => {
              this.sortEngine.clearColumnSort(colDef.colId);
              this.columnModel.setColumnSort(colDef.colId, null);
              this.onAction("sort", colDef.colId);
            }
          }
        ]
      };
    }
    /**
     * Filter section — three flat items: Quick Filter, Advanced Filter, Clear Filter.
     */
    buildFilterSection(colDef) {
      const filterActive = colDef.filterActive === true;
      return {
        key: "filter" /* FILTER */,
        items: colDef.filterable === false ? [] : [
          {
            kind: "leaf",
            label: "Quick Filter\u2026",
            icon: "search",
            action: () => {
              this.menuCallbacks.onQuickFilter?.(colDef.colId);
              this.onAction("quick-filter", colDef.colId);
            }
          },
          {
            kind: "leaf",
            label: "Advanced Filter\u2026",
            icon: "filter",
            action: () => {
              const anchor = this.anchorEl ?? document.createElement("div");
              this.menuCallbacks.onOpenAdvancedFilter?.(colDef, anchor);
              this.onAction("advanced-filter", colDef.colId);
            }
          },
          {
            kind: "leaf",
            label: "Clear Filter",
            icon: "close",
            disabled: !filterActive,
            action: () => {
              this.eventBus.emit(GridEventType.COLUMN_FILTER_CHANGED, {
                colId: colDef.colId,
                field: colDef.field,
                term: ""
              });
              this.onAction("clear-filter", colDef.colId);
            }
          }
        ]
      };
    }
    /**
     * Pin section — a single parent item whose submenu has Pin Left / Pin Right / Unpin.
     */
    buildPinSection(colDef) {
      return {
        key: "pin" /* PIN */,
        items: [
          {
            kind: "parent",
            label: "Pin",
            icon: "pin",
            children: [
              {
                kind: "leaf",
                label: "Pin Left",
                icon: "pin",
                active: colDef.pinned === "left",
                action: () => {
                  this.columnModel.setColumnPin(colDef.colId, "left");
                  this.onAction("pin", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Pin Right",
                icon: "pin",
                active: colDef.pinned === "right",
                action: () => {
                  this.columnModel.setColumnPin(colDef.colId, "right");
                  this.onAction("pin", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Unpin",
                icon: "unpin",
                active: !colDef.pinned,
                action: () => {
                  this.columnModel.setColumnPin(colDef.colId, null);
                  this.onAction("pin", colDef.colId);
                }
              }
            ]
          }
        ]
      };
    }
    /**
     * Move section — four flat items.  Shares a separator group with Pin.
     * Items are disabled when the column is already at the respective edge.
     */
    buildMoveSection(colDef) {
      const cols = this.columnModel.getVisibleColumns();
      const idx = cols.findIndex((c) => c.colId === colDef.colId);
      const isFirst = idx <= 0;
      const isLast = idx >= cols.length - 1;
      return {
        key: "move" /* MOVE */,
        items: [
          {
            kind: "leaf",
            label: "Move Column to Left",
            icon: "chevronLeft",
            disabled: isFirst,
            action: () => {
              this.menuCallbacks.onMoveLeft?.(colDef.colId);
              this.onAction("move-left", colDef.colId);
            }
          },
          {
            kind: "leaf",
            label: "Move Column to Right",
            icon: "chevronRight",
            disabled: isLast,
            action: () => {
              this.menuCallbacks.onMoveRight?.(colDef.colId);
              this.onAction("move-right", colDef.colId);
            }
          },
          {
            kind: "leaf",
            label: "Move to Start",
            icon: "pageFirst",
            disabled: isFirst,
            action: () => {
              this.menuCallbacks.onMoveStart?.(colDef.colId);
              this.onAction("move-start", colDef.colId);
            }
          },
          {
            kind: "leaf",
            label: "Move to End",
            icon: "pageLast",
            disabled: isLast,
            action: () => {
              this.menuCallbacks.onMoveEnd?.(colDef.colId);
              this.onAction("move-end", colDef.colId);
            }
          }
        ]
      };
    }
    /**
     * Resize section — a single parent item whose submenu has four resize operations.
     */
    buildResizeSection(colDef) {
      return {
        key: "resize" /* RESIZE */,
        items: [
          {
            kind: "parent",
            label: "Resize",
            icon: "expand",
            children: [
              {
                kind: "leaf",
                label: "Auto Size",
                icon: "columns",
                action: () => {
                  this.menuCallbacks.onAutoSize?.(colDef.colId);
                  this.onAction("autosize", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Auto Size All",
                icon: "columns",
                action: () => {
                  this.menuCallbacks.onAutoSizeAll?.();
                  this.onAction("autosize-all", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Fit to Grid",
                icon: "expand",
                action: () => {
                  this.menuCallbacks.onFitToGrid?.();
                  this.onAction("fit-to-grid", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Reset Width",
                icon: "refresh",
                action: () => {
                  this.menuCallbacks.onResetWidth?.(colDef.colId);
                  this.onAction("reset-width", colDef.colId);
                }
              }
            ]
          }
        ]
      };
    }
    /**
     * Visibility section — a single parent item: Hide Column + Column Chooser.
     */
    buildVisibilitySection(colDef) {
      return {
        key: "visibility" /* VISIBILITY */,
        items: [
          {
            kind: "parent",
            label: "Visibility",
            icon: "eye",
            children: [
              {
                kind: "leaf",
                label: "Hide Column",
                icon: "eyeOff",
                action: () => {
                  this.columnModel.setColumnVisible(colDef.colId, false);
                  this.onAction("hide", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Column Chooser\u2026",
                icon: "columns",
                action: () => {
                  this.menuCallbacks.onOpenColumnChooser?.();
                  this.onAction("column-chooser", colDef.colId);
                }
              }
            ]
          }
        ]
      };
    }
    /**
     * Data section — Group by Column (flat leaf) + Aggregate (parent with submenu).
     * "Group by Column" is omitted when the column is not `groupable` or when no
     * {@link GroupCallbacks} have been registered.
     */
    buildDataSection(colDef) {
      const items = [];
      if (colDef.groupable !== false && this.groupCallbacks) {
        const grouped = this.groupCallbacks.isGrouped(colDef.colId);
        items.push({
          kind: "leaf",
          label: grouped ? "Remove Grouping" : "Group by Column",
          icon: "group",
          active: grouped,
          action: () => {
            if (grouped) this.groupCallbacks.removeGroup(colDef.colId);
            else this.groupCallbacks.addGroup(colDef.colId);
            this.onAction("group", colDef.colId);
          }
        });
      }
      items.push({
        kind: "parent",
        label: "Aggregate",
        icon: "sigma",
        children: [
          "sum" /* SUM */,
          "avg" /* AVG */,
          "min" /* MIN */,
          "max" /* MAX */,
          "count" /* COUNT */
        ].map((func) => ({
          kind: "leaf",
          label: func.charAt(0).toUpperCase() + func.slice(1),
          icon: "sigma",
          active: colDef.aggFunc === func,
          action: () => {
            this.menuCallbacks.onAggregate?.(colDef, func);
            this.onAction(`aggregate-${func}`, colDef.colId);
          }
        }))
      });
      return { key: "data" /* DATA */, items };
    }
    /**
     * Clipboard section — a single parent item: Copy Header / Copy Column / Copy Values.
     */
    buildClipboardSection(colDef) {
      return {
        key: "clipboard" /* CLIPBOARD */,
        items: [
          {
            kind: "parent",
            label: "Clipboard",
            icon: "copy",
            children: [
              {
                kind: "leaf",
                label: "Copy Header",
                icon: "copy",
                action: () => {
                  this.menuCallbacks.onCopyHeader?.(colDef);
                  this.onAction("copy-header", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Copy Column",
                icon: "copy",
                action: () => {
                  this.menuCallbacks.onCopyColumn?.(colDef);
                  this.onAction("copy-column", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Copy Values",
                icon: "copy",
                action: () => {
                  this.menuCallbacks.onCopyValues?.(colDef);
                  this.onAction("copy-values", colDef.colId);
                }
              }
            ]
          }
        ]
      };
    }
    /**
     * Column section — a single parent item: Rename / Duplicate / Freeze / Lock / Reset.
     */
    buildColumnSection(colDef) {
      return {
        key: "column" /* COLUMN */,
        items: [
          {
            kind: "parent",
            label: "Column",
            icon: "settings",
            children: [
              {
                kind: "leaf",
                label: "Rename",
                icon: "edit",
                action: () => {
                  this.menuCallbacks.onRename?.(colDef);
                  this.onAction("rename", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Duplicate",
                icon: "copy",
                action: () => {
                  this.menuCallbacks.onDuplicate?.(colDef);
                  this.onAction("duplicate", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Freeze Position",
                icon: "pin",
                action: () => {
                  this.menuCallbacks.onFreezePosition?.(colDef);
                  this.onAction("freeze", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Lock Column",
                icon: "lock",
                action: () => {
                  this.menuCallbacks.onLockColumn?.(colDef);
                  this.onAction("lock", colDef.colId);
                }
              },
              {
                kind: "leaf",
                label: "Reset Column",
                icon: "refresh",
                action: () => {
                  this.menuCallbacks.onResetColumn?.(colDef);
                  this.onAction("reset-column", colDef.colId);
                }
              }
            ]
          }
        ]
      };
    }
    // ── Private: DOM helpers ─────────────────────────────────────────────────
    createSeparator() {
      const sep = createDiv("pg-col-ctx-menu__separator");
      sep.setAttribute("role", "separator");
      return sep;
    }
    createIcon(iconName) {
      const el = createDiv("pg-col-ctx-menu__item-icon");
      el.innerHTML = this.iconRenderer.renderToString(iconName, 14);
      return el;
    }
    createLabel(text) {
      const el = createDiv("pg-col-ctx-menu__item-label");
      el.textContent = text;
      return el;
    }
    // ── Private: positioning ─────────────────────────────────────────────────
    /**
     * Position the menu relative to the anchor element (button click) or at the
     * cursor (right-click).  The menu is clamped to the visible viewport.
     */
    positionMenu(anchorEl, clientX, clientY) {
      const menu = this.el;
      if (!menu) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuW = menu.offsetWidth || 220;
      const menuH = menu.scrollHeight || 400;
      let left;
      let top;
      if (clientX !== void 0 && clientY !== void 0) {
        left = clientX;
        top = clientY;
      } else {
        const rect = anchorEl.getBoundingClientRect();
        left = rect.right - menuW;
        top = rect.bottom + 2;
      }
      if (left + menuW > vw) left = vw - menuW - 4;
      if (left < 4) left = 4;
      if (top + menuH > vh) top = (clientY ?? anchorEl.getBoundingClientRect().top) - menuH - 2;
      if (top < 4) top = 4;
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }
    /**
     * Flip a fly-out submenu to the left when it would overflow the viewport's
     * right edge, and shift it upward when it would overflow the bottom.
     * Called once each time the submenu becomes visible.
     */
    adjustSubmenuPosition(submenu, parentItem) {
      const parentRect = parentItem.getBoundingClientRect();
      const submenuW = submenu.offsetWidth || 180;
      const submenuH = submenu.scrollHeight || 200;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = parentRect.width;
      let top = -4;
      if (parentRect.right + submenuW > vw) {
        left = -submenuW;
      }
      const submenuBottom = parentRect.top + top + submenuH;
      if (submenuBottom > vh) {
        top += vh - submenuBottom - 4;
      }
      submenu.style.left = `${left}px`;
      submenu.style.top = `${top}px`;
    }
  };

  // src/renderer/group-context-menu.ts
  var GroupContextMenu = class {
    constructor(engine, iconRenderer) {
      this.engine = engine;
      this.iconRenderer = iconRenderer;
      this.el = null;
      this.anchorEl = null;
      this.outsideClickFn = null;
      this.escKeyFn = null;
      this.callbacks = {};
    }
    // ── Public API ────────────────────────────────────────────────────────────
    /**
     * Register optional callbacks for operations delegated outside this class.
     * Call this once after construction.
     */
    setCallbacks(callbacks) {
      this.callbacks = callbacks;
    }
    /**
     * Show the group context menu for `group`.
     *
     * @param group    - The group header node the menu operates on.
     * @param anchorEl - The element that triggered the menu (the group header cell).
     * @param clientX  - Viewport X for cursor-based positioning.
     * @param clientY  - Viewport Y for cursor-based positioning.
     */
    show(group, anchorEl, clientX, clientY) {
      this.hide();
      this.anchorEl = anchorEl;
      anchorEl.classList.add("pg-th--ctx-menu-open");
      const menu = this.buildMenu(group);
      document.body.appendChild(menu);
      this.el = menu;
      this.positionMenu(anchorEl, clientX, clientY);
      requestAnimationFrame(() => {
        this.outsideClickFn = (e) => {
          if (!this.el?.contains(e.target)) this.hide();
        };
        this.escKeyFn = (e) => {
          if (e.key === "Escape") this.hide();
        };
        document.addEventListener("mousedown", this.outsideClickFn);
        document.addEventListener("keydown", this.escKeyFn);
      });
    }
    /** Hide and remove the menu from the DOM. */
    hide() {
      if (this.outsideClickFn) {
        document.removeEventListener("mousedown", this.outsideClickFn);
        this.outsideClickFn = null;
      }
      if (this.escKeyFn) {
        document.removeEventListener("keydown", this.escKeyFn);
        this.escKeyFn = null;
      }
      this.anchorEl?.classList.remove("pg-th--ctx-menu-open");
      this.anchorEl = null;
      this.el?.remove();
      this.el = null;
    }
    /** Destroy the instance and release all resources. */
    destroy() {
      this.hide();
    }
    // ── Private: menu construction ────────────────────────────────────────────
    buildMenu(group) {
      const menu = createDiv("pg-col-ctx-menu");
      menu.setAttribute("role", "menu");
      menu.setAttribute("tabindex", "-1");
      const entries = this.buildEntries(group);
      for (const entry of entries) {
        if ("kind" in entry) {
          menu.appendChild(this.createSeparator());
        } else {
          menu.appendChild(this.buildItem(entry));
        }
      }
      return menu;
    }
    /**
     * Build the ordered list of items and separators for the given group.
     * Disables move items when the group is already at the respective edge.
     */
    buildEntries(group) {
      const id = group.logicalGroupId;
      const pos = this.engine.getGroupPositionInfo(id);
      const entries = [
        // ── Move ──────────────────────────────────────────────────────────────
        {
          label: "Move Column to Left",
          icon: "chevronLeft",
          disabled: pos.isFirst,
          action: () => {
            this.engine.moveGroupLeft(id);
            this.callbacks.onAction?.("move-left", id);
          }
        },
        {
          label: "Move Column to Right",
          icon: "chevronRight",
          disabled: pos.isLast,
          action: () => {
            this.engine.moveGroupRight(id);
            this.callbacks.onAction?.("move-right", id);
          }
        },
        {
          label: "Move to Start",
          icon: "pageFirst",
          disabled: pos.isFirst,
          action: () => {
            this.engine.moveGroupToStart(id);
            this.callbacks.onAction?.("move-start", id);
          }
        },
        {
          label: "Move to End",
          icon: "pageLast",
          disabled: pos.isLast,
          action: () => {
            this.engine.moveGroupToEnd(id);
            this.callbacks.onAction?.("move-end", id);
          }
        },
        // ── Separator ─────────────────────────────────────────────────────────
        { kind: "separator" },
        // ── Visibility ────────────────────────────────────────────────────────
        {
          label: "Hide Group",
          icon: "eyeOff",
          action: () => {
            this.engine.hideGroupLeaves(id);
            this.callbacks.onAction?.("hide-group", id);
          }
        },
        {
          label: "Choose Columns\u2026",
          icon: "columns",
          action: () => {
            this.callbacks.onOpenColumnChooser?.();
            this.callbacks.onAction?.("column-chooser", id);
          }
        }
      ];
      return entries;
    }
    // ── Private: DOM helpers ─────────────────────────────────────────────────
    buildItem(item) {
      const el = createDiv("pg-col-ctx-menu__item");
      el.setAttribute("role", "menuitem");
      el.setAttribute("tabindex", "-1");
      if (item.disabled) el.classList.add("pg-col-ctx-menu__item--disabled");
      const iconEl = createDiv("pg-col-ctx-menu__item-icon");
      iconEl.innerHTML = this.iconRenderer.renderToString(item.icon, 14);
      el.appendChild(iconEl);
      const labelEl = createDiv("pg-col-ctx-menu__item-label");
      labelEl.textContent = item.label;
      el.appendChild(labelEl);
      if (!item.disabled) {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          item.action();
          this.hide();
        });
      }
      return el;
    }
    createSeparator() {
      const sep = createDiv("pg-col-ctx-menu__separator");
      sep.setAttribute("role", "separator");
      return sep;
    }
    // ── Private: positioning ─────────────────────────────────────────────────
    /**
     * Position the menu at the cursor (right-click) or below the anchor element
     * (button click).  Clamps to the visible viewport with a 4 px gutter.
     */
    positionMenu(anchorEl, clientX, clientY) {
      const menu = this.el;
      if (!menu) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuW = menu.offsetWidth || 220;
      const menuH = menu.scrollHeight || 300;
      let left;
      let top;
      if (clientX !== void 0 && clientY !== void 0) {
        left = clientX;
        top = clientY;
      } else {
        const rect = anchorEl.getBoundingClientRect();
        left = rect.left;
        top = rect.bottom + 2;
      }
      if (left + menuW > vw) left = vw - menuW - 4;
      if (left < 4) left = 4;
      if (top + menuH > vh) top = (clientY ?? anchorEl.getBoundingClientRect().top) - menuH - 2;
      if (top < 4) top = 4;
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }
  };

  // src/renderer/header-renderer.ts
  var HeaderRenderer = class {
    constructor(store, eventBus, iconRenderer, columnModel, sortEngine, colStyles) {
      this.store = store;
      this.eventBus = eventBus;
      this.iconRenderer = iconRenderer;
      this.columnModel = columnModel;
      this.sortEngine = sortEngine;
      this.colStyles = colStyles;
      this.leftHeaderRowEl = null;
      this.centerHeaderRowEl = null;
      this.rightHeaderRowEl = null;
      this.centerFilterRowEl = null;
      this.headerCheckbox = null;
      this.groupContextMenu = null;
      this.groupDropZone = null;
      // ── Column-group header support ───────────────────────────────────────────
      /** Tree model for the column group hierarchy. `null` until wired via `setColumnGroupModel`. */
      this.groupModel = null;
      /** DOM builder for multi-row grouped header rows. `null` until wired. */
      this.groupHeaderBuilder = null;
      /** Group header row elements per panel — indexed 0..maxDepth-1. */
      this.leftGroupRowEls = [];
      this.centerGroupRowEls = [];
      this.rightGroupRowEls = [];
      /**
       * Callback invoked when the user clicks a group collapse/expand toggle.
       * Provided by `GridRenderer` so it can coordinate header + body rebuild.
       */
      this.onGroupToggleFn = null;
      /**
       * Callback invoked when the user finishes dragging a group resize handle.
       * `GridRenderer` wires this to distribute the delta and trigger reflow.
       */
      this.onGroupResizeFn = null;
      /**
       * Wired by `GridRenderer` after group model setup — used in `onGlobalMouseUp`
       * to create a clone group when a leaf is dropped onto a different group header.
       */
      this.groupDragHandler = null;
      /**
       * Display Group Engine — the new architecture that replaces ColumnGroupModel.
       * When set, `renderInPanels` uses this engine instead of the legacy model.
       */
      this.displayGroupEngine = null;
      /**
       * Cached header row height from the last `renderInPanels` / `updateCenterVisibleCols`
       * call.  Used by `rebuildGroupRowsForPanel` which is called during drag when
       * `HeaderRendererOptions` is not available on the call stack.
       */
      this.lastGroupRowHeight = 44;
      // Drag state
      this.draggingColId = null;
      this.isDragging = false;
      this.draggingPanelRowEl = null;
      this.draggingIsGroupable = false;
      this.isOverGroupZone = false;
      this.ghostEl = null;
      this.dragStyleEl = null;
      this.draggingGridEl = null;
      this.draggedColWidth = 0;
      this.dragStartScrollX = 0;
      this.dragIsHideMode = false;
      this.dragSourcePanel = "center";
      this.dragTargetPanel = "center";
      this.dragTargetLocalIdx = -1;
      this.panelDragData = [];
      // Live cross-panel move state
      this.livePanelMoveInProgress = false;
      // Auto-scroll state
      this.scrollByX = null;
      this.canScrollX = null;
      this.onResizeCb = null;
      this.autoScrollRAF = 0;
      this.autoScrollSpeed = 0;
      this.centerPanelRect = null;
      /** Last known cursor X during column drag — used to replay `onDragMove` after auto-scroll ticks. */
      this.lastDragClientX = 0;
      /** Callback wired by GridRenderer to open a filter panel for a column. */
      this.openFilterPanelFn = null;
      /** True while the user holds the resize handle and is actively moving the mouse. */
      this._isResizingColumn = false;
      // ─── Auto-scroll ──────────────────────────────────────────────────────────
      this.tickAutoScroll = () => {
        if (!this.isDragging || this.autoScrollSpeed === 0) return;
        if (this.autoScrollSpeed < 0 && !(this.canScrollX?.(-1) ?? true)) {
          this.stopAutoScroll();
          return;
        }
        if (this.autoScrollSpeed > 0 && !(this.canScrollX?.(1) ?? true)) {
          this.stopAutoScroll();
          return;
        }
        this.scrollByX?.(this.autoScrollSpeed);
        this.onDragMove(this.lastDragClientX);
        this.autoScrollRAF = requestAnimationFrame(this.tickAutoScroll);
      };
      this.columnMenu = new ColumnMenu(
        columnModel,
        sortEngine,
        eventBus,
        iconRenderer,
        (action, colId) => this.onAction(action, colId)
      );
      this.columnMenu.setMenuCallbacks({
        onAutoSize: (colId) => this.onAction("autosize", colId),
        onAutoSizeAll: () => this.onAction("autosize-all", ""),
        onFitToGrid: () => this.onAction("fit-to-grid", ""),
        onResetWidth: (colId) => this.onAction("reset-width", colId),
        onOpenColumnChooser: () => this.onAction("column-chooser", ""),
        onOpenAdvancedFilter: (colDef, anchorEl) => {
          this.openFilterPanelFn?.(colDef, anchorEl);
          this.onAction("advanced-filter", colDef.colId);
        },
        onQuickFilter: (colId) => this.onAction("quick-filter", colId),
        onCopyHeader: (colDef) => {
          navigator.clipboard?.writeText(colDef.header).catch(() => {
          });
          this.onAction("copy-header", colDef.colId);
        },
        onCopyColumn: (colDef) => this.onAction("copy-column", colDef.colId),
        onCopyValues: (colDef) => this.onAction("copy-values", colDef.colId),
        onRename: (colDef) => this.onAction("rename", colDef.colId),
        onDuplicate: (colDef) => this.onAction("duplicate", colDef.colId),
        onFreezePosition: (colDef) => this.onAction("freeze", colDef.colId),
        onLockColumn: (colDef) => this.onAction("lock", colDef.colId),
        onResetColumn: (colDef) => this.onAction("reset-column", colDef.colId),
        onAggregate: (colDef, func) => this.onAction(`aggregate-${func}`, colDef.colId),
        onMoveLeft: (colId) => {
          const cols = columnModel.getVisibleColumns();
          const idx = cols.findIndex((c) => c.colId === colId);
          if (idx > 0) {
            columnModel.moveColumn(idx, idx - 1);
            this.onAction("move", colId);
          }
        },
        onMoveRight: (colId) => {
          const cols = columnModel.getVisibleColumns();
          const idx = cols.findIndex((c) => c.colId === colId);
          if (idx < cols.length - 1) {
            columnModel.moveColumn(idx, idx + 1);
            this.onAction("move", colId);
          }
        },
        onMoveStart: (colId) => {
          const cols = columnModel.getVisibleColumns();
          const idx = cols.findIndex((c) => c.colId === colId);
          if (idx > 0) {
            columnModel.moveColumn(idx, 0);
            this.onAction("move", colId);
          }
        },
        onMoveEnd: (colId) => {
          const cols = columnModel.getVisibleColumns();
          const idx = cols.findIndex((c) => c.colId === colId);
          if (idx < cols.length - 1) {
            columnModel.moveColumn(idx, cols.length - 1);
            this.onAction("move", colId);
          }
        }
      });
      this.boundMouseMove = this.onGlobalMouseMove.bind(this);
      this.boundMouseUp = this.onGlobalMouseUp.bind(this);
    }
    /** Read by grid-renderer's columns-store watcher to skip header destroy during drag */
    get isDraggingCol() {
      return this.isDragging;
    }
    /**
     * `true` between the resize-handle `mousedown` and the corresponding `mouseup`.
     * Grid-renderer uses this to suppress body `renderRows` during resize — column
     * widths are driven by CSS rules from `ColumnStyleManager`, so the body DOM
     * never needs to be rebuilt while the user is dragging a resize handle.
     */
    get isResizingColumn() {
      return this._isResizingColumn;
    }
    setScrollCallback(fn, canScrollX) {
      this.scrollByX = fn;
      this.canScrollX = canScrollX ?? null;
    }
    setResizeCallback(cb) {
      this.onResizeCb = cb;
    }
    /**
     * Register the callback invoked when the user clicks the filter icon on a
     * filterable column header.  Wired by `GridRenderer.buildLayout()`.
     *
     * @param fn - Opens/positions a `FilterPanel` for the given column.
     */
    setOpenFilterPanelCallback(fn) {
      this.openFilterPanelFn = fn;
    }
    /**
     * Wire the column-group model and DOM builder into the header renderer.
     *
     * Call this before the first `renderInPanels` when the grid's column
     * definitions contain groups (i.e. `ColumnDef.children` is present on any
     * top-level column).  Once wired, `renderInPanels` and `updateCenterVisibleCols`
     * automatically insert and update the multi-row grouped header rows.
     *
     * @param model   - The live {@link ColumnGroupModel} for the grid.
     * @param builder - The {@link ColumnGroupHeaderBuilder} instance.
     */
    setColumnGroupModel(model, builder) {
      this.groupModel = model;
      this.groupHeaderBuilder = builder;
    }
    /**
     * Wire the new Display Group Engine into the header renderer.
     * When set, `renderInPanels` uses the engine's builder instead of the legacy
     * `ColumnGroupModel` + `ColumnGroupHeaderBuilder`.
     *
     * @param engine - The fully-initialised `DisplayGroupEngine` instance.
     */
    setDisplayGroupEngine(engine) {
      this.displayGroupEngine = engine;
      this.groupContextMenu = new GroupContextMenu(engine, this.iconRenderer);
      this.groupContextMenu.setCallbacks({
        onOpenColumnChooser: () => this.onAction("column-chooser", ""),
        onAction: (action, groupId) => this.onAction(action, groupId)
      });
    }
    /**
     * Register the callback fired when a user toggles a group's collapse state.
     *
     * `GridRenderer` wires this to coordinate header rebuild + leaf-column
     * visibility update in `ColumnModel`.
     *
     * @param fn - Receives the `groupId` of the toggled group.
     */
    setGroupToggleCallback(fn) {
      this.onGroupToggleFn = fn;
    }
    /**
     * Register the callback fired when a user finishes dragging a group resize handle.
     *
     * `GridRenderer` wires this to call {@link ColumnGroupModel.distributeResizeDelta}
     * and flush the updated widths to `ColumnStyleManager`.
     *
     * @param fn - Receives `groupId` and the new desired total group width.
     */
    setGroupResizeCallback(fn) {
      this.onGroupResizeFn = fn;
    }
    /**
     * Wire the group drag handler so that leaf drops on foreign group header cells
     * create solo clone groups instead of doing a plain column reorder.
     *
     * @param handler - The active `ColumnGroupDragHandler` instance.
     */
    setGroupDragHandler(handler) {
      this.groupDragHandler = handler;
    }
    /**
     * Rebuild only the group-header rows for all panels without touching the leaf
     * row or filter row.  Call this after a group collapse/expand event has already
     * been processed by the model (i.e. `group.collapsed` flag is up to date).
     *
     * @param options - Header renderer options (passed from last `renderInPanels` call).
     */
    rebuildGroupRows(options) {
      if (!this.groupModel || !this.groupHeaderBuilder) return;
      if (!this.groupModel.hasGroups()) return;
      const maxDepth = this.groupModel.getMaxDepth();
      const rowHeight = options.headerRowHeight ?? 44;
      const cellOpts = this.buildGroupCellOptions(rowHeight);
      const rebuildPanel = (rowEls, panel) => {
        const nodes = this.groupModel.getRootNodes(panel);
        this.groupHeaderBuilder.updateGroupRows(rowEls, nodes, this.colStyles, maxDepth, cellOpts);
      };
      rebuildPanel(this.leftGroupRowEls, "left");
      rebuildPanel(this.centerGroupRowEls, "center");
      rebuildPanel(this.rightGroupRowEls, "right");
    }
    /**
     * Updates the filter-active indicator (`pg-th--filter-active` class and icon
     * swap) on every rendered header cell based on the current `FilterModel`.
     * Called from the renderer's `filterModel` store watcher.
     *
     * @param activeColIds - Set of `colId` strings that currently have an active filter.
     */
    updateFilterIndicators(activeColIds) {
      const rows = [
        this.leftHeaderRowEl,
        this.centerHeaderRowEl,
        this.rightHeaderRowEl
      ].filter((r) => r !== null);
      for (const row of rows) {
        for (const cell of Array.from(row.querySelectorAll(".pg-th[data-col-id]"))) {
          const colId = cell.getAttribute("data-col-id") ?? "";
          const active = activeColIds.has(colId);
          cell.classList.toggle("pg-th--filter-active", active);
          const btn = cell.querySelector(".pg-th__filter-btn");
          if (btn) {
            btn.classList.toggle("pg-th__filter-btn--active", active);
            const iconName = active ? "filterActive" : "filter";
            const iconEl = btn.querySelector(".pg-icon");
            if (iconEl) this.iconRenderer.updateIcon(iconEl, iconName);
          }
        }
      }
    }
    // ── Private: group-cell option builder ───────────────────────────────────
    /**
     * Build the {@link GroupCellBuildOptions} object forwarded to the DOM builder.
     * Wires the toggle and resize callbacks registered by `GridRenderer`.
     */
    buildGroupCellOptions(rowHeight) {
      return {
        rowHeight,
        onCollapseToggle: (groupId) => {
          this.onGroupToggleFn?.(groupId);
        },
        onGroupResize: (groupId, newWidth) => {
          this.onGroupResizeFn?.(groupId, newWidth);
        }
      };
    }
    renderInPanels(leftContainer, centerInnerEl, rightContainer, allColumns, options = {}) {
      const leftCols = allColumns.filter((c) => c.pinned === "left");
      const centerCols = allColumns.filter((c) => c.pinned !== "left" && c.pinned !== "right");
      const rightCols = allColumns.filter((c) => c.pinned === "right");
      this.lastGroupRowHeight = options.headerRowHeight ?? this.lastGroupRowHeight;
      this.leftGroupRowEls = [];
      this.centerGroupRowEls = [];
      this.rightGroupRowEls = [];
      if (this.displayGroupEngine?.hasGroups) {
        const engine = this.displayGroupEngine;
        const rowHeight = options.headerRowHeight ?? 44;
        const dragHandler = engine.getDragHandler();
        const cellOpts = {
          rowHeight,
          onCollapseToggle: (id) => this.onGroupToggleFn?.(id),
          onGroupResize: (id, w) => this.onGroupResizeFn?.(id, w),
          onGroupHeaderMouseDown: dragHandler ? (e, node, el) => dragHandler.onHeaderMouseDown(e, node, el) : void 0,
          didJustDragFn: dragHandler ? () => dragHandler.didJustDrag : void 0,
          onGroupContextMenu: (e, node, el) => this.groupContextMenu?.show(node, el, e.clientX, e.clientY)
        };
        this.leftGroupRowEls = engine.headerBuilder.buildGroupRows(
          engine.buildTree(leftCols),
          cellOpts
        );
        this.centerGroupRowEls = engine.headerBuilder.buildGroupRows(
          engine.buildTree(centerCols),
          cellOpts
        );
        this.rightGroupRowEls = engine.headerBuilder.buildGroupRows(
          engine.buildTree(rightCols),
          cellOpts
        );
        for (const el of this.leftGroupRowEls) leftContainer.appendChild(el);
        for (const el of this.centerGroupRowEls) centerInnerEl.appendChild(el);
        for (const el of this.rightGroupRowEls) rightContainer.appendChild(el);
        leftContainer.style.setProperty("--pg-group-rows-count", String(this.leftGroupRowEls.length));
        centerInnerEl.style.setProperty("--pg-group-rows-count", String(this.centerGroupRowEls.length));
        rightContainer.style.setProperty("--pg-group-rows-count", String(this.rightGroupRowEls.length));
      } else if (this.groupModel?.hasGroups() && this.groupHeaderBuilder) {
        const maxDepth = this.groupModel.getMaxDepth();
        const rowHeight = options.headerRowHeight ?? 44;
        const cellOpts = this.buildGroupCellOptions(rowHeight);
        this.leftGroupRowEls = this.groupHeaderBuilder.buildGroupRows(
          this.groupModel.getRootNodes("left"),
          this.colStyles,
          maxDepth,
          cellOpts
        );
        this.centerGroupRowEls = this.groupHeaderBuilder.buildGroupRows(
          this.groupModel.getRootNodes("center"),
          this.colStyles,
          maxDepth,
          cellOpts
        );
        this.rightGroupRowEls = this.groupHeaderBuilder.buildGroupRows(
          this.groupModel.getRootNodes("right"),
          this.colStyles,
          maxDepth,
          cellOpts
        );
        for (const el of this.leftGroupRowEls) leftContainer.appendChild(el);
        for (const el of this.centerGroupRowEls) centerInnerEl.appendChild(el);
        for (const el of this.rightGroupRowEls) rightContainer.appendChild(el);
      }
      this.leftHeaderRowEl = this.buildHeaderRow(leftCols, options, true);
      leftContainer.appendChild(this.leftHeaderRowEl);
      if (options.showFilterRow) leftContainer.appendChild(this.buildFilterRow(leftCols, options, true));
      this.centerHeaderRowEl = this.buildHeaderRow(centerCols, options, false);
      if (options.hasGroupedColumns) {
        this.centerHeaderRowEl.insertBefore(
          this.buildAutoGroupTh(options.autoGroupColWidth ?? 200),
          this.centerHeaderRowEl.firstChild
        );
      }
      centerInnerEl.appendChild(this.centerHeaderRowEl);
      if (options.showFilterRow) {
        const filterRow = this.buildFilterRow(centerCols, options, false);
        this.centerFilterRowEl = filterRow;
        if (options.hasGroupedColumns) filterRow.insertBefore(createDiv("pg-filter-cell pg-filter-cell--auto-group"), filterRow.firstChild);
        centerInnerEl.appendChild(filterRow);
      }
      this.rightHeaderRowEl = this.buildHeaderRow(rightCols, options, false);
      rightContainer.appendChild(this.rightHeaderRowEl);
      if (options.showFilterRow) rightContainer.appendChild(this.buildFilterRow(rightCols, options, false));
    }
    updateSortIndicator(colId, order) {
      const rows = [this.leftHeaderRowEl, this.centerHeaderRowEl, this.rightHeaderRowEl].filter((r) => r !== null);
      for (const row of rows) {
        for (const cell of Array.from(row.querySelectorAll(".pg-th[data-col-id]"))) {
          const isTarget = cell.getAttribute("data-col-id") === colId;
          toggleClass(cell, "pg-th--sort-asc", isTarget && order === "asc");
          toggleClass(cell, "pg-th--sort-desc", isTarget && order === "desc");
          toggleClass(cell, "pg-th--sorted", isTarget && order !== null);
          if (isTarget) {
            const iconEl = cell.querySelector(".pg-th__sort-icon");
            if (iconEl) this.iconRenderer.updateIcon(iconEl, order === "asc" ? "sortAsc" : order === "desc" ? "sortDesc" : "sortNone");
          }
        }
      }
    }
    updateAllChecked(isAll, isIndeterminate) {
      if (!this.headerCheckbox) return;
      this.headerCheckbox.checked = isAll;
      this.headerCheckbox.indeterminate = isIndeterminate && !isAll;
    }
    setGroupDropZone(zone) {
      this.groupDropZone = zone;
      this.columnMenu.setGroupCallbacks({
        isGrouped: (colId) => zone.isGrouped(colId),
        addGroup: (colId) => zone.dropColumn(colId),
        removeGroup: (colId) => zone.removeColumn(colId)
      });
    }
    destroy() {
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("mouseup", this.boundMouseUp);
      this.columnMenu.destroy();
      this.groupContextMenu?.destroy();
      this.leftHeaderRowEl = null;
      this.centerHeaderRowEl = null;
      this.rightHeaderRowEl = null;
      this.centerFilterRowEl = null;
      this.headerCheckbox = null;
      this.leftGroupRowEls = [];
      this.centerGroupRowEls = [];
      this.rightGroupRowEls = [];
    }
    updateCenterVisibleCols(visibleCols, leftSpacerW, rightSpacerW, options) {
      if (!this.centerHeaderRowEl) return;
      this.lastGroupRowHeight = options.headerRowHeight ?? this.lastGroupRowHeight;
      if (this.displayGroupEngine?.hasGroups) {
        const allCols = this.store.get("columns");
        const centerCols = allCols.filter(
          (c) => c.pinned !== "left" && c.pinned !== "right" && c.visible !== false
        );
        this.rebuildGroupRowsForPanel("center", centerCols);
        if (this.isDragging) {
          this.rebuildGroupRowsForPanel(
            "left",
            allCols.filter((c) => c.pinned === "left" && c.visible !== false)
          );
          this.rebuildGroupRowsForPanel(
            "right",
            allCols.filter((c) => c.pinned === "right" && c.visible !== false)
          );
        }
      }
      if (this.groupModel?.hasGroups() && this.groupHeaderBuilder && this.centerGroupRowEls.length > 0) {
        const maxDepth = this.groupModel.getMaxDepth();
        const rowHeight = options.headerRowHeight ?? 44;
        const cellOpts = this.buildGroupCellOptions(rowHeight);
        this.groupHeaderBuilder.updateGroupRows(
          this.centerGroupRowEls,
          this.groupModel.getRootNodes("center"),
          this.colStyles,
          maxDepth,
          cellOpts
        );
      }
      const dragColId = this.isDragging ? this.draggingColId : null;
      let dragThEl = null;
      if (dragColId) {
        dragThEl = this.centerHeaderRowEl.querySelector(`.pg-th[data-col-id="${dragColId}"]`);
        dragThEl?.remove();
      }
      this.centerHeaderRowEl.innerHTML = "";
      if (options.hasGroupedColumns) this.centerHeaderRowEl.appendChild(this.buildAutoGroupTh(options.autoGroupColWidth ?? 200));
      if (leftSpacerW > 0) this.centerHeaderRowEl.appendChild(this.makeSpacer("pg-th pg-th--h-spacer", leftSpacerW));
      for (let i = 0; i < visibleCols.length; i++) {
        const col = visibleCols[i];
        if (dragThEl && col.colId === dragColId) {
          this.centerHeaderRowEl.appendChild(dragThEl);
        } else {
          this.centerHeaderRowEl.appendChild(this.buildHeaderCell(col, i, visibleCols, options, this.centerHeaderRowEl));
        }
      }
      if (rightSpacerW > 0) this.centerHeaderRowEl.appendChild(this.makeSpacer("pg-th pg-th--h-spacer", rightSpacerW));
      if (!this.centerFilterRowEl) return;
      this.centerFilterRowEl.innerHTML = "";
      if (options.hasGroupedColumns) this.centerFilterRowEl.appendChild(createDiv("pg-filter-cell pg-filter-cell--auto-group"));
      if (leftSpacerW > 0) this.centerFilterRowEl.appendChild(this.makeSpacer("pg-filter-cell pg-filter-cell--h-spacer", leftSpacerW));
      for (const col of visibleCols) this.centerFilterRowEl.appendChild(this.buildFilterCell(col));
      if (rightSpacerW > 0) this.centerFilterRowEl.appendChild(this.makeSpacer("pg-filter-cell pg-filter-cell--h-spacer", rightSpacerW));
    }
    // ─── Private ──────────────────────────────────────────────────────────────
    makeSpacer(cls, w) {
      const sp = createDiv(cls);
      sp.style.cssText = `width:${w}px;min-width:${w}px;flex-shrink:0;`;
      return sp;
    }
    capturePanelDragData() {
      const gatherPD = (panel, rowEl) => {
        if (!rowEl) return null;
        const ths = Array.from(rowEl.querySelectorAll(".pg-th[data-col-id]"));
        const headerPanel = rowEl.closest(".pg-panel__header");
        const bounds = headerPanel?.getBoundingClientRect() ?? null;
        if (!bounds || bounds.width === 0) return null;
        return {
          panel,
          rects: ths.map((t) => t.getBoundingClientRect()),
          colIds: ths.map((t) => t.getAttribute("data-col-id") ?? ""),
          bounds
        };
      };
      return [
        gatherPD("left", this.leftHeaderRowEl),
        gatherPD("center", this.centerHeaderRowEl),
        gatherPD("right", this.rightHeaderRowEl)
      ].filter((pd) => pd !== null);
    }
    buildHeaderRow(columns, options, isLeft) {
      const row = createDiv("pg-header-row");
      row.setAttribute("role", "row");
      if (isLeft) {
        if (options.showCheckboxes) row.appendChild(this.buildCheckboxHeaderCell());
        if (options.showSerialNumber) row.appendChild(this.buildSerialHeaderCell());
      }
      for (let i = 0; i < columns.length; i++) row.appendChild(this.buildHeaderCell(columns[i], i, columns, options, row));
      return row;
    }
    buildAutoGroupTh(width) {
      const th = createDiv("pg-th pg-th--auto-group");
      th.setAttribute("role", "columnheader");
      th.style.width = `${width}px`;
      th.style.minWidth = `${width}px`;
      const content = createDiv("pg-th__content");
      const labelEl = createDiv("pg-th__label");
      labelEl.textContent = "Groups";
      content.appendChild(labelEl);
      th.appendChild(content);
      return th;
    }
    buildCheckboxHeaderCell() {
      const cell = createDiv("pg-th pg-th--checkbox");
      cell.setAttribute("role", "columnheader");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "pg-checkbox pg-header-checkbox";
      checkbox.setAttribute("aria-label", "Select all rows");
      this.headerCheckbox = checkbox;
      const isAll = this.store.get("isAllSelected");
      const isInd = this.store.get("isIndeterminate");
      checkbox.checked = isAll;
      checkbox.indeterminate = isInd && !isAll;
      checkbox.addEventListener("change", () => {
        this.eventBus.emit(GridEventType.ALL_ROWS_SELECTED, { action: checkbox.checked ? "selectAll" : "deselectAll" });
      });
      cell.appendChild(checkbox);
      return cell;
    }
    buildSerialHeaderCell() {
      const cell = createDiv("pg-th pg-th--serial");
      cell.setAttribute("role", "columnheader");
      const label = document.createElement("span");
      label.className = "pg-th__serial-label";
      label.textContent = "#";
      cell.appendChild(label);
      return cell;
    }
    buildHeaderCell(col, index, panelColumns, options, panelRowEl) {
      const th = createDiv("pg-th");
      th.setAttribute("role", "columnheader");
      th.setAttribute("data-col-id", col.colId);
      th.setAttribute("data-col-index", String(index));
      th.setAttribute("tabindex", "0");
      if (this.displayGroupEngine?.hasGroups && this.displayGroupEngine.isFlat(col.colId)) {
        th.classList.add("pg-th--no-group");
      }
      if (col.headerCssClass) th.className += ` ${col.headerCssClass}`;
      toggleClass(th, "pg-th--sortable", col.sortable !== false);
      toggleClass(th, "pg-th--sorted", !!col.sortOrder);
      toggleClass(th, "pg-th--sort-asc", col.sortOrder === "asc");
      toggleClass(th, "pg-th--sort-desc", col.sortOrder === "desc");
      const align = col.textAlign ?? (col.type === "number" || col.type === "currency" ? "right" : "left");
      if (align !== "left") th.classList.add(`pg-th--align-${align}`);
      if (align === "right") th.classList.add("pg-th--reverse");
      if (col.headerRendererFn) {
        const rendered = col.headerRendererFn({ colDef: col, sortOrder: col.sortOrder ?? null, filterActive: !!col.filterActive, api: null });
        if (typeof rendered === "string") th.innerHTML = rendered;
        else th.appendChild(rendered);
      } else {
        const content = createDiv("pg-th__content");
        const labelEl = createDiv("pg-th__label");
        labelEl.textContent = col.header;
        labelEl.title = col.header;
        content.appendChild(labelEl);
        if (col.sortable !== false) {
          content.appendChild(this.iconRenderer.render(
            col.sortOrder === "asc" ? "sortAsc" : col.sortOrder === "desc" ? "sortDesc" : "sortNone",
            { size: 14, className: "pg-th__sort-icon" }
          ));
        }
        th.appendChild(content);
      }
      if (col.filterable !== false) {
        const filterBtn = createDiv("pg-th__filter-btn");
        const filterActive = col.filterActive === true;
        if (filterActive) filterBtn.classList.add("pg-th__filter-btn--active");
        filterBtn.innerHTML = this.iconRenderer.renderToString(filterActive ? "filterActive" : "filter", 14);
        filterBtn.title = "Filter column";
        filterBtn.setAttribute("tabindex", "0");
        filterBtn.setAttribute("aria-label", `Filter ${col.header}`);
        filterBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openFilterPanelFn?.(col, filterBtn);
        });
        th.appendChild(filterBtn);
      }
      if (options.showColumnMenu !== false) {
        const menuBtn = createDiv("pg-th__menu-btn");
        menuBtn.innerHTML = this.iconRenderer.renderToString("menuHorizontal", 14);
        menuBtn.title = "Column options";
        menuBtn.setAttribute("tabindex", "0");
        menuBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.columnMenu.show(col, menuBtn);
        });
        th.appendChild(menuBtn);
      }
      th.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.columnMenu.show(col, th, e.clientX, e.clientY);
      });
      if (col.resizable !== false) {
        const resizeHandle = createDiv("pg-th__resize-handle");
        resizeHandle.innerHTML = "|";
        resizeHandle.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.startResize(e, col, th);
        });
        th.appendChild(resizeHandle);
      }
      if (col.sortable !== false) {
        th.addEventListener("click", (e) => {
          if (e.target.closest(".pg-th__resize-handle, .pg-th__menu-btn, .pg-th__filter-btn")) return;
          const next = col.sortOrder === null ? "asc" : col.sortOrder === "asc" ? "desc" : null;
          if (next) this.sortEngine.sort(col.colId, col.field, next);
          else this.sortEngine.clearSort();
          this.columnModel.setColumnSort(col.colId, next);
          this.updateSortIndicator(col.colId, next);
          this.onAction("sort", col.colId);
        });
      }
      this.attachColumnDragListeners(th, col, panelColumns, panelRowEl);
      return th;
    }
    buildFilterCell(col) {
      const cell = createDiv("pg-filter-cell");
      cell.setAttribute("data-col-id", col.colId);
      if (col.filterable !== false) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "pg-filter-input";
        input.placeholder = `${col.header}\u2026`;
        input.setAttribute("data-col-id", col.colId);
        input.addEventListener("input", (e) => {
          this.eventBus.emit(GridEventType.COLUMN_FILTER_CHANGED, {
            colId: col.colId,
            field: col.field,
            term: e.target.value
          });
        });
        cell.appendChild(input);
      }
      return cell;
    }
    buildFilterRow(columns, options, isLeft) {
      const row = createDiv("pg-filter-row");
      row.setAttribute("role", "row");
      if (isLeft) {
        if (options.showCheckboxes) row.appendChild(createDiv("pg-filter-cell pg-filter-cell--checkbox"));
        if (options.showSerialNumber) row.appendChild(createDiv("pg-filter-cell pg-filter-cell--serial"));
      }
      for (const col of columns) row.appendChild(this.buildFilterCell(col));
      return row;
    }
    attachColumnDragListeners(th, col, _panelColumns, panelRowEl) {
      th.addEventListener("mousedown", (e) => {
        if (e.target.closest(".pg-th__resize-handle, .pg-th__menu-btn, .pg-th__filter-btn, .pg-checkbox")) return;
        if (col.draggable === false || e.button !== 0) return;
        const startX = e.clientX;
        let moved = false;
        const onMoveCheck = (ev) => {
          if (!moved && Math.abs(ev.clientX - startX) > 5) {
            moved = true;
            this.startColumnDrag(col, panelRowEl);
            document.removeEventListener("mousemove", onMoveCheck);
            document.addEventListener("mousemove", this.boundMouseMove);
            document.addEventListener("mouseup", this.boundMouseUp);
          }
          if (moved) this.onDragMove(ev.clientX);
        };
        const onUpEarly = () => {
          document.removeEventListener("mousemove", onMoveCheck);
          document.removeEventListener("mouseup", onUpEarly);
        };
        document.addEventListener("mousemove", onMoveCheck);
        document.addEventListener("mouseup", onUpEarly);
      });
    }
    startColumnDrag(col, panelRowEl) {
      this.draggingColId = col.colId;
      this.isDragging = true;
      this.draggingPanelRowEl = panelRowEl;
      this.draggingIsGroupable = col.groupable === true && this.groupDropZone !== null;
      this.isOverGroupZone = false;
      this.dragIsHideMode = false;
      this.livePanelMoveInProgress = false;
      this.dragSourcePanel = panelRowEl === this.leftHeaderRowEl ? "left" : panelRowEl === this.rightHeaderRowEl ? "right" : "center";
      this.dragTargetPanel = this.dragSourcePanel;
      this.dragTargetLocalIdx = -1;
      const ghost = createDiv("pg-col-drag-ghost");
      const mkIcon = (cls, name) => {
        const s = document.createElement("span");
        s.className = `pg-col-drag-ghost__icon ${cls}`;
        s.innerHTML = this.iconRenderer.renderToString(name, 14);
        return s;
      };
      ghost.appendChild(mkIcon("pg-col-drag-ghost__icon--arrow-left", "chevronLeft"));
      ghost.appendChild(mkIcon("pg-col-drag-ghost__icon--move", "drag"));
      ghost.appendChild(mkIcon("pg-col-drag-ghost__icon--ban", "ban"));
      ghost.appendChild(mkIcon("pg-col-drag-ghost__icon--hide", "eyeOff"));
      const ghostLabel = document.createElement("span");
      ghostLabel.className = "pg-col-drag-ghost__label";
      ghostLabel.textContent = col.header;
      ghost.appendChild(ghostLabel);
      ghost.appendChild(mkIcon("pg-col-drag-ghost__icon--arrow-right", "chevronRight"));
      document.body.appendChild(ghost);
      this.ghostEl = ghost;
      const srcPD = this.panelDragData.find((pd) => pd.panel === this.dragSourcePanel);
      const srcThEl = panelRowEl.querySelector(`[data-col-id="${col.colId}"]`);
      srcThEl?.classList.add("pg-th--dragging");
      const gridEl = panelRowEl.closest(".pg-grid");
      this.draggingGridEl = gridEl;
      this.panelDragData = this.capturePanelDragData();
      const freshSrcPD = this.panelDragData.find((pd) => pd.panel === this.dragSourcePanel);
      const srcIdx = freshSrcPD?.colIds.indexOf(col.colId) ?? -1;
      this.draggedColWidth = (srcIdx >= 0 && freshSrcPD ? freshSrcPD.rects[srcIdx].width : 0) || srcThEl?.getBoundingClientRect().width || 0;
      void srcPD;
      this.dragStartScrollX = parseFloat(gridEl?.style.getPropertyValue("--pg-scroll-x") ?? "0");
      const centerPD = this.panelDragData.find((pd) => pd.panel === "center");
      this.centerPanelRect = centerPD?.bounds ?? null;
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-pg-drag", "");
      document.head.appendChild(styleEl);
      this.dragStyleEl = styleEl;
      gridEl?.classList.add("pg-grid--col-dragging");
      gridEl?.classList.add("pg-grid--col-autoscrolling");
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (this.isDragging) this.draggingGridEl?.classList.remove("pg-grid--col-autoscrolling");
      }));
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    }
    // ─── Live cross-panel move ─────────────────────────────────────────────────
    /**
     * When the cursor crosses into a new panel:
     * 1. Immediately DOM-move the source TH into the target panel header row
     * 2. Call moveAndPin() so body cells and panel widths update via the guarded re-render
     * 3. After 2 frames (re-render complete), re-capture rects and continue drag
     */
    moveToPanelLive(newPanel, insertIdx) {
      if (this.livePanelMoveInProgress) return;
      this.livePanelMoveInProgress = true;
      const colId = this.draggingColId;
      const targetPD = this.panelDragData.find((pd) => pd.panel === newPanel);
      const insertBeforeColId = targetPD?.colIds[insertIdx] ?? null;
      const newPin = newPanel === "left" ? "left" : newPanel === "right" ? "right" : null;
      const targetRowEl = newPanel === "left" ? this.leftHeaderRowEl : newPanel === "right" ? this.rightHeaderRowEl : this.centerHeaderRowEl;
      const srcThEl = this.draggingGridEl?.querySelector(`.pg-th[data-col-id="${colId}"]`);
      if (srcThEl && targetRowEl) {
        const realThs = Array.from(targetRowEl.querySelectorAll(".pg-th[data-col-id]"));
        const refEl = insertIdx < realThs.length ? realThs[insertIdx] : null;
        if (refEl) targetRowEl.insertBefore(srcThEl, refEl);
        else {
          const lastTh = realThs[realThs.length - 1];
          if (lastTh?.nextSibling) targetRowEl.insertBefore(srcThEl, lastTh.nextSibling);
          else targetRowEl.appendChild(srcThEl);
        }
      }
      if (this.dragStyleEl) this.dragStyleEl.textContent = "";
      this.dragSourcePanel = newPanel;
      this.dragTargetPanel = newPanel;
      this.dragTargetLocalIdx = -1;
      this.columnModel.moveAndPin(colId, newPin, insertBeforeColId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!this.isDragging || this.draggingColId !== colId) {
            this.livePanelMoveInProgress = false;
            return;
          }
          this.draggingGridEl?.querySelector(`.pg-th[data-col-id="${colId}"]`)?.classList.add("pg-th--dragging");
          this.panelDragData = this.capturePanelDragData();
          this.dragStartScrollX = parseFloat(this.draggingGridEl?.style.getPropertyValue("--pg-scroll-x") ?? "0");
          const centerPD = this.panelDragData.find((pd) => pd.panel === "center");
          this.centerPanelRect = centerPD?.bounds ?? null;
          this.livePanelMoveInProgress = false;
        });
      });
    }
    updateAutoScroll(clientX) {
      if (!this.centerPanelRect || !this.scrollByX) return;
      const EDGE = 80;
      const { left, right } = this.centerPanelRect;
      let speed = 0;
      if (clientX < left + EDGE) {
        const raw = -Math.round((left + EDGE - clientX) / EDGE * 10);
        speed = this.canScrollX?.(-1) ?? true ? raw : 0;
      } else if (clientX > right - EDGE) {
        const raw = Math.round((clientX - right + EDGE) / EDGE * 10);
        speed = this.canScrollX?.(1) ?? true ? raw : 0;
      }
      const wasScrolling = this.autoScrollSpeed !== 0;
      this.autoScrollSpeed = speed;
      if (speed !== 0 && !wasScrolling) this.autoScrollRAF = requestAnimationFrame(this.tickAutoScroll);
      else if (speed === 0 && wasScrolling) this.stopAutoScroll();
      this.ghostEl?.classList.toggle("pg-col-drag-ghost--scroll-left", speed < 0);
      this.ghostEl?.classList.toggle("pg-col-drag-ghost--scroll-right", speed > 0);
    }
    stopAutoScroll() {
      cancelAnimationFrame(this.autoScrollRAF);
      this.autoScrollRAF = 0;
      this.autoScrollSpeed = 0;
      if (this.isDragging && !this.livePanelMoveInProgress && this.dragStyleEl) {
        this.draggingGridEl?.classList.add("pg-grid--col-autoscrolling");
        this.refreshDragAfterScroll();
        this.draggingGridEl?.classList.remove("pg-grid--col-autoscrolling");
      }
      this.ghostEl?.classList.remove("pg-col-drag-ghost--scroll-left", "pg-col-drag-ghost--scroll-right");
    }
    /**
     * Re-captures header column rects and re-applies drag transforms after each
     * auto-scroll step.  Runs 2 animation frames after the scroll so the grid's
     * virtual column render (`updateCenterVisibleCols`) has completed and the DOM
     * reflects any newly visible columns before `getBoundingClientRect` is called.
     *
     * This mirrors the 2-frame pattern used by `moveToPanelLive` and ensures the
     * dragged-column ghost and sibling transforms stay accurate even when the
     * mouse is stationary at the viewport edge while auto-scroll is running.
     */
    refreshDragAfterScroll() {
      if (!this.isDragging || this.livePanelMoveInProgress) return;
      if (this.dragStyleEl) this.dragStyleEl.textContent = "";
      this.draggingGridEl?.querySelector(`.pg-th[data-col-id="${this.draggingColId}"]`)?.classList.add("pg-th--dragging");
      this.panelDragData = this.capturePanelDragData();
      this.dragStartScrollX = parseFloat(
        this.draggingGridEl?.style.getPropertyValue("--pg-scroll-x") ?? "0"
      );
      const centerPD = this.panelDragData.find((pd) => pd.panel === "center");
      this.centerPanelRect = centerPD?.bounds ?? null;
      this.onDragMove(this.lastDragClientX);
    }
    // ─── Live group row preview (DisplayGroupEngine) ─────────────────────────
    /**
     * Rebuild the group header rows for one panel using a new (possibly preview)
     * column order.  Safe to call during drag — only the group row `<div>`s are
     * replaced; the leaf row `<tr>` that carries the live drag element is untouched.
     *
     * @param panel - Which panel's group rows to refresh.
     * @param cols  - Ordered visible columns for this panel (preview or committed).
     */
    rebuildGroupRowsForPanel(panel, cols) {
      if (!this.displayGroupEngine?.hasGroups) return;
      const leafRowEl = panel === "left" ? this.leftHeaderRowEl : panel === "right" ? this.rightHeaderRowEl : this.centerHeaderRowEl;
      if (!leafRowEl) return;
      const container = leafRowEl.parentElement;
      if (!container) return;
      const oldRows = panel === "left" ? this.leftGroupRowEls : panel === "right" ? this.rightGroupRowEls : this.centerGroupRowEls;
      for (const el of oldRows) el.remove();
      const engine = this.displayGroupEngine;
      const dragHandler = engine.getDragHandler();
      const cellOpts = {
        rowHeight: this.lastGroupRowHeight,
        onCollapseToggle: (id) => this.onGroupToggleFn?.(id),
        onGroupResize: (id, w) => this.onGroupResizeFn?.(id, w),
        onGroupHeaderMouseDown: dragHandler ? (e, node, el) => dragHandler.onHeaderMouseDown(e, node, el) : void 0,
        didJustDragFn: dragHandler ? () => dragHandler.didJustDrag : void 0,
        onGroupContextMenu: (e, node, el) => this.groupContextMenu?.show(node, el, e.clientX, e.clientY)
      };
      const newRows = engine.headerBuilder.buildGroupRows(engine.buildTree(cols), cellOpts);
      for (const el of newRows) container.insertBefore(el, leafRowEl);
      if (panel === "left") this.leftGroupRowEls = newRows;
      else if (panel === "right") this.rightGroupRowEls = newRows;
      else this.centerGroupRowEls = newRows;
      container.style.setProperty("--pg-group-rows-count", String(newRows.length));
    }
    /**
     * Compute the preview column order for the drag source panel (same-panel drag)
     * and rebuild its group rows.
     *
     * Called from `onDragMove` whenever the effective drop slot changes.  Always
     * derives the preview from the captured `panelDragData` colIds so the
     * `LogicalGroupRegistry` sees the exact order the column would land in on drop.
     *
     * @param targetIdx   - Effective slot index the dragged column is hovering over.
     * @param sourceIdx   - Original slot index of the dragged column in its panel.
     * @param pd          - Panel drag data for the source panel.
     */
    rebuildGroupRowsWithPreview(targetIdx, sourceIdx, pd) {
      const previewIds = [...pd.colIds];
      const [movedId] = previewIds.splice(sourceIdx, 1);
      previewIds.splice(targetIdx, 0, movedId);
      const allCols = this.store.get("columns");
      const colMap = new Map(allCols.map((c) => [c.colId, c]));
      const previewCols = previewIds.map((id) => colMap.get(id)).filter((c) => c !== void 0);
      this.rebuildGroupRowsForPanel(this.dragSourcePanel, previewCols);
    }
    // ─── Drag move ────────────────────────────────────────────────────────────
    onDragMove(clientX) {
      if (!this.isDragging || !this.draggingColId || !this.panelDragData.length || !this.dragStyleEl) return;
      if (this.livePanelMoveInProgress) {
        this.dragStyleEl.textContent = "";
        return;
      }
      let targetPD = this.panelDragData.find((pd) => {
        if (!pd.bounds) return false;
        return clientX >= pd.bounds.left && clientX <= pd.bounds.right;
      });
      if (!targetPD) targetPD = this.panelDragData.find((pd) => pd.panel === this.dragSourcePanel);
      if (!targetPD) return;
      this.dragTargetPanel = targetPD.panel;
      const crossPanel = targetPD.panel !== this.dragSourcePanel;
      const scrollDelta = targetPD.panel === "center" ? parseFloat(this.draggingGridEl?.style.getPropertyValue("--pg-scroll-x") ?? "0") - this.dragStartScrollX : 0;
      const { rects: tRects, colIds: tIds } = targetPD;
      const srcPD = this.panelDragData.find((pd) => pd.panel === this.dragSourcePanel);
      const sourceIdxInPanel = srcPD.colIds.indexOf(this.draggingColId);
      if (crossPanel) {
        let insertIdx = tIds.length;
        for (let i = 0; i < tRects.length; i++) {
          if (clientX < tRects[i].right + scrollDelta) {
            insertIdx = i;
            break;
          }
        }
        this.moveToPanelLive(targetPD.panel, insertIdx);
        this.dragStyleEl.textContent = "";
        return;
      }
      let effectiveTarget = sourceIdxInPanel;
      for (let i = 0; i < tRects.length; i++) {
        if (i === sourceIdxInPanel) continue;
        const colLeft = tRects[i].left + scrollDelta;
        const colRight = tRects[i].right + scrollDelta;
        if (clientX >= colLeft && clientX < colRight) {
          effectiveTarget = i;
          break;
        }
      }
      if (effectiveTarget === sourceIdxInPanel && tRects.length > 0 && clientX < tRects[0].left + scrollDelta) {
        effectiveTarget = sourceIdxInPanel === 0 ? 1 : 0;
      }
      if (effectiveTarget === sourceIdxInPanel && tRects.length > 0 && clientX >= tRects[tRects.length - 1].right + scrollDelta) {
        const lastIdx = tRects.length - 1;
        effectiveTarget = sourceIdxInPanel === lastIdx ? lastIdx - 1 : lastIdx;
      }
      const prevSlot = this.dragTargetLocalIdx;
      this.dragTargetLocalIdx = effectiveTarget;
      if (this.displayGroupEngine?.hasGroups && effectiveTarget !== prevSlot) {
        this.rebuildGroupRowsWithPreview(effectiveTarget, sourceIdxInPanel, srcPD);
      }
      const gridId = this.draggingGridEl?.getAttribute("data-photon-grid-id") ?? "";
      const scope = gridId ? `[data-photon-grid-id="${gridId}"] ` : "";
      let css2 = "";
      if (effectiveTarget === sourceIdxInPanel) {
        this.dragStyleEl.textContent = "";
        return;
      }
      const srcRect = srcPD.rects[sourceIdxInPanel];
      const tgtRect = tRects[effectiveTarget];
      const srcOffset = effectiveTarget > sourceIdxInPanel ? tgtRect.right - srcRect.right : tgtRect.left - srcRect.left;
      css2 += `${scope}[data-col-id="${tIds[sourceIdxInPanel]}"] { --pg-drag-x: ${srcOffset}px; z-index: 10; position: relative; transition: none; }
`;
      for (let i = 0; i < tRects.length; i++) {
        if (i === sourceIdxInPanel) continue;
        let offset = 0;
        if (effectiveTarget > sourceIdxInPanel && i > sourceIdxInPanel && i <= effectiveTarget) offset = -this.draggedColWidth;
        else if (effectiveTarget < sourceIdxInPanel && i >= effectiveTarget && i < sourceIdxInPanel) offset = this.draggedColWidth;
        if (offset !== 0) css2 += `${scope}[data-col-id="${tIds[i]}"] { --pg-drag-x: ${offset}px; }
`;
      }
      this.dragStyleEl.textContent = css2;
    }
    onGlobalMouseMove(e) {
      if (!this.isDragging || !this.draggingPanelRowEl) return;
      if (this.ghostEl) {
        this.ghostEl.style.left = `${e.clientX + 14}px`;
        this.ghostEl.style.top = `${e.clientY}px`;
      }
      const gridBounds = this.draggingGridEl?.getBoundingClientRect();
      const isOutside = !!gridBounds && (e.clientX < gridBounds.left || e.clientX > gridBounds.right || e.clientY < gridBounds.top || e.clientY > gridBounds.bottom);
      if (isOutside) {
        this.dragIsHideMode = true;
        this.stopAutoScroll();
        this.ghostEl?.classList.add("pg-col-drag-ghost--hide");
        this.ghostEl?.classList.remove("pg-col-drag-ghost--no-drop", "pg-col-drag-ghost--scroll-left", "pg-col-drag-ghost--scroll-right");
        if (this.dragStyleEl) this.dragStyleEl.textContent = "";
        return;
      }
      this.dragIsHideMode = false;
      this.ghostEl?.classList.remove("pg-col-drag-ghost--hide");
      const overGroupZone = this.groupDropZone?.isOver(e.clientX, e.clientY) ?? false;
      if (overGroupZone && !this.draggingIsGroupable) {
        this.stopAutoScroll();
        this.ghostEl?.classList.add("pg-col-drag-ghost--no-drop");
        document.body.style.cursor = "no-drop";
        if (this.dragStyleEl) this.dragStyleEl.textContent = "";
        return;
      }
      this.ghostEl?.classList.remove("pg-col-drag-ghost--no-drop");
      document.body.style.cursor = "grabbing";
      if (this.draggingIsGroupable && this.groupDropZone) {
        this.groupDropZone.highlight(overGroupZone);
        this.isOverGroupZone = overGroupZone;
        if (overGroupZone) {
          this.stopAutoScroll();
          if (this.dragStyleEl) this.dragStyleEl.textContent = "";
          return;
        }
      }
      this.lastDragClientX = e.clientX;
      this.updateAutoScroll(e.clientX);
      this.onDragMove(e.clientX);
    }
    onGlobalMouseUp(_e) {
      if (!this.isDragging) {
        this.cleanupDrag();
        return;
      }
      const colId = this.draggingColId;
      if (!colId) {
        this.cleanupDrag();
        return;
      }
      const sourcePanel = this.dragSourcePanel;
      const targetPanel = this.dragTargetPanel;
      const targetLocalIdx = this.dragTargetLocalIdx;
      const targetPD = this.panelDragData.find((pd) => pd.panel === targetPanel);
      const srcPD = this.panelDragData.find((pd) => pd.panel === sourcePanel);
      const srcLocalIdx = srcPD?.colIds.indexOf(colId) ?? -1;
      const isHide = this.dragIsHideMode;
      const isGroup = this.draggingIsGroupable && this.isOverGroupZone;
      const dropEl = document.elementFromPoint(_e.clientX, _e.clientY);
      const droppedOnGroupId = dropEl?.closest("[data-group-id]")?.getAttribute("data-group-id") ?? null;
      this.cleanupDrag();
      if (isHide) {
        this.columnModel.setColumnVisible(colId, false);
        return;
      }
      if (isGroup && this.groupDropZone) {
        this.groupDropZone.dropColumn(colId);
        return;
      }
      if (droppedOnGroupId && this.groupModel && this.groupDragHandler) {
        const parentGroup = this.groupModel.getParent(colId);
        if (parentGroup) {
          if (droppedOnGroupId !== parentGroup.groupId) {
            this.groupDragHandler.createLeafClone(colId, droppedOnGroupId);
            return;
          }
          return;
        }
      }
      if (sourcePanel === targetPanel) {
        const visibleCols = this.columnModel.getVisibleColumns();
        const globalFrom = visibleCols.findIndex((c) => c.colId === colId);
        if (globalFrom === -1) return;
        const targetColId = targetLocalIdx !== -1 && targetPD ? targetPD.colIds[targetLocalIdx] : null;
        const globalTo = targetColId ? visibleCols.findIndex((c) => c.colId === targetColId) : globalFrom;
        this.columnModel.moveColumn(globalFrom, globalTo !== -1 ? globalTo : globalFrom);
        if (this.groupModel && this.groupDragHandler) {
          const parent = this.groupModel.getParent(colId);
          if (parent) {
            const updatedCols = this.store.get("columns").filter((c) => c.visible !== false);
            const newIdx = updatedCols.findIndex((c) => c.colId === colId);
            if (newIdx !== -1 && this.isLeafOutsideGroup(colId, newIdx, updatedCols)) {
              const insertBeforeId = updatedCols[newIdx + 1]?.colId ?? null;
              this.groupDragHandler.extractLeafToSoloGroup(colId, insertBeforeId);
            }
          }
        }
      } else {
        const targetPin = targetPanel === "left" ? "left" : targetPanel === "right" ? "right" : null;
        const insertBeforeColId = targetPD ? targetPD.colIds[targetLocalIdx] ?? null : null;
        this.columnModel.moveAndPin(colId, targetPin, insertBeforeColId);
        if (this.groupModel && this.groupDragHandler) {
          const parent = this.groupModel.getParent(colId);
          if (parent) {
            this.groupDragHandler.extractLeafToSoloGroup(colId, insertBeforeColId);
          }
        }
      }
      void srcLocalIdx;
    }
    cleanupDrag() {
      this.isDragging = false;
      this.livePanelMoveInProgress = false;
      this.draggingIsGroupable = false;
      this.isOverGroupZone = false;
      this.dragIsHideMode = false;
      this.groupDropZone?.highlight(false);
      this.draggingPanelRowEl?.querySelector(".pg-th--dragging")?.classList.remove("pg-th--dragging");
      this.ghostEl?.remove();
      this.ghostEl = null;
      this.dragStyleEl?.remove();
      this.dragStyleEl = null;
      this.draggingGridEl?.classList.remove("pg-grid--col-dragging", "pg-grid--col-autoscrolling");
      this.draggingGridEl = null;
      this.draggedColWidth = 0;
      this.panelDragData = [];
      this.dragStartScrollX = 0;
      this.stopAutoScroll();
      this.centerPanelRect = null;
      this.draggingColId = null;
      this.dragTargetLocalIdx = -1;
      this.draggingPanelRowEl = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("mouseup", this.boundMouseUp);
    }
    startResize(e, col, thEl) {
      const startX = e.clientX;
      const startWidth = this.colStyles.getWidth(col.colId);
      thEl.classList.add("pg-th--resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      this._isResizingColumn = true;
      const onMove = (ev) => {
        this.colStyles.setWidth(col.colId, Math.max(col.minWidth ?? 60, startWidth + (ev.clientX - startX)));
        this.onResizeCb?.();
      };
      const onUp = (ev) => {
        this._isResizingColumn = false;
        const newWidth = Math.max(col.minWidth ?? 60, startWidth + (ev.clientX - startX));
        this.colStyles.setWidth(col.colId, newWidth);
        this.columnModel.setColumnWidth(col.colId, newWidth, true);
        thEl.classList.remove("pg-th--resizing");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }
    /**
     * Returns `true` when `colId` (at its new position `newIdx` in the visible
     * columns array) is no longer adjacent to any sibling leaf from its parent
     * group — meaning it has been dragged outside the group's contiguous span.
     *
     * @param colId  - The moved leaf column.
     * @param newIdx - Its new index in `cols`.
     * @param cols   - Current flat visible-column array (after the move).
     */
    isLeafOutsideGroup(colId, newIdx, cols) {
      if (!this.groupModel) return false;
      const parent = this.groupModel.getParent(colId);
      if (!parent) return false;
      const siblings = new Set(
        this.groupModel.getLeavesInGroup(parent.groupId).map((l) => l.colId).filter((id) => id !== colId)
      );
      const left = cols[newIdx - 1];
      const right = cols[newIdx + 1];
      return !(left && siblings.has(left.colId)) && !(right && siblings.has(right.colId));
    }
    onAction(action, colId) {
      this.eventBus.emit(GridEventType.COLUMNS_STATE_CHANGED, {
        action,
        colId,
        states: this.columnModel.getColumnStates()
      });
    }
  };

  // src/chart/sparkline/sparkline-renderer.ts
  var SparklineTooltip = {
    _el: null,
    /** Returns the shared tooltip element, creating it on first access. */
    get() {
      if (!SparklineTooltip._el) {
        const el = document.createElement("div");
        el.className = "pg-sparkline-tooltip";
        el.setAttribute("role", "tooltip");
        el.setAttribute("aria-live", "polite");
        document.body.appendChild(el);
        SparklineTooltip._el = el;
      }
      return SparklineTooltip._el;
    },
    /**
     * Shows the tooltip with a single numeric value, optionally preceded by a
     * label row (from `xKey`).
     *
     * @param clientX - Cursor x in viewport coordinates.
     * @param clientY - Cursor y in viewport coordinates.
     * @param label   - Optional x-axis label (only shown when `hasLabel` is true).
     * @param value   - Numeric y-value to display.
     * @param hasLabel - Whether a label row should be rendered.
     */
    show(clientX, clientY, label, value, hasLabel) {
      const el = SparklineTooltip.get();
      el.innerHTML = "";
      if (hasLabel && label !== void 0) {
        const labelEl = document.createElement("div");
        labelEl.className = "pg-sparkline-tooltip__label";
        labelEl.textContent = label;
        el.appendChild(labelEl);
      }
      const valueEl = document.createElement("div");
      valueEl.className = "pg-sparkline-tooltip__value";
      valueEl.textContent = formatNumber(value);
      el.appendChild(valueEl);
      SparklineTooltip._position(el, clientX, clientY);
    },
    /**
     * Shows the tooltip with four OHLC values.
     *
     * @param clientX - Cursor x in viewport coordinates.
     * @param clientY - Cursor y in viewport coordinates.
     * @param pt      - Normalised OHLC data point.
     * @param hasLabel - Whether a label row should be rendered.
     */
    showOHLC(clientX, clientY, pt, hasLabel) {
      const el = SparklineTooltip.get();
      el.innerHTML = "";
      if (hasLabel && pt.label !== void 0) {
        const labelEl = document.createElement("div");
        labelEl.className = "pg-sparkline-tooltip__label";
        labelEl.textContent = pt.label;
        el.appendChild(labelEl);
      }
      const rows = [
        ["O", pt.open],
        ["H", pt.high],
        ["L", pt.low],
        ["C", pt.close]
      ];
      for (const [key, val] of rows) {
        const row = document.createElement("div");
        row.className = "pg-sparkline-tooltip__ohlc-row";
        const keyEl = document.createElement("span");
        keyEl.className = "pg-sparkline-tooltip__ohlc-key";
        keyEl.textContent = key;
        const valEl = document.createElement("span");
        valEl.className = "pg-sparkline-tooltip__value";
        valEl.textContent = formatNumber(val);
        row.appendChild(keyEl);
        row.appendChild(valEl);
        el.appendChild(row);
      }
      SparklineTooltip._position(el, clientX, clientY);
    },
    /** Hides the tooltip without removing it from the DOM. */
    hide() {
      if (SparklineTooltip._el) {
        SparklineTooltip._el.className = "pg-sparkline-tooltip pg-sparkline-tooltip--hidden";
      }
    },
    /** @internal Positions and reveals the tooltip near the cursor. */
    _position(el, cx, cy) {
      el.className = "pg-sparkline-tooltip";
      const ew = el.offsetWidth || 80;
      const eh = el.offsetHeight || 40;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = cx + 14;
      if (left + ew > vw - 8) left = cx - ew - 14;
      let top = cy - Math.round(eh / 2);
      if (top < 4) top = 4;
      if (top + eh > vh - 4) top = vh - eh - 4;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }
  };
  function formatNumber(n) {
    if (!isFinite(n)) return "\u2014";
    const abs = Math.abs(n);
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
    if (n !== Math.floor(n)) return n.toFixed(2);
    return String(n);
  }
  function cssVar(el, varName, fallback) {
    const raw = getComputedStyle(el).getPropertyValue(varName).trim();
    return raw || fallback;
  }
  function hexToRgba(hex, opacity) {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return hex;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }
  var SparklineRenderer = class {
    /**
     * Creates a new SparklineRenderer and immediately draws the chart.
     *
     * The canvas **must** already have non-zero CSS dimensions when this
     * constructor is called; the constructor reads `clientWidth` / `clientHeight`
     * to set the backing-buffer resolution for retina displays.
     *
     * @param canvas  - The `<canvas>` element to draw onto.
     * @param rawData - The cell value; a flat `number[]` or `object[]`.
     * @param config  - Sparkline appearance configuration.
     */
    constructor(canvas, rawData, config) {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("[PhotonGrid] SparklineRenderer: failed to get 2D context");
      }
      this.canvas = canvas;
      this.ctx = ctx;
      this.cfg = this._resolveConfig(config);
      this.rawData = rawData;
      this.isOHLC = this.cfg.type === "candlestick" || this.cfg.type === "ohlc";
      this.hasLabels = this._rawHasLabels(rawData, this.cfg);
      if (this.isOHLC) {
        this.ohlcPoints = this._parseOHLC(rawData);
        this.points = [];
      } else {
        this.points = this._parsePoints(rawData);
        this.ohlcPoints = [];
      }
      this._syncSize();
      this._onMouseMove = this._handleMouseMove.bind(this);
      this._onMouseLeave = this._handleMouseLeave.bind(this);
      if (this.cfg.showTooltip) {
        this.canvas.addEventListener("mousemove", this._onMouseMove);
        this.canvas.addEventListener("mouseleave", this._onMouseLeave);
      }
      this._draw();
    }
    // ─── Public API ────────────────────────────────────────────────────────────
    /**
     * Re-parses {@link rawData} and redraws the chart onto the canvas.
     *
     * Designed for real-time use cases where the same array reference is
     * mutated in-place on each tick (e.g. a live stock ticker).  No new data
     * reference is needed — the renderer reads from the same array it received
     * at construction time.
     *
     * @example
     * ```ts
     * // Shift the live array and call redraw — no new SparklineRenderer needed.
     * history.shift();
     * history.push(newPrice);
     * renderer.redraw();
     * ```
     */
    redraw() {
      if (this.isOHLC) {
        this.ohlcPoints = this._parseOHLC(this.rawData);
      } else {
        this.points = this._parsePoints(this.rawData);
      }
      this._syncSize();
      this._draw();
    }
    /**
     * Releases all event listeners held by this renderer.
     * Must be called when the host cell element is removed from the DOM to
     * prevent memory leaks.
     */
    destroy() {
      this.canvas.removeEventListener("mousemove", this._onMouseMove);
      this.canvas.removeEventListener("mouseleave", this._onMouseLeave);
      SparklineTooltip.hide();
    }
    // ─── Initialisation helpers ────────────────────────────────────────────────
    /**
     * Sets `canvas.width` / `canvas.height` to the physical pixel resolution
     * (CSS size × device pixel ratio) and resets the transform.
     */
    _syncSize() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    /**
     * Builds the {@link ResolvedConfig} by merging caller-provided options with
     * theme CSS variables and hard-coded defaults.
     *
     * @param config - Raw user-supplied configuration.
     * @returns Fully resolved configuration object.
     */
    _resolveConfig(config) {
      const el = this.canvas;
      const primaryColor = cssVar(el, "--pg-primary", "#2563eb");
      const errorColor = cssVar(el, "--pg-colors-error", "#ef4444");
      const successColor = cssVar(el, "--pg-colors-success", "#22c55e");
      const stroke = config.stroke ?? primaryColor;
      const positiveColor = config.positiveColor ?? stroke;
      let fillColor = config.fill ?? "";
      if (!fillColor) {
        if (stroke.startsWith("#") && stroke.length === 7) {
          fillColor = hexToRgba(stroke, 0.18);
        } else {
          fillColor = stroke;
        }
      }
      return {
        type: config.type ?? "line",
        stroke,
        fill: fillColor,
        lineWidth: config.lineWidth ?? 1.5,
        showMarkers: config.showMarkers ?? false,
        markerSize: config.markerSize ?? 2.5,
        markerFill: config.markerFill ?? stroke,
        padding: config.padding ?? 3,
        barSpacing: config.barSpacing ?? 0.15,
        positiveColor,
        negativeColor: config.negativeColor ?? errorColor,
        bullColor: config.bullColor ?? successColor,
        bearColor: config.bearColor ?? errorColor,
        showTooltip: config.showTooltip ?? true,
        xKey: config.xKey ?? "",
        yKey: config.yKey ?? "value",
        openKey: config.openKey ?? "open",
        highKey: config.highKey ?? "high",
        lowKey: config.lowKey ?? "low",
        closeKey: config.closeKey ?? "close"
      };
    }
    /**
     * Returns `true` when the raw cell value is an object array that contains
     * an x-axis label key (from `config.xKey`).
     *
     * @param rawData - The cell value.
     * @param cfg     - Resolved configuration.
     */
    _rawHasLabels(rawData, cfg) {
      if (!Array.isArray(rawData) || rawData.length === 0) return false;
      return typeof rawData[0] === "object" && rawData[0] !== null && !!cfg.xKey;
    }
    /**
     * Normalises the raw cell value into an array of {@link SparklinePoint}s.
     * Accepts `number[]` or `object[]`; non-numeric / null values become `0`.
     *
     * @param rawData - The cell value.
     * @returns Array of normalised data points.
     */
    _parsePoints(rawData) {
      if (!Array.isArray(rawData) || rawData.length === 0) return [];
      return rawData.map((item, index) => {
        if (typeof item === "number") {
          return { index, value: item };
        }
        if (typeof item === "object" && item !== null) {
          const obj = item;
          const value = Number(obj[this.cfg.yKey] ?? 0);
          const label = this.cfg.xKey ? String(obj[this.cfg.xKey] ?? index) : void 0;
          return { index, value: isFinite(value) ? value : 0, label };
        }
        return { index, value: Number(item) || 0 };
      });
    }
    /**
     * Normalises the raw cell value into an array of {@link OHLCPoint}s.
     * Used for `candlestick` and `ohlc` chart types.
     *
     * @param rawData - The cell value.
     * @returns Array of normalised OHLC data points.
     */
    _parseOHLC(rawData) {
      if (!Array.isArray(rawData) || rawData.length === 0) return [];
      return rawData.map((item, index) => {
        const obj = typeof item === "object" && item !== null ? item : {};
        const num = (key) => {
          const v = Number(obj[key] ?? 0);
          return isFinite(v) ? v : 0;
        };
        const label = this.cfg.xKey ? String(obj[this.cfg.xKey] ?? index) : void 0;
        return {
          index,
          open: num(this.cfg.openKey),
          high: num(this.cfg.highKey),
          low: num(this.cfg.lowKey),
          close: num(this.cfg.closeKey),
          label
        };
      });
    }
    // ─── Drawing dispatch ──────────────────────────────────────────────────────
    /**
     * Clears the canvas and delegates to the type-specific draw method.
     */
    _draw() {
      const { ctx } = this;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      switch (this.cfg.type) {
        case "line":
          this._drawLine(w, h);
          break;
        case "area":
          this._drawArea(w, h);
          break;
        case "column":
          this._drawColumn(w, h);
          break;
        case "bar":
          this._drawBar(w, h);
          break;
        case "win-loss":
          this._drawWinLoss(w, h);
          break;
        case "candlestick":
          this._drawCandlestick(w, h);
          break;
        case "ohlc":
          this._drawOHLC(w, h);
          break;
      }
    }
    // ─── Type-specific renderers ───────────────────────────────────────────────
    /**
     * Renders a `line` sparkline: a polyline connecting all data points.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawLine(w, h) {
      const pts = this.points;
      if (pts.length < 2) return;
      const { ctx, cfg } = this;
      const { pad, plotW, plotH, plotLeft, plotTop, minV, range } = this._plotMetrics(w, h, pts);
      ctx.beginPath();
      ctx.strokeStyle = cfg.stroke;
      ctx.lineWidth = cfg.lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let i = 0; i < pts.length; i++) {
        const x = this._xPos(i, pts.length, plotLeft, plotW);
        const y = this._yPos(pts[i].value, minV, range, plotTop, plotH);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (cfg.showMarkers) this._drawMarkers(pts, plotLeft, plotTop, plotW, plotH, minV, range);
      void pad;
    }
    /**
     * Renders an `area` sparkline: a filled region beneath a line chart.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawArea(w, h) {
      const pts = this.points;
      if (pts.length < 2) return;
      const { ctx, cfg } = this;
      const { plotW, plotH, plotLeft, plotTop, plotBottom, minV, range } = this._plotMetrics(w, h, pts);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = this._xPos(i, pts.length, plotLeft, plotW);
        const y = this._yPos(pts[i].value, minV, range, plotTop, plotH);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const lastX = this._xPos(pts.length - 1, pts.length, plotLeft, plotW);
      const firstX = this._xPos(0, pts.length, plotLeft, plotW);
      ctx.lineTo(lastX, plotBottom);
      ctx.lineTo(firstX, plotBottom);
      ctx.closePath();
      ctx.fillStyle = cfg.fill;
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = cfg.stroke;
      ctx.lineWidth = cfg.lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let i = 0; i < pts.length; i++) {
        const x = this._xPos(i, pts.length, plotLeft, plotW);
        const y = this._yPos(pts[i].value, minV, range, plotTop, plotH);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (cfg.showMarkers) this._drawMarkers(pts, plotLeft, plotTop, plotW, plotH, minV, range);
    }
    /**
     * Renders a `column` sparkline: vertical bars anchored at the zero line.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawColumn(w, h) {
      const pts = this.points;
      if (pts.length === 0) return;
      const { ctx, cfg } = this;
      const { plotW, plotH, plotLeft, plotTop, minV, range } = this._plotMetrics(w, h, pts);
      const n = pts.length;
      const bandW = plotW / n;
      const gap = bandW * cfg.barSpacing;
      const barW = Math.max(1, bandW - gap);
      const zeroY = this._yPos(0, minV, range, plotTop, plotH);
      for (const pt of pts) {
        const x = plotLeft + pt.index * bandW + gap / 2;
        const yVal = this._yPos(pt.value, minV, range, plotTop, plotH);
        const top = Math.min(yVal, zeroY);
        const barH = Math.max(1, Math.abs(yVal - zeroY));
        ctx.fillStyle = pt.value >= 0 ? cfg.positiveColor : cfg.negativeColor;
        ctx.fillRect(x, top, barW, barH);
      }
    }
    /**
     * Renders a `bar` sparkline: horizontal bars anchored at the zero line.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawBar(w, h) {
      const pts = this.points;
      if (pts.length === 0) return;
      const { ctx, cfg } = this;
      const pad = cfg.padding;
      const plotH = h - pad * 2;
      const plotW = w - pad * 2;
      const plotTop = pad;
      const plotLeft = pad;
      const minV = Math.min(...pts.map((p) => p.value), 0);
      const maxV = Math.max(...pts.map((p) => p.value), 0);
      const range = maxV - minV || 1;
      const n = pts.length;
      const bandH = plotH / n;
      const gap = bandH * cfg.barSpacing;
      const barH = Math.max(1, bandH - gap);
      const zeroX = plotLeft + (0 - minV) / range * plotW;
      for (const pt of pts) {
        const y = plotTop + pt.index * bandH + gap / 2;
        const xVal = plotLeft + (pt.value - minV) / range * plotW;
        const left = Math.min(xVal, zeroX);
        const barW = Math.max(1, Math.abs(xVal - zeroX));
        ctx.fillStyle = pt.value >= 0 ? cfg.positiveColor : cfg.negativeColor;
        ctx.fillRect(left, y, barW, barH);
      }
    }
    /**
     * Renders a `win-loss` sparkline: uniform-height bars indicating
     * positive (win), negative (loss), or zero (neutral) values.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawWinLoss(w, h) {
      const pts = this.points;
      if (pts.length === 0) return;
      const { ctx, cfg } = this;
      const pad = cfg.padding;
      const plotTop = pad;
      const plotH = h - pad * 2;
      const plotLeft = pad;
      const plotW = w - pad * 2;
      const n = pts.length;
      const bandW = plotW / n;
      const gap = bandW * cfg.barSpacing;
      const barW = Math.max(1, bandW - gap);
      const midY = plotTop + plotH / 2;
      const halfH = Math.max(1, plotH / 2 - 1);
      for (const pt of pts) {
        const x = plotLeft + pt.index * bandW + gap / 2;
        if (pt.value > 0) {
          ctx.fillStyle = cfg.positiveColor;
          ctx.fillRect(x, midY - halfH, barW, halfH);
        } else if (pt.value < 0) {
          ctx.fillStyle = cfg.negativeColor;
          ctx.fillRect(x, midY, barW, halfH);
        } else {
          ctx.fillStyle = cssVar(this.canvas, "--pg-colors-border", "#e2e8f0");
          ctx.fillRect(x, midY - 1, barW, 2);
        }
      }
    }
    /**
     * Renders a `candlestick` sparkline: OHLC data as filled bodies with wicks.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawCandlestick(w, h) {
      const pts = this.ohlcPoints;
      if (pts.length === 0) return;
      const { ctx, cfg } = this;
      const metrics = this._ohlcMetrics(w, h, pts);
      const { plotLeft, plotTop, plotW, plotH, minV, range, bandW, gap } = metrics;
      for (const pt of pts) {
        const isBull = pt.close >= pt.open;
        const color = isBull ? cfg.bullColor : cfg.bearColor;
        const cx = plotLeft + pt.index * bandW + bandW / 2;
        const highY = this._yPos(pt.high, minV, range, plotTop, plotH);
        const lowY = this._yPos(pt.low, minV, range, plotTop, plotH);
        const openY = this._yPos(pt.open, minV, range, plotTop, plotH);
        const closeY = this._yPos(pt.close, minV, range, plotTop, plotH);
        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.max(1, Math.abs(closeY - openY));
        const barW = Math.max(2, bandW - gap);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, highY);
        ctx.lineTo(cx, lowY);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(cx - barW / 2, bodyTop, barW, bodyH);
      }
    }
    /**
     * Renders an `ohlc` sparkline: high-low wicks with open / close tick marks.
     *
     * @param w - CSS logical canvas width.
     * @param h - CSS logical canvas height.
     */
    _drawOHLC(w, h) {
      const pts = this.ohlcPoints;
      if (pts.length === 0) return;
      const { ctx, cfg } = this;
      const metrics = this._ohlcMetrics(w, h, pts);
      const { plotLeft, plotTop, plotW, plotH, minV, range, bandW } = metrics;
      const tickLen = Math.max(2, Math.min(4, bandW * 0.35));
      for (const pt of pts) {
        const isBull = pt.close >= pt.open;
        const color = isBull ? cfg.bullColor : cfg.bearColor;
        const cx = plotLeft + pt.index * bandW + bandW / 2;
        const highY = this._yPos(pt.high, minV, range, plotTop, plotH);
        const lowY = this._yPos(pt.low, minV, range, plotTop, plotH);
        const openY = this._yPos(pt.open, minV, range, plotTop, plotH);
        const closeY = this._yPos(pt.close, minV, range, plotTop, plotH);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, bandW * 0.15);
        ctx.lineCap = "square";
        ctx.beginPath();
        ctx.moveTo(cx, highY);
        ctx.lineTo(cx, lowY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - tickLen, openY);
        ctx.lineTo(cx, openY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, closeY);
        ctx.lineTo(cx + tickLen, closeY);
        ctx.stroke();
      }
      void plotW;
    }
    // ─── Shared drawing utilities ──────────────────────────────────────────────
    /**
     * Draws circular markers at each data point for `line` and `area` charts.
     *
     * @param pts      - Normalised data points.
     * @param plotLeft - Left edge of the plot area (logical px).
     * @param plotTop  - Top edge of the plot area (logical px).
     * @param plotW    - Width of the plot area (logical px).
     * @param plotH    - Height of the plot area (logical px).
     * @param minV     - Minimum value in the series.
     * @param range    - Value range (maxV - minV).
     */
    _drawMarkers(pts, plotLeft, plotTop, plotW, plotH, minV, range) {
      const { ctx, cfg } = this;
      ctx.fillStyle = cfg.markerFill;
      for (let i = 0; i < pts.length; i++) {
        const x = this._xPos(i, pts.length, plotLeft, plotW);
        const y = this._yPos(pts[i].value, minV, range, plotTop, plotH);
        ctx.beginPath();
        ctx.arc(x, y, cfg.markerSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ─── Coordinate helpers ────────────────────────────────────────────────────
    /**
     * Computes common plot-area metrics for scalar (non-OHLC) chart types.
     *
     * @param w   - Logical canvas width.
     * @param h   - Logical canvas height.
     * @param pts - Data points to compute value domain from.
     * @returns Plot dimensions and domain bounds.
     */
    _plotMetrics(w, h, pts) {
      const pad = this.cfg.padding;
      const plotLeft = pad;
      const plotTop = pad;
      const plotRight = w - pad;
      const plotBottom = h - pad;
      const plotW = plotRight - plotLeft;
      const plotH = plotBottom - plotTop;
      const values = pts.map((p) => p.value);
      const minV = Math.min(...values, 0);
      const maxV = Math.max(...values, 0);
      const range = maxV - minV || 1;
      return { pad, plotLeft, plotTop, plotRight, plotBottom, plotW, plotH, minV, maxV, range };
    }
    /**
     * Computes common plot-area metrics for OHLC chart types.
     *
     * @param w   - Logical canvas width.
     * @param h   - Logical canvas height.
     * @param pts - OHLC data points.
     * @returns Plot dimensions, domain bounds, and band dimensions.
     */
    _ohlcMetrics(w, h, pts) {
      const pad = this.cfg.padding;
      const plotLeft = pad;
      const plotTop = pad;
      const plotRight = w - pad;
      const plotBottom = h - pad;
      const plotW = plotRight - plotLeft;
      const plotH = plotBottom - plotTop;
      const highs = pts.map((p) => p.high);
      const lows = pts.map((p) => p.low);
      const minV = Math.min(...lows);
      const maxV = Math.max(...highs);
      const range = maxV - minV || 1;
      const n = pts.length;
      const bandW = plotW / Math.max(n, 1);
      const gap = bandW * this.cfg.barSpacing;
      return { plotLeft, plotTop, plotRight, plotBottom, plotW, plotH, minV, maxV, range, bandW, gap };
    }
    /**
     * Maps an x-index to a canvas x-coordinate within the plot area.
     *
     * For a single point the x is centred; for multiple points, points are
     * distributed linearly from plotLeft to plotLeft + plotW.
     *
     * @param index    - Zero-based data-point index.
     * @param total    - Total number of data points.
     * @param plotLeft - Left edge of the plot area.
     * @param plotW    - Width of the plot area.
     */
    _xPos(index, total, plotLeft, plotW) {
      if (total === 1) return plotLeft + plotW / 2;
      return plotLeft + index / (total - 1) * plotW;
    }
    /**
     * Maps a data value to a canvas y-coordinate within the plot area.
     * Higher values produce smaller y coordinates (canvas y increases downward).
     *
     * @param value   - Data value to map.
     * @param minV    - Minimum value in the series.
     * @param range   - Value range (maxV - minV).
     * @param plotTop - Top edge of the plot area.
     * @param plotH   - Height of the plot area.
     */
    _yPos(value, minV, range, plotTop, plotH) {
      return plotTop + (1 - (value - minV) / range) * plotH;
    }
    // ─── Hover / tooltip ───────────────────────────────────────────────────────
    /**
     * Handles `mousemove` on the canvas.
     * Finds the nearest data point by x-position and shows the tooltip.
     *
     * @param e - The native `MouseEvent`.
     */
    _handleMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const logicalX = e.clientX - rect.left;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      void dpr;
      if (this.isOHLC) {
        this._showOHLCTooltip(logicalX, w, h, e.clientX, e.clientY);
      } else {
        this._showPointTooltip(logicalX, w, h, e.clientX, e.clientY);
      }
    }
    /**
     * Locates the nearest scalar data point and shows the shared tooltip.
     *
     * @param logX    - Cursor x in logical canvas coordinates.
     * @param w       - Logical canvas width.
     * @param h       - Logical canvas height.
     * @param clientX - Cursor viewport x.
     * @param clientY - Cursor viewport y.
     */
    _showPointTooltip(logX, w, h, clientX, clientY) {
      const pts = this.points;
      if (pts.length === 0) return;
      const pad = this.cfg.padding;
      const plotLeft = pad;
      const plotW = w - pad * 2;
      void h;
      let idx;
      if (pts.length === 1) {
        idx = 0;
      } else {
        const xStep = plotW / (pts.length - 1);
        const raw = Math.round((logX - plotLeft) / xStep);
        idx = Math.max(0, Math.min(pts.length - 1, raw));
      }
      const pt = pts[idx];
      if (pt) {
        SparklineTooltip.show(clientX, clientY, pt.label, pt.value, this.hasLabels);
      }
    }
    /**
     * Locates the nearest OHLC data point and shows the shared OHLC tooltip.
     *
     * @param logX    - Cursor x in logical canvas coordinates.
     * @param w       - Logical canvas width.
     * @param h       - Logical canvas height.
     * @param clientX - Cursor viewport x.
     * @param clientY - Cursor viewport y.
     */
    _showOHLCTooltip(logX, w, h, clientX, clientY) {
      const pts = this.ohlcPoints;
      if (pts.length === 0) return;
      const pad = this.cfg.padding;
      const plotLeft = pad;
      const plotW = w - pad * 2;
      void h;
      const bandW = plotW / pts.length;
      const raw = Math.floor((logX - plotLeft) / bandW);
      const idx = Math.max(0, Math.min(pts.length - 1, raw));
      const pt = pts[idx];
      if (pt) {
        SparklineTooltip.showOHLC(clientX, clientY, pt, this.hasLabels);
      }
    }
    /** Hides the shared tooltip on mouse leave. */
    _handleMouseLeave() {
      SparklineTooltip.hide();
    }
  };

  // src/renderer/cell-renderer.ts
  var CellRenderer = class {
    renderCell(ctx) {
      const { row, colDef, rowIndex, colIndex, api } = ctx;
      const rawValue = this.resolveValue(row.data, colDef.field);
      const cell = createDiv("pg-cell");
      cell.setAttribute("data-row-index", String(rowIndex));
      cell.setAttribute("data-col-index", String(colIndex));
      cell.setAttribute("data-col-id", colDef.colId);
      cell.setAttribute("data-field", colDef.field);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("tabindex", "-1");
      toggleClass(cell, "pg-cell--selected", row.selected);
      const align = colDef.textAlign ?? (colDef.type === "number" || colDef.type === "currency" ? "right" : "left");
      if (align !== "left") cell.classList.add(`pg-cell--align-${align}`);
      if (colDef.cellCssClass) {
        if (typeof colDef.cellCssClass === "string") {
          cell.classList.add(colDef.cellCssClass);
        } else {
          const dynClass = colDef.cellCssClass({ value: rawValue, rawValue, row: row.data, colDef, rowIndex, colIndex, api });
          if (dynClass) cell.classList.add(dynClass);
        }
      }
      const inner = createDiv("pg-cell__inner");
      if (colDef.cellRendererFn) {
        const params = { value: rawValue, rawValue, row: row.data, colDef, rowIndex, colIndex, api };
        const rendered = colDef.cellRendererFn(params);
        if (typeof rendered === "string") {
          inner.innerHTML = rendered;
        } else {
          inner.appendChild(rendered);
        }
      } else if (colDef.renderHtml) {
        inner.innerHTML = String(rawValue ?? "");
      } else {
        inner.appendChild(this.renderDefaultCell(rawValue, colDef, ctx));
      }
      cell.appendChild(inner);
      return cell;
    }
    renderCheckboxCell(row, rowIndex) {
      const cell = createDiv("pg-cell pg-cell--checkbox");
      cell.setAttribute("data-row-index", String(rowIndex));
      cell.setAttribute("role", "gridcell");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "pg-checkbox";
      checkbox.checked = row.selected;
      checkbox.setAttribute("aria-label", "Select row");
      checkbox.setAttribute("data-node-id", row.nodeId);
      cell.appendChild(checkbox);
      return cell;
    }
    renderSerialNumberCell(rowIndex, displayIndex) {
      const cell = createDiv("pg-cell pg-cell--serial");
      cell.setAttribute("data-row-index", String(rowIndex));
      cell.setAttribute("role", "gridcell");
      const span = document.createElement("span");
      span.className = "pg-cell__serial";
      span.textContent = String(displayIndex);
      cell.appendChild(span);
      return cell;
    }
    updateCellSelection(cell, selected) {
      toggleClass(cell, "pg-cell--range-selected", selected);
    }
    updateCellActive(cell, active) {
      toggleClass(cell, "pg-cell--active", active);
    }
    renderDefaultCell(value, colDef, ctx) {
      const span = document.createElement("span");
      span.className = "pg-cell__value";
      switch (colDef.type) {
        case "boolean": {
          const bool = !!value;
          span.innerHTML = bool ? ctx.iconRenderer.renderToString("check", 14) : "";
          span.classList.add(bool ? "pg-cell--bool-true" : "pg-cell--bool-false");
          break;
        }
        case "image": {
          if (value) {
            const img = document.createElement("img");
            img.src = String(value);
            img.className = "pg-cell__image";
            img.style.cssText = "width:32px;height:32px;object-fit:cover;border-radius:4px;";
            img.alt = "";
            span.appendChild(img);
          }
          break;
        }
        case "dropdown":
        case "object": {
          const lookup = colDef.type === "object" ? this.resolveObjectKey(value, colDef) : value;
          const option = colDef.dropdownOptions?.find(
            (o) => String(o.value) === String(lookup ?? "")
          );
          if (option?.color) {
            const badge = createDiv("pg-badge");
            badge.style.backgroundColor = option.color + "20";
            badge.style.color = option.color;
            badge.textContent = option.label;
            span.appendChild(badge);
          } else {
            span.textContent = option?.label ?? String(lookup ?? "");
          }
          break;
        }
        case "array": {
          const values = Array.isArray(value) ? value.map(String) : [];
          span.className = "pg-cell__value pg-cell__value--tags";
          const visible = values.slice(0, 3);
          for (const v of visible) {
            const opt = colDef.dropdownOptions?.find((o) => String(o.value) === v);
            const badge = createDiv("pg-badge");
            badge.textContent = opt?.label ?? v;
            if (opt?.color) {
              badge.style.backgroundColor = opt.color + "20";
              badge.style.color = opt.color;
            }
            span.appendChild(badge);
          }
          if (values.length > visible.length) {
            const more = createDiv("pg-badge pg-badge--overflow");
            more.textContent = `+${values.length - visible.length}`;
            span.appendChild(more);
          }
          break;
        }
        case "sparkline": {
          span.className = "pg-cell__value pg-cell__value--sparkline";
          const wrapper = createDiv("pg-sparkline-wrapper");
          const canvas = document.createElement("canvas");
          canvas.className = "pg-sparkline";
          canvas.setAttribute("aria-hidden", "true");
          wrapper.appendChild(canvas);
          span.appendChild(wrapper);
          const sparkConfig = colDef.sparkline ?? {};
          requestAnimationFrame(() => {
            if (!canvas.isConnected) return;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (w > 0 && h > 0) {
              canvas._pgSparkline = new SparklineRenderer(canvas, value, sparkConfig);
            }
          });
          break;
        }
        default: {
          const formatted = formatValue(value, colDef, {
            locale: ctx.locale,
            dateFormat: ctx.dateFormat,
            timeZone: ctx.timeZone,
            currencySymbol: ctx.currencySymbol
          });
          span.textContent = formatted ?? "";
          span.title = formatted ?? "";
          break;
        }
      }
      return span;
    }
    resolveValue(data, path) {
      const parts = path.split(".");
      let current = data;
      for (const part of parts) {
        if (current == null) return void 0;
        current = current[part];
      }
      return current;
    }
    resolveObjectKey(value, colDef) {
      if (typeof value === "object" && value !== null) {
        const key = colDef.objectValueKey ?? "value";
        return value[key];
      }
      return value;
    }
  };

  // src/renderer/body-renderer.ts
  var GROUP_LABEL_COL_DEF = {
    colId: "__group__",
    field: "__group__",
    header: "Group",
    type: "string",
    editable: false
  };
  var BodyRenderer = class {
    constructor(store, eventBus, iconRenderer, rowSelectionEngine) {
      this.store = store;
      this.eventBus = eventBus;
      this.iconRenderer = iconRenderer;
      this.rowSelectionEngine = rowSelectionEngine;
      this.cellRenderer = new CellRenderer();
      this.renderedRowMap = /* @__PURE__ */ new Map();
      this.leftContent = null;
      this.centerContent = null;
      this.rightContent = null;
      // Track last rendered center col range to detect changes
      this.lastCenterStart = -1;
      this.lastCenterEnd = -1;
    }
    setPanels(leftContent, centerContent, rightContent) {
      this.leftContent = leftContent;
      this.centerContent = centerContent;
      this.rightContent = rightContent;
      const panels = [leftContent, centerContent, rightContent].filter((p) => p !== null);
      const getNodeId = (el) => el instanceof HTMLElement ? el.closest("[data-node-id]")?.getAttribute("data-node-id") ?? null : null;
      for (const panel of panels) {
        panel.addEventListener("mouseover", (e) => {
          const nodeId = getNodeId(e.target);
          if (!nodeId) return;
          for (const p of panels) {
            p.querySelectorAll(`[data-node-id="${nodeId}"]`).forEach((r) => r.classList.add("pg-row--hover"));
          }
        });
        panel.addEventListener("mouseout", (e) => {
          const nodeId = getNodeId(e.target);
          if (!nodeId || nodeId === getNodeId(e.relatedTarget)) return;
          for (const p of panels) {
            p.querySelectorAll(`[data-node-id="${nodeId}"]`).forEach((r) => r.classList.remove("pg-row--hover"));
          }
        });
      }
    }
    renderRows(rows, leftCols, centerCols, rightCols, options = {}) {
      const cStart = options.centerColStart ?? 0;
      const cEnd = cStart + centerCols.length;
      if (cStart !== this.lastCenterStart || cEnd !== this.lastCenterEnd) {
        this.lastCenterStart = cStart;
        this.lastCenterEnd = cEnd;
        if (this.centerContent) this.centerContent.innerHTML = "";
        for (const ps of this.renderedRowMap.values()) {
          ps.center = null;
        }
      }
      const newIds = new Set(rows.map((r) => r.nodeId));
      for (const [nodeId, ps] of this.renderedRowMap) {
        if (!newIds.has(nodeId)) {
          ps.left?.remove();
          ps.center?.remove();
          ps.right?.remove();
          this.renderedRowMap.delete(nodeId);
        }
      }
      const leftFrag = document.createDocumentFragment();
      const centerFrag = document.createDocumentFragment();
      const rightFrag = document.createDocumentFragment();
      const totalCenterCols = options.totalCenterCols ?? centerCols.length;
      const centerOffset = leftCols.length + cStart;
      const rightOffset = leftCols.length + totalCenterCols;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let existing = this.renderedRowMap.get(row.nodeId);
        if (existing && (row.type === "group" || row.type === "group-footer") && row.aggregatedValues) {
          existing.left?.remove();
          existing.center?.remove();
          existing.right?.remove();
          this.renderedRowMap.delete(row.nodeId);
          existing = void 0;
        }
        if (existing && existing.center !== null) {
          this.updatePanelRow(existing, row, i, options);
        } else if (existing) {
          this.updatePanelRow(existing, row, i, options);
          const newCenter = this.buildSingleRow(row, i, "center", centerCols, centerOffset, options);
          existing.center = newCenter;
          centerFrag.appendChild(newCenter);
        } else {
          const ps = this.buildPanelRow(row, i, leftCols, centerCols, rightCols, centerOffset, rightOffset, options);
          this.renderedRowMap.set(row.nodeId, ps);
          if (ps.left) leftFrag.appendChild(ps.left);
          if (ps.center) centerFrag.appendChild(ps.center);
          if (ps.right) rightFrag.appendChild(ps.right);
        }
      }
      if (this.leftContent) this.leftContent.appendChild(leftFrag);
      this.centerContent?.appendChild(centerFrag);
      if (this.rightContent) this.rightContent.appendChild(rightFrag);
    }
    updateRowSelection(nodeId, selected) {
      const ps = this.renderedRowMap.get(nodeId);
      if (!ps) return;
      const els = [ps.left, ps.center, ps.right].filter((e) => e !== null);
      for (const el of els) {
        toggleClass(el, "pg-row--selected", selected);
        const cb = el.querySelector(".pg-checkbox");
        if (cb) cb.checked = selected;
      }
    }
    /**
     * Advances the tracked virtual-column range without touching any DOM.
     *
     * Call this when the column range has logically changed but the body rows must
     * NOT be rebuilt — specifically during an active column resize where CSS rules
     * already handle width changes via `ColumnStyleManager`. Keeping the tracked
     * range current prevents the next normal `renderRows` call (on `mouseup`) from
     * seeing a false "range changed" signal and wiping all center panels.
     *
     * @param cStart - New first visible center-column index.
     * @param cEnd   - New last visible center-column index (exclusive).
     */
    syncCenterRange(cStart, cEnd) {
      this.lastCenterStart = cStart;
      this.lastCenterEnd = cEnd;
    }
    clear() {
      for (const ps of this.renderedRowMap.values()) {
        ps.left?.remove();
        ps.center?.remove();
        ps.right?.remove();
      }
      this.renderedRowMap.clear();
      this.lastCenterStart = -1;
      this.lastCenterEnd = -1;
    }
    /**
     * Evicts only the specified rows from the render cache so they are fully
     * rebuilt on the next paint cycle.  Rows whose `nodeId` is not in the set
     * are untouched — their DOM is reused as-is, so custom cell renderers
     * (images, flags, progress bars, etc.) are NOT re-executed for them.
     *
     * Use this instead of `clear()` after in-place data mutations (fill, cut,
     * paste, undo/redo) where only a known subset of rows changed.
     *
     * @param nodeIds - Set of row node IDs whose cache entries should be evicted.
     */
    invalidateRowsByNodeId(nodeIds) {
      for (const nodeId of nodeIds) {
        const ps = this.renderedRowMap.get(nodeId);
        if (ps) {
          ps.left?.remove();
          ps.center?.remove();
          ps.right?.remove();
          this.renderedRowMap.delete(nodeId);
        }
      }
    }
    destroy() {
      this.clear();
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    buildPanelRow(row, displayIndex, leftCols, centerCols, rightCols, centerOffset, rightOffset, options) {
      const hasLeft = !!(this.leftContent && (options.showCheckboxes || options.showSerialNumber || leftCols.length > 0));
      const hasRight = !!(this.rightContent && rightCols.length > 0);
      const left = hasLeft ? this.buildSingleRow(row, displayIndex, "left", leftCols, 0, options) : null;
      const center = this.buildSingleRow(row, displayIndex, "center", centerCols, centerOffset, options);
      const right = hasRight ? this.buildSingleRow(row, displayIndex, "right", rightCols, rightOffset, options) : null;
      return { left, center, right };
    }
    buildSingleRow(row, displayIndex, panel, cols, colOffset, options) {
      const el = createDiv(this.getRowClass(row, displayIndex, options));
      el.setAttribute("role", "row");
      el.setAttribute("data-node-id", row.nodeId);
      el.setAttribute("data-row-index", String(row.rowIndex));
      el.setAttribute("data-panel", panel);
      if (row.type === "group" || row.type === "group-footer") {
        el.setAttribute("data-level", String(row.level));
        if (panel === "center") {
          const leftSpacerW = options.centerLeftSpacerW ?? 0;
          if (leftSpacerW > 0) {
            const sp = createDiv("pg-cell--h-spacer");
            sp.style.cssText = `width:${leftSpacerW}px;min-width:${leftSpacerW}px;flex-shrink:0;`;
            el.appendChild(sp);
          }
          if (row.type === "group") {
            this.buildGroupRowContent(el, row, options);
          } else {
            this.buildGroupFooterContent(el, row, options);
          }
        }
        this.buildGroupAggregateCells(el, row, cols, colOffset, options);
        if (panel === "center") {
          const rightSpacerW = options.centerRightSpacerW ?? 0;
          if (rightSpacerW > 0) {
            const sp = createDiv("pg-cell--h-spacer");
            sp.style.cssText = `width:${rightSpacerW}px;min-width:${rightSpacerW}px;flex-shrink:0;`;
            el.appendChild(sp);
          }
        }
        this.attachRowListeners(el, row, cols, colOffset, options);
        return el;
      }
      if (panel === "left") {
        if (options.showCheckboxes) {
          el.appendChild(this.cellRenderer.renderCheckboxCell(row, row.rowIndex));
        }
        if (options.showSerialNumber) {
          el.appendChild(this.cellRenderer.renderSerialNumberCell(row.rowIndex, displayIndex + 1));
        }
      }
      if (panel === "center") {
        const leftSpacerW = options.centerLeftSpacerW ?? 0;
        if (leftSpacerW > 0) {
          const sp = createDiv("pg-cell--h-spacer");
          sp.style.cssText = `width:${leftSpacerW}px;min-width:${leftSpacerW}px;flex-shrink:0;`;
          el.appendChild(sp);
        }
        if (options.showGroupsColumn) {
          this.buildLeafGroupCell(el, row, options);
        }
      }
      for (let i = 0; i < cols.length; i++) {
        const cellEl = this.cellRenderer.renderCell({
          row,
          colDef: cols[i],
          rowIndex: row.rowIndex,
          colIndex: colOffset + i,
          // global index across all panels
          iconRenderer: this.iconRenderer,
          dateFormat: options.dateFormat,
          timeZone: options.timeZone,
          currencySymbol: options.currencySymbol,
          locale: options.locale,
          api: options.api ?? null
        });
        if (options.showVerticalBorders) cellEl.classList.add("pg-cell--v-border");
        if (cols[i].rowDrag && row.type !== "summary") {
          const handle = createDiv("pg-row-drag-handle");
          handle.setAttribute("data-row-drag", "");
          handle.setAttribute("data-drag-label", String(row.data[cols[i].field] ?? ""));
          handle.innerHTML = this.iconRenderer.renderToString("drag", 14);
          const inner = cellEl.querySelector(".pg-cell__inner");
          if (inner) {
            inner.insertBefore(handle, inner.firstChild);
          } else {
            cellEl.insertBefore(handle, cellEl.firstChild);
          }
        }
        el.appendChild(cellEl);
      }
      if (panel === "center") {
        const rightSpacerW = options.centerRightSpacerW ?? 0;
        if (rightSpacerW > 0) {
          const sp = createDiv("pg-cell--h-spacer");
          sp.style.cssText = `width:${rightSpacerW}px;min-width:${rightSpacerW}px;flex-shrink:0;`;
          el.appendChild(sp);
        }
      }
      this.attachRowListeners(el, row, cols, colOffset, options);
      return el;
    }
    /**
     * Renders the auto-group column cell for a **leaf data row**.
     *
     * When `options.leafGroupColDef` is set (i.e. grouping is active), this cell
     * shows the row's actual value for the deepest grouping field and participates
     * fully in cell selection (colIndex −1), keyboard navigation, editing, and
     * copy/cut/paste — behaving exactly like any normal data cell.
     *
     * When `leafGroupColDef` is absent (no grouping active) a non-interactive
     * spacer cell is rendered to maintain column alignment with group header rows.
     *
     * @param el      - Row container element to append the cell into.
     * @param row     - Leaf data `RowNode` being rendered.
     * @param options - Renderer options; `autoGroupColWidth` controls cell width.
     */
    buildLeafGroupCell(el, row, options) {
      const w = options.autoGroupColWidth ?? 200;
      const colDef = options.leafGroupColDef;
      if (!colDef) {
        const spacer = createDiv("pg-cell pg-cell--auto-group-spacer");
        spacer.style.width = `${w}px`;
        spacer.style.minWidth = `${w}px`;
        el.appendChild(spacer);
        return;
      }
      const cellEl = this.cellRenderer.renderCell({
        row,
        colDef,
        rowIndex: row.rowIndex,
        colIndex: -1,
        // virtual auto-group column index
        iconRenderer: this.iconRenderer,
        dateFormat: options.dateFormat,
        timeZone: options.timeZone,
        currencySymbol: options.currencySymbol,
        locale: options.locale,
        api: options.api ?? null
      });
      cellEl.setAttribute("data-col-index", "-1");
      cellEl.setAttribute("data-col-id", "__group__");
      cellEl.style.width = `${w}px`;
      cellEl.style.minWidth = `${w}px`;
      cellEl.style.flex = "none";
      el.appendChild(cellEl);
    }
    buildGroupRowContent(el, row, options) {
      const cell = createDiv("pg-cell pg-row-group__cell");
      cell.setAttribute("data-row-index", String(row.rowIndex));
      cell.setAttribute("data-col-index", "-1");
      cell.setAttribute("data-col-id", "__group__");
      cell.setAttribute("role", "gridcell");
      const groupColW = options.autoGroupColWidth ?? 200;
      cell.style.width = `${groupColW}px`;
      cell.style.minWidth = `${groupColW}px`;
      cell.style.flex = "none";
      const toggleBtn = createDiv("pg-row-group__toggle");
      toggleBtn.setAttribute("role", "button");
      toggleBtn.setAttribute("aria-label", row.expanded ? "Collapse group" : "Expand group");
      const toggleIcon = this.iconRenderer.render(row.expanded ? "chevronDown" : "chevronRight", { size: 16 });
      toggleBtn.appendChild(toggleIcon);
      const label = createDiv("pg-row-group__label");
      label.textContent = String(row.groupValue + " (" + row.childCount + ")");
      cell.appendChild(toggleBtn);
      cell.appendChild(label);
      el.appendChild(cell);
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.eventBus.emit(GridEventType.ROW_GROUP_OPENED, { groupKey: row.groupKey });
      });
    }
    /**
     * Builds the label cell for a group **footer** row.
     *
     * Unlike the header, there is no expand/collapse toggle — the cell shows
     * a Σ-prefixed group value to signal "total for this group".
     * The cell participates in cell selection (colIndex −1) identically to the
     * group header's label cell.
     */
    buildGroupFooterContent(el, row, options) {
      const cell = createDiv("pg-cell pg-row-group__cell");
      cell.setAttribute("data-row-index", String(row.rowIndex));
      cell.setAttribute("data-col-index", "-1");
      cell.setAttribute("data-col-id", "__group__");
      cell.setAttribute("role", "gridcell");
      const groupColW = options.autoGroupColWidth ?? 200;
      cell.style.width = `${groupColW}px`;
      cell.style.minWidth = `${groupColW}px`;
      cell.style.flex = "none";
      const label = createDiv("pg-row-group__label");
      label.textContent = `\u03A3 ${String(row.groupValue ?? "")}`;
      cell.appendChild(label);
      el.appendChild(cell);
    }
    /**
     * Append one `pg-cell` per column to `el` for a group row.
     *
     * - Columns with `type === 'currency'` **and** `aggFunc` set receive a
     *   `pg-cell--agg` cell showing the formatted aggregate value.
     * - All other columns receive an empty `pg-cell` to maintain column
     *   alignment with data rows.
     *
     * Column widths are automatically applied by the {@link ColumnStyleManager}
     * via the `[data-col-id]` CSS rules — no inline width needed here.
     */
    buildGroupAggregateCells(el, row, cols, colOffset, options) {
      const aggValues = row.aggregatedValues;
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const isAggCol = (col.type === "currency" || col.type === "number") && col.aggFunc != null;
        const aggVal = isAggCol && aggValues ? aggValues[col.field] : void 0;
        const hasValue = aggVal != null;
        const cell = createDiv(hasValue ? "pg-cell pg-cell--agg" : "pg-cell");
        cell.setAttribute("data-row-index", String(row.rowIndex));
        cell.setAttribute("data-col-index", String(colOffset + i));
        cell.setAttribute("data-col-id", col.colId);
        cell.setAttribute("role", "gridcell");
        if (hasValue) {
          const align = col.textAlign ?? "right";
          if (align !== "left") cell.classList.add(`pg-cell--align-${align}`);
          if (options.showVerticalBorders) cell.classList.add("pg-cell--v-border");
          const inner = createDiv("pg-cell__inner");
          const span = document.createElement("span");
          span.className = "pg-cell__value";
          span.textContent = this.formatAggValue(aggVal, col, options);
          inner.appendChild(span);
          cell.appendChild(inner);
        }
        el.appendChild(cell);
      }
    }
    /**
     * Format a computed aggregate value for display.
     *
     * - For `count` the value is emitted as a plain integer string.
     * - For all other functions the value is routed through {@link formatValue}
     *   so the column's currency symbol, locale, and precision are applied.
     *
     * @param value   - Raw numeric aggregate result.
     * @param col     - Column definition (used for type and formatting options).
     * @param options - Renderer options (locale, currency symbol, etc.).
     */
    formatAggValue(value, col, options) {
      if (col.aggFunc === "count") {
        return String(typeof value === "number" ? Math.round(value) : value ?? "");
      }
      const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
      if (!isFinite(num)) return "\u2014";
      return formatValue(num, col, {
        locale: options.locale,
        currencySymbol: options.currencySymbol,
        dateFormat: options.dateFormat,
        timeZone: options.timeZone
      }) || "\u2014";
    }
    updatePanelRow(ps, row, displayIndex, options) {
      const cls = this.getRowClass(row, displayIndex, options);
      const els = [ps.left, ps.center, ps.right].filter((e) => e !== null);
      for (const el of els) {
        el.className = cls;
        el.setAttribute("data-row-index", String(row.rowIndex));
        if (row.type === "group") el.setAttribute("data-level", String(row.level));
      }
      if ((row.type === "group" || row.type === "group-footer") && ps.center) {
        const toggleBtn = ps.center.querySelector(".pg-row-group__toggle");
        if (toggleBtn) {
          const iconEl = toggleBtn.querySelector(".pg-icon");
          if (iconEl) {
            this.iconRenderer.updateIcon(iconEl, row.expanded ? "chevronDown" : "chevronRight");
          }
          toggleBtn.setAttribute("aria-label", row.expanded ? "Collapse group" : "Expand group");
        }
      }
    }
    attachRowListeners(el, row, cols, colOffset, options) {
      el.addEventListener("click", (e) => {
        const checkboxEl = e.target.closest(".pg-checkbox");
        if (checkboxEl) {
          e.stopPropagation();
          this.rowSelectionEngine.toggleRowSelection(row.nodeId, this.store.get("allRows"));
          return;
        }
        this.eventBus.emit(GridEventType.ROW_CLICKED, { row, event: e, rowIndex: row.rowIndex });
      });
      el.addEventListener("dblclick", (e) => {
        this.eventBus.emit(GridEventType.ROW_DOUBLE_CLICKED, { row, event: e, rowIndex: row.rowIndex });
      });
      el.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        const cellEl = e.target.closest("[data-col-index][data-col-id]");
        if (!cellEl) return;
        const globalColIndex = Number(cellEl.getAttribute("data-col-index"));
        const colId = cellEl.getAttribute("data-col-id") ?? "";
        const colDef = cols.find((c) => c.colId === colId) ?? (colId === "__group__" ? row.type === "data" ? options.leafGroupColDef ?? null : GROUP_LABEL_COL_DEF : null);
        if (!colDef) return;
        this.eventBus.emit(GridEventType.CELL_CLICKED, {
          row,
          colDef,
          value: null,
          rowIndex: row.rowIndex,
          colIndex: globalColIndex,
          event: e
        });
      });
      el.addEventListener("contextmenu", (e) => {
        const cellEl = e.target.closest("[data-col-index][data-col-id]");
        if (!cellEl) return;
        e.preventDefault();
        const globalColIndex = Number(cellEl.getAttribute("data-col-index"));
        this.eventBus.emit(GridEventType.CELL_CONTEXT_MENU, {
          row,
          rowIndex: row.rowIndex,
          colIndex: globalColIndex,
          x: e.clientX,
          y: e.clientY,
          event: e
        });
      });
      el.addEventListener("dblclick", (e) => {
        const cellEl = e.target.closest("[data-col-index][data-col-id]");
        if (!cellEl) return;
        const globalColIndex = Number(cellEl.getAttribute("data-col-index"));
        const colId = cellEl.getAttribute("data-col-id") ?? "";
        const colDef = cols.find((c) => c.colId === colId) ?? (colId === "__group__" ? row.type === "data" ? options.leafGroupColDef ?? null : GROUP_LABEL_COL_DEF : null);
        if (!colDef) return;
        this.eventBus.emit(GridEventType.CELL_DOUBLE_CLICKED, {
          row,
          colDef,
          value: null,
          rowIndex: row.rowIndex,
          colIndex: globalColIndex,
          event: e
        });
      });
    }
    getRowClass(row, displayIndex, options) {
      const cls = ["pg-row"];
      if (row.selected) cls.push("pg-row--selected");
      if (row.type === "group") cls.push("pg-row--group");
      if (row.type === "group-footer") cls.push("pg-row--group-footer");
      if (row.type === "detail") cls.push("pg-row--detail");
      if (options.rowShading && displayIndex % 2 === 1) cls.push("pg-row--alt");
      if (row.cssClass) cls.push(row.cssClass);
      return cls.join(" ");
    }
  };

  // src/renderer/row-drag-renderer.ts
  var SCROLL_ZONE2 = 64;
  var MAX_SCROLL_SPD = 24;
  var RowDragRenderer = class {
    constructor(store, eventBus, iconRenderer) {
      this.store = store;
      this.eventBus = eventBus;
      this.iconRenderer = iconRenderer;
      this.ghostEl = null;
      this.draggingNodeId = null;
      this.dragLabel = "";
      this.isDragging = false;
      this.gridEl = null;
      this.bodyWrapEl = null;
      this.targetNodeId = null;
      this.targetPosition = "before";
      this.scrollFn = null;
      this.autoScrollRAF = null;
      this.cursorX = 0;
      this.cursorY = 0;
      this.boundMouseDown = this.onMouseDown.bind(this);
      this.boundMouseMove = this.onMouseMove.bind(this);
      this.boundMouseUp = this.onMouseUp.bind(this);
    }
    mount(gridEl, bodyWrapEl, scrollFn) {
      this.gridEl = gridEl;
      this.bodyWrapEl = bodyWrapEl;
      this.scrollFn = scrollFn;
      bodyWrapEl.addEventListener("mousedown", this.boundMouseDown, true);
    }
    destroy() {
      this.bodyWrapEl?.removeEventListener("mousedown", this.boundMouseDown, true);
      this.cleanup();
      this.gridEl = null;
      this.bodyWrapEl = null;
      this.scrollFn = null;
    }
    // ─── Drag start ───────────────────────────────────────────────────────────
    onMouseDown(e) {
      if (e.button !== 0) return;
      const handle = e.target.closest("[data-row-drag]");
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();
      const rowEl = handle.closest("[data-node-id]");
      const nodeId = rowEl?.getAttribute("data-node-id");
      if (!nodeId) return;
      const rows = this.store.get("visibleRows");
      const row = rows.find((r) => r.nodeId === nodeId);
      if (!row || row.type === "group" || row.type === "summary") return;
      this.dragLabel = handle.getAttribute("data-drag-label") ?? "";
      this.startDrag(nodeId, e);
    }
    startDrag(nodeId, e) {
      this.draggingNodeId = nodeId;
      this.isDragging = true;
      this.cursorX = e.clientX;
      this.cursorY = e.clientY;
      this.bodyWrapEl?.querySelectorAll(".pg-row--hover").forEach((el) => el.classList.remove("pg-row--hover"));
      const ghost = createDiv("pg-row-drag-ghost");
      const dragIcon = document.createElement("span");
      dragIcon.className = "pg-row-drag-ghost__icon pg-row-drag-ghost__icon--drag";
      dragIcon.innerHTML = this.iconRenderer.renderToString("drag", 14);
      const blockIcon = document.createElement("span");
      blockIcon.className = "pg-row-drag-ghost__icon pg-row-drag-ghost__icon--block";
      blockIcon.innerHTML = this.iconRenderer.renderToString("ban", 14);
      const labelSpan = document.createElement("span");
      labelSpan.className = "pg-row-drag-ghost__label";
      labelSpan.textContent = this.dragLabel || "Row";
      ghost.appendChild(dragIcon);
      ghost.appendChild(blockIcon);
      ghost.appendChild(labelSpan);
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
      document.body.appendChild(ghost);
      this.ghostEl = ghost;
      this.setDraggingClass(nodeId, true);
      this.gridEl?.classList.add("pg-grid--row-dragging");
      document.addEventListener("mousemove", this.boundMouseMove);
      document.addEventListener("mouseup", this.boundMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      this.startAutoScrollLoop();
    }
    // ─── Mouse move ───────────────────────────────────────────────────────────
    onMouseMove(e) {
      if (!this.isDragging) return;
      this.cursorX = e.clientX;
      this.cursorY = e.clientY;
      if (this.ghostEl) {
        this.ghostEl.style.left = `${e.clientX}px`;
        this.ghostEl.style.top = `${e.clientY}px`;
      }
      this.updateDropTarget();
    }
    updateDropTarget() {
      if (!this.bodyWrapEl || !this.draggingNodeId) return;
      const bodyRect = this.bodyWrapEl.getBoundingClientRect();
      const isOutside = this.cursorX < bodyRect.left || this.cursorX > bodyRect.right || this.cursorY < bodyRect.top || this.cursorY > bodyRect.bottom;
      if (isOutside) {
        this.ghostEl?.classList.add("pg-row-drag-ghost--outside");
        if (this.targetNodeId !== null) {
          this.targetNodeId = null;
          this.clearDragTops();
        }
        return;
      }
      this.ghostEl?.classList.remove("pg-row-drag-ghost--outside");
      const scrollTop = this.getScrollTop();
      const cursorContentY = this.cursorY - bodyRect.top + scrollTop;
      const allVisible = this.store.get("visibleRows");
      const rows = allVisible.filter(
        (r) => r.type !== "group" && r.type !== "summary" && r.nodeId !== this.draggingNodeId
      );
      let target = null;
      let position = "before";
      for (const row of rows) {
        if (cursorContentY >= row.top && cursorContentY < row.top + row.height) {
          target = row;
          position = cursorContentY < row.top + row.height / 2 ? "before" : "after";
          break;
        }
      }
      if (!target && rows.length > 0) {
        const first = rows[0];
        const last = rows[rows.length - 1];
        if (cursorContentY < first.top) {
          target = first;
          position = "before";
        } else if (cursorContentY >= last.top + last.height) {
          target = last;
          position = "after";
        }
      }
      const newTarget = target?.nodeId ?? null;
      const newPos = position;
      if (newTarget !== this.targetNodeId || newPos !== this.targetPosition) {
        this.targetNodeId = newTarget;
        this.targetPosition = newPos;
        if (this.targetNodeId) {
          this.updateRowTops();
        } else {
          this.clearDragTops();
        }
      }
    }
    // ─── Mouse up ─────────────────────────────────────────────────────────────
    onMouseUp(_e) {
      if (!this.isDragging) {
        this.cleanup();
        return;
      }
      const draggedId = this.draggingNodeId;
      const targetId = this.targetNodeId;
      const position = this.targetPosition;
      this.cleanupInteraction();
      if (draggedId && targetId && draggedId !== targetId) {
        this.reorderRows(draggedId, targetId, position);
        requestAnimationFrame(() => requestAnimationFrame(() => this.cleanupVisuals()));
      } else {
        this.cleanupVisuals();
      }
    }
    // ─── Auto-scroll loop ─────────────────────────────────────────────────────
    startAutoScrollLoop() {
      if (this.autoScrollRAF !== null) return;
      this.autoScrollRAF = requestAnimationFrame(() => this.autoScrollTick());
    }
    autoScrollTick() {
      this.autoScrollRAF = null;
      if (!this.isDragging || !this.bodyWrapEl || !this.scrollFn) return;
      const rect = this.bodyWrapEl.getBoundingClientRect();
      const distTop = this.cursorY - rect.top;
      const distBot = rect.bottom - this.cursorY;
      let dy = 0;
      if (distTop >= 0 && distTop < SCROLL_ZONE2) {
        dy = -MAX_SCROLL_SPD * Math.pow(1 - distTop / SCROLL_ZONE2, 2);
      } else if (distBot >= 0 && distBot < SCROLL_ZONE2) {
        dy = MAX_SCROLL_SPD * Math.pow(1 - distBot / SCROLL_ZONE2, 2);
      }
      if (dy !== 0) {
        this.scrollFn(dy);
        this.updateDropTarget();
      }
      if (this.isDragging) {
        this.autoScrollRAF = requestAnimationFrame(() => this.autoScrollTick());
      }
    }
    // ─── Live top animation ───────────────────────────────────────────────────
    //
    // Uses absolute `top` values (not transforms) to avoid the overflow:hidden
    // clipping that panel bodies impose.  The rules have higher CSS specificity
    // than RowPositionSheet (.pg-grid--row-dragging .pg-row[data-node-id="X"])
    // so they win cleanly.  Because reorderRows() produces the exact same top
    // values, removing these rules after the re-render causes zero visual snap.
    updateRowTops() {
      if (!this.draggingNodeId || !this.targetNodeId) {
        this.clearDragTops();
        return;
      }
      const allRows = this.store.get("visibleRows");
      const virtual = [...allRows];
      const fromIdx = virtual.findIndex((r) => r.nodeId === this.draggingNodeId);
      if (fromIdx === -1) {
        this.clearDragTops();
        return;
      }
      const [dragged] = virtual.splice(fromIdx, 1);
      let insertIdx = virtual.findIndex((r) => r.nodeId === this.targetNodeId);
      if (insertIdx === -1) {
        this.clearDragTops();
        return;
      }
      if (this.targetPosition === "after") insertIdx++;
      virtual.splice(Math.max(0, insertIdx), 0, dragged);
      let css2 = "";
      let newTop = 0;
      for (const row of virtual) {
        if (Math.abs(newTop - row.top) > 0.5) {
          css2 += `.pg-grid--row-dragging .pg-row[data-node-id="${row.nodeId}"]{top:${newTop}px;}
`;
        }
        newTop += row.height;
      }
      this.getOrCreateTopStyle().textContent = css2;
    }
    clearDragTops() {
      const s = document.querySelector("style[data-pg-row-drag-tops]");
      if (s) s.textContent = "";
    }
    getOrCreateTopStyle() {
      let s = document.querySelector("style[data-pg-row-drag-tops]");
      if (!s) {
        s = document.createElement("style");
        s.setAttribute("data-pg-row-drag-tops", "");
        document.head.appendChild(s);
      }
      return s;
    }
    // ─── Row reorder (committed on drop) ─────────────────────────────────────
    reorderRows(draggedId, targetId, position) {
      const allRows = [...this.store.get("allRows")];
      const visibleRows = [...this.store.get("visibleRows")];
      const move = (arr) => {
        const fromIdx = arr.findIndex((r) => r.nodeId === draggedId);
        if (fromIdx === -1) return arr;
        const [item] = arr.splice(fromIdx, 1);
        let toIdx = arr.findIndex((r) => r.nodeId === targetId);
        if (toIdx === -1) {
          arr.splice(fromIdx, 0, item);
          return arr;
        }
        if (position === "after") toIdx++;
        arr.splice(Math.max(0, toIdx), 0, item);
        return arr;
      };
      const newVisible = move(visibleRows);
      const newAll = move(allRows);
      let top = 0;
      for (let i = 0; i < newVisible.length; i++) {
        newVisible[i] = { ...newVisible[i], rowIndex: i, top };
        top += newVisible[i].height;
      }
      const draggedNode = newVisible.find((r) => r.nodeId === draggedId);
      const targetNode = newVisible.find((r) => r.nodeId === targetId);
      if (draggedNode && targetNode) {
        this.eventBus.emit(GridEventType.ROW_DROP, {
          draggedRows: [draggedNode],
          targetRow: targetNode,
          position
        });
      }
      this.store.set("allRows", newAll);
      this.store.set("visibleRows", newVisible);
    }
    // ─── Helpers ──────────────────────────────────────────────────────────────
    getScrollTop() {
      const val = this.gridEl?.style.getPropertyValue("--pg-scroll-y") ?? "0px";
      return -parseFloat(val) || 0;
    }
    setDraggingClass(nodeId, active) {
      this.bodyWrapEl?.querySelectorAll(`[data-node-id="${nodeId}"]`).forEach((el) => el.classList.toggle("pg-row--row-dragging", active));
    }
    // Phase 1 — remove interaction state; keep grid class + drag tops
    cleanupInteraction() {
      if (this.autoScrollRAF !== null) {
        cancelAnimationFrame(this.autoScrollRAF);
        this.autoScrollRAF = null;
      }
      if (this.draggingNodeId) this.setDraggingClass(this.draggingNodeId, false);
      this.ghostEl?.remove();
      this.ghostEl = null;
      this.draggingNodeId = null;
      this.targetNodeId = null;
      this.isDragging = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("mouseup", this.boundMouseUp);
    }
    // Phase 2 — remove visual overrides once RowPositionSheet has settled
    cleanupVisuals() {
      this.gridEl?.classList.remove("pg-grid--row-dragging");
      this.clearDragTops();
    }
    cleanup() {
      this.cleanupInteraction();
      this.cleanupVisuals();
    }
  };

  // src/renderer/footer-renderer.ts
  var FooterRenderer = class {
    constructor(eventBus, iconRenderer, paginationEngine) {
      this.eventBus = eventBus;
      this.iconRenderer = iconRenderer;
      this.paginationEngine = paginationEngine;
      this.footerEl = null;
      this.pageInfoEl = null;
      this.pageInputEl = null;
    }
    render(containerEl, options = {}) {
      this.footerEl = createDiv("pg-footer");
      const h = options.footerHeight ?? 44;
      this.footerEl.style.height = `${h}px`;
      if (options.showPagination) {
        this.footerEl.appendChild(this.buildPaginationControls());
      }
      if (options.showRowCount) {
        const rowCount = createDiv("pg-footer__row-count");
        this.pageInfoEl = rowCount;
        this.footerEl.appendChild(rowCount);
      }
      this.updatePaginationState();
      containerEl.appendChild(this.footerEl);
      return this.footerEl;
    }
    updatePaginationState() {
      if (!this.footerEl) return;
      const config = this.getConfig();
      const totalPages = this.paginationEngine.getTotalPages();
      const { start, end } = this.paginationEngine.getPageRange();
      const pageInfo = this.footerEl.querySelector(".pg-pagination__info");
      if (pageInfo) {
        pageInfo.textContent = `${start}\u2013${end} of ${config.totalRows ?? 0}`;
      }
      if (this.pageInputEl) {
        this.pageInputEl.value = String(config.page);
        this.pageInputEl.max = String(totalPages);
      }
      const firstBtn = this.footerEl.querySelector('[data-action="first"]');
      const prevBtn = this.footerEl.querySelector('[data-action="prev"]');
      const nextBtn = this.footerEl.querySelector('[data-action="next"]');
      const lastBtn = this.footerEl.querySelector('[data-action="last"]');
      const isFirst = this.paginationEngine.isFirstPage();
      const isLast = this.paginationEngine.isLastPage();
      if (firstBtn) firstBtn.disabled = isFirst;
      if (prevBtn) prevBtn.disabled = isFirst;
      if (nextBtn) nextBtn.disabled = isLast;
      if (lastBtn) lastBtn.disabled = isLast;
    }
    destroy() {
      this.footerEl?.remove();
      this.footerEl = null;
      this.pageInfoEl = null;
      this.pageInputEl = null;
    }
    buildPaginationControls() {
      const pagination = createDiv("pg-pagination");
      const firstBtn = this.buildNavButton("first", "pageFirst", "First page");
      const prevBtn = this.buildNavButton("prev", "pagePrev", "Previous page");
      const pageInfo = createDiv("pg-pagination__info");
      pageInfo.textContent = "\u2014";
      const pageInput = document.createElement("input");
      pageInput.type = "number";
      pageInput.min = "1";
      pageInput.className = "pg-pagination__page-input";
      pageInput.setAttribute("aria-label", "Page number");
      this.pageInputEl = pageInput;
      pageInput.addEventListener("change", () => {
        const page = parseInt(pageInput.value, 10);
        if (!isNaN(page)) {
          this.paginationEngine.goToPage(page);
          this.updatePaginationState();
          this.eventBus.emit(GridEventType.PAGE_CHANGED, {
            page,
            pageSize: this.getConfig().pageSize,
            totalRows: this.getConfig().totalRows ?? 0,
            totalPages: this.paginationEngine.getTotalPages()
          });
        }
      });
      const nextBtn = this.buildNavButton("next", "pageNext", "Next page");
      const lastBtn = this.buildNavButton("last", "pageLast", "Last page");
      const pageSizeSelect = this.buildPageSizeSelect();
      pagination.appendChild(pageSizeSelect);
      pagination.appendChild(firstBtn);
      pagination.appendChild(prevBtn);
      pagination.appendChild(pageInfo);
      pagination.appendChild(pageInput);
      pagination.appendChild(nextBtn);
      pagination.appendChild(lastBtn);
      return pagination;
    }
    buildNavButton(action, iconName, label) {
      const btn = document.createElement("button");
      btn.className = `pg-pagination__btn pg-pagination__btn--${action}`;
      btn.setAttribute("data-action", action);
      btn.setAttribute("aria-label", label);
      btn.setAttribute("type", "button");
      btn.appendChild(this.iconRenderer.render(iconName, { size: 16 }));
      btn.addEventListener("click", () => {
        switch (action) {
          case "first":
            this.paginationEngine.goToFirstPage();
            break;
          case "prev":
            this.paginationEngine.goToPreviousPage();
            break;
          case "next":
            this.paginationEngine.goToNextPage();
            break;
          case "last":
            this.paginationEngine.goToLastPage();
            break;
        }
        this.updatePaginationState();
        const config = this.getConfig();
        this.eventBus.emit(GridEventType.PAGE_CHANGED, {
          page: config.page,
          pageSize: config.pageSize,
          totalRows: config.totalRows ?? 0,
          totalPages: this.paginationEngine.getTotalPages()
        });
      });
      return btn;
    }
    buildPageSizeSelect() {
      const wrapper = createDiv("pg-pagination__size");
      const label = document.createElement("span");
      label.textContent = "Rows per page:";
      label.className = "pg-pagination__size-label";
      const select = document.createElement("select");
      select.className = "pg-pagination__size-select";
      const config = this.getConfig();
      for (const size of config.pageSizeOptions) {
        const opt = document.createElement("option");
        opt.value = String(size);
        opt.textContent = String(size);
        opt.selected = size === config.pageSize;
        select.appendChild(opt);
      }
      select.addEventListener("change", () => {
        const size = parseInt(select.value, 10);
        this.paginationEngine.setPageSize(size);
        this.updatePaginationState();
      });
      wrapper.appendChild(label);
      wrapper.appendChild(select);
      return wrapper;
    }
    getConfig() {
      return {
        enabled: true,
        page: this.paginationEngine.getCurrentPage(),
        pageSize: this.paginationEngine.getPageSize(),
        pageSizeOptions: [10, 25, 50, 100, 1e3, 1e4, 1e5],
        serverSide: false,
        totalRows: this.paginationEngine.getTotalRows()
      };
    }
  };

  // src/renderer/overlay-renderer.ts
  var OverlayRenderer = class {
    constructor(iconRenderer) {
      this.iconRenderer = iconRenderer;
      this.loadingEl = null;
      this.noRowsEl = null;
      this.containerEl = null;
    }
    mount(containerEl) {
      this.containerEl = containerEl;
    }
    showLoading(text = "Loading\u2026") {
      this.hideNoRows();
      if (this.loadingEl) return;
      const overlay = createDiv("pg-overlay pg-overlay--loading");
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-live", "polite");
      const spinner = this.iconRenderer.render("loading", { size: 32, spin: true, className: "pg-overlay__spinner" });
      this.iconRenderer.injectSpinKeyframes();
      const label = createDiv("pg-overlay__text");
      label.textContent = text;
      overlay.appendChild(spinner);
      overlay.appendChild(label);
      this.loadingEl = overlay;
      this.containerEl?.appendChild(overlay);
    }
    hideLoading() {
      this.loadingEl?.remove();
      this.loadingEl = null;
    }
    showNoRows(html, text = "No rows to show") {
      this.hideLoading();
      if (this.noRowsEl) return;
      const overlay = createDiv("pg-overlay pg-overlay--no-rows");
      overlay.setAttribute("role", "status");
      if (html) {
        overlay.innerHTML = html;
      } else {
        const icon = this.iconRenderer.render("info", { size: 32, className: "pg-overlay__icon" });
        const label = createDiv("pg-overlay__text");
        label.textContent = text;
        overlay.appendChild(icon);
        overlay.appendChild(label);
      }
      this.noRowsEl = overlay;
      this.containerEl?.appendChild(overlay);
    }
    hideNoRows() {
      this.noRowsEl?.remove();
      this.noRowsEl = null;
    }
    hideAll() {
      this.hideLoading();
      this.hideNoRows();
    }
    destroy() {
      this.hideAll();
      this.containerEl = null;
    }
  };

  // src/renderer/column-style-manager.ts
  var ColumnStyleManager = class {
    constructor() {
      this.styleEl = null;
      this.widths = /* @__PURE__ */ new Map();
      this.flexCols = /* @__PURE__ */ new Map();
      // Persists across initFromColumns calls so user-resized widths survive re-renders
      this.userResizedWidths = /* @__PURE__ */ new Map();
    }
    mount() {
      if (this.styleEl) return;
      this.styleEl = document.createElement("style");
      this.styleEl.setAttribute("data-pg-col-widths", "");
      document.head.appendChild(this.styleEl);
    }
    initFromColumns(columns) {
      this.widths.clear();
      this.flexCols.clear();
      for (const col of columns) {
        if (this.userResizedWidths.has(col.colId)) {
          this.widths.set(col.colId, this.userResizedWidths.get(col.colId));
        } else if (col.flex != null) {
          const minW = col.minWidth ?? 80;
          this.flexCols.set(col.colId, { flex: col.flex, minWidth: minW });
          this.widths.set(col.colId, minW);
        } else {
          this.widths.set(col.colId, col.width ?? col.minWidth ?? 150);
        }
      }
      this.flush();
    }
    /**
     * Distribute `containerWidth` among the given flex columns proportionally.
     * Fixed columns in `visibleColIds` are accounted for — flex columns share the remainder.
     */
    resolveFlex(visibleColIds, containerWidth) {
      if (containerWidth <= 0) return;
      const flexIds = visibleColIds.filter((id) => this.flexCols.has(id));
      if (flexIds.length === 0) return;
      const fixedTotal = visibleColIds.filter((id) => !this.flexCols.has(id)).reduce((sum, id) => sum + (this.widths.get(id) ?? 150), 0);
      const available = Math.max(0, containerWidth - fixedTotal);
      const totalFlex = flexIds.reduce((sum, id) => sum + (this.flexCols.get(id)?.flex ?? 1), 0);
      for (const id of flexIds) {
        const fc = this.flexCols.get(id);
        const resolved = Math.max(fc.minWidth, Math.floor(fc.flex / totalFlex * available));
        this.widths.set(id, resolved);
      }
      this.flush();
    }
    hasFlex(colIds) {
      return colIds.some((id) => this.flexCols.has(id));
    }
    setWidth(colId, width) {
      this.userResizedWidths.set(colId, width);
      this.flexCols.delete(colId);
      this.widths.set(colId, width);
      this.flush();
    }
    getWidth(colId) {
      return this.widths.get(colId) ?? 150;
    }
    getTotalWidth(visibleColIds) {
      return visibleColIds.reduce((sum, id) => sum + (this.widths.get(id) ?? 150), 0);
    }
    flush() {
      if (!this.styleEl) return;
      const rules = [];
      for (const [colId, width] of this.widths) {
        rules.push(
          `[data-col-id="${colId}"] { width: ${width}px; min-width: ${width}px; max-width: ${width}px; flex-shrink: 0; }`
        );
      }
      this.styleEl.textContent = rules.join("\n");
    }
    destroy() {
      this.styleEl?.remove();
      this.styleEl = null;
      this.widths.clear();
      this.flexCols.clear();
      this.userResizedWidths.clear();
    }
  };

  // src/renderer/row-position-sheet.ts
  var RowPositionSheet = class {
    constructor() {
      this.styleEl = null;
    }
    mount() {
      this.styleEl = document.createElement("style");
      this.styleEl.setAttribute("data-pg-row-positions", "");
      document.head.appendChild(this.styleEl);
    }
    update(rows, autoHeight = false) {
      if (!this.styleEl) return;
      const rules = [];
      for (const r of rows) {
        if (autoHeight) {
          rules.push(`.pg-row[data-node-id="${r.nodeId}"]{top:${r.top}px;min-height:${r.height}px;}`);
        } else {
          rules.push(`.pg-row[data-node-id="${r.nodeId}"]{top:${r.top}px;height:${r.height}px;}`);
        }
      }
      this.styleEl.textContent = rules.join("");
    }
    destroy() {
      this.styleEl?.remove();
      this.styleEl = null;
    }
  };

  // src/renderer/scroll-controller.ts
  var ScrollController = class {
    constructor() {
      this.scrollTop = 0;
      this.scrollLeft = 0;
      this.totalHeight = 0;
      this.totalCenterWidth = 0;
      this.viewportHeight = 0;
      this.centerViewportWidth = 0;
      this.gridEl = null;
      this.sbVNativeEl = null;
      this.sbVSpacerEl = null;
      this.sbHNativeEl = null;
      this.sbHSpacerEl = null;
      this.sbHRowEl = null;
      this.abortCtrl = null;
      this.resizeObs = null;
      this.scrollYCb = null;
      this.scrollXCb = null;
      this.onVNativeScroll = () => {
        const st = this.sbVNativeEl.scrollTop;
        if (Math.abs(st - this.scrollTop) < 0.5) return;
        this.scrollTop = st;
        this.syncCSSVars();
        this.scrollYCb?.(st);
      };
      this.onHNativeScroll = () => {
        const sl = this.sbHNativeEl.scrollLeft;
        if (Math.abs(sl - this.scrollLeft) < 0.5) return;
        this.scrollLeft = sl;
        this.syncCSSVars();
        this.scrollXCb?.();
      };
      this.onWheel = (e) => {
        if (e.ctrlKey) return;
        e.preventDefault();
        let dx = e.deltaX;
        let dy = e.deltaY;
        if (e.deltaMode === 1) {
          dx *= 32;
          dy *= 32;
        } else if (e.deltaMode === 2) {
          dx *= this.centerViewportWidth;
          dy *= this.viewportHeight;
        }
        if (e.shiftKey || Math.abs(dx) > Math.abs(dy)) {
          this.scrollToX(this.scrollLeft + (e.deltaX !== 0 ? dx : dy));
        } else {
          this.scrollToY(this.scrollTop + dy);
        }
      };
    }
    onScrollY(cb) {
      this.scrollYCb = cb;
    }
    onScrollX(cb) {
      this.scrollXCb = cb;
    }
    mount(gridEl, bodyEl, centerBodyEl, sbVNativeEl, sbVSpacerEl, sbHNativeEl, sbHSpacerEl, sbHRowEl) {
      this.gridEl = gridEl;
      this.sbVNativeEl = sbVNativeEl;
      this.sbVSpacerEl = sbVSpacerEl;
      this.sbHNativeEl = sbHNativeEl;
      this.sbHSpacerEl = sbHSpacerEl;
      this.sbHRowEl = sbHRowEl ?? sbHNativeEl;
      const ac = new AbortController();
      this.abortCtrl = ac;
      const sig = ac.signal;
      bodyEl.addEventListener("wheel", this.onWheel, { passive: false, signal: sig });
      const headerEl = gridEl.querySelector(".pg-grid__header");
      headerEl?.addEventListener("wheel", this.onWheel, { passive: false, signal: sig });
      sbVNativeEl.addEventListener("scroll", this.onVNativeScroll, { signal: sig });
      sbHNativeEl.addEventListener("scroll", this.onHNativeScroll, { signal: sig });
      this.resizeObs = new ResizeObserver(() => {
        this.viewportHeight = bodyEl.clientHeight;
        this.centerViewportWidth = centerBodyEl.clientWidth;
        this.clampScroll();
        this.syncCSSVars();
        this.syncScrollbars();
        this.scrollXCb?.();
      });
      this.resizeObs.observe(bodyEl);
      this.resizeObs.observe(centerBodyEl);
      this.viewportHeight = bodyEl.clientHeight;
      this.centerViewportWidth = centerBodyEl.clientWidth;
    }
    updateSizes(totalHeight, totalCenterWidth) {
      this.totalHeight = totalHeight;
      this.totalCenterWidth = totalCenterWidth;
      if (this.sbVSpacerEl) this.sbVSpacerEl.style.height = `${totalHeight}px`;
      if (this.sbHSpacerEl) this.sbHSpacerEl.style.width = `${totalCenterWidth}px`;
      this.clampScroll();
      this.syncCSSVars();
      this.syncScrollbars();
    }
    getScrollTop() {
      return this.scrollTop;
    }
    getScrollLeft() {
      return this.scrollLeft;
    }
    /** Returns the current visible height of the body viewport in pixels. */
    getViewportHeight() {
      return this.viewportHeight;
    }
    /** Returns the current visible width of the center body viewport in pixels. */
    getCenterViewportWidth() {
      return this.centerViewportWidth;
    }
    canScrollLeft() {
      return this.scrollLeft > 0;
    }
    canScrollRight() {
      return this.scrollLeft < Math.max(0, this.totalCenterWidth - this.centerViewportWidth);
    }
    scrollToY(y) {
      const max = Math.max(0, this.totalHeight - this.viewportHeight);
      const next = Math.max(0, Math.min(y, max));
      if (next === this.scrollTop) return;
      this.scrollTop = next;
      this.syncCSSVars();
      this.syncScrollbars();
      if (this.sbVNativeEl) this.sbVNativeEl.scrollTop = next;
      this.scrollYCb?.(this.scrollTop);
    }
    scrollToX(x) {
      const max = Math.max(0, this.totalCenterWidth - this.centerViewportWidth);
      const next = Math.max(0, Math.min(x, max));
      if (next === this.scrollLeft) return;
      this.scrollLeft = next;
      this.syncCSSVars();
      this.syncScrollbars();
      if (this.sbHNativeEl) this.sbHNativeEl.scrollLeft = next;
      this.scrollXCb?.();
    }
    scrollToRow(rowIndex, rows) {
      if (rowIndex >= 0 && rowIndex < rows.length) this.scrollToY(rows[rowIndex].top);
    }
    scrollToTop() {
      this.scrollToY(0);
    }
    destroy() {
      this.abortCtrl?.abort();
      this.abortCtrl = null;
      this.resizeObs?.disconnect();
      this.resizeObs = null;
    }
    clampScroll() {
      this.scrollTop = Math.max(0, Math.min(this.scrollTop, Math.max(0, this.totalHeight - this.viewportHeight)));
      this.scrollLeft = Math.max(0, Math.min(this.scrollLeft, Math.max(0, this.totalCenterWidth - this.centerViewportWidth)));
    }
    syncCSSVars() {
      if (!this.gridEl) return;
      this.gridEl.style.setProperty("--pg-scroll-x", `-${this.scrollLeft}px`);
      this.gridEl.style.setProperty("--pg-scroll-y", `-${this.scrollTop}px`);
    }
    syncScrollbars() {
      if (this.sbVNativeEl) {
        this.sbVNativeEl.classList.toggle("pg-scrollbar--hidden", this.totalHeight <= this.viewportHeight);
      }
      if (this.sbHRowEl) {
        this.sbHRowEl.classList.toggle("pg-scrollbar--hidden", this.totalCenterWidth <= this.centerViewportWidth);
      }
    }
  };

  // src/renderer/auto-scroller.ts
  var AutoScroller = class {
    /**
     * @param getRect    - Returns the bounding rect of the scrollable viewport
     *                     element, or `null` when the grid is unmounted.
     * @param scrollY    - Called with a **signed pixel delta** to scroll
     *                     vertically.  Positive = down, negative = up.
     * @param scrollX    - Called with a **signed pixel delta** to scroll
     *                     horizontally.  Positive = right, negative = left.
     * @param onScrolled - Optional callback invoked after any frame that
     *                     actually scrolled.  Receives the most-recent client
     *                     coordinates so the caller can re-evaluate the drag
     *                     target under the (now-scrolled) grid.
     * @param threshold  - Distance from the viewport edge (px) at which
     *                     scrolling starts.  Defaults to `60`.
     * @param maxSpeed   - Maximum scroll speed in px/s reached at the edge
     *                     (dist = 0).  Defaults to `500`.
     */
    constructor(getRect, scrollY, scrollX, onScrolled, threshold = 60, maxSpeed = 500) {
      this.getRect = getRect;
      this.scrollY = scrollY;
      this.scrollX = scrollX;
      this.onScrolled = onScrolled;
      this.threshold = threshold;
      this.maxSpeed = maxSpeed;
      this.rafId = null;
      this.lastTs = 0;
      this.clientX = 0;
      this.clientY = 0;
      this.running = false;
      /**
       * RAF tick — computes scroll deltas from edge proximity and fires callbacks.
       * Bound as an arrow field so it can be passed directly to `requestAnimationFrame`
       * without a wrapper.
       */
      this.tick = (ts) => {
        if (!this.running) return;
        const rect = this.getRect();
        if (!rect) {
          this.stop();
          return;
        }
        const dt = this.lastTs === 0 ? 0 : Math.min((ts - this.lastTs) / 1e3, 0.1);
        this.lastTs = ts;
        let scrolled = false;
        if (dt > 0) {
          const { clientX: x, clientY: y } = this;
          const distTop = y - rect.top;
          const distBottom = rect.bottom - y;
          if (distTop < this.threshold) {
            this.scrollY(-this.speedAt(Math.max(0, distTop)) * dt);
            scrolled = true;
          } else if (distBottom < this.threshold) {
            this.scrollY(this.speedAt(Math.max(0, distBottom)) * dt);
            scrolled = true;
          }
          const distLeft = x - rect.left;
          const distRight = rect.right - x;
          if (distLeft < this.threshold) {
            this.scrollX(-this.speedAt(Math.max(0, distLeft)) * dt);
            scrolled = true;
          } else if (distRight < this.threshold) {
            this.scrollX(this.speedAt(Math.max(0, distRight)) * dt);
            scrolled = true;
          }
        }
        if (scrolled) {
          this.onScrolled?.(this.clientX, this.clientY);
        }
        this.rafId = requestAnimationFrame(this.tick);
      };
    }
    /**
     * Updates the tracked cursor position and starts the RAF loop if it is not
     * already running.  Safe to call on every `mousemove` — has no overhead
     * when the cursor is away from the edges.
     *
     * @param x - `MouseEvent.clientX`
     * @param y - `MouseEvent.clientY`
     */
    updateMouse(x, y) {
      this.clientX = x;
      this.clientY = y;
      if (!this.running) {
        this.running = true;
        this.lastTs = 0;
        this.rafId = requestAnimationFrame(this.tick);
      }
    }
    /**
     * Stops the RAF loop immediately.  Call on `mouseup` or when the drag
     * interaction ends to prevent ghost scrolling after the pointer is released.
     */
    stop() {
      this.running = false;
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
    /**
     * Computes scroll speed (px/s) as a linear ramp:
     * `maxSpeed` at the edge (dist = 0), `0` at `threshold` distance.
     *
     * @param distFromEdge - Distance from the viewport edge in pixels.
     */
    speedAt(distFromEdge) {
      return this.maxSpeed * (1 - distFromEdge / this.threshold);
    }
  };

  // src/renderer/row-animator.ts
  var FILTER_ENTER_OFFSET_PX = 8;
  var SORT_DURATION_MS = 280;
  var FILTER_DURATION_MS = 200;
  var EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
  var RowAnimator = class {
    constructor() {
      this.snapshot = null;
      this.animationType = "sort";
      this.cleanupTimer = null;
    }
    /**
     * Snapshot current row positions **before** a pipeline run so the animator
     * has a reference frame for the FLIP calculation.
     *
     * @param rows - Current visible rows (nodeId + top).
     * @param type - `'sort'` or `'filter'` — controls duration and entrance style.
     */
    capture(rows, type = "sort") {
      if (this.cleanupTimer !== null) {
        clearTimeout(this.cleanupTimer);
        this.cleanupTimer = null;
      }
      this.animationType = type;
      this.snapshot = new Map(rows.map((r) => [r.nodeId, r.top]));
    }
    /**
     * Apply animations to the panel containers after the DOM has been updated.
     *
     * For every `[data-node-id]` element found inside `containers`:
     * - **Known row (in snapshot)** whose `top` changed → FLIP slide.
     * - **New row (not in snapshot)** during a `filter` animation → fade-in entrance.
     *
     * @param containers - Body panel elements whose direct row children carry `data-node-id`.
     * @param newRows    - Newly rendered rows with updated `top` values.
     * @param maxDelta   - Clamp large per-row offsets to this many px so that rows
     *                     travelling many viewports start just off-screen rather than
     *                     miles away (prevents white-gap flashes).  Defaults to
     *                     one viewport height.
     */
    animate(containers, newRows, maxDelta) {
      const snap = this.snapshot;
      this.snapshot = null;
      if (!snap || snap.size === 0) return;
      const isFilter = this.animationType === "filter";
      const duration = isFilter ? FILTER_DURATION_MS : SORT_DURATION_MS;
      const newTopMap = new Map(newRows.map((r) => [r.nodeId, r.top]));
      const toFlip = [];
      const toFadeIn = [];
      for (const container of containers) {
        for (const el of container.querySelectorAll("[data-node-id]")) {
          const nodeId = el.getAttribute("data-node-id");
          if (!nodeId) continue;
          const oldTop = snap.get(nodeId);
          const newTop = newTopMap.get(nodeId);
          if (oldTop === void 0) {
            if (isFilter) toFadeIn.push(el);
            continue;
          }
          if (newTop === void 0) continue;
          const rawDelta = oldTop - newTop;
          if (Math.abs(rawDelta) < 1) continue;
          const delta = maxDelta !== void 0 && Math.abs(rawDelta) > maxDelta ? Math.sign(rawDelta) * maxDelta : rawDelta;
          toFlip.push({ el, delta });
        }
      }
      if (toFlip.length === 0 && toFadeIn.length === 0) return;
      for (const { el, delta } of toFlip) {
        el.style.willChange = "transform";
        el.style.transition = "none";
        el.style.transform = `translateY(${delta}px)`;
      }
      for (const el of toFadeIn) {
        el.style.willChange = "opacity, transform";
        el.style.transition = "none";
        el.style.opacity = "0";
        el.style.transform = `translateY(${FILTER_ENTER_OFFSET_PX}px)`;
      }
      containers[0]?.offsetHeight;
      requestAnimationFrame(() => {
        const flipTransition = `transform ${duration}ms ${EASING}`;
        const fadeTransition = `opacity ${duration}ms ${EASING}, transform ${duration}ms ${EASING}`;
        for (const { el } of toFlip) {
          el.style.transition = flipTransition;
          el.style.transform = "translateY(0)";
        }
        for (const el of toFadeIn) {
          el.style.transition = fadeTransition;
          el.style.opacity = "";
          el.style.transform = "";
        }
        this.cleanupTimer = setTimeout(() => {
          this.cleanupTimer = null;
          for (const { el } of toFlip) {
            el.style.transform = "";
            el.style.transition = "";
            el.style.willChange = "";
          }
          for (const el of toFadeIn) {
            el.style.opacity = "";
            el.style.transform = "";
            el.style.transition = "";
            el.style.willChange = "";
          }
        }, duration + 20);
      });
    }
    /** Returns `true` when a `capture()` is pending and the next `animate()` will run. */
    hasPending() {
      return this.snapshot !== null;
    }
    destroy() {
      if (this.cleanupTimer !== null) {
        clearTimeout(this.cleanupTimer);
        this.cleanupTimer = null;
      }
      this.snapshot = null;
    }
  };

  // src/engines/filter/filter-panel.ts
  var STRING_OPERATORS = [
    { label: "Contains", operator: "contains" },
    { label: "Does not contain", operator: "notContains" },
    { label: "Equals", operator: "equals" },
    { label: "Does not equal", operator: "notEquals" },
    { label: "Starts with", operator: "startsWith" },
    { label: "Ends with", operator: "endsWith" },
    { label: "Blank", operator: "blank" },
    { label: "Not blank", operator: "notBlank" }
  ];
  var NUMBER_OPERATORS = [
    { label: "Equals", operator: "equals" },
    { label: "Does not equal", operator: "notEquals" },
    { label: "Greater than", operator: "greaterThan" },
    { label: "Greater than or equal to", operator: "greaterThanOrEqual" },
    { label: "Less than", operator: "lessThan" },
    { label: "Less than or equal to", operator: "lessThanOrEqual" },
    { label: "Between", operator: "inRange" },
    { label: "Blank", operator: "blank" },
    { label: "Not blank", operator: "notBlank" }
  ];
  var DATE_OPERATORS = [
    { label: "Equals", operator: "equals" },
    { label: "Does not equal", operator: "notEquals" },
    { label: "Before", operator: "before" },
    { label: "After", operator: "after" },
    { label: "Between", operator: "inRange" },
    { label: "Blank", operator: "blank" },
    { label: "Not blank", operator: "notBlank" }
  ];
  function getOperators(colType) {
    switch (colType) {
      case "number":
      case "currency":
      case "percentage":
        return NUMBER_OPERATORS;
      case "date":
      case "time":
        return DATE_OPERATORS;
      default:
        return STRING_OPERATORS;
    }
  }
  function getInputType(colType) {
    switch (colType) {
      case "number":
      case "currency":
      case "percentage":
        return "number";
      case "date":
        return "date";
      case "time":
        return "time";
      default:
        return "text";
    }
  }
  function isSetType(colType) {
    return colType === "dropdown" || colType === "array";
  }
  function isNoValueOperator(op) {
    return op === "blank" || op === "notBlank";
  }
  function isRangeOperator(op) {
    return op === "inRange";
  }
  var VS_ITEM_HEIGHT = 28;
  var VS_MAX_VISIBLE = 9;
  var VS_BUFFER = 3;
  var DEBOUNCE_MS = 200;
  var FilterPanel = class {
    constructor(config) {
      this.config = config;
      this.panelEl = null;
      this.val1 = "";
      this.val1To = "";
      this.logicMode = "none";
      this.val2 = "";
      this.val2To = "";
      this.setSearchTerm = "";
      // ── DOM references (populated during build) ───────────────────────────────
      this.vsContainerEl = null;
      this.vsInnerEl = null;
      this.logicRowEl = null;
      this.cond2RowEl = null;
      this.selectAllCbEl = null;
      // ── Lifecycle helpers ─────────────────────────────────────────────────────
      this.debounceTimer = null;
      const type = config.colDef.type ?? "string";
      const ops = getOperators(type);
      this.op1 = ops[0].operator;
      this.op2 = ops[0].operator;
      this.allOptions = config.uniqueOptions;
      this.displayOptions = [...this.allOptions];
      const cf = config.currentFilter;
      if (cf) {
        if (isSetType(type)) {
          this.selectedValues = new Set((cf.selectedIds ?? []).map(String));
        } else {
          this.selectedValues = /* @__PURE__ */ new Set();
          if (cf.conditions.length >= 1) {
            this.op1 = cf.conditions[0].operator;
            this.val1 = cf.conditions[0].value != null ? String(cf.conditions[0].value) : "";
            this.val1To = cf.conditions[0].valueTo != null ? String(cf.conditions[0].valueTo) : "";
          }
          const c2Existing = cf.conditions.length >= 2 ? cf.conditions[1] : null;
          if (c2Existing) {
            this.logicMode = cf.logic ?? "and";
            this.op2 = c2Existing.operator;
            this.val2 = c2Existing.value != null ? String(c2Existing.value) : "";
            this.val2To = c2Existing.valueTo != null ? String(c2Existing.valueTo) : "";
          }
        }
      } else {
        this.selectedValues = new Set(this.allOptions.map((o) => o.value));
      }
      this.boundClickOutside = this.handleClickOutside.bind(this);
      this.boundEscapeKey = this.handleEscapeKey.bind(this);
    }
    /**
     * Renders the panel DOM, appends it to the container, positions it below the
     * anchor element, and attaches global click-outside / Escape listeners.
     */
    open() {
      const type = this.config.colDef.type ?? "string";
      const panel = document.createElement("div");
      panel.className = "pg-filter-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", `Filter: ${this.config.colDef.header}`);
      if (isSetType(type)) {
        panel.appendChild(this.buildSetFilter());
      } else {
        panel.appendChild(this.buildConditionFilter(type));
      }
      panel.appendChild(this.buildFooter());
      this.panelEl = panel;
      this.config.containerEl.appendChild(panel);
      this.position();
      if (isSetType(type) && this.vsContainerEl) {
        this.renderVirtualList();
      }
      requestAnimationFrame(() => {
        document.addEventListener("mousedown", this.boundClickOutside, true);
        document.addEventListener("keydown", this.boundEscapeKey, true);
      });
    }
    /** Removes the panel from the DOM and fires the `onClose` callback. */
    destroy() {
      this.clearDebounce();
      document.removeEventListener("mousedown", this.boundClickOutside, true);
      document.removeEventListener("keydown", this.boundEscapeKey, true);
      this.panelEl?.remove();
      this.panelEl = null;
      this.config.onClose();
    }
    // ─── Condition filter ─────────────────────────────────────────────────────
    buildConditionFilter(colType) {
      const wrap = document.createElement("div");
      wrap.className = "pg-filter-cond-wrap";
      const cond1 = this.buildConditionRow(colType, 1);
      wrap.appendChild(cond1);
      const logicRow = document.createElement("div");
      logicRow.className = "pg-filter-logic";
      if (!this.hasConditionValue(1)) logicRow.classList.add("pg-filter-logic--hidden");
      for (const mode of ["and", "or", "none"]) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pg-filter-logic__btn";
        btn.textContent = mode === "none" ? "None" : mode.toUpperCase();
        if (this.logicMode === mode) btn.classList.add("pg-filter-logic__btn--active");
        btn.addEventListener("click", () => {
          this.logicMode = mode;
          logicRow.querySelectorAll(".pg-filter-logic__btn").forEach((b) => {
            b.classList.toggle("pg-filter-logic__btn--active", b.textContent === (mode === "none" ? "None" : mode.toUpperCase()));
          });
          if (this.cond2RowEl) {
            this.cond2RowEl.classList.toggle("pg-filter-cond__row--hidden", mode === "none");
          }
          this.scheduleEmit();
        });
        logicRow.appendChild(btn);
      }
      this.logicRowEl = logicRow;
      wrap.appendChild(logicRow);
      const cond2 = this.buildConditionRow(colType, 2);
      if (this.logicMode === "none") cond2.classList.add("pg-filter-cond__row--hidden");
      this.cond2RowEl = cond2;
      wrap.appendChild(cond2);
      return wrap;
    }
    buildConditionRow(colType, index) {
      const ops = getOperators(colType);
      const inputType = getInputType(colType);
      const currentOp = index === 1 ? this.op1 : this.op2;
      const currentVal = index === 1 ? this.val1 : this.val2;
      const currentValTo = index === 1 ? this.val1To : this.val2To;
      const row = document.createElement("div");
      row.className = "pg-filter-cond__row";
      const select = document.createElement("select");
      select.className = "pg-filter-cond__select";
      select.setAttribute("aria-label", "Filter operator");
      for (const op of ops) {
        const opt = document.createElement("option");
        opt.value = op.operator;
        opt.textContent = op.label;
        if (op.operator === currentOp) opt.selected = true;
        select.appendChild(opt);
      }
      const valWrap = document.createElement("div");
      valWrap.className = "pg-filter-cond__inputs";
      const input1 = document.createElement("input");
      input1.type = inputType;
      input1.className = "pg-filter-cond__input";
      input1.placeholder = "Filter value\u2026";
      input1.value = currentVal;
      input1.setAttribute("aria-label", "Filter value");
      const rangeSep = document.createElement("span");
      rangeSep.className = "pg-filter-cond__range-sep";
      rangeSep.textContent = "and";
      const input2 = document.createElement("input");
      input2.type = inputType;
      input2.className = "pg-filter-cond__input";
      input2.placeholder = "To value\u2026";
      input2.value = currentValTo;
      input2.setAttribute("aria-label", "Filter to value");
      if (index === 1) {
        this.val1 = currentVal;
        this.val1To = currentValTo;
      } else {
        this.val2 = currentVal;
        this.val2To = currentValTo;
      }
      const isRange = isRangeOperator(currentOp);
      const isNoVal = isNoValueOperator(currentOp);
      valWrap.classList.toggle("pg-filter-cond__inputs--hidden", isNoVal);
      valWrap.classList.toggle("pg-filter-cond__inputs--range", isRange);
      rangeSep.classList.toggle("pg-filter-cond__range-sep--hidden", !isRange);
      input2.classList.toggle("pg-filter-cond__input--hidden", !isRange);
      valWrap.appendChild(input1);
      valWrap.appendChild(rangeSep);
      valWrap.appendChild(input2);
      select.addEventListener("change", () => {
        const op = select.value;
        if (index === 1) this.op1 = op;
        else this.op2 = op;
        const noVal = isNoValueOperator(op);
        const range = isRangeOperator(op);
        valWrap.classList.toggle("pg-filter-cond__inputs--hidden", noVal);
        valWrap.classList.toggle("pg-filter-cond__inputs--range", range);
        rangeSep.classList.toggle("pg-filter-cond__range-sep--hidden", !range);
        input2.classList.toggle("pg-filter-cond__input--hidden", !range);
        this.scheduleEmit();
      });
      input1.addEventListener("input", () => {
        const v = input1.value;
        if (index === 1) {
          this.val1 = v;
          if (this.logicRowEl) {
            this.logicRowEl.classList.toggle("pg-filter-logic--hidden", !v && !isNoValueOperator(this.op1));
          }
        } else {
          this.val2 = v;
        }
        this.scheduleEmit();
      });
      input2.addEventListener("input", () => {
        if (index === 1) this.val1To = input2.value;
        else this.val2To = input2.value;
        this.scheduleEmit();
      });
      row.appendChild(select);
      row.appendChild(valWrap);
      return row;
    }
    hasConditionValue(index) {
      const op = index === 1 ? this.op1 : this.op2;
      const val = index === 1 ? this.val1 : this.val2;
      return isNoValueOperator(op) || val.trim() !== "";
    }
    // ─── Set filter ───────────────────────────────────────────────────────────
    buildSetFilter() {
      const wrap = document.createElement("div");
      wrap.className = "pg-filter-set";
      const searchWrap = document.createElement("div");
      searchWrap.className = "pg-filter-set__search";
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "pg-filter-set__search-input";
      searchInput.placeholder = "Search values\u2026";
      searchInput.setAttribute("aria-label", "Search filter values");
      searchInput.value = this.setSearchTerm;
      searchInput.addEventListener("input", () => {
        this.setSearchTerm = searchInput.value;
        this.applySetSearch();
      });
      searchWrap.appendChild(searchInput);
      wrap.appendChild(searchWrap);
      wrap.appendChild(this.buildDivider());
      const selectAllLabel = document.createElement("label");
      selectAllLabel.className = "pg-filter-set__item pg-filter-set__item--select-all";
      const selectAllCb = document.createElement("input");
      selectAllCb.type = "checkbox";
      selectAllCb.className = "pg-filter-set__checkbox";
      selectAllCb.setAttribute("aria-label", "Select all");
      this.updateSelectAllState(selectAllCb);
      selectAllCb.addEventListener("change", () => {
        if (selectAllCb.checked) {
          this.selectedValues = new Set(this.allOptions.map((o) => o.value));
        } else {
          this.selectedValues = /* @__PURE__ */ new Set();
        }
        this.renderVirtualList();
        this.updateSelectAllState(selectAllCb);
        this.emitFilter();
      });
      this.selectAllCbEl = selectAllCb;
      const selectAllText = document.createElement("span");
      selectAllText.className = "pg-filter-set__item-label";
      selectAllText.textContent = "(Select All)";
      selectAllLabel.appendChild(selectAllCb);
      selectAllLabel.appendChild(selectAllText);
      wrap.appendChild(selectAllLabel);
      wrap.appendChild(this.buildDivider());
      const visibleCount = Math.min(this.allOptions.length, VS_MAX_VISIBLE);
      const containerH = visibleCount * VS_ITEM_HEIGHT;
      const vsContainer = document.createElement("div");
      vsContainer.className = "pg-filter-set__list";
      vsContainer.style.height = `${containerH}px`;
      const vsInner = document.createElement("div");
      vsInner.className = "pg-filter-set__list-inner";
      vsInner.style.height = `${this.displayOptions.length * VS_ITEM_HEIGHT}px`;
      vsContainer.appendChild(vsInner);
      vsContainer.addEventListener("scroll", () => this.renderVirtualList(), { passive: true });
      this.vsContainerEl = vsContainer;
      this.vsInnerEl = vsInner;
      wrap.appendChild(vsContainer);
      return wrap;
    }
    buildDivider() {
      const d = document.createElement("div");
      d.className = "pg-filter-set__divider";
      return d;
    }
    applySetSearch() {
      const term = this.setSearchTerm.toLowerCase().trim();
      this.displayOptions = term ? this.allOptions.filter((o) => o.label.toLowerCase().includes(term)) : [...this.allOptions];
      if (this.vsInnerEl) {
        this.vsInnerEl.style.height = `${this.displayOptions.length * VS_ITEM_HEIGHT}px`;
      }
      if (this.vsContainerEl) {
        this.vsContainerEl.scrollTop = 0;
      }
      this.renderVirtualList();
      this.updateSelectAllState(this.selectAllCbEl);
    }
    renderVirtualList() {
      if (!this.vsContainerEl || !this.vsInnerEl) return;
      const scrollTop = this.vsContainerEl.scrollTop;
      const containerH = this.vsContainerEl.clientHeight || VS_MAX_VISIBLE * VS_ITEM_HEIGHT;
      const firstIdx = Math.max(0, Math.floor(scrollTop / VS_ITEM_HEIGHT) - VS_BUFFER);
      const lastIdx = Math.min(
        this.displayOptions.length,
        Math.ceil((scrollTop + containerH) / VS_ITEM_HEIGHT) + VS_BUFFER
      );
      this.vsInnerEl.innerHTML = "";
      for (let i = firstIdx; i < lastIdx; i++) {
        const opt = this.displayOptions[i];
        const item = this.buildSetItem(opt, i);
        this.vsInnerEl.appendChild(item);
      }
    }
    buildSetItem(opt, index) {
      const label = document.createElement("label");
      label.className = "pg-filter-set__item";
      label.style.top = `${index * VS_ITEM_HEIGHT}px`;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "pg-filter-set__checkbox";
      cb.checked = this.selectedValues.has(opt.value);
      cb.addEventListener("change", () => {
        if (cb.checked) {
          this.selectedValues.add(opt.value);
        } else {
          this.selectedValues.delete(opt.value);
        }
        this.updateSelectAllState(this.selectAllCbEl);
        this.emitFilter();
      });
      const text = document.createElement("span");
      text.className = "pg-filter-set__item-label";
      text.textContent = opt.label || "(Blank)";
      if (!opt.label) text.classList.add("pg-filter-set__item-label--blank");
      label.appendChild(cb);
      label.appendChild(text);
      return label;
    }
    updateSelectAllState(cb) {
      if (!cb) return;
      const total = this.displayOptions.length || this.allOptions.length;
      const selectedCount = this.searchTerm ? this.displayOptions.filter((o) => this.selectedValues.has(o.value)).length : this.selectedValues.size;
      cb.checked = selectedCount >= total;
      cb.indeterminate = selectedCount > 0 && selectedCount < total;
    }
    get searchTerm() {
      return this.setSearchTerm;
    }
    // ─── Footer ───────────────────────────────────────────────────────────────
    buildFooter() {
      const footer = document.createElement("div");
      footer.className = "pg-filter-panel__footer";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "pg-filter-panel__clear-btn";
      clearBtn.textContent = "Clear Filter";
      clearBtn.addEventListener("click", () => {
        this.config.onFilterChange(null);
        this.destroy();
      });
      footer.appendChild(clearBtn);
      return footer;
    }
    // ─── Filter building ──────────────────────────────────────────────────────
    buildColumnFilter() {
      const colDef = this.config.colDef;
      const type = colDef.type ?? "string";
      if (isSetType(type)) {
        if (this.selectedValues.size >= this.allOptions.length) return null;
        if (this.selectedValues.size === 0) {
          return {
            colId: colDef.colId,
            field: colDef.field,
            type: "dropdown",
            logic: "and",
            conditions: [{ operator: "equals", value: "__NO_MATCH__" }],
            selectedIds: []
          };
        }
        return {
          colId: colDef.colId,
          field: colDef.field,
          type: "dropdown",
          logic: "and",
          conditions: [{ operator: "in", value: null }],
          selectedIds: Array.from(this.selectedValues)
        };
      }
      const filterType = this.getFilterDataType(type);
      const c1 = this.buildConditionObject(this.op1, this.val1, this.val1To);
      if (!c1) return null;
      const hasCond2 = this.logicMode !== "none";
      const c2 = hasCond2 ? this.buildConditionObject(this.op2, this.val2, this.val2To) : null;
      if (!c2) {
        return {
          colId: colDef.colId,
          field: colDef.field,
          type: filterType,
          logic: "and",
          conditions: [c1]
        };
      }
      return {
        colId: colDef.colId,
        field: colDef.field,
        type: filterType,
        logic: this.logicMode,
        conditions: [c1, c2]
      };
    }
    buildConditionObject(op, val, valTo) {
      if (isNoValueOperator(op)) return { operator: op, value: null };
      if (val.trim() === "") return null;
      if (isRangeOperator(op)) {
        return { operator: op, value: val.trim(), valueTo: valTo.trim() };
      }
      return { operator: op, value: val.trim() };
    }
    getFilterDataType(colType) {
      switch (colType) {
        case "number":
        case "currency":
        case "percentage":
          return "number";
        case "date":
        case "time":
          return "date";
        case "boolean":
          return "boolean";
        case "dropdown":
          return "dropdown";
        case "array":
          return "array";
        default:
          return "string";
      }
    }
    // ─── Emit helpers ─────────────────────────────────────────────────────────
    scheduleEmit() {
      this.clearDebounce();
      this.debounceTimer = setTimeout(() => this.emitFilter(), DEBOUNCE_MS);
    }
    emitFilter() {
      const filter = this.buildColumnFilter();
      this.config.onFilterChange(filter);
    }
    clearDebounce() {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }
    // ─── Positioning ──────────────────────────────────────────────────────────
    position() {
      if (!this.panelEl) return;
      const anchorRect = this.config.anchorEl.getBoundingClientRect();
      const containerRect = this.config.containerEl.getBoundingClientRect();
      let top = anchorRect.bottom - containerRect.top;
      let left = anchorRect.left - containerRect.left;
      const panelW = this.panelEl.offsetWidth || 280;
      const containerW = containerRect.width;
      if (left + panelW > containerW) {
        left = Math.max(0, containerW - panelW);
      }
      const panelH = this.panelEl.offsetHeight || 300;
      const remainingH = containerRect.height - top;
      if (remainingH < panelH && top > panelH) {
        top = anchorRect.top - containerRect.top - panelH;
      }
      this.panelEl.style.top = `${Math.max(0, top)}px`;
      this.panelEl.style.left = `${Math.max(0, left)}px`;
    }
    // ─── Global event handlers ────────────────────────────────────────────────
    handleClickOutside(e) {
      const target = e.target;
      if (this.panelEl?.contains(target) || this.config.anchorEl?.contains(target)) return;
      this.destroy();
    }
    handleEscapeKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        this.destroy();
      }
    }
  };

  // src/renderer/grid-renderer.ts
  var CHECKBOX_COL_WIDTH = 44;
  var SERIAL_COL_WIDTH = 52;
  var ROW_BUFFER = 5;
  var COL_BUFFER = 2;
  var AUTO_GROUP_COL_WIDTH = 200;
  var GridRenderer = class {
    constructor(containerEl, store, eventBus, columnModel, paginationEngine, iconRenderer, cellSelectionEngine, sortEngine, rowSelectionEngine, groupingEngine, options) {
      this.containerEl = containerEl;
      this.store = store;
      this.eventBus = eventBus;
      this.columnModel = columnModel;
      this.paginationEngine = paginationEngine;
      this.iconRenderer = iconRenderer;
      this.cellSelectionEngine = cellSelectionEngine;
      this.sortEngine = sortEngine;
      this.rowSelectionEngine = rowSelectionEngine;
      this.groupingEngine = groupingEngine;
      this.options = options;
      this.wrapperEl = null;
      // Header panel elements
      this.leftHeaderPanelEl = null;
      this.centerHeaderInnerEl = null;
      this.rightHeaderPanelEl = null;
      // Body panel elements
      this.leftBodyPanelEl = null;
      this.centerBodyEl = null;
      // the .pg-panel__body for viewport size
      this.centerBodyContentEl = null;
      this.rightBodyPanelEl = null;
      this.leftBodyContentEl = null;
      this.rightBodyContentEl = null;
      this.footerContainerEl = null;
      this.bodyWrapEl = null;
      this.groupDropZone = null;
      this.rowDragRenderer = null;
      this.rafId = null;
      this.autoScroller = null;
      this.unsubscribers = [];
      this.headerRendered = false;
      this.lastCenterColStart = -1;
      this.lastCenterColEnd = -1;
      this.rowAnimator = new RowAnimator();
      // ── Column-group support ──────────────────────────────────────────────────
      this.columnGroupModel = null;
      this.groupHeaderBuilder = null;
      this.groupDragHandler = null;
      /** New Display Group Engine — takes priority over the legacy ColumnGroupModel when set. */
      this.displayGroupEngine = null;
      // ── Filter panel management ────────────────────────────────────────────────
      this.filterEngine = null;
      this.filterRefreshFn = null;
      this.activeFilterPanel = null;
      // ── Render caches ─────────────────────────────────────────────────────────
      // Column/row computation is skipped on scroll-only frames by comparing the
      // store array reference — a new reference means data/columns actually changed.
      /** Last `columns` array reference seen — guards column-width recomputation. */
      this._lastColumnsRef = null;
      /** Last `groupedColumnIds` array reference seen — guards grouping recomputation. */
      this._lastGroupedIdsRef = null;
      /** Last `visibleRows` array reference seen — guards total-height recomputation. */
      this._lastRowsRef = null;
      /** Cached total content height in pixels (sum of all visible row heights). */
      this._cachedTotalHeight = 0;
      /** Cached center-panel content width in pixels. */
      this._cachedCenterW = 0;
      this.colStyles = new ColumnStyleManager();
      this.rowPositionSheet = new RowPositionSheet();
      this.scrollController = new ScrollController();
      this.headerRenderer = new HeaderRenderer(
        store,
        eventBus,
        iconRenderer,
        columnModel,
        sortEngine,
        this.colStyles
      );
      if (options.showGroupingBar) {
        this.groupDropZone = new GroupDropZone(store, groupingEngine, iconRenderer);
        this.headerRenderer.setGroupDropZone(this.groupDropZone);
      }
      this.bodyRenderer = new BodyRenderer(
        store,
        eventBus,
        iconRenderer,
        rowSelectionEngine
      );
      this.footerRenderer = new FooterRenderer(eventBus, iconRenderer, paginationEngine);
      this.overlayRenderer = new OverlayRenderer(iconRenderer);
    }
    mount() {
      this.colStyles.mount();
      this.rowPositionSheet.mount();
      this.buildLayout();
      if (this.wrapperEl && this.bodyWrapEl) {
        this.rowDragRenderer = new RowDragRenderer(this.store, this.eventBus, this.iconRenderer);
        this.rowDragRenderer.mount(
          this.wrapperEl,
          this.bodyWrapEl,
          (dy) => this.scrollController.scrollToY(this.scrollController.getScrollTop() + dy)
        );
      }
      this.subscribeToStore();
      this.scheduleRender();
    }
    scheduleRender() {
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.performRender();
      });
    }
    forceRender() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.performRender();
    }
    /**
     * Clears the body-renderer's row cache so the next render fully rebuilds every
     * visible row from the data model.  Use this after in-place data mutations
     * (paste, cut) where the `visibleRows` reference is unchanged but cell values
     * have been updated — `updatePanelRow` only refreshes row-level classes, not
     * cell content, so a cache invalidation + re-render is required.
     */
    invalidateBodyRows() {
      this.bodyRenderer.clear();
      this.scheduleRender();
    }
    /**
     * Evicts only the rows with the given node IDs from the render cache and
     * schedules a repaint.  All other rows keep their cached DOM elements so
     * custom cell renderers (images, flags, etc.) are not needlessly re-executed.
     *
     * Prefer this over `invalidateBodyRows` whenever the set of mutated rows is
     * known (fill, cut, paste, undo/redo).
     *
     * @param nodeIds - Node IDs of the rows whose cache entries should be evicted.
     */
    invalidateBodyRowsByIds(nodeIds) {
      this.bodyRenderer.invalidateRowsByNodeId(nodeIds);
      this.scheduleRender();
    }
    // ── Filter panel public API ────────────────────────────────────────────────
    /**
     * Provides the renderer with a `FilterEngine` reference so it can read the
     * current filter model and write column filters when the user interacts with
     * the filter panel.  Called from `GridApi` after construction.
     */
    setFilterEngine(engine) {
      this.filterEngine = engine;
    }
    /**
     * Registers a callback that runs the full sort/filter pipeline and triggers
     * a render whenever the filter state changes from within the panel.
     * Called from `GridApi` after construction.
     */
    setFilterRefreshCallback(fn) {
      this.filterRefreshFn = fn;
    }
    /**
     * Wire the column-group model and header builder into the renderer.
     *
     * Must be called **before** the first `mount()` so that `renderInPanels`
     * can insert group header rows above the leaf row.  Called by `GridCore`
     * when any top-level `ColumnDef` has a `children` array.
     *
     * @param model   - The live tree model.
     * @param builder - The DOM builder instance.
     */
    setColumnGroupModel(model, builder) {
      this.columnGroupModel = model;
      this.groupHeaderBuilder = builder;
      this.groupDragHandler = new ColumnGroupDragHandler(
        this.columnModel,
        model,
        builder,
        this.colStyles,
        this.eventBus,
        () => this.wrapperEl
      );
      builder.setDragConfig(this.groupDragHandler, () => this.wrapperEl);
      this.headerRenderer.setColumnGroupModel(model, builder);
      this.headerRenderer.setGroupDragHandler(this.groupDragHandler);
      this.headerRenderer.setGroupToggleCallback((groupId) => {
        this.handleGroupToggle(groupId);
      });
      this.headerRenderer.setGroupResizeCallback((groupId, newWidth) => {
        this.handleGroupResize(groupId, newWidth);
      });
    }
    /**
     * Wire the new Display Group Engine into the renderer.
     *
     * Creates the drag handler, forwards the engine into `HeaderRenderer`, and
     * subscribes to the events that trigger header rebuilds.  Must be called
     * before `mount()` when the grid's column definitions contain groups.
     *
     * Takes priority over the legacy `setColumnGroupModel` path.
     *
     * @param engine - Fully-initialised `DisplayGroupEngine` instance.
     */
    setDisplayGroupEngine(engine) {
      this.displayGroupEngine = engine;
      engine.createDragHandler(() => this.wrapperEl);
      this.headerRenderer.setDisplayGroupEngine(engine);
      this.headerRenderer.setGroupToggleCallback((groupId) => {
        this.handleGroupToggle(groupId);
      });
      this.headerRenderer.setGroupResizeCallback((groupId, newWidth) => {
        this.handleGroupResize(groupId, newWidth);
      });
      this.unsubscribers.push(
        this.eventBus.on(GridEventType.COLUMN_GROUP_HEADER_COLLAPSED, () => {
          this.rebuildHeader();
        }),
        this.eventBus.on(GridEventType.COLUMN_GROUP_HEADER_EXPANDED, () => {
          this.rebuildHeader();
        }),
        // Group drag-drop (and leaf clone) completion fires COLUMN_MOVED with
        // fromIndex === -1 as a sentinel.  Sync the flat store.columns order from
        // the group tree so body rows reflect the new column sequence, then rebuild.
        this.eventBus.on(GridEventType.COLUMN_MOVED, (payload) => {
          const p = payload;
          if (p?.fromIndex === -1) {
            if (this.columnGroupModel) {
              const newLeaves = this.columnGroupModel.getAllLeaves();
              const storeColumns = this.store.get("columns");
              const colMap = new Map(storeColumns.map((c) => [c.colId, c]));
              const reordered = newLeaves.map((l) => colMap.get(l.colId)).filter((c) => c !== void 0);
              const orderChanged = reordered.some((c, i) => c.colId !== storeColumns[i]?.colId);
              if (orderChanged) {
                this.store.set("columns", reordered);
              }
            }
            this.bodyRenderer.clear();
            this.rebuildHeader();
          }
        })
      );
    }
    /**
     * Opens (or replaces) the floating filter panel for the given column.
     * Called by `HeaderRenderer` when the user clicks a column's filter icon.
     *
     * @param colDef   - Column definition the filter applies to.
     * @param anchorEl - Filter-icon button element — panel positions below this.
     */
    openFilterPanel(colDef, anchorEl) {
      if (!this.filterEngine || !this.wrapperEl) return;
      if (this.activeFilterPanel) {
        this.activeFilterPanel.destroy();
        this.activeFilterPanel = null;
        return;
      }
      const currentFilter = this.filterEngine.getFilterModel()[colDef.colId] ?? null;
      const uniqueOptions = this.extractUniqueOptions(colDef);
      this.activeFilterPanel = new FilterPanel({
        colDef,
        anchorEl,
        containerEl: this.wrapperEl,
        currentFilter,
        uniqueOptions,
        onFilterChange: (filter) => {
          this.filterEngine.setColumnFilter(colDef.colId, filter);
          this.filterRefreshFn?.();
        },
        onClose: () => {
          this.activeFilterPanel = null;
        }
      });
      this.activeFilterPanel.open();
    }
    /**
     * Extracts unique display value/label pairs for set-type (dropdown / array)
     * filter panels.  For `dropdown` columns the predefined `dropdownOptions`
     * are used directly; for other types unique values are scanned from `allRows`.
     */
    extractUniqueOptions(colDef) {
      if (colDef.type === "dropdown" && colDef.dropdownOptions?.length) {
        return colDef.dropdownOptions.map((o) => ({
          value: String(o.value),
          label: o.label ?? String(o.value)
        }));
      }
      const allRows = this.store.get("allRows");
      const field = colDef.field;
      const parts = field.split(".");
      const nested = field.includes(".");
      const seen = /* @__PURE__ */ new Set();
      for (const row of allRows) {
        if (row.type !== "data") continue;
        let val;
        if (nested) {
          val = row.data;
          for (const part of parts) {
            if (val == null) break;
            val = val[part];
          }
        } else {
          val = row.data[field];
        }
        if (Array.isArray(val)) {
          for (const v of val) {
            if (v != null && v !== "") seen.add(String(v));
          }
        } else if (val != null && val !== "") {
          seen.add(String(val));
        }
      }
      return Array.from(seen).sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
    }
    /**
     * Snapshot current row positions so the next render animates the transition.
     * Call this **before** any pipeline that reorders or hides rows.
     *
     * @param rows - Current visible rows before the pipeline runs.
     * @param type - `'sort'` (default) or `'filter'` — controls duration and entrance style.
     */
    captureRowAnimation(rows, type = "sort") {
      this.rowAnimator.capture(rows, type);
    }
    /** Wire up the group-bar search input to an external handler (e.g. api.setQuickFilter). */
    setSearchCallback(fn) {
      this.groupDropZone?.setSearchCallback(fn);
    }
    scrollToRow(rowIndex) {
      const rows = this.store.get("visibleRows");
      this.scrollController.scrollToRow(rowIndex, rows);
    }
    scrollToTop() {
      this.scrollController.scrollToTop();
    }
    /**
     * Scrolls the grid body (vertically and horizontally) so that the cell at
     * `rowIndex` / `colIndex` is fully visible — mirrors AG Grid's auto-scroll
     * behaviour on keyboard navigation.
     *
     * - For pinned-left/right columns only vertical scrolling is applied.
     * - For center columns both axes are adjusted when the cell is out of view.
     *
     * @param rowIndex - Index into `visibleRows`
     * @param colIndex - Index in the flat visible-columns array (left + center + right)
     */
    scrollToCell(rowIndex, colIndex) {
      const rows = this.store.get("visibleRows");
      const allCols = this.store.get("columns").filter((c) => c.visible !== false);
      const row = rows[rowIndex];
      if (!row) return;
      const col = colIndex >= 0 ? allCols[colIndex] : null;
      const rowH = row.height ?? (this.options.rowHeight ?? 48);
      const scrollTop = this.scrollController.getScrollTop();
      const vpH = this.scrollController.getViewportHeight();
      if (row.top < scrollTop) {
        this.scrollController.scrollToY(row.top);
      } else if (row.top + rowH > scrollTop + vpH) {
        this.scrollController.scrollToY(row.top + rowH - vpH);
      }
      if (!col || col.pinned === "left" || col.pinned === "right") return;
      const leftCols = allCols.filter((c) => c.pinned === "left");
      const centerCols = allCols.filter((c) => c.pinned !== "left" && c.pinned !== "right");
      const centerIdx = colIndex - leftCols.length;
      if (centerIdx < 0 || centerIdx >= centerCols.length) return;
      const groupedIds = this.store.get("groupedColumnIds");
      const groupOffset = groupedIds.length > 0 ? AUTO_GROUP_COL_WIDTH : 0;
      const colX = groupOffset + this.colStyles.getTotalWidth(centerCols.slice(0, centerIdx).map((c) => c.colId));
      const colW = this.colStyles.getWidth(centerCols[centerIdx].colId);
      const scrollLeft = this.scrollController.getScrollLeft();
      const vpW = this.scrollController.getCenterViewportWidth();
      if (colX < scrollLeft) {
        this.scrollController.scrollToX(colX);
      } else if (colX + colW > scrollLeft + vpW) {
        this.scrollController.scrollToX(colX + colW - vpW);
      }
    }
    getCellRect(rowIndex, colIndex) {
      for (const content of [this.leftBodyContentEl, this.centerBodyContentEl, this.rightBodyContentEl]) {
        if (!content) continue;
        const cellEl = content.querySelector(
          `[data-row-index="${rowIndex}"][data-col-index="${colIndex}"]`
        );
        if (cellEl) return cellEl.getBoundingClientRect();
      }
      return null;
    }
    enterFullScreen() {
      if (!this.wrapperEl) return;
      this.wrapperEl.requestFullscreen?.();
      this.wrapperEl.classList.add("pg-grid--fullscreen");
      this.store.set("fullScreen", true);
    }
    exitFullScreen() {
      if (document.fullscreenElement === this.wrapperEl) {
        document.exitFullscreen?.();
      }
      this.wrapperEl?.classList.remove("pg-grid--fullscreen");
      this.store.set("fullScreen", false);
    }
    destroy() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      for (const unsub of this.unsubscribers) unsub();
      this.unsubscribers = [];
      this.headerRenderer.destroy();
      this.bodyRenderer.destroy();
      this.footerRenderer.destroy();
      this.overlayRenderer.destroy();
      this.scrollController.destroy();
      this.groupDropZone?.destroy();
      this.rowDragRenderer?.destroy();
      this.groupDragHandler?.destroy();
      this.rowPositionSheet.destroy();
      this.rowAnimator.destroy();
      this.colStyles.destroy();
      this.autoScroller?.stop();
      this.autoScroller = null;
      this.wrapperEl?.remove();
      this.wrapperEl = null;
    }
    // ─── Layout ──────────────────────────────────────────────────────────────
    buildLayout() {
      this.wrapperEl = createDiv("pg-grid");
      this.wrapperEl.setAttribute("role", "grid");
      this.wrapperEl.setAttribute("data-photon-grid-id", this.generateId());
      if (!this.options.showVerticalBorders) {
        this.wrapperEl.classList.add("pg-grid--no-v-borders");
      }
      if (this.options.rowHeightMode === "auto") {
        this.wrapperEl.classList.add("pg-grid--auto-row-height");
      }
      this.containerEl.appendChild(this.wrapperEl);
      if (this.options.headerRowHeight) {
        this.wrapperEl.style.setProperty("--pg-header-row-height", `${this.options.headerRowHeight}px`);
      }
      if (this.options.filterRowHeight) {
        this.wrapperEl.style.setProperty("--pg-filter-row-height", `${this.options.filterRowHeight}px`);
      }
      const outerRowEl = createDiv("pg-grid-outer");
      this.wrapperEl.appendChild(outerRowEl);
      const mainColEl = createDiv("pg-grid-main");
      outerRowEl.appendChild(mainColEl);
      if (this.groupDropZone) {
        this.groupDropZone.mount(outerRowEl, mainColEl);
      }
      const headerWrapEl = createDiv("pg-grid__header");
      mainColEl.appendChild(headerWrapEl);
      const leftHeaderPanelEl = createDiv("pg-panel pg-panel--left");
      const leftHeaderInner = createDiv("pg-panel__header");
      leftHeaderPanelEl.appendChild(leftHeaderInner);
      headerWrapEl.appendChild(leftHeaderPanelEl);
      this.leftHeaderPanelEl = leftHeaderInner;
      const centerHeaderPanelEl = createDiv("pg-panel pg-panel--center");
      const centerHeaderOuter = createDiv("pg-panel__header");
      const centerHeaderInnerEl = createDiv("pg-panel__header-inner");
      centerHeaderOuter.appendChild(centerHeaderInnerEl);
      centerHeaderPanelEl.appendChild(centerHeaderOuter);
      headerWrapEl.appendChild(centerHeaderPanelEl);
      this.centerHeaderInnerEl = centerHeaderInnerEl;
      const rightHeaderPanelEl = createDiv("pg-panel pg-panel--right");
      const rightHeaderInner = createDiv("pg-panel__header");
      rightHeaderPanelEl.appendChild(rightHeaderInner);
      headerWrapEl.appendChild(rightHeaderPanelEl);
      this.rightHeaderPanelEl = rightHeaderInner;
      const headerVScrollSpacerEl = createDiv("pg-header-vscroll-spacer");
      headerWrapEl.appendChild(headerVScrollSpacerEl);
      const bodyWrapEl = createDiv("pg-grid__body");
      mainColEl.appendChild(bodyWrapEl);
      this.bodyWrapEl = bodyWrapEl;
      const leftBodyPanelEl = createDiv("pg-panel pg-panel--left");
      const leftBodyEl = createDiv("pg-panel__body");
      const leftBodyContentEl = createDiv("pg-panel__content");
      leftBodyEl.appendChild(leftBodyContentEl);
      leftBodyPanelEl.appendChild(leftBodyEl);
      bodyWrapEl.appendChild(leftBodyPanelEl);
      this.leftBodyPanelEl = leftBodyPanelEl;
      this.leftBodyContentEl = leftBodyContentEl;
      const centerBodyPanelEl = createDiv("pg-panel pg-panel--center");
      const centerBodyEl = createDiv("pg-panel__body");
      const centerBodyContentEl = createDiv("pg-panel__content");
      centerBodyEl.appendChild(centerBodyContentEl);
      centerBodyPanelEl.appendChild(centerBodyEl);
      bodyWrapEl.appendChild(centerBodyPanelEl);
      this.centerBodyEl = centerBodyEl;
      this.centerBodyContentEl = centerBodyContentEl;
      const rightBodyPanelEl = createDiv("pg-panel pg-panel--right");
      const rightBodyEl = createDiv("pg-panel__body");
      const rightBodyContentEl = createDiv("pg-panel__content");
      rightBodyEl.appendChild(rightBodyContentEl);
      rightBodyPanelEl.appendChild(rightBodyEl);
      bodyWrapEl.appendChild(rightBodyPanelEl);
      this.rightBodyPanelEl = rightBodyPanelEl;
      this.rightBodyContentEl = rightBodyContentEl;
      const sbVNative = createDiv("pg-scrollbar-v-native");
      const sbVSpacer = createDiv("pg-scrollbar-v-spacer");
      sbVNative.appendChild(sbVSpacer);
      bodyWrapEl.appendChild(sbVNative);
      const sbVWidth = sbVNative.offsetWidth;
      this.wrapperEl.style.setProperty("--pg-scrollbar-v-width", `${sbVWidth}px`);
      const sbHRowEl = createDiv("pg-scrollbar-h-row");
      const sbHLeftEl = createDiv("pg-scrollbar-h-spacer pg-scrollbar-h-spacer--left");
      const sbHNative = createDiv("pg-scrollbar-h-native");
      const sbHSpacer = createDiv("pg-scrollbar-h-content");
      sbHNative.appendChild(sbHSpacer);
      const sbHRightEl = createDiv("pg-scrollbar-h-spacer pg-scrollbar-h-spacer--right");
      const sbHVScrollEl = createDiv("pg-scrollbar-h-spacer pg-scrollbar-h-spacer--vscroll");
      sbHRowEl.appendChild(sbHLeftEl);
      sbHRowEl.appendChild(sbHNative);
      sbHRowEl.appendChild(sbHRightEl);
      sbHRowEl.appendChild(sbHVScrollEl);
      mainColEl.appendChild(sbHRowEl);
      if (this.options.showFooter !== false && this.options.pagination?.enabled) {
        this.footerContainerEl = createDiv("pg-grid__footer");
        this.wrapperEl.appendChild(this.footerContainerEl);
      }
      this.scrollController.mount(this.wrapperEl, bodyWrapEl, centerBodyEl, sbVNative, sbVSpacer, sbHNative, sbHSpacer, sbHRowEl);
      this.scrollController.onScrollY(() => this.scheduleRender());
      this.scrollController.onScrollX(() => this.scheduleRender());
      this.headerRenderer.setScrollCallback(
        (dx) => this.scrollController.scrollToX(this.scrollController.getScrollLeft() + dx),
        (dir) => dir < 0 ? this.scrollController.canScrollLeft() : this.scrollController.canScrollRight()
      );
      this.headerRenderer.setResizeCallback(() => this.scheduleRender());
      this.overlayRenderer.mount(bodyWrapEl);
      this.cellSelectionEngine.attach(centerBodyContentEl);
      this.bodyRenderer.setPanels(leftBodyContentEl, centerBodyContentEl, rightBodyContentEl);
      this.cellSelectionEngine.setBodyPanels([leftBodyContentEl, centerBodyContentEl, rightBodyContentEl]);
      this.cellSelectionEngine.setScrollToCellCallback((r, c) => this.scrollToCell(r, c));
      this.cellSelectionEngine.setGetViewportRowCountCallback(() => {
        const vpH = this.scrollController.getViewportHeight();
        const rowH = this.options.rowHeight ?? 48;
        return Math.max(1, Math.floor(vpH / rowH));
      });
      this.cellSelectionEngine.setDataChangedCallback((nodeIds) => {
        if (nodeIds && nodeIds.size > 0) {
          this.invalidateBodyRowsByIds(nodeIds);
        } else {
          this.invalidateBodyRows();
        }
      });
      this.headerRenderer.setOpenFilterPanelCallback((col, anchor) => this.openFilterPanel(col, anchor));
      this.autoScroller = new AutoScroller(
        () => this.bodyWrapEl?.getBoundingClientRect() ?? null,
        (dy) => this.scrollController.scrollToY(this.scrollController.getScrollTop() + dy),
        (dx) => this.scrollController.scrollToX(this.scrollController.getScrollLeft() + dx),
        (cx, cy) => {
          if (this.cellSelectionEngine.isSelecting) {
            const el = document.elementFromPoint(cx, cy);
            const cellEl = el?.closest("[data-row-index][data-col-index]");
            if (!cellEl || !cellEl.hasAttribute("data-col-id")) return;
            const ri = Number(cellEl.getAttribute("data-row-index"));
            const ci = Number(cellEl.getAttribute("data-col-index"));
            if (!isNaN(ri) && !isNaN(ci)) this.cellSelectionEngine.extendSelection(ri, ci);
          } else {
            this.cellSelectionEngine.updateFillPosition(cx, cy);
          }
        }
      );
      this.cellSelectionEngine.setFillDragScrollCallback((cx, cy) => this.autoScroller.updateMouse(cx, cy));
      this.cellSelectionEngine.setFillDragEndCallback(() => this.autoScroller?.stop());
      this.cellSelectionEngine.setDragViewportRectCallback(() => this.bodyWrapEl?.getBoundingClientRect() ?? null);
      bodyWrapEl.addEventListener("mousemove", (e) => {
        if (!this.cellSelectionEngine.isSelecting) return;
        if (e.buttons === 0) {
          this.cellSelectionEngine.endSelection();
          this.autoScroller?.stop();
          return;
        }
        this.autoScroller?.updateMouse(e.clientX, e.clientY);
        const cellEl = e.target.closest("[data-row-index][data-col-index]");
        if (!cellEl || !cellEl.hasAttribute("data-col-id")) return;
        const ri = Number(cellEl.getAttribute("data-row-index"));
        const ci = Number(cellEl.getAttribute("data-col-index"));
        if (!isNaN(ri) && !isNaN(ci)) this.cellSelectionEngine.extendSelection(ri, ci);
      });
      bodyWrapEl.addEventListener("mouseup", () => {
        this.cellSelectionEngine.endSelection();
        this.autoScroller?.stop();
      });
      const docMouseUp = () => {
        if (this.cellSelectionEngine.isSelecting) {
          this.cellSelectionEngine.endSelection();
        }
        this.autoScroller?.stop();
      };
      document.addEventListener("mouseup", docMouseUp);
      this.unsubscribers.push(() => document.removeEventListener("mouseup", docMouseUp));
    }
    // ─── Render ───────────────────────────────────────────────────────────────
    performRender() {
      const rows = this.store.get("visibleRows");
      const rawCols = this.store.get("columns");
      const groupedIds = this.store.get("groupedColumnIds");
      const loading = this.store.get("loading");
      const allColumns = rawCols.filter((c) => c.visible !== false);
      const leftCols = allColumns.filter((c) => c.pinned === "left");
      const centerCols = allColumns.filter((c) => c.pinned !== "left" && c.pinned !== "right");
      const rightCols = allColumns.filter((c) => c.pinned === "right");
      const rowHeight = this.options.rowHeight ?? 48;
      const w = this.wrapperEl;
      const colsChanged = rawCols !== this._lastColumnsRef;
      const groupingChanged = groupedIds !== this._lastGroupedIdsRef;
      const hasGroupedColumns = groupedIds.length > 0;
      const leafGroupColDef = hasGroupedColumns ? rawCols.find((c) => c.colId === groupedIds[groupedIds.length - 1]) ?? null : null;
      if (colsChanged || groupingChanged) {
        this._lastColumnsRef = rawCols;
        this._lastGroupedIdsRef = groupedIds;
        this.colStyles.initFromColumns(allColumns);
        const showCb = this.options.showCheckboxes ? CHECKBOX_COL_WIDTH : 0;
        const showSn = this.options.showSerialNumber ? SERIAL_COL_WIDTH : 0;
        const leftPinnedWidth = this.colStyles.getTotalWidth(leftCols.map((c) => c.colId));
        const rightContentWidth = this.colStyles.getTotalWidth(rightCols.map((c) => c.colId));
        const hasLeft = showCb > 0 || showSn > 0 || leftCols.length > 0;
        const hasRight = rightCols.length > 0;
        w.style.setProperty("--pg-left-panel-width", hasLeft ? `${showCb + showSn + leftPinnedWidth}px` : "0px");
        w.style.setProperty("--pg-right-panel-width", hasRight ? `${rightContentWidth}px` : "0px");
        const centerColIds = centerCols.map((c) => c.colId);
        if (this.colStyles.hasFlex(centerColIds)) {
          const centerPanelW = this.centerBodyEl?.clientWidth ?? 0;
          if (centerPanelW > 0) this.colStyles.resolveFlex(centerColIds, centerPanelW);
        }
        const centerContentWidth = this.colStyles.getTotalWidth(centerColIds) + (hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0);
        this._cachedCenterW = centerContentWidth;
        if (this.leftBodyPanelEl) {
          this.leftBodyPanelEl.style.setProperty("display", hasLeft ? "" : "none");
          if (this.leftHeaderPanelEl?.parentElement) {
            this.leftHeaderPanelEl.parentElement.style.setProperty("display", hasLeft ? "" : "none");
          }
        }
        if (this.rightBodyPanelEl) {
          this.rightBodyPanelEl.style.setProperty("display", hasRight ? "" : "none");
          if (this.rightHeaderPanelEl?.parentElement) {
            this.rightHeaderPanelEl.parentElement.style.setProperty("display", hasRight ? "" : "none");
          }
        }
        w.style.setProperty("--pg-center-content-width", `${centerContentWidth}px`);
      }
      const rowsChanged = rows !== this._lastRowsRef;
      if (rowsChanged) {
        this._lastRowsRef = rows;
        let totalHeight = 0;
        for (const row of rows) totalHeight += row.height ?? rowHeight;
        this._cachedTotalHeight = totalHeight;
        w.style.setProperty("--pg-content-height", `${totalHeight}px`);
        this.scrollController.updateSizes(totalHeight, this._cachedCenterW);
      } else if (colsChanged || groupingChanged) {
        this.scrollController.updateSizes(this._cachedTotalHeight, this._cachedCenterW);
      }
      if (loading) {
        this.overlayRenderer.showLoading(this.options.loadingOverlayText);
        return;
      }
      this.overlayRenderer.hideLoading();
      if (rows.length === 0) {
        this.overlayRenderer.showNoRows(this.options.noRowsOverlayHtml, this.options.noRowsOverlayText);
      } else {
        this.overlayRenderer.hideNoRows();
      }
      const scrollLeft = this.scrollController.getScrollLeft();
      const centerViewportW = this.centerBodyEl?.clientWidth ?? 800;
      let accumX = hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0;
      let visColStart = centerCols.length;
      let visColEnd = 0;
      for (let i = 0; i < centerCols.length; i++) {
        const cw = this.colStyles.getWidth(centerCols[i].colId);
        const colLeft = accumX;
        const colRight = accumX + cw;
        if (colRight > scrollLeft && visColStart > i) visColStart = i;
        if (colLeft < scrollLeft + centerViewportW) visColEnd = i + 1;
        accumX += cw;
      }
      if (visColStart === centerCols.length) {
        visColStart = 0;
        visColEnd = 0;
      }
      const isDraggingCol = this.headerRenderer.isDraggingCol;
      const isDraggingGroup = this.displayGroupEngine?.isDraggingGroup ?? false;
      const colBuf = isDraggingCol || isDraggingGroup ? centerCols.length : COL_BUFFER;
      const colStart = Math.max(0, visColStart - colBuf);
      const colEnd = Math.min(centerCols.length, visColEnd + colBuf);
      const leftSpacerW = this.colStyles.getTotalWidth(centerCols.slice(0, colStart).map((c) => c.colId));
      const rightSpacerW = this.colStyles.getTotalWidth(centerCols.slice(colEnd).map((c) => c.colId));
      const visibleCenterCols = centerCols.slice(colStart, colEnd);
      const headerOptions = {
        showCheckboxes: this.options.showCheckboxes,
        showSerialNumber: this.options.showSerialNumber,
        showColumnMenu: this.options.showColumnMenu !== false,
        showFilterRow: this.options.showFilterRow,
        headerRowHeight: this.options.headerRowHeight,
        filterRowHeight: this.options.filterRowHeight,
        hasGroupedColumns,
        autoGroupColWidth: AUTO_GROUP_COL_WIDTH
      };
      if (!this.headerRendered && this.leftHeaderPanelEl && this.centerHeaderInnerEl && this.rightHeaderPanelEl) {
        this.headerRenderer.renderInPanels(
          this.leftHeaderPanelEl,
          this.centerHeaderInnerEl,
          this.rightHeaderPanelEl,
          allColumns,
          headerOptions
        );
        this.headerRendered = true;
      }
      if (colStart !== this.lastCenterColStart || colEnd !== this.lastCenterColEnd) {
        this.headerRenderer.updateCenterVisibleCols(visibleCenterCols, leftSpacerW, rightSpacerW, headerOptions);
        this.lastCenterColStart = colStart;
        this.lastCenterColEnd = colEnd;
      }
      const scrollTop = this.scrollController.getScrollTop();
      const viewportHeight = this.centerBodyEl?.clientHeight ?? 400;
      const buffer = this.options.virtualScroll?.rowBuffer ?? ROW_BUFFER;
      const animExtra = this.rowAnimator.hasPending() ? Math.ceil(viewportHeight / rowHeight) : 0;
      const isAutoHeight = this.options.rowHeightMode === "auto";
      let start;
      let end;
      if (isAutoHeight) {
        const bufferPx = (buffer + animExtra) * rowHeight;
        const viewStart = scrollTop - bufferPx;
        const viewEnd = scrollTop + viewportHeight + bufferPx;
        start = 0;
        end = rows.length;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].top + (rows[i].height ?? rowHeight) >= viewStart) {
            start = i;
            break;
          }
        }
        for (let i = start; i < rows.length; i++) {
          if (rows[i].top > viewEnd) {
            end = i;
            break;
          }
        }
      } else {
        start = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer - animExtra);
        end = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer + animExtra);
      }
      this.rowPositionSheet.update(
        rows.slice(start, end).map((row) => ({
          nodeId: row.nodeId,
          top: row.top,
          height: isAutoHeight ? rowHeight : row.height ?? rowHeight
        })),
        isAutoHeight
      );
      const renderedRows = rows.slice(start, end);
      if (this.headerRenderer.isResizingColumn) {
        this.bodyRenderer.syncCenterRange(colStart, colStart + visibleCenterCols.length);
      } else {
        this.bodyRenderer.renderRows(renderedRows, leftCols, visibleCenterCols, rightCols, {
          showCheckboxes: this.options.showCheckboxes,
          showSerialNumber: this.options.showSerialNumber,
          showVerticalBorders: this.options.showVerticalBorders,
          rowShading: this.options.rowShading,
          rowHeight: this.options.rowHeight,
          dateFormat: this.options.dateFormat,
          timeZone: this.options.timeZone,
          currencySymbol: this.options.currencySymbol,
          locale: this.options.locale,
          api: null,
          showGroupsColumn: hasGroupedColumns,
          autoGroupColWidth: AUTO_GROUP_COL_WIDTH,
          leafGroupColDef,
          centerColStart: colStart,
          centerLeftSpacerW: leftSpacerW,
          centerRightSpacerW: rightSpacerW,
          totalCenterCols: centerCols.length
        });
      }
      if (this.rowAnimator.hasPending()) {
        const animContainers = [
          this.leftBodyContentEl,
          this.centerBodyContentEl,
          this.rightBodyContentEl
        ].filter(Boolean);
        this.rowAnimator.animate(animContainers, renderedRows, viewportHeight);
      }
      if (isAutoHeight) {
        const nodeIdToRow = new Map(renderedRows.map((r) => [r.nodeId, r]));
        const measured = /* @__PURE__ */ new Map();
        for (const panel of [this.leftBodyContentEl, this.centerBodyContentEl, this.rightBodyContentEl]) {
          if (!panel) continue;
          for (const el of panel.querySelectorAll("[data-node-id]")) {
            const nodeId = el.getAttribute("data-node-id");
            if (!nodeId) continue;
            const h = el.offsetHeight;
            if (h > 0) measured.set(nodeId, Math.max(measured.get(nodeId) ?? 0, h));
          }
        }
        let anyChanged = false;
        for (const [nodeId, h] of measured) {
          const row = nodeIdToRow.get(nodeId);
          if (row && h !== row.height) {
            row.height = h;
            anyChanged = true;
          }
        }
        if (anyChanged) {
          let top = 0;
          for (const row of rows) {
            row.top = top;
            top += row.height ?? rowHeight;
          }
          this.rowPositionSheet.update(
            renderedRows.map((r) => ({ nodeId: r.nodeId, top: r.top, height: rowHeight })),
            true
          );
          this._cachedTotalHeight = top;
          w.style.setProperty("--pg-content-height", `${top}px`);
          this.scrollController.updateSizes(top, this._cachedCenterW);
        }
      }
      this.store.set("firstRenderedRowIndex", start);
      this.store.set("lastRenderedRowIndex", end);
      if (this.footerContainerEl) {
        if (!this.footerContainerEl.hasChildNodes()) {
          this.footerRenderer.render(this.footerContainerEl, {
            showPagination: this.options.pagination?.enabled,
            showRowCount: true,
            footerHeight: this.options.footerRowHeight
          });
        } else {
          this.footerRenderer.updatePaginationState();
        }
      }
      const hasSelection = this.store.get("cellRanges").length > 0 || this.store.get("activeCell") !== null;
      if (hasSelection) {
        this.cellSelectionEngine.applySelectionClasses();
      }
      this.eventBus.emit(GridEventType.ROWS_RENDERED, { renderedCount: renderedRows.length });
    }
    // ─── Store subscriptions ──────────────────────────────────────────────────
    subscribeToStore() {
      this.unsubscribers.push(
        this.store.watch("visibleRows", () => this.scheduleRender()),
        this.store.watch("loading", () => this.scheduleRender()),
        this.store.watch("columns", () => {
          if (this.headerRenderer.isDraggingCol || this.displayGroupEngine?.isDraggingGroup) {
            this.wrapperEl?.classList.add("pg-grid--drag-preview-sync");
            this.lastCenterColStart = -1;
            this.lastCenterColEnd = -1;
            this.bodyRenderer.clear();
            this.scheduleRender();
            requestAnimationFrame(() => {
              this.wrapperEl?.classList.remove("pg-grid--drag-preview-sync");
            });
            return;
          }
          this.headerRendered = false;
          this.lastCenterColStart = -1;
          this.lastCenterColEnd = -1;
          if (this.leftHeaderPanelEl) this.leftHeaderPanelEl.innerHTML = "";
          if (this.centerHeaderInnerEl) this.centerHeaderInnerEl.innerHTML = "";
          if (this.rightHeaderPanelEl) this.rightHeaderPanelEl.innerHTML = "";
          this.headerRenderer.destroy();
          this.rewireGroupModelIntoHeaderRenderer();
          this.bodyRenderer.clear();
          this.scheduleRender();
        }),
        this.store.watch("groupedColumnIds", () => {
          this.groupDropZone?.update();
        }),
        this.store.watch("filterModel", (model) => {
          const activeColIds = new Set(Object.keys(model));
          this.headerRenderer.updateFilterIndicators(activeColIds);
        }),
        this.store.watch("scrollTop", () => this.scheduleRender()),
        this.store.watch("selectedRowIds", (ids) => {
          const rows = this.store.get("visibleRows");
          for (const row of rows) {
            this.bodyRenderer.updateRowSelection(row.nodeId, ids.has(row.nodeId));
          }
        }),
        this.store.watch("isAllSelected", (isAll) => {
          const isInd = this.store.get("isIndeterminate");
          this.headerRenderer.updateAllChecked(isAll, isInd);
        }),
        this.store.watch("cellRanges", () => {
          this.cellSelectionEngine.applySelectionClasses();
        }),
        this.store.watch("activeCell", () => {
          this.cellSelectionEngine.applySelectionClasses();
        })
      );
      this.eventBus.on(GridEventType.ALL_ROWS_SELECTED, (payload) => {
        const p = payload;
        if (p?.action === "selectAll") {
          this.rowSelectionEngine.selectAll(this.store.get("allRows"));
        } else if (p?.action === "deselectAll") {
          this.rowSelectionEngine.deselectAll(this.store.get("allRows"));
        }
      });
      this.eventBus.on(GridEventType.CELL_CLICKED, (payload) => {
        const p = payload;
        if (p.event.shiftKey) {
          this.cellSelectionEngine.extendSelection(p.rowIndex, p.colIndex);
        } else if (p.event.ctrlKey || p.event.metaKey) {
          this.cellSelectionEngine.addRangeCell(p.rowIndex, p.colIndex);
        } else {
          this.cellSelectionEngine.startSelection(p.rowIndex, p.colIndex);
        }
      });
      this.eventBus.on(GridEventType.CELL_CONTEXT_MENU, (payload) => {
        const p = payload;
        if (!this.cellSelectionEngine.isCellSelected(p.rowIndex, p.colIndex)) {
          this.cellSelectionEngine.startSelection(p.rowIndex, p.colIndex);
        }
        this.cellSelectionEngine.showContextMenu(p.x, p.y);
      });
    }
    // ── Column-group handlers ─────────────────────────────────────────────────
    /**
     * Called when the user clicks a group collapse/expand toggle.
     *
     * When **collapsing**: hides all leaf columns except the first one (the "peek"
     * column) so the group header continues to show meaningful data.
     * When **expanding**: restores all leaf columns to visible.
     *
     * `setColumnVisible` fires `COLUMNS_STATE_CHANGED` → full rebuild.
     */
    handleGroupToggle(groupId) {
      if (this.displayGroupEngine) {
        this.displayGroupEngine.toggleGroup(groupId);
        return;
      }
      if (!this.columnGroupModel) return;
      const group = this.columnGroupModel.getGroup(groupId);
      if (!group) return;
      const wasCollapsed = group.collapsed;
      this.columnGroupModel.toggleGroup(groupId);
      const isNowCollapsed = !wasCollapsed;
      const leaves = this.columnGroupModel.getLeavesInGroup(groupId);
      for (let i = 0; i < leaves.length; i++) {
        const visible = !isNowCollapsed || i === 0;
        this.columnModel.setColumnVisible(leaves[i].colId, visible);
      }
    }
    /**
     * Called when the user drags a group resize handle.
     * Distributes the new width proportionally among all visible leaf columns.
     */
    handleGroupResize(groupId, newWidth) {
      if (this.displayGroupEngine) {
        this.displayGroupEngine.resizeGroup(groupId, newWidth);
        this.scheduleRender();
        return;
      }
      if (!this.columnGroupModel) return;
      const group = this.columnGroupModel.getGroup(groupId);
      if (!group) return;
      const currentWidth = this.columnGroupModel.computeGroupWidth(groupId, this.colStyles);
      if (currentWidth <= 0 || Math.abs(newWidth - currentWidth) < 1) return;
      const ratio = newWidth / currentWidth;
      const leaves = this.columnGroupModel.getLeavesInGroup(groupId);
      for (const leaf of leaves) {
        const oldW = this.colStyles.getWidth(leaf.colId);
        const newW = Math.max(leaf.minWidth ?? 40, Math.round(oldW * ratio));
        this.colStyles.setWidth(leaf.colId, newW);
        this.columnModel.setColumnWidth(leaf.colId, newW, false);
      }
      this.scheduleRender();
    }
    /**
     * Re-wires column-group references back into `HeaderRenderer` after
     * `headerRenderer.destroy()` has cleared them.
     */
    rewireGroupModelIntoHeaderRenderer() {
      if (this.displayGroupEngine) {
        this.headerRenderer.setDisplayGroupEngine(this.displayGroupEngine);
        this.headerRenderer.setGroupToggleCallback((gid) => this.handleGroupToggle(gid));
        this.headerRenderer.setGroupResizeCallback((gid, w) => this.handleGroupResize(gid, w));
        return;
      }
      if (!this.columnGroupModel || !this.groupHeaderBuilder) return;
      this.headerRenderer.setColumnGroupModel(this.columnGroupModel, this.groupHeaderBuilder);
      this.headerRenderer.setGroupToggleCallback((gid) => this.handleGroupToggle(gid));
      this.headerRenderer.setGroupResizeCallback((gid, w) => this.handleGroupResize(gid, w));
      if (this.groupDragHandler) {
        this.groupHeaderBuilder.setDragConfig(this.groupDragHandler, () => this.wrapperEl);
        this.headerRenderer.setGroupDragHandler(this.groupDragHandler);
      }
    }
    /**
     * Full header rebuild — clears inner HTML and resets the rendered flag so
     * the next `performRender` call re-runs `renderInPanels` with the current
     * group model state.
     */
    rebuildHeader() {
      this.headerRendered = false;
      this.lastCenterColStart = -1;
      this.lastCenterColEnd = -1;
      if (this.leftHeaderPanelEl) this.leftHeaderPanelEl.innerHTML = "";
      if (this.centerHeaderInnerEl) this.centerHeaderInnerEl.innerHTML = "";
      if (this.rightHeaderPanelEl) this.rightHeaderPanelEl.innerHTML = "";
      this.headerRenderer.destroy();
      this.rewireGroupModelIntoHeaderRenderer();
      this.scheduleRender();
    }
    generateId() {
      return `pg_${Math.random().toString(36).slice(2, 9)}`;
    }
  };

  // src/column-groups/column-group-state-manager.ts
  var ColumnGroupStateManager = class {
    constructor(columnModel, groupModel) {
      this.columnModel = columnModel;
      this.groupModel = groupModel;
    }
    // ── Snapshot ──────────────────────────────────────────────────────────────
    /**
     * Capture the full current state of the column-group system.
     *
     * The returned object is a plain serializable value — safe to pass to
     * `JSON.stringify`.  No DOM references or class instances are included.
     *
     * @returns A {@link ColumnGroupSystemState} snapshot.
     */
    getState() {
      return {
        groups: this.groupModel.serialize(),
        columnStates: this.columnModel.getColumnStates()
      };
    }
    // ── Restore ───────────────────────────────────────────────────────────────
    /**
     * Apply a previously captured state snapshot.
     *
     * Both `groups` and `columnStates` are optional — omit a key to skip
     * restoring that slice of state.
     *
     * @param state - Partial or full {@link ColumnGroupSystemState}.
     */
    applyState(state) {
      if (state.groups !== void 0) {
        this.groupModel.deserialize(state.groups);
      }
      if (state.columnStates !== void 0) {
        this.columnModel.applyColumnStates(state.columnStates);
      }
    }
    // ── Diff ──────────────────────────────────────────────────────────────────
    /**
     * Compare two state snapshots and report which dimensions changed.
     *
     * Useful for deciding whether a full re-render is necessary or whether
     * a lighter-weight update (e.g. width-only CSS update) suffices.
     *
     * @param prev - Previous state snapshot.
     * @param next - New state snapshot.
     * @returns A {@link ColumnGroupStateDiff} describing which parts changed.
     */
    diffState(prev, next) {
      const widthChanged = this.colStatesWidthChanged(prev.columnStates, next.columnStates);
      const visibilityChanged = this.colStatesVisibilityChanged(prev.columnStates, next.columnStates);
      const pinChanged = this.colStatesPinChanged(prev.columnStates, next.columnStates);
      const orderChanged = this.colStatesOrderChanged(prev.columnStates, next.columnStates);
      const groupStateChanged = this.groupStatesChanged(prev.groups, next.groups);
      return {
        widthChanged,
        visibilityChanged,
        pinChanged,
        orderChanged,
        groupStateChanged,
        anyChanged: widthChanged || visibilityChanged || pinChanged || orderChanged || groupStateChanged
      };
    }
    // ── Group-only helpers ────────────────────────────────────────────────────
    /**
     * Return the serialized collapse/expand state for all groups.
     * Shorthand for `getState().groups`.
     */
    getGroupStates() {
      return this.groupModel.serialize();
    }
    /**
     * Apply only the group collapse/expand states without touching leaf columns.
     *
     * @param groups - Array of {@link ColumnGroupSerialState} objects.
     */
    applyGroupStates(groups) {
      this.groupModel.deserialize(groups);
    }
    // ── Column-only helpers ───────────────────────────────────────────────────
    /**
     * Return the serialized state for all leaf columns.
     * Shorthand for `getState().columnStates`.
     */
    getColumnStates() {
      return this.columnModel.getColumnStates();
    }
    /**
     * Apply only the leaf-column states without touching group collapse state.
     *
     * @param states - Array of {@link ColumnState} objects.
     */
    applyColumnStates(states) {
      this.columnModel.applyColumnStates(states);
    }
    // ── Private diff helpers ──────────────────────────────────────────────────
    colStatesWidthChanged(a, b) {
      if (a.length !== b.length) return true;
      return a.some((s, i) => s.width !== b[i]?.width);
    }
    colStatesVisibilityChanged(a, b) {
      if (a.length !== b.length) return true;
      return a.some((s, i) => s.visible !== b[i]?.visible);
    }
    colStatesPinChanged(a, b) {
      if (a.length !== b.length) return true;
      return a.some((s, i) => s.pinned !== b[i]?.pinned);
    }
    colStatesOrderChanged(a, b) {
      if (a.length !== b.length) return true;
      return a.some((s, i) => s.colId !== b[i]?.colId);
    }
    groupStatesChanged(a, b) {
      if (a.length !== b.length) return true;
      const mapB = new Map(b.map((s) => [s.groupId, s.collapsed]));
      return a.some((s) => {
        const collapsedB = mapB.get(s.groupId);
        return collapsedB === void 0 || collapsedB !== s.collapsed;
      });
    }
  };

  // src/core/grid-api.ts
  var GridApi = class {
    constructor(ctx) {
      this.ctx = ctx;
      this._columnGroupModel = null;
      this._groupStateManager = null;
      this.ctx.renderer.setFilterEngine(this.ctx.filterEngine);
      this.ctx.renderer.setFilterRefreshCallback(() => this.refresh());
    }
    /**
     * Wire the live {@link ColumnGroupModel} into the API.
     * Called by {@link GridCore} after `buildContext` when column groups are present.
     *
     * @param model - The live group tree model.
     */
    setColumnGroupModel(model) {
      this._columnGroupModel = model;
      this._groupStateManager = new ColumnGroupStateManager(this.ctx.columnModel, model);
    }
    // ──────────────────── Data ────────────────────
    setData(data) {
      const rowHeight = this.ctx.options.rowHeight ?? 48;
      this.ctx.rowModel.setRowData(data, rowHeight);
      this.ctx.undoRedoEngine.clear();
      this.refresh();
    }
    appendData(data) {
      this.ctx.rowModel.appendRowData(data);
      this.refresh();
    }
    updateRow(nodeId, data) {
      this.ctx.rowModel.updateRow(nodeId, data);
      this.refresh();
    }
    removeRows(nodeIds) {
      this.ctx.rowModel.removeRows(nodeIds);
      this.refresh();
    }
    getRowNode(nodeId) {
      return this.ctx.rowModel.getRowNode(nodeId);
    }
    getRowByIndex(index) {
      return this.ctx.rowModel.getRowByIndex(index);
    }
    getAllRows() {
      return this.ctx.store.get("allRows");
    }
    getVisibleRows() {
      return this.ctx.store.get("visibleRows");
    }
    // ──────────────────── Columns ────────────────────
    setColumns(defs) {
      this.ctx.columnModel.initColumns(defs);
      this.refresh();
    }
    getColumn(colId) {
      return this.ctx.columnModel.getColumn(colId);
    }
    getAllColumns() {
      return this.ctx.columnModel.getAllColumns();
    }
    getVisibleColumns() {
      return this.ctx.columnModel.getVisibleColumns();
    }
    setColumnWidth(colId, width) {
      this.ctx.columnModel.setColumnWidth(colId, width, true);
    }
    setColumnVisible(colId, visible) {
      this.ctx.columnModel.setColumnVisible(colId, visible);
    }
    setColumnPin(colId, pinned) {
      this.ctx.columnModel.setColumnPin(colId, pinned);
    }
    moveColumn(fromIndex, toIndex) {
      this.ctx.columnModel.moveColumn(fromIndex, toIndex);
    }
    autoSizeColumn(colId) {
      this.ctx.columnModel.autoSizeColumn(colId, this.ctx.containerEl);
    }
    autoSizeAllColumns() {
      for (const col of this.ctx.columnModel.getVisibleColumns()) {
        this.ctx.columnModel.autoSizeColumn(col.colId, this.ctx.containerEl);
      }
    }
    getColumnStates() {
      return this.ctx.columnModel.getColumnStates();
    }
    applyColumnStates(states) {
      this.ctx.columnModel.applyColumnStates(states);
    }
    // ──────────────────── Sort ────────────────────
    sortColumn(colId, order) {
      const col = this.ctx.columnModel.getColumn(colId);
      if (!col) return;
      this.ctx.sortEngine.sort(colId, col.field, order);
      this.refresh();
    }
    clearSort() {
      this.ctx.sortEngine.clearSort();
      this.refresh();
    }
    getSortConfig() {
      return this.ctx.sortEngine.getSortConfig();
    }
    // ──────────────────── Filter ────────────────────
    setFilterModel(model) {
      this.ctx.filterEngine.setFilterModel(model);
      this.refresh();
    }
    setColumnFilter(colId, filter) {
      this.ctx.filterEngine.setColumnFilter(colId, filter);
      this.refresh();
    }
    clearAllFilters() {
      this.ctx.filterEngine.clearAllFilters();
      this.refresh();
    }
    setQuickFilter(term, fields) {
      const currentRows = this.ctx.store.get("visibleRows");
      if (currentRows.length > 0) this.ctx.renderer.captureRowAnimation(currentRows, "filter");
      this.ctx.filterEngine.setQuickFilter({ term, fields });
      this.refresh();
    }
    getFilterModel() {
      return this.ctx.filterEngine.getFilterModel();
    }
    // ──────────────────── Selection ────────────────────
    selectRow(nodeId) {
      const rows = this.ctx.store.get("visibleRows");
      this.ctx.rowSelectionEngine.selectRow(nodeId, rows);
    }
    deselectRow(nodeId) {
      const rows = this.ctx.store.get("visibleRows");
      this.ctx.rowSelectionEngine.deselectRow(nodeId, rows);
    }
    selectAll() {
      const rows = this.ctx.store.get("visibleRows");
      this.ctx.rowSelectionEngine.selectAll(rows);
    }
    deselectAll() {
      const rows = this.ctx.store.get("visibleRows");
      this.ctx.rowSelectionEngine.deselectAll(rows);
    }
    getSelectedRows() {
      const rows = this.ctx.store.get("visibleRows");
      return this.ctx.rowSelectionEngine.getSelectedRows(rows);
    }
    getSelectedCount() {
      return this.ctx.rowSelectionEngine.getSelectedCount();
    }
    isRowSelected(nodeId) {
      return this.ctx.rowSelectionEngine.isRowSelected(nodeId);
    }
    // ──────────────────── Cell Selection ────────────────────
    setCellRange(range) {
      this.ctx.store.set("cellRanges", [range]);
      this.ctx.cellSelectionEngine.startSelection(range.startRowIndex, range.startColIndex);
      this.ctx.cellSelectionEngine.extendSelection(range.endRowIndex, range.endColIndex);
    }
    clearCellSelection() {
      this.ctx.cellSelectionEngine.clearSelection();
    }
    getCellRanges() {
      return this.ctx.store.get("cellRanges");
    }
    // ──────────────────── Editing ────────────────────
    startCellEditing(rowNodeId, colId) {
      const row = this.ctx.rowModel.getRowNode(rowNodeId);
      const col = this.ctx.columnModel.getColumn(colId);
      if (!row || !col) return;
      const cellEl = this.ctx.containerEl.querySelector(
        `[data-node-id="${rowNodeId}"] [data-col-id="${colId}"]`
      );
      if (cellEl) this.ctx.cellEditorEngine.startEditing(row, col, cellEl);
    }
    stopEditing(cancel = false) {
      this.ctx.cellEditorEngine.stopEditing(cancel);
    }
    // ──────────────────── Pagination ────────────────────
    goToPage(page) {
      this.ctx.paginationEngine.goToPage(page);
      this.refresh();
    }
    setPageSize(size) {
      this.ctx.paginationEngine.setPageSize(size);
      this.refresh();
    }
    getCurrentPage() {
      return this.ctx.paginationEngine.getCurrentPage();
    }
    getTotalPages() {
      return this.ctx.paginationEngine.getTotalPages();
    }
    // ──────────────────── Grouping ────────────────────
    groupByColumn(colId) {
      this.ctx.groupingEngine.addGroupColumn(colId);
      this.refresh();
    }
    removeGroupColumn(colId) {
      this.ctx.groupingEngine.removeGroupColumn(colId);
      this.refresh();
    }
    clearGrouping() {
      this.ctx.groupingEngine.clearGrouping();
      this.refresh();
    }
    expandGroup(groupKey) {
      this.ctx.groupingEngine.expandGroup(groupKey);
      this.refresh();
    }
    collapseGroup(groupKey) {
      this.ctx.groupingEngine.collapseGroup(groupKey);
      this.refresh();
    }
    expandAllGroups() {
      this.ctx.groupingEngine.expandAllGroups(this.ctx.store.get("visibleRows"));
      this.refresh();
    }
    collapseAllGroups() {
      this.ctx.groupingEngine.collapseAllGroups();
      this.refresh();
    }
    // ──────────────────── Column Groups ────────────────────
    /**
     * Collapse a column header group, hiding all its leaf columns.
     *
     * @param groupId - The `groupId` of the group to collapse.
     */
    collapseColumnGroup(groupId) {
      if (!this._columnGroupModel) return;
      this._columnGroupModel.collapseGroup(groupId);
      const leaves = this._columnGroupModel.getLeavesInGroup(groupId);
      for (const leaf of leaves) this.ctx.columnModel.setColumnVisible(leaf.colId, false);
    }
    /**
     * Expand a column header group, showing all its leaf columns.
     *
     * @param groupId - The `groupId` of the group to expand.
     */
    expandColumnGroup(groupId) {
      if (!this._columnGroupModel) return;
      this._columnGroupModel.expandGroup(groupId);
      const leaves = this._columnGroupModel.getLeavesInGroup(groupId);
      for (const leaf of leaves) this.ctx.columnModel.setColumnVisible(leaf.colId, true);
    }
    /**
     * Toggle a column header group between collapsed and expanded.
     *
     * @param groupId - The `groupId` of the group to toggle.
     */
    toggleColumnGroup(groupId) {
      if (!this._columnGroupModel) return;
      const group = this._columnGroupModel.getGroup(groupId);
      if (!group) return;
      if (group.collapsed) this.expandColumnGroup(groupId);
      else this.collapseColumnGroup(groupId);
    }
    /**
     * Move an entire column group to a new position in the tree.
     *
     * @param groupId        - ID of the group to move.
     * @param newParentId    - Target parent group ID, or `null` for root level.
     * @param insertBeforeId - Sibling ID to insert before, or `null` to append.
     */
    moveColumnGroup(groupId, newParentId, insertBeforeId) {
      if (!this._columnGroupModel) return;
      this._columnGroupModel.moveGroup(groupId, newParentId, insertBeforeId);
      this.refresh();
    }
    /**
     * Serialize the complete column-group system state (groups + leaf columns).
     *
     * @returns A {@link ColumnGroupSystemState} snapshot safe for `JSON.stringify`.
     */
    getColumnGroupState() {
      return this._groupStateManager?.getState() ?? null;
    }
    /**
     * Restore a previously serialized column-group system state.
     *
     * @param state - Partial or full {@link ColumnGroupSystemState}.
     */
    applyColumnGroupState(state) {
      if (!this._groupStateManager) return;
      this._groupStateManager.applyState(state);
      this.refresh();
    }
    /**
     * Return the serialized expand/collapse states for all groups.
     */
    getColumnGroupStates() {
      return this._groupStateManager?.getGroupStates() ?? [];
    }
    /**
     * Return the root nodes of the column tree (groups and leaves at the top level).
     * Returns `null` when no column groups are configured.
     */
    getColumnTree() {
      return this._columnGroupModel?.getRootNodes() ?? null;
    }
    // ──────────────────── Export ────────────────────
    exportCsv(fileName) {
      this.ctx.exportEngine.exportToCsv(
        this.ctx.store.get("visibleRows"),
        this.ctx.columnModel.getVisibleColumns(),
        { fileName: fileName ?? this.ctx.options.exportConfig?.fileName ?? "export" }
      );
    }
    exportXlsx(fileName) {
      this.ctx.exportEngine.exportToXlsx(
        this.ctx.store.get("visibleRows"),
        this.ctx.columnModel.getVisibleColumns(),
        { fileName: fileName ?? this.ctx.options.exportConfig?.fileName ?? "export" }
      );
    }
    // ──────────────────── Clipboard ────────────────────
    copySelectedRowsToClipboard() {
      const rows = this.getSelectedRows();
      const cols = this.ctx.columnModel.getVisibleColumns();
      return this.ctx.clipboardEngine.copyRowsToClipboard(rows, cols);
    }
    // ──────────────────── Scroll ────────────────────
    scrollToRow(rowIndex) {
      this.ctx.renderer.scrollToRow(rowIndex);
    }
    scrollToTop() {
      this.ctx.renderer.scrollToTop();
    }
    // ──────────────────── Theme ────────────────────
    setTheme(nameOrTheme) {
      this.ctx.themeManager.applyTheme(nameOrTheme, this.ctx.containerEl);
    }
    toggleDarkMode() {
      this.ctx.themeManager.toggleDarkMode();
    }
    // ──────────────────── Full Screen ────────────────────
    enterFullScreen() {
      this.ctx.renderer.enterFullScreen();
    }
    exitFullScreen() {
      this.ctx.renderer.exitFullScreen();
    }
    // ──────────────────── Charts ────────────────────
    createChart(parentEl, config) {
      const rows = this.ctx.store.get("visibleRows");
      const cols = this.ctx.columnModel.getVisibleColumns();
      return this.ctx.chartEngine.createChart(parentEl, config, rows, cols);
    }
    destroyChart(chartId) {
      this.ctx.chartEngine.destroyChart(chartId);
    }
    exportChartAsImage(chartId, format = "png") {
      return this.ctx.chartEngine.exportChartAsImage(chartId, format);
    }
    // ──────────────────── State ────────────────────
    getGridState() {
      return {
        columnStates: this.ctx.columnModel.getColumnStates(),
        sortConfig: this.ctx.sortEngine.getSortConfig(),
        filterModel: this.ctx.filterEngine.getFilterModel(),
        paginationPage: this.ctx.paginationEngine.getCurrentPage(),
        paginationPageSize: this.ctx.paginationEngine.getPageSize(),
        groupedColumns: this.ctx.store.get("groupedColumnIds"),
        expandedGroups: Array.from(this.ctx.store.get("expandedGroupKeys")),
        selectedRowIds: Array.from(this.ctx.store.get("selectedRowIds"))
      };
    }
    applyGridState(state) {
      if (state.columnStates) this.applyColumnStates(state.columnStates);
      if (state.sortConfig?.length) this.ctx.sortEngine.multiSort(state.sortConfig);
      if (state.filterModel) this.ctx.filterEngine.setFilterModel(state.filterModel);
      if (state.paginationPage) this.ctx.paginationEngine.goToPage(state.paginationPage);
      if (state.paginationPageSize) this.ctx.paginationEngine.setPageSize(state.paginationPageSize);
      this.refresh();
    }
    // ──────────────────── Events ────────────────────
    on(event, handler) {
      return this.ctx.eventBus.on(event, handler);
    }
    off(event, handler) {
      this.ctx.eventBus.off(event, handler);
    }
    // ──────────────────── Summary ────────────────────
    getSummaryRow() {
      const rows = this.ctx.store.get("visibleRows");
      const cols = this.ctx.columnModel.getVisibleColumns();
      return this.ctx.summaryEngine.compute(rows, cols);
    }
    // ──────────────────── Lifecycle ────────────────────
    refresh() {
      this.applyPipeline();
      this.ctx.renderer.scheduleRender();
    }
    forceRefresh() {
      this.applyPipeline();
      this.ctx.renderer.forceRender();
    }
    destroy() {
      this.ctx.renderer.destroy();
      this.ctx.chartEngine.destroyAll();
      this.ctx.cellSelectionEngine.detach();
      this.ctx.dragDropEngine.destroy();
      this.ctx.themeManager.destroy();
      this.ctx.eventBus.clear();
      this.ctx.store.destroy();
    }
    applyPipeline() {
      let rows = this.ctx.store.get("allRows");
      const columns = this.ctx.columnModel.getAllColumns();
      rows = this.ctx.filterEngine.applyFilters(rows, columns);
      rows = this.ctx.sortEngine.applySorting(rows, columns);
      const groupColIds = this.ctx.store.get("groupedColumnIds");
      if (groupColIds.length > 0) {
        rows = this.ctx.groupingEngine.groupByColumns(groupColIds, columns, rows);
      }
      rows = this.ctx.paginationEngine.applyPagination(rows);
      this.ctx.rowModel.setVisibleRows(rows);
      this.ctx.store.set("visibleRows", rows);
    }
  };

  // src/engines/undo-redo/undo-redo-engine.ts
  var DEFAULT_MAX_STACK_SIZE = 200;
  var UndoRedoEngine = class {
    /**
     * @param maxStackSize - Upper bound for each stack (default: 200).
     */
    constructor(maxStackSize = DEFAULT_MAX_STACK_SIZE) {
      this.undoStack = [];
      this.redoStack = [];
      this.maxStackSize = maxStackSize;
    }
    // ── Public API ─────────────────────────────────────────────────────────────
    /** `true` when there is at least one action that can be undone. */
    get canUndo() {
      return this.undoStack.length > 0;
    }
    /** `true` when there is at least one action that can be redone. */
    get canRedo() {
      return this.redoStack.length > 0;
    }
    /**
     * Records a new action onto the undo stack.
     *
     * ### Deduplication rules (applied in order)
     * 1. **No-op filter** — individual changes where `oldValue === newValue`
     *    (via `Object.is`) are stripped.  If all changes are no-ops, the entire
     *    action is silently discarded (e.g. cutting an already-null cell).
     * 2. **Exact duplicate** — if the incoming action is byte-for-byte identical
     *    to the current stack top it is discarded, preventing repeated identical
     *    operations from inflating the stack.
     * 3. **Edit squash** — when the new action is `'edit'` AND the stack top is
     *    also `'edit'` on the **same single cell** (`nodeId` + `field` match),
     *    the top entry's `newValue` is updated in-place.  This collapses a rapid
     *    sequence of edits into one undo step while preserving the original
     *    `oldValue`, so Ctrl+Z always jumps back to the value before the first
     *    edit in the session.
     *
     * Recording always clears the redo stack (branching-history model).
     *
     * @param action - The action to record.
     */
    record(action) {
      const meaningful = action.changes.filter(
        (c) => !Object.is(c.oldValue, c.newValue)
      );
      if (meaningful.length === 0) return;
      const normalised = { type: action.type, changes: meaningful };
      const top = this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null;
      if (top && this.actionsIdentical(top, normalised)) return;
      if (action.type === "edit" && top?.type === "edit" && meaningful.length === 1 && top.changes.length === 1 && top.changes[0].nodeId === meaningful[0].nodeId && top.changes[0].field === meaningful[0].field) {
        top.changes[0].newValue = meaningful[0].newValue;
        this.redoStack = [];
        return;
      }
      if (this.undoStack.length >= this.maxStackSize) {
        this.undoStack.shift();
      }
      this.undoStack.push(normalised);
      this.redoStack = [];
    }
    /**
     * Pops the most recent action off the undo stack and returns the **inverse**
     * changes that the caller must apply to restore the previous state.
     *
     * The popped action is pushed onto the redo stack so it can be re-applied.
     *
     * @returns Inverse `CellChange[]` to apply, or `null` if the stack is empty.
     */
    undo() {
      const action = this.undoStack.pop();
      if (!action) return null;
      if (this.redoStack.length >= this.maxStackSize) this.redoStack.shift();
      this.redoStack.push(action);
      return action.changes.map((c) => ({
        nodeId: c.nodeId,
        field: c.field,
        oldValue: c.newValue,
        // not used by the caller — kept for symmetry
        newValue: c.oldValue
        // caller writes this into row.data[field]
      }));
    }
    /**
     * Pops the most recently undone action off the redo stack and returns its
     * **forward** changes so the caller can re-apply them.
     *
     * The action is pushed back onto the undo stack.
     *
     * @returns Forward `CellChange[]` to apply, or `null` if the stack is empty.
     */
    redo() {
      const action = this.redoStack.pop();
      if (!action) return null;
      if (this.undoStack.length >= this.maxStackSize) this.undoStack.shift();
      this.undoStack.push(action);
      return action.changes;
    }
    /**
     * Empties both the undo and redo stacks.
     * Call when the underlying dataset is completely replaced (e.g. `api.setData`)
     * so stale history cannot corrupt the new data.
     */
    clear() {
      this.undoStack = [];
      this.redoStack = [];
    }
    // ── Private helpers ────────────────────────────────────────────────────────
    /**
     * Returns `true` when two actions are structurally identical:
     * same `type`, same number of changes, and every change has the same
     * `nodeId`, `field`, `oldValue`, and `newValue` (compared via `Object.is`).
     */
    actionsIdentical(a, b) {
      if (a.type !== b.type || a.changes.length !== b.changes.length) return false;
      for (let i = 0; i < a.changes.length; i++) {
        const ca = a.changes[i];
        const cb = b.changes[i];
        if (ca.nodeId !== cb.nodeId || ca.field !== cb.field || !Object.is(ca.oldValue, cb.oldValue) || !Object.is(ca.newValue, cb.newValue)) {
          return false;
        }
      }
      return true;
    }
  };

  // src/column-groups/logical-group-registry.ts
  var LogicalGroupRegistry = class {
    constructor() {
      /** Logical group ID → immutable group definition. */
      this._groups = /* @__PURE__ */ new Map();
      /**
       * Leaf column ID → ordered list of ancestor logical group IDs (root → parent).
       * Ungrouped (flat) columns are mapped to an empty array.
       */
      this._paths = /* @__PURE__ */ new Map();
      this._hasGroups = false;
    }
    // ── Public API ────────────────────────────────────────────────────────────
    /**
     * Parse a ColumnDef[] hierarchy and populate the registry.
     * Clears any previous state before re-parsing — safe to call multiple times.
     *
     * @param columns - Top-level column definitions, which may contain nested
     *   `.children` arrays representing column groups.
     */
    parse(columns) {
      this._groups.clear();
      this._paths.clear();
      this._hasGroups = false;
      this.walk(columns, []);
    }
    /**
     * `true` when any ColumnDef in the parsed hierarchy contained `.children`.
     * Used to decide whether group header rows should be rendered.
     */
    get hasGroups() {
      return this._hasGroups;
    }
    /** Read-only map from logical group ID to its immutable definition. */
    get groups() {
      return this._groups;
    }
    /** Read-only map from leaf `colId` to its group path. */
    get paths() {
      return this._paths;
    }
    /**
     * Returns the group path for a leaf column — an ordered list of ancestor
     * logical group IDs from root to immediate parent.
     * Returns an empty array for ungrouped (flat) columns.
     *
     * @param colId - Leaf column ID.
     */
    getPath(colId) {
      return this._paths.get(colId) ?? [];
    }
    /**
     * Returns the `LogicalGroupDef` for the given group ID, or `undefined` if
     * the ID is not registered (e.g., a leaf column ID was passed by mistake).
     *
     * @param groupId - Logical group ID (equals the originating ColumnDef.colId).
     */
    getGroup(groupId) {
      return this._groups.get(groupId);
    }
    /**
     * Returns all leaf column IDs whose group path **includes** the given
     * logical group ID at any depth.
     *
     * Used by the engine to collect all leaves of a group for drag/resize/collapse.
     *
     * @param logicalGroupId - Logical group ID to search for.
     */
    getLeavesForGroup(logicalGroupId) {
      const result = [];
      for (const [colId, path] of this._paths) {
        if (path.includes(logicalGroupId)) result.push(colId);
      }
      return result;
    }
    // ── Private ───────────────────────────────────────────────────────────────
    /**
     * Depth-first walk through the ColumnDef hierarchy.
     *
     * @param cols         - Column definitions at the current depth.
     * @param ancestorPath - Ordered ancestor group IDs from root to current depth.
     */
    walk(cols, ancestorPath) {
      for (const col of cols) {
        const children = col.children;
        if (Array.isArray(children) && children.length > 0) {
          this._hasGroups = true;
          const parentId = ancestorPath.length > 0 ? ancestorPath[ancestorPath.length - 1] : null;
          this._groups.set(col.colId, {
            id: col.colId,
            header: col.header ?? "",
            parentId,
            headerCssClass: col.headerCssClass,
            resizable: col.resizable,
            collapsedWidth: col.collapsedWidth ?? 36,
            marryChildren: col.marryChildren,
            headerRendererFn: col.groupHeaderRendererFn
          });
          this.walk(children, [...ancestorPath, col.colId]);
        } else {
          this._paths.set(col.colId, [...ancestorPath]);
        }
      }
    }
  };

  // src/column-groups/display-group-builder.ts
  var DisplayGroupBuilder = class {
    /**
     * Build the display header tree for a single panel's visible column list.
     *
     * @param columns       - Visible columns in display order (left to right).
     * @param registry      - Logical group registry supplying paths and definitions.
     * @param collapseState - Per-logical-group collapse flags (from the engine).
     * @param colStyles     - Column width resolver.
     * @returns A fully-computed `DisplayHeaderTree` ready for DOM building.
     */
    build(columns, registry, collapseState, colStyles) {
      const roots = [];
      const openStack = [];
      let cursor = 0;
      const closeDown = (targetDepth) => {
        while (openStack.length > targetDepth) {
          const closing = openStack.pop();
          closing.width = cursor - closing.left;
          const parent = openStack.length > 0 ? openStack[openStack.length - 1] : null;
          if (parent) {
            parent.children.push(closing);
          } else {
            roots.push(closing);
          }
        }
      };
      for (const col of columns) {
        if (col.visible === false) continue;
        const path = registry.getPath(col.colId);
        const colWidth = colStyles.getWidth(col.colId);
        const common = this.commonPrefixLen(openStack, path);
        closeDown(common);
        for (let d = common; d < path.length; d++) {
          const groupId = path[d];
          const def = registry.getGroup(groupId);
          const instanceId = `${groupId}:${col.colId}`;
          const node = {
            kind: "group",
            instanceId,
            logicalGroupId: groupId,
            header: def?.header ?? groupId,
            depth: d,
            children: [],
            left: cursor,
            width: 0,
            // finalised on close
            collapsed: collapseState.get(instanceId) ?? false,
            resizable: def?.resizable !== false,
            collapsedWidth: def?.collapsedWidth ?? 36,
            headerCssClass: def?.headerCssClass,
            headerRendererFn: def?.headerRendererFn
          };
          openStack.push(node);
        }
        const leaf = {
          kind: "leaf",
          colDef: col,
          groupPath: path,
          left: cursor,
          width: colWidth
        };
        const parent = openStack.length > 0 ? openStack[openStack.length - 1] : null;
        if (parent) {
          parent.children.push(leaf);
        } else {
          roots.push(leaf);
        }
        cursor += colWidth;
      }
      closeDown(0);
      const maxGroupDepth = this.computeMaxGroupDepth(roots);
      const groupRows = maxGroupDepth > 0 ? this.buildGroupRows(roots, maxGroupDepth) : [];
      return { roots, maxGroupDepth, groupRows, totalWidth: cursor };
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    /**
     * Find the longest common prefix length between the current open stack's
     * logical group IDs and the incoming column's group path.
     *
     * @param stack - Currently open group nodes.
     * @param path  - Group path for the incoming column.
     */
    commonPrefixLen(stack, path) {
      const len = Math.min(stack.length, path.length);
      for (let i = 0; i < len; i++) {
        if (stack[i].logicalGroupId !== path[i]) return i;
      }
      return len;
    }
    /**
     * Recursively compute the maximum group nesting depth across all nodes.
     * Returns `0` when there are no group nodes (all columns are flat).
     *
     * @param nodes - Display nodes to inspect.
     */
    computeMaxGroupDepth(nodes) {
      let max = 0;
      for (const n of nodes) {
        if (n.kind === "group") {
          const childMax = this.computeMaxGroupDepth(n.children);
          max = Math.max(max, n.depth + 1, childMax);
        }
      }
      return max;
    }
    /**
     * Flatten the display tree into one {@link RenderedHeaderRow} per group
     * depth level (rows `0..maxGroupDepth-1`).
     *
     * - Group nodes produce `RenderedGroupCell` entries in their depth row.
     * - Leaf nodes at any level produce `RenderedFillerCell` entries for every
     *   group-row depth where they have no ancestor group.  This makes flat and
     *   shallow columns appear to span the full header height.
     *
     * Cells within each row are sorted by `left` position before returning.
     *
     * @param roots         - Root-level display nodes.
     * @param maxGroupDepth - Total number of group header rows to produce.
     */
    buildGroupRows(roots, maxGroupDepth) {
      const rows = Array.from({ length: maxGroupDepth }, () => []);
      this.fillRows(roots, rows, 0);
      return rows.map((cells, depth) => ({
        depth,
        cells: cells.slice().sort((a, b) => a.left - b.left)
      }));
    }
    /**
     * Recursively fill the rows array from display tree nodes.
     *
     * @param nodes      - Nodes at the current recursion level.
     * @param rows       - Output rows array, mutated in place.
     * @param startDepth - The group-row depth these nodes contribute to.
     *   Root nodes → `startDepth = 0`.
     *   Children of a depth-0 group → `startDepth = 1`, etc.
     */
    fillRows(nodes, rows, startDepth) {
      for (const node of nodes) {
        if (node.kind === "leaf") {
          for (let d = startDepth; d < rows.length; d++) {
            const filler = {
              kind: "filler",
              id: `_filler_${node.colDef.colId}_d${d}`,
              colId: node.colDef.colId,
              left: node.left,
              width: node.width,
              depth: d
            };
            rows[d].push(filler);
          }
          continue;
        }
        if (node.depth < rows.length) {
          const cell = {
            kind: "group",
            node,
            left: node.left,
            width: node.width,
            depth: node.depth
          };
          rows[node.depth].push(cell);
        }
        this.fillRows(node.children, rows, node.depth + 1);
      }
    }
  };

  // src/column-groups/display-group-header-builder.ts
  var DisplayGroupHeaderBuilder = class {
    constructor(iconRenderer) {
      this.iconRenderer = iconRenderer;
    }
    // ── Public: build / update ────────────────────────────────────────────────
    /**
     * Build one `HTMLElement` per group depth row from the given display tree.
     * Returns an empty array when `maxGroupDepth === 0` (no groups present).
     *
     * @param tree    - Fully-computed display header tree.
     * @param options - Callbacks and configuration for interactive cells.
     */
    buildGroupRows(tree, options) {
      if (tree.maxGroupDepth === 0) return [];
      return tree.groupRows.map((row) => this.buildRow(row, options));
    }
    /**
     * Rebuild the contents of existing group-row elements in place.
     * Called when column widths change or collapse state is toggled.
     *
     * @param rowEls  - Previously built row elements (from `buildGroupRows`).
     * @param tree    - Updated display header tree.
     * @param options - Callbacks and configuration.
     */
    updateGroupRows(rowEls, tree, options) {
      if (rowEls.length === 0 || tree.maxGroupDepth === 0) return;
      const count = Math.min(rowEls.length, tree.groupRows.length);
      for (let d = 0; d < count; d++) {
        rowEls[d].innerHTML = "";
        this.populateRow(rowEls[d], tree.groupRows[d], options);
      }
    }
    // ── Private: DOM building ─────────────────────────────────────────────────
    buildRow(row, options) {
      const el = createDiv(`pg-header-group-row pg-header-group-row--depth-${row.depth}`);
      el.setAttribute("role", "row");
      el.setAttribute("data-group-depth", String(row.depth));
      this.populateRow(el, row, options);
      return el;
    }
    populateRow(rowEl, row, options) {
      for (const cell of row.cells) {
        rowEl.appendChild(this.buildCell(cell, options));
      }
    }
    buildCell(cell, options) {
      if (cell.kind === "filler") {
        const filler = createDiv("pg-th pg-th--depth-filler");
        filler.setAttribute("data-filler-id", cell.id);
        filler.setAttribute("data-col-id", cell.colId);
        filler.style.left = `${cell.left}px`;
        filler.style.width = `${cell.width}px`;
        return filler;
      }
      return this.buildGroupCell(cell.node, cell.left, cell.width, options);
    }
    /**
     * Build a single interactive group header cell.
     *
     * @param group   - Display group node supplying all rendering data.
     * @param left    - Pixel left offset within the row.
     * @param width   - Pixel width of the cell.
     * @param options - Interactive callbacks.
     */
    buildGroupCell(group, left, width, options) {
      const isCollapsed = group.collapsed;
      const classes = ["pg-th", "pg-th--group"];
      if (isCollapsed) classes.push("pg-th--group--collapsed");
      if (group.headerCssClass) {
        for (const cls of group.headerCssClass.split(" ")) {
          if (cls.trim()) classes.push(cls.trim());
        }
      }
      const th = createDiv(classes.join(" "));
      th.setAttribute("role", "columnheader");
      th.setAttribute("data-group-id", group.logicalGroupId);
      th.setAttribute("data-instance-id", group.instanceId);
      th.setAttribute("aria-expanded", String(!isCollapsed));
      th.setAttribute("aria-label", group.header);
      th.setAttribute("tabindex", "0");
      th.style.left = `${left}px`;
      th.style.width = `${width}px`;
      if (group.headerRendererFn) {
        const proxy = {
          id: group.logicalGroupId,
          header: group.header,
          parentId: null,
          headerCssClass: group.headerCssClass,
          resizable: group.resizable,
          collapsedWidth: group.collapsedWidth,
          headerRendererFn: group.headerRendererFn
        };
        const rendered = group.headerRendererFn({ logicalGroup: proxy, collapsed: isCollapsed, api: null });
        if (typeof rendered === "string") th.innerHTML = rendered;
        else th.appendChild(rendered);
      } else {
        this.buildDefaultContent(th, group, isCollapsed);
      }
      if (group.resizable) {
        const handle = createDiv("pg-th__resize-handle pg-th__resize-handle--group");
        handle.setAttribute("aria-hidden", "true");
        handle.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.startGroupResize(e, group, width, options);
        });
        th.appendChild(handle);
      }
      th.addEventListener("mousedown", (e) => {
        if (e.target.closest(".pg-th__resize-handle")) return;
        options.onGroupHeaderMouseDown?.(e, group, th);
      });
      th.addEventListener("click", (e) => {
        if (e.target.closest(".pg-th__resize-handle")) return;
        if (options.didJustDragFn?.()) return;
        options.onCollapseToggle?.(group.instanceId);
      });
      th.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        options.onGroupContextMenu?.(e, group, th);
      });
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          options.onCollapseToggle?.(group.instanceId);
        } else if (e.key === "ArrowLeft" && !isCollapsed) {
          e.preventDefault();
          options.onCollapseToggle?.(group.instanceId);
        } else if (e.key === "ArrowRight" && isCollapsed) {
          e.preventDefault();
          options.onCollapseToggle?.(group.instanceId);
        }
      });
      return th;
    }
    buildDefaultContent(th, group, isCollapsed) {
      const content = createDiv("pg-th__content");
      const labelEl = createDiv("pg-th__label");
      labelEl.textContent = group.header;
      labelEl.title = group.header;
      content.appendChild(labelEl);
      th.appendChild(content);
      const btn = createDiv("pg-th__collapse-btn");
      btn.setAttribute("tabindex", "-1");
      btn.setAttribute(
        "aria-label",
        isCollapsed ? `Expand ${group.header}` : `Collapse ${group.header}`
      );
      btn.innerHTML = this.iconRenderer.renderToString(
        isCollapsed ? "chevronRight" : "chevronLeft",
        12
      );
      th.appendChild(btn);
    }
    /**
     * Start a group-header resize drag.
     * Computes the new width on each mousemove and fires `onGroupResize`.
     *
     * @param e          - Initiating mousedown event.
     * @param group      - The group being resized.
     * @param startWidth - Pixel width at drag start.
     * @param options    - Contains the `onGroupResize` callback.
     */
    startGroupResize(e, group, startWidth, options) {
      const startX = e.clientX;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const onMove = (ev) => {
        const newW = Math.max(group.collapsedWidth, startWidth + ev.clientX - startX);
        options.onGroupResize?.(group.instanceId, newW);
      };
      const onUp = (ev) => {
        const newW = Math.max(group.collapsedWidth, startWidth + ev.clientX - startX);
        options.onGroupResize?.(group.instanceId, newW);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }
  };

  // src/column-groups/display-group-drag-handler.ts
  var DisplayGroupDragHandler = class {
    /**
     * @param gridElGetter    - Returns the root `.pg-grid` element (may be null before mount).
     * @param onGroupMoved    - Committed on mouseup; receives the final group position.
     * @param previewCallbacks - When provided, switches to the live-rebuild path (store mutations
     *   on every slot change, same as AG Grid's live column reorder).  When omitted, the handler
     *   uses CSS transforms instead — smoother and without flicker.
     * @param leavesFor       - Returns the leaf column IDs for a logical group.  Used by the
     *   CSS-transform path so that leaf header cells AND body cells animate in sync with the
     *   group header when the drag slot changes.
     */
    constructor(gridElGetter, onGroupMoved, previewCallbacks, leavesFor) {
      this.gridElGetter = gridElGetter;
      this.onGroupMoved = onGroupMoved;
      this.previewCallbacks = previewCallbacks;
      this.leavesFor = leavesFor;
      this._didJustDrag = false;
      this.isDragging = false;
      this.dragGroupId = null;
      this.sourcePanel = null;
      this.ghostEl = null;
      this.indicatorEl = null;
      this.dragStyleEl = null;
      this.capturedCells = [];
      this.dragSourceIdx = -1;
      /** Last slot key seen in live-preview mode — `"<panel>:<insertBeforeColId|end>"`. */
      this.lastSlotKey = "";
      this.startX = 0;
      this.startY = 0;
      this.removeMoveUp = null;
    }
    // ── Public ────────────────────────────────────────────────────────────────
    /**
     * Called from `DisplayGroupHeaderBuilder.onGroupHeaderMouseDown` for each
     * newly built group header cell.  Wires a threshold-based drag using the
     * `mousedown` event already delivered by the builder.
     *
     * @param e    - The `mousedown` event from the group header cell.
     * @param node - The display group node this cell represents.
     * @param el   - The DOM element of the group header cell.
     */
    onHeaderMouseDown(e, node, el) {
      if (e.button !== 0) return;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.dragGroupId = node.logicalGroupId;
      this._didJustDrag = false;
      this.isDragging = false;
      this.sourcePanel = this.detectPanelFromElement(el);
      const onMove = (ev) => {
        if (!this.isDragging) {
          const dx = Math.abs(ev.clientX - this.startX);
          const dy = Math.abs(ev.clientY - this.startY);
          if (dx < 5 && dy < 5) return;
          this.isDragging = true;
          this.activateDrag(ev, node);
        }
        if (this.isDragging) this.onMouseMove(ev);
      };
      const onUp = (ev) => {
        this.removeMoveUp?.();
        this.removeMoveUp = null;
        if (this.isDragging) this.onMouseUp(ev);
        this.isDragging = false;
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      this.removeMoveUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
    }
    /**
     * `true` for ~200 ms after a drag completes.
     * Used by the header builder to suppress the click event fired after mouseup.
     */
    get didJustDrag() {
      return this._didJustDrag;
    }
    /**
     * `true` while a group header drag is currently in progress.
     * Exposed so the store-watcher in `GridRenderer` can skip the full header
     * destroy / rebuild cycle during live-preview group drag, preventing flicker.
     */
    get isDraggingGroup() {
      return this.isDragging;
    }
    /**
     * Tear down all event listeners and remove any remaining drag DOM artifacts.
     * Must be called when the grid is destroyed or when the header is rebuilt.
     */
    destroy() {
      this.removeMoveUp?.();
      this.removeMoveUp = null;
      this.cleanupDrag();
    }
    // ── Private: drag lifecycle ───────────────────────────────────────────────
    /**
     * Activate the drag once the movement threshold is exceeded.
     * Creates the ghost chip, drop indicator, and style element.
     *
     * Adds `pg-grid--group-dragging` before live preview updates begin so the
     * renderer can suppress normal transition effects while column order is being
     * updated repeatedly under the pointer.
     */
    activateDrag(e, node) {
      const gridEl = this.gridElGetter();
      if (!gridEl) return;
      gridEl.classList.add("pg-grid--group-dragging");
      this.ghostEl = createDiv("pg-col-drag-ghost");
      this.ghostEl.textContent = node.header;
      this.ghostEl.style.left = `${e.clientX + 12}px`;
      this.ghostEl.style.top = `${e.clientY - 14}px`;
      document.body.appendChild(this.ghostEl);
      this.indicatorEl = createDiv("pg-group-drop-indicator");
      document.body.appendChild(this.indicatorEl);
      if (this.previewCallbacks) {
        this.lastSlotKey = "";
        this.previewCallbacks.onPreviewStart();
      } else {
        this.dragStyleEl = document.createElement("style");
        this.dragStyleEl.setAttribute("data-pg-group-drag", "");
        document.head.appendChild(this.dragStyleEl);
        this.capturePanelCells(gridEl, this.sourcePanel);
        this.dragSourceIdx = this.capturedCells.findIndex(
          (c) => c.groupId === node.logicalGroupId
        );
        if (this.dragSourceIdx === -1) this.dragSourceIdx = 0;
      }
    }
    onMouseMove(e) {
      if (!this.ghostEl) return;
      this._didJustDrag = true;
      this.ghostEl.style.left = `${e.clientX + 12}px`;
      this.ghostEl.style.top = `${e.clientY - 14}px`;
      const gridEl = this.gridElGetter();
      if (!gridEl) return;
      const targetPanel = this.detectPanelAtPoint(e.clientX, e.clientY, gridEl);
      if (this.previewCallbacks) {
        const insertBeforeColId = this.findInsertBeforeColId(e, targetPanel, gridEl);
        const slotKey = `${targetPanel ?? "c"}:${insertBeforeColId ?? "end"}`;
        if (slotKey !== this.lastSlotKey) {
          this.lastSlotKey = slotKey;
          this.previewCallbacks.onPreviewMove(
            this.dragGroupId,
            this.sourcePanel,
            targetPanel,
            insertBeforeColId
          );
        }
        this.updateIndicatorFromColId(insertBeforeColId, targetPanel, gridEl);
      } else {
        if (targetPanel !== this.sourcePanel) {
          this.capturePanelCells(gridEl, targetPanel);
          this.dragSourceIdx = -1;
        }
        const effectiveIdx = this.findEffectiveSlot(e.clientX);
        this.applyTransforms(effectiveIdx, gridEl);
        this.updateIndicator(effectiveIdx);
      }
    }
    onMouseUp(e) {
      if (this.previewCallbacks) {
        this.previewCallbacks.onPreviewConfirm();
        this.cleanupDrag();
        this._didJustDrag = true;
        setTimeout(() => {
          this._didJustDrag = false;
        }, 200);
        return;
      }
      const gridEl = this.gridElGetter();
      if (!gridEl || !this.dragGroupId) {
        this.cleanupDrag();
        return;
      }
      const targetPanel = this.detectPanelAtPoint(e.clientX, e.clientY, gridEl);
      const insertBeforeColId = this.findInsertBeforeColId(e, targetPanel, gridEl);
      const srcPanel = this.sourcePanel;
      const groupId = this.dragGroupId;
      this.cleanupDrag();
      this.onGroupMoved(groupId, srcPanel, targetPanel, insertBeforeColId);
      this._didJustDrag = true;
      setTimeout(() => {
        this._didJustDrag = false;
      }, 200);
    }
    // ── Private: drop target ─────────────────────────────────────────────────
    /**
     * Find the leaf column ID that the group should be inserted before.
     * Inspects the leaf header row in the target panel, finding the first cell
     * whose horizontal midpoint is to the right of the cursor.
     *
     * @param e           - Current cursor position.
     * @param targetPanel - Panel the drop is over.
     * @param gridEl      - Root `.pg-grid` element.
     */
    findInsertBeforeColId(e, targetPanel, gridEl) {
      const panelEl = this.getPanelEl(targetPanel, gridEl);
      if (!panelEl) return null;
      const leafRow = panelEl.querySelector(".pg-header-row");
      if (!leafRow) return null;
      const cells = Array.from(leafRow.querySelectorAll(".pg-th[data-col-id]"));
      for (const cell of cells) {
        const rect = cell.getBoundingClientRect();
        if (e.clientX < rect.left + rect.width / 2) {
          return cell.getAttribute("data-col-id");
        }
      }
      return null;
    }
    // ── Private: live transforms ──────────────────────────────────────────────
    /**
     * Capture all root-level drag slots from the depth-0 group header row.
     *
     * Slots include both:
     * - **Group cells** (`.pg-th--group`): represent a whole logical group.
     * - **Flat-column filler cells** (`.pg-th--depth-filler`): represent a single
     *   ungrouped column sitting between/around groups.  Including these as slots
     *   lets the drag handler detect when the cursor crosses a flat-column boundary
     *   and animate the flat column (header + body cells) out of the way in real
     *   time — matching AG Grid's behaviour for mixed grouped/flat layouts.
     *
     * Cells are sorted by their `style.left` value because absolutely-positioned
     * elements may appear in arbitrary DOM insertion order.
     *
     * Falls back to the leaf header row when no group rows exist (rare — only when
     * the grid transitions from grouped to flat while a drag is in progress).
     *
     * @param gridEl - Root `.pg-grid` element.
     * @param panel  - Panel to inspect.
     */
    capturePanelCells(gridEl, panel) {
      this.capturedCells = [];
      const panelEl = this.getPanelEl(panel, gridEl);
      if (!panelEl) return;
      const depth0Row = panelEl.querySelector(".pg-header-group-row--depth-0");
      if (depth0Row) {
        const slots = Array.from(
          depth0Row.querySelectorAll(".pg-th--group, .pg-th--depth-filler")
        );
        slots.sort((a, b) => parseFloat(a.style.left || "0") - parseFloat(b.style.left || "0"));
        for (const el of slots) {
          this.capturedCells.push({
            el,
            rect: el.getBoundingClientRect(),
            groupId: el.getAttribute("data-group-id") ?? "",
            colId: el.getAttribute("data-col-id") ?? ""
          });
        }
        if (this.capturedCells.length > 0) return;
      }
      const leafRow = panelEl.querySelector(".pg-header-row");
      if (leafRow) {
        const cells = Array.from(leafRow.querySelectorAll(".pg-th[data-col-id]"));
        for (const el of cells) {
          this.capturedCells.push({
            el,
            rect: el.getBoundingClientRect(),
            groupId: "",
            colId: el.getAttribute("data-col-id") ?? ""
          });
        }
      }
    }
    /**
     * Find the effective drop-slot index from the current cursor x position.
     * Returns `capturedCells.length` to indicate "append at end".
     *
     * @param cursorX - Cursor x position in client coordinates.
     */
    findEffectiveSlot(cursorX) {
      for (let i = 0; i < this.capturedCells.length; i++) {
        const { rect } = this.capturedCells[i];
        if (cursorX < rect.left + rect.width / 2) return i;
      }
      return this.capturedCells.length;
    }
    /**
     * Apply `--pg-drag-x` and `--pg-drag-transition` rules via the injected `<style>`
     * element to give a live preview of where the dragged group will land.
     *
     * - The **dragged group** and all of its leaf columns snap instantly
     *   (`--pg-drag-transition: 0ms`) so they track the slot-change in a single frame.
     * - **Displaced groups** and their leaf columns animate smoothly with the default
     *   transition duration (180 ms) — matching AG Grid's animated reorder behaviour.
     * - Body cells (`pg-cell[data-col-id]`) receive the same offset as their header
     *   counterpart, so the data rows shift in perfect sync with the header.
     *
     * Using the `--pg-drag-transition` CSS variable avoids specificity conflicts:
     * the base CSS in `base-styles.ts` reads the variable and provides the default,
     * while the per-cell override only needs to set the variable.
     *
     * @param effectiveIdx - Drop-slot index from {@link findEffectiveSlot}.
     * @param gridEl       - Root `.pg-grid` element (used to scope CSS selectors).
     */
    applyTransforms(effectiveIdx, gridEl) {
      if (!this.dragStyleEl || this.capturedCells.length === 0) return;
      const src = this.dragSourceIdx;
      if (src === -1 || effectiveIdx === src || effectiveIdx === src + 1) {
        this.dragStyleEl.textContent = "";
        return;
      }
      const gridId = gridEl.getAttribute("data-photon-grid-id") ?? "";
      const ds = gridId ? `[data-photon-grid-id="${gridId}"].pg-grid--group-dragging ` : ".pg-grid--group-dragging ";
      const draggedCell = this.capturedCells[src];
      const draggedWidth = draggedCell?.rect.width ?? 0;
      const dragGroupId = this.dragGroupId ?? "";
      const targetCell = effectiveIdx < this.capturedCells.length ? this.capturedCells[effectiveIdx] : this.capturedCells[this.capturedCells.length - 1];
      const srcOffset = effectiveIdx > src ? targetCell.rect.right - draggedCell.rect.right : targetCell.rect.left - draggedCell.rect.left;
      let css2 = `${ds}[data-group-id="${dragGroupId}"] { --pg-drag-x: ${srcOffset}px; --pg-drag-transition: 0ms; z-index: 10; position: relative; }
`;
      if (this.leavesFor) {
        for (const colId of this.leavesFor(dragGroupId)) {
          css2 += `${ds}[data-col-id="${colId}"] { --pg-drag-x: ${srcOffset}px; --pg-drag-transition: 0ms; }
`;
        }
      }
      for (let i = 0; i < this.capturedCells.length; i++) {
        if (i === src) continue;
        const cell = this.capturedCells[i];
        const cellId = cell.groupId || cell.colId;
        let offset = 0;
        if (effectiveIdx > src && i > src && i < effectiveIdx) {
          offset = -draggedWidth;
        } else if (effectiveIdx <= src && i >= effectiveIdx && i < src) {
          offset = draggedWidth;
        }
        if (offset === 0 || !cellId) continue;
        css2 += cell.groupId ? `${ds}[data-group-id="${cellId}"] { --pg-drag-x: ${offset}px; }
` : `${ds}[data-col-id="${cellId}"] { --pg-drag-x: ${offset}px; }
`;
        if (cell.groupId && this.leavesFor) {
          for (const colId of this.leavesFor(cell.groupId)) {
            css2 += `${ds}[data-col-id="${colId}"] { --pg-drag-x: ${offset}px; }
`;
          }
        }
      }
      this.dragStyleEl.textContent = css2;
    }
    /**
     * Reposition the drop-indicator line to show the insertion point.
     *
     * @param effectiveIdx - Slot index derived from cursor position.
     */
    updateIndicator(effectiveIdx) {
      if (!this.indicatorEl) return;
      const cells = this.capturedCells;
      if (cells.length === 0) {
        this.indicatorEl.style.display = "none";
        return;
      }
      let left;
      let top;
      let height;
      if (effectiveIdx < cells.length) {
        const rect = cells[effectiveIdx].rect;
        left = rect.left;
        top = rect.top;
        height = rect.height;
      } else {
        const rect = cells[cells.length - 1].rect;
        left = rect.right;
        top = rect.top;
        height = rect.height;
      }
      this.indicatorEl.style.left = `${left}px`;
      this.indicatorEl.style.top = `${top}px`;
      this.indicatorEl.style.height = `${height}px`;
      this.indicatorEl.style.display = "block";
    }
    /**
     * Position the drop-indicator line by looking up the target cell directly in
     * the live DOM.  Used in live-preview mode where captured cell rects are stale
     * after each header rebuild.
     *
     * @param colId    - The `data-col-id` of the cell to insert before, or `null`
     *                   to place the indicator at the end of the panel.
     * @param panel    - The panel the drop is targeting.
     * @param gridEl   - Root `.pg-grid` element.
     */
    updateIndicatorFromColId(colId, panel, gridEl) {
      if (!this.indicatorEl) return;
      const panelEl = this.getPanelEl(panel, gridEl);
      if (!panelEl) {
        this.indicatorEl.style.display = "none";
        return;
      }
      const leafRow = panelEl.querySelector(".pg-header-row");
      if (!leafRow) {
        this.indicatorEl.style.display = "none";
        return;
      }
      let left;
      let top;
      let height;
      if (colId) {
        const cell = leafRow.querySelector(`.pg-th[data-col-id="${colId}"]`);
        if (!cell) {
          this.indicatorEl.style.display = "none";
          return;
        }
        const rect = cell.getBoundingClientRect();
        left = rect.left;
        top = rect.top;
        height = rect.height;
      } else {
        const cells = Array.from(leafRow.querySelectorAll(".pg-th[data-col-id]"));
        if (cells.length === 0) {
          this.indicatorEl.style.display = "none";
          return;
        }
        const rect = cells[cells.length - 1].getBoundingClientRect();
        left = rect.right;
        top = rect.top;
        height = rect.height;
      }
      this.indicatorEl.style.left = `${left}px`;
      this.indicatorEl.style.top = `${top}px`;
      this.indicatorEl.style.height = `${height}px`;
      this.indicatorEl.style.display = "block";
    }
    // ── Private: panel helpers ────────────────────────────────────────────────
    detectPanelFromElement(el) {
      if (el.closest(".pg-panel--left")) return "left";
      if (el.closest(".pg-panel--right")) return "right";
      return null;
    }
    detectPanelAtPoint(x, y, gridEl) {
      const check = (cls, pin) => {
        const el = gridEl.querySelector(cls);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      };
      if (check(".pg-panel--left", "left")) return "left";
      if (check(".pg-panel--right", "right")) return "right";
      return null;
    }
    getPanelEl(panel, gridEl) {
      if (panel === "left") return gridEl.querySelector(".pg-panel--left");
      if (panel === "right") return gridEl.querySelector(".pg-panel--right");
      return gridEl.querySelector(".pg-panel--center") ?? gridEl.querySelector(".pg-panel:not(.pg-panel--left):not(.pg-panel--right)");
    }
    cleanupDrag() {
      if (this.dragStyleEl) {
        this.dragStyleEl.textContent = "";
        this.dragStyleEl.remove();
        this.dragStyleEl = null;
      }
      this.ghostEl?.remove();
      this.ghostEl = null;
      this.indicatorEl?.remove();
      this.indicatorEl = null;
      this.capturedCells = [];
      this.dragSourceIdx = -1;
      this.dragGroupId = null;
      this.sourcePanel = null;
      this.isDragging = false;
      this.lastSlotKey = "";
      this.gridElGetter()?.classList.remove("pg-grid--group-dragging", "pg-grid--drag-preview-sync");
    }
  };

  // src/column-groups/display-group-engine.ts
  var DisplayGroupEngine = class {
    constructor(colStyles, eventBus, columnModel, store, iconRenderer) {
      this.colStyles = colStyles;
      this.eventBus = eventBus;
      this.columnModel = columnModel;
      this.store = store;
      this.iconRenderer = iconRenderer;
      /** Drag handler — created lazily on first `createDragHandler()` call. */
      this.dragHandler = null;
      /**
       * Per-instance collapse state.
       * Keyed by stable `instanceId` (`"${logicalGroupId}:${firstLeafColId}"`).
       * Persisted across header rebuilds.
       */
      this.collapseState = /* @__PURE__ */ new Map();
      /**
       * Cache of leaf colIds that were visible just before a group instance was
       * collapsed.  Used on expand to restore exactly the pre-collapse visibility
       * rather than making ALL registry leaves visible (which would conflict with
       * columns that were manually hidden before the collapse).
       */
      this.instanceLeaveCache = /* @__PURE__ */ new Map();
      /**
       * Snapshot of `store.columns` taken at the moment a group drag is activated.
       * Every live preview move is applied against this base so intermediate preview
       * states don't compound — the final position is always relative to the original
       * column order, not the previous preview frame.
       * Cleared on drop confirmation.
       */
      this.previewBaseColumns = null;
      this.registry = new LogicalGroupRegistry();
      this.builder = new DisplayGroupBuilder();
      this.headerBuilder = new DisplayGroupHeaderBuilder(iconRenderer);
    }
    // ── Initialization ────────────────────────────────────────────────────────
    /**
     * Parse the top-level column definition array and populate the logical
     * group registry.  Must be called before any `buildTree()` invocations.
     *
     * Group `ColumnDef` entries (those with a `.children` array) are recorded as
     * `LogicalGroupDef` objects.  Leaf columns receive their full group path.
     *
     * @param columns - Top-level `ColumnDef[]`, possibly containing nested groups.
     */
    parse(columns) {
      this.registry.parse(columns);
    }
    /**
     * `true` when the parsed column definitions contained at least one group.
     * Use this to decide whether group header rows should be rendered.
     */
    get hasGroups() {
      return this.registry.hasGroups;
    }
    /**
     * `true` while a group header drag is currently in progress.
     * Used by the `GridRenderer` store-watcher to skip the full header
     * destroy / rebuild cycle during live-preview drag, preventing flicker.
     */
    get isDraggingGroup() {
      return this.dragHandler?.isDraggingGroup ?? false;
    }
    /**
     * Returns `true` when the given column has no group ancestry — it is a flat
     * (ungrouped) leaf column rendered alongside grouped columns.
     *
     * @param colId - Leaf column ID to check.
     */
    isFlat(colId) {
      return this.registry.getPath(colId).length === 0;
    }
    // ── Display tree building ─────────────────────────────────────────────────
    /**
     * Build a fresh `DisplayHeaderTree` for the given visible columns.
     *
     * The result is consumed immediately by `DisplayGroupHeaderBuilder` to
     * produce DOM — it should not be stored beyond a single render frame.
     *
     * @param columns - Visible columns for **one panel** in left-to-right order.
     *   Columns with `visible === false` are automatically skipped.
     */
    buildTree(columns) {
      return this.builder.build(columns, this.registry, this.collapseState, this.colStyles);
    }
    // ── Collapse / expand ─────────────────────────────────────────────────────
    /**
     * Toggle the collapsed state of a specific display group instance.
     *
     * The `instanceId` format is `"${logicalGroupId}:${firstLeafColId}"` — the
     * same stable key computed by `DisplayGroupBuilder` when opening each group
     * instance for the first time.
     *
     * When **collapsing**: hides all visible leaves of this instance except the
     * first ("peek") column.  The hidden set is cached so expand can restore
     * exactly the pre-collapse visibility without surfacing columns that were
     * already hidden by other means (e.g. column menu).
     *
     * When **expanding**: restores leaves from the cache.  Falls back to all
     * visible instance leaves if no cache entry exists.
     *
     * @param instanceId - Stable instance ID in `"groupId:firstLeafColId"` format.
     */
    toggleGroup(instanceId) {
      const colonIdx = instanceId.indexOf(":");
      const logicalGroupId = colonIdx >= 0 ? instanceId.slice(0, colonIdx) : instanceId;
      const firstLeafColId = colonIdx >= 0 ? instanceId.slice(colonIdx + 1) : "";
      const wasCollapsed = this.collapseState.get(instanceId) ?? false;
      const isNowCollapsed = !wasCollapsed;
      this.collapseState.set(instanceId, isNowCollapsed);
      const allCols = this.store.get("columns");
      const groupLeafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
      const instanceLeaves = this.findInstanceLeaves(allCols, firstLeafColId, groupLeafIds);
      if (isNowCollapsed) {
        const visibleLeaves = instanceLeaves.filter((c) => c.visible !== false);
        this.instanceLeaveCache.set(instanceId, visibleLeaves.map((c) => c.colId));
        for (let i = 0; i < visibleLeaves.length; i++) {
          this.columnModel.setColumnVisible(visibleLeaves[i].colId, i === 0);
        }
      } else {
        const toRestore = this.instanceLeaveCache.get(instanceId) ?? instanceLeaves.map((c) => c.colId);
        for (const colId of toRestore) {
          this.columnModel.setColumnVisible(colId, true);
        }
        this.instanceLeaveCache.delete(instanceId);
      }
      this.eventBus.emit(
        isNowCollapsed ? GridEventType.COLUMN_GROUP_HEADER_COLLAPSED : GridEventType.COLUMN_GROUP_HEADER_EXPANDED,
        { groupId: logicalGroupId }
      );
    }
    /**
     * Returns `true` when any display instance of the given logical group is
     * currently collapsed.
     *
     * @param logicalGroupId - Logical group ID to inspect.
     */
    isCollapsed(logicalGroupId) {
      const prefix = `${logicalGroupId}:`;
      for (const [key, val] of this.collapseState) {
        if (key.startsWith(prefix) && val) return true;
      }
      return false;
    }
    /**
     * Returns a serializable snapshot of the current collapse state.
     * Suitable for persistence or state-save/restore scenarios.
     */
    getCollapseStateSnapshot() {
      return Array.from(this.collapseState.entries()).map(([id, collapsed]) => ({
        logicalGroupId: id,
        collapsed
      }));
    }
    /**
     * Restore collapse state from a previously saved snapshot without triggering
     * a rebuild — the caller must trigger a rebuild after this call if needed.
     *
     * @param states - Array of saved collapse state entries.
     */
    applyCollapseState(states) {
      for (const { logicalGroupId, collapsed } of states) {
        this.collapseState.set(logicalGroupId, collapsed);
      }
    }
    // ── Group move (drag-drop) ────────────────────────────────────────────────
    /**
     * Move a logical group to a new position in the displayed column order.
     *
     * Gathers all leaves of the group that are currently in `sourcePanel`,
     * removes them from `store.columns`, optionally changes their `pinned`
     * property, then re-inserts them before `insertBeforeColId`.
     *
     * Setting `store.columns` triggers the grid's column-watcher which rebuilds
     * the header automatically.
     *
     * @param logicalGroupId    - The logical group being moved.
     * @param sourcePanel       - The panel the drag originated from.
     * @param targetPanel       - The panel the group is dropped into.
     * @param insertBeforeColId - Leaf column to insert before; `null` = end of panel.
     */
    handleGroupMoved(logicalGroupId, sourcePanel, targetPanel, insertBeforeColId) {
      const storeColumns = this.store.get("columns");
      const leafIds = this.registry.getLeavesForGroup(logicalGroupId);
      const groupLeaves = storeColumns.filter(
        (c) => leafIds.includes(c.colId) && (c.pinned ?? null) === sourcePanel
      );
      if (groupLeaves.length === 0) return;
      const groupLeafSet = new Set(groupLeaves.map((c) => c.colId));
      const withoutGroup = storeColumns.filter((c) => !groupLeafSet.has(c.colId));
      const movedLeaves = groupLeaves.map((c) => ({
        ...c,
        pinned: targetPanel
      }));
      let insertIdx;
      if (insertBeforeColId) {
        insertIdx = withoutGroup.findIndex((c) => c.colId === insertBeforeColId);
        if (insertIdx === -1) {
          insertIdx = this.findEndOfPanel(withoutGroup, targetPanel);
        }
      } else {
        insertIdx = this.findEndOfPanel(withoutGroup, targetPanel);
      }
      const newColumns = [
        ...withoutGroup.slice(0, insertIdx),
        ...movedLeaves,
        ...withoutGroup.slice(insertIdx)
      ];
      this.store.set("columns", newColumns);
    }
    // ── Group resize ──────────────────────────────────────────────────────────
    /**
     * Resize a specific display group instance by distributing `newWidth`
     * proportionally among its visible leaf columns.
     *
     * The `instanceId` format is `"${logicalGroupId}:${firstLeafColId}"`.
     * Only the contiguous block of leaves that form THIS instance are resized —
     * split instances of the same logical group are unaffected.
     *
     * Each leaf's new width = `round(oldWidth × newWidth / currentWidth)`,
     * clamped to the leaf's `minWidth`.
     *
     * @param instanceId - Stable instance ID in `"groupId:firstLeafColId"` format.
     * @param newWidth   - New total pixel width for this instance.
     */
    resizeGroup(instanceId, newWidth) {
      const colonIdx = instanceId.indexOf(":");
      const logicalGroupId = colonIdx >= 0 ? instanceId.slice(0, colonIdx) : instanceId;
      const firstLeafColId = colonIdx >= 0 ? instanceId.slice(colonIdx + 1) : "";
      const allCols = this.store.get("columns");
      const groupLeafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
      const leaves = this.findInstanceLeaves(allCols, firstLeafColId, groupLeafIds).filter((c) => c.visible !== false);
      if (leaves.length === 0) return;
      const currentWidth = leaves.reduce((s, c) => s + this.colStyles.getWidth(c.colId), 0);
      if (currentWidth <= 0 || Math.abs(newWidth - currentWidth) < 1) return;
      const ratio = newWidth / currentWidth;
      for (const leaf of leaves) {
        const oldW = this.colStyles.getWidth(leaf.colId);
        const newW = Math.max(leaf.minWidth ?? 40, Math.round(oldW * ratio));
        this.colStyles.setWidth(leaf.colId, newW);
        this.columnModel.setColumnWidth(leaf.colId, newW, false);
      }
    }
    // ── Live drag preview (AG Grid-style) ────────────────────────────────────
    /**
     * Called by {@link DisplayGroupDragHandler} when the drag activation threshold
     * is crossed.  Saves the current `store.columns` snapshot so every subsequent
     * {@link applyPreviewMove} can rebase from the original order.
     */
    beginDragPreview() {
      this.previewBaseColumns = this.store.get("columns");
    }
    /**
     * Apply a temporary (preview) group move from the original column snapshot.
     *
     * Called on **every slot change** during a drag — i.e. many times before the
     * user releases the mouse.  Always rebases from `previewBaseColumns` so
     * intermediate positions don't compound.  Updates `store.columns` directly,
     * which triggers the grid's column-watcher and causes the header to rebuild
     * synchronously on the next animation frame.
     *
     * @param logicalGroupId    - The group being dragged.
     * @param sourcePanel       - Panel the drag originated from.
     * @param targetPanel       - Panel currently under the cursor.
     * @param insertBeforeColId - Column to insert the group before; `null` = end.
     */
    applyPreviewMove(logicalGroupId, sourcePanel, targetPanel, insertBeforeColId) {
      const baseColumns = this.previewBaseColumns;
      if (!baseColumns) return;
      const leafIds = this.registry.getLeavesForGroup(logicalGroupId);
      const groupLeaves = baseColumns.filter(
        (c) => leafIds.includes(c.colId) && (c.pinned ?? null) === sourcePanel
      );
      if (groupLeaves.length === 0) return;
      const groupLeafSet = new Set(groupLeaves.map((c) => c.colId));
      const withoutGroup = baseColumns.filter((c) => !groupLeafSet.has(c.colId));
      const movedLeaves = groupLeaves.map((c) => ({
        ...c,
        pinned: targetPanel
      }));
      let insertIdx;
      if (insertBeforeColId) {
        insertIdx = withoutGroup.findIndex((c) => c.colId === insertBeforeColId);
        if (insertIdx === -1) insertIdx = this.findEndOfPanel(withoutGroup, targetPanel);
      } else {
        insertIdx = this.findEndOfPanel(withoutGroup, targetPanel);
      }
      this.store.set("columns", [
        ...withoutGroup.slice(0, insertIdx),
        ...movedLeaves,
        ...withoutGroup.slice(insertIdx)
      ]);
    }
    /**
     * Confirm the drag preview: the store already holds the correct final order
     * from the last {@link applyPreviewMove} call.  This simply clears the snapshot.
     */
    confirmDragPreview() {
      this.previewBaseColumns = null;
    }
    // ── Drag handler factory ──────────────────────────────────────────────────
    /**
     * Create and return the drag handler wired to this engine.
     * Creates a new instance on first call; subsequent calls return the same instance.
     *
     * Group dragging deliberately uses the transform-preview mode rather than the
     * live store-mutation mode. Updating `store.columns` on every hover slot makes
     * body/header virtualization rebuild repeatedly and causes the right-side
     * columns to blink under grouped headers. The final order is committed once on
     * drop, matching AG Grid's stable drag preview behavior.
     *
     * @param gridElGetter - Getter that returns the root `.pg-grid` element.
     *   May return `null` before the grid is mounted.
     */
    createDragHandler(gridElGetter) {
      if (!this.dragHandler) {
        this.dragHandler = new DisplayGroupDragHandler(
          gridElGetter,
          (groupId, src, tgt, before) => this.handleGroupMoved(groupId, src, tgt, before),
          void 0,
          // previewCallbacks — CSS-transform path is used (no live store mutations)
          (groupId) => this.registry.getLeavesForGroup(groupId)
        );
      }
      return this.dragHandler;
    }
    /**
     * Returns the active drag handler, or `null` if `createDragHandler` has not
     * been called yet.
     */
    getDragHandler() {
      return this.dragHandler;
    }
    // ── Context-menu helpers (used by GroupContextMenu) ──────────────────────
    /**
     * Expose all leaf column IDs for a logical group.
     * Used by the group context menu to inspect and modify group leaves.
     *
     * @param logicalGroupId - Logical group to inspect.
     */
    getLeavesForGroup(logicalGroupId) {
      return this.registry.getLeavesForGroup(logicalGroupId);
    }
    /**
     * Returns the positional state of a group within its current panel.
     * Used by the group context menu to enable or disable move items.
     *
     * @param logicalGroupId - The group to inspect.
     */
    getGroupPositionInfo(logicalGroupId) {
      const allCols = this.store.get("columns");
      const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
      const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
      if (!firstLeaf) return { isFirst: true, isLast: true, panel: null };
      const panel = firstLeaf.pinned ?? null;
      const panelCols = allCols.filter((c) => (c.pinned ?? null) === panel && c.visible !== false);
      const leafIndices = panelCols.reduce((acc, c, i) => {
        if (leafIds.has(c.colId)) acc.push(i);
        return acc;
      }, []);
      if (leafIndices.length === 0) return { isFirst: true, isLast: true, panel };
      return {
        isFirst: leafIndices[0] === 0,
        isLast: leafIndices[leafIndices.length - 1] === panelCols.length - 1,
        panel
      };
    }
    /**
     * Move the group one column position to the left within its current panel.
     * No-op when the group is already at the start of the panel.
     *
     * @param logicalGroupId - The group to move.
     */
    moveGroupLeft(logicalGroupId) {
      const allCols = this.store.get("columns");
      const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
      const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
      if (!firstLeaf) return;
      const panel = firstLeaf.pinned ?? null;
      const panelCols = allCols.filter((c) => (c.pinned ?? null) === panel);
      const firstLeafIdx = panelCols.findIndex((c) => leafIds.has(c.colId));
      if (firstLeafIdx <= 0) return;
      this.handleGroupMoved(logicalGroupId, panel, panel, panelCols[firstLeafIdx - 1].colId);
    }
    /**
     * Move the group one column position to the right within its current panel.
     * No-op when the group is already at the end of the panel.
     *
     * @param logicalGroupId - The group to move.
     */
    moveGroupRight(logicalGroupId) {
      const allCols = this.store.get("columns");
      const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
      const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
      if (!firstLeaf) return;
      const panel = firstLeaf.pinned ?? null;
      const panelCols = allCols.filter((c) => (c.pinned ?? null) === panel);
      let lastLeafIdx = -1;
      for (let i = 0; i < panelCols.length; i++) {
        if (leafIds.has(panelCols[i].colId)) lastLeafIdx = i;
      }
      if (lastLeafIdx === -1 || lastLeafIdx >= panelCols.length - 1) return;
      const insertBeforeIdx = lastLeafIdx + 2;
      const insertBefore = insertBeforeIdx < panelCols.length ? panelCols[insertBeforeIdx].colId : null;
      this.handleGroupMoved(logicalGroupId, panel, panel, insertBefore);
    }
    /**
     * Move the group to the first position within its current panel.
     * No-op when the group is already at the start.
     *
     * @param logicalGroupId - The group to move.
     */
    moveGroupToStart(logicalGroupId) {
      const allCols = this.store.get("columns");
      const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
      const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
      if (!firstLeaf) return;
      const panel = firstLeaf.pinned ?? null;
      const panelCols = allCols.filter((c) => (c.pinned ?? null) === panel);
      const firstNonGroup = panelCols.find((c) => !leafIds.has(c.colId));
      if (!firstNonGroup) return;
      this.handleGroupMoved(logicalGroupId, panel, panel, firstNonGroup.colId);
    }
    /**
     * Move the group to the last position within its current panel.
     * No-op when the group is already at the end.
     *
     * @param logicalGroupId - The group to move.
     */
    moveGroupToEnd(logicalGroupId) {
      const allCols = this.store.get("columns");
      const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
      const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
      if (!firstLeaf) return;
      const panel = firstLeaf.pinned ?? null;
      this.handleGroupMoved(logicalGroupId, panel, panel, null);
    }
    /**
     * Hide all visible leaf columns that belong to this group.
     * Columns that are already hidden are left unchanged.
     *
     * @param logicalGroupId - The group whose leaves should be hidden.
     */
    hideGroupLeaves(logicalGroupId) {
      const leafIds = this.registry.getLeavesForGroup(logicalGroupId);
      for (const colId of leafIds) {
        this.columnModel.setColumnVisible(colId, false);
      }
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    /**
     * Find the contiguous block of columns that constitute one display instance
     * of a logical group.
     *
     * Scans `allCols` forward from the column with ID `firstLeafColId`.  Columns
     * are included while they belong to `groupLeafIds`; the first non-member
     * column terminates the scan.  Hidden columns (visible === false) are
     * included so that collapse / expand operates on all leaves, not just the
     * currently-visible ones.
     *
     * @param allCols        - Full column array from the store (incl. hidden).
     * @param firstLeafColId - Column ID of the first leaf of the target instance.
     * @param groupLeafIds   - Set of all leaf colIds for the logical group.
     */
    findInstanceLeaves(allCols, firstLeafColId, groupLeafIds) {
      const startIdx = allCols.findIndex((c) => c.colId === firstLeafColId);
      if (startIdx === -1) return [];
      const result = [];
      for (let i = startIdx; i < allCols.length; i++) {
        if (!groupLeafIds.has(allCols[i].colId)) break;
        result.push(allCols[i]);
      }
      return result;
    }
    /**
     * Find the index **one past** the last column in `panel` within `columns`.
     * Returns `columns.length` when no column with the target panel is found
     * (appends to the absolute end of the array).
     *
     * @param columns - Column array to search within.
     * @param panel   - Target panel (`'left'`, `null` for center, `'right'`).
     */
    findEndOfPanel(columns, panel) {
      let lastIdx = -1;
      for (let i = 0; i < columns.length; i++) {
        if ((columns[i].pinned ?? null) === panel) lastIdx = i;
      }
      return lastIdx === -1 ? columns.length : lastIdx + 1;
    }
  };

  // src/core/grid-core.ts
  function collectLeaves(cols) {
    const result = [];
    for (const col of cols) {
      if (Array.isArray(col.children) && col.children.length > 0) {
        result.push(...collectLeaves(col.children));
      } else {
        result.push(col);
      }
    }
    return result;
  }
  var GridCore = class {
    constructor(containerEl, options) {
      /** Set during `buildContext` when any top-level `ColumnDef` has `children`. */
      this.columnGroupModel = null;
      this.groupHeaderBuilder = null;
      /** New Display Group Engine — replaces `columnGroupModel` for group rendering. */
      this.displayGroupEngine = null;
      this.ctx = this.buildContext(containerEl, options);
      this.api = new GridApi(this.ctx);
      this.initialize();
    }
    buildContext(containerEl, options) {
      const eventBus = new EventBus();
      const store = new GridStore(eventBus);
      const columnModel = new ColumnModel(store, eventBus);
      const rowModel = new RowModel(store, eventBus);
      const sortEngine = new SortEngine(store, eventBus);
      const filterEngine = new FilterEngine(store, eventBus);
      const paginationEngine = new PaginationEngine(store, eventBus);
      const aggregationEngine = new AggregationEngine();
      const groupingEngine = new GroupingEngine(store, eventBus, aggregationEngine);
      const rowSelectionEngine = new RowSelectionEngine(store, eventBus);
      const cellEditorEngine = new CellEditorEngine(store, eventBus);
      const summaryEngine = new SummaryEngine();
      const exportEngine = new ExportEngine(eventBus);
      const clipboardEngine = new ClipboardEngine();
      const dragDropEngine = new DragDropEngine(eventBus);
      const undoRedoEngine = new UndoRedoEngine();
      const cellSelectionEngine = new CellSelectionEngine(store, eventBus, clipboardEngine, undoRedoEngine);
      const themeManager = new ThemeManager(eventBus);
      const iconRegistry = new IconRegistry();
      const iconRenderer = new IconRenderer(iconRegistry);
      const chartEngine = new ChartEngine(eventBus);
      const renderer = new GridRenderer(
        containerEl,
        store,
        eventBus,
        columnModel,
        paginationEngine,
        iconRenderer,
        cellSelectionEngine,
        sortEngine,
        rowSelectionEngine,
        groupingEngine,
        options
      );
      const hasGroups = options.columns?.some((c) => Array.isArray(c.children) && c.children.length > 0) ?? false;
      if (hasGroups) {
        const engine = new DisplayGroupEngine(
          renderer.colStyles,
          eventBus,
          columnModel,
          store,
          iconRenderer
        );
        engine.parse(options.columns);
        this.displayGroupEngine = engine;
        renderer.setDisplayGroupEngine(engine);
      }
      return {
        options,
        containerEl,
        eventBus,
        store,
        columnModel,
        rowModel,
        sortEngine,
        filterEngine,
        paginationEngine,
        groupingEngine,
        aggregationEngine,
        rowSelectionEngine,
        cellEditorEngine,
        summaryEngine,
        exportEngine,
        clipboardEngine,
        dragDropEngine,
        cellSelectionEngine,
        themeManager,
        iconRegistry,
        chartEngine,
        undoRedoEngine,
        renderer
      };
    }
    initialize() {
      injectBaseStyles();
      const options = this.ctx.options;
      const ctx = this.ctx;
      if (options.theme) {
        ctx.themeManager.applyTheme(options.theme, ctx.containerEl);
      } else {
        ctx.themeManager.applyTheme("light", ctx.containerEl);
      }
      if (options.selection) {
        ctx.rowSelectionEngine.configure(options.selection);
      }
      if (options.editing) {
        ctx.cellEditorEngine.configure(options.editing);
      }
      if (options.pagination) {
        ctx.paginationEngine.configure({
          enabled: options.pagination.enabled ?? false,
          page: options.pagination.page ?? 1,
          pageSize: options.pagination.pageSize ?? 50,
          pageSizeOptions: options.pagination.pageSizeOptions ?? [10, 25, 50, 100],
          serverSide: options.pagination.serverSide ?? false,
          totalRows: options.pagination.totalRows
        });
      }
      if (options.columns?.length) {
        if (this.displayGroupEngine) {
          ctx.columnModel.initColumns(collectLeaves(options.columns));
        } else if (this.columnGroupModel) {
          this.columnGroupModel.init(options.columns);
          ctx.columnModel.initColumns(this.columnGroupModel.getAllLeaves());
        } else {
          ctx.columnModel.initColumns(options.columns);
        }
      }
      if (options.columnState) {
        ctx.columnModel.applyColumnStates(options.columnState);
      }
      if (options.sortConfig?.length) {
        ctx.sortEngine.multiSort(options.sortConfig);
      }
      if (options.filterModel) {
        ctx.filterEngine.setFilterModel(options.filterModel);
      }
      if (options.grouping?.groupedColumns?.length) {
        for (const colId of options.grouping.groupedColumns) {
          ctx.groupingEngine.addGroupColumn(colId);
        }
      }
      ctx.renderer.mount();
      const gridWrapper = ctx.containerEl.querySelector(".pg-grid") ?? ctx.containerEl;
      const chartPanel = new ChartPanel(gridWrapper);
      const chartAnalyzer = new ChartAnalyzer();
      ctx.cellSelectionEngine.setChartOpenCallback((type) => {
        const ranges = ctx.store.get("cellRanges");
        const rows = ctx.store.get("visibleRows");
        const cols = ctx.columnModel.getVisibleColumns();
        const result = chartAnalyzer.analyzeForType(type, ranges, rows, cols);
        chartPanel.open(type, result?.title ?? "", result?.data ?? null);
      });
      ctx.renderer.setSearchCallback((term) => this.api.setQuickFilter(term));
      if (this.columnGroupModel) {
        this.api.setColumnGroupModel(this.columnGroupModel);
      }
      if (options.data?.length) {
        this.api.setData(options.data);
      }
      if (options.enableStateManagement && options.stateKey) {
        this.loadState(options.stateKey);
      }
      this.wireEventHandlers(ctx);
      this.wireEditing(ctx);
      ctx.eventBus.emit(GridEventType.READY, { api: this.api });
      options.onReady?.(this.api);
    }
    wireEventHandlers(ctx) {
      ctx.eventBus.on(GridEventType.SORT_CHANGED, () => {
        const currentRows = ctx.store.get("visibleRows");
        if (currentRows.length > 0) {
          ctx.renderer.captureRowAnimation(currentRows);
        }
        this.api.refresh();
      });
      ctx.eventBus.on(GridEventType.FILTER_CHANGED, () => {
        const currentRows = ctx.store.get("visibleRows");
        if (currentRows.length > 0) ctx.renderer.captureRowAnimation(currentRows, "filter");
      });
      ctx.eventBus.on(GridEventType.PAGE_CHANGED, () => this.api.refresh());
      ctx.eventBus.on(GridEventType.PAGE_SIZE_CHANGED, () => this.api.refresh());
      ctx.eventBus.on(GridEventType.ROW_GROUP_OPENED, (payload) => {
        const p = payload;
        const currentRows = ctx.store.get("visibleRows");
        if (currentRows.length > 0) ctx.renderer.captureRowAnimation(currentRows, "filter");
        ctx.groupingEngine.toggleGroup(p.groupKey);
        this.api.refresh();
      });
      let prevGroupedIds = [];
      ctx.eventBus.on(GridEventType.COLUMN_GROUP_CHANGED, () => {
        const newIds = ctx.store.get("groupedColumnIds");
        for (const id of newIds) {
          if (!prevGroupedIds.includes(id)) ctx.columnModel.setColumnVisible(id, false);
        }
        for (const id of prevGroupedIds) {
          if (!newIds.includes(id)) ctx.columnModel.setColumnVisible(id, true);
        }
        prevGroupedIds = [...newIds];
        this.api.refresh();
      });
    }
    /**
     * Wires cell-editing activation and teardown based on the configured
     * `editing.singleClickEdit` flag.
     *
     * - `singleClickEdit: true`  → edit starts on the first click (CELL_CLICKED)
     * - `singleClickEdit: false` → edit starts on double-click (CELL_DOUBLE_CLICKED, default)
     *
     * On `CELL_EDIT_STOP` the cell's inner DOM is immediately restored with the
     * committed (or cancelled) value — no full grid refresh required.
     */
    wireEditing(ctx) {
      if (ctx.options.editing?.mode === "none") return;
      let activeInnerEl = null;
      let activeRow = null;
      let activeColDef = null;
      let activeDropdown = null;
      const startCellEdit = (payload) => {
        const p = payload;
        const { row, colDef } = p;
        if (row.type !== "data") return;
        if (!colDef.editable) return;
        if (ctx.cellEditorEngine.isCellEditing(row.nodeId, colDef.colId)) return;
        const cellEl = ctx.containerEl.querySelector(
          `[data-node-id="${row.nodeId}"] [data-col-id="${colDef.colId}"]`
        );
        if (!cellEl) return;
        const innerEl = cellEl.querySelector(".pg-cell__inner");
        if (!innerEl) return;
        if (ctx.cellEditorEngine.isEditing()) {
          ctx.cellEditorEngine.stopEditing(false);
        }
        activeInnerEl = innerEl;
        activeRow = row;
        activeColDef = colDef;
        innerEl.innerHTML = "";
        const started = ctx.cellEditorEngine.startEditing(row, colDef, cellEl);
        if (!started) {
          this.renderCellValue(innerEl, row, colDef);
          activeInnerEl = activeRow = activeColDef = null;
          return;
        }
        const value = row.data[colDef.field];
        if (colDef.type === "dropdown" || colDef.type === "object") {
          const resolvedOpts = colDef.dropdownOptions ?? (colDef.enumOptions?.map((v) => ({ value: v, label: v })) ?? []);
          activeDropdown = new CustomDropdownEditor(
            innerEl,
            cellEl,
            resolvedOpts,
            value,
            {
              onSelect: (opt) => {
                ctx.cellEditorEngine.updateValue(
                  colDef.type === "object" ? opt : opt.value
                );
              },
              onStop: (commit) => {
                ctx.cellEditorEngine.stopEditing(!commit);
              },
              onTab: handleTabEdit
            }
          );
        } else {
          ctx.cellEditorEngine.buildNativeEditor(colDef, value, innerEl);
        }
      };
      const closeEditorOnColumnChange = () => {
        if (ctx.cellEditorEngine.isEditing()) ctx.cellEditorEngine.stopEditing(false);
      };
      ctx.eventBus.on(GridEventType.COLUMN_RESIZED, closeEditorOnColumnChange);
      ctx.eventBus.on(GridEventType.COLUMN_MOVED, closeEditorOnColumnChange);
      ctx.eventBus.on(GridEventType.CELL_EDIT_STOP, () => {
        activeDropdown?.destroy();
        activeDropdown = null;
        if (!activeInnerEl || !activeRow || !activeColDef) return;
        const innerEl = activeInnerEl;
        const row = activeRow;
        const colDef = activeColDef;
        activeInnerEl = activeRow = activeColDef = null;
        this.renderCellValue(innerEl, row, colDef);
      });
      ctx.eventBus.on(GridEventType.CELL_VALUE_CHANGED, (payload) => {
        const p = payload;
        ctx.undoRedoEngine.record({
          type: "edit",
          changes: [{
            nodeId: p.row.nodeId,
            field: p.colDef.field,
            oldValue: p.oldValue,
            newValue: p.newValue
          }]
        });
        this.api.refresh();
      });
      const handleTabEdit = (shiftKey) => {
        const rows = ctx.store.get("visibleRows");
        const cols = ctx.columnModel.getVisibleColumns();
        const activeCell = ctx.store.get("activeCell");
        if (!activeCell) return;
        ctx.cellSelectionEngine.moveActiveCell(
          0,
          shiftKey ? -1 : 1,
          rows.length,
          cols.length,
          false
        );
        const newActive = ctx.store.get("activeCell");
        if (!newActive) return;
        const row = rows[newActive.rowIndex];
        const col = cols[newActive.colIndex];
        if (!row || !col || !col.editable) return;
        startCellEdit({ row, colDef: col });
      };
      ctx.cellEditorEngine.setTabHandler(handleTabEdit);
      const trigger = ctx.options.editing?.singleClickEdit ? GridEventType.CELL_CLICKED : GridEventType.CELL_DOUBLE_CLICKED;
      ctx.eventBus.on(trigger, startCellEdit);
      ctx.cellSelectionEngine.setEnterEditHandler((rowIndex, colIndex) => {
        if (ctx.cellEditorEngine.isEditing()) return false;
        const rows = ctx.store.get("visibleRows");
        const cols = ctx.columnModel.getVisibleColumns();
        const row = rows[rowIndex];
        const colDef = cols[colIndex];
        if (!row || row.type !== "data" || !colDef || !colDef.editable) return false;
        startCellEdit({ row, colDef });
        return true;
      });
    }
    /**
     * Re-renders the display content of a cell's inner element after an edit
     * session ends, using the current value from `row.data`.
     *
     * Rendering priority:
     * 1. `colDef.cellRendererFn` — custom renderer function (e.g. flag icons)
     * 2. `colDef.renderHtml`     — raw HTML string
     * 3. Built-in type rendering — boolean, dropdown, array, formatted text
     */
    renderCellValue(innerEl, row, colDef) {
      innerEl.innerHTML = "";
      const value = row.data[colDef.field];
      if (colDef.cellRendererFn) {
        const cols = this.ctx.columnModel.getVisibleColumns();
        const colIndex = cols.findIndex((c) => c.colId === colDef.colId);
        const params = {
          value,
          rawValue: value,
          row: row.data,
          colDef,
          rowIndex: row.rowIndex,
          colIndex,
          api: this.api
        };
        const rendered = colDef.cellRendererFn(params);
        if (typeof rendered === "string") {
          innerEl.innerHTML = rendered;
        } else {
          innerEl.appendChild(rendered);
        }
        return;
      }
      if (colDef.renderHtml) {
        innerEl.innerHTML = String(value ?? "");
        return;
      }
      const span = document.createElement("span");
      span.className = "pg-cell__value";
      switch (colDef.type) {
        case "boolean": {
          span.textContent = value ? "\u2713" : "";
          span.classList.add(value ? "pg-cell--bool-true" : "pg-cell--bool-false");
          break;
        }
        case "dropdown":
        case "object": {
          const key = colDef.type === "object" && typeof value === "object" && value !== null ? value[colDef.objectValueKey ?? "value"] : value;
          const opt = colDef.dropdownOptions?.find((o) => String(o.value) === String(key ?? ""));
          if (opt?.color) {
            const badge = document.createElement("div");
            badge.className = "pg-badge";
            badge.style.backgroundColor = opt.color + "20";
            badge.style.color = opt.color;
            badge.textContent = opt.label;
            span.appendChild(badge);
          } else {
            span.textContent = opt?.label ?? String(key ?? "");
          }
          break;
        }
        case "array": {
          span.className = "pg-cell__value pg-cell__value--tags";
          const vals = Array.isArray(value) ? value.map(String) : [];
          const visible = vals.slice(0, 3);
          for (const v of visible) {
            const opt = colDef.dropdownOptions?.find((o) => String(o.value) === v);
            const badge = document.createElement("div");
            badge.className = "pg-badge";
            badge.textContent = opt?.label ?? v;
            if (opt?.color) {
              badge.style.backgroundColor = opt.color + "20";
              badge.style.color = opt.color;
            }
            span.appendChild(badge);
          }
          if (vals.length > visible.length) {
            const more = document.createElement("div");
            more.className = "pg-badge pg-badge--overflow";
            more.textContent = `+${vals.length - visible.length}`;
            span.appendChild(more);
          }
          break;
        }
        default: {
          const formatted = formatValue(value, colDef, {
            locale: this.ctx.options.locale,
            dateFormat: this.ctx.options.dateFormat,
            timeZone: this.ctx.options.timeZone,
            currencySymbol: this.ctx.options.currencySymbol
          });
          span.textContent = formatted || "\u2014";
          span.title = formatted || "";
        }
      }
      innerEl.appendChild(span);
    }
    loadState(stateKey) {
      try {
        const raw = localStorage.getItem(`photon_grid_${stateKey}`);
        if (raw) {
          const state = JSON.parse(raw);
          this.api.applyGridState(state);
        }
        this.ctx.eventBus.on(GridEventType.COLUMNS_STATE_CHANGED, () => {
          const state = this.api.getGridState();
          localStorage.setItem(`photon_grid_${stateKey}`, JSON.stringify(state));
        });
      } catch {
      }
    }
    destroy() {
      this.api.destroy();
    }
  };

  // demo/demo.ts
  function generateEmployees(count) {
    const firstNames2 = [
      "James",
      "Mary",
      "John",
      "Patricia",
      "Robert",
      "Jennifer",
      "Michael",
      "Linda",
      "William",
      "Barbara",
      "David",
      "Elizabeth",
      "Richard",
      "Susan",
      "Joseph",
      "Jessica",
      "Thomas",
      "Sarah",
      "Charles",
      "Karen",
      "Christopher",
      "Lisa",
      "Daniel",
      "Nancy",
      "Matthew",
      "Betty",
      "Anthony",
      "Margaret",
      "Mark",
      "Sandra",
      "Donald",
      "Ashley",
      "Steven",
      "Dorothy",
      "Paul",
      "Kimberly",
      "Andrew",
      "Emily",
      "Joshua",
      "Donna",
      "Kevin",
      "Michelle",
      "Brian",
      "Carol",
      "George",
      "Amanda",
      "Timothy",
      "Melissa",
      "Ronald",
      "Deborah",
      "Ryan",
      "Stephanie",
      "Jacob",
      "Rebecca",
      "Gary",
      "Sharon",
      "Eric",
      "Laura",
      "Jonathan",
      "Cynthia",
      "Stephen",
      "Kathleen",
      "Larry",
      "Amy"
    ];
    const lastNames2 = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Wilson",
      "Anderson",
      "Thomas",
      "Taylor",
      "Moore",
      "Jackson",
      "Martin",
      "Lee",
      "Perez",
      "Thompson",
      "White",
      "Harris",
      "Sanchez",
      "Clark",
      "Ramirez",
      "Lewis",
      "Robinson",
      "Walker",
      "Young",
      "Allen",
      "King",
      "Wright",
      "Scott",
      "Torres",
      "Nguyen",
      "Hill",
      "Flores",
      "Green",
      "Adams",
      "Nelson",
      "Baker",
      "Hall",
      "Rivera",
      "Campbell",
      "Mitchell",
      "Carter",
      "Roberts",
      "Phillips",
      "Evans",
      "Turner",
      "Torres",
      "Parker",
      "Collins",
      "Edwards",
      "Stewart",
      "Flores",
      "Morris",
      "Nguyen",
      "Murphy",
      "Rivera",
      "Cook",
      "Choudhry Asghar khan kiyani"
    ];
    const departments = [
      "Engineering",
      "Finance",
      "Human Resources",
      "Marketing",
      "Sales",
      "Operations",
      "Legal",
      "IT Support",
      "Product",
      "Design"
    ];
    const genders = ["Male", "Female", "Non-binary", "Prefer not to say"];
    const employeeTypes = ["Full-time", "Part-time", "Contract", "Intern"];
    const accountStatuses = ["Active", "Inactive", "Suspended"];
    const attendancePolicies = ["Standard (9-5)", "Flexible Hours", "Remote", "Shift-based", "Hybrid"];
    const paySchedules = ["Weekly", "Bi-weekly", "Monthly", "Semi-monthly"];
    const paymentMethods = ["Direct Deposit", "Check", "Wire Transfer", "ACH"];
    const weekHourOptions = [20, 30, 35, 40, 45, 48];
    const otRateOptions = [1.25, 1.5, 1.75, 2];
    const rolesByDept = {
      "Engineering": ["Software Engineer", "Senior Engineer", "Tech Lead", "DevOps Engineer", "QA Engineer"],
      "Finance": ["Financial Analyst", "Accountant", "CFO", "Budget Analyst", "Controller"],
      "Human Resources": ["HR Manager", "Recruiter", "HR Specialist", "Talent Acquisition", "HR Business Partner"],
      "Marketing": ["Marketing Manager", "Content Strategist", "SEO Specialist", "Brand Manager", "Campaign Manager"],
      "Sales": ["Sales Executive", "Account Manager", "Sales Director", "Business Development Rep", "Inside Sales Rep"],
      "Operations": ["Operations Manager", "Supply Chain Analyst", "Logistics Coordinator", "Process Manager", "Ops Analyst"],
      "Legal": ["Legal Counsel", "Paralegal", "Compliance Officer", "Contract Manager", "General Counsel"],
      "IT Support": ["IT Specialist", "Systems Administrator", "Network Engineer", "Help Desk Analyst", "IT Manager"],
      "Product": ["Product Manager", "Product Owner", "Product Analyst", "Product Director", "VP of Product"],
      "Design": ["UX Designer", "UI Designer", "Graphic Designer", "Design Lead", "Creative Director"]
    };
    const geography = {
      "United States": {
        regions: ["California", "Texas", "New York", "Florida", "Illinois", "Washington", "Colorado", "Georgia"],
        cities: {
          "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose"],
          "Texas": ["Houston", "Dallas", "Austin", "San Antonio"],
          "New York": ["New York City", "Buffalo", "Albany", "Rochester"],
          "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville"],
          "Illinois": ["Chicago", "Aurora", "Rockford", "Naperville"],
          "Washington": ["Seattle", "Spokane", "Tacoma", "Bellevue"],
          "Colorado": ["Denver", "Colorado Springs", "Aurora", "Fort Collins"],
          "Georgia": ["Atlanta", "Augusta", "Savannah", "Athens"]
        }
      },
      "United Kingdom": {
        regions: ["England", "Scotland", "Wales", "Northern Ireland"],
        cities: {
          "England": ["London", "Manchester", "Birmingham", "Leeds"],
          "Scotland": ["Edinburgh", "Glasgow", "Aberdeen", "Dundee"],
          "Wales": ["Cardiff", "Swansea", "Newport", "Bangor"],
          "Northern Ireland": ["Belfast", "Derry", "Lisburn", "Armagh"]
        }
      },
      "Canada": {
        regions: ["Ontario", "Quebec", "British Columbia", "Alberta"],
        cities: {
          "Ontario": ["Toronto", "Ottawa", "Hamilton", "London"],
          "Quebec": ["Montreal", "Quebec City", "Laval", "Gatineau"],
          "British Columbia": ["Vancouver", "Victoria", "Kelowna", "Surrey"],
          "Alberta": ["Calgary", "Edmonton", "Red Deer", "Lethbridge"]
        }
      },
      "Germany": {
        regions: ["Bavaria", "Berlin", "Hamburg", "North Rhine-Westphalia"],
        cities: {
          "Bavaria": ["Munich", "Nuremberg", "Augsburg", "Regensburg"],
          "Berlin": ["Berlin", "Potsdam", "Brandenburg", "Frankfurt (Oder)"],
          "Hamburg": ["Hamburg", "L\xFCbeck", "Flensburg", "Kiel"],
          "North Rhine-Westphalia": ["Cologne", "D\xFCsseldorf", "Dortmund", "Essen"]
        }
      },
      "France": {
        regions: ["\xCEle-de-France", "Provence", "Occitanie", "Nouvelle-Aquitaine"],
        cities: {
          "\xCEle-de-France": ["Paris", "Versailles", "Boulogne-Billancourt", "Saint-Denis"],
          "Provence": ["Marseille", "Nice", "Toulon", "Aix-en-Provence"],
          "Occitanie": ["Toulouse", "Montpellier", "N\xEEmes", "Perpignan"],
          "Nouvelle-Aquitaine": ["Bordeaux", "Limoges", "Pau", "Bayonne"]
        }
      },
      "Australia": {
        regions: ["New South Wales", "Victoria", "Queensland", "Western Australia"],
        cities: {
          "New South Wales": ["Sydney", "Newcastle", "Wollongong", "Canberra"],
          "Victoria": ["Melbourne", "Geelong", "Ballarat", "Bendigo"],
          "Queensland": ["Brisbane", "Gold Coast", "Sunshine Coast", "Townsville"],
          "Western Australia": ["Perth", "Fremantle", "Bunbury", "Mandurah"]
        }
      },
      "India": {
        regions: ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu"],
        cities: {
          "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik"],
          "Karnataka": ["Bengaluru", "Mysuru", "Hubli", "Mangaluru"],
          "Delhi": ["New Delhi", "Noida", "Gurugram", "Faridabad"],
          "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"]
        }
      },
      "United Arab Emirates": {
        regions: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
        cities: {
          "Dubai": ["Dubai", "Deira", "Bur Dubai", "Jumeirah"],
          "Abu Dhabi": ["Abu Dhabi", "Al Ain", "Ruwais", "Khalifa City"],
          "Sharjah": ["Sharjah", "Khor Fakkan", "Kalba", "Dibba Al Hisn"],
          "Ajman": ["Ajman", "Al Jurf", "Al Rashidiya", "Al Hamidiyah"]
        }
      },
      "Pakistan": {
        regions: ["Islamabad", "KPK", "Sindh", "Balochistan"],
        cities: {
          "Islamabad": ["Gulberg", "DHA", "G12", "I8"],
          "KPK": ["Abu Dhabi", "Dir", "Peshawer", "Mardan"],
          "Sindh": ["Kashmor", "Karachi", "Faisalabad", "Haiderabad"],
          "Balochistan": ["Abu City", "Lahore", "Queta", "Gulshan Iqbal"]
        }
      }
    };
    const countries2 = Object.keys(geography);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pad = (n, len) => String(n).padStart(len, "0");
    const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
    const randomPastDate = (yearsBack) => {
      const now = Date.now();
      const past = now - yearsBack * 365.25 * 24 * 60 * 60 * 1e3;
      return new Date(past + Math.random() * (now - past));
    };
    const addDays = (d, days) => {
      const r = new Date(d);
      r.setDate(r.getDate() + days);
      return r;
    };
    const records = [];
    for (let i = 0; i < count; i++) {
      const firstName = pick(firstNames2);
      const lastName = pick(lastNames2);
      const dept = pick(departments);
      const country = pick(countries2);
      const countryGeo = geography[country];
      const region = pick(countryGeo.regions);
      const city = pick(countryGeo.cities[region] ?? ["Unknown"]);
      const hiringD = randomPastDate(6);
      const joiningD = addDays(hiringD, rand(7, 90));
      const baseSalary = rand(32e3, 195e3);
      let value = Math.floor(Math.random() * 100) + 1;
      const salaryHistory = Array.from({ length: 30 }, () => {
        value += Math.floor(Math.random() * 11) - 5;
        value = Math.max(1, Math.min(100, value));
        return value;
      });
      records.push({
        id: `EMP-${pad(i + 1, 5)}`,
        employeeName: `${firstName} ${lastName}`,
        department: dept,
        gender: pick(genders),
        contactNo: `+1 ${rand(200, 999)}-${rand(100, 999)}-${pad(rand(1e3, 9999), 4)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rand(1, 99)}@company.com`,
        employeeType: pick(employeeTypes),
        accountStatus: Math.random() < 0.82 ? "Active" : pick(accountStatuses.filter((s) => s !== "Active")),
        authPin: rand(1e3, 9999),
        attendancePolicy: pick(attendancePolicies),
        role: pick(rolesByDept[dept] ?? ["Associate"]),
        weekHourLimit: pick(weekHourOptions),
        otRate: pick(otRateOptions),
        paySchedule: pick(paySchedules),
        country,
        state: region,
        city,
        hiringDate: isoDate(hiringD),
        joiningDate: isoDate(joiningD),
        salary: baseSalary,
        paymentMethod: pick(paymentMethods),
        salaryHistory
      });
    }
    return records;
  }
  var countryFlagCodes = {
    "United States": "us",
    "United Kingdom": "gb",
    "Canada": "ca",
    "Germany": "de",
    "France": "fr",
    "Australia": "au",
    "India": "in",
    "United Arab Emirates": "ae",
    "Pakistan": "pk"
  };
  var firstNames = [
    "John",
    "Emma",
    "Liam",
    "Olivia",
    "Noah",
    "Sophia",
    "James",
    "Mia",
    "Lucas",
    "Charlotte",
    "Daniel",
    "Amelia"
  ];
  var lastNames = [
    "Smith",
    "Johnson",
    "Brown",
    "Williams",
    "Jones",
    "Miller",
    "Wilson",
    "Taylor",
    "Moore",
    "Thomas"
  ];
  var countries = [
    "United States",
    "Canada",
    "Germany",
    "France",
    "United Kingdom",
    "Australia",
    "Pakistan",
    "India",
    "Japan",
    "Brazil"
  ];
  var languages = [
    "English",
    "German",
    "French",
    "Spanish",
    "Urdu",
    "Hindi",
    "Japanese",
    "Chinese"
  ];
  var games = [
    "Counter Strike 2",
    "Valorant",
    "PUBG",
    "Fortnite",
    "Minecraft",
    "Dota 2",
    "League of Legends",
    "Rocket League",
    "Apex Legends",
    "Call of Duty"
  ];
  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function randomFloat(min, max, digits = 2) {
    return Number((Math.random() * (max - min) + min).toFixed(digits));
  }
  function generatePlayerData(count) {
    return Array.from({ length: count }, (_, i) => {
      const bankBalance = random(500, 5e4);
      const totalWinning = random(0, 2e5);
      return {
        id: i + 1,
        // Participant
        name: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
        language: randomItem(languages),
        country: randomItem(countries),
        // Game of Choice
        gameName: randomItem(games),
        bought: Math.random() > 0.5,
        // Performance
        bankBalance,
        rating: randomFloat(1, 5, 1),
        totalWinning,
        // Monthly Breakdown
        january: random(0, 15e3),
        february: random(0, 15e3),
        march: random(0, 15e3),
        april: random(0, 15e3),
        may: random(0, 15e3),
        june: random(0, 15e3),
        july: random(0, 15e3),
        august: random(0, 15e3),
        september: random(0, 15e3),
        october: random(0, 15e3),
        november: random(0, 15e3),
        december: random(0, 15e3)
      };
    });
  }
  var playerColumns = [
    // ───────────────────────────────────────────────────────────────
    // Participant
    // ───────────────────────────────────────────────────────────────
    {
      colId: "grp_participant",
      header: "Participant",
      openByDefault: true,
      field: "",
      type: "string",
      marryChildren: false,
      children: [
        {
          colId: "name",
          field: "name",
          header: "Name",
          type: "string",
          width: 180,
          sortable: true,
          filterable: true,
          editable: true,
          resizable: true,
          rowDrag: true
        },
        {
          colId: "language",
          field: "language",
          header: "Language",
          type: "dropdown",
          width: 140,
          sortable: true,
          filterable: true,
          editable: true,
          groupable: true,
          enumOptions: [
            "English",
            "German",
            "French",
            "Spanish",
            "Urdu",
            "Hindi",
            "Japanese",
            "Chinese"
          ]
        },
        {
          colId: "country",
          field: "country",
          header: "Country",
          type: "dropdown",
          width: 170,
          sortable: true,
          filterable: true,
          editable: true,
          groupable: true,
          dropdownOptions: [
            { label: "United States", value: "United States" },
            { label: "United Kingdom", value: "United Kingdom" },
            { label: "Canada", value: "Canada" },
            { label: "Germany", value: "Germany" },
            { label: "France", value: "France" },
            { label: "Australia", value: "Australia" },
            { label: "India", value: "India" },
            { label: "United Arab Emirates", value: "United Arab Emirates" },
            { label: "Pakistan", value: "Pakistan" }
          ],
          cellRendererFn: ({ value }) => {
            const name = String(value ?? "");
            const code = countryFlagCodes[name] ?? "un";
            return `${name ? `<span style="display:flex;align-items:center;gap:7px"><img src="https://flagcdn.com/w20/${code}.png" width="20" height="14" style="border-radius:2px;object-fit:cover;flex-shrink:0" />` : ""}${name}</span>`;
          }
        }
      ]
    },
    // ───────────────────────────────────────────────────────────────
    // Game of Choice
    // ───────────────────────────────────────────────────────────────
    {
      colId: "grp_game",
      header: "Game of Choice",
      openByDefault: true,
      field: "",
      type: "string",
      marryChildren: false,
      children: [
        {
          colId: "gameName",
          field: "gameName",
          header: "Game Name",
          type: "string",
          width: 190,
          sortable: true,
          filterable: true,
          editable: true
        },
        {
          colId: "bought",
          field: "bought",
          header: "Bought",
          type: "boolean",
          width: 110,
          sortable: true,
          filterable: true,
          editable: true
        }
      ]
    },
    // ───────────────────────────────────────────────────────────────
    // Performance
    // ───────────────────────────────────────────────────────────────
    {
      colId: "grp_performance",
      header: "Performance",
      openByDefault: true,
      field: "",
      type: "string",
      marryChildren: false,
      children: [
        {
          colId: "bankBalance",
          field: "bankBalance",
          header: "Bank Balance",
          type: "currency",
          width: 160,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        }
      ]
    },
    // ───────────────────────────────────────────────────────────────
    // Flat Columns
    // ───────────────────────────────────────────────────────────────
    {
      colId: "rating",
      field: "rating",
      header: "Rating",
      type: "number",
      width: 120,
      cellRendererFn: ({ value }) => {
        const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
        return `
        <span style="color:#f59e0b;font-size:16px;letter-spacing:1px;">
          ${"\u2605".repeat(rating)}
        </span>
      `;
      },
      sortable: true,
      filterable: true,
      editable: true,
      aggFunc: "avg"
    },
    {
      colId: "totalWinning",
      field: "totalWinning",
      header: "Total Winning",
      type: "currency",
      width: 170,
      sortable: true,
      filterable: true,
      editable: true,
      aggFunc: "sum"
    },
    // ───────────────────────────────────────────────────────────────
    // Monthly Breakdown
    // ───────────────────────────────────────────────────────────────
    {
      colId: "grp_monthly",
      header: "Monthly Breakdown",
      openByDefault: true,
      type: "string",
      field: "",
      marryChildren: false,
      children: [
        {
          colId: "january",
          field: "january",
          header: "January",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "february",
          field: "february",
          header: "February",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "march",
          field: "march",
          header: "March",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "april",
          field: "april",
          header: "April",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "may",
          field: "may",
          header: "May",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "june",
          field: "june",
          header: "June",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "july",
          field: "july",
          header: "July",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "august",
          field: "august",
          header: "August",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "september",
          field: "september",
          header: "September",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "october",
          field: "october",
          header: "October",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "november",
          field: "november",
          header: "November",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        },
        {
          colId: "december",
          field: "december",
          header: "December",
          type: "currency",
          width: 130,
          sortable: true,
          filterable: true,
          editable: true,
          aggFunc: "sum"
        }
      ]
    }
  ];
  document.addEventListener("DOMContentLoaded", () => {
    const data = generateEmployees(1e3);
    const playerData = generatePlayerData(1e3);
    const options = {
      columns: playerColumns,
      data: playerData,
      theme: "light",
      showCheckboxes: false,
      showSerialNumber: false,
      showVerticalBorders: false,
      rowShading: false,
      showSidePanel: true,
      // showFilterRow: true,
      footerRowHeight: 48,
      rowHeight: 42,
      showFooter: true,
      rowHeightMode: "fixed",
      showColumnMenu: true,
      dateFormat: "dd/MM/yyyy",
      currencySymbol: "$",
      locale: "en-US",
      pagination: {
        enabled: true,
        page: 1,
        pageSize: 1e5,
        pageSizeOptions: [5, 10, 15, 20, 50],
        serverSide: false
      },
      selection: {
        mode: "multiple",
        checkboxSelection: true,
        headerCheckbox: true
      },
      editing: {
        mode: "row",
        singleClickEdit: false
      },
      enableCellSelection: true,
      showGroupingBar: true
    };
    const container = document.getElementById("grid-container");
    const themeSelect = document.getElementById("theme-select");
    const allThemes = [
      "pg-quartz-theme",
      "pg-alpine-theme",
      "pg-balham-theme",
      "pg-material-theme",
      "pg-dark-theme"
    ];
    const applyTheme = (theme) => {
      allThemes.forEach((t) => container.classList.remove(t));
      container.classList.add(theme);
      document.body.classList.toggle("demo-dark", theme === "pg-dark-theme");
    };
    applyTheme(themeSelect.value);
    themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
    const grid = new GridCore(container, options);
    const salaryByNodeId = new Map(
      grid.api.getAllRows().filter((r) => Array.isArray(r.data.salaryHistory)).map((r) => [r.nodeId, r.data.salary])
    );
  });
  return __toCommonJS(demo_exports);
})();
//# sourceMappingURL=demo.bundle.js.map
