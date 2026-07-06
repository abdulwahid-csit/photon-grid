import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
import type { RowSelectionEngine } from '../engines/selection/row-selection-engine';
import { type TreeToggleRenderConfig } from './tree-cell-renderer';
export interface BodyRendererOptions {
    showCheckboxes?: boolean;
    showSerialNumber?: boolean;
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
    centerColStart?: number;
    centerLeftSpacerW?: number;
    centerRightSpacerW?: number;
    totalCenterCols?: number;
    /**
     * When Master/Detail is enabled, drives the expand/collapse toggle icon
     * rendered on `'data'` rows for the configured toggle column.
     */
    masterDetail?: {
        toggleColumnId: string;
        isExpandedFn: (nodeId: string) => boolean;
        hasDetailFn: (rowData: Record<string, unknown>) => boolean;
    };
    /**
     * When Tree Data is enabled, drives indentation (`data-level` on the row
     * element) and the expand/collapse toggle rendered on `'data'` rows with
     * children, in the configured toggle column.
     */
    treeData?: TreeToggleRenderConfig;
}
export declare class BodyRenderer {
    private store;
    private eventBus;
    private iconRenderer;
    private rowSelectionEngine;
    private cellRenderer;
    private renderedRowMap;
    private leftContent;
    private centerContent;
    private rightContent;
    private lastCenterStart;
    private lastCenterEnd;
    private leftSticky;
    private centerSticky;
    private rightSticky;
    /** `nodeId`s of the rows currently parked in the sticky containers — a single Master/Detail master row, or a stack of Tree Data ancestor rows. */
    private stuckNodeIds;
    constructor(store: GridStore, eventBus: EventBus, iconRenderer: IconRenderer, rowSelectionEngine: RowSelectionEngine);
    setPanels(leftContent: HTMLElement | null, centerContent: HTMLElement, rightContent: HTMLElement | null): void;
    /** Wires the per-panel sticky-row overlay containers. Called once from `GridRenderer` when `masterDetail.enabled`. */
    setStickyContainers(left: HTMLElement | null, center: HTMLElement | null, right: HTMLElement | null): void;
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
    setStickyRows(entries: ReadonlyArray<{
        nodeId: string;
        top: number;
    }>): void;
    renderRows(rows: RowNode[], leftCols: ColumnDef[], centerCols: ColumnDef[], // visible slice only
    rightCols: ColumnDef[], options?: BodyRendererOptions): void;
    updateRowSelection(nodeId: string, selected: boolean): void;
    /**
     * Advances the tracked virtual-column range without touching any DOM.
     *
     * Call this when the column range has logically changed but the body rows must
     * NOT be rebuilt — specifically during an active column resize where CSS rules
     * already handle width changes via `ColumnStyleManager`. Keeping the tracked
     * range current prevents the next normal `renderRows` call (on `mouseup`) from
     * seeing a false "range changed" signal and wiping all center panels.
     *
     * @param cStart - New first visible center-column index.
     * @param cEnd   - New last visible center-column index (exclusive).
     */
    syncCenterRange(cStart: number, cEnd: number): void;
    clear(): void;
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
    invalidateRowsByNodeId(nodeIds: Set<string>): void;
    destroy(): void;
    private buildPanelRow;
    private buildSingleRow;
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
    private buildLeafGroupCell;
    private buildGroupRowContent;
    /**
     * Builds the label cell for a group **footer** row.
     *
     * Unlike the header, there is no expand/collapse toggle — the cell shows
     * a Σ-prefixed group value to signal "total for this group".
     * The cell participates in cell selection (colIndex −1) identically to the
     * group header's label cell.
     */
    private buildGroupFooterContent;
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
    private buildGroupAggregateCells;
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
    private formatAggValue;
    private updatePanelRow;
    /**
     * Inserts the Master/Detail expand/collapse toggle as a sibling of
     * `.pg-cell__inner` (never inside it) — `.pg-cell__inner` is wiped and
     * rebuilt wholesale by cell-edit start/stop (`GridCore.startCellEdit` /
     * `renderCellValue`), which would silently destroy a toggle placed inside it
     * the first time this column is edited.
     */
    private applyMasterDetailToggle;
    private attachRowListeners;
    private getRowClass;
}
//# sourceMappingURL=body-renderer.d.ts.map