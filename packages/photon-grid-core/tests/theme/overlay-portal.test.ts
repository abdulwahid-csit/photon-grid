// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ThemeManager } from '../../src/theme/theme-manager';
import { EventBus } from '../../src/event-bus/event-bus';
import { portalHostFor, PORTAL_HOST_CLASS, SCOPE_ATTR } from '../../src/theme/overlay-portal';

/**
 * Contract for the **per-grid portal host**.
 *
 * The bug this exists to prevent: `ThemeManager` mirrors the active mode's
 * tokens and the `data-pg-mode` / `data-pg-variant` attributes onto `<html>`,
 * which every grid on the page shares. That mirror is last-initialized-wins, so
 * a light grid mounted alongside a dark one rendered dark context menus — its
 * overlays are portaled outside its container and had nothing else to resolve
 * from.
 *
 * The host fixes that by carrying each grid's own scope, mode and variant on an
 * element the overlays are appended into. The assertions below are about
 * *isolation*: a second grid must not be able to change what the first grid's
 * overlays resolve.
 */

function makeGrid(): { manager: ThemeManager; container: HTMLElement } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return { manager: new ThemeManager(new EventBus()), container };
}

let managers: ThemeManager[] = [];

/** Registers a manager for teardown so hosts never leak between tests. */
function track(manager: ThemeManager): ThemeManager {
  managers.push(manager);
  return manager;
}

beforeEach(() => {
  managers = [];
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-pg-mode');
  document.documentElement.removeAttribute('data-pg-variant');
});

afterEach(() => {
  for (const m of managers) m.destroy();
});

describe('the portal host carries its own grid’s theme', () => {
  it('is created on the first applyMode, in <body>, with the grid’s scope', () => {
    const { manager, container } = makeGrid();
    track(manager).applyMode('light', container);

    const host = manager.getPortalHost();
    expect(host).not.toBeNull();
    expect(host!.parentElement).toBe(document.body);
    expect(host!.classList.contains(PORTAL_HOST_CLASS)).toBe(true);
    // Same scope id as the container: that is what makes the mode-token
    // stylesheet match the host and its overlays inherit the right palette.
    expect(host!.getAttribute(SCOPE_ATTR)).toBe(container.getAttribute(SCOPE_ATTR));
    expect(host!.getAttribute('data-pg-mode')).toBe('light');
  });

  it('does not exist before a mode is applied', () => {
    const { manager } = makeGrid();
    expect(track(manager).getPortalHost()).toBeNull();
  });

  it('follows mode and variant changes', () => {
    const { manager, container } = makeGrid();
    track(manager).applyMode('light', container);
    manager.applyVariant('classic', container);

    const host = manager.getPortalHost()!;
    expect(host.getAttribute('data-pg-variant')).toBe('classic');
    expect(host.classList.contains('pg-classic-theme')).toBe(true);

    manager.applyMode('dark');
    manager.applyVariant('ion');
    expect(host.getAttribute('data-pg-mode')).toBe('dark');
    expect(host.getAttribute('data-pg-variant')).toBe('ion');
    // The previous skin class must go, or two variants would apply at once.
    expect(host.classList.contains('pg-classic-theme')).toBe(false);
    expect(host.classList.contains('pg-ion-theme')).toBe(true);
    // Not stripped by the variant-class swap.
    expect(host.classList.contains(PORTAL_HOST_CLASS)).toBe(true);
  });

  it('clears the variant attribute and class on "none"', () => {
    const { manager, container } = makeGrid();
    track(manager).applyMode('light', container);
    manager.applyVariant('classic', container);
    manager.applyVariant('none');

    const host = manager.getPortalHost()!;
    expect(host.hasAttribute('data-pg-variant')).toBe(false);
    expect(host.classList.contains('pg-classic-theme')).toBe(false);
  });

  it('is removed from the document on destroy', () => {
    const { manager, container } = makeGrid();
    manager.applyMode('light', container);
    const host = manager.getPortalHost()!;

    manager.destroy();
    expect(host.isConnected).toBe(false);
    expect(manager.getPortalHost()).toBeNull();
  });
});

describe('a second grid cannot re-skin the first grid’s overlays', () => {
  it('keeps each host on its own mode and variant', () => {
    // The exact repro: a light default grid mounted before a dark one, which is
    // the order the demo page uses.
    const light = makeGrid();
    track(light.manager).applyMode('light', light.container);
    light.manager.applyVariant('classic', light.container);

    const dark = makeGrid();
    track(dark.manager).applyMode('dark', dark.container);
    dark.manager.applyVariant('quantum', dark.container);

    // The document root must carry *neither* attribute once a grid has a
    // container of its own. Both are ancestor-rooted in CSS
    // (`[data-pg-mode="dark"] .pg-cell--…`, `[data-pg-variant="quantum"]
    // .pg-context-menu`), so a copy on `<html>` makes those rules match every
    // grid on the page rather than the one they belong to.
    expect(document.documentElement.hasAttribute('data-pg-mode')).toBe(false);
    expect(document.documentElement.hasAttribute('data-pg-variant')).toBe(false);

    // What matters: the light grid's host is untouched by the dark grid.
    const lightHost = light.manager.getPortalHost()!;
    expect(lightHost.getAttribute('data-pg-mode')).toBe('light');
    expect(lightHost.getAttribute('data-pg-variant')).toBe('classic');
    expect(lightHost.classList.contains('pg-classic-theme')).toBe(true);
    expect(lightHost.classList.contains('pg-quantum-theme')).toBe(false);
  });

  it('still mirrors onto the root when a manager drives the document itself', () => {
    // Without a container there is nothing else to hang the attributes on, and
    // no second grid to mis-target, so the mirror is both safe and necessary.
    const manager = track(new ThemeManager(new EventBus()));
    manager.applyMode('dark');
    manager.applyVariant('ion');

    expect(document.documentElement.getAttribute('data-pg-mode')).toBe('dark');
    expect(document.documentElement.getAttribute('data-pg-variant')).toBe('ion');
  });

  it('gives the two grids distinct scopes and distinct hosts', () => {
    const a = makeGrid();
    const b = makeGrid();
    track(a.manager).applyMode('light', a.container);
    track(b.manager).applyMode('dark', b.container);

    const scopeA = a.container.getAttribute(SCOPE_ATTR);
    const scopeB = b.container.getAttribute(SCOPE_ATTR);
    expect(scopeA).toBeTruthy();
    expect(scopeA).not.toBe(scopeB);
    expect(a.manager.getPortalHost()).not.toBe(b.manager.getPortalHost());
  });
});

describe('portalHostFor resolves the owning grid', () => {
  it('resolves from any element inside the grid', () => {
    const { manager, container } = makeGrid();
    track(manager).applyMode('light', container);

    const cell = document.createElement('div');
    container.appendChild(cell);

    expect(portalHostFor(cell)).toBe(manager.getPortalHost());
  });

  it('resolves from inside an already-portaled overlay, so submenus stay put', () => {
    // A fly-out opened from a portaled menu resolves by walking up into the
    // host itself, which also carries the scope attribute. Without keying the
    // registry by scope id this walk would escape to <body> and the submenu
    // would lose the skin its parent menu is wearing.
    const { manager, container } = makeGrid();
    track(manager).applyMode('light', container);
    const host = manager.getPortalHost()!;

    const menu = document.createElement('div');
    host.appendChild(menu);
    const item = document.createElement('button');
    menu.appendChild(item);

    expect(portalHostFor(item)).toBe(host);
  });

  it('falls back to <body> for an element that belongs to no grid', () => {
    const orphan = document.createElement('div');
    document.body.appendChild(orphan);
    expect(portalHostFor(orphan)).toBe(document.body);
  });

  it('falls back to <body> for null, so call sites need no guard', () => {
    expect(portalHostFor(null)).toBe(document.body);
    expect(portalHostFor(undefined)).toBe(document.body);
  });

  it('falls back to <body> once the owning grid is destroyed', () => {
    const { manager, container } = makeGrid();
    manager.applyMode('light', container);
    const cell = document.createElement('div');
    container.appendChild(cell);

    manager.destroy();
    // The scope attribute is still on the container, but nothing is registered
    // for it — a stale host would be worse than none.
    expect(portalHostFor(cell)).toBe(document.body);
  });
});
