/**
 * Classic Levenshtein edit distance (insertions + deletions + substitutions)
 * between two strings. Single-row dynamic programming — O(n*m) time, O(min(n,m)) space.
 */
export declare function levenshteinDistance(a: string, b: string): number;
/**
 * Normalized similarity in `[0, 1]` — `1` for identical strings, `0` for
 * completely dissimilar ones. Used to fuzzy-match typos in column names
 * (e.g. "salery" vs "salary") without pulling in an external library.
 */
export declare function similarity(a: string, b: string): number;
//# sourceMappingURL=fuzzy-match.d.ts.map