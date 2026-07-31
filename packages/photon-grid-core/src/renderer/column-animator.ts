/** A column's identity and its horizontal offset within its own panel. */
export interface ColumnPosition {
  colId: string;
  /** Distance (px) from the panel's left content edge to this column's left edge. */
  x: number;
}

/**
 * Which change produced the new column layout, so the animator can pick a
 * duration and decide whether a column that vanished deserves an exit.
 *
 * - `'visibility'` — a column was hidden or shown (header context menu, column
 *   chooser, or dragged out of the grid). Survivors slide; a newly-shown column
 *   fades in where it lands.
 * - `'reorder'` — columns were permuted with the same membership (a programmatic
 *   `moveColumn`, or a drop that committed). Pure slide.
 */
export type ColumnAnimationType = 'visibility' | 'reorder';

// ─── Tuning constants ─────────────────────────────────────────────────────────

/**
 * Column-movement duration, in milliseconds.
 *
 * Matched to the 180 ms live-drag shift in `column-group-header.css.ts` so that
 * hiding a column settles on exactly the same clock as dragging one past its
 * neighbours — the whole point of the feature is that the two read as the same
 * motion.
 */
const DURATION_MS = 180;

/**
 * Same curve the live-drag shift uses. Sharing it is not cosmetic: a different
 * timing function on the same duration is immediately legible as a different
 * animation, which would defeat the "just like dragging" goal.
 */
const EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

/** How far (px) a newly-shown column slides in from during its entrance fade. */
const ENTER_OFFSET_PX = 12;

/**
 * Movement below this is invisible and not worth a compositor layer — the same
 * sub-pixel floor `RowAnimator` applies to vertical deltas.
 */
const MIN_DELTA_PX = 1;

/**
 * Safety margin (ms) added to {@link DURATION_MS} before the animator force-clears
 * its stylesheet.
 *
 * Unlike `RowAnimator`, this class cannot key cleanup off `transitionend`: the
 * animation is driven by a shared stylesheet rather than per-element inline
 * styles, so there is no single element whose end event means "all done", and a
 * cell scrolled out of the virtual window mid-flight would never fire one at all.
 * A timer bounded by the known duration is the honest mechanism here.
 */
const CLEANUP_SLACK_MS = 40;

// ─── ColumnAnimator ──────────────────────────────────────────────────────────

/**
 * FLIP-based column animation engine — the horizontal counterpart to
 * `RowAnimator`.
 *
 * ### Why this exists
 * Hiding a column is a *structural* layout change: the renderer tears the
 * header down and rebuilds every row, so the surviving columns jump to their
 * new offsets in a single frame. Dragging a column, by contrast, has always
 * animated (`.pg-grid--col-dragging` shifts neighbours via `--pg-drag-x` on a
 * 180 ms transition). This class gives the structural path the same motion, so
 * a column disappearing from the context menu reads exactly like one being
 * dragged out of the way.
 *
 * ### Why a stylesheet, not inline styles
 * A column's position is expressed once per `colId` and applies to its header
 * cell, its filter cell, and every rendered body cell in that column — hundreds
 * of elements. `RowAnimator` writes inline styles because a row *is* a single
 * element per panel; here the equivalent would be a write per cell. Instead the
 * animator emits one CSS rule per column into a single `<style>` tag (the same
 * technique `ColumnStyleManager` uses for widths and `HeaderRenderer` uses for
 * live-drag transforms), so the cost is O(visible columns) regardless of how
 * many rows are on screen.
 *
 * ### Ordering
 * ```
 * capture(currentColumns)   // BEFORE the columns store changes
 * …store mutation + full header/body rebuild…
 * animate(newColumns)       // AFTER the renderer has committed the new layout
 * ```
 *
 * ### Virtualization
 * Offsets are computed from the column model and `ColumnStyleManager`'s resolved
 * widths, never from `getBoundingClientRect` — so the pass forces no layout, and
 * a center column outside the current virtual window is simply absent from the
 * DOM and silently skipped by the browser when its rule matches nothing.
 */
export class ColumnAnimator {
  private styleEl: HTMLStyleElement | null = null;

  /** The grid wrapper the `.pg-grid--col-animating*` classes are toggled on. */
  private rootEl: HTMLElement | null = null;

  /** Selector prefix scoping every rule to this grid instance — see `ColumnStyleManager.setScopeId` for why an unscoped `[data-col-id]` is unsafe under Master/Detail. */
  private scopePrefix = '';

  private snapshot: Map<string, number> | null = null;
  private animationType: ColumnAnimationType = 'reorder';

  /** `true` between the invert write and the frame that starts the transitions. */
  private playPending = false;

  private cleanupTimer = 0;
  private playFrame = 0;

  mount(): void {
    if (this.styleEl) return;
    this.styleEl = document.createElement('style');
    this.styleEl.setAttribute('data-pg-col-anim', '');
    document.head.appendChild(this.styleEl);
  }

  /** Scopes every generated rule to `[data-photon-grid-id="id"]`. Call once, right after the wrapper element receives that attribute. */
  setScopeId(id: string): void {
    this.scopePrefix = id ? `[data-photon-grid-id="${id}"] ` : '';
  }

  /** Wires the element that carries the animation classes. Call alongside {@link setScopeId}. */
  setRoot(el: HTMLElement | null): void {
    this.rootEl = el;
  }

  /**
   * Snapshot the on-screen column layout **before** the change that will move
   * it. Discards any snapshot that was never consumed, so a burst of rapid
   * changes always animates from the most recent visual state rather than a
   * stale one.
   *
   * @param columns - Visible columns with their current per-panel offsets.
   * @param type - Controls the entrance style for newly-shown columns.
   */
  capture(columns: readonly ColumnPosition[], type: ColumnAnimationType = 'reorder'): void {
    this.animationType = type;
    const snap = new Map<string, number>();
    for (const col of columns) snap.set(col.colId, col.x);
    this.snapshot = snap;
  }

  /** Whether a `capture()` is waiting to be consumed by the next `animate()`. */
  hasPending(): boolean {
    return this.snapshot !== null;
  }

  /** Drops a pending snapshot without animating — used when the change turns out not to be animatable. */
  cancel(): void {
    this.snapshot = null;
  }

  /**
   * Play the FLIP, after the DOM has been rebuilt with the new column layout.
   *
   * @param columns - Visible columns with their new per-panel offsets.
   */
  animate(columns: readonly ColumnPosition[]): void {
    const snap = this.snapshot;
    this.snapshot = null;
    if (!snap || snap.size === 0 || !this.styleEl || !this.rootEl) return;

    // A still-running animation from a rapidly-preceding change is finalised
    // now: leaving stale transforms in place would make this run's inverted
    // start positions wrong.
    this.finish();

    // ── Invert phase ────────────────────────────────────────────────────────
    // Each surviving column is pushed back to where it visually was. Columns
    // absent from the snapshot are newly shown: they have no previous position,
    // so a slide would be fiction — they fade in from a small offset instead,
    // mirroring how `RowAnimator` treats rows entering the viewport.
    let rules = '';
    let moved = 0;

    for (const col of columns) {
      const oldX = snap.get(col.colId);

      if (oldX === undefined) {
        if (this.animationType !== 'visibility') continue;
        rules += `${this.scopePrefix}[data-col-id="${col.colId}"] { --pg-col-shift-x: ${ENTER_OFFSET_PX}px; --pg-col-shift-opacity: 0; }\n`;
        moved++;
        continue;
      }

      const delta = oldX - col.x;
      if (Math.abs(delta) < MIN_DELTA_PX) continue;
      rules += `${this.scopePrefix}[data-col-id="${col.colId}"] { --pg-col-shift-x: ${delta}px; }\n`;
      moved++;
    }

    if (moved === 0) return;

    // `--pg-col-shift-*` only take effect under this class, and the *-invert
    // variant additionally suppresses the transition — so this first write
    // teleports the columns back to their old positions rather than animating
    // them there.
    this.setClasses(true, true);
    this.styleEl.textContent = rules;

    // One forced style flush commits the inverted positions as the animation's
    // start state. Read from the grid wrapper, not the `<style>` element: a
    // `<style>` is `display: none`, and engines are free to answer
    // `offsetHeight` on a non-rendered element without flushing anything — the
    // FLIP would then invert and play in the same frame and never be seen.
    void this.rootEl.offsetHeight;

    // Live from here, not from the play frame below: a caller polling
    // `isAnimating()` in the gap would otherwise see an idle animator and
    // restart the sequence.
    this.playPending = true;

    // ── Play phase ──────────────────────────────────────────────────────────
    // Next frame: drop the invert class so the transition applies, and clear
    // every offset so the columns travel to their real resting positions.
    this.playFrame = requestAnimationFrame(() => {
      this.playFrame = 0;
      this.playPending = false;
      if (!this.styleEl) return;
      this.setClasses(true, false);
      this.styleEl.textContent = '';
      // Plain `setTimeout`, not `window.setTimeout` — the renderer is also
      // constructed under test in a bare `node` environment, where `window`
      // does not exist.
      this.cleanupTimer = setTimeout(() => this.finish(), DURATION_MS + CLEANUP_SLACK_MS) as unknown as number;
    });
  }

  /** `true` while columns are mid-transition — lets a caller skip capturing a new snapshot mid-flight. */
  isAnimating(): boolean {
    return this.playPending || this.cleanupTimer !== 0;
  }

  destroy(): void {
    this.finish();
    this.snapshot = null;
    this.styleEl?.remove();
    this.styleEl = null;
    this.rootEl = null;
  }

  // ─── Private ────────────────────────────────────────────────────────────

  /**
   * Ends the animation immediately: transitions off, offsets cleared,
   * `will-change` released. Idempotent, and safe to call at any phase.
   */
  private finish(): void {
    if (this.playFrame !== 0) {
      cancelAnimationFrame(this.playFrame);
      this.playFrame = 0;
    }
    if (this.cleanupTimer !== 0) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = 0;
    }
    this.playPending = false;
    if (this.styleEl) this.styleEl.textContent = '';
    this.setClasses(false, false);
  }

  private setClasses(animating: boolean, inverting: boolean): void {
    const root = this.rootEl;
    if (!root) return;
    if (animating) root.classList.add('pg-grid--col-animating');
    else root.classList.remove('pg-grid--col-animating');
    if (inverting) root.classList.add('pg-grid--col-animating-invert');
    else root.classList.remove('pg-grid--col-animating-invert');
  }
}

/**
 * Builds per-panel column offsets for {@link ColumnAnimator.capture} /
 * {@link ColumnAnimator.animate}.
 *
 * Offsets are cumulative widths within each panel, taken from the resolved
 * width map rather than the DOM — no layout is forced, and columns currently
 * outside the center panel's virtual window are still positioned correctly
 * (their rules simply match no elements until they scroll in).
 *
 * @param panels - Visible column ids per panel, in display order.
 * @param widthOf - Resolved width for a column id, e.g. `ColumnStyleManager.getWidth`.
 */
export function computeColumnPositions(
  panels: { left: readonly string[]; center: readonly string[]; right: readonly string[] },
  widthOf: (colId: string) => number,
): ColumnPosition[] {
  const out: ColumnPosition[] = [];
  for (const ids of [panels.left, panels.center, panels.right]) {
    let x = 0;
    for (const colId of ids) {
      out.push({ colId, x });
      x += widthOf(colId);
    }
  }
  return out;
}
