import type { ColumnDef } from '../types/column.types';
import type { ColumnRendererMap, DisplayRendererFn } from '../types/renderer.types';
import type {
  BaseRendererOptions,
  AnyBuiltInRendererSpec,
  BuiltInRendererDefinition,
} from '../types/built-in-renderer.types';
import { cellRenderers } from './built-in/registry';
import { DEFAULT_RENDERER_BY_TYPE } from './built-in/default-renderer-map';

/**
 * `true` when `renderer` is the per-slot override map rather than one of the
 * shorthand forms.
 *
 * Everything that is an object but carries no `name` is a slot map. The
 * framework wrappers' component/template specs discriminate on `kind`, and the
 * built-in spec on `name`, so the three object shapes never collide.
 */
function isSlotMap(renderer: unknown): renderer is ColumnRendererMap {
  return (
    typeof renderer === 'object' &&
    renderer !== null &&
    !('name' in renderer)
  );
}

/** `true` when `renderer` is a configured built-in: `{ name, options }`. */
function isBuiltInSpec(renderer: unknown): renderer is AnyBuiltInRendererSpec {
  return (
    typeof renderer === 'object' &&
    renderer !== null &&
    typeof (renderer as { name?: unknown }).name === 'string'
  );
}

/**
 * Resolves a single rendering slot for a column, e.g.
 * `resolveColumnRenderer(colDef, 'display')`.
 *
 * This is the single entry point every renderer/engine touchpoint uses to read
 * `ColumnDef.renderer` — keeping the lookup in one documented place instead of
 * duplicated across call sites.
 *
 * Only the **slot-map form** has slots. When a column selects a built-in by
 * name, supplies a bare display function, or leaves `renderer` unset, every
 * slot here is `undefined` and the caller falls back to its own built-in
 * handling — which is exactly what those callers already did before named
 * renderers existed. The display slot specifically has a richer answer
 * available; see {@link resolveDisplayRenderer}.
 *
 * @returns The registered renderer function for `slot`, or `undefined` when the
 * column has no per-slot override and the caller should fall back to its
 * default built-in rendering.
 */
export function resolveColumnRenderer<K extends keyof ColumnRendererMap>(
  colDef: ColumnDef,
  slot: K,
): ColumnRendererMap[K] | undefined {
  const renderer = colDef.renderer;
  if (!isSlotMap(renderer)) return undefined;
  return renderer[slot];
}

/**
 * How a column's cells should be drawn, and whether that output is patchable as
 * plain text.
 */
export interface ResolvedDisplayRenderer {
  /**
   * Which of the four outcomes this is.
   *
   * The three fields below are each meaningful for only some of them, so an
   * explicit discriminant beats forcing every consumer to re-derive one from
   * which properties happen to be absent.
   */
  readonly kind: 'custom' | 'builtin' | 'html' | 'text';
  /**
   * A custom display function, when the column supplies one. Takes precedence
   * over {@link builtIn} and is invoked with the existing
   * `DisplayRendererParams` contract.
   */
  readonly custom?: DisplayRendererFn;
  /** The built-in implementation, when no custom function applies. */
  readonly builtIn?: BuiltInRendererDefinition;
  /** Options declared alongside a built-in spec; `{}` otherwise. */
  readonly options: BaseRendererOptions;
  /**
   * `true` when the cell will be a single `.pg-cell__value` text node, which is
   * what lets the Virtual DOM patch it with one `textContent` write.
   *
   * @see BuiltInRendererDefinition.textOnly
   */
  readonly textOnly: boolean;
}

/** Shared empty options object — avoids an allocation per cell resolution. */
const NO_OPTIONS: BaseRendererOptions = Object.freeze({});

/** Nothing renders this column specially; the caller formats it as text. */
const PLAIN_TEXT: ResolvedDisplayRenderer = Object.freeze({
  kind: 'text' as const,
  options: NO_OPTIONS,
  textOnly: true,
});

/** The author owns the markup via `ColumnDef.renderHtml`. */
const RAW_HTML: ResolvedDisplayRenderer = Object.freeze({
  kind: 'html' as const,
  options: NO_OPTIONS,
  textOnly: false,
});


/**
 * Decides how one column's cells are drawn.
 *
 * ### Precedence
 * 1. `renderer` slot map's `display`
 * 2. `renderer` as a bare function
 * 3. `renderer` as a built-in name or `{ name, options }` spec
 * 4. `colDef.renderHtml`
 * 5. `colDef.valueFormatter`
 * 6. the built-in inferred from `colDef.type`
 *
 * Steps 1, 4, 5 and 6 reproduce the order that existed before named renderers
 * (display → renderHtml → valueFormatter → type switch), so no column that
 * works today changes. Steps 2 and 3 are new surface no existing column can
 * have.
 *
 * Whichever built-in is chosen — named or inferred — is configured from
 * `colDef.rendererParams`, layered under a spec's own `options`; see
 * {@link optionsFor}.
 *
 * A column with **both** an explicit built-in and a `valueFormatter` is not a
 * conflict: the renderer owns the presentation, and text-producing renderers
 * derive their string through `formatCellValue`, which already lets
 * `valueFormatter` win over the default formatting. The author's formatter is
 * honoured inside the renderer they asked for.
 *
 * Not memoised. This runs once per cell build and once per cell adoption into
 * the Virtual DOM — never per frame — and caching against a `ColumnDef` would
 * buy nothing while adding invalidation risk, since those objects are mutated
 * in place elsewhere (`pinned`, `width`, `locked`).
 *
 * @param colDef - The column to resolve.
 * @returns The renderer to use, plus its text-patchability.
 */
export function resolveDisplayRenderer(colDef: ColumnDef): ResolvedDisplayRenderer {
  const renderer = colDef.renderer;

  if (typeof renderer === 'string') {
    return fromBuiltIn(renderer, optionsFor(colDef)) ?? inferred(colDef);
  }

  if (typeof renderer === 'function') {
    return { kind: 'custom', custom: renderer, options: NO_OPTIONS, textOnly: false };
  }

  if (isBuiltInSpec(renderer)) {
    return (
      fromBuiltIn(renderer.name, optionsFor(colDef, renderer.options)) ?? inferred(colDef)
    );
  }

  if (isSlotMap(renderer) && renderer.display) {
    return { kind: 'custom', custom: renderer.display, options: NO_OPTIONS, textOnly: false };
  }

  // `renderHtml` and `valueFormatter` both mean "the author has already decided
  // what this cell says", so neither takes an inferred renderer.
  if (colDef.renderHtml) return RAW_HTML;
  if (colDef.valueFormatter) return PLAIN_TEXT;

  return inferred(colDef);
}

/**
 * The options a column's built-in renderer receives.
 *
 * `ColumnDef.rendererParams` is the flat form and a spec's `options` the nested
 * one; a column that sets both gets them merged with `options` winning key by
 * key, so neither is silently discarded.
 *
 * Allocation-free unless both are present — the merge is the rare case, and
 * this runs once per cell build.
 */
function optionsFor(colDef: ColumnDef, specOptions?: BaseRendererOptions): BaseRendererOptions {
  const params = colDef.rendererParams as BaseRendererOptions | undefined;
  if (!params) return specOptions ?? NO_OPTIONS;
  if (!specOptions) return params;
  return { ...params, ...specOptions };
}

/** Looks a built-in up by name, or `undefined` when nothing is registered under it. */
function fromBuiltIn(
  name: string,
  options: BaseRendererOptions,
): ResolvedDisplayRenderer | undefined {
  const builtIn = cellRenderers.get(name);
  if (!builtIn) return undefined;
  return { kind: 'builtin', builtIn, options, textOnly: builtIn.textOnly };
}

/**
 * The renderer a column gets from its type.
 *
 * Falls back to plain text when the inferred renderer is not registered — a
 * consumer who built a slim registry gets readable cells rather than blank
 * ones.
 */
function inferred(colDef: ColumnDef): ResolvedDisplayRenderer {
  const name = DEFAULT_RENDERER_BY_TYPE[colDef.type];
  return (name && fromBuiltIn(name, optionsFor(colDef))) ?? PLAIN_TEXT;
}
