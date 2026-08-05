// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { OverlayRenderer, type LoadingGeometry } from '../../src/renderer/overlay-renderer';
import type { IconRenderer } from '../../src/icons/icon-renderer';
import {
  LoadingBackdrop,
  LoadingIndicator,
  resolveLoadingOverlayConfig,
  type LoadingOverlayConfig,
} from '../../src/types/loading.types';

/**
 * `OverlayRenderer` is exercised directly rather than through `GridCore`, so
 * these assertions are about the overlay's own contract — markup, ARIA, cache
 * idempotence and timer lifetime — with no render-loop scheduling in the way.
 *
 * The two properties worth protecting most:
 *
 *  - **Idempotence.** `GridRenderer` calls `showLoading` on *every* frame while
 *    the flag is set. If an equivalent call rebuilt the DOM, a scroll or resize
 *    during loading would rebuild N rows × M cells at 60fps.
 *  - **Timer containment.** A pending `delay` must not outlive `hideLoading()`
 *    or `destroy()`, or a finished load paints an overlay onto a dead grid.
 */

/** Records what the overlay asked the icon registry for. */
interface IconCall {
  readonly name: string;
  readonly size: number | undefined;
  readonly spin: boolean | undefined;
}

let iconCalls: IconCall[] = [];
let spinKeyframesInjected = 0;

/**
 * Minimal stand-in for `IconRenderer`. The point is to prove the overlay
 * resolves its glyph *through the registry* — a hardcoded SVG would never reach
 * this stub, and would be invisible to a host that swapped its icon pack.
 */
function createIconRendererStub(): IconRenderer {
  const stub = {
    render(name: string, options: { size?: number; spin?: boolean; className?: string } = {}) {
      iconCalls.push({ name, size: options.size, spin: options.spin });
      const el = document.createElement('span');
      el.className = `pg-icon pg-icon--${name}${options.className ? ` ${options.className}` : ''}`;
      return el;
    },
    injectSpinKeyframes() {
      spinKeyframesInjected++;
    },
  };
  return stub as unknown as IconRenderer;
}

const GEOMETRY: LoadingGeometry = {
  rowHeight: 40,
  viewportRows: 6,
  leftColIds: ['pinnedA'],
  centerColIds: ['name', 'age', 'city'],
  rightColIds: ['actions'],
};

let container: HTMLElement;
let overlay: OverlayRenderer;

/** Resolves a partial config the way `GridRenderer` does before painting. */
function config(partial: LoadingOverlayConfig = {}) {
  return resolveLoadingOverlayConfig(partial);
}

function overlayEl(): HTMLElement | null {
  return container.querySelector('.pg-overlay--loading');
}

beforeEach(() => {
  iconCalls = [];
  spinKeyframesInjected = 0;
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  overlay = new OverlayRenderer(createIconRendererStub());
  overlay.mount(container);
});

afterEach(() => {
  overlay.destroy();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('spinner indicator', () => {
  it('renders a spinning registry icon and a caption', () => {
    overlay.showLoading(config({ text: 'Fetching…' }));

    const el = overlayEl();
    expect(el).not.toBeNull();
    expect(el!.classList.contains('pg-overlay--spinner')).toBe(true);
    expect(el!.classList.contains('pg-overlay--backdrop-translucent')).toBe(true);
    expect(el!.querySelector('.pg-overlay__text')?.textContent).toBe('Fetching…');

    expect(iconCalls).toEqual([{ name: 'loading', size: 32, spin: true }]);
    expect(spinKeyframesInjected).toBe(1);
  });

  it('forwards a custom icon name and size to the registry', () => {
    overlay.showLoading(config({ icon: 'refresh', iconSize: 48 }));
    expect(iconCalls).toEqual([{ name: 'refresh', size: 48, spin: true }]);
  });

  it('suppresses the visible caption but still names the region for a screen reader', () => {
    overlay.showLoading(config({ text: 'Fetching…', showText: false }));

    const el = overlayEl()!;
    expect(el.querySelector('.pg-overlay__text')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Fetching…');
  });

  it('marks the overlay as a busy live region', () => {
    overlay.showLoading(config());

    const el = overlayEl()!;
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('appends a host-supplied class', () => {
    overlay.showLoading(config({ className: 'my-overlay' }));
    expect(overlayEl()!.classList.contains('my-overlay')).toBe(true);
  });

  it('applies the requested backdrop modifier', () => {
    overlay.showLoading(config({ backdrop: LoadingBackdrop.None }));
    expect(overlayEl()!.classList.contains('pg-overlay--backdrop-none')).toBe(true);
  });
});

describe('skeleton indicator', () => {
  const skeleton = (partial: LoadingOverlayConfig = {}) =>
    config({ indicator: LoadingIndicator.Skeleton, ...partial });

  it('mirrors the body panel split so pinned columns stay pinned', () => {
    overlay.showLoading(skeleton(), GEOMETRY);

    const panels = container.querySelectorAll('.pg-loading-skeleton__panel');
    expect(panels).toHaveLength(3);
    expect(panels[0].classList.contains('pg-loading-skeleton__panel--left')).toBe(true);
    expect(panels[1].classList.contains('pg-loading-skeleton__panel--center')).toBe(true);
    expect(panels[2].classList.contains('pg-loading-skeleton__panel--right')).toBe(true);
  });

  it('omits a pinned panel that has no columns', () => {
    overlay.showLoading(skeleton(), { ...GEOMETRY, leftColIds: [], rightColIds: [] });

    const panels = container.querySelectorAll('.pg-loading-skeleton__panel');
    expect(panels).toHaveLength(1);
    expect(panels[0].classList.contains('pg-loading-skeleton__panel--center')).toBe(true);
  });

  it('tags every cell with its column id so the width stylesheet targets it', () => {
    overlay.showLoading(skeleton(), GEOMETRY);

    const centerPanel = container.querySelector('.pg-loading-skeleton__panel--center')!;
    const firstRow = centerPanel.querySelector('.pg-loading-skeleton__row')!;
    const ids = Array.from(firstRow.querySelectorAll('.pg-loading-skeleton__cell')).map((c) =>
      c.getAttribute('data-col-id'),
    );
    expect(ids).toEqual(['name', 'age', 'city']);
  });

  it('reuses the shared skeleton row and cell classes rather than restyling them', () => {
    overlay.showLoading(skeleton(), GEOMETRY);

    const row = container.querySelector('.pg-loading-skeleton__row')!;
    // `.pg-row--skeleton` is what carries the shimmer bar, its per-column width
    // variance and the reduced-motion fallback, all from skeleton.css.
    expect(row.classList.contains('pg-row--skeleton')).toBe(true);

    const cell = row.querySelector('.pg-loading-skeleton__cell')!;
    expect(cell.classList.contains('pg-cell')).toBe(true);
    expect(cell.querySelector('.pg-cell__inner')).not.toBeNull();
  });

  it('fills the viewport when skeletonRows is auto', () => {
    overlay.showLoading(skeleton({ skeletonRows: 0 }), GEOMETRY);

    const rows = container.querySelectorAll('.pg-loading-skeleton__panel--center .pg-loading-skeleton__row');
    expect(rows).toHaveLength(GEOMETRY.viewportRows);
  });

  it('honours an explicit row count over the viewport', () => {
    overlay.showLoading(skeleton({ skeletonRows: 3 }), GEOMETRY);

    const rows = container.querySelectorAll('.pg-loading-skeleton__panel--center .pg-loading-skeleton__row');
    expect(rows).toHaveLength(3);
  });

  it('falls back to untagged cells when the grid has no columns yet', () => {
    overlay.showLoading(skeleton(), {
      rowHeight: 40,
      viewportRows: 2,
      leftColIds: [],
      centerColIds: [],
      rightColIds: [],
    });

    const cells = container.querySelectorAll('.pg-loading-skeleton__cell');
    expect(cells.length).toBeGreaterThan(0);
    expect(cells[0].hasAttribute('data-col-id')).toBe(false);
  });

  it('publishes the row height as a custom property, not an inline height', () => {
    overlay.showLoading(skeleton(), GEOMETRY);

    const body = container.querySelector('.pg-loading-skeleton') as HTMLElement;
    expect(body.style.getPropertyValue('--pg-skeleton-row-height')).toBe('40px');
  });
});

describe('idempotence', () => {
  it('keeps the same element across equivalent calls', () => {
    overlay.showLoading(config());
    const first = overlayEl();

    overlay.showLoading(config());
    overlay.showLoading(config());

    // Same instance, not merely an equal one: a rebuild would restart the
    // spinner animation and churn DOM on every render frame.
    expect(overlayEl()).toBe(first);
  });

  it('ignores a column width change, which the stylesheet handles on its own', () => {
    const skeleton = config({ indicator: LoadingIndicator.Skeleton });
    overlay.showLoading(skeleton, GEOMETRY);
    const first = overlayEl();

    // Same columns, same row bucket — this is what a resize drag looks like from
    // here, and it must not rebuild N rows × M cells per frame.
    overlay.showLoading(skeleton, { ...GEOMETRY });
    expect(overlayEl()).toBe(first);
  });

  it('rebuilds when the configuration actually changes', () => {
    overlay.showLoading(config());
    const first = overlayEl();

    overlay.showLoading(config({ indicator: LoadingIndicator.Skeleton }), GEOMETRY);

    expect(overlayEl()).not.toBe(first);
    expect(overlayEl()!.classList.contains('pg-overlay--skeleton')).toBe(true);
  });

  it('rebuilds when the column set changes', () => {
    const skeleton = config({ indicator: LoadingIndicator.Skeleton });
    overlay.showLoading(skeleton, GEOMETRY);
    const first = overlayEl();

    overlay.showLoading(skeleton, { ...GEOMETRY, centerColIds: ['name', 'age'] });
    expect(overlayEl()).not.toBe(first);
  });

  it('rebuilds after the signature is explicitly invalidated', () => {
    overlay.showLoading(config());
    const first = overlayEl();

    overlay.invalidateLoadingSignature();
    overlay.showLoading(config());

    expect(overlayEl()).not.toBe(first);
    // Invalidation alone must not unmount, or the swap flashes the body.
    expect(overlayEl()).not.toBeNull();
  });
});

describe('anti-flicker delay', () => {
  it('paints nothing until the delay elapses', () => {
    vi.useFakeTimers();
    overlay.showLoading(config({ delay: 150 }));

    expect(overlayEl()).toBeNull();
    vi.advanceTimersByTime(149);
    expect(overlayEl()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(overlayEl()).not.toBeNull();
  });

  it('never paints for a load that finishes inside the delay', () => {
    vi.useFakeTimers();
    overlay.showLoading(config({ delay: 150 }));
    overlay.hideLoading();

    vi.advanceTimersByTime(1000);
    expect(overlayEl()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves no timer behind on destroy', () => {
    vi.useFakeTimers();
    overlay.showLoading(config({ delay: 150 }));
    overlay.destroy();

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(overlayEl()).toBeNull();
  });

  it('replaces a pending paint rather than stacking one', () => {
    vi.useFakeTimers();
    overlay.showLoading(config({ delay: 150, text: 'First' }));
    overlay.showLoading(config({ delay: 150, text: 'Second' }));

    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(150);

    expect(container.querySelectorAll('.pg-overlay--loading')).toHaveLength(1);
    expect(overlayEl()!.querySelector('.pg-overlay__text')?.textContent).toBe('Second');
  });
});

describe('ad-hoc progress messages', () => {
  it('shows a spinner even when the configured indicator is the skeleton', () => {
    overlay.showLoadingMessage('Parsing…');

    const el = overlayEl()!;
    expect(el.classList.contains('pg-overlay--spinner')).toBe(true);
    expect(el.querySelector('.pg-overlay__text')?.textContent).toBe('Parsing…');
  });

  it('survives the render loop, which hides only the state-driven overlay', () => {
    // Regression guard: an import feeds rows in through setColumns/setData,
    // each of which schedules a render. An unconditional hide there wiped the
    // import's own progress message on the very next frame.
    overlay.showLoadingMessage('Mapping…');
    overlay.hideLoadingState();

    expect(overlayEl()!.querySelector('.pg-overlay__text')?.textContent).toBe('Mapping…');
  });

  it('is not displaced by the generic loading overlay', () => {
    overlay.showLoadingMessage('Mapping…');
    overlay.showLoading(config({ text: 'Loading…' }));

    expect(overlayEl()!.querySelector('.pg-overlay__text')?.textContent).toBe('Mapping…');
  });

  it('is cleared by an explicit hide, and the state overlay works again after', () => {
    overlay.showLoadingMessage('Mapping…');
    overlay.hideLoading();
    expect(overlayEl()).toBeNull();

    overlay.showLoading(config({ text: 'Loading…' }));
    expect(overlayEl()!.querySelector('.pg-overlay__text')?.textContent).toBe('Loading…');
  });
});
