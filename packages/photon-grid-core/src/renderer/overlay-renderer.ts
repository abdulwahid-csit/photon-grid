import type { IconRenderer } from '../icons/icon-renderer';
import { createDiv } from './dom-utils';

export class OverlayRenderer {
  private loadingEl: HTMLElement | null = null;
  private noRowsEl: HTMLElement | null = null;
  private containerEl: HTMLElement | null = null;

  constructor(private iconRenderer: IconRenderer) {}

  mount(containerEl: HTMLElement): void {
    this.containerEl = containerEl;
  }

  showLoading(text = 'Loading…'): void {
    this.hideNoRows();
    if (this.loadingEl) return;

    const overlay = createDiv('pg-overlay pg-overlay--loading');
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');

    const spinner = this.iconRenderer.render('loading', { size: 32, spin: true, className: 'pg-overlay__spinner' });
    this.iconRenderer.injectSpinKeyframes();

    const label = createDiv('pg-overlay__text');
    label.textContent = text;

    overlay.appendChild(spinner);
    overlay.appendChild(label);

    this.loadingEl = overlay;
    this.containerEl?.appendChild(overlay);
  }

  hideLoading(): void {
    this.loadingEl?.remove();
    this.loadingEl = null;
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

  hideAll(): void {
    this.hideLoading();
    this.hideNoRows();
  }

  destroy(): void {
    this.hideAll();
    this.containerEl = null;
  }
}
