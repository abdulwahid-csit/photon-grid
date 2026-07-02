import type { CellRange } from '../types/grid.types';
import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import { isCellInRanges, normalizeRange, type NormalizedRange } from './selection-range';
import { ClipboardEngine } from '../engines/clipboard/clipboard-engine';
import { UndoRedoEngine } from '../engines/undo-redo/undo-redo-engine';
import type { CellChange } from '../engines/undo-redo/undo-redo-engine';
import { activeGridRegistry } from './active-grid-registry';

export class CellSelectionEngine {
  private _isSelecting = false;
  private anchorCell: { rowIndex: number; colIndex: number } | null = null;
  private bodyPanels: HTMLElement[] = [];
  private contextMenuEl: HTMLElement | null = null;
  private chartOpenCallback: ((type: string) => void) | null = null;
  /**
   * Optional callback invoked when the user presses Enter on a focused (non-editing) cell.
   * Return `true` to absorb the event (editing started); `false` to fall through to
   * the default down-navigation behavior.
   */
  private enterEditHandler: ((rowIndex: number, colIndex: number) => boolean) | null = null;
  /**
   * Optional callback invoked after every active-cell change so the grid body
   * can scroll the newly active cell into view (AG Grid-style auto-scroll).
   */
  private scrollToCellCallback: ((rowIndex: number, colIndex: number) => void) | null = null;

  /**
   * Returns the number of rows that fit in the visible body viewport.
   * Used by PageUp / PageDown to determine how far to jump.
   */
  private getViewportRowCountCallback: (() => number) | null = null;

  /**
   * Optional callback invoked after a data mutation (fill, cut, paste, undo/redo).
   * When `nodeIds` is provided the renderer evicts only those rows from its cache
   * so custom cell renderers in untouched rows are NOT re-executed.
   * Omitting `nodeIds` falls back to a full cache clear (safe but unoptimised).
   */
  private dataChangedCallback: ((nodeIds?: Set<string>) => void) | null = null;

  private boundKeydown: (e: KeyboardEvent) => void;
  private boundHideCtx: (e: MouseEvent) => void;

  // ─── Fill handle state ────────────────────────────────────────────────────

  /** DOM element for the interactive fill handle corner square. */
  private fillHandleEl: HTMLElement | null = null;
  /** The `.pg-cell` element that currently hosts the fill handle as a child. */
  private fillHandleParentCell: HTMLElement | null = null;
  /** `true` while the user is dragging the fill handle. */
  private isFillDragging = false;
  /** Normalised source range captured at the start of a fill drag. */
  private fillSourceRange: NormalizedRange | null = null;
  /** DOM cells currently showing the dashed fill-preview overlay. */
  private fillPreviewCells: HTMLElement[] = [];
  /** Locked fill direction; null until the user moves far enough in one axis. */
  private fillDirection: 'down' | 'up' | 'right' | 'left' | null = null;
  /** Target row index for up/down fills; null when direction is horizontal. */
  private fillTargetRow: number | null = null;
  /** Target column index for left/right fills; null when direction is vertical. */
  private fillTargetCol: number | null = null;
  /** Callback invoked on every fill-drag mousemove to drive the edge auto-scroller. */
  private fillDragScrollCallback: ((clientX: number, clientY: number) => void) | null = null;
  /** Callback invoked when the fill drag ends to stop the edge auto-scroller. */
  private fillDragEndCallback: (() => void) | null = null;
  /**
   * Returns the bounding rect of the grid's scroll viewport.  Used by
   * `processFillPosition` to clamp the hit-test coordinates when the cursor
   * has moved outside the body area so edge cells are always reachable.
   */
  private dragViewportRectFn: (() => DOMRect | null) | null = null;
  private boundFillMouseMove: (e: MouseEvent) => void;
  private boundFillMouseUp: () => void;

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
    private clipboardEngine: ClipboardEngine,
    /** Optional undo/redo engine. When provided, cut, paste, and edit operations are recorded. */
    private undoRedoEngine?: UndoRedoEngine,
  ) {
    this.boundKeydown = this.onKeydown.bind(this);
    this.boundHideCtx = () => this.hideContextMenu();
    this.boundFillMouseMove = this.onFillMouseMove.bind(this);
    this.boundFillMouseUp = this.onFillMouseUp.bind(this);
  }

  get isSelecting(): boolean { return this._isSelecting; }

  attach(containerEl: HTMLElement): void {
    // containerEl kept for signature compat — no canvas attached
    void containerEl;
    document.addEventListener('keydown', this.boundKeydown);
    this.buildContextMenu();
  }

  setBodyPanels(panels: HTMLElement[]): void {
    this.bodyPanels = panels.filter(Boolean) as HTMLElement[];
  }

  /**
   * Register a callback that is invoked when the user presses Enter on a focused
   * cell that is not in edit mode.  Return `true` to absorb the event (editing
   * started); return `false` to fall through to the default down-navigation.
   */
  setEnterEditHandler(fn: (rowIndex: number, colIndex: number) => boolean): void {
    this.enterEditHandler = fn;
  }

  /**
   * Register a callback invoked after every active-cell change so the grid body
   * can scroll the newly active cell into view (AG Grid-style auto-scroll).
   * The renderer wires this in `buildLayout`.
   *
   * @param fn - Called with the new `rowIndex` and `colIndex` after each navigation.
   */
  setScrollToCellCallback(fn: (rowIndex: number, colIndex: number) => void): void {
    this.scrollToCellCallback = fn;
  }

  /**
   * Registers a callback that returns the number of data rows currently
   * visible in the body viewport.  Used by PageUp / PageDown to compute the
   * jump distance.  Wired by `GridRenderer` via the scroll controller.
   *
   * @param fn - Returns the visible row count (≥ 1).
   */
  setGetViewportRowCountCallback(fn: () => number): void {
    this.getViewportRowCountCallback = fn;
  }

  /**
   * Register a callback invoked after a data mutation (fill, cut, paste, undo/redo).
   * Pass `nodeIds` to evict only the mutated rows from the renderer cache;
   * omit to fall back to a full cache clear.
   *
   * @param fn - Called with an optional set of mutated row node IDs.
   */
  setDataChangedCallback(fn: (nodeIds?: Set<string>) => void): void {
    this.dataChangedCallback = fn;
  }

  /**
   * Registers a callback invoked on every fill-drag `mousemove` with the
   * current cursor coordinates.  Wire this to `AutoScroller.updateMouse` in
   * the grid renderer to enable edge auto-scrolling during fill-handle drags.
   *
   * @param fn - Called with `clientX` and `clientY` of each mousemove event.
   */
  setFillDragScrollCallback(fn: (clientX: number, clientY: number) => void): void {
    this.fillDragScrollCallback = fn;
  }

  /**
   * Registers a callback invoked when the fill drag ends (mouseup).
   * Wire this to `AutoScroller.stop` in the grid renderer so the RAF loop
   * terminates as soon as the user releases the fill handle.
   *
   * @param fn - Called with no arguments when the fill drag terminates.
   */
  setFillDragEndCallback(fn: () => void): void {
    this.fillDragEndCallback = fn;
  }

  /**
   * Registers a callback that returns the bounding rect of the grid's scroll
   * viewport (`bodyWrapEl`).  When set, `processFillPosition` clamps its
   * hit-test coordinates to just inside this rect so edge cells are always
   * found even when the cursor has moved outside the grid boundary.
   *
   * @param fn - Returns the current viewport `DOMRect`, or `null` when unmounted.
   */
  setDragViewportRectCallback(fn: () => DOMRect | null): void {
    this.dragViewportRectFn = fn;
  }

  /**
   * Re-evaluates which cell lies at `(clientX, clientY)` and updates the fill
   * direction and dashed preview accordingly.  Called by the auto-scroller's
   * `onScrolled` callback so the preview stays current after the grid has
   * scrolled under a stationary cursor.
   *
   * No-op when no fill drag is currently active.
   *
   * @param clientX - Viewport X coordinate of the drag cursor.
   * @param clientY - Viewport Y coordinate of the drag cursor.
   */
  updateFillPosition(clientX: number, clientY: number): void {
    this.processFillPosition(clientX, clientY);
  }

  detach(): void {
    document.removeEventListener('keydown', this.boundKeydown);
    document.removeEventListener('mousemove', this.boundFillMouseMove);
    document.removeEventListener('mouseup', this.boundFillMouseUp);
    activeGridRegistry.release(this);
    this.fillHandleParentCell?.classList.remove('pg-cell--has-fill-handle');
    this.fillHandleParentCell = null;
    this.fillHandleEl?.remove();
    this.fillHandleEl = null;
    this.fillDragScrollCallback = null;
    this.fillDragEndCallback    = null;
    this.dragViewportRectFn     = null;
    this.contextMenuEl?.remove();
    this.contextMenuEl = null;
  }

  // ─── Selection API ────────────────────────────────────────────────────────

  startSelection(rowIndex: number, colIndex: number, extend = false): void {
    // Claims this grid as the page's active selection surface, deactivating
    // (clearing) whichever grid held that role before — see active-grid-registry.ts.
    activeGridRegistry.setActive(this);
    if (!extend) {
      this.anchorCell = { rowIndex, colIndex };
      this.store.set('cellRanges', [{
        startRowIndex: rowIndex, endRowIndex: rowIndex,
        startColIndex: colIndex, endColIndex: colIndex,
      }]);
    }
    this._isSelecting = true;
    this.store.set('activeCell', { rowIndex, colIndex });
    this.emitSelectionChanged();
    this.scrollToCellCallback?.(rowIndex, colIndex);
  }

  extendSelection(rowIndex: number, colIndex: number): void {
    if (!this.anchorCell) {
      this.startSelection(rowIndex, colIndex);
      return;
    }
    activeGridRegistry.setActive(this);
    this.store.set('cellRanges', [{
      startRowIndex: this.anchorCell.rowIndex,
      endRowIndex: rowIndex,
      startColIndex: this.anchorCell.colIndex,
      endColIndex: colIndex,
    }]);
    this.store.set('activeCell', { rowIndex, colIndex });
    this.emitSelectionChanged();
    this.scrollToCellCallback?.(rowIndex, colIndex);
  }

  endSelection(): void {
    this._isSelecting = false;
  }

  clearSelection(): void {
    this.anchorCell = null;
    this._isSelecting = false;
    this.store.set('cellRanges', []);
    this.store.set('activeCell', null);
    this.applySelectionClasses();
    this.emitSelectionChanged();
  }

  isCellSelected(rowIndex: number, colIndex: number): boolean {
    return isCellInRanges(rowIndex, colIndex, this.store.get('cellRanges'));
  }

  /**
   * Adds the given cell as a new independent 1×1 range to the selection
   * (Ctrl+Click multi-range).  If the cell is already the sole member of a
   * 1×1 range it is deselected instead (toggle behaviour matching AG Grid).
   *
   * @param rowIndex - Row index of the clicked cell.
   * @param colIndex - Column index of the clicked cell.
   */
  addRangeCell(rowIndex: number, colIndex: number): void {
    activeGridRegistry.setActive(this);
    const existing = this.store.get('cellRanges') as CellRange[];
    const dupeIdx = existing.findIndex(
      (r) =>
        r.startRowIndex === rowIndex && r.endRowIndex   === rowIndex &&
        r.startColIndex === colIndex  && r.endColIndex   === colIndex,
    );
    const ranges: CellRange[] =
      dupeIdx >= 0
        ? existing.filter((_, i) => i !== dupeIdx)
        : [...existing, {
            startRowIndex: rowIndex, endRowIndex: rowIndex,
            startColIndex: colIndex, endColIndex: colIndex,
          }];
    this.anchorCell = { rowIndex, colIndex };
    this.store.set('cellRanges', ranges);
    this.store.set('activeCell', ranges.length > 0 ? { rowIndex, colIndex } : null);
    this.applySelectionClasses();
    this.emitSelectionChanged();
  }

  // ─── CSS-based rendering (replaces canvas) ────────────────────────────────

  /**
   * Applies selection CSS classes to every visible cell DOM element.
   *
   * For multi-range selections (Ctrl+Click) edge classes are unioned across
   * all ranges a cell belongs to, so each range always renders a complete
   * closed border regardless of how many ranges share a cell.
   *
   * After updating classes, repositions the fill handle at the primary
   * range's bottom-right corner.
   */
  applySelectionClasses(): void {
    const ranges   = this.store.get('cellRanges') as CellRange[];
    const activeCell = this.store.get('activeCell') as { rowIndex: number; colIndex: number } | null;
    const hasRanges  = ranges.length > 0;
    // Pre-normalise all ranges once so the inner cell loop is cheap.
    const norms = hasRanges ? ranges.map(normalizeRange) : [];

    for (const panel of this.bodyPanels) {
      for (const el of panel.querySelectorAll<HTMLElement>('.pg-cell[data-row-index][data-col-index]')) {
        const ri = Number(el.getAttribute('data-row-index'));
        const ci = Number(el.getAttribute('data-col-index'));

        const inRange = hasRanges && isCellInRanges(ri, ci, ranges);
        const isActive = !!activeCell && activeCell.rowIndex === ri && activeCell.colIndex === ci;

        el.classList.toggle('pg-cell--in-selection', inRange);
        el.classList.toggle('pg-cell--active-cell', isActive);

        if (inRange) {
          // Union edges from every range that contains this cell so each
          // range always closes cleanly (supports Ctrl+Click multi-ranges).
          let isTop = false, isBottom = false, isLeft = false, isRight = false;
          for (const n of norms) {
            if (
              ri >= n.startRowIndex && ri <= n.endRowIndex &&
              ci >= n.startColIndex && ci <= n.endColIndex
            ) {
              if (ri === n.startRowIndex) isTop    = true;
              if (ri === n.endRowIndex)   isBottom = true;
              if (ci === n.startColIndex) isLeft   = true;
              if (ci === n.endColIndex)   isRight  = true;
            }
          }
          el.classList.toggle('pg-cell--sel-top',    isTop);
          el.classList.toggle('pg-cell--sel-bottom', isBottom);
          el.classList.toggle('pg-cell--sel-left',   isLeft);
          el.classList.toggle('pg-cell--sel-right',  isRight);
        } else {
          el.classList.remove(
            'pg-cell--sel-top', 'pg-cell--sel-bottom',
            'pg-cell--sel-left', 'pg-cell--sel-right',
          );
        }
      }
    }

    this.updateFillHandle();
  }

  /** @deprecated Use `applySelectionClasses` directly. Kept for caller compatibility. */
  renderSelection(_getCellRect: (r: number, c: number) => DOMRect | null): void {
    this.applySelectionClasses();
  }

  // ─── Fill handle ──────────────────────────────────────────────────────────

  /**
   * Creates (once) or repositions the fill handle at the bottom-right corner
   * of the primary selection range.  Hidden during an active fill drag or when
   * there are multiple ranges (Ctrl+Click mode).
   *
   * The element uses `position: fixed` so it always sits above the grid
   * regardless of overflow or scroll state.
   */
  private updateFillHandle(): void {
    if (this.isFillDragging) return;

    const ranges = this.store.get('cellRanges') as CellRange[];
    if (ranges.length !== 1) {
      this.hideFillHandle();
      return;
    }

    const n = normalizeRange(ranges[0]);

    // Locate the bottom-right corner cell across all body panels.
    let cornerCell: HTMLElement | null = null;
    for (const panel of this.bodyPanels) {
      const el = panel.querySelector<HTMLElement>(
        `[data-row-index="${n.endRowIndex}"][data-col-index="${n.endColIndex}"]`,
      );
      if (el) { cornerCell = el; break; }
    }

    if (!cornerCell) {
      this.hideFillHandle();
      return;
    }

    // Create the handle element once.
    if (!this.fillHandleEl) {
      const handle = document.createElement('div');
      handle.className = 'pg-fill-handle';
      handle.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.startFillDrag();
      });
      this.fillHandleEl = handle;
    }

    // Re-parent when the corner cell changed (e.g. virtual scroll rebuilt the row).
    if (this.fillHandleParentCell !== cornerCell) {
      this.fillHandleParentCell?.classList.remove('pg-cell--has-fill-handle');
      this.fillHandleParentCell = cornerCell;
      cornerCell.classList.add('pg-cell--has-fill-handle');
      cornerCell.appendChild(this.fillHandleEl);
    }

    this.fillHandleEl.style.display = '';
  }

  /** Hides the fill handle and clears the overflow-visible class from its host cell. */
  private hideFillHandle(): void {
    if (this.fillHandleEl) this.fillHandleEl.style.display = 'none';
    this.fillHandleParentCell?.classList.remove('pg-cell--has-fill-handle');
    this.fillHandleParentCell = null;
  }

  /**
   * Begins a fill-handle drag operation.  Captures the current selection as
   * the fill source and attaches document-level mouse event listeners.
   */
  private startFillDrag(): void {
    const ranges = this.store.get('cellRanges') as CellRange[];
    if (!ranges.length) return;
    this.fillSourceRange  = normalizeRange(ranges[0]);
    this.isFillDragging   = true;
    this.fillDirection    = null;
    this.fillTargetRow    = null;
    this.fillTargetCol    = null;
    document.addEventListener('mousemove', this.boundFillMouseMove);
    document.addEventListener('mouseup',   this.boundFillMouseUp);
  }

  /**
   * Handles fill-drag `mousemove` by delegating position processing and
   * notifying the auto-scroller callback so edge scrolling can be triggered.
   */
  private onFillMouseMove(e: MouseEvent): void {
    if (!this.isFillDragging || !this.fillSourceRange) return;
    this.processFillPosition(e.clientX, e.clientY);
    this.fillDragScrollCallback?.(e.clientX, e.clientY);
  }

  /**
   * Core fill-drag position logic: resolves the fill direction and target
   * cell from a viewport coordinate pair, then refreshes the dashed preview.
   *
   * Separated from `onFillMouseMove` so it can also be called by the
   * auto-scroller's `onScrolled` callback — keeping the preview accurate
   * after the grid has scrolled under a stationary cursor.
   *
   * @param clientX - Viewport X coordinate of the drag cursor.
   * @param clientY - Viewport Y coordinate of the drag cursor.
   */
  private processFillPosition(clientX: number, clientY: number): void {
    if (!this.isFillDragging || !this.fillSourceRange) return;

    let target  = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    let cellEl  = target?.closest<HTMLElement>('[data-row-index][data-col-index]');

    // When the cursor is outside the grid viewport (negative dist from any edge),
    // `elementFromPoint` hits the page background rather than a cell.  Clamp the
    // coordinates to just inside the viewport boundary so we always resolve to
    // the nearest edge cell — mirroring AG Grid fill-handle behaviour.
    if (!cellEl) {
      const vr = this.dragViewportRectFn?.();
      if (vr) {
        const cx2 = Math.max(vr.left + 1, Math.min(vr.right  - 1, clientX));
        const cy2 = Math.max(vr.top  + 1, Math.min(vr.bottom - 1, clientY));
        const t2  = document.elementFromPoint(cx2, cy2) as HTMLElement | null;
        cellEl    = t2?.closest<HTMLElement>('[data-row-index][data-col-index]');
      }
    }

    if (!cellEl) return;

    const ri = Number(cellEl.getAttribute('data-row-index'));
    const ci = Number(cellEl.getAttribute('data-col-index'));
    if (isNaN(ri) || isNaN(ci)) return;

    const src = this.fillSourceRange;

    // Distance from the edge of the source range along each axis.
    const dRow = ri < src.startRowIndex ? ri - src.startRowIndex
               : ri > src.endRowIndex   ? ri - src.endRowIndex
               : 0;
    const dCol = ci < src.startColIndex ? ci - src.startColIndex
               : ci > src.endColIndex   ? ci - src.endColIndex
               : 0;

    // Lock to the axis with the larger displacement.
    if (Math.abs(dRow) >= Math.abs(dCol)) {
      this.fillDirection  = dRow >= 0 ? 'down' : 'up';
      this.fillTargetRow  = ri;
      this.fillTargetCol  = null;
    } else {
      this.fillDirection  = dCol >= 0 ? 'right' : 'left';
      this.fillTargetRow  = null;
      this.fillTargetCol  = ci;
    }

    this.updateFillPreview();
  }

  /**
   * Applies `pg-cell--fill-preview` and its directional edge classes to
   * cells in the fill target area, replacing any previous preview.
   */
  private updateFillPreview(): void {
    // Clear the previous cycle's preview classes.
    for (const el of this.fillPreviewCells) {
      el.classList.remove(
        'pg-cell--fill-preview',
        'pg-cell--fp-top', 'pg-cell--fp-bottom',
        'pg-cell--fp-left', 'pg-cell--fp-right',
      );
    }
    this.fillPreviewCells = [];

    if (!this.fillSourceRange || !this.fillDirection) return;

    const src = this.fillSourceRange;
    let startRow: number, endRow: number, startCol: number, endCol: number;

    switch (this.fillDirection) {
      case 'down':
        if (this.fillTargetRow === null || this.fillTargetRow <= src.endRowIndex) return;
        startRow = src.endRowIndex + 1; endRow   = this.fillTargetRow;
        startCol = src.startColIndex;   endCol   = src.endColIndex;
        break;
      case 'up':
        if (this.fillTargetRow === null || this.fillTargetRow >= src.startRowIndex) return;
        startRow = this.fillTargetRow;  endRow   = src.startRowIndex - 1;
        startCol = src.startColIndex;   endCol   = src.endColIndex;
        break;
      case 'right':
        if (this.fillTargetCol === null || this.fillTargetCol <= src.endColIndex) return;
        startRow = src.startRowIndex;   endRow   = src.endRowIndex;
        startCol = src.endColIndex + 1; endCol   = this.fillTargetCol;
        break;
      case 'left':
        if (this.fillTargetCol === null || this.fillTargetCol >= src.startColIndex) return;
        startRow = src.startRowIndex;   endRow   = src.endRowIndex;
        startCol = this.fillTargetCol;  endCol   = src.startColIndex - 1;
        break;
      default: return;
    }

    for (const panel of this.bodyPanels) {
      for (const el of panel.querySelectorAll<HTMLElement>('.pg-cell[data-row-index][data-col-index]')) {
        const ri = Number(el.getAttribute('data-row-index'));
        const ci = Number(el.getAttribute('data-col-index'));
        if (ri >= startRow && ri <= endRow && ci >= startCol && ci <= endCol) {
          el.classList.add('pg-cell--fill-preview');
          if (ri === startRow) el.classList.add('pg-cell--fp-top');
          if (ri === endRow)   el.classList.add('pg-cell--fp-bottom');
          if (ci === startCol) el.classList.add('pg-cell--fp-left');
          if (ci === endCol)   el.classList.add('pg-cell--fp-right');
          this.fillPreviewCells.push(el);
        }
      }
    }
  }

  /**
   * Finalises the fill drag: applies data, clears preview classes, and
   * restores the fill handle to its resting position.
   */
  private onFillMouseUp(): void {
    document.removeEventListener('mousemove', this.boundFillMouseMove);
    document.removeEventListener('mouseup',   this.boundFillMouseUp);
    this.fillDragEndCallback?.();

    if (this.fillSourceRange && this.fillDirection) {
      this.applyFill();
    }

    // Remove dashed fill-preview styling.
    for (const el of this.fillPreviewCells) {
      el.classList.remove(
        'pg-cell--fill-preview',
        'pg-cell--fp-top', 'pg-cell--fp-bottom',
        'pg-cell--fp-left', 'pg-cell--fp-right',
      );
    }
    this.fillPreviewCells = [];
    this.isFillDragging   = false;
    this.fillSourceRange  = null;
    this.fillDirection    = null;
    this.fillTargetRow    = null;
    this.fillTargetCol    = null;

    // Re-apply classes so the fill handle is repositioned.
    this.applySelectionClasses();
  }

  /**
   * Copies source cell values into the fill target area.
   *
   * Cycling semantics:
   * - Vertical fill: each column in the fill area copies from the same
   *   column in the source range, cycling rows (`srcH` modulo).
   * - Horizontal fill: each row copies from the same row in the source
   *   range, cycling columns (`srcW` modulo).
   *
   * The operation is recorded in the undo/redo engine and triggers an
   * immediate renderer refresh via `dataChangedCallback`.
   */
  private applyFill(): void {
    if (!this.fillSourceRange || !this.fillDirection) return;

    const src  = this.fillSourceRange;
    const srcH = src.endRowIndex  - src.startRowIndex + 1;
    const srcW = src.endColIndex  - src.startColIndex + 1;

    let fillStartRow: number, fillEndRow: number, fillStartCol: number, fillEndCol: number;

    switch (this.fillDirection) {
      case 'down':
        if (this.fillTargetRow === null || this.fillTargetRow <= src.endRowIndex) return;
        fillStartRow = src.endRowIndex + 1; fillEndRow   = this.fillTargetRow;
        fillStartCol = src.startColIndex;   fillEndCol   = src.endColIndex;
        break;
      case 'up':
        if (this.fillTargetRow === null || this.fillTargetRow >= src.startRowIndex) return;
        fillStartRow = this.fillTargetRow;  fillEndRow   = src.startRowIndex - 1;
        fillStartCol = src.startColIndex;   fillEndCol   = src.endColIndex;
        break;
      case 'right':
        if (this.fillTargetCol === null || this.fillTargetCol <= src.endColIndex) return;
        fillStartRow = src.startRowIndex;   fillEndRow   = src.endRowIndex;
        fillStartCol = src.endColIndex + 1; fillEndCol   = this.fillTargetCol;
        break;
      case 'left':
        if (this.fillTargetCol === null || this.fillTargetCol >= src.startColIndex) return;
        fillStartRow = src.startRowIndex;   fillEndRow   = src.endRowIndex;
        fillStartCol = this.fillTargetCol;  fillEndCol   = src.startColIndex - 1;
        break;
      default: return;
    }

    if (fillStartRow > fillEndRow || fillStartCol > fillEndCol) return;

    const visRows = this.store.get('visibleRows') as RowNode[];
    const columns = this.getVisibleColumns();
    const changes: CellChange[] = [];

    for (let r = fillStartRow; r <= fillEndRow; r++) {
      const row = visRows[r];
      if (!row || row.type !== 'data') continue;

      for (let c = fillStartCol; c <= fillEndCol; c++) {
        const col = columns[c];
        if (!col) continue;

        // Map the fill cell back to its corresponding source cell.
        let srcR: number, srcC: number;
        const dir = this.fillDirection!;
        if (dir === 'down') {
          srcR = src.startRowIndex + ((r - fillStartRow) % srcH);
          srcC = c;
        } else if (dir === 'up') {
          srcR = src.endRowIndex - ((fillEndRow - r) % srcH);
          srcC = c;
        } else if (dir === 'right') {
          srcR = r;
          srcC = src.startColIndex + ((c - fillStartCol) % srcW);
        } else {
          srcR = r;
          srcC = src.endColIndex - ((fillEndCol - c) % srcW);
        }

        const srcRow = visRows[srcR];
        if (!srcRow || srcRow.type !== 'data') continue;

        const srcCol  = columns[srcC];
        if (!srcCol) continue;

        const rawValue = srcRow.data[srcCol.field];
        const srcType  = srcCol.type ?? 'string';
        const dstType  = col.type   ?? 'string';
        // Coerce to the destination column's data type when source and
        // destination types differ.  Same-type copies skip coercion so that
        // exact values are preserved (avoids spurious Date re-creation).
        const newValue = srcType !== dstType
          ? this.coerceToColumnType(rawValue, dstType)
          : rawValue;
        const oldValue = row.data[col.field];

        if (!Object.is(oldValue, newValue)) {
          changes.push({ nodeId: row.nodeId, field: col.field, oldValue, newValue });
          row.data[col.field] = newValue;
        }
      }
    }

    if (changes.length > 0) {
      this.undoRedoEngine?.record({ type: 'paste', changes });
      this.store.set('allRows', [...(this.store.get('allRows') as RowNode[])]);
      this.dataChangedCallback?.(new Set(changes.map((c) => c.nodeId)));

      // Expand the selection to cover both the source range and the fill area
      // so the user can immediately see the full result of the operation.
      const newRange: CellRange = {
        startRowIndex: Math.min(src.startRowIndex, fillStartRow),
        endRowIndex:   Math.max(src.endRowIndex,   fillEndRow),
        startColIndex: Math.min(src.startColIndex, fillStartCol),
        endColIndex:   Math.max(src.endColIndex,   fillEndCol),
      };
      this.anchorCell = { rowIndex: newRange.startRowIndex, colIndex: newRange.startColIndex };
      this.store.set('cellRanges', [newRange]);
      this.store.set('activeCell', { rowIndex: newRange.startRowIndex, colIndex: newRange.startColIndex });
      this.emitSelectionChanged();

      // Defer the success flash so it runs after applySelectionClasses has
      // painted the expanded selection classes onto the DOM.
      const fsr = fillStartRow, fer = fillEndRow, fsc = fillStartCol, fec = fillEndCol;
      setTimeout(() => this.flashFillArea(fsr, fer, fsc, fec), 0);
    }
  }

  /**
   * Flashes the cells in the filled area with a success colour overlay,
   * giving clear visual feedback that the fill operation succeeded.
   *
   * Uses `::before` so it never conflicts with the selection `::after` border.
   *
   * @param startRow - First row of the fill target area.
   * @param endRow   - Last row of the fill target area.
   * @param startCol - First column of the fill target area.
   * @param endCol   - Last column of the fill target area.
   */
  /**
   * Applies a flash animation to all visible cells within the given row/column
   * bounding box.
   *
   * @param startRow   - First row index (inclusive).
   * @param endRow     - Last row index (inclusive).
   * @param startCol   - First column index (inclusive, ≥ 0).
   * @param endCol     - Last column index (inclusive).
   * @param flashClass - CSS class that carries the animation keyframe.
   *                     Defaults to `'pg-cell--fill-flash'` (green success).
   *                     Pass `'pg-cell--cut-flash'` for the red danger flash.
   */
  private flashFillArea(
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number,
    flashClass: 'pg-cell--fill-flash' | 'pg-cell--cut-flash' = 'pg-cell--fill-flash',
  ): void {
    const cells: HTMLElement[] = [];
    for (const panel of this.bodyPanels) {
      for (const el of panel.querySelectorAll<HTMLElement>('.pg-cell[data-row-index][data-col-index]')) {
        const ri = Number(el.getAttribute('data-row-index'));
        const ci = Number(el.getAttribute('data-col-index'));
        if (ri >= startRow && ri <= endRow && ci >= startCol && ci <= endCol) {
          cells.push(el);
        }
      }
    }
    for (const el of cells) {
      el.classList.remove('pg-cell--fill-flash', 'pg-cell--cut-flash');
      void el.offsetWidth; // restart animation if re-triggered
      el.classList.add(flashClass);
    }
    setTimeout(() => {
      for (const el of cells) el.classList.remove(flashClass);
    }, 700);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  moveActiveCell(dRow: number, dCol: number, rowCount: number, colCount: number, extend = false): void {
    const active = this.store.get('activeCell');
    if (!active) return;
    const newRow = Math.max(0, Math.min(rowCount - 1, active.rowIndex + dRow));
    const newCol = Math.max(0, Math.min(colCount - 1, active.colIndex + dCol));
    if (extend) this.extendSelection(newRow, newCol);
    else this.startSelection(newRow, newCol);
  }

  jumpToEdge(direction: 'up' | 'down' | 'left' | 'right', rowCount: number, colCount: number, extend = false): void {
    const active = this.store.get('activeCell');
    if (!active) return;
    let newRow = active.rowIndex;
    let newCol = active.colIndex;
    switch (direction) {
      case 'up':    newRow = 0; break;
      case 'down':  newRow = rowCount - 1; break;
      case 'left':  newCol = 0; break;
      case 'right': newCol = colCount - 1; break;
    }
    if (extend) this.extendSelection(newRow, newCol);
    else this.startSelection(newRow, newCol);
  }

  setChartOpenCallback(fn: (type: string) => void): void {
    this.chartOpenCallback = fn;
  }

  // ─── Clipboard ───────────────────────────────────────────────────────────

  async copySelection(rows: RowNode[], columns: ColumnDef[]): Promise<void> {
    this.flashSelection('copy');
    return this.clipboardEngine.copyRangesToClipboard(
      this.store.get('cellRanges'), rows, columns, false, this.getLeafGroupField(),
    );
  }

  async copySelectionWithHeaders(rows: RowNode[], columns: ColumnDef[]): Promise<void> {
    this.flashSelection('copy');
    return this.clipboardEngine.copyRangesToClipboard(
      this.store.get('cellRanges'), rows, columns, true, this.getLeafGroupField(),
    );
  }

  async cutSelection(rows: RowNode[], columns: ColumnDef[]): Promise<void> {
    const ranges = this.store.get('cellRanges') as CellRange[];
    const leafGroupField = this.getLeafGroupField();
    await this.clipboardEngine.copyRangesToClipboard(ranges, rows, columns, false, leafGroupField);

    // Capture old values and apply mutations in a single pass per range so we
    // never need a second traversal for undo recording.
    const changes: CellChange[] = [];

    for (const range of ranges) {
      const n = normalizeRange(range);
      const hasGroupLabel = n.startColIndex < 0;

      for (let r = n.startRowIndex; r <= n.endRowIndex; r++) {
        const row = rows[r];
        if (!row || row.type !== 'data') continue;

        // Auto-group label column (colIndex −1) → leaf group field.
        if (hasGroupLabel && leafGroupField) {
          const oldVal = row.data[leafGroupField];
          changes.push({ nodeId: row.nodeId, field: leafGroupField, oldValue: oldVal, newValue: null });
          row.data[leafGroupField] = null;
        }

        // Regular columns (columns[−1] is undefined; the `if (col)` guard skips it).
        const dataStart = hasGroupLabel ? 0 : n.startColIndex;
        for (let c = dataStart; c <= n.endColIndex; c++) {
          const col = columns[c];
          if (!col) continue;
          const oldVal = row.data[col.field];
          changes.push({ nodeId: row.nodeId, field: col.field, oldValue: oldVal, newValue: null });
          row.data[col.field] = null;
        }
      }
    }

    this.undoRedoEngine?.record({ type: 'cut', changes });
    // Clear cell text immediately so the user sees blank cells without waiting
    // for the render RAF.
    this.clearCutCellsInDom(ranges);
    // Sync allRows so pipeline/watchers stay consistent
    this.store.set('allRows', [...(this.store.get('allRows') as RowNode[])]);
    const cutNodeIds = new Set(changes.map((c) => c.nodeId));
    // dataChangedCallback evicts the row DOM immediately (invalidateRowsByNodeId
    // calls .remove() synchronously).  The old flashSelection('cut') ran before
    // this eviction, so the flash class was added to elements that were then
    // detached before the browser could paint — the animation never appeared.
    // Fix: schedule the flash with a double-RAF so it runs after the render RAF
    // has rebuilt the cleared row DOM.
    this.dataChangedCallback?.(cutNodeIds);

    // Compute the bounding box across all cut ranges for the flash.
    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
    for (const range of ranges) {
      const n = normalizeRange(range);
      if (n.startRowIndex < minRow) minRow = n.startRowIndex;
      if (n.endRowIndex   > maxRow) maxRow = n.endRowIndex;
      if (n.startColIndex < minCol) minCol = n.startColIndex;
      if (n.endColIndex   > maxCol) maxCol = n.endColIndex;
    }
    if (minRow !== Infinity) {
      const fsr = minRow, fer = maxRow, fsc = Math.max(0, minCol), fec = maxCol;
      requestAnimationFrame(() => requestAnimationFrame(() => this.flashFillArea(fsr, fer, fsc, fec, 'pg-cell--cut-flash')));
    }
  }

  async pasteSelection(rows: RowNode[], columns: ColumnDef[]): Promise<void> {
    const activeCell = this.store.get('activeCell');
    if (!activeCell) return;
    const clipData = await this.clipboardEngine.pasteFromClipboard();
    if (!clipData.length) return;

    const startRow = activeCell.rowIndex;
    const startCol = activeCell.colIndex;
    const leafGroupField = this.getLeafGroupField();
    // When pasting from the auto-group column (colIndex −1), the first clipboard
    // column maps to the leaf group field; subsequent columns map to regular
    // columns at indices 0, 1, 2 … (startCol+ci arithmetic handles this naturally).
    const hasGroupLabel = startCol < 0 && !!leafGroupField;

    // Capture old values and apply mutations in the same loop pass so a second
    // traversal is never required for undo recording.
    const changes: CellChange[] = [];

    // Track the actual row/column bounds for the success flash.
    let actualEndRow = startRow;
    let maxClipCols  = 0;

    let pastedRows = 0;
    for (let ri = startRow; pastedRows < clipData.length && ri < rows.length; ri++) {
      const row = rows[ri];
      if (!row || row.type !== 'data') continue;
      const clipRow = clipData[pastedRows++];
      actualEndRow = ri;
      if (clipRow.length > maxClipCols) maxClipCols = clipRow.length;
      for (let ci = 0; ci < clipRow.length; ci++) {
        const colIdx = startCol + ci; // −1+0=−1 for group label; −1+1=0, −1+2=1 …
        if (hasGroupLabel && colIdx < 0) {
          const field = leafGroupField!;
          changes.push({ nodeId: row.nodeId, field, oldValue: row.data[field], newValue: clipRow[ci] });
          row.data[field] = clipRow[ci];
        } else {
          const col = columns[colIdx];
          if (col) {
            // Coerce the clipboard string to the column's native type — mirrors
            // the same conversion used by the fill-handle so pasting "42" into a
            // number column stores the number 42, not the string "42".
            const coerced = this.coerceToColumnType(clipRow[ci], col.type ?? 'string');
            changes.push({ nodeId: row.nodeId, field: col.field, oldValue: row.data[col.field], newValue: coerced });
            row.data[col.field] = coerced;
          }
        }
      }
    }

    this.undoRedoEngine?.record({ type: 'paste', changes });
    this.store.set('allRows', [...(this.store.get('allRows') as RowNode[])]);
    // Evict only the pasted rows from the renderer cache so custom cell renderers
    // in untouched rows (images, flags, etc.) are not needlessly re-executed.
    this.dataChangedCallback?.(new Set(changes.map((c) => c.nodeId)));

    if (changes.length > 0 && maxClipCols > 0) {
      // The group-label column (colIndex −1) is not a regular body cell, so clamp
      // the flash range to column 0.  When hasGroupLabel the first clip column maps
      // to the group field (colIdx −1) and regular columns start at colIdx 0.
      const flashStartCol = hasGroupLabel ? 0 : Math.max(0, startCol);
      const flashEndCol   = hasGroupLabel
        ? maxClipCols - 2           // −1 + maxClipCols − 1
        : startCol + maxClipCols - 1;

      if (flashEndCol >= flashStartCol) {
        const fsr = startRow, fer = actualEndRow, fsc = flashStartCol, fec = flashEndCol;
        // Double-RAF: the first RAF fires the pending render (which rebuilds the
        // invalidated row DOM); the second RAF fires after those cells are in the
        // DOM so flashFillArea can query and animate them.
        requestAnimationFrame(() => requestAnimationFrame(() => this.flashFillArea(fsr, fer, fsc, fec)));
      }
    }
  }

  // ─── Undo / Redo ─────────────────────────────────────────────────────────

  /**
   * Reverts the most recent recorded action (edit / cut / paste) by applying
   * the inverse cell changes and triggering a re-render.
   * No-op when the undo stack is empty or no engine is wired up.
   */
  private performUndo(): void {
    const changes = this.undoRedoEngine?.undo();
    if (changes) this.applyUndoRedoChanges(changes);
  }

  /**
   * Re-applies the most recently undone action and triggers a re-render.
   * No-op when the redo stack is empty or no engine is wired up.
   */
  private performRedo(): void {
    const changes = this.undoRedoEngine?.redo();
    if (changes) this.applyUndoRedoChanges(changes);
  }

  /**
   * Writes the given cell changes into `allRows`, triggers a renderer refresh,
   * scrolls the first affected cell into view, and flashes the affected region.
   *
   * Used by both `performUndo` and `performRedo`.
   *
   * A `Map<nodeId, RowNode>` is built once before the change loop so each row
   * lookup is O(1) instead of O(n) — important for large paste undo operations.
   *
   * @param changes - Ordered list of `{ nodeId, field, newValue }` to apply.
   */
  private applyUndoRedoChanges(changes: CellChange[]): void {
    const allRows = this.store.get('allRows') as RowNode[];
    const nodeMap = new Map<string, RowNode>();
    for (const row of allRows) nodeMap.set(row.nodeId, row);

    for (const change of changes) {
      const row = nodeMap.get(change.nodeId);
      if (row) row.data[change.field] = change.newValue;
    }

    this.store.set('allRows', [...allRows]);
    this.dataChangedCallback?.(new Set(changes.map((c) => c.nodeId)));

    if (changes.length === 0) return;

    // Translate nodeId/field into visible row/column indices so we can scroll
    // and flash the affected region.  Rows or columns that are filtered/hidden
    // won't appear in these maps and are silently skipped.
    const visibleRows = this.store.get('visibleRows') as RowNode[];
    const columns     = this.getVisibleColumns();

    const nodeIdToRowIndex = new Map<string, number>();
    for (let i = 0; i < visibleRows.length; i++) nodeIdToRowIndex.set(visibleRows[i].nodeId, i);

    const fieldToColIndex = new Map<string, number>();
    for (let i = 0; i < columns.length; i++) fieldToColIndex.set(columns[i].field, i);

    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;

    for (const change of changes) {
      const ri = nodeIdToRowIndex.get(change.nodeId);
      const ci = fieldToColIndex.get(change.field);
      if (ri !== undefined) {
        if (ri < minRow) minRow = ri;
        if (ri > maxRow) maxRow = ri;
      }
      if (ci !== undefined) {
        if (ci < minCol) minCol = ci;
        if (ci > maxCol) maxCol = ci;
      }
    }

    if (minRow === Infinity) return; // all affected rows are filtered out

    const effectiveMinCol = minCol !== Infinity ? minCol : 0;
    const effectiveMaxCol = maxCol !== Infinity ? maxCol : 0;

    // Select the bounding box of the affected cells so the user can see exactly
    // which cells changed.  This mirrors the selection expansion that fill-handle
    // does after applyFill.
    const newRange: CellRange = {
      startRowIndex: minRow,
      endRowIndex:   maxRow,
      startColIndex: effectiveMinCol,
      endColIndex:   effectiveMaxCol,
    };
    this.anchorCell = { rowIndex: minRow, colIndex: effectiveMinCol };
    this.store.set('cellRanges', [newRange]);
    this.store.set('activeCell', { rowIndex: minRow, colIndex: effectiveMinCol });
    this.emitSelectionChanged();

    // Scroll the top-left affected cell into the viewport.
    this.scrollToCellCallback?.(minRow, effectiveMinCol);

    // Flash the affected bounding box after the render RAF has rebuilt the cell
    // DOM.  Double-RAF: the first RAF fires the pending render (triggered by
    // dataChangedCallback above), the second fires once those new cells are live.
    const fsr = minRow, fer = maxRow;
    const fsc = Math.max(0, effectiveMinCol), fec = Math.max(0, effectiveMaxCol);
    requestAnimationFrame(() => requestAnimationFrame(() => this.flashFillArea(fsr, fer, fsc, fec)));
  }

  // ─── Grouping helpers ─────────────────────────────────────────────────────

  /**
   * Returns the `field` name of the innermost (deepest) grouping column, or
   * `undefined` when no grouping is active.
   *
   * Reads from the store's full column list (including hidden columns) rather
   * than the visible-columns slice passed to copy/cut/paste methods — the
   * grouped column is often hidden from the regular column display (visible: false)
   * but the leaf group cell must still be able to copy its value.
   */
  private getLeafGroupField(): string | undefined {
    const groupedIds = this.store.get('groupedColumnIds') as string[];
    if (groupedIds.length === 0) return undefined;
    const leafColId = groupedIds[groupedIds.length - 1];
    const allCols = this.store.get('columns') as ColumnDef[];
    return allCols.find((c) => c.colId === leafColId)?.field;
  }

  // ─── Context menu ─────────────────────────────────────────────────────────

  showContextMenu(x: number, y: number): void {
    if (!this.contextMenuEl) return;
    // Clamp to viewport
    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = 200, mh = 300;
    const left = x + mw > vw ? vw - mw - 4 : x;
    const top  = y + mh > vh ? vh - mh - 4 : y;
    this.contextMenuEl.style.left = `${left}px`;
    this.contextMenuEl.style.top  = `${top}px`;
    this.contextMenuEl.classList.add('pg-context-menu--visible');
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', this.boundHideCtx, { once: true });
    });
  }

  hideContextMenu(): void {
    this.contextMenuEl?.classList.remove('pg-context-menu--visible');
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private flashSelection(type: 'copy' | 'cut'): void {
    const cls = type === 'copy' ? 'pg-cell--copy-flash' : 'pg-cell--cut-flash';
    const cells: HTMLElement[] = [];
    for (const panel of this.bodyPanels) {
      for (const el of panel.querySelectorAll<HTMLElement>('.pg-cell--in-selection, .pg-cell--active-cell')) {
        cells.push(el);
      }
    }
    for (const el of cells) {
      el.classList.remove('pg-cell--copy-flash', 'pg-cell--cut-flash');
      // Force reflow so removing+re-adding the class restarts the animation
      void el.offsetWidth;
      el.classList.add(cls);
    }
    setTimeout(() => {
      for (const el of cells) el.classList.remove(cls);
    }, 700);
  }

  private clearCutCellsInDom(ranges: CellRange[]): void {
    const norms = ranges.map(normalizeRange);
    for (const panel of this.bodyPanels) {
      for (const el of panel.querySelectorAll<HTMLElement>('.pg-cell[data-row-index][data-col-index]')) {
        const ri = Number(el.getAttribute('data-row-index'));
        const ci = Number(el.getAttribute('data-col-index'));
        const hit = norms.some(
          (n) => ri >= n.startRowIndex && ri <= n.endRowIndex && ci >= n.startColIndex && ci <= n.endColIndex,
        );
        if (hit) {
          const inner = el.querySelector<HTMLElement>('.pg-cell__inner');
          if (inner) inner.textContent = '';
        }
      }
    }
  }

  private getVisibleColumns(): ColumnDef[] {
    return (this.store.get('columns') as ColumnDef[]).filter((c) => c.visible !== false);
  }

  /**
   * Coerces `value` to the primitive type expected by `targetType`.
   *
   * Called by `applyFill` whenever the source column type differs from the
   * destination column type so that data remains correctly typed after a
   * cross-type fill — even if the result is `NaN` or an `Invalid Date`.
   *
   * | `targetType`                    | Conversion                          |
   * |---------------------------------|-------------------------------------|
   * | `'number'` / `'currency'` /     | `Number(value)` — may produce `NaN` |
   * | `'percentage'`                  |                                     |
   * | `'date'`                        | `new Date(String(value))` — may     |
   * |                                 | produce `Invalid Date`              |
   * | `'boolean'`                     | `Boolean(value)`                    |
   * | `'string'`                      | `String(value)` if not already      |
   * | anything else                   | unchanged                           |
   *
   * @param value      - Raw value from the source cell.
   * @param targetType - `ColumnDef.type` of the destination column.
   */
  private coerceToColumnType(value: unknown, targetType: string): unknown {
    if (value == null) return value;
    switch (targetType) {
      case 'number':
      case 'currency':
      case 'percentage':
        return Number(value);
      case 'date':
        // Preserve existing Date objects with a safe copy; parse everything
        // else via the Date constructor — result may be an Invalid Date.
        return value instanceof Date
          ? new Date(value.getTime())
          : new Date(String(value));
      case 'boolean':
        return Boolean(value);
      case 'string':
        return typeof value === 'string' ? value : String(value);
      default:
        return value;
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    // Don't steal keyboard from input / editable elements
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) return;

    const active = this.store.get('activeCell');
    if (!active) return;

    const jump = e.ctrlKey || e.metaKey;
    const key  = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    // Undo / redo operate on allRows and must not be blocked by an empty
    // visibleRows slice (e.g. all rows filtered out).
    if (jump && key === 'z') { e.preventDefault(); this.performUndo(); return; }
    if (jump && key === 'y') { e.preventDefault(); this.performRedo(); return; }

    const rows    = this.store.get('visibleRows') as RowNode[];
    const columns = this.getVisibleColumns();
    if (rows.length === 0 || columns.length === 0) return;

    const extend = e.shiftKey;

    switch (key) {
      case 'ArrowUp':
        e.preventDefault();
        jump
          ? this.jumpToEdge('up', rows.length, columns.length, extend)
          : this.moveActiveCell(-1, 0, rows.length, columns.length, extend);
        break;
      case 'ArrowDown':
        e.preventDefault();
        jump
          ? this.jumpToEdge('down', rows.length, columns.length, extend)
          : this.moveActiveCell(1, 0, rows.length, columns.length, extend);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (jump) {
          this.jumpToEdge('left', rows.length, columns.length, extend);
        } else if (!extend) {
          const ac = active as { rowIndex: number; colIndex: number };
          if (ac.colIndex === 0 && ac.rowIndex > 0) {
            // Wrap: first column → last column of the previous row
            this.startSelection(ac.rowIndex - 1, columns.length - 1);
          } else {
            this.moveActiveCell(0, -1, rows.length, columns.length, false);
          }
        } else {
          this.moveActiveCell(0, -1, rows.length, columns.length, true);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (jump) {
          this.jumpToEdge('right', rows.length, columns.length, extend);
        } else if (!extend) {
          const ac = active as { rowIndex: number; colIndex: number };
          if (ac.colIndex >= columns.length - 1 && ac.rowIndex < rows.length - 1) {
            // Wrap: last column → first column of the next row
            this.startSelection(ac.rowIndex + 1, 0);
          } else {
            this.moveActiveCell(0, 1, rows.length, columns.length, false);
          }
        } else {
          this.moveActiveCell(0, 1, rows.length, columns.length, true);
        }
        break;
      case 'PageDown': {
        e.preventDefault();
        const pageDownSize = this.getViewportRowCountCallback?.() ?? 10;
        this.moveActiveCell(pageDownSize, 0, rows.length, columns.length, extend);
        break;
      }
      case 'PageUp': {
        e.preventDefault();
        const pageUpSize = this.getViewportRowCountCallback?.() ?? 10;
        this.moveActiveCell(-pageUpSize, 0, rows.length, columns.length, extend);
        break;
      }
      case 'Home':
        e.preventDefault();
        if (jump) {
          // Ctrl+Home → absolute first cell (0, 0)
          this.startSelection(0, 0, extend);
        } else {
          // Home → first column in the current row
          this.moveActiveCell(0, -(active as { rowIndex: number; colIndex: number }).colIndex, rows.length, columns.length, extend);
        }
        break;
      case 'End':
        e.preventDefault();
        if (jump) {
          // Ctrl+End → absolute last cell
          this.startSelection(rows.length - 1, columns.length - 1, extend);
        } else {
          // End → last column in the current row
          this.moveActiveCell(0, columns.length - 1 - (active as { rowIndex: number; colIndex: number }).colIndex, rows.length, columns.length, extend);
        }
        break;
      case 'Tab': {
        e.preventDefault();
        const ac = active as { rowIndex: number; colIndex: number };
        if (e.shiftKey) {
          if (ac.colIndex === 0 && ac.rowIndex > 0) {
            this.startSelection(ac.rowIndex - 1, columns.length - 1);
          } else {
            this.moveActiveCell(0, -1, rows.length, columns.length, false);
          }
        } else {
          if (ac.colIndex >= columns.length - 1 && ac.rowIndex < rows.length - 1) {
            this.startSelection(ac.rowIndex + 1, 0);
          } else {
            this.moveActiveCell(0, 1, rows.length, columns.length, false);
          }
        }
        break;
      }
      case 'Enter':
        e.preventDefault();
        if (!e.shiftKey && this.enterEditHandler) {
          const ac = active as { rowIndex: number; colIndex: number };
          if (this.enterEditHandler(ac.rowIndex, ac.colIndex)) break;
        }
        // Shift+Enter goes up; plain Enter goes down
        this.moveActiveCell(e.shiftKey ? -1 : 1, 0, rows.length, columns.length, false);
        break;
      case 'c':
        if (jump) { e.preventDefault(); this.copySelection(rows, columns); }
        break;
      case 'x':
        if (jump) { e.preventDefault(); this.cutSelection(rows, columns); }
        break;
      case 'v':
        if (jump) { e.preventDefault(); this.pasteSelection(rows, columns); }
        break;
      case 'a':
        if (jump) { e.preventDefault(); this.selectAll(rows.length, columns.length); }
        break;
      case 'Delete':
      case 'Backspace':
        // Delete / Backspace clears the selected range — same as Ctrl+X but
        // without writing to the clipboard.
        if ((this.store.get('cellRanges') as CellRange[]).length > 0) {
          e.preventDefault();
          this.cutSelection(rows, columns);
        }
        break;
      case 'Escape':
        this.clearSelection();
        break;
    }
  }

  private selectAll(rowCount: number, colCount: number): void {
    // When grouping is active the auto-group column lives at virtual colIndex −1.
    // Ctrl+A must include it so all visible cells (group label + data columns)
    // are highlighted and can be copied in a single operation.
    const groupedIds = this.store.get('groupedColumnIds') as string[];
    const startCol = groupedIds.length > 0 ? -1 : 0;
    this.anchorCell = { rowIndex: 0, colIndex: startCol };
    this.store.set('cellRanges', [{
      startRowIndex: 0, endRowIndex: rowCount - 1,
      startColIndex: startCol, endColIndex: colCount - 1,
    }]);
    this.store.set('activeCell', { rowIndex: 0, colIndex: startCol });
    this.emitSelectionChanged();
  }

  private buildContextMenu(): void {
    const ICON_CUT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`;
    const ICON_COPY = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    const ICON_PASTE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`;
    const ICON_CHART = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
    const ICON_EXPORT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

    const el = document.createElement('div');
    el.className = 'pg-context-menu';
    el.setAttribute('role', 'menu');

    const makeItem = (action: string, icon: string, label: string, kbd?: string): HTMLElement => {
      const btn = document.createElement('button');
      btn.className = 'pg-context-menu__item';
      btn.setAttribute('role', 'menuitem');
      btn.setAttribute('data-action', action);
      const iconSpan = document.createElement('span');
      iconSpan.className = 'pg-context-menu__icon';
      iconSpan.innerHTML = icon;
      const labelSpan = document.createElement('span');
      labelSpan.className = 'pg-context-menu__label';
      labelSpan.textContent = label;
      btn.appendChild(iconSpan);
      btn.appendChild(labelSpan);
      if (kbd) {
        const kbdSpan = document.createElement('span');
        kbdSpan.className = 'pg-context-menu__kbd';
        kbdSpan.textContent = kbd;
        btn.appendChild(kbdSpan);
      }
      return btn;
    };

    const makeSep = (): HTMLElement => {
      const sep = document.createElement('div');
      sep.className = 'pg-context-menu__sep';
      sep.setAttribute('role', 'separator');
      return sep;
    };

    const makeChartSubItem = (type: string, label: string): HTMLElement => {
      const btn = document.createElement('button');
      btn.className = 'pg-context-menu__item';
      btn.setAttribute('role', 'menuitem');
      btn.setAttribute('data-chart-type', type);
      const labelSpan = document.createElement('span');
      labelSpan.className = 'pg-context-menu__label';
      labelSpan.textContent = label;
      btn.appendChild(labelSpan);
      return btn;
    };

    const makeSubGroup = (label: string, items: HTMLElement[]): HTMLElement => {
      const wrapper = document.createElement('div');
      wrapper.className = 'pg-context-menu__item pg-context-menu__item--has-sub';
      wrapper.setAttribute('role', 'menuitem');
      const labelSpan = document.createElement('span');
      labelSpan.className = 'pg-context-menu__label';
      labelSpan.textContent = label;
      wrapper.appendChild(labelSpan);
      const sub = document.createElement('div');
      sub.className = 'pg-context-menu__sub';
      for (const item of items) sub.appendChild(item);
      wrapper.appendChild(sub);
      return wrapper;
    };

    // Cut / Copy / Copy with Headers / Paste
    el.appendChild(makeItem('cut', ICON_CUT, 'Cut', 'Ctrl+X'));
    el.appendChild(makeItem('copy', ICON_COPY, 'Copy', 'Ctrl+C'));
    el.appendChild(makeItem('copy-headers', ICON_COPY, 'Copy with Headers'));
    el.appendChild(makeItem('paste', ICON_PASTE, 'Paste', 'Ctrl+V'));
    el.appendChild(makeSep());

    // Chart Range with nested submenu
    const chartItem = document.createElement('div');
    chartItem.className = 'pg-context-menu__item pg-context-menu__item--has-sub';
    chartItem.setAttribute('role', 'menuitem');
    const chartIcon = document.createElement('span');
    chartIcon.className = 'pg-context-menu__icon';
    chartIcon.innerHTML = ICON_CHART;
    const chartLabel = document.createElement('span');
    chartLabel.className = 'pg-context-menu__label';
    chartLabel.textContent = 'Chart Range';
    chartItem.appendChild(chartIcon);
    chartItem.appendChild(chartLabel);

    const chartSub = document.createElement('div');
    chartSub.className = 'pg-context-menu__sub';

    // Column sub-group
    chartSub.appendChild(makeSubGroup('Column', [
      makeChartSubItem('column-grouped', 'Grouped'),
      makeChartSubItem('column-stacked', 'Stacked'),
      makeChartSubItem('column-100stacked', '100% Stacked'),
    ]));
    // Bar sub-group
    chartSub.appendChild(makeSubGroup('Bar', [
      makeChartSubItem('bar-grouped', 'Grouped'),
      makeChartSubItem('bar-stacked', 'Stacked'),
      makeChartSubItem('bar-100stacked', '100% Stacked'),
    ]));
    chartSub.appendChild(makeChartSubItem('pie', 'Pie'));
    chartSub.appendChild(makeChartSubItem('line', 'Line'));
    chartSub.appendChild(makeChartSubItem('area', 'Area'));
    chartSub.appendChild(makeChartSubItem('scatter', 'X Y (Scatter)'));
    chartSub.appendChild(makeChartSubItem('polar', 'Polar'));
    chartSub.appendChild(makeChartSubItem('funnel', 'Funnel'));

    chartItem.appendChild(chartSub);
    el.appendChild(chartItem);

    el.appendChild(makeSep());

    // Export sub-group
    const exportItem = document.createElement('div');
    exportItem.className = 'pg-context-menu__item pg-context-menu__item--has-sub';
    exportItem.setAttribute('role', 'menuitem');
    const exportIcon = document.createElement('span');
    exportIcon.className = 'pg-context-menu__icon';
    exportIcon.innerHTML = ICON_EXPORT;
    const exportLabel = document.createElement('span');
    exportLabel.className = 'pg-context-menu__label';
    exportLabel.textContent = 'Export';
    exportItem.appendChild(exportIcon);
    exportItem.appendChild(exportLabel);
    const exportSub = document.createElement('div');
    exportSub.className = 'pg-context-menu__sub';
    const csvBtn = document.createElement('button');
    csvBtn.className = 'pg-context-menu__item';
    csvBtn.setAttribute('role', 'menuitem');
    csvBtn.setAttribute('data-action', 'export-csv');
    const csvLabel = document.createElement('span');
    csvLabel.className = 'pg-context-menu__label';
    csvLabel.textContent = 'Export as CSV';
    csvBtn.appendChild(csvLabel);
    exportSub.appendChild(csvBtn);
    exportItem.appendChild(exportSub);
    el.appendChild(exportItem);

    el.addEventListener('mousedown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action],[data-chart-type]');
      if (!btn) return;
      // Don't close if it's a submenu parent clicked but not an actual action
      const action = btn.getAttribute('data-action');
      const chartType = btn.getAttribute('data-chart-type');
      if (!action && !chartType) return;

      this.hideContextMenu();
      const rows    = this.store.get('visibleRows') as RowNode[];
      const columns = this.getVisibleColumns();

      if (chartType) {
        this.chartOpenCallback?.(chartType);
        return;
      }

      switch (action) {
        case 'cut':           this.cutSelection(rows, columns); break;
        case 'copy':          this.copySelection(rows, columns); break;
        case 'copy-headers':  this.copySelectionWithHeaders(rows, columns); break;
        case 'paste':         this.pasteSelection(rows, columns); break;
        case 'selectAll':     this.selectAll(rows.length, columns.length); break;
        case 'export-csv':    this.exportAsCsv(rows, columns); break;
      }
    });

    document.body.appendChild(el);
    this.contextMenuEl = el;
  }

  private exportAsCsv(rows: RowNode[], columns: ColumnDef[]): void {
    const header = columns.map((c) => `"${c.header}"`).join(',');
    const body = rows
      .filter((r) => r.type === 'data')
      .map((row) =>
        columns.map((col) => {
          const v = row.data[col.field];
          const s = v == null ? '' : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        }).join(','),
      )
      .join('\n');
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private emitSelectionChanged(): void {
    this.eventBus.emit(GridEventType.CELL_SELECTION_CHANGED, {
      ranges: this.store.get('cellRanges'),
    });
  }
}
