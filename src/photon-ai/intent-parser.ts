import type { IntentDefinition, ParsedIntentMatch } from './photon-ai.types';
import type { PhotonAICommandRegistry } from './photon-ai-registry';

/** One alias phrase's match result against a token set. */
interface AliasMatch {
  readonly covered: boolean;
  readonly words: readonly string[];
}

function matchAlias(alias: readonly string[], tokens: readonly string[]): AliasMatch {
  const tokenSet = new Set(tokens);
  const covered = alias.every((word) => tokenSet.has(word));
  return { covered, words: alias };
}

/** The best-covered alias for one intent, or `null` if none of its phrases fully matched. */
function bestAliasFor(intent: IntentDefinition, tokens: readonly string[]): readonly string[] | null {
  let best: readonly string[] | null = null;
  for (const alias of intent.aliases) {
    const match = matchAlias(alias, tokens);
    if (!match.covered) continue;
    if (!best || alias.length > best.length) best = alias;
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
  parse(tokens: string[], registry: PhotonAICommandRegistry): ParsedIntentMatch | null {
    let winner: IntentDefinition | null = null;
    let winningAlias: readonly string[] | null = null;

    for (const intent of registry.getAll()) {
      const alias = bestAliasFor(intent, tokens);
      if (!alias) continue;
      if (!winningAlias || alias.length > winningAlias.length) {
        winner = intent;
        winningAlias = alias;
      }
    }

    if (!winner || !winningAlias) return null;

    const usedWords = new Set(winningAlias);
    const remainingTokens = tokens.filter((t) => !usedWords.has(t));
    return { intent: winner, remainingTokens };
  }
}
