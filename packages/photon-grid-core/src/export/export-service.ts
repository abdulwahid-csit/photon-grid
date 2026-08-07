/**
 * The **Export Service** — the orchestrator behind `GridApi.export()`.
 *
 * It owns the whole export flow and nothing else: merge options over the grid's
 * defaults, resolve a {@link GridExporter} from the registry, prepare the data
 * once, hand it to the exporter, and report the outcome as events, callbacks
 * and (for a missing optional exporter) a toast.
 *
 * The one piece of real policy here is what happens when Excel or PDF is asked
 * for and no exporter has been registered. Photon Grid Core cannot bundle
 * `xlsx` or `jspdf` without breaking its zero-dependency contract, and it
 * deliberately does not dynamically import them either — so the honest failure
 * is a message that names the format, the packages and the registration step,
 * shown through the grid's own toast system rather than thrown as an opaque
 * `TypeError` from somewhere deep in a menu handler.
 *
 * @packageDocumentation
 */

import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import type { ToastService } from '../toast/toast-service';
import { ExportDataPreparer } from './export-data-preparer';
import { ExporterRegistry, globalExporterRegistry } from './exporter-registry';
import { csvExporter } from './csv-exporter';
import { jsonExporter } from './json-exporter';
import { withExtension } from './file-download';
import {
  BuiltInExportFormat,
  EXPORTER_REQUIREMENTS,
  ExportError,
  ExportErrorCode,
} from './export.types';
import type {
  ExportDataSource,
  ExportFeatureConfig,
  ExportFormat,
  ExportOptions,
  GridExporter,
  PreparedExportData,
  ResolvedExportOptions,
} from './export.types';

/** Formats offered by the Export menu when the host names none. */
export const DEFAULT_EXPORT_FORMATS: readonly ExportFormat[] = [
  BuiltInExportFormat.Csv,
  BuiltInExportFormat.Json,
  BuiltInExportFormat.Excel,
  BuiltInExportFormat.Pdf,
];

/** Base file name when neither the call nor the grid configuration supplies one. */
const DEFAULT_FILE_NAME = 'export';

/** Collaborators the service needs, injected as a DI bag. */
export interface ExportServiceDeps {
  /** Read-only view of the grid's rows, columns and formatting settings. */
  readonly source: ExportDataSource;
  /** The grid event bus — `EXPORT_START` / `EXPORT_COMPLETE` / `EXPORT_ERROR`. */
  readonly eventBus: EventBus;
  /**
   * The grid's toast service, resolved lazily. A function rather than the
   * instance so the service can be constructed before the toast layer's host
   * exists, matching how the editing services take theirs.
   */
  readonly getToasts?: () => ToastService | null;
  /** The grid's `GridOptions.export`, re-read on every call so it stays live. */
  readonly getConfig?: () => ExportFeatureConfig | undefined;
}

/**
 * Runs exports for one grid.
 *
 * Holds a grid-local {@link ExporterRegistry} chained to the global one, so
 * `gridApi.registerExporter(...)` affects this grid while
 * `registerExporter(...)` affects the page.
 */
export class ExportService {
  private readonly registry: ExporterRegistry;
  private readonly preparer: ExportDataPreparer;

  constructor(private readonly deps: ExportServiceDeps) {
    this.registry = new ExporterRegistry(globalExporterRegistry);
    this.preparer = new ExportDataPreparer(deps.source);

    // CSV and JSON need nothing external, so they are registered up front and
    // can never report themselves as unavailable. Registered on the grid-local
    // layer, which means a host that registers its own `'csv'` globally still
    // wins for grids that do not override it locally — and can override it
    // per grid with `gridApi.registerExporter`.
    this.registry.register(BuiltInExportFormat.Csv, csvExporter);
    this.registry.register(BuiltInExportFormat.Json, jsonExporter);
  }

  // ── Registration ───────────────────────────────────────────────────────────

  /** Registers an exporter for this grid only. Outranks a global registration. */
  registerExporter(format: ExportFormat, exporter: GridExporter): void {
    this.registry.register(format, exporter);
  }

  /** Removes a grid-local registration, revealing any global one again. */
  unregisterExporter(format: ExportFormat): boolean {
    return this.registry.unregister(format);
  }

  /** Whether this grid can export the format (grid-local, then global). */
  hasExporter(format: ExportFormat): boolean {
    return this.registry.has(format);
  }

  /** Resolves the exporter this grid would use, or `undefined`. */
  getExporter(format: ExportFormat): GridExporter | undefined {
    return this.registry.get(format);
  }

  /** Every format this grid can export, sorted. */
  getFormats(): ExportFormat[] {
    return this.registry.formats();
  }

  /** The formats the Export menu should offer, in configured order. */
  getMenuFormats(): readonly ExportFormat[] {
    return this.deps.getConfig?.()?.formats ?? DEFAULT_EXPORT_FORMATS;
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  /**
   * Prepares the export payload without writing a file.
   *
   * Useful for hosts that want to post the data somewhere rather than download
   * it, and for testing an exporter against real grid state.
   *
   * @param options - Scope and hook options; merged over the grid defaults.
   */
  prepare(options: ExportOptions = {}): PreparedExportData {
    return this.preparer.prepare(this.resolveOptions(BuiltInExportFormat.Csv, options));
  }

  /**
   * Exports the grid in `format`.
   *
   * @param format  - `'csv'`, `'json'`, `'excel'`, `'pdf'`, or any registered format.
   * @param options - Per-call options, merged over `GridOptions.export`.
   * @returns Resolves once the exporter has finished.
   * @throws {ExportError} With {@link ExportErrorCode.ExporterNotRegistered}
   *   when the format has no exporter, or
   *   {@link ExportErrorCode.ExporterFailed} when the exporter threw. Both are
   *   reported as an `EXPORT_ERROR` event and (for the former) a toast before
   *   the promise rejects, so a caller that does not care can safely ignore it.
   */
  async export(format: ExportFormat, options: ExportOptions = {}): Promise<void> {
    const config = this.deps.getConfig?.();
    const exporter = this.registry.get(format);

    if (!exporter) {
      throw this.fail(
        new ExportError(
          ExportErrorCode.ExporterNotRegistered,
          format,
          missingExporterMessage(format),
          EXPORTER_REQUIREMENTS[String(format).toLowerCase()]?.packages ?? [],
        ),
        config,
        /* toast */ true,
      );
    }

    const resolved = this.resolveOptions(format, options, exporter);
    const data = this.preparer.prepare(resolved);

    this.deps.eventBus.emit(GridEventType.EXPORT_START, {
      format,
      fileName: resolved.fileName,
      rowCount: data.rows.length,
    });

    try {
      await exporter.export(data, resolved);
    } catch (cause) {
      throw this.fail(
        new ExportError(
          ExportErrorCode.ExporterFailed,
          format,
          `${formatLabel(format)} export failed: ${cause instanceof Error ? cause.message : String(cause)}`,
          [],
          { cause },
        ),
        config,
        // The exporter itself failed — a toast is right here too, because the
        // user asked for a file and is not going to get one.
        /* toast */ true,
      );
    }

    this.deps.eventBus.emit(GridEventType.EXPORT_COMPLETE, {
      format,
      fileName: resolved.fileName,
      rowCount: data.rows.length,
    });
    config?.onComplete?.({
      format,
      fileName: resolved.fileName,
      rowCount: data.rows.length,
      columnCount: data.columns.length,
    });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /**
   * Reports a failure through every channel, then hands the error back so the
   * caller can `throw` it — one place that knows a failure means *event +
   * callback + toast*, rather than three call sites each remembering two of them.
   */
  private fail(error: ExportError, config: ExportFeatureConfig | undefined, toast: boolean): ExportError {
    this.deps.eventBus.emit(GridEventType.EXPORT_ERROR, {
      format: error.format,
      message: error.message,
      code: error.code,
      requiredPackages: error.requiredPackages,
    });

    if (toast && !config?.suppressToasts) {
      this.deps.getToasts?.()?.error(toastMessage(error), {
        title: `${formatLabel(error.format)} export`,
        duration: 8000,
        // One toast per format: clicking Excel five times should not stack five
        // identical notifications.
        dedupeKey: `pg-export-${error.code}-${error.format}`,
      });
    }

    config?.onError?.(error);
    return error;
  }

  /**
   * Layers per-call options over the grid's format-specific defaults, then its
   * global defaults, and resolves the file name.
   *
   * Precedence, highest first: the call → `GridOptions.export.<format>` →
   * `GridOptions.export`.
   */
  private resolveOptions(
    format: ExportFormat,
    options: ExportOptions,
    exporter?: GridExporter,
  ): ResolvedExportOptions {
    const config = this.deps.getConfig?.();
    const perFormat = config ? formatDefaults(config, format) : undefined;

    const merged: ExportOptions = {
      includeHiddenColumns: config?.includeHiddenColumns,
      onlySelectedRows: config?.onlySelectedRows,
      onlyFilteredRows: config?.onlyFilteredRows,
      processCellValue: config?.processCellValue,
      processHeader: config?.processHeader,
      ...perFormat,
      // `undefined` entries in the caller's object must not blank out a
      // configured default, so they are stripped before the final spread.
      ...stripUndefined(options),
    };

    const extension = exporter?.extension ?? defaultExtension(format);
    const baseName = options.fileName ?? perFormat?.fileName ?? config?.fileName ?? DEFAULT_FILE_NAME;

    return { ...merged, format, fileName: withExtension(baseName, extension) };
  }
}

// ── Message construction ─────────────────────────────────────────────────────

/** Title-cased display name for a format (`'excel'` → `'Excel'`). */
function formatLabel(format: ExportFormat): string {
  const known = EXPORTER_REQUIREMENTS[String(format).toLowerCase()];
  if (known) return known.label;
  const name = String(format);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** `"'jspdf' and 'jspdf-autotable'"` — a readable package list. */
function packageList(packages: readonly string[]): string {
  const quoted = packages.map((p) => `'${p}'`);
  if (quoted.length <= 1) return quoted[0] ?? '';
  return `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
}

/**
 * The developer-facing message on the thrown {@link ExportError} — long form,
 * because it lands in a console where there is room to say exactly what to do.
 */
function missingExporterMessage(format: ExportFormat): string {
  const requirement = EXPORTER_REQUIREMENTS[String(format).toLowerCase()];
  if (!requirement) {
    return (
      `No exporter is registered for the '${format}' format. ` +
      `Register one with registerExporter('${format}', exporter) before calling export('${format}').`
    );
  }
  return (
    `${requirement.label} export is not configured. ` +
    `Please install the ${packageList(requirement.packages)} package${requirement.packages.length > 1 ? 's' : ''} ` +
    `and register the ${requirement.label} exporter with Photon Grid.`
  );
}

/**
 * The user-facing toast text — short form, because a toast is read in a glance
 * and the console already carries the full instructions.
 */
function toastMessage(error: ExportError): string {
  if (error.code !== ExportErrorCode.ExporterNotRegistered) return error.message;
  const requirement = EXPORTER_REQUIREMENTS[String(error.format).toLowerCase()];
  if (!requirement) {
    return `'${error.format}' export unavailable. Register an exporter for this format.`;
  }
  return (
    `${requirement.label} export unavailable. ` +
    `Install ${packageList(requirement.packages)} and register the ${requirement.label} exporter.`
  );
}

// ── Option helpers ───────────────────────────────────────────────────────────

/** The `GridOptions.export.<format>` block for a format, when one exists. */
function formatDefaults(
  config: ExportFeatureConfig,
  format: ExportFormat,
): Partial<ExportOptions> | undefined {
  switch (String(format).toLowerCase()) {
    case BuiltInExportFormat.Csv:
      return config.csv;
    case BuiltInExportFormat.Json:
      return config.json;
    case BuiltInExportFormat.Excel:
      return config.excel;
    case BuiltInExportFormat.Pdf:
      return config.pdf;
    default:
      return undefined;
  }
}

/**
 * The file extension for a format when its exporter declares none — `'excel'`
 * means an `.xlsx` file, not an `.excel` one.
 */
function defaultExtension(format: ExportFormat): string {
  switch (String(format).toLowerCase()) {
    case BuiltInExportFormat.Excel:
      return 'xlsx';
    default:
      return String(format).toLowerCase();
  }
}

/**
 * Drops `undefined`-valued keys so an explicitly-absent option cannot overwrite
 * a configured default during the merge spread.
 */
function stripUndefined<T extends object>(source: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(source) as Array<keyof T>) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}
