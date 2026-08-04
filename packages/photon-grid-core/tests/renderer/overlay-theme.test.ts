import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { adoptGridTheme } from '../../src/renderer/overlay-theme';
import { StubElement, installDomStub } from './dom-stub';

/**
 * Contract for portaled-panel theming.
 *
 * The bug this exists to prevent has one signature and one cause: a panel on
 * `document.body` cannot see a token stylesheet scoped to a grid's container,
 * so every `var(--pg-…, fallback)` collapses to its literal fallback — and
 * those fallbacks are light-mode values. The symptom is always a white panel on
 * a dark grid.
 *
 * The panels are module singletons reused across every grid on the page, so
 * *clearing* the previous grid's theme matters exactly as much as applying the
 * new one.
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); });
afterEach(() => { teardown(); });

/** A grid container carrying what `ThemeManager.applyMode`/`applyVariant` set. */
function grid(scope: string, mode: string, variant?: string): StubElement {
  const container = new StubElement('div');
  container.className = variant ? `pg-grid ${variant}` : 'pg-grid';
  container.setAttribute('data-pg-theme-scope', scope);
  container.setAttribute('data-pg-mode', mode);
  container.style.setProperty('color-scheme', mode);
  return container;
}

/** A trigger nested a few levels deep, as a cell control really is. */
function triggerIn(container: StubElement): StubElement {
  const cell = new StubElement('div');
  const button = new StubElement('button');
  container.appendChild(cell);
  cell.appendChild(button);
  return button;
}

function adopt(panel: StubElement, trigger: StubElement): void {
  adoptGridTheme(panel as unknown as HTMLElement, trigger as unknown as HTMLElement);
}

describe('adoptGridTheme', () => {
  it('carries the scope attribute the token stylesheet selects on', () => {
    // The whole fix: `[data-pg-theme-scope="…"] { --pg-…: … }` matches the
    // element that carries the attribute, so the panel resolves that grid's
    // palette directly rather than through the shared :root mirror.
    const panel = new StubElement('div');
    adopt(panel, triggerIn(grid('pg-scope-3', 'dark')));
    expect(panel.getAttribute('data-pg-theme-scope')).toBe('pg-scope-3');
  });

  it('carries the mode and its colour scheme', () => {
    const panel = new StubElement('div');
    adopt(panel, triggerIn(grid('pg-scope-1', 'dark')));
    expect(panel.getAttribute('data-pg-mode')).toBe('dark');
    // These panels scroll; this is what paints the scrollbar to match.
    expect(panel.style.getPropertyValue('color-scheme')).toBe('dark');
  });

  it('carries a variant skin class without dragging pg-grid along', () => {
    const panel = new StubElement('div');
    adopt(panel, triggerIn(grid('pg-scope-1', 'light', 'pg-ion-theme')));
    expect(panel.classList.contains('pg-ion-theme')).toBe(true);
    expect(panel.classList.contains('pg-grid')).toBe(false);
  });

  it('replaces the previous grid\'s theme rather than accumulating it', () => {
    // One panel serves every grid on the page, and two grids need not share a
    // mode. A stale scope would be worse than none — it would resolve a real
    // palette, just the wrong one.
    const panel = new StubElement('div');
    adopt(panel, triggerIn(grid('pg-scope-1', 'dark', 'pg-ion-theme')));
    adopt(panel, triggerIn(grid('pg-scope-2', 'light', 'pg-neon-theme')));

    expect(panel.getAttribute('data-pg-theme-scope')).toBe('pg-scope-2');
    expect(panel.getAttribute('data-pg-mode')).toBe('light');
    expect(panel.classList.contains('pg-neon-theme')).toBe(true);
    expect(panel.classList.contains('pg-ion-theme')).toBe(false);
    expect(panel.style.getPropertyValue('color-scheme')).toBe('light');
  });

  it('clears everything when the trigger is in no themed container', () => {
    const panel = new StubElement('div');
    adopt(panel, triggerIn(grid('pg-scope-1', 'dark')));

    const orphan = new StubElement('button');
    adopt(panel, orphan);

    expect(panel.getAttribute('data-pg-theme-scope')).toBeNull();
    expect(panel.getAttribute('data-pg-mode')).toBeNull();
    expect(panel.style.getPropertyValue('color-scheme')).toBe('');
  });

  it('resolves the nearest grid when one is nested in another', () => {
    // Master/Detail mounts a whole grid inside a cell of its parent. A detail
    // grid can carry its own mode, and the panel belongs to the inner one.
    const outer = grid('pg-scope-outer', 'light');
    const inner = grid('pg-scope-inner', 'dark');
    outer.appendChild(inner);

    const panel = new StubElement('div');
    adopt(panel, triggerIn(inner));
    expect(panel.getAttribute('data-pg-theme-scope')).toBe('pg-scope-inner');
  });
});
