import { similarity } from './fuzzy-match';
/** Below this similarity score a fuzzy column match is rejected rather than guessed at. */
const MIN_COLUMN_SIMILARITY = 0.6;
/** Higher bar for guessing a column purely from a *value* (e.g. "active" → the Status column) — a wrong guess here silently filters the wrong column, so false positives are costlier than for column-name matching. */
const MIN_VALUE_MATCH_SIMILARITY = 0.75;
/** Upper bound on rows scanned when guessing a column from raw cell data — keeps worst-case cost flat regardless of grid size. */
const MAX_VALUE_SCAN_ROWS = 300;
const BOOLEAN_TRUE_WORDS = new Set(['true', 'yes', 'active', 'enabled', 'on', 'open']);
const BOOLEAN_FALSE_WORDS = new Set(['false', 'no', 'inactive', 'disabled', 'off', 'closed']);
/** Connector words dropped only when comparing a value phrase against a dropdown/enum option's label — never touches the tokens actually used for intent matching. Lets "record out stock" still match the option label "Out of Stock" despite the "of" the user's phrase never had and the "record" it has that the label doesn't. */
const OPTION_LABEL_STOPWORDS = new Set(['of', 'the', 'a', 'an', 'and', 'or']);
/** Longest column-name span (in tokens) {@link EntityResolver.resolveColumns} will try to match as one unit, so multi-word headers ("Album Name") resolve in a list without over-matching. */
const MAX_COLUMN_PHRASE_WORDS = 3;
const OPERATOR_PHRASE_TABLE = [
    { words: ['greater', 'than', 'or', 'equal'], operator: 'greaterThanOrEqual' },
    { words: ['less', 'than', 'or', 'equal'], operator: 'lessThanOrEqual' },
    { words: ['no', 'less', 'than'], operator: 'greaterThanOrEqual' },
    { words: ['no', 'more', 'than'], operator: 'lessThanOrEqual' },
    { words: ['not', 'equal'], operator: 'notEquals' },
    { words: ['not', 'blank'], operator: 'notBlank' },
    { words: ['not', 'empty'], operator: 'notBlank' },
    { words: ['at', 'least'], operator: 'greaterThanOrEqual' },
    { words: ['at', 'most'], operator: 'lessThanOrEqual' },
    { words: ['start', 'with'], operator: 'startsWith' },
    { words: ['end', 'with'], operator: 'endsWith' },
    { words: ['greater', 'than'], operator: 'greaterThan' },
    { words: ['more', 'than'], operator: 'greaterThan' },
    { words: ['less', 'than'], operator: 'lessThan' },
    { words: ['fewer', 'than'], operator: 'lessThan' },
    { words: ['not', 'contain'], operator: 'notContains' },
    { words: ['contain'], operator: 'contains' },
    { words: ['over'], operator: 'greaterThan' },
    { words: ['above'], operator: 'greaterThan' },
    { words: ['under'], operator: 'lessThan' },
    { words: ['below'], operator: 'lessThan' },
    { words: ['before'], operator: 'before' },
    { words: ['after'], operator: 'after' },
    { words: ['equal'], operator: 'equals' },
    { words: ['blank'], operator: 'blank' },
    { words: ['empty'], operator: 'blank' },
];
/** Ordered by word count (longest phrase first) so "greater than or equal" is preferred over "greater than". */
const OPERATOR_PHRASES = [...OPERATOR_PHRASE_TABLE].sort((a, b) => b.words.length - a.words.length);
function normalizeWord(s) {
    return s.toLowerCase().trim();
}
/** Every string on a column a user might plausibly type or misspell. */
function candidateNamesFor(col) {
    return [col.colId, col.field, col.header].filter((s) => !!s).map(normalizeWord);
}
/** Every individual word across a column's colId/field/header — used to strip the column reference out of leftover tokens once it's been resolved. */
function candidateWordsFor(col) {
    const words = new Set();
    for (const name of candidateNamesFor(col)) {
        for (const w of name.split(' '))
            words.add(w);
    }
    return words;
}
/**
 * Extracts grid entities (columns, directions, values, filter operators, …)
 * from the leftover tokens an {@link IntentDefinition} receives after
 * intent-keyword removal. Columns are **never** hardcoded — every lookup is
 * against the grid's *current* `ColumnDef[]`, resolved fuzzily
 * (case-insensitive, substring, and edit-distance tolerant) so `"Salary"`,
 * `"employee salary"`, and `"salery"` all resolve to the same column.
 *
 * Stateless aside from the optional {@link PhotonAIMemoryStore}, which lets
 * a fuzzy column match resolved once (e.g. "emp name" → the `name` column)
 * become an exact, instant hit on every later prompt.
 */
export class EntityResolver {
    constructor(memory) {
        this.memory = memory;
    }
    /**
     * Finds the single best-matching column for a set of candidate tokens.
     * Checks learned aliases first, then tries the whole remaining phrase (so
     * multi-word column names like "employee salary" resolve directly), then
     * falls back to individual tokens (so a typo'd single word like "salery"
     * still resolves, and so noise words like operators/values sitting next
     * to a column name don't prevent a match).
     */
    resolveColumn(tokens, columns) {
        if (tokens.length === 0 || columns.length === 0)
            return null;
        const phrase = tokens.map(normalizeWord).join(' ');
        const learnedColId = this.memory?.getColumnAlias(phrase);
        if (learnedColId) {
            const learned = columns.find((c) => c.colId === learnedColId);
            if (learned)
                return learned;
        }
        const candidates = [phrase, ...tokens.map(normalizeWord)].filter((c) => c.length > 0);
        let best = null;
        let bestScore = 0;
        for (const col of columns) {
            const names = candidateNamesFor(col);
            for (const candidate of candidates) {
                for (const name of names) {
                    const score = this.scoreCandidate(candidate, name);
                    if (score > bestScore) {
                        bestScore = score;
                        best = col;
                    }
                }
            }
        }
        if (!best || bestScore < MIN_COLUMN_SIMILARITY)
            return null;
        if (bestScore < 1)
            this.memory?.learnColumnAlias(phrase, best.colId);
        return best;
    }
    /**
     * Resolves every column named in a list — used by intents that can take
     * more than one column at once (e.g. "pin price and income to the right",
     * "unpin status, income and year", "group by department and status").
     * Greedily tries the longest token window first at each position so a
     * multi-word header like "Album Name" resolves as one column rather than
     * two, but multi-word windows require an *exact* colId/field/header match
     * (no fuzzy leniency) — otherwise the substring rule that lets "employee
     * salary" resolve to "Salary" would just as happily let "price income"
     * swallow both "Price" and "Income" as one bogus match. A single token
     * still gets the full fuzzy/typo-tolerant treatment. Tokens that match
     * nothing (list connectors like "and", stray words) are skipped rather
     * than aborting the whole list.
     */
    resolveColumns(tokens, columns) {
        const resolved = [];
        const seen = new Set();
        let i = 0;
        while (i < tokens.length) {
            let consumed = 1;
            let match = null;
            for (let windowSize = Math.min(MAX_COLUMN_PHRASE_WORDS, tokens.length - i); windowSize >= 2; windowSize--) {
                const phrase = tokens.slice(i, i + windowSize).map(normalizeWord).join(' ');
                const exact = columns.find((c) => candidateNamesFor(c).includes(phrase));
                if (exact) {
                    match = exact;
                    consumed = windowSize;
                    break;
                }
            }
            if (!match)
                match = this.resolveColumn([tokens[i]], columns);
            if (match && !seen.has(match.colId)) {
                seen.add(match.colId);
                resolved.push(match);
            }
            i += consumed;
        }
        return resolved;
    }
    /** `'asc'` if any ascending-leaning word is present, `'desc'` if any descending-leaning word is present, else `null`. */
    resolveDirection(tokens) {
        const words = new Set(tokens.map(normalizeWord));
        const ascending = ['asc', 'ascending', 'low', 'smallest', 'increasing'];
        const descending = ['desc', 'descending', 'high', 'largest', 'decreasing'];
        if (descending.some((w) => words.has(w)))
            return 'desc';
        if (ascending.some((w) => words.has(w)))
            return 'asc';
        return null;
    }
    /** `'left'` / `'right'` if present, else `null` (meaning "unpin" for pin-side intents). */
    resolveSide(tokens) {
        const words = new Set(tokens.map(normalizeWord));
        if (words.has('left'))
            return 'left';
        if (words.has('right'))
            return 'right';
        return null;
    }
    /** The first bare integer found in the tokens (e.g. `"select row 5"` → `5`), or `null`. */
    resolveIndex(tokens) {
        for (const token of tokens) {
            if (/^\d+$/.test(token))
                return parseInt(token, 10);
        }
        return null;
    }
    /** `true` when the tokens refer to "all"/"every" rather than one named thing (e.g. "hide all columns"). */
    resolveAllRequested(tokens) {
        return tokens.some((t) => normalizeWord(t) === 'all');
    }
    /**
     * Joins whatever tokens remain after a column has already been consumed
     * from them — the free-text "value" a filter intent applies (e.g. in
     * `"filter status active"`, once `status` resolves to a column, `"active"`
     * is the value). Strips every individual word of the column's name
     * (colId/field/header), not just an exact whole-phrase match, so
     * multi-word headers like "Album Name" are fully removed.
     */
    extractValue(tokens, consumedColumn) {
        const remaining = this.stripColumnTokens(tokens, consumedColumn);
        return remaining.length ? remaining.join(' ') : null;
    }
    /** Same as {@link extractValue} but returns the leftover tokens as an array (for further operator/value parsing) instead of a joined string. */
    stripColumnTokens(tokens, consumedColumn) {
        if (!consumedColumn)
            return [...tokens];
        const consumedWords = candidateWordsFor(consumedColumn);
        return tokens.filter((t) => !consumedWords.has(normalizeWord(t)));
    }
    /** Strips a single leading/anywhere "not" token, reporting whether negation was present so callers can flip their chosen operator. */
    resolveNegation(tokens) {
        const idx = tokens.map(normalizeWord).indexOf('not');
        if (idx < 0)
            return { negated: false, remaining: [...tokens] };
        return { negated: true, remaining: [...tokens.slice(0, idx), ...tokens.slice(idx + 1)] };
    }
    /**
     * Detects a comparison-operator phrase (e.g. "greater than", "starts
     * with", "before") anywhere in `tokens` and returns it along with the
     * tokens that are left after removing that phrase's words. Returns
     * `operator: null` (and the original tokens, untouched) when no phrase
     * matches, so callers can fall back to a type-appropriate default.
     */
    resolveOperator(tokens) {
        const words = tokens.map(normalizeWord);
        for (const { words: phrase, operator } of OPERATOR_PHRASES) {
            const start = indexOfSubsequence(words, phrase);
            if (start < 0)
                continue;
            const remaining = [...words.slice(0, start), ...words.slice(start + phrase.length)];
            return { operator, remaining };
        }
        return { operator: null, remaining: [...words] };
    }
    /** Splits `"between 10 and 50"`-style tokens into their two bounds, or `null` when no `between ... and ...` pattern is present. */
    resolveRange(tokens) {
        const words = tokens.map(normalizeWord);
        const betweenIdx = words.indexOf('between');
        if (betweenIdx < 0)
            return null;
        const andIdx = words.indexOf('and', betweenIdx + 1);
        if (andIdx < 0)
            return null;
        const from = words.slice(betweenIdx + 1, andIdx);
        const to = words.slice(andIdx + 1);
        if (from.length === 0 || to.length === 0)
            return null;
        return { from, to };
    }
    /** Parses a free-text number, tolerant of a leading currency symbol or trailing `%`. */
    parseNumberToken(raw) {
        const cleaned = raw.replace(/[^0-9.\-]/g, '');
        if (!cleaned)
            return null;
        const value = Number(cleaned);
        return Number.isNaN(value) ? null : value;
    }
    /** Parses a date token — ISO/slash-formatted dates plus "today"/"yesterday"/"tomorrow". */
    parseDateToken(raw) {
        const word = normalizeWord(raw);
        const now = new Date();
        if (word === 'today')
            return now;
        if (word === 'yesterday')
            return new Date(now.getTime() - 86400000);
        if (word === 'tomorrow')
            return new Date(now.getTime() + 86400000);
        if (!/\d/.test(word))
            return null;
        const parsed = new Date(word);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    /** Maps a boolean-leaning word ("active", "yes", "disabled", …) to `true`/`false`, or `null` when it isn't one. */
    parseBooleanToken(raw) {
        const word = normalizeWord(raw);
        if (BOOLEAN_TRUE_WORDS.has(word))
            return true;
        if (BOOLEAN_FALSE_WORDS.has(word))
            return false;
        return null;
    }
    /** Finds the best matching dropdown/enum option for a free-text value against one already-known column. */
    matchOption(rawValue, column) {
        const candidate = normalizeWord(rawValue);
        if (!candidate)
            return null;
        const options = column.dropdownOptions ?? column.enumOptions?.map((v) => ({ value: v, label: v })) ?? [];
        let best = null;
        let bestScore = 0;
        for (const option of options) {
            const score = this.optionScore(candidate, String(option.label));
            if (score > bestScore) {
                bestScore = score;
                best = option;
            }
        }
        return bestScore >= MIN_VALUE_MATCH_SIMILARITY ? best : null;
    }
    /**
     * Guesses which column a free-text value belongs to when the user never
     * named one (e.g. "show active items" — "active" is a `Status` dropdown
     * option, not a column reference). Tries, in order: dropdown/enum option
     * labels, boolean-leaning words, then a bounded scan of live row data for
     * an exact match — each step only runs across columns still marked
     * `filterable !== false`, and the raw-data scan is capped at
     * {@link MAX_VALUE_SCAN_ROWS} rows so cost never scales with grid size.
     */
    resolveColumnByValue(tokens, columns, api) {
        if (tokens.length === 0)
            return null;
        const phrase = tokens.map(normalizeWord).join(' ');
        const candidates = [phrase, ...tokens.map(normalizeWord)].filter((c) => c.length > 0);
        const filterableColumns = columns.filter((c) => c.filterable !== false);
        let best = null;
        let bestScore = 0;
        for (const col of filterableColumns) {
            const options = col.dropdownOptions ?? col.enumOptions?.map((v) => ({ value: v, label: v })) ?? [];
            for (const candidate of candidates) {
                for (const option of options) {
                    const score = this.optionScore(candidate, String(option.label));
                    if (score > bestScore) {
                        bestScore = score;
                        best = { column: col, rawValue: String(option.value) };
                    }
                }
                if (col.type === 'boolean' && this.parseBooleanToken(candidate) !== null) {
                    if (1 > bestScore) {
                        bestScore = 1;
                        best = { column: col, rawValue: candidate };
                    }
                }
            }
        }
        if (best && bestScore >= MIN_VALUE_MATCH_SIMILARITY)
            return best;
        return this.scanRowDataForValue(phrase, filterableColumns, api);
    }
    scanRowDataForValue(phrase, columns, api) {
        if (phrase.length < 3)
            return null;
        const scannable = columns.filter((c) => c.type === 'string' || c.type === 'dropdown' || c.type === 'email');
        if (scannable.length === 0)
            return null;
        const rows = api.getAllRows();
        const limit = Math.min(rows.length, MAX_VALUE_SCAN_ROWS);
        for (let i = 0; i < limit; i++) {
            const data = rows[i].data;
            for (const col of scannable) {
                const cell = data[col.field];
                if (cell != null && normalizeWord(String(cell)) === phrase) {
                    return { column: col, rawValue: String(cell) };
                }
            }
        }
        return null;
    }
    scoreCandidate(candidate, name) {
        if (candidate === name)
            return 1;
        if (candidate.length >= 3 && (name.includes(candidate) || candidate.includes(name)))
            return 0.9;
        return similarity(candidate, name);
    }
    /**
     * Scores a free-text value phrase against one dropdown/enum option label.
     * Combines the direct string score (handles typos, e.g. "innactive") with
     * a word-coverage score that ignores connector words on both sides (e.g.
     * "of") — so a candidate like "record out stock" (extra noise word,
     * missing "of") still confidently matches the label "Out of Stock" as
     * long as every *meaningful* label word is present somewhere in it.
     */
    optionScore(candidate, optionLabel) {
        const label = normalizeWord(optionLabel);
        const direct = this.scoreCandidate(candidate, label);
        const candidateWords = new Set(candidate.split(' ').filter((w) => w.length > 0));
        const labelWords = label.split(' ').filter((w) => w.length > 0 && !OPTION_LABEL_STOPWORDS.has(w));
        if (labelWords.length === 0)
            return direct;
        const coverage = labelWords.filter((w) => candidateWords.has(w)).length / labelWords.length;
        const coverageScore = coverage === 1 ? 0.95 : coverage * 0.7;
        return Math.max(direct, coverageScore);
    }
}
/** Index of the first occurrence of `needle` as a contiguous subsequence of `haystack`, or `-1`. */
function indexOfSubsequence(haystack, needle) {
    if (needle.length === 0 || needle.length > haystack.length)
        return -1;
    outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j])
                continue outer;
        }
        return i;
    }
    return -1;
}
//# sourceMappingURL=entity-resolver.js.map