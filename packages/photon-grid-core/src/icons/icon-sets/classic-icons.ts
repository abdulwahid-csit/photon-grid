import type { IconSet } from '../../types/icon.types';

/**
 * Classic icon pack — the sort arrows and the overflow glyph, nothing else.
 *
 * Classic is the default skin and deliberately has no icon opinion: every other
 * name falls through to `coreIcons`, which is what keeps this file from turning
 * into a fifth full pack that has to be maintained alongside the rest.
 *
 * The two sort glyphs it does override are the ones that carry the theme's
 * reference point. `coreIcons` draws sort direction as an Octicon — a stepped
 * bar chart with an
 * arrow beside it — which reads as "sorting" the verb, an affordance you could
 * click. AG Grid, which this skin is pitched against, marks a sorted column with
 * a single bare arrow: the column *is* ascending, so the glyph is a direction,
 * not a control. At the 14px the header draws it, the bars are also the first
 * thing to turn to mush, while an arrow stays legible.
 *
 * Drawn on the same geometry as the core chevrons — 16px box, 1.5px stroke,
 * round caps and joins — so the header's sort arrow, its menu chevron and the
 * pagination arrows all read as one family.
 *
 * `sortNone` is intentionally absent: the base stylesheet leaves the sort icon
 * at `opacity: 0` until a column is actually sorted, so classic never paints it.
 */
export const classicIcons: IconSet = {
  /** Ascending — a plain upward arrow. */
  sortAsc: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12.75V3.75M4.5 7.25 8 3.75l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  /** Descending — the same arrow, pointing down. */
  sortDesc: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 3.25v9M4.5 8.75 8 12.25l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  /**
   * Overflow / "more options" — drawn as a **kebab**, three dots stacked
   * vertically.
   *
   * `menuHorizontal` is the registry *slot* every overflow trigger asks for —
   * the column header's button (`header-renderer`) and the cell-actions overflow
   * (`actions.ts`, `DEFAULT_MENU_ICON`) — so the name records which slot is being
   * filled, not which way this pack chooses to draw it. Classic draws it
   * vertically on purpose: at the 14px the header renders, a horizontal ellipsis
   * sitting beside a horizontal funnel and a horizontal label reads as more of
   * the same line, while a vertical stack separates the "open a menu" affordance
   * from everything else in the row. Both triggers move together, which is why
   * this is set on the pack rather than on one renderer.
   *
   * Same geometry as the core glyph, turned through 90°: r=1.5 dots on the 16px
   * box's centre line, 5px apart, so it stays on the family's optical weight.
   */
  menuHorizontal: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="3" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="13" r="1.5" fill="currentColor"/></svg>`,
};
