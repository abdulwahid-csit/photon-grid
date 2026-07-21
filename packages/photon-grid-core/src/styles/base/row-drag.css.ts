/**
 * Photon Grid base styles — row-drag section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const rowDragCss = `/* ──────────────────── Row Drag ──────────────────── */
.pg-grid__body { position: relative; transform: translateZ(10px);}

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

`;
