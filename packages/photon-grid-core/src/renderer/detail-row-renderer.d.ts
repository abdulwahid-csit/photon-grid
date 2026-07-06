import type { RowNode } from '../types/row.types';
import type { GridOptions } from '../types/grid.types';
import type { GridCore } from '../core/grid-core';
import type { MasterDetailEngine } from '../engines/master-detail/master-detail-engine';
import type { IconRenderer } from '../icons/icon-renderer';
import type { ThemeManager } from '../theme/theme-manager';
/**
 * Instantiates a nested `GridCore`. Injected by `GridCore` itself rather than
 * imported here — `grid-renderer.ts` (and therefore this module, which it
 * owns) must not depend on `grid-core.ts` at the module level, since
 * `GridCore` already imports `GridRenderer`. The `GridCore` return type is a
 * type-only reference and is erased at compile time, so it introduces no
 * runtime cycle.
 */
export type NestedGridFactory = (containerEl: HTMLElement, options: GridOptions) => GridCore;
/**
 * Renders Master/Detail rows as a full-width layer spanning the parent
 * grid's `bodyWrapEl`, independent of the left/center/right pinned-column
 * panels `BodyRenderer` owns.
 *
 * Living outside those panels is what makes the detail section span the
 * full grid width regardless of pinned columns and stay put during
 * horizontal scroll: its content wrapper only ever receives the vertical
 * `--pg-scroll-y` transform (see `base-styles.ts`), never the horizontal one.
 *
 * Detail containers are cached by `nodeId` and reused across renders exactly
 * like `BodyRenderer.renderedRowMap` — a nested `GridCore` instance is
 * expensive to construct (it builds an entire independent grid), so it is
 * created lazily on first expand. While a row remains expanded but scrolls
 * outside the virtualized render window, its container is hidden
 * (`display: none`) rather than destroyed, trading a small constant amount
 * of retained memory (bounded by how many rows a user has actually expanded)
 * for avoiding repeated fetch/mount/destroy churn on every scroll frame.
 *
 * On collapse, the entry is likewise not destroyed immediately — it moves
 * into {@link collapsedCache}, an LRU keyed by `MasterDetailConfig.keepDetailGridsCount`,
 * so re-expanding the same row restores the nested grid's live state (sort,
 * column order/width, scroll, selection) instead of rebuilding from scratch.
 * Only once evicted from that bounded cache is the instance actually destroyed.
 */
export declare class DetailRowRenderer {
    private layerEl;
    private contentEl;
    private entries;
    /**
     * Collapsed entries kept alive for instant, stateful re-expansion. Map
     * insertion order doubles as LRU order — re-inserting a key on access
     * moves it to the end, and eviction always removes the first (oldest) key.
     */
    private collapsedCache;
    private masterDetailEngine;
    private nestedGridFactory;
    private iconRenderer;
    private themeManager;
    private parentApi;
    /** Forwards a wheel delta to the parent grid's own vertical scroll. Set by `GridRenderer` so nested grids never capture wheel gestures for themselves. */
    private parentScrollForwarder;
    /** Mounts the full-width overlay layer as a sibling of the left/center/right body panels. */
    mount(bodyWrapEl: HTMLElement): void;
    /** Wires collaborators. Called once from `GridCore.buildContext` via `GridRenderer.setMasterDetailConfig`. */
    setDependencies(engine: MasterDetailEngine, factory: NestedGridFactory, iconRenderer: IconRenderer, themeManager: ThemeManager): void;
    /**
     * Wires the callback used to redirect wheel gestures over any nested grid
     * to the parent's own vertical scroll — see `attachWheelForwarding`.
     */
    setParentScrollForwarder(fn: (delta: number) => void): void;
    /** Late-bound once `GridApi` exists (after `GridCore`'s constructor finishes building context). Passed through to `detailRendererFn` as `parentApi`. */
    setParentApi(api: unknown): void;
    /**
     * Reconciles the overlay layer against the current detail rows.
     *
     * @param windowedDetailRows - `type === 'detail'` rows within the current
     *   virtualized render window — these get built/shown.
     * @param allDetailNodeIds - every `type === 'detail'` node id currently in
     *   `visibleRows` (not just the window) — anything cached but absent here
     *   was collapsed or its parent row was removed, and is torn down.
     */
    sync(windowedDetailRows: RowNode[], allDetailNodeIds: Set<string>): void;
    /** Reuses a cached collapsed entry (preserving its nested grid's live state) when one exists, otherwise builds a fresh one. */
    private reviveOrBuildEntry;
    /**
     * Begins the shrink/fade-out for `parentNodeId`'s detail row, called by
     * `GridCore` synchronously on collapse-click — **before** the pipeline
     * re-runs. This timing matters: once `MasterDetailEngine.injectDetailRows`
     * drops the row, `RowPositionSheet`'s rule for it disappears for good on
     * the very next render, so the current `top`/`height` must be captured and
     * frozen as inline styles now, while they're still valid, or there would be
     * nothing correct to animate from.
     */
    beginCollapse(parentNodeId: string): void;
    /**
     * Fades a freshly-created detail entry in. Height is left to the
     * `pg-row--detail-container` CSS transition — the value `RowPositionSheet`
     * assigns naturally animates from the initial (min/cached) height to the
     * auto-measured one once the nested grid finishes its first render.
     */
    private playEnterAnimation;
    destroy(): void;
    /** The nested `GridCore` instance mounted for `parentNodeId`'s detail row, or `undefined` if not expanded/not yet built. Backs `GridApi.getDetailGridApi`. */
    getNestedInstance(parentNodeId: string): GridCore | undefined;
    private buildEntry;
    /**
     * Moves a just-collapsed entry into {@link collapsedCache} instead of
     * destroying it, so the next expand of the same row is instant and starts
     * from exactly where the user left it. Clears the transient collapse
     * animation's inline `top`/`height` overrides first — `RowPositionSheet`
     * governs this row's position again the moment its node id reappears in
     * the pipeline output on re-expand.
     */
    private cacheCollapsedEntry;
    /**
     * Builds real detail content once the row's data is ready — shows a
     * loading indicator instead while `getDetailData` is still in flight, and
     * retries on the next `sync()` call (triggered by
     * `MasterDetailEngine`'s refresh callback when the fetch resolves).
     */
    private tryBuildContent;
    /**
     * Chains vertical wheel scroll between a nested grid and the parent, the
     * same way a native scrollable element nested in another one behaves:
     * the nested grid scrolls its own content first, and only once it has
     * reached its scroll boundary in the gesture's direction does the
     * remaining scroll pass through to the parent grid's own vertical scroll.
     * This is what makes an unlimited-height parent and a height-constrained
     * detail section (`detailMaxHeight`, `detailAutoHeight: false`) both fully
     * usable by wheel alone. Horizontal gestures are left alone entirely: the
     * nested grid has its own columns and always scrolls them itself.
     *
     * Attached in the *capture* phase on `entry.containerEl` — an ancestor of
     * the nested grid's own wheel listener (added in the bubble phase by
     * `ScrollController.mount`). Capture fires first, so returning early here
     * (nested can still scroll) simply lets that bubble-phase listener handle
     * the event normally; forwarding instead calls `stopPropagation` to keep
     * the event from ever reaching it, so there is no double-scroll either way.
     */
    private attachWheelForwarding;
    /**
     * Tracks the nested grid's natural content height by reading the
     * `--pg-content-height` CSS var its own `GridRenderer` already maintains
     * (`grid-renderer.ts` `performRender`), plus header/footer chrome —
     * recomputed whenever the nested grid re-renders. This avoids the
     * `ResizeObserver` feedback loop that would occur from measuring a
     * container whose height is itself derived from this same computation
     * (the nested grid's `.pg-grid` root is `height: 100%` of its host, so
     * observing the host's rendered size would just echo back what we set it to).
     */
    private observeAutoHeight;
    /** Bottom-edge drag handle — mutually exclusive with auto-height; the user's explicit size takes priority. */
    private attachResizeHandle;
    private buildLoadingIndicator;
    private destroyEntry;
}
//# sourceMappingURL=detail-row-renderer.d.ts.map