/**
 * Photon Grid base styles — column-chooser section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 *
 * Every value is a theme variable (with a sensible fallback) so the dialog
 * re-themes with the rest of the grid — light, dark, and custom themes — with
 * no inline styles anywhere in the component.
 */
export const columnChooserCss = `/* ──────────────────── Column Chooser ──────────────────── */

/* Positioning layer only — no backdrop scrim/blur, and transparent to pointer
   events so the grid behind stays visible and interactive. The dialog itself
   re-enables pointer events; outside presses are handled by a document-level
   listener in the component. */
.pg-col-chooser__overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  pointer-events: none;
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
}

.pg-col-chooser {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  width: 320px;
  max-width: calc(100vw - 32px);
  max-height: min(70vh, 560px);
  background: var(--pg-colors-surface, #ffffff);
  color: var(--pg-colors-text-primary, #0f172a);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-lg, 10px);
  box-shadow: var(--pg-shadows-dialog, var(--pg-shadows-dropdown, 0 12px 32px rgba(15, 23, 42, 0.18)));
  font-size: var(--pg-typography-font-size-sm, 13px);
  overflow: hidden;
}

/* ── Header ── */
.pg-col-chooser__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-col-chooser__title {
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  font-size: var(--pg-typography-font-size-md, 14px);
}
.pg-col-chooser__close {
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
  transition: background var(--pg-transitions-fast, 80ms ease), color var(--pg-transitions-fast, 80ms ease);
}
.pg-col-chooser__close:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
}

/* ── Search ── */
.pg-col-chooser__search {
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 14px;
}
.pg-col-chooser__search-icon {
  position: absolute;
  left: 24px;
  display: inline-flex;
  color: var(--pg-colors-text-secondary, #94a3b8);
  pointer-events: none;
}
.pg-col-chooser__search-input {
  width: 100%;
  padding: 7px 10px 7px 30px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-background, #ffffff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: inherit;
  font-size: inherit;
  outline: none;
  transition: border-color var(--pg-transitions-fast, 80ms ease), box-shadow var(--pg-transitions-fast, 80ms ease);
}
.pg-col-chooser__search-input:focus {
  border-color: var(--pg-colors-primary, #2563eb);
  box-shadow: 0 0 0 2px var(--pg-colors-primary-soft, rgba(37, 99, 235, 0.16));
}
.pg-col-chooser__search-input::placeholder {
  color: var(--pg-colors-text-secondary, #94a3b8);
}

/* ── Body / tree ── */
.pg-col-chooser__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 8px 10px;
}
.pg-col-chooser__tree {
  display: flex;
  flex-direction: column;
}

/* Nested indentation — one step per level, so depth needs no inline geometry. */
.pg-col-chooser__children {
  display: flex;
  flex-direction: column;
  padding-left: var(--pg-spacing-md, 16px);
}

.pg-col-chooser__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 2px 6px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  cursor: pointer;
  user-select: none;
  transition: background var(--pg-transitions-fast, 80ms ease);
}
.pg-col-chooser__row:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
}
.pg-col-chooser__row--group {
  font-weight: var(--pg-typography-font-weight-medium, 500);
}

/* Expand/collapse chevron (groups) — spacer variant keeps leaves aligned. */
.pg-col-chooser__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  border-radius: var(--pg-borders-radius-sm, 4px);
}
.pg-col-chooser__toggle:hover {
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-col-chooser__toggle--spacer {
  cursor: default;
  pointer-events: none;
}

/* Themed tri-state checkbox. */
.pg-col-chooser__checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 1.5px solid var(--pg-colors-border-strong, var(--pg-colors-border, #cbd5e1));
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-background, #ffffff);
  color: transparent;
  cursor: pointer;
  transition: background var(--pg-transitions-fast, 80ms ease), border-color var(--pg-transitions-fast, 80ms ease);
}
.pg-col-chooser__checkbox > .pg-icon,
.pg-col-chooser__checkbox > svg {
  width: 12px;
  height: 12px;
  opacity: 0;
  transition: opacity var(--pg-transitions-fast, 80ms ease);
}
.pg-col-chooser__checkbox--checked {
  background: var(--pg-colors-primary, #2563eb);
  border-color: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-on-primary, #ffffff);
}
.pg-col-chooser__checkbox--checked > .pg-icon,
.pg-col-chooser__checkbox--checked > svg {
  opacity: 1;
}
/* Indeterminate (some children visible) — a dash rather than a tick. */
.pg-col-chooser__checkbox--indeterminate {
  background: var(--pg-colors-primary, #2563eb);
  border-color: var(--pg-colors-primary, #2563eb);
}
.pg-col-chooser__checkbox--indeterminate::after {
  content: "";
  width: 8px;
  height: 2px;
  border-radius: 1px;
  background: var(--pg-colors-on-primary, #ffffff);
}
.pg-col-chooser__checkbox--indeterminate > .pg-icon,
.pg-col-chooser__checkbox--indeterminate > svg {
  display: none;
}
.pg-col-chooser__checkbox--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pg-col-chooser__checkbox:focus-visible {
  outline: 2px solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}

.pg-col-chooser__label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pg-col-chooser__empty {
  padding: 16px 8px;
  text-align: center;
  color: var(--pg-colors-text-secondary, #94a3b8);
}
`;
