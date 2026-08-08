import { describe, it, expect } from 'vitest';
import { DragRectCache, NO_SLOT } from '../../src/drag-drop/drag-rect-cache';
import { FakeElement, asElements, asElement } from './drag-dom-harness';

/**
 * Builds a left-to-right run of slots.
 *
 * @param widths - Slot widths, laid out contiguously from `x = 0`.
 * @param top    - Shared top edge.
 * @param height - Shared height.
 */
function makeRow(widths: number[], top = 0, height = 40): FakeElement[] {
  let x = 0;
  return widths.map((w) => {
    const el = new FakeElement().setRect(x, top, w, height);
    x += w;
    return el;
  });
}

/** Captures fakes into the cache, casting once at the boundary. */
function capture(cache: DragRectCache, els: readonly FakeElement[]): void {
  cache.capture(asElements(els));
}

/** A single slot with the given geometry. */
function slot(left: number, top: number, width: number, height: number): FakeElement {
  return new FakeElement().setRect(left, top, width, height);
}

describe('DragRectCache', () => {
  describe('capture and invalidation', () => {
    it('reads each element exactly once per capture', () => {
      const cells = makeRow([100, 100, 100]);
      const cache = new DragRectCache();

      capture(cache, cells);

      expect(cells.map((c) => c.rectReads)).toEqual([1, 1, 1]);
      expect(cache.length).toBe(3);
      expect(cache.isValid).toBe(true);
    });

    it('answers any number of hit tests without re-reading geometry', () => {
      const cells = makeRow([100, 100, 100]);
      const cache = new DragRectCache();
      capture(cache, cells);

      // A drag runs hundreds of these; none may touch layout.
      for (let x = 0; x < 300; x += 3) cache.hitTestX(x);
      cache.hitTestPoint(150, 20);
      cache.firstSlotPastMidpointX(150);
      cache.nearestByMidpointX(150, 20);

      expect(cells.map((c) => c.rectReads)).toEqual([1, 1, 1]);
    });

    it('invalidate marks the cache stale; a re-capture reads once more', () => {
      const cells = makeRow([100, 100]);
      const cache = new DragRectCache();

      capture(cache, cells);
      cache.invalidate();
      expect(cache.isValid).toBe(false);
      expect(cache.hitTestX(50)).toBe(NO_SLOT);

      capture(cache, cells);
      expect(cells.map((c) => c.rectReads)).toEqual([2, 2]);
      expect(cache.hitTestX(50)).toBe(0);
    });

    it('reflects new geometry when re-captured at the same size', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow([50, 50, 50, 50]));
      capture(cache, makeRow([80, 80, 80, 80]));

      expect(cache.length).toBe(4);
      expect(cache.leftOf(1)).toBe(80);
      expect(cache.rightOf(3)).toBe(320);
    });

    it('shrinks its element list when a smaller batch is captured', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow([10, 10, 10, 10, 10]));
      capture(cache, makeRow([10, 10]));

      expect(cache.length).toBe(2);
      expect(cache.elements).toHaveLength(2);
    });

    it('clear releases element references', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow([10, 10]));
      cache.clear();

      expect(cache.isValid).toBe(false);
      expect(cache.length).toBe(0);
      expect(cache.elements).toHaveLength(0);
    });

    it('an empty capture is not valid', () => {
      const cache = new DragRectCache();
      capture(cache, []);
      expect(cache.isValid).toBe(false);
      expect(cache.hitTestX(0)).toBe(NO_SLOT);
    });
  });

  describe('hitTestX', () => {
    // Slots span [0,100) [100,220) [220,270) [270,470)
    const widths = [100, 120, 50, 200];

    it('resolves a point inside each slot', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow(widths));

      expect(cache.hitTestX(50)).toBe(0);
      expect(cache.hitTestX(150)).toBe(1);
      expect(cache.hitTestX(250)).toBe(2);
      expect(cache.hitTestX(400)).toBe(3);
    });

    it('treats spans as half-open so a boundary belongs to exactly one slot', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow(widths));

      expect(cache.hitTestX(0)).toBe(0);       // inclusive left edge
      expect(cache.hitTestX(99.999)).toBe(0);
      expect(cache.hitTestX(100)).toBe(1);     // exclusive right edge
      expect(cache.hitTestX(220)).toBe(2);
    });

    it('misses outside the captured run', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow(widths));

      expect(cache.hitTestX(-1)).toBe(NO_SLOT);
      expect(cache.hitTestX(470)).toBe(NO_SLOT);
      expect(cache.hitTestX(10_000)).toBe(NO_SLOT);
    });

    it('misses inside a gap between slots', () => {
      const cache = new DragRectCache();
      capture(cache, [slot(0, 0, 100, 40), slot(200, 0, 100, 40)]);   // 100px gap

      expect(cache.hitTestX(150)).toBe(NO_SLOT);
      expect(cache.hitTestX(250)).toBe(1);
    });

    it('applies the scroll offset without re-reading geometry', () => {
      const cells = makeRow(widths);
      const cache = new DragRectCache();
      capture(cache, cells);

      // Content scrolled 40px left: a pointer at 60 now sits where 100 was.
      expect(cache.hitTestX(60, -40)).toBe(1);
      expect(cells[0].rectReads).toBe(1);
    });

    it('agrees with a linear scan across the whole run', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow(widths));

      const bounds = [[0, 100], [100, 220], [220, 270], [270, 470]];
      for (let x = -5; x < 480; x += 1) {
        const expected = bounds.findIndex(([l, r]) => x >= l && x < r);
        expect(cache.hitTestX(x)).toBe(expected === -1 ? NO_SLOT : expected);
      }
    });
  });

  describe('firstSlotPastMidpointX', () => {
    // Midpoints at 50, 160, 245, 370
    const widths = [100, 120, 50, 200];

    it('returns the slot the dragged item would be inserted before', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow(widths));

      expect(cache.firstSlotPastMidpointX(0)).toBe(0);
      expect(cache.firstSlotPastMidpointX(49)).toBe(0);
      expect(cache.firstSlotPastMidpointX(51)).toBe(1);
      expect(cache.firstSlotPastMidpointX(161)).toBe(2);
      expect(cache.firstSlotPastMidpointX(246)).toBe(3);
    });

    it('returns the slot count when the pointer is past every midpoint', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow(widths));

      expect(cache.firstSlotPastMidpointX(371)).toBe(4);
      expect(cache.firstSlotPastMidpointX(10_000)).toBe(4);
    });

    it('agrees with a linear scan across the whole run', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow(widths));

      const midpoints = [50, 160, 245, 370];
      for (let x = -5; x < 480; x += 1) {
        const linear = midpoints.findIndex((m) => x < m);
        expect(cache.firstSlotPastMidpointX(x)).toBe(linear === -1 ? 4 : linear);
      }
    });
  });

  describe('hitTestPoint', () => {
    it('requires the point to fall inside both axes', () => {
      const cache = new DragRectCache();
      capture(cache, [slot(0, 0, 100, 40), slot(0, 40, 100, 40)]);

      expect(cache.hitTestPoint(50, 20)).toBe(0);
      expect(cache.hitTestPoint(50, 60)).toBe(1);
      expect(cache.hitTestPoint(50, 200)).toBe(NO_SLOT);
      expect(cache.hitTestPoint(200, 20)).toBe(NO_SLOT);
    });

    it('resolves overlapping slots to the later one', () => {
      const cache = new DragRectCache();
      capture(cache, [slot(0, 0, 100, 40), slot(0, 0, 100, 40)]);   // stacked

      expect(cache.hitTestPoint(50, 20)).toBe(1);
    });
  });

  describe('nearestByMidpointX', () => {
    it('picks the slot whose midpoint is closest within the vertical band', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow([100, 100, 100]));   // midpoints 50, 150, 250

      expect(cache.nearestByMidpointX(140, 20)).toBe(1);
      expect(cache.nearestByMidpointX(10, 20)).toBe(0);
      expect(cache.nearestByMidpointX(400, 20)).toBe(2);
    });

    it('excludes the skipped slot', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow([100, 100, 100]));   // midpoints 50, 150, 250

      // 160 is nearer slot 2 (90) than slot 0 (110) once slot 1 is skipped.
      expect(cache.nearestByMidpointX(160, 20, 0, 1)).toBe(2);
      expect(cache.nearestByMidpointX(160, 20)).toBe(1);
    });

    it('breaks an exact distance tie in favour of the earlier slot', () => {
      const cache = new DragRectCache();
      capture(cache, makeRow([100, 100, 100]));

      // Equidistant from midpoints 50 and 250 once slot 1 is skipped. First
      // wins, matching the `dist < best` comparison the previous hit test used.
      expect(cache.nearestByMidpointX(150, 20, 0, 1)).toBe(0);
    });

    it('rejects slots outside the vertical band, honouring the tolerance', () => {
      const cache = new DragRectCache();
      capture(cache, [slot(0, 100, 100, 40)]);

      expect(cache.nearestByMidpointX(50, 50)).toBe(NO_SLOT);
      expect(cache.nearestByMidpointX(50, 98)).toBe(NO_SLOT);
      expect(cache.nearestByMidpointX(50, 98, 4)).toBe(0);
      expect(cache.nearestByMidpointX(50, 120)).toBe(0);
    });
  });

  describe('sortByLeft', () => {
    it('re-orders absolutely-positioned slots so the binary searches hold', () => {
      const cache = new DragRectCache();
      const c = slot(200, 0, 100, 40); c.setAttribute('id', 'c');
      const a = slot(0, 0, 100, 40);   a.setAttribute('id', 'a');
      const b = slot(100, 0, 100, 40); b.setAttribute('id', 'b');

      // Captured in DOM order, which for absolutely-positioned group cells bears
      // no relation to visual order. The binary searches assume ascending lefts,
      // so results before the sort are undefined and deliberately unasserted.
      capture(cache, [c, a, b]);

      cache.sortByLeft();

      expect(cache.elements.map((e) => e.getAttribute('id'))).toEqual(['a', 'b', 'c']);
      expect(cache.hitTestX(50)).toBe(0);
      expect(cache.hitTestX(150)).toBe(1);
      expect(cache.hitTestX(250)).toBe(2);
    });

    it('is a no-op below two slots', () => {
      const cache = new DragRectCache();
      capture(cache, [slot(10, 0, 10, 10)]);
      cache.sortByLeft();
      expect(cache.leftOf(0)).toBe(10);
    });
  });

  describe('accessors', () => {
    it('report the captured geometry', () => {
      const cache = new DragRectCache();
      capture(cache, [slot(20, 30, 100, 40)]);

      expect(cache.leftOf(0)).toBe(20);
      expect(cache.rightOf(0)).toBe(120);
      expect(cache.topOf(0)).toBe(30);
      expect(cache.widthOf(0)).toBe(100);
      expect(cache.heightOf(0)).toBe(40);
    });

    it('return 0 rather than throwing for an out-of-range index', () => {
      const cache = new DragRectCache();
      capture(cache, [slot(20, 30, 100, 40)]);

      for (const i of [-1, 1, 99]) {
        expect(cache.leftOf(i)).toBe(0);
        expect(cache.rightOf(i)).toBe(0);
        expect(cache.topOf(i)).toBe(0);
        expect(cache.widthOf(i)).toBe(0);
        expect(cache.heightOf(i)).toBe(0);
      }
    });

    it('indexOfElement finds a captured element and misses anything else', () => {
      const cells = makeRow([10, 10]);
      const cache = new DragRectCache();
      capture(cache, cells);

      expect(cache.indexOfElement(asElement(cells[1]))).toBe(1);
      expect(cache.indexOfElement(asElement(new FakeElement()))).toBe(NO_SLOT);
      expect(cache.indexOfElement(null)).toBe(NO_SLOT);
    });
  });
});
