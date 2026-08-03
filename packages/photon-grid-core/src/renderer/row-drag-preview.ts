/**
 * Geometry for the **row-drag preview**: where the dragged row would land, and
 * which rows shift to make room for it.
 *
 * Previously the preview was produced by copying the entire row array, splicing
 * the dragged row into place, and re-accumulating every `top` from zero. That is
 * O(dataset) on every pointer move — unusable past a few thousand rows, and
 * outright broken against a demand-loading model's sparse array, whose holes it
 * would dereference.
 *
 * A reorder only ever moves rows *between* the drag's origin and its
 * destination, and every one of them moves by exactly the dragged row's height.
 * So the whole preview reduces to a range and a signed delta, computed here in
 * constant time — the caller then applies it to the handful of rows actually on
 * screen.
 *
 * @packageDocumentation
 */

/** Vertical metrics of one row, in content pixels. */
export interface RowMetrics {
  readonly top: number;
  readonly height: number;
}

/**
 * The previewed reorder, expressed against the row array's *current* indices.
 *
 * Apply with {@link previewTopFor}, which needs nothing but a row's existing
 * `top`.
 */
export interface RowDragPreview {
  /** Where the dragged row's own `top` moves to. */
  readonly draggedTop: number;
  /**
   * Index the dragged row ends up at once the move is applied — equivalently,
   * the insertion point into the array with the dragged row removed.
   */
  readonly insertIndex: number;
  /** First index displaced by the move, inclusive. */
  readonly shiftStart: number;
  /** Last index displaced by the move, inclusive. */
  readonly shiftEnd: number;
  /**
   * Pixel delta applied to every row in `[shiftStart, shiftEnd]` — negative
   * when the dragged row moves down past them, positive when it moves up.
   */
  readonly shiftDelta: number;
}

/**
 * Computes the preview for dropping the row at `fromIndex` before/after the row
 * at `targetIndex`.
 *
 * @param fromIndex     - Current index of the dragged row.
 * @param targetIndex   - Current index of the row being dropped onto.
 * @param position      - Which side of the target the row lands on.
 * @param rowCount      - Length of the row array.
 * @param metrics       - Vertical metrics by index. May return `null` for an
 *                        index the caller cannot resolve (an unloaded row in a
 *                        sparse model), which aborts the preview.
 * @returns The preview, or `null` when the drop would not change the order or
 *          the geometry it depends on is unavailable.
 */
export function computeRowDragPreview(
  fromIndex: number,
  targetIndex: number,
  position: 'before' | 'after',
  rowCount: number,
  metrics: (index: number) => RowMetrics | null,
): RowDragPreview | null {
  if (fromIndex < 0 || targetIndex < 0) return null;
  if (fromIndex >= rowCount || targetIndex >= rowCount) return null;
  if (rowCount < 2 || fromIndex === targetIndex) return null;

  const dragged = metrics(fromIndex);
  if (!dragged) return null;

  // Index the dragged row would occupy in the array with itself removed —
  // the same value the old splice-based code arrived at, minus the splice.
  const targetInReduced = targetIndex < fromIndex ? targetIndex : targetIndex - 1;
  const insertIndex = targetInReduced + (position === 'after' ? 1 : 0);

  // Landing back in its own slot is a no-op, not a zero-pixel animation.
  if (insertIndex === fromIndex) return null;

  if (insertIndex < fromIndex) {
    // Moving up: everything from the insertion point down to the row above the
    // drag's origin slides down by one row's height to open the slot.
    const anchor = metrics(insertIndex);
    if (!anchor) return null;
    return {
      draggedTop: anchor.top,
      insertIndex,
      shiftStart: insertIndex,
      shiftEnd: fromIndex - 1,
      shiftDelta: dragged.height,
    };
  }

  // Moving down: the rows it passes slide up, and it lands flush against the
  // bottom of the last one — i.e. the anchor's *bottom* minus its own height.
  const anchor = metrics(insertIndex);
  if (!anchor) return null;
  return {
    draggedTop: anchor.top + anchor.height - dragged.height,
    insertIndex,
    shiftStart: fromIndex + 1,
    shiftEnd: insertIndex,
    shiftDelta: -dragged.height,
  };
}

/**
 * The previewed `top` for the row at `index`, given its current `top`.
 *
 * @returns The new top, or `null` when the row does not move (so the caller can
 *          skip emitting an override for it).
 */
export function previewTopFor(
  preview: RowDragPreview,
  index: number,
  fromIndex: number,
  currentTop: number,
): number | null {
  if (index === fromIndex) return preview.draggedTop;
  if (index >= preview.shiftStart && index <= preview.shiftEnd) return currentTop + preview.shiftDelta;
  return null;
}
