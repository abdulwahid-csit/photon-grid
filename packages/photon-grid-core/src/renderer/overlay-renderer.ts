import type { IconRenderer } from '../icons/icon-renderer';
import {
  LoadingBackdrop,
  LoadingIndicator,
  type ResolvedLoadingOverlayConfig,
} from '../types/loading.types';
import { createDiv } from './dom-utils';

/**
 * Body geometry the skeleton indicator lays its placeholder rows out against,
 * supplied by `GridRenderer` from values it has already computed for the frame.
 *
 * Deliberately carries column *identities* rather than widths. `ColumnStyleManager`
 * publishes `[data-photon-grid-id="…"] [data-col-id="X"] { width … }` into a
 * shared stylesheet that it rewrites on every frame of a resize drag, so a
 * placeholder cell tagged with `data-col-id` tracks its column's width with no
 * JavaScript at all — and, crucially, without this snapshot changing. Passing
 * widths instead would put them in the overlay's cache signature and rebuild
 * every placeholder row at 60fps for the duration of a resize drag.
 *
 * The row count is pre-bucketed for the same reason: a one-pixel container
 * resize must not invalidate the skeleton.
 */
export interface LoadingGeometry {
  /** Height of one placeholder row, in pixels. */
  readonly rowHeight: number;
  /** Placeholder rows needed to fill the viewport. `0` when unmeasured. */
  readonly viewportRows: number;
  /** Left-pinned column ids, in visual order. */
  readonly leftColIds: readonly string[];
  /** Unpinned (centre) column ids, in visual order. */
  readonly centerColIds: readonly string[];
  /** Right-pinned column ids, in visual order. */
  readonly rightColIds: readonly string[];
}

/** Placeholder row count used when the viewport has not been measured yet. */
const FALLBACK_SKELETON_ROWS = 8;

/** Placeholder cells drawn when the grid has no columns to align against. */
const FALLBACK_CELL_COUNT = 3;

export class OverlayRenderer {
  private loadingEl: HTMLElement | null = null;
  private noRowsEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private errorTimer: ReturnType<typeof setTimeout> | null = null;
  private containerEl: HTMLElement | null = null;

  /**
   * Pending {@link ResolvedLoadingOverlayConfig.delay} timer. At most one is
   * ever outstanding — a second `showLoading` replaces it rather than stacking,
   * and `hideLoading`/`destroy` clear it, so a rapid toggle can neither leak a
   * timer nor paint an overlay after the load finished.
   */
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Signature of the loading overlay currently mounted (or scheduled). The
   * renderer calls `showLoading` on every frame while the flag is set, so this
   * is what keeps a scroll or resize frame from rebuilding identical DOM.
   */
  private loadingSignature: string | null = null;

  /**
   * Whether the overlay currently shows an ad-hoc progress message rather than
   * the grid's own loading state.
   *
   * These two compete: an import drives the grid through `setColumns`/`setData`,
   * each of which schedules a render, and the render loop's non-loading path
   * hides the loading overlay. Without this flag the "Parsing…/Mapping…"
   * message would be wiped by the very next frame it caused.
   */
  private messageActive = false;

  constructor(private iconRenderer: IconRenderer) {}

  mount(containerEl: HTMLElement): void {
    this.containerEl = containerEl;
  }

  /**
   * Shows the configured loading indicator over the body.
   *
   * Idempotent: repeat calls with an equivalent config and geometry are a
   * no-op, so the per-frame call from `GridRenderer` costs one string compare
   * rather than a DOM rebuild.
   *
   * @param config   - Fully resolved overlay configuration.
   * @param geometry - Body geometry for the skeleton indicator. Optional; the
   *                   spinner ignores it, and the skeleton falls back to
   *                   sensible dimensions when it is absent.
   */
  showLoading(config: ResolvedLoadingOverlayConfig, geometry?: LoadingGeometry): void {
    // A live progress message is more informative than a generic spinner, so it
    // is not displaced by one.
    if (this.messageActive) return;

    const signature = this.buildLoadingSignature(config, geometry);
    if (signature === this.loadingSignature) return;

    // Config or geometry changed — drop whatever is on screen (or pending) and
    // rebuild against the new inputs.
    this.clearLoadingTimer();
    this.loadingEl?.remove();
    this.loadingEl = null;
    this.loadingSignature = signature;

    this.hideNoRows();

    const paint = (): void => {
      this.loadingTimer = null;
      // The grid may have been destroyed while the delay was pending.
      if (!this.containerEl) return;
      const overlay = this.buildLoadingOverlay(config, geometry);
      this.loadingEl = overlay;
      this.containerEl.appendChild(overlay);
    };

    // A load that resolves faster than `delay` never paints at all, which reads
    // as instantaneous rather than as a flicker.
    if (config.delay > 0) {
      this.loadingTimer = setTimeout(paint, config.delay);
      return;
    }
    paint();
  }

  /**
   * Shows a spinner with an ad-hoc message, bypassing the configured indicator.
   *
   * Used for transient, progress-reporting work that is not the grid's own
   * loading state — import progress, for example — where a skeleton would
   * misrepresent what is happening.
   *
   * @param text - Message to display beneath the spinner.
   */
  showLoadingMessage(text: string): void {
    this.hideLoading();
    this.hideNoRows();

    const overlay = this.buildSpinnerOverlay({
      indicator: LoadingIndicator.Spinner,
      text,
      showText: true,
      icon: 'loading',
      iconSize: 32,
      backdrop: LoadingBackdrop.Translucent,
      skeletonRows: 0,
      delay: 0,
      className: '',
    });

    this.loadingEl = overlay;
    this.messageActive = true;
    // No signature: an ad-hoc message is not a state the render loop reproduces,
    // so the next `showLoading` must be free to replace it.
    this.loadingSignature = null;
    this.containerEl?.appendChild(overlay);
  }

  /**
   * Hides the *state-driven* loading overlay, leaving an ad-hoc progress
   * message in place.
   *
   * This is what the render loop calls. An import schedules renders as it feeds
   * rows in, and each of those would otherwise tear down the progress message
   * the import itself put up.
   */
  hideLoadingState(): void {
    if (this.messageActive) return;
    this.hideLoading();
  }

  hideLoading(): void {
    this.clearLoadingTimer();
    this.loadingSignature = null;
    this.messageActive = false;
    this.loadingEl?.remove();
    this.loadingEl = null;
  }

  /**
   * Drops the cached overlay identity without unmounting anything, so the next
   * `showLoading` rebuilds even though its config compares equal to the last
   * one seen.
   *
   * Used when the configuration object itself was replaced: hiding first would
   * flash the body between the two paints.
   */
  invalidateLoadingSignature(): void {
    this.loadingSignature = null;
  }

  showNoRows(html?: string, text = 'No rows to show'): void {
    this.hideLoading();
    if (this.noRowsEl) return;

    const overlay = createDiv('pg-overlay pg-overlay--no-rows');
    overlay.setAttribute('role', 'status');

    if (html) {
      overlay.innerHTML = html;
    } else {
      const icon = this.iconRenderer.render('info', { size: 32, className: 'pg-overlay__icon' });
      const label = createDiv('pg-overlay__text');
      label.textContent = text;
      overlay.appendChild(icon);
      overlay.appendChild(label);
    }

    this.noRowsEl = overlay;
    this.containerEl?.appendChild(overlay);
  }

  hideNoRows(): void {
    this.noRowsEl?.remove();
    this.noRowsEl = null;
  }

  /**
   * Shows a compact, bottom-anchored error toast — used so import/validation
   * failures are visibly surfaced instead of failing silently. Auto-dismisses
   * after {@link autoHideMs} (pass `0` to keep it until {@link hideError}).
   *
   * @param text       - The user-facing error message.
   * @param autoHideMs - Auto-dismiss delay in ms. @default 6000
   */
  showError(text: string, autoHideMs = 6000): void {
    this.hideError();

    const overlay = createDiv('pg-overlay pg-overlay--error');
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'assertive');

    const icon = this.iconRenderer.render('warning', { size: 20, className: 'pg-overlay__icon' });
    const label = createDiv('pg-overlay__text');
    label.textContent = text;

    overlay.appendChild(icon);
    overlay.appendChild(label);

    this.errorEl = overlay;
    // this.containerEl?.appendChild(overlay);

    if (autoHideMs > 0) {
      this.errorTimer = setTimeout(() => this.hideError(), autoHideMs);
    }
  }

  hideError(): void {
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
      this.errorTimer = null;
    }
    this.errorEl?.remove();
    this.errorEl = null;
  }

  hideAll(): void {
    this.hideLoading();
    this.hideNoRows();
    this.hideError();
  }

  destroy(): void {
    this.hideAll();
    this.containerEl = null;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Clears any pending delayed paint. Safe to call when none is scheduled. */
  private clearLoadingTimer(): void {
    if (this.loadingTimer === null) return;
    clearTimeout(this.loadingTimer);
    this.loadingTimer = null;
  }

  /**
   * Compact identity of a loading overlay. Compared as a string rather than
   * field-by-field so the per-frame check stays a single comparison, and so
   * geometry (a variable-length width list) folds in without a loop.
   */
  private buildLoadingSignature(
    config: ResolvedLoadingOverlayConfig,
    geometry?: LoadingGeometry,
  ): string {
    const base = `${config.indicator}|${config.text}|${config.showText}|${config.icon}|${config.iconSize}|${config.backdrop}|${config.skeletonRows}|${config.delay}|${config.className}`;

    // Only the skeleton lays out against geometry; folding it into the spinner's
    // signature would rebuild an unchanged spinner whenever a column moved.
    //
    // Note what is deliberately *absent*: column widths and the raw viewport
    // height. Both change continuously during a resize drag, and including them
    // would rebuild every placeholder row at 60fps. Widths are carried by
    // `data-col-id` stylesheet rules instead, so the DOM built here is already
    // correct for any width the columns take.
    if (config.indicator !== LoadingIndicator.Skeleton || !geometry) return base;

    return `${base}#${geometry.rowHeight}|${geometry.viewportRows}|${geometry.leftColIds.join(',')}|${geometry.centerColIds.join(',')}|${geometry.rightColIds.join(',')}`;
  }

  /** Dispatches to the indicator-specific builder. */
  private buildLoadingOverlay(
    config: ResolvedLoadingOverlayConfig,
    geometry?: LoadingGeometry,
  ): HTMLElement {
    return config.indicator === LoadingIndicator.Skeleton
      ? this.buildSkeletonOverlay(config, geometry)
      : this.buildSpinnerOverlay(config);
  }

  /** Root element shared by both indicators, carrying the backdrop + a11y state. */
  private buildOverlayRoot(config: ResolvedLoadingOverlayConfig, modifier: string): HTMLElement {
    const classNames = [
      'pg-overlay',
      'pg-overlay--loading',
      `pg-overlay--${modifier}`,
      `pg-overlay--backdrop-${config.backdrop}`,
    ];
    if (config.className) classNames.push(config.className);

    const overlay = createDiv(classNames.join(' '));
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-busy', 'true');
    // Announced even when the caption is visually suppressed, so a screen
    // reader never gets a nameless busy region.
    overlay.setAttribute('aria-label', config.text);
    return overlay;
  }

  /** Centred spinner, with an optional caption beneath it. */
  private buildSpinnerOverlay(config: ResolvedLoadingOverlayConfig): HTMLElement {
    const overlay = this.buildOverlayRoot(config, 'spinner');

    const spinner = this.iconRenderer.render(config.icon, {
      size: config.iconSize,
      spin: true,
      className: 'pg-overlay__spinner',
    });
    this.iconRenderer.injectSpinKeyframes();
    overlay.appendChild(spinner);

    if (config.showText && config.text) {
      const label = createDiv('pg-overlay__text');
      label.textContent = config.text;
      overlay.appendChild(label);
    }

    return overlay;
  }

  /**
   * Placeholder rows aligned to the real column layout.
   *
   * Three panel tracks (left / centre / right) mirror the body's own panel
   * structure, so pinned columns stay pinned. Each cell carries `data-col-id`,
   * which `ColumnStyleManager`'s generated width rules target — so widths, and
   * live resize drags, cost this renderer nothing. The centre track uses the
   * same `--pg-scroll-x` custom property the real centre panel does, so it
   * follows horizontal scroll without a scroll listener.
   *
   * Reuses the `.pg-row--skeleton` / `.pg-cell` / `.pg-cell__inner` structure so
   * the shimmer bar, its per-column width variance and the reduced-motion
   * fallback all come from the shared `skeleton.css` rules rather than being
   * duplicated here. The whole tree is assembled into a `DocumentFragment` and
   * appended once, so N rows cost one layout, not N.
   */
  private buildSkeletonOverlay(
    config: ResolvedLoadingOverlayConfig,
    geometry?: LoadingGeometry,
  ): HTMLElement {
    const overlay = this.buildOverlayRoot(config, 'skeleton');

    const rowHeight = geometry?.rowHeight && geometry.rowHeight > 0 ? geometry.rowHeight : 48;

    // `0` means "fill the viewport" — a fixed count either leaves a gap below
    // the last placeholder or overdraws rows nobody sees.
    const rowCount =
      config.skeletonRows > 0
        ? config.skeletonRows
        : geometry && geometry.viewportRows > 0
          ? geometry.viewportRows
          : FALLBACK_SKELETON_ROWS;

    const body = createDiv('pg-loading-skeleton');
    body.style.setProperty('--pg-skeleton-row-height', `${rowHeight}px`);

    const left = geometry?.leftColIds ?? [];
    const center = geometry?.centerColIds ?? [];
    const right = geometry?.rightColIds ?? [];

    if (left.length + center.length + right.length === 0) {
      // No columns to align against (a grid still awaiting its first column
      // set). Untagged cells fall back to the stylesheet's default width.
      body.appendChild(this.buildSkeletonPanel('center', [], rowCount, FALLBACK_CELL_COUNT));
    } else {
      if (left.length) body.appendChild(this.buildSkeletonPanel('left', left, rowCount, 0));
      body.appendChild(this.buildSkeletonPanel('center', center, rowCount, 0));
      if (right.length) body.appendChild(this.buildSkeletonPanel('right', right, rowCount, 0));
    }

    overlay.appendChild(body);
    return overlay;
  }

  /**
   * One panel track of placeholder rows.
   *
   * @param panel        - Which body panel this mirrors, for the modifier class.
   * @param colIds       - Column ids to tag cells with, in visual order.
   * @param rowCount     - Placeholder rows to draw.
   * @param untaggedCells - Cells to draw per row when `colIds` is empty.
   */
  private buildSkeletonPanel(
    panel: 'left' | 'center' | 'right',
    colIds: readonly string[],
    rowCount: number,
    untaggedCells: number,
  ): HTMLElement {
    const panelEl = createDiv(`pg-loading-skeleton__panel pg-loading-skeleton__panel--${panel}`);
    const track = createDiv('pg-loading-skeleton__track');

    const cellCount = colIds.length > 0 ? colIds.length : untaggedCells;

    const fragment = document.createDocumentFragment();
    for (let r = 0; r < rowCount; r++) {
      const row = createDiv('pg-loading-skeleton__row pg-row--skeleton');
      for (let c = 0; c < cellCount; c++) {
        const cell = createDiv('pg-cell pg-loading-skeleton__cell');
        // The hook ColumnStyleManager's width rules target. Absent only in the
        // no-columns fallback, where the stylesheet default applies instead.
        if (colIds.length > 0) cell.setAttribute('data-col-id', colIds[c]);
        cell.appendChild(createDiv('pg-cell__inner'));
        row.appendChild(cell);
      }
      fragment.appendChild(row);
    }

    track.appendChild(fragment);
    panelEl.appendChild(track);
    return panelEl;
  }
}
