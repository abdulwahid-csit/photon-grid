// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import {
  KEEP_FOCUS_ATTR,
  isInsideGridUi,
  resolveGridRoot,
} from '../../src/cell-selection/focus-boundary';

/**
 * Contract for the boundary that decides whether a click "left the grid".
 *
 * The interesting cases are all on the *inside* of the line, because that is
 * where the expensive failure lives: every menu, editor panel and overlay
 * Photon portals to `<body>` is physically outside the grid container, and
 * mistaking one for the page destroys the selection the user opened it to act
 * on. The outside cases are trivial by comparison.
 */

let root: HTMLElement;

/** Builds `<div data-pg-theme-scope><div class="pg-grid"><div class="pg-cell"/></div></div>`. */
function mountGrid(): { host: HTMLElement; wrapper: HTMLElement; cell: HTMLElement } {
  const host = document.createElement('div');
  host.setAttribute('data-pg-theme-scope', 'pg-scope-1');
  const wrapper = document.createElement('div');
  wrapper.className = 'pg-grid';
  const cell = document.createElement('div');
  cell.className = 'pg-cell';
  wrapper.appendChild(cell);
  host.appendChild(wrapper);
  document.body.appendChild(host);
  return { host, wrapper, cell };
}

/** Appends a body-level overlay the way every portaled Photon panel does. */
function portal(className: string): HTMLElement {
  const el = document.createElement('div');
  el.className = className;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
  root = mountGrid().host;
});

describe('resolveGridRoot', () => {
  it('widens a body panel to the theme-scope host, so header and footer count as inside', () => {
    const { host, cell } = (document.body.innerHTML = '', mountGrid());
    expect(resolveGridRoot(cell)).toBe(host);
  });

  it('falls back to the .pg-grid wrapper before the theme scope exists', () => {
    // The scope attribute is written when the theme is applied, which can be
    // after a renderer attaches — the boundary must still be the whole grid.
    document.body.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'pg-grid';
    const cell = document.createElement('div');
    wrapper.appendChild(cell);
    document.body.appendChild(wrapper);

    expect(resolveGridRoot(cell)).toBe(wrapper);
  });

  it('never returns null — an orphan element is its own root', () => {
    const orphan = document.createElement('div');
    expect(resolveGridRoot(orphan)).toBe(orphan);
  });
});

describe('inside the grid', () => {
  it('counts a cell', () => {
    expect(isInsideGridUi(root.querySelector('.pg-cell'), root)).toBe(true);
  });

  it('counts the container itself, including padding the host put around it', () => {
    expect(isInsideGridUi(root, root)).toBe(true);
  });
});

describe('portaled Photon UI is treated as inside', () => {
  // Each of these is appended to `<body>`, so a plain `container.contains()`
  // test reports "outside" and the selection dies on the first menu click.
  const PORTALS = [
    'pg-context-menu',            // cell right-click
    'pg-col-ctx-menu',            // header right-click
    'pg-col-chooser__overlay',    // column chooser
    'pg-dropdown-editor__panel',  // dropdown cell editor
    'pg-toast-layer',
  ];

  for (const cls of PORTALS) {
    it(`counts .${cls}`, () => {
      expect(isInsideGridUi(portal(cls), root)).toBe(true);
    });
  }

  it('counts a descendant of an overlay, not just its root', () => {
    const menu = portal('pg-context-menu');
    const item = document.createElement('button');
    item.className = 'pg-context-menu__item';
    const label = document.createElement('span');
    item.appendChild(label);
    menu.appendChild(item);

    expect(isInsideGridUi(label, root)).toBe(true);
  });

  it('recognises an overlay class added later without editing the guard', () => {
    // The namespace check is the point: no list to keep in sync.
    expect(isInsideGridUi(portal('pg-some-future-panel'), root)).toBe(true);
  });
});

describe('outside the grid', () => {
  it('is an unrelated body-level element', () => {
    const other = document.createElement('div');
    other.className = 'app-sidebar';
    document.body.appendChild(other);

    expect(isInsideGridUi(other, root)).toBe(false);
  });

  it('is the page background itself', () => {
    expect(isInsideGridUi(document.body, root)).toBe(false);
  });

  it('is a host element that merely lives next to a portal', () => {
    const wrap = document.createElement('div');
    document.body.appendChild(wrap);
    const inner = document.createElement('div');
    inner.className = 'pg-looks-like-ours';
    wrap.appendChild(inner);

    // The prefix is only trusted on the body-level ancestor; nesting it under a
    // host element does not make it Photon's.
    expect(isInsideGridUi(inner, root)).toBe(false);
  });

  it('is another grid on the page', () => {
    const other = mountGrid();
    expect(isInsideGridUi(other.cell, root)).toBe(false);
  });
});

describe('the host escape hatch', () => {
  it('keeps focus for a popup marked with the attribute', () => {
    const panel = document.createElement('div');
    panel.className = 'mat-select-panel';
    panel.setAttribute(KEEP_FOCUS_ATTR, '');
    document.body.appendChild(panel);

    expect(isInsideGridUi(panel, root)).toBe(true);
  });

  it('covers the marked element’s whole subtree', () => {
    const panel = document.createElement('div');
    panel.setAttribute(KEEP_FOCUS_ATTR, '');
    const option = document.createElement('li');
    panel.appendChild(option);
    document.body.appendChild(panel);

    expect(isInsideGridUi(option, root)).toBe(true);
  });
});

describe('fails closed on targets it cannot judge', () => {
  // Dropping a focus ring by mistake loses the range the user was about to
  // copy; keeping one by mistake is cosmetic. Ambiguity resolves to "inside".
  it('treats a non-element target as inside', () => {
    expect(isInsideGridUi(null, root)).toBe(true);
    expect(isInsideGridUi(window as unknown as EventTarget, root)).toBe(true);
  });

  it('treats an element detached mid-event as inside', () => {
    // Real case: the pointerdown handler runs after a re-render has already
    // recycled the row node under the cursor.
    const detached = document.createElement('div');
    expect(isInsideGridUi(detached, root)).toBe(true);
  });
});
