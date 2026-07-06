import type { CellRange } from '../types/grid.types';
export interface NormalizedRange {
    startRowIndex: number;
    endRowIndex: number;
    startColIndex: number;
    endColIndex: number;
}
export declare function normalizeRange(range: CellRange): NormalizedRange;
export declare function isCellInRanges(rowIndex: number, colIndex: number, ranges: CellRange[]): boolean;
export declare function rangesEqual(a: CellRange, b: CellRange): boolean;
export declare function mergeRanges(ranges: CellRange[]): CellRange;
export declare function getCellsInRange(range: CellRange): Array<{
    rowIndex: number;
    colIndex: number;
}>;
//# sourceMappingURL=selection-range.d.ts.map