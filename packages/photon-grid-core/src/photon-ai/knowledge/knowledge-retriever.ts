/**
 * Scores and retrieves {@link KnowledgeArticle}s for a prompt.
 *
 * Retrieval is keyword overlap rather than embeddings: the corpus is small and
 * hand-curated, the keywords were chosen per article, and this keeps the core a
 * zero-dependency, fully-offline package. It also stays honest about failure —
 * a prompt matching nothing retrieves nothing, rather than confidently
 * returning the least-bad article.
 *
 * @packageDocumentation
 */

import { KNOWLEDGE_ARTICLES, type KnowledgeArticle } from './knowledge-base';

/** How many articles may be sent to the model for one prompt. */
const MAX_ARTICLES = 2;

/**
 * Minimum score an article needs to be retrieved at all.
 *
 * One keyword hit is enough — the keywords are specific ("usememo", "aggfunc",
 * "datasource"), so a single match is a strong signal.
 */
const MIN_SCORE = 1;

/** An article plus why it matched, so callers can rank and explain. */
export interface RetrievedArticle {
  readonly article: KnowledgeArticle;
  readonly score: number;
}

/**
 * Retrieves the articles most relevant to `prompt`, best first.
 *
 * Scoring rewards specificity: a multi-word keyword ("server side") that
 * matches is worth more than a single word, because it is far less likely to
 * have matched by accident. A title-word match adds a small bonus.
 *
 * @param prompt   - The raw user question.
 * @param articles - Corpus to search. Defaults to the built-in one; overridable for tests and host-app extension.
 */
export function retrieveArticles(
  prompt: string,
  articles: readonly KnowledgeArticle[] = KNOWLEDGE_ARTICLES,
): RetrievedArticle[] {
  const haystack = ` ${prompt.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ')} `;

  const scored: RetrievedArticle[] = [];
  for (const article of articles) {
    let score = 0;

    for (const keyword of article.keywords) {
      const needle = keyword.toLowerCase();
      // Space-padded so "add" cannot match inside "address" — the corpus is
      // small enough that a single false hit visibly skews retrieval.
      if (haystack.includes(` ${needle} `)) {
        score += needle.includes(' ') ? 3 : 2;
      }
    }

    for (const word of article.title.toLowerCase().split(/\s+/)) {
      if (word.length > 3 && haystack.includes(` ${word} `)) score += 1;
    }

    if (score >= MIN_SCORE) scored.push({ article, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_ARTICLES);
}

/**
 * Serializes retrieved articles into the block appended to the model's prompt.
 *
 * The framing is deliberately firm: without it a model will happily "improve"
 * a snippet into a more familiar-looking API (AG Grid's, usually), which is
 * exactly the hallucination this whole subsystem exists to prevent.
 */
export function serializeArticles(retrieved: readonly RetrievedArticle[]): string {
  if (retrieved.length === 0) return '';
  const sections = retrieved.map((r) => `## ${r.article.title}\n\n${r.article.body}`);
  return [
    'PHOTON GRID DOCUMENTATION — authoritative reference for this question.',
    'Answer using ONLY the APIs shown here. Do not invent options, methods, or',
    'component names, and do not substitute APIs from other grid libraries.',
    'Reproduce code examples faithfully; adapt them to the user\'s columns where',
    'that helps, but never change an API\'s shape.',
    '',
    ...sections,
  ].join('\n');
}
