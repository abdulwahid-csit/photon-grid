import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { BuiltInRendererRegistry, createDefaultRenderers, cellRenderers } from '../../../src/renderer/built-in/registry';
import { DEFAULT_RENDERER_BY_TYPE } from '../../../src/renderer/built-in/default-renderer-map';
import { resolveColumnRenderer, resolveDisplayRenderer } from '../../../src/renderer/renderer-resolver';
import type { BuiltInRendererDefinition } from '../../../src/types/built-in-renderer.types';
import type { ColumnDef } from '../../../src/types/column.types';

import { installDomStub } from '../dom-stub';

/**
 * Contract for the renderer registry and the resolution that sits on it.
 *
 * Two things are load-bearing and easy to regress:
 *
 * 1. **Back-compat.** `ColumnDef.renderer` used to be only a slot map. Widening
 *    it must not change what any of the eight slots resolve to for a column
 *    that still uses that form.
 * 2. **Precedence.** A column can carry a renderer, `renderHtml`, a
 *    `valueFormatter` and a `type` at once. The order they win in decides what
 *    every cell in the grid looks like.
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); });
afterEach(() => { teardown(); });

function col(overrides: Partial<ColumnDef> = {}): ColumnDef {
  return { colId: 'c', field: 'c', header: 'C', type: 'string', ...overrides } as ColumnDef;
}

function stubDef(name: string, textOnly = true): BuiltInRendererDefinition {
  return { name, textOnly, render: () => undefined };
}

describe('BuiltInRendererRegistry', () => {
  it('seeds itself with every renderer the grid ships', () => {
    const registry = new BuiltInRendererRegistry();
    // The inference table names one renderer per column type; all of them must
    // actually exist, or a column would resolve to nothing.
    for (const name of Object.values(DEFAULT_RENDERER_BY_TYPE)) {
      expect(registry.has(name)).toBe(true);
    }
    expect(registry.names().length).toBe(createDefaultRenderers().length);
  });

  it('takes its own definitions when given them, so a slim build is possible', () => {
    const registry = new BuiltInRendererRegistry([stubDef('only')]);
    expect(registry.names()).toEqual(['only']);
    expect(registry.has('text')).toBe(false);
  });

  it('lets a later registration replace an earlier one', () => {
    const registry = new BuiltInRendererRegistry([stubDef('badge', false)]);
    registry.register(stubDef('badge', true));
    expect(registry.get('badge')?.textOnly).toBe(true);
    expect(registry.names()).toEqual(['badge']);
  });

  it('registers a custom name exactly like a built-in one', () => {
    const registry = new BuiltInRendererRegistry([]);
    registry.register(stubDef('sla-badge', false));
    expect(registry.get('sla-badge')).toBeDefined();
  });

  it('hands out a copy, so a caller cannot mutate the registry through it', () => {
    const registry = new BuiltInRendererRegistry([stubDef('a')]);
    registry.getAll().delete('a');
    expect(registry.has('a')).toBe(true);
  });

  it('removes and clears', () => {
    const registry = new BuiltInRendererRegistry([stubDef('a'), stubDef('b')]);
    registry.remove('a');
    expect(registry.has('a')).toBe(false);
    registry.clear();
    expect(registry.names()).toEqual([]);
  });
});

describe('resolveColumnRenderer — back-compat', () => {
  it('still returns each slot for the map form', () => {
    const display = (): string => 'd';
    const editor = (): HTMLElement => ({} as HTMLElement);
    const c = col({ renderer: { display, editor } });

    expect(resolveColumnRenderer(c, 'display')).toBe(display);
    expect(resolveColumnRenderer(c, 'editor')).toBe(editor);
    expect(resolveColumnRenderer(c, 'filter')).toBeUndefined();
  });

  it('returns undefined for every slot when a built-in is named', () => {
    // A string has no slots. Indexing it must not accidentally reach a
    // `String.prototype` member either.
    const c = col({ renderer: 'currency' });
    for (const slot of ['display', 'editor', 'option', 'filter', 'tooltip', 'group', 'header', 'summary'] as const) {
      expect(resolveColumnRenderer(c, slot)).toBeUndefined();
    }
  });

  it('returns undefined for every slot when a bare function is given', () => {
    const c = col({ renderer: () => 'x' });
    expect(resolveColumnRenderer(c, 'display')).toBeUndefined();
  });
});

describe('resolveDisplayRenderer — precedence', () => {
  it('puts the slot map display above everything else', () => {
    const display = (): string => 'd';
    const resolved = resolveDisplayRenderer(
      col({ type: 'currency', renderHtml: true, valueFormatter: () => 'f', renderer: { display } }),
    );
    expect(resolved.kind).toBe('custom');
    expect(resolved.custom).toBe(display);
    expect(resolved.textOnly).toBe(false);
  });

  it('accepts a bare function as the display renderer', () => {
    const fn = (): string => 'd';
    const resolved = resolveDisplayRenderer(col({ renderer: fn }));
    expect(resolved.kind).toBe('custom');
    expect(resolved.custom).toBe(fn);
  });

  it('puts an explicitly named built-in above renderHtml and valueFormatter', () => {
    const resolved = resolveDisplayRenderer(
      col({ type: 'string', renderHtml: true, valueFormatter: () => 'f', renderer: 'country' }),
    );
    expect(resolved.kind).toBe('builtin');
    expect(resolved.builtIn?.name).toBe('country');
  });

  it('carries the options from a configured built-in', () => {
    const resolved = resolveDisplayRenderer(
      col({ renderer: { name: 'progress', options: { max: 10 } } }),
    );
    expect(resolved.builtIn?.name).toBe('progress');
    expect(resolved.options).toEqual({ max: 10 });
  });

  it('puts renderHtml above valueFormatter and the inferred renderer', () => {
    const resolved = resolveDisplayRenderer(col({ type: 'currency', renderHtml: true, valueFormatter: () => 'f' }));
    expect(resolved.kind).toBe('html');
    expect(resolved.textOnly).toBe(false);
  });

  it('lets a valueFormatter suppress the inferred renderer', () => {
    // Preserves the pre-existing rule: a formatter owns the cell's text, and a
    // text cell is patchable, so this must stay textOnly.
    const resolved = resolveDisplayRenderer(col({ type: 'boolean', valueFormatter: () => 'f' }));
    expect(resolved.kind).toBe('text');
    expect(resolved.textOnly).toBe(true);
  });

  it('falls back to the renderer inferred from the column type', () => {
    expect(resolveDisplayRenderer(col({ type: 'boolean' })).builtIn?.name).toBe('checkbox');
    expect(resolveDisplayRenderer(col({ type: 'currency' })).builtIn?.name).toBe('currency');
    expect(resolveDisplayRenderer(col({ type: 'url' })).builtIn?.name).toBe('link');
    expect(resolveDisplayRenderer(col({ type: 'array' })).builtIn?.name).toBe('list');
  });

  it('infers a renderer for every column type', () => {
    for (const [type, name] of Object.entries(DEFAULT_RENDERER_BY_TYPE)) {
      const resolved = resolveDisplayRenderer(col({ type: type as ColumnDef['type'] }));
      expect(resolved.builtIn?.name, `type "${type}"`).toBe(name);
    }
  });

  it('degrades to the column type default when a named renderer is not registered', () => {
    // A slim registry, or a name that was removed, must leave cells readable
    // rather than blank — so an unknown name falls through to inference.
    const resolved = resolveDisplayRenderer(col({ type: 'string', renderer: 'not-registered' }));
    expect(resolved.builtIn?.name).toBe('text');
    expect(resolved.textOnly).toBe(true);
  });

  it('degrades to plain text when neither the name nor the type resolves', () => {
    const registry = new BuiltInRendererRegistry([]);
    const before = cellRenderers.getAll();
    cellRenderers.clear();
    try {
      const resolved = resolveDisplayRenderer(col({ renderer: 'not-registered' }));
      expect(resolved.kind).toBe('text');
      expect(resolved.textOnly).toBe(true);
      expect(registry.names()).toEqual([]);
    } finally {
      cellRenderers.registerAll([...before.values()]);
    }
  });

  it('classifies textOnly from the resolved renderer, not from the column type', () => {
    // A text column that opts into a pill is no longer text-patchable, and a
    // boolean column that opts into Yes/No text is.
    expect(resolveDisplayRenderer(col({ type: 'string', renderer: 'badge' })).textOnly).toBe(false);
    expect(resolveDisplayRenderer(col({ type: 'boolean', renderer: 'boolean' })).textOnly).toBe(true);
  });
});

describe('shared registry', () => {
  it('is the instance resolution reads through', () => {
    const marker = stubDef('temp-marker', false);
    cellRenderers.register(marker);
    try {
      expect(resolveDisplayRenderer(col({ renderer: 'temp-marker' })).builtIn).toBe(marker);
    } finally {
      cellRenderers.remove('temp-marker');
    }
  });
});
