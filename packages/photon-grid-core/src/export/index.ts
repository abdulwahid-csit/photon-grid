/**
 * The Photon Grid **Export System** barrel.
 *
 * Re-exports the zero-dependency half of the system: the types, the registry,
 * the shared data-preparation layer and the built-in CSV/JSON exporters.
 *
 * The optional Excel and PDF adapters are deliberately **absent** — they live on
 * their own entry points (`photon-grid-core/export/excel`,
 * `photon-grid-core/export/pdf`) so that importing Photon Grid Core can never
 * pull them, or the libraries they are designed to be handed, into a bundle.
 *
 * @packageDocumentation
 */

export { ExportDataPreparer } from './export-data-preparer';
export { ExportService, DEFAULT_EXPORT_FORMATS } from './export-service';
export type { ExportServiceDeps } from './export-service';
export {
  ExporterRegistry,
  globalExporterRegistry,
  registerExporter,
  unregisterExporter,
  hasExporter,
  getExporter,
  getRegisteredExportFormats,
} from './exporter-registry';

export { csvExporter, serializeCsv, escapeCsvValue } from './csv-exporter';
export { jsonExporter, serializeJson, toJsonRecords } from './json-exporter';
export type { JsonExportRecord } from './json-exporter';
export { downloadExportFile, withExtension, EXPORT_MIME_TYPES } from './file-download';

export {
  BuiltInExportFormat,
  ExportError,
  ExportErrorCode,
  EXPORTER_REQUIREMENTS,
  PdfOrientation,
} from './export.types';
export type {
  ExcelExportOptions,
  ExportCell,
  ExportCellParams,
  ExportColumn,
  ExportDataSource,
  ExportFeatureConfig,
  ExportFormat,
  ExportHeaderParams,
  ExportMenuItemId,
  ExportOptions,
  ExportRow,
  ExportSuccessInfo,
  ExporterRequirement,
  GridExporter,
  JsonExportOptions,
  PdfExportOptions,
  PreparedExportData,
  ResolvedExportOptions,
} from './export.types';
