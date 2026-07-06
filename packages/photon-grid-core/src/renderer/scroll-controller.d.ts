export type ScrollYCallback = (scrollTop: number) => void;
export declare class ScrollController {
    private scrollTop;
    private scrollLeft;
    private totalHeight;
    private totalCenterWidth;
    private viewportHeight;
    private centerViewportWidth;
    private gridEl;
    private sbVNativeEl;
    private sbVSpacerEl;
    private sbHNativeEl;
    private sbHSpacerEl;
    private sbHRowEl;
    private abortCtrl;
    private resizeObs;
    private scrollYCb;
    private scrollXCb;
    /**
     * When `true`, the vertical scrollbar column is never collapsed to 0 width
     * — it stays reserved (a "stable gutter") even while `totalHeight <=
     * viewportHeight`. Set for Master/Detail grids: expanding/collapsing a
     * detail row changes total content height, which can tip whether a
     * scrollbar is needed at all — if the column collapsed and reappeared with
     * it, every flex column would jump to fill/re-cede that space on every
     * toggle. Reserving it unconditionally makes that a non-event.
     */
    private reserveVerticalGutter;
    onScrollY(cb: ScrollYCallback): void;
    onScrollX(cb: () => void): void;
    setReserveVerticalGutter(reserve: boolean): void;
    mount(gridEl: HTMLElement, bodyEl: HTMLElement, centerBodyEl: HTMLElement, sbVNativeEl: HTMLElement, sbVSpacerEl: HTMLElement, sbHNativeEl: HTMLElement, sbHSpacerEl: HTMLElement, sbHRowEl?: HTMLElement): void;
    updateSizes(totalHeight: number, totalCenterWidth: number): void;
    getScrollTop(): number;
    getScrollLeft(): number;
    /** Returns the current visible height of the body viewport in pixels. */
    getViewportHeight(): number;
    /** Returns the current visible width of the center body viewport in pixels. */
    getCenterViewportWidth(): number;
    canScrollLeft(): boolean;
    canScrollRight(): boolean;
    canScrollUp(): boolean;
    canScrollDown(): boolean;
    scrollToY(y: number): void;
    scrollToX(x: number): void;
    scrollToRow(rowIndex: number, rows: ReadonlyArray<{
        top: number;
    }>): void;
    scrollToTop(): void;
    destroy(): void;
    private clampScroll;
    private syncCSSVars;
    private syncScrollbars;
    private readonly onVNativeScroll;
    private readonly onHNativeScroll;
    private readonly onWheel;
}
//# sourceMappingURL=scroll-controller.d.ts.map