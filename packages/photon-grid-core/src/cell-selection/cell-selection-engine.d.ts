import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import { ClipboardEngine } from '../engines/clipboard/clipboard-engine';
import { UndoRedoEngine } from '../engines/undo-redo/undo-redo-engine';
export declare class CellSelectionEngine {
    private store;
    private eventBus;
    private clipboardEngine;
    /** Optional undo/redo engine. When provided, cut, paste, and edit operations are recorded. */
    private undoRedoEngine?;
    private _isSelecting;
    private anchorCell;
    private bodyPanels;
    private contextMenuEl;
    private chartOpenCallback;
    /**
     * Optional callback invoked when the user presses Enter on a focused (non-editing) cell.
     * Return `true` to absorb the event (editing started); `false` to fall through to
     * the default down-navigation behavior.
     */
    private enterEditHandler;
    /** Optional callback invoked on ArrowLeft/ArrowRight for Tree Data collapse/expand — see `setTreeToggleHandler`. */
    private treeToggleHandler;
    /**
     * Optional callback invoked after every active-cell change so the grid body
     * can scroll the newly active cell into view (AG Grid-style auto-scroll).
     */
    private scrollToCellCallback;
    /**
     * Returns the number of rows that fit in the visible body viewport.
     * Used by PageUp / PageDown to determine how far to jump.
     */
    private getViewportRowCountCallback;
    /**
     * Optional callback invoked after a data mutation (fill, cut, paste, undo/redo).
     * When `nodeIds` is provided the renderer evicts only those rows from its cache
     * so custom cell renderers in untouched rows are NOT re-executed.
     * Omitting `nodeIds` falls back to a full cache clear (safe but unoptimised).
     */
    private dataChangedCallback;
    private boundKeydown;
    private boundHideCtx;
    /** DOM element for the interactive fill handle corner square. */
    private fillHandleEl;
    /** The `.pg-cell` element that currently hosts the fill handle as a child. */
    private fillHandleParentCell;
    /** `true` while the user is dragging the fill handle. */
    private isFillDragging;
    /** Normalised source range captured at the start of a fill drag. */
    private fillSourceRange;
    /** DOM cells currently showing the dashed fill-preview overlay. */
    private fillPreviewCells;
    /** Locked fill direction; null until the user moves far enough in one axis. */
    private fillDirection;
    /** Target row index for up/down fills; null when direction is horizontal. */
    private fillTargetRow;
    /** Target column index for left/right fills; null when direction is vertical. */
    private fillTargetCol;
    /** Callback invoked on every fill-drag mousemove to drive the edge auto-scroller. */
    private fillDragScrollCallback;
    /** Callback invoked when the fill drag ends to stop the edge auto-scroller. */
    private fillDragEndCallback;
    /**
     * Returns the bounding rect of the grid's scroll viewport.  Used by
     * `processFillPosition` to clamp the hit-test coordinates when the cursor
     * has moved outside the body area so edge cells are always reachable.
     */
    private dragViewportRectFn;
    private boundFillMouseMove;
    private boundFillMouseUp;
    constructor(store: GridStore, eventBus: EventBus, clipboardEngine: ClipboardEngine, 
    /** Optional undo/redo engine. When provided, cut, paste, and edit operations are recorded. */
    undoRedoEngine?: UndoRedoEngine | undefined);
    get isSelecting(): boolean;
    attach(containerEl: HTMLElement): void;
    setBodyPanels(panels: HTMLElement[]): void;
    /**
     * Register a callback that is invoked when the user presses Enter on a focused
     * cell that is not in edit mode.  Return `true` to absorb the event (editing
     * started); return `false` to fall through to the default down-navigation.
     */
    setEnterEditHandler(fn: (rowIndex: number, colIndex: number) => boolean): void;
    /**
     * Register a callback invoked when Left/Right is pressed (without Ctrl/Cmd
     * or Shift) on a row with children — Tree Data's collapse/expand-via-
     * keyboard convention. Return `true` to absorb the key press (the tree
     * toggled, or focus jumped to a parent/first child); return `false` to
     * fall through to normal column navigation. `CellSelectionEngine` never
     * imports tree types itself — this indirection is how it stays unaware of
     * Tree Data entirely, same as `setEnterEditHandler` above for editing.
     */
    setTreeToggleHandler(fn: (row: RowNode, direction: 'left' | 'right') => boolean): void;
    /**
     * Register a callback invoked after every active-cell change so the grid body
     * can scroll the newly active cell into view (AG Grid-style auto-scroll).
     * The renderer wires this in `buildLayout`.
     *
     * @param fn - Called with the new `rowIndex` and `colIndex` after each navigation.
     */
    setScrollToCellCallback(fn: (rowIndex: number, colIndex: number) => void): void;
    /**
     * Registers a callback that returns the number of data rows currently
     * visible in the body viewport.  Used by PageUp / PageDown to compute the
     * jump distance.  Wired by `GridRenderer` via the scroll controller.
     *
     * @param fn - Returns the visible row count (≥ 1).
     */
    setGetViewportRowCountCallback(fn: () => number): void;
    /**
     * Register a callback invoked after a data mutation (fill, cut, paste, undo/redo).
     * Pass `nodeIds` to evict only the mutated rows from the renderer cache;
     * omit to fall back to a full cache clear.
     *
     * @param fn - Called with an optional set of mutated row node IDs.
     */
    setDataChangedCallback(fn: (nodeIds?: Set<string>) => void): void;
    /**
     * Registers a callback invoked on every fill-drag `mousemove` with the
     * current cursor coordinates.  Wire this to `AutoScroller.updateMouse` in
     * the grid renderer to enable edge auto-scrolling during fill-handle drags.
     *
     * @param fn - Called with `clientX` and `clientY` of each mousemove event.
     */
    setFillDragScrollCallback(fn: (clientX: number, clientY: number) => void): void;
    /**
     * Registers a callback invoked when the fill drag ends (mouseup).
     * Wire this to `AutoScroller.stop` in the grid renderer so the RAF loop
     * terminates as soon as the user releases the fill handle.
     *
     * @param fn - Called with no arguments when the fill drag terminates.
     */
    setFillDragEndCallback(fn: () => void): void;
    /**
     * Registers a callback that returns the bounding rect of the grid's scroll
     * viewport (`bodyWrapEl`).  When set, `processFillPosition` clamps its
     * hit-test coordinates to just inside this rect so edge cells are always
     * found even when the cursor has moved outside the grid boundary.
     *
     * @param fn - Returns the current viewport `DOMRect`, or `null` when unmounted.
     */
    setDragViewportRectCallback(fn: () => DOMRect | null): void;
    /**
     * Re-evaluates which cell lies at `(clientX, clientY)` and updates the fill
     * direction and dashed preview accordingly.  Called by the auto-scroller's
     * `onScrolled` callback so the preview stays current after the grid has
     * scrolled under a stationary cursor.
     *
     * No-op when no fill drag is currently active.
     *
     * @param clientX - Viewport X coordinate of the drag cursor.
     * @param clientY - Viewport Y coordinate of the drag cursor.
     */
    updateFillPosition(clientX: number, clientY: number): void;
    detach(): void;
    startSelection(rowIndex: number, colIndex: number, extend?: boolean): void;
    extendSelection(rowIndex: number, colIndex: number): void;
    endSelection(): void;
    clearSelection(): void;
    isCellSelected(rowIndex: number, colIndex: number): boolean;
    /**
     * Adds the given cell as a new independent 1×1 range to the selection
     * (Ctrl+Click multi-range).  If the cell is already the sole member of a
     * 1×1 range it is deselected instead (toggle behaviour matching AG Grid).
     *
     * @param rowIndex - Row index of the clicked cell.
     * @param colIndex - Column index of the clicked cell.
     */
    addRangeCell(rowIndex: number, colIndex: number): void;
    /**
     * Applies selection CSS classes to every visible cell DOM element.
     *
     * For multi-range selections (Ctrl+Click) edge classes are unioned across
     * all ranges a cell belongs to, so each range always renders a complete
     * closed border regardless of how many ranges share a cell.
     *
     * After updating classes, repositions the fill handle at the primary
     * range's bottom-right corner.
     */
    applySelectionClasses(): void;
    /** @deprecated Use `applySelectionClasses` directly. Kept for caller compatibility. */
    renderSelection(_getCellRect: (r: number, c: number) => DOMRect | null): void;
    /**
     * Creates (once) or repositions the fill handle at the bottom-right corner
     * of the primary selection range.  Hidden during an active fill drag or when
     * there are multiple ranges (Ctrl+Click mode).
     *
     * The element uses `position: fixed` so it always sits above the grid
     * regardless of overflow or scroll state.
     */
    private updateFillHandle;
    /** Hides the fill handle and clears the overflow-visible class from its host cell. */
    private hideFillHandle;
    /**
     * Begins a fill-handle drag operation.  Captures the current selection as
     * the fill source and attaches document-level mouse event listeners.
     */
    private startFillDrag;
    /**
     * Handles fill-drag `mousemove` by delegating position processing and
     * notifying the auto-scroller callback so edge scrolling can be triggered.
     */
    private onFillMouseMove;
    /**
     * Core fill-drag position logic: resolves the fill direction and target
     * cell from a viewport coordinate pair, then refreshes the dashed preview.
     *
     * Separated from `onFillMouseMove` so it can also be called by the
     * auto-scroller's `onScrolled` callback — keeping the preview accurate
     * after the grid has scrolled under a stationary cursor.
     *
     * @param clientX - Viewport X coordinate of the drag cursor.
     * @param clientY - Viewport Y coordinate of the drag cursor.
     */
    private processFillPosition;
    /**
     * Applies `pg-cell--fill-preview` and its directional edge classes to
     * cells in the fill target area, replacing any previous preview.
     */
    private updateFillPreview;
    /**
     * Finalises the fill drag: applies data, clears preview classes, and
     * restores the fill handle to its resting position.
     */
    private onFillMouseUp;
    /**
     * Copies source cell values into the fill target area.
     *
     * Cycling semantics:
     * - Vertical fill: each column in the fill area copies from the same
     *   column in the source range, cycling rows (`srcH` modulo).
     * - Horizontal fill: each row copies from the same row in the source
     *   range, cycling columns (`srcW` modulo).
     *
     * The operation is recorded in the undo/redo engine and triggers an
     * immediate renderer refresh via `dataChangedCallback`.
     */
    private applyFill;
    /**
     * Flashes the cells in the filled area with a success colour overlay,
     * giving clear visual feedback that the fill operation succeeded.
     *
     * Uses `::before` so it never conflicts with the selection `::after` border.
     *
     * @param startRow - First row of the fill target area.
     * @param endRow   - Last row of the fill target area.
     * @param startCol - First column of the fill target area.
     * @param endCol   - Last column of the fill target area.
     */
    /**
     * Applies a flash animation to all visible cells within the given row/column
     * bounding box.
     *
     * @param startRow   - First row index (inclusive).
     * @param endRow     - Last row index (inclusive).
     * @param startCol   - First column index (inclusive, ≥ 0).
     * @param endCol     - Last column index (inclusive).
     * @param flashClass - CSS class that carries the animation keyframe.
     *                     Defaults to `'pg-cell--fill-flash'` (green success).
     *                     Pass `'pg-cell--cut-flash'` for the red danger flash.
     */
    private flashFillArea;
    moveActiveCell(dRow: number, dCol: number, rowCount: number, colCount: number, extend?: boolean): void;
    jumpToEdge(direction: 'up' | 'down' | 'left' | 'right', rowCount: number, colCount: number, extend?: boolean): void;
    setChartOpenCallback(fn: (type: string) => void): void;
    copySelection(rows: RowNode[], columns: ColumnDef[]): Promise<void>;
    copySelectionWithHeaders(rows: RowNode[], columns: ColumnDef[]): Promise<void>;
    cutSelection(rows: RowNode[], columns: ColumnDef[]): Promise<void>;
    pasteSelection(rows: RowNode[], columns: ColumnDef[]): Promise<void>;
    /**
     * Reverts the most recent recorded action (edit / cut / paste) by applying
     * the inverse cell changes and triggering a re-render.
     * No-op when the undo stack is empty or no engine is wired up.
     */
    private performUndo;
    /**
     * Re-applies the most recently undone action and triggers a re-render.
     * No-op when the redo stack is empty or no engine is wired up.
     */
    private performRedo;
    /**
     * Writes the given cell changes into `allRows`, triggers a renderer refresh,
     * scrolls the first affected cell into view, and flashes the affected region.
     *
     * Used by both `performUndo` and `performRedo`.
     *
     * A `Map<nodeId, RowNode>` is built once before the change loop so each row
     * lookup is O(1) instead of O(n) — important for large paste undo operations.
     *
     * @param changes - Ordered list of `{ nodeId, field, newValue }` to apply.
     */
    private applyUndoRedoChanges;
    /**
     * Returns the `field` name of the innermost (deepest) grouping column, or
     * `undefined` when no grouping is active.
     *
     * Reads from the store's full column list (including hidden columns) rather
     * than the visible-columns slice passed to copy/cut/paste methods — the
     * grouped column is often hidden from the regular column display (visible: false)
     * but the leaf group cell must still be able to copy its value.
     */
    private getLeafGroupField;
    showContextMenu(x: number, y: number): void;
    hideContextMenu(): void;
    private flashSelection;
    private clearCutCellsInDom;
    private getVisibleColumns;
    /**
     * Coerces `value` to the primitive type expected by `targetType`.
     *
     * Called by `applyFill` whenever the source column type differs from the
     * destination column type so that data remains correctly typed after a
     * cross-type fill — even if the result is `NaN` or an `Invalid Date`.
     *
     * | `targetType`                    | Conversion                          |
     * |---------------------------------|-------------------------------------|
     * | `'number'` / `'currency'` /     | `Number(value)` — may produce `NaN` |
     * | `'percentage'`                  |                                     |
     * | `'date'`                        | `new Date(String(value))` — may     |
     * |                                 | produce `Invalid Date`              |
     * | `'boolean'`                     | `Boolean(value)`                    |
     * | `'string'`                      | `String(value)` if not already      |
     * | anything else                   | unchanged                           |
     *
     * @param value      - Raw value from the source cell.
     * @param targetType - `ColumnDef.type` of the destination column.
     */
    private coerceToColumnType;
    private onKeydown;
    private selectAll;
    private buildContextMenu;
    private exportAsCsv;
    private emitSelectionChanged;
}
//# sourceMappingURL=cell-selection-engine.d.ts.map