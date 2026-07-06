/** A function that returns negative / zero / positive like `Array.prototype.sort`. */
export type ComparatorFn = (a: unknown, b: unknown) => number;
/**
 * Case-insensitive, locale-aware string comparator.
 * Uses a module-level `Intl.Collator` singleton with `numeric:true` so that
 * "10" sorts after "9" rather than before it.
 * Null / undefined / empty strings are always sorted to the bottom.
 */
export declare const stringComparator: ComparatorFn;
/**
 * Numeric comparator for `number`, `currency`, and `percentage` column types.
 * NaN / null / undefined values are pushed to the bottom in both directions.
 */
export declare const numberComparator: ComparatorFn;
/**
 * Date / time comparator.  Accepts `Date` objects, ISO strings, and numeric
 * timestamps.  Invalid / null dates are sorted to the bottom.
 */
export declare const dateComparator: ComparatorFn;
/**
 * Boolean comparator.  `false` sorts before `true` in ascending order.
 */
export declare const booleanComparator: ComparatorFn;
/**
 * Returns the appropriate comparator function for a given column type.
 * All returned functions are module-level singletons — no allocation per call.
 *
 * @param type - Column `type` field (e.g. `'string'`, `'number'`, `'date'`)
 */
export declare function getComparator(type: string): ComparatorFn;
/**
 * Builds a multi-key comparator from an array of sort descriptors.
 * Used internally by the sort engine for multi-column sorts against
 * pre-extracted key-value maps.
 *
 * @param comparators - Ordered list of sort column descriptors
 */
export declare function multiKeyComparator(comparators: Array<{
    key: string;
    compareFn: ComparatorFn;
    direction: 1 | -1;
}>): (a: Record<string, unknown>, b: Record<string, unknown>) => number;
//# sourceMappingURL=sort-comparator.d.ts.map