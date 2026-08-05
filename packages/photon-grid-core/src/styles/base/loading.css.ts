/**
 * Photon Grid base styles — loading overlay.
 *
 * Layout for the two loading indicators (`spinner` and `skeleton`) plus the
 * three backdrop modes. The spinner itself is an icon-registry glyph and the
 * shimmer bar comes from `skeleton.css.ts` — this module contributes only the
 * geometry that arranges them, so the animation, the varied bar widths, the
 * `prefers-reduced-motion` fallback and the `--pg-colors-skeleton*` tokens are
 * shared with demand-loading placeholder rows rather than re-authored.
 *
 * Concatenated immediately after `skeletonCss` (see `base-styles.ts`), so these
 * layout rules win a same-specificity tie against the shared bar rules they
 * refine, and after `miscCss`, so the backdrop modifiers below outrank the
 * default `.pg-overlay--loading` background — including its dark-mode variant,
 * which carries the same specificity and therefore loses on source order.
 *
 * Every value comes from theme tokens; nothing here is hardcoded styling that a
 * theme cannot reach.
 */
export const loadingCss = `/* ─── Loading overlay: backdrop modes ─── */

/* Opaque — the body is fully masked. The default for skeleton placeholders,
   which read as noise when stale rows show through them. */
.pg-overlay--loading.pg-overlay--backdrop-opaque {
  background: var(--pg-colors-surface, #fff);
}

/* None — the indicator floats over untouched rows, and the rows stay
   interactive: a background refresh should not swallow clicks. */
.pg-overlay--loading.pg-overlay--backdrop-none {
  background: transparent;
  pointer-events: none;
}

/* ─── Loading overlay: spinner indicator ─── */

.pg-overlay--spinner .pg-overlay__spinner {
  color: var(--pg-colors-primary, #2563eb);
}

/* ─── Loading overlay: skeleton indicator ─── */

/* The overlay centres its children by default (see .pg-overlay); placeholder
   rows must instead start at the top edge and fill the width, exactly as real
   rows do. */
.pg-overlay--skeleton {
  align-items: stretch;
  justify-content: flex-start;
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.pg-loading-skeleton {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Mirrors the body's own left / centre / right panel split, so pinned columns
   stay pinned behind the placeholders. */
.pg-loading-skeleton__panel {
  display: flex;
  flex-direction: column;
  flex: none;
  overflow: hidden;
}
.pg-loading-skeleton__panel--center { flex: 1 1 auto; }

.pg-loading-skeleton__track {
  display: flex;
  flex-direction: column;
}

/* The same custom property the real centre panel translates by, so placeholder
   columns follow horizontal scroll with no scroll listener of our own. */
.pg-loading-skeleton__panel--center .pg-loading-skeleton__track {
  transform: translateX(var(--pg-scroll-x, 0px));
}

/* Mirrors .pg-row's box (fixed height, bottom rule) without inheriting its
   absolute positioning — these rows stack in normal flow instead of being
   placed by the virtualizer. */
.pg-loading-skeleton__row {
  display: flex;
  align-items: stretch;
  flex: none;
  height: var(--pg-skeleton-row-height, 48px);
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  background: var(--pg-colors-row-background, #fff);
}

/* Fallback only. Every placeholder cell carries a data-col-id attribute, which
   ColumnStyleManager's generated rules target at higher specificity — so a
   column resize retargets these widths with no JavaScript and no rebuild. This
   width applies only in the no-columns case, where no such rule exists. */
.pg-loading-skeleton__cell {
  width: var(--pg-sizing-column-default-width, 150px);
}

/* Stagger the shimmer across rows so a screenful reads as content streaming in
   rather than as one block pulsing in lockstep. The cycle is short and
   deterministic, so nothing appears to reshuffle. */
.pg-loading-skeleton__row:nth-child(2n) .pg-cell__inner::before { animation-delay: 0.12s; }
.pg-loading-skeleton__row:nth-child(3n) .pg-cell__inner::before { animation-delay: 0.24s; }
`;