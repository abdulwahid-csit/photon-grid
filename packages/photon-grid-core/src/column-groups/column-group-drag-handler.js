import { GridEventType } from '../types/event.types';
import { createDiv } from '../renderer/dom-utils';
/** `{ valid: false }` sentinel. */
const INVALID_TARGET = {
    valid: false, targetId: '', position: 'before', indicatorX: 0,
};
/**
 * Manages drag-and-drop operations for group header cells.
 *
 * Handles three drag scenarios:
 * 1. **Group header drag** — move an entire group (all children move together).
 * 2. **Leaf inside a married group** — dragging a child moves the parent group.
 * 3. **Leaf drag out of group** — creates a solo wrapper group at the drop site.
 *
 * Drop targets:
 * - **Another group** — inserts the dragged group before/after the target.
 * - **Row-grouping bar** — triggers row-grouping for all `groupable` leaves.
 * - **Outside the grid** — shows a "hide" preview and hides all columns.
 *
 * Visual feedback:
 * - Ghost chip following the cursor.
 * - Thin vertical drop-indicator line at the insertion point.
 * - Ghost turns red when dragged outside the grid.
 */
export class ColumnGroupDragHandler {
    constructor(columnModel, groupModel, headerBuilder, colStyles, eventBus, 
    /** Returns the root `.pg-grid` element; may be `null` before mount. */
    gridElGetter) {
        this.columnModel = columnModel;
        this.groupModel = groupModel;
        this.headerBuilder = headerBuilder;
        this.colStyles = colStyles;
        this.eventBus = eventBus;
        this.gridElGetter = gridElGetter;
        /** Currently dragged group ID, `null` when not dragging. */
        this.draggingId = null;
        /** `true` when the dragged node is a group (vs. a leaf). */
        this.draggingIsGroup = false;
        /** Ghost element following the cursor. */
        this.ghostEl = null;
        /** Vertical indicator line shown at the drop target. */
        this.indicatorEl = null;
        /** The grid `.pg-grid` element, captured at drag-start from the getter. */
        this.gridEl = null;
        /** Last computed drop target. */
        this.currentTarget = null;
        /** `true` for the remainder of the current event loop after a drag completes. */
        this._didJustDrag = false;
        // ── Live drag transform state ────────────────────────────────────────────
        /** Injected `<style>` element holding CSS transforms during a drag. */
        this.dragStyleEl = null;
        /** Captured group-cell positions (at drag-start) for the same depth level. */
        this.dragCells = [];
        /** Width of the dragged group cell (pixels). */
        this.dragCellWidth = 0;
        /** Index of the dragged group cell within `dragCells`. */
        this.dragSourceIdx = -1;
        /** Current effective drop index (updated each mousemove). */
        this.dragEffectiveIdx = -1;
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
    }
    // ── Public ───────────────────────────────────────────────────────────────
    /**
     * `true` immediately after a drag session ends (cleared after one tick).
     * Used by the header builder to suppress the collapse-toggle click that
     * fires after a drag completes.
     */
    get didJustDrag() { return this._didJustDrag; }
    /**
     * Attach drag listeners to a group header cell element.
     * Drag starts only after the pointer has moved more than 5 px so that a
     * short click still fires the collapse-toggle handler.
     *
     * @param el    - The group header `<div>` element.
     * @param group - The group node this cell represents.
     */
    attachGroupDragListeners(el, group) {
        el.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pg-th__resize-handle, .pg-th__collapse-btn'))
                return;
            if (e.button !== 0)
                return;
            const startX = e.clientX;
            let moved = false;
            const onMoveStart = (ev) => {
                if (!moved && Math.abs(ev.clientX - startX) > 5) {
                    moved = true;
                    document.removeEventListener('mousemove', onMoveStart);
                    document.removeEventListener('mouseup', onUpEarly);
                    this.startGroupDrag(group, ev.clientX, ev.clientY);
                    document.addEventListener('mousemove', this.boundMouseMove);
                    document.addEventListener('mouseup', this.boundMouseUp);
                    // Intercept the click that would fire on mouseup so collapse does not toggle
                    const blockClick = (ce) => {
                        ce.stopPropagation();
                        document.removeEventListener('click', blockClick, true);
                    };
                    document.addEventListener('click', blockClick, true);
                }
            };
            const onUpEarly = () => {
                document.removeEventListener('mousemove', onMoveStart);
                document.removeEventListener('mouseup', onUpEarly);
            };
            document.addEventListener('mousemove', onMoveStart);
            document.addEventListener('mouseup', onUpEarly);
        });
    }
    /**
     * Attach drag listeners to a leaf header cell, respecting `marryChildren`.
     *
     * When the leaf's parent group has `marryChildren === true`, dragging the
     * leaf starts a group drag instead of a leaf drag.
     *
     * @param el     - The leaf header `<div>` element.
     * @param colDef - The column definition.
     */
    attachLeafDragListeners(el, colDef) {
        const parent = this.groupModel.getParent(colDef.colId);
        if (parent?.marryChildren) {
            const group = this.groupModel.getGroup(parent.groupId);
            if (group)
                this.attachGroupDragListeners(el, group);
        }
        // Non-married leaves use HeaderRenderer's built-in drag
    }
    /** `true` while a drag session is in progress. */
    get isDragging() { return this.draggingId !== null; }
    /** Release all event listeners and remove DOM artefacts. */
    destroy() {
        this.cleanupDrag();
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
    }
    // ── Private: drag lifecycle ───────────────────────────────────────────────
    startGroupDrag(group, clientX, clientY) {
        const gridEl = this.gridElGetter();
        if (!gridEl)
            return;
        this.draggingId = group.groupId;
        this.draggingIsGroup = true;
        this.gridEl = gridEl;
        // Ghost chip
        const ghost = createDiv('pg-col-drag-ghost');
        const label = document.createElement('span');
        label.className = 'pg-col-drag-ghost__label';
        label.textContent = group.header;
        ghost.appendChild(label);
        ghost.style.left = `${clientX + 14}px`;
        ghost.style.top = `${clientY}px`;
        document.body.appendChild(ghost);
        this.ghostEl = ghost;
        // Drop indicator
        const indicator = createDiv('pg-group-drop-indicator');
        gridEl.appendChild(indicator);
        this.indicatorEl = indicator;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        gridEl.classList.add('pg-grid--col-dragging');
        // ── Capture group-cell positions for live CSS-transform visual ──────────
        const draggedCell = gridEl.querySelector(`[data-group-id="${group.groupId}"]`);
        const depth = parseInt(draggedCell?.closest('[data-group-depth]')?.getAttribute('data-group-depth') ?? '0', 10);
        const cells = [];
        for (const row of gridEl.querySelectorAll(`[data-group-depth="${depth}"]`)) {
            for (const cell of row.querySelectorAll('[data-group-id]')) {
                cells.push({ groupId: cell.getAttribute('data-group-id') ?? '', rect: cell.getBoundingClientRect() });
            }
        }
        cells.sort((a, b) => a.rect.left - b.rect.left);
        this.dragCells = cells;
        this.dragSourceIdx = cells.findIndex((c) => c.groupId === group.groupId);
        this.dragCellWidth = cells[this.dragSourceIdx]?.rect.width ?? 0;
        this.dragEffectiveIdx = this.dragSourceIdx;
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-pg-group-drag', '');
        document.head.appendChild(styleEl);
        this.dragStyleEl = styleEl;
    }
    onMouseMove(e) {
        if (!this.draggingId || !this.ghostEl)
            return;
        this.ghostEl.style.left = `${e.clientX + 14}px`;
        this.ghostEl.style.top = `${e.clientY}px`;
        // Visual feedback: turn ghost red when outside grid
        const outside = this.isOutsideGrid(e.clientX, e.clientY);
        this.ghostEl.classList.toggle('pg-col-drag-ghost--outside', outside);
        if (outside) {
            this.currentTarget = null;
            this.updateIndicator(null);
            this.applyDragTransforms(-1);
            return;
        }
        const target = this.hitTest(e.clientX, e.clientY);
        this.currentTarget = target;
        this.updateIndicator(target);
        // Live CSS-transform reordering (mirrors HeaderRenderer column drag visual)
        if (this.dragCells.length > 0) {
            let effectiveIdx = this.dragSourceIdx;
            for (let i = 0; i < this.dragCells.length; i++) {
                if (i === this.dragSourceIdx)
                    continue;
                const r = this.dragCells[i].rect;
                if (e.clientX >= r.left && e.clientX < r.right) {
                    effectiveIdx = i;
                    break;
                }
            }
            // Clamp to edges
            if (e.clientX < (this.dragCells[0]?.rect.left ?? 0))
                effectiveIdx = 0;
            if (e.clientX >= (this.dragCells[this.dragCells.length - 1]?.rect.right ?? 0)) {
                effectiveIdx = this.dragCells.length - 1;
            }
            this.dragEffectiveIdx = effectiveIdx;
            this.applyDragTransforms(effectiveIdx);
        }
    }
    /**
     * Write CSS `transform: translateX()` rules for the live drag preview.
     * Pass `-1` to clear all transforms.
     */
    applyDragTransforms(effectiveIdx) {
        if (!this.dragStyleEl || !this.gridEl)
            return;
        if (effectiveIdx === -1 || effectiveIdx === this.dragSourceIdx) {
            this.dragStyleEl.textContent = '';
            return;
        }
        const gridId = this.gridEl.getAttribute('data-photon-grid-id') ?? '';
        const scope = gridId ? `[data-photon-grid-id="${gridId}"] ` : '';
        const src = this.dragSourceIdx;
        const src_rect = this.dragCells[src]?.rect;
        const tgt_rect = this.dragCells[effectiveIdx]?.rect;
        if (!src_rect || !tgt_rect)
            return;
        const srcOffset = effectiveIdx > src
            ? tgt_rect.right - src_rect.right
            : tgt_rect.left - src_rect.left;
        let css = `${scope}[data-group-id="${this.draggingId}"] { transform: translateX(${srcOffset}px); z-index: 10; position: relative; transition: none; }\n`;
        for (let i = 0; i < this.dragCells.length; i++) {
            if (i === src)
                continue;
            let offset = 0;
            if (effectiveIdx > src && i > src && i <= effectiveIdx)
                offset = -this.dragCellWidth;
            else if (effectiveIdx < src && i >= effectiveIdx && i < src)
                offset = this.dragCellWidth;
            if (offset !== 0) {
                css += `${scope}[data-group-id="${this.dragCells[i].groupId}"] { transform: translateX(${offset}px); }\n`;
            }
        }
        this.dragStyleEl.textContent = css;
    }
    onMouseUp(e) {
        const target = this.currentTarget;
        const id = this.draggingId;
        const isGroup = this.draggingIsGroup;
        const gridEl = this.gridEl;
        const outside = gridEl ? this.isOutsideGrid(e.clientX, e.clientY) : false;
        const onGroupBar = gridEl ? this.isOverGroupingBar(e.clientX, e.clientY) : false;
        this.cleanupDrag();
        this._didJustDrag = true;
        // Clear flag after current event loop so the collapse click is suppressed
        Promise.resolve().then(() => { this._didJustDrag = false; });
        if (!id)
            return;
        // ── Drop: outside grid ──────────────────────────────────────────────────
        if (outside) {
            if (isGroup) {
                const leaves = this.groupModel.getLeavesInGroup(id);
                for (const leaf of leaves) {
                    this.columnModel.setColumnVisible(leaf.colId, false);
                }
            }
            return;
        }
        // ── Drop: row-grouping bar ──────────────────────────────────────────────
        if (onGroupBar) {
            if (isGroup) {
                const leaves = this.groupModel.getLeavesInGroup(id);
                const groupableIds = leaves.filter((l) => l.groupable).map((l) => l.colId);
                if (groupableIds.length > 0) {
                    // COLUMN_GROUP_CHANGED fires with an array of colIds to add to the
                    // grouped-column set; GroupDropZone / GroupingEngine pick this up.
                    this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, {
                        action: 'add',
                        colIds: groupableIds,
                    });
                }
            }
            return;
        }
        // ── Drop: use live-transform effective index for precise positioning ──────
        // If the live transform computed a valid effectiveIdx, use that to determine
        // the insert position rather than the hitTest (which can be stale on fast drags).
        const effectiveIdx = this.dragEffectiveIdx;
        const useLiveIdx = effectiveIdx !== -1 && effectiveIdx !== this.dragSourceIdx
            && effectiveIdx < this.dragCells.length;
        const resolvedTarget = useLiveIdx
            ? {
                valid: true,
                targetId: this.dragCells[effectiveIdx].groupId,
                position: effectiveIdx > this.dragSourceIdx ? 'after' : 'before',
                indicatorX: 0,
            }
            : target;
        if (!resolvedTarget?.valid)
            return;
        if (isGroup) {
            // Moving the whole group: insert before/after target
            const targetGroup = this.groupModel.getGroup(resolvedTarget.targetId);
            if (!targetGroup)
                return;
            const targetParent = this.groupModel.getParent(resolvedTarget.targetId);
            const targetParentId = targetParent?.groupId ?? null;
            const insertBeforeId = resolvedTarget.position === 'before' ? resolvedTarget.targetId : null;
            // After-insert: find the node immediately following the target, insert before it
            const insertBeforeNext = resolvedTarget.position === 'after'
                ? this.nextSiblingId(resolvedTarget.targetId)
                : null;
            const finalInsertBefore = insertBeforeId ?? insertBeforeNext;
            // Dissolve solo group if being moved back to its origin group
            const draggedGroup = this.groupModel.getGroup(id);
            if (draggedGroup?.isSoloGroup && draggedGroup.originalParentGroupId === targetParentId) {
                const leafNode = draggedGroup.children[0];
                if (leafNode?.nodeType === "leaf" /* ColumnGroupNodeType.LEAF */) {
                    this.groupModel.dissolveGroupIfSolo(id, targetParentId, finalInsertBefore);
                    this.columnModel.setColumnVisible(leafNode.colDef.colId, true);
                    this.triggerRebuild();
                    return;
                }
            }
            this.groupModel.moveGroup(id, targetParentId, finalInsertBefore);
        }
        this.triggerRebuild();
    }
    cleanupDrag() {
        this.draggingId = null;
        this.draggingIsGroup = false;
        this.currentTarget = null;
        this.dragCells = [];
        this.dragCellWidth = 0;
        this.dragSourceIdx = -1;
        this.dragEffectiveIdx = -1;
        this.ghostEl?.remove();
        this.ghostEl = null;
        this.indicatorEl?.remove();
        this.indicatorEl = null;
        this.dragStyleEl?.remove();
        this.dragStyleEl = null;
        this.gridEl?.classList.remove('pg-grid--col-dragging');
        this.gridEl = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
    }
    // ── Private: drop-target hit test ────────────────────────────────────────
    /**
     * Locate the nearest group header cell to the cursor using
     * `getBoundingClientRect` on all visible `[data-group-id]` elements within
     * the grid.  Excludes the element being dragged.
     */
    hitTest(clientX, clientY) {
        if (!this.gridEl)
            return INVALID_TARGET;
        const cells = this.gridEl.querySelectorAll('[data-group-id]');
        const gridRect = this.gridEl.getBoundingClientRect();
        let closest = null;
        let minDist = Infinity;
        for (const cell of cells) {
            const gid = cell.getAttribute('data-group-id') ?? '';
            if (gid === this.draggingId)
                continue;
            const rect = cell.getBoundingClientRect();
            // Y must be within the group row (with 4 px tolerance)
            if (clientY < rect.top - 4 || clientY > rect.bottom + 4)
                continue;
            const midX = rect.left + rect.width / 2;
            const dist = Math.abs(clientX - midX);
            if (dist < minDist) {
                minDist = dist;
                const position = clientX < midX ? 'before' : 'after';
                closest = {
                    valid: true,
                    targetId: gid,
                    position,
                    // indicatorX is relative to the grid's left edge
                    indicatorX: (position === 'before' ? rect.left : rect.right) - gridRect.left,
                };
            }
        }
        return closest ?? INVALID_TARGET;
    }
    updateIndicator(target) {
        if (!this.indicatorEl)
            return;
        if (!target?.valid) {
            this.indicatorEl.style.display = 'none';
            return;
        }
        this.indicatorEl.style.display = 'block';
        this.indicatorEl.style.left = `${target.indicatorX}px`;
    }
    /** `true` when the cursor is more than 40 px outside the grid boundary. */
    isOutsideGrid(clientX, clientY) {
        if (!this.gridEl)
            return false;
        const rect = this.gridEl.getBoundingClientRect();
        const margin = 40;
        return clientX < rect.left - margin
            || clientX > rect.right + margin
            || clientY < rect.top - margin
            || clientY > rect.bottom + margin;
    }
    /** `true` when the cursor is over the row-grouping bar. */
    isOverGroupingBar(clientX, clientY) {
        if (!this.gridEl)
            return false;
        const bar = this.gridEl.querySelector('.pg-group-drop-zone--top');
        if (!bar)
            return false;
        const rect = bar.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right
            && clientY >= rect.top && clientY <= rect.bottom;
    }
    /**
     * Return the ID of the node immediately after `nodeId` among its siblings.
     * Returns `null` when `nodeId` is the last sibling or is not found.
     */
    nextSiblingId(nodeId) {
        const parent = this.groupModel.getParent(nodeId);
        const list = parent ? parent.children : this.groupModel.rootNodes;
        const idx = list
            .findIndex((n) => (n.nodeType === "group" /* ColumnGroupNodeType.GROUP */ ? n.groupId : n.colDef?.colId) === nodeId);
        if (idx === -1 || idx >= list.length - 1)
            return null;
        const next = list[idx + 1];
        return next.nodeType === "group" /* ColumnGroupNodeType.GROUP */ ? (next.groupId ?? null) : (next.colDef?.colId ?? null);
    }
    // ── Public: leaf clone / extract API ────────────────────────────────────
    /**
     * Extract a leaf from its parent group into a solo clone group WITHOUT
     * reordering `store.columns` via `getAllLeaves()`.
     *
     * Use this when the column has already been repositioned by `moveColumn` or
     * `moveAndPin` — the store order is correct; only the group tree and header
     * need to be updated.
     *
     * The solo group is repositioned to be immediately before `insertBeforeId` in
     * the root node list so that a subsequent `getAllLeaves()` tree sync (triggered
     * by the `-1` sentinel) produces the same order as the flat store.
     *
     * @param colId          - The `colId` of the leaf to extract.
     * @param insertBeforeId - Root-level sibling node ID to insert the solo group
     *   before.  Pass `null` to append at the end of the root list.
     */
    extractLeafToSoloGroup(colId, insertBeforeId) {
        const parent = this.groupModel.getParent(colId);
        if (!parent)
            return;
        const soloId = this.groupModel.createSoloGroupForLeaf(colId);
        if (!soloId)
            return;
        // Reposition so that tree order matches the intended column order
        this.groupModel.moveGroup(soloId, null, insertBeforeId);
        // Full rebuild + store sync via the standard -1 sentinel
        this.triggerRebuild();
    }
    /**
     * Called by `HeaderRenderer.onGlobalMouseUp` when a leaf column that belongs
     * to a group is dropped onto a different group's header cell.
     *
     * **Merge-back**: if the leaf is currently in a solo-clone group whose
     * `originalParentGroupId` matches `targetGroupId`, the clone is dissolved and
     * the leaf is returned to its original group.
     *
     * **Clone**: otherwise a new solo-clone wrapper group (same header as the
     * leaf's current parent) is created and positioned next to the target group.
     *
     * @param colId         - The `colId` of the dragged leaf column.
     * @param targetGroupId - The group header the leaf was dropped on.
     */
    createLeafClone(colId, targetGroupId) {
        const parentGroup = this.groupModel.getParent(colId);
        if (!parentGroup)
            return; // standalone leaf — nothing to clone
        // ── Merge-back: solo clone dropped on its original parent ───────────────
        if (parentGroup.isSoloGroup && parentGroup.originalParentGroupId === targetGroupId) {
            this.groupModel.dissolveGroupIfSolo(parentGroup.groupId, targetGroupId, null);
            this.columnModel.setColumnVisible(colId, true);
            this.triggerRebuild();
            return;
        }
        // ── Same parent → no-op ─────────────────────────────────────────────────
        if (parentGroup.groupId === targetGroupId)
            return;
        // ── Clone: extract leaf into a solo wrapper group ───────────────────────
        const soloGroupId = this.groupModel.createSoloGroupForLeaf(colId);
        if (!soloGroupId)
            return;
        // Position the new solo group next to (before) the target group
        const targetParent = this.groupModel.getParent(targetGroupId);
        this.groupModel.moveGroup(soloGroupId, targetParent?.groupId ?? null, targetGroupId);
        this.triggerRebuild();
    }
    /** Emit an event that tells the grid renderer to do a full header rebuild. */
    triggerRebuild() {
        this.eventBus.emit(GridEventType.COLUMN_MOVED, {
            colDef: null,
            fromIndex: -1,
            toIndex: -1,
        });
    }
}
//# sourceMappingURL=column-group-drag-handler.js.map