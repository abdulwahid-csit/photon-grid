/**
 * Photon Grid base styles — scrollbars section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const scrollbarsCss = `/* ──────────────────── Scrollbars ──────────────────── */

/* Native vertical scrollbar — flex item that lives beside the center panel.
   It is NOT absolutely positioned so it never overlaps cell content; the center
   panel shrinks to make room for it, keeping every cell border fully visible. */
.pg-scrollbar-v-native {
  flex-shrink: 0;
  overflow-y: scroll;
  overflow-x: hidden;
  background: var(--pg-colors-scrollbar-track, var(--pg-colors-scrollbar-bg, #f8fafc));
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
.pg-scrollbar-h-spacer { flex-shrink: 0; background: var(--pg-colors-scrollbar-track, var(--pg-colors-scrollbar-bg, #f8fafc)); }
.pg-scrollbar-h-spacer--left  { width: var(--pg-left-panel-width, 0px); overflow: scroll; }
.pg-scrollbar-h-spacer--right { width: var(--pg-right-panel-width, 0px); overflow: scroll; }
/* Aligns the h-scroll track with the narrowed center panel (which is now
   offset by the vertical scrollbar width captured in --pg-scrollbar-v-width). */
.pg-scrollbar-h-spacer--vscroll {
  flex-shrink: 0;
  width: 0px;
  background: var(--pg-colors-scrollbar-track, var(--pg-colors-scrollbar-bg, #f8fafc));
}
/* Native horizontal scrollbar container */
.pg-scrollbar-h-native {
  flex: 1 1 0;
  min-width: 0;
  overflow-x: scroll;
  overflow-y: hidden;
  background: var(--pg-colors-scrollbar-track, var(--pg-colors-scrollbar-bg, #f8fafc));
}
.pg-scrollbar-h-content {
  height: 1px;
  pointer-events: none;
}

/* ── Themed native scrollbar (track + thumb) ──────────────────────────────────
   Without these the browser paints its default (light) scrollbar, so dark
   themes showed white bars. Colours come from theme tokens with light-theme
   fallbacks, so every theme — including custom ones — themes automatically.
   Firefox uses scrollbar-color; Chromium/Safari use the ::-webkit pseudos. */
.pg-scrollbar-v-native,
.pg-scrollbar-h-native,
.pg-scrollbar-h-spacer--left,
.pg-scrollbar-h-spacer--right {
  // scrollbar-width: thin;
  scrollbar-color: var(--pg-colors-scrollbar-thumb, #ffffff) var(--pg-colors-scrollbar-track, var(--pg-colors-scrollbar-bg, #f8fafc));
}
.pg-scrollbar-v-native::-webkit-scrollbar,
.pg-scrollbar-h-native::-webkit-scrollbar,
.pg-scrollbar-h-spacer--left::-webkit-scrollbar,
.pg-scrollbar-h-spacer--right::-webkit-scrollbar {
  // width: var(--pg-scrollbar-v-width, 12px);
  // height: var(--pg-scrollbar-h-height, 12px);
  background: var(--pg-colors-scrollbar-track, var(--pg-colors-scrollbar-bg, #f8fafc));
}
.pg-scrollbar-v-native::-webkit-scrollbar-track,
.pg-scrollbar-h-native::-webkit-scrollbar-track,
.pg-scrollbar-h-spacer--left::-webkit-scrollbar-track,
.pg-scrollbar-h-spacer--right::-webkit-scrollbar-track {
  background: var(--pg-colors-scrollbar-track, var(--pg-colors-scrollbar-bg, #f8fafc));
}
.pg-scrollbar-v-native::-webkit-scrollbar-thumb,
.pg-scrollbar-h-native::-webkit-scrollbar-thumb,
.pg-scrollbar-h-spacer--left::-webkit-scrollbar-thumb,
.pg-scrollbar-h-spacer--right::-webkit-scrollbar-thumb {
  background: var(--pg-colors-scrollbar-thumb, #cbd5e1);
  // border-radius: 8px;
  // border: 3px solid var(--pg-colors-scrollbar-track, var(--pg-colors-scrollbar-bg, #f8fafc));
}
.pg-scrollbar-v-native::-webkit-scrollbar-thumb:hover,
.pg-scrollbar-h-native::-webkit-scrollbar-thumb:hover,
.pg-scrollbar-h-spacer--left::-webkit-scrollbar-thumb:hover,
.pg-scrollbar-h-spacer--right::-webkit-scrollbar-thumb:hover {
  background: var(--pg-colors-scrollbar-thumb-hover, #94a3b8);
}
.pg-scrollbar-v-native::-webkit-scrollbar-corner,
.pg-scrollbar-h-native::-webkit-scrollbar-corner {
  background: var(--pg-colors-scrollbar-track, var(--pg-colors-scrollbar-bg, #f8fafc));
}

/* Hidden state — applied to wraps */
.pg-scrollbar--hidden { display: none; }

`;
