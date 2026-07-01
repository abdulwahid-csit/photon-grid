import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
import type { RowSelectionEngine } from '../engines/selection/row-selection-engine';
import { GridEventType } from '../types/event.types';
import { CellRenderer } from './cell-renderer';
import { formatValue } from '../engines/editing/value-parser';
import { createDiv, toggleClass } from './dom-utils';

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
  // Horizontal virtual scroll: centerCols is already the visible slice
  centerColStart?: number;       // index of first visible center col within all center cols
  centerLeftSpacerW?: number;    // px width of off-screen cols to the left
  centerRightSpacerW?: number;   // px width of off-screen cols to the right
  totalCenterCols?: number;      // total number of center cols (for rightOffset calc)
}

interface PanelRowSet {
  left: HTMLElement | null;
  center: HTMLElement | null;
  right: HTMLElement | null;
}

export class BodyRenderer {
  private cellRenderer = new CellRenderer();
  private renderedRowMap = new Map<string, PanelRowSet>();

  private leftContent: HTMLElement | null = null;
  private centerContent: HTMLElement | null = null;
  private rightContent: HTMLElement | null = null;

  // Track last rendered center col range to detect changes
  private lastCenterStart = -1;
  private lastCenterEnd = -1;

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
    private iconRenderer: IconRenderer,
    private rowSelectionEngine: RowSelectionEngine,
  ) {}

  setPanels(
    leftContent: HTMLElement | null,
    centerContent: HTMLElement,
    rightContent: HTMLElement | null,
  ): void {
    this.leftContent = leftContent;
    this.centerContent = centerContent;
    this.rightContent = rightContent;

    // Delegated hover sync: works even after center panels are rebuilt on col range change.
    // mouseover/mouseout bubble; we track nodeId to avoid spurious remove when moving between children.
    const panels = [leftContent, centerContent, rightContent].filter((p): p is HTMLElement => p !== null);
    const getNodeId = (el: EventTarget | null): string | null =>
      el instanceof HTMLElement ? el.closest<HTMLElement>('[data-node-id]')?.getAttribute('data-node-id') ?? null : null;

    for (const panel of panels) {
      panel.addEventListener('mouseover', (e) => {
        const nodeId = getNodeId(e.target);
        if (!nodeId) return;
        for (const p of panels) {
          p.querySelectorAll<HTMLElement>(`[data-node-id="${nodeId}"]`).forEach((r) => r.classList.add('pg-row--hover'));
        }
      });
      panel.addEventListener('mouseout', (e: MouseEvent) => {
        const nodeId = getNodeId(e.target);
        if (!nodeId || nodeId === getNodeId(e.relatedTarget)) return;
        for (const p of panels) {
          p.querySelectorAll<HTMLElement>(`[data-node-id="${nodeId}"]`).forEach((r) => r.classList.remove('pg-row--hover'));
        }
      });
    }
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

    // When the visible center col range changes, invalidate all center panels
    if (cStart !== this.lastCenterStart || cEnd !== this.lastCenterEnd) {
      this.lastCenterStart = cStart;
      this.lastCenterEnd = cEnd;
      if (this.centerContent) this.centerContent.innerHTML = '';
      for (const ps of this.renderedRowMap.values()) {
        ps.center = null;
      }
    }

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

    const totalCenterCols = options.totalCenterCols ?? centerCols.length;
    const centerOffset = leftCols.length + cStart;
    const rightOffset  = leftCols.length + totalCenterCols;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let existing = this.renderedRowMap.get(row.nodeId);

      // Group header and footer rows carrying aggregated values must be fully
      // rebuilt on every pipeline run so that updated aggregations (e.g. after
      // filtering) are reflected in the DOM rather than served from the stale cache.
      if (existing && (row.type === 'group' || row.type === 'group-footer') && row.aggregatedValues) {
        existing.left?.remove();
        existing.center?.remove();
        existing.right?.remove();
        this.renderedRowMap.delete(row.nodeId);
        existing = undefined;
      }

      if (existing && existing.center !== null) {
        // Normal update — row and center already in DOM
        this.updatePanelRow(existing, row, i, options);
      } else if (existing) {
        // Center was invalidated (col range changed) — rebuild center only
        this.updatePanelRow(existing, row, i, options);
        const newCenter = this.buildSingleRow(row, i, 'center', centerCols, centerOffset, options);
        existing.center = newCenter;
        centerFrag.appendChild(newCenter);
      } else {
        // Entirely new row
        const ps = this.buildPanelRow(row, i, leftCols, centerCols, rightCols, centerOffset, rightOffset, options);
        this.renderedRowMap.set(row.nodeId, ps);
        if (ps.left) leftFrag.appendChild(ps.left);
        if (ps.center) centerFrag.appendChild(ps.center);
        if (ps.right) rightFrag.appendChild(ps.right);
      }
    }

    if (this.leftContent) this.leftContent.appendChild(leftFrag);
    this.centerContent?.appendChild(centerFrag);
    if (this.rightContent) this.rightContent.appendChild(rightFrag);
  }

  updateRowSelection(nodeId: string, selected: boolean): void {
    const ps = this.renderedRowMap.get(nodeId);
    if (!ps) return;
    const els = [ps.left, ps.center, ps.right].filter((e): e is HTMLElement => e !== null);
    for (const el of els) {
      toggleClass(el, 'pg-row--selected', selected);
      const cb = el.querySelector<HTMLInputElement>('.pg-checkbox');
      if (cb) cb.checked = selected;
    }
  }

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
  syncCenterRange(cStart: number, cEnd: number): void {
    this.lastCenterStart = cStart;
    this.lastCenterEnd = cEnd;
  }

  clear(): void {
    for (const ps of this.renderedRowMap.values()) {
      ps.left?.remove();
      ps.center?.remove();
      ps.right?.remove();
    }
    this.renderedRowMap.clear();
    this.lastCenterStart = -1;
    this.lastCenterEnd = -1;
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
  }

  destroy(): void {
    this.clear();
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
        const leftSpacerW = options.centerLeftSpacerW ?? 0;
        if (leftSpacerW > 0) {
          const sp = createDiv('pg-cell--h-spacer');
          sp.style.cssText = `width:${leftSpacerW}px;min-width:${leftSpacerW}px;flex-shrink:0;`;
          el.appendChild(sp);
        }
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
        const rightSpacerW = options.centerRightSpacerW ?? 0;
        if (rightSpacerW > 0) {
          const sp = createDiv('pg-cell--h-spacer');
          sp.style.cssText = `width:${rightSpacerW}px;min-width:${rightSpacerW}px;flex-shrink:0;`;
          el.appendChild(sp);
        }
      }

      this.attachRowListeners(el, row, cols, colOffset, options);
      return el;
    }

    if (panel === 'left') {
      if (options.showCheckboxes) {
        el.appendChild(this.cellRenderer.renderCheckboxCell(row, row.rowIndex));
      }
      if (options.showSerialNumber) {
        el.appendChild(this.cellRenderer.renderSerialNumberCell(row.rowIndex, displayIndex + 1));
      }
    }

    if (panel === 'center') {
      // Left virtual spacer (columns scrolled off to the left)
      const leftSpacerW = options.centerLeftSpacerW ?? 0;
      if (leftSpacerW > 0) {
        const sp = createDiv('pg-cell--h-spacer');
        sp.style.cssText = `width:${leftSpacerW}px;min-width:${leftSpacerW}px;flex-shrink:0;`;
        el.appendChild(sp);
      }

      if (options.showGroupsColumn) {
        this.buildLeafGroupCell(el, row, options);
      }
    }

    for (let i = 0; i < cols.length; i++) {
      const cellEl = this.cellRenderer.renderCell({
        row,
        colDef: cols[i],
        rowIndex: row.rowIndex,
        colIndex: colOffset + i,   // global index across all panels
        iconRenderer: this.iconRenderer,
        dateFormat: options.dateFormat,
        timeZone: options.timeZone,
        currencySymbol: options.currencySymbol,
        locale: options.locale,
        api: options.api ?? null,
      });
      if (options.showVerticalBorders) cellEl.classList.add('pg-cell--v-border');
      if (cols[i].rowDrag && row.type !== 'summary') {
        const handle = createDiv('pg-row-drag-handle');
        handle.setAttribute('data-row-drag', '');
        handle.setAttribute('data-drag-label', String(row.data[cols[i].field] ?? ''));
        handle.innerHTML = this.iconRenderer.renderToString('drag', 14);
        const inner = cellEl.querySelector<HTMLElement>('.pg-cell__inner');
        if (inner) {
          inner.insertBefore(handle, inner.firstChild);
        } else {
          cellEl.insertBefore(handle, cellEl.firstChild);
        }
      }
      el.appendChild(cellEl);
    }

    if (panel === 'center') {
      // Right virtual spacer (columns scrolled off to the right)
      const rightSpacerW = options.centerRightSpacerW ?? 0;
      if (rightSpacerW > 0) {
        const sp = createDiv('pg-cell--h-spacer');
        sp.style.cssText = `width:${rightSpacerW}px;min-width:${rightSpacerW}px;flex-shrink:0;`;
        el.appendChild(sp);
      }
    }

    this.attachRowListeners(el, row, cols, colOffset, options);
    return el;
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
    label.textContent = String(row.groupValue + ' (' + row.childCount + ')');

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
        const span = document.createElement('span');
        span.className = 'pg-cell__value';
        span.textContent = this.formatAggValue(aggVal, col, options);
        inner.appendChild(span);
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
    for (const el of els) {
      el.className = cls;
      el.setAttribute('data-row-index', String(row.rowIndex));
      if (row.type === 'group') el.setAttribute('data-level', String(row.level));
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
  }

  private attachRowListeners(
    el: HTMLElement,
    row: RowNode,
    cols: ColumnDef[],
    colOffset: number,
    options: BodyRendererOptions,
  ): void {
    el.addEventListener('click', (e) => {
      const checkboxEl = (e.target as HTMLElement).closest('.pg-checkbox');
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

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const cellEl = (e.target as HTMLElement).closest<HTMLElement>('[data-col-index][data-col-id]');
      if (!cellEl) return;
      const globalColIndex = Number(cellEl.getAttribute('data-col-index'));
      const colId = cellEl.getAttribute('data-col-id') ?? '';
      // For the virtual auto-group column (colId '__group__'):
      //   • data rows  → use the real leaf group ColumnDef (supports editing)
      //   • group/footer rows → use the non-editable sentinel (editing blocked at startCellEdit)
      const colDef = cols.find((c) => c.colId === colId)
        ?? (colId === '__group__'
          ? (row.type === 'data' ? (options.leafGroupColDef ?? null) : GROUP_LABEL_COL_DEF)
          : null);
      if (!colDef) return;
      this.eventBus.emit(GridEventType.CELL_CLICKED, {
        row,
        colDef,
        value: null,
        rowIndex: row.rowIndex,
        colIndex: globalColIndex,
        event: e,
      });
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
      const colId = cellEl.getAttribute('data-col-id') ?? '';
      const colDef = cols.find((c) => c.colId === colId)
        ?? (colId === '__group__'
          ? (row.type === 'data' ? (options.leafGroupColDef ?? null) : GROUP_LABEL_COL_DEF)
          : null);
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
    if (row.selected) cls.push('pg-row--selected');
    if (row.type === 'group') cls.push('pg-row--group');
    if (row.type === 'group-footer') cls.push('pg-row--group-footer');
    if (row.type === 'detail') cls.push('pg-row--detail');
    if (options.rowShading && displayIndex % 2 === 1) cls.push('pg-row--alt');
    if (row.cssClass) cls.push(row.cssClass);
    return cls.join(' ');
  }
}
