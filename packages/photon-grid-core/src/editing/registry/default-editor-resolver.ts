/**
 * Decides which editor a cell opens with — the strategy chain that replaces the
 * `switch (colDef.type)` the old `cell-editor-engine.ts` used.
 *
 * ### Priority (hard requirement)
 * Six strategies run in this exact order, first non-`null` answer wins:
 *
 * 1. **`editable`** — is this cell editable at all? A locked column, a falsy
 *    `editable`, or a predicate returning `false` short-circuits the whole chain
 *    with `{ kind: 'none' }`. Nothing below it can re-open a cell the column
 *    closed.
 * 2. **`explicit`** — `colDef.cellEditor` is a Photon editor class, a factory,
 *    or an already-built {@link ICellEditor}. A hand-written editor is the
 *    author's most specific instruction, so it outranks everything, and running
 *    it before the adapters guarantees a plain JavaScript editor class is never
 *    handed to a framework wrapper that happens to accept functions.
 * 3. **`adapter`** — a registered {@link FrameworkEditorAdapter} claims the
 *    spec. Must come *before* the string lookup so an adapter can claim a
 *    non-string spec (an Angular component, a React component, a Vue options
 *    object) that no registry key would ever match.
 * 4. **`registered`** — `cellEditor` is a string naming an entry in the
 *    {@link EditorRegistry}. An unknown key warns and *continues* the chain: a
 *    typo must not make a column uneditable.
 * 5. **`byType`** — the editor inferred from `colDef.type` via
 *    {@link DEFAULT_EDITOR_BY_TYPE}, which is the behaviour a column with no
 *    `cellEditor` at all relies on.
 * 6. **`fallback`** — the `'text'` editor, so a column with an exotic type and a
 *    slim registry still edits as text rather than silently refusing to open.
 *
 * The order is data, not control flow: {@link EditorResolver} walks an array,
 * and {@link EditorResolver.use} can splice a host strategy in at any index —
 * a "read-only while the row is syncing" rule, say — without this file changing.
 *
 * @packageDocumentation
 */

import type { ColumnDataType, ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type {
  BuiltInEditorName,
  CellEditorConstructor,
  CellEditorFactory,
  EditableParams,
  EditableSpec,
  ICellEditor,
} from '../types/cell-editor.types';
import type { EditorAdapterRegistry } from './editor-adapter-registry';
import type { EditorEntry, EditorRegistry } from './editor-registry';

// ─── Type → editor inference ──────────────────────────────────────────────────

/**
 * The editor a column gets from its `type` when it names none.
 *
 * A data map rather than a `switch`: it is enumerable (docs and the column
 * settings panel read it), overridable key by key, and adding a column type
 * costs one line here instead of a new branch in the engine.
 *
 * Several types share an editor on purpose — `currency`, `percentage` and
 * `duration` are all numbers behind their formatting, and `object` / `array`
 * are edited by picking from options, exactly as `dropdown` is.
 *
 * `sparkline` is deliberately absent: a mini-chart column has no scalar the user
 * could type. Such a column falls through to the `fallback` strategy and edits
 * as text only if the host explicitly marks it `editable`.
 */
export const DEFAULT_EDITOR_BY_TYPE: Readonly<Partial<Record<ColumnDataType, BuiltInEditorName>>> =
  Object.freeze({
    string: 'text',
    number: 'number',
    currency: 'number',
    percentage: 'number',
    duration: 'number',
    boolean: 'checkbox',
    date: 'date',
    datetime: 'datetime',
    time: 'time',
    dropdown: 'select',
    object: 'select',
    email: 'email',
    url: 'url',
    color: 'color',
    phone: 'text',
    array: 'select',
    image: 'text',
    custom: 'text',
  } as const);

/** The name every column falls back to when nothing more specific applies. */
const FALLBACK_EDITOR_NAME = 'text';

// ─── Public shapes ────────────────────────────────────────────────────────────

/**
 * Everything a strategy is told about the cell being opened.
 *
 * One frozen bag rather than positional arguments, so a future strategy can ask
 * a new question without changing every existing `resolve` signature. `api` is
 * `unknown` for the same reason `CellEditorParams.api` is: the registry sits
 * below `GridApi` in the dependency order and must not import it.
 */
export interface EditorResolutionRequest {
  /** The column whose cell is being opened. */
  readonly colDef: ColumnDef;
  /** The row node being edited — what a per-row `editable` predicate inspects. */
  readonly node: RowNode;
  /** The row's data object. Read-only here; strategies must never write to it. */
  readonly data: Readonly<Record<string, unknown>>;
  /** Zero-based index of the row within the currently displayed rows. */
  readonly rowIndex: number;
  /** The live grid API, forwarded untyped to `editable` predicates. */
  readonly api: unknown;
}

/**
 * The answer: either this cell does not open an editor, or here is how to build
 * one.
 *
 * A discriminated union rather than `ICellEditor | null` for two reasons: the
 * caller gets a `reason` it can log or surface instead of a silent no-op, and
 * `strategy` names which rule decided — which is the difference between a
 * two-minute and a two-hour debugging session when a column opens the "wrong"
 * editor.
 */
export type EditorResolution =
  | {
      /** No editor: the cell is not editable, or nothing could build one. */
      readonly kind: 'none';
      /** Human-readable explanation, safe to log. Never shown to end users. */
      readonly reason: string;
    }
  | {
      /** An editor is available. */
      readonly kind: 'editor';
      /** Which strategy decided — `'explicit'`, `'adapter'`, `'registered'`, … */
      readonly strategy: string;
      /**
       * Builds the editor for one session.
       *
       * Constructs a **fresh** instance per call for class, factory, registry
       * and adapter specs, so an editor may keep session state in fields with no
       * reset logic. The single exception is a column that supplied an
       * already-built {@link ICellEditor} object, where this necessarily returns
       * that same instance — see the `explicit` strategy for why that is a
       * footgun in a multi-grid page.
       */
      readonly create: () => ICellEditor;
    };

/** What every strategy may consult. Passed in rather than imported, so a test — or a second grid with its own registry — is a constructor argument away. */
export interface EditorResolverDeps {
  /** Named editors, built-in and application-registered. */
  readonly registry: EditorRegistry;
  /** The framework seam. Empty in a plain-JavaScript embedding. */
  readonly adapters: EditorAdapterRegistry;
}

/**
 * One rule in the chain.
 *
 * @remarks
 * Returning `null` means "I have no opinion, ask the next one" and is what makes
 * the chain composable; returning `{ kind: 'none' }` is an active veto that ends
 * it. Only the `editable` strategy vetoes today.
 */
export interface EditorResolutionStrategy {
  /** Diagnostic name, surfaced as {@link EditorResolution.strategy}. */
  readonly name: string;
  /**
   * @returns The resolution this rule dictates, or `null` to defer to the next
   *   strategy. Must be cheap and side-effect free — it runs once per edit
   *   session, and every strategy above the matching one runs too.
   */
  resolve(request: EditorResolutionRequest, deps: EditorResolverDeps): EditorResolution | null;
}

// ─── Shared, frozen answers ───────────────────────────────────────────────────

/** Every strategy deferred. Frozen and shared: no allocation on the common miss. */
const NO_STRATEGY_MATCHED: EditorResolution = Object.freeze({
  kind: 'none' as const,
  reason: 'no strategy matched',
});

/** Builds a `none` resolution. One place, so the `reason` wording stays consistent. */
function noEditor(reason: string): EditorResolution {
  return { kind: 'none', reason };
}

// ─── Spec type predicates ─────────────────────────────────────────────────────
//
// `ColumnDef.cellEditor` is intentionally open (`CellEditorSpec` admits
// `object`), so the only way to tell the forms apart is structurally. These
// three predicates are the trickiest part of the module and the order they are
// applied in is load-bearing; each documents exactly what it rules in and out.

/**
 * `true` when `spec` is an already-built editor instance.
 *
 * Checked first because it is the most positively identifiable form: an object
 * (so *not* callable — `typeof` says `'object'` for instances and `'function'`
 * for classes and factories) carrying both halves of the editor contract.
 * `getGui` and `getValue` are found whether they are own properties (an object
 * literal, or a class using arrow-function fields) or inherited from a
 * prototype, because `typeof obj.m === 'function'` walks the chain.
 */
function isCellEditorInstance(spec: unknown): spec is ICellEditor {
  if (typeof spec !== 'object' || spec === null) return false;
  const candidate = spec as Partial<ICellEditor>;
  return typeof candidate.getGui === 'function' && typeof candidate.getValue === 'function';
}

/**
 * `true` when `spec` is a `new`-able Photon editor class.
 *
 * The test is "its `prototype` is a non-empty object carrying `getGui`", which
 * is precise in both directions:
 *
 * - A `class X implements ICellEditor` puts its methods on `X.prototype`, so it
 *   matches — including after down-levelling to an ES5 constructor function,
 *   which keeps the same prototype methods.
 * - An arrow function has **no** `prototype` at all, and an ordinary factory
 *   `function make() { … }` has an empty one, so neither can be mistaken for a
 *   class and called with `new`.
 * - A framework component class (an Angular `@Component`, a React class
 *   component) has a prototype without `getGui`, so it is *not* claimed here and
 *   reaches the `adapter` strategy — which is the entire reason the check is
 *   `getGui`-specific rather than "is it a class?".
 *
 * The residual gap: an editor class that assigns `getGui` as an arrow-function
 * *field* puts it on the instance, not the prototype, and so is invisible here.
 * That form is indistinguishable from a framework component without calling it,
 * so it is not supported as an inline `cellEditor`; register it by name instead,
 * where {@link instantiate} can use the broader class test safely.
 */
function isCellEditorConstructor(spec: unknown): spec is CellEditorConstructor {
  if (typeof spec !== 'function') return false;
  const prototype = (spec as { prototype?: unknown }).prototype;
  if (typeof prototype !== 'object' || prototype === null) return false;
  return typeof (prototype as { getGui?: unknown }).getGui === 'function';
}

/**
 * `true` when `spec` is a class declared with `class` syntax.
 *
 * Only ever applied to values a caller *already registered as an editor*, where
 * the question is not "is this an editor?" but "must I call it with `new`?".
 * `Function.prototype.toString` is the sole reliable answer for a class whose
 * methods live in instance fields rather than on the prototype; calling such a
 * class without `new` throws a `TypeError`, which this exists to prevent.
 *
 * Never used on an open `cellEditor` spec — there it would claim framework
 * component classes and starve the adapters.
 */
function isClassSyntax(spec: unknown): boolean {
  return typeof spec === 'function' && /^class[\s{]/.test(Function.prototype.toString.call(spec));
}

/** Builds one instance from a registry entry, calling it with `new` only when it needs it. */
function instantiate(entry: EditorEntry): ICellEditor {
  if (isCellEditorConstructor(entry) || isClassSyntax(entry)) {
    return new (entry as CellEditorConstructor)();
  }
  return (entry as CellEditorFactory)();
}

// ─── Reading the editing fields off a column ──────────────────────────────────

/**
 * The editing-relevant view of a `ColumnDef`.
 *
 * `cellEditor` is typed `unknown` here on purpose: the column's own declaration
 * is a wide union that admits framework components, and every consumer below
 * narrows it through the predicates above anyway. Reading the column through
 * this interface — rather than casting at each site — is what keeps the module
 * free of `any` while still compiling against a `ColumnDef` whose editing fields
 * are being widened in parallel.
 */
interface EditingColumnView {
  readonly colId?: string;
  readonly locked?: boolean;
  readonly editable?: EditableSpec;
  readonly cellEditor?: unknown;
}

/** Widens a column to its editing view. A plain assignment, so an incompatible `ColumnDef` change fails the build here rather than at runtime. */
function editingView(colDef: ColumnDef): EditingColumnView {
  return colDef;
}

/** A column's identity for log messages, never blank. */
function label(colDef: ColumnDef): string {
  return editingView(colDef).colId ?? colDef.field ?? '(unnamed)';
}

// ─── The chain ────────────────────────────────────────────────────────────────

/**
 * Runs the strategies in order and reports the first opinion.
 *
 * Not memoised, by the same reasoning as `renderer-resolver.ts`: this runs once
 * per edit session — a human-speed event, orders of magnitude rarer than a
 * render — and caching against a `ColumnDef` would buy nothing while risking
 * stale answers, since those objects are mutated in place elsewhere (`locked` is
 * toggled straight from the column menu).
 */
export class EditorResolver {
  private readonly chain: EditorResolutionStrategy[];

  /**
   * @param deps - The registries every strategy consults.
   * @param strategies - The chain to run. Defaults to
   *   {@link createDefaultStrategies}; pass your own to replace the priority
   *   order wholesale, or use {@link use} to splice into the default one.
   */
  constructor(
    private readonly deps: EditorResolverDeps,
    strategies: readonly EditorResolutionStrategy[] = createDefaultStrategies(),
  ) {
    this.chain = [...strategies];
  }

  /**
   * Inserts a strategy into the chain.
   *
   * @param strategy - The rule to add.
   * @param index - Where to insert. Appended when omitted — which places it
   *   *after* `fallback`, so it can only ever act as a last resort. Pass `0` for
   *   a veto that must outrank even the `editable` check, or `1` for a rule that
   *   respects editability but overrides every editor choice.
   */
  use(strategy: EditorResolutionStrategy, index?: number): void {
    if (index === undefined || index >= this.chain.length) {
      this.chain.push(strategy);
      return;
    }
    this.chain.splice(Math.max(0, index), 0, strategy);
  }

  /** The chain, in the order it runs. Read-only: use {@link use} to change it. */
  strategies(): readonly EditorResolutionStrategy[] {
    return this.chain;
  }

  /**
   * Resolves the editor for one cell.
   *
   * @returns The first non-`null` answer, or a `none` explaining that no rule
   *   applied — never `null`, so the caller has exactly two cases to handle.
   */
  resolve(request: EditorResolutionRequest): EditorResolution {
    for (const strategy of this.chain) {
      const resolution = strategy.resolve(request, this.deps);
      if (resolution) return resolution;
    }
    return NO_STRATEGY_MATCHED;
  }
}

/**
 * The default chain, in priority order — see this file's header for why the
 * order is what it is. A function rather than a module constant so each grid
 * gets its own array and can splice into it without affecting its neighbours.
 */
export function createDefaultStrategies(): EditorResolutionStrategy[] {
  return [
    editableStrategy,
    explicitStrategy,
    adapterStrategy,
    registeredStrategy,
    byTypeStrategy,
    fallbackStrategy,
  ];
}

/**
 * 1. Is this cell editable at all?
 *
 * The only vetoing strategy. `editable: undefined` counts as *not* editable,
 * matching the long-standing `if (!colDef.editable || colDef.locked) return
 * false` in `cell-editor-engine.ts`: columns are read-only until opted in, so an
 * unaudited column can never become writable by accident.
 *
 * `locked` is checked first because it is the column menu's runtime override and
 * must beat a static `editable: true`.
 */
const editableStrategy: EditorResolutionStrategy = {
  name: 'editable',
  resolve(request: EditorResolutionRequest): EditorResolution | null {
    const { colDef } = request;
    const column = editingView(colDef);

    if (column.locked === true) return noEditor(`column "${label(colDef)}" is locked`);

    const editable = column.editable;
    if (!editable) return noEditor(`column "${label(colDef)}" is not editable`);

    if (typeof editable === 'function') {
      const params: EditableParams = {
        data: request.data,
        node: request.node,
        colDef,
        rowIndex: request.rowIndex,
        api: request.api,
      };
      if (!editable(params)) {
        return noEditor(`editable predicate vetoed row ${request.rowIndex} of "${label(colDef)}"`);
      }
    }

    return null; // Editable — let the chain choose an editor.
  },
};

/**
 * 2. The column names an editor directly: a class, a factory, or a live
 *    instance.
 *
 * The instance form is supported because it is occasionally the only practical
 * option (an editor wired to an external store at application start), but it
 * cannot be built fresh per session — the `create` thunk hands back the very
 * same object every time. Two grids, two rows, or a re-entrant session that
 * touch it concurrently will corrupt each other's state. Prefer a class.
 *
 * A callable is only treated as a factory when no adapter claims it: a bare
 * function is genuinely ambiguous (a React component and a closure factory are
 * structurally identical), and mis-calling a framework component would throw at
 * session start. The class case — the one this strategy's position exists to
 * protect — is still decided structurally, before adapters are consulted at all.
 */
const explicitStrategy: EditorResolutionStrategy = {
  name: 'explicit',
  resolve(request: EditorResolutionRequest, deps: EditorResolverDeps): EditorResolution | null {
    const spec = editingView(request.colDef).cellEditor;
    if (spec === undefined || spec === null) return null;

    if (isCellEditorConstructor(spec)) {
      const Editor = spec;
      return { kind: 'editor', strategy: 'explicit', create: () => new Editor() };
    }

    if (isCellEditorInstance(spec)) {
      const shared = spec;
      return { kind: 'editor', strategy: 'explicit', create: () => shared };
    }

    if (typeof spec === 'function' && !deps.adapters.claims(spec)) {
      const factory = spec as CellEditorFactory;
      return { kind: 'editor', strategy: 'explicit', create: () => factory() };
    }

    return null;
  },
};

/**
 * 3. A framework wrapper claims the spec.
 *
 * Placed above the string lookup so an adapter can claim shapes no registry key
 * could describe — an Angular component class, a Vue options object — and below
 * `explicit` so a plain editor class is never handed to a wrapper.
 *
 * The probe instance built while testing the match is handed to the first
 * `create()` call rather than thrown away, so a session costs exactly one
 * component instantiation; later calls build fresh ones.
 */
const adapterStrategy: EditorResolutionStrategy = {
  name: 'adapter',
  resolve(request: EditorResolutionRequest, deps: EditorResolverDeps): EditorResolution | null {
    const spec = editingView(request.colDef).cellEditor;
    if (spec === undefined || spec === null) return null;

    const probe = deps.adapters.resolve(spec);
    if (!probe) return null;

    let pending: ICellEditor | null = probe;
    return {
      kind: 'editor',
      strategy: 'adapter',
      create: (): ICellEditor => {
        if (pending) {
          const editor = pending;
          pending = null;
          return editor;
        }
        const fresh = deps.adapters.resolve(spec);
        if (!fresh) {
          // Only reachable if the adapter was unregistered, or started throwing,
          // between resolution and this session. Loud beats a blank editor.
          throw new Error(
            `[PhotonGrid] no editor adapter is available for column "${label(request.colDef)}" any more`,
          );
        }
        return fresh;
      },
    };
  },
};

/**
 * 4. `cellEditor` is a registry key.
 *
 * An unknown key is a warning, not an error: a typo (or an editor bundle that
 * has not loaded yet) degrades the column to its type default rather than making
 * it uneditable, and the message names the column so the typo is findable.
 */
const registeredStrategy: EditorResolutionStrategy = {
  name: 'registered',
  resolve(request: EditorResolutionRequest, deps: EditorResolverDeps): EditorResolution | null {
    const spec = editingView(request.colDef).cellEditor;
    if (typeof spec !== 'string') return null;

    const entry = deps.registry.get(spec);
    if (!entry) {
      console.warn(
        `[PhotonGrid] unknown cellEditor "${spec}" on column "${label(request.colDef)}" — falling back to the column type default.`,
      );
      return null;
    }

    return { kind: 'editor', strategy: 'registered', create: () => instantiate(entry) };
  },
};

/**
 * 5. The editor inferred from `colDef.type`.
 *
 * The path almost every column takes, and the reason a column usually needs no
 * `cellEditor` at all. Defers when the type has no mapping (`sparkline`) or its
 * editor is not registered, so a slim registry degrades to `fallback` instead of
 * refusing the edit.
 */
const byTypeStrategy: EditorResolutionStrategy = {
  name: 'byType',
  resolve(request: EditorResolutionRequest, deps: EditorResolverDeps): EditorResolution | null {
    const name = DEFAULT_EDITOR_BY_TYPE[request.colDef.type];
    if (!name) return null;

    const entry = deps.registry.get(name);
    if (!entry) return null;

    return { kind: 'editor', strategy: 'byType', create: () => instantiate(entry) };
  },
};

/**
 * 6. Last resort: the `'text'` editor.
 *
 * A cell the author explicitly marked editable should always open something the
 * user can type into. Only when even `'text'` is missing — a registry built by
 * hand without it — does the chain give up, and it says so.
 */
const fallbackStrategy: EditorResolutionStrategy = {
  name: 'fallback',
  resolve(request: EditorResolutionRequest, deps: EditorResolverDeps): EditorResolution | null {
    const entry = deps.registry.get(FALLBACK_EDITOR_NAME);
    if (!entry) {
      return noEditor(
        `no editor could be resolved for column "${label(request.colDef)}" (type "${request.colDef.type}") and the "${FALLBACK_EDITOR_NAME}" fallback is not registered`,
      );
    }
    return { kind: 'editor', strategy: 'fallback', create: () => instantiate(entry) };
  },
};
