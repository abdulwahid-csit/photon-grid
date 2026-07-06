import type { ColumnDef } from '../types/column.types';
import type { ColumnRendererMap } from '../types/renderer.types';
/**
 * Resolves a single rendering slot for a column, e.g.
 * `resolveColumnRenderer(colDef, 'display')`.
 *
 * This is the single entry point every renderer/engine touchpoint uses to
 * read `ColumnDef.renderer` — keeping the `colDef.renderer?.[slot]` lookup in
 * one documented place instead of duplicated across call sites, and giving a
 * single spot to extend later (e.g. a grid-level default renderer) without
 * touching every consumer.
 *
 * @returns The registered renderer function for `slot`, or `undefined` when
 * the column has no override and the caller should fall back to its default
 * built-in rendering.
 */
export declare function resolveColumnRenderer<K extends keyof ColumnRendererMap>(colDef: ColumnDef, slot: K): ColumnRendererMap[K] | undefined;
//# sourceMappingURL=renderer-resolver.d.ts.map