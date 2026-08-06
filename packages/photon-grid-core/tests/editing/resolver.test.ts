import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  DEFAULT_EDITOR_BY_TYPE,
  EditorAdapterRegistry,
  EditorRegistry,
  EditorResolver,
  createDefaultStrategies,
} from '../../src/editing/registry';
import type {
  EditorResolution,
  EditorResolutionRequest,
  EditorResolutionStrategy,
} from '../../src/editing/registry';
import type {
  EditableParams,
  FrameworkEditorAdapter,
  ICellEditor,
} from '../../src/editing/types/cell-editor.types';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';

/**
 * Contract for editor resolution.
 *
 * The priority order is the load-bearing part: a column can carry `locked`, an
 * `editable` predicate, a `cellEditor` and a `type` at once, and which of them
 * wins decides whether a cell opens at all and with what. Each of the six
 * strategies is pinned in isolation, then again in competition.
 */

// ─── Stubs ────────────────────────────────────────────────────────────────────

/** Minimal editor. `getGui` returns a cast empty object: these suites never touch the DOM. */
class StubEditor implements ICellEditor {
  static readonly editorName: string = 'stub';
  value: unknown = null;
  init(): void { /* no-op */ }
  getGui(): HTMLElement { return {} as HTMLElement; }
  getValue(): unknown { return this.value; }
}

class TextEditor extends StubEditor { static readonly editorName = 'text'; }
class NumberEditor extends StubEditor { static readonly editorName = 'number'; }
class SelectEditor extends StubEditor { static readonly editorName = 'select'; }
class CheckboxEditor extends StubEditor { static readonly editorName = 'checkbox'; }
class ExplicitEditor extends StubEditor { static readonly editorName = 'explicit'; }

/** An editor whose methods are instance fields — invisible to the prototype-based class test. */
class FieldEditor implements ICellEditor {
  static readonly editorName = 'field';
  init = (): void => { /* no-op */ };
  getGui = (): HTMLElement => ({} as HTMLElement);
  getValue = (): unknown => null;
}

function nameOf(editor: ICellEditor): string {
  return (editor.constructor as typeof StubEditor).editorName;
}

function col(overrides: Partial<ColumnDef> = {}): ColumnDef {
  return { colId: 'c', field: 'c', header: 'C', type: 'string', ...overrides } as ColumnDef;
}

/** A column carrying editing fields `ColumnDef` may not declare yet. */
function editingCol(fields: Record<string, unknown>, overrides: Partial<ColumnDef> = {}): ColumnDef {
  return Object.assign(col(overrides), fields);
}

const NODE = { nodeId: 'r0', rowIndex: 0, data: { c: 1 } } as unknown as RowNode;
const API = { id: 'api' };

function request(colDef: ColumnDef, overrides: Partial<EditorResolutionRequest> = {}): EditorResolutionRequest {
  return { colDef, node: NODE, data: NODE.data, rowIndex: 0, api: API, ...overrides };
}

/** A registry seeded the way the grid seeds its own. */
function seededRegistry(): EditorRegistry {
  return new EditorRegistry({
    text: TextEditor,
    number: NumberEditor,
    select: SelectEditor,
    checkbox: CheckboxEditor,
  });
}

function makeResolver(
  registry: EditorRegistry = seededRegistry(),
  adapters: EditorAdapterRegistry = new EditorAdapterRegistry(),
  strategies?: readonly EditorResolutionStrategy[],
): EditorResolver {
  return new EditorResolver({ registry, adapters }, strategies);
}

/** Narrows to the editor arm, failing the test with the reason when it is `none`. */
function expectEditor(resolution: EditorResolution): Extract<EditorResolution, { kind: 'editor' }> {
  if (resolution.kind !== 'editor') {
    throw new Error(`expected an editor, got none: ${resolution.reason}`);
  }
  return resolution;
}

let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  warn.mockRestore();
  error.mockRestore();
});

// ─── EditorRegistry ───────────────────────────────────────────────────────────

describe('EditorRegistry', () => {
  it('starts empty and seeds from the constructor', () => {
    expect(new EditorRegistry().names()).toEqual([]);
    expect(new EditorRegistry({ text: TextEditor }).get('text')).toBe(TextEditor);
  });

  it('lets the last registration win, so an app can override a built-in', () => {
    const registry = new EditorRegistry({ text: TextEditor });
    registry.register('text', ExplicitEditor);
    expect(registry.get('text')).toBe(ExplicitEditor);
    expect(registry.names()).toEqual(['text']);
  });

  it('registers, reports, removes and clears', () => {
    const registry = new EditorRegistry();
    registry.registerAll({ text: TextEditor, number: NumberEditor });
    expect(registry.names()).toEqual(['text', 'number']);
    expect(registry.has('number')).toBe(true);

    registry.remove('number');
    expect(registry.has('number')).toBe(false);
    expect(registry.get('number')).toBeUndefined();

    registry.clear();
    expect(registry.names()).toEqual([]);
  });

  it('hands out a copy from getAll, so callers cannot mutate it', () => {
    const registry = new EditorRegistry({ text: TextEditor });
    const copy = registry.getAll();
    copy.delete('text');
    expect(registry.has('text')).toBe(true);
  });
});

// ─── EditorAdapterRegistry ────────────────────────────────────────────────────

function adapter(
  name: string,
  canHandle: (spec: unknown) => boolean,
  create: (spec: unknown) => ICellEditor = () => new ExplicitEditor(),
): FrameworkEditorAdapter {
  return { name, canHandle, create };
}

describe('EditorAdapterRegistry', () => {
  it('resolves through the first adapter that claims the spec', () => {
    const adapters = new EditorAdapterRegistry();
    adapters.register(adapter('never', () => false, () => new TextEditor()));
    adapters.register(adapter('always', () => true, () => new SelectEditor()));

    const editor = adapters.resolve({ framework: 'x' });
    expect(editor).not.toBeNull();
    expect(nameOf(editor as ICellEditor)).toBe('select');
  });

  it('returns an unregister function, and calling it twice is a no-op', () => {
    const adapters = new EditorAdapterRegistry();
    const unregister = adapters.register(adapter('a', () => true));
    expect(adapters.adapters()).toHaveLength(1);

    unregister();
    unregister();
    expect(adapters.adapters()).toHaveLength(0);
    expect(adapters.resolve({})).toBeNull();
  });

  it('skips an adapter whose canHandle throws, logs it, and keeps going', () => {
    const adapters = new EditorAdapterRegistry();
    adapters.register(adapter('broken', () => { throw new Error('boom'); }));
    adapters.register(adapter('good', () => true, () => new SelectEditor()));

    const editor = adapters.resolve({});
    expect(nameOf(editor as ICellEditor)).toBe('select');
    expect(error).toHaveBeenCalledWith('[PhotonGrid] editor adapter "broken" failed:', expect.any(Error));
  });

  it('treats a throwing create as "not handled" rather than propagating', () => {
    const adapters = new EditorAdapterRegistry();
    adapters.register(adapter('broken', () => true, () => { throw new Error('boom'); }));

    expect(adapters.resolve({})).toBeNull();
    expect(error).toHaveBeenCalledWith('[PhotonGrid] editor adapter "broken" failed:', expect.any(Error));
  });

  it('clears', () => {
    const adapters = new EditorAdapterRegistry();
    adapters.register(adapter('a', () => true));
    adapters.clear();
    expect(adapters.adapters()).toEqual([]);
  });
});

// ─── 1. editable ──────────────────────────────────────────────────────────────

describe('editable strategy', () => {
  it('refuses a column that never opted in', () => {
    const resolution = makeResolver().resolve(request(col()));
    expect(resolution.kind).toBe('none');
    expect(resolution.kind === 'none' && resolution.reason).toContain('not editable');
  });

  it('refuses editable: false', () => {
    expect(makeResolver().resolve(request(col({ editable: false }))).kind).toBe('none');
  });

  it('refuses a locked column even when editable: true', () => {
    const resolution = makeResolver().resolve(request(col({ editable: true, locked: true })));
    expect(resolution.kind).toBe('none');
    expect(resolution.kind === 'none' && resolution.reason).toContain('locked');
  });

  it('gives the predicate the row facts, and lets it veto row by row', () => {
    const seen: EditableParams[] = [];
    const colDef = editingCol({
      editable: (params: EditableParams) => {
        seen.push(params);
        return params.rowIndex === 0;
      },
    });
    const resolver = makeResolver();

    expect(resolver.resolve(request(colDef)).kind).toBe('editor');
    expect(resolver.resolve(request(colDef, { rowIndex: 3 })).kind).toBe('none');

    expect(seen[0]).toEqual({ data: NODE.data, node: NODE, colDef, rowIndex: 0, api: API });
    expect(seen).toHaveLength(2);
  });
});

// ─── 2. explicit ──────────────────────────────────────────────────────────────

describe('explicit strategy', () => {
  it('uses a class, building a fresh instance per session', () => {
    const colDef = editingCol({ editable: true, cellEditor: ExplicitEditor });
    const resolution = expectEditor(makeResolver().resolve(request(colDef)));

    expect(resolution.strategy).toBe('explicit');
    const a = resolution.create();
    const b = resolution.create();
    expect(a).toBeInstanceOf(ExplicitEditor);
    expect(a).not.toBe(b);
  });

  it('uses a factory, building a fresh instance per session', () => {
    const factory = vi.fn(() => new ExplicitEditor());
    const colDef = editingCol({ editable: true, cellEditor: factory });
    const resolution = expectEditor(makeResolver().resolve(request(colDef)));

    expect(resolution.strategy).toBe('explicit');
    expect(resolution.create()).not.toBe(resolution.create());
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('uses an arrow-function factory, which has no prototype at all', () => {
    const colDef = editingCol({ editable: true, cellEditor: () => new ExplicitEditor() });
    const resolution = expectEditor(makeResolver().resolve(request(colDef)));
    expect(nameOf(resolution.create())).toBe('explicit');
  });

  it('reuses an already-built editor instance, as documented', () => {
    const instance = new ExplicitEditor();
    const colDef = editingCol({ editable: true, cellEditor: instance });
    const resolution = expectEditor(makeResolver().resolve(request(colDef)));

    expect(resolution.strategy).toBe('explicit');
    expect(resolution.create()).toBe(instance);
    expect(resolution.create()).toBe(instance);
  });

  it('beats the registered string and the type default', () => {
    const colDef = editingCol({ editable: true, cellEditor: ExplicitEditor }, { type: 'number' });
    const resolution = expectEditor(makeResolver().resolve(request(colDef)));
    expect(resolution.strategy).toBe('explicit');
    expect(nameOf(resolution.create())).toBe('explicit');
  });
});

// ─── 3. adapter ───────────────────────────────────────────────────────────────

describe('adapter strategy', () => {
  it('claims a non-string spec no registry key could match', () => {
    const adapters = new EditorAdapterRegistry();
    const component = { __vue: true };
    adapters.register(adapter('vue', (spec) => spec === component, () => new SelectEditor()));

    const colDef = editingCol({ editable: true, cellEditor: component });
    const resolution = expectEditor(makeResolver(seededRegistry(), adapters).resolve(request(colDef)));

    expect(resolution.strategy).toBe('adapter');
    expect(nameOf(resolution.create())).toBe('select');
  });

  it('claims a framework component class, which is not a Photon editor class', () => {
    class AngularishComponent { static readonly ɵcmp = true; }
    const adapters = new EditorAdapterRegistry();
    adapters.register(
      adapter('angular', (spec) => typeof spec === 'function' && 'ɵcmp' in spec, () => new SelectEditor()),
    );

    const colDef = editingCol({ editable: true, cellEditor: AngularishComponent });
    const resolution = expectEditor(makeResolver(seededRegistry(), adapters).resolve(request(colDef)));

    expect(resolution.strategy).toBe('adapter');
  });

  it('builds one editor per session', () => {
    const adapters = new EditorAdapterRegistry();
    const create = vi.fn(() => new SelectEditor());
    adapters.register(adapter('vue', () => true, create));

    const colDef = editingCol({ editable: true, cellEditor: { __vue: true } });
    const resolution = expectEditor(makeResolver(seededRegistry(), adapters).resolve(request(colDef)));

    const a = resolution.create();
    const b = resolution.create();
    expect(a).not.toBe(b);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('outranks the registry, so an adapter can claim a string spec', () => {
    const adapters = new EditorAdapterRegistry();
    adapters.register(adapter('greedy', (spec) => spec === 'text', () => new SelectEditor()));

    const colDef = editingCol({ editable: true, cellEditor: 'text' });
    const resolution = expectEditor(makeResolver(seededRegistry(), adapters).resolve(request(colDef)));

    expect(resolution.strategy).toBe('adapter');
    expect(nameOf(resolution.create())).toBe('select');
  });

  it('is skipped when an adapter throws, without breaking resolution', () => {
    const adapters = new EditorAdapterRegistry();
    adapters.register(adapter('broken', () => { throw new Error('boom'); }));

    const colDef = editingCol({ editable: true, cellEditor: 'select' });
    const resolution = expectEditor(makeResolver(seededRegistry(), adapters).resolve(request(colDef)));

    expect(resolution.strategy).toBe('registered');
    expect(nameOf(resolution.create())).toBe('select');
    expect(error).toHaveBeenCalledWith('[PhotonGrid] editor adapter "broken" failed:', expect.any(Error));
  });

  it('does not see a plain editor class, which explicit claimed first', () => {
    const adapters = new EditorAdapterRegistry();
    const create = vi.fn(() => new SelectEditor());
    adapters.register(adapter('greedy', (spec) => typeof spec === 'function', create));

    const colDef = editingCol({ editable: true, cellEditor: ExplicitEditor });
    const resolution = expectEditor(makeResolver(seededRegistry(), adapters).resolve(request(colDef)));

    expect(resolution.strategy).toBe('explicit');
    expect(create).not.toHaveBeenCalled();
  });
});

// ─── 4. registered ────────────────────────────────────────────────────────────

describe('registered strategy', () => {
  it('resolves a string against the registry, fresh per session', () => {
    const colDef = editingCol({ editable: true, cellEditor: 'select' }, { type: 'number' });
    const resolution = expectEditor(makeResolver().resolve(request(colDef)));

    expect(resolution.strategy).toBe('registered');
    expect(nameOf(resolution.create())).toBe('select');
    expect(resolution.create()).not.toBe(resolution.create());
  });

  it('honours a registry override — last registration wins', () => {
    const registry = seededRegistry();
    registry.register('text', ExplicitEditor);

    const colDef = editingCol({ editable: true, cellEditor: 'text' });
    const resolution = expectEditor(makeResolver(registry).resolve(request(colDef)));
    expect(nameOf(resolution.create())).toBe('explicit');
  });

  it('warns on an unknown key and falls through to the type default', () => {
    const colDef = editingCol({ editable: true, cellEditor: 'txet' }, { type: 'number' });
    const resolution = expectEditor(makeResolver().resolve(request(colDef)));

    expect(resolution.strategy).toBe('byType');
    expect(nameOf(resolution.create())).toBe('number');
    expect(warn).toHaveBeenCalledWith(
      '[PhotonGrid] unknown cellEditor "txet" on column "c" — falling back to the column type default.',
    );
  });

  it('calls a registered class with new even when its methods are instance fields', () => {
    const registry = seededRegistry();
    registry.register('field', FieldEditor);

    const colDef = editingCol({ editable: true, cellEditor: 'field' });
    const resolution = expectEditor(makeResolver(registry).resolve(request(colDef)));
    expect(resolution.create()).toBeInstanceOf(FieldEditor);
  });

  it('accepts a registered factory function', () => {
    const registry = seededRegistry();
    registry.register('made', () => new ExplicitEditor());

    const colDef = editingCol({ editable: true, cellEditor: 'made' });
    const resolution = expectEditor(makeResolver(registry).resolve(request(colDef)));
    expect(nameOf(resolution.create())).toBe('explicit');
  });
});

// ─── 5. byType ────────────────────────────────────────────────────────────────

describe('byType strategy', () => {
  it('maps every editable column type to a registered editor', () => {
    const resolver = makeResolver();
    const cases: ReadonlyArray<readonly [ColumnDef['type'], string]> = [
      ['string', 'text'], ['number', 'number'], ['currency', 'number'], ['percentage', 'number'],
      ['duration', 'number'], ['boolean', 'checkbox'], ['dropdown', 'select'], ['object', 'select'],
      ['array', 'select'], ['phone', 'text'], ['image', 'text'], ['custom', 'text'],
    ];

    for (const [type, expected] of cases) {
      const resolution = expectEditor(resolver.resolve(request(col({ type, editable: true }))));
      expect(resolution.strategy).toBe('byType');
      expect(nameOf(resolution.create())).toBe(expected);
    }
  });

  it('names date/time/email/url editors even when this registry lacks them', () => {
    expect(DEFAULT_EDITOR_BY_TYPE.date).toBe('date');
    expect(DEFAULT_EDITOR_BY_TYPE.datetime).toBe('datetime');
    expect(DEFAULT_EDITOR_BY_TYPE.time).toBe('time');
    expect(DEFAULT_EDITOR_BY_TYPE.email).toBe('email');
    expect(DEFAULT_EDITOR_BY_TYPE.url).toBe('url');
  });

  it('leaves sparkline unmapped — there is nothing scalar to type', () => {
    expect(DEFAULT_EDITOR_BY_TYPE.sparkline).toBeUndefined();
  });

  it('is frozen, so one grid cannot corrupt the table for another', () => {
    expect(Object.isFrozen(DEFAULT_EDITOR_BY_TYPE)).toBe(true);
  });
});

// ─── 6. fallback ──────────────────────────────────────────────────────────────

describe('fallback strategy', () => {
  it('gives an unmapped type the text editor', () => {
    const resolution = expectEditor(
      makeResolver().resolve(request(col({ type: 'sparkline', editable: true }))),
    );
    expect(resolution.strategy).toBe('fallback');
    expect(nameOf(resolution.create())).toBe('text');
  });

  it('falls back when the type default is not registered', () => {
    const registry = new EditorRegistry({ text: TextEditor });
    const resolution = expectEditor(
      makeResolver(registry).resolve(request(col({ type: 'boolean', editable: true }))),
    );
    expect(resolution.strategy).toBe('fallback');
    expect(nameOf(resolution.create())).toBe('text');
  });

  it('gives up, with a reason, when even text is missing', () => {
    const resolution = makeResolver(new EditorRegistry()).resolve(
      request(col({ type: 'sparkline', editable: true })),
    );
    expect(resolution.kind).toBe('none');
    expect(resolution.kind === 'none' && resolution.reason).toContain('"text" fallback is not registered');
  });
});

// ─── The chain itself ─────────────────────────────────────────────────────────

describe('EditorResolver', () => {
  it('runs the six default strategies in the documented order', () => {
    expect(createDefaultStrategies().map((s) => s.name)).toEqual([
      'editable', 'explicit', 'adapter', 'registered', 'byType', 'fallback',
    ]);
  });

  it('reports "no strategy matched" when every strategy defers', () => {
    const resolution = makeResolver(seededRegistry(), new EditorAdapterRegistry(), []).resolve(
      request(col({ editable: true })),
    );
    expect(resolution).toEqual({ kind: 'none', reason: 'no strategy matched' });
  });

  it('lets a host splice a strategy in ahead of the defaults', () => {
    const resolver = makeResolver();
    const override: EditorResolutionStrategy = {
      name: 'host',
      resolve: () => ({ kind: 'editor', strategy: 'host', create: () => new ExplicitEditor() }),
    };
    resolver.use(override, 0);

    expect(resolver.strategies().map((s) => s.name)[0]).toBe('host');
    // Ahead of `editable`, so it even overrides a locked column.
    expect(resolver.resolve(request(col({ locked: true }))).kind).toBe('editor');
  });

  it('appends by default, where it can only act as a last resort', () => {
    const resolver = makeResolver();
    resolver.use({ name: 'last', resolve: () => null });
    expect(resolver.strategies().map((s) => s.name).at(-1)).toBe('last');
  });

  it('shares no chain between resolvers built from the defaults', () => {
    const a = makeResolver();
    const b = makeResolver();
    a.use({ name: 'only-a', resolve: () => null }, 0);
    expect(b.strategies().map((s) => s.name)).not.toContain('only-a');
  });
});
