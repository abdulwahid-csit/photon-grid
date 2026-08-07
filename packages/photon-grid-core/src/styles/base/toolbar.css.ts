/**
 * Photon Grid base styles — toolbar section.
 *
 * Concatenated (in order) by base-styles.ts; edit here, not there. Order is
 * preserved because CSS cascade depends on it.
 *
 * Styles for the configurable top toolbar: the left-aligned tab strip
 * (`.pg-toolbar-tabs`) and the global search input (`.pg-toolbar-search`). The
 * shared strip and its left/right regions (`.pg-grid__tools`,
 * `.pg-grid__tools__left`, `.pg-grid__tools__right`) live in
 * `filters-tool-panel.css.ts` alongside the strip itself.
 *
 * Every value is a theme variable (with a sensible fallback) so the toolbar
 * re-themes with the rest of the grid — light, dark and custom themes — with
 * zero inline styles anywhere in the component.
 */
export const toolbarCss = `/* ──────────────────── Toolbar ──────────────────── */

/* ─── Columns Manager launcher (right region) ───
   Square icon button matching the Filters funnel it sits beside, so the two
   read as one set rather than as two unrelated controls.

   'order: 0' is what places it *ahead* of the funnel. The right region
   sequences its launchers by order, not by DOM order (funnel 1, Import 2,
   Theme 3), precisely so each launcher can be mounted whenever its own feature
   is resolved without the mount sequence dictating the visual one. */
.pg-columns-launcher {
  order: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-surface, #ffffff);
  color: var(--pg-colors-text-secondary, #64748b);
  box-shadow: var(--pg-shadows-sm, 0 1px 2px rgba(15, 23, 42, 0.08));
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    border-color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-columns-launcher:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-columns-launcher:focus-visible {
  outline: 2px solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}
.pg-columns-launcher__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pg-columns-launcher__icon svg { display: block; }

/* ─── Tab strip (left region) ─── */
.pg-toolbar-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-background-alt, #f1f5f9);
  /* Scroll the strip horizontally when tabs overflow, but hide the scrollbar
     so it never steals vertical space from the toolbar row. */
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* legacy Edge/IE */
}
/* WebKit/Blink (Chrome, Safari, modern Edge). */
.pg-toolbar-tabs::-webkit-scrollbar {
  display: none;
}

.pg-toolbar-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-colors-text-secondary, #64748b);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    box-shadow var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-toolbar-tab:hover:not(.pg-toolbar-tab--active):not(.pg-toolbar-tab--disabled) {
  color: var(--pg-colors-text-primary, #0f172a);
  background: var(--pg-colors-surface, #ffffff);
}
.pg-toolbar-tab:focus-visible {
  outline: 2px solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}
.pg-toolbar-tab--active {
  color: var(--pg-colors-primary-text, #ffffff);
  background: var(--pg-colors-primary, #2563eb);
  box-shadow: var(--pg-shadows-sm, 0 1px 2px rgba(15, 23, 42, 0.08));
}
.pg-toolbar-tab--disabled {
  color: var(--pg-colors-text-disabled, #94a3b8);
  cursor: not-allowed;
}

.pg-toolbar-tab__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pg-toolbar-tab__icon svg { display: block; }
.pg-toolbar-tab__label { line-height: 1; }

/* Count/text badge trailing the label. Inherits the active tab's contrast. */
.pg-toolbar-tab__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  padding: 0 5px;
  box-sizing: border-box;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-border, #e2e8f0);
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  line-height: 1;
}
.pg-toolbar-tab--active .pg-toolbar-tab__badge {
  background: var(--pg-colors-primary-text, #ffffff);
  color: var(--pg-colors-primary, #2563eb);
}

/* ─── Global search ─── */
.pg-toolbar-search {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
/* Field wrapper: position:relative so the icon + clear button overlay the input. */
.pg-toolbar-search__field {
  position: relative;
  display: flex;
  align-items: center;
}
.pg-toolbar-search__icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  color: var(--pg-colors-text-disabled, #94a3b8);
  pointer-events: none;
  transition: color var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base, ease);
  z-index: 1;
}
.pg-toolbar-search__field:focus-within .pg-toolbar-search__icon {
  color: var(--pg-colors-primary, #2563eb);
}
.pg-toolbar-search__input {
  width: 220px;
  height: 32px;
  padding: 0 28px 0 30px;
  font-size: var(--pg-typography-font-size-sm, 13px);
  font-family: inherit;
  color: var(--pg-colors-text-primary, #0f172a);
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  outline: none;
  transition:
    border-color var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base, ease),
    box-shadow var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base, ease);
  appearance: none;
}
.pg-toolbar-search__input::placeholder { color: var(--pg-colors-text-disabled, #94a3b8); }
.pg-toolbar-search__input:focus {
  border-color: var(--pg-colors-border-focus, #2563eb);
  box-shadow: 0 0 0 3px var(--pg-colors-selection-background, rgba(37, 99, 235, 0.12));
}
.pg-toolbar-search__clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  cursor: pointer;
  color: var(--pg-colors-text-secondary, #64748b);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base, ease),
    background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-toolbar-search__clear svg { display: block; }
.pg-toolbar-search__clear--visible {
  opacity: 0.55;
  pointer-events: auto;
}
.pg-toolbar-search__clear--visible:hover {
  opacity: 1;
  background: var(--pg-colors-background-alt, #f1f5f9);
}
`;
