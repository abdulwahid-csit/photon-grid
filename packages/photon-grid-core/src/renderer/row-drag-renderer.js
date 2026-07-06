import { GridEventType } from '../types/event.types';
import { createDiv } from './dom-utils';
const SCROLL_ZONE = 64; // px from body edge to engage auto-scroll
const MAX_SCROLL_SPD = 24; // px/frame at extreme edge
export class RowDragRenderer {
    constructor(store, eventBus, iconRenderer) {
        this.store = store;
        this.eventBus = eventBus;
        this.iconRenderer = iconRenderer;
        this.ghostEl = null;
        this.draggingNodeId = null;
        this.dragLabel = '';
        this.isDragging = false;
        this.gridEl = null;
        this.bodyWrapEl = null;
        this.targetNodeId = null;
        this.targetPosition = 'before';
        /** `true` when Tree Data is active — switches drop-zone classification from a 2-way (before/after) to a 3-way (before/inside/after) split, and routes the commit through `treeReparentHandler` instead of the flat splice. Set via `setTreeMode`, called from `GridCore` only when a mutable hierarchy source (`parentId`/`childrenField`) is configured. */
        this.treeModeActive = false;
        this.treeReparentHandler = null;
        this.scrollFn = null;
        this.autoScrollRAF = null;
        this.cursorX = 0;
        this.cursorY = 0;
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
    }
    mount(gridEl, bodyWrapEl, scrollFn) {
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
    setTreeMode(active, reparentHandler) {
        this.treeModeActive = active;
        this.treeReparentHandler = reparentHandler;
    }
    destroy() {
        this.bodyWrapEl?.removeEventListener('mousedown', this.boundMouseDown, true);
        this.cleanup();
        this.gridEl = null;
        this.bodyWrapEl = null;
        this.scrollFn = null;
    }
    // ─── Drag start ───────────────────────────────────────────────────────────
    onMouseDown(e) {
        if (e.button !== 0)
            return;
        const handle = e.target.closest('[data-row-drag]');
        if (!handle)
            return;
        e.preventDefault();
        e.stopPropagation();
        const rowEl = handle.closest('[data-node-id]');
        const nodeId = rowEl?.getAttribute('data-node-id');
        if (!nodeId)
            return;
        const rows = this.store.get('visibleRows');
        const row = rows.find((r) => r.nodeId === nodeId);
        if (!row || row.type === 'group' || row.type === 'summary')
            return;
        this.dragLabel = handle.getAttribute('data-drag-label') ?? '';
        this.startDrag(nodeId, e);
    }
    startDrag(nodeId, e) {
        this.draggingNodeId = nodeId;
        this.isDragging = true;
        this.cursorX = e.clientX;
        this.cursorY = e.clientY;
        // Clear any hover states that would otherwise be stuck (pointer-events: none prevents mouseout)
        this.bodyWrapEl?.querySelectorAll('.pg-row--hover')
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
    onMouseMove(e) {
        if (!this.isDragging)
            return;
        this.cursorX = e.clientX;
        this.cursorY = e.clientY;
        if (this.ghostEl) {
            this.ghostEl.style.left = `${e.clientX}px`;
            this.ghostEl.style.top = `${e.clientY}px`;
        }
        this.updateDropTarget();
    }
    updateDropTarget() {
        if (!this.bodyWrapEl || !this.draggingNodeId)
            return;
        const bodyRect = this.bodyWrapEl.getBoundingClientRect();
        const isOutside = this.cursorX < bodyRect.left || this.cursorX > bodyRect.right ||
            this.cursorY < bodyRect.top || this.cursorY > bodyRect.bottom;
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
        const allVisible = this.store.get('visibleRows');
        const rows = allVisible.filter((r) => r.type !== 'group' && r.type !== 'summary' && r.nodeId !== this.draggingNodeId);
        let target = null;
        let position = 'before';
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
                target = first;
                position = 'before';
            }
            else if (cursorContentY >= last.top + last.height) {
                target = last;
                position = 'after';
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
                if (this.treeModeActive)
                    this.updateTreeDropHighlight();
                else
                    this.updateRowTops();
            }
            else {
                this.clearDragTops();
            }
        }
    }
    /** Tree mode's drop feedback: highlights the target row and flags whether the drop would nest the dragged row inside it. */
    updateTreeDropHighlight() {
        this.bodyWrapEl?.querySelectorAll('.pg-row--drop-target')
            .forEach((el) => el.classList.remove('pg-row--drop-target', 'pg-row--drop-inside', 'pg-row--drop-before', 'pg-row--drop-after'));
        if (!this.targetNodeId)
            return;
        const targetEls = this.bodyWrapEl?.querySelectorAll(`[data-node-id="${this.targetNodeId}"]`);
        targetEls?.forEach((el) => {
            el.classList.add('pg-row--drop-target', `pg-row--drop-${this.targetPosition}`);
        });
    }
    /** 2-way (before/after) split normally; 3-way (before/inside/after, thirds) when Tree Data drag-to-reparent is active. */
    classifyDropPosition(relativeY, rowHeight) {
        if (!this.treeModeActive)
            return relativeY < rowHeight / 2 ? 'before' : 'after';
        const third = rowHeight / 3;
        if (relativeY < third)
            return 'before';
        if (relativeY > rowHeight - third)
            return 'after';
        return 'inside';
    }
    // ─── Mouse up ─────────────────────────────────────────────────────────────
    onMouseUp(_e) {
        if (!this.isDragging) {
            this.cleanup();
            return;
        }
        const draggedId = this.draggingNodeId;
        const targetId = this.targetNodeId;
        const position = this.targetPosition;
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
        }
        else if (draggedId && targetId && draggedId !== targetId) {
            this.reorderRows(draggedId, targetId, position === 'inside' ? 'after' : position);
            // Phase 2: after two RAFs, RowPositionSheet has the same top values as our drag tops
            // → removing the overrides causes zero visual change.
            requestAnimationFrame(() => requestAnimationFrame(() => this.cleanupVisuals()));
        }
        else {
            this.cleanupVisuals();
        }
    }
    // ─── Auto-scroll loop ─────────────────────────────────────────────────────
    startAutoScrollLoop() {
        if (this.autoScrollRAF !== null)
            return;
        this.autoScrollRAF = requestAnimationFrame(() => this.autoScrollTick());
    }
    autoScrollTick() {
        this.autoScrollRAF = null;
        if (!this.isDragging || !this.bodyWrapEl || !this.scrollFn)
            return;
        const rect = this.bodyWrapEl.getBoundingClientRect();
        const distTop = this.cursorY - rect.top;
        const distBot = rect.bottom - this.cursorY;
        let dy = 0;
        if (distTop >= 0 && distTop < SCROLL_ZONE) {
            dy = -MAX_SCROLL_SPD * Math.pow(1 - distTop / SCROLL_ZONE, 2);
        }
        else if (distBot >= 0 && distBot < SCROLL_ZONE) {
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
    updateRowTops() {
        if (!this.draggingNodeId || !this.targetNodeId) {
            this.clearDragTops();
            return;
        }
        const allRows = this.store.get('visibleRows');
        // Compute the virtual order that the drop would produce
        const virtual = [...allRows];
        const fromIdx = virtual.findIndex((r) => r.nodeId === this.draggingNodeId);
        if (fromIdx === -1) {
            this.clearDragTops();
            return;
        }
        const [dragged] = virtual.splice(fromIdx, 1);
        let insertIdx = virtual.findIndex((r) => r.nodeId === this.targetNodeId);
        if (insertIdx === -1) {
            this.clearDragTops();
            return;
        }
        if (this.targetPosition === 'after')
            insertIdx++;
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
    }
    clearDragTops() {
        const s = document.querySelector('style[data-pg-row-drag-tops]');
        if (s)
            s.textContent = '';
        this.bodyWrapEl?.querySelectorAll('.pg-row--drop-target')
            .forEach((el) => el.classList.remove('pg-row--drop-target', 'pg-row--drop-inside', 'pg-row--drop-before', 'pg-row--drop-after'));
    }
    getOrCreateTopStyle() {
        let s = document.querySelector('style[data-pg-row-drag-tops]');
        if (!s) {
            s = document.createElement('style');
            s.setAttribute('data-pg-row-drag-tops', '');
            document.head.appendChild(s);
        }
        return s;
    }
    // ─── Row reorder (committed on drop) ─────────────────────────────────────
    reorderRows(draggedId, targetId, position) {
        const allRows = [...this.store.get('allRows')];
        const visibleRows = [...this.store.get('visibleRows')];
        const move = (arr) => {
            const fromIdx = arr.findIndex((r) => r.nodeId === draggedId);
            if (fromIdx === -1)
                return arr;
            const [item] = arr.splice(fromIdx, 1);
            let toIdx = arr.findIndex((r) => r.nodeId === targetId);
            if (toIdx === -1) {
                arr.splice(fromIdx, 0, item);
                return arr;
            }
            if (position === 'after')
                toIdx++;
            arr.splice(Math.max(0, toIdx), 0, item);
            return arr;
        };
        const newVisible = move(visibleRows);
        const newAll = move(allRows);
        // Recompute tops — same arithmetic as updateRowTops() so values match
        let top = 0;
        for (let i = 0; i < newVisible.length; i++) {
            newVisible[i] = { ...newVisible[i], rowIndex: i, top };
            top += newVisible[i].height;
        }
        const draggedNode = newVisible.find((r) => r.nodeId === draggedId);
        const targetNode = newVisible.find((r) => r.nodeId === targetId);
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
    getScrollTop() {
        const val = this.gridEl?.style.getPropertyValue('--pg-scroll-y') ?? '0px';
        return -parseFloat(val) || 0;
    }
    setDraggingClass(nodeId, active) {
        this.bodyWrapEl?.querySelectorAll(`[data-node-id="${nodeId}"]`)
            .forEach((el) => el.classList.toggle('pg-row--row-dragging', active));
    }
    // Phase 1 — remove interaction state; keep grid class + drag tops
    cleanupInteraction() {
        if (this.autoScrollRAF !== null) {
            cancelAnimationFrame(this.autoScrollRAF);
            this.autoScrollRAF = null;
        }
        if (this.draggingNodeId)
            this.setDraggingClass(this.draggingNodeId, false);
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
    cleanupVisuals() {
        this.gridEl?.classList.remove('pg-grid--row-dragging');
        this.clearDragTops();
    }
    cleanup() {
        this.cleanupInteraction();
        this.cleanupVisuals();
    }
}
//# sourceMappingURL=row-drag-renderer.js.map