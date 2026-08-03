/**
 * Photon Grid base styles — sparkline section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const sparklineCss = `/* ──────────────────── Context menu submenu ──────────────────── */
.pg-context-menu__item { display: flex; align-items: center; gap: 8px; }
.pg-context-menu__item--has-sub { position: relative; padding-right: 28px; max-width: stretch; }
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
/* Viewport-aware flip: when a submenu near the right edge would overflow,
   JS (positionSubmenu) adds --sub-left so the flyout opens to the left
   instead. Works at any nesting depth since every wrapper shares the class. */
.pg-context-menu__item--has-sub.pg-context-menu__item--sub-left > .pg-context-menu__sub {
  left: auto; right: 100%;
}
.pg-context-menu__item--has-sub::after {
  content: '›'; position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  font-size: 16px; color: var(--pg-colors-text-secondary,#64748b); line-height: 1;
}
.pg-context-menu__icon {
  display: inline-flex; align-items: center; width: 16px; flex-shrink: 0;
  color: var(--pg-colors-text-secondary,#64748b);
}
/* Built-in and custom entries are grouped in their own wrappers so either block
   can be hidden or reordered without rebuilding the other. The wrappers are
   layout-neutral — items must keep behaving as direct children of the menu. */
.pg-context-menu__group { display: contents; }
/* A disabled entry stays visible (so the action remains discoverable) but is
   inert: muted, no hover feedback, no pointer affordance. */
.pg-context-menu__item--disabled {
  opacity: 0.45;
  cursor: default;
  pointer-events: none;
}

/* ── Checkbox / radio entries ────────────────────────────────────────────────
   The state indicator is a trailing slot so it aligns with the keyboard hints
   of neighbouring items instead of shifting their label text. */
.pg-context-menu__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-left: auto;
  flex-shrink: 0;
  color: var(--pg-colors-primary, #2563eb);
}
.pg-context-menu__mark--radio {
  border: 1px solid var(--pg-colors-border, #cbd5e1);
  border-radius: var(--pg-borders-radius-pill, 9999px);
}
.pg-context-menu__item--checked > .pg-context-menu__mark--radio {
  border-color: var(--pg-colors-primary, #2563eb);
}
.pg-context-menu__item--checked > .pg-context-menu__mark--radio::after {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-primary, #2563eb);
}
/* A toggle keeps its trailing slot even when unchecked, so rows of options do
   not shift horizontally as the user toggles them. */
.pg-context-menu__item--toggle > .pg-context-menu__kbd { margin-left: 8px; }

/* ── Busy state for async actions ────────────────────────────────────────────
   The spinner replaces the leading icon rather than adding a slot, so the item
   keeps its exact width and the menu never reflows mid-action. */
.pg-context-menu__item--loading { pointer-events: none; }
/* Anchor for the spinner below. */
.pg-context-menu__item--loading > .pg-context-menu__icon { position: relative; }
/* The action's own icon is hidden for the duration — whatever the icon
   renderer produced (an <svg>, a wrapper, a custom element) goes with it. */
.pg-context-menu__item--loading > .pg-context-menu__icon > * { display: none; }
/* Absolutely positioned, so the fixed-width icon slot's flex layout cannot
   compress it: a flex-item spinner gets squashed horizontally and renders as a
   pill instead of a circle. Centred with margins rather than a translate,
   because the keyframe animates transform and would overwrite it. */
.pg-context-menu__item--loading > .pg-context-menu__icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  box-sizing: border-box;
  border: 2px solid var(--pg-colors-border, #cbd5e1);
  border-top-color: var(--pg-colors-primary, #2563eb);
  /* 50% of a square box is exactly a circle, and cannot be skewed by a theme
     overriding the pill token. */
  border-radius: 50%;
  animation: pg-context-menu-spin 640ms linear infinite;
}
@keyframes pg-context-menu-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .pg-context-menu__item--loading > .pg-context-menu__icon::after { animation-duration: 2s; }
}

/* ── Confirmation dialog ─────────────────────────────────────────────────── */
.pg-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pg-colors-overlay, rgba(15, 23, 42, 0.45));
}
.pg-confirm {
  width: min(420px, calc(100vw - 32px));
  padding: 20px;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-lg, 10px);
  box-shadow: var(--pg-shadows-dialog, var(--pg-shadows-dropdown, 0 16px 48px rgba(0,0,0,0.2)));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-confirm__title {
  font-size: var(--pg-typography-font-size-lg, 15px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  margin-bottom: 6px;
}
.pg-confirm__message {
  font-size: var(--pg-typography-font-size-md, 13px);
  line-height: var(--pg-typography-line-height-base, 1.5);
  color: var(--pg-colors-text-secondary, #475569);
}
.pg-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}
.pg-confirm__btn {
  padding: 7px 14px;
  border-radius: var(--pg-borders-radius-md, 6px);
  border: 1px solid var(--pg-colors-border, #cbd5e1);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: inherit;
  font-size: var(--pg-typography-font-size-md, 13px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  cursor: pointer;
}
.pg-confirm__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--pg-colors-primary, #2563eb);
}
.pg-confirm__btn--confirm {
  border-color: transparent;
  background: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-primary-contrast, #fff);
}
.pg-confirm__btn--danger {
  background: var(--pg-colors-error, #dc2626);
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
