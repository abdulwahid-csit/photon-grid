import type { GridOptions } from './grid.types';
import type { GridEventType } from './event.types';

/**
 * Parameters passed to a {@link MasterDetailConfig.detailRendererFn} custom
 * detail renderer — the escape hatch used when a detail row should show
 * arbitrary content instead of a nested Photon Grid instance.
 */
export interface DetailRendererParams {
  /** Raw data of the parent (master) row being expanded. */
  rowData: Record<string, unknown>;
  /** Stable node id of the parent row's `RowNode`. */
  nodeId: string;
  /** Empty container the renderer must populate. Its size drives auto-height measurement. */
  containerEl: HTMLElement;
  /**
   * The parent grid's `GridApi`. Typed `unknown` here (mirrors
   * `DisplayRendererParams.api`) to avoid a `types -> core` import cycle —
   * callers cast to `GridApi` themselves.
   */
  parentApi: unknown;
}

/**
 * Master/Detail configuration for a grid instance.
 *
 * Enabling this turns qualifying rows into expandable "master" rows whose
 * detail section is, by default, a fully independent nested Photon Grid
 * instance — complete with its own sorting, filtering, selection, editing,
 * clipboard, undo/redo, context menu, row drag, fill handle, and overlay
 * layer. Because {@link detailGrid} is itself a `GridOptions`, nesting is
 * unlimited: a detail grid may declare its own `masterDetail` config.
 *
 * @example
 * ```ts
 * masterDetail: {
 *   enabled: true,
 *   toggleColumnId: 'name',
 *   hasDetail: (row) => row.orderCount > 0,
 *   getDetailData: (row) => fetchOrders(row.id),
 *   detailGrid: (row) => ({ columns: orderColumns, rowHeight: 36 }),
 *   detailMaxHeight: 320,
 * }
 * ```
 */
export interface MasterDetailConfig {
  /** Master/Detail is otherwise fully inert — every consumer must opt in explicitly. */
  enabled: boolean;

  /**
   * `colId` of the column that renders the expand/collapse toggle.
   * Defaults to the first visible column when omitted.
   */
  toggleColumnId?: string;

  /**
   * Determines whether a given row can be expanded. Rows failing this check
   * render no toggle icon at all. Defaults to "every row has detail".
   */
  hasDetail?: (rowData: Record<string, unknown>) => boolean;

  /**
   * Fetches the detail dataset for a row, synchronously or asynchronously.
   * The resolved array becomes the nested grid's `GridOptions.data`.
   * When omitted, the nested grid is built with no data (useful when
   * `detailGrid`/`detailRendererFn` supply data themselves).
   */
  getDetailData?: (
    rowData: Record<string, unknown>,
  ) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>;

  /**
   * Full configuration for the nested Photon Grid instance — a static
   * object shared by every detail row, or a per-row factory. `theme` is
   * inherited from the parent's active theme unless set here explicitly.
   */
  detailGrid?: GridOptions | ((rowData: Record<string, unknown>) => GridOptions);

  /**
   * Escape hatch for non-grid detail content. When supplied, this takes
   * priority over {@link detailGrid} — no nested `GridCore` is created.
   */
  detailRendererFn?: (params: DetailRendererParams) => HTMLElement;

  /** Whether newly-encountered rows start expanded. Default `false`. */
  defaultExpanded?: boolean;

  /** Lower clamp applied to both auto-measured and manually resized height. */
  detailMinHeight?: number;

  /** Upper clamp applied to both auto-measured and manually resized height. Overflow scrolls. */
  detailMaxHeight?: number;

  /**
   * When `true` (default), the detail row's height tracks the nested grid's
   * rendered content via `ResizeObserver`. When `false`, `detailFixedHeight`
   * (or a `48px` fallback) is used instead.
   */
  detailAutoHeight?: boolean;

  /** Fixed pixel height used when `detailAutoHeight` is `false`. */
  detailFixedHeight?: number;

  /** Shows a drag handle on the detail row's bottom edge letting users resize it manually. Default `false`. */
  detailResizable?: boolean;

  /**
   * When `true` (default), the nested grid is not constructed — and
   * `getDetailData` is not called — until the row is first expanded.
   */
  lazy?: boolean;

  /**
   * Event types re-emitted on the parent grid's event bus whenever the
   * nested grid emits them, or `true` to bubble every event. Payloads are
   * wrapped as `{ sourceNodeId, event: <original payload> }`. Default: none.
   */
  bubbleEvents?: GridEventType[] | boolean;

  /**
   * How many collapsed detail rows keep their nested grid instance alive
   * (rather than destroyed) so re-expanding restores its live state —
   * sort, column order/width, scroll position, selection — instead of
   * rebuilding from scratch. Least-recently-collapsed instances beyond this
   * bound are evicted and destroyed to keep memory use constant regardless
   * of how many rows a user expands over a session. Default `10`.
   */
  keepDetailGridsCount?: number;
}
