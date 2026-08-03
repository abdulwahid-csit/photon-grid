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

/** Which side of the anchor the panel was ultimately placed on. */
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
}

const DEFAULT_GAP = 4;

/**
 * Places a panel beside its anchor, flipping and clamping to stay on screen.
 *
 * Prefers below. Flips above only when below genuinely cannot fit *and* above
 * has more room — flipping into an equally cramped space just moves the problem
 * and makes the panel jump for no benefit.
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

  const flip = height > roomBelow && roomAbove > roomBelow;
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
