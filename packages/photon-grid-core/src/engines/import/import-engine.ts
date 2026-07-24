/**
 * The **Import Engine** — Photon Grid's public, framework-agnostic entry point
 * for ingesting Excel / CSV / TSV / Clipboard data. It mirrors the
 * {@link import('../export/export-engine').ExportEngine} (its inverse): one
 * engine per grid, constructed with the {@link EventBus}, exposed through thin
 * {@link import('../../core/grid-api').GridApi} methods.
 *
 * Flow for every source:
 * 1. obtain raw bytes/text and normalize into a {@link Workbook} (the only
 *    source-specific step);
 * 2. run the shared {@link ImportPipeline} (validate → map → detect → discover);
 * 3. apply the {@link ImportResult} to the grid through the injected
 *    {@link GridImportSink} (the public `setColumns`/`setData`/`appendData`
 *    seams) according to the {@link ImportMode};
 * 4. emit `IMPORT_START` / `IMPORT_PROGRESS` / `IMPORT_COMPLETE` / `IMPORT_ERROR`.
 *
 * The engine never evaluates formulas: `=`-prefixed cells are carried into row
 * data verbatim, and the grid's existing `setData → FormulaInitializer` path
 * registers them with the one Formula Engine. It also never imports
 * `GridCore` — it writes only through the {@link GridImportSink} port — so the
 * architecture rule that business logic stays free of composition-root details
 * is preserved.
 *
 * @packageDocumentation
 */

import type { EventBus } from '../../event-bus/event-bus';
import { GridEventType } from '../../types/event.types';
import type { ColumnDef, ColumnDefInput } from '../../types/column.types';
import {
  ImportMode,
  ImportSourceType,
  ImportStage,
  type GridImportSink,
  type ImportMapping,
  type ImportOptions,
  type ImportResult,
} from '../../types/import.types';
import type { Workbook } from './model/workbook';
import { DelimitedImporter } from './importers/delimited-importer';
import { ClipboardImporter, type ClipboardTextReader } from './importers/clipboard-importer';
import { ExcelImporter } from './importers/excel-importer';
import type { WorkbookParser } from './parser/workbook-parser';
import { ImportPipeline } from './pipeline/import-pipeline';
import { ColumnMapper } from './services/column-mapper';

/** Extensions recognized as Excel workbooks. */
const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.xlsb'];

/** Orchestrates the unified import pipeline and feeds the grid. */
export class ImportEngine {
  /** Registered Excel parser (SheetJS adapter or custom); `null` until set. */
  private parser: WorkbookParser | null = null;

  /**
   * Per-session mapping memory: imported header → target grid `field`. Lets a
   * mapping resolved (or confirmed) once be reused for later imports in the
   * same session. This is also where a future mapping dialog would persist.
   */
  private readonly rememberedMapping: Record<string, string> = {};

  /**
   * @param eventBus       - Grid event bus for lifecycle/progress events.
   * @param clipboardReader - Optional clipboard engine used to read pasted text.
   */
  constructor(
    private readonly eventBus: EventBus,
    private readonly clipboardReader?: ClipboardTextReader,
  ) {}

  /**
   * Registers the parser used for binary Excel files (e.g. the optional SheetJS
   * adapter). Until one is registered, `.xlsx`/`.xls` imports fail with a
   * friendly validation error rather than throwing an opaque parser exception.
   *
   * @param parser - The workbook parser to use for Excel input.
   */
  registerWorkbookParser(parser: WorkbookParser): void {
    this.parser = parser;
  }

  /** Whether Excel import is currently available (a parser is registered). */
  get isExcelAvailable(): boolean {
    return this.parser !== null;
  }

  // ── Public import entry points ─────────────────────────────────────────────

  /**
   * Imports a {@link File} (from an `<input type=file>` or drop). The source is
   * inferred from the extension: `.xlsx`/`.xls` → Excel, `.tsv` → TSV, anything
   * else → CSV.
   *
   * @param file - The file to import.
   * @param sink - The grid write port.
   * @param options - Import options.
   * @returns The import result (also emitted via `IMPORT_COMPLETE`).
   */
  async importFile(file: File, sink: GridImportSink, options: ImportOptions = {}): Promise<ImportResult> {
    return this.importFileAs(file, ImportEngine.sourceFromFileName(file.name), sink, options);
  }

  /**
   * Imports a {@link File} as an explicit source, bypassing extension
   * inference. Used by the `importExcel`/`importCsv`/`importTsv` API wrappers.
   *
   * @param file   - The file to import.
   * @param source - The source type to treat the file as.
   * @param sink   - The grid write port.
   * @param options - Import options.
   * @returns The import result.
   */
  async importFileAs(
    file: File,
    source: ImportSourceType,
    sink: GridImportSink,
    options: ImportOptions = {},
  ): Promise<ImportResult> {
    const opts: ImportOptions = { fileName: file.name, ...options };
    return this.execute(source, opts, sink, async () => {
      this.emitProgress(source, ImportStage.Reading, 'Reading…');
      if (source === ImportSourceType.Excel) {
        const buffer = await file.arrayBuffer();
        this.emitProgress(source, ImportStage.Parsing, 'Parsing…');
        return new ExcelImporter(this.parser).parse(buffer, { sheetName: opts.sheetName, fileName: file.name });
      }
      const text = await file.text();
      this.emitProgress(source, ImportStage.Parsing, 'Parsing…');
      return this.textToWorkbook(text, source, opts);
    });
  }

  /**
   * Imports a raw text payload as a given delimited/clipboard source.
   *
   * @param text   - The CSV/TSV/clipboard text.
   * @param source - Which text source this is.
   * @param sink   - The grid write port.
   * @param options - Import options.
   * @returns The import result.
   */
  async importText(
    text: string,
    source: ImportSourceType,
    sink: GridImportSink,
    options: ImportOptions = {},
  ): Promise<ImportResult> {
    return this.execute(source, options, sink, () => {
      this.emitProgress(source, ImportStage.Parsing, 'Parsing…');
      return this.textToWorkbook(text, source, options);
    });
  }

  /**
   * Imports the current clipboard contents (TSV, as emitted by Excel / Sheets).
   *
   * @param sink - The grid write port.
   * @param options - Import options.
   * @returns The import result.
   */
  async importFromClipboard(sink: GridImportSink, options: ImportOptions = {}): Promise<ImportResult> {
    const source = ImportSourceType.Clipboard;
    return this.execute(source, options, sink, async () => {
      this.emitProgress(source, ImportStage.Reading, 'Reading…');
      const text = await ClipboardImporter.readText(this.clipboardReader);
      this.emitProgress(source, ImportStage.Parsing, 'Parsing…');
      return ClipboardImporter.parse(text);
    });
  }

  /**
   * Imports an already-parsed {@link Workbook} (e.g. produced by a custom
   * importer). Routes through the same pipeline as every other source.
   *
   * @param workbook - The workbook to import.
   * @param sink     - The grid write port.
   * @param options  - Import options.
   * @returns The import result.
   */
  async importWorkbook(workbook: Workbook, sink: GridImportSink, options: ImportOptions = {}): Promise<ImportResult> {
    return this.execute(ImportSourceType.Excel, options, sink, () => workbook);
  }

  // ── Orchestration ──────────────────────────────────────────────────────────

  /**
   * Shared execution wrapper: emits START, obtains the workbook via
   * `produce`, runs the pipeline, applies the result (or reports validation
   * failure), and emits COMPLETE/ERROR.
   */
  private async execute(
    source: ImportSourceType,
    options: ImportOptions,
    sink: GridImportSink,
    produce: () => Workbook | Promise<Workbook>,
  ): Promise<ImportResult> {
    const mode = options.mode ?? ImportMode.Replace;
    const started = ImportEngine.now();
    this.eventBus.emit(GridEventType.IMPORT_START, { source, fileName: options.fileName, mode });

    try {
      const workbook = await produce();

      const pipeline = new ImportPipeline((stage, message, processed, total) =>
        this.emitProgress(source, stage, message, processed, total),
      );
      const base = pipeline.run({
        workbook,
        source,
        mode,
        hasHeaderRow: options.hasHeaderRow ?? true,
        sheetName: options.sheetName,
      });

      const result: ImportResult = { ...base, durationMs: ImportEngine.now() - started };

      if (!result.validation.valid) {
        const message = result.validation.errors[0]?.message ?? 'Import failed validation.';
        this.eventBus.emit(GridEventType.IMPORT_ERROR, {
          source,
          fileName: options.fileName,
          message,
          validation: result.validation,
        });
        return result;
      }

      this.emitProgress(source, ImportStage.Applying, 'Applying…');
      this.applyToGrid(result, sink, options);
      this.emitProgress(source, ImportStage.Rendering, 'Rendering…');

      this.eventBus.emit(GridEventType.IMPORT_COMPLETE, { source, result });
      return result;
    } catch (error) {
      this.eventBus.emit(GridEventType.IMPORT_ERROR, {
        source,
        fileName: options.fileName,
        message: error instanceof Error ? error.message : 'Import failed.',
        error,
      });
      throw error;
    }
  }

  /** Normalizes CSV/TSV/clipboard text into a workbook. */
  private textToWorkbook(text: string, source: ImportSourceType, options: ImportOptions): Workbook {
    if (source === ImportSourceType.Clipboard) return ClipboardImporter.parse(text);
    const delimiter = options.delimiter ?? (source === ImportSourceType.Tsv ? '\t' : ',');
    return DelimitedImporter.parse(text, { delimiter, sheetName: 'Sheet1' });
  }

  /**
   * Applies a validated result to the grid via the sink, honoring the import
   * mode. Replace-with-defineColumns redefines the schema; every other mode maps
   * the imported rows onto the existing columns first.
   */
  private applyToGrid(result: ImportResult, sink: GridImportSink, options: ImportOptions): void {
    const mode = result.mode;
    const defineColumns = options.defineColumns ?? true;

    if (mode === ImportMode.Replace && defineColumns) {
      sink.setColumns(result.columns as ColumnDefInput[]);
      sink.setData(result.rows.map((r) => ({ ...r })));
      return;
    }

    const remapped = this.remapOntoExisting(result, sink.getColumns(), options.mapping);

    switch (mode) {
      case ImportMode.Append:
        sink.appendData(remapped);
        break;
      case ImportMode.InsertAtSelection:
      case ImportMode.InsertBelowSelected: {
        const current = sink.getRowData();
        const rawIndex = options.insertIndex ?? current.length;
        const index = Math.max(0, Math.min(rawIndex, current.length));
        sink.setData([...current.slice(0, index), ...remapped, ...current.slice(index)]);
        break;
      }
      case ImportMode.Replace:
      default:
        sink.setData(remapped);
        break;
    }
  }

  /**
   * Re-keys imported rows (keyed by inferred field) onto the grid's existing
   * column fields using an explicit or auto-resolved mapping, and remembers the
   * resolved mapping for the session.
   */
  private remapOntoExisting(
    result: ImportResult,
    existing: readonly ColumnDef[],
    override?: ImportMapping,
  ): Record<string, unknown>[] {
    const mapping = override ?? ColumnMapper.autoMap(result.headers, existing, this.rememberedMapping);

    // Persist resolved header→field pairs for reuse across imports this session.
    for (const [header, field] of Object.entries(mapping.headerToField)) {
      this.rememberedMapping[header] = field;
    }

    // Build inferredField → targetField from the header-aligned arrays.
    const fieldToTarget = new Map<string, string>();
    for (let i = 0; i < result.headers.length; i++) {
      const target = mapping.headerToField[result.headers[i]];
      if (target) fieldToTarget.set(result.fields[i], target);
    }

    const out: Record<string, unknown>[] = new Array(result.rows.length);
    for (let r = 0; r < result.rows.length; r++) {
      const src = result.rows[r];
      const dst: Record<string, unknown> = {};
      for (const inferredField of Object.keys(src)) {
        const target = fieldToTarget.get(inferredField);
        if (target) dst[target] = src[inferredField];
      }
      out[r] = dst;
    }
    return out;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Emits an `IMPORT_PROGRESS` event for a stage. */
  private emitProgress(
    source: ImportSourceType,
    stage: ImportStage,
    message: string,
    processed?: number,
    total?: number,
  ): void {
    this.eventBus.emit(GridEventType.IMPORT_PROGRESS, { source, stage, message, processed, total });
  }

  /** Infers the {@link ImportSourceType} from a file name's extension. */
  static sourceFromFileName(fileName: string): ImportSourceType {
    const lower = fileName.toLowerCase();
    if (EXCEL_EXTENSIONS.some((ext) => lower.endsWith(ext))) return ImportSourceType.Excel;
    if (lower.endsWith('.tsv')) return ImportSourceType.Tsv;
    return ImportSourceType.Csv;
  }

  /** Monotonic-ish timestamp for duration measurement (falls back to `Date.now`). */
  private static now(): number {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }
}
