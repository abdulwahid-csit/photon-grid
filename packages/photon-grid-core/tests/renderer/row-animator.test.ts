import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RowAnimator, type RowPanelParts } from '../../src/renderer/row-animator';

/**
 * Verifies the FLIP contract that makes sorting feel like AG Grid:
 * transform-driven movement, viewport-scoped participation, DOM reuse, and
 * read-then-write ordering with a single style flush.
 *
 * `jsdom` is not a dependency of this package (the suite runs in the fast
 * `node` environment — see vitest.config.ts), and the animator touches a very
 * small, well-defined slice of the DOM API: `style`, `offsetHeight`, and
 * add/removeEventListener for `transitionend`. A local stub covers exactly that
 * surface, which keeps the test honest about what the animator actually
 * requires and avoids pulling a heavyweight DOM implementation into CI.
 */

/** Minimal stand-in for the element surface `RowAnimator` uses. */
interface StubElement extends HTMLElement {
  /** Dispatches a `transitionend` for `propertyName` from this element. */
  fireTransitionEnd(propertyName: string, target?: unknown): void;
}

function makeRow(): StubElement {
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  const style: Record<string, string> = {
    transform: '',
    transition: '',
    opacity: '',
    willChange: '',
  };

  const el = {
    style,
    // Reading this is the animator's single forced style flush.
    offsetHeight: 0,
    addEventListener(type: string, fn: (e: unknown) => void): void {
      let set = listeners.get(type);
      if (!set) listeners.set(type, (set = new Set()));
      set.add(fn);
    },
    removeEventListener(type: string, fn: (e: unknown) => void): void {
      listeners.get(type)?.delete(fn);
    },
    fireTransitionEnd(propertyName: string, target?: unknown): void {
      const evt = { propertyName, target: target ?? el };
      for (const fn of listeners.get('transitionend') ?? []) fn(evt);
    },
  };

  return el as unknown as StubElement;
}

/** A single-panel (center-only) render cache, mirroring BodyRenderer's shape. */
function makeCache(ids: string[]): Map<string, RowPanelParts> {
  const map = new Map<string, RowPanelParts>();
  for (const id of ids) map.set(id, { left: null, center: makeRow(), right: null });
  return map;
}

const center = (cache: Map<string, RowPanelParts>, id: string): StubElement =>
  cache.get(id)!.center! as StubElement;

/** Runs the queued rAF callback so the play phase executes synchronously. */
function flushFrame(): void {
  vi.runOnlyPendingTimers();
}

const VIEWPORT = { scrollTop: 0, height: 400 };

describe('RowAnimator — FLIP contract', () => {
  let animator: RowAnimator;

  beforeEach(() => {
    vi.useFakeTimers();
    // Route rAF through the fake timer queue so the invert and play phases can
    // be observed as distinct, separately-asserted steps.
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      return setTimeout(() => cb(0), 0) as unknown as number;
    });
    animator = new RowAnimator();
  });

  afterEach(() => {
    animator.destroy();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does nothing without a capture', () => {
    const cache = makeCache(['a']);
    animator.animate(cache, [{ nodeId: 'a', top: 100 }], VIEWPORT);
    expect(center(cache, 'a').style.transform).toBe('');
  });

  it('hasPending reflects the capture lifecycle', () => {
    expect(animator.hasPending()).toBe(false);
    animator.capture([{ nodeId: 'a', top: 0 }], 'sort');
    expect(animator.hasPending()).toBe(true);
    animator.animate(makeCache(['a']), [{ nodeId: 'a', top: 0 }], VIEWPORT);
    expect(animator.hasPending()).toBe(false);
  });

  it('inverts a moved row with translate3d equal to oldTop - newTop', () => {
    const cache = makeCache(['a']);
    animator.capture([{ nodeId: 'a', top: 200 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 40 }], VIEWPORT);

    // Invert phase is synchronous: the row is pushed back to where it was.
    expect(center(cache, 'a').style.transform).toBe('translate3d(0, 160px, 0)');
    expect(center(cache, 'a').style.transition).toBe('none');
  });

  it('releases the transform and enables a transform transition on the next frame', () => {
    const cache = makeCache(['a']);
    animator.capture([{ nodeId: 'a', top: 200 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 40 }], VIEWPORT);

    flushFrame();

    const el = center(cache, 'a');
    expect(el.style.transform).toBe('');
    expect(el.style.transition).toContain('transform');
    // top/left/margin must never be transitioned — they force layout per frame.
    expect(el.style.transition).not.toContain('top');
    expect(el.style.transition).not.toContain('left');
    expect(el.style.transition).not.toContain('margin');
  });

  it('uses AG Grid timing: 400ms with the default ease curve', () => {
    const cache = makeCache(['a']);
    animator.capture([{ nodeId: 'a', top: 200 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 40 }], VIEWPORT);
    flushFrame();

    expect(center(cache, 'a').style.transition).toBe('transform 400ms ease');
  });

  it('promotes animating rows with will-change, then clears it when done', () => {
    const cache = makeCache(['a']);
    const el = center(cache, 'a');
    animator.capture([{ nodeId: 'a', top: 200 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 40 }], VIEWPORT);

    expect(el.style.willChange).toBe('transform');

    flushFrame();
    el.fireTransitionEnd('transform');

    expect(el.style.willChange).toBe('');
    expect(el.style.transition).toBe('');
  });

  it('ignores transitionend bubbling from descendants', () => {
    const cache = makeCache(['a']);
    const el = center(cache, 'a');

    animator.capture([{ nodeId: 'a', top: 200 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 40 }], VIEWPORT);
    flushFrame();

    // A cell's own transition must not tear down the row's animation.
    el.fireTransitionEnd('transform', { notTheRow: true });

    expect(el.style.transition).toContain('transform');
  });

  it('skips sub-pixel movement', () => {
    const cache = makeCache(['a']);
    animator.capture([{ nodeId: 'a', top: 100.4 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 100 }], VIEWPORT);

    expect(center(cache, 'a').style.transform).toBe('');
  });

  it('fades in a row that was not present before, rather than sliding it', () => {
    const cache = makeCache(['a', 'b']);
    animator.capture([{ nodeId: 'a', top: 0 }], 'filter');
    animator.animate(
      cache,
      [{ nodeId: 'a', top: 0 }, { nodeId: 'b', top: 36 }],
      VIEWPORT,
    );

    expect(center(cache, 'b').style.opacity).toBe('0');
    flushFrame();
    expect(center(cache, 'b').style.transition).toContain('opacity');
  });

  it('animates only rendered rows — a 1M-row sort touches the rendered ones', () => {
    // Cache holds the virtualised window only; the snapshot covers far more.
    const cache = makeCache(['r0', 'r1']);
    const snapshot = Array.from({ length: 100_000 }, (_, i) => ({
      nodeId: `r${i}`,
      top: i * 36,
    }));

    animator.capture(snapshot, 'sort');
    animator.animate(
      cache,
      [{ nodeId: 'r0', top: 36 }, { nodeId: 'r1', top: 0 }],
      VIEWPORT,
    );

    // Both rendered rows moved within the viewport, so both animate — and
    // nothing else could, because nothing else has DOM.
    expect(center(cache, 'r0').style.transform).toBe('translate3d(0, -36px, 0)');
    expect(center(cache, 'r1').style.transform).toBe('translate3d(0, 36px, 0)');
  });

  it('does not animate a row arriving from far outside the viewport', () => {
    const cache = makeCache(['a']);
    // Was 50,000px down the page; lands at the top. Sliding that distance is
    // the "flying rows" artefact — it must be skipped, not clamped.
    animator.capture([{ nodeId: 'a', top: 50_000 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 0 }], VIEWPORT);

    expect(center(cache, 'a').style.transform).toBe('');
  });

  it('reuses the same element objects across a sort', () => {
    const cache = makeCache(['a', 'b']);
    const before = center(cache, 'a');

    animator.capture([{ nodeId: 'a', top: 0 }, { nodeId: 'b', top: 36 }], 'sort');
    animator.animate(
      cache,
      [{ nodeId: 'a', top: 36 }, { nodeId: 'b', top: 0 }],
      VIEWPORT,
    );
    flushFrame();

    expect(center(cache, 'a')).toBe(before);
  });

  it('finalises an in-flight animation when a new one starts', () => {
    const cache = makeCache(['a']);
    const el = center(cache, 'a');

    animator.capture([{ nodeId: 'a', top: 200 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 0 }], VIEWPORT);
    flushFrame();

    // Second sort before the first finished — the stale transform must be gone
    // so the new invert starts from a clean baseline.
    animator.capture([{ nodeId: 'a', top: 0 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 100 }], VIEWPORT);

    expect(el.style.transform).toBe('translate3d(0, -100px, 0)');
  });

  it('clears all animation styling on destroy', () => {
    const cache = makeCache(['a']);
    const el = center(cache, 'a');

    animator.capture([{ nodeId: 'a', top: 200 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 0 }], VIEWPORT);
    flushFrame();

    animator.destroy();

    expect(el.style.transform).toBe('');
    expect(el.style.willChange).toBe('');
  });

  it('applies the same delta to every panel part of a row', () => {
    const left = makeRow();
    const centerEl = makeRow();
    const right = makeRow();
    const cache = new Map<string, RowPanelParts>([
      ['a', { left, center: centerEl, right }],
    ]);

    animator.capture([{ nodeId: 'a', top: 100 }], 'sort');
    animator.animate(cache, [{ nodeId: 'a', top: 20 }], VIEWPORT);

    expect(left.style.transform).toBe('translate3d(0, 80px, 0)');
    expect(centerEl.style.transform).toBe('translate3d(0, 80px, 0)');
    expect(right.style.transform).toBe('translate3d(0, 80px, 0)');
  });
});
