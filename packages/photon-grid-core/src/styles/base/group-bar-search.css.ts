/**
 * Photon Grid base styles — group-bar-search section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const groupBarSearchCss = `/* ──────────────────── Group bar quick-filter search ──────────────────── */
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

`;
