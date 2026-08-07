/**
 * Optional SheetJS Excel adapter entry point.
 *
 * Import this module only in applications that install and register `xlsx`.
 * It has no runtime dependency on SheetJS; the host supplies the module to
 * `createExcelExporter`.
 */
export { createExcelExporter } from './adapters/excel-exporter';
export type {
  SheetJsModule,
  SheetJsUtils,
  SheetJsWorkbook,
  SheetJsWorksheet,
} from './adapters/excel-exporter';
