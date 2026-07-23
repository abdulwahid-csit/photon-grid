/**
 * Photon Grid base styles — filters-tool-panel section.
 *
 * Concatenated (in order) by base-styles.ts; edit here, not there. Order is
 * preserved because CSS cascade depends on it.
 *
 * Every value is a theme variable (with a sensible fallback) so the panel
 * re-themes with the rest of the grid — light, dark, and custom themes — with
 * no inline styles anywhere in the component. The section bodies reuse the
 * shared `.pg-filter-cond-*` / `.pg-filter-set__*` rules from `filter.css.ts`,
 * so the editor UI is styled once and rendered identically here and in the
 * per-column header popup.
 */
export const filtersToolPanelCss = `/* ──────────────────── Filters Tool Panel ──────────────────── */

/* Launcher — a funnel button floating at the grid's top-right corner. Absolute
   positioning keeps it out of the flex layout so it never affects row/column
   virtualization; the grid wrapper's own bounds keep it contained. */
.pg-filters-launcher {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: var(--pg-z-index-filter-panel, 200);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-surface, #ffffff);
  color: var(--pg-colors-text-secondary, #64748b);
  box-shadow: var(--pg-shadows-sm, 0 1px 2px rgba(15, 23, 42, 0.08));
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    border-color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-filters-launcher:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-filters-launcher:focus-visible {
  outline: 2px solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}
.pg-filters-launcher--has-filters {
  color: var(--pg-colors-primary, #2563eb);
  border-color: var(--pg-colors-primary, #2563eb);
}
.pg-filters-launcher__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pg-filters-launcher__icon svg { display: block; }

/* Active-count badge — a small pill pinned to the launcher's top-right corner. */
.pg-filters-launcher__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  display: none;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-primary-text, #ffffff);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  line-height: 1;
}
.pg-filters-launcher--has-filters .pg-filters-launcher__badge {
  display: inline-flex;
}

/* Panel — a floating dropdown anchored below the launcher, clipped to the grid. */
.pg-filters-panel {
  position: absolute;
  top: 48px;
  right: 8px;
  z-index: var(--pg-z-index-filter-panel, 200);
  width: min(320px, calc(100% - 16px));
  max-height: calc(100% - 64px);
  display: none;
  flex-direction: column;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-lg, 10px);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-filters-panel--open { display: flex; }

/* ── Header ── */
.pg-filters-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-filters-panel__title {
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  font-size: var(--pg-typography-font-size-md, 14px);
}
.pg-filters-panel__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-filters-panel__close:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
}

/* ── Body / sections ── */
.pg-filters-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}
.pg-filters-panel__empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--pg-colors-text-secondary, #94a3b8);
}
.pg-filters-panel__empty--hidden { display: none; }
.pg-filters-panel__sections {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Section (collapsible active filter) ── */
.pg-filters-section {
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  overflow: hidden;
}
.pg-filters-section__header {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 2px 6px;
  background: var(--pg-colors-background-alt, #f8fafc);
  cursor: pointer;
  user-select: none;
}
.pg-filters-section__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  border-radius: var(--pg-borders-radius-sm, 4px);
}
.pg-filters-section__toggle:hover { color: var(--pg-colors-text-primary, #0f172a); }
.pg-filters-section__toggle svg { display: block; }
.pg-filters-section__label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--pg-typography-font-weight-medium, 500);
}
.pg-filters-section__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--pg-colors-text-secondary, #94a3b8);
  cursor: pointer;
  border-radius: var(--pg-borders-radius-sm, 4px);
  transition: background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-filters-section__remove:hover {
  background: var(--pg-colors-danger-soft, rgba(220, 38, 38, 0.12));
  color: var(--pg-colors-danger, #dc2626);
}
.pg-filters-section__remove svg { display: block; }

/* Body is collapsed by default; the editor's own tokens style its contents. */
.pg-filters-section__body {
  display: none;
  border-top: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-filters-section--expanded .pg-filters-section__body { display: block; }

/* ── Footer / Add Filter ── */
.pg-filters-panel__footer {
  position: relative;
  padding: 8px;
  border-top: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-filters-panel__add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px dashed var(--pg-colors-border-strong, var(--pg-colors-border, #cbd5e1));
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-background-alt, #f8fafc);
  color: var(--pg-colors-primary, #2563eb);
  font-family: inherit;
  font-size: var(--pg-typography-font-size-sm, 13px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    border-color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-filters-panel__add-btn:hover {
  background: var(--pg-colors-primary-soft, rgba(37, 99, 235, 0.1));
  border-color: var(--pg-colors-primary, #2563eb);
}
.pg-filters-panel__add-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pg-filters-panel__add-icon svg { display: block; }

/* Column picker — a popover floating above the Add-Filter button. */
.pg-filters-panel__add-dropdown {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 50px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  max-height: 260px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-dropdown, 0 12px 32px rgba(15, 23, 42, 0.18));
  overflow: hidden;
}
.pg-filters-panel__search {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-filters-panel__search-icon {
  position: absolute;
  left: 18px;
  display: inline-flex;
  color: var(--pg-colors-text-secondary, #94a3b8);
  pointer-events: none;
}
.pg-filters-panel__search-input {
  width: 100%;
  padding: 7px 10px 7px 28px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-background, #ffffff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: inherit;
  font-size: inherit;
  outline: none;
  transition:
    border-color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    box-shadow var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-filters-panel__search-input:focus {
  border-color: var(--pg-colors-primary, #2563eb);
  box-shadow: 0 0 0 2px var(--pg-colors-primary-soft, rgba(37, 99, 235, 0.16));
}
.pg-filters-panel__search-input::placeholder {
  color: var(--pg-colors-text-secondary, #94a3b8);
}
.pg-filters-panel__col-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
}
.pg-filters-panel__col-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 30px;
  padding: 4px 8px;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: inherit;
  font-size: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-filters-panel__col-item:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
}
.pg-filters-panel__col-empty {
  padding: 14px 8px;
  text-align: center;
  color: var(--pg-colors-text-secondary, #94a3b8);
}
`;
