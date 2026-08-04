import {
  isTouchPointer,
  DRAG_THRESHOLD_TOUCH,
  MOMENTUM_DECAY,
  MOMENTUM_MIN_VELOCITY,
  PAN_EXCLUDE_SELECTOR,
} from '../core/pointer-utils';
import { contentToTrack, trackHeightFor, trackToContent } from './scroll-track';

export type ScrollYCallback = (scrollTop: number) => void;

export class ScrollController {
  private scrollTop = 0;
  private scrollLeft = 0;
  private totalHeight = 0;
  private totalCenterWidth = 0;
  private viewportHeight = 0;
  private centerViewportWidth = 0;
  /** Height actually given to the vertical scrollbar spacer — see `scroll-track.ts`. */
  private trackHeight = 0;
  /**
   * Track offset this controller last wrote to the native scrollbar. The write
   * echoes back as a `scroll` event; the browser may have rounded it to a
   * device pixel, which — once scaled back into content space — is no longer
   * the value we asked for and would fight the gesture that caused it. Cleared
   * as soon as one event is matched against it, so a genuine user scroll is
   * never swallowed twice.
   */
  private pendingTrackWrite: number | null = null;
  /**
   * Pixel offset that rendered rows are positioned relative to. Written by
   * `GridRenderer` alongside the row position stylesheet; see
   * {@link setRowOrigin}.
   */
  private rowOriginY = 0;

  private gridEl: HTMLElement | null = null;
  private sbVNativeEl: HTMLElement | null = null;
  private sbVSpacerEl: HTMLElement | null = null;
  private sbHNativeEl: HTMLElement | null = null;
  private sbHSpacerEl: HTMLElement | null = null;
  private sbHRowEl: HTMLElement | null = null;

  // ── Touch-pan state ───────────────────────────────────────────────────────
  // Touch has no `wheel` event, so finger-drag panning is synthesized here:
  // pointer deltas drive `scrollToX/Y`, and residual velocity feeds a momentum
  // (kinetic) glide after release. Mouse/trackpad keep using `onWheel` — this
  // path only engages for `pointerType === 'touch'`.
  private panPointerId: number | null = null;
  private panStartX = 0;
  private panStartY = 0;
  private panLastX = 0;
  private panLastY = 0;
  private panLastT = 0;
  private panScrollStartLeft = 0;
  private panScrollStartTop = 0;
  private panMoved = false;
  /** The body/header element the active pan pointer was captured to (for release). */
  private panCaptureEl: HTMLElement | null = null;
  /** Residual finger velocity in scroll-space px/ms, sampled from the last move. */
  private velX = 0;
  private velY = 0;
  private momentumRAF: number | null = null;
  /**
   * Returns `true` while another interaction (column reorder/resize) owns the
   * pointer, so touch-panning yields to it. Wired by `GridRenderer` to the
   * HeaderRenderer's busy state; unset means "never busy".
   */
  private gestureGuard: (() => boolean) | null = null;


  private abortCtrl: AbortController | null = null;
  private resizeObs: ResizeObserver | null = null;
  private scrollYCbs: ScrollYCallback[] = [];
  private scrollXCbs: Array<() => void> = [];
  /**
   * When `true`, the vertical scrollbar column is never collapsed to 0 width
   * — it stays reserved (a "stable gutter") even while `totalHeight <=
   * viewportHeight`. Set for Master/Detail grids: expanding/collapsing a
   * detail row changes total content height, which can tip whether a
   * scrollbar is needed at all — if the column collapsed and reappeared with
   * it, every flex column would jump to fill/re-cede that space on every
   * toggle. Reserving it unconditionally makes that a non-event.
   */
  private reserveVerticalGutter = false;

  /**
   * Subscribes to vertical scroll. **Multicast** — every registered callback
   * runs on each change, in registration order.
   *
   * Was a single-slot setter through v2.0.10, where a second call silently
   * *replaced* the first. That made it a trap for anything outside the renderer:
   * `GridRenderer` claims a slot for its own `scheduleRender()`, so a plugin
   * subscribing would have disabled the grid's re-render with no error. The only
   * signature change is the return value, so existing call sites that discard it
   * are unaffected.
   *
   * @returns Unsubscribe. Callbacks fire **synchronously during the scroll**,
   *   ahead of the animation frame `scheduleRender` books — so do cheap work
   *   here and structural DOM work in the render callback.
   */
  onScrollY(cb: ScrollYCallback): () => void {
    this.scrollYCbs.push(cb);
    return () => {
      const i = this.scrollYCbs.indexOf(cb);
      if (i !== -1) this.scrollYCbs.splice(i, 1);
    };
  }

  /** Subscribes to horizontal scroll. Multicast; see {@link onScrollY}. */
  onScrollX(cb: () => void): () => void {
    this.scrollXCbs.push(cb);
    return () => {
      const i = this.scrollXCbs.indexOf(cb);
      if (i !== -1) this.scrollXCbs.splice(i, 1);
    };
  }

  /**
   * Notifies vertical-scroll subscribers.
   *
   * Iterates a snapshot so a callback that unsubscribes (itself or a sibling)
   * cannot corrupt the walk, and isolates failures per listener — one bad
   * subscriber must not stop the grid from re-rendering.
   */
  private fireScrollY(scrollTop: number): void {
    for (const cb of [...this.scrollYCbs]) {
      try {
        cb(scrollTop);
      } catch (err) {
        console.error('[PhotonGrid] scroll listener failed:', err);
      }
    }
  }

  /** Notifies horizontal-scroll subscribers. See {@link fireScrollY}. */
  private fireScrollX(): void {
    for (const cb of [...this.scrollXCbs]) {
      try {
        cb();
      } catch (err) {
        console.error('[PhotonGrid] scroll listener failed:', err);
      }
    }
  }

  setReserveVerticalGutter(reserve: boolean): void {
    this.reserveVerticalGutter = reserve;
  }

  /**
   * Registers a predicate that, while it returns `true`, suspends touch-panning
   * so a concurrent column reorder or resize owns the pointer instead. See
   * {@link gestureGuard}.
   */
  setGestureGuard(fn: () => boolean): void {
    this.gestureGuard = fn;
  }

  mount(
    gridEl: HTMLElement,
    bodyEl: HTMLElement,
    centerBodyEl: HTMLElement,
    sbVNativeEl: HTMLElement,
    sbVSpacerEl: HTMLElement,
    sbHNativeEl: HTMLElement,
    sbHSpacerEl: HTMLElement,
    sbHRowEl?: HTMLElement,
  ): void {
    this.gridEl = gridEl;
    this.sbVNativeEl = sbVNativeEl;
    this.sbVSpacerEl = sbVSpacerEl;
    this.sbHNativeEl = sbHNativeEl;
    this.sbHSpacerEl = sbHSpacerEl;
    this.sbHRowEl = sbHRowEl ?? sbHNativeEl;

    const ac = new AbortController();
    this.abortCtrl = ac;
    const sig = ac.signal;

    bodyEl.addEventListener('wheel', this.onWheel as EventListener, { passive: false, signal: sig });
    const headerEl = gridEl.querySelector<HTMLElement>('.pg-grid__header');
    headerEl?.addEventListener('wheel', this.onWheel as EventListener, { passive: false, signal: sig });

    // Touch-drag panning (finger scroll). Bound to both the body and the header
    // so a quick horizontal swipe over either scrolls the grid sideways. A
    // stationary press on the header instead arms the long-press column-reorder
    // gesture (HeaderRenderer); the `gestureGuard` below lets the pan bail out
    // the moment that — or a column resize — takes ownership of the pointer.
    for (const el of [bodyEl, headerEl]) {
      if (!el) continue;
      el.addEventListener('pointerdown', this.onPanPointerDown, { signal: sig });
      el.addEventListener('pointermove', this.onPanPointerMove, { passive: false, signal: sig });
      el.addEventListener('pointerup', this.onPanPointerUp, { signal: sig });
      el.addEventListener('pointercancel', this.onPanPointerUp, { signal: sig });
    }

    sbVNativeEl.addEventListener('scroll', this.onVNativeScroll, { signal: sig });
    sbHNativeEl.addEventListener('scroll', this.onHNativeScroll, { signal: sig });

    this.resizeObs = new ResizeObserver(() => {
      this.viewportHeight = bodyEl.clientHeight;
      this.centerViewportWidth = centerBodyEl.clientWidth;
      this.clampScroll();
      this.syncCSSVars();
      this.syncScrollbars();
      // Viewport height is part of both scroll ranges, so a resize changes the
      // content⇄track ratio; restate the thumb against the new one.
      this.writeTrackY();
      this.fireScrollX();
    });
    this.resizeObs.observe(bodyEl);
    this.resizeObs.observe(centerBodyEl);

    this.viewportHeight = bodyEl.clientHeight;
    this.centerViewportWidth = centerBodyEl.clientWidth;
  }

  updateSizes(totalHeight: number, totalCenterWidth: number): void {
    this.totalHeight = totalHeight;
    this.totalCenterWidth = totalCenterWidth;
    this.trackHeight = trackHeightFor(totalHeight);
    if (this.sbVSpacerEl) this.sbVSpacerEl.style.height = `${this.trackHeight}px`;
    if (this.sbHSpacerEl) this.sbHSpacerEl.style.width  = `${totalCenterWidth}px`;
    this.clampScroll();
    this.syncCSSVars();
    this.syncScrollbars();
    // The track just changed length, so the thumb's position no longer
    // corresponds to `scrollTop` — restate it in the new track's terms.
    this.writeTrackY();
  }

  /**
   * Sets the pixel offset that rendered rows are positioned relative to.
   *
   * `GridRenderer` writes each rendered row's `top` into the position
   * stylesheet as `row.top - origin` and calls this with the same origin in the
   * same synchronous block. The panel transform published here adds it back
   * (`origin - scrollTop`), so on-screen position is unchanged while every
   * painted coordinate stays within a viewport's worth of zero — which is what
   * keeps 1px row borders from rounding away at large scroll depths. See the
   * note above `.pg-panel__content` in `panels.css.ts`.
   *
   * Because the sheet and the origin are always written together, a scroll that
   * lands between two renders is still correct: only `scrollTop` moves, and the
   * offset tracks it.
   */
  setRowOrigin(originY: number): void {
    if (originY === this.rowOriginY) return;
    this.rowOriginY = originY;
    this.syncCSSVars();
  }

  getScrollTop(): number { return this.scrollTop; }
  getScrollLeft(): number { return this.scrollLeft; }
  /**
   * Pixel offset rendered rows are positioned relative to, as of the last
   * {@link setRowOrigin}.
   *
   * Anything positioning content against rows must subtract this: row `top`
   * values are in absolute content space, but the position stylesheet writes
   * `top - rowOriginY` and the panels apply `translateY(--pg-row-offset-y)`.
   * Note it is **not** `scrollTop` — the two differ by up to a render window.
   */
  getRowOriginY(): number { return this.rowOriginY; }
  /** Returns the current visible height of the body viewport in pixels. */
  getViewportHeight(): number { return this.viewportHeight; }
  /** Returns the current visible width of the center body viewport in pixels. */
  getCenterViewportWidth(): number { return this.centerViewportWidth; }
  canScrollLeft(): boolean { return this.scrollLeft > 0; }
  canScrollRight(): boolean { return this.scrollLeft < Math.max(0, this.totalCenterWidth - this.centerViewportWidth); }
  canScrollUp(): boolean { return this.scrollTop > 0; }
  canScrollDown(): boolean { return this.scrollTop < Math.max(0, this.totalHeight - this.viewportHeight); }

  scrollToY(y: number): void {
    const max = Math.max(0, this.totalHeight - this.viewportHeight);
    const next = Math.max(0, Math.min(y, max));
    if (next === this.scrollTop) return;
    this.scrollTop = next;
    this.syncCSSVars();
    this.syncScrollbars();
    this.writeTrackY();
    this.fireScrollY(this.scrollTop);
  }

  scrollToX(x: number): void {
    const max = Math.max(0, this.totalCenterWidth - this.centerViewportWidth);
    const next = Math.max(0, Math.min(x, max));
    if (next === this.scrollLeft) return;
    this.scrollLeft = next;
    this.syncCSSVars();
    this.syncScrollbars();
    if (this.sbHNativeEl) this.sbHNativeEl.scrollLeft = next;
    this.fireScrollX();
  }

  scrollToRow(rowIndex: number, rows: ReadonlyArray<{ top: number }>): void {
    if (rowIndex >= 0 && rowIndex < rows.length) this.scrollToY(rows[rowIndex].top);
  }

  scrollToTop(): void { this.scrollToY(0); }

  destroy(): void {
    this.stopMomentum();
    this.abortCtrl?.abort();
    this.abortCtrl = null;
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    // Subscribers hold references back into the renderer (and into plugins),
    // so dropping them here is what lets a destroyed grid be collected.
    this.scrollYCbs.length = 0;
    this.scrollXCbs.length = 0;
    this.gestureGuard = null;
  }

  private clampScroll(): void {
    this.scrollTop  = Math.max(0, Math.min(this.scrollTop,  Math.max(0, this.totalHeight      - this.viewportHeight)));
    this.scrollLeft = Math.max(0, Math.min(this.scrollLeft, Math.max(0, this.totalCenterWidth - this.centerViewportWidth)));
  }

  private syncCSSVars(): void {
    if (!this.gridEl) return;
    // ── Device-pixel snapping ────────────────────────────────────────────────
    // Scroll offsets are fractional in normal use: precision-touchpad wheel
    // deltas arrive with decimals, the momentum integrator produces them, and
    // `fromTrackY` returns them whenever a dataset tall enough to need a scaled
    // track is in play. Published raw, they translate the panels onto a
    // fractional offset, and the compositor then resamples everything inside —
    // text is re-rasterised against a half-pixel grid and 1px borders straddle
    // two device pixels. That is the "everything goes slightly blurry while
    // scrolling" artefact, and it lands on exactly the elements a grid is made
    // of.
    //
    // Snapping to the *device* grid rather than the CSS grid is what makes this
    // work at fractional zoom: at 125% (the Windows default) a whole CSS pixel
    // is 1.25 device pixels, so rounding to integers still leaves text on a
    // quarter-pixel. Rounding to `1 / dpr` puts every published offset on a real
    // device pixel at any zoom level.
    //
    // Only the *paint* is snapped. `scrollTop`/`scrollLeft` keep their exact
    // values, so fractional deltas still accumulate normally and no scroll
    // motion is lost — the view simply lands on a whole device pixel, which is
    // what native scrolling does too.
    const dpr = window.devicePixelRatio || 1;
    const snap = (v: number): number => Math.round(v * dpr) / dpr;

    const scrollX = snap(this.scrollLeft);
    const scrollY = snap(this.scrollTop);

    this.gridEl.style.setProperty('--pg-scroll-x', `-${scrollX}px`);
    this.gridEl.style.setProperty('--pg-scroll-y', `-${scrollY}px`);
    // Published for JS that positions rows in the same rebased space (see
    // RowDragRenderer.updateRowTops). Not snapped: it is a row coordinate, not
    // a paint offset, and it is already integral.
    this.gridEl.style.setProperty('--pg-row-origin-y', `${this.rowOriginY}px`);
    // The panels' vertical translate. Subtracted here, in doubles, rather than
    // left to a CSS calc() of the two full-magnitude terms — see setRowOrigin.
    // Derived from the same snapped `scrollY` as `--pg-scroll-y` so the two can
    // never disagree by a fraction and shear the panels against each other.
    this.gridEl.style.setProperty('--pg-row-offset-y', `${this.rowOriginY - scrollY}px`);
  }

  // ── Content ⇄ track mapping ────────────────────────────────────────────────
  //
  // Identity whenever the content fits inside the browser's element-height cap,
  // which is the overwhelmingly common case; only a dataset tall enough to
  // exceed it is scaled through a shortened track. See `scroll-track.ts`.

  /** Furthest the content can scroll, in content pixels. */
  private get maxScrollY(): number { return Math.max(0, this.totalHeight - this.viewportHeight); }

  /** Furthest the native scrollbar can scroll, in track pixels. */
  private get maxTrackY(): number { return Math.max(0, this.trackHeight - this.viewportHeight); }

  private toTrackY(scrollTop: number): number {
    return contentToTrack(scrollTop, this.maxScrollY, this.maxTrackY);
  }

  private fromTrackY(track: number): number {
    return trackToContent(track, this.maxScrollY, this.maxTrackY);
  }

  /** Restates the current scroll position on the native scrollbar. */
  private writeTrackY(): void {
    if (!this.sbVNativeEl) return;
    const track = this.toTrackY(this.scrollTop);
    this.pendingTrackWrite = track;
    this.sbVNativeEl.scrollTop = track;
  }

  private syncScrollbars(): void {
    if (this.sbVNativeEl) {
      const vHidden = !this.reserveVerticalGutter && this.totalHeight <= this.viewportHeight;
      this.sbVNativeEl.classList.toggle('pg-scrollbar--hidden', vHidden);
      // Master/Detail's full-width overlay layer spans the entire body
      // (including the vertical scrollbar's flex-allocated column) so its
      // rows can be positioned with simple `top` offsets. This live var lets
      // it carve out exactly the scrollbar's *current* width — 0 when hidden,
      // matching the real column layout — so it never visually paints over
      // the native scrollbar when one is showing.
      this.gridEl?.style.setProperty(
        '--pg-scrollbar-v-live-width',
        vHidden ? '0px' : 'var(--pg-scrollbar-v-width, 17px)',
      );
    }
    if (this.sbHRowEl) {
      this.sbHRowEl.classList.toggle('pg-scrollbar--hidden', this.totalCenterWidth <= this.centerViewportWidth);
    }
  }

  private readonly onVNativeScroll = (): void => {
    const track = this.sbVNativeEl!.scrollTop;

    // Swallow the echo of our own write exactly once. Unscaled the `< 0.5`
    // check below already absorbed it; once the track is scaled, the browser's
    // sub-pixel rounding of that write maps back to a content offset several
    // pixels off, which would yank the view away from the gesture that set it.
    const expected = this.pendingTrackWrite;
    this.pendingTrackWrite = null;
    if (expected !== null && Math.abs(track - expected) < 1) return;

    const st = this.fromTrackY(track);
    if (Math.abs(st - this.scrollTop) < 0.5) return;
    this.scrollTop = st;
    this.syncCSSVars();
    this.fireScrollY(st);
  };

  private readonly onHNativeScroll = (): void => {
    const sl = this.sbHNativeEl!.scrollLeft;
    if (Math.abs(sl - this.scrollLeft) < 0.5) return;
    this.scrollLeft = sl;
    this.syncCSSVars();
    this.fireScrollX();
  };

  private readonly onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey) return;
    // The Photon AI panel floats as a sibling overlay inside this same
    // `.pg-grid__body` (see `GridRenderer.buildLayout`/`PhotonAIPanel.mount`),
    // so a wheel event over its own scrollable chat log still bubbles up to
    // this listener. Left unchecked, `preventDefault` below blocks the
    // panel's native scroll entirely and redirects the gesture into scrolling
    // the grid underneath it instead — bail out here so the panel scrolls itself.
    if ((e.target as HTMLElement | null)?.closest('.pg-ai-panel')) return;

    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.deltaMode === 1 /* DOM_DELTA_LINE */) { dx *= 32; dy *= 32; }
    else if (e.deltaMode === 2 /* DOM_DELTA_PAGE */) { dx *= this.centerViewportWidth; dy *= this.viewportHeight; }

    // Which axis this gesture drives, and the signed delta applied to it. A
    // shift-wheel or horizontal-dominant gesture maps onto X; a plain wheel
    // with no deltaX still drives X off deltaY (mirrors the scroll calls below).
    const horizontal = e.shiftKey || Math.abs(dx) > Math.abs(dy);
    const delta = horizontal ? (e.deltaX !== 0 ? dx : dy) : dy;

    // Only consume the gesture when this grid can still scroll in that
    // direction. Once pinned at the relevant edge we leave the event neither
    // prevented nor stopped, so it bubbles: a parent Master/Detail grid — or
    // the browser's native scroll on any outer container — picks it up instead
    // of the gesture dead-ending here. This is what lets an at-boundary scroll
    // hand off to the surrounding page.
    const canConsume = horizontal
      ? (delta > 0 ? this.canScrollRight() : delta < 0 ? this.canScrollLeft() : false)
      : (delta > 0 ? this.canScrollDown()  : delta < 0 ? this.canScrollUp()   : false);
    if (!canConsume) return;

    e.preventDefault();
    // A nested Master/Detail grid's body sits inside the parent grid's own
    // `.pg-grid__body` (a sibling of the pinned panels, not a descendant of
    // them — see DetailRowRenderer). Without stopping propagation here, a
    // wheel event this grid already handled keeps bubbling and also reaches
    // the parent grid's own wheel listener on that shared ancestor, scrolling
    // both grids from a single gesture (most visible on horizontal-dominant
    // scrolls, and intermittently on trackpads whose "vertical" gestures emit
    // a small stray deltaX). We only reach here when this grid is actually
    // consuming the gesture, so stopping propagation is safe — an at-boundary
    // gesture bailed out above and is intentionally left to bubble.
    e.stopPropagation();
    if (horizontal) {
      this.scrollToX(this.scrollLeft + delta);
    } else {
      this.scrollToY(this.scrollTop + delta);
    }
  };

  // ── Touch panning ───────────────────────────────────────────────────────────

  private readonly onPanPointerDown = (e: PointerEvent): void => {
    // Mouse/trackpad scroll through `onWheel`; only touch needs synthesized pan.
    if (!isTouchPointer(e)) return;
    if (this.panPointerId !== null) return; // already tracking a contact
    // Another interaction (column reorder/resize) already owns the pointer.
    if (this.gestureGuard?.()) return;
    // A press on an element that owns its own gesture (resize/drag/fill handle,
    // editor, AI panel) must start that interaction, not scroll the grid.
    if ((e.target as HTMLElement | null)?.closest(PAN_EXCLUDE_SELECTOR)) return;

    this.stopMomentum();
    // A nested Master/Detail grid's body sits inside the parent grid's own body,
    // so this pointerdown also bubbles to the parent's pan listener. Claim the
    // gesture here so only the innermost grid pans (mirrors `onWheel`).
    e.stopPropagation();
    this.panPointerId = e.pointerId;
    this.panStartX = this.panLastX = e.clientX;
    this.panStartY = this.panLastY = e.clientY;
    this.panLastT = e.timeStamp;
    this.panScrollStartLeft = this.scrollLeft;
    this.panScrollStartTop = this.scrollTop;
    this.panMoved = false;
    this.velX = 0;
    this.velY = 0;
    // Capture to the element the press landed on (body or header) so its own
    // move/up listeners keep firing even if the finger slides off it.
    this.panCaptureEl = e.currentTarget as HTMLElement;
    try { this.panCaptureEl.setPointerCapture(e.pointerId); } catch { /* capture unsupported */ }
  };

  private readonly onPanPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.panPointerId) return;

    // A column reorder/resize started mid-gesture (e.g. after a long-press) —
    // hand the pointer over: abandon the pan without scrolling.
    if (this.gestureGuard?.()) { this.releasePan(e.pointerId); return; }

    const dx = e.clientX - this.panStartX;
    const dy = e.clientY - this.panStartY;

    if (!this.panMoved) {
      if (Math.abs(dx) < DRAG_THRESHOLD_TOUCH && Math.abs(dy) < DRAG_THRESHOLD_TOUCH) return;
      this.panMoved = true;
    }

    // Content follows the finger: dragging down reveals content above, so the
    // scroll offset moves opposite to the finger delta.
    this.scrollToX(this.panScrollStartLeft - dx);
    this.scrollToY(this.panScrollStartTop - dy);

    // Sample instantaneous velocity in scroll-space (px/ms) for the post-release
    // momentum glide. Scroll offset moves opposite the finger, hence last-minus-current.
    const dt = e.timeStamp - this.panLastT;
    if (dt > 0) {
      this.velX = (this.panLastX - e.clientX) / dt;
      this.velY = (this.panLastY - e.clientY) / dt;
    }
    this.panLastX = e.clientX;
    this.panLastY = e.clientY;
    this.panLastT = e.timeStamp;

    e.preventDefault();
  };

  private readonly onPanPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.panPointerId) return;
    const moved = this.panMoved;
    this.releasePan(e.pointerId);
    if (moved) {
      // Swallow the synthetic click a touch-drag would otherwise fire, so a
      // flick to scroll never also selects a cell or triggers a header sort.
      this.suppressNextClick();
      this.startMomentum();
    }
  };

  /** Ends the active pan contact and releases its pointer capture. */
  private releasePan(pointerId: number): void {
    this.panPointerId = null;
    try { this.panCaptureEl?.releasePointerCapture(pointerId); } catch { /* already released */ }
    this.panCaptureEl = null;
  }

  private startMomentum(): void {
    let vx = this.velX;
    let vy = this.velY;
    if (Math.abs(vx) < MOMENTUM_MIN_VELOCITY && Math.abs(vy) < MOMENTUM_MIN_VELOCITY) return;
    const FRAME_MS = 16;
    const step = (): void => {
      this.momentumRAF = null;
      vx *= MOMENTUM_DECAY;
      vy *= MOMENTUM_DECAY;
      if (Math.abs(vx) < MOMENTUM_MIN_VELOCITY && Math.abs(vy) < MOMENTUM_MIN_VELOCITY) return;
      const beforeL = this.scrollLeft;
      const beforeT = this.scrollTop;
      this.scrollToX(this.scrollLeft + vx * FRAME_MS);
      this.scrollToY(this.scrollTop + vy * FRAME_MS);
      // Both axes clamped at their edge → nothing left to glide into.
      if (this.scrollLeft === beforeL && this.scrollTop === beforeT) return;
      this.momentumRAF = requestAnimationFrame(step);
    };
    this.momentumRAF = requestAnimationFrame(step);
  }

  private stopMomentum(): void {
    if (this.momentumRAF !== null) {
      cancelAnimationFrame(this.momentumRAF);
      this.momentumRAF = null;
    }
  }

  /**
   * Installs a one-shot capture-phase click swallower on the grid so the ghost
   * click synthesized at the end of a touch-pan gesture never reaches cells or
   * headers. Self-removing, with a timeout fallback in case no click arrives.
   */
  private suppressNextClick(): void {
    const grid = this.gridEl;
    if (!grid) return;
    const swallow = (ev: Event): void => {
      ev.stopPropagation();
      ev.preventDefault();
      grid.removeEventListener('click', swallow, true);
    };
    grid.addEventListener('click', swallow, true);
    setTimeout(() => grid.removeEventListener('click', swallow, true), 400);
  }
}
