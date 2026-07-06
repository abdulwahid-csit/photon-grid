import type { ColumnModel } from '../core/column-model';
import type { GridStore } from '../core/grid-store';
/**
 * Shows a floating, theme-styled tooltip for cells whose column defines
 * `renderer.tooltip`. Columns without one keep using the grid's existing,
 * essentially free native `title` attribute — this controller does nothing
 * for them, so it adds zero cost to the common case.
 *
 * Uses a single delegated `mouseover`/`mouseout` listener pair on the grid
 * body (not one listener per cell or per row), matching the cost profile of
 * the grid's existing delegated click handling.
 */
export declare class TooltipController {
    private readonly store;
    private readonly columnModel;
    private readonly api;
    private hostEl;
    private tooltipEl;
    private showTimer;
    private hoveredCellEl;
    private readonly boundMouseOver;
    private readonly boundMouseOut;
    constructor(store: GridStore, columnModel: ColumnModel, api: unknown);
    /** Attaches the delegated hover listeners to the grid body wrapper. */
    mount(bodyWrapEl: HTMLElement): void;
    /** Detaches listeners, clears any pending timer, and removes the tooltip element. */
    destroy(): void;
    private handleMouseOver;
    private handleMouseOut;
    private show;
    private hide;
    /** Positions the tooltip above the anchor cell, clamped to stay within the grid body. */
    private position;
    private clearShowTimer;
}
//# sourceMappingURL=tooltip-renderer.d.ts.map