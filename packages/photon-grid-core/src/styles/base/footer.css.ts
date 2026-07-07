/**
 * Photon Grid base styles — footer section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const footerCss = `/* ──────────────────── Footer ──────────────────── */
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

`;
