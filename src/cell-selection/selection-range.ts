import type { CellRange } from '../types/grid.types';

export interface NormalizedRange {
  startRowIndex: number;
  endRowIndex: number;
  startColIndex: number;
  endColIndex: number;
}

export function normalizeRange(range: CellRange): NormalizedRange {
  return {
    startRowIndex: Math.min(range.startRowIndex, range.endRowIndex),
    endRowIndex: Math.max(range.startRowIndex, range.endRowIndex),
    startColIndex: Math.min(range.startColIndex, range.endColIndex),
    endColIndex: Math.max(range.startColIndex, range.endColIndex),
  };
}

export function isCellInRanges(
  rowIndex: number,
  colIndex: number,
  ranges: CellRange[],
): boolean {
  for (const range of ranges) {
    const n = normalizeRange(range);
    if (
      rowIndex >= n.startRowIndex &&
      rowIndex <= n.endRowIndex &&
      colIndex >= n.startColIndex &&
      colIndex <= n.endColIndex
    ) {
      return true;
    }
  }
  return false;
}

export function rangesEqual(a: CellRange, b: CellRange): boolean {
  return (
    a.startRowIndex === b.startRowIndex &&
    a.endRowIndex === b.endRowIndex &&
    a.startColIndex === b.startColIndex &&
    a.endColIndex === b.endColIndex
  );
}

export function mergeRanges(ranges: CellRange[]): CellRange {
  if (ranges.length === 0) {
    return { startRowIndex: 0, endRowIndex: 0, startColIndex: 0, endColIndex: 0 };
  }
  return {
    startRowIndex: Math.min(...ranges.map((r) => Math.min(r.startRowIndex, r.endRowIndex))),
    endRowIndex: Math.max(...ranges.map((r) => Math.max(r.startRowIndex, r.endRowIndex))),
    startColIndex: Math.min(...ranges.map((r) => Math.min(r.startColIndex, r.endColIndex))),
    endColIndex: Math.max(...ranges.map((r) => Math.max(r.startColIndex, r.endColIndex))),
  };
}

export function getCellsInRange(range: CellRange): Array<{ rowIndex: number; colIndex: number }> {
  const n = normalizeRange(range);
  const cells: Array<{ rowIndex: number; colIndex: number }> = [];
  for (let r = n.startRowIndex; r <= n.endRowIndex; r++) {
    for (let c = n.startColIndex; c <= n.endColIndex; c++) {
      cells.push({ rowIndex: r, colIndex: c });
    }
  }
  return cells;
}
