/**
 * The **intermediate Workbook model** — the single common language every
 * importer produces and every downstream pipeline stage consumes. Excel, CSV,
 * TSV and Clipboard sources are all normalized into this shape *before* the
 * pipeline runs, so validation, mapping, type detection and formula discovery
 * are written once and are completely source-agnostic.
 *
 * The model is deliberately spreadsheet-shaped (workbook → sheets → rows →
 * cells) rather than grid-shaped, so it can faithfully carry information the
 * grid does not yet consume (merges, hyperlinks, comments, number formats).
 * Those fields are **future-ready**: typed and preserved by importers that can
 * supply them, ignored by the current mapper without loss.
 *
 * @packageDocumentation
 */

/**
 * A parsed number/date display format carried from the source (e.g. Excel's
 * `"0.00%"`). Future-ready: preserved by the Excel importer, currently used
 * only as a hint by the type detector.
 */
export interface WorkbookCellFormat {
  /** The raw source format string (e.g. Excel `numFmt`), when available. */
  readonly pattern?: string;
  /** Whether the source flagged this cell as a percentage. */
  readonly isPercentage?: boolean;
  /** Whether the source flagged this cell as currency. */
  readonly isCurrency?: boolean;
  /** Whether the source flagged this cell as a date/time. */
  readonly isDate?: boolean;
}

/**
 * A rectangular merged-cell region (top-left anchored). Future-ready: parsed by
 * capable importers, not yet consumed by the grid mapper.
 */
export interface WorkbookMergeRegion {
  readonly startRow: number;
  readonly endRow: number;
  readonly startColumn: number;
  readonly endColumn: number;
}

/**
 * A single cell in the Workbook model. A cell holds a literal {@link value},
 * and — independently — an optional {@link formula}. When a formula is present
 * the importer preserves both the source expression and the source's cached
 * value; the grid's Formula Engine (never the importer) recomputes the value.
 */
export interface WorkbookCell {
  /** The literal value (or the source's cached formula result). `null` for blanks. */
  readonly value: string | number | boolean | null;
  /** The formula source *including* the leading `=`, when the cell is a formula. */
  readonly formula?: string;
  /** Source cell format hints (future-ready). */
  readonly format?: WorkbookCellFormat;
  /** A cell comment/note (future-ready). */
  readonly comment?: string;
  /** A hyperlink target (future-ready). */
  readonly hyperlink?: string;
}

/** A single row of cells. */
export interface WorkbookRow {
  readonly cells: readonly WorkbookCell[];
}

/** A single sheet within a workbook. */
export interface WorkbookSheet {
  /** Sheet name (Excel tab name, or a synthesized name for text sources). */
  readonly name: string;
  /** Rows in source order — the first row is typically the header row. */
  readonly rows: readonly WorkbookRow[];
  /** Merged-cell regions (future-ready). */
  readonly merges?: readonly WorkbookMergeRegion[];
}

/** The root of the intermediate model — one or more sheets. */
export interface Workbook {
  readonly sheets: readonly WorkbookSheet[];
}

/**
 * Wraps a primitive value into a {@link WorkbookCell}. Empty strings and
 * `undefined` become `null` so blank handling is uniform downstream.
 *
 * @param value - The raw cell value.
 * @returns A normalized cell.
 */
export function makeCell(value: string | number | boolean | null | undefined): WorkbookCell {
  if (value === undefined || value === '') return { value: null };
  return { value };
}

/**
 * Builds a single-sheet {@link Workbook} from a dense 2-D matrix of primitive
 * values — the shared final step for the CSV/TSV/Clipboard importers.
 *
 * A leading `=` in a string cell is captured as {@link WorkbookCell.formula}
 * (the literal value is left as the raw source so the mapper can fall back to
 * it when the Formula Engine is disabled).
 *
 * @param matrix    - Rows of primitive cell values.
 * @param sheetName - Name for the synthesized sheet.
 * @returns A workbook containing exactly one sheet.
 */
export function matrixToWorkbook(
  matrix: ReadonlyArray<ReadonlyArray<string | number | boolean | null>>,
  sheetName: string,
): Workbook {
  const rows: WorkbookRow[] = new Array(matrix.length);
  for (let r = 0; r < matrix.length; r++) {
    const src = matrix[r];
    const cells: WorkbookCell[] = new Array(src.length);
    for (let c = 0; c < src.length; c++) {
      const v = src[c];
      if (typeof v === 'string' && v.length > 1 && v.charCodeAt(0) === 61 /* '=' */) {
        cells[c] = { value: v, formula: v };
      } else {
        cells[c] = makeCell(v);
      }
    }
    rows[r] = { cells };
  }
  return { sheets: [{ name: sheetName, rows }] };
}

/**
 * Selects the sheet to import from a workbook: the named sheet when
 * {@link sheetName} is supplied and present, otherwise the first sheet.
 *
 * @param workbook  - The parsed workbook.
 * @param sheetName - Preferred sheet name.
 * @returns The chosen sheet, or `undefined` when the workbook has no sheets.
 */
export function selectSheet(workbook: Workbook, sheetName?: string): WorkbookSheet | undefined {
  if (workbook.sheets.length === 0) return undefined;
  if (sheetName) {
    const match = workbook.sheets.find((s) => s.name === sheetName);
    if (match) return match;
  }
  return workbook.sheets[0];
}
