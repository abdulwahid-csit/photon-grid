import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { DisplayRendererParams } from '../types/renderer.types';
import type {
  BaseRendererOptions,
  BuiltInRenderContext,
} from '../types/built-in-renderer.types';
import type { IconRenderer } from '../icons/icon-renderer';
import { getCellValue, resolveFieldPath, formatCellValue } from '../engines/editing/value-accessor';
import { createDiv, toggleClass } from './dom-utils';
import { resolveDisplayRenderer } from './renderer-resolver';
import { buildBooleanCellCheckbox } from './built-in/checkbox-element';
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
  /**
   * Whether the grid permits editing at all (`GridOptions.editing.mode !== 'none'`).
   *
   * Only `boolean` columns consult it, and only to decide whether their
   * checkbox is interactive: a checkbox that looks clickable but silently
   * refuses to commit is worse than one that is visibly disabled. Optional and
   * treated as `true` when omitted, so a caller that renders a cell outside a
   * configured grid (tests, one-off previews) gets the permissive default.
   */
  editingEnabled?: boolean;
}

// Re-exported from their leaf module so existing importers keep working. The
// definitions themselves live in `built-in/checkbox-element.ts` because the
// built-in `checkbox` renderer needs them, and importing them from here would
// close a module cycle through the renderer registry.
export {
  BOOLEAN_CELL_CHECKBOX_CLASS,
  buildBooleanCellCheckbox,
  isBooleanCellEditable,
  syncBooleanCellCheckbox,
} from './built-in/checkbox-element';

export class CellRenderer {
  renderCell(ctx: CellRenderContext): HTMLElement {
    const { row, colDef, rowIndex, colIndex, api } = ctx;
    // Logical value drives display; rawValue exposes the underlying field value
    // so custom renderers can access both (they differ only when a valueGetter
    // is configured â€” otherwise a single read is shared to avoid extra work).
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
    const dynClass = this.resolveDynamicClass(value, rawValue, ctx);
    if (dynClass) cell.classList.add(dynClass);

    const inner = createDiv('pg-cell__inner');
    this.renderCellContent(inner, value, rawValue, ctx);

    cell.appendChild(inner);
    return cell;
  }

  /**
   * Fills a `.pg-cell__inner` element with a cell's content.
   *
   * Extracted from {@link renderCell} so the Virtual DOM's cell patcher can
   * re-render a changed cell **into its existing element** using the exact same
   * code path as the initial render â€” a custom renderer, an HTML cell and a
   * built-in type all behave identically whether the cell was just created or
   * patched in place. Existing children are discarded first, so the call is
   * idempotent.
   *
   * @param inner    - The `.pg-cell__inner` element to fill (cleared first).
   * @param value    - Logical value (post `valueGetter`).
   * @param rawValue - Underlying field value, for renderers that need both.
   * @param ctx      - Render context (column, indices, formatting, api).
   */
  renderCellContent(
    inner: HTMLElement,
    value: unknown,
    rawValue: unknown,
    ctx: CellRenderContext,
  ): void {
    const { row, colDef, rowIndex, colIndex, api } = ctx;

    // Cheaper than innerHTML = '' and does not re-parse markup.
    while (inner.firstChild) inner.removeChild(inner.firstChild);

    const resolved = resolveDisplayRenderer(colDef);

    if (resolved.custom) {
      const params: DisplayRendererParams = { value, rawValue, row: row.data, colDef, rowIndex, colIndex, api };
      const rendered = resolved.custom(params);
      if (typeof rendered === 'string') {
        inner.innerHTML = rendered;
      } else {
        inner.appendChild(rendered);
      }
      return;
    }

    if (resolved.kind === 'html') {
      inner.innerHTML = String(value ?? '');
      return;
    }

    if (resolved.builtIn) {
      resolved.builtIn.render(this.buildRenderContext(inner, value, rawValue, ctx, resolved.options));
      return;
    }

    // No renderer resolved â€” the column formats as plain text. Reached when a
    // `valueFormatter` owns the string, or when a slim registry has no renderer
    // registered for the column's type.
    const span = document.createElement('span');
    span.className = 'pg-cell__value';
    const formatted = this.formatFor(value, ctx);
    span.textContent = formatted;
    span.title = formatted;
    inner.appendChild(span);
  }

  /**
   * The string a text-producing renderer starts from.
   *
   * Routed through `formatCellValue`, so a column `valueFormatter` has already
   * won over the type's default formatting by the time a renderer sees it â€”
   * which is what lets `renderer: 'currency'` and a `valueFormatter` coexist
   * instead of one silently discarding the other.
   */
  private formatFor(value: unknown, ctx: CellRenderContext): string {
    return formatCellValue(
      ctx.row.data,
      ctx.colDef,
      value,
      {
        locale: ctx.locale,
        dateFormat: ctx.dateFormat,
        timeZone: ctx.timeZone,
        currencySymbol: ctx.currencySymbol,
      },
      ctx.api,
    );
  }

  /** Adapts a {@link CellRenderContext} into the context a built-in renderer receives. */
  private buildRenderContext(
    inner: HTMLElement,
    value: unknown,
    rawValue: unknown,
    ctx: CellRenderContext,
    options: BaseRendererOptions,
  ): BuiltInRenderContext {
    return {
      inner,
      value,
      rawValue,
      formattedValue: this.formatFor(value, ctx),
      row: ctx.row.data,
      colDef: ctx.colDef,
      rowIndex: ctx.rowIndex,
      colIndex: ctx.colIndex,
      options,
      icons: ctx.iconRenderer ?? null,
      locale: ctx.locale,
      dateFormat: ctx.dateFormat,
      timeZone: ctx.timeZone,
      currencySymbol: ctx.currencySymbol,
      editingEnabled: ctx.editingEnabled,
      api: ctx.api,
    };
  }


  /**
   * Resolves the dynamic class contributed by `ColumnDef.cellCssClass`.
   *
   * Returns `''` when the column declares none, so callers can compare the
   * result against a previously applied class and swap only on change.
   *
   * @param value    - Logical value (post `valueGetter`).
   * @param rawValue - Underlying field value.
   * @param ctx      - Render context.
   * @returns The class name to apply, or `''`.
   */
  resolveDynamicClass(value: unknown, rawValue: unknown, ctx: CellRenderContext): string {
    const { colDef, row, rowIndex, colIndex, api } = ctx;
    if (!colDef.cellCssClass) return '';
    if (typeof colDef.cellCssClass === 'string') return colDef.cellCssClass;
    return colDef.cellCssClass({ value, rawValue, row: row.data, colDef, rowIndex, colIndex, api }) || '';
  }

  /**
   * `true` when a column's cells render as plain text and can therefore be
   * patched by writing a single string, with no element creation at all.
   *
   * Delegates to the resolved renderer's own `textOnly` declaration, so a
   * newly-registered renderer is classified correctly without this method
   * knowing it exists.
   *
   * @param colDef - Column to classify.
   */
  isTextOnlyColumn(colDef: ColumnDef): boolean {
    return resolveDisplayRenderer(colDef).textOnly;
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
   * When `selectable` is `true` the cell becomes an AG Gridâ€“style selection
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

}
