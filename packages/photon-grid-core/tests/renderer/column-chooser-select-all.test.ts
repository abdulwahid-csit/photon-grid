// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ColumnChooser } from '../../src/renderer/column-chooser';
import { ColumnModel } from '../../src/core/column-model';
import { GridStore } from '../../src/core/grid-store';
import { EventBus } from '../../src/event-bus/event-bus';
import { IconRenderer } from '../../src/icons/icon-renderer';
import { IconRegistry } from '../../src/icons/icon-registry';
import type { ColumnDefInput } from '../../src/types/column.types';

/**
 * The Column Chooser's "Select all" row.
 *
 * Two properties carry the whole feature. It must *describe* the list — a box
 * reading "all selected" above three unticked rows is worse than no box at all
 * — and it must act on exactly the columns it describes, which with a search
 * term active is not the same set as "every column in the grid".
 */

const COLUMNS: ColumnDefInput[] = [
  { colId: 'a', field: 'a', header: 'Alpha' },
  { colId: 'b', field: 'b', header: 'Beta' },
  { colId: 'c', field: 'c', header: 'Gamma' },
];

let chooser: ColumnChooser | null = null;

/** Flattens group defs to the leaves `ColumnModel` actually holds. */
function leaves(defs: ColumnDefInput[]): ColumnDefInput[] {
  return defs.flatMap((d) => (d.children?.length ? leaves(d.children) : [d]));
}

/**
 * Opens the chooser over `columns`.
 *
 * The model is seeded with the *flattened* leaves and the dialog with the
 * *nested* definitions — which is exactly how `GridRenderer` wires the two, and
 * the only arrangement in which group rows resolve to live columns.
 */
function open(columns: ColumnDefInput[] = COLUMNS): ColumnModel {
  const bus = new EventBus();
  const model = new ColumnModel(new GridStore(bus), bus);
  model.initColumns(leaves(columns));
  chooser = new ColumnChooser(model, new IconRenderer(new IconRegistry()));
  chooser.open(columns);
  return model;
}

/** The select-all checkbox element. */
function box(): HTMLElement {
  return document.querySelector<HTMLElement>('.pg-col-chooser__select-all .pg-col-chooser__checkbox')!;
}

/** The select-all row, whose class carries the disabled state. */
function row(): HTMLElement {
  return document.querySelector<HTMLElement>('.pg-col-chooser__select-all')!;
}

/** Every leaf checkbox in the tree, in display order. */
function leafBoxes(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('.pg-col-chooser__row--leaf .pg-col-chooser__checkbox'),
  );
}

function search(term: string): void {
  const input = document.querySelector<HTMLInputElement>('.pg-col-chooser__search-input')!;
  input.value = term;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function visibleFields(model: ColumnModel): string[] {
  return model.getAllColumns().filter((c) => c.visible !== false).map((c) => c.field);
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  chooser?.destroy();
  chooser = null;
  document.body.innerHTML = '';
});

describe('select all — placement', () => {
  it('sits above the tree, outside the scrolling body', () => {
    open();
    const dialog = document.querySelector('.pg-col-chooser')!;
    const children = Array.from(dialog.children).map((el) => el.className);

    expect(children).toContain('pg-col-chooser__select-all');
    expect(children.indexOf('pg-col-chooser__select-all'))
      .toBeLessThan(children.indexOf('pg-col-chooser__body'));
  });

  it('is named for assistive technology', () => {
    open();
    expect(box().getAttribute('aria-label')).toBe('Select all columns');
    expect(box().getAttribute('role')).toBe('checkbox');
  });
});

describe('select all — state', () => {
  it('starts checked when every column is visible', () => {
    open();
    expect(box().getAttribute('aria-checked')).toBe('true');
    expect(box().classList.contains('pg-col-chooser__checkbox--checked')).toBe(true);
  });

  it('goes indeterminate when only some columns are visible', () => {
    const model = open();
    leafBoxes()[1].click();

    expect(visibleFields(model)).toEqual(['a', 'c']);
    expect(box().getAttribute('aria-checked')).toBe('mixed');
    expect(box().classList.contains('pg-col-chooser__checkbox--indeterminate')).toBe(true);
  });

  it('goes unchecked when every column is hidden', () => {
    open();
    box().click(); // all visible → hide all

    expect(box().getAttribute('aria-checked')).toBe('false');
    expect(box().classList.contains('pg-col-chooser__checkbox--checked')).toBe(false);
  });

  it('tracks a single column being toggled in the tree', () => {
    open();
    leafBoxes()[1].click();
    expect(box().getAttribute('aria-checked')).toBe('mixed');

    leafBoxes()[1].click();
    expect(box().getAttribute('aria-checked')).toBe('true');
  });
});

describe('select all — toggling', () => {
  it('hides every column when all are visible', () => {
    const model = open();
    box().click();
    expect(visibleFields(model)).toEqual([]);
  });

  it('shows every column when none are visible', () => {
    const model = open();
    box().click();
    box().click();
    expect(visibleFields(model)).toEqual(['a', 'b', 'c']);
  });

  it('resolves a half-ticked box upward, to all visible', () => {
    // The destructive direction is only ever reached from a state the user can
    // see is complete.
    const model = open();
    leafBoxes()[0].click();
    expect(box().getAttribute('aria-checked')).toBe('mixed');

    box().click();
    expect(visibleFields(model)).toEqual(['a', 'b', 'c']);
  });
});

describe('select all — scoped to the search', () => {
  it('describes only the columns the search is showing', () => {
    open();
    leafBoxes()[0].click(); // hide Alpha

    search('alpha');
    // Only the hidden column is listed, so the box reads "none".
    expect(box().getAttribute('aria-checked')).toBe('false');

    search('beta');
    expect(box().getAttribute('aria-checked')).toBe('true');
  });

  it('acts only on the columns the search is showing', () => {
    const model = open();
    search('alpha');
    box().click(); // hides Alpha only

    expect(visibleFields(model)).toEqual(['b', 'c']);
  });

  it('is disabled when the search matches nothing', () => {
    open();
    search('nothing matches this');

    expect(row().classList.contains('pg-col-chooser__select-all--disabled')).toBe(true);
    expect(box().getAttribute('aria-disabled')).toBe('true');
    expect(box().tabIndex).toBe(-1);
  });
});

describe('select all — always-visible columns', () => {
  const LOCKED: ColumnDefInput[] = [
    { colId: 'a', field: 'a', header: 'Alpha', alwaysVisible: true },
    { colId: 'b', field: 'b', header: 'Beta' },
  ];

  it('ignores them when deriving its state', () => {
    // Counting a column that can never be unticked would pin the box at
    // "mixed" no matter what the user did.
    open(LOCKED);
    // Hide the only toggleable column; the locked one stays visible.
    leafBoxes()[1].click();

    expect(box().getAttribute('aria-checked')).toBe('false');
  });

  it('never hides them', () => {
    const model = open(LOCKED);
    box().click();
    expect(visibleFields(model)).toEqual(['a']);
  });

  it('disables the row when nothing listed can be toggled', () => {
    open([{ colId: 'a', field: 'a', header: 'Alpha', alwaysVisible: true }]);
    expect(row().classList.contains('pg-col-chooser__select-all--disabled')).toBe(true);
  });
});

describe('select all — keyboard', () => {
  function press(el: HTMLElement, key: string): boolean {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  }

  it('toggles on Space, and suppresses the page scroll it would cause', () => {
    const model = open();
    expect(press(box(), ' ')).toBe(true);
    expect(visibleFields(model)).toEqual([]);
  });

  it('toggles on Enter', () => {
    const model = open();
    press(box(), 'Enter');
    expect(visibleFields(model)).toEqual([]);
  });

  it('ignores other keys', () => {
    const model = open();
    press(box(), 'a');
    expect(visibleFields(model)).toEqual(['a', 'b', 'c']);
  });

  it('is reachable in the tab order while enabled', () => {
    open();
    expect(box().tabIndex).toBe(0);
  });

  it('makes the tree\'s own checkboxes operable too', () => {
    // They were focusable but inert: a <span role="checkbox"> fires no click
    // for Space the way a real <input> does.
    const model = open();
    press(leafBoxes()[1], ' ');
    expect(visibleFields(model)).toEqual(['a', 'c']);
  });
});

describe('select all — grouped columns', () => {
  const GROUPED: ColumnDefInput[] = [
    {
      header: 'Group',
      children: [
        { colId: 'a', field: 'a', header: 'Alpha' },
        { colId: 'b', field: 'b', header: 'Beta' },
      ],
    },
    { colId: 'c', field: 'c', header: 'Gamma' },
  ];

  it('counts leaves inside groups, not the group rows', () => {
    open(GROUPED);
    expect(box().getAttribute('aria-checked')).toBe('true');

    // Alpha lives inside the group; unticking it must move the header box.
    leafBoxes()[0].click();
    expect(box().getAttribute('aria-checked')).toBe('mixed');
  });

  it('hides grouped and ungrouped columns alike', () => {
    const model = open(GROUPED);
    box().click();
    expect(visibleFields(model)).toEqual([]);
  });
});
