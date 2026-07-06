import type { RowNode } from '../../types/row.types';
import type { SortConfig } from '../../types/grid.types';
import type { ColumnDef } from '../../types/column.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
export declare class SortEngine {
    private store;
    private eventBus;
    private sortConfig;
    constructor(store: GridStore, eventBus: EventBus);
    /**
     * Sets a single-column sort and emits `SORT_CHANGED`.
     *
     * @param colId - Column identifier
     * @param field - Data field path (dot-notation supported)
     * @param order - `'asc'` or `'desc'`
     */
    sort(colId: string, field: string, order: 'asc' | 'desc'): void;
    /**
     * Replaces the entire sort configuration with a multi-column spec and emits
     * `SORT_CHANGED` using the last entry as the "active" column.
     *
     * @param configs - Ordered sort descriptors (primary → secondary → …)
     */
    multiSort(configs: SortConfig[]): void;
    /** Removes all active sort columns. */
    clearSort(): void;
    /**
     * Removes the sort configuration for a single column without affecting others.
     *
     * @param colId - Column to remove from the sort config
     */
    clearColumnSort(colId: string): void;
    /**
     * Sorts `rows` according to the current sort configuration and returns a new
     * sorted array.  Returns the original array reference when no sort is active.
     *
     * ### Performance strategy (Schwartzian transform + index sort)
     * For large datasets the naive approach of resolving nested field paths inside
     * the comparator function is O(n log n × pathDepth × keyCount).  Instead:
     *
     * 1. **Extract** all sort-key values for every row in a single O(n) pass into
     *    a flat 2-D array `vals[rowIdx][keyIdx]`.  No objects are created here —
     *    just raw value reads.
     * 2. **Sort** a compact `Int32Array` of row indices.  The comparator reads
     *    pre-extracted values by index — zero allocation, zero property resolution.
     * 3. **Reconstruct** the final array by mapping sorted indices back to rows.
     *
     * This reduces per-comparison cost from O(pathDepth × keyCount) to O(keyCount)
     * pure comparisons, giving roughly 20–50× speedup on 1M rows for typical
     * single-column sorts.
     *
     * @param rows    - Input rows (filtered, not yet paged)
     * @param columns - All visible column definitions (used to resolve comparators)
     * @returns New sorted array; original is not mutated.
     */
    applySorting(rows: RowNode[], columns: ColumnDef[]): RowNode[];
    /** Returns a copy of the current sort configuration. */
    getSortConfig(): SortConfig[];
    /**
     * Returns the current sort direction for a column, or `null` if unsorted.
     *
     * @param colId - Column identifier to query
     */
    isSorted(colId: string): 'asc' | 'desc' | null;
}
//# sourceMappingURL=sort-engine.d.ts.map