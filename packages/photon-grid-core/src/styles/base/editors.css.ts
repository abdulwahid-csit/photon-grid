/**
 * Photon Grid base styles — editors section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const editorsCss = `/* ──────────────────── Editors ──────────────────── */
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

/* ── Multi-select (array) editor ── */
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

/* ── Custom dropdown editor ── */
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
/* Panel — position:fixed, appended to document.body */
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
/* Option rows — height must equal CustomDropdownEditor.ITEM_HEIGHT (34px) */
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

/* ── Array cell tag display ── */
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

`;
