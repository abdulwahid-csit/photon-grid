// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  ColumnsManagerLauncher,
  resolveColumnsManagerConfig,
} from '../../src/renderer/columns-manager-launcher';
import { toolbarCss } from '../../src/styles/base/toolbar.css';
import { filtersToolPanelCss } from '../../src/styles/base/filters-tool-panel.css';
import { IconRenderer } from '../../src/icons/icon-renderer';
import { IconRegistry } from '../../src/icons/icon-registry';
import { GridCore } from '../../src/core/grid-core';
import type { GridOptions } from '../../src/types/grid.types';

/**
 * The Columns Manager launcher — the tools-strip button that opens the grid's
 * Column Chooser.
 *
 * Two things matter beyond "a button exists": it must open the *same* chooser
 * the header menu opens (a second dialog would drift from the first), and it
 * must be opt-in, because a launcher that appeared by default would add a tools
 * strip to every grid that has no other launcher.
 */

class NoopResizeObserver implements ResizeObserver {
  observe(): void { /* no layout in jsdom to observe */ }
  unobserve(): void { /* no-op */ }
  disconnect(): void { /* no-op */ }
}
(globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
  NoopResizeObserver as unknown as typeof ResizeObserver;

function icons(): IconRenderer {
  return new IconRenderer(new IconRegistry());
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('resolveColumnsManagerConfig', () => {
  it('accepts the boolean shorthand', () => {
    expect(resolveColumnsManagerConfig(true)).toEqual({ enabled: true });
  });

  it('passes an enabled object through, keeping its presentation fields', () => {
    const config = { enabled: true, tooltip: 'Manage columns', icon: 'settings' };
    expect(resolveColumnsManagerConfig(config)).toBe(config);
  });

  it('is off unless explicitly asked for', () => {
    // The default matters: a launcher nobody requested would give every grid a
    // tools strip it does not currently have.
    expect(resolveColumnsManagerConfig(undefined)).toBeNull();
    expect(resolveColumnsManagerConfig(false)).toBeNull();
    expect(resolveColumnsManagerConfig({ enabled: false })).toBeNull();
  });
});

describe('ColumnsManagerLauncher', () => {
  function mount(config = { enabled: true }): { host: HTMLElement; onOpen: ReturnType<typeof vi.fn> } {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onOpen = vi.fn();
    new ColumnsManagerLauncher({ iconRenderer: icons(), onOpen }).mount(host, config);
    return { host, onOpen };
  }

  it('carries "Columns Manager" as both its tooltip and its accessible name', () => {
    const btn = mount().host.querySelector('button')!;
    expect(btn.title).toBe('Columns Manager');
    expect(btn.getAttribute('aria-label')).toBe('Columns Manager');
  });

  it('announces that it opens a dialog, not a menu', () => {
    // The chooser is a modal surface with its own heading and close button;
    // claiming "menu" would promise arrow-key navigation it does not provide.
    expect(mount().host.querySelector('button')!.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('renders an icon, hidden from assistive technology', () => {
    const icon = mount().host.querySelector('.pg-columns-launcher__icon')!;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.querySelector('svg')).not.toBeNull();
  });

  it('opens the chooser on click', () => {
    const { host, onOpen } = mount();
    host.querySelector('button')!.click();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('honours a custom tooltip and icon', () => {
    const { host } = mount({ enabled: true, tooltip: 'Manage columns', icon: 'settings' });
    const btn = host.querySelector('button')!;
    expect(btn.title).toBe('Manage columns');
    expect(btn.getAttribute('aria-label')).toBe('Manage columns');
  });

  it('is a plain button, so it never submits a host form', () => {
    expect(mount().host.querySelector('button')!.type).toBe('button');
  });

  it('removes its button on destroy', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const launcher = new ColumnsManagerLauncher({ iconRenderer: icons(), onOpen: vi.fn() });
    launcher.mount(host, { enabled: true });
    launcher.destroy();
    expect(host.querySelector('button')).toBeNull();
  });
});

describe('launcher ordering in the tools strip', () => {
  /**
   * The `order` a launcher rule declares.
   *
   * The quantifier is lazy and the property is anchored to a preceding
   * delimiter on purpose: `border:` ends in the literal `order:`, so a greedy
   * `[^}]*order:` backtracks past the real declaration and reports the width of
   * the border instead — which is exactly how this assertion first "passed"
   * with the wrong number.
   */
  function orderOf(css: string, selector: string): number {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`${escaped}\\s*\\{[^}]*?[;{\\s]order:\\s*(\\d+)`).exec(css);
    return match ? Number(match[1]) : NaN;
  }

  it('sits ahead of the Filters funnel', () => {
    // The right region sequences launchers by CSS `order`, not DOM order, so
    // "in front of the filter icon" is this number and nothing else.
    const columns = orderOf(toolbarCss, '.pg-columns-launcher');
    const filters = orderOf(filtersToolPanelCss, '.pg-filters-launcher');

    expect(columns).toBe(0);
    expect(filters).toBe(1);
    expect(columns).toBeLessThan(filters);
  });
});

describe('a real grid with columnsManager enabled', () => {
  let grid: GridCore | null = null;

  function build(options: Partial<GridOptions> = {}): HTMLElement {
    const container = document.createElement('div');
    document.body.appendChild(container);
    grid = new GridCore(container, {
      columns: [
        { field: 'sku', header: 'SKU' },
        { field: 'name', header: 'Name' },
      ],
      data: [{ sku: 'PG-1', name: 'Widget' }],
      ...options,
    } as GridOptions);
    return container;
  }

  afterEach(() => {
    grid?.destroy();
    grid = null;
    document.body.innerHTML = '';
  });

  it('renders no launcher — and no tools strip — when the option is absent', () => {
    const container = build();
    expect(container.querySelector('.pg-columns-launcher')).toBeNull();
    expect(container.querySelector('.pg-grid__tools')).toBeNull();
  });

  it('renders the launcher in the tools strip when enabled', () => {
    const container = build({ columnsManager: true });
    const btn = container.querySelector('.pg-columns-launcher');
    expect(btn).not.toBeNull();
    expect(btn!.closest('.pg-grid__tools__right')).not.toBeNull();
  });

  it('opens the existing Column Chooser, listing every column', () => {
    const container = build({ columnsManager: true });
    container.querySelector<HTMLElement>('.pg-columns-launcher')!.click();

    // The same dialog the header menu's "Column Chooser…" item opens — asserted
    // by its class, which only that component produces.
    const dialog = document.querySelector('.pg-col-chooser');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('SKU');
    expect(dialog!.textContent).toContain('Name');
  });

  it('can be hidden by the toolbar without disabling the feature', () => {
    const container = build({
      columnsManager: true,
      toolbar: { enabled: true, showColumnsButton: false },
    });
    expect(container.querySelector('.pg-columns-launcher')).toBeNull();
  });

  it('is shown by a toolbar that does not mention it', () => {
    const container = build({ columnsManager: true, toolbar: { enabled: true } });
    expect(container.querySelector('.pg-columns-launcher')).not.toBeNull();
  });
});
