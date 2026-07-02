import type { RowNode } from '../../types/row.types';
import type { GridOptions } from '../../types/grid.types';
import type { MasterDetailConfig } from '../../types/master-detail.types';
import type { GridStore } from '../../core/grid-store';
import type { RowModel } from '../../core/row-model';
import type { EventBus } from '../../event-bus/event-bus';
import type { Theme, BuiltInThemeName } from '../../types/theme.types';
import { GridEventType } from '../../types/event.types';

const DEFAULT_DETAIL_HEIGHT = 200;

/**
 * Drives the Master/Detail row-expansion feature.
 *
 * Owns expanded/collapsed state (repurposing the previously-unused
 * `GridStore.expandedRowIds`, mirroring how `GroupingEngine` owns
 * `expandedGroupKeys`), the per-row detail-height cache that survives pipeline
 * re-runs, and the async fetch/cache lifecycle for `getDetailData`.
 *
 * Deliberately holds no reference to `GridApi` or the renderer — like every
 * other engine in `GridContext`, it is a pure state/data layer. Rendering
 * (nested grid instantiation, DOM) lives entirely in `DetailRowRenderer`.
 */
export class MasterDetailEngine {
  private config: MasterDetailConfig | null = null;

  /** Detail dataset fetched via `getDetailData`, keyed by parent row `nodeId`. Survives collapse/re-expand within the grid's lifetime. */
  private detailDataCache = new Map<string, Record<string, unknown>[]>();

  /** Detail row height, keyed by parent row `nodeId` — set by auto-measurement or manual resize, read back on every `injectDetailRows` call so height survives pipeline re-runs. */
  private heightCache = new Map<string, number>();

  /** Parent row node ids whose `getDetailData` fetch is in flight. */
  private pendingNodeIds = new Set<string>();

  /** Node ids already evaluated against `defaultExpanded` — ensures a user-collapsed row is never re-expanded on the next pipeline run. */
  private defaultAppliedNodeIds = new Set<string>();

  private refreshCallback: (() => void) | null = null;

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
    private rowModel: RowModel,
  ) {}

  /** Applies the grid's `masterDetail` option block. Called once from `GridCore.initialize`. */
  configure(config: MasterDetailConfig | undefined): void {
    this.config = config?.enabled ? config : null;
  }

  isEnabled(): boolean {
    return this.config !== null;
  }

  /** Read-only access to the active config — used by `DetailRowRenderer` to resolve `detailRendererFn`/`detailResizable`/`detailAutoHeight`. */
  getConfig(): MasterDetailConfig | null {
    return this.config;
  }

  /** Registers the callback used to re-run the pipeline after an async detail fetch resolves or a height changes. Wired from `GridCore`. */
  setRefreshCallback(fn: () => void): void {
    this.refreshCallback = fn;
  }

  isExpanded(nodeId: string): boolean {
    return this.store.get('expandedRowIds').has(nodeId);
  }

  /** Whether `rowData` is eligible for expansion at all (drives whether a toggle icon renders). */
  hasDetail(rowData: Record<string, unknown>): boolean {
    return this.config?.hasDetail ? this.config.hasDetail(rowData) : true;
  }

  expand(row: RowNode): void {
    if (!this.config || this.isExpanded(row.nodeId)) return;
    const keys = new Set(this.store.get('expandedRowIds'));
    keys.add(row.nodeId);
    this.store.set('expandedRowIds', keys);
    this.fetchDetailDataIfNeeded(row);
    this.eventBus.emit(GridEventType.ROW_DETAIL_OPENED, { nodeId: row.nodeId, row });
  }

  collapse(row: RowNode): void {
    if (!this.isExpanded(row.nodeId)) return;
    const keys = new Set(this.store.get('expandedRowIds'));
    keys.delete(row.nodeId);
    this.store.set('expandedRowIds', keys);
    this.eventBus.emit(GridEventType.ROW_DETAIL_CLOSED, { nodeId: row.nodeId, row });
  }

  toggle(row: RowNode): void {
    if (this.isExpanded(row.nodeId)) this.collapse(row);
    else this.expand(row);
  }

  collapseAll(rows: RowNode[]): void {
    for (const row of rows) {
      if (row.type === 'data' && this.isExpanded(row.nodeId)) this.collapse(row);
    }
  }

  /** Whether `nodeId`'s `getDetailData` fetch is still in flight — `DetailRowRenderer` shows a loading state instead of mounting the nested grid. */
  isPending(nodeId: string): boolean {
    return this.pendingNodeIds.has(nodeId);
  }

  /**
   * The pipeline's final step (called from `GridApi.applyPipeline`, after
   * sort/group/paginate). Splices a `type: 'detail'` `RowNode` after every
   * expanded, detail-eligible `'data'` row. Works uniformly whether grouping
   * is active or not because grouping has already flattened its tree into a
   * linear array by this point — this is a pure "insert after" pass with no
   * knowledge of group structure.
   */
  injectDetailRows(rows: RowNode[]): RowNode[] {
    if (!this.config) return rows;

    if (this.config.defaultExpanded) {
      for (const row of rows) {
        if (row.type !== 'data' || this.defaultAppliedNodeIds.has(row.nodeId)) continue;
        this.defaultAppliedNodeIds.add(row.nodeId);
        if (this.hasDetail(row.data)) this.expand(row);
      }
    }

    const expanded = this.store.get('expandedRowIds');
    if (expanded.size === 0) return rows;

    const result: RowNode[] = [];
    for (const row of rows) {
      result.push(row);
      if (row.type === 'data' && expanded.has(row.nodeId) && this.hasDetail(row.data)) {
        const height = this.heightCache.get(row.nodeId) ?? this.config.detailFixedHeight ?? DEFAULT_DETAIL_HEIGHT;
        const clamped = this.clampHeight(height);
        result.push(this.rowModel.createDetailNode(row, row.data, clamped));
      }
    }
    return result;
  }

  getCachedDetailData(nodeId: string): Record<string, unknown>[] | undefined {
    return this.detailDataCache.get(nodeId);
  }

  /**
   * Updates a detail row's height (from auto-measurement or manual resize),
   * clamps it to the configured min/max, and — if it actually changed —
   * requests a pipeline refresh so `RowModel` relayouts subsequent rows.
   */
  setDetailHeight(nodeId: string, height: number): void {
    const clamped = this.clampHeight(height);
    if (this.heightCache.get(nodeId) === clamped) return;
    this.heightCache.set(nodeId, clamped);
    this.eventBus.emit(GridEventType.ROW_DETAIL_HEIGHT_CHANGED, { nodeId, height: clamped });
    this.refreshCallback?.();
  }

  /**
   * Resolves the full `GridOptions` for a parent row's nested grid instance:
   * merges the static/factory `detailGrid` config, inherits the parent's
   * active theme unless overridden, and injects the fetched detail dataset.
   */
  resolveDetailGridOptions(
    row: RowNode,
    parentActiveTheme: Theme | null,
  ): GridOptions {
    const detailGridCfg = this.config?.detailGrid;
    const base: GridOptions = detailGridCfg
      ? (typeof detailGridCfg === 'function' ? detailGridCfg(row.data) : detailGridCfg)
      : { columns: [] };

    const theme: BuiltInThemeName | string | Theme | undefined =
      base.theme ?? (parentActiveTheme as unknown as (BuiltInThemeName | string) | undefined) ?? undefined;

    // `row` here is the `type: 'detail'` node — its own `nodeId` is
    // `detail_<parentNodeId>` (see `detailNodeId`), while the fetched
    // dataset is cached under the *parent* row's plain `nodeId`
    // (`fetchDetailDataIfNeeded` is keyed by the parent). Must use
    // `parentNodeId` here, not `row.nodeId`, or the cache lookup always misses.
    return {
      ...base,
      theme: theme as GridOptions['theme'],
      data: base.data ?? this.detailDataCache.get(row.parentNodeId ?? row.nodeId) ?? [],
    };
  }

  destroy(): void {
    this.detailDataCache.clear();
    this.heightCache.clear();
    this.pendingNodeIds.clear();
    this.defaultAppliedNodeIds.clear();
    this.refreshCallback = null;
  }

  private clampHeight(height: number): number {
    const min = this.config?.detailMinHeight;
    const max = this.config?.detailMaxHeight;
    let h = height;
    if (min != null) h = Math.max(min, h);
    if (max != null) h = Math.min(max, h);
    return h;
  }

  private fetchDetailDataIfNeeded(row: RowNode): void {
    const getDetailData = this.config?.getDetailData;
    if (!getDetailData || this.detailDataCache.has(row.nodeId)) return;

    const result = getDetailData(row.data);
    if (!(result instanceof Promise)) {
      this.detailDataCache.set(row.nodeId, result);
      return;
    }

    this.pendingNodeIds.add(row.nodeId);
    result
      .then((data) => {
        this.detailDataCache.set(row.nodeId, data);
      })
      .catch((err) => {
        console.error(`[PhotonGrid] masterDetail.getDetailData failed for row "${row.nodeId}":`, err);
        this.detailDataCache.set(row.nodeId, []);
      })
      .finally(() => {
        this.pendingNodeIds.delete(row.nodeId);
        this.refreshCallback?.();
      });
  }
}
