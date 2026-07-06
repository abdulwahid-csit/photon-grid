import type { ColumnStyleManager } from '../renderer/column-style-manager';
import type { IconRenderer } from '../icons/icon-renderer';
import type { ColumnGroupDragHandler } from './column-group-drag-handler';
import { ColumnGroupNodeType, type ColumnTreeNode, type IColumnGroupNode, type HeaderGroupCell, type HeaderGroupRow } from './column-group.types';
import { createDiv } from '../renderer/dom-utils';

/**
 * Options for building the DOM cells in a group header row.
 */
export interface GroupCellBuildOptions {
  /** Height of a single header row in pixels — used for span calculation. */
  rowHeight: number;
  /** Callback fired when the user clicks or presses Enter/Space on a group cell. */
  onCollapseToggle?: (groupId: string) => void;
  /** Callback fired when the user drags the group resize handle. */
  onGroupResize?: (groupId: string, newWidth: number) => void;
}

/**
 * Builds the multi-row grouped header DOM for a single panel.
 *
 * ### Layout model
 *
 * ```
 * pg-header-group-row depth-0  ← group cells (position: absolute)
 * pg-header-group-row depth-1  ← deeper group cells (if nested)
 * pg-header-row                ← existing leaf row (built by HeaderRenderer)
 * pg-filter-row                ← optional filter row
 * ```
 *
 * Group rows use `position: relative` with absolutely-positioned cells so that
 * any arbitrary column width and nesting depth can be expressed without
 * flex-layout constraints.  The rows are direct children of the panel's
 * `pg-panel__header-inner` element, which means they scroll together with the
 * leaf row via the same `translateX` CSS transform.
 *
 * ### Virtualization
 *
 * Group rows render **all** group cells (not just the virtual window slice).
 * Because groups span many leaf columns, the number of group cells is small
 * compared to the number of leaf cells — the perf overhead is negligible.
 * The visible portion is automatically clipped by the panel's `overflow: hidden`.
 */
export class ColumnGroupHeaderBuilder {
  /** Optional drag handler — wired after construction via {@link setDragConfig}. */
  private dragHandler:  ColumnGroupDragHandler | null = null;
  /** Getter returning the root `.pg-grid` element for drag boundary checks. */
  private gridElGetter: (() => HTMLElement | null) | null = null;

  constructor(private readonly iconRenderer: IconRenderer) {}

  /**
   * Wire a {@link ColumnGroupDragHandler} into the builder so that each
   * group header cell receives drag-and-drop listeners at build time.
   *
   * Must be called before the first `buildGroupRows` invocation if drag
   * support is needed.
   *
   * @param handler    - Fully-constructed drag handler instance.
   * @param gridElGetter - Returns the root `.pg-grid` element (may be `null`
   *   before mount).
   */
  setDragConfig(handler: ColumnGroupDragHandler, gridElGetter: () => HTMLElement | null): void {
    this.dragHandler  = handler;
    this.gridElGetter = gridElGetter;
  }

  // ── Public: build group rows ──────────────────────────────────────────────

  /**
   * Build one `HTMLElement` per depth level for the given panel tree.
   *
   * Returns an ordered array of group-row elements (depth 0 first).
   * The leaf row is **not** included — it is built by {@link HeaderRenderer}.
   * Returns an empty array when `maxDepth === 0` (no groups).
   *
   * @param panelNodes  - Root-level tree nodes for this panel.
   * @param colStyles   - Width manager for resolving leaf column widths.
   * @param maxDepth    - Global tree depth (from `ColumnGroupModel.getMaxDepth()`).
   * @param cellOptions - DOM build options (row height, callbacks).
   */
  buildGroupRows(
    panelNodes:  ColumnTreeNode[],
    colStyles:   ColumnStyleManager,
    maxDepth:    number,
    cellOptions: GroupCellBuildOptions,
  ): HTMLElement[] {
    if (maxDepth === 0) return [];

    const layout = this.computeLayout(panelNodes, colStyles, maxDepth);
    return layout.map((row) => this.buildGroupRow(row, cellOptions));
  }

  /**
   * Rebuild the cells of existing group-row elements in place.
   * Called after a virtual-column-window change or width update.
   *
   * @param groupRowEls - Previously built group-row elements (from `buildGroupRows`).
   * @param panelNodes  - Current root nodes for this panel.
   * @param colStyles   - Current column widths.
   * @param maxDepth    - Global tree depth.
   * @param cellOptions - DOM build options.
   */
  updateGroupRows(
    groupRowEls: HTMLElement[],
    panelNodes:  ColumnTreeNode[],
    colStyles:   ColumnStyleManager,
    maxDepth:    number,
    cellOptions: GroupCellBuildOptions,
  ): void {
    if (groupRowEls.length === 0 || maxDepth === 0) return;
    const layout = this.computeLayout(panelNodes, colStyles, maxDepth);
    for (let d = 0; d < maxDepth && d < groupRowEls.length; d++) {
      groupRowEls[d].innerHTML = '';
      if (d < layout.length) this.populateGroupRow(groupRowEls[d], layout[d], cellOptions);
    }
  }

  // ── Public: layout computation ────────────────────────────────────────────

  /**
   * Compute the header layout data without constructing any DOM.
   * Returns one {@link HeaderGroupRow} per depth level (0 to `maxDepth - 1`).
   * Used for testing and by the drag handler for hit-testing.
   *
   * @param panelNodes - Root-level tree nodes for this panel.
   * @param colStyles  - Width manager for leaf column widths.
   * @param maxDepth   - Maximum nesting depth across the full tree.
   */
  computeLayout(
    panelNodes: ColumnTreeNode[],
    colStyles:  ColumnStyleManager,
    maxDepth:   number,
  ): HeaderGroupRow[] {
    const rows: HeaderGroupRow[] = Array.from({ length: maxDepth }, (_, i) => ({
      depth: i,
      cells: [],
    }));

    const cursor = { left: 0 };
    this.walk(panelNodes, colStyles, rows, maxDepth, 0, cursor);
    return rows;
  }

  // ── Private: tree walk ────────────────────────────────────────────────────

  private walk(
    nodes:    ColumnTreeNode[],
    colStyles: ColumnStyleManager,
    rows:     HeaderGroupRow[],
    maxDepth: number,
    depth:    number,
    cursor:   { left: number },
  ): void {
    for (const node of nodes) {
      if (node.nodeType === ColumnGroupNodeType.LEAF) {
        if (node.colDef.visible === false) continue;
        const leafLeft  = cursor.left;
        const leafWidth = colStyles.getWidth(node.colDef.colId);
        cursor.left += leafWidth;

        // A root-level standalone leaf (depth === 0) with groups present must
        // fill every group row so its header cell visually spans the full
        // header height — matching the look of a grouped column header.
        if (depth === 0 && rows.length > 0) {
          for (let d = 0; d < rows.length; d++) {
            rows[d].cells.push({
              type:      'filler',
              id:        `_filler_${node.colDef.colId}_d${d}`,
              label:     '',
              left:      leafLeft,
              width:     leafWidth,
              depth:     d,
              rowSpan:   1,
              colDef:    node.colDef,
            } as HeaderGroupCell);
          }
        }
        continue;
      }

      // Group node
      const group    = node as IColumnGroupNode;
      const cellLeft = cursor.left;

      if (group.collapsed) {
        // Collapsed: advance by the first visible leaf's width so the group cell
        // exactly covers the "peek" column shown in the body.
        const firstColId = this.getFirstVisibleLeafColId(group.children);
        cursor.left += firstColId ? colStyles.getWidth(firstColId) : group.collapsedWidth;
      } else {
        this.walk(group.children, colStyles, rows, maxDepth, depth + 1, cursor);
      }

      const cellWidth = cursor.left - cellLeft;
      if (cellWidth <= 0) continue;

      if (depth < rows.length) {
        const cell: HeaderGroupCell = {
          type:      'group',
          id:        group.groupId,
          label:     group.header,
          left:      cellLeft,
          width:     cellWidth,
          depth,
          rowSpan:   1,
          groupNode: group,
        };
        rows[depth].cells.push(cell);
      }
    }
  }

  /**
   * Walk a subtree and return the `colId` of the first non-hidden leaf.
   * Returns `null` when no visible leaf is found.
   */
  private getFirstVisibleLeafColId(nodes: ColumnTreeNode[]): string | null {
    for (const node of nodes) {
      if (node.nodeType === ColumnGroupNodeType.LEAF) {
        if (node.colDef.visible !== false) return node.colDef.colId;
      } else {
        const found = this.getFirstVisibleLeafColId(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  // ── Private: DOM building ─────────────────────────────────────────────────

  private buildGroupRow(row: HeaderGroupRow, cellOptions: GroupCellBuildOptions): HTMLElement {
    const el = createDiv(`pg-header-group-row pg-header-group-row--depth-${row.depth}`);
    el.setAttribute('role', 'row');
    el.setAttribute('data-group-depth', String(row.depth));
    this.populateGroupRow(el, row, cellOptions);
    return el;
  }

  private populateGroupRow(
    rowEl:       HTMLElement,
    row:         HeaderGroupRow,
    cellOptions: GroupCellBuildOptions,
  ): void {
    for (const cell of row.cells) {
      rowEl.appendChild(this.buildGroupCell(cell, cellOptions));
    }
  }

  private buildGroupCell(cell: HeaderGroupCell, options: GroupCellBuildOptions): HTMLElement {
    if (cell.type !== 'group' || !cell.groupNode) {
      // Filler occupies the group-row space for a standalone (non-grouped) leaf
      // so the leaf header appears to span the full header height.
      const filler = createDiv('pg-th pg-th--standalone-filler');
      if (cell.colDef) filler.setAttribute('data-col-id', cell.colDef.colId);
      filler.style.left  = `${cell.left}px`;
      filler.style.width = `${cell.width}px`;
      return filler;
    }

    const group      = cell.groupNode;
    const isCollapsed = group.collapsed;
    const classes    = ['pg-th', 'pg-th--group'];
    if (isCollapsed) classes.push('pg-th--group--collapsed');
    if (group.headerCssClass) classes.push(...group.headerCssClass.split(' ').filter(Boolean));

    const th = createDiv(classes.join(' '));
    th.setAttribute('role', 'columnheader');
    th.setAttribute('data-group-id', group.groupId);
    th.setAttribute('aria-expanded', String(!isCollapsed));
    th.setAttribute('aria-label', group.header);
    th.setAttribute('tabindex', '0');
    th.style.left  = `${cell.left}px`;
    th.style.width = `${cell.width}px`;

    if (group.headerRendererFn) {
      const rendered = group.headerRendererFn({ group, collapsed: isCollapsed, api: null });
      if (typeof rendered === 'string') th.innerHTML = rendered;
      else th.appendChild(rendered);
    } else {
      this.buildDefaultContent(th, group, isCollapsed);
    }

    // Resize handle (group header resize — distributes delta among children)
    if (group.resizable !== false) {
      const handle = createDiv('pg-th__resize-handle pg-th__resize-handle--group');
      handle.textContent = '|';
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startGroupResize(e, group, cell.width, options);
      });
      th.appendChild(handle);
    }

    // Drag-and-drop: attach via drag handler when configured.
    // The drag handler's mousedown delays drag start until 5 px of movement so
    // a short click still fires the collapse toggle below.
    if (this.dragHandler) {
      this.dragHandler.attachGroupDragListeners(th, group);
    }

    // Click / keyboard: toggle collapse
    th.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.pg-th__resize-handle')) return;
      // Suppress if a drag just finished (drag handler sets this flag)
      if (this.dragHandler?.didJustDrag) return;
      options.onCollapseToggle?.(group.groupId);
    });

    th.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        options.onCollapseToggle?.(group.groupId);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!isCollapsed) options.onCollapseToggle?.(group.groupId);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isCollapsed) options.onCollapseToggle?.(group.groupId);
      }
    });

    return th;
  }

  private buildDefaultContent(
    th:          HTMLElement,
    group:       IColumnGroupNode,
    isCollapsed: boolean,
  ): void {
    const content = createDiv('pg-th__content');

    const labelEl = createDiv('pg-th__label');
    labelEl.textContent = group.header;
    labelEl.title       = group.header;
    content.appendChild(labelEl);
    th.appendChild(content);

    const collapseBtn = createDiv('pg-th__collapse-btn');
    collapseBtn.setAttribute('tabindex', '-1');
    collapseBtn.setAttribute(
      'aria-label',
      isCollapsed ? `Expand ${group.header}` : `Collapse ${group.header}`,
    );
    collapseBtn.innerHTML = this.iconRenderer.renderToString(
      isCollapsed ? 'chevronRight' : 'chevronLeft',
      12,
    );
    th.appendChild(collapseBtn);
  }

  // ── Private: group resize ────────────────────────────────────────────────

  private startGroupResize(
    e:         MouseEvent,
    group:     IColumnGroupNode,
    startWidth: number,
    options:   GroupCellBuildOptions,
  ): void {
    const startX = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent): void => {
      const newWidth = Math.max(group.collapsedWidth, startWidth + (ev.clientX - startX));
      options.onGroupResize?.(group.groupId, newWidth);
    };

    const onUp = (ev: MouseEvent): void => {
      const newWidth = Math.max(group.collapsedWidth, startWidth + (ev.clientX - startX));
      options.onGroupResize?.(group.groupId, newWidth);
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
}
