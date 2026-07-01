import type { CellRange } from '../../types/grid.types';
import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';

// ── Column descriptor ─────────────────────────────────────────────────────────

/**
 * Pre-compiled per-column accessor compiled once before the hot copy loop.
 * Avoids `field.split('.')`, option list scans, and Intl object creation
 * inside the inner loop.
 */
interface ColDesc {
  /** Original dot-notation field path. */
  field: string;
  /** Path segments — pre-split so the loop never calls `.split('.')`. */
  parts: string[];
  /** `true` when `field` contains a dot (enables the nested resolver). */
  nested: boolean;
  /** Column type string — drives the fast formatter switch. */
  type: string;
  /**
   * `value → label` map for `dropdown` columns.
   * Built once per column so each cell lookup is O(1) instead of O(options).
   */
  dropdownMap: Map<string, string> | null;
}

// ── Fast clipboard formatter ──────────────────────────────────────────────────

/**
 * Converts a cell value to a plain string suitable for tab-separated clipboard
 * text.  Deliberately avoids `toLocaleString` with options — each call to
 * `toLocaleString({ … })` creates a temporary `Intl.NumberFormat` internally,
 * which is ~50–100× slower than `String(n)` for a clipboard dump.
 *
 * Numbers/dates land correctly in spreadsheets as plain strings.
 */
function fmt(val: unknown, desc: ColDesc): string {
  if (val == null) return '';
  switch (desc.type) {
    case 'number':
    case 'currency':
    case 'percentage':
      return String(val);
    case 'boolean':
      return val ? 'Yes' : 'No';
    case 'array':
      return Array.isArray(val) ? (val as unknown[]).join(', ') : String(val);
    case 'dropdown': {
      const label = desc.dropdownMap?.get(String(val));
      return label != null ? label : String(val);
    }
    default:
      return String(val);
  }
}

// ── Field resolver ────────────────────────────────────────────────────────────

function resolve(data: Record<string, unknown>, desc: ColDesc): unknown {
  if (!desc.nested) return data[desc.field];
  let cur: unknown = data;
  for (const part of desc.parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

// ── ClipboardEngine ───────────────────────────────────────────────────────────

export class ClipboardEngine {
  /** Internal fallback buffer used when clipboard-read permission is denied. */
  private clipboardBuffer: string[][] = [];

  /**
   * Copies the first cell range to the system clipboard as tab-separated text.
   * Also populates the internal buffer so paste works even when the browser
   * clipboard-read permission is denied.
   *
   * @param ranges          - Active cell ranges (only the first is used for copy)
   * @param rows            - All visible rows
   * @param columns         - All visible column definitions
   * @param withHeaders     - Include a header row in the copied text
   * @param leafGroupField  - Field name of the deepest grouping column; when
   *                          provided, leaf data rows include their group-field
   *                          value in the first (auto-group label) clipboard column
   */
  copyRangesToClipboard(
    ranges: CellRange[],
    rows: RowNode[],
    columns: ColumnDef[],
    withHeaders = false,
    leafGroupField?: string,
  ): Promise<void> {
    const { text, buffer } = this.buildRangeData(ranges, rows, columns, withHeaders, leafGroupField);
    this.clipboardBuffer = buffer;
    return this.writeToClipboard(text);
  }

  /**
   * Reads text from the system clipboard and returns it as a 2D string array.
   * Falls back to the internal buffer when clipboard-read is denied.
   */
  async pasteFromClipboard(): Promise<string[][]> {
    try {
      const text = await navigator.clipboard.readText();
      return this.parseClipboardText(text);
    } catch {
      return this.clipboardBuffer;
    }
  }

  /**
   * Copies selected rows (with headers) to the clipboard.
   * Used by row-selection mode rather than cell-range mode.
   *
   * @param selectedRows - Rows to copy
   * @param columns      - Column definitions
   */
  copyRowsToClipboard(selectedRows: RowNode[], columns: ColumnDef[]): Promise<void> {
    const descs = this.buildDescriptors(columns, 0, columns.length - 1);
    const lines: string[] = [columns.map((c) => c.header).join('\t')];
    for (const row of selectedRows) {
      const cells: string[] = new Array(descs.length);
      for (let i = 0; i < descs.length; i++) {
        cells[i] = fmt(resolve(row.data, descs[i]), descs[i]);
      }
      lines.push(cells.join('\t'));
    }
    return this.writeToClipboard(lines.join('\n'));
  }

  /**
   * Copies a single cell value to the clipboard.
   *
   * @param value - Cell value
   * @param col   - Column definition for type-aware formatting
   */
  copyCellValue(value: unknown, col: ColumnDef): Promise<void> {
    const desc = this.buildDescriptors([col], 0, 0)[0];
    return this.writeToClipboard(fmt(value, desc));
  }

  // ── Core build ──────────────────────────────────────────────────────────────

  /**
   * Builds the tab-separated clipboard text and the raw 2D string buffer in a
   * **single pass** over the row/column range.
   *
   * ### Performance strategy
   * - **Pre-compiled descriptors** — `ColDesc[]` is built once before the loop;
   *   each descriptor caches the split field path, column type, and a
   *   `Map<value→label>` for dropdown columns.  No `field.split('.')` or
   *   option-list `.find()` inside the hot cell loop.
   * - **Single pass** — text and 2D buffer are produced together, eliminating
   *   the previous approach of building text then calling `parseClipboardText`
   *   to re-split it back.
   * - **Fast formatter** — `String(n)` instead of `n.toLocaleString({…})`;
   *   the latter creates a temporary `Intl.NumberFormat` on every call.
   *
   * @param ranges      - Cell selection ranges
   * @param rows        - Visible rows
   * @param columns     - Visible column definitions
   * @param withHeaders - Include a header row
   */
  private buildRangeData(
    ranges: CellRange[],
    rows: RowNode[],
    columns: ColumnDef[],
    withHeaders: boolean,
    leafGroupField?: string,
  ): { text: string; buffer: string[][] } {
    if (ranges.length === 0) return { text: '', buffer: [] };

    // Multi-range (Ctrl+Click): bounding box with per-cell membership check.
    // Only rows that have at least one selected cell are emitted; cells inside
    // the bounding box but outside every range get an empty string.
    if (ranges.length > 1) {
      return this.buildMultiRangeData(ranges, rows, columns, withHeaders);
    }

    const range    = ranges[0];
    const startRow = Math.min(range.startRowIndex, range.endRowIndex);
    const endRow   = Math.max(range.startRowIndex, range.endRowIndex);
    const startCol = Math.min(range.startColIndex, range.endColIndex);
    const endCol   = Math.max(range.startColIndex, range.endColIndex);

    // colIndex −1 is the virtual auto-group label column.  When the selection
    // includes it, the group label text is placed in the first clipboard column
    // and regular column data is offset by one.
    const hasGroupLabel = startCol < 0;
    const dataStartCol  = hasGroupLabel ? 0 : startCol;

    // When selection is the group label cell only (endCol = −1) descs will be
    // empty; colCount = 1 gives a single-column clipboard row for the label.
    const descs    = endCol >= 0 ? this.buildDescriptors(columns, dataStartCol, endCol) : [];
    const dataCols = descs.length;
    const colCount = hasGroupLabel ? dataCols + 1 : dataCols;

    const lines:  string[]   = [];
    const buffer: string[][] = [];

    if (withHeaders && colCount > 0) {
      const hdr: string[] = new Array(colCount);
      const hdrOffset = hasGroupLabel ? 1 : 0;
      if (hasGroupLabel) hdr[0] = 'Group';
      for (let i = 0; i < dataCols; i++) {
        hdr[i + hdrOffset] = columns[dataStartCol + i]?.header ?? '';
      }
      lines.push(hdr.join('\t'));
    }

    for (let r = startRow; r <= endRow; r++) {
      const row = rows[r];
      if (!row) continue;
      // Skip group/footer rows with no agg values when the group-label column
      // is not selected (data-only range — these rows carry no useful data).
      const isGroupLike = row.type === 'group' || row.type === 'group-footer';
      if (isGroupLike && !hasGroupLabel && !row.aggregatedValues) continue;
      if (!isGroupLike && row.type !== 'data') continue;

      const cells = new Array<string>(colCount).fill('');
      const offset = hasGroupLabel ? 1 : 0;

      // First column: group/footer label text for group-like rows; leaf group
      // field value for data rows (shown in the auto-group cell they display).
      if (hasGroupLabel) {
        if (isGroupLike) {
          cells[0] = String(row.groupValue ?? '');
        } else if (row.type === 'data' && leafGroupField) {
          const v = row.data[leafGroupField];
          cells[0] = v != null ? String(v) : '';
        }
      }

      if (row.type === 'data') {
        const data = row.data;
        for (let i = 0; i < dataCols; i++) {
          cells[i + offset] = fmt(resolve(data, descs[i]), descs[i]);
        }
      } else if (isGroupLike && row.aggregatedValues) {
        const aggVals = row.aggregatedValues;
        for (let i = 0; i < dataCols; i++) {
          const col = columns[dataStartCol + i];
          if (col && (col.type === 'currency' || col.type === 'number') && col.aggFunc != null) {
            const v = aggVals[col.field];
            cells[i + offset] = v != null ? String(v) : '';
          }
          // Non-agg columns already initialised to '' by .fill('') above.
        }
      }
      // Group/footer with no aggValues: cells stay '' except for the label.

      lines.push(cells.join('\t'));
      buffer.push(cells);
    }

    return { text: lines.join('\n'), buffer };
  }

  /**
   * Builds clipboard data for Ctrl+Click multi-range selections.
   *
   * The output spans the bounding box of all ranges; cells that fall inside
   * the bounding box but belong to no range get an empty string.  Rows that
   * have no selected cell in any range are skipped entirely so the clipboard
   * stays compact.
   *
   * @param ranges      - Two or more cell ranges (Ctrl+Click selections).
   * @param rows        - Visible rows.
   * @param columns     - Visible column definitions.
   * @param withHeaders - Include a header row.
   */
  private buildMultiRangeData(
    ranges: CellRange[],
    rows: RowNode[],
    columns: ColumnDef[],
    withHeaders: boolean,
  ): { text: string; buffer: string[][] } {
    // Normalise all ranges and compute the bounding box (skip group-label cols < 0).
    const norms = ranges.map((r) => ({
      startRowIndex: Math.min(r.startRowIndex, r.endRowIndex),
      endRowIndex:   Math.max(r.startRowIndex, r.endRowIndex),
      startColIndex: Math.max(0, Math.min(r.startColIndex, r.endColIndex)),
      endColIndex:   Math.max(r.startColIndex, r.endColIndex),
    }));

    const startRow = Math.min(...norms.map((n) => n.startRowIndex));
    const endRow   = Math.max(...norms.map((n) => n.endRowIndex));
    const startCol = Math.max(0, Math.min(...norms.map((n) => n.startColIndex)));
    const endCol   = Math.max(...norms.map((n) => n.endColIndex));

    if (endCol < 0) return { text: '', buffer: [] };

    const descs    = this.buildDescriptors(columns, startCol, endCol);
    const colCount = descs.length;
    const lines:  string[]   = [];
    const buffer: string[][] = [];

    if (withHeaders && colCount > 0) {
      lines.push(descs.map((_, i) => columns[startCol + i]?.header ?? '').join('\t'));
    }

    for (let r = startRow; r <= endRow; r++) {
      const row = rows[r];
      if (!row || row.type !== 'data') continue;

      // Skip rows where no range has a selected cell.
      const rowSelected = norms.some((n) => r >= n.startRowIndex && r <= n.endRowIndex);
      if (!rowSelected) continue;

      const cells = new Array<string>(colCount).fill('');
      for (let ci = 0; ci < colCount; ci++) {
        const c = startCol + ci;
        const inRange = norms.some(
          (n) =>
            r >= n.startRowIndex && r <= n.endRowIndex &&
            c >= n.startColIndex && c <= n.endColIndex,
        );
        if (inRange) cells[ci] = fmt(resolve(row.data, descs[ci]), descs[ci]);
      }
      lines.push(cells.join('\t'));
      buffer.push(cells);
    }

    return { text: lines.join('\n'), buffer };
  }

  // ── Descriptor builder ─────────────────────────────────────────────────────

  /**
   * Compiles `ColDesc` objects for columns `[startCol, endCol]` inclusive.
   * Called once per copy operation — never inside the row loop.
   */
  private buildDescriptors(columns: ColumnDef[], startCol: number, endCol: number): ColDesc[] {
    const descs: ColDesc[] = [];
    for (let c = startCol; c <= endCol; c++) {
      const col = columns[c];
      if (!col) continue;

      let dropdownMap: Map<string, string> | null = null;
      if (col.type === 'dropdown' && col.dropdownOptions?.length) {
        dropdownMap = new Map(col.dropdownOptions.map((o) => [String(o.value), o.label]));
      }

      descs.push({
        field:       col.field,
        parts:       col.field.split('.'),
        nested:      col.field.includes('.'),
        type:        col.type ?? 'string',
        dropdownMap,
      });
    }
    return descs;
  }

  // ── Paste helper ───────────────────────────────────────────────────────────

  /**
   * Splits tab-separated clipboard text into a 2D string array.
   * Used only on paste (not on copy — the buffer is built directly).
   */
  private parseClipboardText(text: string): string[][] {
    return text
      .split('\n')
      .map((line) => line.split('\t').map((cell) => cell.trim()));
  }

  // ── Write ───────────────────────────────────────────────────────────────────

  private writeToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).catch(() => this.execCommandCopy(text));
    }
    return Promise.resolve(this.execCommandCopy(text));
  }

  private execCommandCopy(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(ta);
  }
}
