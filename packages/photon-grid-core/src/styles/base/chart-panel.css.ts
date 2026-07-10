/**
 * Photon Grid base styles — chart-panel section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const chartPanelCss = `/* ──────────────────── Chart Panel ──────────────────── */
.pg-chart-panel-backdrop {
  position: absolute; inset: 0; z-index: 9990;
  background: transparent;
  overflow: hidden;
  pointer-events: none;
}
// .pg-chart-panel-backdrop--open {
//   pointer-events: auto;
// }
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
  flex: 1; min-height: 0; position: relative; overflow: hidden;
}
.pg-chart-panel__chart-area {
  position: absolute; top: 0; left: 0; bottom: 0; right: 0;
  padding: 8px; overflow: hidden;
  transition: right 240ms cubic-bezier(0.22, 0.61, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .pg-chart-panel__chart-area { transition: none; }
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

`;
