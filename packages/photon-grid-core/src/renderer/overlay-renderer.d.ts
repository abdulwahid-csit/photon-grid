import type { IconRenderer } from '../icons/icon-renderer';
export declare class OverlayRenderer {
    private iconRenderer;
    private loadingEl;
    private noRowsEl;
    private containerEl;
    constructor(iconRenderer: IconRenderer);
    mount(containerEl: HTMLElement): void;
    showLoading(text?: string): void;
    hideLoading(): void;
    showNoRows(html?: string, text?: string): void;
    hideNoRows(): void;
    hideAll(): void;
    destroy(): void;
}
//# sourceMappingURL=overlay-renderer.d.ts.map