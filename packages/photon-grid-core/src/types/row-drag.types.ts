/**
 * **Row dragging** configuration and event payloads.
 *
 * Two modes, differing only in who applies the move:
 *
 * - **Managed** (the default under `rowModel: 'client'`) — the grid reorders its
 *   own rows on drop and emits `ROW_DROP` describing what it did.
 * - **Unmanaged** — the grid runs the drag and its preview but never touches the
 *   row array. `ROW_DROP` becomes a request: the application persists the move
 *   and refreshes. This is the only meaningful mode under a server-backed row
 *   model, where the datasource owns row order.
 *
 * @packageDocumentation
 */

import type { RowNode } from './row.types';

/** Grid-level row-drag behaviour. Per-column opt-in stays on `ColumnDef.rowDrag`. */
export interface RowDragOptions {
  /**
   * Whether the grid applies the reorder itself.
   *
   * Defaults to whether the active row model owns its row order: `true` under
   * `rowModel: 'client'`, `false` under `'server'` and `'infinite'`, where the
   * published array is the datasource's and would be overwritten by the next
   * fetch.
   *
   * Setting `true` under a server-backed model is refused (with a console
   * warning) because the grid cannot honour it. Setting `false` under the client
   * model is honoured — useful when the application wants to own ordering, for
   * example to persist it before showing it.
   */
  readonly managed?: boolean;
}

/** Emitted when a row drag begins. */
export interface RowDragStartPayload {
  /** The row being dragged. */
  readonly row: RowNode;
  /** Its index in the displayed rows at the moment the drag started. */
  readonly rowIndex: number;
}

/** Emitted when a row drag finishes, whether or not it resulted in a drop. */
export interface RowDragEndPayload {
  /** The row that was being dragged. */
  readonly row: RowNode;
  /** `true` when the drag ended without a valid drop target. */
  readonly cancelled: boolean;
}
