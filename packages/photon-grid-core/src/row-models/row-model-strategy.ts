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

  /** Release resources: abort in-flight work, clear timers, drop listeners. */
  destroy(): void;
}
