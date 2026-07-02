import type { RowNode } from '../types/row.types';
import type { GridOptions } from '../types/grid.types';
import type { GridCore } from '../core/grid-core';
import type { MasterDetailEngine } from '../engines/master-detail/master-detail-engine';
import type { IconRenderer } from '../icons/icon-renderer';
import type { ThemeManager } from '../theme/theme-manager';
import { GridEventType } from '../types/event.types';
import { detailNodeId } from '../types/row.types';
import { createDiv } from './dom-utils';

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
 * Inset (px, all sides) applied to `.pg-row--detail-container` in `base-styles.ts`
 * so the nested grid never touches the detail row's edges. Auto-height must add
 * this back in — `box-sizing: border-box` means the padding eats into the row's
 * own height, so the row needs to be taller than the nested grid's content by
 * exactly this much on top and bottom, or the nested grid would be clipped.
 */
const DETAIL_ROW_PADDING_PX = 20;

/** Fallback for `MasterDetailConfig.keepDetailGridsCount` when unset. */
const DEFAULT_KEEP_DETAIL_GRIDS_COUNT = 10;

interface DetailEntry {
  containerEl: HTMLElement;
  instance: GridCore | null;
  /** `true` once real content (nested grid or `detailRendererFn` output) has replaced the loading indicator. */
  contentBuilt: boolean;
  /** `true` once `beginCollapse` has started the shrink/fade-out — `sync()` must leave it alone until its own timer/transitionend destroys it. */
  collapsing: boolean;
  cleanupFns: Array<() => void>;
}

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
export class DetailRowRenderer {
  private layerEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;

  private entries = new Map<string, DetailEntry>();

  /**
   * Collapsed entries kept alive for instant, stateful re-expansion. Map
   * insertion order doubles as LRU order — re-inserting a key on access
   * moves it to the end, and eviction always removes the first (oldest) key.
   */
  private collapsedCache = new Map<string, DetailEntry>();

  private masterDetailEngine: MasterDetailEngine | null = null;
  private nestedGridFactory: NestedGridFactory | null = null;
  private iconRenderer: IconRenderer | null = null;
  private themeManager: ThemeManager | null = null;
  private parentApi: unknown = null;
  /** Forwards a wheel delta to the parent grid's own vertical scroll. Set by `GridRenderer` so nested grids never capture wheel gestures for themselves. */
  private parentScrollForwarder: ((delta: number) => void) | null = null;

  /** Mounts the full-width overlay layer as a sibling of the left/center/right body panels. */
  mount(bodyWrapEl: HTMLElement): void {
    this.layerEl = createDiv('pg-detail-layer');
    this.contentEl = createDiv('pg-detail-layer__content');
    this.layerEl.appendChild(this.contentEl);
    bodyWrapEl.appendChild(this.layerEl);
  }

  /** Wires collaborators. Called once from `GridCore.buildContext` via `GridRenderer.setMasterDetailConfig`. */
  setDependencies(
    engine: MasterDetailEngine,
    factory: NestedGridFactory,
    iconRenderer: IconRenderer,
    themeManager: ThemeManager,
  ): void {
    this.masterDetailEngine = engine;
    this.nestedGridFactory = factory;
    this.iconRenderer = iconRenderer;
    this.themeManager = themeManager;
  }

  /**
   * Wires the callback used to redirect wheel gestures over any nested grid
   * to the parent's own vertical scroll — see `attachWheelForwarding`.
   */
  setParentScrollForwarder(fn: (delta: number) => void): void {
    this.parentScrollForwarder = fn;
  }

  /** Late-bound once `GridApi` exists (after `GridCore`'s constructor finishes building context). Passed through to `detailRendererFn` as `parentApi`. */
  setParentApi(api: unknown): void {
    this.parentApi = api;
  }

  /**
   * Reconciles the overlay layer against the current detail rows.
   *
   * @param windowedDetailRows - `type === 'detail'` rows within the current
   *   virtualized render window — these get built/shown.
   * @param allDetailNodeIds - every `type === 'detail'` node id currently in
   *   `visibleRows` (not just the window) — anything cached but absent here
   *   was collapsed or its parent row was removed, and is torn down.
   */
  sync(windowedDetailRows: RowNode[], allDetailNodeIds: Set<string>): void {
    if (!this.contentEl || !this.masterDetailEngine) return;

    for (const [nodeId, entry] of this.entries) {
      // Entries already shrinking out via `beginCollapse` manage their own
      // teardown (transitionend / fallback timer) — leave them alone here,
      // or the animation would be skipped and the row would vanish instantly.
      if (entry.collapsing) continue;
      if (!allDetailNodeIds.has(nodeId)) {
        this.destroyEntry(entry);
        this.entries.delete(nodeId);
      }
    }

    const windowedIds = new Set(windowedDetailRows.map((r) => r.nodeId));
    for (const [nodeId, entry] of this.entries) {
      if (entry.collapsing) continue;
      if (!windowedIds.has(nodeId)) entry.containerEl.style.display = 'none';
    }

    for (const row of windowedDetailRows) {
      let entry = this.entries.get(row.nodeId);
      if (!entry) {
        entry = this.reviveOrBuildEntry(row);
        this.entries.set(row.nodeId, entry);
        this.playEnterAnimation(entry);
      }
      entry.containerEl.style.display = '';
      if (!entry.contentBuilt) this.tryBuildContent(entry, row);
    }
  }

  /** Reuses a cached collapsed entry (preserving its nested grid's live state) when one exists, otherwise builds a fresh one. */
  private reviveOrBuildEntry(row: RowNode): DetailEntry {
    const cached = this.collapsedCache.get(row.nodeId);
    if (cached) {
      this.collapsedCache.delete(row.nodeId);
      return cached;
    }
    return this.buildEntry(row);
  }

  /**
   * Begins the shrink/fade-out for `parentNodeId`'s detail row, called by
   * `GridCore` synchronously on collapse-click — **before** the pipeline
   * re-runs. This timing matters: once `MasterDetailEngine.injectDetailRows`
   * drops the row, `RowPositionSheet`'s rule for it disappears for good on
   * the very next render, so the current `top`/`height` must be captured and
   * frozen as inline styles now, while they're still valid, or there would be
   * nothing correct to animate from.
   */
  beginCollapse(parentNodeId: string): void {
    if (!this.contentEl) return;
    const nodeId = detailNodeId(parentNodeId);
    const entry = this.entries.get(nodeId);
    if (!entry || entry.collapsing) return;
    entry.collapsing = true;

    const parentRect = this.contentEl.getBoundingClientRect();
    const rect = entry.containerEl.getBoundingClientRect();
    entry.containerEl.style.top = `${rect.top - parentRect.top}px`;
    entry.containerEl.style.height = `${rect.height}px`;
    // Force layout so the frozen top/height commit as a distinct paint —
    // otherwise the browser may coalesce this write with the shrink below
    // into a single frame and skip the transition entirely.
    void entry.containerEl.offsetHeight;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      entry.containerEl.removeEventListener('transitionend', onTransitionEnd);
      if (this.entries.get(nodeId) === entry) {
        this.entries.delete(nodeId);
        this.cacheCollapsedEntry(nodeId, entry);
      }
    };
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'height') finish();
    };
    entry.containerEl.addEventListener('transitionend', onTransitionEnd);
    // Safety net — guarantees cleanup even if the element is hidden/removed
    // from layout mid-transition and never fires `transitionend`.
    setTimeout(finish, 260);

    requestAnimationFrame(() => {
      entry.containerEl.classList.add('pg-row--detail-collapsing');
      entry.containerEl.style.height = '0px';
    });
  }

  /**
   * Fades a freshly-created detail entry in. Height is left to the
   * `pg-row--detail-container` CSS transition — the value `RowPositionSheet`
   * assigns naturally animates from the initial (min/cached) height to the
   * auto-measured one once the nested grid finishes its first render.
   */
  private playEnterAnimation(entry: DetailEntry): void {
    entry.containerEl.classList.add('pg-row--detail-entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        entry.containerEl.classList.remove('pg-row--detail-entering');
      });
    });
  }

  destroy(): void {
    for (const entry of this.entries.values()) this.destroyEntry(entry);
    this.entries.clear();
    for (const entry of this.collapsedCache.values()) this.destroyEntry(entry);
    this.collapsedCache.clear();
    this.layerEl?.remove();
    this.layerEl = null;
    this.contentEl = null;
  }

  /** The nested `GridCore` instance mounted for `parentNodeId`'s detail row, or `undefined` if not expanded/not yet built. Backs `GridApi.getDetailGridApi`. */
  getNestedInstance(parentNodeId: string): GridCore | undefined {
    return this.entries.get(detailNodeId(parentNodeId))?.instance ?? undefined;
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private buildEntry(row: RowNode): DetailEntry {
    const containerEl = createDiv('pg-row pg-row--detail-container');
    containerEl.setAttribute('data-node-id', row.nodeId);
    this.contentEl!.appendChild(containerEl);
    return { containerEl, instance: null, contentBuilt: false, collapsing: false, cleanupFns: [] };
  }

  /**
   * Moves a just-collapsed entry into {@link collapsedCache} instead of
   * destroying it, so the next expand of the same row is instant and starts
   * from exactly where the user left it. Clears the transient collapse
   * animation's inline `top`/`height` overrides first — `RowPositionSheet`
   * governs this row's position again the moment its node id reappears in
   * the pipeline output on re-expand.
   */
  private cacheCollapsedEntry(nodeId: string, entry: DetailEntry): void {
    entry.collapsing = false;
    entry.containerEl.classList.remove('pg-row--detail-collapsing');
    entry.containerEl.style.removeProperty('top');
    entry.containerEl.style.removeProperty('height');
    entry.containerEl.style.display = 'none';

    // Re-inserting moves the key to the end for LRU-by-insertion-order.
    this.collapsedCache.delete(nodeId);
    this.collapsedCache.set(nodeId, entry);

    const keepCount = this.masterDetailEngine?.getConfig()?.keepDetailGridsCount ?? DEFAULT_KEEP_DETAIL_GRIDS_COUNT;
    while (this.collapsedCache.size > keepCount) {
      const oldestKey = this.collapsedCache.keys().next().value;
      if (oldestKey === undefined) break;
      const oldest = this.collapsedCache.get(oldestKey)!;
      this.collapsedCache.delete(oldestKey);
      this.destroyEntry(oldest);
    }
  }

  /**
   * Builds real detail content once the row's data is ready — shows a
   * loading indicator instead while `getDetailData` is still in flight, and
   * retries on the next `sync()` call (triggered by
   * `MasterDetailEngine`'s refresh callback when the fetch resolves).
   */
  private tryBuildContent(entry: DetailEntry, row: RowNode): void {
    const engine = this.masterDetailEngine!;
    const parentNodeId = row.parentNodeId!;

    if (engine.isPending(parentNodeId)) {
      if (!entry.containerEl.querySelector('.pg-detail-loading')) {
        entry.containerEl.appendChild(this.buildLoadingIndicator());
      }
      return;
    }

    entry.containerEl.innerHTML = '';
    const config = engine.getConfig();

    if (config?.detailRendererFn) {
      const result = config.detailRendererFn({
        rowData: row.data,
        nodeId: parentNodeId,
        containerEl: entry.containerEl,
        parentApi: this.parentApi,
      });
      if (result && result !== entry.containerEl) entry.containerEl.appendChild(result);
      entry.contentBuilt = true;
      return;
    }

    const nestedHost = createDiv('pg-detail-nested-grid-host');
    entry.containerEl.appendChild(nestedHost);

    const nestedOptions = engine.resolveDetailGridOptions(row, this.themeManager!.getActiveTheme());
    const instance = this.nestedGridFactory!(nestedHost, nestedOptions);
    entry.instance = instance;
    entry.contentBuilt = true;

    if (config?.detailResizable) {
      this.attachResizeHandle(entry, parentNodeId);
    } else if (config?.detailAutoHeight !== false) {
      this.observeAutoHeight(entry, parentNodeId, instance);
    }

    this.attachWheelForwarding(entry, instance);
  }

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
  private attachWheelForwarding(entry: DetailEntry, instance: GridCore): void {
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey) return; // let pinch-to-zoom through, matching ScrollController.onWheel's own guard
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // horizontal-dominant: let the nested grid scroll itself
      const nestedCanContinue = e.deltaY < 0 ? instance.api.canScrollUp() : instance.api.canScrollDown();
      if (nestedCanContinue) return; // let the nested grid's own scroll handle it
      e.preventDefault();
      e.stopPropagation();
      this.parentScrollForwarder?.(e.deltaY);
    };
    entry.containerEl.addEventListener('wheel', handler, { capture: true, passive: false });
    entry.cleanupFns.push(() => entry.containerEl.removeEventListener('wheel', handler, { capture: true }));
  }

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
  private observeAutoHeight(entry: DetailEntry, parentNodeId: string, instance: GridCore): void {
    const wrapperEl = entry.containerEl.querySelector<HTMLElement>('.pg-grid');
    if (!wrapperEl) return;

    const recompute = () => {
      const totalContentPx = parseFloat(wrapperEl.style.getPropertyValue('--pg-content-height')) || 0;
      const headerEl = wrapperEl.querySelector<HTMLElement>('.pg-grid__header');
      const footerEl = wrapperEl.querySelector<HTMLElement>('.pg-grid__footer');
      const chrome = (headerEl?.offsetHeight ?? 0) + (footerEl?.offsetHeight ?? 0) + 2; // + border
      this.masterDetailEngine!.setDetailHeight(parentNodeId, chrome + totalContentPx + DETAIL_ROW_PADDING_PX * 2);
    };

    const unsubscribe = instance.api.on(GridEventType.ROWS_RENDERED, () => requestAnimationFrame(recompute));
    entry.cleanupFns.push(unsubscribe);
    requestAnimationFrame(recompute);
  }

  /** Bottom-edge drag handle — mutually exclusive with auto-height; the user's explicit size takes priority. */
  private attachResizeHandle(entry: DetailEntry, parentNodeId: string): void {
    const handle = createDiv('pg-detail-resize-handle');
    handle.setAttribute('data-detail-resize-handle', '');
    entry.containerEl.appendChild(handle);

    let startY = 0;
    let startHeight = 0;

    const onMouseMove = (e: MouseEvent) => {
      this.masterDetailEngine!.setDetailHeight(parentNodeId, startHeight + (e.clientY - startY));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = entry.containerEl.getBoundingClientRect().height;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', onMouseDown);
    entry.cleanupFns.push(() => {
      handle.removeEventListener('mousedown', onMouseDown);
      onMouseUp();
    });
  }

  private buildLoadingIndicator(): HTMLElement {
    const el = createDiv('pg-detail-loading');
    el.appendChild(this.iconRenderer!.render('loading', { size: 20, spin: true }));
    this.iconRenderer!.injectSpinKeyframes();
    return el;
  }

  private destroyEntry(entry: DetailEntry): void {
    for (const fn of entry.cleanupFns) fn();
    entry.instance?.destroy();
    entry.containerEl.remove();
  }
}
