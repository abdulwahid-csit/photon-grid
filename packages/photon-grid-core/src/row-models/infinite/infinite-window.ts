/**
 * Pure geometry for the Infinite Row Model: turning a scroll position into the
 * set of pages that must be resident.
 *
 * Isolated from the strategy because it is the part most likely to be wrong at
 * the edges (the last partial page, a viewport taller than the dataset, a zero
 * row count) and the part most cheaply proven correct in isolation. No DOM, no
 * grid, no async.
 *
 * @packageDocumentation
 */

/** The pages a given scroll position requires. */
export interface PageWindow {
  /** First page overlapping the viewport. */
  readonly firstVisiblePage: number;
  /** Last page overlapping the viewport, inclusive. */
  readonly lastVisiblePage: number;
  /** First page to keep resident, including prefetch. */
  readonly firstPage: number;
  /** Last page to keep resident, inclusive, including prefetch. */
  readonly lastPage: number;
}

/** Inputs describing which rows are being rendered. */
export interface PageWindowParams {
  /** First row index the renderer is showing, inclusive. */
  readonly startRow: number;
  /** Row index the renderer stops at, exclusive. */
  readonly endRow: number;
  /** Total rows in the dataset. */
  readonly totalRows: number;
  /** Rows per page. */
  readonly pageSize: number;
  /** Pages to keep resident on each side of the rendered range. */
  readonly preloadPages: number;
}

/**
 * Zero-based page index containing a row.
 *
 * @param rowIndex - Row index; negative values clamp to page 0.
 * @param pageSize - Rows per page; values below 1 are treated as 1.
 */
export function pageOfRow(rowIndex: number, pageSize: number): number {
  const size = Math.max(1, pageSize);
  return Math.max(0, Math.floor(rowIndex / size));
}

/**
 * First row index a page covers.
 *
 * @param page     - Zero-based page index.
 * @param pageSize - Rows per page.
 */
export function pageStartRow(page: number, pageSize: number): number {
  return Math.max(0, page) * Math.max(1, pageSize);
}

/**
 * Number of pages needed to cover a dataset.
 *
 * @param totalRows - Total rows.
 * @param pageSize  - Rows per page.
 * @returns `0` for an empty dataset, so callers can skip fetching entirely.
 */
export function pageCount(totalRows: number, pageSize: number): number {
  if (totalRows <= 0) return 0;
  return Math.ceil(totalRows / Math.max(1, pageSize));
}

/**
 * Computes which pages the rendered row range needs.
 *
 * Takes the row range the renderer already derived rather than re-deriving it
 * from scroll geometry: the renderer is the authority on what is on screen, and
 * asking it removes a second copy of the virtualisation maths that could drift.
 * The result is O(1) regardless of dataset size, which is what keeps scrolling a
 * million rows as cheap as scrolling a hundred.
 *
 * All indices are clamped to the dataset, so the last page is never over-read
 * and an empty dataset yields an empty, self-consistent window.
 *
 * @param params - Rendered row range, dataset size and paging configuration.
 * @returns The visible page range and the wider range to keep resident.
 */
export function computePageWindow(params: PageWindowParams): PageWindow {
  const { startRow, endRow, totalRows, pageSize, preloadPages } = params;

  const total = pageCount(totalRows, pageSize);
  if (total === 0) {
    return { firstVisiblePage: 0, lastVisiblePage: -1, firstPage: 0, lastPage: -1 };
  }

  const lastRow = Math.max(0, totalRows - 1);
  const firstRow = clamp(startRow, 0, lastRow);
  // `endRow` is exclusive, so the last row actually shown is one before it.
  const bottomRow = clamp(endRow - 1, firstRow, lastRow);

  const firstVisiblePage = pageOfRow(firstRow, pageSize);
  const lastVisiblePage = pageOfRow(bottomRow, pageSize);

  return {
    firstVisiblePage,
    lastVisiblePage,
    firstPage: clamp(firstVisiblePage - preloadPages, 0, total - 1),
    lastPage: clamp(lastVisiblePage + preloadPages, 0, total - 1),
  };
}

/**
 * Expands a page range into its page indices.
 *
 * @param first - First page, inclusive.
 * @param last  - Last page, inclusive. A value below `first` yields no pages.
 */
export function pagesInRange(first: number, last: number): number[] {
  const out: number[] = [];
  for (let page = Math.max(0, first); page <= last; page++) out.push(page);
  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
