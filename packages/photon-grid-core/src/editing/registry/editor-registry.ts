import type {
  CellEditorConstructor,
  CellEditorFactory,
} from '../types/cell-editor.types';

/**
 * Anything that can produce a fresh editor instance: a `new`-able class or a
 * plain factory function.
 *
 * The registry deliberately stores the two side by side and never normalises
 * one into the other — telling them apart is the resolver's job, and doing it
 * here would force every registration through a wrapper closure the grid would
 * then have to allocate and keep alive.
 */
export type EditorEntry = CellEditorConstructor | CellEditorFactory;

/**
 * Lookup table of cell editor implementations, keyed by the name a column
 * selects with `cellEditor: 'text'`.
 *
 * Built-in editors register themselves through exactly the same call a
 * user-defined one would, so there is no special-casing between the two:
 * `registry.register('sla-picker', SlaPickerEditor)` produces an editor a column
 * can select with `cellEditor: 'sla-picker'`, indistinguishable from `'select'`
 * at every downstream point.
 *
 * ### Registration is open at any time
 * `register()` is callable before or after the grid has rendered. Registering a
 * name a column already selects takes effect on that column's *next* edit
 * session — the hook a lazily-loaded editor bundle would use.
 *
 * ### Standalone by design
 * This class imports nothing but types. The built-in set is seeded from
 * elsewhere (`src/editing/editors`), which keeps the registry usable on its own
 * — a consumer can build a slim registry containing only the three editors their
 * grid actually needs, and a unit test can construct one with two stubs.
 *
 * Follows the shape of `BuiltInRendererRegistry` and `IconRegistry`; method
 * names match them (`remove`, not `unregister`).
 *
 * @example
 * ```ts
 * const registry = new EditorRegistry({ text: TextEditor, number: NumberEditor });
 * registry.register('text', MyHouseTextEditor); // last-in wins: overrides the built-in
 * ```
 */
export class EditorRegistry {
  private readonly editors = new Map<string, EditorEntry>();

  /**
   * @param entries - Editors to seed the registry with, keyed by name. Omitted
   *   for an empty registry; the grid seeds its shared instance with the
   *   built-in set at construction.
   */
  constructor(entries?: Readonly<Record<string, EditorEntry>>) {
    if (entries) this.registerAll(entries);
  }

  /**
   * Adds an editor, replacing any existing one registered under `name`.
   *
   * Last-in wins, deliberately: it is what lets an application override a
   * built-in (a house date picker, say) without the grid needing an override
   * mechanism of its own, and what lets a test swap in a stub.
   *
   * ### Why this is generic
   * A well-typed editor declares its own value and params types
   * (`ICellEditor<number, Row, StarParams>`), which under `strictFunctionTypes`
   * is *not* assignable to the erased `EditorEntry`: `CellEditorParams` mentions
   * both type arguments in contravariant positions, so a narrower `init` is
   * formally unsafe.
   *
   * In practice it is sound — the grid only ever calls the editor with the
   * params that column declared, which is exactly what the editor asked for —
   * but the type system cannot express "these travel together". Accepting the
   * editor generically and erasing it once, here, is what keeps that single
   * unavoidable widening inside the library instead of forcing a cast on every
   * application that registers a typed editor.
   *
   * @param name - Key used by `ColumnDef.cellEditor`.
   * @param editor - An editor class, or a factory returning a fresh instance.
   */
  register<TValue = unknown, TData = Record<string, unknown>, TParams = Record<string, unknown>>(
    name: string,
    editor: CellEditorConstructor<TValue, TData, TParams> | CellEditorFactory<TValue, TData, TParams>,
  ): void {
    this.editors.set(name, editor as EditorEntry);
  }

  /** Registers several editors, in key order — later duplicates win. */
  registerAll(entries: Readonly<Record<string, EditorEntry>>): void {
    for (const [name, editor] of Object.entries(entries)) this.register(name, editor);
  }

  /** The editor registered under `name`, or `undefined`. */
  get(name: string): EditorEntry | undefined {
    return this.editors.get(name);
  }

  has(name: string): boolean {
    return this.editors.has(name);
  }

  /**
   * Removes an editor. Columns selecting it by name fall back to the editor
   * inferred from their column type rather than becoming uneditable.
   */
  remove(name: string): void {
    this.editors.delete(name);
  }

  /** Registered names, in registration order. */
  names(): string[] {
    return [...this.editors.keys()];
  }

  /** A copy of the registry, so callers cannot mutate it by holding the map. */
  getAll(): Map<string, EditorEntry> {
    return new Map(this.editors);
  }

  clear(): void {
    this.editors.clear();
  }
}
