export declare class DragAutoscroll {
    private scrollEl;
    private rafId;
    private mouseX;
    private mouseY;
    attach(scrollEl: HTMLElement): void;
    detach(): void;
    onMouseMove(x: number, y: number): void;
    start(): void;
    stop(): void;
    private scroll;
    private calcSpeed;
}
//# sourceMappingURL=drag-autoscroll.d.ts.map