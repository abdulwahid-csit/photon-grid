import { createDiv } from './dom-utils';
export class OverlayRenderer {
    constructor(iconRenderer) {
        this.iconRenderer = iconRenderer;
        this.loadingEl = null;
        this.noRowsEl = null;
        this.containerEl = null;
    }
    mount(containerEl) {
        this.containerEl = containerEl;
    }
    showLoading(text = 'Loading…') {
        this.hideNoRows();
        if (this.loadingEl)
            return;
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
    hideLoading() {
        this.loadingEl?.remove();
        this.loadingEl = null;
    }
    showNoRows(html, text = 'No rows to show') {
        this.hideLoading();
        if (this.noRowsEl)
            return;
        const overlay = createDiv('pg-overlay pg-overlay--no-rows');
        overlay.setAttribute('role', 'status');
        if (html) {
            overlay.innerHTML = html;
        }
        else {
            const icon = this.iconRenderer.render('info', { size: 32, className: 'pg-overlay__icon' });
            const label = createDiv('pg-overlay__text');
            label.textContent = text;
            overlay.appendChild(icon);
            overlay.appendChild(label);
        }
        this.noRowsEl = overlay;
        this.containerEl?.appendChild(overlay);
    }
    hideNoRows() {
        this.noRowsEl?.remove();
        this.noRowsEl = null;
    }
    hideAll() {
        this.hideLoading();
        this.hideNoRows();
    }
    destroy() {
        this.hideAll();
        this.containerEl = null;
    }
}
//# sourceMappingURL=overlay-renderer.js.map