import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
import type { RowNode } from '../types/row.types';
import { GridEventType } from '../types/event.types';
import { createDiv } from './dom-utils';

const SCROLL_ZONE = 64;    // px from body edge to engage auto-scroll
const MAX_SCROLL_SPD = 24; // px/frame at extreme edge

export class RowDragRenderer {
  private ghostEl: HTMLElement | null = null;
  private draggingNodeId: string | null = null;
  private dragLabel = '';
  private isDragging = false;
  private gridEl: HTMLElement | null = null;
  private bodyWrapEl: HTMLElement | null = null;
  private targetNodeId: string | null = null;
  private targetPosition: 'before' | 'after' | 'inside' = 'before';

  /** `true` when Tree Data is active — switches drop-zone classification from a 2-way (before/after) to a 3-way (before/inside/after) split, and routes the commit through `treeReparentHandler` instead of the flat splice. Set via `setTreeMode`, called from `GridCore` only when a mutable hierarchy source (`parentId`/`childrenField`) is configured. */
  private treeModeActive = false;
  private treeReparentHandler: ((draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean) | null = null;
  private scrollFn: ((dy: number) => void) | null = null;
  private autoScrollRAF: number | null = null;
  private cursorX = 0;
  private cursorY = 0;

  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
    private iconRenderer: IconRenderer,
  ) {
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
  }

  mount(gridEl: HTMLElement, bodyWrapEl: HTMLElement, scrollFn: (dy: number) => void): void {
    this.gridEl = gridEl;
    this.bodyWrapEl = bodyWrapEl;
    this.scrollFn = scrollFn;
    bodyWrapEl.addEventListener('mousedown', this.boundMouseDown, true);
  }

  /**
   * Enables Tree Data drag-to-reparent. `reparentHandler` is called on drop
   * with the resolved `'before'|'after'|'inside'` position and should mutate
   * the raw hierarchy + trigger a pipeline refresh (see
   * `TreeDataService.moveNode`) — this renderer never touches tree structure
   * itself, only mouse tracking and drop-zone classification.
   */
  setTreeMode(active: boolean, reparentHandler: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean): void {
    this.treeModeActive = active;
    this.treeReparentHandler = reparentHandler;
  }

  destroy(): void {
    this.bodyWrapEl?.removeEventListener('mousedown', this.boundMouseDown, true);
    this.cleanup();
    this.gridEl = null;
    this.bodyWrapEl = null;
    this.scrollFn = null;
  }

  // ─── Drag start ───────────────────────────────────────────────────────────

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-row-drag]');
    if (!handle) return;

    e.preventDefault();
    e.stopPropagation();

    const rowEl = handle.closest<HTMLElement>('[data-node-id]');
    const nodeId = rowEl?.getAttribute('data-node-id');
    if (!nodeId) return;

    const rows = this.store.get('visibleRows') as RowNode[];
    const row = rows.find((r) => r.nodeId === nodeId);
    if (!row || row.type === 'group' || row.type === 'summary') return;

    this.dragLabel = handle.getAttribute('data-drag-label') ?? '';
    this.startDrag(nodeId, e);
  }

  private startDrag(nodeId: string, e: MouseEvent): void {
    this.draggingNodeId = nodeId;
    this.isDragging = true;
    this.cursorX = e.clientX;
    this.cursorY = e.clientY;

    // Clear any hover states that would otherwise be stuck (pointer-events: none prevents mouseout)
    this.bodyWrapEl?.querySelectorAll<HTMLElement>('.pg-row--hover')
      .forEach((el) => el.classList.remove('pg-row--hover'));

    // Ghost chip
    const ghost = createDiv('pg-row-drag-ghost');
    const dragIcon = document.createElement('span');
    dragIcon.className = 'pg-row-drag-ghost__icon pg-row-drag-ghost__icon--drag';
    dragIcon.innerHTML = this.iconRenderer.renderToString('drag', 14);
    const blockIcon = document.createElement('span');
    blockIcon.className = 'pg-row-drag-ghost__icon pg-row-drag-ghost__icon--block';
    blockIcon.innerHTML = this.iconRenderer.renderToString('ban', 14);
    const labelSpan = document.createElement('span');
    labelSpan.className = 'pg-row-drag-ghost__label';
    labelSpan.textContent = this.dragLabel || 'Row';
    ghost.appendChild(dragIcon);
    ghost.appendChild(blockIcon);
    ghost.appendChild(labelSpan);
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    document.body.appendChild(ghost);
    this.ghostEl = ghost;

    this.setDraggingClass(nodeId, true);
    this.gridEl?.classList.add('pg-grid--row-dragging');

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    this.startAutoScrollLoop();
  }

  // ─── Mouse move ───────────────────────────────────────────────────────────

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    this.cursorX = e.clientX;
    this.cursorY = e.clientY;

    if (this.ghostEl) {
      this.ghostEl.style.left = `${e.clientX}px`;
      this.ghostEl.style.top = `${e.clientY}px`;
    }

    this.updateDropTarget();
  }

  private updateDropTarget(): void {
    if (!this.bodyWrapEl || !this.draggingNodeId) return;

    const bodyRect = this.bodyWrapEl.getBoundingClientRect();
    const isOutside =
      this.cursorX < bodyRect.left || this.cursorX > bodyRect.right ||
      this.cursorY < bodyRect.top  || this.cursorY > bodyRect.bottom;

    if (isOutside) {
      this.ghostEl?.classList.add('pg-row-drag-ghost--outside');
      if (this.targetNodeId !== null) {
        this.targetNodeId = null;
        this.clearDragTops(); // rows animate back to their real positions
      }
      return;
    }
    this.ghostEl?.classList.remove('pg-row-drag-ghost--outside');

    const scrollTop = this.getScrollTop();
    const cursorContentY = (this.cursorY - bodyRect.top) + scrollTop;

    const allVisible = this.store.get('visibleRows') as RowNode[];
    const rows = allVisible.filter(
      (r) => r.type !== 'group' && r.type !== 'summary' && r.nodeId !== this.draggingNodeId,
    );

    let target: RowNode | null = null;
    let position: 'before' | 'after' | 'inside' = 'before';

    for (const row of rows) {
      if (cursorContentY >= row.top && cursorContentY < row.top + row.height) {
        target = row;
        position = this.classifyDropPosition(cursorContentY - row.top, row.height);
        break;
      }
    }

    // Fallback: above first visible / below last visible
    if (!target && rows.length > 0) {
      const first = rows[0];
      const last = rows[rows.length - 1];
      if (cursorContentY < first.top) {
        target = first; position = 'before';
      } else if (cursorContentY >= last.top + last.height) {
        target = last; position = 'after';
      }
    }

    const newTarget = target?.nodeId ?? null;
    const newPos = position;

    // Only recompute style sheet when the target slot actually changed
    if (newTarget !== this.targetNodeId || newPos !== this.targetPosition) {
      this.targetNodeId = newTarget;
      this.targetPosition = newPos;
      if (this.targetNodeId) {
        // Tree reparenting doesn't have a stable "flat virtual order" to
        // preview (the real position is decided by the hierarchy rebuild
        // after drop) — show a drop highlight on the target row instead of
        // the flat mode's row-shifting preview.
        if (this.treeModeActive) this.updateTreeDropHighlight();
        else this.updateRowTops();
      } else {
        this.clearDragTops();
      }
    }
  }

  /** Tree mode's drop feedback: highlights the target row and flags whether the drop would nest the dragged row inside it. */
  private updateTreeDropHighlight(): void {
    this.bodyWrapEl?.querySelectorAll<HTMLElement>('.pg-row--drop-target')
      .forEach((el) => el.classList.remove('pg-row--drop-target', 'pg-row--drop-inside', 'pg-row--drop-before', 'pg-row--drop-after'));
    if (!this.targetNodeId) return;
    const targetEls = this.bodyWrapEl?.querySelectorAll<HTMLElement>(`[data-node-id="${this.targetNodeId}"]`);
    targetEls?.forEach((el) => {
      el.classList.add('pg-row--drop-target', `pg-row--drop-${this.targetPosition}`);
    });
  }

  /** 2-way (before/after) split normally; 3-way (before/inside/after, thirds) when Tree Data drag-to-reparent is active. */
  private classifyDropPosition(relativeY: number, rowHeight: number): 'before' | 'after' | 'inside' {
    if (!this.treeModeActive) return relativeY < rowHeight / 2 ? 'before' : 'after';
    const third = rowHeight / 3;
    if (relativeY < third) return 'before';
    if (relativeY > rowHeight - third) return 'after';
    return 'inside';
  }

  // ─── Mouse up ─────────────────────────────────────────────────────────────

  private onMouseUp(_e: MouseEvent): void {
    if (!this.isDragging) { this.cleanup(); return; }

    const draggedId = this.draggingNodeId;
    const targetId  = this.targetNodeId;
    const position  = this.targetPosition;

    // Phase 1: remove interaction state immediately (ghost, events, cursor, row class).
    // Keep pg-grid--row-dragging + drag tops alive so there is no visual snap while
    // the store re-render and RowPositionSheet settle to the new positions.
    this.cleanupInteraction();

    if (draggedId && targetId && draggedId !== targetId && this.treeModeActive && this.treeReparentHandler) {
      // Tree reparenting rebuilds the whole hierarchy via a pipeline refresh
      // rather than a flat splice — no drag-tops preview to reconcile, so
      // visuals can be cleared immediately.
      this.treeReparentHandler(draggedId, targetId, position);
      this.cleanupVisuals();
    } else if (draggedId && targetId && draggedId !== targetId) {
      this.reorderRows(draggedId, targetId, position === 'inside' ? 'after' : position);
      // Phase 2: after two RAFs, RowPositionSheet has the same top values as our drag tops
      // → removing the overrides causes zero visual change.
      requestAnimationFrame(() => requestAnimationFrame(() => this.cleanupVisuals()));
    } else {
      this.cleanupVisuals();
    }
  }

  // ─── Auto-scroll loop ─────────────────────────────────────────────────────

  private startAutoScrollLoop(): void {
    if (this.autoScrollRAF !== null) return;
    this.autoScrollRAF = requestAnimationFrame(() => this.autoScrollTick());
  }

  private autoScrollTick(): void {
    this.autoScrollRAF = null;
    if (!this.isDragging || !this.bodyWrapEl || !this.scrollFn) return;

    const rect = this.bodyWrapEl.getBoundingClientRect();
    const distTop = this.cursorY - rect.top;
    const distBot = rect.bottom - this.cursorY;

    let dy = 0;
    if (distTop >= 0 && distTop < SCROLL_ZONE) {
      dy = -MAX_SCROLL_SPD * Math.pow(1 - distTop / SCROLL_ZONE, 2);
    } else if (distBot >= 0 && distBot < SCROLL_ZONE) {
      dy = MAX_SCROLL_SPD * Math.pow(1 - distBot / SCROLL_ZONE, 2);
    }

    if (dy !== 0) {
      this.scrollFn(dy);
      // Re-evaluate drop slot after content moved
      this.updateDropTarget();
    }

    if (this.isDragging) {
      this.autoScrollRAF = requestAnimationFrame(() => this.autoScrollTick());
    }
  }

  // ─── Live top animation ───────────────────────────────────────────────────
  //
  // Uses absolute `top` values (not transforms) to avoid the overflow:hidden
  // clipping that panel bodies impose.  The rules have higher CSS specificity
  // than RowPositionSheet (.pg-grid--row-dragging .pg-row[data-node-id="X"])
  // so they win cleanly.  Because reorderRows() produces the exact same top
  // values, removing these rules after the re-render causes zero visual snap.

  private updateRowTops(): void {
    if (!this.draggingNodeId || !this.targetNodeId) {
      this.clearDragTops();
      return;
    }

    const allRows = this.store.get('visibleRows') as RowNode[];

    // Compute the virtual order that the drop would produce
    const virtual = [...allRows];
    const fromIdx = virtual.findIndex((r) => r.nodeId === this.draggingNodeId);
    if (fromIdx === -1) { this.clearDragTops(); return; }

    const [dragged] = virtual.splice(fromIdx, 1);
    let insertIdx = virtual.findIndex((r) => r.nodeId === this.targetNodeId);
    if (insertIdx === -1) { this.clearDragTops(); return; }
    if (this.targetPosition === 'after') insertIdx++;
    virtual.splice(Math.max(0, insertIdx), 0, dragged);

    // Emit CSS overrides only for rows that changed position
    let css = '';
    let newTop = 0;
    for (const row of virtual) {
      if (Math.abs(newTop - row.top) > 0.5) {
        // specificity (0,3,0) > RowPositionSheet (0,2,0) → always wins
        css += `.pg-grid--row-dragging .pg-row[data-node-id="${row.nodeId}"]{top:${newTop}px;}\n`;
      }
      newTop += row.height;
    }

    this.getOrCreateTopStyle().textContent = css;

    // Keep the serial-number column consistent with the live preview: the rows
    // have just been repositioned, so their serials must follow suit.
    this.renumberSerialCells(virtual);
  }

  private clearDragTops(): void {
    const s = document.querySelector<HTMLStyleElement>('style[data-pg-row-drag-tops]');
    if (s) s.textContent = '';
    this.bodyWrapEl?.querySelectorAll<HTMLElement>('.pg-row--drop-target')
      .forEach((el) => el.classList.remove('pg-row--drop-target', 'pg-row--drop-inside', 'pg-row--drop-before', 'pg-row--drop-after'));

    // Restore the serial column to the real row order. On a committed drop the
    // subsequent re-render already carries the correct serials, so this is a
    // harmless identity pass; on a cancelled/reverted drag it undoes the
    // preview renumbering (no re-render happens in that path).
    this.renumberSerialCells(this.store.get('visibleRows') as RowNode[]);
  }

  /**
   * Re-numbers the serial-number column so the on-screen serials read in
   * ascending order top-to-bottom for the given row order.
   *
   * The set of serial VALUES currently rendered is invariant during a drag
   * (only their row assignment changes), so those exact values are
   * redistributed to the rows in `order`. This is intentionally agnostic to how
   * serials are computed (absolute vs. window-relative) — it neither knows nor
   * needs the numbering scheme, which avoids any value "jump" at drag start.
   *
   * Only rows currently in the DOM carry serial cells; `order` may be the full
   * visible-row list and non-rendered rows are simply skipped. No-op when the
   * serial column is disabled (no serial cells present).
   *
   * @param order - Row nodes in the desired visual order (previewed order while
   *                dragging; real `visibleRows` order to restore).
   */
  private renumberSerialCells(order: ReadonlyArray<RowNode>): void {
    if (!this.bodyWrapEl) return;

    const spanByNode = new Map<string, HTMLElement>();
    const values: number[] = [];
    this.bodyWrapEl.querySelectorAll<HTMLElement>('.pg-cell--serial').forEach((cell) => {
      const nodeId = cell.closest<HTMLElement>('[data-node-id]')?.getAttribute('data-node-id');
      const span = cell.querySelector<HTMLElement>('.pg-cell__serial');
      if (!nodeId || !span || spanByNode.has(nodeId)) return;
      const n = parseInt(span.textContent ?? '', 10);
      if (Number.isNaN(n)) return;
      spanByNode.set(nodeId, span);
      values.push(n);
    });
    if (spanByNode.size === 0) return;

    // Ascending values assigned to rows in visual order → serials always count
    // up the screen regardless of which row moved.
    values.sort((a, b) => a - b);
    let k = 0;
    for (const row of order) {
      const span = spanByNode.get(row.nodeId);
      if (span) span.textContent = String(values[k++]);
    }
  }

  private getOrCreateTopStyle(): HTMLStyleElement {
    let s = document.querySelector<HTMLStyleElement>('style[data-pg-row-drag-tops]');
    if (!s) {
      s = document.createElement('style');
      s.setAttribute('data-pg-row-drag-tops', '');
      document.head.appendChild(s);
    }
    return s;
  }

  // ─── Row reorder (committed on drop) ─────────────────────────────────────

  private reorderRows(draggedId: string, targetId: string, position: 'before' | 'after'): void {
    const allRows    = [...(this.store.get('allRows')    as RowNode[])];
    const visibleRows = [...(this.store.get('visibleRows') as RowNode[])];

    const move = (arr: RowNode[]) => {
      const fromIdx = arr.findIndex((r) => r.nodeId === draggedId);
      if (fromIdx === -1) return arr;
      const [item] = arr.splice(fromIdx, 1);
      let toIdx = arr.findIndex((r) => r.nodeId === targetId);
      if (toIdx === -1) { arr.splice(fromIdx, 0, item); return arr; }
      if (position === 'after') toIdx++;
      arr.splice(Math.max(0, toIdx), 0, item);
      return arr;
    };

    const newVisible = move(visibleRows);
    const newAll     = move(allRows);

    // Recompute tops — same arithmetic as updateRowTops() so values match
    let top = 0;
    for (let i = 0; i < newVisible.length; i++) {
      newVisible[i] = { ...newVisible[i], rowIndex: i, top };
      top += newVisible[i].height;
    }

    const draggedNode = newVisible.find((r) => r.nodeId === draggedId);
    const targetNode  = newVisible.find((r) => r.nodeId === targetId);
    if (draggedNode && targetNode) {
      this.eventBus.emit(GridEventType.ROW_DROP, {
        draggedRows: [draggedNode],
        targetRow: targetNode,
        position,
      });
    }

    this.store.set('allRows', newAll);
    this.store.set('visibleRows', newVisible);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getScrollTop(): number {
    const val = this.gridEl?.style.getPropertyValue('--pg-scroll-y') ?? '0px';
    return -parseFloat(val) || 0;
  }

  private setDraggingClass(nodeId: string, active: boolean): void {
    this.bodyWrapEl?.querySelectorAll<HTMLElement>(`[data-node-id="${nodeId}"]`)
      .forEach((el) => el.classList.toggle('pg-row--row-dragging', active));
  }

  // Phase 1 — remove interaction state; keep grid class + drag tops
  private cleanupInteraction(): void {
    if (this.autoScrollRAF !== null) {
      cancelAnimationFrame(this.autoScrollRAF);
      this.autoScrollRAF = null;
    }
    if (this.draggingNodeId) this.setDraggingClass(this.draggingNodeId, false);
    this.ghostEl?.remove();
    this.ghostEl = null;
    this.draggingNodeId = null;
    this.targetNodeId = null;
    this.isDragging = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  // Phase 2 — remove visual overrides once RowPositionSheet has settled
  private cleanupVisuals(): void {
    this.gridEl?.classList.remove('pg-grid--row-dragging');
    this.clearDragTops();
  }

  private cleanup(): void {
    this.cleanupInteraction();
    this.cleanupVisuals();
  }
}
