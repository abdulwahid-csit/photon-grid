import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { actionsRenderer, CELL_ACTION_ATTR, CELL_ACTION_MENU_ATTR } from '../../../../src/renderer/built-in/actions/actions';
import {
  findAction,
  resetActionFailureReports,
  resolveAction,
  resolveActions,
  splitActions,
} from '../../../../src/renderer/built-in/actions/action-resolver';
import { runCellAction, setActionBusy } from '../../../../src/renderer/built-in/actions/action-executor';
import type { IconRenderer } from '../../../../src/icons/icon-renderer';
import type {
  ActionsRendererOptions,
  CellActionConfirmRequest,
  CellActionParams,
  GridAction,
} from '../../../../src/types/cell-action.types';
import type { BuiltInRenderContext } from '../../../../src/types/built-in-renderer.types';
import type { ColumnDef } from '../../../../src/types/column.types';

import { installDomStub, StubElement } from '../../dom-stub';

/**
 * Contract for the `actions` renderer.
 *
 * Three things carry the weight and are where a regression would be expensive:
 *
 * 1. **Resolution.** Every dynamic option is a function of the row, and the
 *    same resolver decides what is drawn *and* what may be invoked. An action
 *    that resolves invisible must be unclickable, not merely undrawn.
 * 2. **Layout.** Which actions become buttons and which go behind the overflow
 *    trigger is computed twice — once when the cell paints, once when the menu
 *    opens — and the two must agree exactly.
 * 3. **Execution.** A confirmation must gate the handler on every route, an
 *    async handler must leave the control busy until it settles, and a failure
 *    must surface rather than vanish.
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); });
afterEach(() => { teardown(); });

/** A row in the state the documented example's predicates branch on. */
const ROW: Record<string, unknown> = { id: 'r-1', name: 'Aurora Monitor', isDeleted: false };

/** Stand-in `GridApi` exposing only what the resolver reads. */
function apiWith(context: Record<string, unknown> = {}): unknown {
  return { getContext: () => context };
}

/** Icon renderer stub — records the names it was asked for. */
function iconRenderer(): IconRenderer & { names: string[] } {
  const names: string[] = [];
  return {
    names,
    render: (name: string) => {
      names.push(name);
      const el = new StubElement('svg');
      el.className = 'pg-icon';
      return el as unknown as HTMLElement;
    },
  } as unknown as IconRenderer & { names: string[] };
}

function source(row = ROW, api: unknown = apiWith()) {
  return {
    row,
    node: null,
    rowIndex: 0,
    value: row['id'],
    colDef: { colId: 'actions', field: 'actions', header: 'Actions', type: 'string' } as ColumnDef,
    api,
  };
}

function render(
  options: ActionsRendererOptions,
  row = ROW,
  icons: IconRenderer | null = null,
  api: unknown = apiWith(),
): StubElement {
  const inner = new StubElement('div');
  actionsRenderer.render({
    inner: inner as unknown as HTMLElement,
    value: row['id'],
    rawValue: row['id'],
    formattedValue: String(row['id']),
    row,
    colDef: { colId: 'actions', field: 'actions', header: 'Actions', type: 'string' } as ColumnDef,
    rowIndex: 0,
    colIndex: 0,
    options,
    icons,
    api,
  } as BuiltInRenderContext<ActionsRendererOptions>);
  return inner;
}

/** The three-action configuration from the public example. */
function exampleActions(onClick = (): void => undefined): GridAction[] {
  return [
    {
      id: 'archive',
      label: 'Archive',
      icon: { name: 'ban', position: 'prefix' },
      variant: 'warning',
      visible: (p) => !p.row['isDeleted'],
      onClick,
    },
    {
      id: 'unarchive',
      label: 'Unarchive',
      icon: { name: 'refresh', position: 'prefix' },
      variant: 'success',
      visible: (p) => p.row['isDeleted'] === true,
      onClick,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: { name: 'trash' },
      variant: 'danger',
      visible: (p) => (p.context['permissions'] as string[]).includes('DELETE'),
      confirm: { title: 'Delete item?', message: 'This action cannot be undone' },
      onClick,
    },
  ];
}

function buttons(el: StubElement): StubElement[] {
  return el.querySelectorAll(`[${CELL_ACTION_ATTR}]`);
}

function actionIds(el: StubElement): (string | null)[] {
  return buttons(el).map((b) => b.getAttribute(CELL_ACTION_ATTR));
}

describe('action resolution', () => {
  it('offers one of a mutually exclusive pair, by row state', () => {
    const options: ActionsRendererOptions = {
      actions: exampleActions(),
    };
    const api = apiWith({ permissions: ['DELETE'] });

    const live = resolveActions(source(ROW, api), options).map((a) => a.id);
    expect(live).toEqual(['archive', 'delete']);

    const deleted = resolveActions(source({ ...ROW, isDeleted: true }, api), options).map((a) => a.id);
    expect(deleted).toEqual(['unarchive', 'delete']);
  });

  it('reads permissions from the grid context, not the row', () => {
    // The row carries no permission field; this is exactly what `context` is
    // for, and it must reach a predicate unchanged.
    const options: ActionsRendererOptions = { actions: exampleActions() };
    expect(resolveActions(source(ROW, apiWith({ permissions: [] })), options).map((a) => a.id))
      .toEqual(['archive']);
  });

  it('hands an empty context to a grid that declared none, rather than undefined', () => {
    let seen: CellActionParams | null = null;
    resolveActions(source(ROW, {}), {
      actions: [{ id: 'x', label: 'X', visible: (p) => { seen = p; return true; } }],
    });
    expect(seen!.context).toEqual({});
  });

  it('resolves label, variant, icon and tooltip per row', () => {
    const resolved = resolveAction(
      {
        id: 'toggle',
        label: (p) => (p.row['isDeleted'] ? 'Restore' : 'Archive'),
        variant: (p) => (p.row['isDeleted'] ? 'success' : 'warning'),
        icon: (p) => (p.row['isDeleted'] ? 'refresh' : 'ban'),
        tooltip: (p) => `On ${String(p.row['name'])}`,
      },
      source(),
      { actions: [] },
    );

    expect(resolved).toMatchObject({
      label: 'Archive',
      variant: 'warning',
      tooltip: 'On Aurora Monitor',
      icon: { name: 'ban' },
    });
  });

  it('defaults an action to a visible, enabled, secondary one', () => {
    expect(resolveAction({ id: 'x', label: 'X' }, source(), { actions: [] })).toMatchObject({
      variant: 'secondary',
      disabled: false,
      tooltip: '',
    });
  });

  it('keeps a disabled action, and drops it only when the column says so', () => {
    const action: GridAction = { id: 'x', label: 'X', disabled: true };
    expect(resolveAction(action, source(), { actions: [action] })?.disabled).toBe(true);
    expect(resolveAction(action, source(), { actions: [action], hideDisabled: true })).toBeNull();
  });

  it('never leaves a control unnamed', () => {
    // An icon-only button with no accessible name is unreachable for a screen
    // reader — the id is a poor name but an honest one.
    expect(resolveAction({ id: 'purge' }, source(), { actions: [] })?.ariaLabel).toBe('purge');
    expect(resolveAction({ id: 'purge', label: 'Purge' }, source(), { actions: [] })?.ariaLabel)
      .toBe('Purge');
    expect(
      resolveAction({ id: 'p', label: 'Purge', ariaLabel: (a) => `Purge ${String(a.row['name'])}` },
        source(), { actions: [] })?.ariaLabel,
    ).toBe('Purge Aurora Monitor');
  });

  it('finds a declaration by id, and nothing for an unknown one', () => {
    const options: ActionsRendererOptions = { actions: exampleActions() };
    expect(findAction(options, 'delete')?.id).toBe('delete');
    expect(findAction(options, 'nope')).toBeNull();
  });

  it('drops an action whose predicate throws instead of blanking the row', () => {
    // `render` must not throw: a renderer error blanks the cell and, on a
    // scrolling grid, every row after it. One bad callback loses one action.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    resetActionFailureReports();

    const options: ActionsRendererOptions = {
      actions: [
        { id: 'ok', label: 'OK' },
        // The shape of the reported bug: a context key the host never set.
        { id: 'boom', label: 'Boom', visible: (p) => (p.context['missing'] as string[]).includes('x') },
      ],
    };

    expect(resolveActions(source(), options).map((a) => a.id)).toEqual(['ok']);
    // Dropped, not offered-but-broken: a permission check that could not decide
    // has not granted permission.
    expect(actionIds(render(options))).toEqual(['ok']);
    spy.mockRestore();
  });

  it('reports a failing action once, not once per row', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    resetActionFailureReports();

    const options: ActionsRendererOptions = {
      actions: [{ id: 'boom', label: 'Boom', visible: () => { throw new Error('nope'); } }],
    };
    for (let i = 0; i < 50; i++) resolveActions(source(), options);

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe('layout', () => {
  const three = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ] satisfies GridAction[];

  function split(options: ActionsRendererOptions) {
    return splitActions(resolveActions(source(), options), options);
  }

  it('draws every action as a button by default', () => {
    const el = render({ actions: three });
    expect(actionIds(el)).toEqual(['a', 'b', 'c']);
    expect(el.querySelector(`[${CELL_ACTION_MENU_ATTR}]`)).toBeNull();
  });

  it('puts everything behind one trigger in the menu layout', () => {
    const el = render({ actions: three, layout: 'menu' });
    expect(actionIds(el)).toEqual([]);
    expect(el.querySelector(`[${CELL_ACTION_MENU_ATTR}]`)).not.toBeNull();

    const { inline, overflow } = split({ actions: three, layout: 'menu' });
    expect(inline).toHaveLength(0);
    expect(overflow.map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });

  it('leads with one button in the split layout', () => {
    const el = render({ actions: three, layout: 'split' });
    expect(actionIds(el)).toEqual(['a']);
    expect(el.querySelector(`[${CELL_ACTION_MENU_ATTR}]`)).not.toBeNull();
    expect(split({ actions: three, layout: 'split' }).overflow.map((a) => a.id)).toEqual(['b', 'c']);
  });

  it('overflows past maxVisible', () => {
    const options: ActionsRendererOptions = {
      actions: [...three, { id: 'd', label: 'D' }, { id: 'e', label: 'E' }],
      maxVisible: 2,
    };
    expect(actionIds(render(options))).toEqual(['a', 'b']);
    expect(split(options).overflow.map((a) => a.id)).toEqual(['c', 'd', 'e']);
  });

  it('draws the last action rather than a menu holding one item', () => {
    // A trigger costs the same width as the button it would hide, and a
    // one-item menu is a worse click for the same information.
    const options: ActionsRendererOptions = { actions: three, maxVisible: 2 };
    expect(actionIds(render(options))).toEqual(['a', 'b', 'c']);
    expect(render(options).querySelector(`[${CELL_ACTION_MENU_ATTR}]`)).toBeNull();
  });

  it('counts only the actions a row actually offers', () => {
    // The limit applies after `visible` — hidden actions must not consume a
    // slot and push a real one into the menu.
    const options: ActionsRendererOptions = {
      actions: [{ id: 'a', label: 'A', visible: false }, ...three],
      layout: 'split',
    };
    expect(actionIds(render(options))).toEqual(['a']);
    expect(split(options).inline.map((i) => i.id)).toEqual(['a']);
  });

  it('renders icon, label and variant onto the control', () => {
    const icons = iconRenderer();
    const el = render({ actions: exampleActions() }, ROW, icons, apiWith({ permissions: ['DELETE'] }));

    const [archive, remove] = buttons(el);
    expect(archive.classList.contains('pg-action--warning')).toBe(true);
    expect(archive.querySelector('.pg-action__label')?.textContent).toBe('Archive');
    expect(remove.classList.contains('pg-action--danger')).toBe(true);
    expect(icons.names).toEqual(['ban', 'trash']);
  });

  it('places a suffix icon after the label', () => {
    const el = render(
      { actions: [{ id: 'a', label: 'Open', icon: { name: 'externalLink', position: 'suffix' } }] },
      ROW,
      iconRenderer(),
    );
    const control = buttons(el)[0];
    expect(control.children.map((c) => c.className)).toEqual(['pg-action__label', 'pg-icon']);
  });

  it('drops labels on request, but not from an action with no icon to show', () => {
    const icons = iconRenderer();
    const el = render(
      {
        showLabels: false,
        actions: [
          { id: 'a', label: 'Archive', icon: 'ban' },
          { id: 'b', label: 'Bare' },
        ],
      },
      ROW,
      icons,
    );
    const [withIcon, withoutIcon] = buttons(el);
    // An icon-only button with neither icon nor label renders as an empty box.
    expect(withIcon.querySelector('.pg-action__label')).toBeNull();
    expect(withoutIcon.querySelector('.pg-action__label')?.textContent).toBe('Bare');
    // The label moves into the tooltip so the control is still identifiable.
    expect(withIcon.title).toBe('Archive');
  });

  it('marks a disabled action inert to both pointer and assistive tech', () => {
    const el = render({ actions: [{ id: 'a', label: 'A', disabled: true }] });
    const control = buttons(el)[0];
    expect(control.disabled).toBe(true);
    expect(control.getAttribute('aria-disabled')).toBe('true');
  });

  it('groups the controls and keeps them out of the tab order', () => {
    // The grid owns focus through its roving cell model; a tab stop per action
    // per row would put thousands of them in the tab order.
    const el = render({ actions: three, groupLabel: 'Invoice actions' });
    const root = el.querySelector('.pg-actions');
    expect(root?.getAttribute('role')).toBe('group');
    expect(root?.getAttribute('aria-label')).toBe('Invoice actions');
    expect(buttons(el).every((b) => b.tabIndex === -1)).toBe(true);
  });

  it('applies size and alignment as classes, not inline styles', () => {
    const root = render({ actions: three, size: 'md', align: 'end' }).querySelector('.pg-actions');
    expect(root?.classList.contains('pg-actions--md')).toBe(true);
    expect(root?.classList.contains('pg-actions--end')).toBe(true);
  });

  it('keeps the cell occupied when a row offers nothing', () => {
    // A collapsed cell would drop the row's columns out of alignment.
    const el = render({ actions: [{ id: 'a', label: 'A', visible: false }], emptyText: '—' });
    expect(el.children).toHaveLength(1);
    expect(el.children[0].textContent).toBe('—');
    expect(el.querySelector('.pg-actions')).toBeNull();
  });

  it('survives a column that declares no actions at all', () => {
    expect(render({ actions: [] }).children.length).toBeGreaterThan(0);
  });

  it('exposes the overflow trigger as a menu button', () => {
    const trigger = render({ actions: three, layout: 'menu', menuLabel: 'More' })
      .querySelector(`[${CELL_ACTION_MENU_ATTR}]`);
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.getAttribute('aria-label')).toBe('More');
  });

  it('falls back to a count on the trigger when no icon renderer is available', () => {
    const trigger = render({ actions: three, layout: 'menu' })
      .querySelector(`[${CELL_ACTION_MENU_ATTR}]`);
    expect(trigger?.textContent).toBe('3');
  });
});

describe('execution', () => {
  function params(action: GridAction, overrides: Partial<CellActionParams> = {}): CellActionParams {
    return {
      action,
      id: action.id,
      row: ROW,
      node: null,
      rowIndex: 0,
      value: 'r-1',
      colDef: { colId: 'actions', field: 'actions', header: 'A', type: 'string' } as ColumnDef,
      api: null,
      context: {},
      event: null,
      actions: { close: () => undefined, refresh: () => undefined, setLoading: () => undefined },
      ...overrides,
    };
  }

  it('runs an unconfirmed action and reports it as run', async () => {
    const onClick = vi.fn();
    const action: GridAction = { id: 'a', label: 'A', onClick };
    await expect(runCellAction({ action, params: params(action) })).resolves.toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('runs an action with no handler at all, for event-bus-only columns', async () => {
    const onRun = vi.fn();
    const action: GridAction = { id: 'a', label: 'A' };
    await expect(runCellAction({ action, params: params(action), onRun })).resolves.toBe(true);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('gates the handler behind a confirmation', async () => {
    const onClick = vi.fn();
    const onRun = vi.fn();
    const action: GridAction = {
      id: 'delete',
      label: 'Delete',
      variant: 'danger',
      confirm: { title: 'Delete item?', message: 'This action cannot be undone' },
      onClick,
    };

    const dismissed = await runCellAction({
      action, params: params(action), onRun, confirmHandler: () => false,
    });
    expect(dismissed).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
    // A dismissal is not a command, so nothing is reported either.
    expect(onRun).not.toHaveBeenCalled();

    await runCellAction({ action, params: params(action), onRun, confirmHandler: () => true });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('hands the confirmation resolved text, and infers danger from the variant', async () => {
    let request: CellActionConfirmRequest | null = null;
    const action: GridAction = {
      id: 'delete',
      label: 'Delete',
      variant: 'danger',
      confirm: {
        title: 'Delete item?',
        message: (p) => `Delete ${String(p.row['name'])}?`,
      },
    };

    await runCellAction({
      action,
      params: params(action),
      confirmHandler: (r) => { request = r; return true; },
    });

    expect(request).toMatchObject({
      title: 'Delete item?',
      message: 'Delete Aurora Monitor?',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      // Not declared: an irreversible action should not have to say so twice.
      danger: true,
    });
  });

  it('awaits an async handler with the control busy, then releases it', async () => {
    const cell = new StubElement('div');
    const trigger = new StubElement('button');
    cell.appendChild(trigger);

    let release!: () => void;
    const action: GridAction = {
      id: 'a',
      label: 'A',
      onClick: () => new Promise<void>((resolve) => { release = resolve; }),
    };

    const running = runCellAction({
      action,
      params: params(action),
      trigger: trigger as unknown as HTMLElement,
    });

    // Disabled as well as marked: a second press while the first is in flight
    // is the failure this state exists to prevent.
    expect(trigger.classList.contains('pg-action--busy')).toBe(true);
    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute('aria-busy')).toBe('true');

    release();
    await running;

    expect(trigger.classList.contains('pg-action--busy')).toBe(false);
    expect(trigger.disabled).toBe(false);
  });

  it('leaves a control alone once its row has been repainted out from under it', async () => {
    const cell = new StubElement('div');
    const trigger = new StubElement('button');
    cell.appendChild(trigger);

    let release!: () => void;
    const action: GridAction = {
      id: 'a',
      label: 'A',
      onClick: () => new Promise<void>((resolve) => { release = resolve; }),
    };

    const running = runCellAction({
      action, params: params(action), trigger: trigger as unknown as HTMLElement,
    });
    // The repaint that recycles the element happens while the work is in flight.
    trigger.remove();
    release();
    await running;

    expect(trigger.disabled).toBe(true);
  });

  it('reports a rejection instead of leaving it unhandled', async () => {
    const onError = vi.fn();
    const boom = new Error('server said no');
    const action: GridAction = { id: 'a', label: 'A', onClick: () => Promise.reject(boom) };

    await expect(runCellAction({ action, params: params(action), onError })).resolves.toBe(true);
    expect(onError).toHaveBeenCalledWith(boom);
  });

  it('reports a synchronous throw the same way as a rejection', async () => {
    const onError = vi.fn();
    const boom = new Error('bad state');
    const action: GridAction = { id: 'a', label: 'A', onClick: () => { throw boom; } };

    await runCellAction({ action, params: params(action), onError });
    expect(onError).toHaveBeenCalledWith(boom);
  });

  it('toggles the busy state on demand, for work that is not a promise', () => {
    const trigger = new StubElement('button');
    setActionBusy(trigger as unknown as HTMLElement, true);
    expect(trigger.disabled).toBe(true);
    setActionBusy(trigger as unknown as HTMLElement, false);
    expect(trigger.disabled).toBe(false);
    // A missing trigger is not an error — an action invoked from a keyboard
    // shortcut has no control to mark.
    expect(() => setActionBusy(null, true)).not.toThrow();
  });
});
