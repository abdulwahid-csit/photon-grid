import type { GridApi } from '../core/grid-api';
import { normalizeInput, tokenize, canonicalizeWord } from './text-normalizer';
import { splitClauses } from './query-splitter';
import { IntentParser } from './intent-parser';
import { EntityResolver } from './entity-resolver';
import { CommandBuilder } from './command-builder';
import { CommandExecutor } from './command-executor';
import { PhotonAICommandRegistry } from './photon-ai-registry';
import { PhotonAIMemoryStore, columnSignature } from './photon-ai-memory';
import { registerBuiltinCommands } from './builtins';
import type { PhotonCommand, PhotonCommandResult } from './photon-ai.types';

/**
 * Pure conversational openers — no command content, so `normalizeInput`
 * strips every word away (they're all in its filler list) and the clause
 * would otherwise fall through to a confusing "I couldn't parse" error.
 * Recognized straight off the raw clause, before normalization runs.
 */
const GREETING_WORDS: ReadonlySet<string> = new Set(['hi', 'hello', 'hey', 'hiya', 'howdy', 'yo', 'greetings']);

/** Same idea as {@link GREETING_WORDS}, for conversational closers ("thanks", "thank you"). */
const THANKS_WORDS: ReadonlySet<string> = new Set(['thanks', 'thank', 'thankyou', 'thx', 'ty']);

const GREETING_REPLY =
  'Hi! Tell me what to do — sort, filter, pin, group, hide/show columns, move columns, selection, and more — or ask me a question about the grid\'s current state (try "help" to see everything I understand).';

const THANKS_REPLY = "You're welcome! Let me know if there's anything else you'd like to do with the grid.";

/**
 * The only public entry point into Photon AI. Runs the full deterministic
 * pipeline for one prompt:
 *
 * ```
 * split into clauses → (learned-phrase replay | normalize → parse intent →
 * resolve entities → build command) → execute → learn
 * ```
 *
 * A compound sentence ("hide the id column and sort by price descending")
 * is split into independent clauses by {@link splitClauses} and each is run
 * through the pipeline in order, so multi-step natural-language requests
 * work without any single intent needing to know about the others.
 *
 * Every successfully-executed clause is remembered by a
 * {@link PhotonAIMemoryStore}, namespaced to this grid's current columns:
 * the *next* time the same clause is typed, it replays the learned command
 * directly (skipping intent matching and entity resolution entirely) as
 * long as the column it refers to still exists — this is what makes Photon
 * AI "learn" a user's phrasing over time, including phrasings that only
 * resolved on the first try via fuzzy/implicit matching.
 *
 * Every stage past clause-splitting is a small, independent, replaceable
 * collaborator (`IntentParser`, `EntityResolver`, `CommandBuilder`,
 * `CommandExecutor`); this class only sequences them and never contains
 * matching or execution logic itself.
 */
export class PhotonAIService {
  private readonly registry: PhotonAICommandRegistry;
  private readonly memory: PhotonAIMemoryStore;
  private readonly parser = new IntentParser();
  private readonly resolver: EntityResolver;
  private readonly builder = new CommandBuilder();
  private readonly executor: CommandExecutor;

  /**
   * @param api - The grid's own `GridApi` — every command runs through it, never around it.
   * @param registry - Supply a custom registry to fully replace the built-ins, or omit to get sort/filter/pin/visibility/grouping/selection out of the box.
   */
  constructor(private api: GridApi, registry?: PhotonAICommandRegistry) {
    this.registry = registry ?? PhotonAIService.createDefaultRegistry();
    this.executor = new CommandExecutor(this.registry);
    this.memory = new PhotonAIMemoryStore(columnSignature(api.getAllColumns().map((c) => c.colId)));
    this.resolver = new EntityResolver(this.memory);
  }

  /** A registry pre-populated with every built-in intent — the default `PhotonAIService` uses when none is supplied. */
  static createDefaultRegistry(): PhotonAICommandRegistry {
    const registry = new PhotonAICommandRegistry();
    registerBuiltinCommands(registry);
    return registry;
  }

  /** Registers additional custom intents at runtime (e.g. a third-party feature's own `registerAI()`). */
  getRegistry(): PhotonAICommandRegistry {
    return this.registry;
  }

  /** Forgets every column alias and phrase this service has learned for the current grid — useful after a large schema change or for testing. */
  forgetLearnedMemory(): void {
    this.memory.clear();
  }

  /**
   * Runs one prompt through the full pipeline. Always resolves —
   * parsing/resolution failures come back as `{ success: false }`, never a
   * thrown error. A compound sentence runs each clause independently and
   * aggregates their results.
   */
  submit(rawInput: string): PhotonCommandResult {
    const trimmed = rawInput.trim();
    if (!trimmed) return { success: false, message: 'Type a command first.' };

    const clauses = splitClauses(trimmed, this.clauseVerbs());
    const results = clauses.map((clause) => this.runClause(clause));

    if (results.length === 1) return results[0];

    return {
      success: results.every((r) => r.success),
      message: results.map((r, i) => `${i + 1}) ${r.message}`).join(' '),
    };
  }

  private runClause(clause: string): PhotonCommandResult {
    const normalized = normalizeInput(clause);
    if (!normalized) return this.replyToSmallTalk(clause);

    const learned = this.memory.getPhraseCommands(normalized);
    if (learned && learned.every((cmd) => this.commandStillValid(cmd))) {
      return this.runCommands(learned);
    }

    const tokens = tokenize(normalized);
    if (tokens.length === 0) return { success: false, message: `I couldn't parse "${clause}" — try rephrasing.` };

    const match = this.parser.parse(tokens, this.registry);
    if (!match) return { success: false, message: `I don't know how to "${clause}" yet.` };

    const columns = this.api.getAllColumns();
    const { command, error } = this.builder.build(match.intent, match.remainingTokens, this.resolver, columns, this.api);
    if (error || !command) return { success: false, message: error ?? 'Something went wrong building that command.' };

    const result = this.executor.execute(command, this.api);
    if (result.success) this.memory.learnPhrase(normalized, [command]);
    return result;
  }

  private runCommands(commands: readonly PhotonCommand[]): PhotonCommandResult {
    const messages: string[] = [];
    for (const command of commands) {
      const result = this.executor.execute(command, this.api);
      messages.push(result.message);
      if (!result.success) return { success: false, message: messages.join(' ') };
    }
    return { success: true, message: messages.join(' ') };
  }

  /**
   * Handles a clause that normalized away to nothing — every one of its
   * words was filler. Rather than a blanket parse error, greetings and
   * thanks get a friendly, on-brand reply; anything else (stray filler with
   * no real words at all) still reports that it couldn't be parsed.
   */
  private replyToSmallTalk(clause: string): PhotonCommandResult {
    const words = clause
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (words.length > 0 && words.every((w) => GREETING_WORDS.has(w))) {
      return { success: true, message: GREETING_REPLY };
    }
    if (words.length > 0 && words.every((w) => THANKS_WORDS.has(w))) {
      return { success: true, message: THANKS_REPLY };
    }
    return { success: false, message: `I couldn't parse "${clause}" — try rephrasing.` };
  }

  /** A learned command referencing a column that's since been removed/renamed can't be safely replayed — falls back to re-parsing the clause instead. */
  private commandStillValid(command: PhotonCommand): boolean {
    const colId = command.params.colId;
    return typeof colId !== 'string' || !!this.api.getColumn(colId);
  }

  /** The set of verbs `splitClauses` treats as "this starts a new command" — every registered intent's leading alias word, recomputed per call so custom intents registered at runtime are picked up immediately. */
  private clauseVerbs(): ReadonlySet<string> {
    const verbs = new Set<string>();
    for (const intent of this.registry.getAll()) {
      for (const alias of intent.aliases) {
        if (alias[0]) verbs.add(canonicalizeWord(alias[0]));
      }
    }
    return verbs;
  }
}
