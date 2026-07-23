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

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A before-and-after snapshot of a single cell value mutation.
 * `nodeId` + `field` uniquely identify the cell across renders.
 *
 * When the mutation involves a **formula** (entry, fill or paste of a `=` cell),
 * the optional `colId`/`oldFormula`/`newFormula` fields let undo/redo restore the
 * formula *source* rather than just its last computed value. A `*Formula` of
 * `null` means "no formula" (a literal); `undefined` means the change is not
 * formula-aware at all and only the value is restored.
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
  /** Immutable column identity — present on formula-aware changes. */
  colId?: string;
  /** Formula source before the mutation (`null` = was a literal). */
  oldFormula?: string | null;
  /** Formula source after the mutation (`null` = became a literal). */
  newFormula?: string | null;
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

// ── Engine ────────────────────────────────────────────────────────────────────

/** Maximum number of entries stored in each stack. */
const DEFAULT_MAX_STACK_SIZE = 200;

export class UndoRedoEngine {
  private undoStack: UndoRedoAction[] = [];
  private redoStack: UndoRedoAction[] = [];
  private readonly maxStackSize: number;

  /**
   * @param maxStackSize - Upper bound for each stack (default: 200).
   */
  constructor(maxStackSize = DEFAULT_MAX_STACK_SIZE) {
    this.maxStackSize = maxStackSize;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** `true` when there is at least one action that can be undone. */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** `true` when there is at least one action that can be redone. */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Number of actions currently on the undo stack. */
  getUndoSize(): number {
    return this.undoStack.length;
  }

  /** Number of actions currently on the redo stack. */
  getRedoSize(): number {
    return this.redoStack.length;
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
  record(action: UndoRedoAction): void {
    // ── 1. Strip no-op individual changes ──────────────────────────────────
    const meaningful = action.changes.filter(
      (c) => !Object.is(c.oldValue, c.newValue),
    );
    if (meaningful.length === 0) return;

    const normalised: UndoRedoAction = { type: action.type, changes: meaningful };

    const top = this.undoStack.length > 0
      ? this.undoStack[this.undoStack.length - 1]
      : null;

    // ── 2. Exact duplicate check ───────────────────────────────────────────
    if (top && this.actionsIdentical(top, normalised)) return;

    // ── 3. Edit squash (same cell, consecutive edits) ──────────────────────
    if (
      action.type === 'edit' &&
      top?.type === 'edit' &&
      meaningful.length === 1 &&
      top.changes.length === 1 &&
      top.changes[0].nodeId === meaningful[0].nodeId &&
      top.changes[0].field === meaningful[0].field
    ) {
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
  undo(): CellChange[] | null {
    const action = this.undoStack.pop();
    if (!action) return null;

    if (this.redoStack.length >= this.maxStackSize) this.redoStack.shift();
    this.redoStack.push(action);

    // Inverse: swap oldValue ↔ newValue so applying `newValue` restores the
    // original cell state. Formula fields are swapped too — on undo the cell's
    // target formula is whatever it had *before* the change (`oldFormula`).
    return action.changes.map((c) => ({
      nodeId: c.nodeId,
      field: c.field,
      oldValue: c.newValue,   // not used by the caller — kept for symmetry
      newValue: c.oldValue,   // caller writes this into row.data[field]
      colId: c.colId,
      oldFormula: c.newFormula,
      newFormula: c.oldFormula, // caller restores this formula (null = clear)
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
  redo(): CellChange[] | null {
    const action = this.redoStack.pop();
    if (!action) return null;

    if (this.undoStack.length >= this.maxStackSize) this.undoStack.shift();
    this.undoStack.push(action);

    return action.changes; // caller writes newValue into row.data[field]
  }

  /**
   * Empties both the undo and redo stacks.
   * Call when the underlying dataset is completely replaced (e.g. `api.setData`)
   * so stale history cannot corrupt the new data.
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Returns `true` when two actions are structurally identical:
   * same `type`, same number of changes, and every change has the same
   * `nodeId`, `field`, `oldValue`, and `newValue` (compared via `Object.is`).
   */
  private actionsIdentical(a: UndoRedoAction, b: UndoRedoAction): boolean {
    if (a.type !== b.type || a.changes.length !== b.changes.length) return false;
    for (let i = 0; i < a.changes.length; i++) {
      const ca = a.changes[i];
      const cb = b.changes[i];
      if (
        ca.nodeId !== cb.nodeId ||
        ca.field !== cb.field ||
        !Object.is(ca.oldValue, cb.oldValue) ||
        !Object.is(ca.newValue, cb.newValue)
      ) {
        return false;
      }
    }
    return true;
  }
}
