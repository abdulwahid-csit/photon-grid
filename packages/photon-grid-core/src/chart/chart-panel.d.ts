import type { ChartData } from './chart-data-transformer';
export type ChartPanelType = 'column-grouped' | 'column-stacked' | 'column-100stacked' | 'bar-grouped' | 'bar-stacked' | 'bar-100stacked' | 'pie' | 'doughnut' | 'line' | 'area' | 'scatter' | 'polar' | 'funnel';
export declare class ChartPanel {
    private containerEl;
    private backdropEl;
    private cardEl;
    private canvasEl;
    private dotsMenuEl;
    private dotsBtnEl;
    private fullscreenBtnEl;
    private legendEl;
    private renderer;
    private resizeObserver;
    private isFullscreen;
    private currentData;
    private currentType;
    private currentTitle;
    /** Dataset indices the user has toggled off via the legend. */
    private hiddenSeries;
    /** Current top-left position of the card within the backdrop. */
    private panelX;
    private panelY;
    constructor(containerEl: HTMLElement);
    open(type: ChartPanelType, title: string, data: ChartData | null): void;
    close(): void;
    private buildDom;
    /**
     * Position the card at the center of the backdrop.
     * Called once after building the DOM and on fullscreen exit.
     */
    private centerPanel;
    private applyPosition;
    /**
     * Wire drag-to-move onto the header bar.
     * Clamped strictly within the backdrop bounds so the panel never escapes the grid.
     */
    private attachDrag;
    private closeDotsMenu;
    private toggleFullscreen;
    private renderChart;
    /**
     * Populates the HTML legend bar with one clickable button per dataset.
     * Each button acts as a toggle: clicking animates the corresponding bars
     * in or out and dims the legend entry to signal its state.
     */
    private buildLegend;
    /**
     * Toggles a dataset's visibility with a smooth bar-height animation.
     * The legend item is dimmed while its series is hidden.
     */
    private handleLegendToggle;
    private downloadChart;
}
//# sourceMappingURL=chart-panel.d.ts.map