/**
 * The **Context Router** — Photon AI's token-optimization layer.
 *
 * Before a prompt reaches the LLM, the router classifies it into one or more
 * {@link PhotonAIDomain}s and reports which columns it appears to name. The
 * provider pipeline then sends *only* the capabilities, column fields, state
 * slices, and prompt sections those domains require.
 *
 * ### Why this is not keyword matching
 * Photon AI's design rule is intent detection over keyword lists. The router
 * honours that by deriving its vocabulary from the **live intent registry**:
 * every intent already declares the alias phrases that identify it, and every
 * intent key already maps to a domain. So the router's dictionary *is* the
 * registry — a custom intent registered at runtime becomes routable with no
 * change here, and an alias reworded in a builtin updates routing for free.
 * Nothing in this file enumerates English words for grid concepts.
 *
 * ### Failure mode
 * Under-including is the only dangerous outcome: a filter request that arrives
 * without filter operators cannot be answered. Every ambiguity therefore
 * resolves toward *more* context — an unrecognized prompt falls back to the
 * full payload, exactly matching the pre-router behaviour. The optimization is
 * strictly opportunistic.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../types/column.types';
import type { PhotonAICommandRegistry } from '../photon-ai-registry';
import { canonicalizeWord, normalizeInput, tokenize } from '../text-normalizer';
import { PhotonAIDomain, type PhotonAIContextScope } from './ai-provider.types';

/**
 * Maps an intent key to the domain that owns it.
 *
 * Keys are matched by prefix against the registry so related intents collapse
 * onto one domain without listing each (`sortAscending`, `sortDescending`,
 * `sortInfo` → {@link PhotonAIDomain.Sort}). Order matters: the first matching
 * prefix wins, so more specific prefixes must precede broader ones.
 */
const INTENT_PREFIX_DOMAINS: readonly (readonly [string, PhotonAIDomain])[] = [
  ['sort', PhotonAIDomain.Sort],
  ['clearSort', PhotonAIDomain.Sort],
  ['filter', PhotonAIDomain.Filter],
  ['applyFilter', PhotonAIDomain.Filter],
  ['clearFilters', PhotonAIDomain.Filter],
  ['hide', PhotonAIDomain.Visibility],
  ['show', PhotonAIDomain.Visibility],
  ['pin', PhotonAIDomain.Pinning],
  ['unpin', PhotonAIDomain.Pinning],
  ['group', PhotonAIDomain.Grouping],
  ['ungroup', PhotonAIDomain.Grouping],
  ['expand', PhotonAIDomain.Grouping],
  ['collapse', PhotonAIDomain.Grouping],
  ['select', PhotonAIDomain.Selection],
  ['clearSelection', PhotonAIDomain.Selection],
  ['copy', PhotonAIDomain.Selection],
  ['cut', PhotonAIDomain.Selection],
  ['move', PhotonAIDomain.Layout],
  ['row', PhotonAIDomain.Info],
  ['column', PhotonAIDomain.Info],
  ['help', PhotonAIDomain.Info],
];

/**
 * Intent keys whose domain the prefix table would misattribute.
 *
 * `selectRowsWhere` reads as Selection by prefix but takes filter operators and
 * values, so a prompt routed to it needs the Filter domain's vocabulary too.
 * `hiddenColumnsInfo` and `pinInfo` are Info-shaped questions *about* another
 * domain and need that domain's state to answer.
 */
const INTENT_EXTRA_DOMAINS: Readonly<Record<string, readonly PhotonAIDomain[]>> = {
  selectRowsWhere: [PhotonAIDomain.Filter],
  filterInfo: [PhotonAIDomain.Filter, PhotonAIDomain.Info],
  sortInfo: [PhotonAIDomain.Sort, PhotonAIDomain.Info],
  pinInfo: [PhotonAIDomain.Pinning, PhotonAIDomain.Info],
  hiddenColumnsInfo: [PhotonAIDomain.Visibility, PhotonAIDomain.Info],
  groupInfo: [PhotonAIDomain.Grouping, PhotonAIDomain.Info],
  selectionInfo: [PhotonAIDomain.Selection, PhotonAIDomain.Info],
};

/** Every domain — the fallback scope when classification finds nothing. */
const ALL_DOMAINS: readonly PhotonAIDomain[] = Object.values(PhotonAIDomain);

/**
 * Minimum length for a token to be considered a column reference. One- and
 * two-character tokens produce far too many false positives against short
 * column ids, and a false *positive* here is harmless only because a missed
 * column falls back to sending all of them — but the noise is not worth it.
 */
const MIN_COLUMN_TOKEN_LENGTH = 3;

/**
 * Resolves the domains one intent key belongs to.
 *
 * Shared with `GridContextBuilder`, which uses it to decide whether a
 * registered intent's capability entry belongs in a scoped context — so the
 * classification that selects domains and the projection that honours them can
 * never disagree about which domain an intent lives in.
 *
 * An empty result means "unattributed", which callers must treat as
 * *always include* rather than *never include*: that is the signature of a
 * host-app custom intent, and withholding it would make it unreachable.
 */
export function domainsForIntentKey(key: string): readonly PhotonAIDomain[] {
  const extra = INTENT_EXTRA_DOMAINS[key];
  if (extra) return extra;
  for (const [prefix, domain] of INTENT_PREFIX_DOMAINS) {
    if (key.startsWith(prefix)) return [domain];
  }
  return [];
}

/**
 * Classifies a natural-language prompt into the minimal set of grid domains
 * needed to answer it, and the columns it names.
 *
 * Construct once per service; {@link route} is pure with respect to the
 * registry's contents at call time, so runtime-registered intents are picked up
 * on the next prompt without any invalidation step.
 */
export class ContextRouter {
  constructor(private readonly registry: PhotonAICommandRegistry) {}

  /**
   * Classifies `prompt` and returns the context scope to build for it.
   *
   * @param prompt  - The raw user command, exactly as typed.
   * @param columns - The grid's current columns, used to detect column mentions.
   */
  route(prompt: string, columns: readonly ColumnDef[]): PhotonAIContextScope {
    const tokens = new Set(tokenize(normalizeInput(prompt)));
    // Column names are matched against the *raw* words too: `normalizeInput`
    // strips filler that a header might legitimately contain, and a column
    // called "Order" would otherwise vanish before it could be matched.
    const rawWords = rawTokens(prompt);

    const domains = this.classifyDomains(tokens);
    const columnIds = this.detectColumns(rawWords, columns);

    if (domains.size === 0) {
      // Nothing recognized — send everything, exactly as before routing existed.
      // Columns still narrow if the user clearly named one, since that is
      // independent of which action they want.
      return { domains: new Set(ALL_DOMAINS), columnIds, fellBack: true };
    }

    return { domains, columnIds, fellBack: false };
  }

  /**
   * Matches the prompt's tokens against every registered intent's alias
   * phrases, collecting the domain of each intent that fires.
   *
   * An intent counts as referenced when *any* of its alias phrases is fully
   * covered by the token set — the same containment rule `IntentParser` uses to
   * pick a command, applied here without the tie-breaking, because routing
   * wants the union of plausible domains rather than a single winner. Sending
   * two domains when the user meant one costs a little; sending the wrong one
   * costs the request.
   */
  private classifyDomains(tokens: ReadonlySet<string>): Set<PhotonAIDomain> {
    const domains = new Set<PhotonAIDomain>();
    if (tokens.size === 0) return domains;

    for (const intent of this.registry.getAll()) {
      const matched = intent.aliases.some(
        (alias) => alias.length > 0 && alias.every((word) => tokens.has(canonicalizeWord(word))),
      );
      if (!matched) continue;
      for (const domain of domainsForIntentKey(intent.key)) domains.add(domain);
    }

    return domains;
  }

  /**
   * Finds columns the prompt names, by exact word match against each column's
   * `colId`, `field`, and `header`.
   *
   * Deliberately exact rather than fuzzy: `EntityResolver` does fuzzy matching
   * when it must resolve *the* target column, but here a wrong guess would
   * silently drop the column the user actually meant from the context. An exact
   * miss just means all columns are sent — correct, only less cheap. Multi-word
   * headers match when every one of their words is present.
   */
  private detectColumns(words: ReadonlySet<string>, columns: readonly ColumnDef[]): readonly string[] {
    if (words.size === 0 || columns.length === 0) return [];

    const hits: string[] = [];
    for (const col of columns) {
      if (this.mentionsColumn(words, col)) hits.push(col.colId);
    }

    // Every column matched ⇒ the narrowing conveys nothing; treat as no hit so
    // the builder takes its simpler "all columns" path.
    return hits.length === columns.length ? [] : hits;
  }

  /** Whether any of a column's names appears in the prompt's words. */
  private mentionsColumn(words: ReadonlySet<string>, col: ColumnDef): boolean {
    for (const name of [col.colId, col.field, col.header]) {
      if (!name) continue;
      const parts = String(name)
        .toLowerCase()
        .split(/[\s_-]+/)
        .filter((p) => p.length >= MIN_COLUMN_TOKEN_LENGTH);
      if (parts.length === 0) continue;
      if (parts.every((p) => words.has(p))) return true;
    }
    return false;
  }
}

/** Lower-cased word set from the raw prompt, punctuation stripped. */
function rawTokens(prompt: string): ReadonlySet<string> {
  const words = prompt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
  return new Set(words);
}
