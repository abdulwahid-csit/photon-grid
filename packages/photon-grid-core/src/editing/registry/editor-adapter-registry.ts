import type {
  FrameworkEditorAdapter,
  ICellEditor,
} from '../types/cell-editor.types';

/** Shared empty adapter list — avoids allocating one per `adapters()` call on an empty registry. */
const NO_ADAPTERS: readonly FrameworkEditorAdapter[] = Object.freeze([]);

/**
 * The registry of {@link FrameworkEditorAdapter}s — the single seam through
 * which a framework component becomes an {@link ICellEditor}.
 *
 * ### Why this exists, and which way it points
 * `photon-grid-core` must never import Angular, React or Vue. So the dependency
 * is inverted: each wrapper package registers one adapter at grid construction,
 * and the core only ever *calls* `canHandle` / `create`. Nothing here knows what
 * a component is; it knows that somebody else claims to. That is what makes
 * `cellEditor: MyAngularEditorComponent` work without a line of Angular in the
 * core, and it is the only place in the editing system where an unknown object
 * is allowed in.
 *
 * ### Failure is contained, never fatal
 * A third-party adapter is untrusted code running on the hot path of every edit
 * session. A `canHandle` or `create` that throws is caught, reported once
 * through `console.error`, and that adapter is skipped — the next adapter, and
 * then the rest of the resolution chain, still get their turn. One broken
 * wrapper degrades a column to its default editor; it never takes editing (or
 * the grid) down with it.
 *
 * ### Order is registration order
 * First match wins, so in a mixed-framework page the adapter registered first
 * has priority. Adapters are expected to be specific — a `canHandle` returning
 * `true` for every function will swallow specs meant for its neighbours.
 *
 * @example
 * ```ts
 * const unregister = adapters.register({
 *   name: 'angular',
 *   canHandle: (spec) => typeof spec === 'function' && 'ɵcmp' in spec,
 *   create: (spec) => new AngularEditorBridge(spec as Type<unknown>, injector),
 * });
 * // …on grid destroy:
 * unregister();
 * ```
 */
export class EditorAdapterRegistry {
  private readonly registered: FrameworkEditorAdapter[] = [];

  /**
   * Adds an adapter to the end of the resolution order.
   *
   * @returns A function that removes exactly this adapter. Returning an
   *   unregister handle rather than exposing a `remove(name)` means a wrapper
   *   can tear itself down without knowing whether another instance of the same
   *   framework registered a same-named adapter — which matters when two grids
   *   with different injectors live on one page. Idempotent: calling it twice is
   *   a no-op.
   */
  register(adapter: FrameworkEditorAdapter): () => void {
    this.registered.push(adapter);
    return (): void => {
      const index = this.registered.indexOf(adapter);
      if (index !== -1) this.registered.splice(index, 1);
    };
  }

  /**
   * The first adapter that claims `spec`, or `null` when none does.
   *
   * Separated from {@link resolve} so a caller can ask "would this be handled?"
   * without paying for — or side-effecting — a component instantiation. The
   * editor resolver uses it to keep a bare function from being mistaken for a
   * plain factory; see `default-editor-resolver.ts`.
   *
   * @param spec - The raw `ColumnDef.cellEditor` value.
   */
  find(spec: unknown): FrameworkEditorAdapter | null {
    for (const adapter of this.registered) {
      if (this.claimsSafely(adapter, spec)) return adapter;
    }
    return null;
  }

  /** Whether any registered adapter claims `spec`. */
  claims(spec: unknown): boolean {
    return this.find(spec) !== null;
  }

  /**
   * Builds an editor for `spec` using the first adapter that claims it.
   *
   * Call it once per edit session: adapters are contractually allowed to return
   * a stateful object, so the instance must not be shared between sessions.
   *
   * @returns The editor, or `null` when no adapter claims `spec` — or when the
   *   claiming adapter threw, which is reported and treated as "not handled" so
   *   the column falls back to a core editor instead of failing to open.
   */
  resolve(spec: unknown): ICellEditor | null {
    const adapter = this.find(spec);
    if (!adapter) return null;
    try {
      return adapter.create(spec);
    } catch (err) {
      this.report(adapter, err);
      return null;
    }
  }

  /** Registered adapters, in registration order. Read-only: register/unregister to change it. */
  adapters(): readonly FrameworkEditorAdapter[] {
    return this.registered.length === 0 ? NO_ADAPTERS : this.registered;
  }

  /** Drops every adapter. Intended for teardown and tests. */
  clear(): void {
    this.registered.length = 0;
  }

  /**
   * `canHandle` behind a try/catch. A predicate that throws is reported and
   * answers "no", so one misbehaving wrapper cannot stop the adapters behind it
   * from being consulted.
   */
  private claimsSafely(adapter: FrameworkEditorAdapter, spec: unknown): boolean {
    try {
      return adapter.canHandle(spec) === true;
    } catch (err) {
      this.report(adapter, err);
      return false;
    }
  }

  /** Single place the adapter failure message is formatted, so it stays greppable. */
  private report(adapter: FrameworkEditorAdapter, err: unknown): void {
    console.error(`[PhotonGrid] editor adapter "${adapter.name}" failed:`, err);
  }
}
