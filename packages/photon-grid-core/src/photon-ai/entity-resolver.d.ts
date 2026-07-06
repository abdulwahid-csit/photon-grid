import type { ColumnDef, ColumnDropdownOption } from '../types/column.types';
import type { FilterOperator } from '../types/filter.types';
import type { GridApi } from '../core/grid-api';
import type { PhotonAIMemoryStore } from './photon-ai-memory';
/** Result of {@link EntityResolver.resolveOperator} — the detected operator plus whatever tokens weren't consumed by its phrase. */
export interface OperatorMatch {
    readonly operator: FilterOperator | null;
    readonly remaining: string[];
}
/** Result of {@link EntityResolver.resolveColumnByValue} — a column guessed purely from a value, with no column name mentioned. */
export interface ValueMatch {
    readonly column: ColumnDef;
    readonly rawValue: string;
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
export declare class EntityResolver {
    private readonly memory?;
    constructor(memory?: PhotonAIMemoryStore | undefined);
    /**
     * Finds the single best-matching column for a set of candidate tokens.
     * Checks learned aliases first, then tries the whole remaining phrase (so
     * multi-word column names like "employee salary" resolve directly), then
     * falls back to individual tokens (so a typo'd single word like "salery"
     * still resolves, and so noise words like operators/values sitting next
     * to a column name don't prevent a match).
     */
    resolveColumn(tokens: readonly string[], columns: readonly ColumnDef[]): ColumnDef | null;
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
    resolveColumns(tokens: readonly string[], columns: readonly ColumnDef[]): ColumnDef[];
    /** `'asc'` if any ascending-leaning word is present, `'desc'` if any descending-leaning word is present, else `null`. */
    resolveDirection(tokens: readonly string[]): 'asc' | 'desc' | null;
    /** `'left'` / `'right'` if present, else `null` (meaning "unpin" for pin-side intents). */
    resolveSide(tokens: readonly string[]): 'left' | 'right' | null;
    /** The first bare integer found in the tokens (e.g. `"select row 5"` → `5`), or `null`. */
    resolveIndex(tokens: readonly string[]): number | null;
    /** `true` when the tokens refer to "all"/"every" rather than one named thing (e.g. "hide all columns"). */
    resolveAllRequested(tokens: readonly string[]): boolean;
    /**
     * Joins whatever tokens remain after a column has already been consumed
     * from them — the free-text "value" a filter intent applies (e.g. in
     * `"filter status active"`, once `status` resolves to a column, `"active"`
     * is the value). Strips every individual word of the column's name
     * (colId/field/header), not just an exact whole-phrase match, so
     * multi-word headers like "Album Name" are fully removed.
     */
    extractValue(tokens: readonly string[], consumedColumn: ColumnDef | null): string | null;
    /** Same as {@link extractValue} but returns the leftover tokens as an array (for further operator/value parsing) instead of a joined string. */
    stripColumnTokens(tokens: readonly string[], consumedColumn: ColumnDef | null): string[];
    /** Strips a single leading/anywhere "not" token, reporting whether negation was present so callers can flip their chosen operator. */
    resolveNegation(tokens: readonly string[]): {
        negated: boolean;
        remaining: string[];
    };
    /**
     * Detects a comparison-operator phrase (e.g. "greater than", "starts
     * with", "before") anywhere in `tokens` and returns it along with the
     * tokens that are left after removing that phrase's words. Returns
     * `operator: null` (and the original tokens, untouched) when no phrase
     * matches, so callers can fall back to a type-appropriate default.
     */
    resolveOperator(tokens: readonly string[]): OperatorMatch;
    /** Splits `"between 10 and 50"`-style tokens into their two bounds, or `null` when no `between ... and ...` pattern is present. */
    resolveRange(tokens: readonly string[]): {
        from: string[];
        to: string[];
    } | null;
    /** Parses a free-text number, tolerant of a leading currency symbol or trailing `%`. */
    parseNumberToken(raw: string): number | null;
    /** Parses a date token — ISO/slash-formatted dates plus "today"/"yesterday"/"tomorrow". */
    parseDateToken(raw: string): Date | null;
    /** Maps a boolean-leaning word ("active", "yes", "disabled", …) to `true`/`false`, or `null` when it isn't one. */
    parseBooleanToken(raw: string): boolean | null;
    /** Finds the best matching dropdown/enum option for a free-text value against one already-known column. */
    matchOption(rawValue: string, column: ColumnDef): ColumnDropdownOption | null;
    /**
     * Guesses which column a free-text value belongs to when the user never
     * named one (e.g. "show active items" — "active" is a `Status` dropdown
     * option, not a column reference). Tries, in order: dropdown/enum option
     * labels, boolean-leaning words, then a bounded scan of live row data for
     * an exact match — each step only runs across columns still marked
     * `filterable !== false`, and the raw-data scan is capped at
     * {@link MAX_VALUE_SCAN_ROWS} rows so cost never scales with grid size.
     */
    resolveColumnByValue(tokens: readonly string[], columns: readonly ColumnDef[], api: GridApi): ValueMatch | null;
    private scanRowDataForValue;
    private scoreCandidate;
    /**
     * Scores a free-text value phrase against one dropdown/enum option label.
     * Combines the direct string score (handles typos, e.g. "innactive") with
     * a word-coverage score that ignores connector words on both sides (e.g.
     * "of") — so a candidate like "record out stock" (extra noise word,
     * missing "of") still confidently matches the label "Out of Stock" as
     * long as every *meaningful* label word is present somewhere in it.
     */
    private optionScore;
}
//# sourceMappingURL=entity-resolver.d.ts.map