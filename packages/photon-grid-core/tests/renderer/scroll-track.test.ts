/**
 * Content ⇄ scrollbar-track mapping.
 *
 * The arithmetic that decides whether the last row of a very large dataset is
 * reachable at all, and that must stay the exact identity for every grid small
 * enough not to need it.
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_ELEMENT_HEIGHT_PX,
  contentToTrack,
  trackHeightFor,
  trackToContent,
} from '../../src/renderer/scroll-track';

/** A viewport height in the range a real grid actually uses. */
const VIEWPORT = 600;

/** Total content height for `n` rows at `h` px each. */
const contentHeight = (rows: number, rowHeight = 40): number => rows * rowHeight;

describe('trackHeightFor', () => {
  it('leaves ordinary datasets untouched', () => {
    expect(trackHeightFor(0)).toBe(0);
    expect(trackHeightFor(4_000)).toBe(4_000);
    // 100k rows at 40px — 4M px, comfortably inside every browser's cap.
    expect(trackHeightFor(contentHeight(100_000))).toBe(4_000_000);
  });

  it('caps at the browser element-height limit', () => {
    // One million rows at 40px is 40M px; no engine renders an element that tall.
    expect(trackHeightFor(contentHeight(1_000_000))).toBe(MAX_ELEMENT_HEIGHT_PX);
  });

  it('caps exactly at the boundary, not before it', () => {
    expect(trackHeightFor(MAX_ELEMENT_HEIGHT_PX)).toBe(MAX_ELEMENT_HEIGHT_PX);
    expect(trackHeightFor(MAX_ELEMENT_HEIGHT_PX - 1)).toBe(MAX_ELEMENT_HEIGHT_PX - 1);
    expect(trackHeightFor(MAX_ELEMENT_HEIGHT_PX + 1)).toBe(MAX_ELEMENT_HEIGHT_PX);
  });
});

describe('unscaled datasets', () => {
  const total = contentHeight(100_000);
  const track = trackHeightFor(total);
  const maxScroll = total - VIEWPORT;
  const maxTrack = track - VIEWPORT;

  it('maps content to track as the identity', () => {
    for (const y of [0, 1, 999.5, maxScroll / 2, maxScroll]) {
      expect(contentToTrack(y, maxScroll, maxTrack)).toBe(y);
    }
  });

  it('maps track to content as the identity', () => {
    for (const y of [0, 1, 999.5, maxTrack / 2, maxTrack]) {
      expect(trackToContent(y, maxScroll, maxTrack)).toBe(y);
    }
  });
});

describe('scaled datasets', () => {
  // A million rows: the case that motivated the cap.
  const total = contentHeight(1_000_000);
  const track = trackHeightFor(total);
  const maxScroll = total - VIEWPORT;
  const maxTrack = track - VIEWPORT;

  it('is actually scaled (guards the fixtures above from going stale)', () => {
    expect(maxTrack).toBeLessThan(maxScroll);
  });

  it('pins both ends of the range', () => {
    expect(contentToTrack(0, maxScroll, maxTrack)).toBe(0);
    expect(trackToContent(0, maxScroll, maxTrack)).toBe(0);
    // The whole point: the track's end is the content's end, so the last row
    // is reachable rather than stranded past a silently-clamped spacer.
    expect(contentToTrack(maxScroll, maxScroll, maxTrack)).toBeCloseTo(maxTrack, 6);
    expect(trackToContent(maxTrack, maxScroll, maxTrack)).toBeCloseTo(maxScroll, 6);
  });

  it('round-trips content offsets to within a pixel', () => {
    for (const y of [0, 40, 12_345, maxScroll / 3, maxScroll / 2, maxScroll - 40, maxScroll]) {
      const back = trackToContent(contentToTrack(y, maxScroll, maxTrack), maxScroll, maxTrack);
      expect(back).toBeCloseTo(y, 3);
    }
  });

  it('is monotonic', () => {
    let prev = -1;
    for (let y = 0; y <= maxScroll; y += maxScroll / 500) {
      const t = contentToTrack(y, maxScroll, maxTrack);
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });

  it('keeps every track pixel worth less than a viewport of content', () => {
    // A one-pixel thumb nudge must not skip past a whole screen of rows, or
    // dragging the scrollbar would tear through the dataset unreadably.
    const perTrackPx = trackToContent(1, maxScroll, maxTrack);
    expect(perTrackPx).toBeGreaterThan(1);
    expect(perTrackPx).toBeLessThan(VIEWPORT);
  });
});

describe('degenerate ranges', () => {
  it('returns the input when the content does not overflow', () => {
    expect(contentToTrack(0, 0, 0)).toBe(0);
    expect(trackToContent(0, 0, 0)).toBe(0);
  });

  it('never divides by zero when only one side has range', () => {
    expect(Number.isFinite(contentToTrack(10, 0, 500))).toBe(true);
    expect(Number.isFinite(trackToContent(10, 500, 0))).toBe(true);
  });
});
