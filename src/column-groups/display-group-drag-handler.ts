import type { DisplayGroupNode } from './display-group.types';
import { createDiv } from '../renderer/dom-utils';

/**
 * Fired by {@link DisplayGroupDragHandler} when the user drops a group at a
 * new position.
 *
 * @param logicalGroupId    - The logical group being moved.
 * @param sourcePanel       - The panel the drag originated from.
 * @param targetPanel       - The panel the group is dropped into.
 * @param insertBeforeColId - First leaf column to the right of the drop target.
 *   `null` means append at the end of the target panel section.
 */
export type GroupMovedCallback = (
  logicalGroupId:   string,
  sourcePanel:      'left' | null | 'right',
  targetPanel:      'left' | null | 'right',
  insertBeforeColId: string | null,
) => void;

/**
 * Callbacks used for real-time (AG Grid-style) group tree preview during drag.
 *
 * When provided the drag handler uses a live-rebuild path instead of CSS
 * transforms: on every slot change the column order is updated in the store so
 * the header re-renders with the group in its new position before the user drops.
 */
export interface GroupPreviewCallbacks {
  /** Called once when the drag crosses the activation threshold. */
  onPreviewStart: () => void;
  /**
   * Called on every slot change during the drag.
   * The engine applies the move from the original snapshot so the header
   * rebuilds with the group at the new position.
   */
  onPreviewMove: GroupMovedCallback;
  /**
   * Called on mouseup to commit the final preview position.
   * The store already reflects the correct order — this just clears the snapshot.
   */
  onPreviewConfirm: () => void;
}

/**
 * A captured root-level slot used for CSS-transform visual computation.
 *
 * Slots come in two flavours:
 * - **Group cell** (`groupId` non-empty, `colId` empty): a `.pg-th--group` element
 *   from the depth-0 group header row.
 * - **Flat-column cell** (`groupId` empty, `colId` non-empty): a `.pg-th--depth-filler`
 *   element from the depth-0 group row for a column that belongs to no group.
 *   Its `data-col-id` attribute lets the CSS-transform rules shift the corresponding
 *   leaf header cell and body cells in perfect sync.
 */
interface CapturedCell {
  /** The depth-0 group-header element or depth-0 filler element. */
  readonly el:      HTMLElement;
  /** Bounding rect at drag-start (or panel-switch time). */
  readonly rect:    DOMRect;
  /** Non-empty for group cells; empty string for flat-column filler cells. */
  readonly groupId: string;
  /** Non-empty for flat-column filler cells (`data-col-id`); empty for group cells. */
  readonly colId:   string;
}

/**
 * Handles atomic column-group drag and drop.
 *
 * ### Rules
 * - Only **group header cells** (`.pg-th--group`) can be dragged.
 * - Group children cannot escape their group during drag.
 * - Drop targets are root-level positions only (before/after other groups or
 *   flat columns).  Dropping inside another group is not supported.
 * - Moving across panels changes the `pinned` property of all group leaves.
 *
 * ### Visual feedback — two modes
 * **Live preview** (when `previewCallbacks` is provided):
 * The column order is updated in the store on every slot change so the header
 * re-renders in real time — identical to AG Grid behaviour.  CSS transforms are
 * not used; the rebuilt DOM IS the visual feedback.
 *
 * **CSS-transform** (legacy fallback):
 * `translateX` rules are injected via a `<style>` tag to slide cells without
 * touching the store.  The final move is committed on mouseup.
 *
 * ### Drag activation threshold
 * A drag is not activated until the pointer moves **5 px** — preventing
 * accidental drags during collapse-toggle clicks.
 */
export class DisplayGroupDragHandler {
  private _didJustDrag  = false;
  private isDragging    = false;
  private dragGroupId:  string | null               = null;
  private sourcePanel:  'left' | null | 'right'     = null;
  private ghostEl:      HTMLElement | null           = null;
  private indicatorEl:  HTMLElement | null           = null;
  private dragStyleEl:  HTMLStyleElement | null      = null;
  private capturedCells: CapturedCell[]              = [];
  private dragSourceIdx = -1;
  /** Last slot key seen in live-preview mode — `"<panel>:<insertBeforeColId|end>"`. */
  private lastSlotKey   = '';
  private startX = 0;
  private startY = 0;
  private removeMoveUp: (() => void) | null = null;

  /**
   * @param gridElGetter    - Returns the root `.pg-grid` element (may be null before mount).
   * @param onGroupMoved    - Committed on mouseup; receives the final group position.
   * @param previewCallbacks - When provided, switches to the live-rebuild path (store mutations
   *   on every slot change, same as AG Grid's live column reorder).  When omitted, the handler
   *   uses CSS transforms instead — smoother and without flicker.
   * @param leavesFor       - Returns the leaf column IDs for a logical group.  Used by the
   *   CSS-transform path so that leaf header cells AND body cells animate in sync with the
   *   group header when the drag slot changes.
   */
  constructor(
    private readonly gridElGetter: () => HTMLElement | null,
    private readonly onGroupMoved: GroupMovedCallback,
    private readonly previewCallbacks?: GroupPreviewCallbacks,
    private readonly leavesFor?: (groupId: string) => readonly string[],
  ) {}

  // ── Public ────────────────────────────────────────────────────────────────

  /**
   * Called from `DisplayGroupHeaderBuilder.onGroupHeaderMouseDown` for each
   * newly built group header cell.  Wires a threshold-based drag using the
   * `mousedown` event already delivered by the builder.
   *
   * @param e    - The `mousedown` event from the group header cell.
   * @param node - The display group node this cell represents.
   * @param el   - The DOM element of the group header cell.
   */
  onHeaderMouseDown(e: MouseEvent, node: DisplayGroupNode, el: HTMLElement): void {
    if (e.button !== 0) return;

    this.startX       = e.clientX;
    this.startY       = e.clientY;
    this.dragGroupId  = node.logicalGroupId;
    this._didJustDrag = false;
    this.isDragging   = false;
    this.sourcePanel  = this.detectPanelFromElement(el);

    const onMove = (ev: MouseEvent): void => {
      if (!this.isDragging) {
        const dx = Math.abs(ev.clientX - this.startX);
        const dy = Math.abs(ev.clientY - this.startY);
        if (dx < 5 && dy < 5) return;
        this.isDragging = true;
        this.activateDrag(ev, node);
      }
      if (this.isDragging) this.onMouseMove(ev);
    };

    const onUp = (ev: MouseEvent): void => {
      this.removeMoveUp?.();
      this.removeMoveUp = null;
      if (this.isDragging) this.onMouseUp(ev);
      this.isDragging = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    this.removeMoveUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
  }

  /**
   * `true` for ~200 ms after a drag completes.
   * Used by the header builder to suppress the click event fired after mouseup.
   */
  get didJustDrag(): boolean { return this._didJustDrag; }

  /**
   * `true` while a group header drag is currently in progress.
   * Exposed so the store-watcher in `GridRenderer` can skip the full header
   * destroy / rebuild cycle during live-preview group drag, preventing flicker.
   */
  get isDraggingGroup(): boolean { return this.isDragging; }

  /**
   * Tear down all event listeners and remove any remaining drag DOM artifacts.
   * Must be called when the grid is destroyed or when the header is rebuilt.
   */
  destroy(): void {
    this.removeMoveUp?.();
    this.removeMoveUp = null;
    this.cleanupDrag();
  }

  // ── Private: drag lifecycle ───────────────────────────────────────────────

  /**
   * Activate the drag once the movement threshold is exceeded.
   * Creates the ghost chip, drop indicator, and style element.
   *
   * Adds `pg-grid--group-dragging` before live preview updates begin so the
   * renderer can suppress normal transition effects while column order is being
   * updated repeatedly under the pointer.
   */
  private activateDrag(e: MouseEvent, node: DisplayGroupNode): void {
    const gridEl = this.gridElGetter();
    if (!gridEl) return;
    gridEl.classList.add('pg-grid--group-dragging');

    // Ghost chip — follows the cursor in both modes
    this.ghostEl = createDiv('pg-col-drag-ghost');
    this.ghostEl.textContent  = node.header;
    this.ghostEl.style.left   = `${e.clientX + 12}px`;
    this.ghostEl.style.top    = `${e.clientY - 14}px`;
    document.body.appendChild(this.ghostEl);

    // Drop indicator (vertical line) — used in both modes
    this.indicatorEl = createDiv('pg-group-drop-indicator');
    document.body.appendChild(this.indicatorEl);

    if (this.previewCallbacks) {
      // Live-rebuild mode: no CSS transforms needed — tell engine to snapshot
      this.lastSlotKey = '';
      this.previewCallbacks.onPreviewStart();
    } else {
      // CSS-transform mode: inject style element + capture cell rects
      this.dragStyleEl = document.createElement('style');
      this.dragStyleEl.setAttribute('data-pg-group-drag', '');
      document.head.appendChild(this.dragStyleEl);

      this.capturePanelCells(gridEl, this.sourcePanel);
      this.dragSourceIdx = this.capturedCells.findIndex(
        (c) => c.groupId === node.logicalGroupId,
      );
      if (this.dragSourceIdx === -1) this.dragSourceIdx = 0;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.ghostEl) return;
    this._didJustDrag = true;

    // Track ghost chip
    this.ghostEl.style.left = `${e.clientX + 12}px`;
    this.ghostEl.style.top  = `${e.clientY - 14}px`;

    const gridEl = this.gridElGetter();
    if (!gridEl) return;

    const targetPanel = this.detectPanelAtPoint(e.clientX, e.clientY, gridEl);

    if (this.previewCallbacks) {
      // ── Live-rebuild path ────────────────────────────────────────────────
      // Read insert position from the current (possibly just-rebuilt) DOM.
      const insertBeforeColId = this.findInsertBeforeColId(e, targetPanel, gridEl);
      const slotKey = `${targetPanel ?? 'c'}:${insertBeforeColId ?? 'end'}`;

      // Only trigger a store update + rebuild when the slot actually changes.
      if (slotKey !== this.lastSlotKey) {
        this.lastSlotKey = slotKey;
        this.previewCallbacks.onPreviewMove(
          this.dragGroupId!,
          this.sourcePanel,
          targetPanel,
          insertBeforeColId,
        );
      }

      // Position indicator using the live DOM (reads rebuilt cells directly).
      this.updateIndicatorFromColId(insertBeforeColId, targetPanel, gridEl);
    } else {
      // ── CSS-transform path (legacy) ──────────────────────────────────────
      // Re-capture when the cursor moves to a different panel.
      if (targetPanel !== this.sourcePanel) {
        this.capturePanelCells(gridEl, targetPanel);
        this.dragSourceIdx = -1;
      }

      const effectiveIdx = this.findEffectiveSlot(e.clientX);
      this.applyTransforms(effectiveIdx, gridEl);
      this.updateIndicator(effectiveIdx);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.previewCallbacks) {
      // Live-rebuild path: the store already reflects the final column order from
      // the last onPreviewMove call.  Just confirm (clear snapshot) and clean up.
      this.previewCallbacks.onPreviewConfirm();
      this.cleanupDrag();
      this._didJustDrag = true;
      setTimeout(() => { this._didJustDrag = false; }, 200);
      return;
    }

    // CSS-transform path: commit the final move now.
    const gridEl = this.gridElGetter();
    if (!gridEl || !this.dragGroupId) {
      this.cleanupDrag();
      return;
    }

    const targetPanel       = this.detectPanelAtPoint(e.clientX, e.clientY, gridEl);
    const insertBeforeColId = this.findInsertBeforeColId(e, targetPanel, gridEl);
    const srcPanel          = this.sourcePanel;
    const groupId           = this.dragGroupId;

    this.cleanupDrag();

    this.onGroupMoved(groupId, srcPanel, targetPanel, insertBeforeColId);

    // Suppress residual click
    this._didJustDrag = true;
    setTimeout(() => { this._didJustDrag = false; }, 200);
  }

  // ── Private: drop target ─────────────────────────────────────────────────

  /**
   * Find the leaf column ID that the group should be inserted before.
   * Inspects the leaf header row in the target panel, finding the first cell
   * whose horizontal midpoint is to the right of the cursor.
   *
   * @param e           - Current cursor position.
   * @param targetPanel - Panel the drop is over.
   * @param gridEl      - Root `.pg-grid` element.
   */
  private findInsertBeforeColId(
    e:           MouseEvent,
    targetPanel: 'left' | null | 'right',
    gridEl:      HTMLElement,
  ): string | null {
    const panelEl = this.getPanelEl(targetPanel, gridEl);
    if (!panelEl) return null;

    const leafRow = panelEl.querySelector<HTMLElement>('.pg-header-row');
    if (!leafRow) return null;

    const cells = Array.from(leafRow.querySelectorAll<HTMLElement>('.pg-th[data-col-id]'));
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      if (e.clientX < rect.left + rect.width / 2) {
        return cell.getAttribute('data-col-id');
      }
    }

    return null;
  }

  // ── Private: live transforms ──────────────────────────────────────────────

  /**
   * Capture all root-level drag slots from the depth-0 group header row.
   *
   * Slots include both:
   * - **Group cells** (`.pg-th--group`): represent a whole logical group.
   * - **Flat-column filler cells** (`.pg-th--depth-filler`): represent a single
   *   ungrouped column sitting between/around groups.  Including these as slots
   *   lets the drag handler detect when the cursor crosses a flat-column boundary
   *   and animate the flat column (header + body cells) out of the way in real
   *   time — matching AG Grid's behaviour for mixed grouped/flat layouts.
   *
   * Cells are sorted by their `style.left` value because absolutely-positioned
   * elements may appear in arbitrary DOM insertion order.
   *
   * Falls back to the leaf header row when no group rows exist (rare — only when
   * the grid transitions from grouped to flat while a drag is in progress).
   *
   * @param gridEl - Root `.pg-grid` element.
   * @param panel  - Panel to inspect.
   */
  private capturePanelCells(
    gridEl: HTMLElement,
    panel:  'left' | null | 'right',
  ): void {
    this.capturedCells = [];
    const panelEl = this.getPanelEl(panel, gridEl);
    if (!panelEl) return;

    // Preferred: depth-0 group header row — capture group cells AND flat-column
    // filler cells so that every root-level slot is a drag obstacle.
    const depth0Row = panelEl.querySelector<HTMLElement>('.pg-header-group-row--depth-0');
    if (depth0Row) {
      const slots = Array.from(
        depth0Row.querySelectorAll<HTMLElement>('.pg-th--group, .pg-th--depth-filler'),
      );
      // Absolute positioning may put elements out of DOM order — sort by left.
      slots.sort((a, b) => parseFloat(a.style.left || '0') - parseFloat(b.style.left || '0'));
      for (const el of slots) {
        this.capturedCells.push({
          el,
          rect:    el.getBoundingClientRect(),
          groupId: el.getAttribute('data-group-id') ?? '',
          colId:   el.getAttribute('data-col-id')   ?? '',
        });
      }
      if (this.capturedCells.length > 0) return;
    }

    // Fallback: leaf header row (no group rows present).
    const leafRow = panelEl.querySelector<HTMLElement>('.pg-header-row');
    if (leafRow) {
      const cells = Array.from(leafRow.querySelectorAll<HTMLElement>('.pg-th[data-col-id]'));
      for (const el of cells) {
        this.capturedCells.push({
          el,
          rect:    el.getBoundingClientRect(),
          groupId: '',
          colId:   el.getAttribute('data-col-id') ?? '',
        });
      }
    }
  }

  /**
   * Find the effective drop-slot index from the current cursor x position.
   * Returns `capturedCells.length` to indicate "append at end".
   *
   * @param cursorX - Cursor x position in client coordinates.
   */
  private findEffectiveSlot(cursorX: number): number {
    for (let i = 0; i < this.capturedCells.length; i++) {
      const { rect } = this.capturedCells[i];
      if (cursorX < rect.left + rect.width / 2) return i;
    }
    return this.capturedCells.length;
  }

  /**
   * Apply `--pg-drag-x` and `--pg-drag-transition` rules via the injected `<style>`
   * element to give a live preview of where the dragged group will land.
   *
   * - The **dragged group** and all of its leaf columns snap instantly
   *   (`--pg-drag-transition: 0ms`) so they track the slot-change in a single frame.
   * - **Displaced groups** and their leaf columns animate smoothly with the default
   *   transition duration (180 ms) — matching AG Grid's animated reorder behaviour.
   * - Body cells (`pg-cell[data-col-id]`) receive the same offset as their header
   *   counterpart, so the data rows shift in perfect sync with the header.
   *
   * Using the `--pg-drag-transition` CSS variable avoids specificity conflicts:
   * the base CSS in `base-styles.ts` reads the variable and provides the default,
   * while the per-cell override only needs to set the variable.
   *
   * @param effectiveIdx - Drop-slot index from {@link findEffectiveSlot}.
   * @param gridEl       - Root `.pg-grid` element (used to scope CSS selectors).
   */
  private applyTransforms(effectiveIdx: number, gridEl: HTMLElement): void {
    if (!this.dragStyleEl || this.capturedCells.length === 0) return;

    const src = this.dragSourceIdx;
    // No visual shift needed when the drag returns to its original position.
    if (src === -1 || effectiveIdx === src || effectiveIdx === src + 1) {
      this.dragStyleEl.textContent = '';
      return;
    }

    const gridId = gridEl.getAttribute('data-photon-grid-id') ?? '';
    // Combined selector: grid element must have BOTH the data-attribute AND the class.
    // Specificity 0,3,0 — wins over the 0,2,0 base rules for non-dragged cells.
    const ds = gridId
      ? `[data-photon-grid-id="${gridId}"].pg-grid--group-dragging `
      : '.pg-grid--group-dragging ';

    const draggedCell  = this.capturedCells[src];
    const draggedWidth = draggedCell?.rect.width ?? 0;
    const dragGroupId  = this.dragGroupId ?? '';

    // Where the dragged cell should visually move to.
    const targetCell = effectiveIdx < this.capturedCells.length
      ? this.capturedCells[effectiveIdx]
      : this.capturedCells[this.capturedCells.length - 1];

    const srcOffset = effectiveIdx > src
      ? targetCell.rect.right - draggedCell.rect.right
      : targetCell.rect.left  - draggedCell.rect.left;

    // Dragged group header: snap instantly, elevate above neighbours.
    let css = `${ds}[data-group-id="${dragGroupId}"] { --pg-drag-x: ${srcOffset}px; --pg-drag-transition: 0ms; z-index: 10; position: relative; }\n`;

    // Dragged group leaf columns (header + body cells): also snap instantly.
    if (this.leavesFor) {
      for (const colId of this.leavesFor(dragGroupId)) {
        css += `${ds}[data-col-id="${colId}"] { --pg-drag-x: ${srcOffset}px; --pg-drag-transition: 0ms; }\n`;
      }
    }

    // Displaced groups and their leaves: animate smoothly (default --pg-drag-transition).
    for (let i = 0; i < this.capturedCells.length; i++) {
      if (i === src) continue;
      const cell   = this.capturedCells[i];
      const cellId = cell.groupId || cell.colId;
      let offset   = 0;
      if (effectiveIdx > src && i > src && i < effectiveIdx) {
        offset = -draggedWidth;
      } else if (effectiveIdx <= src && i >= effectiveIdx && i < src) {
        offset = draggedWidth;
      }
      if (offset === 0 || !cellId) continue;
      css += cell.groupId
        ? `${ds}[data-group-id="${cellId}"] { --pg-drag-x: ${offset}px; }\n`
        : `${ds}[data-col-id="${cellId}"] { --pg-drag-x: ${offset}px; }\n`;

      // Leaf columns belonging to this displaced group (header + body cells).
      if (cell.groupId && this.leavesFor) {
        for (const colId of this.leavesFor(cell.groupId)) {
          css += `${ds}[data-col-id="${colId}"] { --pg-drag-x: ${offset}px; }\n`;
        }
      }
    }

    this.dragStyleEl.textContent = css;
  }

  /**
   * Reposition the drop-indicator line to show the insertion point.
   *
   * @param effectiveIdx - Slot index derived from cursor position.
   */
  private updateIndicator(effectiveIdx: number): void {
    if (!this.indicatorEl) return;

    const cells = this.capturedCells;
    if (cells.length === 0) {
      this.indicatorEl.style.display = 'none';
      return;
    }

    let left: number;
    let top: number;
    let height: number;

    if (effectiveIdx < cells.length) {
      const rect = cells[effectiveIdx].rect;
      left   = rect.left;
      top    = rect.top;
      height = rect.height;
    } else {
      const rect = cells[cells.length - 1].rect;
      left   = rect.right;
      top    = rect.top;
      height = rect.height;
    }

    this.indicatorEl.style.left    = `${left}px`;
    this.indicatorEl.style.top     = `${top}px`;
    this.indicatorEl.style.height  = `${height}px`;
    this.indicatorEl.style.display = 'block';
  }

  /**
   * Position the drop-indicator line by looking up the target cell directly in
   * the live DOM.  Used in live-preview mode where captured cell rects are stale
   * after each header rebuild.
   *
   * @param colId    - The `data-col-id` of the cell to insert before, or `null`
   *                   to place the indicator at the end of the panel.
   * @param panel    - The panel the drop is targeting.
   * @param gridEl   - Root `.pg-grid` element.
   */
  private updateIndicatorFromColId(
    colId:   string | null,
    panel:   'left' | null | 'right',
    gridEl:  HTMLElement,
  ): void {
    if (!this.indicatorEl) return;

    const panelEl = this.getPanelEl(panel, gridEl);
    if (!panelEl) { this.indicatorEl.style.display = 'none'; return; }

    const leafRow = panelEl.querySelector<HTMLElement>('.pg-header-row');
    if (!leafRow) { this.indicatorEl.style.display = 'none'; return; }

    let left: number;
    let top: number;
    let height: number;

    if (colId) {
      const cell = leafRow.querySelector<HTMLElement>(`.pg-th[data-col-id="${colId}"]`);
      if (!cell) { this.indicatorEl.style.display = 'none'; return; }
      const rect = cell.getBoundingClientRect();
      left   = rect.left;
      top    = rect.top;
      height = rect.height;
    } else {
      // Append at end: right edge of the last leaf cell
      const cells = Array.from(leafRow.querySelectorAll<HTMLElement>('.pg-th[data-col-id]'));
      if (cells.length === 0) { this.indicatorEl.style.display = 'none'; return; }
      const rect = cells[cells.length - 1].getBoundingClientRect();
      left   = rect.right;
      top    = rect.top;
      height = rect.height;
    }

    this.indicatorEl.style.left    = `${left}px`;
    this.indicatorEl.style.top     = `${top}px`;
    this.indicatorEl.style.height  = `${height}px`;
    this.indicatorEl.style.display = 'block';
  }

  // ── Private: panel helpers ────────────────────────────────────────────────

  private detectPanelFromElement(el: HTMLElement): 'left' | null | 'right' {
    if (el.closest('.pg-panel--left'))  return 'left';
    if (el.closest('.pg-panel--right')) return 'right';
    return null;
  }

  private detectPanelAtPoint(x: number, y: number, gridEl: HTMLElement): 'left' | null | 'right' {
    const check = (cls: string, pin: 'left' | 'right'): boolean => {
      const el = gridEl.querySelector<HTMLElement>(cls);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    if (check('.pg-panel--left',  'left'))  return 'left';
    if (check('.pg-panel--right', 'right')) return 'right';
    return null;
  }

  private getPanelEl(panel: 'left' | null | 'right', gridEl: HTMLElement): HTMLElement | null {
    if (panel === 'left')  return gridEl.querySelector('.pg-panel--left');
    if (panel === 'right') return gridEl.querySelector('.pg-panel--right');
    // Center panel: first panel that is neither left nor right
    return (
      gridEl.querySelector('.pg-panel--center') ??
      gridEl.querySelector('.pg-panel:not(.pg-panel--left):not(.pg-panel--right)')
    );
  }

  private cleanupDrag(): void {
    if (this.dragStyleEl) {
      this.dragStyleEl.textContent = '';
      this.dragStyleEl.remove();
      this.dragStyleEl = null;
    }
    this.ghostEl?.remove();
    this.ghostEl = null;
    this.indicatorEl?.remove();
    this.indicatorEl   = null;
    this.capturedCells = [];
    this.dragSourceIdx = -1;
    this.dragGroupId   = null;
    this.sourcePanel   = null;
    this.isDragging    = false;
    this.lastSlotKey   = '';
    this.gridElGetter()?.classList.remove('pg-grid--group-dragging', 'pg-grid--drag-preview-sync');
  }
}
