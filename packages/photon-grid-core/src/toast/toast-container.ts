/**
 * The **Toast Container** — owns the fixed, viewport-level layer and the six
 * per-position stacking regions that toasts mount into. Regions are created
 * lazily (a page that only ever shows bottom-right toasts allocates one region)
 * and the layer itself is `pointer-events: none` so it never blocks the app;
 * only the individual toasts re-enable pointer events.
 *
 * Insertion order places the newest toast nearest its docked edge (top regions
 * grow downward, bottom regions grow upward), configurable via `newestOnTop`.
 * All positioning/spacing is theme-driven CSS (`toast.css.ts`); this class only
 * sets the gap custom property.
 *
 * @packageDocumentation
 */

import { createDiv } from '../renderer/dom-utils';
import { ToastPosition } from './toast.types';

/** Manages the toast layer and its per-position regions. */
export class ToastContainer {
  private layerEl: HTMLElement | null = null;
  private readonly regions = new Map<ToastPosition, HTMLElement>();

  /**
   * @param host        - The element the layer is appended to (default `document.body`).
   * @param gap         - Gap between stacked toasts, in px.
   * @param newestOnTop - Render the newest toast nearest its docked edge.
   */
  constructor(
    private readonly host: HTMLElement,
    private gap: number,
    private newestOnTop: boolean,
  ) {}

  /** Updates the inter-toast gap (applied via a CSS custom property). */
  setGap(gap: number): void {
    this.gap = gap;
    this.layerEl?.style.setProperty('--pg-toast-gap', `${gap}px`);
  }

  /** Updates the newest-on-top ordering policy for subsequent mounts. */
  setNewestOnTop(value: boolean): void {
    this.newestOnTop = value;
  }

  /** Lazily creates the viewport layer. */
  private ensureLayer(): HTMLElement {
    if (!this.layerEl) {
      this.layerEl = createDiv('pg-toast-layer');
      this.layerEl.style.setProperty('--pg-toast-gap', `${this.gap}px`);
      this.host.appendChild(this.layerEl);
    }
    return this.layerEl;
  }

  /** Lazily creates the region for a position. */
  private ensureRegion(position: ToastPosition): HTMLElement {
    let region = this.regions.get(position);
    if (!region) {
      region = createDiv(`pg-toast-region pg-toast-region--${position}`);
      region.setAttribute('role', 'region');
      region.setAttribute('aria-label', 'Notifications');
      this.ensureLayer().appendChild(region);
      this.regions.set(position, region);
    }
    return region;
  }

  /**
   * Mounts a toast element at a position, ordered so the newest sits nearest the
   * docked edge.
   *
   * @param position - The docked position.
   * @param el       - The toast root element.
   */
  mount(position: ToastPosition, el: HTMLElement): void {
    const region = this.ensureRegion(position);
    const isTop = position.startsWith('top');
    // Newest nearest the docked edge: prepend for top regions, append for bottom.
    const prepend = isTop ? this.newestOnTop : !this.newestOnTop;
    if (prepend && region.firstChild) {
      region.insertBefore(el, region.firstChild);
    } else {
      region.appendChild(el);
    }
  }

  /**
   * Removes a toast element from the DOM.
   *
   * @param el - The toast root element.
   */
  unmount(el: HTMLElement): void {
    el.remove();
  }

  /** Removes the layer and all regions. */
  destroy(): void {
    this.layerEl?.remove();
    this.layerEl = null;
    this.regions.clear();
  }
}
