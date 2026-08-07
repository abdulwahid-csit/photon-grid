/**
 * The built-in **CSV exporter**.
 *
 * CSV needs nothing external, so it lives in the core and is always available.
 *
 * The serialisation rules here are the ones Photon Grid has always used —
 * RFC 4180 quoting, `\r\n` line endings, formatted (on-screen) cell text — and
 * are deliberately unchanged: this exporter is a new *entry point* to existing
 * behaviour, not a rewrite of it. What it adds is the shared
 * {@link PreparedExportData} pipeline, so a CSV and a workbook of the same grid
 * now contain the same rows and columns by construction.
 *
 * @packageDocumentation
 */

import type { GridExporter, PreparedExportData, ResolvedExportOptions } from './export.types';
import { BuiltInExportFormat } from './export.types';
import { EXPORT_MIME_TYPES, downloadExportFile } from './file-download';

/** Fields that force a value to be quoted, per RFC 4180. */
const CSV_NEEDS_QUOTING = /[",\r\n]/;

/**
 * Escapes one CSV field.
 *
 * Quotes only when required — an unconditionally-quoted file is valid but
 * roughly twice the size, which matters when the export is 100k rows.
 */
export function escapeCsvValue(value: string): string {
  return CSV_NEEDS_QUOTING.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Serialises prepared data as an RFC 4180 CSV document.
 *
 * Exported separately from the download so tests (and hosts that want the text
 * rather than a file) can assert on the exact bytes.
 *
 * @param data    - The normalised export payload.
 * @param options - Only {@link ResolvedExportOptions.skipHeader} is read.
 */
export function serializeCsv(data: PreparedExportData, options: ResolvedExportOptions): string {
  const lines: string[] = [];
  if (!options.skipHeader) {
    lines.push(data.headers.map(escapeCsvValue).join(','));
  }
  for (const row of data.rows) {
    const cells: string[] = new Array<string>(row.cells.length);
    for (let c = 0; c < row.cells.length; c++) cells[c] = escapeCsvValue(row.cells[c].formatted);
    lines.push(cells.join(','));
  }
  return lines.join('\r\n');
}

/**
 * The core's CSV exporter. Registered automatically by every grid; a host can
 * still replace it through `registerExporter('csv', …)` to change quoting or
 * the delimiter.
 */
export const csvExporter: GridExporter = {
  format: BuiltInExportFormat.Csv,
  extension: 'csv',
  export(data, options) {
    downloadExportFile(serializeCsv(data, options), options.fileName, EXPORT_MIME_TYPES.csv);
  },
};
