/**
 * The **Workbook Mapper** — the pipeline stage that turns a validated
 * {@link WorkbookSheet} into grid-ready artifacts: inferred column definitions
 * and typed row-data objects.
 *
 * Responsibilities:
 * - resolve the header row (or synthesize `Column N` headers);
 * - synthesize a safe, unique `field` per column ({@link ColumnMapper});
 * - infer each column's {@link ColumnDataType} ({@link TypeDetector});
 * - coerce every literal cell to its column's type once, up front, so the grid
 *   never re-parses on render;
 * - **preserve formulas verbatim** — a `=`-prefixed cell keeps its raw source
 *   string as the field value and flips the column's `allowFormula`, so the
 *   grid's existing `setData → FormulaInitializer` path registers and computes
 *   it through the one Formula Engine (the importer never evaluates anything).
 *
 * The mapper is pure and has no grid/DOM dependency.
 *
 * @packageDocumentation
 */

import type { ColumnDataType, ColumnDefInput } from '../../../types/column.types';
import type { WorkbookCell, WorkbookSheet } from '../model/workbook';
import { ColumnMapper } from './column-mapper';
import { TypeDetector } from './type-detector';

/** Options for {@link WorkbookMapper.mapSheet}. */
export interface WorkbookMapOptions {
  /** Whether the first row is a header row. */
  readonly hasHeaderRow: boolean;
  /** Max cells sampled per column for type detection. */
  readonly sampleSize?: number;
}

/** The grid-ready product of mapping one sheet. */
export interface MappedWorkbook {
  /** Inferred column definitions (type-sniffed; `allowFormula` set where formulas exist). */
  readonly columns: ColumnDefInput[];
  /** Row-data objects keyed by column `field`. Formula cells keep their raw `=…` source. */
  readonly rows: Record<string, unknown>[];
  /** Resolved headers in column order. */
  readonly headers: string[];
  /** Synthesized fields, parallel to {@link headers}. */
  readonly fields: string[];
  /** Count of cells carrying a `=`-prefixed formula. */
  readonly formulaCount: number;
}

/** Matches any character that is not part of a signed decimal/scientific number. */
const NON_NUMERIC_RE = /[^0-9.eE+-]/g;

/** Stateless Workbook → grid transformation. */
export class WorkbookMapper {
  /**
   * Maps a single sheet into columns + typed rows.
   *
   * @param sheet   - The validated sheet to map.
   * @param options - Mapping options.
   * @returns The grid-ready artifacts.
   */
  static mapSheet(sheet: WorkbookSheet, options: WorkbookMapOptions): MappedWorkbook {
    const { hasHeaderRow } = options;
    const allRows = sheet.rows;

    // Column count is anchored to the first row's width; data rows are
    // padded/truncated to it (the validator has already warned on raggedness).
    const width = allRows.length > 0 ? allRows[0].cells.length : 0;

    const headers = WorkbookMapper.resolveHeaders(sheet, width, hasHeaderRow);
    const fields = ColumnMapper.synthesizeFields(headers);
    const dataRows = hasHeaderRow ? allRows.slice(1) : allRows;

    // Detect each column's type from its vertical slice of data cells.
    const columnHasFormula: boolean[] = new Array(width).fill(false);
    const columnTypes: ColumnDataType[] = new Array(width);
    for (let c = 0; c < width; c++) {
      const slice: WorkbookCell[] = new Array(dataRows.length);
      for (let r = 0; r < dataRows.length; r++) {
        slice[r] = dataRows[r].cells[c] ?? { value: null };
      }
      const detected = TypeDetector.detectColumn(slice, options.sampleSize);
      columnTypes[c] = detected.type;
      columnHasFormula[c] = detected.hasFormula;
    }

    // Build typed row objects.
    let formulaCount = 0;
    const rows: Record<string, unknown>[] = new Array(dataRows.length);
    for (let r = 0; r < dataRows.length; r++) {
      const cells = dataRows[r].cells;
      const obj: Record<string, unknown> = {};
      for (let c = 0; c < width; c++) {
        const cell = cells[c];
        const field = fields[c];
        if (cell && cell.formula) {
          // Preserve the formula source; the Formula Engine computes it later.
          obj[field] = cell.formula;
          formulaCount++;
        } else {
          obj[field] = WorkbookMapper.coerce(cell ? cell.value : null, columnTypes[c]);
        }
      }
      rows[r] = obj;
    }

    // Assemble column defs.
    const columns: ColumnDefInput[] = new Array(width);
    for (let c = 0; c < width; c++) {
      const def: ColumnDefInput = {
        field: fields[c],
        header: headers[c],
        type: columnTypes[c],
      };
      if (columnHasFormula[c]) def.allowFormula = true;
      columns[c] = def;
    }

    return { columns, rows, headers, fields, formulaCount };
  }

  /** Resolves the header row, padding/synthesizing to `width` columns. */
  private static resolveHeaders(sheet: WorkbookSheet, width: number, hasHeaderRow: boolean): string[] {
    const headers: string[] = new Array(width);
    const headerCells = hasHeaderRow && sheet.rows.length > 0 ? sheet.rows[0].cells : null;
    for (let c = 0; c < width; c++) {
      const raw = headerCells && headerCells[c] ? headerCells[c].value : null;
      const text = raw === null || raw === undefined ? '' : String(raw).trim();
      headers[c] = text !== '' ? text : `Column ${c + 1}`;
    }
    return headers;
  }

  /**
   * Coerces a raw literal cell value to its column's type. Currency/percentage/
   * number strings are stripped of symbols, separators and `%` before parsing;
   * dates become ISO strings; booleans accept `true/false/yes/no/1/0`.
   *
   * @param raw  - The raw cell value.
   * @param type - The inferred column type.
   * @returns The typed value (or `null` for blanks / unparseable numerics).
   */
  private static coerce(raw: string | number | boolean | null, type: ColumnDataType): unknown {
    if (raw === null || raw === '') return null;

    switch (type) {
      case 'number':
      case 'currency':
      case 'percentage': {
        if (typeof raw === 'number') return raw;
        const stripped = String(raw).replace(NON_NUMERIC_RE, '');
        if (stripped === '' || stripped === '-' || stripped === '+') return null;
        const n = Number(stripped);
        return isNaN(n) ? null : n;
      }
      case 'boolean': {
        if (typeof raw === 'boolean') return raw;
        const s = String(raw).trim().toLowerCase();
        if (s === 'true' || s === 'yes' || s === '1') return true;
        if (s === 'false' || s === 'no' || s === '0') return false;
        return Boolean(raw);
      }
      case 'date': {
        const d = new Date(raw as string);
        return isNaN(d.getTime()) ? String(raw) : d.toISOString();
      }
      default:
        return typeof raw === 'string' ? raw : String(raw);
    }
  }
}
