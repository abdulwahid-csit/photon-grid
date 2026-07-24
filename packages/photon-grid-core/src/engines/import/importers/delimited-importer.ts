/**
 * The **Delimited Importer** — a robust, streaming-friendly RFC 4180 CSV/TSV
 * parser that converts delimited text into the intermediate {@link Workbook}
 * model.
 *
 * Unlike the naïve `split('\n').split(delimiter)` used for simple clipboard
 * TSV, this parser is a proper state machine that correctly handles:
 * - quoted fields containing the delimiter, newlines, or quotes;
 * - escaped quotes (`""` inside a quoted field);
 * - both `\r\n` and `\n` line endings (and a trailing newline);
 * - a UTF-8 BOM at the start of the file;
 * - a configurable delimiter (comma, tab, semicolon, pipe, …).
 *
 * It performs a single pass over the input with no per-cell regex and no
 * intermediate line array, so it stays allocation-lean on large files.
 *
 * @packageDocumentation
 */

import type { Workbook } from '../model/workbook';
import { matrixToWorkbook } from '../model/workbook';

/** Options for {@link DelimitedImporter.parse}. */
export interface DelimitedParseOptions {
  /** Field delimiter. @default `','` */
  readonly delimiter?: string;
  /** Name for the synthesized sheet. @default `'Sheet1'` */
  readonly sheetName?: string;
}

const QUOTE = 34; // "
const CR = 13; // \r
const LF = 10; // \n
const BOM = 0xfeff;

/**
 * Stateless RFC 4180 delimited-text importer. All methods are static — there
 * is no per-instance state to allocate.
 */
export class DelimitedImporter {
  /**
   * Parses delimited text into a raw 2-D matrix of string cells.
   *
   * @param text      - The full CSV/TSV document.
   * @param delimiter - Single-character field delimiter.
   * @returns Rows of string cells (ragged rows preserved as-is).
   */
  static parseMatrix(text: string, delimiter = ','): string[][] {
    const rows: string[][] = [];
    let field = '';
    let row: string[] = [];
    let inQuotes = false;
    let fieldStarted = false;
    const delim = delimiter.charCodeAt(0);

    // Strip a leading UTF-8 BOM so the first header is clean.
    let start = 0;
    if (text.length > 0 && text.charCodeAt(0) === BOM) start = 1;

    const pushField = (): void => {
      row.push(field);
      field = '';
      fieldStarted = false;
    };
    const pushRow = (): void => {
      pushField();
      rows.push(row);
      row = [];
    };

    for (let i = start; i < text.length; i++) {
      const code = text.charCodeAt(i);

      if (inQuotes) {
        if (code === QUOTE) {
          // A doubled quote is a literal quote; a lone quote ends the quoted run.
          if (i + 1 < text.length && text.charCodeAt(i + 1) === QUOTE) {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += text[i];
        }
        continue;
      }

      if (code === QUOTE && !fieldStarted) {
        // A quote only opens a quoted field when it leads the field.
        inQuotes = true;
        fieldStarted = true;
      } else if (code === delim) {
        pushField();
      } else if (code === CR) {
        // Swallow CR; the following LF (if any) triggers the row break.
        if (i + 1 < text.length && text.charCodeAt(i + 1) === LF) i++;
        pushRow();
      } else if (code === LF) {
        pushRow();
      } else {
        field += text[i];
        fieldStarted = true;
      }
    }

    // Flush the final field/row unless the document ended on a clean row break
    // (avoids a spurious trailing empty row from a terminal newline).
    if (field.length > 0 || row.length > 0 || fieldStarted) {
      pushRow();
    }

    return rows;
  }

  /**
   * Parses delimited text directly into a {@link Workbook}. Formula cells
   * (leading `=`) are captured by {@link matrixToWorkbook}.
   *
   * @param text    - The full CSV/TSV document.
   * @param options - Parse options.
   * @returns A single-sheet workbook.
   */
  static parse(text: string, options: DelimitedParseOptions = {}): Workbook {
    const matrix = DelimitedImporter.parseMatrix(text, options.delimiter ?? ',');
    return matrixToWorkbook(matrix, options.sheetName ?? 'Sheet1');
  }
}
