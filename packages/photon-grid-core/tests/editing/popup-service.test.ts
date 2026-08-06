// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { PopupService } from '../../src/editing/services/popup-service';

/**
 * How a portalled editor sits against its cell.
 *
 * A popup editor is lifted out of the grid so it can overlap the rows beneath
 * it, which costs it the two things an inline editor gets for free: it no longer
 * inherits its column's width, and it no longer moves or clips when the grid
 * scrolls. Both have to be put back deliberately, and these specs pin how.
 */

/** A `.pg-cell` of a known size, since jsdom reports zeros for everything. */
function makeCell(width: number, top = 100): HTMLElement {
  const cellEl = document.createElement('div');
  cellEl.className = 'pg-cell';
  cellEl.getBoundingClientRect = () =>
    ({ x: 40, y: top, left: 40, top, right: 40 + width, bottom: top + 24, width, height: 24 }) as DOMRect;
  document.body.appendChild(cellEl);
  return cellEl;
}

function makeGui(): HTMLElement {
  const gui = document.createElement('div');
  gui.className = 'pg-editor-combobox';
  return gui;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('PopupService — width', () => {
  it('pins the popup to its cell width, so it lines up with the column', () => {
    const cellEl = makeCell(260);
    const popup = new PopupService().open({
      gui: makeGui(), cellEl, ariaLabel: 'Contact', onDismiss: () => {},
    });

    expect(popup.element.style.width).toBe('260px');
    popup.close();
  });

  it('follows the cell when the column is resized and the popup repositioned', () => {
    let width = 200;
    const cellEl = document.createElement('div');
    cellEl.getBoundingClientRect = () =>
      ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: 24, width, height: 24 }) as DOMRect;
    document.body.appendChild(cellEl);

    const popup = new PopupService().open({
      gui: makeGui(), cellEl, ariaLabel: 'Contact', onDismiss: () => {},
    });
    expect(popup.element.style.width).toBe('200px');

    width = 320;
    popup.reposition();
    expect(popup.element.style.width).toBe('320px');
    popup.close();
  });

  it('refuses to shrink below a usable minimum on a very narrow column', () => {
    // Matching a 60px column exactly would be a searchable list nobody can
    // read — the one case where "as wide as the cell" is the wrong answer.
    const popup = new PopupService().open({
      gui: makeGui(), cellEl: makeCell(60), ariaLabel: 'Qty', onDismiss: () => {},
    });

    expect(popup.element.style.width).toBe('160px');
    popup.close();
  });
});

describe('PopupService — dismissal', () => {
  it('dismisses when the grid scrolls underneath it', () => {
    // Repositioning instead would sail the popup over the header and out of the
    // grid, still claiming to belong to a cell that has scrolled away.
    const onDismiss = vi.fn();
    const scroller = document.createElement('div');
    document.body.appendChild(scroller);

    const popup = new PopupService().open({
      gui: makeGui(), cellEl: makeCell(200), ariaLabel: 'Contact', onDismiss,
    });

    scroller.dispatchEvent(new Event('scroll', { bubbles: false }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    popup.close();
  });

  it('ignores the popup scrolling its own option list', () => {
    // A long list under the cursor is the user reading, not the grid moving.
    const onDismiss = vi.fn();
    const gui = makeGui();
    const listbox = document.createElement('ul');
    gui.appendChild(listbox);

    const popup = new PopupService().open({
      gui, cellEl: makeCell(200), ariaLabel: 'Contact', onDismiss,
    });

    listbox.dispatchEvent(new Event('scroll', { bubbles: false }));
    expect(onDismiss).not.toHaveBeenCalled();
    popup.close();
  });

  it('dismisses on a press outside itself and its cell', () => {
    const onDismiss = vi.fn();
    const cellEl = makeCell(200);
    const popup = new PopupService().open({
      gui: makeGui(), cellEl, ariaLabel: 'Contact', onDismiss,
    });

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // A press inside the popup, or on the cell it belongs to, is not leaving.
    popup.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    cellEl.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    popup.close();
  });

  it('releases every listener on close, so a closed popup cannot fire again', () => {
    const onDismiss = vi.fn();
    const popup = new PopupService().open({
      gui: makeGui(), cellEl: makeCell(200), ariaLabel: 'Contact', onDismiss,
    });

    popup.close();
    popup.close(); // idempotent

    document.body.dispatchEvent(new Event('scroll'));
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();
    expect(popup.element.isConnected).toBe(false);
  });
});
