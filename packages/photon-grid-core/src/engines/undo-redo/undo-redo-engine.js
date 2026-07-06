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
// ── Engine ────────────────────────────────────────────────────────────────────
/** Maximum number of entries stored in each stack. */
const DEFAULT_MAX_STACK_SIZE = 200;
export class UndoRedoEngine {
    /**
     * @param maxStackSize - Upper bound for each stack (default: 200).
     */
    constructor(maxStackSize = DEFAULT_MAX_STACK_SIZE) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = maxStackSize;
    }
    // ── Public API ─────────────────────────────────────────────────────────────
    /** `true` when there is at least one action that can be undone. */
    get canUndo() {
        return this.undoStack.length > 0;
    }
    /** `true` when there is at least one action that can be redone. */
    get canRedo() {
        return this.redoStack.length > 0;
    }
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
    record(action) {
        // ── 1. Strip no-op individual changes ──────────────────────────────────
        const meaningful = action.changes.filter((c) => !Object.is(c.oldValue, c.newValue));
        if (meaningful.length === 0)
            return;
        const normalised = { type: action.type, changes: meaningful };
        const top = this.undoStack.length > 0
            ? this.undoStack[this.undoStack.length - 1]
            : null;
        // ── 2. Exact duplicate check ───────────────────────────────────────────
        if (top && this.actionsIdentical(top, normalised))
            return;
        // ── 3. Edit squash (same cell, consecutive edits) ──────────────────────
        if (action.type === 'edit' &&
            top?.type === 'edit' &&
            meaningful.length === 1 &&
            top.changes.length === 1 &&
            top.changes[0].nodeId === meaningful[0].nodeId &&
            top.changes[0].field === meaningful[0].field) {
            // Mutate the existing top entry: keep its oldValue, update its newValue.
            top.changes[0].newValue = meaningful[0].newValue;
            this.redoStack = [];
            return;
        }
        // ── Push to stack ──────────────────────────────────────────────────────
        if (this.undoStack.length >= this.maxStackSize) {
            this.undoStack.shift(); // evict oldest to stay within cap
        }
        this.undoStack.push(normalised);
        this.redoStack = []; // invalidate redo branch on any new action
    }
    /**
     * Pops the most recent action off the undo stack and returns the **inverse**
     * changes that the caller must apply to restore the previous state.
     *
     * The popped action is pushed onto the redo stack so it can be re-applied.
     *
     * @returns Inverse `CellChange[]` to apply, or `null` if the stack is empty.
     */
    undo() {
        const action = this.undoStack.pop();
        if (!action)
            return null;
        if (this.redoStack.length >= this.maxStackSize)
            this.redoStack.shift();
        this.redoStack.push(action);
        // Inverse: swap oldValue ↔ newValue so applying `newValue` restores the
        // original cell state.
        return action.changes.map((c) => ({
            nodeId: c.nodeId,
            field: c.field,
            oldValue: c.newValue, // not used by the caller — kept for symmetry
            newValue: c.oldValue, // caller writes this into row.data[field]
        }));
    }
    /**
     * Pops the most recently undone action off the redo stack and returns its
     * **forward** changes so the caller can re-apply them.
     *
     * The action is pushed back onto the undo stack.
     *
     * @returns Forward `CellChange[]` to apply, or `null` if the stack is empty.
     */
    redo() {
        const action = this.redoStack.pop();
        if (!action)
            return null;
        if (this.undoStack.length >= this.maxStackSize)
            this.undoStack.shift();
        this.undoStack.push(action);
        return action.changes; // caller writes newValue into row.data[field]
    }
    /**
     * Empties both the undo and redo stacks.
     * Call when the underlying dataset is completely replaced (e.g. `api.setData`)
     * so stale history cannot corrupt the new data.
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
    // ── Private helpers ────────────────────────────────────────────────────────
    /**
     * Returns `true` when two actions are structurally identical:
     * same `type`, same number of changes, and every change has the same
     * `nodeId`, `field`, `oldValue`, and `newValue` (compared via `Object.is`).
     */
    actionsIdentical(a, b) {
        if (a.type !== b.type || a.changes.length !== b.changes.length)
            return false;
        for (let i = 0; i < a.changes.length; i++) {
            const ca = a.changes[i];
            const cb = b.changes[i];
            if (ca.nodeId !== cb.nodeId ||
                ca.field !== cb.field ||
                !Object.is(ca.oldValue, cb.oldValue) ||
                !Object.is(ca.newValue, cb.newValue)) {
                return false;
            }
        }
        return true;
    }
}
//# sourceMappingURL=undo-redo-engine.js.map