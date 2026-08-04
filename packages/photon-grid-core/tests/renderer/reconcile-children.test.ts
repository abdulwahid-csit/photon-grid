import { describe, it, expect } from 'vitest';
import { reconcileChildren } from '../../src/renderer/dom-utils';
import { FakeElement, asElement, asElements } from '../drag-drop/drag-dom-harness';

/**
 * `reconcileChildren` replaced the `innerHTML = ''` rebuild in
 * `HeaderRenderer.updateCenterVisibleCols`. That rebuild is what made a live
 * cross-panel column drag visibly reshuffle the header and scale with the column
 * count: it destroyed and recreated every centre header cell for what was
 * usually one column changing slot.
 *
 * These tests pin the two properties the drag depends on — that element identity
 * survives a reorder (so listeners, classes, focus, and in-flight transitions
 * survive with it), and that an unchanged list performs no DOM writes at all.
 */
describe('reconcileChildren', () => {
  /** Builds `n` tagged children already parented to `parent`. */
  function seed(parent: FakeElement, ids: string[]): Map<string, FakeElement> {
    const byId = new Map<string, FakeElement>();
    for (const id of ids) {
      const el = new FakeElement();
      el.setAttribute('id', id);
      parent.appendChild(el);
      byId.set(id, el);
    }
    return byId;
  }

  /** Current child order, by `id`. */
  function order(parent: FakeElement): string[] {
    return parent.children.map((c) => c.getAttribute('id') ?? '');
  }

  it('leaves an already-correct list untouched', () => {
    const parent = new FakeElement();
    const byId = seed(parent, ['a', 'b', 'c']);
    const desired = ['a', 'b', 'c'].map((id) => byId.get(id)!);

    reconcileChildren(asElement(parent), asElements(desired));

    expect(order(parent)).toEqual(['a', 'b', 'c']);
    // Same objects, not replacements.
    expect(parent.children[0]).toBe(byId.get('a'));
    expect(parent.children[2]).toBe(byId.get('c'));
  });

  it('reorders in place, preserving element identity', () => {
    const parent = new FakeElement();
    const byId = seed(parent, ['a', 'b', 'c', 'd']);

    // 'c' moves to the front — the shape of a single column changing slot.
    const desired = ['c', 'a', 'b', 'd'].map((id) => byId.get(id)!);
    reconcileChildren(asElement(parent), asElements(desired));

    expect(order(parent)).toEqual(['c', 'a', 'b', 'd']);
    for (const id of ['a', 'b', 'c', 'd']) {
      expect(parent.children).toContain(byId.get(id));
    }
  });

  it('preserves state carried on the moved element', () => {
    const parent = new FakeElement();
    const byId = seed(parent, ['a', 'b', 'c']);

    // Stand-ins for pg-th--dragging, a drag transform, and a listener.
    const moved = byId.get('c')!;
    moved.classList.add('pg-th--dragging');
    moved.style.setProperty('--pg-drag-x', '-120px');
    let clicks = 0;
    moved.addEventListener('pointerdown', () => { clicks++; });

    reconcileChildren(asElement(parent), asElements(['c', 'a', 'b'].map((id) => byId.get(id)!)));

    expect(parent.children[0]).toBe(moved);
    expect(moved.classList.contains('pg-th--dragging')).toBe(true);
    expect(moved.styleProps.get('--pg-drag-x')).toBe('-120px');
    moved.dispatch('pointerdown', {});
    expect(clicks).toBe(1);
  });

  it('removes children that are no longer wanted', () => {
    const parent = new FakeElement();
    const byId = seed(parent, ['a', 'b', 'c']);

    reconcileChildren(asElement(parent), asElements([byId.get('a')!, byId.get('c')!]));

    expect(order(parent)).toEqual(['a', 'c']);
    expect(byId.get('b')!.isConnected).toBe(false);
  });

  it('inserts new children at the right slots', () => {
    const parent = new FakeElement();
    const byId = seed(parent, ['a', 'c']);
    const b = new FakeElement();
    b.setAttribute('id', 'b');

    reconcileChildren(asElement(parent), asElements([byId.get('a')!, b, byId.get('c')!]));

    expect(order(parent)).toEqual(['a', 'b', 'c']);
    expect(b.isConnected).toBe(true);
  });

  it('handles a simultaneous insert, move, and remove', () => {
    const parent = new FakeElement();
    const byId = seed(parent, ['a', 'b', 'c', 'd']);
    const e = new FakeElement();
    e.setAttribute('id', 'e');

    // 'b' dropped, 'd' moved forward, 'e' introduced.
    reconcileChildren(asElement(parent), asElements([byId.get('d')!, byId.get('a')!, e, byId.get('c')!]));

    expect(order(parent)).toEqual(['d', 'a', 'e', 'c']);
    expect(byId.get('b')!.isConnected).toBe(false);
  });

  it('empties the parent for an empty desired list', () => {
    const parent = new FakeElement();
    seed(parent, ['a', 'b']);

    reconcileChildren(asElement(parent), []);

    expect(parent.children).toHaveLength(0);
  });

  it('fills an empty parent', () => {
    const parent = new FakeElement();
    const nodes = ['a', 'b', 'c'].map((id) => {
      const el = new FakeElement();
      el.setAttribute('id', id);
      return el;
    });

    reconcileChildren(asElement(parent), asElements(nodes));

    expect(order(parent)).toEqual(['a', 'b', 'c']);
  });

  it('reverses a list correctly', () => {
    const parent = new FakeElement();
    const byId = seed(parent, ['a', 'b', 'c', 'd', 'e']);

    reconcileChildren(
      asElement(parent),
      asElements(['e', 'd', 'c', 'b', 'a'].map((id) => byId.get(id)!)),
    );

    expect(order(parent)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('is idempotent', () => {
    const parent = new FakeElement();
    const byId = seed(parent, ['a', 'b', 'c']);
    const desired = asElements(['b', 'c', 'a'].map((id) => byId.get(id)!));

    reconcileChildren(asElement(parent), desired);
    const afterFirst = order(parent);
    reconcileChildren(asElement(parent), desired);

    expect(order(parent)).toEqual(afterFirst);
    expect(order(parent)).toEqual(['b', 'c', 'a']);
  });
});
