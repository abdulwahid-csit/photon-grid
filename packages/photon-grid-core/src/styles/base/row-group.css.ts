/**
 * Photon Grid base styles — row-group section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const rowGroupCss = `/* ──────────────────── Checkbox ──────────────────── */
.pg-checkbox {
  width: var(--pg-sizing-checkbox-size, 16px);
  height: var(--pg-sizing-checkbox-size, 16px);
  accent-color: var(--pg-colors-primary, #2563eb);
  cursor: pointer;
  flex-shrink: 0;
}

/* ──────────────────── Row Group ──────────────────── */

/* Inner layout cell — carries level-based left padding */
.pg-row-group__cell {
  display: flex;
  align-items: center;
  gap: var(--pg-group-row-gap, 6px);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding-right: var(--pg-group-row-padding-right, 16px);
}

/* Level-based indentation (data-level set by the renderer, no inline style) */
.pg-row--group[data-level="0"] .pg-row-group__cell { padding-left: var(--pg-group-indent-0, 8px); }
.pg-row--group[data-level="1"] .pg-row-group__cell { padding-left: var(--pg-group-indent-1, 28px); }
.pg-row--group[data-level="2"] .pg-row-group__cell { padding-left: var(--pg-group-indent-2, 48px); }
.pg-row--group[data-level="3"] .pg-row-group__cell { padding-left: var(--pg-group-indent-3, 68px); }
.pg-row--group[data-level="4"] .pg-row-group__cell { padding-left: var(--pg-group-indent-4, 88px); }
.pg-row--group[data-level="5"] .pg-row-group__cell { padding-left: var(--pg-group-indent-5, 108px); }

/* Toggle button — a themed wrapper, not the raw icon element */
.pg-row-group__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--pg-group-toggle-size, 24px);
  height: var(--pg-group-toggle-size, 24px);
  border-radius: var(--pg-borders-radius-sm, 4px);
  color: var(--pg-colors-text-secondary, #64748b);
  background: transparent;
  transition:
    background var(--pg-transitions-duration-fast, 100ms),
    color var(--pg-transitions-duration-fast, 100ms);
}

.pg-row-group__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--pg-colors-group-row-text, inherit);
}

.pg-row-group__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--pg-group-count-min-width, 24px);
  padding: var(--pg-group-count-padding, 1px 8px);
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-badge-background, #dbeafe);
  color: var(--pg-colors-badge-text, #1e40af);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

`;
