/**
 * Photon Grid base styles — header section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const headerCss = `/* ──────────────────── Header rows ──────────────────── */
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
/* ─── Column header filter button ─── */
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
/* Always-visible mode — opt in via headerIcons.filter / ColumnDef.filterIconDisplay */
.pg-th__filter-btn--always { display: flex; }
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
/* Always-visible mode — opt in via headerIcons.menu / ColumnDef.menuIconDisplay */
.pg-th__menu-btn--always { display: flex; }
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
/* Right-pinned columns anchor their right edge to the grid border, so the
   resize handle lives on the inner (left) edge — the edge free to move. */
.pg-th--pinned-right .pg-th__resize-handle {
  right: auto;
  left: -1px;
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

/* Inline column-header rename input (column menu → Rename). */
.pg-th__rename-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 2px 6px;
  margin: 0 4px;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  color: var(--pg-colors-text-primary, #0f172a);
  background: var(--pg-colors-background, #ffffff);
  border: 1px solid var(--pg-colors-primary, #2563eb);
  border-radius: var(--pg-borders-radius-sm, 4px);
  outline: none;
  box-shadow: 0 0 0 2px var(--pg-colors-primary-soft, rgba(37, 99, 235, 0.16));
}

`;
