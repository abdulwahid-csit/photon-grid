/**
 * Browser download helper shared by every built-in and host-supplied exporter.
 *
 * One implementation rather than four: an exporter that hand-rolled its own
 * anchor click would be the place a leaked object URL or a missing
 * `revokeObjectURL` eventually appears. It is also SSR-safe — with no
 * `document` present the call is an inert no-op instead of a crash, matching how
 * the toast service behaves.
 *
 * @packageDocumentation
 */

/**
 * MIME types for the formats the core writes, so a browser and the OS both
 * recognise the download.
 */
export const EXPORT_MIME_TYPES = {
  csv: 'text/csv;charset=utf-8;',
  json: 'application/json;charset=utf-8;',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const;

/**
 * Triggers a browser download of in-memory content.
 *
 * The object URL is revoked on the next macrotask rather than synchronously:
 * Safari cancels a download whose URL is revoked in the same tick as the click.
 *
 * @param content  - The payload. A `Blob` is used as-is; a string or buffer is
 *                   wrapped in one using `mimeType`.
 * @param fileName - Download name, extension included.
 * @param mimeType - MIME type used when `content` is not already a `Blob`.
 * @returns `true` when the download was dispatched, `false` in a DOM-less
 *          environment.
 */
export function downloadExportFile(
  content: Blob | string | ArrayBuffer | Uint8Array,
  fileName: string,
  mimeType: string = 'application/octet-stream',
): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;

  const blob = content instanceof Blob ? content : new Blob([content as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Deferred: revoking in the same tick as the click aborts the download in
  // WebKit. `setTimeout(0)` is enough — the browser has already captured the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

/**
 * Ensures a file name carries the right extension, without ever doubling it.
 *
 * `'employees'`, `'employees.xlsx'` and `'employees.XLSX'` all resolve to
 * `'employees.xlsx'`, so a host can be as explicit (or not) as it likes.
 *
 * @param fileName  - The requested name, with or without an extension.
 * @param extension - The extension to guarantee, without the leading dot.
 */
export function withExtension(fileName: string, extension: string): string {
  const name = fileName.trim() || 'export';
  const suffix = `.${extension.replace(/^\./, '')}`;
  return name.toLowerCase().endsWith(suffix.toLowerCase()) ? name : `${name}${suffix}`;
}
