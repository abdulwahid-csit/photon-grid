import type { ColumnDef } from '../types/column.types';
import type { ColumnModel } from '../core/column-model';
import type { ColumnGroupModel } from './column-group-model';
import type { ColumnGroupHeaderBuilder } from './column-group-header-builder';
import type { ColumnStyleManager } from '../renderer/column-style-manager';
import type { EventBus } from '../event-bus/event-bus';
import type { IColumnGroupNode } from './column-group.types';
import { ColumnGroupNodeType } from './column-group.types';
import { GridEventType } from '../types/event.types';
import { createDiv } from '../renderer/dom-utils';
import { portalHostFor } from '../theme/overlay-portal';
import { isTouchPointer, DRAG_THRESHOLD_MOUSE, DRAG_THRESHOLD_TOUCH, LONG_PRESS_MS } from '../core/pointer-utils';
import { DragFrameScheduler } from '../drag-drop/drag-frame-scheduler';
import { DragRectCache, NO_SLOT } from '../drag-drop/drag-rect-cache';
import { DragStyleWriter } from '../drag-drop/drag-style-writer';
import { DragGhost } from '../drag-drop/drag-ghost';

/**
 * Valid drop-zone positions during a group header drag.
 */
export type GroupDropPosition = 'before' | 'after' | 'inside';

/**
 * Describes a potential drop target identified during a group-drag move event.
 */
export interface GroupDropTarget {
  /** Whether this is a valid location to drop the dragged node. */
  valid:       boolean;
  /** Target group ID or leaf column ID. */
  targetId:    string;
  /** Position relative to the target. */
  position:    GroupDropPosition;
  /** Pixel x coordinate of the visual drop indicator relative to the grid element. */
  indicatorX:  number;
}

/** Drop zone kind resolved at mouseup. */
const enum DropZone {
  /** Dropped on another group header cell. */
  GROUP,
  /** Dropped on the row-grouping bar. */
  GROUPING_BAR,
  /** Dropped outside the grid bounds — hide all columns in the group. */
  OUTSIDE,
}

/** `{ valid: false }` sentinel. */
const INVALID_TARGET: GroupDropTarget = {
  valid: false, targetId: '', position: 'before', indicatorX: 0,
};

/**
 * Manages drag-and-drop operations for group header cells.
 *
 * Handles three drag scenarios:
 * 1. **Group header drag** — move an entire group (all children move together).
 * 2. **Leaf inside a married group** — dragging a child moves the parent group.
 * 3. **Leaf drag out of group** — creates a solo wrapper group at the drop site.
 *
 * Drop targets:
 * - **Another group** — inserts the dragged group before/after the target.
 * - **Row-grouping bar** — triggers row-grouping for all `groupable` leaves.
 * - **Outside the grid** — shows a "hide" preview and hides all columns.
 *
 * Visual feedback:
 * - Ghost chip following the cursor.
 * - Thin vertical drop-indicator line at the insertion point.
 * - Ghost turns red when dragged outside the grid.
 */
export class ColumnGroupDragHandler {
  /** Currently dragged group ID, `null` when not dragging. */
  private draggingId:     string | null = null;
  /** `true` when the dragged node is a group (vs. a leaf). */
  private draggingIsGroup = false;
  /** Positions the ghost chip with a compositor-only transform. */
  private readonly ghost = new DragGhost();
  /** Vertical indicator line shown at the drop target. */
  private indicatorEl:    HTMLElement | null = null;
  /** The grid `.pg-grid` element, captured at drag-start from the getter. */
  private gridEl:         HTMLElement | null = null;
  /** Last computed drop target. */
  private currentTarget:  GroupDropTarget | null = null;
  /** `true` for the remainder of the current event loop after a drag completes. */
  private _didJustDrag    = false;

  // ── Live drag transform state ────────────────────────────────────────────
  /**
   * Owns the injected `<style>` element holding CSS transforms during a drag,
   * and skips the assignment when the generated rules are unchanged.
   */
  private readonly dragStyles = new DragStyleWriter('data-pg-group-drag');
  /**
   * Group-cell geometry captured at drag start, in one batch read.
   *
   * Both the effective-slot loop and {@link hitTest} used to call
   * `getBoundingClientRect()` on every candidate cell on every pointer event,
   * immediately after writing the chip's position — an O(n) chain of forced
   * layout flushes per event.
   */
  private readonly dragCells = new DragRectCache();
  /** Group ids parallel to {@link dragCells}, so a slot maps back in O(1). */
  private dragCellIds:       string[] = [];
  /** Width of the dragged group cell (pixels). */
  private dragCellWidth      = 0;
  /** Index of the dragged group cell within {@link dragCells}. */
  private dragSourceIdx      = -1;
  /** Current effective drop index (updated each frame). */
  private dragEffectiveIdx   = -1;

  /**
   * All `[data-group-id]` cells in the grid, for {@link hitTest}.
   *
   * A superset of {@link dragCells}, which is restricted to the dragged group's
   * depth level.
   */
  private readonly hitCells = new DragRectCache();
  /** Group ids parallel to {@link hitCells}. */
  private hitCellIds: string[] = [];

  /** Grid bounds, captured at drag start for the outside-the-grid test. */
  private gridRect: DOMRect | null = null;
  /** Row-grouping bar bounds, captured at drag start. `null` when no bar exists. */
  private groupBarRect: DOMRect | null = null;
  /** Mirrors the indicator's `left`, so an unchanged position is never rewritten. */
  private lastIndicatorX = NaN;
  /** Mirrors the indicator's visibility; `null` until first written. */
  private indicatorVisible: boolean | null = null;

  /**
   * Coalesces `pointermove` into one frame of work — hit test, transform
   * generation, and indicator placement now run once per painted frame against
   * the newest sample rather than once per pointer event.
   */
  private readonly frames: DragFrameScheduler;

  /**
   * Disposers for the per-cell `pointerdown` listeners.
   *
   * These were previously registered with no way to remove them. Group header
   * cells are rebuilt on every column change, so each rebuild leaked one listener
   * per cell for the lifetime of the grid.
   */
  private readonly cellDisposers = new Set<() => void>();

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp:   (e: MouseEvent) => void;

  constructor(
    private readonly columnModel:    ColumnModel,
    private readonly groupModel:     ColumnGroupModel,
    private readonly headerBuilder:  ColumnGroupHeaderBuilder,
    private readonly colStyles:      ColumnStyleManager,
    private readonly eventBus:       EventBus,
    /** Returns the root `.pg-grid` element; may be `null` before mount. */
    private readonly gridElGetter:   () => HTMLElement | null,
  ) {
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp   = this.onMouseUp.bind(this);
    this.frames = new DragFrameScheduler((x, y) => this.applyDragFrame(x, y));
  }

  // ── Public ───────────────────────────────────────────────────────────────

  /**
   * `true` immediately after a drag session ends (cleared after one tick).
   * Used by the header builder to suppress the collapse-toggle click that
   * fires after a drag completes.
   */
  get didJustDrag(): boolean { return this._didJustDrag; }

  /**
   * Attach drag listeners to a group header cell element.
   * Drag starts only after the pointer has moved more than 5 px so that a
   * short click still fires the collapse-toggle handler.
   *
   * @param el    - The group header `<div>` element.
   * @param group - The group node this cell represents.
   * @returns A disposer that removes the listener. Also tracked internally, so
   *   {@link destroy} releases every cell registered since the last teardown —
   *   group headers are rebuilt on each column change, and these listeners
   *   previously accumulated with no way to remove them.
   */
  attachGroupDragListeners(el: HTMLElement, group: IColumnGroupNode): () => void {
    const onPointerDown = (e: PointerEvent): void => {
      if ((e.target as HTMLElement).closest('.pg-th__resize-handle, .pg-th__collapse-btn')) return;
      if (e.button !== 0) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const touch  = isTouchPointer(e);
      let started      = false;
      let longPressTimer = 0;

      // Intercept the click that would fire on release so collapse does not toggle.
      const armClickBlocker = (): void => {
        let timer = 0;
        const blockClick = (ce: Event): void => {
          ce.stopPropagation();
          clearTimeout(timer);
          document.removeEventListener('click', blockClick, true);
        };
        document.addEventListener('click', blockClick, true);
        // A drag that ends outside any clickable element produces no click at
        // all, so the listener needs an expiry of its own or it leaks — one per
        // completed drag, for the lifetime of the document.
        timer = window.setTimeout(() => {
          document.removeEventListener('click', blockClick, true);
        }, 0);
      };

      const beginDrag = (clientX: number, clientY: number): void => {
        if (started) return;
        started = true;
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = 0; }
        el.classList.remove('pg-th--drag-armed');
        document.removeEventListener('pointermove', onMoveStart);
        document.removeEventListener('pointerup', onUpEarly);
        this.startGroupDrag(group, clientX, clientY);
        document.addEventListener('pointermove', this.boundMouseMove, { passive: true });
        document.addEventListener('pointerup',   this.boundMouseUp);
        armClickBlocker();
      };

      const cleanupProbe = (): void => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = 0; }
        el.classList.remove('pg-th--drag-armed');
        document.removeEventListener('pointermove', onMoveStart);
        document.removeEventListener('pointerup', onUpEarly);
      };

      const onMoveStart = (ev: PointerEvent): void => {
        if (started) return;
        const dx = Math.abs(ev.clientX - startX);
        const dy = Math.abs(ev.clientY - startY);
        if (touch) {
          // Swipe before the long-press fires → scroll, not reorder.
          if (dx > DRAG_THRESHOLD_TOUCH || dy > DRAG_THRESHOLD_TOUCH) cleanupProbe();
        } else if (dx > DRAG_THRESHOLD_MOUSE) {
          beginDrag(ev.clientX, ev.clientY);
        }
      };

      const onUpEarly = (): void => { if (!started) cleanupProbe(); };

      document.addEventListener('pointermove', onMoveStart);
      document.addEventListener('pointerup',   onUpEarly);

      if (touch) {
        el.classList.add('pg-th--drag-armed');
        longPressTimer = window.setTimeout(() => {
          longPressTimer = 0;
          beginDrag(startX, startY);
        }, LONG_PRESS_MS);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);

    const dispose = (): void => {
      el.removeEventListener('pointerdown', onPointerDown);
      this.cellDisposers.delete(dispose);
    };
    this.cellDisposers.add(dispose);
    return dispose;
  }

  /**
   * Attach drag listeners to a leaf header cell, respecting `marryChildren`.
   *
   * When the leaf's parent group has `marryChildren === true`, dragging the
   * leaf starts a group drag instead of a leaf drag.
   *
   * @param el     - The leaf header `<div>` element.
   * @param colDef - The column definition.
   * @returns A disposer, or `undefined` when no listener was attached (the leaf
   *   is not inside a married group and uses `HeaderRenderer`'s built-in drag).
   */
  attachLeafDragListeners(el: HTMLElement, colDef: ColumnDef): (() => void) | undefined {
    const parent = this.groupModel.getParent(colDef.colId);
    if (parent?.marryChildren) {
      const group = this.groupModel.getGroup(parent.groupId);
      if (group) return this.attachGroupDragListeners(el, group);
    }
    // Non-married leaves use HeaderRenderer's built-in drag
    return undefined;
  }

  /** `true` while a drag session is in progress. */
  get isDragging(): boolean { return this.draggingId !== null; }

  /** Release all event listeners and remove DOM artefacts. */
  destroy(): void {
    this.cleanupDrag();
    for (const dispose of Array.from(this.cellDisposers)) dispose();
    this.cellDisposers.clear();
    document.removeEventListener('pointermove', this.boundMouseMove);
    document.removeEventListener('pointerup',   this.boundMouseUp);
  }

  // ── Private: drag lifecycle ───────────────────────────────────────────────

  private startGroupDrag(
    group:   IColumnGroupNode,
    clientX: number,
    clientY: number,
  ): void {
    const gridEl = this.gridElGetter();
    if (!gridEl) return;

    this.draggingId      = group.groupId;
    this.draggingIsGroup = true;
    this.gridEl          = gridEl;

    // Ghost chip
    const ghost = createDiv('pg-col-drag-ghost');
    const label = document.createElement('span');
    label.className   = 'pg-col-drag-ghost__label';
    label.textContent = group.header;
    ghost.appendChild(label);
    // Portaled into the grid's own host, so the chip follows the active mode and
    // variant instead of falling back to light-mode literals.
    portalHostFor(gridEl).appendChild(ghost);
    // Positioned by transform from here on: no layout, no paint per move.
    this.ghost.attach(ghost, 14, 0);
    this.ghost.moveTo(clientX, clientY);

    // Drop indicator
    const indicator = createDiv('pg-group-drop-indicator');
    gridEl.appendChild(indicator);
    this.indicatorEl = indicator;

    document.body.style.cursor     = 'grabbing';
    document.body.style.userSelect = 'none';
    gridEl.classList.add('pg-grid--col-dragging');

    // ── Capture geometry once, in one batch ─────────────────────────────────
    // Every read below happens before any style write, so the browser flushes
    // layout a single time for the whole capture instead of once per element.
    const draggedCell = gridEl.querySelector<HTMLElement>(`[data-group-id="${group.groupId}"]`);
    const depth = parseInt(
      draggedCell?.closest<HTMLElement>('[data-group-depth]')?.getAttribute('data-group-depth') ?? '0',
      10,
    );

    const depthCells: HTMLElement[] = [];
    for (const row of gridEl.querySelectorAll<HTMLElement>(`[data-group-depth="${depth}"]`)) {
      for (const cell of row.querySelectorAll<HTMLElement>('[data-group-id]')) {
        depthCells.push(cell);
      }
    }
    this.dragCells.capture(depthCells);
    // Group cells are absolutely positioned, so DOM order is not slot order.
    this.dragCells.sortByLeft();
    this.dragCellIds = this.dragCells.elements.map((el) => el.getAttribute('data-group-id') ?? '');

    const allCells = Array.from(gridEl.querySelectorAll<HTMLElement>('[data-group-id]'));
    this.hitCells.capture(allCells);
    this.hitCellIds = allCells.map((el) => el.getAttribute('data-group-id') ?? '');

    this.gridRect = gridEl.getBoundingClientRect();
    this.groupBarRect = gridEl.querySelector<HTMLElement>('.pg-group-drop-zone--top')
      ?.getBoundingClientRect() ?? null;

    this.dragSourceIdx    = this.dragCellIds.indexOf(group.groupId);
    this.dragCellWidth    = this.dragSourceIdx === -1 ? 0 : this.dragCells.widthOf(this.dragSourceIdx);
    this.dragEffectiveIdx = this.dragSourceIdx;

    this.dragStyles.mount();
  }

  /**
   * Records the pointer sample. All work is deferred to {@link applyDragFrame},
   * which the scheduler runs at most once per painted frame.
   */
  private onMouseMove(e: MouseEvent): void {
    if (!this.draggingId) return;
    this.frames.sample(e.clientX, e.clientY);
  }

  /**
   * The group drag's per-frame workload.
   *
   * Every geometry question is answered from the caches captured at drag start,
   * so this function performs no layout reads at all — the chip transform and
   * the drag stylesheet are pure writes.
   *
   * @param clientX - Newest cursor x.
   * @param clientY - Newest cursor y.
   */
  private applyDragFrame(clientX: number, clientY: number): void {
    if (!this.draggingId || !this.ghost.isAttached) return;

    this.ghost.moveTo(clientX, clientY);

    // Visual feedback: turn ghost red when outside grid
    const outside = this.isOutsideGrid(clientX, clientY);
    this.ghost.setFlag('pg-col-drag-ghost--outside', outside);

    if (outside) {
      this.currentTarget = null;
      this.updateIndicator(null);
      this.applyDragTransforms(-1);
      return;
    }

    const target = this.hitTest(clientX, clientY);
    this.currentTarget = target;
    this.updateIndicator(target);

    // Live CSS-transform reordering (mirrors HeaderRenderer column drag visual)
    if (this.dragCells.length > 0) {
      // Binary search over the cached, left-sorted spans — the previous linear
      // scan called getBoundingClientRect() on each candidate every event.
      let effectiveIdx = this.dragCells.hitTestX(clientX);
      if (effectiveIdx === NO_SLOT || effectiveIdx === this.dragSourceIdx) {
        effectiveIdx = this.dragSourceIdx;
      }
      // Clamp to edges
      const lastIdx = this.dragCells.length - 1;
      if (clientX < this.dragCells.leftOf(0)) effectiveIdx = 0;
      else if (clientX >= this.dragCells.rightOf(lastIdx)) effectiveIdx = lastIdx;

      this.dragEffectiveIdx = effectiveIdx;
      this.applyDragTransforms(effectiveIdx);
    }
  }

  /**
   * Write CSS `transform: translateX()` rules for the live drag preview.
   *
   * Routed through {@link dragStyles}, so a frame whose effective slot is
   * unchanged — the overwhelming majority — costs a string comparison rather
   * than a stylesheet re-parse and a grid-wide style recalculation.
   *
   * @param effectiveIdx - Drop slot, or `-1` to clear all transforms.
   */
  private applyDragTransforms(effectiveIdx: number): void {
    if (!this.dragStyles.isMounted || !this.gridEl) return;
    if (effectiveIdx === -1 || effectiveIdx === this.dragSourceIdx) {
      this.dragStyles.clear();
      return;
    }

    const gridId = this.gridEl.getAttribute('data-photon-grid-id') ?? '';
    const scope  = gridId ? `[data-photon-grid-id="${gridId}"] ` : '';
    const src    = this.dragSourceIdx;
    if (src === -1 || effectiveIdx >= this.dragCells.length) { this.dragStyles.clear(); return; }

    const srcOffset = effectiveIdx > src
      ? this.dragCells.rightOf(effectiveIdx) - this.dragCells.rightOf(src)
      : this.dragCells.leftOf(effectiveIdx)  - this.dragCells.leftOf(src);

    const rules: string[] = [
      `${scope}[data-group-id="${this.draggingId}"] { transform: translateX(${srcOffset}px); z-index: 10; position: relative; transition: none; }`,
    ];

    for (let i = 0; i < this.dragCells.length; i++) {
      if (i === src) continue;
      let offset = 0;
      if (effectiveIdx > src && i > src && i <= effectiveIdx) offset = -this.dragCellWidth;
      else if (effectiveIdx < src && i >= effectiveIdx && i < src) offset = this.dragCellWidth;
      if (offset !== 0) {
        rules.push(`${scope}[data-group-id="${this.dragCellIds[i]}"] { transform: translateX(${offset}px); }`);
      }
    }
    this.dragStyles.write(`${rules.join('\n')}\n`);
  }

  private onMouseUp(e: MouseEvent): void {
    // Apply a sample still queued for the next frame so the drop resolves
    // against the last position the pointer actually moved through. The
    // pointerup's own coordinates are not injected as a new sample: that would
    // re-run the full drag frame at commit time, and any model mutation it
    // triggered would race the commit below.
    this.frames.flushNow();

    const target     = this.currentTarget;
    const id         = this.draggingId;
    const isGroup    = this.draggingIsGroup;
    const gridEl     = this.gridEl;
    const outside    = gridEl ? this.isOutsideGrid(e.clientX, e.clientY) : false;
    const onGroupBar = gridEl ? this.isOverGroupingBar(e.clientX, e.clientY) : false;
    const effectiveIdx = this.dragEffectiveIdx;
    const sourceIdx    = this.dragSourceIdx;
    const cellCount    = this.dragCells.length;
    const targetGroupId = effectiveIdx >= 0 ? this.dragCellIds[effectiveIdx] : undefined;

    this.cleanupDrag();
    this._didJustDrag = true;
    // Clear flag after current event loop so the collapse click is suppressed
    Promise.resolve().then(() => { this._didJustDrag = false; });

    if (!id) return;

    // ── Drop: outside grid ──────────────────────────────────────────────────
    if (outside) {
      if (isGroup) {
        const leaves = this.groupModel.getLeavesInGroup(id);
        for (const leaf of leaves) {
          this.columnModel.setColumnVisible(leaf.colId, false);
        }
      }
      return;
    }

    // ── Drop: row-grouping bar ──────────────────────────────────────────────
    if (onGroupBar) {
      if (isGroup) {
        const leaves = this.groupModel.getLeavesInGroup(id);
        const groupableIds = leaves.filter((l) => l.groupable).map((l) => l.colId);
        if (groupableIds.length > 0) {
          // COLUMN_GROUP_CHANGED fires with an array of colIds to add to the
          // grouped-column set; GroupDropZone / GroupingEngine pick this up.
          this.eventBus.emit(GridEventType.COLUMN_GROUP_CHANGED, {
            action: 'add',
            colIds: groupableIds,
          });
        }
      }
      return;
    }

    // ── Drop: use live-transform effective index for precise positioning ──────
    // If the live transform computed a valid effectiveIdx, use that to determine
    // the insert position rather than the hitTest (which can be stale on fast drags).
    //
    // NOTE: these three values are read *after* `cleanupDrag()` has reset them,
    // so `useLiveIdx` is always `false` and this branch has never actually run —
    // every drop has resolved through `target` (the hit test). That is
    // pre-existing behaviour, deliberately preserved here: activating the branch
    // would change where groups land, which is a semantic change and not part of
    // this performance work. The pre-cleanup snapshots above are captured so the
    // fix is a one-line swap when it is decided on.
    const liveIdx    = this.dragEffectiveIdx;
    const useLiveIdx = liveIdx !== -1 && liveIdx !== this.dragSourceIdx
                    && liveIdx < this.dragCells.length;
    void effectiveIdx; void sourceIdx; void cellCount; void targetGroupId;

    const resolvedTarget: GroupDropTarget | null = useLiveIdx
      ? {
          valid:      true,
          targetId:   this.dragCellIds[liveIdx] ?? '',
          position:   liveIdx > this.dragSourceIdx ? 'after' : 'before',
          indicatorX: 0,
        }
      : target;

    if (!resolvedTarget?.valid) return;

    if (isGroup) {
      // Moving the whole group: insert before/after target
      const targetGroup = this.groupModel.getGroup(resolvedTarget.targetId);
      if (!targetGroup) return;

      const targetParent     = this.groupModel.getParent(resolvedTarget.targetId);
      const targetParentId   = targetParent?.groupId ?? null;
      const insertBeforeId   = resolvedTarget.position === 'before' ? resolvedTarget.targetId : null;

      // After-insert: find the node immediately following the target, insert before it
      const insertBeforeNext = resolvedTarget.position === 'after'
        ? this.nextSiblingId(resolvedTarget.targetId)
        : null;
      const finalInsertBefore = insertBeforeId ?? insertBeforeNext;

      // Dissolve solo group if being moved back to its origin group
      const draggedGroup = this.groupModel.getGroup(id);
      if (draggedGroup?.isSoloGroup && draggedGroup.originalParentGroupId === targetParentId) {
        const leafNode = draggedGroup.children[0];
        if (leafNode?.nodeType === ColumnGroupNodeType.LEAF) {
          this.groupModel.dissolveGroupIfSolo(id, targetParentId, finalInsertBefore);
          this.columnModel.setColumnVisible(leafNode.colDef.colId, true);
          this.triggerRebuild();
          return;
        }
      }

      this.groupModel.moveGroup(id, targetParentId, finalInsertBefore);
    }

    this.triggerRebuild();
  }

  private cleanupDrag(): void {
    this.draggingId       = null;
    this.draggingIsGroup  = false;
    this.currentTarget    = null;
    this.dragCellWidth    = 0;
    this.dragSourceIdx    = -1;
    this.dragEffectiveIdx = -1;
    // Discards any sample queued for the next frame — a torn-down drag must not
    // apply one last move.
    this.frames.reset();
    this.ghost.detach();
    this.indicatorEl?.remove();
    this.indicatorEl = null;
    this.dragStyles.dispose();
    this.dragCells.clear();
    this.hitCells.clear();
    this.dragCellIds = [];
    this.hitCellIds = [];
    this.gridRect = null;
    this.groupBarRect = null;
    this.lastIndicatorX = NaN;
    this.indicatorVisible = null;
    this.gridEl?.classList.remove('pg-grid--col-dragging');
    this.gridEl = null;
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    document.removeEventListener('pointermove', this.boundMouseMove);
    document.removeEventListener('pointerup',   this.boundMouseUp);
  }

  // ── Private: drop-target hit test ────────────────────────────────────────

  /**
   * Locate the nearest group header cell to the cursor, excluding the one being
   * dragged.
   *
   * Answered entirely from the geometry captured at drag start: the previous
   * implementation re-ran `querySelectorAll('[data-group-id]')` and called
   * `getBoundingClientRect()` on every result on *every pointer event*, an O(n)
   * chain of forced layout flushes per event.
   *
   * @param clientX - Client x coordinate.
   * @param clientY - Client y coordinate.
   */
  private hitTest(clientX: number, clientY: number): GroupDropTarget {
    if (!this.gridRect || !this.hitCells.isValid) return INVALID_TARGET;

    // Y must be within the group row (with 4 px tolerance); the dragged cell is
    // excluded by index.
    const skip = this.hitCellIds.indexOf(this.draggingId ?? '');
    const slot = this.hitCells.nearestByMidpointX(clientX, clientY, 4, skip);
    if (slot === NO_SLOT) return INVALID_TARGET;

    const left  = this.hitCells.leftOf(slot);
    const right = this.hitCells.rightOf(slot);
    const midX  = (left + right) * 0.5;
    const position: GroupDropPosition = clientX < midX ? 'before' : 'after';

    return {
      valid:      true,
      targetId:   this.hitCellIds[slot] ?? '',
      position,
      // indicatorX is relative to the grid's left edge
      indicatorX: (position === 'before' ? left : right) - this.gridRect.left,
    };
  }

  /**
   * Reposition the drop-indicator line, writing only when it actually moves.
   *
   * @param target - Resolved drop target, or `null` to hide the indicator.
   */
  private updateIndicator(target: GroupDropTarget | null): void {
    if (!this.indicatorEl) return;

    const visible = !!target?.valid;
    if (this.indicatorVisible !== visible) {
      this.indicatorVisible = visible;
      this.indicatorEl.style.display = visible ? 'block' : 'none';
    }
    if (!visible || !target) return;

    if (this.lastIndicatorX !== target.indicatorX) {
      this.lastIndicatorX = target.indicatorX;
      this.indicatorEl.style.left = `${target.indicatorX}px`;
    }
  }

  /**
   * `true` when the cursor is more than 40 px outside the grid boundary.
   *
   * Tested against the bounds captured at drag start rather than a fresh rect
   * read per pointer event.
   */
  private isOutsideGrid(clientX: number, clientY: number): boolean {
    const rect = this.gridRect;
    if (!rect) return false;
    const margin = 40;
    return clientX < rect.left   - margin
        || clientX > rect.right  + margin
        || clientY < rect.top    - margin
        || clientY > rect.bottom + margin;
  }

  /** `true` when the cursor is over the row-grouping bar (bounds cached at drag start). */
  private isOverGroupingBar(clientX: number, clientY: number): boolean {
    const rect = this.groupBarRect;
    if (!rect) return false;
    return clientX >= rect.left && clientX <= rect.right
        && clientY >= rect.top  && clientY <= rect.bottom;
  }

  /**
   * Return the ID of the node immediately after `nodeId` among its siblings.
   * Returns `null` when `nodeId` is the last sibling or is not found.
   */
  private nextSiblingId(nodeId: string): string | null {
    const parent = this.groupModel.getParent(nodeId);
    const list   = parent ? parent.children : (this.groupModel as any).rootNodes as [];
    const idx    = (list as Array<{ nodeType: string; groupId?: string; colDef?: { colId: string } }>)
      .findIndex((n) => (n.nodeType === ColumnGroupNodeType.GROUP ? n.groupId : n.colDef?.colId) === nodeId);
    if (idx === -1 || idx >= (list as []).length - 1) return null;
    const next = (list as Array<{ nodeType: string; groupId?: string; colDef?: { colId: string } }>)[idx + 1];
    return next.nodeType === ColumnGroupNodeType.GROUP ? (next.groupId ?? null) : (next.colDef?.colId ?? null);
  }

  // ── Public: leaf clone / extract API ────────────────────────────────────

  /**
   * Extract a leaf from its parent group into a solo clone group WITHOUT
   * reordering `store.columns` via `getAllLeaves()`.
   *
   * Use this when the column has already been repositioned by `moveColumn` or
   * `moveAndPin` — the store order is correct; only the group tree and header
   * need to be updated.
   *
   * The solo group is repositioned to be immediately before `insertBeforeId` in
   * the root node list so that a subsequent `getAllLeaves()` tree sync (triggered
   * by the `-1` sentinel) produces the same order as the flat store.
   *
   * @param colId          - The `colId` of the leaf to extract.
   * @param insertBeforeId - Root-level sibling node ID to insert the solo group
   *   before.  Pass `null` to append at the end of the root list.
   */
  extractLeafToSoloGroup(colId: string, insertBeforeId: string | null): void {
    const parent = this.groupModel.getParent(colId);
    if (!parent) return;
    const soloId = this.groupModel.createSoloGroupForLeaf(colId);
    if (!soloId) return;
    // Reposition so that tree order matches the intended column order
    this.groupModel.moveGroup(soloId, null, insertBeforeId);
    // Full rebuild + store sync via the standard -1 sentinel
    this.triggerRebuild();
  }

  /**
   * Called by `HeaderRenderer.onGlobalMouseUp` when a leaf column that belongs
   * to a group is dropped onto a different group's header cell.
   *
   * **Merge-back**: if the leaf is currently in a solo-clone group whose
   * `originalParentGroupId` matches `targetGroupId`, the clone is dissolved and
   * the leaf is returned to its original group.
   *
   * **Clone**: otherwise a new solo-clone wrapper group (same header as the
   * leaf's current parent) is created and positioned next to the target group.
   *
   * @param colId         - The `colId` of the dragged leaf column.
   * @param targetGroupId - The group header the leaf was dropped on.
   */
  createLeafClone(colId: string, targetGroupId: string): void {
    const parentGroup = this.groupModel.getParent(colId);
    if (!parentGroup) return; // standalone leaf — nothing to clone

    // ── Merge-back: solo clone dropped on its original parent ───────────────
    if (parentGroup.isSoloGroup && parentGroup.originalParentGroupId === targetGroupId) {
      this.groupModel.dissolveGroupIfSolo(parentGroup.groupId, targetGroupId, null);
      this.columnModel.setColumnVisible(colId, true);
      this.triggerRebuild();
      return;
    }

    // ── Same parent → no-op ─────────────────────────────────────────────────
    if (parentGroup.groupId === targetGroupId) return;

    // ── Clone: extract leaf into a solo wrapper group ───────────────────────
    const soloGroupId = this.groupModel.createSoloGroupForLeaf(colId);
    if (!soloGroupId) return;

    // Position the new solo group next to (before) the target group
    const targetParent = this.groupModel.getParent(targetGroupId);
    this.groupModel.moveGroup(soloGroupId, targetParent?.groupId ?? null, targetGroupId);

    this.triggerRebuild();
  }

  /** Emit an event that tells the grid renderer to do a full header rebuild. */
  triggerRebuild(): void {
    this.eventBus.emit(GridEventType.COLUMN_MOVED, {
      colDef:    null,
      fromIndex: -1,
      toIndex:   -1,
    });
  }
}
