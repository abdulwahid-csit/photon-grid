import type { ColumnDef } from '../types/column.types';
import type { ColumnModel } from '../core/column-model';
import type { ColumnGroupModel } from './column-group-model';
import type { ColumnGroupHeaderBuilder } from './column-group-header-builder';
import type { ColumnStyleManager } from '../renderer/column-style-manager';
import type { EventBus } from '../event-bus/event-bus';
import type { IColumnGroupNode } from './column-group.types';
/**
 * Valid drop-zone positions during a group header drag.
 */
export type GroupDropPosition = 'before' | 'after' | 'inside';
/**
 * Describes a potential drop target identified during a group-drag move event.
 */
export interface GroupDropTarget {
    /** Whether this is a valid location to drop the dragged node. */
    valid: boolean;
    /** Target group ID or leaf column ID. */
    targetId: string;
    /** Position relative to the target. */
    position: GroupDropPosition;
    /** Pixel x coordinate of the visual drop indicator relative to the grid element. */
    indicatorX: number;
}
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
export declare class ColumnGroupDragHandler {
    private readonly columnModel;
    private readonly groupModel;
    private readonly headerBuilder;
    private readonly colStyles;
    private readonly eventBus;
    /** Returns the root `.pg-grid` element; may be `null` before mount. */
    private readonly gridElGetter;
    /** Currently dragged group ID, `null` when not dragging. */
    private draggingId;
    /** `true` when the dragged node is a group (vs. a leaf). */
    private draggingIsGroup;
    /** Ghost element following the cursor. */
    private ghostEl;
    /** Vertical indicator line shown at the drop target. */
    private indicatorEl;
    /** The grid `.pg-grid` element, captured at drag-start from the getter. */
    private gridEl;
    /** Last computed drop target. */
    private currentTarget;
    /** `true` for the remainder of the current event loop after a drag completes. */
    private _didJustDrag;
    /** Injected `<style>` element holding CSS transforms during a drag. */
    private dragStyleEl;
    /** Captured group-cell positions (at drag-start) for the same depth level. */
    private dragCells;
    /** Width of the dragged group cell (pixels). */
    private dragCellWidth;
    /** Index of the dragged group cell within `dragCells`. */
    private dragSourceIdx;
    /** Current effective drop index (updated each mousemove). */
    private dragEffectiveIdx;
    private boundMouseMove;
    private boundMouseUp;
    constructor(columnModel: ColumnModel, groupModel: ColumnGroupModel, headerBuilder: ColumnGroupHeaderBuilder, colStyles: ColumnStyleManager, eventBus: EventBus, 
    /** Returns the root `.pg-grid` element; may be `null` before mount. */
    gridElGetter: () => HTMLElement | null);
    /**
     * `true` immediately after a drag session ends (cleared after one tick).
     * Used by the header builder to suppress the collapse-toggle click that
     * fires after a drag completes.
     */
    get didJustDrag(): boolean;
    /**
     * Attach drag listeners to a group header cell element.
     * Drag starts only after the pointer has moved more than 5 px so that a
     * short click still fires the collapse-toggle handler.
     *
     * @param el    - The group header `<div>` element.
     * @param group - The group node this cell represents.
     */
    attachGroupDragListeners(el: HTMLElement, group: IColumnGroupNode): void;
    /**
     * Attach drag listeners to a leaf header cell, respecting `marryChildren`.
     *
     * When the leaf's parent group has `marryChildren === true`, dragging the
     * leaf starts a group drag instead of a leaf drag.
     *
     * @param el     - The leaf header `<div>` element.
     * @param colDef - The column definition.
     */
    attachLeafDragListeners(el: HTMLElement, colDef: ColumnDef): void;
    /** `true` while a drag session is in progress. */
    get isDragging(): boolean;
    /** Release all event listeners and remove DOM artefacts. */
    destroy(): void;
    private startGroupDrag;
    private onMouseMove;
    /**
     * Write CSS `transform: translateX()` rules for the live drag preview.
     * Pass `-1` to clear all transforms.
     */
    private applyDragTransforms;
    private onMouseUp;
    private cleanupDrag;
    /**
     * Locate the nearest group header cell to the cursor using
     * `getBoundingClientRect` on all visible `[data-group-id]` elements within
     * the grid.  Excludes the element being dragged.
     */
    private hitTest;
    private updateIndicator;
    /** `true` when the cursor is more than 40 px outside the grid boundary. */
    private isOutsideGrid;
    /** `true` when the cursor is over the row-grouping bar. */
    private isOverGroupingBar;
    /**
     * Return the ID of the node immediately after `nodeId` among its siblings.
     * Returns `null` when `nodeId` is the last sibling or is not found.
     */
    private nextSiblingId;
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
    extractLeafToSoloGroup(colId: string, insertBeforeId: string | null): void;
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
    createLeafClone(colId: string, targetGroupId: string): void;
    /** Emit an event that tells the grid renderer to do a full header rebuild. */
    triggerRebuild(): void;
}
//# sourceMappingURL=column-group-drag-handler.d.ts.map