import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ColumnAnimator, computeColumnPositions } from '../../src/renderer/column-animator';
import { installDomStub, runFrames, StubElement } from './dom-stub';

/**
 * Contract for the structural column FLIP (`ColumnAnimator`).
 *
 * Hiding a column rebuilds the header and every row, so the survivors would
 * otherwise snap to their new offsets in one frame. This class replays that
 * jump as movement. What is worth pinning down:
 *
 * 1. **It inverts before it plays.** A FLIP that writes its offsets and clears
 *    them in the same frame animates nothing — the invert must land under a
 *    transition-suppressing class and be released a frame later.
 * 2. **It only moves what moved.** A column whose offset is unchanged must not
 *    get a rule; every rule costs a compositor layer across every rendered cell
 *    in that column.
 * 3. **It never strands state.** The classes and the stylesheet are global to
 *    the grid, so a failure to clean up leaves every column stuck mid-transform.
 */

/** Elements the animator created this test, so its `<style>` tag can be reached without a real document.head. */
let created: StubElement[] = [];
let teardownDom: () => void;

beforeEach(() => {
  // installDomStub supplies the deterministic requestAnimationFrame the FLIP
  // needs; the document is then replaced with one that also has a `head` (the
  // animator appends its stylesheet there) and records what it creates.
  teardownDom = installDomStub();
  created = [];
  (globalThis as Record<string, unknown>)['document'] = {
    head: new StubElement('head'),
    createElement: (tag: string): StubElement => {
      const node = new StubElement(tag);
      created.push(node);
      return node;
    },
  };
});

afterEach(() => {
  teardownDom();
});

interface Harness {
  animator: ColumnAnimator;
  root: StubElement;
  /** The `<style>` tag the animator mounted. */
  style(): StubElement;
}

function harness(): Harness {
  const animator = new ColumnAnimator();
  const root = new StubElement('div');
  animator.mount();
  animator.setRoot(root as unknown as HTMLElement);
  animator.setScopeId('g1');
  const styleEl = created.find((e) => e.tagName === 'style')!;
  return { animator, root, style: () => styleEl };
}

const LAYOUT_A = [
  { colId: 'a', x: 0 },
  { colId: 'b', x: 100 },
  { colId: 'c', x: 200 },
];

describe('computeColumnPositions', () => {
  it('accumulates widths independently per panel, so each panel starts at zero', () => {
    const positions = computeColumnPositions(
      { left: ['pinA'], center: ['c1', 'c2'], right: ['pinB'] },
      (colId) => ({ pinA: 60, c1: 100, c2: 150, pinB: 80 })[colId] ?? 0,
    );

    expect(positions).toEqual([
      { colId: 'pinA', x: 0 },
      { colId: 'c1', x: 0 },
      { colId: 'c2', x: 100 },
      { colId: 'pinB', x: 0 },
    ]);
  });
});

describe('ColumnAnimator — FLIP', () => {
  it('inverts survivors to their old offsets under a transition-suppressing class', () => {
    const h = harness();
    h.animator.capture(LAYOUT_A, 'visibility');

    // 'b' hidden: 'c' slides left into b's old slot.
    h.animator.animate([{ colId: 'a', x: 0 }, { colId: 'c', x: 100 }]);

    expect(h.root.classList.contains('pg-grid--col-animating')).toBe(true);
    expect(h.root.classList.contains('pg-grid--col-animating-invert')).toBe(true);
    // c was at 200, lands at 100 → inverted by +100.
    expect(h.style().textContent).toContain('--pg-col-shift-x: 100px');
    // a never moved, so it must not have a rule.
    expect(h.style().textContent).not.toContain('data-col-id="a"');
  });

  it('releases the invert and clears the offsets on the next frame', () => {
    const h = harness();
    h.animator.capture(LAYOUT_A, 'visibility');
    h.animator.animate([{ colId: 'a', x: 0 }, { colId: 'c', x: 100 }]);

    runFrames();

    expect(h.root.classList.contains('pg-grid--col-animating')).toBe(true);
    expect(h.root.classList.contains('pg-grid--col-animating-invert')).toBe(false);
    expect(h.style().textContent).toBe('');
  });

  it('scopes every rule to its own grid, so sibling grids sharing a colId are untouched', () => {
    const h = harness();
    h.animator.capture(LAYOUT_A, 'visibility');
    h.animator.animate([{ colId: 'a', x: 0 }, { colId: 'c', x: 100 }]);

    expect(h.style().textContent).toContain('[data-photon-grid-id="g1"] [data-col-id="c"]');
  });

  it('fades a newly-shown column in rather than sliding it from a position it never had', () => {
    const h = harness();
    h.animator.capture([{ colId: 'a', x: 0 }], 'visibility');

    h.animator.animate([{ colId: 'a', x: 0 }, { colId: 'new', x: 100 }]);

    expect(h.style().textContent).toContain('--pg-col-shift-opacity: 0');
    expect(h.style().textContent).toContain('data-col-id="new"');
  });

  it('does not fade in unknown columns on a pure reorder, where membership cannot have changed', () => {
    const h = harness();
    h.animator.capture([{ colId: 'a', x: 0 }], 'reorder');

    h.animator.animate([{ colId: 'a', x: 0 }, { colId: 'new', x: 100 }]);

    expect(h.style().textContent).toBe('');
  });

  it('ignores sub-pixel movement, which is invisible and still costs a layer', () => {
    const h = harness();
    h.animator.capture([{ colId: 'a', x: 0 }], 'reorder');

    h.animator.animate([{ colId: 'a', x: 0.4 }]);

    expect(h.style().textContent).toBe('');
    expect(h.root.classList.contains('pg-grid--col-animating')).toBe(false);
  });

  it('is a no-op without a captured snapshot, so an ordinary render never animates', () => {
    const h = harness();

    h.animator.animate(LAYOUT_A);

    expect(h.root.classList.contains('pg-grid--col-animating')).toBe(false);
    expect(h.style().textContent).toBe('');
  });

  it('drops a snapshot on cancel', () => {
    const h = harness();
    h.animator.capture(LAYOUT_A, 'visibility');

    h.animator.cancel();

    expect(h.animator.hasPending()).toBe(false);
  });
});

describe('ColumnAnimator — cleanup', () => {
  it('reports itself animating from the invert until the transition has run', () => {
    vi.useFakeTimers();
    const h = harness();
    h.animator.capture(LAYOUT_A, 'visibility');
    h.animator.animate([{ colId: 'a', x: 0 }, { colId: 'c', x: 100 }]);

    // Live immediately, not only once the play frame lands — a caller polling
    // in the gap would otherwise restart the sequence.
    expect(h.animator.isAnimating()).toBe(true);
    runFrames();
    expect(h.animator.isAnimating()).toBe(true);

    vi.advanceTimersByTime(500);

    expect(h.animator.isAnimating()).toBe(false);
    expect(h.root.classList.contains('pg-grid--col-animating')).toBe(false);
    vi.useRealTimers();
  });

  it('finalises a still-running animation before starting the next one', () => {
    const h = harness();
    h.animator.capture(LAYOUT_A, 'visibility');
    h.animator.animate([{ colId: 'a', x: 0 }, { colId: 'c', x: 100 }]);

    // Second change lands mid-flight; its invert must not compound on the first.
    h.animator.capture([{ colId: 'a', x: 0 }, { colId: 'c', x: 100 }], 'visibility');
    h.animator.animate([{ colId: 'c', x: 0 }]);

    expect(h.style().textContent).toContain('--pg-col-shift-x: 100px');
    expect(h.style().textContent).not.toContain('data-col-id="a"');
  });

  it('strips its classes and stylesheet on destroy', () => {
    const h = harness();
    h.animator.capture(LAYOUT_A, 'visibility');
    h.animator.animate([{ colId: 'a', x: 0 }, { colId: 'c', x: 100 }]);

    h.animator.destroy();

    expect(h.root.classList.contains('pg-grid--col-animating')).toBe(false);
    expect(h.root.classList.contains('pg-grid--col-animating-invert')).toBe(false);
  });
});
