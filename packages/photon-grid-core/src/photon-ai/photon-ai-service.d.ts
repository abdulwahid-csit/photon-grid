import type { GridApi } from '../core/grid-api';
import { PhotonAICommandRegistry } from './photon-ai-registry';
import type { PhotonCommandResult } from './photon-ai.types';
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
export declare class PhotonAIService {
    private api;
    private readonly registry;
    private readonly memory;
    private readonly parser;
    private readonly resolver;
    private readonly builder;
    private readonly executor;
    /**
     * @param api - The grid's own `GridApi` — every command runs through it, never around it.
     * @param registry - Supply a custom registry to fully replace the built-ins, or omit to get sort/filter/pin/visibility/grouping/selection out of the box.
     */
    constructor(api: GridApi, registry?: PhotonAICommandRegistry);
    /** A registry pre-populated with every built-in intent — the default `PhotonAIService` uses when none is supplied. */
    static createDefaultRegistry(): PhotonAICommandRegistry;
    /** Registers additional custom intents at runtime (e.g. a third-party feature's own `registerAI()`). */
    getRegistry(): PhotonAICommandRegistry;
    /** Forgets every column alias and phrase this service has learned for the current grid — useful after a large schema change or for testing. */
    forgetLearnedMemory(): void;
    /**
     * Runs one prompt through the full pipeline. Always resolves —
     * parsing/resolution failures come back as `{ success: false }`, never a
     * thrown error. A compound sentence runs each clause independently and
     * aggregates their results.
     */
    submit(rawInput: string): PhotonCommandResult;
    private runClause;
    private runCommands;
    /**
     * Handles a clause that normalized away to nothing — every one of its
     * words was filler. Rather than a blanket parse error, greetings and
     * thanks get a friendly, on-brand reply; anything else (stray filler with
     * no real words at all) still reports that it couldn't be parsed.
     */
    private replyToSmallTalk;
    /** A learned command referencing a column that's since been removed/renamed can't be safely replayed — falls back to re-parsing the clause instead. */
    private commandStillValid;
    /** The set of verbs `splitClauses` treats as "this starts a new command" — every registered intent's leading alias word, recomputed per call so custom intents registered at runtime are picked up immediately. */
    private clauseVerbs;
}
//# sourceMappingURL=photon-ai-service.d.ts.map