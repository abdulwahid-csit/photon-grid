import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { DetailComponentHost, type DetailComponentHostDeps } from '../../src/renderer/detail-component-host';
import type { MasterDetailEngine } from '../../src/engines/master-detail/master-detail-engine';
import type { GridApi } from '../../src/core/grid-api';
import type { MasterDetailConfig } from '../../src/types/master-detail.types';
import type { DetailComponent, DetailContext, DetailEvent } from '../../src/types/detail-component.types';
import type { RowNode } from '../../src/types/row.types';
import { installDomStub, runFrames, StubElement } from './dom-stub';

/**
 * Contract for custom detail component rendering (`masterDetail.renderer`).
 *
 * The guarantees worth pinning down are the ones a naive implementation gets
 * wrong and nobody notices until a user complains:
 *
 * 1. **The component is created once.** Re-expanding a cached row, or a props
 *    refresh the component handles itself, must not tear down and rebuild —
 *    that is the whole point of a lifecycle over a plain `detailRendererFn`.
 * 2. **The context stays live.** A component holds its context for its whole
 *    lifetime, so `data`/`props` must read through to current state rather
 *    than freeze at mount.
 * 3. **Consumer code cannot break the grid.** A handler or a `destroy()` that
 *    throws is contained: `emit` still reaches the bus, teardown still
 *    completes.
 * 4. **Heights are content heights.** Every path adds the container's padding
 *    exactly once, and an explicit size outranks a measured one.
 */

const VERTICAL_PADDING = 40;

const MASTER_ROW: RowNode = {
  nodeId: 'acct-1',
  rowIndex: 0,
  data: { id: 1, name: 'Acme', orderCount: 3 },
  type: 'data',
  selected: false,
  expanded: true,
  editable: true,
  level: 0,
  parent: null,
  children: [],
  height: 32,
  top: 0,
};

function detailNode(parent: RowNode = MASTER_ROW): RowNode {
  return { ...parent, nodeId: `detail_${parent.nodeId}`, type: 'detail', parent, parentNodeId: parent.nodeId, height: 200 };
}

/** The stub is structurally narrower than `HTMLElement`; the host only touches the slice it implements. */
function el(tag: string): HTMLElement {
  return new StubElement(tag) as unknown as HTMLElement;
}

/** Stub-typed view of an element the host built, for asserting on class lists and children. */
function asStub(node: HTMLElement): StubElement {
  return node as unknown as StubElement;
}

interface Harness {
  deps: DetailComponentHostDeps;
  container: StubElement;
  setHeight: ReturnType<typeof vi.fn>;
  emitted: DetailEvent[];
  collapsed: string[];
  rows: Map<string, RowNode>;
  /** The `.pg-detail-component-host` wrapper, once a host has mounted into the container. */
  hostEl(): StubElement | null;
}

function harness(config: Partial<MasterDetailConfig>): Harness {
  const full: MasterDetailConfig = { enabled: true, ...config };
  const setHeight = vi.fn();
  const emitted: DetailEvent[] = [];
  const collapsed: string[] = [];
  const rows = new Map<string, RowNode>([[MASTER_ROW.nodeId, MASTER_ROW]]);

  const engine = {
    getConfig: () => full,
    setDetailHeight: setHeight,
    getCachedDetailData: () => undefined,
    emitDetailEvent: (e: DetailEvent) => void emitted.push(e),
  } as unknown as MasterDetailEngine;

  const api = { getRowNode: (id: string) => rows.get(id) } as unknown as GridApi;
  const container = new StubElement('div');

  return {
    deps: { engine, api, collapse: (id) => void collapsed.push(id), verticalPadding: VERTICAL_PADDING },
    container,
    setHeight,
    emitted,
    collapsed,
    rows,
    hostEl: () => container.querySelector('.pg-detail-component-host'),
  };
}

function mountHost(h: Harness, autoHeight = true, row: RowNode = detailNode()): DetailComponentHost {
  const host = new DetailComponentHost(h.deps, row, h.container as unknown as HTMLElement, autoHeight);
  host.mount();
  return host;
}

/** Records every lifecycle call so tests can assert on creation count, not just final state. */
class TrackedComponent implements DetailComponent {
  static instances: TrackedComponent[] = [];
  /** When false, `refresh` declines the in-place update and the host must re-create. */
  static handlesRefresh = true;

  initCalls = 0;
  refreshCalls = 0;
  destroyCalls = 0;
  lastProps: unknown = null;
  ctx!: DetailContext;
  readonly el = el('section');

  constructor() {
    TrackedComponent.instances.push(this);
  }

  init(ctx: DetailContext): HTMLElement {
    this.ctx = ctx;
    this.initCalls++;
    this.lastProps = ctx.props;
    this.el.className = 'tracked';
    return this.el;
  }

  refresh(ctx: DetailContext): boolean {
    this.refreshCalls++;
    this.lastProps = ctx.props;
    return TrackedComponent.handlesRefresh;
  }

  destroy(): void {
    this.destroyCalls++;
  }
}

/** The single mounted instance — every test that uses `TrackedComponent` creates exactly one unless it asserts otherwise. */
function tracked(index = 0): TrackedComponent {
  const instance = TrackedComponent.instances[index];
  if (!instance) throw new Error(`No TrackedComponent at index ${index}`);
  return instance;
}

let teardownDom: () => void;

beforeEach(() => {
  teardownDom = installDomStub();
  TrackedComponent.instances = [];
  TrackedComponent.handlesRefresh = true;
});

afterEach(() => {
  teardownDom();
});

describe('DetailComponentHost — renderer forms', () => {
  it('constructs a class renderer and mounts the element its init returns', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);

    expect(TrackedComponent.instances).toHaveLength(1);
    expect(tracked().initCalls).toBe(1);
    expect(h.hostEl()!.children).toContain(asStub(tracked().el));
  });

  it('calls a function renderer and mounts its returned element', () => {
    const renderer = vi.fn((ctx: DetailContext) => {
      const node = el('p');
      node.textContent = String((ctx.data as { name: string }).name);
      return node;
    });
    const h = harness({ renderer });
    mountHost(h);

    expect(renderer).toHaveBeenCalledTimes(1);
    expect(h.hostEl()!.textContent).toBe('Acme');
  });

  it('accepts a function renderer that writes into ctx.containerEl and returns nothing', () => {
    const h = harness({
      renderer: (ctx: DetailContext) => {
        ctx.containerEl.appendChild(el('hr'));
      },
    });
    mountHost(h);

    expect(h.hostEl()!.querySelector('hr')).not.toBeNull();
  });

  it('mounts a static HTML string, so the simplest renderer needs no function at all', () => {
    const h = harness({ renderer: '<h2>Custom Detail Renderer</h2>' });
    mountHost(h);

    // The stub does not parse markup — `textContent` reads back exactly what
    // was written to `innerHTML`, which is the assertion that matters here.
    expect(h.hostEl()!.textContent).toBe('<h2>Custom Detail Renderer</h2>');
  });

  it('mounts the HTML string a function renderer returns', () => {
    const h = harness({
      renderer: (ctx: DetailContext) => `<h2>${String((ctx.data as { name: string }).name)}</h2>`,
    });
    mountHost(h);

    expect(h.hostEl()!.textContent).toBe('<h2>Acme</h2>');
  });

  it('mounts the HTML string a component returns from init', () => {
    class StringComponent implements DetailComponent {
      init(): string {
        return '<p>from init</p>';
      }
    }
    const h = harness({ renderer: StringComponent });
    mountHost(h);

    expect(h.hostEl()!.textContent).toBe('<p>from init</p>');
  });

  it('falls back to getElement() when init returns nothing', () => {
    const root = el('article');
    class GetElementComponent implements DetailComponent {
      init(): void {
        /* defers its own rendering */
      }
      getElement(): HTMLElement {
        return root;
      }
    }
    const h = harness({ renderer: GetElementComponent });
    mountHost(h);

    expect(h.hostEl()!.children).toContain(asStub(root));
  });

  it('mounts at most once, so a retried sync() cannot double-create', () => {
    const h = harness({ renderer: TrackedComponent });
    const host = mountHost(h);

    host.mount();

    expect(TrackedComponent.instances).toHaveLength(1);
  });

  it('marks the host element as filling the row when auto-height is off', () => {
    const h = harness({ renderer: TrackedComponent, detailAutoHeight: false });
    mountHost(h, false);

    expect(h.hostEl()!.classList.contains('pg-detail-component-host--fill')).toBe(true);
  });
});

describe('DetailComponentHost — context', () => {
  it('exposes resolved props, master row data, and the parent api', () => {
    const h = harness({
      renderer: TrackedComponent,
      props: (ctx) => ({ label: (ctx.data as { name: string }).name }),
    });
    mountHost(h);

    const ctx = tracked().ctx;
    expect(ctx.props).toEqual({ label: 'Acme' });
    expect(ctx.nodeId).toBe('acct-1');
    expect(ctx.rowNode).toBe(MASTER_ROW);
    expect(ctx.api).toBe(h.deps.api);
  });

  it('defaults props to an empty object when masterDetail.props is omitted', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);

    expect(tracked().ctx.props).toEqual({});
  });

  it('reads data through to the live row model rather than a mount-time snapshot', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);

    h.rows.set(MASTER_ROW.nodeId, { ...MASTER_ROW, data: { id: 1, name: 'Renamed' } });

    expect((tracked().ctx.data as { name: string }).name).toBe('Renamed');
  });

  it('falls back to the detail node’s captured parent when the master row leaves the model', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);

    h.rows.clear();

    expect(tracked().ctx.rowNode).toBe(MASTER_ROW);
  });

  it('re-points a reused host at the current pipeline node via setRow, without re-creating', () => {
    const h = harness({ renderer: TrackedComponent });
    const host = mountHost(h);

    const replacement: RowNode = { ...MASTER_ROW, data: { id: 1, name: 'Second run' } };
    h.rows.clear();
    host.setRow(detailNode(replacement));

    expect((tracked().ctx.data as { name: string }).name).toBe('Second run');
    expect(TrackedComponent.instances).toHaveLength(1);
  });

  it('routes ctx.collapse() through the host deps', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);

    tracked().ctx.collapse();

    expect(h.collapsed).toEqual(['acct-1']);
  });
});

describe('DetailComponentHost — events', () => {
  it('invokes the matching masterDetail.events handler with master-row context', () => {
    const save = vi.fn();
    const h = harness({ renderer: TrackedComponent, events: { save } });
    mountHost(h);

    tracked().ctx.emit('save', { ref: 'ORD-1' });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0]).toMatchObject({
      type: 'save',
      payload: { ref: 'ORD-1' },
      nodeId: 'acct-1',
      data: MASTER_ROW.data,
    });
  });

  it('supports arbitrary event names with no registration step', () => {
    const custom = vi.fn();
    const h = harness({ renderer: TrackedComponent, events: { anythingAtAll: custom } });
    mountHost(h);

    tracked().ctx.emit('anythingAtAll');

    expect(custom.mock.calls[0]![0]).toMatchObject({ type: 'anythingAtAll', payload: undefined });
  });

  it('re-publishes every emit on the grid event bus, handler or not', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);

    tracked().ctx.emit('unhandled', 7);

    expect(h.emitted).toHaveLength(1);
    expect(h.emitted[0]).toMatchObject({ type: 'unhandled', payload: 7 });
  });

  it('contains a throwing handler so a component listener can never break a render', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const h = harness({
      renderer: TrackedComponent,
      events: {
        save: () => {
          throw new Error('consumer bug');
        },
      },
    });
    mountHost(h);

    expect(() => tracked().ctx.emit('save')).not.toThrow();
    expect(h.emitted).toHaveLength(1);
    spy.mockRestore();
  });

  it('stops emitting once destroyed, so a stale listener cannot fire handlers', () => {
    const save = vi.fn();
    const h = harness({ renderer: TrackedComponent, events: { save } });
    const host = mountHost(h);
    const ctx = tracked().ctx;

    host.destroy();
    ctx.emit('save');

    expect(save).not.toHaveBeenCalled();
    expect(h.emitted).toHaveLength(0);
  });
});

describe('DetailComponentHost — refresh', () => {
  it('re-resolves props and updates in place when the component handles it', () => {
    let label = 'first';
    const h = harness({ renderer: TrackedComponent, props: () => ({ label }) });
    mountHost(h);

    label = 'second';
    tracked().ctx.refresh();

    expect(tracked().refreshCalls).toBe(1);
    expect(tracked().destroyCalls).toBe(0);
    expect(TrackedComponent.instances).toHaveLength(1);
    expect(tracked().lastProps).toEqual({ label: 'second' });
  });

  it('destroys and re-creates when the component declines the in-place update', () => {
    TrackedComponent.handlesRefresh = false;
    const h = harness({ renderer: TrackedComponent });
    const host = mountHost(h);

    host.refresh();

    expect(TrackedComponent.instances).toHaveLength(2);
    expect(tracked(0).destroyCalls).toBe(1);
    expect(h.hostEl()!.children).toHaveLength(1); // old DOM cleared, not stacked
  });

  it('re-runs a function renderer, which has no in-place hook to offer', () => {
    const renderer = vi.fn(() => el('span'));
    const h = harness({ renderer });
    const host = mountHost(h);

    host.refresh();

    expect(renderer).toHaveBeenCalledTimes(2);
    expect(h.hostEl()!.children).toHaveLength(1);
  });

  it('re-renders a string renderer against the current props', () => {
    let label = 'first';
    const h = harness({ renderer: () => `<p>${label}</p>` });
    const host = mountHost(h);

    label = 'second';
    host.refresh();

    expect(h.hostEl()!.textContent).toBe('<p>second</p>');
  });

  it('is inert after destroy', () => {
    const h = harness({ renderer: TrackedComponent });
    const host = mountHost(h);
    host.destroy();

    host.refresh();

    expect(TrackedComponent.instances).toHaveLength(1);
    expect(tracked().refreshCalls).toBe(0);
  });
});

describe('DetailComponentHost — height', () => {
  it('adds the container padding to an explicit content height exactly once', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);

    tracked().ctx.updateHeight(300);

    expect(h.setHeight).toHaveBeenCalledWith('acct-1', 300 + VERTICAL_PADDING);
  });

  it('ignores a repeat of the height it already applied', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);

    tracked().ctx.updateHeight(300);
    tracked().ctx.updateHeight(300);

    expect(h.setHeight).toHaveBeenCalledTimes(1);
  });

  it('measures the rendered content when updateHeight is called with no argument', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);
    h.hostEl()!.scrollHeight = 180;

    tracked().ctx.updateHeight();

    expect(h.setHeight).toHaveBeenCalledWith('acct-1', 180 + VERTICAL_PADDING);
  });

  it('auto-measures on the frame after mount', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);
    h.hostEl()!.scrollHeight = 250;

    runFrames();

    expect(h.setHeight).toHaveBeenCalledWith('acct-1', 250 + VERTICAL_PADDING);
  });

  it('lets an explicit height outrank later auto-measurement', () => {
    const h = harness({ renderer: TrackedComponent });
    mountHost(h);

    tracked().ctx.updateHeight(300);
    h.hostEl()!.scrollHeight = 999;
    runFrames();

    expect(h.setHeight).toHaveBeenCalledTimes(1);
    expect(h.setHeight).toHaveBeenCalledWith('acct-1', 340);
  });

  it('never measures when auto-height is off, so a fixed or resizable row keeps its size', () => {
    const h = harness({ renderer: TrackedComponent, detailAutoHeight: false });
    mountHost(h, false);
    h.hostEl()!.scrollHeight = 250;

    runFrames();

    expect(h.setHeight).not.toHaveBeenCalled();
  });

  it('does not measure after destroy, so a queued frame cannot resurrect a dead row', () => {
    const h = harness({ renderer: TrackedComponent });
    const host = mountHost(h);
    h.hostEl()!.scrollHeight = 250;

    host.destroy();
    runFrames();

    expect(h.setHeight).not.toHaveBeenCalled();
  });
});

describe('DetailComponentHost — teardown', () => {
  it('destroys the component and removes its DOM', () => {
    const h = harness({ renderer: TrackedComponent });
    const host = mountHost(h);

    host.destroy();

    expect(tracked().destroyCalls).toBe(1);
    expect(h.hostEl()).toBeNull();
  });

  it('is idempotent, so a double teardown cannot double-destroy a component', () => {
    const h = harness({ renderer: TrackedComponent });
    const host = mountHost(h);

    host.destroy();
    host.destroy();

    expect(tracked().destroyCalls).toBe(1);
  });

  it('completes teardown even when the component destroy() throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    class ExplodingComponent implements DetailComponent {
      init(): HTMLElement {
        return el('div');
      }
      destroy(): void {
        throw new Error('consumer bug');
      }
    }
    const h = harness({ renderer: ExplodingComponent });
    const host = mountHost(h);

    expect(() => host.destroy()).not.toThrow();
    expect(h.hostEl()).toBeNull();
    spy.mockRestore();
  });
});
