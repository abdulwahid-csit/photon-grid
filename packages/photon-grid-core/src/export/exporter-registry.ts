/**
 * The **Exporter Registry** — Photon Grid's seam for output formats it does not
 * (and must not) implement itself.
 *
 * Photon Grid Core is zero-dependency by contract. Excel and PDF need real
 * libraries, so instead of importing them the core holds a registry of
 * {@link GridExporter}s that a host fills in:
 *
 * ```ts
 * import * as XLSX from 'xlsx';
 * import { registerExporter } from 'photon-grid-core';
 * import { createExcelExporter } from 'photon-grid-core/export/excel';
 *
 * registerExporter('excel', createExcelExporter(XLSX));
 * ```
 *
 * Registrations are **two-layer**, mirroring how the icon registry resolves:
 *
 * ```
 * grid-local   ← gridApi.registerExporter(...)   — this grid only
 *     ↓ falls through to
 * global       ← registerExporter(...)           — every grid on the page
 * ```
 *
 * A grid-local registration wins, so one grid can export PDFs landscape-first
 * without re-registering anything for the rest of the page; anything it does not
 * override still resolves globally. The global layer is what makes the common
 * "configure once at app bootstrap" case a single call.
 *
 * @packageDocumentation
 */

import type { ExportFormat, GridExporter } from './export.types';

/**
 * A lookup of {@link GridExporter}s keyed by {@link ExportFormat}, optionally
 * chained to a fallback registry.
 *
 * The class is deliberately tiny and free of grid knowledge — it is a `Map`
 * with a parent link and a normalising key, nothing more. All policy (what a
 * missing exporter means, which toast to show) lives in the
 * {@link import('./export-service').ExportService}.
 */
export class ExporterRegistry {
  private readonly exporters = new Map<string, GridExporter>();

  /**
   * @param parent - Registry consulted when this one has no entry for a format.
   *   `null` makes this a root registry.
   */
  constructor(private readonly parent: ExporterRegistry | null = null) {}

  /**
   * Registers (or replaces) the exporter for a format.
   *
   * @param format   - The format key, e.g. `'excel'`. Case-insensitive.
   * @param exporter - The implementation.
   * @throws {TypeError} When `exporter` does not implement `export()`.
   */
  register(format: ExportFormat, exporter: GridExporter): void {
    if (!exporter || typeof exporter.export !== 'function') {
      throw new TypeError(
        `[PhotonGrid] registerExporter('${format}') needs an object with an export() method.`,
      );
    }
    this.exporters.set(normalizeFormat(format), exporter);
  }

  /**
   * Removes a format's exporter from **this** registry only. A parent
   * registration for the same format becomes visible again.
   *
   * @returns `true` when an entry was removed.
   */
  unregister(format: ExportFormat): boolean {
    return this.exporters.delete(normalizeFormat(format));
  }

  /**
   * Resolves a format through this registry, then its parent.
   *
   * @returns The exporter, or `undefined` when no layer has one.
   */
  get(format: ExportFormat): GridExporter | undefined {
    return this.exporters.get(normalizeFormat(format)) ?? this.parent?.get(format);
  }

  /** Whether {@link get} would resolve — the cheap capability check. */
  has(format: ExportFormat): boolean {
    return this.exporters.has(normalizeFormat(format)) || (this.parent?.has(format) ?? false);
  }

  /**
   * Every resolvable format, deduplicated across the layers and sorted so the
   * result is stable to assert on.
   */
  formats(): ExportFormat[] {
    const names = new Set<string>(this.parent?.formats() ?? []);
    for (const key of this.exporters.keys()) names.add(key);
    return Array.from(names).sort();
  }

  /** Clears **this** layer. The parent, if any, is untouched. */
  clear(): void {
    this.exporters.clear();
  }
}

/**
 * Normalises a format key so `'Excel'`, `'excel'` and `' excel '` are one
 * entry — a registration typo should not silently produce a second format that
 * nothing can look up.
 */
function normalizeFormat(format: ExportFormat): string {
  return String(format).trim().toLowerCase();
}

/**
 * The page-wide exporter registry. Every grid falls back to it, so registering
 * here once at application bootstrap enables the format everywhere.
 */
export const globalExporterRegistry = new ExporterRegistry();

/**
 * Registers an exporter for **every** grid on the page.
 *
 * Exposed as a bare function so it reads the same in every environment: as
 * `PhotonGrid.registerExporter(...)` from the CDN bundle, and as a named import
 * from the package.
 *
 * @param format   - The format key, e.g. `'excel'`, `'pdf'`, `'xml'`.
 * @param exporter - The implementation.
 *
 * @example
 * ```ts
 * import jsPDF from 'jspdf';
 * import autoTable from 'jspdf-autotable';
 * registerExporter('pdf', createPdfExporter({ jsPDF, autoTable }));
 * ```
 */
export function registerExporter(format: ExportFormat, exporter: GridExporter): void {
  globalExporterRegistry.register(format, exporter);
}

/**
 * Removes a globally-registered exporter.
 *
 * @returns `true` when one was removed.
 */
export function unregisterExporter(format: ExportFormat): boolean {
  return globalExporterRegistry.unregister(format);
}

/**
 * Whether a format can be exported using the global registry.
 *
 * Use it to tailor a host's own UI; the grid's Export menu does **not** need it,
 * because an unavailable format is shown anyway and explains itself when
 * clicked.
 */
export function hasExporter(format: ExportFormat): boolean {
  return globalExporterRegistry.has(format);
}

/** Resolves a globally-registered exporter, or `undefined`. */
export function getExporter(format: ExportFormat): GridExporter | undefined {
  return globalExporterRegistry.get(format);
}

/** Every format registered globally, sorted. */
export function getRegisteredExportFormats(): ExportFormat[] {
  return globalExporterRegistry.formats();
}
