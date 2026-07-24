import type { IconRenderer } from '../icons/icon-renderer';
import { createDiv } from './dom-utils';

export class OverlayRenderer {
  private loadingEl: HTMLElement | null = null;
  private noRowsEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private errorTimer: ReturnType<typeof setTimeout> | null = null;
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
    this.containerEl?.appendChild(overlay);

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
}
