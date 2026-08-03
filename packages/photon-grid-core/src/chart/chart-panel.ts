import type { ChartData } from './chart-data-transformer';
import type { ChartRenderOptions } from './chart-renderer';
import { ChartRenderer } from './chart-renderer';
import { resolveChartTheme } from './chart-theme';
import type { ChartToolbarItem } from '../types/grid.types';
import type { IconRenderer } from '../icons/icon-renderer';

/**
 * Chart types whose single dataset is drawn as one colored mark per category
 * (slice / row / spoke). Their legend and toggle are **per-category**, unlike
 * cartesian charts whose legend is per-series.
 */
const CATEGORICAL_TYPES = new Set<ChartPanelType>(['pie', 'doughnut', 'polar', 'funnel']);

export type ChartPanelType =
  | 'column-grouped' | 'column-stacked' | 'column-100stacked'
  | 'bar-grouped' | 'bar-stacked' | 'bar-100stacked'
  | 'pie' | 'doughnut'
  | 'line' | 'area'
  | 'scatter' | 'polar' | 'funnel';

/**
 * The controller behind a {@link ChartPanel}. The panel is a passive view: it
 * measures itself, asks the host for render options, and forwards toolbar-menu
 * actions and drag events back to the host. All chart state lives in the host.
 */
export interface ChartPanelHost {
  /** Render options (from the chart model) sized to the panel's plot area. */
  getRenderOptions(size: { width: number; height: number }): ChartRenderOptions;
  /** Which `⋮` menu items to show, in order. Empty hides the menu. */
  getToolbarItems(): ChartToolbarItem[];
  /** Whether the chart is currently detached from the grid. */
  isUnlinked(): boolean;
  /** "Edit Chart" — open the configuration tool panel. */
  onEditChart(): void;
  /** "Advanced Settings" — open the tool panel on the Customize tab. */
  onAdvancedSettings(): void;
  /**
   * Toggle the grid link: unlink freezes the chart as a snapshot, re-link
   * resumes live updates and immediately refreshes from the grid.
   */
  onToggleLink(): void;
  /** Fired as the panel card moves (drag / fullscreen / recenter) so the tool panel can re-dock. */
  onMove(rect: DOMRect): void;
  /** Fired when the panel closes so the host can dispose its chart. */
  onClose(): void;
}


/** Toolbar-menu descriptor for the `⋮` dropdown. */
interface ChartMenuEntry {
  readonly item: ChartToolbarItem;
  readonly label: string;
  readonly icon: string;
  readonly action: () => void;
}

export class ChartPanel {
  private backdropEl: HTMLElement | null = null;
  private cardEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private chartAreaEl: HTMLElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private dotsMenuEl: HTMLElement | null = null;
  private dotsBtnEl: HTMLElement | null = null;
  /**
   * Document-level `mousedown` listener that dismisses the download menu when
   * the user clicks outside it. Held so it can be detached on close, avoiding a
   * leaked listener across panel lifecycles.
   */
  private outsideMousedownHandler: ((e: MouseEvent) => void) | null = null;
  private fullscreenBtnEl: HTMLElement | null = null;
  private legendEl: HTMLElement | null = null;
  private renderer: ChartRenderer | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isFullscreen = false;
  private currentData: ChartData | null = null;
  private currentType: ChartPanelType = 'column-grouped';
  private currentTitle = '';
  /** Dataset indices the user has toggled off via the legend (cartesian charts). */
  private hiddenSeries = new Set<number>();
  /** Category/slice indices toggled off via the legend (categorical charts). */
  private hiddenSlices = new Set<number>();

  /** Current top-left position of the card within the backdrop. */
  private panelX = 0;
  private panelY = 0;

  /** Controller that supplies render options and handles menu/drag events. */
  private host: ChartPanelHost | null = null;
  /** Guards {@link close} against re-entrancy when the host disposes us. */
  private closing = false;

  /**
   * @param containerEl - Host element the panel mounts into.
   * @param iconRenderer - Resolves chart chrome icons through the shared
   *   registry, so they follow the active theme's icon pack like the rest of the
   *   grid. Optional only so the panel stays constructible in isolation; when
   *   absent, chrome renders without glyphs rather than with off-theme ones.
   */
  constructor(
    private containerEl: HTMLElement,
    private iconRenderer?: IconRenderer,
  ) {}

  /** Resolves a chrome icon, or `''` when no renderer was supplied. */
  private icon(name: string, size = 13): string {
    return this.iconRenderer?.renderToString(name, size) ?? '';
  }

  /** Attaches the controlling host. Must be set before {@link open}. */
  setHost(host: ChartPanelHost): void {
    this.host = host;
  }

  /**
   * Replaces the chart data and re-renders. Called by the host when the model
   * changes or the linked grid data refreshes. Rebuilds the interactive legend.
   */
  update(data: ChartData | null): void {
    this.currentData = data;
    if (data && this.shouldShowLegend(data)) this.buildLegend(data);
    else if (this.legendEl) this.legendEl.innerHTML = '';
    this.renderChart();
  }

  /** The chart card element, for external docking (e.g. the config tool panel). */
  getCardElement(): HTMLElement | null {
    return this.cardEl;
  }

  /**
   * The scrollable body element that hosts the canvas. The configuration drawer
   * mounts here so it slides in over the plot area while the header (close /
   * fullscreen) and legend stay accessible.
   */
  getBodyElement(): HTMLElement | null {
    return this.bodyEl;
  }

  /**
   * Reserves `px` of space on the right of the plot for the configuration drawer,
   * so the chart reflows beside it instead of being hidden underneath. Passing 0
   * releases the reservation. The chart re-renders to fill the new area (the
   * chart-area ResizeObserver also fires as the reflow transition runs).
   */
  setConfigReserve(px: number): void {
    if (!this.chartAreaEl) return;
    this.chartAreaEl.style.right = `${Math.max(0, px)}px`;
    this.renderChart();
  }

  /** Updates the chart type used for subsequent renders. */
  setChartType(type: ChartPanelType): void {
    // A genuine type change invalidates legend toggles (a hidden series index in
    // a bar chart is meaningless once the chart becomes a pie, and vice versa).
    if (type !== this.currentType) {
      this.hiddenSeries.clear();
      this.hiddenSlices.clear();
    }
    this.currentType = type;
  }

  /** Returns a data-URL snapshot of the current chart, or null if not rendered. */
  getImageDataURL(format: 'png' | 'jpeg' = 'png'): string | null {
    if (!this.canvasEl) return null;
    return this.canvasEl.toDataURL(`image/${format}`, 0.95);
  }

  /** Triggers a browser download of the chart. */
  download(format: 'png' | 'jpeg' = 'png'): void {
    this.downloadChart(format);
  }

  open(type: ChartPanelType, title: string, data: ChartData | null): void {
    this.close();
    this.currentType = type;
    this.currentTitle = title;
    this.currentData = data;
    this.isFullscreen = false;
    this.hiddenSeries = new Set();
    this.hiddenSlices = new Set();
    this.buildDom(title, data === null);
    if (data !== null) {
      if (this.shouldShowLegend(data)) this.buildLegend(data);
      this.renderChart();
    }
  }

  close(): void {
    if (this.closing) return;
    this.closing = true;
    // Whether an actual panel was mounted. `open()` calls `close()` first to
    // reset state; on a fresh panel nothing is mounted, and in that case we must
    // NOT fire `onClose` — doing so would dispose the just-created controller
    // before it ever renders. Only a real close (× button, backdrop click,
    // dispose) should notify the host.
    const wasMounted = this.backdropEl !== null;
    this.detachOutsideMousedown();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer?.destroy();
    this.renderer = null;
    this.backdropEl?.remove();
    this.backdropEl = null;
    this.cardEl = null;
    this.bodyEl = null;
    this.chartAreaEl = null;
    this.canvasEl = null;
    this.dotsMenuEl = null;
    this.dotsBtnEl = null;
    this.fullscreenBtnEl = null;
    this.legendEl = null;
    this.currentData = null;
    const host = this.host;
    this.closing = false;
    if (wasMounted) host?.onClose();
  }

  private buildDom(title: string, isEmpty: boolean): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'pg-chart-panel-backdrop pg-chart-panel-backdrop--open';
    // Intentionally no outside-click-to-close: the panel is dismissed only via
    // its own close (×) button, so a stray click on the grid never loses it.

    const card = document.createElement('div');
    card.className = 'pg-chart-panel';
    backdrop.appendChild(card);

    // Header
    const header = document.createElement('div');
    header.className = 'pg-chart-panel__header';

    const titleEl = document.createElement('div');
    titleEl.className = 'pg-chart-panel__title';
    titleEl.textContent = isEmpty ? 'Chart Range' : title;

    const actions = document.createElement('div');
    actions.className = 'pg-chart-panel__actions';

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'pg-chart-panel__action-btn';
    fullscreenBtn.title = 'Toggle fullscreen';
    fullscreenBtn.innerHTML = this.icon('fullscreen', 14);
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    const closeBtn = document.createElement('button');
    closeBtn.className = 'pg-chart-panel__action-btn';
    closeBtn.title = 'Close';
    closeBtn.innerHTML = this.icon('close', 14);
    closeBtn.addEventListener('click', () => this.close());

    actions.appendChild(fullscreenBtn);
    actions.appendChild(closeBtn);
    header.appendChild(titleEl);
    header.appendChild(actions);
    card.appendChild(header);

    // Body: a positioning context that holds the chart area and, when open, the
    // sliding configuration drawer. The chart area reflows (shrinks) to sit
    // beside the drawer rather than being hidden beneath it.
    const body = document.createElement('div');
    body.className = 'pg-chart-panel__body';

    const chartArea = document.createElement('div');
    chartArea.className = 'pg-chart-panel__chart-area';
    body.appendChild(chartArea);
    this.chartAreaEl = chartArea;

    if (isEmpty) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'pg-chart-panel__empty';
      emptyEl.innerHTML = `
        <span class="pg-chart-panel__empty-icon">${this.icon('emptyChart', 48)}</span>
        <span class="pg-chart-panel__empty-text">No chart data available</span>
        <span class="pg-chart-panel__empty-sub">Select cells that include Number, Currency, or Percentage columns</span>
      `;
      chartArea.appendChild(emptyEl);
    } else {
      const canvas = document.createElement('canvas');
      canvas.className = 'pg-chart-panel__canvas';
      chartArea.appendChild(canvas);

      this.canvasEl = canvas;
      this.buildDotsMenu(chartArea);

      // Observe the chart area (not the whole body) so the chart re-renders as it
      // reflows when the configuration drawer opens and closes.
      this.resizeObserver = new ResizeObserver(() => { this.renderChart(); });
      this.resizeObserver.observe(chartArea);
    }

    card.appendChild(body);

    // Legend sits below the body in the card's flex column; height is 0 when
    // empty (single-series chart) so it never wastes space.
    const legend = document.createElement('div');
    legend.className = 'pg-chart-panel__legend';
    card.appendChild(legend);
    this.legendEl = legend;

    this.containerEl.appendChild(backdrop);

    this.backdropEl = backdrop;
    this.cardEl = card;
    this.bodyEl = body;
    this.fullscreenBtnEl = fullscreenBtn;

    this.centerPanel();
    this.attachDrag(header);
  }

  /**
   * Builds the `⋮` toolbar button and its dropdown menu. Items come from the
   * host (Edit Chart / Advanced Settings / Unlink / Download); Download is always
   * handled internally. Skipped entirely when the host returns no items.
   */
  private buildDotsMenu(body: HTMLElement): void {
    const items = this.host ? this.host.getToolbarItems() : (['download'] as ChartToolbarItem[]);
    if (items.length === 0) return;

    const dotsBtn = document.createElement('button');
    dotsBtn.className = 'pg-chart-panel__dots-btn';
    dotsBtn.title = 'Chart menu';
    dotsBtn.innerHTML = this.icon('dots', 16);

    const dotsMenu = document.createElement('div');
    dotsMenu.className = 'pg-chart-panel__dots-menu';

    for (const entry of this.resolveMenuEntries(items)) {
      const btn = document.createElement('button');
      btn.className = 'pg-chart-panel__dots-item';
      btn.innerHTML = `${entry.icon} ${entry.label}`;
      btn.addEventListener('click', () => { entry.action(); this.closeDotsMenu(); });
      dotsMenu.appendChild(btn);
    }

    dotsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dotsMenu.classList.contains('pg-chart-panel__dots-menu--open');
      if (isOpen) {
        this.closeDotsMenu();
      } else {
        dotsMenu.classList.add('pg-chart-panel__dots-menu--open');
        dotsBtn.classList.add('pg-chart-panel__dots-btn--active');
        this.attachOutsideMousedown();
      }
    });

    body.appendChild(dotsBtn);
    body.appendChild(dotsMenu);
    this.dotsMenuEl = dotsMenu;
    this.dotsBtnEl = dotsBtn;
  }

  /** Expands the requested toolbar items into concrete menu entries (labels + actions). */
  private resolveMenuEntries(items: ChartToolbarItem[]): ChartMenuEntry[] {
    const entries: ChartMenuEntry[] = [];
    for (const item of items) {
      switch (item) {
        case 'edit':
          entries.push({ item, label: 'Edit Chart', icon: this.icon('edit'), action: () => this.host?.onEditChart() });
          break;
        case 'advancedSettings':
          entries.push({ item, label: 'Advanced Settings', icon: this.icon('advancedSettings'), action: () => this.host?.onAdvancedSettings() });
          break;
        case 'unlink': {
          // A reversible toggle: show the inverse action for the current state.
          const unlinked = this.host?.isUnlinked() ?? false;
          entries.push({
            item,
            label: unlinked ? 'Link to Grid' : 'Unlink from Grid',
            icon: this.icon(unlinked ? 'link' : 'unlink'),
            action: () => this.host?.onToggleLink(),
          });
          break;
        }
        case 'download':
          entries.push({ item, label: 'Download PNG', icon: this.icon('download'), action: () => this.downloadChart('png') });
          entries.push({ item, label: 'Download JPEG', icon: this.icon('download'), action: () => this.downloadChart('jpeg') });
          break;
      }
    }
    return entries;
  }

  /**
   * Position the card at the center of the backdrop.
   * Called once after building the DOM and on fullscreen exit.
   */
  private centerPanel(): void {
    if (!this.backdropEl || !this.cardEl) return;
    const bw = this.backdropEl.offsetWidth;
    const bh = this.backdropEl.offsetHeight;
    const cw = this.cardEl.offsetWidth;
    const ch = this.cardEl.offsetHeight;
    this.panelX = Math.max(0, (bw - cw) / 2);
    this.panelY = Math.max(0, (bh - ch) / 2);
    this.applyPosition();
  }

  private applyPosition(): void {
    if (!this.cardEl) return;
    this.cardEl.style.left = `${this.panelX}px`;
    this.cardEl.style.top = `${this.panelY}px`;
    this.host?.onMove(this.cardEl.getBoundingClientRect());
  }

  /**
   * Wire drag-to-move onto the header bar.
   * Clamped strictly within the backdrop bounds so the panel never escapes the grid.
   */
  private attachDrag(header: HTMLElement): void {
    header.addEventListener('mousedown', (e) => {
      if (this.isFullscreen) return;
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();

      const startMX = e.clientX;
      const startMY = e.clientY;
      const startPX = this.panelX;
      const startPY = this.panelY;

      header.classList.add('pg-chart-panel__header--dragging');
      this.cardEl?.classList.add('pg-chart-panel--dragging');

      const onMove = (mv: MouseEvent) => {
        if (!this.backdropEl || !this.cardEl) return;
        const maxX = this.backdropEl.offsetWidth  - this.cardEl.offsetWidth;
        const maxY = this.backdropEl.offsetHeight - this.cardEl.offsetHeight;
        this.panelX = Math.max(0, Math.min(startPX + mv.clientX - startMX, maxX));
        this.panelY = Math.max(0, Math.min(startPY + mv.clientY - startMY, maxY));
        this.applyPosition();
      };

      const onUp = () => {
        header.classList.remove('pg-chart-panel__header--dragging');
        this.cardEl?.classList.remove('pg-chart-panel--dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  private closeDotsMenu(): void {
    this.dotsMenuEl?.classList.remove('pg-chart-panel__dots-menu--open');
    this.dotsBtnEl?.classList.remove('pg-chart-panel__dots-btn--active');
    this.detachOutsideMousedown();
  }

  /**
   * Registers a document-level `mousedown` listener that dismisses the download
   * menu on an outside click.
   *
   * Clicks that land on the menu or its trigger button are deliberately ignored:
   * `mousedown` fires before `click`, so closing the menu here (which sets it to
   * `display: none`) would remove the menu item from the layout before its own
   * `click` handler could run — silently swallowing the download. Guarding on the
   * target keeps the menu alive long enough for the item's `click` to fire, then
   * that handler closes the menu itself.
   */
  private attachOutsideMousedown(): void {
    this.detachOutsideMousedown();
    const handler = (e: MouseEvent): void => {
      const target = e.target as Node | null;
      if (this.dotsMenuEl?.contains(target) || this.dotsBtnEl?.contains(target)) return;
      this.closeDotsMenu();
    };
    this.outsideMousedownHandler = handler;
    document.addEventListener('mousedown', handler);
  }

  /** Removes the outside-click listener registered by {@link attachOutsideMousedown}. */
  private detachOutsideMousedown(): void {
    if (this.outsideMousedownHandler) {
      document.removeEventListener('mousedown', this.outsideMousedownHandler);
      this.outsideMousedownHandler = null;
    }
  }

  private toggleFullscreen(): void {
    if (!this.cardEl || !this.fullscreenBtnEl) return;
    this.isFullscreen = !this.isFullscreen;
    this.cardEl.classList.toggle('pg-chart-panel--fullscreen', this.isFullscreen);
    this.fullscreenBtnEl.innerHTML = this.icon(this.isFullscreen ? 'fullscreenExit' : 'fullscreen', 14);
    this.fullscreenBtnEl.title = this.isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen';

    if (this.isFullscreen) {
      // Inset 16px from each edge to match calc(100% - 32px) dimensions
      this.panelX = 0;
      this.panelY = 0;
      this.applyPosition();
    } else {
      // Re-centre after layout recalculates the shrunk card dimensions
      setTimeout(() => { this.centerPanel(); this.renderChart(); }, 50);
      return;
    }
    setTimeout(() => this.renderChart(), 50);
  }

  private renderChart(): void {
    if (!this.canvasEl || !this.currentData || !this.cardEl) return;

    const body = this.canvasEl.parentElement;
    if (!body) return;

    const w = body.clientWidth - 16;
    const h = body.clientHeight - 16;
    if (w <= 0 || h <= 0) return;

    if (!this.renderer) {
      this.renderer = new ChartRenderer(this.canvasEl);
    }

    // Apply any hidden-slice toggles so a reflow/resize repaint doesn't resurrect
    // slices the user hid (cartesian series toggles are held in the renderer).
    const data = this.isCategorical() ? this.applyHiddenSlices(this.currentData) : this.currentData;
    this.renderer.render(data, this.resolveRenderOptions(w, h));
  }

  /**
   * Builds the render options for the current size. Prefers the host's model-derived
   * options, then forces `showLegend: false` because the panel draws its own
   * interactive HTML legend below the canvas. Falls back to a minimal default when
   * no host is attached.
   */
  private resolveRenderOptions(width: number, height: number): ChartRenderOptions {
    const base: ChartRenderOptions = this.host
      ? this.host.getRenderOptions({ width, height })
      : { type: this.currentType, width, height, showGrid: true, animationDuration: 400 };
    return { ...base, type: this.currentType, width, height, showLegend: false };
  }

  /**
   * Whether the HTML legend below the canvas should be shown for `data`:
   * multi-series cartesian charts (one item per series) OR any categorical
   * chart with at least one category (one item per slice/row/spoke).
   */
  private shouldShowLegend(data: ChartData): boolean {
    if (this.isCategorical()) return data.labels.length > 0;
    return data.datasets.length > 1;
  }

  /** Whether the current chart type draws one colored mark per category. */
  private isCategorical(): boolean {
    return CATEGORICAL_TYPES.has(this.currentType);
  }

  /** The resolved theme series palette, used to color per-slice legend swatches. */
  private palette(): readonly string[] {
    return this.canvasEl ? resolveChartTheme(this.canvasEl).palette : [];
  }

  /**
   * Populates the HTML legend bar. For categorical charts each item is a
   * category (slice); for cartesian charts each item is a series. Clicking an
   * item toggles that slice/series in or out with an animation and dims the
   * entry.
   */
  private buildLegend(data: ChartData): void {
    if (!this.legendEl) return;
    this.legendEl.innerHTML = '';

    const categorical = this.isCategorical();
    const pal = categorical ? this.palette() : [];
    const entries: Array<{ label: string; color: string }> = categorical
      ? data.labels.map((label, i) => ({ label, color: pal[i % Math.max(pal.length, 1)] ?? '#5470c6' }))
      : data.datasets.map((ds, i) => ({ label: ds.label, color: ds.color ?? '#5470c6' }));

    const hidden = categorical ? this.hiddenSlices : this.hiddenSeries;

    entries.forEach((entry, i) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'pg-chart-panel__legend-item';
      if (hidden.has(i)) item.classList.add('pg-chart-panel__legend-item--hidden');

      const swatch = document.createElement('span');
      swatch.className = 'pg-chart-panel__legend-swatch';
      swatch.style.background = entry.color;

      const label = document.createElement('span');
      label.className = 'pg-chart-panel__legend-label';
      label.textContent = entry.label;

      item.appendChild(swatch);
      item.appendChild(label);
      item.addEventListener('click', () => this.handleLegendToggle(i));
      this.legendEl!.appendChild(item);
    });
  }

  /**
   * Toggles a legend entry. For categorical charts this hides/shows a single
   * slice (its value is zeroed so sibling colors stay stable); for cartesian
   * charts it animates a whole series in/out.
   */
  private handleLegendToggle(index: number): void {
    if (!this.renderer || !this.currentData || !this.canvasEl) return;
    const body = this.canvasEl.parentElement;
    if (!body) return;
    const w = body.clientWidth - 16;
    const h = body.clientHeight - 16;
    if (w <= 0 || h <= 0) return;

    const hidden = this.isCategorical() ? this.hiddenSlices : this.hiddenSeries;
    const nowVisible = hidden.has(index); // toggling TO visible if currently hidden
    if (nowVisible) hidden.delete(index);
    else hidden.add(index);

    const item = this.legendEl?.children[index] as HTMLElement | undefined;
    item?.classList.toggle('pg-chart-panel__legend-item--hidden', !nowVisible);

    if (this.isCategorical()) {
      // Re-render from a copy with hidden slices zeroed — keeps slice→color
      // stable (drawPie colors by original index) and recomputes the total.
      this.renderer.render(this.applyHiddenSlices(this.currentData), this.resolveRenderOptions(w, h));
    } else {
      this.renderer.toggleSeries(index, nowVisible, this.currentData, this.resolveRenderOptions(w, h));
    }
  }

  /**
   * Returns a shallow copy of `data` with hidden categorical slices zeroed, so
   * they collapse to nothing while every remaining slice keeps its palette color
   * (which is assigned by original index).
   */
  private applyHiddenSlices(data: ChartData): ChartData {
    if (this.hiddenSlices.size === 0 || data.datasets.length === 0) return data;
    return {
      labels: data.labels,
      datasets: data.datasets.map((ds) => ({
        ...ds,
        data: ds.data.map((v, i) => (this.hiddenSlices.has(i) ? 0 : v)),
      })),
    };
  }

  private downloadChart(format: 'png' | 'jpeg'): void {
    if (!this.canvasEl) return;

    let sourceCanvas = this.canvasEl;

    // JPEG has no alpha channel — composite onto a white background so
    // transparent areas don't render as solid black.
    if (format === 'jpeg') {
      const offscreen = document.createElement('canvas');
      offscreen.width = this.canvasEl.width;
      offscreen.height = this.canvasEl.height;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        ctx.drawImage(this.canvasEl, 0, 0);
        sourceCanvas = offscreen;
      }
    }

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = sourceCanvas.toDataURL(mimeType, 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${this.currentTitle || 'chart'}.${format}`;
    // Must be in the DOM for the click to trigger a download in all browsers.
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
