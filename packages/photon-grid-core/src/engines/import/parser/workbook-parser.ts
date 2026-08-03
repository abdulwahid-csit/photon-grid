/**
 * The **Workbook Parser port** — the extension seam that decouples Photon Grid
 * Core (which is deliberately zero-dependency) from any heavyweight spreadsheet
 * library needed to read binary `.xlsx` / `.xls` files.
 *
 * Core ships built-in importers for the text sources (CSV / TSV / Clipboard)
 * that need no dependency. Excel support is *pluggable*: a host registers a
 * `WorkbookParser` (for example the optional SheetJS-backed adapter shipped at
 * `@photon-grid/core/import/sheetjs`) via
 * {@link import('../import-engine').ImportEngine.registerWorkbookParser}, and
 * only that adapter ever touches the spreadsheet library. Implementing this one
 * interface is all a new binary format requires — no grid changes.
 *
 * @packageDocumentation
 */

import type { Workbook } from '../model/workbook';

/** Options passed to a {@link WorkbookParser}. */
export interface WorkbookParseOptions {
  /** Preferred sheet name; the parser should still return all sheets when it can. */
  readonly sheetName?: string;
  /** A friendly file name, for diagnostics. */
  readonly fileName?: string;
}

/**
 * Parses a binary spreadsheet into the intermediate {@link Workbook} model.
 *
 * Implementations must:
 * - preserve formulas as {@link import('../model/workbook').WorkbookCell.formula}
 *   (leading `=` included) and never evaluate them;
 * - map every sheet, in tab order;
 * - throw on a corrupted / unreadable input (the pipeline converts the throw
 *   into a friendly validation error).
 */
export interface WorkbookParser {
  /**
   * @param input - The file contents as an `ArrayBuffer` (binary) or `string`
   *                (already-decoded text, for parsers that accept it).
   * @param options - Parse options.
   * @returns The parsed workbook (may be async).
   */
  parse(input: ArrayBuffer | string, options?: WorkbookParseOptions): Promise<Workbook> | Workbook;
}
