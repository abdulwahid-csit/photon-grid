/**
 * Reduces a plural English noun to its singular form using a small set of
 * common suffix rules — not a full stemmer, just enough to make alias
 * matching plural-insensitive (e.g. "columns"/"filters"/"rows" all reduce to
 * the singular form every built-in alias is written against). Never touches
 * pure numbers or short/exception words where stripping "s" would be wrong.
 */
export declare function stemWord(word: string): string;
/** Splits already-normalized (lowercase, punctuation-free) text into words. */
export declare function tokenize(text: string): string[];
/**
 * Reduces one raw word to the canonical form every alias/filler check is
 * written against: lowercased, singularized, then synonym-mapped (e.g.
 * "Resetting" → "reset" → "clear"). Exposed separately from
 * {@link normalizeInput} so callers that need to test a *single* word
 * against a keyword set (e.g. `query-splitter`'s clause-boundary detector)
 * get identical canonicalization without re-tokenizing a whole sentence.
 */
export declare function canonicalizeWord(raw: string): string;
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
export declare function normalizeInput(raw: string): string;
//# sourceMappingURL=text-normalizer.d.ts.map