/**
 * Photon Grid base styles — sparkline section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const sparklineCss = `/* ──────────────────── Context menu submenu ──────────────────── */
.pg-context-menu__item { display: flex; align-items: center; gap: 8px; }
.pg-context-menu__item--has-sub { position: relative; padding-right: 28px; }
.pg-context-menu__item--has-sub > .pg-context-menu__sub { display: none; }
.pg-context-menu__item--has-sub:hover > .pg-context-menu__sub { display: block; }
.pg-context-menu__sub {
  position: absolute; left: 100%; top: -4px; z-index: 10001;
  background: var(--pg-colors-surface,#fff);
  border: 1px solid var(--pg-colors-border,#e2e8f0);
  border-radius: var(--pg-borders-radius-md,6px);
  box-shadow: var(--pg-shadows-dropdown,0 8px 24px rgba(0,0,0,0.12));
  min-width: 175px; padding: 4px;
  white-space: nowrap;
}
.pg-context-menu__item--has-sub::after {
  content: '›'; position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  font-size: 16px; color: var(--pg-colors-text-secondary,#64748b); line-height: 1;
}
.pg-context-menu__icon {
  display: inline-flex; align-items: center; width: 16px; flex-shrink: 0;
  color: var(--pg-colors-text-secondary,#64748b);
}

/* ──────────────────── Sparkline cell ──────────────────── */

/* Cell value wrapper — fills the inner cell area as a flex row */
.pg-cell__value--sparkline {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  padding: 0;
}

/* Wrapper div that stretches canvas to fill the cell */
.pg-sparkline-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
}

/* Canvas element — fills wrapper, no border or background */
.pg-sparkline {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  cursor: crosshair;
}

/* ──────────────────── Sparkline tooltip ──────────────────── */

/* Singleton floating tooltip attached to document.body */
.pg-sparkline-tooltip {
  position: fixed;
  z-index: 99999;
  pointer-events: none;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-tooltip, 0 4px 14px rgba(0,0,0,0.12));
  padding: 6px 10px;
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  color: var(--pg-colors-text-primary, #0f172a);
  white-space: nowrap;
  line-height: 1.5;
  min-width: 60px;
}
.pg-sparkline-tooltip--hidden {
  display: none;
}

/* x-axis label row (shown when data is an object array with xKey) */
.pg-sparkline-tooltip__label {
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
  margin-bottom: 2px;
}

/* Numeric value row */
.pg-sparkline-tooltip__value {
  font-weight: 600;
  color: var(--pg-colors-text-primary, #0f172a);
}

/* OHLC four-row layout */
.pg-sparkline-tooltip__ohlc-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.pg-sparkline-tooltip__ohlc-key {
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
  min-width: 12px;
}

`;
