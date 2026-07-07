/**
 * Photon Grid base styles — rows section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const rowsCss = `/* ──────────────────── Rows ──────────────────── */
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

/* ──────────────────── Group footer row ──────────────────── */
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

`;
