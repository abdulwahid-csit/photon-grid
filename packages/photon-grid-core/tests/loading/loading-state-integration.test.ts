// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { GridCore } from '../../src/core/grid-core';
import { GridEventType } from '../../src/types/event.types';
import { LoadingIndicator, type LoadingChangedEvent } from '../../src/types/loading.types';
import type { GridOptions } from '../../src/types/grid.types';

/**
 * End-to-end cover for the loading state as a host actually drives it: through
 * `GridOptions.loading` at construction and `GridApi.setLoading` afterwards.
 *
 * The properties that matter here and cannot be seen from `OverlayRenderer`
 * alone are the *wiring* ones — that the flag is seeded before the first paint,
 * that the store is the single emitter, and that a repeated write is silent.
 */

const COLUMNS = [
  { field: 'name', header: 'Name' },
  { field: 'age', header: 'Age', type: 'number' as const },
];
const ROWS = [{ name: 'Ada', age: 36 }, { name: 'Grace', age: 45 }];

/**
 * jsdom ships no `ResizeObserver`, which `ScrollController.mount` constructs
 * unconditionally. A no-op is enough: nothing here depends on resize callbacks,
 * only on the grid reaching the end of `initialize()`.
 */
class NoopResizeObserver implements ResizeObserver {
  observe(): void { /* no layout in jsdom to observe */ }
  unobserve(): void { /* no-op */ }
  disconnect(): void { /* no-op */ }
}

function installResizeObserver(): void {
  const stub = NoopResizeObserver as unknown as typeof ResizeObserver;
  (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = stub;
  if (typeof window !== 'undefined') {
    (window as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = stub;
  }
}

installResizeObserver();

let grids: GridCore[] = [];

function mount(options: Partial<GridOptions> = {}): { grid: GridCore; container: HTMLElement } {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const grid = new GridCore(container, {
    columns: COLUMNS,
    data: ROWS,
    ...options,
  } as GridOptions);
  grids.push(grid);
  return { grid, container };
}

/** The grid renders on an animation frame; this settles one render pass. */
function flushRender(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function overlayIn(container: HTMLElement): HTMLElement | null {
  return container.querySelector('.pg-overlay--loading');
}

beforeEach(() => {
  grids = [];
  installResizeObserver();
  document.body.innerHTML = '';
});

afterEach(() => {
  for (const g of grids) {
    try { g.destroy(); } catch { /* teardown is best-effort */ }
  }
  document.body.innerHTML = '';
});

describe('construction with loading: true', () => {
  it('shows the overlay without ever painting a row first', async () => {
    const { container } = mount({ loading: true });

    // The seed happens before `renderer.mount()`, so there is no frame in which
    // the body is empty-but-not-loading. Checked before the flush *and* after.
    expect(container.querySelector('.pg-row')).toBeNull();
    await flushRender();

    expect(overlayIn(container)).not.toBeNull();
    expect(container.querySelector('.pg-row')).toBeNull();
  });

  it('reports the state through the api', async () => {
    const { grid } = mount({ loading: true });
    await flushRender();
    expect(grid.api.isLoading()).toBe(true);
  });

  it('defaults to not loading', async () => {
    const { grid, container } = mount();
    await flushRender();

    expect(grid.api.isLoading()).toBe(false);
    expect(overlayIn(container)).toBeNull();
  });

  it('does not announce the seeded state, which the host already knows', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const events: LoadingChangedEvent[] = [];
    const grid = new GridCore(container, {
      columns: COLUMNS,
      data: ROWS,
      loading: true,
      onReady: () => { /* subscription happens below */ },
    } as GridOptions);
    grids.push(grid);
    grid.api.on<LoadingChangedEvent>(GridEventType.LOADING_STARTED, (e) => events.push(e));

    await flushRender();
    expect(events).toHaveLength(0);
  });
});

describe('toggling at runtime', () => {
  it('shows and hides the overlay, and rows come back', async () => {
    const { grid, container } = mount();
    await flushRender();
    expect(container.querySelectorAll('.pg-row').length).toBeGreaterThan(0);

    grid.api.setLoading(true);
    await flushRender();
    expect(overlayIn(container)).not.toBeNull();

    grid.api.setLoading(false);
    await flushRender();
    expect(overlayIn(container)).toBeNull();
    expect(container.querySelectorAll('.pg-row').length).toBeGreaterThan(0);
  });

  it('treats showLoadingOverlay / hideLoadingOverlay as aliases', async () => {
    const { grid } = mount();
    await flushRender();

    grid.api.showLoadingOverlay();
    expect(grid.api.isLoading()).toBe(true);

    grid.api.hideLoadingOverlay();
    expect(grid.api.isLoading()).toBe(false);
  });
});

describe('LOADING_STARTED / LOADING_STOPPED', () => {
  it('fires exactly once per real transition', async () => {
    const { grid } = mount();
    await flushRender();

    const started: LoadingChangedEvent[] = [];
    const stopped: LoadingChangedEvent[] = [];
    grid.api.on<LoadingChangedEvent>(GridEventType.LOADING_STARTED, (e) => started.push(e));
    grid.api.on<LoadingChangedEvent>(GridEventType.LOADING_STOPPED, (e) => stopped.push(e));

    grid.api.setLoading(true);
    grid.api.setLoading(false);

    expect(started).toHaveLength(1);
    expect(stopped).toHaveLength(1);
  });

  it('stays silent when the flag is re-asserted', async () => {
    const { grid } = mount();
    await flushRender();

    const started: LoadingChangedEvent[] = [];
    grid.api.on<LoadingChangedEvent>(GridEventType.LOADING_STARTED, (e) => started.push(e));

    grid.api.setLoading(true);
    grid.api.setLoading(true);
    grid.api.setLoading(true);

    // The store gates unchanged writes, which is what makes one watcher a safe
    // single emitter for every producer (api, server model, infinite model).
    expect(started).toHaveLength(1);
  });

  it('carries the flag and the active indicator', async () => {
    const { grid } = mount({ loadingOverlay: { indicator: LoadingIndicator.Skeleton } });
    await flushRender();

    const events: LoadingChangedEvent[] = [];
    grid.api.on<LoadingChangedEvent>(GridEventType.LOADING_STARTED, (e) => events.push(e));
    grid.api.on<LoadingChangedEvent>(GridEventType.LOADING_STOPPED, (e) => events.push(e));

    grid.api.setLoading(true);
    grid.api.setLoading(false);

    expect(events).toEqual([
      { loading: true, indicator: LoadingIndicator.Skeleton },
      { loading: false, indicator: LoadingIndicator.Skeleton },
    ]);
  });
});

describe('overlay configuration', () => {
  it('renders skeleton placeholders when configured', async () => {
    const { container } = mount({
      loading: true,
      loadingOverlay: { indicator: LoadingIndicator.Skeleton, skeletonRows: 4 },
    });
    await flushRender();

    expect(container.querySelector('.pg-loading-skeleton')).not.toBeNull();
    expect(container.querySelectorAll('.pg-loading-skeleton__row').length).toBeGreaterThan(0);
  });

  it('honours the deprecated loadingOverlayText', async () => {
    const { container } = mount({ loading: true, loadingOverlayText: 'Legacy caption' });
    await flushRender();

    expect(container.querySelector('.pg-overlay__text')?.textContent).toBe('Legacy caption');
  });

  it('lets loadingOverlay.text win over the deprecated option', async () => {
    const { container } = mount({
      loading: true,
      loadingOverlayText: 'Legacy caption',
      loadingOverlay: { text: 'Modern caption' },
    });
    await flushRender();

    expect(container.querySelector('.pg-overlay__text')?.textContent).toBe('Modern caption');
  });

  it('swaps the indicator at runtime without losing the overlay', async () => {
    const { grid, container } = mount({ loading: true });
    await flushRender();
    expect(container.querySelector('.pg-overlay--spinner')).not.toBeNull();

    grid.api.updateLoadingOverlay({ indicator: LoadingIndicator.Skeleton });

    expect(container.querySelector('.pg-loading-skeleton')).not.toBeNull();
    expect(container.querySelector('.pg-overlay--spinner')).toBeNull();
  });

  it('reports the resolved configuration', async () => {
    const { grid } = mount({ loadingOverlay: { text: 'Hi' } });
    await flushRender();

    const resolved = grid.api.getLoadingOverlayConfig();
    expect(resolved.text).toBe('Hi');
    expect(resolved.indicator).toBe(LoadingIndicator.Spinner);
    expect(resolved.iconSize).toBe(32);
  });

  it('merges a patch onto the host config, not onto resolved defaults', async () => {
    const { grid } = mount({ loadingOverlay: { text: 'Original' } });
    await flushRender();

    grid.api.updateLoadingOverlay({ indicator: LoadingIndicator.Skeleton });

    const resolved = grid.api.getLoadingOverlayConfig();
    expect(resolved.text).toBe('Original');
    expect(resolved.indicator).toBe(LoadingIndicator.Skeleton);
  });
});

describe('teardown', () => {
  it('leaves no pending delay timer behind', async () => {
    vi.useFakeTimers();
    try {
      const { grid } = mount({ loadingOverlay: { delay: 500 } });
      grid.api.setLoading(true);
      // Let the render loop reach the overlay and arm the delay.
      vi.advanceTimersByTime(50);

      grid.destroy();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
