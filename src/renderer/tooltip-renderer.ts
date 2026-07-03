import type { ColumnModel } from '../core/column-model';
import type { GridStore } from '../core/grid-store';
import type { RowNode } from '../types/row.types';
import type { RendererOutput, TooltipRendererParams } from '../types/renderer.types';
import { resolveColumnRenderer } from './renderer-resolver';

/** Delay, in milliseconds, between hovering a cell and the custom tooltip appearing. */
const SHOW_DELAY_MS = 400;

/**
 * Shows a floating, theme-styled tooltip for cells whose column defines
 * `renderer.tooltip`. Columns without one keep using the grid's existing,
 * essentially free native `title` attribute — this controller does nothing
 * for them, so it adds zero cost to the common case.
 *
 * Uses a single delegated `mouseover`/`mouseout` listener pair on the grid
 * body (not one listener per cell or per row), matching the cost profile of
 * the grid's existing delegated click handling.
 */
export class TooltipController {
  private hostEl: HTMLElement | null = null;
  private tooltipEl: HTMLElement | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hoveredCellEl: HTMLElement | null = null;

  private readonly boundMouseOver: (e: MouseEvent) => void;
  private readonly boundMouseOut: (e: MouseEvent) => void;

  constructor(
    private readonly store: GridStore,
    private readonly columnModel: ColumnModel,
    private readonly api: unknown,
  ) {
    this.boundMouseOver = this.handleMouseOver.bind(this);
    this.boundMouseOut = this.handleMouseOut.bind(this);
  }

  /** Attaches the delegated hover listeners to the grid body wrapper. */
  mount(bodyWrapEl: HTMLElement): void {
    this.hostEl = bodyWrapEl;
    bodyWrapEl.addEventListener('mouseover', this.boundMouseOver);
    bodyWrapEl.addEventListener('mouseout', this.boundMouseOut);
  }

  /** Detaches listeners, clears any pending timer, and removes the tooltip element. */
  destroy(): void {
    this.hostEl?.removeEventListener('mouseover', this.boundMouseOver);
    this.hostEl?.removeEventListener('mouseout', this.boundMouseOut);
    this.clearShowTimer();
    this.tooltipEl?.remove();
    this.tooltipEl = null;
    this.hostEl = null;
    this.hoveredCellEl = null;
  }

  private handleMouseOver(e: MouseEvent): void {
    const cellEl = (e.target as HTMLElement).closest<HTMLElement>('.pg-cell[data-col-id]');
    if (!cellEl || cellEl === this.hoveredCellEl) return;
    this.hoveredCellEl = cellEl;
    this.clearShowTimer();
    this.hide();

    const colId = cellEl.getAttribute('data-col-id');
    const nodeId = cellEl.closest<HTMLElement>('[data-node-id]')?.getAttribute('data-node-id');
    if (!colId || !nodeId) return;

    const columns = this.columnModel.getVisibleColumns();
    const colIndex = columns.findIndex((c) => c.colId === colId);
    const colDef = columns[colIndex];
    if (!colDef) return;

    const tooltipFn = resolveColumnRenderer(colDef, 'tooltip');
    if (!tooltipFn) return;

    const rows = (this.store.get('visibleRows') as RowNode[] | undefined) ?? [];
    const row = rows.find((r) => r.nodeId === nodeId);
    if (!row || row.type !== 'data') return;

    this.showTimer = setTimeout(() => {
      const rawValue = row.data[colDef.field];
      const params: TooltipRendererParams = {
        value: rawValue,
        rawValue,
        row: row.data,
        colDef,
        rowIndex: row.rowIndex,
        colIndex,
        api: this.api,
      };
      this.show(cellEl, tooltipFn(params));
    }, SHOW_DELAY_MS);
  }

  private handleMouseOut(e: MouseEvent): void {
    const related = e.relatedTarget as Node | null;
    if (this.hoveredCellEl && related && this.hoveredCellEl.contains(related)) return;
    this.hoveredCellEl = null;
    this.clearShowTimer();
    this.hide();
  }

  private show(anchorEl: HTMLElement, content: RendererOutput): void {
    if (!this.hostEl) return;
    if (!this.tooltipEl) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.className = 'pg-tooltip';
      this.hostEl.appendChild(this.tooltipEl);
    }

    if (typeof content === 'string') {
      this.tooltipEl.innerHTML = content;
    } else {
      this.tooltipEl.innerHTML = '';
      this.tooltipEl.appendChild(content);
    }

    this.position(anchorEl);
    this.tooltipEl.classList.add('pg-tooltip--visible');
  }

  private hide(): void {
    this.tooltipEl?.classList.remove('pg-tooltip--visible');
  }

  /** Positions the tooltip above the anchor cell, clamped to stay within the grid body. */
  private position(anchorEl: HTMLElement): void {
    if (!this.tooltipEl || !this.hostEl) return;

    const hostRect = this.hostEl.getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();

    let top = anchorRect.top - hostRect.top - tooltipRect.height - 8;
    if (top < 0) top = anchorRect.bottom - hostRect.top + 8;

    let left = anchorRect.left - hostRect.left;
    const maxLeft = hostRect.width - tooltipRect.width - 4;
    if (left > maxLeft) left = Math.max(4, maxLeft);
    if (left < 4) left = 4;

    this.tooltipEl.style.transform = `translate(${left}px, ${top}px)`;
  }

  private clearShowTimer(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }
}
