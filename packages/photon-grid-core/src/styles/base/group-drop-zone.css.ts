/**
 * Photon Grid base styles — group-drop-zone section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const groupDropZoneCss = `/* ──────────────────── Group drop zone ──────────────────── */
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
  background: var(--pg-colors-group-zone-over, var(--pg-colors-selection-background, #eff6ff));
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
  background: var(--pg-colors-chip-background, var(--pg-colors-badge-background, #e0e7ff));
  color: var(--pg-colors-chip-text, var(--pg-colors-badge-text, #1e40af));
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

`;
