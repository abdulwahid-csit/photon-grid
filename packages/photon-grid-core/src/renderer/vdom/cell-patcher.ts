/**
 * In-place cell updates for the viewport Virtual DOM.
 *
 * The patcher never creates or replaces a `.pg-cell` element. It writes into
 * the element the initial render produced, which is what preserves everything
 * the browser and the grid have attached to it: DOM focus, the active cell
 * editor, range-selection and active-cell classes, hover state, ARIA
 * attributes, and any listeners a custom renderer registered on its own
 * subtree.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type { CellRenderer, CellRenderContext } from '../cell-renderer';
import type { IconRenderer } from '../../icons/icon-renderer';
import { resolveFieldPath, formatCellValue } from '../../engines/editing/value-accessor';
import { formatValue } from '../../engines/editing/value-parser';
import { resolveDisplayRenderer } from '../renderer-resolver';
import { CellPatchKind } from './vdom.types';
import type { VirtualCell, VDomRenderContext } from './vdom.types';
import { snapshotCellValue } from './cell-value-equality';

/**
 * Class marking a cell whose editor is open. A cell carrying it is never
 * patched: the editor owns the DOM until it commits or cancels, and writing
 * underneath it would destroy the user's in-progress input.
 */
const EDITING_CLASS = 'pg-cell--editing';

/**
 * Applies value changes to live cell elements.
 *
 * Stateless apart from the collaborators it is constructed with, so a single
 * instance serves the whole grid.
 */
export class CellPatcher {
  /**
   * @param cellRenderer - Shared renderer; reused so a patched cell goes
   *                       through the exact same content code path as a freshly
   *                       built one.
   * @param iconRenderer - Icon renderer required by the render context.
   */
  constructor(
    private readonly cellRenderer: CellRenderer,
    private readonly iconRenderer: IconRenderer,
  ) {}

  /**
   * Writes a cell's new value into its existing element.
   *
   * Chooses the cheapest correct strategy:
   * 1. **Deferred** â€” the cell is being edited; the DOM is left alone.
   * 2. **Text** â€” a plain-text column: one `textContent` write, no allocation
   *    and no element creation.
   * 3. **Content** â€” a custom renderer or a rich built-in type: the cell's
   *    inner content is rebuilt in place, leaving the cell element (and its
   *    state) intact.
   *
   * The virtual cell is updated to match whatever was written, so the next diff
   * compares against reality.
   *
   * @param vcell  - Virtual cell to update; its `value` is refreshed in place.
   * @param row    - Row node supplying the new data.
   * @param colDef - Column definition for the cell.
   * @param ctx    - Formatting/lookup context matching the initial render.
   * @param value  - Logical value already read by the diff (not re-read here).
   * @returns Which strategy was applied.
   */
  patch(
    vcell: VirtualCell,
    row: RowNode,
    colDef: ColumnDef,
    ctx: VDomRenderContext,
    value: unknown,
  ): CellPatchKind {
    const el = vcell.el;
    if (el.classList.contains(EDITING_CLASS)) return CellPatchKind.DEFERRED;

    const rawValue = colDef.valueGetter ? resolveFieldPath(row.data, colDef.field) : value;

    const renderCtx: CellRenderContext = {
      row,
      colDef,
      rowIndex: row.rowIndex,
      colIndex: Number(el.getAttribute('data-col-index') ?? 0),
      iconRenderer: this.iconRenderer,
      dateFormat: ctx.dateFormat,
      timeZone: ctx.timeZone,
      currencySymbol: ctx.currencySymbol,
      locale: ctx.locale,
      api: ctx.api,
      editingEnabled: ctx.editingEnabled,
    };

    this.syncDynamicClass(vcell, value, rawValue, renderCtx);

    // Text fast path â€” the common case for numeric/string/date columns, which
    // is where high-frequency streams concentrate.
    if (vcell.valueEl) {
      const text = this.formatText(value, colDef, renderCtx);
      // `title` mirrors the text so the truncation tooltip never goes stale.
      vcell.valueEl.textContent = text;
      vcell.valueEl.title = text;
      vcell.value = snapshotCellValue(value);
      return CellPatchKind.TEXT;
    }

    // Checkbox / sparkline / progress / image / â€¦ â€” a renderer whose element
    // holds state the DOM cannot cheaply recreate updates it in place through
    // its own `patch`. Dispatching through the registry rather than a chain of
    // hardcoded probes is what lets a newly-registered renderer participate
    // without this file knowing it exists.
    const resolved = resolveDisplayRenderer(colDef);
    if (resolved.builtIn?.patch) {
      const patched = resolved.builtIn.patch(el, {
        inner: (el.firstElementChild as HTMLElement | null) ?? el,
        value,
        rawValue,
        formattedValue: this.formatText(value, colDef, renderCtx),
        row: row.data,
        colDef,
        rowIndex: row.rowIndex,
        colIndex: renderCtx.colIndex,
        options: resolved.options,
        icons: this.iconRenderer,
        locale: ctx.locale,
        dateFormat: ctx.dateFormat,
        timeZone: ctx.timeZone,
        currencySymbol: ctx.currencySymbol,
        editingEnabled: ctx.editingEnabled,
        api: ctx.api,
      });
      if (patched) {
        vcell.value = snapshotCellValue(value);
        return CellPatchKind.TEXT;
      }
    }

    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner) return CellPatchKind.NONE;

    this.cellRenderer.renderCellContent(inner, value, rawValue, renderCtx);
    vcell.value = snapshotCellValue(value);
    return CellPatchKind.CONTENT;
  }

  /**
   * Resolves the dynamic class a cell would carry for a given value.
   *
   * Used when adopting freshly rendered cells into the virtual tree so the
   * recorded class matches what `CellRenderer` applied at build time.
   *
   * @param value    - Logical value.
   * @param rawValue - Underlying field value.
   * @param row      - Owning row node.
   * @param colDef   - Column definition.
   * @param colIndex - Global column index of the cell.
   * @param ctx      - Formatting/lookup context.
   */
  resolveDynamicClass(
    value: unknown,
    rawValue: unknown,
    row: RowNode,
    colDef: ColumnDef,
    colIndex: number,
    ctx: VDomRenderContext,
  ): string {
    if (!colDef.cellCssClass) return '';
    return this.cellRenderer.resolveDynamicClass(value, rawValue, {
      row,
      colDef,
      rowIndex: row.rowIndex,
      colIndex,
      iconRenderer: this.iconRenderer,
      dateFormat: ctx.dateFormat,
      timeZone: ctx.timeZone,
      currencySymbol: ctx.currencySymbol,
      locale: ctx.locale,
      api: ctx.api,
    });
  }

  /** `true` when the column renders as plain text and can take the fast path. */
  isTextOnlyColumn(colDef: ColumnDef): boolean {
    return this.cellRenderer.isTextOnlyColumn(colDef);
  }

  /**
   * Re-evaluates `ColumnDef.cellCssClass` and swaps the applied class only when
   * it actually changed.
   *
   * A value-dependent class (e.g. red for a falling price) is part of the
   * cell's appearance, so it must track the value â€” but the class list is
   * shared with selection, hover and alignment classes, so only the previously
   * applied dynamic class is removed rather than resetting `className`.
   */
  private syncDynamicClass(
    vcell: VirtualCell,
    value: unknown,
    rawValue: unknown,
    renderCtx: CellRenderContext,
  ): void {
    if (!renderCtx.colDef.cellCssClass) return;
    const next = this.cellRenderer.resolveDynamicClass(value, rawValue, renderCtx);
    if (next === vcell.dynamicClass) return;
    if (vcell.dynamicClass) vcell.el.classList.remove(vcell.dynamicClass);
    if (next) vcell.el.classList.add(next);
    vcell.dynamicClass = next;
  }

  /**
   * Produces the display string for a text-only column, matching
   * `CellRenderer.renderDefaultCell`'s default branch exactly â€” a column-level
   * `valueFormatter` wins, otherwise the built-in type formatting applies.
   */
  private formatText(value: unknown, colDef: ColumnDef, ctx: CellRenderContext): string {
    const opts = {
      locale: ctx.locale,
      dateFormat: ctx.dateFormat,
      timeZone: ctx.timeZone,
      currencySymbol: ctx.currencySymbol,
    };
    if (colDef.valueFormatter) {
      return formatCellValue(ctx.row.data, colDef, value, opts);
    }
    return formatValue(value, colDef, opts) ?? '';
  }
}
