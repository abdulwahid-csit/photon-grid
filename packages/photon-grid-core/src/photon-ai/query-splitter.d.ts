/**
 * Splits one raw prompt into independently-executable clauses so a single
 * compound sentence can drive multiple grid commands in one submission
 * (e.g. *"hide the id column, sort by price descending and group by
 * category"* → three clauses). Punctuation (`,`/`;`) and connector words
 * ("and", "then", "also", "plus") are only treated as a split point when the
 * word(s) immediately following are recognized as a *different* command's
 * verb (from `verbs`, typically every registered intent's leading alias
 * word) — otherwise they're kept as part of the current clause, since they
 * more likely mean "and also this column" (e.g. "pin price and income", or
 * "unpin status, income and year") rather than "and now do something else".
 *
 * Two additional guards keep genuinely ambiguous cases from mis-splitting:
 * a connector inside a "between X and Y" range is never a split point, and
 * "select and copy/cut ..." is always kept whole (see
 * {@link NEVER_SPLIT_AFTER}), since those verbs share one implicit target
 * rather than describing two unrelated actions.
 *
 * @param verbs - Canonicalized (see {@link canonicalizeWord}) leading verb words for every registered intent, e.g. `{"pin", "sort", "filter", "group", ...}`.
 */
export declare function splitClauses(raw: string, verbs: ReadonlySet<string>): string[];
//# sourceMappingURL=query-splitter.d.ts.map