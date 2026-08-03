/**
 * The **Excel Importer** — adapts a binary `.xlsx` / `.xls` file into the
 * intermediate {@link Workbook} model by delegating to a pluggable
 * {@link WorkbookParser}.
 *
 * Photon Grid Core is zero-dependency, so it does **not** bundle a spreadsheet
 * library. A host enables Excel import by registering a parser (e.g. the
 * optional SheetJS adapter) with the {@link import('../import-engine').ImportEngine};
 * this importer simply forwards to it. When no parser is registered, it throws
 * a {@link ExcelParserUnavailableError} the pipeline turns into a friendly
 * validation message rather than an opaque crash.
 *
 * @packageDocumentation
 */

import type { Workbook } from '../model/workbook';
import type { WorkbookParser, WorkbookParseOptions } from '../parser/workbook-parser';

/** Thrown when Excel import is attempted but no {@link WorkbookParser} was registered. */
export class ExcelParserUnavailableError extends Error {
  constructor() {
    super(
      'No Excel parser is registered. Register one via gridApi.registerImportParser(...) ' +
        '(for example the optional SheetJS adapter) before importing .xlsx/.xls files.',
    );
    this.name = 'ExcelParserUnavailableError';
  }
}

/** Adapts a registered {@link WorkbookParser} to the importer contract. */
export class ExcelImporter {
  /**
   * @param parser - The registered workbook parser, or `null` when none is set.
   */
  constructor(private readonly parser: WorkbookParser | null) {}

  /** Whether an Excel parser is available. */
  get isAvailable(): boolean {
    return this.parser !== null;
  }

  /**
   * Parses a binary spreadsheet into a {@link Workbook}.
   *
   * @param input   - The file contents (`ArrayBuffer` for binary `.xlsx`).
   * @param options - Parse options (preferred sheet name, file name).
   * @returns The parsed workbook.
   * @throws {ExcelParserUnavailableError} when no parser is registered.
   */
  async parse(input: ArrayBuffer | string, options?: WorkbookParseOptions): Promise<Workbook> {
    if (!this.parser) throw new ExcelParserUnavailableError();
    return this.parser.parse(input, options);
  }
}
