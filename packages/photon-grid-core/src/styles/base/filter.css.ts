/**
 * Photon Grid base styles — filter section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const filterCss = `/* ──────────────────── Filter Row ──────────────────── */
.pg-drag-preview {
  position: fixed;
  pointer-events: none;
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: var(--pg-drag-preview-gap, 8px);
  padding: var(--pg-drag-preview-padding, 6px 12px);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-drag-preview, 0 4px 16px rgba(0,0,0,0.18));
  font-size: var(--pg-typography-font-size-md, 13px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  white-space: nowrap;
  will-change: transform;
  background: var(--pg-colors-drag-preview-background, var(--pg-drag-preview-bg, #fff));
  border: 1px solid var(--pg-colors-drag-preview-border, var(--pg-drag-preview-border, #e0e0e0));
  color: var(--pg-colors-text-primary, var(--pg-text-primary, #222));
  top: 0;
  left: 0;
  transform: translate(-9999px, -9999px);
}
.pg-drag-preview__avatar {
  width: var(--pg-drag-preview-avatar-size, 24px);
  height: var(--pg-drag-preview-avatar-size, 24px);
  background: var(--pg-colors-primary, var(--pg-primary, #2563eb));
  overflow: hidden;
  flex-shrink: 0;
}
.pg-drag-preview__avatar--circle { border-radius: 50%; }
.pg-drag-preview__avatar--square { border-radius: var(--pg-borders-radius-sm, 4px); }
.pg-drag-preview__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pg-drag-preview__label {
  flex: 1;
  min-width: 0;
}
.pg-drag-preview__badge {
  background: var(--pg-colors-primary, var(--pg-primary, #2563eb));
  color: var(--pg-colors-primary-contrast, #fff);
  border-radius: var(--pg-borders-radius-pill, 999px);
  padding: 1px 7px;
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  min-width: 20px;
  text-align: center;
}

.pg-filter-cell {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
  padding: 0 6px;
  /* Column divider — themed, and gated by showVerticalBorders (removed under
     .pg-grid--no-v-borders, same as .pg-th/.pg-cell) so the filter row's
     vertical lines stay continuous with the header and body columns. */
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-filter-cell:last-child { border-right: none; }
.pg-filter-cell--checkbox {
  width: 44px;
  min-width: 44px;
  max-width: 44px;
  flex-shrink: 0;
}
.pg-filter-cell--serial {
  width: 52px;
  min-width: 52px;
  max-width: 52px;
  flex-shrink: 0;
}
.pg-filter-input {
  /* Grow to fill the cell but yield room for the trailing filter icon. */
  flex: 1 1 auto;
  width: auto !important;
  min-width: 0 !important;
  height: 70%;
  padding: 0 8px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-family: inherit;
  background: var(--pg-colors-surface, #fff);
  color: inherit;
  outline: none;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-input:focus { border-color: var(--pg-colors-border-focus, #2563eb); }

/* Set-type columns (object / array / dropdown): read-only input that looks
   disabled and opens the checkbox filter dropdown on click. */
.pg-filter-input--set {
  cursor: pointer;
  color: var(--pg-colors-text-secondary, #64748b);
  background: var(--pg-colors-background-alt, #f1f5f9);
}
.pg-filter-input--set::placeholder { color: var(--pg-colors-text-secondary, #64748b); }

/* Trailing filter icon inside each filter cell — opens the filter panel. */
.pg-filter-cell__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms),
              color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-cell__icon:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #1e293b);
}
.pg-filter-cell__icon:focus-visible {
  outline: 2px solid var(--pg-colors-border-focus, #2563eb);
  outline-offset: -1px;
}
.pg-filter-cell__icon svg { display: block; }
.pg-filter-cell__icon--active { color: var(--pg-colors-primary, #2563eb); }

/* ──────────────────── Filter Panel ──────────────────── */
.pg-filter-panel {
  position: absolute;
  z-index: var(--pg-z-index-filter-panel, 200);
  min-width: 230px;
  max-width: 320px;
  width: max-content;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-lg, 0 8px 24px rgba(0,0,0,.12));
  overflow: hidden;
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #1e293b);
  user-select: none;
}

/* ── Condition filter ── */
.pg-filter-cond-wrap { padding: 10px; display: flex; flex-direction: column; gap: 6px; }

.pg-filter-cond__row { display: flex; flex-direction: column; gap: 4px; }
.pg-filter-cond__row--hidden { display: none; }

.pg-filter-cond__select {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-primary, #1e293b);
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-cond__select:focus { border-color: var(--pg-colors-border-focus, #2563eb); }

.pg-filter-cond__inputs { display: flex; align-items: center; gap: 4px; }
.pg-filter-cond__inputs--hidden { display: none; }
/* Stack inputs vertically in range (Between) mode so the panel never overflows horizontally */
.pg-filter-cond__inputs--range { flex-direction: column; align-items: stretch; gap: 4px; }
.pg-filter-cond__inputs--range .pg-filter-cond__range-sep {
  text-align: center;
  padding: 2px 0;
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: 500;
}

.pg-filter-cond__input {
  flex: 1;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-primary, #1e293b);
  font-size: inherit;
  font-family: inherit;
  outline: none;
  padding: 6px;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-cond__input:focus { border-color: var(--pg-colors-border-focus, #2563eb); }
.pg-filter-cond__input--hidden { display: none; }

.pg-filter-cond__range-sep {
  flex-shrink: 0;
  font-size: var(--pg-typography-font-size-xs, 11px);
  color: var(--pg-colors-text-secondary, #475569);
  padding: 0 2px;
}
.pg-filter-cond__range-sep--hidden { display: none; }

/* ── Logic toggle row (AND / OR / None) ── */
.pg-filter-logic {
  display: flex;
  gap: 4px;
  padding: 4px 0 2px;
}
.pg-filter-logic--hidden { display: none; }

.pg-filter-logic__btn {
  flex: 1;
  height: 26px;
  padding: 0 6px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-secondary, #475569);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: background var(--pg-transitions-duration-fast, 100ms),
              color var(--pg-transitions-duration-fast, 100ms),
              border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-logic__btn:hover { background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-filter-logic__btn--active {
  background: var(--pg-colors-primary, #2563eb);
  color: #fff;
  border-color: var(--pg-colors-primary, #2563eb);
}

/* ── Set filter (dropdown / array) ── */
.pg-filter-set { display: flex; flex-direction: column; }

.pg-filter-set__search {
  padding: 8px 10px 4px;
}
.pg-filter-set__search-input {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-primary, #1e293b);
  font-size: inherit;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-set__search-input:focus { border-color: var(--pg-colors-border-focus, #2563eb); }

.pg-filter-set__divider {
  height: 1px;
  background: var(--pg-colors-border, #e2e8f0);
  margin: 2px 0;
}

/* Select All item */
.pg-filter-set__item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 10px;
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms);
  box-sizing: border-box;
  position: absolute;
  left: 0;
  right: 0;
}
.pg-filter-set__item:hover { background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-filter-set__item--select-all {
  position: static;
  font-weight: 500;
  color: var(--pg-colors-text-primary, #1e293b);
}
.pg-filter-set__item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-filter-set__item-label--blank { color: var(--pg-colors-text-disabled, #94a3b8); font-style: italic; }

.pg-filter-set__checkbox {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--pg-colors-primary, #2563eb);
}

/* Virtual scroll containers */
.pg-filter-set__list {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: var(--pg-colors-border, #e2e8f0) transparent;
}
.pg-filter-set__list::-webkit-scrollbar { width: 6px; }
.pg-filter-set__list::-webkit-scrollbar-track { background: transparent; }
.pg-filter-set__list::-webkit-scrollbar-thumb {
  background: var(--pg-colors-border, #e2e8f0);
  border-radius: 3px;
}
.pg-filter-set__list-inner { position: relative; width: 100%; }

/* ── Panel footer ── */
.pg-filter-panel__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px;
  // border-top: 1px solid var(--pg-colors-border, #e2e8f0);
  // background: var(--pg-colors-background, #f8fafc);
}

.pg-filter-panel__clear-btn {
  height: 28px;
  padding: 0 14px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-secondary, #475569);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms),
              border-color var(--pg-transitions-duration-fast, 100ms),
              color var(--pg-transitions-duration-fast, 100ms);
}
.pg-filter-panel__clear-btn:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  border-color: var(--pg-colors-text-secondary, #475569);
  color: var(--pg-colors-text-primary, #1e293b);
}

`;
