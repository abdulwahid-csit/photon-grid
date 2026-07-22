/**
 * Photon Grid base styles — context-menu section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const contextMenuCss = `/* ─── Context menu ─── */
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
  margin: 4px 0;
  border-top: 1px solid var(--pg-colors-border-ctxt-menu, #e2e8f0);
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
/* Dark mode: tint the serial (row-number) column with the header/footer chrome
   background (which sits above the darker data-row background in dark themes) so
   the number gutter reads as grid chrome — matching the header and footer
   surfaces — rather than as data. Scoped to dark mode per design; variants that
   define their own serial-column chrome (e.g. quartz) still win via source order. */
[data-pg-mode="dark"] .pg-cell--serial {
  background: var(--pg-colors-header-background, var(--pg-colors-footer-background, #1e293b));
}
/* ── Serial column as a row-selection column (opt-in) ──────────────────────
   When serialColumnSelection is enabled, the "#" cell becomes an AG Grid–style
   selection handle: mouse-down starts a row drag-selection. The selected-state
   outline is drawn around the whole row (see rows.css), not on this cell. */
.pg-cell--serial-select {
  cursor: pointer;
  user-select: none;
}
.pg-cell--serial-select:hover {
  background: var(--pg-colors-header-hover, var(--pg-colors-background-alt, #f1f5f9));
}
.pg-cell--serial-select:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--pg-colors-primary, #2563eb);
}
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

`;
