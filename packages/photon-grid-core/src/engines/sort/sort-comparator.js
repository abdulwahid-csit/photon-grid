// ── Collator singleton ────────────────────────────────────────────────────────
// `Intl.Collator` created once at module load time is ~10× faster than calling
// `String.prototype.localeCompare(other, locale, options)` on every comparison
// because the options object does not need to be parsed on each invocation.
const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
// ── Value coercion helpers ────────────────────────────────────────────────────
function toNumber(value) {
    if (value == null || value === '')
        return NaN;
    const n = Number(value);
    return isNaN(n) ? NaN : n;
}
function toDate(value) {
    if (value instanceof Date)
        return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? NaN : d.getTime();
    }
    return NaN;
}
// ── Comparators ───────────────────────────────────────────────────────────────
/**
 * Case-insensitive, locale-aware string comparator.
 * Uses a module-level `Intl.Collator` singleton with `numeric:true` so that
 * "10" sorts after "9" rather than before it.
 * Null / undefined / empty strings are always sorted to the bottom.
 */
export const stringComparator = (a, b) => {
    const sa = a == null ? '' : String(a);
    const sb = b == null ? '' : String(b);
    if (sa === sb)
        return 0;
    if (sa === '')
        return 1;
    if (sb === '')
        return -1;
    return COLLATOR.compare(sa, sb);
};
/**
 * Numeric comparator for `number`, `currency`, and `percentage` column types.
 * NaN / null / undefined values are pushed to the bottom in both directions.
 */
export const numberComparator = (a, b) => {
    const na = toNumber(a);
    const nb = toNumber(b);
    if (isNaN(na) && isNaN(nb))
        return 0;
    if (isNaN(na))
        return 1;
    if (isNaN(nb))
        return -1;
    return na - nb;
};
/**
 * Date / time comparator.  Accepts `Date` objects, ISO strings, and numeric
 * timestamps.  Invalid / null dates are sorted to the bottom.
 */
export const dateComparator = (a, b) => {
    const da = toDate(a);
    const db = toDate(b);
    if (isNaN(da) && isNaN(db))
        return 0;
    if (isNaN(da))
        return 1;
    if (isNaN(db))
        return -1;
    return da - db;
};
/**
 * Boolean comparator.  `false` sorts before `true` in ascending order.
 */
export const booleanComparator = (a, b) => (a ? 1 : 0) - (b ? 1 : 0);
// ── Factory ───────────────────────────────────────────────────────────────────
/**
 * Returns the appropriate comparator function for a given column type.
 * All returned functions are module-level singletons — no allocation per call.
 *
 * @param type - Column `type` field (e.g. `'string'`, `'number'`, `'date'`)
 */
export function getComparator(type) {
    switch (type) {
        case 'number':
        case 'currency':
        case 'percentage':
            return numberComparator;
        case 'date':
        case 'time':
            return dateComparator;
        case 'boolean':
            return booleanComparator;
        default:
            return stringComparator;
    }
}
/**
 * Builds a multi-key comparator from an array of sort descriptors.
 * Used internally by the sort engine for multi-column sorts against
 * pre-extracted key-value maps.
 *
 * @param comparators - Ordered list of sort column descriptors
 */
export function multiKeyComparator(comparators) {
    return (a, b) => {
        for (const { key, compareFn, direction } of comparators) {
            const result = compareFn(a[key], b[key]) * direction;
            if (result !== 0)
                return result;
        }
        return 0;
    };
}
//# sourceMappingURL=sort-comparator.js.map