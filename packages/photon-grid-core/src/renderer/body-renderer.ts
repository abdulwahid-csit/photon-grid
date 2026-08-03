import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
import type { RowSelectionEngine } from '../engines/selection/row-selection-engine';
import { GridEventType } from '../types/event.types';
import { EmptyDetailToggleMode } from '../types/master-detail.types';
import { CellRenderer } from './cell-renderer';
import { formatValue } from '../engines/editing/value-parser';
import { createDiv, toggleClass } from './dom-utils';
import { ViewportVDom } from './vdom/viewport-vdom';
import { CellPatcher } from './vdom/cell-patcher';
import type { RenderedRowRef, VDomRenderContext, VDomStats } from './vdom/vdom.types';
import { resolveColumnRenderer } from './renderer-resolver';
import { applyTreeToggle, syncTreeToggle, type TreeToggleRenderConfig } from './tree-cell-renderer';
import { isTouchPointer, DRAG_THRESHOLD_TOUCH } from '../core/pointer-utils';

/**
 * Sentinel `ColumnDef` emitted with `CELL_CLICKED` for the auto-group label cell.
 * Editing is unconditionally blocked for group rows in `startCellEdit`, so this
 * colDef's `editable: false` is a secondary safety net.
 */
const GROUP_LABEL_COL_DEF: ColumnDef = {
  colId: '__group__',
  field: '__group__',
  header: 'Group',
  type: 'string',
  editable: false,
};

/**
 * `data-col-id` of the virtual auto-group column.
 *
 * It carries a `data-col-id` so selection and clipboard treat it like a cell,
 * but it is not a member of any panel's column list — {@link BodyRenderer}'s
 * column reconciler must therefore never mistake it for a column that left the
 * layout and delete it.
 */
const AUTO_GROUP_COL_ID = '__group__';

/**
 * Marker classes on the two virtual-scroll spacer cells of a center row.
 *
 * The reconciler needs to know exactly where a row's data cells begin and end
 * without re-deriving the row's structure: the trailing spacer is the insertion
 * anchor every cell is positioned against, and both spacers must be re-sized
 * when the horizontal virtual window moves. A class is the cheapest stable
 * handle for that — `pg-cell--h-spacer` alone cannot distinguish the two.
 */
const SPACER_START_CLASS = 'pg-cell--h-spacer-start';
const SPACER_END_CLASS = 'pg-cell--h-spacer-end';

/**
 * Outcome of reconciling one panel row's cells against a new column list.
 *
 * `needsReadopt` is the only field the caller acts on: the Virtual DOM records
 * each cell's element *and* its column index at adoption time, so a cell that
 * was created, detached, or restamped with a new index invalidates the row's
 * adopted map. A reconcile that changed nothing observable leaves it valid, and
 * re-adopting anyway would be pure waste.
 */
interface CellReconcileResult {
  /** `true` when the row's adopted Virtual DOM cell map no longer describes it. */
  needsReadopt: boolean;
}

/**
 * Builds the row-shape signature described by `BodyRenderer.lastRowShapeKey`.
 *
 * Only flags that add or remove a *non-column* element from a row belong here.
 * Anything that merely changes a cell's contents (formatting, locale, a value)
 * is handled by the Virtual DOM patch path and must not force a rebuild.
 */
function buildRowShapeKey(options: BodyRendererOptions): string {
  return [
    options.showSerialNumber ? 1 : 0,
    options.serialColumnSelection ? 1 : 0,
    options.showCheckboxes ? 1 : 0,
    options.showVerticalBorders ? 1 : 0,
    options.showGroupsColumn ? 1 : 0,
    options.leafGroupColDef?.colId ?? '',
    options.masterDetail?.toggleColumnId ?? '',
    options.treeData?.toggleColumnId ?? '',
  ].join('|');
}

export interface BodyRendererOptions {
  showCheckboxes?: boolean;
  showSerialNumber?: boolean;
  /** When true, serial cells become AG Grid–style row-selection column entries. */
  serialColumnSelection?: boolean;
  showVerticalBorders?: boolean;
  rowShading?: boolean;
  rowHeight?: number;
  api?: unknown;
  dateFormat?: string;
  timeZone?: string;
  currencySymbol?: string;
  locale?: string;
  showGroupsColumn?: boolean;
  autoGroupColWidth?: number;
  /**
   * `ColumnDef` for the innermost (deepest) grouping field.
   *
   * When provided, leaf data rows render an interactive cell in the auto-group
   * column showing the row's value for this field — selectable, editable, and
   * copyable exactly like any normal data cell.
   *
   * `null` (or omitted) when no grouping is active; a plain spacer is rendered
   * instead to maintain column alignment.
   */
  leafGroupColDef?: ColumnDef | null;
  /**
   * Full, unfiltered column list — includes columns hidden by horizontal
   * virtualization AND columns hidden because they're the active group-by
   * field. Used to resolve a group row's `groupField` to its `ColumnDef` so a
   * custom `renderer.group` can be looked up even though that column itself
   * renders no cell of its own while grouped.
   */
  allLeafColumns?: ColumnDef[];
  /**
   * `false` when `GridOptions.editing.mode` is `'none'`.
   *
   * Only `boolean` columns read it: their inline checkbox renders disabled when
   * the grid cannot commit an edit, so it never looks clickable while being
   * inert.
   */
  editingEnabled?: boolean;
  // Horizontal virtual scroll: centerCols is already the visible slice
  centerColStart?: number;       // index of first visible center col within all center cols
  centerLeftSpacerW?: number;    // px width of off-screen cols to the left
  centerRightSpacerW?: number;   // px width of off-screen cols to the right
  totalCenterCols?: number;      // total number of center cols (for rightOffset calc)
  /**
   * When Master/Detail is enabled, drives the expand/collapse toggle icon
   * rendered on `'data'` rows for the configured toggle column.
   */
  masterDetail?: {
    toggleColumnId: string;
    isExpandedFn: (nodeId: string) => boolean;
    hasDetailFn: (rowData: Record<string, unknown>) => boolean;
    /** What to render in the toggle column for a row `hasDetailFn` rejects — see {@link EmptyDetailToggleMode}. */
    emptyToggleMode: EmptyDetailToggleMode;
  };
  /**
   * When Tree Data is enabled, drives indentation (`data-level` on the row
   * element) and the expand/collapse toggle rendered on `'data'` rows with
   * children, in the configured toggle column.
   */
  treeData?: TreeToggleRenderConfig;
}

interface PanelRowSet {
  left: HTMLElement | null;
  center: HTMLElement | null;
  right: HTMLElement | null;
}

export class BodyRenderer {
  private cellRenderer = new CellRenderer();
  private renderedRowMap = new Map<string, PanelRowSet>();

  /**
   * Viewport Virtual DOM — the mirror of the rows currently in the DOM.
   *
   * Kept in sync at the end of every {@link renderRows} pass so that real-time
   * data updates can be applied as individual cell patches instead of row
   * rebuilds. See `src/renderer/vdom`.
   */
  private readonly vdom: ViewportVDom;

  /** Reused buffer feeding `ViewportVDom.sync` — avoids an array per render. */
  private readonly syncRefs: RenderedRowRef[] = [];

  private leftContent: HTMLElement | null = null;
  private centerContent: HTMLElement | null = null;
  private rightContent: HTMLElement | null = null;
  /** Whether serial-column row selection is active (enables the block outline). */
  private serialColumnSelection = false;

  // Track last rendered center col range to detect changes
  private readonly lastCenterRange = { start: -1, end: -1 };

  /**
   * Widths of the two center virtual-scroll spacers as currently painted.
   *
   * Column widths can change without the visible column *set* changing (a
   * resize of an off-screen column, a flex re-resolve), and the spacers stand in
   * for exactly those off-screen widths — so they need a dirtiness signal of
   * their own or the center panel silently drifts out of horizontal alignment.
   */
  private readonly lastSpacerW = { start: -1, end: -1 };

  // ── Column reconciliation ─────────────────────────────────────────────────
  /**
   * The ordered column ids last painted into each panel, plus the global column
   * index the panel started at.
   *
   * A column change is detected by comparing against these rather than by being
   * told about it, so every path that alters the layout — a reorder, a pin, a
   * hide, or the horizontal virtual window sliding by one column — takes the
   * same in-place reconcile route with no caller opt-in.
   */
  private readonly lastPanelColIds: Record<'left' | 'center' | 'right', string[]> = {
    left: [],
    center: [],
    right: [],
  };
  private readonly lastPanelColOffset: Record<'left' | 'center' | 'right', number> = {
    left: -1,
    center: -1,
    right: -1,
  };
  /**
   * Every visible column by id, refreshed at the top of each {@link renderRows}.
   *
   * Row-level delegated listeners resolve a clicked cell's `ColumnDef` through
   * this map. Closing over the panel's column array instead would go stale the
   * moment a row survives a column change — which, now that rows are reconciled
   * rather than rebuilt, is the normal case rather than the exception.
   */
  private readonly colDefById = new Map<string, ColumnDef>();
  /**
   * The options of the most recent {@link renderRows} pass.
   *
   * Delegated listeners read this rather than a captured `options` object so a
   * row that survives a re-render — which, with in-place column reconciliation,
   * is now the normal case — never resolves against a stale `leafGroupColDef`.
   */
  private lastOptions: BodyRendererOptions = {};

  /**
   * Signature of the options that decide a row's *shape* rather than its cells.
   *
   * The column reconciler only knows how to add, move and remove data cells. A
   * serial column, a checkbox, the auto-group cell and the tree/master-detail
   * decorations are built once per row and sit outside that contract, so when
   * one of them is switched on or off the rows have to be rebuilt outright —
   * reconciling would leave the panels misaligned by exactly one cell.
   */
  private lastRowShapeKey = '';

  // Sticky-row overlay containers (Master/Detail) — siblings of the
  // `*Content` panels above, outside the scroll transform. `null` unless
  // `masterDetail.enabled`.
  private leftSticky: HTMLElement | null = null;
  private centerSticky: HTMLElement | null = null;
  private rightSticky: HTMLElement | null = null;
  /** `nodeId`s of the rows currently parked in the sticky containers — a single Master/Detail master row, or a stack of Tree Data ancestor rows. */
  private stuckNodeIds = new Set<string>();

  // ── Pointer-tracked row hover ─────────────────────────────────────────────
  /** Panels participating in hover, cached from `setPanels` for class updates. */
  private hoverPanels: HTMLElement[] = [];
  /** `nodeId` of the row currently showing `pg-row--hover`, or `null`. */
  private hoveredNodeId: string | null = null;
  /** Last known pointer viewport coordinates, used to re-hit-test on scroll. */
  private pointerX = 0;
  private pointerY = 0;
  /** `true` while the pointer is over the body — gates scroll-driven hover sync. */
  private pointerInside = false;

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
    private iconRenderer: IconRenderer,
    private rowSelectionEngine: RowSelectionEngine,
  ) {
    this.vdom = new ViewportVDom(new CellPatcher(this.cellRenderer, iconRenderer));
  }

  setPanels(
    leftContent: HTMLElement | null,
    centerContent: HTMLElement,
    rightContent: HTMLElement | null,
  ): void {
    this.leftContent = leftContent;
    this.centerContent = centerContent;
    this.rightContent = rightContent;

    // Delegated hover sync. `mousemove` records the pointer and hovers the row
    // under it; `refreshHoverAtPointer` (called from renderRows) re-hits the
    // same point after every scroll frame so the hover follows the row that
    // moves under a stationary cursor — the browser's own :hover does not
    // re-evaluate on scroll, and virtualization recycles row DOM besides.
    const panels = [leftContent, centerContent, rightContent].filter((p): p is HTMLElement => p !== null);
    this.hoverPanels = panels;
    const getNodeId = (el: EventTarget | null): string | null =>
      el instanceof HTMLElement ? el.closest<HTMLElement>('[data-node-id]')?.getAttribute('data-node-id') ?? null : null;

    for (const panel of panels) {
      panel.addEventListener('mousemove', (e) => {
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        this.pointerInside = true;
        this.setHoveredRow(getNodeId(e.target));
      });
      panel.addEventListener('mouseleave', (e: MouseEvent) => {
        // Moving between sibling panels (left↔center↔right) fires mouseleave on
        // one and mouseenter on the next — ignore that so hover doesn't flicker.
        const rt = e.relatedTarget;
        if (rt instanceof Node && panels.some((p) => p.contains(rt))) return;
        this.pointerInside = false;
        this.setHoveredRow(null);
      });
    }
  }

  /**
   * Sets (or clears) the hovered row by `nodeId`, moving the `pg-row--hover`
   * class across all panels in one pass. No-op when the target is unchanged, so
   * it is cheap to call every scroll frame.
   *
   * Resolves the row's parts through `renderedRowMap` — an O(1) lookup of the
   * exact three elements — rather than a `querySelectorAll` sweep per panel.
   * Falls back to a scoped query only for a row that is rendered but not in the
   * map (a Master/Detail or Tree row parked in the sticky overlay, whose DOM is
   * re-parented out of the content panels by `setStickyRows`).
   */
  private setHoveredRow(nodeId: string | null): void {
    if (nodeId === this.hoveredNodeId) return;
    if (this.hoveredNodeId) this.applyHoverClass(this.hoveredNodeId, false);
    this.hoveredNodeId = nodeId;
    if (nodeId) this.applyHoverClass(nodeId, true);
  }

  /** Adds/removes `pg-row--hover` on every panel part of one row. */
  private applyHoverClass(nodeId: string, on: boolean): void {
    const ps = this.renderedRowMap.get(nodeId);
    if (ps) {
      for (const el of [ps.left, ps.center, ps.right]) {
        if (el) toggleClass(el, 'pg-row--hover', on);
      }
      return;
    }
    for (const p of this.hoverPanels) {
      p.querySelectorAll<HTMLElement>(`[data-node-id="${nodeId}"]`)
        .forEach((r) => toggleClass(r, 'pg-row--hover', on));
    }
  }

  /**
   * Re-evaluates which row sits under the last-known pointer position and
   * updates the hover accordingly. Called at the start of every `renderRows`
   * (before row classes are derived) so that while the body scrolls under a
   * stationary cursor (wheel/momentum), the row now beneath the pointer becomes
   * the hovered one. Cheap when idle: a single `elementFromPoint` only while the
   * pointer is inside the body.
   */
  refreshHoverAtPointer(): void {
    if (!this.pointerInside) return;
    const el = document.elementFromPoint(this.pointerX, this.pointerY);
    const nodeId = el instanceof HTMLElement
      ? el.closest<HTMLElement>('[data-node-id]')?.getAttribute('data-node-id') ?? null
      : null;
    this.setHoveredRow(nodeId);
  }

  /** Wires the per-panel sticky-row overlay containers. Called once from `GridRenderer` when `masterDetail.enabled`. */
  setStickyContainers(left: HTMLElement | null, center: HTMLElement | null, right: HTMLElement | null): void {
    this.leftSticky = left;
    this.centerSticky = center;
    this.rightSticky = right;
  }

  /**
   * Parks each entry's row in the sticky overlay (pinned at the panel's own
   * top, ignoring the scroll transform, stacked in array order) — releasing
   * whatever was previously stuck but isn't in `entries` back into normal
   * scrolled flow. A single entry reproduces the old Master/Detail behavior;
   * multiple entries stack Tree Data's ancestor-row chain, each at its own
   * `top` (see `TreeStickyRowTracker`).
   *
   * Moves the *actual* cached DOM nodes (not clones) so every existing
   * listener, selection class, and edit-in-progress state carries over
   * untouched — this only ever runs on already-rendered rows.
   */
  setStickyRows(entries: ReadonlyArray<{ nodeId: string; top: number }>): void {
    const newIds = new Set(entries.map((e) => e.nodeId));

    for (const nodeId of this.stuckNodeIds) {
      if (newIds.has(nodeId)) continue;
      const prev = this.renderedRowMap.get(nodeId);
      if (prev) {
        if (prev.left) { prev.left.style.top = ''; prev.left.style.zIndex = ''; this.leftContent?.appendChild(prev.left); }
        if (prev.center) { prev.center.style.top = ''; prev.center.style.zIndex = ''; this.centerContent?.appendChild(prev.center); }
        if (prev.right) { prev.right.style.top = ''; prev.right.style.zIndex = ''; this.rightContent?.appendChild(prev.right); }
        for (const el of [prev.left, prev.center, prev.right]) el?.classList.remove('pg-row--sticky');
      }
    }
    this.stuckNodeIds = newIds;

    // Appended in order so the sticky containers' DOM order matches the
    // visual stack (shallowest ancestor first, at the top) — plus an
    // explicit `z-index`, shallowest highest, so stacking order is correct
    // by rule rather than by incidental DOM order: without it, a deeper
    // level whose push-off briefly overshoots into a shallower ancestor's
    // slot (a real risk with `stackedTop` compounding per level) would paint
    // over it instead of staying tucked behind, since later-appended
    // elements win ties on `z-index: auto` by default.
    const topLevel = entries.length;
    entries.forEach(({ nodeId, top }, i) => {
      const next = this.renderedRowMap.get(nodeId);
      if (!next) return;
      const zIndex = String(topLevel - i);
      // Inline `top` beats the RowPositionSheet stylesheet rule for this
      // same nodeId without fighting CSS specificity — reverted above by
      // clearing the inline style, which lets the stylesheet rule apply again.
      if (next.left && this.leftSticky) { next.left.style.top = `${top}px`; next.left.style.zIndex = zIndex; this.leftSticky.appendChild(next.left); }
      if (next.center && this.centerSticky) { next.center.style.top = `${top}px`; next.center.style.zIndex = zIndex; this.centerSticky.appendChild(next.center); }
      if (next.right && this.rightSticky) { next.right.style.top = `${top}px`; next.right.style.zIndex = zIndex; this.rightSticky.appendChild(next.right); }
      for (const el of [next.left, next.center, next.right]) el?.classList.add('pg-row--sticky');
    });
  }

  renderRows(
    rows: RowNode[],
    leftCols: ColumnDef[],
    centerCols: ColumnDef[],  // visible slice only
    rightCols: ColumnDef[],
    options: BodyRendererOptions = {},
  ): void {
    const cStart = options.centerColStart ?? 0;
    const cEnd = cStart + centerCols.length;

    // Resolve the hovered row BEFORE any row class is derived. `getRowClass`
    // reads `hoveredNodeId`, and the rows already sit at their post-scroll
    // positions by now (GridRenderer updates the RowPositionSheet ahead of this
    // call), so hit-testing here means recycled rows are stamped with the
    // correct hover in the same pass that repositions them — no frame where the
    // highlight is missing or stale. It also self-corrects during a row drag:
    // `.pg-grid--row-dragging .pg-row` sets `pointer-events: none`, so the hit
    // test resolves past the rows and clears the hover instead of re-applying it.
    this.refreshHoverAtPointer();

    this.lastCenterRange.start = cStart;
    this.lastCenterRange.end = cEnd;
    this.lastOptions = options;

    // A change to the row's fixed scaffolding invalidates every cached row; see
    // `lastRowShapeKey`. Doing it here, before anything else reads the cache,
    // means the rest of this method sees a clean slate and takes its ordinary
    // "brand-new row" path.
    const rowShapeKey = buildRowShapeKey(options);
    if (rowShapeKey !== this.lastRowShapeKey) {
      if (this.lastRowShapeKey !== '') this.clear();
      this.lastRowShapeKey = rowShapeKey;
    }

    // Delegated listeners resolve their ColumnDef through this map, so it has
    // to be current before any row is built or reconciled below.
    this.refreshColumnIndex(options, leftCols, centerCols, rightCols);

    const totalCenterCols = options.totalCenterCols ?? centerCols.length;
    const centerOffset = leftCols.length + cStart;
    const rightOffset  = leftCols.length + totalCenterCols;

    // ── Column-layout diff ────────────────────────────────────────────────────
    // A reorder, a pin, a hide/show, or the horizontal virtual window sliding
    // all surface here as "this panel's column ids (or its global index base)
    // differ from what is painted". Reconciling the affected rows in place is
    // what keeps a custom cell renderer — an <img> awaiting a server response, a
    // sparkline canvas, a chart — alive across the change instead of being
    // destroyed and re-created, which is what made columns visibly blink during
    // a drag.
    const spacerStartW = options.centerLeftSpacerW ?? 0;
    const spacerEndW = options.centerRightSpacerW ?? 0;
    const spacersDirty =
      this.lastSpacerW.start !== spacerStartW || this.lastSpacerW.end !== spacerEndW;

    const panelDirty = {
      left:   this.panelNeedsReconcile('left', leftCols, 0),
      center: this.panelNeedsReconcile('center', centerCols, centerOffset) || spacersDirty,
      right:  this.panelNeedsReconcile('right', rightCols, rightOffset),
    };
    const anyPanelDirty = panelDirty.left || panelDirty.center || panelDirty.right;

    const newIds = new Set(rows.map((r) => r.nodeId));

    // Remove rows no longer visible
    for (const [nodeId, ps] of this.renderedRowMap) {
      if (!newIds.has(nodeId)) {
        ps.left?.remove();
        ps.center?.remove();
        ps.right?.remove();
        this.renderedRowMap.delete(nodeId);
      }
    }

    const leftFrag = document.createDocumentFragment();
    const centerFrag = document.createDocumentFragment();
    const rightFrag = document.createDocumentFragment();

    /** Rows whose adopted Virtual DOM cell map no longer describes their DOM. */
    let readoptIds: string[] | null = null;

    // Which side panels a data row must have. A panel appearing or disappearing
    // (the first column pinned left, the last one unpinned) changes the row's
    // *shape*, not just its cells, so those rows are rebuilt rather than
    // reconciled — there is no element to reconcile into.
    const needsLeft = !!(this.leftContent && (options.showCheckboxes || options.showSerialNumber || leftCols.length > 0));
    const needsRight = !!(this.rightContent && rightCols.length > 0);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Display position for serial numbers AND row-shading parity. Must be the
      // row's ABSOLUTE index in the visible-row list (`row.rowIndex`, assigned by
      // RowModel.layoutNodes), NOT the loop counter `i` — `rows` here is only the
      // virtualized window slice, so `i` restarts at 0 on every render and would
      // make serials reset to 1 (and stripe parity flip) whenever the grid scrolls.
      const displayIndex = row.rowIndex;
      let existing = this.renderedRowMap.get(row.nodeId);

      // Group header and footer rows carrying aggregated values must be fully
      // rebuilt on every pipeline run so that updated aggregations (e.g. after
      // filtering) are reflected in the DOM rather than served from the stale cache.
      //
      // The same rebuild is the correct answer for ANY non-data row whose
      // columns changed: their cells are derived from aggregates and group
      // metadata rather than from `row.data`, so there is no per-column renderer
      // state worth preserving and no blink to avoid.
      const shapeChanged =
        !!existing &&
        row.type !== 'detail' &&
        (needsLeft !== (existing.left !== null) || needsRight !== (existing.right !== null));
      const rebuildForColumns =
        anyPanelDirty && row.type !== 'data' && row.type !== 'detail';
      if (
        existing &&
        ((row.type === 'group' || row.type === 'group-footer') && row.aggregatedValues ||
          rebuildForColumns ||
          shapeChanged)
      ) {
        existing.left?.remove();
        existing.center?.remove();
        existing.right?.remove();
        this.renderedRowMap.delete(row.nodeId);
        this.vdom.evict([row.nodeId]);
        existing = undefined;
      }

      if (existing && row.type === 'detail') {
        // Detail rows never have panel DOM (see buildPanelRow) — their
        // `center` is permanently null by design, not because a column-range
        // change invalidated it. Without this check the branch below would
        // mistake that for "needs rebuilding" on every single render pass
        // and spuriously build real cell content for a row type that must
        // never appear in these panels at all.
      } else if (existing) {
        // Normal update — every panel of this row is already in the DOM.
        this.updatePanelRow(existing, row, displayIndex, options);

        if (anyPanelDirty) {
          let needsReadopt = false;
          if (panelDirty.left && existing.left) {
            needsReadopt =
              this.reconcilePanelCells(existing.left, row, 'left', leftCols, 0, options)
                .needsReadopt || needsReadopt;
          }
          if (panelDirty.center && existing.center) {
            needsReadopt =
              this.reconcilePanelCells(existing.center, row, 'center', centerCols, centerOffset, options)
                .needsReadopt || needsReadopt;
          }
          if (panelDirty.right && existing.right) {
            needsReadopt =
              this.reconcilePanelCells(existing.right, row, 'right', rightCols, rightOffset, options)
                .needsReadopt || needsReadopt;
          }
          if (needsReadopt) (readoptIds ??= []).push(row.nodeId);
        }
      } else {
        // Entirely new row
        const ps = this.buildPanelRow(row, displayIndex, leftCols, centerCols, rightCols, centerOffset, rightOffset, options);
        this.renderedRowMap.set(row.nodeId, ps);
        if (ps.left) leftFrag.appendChild(ps.left);
        if (ps.center) centerFrag.appendChild(ps.center);
        if (ps.right) rightFrag.appendChild(ps.right);
      }
    }

    if (this.leftContent) this.leftContent.appendChild(leftFrag);
    this.centerContent?.appendChild(centerFrag);
    if (this.rightContent) this.rightContent.appendChild(rightFrag);

    if (readoptIds) this.vdom.evict(readoptIds);

    this.commitPanelColumns('left', leftCols, 0);
    this.commitPanelColumns('center', centerCols, centerOffset);
    this.commitPanelColumns('right', rightCols, rightOffset);
    this.lastSpacerW.start = spacerStartW;
    this.lastSpacerW.end = spacerEndW;

    // Freshly-built rows only carry `pg-row--selected` (from `row.selected`);
    // recompute the block-outline edge classes for the new window.
    this.serialColumnSelection = !!options.serialColumnSelection;
    this.refreshRowSelectionEdges();

    // Rows just moved under the (possibly stationary) pointer. The pre-pass at
    // the top of this method already stamped `pg-row--hover` into every row's
    // className, so this second hit-test only catches the case where appending
    // the fragments above changed what sits under the cursor (a row entering
    // the window at the pointer's exact position). `setHoveredRow` early-returns
    // when the target is unchanged, so this is a single `elementFromPoint` in
    // the common case and a no-op when the pointer is outside the body.
    this.refreshHoverAtPointer();

    // Adopt the freshly painted window into the Virtual DOM. This is the one
    // moment the DOM is guaranteed to agree with the data, so it is where the
    // baseline values for future diffs are recorded.
    this.syncVirtualDom(rows, options);
  }

  // ─── Column reconciliation ──────────────────────────────────────────────────

  /**
   * Refreshes {@link colDefById} for the columns reachable from a rendered cell.
   *
   * Prefers `allLeafColumns` (which also carries columns hidden by horizontal
   * virtualization) and falls back to the three panel slices when the caller did
   * not supply it.
   */
  private refreshColumnIndex(
    options: BodyRendererOptions,
    leftCols: readonly ColumnDef[],
    centerCols: readonly ColumnDef[],
    rightCols: readonly ColumnDef[],
  ): void {
    this.colDefById.clear();
    const all = options.allLeafColumns;
    if (all && all.length > 0) {
      for (let i = 0; i < all.length; i++) this.colDefById.set(all[i].colId, all[i]);
      return;
    }
    for (const cols of [leftCols, centerCols, rightCols]) {
      for (let i = 0; i < cols.length; i++) this.colDefById.set(cols[i].colId, cols[i]);
    }
  }

  /**
   * Resolves a clicked cell's `ColumnDef` from its `data-col-id`.
   *
   * @param colId - Value of the cell's `data-col-id` attribute.
   * @param row   - Row the cell belongs to, used to pick the auto-group variant.
   */
  private resolveCellColumn(
    colId: string,
    row: RowNode,
    options: BodyRendererOptions,
  ): ColumnDef | null {
    const col = this.colDefById.get(colId);
    if (col) return col;
    if (colId !== AUTO_GROUP_COL_ID) return null;
    // For the virtual auto-group column:
    //   • data rows          → the real leaf group ColumnDef (supports editing)
    //   • group/footer rows  → the non-editable sentinel (editing blocked at startCellEdit)
    return row.type === 'data' ? (options.leafGroupColDef ?? null) : GROUP_LABEL_COL_DEF;
  }

  /**
   * `true` when a panel's painted columns no longer match the requested ones.
   *
   * Compares the global index base as well as the id sequence: a change to the
   * number of columns in an earlier panel shifts every `data-col-index` in this
   * one even though its own ids are untouched.
   */
  private panelNeedsReconcile(
    panel: 'left' | 'center' | 'right',
    cols: readonly ColumnDef[],
    colOffset: number,
  ): boolean {
    if (this.lastPanelColOffset[panel] !== colOffset) return true;
    const prev = this.lastPanelColIds[panel];
    if (prev.length !== cols.length) return true;
    for (let i = 0; i < cols.length; i++) {
      if (prev[i] !== cols[i].colId) return true;
    }
    return false;
  }

  /** Records the columns just painted into a panel, reusing the stored array. */
  private commitPanelColumns(
    panel: 'left' | 'center' | 'right',
    cols: readonly ColumnDef[],
    colOffset: number,
  ): void {
    const target = this.lastPanelColIds[panel];
    target.length = cols.length;
    for (let i = 0; i < cols.length; i++) target[i] = cols[i].colId;
    this.lastPanelColOffset[panel] = colOffset;
  }

  /**
   * Brings one already-rendered panel row's data cells in line with a new
   * ordered column list, **without rebuilding the row**.
   *
   * Every column that survives keeps its exact cell element — and with it the
   * DOM produced by a custom renderer, an in-flight `<img>`, a `<canvas>` a
   * sparkline has already painted, an open editor, and the focus ring. Only
   * columns that genuinely entered the layout get a new element, and only
   * columns that genuinely left it are detached.
   *
   * Cells are placed with a single right-to-left pass anchored on the trailing
   * virtual-scroll spacer, so a cell that is already in the right place costs a
   * sibling comparison and no DOM write at all: reordering *n* columns by one
   * position moves one node, not *n*.
   *
   * @param rowEl     - The panel's row element.
   * @param row       - Row being reconciled (always a `'data'` row).
   * @param panel     - Which panel `rowEl` belongs to.
   * @param cols      - Columns this panel must show, in display order.
   * @param colOffset - Global index of this panel's first column.
   * @returns Whether any cell element was created or detached.
   */
  private reconcilePanelCells(
    rowEl: HTMLElement,
    row: RowNode,
    panel: 'left' | 'center' | 'right',
    cols: readonly ColumnDef[],
    colOffset: number,
    options: BodyRendererOptions,
  ): CellReconcileResult {
    // Index the cells currently in the row. The auto-group cell carries a
    // data-col-id but belongs to no panel column list, so it is skipped here and
    // therefore never treated as a departed column.
    const present = new Map<string, HTMLElement>();
    let anchor: Node | null = null;
    for (let el = rowEl.firstElementChild; el !== null; el = el.nextElementSibling) {
      const cellEl = el as HTMLElement;
      if (panel === 'center') {
        // Spacer widths encode the columns scrolled off either side; they move
        // with the virtual window, so refresh them while the row is walked.
        if (cellEl.classList.contains(SPACER_START_CLASS)) {
          this.sizeSpacer(cellEl, options.centerLeftSpacerW ?? 0);
          continue;
        }
        if (cellEl.classList.contains(SPACER_END_CLASS)) {
          this.sizeSpacer(cellEl, options.centerRightSpacerW ?? 0);
          anchor = cellEl;
          continue;
        }
      }
      const colId = cellEl.getAttribute('data-col-id');
      if (colId !== null && colId !== AUTO_GROUP_COL_ID) present.set(colId, cellEl);
    }

    let needsReadopt = false;

    // Right-to-left so each cell is inserted before the one that must follow it;
    // `next` walks backwards through the target order and doubles as the
    // "already correctly placed" test.
    let next: Node | null = anchor;
    for (let i = cols.length - 1; i >= 0; i--) {
      const col = cols[i];
      const colIndex = colOffset + i;
      let cellEl = present.get(col.colId);

      if (cellEl) {
        present.delete(col.colId);
        // A reorder changes a surviving cell's position in the grid, which is
        // the coordinate every selection, keyboard-navigation and clipboard
        // lookup keys off — and which the Virtual DOM recorded when it adopted
        // the cell, so a change here invalidates that record too.
        if (cellEl.getAttribute('data-col-index') !== String(colIndex)) {
          cellEl.setAttribute('data-col-index', String(colIndex));
          needsReadopt = true;
        }
      } else {
        cellEl = this.buildDataCell(row, col, colIndex, options);
        needsReadopt = true;
      }

      if (cellEl.nextSibling !== next || cellEl.parentNode !== rowEl) {
        rowEl.insertBefore(cellEl, next);
      }
      next = cellEl;
    }

    // Whatever is left never appeared in the target order — it scrolled out of
    // the horizontal window, was hidden, or moved to another panel.
    for (const stale of present.values()) {
      stale.remove();
      needsReadopt = true;
    }

    return { needsReadopt };
  }

  /** Applies a virtual-scroll spacer's pixel width without touching its class list. */
  private sizeSpacer(el: HTMLElement, width: number): void {
    el.style.width = `${width}px`;
    el.style.minWidth = `${width}px`;
  }

  /**
   * Reconciles the Virtual DOM with the rows currently in the DOM.
   *
   * Rows whose panel elements were reused keep their recorded cells, so a pure
   * scroll costs a map write per row and nothing else.
   *
   * @param rows    - Rows in the current render window.
   * @param options - Render options carrying the column list and formatting.
   */
  private syncVirtualDom(rows: RowNode[], options: BodyRendererOptions): void {
    const ctx = this.buildVDomContext(options);
    if (!ctx) return;

    this.syncRefs.length = 0;
    for (let i = 0; i < rows.length; i++) {
      const ps = this.renderedRowMap.get(rows[i].nodeId);
      if (!ps) continue;
      this.syncRefs.push({ row: rows[i], left: ps.left, center: ps.center, right: ps.right });
    }
    this.vdom.sync(this.syncRefs, ctx);
    this.syncRefs.length = 0;
  }

  /**
   * Builds the render context the Virtual DOM needs to reproduce a cell exactly
   * as the initial render produced it.
   *
   * Returns `null` when the column list is unavailable — the diff has nothing
   * to resolve against and must be skipped rather than guessed at.
   */
  private buildVDomContext(options: BodyRendererOptions): VDomRenderContext | null {
    const columns = options.allLeafColumns;
    if (!columns || columns.length === 0) return null;

    const columnsById = new Map<string, ColumnDef>();
    for (let i = 0; i < columns.length; i++) columnsById.set(columns[i].colId, columns[i]);

    return {
      columnsById,
      dateFormat: options.dateFormat,
      timeZone: options.timeZone,
      currencySymbol: options.currencySymbol,
      locale: options.locale,
      api: options.api ?? null,
      editingEnabled: options.editingEnabled,
    };
  }

  /**
   * Diffs rendered rows against their last-rendered values and writes only the
   * cells that changed.
   *
   * This is the real-time update path: no row is rebuilt, no cell element is
   * replaced, and every piece of cell state (focus, open editor, selection,
   * hover, custom-renderer DOM) survives untouched.
   *
   * @param nodeIds - Rows to diff, or `null` for the whole viewport.
   * @param options - Render options carrying the column list and formatting.
   * @returns The number of cells written to the DOM.
   */
  patchCells(nodeIds: Iterable<string> | null, options: BodyRendererOptions): number {
    const ctx = this.buildVDomContext(options);
    if (!ctx) return 0;
    return this.vdom.patchRows(nodeIds, ctx);
  }

  /** `true` when the row is currently rendered and tracked by the Virtual DOM. */
  isRowRendered(nodeId: string): boolean {
    return this.vdom.has(nodeId);
  }

  /** Virtual DOM counters — see {@link VDomStats}. */
  getVDomStats(): VDomStats {
    return this.vdom.getStats();
  }

  /** Zeroes the Virtual DOM counters without discarding the tracked tree. */
  resetVDomStats(): void {
    this.vdom.resetStats();
  }

  /**
   * Recomputes the row-selection block outline. For each rendered row it toggles
   * the `pg-row--sel-*` edge classes so the primary-coloured border (rows.css)
   * traces only the *outer* boundary of each contiguous selected run —
   * top/bottom where the run starts/ends, left/right on the block's outermost
   * panel parts. Neighbour checks use the full `visibleRows` (via `rowIndex`) so
   * runs extending beyond the virtualised window don't sprout interior lines.
   *
   * Only active when the serial-column selection feature is enabled; plain
   * checkbox selection keeps its background-only highlight.
   */
  refreshRowSelectionEdges(): void {
    if (!this.serialColumnSelection) return;
    const visible = this.store.get('visibleRows') as RowNode[];
    const selectedIds = this.store.get('selectedRowIds') as Set<string>;
    const indexById = new Map<string, number>();
    // `visible` is sparse under a demand-loading row model; unloaded indices
    // simply do not participate in the selection-edge calculation.
    for (let i = 0; i < visible.length; i++) {
      const node = visible[i];
      if (node) indexById.set(node.nodeId, i);
    }

    for (const [nodeId, ps] of this.renderedRowMap) {
      const parts = [ps.left, ps.center, ps.right].filter((e): e is HTMLElement => e !== null);
      const selected = selectedIds.has(nodeId);
      let top = false;
      let bottom = false;
      if (selected) {
        const i = indexById.get(nodeId);
        if (i !== undefined) {
          const prevId = visible[i - 1]?.nodeId;
          const nextId = visible[i + 1]?.nodeId;
          top = !prevId || !selectedIds.has(prevId);
          bottom = !nextId || !selectedIds.has(nextId);
        }
      }
      const leftmost = ps.left ?? ps.center;
      const rightmost = ps.right ?? ps.center;
      for (const el of parts) {
        toggleClass(el, 'pg-row--sel-top', selected && top);
        toggleClass(el, 'pg-row--sel-bottom', selected && bottom);
        toggleClass(el, 'pg-row--sel-edge-left', selected && el === leftmost);
        toggleClass(el, 'pg-row--sel-edge-right', selected && el === rightmost);
      }
    }
  }

  updateRowSelection(nodeId: string, selected: boolean): void {
    const ps = this.renderedRowMap.get(nodeId);
    if (!ps) return;
    const els = [ps.left, ps.center, ps.right].filter((e): e is HTMLElement => e !== null);
    for (const el of els) {
      toggleClass(el, 'pg-row--selected', selected);
      // Scoped by `[data-node-id]` for the same reason as the click handler:
      // a `boolean` column's cell checkbox must not be driven by row selection.
      const cb = el.querySelector<HTMLInputElement>('.pg-checkbox[data-node-id]');
      if (cb) cb.checked = selected;
      // Keep the serial-column selection entry's ARIA state in sync.
      const serial = el.querySelector<HTMLElement>('.pg-cell--serial-select');
      if (serial) serial.setAttribute('aria-selected', selected ? 'true' : 'false');
    }
  }

  /**
   * Advances the tracked virtual-column range without touching any DOM.
   *
   * Call this when the column range has logically changed but the body rows must
   * NOT be rebuilt — specifically during an active column resize, where
   * `ColumnStyleManager` has already re-sized every cell through CSS. The next
   * ordinary `renderRows` reconciles whatever the range actually became, in
   * place, so nothing here needs to anticipate it.
   *
   * @param cStart - New first visible center-column index.
   * @param cEnd   - New last visible center-column index (exclusive).
   */
  syncCenterRange(cStart: number, cEnd: number): void {
    this.lastCenterRange.start = cStart;
    this.lastCenterRange.end = cEnd;
  }

  clear(): void {
    for (const ps of this.renderedRowMap.values()) {
      ps.left?.remove();
      ps.center?.remove();
      ps.right?.remove();
    }
    this.renderedRowMap.clear();
    // The virtual tree must never outlive the elements it references.
    this.vdom.clear();
    this.lastCenterRange.start = -1;
    this.lastCenterRange.end = -1;
    this.lastSpacerW.start = -1;
    this.lastSpacerW.end = -1;
    // No row DOM survives, so nothing is left to reconcile against — the next
    // render must treat every panel as freshly built rather than diffing
    // against columns that are no longer painted anywhere.
    for (const panel of ['left', 'center', 'right'] as const) {
      this.lastPanelColIds[panel].length = 0;
      this.lastPanelColOffset[panel] = -1;
    }
  }

  /**
   * Evicts only the specified rows from the render cache so they are fully
   * rebuilt on the next paint cycle.  Rows whose `nodeId` is not in the set
   * are untouched — their DOM is reused as-is, so custom cell renderers
   * (images, flags, progress bars, etc.) are NOT re-executed for them.
   *
   * Use this instead of `clear()` after in-place data mutations (fill, cut,
   * paste, undo/redo) where only a known subset of rows changed.
   *
   * @param nodeIds - Set of row node IDs whose cache entries should be evicted.
   */
  invalidateRowsByNodeId(nodeIds: Set<string>): void {
    for (const nodeId of nodeIds) {
      const ps = this.renderedRowMap.get(nodeId);
      if (ps) {
        ps.left?.remove();
        ps.center?.remove();
        ps.right?.remove();
        this.renderedRowMap.delete(nodeId);
      }
    }
    // Drop the same rows from the virtual tree so it never points at detached
    // elements; they are re-adopted when the next render rebuilds them.
    this.vdom.evict(nodeIds);
  }

  destroy(): void {
    this.clear();
  }

  /**
   * The live render cache: `nodeId` → the row's per-panel DOM parts.
   *
   * Exposed read-only for `RowAnimator`, which needs the exact elements that
   * currently represent each row. Handing over this map means the animator does
   * no `querySelectorAll` of its own, and — because these are the same reused
   * nodes across renders — it also guarantees the FLIP operates on DOM that
   * survived the sort rather than on freshly-built replacements.
   */
  getRenderedRows(): ReadonlyMap<string, { left: HTMLElement | null; center: HTMLElement | null; right: HTMLElement | null }> {
    return this.renderedRowMap;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private buildPanelRow(
    row: RowNode,
    displayIndex: number,
    leftCols: ColumnDef[],
    centerCols: ColumnDef[],
    rightCols: ColumnDef[],
    centerOffset: number,
    rightOffset: number,
    options: BodyRendererOptions,
  ): PanelRowSet {
    // Detail rows render exclusively in `DetailRowRenderer`'s full-width overlay
    // layer — they occupy a slot in `visibleRows` (for height/virtualization
    // bookkeeping) but must not produce any left/center/right panel DOM.
    if (row.type === 'detail') return { left: null, center: null, right: null };

    const hasLeft = !!(this.leftContent && (options.showCheckboxes || options.showSerialNumber || leftCols.length > 0));
    const hasRight = !!(this.rightContent && rightCols.length > 0);

    const left   = hasLeft  ? this.buildSingleRow(row, displayIndex, 'left',   leftCols,   0,            options) : null;
    const center =             this.buildSingleRow(row, displayIndex, 'center', centerCols, centerOffset, options);
    const right  = hasRight ? this.buildSingleRow(row, displayIndex, 'right',  rightCols,  rightOffset,  options) : null;

    return { left, center, right };
  }

  private buildSingleRow(
    row: RowNode,
    displayIndex: number,
    panel: 'left' | 'center' | 'right',
    cols: ColumnDef[],
    colOffset: number,
    options: BodyRendererOptions,
  ): HTMLElement {
    const el = createDiv(this.getRowClass(row, displayIndex, options));
    el.setAttribute('role', 'row');
    el.setAttribute('data-node-id', row.nodeId);
    el.setAttribute('data-row-index', String(row.rowIndex));
    el.setAttribute('data-panel', panel);

    if (row.type === 'group' || row.type === 'group-footer') {
      el.setAttribute('data-level', String(row.level));

      if (panel === 'center') {
        // Left virtual spacer (mirrors the data-row spacer for correct scroll alignment)
        el.appendChild(this.buildSpacer(SPACER_START_CLASS, options.centerLeftSpacerW ?? 0));
        if (row.type === 'group') {
          this.buildGroupRowContent(el, row, options);
        } else {
          this.buildGroupFooterContent(el, row, options);
        }
      }

      // Render one cell per column — shows the aggregated value for agg-eligible
      // columns, empty for all others (maintains column alignment with data rows).
      this.buildGroupAggregateCells(el, row, cols, colOffset, options);

      if (panel === 'center') {
        // Right virtual spacer
        el.appendChild(this.buildSpacer(SPACER_END_CLASS, options.centerRightSpacerW ?? 0));
      }

      this.attachRowListeners(el, row);
      return el;
    }

    if (options.treeData && row.type === 'data') {
      el.setAttribute('data-level', String(row.level));
    }

    if (panel === 'left') {
      if (options.showSerialNumber) {
        el.appendChild(this.cellRenderer.renderSerialNumberCell(row, displayIndex + 1, !!options.serialColumnSelection));
      }
      if (options.showCheckboxes) {
        el.appendChild(this.cellRenderer.renderCheckboxCell(row, row.rowIndex));
      }
    }

    if (panel === 'center') {
      // Left virtual spacer (columns scrolled off to the left)
      el.appendChild(this.buildSpacer(SPACER_START_CLASS, options.centerLeftSpacerW ?? 0));

      if (options.showGroupsColumn) {
        this.buildLeafGroupCell(el, row, options);
      }
    }

    for (let i = 0; i < cols.length; i++) {
      el.appendChild(this.buildDataCell(row, cols[i], colOffset + i, options));
    }

    if (panel === 'center') {
      // Right virtual spacer (columns scrolled off to the right)
      el.appendChild(this.buildSpacer(SPACER_END_CLASS, options.centerRightSpacerW ?? 0));
    }

    this.attachRowListeners(el, row);
    return el;
  }

  /**
   * Builds one data-row cell, fully decorated.
   *
   * Shared by the initial row build and by {@link reconcilePanelCells} so a cell
   * created because its column just entered the layout is byte-for-byte the same
   * element the initial render would have produced — there is no second, subtly
   * different construction path to drift.
   *
   * @param row      - Row the cell belongs to.
   * @param col      - Column being rendered.
   * @param colIndex - Global column index across all panels.
   */
  private buildDataCell(
    row: RowNode,
    col: ColumnDef,
    colIndex: number,
    options: BodyRendererOptions,
  ): HTMLElement {
    const cellEl = this.cellRenderer.renderCell({
      row,
      colDef: col,
      rowIndex: row.rowIndex,
      colIndex,
      iconRenderer: this.iconRenderer,
      dateFormat: options.dateFormat,
      timeZone: options.timeZone,
      currencySymbol: options.currencySymbol,
      locale: options.locale,
      api: options.api ?? null,
      editingEnabled: options.editingEnabled,
    });
    if (options.showVerticalBorders) cellEl.classList.add('pg-cell--v-border');
    if (col.rowDrag && row.type !== 'summary') {
      const handle = createDiv('pg-row-drag-handle');
      handle.setAttribute('data-row-drag', '');
      handle.setAttribute('data-drag-label', String(row.data[col.field] ?? ''));
      handle.innerHTML = this.iconRenderer.renderToString('drag', 14);
      const inner = cellEl.querySelector<HTMLElement>('.pg-cell__inner');
      if (inner) {
        inner.insertBefore(handle, inner.firstChild);
      } else {
        cellEl.insertBefore(handle, cellEl.firstChild);
      }
    }
    this.applyMasterDetailToggle(cellEl, row, col, options);
    applyTreeToggle(cellEl, row, col, options.treeData, this.iconRenderer, this.eventBus);
    return cellEl;
  }

  /**
   * Builds a horizontal virtual-scroll spacer.
   *
   * Always emitted — even at zero width — so {@link reconcilePanelCells} has a
   * stable anchor to position cells against and a stable element to re-size when
   * the window moves, instead of having to synthesise one mid-reconcile.
   *
   * @param markerClass - {@link SPACER_START_CLASS} or {@link SPACER_END_CLASS}.
   * @param width       - Combined px width of the columns this spacer stands in for.
   */
  private buildSpacer(markerClass: string, width: number): HTMLElement {
    const sp = createDiv(`pg-cell--h-spacer ${markerClass}`);
    sp.style.cssText = `width:${width}px;min-width:${width}px;flex-shrink:0;`;
    return sp;
  }

  /**
   * Renders the auto-group column cell for a **leaf data row**.
   *
   * When `options.leafGroupColDef` is set (i.e. grouping is active), this cell
   * shows the row's actual value for the deepest grouping field and participates
   * fully in cell selection (colIndex −1), keyboard navigation, editing, and
   * copy/cut/paste — behaving exactly like any normal data cell.
   *
   * When `leafGroupColDef` is absent (no grouping active) a non-interactive
   * spacer cell is rendered to maintain column alignment with group header rows.
   *
   * @param el      - Row container element to append the cell into.
   * @param row     - Leaf data `RowNode` being rendered.
   * @param options - Renderer options; `autoGroupColWidth` controls cell width.
   */
  private buildLeafGroupCell(el: HTMLElement, row: RowNode, options: BodyRendererOptions): void {
    const w = options.autoGroupColWidth ?? 200;
    const colDef = options.leafGroupColDef;

    if (!colDef) {
      // Grouping inactive — plain spacer keeps the layout aligned.
      const spacer = createDiv('pg-cell pg-cell--auto-group-spacer');
      spacer.style.width = `${w}px`;
      spacer.style.minWidth = `${w}px`;
      el.appendChild(spacer);
      return;
    }

    // Full interactive cell: rendered through CellRenderer so it inherits all
    // type-aware formatting, selection borders, editor wiring, etc.
    const cellEl = this.cellRenderer.renderCell({
      row,
      colDef,
      rowIndex: row.rowIndex,
      colIndex: -1,   // virtual auto-group column index
      iconRenderer: this.iconRenderer,
      dateFormat: options.dateFormat,
      timeZone: options.timeZone,
      currencySymbol: options.currencySymbol,
      locale: options.locale,
      api: options.api ?? null,
      editingEnabled: options.editingEnabled,
    });

    // Override to virtual group column identity so selection/keyboard navigation
    // and clipboard logic treat this cell as colIndex −1 uniformly across all row
    // types (group header, group footer, leaf data).
    cellEl.setAttribute('data-col-index', '-1');
    cellEl.setAttribute('data-col-id', '__group__');
    cellEl.style.width = `${w}px`;
    cellEl.style.minWidth = `${w}px`;
    cellEl.style.flex = 'none';
    el.appendChild(cellEl);
  }

  private buildGroupRowContent(el: HTMLElement, row: RowNode, options: BodyRendererOptions): void {
    // pg-cell is added so applySelectionClasses can highlight this cell and
    // keyboard navigation / Ctrl+C works on it (colIndex −1 = auto-group column).
    const cell = createDiv('pg-cell pg-row-group__cell');
    cell.setAttribute('data-row-index', String(row.rowIndex));
    cell.setAttribute('data-col-index', '-1');
    cell.setAttribute('data-col-id', '__group__');
    cell.setAttribute('role', 'gridcell');

    // Fix the label cell to the auto-group column width so that the aggregate
    // value cells that follow it sit exactly under their column headers.
    // This mirrors the pg-cell--auto-group-spacer used in data rows.
    const groupColW = options.autoGroupColWidth ?? 200;
    cell.style.width = `${groupColW}px`;
    cell.style.minWidth = `${groupColW}px`;
    cell.style.flex = 'none';

    // Toggle button is a themed wrapper div; the icon lives inside it.
    // This keeps the button's CSS sizing free from the icon renderer's inline style.
    const toggleBtn = createDiv('pg-row-group__toggle');
    toggleBtn.setAttribute('role', 'button');
    toggleBtn.setAttribute('aria-label', row.expanded ? 'Collapse group' : 'Expand group');
    const toggleIcon = this.iconRenderer.render(row.expanded ? 'chevronDown' : 'chevronRight', { size: 16 });
    toggleBtn.appendChild(toggleIcon);

    const label = createDiv('pg-row-group__label');

    const groupColDef = options.allLeafColumns?.find((c) => c.field === row.groupField);
    const groupFn = groupColDef ? resolveColumnRenderer(groupColDef, 'group') : undefined;
    if (groupColDef && groupFn) {
      const rendered = groupFn({
        row,
        colDef: groupColDef,
        groupValue: row.groupValue,
        childCount: row.childCount ?? 0,
        collapsed: !row.expanded,
        api: null,
      });
      if (typeof rendered === 'string') label.innerHTML = rendered;
      else label.appendChild(rendered);
    } else {
      label.textContent = String(row.groupValue + ' (' + row.childCount + ')');
    }

    // const countBadge = createDiv('pg-row-group__count');
    // countBadge.textContent = String(row.childCount ?? 0);

    cell.appendChild(toggleBtn);
    cell.appendChild(label);
    // cell.appendChild(countBadge);
    el.appendChild(cell);

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.eventBus.emit(GridEventType.ROW_GROUP_OPENED, { groupKey: row.groupKey });
    });
  }

  /**
   * Builds the label cell for a group **footer** row.
   *
   * Unlike the header, there is no expand/collapse toggle — the cell shows
   * a Σ-prefixed group value to signal "total for this group".
   * The cell participates in cell selection (colIndex −1) identically to the
   * group header's label cell.
   */
  private buildGroupFooterContent(el: HTMLElement, row: RowNode, options: BodyRendererOptions): void {
    const cell = createDiv('pg-cell pg-row-group__cell');
    cell.setAttribute('data-row-index', String(row.rowIndex));
    cell.setAttribute('data-col-index', '-1');
    cell.setAttribute('data-col-id', '__group__');
    cell.setAttribute('role', 'gridcell');

    const groupColW = options.autoGroupColWidth ?? 200;
    cell.style.width = `${groupColW}px`;
    cell.style.minWidth = `${groupColW}px`;
    cell.style.flex = 'none';

    const label = createDiv('pg-row-group__label');
    label.textContent = `Σ ${String(row.groupValue ?? '')}`;
    cell.appendChild(label);
    el.appendChild(cell);
  }

  /**
   * Append one `pg-cell` per column to `el` for a group row.
   *
   * - Columns with `type === 'currency'` **and** `aggFunc` set receive a
   *   `pg-cell--agg` cell showing the formatted aggregate value.
   * - All other columns receive an empty `pg-cell` to maintain column
   *   alignment with data rows.
   *
   * Column widths are automatically applied by the {@link ColumnStyleManager}
   * via the `[data-col-id]` CSS rules — no inline width needed here.
   */
  private buildGroupAggregateCells(
    el: HTMLElement,
    row: RowNode,
    cols: ColumnDef[],
    colOffset: number,
    options: BodyRendererOptions,
  ): void {
    const aggValues = row.aggregatedValues;

    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const isAggCol = (col.type === 'currency' || col.type === 'number') && col.aggFunc != null;
      const aggVal = isAggCol && aggValues ? aggValues[col.field] : undefined;
      const hasValue = aggVal != null;

      const cell = createDiv(hasValue ? 'pg-cell pg-cell--agg' : 'pg-cell');
      cell.setAttribute('data-row-index', String(row.rowIndex));
      cell.setAttribute('data-col-index', String(colOffset + i));
      cell.setAttribute('data-col-id', col.colId);
      cell.setAttribute('role', 'gridcell');

      if (hasValue) {
        const align = col.textAlign ?? 'right';
        if (align !== 'left') cell.classList.add(`pg-cell--align-${align}`);
        if (options.showVerticalBorders) cell.classList.add('pg-cell--v-border');

        const inner = createDiv('pg-cell__inner');
        const summaryFn = resolveColumnRenderer(col, 'summary');
        if (summaryFn) {
          const rendered = summaryFn({
            colDef: col,
            value: aggVal,
            aggregation: col.aggFunc!,
            label: col.summaryLabel,
            api: null,
          });
          if (typeof rendered === 'string') inner.innerHTML = rendered;
          else inner.appendChild(rendered);
        } else {
          const span = document.createElement('span');
          span.className = 'pg-cell__value';
          span.textContent = this.formatAggValue(aggVal, col, options);
          inner.appendChild(span);
        }
        cell.appendChild(inner);
      }

      el.appendChild(cell);
    }
  }

  /**
   * Format a computed aggregate value for display.
   *
   * - For `count` the value is emitted as a plain integer string.
   * - For all other functions the value is routed through {@link formatValue}
   *   so the column's currency symbol, locale, and precision are applied.
   *
   * @param value   - Raw numeric aggregate result.
   * @param col     - Column definition (used for type and formatting options).
   * @param options - Renderer options (locale, currency symbol, etc.).
   */
  private formatAggValue(
    value: unknown,
    col: ColumnDef,
    options: BodyRendererOptions,
  ): string {
    if (col.aggFunc === 'count') {
      return String(typeof value === 'number' ? Math.round(value) : value ?? '');
    }
    const num = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    if (!isFinite(num)) return '—';
    return (
      formatValue(num, col, {
        locale: options.locale,
        currencySymbol: options.currencySymbol,
        dateFormat: options.dateFormat,
        timeZone: options.timeZone,
      }) || '—'
    );
  }

  private updatePanelRow(
    ps: PanelRowSet,
    row: RowNode,
    displayIndex: number,
    options: BodyRendererOptions,
  ): void {
    const cls = this.getRowClass(row, displayIndex, options);
    const els = [ps.left, ps.center, ps.right].filter((e): e is HTMLElement => e !== null);
    const rowIndexStr = String(row.rowIndex);
    for (const el of els) {
      el.className = cls;
      el.setAttribute('data-row-index', rowIndexStr);
      if (row.type === 'group') el.setAttribute('data-level', String(row.level));
      if (options.treeData && row.type === 'data') el.setAttribute('data-level', String(row.level));

      // Re-stamp every cell's own `data-row-index` too. Cells set it at build
      // time and are reused across renders — but a row's index can shift while
      // its cached DOM is kept (e.g. a Master/Detail detail row being injected
      // above it, or a group expanding). Selection/keyboard/clipboard all match
      // cells by this attribute, so leaving it stale silently breaks cell
      // selection on any row whose index moved without a full rebuild.
      const cells = el.querySelectorAll<HTMLElement>('.pg-cell[data-row-index]');
      for (const cell of cells) cell.setAttribute('data-row-index', rowIndexStr);
    }

    // Keep the serial-number cell in sync. Its value is a display POSITION
    // (`displayIndex + 1`), not row data, so it can change on any re-render that
    // reuses this cached DOM — scrolling the virtual window, sorting, filtering,
    // deleting a row above, or a drag-reorder — none of which rebuild the row.
    // Without this the serial would keep the value baked in when the row was
    // first built and silently drift out of order.
    if (options.showSerialNumber && ps.left) {
      const serial = ps.left.querySelector<HTMLElement>('.pg-cell__serial');
      if (serial) serial.textContent = String(displayIndex + 1);
    }

    // Sync expand/collapse icon — expanded state can change without a full row rebuild.
    // Footer rows have no toggle button so the querySelector guard handles them.
    if ((row.type === 'group' || row.type === 'group-footer') && ps.center) {
      const toggleBtn = ps.center.querySelector<HTMLElement>('.pg-row-group__toggle');
      if (toggleBtn) {
        const iconEl = toggleBtn.querySelector<HTMLElement>('.pg-icon');
        if (iconEl) {
          this.iconRenderer.updateIcon(iconEl, row.expanded ? 'chevronDown' : 'chevronRight');
        }
        toggleBtn.setAttribute('aria-label', row.expanded ? 'Collapse group' : 'Expand group');
      }
    }

    // Sync the Master/Detail toggle icon — expanded state lives in
    // `store.expandedRowIds`, not on the `RowNode` itself, so it must be
    // re-read and re-applied on every update rather than baked in at build time.
    if (row.type === 'data' && options.masterDetail) {
      const isExpanded = options.masterDetail.isExpandedFn(row.nodeId);
      for (const el of els) {
        const toggleBtn = el.querySelector<HTMLElement>('.pg-detail-toggle');
        if (!toggleBtn) continue;
        const iconEl = toggleBtn.querySelector<HTMLElement>('.pg-icon');
        if (iconEl) this.iconRenderer.updateIcon(iconEl, isExpanded ? 'chevronDown' : 'chevronRight');
        toggleBtn.setAttribute('aria-label', isExpanded ? 'Collapse detail' : 'Expand detail');
      }
    }

    // Sync the Tree Data toggle icon — same reasoning as Master/Detail above:
    // expansion state lives in `expandedTreeNodeIds`, not on the `RowNode`.
    if (row.type === 'data' && options.treeData) {
      for (const el of els) syncTreeToggle(el, row, options.treeData, this.iconRenderer);
    }
  }

  /**
   * Inserts the Master/Detail expand/collapse toggle as a sibling of
   * `.pg-cell__inner` (never inside it) — `.pg-cell__inner` is wiped and
   * rebuilt wholesale by cell-edit start/stop (`GridCore.startCellEdit` /
   * `renderCellValue`), which would silently destroy a toggle placed inside it
   * the first time this column is edited.
   *
   * Rows the consumer's `hasDetail` rejects still get *something* here by
   * default: the toggle takes up real width in the cell, so omitting it
   * outright shifts that row's text left and leaves the toggle column's edge
   * ragged wherever detail-less rows sit between expandable ones. See
   * {@link EmptyDetailToggleMode} for the three ways that is resolved.
   */
  private applyMasterDetailToggle(
    cellEl: HTMLElement,
    row: RowNode,
    colDef: ColumnDef,
    options: BodyRendererOptions,
  ): void {
    const md = options.masterDetail;
    if (!md || row.type !== 'data' || colDef.colId !== md.toggleColumnId) return;

    if (!md.hasDetailFn(row.data)) {
      if (md.emptyToggleMode === EmptyDetailToggleMode.Hidden) return;
      if (md.emptyToggleMode === EmptyDetailToggleMode.Placeholder) {
        // Deliberately not `.pg-detail-toggle` — that class is the selector
        // `syncRow` and the pointerdown guard both key off, and a spacer must
        // match neither. It only mirrors the toggle's box metrics.
        const spacer = createDiv('pg-detail-toggle-placeholder');
        spacer.setAttribute('aria-hidden', 'true');
        this.insertBeforeCellInner(cellEl, spacer);
        return;
      }
      // EmptyDetailToggleMode.Interactive: falls through to the real toggle —
      // expanding it shows the empty-state message (see `DetailRowRenderer`).
    }

    const isExpanded = md.isExpandedFn(row.nodeId);
    const toggleBtn = createDiv('pg-detail-toggle');
    toggleBtn.setAttribute('role', 'button');
    toggleBtn.setAttribute('data-detail-toggle', '');
    toggleBtn.setAttribute('aria-label', isExpanded ? 'Collapse detail' : 'Expand detail');
    toggleBtn.appendChild(this.iconRenderer.render(isExpanded ? 'chevronDown' : 'chevronRight', { size: 16 }));

    this.insertBeforeCellInner(cellEl, toggleBtn);

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.eventBus.emit(GridEventType.ROW_DETAIL_TOGGLE_CLICKED, { row, colDef });
    });
  }

  /** Places `el` immediately before the cell's value wrapper, falling back to the cell's start when the wrapper has not been built yet. */
  private insertBeforeCellInner(cellEl: HTMLElement, el: HTMLElement): void {
    const inner = cellEl.querySelector<HTMLElement>('.pg-cell__inner');
    cellEl.insertBefore(el, inner ?? cellEl.firstChild);
  }

  /**
   * Delegated row listeners resolve a clicked cell's column and formatting
   * options at event time, not at build time.
   *
   * @param el  - Panel row element the listeners are delegated from.
   * @param row - Row the element represents.
   */
  private attachRowListeners(el: HTMLElement, row: RowNode): void {
    el.addEventListener('click', (e) => {
      // `[data-node-id]` narrows this to the row-selection checkbox. A `boolean`
      // column renders a checkbox of its own in an ordinary data cell, and
      // without the attribute test clicking one would toggle the row's selection
      // instead of the cell's value.
      const checkboxEl = (e.target as HTMLElement).closest('.pg-checkbox[data-node-id]');
      if (checkboxEl) {
        e.stopPropagation();
        this.rowSelectionEngine.toggleRowSelection(row.nodeId, this.store.get('allRows'));
        return;
      }
      this.eventBus.emit(GridEventType.ROW_CLICKED, { row, event: e, rowIndex: row.rowIndex });
    });

    el.addEventListener('dblclick', (e) => {
      this.eventBus.emit(GridEventType.ROW_DOUBLE_CLICKED, { row, event: e, rowIndex: row.rowIndex });
    });

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      // The Master/Detail toggle sits inside a cell but must never trigger
      // cell selection — it emits its own click event (see
      // applyMasterDetailToggle) and stops there.
      if ((e.target as HTMLElement).closest('[data-detail-toggle]')) return;
      const cellEl = (e.target as HTMLElement).closest<HTMLElement>('[data-col-index][data-col-id]');
      if (!cellEl) return;
      const globalColIndex = Number(cellEl.getAttribute('data-col-index'));
      const colDef = this.resolveCellColumn(cellEl.getAttribute('data-col-id') ?? '', row, this.lastOptions);
      if (!colDef) return;

      const emit = (ev: MouseEvent): void => {
        this.eventBus.emit(GridEventType.CELL_CLICKED, {
          row,
          colDef,
          value: null,
          rowIndex: row.rowIndex,
          colIndex: globalColIndex,
          event: ev,
        });
      };

      // Mouse/pen select immediately on press (enables drag-to-extend). Touch
      // must not: a press that becomes a swipe is a scroll, not a selection —
      // so defer to pointerup and only select if the finger stayed put (a tap).
      if (isTouchPointer(e)) {
        const sx = e.clientX;
        const sy = e.clientY;
        const cleanup = (): void => {
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', cleanup);
        };
        const onUp = (ue: PointerEvent): void => {
          cleanup();
          if (Math.abs(ue.clientX - sx) <= DRAG_THRESHOLD_TOUCH &&
              Math.abs(ue.clientY - sy) <= DRAG_THRESHOLD_TOUCH) {
            emit(ue);
          }
        };
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', cleanup);
        return;
      }

      emit(e);
    });

    el.addEventListener('contextmenu', (e) => {
      const cellEl = (e.target as HTMLElement).closest<HTMLElement>('[data-col-index][data-col-id]');
      if (!cellEl) return;
      e.preventDefault();
      const globalColIndex = Number(cellEl.getAttribute('data-col-index'));
      this.eventBus.emit(GridEventType.CELL_CONTEXT_MENU, {
        row,
        rowIndex: row.rowIndex,
        colIndex: globalColIndex,
        x: e.clientX,
        y: e.clientY,
        event: e,
      });
    });

    el.addEventListener('dblclick', (e) => {
      const cellEl = (e.target as HTMLElement).closest<HTMLElement>('[data-col-index][data-col-id]');
      if (!cellEl) return;
      const globalColIndex = Number(cellEl.getAttribute('data-col-index'));
      const colDef = this.resolveCellColumn(cellEl.getAttribute('data-col-id') ?? '', row, this.lastOptions);
      if (!colDef) return;
      this.eventBus.emit(GridEventType.CELL_DOUBLE_CLICKED, {
        row,
        colDef,
        value: null,
        rowIndex: row.rowIndex,
        colIndex: globalColIndex,
        event: e,
      });
    });
  }

  private getRowClass(row: RowNode, displayIndex: number, options: BodyRendererOptions): string {
    const cls = ['pg-row'];
    // Hover is part of the row's class *identity*, not a decoration applied
    // afterwards. Both callers of this method (buildSingleRow for brand-new
    // rows, updatePanelRow for recycled ones) assign the result to
    // `el.className` wholesale, so any class not produced here is destroyed on
    // every render pass. Deriving it from the tracked `hoveredNodeId` keeps the
    // highlight stable across the render churn of a scroll: a recycled row that
    // still sits under the pointer keeps its hover, and a row entering the
    // virtual window already under the pointer gets it on first paint rather
    // than only after the next `mousemove`.
    if (row.nodeId === this.hoveredNodeId) cls.push('pg-row--hover');
    if (row.selected) cls.push('pg-row--selected');
    if (row.type === 'group') cls.push('pg-row--group');
    if (row.type === 'group-footer') cls.push('pg-row--group-footer');
    if (row.type === 'detail') cls.push('pg-row--detail');
    // A placeholder row published by a demand-loading row model for data that
    // has not arrived yet. The class drives the skeleton shimmer; the row is
    // otherwise an ordinary (empty) data row, so layout is identical to the
    // real row that replaces it — which is what stops the swap being visible.
    if (row.type === 'loading') cls.push('pg-row--skeleton');
    if (options.treeData && row.type === 'data') cls.push('pg-row--tree');
    if (row.isTreeFiller) cls.push('pg-row--tree-filler');
    if (options.rowShading && displayIndex % 2 === 1) cls.push('pg-row--alt');
    if (row.cssClass) cls.push(row.cssClass);
    return cls.join(' ');
  }
}
