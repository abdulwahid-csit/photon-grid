/**
 * The **RowModelStrategy** abstraction — the pluggable behaviour behind
 * `GridOptions.rowModel`. It decouples *how displayed rows are produced* from
 * the rest of the grid: `GridApi.applyPipeline()` simply delegates to the active
 * strategy, so swapping client ↔ server (and, later, infinite/viewport) is a
 * single construction-time choice with no downstream changes.
 *
 * Implementations:
 *  - {@link import('./client-row-model').ClientRowModel} — in-memory pipeline
 *    (filter → sort → group → paginate → master-detail), today's behaviour.
 *  - {@link import('./server/server-row-model').ServerRowModel} — delegates every
 *    data operation to a {@link import('../types/server-side.types').ServerSideDatasource}.
 *
 * Not to be confused with the concrete {@link import('../core/row-model').RowModel}
 * *class*, which is the client node factory / data holder used by the client
 * strategy.
 *
 * @packageDocumentation
 */

import type { RowModelType } from '../types/server-side.types';
/**
 * Strategy that computes and publishes the grid's displayed rows (the
 * `visibleRows` store key). Invoked by `GridApi.applyPipeline()` on every
 * `refresh()`.
 */
export interface RowModelStrategy {
  /** Discriminates the active strategy for feature checks and telemetry. */
  readonly type: RowModelType;

  /**
   * Declares that every row is exactly `GridOptions.rowHeight` tall.
   *
   * When set, the renderer computes the total content height as
   * `rows.length × rowHeight` instead of summing the array. That is faster for
   * any strategy, but it is *required* by strategies that publish a sparse row
   * array (the infinite model): summing would dereference holes.
   *
   * Leave unset for strategies whose rows can differ in height — grouping,
   * master/detail and tree data all produce rows that do not.
   */
  readonly uniformRowHeight?: boolean;

  /**
   * Declares that the published rows are a dense, client-owned array whose
   * order other features may rewrite in place.
   *
   * This is the default for `GridOptions.rowDrag.managed`: where it holds, a row
   * drop is committed by the grid itself; where it does not, the drag still runs
   * but `ROW_DROP` becomes a request for the application to persist the move.
   *
   * A demand-loading strategy fails it twice over: its array is *sparse* (only
   * fetched pages are materialised, so a splice would walk holes), and the
   * server re-supplies the order on the next fetch, which would silently
   * discard the drop anyway.
   *
   * Defaults to `false` when unset, so a new strategy has to opt in
   * deliberately rather than inherit a guarantee it may not meet.
   */
  readonly rowOrderIsClientOwned?: boolean;

  /**
   * Recompute and publish the displayed rows. For the client strategy this runs
   * synchronously; for the server strategy it (debounced) issues a request and
   * publishes rows asynchronously when the response arrives.
   */
  buildDisplayedRows(): void;

  /**
   * Optional one-time kick-off after grid initialisation (e.g. the server
   * strategy's initial fetch). No-op for the client strategy.
   */
  start?(): void;

  /**
   * Optional notification of the row range the renderer is currently painting.
   *
   * Lets a demand-loading strategy fetch exactly what is on screen without
   * duplicating the renderer's virtualisation maths or listening to scroll
   * events itself. Called after every render pass; implementations should
   * ignore an unchanged range.
   *
   * @param startRow - First rendered row index, inclusive.
   * @param endRow   - Row index rendering stops at, exclusive.
   */
  onRenderWindow?(startRow: number, endRow: number): void;

  /** Release resources: abort in-flight work, clear timers, drop listeners. */
  destroy(): void;
}
