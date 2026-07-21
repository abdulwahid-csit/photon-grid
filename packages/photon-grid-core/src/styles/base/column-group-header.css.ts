/**
 * Photon Grid base styles — column-group-header section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const columnGroupHeaderCss = `/* ──────────────────── Column group header rows ──────────────────── */
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
  background: var(--pg-colors-drag-ghost-background, var(--pg-colors-drag-preview-background, var(--pg-colors-surface, #fff)));
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

`;
