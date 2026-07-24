/**
 * Photon Grid base styles — import-menu section.
 *
 * Concatenated (in order) by base-styles.ts; edit here, not there. Order is
 * preserved because CSS cascade depends on it.
 *
 * Every value is a theme variable (with a sensible fallback) so the Import
 * launcher, dropdown and menu items re-theme with the rest of the grid — light,
 * dark and custom themes — with zero inline styles anywhere in the component.
 */
export const importMenuCss = `/* ──────────────────── Import Menu ──────────────────── */

/* Launcher — an "Import" pill living in the shared .pg-grid__tools bar
   (see filters-tool-panel.css.ts). 'order' places it to the right of the
   Filters funnel; the bar handles absolute positioning and stacking. */
.pg-import-launcher {
  order: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-surface, #ffffff);
  color: var(--pg-colors-text-secondary, #64748b);
  box-shadow: var(--pg-shadows-sm, 0 1px 2px rgba(15, 23, 42, 0.08));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    border-color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-import-launcher:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
  border-color: var(--pg-colors-border-strong, #cbd5e1);
}
.pg-import-launcher:focus-visible {
  outline: 2px solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}
.pg-import-launcher__icon,
.pg-import-launcher__caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pg-import-launcher__icon svg,
.pg-import-launcher__caret svg { display: block; }
.pg-import-launcher__caret { color: var(--pg-colors-text-disabled, #94a3b8); }
.pg-import-launcher__label { line-height: 1; }

/* Dropdown menu — anchored below the launcher, clipped to the grid. */
.pg-import-menu {
  position: absolute;
  top: 48px;
  right: 8px;
  z-index: var(--pg-z-index-filter-panel, 200);
  min-width: 220px;
  display: none;
  flex-direction: column;
  padding: 4px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-lg, 10px);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-import-menu--open { display: flex; }

.pg-import-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-import-menu__item:hover,
.pg-import-menu__item:focus-visible {
  background: var(--pg-colors-selection-background, rgba(37, 99, 235, 0.12));
  outline: none;
}
.pg-import-menu__item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-import-menu__item-icon svg { display: block; }
.pg-import-menu__item-label { flex: 1; line-height: 1.2; }

/* Hidden native file input — visually removed but still programmatically
   clickable (kept in the layout box rather than display:none). */
.pg-import-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
`;
