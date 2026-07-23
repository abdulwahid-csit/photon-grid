import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { DisplayRendererParams } from '../types/renderer.types';
import type { IconRenderer } from '../icons/icon-renderer';
import { formatValue } from '../engines/editing/value-parser';
import { getCellValue, resolveFieldPath, formatCellValue } from '../engines/editing/value-accessor';
import { createDiv, toggleClass } from './dom-utils';
import { resolveColumnRenderer } from './renderer-resolver';
import { SparklineRenderer } from '../chart/sparkline/sparkline-renderer';

export interface CellRenderContext {
  row: RowNode;
  colDef: ColumnDef;
  rowIndex: number;
  colIndex: number;
  iconRenderer: IconRenderer;
  dateFormat?: string;
  timeZone?: string;
  currencySymbol?: string;
  locale?: string;
  api: unknown;
}

export class CellRenderer {
  renderCell(ctx: CellRenderContext): HTMLElement {
    const { row, colDef, rowIndex, colIndex, api } = ctx;
    // Logical value drives display; rawValue exposes the underlying field value
    // so custom renderers can access both (they differ only when a valueGetter
    // is configured — otherwise a single read is shared to avoid extra work).
    const value = getCellValue(row.data, colDef, api);
    const rawValue = colDef.valueGetter ? resolveFieldPath(row.data, colDef.field) : value;

    const cell = createDiv('pg-cell');
    cell.setAttribute('data-row-index', String(rowIndex));
    cell.setAttribute('data-col-index', String(colIndex));
    cell.setAttribute('data-col-id', colDef.colId);
    cell.setAttribute('data-field', colDef.field);
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('tabindex', '-1');

    toggleClass(cell, 'pg-cell--selected', row.selected);
    const align = colDef.textAlign ?? (colDef.type === 'number' || colDef.type === 'currency' ? 'right' : 'left');
    if (align !== 'left') cell.classList.add(`pg-cell--align-${align}`);
    if (colDef.cellCssClass) {
      if (typeof colDef.cellCssClass === 'string') {
        cell.classList.add(colDef.cellCssClass);
      } else {
        const dynClass = colDef.cellCssClass({ value, rawValue, row: row.data, colDef, rowIndex, colIndex, api });
        if (dynClass) cell.classList.add(dynClass);
      }
    }

    const inner = createDiv('pg-cell__inner');

    const displayFn = resolveColumnRenderer(colDef, 'display');
    if (displayFn) {
      const params: DisplayRendererParams = { value, rawValue, row: row.data, colDef, rowIndex, colIndex, api };
      const rendered = displayFn(params);
      if (typeof rendered === 'string') {
        inner.innerHTML = rendered;
      } else {
        inner.appendChild(rendered);
      }
    } else if (colDef.renderHtml) {
      inner.innerHTML = String(value ?? '');
    } else {
      inner.appendChild(this.renderDefaultCell(value, colDef, ctx));
    }

    cell.appendChild(inner);
    return cell;
  }

  renderCheckboxCell(row: RowNode, rowIndex: number): HTMLElement {
    const cell = createDiv('pg-cell pg-cell--checkbox');
    cell.setAttribute('data-row-index', String(rowIndex));
    cell.setAttribute('role', 'gridcell');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'pg-checkbox';
    checkbox.checked = row.selected;
    checkbox.setAttribute('aria-label', 'Select row');
    checkbox.setAttribute('data-node-id', row.nodeId);

    cell.appendChild(checkbox);
    return cell;
  }

  /**
   * Renders a serial (row-number) gutter cell.
   *
   * When `selectable` is `true` the cell becomes an AG Grid–style selection
   * column entry: it carries the row's `data-node-id` and `aria-selected`, is
   * focusable, and gets the `pg-cell--serial-select` class so `GridRenderer`
   * can start a row drag-selection from it. Purely a display gutter otherwise.
   */
  renderSerialNumberCell(
    row: RowNode,
    displayIndex: number,
    selectable = false,
  ): HTMLElement {
    const cell = createDiv('pg-cell pg-cell--serial');
    cell.setAttribute('data-row-index', String(row.rowIndex));
    cell.setAttribute('role', 'gridcell');
    if (selectable) {
      cell.classList.add('pg-cell--serial-select');
      cell.setAttribute('data-node-id', row.nodeId);
      cell.setAttribute('aria-selected', row.selected ? 'true' : 'false');
      cell.setAttribute('tabindex', '-1');
    }
    const span = document.createElement('span');
    span.className = 'pg-cell__serial';
    span.textContent = String(displayIndex);
    cell.appendChild(span);
    return cell;
  }

  updateCellSelection(cell: HTMLElement, selected: boolean): void {
    toggleClass(cell, 'pg-cell--range-selected', selected);
  }

  updateCellActive(cell: HTMLElement, active: boolean): void {
    toggleClass(cell, 'pg-cell--active', active);
  }

  private renderDefaultCell(
    value: unknown,
    colDef: ColumnDef,
    ctx: CellRenderContext,
  ): HTMLElement {
    const span = document.createElement('span');
    span.className = 'pg-cell__value';

    // A column-level valueFormatter owns the textual presentation for every
    // data type: honour it first so authors get full, predictable control over
    // the displayed string (badges/icons/images remain opt-in via renderers).
    if (colDef.valueFormatter) {
      const formatted = formatCellValue(ctx.row.data, colDef, value, {
        locale: ctx.locale,
        dateFormat: ctx.dateFormat,
        timeZone: ctx.timeZone,
        currencySymbol: ctx.currencySymbol,
      });
      span.textContent = formatted;
      span.title = formatted;
      return span;
    }

    switch (colDef.type) {
      case 'boolean': {
        const bool = !!value;
        span.innerHTML = bool
          ? ctx.iconRenderer.renderToString('check', 14)
          : '';
        span.classList.add(bool ? 'pg-cell--bool-true' : 'pg-cell--bool-false');
        break;
      }
      case 'image': {
        if (value) {
          const img = document.createElement('img');
          img.src = String(value);
          img.className = 'pg-cell__image';
          img.style.cssText = 'width:32px;height:32px;object-fit:cover;border-radius:4px;';
          img.alt = '';
          span.appendChild(img);
        }
        break;
      }
      case 'dropdown':
      case 'object': {
        const lookup = colDef.type === 'object'
          ? this.resolveObjectKey(value, colDef)
          : value;
        const option = colDef.dropdownOptions?.find(
          (o) => String(o.value) === String(lookup ?? ''),
        );
        if (option?.color) {
          const badge = createDiv('pg-badge');
          badge.style.backgroundColor = option.color + '20';
          badge.style.color = option.color;
          badge.textContent = option.label;
          span.appendChild(badge);
        } else {
          span.textContent = option?.label ?? String(lookup ?? '');
        }
        break;
      }

      case 'array': {
        const values = Array.isArray(value) ? value.map(String) : [];
        span.className = 'pg-cell__value pg-cell__value--tags';
        const visible = values.slice(0, 3);
        for (const v of visible) {
          const opt = colDef.dropdownOptions?.find((o) => String(o.value) === v);
          const badge = createDiv('pg-badge');
          badge.textContent = opt?.label ?? v;
          if (opt?.color) {
            badge.style.backgroundColor = opt.color + '20';
            badge.style.color = opt.color;
          }
          span.appendChild(badge);
        }
        if (values.length > visible.length) {
          const more = createDiv('pg-badge pg-badge--overflow');
          more.textContent = `+${values.length - visible.length}`;
          span.appendChild(more);
        }
        break;
      }

      case 'sparkline': {
        span.className = 'pg-cell__value pg-cell__value--sparkline';

        const wrapper = createDiv('pg-sparkline-wrapper');
        const canvas = document.createElement('canvas');
        canvas.className = 'pg-sparkline';
        // aria: sparkline is decorative; the raw value is available via cell text
        canvas.setAttribute('aria-hidden', 'true');
        wrapper.appendChild(canvas);
        span.appendChild(wrapper);

        const sparkConfig = colDef.sparkline ?? {};

        // Defer rendering until the canvas has been mounted to the DOM and has
        // non-zero CSS dimensions (guaranteed to be true before the next paint).
        requestAnimationFrame(() => {
          if (!canvas.isConnected) return;
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          if (w > 0 && h > 0) {
            // Attach the renderer to the canvas element so external code
            // (e.g. a real-time ticker) can call redraw() without needing
            // to recreate the renderer or touch the grid refresh cycle.
            (canvas as HTMLCanvasElement & { _pgSparkline?: SparklineRenderer })._pgSparkline =
              new SparklineRenderer(canvas, value, sparkConfig);
          }
        });
        break;
      }

      default: {
        const formatted = formatValue(value, colDef, {
          locale: ctx.locale,
          dateFormat: ctx.dateFormat,
          timeZone: ctx.timeZone,
          currencySymbol: ctx.currencySymbol,
        });
        span.textContent = formatted ?? '';
        span.title = formatted ?? '';
        break;
      }
    }

    return span;
  }

  private resolveObjectKey(value: unknown, colDef: ColumnDef): unknown {
    if (typeof value === 'object' && value !== null) {
      const key = colDef.objectValueKey ?? 'value';
      return (value as Record<string, unknown>)[key];
    }
    return value;
  }
}
