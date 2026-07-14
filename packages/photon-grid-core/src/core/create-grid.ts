import { GridCore } from './grid-core';
import type { GridOptions } from '../types/grid.types';

/**
 * Accepted container reference for {@link createGrid} / {@link renderGrid}:
 * either a live DOM element or a CSS selector string resolved against
 * `document` at call time.
 */
export type GridContainer = HTMLElement | string;

/**
 * Creates and mounts a Photon Grid, returning the live {@link GridCore}
 * instance. This is the recommended, framework-agnostic entry point — it reads
 * more declaratively than `new GridCore(...)`, accepts a CSS selector as well
 * as an element, and fails fast with a clear message when the container is
 * missing.
 *
 * The returned instance exposes the full public surface via its `api`
 * ({@link GridCore.api}) and is torn down with `grid.destroy()`.
 *
 * @param container - Target host: an `HTMLElement`, or a CSS selector (e.g.
 *                    `'#grid'`) resolved via `document.querySelector`.
 * @param options   - Grid configuration (columns, data, sizing, features…).
 * @returns The mounted {@link GridCore} instance.
 * @throws If `container` is a selector that matches no element, or a nullish
 *         element reference is passed.
 *
 * @example Using an element
 * ```ts
 * const grid = PhotonGrid.createGrid(document.getElementById('grid'), {
 *   columns,
 *   data: rowData,
 *   headerRowHeight: 48,
 *   rowHeight: 42,
 * });
 * grid.api.sizeColumnsToFit();
 * ```
 *
 * @example Using a selector
 * ```ts
 * const grid = PhotonGrid.createGrid('#grid', { columns, data: rowData });
 * // …later
 * grid.destroy();
 * ```
 */
export function createGrid(container: GridContainer, options: GridOptions): GridCore {
  const el = resolveContainer(container);
  return new GridCore(el, options);
}

/**
 * Alias of {@link createGrid} for callers who prefer render-oriented naming.
 * Identical behavior and return value.
 *
 * @param container - Target host element or CSS selector.
 * @param options   - Grid configuration.
 * @returns The mounted {@link GridCore} instance.
 */
export function renderGrid(container: GridContainer, options: GridOptions): GridCore {
  return createGrid(container, options);
}

/**
 * Resolves a {@link GridContainer} to a concrete `HTMLElement`, throwing a
 * descriptive error when it cannot be found — far easier to debug than the
 * `Cannot read properties of null` a bare constructor would surface later.
 */
function resolveContainer(container: GridContainer): HTMLElement {
  if (typeof container === 'string') {
    const found = document.querySelector<HTMLElement>(container);
    if (!found) {
      throw new Error(`[PhotonGrid] createGrid: no element matches selector "${container}".`);
    }
    return found;
  }
  if (!container) {
    throw new Error('[PhotonGrid] createGrid: a container element or selector is required.');
  }
  return container;
}
