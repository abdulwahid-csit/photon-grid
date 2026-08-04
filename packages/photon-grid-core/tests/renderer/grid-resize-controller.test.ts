// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GridResizeController } from '../../src/renderer/grid-resize-controller';
import {
  GridResizeHandle,
  GridResizeSource,
  type GridResizeConfig,
} from '../../src/types/grid-resize.types';
import { GridEventType } from '../../src/types/event.types';
import { EventBus } from '../../src/event-bus/event-bus';

/**
 * Contract for container resizing.
 *
 * The properties that matter: bounds are always respected however far the
 * pointer travels, the anchored edge of a top/left drag stays put, and every
 * size change — dragged or programmatic — goes through one write path so it
 * cannot skip an event.
 */

/**
 * jsdom reports 0 for every layout box, so the container's rect is stubbed.
 *
 * Deliberately *dynamic*: it reports whatever width/height has been written to
 * the inline style, falling back to the given base. A fixed stub would make
 * every write a measured no-op, which the controller correctly suppresses — so
 * a static stub would hide exactly the event behaviour these specs check.
 */
function stubRect(el: HTMLElement, width: number, height: number): void {
  el.getBoundingClientRect = () => {
    const w = parseFloat(el.style.width) || width;
    const h = parseFloat(el.style.height) || height;
    return { width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
}

let container: HTMLElement;
let wrapper: HTMLElement;
let bus: EventBus;

function build(config: GridResizeConfig = {}): GridResizeController {
  const controller = new GridResizeController(container, bus, config);
  controller.mount(wrapper);
  return controller;
}

/** Drives a full pointer gesture on one handle. */
function drag(handle: GridResizeHandle, dx: number, dy: number): void {
  const el = wrapper.querySelector<HTMLElement>(`[data-pg-resize-handle="${handle}"]`);
  if (!el) throw new Error(`no handle rendered for ${handle}`);

  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 100, clientY: 100, bubbles: true }));
  window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy }));
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy }));
}

beforeEach(() => {
  document.body.innerHTML = '';
  container = document.createElement('div');
  wrapper = document.createElement('div');
  wrapper.className = 'pg-grid';
  container.appendChild(wrapper);
  document.body.appendChild(container);
  stubRect(container, 800, 400);
  bus = new EventBus();
});

describe('GridResizeController — handles', () => {
  it('mounts the bottom-right L by default', () => {
    build();
    const mounted = [...wrapper.querySelectorAll('[data-pg-resize-handle]')]
      .map((el) => el.getAttribute('data-pg-resize-handle'));
    expect(mounted.sort()).toEqual(['bottom', 'bottomRight', 'right']);
  });

  it('mounts nothing when disabled, and marks the wrapper accordingly', () => {
    build({ enabled: false });
    expect(wrapper.querySelectorAll('[data-pg-resize-handle]')).toHaveLength(0);
    expect(wrapper.classList.contains('pg-grid--resizable')).toBe(false);
  });

  it('mounts exactly the configured handles', () => {
    build({ handles: [GridResizeHandle.Left, GridResizeHandle.TopRight] });
    const mounted = [...wrapper.querySelectorAll('[data-pg-resize-handle]')]
      .map((el) => el.getAttribute('data-pg-resize-handle'));
    expect(mounted.sort()).toEqual(['left', 'topRight']);
  });

  it('adds and removes handles on a config update without touching the survivors', () => {
    const controller = build({ handles: [GridResizeHandle.Right, GridResizeHandle.Bottom] });
    const right = wrapper.querySelector('[data-pg-resize-handle="right"]');

    controller.updateConfig({ handles: [GridResizeHandle.Right, GridResizeHandle.Left] });

    expect(wrapper.querySelector('[data-pg-resize-handle="bottom"]')).toBeNull();
    expect(wrapper.querySelector('[data-pg-resize-handle="left"]')).not.toBeNull();
    // Untouched handles keep their element, so a config change mid-hover does
    // not flicker the affordance under the pointer.
    expect(wrapper.querySelector('[data-pg-resize-handle="right"]')).toBe(right);
  });

  it('setEnabled toggles handles without discarding the configuration', () => {
    const controller = build({ handles: [GridResizeHandle.Left] });
    controller.setEnabled(false);
    expect(wrapper.querySelectorAll('[data-pg-resize-handle]')).toHaveLength(0);

    controller.setEnabled(true);
    expect(wrapper.querySelector('[data-pg-resize-handle="left"]')).not.toBeNull();
  });

  it('drops handles for a locked axis but keeps corners that still drive the free one', () => {
    build({
      handles: [GridResizeHandle.Right, GridResizeHandle.Bottom, GridResizeHandle.BottomRight],
      lockWidth: true,
    });
    const mounted = [...wrapper.querySelectorAll('[data-pg-resize-handle]')]
      .map((el) => el.getAttribute('data-pg-resize-handle'));
    // `right` is width-only → gone. `bottomRight` still changes height → kept.
    expect(mounted.sort()).toEqual(['bottom', 'bottomRight']);
  });

  it('publishes the configured handle size as a CSS variable', () => {
    build({ handleSize: 14 });
    expect(wrapper.style.getPropertyValue('--pg-resize-handle-size')).toBe('14px');
  });
});

describe('GridResizeController — dragging', () => {
  it('grows width and height from a bottom-right drag', () => {
    build({ handles: [GridResizeHandle.BottomRight] });
    drag(GridResizeHandle.BottomRight, 120, 60);
    expect(container.style.width).toBe('920px');
    expect(container.style.height).toBe('460px');
  });

  it('inverts the delta for a left drag, so dragging left grows the grid', () => {
    build({ handles: [GridResizeHandle.Left] });
    drag(GridResizeHandle.Left, -100, 0);
    expect(container.style.width).toBe('900px');
  });

  it('compensates margin on a left drag so the right edge stays put', () => {
    build({ handles: [GridResizeHandle.Left] });
    drag(GridResizeHandle.Left, -100, 0);
    // Width grew by 100, so the origin moves 100 left to keep the far edge fixed.
    expect(container.style.marginLeft).toBe('-100px');
  });

  it('compensates margin on a top drag so the bottom edge stays put', () => {
    build({ handles: [GridResizeHandle.Top] });
    drag(GridResizeHandle.Top, 0, -50);
    expect(container.style.marginTop).toBe('-50px');
  });

  it('leaves margins alone for bottom/right drags', () => {
    build({ handles: [GridResizeHandle.BottomRight] });
    drag(GridResizeHandle.BottomRight, 50, 50);
    expect(container.style.marginLeft).toBe('');
    expect(container.style.marginTop).toBe('');
  });

  it('clamps to the minimum however far the pointer travels', () => {
    build({ handles: [GridResizeHandle.BottomRight], minWidth: 300, minHeight: 200 });
    drag(GridResizeHandle.BottomRight, -5000, -5000);
    expect(container.style.width).toBe('300px');
    expect(container.style.height).toBe('200px');
  });

  it('clamps to the maximum', () => {
    build({ handles: [GridResizeHandle.BottomRight], maxWidth: 900, maxHeight: 500 });
    drag(GridResizeHandle.BottomRight, 5000, 5000);
    expect(container.style.width).toBe('900px');
    expect(container.style.height).toBe('500px');
  });

  it('applies the default minimum when none is configured', () => {
    build({ handles: [GridResizeHandle.Right] });
    drag(GridResizeHandle.Right, -5000, 0);
    expect(container.style.width).toBe('240px');
  });

  it('snaps to the configured step', () => {
    build({ handles: [GridResizeHandle.Right], step: 50 });
    drag(GridResizeHandle.Right, 137, 0);
    // 800 + 137 = 937 → nearest multiple of 50.
    expect(container.style.width).toBe('950px');
  });

  it('only changes the axis its handle drives', () => {
    build({ handles: [GridResizeHandle.Right] });
    drag(GridResizeHandle.Right, 100, 100);
    expect(container.style.width).toBe('900px');
    expect(container.style.height).toBe('');
  });

  it('ignores a locked axis mid-drag', () => {
    build({ handles: [GridResizeHandle.BottomRight], lockWidth: true });
    drag(GridResizeHandle.BottomRight, 100, 100);
    expect(container.style.width).toBe('');
    expect(container.style.height).toBe('500px');
  });

  it('ignores non-primary buttons', () => {
    build({ handles: [GridResizeHandle.Right] });
    const el = wrapper.querySelector<HTMLElement>('[data-pg-resize-handle="right"]')!;
    el.dispatchEvent(new PointerEvent('pointerdown', { button: 2, pointerId: 1, clientX: 0, clientY: 0, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 500, clientY: 0 }));
    expect(container.style.width).toBe('');
  });

  it('ignores moves from a different pointer', () => {
    build({ handles: [GridResizeHandle.Right] });
    const el = wrapper.querySelector<HTMLElement>('[data-pg-resize-handle="right"]')!;
    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 100, clientY: 0, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 99, clientX: 400, clientY: 0 }));
    expect(container.style.width).toBe('');
  });

  it('marks the wrapper while dragging and clears it on release', () => {
    build({ handles: [GridResizeHandle.Right] });
    const el = wrapper.querySelector<HTMLElement>('[data-pg-resize-handle="right"]')!;
    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 0, clientY: 0, bubbles: true }));
    expect(wrapper.classList.contains('pg-grid--resizing')).toBe(true);

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 0, clientY: 0 }));
    expect(wrapper.classList.contains('pg-grid--resizing')).toBe(false);
  });

  it('stops tracking after release, so a later move does not resize', () => {
    build({ handles: [GridResizeHandle.Right] });
    drag(GridResizeHandle.Right, 100, 0);
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 5000, clientY: 0 }));
    expect(container.style.width).toBe('900px');
  });

  it('reports isResizing only for the duration of the gesture', () => {
    const controller = build({ handles: [GridResizeHandle.Right] });
    expect(controller.isResizing).toBe(false);

    const el = wrapper.querySelector<HTMLElement>('[data-pg-resize-handle="right"]')!;
    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 0, clientY: 0, bubbles: true }));
    expect(controller.isResizing).toBe(true);

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 0, clientY: 0 }));
    expect(controller.isResizing).toBe(false);
  });

  it('ends the gesture on pointercancel', () => {
    const controller = build({ handles: [GridResizeHandle.Right] });
    const el = wrapper.querySelector<HTMLElement>('[data-pg-resize-handle="right"]')!;
    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 0, clientY: 0, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
    expect(controller.isResizing).toBe(false);
  });
});

describe('GridResizeController — API sizing', () => {
  it('accepts pixel numbers and raw CSS lengths', () => {
    const controller = build({ enabled: false });
    controller.setSize({ width: 500, height: 300 });
    expect(container.style.width).toBe('500px');
    expect(container.style.height).toBe('300px');

    controller.setSize({ width: '60%', height: 'calc(100vh - 4rem)' });
    expect(container.style.width).toBe('60%');
    expect(container.style.height).toBe('calc(100vh - 4rem)');
  });

  it('leaves an omitted dimension untouched and clears one set to null', () => {
    const controller = build({ enabled: false });
    controller.setSize({ width: 500, height: 300 });

    controller.setSize({ width: 600 });
    expect(container.style.height).toBe('300px');

    controller.setSize({ height: null });
    expect(container.style.height).toBe('');
    expect(container.style.width).toBe('600px');
  });

  it('reset clears both overrides and the drag margin compensation', () => {
    const controller = build({ handles: [GridResizeHandle.Left] });
    drag(GridResizeHandle.Left, -100, 0);
    expect(container.style.marginLeft).toBe('-100px');

    controller.reset();
    expect(container.style.width).toBe('');
    expect(container.style.height).toBe('');
    expect(container.style.marginLeft).toBe('');
    expect(container.style.marginTop).toBe('');
  });

  it('works with handles disabled — the API is not gated on dragging', () => {
    const controller = build({ enabled: false });
    controller.setSize({ width: 640 });
    expect(container.style.width).toBe('640px');
  });
});

describe('GridResizeController — events', () => {
  it('emits start and end around a gesture, carrying the pre-drag size', () => {
    const started = vi.fn();
    const ended = vi.fn();
    bus.on(GridEventType.GRID_RESIZE_START, started);
    bus.on(GridEventType.GRID_RESIZE_END, ended);

    build({ handles: [GridResizeHandle.Right] });
    drag(GridResizeHandle.Right, 100, 0);

    expect(started).toHaveBeenCalledTimes(1);
    expect(started.mock.calls[0][0]).toMatchObject({
      handle: GridResizeHandle.Right,
      size: { width: 800, height: 400 },
    });
    expect(ended.mock.calls[0][0]).toMatchObject({
      handle: GridResizeHandle.Right,
      initialSize: { width: 800, height: 400 },
    });
  });

  it('tags the source so a listener can tell a drag from an API call', () => {
    const resized = vi.fn();
    bus.on(GridEventType.GRID_RESIZED, resized);

    const controller = build({ handles: [GridResizeHandle.Right] });

    drag(GridResizeHandle.Right, 100, 0);
    expect(resized.mock.calls.at(-1)?.[0].source).toBe(GridResizeSource.Drag);
    expect(resized.mock.calls.at(-1)?.[0].handle).toBe(GridResizeHandle.Right);

    controller.setSize({ width: 500 });
    expect(resized.mock.calls.at(-1)?.[0].source).toBe(GridResizeSource.Api);
    // An API change belongs to no handle.
    expect(resized.mock.calls.at(-1)?.[0].handle).toBeNull();
  });

  it('carries the previous size alongside the new one', () => {
    const resized = vi.fn();
    bus.on(GridEventType.GRID_RESIZED, resized);

    const controller = build({ enabled: false });
    controller.setSize({ width: 640 });

    expect(resized.mock.calls.at(-1)?.[0]).toMatchObject({
      size: { width: 640 },
      previousSize: { width: 800 },
    });
  });

  it('does not emit when the measured size is unchanged', () => {
    const resized = vi.fn();
    bus.on(GridEventType.GRID_RESIZED, resized);

    // Writing the size it already has is a measured no-op — the suppression
    // that stops a persisting listener firing on every drag frame.
    const controller = build({ enabled: false });
    controller.setSize({ width: 800, height: 400 });
    expect(resized).not.toHaveBeenCalled();
  });
});

describe('GridResizeController — teardown', () => {
  it('removes every handle and detaches an in-flight gesture', () => {
    const controller = build({ handles: [GridResizeHandle.Right, GridResizeHandle.Bottom] });
    const el = wrapper.querySelector<HTMLElement>('[data-pg-resize-handle="right"]')!;
    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 0, clientY: 0, bubbles: true }));

    controller.destroy();

    expect(wrapper.querySelectorAll('[data-pg-resize-handle]')).toHaveLength(0);
    expect(controller.isResizing).toBe(false);
    // A move that arrives after teardown must not reach a detached controller.
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 5000, clientY: 0 }));
    expect(container.style.width).toBe('');
  });
});
