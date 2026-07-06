import { themeQuartzCss } from './themes/theme-quartz';
import { themeAlpineCss } from './themes/theme-alpine';
import { themeBalhamCss } from './themes/theme-balham';
import { themeMaterialCss } from './themes/theme-material';
import { themeDarkCss } from './themes/theme-dark';
const STYLE_ID = 'photon-grid-base-styles';
const baseCss = `
/* ──────────────────── Root ──────────────────── */
.pg-grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-row-background, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-md, 13px);
  box-sizing: border-box;
  position: relative;
  --pg-scroll-x: 0px;
  --pg-scroll-y: 0px;
  --pg-content-height: 0px;
  --pg-center-content-width: 0px;
  --pg-left-panel-width: auto;
  --pg-right-panel-width: auto;
  --pg-header-row-height: 44px;
  --pg-filter-row-height: 36px;
}
.pg-grid *, .pg-grid *::before, .pg-grid *::after { box-sizing: border-box; }

/* ──────────────────── Outer flex-row / main flex-col wrappers ──────────────────── */
.pg-grid-outer {
  display: flex;
  flex-direction: row;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}
.pg-grid-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

/* ──────────────────── Group drop zone ──────────────────── */
.pg-group-drop-zone--top {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  height: var(--pg-header-row-height, 44px);
  background: var(--pg-colors-header-background, #f8fafc);
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  overflow: hidden;
}
.pg-group-drop-zone--left {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 160px;
  background: var(--pg-colors-header-background, #f8fafc);
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  overflow: hidden;
  position: relative;
}
.pg-group-drop-zone--right {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 160px;
  background: var(--pg-colors-header-background, #f8fafc);
  border-left: 1px solid var(--pg-colors-border, #e2e8f0);
  overflow: hidden;
  position: relative;
}

/* Zone header row (grip + "Groups" label) */
.pg-group-zone-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  user-select: none;
}
.pg-group-zone-grip {
  display: flex;
  align-items: center;
  cursor: grab;
  opacity: 0.45;
  padding: 2px 3px;
  border-radius: 3px;
  color: var(--pg-colors-text-secondary, #64748b);
  flex-shrink: 0;
  transition: opacity 100ms, background 100ms;
}
.pg-group-zone-grip:hover { opacity: 0.85; background: rgba(0,0,0,0.06); }
.pg-group-zone-grip:active { cursor: grabbing; }
.pg-group-zone-label {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pg-colors-text-secondary, #64748b);
  user-select: none;
}

/* Chips area (the actual drop target) */
.pg-group-zone-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
  min-height: 38px;
  flex: 1;
  overflow: auto;
}
.pg-group-drop-zone--left .pg-group-zone-chips,
.pg-group-drop-zone--right .pg-group-zone-chips {
  flex-direction: column;
  align-items: flex-start;
  overflow-y: auto;
  overflow-x: hidden;
}
.pg-group-zone-chips--over {
  background: var(--pg-colors-group-zone-over, #eff6ff);
  outline: 1px dashed var(--pg-colors-primary, #2563eb);
  outline-offset: -2px;
}

/* Resize handle */
.pg-group-drop-zone--top .pg-group-zone-resize {
  height: 4px;
  flex-shrink: 0;
  cursor: ns-resize;
  background: transparent;
  transition: background 100ms;
}
.pg-group-drop-zone--top .pg-group-zone-resize:hover { background: var(--pg-colors-primary, #2563eb); opacity: 0.35; }
.pg-group-drop-zone--left .pg-group-zone-resize {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 100ms;
}
.pg-group-drop-zone--right .pg-group-zone-resize {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 100ms;
}
.pg-group-drop-zone--left .pg-group-zone-resize:hover,
.pg-group-drop-zone--right .pg-group-zone-resize:hover { background: var(--pg-colors-primary, #2563eb); opacity: 0.35; }

/* Hint text */
.pg-group-drop-zone__hint {
  font-size: var(--pg-typography-font-size-sm, 12px);
  color: var(--pg-colors-text-disabled, #94a3b8);
  pointer-events: none;
  user-select: none;
}

/* Chips */
.pg-group-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px 3px 10px;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-chip-background, #e0e7ff);
  color: var(--pg-colors-chip-text, #1e40af);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  user-select: none;
  white-space: nowrap;
  transition: opacity 120ms;
}
.pg-group-chip--ghost {
  cursor: grabbing;
}
.pg-group-chip__label { line-height: 1.2; }
.pg-group-chip__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 100ms, background 100ms;
  flex-shrink: 0;
}
.pg-group-chip__close:hover { opacity: 1; background: rgba(30,64,175,0.18); }
.pg-group-chip__sep {
  display: inline-flex;
  align-items: center;
  color: var(--pg-colors-text-disabled, #94a3b8);
  flex-shrink: 0;
}

/* ──────────────────── Group bar quick-filter search ──────────────────── */
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

/* ──────────────────── Three-panel header ──────────────────── */
.pg-grid__header {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  border-bottom: 1px solid var(--pg-colors-header-border, #e2e8f0);
  background: var(--pg-colors-header-background, #f8fafc);
  overflow: hidden;
  z-index: 10;
  position: relative;
}
/* Mirrors the vertical-scrollbar flex item that lives in the body row so that
   the center header panel is exactly as wide as the center body panel.
   Without this spacer the header center is scrollbar_width wider and the right
   pinned-column header is shifted right relative to the body cells. */
.pg-header-vscroll-spacer {
  flex-shrink: 0;
  width: var(--pg-scrollbar-v-width, 0px);
  background: var(--pg-colors-header-background, #f8fafc);
}

/* ──────────────────── Three-panel body ──────────────────── */
.pg-grid__body {
  display: flex;
  flex-direction: row;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* ──────────────────── Panel base ──────────────────── */
.pg-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
}
.pg-panel--left {
  z-index: 2;
  // box-shadow: 2px 0 4px rgba(0,0,0,0.06);
  width: var(--pg-left-panel-width, auto);
}
.pg-panel--center {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}
.pg-panel--right {
  z-index: 2;
  // box-shadow: -2px 0 4px rgba(0,0,0,0.06);
  width: var(--pg-right-panel-width, auto);
}

/* ──────────────────── Panel header ──────────────────── */
.pg-panel__header {
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  z-index: 2;
}
/* Center panel header sits behind pinned-panel headers so that center
   content translated by the scroll transform cannot visually overlap the
   left / right pinned column headers when scrolled near their edges. */
.pg-panel--center .pg-panel__header {
  z-index: 1;
}
.pg-panel__header-inner {
  display: flex;
  flex-direction: column;
}
.pg-panel--center .pg-panel__header-inner {
  transform: translateX(var(--pg-scroll-x, 0px));
  width: var(--pg-center-content-width, 100%);
}

/* ──────────────────── Panel body ──────────────────── */
.pg-panel__body {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* ──────────────────── Panel content (virtual scroll) ──────────────────── */
.pg-panel__content {
  position: relative;
  height: var(--pg-content-height, 0px);
  will-change: transform;
}
.pg-panel--left .pg-panel__content,
.pg-panel--right .pg-panel__content {
  transform: translateY(var(--pg-scroll-y, 0px));
}
.pg-panel--center .pg-panel__content {
  transform: translate(var(--pg-scroll-x, 0px), var(--pg-scroll-y, 0px));
  width: var(--pg-center-content-width, 100%);
}
/* Master/Detail only (see GridRenderer's pg-grid--has-master-detail class):
   a BODY panel (left/center/right — scoped via .pg-grid__body so the
   *header* panels, which share the same .pg-panel classes, are untouched
   and stay fully interactive for sort/resize/filter) is a full-height block
   regardless of whether it has a row at a given Y — including the Y range
   where the full-width detail/nested grid layer shows through underneath.
   Without this, empty panel space (there is no row there — a detail row
   renders nothing in these panels by design) still geometrically blocks
   clicks meant for whatever is showing through from that layer.
   pointer-events is inherited, so every actual row must explicitly opt
   back in — scoped to Master/Detail grids only, this has no effect on the
   vast majority of grids that never use it. */
.pg-grid--has-master-detail .pg-grid__body > .pg-panel,
.pg-grid--has-master-detail .pg-panel__body,
.pg-grid--has-master-detail .pg-panel__content {
  pointer-events: none;
}
.pg-grid--has-master-detail .pg-row {
  pointer-events: auto;
}

/* ──────────────────── Header rows ──────────────────── */
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

/* ──────────────────── Column group header rows ──────────────────── */
.pg-header-group-row {
  position: relative;
  flex-shrink: 0;
  height: var(--pg-header-row-height, 44px);
  background: var(--pg-colors-header-background, #f8fafc);
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-th--group {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  background: var(--pg-colors-header-background, #f8fafc);
  cursor: pointer;
  outline: none;
  transition: background var(--pg-transitions-duration-fast, 100ms);
  font-weight: var(--pg-typography-header-font-weight, 600);
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #1e293b);
  user-select: none;
}
.pg-th--group:hover,
.pg-th--group:focus-visible { background: var(--pg-colors-header-hover, #f1f5f9); }
.pg-th--group--collapsed {
  background: var(--pg-colors-background-alt, #f1f5f9);
  justify-content: center;
}
// .pg-th--group--collapsed .pg-th__label { display: none; }
.pg-th__collapse-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 4px;
  border-radius: var(--pg-sizing-border-radius, 4px);
  color: var(--pg-colors-text-secondary, #475569);
  transition: background var(--pg-transitions-duration-fast, 100ms),
              color var(--pg-transitions-duration-fast, 100ms);
}
.pg-th--group:hover .pg-th__collapse-btn,
.pg-th--group:focus-visible .pg-th__collapse-btn {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-primary, #2563eb);
}
.pg-th__resize-handle--group {
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  color: var(--pg-colors-resize-handle-color, #e2e8f0);
  z-index: 6;
  transition: opacity var(--pg-transitions-duration-fast, 100ms);
}
.pg-th--group:hover .pg-th__resize-handle--group { opacity: 1; }

/* ── Flat columns alongside grouped headers ── */
/* A flat (ungrouped) leaf column in a grid that has grouped columns must span
   the full header height (group rows + leaf row) so it does not appear as a
   short stub next to taller group header cells.
   Strategy: keep the cell in normal flex flow (preserves horizontal layout),
   give it the combined height, and translateY it upward so its visual top
   aligns with the top of the header area.  The panel header overflow:hidden
   clips exactly at the combined height, so nothing leaks outside the header.
   --pg-group-rows-count is set in JS by HeaderRenderer. */
.pg-th--no-group {
  align-self: flex-start;
  position: relative;
  z-index: 2;
  height: calc((var(--pg-group-rows-count, 0) + 1) * var(--pg-header-row-height, 44px));
  transform: translate(var(--pg-drag-x, 0px), calc(var(--pg-group-rows-count, 0) * -1 * var(--pg-header-row-height, 44px)));
}

.pg-group-drop-indicator {
  position: absolute;
  top: 0;
  width: 2px;
  height: var(--pg-header-row-height, 44px);
  background: var(--pg-colors-primary, #2563eb);
  z-index: 20;
  pointer-events: none;
  border-radius: 1px;
}
.pg-th-group-filler { position: absolute; top: 0; height: 100%; }
.pg-th--standalone-filler {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--pg-colors-header-background, #f8fafc);
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  pointer-events: none;
  cursor: default;
}
/* Filler cell in a group row for columns with no ancestor group at this depth.
   Blends with the header background — makes flat/shallow columns appear to span
   the full header height.  No interactive elements, no bottom border. */
.pg-th--depth-filler {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--pg-colors-header-background, #f8fafc);
  border-right: 1px solid var(--pg-colors-border, #e2e8f0);
  pointer-events: none;
  cursor: default;
  z-index: 0;
}

@keyframes pg-drag-indicator-in { from { opacity: 0; } to { opacity: 1; } }

/* Smooth column-shift animation — enabled ONLY while actively dragging a column */
.pg-grid--col-dragging .pg-th[data-col-id],
.pg-grid--col-dragging .pg-cell[data-col-id] {
  transform: translateX(var(--pg-drag-x, 0px));
  transition: transform 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
}
.pg-grid--col-dragging .pg-th--no-group[data-col-id] {
  transform: translate(var(--pg-drag-x, 0px), calc(var(--pg-group-rows-count, 0) * -1 * var(--pg-header-row-height, 44px)));
}

/* During header auto-scroll the transforms update every RAF tick — disable the
   transition so cells snap instantly rather than endlessly chasing a moving target */
.pg-grid--col-autoscrolling .pg-th[data-col-id],
.pg-grid--col-autoscrolling .pg-cell[data-col-id] {
  transition: none;
}
/* Live-preview path (store mutations during drag): suppress all transitions */
.pg-grid--drag-preview-sync .pg-th[data-col-id],
.pg-grid--drag-preview-sync .pg-cell[data-col-id] {
  transition: none !important;
}

/* ── Group-header CSS-transform drag ─────────────────────────────────────────
 * Cells shift via --pg-drag-x.  The --pg-drag-transition variable is 0ms for
 * the actively-dragged group (injected by display-group-drag-handler.ts) and
 * falls back to the default 180ms for displaced neighbours — giving AG Grid-
 * style smooth animation for everything except the grabbed group itself.
 * body cells use the same variable so leaf columns and data rows stay in sync.
 */
.pg-grid--group-dragging .pg-th--group {
  transform: translateX(var(--pg-drag-x, 0px));
  transition: transform var(--pg-drag-transition, 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94));
  will-change: transform;
}
.pg-grid--group-dragging .pg-th[data-col-id] {
  transform: translateX(var(--pg-drag-x, 0px));
  transition: transform var(--pg-drag-transition, 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94));
}
.pg-grid--group-dragging .pg-cell[data-col-id] {
  transform: translateX(var(--pg-drag-x, 0px));
  transition: transform var(--pg-drag-transition, 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94));
}
.pg-grid--group-dragging .pg-th--depth-filler {
  transform: translateX(var(--pg-drag-x, 0px));
}
.pg-grid--group-dragging .pg-th--no-group[data-col-id] {
  transform: translate(var(--pg-drag-x, 0px), calc(var(--pg-group-rows-count, 0) * -1 * var(--pg-header-row-height, 44px)));
  transition: transform var(--pg-drag-transition, 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94));
}

/* Column drag ghost (floating preview chip that follows the cursor) */
.pg-col-drag-ghost {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: var(--pg-drag-ghost-gap, 8px);
  padding: 5px 12px 5px 10px;
  background: var(--pg-colors-drag-ghost-background, #fff);
  border: 1.5px solid var(--pg-colors-primary, #2563eb);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: 0 6px 24px rgba(0,0,0,0.13), 0 2px 8px rgba(37, 99, 235, 0.12);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  color: var(--pg-colors-header-text, #374151);
  white-space: nowrap;
  user-select: none;
  transform: translateY(-50%);
  transition:
    border-color var(--pg-transitions-duration-fast, 100ms),
    box-shadow var(--pg-transitions-duration-fast, 100ms);
}
.pg-col-drag-ghost__icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--pg-colors-primary, #2563eb);
  opacity: 0.7;
}
.pg-col-drag-ghost__label {
  flex: 1;
  min-width: 0;
}

/* Default icon visibility */
.pg-col-drag-ghost__icon--move        { display: inline-flex; }
.pg-col-drag-ghost__icon--ban         { display: none; }
.pg-col-drag-ghost__icon--arrow-left  { display: none; }
.pg-col-drag-ghost__icon--arrow-right { display: none; }

/* Hide-column state: amber ghost + eyeOff icon */
.pg-col-drag-ghost__icon--hide { display: none; }
.pg-col-drag-ghost--hide .pg-col-drag-ghost__icon--move { display: none; }
.pg-col-drag-ghost--hide .pg-col-drag-ghost__icon--hide { display: inline-flex; color: var(--pg-colors-warning, #f59e0b); }
.pg-col-drag-ghost--hide {
  border-color: var(--pg-colors-warning, #f59e0b);
  box-shadow: 0 6px 24px rgba(245,158,11,0.13), 0 2px 8px rgba(245,158,11,0.12);
  color: var(--pg-colors-warning, #f59e0b);
}

/* No-drop state: red ghost + ban icon */
.pg-col-drag-ghost--no-drop {
  border-color: var(--pg-colors-danger, #ef4444);
  box-shadow: 0 6px 24px rgba(239,68,68,0.13), 0 2px 8px rgba(239,68,68,0.12);
  color: var(--pg-colors-danger, #ef4444);
}
.pg-col-drag-ghost--no-drop .pg-col-drag-ghost__icon { color: var(--pg-colors-danger, #ef4444); }
.pg-col-drag-ghost--no-drop .pg-col-drag-ghost__icon--move { display: none; }
.pg-col-drag-ghost--no-drop .pg-col-drag-ghost__icon--ban  { display: inline-flex; }

/* Outside-grid drop state: red ghost signals "drop = hide all columns in group" */
.pg-col-drag-ghost--outside {
  border-color: var(--pg-colors-danger, #ef4444);
  box-shadow: 0 6px 24px rgba(239,68,68,0.18), 0 2px 8px rgba(239,68,68,0.14);
  color: var(--pg-colors-danger, #ef4444);
  opacity: 0.85;
}
.pg-col-drag-ghost--outside .pg-col-drag-ghost__label::after {
  content: ' (hide)';
  font-size: 10px;
  opacity: 0.7;
}

/* Auto-scroll state: directional arrow replaces move icon */
@keyframes pg-scroll-arrow-left  { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-4px); } }
@keyframes pg-scroll-arrow-right { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }

.pg-col-drag-ghost--scroll-left .pg-col-drag-ghost__icon--move,
.pg-col-drag-ghost--scroll-right .pg-col-drag-ghost__icon--move { display: none; }
.pg-col-drag-ghost--scroll-left .pg-col-drag-ghost__icon--arrow-left {
  display: inline-flex;
  animation: pg-scroll-arrow-left 700ms ease-in-out infinite;
}
.pg-col-drag-ghost--scroll-right .pg-col-drag-ghost__icon--arrow-right {
  display: inline-flex;
  animation: pg-scroll-arrow-right 700ms ease-in-out infinite;
}

/* ──────────────────── Filter Row ──────────────────── */
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
  align-items: center;
  flex-shrink: 0;
  padding: 0 6px;
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
  width: 100%;
  height: 24px;
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

/* ──────────────────── Filter Panel ──────────────────── */
.pg-filter-panel {
  position: absolute;
  z-index: var(--pg-z-index-filter-panel, 200);
  min-width: 270px;
  max-width: 320px;
  width: max-content;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-lg, 0 8px 24px rgba(0,0,0,.12));
  overflow: hidden;
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text, #1e293b);
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
  color: var(--pg-colors-text, #1e293b);
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
  color: var(--pg-colors-text, #1e293b);
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
  color: var(--pg-colors-text, #1e293b);
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
  color: var(--pg-colors-text, #1e293b);
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
  color: var(--pg-colors-text, #1e293b);
}

/* ──────────────────── Rows ──────────────────── */
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

/* ──────────────────── Cells ──────────────────── */
.pg-cell {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: var(--pg-sizing-column-min-width, 40px);
  border-right: 1px solid transparent;
  padding: 0;
  overflow: hidden;
  position: relative;
}
.pg-cell--v-border { border-right-color: var(--pg-colors-border, #e2e8f0); }
.pg-cell:last-child { border-right: none; }
.pg-cell--align-right  { justify-content: flex-end;  }
.pg-cell--align-center { justify-content: center; }
.pg-cell--align-right  .pg-cell__inner { text-align: right; }
.pg-cell--align-center .pg-cell__inner { text-align: center; }

/* ─── Cell selection (CSS-based, replaces canvas) ─── */
/* Suppress the browser's native focus ring — the grid uses its own blue
   box-shadow indicator on .pg-cell--active-cell instead. */
.pg-cell { user-select: none; outline: none; }

/*
 * Range selection — edge borders drawn via ::after so CSS border corners
 * always connect cleanly (no box-shadow joining artefacts).
 * The JS engine adds sel-top/right/bottom/left only on cells that sit on
 * the outer edge of the range; interior cells carry no edge classes.
 */
.pg-cell--in-selection {
  background-color: var(--pg-colors-selection-background, aliceblue) !important;
  position: relative;
  z-index: 1;
}
.pg-cell--in-selection::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 0 solid var(--pg-colors-primary, #2563eb);
  pointer-events: none;
}
.pg-cell--sel-top::after    { border-top-width:    1px; }
.pg-cell--sel-bottom::after { border-bottom-width: 1px; }
.pg-cell--sel-left::after   { border-left-width:   1px; }
.pg-cell--sel-right::after  { border-right-width:  1px; }

/* Active (focused) cell — solid 2px inset border, no background */
.pg-cell--active-cell {
  background-color: transparent !important;
  box-shadow: inset 0 0 0 2px var(--pg-colors-primary, #2563eb) !important;
  position: relative;
  z-index: 2;
  outline: none;
}
/* Suppress the ::after edge overlay only when the active cell is NOT inside a selection */
.pg-cell--active-cell:not(.pg-cell--in-selection)::after { content: none; }

/* Active cell inside a range — selection wins entirely: no 2px border, full selection look */
.pg-cell--in-selection.pg-cell--active-cell {
  background-color: var(--pg-colors-selection-background, aliceblue) !important;
  box-shadow: none !important;
}

/* Dark-mode overrides */
.pg-grid[data-theme="dark"] .pg-cell--in-selection {
  background-color: rgba(37,99,235,0.18) !important;
}
.pg-grid[data-theme="dark"] .pg-cell--sel-top    { --_t:  2px; }
.pg-grid[data-theme="dark"] .pg-cell--sel-bottom { --_b: -2px; }
.pg-grid[data-theme="dark"] .pg-cell--sel-left   { --_l:  2px; }
.pg-grid[data-theme="dark"] .pg-cell--sel-right  { --_r: -2px; }
.pg-grid[data-theme="dark"] .pg-cell--active-cell {
  background-color: rgba(37,99,235,0.25) !important;
  box-shadow: inset 0 0 0 2px #60a5fa !important;
}
.pg-grid[data-theme="dark"] .pg-cell--in-selection.pg-cell--active-cell {
  background-color: rgba(37,99,235,0.18) !important;
  box-shadow:
    inset 0 var(--_t) 0 0 #60a5fa,
    inset 0 var(--_b) 0 0 #60a5fa,
    inset var(--_l) 0 0 0 #60a5fa,
    inset var(--_r) 0 0 0 #60a5fa !important;
}

/* ─── Group aggregate cells ─── */
/*
 * Aggregate values are displayed inside .pg-cell--agg cells that sit directly
 * under their column headers, aligned with normal data-row cells via the same
 * [data-col-id] width rules managed by ColumnStyleManager.
 */
.pg-cell--agg {
  color: var(--pg-colors-agg-text, var(--pg-colors-text-secondary, #475569));
  font-style: italic;
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
}
.pg-grid[data-theme="dark"] .pg-cell--agg {
  color: var(--pg-colors-agg-text, var(--pg-colors-text-secondary, #94a3b8));
}

/* ─── Copy / Cut flash feedback ─── */
/*
 * background-color: !important on pg-cell--in-selection blocks keyframe bg changes.
 * Use a ::after overlay instead — it's a separate layer, no !important conflict.
 */
@keyframes pg-copy-flash-overlay {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes pg-cut-flash-overlay {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  100% { opacity: 0; }
}
/*
 * Flash overlay uses ::before so it never conflicts with the ::after
 * pseudo-element that draws the selection edge borders.
 */
.pg-cell--copy-flash::before,
.pg-cell--cut-flash::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}
.pg-cell--copy-flash::before {
  background: rgba(59, 130, 246, 0.45);
  animation: pg-copy-flash-overlay 0.75s ease-out forwards;
}
.pg-cell--cut-flash::before {
  background: rgba(239, 68, 68, 0.45);
  animation: pg-cut-flash-overlay 0.75s ease-out forwards;
}
/* Dark mode uses stronger overlay */
.pg-grid[data-theme="dark"] .pg-cell--copy-flash::before {
  background: rgba(99, 165, 253, 0.5);
}
.pg-grid[data-theme="dark"] .pg-cell--cut-flash::before {
  background: rgba(252, 100, 100, 0.5);
}

/* ─── Fill success flash ─── */
/*
 * Applied to the newly filled cells after a fill-handle drag completes.
 * Uses ::before (same as copy/cut flash) so it never conflicts with the
 * selection edge border drawn on ::after.
 */
@keyframes pg-fill-flash-overlay {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  100% { opacity: 0; }
}
.pg-cell--fill-flash::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  background: rgba(34, 197, 94, 0.45);
  animation: pg-fill-flash-overlay 0.75s ease-out forwards;
}
.pg-grid[data-theme="dark"] .pg-cell--fill-flash::before {
  background: rgba(74, 222, 128, 0.5);
}

/* ─── Fill handle ─── */
/*
 * The fill handle is a small drag target at the bottom-right corner of the
 * primary selection range.  It lives inside the corner cell as an absolutely-
 * positioned child so it scrolls with the grid naturally.
 *
 * pg-cell--has-fill-handle lets the handle extend 4 px past the cell edge
 * (standard AG Grid behaviour) by lifting overflow:hidden on that one cell.
 *
 * Dragging from the handle copies the source range into the dragged area in
 * one direction at a time; a dashed overlay (pg-cell--fill-preview) previews
 * the fill area before the mouse button is released.
 */
.pg-cell--has-fill-handle {
  overflow: visible !important;
}
.pg-fill-handle {
  position: absolute;
  right: 0px;
  bottom: 0px;
  width: 6px;
  height: 6px;
  box-sizing: border-box;
  background-color: var(--pg-colors-primary, #2563eb);
  cursor: crosshair;
  z-index: 10;
  pointer-events: auto;
  user-select: none;
}

/* ─── Fill preview — dashed border on cells being hovered during fill drag ─── */
.pg-cell--fill-preview {
  background-color: var(--pg-colors-selection-background, aliceblue) !important;
  position: relative;
  z-index: 1;
}
/*
 * The fill-preview ::after uses a dashed border (vs the solid selection border)
 * to clearly distinguish "about to be filled" from "already selected."
 * These classes are orthogonal to sel-top/bottom/left/right — fill-preview
 * cells are never pg-cell--in-selection, so there is no ::after conflict.
 */
.pg-cell--fill-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 0 dashed var(--pg-colors-primary, #2563eb);
  pointer-events: none;
}
.pg-cell--fp-top::after    { border-top-width:    1px; }
.pg-cell--fp-bottom::after { border-bottom-width: 1px; }
.pg-cell--fp-left::after   { border-left-width:   1px; }
.pg-cell--fp-right::after  { border-right-width:  1px; }

.pg-grid[data-theme="dark"] .pg-cell--fill-preview {
  background-color: rgba(37, 99, 235, 0.12) !important;
}

/* ─── Context menu ─── */
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
  height: 1px;
  margin: 4px 0;
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

/* ──────────────────── Checkbox ──────────────────── */
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

/* ──────────────────── Tree Data ────────────────────
   The toggle column's cell gets a marker class ('.pg-cell--tree-toggle-col',
   applied by applyTreeToggle regardless of whether the row has children —
   leaves still need to sit indented under their parent), then indentation is
   purely data-level-driven CSS, the same mechanism '.pg-row--group' already
   uses (see above) — no inline styles, no per-instance stylesheet. */
.pg-cell--tree-toggle-col {
  display: flex;
  align-items: center;
  gap: var(--pg-group-row-gap, 6px);
  min-width: 0;
}

.pg-row--tree[data-level="0"] .pg-cell--tree-toggle-col { padding-left: var(--pg-tree-indent-0, 8px); }
.pg-row--tree[data-level="1"] .pg-cell--tree-toggle-col { padding-left: var(--pg-tree-indent-1, 28px); }
.pg-row--tree[data-level="2"] .pg-cell--tree-toggle-col { padding-left: var(--pg-tree-indent-2, 48px); }
.pg-row--tree[data-level="3"] .pg-cell--tree-toggle-col { padding-left: var(--pg-tree-indent-3, 68px); }
.pg-row--tree[data-level="4"] .pg-cell--tree-toggle-col { padding-left: var(--pg-tree-indent-4, 88px); }
.pg-row--tree[data-level="5"] .pg-cell--tree-toggle-col { padding-left: var(--pg-tree-indent-5, 108px); }
.pg-row--tree[data-level="6"] .pg-cell--tree-toggle-col { padding-left: var(--pg-tree-indent-6, 128px); }
.pg-row--tree[data-level="7"] .pg-cell--tree-toggle-col { padding-left: var(--pg-tree-indent-7, 148px); }

.pg-tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--pg-group-toggle-size, 24px);
  height: var(--pg-group-toggle-size, 24px);
  border-radius: var(--pg-borders-radius-sm, 4px);
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms),
    color var(--pg-transitions-duration-fast, 100ms);
}
.pg-tree-toggle:hover {
  background: var(--pg-colors-row-hover, #f0f7ff);
  color: var(--pg-colors-text-primary, #1e293b);
}

/* Reserves the toggle's own footprint on leaf rows (no chevron) so a leaf's
   content lines up under its parent's content, not under the parent's toggle. */
.pg-tree-toggle-spacer {
  display: inline-block;
  flex-shrink: 0;
  width: var(--pg-group-toggle-size, 24px);
  height: var(--pg-group-toggle-size, 24px);
}

/* A getDataPath filler node — a synthetic path-prefix row with no real backing record. */
.pg-row--tree-filler .pg-cell__value {
  font-style: italic;
  color: var(--pg-colors-text-secondary, #64748b);
}

/* Drag-to-reparent drop feedback (3-way before/inside/after — see RowDragRenderer.setTreeMode) */
.pg-row--drop-target.pg-row--drop-inside {
  background: var(--pg-colors-selection-background, rgba(37, 99, 235, 0.1));
  outline: 2px dashed var(--pg-colors-primary, #2563eb);
  outline-offset: -2px;
}
.pg-row--drop-target.pg-row--drop-before {
  box-shadow: inset 0 2px 0 0 var(--pg-colors-primary, #2563eb);
}
.pg-row--drop-target.pg-row--drop-after {
  box-shadow: inset 0 -2px 0 0 var(--pg-colors-primary, #2563eb);
}

/* ──────────────────── Scrollbars ──────────────────── */

/* Native vertical scrollbar — flex item that lives beside the center panel.
   It is NOT absolutely positioned so it never overlaps cell content; the center
   panel shrinks to make room for it, keeping every cell border fully visible. */
.pg-scrollbar-v-native {
  flex-shrink: 0;
  overflow-y: scroll;
  overflow-x: hidden;
  background: var(--pg-colors-scrollbar-bg, #fff);
}
.pg-scrollbar-v-spacer {
  width: 1px;
  pointer-events: none;
}
/* Horizontal row: sits below the body */
.pg-scrollbar-h-row {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  border-top: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-scrollbar-h-spacer { flex-shrink: 0; background: var(--pg-colors-scrollbar-bg, #fff); }
.pg-scrollbar-h-spacer--left  { width: var(--pg-left-panel-width, 0px); overflow: scroll; }
.pg-scrollbar-h-spacer--right { width: var(--pg-right-panel-width, 0px); overflow: scroll; }
/* Aligns the h-scroll track with the narrowed center panel (which is now
   offset by the vertical scrollbar width captured in --pg-scrollbar-v-width). */
.pg-scrollbar-h-spacer--vscroll {
  flex-shrink: 0;
  width: 0px;
  background: var(--pg-colors-scrollbar-bg, #fff);
}
/* Native horizontal scrollbar container */
.pg-scrollbar-h-native {
  flex: 1 1 0;
  min-width: 0;
  overflow-x: scroll;
  overflow-y: hidden;
  background: var(--pg-colors-scrollbar-bg, #fff);
}
.pg-scrollbar-h-content {
  height: 1px;
  pointer-events: none;
}
/* Hidden state — applied to wraps */
.pg-scrollbar--hidden { display: none; }

/* ──────────────────── Editors ──────────────────── */
.pg-editor {
  width: 100%;
  height: 100%;
  padding: 0 12px;
  border: none;
  outline: none;
  font-size: inherit;
  font-family: inherit;
  background: var(--pg-colors-cell-edit-background, #fff);
  color: inherit;
  box-sizing: border-box;
}
.pg-editor:focus { outline: none; box-shadow: inset 0 0 0 2px var(--pg-colors-primary, #2563eb); }
.pg-editor--select { cursor: pointer; padding-right: 8px; }
.pg-editor--checkbox { width: auto; height: auto; margin: auto; cursor: pointer; }

/* ── Multi-select (array) editor ── */
.pg-editor--multiselect {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0;
  cursor: pointer;
  background: var(--pg-colors-cell-edit-background, #fff);
}
.pg-editor__ms-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 0 8px 0 12px;
  user-select: none;
  gap: 6px;
}
.pg-editor__ms-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: inherit;
  color: inherit;
}
.pg-editor__ms-arrow {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-editor__ms-arrow::after {
  content: '';
  display: block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}
.pg-editor__ms-panel {
  display: none;
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  min-width: 100%;
  max-height: 220px;
  overflow-y: auto;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
  z-index: 9999;
  padding: 4px;
}
.pg-editor__ms-panel--open { display: block; }
.pg-editor__ms-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 80ms;
  font-size: inherit;
  font-family: inherit;
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-editor__ms-option:hover { background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-editor__ms-check {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--pg-colors-primary, #2563eb);
}
.pg-editor__ms-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Custom dropdown editor ── */
.pg-dropdown-editor__trigger {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 6px 0 12px;
  gap: 6px;
  cursor: default;
}
.pg-dropdown-editor__trigger-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: inherit;
  color: inherit;
}
.pg-dropdown-editor__arrow {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-dropdown-editor__arrow::after {
  content: '';
  display: block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}
/* Panel — position:fixed, appended to document.body */
.pg-dropdown-editor__panel {
  position: fixed;
  z-index: 99999;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07);
  overflow: hidden;
  opacity: 0;
  transform: scaleY(0.94) translateY(-4px);
  transform-origin: top center;
  transition: opacity 130ms ease, transform 130ms ease;
}
.pg-dropdown-editor__panel--visible {
  opacity: 1;
  transform: scaleY(1) translateY(0);
}
.pg-dropdown-editor__panel--above {
  transform-origin: bottom center;
  transform: scaleY(0.94) translateY(4px);
}
.pg-dropdown-editor__panel--above.pg-dropdown-editor__panel--visible {
  transform: scaleY(1) translateY(0);
}
/* Scrollable list */
.pg-dropdown-editor__scroll {
  overflow-y: auto;
  overflow-x: hidden;
  outline: none;
}
.pg-dropdown-editor__scroll::-webkit-scrollbar { width: 5px; }
.pg-dropdown-editor__scroll::-webkit-scrollbar-track { background: transparent; }
.pg-dropdown-editor__scroll::-webkit-scrollbar-thumb {
  background: var(--pg-colors-border, #e2e8f0);
  border-radius: 3px;
}
/* Virtual scroll layout */
.pg-dropdown-editor__spacer { position: relative; }
.pg-dropdown-editor__items  { position: absolute; left: 0; right: 0; top: 0; }
/* Option rows — height must equal CustomDropdownEditor.ITEM_HEIGHT (34px) */
.pg-dropdown-editor__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  height: 34px;
  cursor: pointer;
  transition: background 60ms;
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: 13px;
}
.pg-dropdown-editor__option:hover,
.pg-dropdown-editor__option--highlighted {
  background: var(--pg-colors-background-alt, #f1f5f9);
}
.pg-dropdown-editor__option--selected {
  background: var(--pg-colors-primary-subtle, #eff6ff);
  color: var(--pg-colors-primary, #2563eb);
  font-weight: 500;
}
.pg-dropdown-editor__option--selected.pg-dropdown-editor__option--highlighted {
  background: var(--pg-colors-primary-subtle-hover, #dbeafe);
}
/* Icon / image before label */
.pg-dropdown-editor__opt-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 3px;
}
.pg-dropdown-editor__opt-icon img {
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 2px;
  display: block;
}
.pg-dropdown-editor__opt-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Checkmark for the currently selected option */
.pg-dropdown-editor__opt-check {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-colors-primary, #2563eb);
}
.pg-dropdown-editor__opt-check::after {
  content: '';
  display: block;
  width: 5px;
  height: 9px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg) translate(-1px, -1px);
}
/* Empty state */
.pg-dropdown-editor__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: 13px;
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
}

/* ── Array cell tag display ── */
.pg-cell__value--tags {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}
.pg-badge--overflow {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: 10px;
  flex-shrink: 0;
}

/* ──────────────────── Footer ──────────────────── */
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

/* ──────────────────── Overlay ──────────────────── */
.pg-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--pg-colors-surface, #fff);
  z-index: 20;
}
.pg-overlay--loading { background: rgba(255,255,255,0.85); }
.pg-overlay__text { color: var(--pg-colors-text-secondary, #475569); font-size: var(--pg-typography-font-size-md, 13px); }
.pg-overlay__icon { color: var(--pg-colors-text-disabled, #94a3b8); }

/* ──────────────────── Drag ──────────────────── */
.pg-dragging { opacity: 0.5; }
.pg-drop-before { box-shadow: 0 -2px 0 0 var(--pg-colors-primary, #2563eb); }
.pg-drop-after  { box-shadow: 0 2px 0 0 var(--pg-colors-primary, #2563eb); }
.pg-drop-over   { background: var(--pg-colors-drag-over-highlight, rgba(37,99,235,0.06)) !important; }

/* ──────────────────── Fullscreen ──────────────────── */
.pg-grid--fullscreen { position: fixed; inset: 0; z-index: 9999; border-radius: 0; }

/* ──────────────────── Chart ──────────────────── */
.pg-chart { display: flex; flex-direction: column; gap: 8px; }
.pg-chart__title { font-size: var(--pg-typography-font-size-lg, 14px); font-weight: var(--pg-typography-font-weight-semi-bold, 600); color: var(--pg-colors-text-primary); padding: 4px 0; }
.pg-chart__canvas { display: block; max-width: 100%; }

/* ──────────────────── Icon ──────────────────── */
.pg-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pg-icon svg { display: block; }

/* ──────────────────── Auto Row Height ──────────────────── */
.pg-grid--auto-row-height .pg-row {
  height: auto;
}
.pg-grid--auto-row-height .pg-cell {
  overflow: visible;
}
.pg-grid--auto-row-height .pg-cell__inner {
  height: auto;
  overflow: visible;
  align-items: flex-start;
  padding-top: 10px;
  padding-bottom: 10px;
}
.pg-grid--auto-row-height .pg-cell__value {
  white-space: normal;
  overflow: visible;
  text-overflow: initial;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* ──────────────────── Row Drag ──────────────────── */
.pg-grid__body { position: relative; }

.pg-row-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 100%;
  flex-shrink: 0;
  cursor: grab;
  opacity: 0.35;
  color: var(--pg-colors-text-secondary, #475569);
  margin-right: 4px;
}
.pg-row-drag-handle:hover { opacity: 0.7; }
.pg-row-drag-handle:active { cursor: grabbing; }

.pg-row-drag-ghost {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: var(--pg-borders-radius-md, 6px);
  border: 1.5px solid var(--pg-colors-primary, #2563eb);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-primary, #2563eb);
  font-size: var(--pg-typography-font-size-sm, 12px);
  font-weight: 500;
  box-shadow: 0 6px 24px rgba(37,99,235,0.13), 0 2px 8px rgba(37,99,235,0.12);
  transform: translate(12px, -50%);
  white-space: nowrap;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pg-row-drag-ghost__icon { display: inline-flex; align-items: center; opacity: 0.8; }
.pg-row-drag-ghost__icon--block { display: none; }
.pg-row-drag-ghost__label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }

.pg-row-drag-ghost--outside {
  border-color: var(--pg-colors-danger, #ef4444);
  box-shadow: 0 6px 24px rgba(239,68,68,0.13), 0 2px 8px rgba(239,68,68,0.12);
  color: var(--pg-colors-danger, #ef4444);
}
.pg-row-drag-ghost--outside .pg-row-drag-ghost__icon--drag { display: none; }
.pg-row-drag-ghost--outside .pg-row-drag-ghost__icon--block { display: inline-flex; }

.pg-row-drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--pg-colors-primary, #2563eb);
  pointer-events: none;
  z-index: 100;
  border-radius: 1px;
}
.pg-row-drop-indicator::before {
  content: '';
  position: absolute;
  left: -3px;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pg-colors-primary, #2563eb);
}

/* The dragged row: semi-transparent, moves to virtual landing position */
.pg-row--row-dragging { opacity: 0.4; }

/* During row drag: kill hover/click on all rows; animate top changes.
   Uses top (not transform) so rows stay within panel overflow:hidden bounds. */
.pg-grid--row-dragging .pg-row {
  pointer-events: none;
  will-change: top;
  transition: background var(--pg-transitions-duration-fast, 100ms),
              top 130ms cubic-bezier(0.2, 0, 0, 1);
}

/* ──────────────────── Chart Panel ──────────────────── */
.pg-chart-panel-backdrop {
  position: absolute; inset: 0; z-index: 9990;
  background: transparent;
  overflow: hidden;
  pointer-events: none;
}
.pg-chart-panel-backdrop--open {
  pointer-events: auto;
}
.pg-chart-panel-backdrop--fullscreen {
  position: fixed !important;
  background: rgba(0,0,0,0.40) !important;
}
.pg-chart-panel {
  position: absolute;
  background: var(--pg-colors-surface,#fff);
  border-radius: 4px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18),0 2px 12px rgba(0,0,0,0.10);
  display: flex; flex-direction: column;
  width: min(720px, 88%); height: min(520px, 85%);
  overflow: hidden;
  pointer-events: auto;
}
.pg-chart-panel--fullscreen {
  width: calc(100%) !important; height: calc(100%) !important;
}
.pg-chart-panel__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--pg-colors-border,#e2e8f0);
  flex-shrink: 0;
  cursor: grab; user-select: none;
}
.pg-chart-panel__header--dragging { cursor: grabbing; }
.pg-chart-panel--dragging .pg-chart-panel__body { pointer-events: none; }
.pg-chart-panel__title {
  font-size: 15px; font-weight: 600;
  color: var(--pg-colors-text-primary,#0f172a);
  font-family: var(--pg-typography-font-family,system-ui,sans-serif);
}
.pg-chart-panel__actions { display: flex; align-items: center; gap: 4px; }
.pg-chart-panel__action-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 4px;
  border: none; background: transparent;
  color: var(--pg-colors-text-secondary,#64748b); cursor: pointer;
  transition: background 80ms, color 80ms;
}
.pg-chart-panel__action-btn:hover {
  background: var(--pg-colors-background-alt,#f1f5f9);
  color: var(--pg-colors-text-primary,#0f172a);
}
.pg-chart-panel__body {
  flex: 1; min-height: 0; position: relative; padding: 8px; overflow: hidden;
}
.pg-chart-panel__canvas { display: block; }
.pg-chart-panel__dots-btn {
  position: absolute; top: 12px; right: 12px; z-index: 10;
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 4px;
  border: none; background: transparent;
  color: var(--pg-colors-text-secondary,#64748b); cursor: pointer;
  transition: background 80ms;
}
.pg-chart-panel__dots-btn:hover, .pg-chart-panel__dots-btn--active {
  background: var(--pg-colors-background-alt,#f1f5f9);
  color: var(--pg-colors-text-primary,#0f172a);
}
.pg-chart-panel__dots-menu {
  display: none; position: absolute; top: 40px; right: 8px; z-index: 20;
  background: var(--pg-colors-surface,#fff);
  border: 1px solid var(--pg-colors-border,#e2e8f0);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  min-width: 160px; padding: 4px;
}
.pg-chart-panel__dots-menu--open { display: block; }
.pg-chart-panel__dots-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 7px 10px;
  border: none; border-radius: 4px; background: transparent;
  cursor: pointer; text-align: left;
  font-size: 13px; color: var(--pg-colors-text-primary,#0f172a);
  font-family: var(--pg-typography-font-family,system-ui,sans-serif);
  transition: background 80ms;
}
.pg-chart-panel__dots-item:hover { background: var(--pg-colors-background-alt,#f1f5f9); }
.pg-chart-panel__empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 10px; padding: 24px;
  color: var(--pg-colors-text-secondary,#64748b);
  font-family: var(--pg-typography-font-family,system-ui,sans-serif);
}
.pg-chart-panel__empty-icon { opacity: 0.35; color: var(--pg-colors-text-secondary,#64748b); }
.pg-chart-panel__empty-text {
  font-size: 15px; font-weight: 600;
  color: var(--pg-colors-text-primary,#0f172a);
}
.pg-chart-panel__empty-sub {
  font-size: 12px; text-align: center; max-width: 280px;
  color: var(--pg-colors-text-secondary,#64748b);
}
.pg-chart-panel__legend {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
  gap: 2px 4px; padding: 5px 12px 8px;
  flex-shrink: 0;
  border-top: 1px solid var(--pg-colors-border,#e2e8f0);
}
.pg-chart-panel__legend:empty { border-top: none; padding: 0; }
.pg-chart-panel__legend-item {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 8px; border-radius: 5px;
  border: none; background: transparent; cursor: pointer;
  font-size: 12px; color: var(--pg-colors-text-secondary,#64748b);
  font-family: var(--pg-typography-font-family,system-ui,sans-serif);
  user-select: none;
  transition: background 80ms, opacity 220ms;
}
.pg-chart-panel__legend-item:hover {
  background: var(--pg-colors-background-alt,#f1f5f9);
  color: var(--pg-colors-text-primary,#0f172a);
}
.pg-chart-panel__legend-item--hidden { opacity: 0.35; }
.pg-chart-panel__legend-swatch {
  width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0;
}
.pg-chart-panel__legend-label {
  max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ──────────────────── Context menu submenu ──────────────────── */
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

/* ──────────────────── Column Context Menu ──────────────────── */

/* Menu container — fixed-position dropdown attached to document.body.
   Height is capped so the menu never grows into the viewport's top/bottom
   200px; content beyond that scrolls internally via overflow-y instead of
   being clipped. Fly-out submenus (.pg-col-ctx-menu__submenu) are portaled to
   document.body while open rather than nested here, so this container's
   scroll clipping never cuts them off on the X axis. */
.pg-col-ctx-menu {
  position: fixed;
  z-index: 9999;
  min-width: 220px;
  max-width: 300px;
  max-height: calc(100% - 200px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-dropdown, 0 8px 24px rgba(15, 23, 42, 0.12));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #0f172a);
  user-select: none;
  outline: none;
}

/* Horizontal divider between section groups */
.pg-col-ctx-menu__separator {
  height: 1px;
  background: var(--pg-colors-border, #e2e8f0);
  margin: 4px 0;
}

/* ── Menu items ─────────────────────────────────────────────── */

/* Base item — covers both leaf items and parent (submenu-trigger) items */
.pg-col-ctx-menu__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  cursor: pointer;
  transition: background var(--pg-transitions-fast, 80ms ease);
  outline: none;
  white-space: nowrap;
}

.pg-col-ctx-menu__item:hover,
.pg-col-ctx-menu__item:focus-visible {
  background: var(--pg-colors-background-alt, #f1f5f9);
}

/* Highlighted / "currently applied" item (e.g. active sort direction) */
.pg-col-ctx-menu__item--active {
  color: var(--pg-colors-primary, #2563eb);
  font-weight: 600;
}

/* Disabled item — rendered but not interactive */
.pg-col-ctx-menu__item--disabled {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
}

/* ── Item anatomy ────────────────────────────────────────────── */

/* Leading icon */
.pg-col-ctx-menu__item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  opacity: 0.6;
}

.pg-col-ctx-menu__item--active .pg-col-ctx-menu__item-icon {
  opacity: 1;
}

/* Text label — fills remaining space */
.pg-col-ctx-menu__item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Trailing chevron indicating a fly-out submenu */
.pg-col-ctx-menu__item-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  opacity: 0.4;
  margin-left: 4px;
  transition: opacity var(--pg-transitions-fast, 80ms ease);
}

.pg-col-ctx-menu__item--has-submenu:hover .pg-col-ctx-menu__item-chevron {
  opacity: 0.75;
}

/* ── Fly-out submenu ─────────────────────────────────────────── */

/* Hidden by default; shown when JS adds --open. Positioned fixed rather than
   absolute-within-parent because it is portaled to document.body while open
   (see ColumnMenu.openSubmenu) — left/top are set inline in viewport
   coordinates by adjustSubmenuPosition. */
.pg-col-ctx-menu__submenu {
  display: none;
  position: fixed;
  min-width: 180px;
  padding: 4px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-dropdown, 0 8px 24px rgba(15, 23, 42, 0.12));
  z-index: 10000;
}

/* JS-controlled open state */
.pg-col-ctx-menu__submenu--open {
  display: block;
}

/* Invisible hover bridge — prevents flicker when mouse crosses from
   parent item edge into the submenu. Extends 6px to the left of the submenu. */
.pg-col-ctx-menu__submenu--open::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 0;
  width: 8px;
  height: 100%;
}

/* ──────────────────── Master/Detail ────────────────────
   The detail layer is a sibling of the left/center/right body panels, not a
   child of any of them — that is what lets a detail row span the full grid
   width regardless of pinned columns. Its content wrapper receives only the
   vertical scroll transform (never the horizontal one center columns use),
   so it structurally cannot shift when the user scrolls horizontally. */
.pg-detail-layer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  /* Stops short of the vertical scrollbar's *current* column width (0 when
     it's hidden) instead of a blanket inset:0 — otherwise an expanded
     detail row's opaque background paints over the native scrollbar
     whenever one is showing. See ScrollController.syncScrollbars. */
  right: var(--pg-scrollbar-v-live-width, 0px);
  overflow: hidden;
  pointer-events: none;
  /* Tied with .pg-panel--left/--right's z-index (2, base-styles.ts ~line
     335) rather than below it — this layer is a later DOM sibling of the
     panels (mounted after them in GridRenderer.buildLayout), so an equal
     z-index still paints on top per normal stacking-order tie-breaking.
     This is what lets an expanded detail row's opaque background cover the
     pinned panels' own edge box-shadow instead of that shadow bleeding
     across the full-width detail content underneath (the panels are
     full-viewport-height flex items, so their shadow would otherwise span
     every detail row too, not just their own pinned cells). Sticky Master/
     Detail rows are unaffected by this ordering — they live in the
     independent, always-on-top .pg-sticky-layer below, not here. */
  z-index: 2;
}
.pg-detail-layer__content {
  position: relative;
  width: 100%;
  height: 100%;
  transform: translateY(var(--pg-scroll-y, 0px));
}
/* Sticky Master/Detail row layer — a TOP-LEVEL sibling of the left/center/
   right panels and of .pg-detail-layer (not nested inside any of them).
   .pg-panel--left/--right set their own explicit z-index for pinned-column
   elevation, which makes each one its own stacking context — anything
   nested inside is trapped there and can never out-rank a sibling like
   .pg-detail-layer merely by having a higher z-index of its own. Living at
   this same top level lets one z-index correctly out-rank everything, in
   every pinned/non-pinned column, with no stacking-context surprises.
   The container itself is pointer-events:none (so empty space with no
   sticky row never blocks clicks through to what's underneath); the actual
   row element re-enables pointer-events at the default (auto). */
.pg-sticky-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: var(--pg-scrollbar-v-live-width, 0px);
  bottom: 0;
  pointer-events: none;
  z-index: 3;
}
/* Mirrors .pg-panel--left's own pinned-edge shadow. That shadow lives on the
   panel container itself, which a stuck row's own background paints over
   for its own height once moved into this overlay — without repeating it
   here, the pinned-edge shadow has a visible gap wherever a sticky row
   currently sits.
   z-index: 2 (matching .pg-panel--left/--right's own z-index, base-styles.ts
   ~line 334) is required, not optional — this shadow bleeds *rightward*,
   into the center region's own horizontal space, and .pg-sticky-layer__center
   is appended after it in the DOM (see GridRenderer.buildStickyLayer); on
   equal stacking contexts a later sibling paints over an earlier one, so
   without an explicit z-index center's own background silently covers the
   bled-through part of this shadow, while the right shadow (appended last)
   was never affected — z-index makes both sides correct regardless of
   append order instead of depending on it. */
.pg-sticky-layer__left {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--pg-left-panel-width, 0px);
  overflow: hidden;
  box-shadow: 2px 0 4px rgba(0,0,0,0.06);
  z-index: 2;
}
.pg-sticky-layer__center {
  position: absolute;
  top: 0;
  left: var(--pg-left-panel-width, 0px);
  right: var(--pg-right-panel-width, 0px);
  height: 100%;
  overflow: hidden;
  z-index: 1;
}
/* Mirrors .pg-panel--center .pg-panel__content's horizontal-scroll transform
   so a stuck row's center cells track the user's horizontal scroll exactly
   like the real (non-sticky) center panel does. */
.pg-sticky-layer__center-inner {
  position: relative;
  height: 100%;
  width: var(--pg-center-content-width, 100%);
  transform: translateX(var(--pg-scroll-x, 0px));
}
/* Mirrors .pg-panel--right's own pinned-edge shadow — see .pg-sticky-layer__left above. */
.pg-sticky-layer__right {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: var(--pg-right-panel-width, 0px);
  overflow: hidden;
  box-shadow: -2px 0 4px rgba(0,0,0,0.06);
}
.pg-row--sticky {
  /* The sticky layer container above is pointer-events:none (so empty space
     with no sticky row never blocks clicks through to whatever's underneath)
     — pointer-events inherits, so without this the row itself, and every
     interactive thing inside it (cells, the tree/group toggle, checkboxes),
     would silently inherit "none" and stop responding to clicks entirely. */
  pointer-events: auto;
}
.pg-row--detail-container {
  position: absolute;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: auto;
  padding: 20px;
  background: var(--pg-colors-surface, #fff);
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  opacity: 1;
  /* Deliberately not tied to the theme's --pg-transitions-duration-* tokens —
     those are tuned for snappy hover/focus feedback elsewhere; expand/collapse
     reads better slightly slower and more deliberate. */
  transition:
    height 340ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 260ms ease;
}
/* Expand: fades in on first mount; height grows for free once RowPositionSheet
   updates from the initial min/cached height to the auto-measured one. */
.pg-row--detail-container.pg-row--detail-entering {
  opacity: 0;
}
/* Collapse: DetailRowRenderer.beginCollapse freezes top/height as inline
   styles first (the RowPositionSheet rule for this row is about to disappear
   for good), then this class plus height: 0 (set in JS) drives the shrink. */
.pg-row--detail-container.pg-row--detail-collapsing {
  opacity: 0;
  border-bottom-color: transparent;
}
.pg-detail-nested-grid-host {
  width: 100%;
  height: 100%;
}
.pg-detail-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-detail-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--pg-group-toggle-size, 24px);
  height: var(--pg-group-toggle-size, 24px);
  margin-left: 8px;
  margin-right: 4px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms),
    color var(--pg-transitions-duration-fast, 100ms);
}
.pg-detail-toggle:hover {
  background: var(--pg-colors-row-hover, #f0f7ff);
  color: var(--pg-colors-text-primary, #1e293b);
}
.pg-detail-resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  cursor: row-resize;
  background: transparent;
  transition: background var(--pg-transitions-duration-fast, 100ms);
}
.pg-detail-resize-handle:hover {
  background: var(--pg-colors-resize-handle-color, #e2e8f0);
}

/* ──────────────────── Photon AI ────────────────────
   Floating command bar, anchored to the grid body's bottom-right corner.
   Mounted as a sibling of the pinned-column panels (see PhotonAIPanel.mount /
   GridRenderer.buildLayout) so it floats independently of virtualization and
   scroll; the grid body's own overflow: hidden is what keeps it inside the
   grid container per spec, without this component needing to enforce that
   itself. */
.pg-ai-launcher {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 201;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-primary-text, #ffffff);
  box-shadow: var(--pg-shadows-lg, 0 8px 24px rgba(15, 23, 42, 0.16));
  cursor: pointer;
  transition:
    transform var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base, ease),
    opacity var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base, ease),
    background var(--pg-transitions-duration-fast, 100ms);
}
.pg-ai-launcher:hover {
  background: var(--pg-colors-primary-hover, #1d4ed8);
  transform: scale(1.06);
}
.pg-ai-launcher:active {
  background: var(--pg-colors-primary-active, #1e40af);
  transform: scale(0.97);
}
.pg-ai-launcher--hidden {
  opacity: 0;
  transform: scale(0.7);
  pointer-events: none;
}

.pg-ai-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 201;
  width: min(360px, calc(100% - 24px));
  display: none;
  flex-direction: column;
  background: var(--pg-colors-surface, #ffffff);
  border: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-lg, 10px);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-ai-panel--open {
  display: flex;
}

.pg-ai-panel__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
}
.pg-ai-panel__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--pg-typography-font-size-sm, 13px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  color: var(--pg-colors-primary, #2563eb);
}
.pg-ai-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms);
}
.pg-ai-panel__close:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
}

.pg-ai-panel__log {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.pg-ai-panel__message {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: var(--pg-borders-radius-lg, 10px);
  font-size: var(--pg-typography-font-size-sm, 13px);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.pg-ai-panel__message--user {
  align-self: flex-end;
  background: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-primary-text, #ffffff);
  border-bottom-right-radius: var(--pg-borders-radius-sm, 4px);
}
.pg-ai-panel__message--assistant {
  align-self: flex-start;
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
  border-bottom-left-radius: var(--pg-borders-radius-sm, 4px);
}
.pg-ai-panel__message--assistant.pg-ai-panel__message--error {
  background: var(--pg-colors-error-subtle, #fef2f2);
  color: var(--pg-colors-error, #dc2626);
}

.pg-ai-panel__input-wrap {
  position: relative;
  flex-shrink: 0;
  display: flex;
  padding: 10px 12px 12px;
  border-top: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
}
.pg-ai-panel__input {
  flex: 1 1 0;
  width: 100%;
  min-height: 36px;
  max-height: 120px;
  padding: 8px 40px 8px 12px;
  border: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-surface, #ffffff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  line-height: 1.4;
  resize: none;
  outline: none;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-ai-panel__input::placeholder {
  color: var(--pg-colors-text-disabled, #94a3b8);
}
.pg-ai-panel__input:focus {
  border-color: var(--pg-colors-border-focus, #2563eb);
}
.pg-ai-panel__send {
  position: absolute;
  right: 20px;
  bottom: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-primary-text, #ffffff);
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms),
    transform var(--pg-transitions-duration-fast, 100ms),
    opacity var(--pg-transitions-duration-fast, 100ms);
}
.pg-ai-panel__send:hover:not(:disabled) {
  background: var(--pg-colors-primary-hover, #1d4ed8);
  transform: scale(1.08);
}
.pg-ai-panel__send:disabled {
  background: var(--pg-colors-text-disabled, #94a3b8);
  opacity: 0.5;
  cursor: default;
}

/* ──────────────────── Custom cell tooltip ────────────────────
 * Only mounted/shown for columns with renderer.tooltip — plain columns keep
 * using the free native title attribute. Positioned via a transform set
 * in JS relative to .pg-grid__body so it never affects grid layout. */
.pg-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: var(--pg-z-index-tooltip, 150);
  max-width: 320px;
  padding: var(--pg-spacing-xs, 6px) var(--pg-spacing-sm, 10px);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-tooltip-bg, #1f2937);
  color: var(--pg-colors-tooltip-text, #ffffff);
  font-family: var(--pg-typography-font-family, sans-serif);
  font-size: var(--pg-typography-font-size-xs, 12px);
  line-height: 1.4;
  box-shadow: var(--pg-shadows-dropdown, 0 4px 12px rgba(0, 0, 0, 0.15));
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity var(--pg-transitions-duration-fast, 100ms),
    visibility var(--pg-transitions-duration-fast, 100ms);
}
.pg-tooltip--visible {
  opacity: 1;
  visibility: visible;
}

`;
const css = [baseCss, themeQuartzCss, themeAlpineCss, themeBalhamCss, themeMaterialCss, themeDarkCss].join('\n');
export function injectBaseStyles() {
    if (document.getElementById(STYLE_ID))
        return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
}
export function removeBaseStyles() {
    document.getElementById(STYLE_ID)?.remove();
}
//# sourceMappingURL=base-styles.js.map