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
 * - `'group'`  – a row-group or tree node expanded/collapsed. Like `'filter'`
 *   (carried-over rows FLIP, new child rows fade in) but it is a *localized*
 *   insert/remove, never a page swap — so it is exempt from the page-replace
 *   fallback that would otherwise slide the whole viewport (see
 *   {@link PAGE_REPLACE_SHARE_THRESHOLD}). Expanding a large group makes most
 *   of the virtualised window "new", which would trip that heuristic and jerk
 *   the entire body; anchoring the carried-over rows keeps the toggle steady.
 */
export type RowAnimationType = 'sort' | 'filter' | 'detail' | 'group';

// ─── Tuning constants ─────────────────────────────────────────────────────────

/** How far (px) a newly-appearing row slides up during its entrance fade. */
const FILTER_ENTER_OFFSET_PX = 8;

/**
 * How far (px) the page slides up during a whole-page swap entrance.
 *
 * A page swap uses a transform-only slide (no opacity change) so the content is
 * never hidden — animating a full page's opacity from 0 reads as a jarring
 * flash/blink. A slightly larger offset than the single-row fade keeps the
 * settle perceptible without opacity.
 */
const PAGE_ENTER_OFFSET_PX = 14;

/**
 * Minimum fraction of the rendered rows that must have existed in the previous
 * frame for a per-row FLIP to be used.
 *
 * When fewer than this fraction carried over, the pipeline effectively replaced
 * the page's contents — e.g. sorting or filtering while paginated pulls in rows
 * from other pages, so the "before" and "after" row sets are largely disjoint.
 * A FLIP across disjoint sets looks chaotic (a handful of rows slide across the
 * viewport while the rest pop in), so instead the whole page plays one uniform
 * entrance. This keeps every paginated sort/filter transition looking identical
 * regardless of how many rows happened to overlap. At 1.0-overlap (no
 * pagination, or a same-page reorder) the classic FLIP is always used.
 */
const PAGE_REPLACE_SHARE_THRESHOLD = 0.5;

const SORT_DURATION_MS   = 200;
const FILTER_DURATION_MS = 200;
const DETAIL_DURATION_MS = 200;

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
 *
 * ### Paginated data
 * `capture()`/`animate()` compare only the rows of the **current page** (the
 * pipeline paginates before laying out `visibleRows`). When a sort or filter
 * swaps most of the page's rows for rows from other pages, a per-row FLIP would
 * be meaningless, so the whole page instead plays one uniform transform-only
 * slide entrance — opacity is left untouched so the content never blinks. This
 * makes every paginated sort/filter transition stable, smooth and identical,
 * rather than a mix of a few sliding rows and many that snap into place. See
 * {@link PAGE_REPLACE_SHARE_THRESHOLD}.
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

    const duration =
      this.animationType === 'filter' ? FILTER_DURATION_MS :
      this.animationType === 'detail' ? DETAIL_DURATION_MS :
      this.animationType === 'group'  ? FILTER_DURATION_MS :
      SORT_DURATION_MS;
    const newTopMap = new Map(newRows.map((r) => [r.nodeId, r.top]));

    // Collect the rows currently in the DOM — the virtualised window of the
    // (possibly new) page — paired with their old and new vertical positions.
    // `oldTop === undefined` ⇒ the row was not in the previous frame (new to the
    // page); `newTop === undefined` ⇒ it is not part of the freshly laid-out set.
    const entries: Array<{ el: HTMLElement; oldTop: number | undefined; newTop: number | undefined }> = [];
    for (const container of containers) {
      for (const el of container.querySelectorAll<HTMLElement>('[data-node-id]')) {
        const nodeId = el.getAttribute('data-node-id');
        if (!nodeId) continue;
        entries.push({ el, oldTop: snap.get(nodeId), newTop: newTopMap.get(nodeId) });
      }
    }
    if (entries.length === 0) return;

    // Fraction of rendered rows that carried over from the previous frame. A low
    // value means the page's contents were swapped out (paginated sort/filter),
    // so a per-row FLIP would read as chaotic — fall back to a single uniform
    // entrance for the whole page. See PAGE_REPLACE_SHARE_THRESHOLD.
    //
    // Localized expand/collapse toggles ('group', 'detail') are exempt: they
    // insert/remove rows in place while the surrounding rows stay put, so the
    // page-replace slide would jerk the whole body even though it is not a page
    // swap. They always use the per-row FLIP + fade path instead.
    const localizedToggle = this.animationType === 'group' || this.animationType === 'detail';
    const sharedCount = entries.reduce((n, e) => n + (e.oldTop !== undefined ? 1 : 0), 0);
    const pageReplaced =
      !localizedToggle && sharedCount / entries.length < PAGE_REPLACE_SHARE_THRESHOLD;

    const toFlip: Array<{ el: HTMLElement; delta: number }> = [];
    const toFadeIn: HTMLElement[] = [];
    const toSlideIn: HTMLElement[] = [];

    if (pageReplaced) {
      // Page-level swap: every rendered row slides in together with a single
      // transform-only entrance. Opacity is deliberately left untouched — fading
      // a whole page from 0 reads as a flash/blink; a uniform slide keeps the
      // content visible the entire time, so the transition is stable and smooth.
      for (const e of entries) toSlideIn.push(e.el);
    } else {
      for (const e of entries) {
        if (e.oldTop === undefined) {
          // New to this frame → fade it in. Applied for every operation type
          // (not just filter/detail) so a paginated sort's incoming rows
          // animate consistently instead of snapping into place.
          toFadeIn.push(e.el);
          continue;
        }
        if (e.newTop === undefined) continue;

        const rawDelta = e.oldTop - e.newTop;
        if (Math.abs(rawDelta) < 1) continue;

        const delta =
          maxDelta !== undefined && Math.abs(rawDelta) > maxDelta
            ? Math.sign(rawDelta) * maxDelta
            : rawDelta;

        toFlip.push({ el: e.el, delta });
      }
    }

    if (toFlip.length === 0 && toFadeIn.length === 0 && toSlideIn.length === 0) return;

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
    for (const el of toSlideIn) {
      el.style.willChange = 'transform';
      el.style.transition = 'none';
      el.style.transform = `translateY(${PAGE_ENTER_OFFSET_PX}px)`;
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
      for (const el of toSlideIn) {
        el.style.transition = flipTransition;
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
        for (const el of toSlideIn) {
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
