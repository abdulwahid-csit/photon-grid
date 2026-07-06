import type { RowNode } from '../../types/row.types';
import type { GridOptions } from '../../types/grid.types';
import type { MasterDetailConfig } from '../../types/master-detail.types';
import type { GridStore } from '../../core/grid-store';
import type { RowModel } from '../../core/row-model';
import type { EventBus } from '../../event-bus/event-bus';
import type { Theme } from '../../types/theme.types';
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
export declare class MasterDetailEngine {
    private store;
    private eventBus;
    private rowModel;
    private config;
    /** Detail dataset fetched via `getDetailData`, keyed by parent row `nodeId`. Survives collapse/re-expand within the grid's lifetime. */
    private detailDataCache;
    /** Detail row height, keyed by parent row `nodeId` — set by auto-measurement or manual resize, read back on every `injectDetailRows` call so height survives pipeline re-runs. */
    private heightCache;
    /** Parent row node ids whose `getDetailData` fetch is in flight. */
    private pendingNodeIds;
    /** Node ids already evaluated against `defaultExpanded` — ensures a user-collapsed row is never re-expanded on the next pipeline run. */
    private defaultAppliedNodeIds;
    private refreshCallback;
    constructor(store: GridStore, eventBus: EventBus, rowModel: RowModel);
    /** Applies the grid's `masterDetail` option block. Called once from `GridCore.initialize`. */
    configure(config: MasterDetailConfig | undefined): void;
    isEnabled(): boolean;
    /** Read-only access to the active config — used by `DetailRowRenderer` to resolve `detailRendererFn`/`detailResizable`/`detailAutoHeight`. */
    getConfig(): MasterDetailConfig | null;
    /** Registers the callback used to re-run the pipeline after an async detail fetch resolves or a height changes. Wired from `GridCore`. */
    setRefreshCallback(fn: () => void): void;
    isExpanded(nodeId: string): boolean;
    /** Whether `rowData` is eligible for expansion at all (drives whether a toggle icon renders). */
    hasDetail(rowData: Record<string, unknown>): boolean;
    expand(row: RowNode): void;
    collapse(row: RowNode): void;
    toggle(row: RowNode): void;
    collapseAll(rows: RowNode[]): void;
    /** Whether `nodeId`'s `getDetailData` fetch is still in flight — `DetailRowRenderer` shows a loading state instead of mounting the nested grid. */
    isPending(nodeId: string): boolean;
    /**
     * The pipeline's final step (called from `GridApi.applyPipeline`, after
     * sort/group/paginate). Splices a `type: 'detail'` `RowNode` after every
     * expanded, detail-eligible `'data'` row. Works uniformly whether grouping
     * is active or not because grouping has already flattened its tree into a
     * linear array by this point — this is a pure "insert after" pass with no
     * knowledge of group structure.
     */
    injectDetailRows(rows: RowNode[]): RowNode[];
    getCachedDetailData(nodeId: string): Record<string, unknown>[] | undefined;
    /**
     * Updates a detail row's height (from auto-measurement or manual resize),
     * clamps it to the configured min/max, and — if it actually changed —
     * requests a pipeline refresh so `RowModel` relayouts subsequent rows.
     */
    setDetailHeight(nodeId: string, height: number): void;
    /**
     * Resolves the full `GridOptions` for a parent row's nested grid instance:
     * merges the static/factory `detailGrid` config, inherits the parent's
     * active theme unless overridden, and injects the fetched detail dataset.
     */
    resolveDetailGridOptions(row: RowNode, parentActiveTheme: Theme | null): GridOptions;
    destroy(): void;
    private clampHeight;
    private fetchDetailDataIfNeeded;
}
//# sourceMappingURL=master-detail-engine.d.ts.map