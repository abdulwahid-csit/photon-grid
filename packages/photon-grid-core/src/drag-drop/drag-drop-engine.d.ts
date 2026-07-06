import type { EventBus } from '../event-bus/event-bus';
import { DragPreviewOptions } from './drag-preview';
export type DragType = 'row' | 'column' | 'group';
export interface DragItem {
    type: DragType;
    id: string;
    data: unknown;
    sourceIndex: number;
}
export interface DropTarget {
    el: HTMLElement;
    type: DragType;
    id: string;
    index: number;
    acceptsTypes: DragType[];
    onDragEnter?: (item: DragItem) => void;
    onDragLeave?: (item: DragItem) => void;
    onDrop?: (item: DragItem, position: 'before' | 'after' | 'inside') => void;
}
export interface DragSession {
    item: DragItem;
    sourceEl: HTMLElement;
    currentTarget: DropTarget | null;
    position: 'before' | 'after' | 'inside' | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    startTime: number;
}
export declare class DragDropEngine {
    private eventBus;
    private dropTargets;
    private currentSession;
    private preview;
    private autoscroll;
    private boundMouseMove;
    private boundMouseUp;
    private previewOptions;
    constructor(eventBus: EventBus);
    registerDropTarget(target: DropTarget): () => void;
    makeDraggable(el: HTMLElement, item: DragItem, scrollContainer?: HTMLElement, previewOpts?: DragPreviewOptions): () => void;
    setScrollContainer(el: HTMLElement): void;
    cancelDrag(): void;
    destroy(): void;
    private onMouseMove;
    private onMouseUp;
    private cleanupDrag;
    private findDropTarget;
    private calcDropPosition;
    private updateDropIndicator;
    private clearDropIndicator;
}
//# sourceMappingURL=drag-drop-engine.d.ts.map