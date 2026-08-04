import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PluginHost } from '../../src/plugins/plugin-host';
import type { PluginRendererSeam } from '../../src/plugins/plugin-host';
import type { GridPlugin, PluginContext, RenderWindow } from '../../src/plugins/plugin.types';
import type { GridApi } from '../../src/core/grid-api';
import type { GridContext } from '../../src/core/grid-context';

/**
 * The host's contract is almost entirely about *containment* — a plugin is
 * third-party code running inside the grid's render loop, and the interesting
 * behaviour is what happens when it misbehaves. These tests are therefore
 * mostly failure-path.
 *
 * Pure `node` environment: the host touches no DOM beyond delegating
 * `mountLayer` to the renderer seam, which is stubbed here.
 */

function makeCtx(): GridContext {
  const emit = vi.fn();
  return {
    eventBus: { emit } as unknown as GridContext['eventBus'],
    containerEl: {
      getAttribute: (name: string) => (name === 'data-photon-grid-id' ? 'pg-1' : null),
    } as unknown as HTMLElement,
  } as unknown as GridContext;
}

function makeSeam(): PluginRendererSeam & { layers: string[] } {
  const layers: string[] = [];
  return {
    layers,
    mountPluginLayer: (name: string) => {
      layers.push(name);
      return {} as HTMLElement;
    },
    readScrollMetrics: () => ({
      scrollTop: 0, scrollLeft: 0, viewportHeight: 0,
      viewportWidth: 0, contentHeight: 0, contentWidth: 0,
    }),
    scheduleRender: vi.fn(),
    addScrollListener: () => () => {},
  };
}

const WINDOW = {
  startIndex: 0, endIndex: 0, rowOriginY: 0, rows: [], rowHeight: 40,
  leftPinnedWidth: 0, rightPinnedWidth: 0,
  scroll: {
    scrollTop: 0, scrollLeft: 0, viewportHeight: 0,
    viewportWidth: 0, contentHeight: 0, contentWidth: 0,
  },
  frame: 1,
} as RenderWindow;

/** Minimal plugin whose every phase is observable. */
function makePlugin(id: string, overrides: Partial<GridPlugin> = {}): GridPlugin & {
  calls: string[];
  ctx: PluginContext | null;
} {
  const calls: string[] = [];
  const plugin = {
    id,
    calls,
    ctx: null as PluginContext | null,
    init(ctx: PluginContext) { calls.push('init'); plugin.ctx = ctx; },
    destroy() { calls.push('destroy'); },
    onRenderWindow() { calls.push('frame'); },
    ...overrides,
  };
  return plugin as GridPlugin & { calls: string[]; ctx: PluginContext | null };
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

describe('PluginHost lifecycle', () => {
  it('initializes plugins in declaration order and destroys them in reverse', () => {
    const order: string[] = [];
    const a = makePlugin('a', { init: () => { order.push('init:a'); }, destroy: () => { order.push('destroy:a'); } });
    const b = makePlugin('b', { init: () => { order.push('init:b'); }, destroy: () => { order.push('destroy:b'); } });

    const host = new PluginHost(makeCtx(), {} as GridApi, [a, b], makeSeam());
    host.initAll();
    host.destroyAll();

    // Reverse teardown: a plugin others may depend on goes last.
    expect(order).toEqual(['init:a', 'init:b', 'destroy:b', 'destroy:a']);
  });

  it('delivers render windows only to plugins that implement the hook', () => {
    const withHook = makePlugin('a');
    const withoutHook = makePlugin('b', { onRenderWindow: undefined });

    const host = new PluginHost(makeCtx(), {} as GridApi, [withHook, withoutHook], makeSeam());
    host.initAll();

    expect(host.wantsRenderWindow()).toBe(true);
    host.dispatchRenderWindow(WINDOW);

    expect(withHook.calls).toEqual(['init', 'frame']);
    expect(withoutHook.calls).toEqual(['init']);
  });

  it('reports no render-window interest when nothing subscribes', () => {
    const host = new PluginHost(
      makeCtx(), {} as GridApi, [makePlugin('a', { onRenderWindow: undefined })], makeSeam(),
    );
    host.initAll();

    // Lets the renderer skip building a window object entirely.
    expect(host.wantsRenderWindow()).toBe(false);
  });

  it('rejects a duplicate plugin id rather than letting two fight over one layer', () => {
    const first = makePlugin('dup');
    const second = makePlugin('dup');

    const host = new PluginHost(makeCtx(), {} as GridApi, [first, second], makeSeam());
    host.initAll();

    expect(first.calls).toContain('init');
    expect(second.calls).not.toContain('init');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('is idempotent on destroy', () => {
    const plugin = makePlugin('a');
    const host = new PluginHost(makeCtx(), {} as GridApi, [plugin], makeSeam());

    host.initAll();
    host.destroyAll();
    host.destroyAll();

    expect(plugin.calls.filter((c) => c === 'destroy')).toHaveLength(1);
  });

  it('stops dispatching frames after destroy', () => {
    const plugin = makePlugin('a');
    const host = new PluginHost(makeCtx(), {} as GridApi, [plugin], makeSeam());

    host.initAll();
    host.destroyAll();
    host.dispatchRenderWindow(WINDOW);

    expect(plugin.calls).not.toContain('frame');
  });
});

describe('PluginHost failure containment', () => {
  it('quarantines a plugin that throws in init', () => {
    const bad = makePlugin('bad', {
      init: () => { throw new Error('boom'); },
    });

    const host = new PluginHost(makeCtx(), {} as GridApi, [bad], makeSeam());
    host.initAll();
    host.dispatchRenderWindow(WINDOW);
    host.destroyAll();

    // No frames, and crucially no destroy() — its init only ran partway, so
    // tearing it down would be operating on a half-constructed object.
    expect(bad.calls).not.toContain('frame');
    expect(bad.calls).not.toContain('destroy');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('still initializes siblings when one plugin throws in init', () => {
    const bad = makePlugin('bad', { init: () => { throw new Error('boom'); } });
    const good = makePlugin('good');

    const host = new PluginHost(makeCtx(), {} as GridApi, [bad, good], makeSeam());
    host.initAll();
    host.dispatchRenderWindow(WINDOW);

    expect(good.calls).toEqual(['init', 'frame']);
  });

  it('detaches a plugin that throws during a render window, and logs once', () => {
    let frames = 0;
    const bad = makePlugin('bad', {
      onRenderWindow: () => { frames++; throw new Error('per-frame boom'); },
    });

    const host = new PluginHost(makeCtx(), {} as GridApi, [bad], makeSeam());
    host.initAll();

    host.dispatchRenderWindow(WINDOW);
    host.dispatchRenderWindow(WINDOW);
    host.dispatchRenderWindow(WINDOW);

    // Detached after the first failure — at 60fps the alternative is an
    // unbounded console flood plus a throw every frame.
    expect(frames).toBe(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps delivering frames to healthy plugins after a sibling is detached', () => {
    const bad = makePlugin('bad', {
      onRenderWindow: () => { throw new Error('boom'); },
    });
    const good = makePlugin('good');

    const host = new PluginHost(makeCtx(), {} as GridApi, [bad, good], makeSeam());
    host.initAll();

    host.dispatchRenderWindow(WINDOW);
    host.dispatchRenderWindow(WINDOW);

    expect(good.calls.filter((c) => c === 'frame')).toHaveLength(2);
  });

  it('continues tearing down after a plugin throws in destroy', () => {
    const bad = makePlugin('bad', { destroy: () => { throw new Error('boom'); } });
    const good = makePlugin('good');

    const host = new PluginHost(makeCtx(), {} as GridApi, [good, bad], makeSeam());
    host.initAll();
    host.destroyAll();

    // `bad` is destroyed first (reverse order) and throws; `good` must still run.
    expect(good.calls).toContain('destroy');
  });
});

describe('PluginContext', () => {
  it('namespaces mounted layers by plugin id so two plugins cannot collide', () => {
    const seam = makeSeam();
    const plugin = makePlugin('sched', {
      init: (ctx: PluginContext) => { ctx.mountLayer('events'); },
    });

    new PluginHost(makeCtx(), {} as GridApi, [plugin], seam).initAll();

    expect(seam.layers).toEqual(['sched--events']);
  });

  it('routes plugin events through the shared bus member with the plugin id attached', () => {
    const ctx = makeCtx();
    const emit = ctx.eventBus.emit as unknown as ReturnType<typeof vi.fn>;

    const plugin = makePlugin('sched', {
      init: (pluginCtx: PluginContext) => { pluginCtx.emit('eventMoved', { id: 7 }); },
    });

    new PluginHost(ctx, {} as GridApi, [plugin], makeSeam()).initAll();

    // `GridEventType` is a closed union, so plugin events cannot add members —
    // they travel under one shared member with the origin in the payload.
    expect(emit).toHaveBeenCalledWith('plugin:event', {
      pluginId: 'sched',
      name: 'eventMoved',
      payload: { id: 7 },
    });
  });

  it('runs onDestroy callbacks, newest first, during teardown', () => {
    const order: string[] = [];
    const plugin = makePlugin('a', {
      init: (ctx: PluginContext) => {
        ctx.onDestroy(() => order.push('first'));
        ctx.onDestroy(() => order.push('second'));
      },
    });

    const host = new PluginHost(makeCtx(), {} as GridApi, [plugin], makeSeam());
    host.initAll();
    host.destroyAll();

    expect(order).toEqual(['second', 'first']);
  });

  it('supports unsubscribing a context-registered render-window listener', () => {
    let frames = 0;
    const plugin = makePlugin('a', {
      onRenderWindow: undefined,
      init: (ctx: PluginContext) => {
        const off = ctx.onRenderWindow(() => { frames++; off(); });
      },
    });

    const host = new PluginHost(makeCtx(), {} as GridApi, [plugin], makeSeam());
    host.initAll();

    host.dispatchRenderWindow(WINDOW);
    host.dispatchRenderWindow(WINDOW);

    // Unsubscribing from inside the dispatch must not corrupt the walk.
    expect(frames).toBe(1);
  });
});
