/**
 * The **Export Data Preparer** — the single place that turns "export this grid"
 * into a concrete set of columns, headers and cells.
 *
 * Every exporter consumes its output, which is the whole point: row scope
 * (selected / filtered / on-screen), column scope (explicit list / visible /
 * all), the `valueGetter → valueFormatter` pipeline, and the null/date/array
 * normalisation rules are decided **once**, here. Without this layer, CSV,
 * Excel and PDF each grow their own slightly different answer to "what is in
 * this cell", and a support ticket about the three disagreeing is inevitable.
 *
 * The preparer is pure and DOM-free: it reads through the
 * {@link ExportDataSource} port and returns data. That makes it directly
 * unit-testable with a literal source object, and keeps the export module free
 * of any dependency on `GridCore`.
 *
 * **Cost.** One pass over the exported rows × exported columns, with a single
 * pre-sized array per row and no intermediate copies. Row and column scope are
 * resolved before the loop, so a 10-column export of 100k rows does exactly
 * 1M `getCellValue` calls and allocates 100k arrays — not a row object graph.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../types/column.types';
import type { RowNode } from '../types/row.types';
import { formatCellValue, getCellValue } from '../engines/editing/value-accessor';
import type {
  ExportCell,
  ExportColumn,
  ExportDataSource,
  ExportOptions,
  ExportRow,
  PreparedExportData,
} from './export.types';

/**
 * Builds {@link PreparedExportData} from a live grid.
 *
 * Stateless apart from its port, so one instance per grid is enough and
 * `prepare()` is safe to call concurrently.
 */
export class ExportDataPreparer {
  constructor(private readonly source: ExportDataSource) {}

  /**
   * Resolves scope and materialises the export payload.
   *
   * @param options - The resolved export options; only the scope and hook
   *   fields are read, so any format's option object can be passed unchanged.
   * @returns Columns, headers and rows, all in export order.
   */
  prepare(options: ExportOptions = {}): PreparedExportData {
    const columns = this.resolveColumns(options);
    const nodes = this.resolveRows(options);

    const headers: string[] = new Array<string>(columns.length);
    for (let c = 0; c < columns.length; c++) headers[c] = columns[c].header;

    const formatOptions = this.source.getFormatOptions();
    const api = this.source.getApi();
    const processCell = options.processCellValue;

    const rows: ExportRow[] = new Array<ExportRow>(nodes.length);
    for (let r = 0; r < nodes.length; r++) {
      const node = nodes[r];
      const cells: ExportCell[] = new Array<ExportCell>(columns.length);
      for (let c = 0; c < columns.length; c++) {
        const colDef = columns[c].colDef;
        const raw = getCellValue(node.data, colDef, api);
        let formatted = formatCellValue(node.data, colDef, raw, formatOptions, api);
        if (processCell) {
          formatted = processCell({ value: raw, formatted, colDef, node, rowIndex: r });
        }
        cells[c] = { value: normalizeExportValue(raw, formatted), formatted };
      }
      rows[r] = { node, cells };
    }

    return { columns, headers, rows, nodes };
  }

  // ── Scope resolution ───────────────────────────────────────────────────────

  /**
   * Resolves which columns are exported, and in which order.
   *
   * Precedence, highest first:
   *  1. `options.columns` — an explicit list, honoured verbatim including its
   *     order and any hidden column it names.
   *  2. `includeHiddenColumns` — every leaf column in display order.
   *  3. The visible columns in display order (the default).
   *
   * Columns marked {@link ColumnDef.suppressExport} are dropped from 2 and 3;
   * an explicit list in 1 outranks the flag, because naming a column *is* the
   * decision to export it.
   */
  private resolveColumns(options: ExportOptions): readonly ExportColumn[] {
    const explicit = options.columns;

    let candidates: readonly ColumnDef[];
    if (explicit && explicit.length > 0) {
      const all = this.source.getAllColumns();
      // Indexed once rather than scanned per entry: an explicit list of n over
      // m columns costs O(n + m) instead of O(n × m).
      const byKey = new Map<string, ColumnDef>();
      for (const col of all) {
        if (!byKey.has(col.colId)) byKey.set(col.colId, col);
        if (col.field && !byKey.has(col.field)) byKey.set(col.field, col);
      }
      const picked: ColumnDef[] = [];
      const seen = new Set<ColumnDef>();
      for (const key of explicit) {
        const col = byKey.get(key);
        // Unknown keys are ignored rather than throwing: a saved export preset
        // that outlives a renamed column should still export the rest.
        if (col && !seen.has(col)) {
          seen.add(col);
          picked.push(col);
        }
      }
      candidates = picked;
    } else {
      const pool = options.includeHiddenColumns
        ? this.source.getAllColumns()
        : this.source.getVisibleColumns();
      candidates = pool.filter((col) => !isNonExportableColumn(col));
    }

    const processHeader = options.processHeader;
    const result: ExportColumn[] = new Array<ExportColumn>(candidates.length);
    for (let i = 0; i < candidates.length; i++) {
      const colDef = candidates[i];
      const header = processHeader
        ? processHeader({ header: colDef.header, colDef, colIndex: i })
        : colDef.header;
      result[i] = {
        colId: colDef.colId,
        field: colDef.field,
        header,
        type: colDef.type,
        colDef,
      };
    }
    return result;
  }

  /**
   * Resolves which rows are exported.
   *
   * Precedence, highest first: `onlySelectedRows` → `onlyFilteredRows` → the
   * rows currently on screen. The last is the default because it is what
   * `GridApi.exportCsv()` has always exported, so upgrading changes nothing for
   * a grid that passes no options.
   *
   * Group headers, group footers, summary, detail and loading placeholder rows
   * are never exported — they are grid chrome, not data.
   */
  private resolveRows(options: ExportOptions): readonly RowNode[] {
    const scoped = options.onlySelectedRows
      ? this.source.getSelectedRows()
      : options.onlyFilteredRows
        ? this.source.getFilteredRows()
        : this.source.getVisibleRows();

    // Avoids a copy in the overwhelmingly common case of an all-data row set.
    let hasNonData = false;
    for (let i = 0; i < scoped.length; i++) {
      if (scoped[i].type !== 'data') {
        hasNonData = true;
        break;
      }
    }
    return hasNonData ? scoped.filter((row) => row.type === 'data') : scoped;
  }
}

// ── Value normalisation ──────────────────────────────────────────────────────

/**
 * Collapses a logical value to a primitive an exporter can write natively.
 *
 * Excel wants a real number for a number and a real `Date` for a date; JSON
 * wants the same values untouched; CSV and PDF want the display string. Doing
 * this once here means an exporter picks `cell.value` or `cell.formatted` and
 * is done — no exporter has to re-decide what an `undefined`, an array or a
 * `Date`-shaped ISO string means.
 *
 * @param raw       - The logical value from the value pipeline.
 * @param formatted - Its display string, used for values with no primitive form.
 */
function normalizeExportValue(raw: unknown, formatted: string): ExportCell['value'] {
  if (raw === null || raw === undefined) return null;

  const kind = typeof raw;
  if (kind === 'string' || kind === 'boolean') return raw as string | boolean;
  // NaN and ±Infinity have no representation in JSON or a spreadsheet cell;
  // the display string is the only honest answer.
  if (kind === 'number') return Number.isFinite(raw as number) ? (raw as number) : formatted;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? formatted : raw;
  if (kind === 'bigint') return formatted;

  // Arrays, plain objects and anything else render as the grid renders them,
  // so a multi-value cell reads the same in the file as it does on screen.
  return formatted;
}

/**
 * Whether a column is grid chrome rather than data.
 *
 * `suppressExport` is the explicit opt-out; the `actions` renderer is excluded
 * automatically because a column of buttons has no meaningful cell text and
 * exporting a blank column is never what the host wanted.
 */
function isNonExportableColumn(col: ColumnDef): boolean {
  if (col.suppressExport) return true;
  const renderer = col.renderer;
  if (renderer === 'actions') return true;
  if (typeof renderer === 'object' && renderer !== null && 'name' in renderer) {
    return (renderer as { name?: string }).name === 'actions';
  }
  return false;
}
