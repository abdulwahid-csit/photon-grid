import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
export declare class RowDragRenderer {
    private store;
    private eventBus;
    private iconRenderer;
    private ghostEl;
    private draggingNodeId;
    private dragLabel;
    private isDragging;
    private gridEl;
    private bodyWrapEl;
    private targetNodeId;
    private targetPosition;
    /** `true` when Tree Data is active — switches drop-zone classification from a 2-way (before/after) to a 3-way (before/inside/after) split, and routes the commit through `treeReparentHandler` instead of the flat splice. Set via `setTreeMode`, called from `GridCore` only when a mutable hierarchy source (`parentId`/`childrenField`) is configured. */
    private treeModeActive;
    private treeReparentHandler;
    private scrollFn;
    private autoScrollRAF;
    private cursorX;
    private cursorY;
    private boundMouseDown;
    private boundMouseMove;
    private boundMouseUp;
    constructor(store: GridStore, eventBus: EventBus, iconRenderer: IconRenderer);
    mount(gridEl: HTMLElement, bodyWrapEl: HTMLElement, scrollFn: (dy: number) => void): void;
    /**
     * Enables Tree Data drag-to-reparent. `reparentHandler` is called on drop
     * with the resolved `'before'|'after'|'inside'` position and should mutate
     * the raw hierarchy + trigger a pipeline refresh (see
     * `TreeDataService.moveNode`) — this renderer never touches tree structure
     * itself, only mouse tracking and drop-zone classification.
     */
    setTreeMode(active: boolean, reparentHandler: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean): void;
    destroy(): void;
    private onMouseDown;
    private startDrag;
    private onMouseMove;
    private updateDropTarget;
    /** Tree mode's drop feedback: highlights the target row and flags whether the drop would nest the dragged row inside it. */
    private updateTreeDropHighlight;
    /** 2-way (before/after) split normally; 3-way (before/inside/after, thirds) when Tree Data drag-to-reparent is active. */
    private classifyDropPosition;
    private onMouseUp;
    private startAutoScrollLoop;
    private autoScrollTick;
    private updateRowTops;
    private clearDragTops;
    private getOrCreateTopStyle;
    private reorderRows;
    private getScrollTop;
    private setDraggingClass;
    private cleanupInteraction;
    private cleanupVisuals;
    private cleanup;
}
//# sourceMappingURL=row-drag-renderer.d.ts.map