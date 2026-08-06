/**
 * Auto-placement for floating panels.
 *
 * Every overlay the grid opens — a dropdown editor, a column menu, an avatar
 * group's roster — wants the same three things: sit next to its trigger, flip
 * to the other side when there is no room, and never hang off the edge of the
 * viewport. That logic existed in three near-identical copies before this
 * module; each one drifted its own gap constant and its own flip threshold.
 *
 * @packageDocumentation
 */

/**
 * Which side of the anchor the panel was ultimately placed on.
 */
export type OverlayPlacement = 'below' | 'above';

/** A resolved position, in viewport coordinates. */
export interface OverlayPosition {
  readonly x: number;
  readonly y: number;
  readonly placement: OverlayPlacement;
  /** Space available to the panel on the chosen side; a scrolling panel caps its height to this. */
  readonly maxHeight: number;
}

export interface OverlayPlacementOptions {
  /** The element the panel is anchored to. */
  readonly anchor: DOMRect;
  /** Natural panel size. Height may be an estimate — {@link OverlayPosition.maxHeight} is the real limit. */
  readonly width: number;
  readonly height: number;
  /** Distance between anchor and panel, and the minimum inset from a viewport edge. @default 4 */
  readonly gap?: number;
  /**
   * Horizontal alignment against the anchor.
   * @default 'start'
   */
  readonly align?: 'start' | 'center' | 'end';
  /**
   * Smallest height at which this panel is worth showing, in px.
   *
   * When set, a side is judged by this and not by {@link height}: a searchable
   * list squeezed into 90px is technically "placed" and practically unusable,
   * and the measured height cannot tell the two apart — a panel whose content
   * has not laid out yet, or that the user has just filtered down to one row,
   * measures short and takes a sliver it will immediately overflow.
   *
   * Reserving the space a *full* panel needs also makes placement stable: the
   * panel does not migrate from below to above as its contents change.
   *
   * @default undefined — the panel's own height is the requirement, which is
   *   the right rule for a panel of fixed content.
   */
  readonly minHeight?: number;
  /**
   * What to do when the preferred side cannot host the panel.
   *
   * - `'largest-side'` — take whichever side has more room, which may still be
   *   the preferred one. Right for a menu, where a cramped panel that stays
   *   attached to its trigger beats one that jumps.
   * - `'opposite'` — flip to the other side, whatever room it has. Right for a
   *   dropdown: a list that opens *downwards* off the bottom of the screen is
   *   unusable no matter how it is clamped, and flipping is what the user
   *   expects a dropdown near the bottom edge to do.
   *
   * @default 'largest-side' — the historical behaviour, so an existing caller
   *   that has not thought about the cramped case keeps the placement it had.
   */
  readonly fallback?: 'largest-side' | 'opposite';
}

const DEFAULT_GAP = 4;

/**
 * Places a panel beside its anchor, flipping and clamping to stay on screen.
 *
 * Prefers below. When below cannot host the panel it flips above — always, for
 * a caller that asked for `fallback: 'opposite'`; only when above is roomier
 * otherwise, because flipping a menu into an equally cramped space just moves
 * the problem and makes it jump for no benefit.
 *
 * "Cannot host" means {@link OverlayPlacementOptions.minHeight} where one is
 * given, not the panel's measured height — see that option for why.
 *
 * Coordinates are viewport-relative, for a `position: fixed` panel. Fixed
 * rather than absolute deliberately: an absolutely-positioned panel inside the
 * grid would be clipped by the scroll container it lives in.
 *
 * @returns The position to apply, plus the height the panel must fit within.
 */
export function placeOverlay(options: OverlayPlacementOptions): OverlayPosition {
  const { anchor, width, height } = options;
  const gap = options.gap ?? DEFAULT_GAP;

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const roomBelow = viewportH - anchor.bottom - gap;
  const roomAbove = anchor.top - gap;

  // What a side has to offer to be usable. With no minimum asked for it is the
  // panel's own height — the historical rule. With one, it is the minimum
  // itself, whatever the panel currently measures: a list that measures 60px
  // because its options have not laid out yet, or because the user has filtered
  // it down to one, is about to be 260px again, and a placement that has to be
  // redone the moment the content changes is not a placement.
  const required = options.minHeight ?? height;

  // Flip when below cannot host the panel — unconditionally for a caller that
  // asked for the opposite side, and only for a genuine improvement otherwise.
  const flip =
    roomBelow >= required
      ? false
      : options.fallback === 'opposite' || roomAbove > roomBelow;

  const placement: OverlayPlacement = flip ? 'above' : 'below';
  const maxHeight = Math.max(0, flip ? roomAbove : roomBelow);

  // The panel is clamped to `maxHeight` by CSS, so its on-screen height is
  // whichever is smaller — using the natural height here would push a tall
  // flipped panel off the top edge.
  const effectiveHeight = Math.min(height, maxHeight);
  const y = flip ? anchor.top - effectiveHeight - gap : anchor.bottom + gap;

  let x: number;
  if (options.align === 'center') x = anchor.left + anchor.width / 2 - width / 2;
  else if (options.align === 'end') x = anchor.right - width;
  else x = anchor.left;

  // Clamp horizontally. `Math.max(gap, …)` last so a panel wider than the
  // viewport pins to the left edge rather than off the right of it.
  x = Math.max(gap, Math.min(x, viewportW - width - gap));

  return { x, y: Math.max(gap, y), placement, maxHeight };
}
