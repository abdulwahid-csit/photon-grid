/**
 * Public type surface for the Photon Grid **Import Engine** — the framework-
 * agnostic subsystem that ingests Excel / CSV / TSV / Clipboard data through a
 * single unified pipeline and feeds it into the grid via the existing public
 * seams (`setColumns` / `setData` / `appendData`).
 *
 * These types are intentionally free of any DOM, framework or parser
 * dependency so the engine stays unit-testable in isolation and reusable across
 * every wrapper (Angular / React / Vue / Vanilla).
 *
 * @packageDocumentation
 */

import type { ColumnDataType, ColumnDef, ColumnDefInput } from './column.types';

/**
 * Where a batch of imported data originated. Every source is normalized into
 * the same {@link import('../engines/import/model/workbook').Workbook} model
 * before it reaches the pipeline, so downstream stages are source-agnostic.
 */
export enum ImportSourceType {
  /** A binary spreadsheet (`.xlsx` / `.xls`) parsed by an injected {@link import('../engines/import/parser/workbook-parser').WorkbookParser}. */
  Excel = 'excel',
  /** Comma-separated values (RFC 4180). */
  Csv = 'csv',
  /** Tab-separated values. */
  Tsv = 'tsv',
  /** The system clipboard (Excel / Google Sheets / Numbers emit TSV). */
  Clipboard = 'clipboard',
  /** Structured JSON — reserved for a future importer (architecture is ready). */
  Json = 'json',
}

/**
 * How an import mutates the grid's current data and columns.
 *
 * The default is {@link ImportMode.Replace}: a fresh import replaces all data
 * and — when {@link ImportOptions.defineColumns} is `true` — the column schema
 * as well (spreadsheet-first behaviour).
 */
export enum ImportMode {
  /** Replace the current data set entirely. Optionally redefines columns. */
  Replace = 'replace',
  /** Append the imported rows after the existing data. */
  Append = 'append',
  /** Insert the imported rows at the current selection anchor (or {@link ImportOptions.insertIndex}). */
  InsertAtSelection = 'insertAtSelection',
  /** Insert the imported rows immediately below the selected row. */
  InsertBelowSelected = 'insertBelowSelected',
}

/**
 * The inferred logical classification of a single imported cell, produced by
 * the {@link import('../engines/import/services/type-detector').TypeDetector}
 * while sniffing a column. A column's final {@link ColumnDataType} is derived
 * from the dominant classification across its sampled cells.
 */
export enum ImportCellType {
  String = 'string',
  Number = 'number',
  Currency = 'currency',
  Percentage = 'percentage',
  Date = 'date',
  Boolean = 'boolean',
  Email = 'email',
  /** A `=`-prefixed spreadsheet formula (registered with the Formula Engine, never evaluated by the importer). */
  Formula = 'formula',
  /** An empty / blank cell — ignored when inferring a column's type. */
  Empty = 'empty',
}

/**
 * Ordered stages of the unified import pipeline. Each stage emits a
 * {@link ImportProgressEvent} so hosts can render a progress indicator.
 */
export enum ImportStage {
  Reading = 'reading',
  Parsing = 'parsing',
  Validating = 'validating',
  Mapping = 'mapping',
  DetectingTypes = 'detectingTypes',
  BuildingFormulas = 'buildingFormulas',
  Applying = 'applying',
  Rendering = 'rendering',
  Complete = 'complete',
}

/** Severity of a single {@link ImportValidationIssue}. */
export enum ImportValidationSeverity {
  /** Blocks the import — surfaced to the user, the import is aborted. */
  Error = 'error',
  /** Non-blocking — surfaced but the import still proceeds. */
  Warning = 'warning',
}

/** Machine-readable code identifying a class of validation problem. */
export enum ImportValidationCode {
  EmptyWorkbook = 'emptyWorkbook',
  NoDataRows = 'noDataRows',
  DuplicateHeader = 'duplicateHeader',
  MissingHeader = 'missingHeader',
  RaggedRows = 'raggedRows',
  UnknownColumnMapping = 'unknownColumnMapping',
  InvalidFormula = 'invalidFormula',
  CircularReference = 'circularReference',
  CorruptedWorkbook = 'corruptedWorkbook',
  NoParserRegistered = 'noParserRegistered',
}

/** A single problem discovered during validation. */
export interface ImportValidationIssue {
  /** Whether this blocks the import ({@link ImportValidationSeverity.Error}) or is advisory. */
  readonly severity: ImportValidationSeverity;
  /** Machine-readable classification. */
  readonly code: ImportValidationCode;
  /** Human-friendly, user-facing description. */
  readonly message: string;
  /** Optional 0-based sheet / row / column the issue points at. */
  readonly location?: { readonly sheet?: number; readonly row?: number; readonly column?: number };
}

/** The outcome of validating a workbook prior to import. */
export interface ImportValidationResult {
  /** `true` when there are zero {@link ImportValidationSeverity.Error} issues. */
  readonly valid: boolean;
  /** Blocking issues. */
  readonly errors: readonly ImportValidationIssue[];
  /** Non-blocking issues. */
  readonly warnings: readonly ImportValidationIssue[];
}

/**
 * Resolved mapping from imported headers to grid column fields, produced by the
 * {@link import('../engines/import/services/column-mapper').ColumnMapper}.
 * Shaped so a future interactive mapping dialog can supply a manual override.
 */
export interface ImportMapping {
  /** Imported header (verbatim) → target grid `field`. */
  readonly headerToField: Readonly<Record<string, string>>;
  /** Imported headers that could not be matched to any existing column. */
  readonly unmapped: readonly string[];
}

/**
 * Per-call options controlling a single import operation. All properties are
 * optional; sensible defaults are applied by the engine.
 */
export interface ImportOptions {
  /** How to combine with existing data. @default {@link ImportMode.Replace} */
  mode?: ImportMode;
  /**
   * When `true` (and mode is {@link ImportMode.Replace}), the imported header
   * row defines the grid's columns (type-sniffed). When `false`, imported data
   * is mapped onto the grid's existing columns. @default `true`
   */
  defineColumns?: boolean;
  /**
   * Whether the first parsed row is a header row. When `false`, columns are
   * auto-named (`Column 1`, `Column 2`, …). @default `true`
   */
  hasHeaderRow?: boolean;
  /** Delimiter for CSV/TSV text. Ignored for Excel/Clipboard. @default `','` (CSV) / `'\t'` (TSV) */
  delimiter?: string;
  /** For multi-sheet Excel workbooks, the sheet to import. @default the first sheet */
  sheetName?: string;
  /** Explicit header → field mapping (e.g. from a mapping dialog). Overrides auto-mapping. */
  mapping?: ImportMapping;
  /** For {@link ImportMode.InsertAtSelection}/{@link ImportMode.InsertBelowSelected}, the 0-based row index to insert at. */
  insertIndex?: number;
  /** A friendly file name used in progress/telemetry. */
  fileName?: string;
}

/**
 * The normalized, grid-ready product of the pipeline — everything needed to
 * feed the grid, plus metadata for the caller. Emitted from every
 * `ImportEngine.import*` method.
 */
export interface ImportResult {
  /** Which source produced this result. */
  readonly source: ImportSourceType;
  /** The sheet that was imported (Excel), or a synthesized name for text sources. */
  readonly sheetName: string;
  /** Column definitions inferred from the header row (type-sniffed, `allowFormula` set where formulas were found). */
  readonly columns: readonly ColumnDefInput[];
  /** Row data objects, keyed by each column's inferred `field`. Formula cells retain their raw `=…` source string. */
  readonly rows: ReadonlyArray<Record<string, unknown>>;
  /** Imported headers, verbatim, in column order. */
  readonly headers: readonly string[];
  /** Inferred `field` for each header, parallel to {@link headers}. */
  readonly fields: readonly string[];
  /** Number of imported rows. */
  readonly rowCount: number;
  /** Number of imported columns. */
  readonly columnCount: number;
  /** Number of cells that carried a `=`-prefixed formula. */
  readonly formulaCount: number;
  /** The mode this result will be / was applied with. */
  readonly mode: ImportMode;
  /** Validation outcome for the source workbook. */
  readonly validation: ImportValidationResult;
  /** Wall-clock duration of the parse+build pipeline, in milliseconds (set by the engine). */
  readonly durationMs?: number;
}

/** Payload of {@link import('./event.types').GridEventType}`.IMPORT_START`. */
export interface ImportStartEvent {
  readonly source: ImportSourceType;
  readonly fileName?: string;
  readonly mode: ImportMode;
}

/** Payload of `IMPORT_PROGRESS` — one per pipeline {@link ImportStage}. */
export interface ImportProgressEvent {
  readonly source: ImportSourceType;
  readonly stage: ImportStage;
  /** A short, user-facing status message (e.g. "Parsing…"). */
  readonly message: string;
  /** Items processed so far, when the stage is quantifiable. */
  readonly processed?: number;
  /** Total items for this stage, when known. */
  readonly total?: number;
}

/** Payload of `IMPORT_COMPLETE`. */
export interface ImportCompleteEvent {
  readonly source: ImportSourceType;
  readonly result: ImportResult;
}

/** Payload of `IMPORT_ERROR`. */
export interface ImportErrorEvent {
  readonly source: ImportSourceType;
  readonly fileName?: string;
  readonly message: string;
  /** Validation result when the failure was a validation error, else `undefined`. */
  readonly validation?: ImportValidationResult;
  /** The underlying error, when one was thrown. */
  readonly error?: unknown;
}

/**
 * Configuration for the Import feature (`GridOptions.import`). The feature is
 * disabled unless {@link enabled} is `true`.
 */
export interface ImportConfig {
  /** Master switch — when `true`, the top-right **Import ▾** button is mounted. */
  enabled: boolean;
  /**
   * Which sources appear in the Import dropdown, in order.
   * @default all of `[Excel, Csv, Tsv, Clipboard]`
   */
  formats?: ImportSourceType[];
  /** Default {@link ImportMode} for menu-triggered imports. @default {@link ImportMode.Replace} */
  mode?: ImportMode;
  /** Whether menu-triggered imports define columns from the file. @default `true` */
  defineColumns?: boolean;
  /**
   * Column-mapping strategy. `'auto'` maps headers to existing fields
   * automatically; `'dialog'` is reserved for the interactive mapping dialog.
   * @default `'auto'`
   */
  mapping?: 'auto' | 'dialog';
  /** Called after a successful import with the result. */
  onComplete?: (result: ImportResult) => void;
  /** Called when an import fails validation or throws. */
  onError?: (event: ImportErrorEvent) => void;
}

/**
 * The minimal write/read surface the Import Engine uses to feed the grid — a
 * thin port over the public {@link import('../core/grid-api').GridApi}. Keeping
 * this an interface (rather than depending on `GridApi` directly) means the
 * engine never imports `GridCore`, preserving the architecture rule that
 * business logic must not know framework or composition-root details.
 */
export interface GridImportSink {
  /** Current, fully-normalized leaf columns (used for mapping onto an existing schema). */
  getColumns(): ColumnDef[];
  /** Current raw row-data objects, in model order (used for insert modes). */
  getRowData(): Record<string, unknown>[];
  /** Replace the column schema. */
  setColumns(defs: ColumnDefInput[]): void;
  /** Replace all data. */
  setData(rows: Record<string, unknown>[]): void;
  /** Append rows to the existing data. */
  appendData(rows: Record<string, unknown>[]): void;
}

/**
 * Re-export of {@link ColumnDataType} for consumers building custom importers,
 * so they need only import from this module.
 */
export type { ColumnDataType };
