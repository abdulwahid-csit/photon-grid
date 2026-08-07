/**
 * Public type surface for the Photon Grid **Export System** — the pluggable
 * architecture behind `GridApi.export(format, options)`.
 *
 * The design has one hard constraint: **Photon Grid Core must stay
 * zero-dependency**. CSV and JSON are therefore implemented inside the core
 * (neither needs anything external), while Excel and PDF are supplied by the
 * host as *registered exporters* — small adapters that close over a library the
 * host installed (`xlsx`, `jspdf` + `jspdf-autotable`). The core never imports,
 * bundles or dynamically loads those packages; it only knows the
 * {@link GridExporter} shape.
 *
 * Every exporter — built-in or host-supplied — consumes the same
 * {@link PreparedExportData}, produced once by the
 * {@link import('./export-data-preparer').ExportDataPreparer}. That is what
 * keeps a CSV, a workbook and a PDF of the same grid agreeing on which rows and
 * columns were exported, in which order, and what each cell says.
 *
 * These types are free of any DOM or framework dependency so they can be shared
 * across every wrapper (Angular / React / Vue / Vanilla).
 *
 * @packageDocumentation
 */

import type { ColumnDataType, ColumnDef } from '../types/column.types';
import type { RowNode } from '../types/row.types';
import type { FormatOptions } from '../engines/editing/value-parser';

// ── Formats ──────────────────────────────────────────────────────────────────

/**
 * The formats Photon Grid knows about out of the box.
 *
 * `Csv` and `Json` are always available — they are implemented in the core.
 * `Excel` and `Pdf` are *capabilities*: they appear in the UI unconditionally
 * (so a user can discover them) but require the host to register an exporter
 * first. See {@link EXPORTER_REQUIREMENTS}.
 */
export enum BuiltInExportFormat {
  /** Comma-separated values (`.csv`) — built into the core. */
  Csv = 'csv',
  /** JSON document (`.json`) — built into the core. */
  Json = 'json',
  /** Excel workbook (`.xlsx`) — requires a registered exporter (`xlsx`). */
  Excel = 'excel',
  /** Portable Document Format (`.pdf`) — requires a registered exporter (`jspdf`). */
  Pdf = 'pdf',
}

/**
 * A format identifier accepted by {@link import('../core/grid-api').GridApi.export}
 * and {@link ExporterRegistry.register}.
 *
 * The four built-ins autocomplete, but any string is legal so a host can add
 * its own format without the core changing:
 *
 * ```ts
 * registerExporter('xml', xmlExporter);
 * await api.export('xml', { fileName: 'employees.xml' });
 * ```
 */
export type ExportFormat = `${BuiltInExportFormat}` | (string & {});

// ── Options ──────────────────────────────────────────────────────────────────

/**
 * Everything a cell-value hook is told about the cell it is transforming.
 *
 * @see {@link ExportOptions.processCellValue}
 */
export interface ExportCellParams {
  /** The logical value, after {@link ColumnDef.valueGetter}. */
  readonly value: unknown;
  /** The display string the grid would show, after {@link ColumnDef.valueFormatter}. */
  readonly formatted: string;
  /** The column this cell belongs to. */
  readonly colDef: ColumnDef;
  /** The row node the cell was read from. */
  readonly node: RowNode;
  /** Zero-based index of the row within the exported set. */
  readonly rowIndex: number;
}

/** Everything a header hook is told about the column it is naming. */
export interface ExportHeaderParams {
  /** The header text the grid would show. */
  readonly header: string;
  /** The column being named. */
  readonly colDef: ColumnDef;
  /** Zero-based index of the column within the exported set. */
  readonly colIndex: number;
}

/**
 * Options common to **every** export format.
 *
 * Format-specific options extend this ({@link PdfExportOptions},
 * {@link ExcelExportOptions}, {@link JsonExportOptions}) — deliberately without
 * ever naming a third-party type, so the generic surface stays free of `xlsx`
 * and `jspdf`.
 */
export interface ExportOptions {
  /**
   * File name for the download, with or without the format's extension — the
   * correct one is appended when missing.
   * @default `GridOptions.export.fileName` ?? `GridOptions.exportConfig.fileName` ?? `'export'`
   */
  readonly fileName?: string;
  /**
   * Restrict the export to these columns, **in this order**. Entries match a
   * `colId` first, then a `field`. Unknown entries are ignored.
   *
   * Omit to export the grid's current columns in their current order.
   */
  readonly columns?: readonly string[];
  /**
   * Include columns the user has hidden. Ignored when {@link columns} is given
   * (an explicit list is always honoured verbatim).
   * @default false
   */
  readonly includeHiddenColumns?: boolean;
  /**
   * Export only the currently selected rows. Takes precedence over
   * {@link onlyFilteredRows}.
   * @default false
   */
  readonly onlySelectedRows?: boolean;
  /**
   * Export every row that passes the active filters, rather than only the rows
   * currently on screen (the default, which respects pagination).
   * @default false
   */
  readonly onlyFilteredRows?: boolean;
  /**
   * Omit the header row/keys. Honoured by CSV, Excel and PDF; JSON always
   * emits objects, so it ignores this.
   * @default false
   */
  readonly skipHeader?: boolean;
  /**
   * Last word on a cell's exported text. Runs after the grid's own
   * getter/formatter chain, so the input is already what the user sees.
   */
  readonly processCellValue?: (params: ExportCellParams) => string;
  /** Last word on a column's exported header text. */
  readonly processHeader?: (params: ExportHeaderParams) => string;
}

/** Excel-specific options, layered on the shared {@link ExportOptions}. */
export interface ExcelExportOptions extends ExportOptions {
  /** Worksheet name. @default `'Sheet1'` */
  readonly sheetName?: string;
  /**
   * Write numbers, booleans and dates as native Excel types rather than text,
   * so a workbook can be summed and sorted without re-parsing.
   * @default true
   */
  readonly useNativeTypes?: boolean;
  /** Freeze the header row so it stays visible while scrolling. @default true */
  readonly freezeHeader?: boolean;
  /**
   * Size each column to its widest cell, capped so one long value cannot push
   * the rest off the page.
   * @default true
   */
  readonly autoSizeColumns?: boolean;
}

/** Page orientation for {@link PdfExportOptions}. */
export enum PdfOrientation {
  Portrait = 'portrait',
  Landscape = 'landscape',
}

/** PDF-specific options, layered on the shared {@link ExportOptions}. */
export interface PdfExportOptions extends ExportOptions {
  /** Page orientation. @default {@link PdfOrientation.Portrait} */
  readonly orientation?: `${PdfOrientation}`;
  /**
   * Page size, as the underlying PDF library names it (`'a4'`, `'letter'`,
   * `'legal'`, …). Typed as a string rather than a library enum so the core
   * never depends on one. @default `'a4'`
   */
  readonly pageSize?: string;
  /** Title drawn once above the table on the first page. */
  readonly title?: string;
  /** Page margin, in points. @default 24 */
  readonly margin?: number;
  /** Body font size, in points. @default 8 */
  readonly fontSize?: number;
  /**
   * Repeat the header row at the top of every page.
   * @default true
   */
  readonly repeatHeader?: boolean;
  /** Draw a `Page n / m` footer on every page. @default true */
  readonly pageNumbers?: boolean;
}

/** JSON-specific options, layered on the shared {@link ExportOptions}. */
export interface JsonExportOptions extends ExportOptions {
  /**
   * Pretty-print with a two-space indent instead of emitting one dense line.
   * @default true
   */
  readonly pretty?: boolean;
  /** Indent width used when {@link pretty} is on. @default 2 */
  readonly indent?: number;
  /**
   * Emit the display strings the grid shows (`"$1,200.00"`) instead of the
   * underlying values (`1200`).
   * @default false — JSON is a data format, so raw values are the useful default.
   */
  readonly useFormattedValues?: boolean;
  /**
   * Key each property by the column's **header** rather than its `field`.
   * @default false
   */
  readonly useHeadersAsKeys?: boolean;
}

/**
 * {@link ExportOptions} after the grid has merged per-call options over
 * `GridOptions.export` and resolved every default. This is what a
 * {@link GridExporter} receives, so an exporter never has to re-derive a
 * filename or guess at a default.
 */
export interface ResolvedExportOptions extends ExportOptions {
  /** Always present: the final download name, extension included. */
  readonly fileName: string;
  /** The format this export was requested as. */
  readonly format: ExportFormat;
}

// ── Prepared data ────────────────────────────────────────────────────────────

/** One column in an export, flattened to exactly what an exporter needs. */
export interface ExportColumn {
  /** Stable column identifier. */
  readonly colId: string;
  /** Field path the value came from — the natural key for JSON output. */
  readonly field: string;
  /** Display header, after {@link ExportOptions.processHeader}. */
  readonly header: string;
  /** The column's data type, which drives native typing in Excel. */
  readonly type: ColumnDataType;
  /** The originating definition, for exporters that need more than the above. */
  readonly colDef: ColumnDef;
}

/** One exported cell: both the value and the string the grid shows for it. */
export interface ExportCell {
  /**
   * The logical value, normalised to a primitive an exporter can write
   * natively: `string | number | boolean | Date | null`. Arrays and objects are
   * collapsed to their display string, and `undefined` becomes `null` so a
   * missing cell is explicit rather than absent.
   */
  readonly value: string | number | boolean | Date | null;
  /** The display string, after formatting and {@link ExportOptions.processCellValue}. */
  readonly formatted: string;
}

/** One exported row: its cells, aligned index-for-index with the columns. */
export interface ExportRow {
  /** The source node, for exporters that need row-level metadata. */
  readonly node: RowNode;
  /** Cells in column order. */
  readonly cells: readonly ExportCell[];
}

/**
 * The normalised payload every exporter consumes.
 *
 * Built **once** per export by the
 * {@link import('./export-data-preparer').ExportDataPreparer}, which is the
 * single place that knows how to resolve row scope (selected / filtered /
 * visible), column scope (explicit list / visible / all) and the value
 * pipeline. No exporter re-implements any of it, so CSV, JSON, Excel and PDF
 * cannot drift apart.
 */
export interface PreparedExportData {
  /** The columns being exported, in export order. */
  readonly columns: readonly ExportColumn[];
  /** Header strings, aligned index-for-index with {@link columns}. */
  readonly headers: readonly string[];
  /** The rows being exported, in display order. */
  readonly rows: readonly ExportRow[];
  /** The row nodes, in the same order as {@link rows} — a convenience view. */
  readonly nodes: readonly RowNode[];
}

// ── Exporter contract ────────────────────────────────────────────────────────

/**
 * A pluggable output format.
 *
 * The core ships CSV and JSON implementations; Excel and PDF are registered by
 * the host through {@link ExporterRegistry.register} (or the module-level
 * `registerExporter`). An exporter receives fully prepared, format-agnostic data
 * and is responsible only for serialising it and triggering the download.
 *
 * @typeParam TOptions - The format's option type, so `createPdfExporter`'s
 * implementation sees `PdfExportOptions` without casting.
 *
 * @example
 * ```ts
 * const xmlExporter: GridExporter = {
 *   format: 'xml',
 *   export(data, options) {
 *     const rows = data.rows.map((r) =>
 *       `<row>${r.cells.map((c, i) => `<${data.columns[i].field}>${c.formatted}</${data.columns[i].field}>`).join('')}</row>`,
 *     );
 *     downloadExportFile(`<rows>${rows.join('')}</rows>`, options.fileName, 'application/xml');
 *   },
 * };
 * registerExporter('xml', xmlExporter);
 * ```
 */
export interface GridExporter<TOptions extends ExportOptions = ExportOptions> {
  /** The format this exporter serves. Must match its registry key. */
  readonly format: ExportFormat;
  /**
   * Default file extension (without the dot) used when the caller's
   * {@link ExportOptions.fileName} carries none. @default the format id
   */
  readonly extension?: string;
  /**
   * Serialise and deliver the export.
   *
   * `data` already carries the columns, headers and rows — deliberately one
   * payload rather than the separate `(data, columns, …)` arguments an exporter
   * would otherwise have to keep in sync. Returning a promise is supported for
   * formats that do asynchronous work; the grid awaits it before emitting
   * `EXPORT_COMPLETE`.
   *
   * @param data    - The normalised export payload.
   * @param options - Per-call options merged over the grid defaults, fully resolved.
   */
  export(data: PreparedExportData, options: ResolvedExportOptions & TOptions): void | Promise<void>;
}

// ── Errors ───────────────────────────────────────────────────────────────────

/** Why an export failed. */
export enum ExportErrorCode {
  /** No exporter is registered for the requested format. */
  ExporterNotRegistered = 'exporter-not-registered',
  /** The exporter threw or rejected. */
  ExporterFailed = 'exporter-failed',
}

/**
 * The error every export failure rejects with — typed, so a host can branch on
 * {@link ExportError.code} instead of matching on message text.
 */
export class ExportError extends Error {
  /** Machine-readable cause. */
  readonly code: ExportErrorCode;
  /** The format that was requested. */
  readonly format: ExportFormat;
  /** npm packages the host must install, when the cause is a missing exporter. */
  readonly requiredPackages: readonly string[];

  constructor(
    code: ExportErrorCode,
    format: ExportFormat,
    message: string,
    requiredPackages: readonly string[] = [],
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'ExportError';
    this.code = code;
    this.format = format;
    this.requiredPackages = requiredPackages;
    if (options?.cause !== undefined) {
      // Assigned rather than passed to `super` so the class targets ES2020,
      // where `ErrorOptions` does not exist.
      (this as { cause?: unknown }).cause = options.cause;
    }
    // Restores the prototype chain under `target: ES5`-style downlevelling, so
    // `err instanceof ExportError` holds for hosts on older build targets.
    Object.setPrototypeOf(this, ExportError.prototype);
  }
}

/**
 * What an optional format needs before it can run — the source of both the
 * developer-facing error and the user-facing toast when it is missing.
 *
 * Kept as data rather than branches so adding a format (say `docx`) is one
 * entry here, not a new `if` in three files.
 */
export interface ExporterRequirement {
  /** Human label used in messages (`'Excel'`, `'PDF'`). */
  readonly label: string;
  /** npm packages the host must install. */
  readonly packages: readonly string[];
}

/** Requirement metadata for the formats the core does not implement itself. */
export const EXPORTER_REQUIREMENTS: Readonly<Record<string, ExporterRequirement>> = {
  [BuiltInExportFormat.Excel]: { label: 'Excel', packages: ['xlsx'] },
  [BuiltInExportFormat.Pdf]: { label: 'PDF', packages: ['jspdf', 'jspdf-autotable'] },
};

// ── Data source port ─────────────────────────────────────────────────────────

/**
 * The read-only surface the export system needs from the grid.
 *
 * A port rather than a `GridApi` import: it keeps the export module free of any
 * dependency on `GridCore`'s composition root (the same rule the Import Engine
 * and Summary Service follow), and it makes the preparer trivially testable
 * with a literal object.
 */
export interface ExportDataSource {
  /** Every leaf column, in current display order — hidden ones included. */
  getAllColumns(): readonly ColumnDef[];
  /** The currently visible leaf columns, in display order. */
  getVisibleColumns(): readonly ColumnDef[];
  /** The rows currently rendered — post filter, sort, grouping and pagination. */
  getVisibleRows(): readonly RowNode[];
  /** Every row that passes the active filters, across all pages. */
  getFilteredRows(): readonly RowNode[];
  /** The currently selected rows, in display order. */
  getSelectedRows(): readonly RowNode[];
  /** Locale / date / currency settings, so exports format exactly like the grid. */
  getFormatOptions(): FormatOptions;
  /** The public API, passed through to `valueGetter`/`valueFormatter` hooks. */
  getApi(): unknown;
}

// ── Feature configuration ────────────────────────────────────────────────────

/**
 * Stable identifiers for the entries of the toolbar's **Export ▾** dropdown and
 * the cell context menu's **Export** fly-out.
 *
 * The values are {@link ExportFormat}s, so a menu entry and the
 * `api.export(format)` call behind it can never disagree.
 */
export type ExportMenuItemId = ExportFormat;

/**
 * Configuration for the Photon Grid **Export** feature (`GridOptions.export`) —
 * the toolbar's *Export ▾* dropdown and the defaults every
 * `GridApi.export()` call inherits.
 *
 * The feature is **opt-in**: without `enabled: true` no dropdown is mounted and
 * the programmatic API still works exactly as before.
 *
 * @example
 * ```ts
 * export: {
 *   enabled: true,
 *   fileName: 'employees',
 *   formats: ['csv', 'json', 'excel', 'pdf'],
 *   pdf: { orientation: 'landscape', title: 'Employee Register' },
 * }
 * ```
 */
export interface ExportFeatureConfig {
  /** Master switch — when `true`, the **Export ▾** launcher is mounted. */
  readonly enabled: boolean;
  /**
   * Which formats appear in the dropdown, in order.
   * @default `['csv', 'json', 'excel', 'pdf']`
   */
  readonly formats?: readonly ExportFormat[];
  /** Base file name (extension optional) for every export. @default `'export'` */
  readonly fileName?: string;
  /** Button label. @default `'Export'` */
  readonly buttonLabel?: string;
  /** Tooltip and accessible name for the launcher. @default `'Export'` */
  readonly tooltip?: string;
  /** Icon-registry name for the launcher glyph. @default `'download'` */
  readonly icon?: string;
  /** Default {@link ExportOptions.includeHiddenColumns} for every export. */
  readonly includeHiddenColumns?: boolean;
  /** Default {@link ExportOptions.onlySelectedRows} for every export. */
  readonly onlySelectedRows?: boolean;
  /** Default {@link ExportOptions.onlyFilteredRows} for every export. */
  readonly onlyFilteredRows?: boolean;
  /** Default cell-value hook for every export. */
  readonly processCellValue?: (params: ExportCellParams) => string;
  /** Default header hook for every export. */
  readonly processHeader?: (params: ExportHeaderParams) => string;
  /** Per-format defaults merged under the caller's own options. */
  readonly csv?: Partial<ExportOptions>;
  /** Per-format defaults merged under the caller's own options. */
  readonly json?: Partial<JsonExportOptions>;
  /** Per-format defaults merged under the caller's own options. */
  readonly excel?: Partial<ExcelExportOptions>;
  /** Per-format defaults merged under the caller's own options. */
  readonly pdf?: Partial<PdfExportOptions>;
  /**
   * Suppress toasts for missing Excel/PDF exporters. The rejected
   * {@link ExportError} is still raised — use this only when the host reports
   * the failure itself.
   * @default false
   */
  readonly suppressToasts?: boolean;
  /** Called after a successful export. */
  readonly onComplete?: (event: ExportSuccessInfo) => void;
  /** Called when an export fails, including a missing exporter. */
  readonly onError?: (error: ExportError) => void;
}

/** What {@link ExportFeatureConfig.onComplete} is told about a finished export. */
export interface ExportSuccessInfo {
  /** The format that was written. */
  readonly format: ExportFormat;
  /** The download's file name. */
  readonly fileName: string;
  /** How many data rows were written. */
  readonly rowCount: number;
  /** How many columns were written. */
  readonly columnCount: number;
}
