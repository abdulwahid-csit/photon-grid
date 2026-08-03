/**
 * The **Type Detector** — infers a Photon Grid {@link ColumnDataType} for each
 * imported column by sampling its cells. Photon Grid does no type inference at
 * ingest (it trusts `ColumnDef.type`), so the Import Engine owns this: turning
 * a column of raw strings/values into `number`, `currency`, `percentage`,
 * `date`, `boolean`, `email` or `string`.
 *
 * The detector is deliberately conservative and allocation-lean: it classifies
 * each sampled cell once, tallies the classifications, and picks the dominant
 * non-empty type. A single non-conforming value demotes the column to `string`
 * only when it is not itself blank — blanks never veto a type. Formula cells are
 * reported separately (they drive `allowFormula`, not the column's value type).
 *
 * @packageDocumentation
 */

import type { ColumnDataType } from '../../../types/column.types';
import { ImportCellType } from '../../../types/import.types';
import type { WorkbookCell } from '../model/workbook';

/** The outcome of sniffing one column. */
export interface DetectedColumnType {
  /** The inferred grid column type. */
  readonly type: ColumnDataType;
  /** `true` when at least one sampled cell carried a `=`-prefixed formula. */
  readonly hasFormula: boolean;
}

/** Max cells sampled per column — bounds cost on very tall imports. */
const DEFAULT_SAMPLE_SIZE = 200;

const CURRENCY_RE = /^[-+]?[$€£¥₹]\s?\d[\d,]*(\.\d+)?$|^[-+]?\d[\d,]*(\.\d+)?\s?[$€£¥₹]$/;
const PERCENT_RE = /^[-+]?\d[\d,]*(\.\d+)?\s?%$/;
const NUMBER_RE = /^[-+]?\d[\d,]*(\.\d+)?([eE][-+]?\d+)?$/;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const BOOLEAN_RE = /^(true|false|yes|no)$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/;
const SLASH_DATE_RE = /^\d{1,4}[/.]\d{1,2}[/.]\d{1,4}$/;

/** Stateless column-type inference. */
export class TypeDetector {
  /**
   * Classifies a single cell into an {@link ImportCellType}.
   *
   * @param cell - The workbook cell to classify.
   * @returns The cell's classification.
   */
  static classifyCell(cell: WorkbookCell): ImportCellType {
    if (cell.formula) return ImportCellType.Formula;

    const v = cell.value;
    if (v === null || v === '') return ImportCellType.Empty;
    if (typeof v === 'boolean') return ImportCellType.Boolean;
    if (typeof v === 'number') return ImportCellType.Number;

    const s = String(v).trim();
    if (s === '') return ImportCellType.Empty;

    if (BOOLEAN_RE.test(s)) return ImportCellType.Boolean;
    if (PERCENT_RE.test(s)) return ImportCellType.Percentage;
    if (CURRENCY_RE.test(s)) return ImportCellType.Currency;
    if (NUMBER_RE.test(s)) return ImportCellType.Number;
    if (EMAIL_RE.test(s)) return ImportCellType.Email;
    if (ISO_DATE_RE.test(s) || (SLASH_DATE_RE.test(s) && !isNaN(Date.parse(s)))) return ImportCellType.Date;

    return ImportCellType.String;
  }

  /**
   * Infers the column type for a vertical slice of cells (one per data row).
   *
   * The dominant non-empty, non-formula classification wins. Numeric families
   * unify sensibly (a column mixing plain numbers and currency resolves to
   * `currency`; numbers and percentages resolve to `percentage`); any other
   * mixture falls back to `string`. All-empty (or all-formula) columns default
   * to `number` when a formula is present (computed columns are typically
   * numeric) else `string`.
   *
   * @param cells      - The column's cells across sampled rows.
   * @param sampleSize - Max cells to inspect. @default 200
   * @returns The inferred type and whether any formula was seen.
   */
  static detectColumn(cells: readonly WorkbookCell[], sampleSize = DEFAULT_SAMPLE_SIZE): DetectedColumnType {
    const counts = new Map<ImportCellType, number>();
    let hasFormula = false;
    let nonEmpty = 0;

    const limit = Math.min(cells.length, sampleSize);
    for (let i = 0; i < limit; i++) {
      const kind = TypeDetector.classifyCell(cells[i]);
      if (kind === ImportCellType.Formula) {
        hasFormula = true;
        continue;
      }
      if (kind === ImportCellType.Empty) continue;
      nonEmpty++;
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }

    if (nonEmpty === 0) {
      return { type: hasFormula ? 'number' : 'string', hasFormula };
    }

    const type = TypeDetector.resolveDominant(counts, nonEmpty);
    return { type, hasFormula };
  }

  /** Picks the winning {@link ColumnDataType} from tallied classifications. */
  private static resolveDominant(counts: Map<ImportCellType, number>, nonEmpty: number): ColumnDataType {
    // A single distinct type: use it directly.
    if (counts.size === 1) {
      return TypeDetector.toColumnType([...counts.keys()][0]);
    }

    const num = counts.get(ImportCellType.Number) ?? 0;
    const cur = counts.get(ImportCellType.Currency) ?? 0;
    const pct = counts.get(ImportCellType.Percentage) ?? 0;
    const numericTotal = num + cur + pct;

    // Purely numeric mixtures unify to the most specific present family.
    if (numericTotal === nonEmpty) {
      if (pct > 0 && cur === 0) return 'percentage';
      if (cur > 0 && pct === 0) return 'currency';
      if (pct === 0 && cur === 0) return 'number';
      // Both currency and percentage present — no coherent single format.
      return 'string';
    }

    // Mixed non-numeric content: fall back to plain text.
    return 'string';
  }

  /** Maps an {@link ImportCellType} to its {@link ColumnDataType}. */
  private static toColumnType(kind: ImportCellType): ColumnDataType {
    switch (kind) {
      case ImportCellType.Number:
        return 'number';
      case ImportCellType.Currency:
        return 'currency';
      case ImportCellType.Percentage:
        return 'percentage';
      case ImportCellType.Date:
        return 'date';
      case ImportCellType.Boolean:
        return 'boolean';
      case ImportCellType.Email:
        return 'email';
      default:
        return 'string';
    }
  }
}
