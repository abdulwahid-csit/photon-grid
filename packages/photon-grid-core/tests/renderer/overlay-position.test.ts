// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { placeOverlay } from '../../src/renderer/overlay-position';

/**
 * Placement is pure geometry, so it is tested as geometry: a viewport of known
 * size, an anchor at a known place, and an assertion about where the panel
 * lands. Every case here is one a user hits — a dropdown near the bottom of the
 * screen, a menu on a short window — rather than an abstract coordinate check.
 */

const VIEWPORT_W = 1000;
const VIEWPORT_H = 600;
const GAP = 4;

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

/** An anchor rect; only the four edges and the width are ever read. */
function anchorAt(top: number, height = 28, left = 100, width = 200): DOMRect {
  return {
    top, left, width, height,
    bottom: top + height,
    right: left + width,
    x: left, y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

beforeEach(() => {
  setViewport(VIEWPORT_W, VIEWPORT_H);
});

describe('placeOverlay', () => {
  it('sits below the anchor when the panel fits there', () => {
    const anchor = anchorAt(100);
    const placed = placeOverlay({ anchor, width: 200, height: 300 });

    expect(placed.placement).toBe('below');
    expect(placed.y).toBe(anchor.bottom + GAP);
    expect(placed.x).toBe(anchor.left);
  });

  it('flips above when the panel does not fit below and above is roomier', () => {
    // 500px down a 600px viewport: 96px below, 496px above.
    const anchor = anchorAt(500);
    const placed = placeOverlay({ anchor, width: 200, height: 300 });

    expect(placed.placement).toBe('above');
    expect(placed.y).toBe(anchor.top - 300 - GAP);
    expect(placed.maxHeight).toBe(anchor.top - GAP);
  });

  it('caps a flipped panel taller than the space above instead of hanging it off the top', () => {
    const placed = placeOverlay({
      anchor: anchorAt(500), width: 200, height: 5000, fallback: 'opposite',
    });

    expect(placed.placement).toBe('above');
    expect(placed.maxHeight).toBe(500 - GAP);
    expect(placed.y).toBe(GAP);
  });

  it('keeps the roomier side for callers that did not opt in', () => {
    // Neither side fits a 400px panel; above (286) beats below (282).
    const placed = placeOverlay({ anchor: anchorAt(290), width: 200, height: 400 });

    expect(placed.placement).toBe('above');
  });

  it('never lets a panel hang off either horizontal edge', () => {
    const nearRight = placeOverlay({ anchor: anchorAt(100, 28, 950, 40), width: 300, height: 100 });
    expect(nearRight.x).toBe(VIEWPORT_W - 300 - GAP);

    const wider = placeOverlay({ anchor: anchorAt(100, 28, 10, 40), width: 2000, height: 100 });
    expect(wider.x).toBe(GAP);
  });
});

/**
 * The reported failure: a dropdown on a cell near the bottom of the window
 * stayed below it and ran off the screen.
 *
 * Two things were wrong. It measured short — a list whose content had not laid
 * out yet — so the natural height alone said "this fits"; and when neither side
 * could hold it, "roomier side" could still mean *below*, which for a dropdown
 * is the one answer that is never acceptable.
 */
describe('placeOverlay — a dropdown near the bottom edge', () => {
  it('flips above when below cannot host the minimum, however short the panel measures', () => {
    // 68px of room below; the panel measures 60 and would once have fitted.
    const anchor = anchorAt(VIEWPORT_H - 100);
    const placed = placeOverlay({
      anchor, width: 200, height: 60, minHeight: 260, fallback: 'opposite',
    });

    expect(placed.placement).toBe('above');
    expect(placed.maxHeight).toBe(anchor.top - GAP);
  });

  it('flips above even when above is no roomier — downwards off-screen is never the answer', () => {
    // A short viewport: 144px below the anchor, 150px above, minimum 260. The
    // old rule kept it below, where it overflowed the bottom of the window.
    setViewport(VIEWPORT_W, 330);
    const placed = placeOverlay({
      anchor: anchorAt(154), width: 200, height: 400, minHeight: 260, fallback: 'opposite',
    });

    expect(placed.placement).toBe('above');
    expect(placed.y).toBe(GAP);
    expect(placed.maxHeight).toBe(150);
  });

  it('leaves the panel below when below can meet the minimum', () => {
    // 68px below, and 60px is all this panel is ever going to ask for.
    const placed = placeOverlay({
      anchor: anchorAt(VIEWPORT_H - 100), width: 200, height: 60, minHeight: 60,
      fallback: 'opposite',
    });

    expect(placed.placement).toBe('below');
  });

  it('still prefers below when below has room to spare', () => {
    const anchor = anchorAt(100);
    const placed = placeOverlay({
      anchor, width: 200, height: 400, minHeight: 260, fallback: 'opposite',
    });

    expect(placed.placement).toBe('below');
    expect(placed.y).toBe(anchor.bottom + GAP);
  });
});
