/**
 * @file undo-redo-engine.ts
 * Standalone undo/redo history manager for cell data mutations.
 *
 * Design goals
 * ────────────
 * • Zero dependencies — no GridStore, EventBus, or DOM access.
 * • Deduplication — no-op changes (oldValue === newValue) and exact stack
 *   duplicates are silently dropped so repeated Ctrl+X on an already-null cell
 *   costs nothing.
 * • Edit squashing — consecutive edits to the same cell are merged into one
 *   entry (keeps the original `oldValue`, updates `newValue`) so a single
 *   Ctrl+Z undoes the whole editing session rather than stepping through every
 *   intermediate commit.
 * • Capped stacks — both undo and redo stacks are bounded by `maxStackSize`
 *   (default 200) to prevent unbounded memory growth on long sessions.
 * • Redo invalidation — recording a new action clears the redo stack, matching
 *   the standard branching-history model.
 */
/**
 * A before-and-after snapshot of a single cell value mutation.
 * `nodeId` + `field` uniquely identify the cell across renders.
 */
export interface CellChange {
    /** Stable row identity — survives sort/filter/group operations. */
    nodeId: string;
    /** Dot-notation field path in the row's `data` object. */
    field: string;
    /** Value before the mutation (restored on undo). */
    oldValue: unknown;
    /** Value after the mutation (re-applied on redo). */
    newValue: unknown;
}
/** Discriminated label for what kind of operation produced the action. */
export type UndoRedoActionType = 'edit' | 'cut' | 'paste';
/**
 * One reversible step on the history stack.
 * Contains every cell that changed as part of a single user gesture.
 */
export interface UndoRedoAction {
    /** What triggered this history entry. */
    type: UndoRedoActionType;
    /**
     * Ordered list of mutations.  Only meaningful changes are stored
     * (i.e. `oldValue !== newValue` for every entry).
     */
    changes: CellChange[];
}
export declare class UndoRedoEngine {
    private undoStack;
    private redoStack;
    private readonly maxStackSize;
    /**
     * @param maxStackSize - Upper bound for each stack (default: 200).
     */
    constructor(maxStackSize?: number);
    /** `true` when there is at least one action that can be undone. */
    get canUndo(): boolean;
    /** `true` when there is at least one action that can be redone. */
    get canRedo(): boolean;
    /**
     * Records a new action onto the undo stack.
     *
     * ### Deduplication rules (applied in order)
     * 1. **No-op filter** — individual changes where `oldValue === newValue`
     *    (via `Object.is`) are stripped.  If all changes are no-ops, the entire
     *    action is silently discarded (e.g. cutting an already-null cell).
     * 2. **Exact duplicate** — if the incoming action is byte-for-byte identical
     *    to the current stack top it is discarded, preventing repeated identical
     *    operations from inflating the stack.
     * 3. **Edit squash** — when the new action is `'edit'` AND the stack top is
     *    also `'edit'` on the **same single cell** (`nodeId` + `field` match),
     *    the top entry's `newValue` is updated in-place.  This collapses a rapid
     *    sequence of edits into one undo step while preserving the original
     *    `oldValue`, so Ctrl+Z always jumps back to the value before the first
     *    edit in the session.
     *
     * Recording always clears the redo stack (branching-history model).
     *
     * @param action - The action to record.
     */
    record(action: UndoRedoAction): void;
    /**
     * Pops the most recent action off the undo stack and returns the **inverse**
     * changes that the caller must apply to restore the previous state.
     *
     * The popped action is pushed onto the redo stack so it can be re-applied.
     *
     * @returns Inverse `CellChange[]` to apply, or `null` if the stack is empty.
     */
    undo(): CellChange[] | null;
    /**
     * Pops the most recently undone action off the redo stack and returns its
     * **forward** changes so the caller can re-apply them.
     *
     * The action is pushed back onto the undo stack.
     *
     * @returns Forward `CellChange[]` to apply, or `null` if the stack is empty.
     */
    redo(): CellChange[] | null;
    /**
     * Empties both the undo and redo stacks.
     * Call when the underlying dataset is completely replaced (e.g. `api.setData`)
     * so stale history cannot corrupt the new data.
     */
    clear(): void;
    /**
     * Returns `true` when two actions are structurally identical:
     * same `type`, same number of changes, and every change has the same
     * `nodeId`, `field`, `oldValue`, and `newValue` (compared via `Object.is`).
     */
    private actionsIdentical;
}
//# sourceMappingURL=undo-redo-engine.d.ts.map