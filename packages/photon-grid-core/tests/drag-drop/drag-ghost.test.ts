import { describe, it, expect } from 'vitest';
import { DragGhost, GHOST_X_VAR, GHOST_Y_VAR } from '../../src/drag-drop/drag-ghost';
import { FakeElement, asElement } from './drag-dom-harness';

/**
 * The chip follows the cursor on every frame of a drag. Positioning it with
 * `left` / `top` dirties layout and paint each time, and because the drag
 * handlers then read geometry back in the same handler, that write also forces a
 * synchronous layout flush — the most expensive thing a pointer handler can do.
 *
 * `DragGhost` publishes the position as two custom properties instead, which the
 * theme composes into a transform. These tests pin that contract plus the write
 * guards that keep a steady-state frame free of DOM work.
 */
describe('DragGhost', () => {
  it('publishes the position as transform custom properties', () => {
    const ghost = new DragGhost();
    const el = new FakeElement();
    ghost.attach(asElement(el));

    ghost.moveTo(120, 80);

    expect(el.styleProps.get(GHOST_X_VAR)).toBe('120px');
    expect(el.styleProps.get(GHOST_Y_VAR)).toBe('80px');
    // Never the layout-dirtying properties.
    expect(el.styleProps.has('left')).toBe(false);
    expect(el.styleProps.has('top')).toBe(false);
  });

  it('applies the attach-time cursor offset', () => {
    const ghost = new DragGhost();
    const el = new FakeElement();
    ghost.attach(asElement(el), 14, -6);

    ghost.moveTo(100, 100);

    expect(el.styleProps.get(GHOST_X_VAR)).toBe('114px');
    expect(el.styleProps.get(GHOST_Y_VAR)).toBe('94px');
  });

  it('skips the write when the position is unchanged', () => {
    const ghost = new DragGhost();
    const el = new FakeElement();
    ghost.attach(asElement(el));

    ghost.moveTo(50, 50);
    el.styleProps.delete(GHOST_X_VAR);   // observe whether a write reoccurs
    el.styleProps.delete(GHOST_Y_VAR);

    ghost.moveTo(50, 50);
    ghost.moveTo(50, 50);

    expect(el.styleProps.has(GHOST_X_VAR)).toBe(false);
    expect(el.styleProps.has(GHOST_Y_VAR)).toBe(false);
  });

  it('preserves sub-pixel positions rather than rounding', () => {
    const ghost = new DragGhost();
    const el = new FakeElement();
    ghost.attach(asElement(el));

    ghost.moveTo(10.5, 20.25);

    // Rounding here would visibly quantise the chip against a smooth pointer.
    expect(el.styleProps.get(GHOST_X_VAR)).toBe('10.5px');
    expect(el.styleProps.get(GHOST_Y_VAR)).toBe('20.25px');
  });

  it('writes the first position even when it is the origin', () => {
    const ghost = new DragGhost();
    const el = new FakeElement();
    ghost.attach(asElement(el));

    ghost.moveTo(0, 0);

    expect(el.styleProps.get(GHOST_X_VAR)).toBe('0px');
  });

  it('toggles a state class only when the value changes', () => {
    const ghost = new DragGhost();
    const el = new FakeElement();
    ghost.attach(asElement(el));

    ghost.setFlag('pg-col-drag-ghost--hide', true);
    expect(el.classes.has('pg-col-drag-ghost--hide')).toBe(true);

    // Externally forced off; a guarded no-op must not put it back.
    el.classes.delete('pg-col-drag-ghost--hide');
    ghost.setFlag('pg-col-drag-ghost--hide', true);
    expect(el.classes.has('pg-col-drag-ghost--hide')).toBe(false);

    ghost.setFlag('pg-col-drag-ghost--hide', false);
    ghost.setFlag('pg-col-drag-ghost--hide', true);
    expect(el.classes.has('pg-col-drag-ghost--hide')).toBe(true);
  });

  it('clearFlags removes several classes at once', () => {
    const ghost = new DragGhost();
    const el = new FakeElement();
    ghost.attach(asElement(el));

    ghost.setFlag('a', true);
    ghost.setFlag('b', true);
    ghost.clearFlags('a', 'b', 'c');

    expect(el.classes.has('a')).toBe(false);
    expect(el.classes.has('b')).toBe(false);
  });

  it('detach removes the element and resets tracking', () => {
    const ghost = new DragGhost();
    const parent = new FakeElement();
    const el = new FakeElement();
    parent.appendChild(el);
    ghost.attach(asElement(el));
    ghost.moveTo(10, 10);

    ghost.detach();

    expect(el.isConnected).toBe(false);
    expect(parent.children).toHaveLength(0);
    expect(ghost.isAttached).toBe(false);
    expect(ghost.element).toBeNull();
  });

  it('is inert once detached', () => {
    const ghost = new DragGhost();
    const el = new FakeElement();
    ghost.attach(asElement(el));
    ghost.detach();

    ghost.moveTo(99, 99);
    ghost.setFlag('x', true);

    expect(el.styleProps.has(GHOST_X_VAR)).toBe(false);
    expect(el.classes.has('x')).toBe(false);
  });

  it('a new attach starts with clean position and flag state', () => {
    const ghost = new DragGhost();
    const first = new FakeElement();
    ghost.attach(asElement(first));
    ghost.moveTo(50, 50);
    ghost.setFlag('pg-col-drag-ghost--hide', true);

    const second = new FakeElement();
    ghost.attach(asElement(second));

    // Same coordinates as the previous gesture must still be written, and the
    // previous flag state must not suppress the new element's first toggle.
    ghost.moveTo(50, 50);
    ghost.setFlag('pg-col-drag-ghost--hide', true);

    expect(second.styleProps.get(GHOST_X_VAR)).toBe('50px');
    expect(second.classes.has('pg-col-drag-ghost--hide')).toBe(true);
  });
});
