/**
 * A single reorderable column participating in a drag, described purely by its
 * id and rendered width. No DOM node is referenced — the model is deliberately
 * platform-free so it can be unit-tested and reused by any renderer.
 */
export interface ColumnDragSlot {
  /** Stable column identifier. */
  readonly colId: string;
  /** Rendered width in CSS pixels, as resolved by `ColumnStyleManager`. */
  readonly width: number;
}

/**
 * Lowest `enterRatio` that cannot oscillate.
 *
 * A swap commits when the preview covers `enterRatio` of the neighbour; the
 * reverse swap becomes possible only once it covers `1 - enterRatio` of that
 * same neighbour from the other side. The two thresholds therefore only stay
 * disjoint while `enterRatio >= 0.5`. Anything lower would let a stationary
 * pointer satisfy both conditions at once and flip the order every frame.
 */
export const MIN_ENTER_RATIO = 0.5;

/** Default coverage required before a swap commits — the neighbour's midpoint. */
export const DEFAULT_ENTER_RATIO = 0.5;

/**
 * Order model for an AG Grid-style column drag.
 *
 * The dragged column is treated as a free-floating **preview rectangle** whose
 * left edge is driven by the pointer. Every frame the preview is compared with
 * its immediate neighbours in the *current preview order*; once it covers more
 * than `enterRatio` of a neighbour, the two exchange slots. Because a swap
 * displaces the neighbour by its own width, the inverse condition cannot
 * immediately hold — the hysteresis is structural rather than an epsilon, so a
 * pointer resting exactly on a boundary never flickers.
 *
 * All geometry is expressed in **panel-content space**: `0` is the left edge of
 * the panel's first column, and positions accumulate column widths from there.
 * The caller converts pointer coordinates into that space, which keeps the
 * model independent of scrolling, pinning and viewport offsets.
 *
 * Complexity: `update()` is O(1) in the common frame (no swap) and O(n) on the
 * frames where the order actually changes. No allocation occurs after
 * construction — the position maps are mutated in place.
 *
 * @example
 * ```ts
 * const model = new ColumnReorderModel(
 *   [{ colId: 'a', width: 100 }, { colId: 'b', width: 120 }],
 *   'a',
 *   0.5,
 * );
 * if (model.update(previewLeft)) applyTransforms(model);
 * ```
 */
export class ColumnReorderModel {
  private readonly widthById = new Map<string, number>();
  private readonly originLeftById = new Map<string, number>();
  private readonly targetLeftById = new Map<string, number>();
  private readonly previewOrder: string[];
  private readonly enterRatio: number;
  private readonly sourceWidth: number;
  private readonly initialIndex: number;
  private sourceIdx: number;

  /**
   * @param slots       - Panel columns in their current (pre-drag) display order.
   * @param sourceColId - Id of the grabbed column; must exist in `slots`.
   * @param enterRatio  - Fraction of a neighbour the preview must cover before
   *                      the swap commits. Clamped to `[0.5, 1]`; see
   *                      {@link MIN_ENTER_RATIO}.
   */
  constructor(
    slots: readonly ColumnDragSlot[],
    private readonly sourceColId: string,
    enterRatio: number = DEFAULT_ENTER_RATIO,
  ) {
    this.enterRatio = Math.min(1, Math.max(MIN_ENTER_RATIO, enterRatio));
    this.previewOrder = new Array<string>(slots.length);

    let x = 0;
    for (let i = 0; i < slots.length; i++) {
      const { colId, width } = slots[i];
      this.previewOrder[i] = colId;
      this.widthById.set(colId, width);
      this.originLeftById.set(colId, x);
      this.targetLeftById.set(colId, x);
      x += width;
    }

    this.initialIndex = this.previewOrder.indexOf(sourceColId);
    this.sourceIdx = this.initialIndex;
    this.sourceWidth = this.widthById.get(sourceColId) ?? 0;
  }

  /** `true` when the grabbed column was found in the supplied slots. */
  get isValid(): boolean {
    return this.initialIndex !== -1;
  }

  /** The grabbed column's index in the pre-drag order. */
  get originalIndex(): number {
    return this.initialIndex;
  }

  /** The grabbed column's index in the current preview order — its drop slot. */
  get targetIndex(): number {
    return this.sourceIdx;
  }

  /** The live preview order of column ids. Do not mutate. */
  get order(): readonly string[] {
    return this.previewOrder;
  }

  /** `true` when the preview order differs from the pre-drag order. */
  get hasMoved(): boolean {
    return this.sourceIdx !== this.initialIndex;
  }

  /**
   * Left edge of a column in its pre-drag position, in panel-content space.
   *
   * @param colId - Column to look up.
   * @returns The origin offset, or `0` for an unknown column.
   */
  originLeftOf(colId: string): number {
    return this.originLeftById.get(colId) ?? 0;
  }

  /**
   * Horizontal shift a column must render with to appear in its preview slot.
   *
   * This is the value written to the `--pg-drag-x` custom property. The grabbed
   * column is excluded — it follows the pointer instead and is positioned by
   * the caller.
   *
   * @param colId - Column to look up.
   * @returns `targetLeft - originLeft`, or `0` when nothing moved.
   */
  offsetFor(colId: string): number {
    const target = this.targetLeftById.get(colId);
    if (target === undefined) return 0;
    return target - (this.originLeftById.get(colId) ?? 0);
  }

  /**
   * Advances the preview order for the frame's pointer position.
   *
   * Swaps are applied in a loop so a fast drag across several narrow columns
   * resolves completely within the same frame instead of lagging one column
   * behind the pointer.
   *
   * @param previewLeft - Left edge of the preview rectangle, in panel-content
   *                      space (`pointerX - grabOffsetX`, scroll-corrected).
   * @returns `true` when the order changed and transforms must be re-applied.
   */
  update(previewLeft: number): boolean {
    if (this.initialIndex === -1) return false;

    const previewRight = previewLeft + this.sourceWidth;
    let changed = false;

    // Guarded by the slot count: each iteration moves the source one slot, so
    // the loop can never exceed the number of columns even if a threshold is
    // mis-configured.
    for (let guard = this.previewOrder.length; guard > 0; guard--) {
      if (this.trySwapRight(previewRight)) { changed = true; continue; }
      if (this.trySwapLeft(previewLeft))   { changed = true; continue; }
      break;
    }

    return changed;
  }

  /**
   * Exchanges the source with its right-hand neighbour when the preview has
   * covered `enterRatio` of it.
   */
  private trySwapRight(previewRight: number): boolean {
    const idx = this.sourceIdx + 1;
    if (idx >= this.previewOrder.length) return false;

    const neighbour = this.previewOrder[idx];
    const nbrLeft = this.targetLeftById.get(neighbour) ?? 0;
    const nbrWidth = this.widthById.get(neighbour) ?? 0;

    if (previewRight <= nbrLeft + nbrWidth * this.enterRatio) return false;

    this.commitSwap(idx, neighbour, nbrWidth);
    return true;
  }

  /**
   * Exchanges the source with its left-hand neighbour when the preview has
   * covered `enterRatio` of it.
   */
  private trySwapLeft(previewLeft: number): boolean {
    const idx = this.sourceIdx - 1;
    if (idx < 0) return false;

    const neighbour = this.previewOrder[idx];
    const nbrLeft = this.targetLeftById.get(neighbour) ?? 0;
    const nbrWidth = this.widthById.get(neighbour) ?? 0;

    if (previewLeft >= nbrLeft + nbrWidth * (1 - this.enterRatio)) return false;

    this.commitSwap(idx, neighbour, nbrWidth);
    return true;
  }

  /**
   * Applies one source ⇄ neighbour exchange.
   *
   * Only the two participants change position — every other column keeps its
   * slot — so the target map is patched in O(1) instead of re-accumulating the
   * whole panel. Keeping it exact matters inside {@link update}'s loop, where
   * the next iteration reads these positions to test the following neighbour.
   *
   * @param idx       - Index the source moves to (the neighbour's current index).
   * @param neighbour - Column id being displaced.
   * @param nbrWidth  - The neighbour's width, already resolved by the caller.
   */
  private commitSwap(idx: number, neighbour: string, nbrWidth: number): void {
    const movingRight = idx > this.sourceIdx;
    const srcLeft = this.targetLeftById.get(this.sourceColId) ?? 0;

    if (movingRight) {
      // Neighbour slides back into the source's slot; the source lands after it.
      this.targetLeftById.set(neighbour, srcLeft);
      this.targetLeftById.set(this.sourceColId, srcLeft + nbrWidth);
    } else {
      // Source takes the neighbour's slot; the neighbour follows it.
      const nbrLeft = this.targetLeftById.get(neighbour) ?? 0;
      this.targetLeftById.set(this.sourceColId, nbrLeft);
      this.targetLeftById.set(neighbour, nbrLeft + this.sourceWidth);
    }

    this.previewOrder[this.sourceIdx] = neighbour;
    this.previewOrder[idx] = this.sourceColId;
    this.sourceIdx = idx;
  }
}
