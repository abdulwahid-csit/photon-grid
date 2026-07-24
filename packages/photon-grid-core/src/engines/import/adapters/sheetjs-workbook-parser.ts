/**
 * **Optional SheetJS-backed Workbook parser.**
 *
 * This adapter is the officially-supported way to enable binary Excel
 * (`.xlsx` / `.xls`) import. It is deliberately **not** referenced by the core
 * barrel (`src/index.ts`) and is published on a separate entry point, so Photon
 * Grid Core stays zero-dependency and this file's `xlsx` cost is paid only by
 * hosts that opt in:
 *
 * ```ts
 * import { SheetJsWorkbookParser } from '@photon-grid/core/import/sheetjs';
 * gridApi.registerImportParser(new SheetJsWorkbookParser());
 * await gridApi.importExcel(file);
 * ```
 *
 * `xlsx` is an **optional peer dependency** — the host installs it. It is loaded
 * lazily (`import('xlsx')`) the first time a file is parsed, so it never enters
 * the initial bundle. The dynamic specifier is typed indirectly (`as string`)
 * so Photon Grid Core type-checks and builds without `xlsx` present.
 *
 * Formulas are preserved (`cell.f` → `=…`) and never evaluated here — the grid's
 * Formula Engine computes them after import.
 *
 * @packageDocumentation
 */

import type { Workbook, WorkbookCell, WorkbookRow, WorkbookSheet } from '../model/workbook';
import { makeCell } from '../model/workbook';
import type { WorkbookParser, WorkbookParseOptions } from '../parser/workbook-parser';

/** Minimal typed view of the SheetJS API surface this adapter uses. */
interface XlsxCell {
  /** Cell value (typed by `t`). */
  readonly v?: string | number | boolean | Date;
  /** Formatted text. */
  readonly w?: string;
  /** Cell type: `n`umber, `s`tring, `b`oolean, `d`ate, `e`rror. */
  readonly t?: string;
  /** Formula source, **without** the leading `=`. */
  readonly f?: string;
}
interface XlsxSheet {
  /** A1-notation address → cell. Also holds meta keys such as `!ref`. */
  readonly [address: string]: XlsxCell | string | undefined;
  /** The used range in A1 notation (e.g. `"A1:D20"`). */
  readonly '!ref'?: string;
}
interface XlsxWorkbook {
  readonly SheetNames: string[];
  readonly Sheets: Record<string, XlsxSheet>;
}
interface XlsxRange {
  readonly s: { r: number; c: number };
  readonly e: { r: number; c: number };
}
interface XlsxUtils {
  decode_range(ref: string): XlsxRange;
  encode_cell(addr: { r: number; c: number }): string;
}
interface XlsxModule {
  read(
    data: Uint8Array | ArrayBuffer | string,
    opts?: { type?: string; cellFormula?: boolean; cellDates?: boolean; raw?: boolean },
  ): XlsxWorkbook;
  readonly utils: XlsxUtils;
}

/** A {@link WorkbookParser} that reads real spreadsheets via SheetJS. */
export class SheetJsWorkbookParser implements WorkbookParser {
  /** Cached module handle after the first lazy load. */
  private xlsx: XlsxModule | null = null;

  /**
   * @param preloaded - An already-imported `xlsx` module, to skip the dynamic
   *                    import (useful in bundled/SSR environments or tests).
   */
  constructor(preloaded?: unknown) {
    if (preloaded) this.xlsx = preloaded as XlsxModule;
  }

  /** Lazily loads (and caches) the `xlsx` module. */
  private async load(): Promise<XlsxModule> {
    if (this.xlsx) return this.xlsx;
    // Non-literal specifier so Photon Grid Core builds without `xlsx` installed;
    // the host provides it as an optional peer dependency.
    const specifier = 'xlsx';
    const mod = (await import(specifier as string)) as unknown as XlsxModule | { default: XlsxModule };
    this.xlsx = 'read' in mod ? (mod as XlsxModule) : (mod as { default: XlsxModule }).default;
    return this.xlsx;
  }

  /** @inheritDoc */
  async parse(input: ArrayBuffer | string, _options?: WorkbookParseOptions): Promise<Workbook> {
    const xlsx = await this.load();
    const data = typeof input === 'string' ? input : new Uint8Array(input);
    const wb = xlsx.read(data, { type: typeof input === 'string' ? 'string' : 'array', cellFormula: true, cellDates: true });

    const sheets: WorkbookSheet[] = [];
    for (const name of wb.SheetNames) {
      sheets.push(this.convertSheet(xlsx, name, wb.Sheets[name]));
    }
    return { sheets };
  }

  /** Converts one SheetJS worksheet into a {@link WorkbookSheet}. */
  private convertSheet(xlsx: XlsxModule, name: string, sheet: XlsxSheet): WorkbookSheet {
    const ref = sheet['!ref'];
    if (!ref) return { name, rows: [] };

    const range = xlsx.utils.decode_range(ref);
    const rows: WorkbookRow[] = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells: WorkbookCell[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = xlsx.utils.encode_cell({ r, c });
        cells.push(this.convertCell(sheet[addr] as XlsxCell | undefined));
      }
      rows.push({ cells });
    }
    return { name, rows };
  }

  /** Converts a SheetJS cell into a {@link WorkbookCell}, preserving formulas. */
  private convertCell(cell: XlsxCell | undefined): WorkbookCell {
    if (!cell) return { value: null };

    const value = cell.v instanceof Date ? cell.v.toISOString() : (cell.v ?? null);
    if (cell.f) {
      // Preserve the formula (SheetJS omits the leading `=`); keep the cached
      // value too so it renders even before the Formula Engine recomputes.
      return { value, formula: `=${cell.f}` };
    }
    return makeCell(value as string | number | boolean | null);
  }
}
