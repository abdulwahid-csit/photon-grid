import { canonicalizeWord } from './text-normalizer';
/** Words that *can* introduce a new clause in a compound sentence — but only when what follows is actually a new action (see {@link splitClauses}). */
const SOFT_CONNECTORS = new Set([',', 'and', 'then', 'also', 'plus']);
/**
 * A connector is *not* a split point when the clause-so-far already contains
 * a range word ("between"/"from") — e.g. "filter salary between 4000 and
 * 8000" must keep "and" as part of the range, not split it in half.
 */
const RANGE_PREFIXES = new Set(['between', 'from']);
/**
 * "select and copy/cut" is idiomatically one action ("select, then copy
 * what's selected"), not two independent commands sharing no context — so a
 * bare "select"/"deselect" clause-so-far never splits, regardless of what
 * verb follows. Every other verb pairing splits normally.
 */
const NEVER_SPLIT_AFTER = new Set(['select', 'deselect']);
/**
 * Only the word *immediately* after a connector is checked — not a wider
 * window. A 2+ word lookahead sounds like it'd also catch "and then group by
 * X", but with the built-in Q&A intents' generic leading alias words ("row",
 * "column", "count", "which", "what", …) in `verbs`, a wider window false-
 * -positives constantly: "unpin status, income and year columns" would spot
 * "columns" two words after "and" and wrongly split before "year". "and
 * then X" still splits correctly with a 1-word window — "then" is itself a
 * connector, so it gets its own immediate-next-word check on the following
 * loop iteration.
 */
function isUpcomingVerb(words, atIndex, verbs) {
    return atIndex < words.length && verbs.has(canonicalizeWord(words[atIndex]));
}
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
export function splitClauses(raw, verbs) {
    const spaced = raw.replace(/[,;]+/g, ' , ');
    const words = spaced.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0)
        return [];
    const clauses = [];
    let current = [];
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const lower = word.toLowerCase();
        const isComma = lower === ',';
        if (!isComma && !SOFT_CONNECTORS.has(lower)) {
            current.push(word);
            continue;
        }
        const inRangeContext = current.some((w) => RANGE_PREFIXES.has(w.toLowerCase()));
        const currentIsNeverSplit = current.length === 1 && NEVER_SPLIT_AFTER.has(canonicalizeWord(current[0]));
        const nextIsVerb = isUpcomingVerb(words, i + 1, verbs);
        if (current.length > 0 && !inRangeContext && !currentIsNeverSplit && nextIsVerb) {
            clauses.push(current.join(' '));
            current = [];
        }
        else if (!isComma) {
            current.push(word);
        }
    }
    if (current.length > 0)
        clauses.push(current.join(' '));
    return clauses.length > 0 ? clauses : [raw.trim()];
}
//# sourceMappingURL=query-splitter.js.map