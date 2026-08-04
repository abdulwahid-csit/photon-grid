import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
import type { RowNode } from '../types/row.types';
import { GridEventType } from '../types/event.types';
import { createDiv } from './dom-utils';
import { adoptGridTheme } from './overlay-theme';
import { computeRowDragPreview, previewTopFor } from './row-drag-preview';
import { DragFrameScheduler } from '../drag-drop/drag-frame-scheduler';
import { DragGhost } from '../drag-drop/drag-ghost';
import { DragStyleWriter } from '../drag-drop/drag-style-writer';

const SCROLL_ZONE = 64;      // px from body edge to engage auto-scroll
const MAX_SCROLL_SPD = 1440; // px/**second** at the extreme edge
/** Upper bound on one frame's delta time (s), so a backgrounded tab does not lurch. */
const MAX_FRAME_DELTA = 0.1;

/**
 * A slot in the published row array. A demand-loading row model publishes a
 * sparse array — only fetched pages are materialised — so every read has to
 * tolerate a hole.
 */
type RowSlot = RowNode | undefined;

/** The rendered row range, as `[start, end)` half-open indices. */
interface RenderWindow {
  readonly rows: ReadonlyArray<RowSlot>;
  readonly start: number;
  readonly end: number;
}

export class RowDragRenderer {
  /** Positions the drag chip with a compositor-only transform. */
  private readonly ghost = new DragGhost();
  /**
   * Owns the stylesheet carrying the previewed row `top` overrides and skips the
   * assignment when the generated CSS is unchanged.
   *
   * The previous implementation looked the element up with a document-wide
   * `document.querySelector` on every read *and* every clear, then rewrote it
   * unconditionally.
   */
  private readonly topStyles = new DragStyleWriter('data-pg-row-drag-tops');
  private draggingNodeId: string | null = null;
  private dragLabel = '';
  private isDragging = false;
  private gridEl: HTMLElement | null = null;
  private bodyWrapEl: HTMLElement | null = null;
  private targetNodeId: string | null = null;
  private targetPosition: 'before' | 'after' | 'inside' = 'before';

  /** `true` when Tree Data is active — switches drop-zone classification from a 2-way (before/after) to a 3-way (before/inside/after) split, and routes the commit through `treeReparentHandler` instead of the flat splice. Set via `setTreeMode`, called from `GridCore` only when a mutable hierarchy source (`parentId`/`childrenField`) is configured. */
  private treeModeActive = false;
  private treeReparentHandler: ((draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean) | null = null;
  private scrollFn: ((dy: number) => void) | null = null;
  private autoScrollRAF: number | null = null;
  private autoScrollLastTs = 0;
  private cursorX = 0;
  private cursorY = 0;

  /**
   * Body-viewport bounds, captured at drag start and refreshed only when the
   * layout can have moved (a re-render, an auto-scroll step).
   *
   * Both the drop-target hit test and the auto-scroll tick used to call
   * `getBoundingClientRect()` — the hit test on every pointer event, immediately
   * after the chip's position had been written, which forces a synchronous
   * layout flush each time.
   */
  private bodyRect: DOMRect | null = null;

  /**
   * Coalesces `pointermove` into one frame of work.
   *
   * Hit-testing the render window, regenerating the row-`top` sheet, and
   * renumbering the serial column now happen once per painted frame against the
   * newest sample instead of once per pointer event.
   */
  private readonly frames: DragFrameScheduler;

  /**
   * Serial-number `<span>`s by node id, plus the pool of values to redistribute.
   *
   * Built once at drag start and after each `ROWS_RENDERED`, rather than
   * re-queried, re-parsed, and re-sorted on every drop-target change.
   */
  private serialSpans = new Map<string, HTMLElement>();
  private serialValues: number[] = [];
  /** `false` when {@link serialSpans} must be rebuilt before the next renumber. */
  private serialCacheValid = false;

  /**
   * `false` when the grid must not rewrite row order itself — the application
   * commits the move instead. See {@link setManagedReorder}.
   */
  private managedReorder = true;

  /** The dragged row node, captured at drag start so its index can be resolved in O(1). */
  private draggedRow: RowNode | null = null;
  /** The row the pointer is currently over, kept alongside {@link targetNodeId}. */
  private targetRow: RowNode | null = null;

  /** Tears down the `ROWS_RENDERED` subscription that re-applies drag visuals after virtualization re-renders. `null` until `mount`. */
  private unsubscribeRowsRendered: (() => void) | null = null;

  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
    private iconRenderer: IconRenderer,
  ) {
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.frames = new DragFrameScheduler((x, y) => this.applyDragFrame(x, y));
  }

  mount(gridEl: HTMLElement, bodyWrapEl: HTMLElement, scrollFn: (dy: number) => void): void {
    this.gridEl = gridEl;
    this.bodyWrapEl = bodyWrapEl;
    this.scrollFn = scrollFn;
    bodyWrapEl.addEventListener('pointerdown', this.boundMouseDown, true);

    // Viewport virtualization rebuilds/recycles row DOM on scroll, and
    // `BodyRenderer.updatePanelRow` resets each reused row's `className` and
    // serial cell. That silently wipes the drag's element-level markers — the
    // `pg-row--row-dragging` opacity placeholder, the tree-mode drop-target
    // highlight, and the previewed serial order — as soon as auto-scroll (or a
    // wheel) advances the window mid-drag. Re-stamp them after every render.
    this.unsubscribeRowsRendered = this.eventBus.on(GridEventType.ROWS_RENDERED, () => {
      // The re-render replaces the serial cells this drag caches and can move
      // the body viewport, so both caches are dropped before the re-stamp.
      this.serialCacheValid = false;
      this.bodyRect = null;
      this.reapplyDragVisuals();
    });
  }

  /**
   * Enables Tree Data drag-to-reparent. `reparentHandler` is called on drop
   * with the resolved `'before'|'after'|'inside'` position and should mutate
   * the raw hierarchy + trigger a pipeline refresh (see
   * `TreeDataService.moveNode`) — this renderer never touches tree structure
   * itself, only mouse tracking and drop-zone classification.
   */
  setTreeMode(active: boolean, reparentHandler: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean): void {
    this.treeModeActive = active;
    this.treeReparentHandler = reparentHandler;
  }

  /**
   * Declares whether the grid applies the reorder itself on drop.
   *
   * When `false` the drag and its live preview run exactly as normal, but the
   * row array is never touched and `ROW_DROP` is emitted with `managed: false`
   * — a request for the application to persist the move and refresh. That is the
   * only coherent mode under a server-backed row model, where the datasource
   * owns row order. See `RowDragOptions`.
   */
  setManagedReorder(managed: boolean): void {
    this.managedReorder = managed;
  }

  destroy(): void {
    this.bodyWrapEl?.removeEventListener('pointerdown', this.boundMouseDown, true);
    this.unsubscribeRowsRendered?.();
    this.unsubscribeRowsRendered = null;
    this.cleanup();
    this.gridEl = null;
    this.bodyWrapEl = null;
    this.scrollFn = null;
  }

  /**
   * The `nodeId` of the row currently being dragged, or `null` when no drag is
   * in progress.
   *
   * `GridRenderer` reads this each render to pin the dragged row inside the
   * virtual render window: the drag preview repositions it via a `top` override
   * near the drop target, but vertical virtualization slices on each row's
   * *real* `top`, so once auto-scroll moves that real position off-screen the
   * row would otherwise be evicted — leaving the placeholder gap blank.
   */
  getDraggingNodeId(): string | null {
    return this.draggingNodeId;
  }

  // ─── Drag start ───────────────────────────────────────────────────────────

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-row-drag]');
    if (!handle) return;

    e.preventDefault();
    e.stopPropagation();

    const rowEl = handle.closest<HTMLElement>('[data-node-id]');
    const nodeId = rowEl?.getAttribute('data-node-id');
    if (!nodeId) return;

    // Scoped to the rendered window: the row under the pointer is on screen by
    // definition, so there is no reason to scan a dataset that may hold
    // millions of entries.
    const w = this.renderWindow();
    const row = this.findInWindow(w, nodeId);
    if (!row || row.type === 'group' || row.type === 'summary') return;

    this.draggedRow = row;
    this.dragLabel = handle.getAttribute('data-drag-label') ?? '';
    this.startDrag(nodeId, e);
  }

  private startDrag(nodeId: string, e: MouseEvent): void {
    this.draggingNodeId = nodeId;
    this.isDragging = true;
    this.cursorX = e.clientX;
    this.cursorY = e.clientY;

    // Clear any hover states that would otherwise be stuck (pointer-events: none prevents mouseout)
    this.bodyWrapEl?.querySelectorAll<HTMLElement>('.pg-row--hover')
      .forEach((el) => el.classList.remove('pg-row--hover'));

    // Ghost chip
    const ghost = createDiv('pg-row-drag-ghost');
    const dragIcon = document.createElement('span');
    dragIcon.className = 'pg-row-drag-ghost__icon pg-row-drag-ghost__icon--drag';
    dragIcon.innerHTML = this.iconRenderer.renderToString('drag', 14);
    const blockIcon = document.createElement('span');
    blockIcon.className = 'pg-row-drag-ghost__icon pg-row-drag-ghost__icon--block';
    blockIcon.innerHTML = this.iconRenderer.renderToString('ban', 14);
    const labelSpan = document.createElement('span');
    labelSpan.className = 'pg-row-drag-ghost__label';
    labelSpan.textContent = this.dragLabel || 'Row';
    ghost.appendChild(dragIcon);
    ghost.appendChild(blockIcon);
    ghost.appendChild(labelSpan);
    // Portaled to `document.body`, so it must be pointed back at the owning
    // grid's token scope or it paints in light-mode fallbacks. See adoptGridTheme.
    if (this.gridEl) adoptGridTheme(ghost, this.gridEl);
    document.body.appendChild(ghost);
    // The chip is moved by transform from here on — no layout, no paint. The
    // theme rule composes this translation with the chip's own `-50%` centring.
    this.ghost.attach(ghost);
    this.ghost.moveTo(e.clientX, e.clientY);

    this.setDraggingClass(nodeId, true);
    this.gridEl?.classList.add('pg-grid--row-dragging');

    this.topStyles.mount();
    // Read once, in one batch, rather than on every pointer event inside the
    // drop-target hit test.
    this.bodyRect = this.bodyWrapEl?.getBoundingClientRect() ?? null;
    this.serialCacheValid = false;

    document.addEventListener('pointermove', this.boundMouseMove, { passive: true });
    document.addEventListener('pointerup', this.boundMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    this.startAutoScrollLoop();

    this.eventBus.emit(GridEventType.ROW_DRAG_START, {
      row: this.draggedRow!,
      rowIndex: this.draggedRow!.rowIndex,
    });
  }

  // ─── Mouse move ───────────────────────────────────────────────────────────

  /**
   * Records the pointer sample. All work is deferred to {@link applyDragFrame},
   * which the scheduler runs at most once per painted frame.
   */
  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.frames.sample(e.clientX, e.clientY);
  }

  /** The row drag's per-frame workload: move the chip, then re-resolve the drop slot. */
  private applyDragFrame(x: number, y: number): void {
    if (!this.isDragging) return;
    this.cursorX = x;
    this.cursorY = y;
    this.ghost.moveTo(x, y);
    this.updateDropTarget();
  }

  private updateDropTarget(): void {
    if (!this.bodyWrapEl || !this.draggingNodeId) return;

    const bodyRect = this.ensureBodyRect();
    if (!bodyRect) return;
    const isOutside =
      this.cursorX < bodyRect.left || this.cursorX > bodyRect.right ||
      this.cursorY < bodyRect.top  || this.cursorY > bodyRect.bottom;

    if (isOutside) {
      this.ghost.setFlag('pg-row-drag-ghost--outside', true);
      if (this.targetNodeId !== null) {
        this.targetNodeId = null;
        this.targetRow = null;
        this.clearDragTops(); // rows animate back to their real positions
      }
      return;
    }
    this.ghost.setFlag('pg-row-drag-ghost--outside', false);

    const scrollTop = this.getScrollTop();
    const cursorContentY = (this.cursorY - bodyRect.top) + scrollTop;

    // Hit-test only what is painted. The cursor is inside the body (checked
    // above), so the row under it is necessarily in the render window — and
    // scanning the full array would be both O(dataset) per pointer move and
    // unsafe against a sparse one.
    const w = this.renderWindow();
    let target: RowNode | null = null;
    let position: 'before' | 'after' | 'inside' = 'before';
    let firstCandidate: RowNode | null = null;
    let lastCandidate: RowNode | null = null;

    for (let i = w.start; i < w.end; i++) {
      const row = w.rows[i];
      if (!row) continue; // unloaded slot in a demand-loading model
      if (row.type === 'group' || row.type === 'summary') continue;
      if (row.nodeId === this.draggingNodeId) continue;

      if (cursorContentY >= row.top && cursorContentY < row.top + row.height) {
        target = row;
        position = this.classifyDropPosition(cursorContentY - row.top, row.height);
        break;
      }
      if (!firstCandidate) firstCandidate = row;
      lastCandidate = row;
    }

    // Fallback for a cursor in a gap the loop found no row for — above the
    // topmost painted row, or below the bottom one.
    if (!target && firstCandidate && lastCandidate) {
      if (cursorContentY < firstCandidate.top) {
        target = firstCandidate; position = 'before';
      } else if (cursorContentY >= lastCandidate.top + lastCandidate.height) {
        target = lastCandidate; position = 'after';
      }
    }

    const newTarget = target?.nodeId ?? null;
    const newPos = position;

    // Only recompute style sheet when the target slot actually changed
    if (newTarget !== this.targetNodeId || newPos !== this.targetPosition) {
      this.targetNodeId = newTarget;
      this.targetRow = target;
      this.targetPosition = newPos;
      if (this.targetNodeId) {
        // Tree reparenting doesn't have a stable "flat virtual order" to
        // preview (the real position is decided by the hierarchy rebuild
        // after drop) — show a drop highlight on the target row instead of
        // the flat mode's row-shifting preview.
        if (this.treeModeActive) this.updateTreeDropHighlight();
        else this.updateRowTops();
      } else {
        this.clearDragTops();
      }
    }
  }

  /**
   * Re-stamps the drag's imperative DOM state onto the current row elements
   * after a body re-render. Bound to `ROWS_RENDERED`.
   *
   * The absolute-`top` overrides survive a re-render on their own — they live
   * in a global stylesheet keyed by `data-node-id` (see `updateRowTops`) — but
   * the dragged-row opacity marker, the tree-mode drop highlight, and the
   * previewed serial numbering are applied directly to elements that
   * virtualization recycles and `BodyRenderer.updatePanelRow` overwrites. Those
   * must be re-applied on the fresh DOM or the placeholder vanishes the moment
   * the viewport scrolls mid-drag. No-op unless a drag is in progress.
   */
  private reapplyDragVisuals(): void {
    if (!this.isDragging || !this.draggingNodeId) return;
    this.setDraggingClass(this.draggingNodeId, true);
    if (!this.targetNodeId) return;
    // Re-run the same preview branch used while tracking the pointer:
    // tree mode re-highlights the target row; flat mode re-emits the top
    // overrides (idempotent — identical values) and re-numbers the serials.
    if (this.treeModeActive) this.updateTreeDropHighlight();
    else this.updateRowTops();
  }

  /** Tree mode's drop feedback: highlights the target row and flags whether the drop would nest the dragged row inside it. */
  private updateTreeDropHighlight(): void {
    this.bodyWrapEl?.querySelectorAll<HTMLElement>('.pg-row--drop-target')
      .forEach((el) => el.classList.remove('pg-row--drop-target', 'pg-row--drop-inside', 'pg-row--drop-before', 'pg-row--drop-after'));
    if (!this.targetNodeId) return;
    const targetEls = this.bodyWrapEl?.querySelectorAll<HTMLElement>(`[data-node-id="${this.targetNodeId}"]`);
    targetEls?.forEach((el) => {
      el.classList.add('pg-row--drop-target', `pg-row--drop-${this.targetPosition}`);
    });
  }

  /** 2-way (before/after) split normally; 3-way (before/inside/after, thirds) when Tree Data drag-to-reparent is active. */
  private classifyDropPosition(relativeY: number, rowHeight: number): 'before' | 'after' | 'inside' {
    if (!this.treeModeActive) return relativeY < rowHeight / 2 ? 'before' : 'after';
    const third = rowHeight / 3;
    if (relativeY < third) return 'before';
    if (relativeY > rowHeight - third) return 'after';
    return 'inside';
  }

  // ─── Mouse up ─────────────────────────────────────────────────────────────

  private onMouseUp(_e: MouseEvent): void {
    // Apply any sample still queued so the drop resolves against the pointer's
    // final position rather than one up to a frame stale.
    this.frames.flushNow();

    if (!this.isDragging) { this.cleanup(); return; }

    const draggedRow = this.draggedRow;
    const targetRow = this.targetRow;
    const position = this.targetPosition;
    // Resolved before cleanup, which clears the drag's row references.
    const move = draggedRow && targetRow && draggedRow.nodeId !== targetRow.nodeId
      ? this.resolveMove(draggedRow, targetRow, position)
      : null;

    // Phase 1: remove interaction state immediately (ghost, events, cursor, row class).
    // Keep pg-grid--row-dragging + drag tops alive so there is no visual snap while
    // the store re-render and RowPositionSheet settle to the new positions.
    this.cleanupInteraction();

    if (move && this.treeModeActive && this.treeReparentHandler) {
      // Tree reparenting rebuilds the whole hierarchy via a pipeline refresh
      // rather than a flat splice — no drag-tops preview to reconcile, so
      // visuals can be cleared immediately.
      this.treeReparentHandler(draggedRow!.nodeId, targetRow!.nodeId, position);
      this.cleanupVisuals();
    } else if (move && this.managedReorder) {
      this.reorderRows(draggedRow!.nodeId, targetRow!.nodeId, move.position, move);
      // Phase 2: after two RAFs, RowPositionSheet has the same top values as our drag tops
      // → removing the overrides causes zero visual change.
      requestAnimationFrame(() => requestAnimationFrame(() => this.cleanupVisuals()));
    } else if (move) {
      // Unmanaged: the grid changes nothing. The preview is torn down at once so
      // rows sit where the data still says they do, and ROW_DROP goes out as a
      // request for the application to persist the move and refresh.
      this.cleanupVisuals();
      this.eventBus.emit(GridEventType.ROW_DROP, {
        draggedRows: [draggedRow!],
        targetRow: targetRow!,
        position,
        managed: false,
        fromIndex: move.fromIndex,
        toIndex: move.toIndex,
      });
    } else {
      this.cleanupVisuals();
    }

    if (draggedRow) {
      this.eventBus.emit(GridEventType.ROW_DRAG_END, { row: draggedRow, cancelled: move === null });
    }
  }

  /**
   * Resolves the drop into concrete indices, or `null` when it would not move
   * the row (dropped back into its own slot, or onto a row whose position can't
   * be resolved).
   */
  private resolveMove(
    draggedRow: RowNode,
    targetRow: RowNode,
    position: 'before' | 'after' | 'inside',
  ): { fromIndex: number; toIndex: number; position: 'before' | 'after' } | null {
    const w = this.renderWindow();
    const fromIndex = this.indexOf(w, draggedRow);
    const targetIndex = this.indexOf(w, targetRow);
    if (fromIndex === -1 || targetIndex === -1) return null;

    // 'inside' is a Tree Data reparent, which has no flat equivalent; the flat
    // path treats it as 'after' exactly as the preview does.
    const flat = position === 'inside' ? 'after' : position;
    const preview = computeRowDragPreview(fromIndex, targetIndex, flat, w.rows.length, (i) => w.rows[i] ?? null);
    if (!preview) return null;
    return { fromIndex, toIndex: preview.insertIndex, position: flat };
  }


  // ─── Auto-scroll loop ─────────────────────────────────────────────────────

  private startAutoScrollLoop(): void {
    if (this.autoScrollRAF !== null) return;
    this.autoScrollLastTs = 0;
    this.autoScrollRAF = requestAnimationFrame(this.autoScrollTick);
  }

  /**
   * One auto-scroll frame.
   *
   * Two changes from the previous implementation:
   *
   * - The body rect comes from {@link ensureBodyRect} instead of a fresh
   *   `getBoundingClientRect()` per frame. Scrolling changes the body's content
   *   offset, not its position on screen, so the cached rect stays valid for the
   *   whole drag unless a re-render invalidates it.
   * - Speed is px/**second** scaled by real elapsed time rather than px/frame, so
   *   an identical gesture scrolls at the same rate on a 60 Hz and a 120 Hz
   *   display. The previous fixed-per-frame model ran twice as fast on the latter.
   *
   * Bound as an arrow field so it can be handed straight to `requestAnimationFrame`.
   */
  private readonly autoScrollTick = (ts: number): void => {
    this.autoScrollRAF = null;
    if (!this.isDragging || !this.bodyWrapEl || !this.scrollFn) return;

    const dt = this.autoScrollLastTs === 0
      ? 0
      : Math.min((ts - this.autoScrollLastTs) / 1000, MAX_FRAME_DELTA);
    this.autoScrollLastTs = ts;

    const rect = this.ensureBodyRect();
    if (!rect) return;

    const distTop = this.cursorY - rect.top;
    const distBot = rect.bottom - this.cursorY;

    let speed = 0;
    if (distTop >= 0 && distTop < SCROLL_ZONE) {
      speed = -MAX_SCROLL_SPD * Math.pow(1 - distTop / SCROLL_ZONE, 2);
    } else if (distBot >= 0 && distBot < SCROLL_ZONE) {
      speed = MAX_SCROLL_SPD * Math.pow(1 - distBot / SCROLL_ZONE, 2);
    }

    if (speed !== 0 && dt > 0) {
      this.scrollFn(speed * dt);
      // Re-evaluate the drop slot: the content moved, the cursor did not.
      this.updateDropTarget();
    }

    if (this.isDragging) {
      this.autoScrollRAF = requestAnimationFrame(this.autoScrollTick);
    }
  };

  /**
   * The body viewport's bounds, read at most once per invalidation.
   *
   * Invalidated at drag start and on every `ROWS_RENDERED` — the only events
   * during a drag that can move the viewport on screen.
   */
  private ensureBodyRect(): DOMRect | null {
    if (!this.bodyRect && this.bodyWrapEl) {
      this.bodyRect = this.bodyWrapEl.getBoundingClientRect();
    }
    return this.bodyRect;
  }

  // ─── Live top animation ───────────────────────────────────────────────────
  //
  // Uses absolute `top` values (not transforms) to avoid the overflow:hidden
  // clipping that panel bodies impose.  The rules have higher CSS specificity
  // than RowPositionSheet (.pg-grid--row-dragging .pg-row[data-node-id="X"])
  // so they win cleanly.  Because reorderRows() produces the exact same top
  // values, removing these rules after the re-render causes zero visual snap.
  //
  // Scope is the render window, and the shift itself is computed in constant
  // time (see `row-drag-preview.ts`) rather than by rebuilding the whole order:
  // this runs on every pointer move, and only painted rows can be seen moving.

  private updateRowTops(): void {
    if (!this.draggingNodeId || !this.targetNodeId) {
      this.clearDragTops();
      return;
    }

    const w = this.renderWindow();
    const draggedRow = this.draggedRow;
    const targetRow = this.targetRow;
    if (!draggedRow || !targetRow) { this.clearDragTops(); return; }

    const fromIdx = this.indexOf(w, draggedRow);
    const targetIdx = this.indexOf(w, targetRow);
    if (fromIdx === -1 || targetIdx === -1) { this.clearDragTops(); return; }

    const preview = computeRowDragPreview(
      fromIdx,
      targetIdx,
      this.targetPosition === 'inside' ? 'after' : this.targetPosition,
      w.rows.length,
      (i) => w.rows[i] ?? null,
    );
    if (!preview) { this.clearDragTops(); return; }

    // RowPositionSheet writes window-relative tops (see GridRenderer's
    // paint-coordinate rebasing), so the same origin comes off here or the
    // preview would sit an entire scroll depth away from the rows it replaces.
    const originY = this.getRowOriginY();
    const rule = (nodeId: string, top: number): string =>
      // specificity (0,3,0) > RowPositionSheet (0,2,0) → always wins
      `.pg-grid--row-dragging .pg-row[data-node-id="${nodeId}"]{top:${top - originY}px;}`;

    // The dragged row is pinned into the DOM by GridRenderer even once
    // auto-scroll carries its real position out of the window, so its rule is
    // emitted outside the window loop.
    const rules: string[] = [rule(this.draggingNodeId, preview.draggedTop)];

    // Previewed visual order, for the serial column. Every painted row goes in,
    // moved or not, so the ordering is complete for what is on screen.
    const order: Array<{ row: RowNode; top: number }> = [
      { row: draggedRow, top: preview.draggedTop },
    ];

    for (let i = w.start; i < w.end; i++) {
      const row = w.rows[i];
      if (!row || i === fromIdx) continue;
      const newTop = previewTopFor(preview, i, fromIdx, row.top);
      if (newTop !== null) rules.push(rule(row.nodeId, newTop));
      order.push({ row, top: newTop ?? row.top });
    }

    // Elided entirely when the previewed positions are unchanged — which is the
    // common case, since this runs every frame but the drop slot moves rarely.
    this.topStyles.write(`${rules.join('\n')}\n`);

    // Keep the serial-number column consistent with the live preview: the rows
    // have just been repositioned, so their serials must follow suit.
    //
    // Deliberately *not* gated on the write above. `reapplyDragVisuals` calls
    // this after a re-render precisely because virtualization recycled the row
    // elements and wiped their serials — the CSS is identical then, but the
    // serials still need re-stamping. `renumberSerialCells` guards its own
    // writes per span instead.
    order.sort((a, b) => a.top - b.top);
    this.renumberSerialCells(order.map((e) => e.row));
  }

  /**
   * Index of `row` in the published array.
   *
   * `RowNode.rowIndex` is the row's absolute position in `visibleRows`,
   * assigned by `RowModel.layoutNodes` — the same invariant `BodyRenderer`
   * already relies on for serials and stripe parity. So it serves as an O(1)
   * hint, verified against the array before it is trusted, with a scan of the
   * render window as the fallback.
   */
  private indexOf(w: RenderWindow, row: RowNode | null): number {
    if (!row) return -1;
    const hint = row.rowIndex;
    if (hint >= 0 && hint < w.rows.length && w.rows[hint]?.nodeId === row.nodeId) return hint;
    for (let i = w.start; i < w.end; i++) {
      if (w.rows[i]?.nodeId === row.nodeId) return i;
    }
    return -1;
  }

  /** The published rows plus the half-open index range currently painted. */
  private renderWindow(): RenderWindow {
    const rows = this.store.get('visibleRows') as ReadonlyArray<RowSlot>;
    const start = Math.max(0, this.store.get('firstRenderedRowIndex'));
    const end = Math.min(rows.length, this.store.get('lastRenderedRowIndex'));
    return { rows, start, end };
  }

  /** The painted row carrying `nodeId`, or `null`. */
  private findInWindow(w: RenderWindow, nodeId: string): RowNode | null {
    for (let i = w.start; i < w.end; i++) {
      const row = w.rows[i];
      if (row?.nodeId === nodeId) return row;
    }
    return null;
  }

  private clearDragTops(): void {
    this.topStyles.clear();
    this.bodyWrapEl?.querySelectorAll<HTMLElement>('.pg-row--drop-target')
      .forEach((el) => el.classList.remove('pg-row--drop-target', 'pg-row--drop-inside', 'pg-row--drop-before', 'pg-row--drop-after'));

    // Restore the serial column to the real row order. On a committed drop the
    // subsequent re-render already carries the correct serials, so this is a
    // harmless identity pass; on a cancelled/reverted drag it undoes the
    // preview renumbering (no re-render happens in that path).
    const w = this.renderWindow();
    const order: RowNode[] = [];
    for (let i = w.start; i < w.end; i++) {
      const row = w.rows[i];
      if (row) order.push(row);
    }
    this.renumberSerialCells(order);
  }

  /**
   * Re-numbers the serial-number column so the on-screen serials read in
   * ascending order top-to-bottom for the given row order.
   *
   * The set of serial VALUES currently rendered is invariant during a drag
   * (only their row assignment changes), so those exact values are
   * redistributed to the rows in `order`. This is intentionally agnostic to how
   * serials are computed (absolute vs. window-relative) — it neither knows nor
   * needs the numbering scheme, which avoids any value "jump" at drag start.
   *
   * Only rows currently in the DOM carry serial cells, and `order` is scoped to
   * the render window for exactly that reason — a row that is not painted has
   * no serial to renumber. No-op when the serial column is disabled (no serial
   * cells present).
   *
   * ### Performance
   * The span lookup table is built once per render (see {@link ensureSerialCache})
   * rather than re-queried, re-parsed, and re-sorted here — this used to run a
   * `querySelectorAll` plus a `closest` and a `parseInt` per serial cell on every
   * drop-target change *and* every `ROWS_RENDERED`. Each span is written only
   * when its value actually changes, so a frame that shifts nothing is free.
   *
   * @param order - Painted row nodes in the desired visual order (previewed
   *                order while dragging; real order to restore).
   */
  private renumberSerialCells(order: ReadonlyArray<RowNode>): void {
    this.ensureSerialCache();
    if (this.serialSpans.size === 0) return;

    // Ascending values assigned to rows in visual order → serials always count
    // up the screen regardless of which row moved.
    let k = 0;
    for (const row of order) {
      if (k >= this.serialValues.length) break;
      const span = this.serialSpans.get(row.nodeId);
      if (!span) continue;
      const next = String(this.serialValues[k++]);
      if (span.textContent !== next) span.textContent = next;
    }
  }

  /**
   * Rebuilds the serial-cell lookup table if it is stale.
   *
   * Invalidated at drag start and on every `ROWS_RENDERED`, which are the only
   * points at which the rendered serial cells — or the pool of values they carry
   * — can change.
   */
  private ensureSerialCache(): void {
    if (this.serialCacheValid || !this.bodyWrapEl) return;
    this.serialCacheValid = true;
    this.serialSpans.clear();
    this.serialValues.length = 0;

    this.bodyWrapEl.querySelectorAll<HTMLElement>('.pg-cell--serial').forEach((cell) => {
      const nodeId = cell.closest<HTMLElement>('[data-node-id]')?.getAttribute('data-node-id');
      const span = cell.querySelector<HTMLElement>('.pg-cell__serial');
      if (!nodeId || !span || this.serialSpans.has(nodeId)) return;
      const n = parseInt(span.textContent ?? '', 10);
      if (Number.isNaN(n)) return;
      this.serialSpans.set(nodeId, span);
      this.serialValues.push(n);
    });

    this.serialValues.sort((a, b) => a - b);
  }

  // ─── Row reorder (committed on drop) ─────────────────────────────────────

  private reorderRows(
    draggedId: string,
    targetId: string,
    position: 'before' | 'after',
    indices: { fromIndex: number; toIndex: number },
  ): void {
    const allRows    = [...(this.store.get('allRows')    as RowNode[])];
    const visibleRows = [...(this.store.get('visibleRows') as RowNode[])];

    const move = (arr: RowNode[]) => {
      const fromIdx = arr.findIndex((r) => r.nodeId === draggedId);
      if (fromIdx === -1) return arr;
      const [item] = arr.splice(fromIdx, 1);
      let toIdx = arr.findIndex((r) => r.nodeId === targetId);
      if (toIdx === -1) { arr.splice(fromIdx, 0, item); return arr; }
      if (position === 'after') toIdx++;
      arr.splice(Math.max(0, toIdx), 0, item);
      return arr;
    };

    const newVisible = move(visibleRows);
    const newAll     = move(allRows);

    // Recompute tops — same arithmetic as updateRowTops() so values match
    let top = 0;
    for (let i = 0; i < newVisible.length; i++) {
      newVisible[i] = { ...newVisible[i], rowIndex: i, top };
      top += newVisible[i].height;
    }

    const draggedNode = newVisible.find((r) => r.nodeId === draggedId);
    const targetNode  = newVisible.find((r) => r.nodeId === targetId);
    if (draggedNode && targetNode) {
      this.eventBus.emit(GridEventType.ROW_DROP, {
        draggedRows: [draggedNode],
        targetRow: targetNode,
        position,
        managed: true,
        fromIndex: indices.fromIndex,
        toIndex: indices.toIndex,
      });
    }

    this.store.set('allRows', newAll);
    this.store.set('visibleRows', newVisible);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getScrollTop(): number {
    const val = this.gridEl?.style.getPropertyValue('--pg-scroll-y') ?? '0px';
    return -parseFloat(val) || 0;
  }

  /**
   * The offset RowPositionSheet currently subtracts from every row's `top`.
   * Published by `ScrollController.setRowOrigin`; see the paint-coordinate
   * rebasing note in `GridRenderer.performRender`.
   */
  private getRowOriginY(): number {
    const val = this.gridEl?.style.getPropertyValue('--pg-row-origin-y') ?? '0px';
    return parseFloat(val) || 0;
  }

  private setDraggingClass(nodeId: string, active: boolean): void {
    this.bodyWrapEl?.querySelectorAll<HTMLElement>(`[data-node-id="${nodeId}"]`)
      .forEach((el) => el.classList.toggle('pg-row--row-dragging', active));
  }

  // Phase 1 — remove interaction state; keep grid class + drag tops
  private cleanupInteraction(): void {
    if (this.autoScrollRAF !== null) {
      cancelAnimationFrame(this.autoScrollRAF);
      this.autoScrollRAF = null;
    }
    this.autoScrollLastTs = 0;
    // Discards any sample queued for the next frame — a torn-down drag must not
    // apply one last move.
    this.frames.reset();
    if (this.draggingNodeId) this.setDraggingClass(this.draggingNodeId, false);
    this.ghost.detach();
    this.draggingNodeId = null;
    this.targetNodeId = null;
    this.draggedRow = null;
    this.targetRow = null;
    this.bodyRect = null;
    this.isDragging = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    document.removeEventListener('pointermove', this.boundMouseMove);
    document.removeEventListener('pointerup', this.boundMouseUp);
  }

  // Phase 2 — remove visual overrides once RowPositionSheet has settled
  private cleanupVisuals(): void {
    this.gridEl?.classList.remove('pg-grid--row-dragging');
    this.clearDragTops();
    // The sheet is removed rather than merely emptied: an empty `<style>` per
    // grid instance would otherwise accumulate in `document.head`.
    this.topStyles.dispose();
    this.serialSpans.clear();
    this.serialValues.length = 0;
    this.serialCacheValid = false;
  }

  private cleanup(): void {
    this.cleanupInteraction();
    this.cleanupVisuals();
  }
}
