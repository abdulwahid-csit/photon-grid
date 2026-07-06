/** A row's identity and vertical position used for animation bookkeeping. */
export interface RowPosition {
    nodeId: string;
    top: number;
}
/**
 * Distinguishes the pipeline that caused the row change so the animator can
 * choose the appropriate duration and entrance style.
 *
 * - `'sort'`   – rows reorder; all existing rows slide to new positions.
 * - `'filter'` – rows appear / disappear; shifted rows slide, new rows fade in.
 * - `'detail'` – a Master/Detail row expanded/collapsed; shares filter's
 *   slide/fade-in behaviour but runs slightly slower — deliberately distinct
 *   from `'filter'` so tuning quick-filter typing feedback never affects the
 *   detail-row expand/collapse feel, and vice versa.
 */
export type RowAnimationType = 'sort' | 'filter' | 'detail';
/**
 * FLIP-based row animation engine.
 *
 * ### Usage
 * ```
 * // 1. Before the data pipeline:
 * animator.capture(currentVisibleRows, 'filter');
 *
 * // 2. After the DOM has been updated with the new row layout:
 * animator.animate(panelContainers, newVisibleRows);
 * ```
 *
 * ### Sort animation
 * Every row that existed before and after the sort slides from its old
 * vertical position to its new one (classic FLIP).
 *
 * ### Filter animation
 * - **Rows that moved** (still visible but at a different `top`): FLIP slide.
 * - **New rows** (not in the pre-filter snapshot): fade in from a small upward
 *   offset — identical to AG Grid's filter entrance.
 * - **Removed rows**: already gone from the DOM; no exit animation is attempted
 *   (matching AG Grid community behaviour).
 */
export declare class RowAnimator {
    private snapshot;
    private animationType;
    private cleanupTimer;
    /**
     * Snapshot current row positions **before** a pipeline run so the animator
     * has a reference frame for the FLIP calculation.
     *
     * @param rows - Current visible rows (nodeId + top).
     * @param type - `'sort'` or `'filter'` — controls duration and entrance style.
     */
    capture(rows: ReadonlyArray<RowPosition>, type?: RowAnimationType): void;
    /**
     * Apply animations to the panel containers after the DOM has been updated.
     *
     * For every `[data-node-id]` element found inside `containers`:
     * - **Known row (in snapshot)** whose `top` changed → FLIP slide.
     * - **New row (not in snapshot)** during a `filter` animation → fade-in entrance.
     *
     * @param containers - Body panel elements whose direct row children carry `data-node-id`.
     * @param newRows    - Newly rendered rows with updated `top` values.
     * @param maxDelta   - Clamp large per-row offsets to this many px so that rows
     *                     travelling many viewports start just off-screen rather than
     *                     miles away (prevents white-gap flashes).  Defaults to
     *                     one viewport height.
     */
    animate(containers: HTMLElement[], newRows: ReadonlyArray<RowPosition>, maxDelta?: number): void;
    /** Returns `true` when a `capture()` is pending and the next `animate()` will run. */
    hasPending(): boolean;
    destroy(): void;
}
//# sourceMappingURL=row-animator.d.ts.map