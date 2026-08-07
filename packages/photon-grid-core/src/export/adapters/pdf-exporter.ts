/**
 * **Optional jsPDF-backed PDF exporter.**
 *
 * The officially-supported way to produce `.pdf` output. Like the Excel
 * adapter it lives on its own entry point, is absent from the core barrel, and
 * never names `jspdf` or `jspdf-autotable` in an import — the host passes both
 * in, so Photon Grid Core stays at zero runtime dependencies:
 *
 * ```ts
 * import jsPDF from 'jspdf';
 * import autoTable from 'jspdf-autotable';
 * import { registerExporter } from 'photon-grid-core';
 * import { createPdfExporter } from 'photon-grid-core/export/pdf';
 *
 * registerExporter('pdf', createPdfExporter({ jsPDF, autoTable }));
 * await grid.api.export('pdf', { fileName: 'employees.pdf', orientation: 'landscape' });
 * ```
 *
 * Pagination, header repetition on every page and text wrapping are all
 * delegated to `jspdf-autotable`, which already solves them properly; this
 * adapter's job is to map Photon Grid's {@link PreparedExportData} and
 * {@link PdfExportOptions} onto it, and to keep large exports from being
 * pathological (see {@link PDF_ROW_WARNING_THRESHOLD}).
 *
 * @packageDocumentation
 */

import type {
  GridExporter,
  PdfExportOptions,
  PreparedExportData,
  ResolvedExportOptions,
} from '../export.types';
import { BuiltInExportFormat, PdfOrientation } from '../export.types';

// ── Minimal structural view of the jsPDF surface this adapter uses ───────────
// Typed here rather than imported, so the core compiles and ships without
// `jspdf` present.

/** Text-drawing and page bookkeeping used for the title and page numbers. */
export interface JsPdfDocument {
  internal: {
    pageSize: { getWidth(): number; getHeight(): number };
    pages?: unknown[];
  };
  setFontSize(size: number): unknown;
  text(text: string, x: number, y: number, options?: { align?: string }): unknown;
  getNumberOfPages(): number;
  setPage(page: number): unknown;
  save(fileName: string): unknown;
}

/** Construction options this adapter passes to `new jsPDF(...)`. */
export interface JsPdfConstructorOptions {
  orientation?: string;
  unit?: string;
  format?: string;
}

/** The `jspdf` default export — a constructor. */
export type JsPdfConstructor = new (options?: JsPdfConstructorOptions) => JsPdfDocument;

/** The subset of `jspdf-autotable`'s options this adapter sets. */
export interface AutoTableOptions {
  head?: string[][];
  body?: string[][];
  startY?: number;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  theme?: string;
  styles?: Record<string, unknown>;
  headStyles?: Record<string, unknown>;
  bodyStyles?: Record<string, unknown>;
  alternateRowStyles?: Record<string, unknown>;
  columnStyles?: Record<number, Record<string, unknown>>;
  showHead?: string | boolean;
  didDrawPage?: (data: unknown) => void;
}

/** The `jspdf-autotable` default export. */
export type AutoTableFn = (doc: JsPdfDocument, options: AutoTableOptions) => void;

/** The libraries a host hands to {@link createPdfExporter}. */
export interface PdfExporterDeps {
  /** The `jspdf` default export (the `jsPDF` constructor). */
  readonly jsPDF: JsPdfConstructor;
  /** The `jspdf-autotable` default export. */
  readonly autoTable: AutoTableFn;
  /**
   * Extra `jspdf-autotable` options merged **under** the ones this adapter
   * derives — the seam for host branding (fonts, colours, cell hooks) without
   * the core's option types ever naming a jsPDF type.
   */
  readonly autoTableDefaults?: AutoTableOptions;
}

/** Default page margin, in points. */
const DEFAULT_MARGIN = 24;
/** Default body font size, in points. */
const DEFAULT_FONT_SIZE = 8;
/** Default page format. */
const DEFAULT_PAGE_SIZE = 'a4';
/** Vertical space reserved for the title block, in points. */
const TITLE_BLOCK_HEIGHT = 22;
/** Title font size, in points. */
const TITLE_FONT_SIZE = 14;
/** Page-number font size, in points. */
const FOOTER_FONT_SIZE = 8;

/**
 * Row count beyond which the adapter warns once.
 *
 * jsPDF renders the whole document in memory; tens of thousands of rows will
 * produce a very large file and can stall the tab. The export is **not**
 * truncated — silently dropping rows would be worse than a slow file — but the
 * host is told, so it can scope the export or offer Excel instead.
 */
export const PDF_ROW_WARNING_THRESHOLD = 20_000;

/**
 * Builds a PDF {@link GridExporter} bound to host-supplied jsPDF libraries.
 *
 * @param deps - `jsPDF` and `autoTable`, plus optional `jspdf-autotable` defaults.
 * @returns An exporter ready for `registerExporter('pdf', …)`.
 * @throws {TypeError} When either library is missing — a clear failure at
 *   registration beats an opaque one at export time.
 */
export function createPdfExporter(deps: PdfExporterDeps): GridExporter<PdfExportOptions> {
  if (typeof deps?.jsPDF !== 'function' || typeof deps?.autoTable !== 'function') {
    throw new TypeError(
      "[PhotonGrid] createPdfExporter({ jsPDF, autoTable }) needs both libraries — " +
        "`import jsPDF from 'jspdf'` and `import autoTable from 'jspdf-autotable'`.",
    );
  }

  return {
    format: BuiltInExportFormat.Pdf,
    extension: 'pdf',
    export(data: PreparedExportData, options: ResolvedExportOptions & PdfExportOptions): void {
      if (data.rows.length > PDF_ROW_WARNING_THRESHOLD) {
        console.warn(
          `[PhotonGrid] Exporting ${data.rows.length} rows to PDF. jsPDF builds the whole ` +
            `document in memory, so this will be slow and produce a large file — consider ` +
            `an Excel export, or scoping with { onlySelectedRows: true }.`,
        );
      }

      const margin = options.margin ?? DEFAULT_MARGIN;
      const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
      const showHead = options.skipHeader === true ? false : options.repeatHeader === false ? 'firstPage' : 'everyPage';

      const doc = new deps.jsPDF({
        orientation: options.orientation ?? PdfOrientation.Portrait,
        unit: 'pt',
        format: options.pageSize ?? DEFAULT_PAGE_SIZE,
      });

      if (options.title) drawTitle(doc, options.title, margin);

      deps.autoTable(doc, {
        theme: 'grid',
        ...deps.autoTableDefaults,
        head: options.skipHeader === true ? [] : [[...data.headers]],
        body: toBodyMatrix(data),
        startY: options.title ? margin + TITLE_BLOCK_HEIGHT : margin,
        margin: { top: margin, right: margin, bottom: margin, left: margin },
        showHead,
        styles: {
          fontSize,
          // Wrapping rather than truncating: a clipped cell in a printed report
          // is indistinguishable from missing data.
          cellPadding: 4,
          overflow: 'linebreak',
          ...deps.autoTableDefaults?.styles,
        },
        headStyles: { fontStyle: 'bold', ...deps.autoTableDefaults?.headStyles },
        columnStyles: buildColumnStyles(data, deps.autoTableDefaults?.columnStyles),
      });

      if (options.pageNumbers !== false) drawPageNumbers(doc, margin);

      doc.save(options.fileName);
    },
  };
}

/**
 * Projects prepared data into the string matrix autoTable renders.
 *
 * Display strings, not raw values: a PDF is a printed artefact, so a currency
 * cell should read `$1,200.00` exactly as it does on screen.
 */
function toBodyMatrix(data: PreparedExportData): string[][] {
  const body: string[][] = new Array<string[]>(data.rows.length);
  for (let r = 0; r < data.rows.length; r++) {
    const cells = data.rows[r].cells;
    const line: string[] = new Array<string>(cells.length);
    for (let c = 0; c < cells.length; c++) line[c] = cells[c].formatted;
    body[r] = line;
  }
  return body;
}

/**
 * Right-aligns numeric columns, as a report reader expects, and lets host
 * defaults override per column.
 */
function buildColumnStyles(
  data: PreparedExportData,
  overrides: Record<number, Record<string, unknown>> | undefined,
): Record<number, Record<string, unknown>> {
  const styles: Record<number, Record<string, unknown>> = {};
  for (let c = 0; c < data.columns.length; c++) {
    const type = data.columns[c].type;
    if (type === 'number' || type === 'currency' || type === 'percentage') {
      styles[c] = { halign: 'right' };
    }
  }
  if (overrides) {
    for (const [index, style] of Object.entries(overrides)) {
      styles[Number(index)] = { ...styles[Number(index)], ...style };
    }
  }
  return styles;
}

/** Draws the report title once, above the table on the first page. */
function drawTitle(doc: JsPdfDocument, title: string, margin: number): void {
  doc.setFontSize(TITLE_FONT_SIZE);
  doc.text(title, margin, margin + TITLE_FONT_SIZE);
}

/** Stamps `Page n / m` in the bottom-right corner of every page. */
function drawPageNumbers(doc: JsPdfDocument, margin: number): void {
  const total = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setFontSize(FOOTER_FONT_SIZE);
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.text(`Page ${page} / ${total}`, width - margin, height - margin / 2, { align: 'right' });
  }
}
