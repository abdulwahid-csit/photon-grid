import type { ParsedIntentMatch } from './photon-ai.types';
import type { PhotonAICommandRegistry } from './photon-ai-registry';
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
export declare class IntentParser {
    parse(tokens: string[], registry: PhotonAICommandRegistry): ParsedIntentMatch | null;
}
//# sourceMappingURL=intent-parser.d.ts.map