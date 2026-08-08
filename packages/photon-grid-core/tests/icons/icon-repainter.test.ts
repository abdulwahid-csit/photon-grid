import { describe, it, expect } from 'vitest';

import { repaintIcons } from '../../src/icons/icon-repainter';
import type { IconRenderer } from '../../src/icons/icon-renderer';

/**
 * Minimal DOM fake covering exactly the surface {@link repaintIcons} touches.
 *
 * `jsdom` is not a dependency of this package (see vitest.config.ts), and the
 * shared `tests/renderer/dom-stub.ts` does not model `replaceWith`,
 * `isConnected`, `ownerDocument` or `<template>`. Stubbing precisely what is
 * under test keeps the failure modes honest: anything the repainter starts
 * relying on that is not modelled here fails loudly rather than passing against
 * a permissive fake.
 */
class FakeEl {
  readonly attrs = new Map<string, string>();
  children: FakeEl[] = [];
  parentNode: FakeEl | null = null;
  isConnected = true;
  innerHTML = '';

  constructor(readonly tagName: string, attrs: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(attrs)) this.attrs.set(k, v);
  }

  get ownerDocument(): { createElement: (tag: string) => FakeTemplate } {
    return { createElement: () => new FakeTemplate() };
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  append(child: FakeEl): void {
    child.parentNode = this;
    this.children.push(child);
  }

  /** Depth-first `[data-icon]` match — the only selector the repainter uses. */
  querySelectorAll(selector: string): FakeEl[] {
    if (selector !== '[data-icon]') throw new Error(`unsupported selector: ${selector}`);
    const out: FakeEl[] = [];
    const walk = (node: FakeEl): void => {
      for (const child of node.children) {
        if (child.attrs.has('data-icon')) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }

  replaceWith(next: FakeEl): void {
    const parent = this.parentNode;
    if (!parent) return;
    const i = parent.children.indexOf(this);
    if (i >= 0) parent.children[i] = next;
    next.parentNode = parent;
    this.parentNode = null;
    this.isConnected = false;
  }
}

/** Just enough `<template>` to parse one root element out of a markup string. */
class FakeTemplate {
  content: { firstElementChild: FakeEl | null } = { firstElementChild: null };

  set innerHTML(markup: string) {
    const m = /^<(\w+)([^>]*)>/.exec(markup);
    if (!m) {
      this.content.firstElementChild = null;
      return;
    }
    const attrs: Record<string, string> = {};
    for (const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    this.content.firstElementChild = new FakeEl(m[1], attrs);
  }
}

/** Records what the repainter asked for, so precedence and sizing are observable. */
function fakeRenderer() {
  const toStringCalls: Array<{ name: string; size: number }> = [];
  const updateCalls: Array<{ el: FakeEl; name: string; size: number | undefined }> = [];

  const renderer = {
    renderToString(name: string, size = 16) {
      toStringCalls.push({ name, size });
      return `<svg data-icon="${name}" data-icon-size="${size}" data-gen="new"></svg>`;
    },
    updateIcon(el: FakeEl, name: string, options: { size?: number } = {}) {
      updateCalls.push({ el, name, size: options.size });
      el.setAttribute('data-icon', name);
      el.innerHTML = `<svg data-gen="new"></svg>`;
    },
  };

  return { renderer: renderer as unknown as IconRenderer, toStringCalls, updateCalls };
}

describe('repaintIcons', () => {
  it('replaces a marked <svg> outright and preserves its position', () => {
    const root = new FakeEl('div');
    const wrapper = new FakeEl('button');
    const svg = new FakeEl('svg', { 'data-icon': 'filter', 'data-icon-size': '14' });
    wrapper.append(svg);
    root.append(wrapper);

    const { renderer, toStringCalls } = fakeRenderer();
    const count = repaintIcons(renderer, [root as never]);

    expect(count).toBe(1);
    expect(toStringCalls).toEqual([{ name: 'filter', size: 14 }]);
    // The new node took the old one's slot rather than being appended.
    expect(wrapper.children).toHaveLength(1);
    expect(wrapper.children[0].getAttribute('data-gen')).toBe('new');
  });

  it('refills a marked container in place, keeping the wrapper', () => {
    const root = new FakeEl('div');
    const span = new FakeEl('span', { 'data-icon': 'sortAsc', 'data-icon-size': '20' });
    root.append(span);

    const { renderer, updateCalls } = fakeRenderer();
    const count = repaintIcons(renderer, [root as never]);

    expect(count).toBe(1);
    expect(updateCalls).toEqual([{ el: span, name: 'sortAsc', size: 20 }]);
    // Same node — a wrapper carries classes and inline sizing worth preserving.
    expect(root.children[0]).toBe(span);
  });

  it('leaves host-supplied markup alone', () => {
    const root = new FakeEl('div');
    const hostSvg = new FakeEl('svg'); // no data-icon — a host's own markup
    const themed = new FakeEl('svg', { 'data-icon': 'close' });
    root.append(hostSvg);
    root.append(themed);

    const { renderer, toStringCalls } = fakeRenderer();
    const count = repaintIcons(renderer, [root as never]);

    expect(count).toBe(1);
    expect(toStringCalls).toEqual([{ name: 'close', size: 16 }]);
    expect(root.children[0]).toBe(hostSvg);
  });

  it('sweeps portal roots as well as the container', () => {
    const container = new FakeEl('div');
    container.append(new FakeEl('svg', { 'data-icon': 'search' }));

    const portal = new FakeEl('div'); // stands in for .pg-context-menu
    portal.append(new FakeEl('svg', { 'data-icon': 'copy' }));

    const { renderer, toStringCalls } = fakeRenderer();
    const count = repaintIcons(renderer, [container as never, portal as never]);

    expect(count).toBe(2);
    expect(toStringCalls.map((c) => c.name).sort()).toEqual(['copy', 'search']);
  });

  it('falls back to the svg width, then 16, when the size stamp is missing', () => {
    const root = new FakeEl('div');
    root.append(new FakeEl('svg', { 'data-icon': 'check', width: '12' }));
    root.append(new FakeEl('svg', { 'data-icon': 'close' }));

    const { renderer, toStringCalls } = fakeRenderer();
    repaintIcons(renderer, [root as never]);

    expect(toStringCalls).toEqual([
      { name: 'check', size: 12 },
      { name: 'close', size: 16 },
    ]);
  });

  it('skips nodes detached earlier in the same sweep', () => {
    const root = new FakeEl('div');
    const orphan = new FakeEl('svg', { 'data-icon': 'check' });
    orphan.isConnected = false;
    root.append(orphan);

    const { renderer, toStringCalls } = fakeRenderer();
    const count = repaintIcons(renderer, [root as never]);

    expect(count).toBe(0);
    expect(toStringCalls).toEqual([]);
  });

  it('leaves the node untouched when the name no longer resolves', () => {
    const root = new FakeEl('div');
    const svg = new FakeEl('svg', { 'data-icon': 'gone' });
    root.append(svg);

    const renderer = { renderToString: () => '', updateIcon: () => {} } as unknown as IconRenderer;
    const count = repaintIcons(renderer, [root as never]);

    // An unresolvable name must not blank out the existing glyph.
    expect(count).toBe(0);
    expect(root.children[0]).toBe(svg);
  });

  it('de-duplicates a node reachable from two roots', () => {
    const outer = new FakeEl('div');
    const inner = new FakeEl('div');
    inner.append(new FakeEl('svg', { 'data-icon': 'check' }));
    outer.append(inner);

    const { renderer, toStringCalls } = fakeRenderer();
    // `outer` and `inner` overlap — the shared icon must be repainted once.
    const count = repaintIcons(renderer, [outer as never, inner as never]);

    expect(count).toBe(1);
    expect(toStringCalls).toHaveLength(1);
  });
});
