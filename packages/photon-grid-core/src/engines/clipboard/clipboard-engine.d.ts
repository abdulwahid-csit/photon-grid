import type { CellRange } from '../../types/grid.types';
import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
export declare class ClipboardEngine {
    /** Internal fallback buffer used when clipboard-read permission is denied. */
    private clipboardBuffer;
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
    copyRangesToClipboard(ranges: CellRange[], rows: RowNode[], columns: ColumnDef[], withHeaders?: boolean, leafGroupField?: string): Promise<void>;
    /**
     * Reads text from the system clipboard and returns it as a 2D string array.
     * Falls back to the internal buffer when clipboard-read is denied.
     */
    pasteFromClipboard(): Promise<string[][]>;
    /**
     * Copies selected rows (with headers) to the clipboard.
     * Used by row-selection mode rather than cell-range mode.
     *
     * @param selectedRows - Rows to copy
     * @param columns      - Column definitions
     */
    copyRowsToClipboard(selectedRows: RowNode[], columns: ColumnDef[]): Promise<void>;
    /**
     * Copies a single cell value to the clipboard.
     *
     * @param value - Cell value
     * @param col   - Column definition for type-aware formatting
     */
    copyCellValue(value: unknown, col: ColumnDef): Promise<void>;
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
    private buildRangeData;
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
    private buildMultiRangeData;
    /**
     * Compiles `ColDesc` objects for columns `[startCol, endCol]` inclusive.
     * Called once per copy operation — never inside the row loop.
     */
    private buildDescriptors;
    /**
     * Splits tab-separated clipboard text into a 2D string array.
     * Used only on paste (not on copy — the buffer is built directly).
     */
    private parseClipboardText;
    private writeToClipboard;
    private execCommandCopy;
}
//# sourceMappingURL=clipboard-engine.d.ts.map