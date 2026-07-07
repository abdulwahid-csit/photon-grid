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

`;
