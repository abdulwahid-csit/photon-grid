import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
import type { PaginationEngine } from '../engines/pagination/pagination-engine';
export interface FooterRendererOptions {
    showPagination?: boolean;
    showRowCount?: boolean;
    footerHeight?: number;
}
export declare class FooterRenderer {
    private eventBus;
    private iconRenderer;
    private paginationEngine;
    private footerEl;
    private pageInfoEl;
    private pageInputEl;
    constructor(eventBus: EventBus, iconRenderer: IconRenderer, paginationEngine: PaginationEngine);
    render(containerEl: HTMLElement, options?: FooterRendererOptions): HTMLElement;
    updatePaginationState(): void;
    destroy(): void;
    private buildPaginationControls;
    private buildNavButton;
    private buildPageSizeSelect;
    private getConfig;
}
//# sourceMappingURL=footer-renderer.d.ts.map