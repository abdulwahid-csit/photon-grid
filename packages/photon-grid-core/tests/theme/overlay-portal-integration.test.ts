// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { GridCore } from '../../src/core/grid-core';
import { portalHostFor } from '../../src/theme/overlay-portal';
import type { GridOptions } from '../../src/types/grid.types';

/**
 * End-to-end guard for the bug this subsystem exists to fix.
 *
 * The repro, taken straight from the demo page: a grid that names no mode and no
 * variant (so it gets light + classic) is mounted **before** grids that declare
 * `mode: 'dark'`. `ThemeManager` mirrors mode tokens and the mode/variant
 * attributes onto `<html>`, which every grid shares, so the dark grids won the
 * document root. Every overlay of the light grid is portaled outside its
 * container, so they resolved that root and rendered dark — dark context menus
 * on a grid nobody asked to be dark.
 *
 * Unlike `overlay-portal.test.ts`, which drives `ThemeManager` directly, this
 * goes through real `GridCore` construction so the wiring in `initialize()` is
 * covered too.
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

/**
 * Installed at module scope *and* per test. Module scope covers the case where
 * the grid is constructed before any hook runs; the `beforeEach` repeat covers a
 * sibling file in the same worker having replaced or deleted the global.
 * `ScrollController` resolves the bare identifier through the scope chain, so
 * both the global object and `window` are stamped.
 */
function installResizeObserver(): void {
  const stub = NoopResizeObserver as unknown as typeof ResizeObserver;
  (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = stub;
  if (typeof window !== 'undefined') {
    (window as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = stub;
  }
}

installResizeObserver();

let grids: GridCore[] = [];
let containers: HTMLElement[] = [];

/** Mounts a grid in a fresh container and registers both for teardown. */
function mount(options: Partial<GridOptions> = {}): { grid: GridCore; container: HTMLElement } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);

  const grid = new GridCore(container, {
    columns: COLUMNS,
    data: ROWS,
    ...options,
  } as GridOptions);
  grids.push(grid);
  return { grid, container };
}

beforeEach(() => {
  grids = [];
  containers = [];
  installResizeObserver();
  document.body.innerHTML = '';
});

afterEach(() => {
  for (const g of grids) {
    try { g.destroy(); } catch { /* teardown is best-effort */ }
  }
  document.body.innerHTML = '';
});

describe('a default grid keeps its own theme beside a dark grid', () => {
  it('does not let a later dark grid re-skin its overlays', () => {
    // Mount order matters: this is the order that used to break.
    const light = mount();
    const dark = mount({ mode: 'dark', variant: 'quantum' });

    const lightHost = portalHostFor(light.container);
    const darkHost = portalHostFor(dark.container);

    expect(lightHost).not.toBe(document.body);
    expect(lightHost).not.toBe(darkHost);

    // The light grid, which named neither axis, gets light + classic — and keeps
    // them after the dark grid has mounted and claimed the document root.
    expect(lightHost.getAttribute('data-pg-mode')).toBe('light');
    expect(lightHost.getAttribute('data-pg-variant')).toBe('classic');
    expect(lightHost.classList.contains('pg-classic-theme')).toBe(true);

    expect(darkHost.getAttribute('data-pg-mode')).toBe('dark');
    expect(darkHost.getAttribute('data-pg-variant')).toBe('quantum');
  });

  it('resolves the right host from a cell deep inside either grid', () => {
    const light = mount();
    const dark = mount({ mode: 'dark', variant: 'quantum' });

    // A context menu opens from a cell, so that is the element the resolution
    // actually starts from in production.
    const lightCell = light.container.querySelector('.pg-cell') ?? light.container;
    const darkCell = dark.container.querySelector('.pg-cell') ?? dark.container;

    expect(portalHostFor(lightCell).getAttribute('data-pg-mode')).toBe('light');
    expect(portalHostFor(darkCell).getAttribute('data-pg-mode')).toBe('dark');
  });

  it('scopes the host so the grid’s token stylesheet reaches its overlays', () => {
    const { container } = mount();
    const host = portalHostFor(container);

    const scope = container.getAttribute('data-pg-theme-scope');
    expect(scope).toBeTruthy();
    // Same scope id ⇒ the `[data-pg-theme-scope="…"] { --pg-…: … }` rule
    // ThemeManager injects matches the host, and overlays inherit from it. This
    // is what makes the palette correct rather than merely the skin class.
    expect(host.getAttribute('data-pg-theme-scope')).toBe(scope);
  });

  it('tears its host down with the grid', () => {
    const { grid, container } = mount();
    const host = portalHostFor(container);
    expect(host.isConnected).toBe(true);

    grid.destroy();
    expect(host.isConnected).toBe(false);
  });
});

describe('an explicitly unskinned grid', () => {
  it('still gets a scoped host, so its overlays keep the right palette', () => {
    // `variant: 'none'` opts out of the *skin*, not out of theming. Its overlays
    // must still resolve this grid's mode rather than the document root's.
    const { container } = mount({ variant: 'none', mode: 'light' });
    mount({ mode: 'dark' });

    const host = portalHostFor(container);
    expect(host.getAttribute('data-pg-mode')).toBe('light');
    expect(host.hasAttribute('data-pg-variant')).toBe(false);
  });
});
