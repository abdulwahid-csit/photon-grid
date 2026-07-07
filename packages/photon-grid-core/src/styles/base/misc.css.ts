/**
 * Photon Grid base styles — misc section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const miscCss = `/* ──────────────────── Overlay ──────────────────── */
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

`;
