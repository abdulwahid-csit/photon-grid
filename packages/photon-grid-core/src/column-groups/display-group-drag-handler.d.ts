import type { DisplayGroupNode } from './display-group.types';
/**
 * Fired by {@link DisplayGroupDragHandler} when the user drops a group at a
 * new position.
 *
 * @param logicalGroupId    - The logical group being moved.
 * @param sourcePanel       - The panel the drag originated from.
 * @param targetPanel       - The panel the group is dropped into.
 * @param insertBeforeColId - First leaf column to the right of the drop target.
 *   `null` means append at the end of the target panel section.
 */
export type GroupMovedCallback = (logicalGroupId: string, sourcePanel: 'left' | null | 'right', targetPanel: 'left' | null | 'right', insertBeforeColId: string | null) => void;
/**
 * Callbacks used for real-time (AG Grid-style) group tree preview during drag.
 *
 * When provided the drag handler uses a live-rebuild path instead of CSS
 * transforms: on every slot change the column order is updated in the store so
 * the header re-renders with the group in its new position before the user drops.
 */
export interface GroupPreviewCallbacks {
    /** Called once when the drag crosses the activation threshold. */
    onPreviewStart: () => void;
    /**
     * Called on every slot change during the drag.
     * The engine applies the move from the original snapshot so the header
     * rebuilds with the group at the new position.
     */
    onPreviewMove: GroupMovedCallback;
    /**
     * Called on mouseup to commit the final preview position.
     * The store already reflects the correct order — this just clears the snapshot.
     */
    onPreviewConfirm: () => void;
}
/**
 * Handles atomic column-group drag and drop.
 *
 * ### Rules
 * - Only **group header cells** (`.pg-th--group`) can be dragged.
 * - Group children cannot escape their group during drag.
 * - Drop targets are root-level positions only (before/after other groups or
 *   flat columns).  Dropping inside another group is not supported.
 * - Moving across panels changes the `pinned` property of all group leaves.
 *
 * ### Visual feedback — two modes
 * **Live preview** (when `previewCallbacks` is provided):
 * The column order is updated in the store on every slot change so the header
 * re-renders in real time — identical to AG Grid behaviour.  CSS transforms are
 * not used; the rebuilt DOM IS the visual feedback.
 *
 * **CSS-transform** (legacy fallback):
 * `translateX` rules are injected via a `<style>` tag to slide cells without
 * touching the store.  The final move is committed on mouseup.
 *
 * ### Drag activation threshold
 * A drag is not activated until the pointer moves **5 px** — preventing
 * accidental drags during collapse-toggle clicks.
 */
export declare class DisplayGroupDragHandler {
    private readonly gridElGetter;
    private readonly onGroupMoved;
    private readonly previewCallbacks?;
    private readonly leavesFor?;
    private _didJustDrag;
    private isDragging;
    private dragGroupId;
    private sourcePanel;
    private ghostEl;
    private indicatorEl;
    private dragStyleEl;
    private capturedCells;
    private dragSourceIdx;
    /** Last slot key seen in live-preview mode — `"<panel>:<insertBeforeColId|end>"`. */
    private lastSlotKey;
    private startX;
    private startY;
    private removeMoveUp;
    /**
     * @param gridElGetter    - Returns the root `.pg-grid` element (may be null before mount).
     * @param onGroupMoved    - Committed on mouseup; receives the final group position.
     * @param previewCallbacks - When provided, switches to the live-rebuild path (store mutations
     *   on every slot change, same as AG Grid's live column reorder).  When omitted, the handler
     *   uses CSS transforms instead — smoother and without flicker.
     * @param leavesFor       - Returns the leaf column IDs for a logical group.  Used by the
     *   CSS-transform path so that leaf header cells AND body cells animate in sync with the
     *   group header when the drag slot changes.
     */
    constructor(gridElGetter: () => HTMLElement | null, onGroupMoved: GroupMovedCallback, previewCallbacks?: GroupPreviewCallbacks | undefined, leavesFor?: ((groupId: string) => readonly string[]) | undefined);
    /**
     * Called from `DisplayGroupHeaderBuilder.onGroupHeaderMouseDown` for each
     * newly built group header cell.  Wires a threshold-based drag using the
     * `mousedown` event already delivered by the builder.
     *
     * @param e    - The `mousedown` event from the group header cell.
     * @param node - The display group node this cell represents.
     * @param el   - The DOM element of the group header cell.
     */
    onHeaderMouseDown(e: MouseEvent, node: DisplayGroupNode, el: HTMLElement): void;
    /**
     * `true` for ~200 ms after a drag completes.
     * Used by the header builder to suppress the click event fired after mouseup.
     */
    get didJustDrag(): boolean;
    /**
     * `true` while a group header drag is currently in progress.
     * Exposed so the store-watcher in `GridRenderer` can skip the full header
     * destroy / rebuild cycle during live-preview group drag, preventing flicker.
     */
    get isDraggingGroup(): boolean;
    /**
     * Tear down all event listeners and remove any remaining drag DOM artifacts.
     * Must be called when the grid is destroyed or when the header is rebuilt.
     */
    destroy(): void;
    /**
     * Activate the drag once the movement threshold is exceeded.
     * Creates the ghost chip, drop indicator, and style element.
     *
     * Adds `pg-grid--group-dragging` before live preview updates begin so the
     * renderer can suppress normal transition effects while column order is being
     * updated repeatedly under the pointer.
     */
    private activateDrag;
    private onMouseMove;
    private onMouseUp;
    /**
     * Find the leaf column ID that the group should be inserted before.
     * Inspects the leaf header row in the target panel, finding the first cell
     * whose horizontal midpoint is to the right of the cursor.
     *
     * @param e           - Current cursor position.
     * @param targetPanel - Panel the drop is over.
     * @param gridEl      - Root `.pg-grid` element.
     */
    private findInsertBeforeColId;
    /**
     * Capture all root-level drag slots from the depth-0 group header row.
     *
     * Slots include both:
     * - **Group cells** (`.pg-th--group`): represent a whole logical group.
     * - **Flat-column filler cells** (`.pg-th--depth-filler`): represent a single
     *   ungrouped column sitting between/around groups.  Including these as slots
     *   lets the drag handler detect when the cursor crosses a flat-column boundary
     *   and animate the flat column (header + body cells) out of the way in real
     *   time — matching AG Grid's behaviour for mixed grouped/flat layouts.
     *
     * Cells are sorted by their `style.left` value because absolutely-positioned
     * elements may appear in arbitrary DOM insertion order.
     *
     * Falls back to the leaf header row when no group rows exist (rare — only when
     * the grid transitions from grouped to flat while a drag is in progress).
     *
     * @param gridEl - Root `.pg-grid` element.
     * @param panel  - Panel to inspect.
     */
    private capturePanelCells;
    /**
     * Find the effective drop-slot index from the current cursor x position.
     * Returns `capturedCells.length` to indicate "append at end".
     *
     * @param cursorX - Cursor x position in client coordinates.
     */
    private findEffectiveSlot;
    /**
     * Apply `--pg-drag-x` and `--pg-drag-transition` rules via the injected `<style>`
     * element to give a live preview of where the dragged group will land.
     *
     * - The **dragged group** and all of its leaf columns snap instantly
     *   (`--pg-drag-transition: 0ms`) so they track the slot-change in a single frame.
     * - **Displaced groups** and their leaf columns animate smoothly with the default
     *   transition duration (180 ms) — matching AG Grid's animated reorder behaviour.
     * - Body cells (`pg-cell[data-col-id]`) receive the same offset as their header
     *   counterpart, so the data rows shift in perfect sync with the header.
     *
     * Using the `--pg-drag-transition` CSS variable avoids specificity conflicts:
     * the base CSS in `base-styles.ts` reads the variable and provides the default,
     * while the per-cell override only needs to set the variable.
     *
     * @param effectiveIdx - Drop-slot index from {@link findEffectiveSlot}.
     * @param gridEl       - Root `.pg-grid` element (used to scope CSS selectors).
     */
    private applyTransforms;
    /**
     * Reposition the drop-indicator line to show the insertion point.
     *
     * @param effectiveIdx - Slot index derived from cursor position.
     */
    private updateIndicator;
    /**
     * Position the drop-indicator line by looking up the target cell directly in
     * the live DOM.  Used in live-preview mode where captured cell rects are stale
     * after each header rebuild.
     *
     * @param colId    - The `data-col-id` of the cell to insert before, or `null`
     *                   to place the indicator at the end of the panel.
     * @param panel    - The panel the drop is targeting.
     * @param gridEl   - Root `.pg-grid` element.
     */
    private updateIndicatorFromColId;
    private detectPanelFromElement;
    private detectPanelAtPoint;
    private getPanelEl;
    private cleanupDrag;
}
//# sourceMappingURL=display-group-drag-handler.d.ts.map