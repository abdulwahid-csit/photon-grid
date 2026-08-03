import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { buildRowMenuItems, resolvePredicate, resolveValue } from '../../src/renderer/row-menu-builder';
import type { IconRenderer } from '../../src/icons/icon-renderer';
import type { RowMenuItem, RowMenuItemContext } from '../../src/types/row-menu.types';
import type { RowNode } from '../../src/types/row.types';

import { installDomStub, StubElement } from './dom-stub';

/**
 * Contract for host-authored row context-menu items.
 *
 * The behaviours worth pinning are the ones an application depends on when it
 * writes a menu definition: icons resolve through the registry, `children`
 * produce a hover fly-out marked with the submenu modifier (which is what draws
 * the chevron), predicates are evaluated per open against the clicked row, and
 * a disabled item cannot fire its action.
 */

let teardown: () => void;
beforeEach(() => { teardown = installDomStub(); });
afterEach(() => { teardown(); });

/** Records the names it was asked to render so icon wiring can be asserted. */
function makeIconRenderer(seen: string[]): IconRenderer {
  return {
    renderToString: (name: string) => { seen.push(name); return `<svg data-icon="${name}"></svg>`; },
    render: () => new StubElement('span') as unknown as HTMLElement,
    updateIcon: () => undefined,
  } as unknown as IconRenderer;
}

function makeCtx(
  data: Record<string, unknown> = { id: 1, locked: false },
  onClose: () => void = () => undefined,
): RowMenuItemContext {
  const row = { nodeId: 'r1', rowIndex: 0, data, type: 'data' } as RowNode;
  return {
    api: null,
    row,
    rowIndex: 0,
    data,
    colDef: null,
    colId: null,
    value: undefined,
    selectedRows: [],
    selectedRanges: [],
    event: null,
    close: onClose,
    menu: { close: onClose, refresh: () => undefined, setLoading: () => undefined },
  };
}

/** Renders `items` and returns the produced elements plus the icon names seen. */
function render(
  items: RowMenuItem[],
  ctx = makeCtx(),
  onActivate: (item: RowMenuItem, c: RowMenuItemContext) => void = () => undefined,
): { els: StubElement[]; icons: string[] } {
  const icons: string[] = [];
  const els = buildRowMenuItems(items, ctx, makeIconRenderer(icons), onActivate) as unknown as StubElement[];
  return { els, icons };
}

/** Fires a click on a stub element by invoking its registered listeners. */
function click(el: StubElement, target: StubElement = el): void {
  (el as unknown as { dispatch: (t: string, e: unknown) => void }).dispatch('click', {
    target,
    stopPropagation: () => undefined,
  });
}

describe('resolvePredicate', () => {
  it('treats an omitted value as false', () => {
    expect(resolvePredicate(undefined, makeCtx())).toBe(false);
  });

  it('passes a literal through', () => {
    expect(resolvePredicate(true, makeCtx())).toBe(true);
    expect(resolvePredicate(false, makeCtx())).toBe(false);
  });

  it('evaluates a predicate against the clicked row', () => {
    const ctx = makeCtx({ locked: true });
    expect(resolvePredicate((c) => c.data?.['locked'] === true, ctx)).toBe(true);
  });
});

describe('buildRowMenuItems', () => {
  it('renders a leaf with its label, icon and keyboard hint', () => {
    const { els, icons } = render([
      { id: 'open', label: 'Open record', icon: 'externalLink', kbd: 'Ctrl+O', action: () => undefined },
    ]);

    expect(els).toHaveLength(1);
    const el = els[0];
    expect(el.tagName).toBe('button');
    expect(el.getAttribute('data-item-id')).toBe('open');
    expect(el.querySelector('.pg-context-menu__label')?.textContent).toBe('Open record');
    expect(el.querySelector('.pg-context-menu__kbd')?.textContent).toBe('Ctrl+O');
    expect(icons).toEqual(['externalLink']);
  });

  it('keeps the icon slot for an item without an icon so labels stay aligned', () => {
    const { els, icons } = render([{ label: 'No icon', action: () => undefined }]);
    expect(els[0].querySelector('.pg-context-menu__icon')).not.toBeNull();
    expect(icons).toEqual([]);
  });

  it('marks an item with children as a submenu parent', () => {
    const { els } = render([
      {
        label: 'Set status',
        children: [
          { label: 'Active', action: () => undefined },
          { label: 'Archived', action: () => undefined },
        ],
      },
    ]);

    const parent = els[0];
    // This modifier is what renders the trailing chevron and reveals the
    // fly-out on hover — the submenu affordance lives entirely in CSS.
    expect(parent.classList.contains('pg-context-menu__item--has-sub')).toBe(true);
    expect(parent.getAttribute('aria-haspopup')).toBe('true');

    const sub = parent.querySelector('.pg-context-menu__sub');
    expect(sub).not.toBeNull();
    expect(sub!.querySelectorAll('.pg-context-menu__item')).toHaveLength(2);
  });

  it('nests submenus to any depth', () => {
    const { els } = render([
      {
        label: 'L1',
        children: [
          { label: 'L2', children: [{ label: 'L3', action: () => undefined }] },
        ],
      },
    ]);

    const l2 = els[0].querySelector('.pg-context-menu__sub')!
      .querySelectorAll('.pg-context-menu__item--has-sub');
    expect(l2).toHaveLength(1);
    expect(l2[0].querySelector('.pg-context-menu__sub')).not.toBeNull();
  });

  it('invokes the activation handler with the item and context', () => {
    const seen: string[] = [];
    const ctx = makeCtx();
    const { els } = render(
      [{ id: 'del', label: 'Delete', action: () => undefined }],
      ctx,
      (item, c) => { seen.push(`${item.id}:${c.rowIndex}`); },
    );

    click(els[0]);
    expect(seen).toEqual(['del:0']);
  });

  it('does not activate a disabled item', () => {
    let fired = 0;
    const { els } = render(
      [{ label: 'Delete', disabled: true, action: () => undefined }],
      makeCtx(),
      () => { fired++; },
    );

    expect(els[0].classList.contains('pg-context-menu__item--disabled')).toBe(true);
    expect(els[0].getAttribute('aria-disabled')).toBe('true');
    click(els[0]);
    expect(fired).toBe(0);
  });

  it('evaluates disabled per row', () => {
    const item: RowMenuItem = {
      label: 'Edit',
      disabled: (c) => c.data?.['locked'] === true,
      action: () => undefined,
    };

    const unlocked = render([item], makeCtx({ locked: false })).els[0];
    const locked = render([item], makeCtx({ locked: true })).els[0];

    expect(unlocked.classList.contains('pg-context-menu__item--disabled')).toBe(false);
    expect(locked.classList.contains('pg-context-menu__item--disabled')).toBe(true);
  });

  it('omits an item hidden for this row', () => {
    const { els } = render(
      [
        { label: 'Always', action: () => undefined },
        { label: 'Admin only', hidden: (c) => c.data?.['admin'] !== true, action: () => undefined },
      ],
      makeCtx({ admin: false }),
    );

    expect(els).toHaveLength(1);
    expect(els[0].querySelector('.pg-context-menu__label')?.textContent).toBe('Always');
  });

  it('drops hidden children and degrades a parent left with none', () => {
    const { els } = render(
      [
        {
          label: 'Actions',
          action: () => undefined,
          children: [{ label: 'Secret', hidden: true, action: () => undefined }],
        },
      ],
      makeCtx(),
    );

    // Still rendered because the parent can act on its own — but as a leaf, so
    // the user is never offered a chevron that opens an empty fly-out.
    expect(els).toHaveLength(1);
    expect(els[0].classList.contains('pg-context-menu__item--has-sub')).toBe(false);
  });

  it('drops a parent that has neither visible children nor an action', () => {
    const { els } = render([
      { label: 'Empty', children: [{ label: 'Gone', hidden: true, action: () => undefined }] },
    ]);
    expect(els).toHaveLength(0);
  });

  it('renders a separator before an item that asks for one', () => {
    const { els } = render([
      { label: 'First', action: () => undefined },
      { label: 'Danger', separatorBefore: true, action: () => undefined },
    ]);

    expect(els).toHaveLength(3);
    expect(els[1].classList.contains('pg-context-menu__sep')).toBe(true);
    expect(els[1].getAttribute('role')).toBe('separator');
  });

  it('never leads with a separator', () => {
    const { els } = render([{ label: 'First', separatorBefore: true, action: () => undefined }]);
    expect(els).toHaveLength(1);
    expect(els[0].classList.contains('pg-context-menu__sep')).toBe(false);
  });

  it('ignores a click that bubbled up from a child of a submenu parent', () => {
    let fired = 0;
    const { els } = render(
      [{
        label: 'Parent',
        action: () => undefined,
        children: [{ label: 'Child', action: () => undefined }],
      }],
      makeCtx(),
      () => { fired++; },
    );

    const parent = els[0];
    const child = parent.querySelector('.pg-context-menu__sub')!
      .querySelectorAll('.pg-context-menu__item')[0];

    // The child's own listener fires; the parent's must not double-count it.
    click(parent, child);
    expect(fired).toBe(0);
  });
});

describe('item types', () => {
  it('renders a standalone separator entry', () => {
    const { els } = render([
      { label: 'A', action: () => undefined },
      { type: 'separator' },
      { label: 'B', action: () => undefined },
    ]);

    expect(els).toHaveLength(3);
    expect(els[1].classList.contains('pg-context-menu__sep')).toBe(true);
  });

  it('collapses leading, trailing and consecutive separators', () => {
    const { els } = render([
      { type: 'separator' },
      { type: 'separator' },
      { label: 'A', action: () => undefined },
      { type: 'separator' },
      { type: 'separator' },
      { label: 'B', action: () => undefined },
      { type: 'separator' },
    ]);

    // A, rule, B — no stray rules at either end or between the pair.
    expect(els).toHaveLength(3);
    expect(els[0].classList.contains('pg-context-menu__sep')).toBe(false);
    expect(els[1].classList.contains('pg-context-menu__sep')).toBe(true);
    expect(els[2].classList.contains('pg-context-menu__sep')).toBe(false);
  });

  it('drops a separator left orphaned by a hidden neighbour', () => {
    const { els } = render([
      { label: 'A', action: () => undefined },
      { type: 'separator' },
      { label: 'B', hidden: true, action: () => undefined },
    ]);

    expect(els).toHaveLength(1);
  });

  it('renders a checkbox with its checked state and ARIA role', () => {
    const { els } = render([
      { type: 'checkbox', label: 'Watch', checked: (c) => c.data?.['watched'] === true },
    ], makeCtx({ watched: true }));

    const el = els[0];
    expect(el.getAttribute('role')).toBe('menuitemcheckbox');
    expect(el.getAttribute('aria-checked')).toBe('true');
    expect(el.classList.contains('pg-context-menu__item--checked')).toBe(true);
    expect(el.querySelector('.pg-context-menu__mark--checkbox')).not.toBeNull();
  });

  it('renders an unchecked checkbox without the checked modifier', () => {
    const { els } = render([
      { type: 'checkbox', label: 'Watch', checked: false },
    ]);

    expect(els[0].getAttribute('aria-checked')).toBe('false');
    expect(els[0].classList.contains('pg-context-menu__item--checked')).toBe(false);
    // The indicator slot is still present, so toggling never shifts the layout.
    expect(els[0].querySelector('.pg-context-menu__mark')).not.toBeNull();
  });

  it('renders a radio option with its group semantics', () => {
    const { els } = render([
      { type: 'radio', group: 'density', value: 'compact', label: 'Compact', checked: true },
    ]);

    expect(els[0].getAttribute('role')).toBe('menuitemradio');
    expect(els[0].getAttribute('aria-checked')).toBe('true');
    expect(els[0].querySelector('.pg-context-menu__mark--radio')).not.toBeNull();
  });
});

describe('dynamic values', () => {
  it('resolves a label from the clicked row', () => {
    const { els } = render(
      [{ label: (c) => `Open ${String(c.data?.['name'])}`, action: () => undefined }],
      makeCtx({ name: 'AAPL' }),
    );
    expect(els[0].querySelector('.pg-context-menu__label')?.textContent).toBe('Open AAPL');
  });

  it('resolves an icon name from the clicked row', () => {
    const { icons } = render(
      [{ label: 'Status', icon: (c) => (c.data?.['ok'] === true ? 'check' : 'warning'), action: () => undefined }],
      makeCtx({ ok: false }),
    );
    expect(icons).toEqual(['warning']);
  });

  it('mounts an element returned by a custom icon renderer', () => {
    const custom = new StubElement('span');
    custom.className = 'my-icon';
    const { els, icons } = render(
      [{ label: 'Avatar', icon: () => custom as unknown as HTMLElement, action: () => undefined }],
      makeCtx(),
    );

    // Went straight into the DOM — the registry was never consulted.
    expect(els[0].querySelector('.my-icon')).toBe(custom);
    expect(icons).toEqual([]);
  });

  it('applies a resolved tooltip and a host css class', () => {
    const { els } = render([
      {
        label: 'Delete',
        cssClass: 'danger-item',
        tooltip: (c) => `Delete ${String(c.data?.['id'])}`,
        action: () => undefined,
      },
    ]);

    expect(els[0].classList.contains('danger-item')).toBe(true);
    expect(els[0].title).toBe('Delete 1');
  });
});

describe('resolveValue', () => {
  it('returns undefined for an omitted value', () => {
    expect(resolveValue(undefined, makeCtx())).toBeUndefined();
  });

  it('passes a literal through', () => {
    expect(resolveValue('x', makeCtx())).toBe('x');
  });

  it('calls the function form with the context', () => {
    expect(resolveValue((c) => c.rowIndex, makeCtx())).toBe(0);
  });
});
