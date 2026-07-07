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

// ─── Tuning constants ─────────────────────────────────────────────────────────

/** How far (px) a newly-appearing row slides up during its entrance fade. */
const FILTER_ENTER_OFFSET_PX = 8;

const SORT_DURATION_MS   = 280;
const FILTER_DURATION_MS = 200;
const DETAIL_DURATION_MS = 320;

/**
 * Smooth ease-in-out curve (Material Design "standard").
 * P1=(0.4,0) gives gentle initial acceleration; P2=(0.2,1) gives smooth
 * deceleration into the final position.  Both the sort FLIP and filter
 * entrance use this — it reads as natural motion in both cases.
 */
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

// ─── RowAnimator ─────────────────────────────────────────────────────────────

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
export class RowAnimator {
  private snapshot: Map<string, number> | null = null;
  private animationType: RowAnimationType = 'sort';
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Snapshot current row positions **before** a pipeline run so the animator
   * has a reference frame for the FLIP calculation.
   *
   * @param rows - Current visible rows (nodeId + top).
   * @param type - `'sort'` or `'filter'` — controls duration and entrance style.
   */
  capture(rows: ReadonlyArray<RowPosition>, type: RowAnimationType = 'sort'): void {
    if (this.cleanupTimer !== null) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.animationType = type;
    this.snapshot = new Map(rows.map((r) => [r.nodeId, r.top]));
  }

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
  animate(
    containers: HTMLElement[],
    newRows: ReadonlyArray<RowPosition>,
    maxDelta?: number,
  ): void {
    const snap = this.snapshot;
    this.snapshot = null;
    if (!snap || snap.size === 0) return;

    // 'sort' FLIP-slides only; 'filter' and 'detail' additionally fade in
    // newly-appearing rows — they share the same appear/disappear semantics,
    // just at different speeds.
    const usesFadeIn = this.animationType !== 'sort';
    const duration =
      this.animationType === 'filter' ? FILTER_DURATION_MS :
      this.animationType === 'detail' ? DETAIL_DURATION_MS :
      SORT_DURATION_MS;
    const newTopMap = new Map(newRows.map((r) => [r.nodeId, r.top]));

    const toFlip: Array<{ el: HTMLElement; delta: number }> = [];
    const toFadeIn: HTMLElement[] = [];

    for (const container of containers) {
      for (const el of container.querySelectorAll<HTMLElement>('[data-node-id]')) {
        const nodeId = el.getAttribute('data-node-id');
        if (!nodeId) continue;

        const oldTop = snap.get(nodeId);
        const newTop = newTopMap.get(nodeId);

        if (oldTop === undefined) {
          // Row is new — entrance fade only applies to filter/detail operations
          if (usesFadeIn) toFadeIn.push(el);
          continue;
        }
        if (newTop === undefined) continue;

        const rawDelta = oldTop - newTop;
        if (Math.abs(rawDelta) < 1) continue;

        const delta =
          maxDelta !== undefined && Math.abs(rawDelta) > maxDelta
            ? Math.sign(rawDelta) * maxDelta
            : rawDelta;

        toFlip.push({ el, delta });
      }
    }

    if (toFlip.length === 0 && toFadeIn.length === 0) return;

    // ── Invert phase ──────────────────────────────────────────────────────
    // Push each element back to its visual starting state (no transition yet).
    for (const { el, delta } of toFlip) {
      el.style.willChange = 'transform';
      el.style.transition = 'none';
      el.style.transform = `translateY(${delta}px)`;
    }
    for (const el of toFadeIn) {
      el.style.willChange = 'opacity, transform';
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = `translateY(${FILTER_ENTER_OFFSET_PX}px)`;
    }

    // Force a layout commit so the browser registers the above state
    // before we apply the transition.
    containers[0]?.offsetHeight;

    // ── Play phase ────────────────────────────────────────────────────────
    // Enable transitions and drive each element to its natural resting state.
    requestAnimationFrame(() => {
      const flipTransition  = `transform ${duration}ms ${EASING}`;
      const fadeTransition  = `opacity ${duration}ms ${EASING}, transform ${duration}ms ${EASING}`;

      for (const { el } of toFlip) {
        el.style.transition = flipTransition;
        el.style.transform  = 'translateY(0)';
      }
      for (const el of toFadeIn) {
        el.style.transition = fadeTransition;
        el.style.opacity    = '';   // restore to CSS default (1)
        el.style.transform  = '';   // restore to CSS default (none)
      }

      // ── Cleanup ───────────────────────────────────────────────────────
      // Strip all animation state after the transition completes so that
      // subsequent renders and style recalculations are not impeded.
      this.cleanupTimer = setTimeout(() => {
        this.cleanupTimer = null;
        for (const { el } of toFlip) {
          el.style.transform  = '';
          el.style.transition = '';
          el.style.willChange = '';
        }
        for (const el of toFadeIn) {
          el.style.opacity    = '';
          el.style.transform  = '';
          el.style.transition = '';
          el.style.willChange = '';
        }
      }, duration + 20);
    });
  }

  /** Returns `true` when a `capture()` is pending and the next `animate()` will run. */
  hasPending(): boolean {
    return this.snapshot !== null;
  }

  destroy(): void {
    if (this.cleanupTimer !== null) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.snapshot = null;
  }
}
