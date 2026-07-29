/**
 * Photon Grid base styles — theme-manager section.
 *
 * Concatenated (in order) by base-styles.ts; edit here, not there.
 *
 * Styles for the top-right "Theme" launcher and its dropdown (saved themes +
 * export/import/reset). Every value is a theme variable with a sensible
 * fallback, so the panel re-themes with the grid — including any AI-generated
 * theme applied to it — with zero inline styles.
 */
export const themeManagerCss = `/* ──────────────────── Theme Manager ──────────────────── */

/* Launcher — a pill in the shared .pg-grid__tools right region. */
.pg-theme-mgr-launcher {
  order: 3;
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
.pg-theme-mgr-launcher:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
  border-color: var(--pg-colors-border-strong, #cbd5e1);
}
.pg-theme-mgr-launcher:focus-visible {
  outline: 2px solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}
.pg-theme-mgr-launcher__icon { display: inline-flex; align-items: center; justify-content: center; }
.pg-theme-mgr-launcher__icon svg { display: block; }
.pg-theme-mgr-launcher__label { line-height: 1; }

/* Dropdown — anchored below the launcher, clipped to the grid. */
.pg-theme-mgr-menu {
  position: absolute;
  top: 48px;
  right: 8px;
  z-index: var(--pg-z-index-filter-panel, 200);
  width: min(280px, calc(100% - 16px));
  max-height: calc(100% - 64px);
  display: none;
  flex-direction: column;
  padding: 8px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-lg, 10px);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-theme-mgr-menu--open { display: flex; }

.pg-theme-mgr-menu__title {
  padding: 2px 6px 6px;
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pg-colors-text-secondary, #64748b);
}

.pg-theme-mgr-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow-y: auto;
}
.pg-theme-mgr-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 8px;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-colors-text-primary, #0f172a);
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pg-theme-mgr-item:hover { background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-theme-mgr-item--active {
  color: var(--pg-colors-primary, #2563eb);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
}
.pg-theme-mgr-empty {
  padding: 8px;
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
}

.pg-theme-mgr-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-theme-mgr-action {
  flex: 1;
  height: 30px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-surface, #ffffff);
  color: var(--pg-colors-text-primary, #0f172a);
  font: inherit;
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-theme-mgr-action:hover { background: var(--pg-colors-background-alt, #f1f5f9); }

/* Hidden file input for import. */
.pg-theme-mgr-file { display: none; }
`;
