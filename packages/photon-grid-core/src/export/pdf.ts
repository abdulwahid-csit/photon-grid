/**
 * Optional jsPDF adapter entry point.
 *
 * Import this module only in applications that install and register `jspdf`
 * and `jspdf-autotable`. The libraries are supplied by the host.
 */
export { createPdfExporter, PDF_ROW_WARNING_THRESHOLD } from './adapters/pdf-exporter';
export type {
  AutoTableFn,
  AutoTableOptions,
  JsPdfConstructor,
  JsPdfConstructorOptions,
  JsPdfDocument,
  PdfExporterDeps,
} from './adapters/pdf-exporter';
