/**
 * The built-in **JSON exporter**.
 *
 * JSON needs no library, so — unlike Excel and PDF — it is implemented directly
 * in the core and is always available, with no registration step.
 *
 * It emits an array of objects, one per exported row, keyed by each column's
 * `field` (or its header, with {@link JsonExportOptions.useHeadersAsKeys}).
 * Values are the grid's **logical** values, not its display strings: a number
 * stays `1200`, a boolean stays `true`, and a missing value is `null` rather
 * than absent — so a round-trip through `JSON.parse` gives back data, not text.
 * Hosts that want the on-screen strings ask for
 * {@link JsonExportOptions.useFormattedValues}.
 *
 * @packageDocumentation
 */

import type {
  GridExporter,
  JsonExportOptions,
  PreparedExportData,
  ResolvedExportOptions,
} from './export.types';
import { BuiltInExportFormat } from './export.types';
import { EXPORT_MIME_TYPES, downloadExportFile } from './file-download';

/** A single exported row as a plain object. */
export type JsonExportRecord = Record<string, unknown>;

/**
 * Projects prepared data into plain records, ready for `JSON.stringify`.
 *
 * Duplicate keys (two columns sharing a `field`, or two identical headers under
 * `useHeadersAsKeys`) are disambiguated with a numeric suffix rather than
 * silently overwriting each other — a column that vanished from the output
 * would be the harder bug to notice.
 *
 * @param data    - The normalised export payload.
 * @param options - JSON options; `useHeadersAsKeys` and `useFormattedValues` are read.
 */
export function toJsonRecords(
  data: PreparedExportData,
  options: JsonExportOptions = {},
): JsonExportRecord[] {
  const keys = resolveKeys(data, options.useHeadersAsKeys === true);
  const useFormatted = options.useFormattedValues === true;

  const records: JsonExportRecord[] = new Array<JsonExportRecord>(data.rows.length);
  for (let r = 0; r < data.rows.length; r++) {
    const cells = data.rows[r].cells;
    const record: JsonExportRecord = {};
    for (let c = 0; c < keys.length; c++) {
      const cell = cells[c];
      record[keys[c]] = useFormatted ? cell.formatted : cell.value;
    }
    records[r] = record;
  }
  return records;
}

/**
 * Serialises prepared data as a JSON document.
 *
 * `Date` values are serialised by `JSON.stringify` to ISO-8601 strings, which
 * is the only interchange form JSON has for them.
 *
 * @param data    - The normalised export payload.
 * @param options - JSON options; `pretty` and `indent` control the layout.
 */
export function serializeJson(data: PreparedExportData, options: JsonExportOptions = {}): string {
  const records = toJsonRecords(data, options);
  // Pretty by default: a JSON export is usually read or diffed by a human, and
  // a host that wants the compact form asks for `pretty: false`.
  const pretty = options.pretty !== false;
  return JSON.stringify(records, null, pretty ? (options.indent ?? 2) : 0);
}

/**
 * Resolves one output key per column, keeping them unique.
 *
 * @param data        - The payload whose columns are being keyed.
 * @param useHeaders  - Key by header text instead of by field.
 */
function resolveKeys(data: PreparedExportData, useHeaders: boolean): string[] {
  const keys: string[] = new Array<string>(data.columns.length);
  const used = new Set<string>();
  for (let c = 0; c < data.columns.length; c++) {
    const column = data.columns[c];
    const base = (useHeaders ? column.header : column.field) || column.colId;
    let key = base;
    let suffix = 2;
    while (used.has(key)) key = `${base}_${suffix++}`;
    used.add(key);
    keys[c] = key;
  }
  return keys;
}

/**
 * The core's JSON exporter. Registered automatically by every grid — JSON never
 * reports itself as unavailable.
 */
export const jsonExporter: GridExporter<JsonExportOptions> = {
  format: BuiltInExportFormat.Json,
  extension: 'json',
  export(data: PreparedExportData, options: ResolvedExportOptions & JsonExportOptions) {
    downloadExportFile(serializeJson(data, options), options.fileName, EXPORT_MIME_TYPES.json);
  },
};
