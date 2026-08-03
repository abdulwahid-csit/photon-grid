/**
 * The viewport Virtual DOM.
 *
 * Holds a keyed virtual mirror of **only the rows currently rendered**, and
 * uses it to turn a data change into the smallest possible set of DOM writes:
 * one `textContent` assignment per cell whose value actually changed, and
 * nothing at all for the rest.
 *
 * Why a viewport-scoped tree rather than a conventional one:
 * - **Bounded cost.** Diffing is O(rendered cells), never O(dataset). A 1 M-row
 *   grid diffs exactly as fast as a 100-row grid.
 * - **Bounded memory.** The tree holds a few hundred small records that are
 *   reused across scrolling, so a high-frequency stream produces almost no
 *   garbage — the dominant cost of naive virtual-DOM designs.
 * - **No reconciliation of structure.** Row and column identity are already
 *   stable (`nodeId`, `colId`), so there is no children-array to reconcile:
 *   structural change is handled by the renderer, and the virtual tree only
 *   ever answers "did this cell's value change?".
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import { getCellValue, resolveFieldPath } from '../../engines/editing/value-accessor';
import { CellPatchKind } from './vdom.types';
import type {
  RenderedRowRef,
  VDomRenderContext,
  VDomStats,
  VirtualCell,
} from './vdom.types';
import type { CellPatcher } from './cell-patcher';
import { isSameCellValue, snapshotCellValue } from './cell-value-equality';

/** Row types whose cells are not driven by `row.data` and are never patched. */
const NON_PATCHABLE_ROW_TYPES = new Set(['group', 'group-footer', 'detail', 'summary']);

/**
 * Internal row record.
 *
 * Panel element references act as the cache key: the renderer replaces a panel
 * element whenever it rebuilds a row's cells (a new row, an invalidated row, or
 * a horizontal virtual-range change), so element identity is a precise, free
 * signal that the adopted cell map is stale.
 */
interface TrackedRow {
  readonly nodeId: string;
  row: RowNode;
  left: HTMLElement | null;
  center: HTMLElement | null;
  right: HTMLElement | null;
  cells: Map<string, VirtualCell>;
  /** Sweep marker — rows not touched by the latest `sync` are pruned. */
  generation: number;
}

export class ViewportVDom {
  private readonly rows = new Map<string, TrackedRow>();
  private generation = 0;

  private cellsCompared = 0;
  private cellsPatched = 0;
  private cellsReRendered = 0;
  private cellsDeferred = 0;
  private flushes = 0;
  private lastFlushMs = 0;

  constructor(private readonly patcher: CellPatcher) {}

  /**
   * Reconciles the virtual tree with the rows the renderer just painted.
   *
   * Called at the end of every render pass. Rows whose panel elements are
   * unchanged keep their adopted cells (the common case while scrolling stays
   * within already-rendered rows); rows that were rebuilt are re-adopted, and
   * rows that left the viewport are dropped.
   *
   * Adoption happens here rather than lazily at patch time because a freshly
   * rendered cell is the one moment the DOM is guaranteed to agree with the
   * data — recording values later could silently miss a change that landed in
   * between.
   *
   * @param refs - Every row currently rendered, with its per-panel elements.
   * @param ctx  - Render context used to classify columns and derive classes.
   */
  sync(refs: Iterable<RenderedRowRef>, ctx: VDomRenderContext): void {
    const gen = ++this.generation;

    for (const ref of refs) {
      const { row } = ref;
      if (NON_PATCHABLE_ROW_TYPES.has(row.type)) continue;

      const existing = this.rows.get(row.nodeId);
      if (
        existing &&
        existing.left === ref.left &&
        existing.center === ref.center &&
        existing.right === ref.right
      ) {
        // Same DOM — only the node reference and sweep marker need refreshing.
        existing.row = row;
        existing.generation = gen;
        continue;
      }

      const tracked: TrackedRow = existing ?? {
        nodeId: row.nodeId,
        row,
        left: null,
        center: null,
        right: null,
        cells: new Map<string, VirtualCell>(),
        generation: gen,
      };
      tracked.row = row;
      tracked.left = ref.left;
      tracked.center = ref.center;
      tracked.right = ref.right;
      tracked.generation = gen;
      this.adopt(tracked, ctx);
      this.rows.set(row.nodeId, tracked);
    }

    // Sweep rows that scrolled out of the window.
    if (this.rows.size > 0) {
      for (const [nodeId, tracked] of this.rows) {
        if (tracked.generation !== gen) this.rows.delete(nodeId);
      }
    }
  }

  /**
   * Diffs the given rows against the virtual tree and patches only the cells
   * whose values changed.
   *
   * Rows that are not currently rendered are skipped entirely — their data has
   * already been updated in the model, and they will render correctly when they
   * scroll into view.
   *
   * @param nodeIds - Rows to diff, or `null` to diff every rendered row.
   * @param ctx     - Render context matching the initial render.
   * @returns The number of cells written to the DOM.
   */
  patchRows(nodeIds: Iterable<string> | null, ctx: VDomRenderContext): number {
    const started = performance.now();
    let patched = 0;

    if (nodeIds === null) {
      for (const tracked of this.rows.values()) patched += this.patchTracked(tracked, ctx);
    } else {
      for (const nodeId of nodeIds) {
        const tracked = this.rows.get(nodeId);
        if (tracked) patched += this.patchTracked(tracked, ctx);
      }
    }

    this.flushes++;
    this.lastFlushMs = performance.now() - started;
    this.cellsPatched += patched;
    return patched;
  }

  /** `true` when the row is currently rendered and tracked. */
  has(nodeId: string): boolean {
    return this.rows.has(nodeId);
  }

  /**
   * The `RowNode` for a rendered row, in O(1).
   *
   * Lets the real-time update path resolve visible rows without scanning the
   * dataset.
   */
  getRow(nodeId: string): RowNode | undefined {
    return this.rows.get(nodeId)?.row;
  }

  /**
   * Drops rows from the virtual tree.
   *
   * Called when the renderer evicts row DOM so the tree never holds a reference
   * to a detached element.
   */
  evict(nodeIds: Iterable<string>): void {
    for (const nodeId of nodeIds) this.rows.delete(nodeId);
  }

  /** Drops every tracked row — used when the renderer clears the body. */
  clear(): void {
    this.rows.clear();
  }

  /** Snapshot of the counters described by {@link VDomStats}. */
  getStats(): VDomStats {
    let trackedCells = 0;
    for (const tracked of this.rows.values()) trackedCells += tracked.cells.size;
    return {
      trackedRows: this.rows.size,
      trackedCells,
      cellsCompared: this.cellsCompared,
      cellsPatched: this.cellsPatched,
      cellsReRendered: this.cellsReRendered,
      cellsDeferred: this.cellsDeferred,
      flushes: this.flushes,
      lastFlushMs: this.lastFlushMs,
    };
  }

  /** Zeroes the cumulative counters (the tracked tree is left intact). */
  resetStats(): void {
    this.cellsCompared = 0;
    this.cellsPatched = 0;
    this.cellsReRendered = 0;
    this.cellsDeferred = 0;
    this.flushes = 0;
    this.lastFlushMs = 0;
  }

  /**
   * Diffs one tracked row.
   *
   * The loop reads each cell's current value once, compares it against the last
   * value written to the DOM, and only then hands it to the patcher — so an
   * unchanged cell costs a map lookup, a value read and a comparison, with no
   * allocation and no DOM access whatsoever.
   */
  private patchTracked(tracked: TrackedRow, ctx: VDomRenderContext): number {
    const row = tracked.row;
    let patched = 0;

    for (const vcell of tracked.cells.values()) {
      const colDef = ctx.columnsById.get(vcell.colId);
      if (!colDef) continue;

      const value = getCellValue(row.data, colDef, ctx.api);
      this.cellsCompared++;
      if (isSameCellValue(vcell.value, value)) continue;

      const kind = this.patcher.patch(vcell, row, colDef, ctx, value);
      if (kind === CellPatchKind.CONTENT) { this.cellsReRendered++; patched++; }
      else if (kind === CellPatchKind.TEXT) patched++;
      else if (kind === CellPatchKind.DEFERRED) this.cellsDeferred++;
    }

    return patched;
  }

  /**
   * Records the live cell elements of a freshly rendered row.
   *
   * Resolving `.pg-cell__value` here — once, at adoption — is what makes the
   * steady-state patch a single `textContent` write with no query at all.
   */
  private adopt(tracked: TrackedRow, ctx: VDomRenderContext): void {
    tracked.cells.clear();
    const row = tracked.row;

    for (const panelEl of [tracked.left, tracked.center, tracked.right]) {
      if (!panelEl) continue;
      const cellEls = panelEl.querySelectorAll<HTMLElement>('.pg-cell[data-col-id]');

      for (let i = 0; i < cellEls.length; i++) {
        const el = cellEls[i];
        const colId = el.getAttribute('data-col-id');
        if (colId === null) continue;
        const colDef = ctx.columnsById.get(colId);
        if (!colDef) continue;

        const value = getCellValue(row.data, colDef, ctx.api);
        const rawValue = colDef.valueGetter ? resolveFieldPath(row.data, colDef.field) : value;
        const colIndex = Number(el.getAttribute('data-col-index') ?? 0);

        tracked.cells.set(colId, {
          colId,
          el,
          valueEl: this.patcher.isTextOnlyColumn(colDef) ? findValueEl(el) : null,
          value: snapshotCellValue(value),
          dynamicClass: this.patcher.resolveDynamicClass(value, rawValue, row, colDef, colIndex, ctx),
        });
      }
    }
  }
}

/**
 * Resolves a cell's `.pg-cell__value` span without a selector query.
 *
 * `CellRenderer` always builds `.pg-cell > .pg-cell__inner > .pg-cell__value`
 * for text columns, so the direct child walk hits on the first try; the
 * `querySelector` fallback covers cells decorated by another subsystem (a tree
 * or master/detail toggle inserted ahead of the value).
 */
function findValueEl(cellEl: HTMLElement): HTMLElement | null {
  const inner = cellEl.firstElementChild;
  if (!inner) return null;
  const first = inner.firstElementChild;
  if (first && first.classList.contains('pg-cell__value')) return first as HTMLElement;
  return inner.querySelector<HTMLElement>('.pg-cell__value');
}
