/**
 * Words stripped before intent matching: conversational filler ("hey",
 * "please"), the assistant's own name, common function/linking words, and
 * connector words that natural sentences use but that carry no command
 * meaning on their own (e.g. "whose", "who", "is", "are"). Intentionally
 * broad — `IntentParser`'s alias matching only requires a phrase's *own*
 * keywords to be present, so over-stripping here is safe; it can never
 * remove a word an alias needs, since alias keywords (e.g. "sort", "left",
 * "hide") are never in this list.
 */
const FILLER_WORDS = new Set([
    'hi', 'hello', 'hey', 'please', 'can', 'could', 'would', 'you', 'quickly', 'thanks', 'thank',
    'photon', 'ai', 'assistant',
    // Deliberately NOT "of" — it's stripped everywhere else, but it's also a
    // real word inside dropdown/enum option labels ("Out of Stock", "Point of
    // Sale"); stripping it from the user's query but not from the option
    // label being matched against would make those options unmatchable.
    'to', 'the', 'a', 'an', 'in', 'on', 'at', 'is', 'are', 'was', 'were', 'be', 'me', 'my',
    'side', 'now', 'just',
    'them', 'it', 'their', 'order', 'whose', 'who', 'that', 'with', 'having',
    'value', 'currently', 'kindly', 'want', 'need', 'like', 'this', 'these',
]);
/**
 * Canonicalizes synonyms down to the single keyword every `IntentDefinition`
 * alias is actually written against, so a feature only has to declare one
 * spelling (e.g. `"clear"`) while users can type any of several equivalent
 * words (e.g. "reset", "erase", "wipe"). Applied per-word, after stemming.
 */
const SYNONYMS = new Map([
    ['reset', 'clear'],
    ['erase', 'clear'],
    ['wipe', 'clear'],
    ['delete', 'remove'],
    ['drop', 'remove'],
    ['freeze', 'pin'],
    ['unfreeze', 'unpin'],
    ['display', 'show'],
    ['reveal', 'show'],
    ['everything', 'all'],
    ['every', 'all'],
    ['entire', 'all'],
    ['ascend', 'ascending'],
    ['descend', 'descending'],
    ['increasing', 'ascending'],
    ['decreasing', 'descending'],
    ['newest', 'descending'],
    ['oldest', 'ascending'],
    ['biggest', 'largest'],
    ['smaller', 'smallest'],
    ['bigger', 'largest'],
    ['grouping', 'group'],
    ['filtering', 'filter'],
    ['sorting', 'sort'],
    ['hiding', 'hide'],
    ['showing', 'show'],
    ['pinning', 'pin'],
    // Past-participle forms used in questions ("what's currently sorted?", "which columns are hidden?").
    ['pinned', 'pin'],
    ['hidden', 'hide'],
    ['filtered', 'filter'],
    ['sorted', 'sort'],
    ['grouped', 'group'],
    ['selected', 'select'],
]);
/** Word endings that must never be singularized — stripping their trailing "s" would corrupt the word. */
const STEM_EXCEPTIONS = new Set([
    'status', 'address', 'series', 'analysis', 'this', 'his', 'is', 'was', 'has', 'as', 'gas',
]);
/**
 * Reduces a plural English noun to its singular form using a small set of
 * common suffix rules — not a full stemmer, just enough to make alias
 * matching plural-insensitive (e.g. "columns"/"filters"/"rows" all reduce to
 * the singular form every built-in alias is written against). Never touches
 * pure numbers or short/exception words where stripping "s" would be wrong.
 */
export function stemWord(word) {
    if (word.length <= 3 || /^\d+$/.test(word) || STEM_EXCEPTIONS.has(word))
        return word;
    if (word.endsWith('ies'))
        return `${word.slice(0, -3)}y`;
    if (/(?:s|x|z|ch|sh)es$/.test(word))
        return word.slice(0, -2);
    if (word.endsWith('ss'))
        return word;
    if (word.endsWith('s'))
        return word.slice(0, -1);
    return word;
}
/** Splits already-normalized (lowercase, punctuation-free) text into words. */
export function tokenize(text) {
    return text.split(' ').filter((w) => w.length > 0);
}
/**
 * Reduces one raw word to the canonical form every alias/filler check is
 * written against: lowercased, singularized, then synonym-mapped (e.g.
 * "Resetting" → "reset" → "clear"). Exposed separately from
 * {@link normalizeInput} so callers that need to test a *single* word
 * against a keyword set (e.g. `query-splitter`'s clause-boundary detector)
 * get identical canonicalization without re-tokenizing a whole sentence.
 */
export function canonicalizeWord(raw) {
    const stemmed = stemWord(raw.toLowerCase());
    return SYNONYMS.get(stemmed) ?? stemmed;
}
/**
 * Normalizes a raw prompt for intent matching: lowercase, strip punctuation
 * (while preserving `.`/`-`/`:`/`/` inside numbers and dates), singularize
 * plurals, canonicalize synonyms, collapse whitespace, and drop filler
 * words. `EntityResolver` still receives the *original* remaining words
 * (this never reorders anything), so column names and values downstream are
 * unaffected beyond casing/punctuation/pluralization.
 *
 * @example normalizeInput("Hey Photon, please pin the salary column to the left side.")
 *   // => "pin salary column left"
 * @example normalizeInput("reset all filters") // => "clear all filter"
 */
export function normalizeInput(raw) {
    const lowered = raw.toLowerCase();
    // Keep '.', '-', ':', '/' so decimals ("12.5"), negative numbers ("-5"),
    // and dates ("2024-01-15", "01/15/2024") survive as single tokens.
    const noPunctuation = lowered.replace(/[^\p{L}\p{N}\s.\-:/]/gu, ' ');
    const words = noPunctuation.split(/\s+/).filter((w) => w.length > 0);
    const kept = [];
    for (const word of words) {
        const canonical = canonicalizeWord(word);
        if (FILLER_WORDS.has(canonical))
            continue;
        kept.push(canonical);
    }
    return kept.join(' ');
}
//# sourceMappingURL=text-normalizer.js.map