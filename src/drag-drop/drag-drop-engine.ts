import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import { DragPreview, DragPreviewOptions } from './drag-preview';
import { DragAutoscroll } from './drag-autoscroll';

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

const DRAG_THRESHOLD = 4;
const DRAG_DELAY = 0;

export class DragDropEngine {
  private dropTargets = new Map<string, DropTarget>();
  private currentSession: DragSession | null = null;
  private preview = new DragPreview();
  private autoscroll = new DragAutoscroll();
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private previewOptions: DragPreviewOptions = {};

  constructor(private eventBus: EventBus) {
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
  }

  registerDropTarget(target: DropTarget): () => void {
    this.dropTargets.set(target.id, target);
    return () => this.dropTargets.delete(target.id);
  }

  makeDraggable(
    el: HTMLElement,
    item: DragItem,
    scrollContainer?: HTMLElement,
    previewOpts?: DragPreviewOptions,
  ): () => void {
    if (previewOpts) this.previewOptions = previewOpts;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      this.currentSession = {
        item,
        sourceEl: el,
        currentTarget: null,
        position: null,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        isDragging: false,
        startTime: Date.now(),
      };

      if (scrollContainer) this.autoscroll.attach(scrollContainer);

      document.addEventListener('mousemove', this.boundMouseMove);
      document.addEventListener('mouseup', this.boundMouseUp);
    };

    el.addEventListener('mousedown', onMouseDown);
    el.style.cursor = 'grab';
    el.setAttribute('data-draggable', item.type);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.style.cursor = '';
      el.removeAttribute('data-draggable');
    };
  }

  setScrollContainer(el: HTMLElement): void {
    this.autoscroll.attach(el);
  }

  cancelDrag(): void {
    if (this.currentSession) {
      this.cleanupDrag(true);
    }
  }

  destroy(): void {
    this.cancelDrag();
    this.autoscroll.detach();
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.currentSession) return;

    const session = this.currentSession;
    session.currentX = e.clientX;
    session.currentY = e.clientY;

    if (!session.isDragging) {
      const dx = Math.abs(e.clientX - session.startX);
      const dy = Math.abs(e.clientY - session.startY);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;

      session.isDragging = true;
      session.sourceEl.classList.add('pg-dragging');
      this.preview.create(this.previewOptions);
      this.autoscroll.start();
      this.eventBus.emit(GridEventType.DRAG_STARTED, { item: session.item });
    }

    this.preview.moveTo(e.clientX, e.clientY);
    this.autoscroll.onMouseMove(e.clientX, e.clientY);

    const hitTarget = this.findDropTarget(e.clientX, e.clientY, session.item);

    if (hitTarget !== session.currentTarget) {
      if (session.currentTarget) {
        session.currentTarget.el.classList.remove('pg-drop-over');
        session.currentTarget.onDragLeave?.(session.item);
      }
      session.currentTarget = hitTarget;
      if (hitTarget) {
        hitTarget.el.classList.add('pg-drop-over');
        hitTarget.onDragEnter?.(session.item);
      }
    }

    if (hitTarget) {
      session.position = this.calcDropPosition(e.clientY, hitTarget.el);
      this.updateDropIndicator(hitTarget.el, session.position);
    }

    this.eventBus.emit(GridEventType.DRAG_OVER, {
      item: session.item,
      targetId: hitTarget?.id ?? null,
      position: session.position,
    });
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.currentSession) return;
    const session = this.currentSession;

    if (session.isDragging && session.currentTarget && session.position) {
      session.currentTarget.onDrop?.(session.item, session.position);
      this.eventBus.emit(GridEventType.DRAG_STOPPED, {
        item: session.item,
        targetId: session.currentTarget.id,
        position: session.position,
        accepted: true,
      });
    } else {
      this.eventBus.emit(GridEventType.DRAG_STOPPED, {
        item: session.item,
        targetId: null,
        position: null,
        accepted: false,
      });
    }

    this.cleanupDrag(false);
  }

  private cleanupDrag(cancelled: boolean): void {
    if (!this.currentSession) return;
    const session = this.currentSession;

    session.sourceEl.classList.remove('pg-dragging');
    if (session.currentTarget) {
      session.currentTarget.el.classList.remove('pg-drop-over');
      this.clearDropIndicator(session.currentTarget.el);
    }

    this.preview.destroy();
    this.autoscroll.stop();
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    this.currentSession = null;
  }

  private findDropTarget(
    x: number,
    y: number,
    dragItem: DragItem,
  ): DropTarget | null {
    let best: DropTarget | null = null;
    for (const target of this.dropTargets.values()) {
      if (!target.acceptsTypes.includes(dragItem.type)) continue;
      if (target.id === dragItem.id) continue;
      const rect = target.el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        best = target;
      }
    }
    return best;
  }

  private calcDropPosition(
    mouseY: number,
    el: HTMLElement,
  ): 'before' | 'after' | 'inside' {
    const rect = el.getBoundingClientRect();
    const relY = mouseY - rect.top;
    const ratio = relY / rect.height;
    if (ratio < 0.25) return 'before';
    if (ratio > 0.75) return 'after';
    return 'inside';
  }

  private updateDropIndicator(el: HTMLElement, position: 'before' | 'after' | 'inside'): void {
    el.classList.remove('pg-drop-before', 'pg-drop-after', 'pg-drop-inside');
    el.classList.add(`pg-drop-${position}`);
  }

  private clearDropIndicator(el: HTMLElement): void {
    el.classList.remove('pg-drop-before', 'pg-drop-after', 'pg-drop-inside');
  }
}
