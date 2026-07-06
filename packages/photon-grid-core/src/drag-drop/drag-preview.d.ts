export interface DragPreviewOptions {
    label?: string;
    icon?: string;
    count?: number;
    avatarUrl?: string;
    shape?: 'circle' | 'square';
}
export declare class DragPreview {
    private el;
    private offsetX;
    private offsetY;
    /**
     * Create a theme-styled floating drag preview.
     *
     * Visual styling belongs to `.pg-drag-preview` CSS rules; this method only
     * builds semantic children and data-driven classes.
     *
     * @param options - Label, icon, count badge, and optional avatar metadata.
     */
    create(options?: DragPreviewOptions): HTMLElement;
    moveTo(x: number, y: number): void;
    /**
     * Set the cursor-relative offset used by {@link moveTo}.
     *
     * @param x - Horizontal offset in CSS pixels.
     * @param y - Vertical offset in CSS pixels.
     */
    setOffset(x: number, y: number): void;
    /** Remove the current preview element from the DOM. */
    destroy(): void;
}
//# sourceMappingURL=drag-preview.d.ts.map