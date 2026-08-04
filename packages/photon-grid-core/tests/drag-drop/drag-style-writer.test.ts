import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DragStyleWriter } from '../../src/drag-drop/drag-style-writer';
import { installDragDom, type DragDomHarness } from './drag-dom-harness';

/**
 * Assigning `textContent` on a `<style>` element makes the browser re-parse the
 * sheet and recalculate style for everything the rules could match. During a
 * column drag the grid keeps every drop-target column in the DOM, so one rewrite
 * touches the header, the filter row, and every rendered body cell — and the
 * previous implementations did that on every pointer event, even when the drop
 * slot had not moved.
 *
 * The contract these tests pin is therefore a counting one: writes must track
 * *content changes*, not call frequency.
 */
describe('DragStyleWriter', () => {
  let dom: DragDomHarness;

  beforeEach(() => { dom = installDragDom(); });
  afterEach(() => { dom.restore(); });

  it('mounts a marked style element into document.head', () => {
    const writer = new DragStyleWriter('data-pg-drag');
    expect(writer.isMounted).toBe(false);

    writer.mount();

    expect(writer.isMounted).toBe(true);
    expect(dom.head.children).toHaveLength(1);
    expect(dom.head.children[0].tagName).toBe('style');
    expect(dom.head.children[0].getAttribute('data-pg-drag')).toBe('');
  });

  it('mount is idempotent, so a re-entrant drag start cannot leak a node', () => {
    const writer = new DragStyleWriter('data-pg-drag');
    writer.mount();
    writer.mount();
    writer.mount();

    expect(dom.head.children).toHaveLength(1);
  });

  it('writes identical CSS to the DOM exactly once', () => {
    const writer = new DragStyleWriter('data-pg-drag');
    writer.mount();
    const css = '[data-col-id="a"] { --pg-drag-x: -120px; }';

    expect(writer.write(css)).toBe(true);
    // 60 further frames on an unchanged drop slot — the steady state of a drag.
    for (let i = 0; i < 60; i++) expect(writer.write(css)).toBe(false);

    expect(writer.writeCount).toBe(1);
    expect(dom.head.children[0].textContent).toBe(css);
  });

  it('writes again as soon as the content differs', () => {
    const writer = new DragStyleWriter('data-pg-drag');
    writer.mount();

    writer.write('a');
    writer.write('a');
    writer.write('b');
    writer.write('b');
    writer.write('a');

    expect(writer.writeCount).toBe(3);
    expect(writer.content).toBe('a');
  });

  it('counts writes per slot change, not per frame', () => {
    const writer = new DragStyleWriter('data-pg-drag');
    writer.mount();

    // Three drop slots across 300 frames.
    for (let frame = 0; frame < 300; frame++) {
      const slot = Math.floor(frame / 100);
      writer.write(`[data-col-id="c"] { --pg-drag-x: ${slot * 100}px; }`);
    }

    expect(writer.writeCount).toBe(3);
  });

  it('clear empties the sheet, and only once', () => {
    const writer = new DragStyleWriter('data-pg-drag');
    writer.mount();
    writer.write('a');

    expect(writer.clear()).toBe(true);
    expect(writer.clear()).toBe(false);
    expect(writer.content).toBe('');
    expect(dom.head.children[0].textContent).toBe('');
  });

  it('a clear on a freshly mounted writer is a no-op', () => {
    const writer = new DragStyleWriter('data-pg-drag');
    writer.mount();

    expect(writer.clear()).toBe(false);
    expect(writer.writeCount).toBe(0);
  });

  it('ignores writes before mount', () => {
    const writer = new DragStyleWriter('data-pg-drag');

    expect(writer.write('a')).toBe(false);
    expect(writer.writeCount).toBe(0);
  });

  it('dispose removes the element and can be called twice', () => {
    const writer = new DragStyleWriter('data-pg-drag');
    writer.mount();
    writer.write('a');

    writer.dispose();
    expect(dom.head.children).toHaveLength(0);
    expect(writer.isMounted).toBe(false);

    writer.dispose();   // no throw
    expect(dom.head.children).toHaveLength(0);
  });

  it('can be re-mounted for the next gesture with a clean slate', () => {
    const writer = new DragStyleWriter('data-pg-drag');
    writer.mount();
    writer.write('a');
    writer.dispose();

    writer.mount();
    // The same CSS must be written again — the previous element is gone, so
    // treating it as already-live would leave the new sheet empty.
    expect(writer.write('a')).toBe(true);
    expect(dom.head.children[0].textContent).toBe('a');
  });
});
