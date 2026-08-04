/**
 * Photon Grid base styles — container resize handles.
 *
 * Registered near the end of the cascade: handles sit above every panel and
 * overlay the grid draws, so their positioning rules should win any
 * same-specificity tie.
 *
 * Colours, radii and spacing all resolve through `--pg-*` tokens, so the
 * affordance follows light/dark and every variant. The only literals are the
 * handle's own hit geometry, which is driven by `--pg-resize-handle-size`
 * (written by `GridResizeController` from `GridResizeConfig.handleSize`).
 */
export const gridResizeCss = `/* ──────────────────── Container resize handles ──────────────────── */
/* Each handle is an invisible hit strip along one edge or corner of the grid
   wrapper. The visible affordance is the corner grip below — edges rely on the
   cursor change alone, which is the convention users already know from window
   and panel chrome. */
.pg-resize-handle {
  position: absolute;
  z-index: 20;
  touch-action: none;
  /* No background: the strip is a hit area, not a painted element. Giving it
     one would draw a line inside the grid's border on all four sides. */
  background: transparent;
}

/* ── Edges ────────────────────────────────────────────────────────────────
   Inset by the handle size at both ends so an edge strip never covers the
   corner strips, which must win the hit test where they overlap. */
.pg-resize-handle--top,
.pg-resize-handle--bottom {
  left: var(--pg-resize-handle-size, 6px);
  right: var(--pg-resize-handle-size, 6px);
  height: var(--pg-resize-handle-size, 6px);
  cursor: ns-resize;
}
.pg-resize-handle--top { top: 0; }
.pg-resize-handle--bottom { bottom: 0; }

.pg-resize-handle--left,
.pg-resize-handle--right {
  top: var(--pg-resize-handle-size, 6px);
  bottom: var(--pg-resize-handle-size, 6px);
  width: var(--pg-resize-handle-size, 6px);
  cursor: ew-resize;
}
.pg-resize-handle--left { left: 0; }
.pg-resize-handle--right { right: 0; }

/* ── Corners ──────────────────────────────────────────────────────────────
   Twice the edge size so a corner is comfortably reachable, and a higher
   z-index so it beats the two edges it overlaps. */
.pg-resize-handle--topLeft,
.pg-resize-handle--topRight,
.pg-resize-handle--bottomLeft,
.pg-resize-handle--bottomRight {
  width: calc(var(--pg-resize-handle-size, 6px) * 2);
  height: calc(var(--pg-resize-handle-size, 6px) * 2);
  z-index: 21;
}
.pg-resize-handle--topLeft     { top: 0; left: 0; cursor: nwse-resize; }
.pg-resize-handle--topRight    { top: 0; right: 0; cursor: nesw-resize; }
.pg-resize-handle--bottomLeft  { bottom: 0; left: 0; cursor: nesw-resize; }
.pg-resize-handle--bottomRight { bottom: 0; right: 0; cursor: nwse-resize; }

/* ── Bottom-right grip ────────────────────────────────────────────────────
   The one handle that gets a visible mark, mirroring the native <textarea>
   affordance users already recognise as "this resizes". Two stacked diagonal
   strokes drawn with a gradient rather than glyphs, so it needs no icon and no
   extra element. */
.pg-resize-handle--bottomRight::after {
  content: "";
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 8px;
  height: 8px;
  opacity: 0.55;
  background:
    linear-gradient(
      135deg,
      transparent 0 45%,
      var(--pg-colors-text-secondary, #64748b) 45% 60%,
      transparent 60% 100%
    ),
    linear-gradient(
      135deg,
      transparent 0 70%,
      var(--pg-colors-text-secondary, #64748b) 70% 85%,
      transparent 85% 100%
    );
  pointer-events: none;
  transition: opacity var(--pg-motion-duration-fast, 120ms) ease;
}
.pg-grid--resizable .pg-resize-handle--bottomRight:hover::after {
  opacity: 1;
}

/* ── Hover / active feedback ──────────────────────────────────────────────
   An edge lights up only while the pointer is on it, so the grid's chrome is
   unchanged at rest. Drawn as an inset shadow rather than a border so it costs
   no layout and cannot shift the grid's contents by a pixel. */
.pg-resize-handle:hover {
  box-shadow: inset 0 0 0 1px var(--pg-colors-accent, #2563eb);
}

/* ── While dragging ───────────────────────────────────────────────────────
   The grid's contents stop taking the pointer for the duration, so a drag that
   crosses the body never selects cell text, starts a cell-range selection, or
   triggers a hover highlight. The handles themselves keep their events — they
   are what the gesture is on. */
.pg-grid--resizing {
  user-select: none;
}
.pg-grid--resizing > *:not(.pg-resize-handle) {
  pointer-events: none;
}

`;
