/**
 * The **Clipboard Importer** — turns the system clipboard's text payload into
 * the intermediate {@link Workbook} model.
 *
 * Excel, Google Sheets and Numbers all place **tab-separated** text on the
 * clipboard when cells are copied, so clipboard import routes the raw text
 * through the same robust {@link DelimitedImporter} used for file TSV — one
 * parser, one code path, no duplicated logic. The raw read is delegated to the
 * grid's existing {@link import('../../clipboard/clipboard-engine').ClipboardEngine}
 * when one is provided, falling back to the async Clipboard API otherwise.
 *
 * @packageDocumentation
 */

import type { Workbook } from '../model/workbook';
import { DelimitedImporter } from './delimited-importer';

/** The minimal clipboard-read surface the importer needs. */
export interface ClipboardTextReader {
  /** Reads the clipboard and returns a parsed matrix; only the flattened text is used here. */
  pasteFromClipboard(): Promise<string[][]>;
}

/** Stateless clipboard importer. */
export class ClipboardImporter {
  /**
   * Reads plain text from the clipboard.
   *
   * @param reader - Optional grid clipboard engine; when omitted the async
   *                 Clipboard API (`navigator.clipboard.readText`) is used.
   * @returns The raw clipboard text (may be empty).
   */
  static async readText(reader?: ClipboardTextReader): Promise<string> {
    if (reader) {
      // The engine returns a parsed matrix; re-join to raw TSV so the robust
      // delimited parser (quotes, embedded newlines) is the single authority.
      const matrix = await reader.pasteFromClipboard();
      return matrix.map((r) => r.join('\t')).join('\n');
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      return navigator.clipboard.readText();
    }
    return '';
  }

  /**
   * Parses clipboard text (assumed TSV) into a {@link Workbook}.
   *
   * @param text - The clipboard text.
   * @returns A single-sheet workbook named `Clipboard`.
   */
  static parse(text: string): Workbook {
    return DelimitedImporter.parse(text, { delimiter: '\t', sheetName: 'Clipboard' });
  }
}
