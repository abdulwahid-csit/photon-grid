/**
 * The seam between the Summary Row feature and the grid.
 *
 * {@link SummaryService} depends on this interface and nothing else, which is
 * what keeps the whole feature framework-agnostic and unit-testable: a spec
 * supplies a plain object literal, and `GridCore` supplies one backed by the
 * live grid context. Mirrors the port pattern already used by the Formula
 * Engine (`FormulaGridAdapter`).
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../types/column.types';
import type { RowNode } from '../types/row.types';
import type { FormatOptions } from '../engines/editing/value-parser';

/**
 * Everything the summary calculation needs to read from the grid.
 *
 * Every method is a **pull**: the service calls them only for the scopes its
 * rows actually request, so a grid whose summaries are all
 * {@link SummaryScope.Filtered} never resolves the selection, and one with no
 * summary rows never calls any of them.
 */
export interface SummaryDataPort {
  /** Every row in the data set, ignoring filters, sorting and pagination. */
  getAllRows(): readonly RowNode[];

  /**
   * Rows surviving the active column filters and quick filter, before
   * pagination and grouping.
   *
   * Implementations should return the *same array reference* as
   * {@link getAllRows} when no filter is active, so the service can skip work.
   */
  getFilteredRows(): readonly RowNode[];

  /** The rows currently published for display, including group and detail rows. */
  getVisibleRows(): readonly RowNode[];

  /** The currently selected rows. */
  getSelectedRows(): readonly RowNode[];

  /** The grid's current leaf columns, in display order, including hidden ones. */
  getColumns(): readonly ColumnDef[];

  /** The public grid API, passed through to host callbacks. */
  getApi(): unknown;

  /** Locale / currency / date options used when formatting aggregate values. */
  getFormatOptions(): FormatOptions;
}
