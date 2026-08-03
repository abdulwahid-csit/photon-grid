/**
 * Public barrel for the Photon Grid **Import Engine**.
 *
 * Re-exports the engine, the pipeline building blocks, the intermediate
 * Workbook model and the parser port so consumers and custom importers can be
 * built against a single entry. The optional SheetJS adapter is intentionally
 * **excluded** here (it lives on the `./import/sheetjs` subpath) so importing
 * this barrel never pulls a spreadsheet library into the bundle.
 *
 * @packageDocumentation
 */

export { ImportEngine } from './import-engine';
export { ImportPipeline } from './pipeline/import-pipeline';
export type { ImportPipelineInput, ProgressEmitter } from './pipeline/import-pipeline';

export { DelimitedImporter } from './importers/delimited-importer';
export type { DelimitedParseOptions } from './importers/delimited-importer';
export { ClipboardImporter } from './importers/clipboard-importer';
export type { ClipboardTextReader } from './importers/clipboard-importer';
export { ExcelImporter, ExcelParserUnavailableError } from './importers/excel-importer';

export { TypeDetector } from './services/type-detector';
export type { DetectedColumnType } from './services/type-detector';
export { ColumnMapper } from './services/column-mapper';
export { ImportValidator } from './services/import-validator';
export { WorkbookMapper } from './services/workbook-mapper';
export type { MappedWorkbook, WorkbookMapOptions } from './services/workbook-mapper';

export type { WorkbookParser, WorkbookParseOptions } from './parser/workbook-parser';
export {
  makeCell,
  matrixToWorkbook,
  selectSheet,
} from './model/workbook';
export type {
  Workbook,
  WorkbookSheet,
  WorkbookRow,
  WorkbookCell,
  WorkbookCellFormat,
  WorkbookMergeRegion,
} from './model/workbook';
