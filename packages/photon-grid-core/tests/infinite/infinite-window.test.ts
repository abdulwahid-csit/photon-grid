import { describe, it, expect } from 'vitest';

import {
  computePageWindow,
  pageCount,
  pageOfRow,
  pageStartRow,
  pagesInRange,
} from '../../src/row-models/infinite/infinite-window';

/**
 * Contract for the Infinite Row Model's page geometry.
 *
 * This is the arithmetic that decides what gets fetched, so its edges matter
 * more than its middle: the final partial page, a viewport taller than the
 * dataset, an empty dataset, and clamping at both ends. Getting any of these
 * wrong means either over-reading past the last row or leaving a band of rows
 * that never loads.
 */

describe('page arithmetic', () => {
  it('maps a row to its page', () => {
    expect(pageOfRow(0, 100)).toBe(0);
    expect(pageOfRow(99, 100)).toBe(0);
    expect(pageOfRow(100, 100)).toBe(1);
    expect(pageOfRow(250, 100)).toBe(2);
  });

  it('clamps a negative row to the first page', () => {
    expect(pageOfRow(-5, 100)).toBe(0);
  });

  it('treats a page size below 1 as 1 rather than dividing by zero', () => {
    expect(pageOfRow(7, 0)).toBe(7);
    expect(Number.isFinite(pageOfRow(7, 0))).toBe(true);
  });

  it('maps a page to its first row', () => {
    expect(pageStartRow(0, 100)).toBe(0);
    expect(pageStartRow(3, 100)).toBe(300);
  });

  it('counts the pages covering a dataset, including a partial last one', () => {
    expect(pageCount(1000, 100)).toBe(10);
    expect(pageCount(1001, 100)).toBe(11);
    expect(pageCount(1, 100)).toBe(1);
  });

  it('reports no pages for an empty dataset', () => {
    expect(pageCount(0, 100)).toBe(0);
  });

  it('expands a page range', () => {
    expect(pagesInRange(2, 4)).toEqual([2, 3, 4]);
    expect(pagesInRange(3, 3)).toEqual([3]);
  });

  it('yields nothing for an inverted or empty range', () => {
    expect(pagesInRange(4, 2)).toEqual([]);
    expect(pagesInRange(0, -1)).toEqual([]);
  });
});

describe('computePageWindow', () => {
  const base = { totalRows: 1000, pageSize: 100, preloadPages: 1 };

  it('resolves the pages a rendered range sits on', () => {
    const w = computePageWindow({ ...base, startRow: 0, endRow: 30 });
    expect(w.firstVisiblePage).toBe(0);
    expect(w.lastVisiblePage).toBe(0);
  });

  it('spans several pages when the range crosses a boundary', () => {
    const w = computePageWindow({ ...base, startRow: 90, endRow: 210 });
    expect(w.firstVisiblePage).toBe(0);
    expect(w.lastVisiblePage).toBe(2);
  });

  it('treats endRow as exclusive', () => {
    // Rows 0..99 — exactly page 0, not spilling into page 1.
    const w = computePageWindow({ ...base, startRow: 0, endRow: 100 });
    expect(w.lastVisiblePage).toBe(0);
  });

  it('widens the resident range by the preload count', () => {
    const w = computePageWindow({ ...base, startRow: 300, endRow: 340, preloadPages: 2 });
    expect(w.firstVisiblePage).toBe(3);
    expect(w.lastVisiblePage).toBe(3);
    expect(w.firstPage).toBe(1);
    expect(w.lastPage).toBe(5);
  });

  it('does not prefetch when preloadPages is zero', () => {
    const w = computePageWindow({ ...base, startRow: 300, endRow: 340, preloadPages: 0 });
    expect(w.firstPage).toBe(3);
    expect(w.lastPage).toBe(3);
  });

  it('clamps preload at the start of the dataset', () => {
    const w = computePageWindow({ ...base, startRow: 0, endRow: 40, preloadPages: 3 });
    expect(w.firstPage).toBe(0);
  });

  it('clamps preload at the end of the dataset', () => {
    const w = computePageWindow({ ...base, startRow: 960, endRow: 1000, preloadPages: 3 });
    expect(w.lastPage).toBe(9);          // 1000 rows / 100 = pages 0..9
  });

  it('never reads past the final partial page', () => {
    // 1005 rows → pages 0..10, the last holding 5 rows.
    const w = computePageWindow({
      totalRows: 1005, pageSize: 100, preloadPages: 2, startRow: 1000, endRow: 1005,
    });
    expect(w.lastVisiblePage).toBe(10);
    expect(w.lastPage).toBe(10);
  });

  it('clamps a range that runs past the dataset', () => {
    // The renderer's buffer can ask for rows beyond the end.
    const w = computePageWindow({ ...base, startRow: 980, endRow: 1200 });
    expect(w.lastVisiblePage).toBe(9);
  });

  it('handles a viewport taller than the whole dataset', () => {
    const w = computePageWindow({
      totalRows: 30, pageSize: 100, preloadPages: 1, startRow: 0, endRow: 500,
    });
    expect(w.firstVisiblePage).toBe(0);
    expect(w.lastVisiblePage).toBe(0);
    expect(w.firstPage).toBe(0);
    expect(w.lastPage).toBe(0);
  });

  it('returns an empty window for an empty dataset', () => {
    const w = computePageWindow({ ...base, totalRows: 0, startRow: 0, endRow: 40 });
    expect(w.lastPage).toBeLessThan(w.firstPage);
    expect(pagesInRange(w.firstPage, w.lastPage)).toEqual([]);
  });

  it('produces a self-consistent window for a degenerate range', () => {
    const w = computePageWindow({ ...base, startRow: 500, endRow: 500 });
    expect(w.firstVisiblePage).toBe(5);
    expect(w.lastVisiblePage).toBe(5);
  });

  it('keeps the resident range O(1) regardless of dataset size', () => {
    const small = computePageWindow({ ...base, totalRows: 1_000, startRow: 500, endRow: 540 });
    const huge = computePageWindow({ ...base, totalRows: 10_000_000, startRow: 500, endRow: 540 });

    // Ten million rows resolve to the same handful of pages as one thousand.
    expect(pagesInRange(huge.firstPage, huge.lastPage))
      .toEqual(pagesInRange(small.firstPage, small.lastPage));
  });
});
