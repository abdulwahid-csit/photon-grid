function matchAlias(alias, tokens) {
    const tokenSet = new Set(tokens);
    const covered = alias.every((word) => tokenSet.has(word));
    return { covered, words: alias };
}
/** The best-covered alias for one intent, or `null` if none of its phrases fully matched. */
function bestAliasFor(intent, tokens) {
    let best = null;
    for (const alias of intent.aliases) {
        const match = matchAlias(alias, tokens);
        if (!match.covered)
            continue;
        if (!best || alias.length > best.length)
            best = alias;
    }
    return best;
}
/**
 * Matches normalized input tokens against every intent in a
 * {@link PhotonAICommandRegistry} and returns the single best match.
 *
 * Matching is a "bag of words" containment check (see
 * `IntentDefinition.aliases`) rather than exact-phrase or positional
 * matching, so a column name or other entity words sitting between an
 * intent's keywords (e.g. "pin **salary column** left") never breaks
 * detection. When multiple intents match, the one whose winning alias has
 * the most words wins — the more specific phrase is preferred (this is what
 * lets `"show name column"` resolve to *show column* rather than the
 * shorter, also-present `"show"` fragment of *filter*'s `"show only"` alias,
 * since that alias isn't fully covered here at all).
 */
export class IntentParser {
    parse(tokens, registry) {
        let winner = null;
        let winningAlias = null;
        for (const intent of registry.getAll()) {
            const alias = bestAliasFor(intent, tokens);
            if (!alias)
                continue;
            if (!winningAlias || alias.length > winningAlias.length) {
                winner = intent;
                winningAlias = alias;
            }
        }
        if (!winner || !winningAlias)
            return null;
        const usedWords = new Set(winningAlias);
        const remainingTokens = tokens.filter((t) => !usedWords.has(t));
        return { intent: winner, remainingTokens };
    }
}
//# sourceMappingURL=intent-parser.js.map