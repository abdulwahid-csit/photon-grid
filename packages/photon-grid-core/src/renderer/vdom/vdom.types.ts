/**
 * Type surface for Photon Grid's viewport Virtual DOM.
 *
 * The virtual tree mirrors **only the rendered viewport** — never the dataset.
 * For a 100 000-row grid showing 40 rows of 20 columns, the virtual tree holds
 * 800 cell records regardless of how large the data behind it is, so both its
 * memory cost and its diff cost are bounded by the viewport rather than by the
 * data.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';

/** Which panel a virtual row belongs to. Cells never move between panels. */
export type PanelName = 'left' | 'center' | 'right';

/**
 * What a diff decided to do with a single cell.
 *
 * Ordered by cost: {@link CellPatchKind.NONE} is free, {@link CellPatchKind.TEXT}
 * writes one string into an existing text node, and
 * {@link CellPatchKind.CONTENT} re-runs the cell's renderer into the existing
 * cell element. No kind ever replaces the `.pg-cell` element itself.
 */
export enum CellPatchKind {
  /** Value is unchanged — nothing was touched. */
  NONE = 'none',
  /** Value changed and was written straight into the existing value element. */
  TEXT = 'text',
  /** Value changed and the cell's inner content had to be re-rendered. */
  CONTENT = 'content',
  /** Value changed but the cell is being edited — the patch was deferred. */
  DEFERRED = 'deferred',
}

/**
 * Virtual representation of one rendered cell.
 *
 * Holds a direct reference to its live DOM nodes so a patch is a pointer
 * dereference plus one write — no `querySelector`, no attribute parsing, and no
 * allocation on the hot path. References are refreshed by
 * `ViewportVDom.sync()` after every render pass, so a recycled or rebuilt row
 * can never leave a stale element behind.
 */
export interface VirtualCell {
  /** Column this cell belongs to. */
  readonly colId: string;
  /** The live `.pg-cell` element. Never replaced by a patch. */
  readonly el: HTMLElement;
  /**
   * The `.pg-cell__value` span, when the cell uses the default text rendering.
   * `null` for custom renderers, HTML cells, and rich built-in types — those
   * need a content re-render rather than a text write.
   */
  valueEl: HTMLElement | null;
  /** Logical value last written to the DOM (post `valueGetter`). */
  value: unknown;
  /** Dynamic class last applied from `ColumnDef.cellCssClass`, or `''`. */
  dynamicClass: string;
}

/**
 * Virtual representation of one rendered row, split by panel.
 *
 * Keyed lookup (`nodeId` → row, `colId` → cell) is what keeps patching O(1)
 * per changed cell instead of O(cells) per update.
 */
export interface VirtualRow {
  /** Stable row identity — survives scrolling, sorting and recycling. */
  readonly nodeId: string;
  /** Display index at the time of the last sync, for change detection. */
  rowIndex: number;
  /** Cells by `colId`, across every panel. */
  readonly cells: Map<string, VirtualCell>;
}

/**
 * Formatting and lookup context a patch needs to reproduce exactly what the
 * initial render produced.
 *
 * Mirrors the fields `CellRenderer` reads, so a patched cell is
 * indistinguishable from a freshly built one.
 */
export interface VDomRenderContext {
  /** Visible columns by `colId`, for O(1) resolution during a diff. */
  readonly columnsById: ReadonlyMap<string, ColumnDef>;
  readonly dateFormat?: string;
  readonly timeZone?: string;
  readonly currencySymbol?: string;
  readonly locale?: string;
  /** Grid API handed to custom renderers and value getters. */
  readonly api: unknown;
}

/**
 * Cumulative counters describing what the Virtual DOM actually did.
 *
 * Exposed through `GridApi.getVDomStats()` so applications (and the benchmark
 * suite) can assert that a high-frequency update stream patches only the cells
 * that changed instead of repainting rows.
 */
export interface VDomStats {
  /** Rows currently held in the virtual tree (i.e. the rendered window). */
  readonly trackedRows: number;
  /** Cells currently held in the virtual tree. */
  readonly trackedCells: number;
  /** Cells compared since the last {@link VDomStats} reset. */
  readonly cellsCompared: number;
  /** Cells whose value differed and were written to the DOM. */
  readonly cellsPatched: number;
  /** Cells re-rendered through their renderer (a subset of `cellsPatched`). */
  readonly cellsReRendered: number;
  /** Patches skipped because the cell was being edited. */
  readonly cellsDeferred: number;
  /** Batched flushes performed (one per animation frame at most). */
  readonly flushes: number;
  /** Duration of the most recent flush, in milliseconds. */
  readonly lastFlushMs: number;
}

/**
 * A single row's worth of real-time field updates.
 *
 * Values are shallow-merged into the row's `data`, so an update may carry any
 * subset of fields — the diff decides which of them actually reach the DOM.
 */
export interface CellUpdate {
  /** Target row, matched by `RowNode.nodeId`. */
  readonly nodeId: string;
  /** Field → new value. Fields absent from the object are left untouched. */
  readonly values: Readonly<Record<string, unknown>>;
}

/**
 * Result of applying a batch of {@link CellUpdate}s.
 *
 * `pipelineRan` reports whether the update had to fall back to a full
 * filter/sort/group pass — the one case where a value change is structural.
 */
export interface CellUpdateResult {
  /** Rows whose data was mutated. */
  readonly rowsUpdated: number;
  /** Cells actually written to the DOM. */
  readonly cellsPatched: number;
  /** `true` when the change forced a full pipeline run instead of a patch. */
  readonly pipelineRan: boolean;
}

/** Row + panel element pair consumed by `ViewportVDom.sync()`. */
export interface RenderedRowRef {
  readonly row: RowNode;
  readonly left: HTMLElement | null;
  readonly center: HTMLElement | null;
  readonly right: HTMLElement | null;
}
