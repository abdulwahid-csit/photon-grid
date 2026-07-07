/**
 * Photon Grid base styles — tree section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const treeCss = `/* ──────────────────── Tree Data ────────────────────
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

`;
