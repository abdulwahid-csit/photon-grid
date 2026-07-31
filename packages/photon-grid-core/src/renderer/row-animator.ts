/** A row's identity and vertical position used for animation bookkeeping. */
export interface RowPosition {
  nodeId: string;
  top: number;
}

/**
 * The per-panel DOM parts of one rendered row, as held by `BodyRenderer`'s
 * render cache. Passed to {@link RowAnimator.animate} directly so the animator
 * never has to re-query the DOM for elements the renderer already tracks.
 */
export interface RowPanelParts {
  left: HTMLElement | null;
  center: HTMLElement | null;
  right: HTMLElement | null;
}

/** The scroll window the animation is judged against, in content coordinates. */
export interface AnimationViewport {
  /** Current vertical scroll offset of the body. */
  scrollTop: number;
  /** Visible height of the body viewport. */
  height: number;
}

/**
 * Distinguishes the pipeline that caused the row change so the animator can
 * choose the appropriate duration and entrance style.
 *
 * - `'sort'`   – rows reorder; all existing rows slide to new positions.
 * - `'filter'` – rows appear / disappear; shifted rows slide, new rows fade in.
 * - `'detail'` – a Master/Detail row expanded/collapsed; shares filter's
 *   slide/fade-in behaviour but runs slightly faster — deliberately distinct
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

/**
 * Row-movement durations, in milliseconds.
 *
 * grid — `.pg-row-animation .pg-row { transition: transform 0.4s, top 0.4s; }`
 * — so a Photon sort settles on the same clock as an AG Grid sort. `detail`
 * stays deliberately shorter: a Master/Detail expand is a direct response to a
 * click on a single row, where 400 ms reads as laggy.
 */
const SORT_DURATION_MS   = 400;
const FILTER_DURATION_MS = 400;
const GROUP_DURATION_MS  = 400;
const DETAIL_DURATION_MS = 200;

/**
 * AG Grid's row transition declares no `transition-timing-function`, so it
 * resolves to the CSS initial value `ease` (`cubic-bezier(0.25, 0.1, 0.25, 1)`).
 * Photon previously used the Material "standard" curve, which starts noticeably
 * slower and decelerates harder — a visibly different motion signature on the
 * same duration. Matching `ease` is what makes the settle *feel* like AG Grid
 * rather than merely take the same time.
 */
const EASING = 'ease';

/**
 * Extra slack (in multiples of the viewport height) added around the visible
 * band when deciding whether a row's movement is worth animating.
 *
 * A row that starts or ends well outside the viewport contributes nothing the
 * user can see — animating it costs a compositor layer and, worse, produces the
 * long cross-screen slides that read as rows "flying". One viewport of slack
 * keeps rows that travel just past the edge (very common on a small reorder)
 * animating naturally, while excluding rows arriving from far away.
 */
const VIEWPORT_SLACK_FACTOR = 1;

// ─── RowAnimator ─────────────────────────────────────────────────────────────

/**
 * FLIP-based row animation engine.
 *
 * ### Usage
 * ```
 * // 1. Before the data pipeline:
 * animator.capture(currentVisibleRows, 'sort');
 *
 * // 2. After the DOM has been updated with the new row layout:
 * animator.animate(renderedRowParts, newVisibleRows, viewport);
 * ```
 *
 * ### Why FLIP, and why transforms
 * Rows are positioned by `top` (written into a single stylesheet by
 * `RowPositionSheet`), which is a layout property and cannot be animated
 * cheaply — transitioning `top` on hundreds of absolutely-positioned rows
 * forces layout every frame. So the new `top` is applied instantly and the
 * *visual* movement is played back on `transform`, which the compositor can run
 * without touching layout or paint. `translate3d` is used rather than
 * `translateY` so each animating row is promoted to its own GPU layer for the
 * duration.
 *
 * ### Ordering
 * The pipeline is strictly:
 * capture old positions → sort → render (DOM now shows the new order) →
 * read new positions → compute delta → invert via transform → one forced style
 * flush → `requestAnimationFrame` → play. `capture()` must be called *before*
 * the data pipeline runs; `animate()` *after* the renderer has committed the
 * new layout.
 *
 * ### Sort animation
 * Every row that existed before and after the sort, and whose movement is
 * visible, slides from its old vertical position to its new one (classic FLIP).
 *
 * ### Filter animation
 * - **Rows that moved** (still visible but at a different `top`): FLIP slide.
 * - **New rows** (not in the pre-filter snapshot): fade in from a small upward
 *   offset — identical to AG Grid's filter entrance.
 * - **Removed rows**: already gone from the DOM; no exit animation is attempted
 *   (matching AG Grid community behaviour).
 *
 * ### Virtualization
 * Only rows the renderer currently holds DOM for are considered, and of those
 * only rows whose movement intersects the viewport actually animate — see
 * {@link VIEWPORT_SLACK_FACTOR}. Sorting one million rows therefore animates
 * the same ~30 elements as sorting one hundred.
 *
 * ### Paginated data
 * `capture()`/`animate()` compare only the rows of the **current page** (the
 * pipeline paginates before laying out `visibleRows`). When a sort or filter
 * swaps most of the page's rows for rows from other pages, a per-row FLIP would
 * be meaningless, so the whole page instead plays one uniform transform-only
 * slide entrance — opacity is left untouched so the content never blinks. See
 * {@link PAGE_REPLACE_SHARE_THRESHOLD}.
 */
export class RowAnimator {
  private snapshot: Map<string, number> | null = null;
  private animationType: RowAnimationType = 'sort';

  /**
   * Elements carrying animation styles right now, with the `transitionend`
   * listener attached to each. Cleared eagerly at the start of the next
   * `animate()` and on `destroy()`, so a transition that never fires its end
   * event (element detached mid-flight) can still not leak `will-change`.
   */
  private readonly active = new Map<HTMLElement, (e: TransitionEvent) => void>();

  /**
   * `true` between the invert phase and the frame that starts the transitions.
   *
   * `active` is only populated once the play phase runs, so without this flag
   * the animator would report itself idle for one frame in the middle of a
   * sequence it is very much in the middle of.
   */
  private playPending = false;

  /** Scratch buffers, reused across runs so a sort allocates no per-row arrays. */
  private readonly toFlip: HTMLElement[] = [];
  private readonly flipDeltas: number[] = [];
  private readonly toFadeIn: HTMLElement[] = [];
  private readonly toSlideIn: HTMLElement[] = [];

  /**
   * Snapshot current row positions **before** a pipeline run so the animator
   * has a reference frame for the FLIP calculation.
   *
   * @param rows - Current visible rows (nodeId + top).
   * @param type - Controls duration and entrance style.
   */
  capture(rows: ReadonlyArray<RowPosition>, type: RowAnimationType = 'sort'): void {
    this.animationType = type;
    const snap = new Map<string, number>();
    for (const r of rows) snap.set(r.nodeId, r.top);
    this.snapshot = snap;
  }

  /**
   * Apply animations after the DOM has been updated with the new row order.
   *
   * @param rendered - The renderer's live cache of row `nodeId` → panel elements.
   *                   Iterated directly; never queried from the DOM.
   * @param newRows  - Newly rendered rows with updated `top` values.
   * @param viewport - Scroll window used to skip rows whose movement is
   *                   off-screen. Omit to animate every carried-over row.
   */
  animate(
    rendered: ReadonlyMap<string, RowPanelParts>,
    newRows: ReadonlyArray<RowPosition>,
    viewport?: AnimationViewport,
  ): void {
    const snap = this.snapshot;
    this.snapshot = null;
    if (!snap || snap.size === 0) return;

    // Any still-running transition from a previous, rapidly-preceding operation
    // (double-click sort) is finalised now: leaving stale transforms in place
    // would make this run's inverted start positions wrong.
    this.finishAll();

    const duration =
      this.animationType === 'filter' ? FILTER_DURATION_MS :
      this.animationType === 'detail' ? DETAIL_DURATION_MS :
      this.animationType === 'group'  ? GROUP_DURATION_MS :
      SORT_DURATION_MS;

    const newTopMap = new Map<string, number>();
    for (const r of newRows) newTopMap.set(r.nodeId, r.top);

    // Band of content-space Y that is worth animating. Rows whose movement lies
    // entirely outside it are placed silently — see VIEWPORT_SLACK_FACTOR.
    const slack = viewport ? viewport.height * VIEWPORT_SLACK_FACTOR : 0;
    const bandTop = viewport ? viewport.scrollTop - slack : 0;
    const bandBottom = viewport ? viewport.scrollTop + viewport.height + slack : 0;
    const inBand = (y: number): boolean => !viewport || (y >= bandTop && y <= bandBottom);

    const toFlip = this.toFlip;
    const flipDeltas = this.flipDeltas;
    const toFadeIn = this.toFadeIn;
    const toSlideIn = this.toSlideIn;
    toFlip.length = 0;
    flipDeltas.length = 0;
    toFadeIn.length = 0;
    toSlideIn.length = 0;

    // ── Measure phase (READS ONLY — no style writes below this point) ────────
    // Positions come from the layout model rather than getBoundingClientRect:
    // the renderer has just written these exact `top` values into the position
    // stylesheet, so they are authoritative, and reading them costs no layout.
    // This is what keeps the whole pass free of read/write interleaving.
    let carried = 0;
    let total = 0;
    for (const [nodeId] of rendered) {
      if (newTopMap.get(nodeId) === undefined) continue;
      total++;
      if (snap.get(nodeId) !== undefined) carried++;
    }
    if (total === 0) return;

    const localizedToggle = this.animationType === 'group' || this.animationType === 'detail';
    const pageReplaced = !localizedToggle && carried / total < PAGE_REPLACE_SHARE_THRESHOLD;

    for (const [nodeId, parts] of rendered) {
      const newTop = newTopMap.get(nodeId);
      if (newTop === undefined) continue;
      const oldTop = snap.get(nodeId);

      if (pageReplaced) {
        // Page-level swap: every rendered row slides in together with a single
        // transform-only entrance. Opacity is deliberately left untouched —
        // fading a whole page from 0 reads as a flash; a uniform slide keeps
        // the content visible throughout.
        pushParts(toSlideIn, parts);
        continue;
      }

      if (oldTop === undefined) {
        // Not on screen in the previous frame. Its true origin is unknown, so a
        // slide would be fiction — fade it in where it landed, as AG Grid does
        // for rows entering the viewport. Skipped entirely when it landed
        // off-screen: nothing to see, and it avoids a pointless layer.
        if (inBand(newTop)) pushParts(toFadeIn, parts);
        continue;
      }

      const delta = oldTop - newTop;
      // Sub-pixel movement is invisible; animating it only costs a layer.
      if (Math.abs(delta) < 1) continue;
      // Both ends must be near the viewport. A row travelling in from far away
      // would otherwise streak across the whole body — the "flying rows" look.
      if (!inBand(oldTop) || !inBand(newTop)) continue;

      pushPartsWithDelta(toFlip, flipDeltas, parts, delta);
    }

    if (toFlip.length === 0 && toFadeIn.length === 0 && toSlideIn.length === 0) return;

    // ── Invert phase (WRITES ONLY) ───────────────────────────────────────────
    // Push each element back to its visual starting state. `transition: none`
    // guarantees this jump is not itself animated. translate3d promotes the row
    // to its own compositor layer for the duration of the movement.
    for (let i = 0; i < toFlip.length; i++) {
      const el = toFlip[i];
      el.style.transition = 'none';
      el.style.willChange = 'transform';
      el.style.transform = `translate3d(0, ${flipDeltas[i]}px, 0)`;
    }
    for (const el of toFadeIn) {
      el.style.transition = 'none';
      el.style.willChange = 'opacity, transform';
      el.style.opacity = '0';
      el.style.transform = `translate3d(0, ${FILTER_ENTER_OFFSET_PX}px, 0)`;
    }
    for (const el of toSlideIn) {
      el.style.transition = 'none';
      el.style.willChange = 'transform';
      el.style.transform = `translate3d(0, ${PAGE_ENTER_OFFSET_PX}px, 0)`;
    }

    // Exactly one forced style flush for the entire batch, so the browser
    // commits every inverted position above as the animation's start state.
    // Any element works; the first one written is guaranteed to exist here.
    const probe = toFlip[0] ?? toFadeIn[0] ?? toSlideIn[0];
    void probe.offsetHeight;

    // Mark the animation as live from here, not from the play phase below:
    // `active` does not fill until the next frame, and a caller polling
    // `isAnimating()` in between would see an idle animator and restart the
    // whole sequence — the exact stutter the flag exists to prevent.
    this.playPending = true;

    // ── Play phase ───────────────────────────────────────────────────────────
    // Next frame: enable transitions and release every element to its natural
    // resting place. Only `transform`/`opacity` are transitioned — never `top`,
    // which the position stylesheet owns and which would force layout per frame.
    requestAnimationFrame(() => {
      this.playPending = false;
      const moveTransition = `transform ${duration}ms ${EASING}`;
      const fadeTransition = `opacity ${duration}ms ${EASING}, transform ${duration}ms ${EASING}`;

      for (const el of toFlip) {
        el.style.transition = moveTransition;
        el.style.transform = '';
        this.trackUntilDone(el);
      }
      for (const el of toFadeIn) {
        el.style.transition = fadeTransition;
        el.style.opacity = '';
        el.style.transform = '';
        this.trackUntilDone(el);
      }
      for (const el of toSlideIn) {
        el.style.transition = moveTransition;
        el.style.transform = '';
        this.trackUntilDone(el);
      }

      toFlip.length = 0;
      flipDeltas.length = 0;
      toFadeIn.length = 0;
      toSlideIn.length = 0;
    });
  }

  /**
   * Strips animation styling from `el` once its transform transition ends, so
   * later renders and style recalculations are not impeded by a lingering
   * `will-change`. Uses `transitionend` rather than a timer: the element is
   * released the instant the compositor is actually finished, with no guessing
   * and no drift between the CSS duration and a JS timeout.
   */
  private trackUntilDone(el: HTMLElement): void {
    const prev = this.active.get(el);
    if (prev) el.removeEventListener('transitionend', prev);

    const onEnd = (e: TransitionEvent): void => {
      // Ignore bubbling transitions from cells/renderers inside the row, and
      // the opacity half of a fade — transform is always the last to settle.
      if (e.target !== el || e.propertyName !== 'transform') return;
      this.release(el);
    };
    el.addEventListener('transitionend', onEnd);
    this.active.set(el, onEnd);
  }

  /** Removes all animation styling and the end listener from one element. */
  private release(el: HTMLElement): void {
    const handler = this.active.get(el);
    if (handler) el.removeEventListener('transitionend', handler);
    this.active.delete(el);
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.willChange = '';
  }

  /**
   * Finalises every in-flight element immediately. Guarantees no element is
   * left with a stale transform or an orphaned `will-change` when a new
   * animation starts or the grid is torn down — the safety net that lets this
   * class avoid timer-based cleanup entirely.
   */
  private finishAll(): void {
    if (this.active.size === 0) return;
    for (const el of Array.from(this.active.keys())) this.release(el);
  }

  /** Returns `true` when a `capture()` is pending and the next `animate()` will run. */
  hasPending(): boolean {
    return this.snapshot !== null;
  }

  /**
   * Returns `true` while rows are mid-transition.
   *
   * Lets a caller driving repeated re-layouts — a real-time feed reordering a
   * sorted column — skip capturing a new snapshot until the current slide has
   * landed. Without that check, a feed ticking faster than the animation
   * duration restarts the FLIP on every batch, and rows never finish travelling:
   * the effect reads as a permanent smear rather than as motion. Skipping is
   * safe because the rows still move to their correct positions; only the
   * animation for that intermediate step is dropped.
   */
  isAnimating(): boolean {
    return this.playPending || this.active.size > 0;
  }

  destroy(): void {
    this.finishAll();
    this.snapshot = null;
    this.playPending = false;
  }
}

/** Appends every non-null panel part of a row to `out`. */
function pushParts(out: HTMLElement[], parts: RowPanelParts): void {
  if (parts.left) out.push(parts.left);
  if (parts.center) out.push(parts.center);
  if (parts.right) out.push(parts.right);
}

/** Appends every non-null panel part of a row, mirroring `delta` into `deltas`. */
function pushPartsWithDelta(
  out: HTMLElement[],
  deltas: number[],
  parts: RowPanelParts,
  delta: number,
): void {
  if (parts.left) { out.push(parts.left); deltas.push(delta); }
  if (parts.center) { out.push(parts.center); deltas.push(delta); }
  if (parts.right) { out.push(parts.right); deltas.push(delta); }
}
