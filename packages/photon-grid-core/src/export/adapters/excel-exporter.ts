/**
 * **Optional SheetJS-backed Excel exporter.**
 *
 * This adapter is the officially-supported way to produce real `.xlsx`
 * workbooks. It is deliberately **not** referenced by the core barrel
 * (`src/index.ts`) and is published on its own entry point, and — unlike the
 * import-side SheetJS adapter — it never so much as names `'xlsx'` in an
 * `import()`. The host passes the module in:
 *
 * ```ts
 * import * as XLSX from 'xlsx';
 * import { registerExporter } from 'photon-grid-core';
 * import { createExcelExporter } from 'photon-grid-core/export/excel';
 *
 * registerExporter('excel', createExcelExporter(XLSX));
 * await grid.api.export('excel', { fileName: 'employees.xlsx' });
 * ```
 *
 * That inversion is what keeps Photon Grid Core at zero runtime dependencies:
 * this file contains only the structural types below, so nothing about `xlsx`
 * can be bundled by anyone who does not import it themselves.
 *
 * The workbook it writes uses **native cell types** — numbers stay numbers,
 * booleans stay booleans, dates stay dates — so the result can be summed,
 * sorted and filtered in Excel without re-parsing text. Column visibility,
 * column order and the export's row scope all come from the shared
 * {@link PreparedExportData}, so a workbook always matches the CSV of the same
 * grid.
 *
 * @packageDocumentation
 */

import { ImportEngine } from '../../engines/import';
import type {
  ExcelExportOptions,
  ExportColumn,
  GridExporter,
  PreparedExportData,
  ResolvedExportOptions,
} from '../export.types';
import { BuiltInExportFormat } from '../export.types';
import { EXPORT_MIME_TYPES, downloadExportFile } from '../file-download';

// ── Minimal structural view of the SheetJS surface this adapter uses ─────────
// Typed here rather than imported so the core compiles and ships without
// `xlsx` present. Any module matching this shape works, including a stub.

/** A SheetJS worksheet — an opaque handle as far as this adapter is concerned. */
export interface SheetJsWorksheet {
  '!cols'?: Array<{ wch?: number }>;
  '!freeze'?: string;
  [key: string]: unknown;
}

/** A SheetJS workbook. */
export interface SheetJsWorkbook {
  SheetNames: string[];
  Sheets: Record<string, SheetJsWorksheet>;
  [key: string]: unknown;
}

/** The `XLSX.utils` members this adapter calls. */
export interface SheetJsUtils {
  book_new(): SheetJsWorkbook;
  book_append_sheet(workbook: SheetJsWorkbook, sheet: SheetJsWorksheet, name?: string): void;
  aoa_to_sheet(data: unknown[][], opts?: { cellDates?: boolean }): SheetJsWorksheet;
}

/** The `xlsx` module surface this adapter calls. */
export interface SheetJsModule {
  readonly utils: SheetJsUtils;
  write(workbook: SheetJsWorkbook, opts: { bookType?: string; type?: string; cellDates?: boolean }): unknown;
}

/** Longest column width, in characters, that auto-sizing will produce. */
const MAX_AUTO_COLUMN_WIDTH = 60;
/** Shortest column width, so a one-character header still reads as a column. */
const MIN_AUTO_COLUMN_WIDTH = 8;
/** Padding added to the widest cell when auto-sizing. */
const AUTO_COLUMN_PADDING = 2;
/** SheetJS's worksheet-name limit; Excel rejects anything longer. */
const MAX_SHEET_NAME_LENGTH = 31;

/**
 * Builds an Excel {@link GridExporter} bound to a host-supplied SheetJS module.
 *
 * @param xlsx - The `xlsx` module (`import * as XLSX from 'xlsx'`), or anything
 *   structurally compatible with {@link SheetJsModule}.
 * @returns An exporter ready for `registerExporter('excel', …)`.
 * @throws {TypeError} When `xlsx` is missing or is not the SheetJS module — a
 *   clear failure at registration beats an opaque one at export time.
 */
export function createExcelExporter(xlsx: SheetJsModule): GridExporter<ExcelExportOptions> {
  if (!xlsx || !xlsx.utils || typeof xlsx.write !== 'function') {
    throw new TypeError(
      "[PhotonGrid] createExcelExporter(xlsx) needs the SheetJS module — `import * as XLSX from 'xlsx'`.",
    );
  }

  return {
    format: BuiltInExportFormat.Excel,
    extension: 'xlsx',
    export(data: PreparedExportData, options: ResolvedExportOptions & ExcelExportOptions): void {
      const matrix = buildSheetMatrix(data, options);
      const sheet = xlsx.utils.aoa_to_sheet(matrix, { cellDates: true });

      if (options.autoSizeColumns !== false) {
        sheet['!cols'] = measureColumns(data, options.skipHeader !== true);
      }
      // Excel's own header-freeze pane. Harmless in readers that ignore it.
      if (options.freezeHeader !== false && options.skipHeader !== true) {
        sheet['!freeze'] = 'A2';
      }

      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, sheet, sheetName(options.sheetName));

      const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array', cellDates: true });
      downloadExportFile(buffer as ArrayBuffer, options.fileName, EXPORT_MIME_TYPES.xlsx);
    },
  };
}

/**
 * Projects the prepared data into the array-of-arrays SheetJS consumes.
 *
 * With `useNativeTypes` on (the default) each cell contributes its normalised
 * primitive, so SheetJS writes a numeric, boolean or date cell; `null` becomes
 * an empty string, because a literal `null` renders as the text "null" in some
 * spreadsheet readers.
 */
function buildSheetMatrix(
  data: PreparedExportData,
  options: ExcelExportOptions,
): unknown[][] {
  const native = options.useNativeTypes !== false;
  const matrix: unknown[][] = [];
  if (options.skipHeader !== true) matrix.push([...data.headers]);

  for (const row of data.rows) {
    const cells: unknown[] = new Array<unknown>(row.cells.length);
    for (let c = 0; c < row.cells.length; c++) {
      const cell = row.cells[c];
      if (!native) {
        cells[c] = cell.formatted;
      } else {
        cells[c] = cell.value === null ? '' : cell.value;
      }
    }
    matrix.push(cells);
  }
  return matrix;
}

/**
 * Sizes each column to its widest cell, clamped so one long free-text value
 * cannot push every other column off the page.
 *
 * Measured on the display strings rather than the raw values, because that is
 * what the reader will render.
 */
function measureColumns(data: PreparedExportData, includeHeader: boolean): Array<{ wch: number }> {
  const widths: number[] = new Array<number>(data.columns.length);
  for (let c = 0; c < data.columns.length; c++) {
    widths[c] = includeHeader ? data.headers[c].length : 0;
  }
  for (const row of data.rows) {
    for (let c = 0; c < row.cells.length; c++) {
      const length = row.cells[c].formatted.length;
      if (length > widths[c]) widths[c] = length;
    }
  }
  return widths.map((width) => ({
    wch: Math.min(MAX_AUTO_COLUMN_WIDTH, Math.max(MIN_AUTO_COLUMN_WIDTH, width + AUTO_COLUMN_PADDING)),
  }));
}

/**
 * Sanitises a worksheet name: Excel forbids `: \ / ? * [ ]` and caps the name
 * at 31 characters, and rejects the whole file rather than truncating for you.
 */
function sheetName(requested: string | undefined): string {
  const name = (requested ?? 'Sheet1').replace(/[:\\/?*[\]]/g, ' ').trim();
  return (name || 'Sheet1').slice(0, MAX_SHEET_NAME_LENGTH);
}

/** Re-exported so a host writing its own adapter can reuse the column shape. */
export type { ExportColumn };
